
import { createClient, WebDAVClient } from 'webdav';
import { CloudSyncConfig } from '../types';

// --- WebDAV Implementation ---
const getWebDAVClient = (config: CloudSyncConfig): WebDAVClient => {
    if (!config.webdavUrl || !config.webdavUsername || !config.webdavPassword) {
        throw new Error("Konfigurasi WebDAV tidak lengkap");
    }
    return createClient(config.webdavUrl, {
        username: config.webdavUsername,
        password: config.webdavPassword
    });
};

const uploadToWebDAV = async (config: CloudSyncConfig, data: any, filename: string) => {
    const client = getWebDAVClient(config);
    const fileContent = JSON.stringify(data);
    await client.putFileContents(`/${filename}`, fileContent, { overwrite: true });
};

const downloadFromWebDAV = async (config: CloudSyncConfig, filename: string) => {
    const client = getWebDAVClient(config);
    const fileContent = await client.getFileContents(`/${filename}`, { format: "text" });
    return JSON.parse(fileContent as string);
};

// --- Dropbox Auth & Helper ---
export const exchangeCodeForToken = async (appKey: string, code: string, codeVerifier: string) => {
    const redirectUri = window.location.origin + window.location.pathname;
    const response = await fetch('https://api.dropboxapi.com/oauth2/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
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

export const getValidDropboxToken = async (config: CloudSyncConfig): Promise<string> => {
    if (!config.dropboxRefreshToken || !config.dropboxAppKey) {
        throw new Error("Dropbox belum dikonfigurasi.");
    }

    // If we have a token and it's not expired (buffer 5 mins)
    if (config.dropboxToken && config.dropboxTokenExpiresAt && Date.now() < config.dropboxTokenExpiresAt - 300000) {
        return config.dropboxToken;
    }

    // Refresh token
    const response = await fetch('https://api.dropboxapi.com/oauth2/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: config.dropboxRefreshToken,
            client_id: config.dropboxAppKey,
        }),
    });

    if (!response.ok) {
        throw new Error("Gagal refresh token Dropbox.");
    }

    const data = await response.json();
    return data.access_token;
};

// --- Storage Stats Implementation ---
export const getCloudStorageStats = async (config: CloudSyncConfig) => {
    if (config.provider === 'dropbox') {
        const token = await getValidDropboxToken(config);
        const response = await fetch('https://api.dropboxapi.com/2/users/get_space_usage', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
            }
        });
        
        if (!response.ok) throw new Error('Gagal mengambil data kuota Dropbox');
        
        const data = await response.json();
        const used = data.used || 0;
        const total = data.allocation?.allocated || 0;
        
        return {
            used,
            total,
            percent: total > 0 ? (used / total) * 100 : 0
        };

    } else if (config.provider === 'webdav') {
        const client = getWebDAVClient(config);
        try {
            const quota = await client.getQuota() as any;
            if (quota) {
                const used = parseInt(String(quota.used), 10) || 0;
                const available = parseInt(String(quota.available), 10) || 0;
                const total = used + available;
                
                if (total > 0) {
                    return {
                        used,
                        total,
                        percent: (used / total) * 100
                    };
                }
                return { used, total: 0, percent: 0 };
            }
        } catch (e) {
            console.warn("WebDAV Quota not supported by server", e);
            return null;
        }
    }
    return null;
};

// --- PSB Sync Implementation ---
export const fetchPsbFromDropbox = async (token: string): Promise<any[]> => {
    // List files in /esantri_psb
    const listResponse = await fetch('https://api.dropboxapi.com/2/files/list_folder', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            path: '/esantri_psb',
            recursive: false,
            include_media_info: false
        })
    });

    if (!listResponse.ok) {
        // Folder might not exist yet
        return [];
    }

    const listData = await listResponse.json();
    const newItems = [];

    for (const entry of listData.entries) {
        if (entry['.tag'] === 'file' && entry.name.endsWith('.json')) {
            const downloadResponse = await fetch('https://content.dropboxapi.com/2/files/download', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Dropbox-API-Arg': JSON.stringify({ path: entry.path_lower })
                }
            });
            
            if (downloadResponse.ok) {
                const item = await downloadResponse.json();
                newItems.push(item);
                // Move to processed
                await fetch('https://api.dropboxapi.com/2/files/move_v2', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        from_path: entry.path_lower,
                        to_path: `/esantri_psb/processed/${entry.name}`,
                        autorename: true
                    })
                });
            }
        }
    }
    return newItems;
};

