
import { CloudSyncConfig, SyncFileRecord } from '../types';
import { db } from '../db';

const MASTER_FILENAME = 'master_data.json';
const MASTER_CONFIG_FILENAME = 'master_config.json';
const CLOUD_ROOT = '/eSantri_Cloud';
const INBOX_FOLDER = `${CLOUD_ROOT}/inbox_staff`;

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
    if (config.provider !== 'dropbox') return null;
    // Removed try-catch to let errors propagate to UI
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
};

export const fetchPsbFromDropbox = async (token: string): Promise<any[]> => {
    // Legacy PSB folder logic, can remain or be updated to new structure if needed. Keeping as is for now.
    return []; 
};


// --- CORE SYNC LOGIC ---

// 1. Staff: Upload Changes (Differential Sync)
// Uploads ALL local data but labeled as a staff update file. 
// Ideally we'd filter only changed data, but for simplicity & robustness in file-based sync, 
// sending full snapshot of Staff's active data is safer to ensure Admin gets everything.
// To avoid huge files, we can split Config vs Data.
export const uploadStaffChanges = async (config: CloudSyncConfig, username: string) => {
    if (config.provider !== 'dropbox') throw new Error("Provider harus Dropbox");
    const token = await getValidDropboxToken(config);
    
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
        }
    };
    
    // Construct filename: timestamp_username.json
    const filename = `${new Date().getTime()}_${username.replace(/\s+/g, '_')}.json`;
    const path = `${INBOX_FOLDER}/${filename}`;

    await fetch('https://content.dropboxapi.com/2/files/upload', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Dropbox-API-Arg': JSON.stringify({
                path,
                mode: 'add',
                autorename: true,
                mute: true
            }),
            'Content-Type': 'application/octet-stream'
        },
        body: JSON.stringify(payload)
    });
    
    return { filename, timestamp: payload.timestamp };
};


// 2. Staff & Admin: Download Master Data
// Smart Merge Logic: If Local LastModified > Master LastModified, keep Local.
export const downloadAndMergeMaster = async (config: CloudSyncConfig) => {
    if (config.provider !== 'dropbox') throw new Error("Provider harus Dropbox");
    const token = await getValidDropboxToken(config);

    // Download Master Data
    const response = await fetch('https://content.dropboxapi.com/2/files/download', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Dropbox-API-Arg': JSON.stringify({ path: `${CLOUD_ROOT}/${MASTER_FILENAME}` })
        }
    });

    if (!response.ok) {
        // If 409 (path not found), it means no master exists yet. Not an error for first run.
        if (response.status === 409) return { status: 'no_master' };
        throw new Error('Gagal download Master Data');
    }

    const masterData = await response.json();
    
    // SMART MERGE LOGIC
    await (db as any).transaction('rw', db.santri, db.tagihan, db.pembayaran, db.saldoSantri, db.transaksiSaldo, db.transaksiKas, db.suratTemplates, db.arsipSurat, db.pendaftar, async () => {
        
        const mergeTable = async (tableName: string, masterItems: any[]) => {
            const table = (db as any)[tableName];
            const localItems = await table.toArray();
            const localMap = new Map(localItems.map((i: any) => [i.id, i]));
            
            const itemsToPut: any[] = [];
            
            for (const mItem of masterItems) {
                const lItem = localMap.get(mItem.id) as any;
                // Rule: If Local exists and is NEWER than Master, KEEP Local.
                // Else (Local older, or doesn't exist), overwrite with Master.
                if (lItem) {
                    const lTime = lItem.lastModified || 0;
                    const mTime = mItem.lastModified || 0;
                    if (mTime >= lTime) {
                        itemsToPut.push(mItem);
                    }
                    // If lTime > mTime, we do NOTHING (keep local). It will be pushed in next staff upload.
                } else {
                    // New item from Master
                    itemsToPut.push(mItem);
                }
            }
            
            if (itemsToPut.length > 0) {
                await table.bulkPut(itemsToPut);
            }
        };

        if(masterData.santri) await mergeTable('santri', masterData.santri);
        if(masterData.tagihan) await mergeTable('tagihan', masterData.tagihan);
        if(masterData.pembayaran) await mergeTable('pembayaran', masterData.pembayaran);
        if(masterData.saldoSantri) await mergeTable('saldoSantri', masterData.saldoSantri);
        if(masterData.transaksiSaldo) await mergeTable('transaksiSaldo', masterData.transaksiSaldo);
        if(masterData.transaksiKas) await mergeTable('transaksiKas', masterData.transaksiKas);
        if(masterData.suratTemplates) await mergeTable('suratTemplates', masterData.suratTemplates);
        if(masterData.arsipSurat) await mergeTable('arsipSurat', masterData.arsipSurat);
        if(masterData.pendaftar) await mergeTable('pendaftar', masterData.pendaftar);
    });

    return { status: 'merged', timestamp: masterData.timestamp };
};


