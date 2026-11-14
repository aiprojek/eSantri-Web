import { RaporCloudConfig } from '../types';

export type RaporCloudProvider = NonNullable<RaporCloudConfig['backendProvider']>;

export interface RaporCloudProviderMeta {
    id: RaporCloudProvider;
    name: string;
    shortName: string;
    storageLabel: string;
    endpointLabel: string;
    endpointPlaceholder: string;
    requiresApiKey: boolean;
    supportsApiKey: boolean;
    apiKeyLabel: string;
    apiKeyPlaceholder: string;
    apiKeyHelp: string;
    scriptButtonLabel: string;
    scriptModalTitle: string;
}

export const getRaporCloudProviderMeta = (
    provider?: RaporCloudProvider | string
): RaporCloudProviderMeta => {
    switch (provider) {
        case 'cloudflare_d1':
            return {
                id: 'cloudflare_d1',
                name: 'Cloudflare D1',
                shortName: 'CF D1',
                storageLabel: 'Cloudflare D1',
                endpointLabel: 'URL Cloudflare Worker D1 (1 Link Selamanya)',
                endpointPlaceholder: 'https://api-rapor.namapondok.workers.dev',
                requiresApiKey: false,
                supportsApiKey: true,
                apiKeyLabel: 'Worker API Key / Secret (Opsional)',
                apiKeyPlaceholder: 'Kosongkan jika publik, atau isi X-API-Key Worker',
                apiKeyHelp: 'Jika Worker memakai env API_KEY untuk keamanan, isi token yang sama di sini.',
                scriptButtonLabel: 'Lihat Kode Cloudflare Worker D1 & SQL',
                scriptModalTitle: 'Setup Cloudflare Workers + D1 SQLite (Gratis & Cepat)'
            };
        case 'supabase':
            return {
                id: 'supabase',
                name: 'Supabase',
                shortName: 'Supabase',
                storageLabel: 'Supabase PostgreSQL',
                endpointLabel: 'URL REST Supabase (atau URL Project Supabase)',
                endpointPlaceholder: 'https://xyzcompany.supabase.co/rest/v1/rapor_submissions',
                requiresApiKey: true,
                supportsApiKey: true,
                apiKeyLabel: 'Supabase Anon / Public Key (Wajib)',
                apiKeyPlaceholder: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                apiKeyHelp: 'Tempel Project anon public key dari Supabase > Settings > API.',
                scriptButtonLabel: 'Lihat SQL Tabel & Smart Merge Supabase',
                scriptModalTitle: 'Setup Supabase PostgreSQL (1 Tabel + Smart Merge Trigger)'
            };
        case 'cloudflare_r2':
            return {
                id: 'cloudflare_r2',
                name: 'Cloudflare R2',
                shortName: 'CF R2',
                storageLabel: 'Cloudflare R2',
                endpointLabel: 'URL Cloudflare Worker R2 (1 Link Selamanya)',
                endpointPlaceholder: 'https://r2-rapor.namapondok.workers.dev',
                requiresApiKey: false,
                supportsApiKey: true,
                apiKeyLabel: 'Worker API Key / Secret (Opsional)',
                apiKeyPlaceholder: 'Kosongkan jika publik, atau isi X-API-Key Worker',
                apiKeyHelp: 'Jika Worker memakai env API_KEY untuk keamanan, isi token yang sama di sini.',
                scriptButtonLabel: 'Lihat Kode Cloudflare Worker R2',
                scriptModalTitle: 'Setup Cloudflare Workers + R2 Object Storage'
            };
        case 'gas':
        default:
            return {
                id: 'gas',
                name: 'Google Apps Script',
                shortName: 'GAS',
                storageLabel: 'Google Sheet',
                endpointLabel: 'URL Endpoint Web App Google Apps Script (1 Link Selamanya)',
                endpointPlaceholder: 'https://script.google.com/macros/s/.../exec',
                requiresApiKey: false,
                supportsApiKey: false,
                apiKeyLabel: 'API Key',
                apiKeyPlaceholder: '',
                apiKeyHelp: '',
                scriptButtonLabel: 'Salin Kode Google Apps Script Terpadu v3.1',
                scriptModalTitle: 'Setup Google Apps Script Terpadu v3.1 (Multi-Tab + Purge)'
            };
    }
};