// --- Main Sync Function ---
export const performSync = async (
    config: CloudSyncConfig, 
    direction: 'up' | 'down',
    filename: string = 'esantri_sync.json'
) => {
    if (config.provider === 'dropbox') {
        const token = await getValidDropboxToken(config);
        
        if (direction === 'up') {
            
            // To properly implement this, we need db import.
            const { db } = await import('../db');
            const data = {
                settings: await db.settings.toArray(),
                santri: await db.santri.toArray(),
                tagihan: await db.tagihan.toArray(),
                pembayaran: await db.pembayaran.toArray(),
                saldoSantri: await db.saldoSantri.toArray(),
                transaksiSaldo: await db.transaksiSaldo.toArray(),
                transaksiKas: await db.transaksiKas.toArray(),
                suratTemplates: await db.suratTemplates.toArray(),
                arsipSurat: await db.arsipSurat.toArray(),
                version: '1.2',
                timestamp: new Date().toISOString(),
            };

            const response = await fetch('https://content.dropboxapi.com/2/files/upload', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Dropbox-API-Arg': JSON.stringify({
                        path: `/${filename}`,
                        mode: 'overwrite',
                        autorename: false,
                        mute: false,
                        strict_conflict: false
                    }),
                    'Content-Type': 'application/octet-stream'
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) throw new Error('Gagal upload ke Dropbox');
            return new Date().toISOString();

        } else {
            // Down
            const response = await fetch('https://content.dropboxapi.com/2/files/download', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Dropbox-API-Arg': JSON.stringify({ path: `/${filename}` })
                }
            });

            if (!response.ok) throw new Error('Gagal download dari Dropbox');
            
            const data = await response.json();
            const { db } = await import('../db');
            
            await (db as any).transaction('rw', db.settings, db.santri, db.tagihan, db.pembayaran, db.saldoSantri, db.transaksiSaldo, db.transaksiKas, db.suratTemplates, db.arsipSurat, async () => {
                await db.settings.clear(); await db.settings.bulkPut(data.settings);
                await db.santri.clear(); await db.santri.bulkPut(data.santri);
                await db.tagihan.clear(); await db.tagihan.bulkPut(data.tagihan);
                await db.pembayaran.clear(); await db.pembayaran.bulkPut(data.pembayaran);
                await db.saldoSantri.clear(); await db.saldoSantri.bulkPut(data.saldoSantri);
                await db.transaksiSaldo.clear(); await db.transaksiSaldo.bulkPut(data.transaksiSaldo);
                await db.transaksiKas.clear(); await db.transaksiKas.bulkPut(data.transaksiKas);
                await db.suratTemplates.clear(); await db.suratTemplates.bulkPut(data.suratTemplates);
                await db.arsipSurat.clear(); await db.arsipSurat.bulkPut(data.arsipSurat);
            });
            return data.timestamp;
        }

    } else if (config.provider === 'webdav') {
        if (direction === 'up') {
            const { db } = await import('../db');
            const data = {
                settings: await db.settings.toArray(),
                santri: await db.santri.toArray(),
                tagihan: await db.tagihan.toArray(),
                pembayaran: await db.pembayaran.toArray(),
                saldoSantri: await db.saldoSantri.toArray(),
                transaksiSaldo: await db.transaksiSaldo.toArray(),
                transaksiKas: await db.transaksiKas.toArray(),
                suratTemplates: await db.suratTemplates.toArray(),
                arsipSurat: await db.arsipSurat.toArray(),
                version: '1.2',
                timestamp: new Date().toISOString(),
            };
            await uploadToWebDAV(config, data, filename);
            return new Date().toISOString();
        } else {
            const data = await downloadFromWebDAV(config, filename);
            const { db } = await import('../db');
            await (db as any).transaction('rw', db.settings, db.santri, db.tagihan, db.pembayaran, db.saldoSantri, db.transaksiSaldo, db.transaksiKas, db.suratTemplates, db.arsipSurat, async () => {
                await db.settings.clear(); await db.settings.bulkPut(data.settings);
                await db.santri.clear(); await db.santri.bulkPut(data.santri);
                await db.tagihan.clear(); await db.tagihan.bulkPut(data.tagihan);
                await db.pembayaran.clear(); await db.pembayaran.bulkPut(data.pembayaran);
                await db.saldoSantri.clear(); await db.saldoSantri.bulkPut(data.saldoSantri);
                await db.transaksiSaldo.clear(); await db.transaksiSaldo.bulkPut(data.transaksiSaldo);
                await db.transaksiKas.clear(); await db.transaksiKas.bulkPut(data.transaksiKas);
                await db.suratTemplates.clear(); await db.suratTemplates.bulkPut(data.suratTemplates);
                await db.arsipSurat.clear(); await db.arsipSurat.bulkPut(data.arsipSurat);
            });
            return data.timestamp;
        }
    }
    
    throw new Error("Provider tidak valid");
};
