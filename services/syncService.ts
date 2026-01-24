
import { CloudSyncConfig, SyncFileRecord } from '../types';
import { db } from '../db';
import { createClient, WebDAVClient } from 'webdav';

const MASTER_FILENAME = 'master_data.json';
const MASTER_CONFIG_FILENAME = 'master_config.json';
const CLOUD_ROOT = '/eSantri_Cloud';
const INBOX_FOLDER = `${CLOUD_ROOT}/inbox_staff`;

// --- WebDAV Helpers ---

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

// --- Dropbox Auth Helpers ---

export const getValidDropboxToken = async (config: CloudSyncConfig): Promise<string> => {
    if (!config.dropboxRefreshToken || !config.dropboxAppKey) {
        throw new Error("Dropbox belum dikonfigurasi sepenuhnya. Silakan cek menu Pengaturan > Sync Cloud.");
    }
    // Buffer 5 mins
    if (config.dropboxToken && config.dropboxTokenExpiresAt && Date.now() < config.dropboxTokenExpiresAt - 300000) {
        return config.dropboxToken;
    }
    // Refresh token
    const response = await fetch('https://api.dropboxapi.com/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: config.dropboxRefreshToken,
            client_id: config.dropboxAppKey,
        }),
    });
    if (!response.ok) throw new Error("Gagal refresh token Dropbox. Coba hubungkan ulang di Pengaturan.");
    const data = await response.json();
    return data.access_token;
};

