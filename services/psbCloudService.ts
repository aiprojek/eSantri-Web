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
        return /^https:\/\/script\.google\.com\/macros\/s\/.+\/exec/i.test(trimmed);
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
}

export const decryptPsbCloudRowsWithReport = async (
    rows: any[],
    activeKeyId?: string | null
): Promise<PsbCloudDecryptReport> => {
    const result: any[] = [];
    const failedReasons: string[] = [];
    let encryptedCount = 0;
    let lockedActiveError: Error | null = null;
    let firstLockedError: Error | null = null;

    for (const row of rows) {
        if (!row || typeof row !== 'object') continue;
        const envBio = tryParseE2eeEnvelope(row.__e2ee_bio);
        const envRow = tryParseE2eeEnvelope(row);
        const env = envBio || envRow;
        if (!env) {
            result.push(row);
            continue;
        }
        encryptedCount++;
        try {
            if (envBio) {
                const plainBio = await decryptAnyEnvelope<Record<string, any>>(envBio);
                const merged = { ...row, ...plainBio };
                delete merged.__e2ee_bio;
                result.push(merged);
            } else if (envRow) {
                const plainRow = await decryptAnyEnvelope<Record<string, any>>(envRow);
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
    };
};

export const decryptPsbCloudRows = async (rows: any[], activeKeyId?: string | null): Promise<any[]> => {
    const report = await decryptPsbCloudRowsWithReport(rows, activeKeyId);
    return report.rows;
};

export interface PsbCloudConnectionParams {
    endpointUrl: string;
    backendProvider?: PsbCloudProvider;
    apiKey?: string;
}

export const fetchPsbFromCloudAdapter = async (
    params: PsbCloudConnectionParams
): Promise<any[]> => {
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
        return normalizePsbCloudRows(rawJson);
    }

    const fetchInit: RequestInit =
        provider === 'gas'
            ? { method: 'GET' }
            : { method: 'GET', headers: buildWorkerHeaders(params.apiKey) };

    const response = await fetch(baseUrl, fetchInit);
    const meta = getPsbCloudProviderMeta(provider);
    if (!response.ok) {
        throw new Error(`Gagal menghubungi ${meta.name} (HTTP ${response.status}).`);
    }

    let parsed = await response.json();

    // Kompatibilitas dengan script Portal GAS v2 lama jika user mengarahkannya ke endpoint Portal
    if (provider === 'gas' && !Array.isArray(parsed) && parsed && typeof parsed === 'object' && !Array.isArray(parsed.records)) {
        const subUrl = new URL(baseUrl);
        subUrl.searchParams.set('action', 'getPsbSubmissions');
        if (params.apiKey) {
            subUrl.searchParams.set('apiKey', params.apiKey);
        }
        const subRes = await fetch(subUrl.toString(), { method: 'GET' });
        if (subRes.ok) {
            const subParsed = await subRes.json();
            if (Array.isArray(subParsed) || Array.isArray(subParsed?.records)) {
                parsed = subParsed;
            }
        }
    }

    if (Array.isArray(parsed) || (parsed && (Array.isArray(parsed.records) || Array.isArray(parsed.data)))) {
        return normalizePsbCloudRows(parsed);
    }
    if (parsed && parsed.result === 'error') {
        throw new Error(parsed.error || parsed.message || `Server ${meta.name} mengembalikan error.`);
    }

    throw new Error(`Format respons ${meta.name} bukan daftar pendaftar.`);
};

export const testPsbCloudConnection = async (
    params: PsbCloudConnectionParams
): Promise<{ ok: boolean; rowCount: number; message: string }> => {
    const provider: PsbCloudProvider = params.backendProvider || 'gas';
    const cleanUrl = (params.endpointUrl || '').trim();
    if (!cleanUrl) {
        throw new Error('Masukkan URL Endpoint Cloud terlebih dahulu.');
    }
    if (!isPsbCloudEndpointValid(cleanUrl, provider)) {
        if (provider === 'gas') {
            throw new Error('Format URL GAS belum valid. URL Web App harus berakhiran "/exec" (bukan link editor).');
        }
        throw new Error('Format URL Endpoint harus diawali https:// yang valid.');
    }
    if (provider === 'supabase' && !(params.apiKey || '').trim()) {
        throw new Error('Masukkan Supabase Anon / Public Key terlebih dahulu.');
    }

    const rows = await fetchPsbFromCloudAdapter({
        endpointUrl: cleanUrl,
        backendProvider: provider,
        apiKey: params.apiKey
    });

    const meta = getPsbCloudProviderMeta(provider);
    return {
        ok: true,
        rowCount: rows.length,
        message: `Terhubung ke ${meta.name}! Terbaca ${rows.length} baris data pendaftar.`
    };
};

/* ============================================================================
 * HELPER JS MANDIRI UNTUK FILE HTML FORMULIR PSB OFFLINE/STANDALONE
 * Mendukung upload lampiran ke Google Drive (via GAS), Cloudflare R2, & Supabase Storage
 * ============================================================================ */
export const buildPsbStandaloneCloudHelperJs = (options: {
    provider: PsbCloudProvider;
    endpointObfuscatedExpr: string;
    driveFolderObfuscatedExpr: string;
    apiKey?: string;
    supabaseBucket?: string;
    tahunAjaranAktif?: string;
    jenjangId?: number;
    sheetName: string;
    fieldLabelMapJson: string;
    e2eePublicKey?: string;
    e2eeKeyId?: string;
}): string => {
    const providerLiteral = JSON.stringify(options.provider || 'gas');
    const apiKeyBytesJson = JSON.stringify(obfuscateSecretToCodeArray(options.apiKey || ''));
    const bucketLiteral = JSON.stringify((options.supabaseBucket || 'psb-berkas').trim() || 'psb-berkas');
    const taLiteral = JSON.stringify(options.tahunAjaranAktif || '');
    const jenjangLiteral = JSON.stringify(options.jenjangId ? String(options.jenjangId) : '');
    const sheetLiteral = JSON.stringify(options.sheetName || 'Pendaftar Baru');
    const e2eeSnippet =
        options.e2eePublicKey && options.e2eeKeyId
            ? buildStandaloneHybridEncryptJsHelper(options.e2eePublicKey, options.e2eeKeyId)
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
const _SEC_DRIVE_ID = _dParam(${options.driveFolderObfuscatedExpr});
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
    if(dot > -1 && dot < o.length - 1) return o.substring(dot).toLowerCase();
    if(mimeType === 'application/pdf') return '.pdf';
    if(mimeType === 'image/jpeg') return '.jpg';
    if(mimeType === 'image/png') return '.png';
    return '';
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

async function uploadFileToSupabaseStorage(baseUrl, bucketName, file, targetKey, fieldLabel, santriName){
    const yearFolder = psbSlug(PSB_TAHUN_AJARAN || String(new Date().getFullYear()));
    const prefix = psbDocPrefix(targetKey, file.name, fieldLabel);
    const stamp = Date.now() + '-' + Math.random().toString(36).slice(2, 6);
    const fileName = prefix + '-' + psbSlug(santriName) + '-' + stamp + psbExt(file.name, file.type);
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

    data.tanggalDaftar = new Date().toISOString();
    data.jenjangId = PSB_JENJANG_ID;
    data.tahunAjaranAktif = PSB_TAHUN_AJARAN;
    data.sheetName = PSB_SHEET_NAME;
    if(PSB_CLOUD_PROVIDER === 'gas' && _SEC_DRIVE_ID){
        data.driveFolderId = _SEC_DRIVE_ID;
    }

    return { data: data, pendingFiles: pendingFiles };
}

async function buildEncryptedPsbWirePayload(rawData, attachmentKeys) {
    if (typeof window.__esantriEncryptHybrid !== 'function') {
        return rawData;
    }
    const metaKeys = ['tanggalDaftar', 'jenjangId', 'tahunAjaranAktif', 'sheetName', 'driveFolderId', 'folderId', 'status'];
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
                typeof window.__esantriEncryptHybrid === 'function' ? 'terenkripsi' : santriName
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
                        if(jsonErr && jsonErr.message && jsonErr.message.indexOf('Server') !== -1) throw jsonErr;
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
export const buildPsbGasScriptV31 = (cleanDriveFolderId: string = ''): string => `/* GOOGLE APPS SCRIPT FOR ESANTRI WEB - SMART PSB v3.1 (Formulir HTML + Google Drive + Multi-Sheet) */
var PSB_INTERNAL_SHEETS = ['_psb_portal_config', 'portals', 'portal_sync_logs'];
var DEFAULT_DRIVE_FOLDER_ID = "${cleanDriveFolderId}";

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

function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var filterTa = (e && e.parameter && e.parameter.tahunAjaran) ? String(e.parameter.tahunAjaran).trim() : '';
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

      // Kompatibilitas baris lama bila ada rawJson
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
      if (filterTa && record.tahunAjaranAktif && String(record.tahunAjaranAktif).trim() !== filterTa) continue;
      combinedData.push(record);
    }
  }

  return ContentService.createTextOutput(JSON.stringify(combinedData)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(30000);
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var rawData;

    if (e.postData && (e.postData.type === "application/json" || e.postData.type === "text/plain" || e.postData.contents)) {
      rawData = JSON.parse(e.postData.contents);
    } else {
      rawData = e.parameter || {};
    }

    var data = {};
    if (rawData.fields && typeof rawData.fields === 'object') {
      for (var fk in rawData.fields) data[fk] = rawData.fields[fk];
    }
    var skipTransportKeys = ['action', 'portalId', 'apiKey', 'fields', 'submittedAt', 'submissionSource', 'sheetName', 'driveFolderId', 'folderId', 'targetJenjangNama', 'namaJenjang'];
    for (var bk in rawData) {
      if (skipTransportKeys.indexOf(bk) === -1) data[bk] = rawData[bk];
    }

    var sheetName = String(rawData.sheetName || data.sheetName || "Pendaftar Baru").trim().slice(0, 95);
    var sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      var initialHeaders = [
        "Timestamp", "tahunAjaranAktif", "jenjangId", "namaLengkap", "nisn", "nik", "jenisKelamin",
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

    function toSlug(value) {
      return String(value || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .replace(/-{2,}/g, '-');
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
        return original.substring(dotIndex).toLowerCase();
      }
      if (mimeType === 'application/pdf') return '.pdf';
      if (mimeType === 'image/jpeg') return '.jpg';
      if (mimeType === 'image/png') return '.png';
      return '';
    }

    function buildSmartFileName(fieldKey, fileData, payload) {
      var santriName = payload.namaLengkap || payload.namaSantri || payload.nama || 'santri';
      var prefix = detectDocPrefix(fieldKey, fileData.name, fileData.fieldLabel);
      var safeName = toSlug(santriName) || 'santri';
      var ext = extractExtension(fileData.name, fileData.mime);
      var stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd-HHmmss');
      return prefix + '-' + safeName + '-' + stamp + ext;
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
    var targetFolderId = extractCleanFolderId(rawData.driveFolderId || rawData.folderId || DEFAULT_DRIVE_FOLDER_ID);
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

    // Upload lampiran ke Google Drive (otomatis ke folder berkas-psb-<tahunAjaran>) & simpan URL hasil share
    for (var key in data) {
      if (typeof data[key] === 'object' && data[key] !== null && data[key].isFile) {
        var fileData = data[key];
        var base64Data = String(fileData.data || '');
        var cleanB64 = base64Data.indexOf(',') !== -1 ? base64Data.split(',')[1] : base64Data;
        var smartName = buildSmartFileName(key, fileData, data);
        var blob = Utilities.newBlob(Utilities.base64Decode(cleanB64), fileData.mime || 'application/octet-stream', smartName);
        var destFolder = resolveDestinationFolder();
        var file = destFolder.createFile(blob);
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
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
}`;

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
