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
    'auditLogs', 'pendingOrders', 'diskon', 'suppliers', 'pembayaranHutang', 'settings'
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
            const isSettings = tableName === 'settings';
            
            // For settings, it's a specific document 'main'
            const target = isSettings ? doc(fdb, path, 'main') : query(collection(fdb, path));

            const unsub = onSnapshot(target as any, async (snap: any) => {
                isSyncingFromCloud = true;
                
                const processDoc = async (docData: any, docId: string) => {
                    if (tableName === 'users' && docData.isDefaultAdmin) return null;
                    
                    const localItem = await (db as any)[tableName].get(isSettings ? (await (db as any)[tableName].toArray())[0]?.id : (docData.id || docData.santriId || docId));
                    const cloudTime = getTime(docData.lastModified);
                    const localTime = localItem ? getTime(localItem.lastModified) : 0;

                    if (!localItem || cloudTime > localTime) {
                        return docData;
                    } else if (cloudTime === localTime) {
                        const { lastModified: t1, ...c1 } = docData;
                        const { lastModified: t2, ...c2 } = localItem;
                        if (JSON.stringify(c1) !== JSON.stringify(c2)) {
                            return docData;
                        }
                    }
                    return null;
                };

                if (isSettings) {
                    if (snap.exists()) {
                        const data = snap.data();
                        const result = await processDoc(data, 'main');
                        if (result) {
                            const local = await db.settings.toArray();
                            if (local.length > 0) {
                                await db.settings.update(local[0].id!, result);
                            } else {
                                await db.settings.add(result);
                            }
                        }
                    }
                } else {
                    const batch: any[] = [];
                    const idsToDelete: any[] = [];
                    for (const change of snap.docChanges()) {
                        const data = change.doc.data();
                        if (change.type === "added" || change.type === "modified") {
                            const result = await processDoc(data, change.doc.id);
                            if (result) batch.push(result);
                        } else if (change.type === "removed") {
                            idsToDelete.push(data.id || data.santriId || change.doc.id);
                        }
                    }
                    if (batch.length > 0) await (db as any)[tableName].bulkPut(batch);
                    if (idsToDelete.length > 0) await (db as any)[tableName].bulkDelete(idsToDelete);
                }
                
                isSyncingFromCloud = false;
            }, (error: any) => {
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
                const docId = tableName === 'settings' ? 'main' : (primKey.toString());
                deleteFromFirebase(actualId, tableName, docId);
            });
        });
    });
};

export const downloadAllFromFirebase = async (tenantId: string) => {
    isSyncingFromCloud = true;
    try {
        for (const tableName of TABLES_TO_SYNC) {
            const path = `tenants/${tenantId}/${tableName}`;
            const snapshot = await getDocs(collection(fdb, path));
            const items = snapshot.docs.map(doc => doc.data() as any);
            
            if (items.length > 0) {
                // For users, don't overwrite the default admin if it's already there
                if (tableName === 'users') {
                    const localUsers = await db.users.toArray();
                    const filteredItems = items.filter(u => !u.isDefaultAdmin || !localUsers.some(lu => lu.isDefaultAdmin));
                    await db.users.bulkPut(filteredItems);
                } else if (tableName === 'settings') {
                    const localSettings = await db.settings.toArray();
                    if (localSettings.length > 0) {
                        await db.settings.update(localSettings[0].id!, items[0]);
                    } else {
                        await db.settings.add(items[0]);
                    }
                } else {
                    await (db as any)[tableName].bulkPut(items);
                }
            }
        }
    } catch (error) {
        console.error("Error downloading all from Firebase:", error);
        throw error;
    } finally {
        isSyncingFromCloud = false;
    }
};

export const stopFirebaseSync = () => {
    unsubscribers.forEach(unsub => unsub());
    unsubscribers = [];
};

export const syncLocalToFirebase = async (tenantId: string, tableName: string, data: any) => {
    const path = `tenants/${tenantId}/${tableName}`;
    let docId = 'main';
    
    if (tableName !== 'settings') {
        docId = data.id?.toString() || data.santriId?.toString() || data.nis?.toString();
        if (!docId) {
            console.warn(`Attempting to sync ${tableName} without valid ID`, data);
            return;
        }
    }
    
    try {
        await setDoc(doc(fdb, path, docId), {
            ...data,
            lastModified: data.lastModified || Date.now()
        }, { merge: true }); // Use merge to prevent partial data loss
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
