
import { CloudSyncConfig, SyncFileRecord, ConflictItem } from '../types';
import { db } from '../db';
import { createClient, WebDAVClient } from 'webdav';

const MASTER_FILENAME = 'master_data.json';
const MASTER_CONFIG_FILENAME = 'master_config.json';
const CLOUD_ROOT = '/eSantri_Cloud';
const INBOX_FOLDER = `${CLOUD_ROOT}/inbox_staff`;

// --- HELPER: RETRY FETCH & VALIDATION ---

const fetchWithRetry = async (url: string, options: RequestInit, retries: number = 3, backoff: number = 500): Promise<Response> => {
    try {
        const response = await fetch(url, options);
        if (response.ok) return response;
        // Don't retry for 4xx client errors (except 429 too many requests)
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
            throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
        }
        throw new Error(`Server Error ${response.status}`);
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

// ... WebDAV & Dropbox Helpers (unchanged) ...
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
    if (!config.dropboxRefreshToken || !config.dropboxAppKey) {
        throw new Error("Dropbox belum dikonfigurasi sepenuhnya. Silakan cek menu Pengaturan > Sync Cloud.");
    }
    if (config.dropboxToken && config.dropboxTokenExpiresAt && Date.now() < config.dropboxTokenExpiresAt - 300000) {
        return config.dropboxToken;
    }
    
    const params: Record<string, string> = {
        grant_type: 'refresh_token',
        refresh_token: config.dropboxRefreshToken,
        client_id: config.dropboxAppKey,
    };
    
    // Add Client Secret if available (Confidential Client flow)
    if (config.dropboxAppSecret) {
        params.client_secret = config.dropboxAppSecret;
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
export const exchangeCodeForToken = async (appKey: string, appSecret: string, code: string) => {
    const params = new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        client_id: appKey,
        client_secret: appSecret
    });

    const response = await fetch('https://api.dropboxapi.com/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params,
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

        for (const file of files) {
             const dlResponse = await fetchWithRetry('https://content.dropboxapi.com/2/files/download', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Dropbox-API-Arg': JSON.stringify({ path: file.path_lower })
                }
            });
            if (dlResponse.ok) {
                const json = await dlResponse.json();
                if (json.data && Array.isArray(json.data.pendaftar)) {
                    json.data.pendaftar.forEach((p: any) => {
                         const key = p.namaLengkap + (p.nomorHpWali || '');
                         if (!seenIds.has(key)) {
                             allPendaftar.push(p);
                             seenIds.add(key);
                         }
                    });
                }
            }
        }
        
        return allPendaftar;
    } catch (error) {
        console.error("Error fetching PSB from Cloud:", error);
        throw new Error("Gagal mengambil data dari Dropbox. Cek koneksi internet.");
    }
};

