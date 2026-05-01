import { db } from '../db';
import { PondokSettings } from '../types';
import { migrateUserPermissions } from './permissionMigrationService';
import {
  db as fdb,
  collection,
  doc,
  setDoc,
  onSnapshot,
  query,
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
let cloudSyncDepth = 0;
type HookRegistryItem = {
    tableName: string;
    creating: (primKey: any, obj: any) => void;
    updating: (mods: any, primKey: any, obj: any) => void;
    deleting: (primKey: any) => void;
};
let registeredHooks: HookRegistryItem[] = [];

const beginCloudSync = () => {
    cloudSyncDepth += 1;
    isSyncingFromCloud = cloudSyncDepth > 0;
};

const endCloudSync = () => {
    cloudSyncDepth = Math.max(0, cloudSyncDepth - 1);
    isSyncingFromCloud = cloudSyncDepth > 0;
};

const buildPublicPortalPayload = (settings: PondokSettings) => ({
    namaPonpes: settings.namaPonpes,
    logoPonpesUrl: settings.logoPonpesUrl || '',
    telepon: settings.telepon || '',
    email: settings.email || '',
    website: settings.website || '',
    portalConfig: settings.portalConfig || {},
    psbConfig: settings.psbConfig || {},
    updatedAt: Date.now(),
});

const syncPublicPortalConfig = async (tenantId: string, settings: PondokSettings) => {
    try {
        await setDoc(doc(fdb, 'publicPortals', tenantId), buildPublicPortalPayload(settings), { merge: true });
    } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `publicPortals/${tenantId}`);
    }
};

const getTime = (val: unknown) => {
    if (!val) return 0;
    if (typeof val === 'number') return val;
    const t = new Date(val as string | number | Date).getTime();
    return Number.isNaN(t) ? 0 : t;
};

export const startFirebaseSync = (tenantId: string) => {
    stopFirebaseSync();

    const activeTenantId = db.settings.toArray().then((settings) => settings[0]?.cloudSyncConfig?.firebasePairedTenantId || tenantId);

    activeTenantId.then((actualId) => {
        TABLES_TO_SYNC.forEach((tableName) => {
            const path = `tenants/${actualId}/${tableName}`;
            const isSettings = tableName === 'settings';
            const target = isSettings ? doc(fdb, path, 'main') : query(collection(fdb, path));

            const unsub = onSnapshot(target as never, async (snap: any) => {
                beginCloudSync();
                try {
                    const processDoc = async (docData: any, docId: string) => {
                        if (tableName === 'users' && docData.isDefaultAdmin) return null;

                        const localItem = await (db as any)[tableName].get(
                            isSettings ? (await (db as any)[tableName].toArray())[0]?.id : (docData.id || docData.santriId || docId)
                        );
                        const cloudTime = getTime(docData.lastModified);
                        const localTime = localItem ? getTime(localItem.lastModified) : 0;

                        if (!localItem || cloudTime > localTime) {
                            return docData;
                        }

                        if (cloudTime === localTime) {
                            const { lastModified: _cloudTime, ...cloudData } = docData;
                            const { lastModified: _localTime, ...localData } = localItem;
                            if (JSON.stringify(cloudData) !== JSON.stringify(localData)) {
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
                                    const { id, ...rest } = result;
                                    await db.settings.update(local[0].id!, rest);
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
                            if (change.type === 'added' || change.type === 'modified') {
                                const result = await processDoc(data, change.doc.id);
                                if (result) batch.push(result);
                            } else if (change.type === 'removed') {
                                idsToDelete.push(data.id || data.santriId || change.doc.id);
                            }
                        }

                        if (batch.length > 0) await (db as any)[tableName].bulkPut(batch);
                        if (idsToDelete.length > 0) await (db as any)[tableName].bulkDelete(idsToDelete);
                    }
                } finally {
                    endCloudSync();
                }
            }, (error: unknown) => {
                handleFirestoreError(error, OperationType.LIST, path);
            });

            unsubscribers.push(unsub);
        });

        TABLES_TO_SYNC.forEach((tableName) => {
            const table = (db as any)[tableName];

            const creatingHook = (_primKey: any, obj: any) => {
                if (isSyncingFromCloud) return;
                void syncLocalToFirebase(actualId, tableName, obj);
            };
            const updatingHook = (mods: any, _primKey: any, obj: any) => {
                if (isSyncingFromCloud) return;
                void syncLocalToFirebase(actualId, tableName, { ...obj, ...mods });
            };
            const deletingHook = (primKey: any) => {
                if (isSyncingFromCloud) return;
                const docId = tableName === 'settings' ? 'main' : primKey.toString();
                void deleteFromFirebase(actualId, tableName, docId);
            };

            table.hook('creating', creatingHook);
            table.hook('updating', updatingHook);
            table.hook('deleting', deletingHook);

            registeredHooks.push({
                tableName,
                creating: creatingHook,
                updating: updatingHook,
                deleting: deletingHook,
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
            const items = snapshot.docs.map((item) => item.data() as any);

            if (items.length === 0) {
                continue;
            }

            if (tableName === 'users') {
                const localUsers = await db.users.toArray();
                const filteredItems = items.filter((user) => !user.isDefaultAdmin || !localUsers.some((localUser) => localUser.isDefaultAdmin));
                const normalizedUsers = filteredItems.map((user) => migrateUserPermissions(user as any).user);
                await db.users.bulkPut(normalizedUsers);
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
    } catch (error) {
        console.error('Error downloading all from Firebase:', error);
        throw error;
    } finally {
        isSyncingFromCloud = false;
    }
};

export const stopFirebaseSync = () => {
    unsubscribers.forEach((unsub) => unsub());
    unsubscribers = [];
    registeredHooks.forEach((item) => {
        const table = (db as any)[item.tableName];
        table.hook('creating').unsubscribe(item.creating);
        table.hook('updating').unsubscribe(item.updating);
        table.hook('deleting').unsubscribe(item.deleting);
    });
    registeredHooks = [];
    cloudSyncDepth = 0;
    isSyncingFromCloud = false;
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
            lastModified: data.lastModified || Date.now(),
        }, { merge: true });

        if (tableName === 'settings') {
            await syncPublicPortalConfig(tenantId, data as PondokSettings);
        }
    } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `${path}/${docId}`);
    }
};

export const deleteFromFirebase = async (tenantId: string, tableName: string, docId: string) => {
    const path = `tenants/${tenantId}/${tableName}/${docId}`;
    try {
        await deleteDoc(doc(fdb, path));
    } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, path);
    }
};

export const pushAllToFirebase = async (tenantId: string) => {
    for (const tableName of TABLES_TO_SYNC) {
        const items = await (db as any)[tableName].toArray();

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

    const settings = await db.settings.toArray();
    if (settings.length > 0) {
        await setDoc(doc(fdb, `tenants/${tenantId}/settings`, 'main'), settings[0]);
        await syncPublicPortalConfig(tenantId, settings[0] as PondokSettings);
    }
};
