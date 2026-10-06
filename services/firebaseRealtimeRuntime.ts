import { db } from '../db';
import { PondokSettings } from '../types';
import { migrateUserPermissions } from './permissionMigrationService';
import { isFirebaseClientConfigReady } from '../firebaseApp';
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
    'suratTemplates', 'arsipSurat', 'pendaftar', 'raporRecords', 'absensi', 'jurnalMengajar',
    'tahfizh', 'buku', 'sirkulasi', 'obat', 'kesehatanRecords', 'bkSessions', 'bukuTamu',
    'inventaris', 'calendarEvents', 'jadwalPelajaran', 'arsipJadwal', 'jadwalUjian', 'piketSchedules', 'users',
    'auditLogs', 'pendingOrders', 'diskon', 'suppliers', 'pembayaranHutang',
    'warehouses', 'stockTransfers', 'digitalAssets', 'settings'
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

let currentSyncSession = 0;

let runtimeIdCounter = Math.floor(Math.random() * 500);
const runtimeDeviceSalt = Math.floor(Math.random() * 500);
const generateSyncSafeNumericId = (): number => {
    runtimeIdCounter = (runtimeIdCounter + 1) % 1000;
    return Date.now() * 1000 + ((runtimeIdCounter + runtimeDeviceSalt) % 1000);
};

const isNumericKeyTable = (tableName: string) => !['auditLogs', 'syncHistory', 'digitalAssets', 'settings'].includes(tableName);

const sanitizeForFirestore = (val: any): any => {
    if (val === undefined) return null;
    if (val === null || typeof val !== 'object') return val;
    if (val instanceof Date) return val.toISOString();
    if (Array.isArray(val)) {
        return val.map((item) => sanitizeForFirestore(item));
    }
    const result: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) {
        if (v !== undefined) {
            result[k] = sanitizeForFirestore(v);
        }
    }
    return result;
};