export const exchangeCodeForToken = async (appKey: string, code: string, codeVerifier: string) => {
    const redirectUri = window.location.origin + window.location.pathname;
    const response = await fetch('https://api.dropboxapi.com/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            code,
            grant_type: 'authorization_code',
            client_id: appKey,
            code_verifier: codeVerifier,
            redirect_uri: redirectUri,
        }),
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
        const response = await fetch('https://api.dropboxapi.com/2/users/get_space_usage', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error("Gagal mengambil status penyimpanan Dropbox.");
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
                 // Some webdav servers report available as total-used, others report total. Assuming available means remaining.
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
     // This legacy function is specific to Dropbox logic for PSB Sync
     // If user uses WebDAV, this needs adapting or refactoring at component level
     // For now keeping as is, but could be extended if needed.
     // In CloudSyncConfig context, user can't select WebDAV for this specific function yet without changes in PsbRekap.tsx
     // But let's assume this function stays Dropbox-specific for now as requested.
    try {
        const response = await fetch('https://api.dropboxapi.com/2/files/list_folder', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ path: INBOX_FOLDER })
        });
        
        if (!response.ok) return [];
        const listData = await response.json();
        
        const files = listData.entries
            .filter((e: any) => e['.tag'] === 'file' && e.name.endsWith('.json'))
            .sort((a: any, b: any) => new Date(b.client_modified).getTime() - new Date(a.client_modified).getTime())
            .slice(0, 10);

        let allPendaftar: any[] = [];
        const seenIds = new Set();

        for (const file of files) {
             const dlResponse = await fetch('https://content.dropboxapi.com/2/files/download', {
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


// --- CORE SYNC LOGIC (Unified) ---

// 1. Staff: Upload Changes
export const uploadStaffChanges = async (config: CloudSyncConfig, username: string) => {
    // Gather Data
    const payload = {
        sender: username,
        timestamp: new Date().toISOString(),
        data: {
            santri: await db.santri.toArray(),
            tagihan: await db.tagihan.toArray(),
            pembayaran: await db.pembayaran.toArray(),
            saldoSantri: await db.saldoSantri.toArray(),
            transaksiSaldo: await db.transaksiSaldo.toArray(),
            transaksiKas: await db.transaksiKas.toArray(),
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
            arsipJadwal: await db.arsipJadwal.toArray() // NEW
        }
    };
    
    const filename = `${new Date().getTime()}_${username.replace(/\s+/g, '_')}.json`;
    const fullPath = `${INBOX_FOLDER}/${filename}`;

    if (config.provider === 'dropbox') {
        const token = await getValidDropboxToken(config);
        await fetch('https://content.dropboxapi.com/2/files/upload', {
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


// 2. Staff & Admin: Download Master Data
export const downloadAndMergeMaster = async (config: CloudSyncConfig) => {
    let masterData;

    if (config.provider === 'dropbox') {
        const token = await getValidDropboxToken(config);
        const response = await fetch('https://content.dropboxapi.com/2/files/download', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Dropbox-API-Arg': JSON.stringify({ path: `${CLOUD_ROOT}/${MASTER_FILENAME}` })
            }
        });

        if (!response.ok) {
            if (response.status === 409) return { status: 'no_master' };
            throw new Error('Gagal download Master Data dari Dropbox');
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
    
    const tablesToMerge = [
        'santri', 'tagihan', 'pembayaran', 'saldoSantri', 'transaksiSaldo', 'transaksiKas', 
        'suratTemplates', 'arsipSurat', 'pendaftar', 'raporRecords', 'absensi',
        'tahfizh', 'buku', 'sirkulasi', 'obat', 'kesehatanRecords', 'bkSessions', 'bukuTamu',
        'inventaris', 'calendarEvents', 'jadwalPelajaran', 'arsipJadwal' // NEW
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


// 3. Admin Only: List Inbox Files
export const listInboxFiles = async (config: CloudSyncConfig): Promise<SyncFileRecord[]> => {
    if (config.provider === 'dropbox') {
        const token = await getValidDropboxToken(config);
        const response = await fetch('https://api.dropboxapi.com/2/files/list_folder', {
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
        
        if (!response.ok) return []; 
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
                id: f.filename, // WebDAV usually uses path as ID
                name: f.basename,
                path_lower: f.filename,
                client_modified: f.lastmod,
                size: f.size,
                status: 'pending'
            }));
    }
    return [];
};

// 4. Admin Only: Fetch & Merge Specific File (Merge from Staff Inbox)
export const processInboxFile = async (config: CloudSyncConfig, file: SyncFileRecord) => {
    let fileContent;

    if (config.provider === 'dropbox') {
        const token = await getValidDropboxToken(config);
        const response = await fetch('https://content.dropboxapi.com/2/files/download', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Dropbox-API-Arg': JSON.stringify({ path: file.path_lower })
            }
        });
        if (!response.ok) throw new Error("Gagal download file staff");
        fileContent = await response.json();
    } else if (config.provider === 'webdav') {
        const client = getWebDAVClient(config);
        const contents = await client.getFileContents(file.path_lower, { format: "text" });
        fileContent = JSON.parse(contents as string);
    } else {
        throw new Error("Provider tidak valid");
    }
    
    const data = fileContent.data;

    let recordCount = 0;
    const tablesToMerge = [
        'santri', 'tagihan', 'pembayaran', 'saldoSantri', 'transaksiSaldo', 'transaksiKas', 
        'suratTemplates', 'arsipSurat', 'pendaftar', 'auditLogs', 'users', 'raporRecords', 'absensi',
        'tahfizh', 'buku', 'sirkulasi', 'obat', 'kesehatanRecords', 'bkSessions', 'bukuTamu',
        'inventaris', 'calendarEvents', 'jadwalPelajaran', 'arsipJadwal' // NEW
    ];

    await (db as any).transaction('rw', tablesToMerge.map(t => (db as any)[t]), async () => {
        const merge = async (table: string, items: any[]) => {
            if (!items || items.length === 0) return;
            const tbl = (db as any)[table];
            await tbl.bulkPut(items); 
            recordCount += items.length;
        };
        
        for (const tableName of tablesToMerge) {
            if (tableName === 'users' && data.users) {
                const staffUpdates = data.users.filter((u: any) => !u.isDefaultAdmin);
                await merge('users', staffUpdates);
            } else {
                await merge(tableName, data[tableName]);
            }
        }
    });

    return { success: true, recordCount };
};


// 5. Admin Only: Publish Master
export const publishMasterData = async (config: CloudSyncConfig) => {
    // 1. Data Master
    const masterData = {
        timestamp: new Date().toISOString(),
        santri: await db.santri.toArray(),
        tagihan: await db.tagihan.toArray(),
        pembayaran: await db.pembayaran.toArray(),
        saldoSantri: await db.saldoSantri.toArray(),
        transaksiSaldo: await db.transaksiSaldo.toArray(),
        transaksiKas: await db.transaksiKas.toArray(),
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
        arsipJadwal: await db.arsipJadwal.toArray() // NEW
    };

    // 2. Config Master
    const masterConfig = {
        timestamp: new Date().toISOString(),
        users: await db.users.toArray(),
        settings: await db.settings.toArray()
    };

    if (config.provider === 'dropbox') {
        const token = await getValidDropboxToken(config);
        // Upload Data
        await fetch('https://content.dropboxapi.com/2/files/upload', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Dropbox-API-Arg': JSON.stringify({ path: `${CLOUD_ROOT}/${MASTER_FILENAME}`, mode: 'overwrite', mute: true }),
                'Content-Type': 'application/octet-stream'
            },
            body: JSON.stringify(masterData)
        });
        // Upload Config
        await fetch('https://content.dropboxapi.com/2/files/upload', {
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

// 6. User Login Helper: Update Account from Cloud
export const updateAccountFromCloud = async (config: CloudSyncConfig) => {
    let data;
    if (config.provider === 'dropbox') {
        const token = await getValidDropboxToken(config);
        const response = await fetch('https://content.dropboxapi.com/2/files/download', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Dropbox-API-Arg': JSON.stringify({ path: `${CLOUD_ROOT}/${MASTER_CONFIG_FILENAME}` })
            }
        });
        if (!response.ok) throw new Error("Gagal mengambil data akun dari cloud.");
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

// 7. Delete File from Inbox (Single)
export const deleteInboxFile = async (config: CloudSyncConfig, path: string) => {
    if (config.provider === 'dropbox') {
        const token = await getValidDropboxToken(config);
        await fetch('https://api.dropboxapi.com/2/files/delete_v2', {
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

// 8. Bulk Delete (Batch)
export const deleteMultipleInboxFiles = async (config: CloudSyncConfig, paths: string[]) => {
    if (paths.length === 0) return;
    
    if (config.provider === 'dropbox') {
        const token = await getValidDropboxToken(config);
        const entries = paths.map(path => ({ path }));
        const launchResponse = await fetch('https://api.dropboxapi.com/2/files/delete_batch', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ entries })
        });
        if (!launchResponse.ok) {
            throw new Error("Gagal memulai proses hapus massal.");
        }
    } else if (config.provider === 'webdav') {
        // WebDAV typically doesn't support batch delete in one command, iterate
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