// 3. Admin Only: List Inbox Files
export const listInboxFiles = async (config: CloudSyncConfig): Promise<SyncFileRecord[]> => {
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
    
    if (!response.ok) return []; // Folder might not exist
    
    const data = await response.json();
    // Filter JSON files only
    return data.entries.filter((e: any) => e['.tag'] === 'file' && e.name.endsWith('.json')).map((e: any) => ({
        id: e.id,
        name: e.name,
        path_lower: e.path_lower,
        client_modified: e.client_modified,
        size: e.size,
        status: 'pending' // Default, will be checked against DB
    }));
};

// 4. Admin Only: Fetch & Merge Specific File
export const processInboxFile = async (config: CloudSyncConfig, file: SyncFileRecord) => {
    const token = await getValidDropboxToken(config);
    
    // Download
    const response = await fetch('https://content.dropboxapi.com/2/files/download', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Dropbox-API-Arg': JSON.stringify({ path: file.path_lower })
        }
    });
    
    if (!response.ok) throw new Error("Gagal download file staff");
    
    const fileContent = await response.json();
    const data = fileContent.data;

    // Merge to Admin DB (Admin is TRUTH, but we accept incoming data as updates)
    // For Admin merging Staff data: We generally Upsert everything from Staff 
    // because Staff is the source of truth for their specific entries.
    // However, to be safe, we can use the same Smart Merge logic if Admin also edits same records.
    let recordCount = 0;

    await (db as any).transaction('rw', db.santri, db.tagihan, db.pembayaran, db.saldoSantri, db.transaksiSaldo, db.transaksiKas, db.suratTemplates, db.arsipSurat, db.pendaftar, db.auditLogs, async () => {
        const merge = async (table: string, items: any[]) => {
            if (!items || items.length === 0) return;
            const tbl = (db as any)[table];
            await tbl.bulkPut(items); // Admin blindly accepts Staff data for now (Simple Aggregator)
            recordCount += items.length;
        };
        
        await merge('santri', data.santri);
        await merge('tagihan', data.tagihan);
        await merge('pembayaran', data.pembayaran);
        await merge('saldoSantri', data.saldoSantri);
        await merge('transaksiSaldo', data.transaksiSaldo);
        await merge('transaksiKas', data.transaksiKas);
        await merge('suratTemplates', data.suratTemplates);
        await merge('arsipSurat', data.arsipSurat);
        await merge('pendaftar', data.pendaftar);
        
        // Merge Audit Logs
        if (data.auditLogs) {
            await db.auditLogs.bulkPut(data.auditLogs);
        }
    });

    return { success: true, recordCount };
};


// 5. Admin Only: Publish Master
export const publishMasterData = async (config: CloudSyncConfig) => {
    if (config.provider !== 'dropbox') throw new Error("Provider harus Dropbox");
    const token = await getValidDropboxToken(config);

    // 1. Data Master (Transactional Data)
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
    };

    // 2. Config Master (Users & Settings) - Separate file for security/login flow
    const masterConfig = {
        timestamp: new Date().toISOString(),
        users: await db.users.toArray(), // For password reset
        settings: await db.settings.toArray()
    };

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
    
    return { timestamp: masterData.timestamp };
};

// 6. User Login Helper: Update Account from Cloud
export const updateAccountFromCloud = async (config: CloudSyncConfig) => {
    // This connects without user login, uses stored token.
    // WARNING: Security risk if token is compromised, but acceptable for this specific offline-first requirement.
    const token = await getValidDropboxToken(config);
    
    const response = await fetch('https://content.dropboxapi.com/2/files/download', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Dropbox-API-Arg': JSON.stringify({ path: `${CLOUD_ROOT}/${MASTER_CONFIG_FILENAME}` })
        }
    });

    if (!response.ok) throw new Error("Gagal mengambil data akun dari cloud.");
    const data = await response.json();
    
    if (data.users) {
        await db.users.clear();
        await db.users.bulkPut(data.users);
    }
    return true;
};
