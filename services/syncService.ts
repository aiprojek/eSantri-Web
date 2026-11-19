
import { CloudSyncConfig, E2eeConfig, SyncFileRecord, ConflictItem } from '../types';
import { db } from '../db';
import { createClient, WebDAVClient } from 'webdav';
import { migrateUserPermissions } from './permissionMigrationService';
import { setAuditSyncMute } from './logService';
import { mergePortalConfig } from './portalGasService';
import { decryptBytesSym, E2EE_CHANGED_EVENT, encryptBytesSym, tryParseE2eeEnvelope } from './e2eeService';
import { sanitizePendaftar } from '../utils/sanitizePendaftar';
import { mergeSyncedUserCredentials, sanitizeUserForExternalSync } from './authService';

const MASTER_FILENAME = 'master_data.json';
const MASTER_CONFIG_FILENAME = 'master_config.json';
const CLOUD_ROOT = '/eSantri_Cloud';
const INBOX_FOLDER = `${CLOUD_ROOT}/inbox_staff`;

// --- HELPER: COMPRESSION & DECOMPRESSION ---

/**
 * Mengompresi objek JSON menjadi GZIP ArrayBuffer.
 * Jika E2EE modul Sync aktif, hasil GZIP dienkripsi AES-256-GCM sebelum diupload ke cloud.
 */
const compressData = async (data: any, options?: { attachPublicE2eeMeta?: E2eeConfig }): Promise<ArrayBuffer> => {
    const jsonString = JSON.stringify(data);
    const stream = new Blob([jsonString]).stream();
    const compressedStream = stream.pipeThrough(new CompressionStream('gzip'));
    const gzipBuffer = await new Response(compressedStream).arrayBuffer();

    const settingsList = await db.settings.toArray();
    const e2eeConfig = settingsList[0]?.e2eeConfig;
    if (e2eeConfig?.enabled && e2eeConfig?.modules?.sync) {
        const envelope: any = await encryptBytesSym(
            new Uint8Array(gzipBuffer),
            e2eeConfig,
            'sync-bundle',
            'gzip_b64'
        );
        if (options?.attachPublicE2eeMeta) {
            envelope.e2eeConfig = options.attachPublicE2eeMeta;
        }
        return new TextEncoder().encode(JSON.stringify(envelope)).buffer;
    }

    return gzipBuffer;
};

/**
 * Mendekompresi ArrayBuffer/String. 
 * Mendukung E2EE envelope + GZIP + Backward Compatibility JSON lama.
 */
const decompressData = async (
    input: ArrayBuffer | string,
    onLockedWithMeta?: (meta: E2eeConfig) => Promise<void>
): Promise<any> => {
    let buffer: ArrayBuffer;
    if (typeof input === 'string') {
        buffer = new TextEncoder().encode(input).buffer;
    } else {
        buffer = input;
    }

    // Cek apakah payload berupa amplop E2EE JSON
    try {
        const maybeText = new TextDecoder().decode(buffer);
        if (maybeText.trim().startsWith('{')) {
            const parsedJson = JSON.parse(maybeText);
            const env = tryParseE2eeEnvelope(parsedJson);
            if (env && env.mode === 'sym_aes') {
                try {
                    const plainBytes = await decryptBytesSym(env);
                    if (env.encoding === 'json') {
                        return JSON.parse(new TextDecoder().decode(plainBytes));
                    }
                    buffer = plainBytes.slice().buffer;
                } catch (decryptErr: any) {
                    if (parsedJson?.e2eeConfig && onLockedWithMeta) {
                        await onLockedWithMeta(parsedJson.e2eeConfig);
                    }
                    throw decryptErr;
                }
            } else if (!env && (parsedJson.santri || parsedJson.data || parsedJson.users || parsedJson.timestamp)) {
                return parsedJson;
            }
        }
    } catch (e: any) {
        if (e?.message?.includes('E2EE_LOCKED') || e?.message?.includes('mendekripsi')) {
            throw e;
        }
        // bukan JSON amplop E2EE, lanjut ke dekompresi GZIP
    }

    try {
        const stream = new Blob([buffer]).stream();
        const decompressedStream = stream.pipeThrough(new DecompressionStream('gzip'));
        const decompressedRes = await new Response(decompressedStream).json();
        return decompressedRes;
    } catch (e) {
        try {
            const text = new TextDecoder().decode(buffer);
            return JSON.parse(text);
        } catch (jsonError) {
            console.error("Gagal dekompresi dan gagal parsing JSON biasa:", jsonError);
            throw new Error("File rusak atau format tidak dikenali.");
        }
    }
};

const syncLockedE2eeMetaToLocal = async (meta?: E2eeConfig) => {
    if (!meta || !meta.enabled) return;
    const localSettings = await db.settings.toArray();
    if (localSettings.length > 0) {
        const localCfg = localSettings[0].e2eeConfig;
        if (localCfg && localCfg.enabled === false && localCfg.keyId === meta.keyId) {
            const remoteTs = Date.parse(meta.updatedAt || '') || 0;
            const localTs = Date.parse(localCfg.disabledAt || localCfg.updatedAt || '') || 0;
            if (remoteTs <= localTs) {
                return;
            }
        }
        if (!localCfg?.enabled || localCfg.keyId !== meta.keyId) {
            await db.settings.update(localSettings[0].id!, { e2eeConfig: meta });
        }
    } else {
        await db.settings.add({ e2eeConfig: meta } as any);
    }
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(E2EE_CHANGED_EVENT));
    }
};

const getTime = (val: any) => {
    if (!val) return 0;
    if (typeof val === 'number') return val;
    return new Date(val).getTime();
};

// --- HELPER: RETRY FETCH & VALIDATION ---

const fetchWithRetry = async (url: string, options: RequestInit, retries: number = 3, backoff: number = 500): Promise<Response> => {
    try {
        const response = await fetch(url, options);
        if (response.ok) return response;

        let detailMessage = '';
        try {
            const contentType = response.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
                const errJson = await response.clone().json();
                detailMessage = errJson?.error_summary || errJson?.error_description || errJson?.error || JSON.stringify(errJson);
            } else {
                detailMessage = (await response.clone().text()).slice(0, 500);
            }
        } catch {
            detailMessage = '';
        }

        // Don't retry for 4xx client errors (except 429 too many requests)
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
            throw new Error(`HTTP Error ${response.status}: ${response.statusText}${detailMessage ? ` | ${detailMessage}` : ''}`);
        }
        throw new Error(`Server Error ${response.status}${detailMessage ? ` | ${detailMessage}` : ''}`);
    } catch (error) {
        if (retries > 0) {
            console.warn(`Fetch failed, retrying in ${backoff}ms... (${retries} left)`, error);
            await new Promise(resolve => setTimeout(resolve, backoff));
            return fetchWithRetry(url, options, retries - 1, backoff * 2);
        }
        throw error;
    }
};