// ... uploadStaffChanges ...
export const uploadStaffChanges = async (config: CloudSyncConfig, username: string) => {
    const payload = {
        sender: username,
        timestamp: new Date().toISOString(),
        data: {
            santri: await db.santri.toArray(),
            settings: await db.settings.toArray(),
            tagihan: await db.tagihan.toArray(),
            pembayaran: await db.pembayaran.toArray(),
            saldoSantri: await db.saldoSantri.toArray(),
            transaksiSaldo: await db.transaksiSaldo.toArray(),
            transaksiKas: await db.transaksiKas.toArray(),
            chartOfAccounts: await db.chartOfAccounts.toArray(), // NEW
            payrollRecords: await db.payrollRecords.toArray(),
            produkKoperasi: await db.produkKoperasi.toArray(),
            transaksiKoperasi: await db.transaksiKoperasi.toArray(),
            riwayatStok: await db.riwayatStok.toArray(),
            keuanganKoperasi: await db.keuanganKoperasi.toArray(),
            suratTemplates: await db.suratTemplates.toArray(),
            arsipSurat: await db.arsipSurat.toArray(),
            pendaftar: await db.pendaftar.toArray(),
            auditLogs: await db.auditLogs.toArray(),
            users: await db.users.toArray(), 
            raporRecords: await db.raporRecords.toArray(),
            absensi: await db.absensi.toArray(),
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
            piketSchedules: await db.piketSchedules.toArray()
        }
    };
    
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
            body: JSON.stringify(payload)
        });
    } else if (config.provider === 'webdav') {
        const client = getWebDAVClient(config);
        await ensureWebDAVFolders(client);
        await client.putFileContents(fullPath, JSON.stringify(payload));
    } else {
        throw new Error("Provider tidak valid");
    }
    
    return { filename, timestamp: payload.timestamp };
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
        masterData = await response.json();

    } else if (config.provider === 'webdav') {
        const client = getWebDAVClient(config);
        if (!(await client.exists(`${CLOUD_ROOT}/${MASTER_FILENAME}`))) {
             return { status: 'no_master' };
        }
        const contents = await client.getFileContents(`${CLOUD_ROOT}/${MASTER_FILENAME}`, { format: "text" });
        masterData = JSON.parse(contents as string);
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
        'suratTemplates', 'arsipSurat', 'pendaftar', 'raporRecords', 'absensi',
        'tahfizh', 'buku', 'sirkulasi', 'obat', 'kesehatanRecords', 'bkSessions', 'bukuTamu',
        'inventaris', 'calendarEvents', 'jadwalPelajaran', 'arsipJadwal', 'piketSchedules'
    ];

    await (db as any).transaction('rw', tablesToMerge.map(t => (db as any)[t]), async () => {
        const mergeTable = async (tableName: string, masterItems: any[]) => {
            if (!masterItems) return; 
            const table = (db as any)[tableName];
            const localItems = await table.toArray();
            const localMap = new Map(localItems.map((i: any) => [i.id, i]));
            
            const itemsToPut: any[] = [];
            
            for (const mItem of masterItems) {
                const lItem = localMap.get(mItem.id) as any;
                if (lItem) {
                    const lTime = lItem.lastModified || 0;
                    const mTime = mItem.lastModified || 0;
                    if (mTime >= lTime) {
                        itemsToPut.push(mItem);
                    }
                } else {
                    itemsToPut.push(mItem);
                }
            }
            
            if (itemsToPut.length > 0) {
                await table.bulkPut(itemsToPut);
            }
        };

        for (const tableName of tablesToMerge) {
            await mergeTable(tableName, masterData[tableName]);
        }
    });

    return { status: 'merged', timestamp: masterData.timestamp };
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

// ... processInboxFile (updated for validation) ...
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
        fileContent = await response.json();
    } else if (config.provider === 'webdav') {
        const client = getWebDAVClient(config);
        const contents = await client.getFileContents(file.path_lower, { format: "text" });
        fileContent = JSON.parse(contents as string);
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
        'suratTemplates', 'arsipSurat', 'pendaftar', 'auditLogs', 'users', 'raporRecords', 'absensi',
        'tahfizh', 'buku', 'sirkulasi', 'obat', 'kesehatanRecords', 'bkSessions', 'bukuTamu',
        'inventaris', 'calendarEvents', 'jadwalPelajaran', 'arsipJadwal', 'piketSchedules'
    ];

    if (resolvedConflicts) {
        resolvedConflicts.forEach(rc => {
            if (rc.resolved) {
                const targetList = data[rc.tableName];
                if (targetList) {
                    const idx = targetList.findIndex((item: any) => item.id === rc.recordId);
                    if (idx >= 0) {
                        targetList[idx] = rc.localData;
                    }
                }
            }
        });
    }

    let recordCount = 0;

    await (db as any).transaction('rw', tablesToMerge.map(t => (db as any)[t]), async () => {
        const checkAndMerge = async (tableName: string, incomingItems: any[]) => {
            if (!incomingItems || incomingItems.length === 0) return;
            const table = (db as any)[tableName];
            const localItems = await table.toArray();
            const localMap = new Map(localItems.map((i: any) => [i.id, i]));
            
            const itemsToPut: any[] = [];
            
            for (const incItem of incomingItems) {
                const locItem = localMap.get(incItem.id) as any;
                
                if (locItem) {
                    const incTime = incItem.lastModified || 0;
                    const locTime = locItem.lastModified || 0;
                    
                    const { lastModified: t1, ...contentInc } = incItem;
                    const { lastModified: t2, ...contentLoc } = locItem;
                    const isDiff = JSON.stringify(contentInc) !== JSON.stringify(contentLoc);

                    if (isDiff) {
                        if (incTime > locTime) {
                            itemsToPut.push(incItem);
                        } else {
                             const alreadyResolved = resolvedConflicts?.find(r => r.tableName === tableName && r.recordId === incItem.id);
                             if (!alreadyResolved) {
                                 conflicts.push({
                                     id: `${tableName}-${incItem.id}`,
                                     tableName,
                                     recordId: incItem.id,
                                     localData: locItem,
                                     cloudData: incItem,
                                     resolved: false
                                 });
                             } else {
                                 itemsToPut.push(incItem); 
                             }
                        }
                    }
                } else {
                    itemsToPut.push(incItem);
                }
            }
            
            if (conflicts.length === 0 && itemsToPut.length > 0) {
                 await table.bulkPut(itemsToPut);
                 recordCount += itemsToPut.length;
            }
        };
        
        for (const tableName of tablesToMerge) {
            if (conflicts.length > 0 && !resolvedConflicts) break; 
            
            if (tableName === 'users' && data.users) {
                const staffUpdates = data.users.filter((u: any) => !u.isDefaultAdmin);
                await checkAndMerge('users', staffUpdates);
            } else {
                await checkAndMerge(tableName, data[tableName]);
            }
        }
    });

    if (conflicts.length > 0) {
        return { success: false, conflicts, recordCount: 0 };
    }

    return { success: true, recordCount };
};

