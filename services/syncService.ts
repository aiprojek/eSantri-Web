
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
    try {
        // 1. List files in Inbox
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
        
        // 2. Get latest 10 files (Optimization to prevent heavy load)
        const files = listData.entries
            .filter((e: any) => e['.tag'] === 'file' && e.name.endsWith('.json'))
            .sort((a: any, b: any) => new Date(b.client_modified).getTime() - new Date(a.client_modified).getTime())
            .slice(0, 10);

        let allPendaftar: any[] = [];
        const seenIds = new Set();

        // 3. Download & Extract
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
                    // Avoid duplicates locally within this fetch session
                    json.data.pendaftar.forEach((p: any) => {
                         // We use name + phone as vague unique key if ID isn't reliable across devices
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


// --- CORE SYNC LOGIC ---

// 1. Staff: Upload Changes (Differential Sync)
// Uploads ALL local data but labeled as a staff update file. 
export const uploadStaffChanges = async (config: CloudSyncConfig, username: string) => {
    if (config.provider !== 'dropbox') throw new Error("Provider harus Dropbox");
    const token = await getValidDropboxToken(config);
    
    // Gather Data (UPDATED to include ALL new modules)
    const payload = {
        sender: username,
        timestamp: new Date().toISOString(),
        data: {
            // Core
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
            
            // New Modules (Complete)
            tahfizh: await db.tahfizh.toArray(),
            buku: await db.buku.toArray(),
            sirkulasi: await db.sirkulasi.toArray(),
            obat: await db.obat.toArray(),
            kesehatanRecords: await db.kesehatanRecords.toArray(),
            bkSessions: await db.bkSessions.toArray(),
            bukuTamu: await db.bukuTamu.toArray(), // New Feature
            
            // Other settings (ADDED)
            inventaris: await db.inventaris.toArray(),
            calendarEvents: await db.calendarEvents.toArray()
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
    
    // SMART MERGE LOGIC (UPDATED with new tables)
    const tablesToMerge = [
        'santri', 'tagihan', 'pembayaran', 'saldoSantri', 'transaksiSaldo', 'transaksiKas', 
        'suratTemplates', 'arsipSurat', 'pendaftar', 'raporRecords', 'absensi',
        'tahfizh', 'buku', 'sirkulasi', 'obat', 'kesehatanRecords', 'bkSessions', 'bukuTamu',
        'inventaris', 'calendarEvents' // ADDED
    ];

    await (db as any).transaction('rw', tablesToMerge.map(t => (db as any)[t]), async () => {
        
        const mergeTable = async (tableName: string, masterItems: any[]) => {
            if (!masterItems) return; // Skip if master doesn't have this table yet
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
};

// 4. Admin Only: Fetch & Merge Specific File (Merge from Staff Inbox)
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
    let recordCount = 0;

    const tablesToMerge = [
        'santri', 'tagihan', 'pembayaran', 'saldoSantri', 'transaksiSaldo', 'transaksiKas', 
        'suratTemplates', 'arsipSurat', 'pendaftar', 'auditLogs', 'users', 'raporRecords', 'absensi',
        'tahfizh', 'buku', 'sirkulasi', 'obat', 'kesehatanRecords', 'bkSessions', 'bukuTamu',
        'inventaris', 'calendarEvents' // ADDED
    ];

    await (db as any).transaction('rw', tablesToMerge.map(t => (db as any)[t]), async () => {
        const merge = async (table: string, items: any[]) => {
            if (!items || items.length === 0) return;
            const tbl = (db as any)[table];
            await tbl.bulkPut(items); 
            recordCount += items.length;
        };
        
        for (const tableName of tablesToMerge) {
            // Special handling for users (don't overwrite default admin)
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
    if (config.provider !== 'dropbox') throw new Error("Provider harus Dropbox");
    const token = await getValidDropboxToken(config);

    // 1. Data Master (Transactional Data)
    const masterData = {
        timestamp: new Date().toISOString(),
        // Core
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
        
        // New Modules (Complete)
        tahfizh: await db.tahfizh.toArray(),
        buku: await db.buku.toArray(),
        sirkulasi: await db.sirkulasi.toArray(),
        obat: await db.obat.toArray(),
        kesehatanRecords: await db.kesehatanRecords.toArray(),
        bkSessions: await db.bkSessions.toArray(),
        bukuTamu: await db.bukuTamu.toArray(), // New Feature
        
        // Other (ADDED)
        inventaris: await db.inventaris.toArray(),
        calendarEvents: await db.calendarEvents.toArray()
    };

    // 2. Config Master (Users & Settings)
    const masterConfig = {
        timestamp: new Date().toISOString(),
        users: await db.users.toArray(), // For password reset syncing
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

// 7. Delete File from Inbox (Single)
export const deleteInboxFile = async (config: CloudSyncConfig, path: string) => {
    const token = await getValidDropboxToken(config);
    await fetch('https://api.dropboxapi.com/2/files/delete_v2', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ path })
    });
};

// 8. Bulk Delete (Batch)
export const deleteMultipleInboxFiles = async (config: CloudSyncConfig, paths: string[]) => {
    if (paths.length === 0) return;
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
};