const validateSyncData = (data: any): boolean => {
    if (!data || typeof data !== 'object') return false;
    
    // Check essential tables
    const requiredTables = ['santri', 'tagihan', 'pembayaran'];
    if (!data.data && !data.santri) return false; // Accepts both payload formats (inbox payload or direct master)
    
    // If it's inbox payload
    if (data.sender && data.timestamp && data.data) {
         return requiredTables.every(t => Array.isArray(data.data[t]));
    }
    
    // If it's master payload
    if (data.timestamp && data.santri) {
         return requiredTables.every(t => Array.isArray(data[t]));
    }

    return false;
};

const getRecordKey = (tableName: string, item: any) => {
    if (!item) return undefined;
    return tableName === 'saldoSantri' ? item.santriId : item.id;
};

const mergeInventarisSubLogs = (baseWinner: any, secondaryItem: any) => {
    if (!baseWinner || !secondaryItem) return baseWinner;
    const merged = { ...baseWinner };

    // 1. Union merge riwayatServis by log.id
    const servisA = Array.isArray(secondaryItem.riwayatServis) ? secondaryItem.riwayatServis : [];
    const servisB = Array.isArray(baseWinner.riwayatServis) ? baseWinner.riwayatServis : [];
    if (servisA.length > 0 || servisB.length > 0) {
        const servisMap = new Map<string, any>();
        servisA.forEach((s: any) => { if (s?.id) servisMap.set(s.id, s); });
        servisB.forEach((s: any) => { if (s?.id) servisMap.set(s.id, s); });
        merged.riwayatServis = Array.from(servisMap.values()).sort((a, b) =>
            String(a.tanggal || '').localeCompare(String(b.tanggal || ''))
        );
    }

    // 2. Union merge riwayatPeminjaman by log.id (prefer 'Dikembalikan' if returned on either device)
    const pinjamA = Array.isArray(secondaryItem.riwayatPeminjaman) ? secondaryItem.riwayatPeminjaman : [];
    const pinjamB = Array.isArray(baseWinner.riwayatPeminjaman) ? baseWinner.riwayatPeminjaman : [];
    if (pinjamA.length > 0 || pinjamB.length > 0) {
        const pinjamMap = new Map<string, any>();
        pinjamA.forEach((p: any) => { if (p?.id) pinjamMap.set(p.id, p); });
        pinjamB.forEach((p: any) => {
            if (!p?.id) return;
            const existing = pinjamMap.get(p.id);
            if (existing && existing.status === 'Dikembalikan' && p.status !== 'Dikembalikan') {
                return;
            }
            pinjamMap.set(p.id, p);
        });
        const mergedLoans = Array.from(pinjamMap.values()).sort((a, b) =>
            String(a.tanggalPinjam || '').localeCompare(String(b.tanggalPinjam || ''))
        );
        merged.riwayatPeminjaman = mergedLoans;
        merged.statusPinjam = mergedLoans.some((l: any) => l.status === 'Dipinjam') ? 'Dipinjam' : 'Tersedia';
    }

    return merged;
};
const getWebDAVClient = (config: CloudSyncConfig): WebDAVClient => {
    if (!config.webdavUrl || !config.webdavUsername || !config.webdavPassword) {
        throw new Error("Konfigurasi WebDAV belum lengkap.");
    }
    return createClient(config.webdavUrl, {
        username: config.webdavUsername,
        password: config.webdavPassword
    });
};

const ensureWebDAVFolders = async (client: WebDAVClient) => {
    if (!(await client.exists(CLOUD_ROOT))) {
        await client.createDirectory(CLOUD_ROOT);
    }
    if (!(await client.exists(INBOX_FOLDER))) {
        await client.createDirectory(INBOX_FOLDER);
    }
};

export const getValidDropboxToken = async (config: CloudSyncConfig): Promise<string> => {
    const savedSettings = (await db.settings.toArray())[0];
    const mergedConfig: CloudSyncConfig = {
        ...config,
        dropboxRefreshToken: config.dropboxRefreshToken || savedSettings?.cloudSyncConfig?.dropboxRefreshToken,
        dropboxAppKey: config.dropboxAppKey || savedSettings?.cloudSyncConfig?.dropboxAppKey,
        dropboxAppSecret: config.dropboxAppSecret || savedSettings?.cloudSyncConfig?.dropboxAppSecret,
        dropboxToken: config.dropboxToken || savedSettings?.cloudSyncConfig?.dropboxToken,
        dropboxTokenExpiresAt: config.dropboxTokenExpiresAt || savedSettings?.cloudSyncConfig?.dropboxTokenExpiresAt,
    };

    if (!mergedConfig.dropboxRefreshToken || !mergedConfig.dropboxAppKey) {
        throw new Error("Dropbox belum dikonfigurasi sepenuhnya. Silakan cek menu Pengaturan > Sync Cloud.");
    }
    if (mergedConfig.dropboxToken && mergedConfig.dropboxTokenExpiresAt && Date.now() < mergedConfig.dropboxTokenExpiresAt - 300000) {
        return mergedConfig.dropboxToken;
    }
    
    const params: Record<string, string> = {
        grant_type: 'refresh_token',
        refresh_token: mergedConfig.dropboxRefreshToken,
        client_id: mergedConfig.dropboxAppKey,
    };
    
    // Add Client Secret if available (Confidential Client flow)
    if (mergedConfig.dropboxAppSecret) {
        params.client_secret = mergedConfig.dropboxAppSecret;
    }

    const response = await fetchWithRetry('https://api.dropboxapi.com/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(params),
    });
    
    const data = await response.json();
    return data.access_token;
};

// Updated for Manual Code Flow with App Secret
export const exchangeCodeForToken = async (appKey: string, appSecret: string, code: string, redirectUri?: string) => {
    const params: Record<string, string> = {
        code,
        grant_type: 'authorization_code',
        client_id: appKey,
        client_secret: appSecret
    };
    if (redirectUri) {
        params.redirect_uri = redirectUri;
    }

    const response = await fetch('https://api.dropboxapi.com/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(params),
    });
    
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error_description || 'Gagal menukar token');
    }
    return await response.json();
};

