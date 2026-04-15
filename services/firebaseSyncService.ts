import { db } from '../db';
import { 
  db as fdb, 
  collection, 
  doc, 
  setDoc, 
  onSnapshot, 
  query, 
  where, 
  OperationType, 
  handleFirestoreError,
  writeBatch,
  getDocs,
  deleteDoc
} from '../firebase';

const TABLES_TO_SYNC = [
    'santri', 'tagihan', 'pembayaran', 'saldoSantri', 'transaksiSaldo', 'transaksiKas', 'chartOfAccounts',
    'payrollRecords', 'produkKoperasi', 'transaksiKoperasi', 'riwayatStok', 'keuanganKoperasi',
    'suratTemplates', 'arsipSurat', 'pendaftar', 'raporRecords', 'absensi',
    'tahfizh', 'buku', 'sirkulasi', 'obat', 'kesehatanRecords', 'bkSessions', 'bukuTamu',
    'inventaris', 'calendarEvents', 'jadwalPelajaran', 'arsipJadwal', 'piketSchedules', 'users',
    'auditLogs', 'pendingOrders', 'diskon', 'suppliers', 'pembayaranHutang'
];

let unsubscribers: (() => void)[] = [];
let isSyncingFromCloud = false;

const getTime = (val: any) => {
    if (!val) return 0;
    if (typeof val === 'number') return val;
    const t = new Date(val).getTime();
    return isNaN(t) ? 0 : t;
};

export const startFirebaseSync = (tenantId: string) => {
    stopFirebaseSync();

    // Check if we are using a paired tenant ID (Multi-User)
    const activeTenantId = db.settings.toArray().then(s => s[0]?.cloudSyncConfig?.firebasePairedTenantId || tenantId);

    activeTenantId.then(actualId => {
        // 1. Listen for changes in Firestore and update Dexie
        TABLES_TO_SYNC.forEach(tableName => {
            const path = `tenants/${actualId}/${tableName}`;
            const q = query(collection(fdb, path));

            const unsub = onSnapshot(q, async (snapshot) => {
                isSyncingFromCloud = true;
                const batch: any[] = [];
                const idsToDelete: any[] = [];

                for (const change of snapshot.docChanges()) {
                    const data = change.doc.data();
                    const docId = change.doc.id;

                    if (change.type === "added" || change.type === "modified") {
                        if (tableName === 'users' && data.isDefaultAdmin) continue;
                        
                        // Check lastModified to avoid overwriting newer local data
                        const localItem = await (db as any)[tableName].get(data.id || data.santriId || docId);
                        if (!localItem || getTime(data.lastModified) > getTime(localItem.lastModified)) {
                            batch.push(data);
                        }
                    } else if (change.type === "removed") {
                        idsToDelete.push(data.id || data.santriId || docId);
                    }
                }

                if (batch.length > 0) {
                    try {
                        await (db as any)[tableName].bulkPut(batch);
                    } catch (err) {
                        console.error(`Error syncing ${tableName} from Firebase:`, err);
                    }
                }

                if (idsToDelete.length > 0) {
                    try {
                        await (db as any)[tableName].bulkDelete(idsToDelete);
                    } catch (err) {
                        console.error(`Error deleting ${tableName} from local Dexie:`, err);
                    }
                }
                isSyncingFromCloud = false;
            }, (error) => {
                handleFirestoreError(error, OperationType.LIST, path);
            });

            unsubscribers.push(unsub);
        });

        // 2. Listen for changes in Dexie and update Firestore
        TABLES_TO_SYNC.forEach(tableName => {
            const table = (db as any)[tableName];
            
            const hook = (primKey: any, obj: any) => {
                if (isSyncingFromCloud) return;
                syncLocalToFirebase(actualId, tableName, obj);
            };

            table.hook('creating', hook);
            table.hook('updating', (mods: any, primKey: any, obj: any) => {
                if (isSyncingFromCloud) return;
                syncLocalToFirebase(actualId, tableName, { ...obj, ...mods });
            });

            table.hook('deleting', (primKey: any, obj: any) => {
                if (isSyncingFromCloud) return;
                deleteFromFirebase(actualId, tableName, primKey);
            });
        });

        // Special sync for Settings
        const settingsPath = `tenants/${actualId}/settings`;
        const settingsUnsub = onSnapshot(doc(fdb, settingsPath, 'main'), async (snapshot) => {
            if (snapshot.exists()) {
                isSyncingFromCloud = true;
                const cloudSettings = snapshot.data() as any;
                const localSettings = await db.settings.toArray();
                if (localSettings.length > 0) {
                    const current = localSettings[0];
                    if (getTime(cloudSettings.lastModified) > getTime(current.lastModified)) {
                        await db.settings.update(current.id!, cloudSettings);
                    }
                } else {
                    await db.settings.add(cloudSettings);
                }
                isSyncingFromCloud = false;
            }
        }, (error) => {
            handleFirestoreError(error, OperationType.GET, settingsPath);
        });
        unsubscribers.push(settingsUnsub);

        // Settings Hook
        db.settings.hook('updating', (mods: any, primKey: any, obj: any) => {
            if (isSyncingFromCloud) return;
            syncLocalToFirebase(actualId, 'settings', { ...obj, ...mods });
        });
    });
};

export const stopFirebaseSync = () => {
    unsubscribers.forEach(unsub => unsub());
    unsubscribers = [];
};

export const syncLocalToFirebase = async (tenantId: string, tableName: string, data: any) => {
    const path = `tenants/${tenantId}/${tableName}`;
    let docId = data.id?.toString() || data.santriId?.toString() || 'main';
    
    // Force 'main' for settings to ensure consistency with onSnapshot
    if (tableName === 'settings') docId = 'main';
    
    try {
        await setDoc(doc(fdb, path, docId), {
            ...data,
            lastModified: data.lastModified || Date.now()
        });
    } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `${path}/${docId}`);
    }
};

export const deleteFromFirebase = async (tenantId: string, tableName: string, docId: any) => {
    const path = `tenants/${tenantId}/${tableName}/${docId.toString()}`;
    try {
        await deleteDoc(doc(fdb, path));
    } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, path);
    }
};

export const pushAllToFirebase = async (tenantId: string) => {
    for (const tableName of TABLES_TO_SYNC) {
        const items = await (db as any)[tableName].toArray();
        const batch = writeBatch(fdb);
        
        // Firestore batch limit is 500
        for (let i = 0; i < items.length; i += 500) {
            const chunk = items.slice(i, i + 500);
            const subBatch = writeBatch(fdb);
            chunk.forEach((item: any) => {
                const docId = item.id?.toString() || item.santriId?.toString();
                if (docId) {
                    const ref = doc(fdb, `tenants/${tenantId}/${tableName}`, docId);
                    subBatch.set(ref, item);
                }
            });
            await subBatch.commit();
        }
    }

    // Settings
    const settings = await db.settings.toArray();
    if (settings.length > 0) {
        await setDoc(doc(fdb, `tenants/${tenantId}/settings`, 'main'), settings[0]);
    }
};