// ... publishMasterData, updateAccountFromCloud, deleteInboxFile, deleteMultipleInboxFiles (unchanged logic but use fetchWithRetry) ...
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
        raporRecords: await db.raporRecords.toArray(),
        absensi: await db.absensi.toArray(),
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
        piketSchedules: await db.piketSchedules.toArray()
    };

    const masterConfig = {
        timestamp: new Date().toISOString(),
        users: await db.users.toArray(),
        settings: await db.settings.toArray()
    };

    if (config.provider === 'dropbox') {
        const token = await getValidDropboxToken(config);
        await fetchWithRetry('https://content.dropboxapi.com/2/files/upload', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Dropbox-API-Arg': JSON.stringify({ path: `${CLOUD_ROOT}/${MASTER_FILENAME}`, mode: 'overwrite', mute: true }),
                'Content-Type': 'application/octet-stream'
            },
            body: JSON.stringify(masterData)
        });
        await fetchWithRetry('https://content.dropboxapi.com/2/files/upload', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Dropbox-API-Arg': JSON.stringify({ path: `${CLOUD_ROOT}/${MASTER_CONFIG_FILENAME}`, mode: 'overwrite', mute: true }),
                'Content-Type': 'application/octet-stream'
            },
            body: JSON.stringify(masterConfig)
        });
    } else if (config.provider === 'webdav') {
        const client = getWebDAVClient(config);
        await ensureWebDAVFolders(client);
        await client.putFileContents(`${CLOUD_ROOT}/${MASTER_FILENAME}`, JSON.stringify(masterData));
        await client.putFileContents(`${CLOUD_ROOT}/${MASTER_CONFIG_FILENAME}`, JSON.stringify(masterConfig));
    }
    
    return { timestamp: masterData.timestamp };
};

export const updateAccountFromCloud = async (config: CloudSyncConfig) => {
    let data;
    if (config.provider === 'dropbox') {
        const token = await getValidDropboxToken(config);
        const response = await fetchWithRetry('https://content.dropboxapi.com/2/files/download', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Dropbox-API-Arg': JSON.stringify({ path: `${CLOUD_ROOT}/${MASTER_CONFIG_FILENAME}` })
            }
        });
        data = await response.json();
    } else if (config.provider === 'webdav') {
        const client = getWebDAVClient(config);
        if (!(await client.exists(`${CLOUD_ROOT}/${MASTER_CONFIG_FILENAME}`))) {
            throw new Error("File konfigurasi akun tidak ditemukan di server WebDAV.");
        }
        const contents = await client.getFileContents(`${CLOUD_ROOT}/${MASTER_CONFIG_FILENAME}`, { format: "text" });
        data = JSON.parse(contents as string);
    }

    if (data && data.users) {
        await db.users.clear();
        await db.users.bulkPut(data.users);
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