export const getCloudStorageStats = async (config: CloudSyncConfig) => {
    if (config.provider === 'dropbox') {
        const token = await getValidDropboxToken(config);
        const response = await fetchWithRetry('https://api.dropboxapi.com/2/users/get_space_usage', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        const used = data.used || 0;
        const total = data.allocation?.allocated || 0;
        return { used, total, percent: total > 0 ? (used / total) * 100 : 0 };
    } else if (config.provider === 'webdav') {
        const client = getWebDAVClient(config);
        try {
            const quota = await client.getQuota() as any;
            if (quota) {
                 const used = typeof quota.used === 'number' ? quota.used : 0;
                 const available = typeof quota.available === 'number' ? quota.available : 0;
                 const total = used + available; 
                 return { used, total, percent: total > 0 ? (used / total) * 100 : 0 };
            }
        } catch (e) {
            console.warn("WebDAV quota check failed", e);
        }
        return { used: 0, total: 0, percent: 0 };
    }
    return null;
};

export const fetchPsbFromDropbox = async (token: string): Promise<any[]> => {
    try {
        const response = await fetchWithRetry('https://api.dropboxapi.com/2/files/list_folder', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ path: INBOX_FOLDER })
        });
        
        const listData = await response.json();
        
        const files = listData.entries
            .filter((e: any) => e['.tag'] === 'file' && e.name.endsWith('.json'))
            .sort((a: any, b: any) => new Date(b.client_modified).getTime() - new Date(a.client_modified).getTime())
            .slice(0, 10);

        let allPendaftar: any[] = [];
        const seenIds = new Set();
        const settingsRows = await db.settings.toArray();
        const activeKeyId = settingsRows[0]?.e2eeConfig?.enabled ? settingsRows[0]?.e2eeConfig?.keyId : null;
        let encryptedFileCount = 0;
        let lockedErrorCount = 0;
        let firstLockedError: Error | null = null;

        for (const file of files) {
             const dlResponse = await fetchWithRetry('https://content.dropboxapi.com/2/files/download', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Dropbox-API-Arg': JSON.stringify({ path: file.path_lower })
                }
            });
            if (dlResponse.ok) {
                const buffer = await dlResponse.arrayBuffer();
                let json: any;
                try {
                    json = await decompressData(buffer, syncLockedE2eeMetaToLocal);
                } catch (fileErr: any) {
                    const msg = String(fileErr?.message || '');
                    if (msg.includes('E2EE_LOCKED')) {
                        encryptedFileCount++;
                        lockedErrorCount++;
                        if (!firstLockedError) firstLockedError = fileErr instanceof Error ? fileErr : new Error(msg);
                        if (activeKeyId && msg.includes(`(${activeKeyId})`)) {
                            throw fileErr;
                        }
                        console.warn(`Lewati file inbox PSB terenkripsi (${file.name}):`, msg);
                        continue;
                    }
                    console.warn(`Lewati file inbox PSB rusak (${file.name}):`, msg);
                    continue;
                }
                
                if (json.data && Array.isArray(json.data.pendaftar)) {
                    json.data.pendaftar.forEach((p: any) => {
                         const itemToPush = tryParseE2eeEnvelope(p) ? p : sanitizePendaftar(p);
                         const key = `${String(itemToPush.tahunAjaran || '').trim().toLowerCase()}|${String(itemToPush.namaLengkap || '').trim().toLowerCase()}|${String(itemToPush.nik || itemToPush.nomorHpWali || itemToPush.tanggalLahir || itemToPush.id || '').trim().toLowerCase()}`;
                         if (!seenIds.has(key)) {
                             allPendaftar.push(itemToPush);
                             seenIds.add(key);
                         }
                    });
                }
            }
        }

        if (encryptedFileCount > 0 && lockedErrorCount === encryptedFileCount && allPendaftar.length === 0 && firstLockedError) {
            throw firstLockedError;
        }
        
        return allPendaftar;
    } catch (error: any) {
        console.error("Error fetching PSB from Cloud:", error);
        if (error?.message?.includes('E2EE_LOCKED')) {
            throw error;
        }
        throw new Error("Gagal mengambil data dari Dropbox. Cek koneksi internet.");
    }
};

// Helper to filter data for incremental sync
const getIncrementalData = async (tableName: string, since?: number) => {
    const table = (db as any)[tableName];
    if (!since) return await table.toArray();
    return await table.where('lastModified').above(since).toArray();
};

export const getEffectivePushBaseline = (config?: CloudSyncConfig): number => {
    if (!config) return 0;
    const pushTs = config.lastPushAt ? new Date(config.lastPushAt).getTime() : 0;
    const syncTs = config.lastSync ? new Date(config.lastSync).getTime() : 0;
    const validPush = Number.isFinite(pushTs) ? pushTs : 0;
    const validSync = Number.isFinite(syncTs) ? syncTs : 0;
    return Math.max(validPush, validSync);
};

// ... uploadStaffChanges ...
export const uploadStaffChanges = async (config: CloudSyncConfig, username: string, forceFull: boolean = false) => {
    const lastSyncTime = !forceFull ? getEffectivePushBaseline(config) : 0;
    
    const data: any = {};
    const tablesToSync = [
        'santri', 'settings', 'tagihan', 'pembayaran', 'saldoSantri', 'transaksiSaldo', 
        'transaksiKas', 'chartOfAccounts', 'payrollRecords', 'produkKoperasi', 
        'transaksiKoperasi', 'riwayatStok', 'keuanganKoperasi', 'suratTemplates', 
        'arsipSurat', 'pendaftar', 'auditLogs', 'users', 'raporRecords', 'absensi', 
        'jurnalMengajar', 'tahfizh', 'buku', 'sirkulasi', 'obat', 'kesehatanRecords', 'bkSessions', 
        'bukuTamu', 'inventaris', 'calendarEvents', 'jadwalPelajaran', 'arsipJadwal', 'jadwalUjian',
        'piketSchedules', 'pendingOrders', 'diskon', 'suppliers', 'pembayaranHutang',
        'warehouses', 'stockTransfers', 'digitalAssets'
    ];

    for (const table of tablesToSync) {
        data[table] = await getIncrementalData(table, lastSyncTime);
    }
    const changedTableEntries = Object.entries(data)
        .map(([table, rows]: [string, any]) => ({ table, count: Array.isArray(rows) ? rows.length : 0 }))
        .filter(item => item.count > 0);
    const totalChanges = changedTableEntries.reduce((acc, item) => acc + item.count, 0);

    // Always include settings if there's any update or force
    if (data.settings.length === 0 && !forceFull) {
        // Option: skip if no changes across most important tables? 
        // For now, let's check if all tables are empty
        if (totalChanges === 0) {
            return { skipped: true, timestamp: new Date().toISOString(), totalChanges: 0, changedTables: [] as { table: string; count: number }[] };
        }
    }

    const payload = {
        sender: username,
        timestamp: new Date().toISOString(),
        isIncremental: lastSyncTime > 0,
        data
    };
    
    // UPDATE: Compress Payload before upload
    const settingsRows = await db.settings.toArray();
    const e2eeMeta = settingsRows[0]?.e2eeConfig;
    const e2eeSyncEnabled = Boolean(e2eeMeta?.enabled && e2eeMeta?.modules?.sync);
    if (Array.isArray(data.users)) {
        data.users = data.users.map((u: any) => sanitizeUserForExternalSync(u, e2eeSyncEnabled));
    }

    const compressedBuffer = await compressData(
        payload,
        e2eeSyncEnabled ? { attachPublicE2eeMeta: e2eeMeta } : undefined
    );

    const filename = `${new Date().getTime()}_${username.replace(/\s+/g, '_')}.json`;
    const fullPath = `${INBOX_FOLDER}/${filename}`;

    if (config.provider === 'dropbox') {
        const token = await getValidDropboxToken(config);
        await fetchWithRetry('https://content.dropboxapi.com/2/files/upload', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Dropbox-API-Arg': JSON.stringify({
                    path: fullPath,
                    mode: 'add',
                    autorename: true,
                    mute: true
                }),
                'Content-Type': 'application/octet-stream'
            },
            body: compressedBuffer
        });
    } else if (config.provider === 'webdav') {
        const client = getWebDAVClient(config);
        await ensureWebDAVFolders(client);
        await client.putFileContents(fullPath, compressedBuffer);
    } else {
        throw new Error("Provider tidak valid");
    }
    
    return { filename, timestamp: payload.timestamp, totalChanges, changedTables: changedTableEntries };
};