const applyDexieMods = (baseObj: any, mods: Record<string, any>) => {
    const cloned = baseObj ? JSON.parse(JSON.stringify(baseObj)) : {};
    if (!mods || typeof mods !== 'object') return cloned;
    for (const [keyPath, value] of Object.entries(mods)) {
        if (!keyPath.includes('.')) {
            if (value === undefined) {
                delete cloned[keyPath];
            } else {
                cloned[keyPath] = value;
            }
        } else {
            const parts = keyPath.split('.');
            let cur = cloned;
            for (let i = 0; i < parts.length - 1; i++) {
                const p = parts[i];
                if (cur[p] === undefined || cur[p] === null || typeof cur[p] !== 'object') {
                    cur[p] = {};
                }
                cur = cur[p];
            }
            const lastKey = parts[parts.length - 1];
            if (value === undefined) {
                delete cur[lastKey];
            } else {
                cur[lastKey] = value;
            }
        }
    }
    return cloned;
};

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

    if (!isFirebaseClientConfigReady) {
        return;
    }

    const sessionToken = ++currentSyncSession;

    const activeTenantId = db.settings.toArray().then((settings) => settings[0]?.cloudSyncConfig?.firebasePairedTenantId || tenantId);

    activeTenantId.then((actualId) => {
        if (sessionToken !== currentSyncSession) return;

        TABLES_TO_SYNC.forEach((tableName) => {
            const path = `tenants/${actualId}/${tableName}`;
            const isSettings = tableName === 'settings';
            const target = isSettings ? doc(fdb, path, 'main') : query(collection(fdb, path));

            const unsub = onSnapshot(target as never, async (snap: any) => {
                if (sessionToken !== currentSyncSession) return;
                beginCloudSync();
                try {
                    const isNum = isNumericKeyTable(tableName);

                    const processDoc = async (docData: any, docId: string) => {
                        if (tableName === 'users' && docData.isDefaultAdmin) return null;

                        const rawId = docData.id ?? docData.santriId ?? docId;
                        const targetId = isNum && rawId !== undefined && !isNaN(Number(rawId)) ? Number(rawId) : rawId;

                        const localItem = await (db as any)[tableName].get(
                            isSettings ? (await (db as any)[tableName].toArray())[0]?.id : targetId
                        );
                        const cloudTime = getTime(docData.lastModified);
                        const localTime = localItem ? getTime(localItem.lastModified) : 0;

                        const normalizedDoc = { ...docData };
                        if (isNum && targetId !== undefined) {
                            if (tableName === 'saldoSantri') {
                                normalizedDoc.santriId = targetId;
                            } else {
                                normalizedDoc.id = targetId;
                            }
                        }

                        if (!localItem || cloudTime > localTime) {
                            return normalizedDoc;
                        }

                        if (cloudTime === localTime) {
                            const { lastModified: _cloudTime, ...cloudData } = normalizedDoc;
                            const { lastModified: _localTime, ...localData } = localItem;
                            if (JSON.stringify(cloudData) !== JSON.stringify(localData)) {
                                return normalizedDoc;
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
                                    // Preserve local pairing configuration so spoke devices do not lose hub connection
                                    const localPairedTenant = local[0].cloudSyncConfig?.firebasePairedTenantId;
                                    const localProvider = local[0].cloudSyncConfig?.provider;
                                    if (localPairedTenant) {
                                        rest.cloudSyncConfig = {
                                            ...(rest.cloudSyncConfig || {}),
                                            firebasePairedTenantId: localPairedTenant,
                                            provider: localProvider || 'firebase'
                                        };
                                    }
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
                                const rawDelId = data?.id ?? data?.santriId ?? change.doc.id;
                                const delTargetId = isNum && rawDelId !== undefined && !isNaN(Number(rawDelId)) ? Number(rawDelId) : rawDelId;
                                idsToDelete.push(delTargetId);
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
            const isNum = isNumericKeyTable(tableName);

            const creatingHook = function (this: any, primKey: any, obj: any) {
                if (isSyncingFromCloud) return;
                let assignedId = primKey ?? obj?.id ?? obj?.santriId;
                if (assignedId === undefined && isNum && tableName !== 'saldoSantri' && obj && typeof obj === 'object') {
                    assignedId = generateSyncSafeNumericId();
                    obj.id = assignedId;
                }
                const formatAndSend = (key: any) => {
                    const finalKey = key ?? obj?.id ?? obj?.santriId ?? assignedId;
                    const normalizedKey = isNum && finalKey !== undefined && !isNaN(Number(finalKey)) ? Number(finalKey) : finalKey;
                    const payload = {
                        ...obj,
                        ...(normalizedKey !== undefined && tableName !== 'saldoSantri' ? { id: normalizedKey } : {}),
                        ...(tableName === 'saldoSantri' && normalizedKey !== undefined ? { santriId: normalizedKey } : {})
                    };
                    void syncLocalToFirebase(actualId, tableName, payload);
                };

                if (assignedId !== undefined) {
                    formatAndSend(assignedId);
                    if (primKey === undefined && tableName !== 'saldoSantri') {
                        return assignedId;
                    }
                } else if (this) {
                    const prevOnSuccess = this.onsuccess;
                    this.onsuccess = function (key: any) {
                        if (typeof prevOnSuccess === 'function') {
                            prevOnSuccess.apply(this, arguments as any);
                        }
                        formatAndSend(key);
                    };
                } else {
                    formatAndSend(undefined);
                }
            };
            const updatingHook = (mods: any, primKey: any, obj: any) => {
                if (isSyncingFromCloud) return;
                if (tableName === 'settings' && mods && typeof mods === 'object') {
                    const modKeys = Object.keys(mods);
                    if (modKeys.length === 1 && modKeys[0] === 'cloudSyncConfig') return;
                }
                const targetId = obj?.id ?? obj?.santriId ?? primKey;
                const normalizedId = isNum && targetId !== undefined && !isNaN(Number(targetId)) ? Number(targetId) : targetId;
                const mergedObj = applyDexieMods(obj, mods);
                const payload = {
                    ...mergedObj,
                    ...(normalizedId !== undefined && tableName !== 'saldoSantri' ? { id: normalizedId } : {}),
                    ...(tableName === 'saldoSantri' && normalizedId !== undefined ? { santriId: normalizedId } : {})
                };
                void syncLocalToFirebase(actualId, tableName, payload);
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
    beginCloudSync();
    try {
        for (const tableName of TABLES_TO_SYNC) {
            const path = `tenants/${tenantId}/${tableName}`;
            const snapshot = await getDocs(collection(fdb, path));
            const items = snapshot.docs.map((item) => ({ ...item.data(), _docId: item.id }) as any);

            if (items.length === 0) {
                continue;
            }

            if (tableName === 'users') {
                const localUsers = await db.users.toArray();
                const filteredItems = items.filter((user) => !user.isDefaultAdmin || !localUsers.some((localUser) => localUser.isDefaultAdmin));
                const normalizedUsers = filteredItems.map(({ _docId, ...user }) => migrateUserPermissions(user as any).user);
                await db.users.bulkPut(normalizedUsers);
            } else if (tableName === 'settings') {
                const localSettings = await db.settings.toArray();
                const { _docId, ...cleanSetting } = items[0];
                if (localSettings.length > 0) {
                    const localPairedTenant = localSettings[0].cloudSyncConfig?.firebasePairedTenantId;
                    const localProvider = localSettings[0].cloudSyncConfig?.provider;
                    const incomingSettings = { ...cleanSetting };
                    if (localPairedTenant) {
                        incomingSettings.cloudSyncConfig = {
                            ...(incomingSettings.cloudSyncConfig || {}),
                            firebasePairedTenantId: localPairedTenant,
                            provider: localProvider || 'firebase'
                        };
                    }
                    await db.settings.update(localSettings[0].id!, incomingSettings);
                } else {
                    await db.settings.add(cleanSetting);
                }
            } else {
                const isNum = isNumericKeyTable(tableName);
                const normalizedItems = items.map(({ _docId, ...item }) => {
                    const rawId = item.id ?? item.santriId ?? _docId;
                    if (isNum && rawId !== undefined && !isNaN(Number(rawId))) {
                        if (tableName === 'saldoSantri') {
                            return { ...item, santriId: Number(rawId) };
                        }
                        return { ...item, id: Number(rawId) };
                    }
                    return rawId !== undefined && item.id === undefined && tableName !== 'saldoSantri'
                        ? { ...item, id: rawId }
                        : item;
                });
                await (db as any)[tableName].bulkPut(normalizedItems);
            }
        }
    } catch (error) {
        console.error('Error downloading all from Firebase:', error);
        throw error;
    } finally {
        endCloudSync();
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
        const rawData = { ...data };
        if (tableName === 'settings') {
            delete rawData.cloudSyncConfig;
        }
        const cleanPayload = sanitizeForFirestore({
            ...rawData,
            lastModified: data.lastModified || Date.now(),
        });
        await setDoc(doc(fdb, path, docId), cleanPayload, { merge: true });

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
        if (tableName === 'settings') continue; // Handled explicitly below as 'main'
        const items = await (db as any)[tableName].toArray();

        for (let i = 0; i < items.length; i += 500) {
            const chunk = items.slice(i, i + 500);
            const subBatch = writeBatch(fdb);

            chunk.forEach((item: any) => {
                const docId = item.id?.toString() || item.santriId?.toString();
                if (docId) {
                    const ref = doc(fdb, `tenants/${tenantId}/${tableName}`, docId);
                    subBatch.set(ref, sanitizeForFirestore(item));
                }
            });

            await subBatch.commit();
        }
    }

    const settings = await db.settings.toArray();
    if (settings.length > 0) {
        const cleanSettings = { ...settings[0] };
        delete (cleanSettings as any).cloudSyncConfig;
        await setDoc(doc(fdb, `tenants/${tenantId}/settings`, 'main'), sanitizeForFirestore({ ...cleanSettings, lastModified: Date.now() }), { merge: true });
        await syncPublicPortalConfig(tenantId, settings[0] as PondokSettings);
    }
};

export const syncPsbWithFirebaseHub = async (tenantId: string) => {
    isSyncingFromCloud = true;
    let pulledCount = 0;
    let pushedCount = 0;

    try {
        const path = `tenants/${tenantId}/pendaftar`;
        const snapshot = await getDocs(collection(fdb, path));
        const cloudItems = snapshot.docs.map((d) => {
            const data = d.data() as any;
            const rawId = data.id ?? d.id;
            const parsedId = Number(rawId);
            return {
                ...data,
                id: !isNaN(parsedId) ? parsedId : rawId,
            };
        });
        const localItems = await db.pendaftar.toArray();

        const localMap = new Map(localItems.map((item) => [item.id, item]));
        const cloudMap = new Map(cloudItems.map((item) => [item.id, item]));

        // 1. Pull & Merge from Cloud to Local (LWW)
        for (const cloudItem of cloudItems) {
            if (!cloudItem.id) continue;
            const localItem = localMap.get(cloudItem.id);
            const cloudTime = getTime(cloudItem.lastModified);
            const localTime = localItem ? getTime(localItem.lastModified) : 0;

            if (!localItem) {
                await db.pendaftar.put(cloudItem);
                pulledCount++;
            } else if (cloudTime > localTime) {
                await db.pendaftar.put({ ...localItem, ...cloudItem });
                pulledCount++;
            }
        }

        // 2. Push any Local Items that are newer or missing in Cloud
        for (const localItem of localItems) {
            if (!localItem.id) continue;
            const cloudItem = cloudMap.get(localItem.id);
            const localTime = getTime(localItem.lastModified);
            const cloudTime = cloudItem ? getTime(cloudItem.lastModified) : 0;

            if (!cloudItem || localTime > cloudTime) {
                await setDoc(doc(fdb, path, localItem.id.toString()), {
                    ...localItem,
                    lastModified: localItem.lastModified || Date.now(),
                }, { merge: true });
                pushedCount++;
            }
        }

        const total = await db.pendaftar.count();
        return { pulledCount, pushedCount, total };
    } catch (error) {
        console.error('Error syncing PSB with Firebase Hub:', error);
        throw error;
    } finally {
        isSyncingFromCloud = false;
    }
};

