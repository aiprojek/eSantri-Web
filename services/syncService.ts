
import { createClient, WebDAVClient } from "webdav";
import { db } from '../db';
import { CloudSyncConfig, Pendaftar } from '../types';

// Helper to get full backup data object
const getBackupData = async () => {
    const settingsData = await db.settings.toArray();
    const santriData = await db.santri.toArray();
    const tagihanData = await db.tagihan.toArray();
    const pembayaranData = await db.pembayaran.toArray();
    const saldoSantriData = await db.saldoSantri.toArray();
    const transaksiSaldoData = await db.transaksiSaldo.toArray();
    const transaksiKasData = await db.transaksiKas.toArray();
    const suratTemplatesData = await db.suratTemplates.toArray();
    const arsipSuratData = await db.arsipSurat.toArray();

    return {
        settings: settingsData,
        santri: santriData,
        tagihan: tagihanData,
        pembayaran: pembayaranData,
        saldoSantri: saldoSantriData,
        transaksiSaldo: transaksiSaldoData,
        transaksiKas: transaksiKasData,
        suratTemplates: suratTemplatesData,
        arsipSurat: arsipSuratData,
        backupVersion: '1.2',
        syncTimestamp: new Date().toISOString(),
    };
};

const restoreBackupData = async (data: any) => {
    if (!data.settings || !data.santri) throw new Error("Format data tidak valid");
    
    await (db as any).transaction('rw', [db.santri, db.settings, db.tagihan, db.pembayaran, db.saldoSantri, db.transaksiSaldo, db.transaksiKas, db.suratTemplates, db.arsipSurat], async () => {
        await db.santri.clear();
        await db.settings.clear();
        await db.tagihan.clear();
        await db.pembayaran.clear();
        await db.saldoSantri.clear();
        await db.transaksiSaldo.clear();
        await db.transaksiKas.clear();
        await db.suratTemplates.clear();
        await db.arsipSurat.clear();

        await db.settings.bulkAdd(data.settings);
        await db.santri.bulkAdd(data.santri);
        if(data.tagihan) await db.tagihan.bulkAdd(data.tagihan);
        if(data.pembayaran) await db.pembayaran.bulkAdd(data.pembayaran);
        if(data.saldoSantri) await db.saldoSantri.bulkAdd(data.saldoSantri);
        if(data.transaksiSaldo) await db.transaksiSaldo.bulkAdd(data.transaksiSaldo);
        if(data.transaksiKas) await db.transaksiKas.bulkAdd(data.transaksiKas);
        if(data.suratTemplates) await db.suratTemplates.bulkAdd(data.suratTemplates);
        if(data.arsipSurat) await db.arsipSurat.bulkAdd(data.arsipSurat);
    });
};

// --- Dropbox PSB Implementation ---
export const fetchPsbFromDropbox = async (token: string) => {
    const folderPath = '/esantri_psb';
    
    // 1. List files in the folder
    const listResponse = await fetch('https://api.dropboxapi.com/2/files/list_folder', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ path: folderPath, recursive: false })
    });

    if (!listResponse.ok) {
        if(listResponse.status === 409) return []; // Folder might not exist yet
        throw new Error("Gagal membaca folder PSB di Dropbox");
    }

    const listData = await listResponse.json();
    const entries = listData.entries.filter((e: any) => e['.tag'] === 'file' && e.name.endsWith('.json'));
    
    const newPendaftar: Omit<Pendaftar, 'id'>[] = [];
    const filesToDelete: string[] = [];

    // 2. Download each file
    for (const file of entries) {
        const downloadResponse = await fetch('https://content.dropboxapi.com/2/files/download', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Dropbox-API-Arg': JSON.stringify({ path: file.path_lower })
            }
        });

        if (downloadResponse.ok) {
            const data = await downloadResponse.json();
            // Basic mapping check
            if (data.namaLengkap) {
                newPendaftar.push(data);
                filesToDelete.push(file.path_lower);
            }
        }
    }

    // 3. Delete processed files from Dropbox to avoid duplicates
    for (const path of filesToDelete) {
        await fetch('https://api.dropboxapi.com/2/files/delete_v2', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ path })
        });
    }

    return newPendaftar;
};

// --- Supabase Implementation ---
// Handled via standard supabase-js client in components if needed

// --- Dropbox Implementation ---
const uploadToDropbox = async (token: string, data: any, filename: string) => {
    const fileContent = JSON.stringify(data);
    const response = await fetch('https://content.dropboxapi.com/2/files/upload', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Dropbox-API-Arg': JSON.stringify({
                path: '/' + filename,
                mode: 'overwrite',
                autorename: false,
                mute: false
            }),
            'Content-Type': 'application/octet-stream'
        },
        body: fileContent
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Dropbox Upload Failed: ${errorText}`);
    }
    return await response.json();
};

const downloadFromDropbox = async (token: string, filename: string) => {
    const response = await fetch('https://content.dropboxapi.com/2/files/download', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Dropbox-API-Arg': JSON.stringify({
                path: '/' + filename
            })
        }
    });

    if (!response.ok) {
        throw new Error(`Dropbox Download Failed: ${response.statusText}`);
    }
    return await response.json();
};

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


// --- Main Sync Function ---
export const performSync = async (
    config: CloudSyncConfig, 
    direction: 'up' | 'down',
    filename: string = 'esantri_sync.json'
) => {
    if (config.provider === 'none') throw new Error("Penyedia sinkronisasi belum dipilih.");

    if (direction === 'up') {
        const data = await getBackupData();
        
        if (config.provider === 'dropbox') {
            if (!config.dropboxToken) throw new Error("Token Dropbox belum diisi.");
            await uploadToDropbox(config.dropboxToken, data, filename);
        } else if (config.provider === 'webdav') {
            await uploadToWebDAV(config, data, filename);
        }
        
        return new Date().toISOString(); // Return new sync timestamp
    } else {
        let data;
        if (config.provider === 'dropbox') {
            if (!config.dropboxToken) throw new Error("Token Dropbox belum diisi.");
            data = await downloadFromDropbox(config.dropboxToken, filename);
        } else if (config.provider === 'webdav') {
            data = await downloadFromWebDAV(config, filename);
        }
        
        if (data) {
            await restoreBackupData(data);
            return data.syncTimestamp || new Date().toISOString();
        } else {
            throw new Error("File sinkronisasi tidak ditemukan di cloud.");
        }
    }
};