// ... downloadAndMergeMaster (updated) ...
export const downloadAndMergeMaster = async (config: CloudSyncConfig) => {
    let masterData;

    if (config.provider === 'dropbox') {
        const token = await getValidDropboxToken(config);
        const response = await fetchWithRetry('https://content.dropboxapi.com/2/files/download', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Dropbox-API-Arg': JSON.stringify({ path: `${CLOUD_ROOT}/${MASTER_FILENAME}` })
            }
        });

        if (!response.ok) {
            if (response.status === 409) return { status: 'no_master' };
            throw new Error('Gagal download Master Data dari Cloud Storage (Dropbox)');
        }
        
        // UPDATE: Handle Decompression
        const buffer = await response.arrayBuffer();
        masterData = await decompressData(buffer, syncLockedE2eeMetaToLocal);

    } else if (config.provider === 'webdav') {
        const client = getWebDAVClient(config);
        if (!(await client.exists(`${CLOUD_ROOT}/${MASTER_FILENAME}`))) {
             return { status: 'no_master' };
        }
        const contents = await client.getFileContents(`${CLOUD_ROOT}/${MASTER_FILENAME}`);
        // WebDAV client might return string or buffer. decompressData handles both.
        masterData = await decompressData(contents as any, syncLockedE2eeMetaToLocal);
    } else {
         throw new Error("Provider tidak valid");
    }

    if (!validateSyncData(masterData)) {
        throw new Error("Format data master tidak valid atau rusak.");
    }
    
    const tablesToMerge = [
        'santri', 'tagihan', 'pembayaran', 'saldoSantri', 'transaksiSaldo', 'transaksiKas', 'chartOfAccounts',
        'payrollRecords',
        'produkKoperasi', 'transaksiKoperasi', 'riwayatStok', 'keuanganKoperasi',
        'suratTemplates', 'arsipSurat', 'pendaftar', 'raporRecords', 'absensi', 'jurnalMengajar',
        'tahfizh', 'buku', 'sirkulasi', 'obat', 'kesehatanRecords', 'bkSessions', 'bukuTamu',
        'inventaris', 'calendarEvents', 'jadwalPelajaran', 'arsipJadwal', 'jadwalUjian', 'piketSchedules',
        'pendingOrders', 'diskon', 'suppliers', 'pembayaranHutang', 'warehouses', 'stockTransfers',
        'digitalAssets', 'settings', 'users', 'auditLogs'
    ];

    const effectivePushBaseline = getEffectivePushBaseline(config);
    const parsedMasterTs = masterData.timestamp ? new Date(masterData.timestamp).getTime() : Date.now();
    const masterTimestampMs = Number.isFinite(parsedMasterTs) ? parsedMasterTs : Date.now();
    const newWatermarkMs = Math.max(effectivePushBaseline, masterTimestampMs);
    let preservedLocalChanges = 0;

    await (db as any).transaction('rw', tablesToMerge.map(t => (db as any)[t]), async () => {
        const mergeTable = async (tableName: string, masterItems: any[]) => {
            const table = (db as any)[tableName];
            const localItems = await table.toArray();
            const localMap = new Map(localItems.map((i: any) => [getRecordKey(tableName, i), i]));
            const safeMasterItems = Array.isArray(masterItems) ? masterItems : [];
            const masterMap = new Map(safeMasterItems.map((i: any) => [getRecordKey(tableName, i), i]));
            
            const itemsToPut: any[] = [];
            
            for (const mItem of safeMasterItems) {
                const key = getRecordKey(tableName, mItem);
                if (key === undefined) continue;
                const lItem = localMap.get(key) as any;
                if (lItem) {
                    const lTime = lItem.lastModified || 0;
                    const mTime = mItem.lastModified || 0;
                    if (mTime >= lTime) {
                        let chosen = tableName === 'inventaris' ? mergeInventarisSubLogs(mItem, lItem) : mItem;
                        if (tableName === 'users') chosen = mergeSyncedUserCredentials(chosen, lItem);
                        itemsToPut.push(tableName === 'pendaftar' ? sanitizePendaftar(chosen) : chosen);
                    } else if (tableName === 'inventaris') {
                        const mergedInv = mergeInventarisSubLogs(lItem, mItem);
                        if (effectivePushBaseline > 0 && lTime > effectivePushBaseline && lTime <= newWatermarkMs) {
                            mergedInv.lastModified = newWatermarkMs + 1;
                            preservedLocalChanges++;
                        }
                        itemsToPut.push(mergedInv);
                    }
                } else {
                    itemsToPut.push(tableName === 'pendaftar' ? sanitizePendaftar(mItem) : mItem);
                }
            }

            // Preserve unpushed local records (created/edited after last push) so advancing watermark to Master timestamp
            // never hides local changes that the staff forgot to push in a previous session.
            if (effectivePushBaseline > 0) {
                for (const lItem of localItems) {
                    const key = getRecordKey(tableName, lItem);
                    if (key === undefined) continue;
                    const lTime = lItem.lastModified || 0;
                    if (lTime <= effectivePushBaseline) continue;

                    const mItem = masterMap.get(key) as any;
                    const mTime = mItem?.lastModified || 0;
                    const isLocalUnpushedWinner = !mItem || lTime > mTime;

                    if (isLocalUnpushedWinner) {
                        if (tableName !== 'inventaris' || !mItem) {
                            if (tableName !== 'auditLogs' && tableName !== 'users' && tableName !== 'settings') {
                                preservedLocalChanges++;
                            }
                            if (lTime <= newWatermarkMs) {
                                itemsToPut.push({ ...lItem, lastModified: newWatermarkMs + 1 });
                            }
                        }
                    }
                }
            }
            
            if (itemsToPut.length > 0) {
                setAuditSyncMute(true);
                try {
                    await table.bulkPut(itemsToPut);
                } finally {
                    setTimeout(() => setAuditSyncMute(false), 120);
                }
            }
        };

        for (const tableName of tablesToMerge) {
            if (tableName === 'settings' && masterData.settings) {
                // Special handle for settings singleton
                const mSettings = masterData.settings[0];
                if (mSettings) {
                    const localSettings = await db.settings.toArray();
                    if (localSettings.length > 0) {
                        const lSettings = localSettings[0];
                        if (getTime(mSettings.lastModified) >= getTime(lSettings.lastModified)) {
                            const { id: _, ...rest } = mSettings;
                            if (lSettings.cloudSyncConfig) {
                                rest.cloudSyncConfig = {
                                    ...(rest.cloudSyncConfig || {}),
                                    ...lSettings.cloudSyncConfig
                                };
                            }
                            if (rest.portalConfig || lSettings.portalConfig) {
                                rest.portalConfig = mergePortalConfig(rest.portalConfig, lSettings.portalConfig);
                            }
                            await db.settings.update(lSettings.id!, rest);
                        }
                    } else {
                        await db.settings.add(mSettings);
                    }
                }
            } else {
                await mergeTable(tableName, masterData[tableName]);
            }
        }
    });

    return {
        status: 'merged',
        timestamp: masterData.timestamp,
        effectiveWatermark: new Date(newWatermarkMs).toISOString(),
        preservedLocalChanges
    };
};