export const normalizeRaporCloudEndpoint = (
    rawUrl: string,
    provider: RaporCloudProvider = 'gas'
): string => {
    const trimmed = (rawUrl || '').trim();
    if (!trimmed) return '';
    if (provider === 'supabase') {
        const clean = trimmed.replace(/\/+$/, '');
        if (/\/rest\/v1\//i.test(clean)) return clean;
        return `${clean}/rest/v1/rapor_submissions`;
    }
    return trimmed;
};

export interface RaporCloudFilterQuery {
    tahunAjaran?: string;
    semester?: 'Ganjil' | 'Genap' | string;
    templateId?: string;
    rombelId?: number;
}

/**
 * Menormalkan berbagai format respons (GAS/Worker PascalCase maupun Supabase snake_case)
 * menjadi struktur baris kanonik yang dipahami seluruh fitur eSantri (Impor, Leger, Audit).
 */
export const normalizeRaporCloudRows = (rawJson: any): any[] => {
    const rawList = Array.isArray(rawJson)
        ? rawJson
        : rawJson && Array.isArray(rawJson.records)
        ? rawJson.records
        : rawJson && Array.isArray(rawJson.data)
        ? rawJson.data
        : [];

    return rawList
        .filter((row: any) => row && typeof row === 'object')
        .map((row: any) => {
            if (row.SantriID !== undefined || row.DataJSON !== undefined) {
                return row;
            }
            const dataPayload = row.data_json ?? row.scores ?? row.data ?? {};
            return {
                Timestamp: row.updated_at || row.timestamp || row.created_at || '',
                SantriID: row.santri_id ?? row.santriId ?? '',
                NIS: row.nis ?? '',
                NamaSantri: row.nama_santri ?? row.santri_name ?? row.santriName ?? '',
                RombelID: row.rombel_id ?? row.rombelId ?? '',
                RombelNama: row.rombel_nama ?? row.rombel_name ?? row.rombelName ?? '',
                TahunAjaran: row.tahun_ajaran ?? row.tahunAjaran ?? '',
                Semester: row.semester ?? '',
                TemplateID: row.template_id ?? row.templateId ?? '',
                SheetName: row.sheet_name ?? row.sheetName ?? 'Cloud Database',
                DataJSON:
                    typeof dataPayload === 'string'
                        ? dataPayload
                        : JSON.stringify(dataPayload || {})
            };
        });
};

const buildSupabaseHeaders = (apiKey?: string, extra?: Record<string, string>): Record<string, string> => {
    const key = (apiKey || '').trim();
    const headers: Record<string, string> = {
        ...(extra || {})
    };
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

export interface CloudConnectionParams {
    endpointUrl: string;
    backendProvider?: RaporCloudProvider;
    apiKey?: string;
}

export const fetchRaporFromCloudAdapter = async (
    params: CloudConnectionParams,
    filterOptions?: RaporCloudFilterQuery
): Promise<any[]> => {
    const provider: RaporCloudProvider = params.backendProvider || 'gas';
    const baseUrl = normalizeRaporCloudEndpoint(params.endpointUrl, provider);
    if (!baseUrl) {
        throw new Error('URL Endpoint Cloud belum diisi.');
    }

    if (provider === 'supabase') {
        if (!(params.apiKey || '').trim()) {
            throw new Error('Supabase Anon / Public Key wajib diisi.');
        }
        const qsParts = ['select=*', 'order=updated_at.asc'];
        if (filterOptions?.tahunAjaran) {
            qsParts.push(`tahun_ajaran=eq.${encodeURIComponent(filterOptions.tahunAjaran)}`);
        }
        if (filterOptions?.semester) {
            qsParts.push(`semester=ilike.${encodeURIComponent(filterOptions.semester)}`);
        }
        if (filterOptions?.templateId) {
            qsParts.push(`template_id=eq.${encodeURIComponent(filterOptions.templateId)}`);
        }
        if (filterOptions?.rombelId && filterOptions.rombelId > 0) {
            qsParts.push(`rombel_id=eq.${encodeURIComponent(String(filterOptions.rombelId))}`);
        }
        const sep = baseUrl.includes('?') ? '&' : '?';
        const res = await fetch(`${baseUrl}${sep}${qsParts.join('&')}`, {
            method: 'GET',
            headers: buildSupabaseHeaders(params.apiKey)
        });
        if (!res.ok) {
            const errText = await res.text().catch(() => '');
            throw new Error(`Gagal mengambil data dari Supabase (HTTP ${res.status})${errText ? ': ' + errText.slice(0, 140) : ''}`);
        }
        const rawJson = await res.json();
        return normalizeRaporCloudRows(rawJson);
    }

    // GAS, Cloudflare D1, Cloudflare R2
    let targetUrl = baseUrl;
    if (filterOptions) {
        const qp = new URLSearchParams();
        if (filterOptions.tahunAjaran) qp.set('tahunAjaran', filterOptions.tahunAjaran);
        if (filterOptions.semester) qp.set('semester', filterOptions.semester);
        if (filterOptions.templateId) qp.set('templateId', filterOptions.templateId);
        if (filterOptions.rombelId && filterOptions.rombelId > 0) qp.set('rombelId', String(filterOptions.rombelId));
        const qs = qp.toString();
        if (qs) targetUrl += (targetUrl.includes('?') ? '&' : '?') + qs;
    }

    const fetchInit: RequestInit =
        provider === 'gas'
            ? { method: 'GET' }
            : { method: 'GET', headers: buildWorkerHeaders(params.apiKey) };

    const response = await fetch(targetUrl, fetchInit);
    const meta = getRaporCloudProviderMeta(provider);
    if (!response.ok) {
        throw new Error(`Gagal mengambil data dari ${meta.name} (HTTP ${response.status})`);
    }
    const rawData = await response.json();
    if (Array.isArray(rawData) || (rawData && Array.isArray(rawData.records))) {
        return normalizeRaporCloudRows(rawData);
    }
    throw new Error(`Format respons ${meta.name} tidak valid.`);
};

export interface UnifiedPushPayload {
    meta: {
        rombelId: number;
        rombelName: string;
        templateId: string;
        templateName: string;
        tahunAjaran: string;
        semester: string;
        tabMode?: string;
        columnLabels?: Record<string, string>;
        timestamp: string;
    };
    records: Array<{
        santriId: number;
        nis?: string;
        santriName?: string;
        rombelId?: number;
        rombelName?: string;
        kelasId?: number;
        kelasName?: string;
        jenjangId?: number;
        jenjangName?: string;
        data?: Record<string, any>;
        clearedKeys?: string[];
        deleteRecord?: boolean;
    }>;
}

const buildSupabaseRowKey = (
    santriId: number | string,
    tahunAjaran: string,
    semester: string,
    templateId: string
): string => {
    return [
        String(santriId).trim(),
        String(tahunAjaran || '').trim(),
        String(semester || '').trim().toLowerCase(),
        String(templateId || '').trim()
    ].join('|');
};

export const pushRaporPayloadToCloudAdapter = async (
    params: CloudConnectionParams,
    payload: UnifiedPushPayload
): Promise<{ pushedStudents: number; sheets: string[] }> => {
    const provider: RaporCloudProvider = params.backendProvider || 'gas';
    const baseUrl = normalizeRaporCloudEndpoint(params.endpointUrl, provider);
    if (!baseUrl) return { pushedStudents: 0, sheets: [] };

    if (provider === 'supabase') {
        if (!(params.apiKey || '').trim()) {
            throw new Error('Supabase Anon / Public Key wajib diisi.');
        }

        const deleteRecords = payload.records.filter(r => r.deleteRecord);
        const upsertRecords = payload.records.filter(r => !r.deleteRecord);
        let mergedCount = 0;

        for (const rec of deleteRecords) {
            const rk = buildSupabaseRowKey(
                rec.santriId,
                payload.meta.tahunAjaran,
                payload.meta.semester,
                payload.meta.templateId
            );
            const sep = baseUrl.includes('?') ? '&' : '?';
            const delRes = await fetch(
                `${baseUrl}${sep}row_key=eq.${encodeURIComponent(rk)}`,
                {
                    method: 'DELETE',
                    headers: buildSupabaseHeaders(params.apiKey)
                }
            );
            if (!delRes.ok) {
                throw new Error(`Gagal menghapus baris Supabase (HTTP ${delRes.status})`);
            }
            mergedCount++;
        }

        if (upsertRecords.length > 0) {
            const nowIso = payload.meta.timestamp || new Date().toISOString();
            const rowsToUpsert = upsertRecords.map(rec => ({
                row_key: buildSupabaseRowKey(
                    rec.santriId,
                    payload.meta.tahunAjaran,
                    payload.meta.semester,
                    payload.meta.templateId
                ),
                santri_id: Number(rec.santriId),
                nis: rec.nis || '',
                nama_santri: rec.santriName || '',
                rombel_id: Number(rec.rombelId || payload.meta.rombelId || 0),
                rombel_nama: rec.rombelName || payload.meta.rombelName || '',
                tahun_ajaran: payload.meta.tahunAjaran,
                semester: payload.meta.semester,
                template_id: payload.meta.templateId || '',
                sheet_name: `${payload.meta.tahunAjaran} ${payload.meta.semester} - ${payload.meta.templateName || 'Rapor'}`,
                data_json: rec.data || {},
                cleared_keys: rec.clearedKeys || [],
                updated_at: nowIso
            }));

            const sep = baseUrl.includes('?') ? '&' : '?';
            const upsertRes = await fetch(`${baseUrl}${sep}on_conflict=row_key`, {
                method: 'POST',
                headers: buildSupabaseHeaders(params.apiKey, {
                    'Content-Type': 'application/json',
                    Prefer: 'resolution=merge-duplicates,return=minimal'
                }),
                body: JSON.stringify(rowsToUpsert)
            });

            if (!upsertRes.ok) {
                const errTxt = await upsertRes.text().catch(() => '');
                throw new Error(
                    `Gagal mengirim ke Supabase (HTTP ${upsertRes.status})${errTxt ? ': ' + errTxt.slice(0, 160) : ''}`
                );
            }
            mergedCount += upsertRecords.length;
        }

        return { pushedStudents: mergedCount, sheets: ['Supabase: rapor_submissions'] };
    }

    // GAS, Cloudflare D1, Cloudflare R2
    const fetchInit: RequestInit =
        provider === 'gas'
            ? {
                  method: 'POST',
                  headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                  body: JSON.stringify(payload)
              }
            : {
                  method: 'POST',
                  headers: buildWorkerHeaders(params.apiKey, 'application/json'),
                  body: JSON.stringify(payload)
              };

    const res = await fetch(baseUrl, fetchInit);
    if (!res.ok) {
        const errTxt = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status}${errTxt ? ': ' + errTxt.slice(0, 140) : ''}`);
    }

    let respJson: any = null;
    try {
        const rawText = await res.text();
        if (rawText) respJson = JSON.parse(rawText);
    } catch {
        // non-json response fallback
    }

    if (respJson && respJson.result === 'error') {
        const meta = getRaporCloudProviderMeta(provider);
        throw new Error(respJson.error || `Terjadi kendala saat memperbarui ${meta.name}`);
    }

    return {
        pushedStudents: Number(respJson?.mergedStudents ?? payload.records.length),
        sheets: Array.isArray(respJson?.sheets) ? respJson.sheets : []
    };
};

export const testRaporCloudConnection = async (
    params: CloudConnectionParams
): Promise<{ ok: boolean; rowCount: number; message: string }> => {
    const provider: RaporCloudProvider = params.backendProvider || 'gas';
    const baseUrl = normalizeRaporCloudEndpoint(params.endpointUrl, provider);
    if (!baseUrl) {
        throw new Error('Masukkan URL Endpoint terlebih dahulu.');
    }

    if (provider === 'supabase') {
        if (!(params.apiKey || '').trim()) {
            throw new Error('Masukkan Supabase Anon / Public Key terlebih dahulu.');
        }
        const sep = baseUrl.includes('?') ? '&' : '?';
        const res = await fetch(`${baseUrl}${sep}select=row_key&limit=1000`, {
            method: 'GET',
            headers: buildSupabaseHeaders(params.apiKey)
        });
        if (!res.ok) {
            const errTxt = await res.text().catch(() => '');
            throw new Error(`HTTP ${res.status}${errTxt ? ' (' + errTxt.slice(0, 120) + ')' : ''}`);
        }
        const rows = await res.json().catch(() => []);
        const count = Array.isArray(rows) ? rows.length : 0;
        return {
            ok: true,
            rowCount: count,
            message: `Koneksi Supabase Aktif! Terbaca ${count} baris data.`
        };
    }

    const res = await fetch(
        baseUrl,
        provider === 'gas'
            ? { method: 'GET' }
            : { method: 'GET', headers: buildWorkerHeaders(params.apiKey) }
    );
    if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
    }
    const json = await res.json().catch(() => null);
    const rows = normalizeRaporCloudRows(json);
    const countLabel = Array.isArray(json) || Array.isArray(json?.records) ? rows.length : (json?.count ?? 'Aktif');
    const meta = getRaporCloudProviderMeta(provider);
    return {
        ok: true,
        rowCount: rows.length,
        message: `Koneksi ${meta.name} Aktif! Respons server terbaca (${countLabel} entri).`
    };
};

export const purgeRaporCloudStaging = async (
    params: CloudConnectionParams,
    filter?: { tahunAjaran?: string; semester?: string }
): Promise<{ deletedCount: number; message: string }> => {
    const provider: RaporCloudProvider = params.backendProvider || 'gas';
    const baseUrl = normalizeRaporCloudEndpoint(params.endpointUrl, provider);
    if (!baseUrl) {
        return { deletedCount: 0, message: 'Tidak ada endpoint aktif; stempel bersih lokal diperbarui.' };
    }

    if (provider === 'supabase') {
        if (!(params.apiKey || '').trim()) {
            throw new Error('Supabase Anon / Public Key wajib diisi.');
        }
        const conditions: string[] = [];
        if (filter?.tahunAjaran) conditions.push(`tahun_ajaran=eq.${encodeURIComponent(filter.tahunAjaran)}`);
        if (filter?.semester) conditions.push(`semester=ilike.${encodeURIComponent(filter.semester)}`);
        if (conditions.length === 0) conditions.push('row_key=neq.__never__');
        const sep = baseUrl.includes('?') ? '&' : '?';
        const res = await fetch(`${baseUrl}${sep}${conditions.join('&')}`, {
            method: 'DELETE',
            headers: buildSupabaseHeaders(params.apiKey, { Prefer: 'return=representation' })
        });
        if (!res.ok) {
            const errTxt = await res.text().catch(() => '');
            throw new Error(`Gagal membersihkan Supabase (HTTP ${res.status}): ${errTxt.slice(0, 120)}`);
        }
        const deleted = await res.json().catch(() => []);
        const count = Array.isArray(deleted) ? deleted.length : 0;
        return {
            deletedCount: count,
            message: `Berhasil mengosongkan ${count} baris antrean setoran dari Supabase.`
        };
    }

    const body = JSON.stringify({
        action: 'purge_staging',
        tahunAjaran: filter?.tahunAjaran || '',
        semester: filter?.semester || '',
        timestamp: new Date().toISOString()
    });

    const res = await fetch(
        baseUrl,
        provider === 'gas'
            ? {
                  method: 'POST',
                  headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                  body
              }
            : {
                  method: 'POST',
                  headers: buildWorkerHeaders(params.apiKey, 'application/json'),
                  body
              }
    );

    if (!res.ok) {
        throw new Error(`Gagal membersihkan server cloud (HTTP ${res.status})`);
    }
    const json = await res.json().catch(() => ({}));
    const count = Number(json?.deletedCount ?? 0);
    const meta = getRaporCloudProviderMeta(provider);
    return {
        deletedCount: count,
        message: `Antrean setoran di ${meta.name} berhasil dibersihkan (${count} entri).`
    };
};

export const obfuscateSecretToCodeArray = (raw: string): number[] => {
    const clean = (raw || '').trim();
    if (!clean) return [];
    const salt = 43;
    const out: number[] = [];
    for (let i = 0; i < clean.length; i++) {
        out.push(clean.charCodeAt(i) ^ (salt + (i % 19)));
    }
    return out;
};

/**
 * Menghasilkan potongan JavaScript mandiri untuk HTML Formulir Input & Portal Audit
 * agar mendukung penarikan/pengiriman langsung ke GAS, Cloudflare D1, Supabase, dan Cloudflare R2.
 */
export const buildStandaloneCloudHelperJs = (options: {
    providerVar?: string;
    urlExpr: string;
    apiKeyBytesJson: string;
}): string => {
    const providerLiteral = JSON.stringify(options.providerVar || 'gas');
    return `
        const CLOUD_PROVIDER = ${providerLiteral};
        const CLOUD_API_KEY = (function(bytes) {
            if (!Array.isArray(bytes) || bytes.length === 0) return '';
            const salt = 43;
            let out = '';
            for (let i = 0; i < bytes.length; i++) {
                out += String.fromCharCode(bytes[i] ^ (salt + (i % 19)));
            }
            return out.trim();
        })(${options.apiKeyBytesJson});

        function normalizeCloudEndpointJs(rawUrl, provider) {
            const clean = String(rawUrl || '').trim();
            if (!clean) return '';
            if (provider === 'supabase') {
                const noSlash = clean.replace(/\\/+$/, '');
                if (/\\/rest\\/v1\\//i.test(noSlash)) return noSlash;
                return noSlash + '/rest/v1/rapor_submissions';
            }
            return clean;
        }

        function normalizeCloudRowsJs(raw) {
            const list = Array.isArray(raw)
                ? raw
                : (raw && Array.isArray(raw.records) ? raw.records : (raw && Array.isArray(raw.data) ? raw.data : []));
            return list
                .filter(function(r) { return r && typeof r === 'object'; })
                .map(function(r) {
                    if (r.SantriID !== undefined || r.DataJSON !== undefined) return r;
                    const payload = r.data_json || r.scores || r.data || {};
                    return {
                        Timestamp: r.updated_at || r.timestamp || r.created_at || '',
                        SantriID: r.santri_id || r.santriId || '',
                        NIS: r.nis || '',
                        NamaSantri: r.nama_santri || r.santri_name || '',
                        RombelID: r.rombel_id || r.rombelId || '',
                        RombelNama: r.rombel_nama || r.rombel_name || '',
                        TahunAjaran: r.tahun_ajaran || r.tahunAjaran || '',
                        Semester: r.semester || '',
                        TemplateID: r.template_id || r.templateId || '',
                        SheetName: r.sheet_name || 'Cloud Database',
                        DataJSON: typeof payload === 'string' ? payload : JSON.stringify(payload || {})
                    };
                });
        }

        async function fetchCloudRowsUniversal(rawUrl, queryFilters) {
            const url = normalizeCloudEndpointJs(rawUrl, CLOUD_PROVIDER);
            if (!url) throw new Error('Endpoint Cloud belum diatur.');

            if (CLOUD_PROVIDER === 'supabase') {
                const headers = {};
                if (CLOUD_API_KEY) {
                    headers['apikey'] = CLOUD_API_KEY;
                    headers['Authorization'] = 'Bearer ' + CLOUD_API_KEY;
                }
                const qp = ['select=*', 'order=updated_at.asc'];
                if (queryFilters && queryFilters.tahunAjaran) qp.push('tahun_ajaran=eq.' + encodeURIComponent(queryFilters.tahunAjaran));
                if (queryFilters && queryFilters.semester) qp.push('semester=ilike.' + encodeURIComponent(queryFilters.semester));
                if (queryFilters && queryFilters.templateId) qp.push('template_id=eq.' + encodeURIComponent(queryFilters.templateId));
                const sep = url.indexOf('?') !== -1 ? '&' : '?';
                const res = await fetch(url + sep + qp.join('&'), { method: 'GET', headers: headers });
                if (!res.ok) throw new Error('Supabase HTTP ' + res.status);
                const json = await res.json();
                return normalizeCloudRowsJs(json);
            }

            let targetUrl = url;
            if (queryFilters) {
                const sp = new URLSearchParams();
                if (queryFilters.tahunAjaran) sp.set('tahunAjaran', queryFilters.tahunAjaran);
                if (queryFilters.semester) sp.set('semester', queryFilters.semester);
                if (queryFilters.templateId) sp.set('templateId', queryFilters.templateId);
                const qs = sp.toString();
                if (qs) targetUrl += (targetUrl.indexOf('?') !== -1 ? '&' : '?') + qs;
            }
            const fetchOpts = { method: 'GET' };
            if (CLOUD_PROVIDER !== 'gas' && CLOUD_API_KEY) {
                fetchOpts.headers = { 'X-API-Key': CLOUD_API_KEY, 'Authorization': 'Bearer ' + CLOUD_API_KEY };
            }
            const res = await fetch(targetUrl, fetchOpts);
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const rawJson = await res.json();
            return normalizeCloudRowsJs(rawJson);
        }

        async function pushCloudPayloadUniversal(rawUrl, payload) {
            const url = normalizeCloudEndpointJs(rawUrl, CLOUD_PROVIDER);
            if (!url) throw new Error('Endpoint Cloud belum diatur.');

            if (CLOUD_PROVIDER === 'supabase') {
                const headers = {
                    'Content-Type': 'application/json',
                    'Prefer': 'resolution=merge-duplicates,return=minimal'
                };
                if (CLOUD_API_KEY) {
                    headers['apikey'] = CLOUD_API_KEY;
                    headers['Authorization'] = 'Bearer ' + CLOUD_API_KEY;
                }
                const meta = payload.meta || {};
                const rows = (payload.records || []).filter(function(rec) {
                    return rec && rec.santriId && !rec.deleteRecord;
                }).map(function(rec) {
                    const rowKey = [
                        String(rec.santriId || '').trim(),
                        String(meta.tahunAjaran || '').trim(),
                        String(meta.semester || '').trim().toLowerCase(),
                        String(meta.templateId || '').trim()
                    ].join('|');
                    return {
                        row_key: rowKey,
                        santri_id: Number(rec.santriId),
                        nis: rec.nis || '',
                        nama_santri: rec.santriName || '',
                        rombel_id: Number(rec.rombelId || meta.rombelId || 0),
                        rombel_nama: rec.rombelName || meta.rombelName || '',
                        tahun_ajaran: meta.tahunAjaran || '',
                        semester: meta.semester || '',
                        template_id: meta.templateId || '',
                        sheet_name: (meta.tahunAjaran || '') + ' ' + (meta.semester || '') + ' - ' + (meta.templateName || 'Rapor'),
                        data_json: rec.data || {},
                        cleared_keys: rec.clearedKeys || [],
                        updated_at: meta.timestamp || new Date().toISOString()
                    };
                });
                if (rows.length === 0) return { result: 'success', mergedStudents: 0 };
                const sep = url.indexOf('?') !== -1 ? '&' : '?';
                const res = await fetch(url + sep + 'on_conflict=row_key', {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify(rows)
                });
                if (!res.ok) {
                    const errTxt = await res.text().catch(function() { return ''; });
                    throw new Error('Supabase HTTP ' + res.status + (errTxt ? ': ' + errTxt.slice(0, 120) : ''));
                }
                return { result: 'success', mergedStudents: rows.length };
            }

            const headers = CLOUD_PROVIDER === 'gas'
                ? { 'Content-Type': 'text/plain;charset=utf-8' }
                : Object.assign(
                    { 'Content-Type': 'application/json' },
                    CLOUD_API_KEY ? { 'X-API-Key': CLOUD_API_KEY, 'Authorization': 'Bearer ' + CLOUD_API_KEY } : {}
                  );

            const res = await fetch(url, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error('HTTP ' + res.status);
            let respJson = null;
            try {
                const rawText = await res.text();
                if (rawText) respJson = JSON.parse(rawText);
            } catch (_) {}
            if (respJson && respJson.result === 'error') {
                throw new Error(respJson.error || 'Terjadi kendala pada server Cloud.');
            }
            return respJson || { result: 'success' };
        }
    `;
};

/* ============================================================================
 * 1. CLOUDFLARE D1 WORKER + SCHEMA SQL (Edge SQLite + Smart Merge + Purge)
 * ============================================================================ */
export const RAPOR_CLOUDFLARE_D1_WORKER_SCRIPT = `/* ============================================================================
 * CLOUDFLARE WORKER + D1 SQLITE UNTUK RAPOR & PORTAL AUDIT eSANTRI
 * Langkah Setup Cepat:
 * 1) Buat D1 Database (misal: db_rapor) lalu jalankan SQL ini di D1 Console:
 *
 * CREATE TABLE IF NOT EXISTS rapor_submissions (
 *   row_key TEXT PRIMARY KEY,
 *   santri_id INTEGER NOT NULL,
 *   nis TEXT DEFAULT '',
 *   nama_santri TEXT DEFAULT '',
 *   rombel_id INTEGER DEFAULT 0,
 *   rombel_nama TEXT DEFAULT '',
 *   tahun_ajaran TEXT NOT NULL,
 *   semester TEXT NOT NULL,
 *   template_id TEXT DEFAULT '',
 *   sheet_name TEXT DEFAULT 'D1 Cloud',
 *   data_json TEXT NOT NULL DEFAULT '{}',
 *   updated_at TEXT NOT NULL
 * );
 * CREATE INDEX IF NOT EXISTS idx_rapor_period ON rapor_submissions(tahun_ajaran, semester, template_id, rombel_id);
 *
 * 2) Buat Worker baru, tempel kode JS di bawah ini, lalu di Settings > Bindings:
 *    - Tambah D1 database binding bernama: DB -> pilih db_rapor
 *    - (Opsional) Tambah Environment Variable/Secret: API_KEY = token-rahasia-anda
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

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }
    if (!checkAuth(request, env)) {
      return jsonResponse({ result: "error", error: "Unauthorized: API Key tidak valid" }, 401);
    }

    const url = new URL(request.url);

    // GET: Tarik data nilai (untuk Aplikasi eSantri, Form Guru, & Portal Audit)
    if (request.method === "GET") {
      const ta = (url.searchParams.get("tahunAjaran") || "").trim();
      const sem = (url.searchParams.get("semester") || "").trim();
      const tpl = (url.searchParams.get("templateId") || "").trim();
      const rmb = (url.searchParams.get("rombelId") || "").trim();

      const where = [];
      const binds = [];
      if (ta) { where.push("tahun_ajaran = ?"); binds.push(ta); }
      if (sem) { where.push("LOWER(semester) = LOWER(?)"); binds.push(sem); }
      if (tpl) { where.push("template_id = ?"); binds.push(tpl); }
      if (rmb && Number(rmb) > 0) { where.push("rombel_id = ?"); binds.push(Number(rmb)); }

      const sql = "SELECT * FROM rapor_submissions" +
        (where.length ? " WHERE " + where.join(" AND ") : "") +
        " ORDER BY updated_at ASC";

      const { results } = await env.DB.prepare(sql).bind(...binds).all();
      const formatted = (results || []).map(r => ({
        Timestamp: r.updated_at,
        SantriID: r.santri_id,
        NIS: r.nis || "",
        NamaSantri: r.nama_santri || "",
        RombelID: r.rombel_id || 0,
        RombelNama: r.rombel_nama || "",
        TahunAjaran: r.tahun_ajaran,
        Semester: r.semester,
        TemplateID: r.template_id || "",
        SheetName: r.sheet_name || "Cloudflare D1",
        DataJSON: r.data_json || "{}"
      }));
      return jsonResponse(formatted);
    }

    // POST: Smart Merge nilai masuk atau Purge Staging
    if (request.method === "POST") {
      try {
        const body = await request.json();

        if (body && body.action === "purge_staging") {
          const ta = (body.tahunAjaran || "").trim();
          const sem = (body.semester || "").trim();
          let delRes;
          if (ta && sem) {
            delRes = await env.DB.prepare("DELETE FROM rapor_submissions WHERE tahun_ajaran = ? AND LOWER(semester) = LOWER(?)").bind(ta, sem).run();
          } else {
            delRes = await env.DB.prepare("DELETE FROM rapor_submissions").run();
          }
          return jsonResponse({ result: "success", deletedCount: delRes?.meta?.changes || 0 });
        }

        const meta = body.meta || {};
        const records = Array.isArray(body.records) ? body.records : [];
        const ta = String(meta.tahunAjaran || "").trim();
        const sem = String(meta.semester || "").trim();
        const tpl = String(meta.templateId || "").trim();
        const nowIso = new Date().toISOString();
        const sheetName = (ta && sem ? "(" + ta + " " + sem + ") " : "") + (meta.templateName || "D1 Cloud");

        let mergedCount = 0;

        for (const rec of records) {
          if (!rec || !rec.santriId || !ta || !sem) continue;
          const rowKey = [String(rec.santriId), ta, sem.toLowerCase(), tpl].join("|");

          if (rec.deleteRecord) {
            await env.DB.prepare("DELETE FROM rapor_submissions WHERE row_key = ?").bind(rowKey).run();
            mergedCount++;
            continue;
          }

          const existing = await env.DB.prepare("SELECT data_json FROM rapor_submissions WHERE row_key = ?").bind(rowKey).first();
          let mergedObj = {};
          if (existing && existing.data_json) {
            try { mergedObj = JSON.parse(existing.data_json); } catch {}
          }

          if (rec.data && typeof rec.data === "object") {
            for (const [k, v] of Object.entries(rec.data)) {
              if (k === "__cleared") continue;
              if (v !== "" && v !== null && v !== undefined) {
                mergedObj[k] = v;
                if (mergedObj.__cleared) delete mergedObj.__cleared[k];
              }
            }
          }

          if (Array.isArray(rec.clearedKeys)) {
            if (!mergedObj.__cleared) mergedObj.__cleared = {};
            for (const ck of rec.clearedKeys) {
              if (!ck) continue;
              delete mergedObj[ck];
              mergedObj.__cleared[ck] = true;
            }
          }
          if (mergedObj.__cleared && Object.keys(mergedObj.__cleared).length === 0) {
            delete mergedObj.__cleared;
          }

          await env.DB.prepare(\`
            INSERT INTO rapor_submissions (row_key, santri_id, nis, nama_santri, rombel_id, rombel_nama, tahun_ajaran, semester, template_id, sheet_name, data_json, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(row_key) DO UPDATE SET
              nis = COALESCE(NULLIF(excluded.nis, ''), rapor_submissions.nis),
              nama_santri = COALESCE(NULLIF(excluded.nama_santri, ''), rapor_submissions.nama_santri),
              rombel_id = CASE WHEN excluded.rombel_id > 0 THEN excluded.rombel_id ELSE rapor_submissions.rombel_id END,
              rombel_nama = COALESCE(NULLIF(excluded.rombel_nama, ''), rapor_submissions.rombel_nama),
              data_json = excluded.data_json,
              updated_at = excluded.updated_at
          \`).bind(
            rowKey,
            Number(rec.santriId),
            rec.nis || "",
            rec.santriName || "",
            Number(rec.rombelId || meta.rombelId || 0),
            rec.rombelName || meta.rombelName || "",
            ta,
            sem,
            tpl,
            sheetName,
            JSON.stringify(mergedObj),
            nowIso
          ).run();

          mergedCount++;
        }

        return jsonResponse({ result: "success", mergedStudents: mergedCount, sheets: [sheetName] });
      } catch (err) {
        return jsonResponse({ result: "error", error: err.message }, 500);
      }
    }

    return jsonResponse({ result: "error", error: "Method not allowed" }, 405);
  }
};`;

/* ============================================================================
 * 2. CLOUDFLARE R2 WORKER (S3 JSON Object Bucket + Smart Merge + Purge)
 * ============================================================================ */
export const RAPOR_CLOUDFLARE_R2_WORKER_SCRIPT = `/* ============================================================================
 * CLOUDFLARE WORKER + R2 OBJECT STORAGE UNTUK RAPOR & PORTAL AUDIT eSANTRI
 * Langkah Setup Cepat:
 * 1) Buat R2 Bucket (misal: bucket-rapor) di Cloudflare Dashboard.
 * 2) Buat Worker baru, tempel kode di bawah, lalu di Settings > Bindings:
 *    - Tambah R2 bucket binding bernama: R2_BUCKET -> pilih bucket-rapor
 *    - (Opsional) Tambah Environment Variable/Secret: API_KEY = token-rahasia-anda
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

const INDEX_KEY = "rapor_submissions_index.json";

async function readStore(env) {
  const obj = await env.R2_BUCKET.get(INDEX_KEY);
  if (!obj) return {};
  try { return await obj.json(); } catch { return {}; }
}

async function writeStore(env, mapObj) {
  await env.R2_BUCKET.put(INDEX_KEY, JSON.stringify(mapObj), {
    httpMetadata: { contentType: "application/json; charset=utf-8" }
  });
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }
    if (!checkAuth(request, env)) {
      return jsonResponse({ result: "error", error: "Unauthorized: API Key tidak valid" }, 401);
    }

    const url = new URL(request.url);

    if (request.method === "GET") {
      const ta = (url.searchParams.get("tahunAjaran") || "").trim();
      const sem = (url.searchParams.get("semester") || "").trim().toLowerCase();
      const tpl = (url.searchParams.get("templateId") || "").trim();
      const rmb = Number(url.searchParams.get("rombelId") || 0);

      const store = await readStore(env);
      const list = Object.values(store).filter(r => {
        if (ta && String(r.TahunAjaran || "") !== ta) return false;
        if (sem && String(r.Semester || "").toLowerCase() !== sem) return false;
        if (tpl && String(r.TemplateID || "") !== tpl) return false;
        if (rmb > 0 && Number(r.RombelID || 0) !== rmb) return false;
        return true;
      });
      return jsonResponse(list);
    }

    if (request.method === "POST") {
      try {
        const body = await request.json();
        const store = await readStore(env);

        if (body && body.action === "purge_staging") {
          const ta = (body.tahunAjaran || "").trim();
          const sem = (body.semester || "").trim().toLowerCase();
          let deleted = 0;
          if (ta && sem) {
            for (const key of Object.keys(store)) {
              const row = store[key];
              if (String(row.TahunAjaran || "") === ta && String(row.Semester || "").toLowerCase() === sem) {
                delete store[key];
                deleted++;
              }
            }
            await writeStore(env, store);
          } else {
            deleted = Object.keys(store).length;
            await env.R2_BUCKET.delete(INDEX_KEY);
          }
          return jsonResponse({ result: "success", deletedCount: deleted });
        }

        const meta = body.meta || {};
        const records = Array.isArray(body.records) ? body.records : [];
        const ta = String(meta.tahunAjaran || "").trim();
        const sem = String(meta.semester || "").trim();
        const tpl = String(meta.templateId || "").trim();
        const nowIso = new Date().toISOString();
        const sheetName = (ta && sem ? "(" + ta + " " + sem + ") " : "") + (meta.templateName || "R2 Cloud");

        let mergedCount = 0;
        for (const rec of records) {
          if (!rec || !rec.santriId || !ta || !sem) continue;
          const rowKey = [String(rec.santriId), ta, sem.toLowerCase(), tpl].join("|");

          if (rec.deleteRecord) {
            if (store[rowKey]) { delete store[rowKey]; mergedCount++; }
            continue;
          }

          const existing = store[rowKey];
          let mergedObj = {};
          if (existing && existing.DataJSON) {
            try { mergedObj = typeof existing.DataJSON === "string" ? JSON.parse(existing.DataJSON) : existing.DataJSON; } catch {}
          }

          if (rec.data && typeof rec.data === "object") {
            for (const [k, v] of Object.entries(rec.data)) {
              if (k === "__cleared") continue;
              if (v !== "" && v !== null && v !== undefined) {
                mergedObj[k] = v;
                if (mergedObj.__cleared) delete mergedObj.__cleared[k];
              }
            }
          }

          if (Array.isArray(rec.clearedKeys)) {
            if (!mergedObj.__cleared) mergedObj.__cleared = {};
            for (const ck of rec.clearedKeys) {
              if (!ck) continue;
              delete mergedObj[ck];
              mergedObj.__cleared[ck] = true;
            }
          }
          if (mergedObj.__cleared && Object.keys(mergedObj.__cleared).length === 0) {
            delete mergedObj.__cleared;
          }

          store[rowKey] = {
            Timestamp: nowIso,
            SantriID: Number(rec.santriId),
            NIS: rec.nis || existing?.NIS || "",
            NamaSantri: rec.santriName || existing?.NamaSantri || "",
            RombelID: Number(rec.rombelId || meta.rombelId || existing?.RombelID || 0),
            RombelNama: rec.rombelName || meta.rombelName || existing?.RombelNama || "",
            TahunAjaran: ta,
            Semester: sem,
            TemplateID: tpl,
            SheetName: sheetName,
            DataJSON: JSON.stringify(mergedObj)
          };
          mergedCount++;
        }

        await writeStore(env, store);
        return jsonResponse({ result: "success", mergedStudents: mergedCount, sheets: [sheetName] });
      } catch (err) {
        return jsonResponse({ result: "error", error: err.message }, 500);
      }
    }

    return jsonResponse({ result: "error", error: "Method not allowed" }, 405);
  }
};`;

/* ============================================================================
 * 3. SUPABASE POSTGRESQL SQL + SMART MERGE TRIGGER (PostgREST Native)
 * ============================================================================ */
export const RAPOR_SUPABASE_SQL_SETUP = `-- ============================================================================
-- SETUP SUPABASE POSTGRESQL UNTUK RAPOR & PORTAL AUDIT eSANTRI
-- Jalankan 1x di Supabase Dashboard > SQL Editor > New Query > Run
-- Fitur: 1 Tabel untuk semua Rombel/Template + Trigger Smart Merge otomatis!
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.rapor_submissions (
  row_key TEXT PRIMARY KEY,
  santri_id BIGINT NOT NULL,
  nis TEXT DEFAULT '',
  nama_santri TEXT DEFAULT '',
  rombel_id BIGINT DEFAULT 0,
  rombel_nama TEXT DEFAULT '',
  tahun_ajaran TEXT NOT NULL,
  semester TEXT NOT NULL,
  template_id TEXT DEFAULT '',
  sheet_name TEXT DEFAULT 'Supabase',
  data_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  cleared_keys JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rapor_sub_period
  ON public.rapor_submissions (tahun_ajaran, semester, template_id, rombel_id);

-- Trigger Smart Merge: kiriman banyak guru mapel otomatis menyatu tanpa menimpa mapel guru lain
CREATE OR REPLACE FUNCTION public.fn_rapor_submissions_smart_merge()
RETURNS TRIGGER AS $$
DECLARE
  merged JSONB;
  cleared_obj JSONB;
  ck TEXT;
  nk TEXT;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.data_json IS NOT NULL THEN
    merged := OLD.data_json || COALESCE(NEW.data_json, '{}'::jsonb);
  ELSE
    merged := COALESCE(NEW.data_json, '{}'::jsonb);
  END IF;

  cleared_obj := COALESCE(merged->'__cleared', '{}'::jsonb);

  -- Hapus penanda __cleared bila key tersebut diisi nilai baru
  IF NEW.data_json IS NOT NULL AND jsonb_typeof(NEW.data_json) = 'object' THEN
    FOR nk IN SELECT jsonb_object_keys(NEW.data_json)
    LOOP
      IF nk <> '__cleared' AND COALESCE(NEW.data_json->>nk, '') <> '' THEN
        cleared_obj := cleared_obj - nk;
      END IF;
    END LOOP;
  END IF;

  IF NEW.cleared_keys IS NOT NULL AND jsonb_typeof(NEW.cleared_keys) = 'array' THEN
    FOR ck IN SELECT jsonb_array_elements_text(NEW.cleared_keys)
    LOOP
      IF ck IS NOT NULL AND ck <> '' THEN
        merged := merged - ck;
        cleared_obj := cleared_obj || jsonb_build_object(ck, true);
      END IF;
    END LOOP;
  END IF;

  IF cleared_obj <> '{}'::jsonb THEN
    merged := merged || jsonb_build_object('__cleared', cleared_obj);
  ELSE
    merged := merged - '__cleared';
  END IF;

  NEW.data_json := merged;
  NEW.cleared_keys := '[]'::jsonb;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rapor_submissions_smart_merge ON public.rapor_submissions;
CREATE TRIGGER trg_rapor_submissions_smart_merge
  BEFORE INSERT OR UPDATE ON public.rapor_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_rapor_submissions_smart_merge();

-- Izinkan akses REST API menggunakan Anon Key untuk Form Guru & Portal Audit
ALTER TABLE public.rapor_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rapor_submissions_public_all" ON public.rapor_submissions;
CREATE POLICY "rapor_submissions_public_all"
  ON public.rapor_submissions
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);
`;