export const listInboxFiles = async (config: CloudSyncConfig): Promise<SyncFileRecord[]> => {
    if (config.provider === 'dropbox') {
        const token = await getValidDropboxToken(config);
        const response = await fetchWithRetry('https://api.dropboxapi.com/2/files/list_folder', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                path: INBOX_FOLDER,
                recursive: false
            })
        });
        
        const data = await response.json();
        return data.entries.filter((e: any) => e['.tag'] === 'file' && e.name.endsWith('.json')).map((e: any) => ({
            id: e.id,
            name: e.name,
            path_lower: e.path_lower,
            client_modified: e.client_modified,
            size: e.size,
            status: 'pending' 
        }));
    } else if (config.provider === 'webdav') {
        const client = getWebDAVClient(config);
        await ensureWebDAVFolders(client);
        const files = await client.getDirectoryContents(INBOX_FOLDER);
        return (files as any[])
            .filter(f => f.type === 'file' && f.basename.endsWith('.json'))
            .map(f => ({
                id: f.filename,
                name: f.basename,
                path_lower: f.filename,
                client_modified: f.lastmod,
                size: f.size,
                status: 'pending'
            }));
    }
    return [];
};

export interface InboxFileInspection {
    sender: string;
    timestamp: string;
    isIncremental: boolean;
    totalRecords: number;
    tableBreakdown: { tableName: string; label: string; count: number }[];
}

const TABLE_LABELS: Record<string, string> = {
    santri: 'Data Santri',
    tagihan: 'Tagihan Keuangan',
    pembayaran: 'Pembayaran SPP/Tagihan',
    saldoSantri: 'Saldo Tabungan Santri',
    transaksiSaldo: 'Mutasi Tabungan',
    transaksiKas: 'Buku Kas Umum',
    chartOfAccounts: 'Akun Keuangan (COA)',
    payrollRecords: 'Slip Gaji / Bisyaroh',
    produkKoperasi: 'Produk Koperasi',
    transaksiKoperasi: 'Transaksi Koperasi',
    riwayatStok: 'Riwayat Stok Koperasi',
    keuanganKoperasi: 'Kas Koperasi',
    suratTemplates: 'Template Surat',
    arsipSurat: 'Arsip Surat Keluar',
    pendaftar: 'Pendaftar PSB',
    auditLogs: 'Log Audit Aktivitas',
    users: 'Akun Pengguna',
    raporRecords: 'Nilai Rapor',
    absensi: 'Absensi Santri',
    jurnalMengajar: 'Jurnal Mengajar Guru',
    tahfizh: 'Setoran Tahfizh',
    buku: 'Katalog Perpustakaan',
    sirkulasi: 'Peminjaman Buku',
    obat: 'Stok Obat UKS',
    kesehatanRecords: 'Rekam Medis Santri',
    bkSessions: 'Sesi Konseling BK',
    bukuTamu: 'Buku Tamu & Paket',
    inventaris: 'Inventaris Sarpras',
    calendarEvents: 'Kalender Akademik',
    jadwalPelajaran: 'Jadwal Pelajaran',
    arsipJadwal: 'Arsip Jadwal',
    jadwalUjian: 'Jadwal Ujian',
    piketSchedules: 'Jadwal Piket',
    pendingOrders: 'Antrean Kasir Koperasi',
    diskon: 'Master Diskon',
    suppliers: 'Data Supplier',
    pembayaranHutang: 'Pembayaran Piutang',
    warehouses: 'Gudang Koperasi',
    stockTransfers: 'Transfer Stok Gudang',
    digitalAssets: 'Aset Tanda Tangan & Stempel',
    settings: 'Pengaturan Pondok'
};

export const inspectInboxFile = async (config: CloudSyncConfig, file: SyncFileRecord): Promise<InboxFileInspection> => {
    let fileContent;

    if (config.provider === 'dropbox') {
        const token = await getValidDropboxToken(config);
        const response = await fetchWithRetry('https://content.dropboxapi.com/2/files/download', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Dropbox-API-Arg': JSON.stringify({ path: file.path_lower })
            }
        });
        const buffer = await response.arrayBuffer();
        fileContent = await decompressData(buffer, syncLockedE2eeMetaToLocal);
    } else if (config.provider === 'webdav') {
        const client = getWebDAVClient(config);
        const contents = await client.getFileContents(file.path_lower);
        fileContent = await decompressData(contents as any, syncLockedE2eeMetaToLocal);
    } else {
        throw new Error("Provider tidak valid");
    }

    if (!validateSyncData(fileContent)) {
        throw new Error("File dari staff rusak atau format tidak dikenali.");
    }

    const data = fileContent.data || {};
    const tableBreakdown: { tableName: string; label: string; count: number }[] = [];
    let totalRecords = 0;

    for (const [tableName, items] of Object.entries(data)) {
        if (Array.isArray(items) && items.length > 0) {
            tableBreakdown.push({
                tableName,
                label: TABLE_LABELS[tableName] || tableName,
                count: items.length
            });
            totalRecords += items.length;
        }
    }

    tableBreakdown.sort((a, b) => b.count - a.count);

    return {
        sender: fileContent.sender || 'Staff',
        timestamp: fileContent.timestamp || file.client_modified,
        isIncremental: Boolean(fileContent.isIncremental),
        totalRecords,
        tableBreakdown
    };
};

// ... processInboxFile (updated for validation & decompression) ...
export const processInboxFile = async (config: CloudSyncConfig, file: SyncFileRecord, resolvedConflicts?: ConflictItem[]) => {
    let fileContent;

    if (config.provider === 'dropbox') {
        const token = await getValidDropboxToken(config);
        const response = await fetchWithRetry('https://content.dropboxapi.com/2/files/download', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Dropbox-API-Arg': JSON.stringify({ path: file.path_lower })
            }
        });
        // UPDATE: Handle Decompression
        const buffer = await response.arrayBuffer();
        fileContent = await decompressData(buffer, syncLockedE2eeMetaToLocal);

    } else if (config.provider === 'webdav') {
        const client = getWebDAVClient(config);
        const contents = await client.getFileContents(file.path_lower);
        // WebDAV client returns string or buffer
        fileContent = await decompressData(contents as any, syncLockedE2eeMetaToLocal);
    } else {
        throw new Error("Provider tidak valid");
    }

    if (!validateSyncData(fileContent)) {
        throw new Error("File dari staff rusak atau tidak valid.");
    }
    
    const data = fileContent.data;
    const conflicts: ConflictItem[] = [];
    
    const tablesToMerge = [
        'santri', 'tagihan', 'pembayaran', 'saldoSantri', 'transaksiSaldo', 'transaksiKas', 'chartOfAccounts',
        'payrollRecords',
        'produkKoperasi', 'transaksiKoperasi', 'riwayatStok', 'keuanganKoperasi',
        'suratTemplates', 'arsipSurat', 'pendaftar', 'auditLogs', 'users', 'raporRecords', 'absensi', 'jurnalMengajar',
        'tahfizh', 'buku', 'sirkulasi', 'obat', 'kesehatanRecords', 'bkSessions', 'bukuTamu',
        'inventaris', 'calendarEvents', 'jadwalPelajaran', 'arsipJadwal', 'jadwalUjian', 'piketSchedules',
        'pendingOrders', 'diskon', 'suppliers', 'pembayaranHutang', 'warehouses', 'stockTransfers', 'digitalAssets', 'settings'
    ];

    if (resolvedConflicts) {
        resolvedConflicts.forEach(rc => {
            if (rc.resolved) {
                const targetList = data[rc.tableName];
                if (targetList) {
                    const idx = targetList.findIndex((item: any) => getRecordKey(rc.tableName, item) === rc.recordId);
                    if (idx >= 0) {
                        targetList[idx] = rc.localData;
                    }
                }
            }
        });
    }

    let recordCount = 0;

    await (db as any).transaction('rw', tablesToMerge.map(t => (db as any)[t]), async () => {
        const stagedPuts: { tableName: string; items: any[] }[] = [];
        let stagedSettingsUpdate: { id?: number; data: any; isNew: boolean } | null = null;

        const checkTableConflicts = async (tableName: string, incomingItems: any[]) => {
            if (!incomingItems || incomingItems.length === 0) return;
            const table = (db as any)[tableName];
            const localItems = await table.toArray();
            const localMap = new Map(localItems.map((i: any) => [getRecordKey(tableName, i), i]));
            
            const itemsToPut: any[] = [];
            
            for (const incItem of incomingItems) {
                const recKey = getRecordKey(tableName, incItem);
                if (recKey === undefined) continue;
                const locItem = localMap.get(recKey) as any;
                
                if (locItem) {
                    const effectiveIncItem = tableName === 'users' ? mergeSyncedUserCredentials(incItem, locItem) : incItem;
                    const incTime = effectiveIncItem.lastModified || 0;
                    const locTime = locItem.lastModified || 0;
                    
                    const { lastModified: t1, ...contentInc } = effectiveIncItem;
                    const { lastModified: t2, ...contentLoc } = locItem;
                    const isDiff = JSON.stringify(contentInc) !== JSON.stringify(contentLoc);

                    if (isDiff) {
                        if (incTime > locTime) {
                            const chosen = tableName === 'inventaris' ? mergeInventarisSubLogs(effectiveIncItem, locItem) : effectiveIncItem;
                            itemsToPut.push(tableName === 'pendaftar' ? sanitizePendaftar(chosen) : chosen);
                        } else {
                             const alreadyResolved = resolvedConflicts?.find(r => r.tableName === tableName && r.recordId === recKey);
                             if (!alreadyResolved) {
                                 conflicts.push({
                                     id: `${tableName}-${recKey}`,
                                     tableName,
                                     recordId: recKey,
                                     localData: locItem,
                                     cloudData: effectiveIncItem,
                                     resolved: false
                                 });
                             } else {
                                 const chosen = tableName === 'inventaris' ? mergeInventarisSubLogs(effectiveIncItem, locItem) : effectiveIncItem;
                                 itemsToPut.push(tableName === 'pendaftar' ? sanitizePendaftar(chosen) : chosen); 
                             }
                        }
                    }
                } else {
                    itemsToPut.push(tableName === 'pendaftar' ? sanitizePendaftar(incItem) : incItem);
                }
            }
            
            if (itemsToPut.length > 0) {
                stagedPuts.push({ tableName, items: itemsToPut });
            }
        };
        
        for (const tableName of tablesToMerge) {
            if (tableName === 'users' && data.users) {
                const staffUpdates = data.users.filter((u: any) => !u.isDefaultAdmin);
                await checkTableConflicts('users', staffUpdates);
            } else if (tableName === 'settings' && data.settings) {
                const incomingSettings = data.settings[0];
                if (incomingSettings) {
                    const localSettings = await db.settings.toArray();
                    if (localSettings.length > 0) {
                        const local = localSettings[0];
                        if (getTime(incomingSettings.lastModified) > getTime(local.lastModified)) {
                            const { id: _, ...rest } = incomingSettings;
                            if (local.cloudSyncConfig) {
                                rest.cloudSyncConfig = {
                                    ...(rest.cloudSyncConfig || {}),
                                    ...local.cloudSyncConfig
                                };
                            }
                            if (rest.portalConfig || local.portalConfig) {
                                rest.portalConfig = mergePortalConfig(rest.portalConfig, local.portalConfig);
                            }
                            stagedSettingsUpdate = { id: local.id!, data: rest, isNew: false };
                        }
                    } else {
                        stagedSettingsUpdate = { data: incomingSettings, isNew: true };
                    }
                }
            } else {
                await checkTableConflicts(tableName, data[tableName]);
            }
        }

        // Only write to DB if all tables have 0 unresolved conflicts
        if (conflicts.length === 0) {
            setAuditSyncMute(true);
            try {
                for (const batch of stagedPuts) {
                    const table = (db as any)[batch.tableName];
                    await table.bulkPut(batch.items);
                    recordCount += batch.items.length;
                }
                if (stagedSettingsUpdate) {
                    if (stagedSettingsUpdate.isNew) {
                        await db.settings.add(stagedSettingsUpdate.data);
                    } else if (stagedSettingsUpdate.id !== undefined) {
                        await db.settings.update(stagedSettingsUpdate.id, stagedSettingsUpdate.data);
                    }
                }
            } finally {
                setTimeout(() => setAuditSyncMute(false), 120);
            }
        }
    });

    if (conflicts.length > 0) {
        return { success: false, conflicts, recordCount: 0 };
    }

    return { success: true, recordCount, sender: fileContent.sender };
};

// ... publishMasterData, updateAccountFromCloud ...
export const getPendingChangesCount = async (config: CloudSyncConfig) => {
    if (!config || config.provider === 'none') return 0;
    const lastSyncTime = getEffectivePushBaseline(config);
    
    const tablesToSync = [
        'santri', 'tagihan', 'pembayaran', 'saldoSantri', 'transaksiSaldo', 
        'transaksiKas', 'chartOfAccounts', 'payrollRecords', 'produkKoperasi', 
        'transaksiKoperasi', 'riwayatStok', 'keuanganKoperasi', 'suratTemplates', 
        'arsipSurat', 'pendaftar', 'auditLogs', 'raporRecords', 'absensi', 
        'jurnalMengajar', 'tahfizh', 'buku', 'sirkulasi', 'obat', 'kesehatanRecords', 'bkSessions', 
        'bukuTamu', 'inventaris', 'calendarEvents', 'jadwalPelajaran', 'arsipJadwal', 'jadwalUjian',
        'piketSchedules', 'pendingOrders', 'diskon', 'suppliers', 'pembayaranHutang',
        'warehouses', 'stockTransfers', 'digitalAssets', 'users', 'settings'
    ];

    let total = 0;
    for (const tableName of tablesToSync) {
        const table = (db as any)[tableName];
        if (table) {
            const count = await table.where('lastModified').above(lastSyncTime).count();
            total += count;
        }
    }
    return total;
};

export const publishMasterData = async (config: CloudSyncConfig) => {
    const masterData = {
        timestamp: new Date().toISOString(),
        santri: await db.santri.toArray(),
        tagihan: await db.tagihan.toArray(),
        pembayaran: await db.pembayaran.toArray(),
        saldoSantri: await db.saldoSantri.toArray(),
        transaksiSaldo: await db.transaksiSaldo.toArray(),
        transaksiKas: await db.transaksiKas.toArray(),
        chartOfAccounts: await db.chartOfAccounts.toArray(),
        payrollRecords: await db.payrollRecords.toArray(),
        produkKoperasi: await db.produkKoperasi.toArray(),
        transaksiKoperasi: await db.transaksiKoperasi.toArray(),
        riwayatStok: await db.riwayatStok.toArray(),
        keuanganKoperasi: await db.keuanganKoperasi.toArray(),
        suratTemplates: await db.suratTemplates.toArray(),
        arsipSurat: await db.arsipSurat.toArray(),
        pendaftar: await db.pendaftar.toArray(),
        auditLogs: await db.auditLogs.toArray(),
        raporRecords: await db.raporRecords.toArray(),
        absensi: await db.absensi.toArray(),
        jurnalMengajar: await db.jurnalMengajar.toArray(),
        tahfizh: await db.tahfizh.toArray(),
        buku: await db.buku.toArray(),
        sirkulasi: await db.sirkulasi.toArray(),
        obat: await db.obat.toArray(),
        kesehatanRecords: await db.kesehatanRecords.toArray(),
        bkSessions: await db.bkSessions.toArray(),
        bukuTamu: await db.bukuTamu.toArray(),
        inventaris: await db.inventaris.toArray(),
        calendarEvents: await db.calendarEvents.toArray(),
        jadwalPelajaran: await db.jadwalPelajaran.toArray(),
        arsipJadwal: await db.arsipJadwal.toArray(),
        jadwalUjian: await db.jadwalUjian.toArray(),
        piketSchedules: await db.piketSchedules.toArray(),
        pendingOrders: await db.pendingOrders.toArray(),
        diskon: await db.diskon.toArray(),
        suppliers: await db.suppliers.toArray(),
        pembayaranHutang: await db.pembayaranHutang.toArray(),
        warehouses: await db.warehouses.toArray(),
        stockTransfers: await db.stockTransfers.toArray(),
        digitalAssets: await db.digitalAssets.toArray(),
        settings: await db.settings.toArray()
    };

    const settingsRows = await db.settings.toArray();
    const e2eeMeta = settingsRows[0]?.e2eeConfig;
    const e2eeSyncEnabled = Boolean(e2eeMeta?.enabled && e2eeMeta?.modules?.sync);

    const masterConfig = {
        timestamp: new Date().toISOString(),
        users: (await db.users.toArray()).map((u) => sanitizeUserForExternalSync(u, e2eeSyncEnabled)),
        settings: settingsRows
    };

    // UPDATE: Compress Data (and encrypt if E2EE sync enabled) before Upload
    const compressOpts = e2eeSyncEnabled ? { attachPublicE2eeMeta: e2eeMeta } : undefined;
    const compressedMaster = await compressData(masterData, compressOpts);
    const compressedConfig = await compressData(masterConfig, compressOpts);

    if (config.provider === 'dropbox') {
        const token = await getValidDropboxToken(config);
        await fetchWithRetry('https://content.dropboxapi.com/2/files/upload', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Dropbox-API-Arg': JSON.stringify({ path: `${CLOUD_ROOT}/${MASTER_FILENAME}`, mode: 'overwrite', mute: true }),
                'Content-Type': 'application/octet-stream'
            },
            body: compressedMaster
        });
        await fetchWithRetry('https://content.dropboxapi.com/2/files/upload', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Dropbox-API-Arg': JSON.stringify({ path: `${CLOUD_ROOT}/${MASTER_CONFIG_FILENAME}`, mode: 'overwrite', mute: true }),
                'Content-Type': 'application/octet-stream'
            },
            body: compressedConfig
        });
    } else if (config.provider === 'webdav') {
        const client = getWebDAVClient(config);
        await ensureWebDAVFolders(client);
        await client.putFileContents(`${CLOUD_ROOT}/${MASTER_FILENAME}`, compressedMaster);
        await client.putFileContents(`${CLOUD_ROOT}/${MASTER_CONFIG_FILENAME}`, compressedConfig);
    }
    
    return { timestamp: masterData.timestamp };
};

export const updateAccountFromCloud = async (config: CloudSyncConfig) => {
    let data: any = null;
    
    const handleLockedWithMeta = async (meta?: E2eeConfig) => {
        await syncLockedE2eeMetaToLocal(meta);
        throw new Error('E2EE_LOCKED: Konfigurasi E2EE telah dimuat ke perangkat ini. Silakan masukkan Master Password E2EE pada banner/Pengaturan > User & Keamanan lalu ulangi sync.');
    };

    if (config.provider === 'firebase') {
        const tenantId = config.firebasePairedTenantId;
        if (!tenantId) throw new Error("Tenant ID tidak ditemukan. Harap hubungkan Firebase terlebih dahulu.");
        
        const { db: fdb, collection, getDocs, query, doc, getDoc } = await import('../firebase');
        const path = `tenants/${tenantId}/users`;
        const q = query(collection(fdb, path));
        const snapshot = await getDocs(q);
        const rawUsers = snapshot.docs.map(d => d.data());

        let rawSettingsDoc: any = null;
        try {
            const settingsSnap = await getDoc(doc(fdb, `tenants/${tenantId}/settings`, 'main'));
            if (settingsSnap.exists()) {
                rawSettingsDoc = settingsSnap.data();
            }
        } catch (sErr) {
            console.warn("Could not fetch remote settings during updateAccountFromCloud:", sErr);
        }

        const { decryptAnyEnvelope } = await import('./e2eeService');

        if (rawSettingsDoc && tryParseE2eeEnvelope(rawSettingsDoc)) {
            try {
                rawSettingsDoc = await decryptAnyEnvelope(rawSettingsDoc);
            } catch {
                await handleLockedWithMeta(rawSettingsDoc.e2eeConfig);
            }
        }

        const decryptedUsers: any[] = [];
        for (const u of rawUsers) {
            if (tryParseE2eeEnvelope(u)) {
                try {
                    decryptedUsers.push(await decryptAnyEnvelope(u));
                } catch {
                    await handleLockedWithMeta(rawSettingsDoc?.e2eeConfig);
                }
            } else {
                decryptedUsers.push(u);
            }
        }

        data = {
            users: decryptedUsers.length > 0 ? decryptedUsers : undefined,
            settings: rawSettingsDoc ? [rawSettingsDoc] : undefined,
        };
    } else if (config.provider === 'dropbox') {
        const token = await getValidDropboxToken(config);
        const response = await fetchWithRetry('https://content.dropboxapi.com/2/files/download', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Dropbox-API-Arg': JSON.stringify({ path: `${CLOUD_ROOT}/${MASTER_CONFIG_FILENAME}` })
            }
        });
        
        const buffer = await response.arrayBuffer();
        data = await decompressData(buffer, handleLockedWithMeta);

    } else if (config.provider === 'webdav') {
        const client = getWebDAVClient(config);
        if (!(await client.exists(`${CLOUD_ROOT}/${MASTER_CONFIG_FILENAME}`))) {
            throw new Error("File konfigurasi akun tidak ditemukan di server WebDAV.");
        }
        const contents = await client.getFileContents(`${CLOUD_ROOT}/${MASTER_CONFIG_FILENAME}`);
        data = await decompressData(contents as any, handleLockedWithMeta);
    }

    if (data) {
        if (data.users) {
            const existingUsers = await db.users.toArray();
            const existingById = new Map(existingUsers.map((u) => [u.id, u]));
            const existingByUsername = new Map(existingUsers.map((u) => [String(u.username || '').toLowerCase(), u]));
            const normalizedUsers = (data.users as any[]).map((rawUser) => {
                const localMatch =
                    existingById.get(rawUser?.id) ||
                    existingByUsername.get(String(rawUser?.username || '').toLowerCase());
                const migrated = migrateUserPermissions(rawUser as any).user;
                return mergeSyncedUserCredentials(migrated, localMatch);
            });
            await db.users.clear();
            await db.users.bulkPut(normalizedUsers);
        }
        if (data.settings && data.settings.length > 0) {
            const localSettings = await db.settings.toArray();
            const cloudSettings = data.settings[0];
            
            if (localSettings.length > 0) {
                // Ensure we preserve the pairing info on the local spoke device
                const localPaired = localSettings[0]?.cloudSyncConfig?.firebasePairedTenantId || config.firebasePairedTenantId;
                const { id, ...rest } = cloudSettings;
                if (localPaired) {
                    rest.cloudSyncConfig = {
                        ...(rest.cloudSyncConfig || {}),
                        firebasePairedTenantId: localPaired,
                        provider: 'firebase'
                    };
                }
                if (rest.portalConfig || localSettings[0].portalConfig) {
                    rest.portalConfig = mergePortalConfig(rest.portalConfig, localSettings[0].portalConfig);
                }
                await db.settings.update(localSettings[0].id!, rest);
            } else {
                await db.settings.add(cloudSettings);
            }
        }
    }
    return true;
};

export const deleteInboxFile = async (config: CloudSyncConfig, path: string) => {
    if (config.provider === 'dropbox') {
        const token = await getValidDropboxToken(config);
        await fetchWithRetry('https://api.dropboxapi.com/2/files/delete_v2', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ path })
        });
    } else if (config.provider === 'webdav') {
        const client = getWebDAVClient(config);
        await client.deleteFile(path);
    }
};

export const deleteMultipleInboxFiles = async (config: CloudSyncConfig, paths: string[]) => {
    if (paths.length === 0) return;
    if (config.provider === 'dropbox') {
        const token = await getValidDropboxToken(config);
        const entries = paths.map(path => ({ path }));
        await fetchWithRetry('https://api.dropboxapi.com/2/files/delete_batch', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ entries })
        });
    } else if (config.provider === 'webdav') {
        const client = getWebDAVClient(config);
        for (const path of paths) {
            try {
                await client.deleteFile(path);
            } catch (e) {
                console.warn(`Failed to delete ${path}`, e);
            }
        }
    }
};
