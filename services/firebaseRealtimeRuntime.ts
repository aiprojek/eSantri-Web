import { db } from '../db';
import { E2eeConfig, PondokSettings } from '../types';
import { migrateUserPermissions } from './permissionMigrationService';
import { setAuditSyncMute } from './logService';
import { encodePortalKey, mergePortalConfig } from './portalGasService';
import { isFirebaseClientConfigReady } from '../firebaseApp';
import { computePublicKeyFingerprint, decryptAnyEnvelope, E2EE_CHANGED_EVENT, encryptObjectSym, ensureDeviceVaultHydrated, isDeviceUnlockedForConfig, isE2eeEnvelope, tryParseE2eeEnvelope } from './e2eeService';
import { sanitizePendaftar } from '../utils/sanitizePendaftar';
import { mergeSyncedUserCredentials, sanitizeUserForExternalSync } from './authService';
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

const getLocalE2eeConfig = async (): Promise<E2eeConfig | undefined> => {
    const rows = await db.settings.toArray();
    return rows[0]?.e2eeConfig;
};

const getLocalSyncE2eeConfig = async (): Promise<E2eeConfig | undefined> => {
    const cfg = await getLocalE2eeConfig();
    return cfg?.enabled && cfg?.modules?.sync ? cfg : undefined;
};

export const ESANTRI_FB_QUARANTINE_CHANGED_EVENT = 'esantri:fb-plaintext-quarantine-changed';

export interface QuarantinedFirebaseDoc {
    key: string;
    tableName: string;
    docId: string;
    rawData: any;
    label: string;
    detectedAt: number;
}

const fbPlaintextQuarantineMap = new Map<string, QuarantinedFirebaseDoc>();

const emitFbQuarantineChanged = () => {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(ESANTRI_FB_QUARANTINE_CHANGED_EVENT));
    }
};

const buildQuarantineLabel = (tableName: string, docId: string, rawData: any): string => {
    const candidate =
        rawData?.namaLengkap ||
        rawData?.username ||
        rawData?.nama ||
        rawData?.judul ||
        rawData?.keterangan ||
        docId;
    return `${tableName}/${docId}: ${String(candidate).slice(0, 60)}`;
};

const quarantinePlaintextDoc = (tableName: string, docId: string, rawData: any) => {
    const key = `${tableName}::${docId}`;
    fbPlaintextQuarantineMap.set(key, {
        key,
        tableName,
        docId,
        rawData,
        label: buildQuarantineLabel(tableName, docId, rawData),
        detectedAt: Date.now(),
    });
    emitFbQuarantineChanged();
};

const clearQuarantineKeyIfPresent = (tableName: string, docId: string) => {
    const key = `${tableName}::${docId}`;
    if (fbPlaintextQuarantineMap.delete(key)) {
        emitFbQuarantineChanged();
    }
};

export const getFirebasePlaintextQuarantine = (): QuarantinedFirebaseDoc[] => {
    return Array.from(fbPlaintextQuarantineMap.values()).sort((a, b) => b.detectedAt - a.detectedAt);
};

export const clearFirebasePlaintextQuarantine = (keys?: string[]): void => {
    if (!keys) {
        fbPlaintextQuarantineMap.clear();
    } else {
        keys.forEach((k) => fbPlaintextQuarantineMap.delete(k));
    }
    emitFbQuarantineChanged();
};

const ESANTRI_FB_E2EE_PENDING_KEY = 'esantri_fb_e2ee_pending_v1';

interface PendingFbQueueBucket {
    upserts: Record<string, { tableName: string; docId: string }>;
    deletes: Record<string, { tableName: string; docId: string }>;
}

const readPendingFbQueueMap = (): Record<string, PendingFbQueueBucket> => {
    try {
        const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(ESANTRI_FB_E2EE_PENDING_KEY) : null;
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
        return {};
    }
};

const writePendingFbQueueMap = (map: Record<string, PendingFbQueueBucket>) => {
    try {
        if (typeof localStorage === 'undefined') return;
        const cleanEntries = Object.entries(map).filter(([, bucket]) =>
            Object.keys(bucket?.upserts || {}).length > 0 || Object.keys(bucket?.deletes || {}).length > 0
        );
        if (cleanEntries.length === 0) {
            localStorage.removeItem(ESANTRI_FB_E2EE_PENDING_KEY);
        } else {
            localStorage.setItem(ESANTRI_FB_E2EE_PENDING_KEY, JSON.stringify(Object.fromEntries(cleanEntries)));
        }
    } catch {
        // ignore quota errors
    }
};

const hasPendingFbOps = (tenantId: string): boolean => {
    const bucket = readPendingFbQueueMap()[tenantId];
    if (!bucket) return false;
    return Object.keys(bucket.upserts || {}).length > 0 || Object.keys(bucket.deletes || {}).length > 0;
};

const isPendingDeleteFbOp = (tenantId: string, tableName: string, docId: string): boolean => {
    const bucket = readPendingFbQueueMap()[tenantId];
    if (!bucket?.deletes) return false;
    return Boolean(bucket.deletes[`${tableName}::${docId}`]);
};

const enqueuePendingFbOp = (tenantId: string, op: 'upsert' | 'delete', tableName: string, docId: string) => {
    if (!tenantId || !tableName || !docId) return;
    const map = readPendingFbQueueMap();
    const bucket: PendingFbQueueBucket = map[tenantId] || { upserts: {}, deletes: {} };
    const key = `${tableName}::${docId}`;
    if (op === 'delete') {
        delete bucket.upserts[key];
        bucket.deletes[key] = { tableName, docId };
    } else {
        delete bucket.deletes[key];
        bucket.upserts[key] = { tableName, docId };
    }
    map[tenantId] = bucket;
    writePendingFbQueueMap(map);
};

const flushPendingFbE2eeQueue = async (tenantId: string): Promise<void> => {
    const map = readPendingFbQueueMap();
    const bucket = map[tenantId];
    if (!bucket) return;

    await ensureDeviceVaultHydrated();
    const e2eeCfg = await getLocalSyncE2eeConfig();
    if (e2eeCfg && !isDeviceUnlockedForConfig(e2eeCfg)) return;

    const remainingUpserts: Record<string, { tableName: string; docId: string }> = {};
    const remainingDeletes: Record<string, { tableName: string; docId: string }> = {};

    for (const [key, item] of Object.entries(bucket.deletes || {})) {
        try {
            await deleteDoc(doc(fdb, `tenants/${tenantId}/${item.tableName}/${item.docId}`));
        } catch {
            remainingDeletes[key] = item;
        }
    }

    for (const [key, item] of Object.entries(bucket.upserts || {})) {
        try {
            let localDoc: any = null;
            if (item.tableName === 'settings') {
                const rows = await db.settings.toArray();
                localDoc = rows[0] ? { ...rows[0] } : null;
                if (localDoc) delete localDoc.cloudSyncConfig;
            } else {
                const isNum = isNumericKeyTable(item.tableName);
                const lookupKey = isNum && !isNaN(Number(item.docId)) ? Number(item.docId) : item.docId;
                localDoc = await (db as any)[item.tableName]?.get(lookupKey);
            }
            if (!localDoc) continue;
            const prepared = await prepareFirestoreDocForPush(item.tableName, {
                ...localDoc,
                lastModified: localDoc.lastModified || Date.now(),
            }, item.docId);
            await setDoc(doc(fdb, `tenants/${tenantId}/${item.tableName}`, item.docId), prepared, { merge: false });
            if (item.tableName === 'settings') {
                const fullSettingsRows = await db.settings.toArray();
                if (fullSettingsRows[0]) {
                    await syncPublicPortalConfig(tenantId, fullSettingsRows[0] as PondokSettings);
                }
            }
        } catch {
            remainingUpserts[key] = item;
        }
    }

    map[tenantId] = { upserts: remainingUpserts, deletes: remainingDeletes };
    writePendingFbQueueMap(map);
};

const prepareFirestoreDocForPush = async (tableName: string, payload: any, docId?: string): Promise<any> => {
    const e2eeCfg = await getLocalSyncE2eeConfig();
    const safePayload = tableName === 'users'
        ? sanitizeUserForExternalSync(payload, Boolean(e2eeCfg))
        : payload;
    if (!e2eeCfg) {
        return sanitizeForFirestore(safePayload);
    }

    const resolvedDocId = docId || (tableName === 'settings' ? 'main' : (payload?.id ?? payload?.santriId)?.toString());
    const envelope = await encryptObjectSym(
        safePayload,
        e2eeCfg,
        `fs-${tableName}`,
        resolvedDocId ? { docId: String(resolvedDocId) } : undefined
    );
    if (tableName === 'settings') {
        return sanitizeForFirestore({
            id: 'main',
            lastModified: payload.lastModified || Date.now(),
            e2eeConfig: e2eeCfg,
            ...envelope,
        });
    }

    const topMeta: Record<string, any> = {
        lastModified: payload.lastModified || Date.now(),
        ...envelope,
    };
    if (tableName === 'saldoSantri' && payload.santriId !== undefined) {
        topMeta.santriId = payload.santriId;
    } else if (payload.id !== undefined) {
        topMeta.id = payload.id;
    }
    return sanitizeForFirestore(topMeta);
};

export type FirestoreUnwrapResult =
    | { ok: true; data: any }
    | { ok: false; locked: true; plaintextRejected?: false; e2eeConfig?: E2eeConfig }
    | { ok: false; locked?: false; plaintextRejected: true; rawData: any };

export const unwrapFirestoreDocFromCloud = async (
    rawData: any,
    aadCheck?: { expectedContext?: string; expectedDocId?: string; rejectPlaintext?: boolean }
): Promise<FirestoreUnwrapResult> => {
    if (isE2eeEnvelope(rawData)) {
        try {
            const decrypted = await decryptAnyEnvelope(
                rawData,
                rawData.mode === 'hybrid_rsa' ? { expectedContext: 'psb' } : aadCheck
            );
            return { ok: true, data: decrypted };
        } catch {
            return {
                ok: false,
                locked: true,
                e2eeConfig: (rawData as any)?.e2eeConfig,
            };
        }
    }

    // Dekripsi hybrid biodata PSB publik (__e2ee_bio di dalam customData) bila berasal dari Portal PSB Firebase
    if (rawData && typeof rawData.customData === 'string' && rawData.customData.includes('__e2ee_bio')) {
        try {
            const parsedCustom = JSON.parse(rawData.customData);
            const env = tryParseE2eeEnvelope(parsedCustom?.__e2ee_bio);
            if (env) {
                try {
                    const bio = await decryptAnyEnvelope<Record<string, any>>(env, { expectedContext: 'psb' });
                    const { __e2ee_bio: _removed, ...restCustom } = parsedCustom;
                    const mergedCustom: Record<string, any> = { ...restCustom };
                    const topKeys = new Set(Object.keys(rawData));
                    for (const [bk, bv] of Object.entries(bio || {})) {
                        if (!topKeys.has(bk) && mergedCustom[bk] === undefined && bk !== 'namaLengkap' && bk !== 'nomorRegistrasi') {
                            mergedCustom[bk] = bv;
                        }
                    }
                    return {
                        ok: true,
                        data: {
                            ...rawData,
                            ...bio,
                            customData: JSON.stringify(mergedCustom),
                        },
                    };
                } catch {
                    return { ok: false, locked: true };
                }
            }
        } catch {
            // Biarkan lanjut ke pemeriksaan plaintext di bawah jika JSON tidak valid
        }
    }

    if (aadCheck?.rejectPlaintext) {
        return {
            ok: false,
            plaintextRejected: true,
            rawData,
        };
    }

    return { ok: true, data: rawData };
};

const syncLockedE2eeMetaToLocal = async (meta?: E2eeConfig) => {
    if (!meta || !meta.enabled) return;
    const local = await db.settings.toArray();
    if (local.length > 0) {
        const localCfg = local[0].e2eeConfig;
        if (localCfg && localCfg.enabled === false && localCfg.keyId === meta.keyId) {
            const remoteTs = Date.parse(meta.updatedAt || '') || 0;
            const localTs = Date.parse(localCfg.disabledAt || localCfg.updatedAt || '') || 0;
            if (remoteTs <= localTs) {
                return;
            }
        }
        if (!localCfg?.enabled || localCfg.keyId !== meta.keyId) {
            await db.settings.update(local[0].id!, { e2eeConfig: meta });
        }
    } else {
        await db.settings.add({ e2eeConfig: meta } as any);
    }
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(E2EE_CHANGED_EVENT));
    }
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
    setAuditSyncMute(isSyncingFromCloud);
};

const endCloudSync = () => {
    cloudSyncDepth = Math.max(0, cloudSyncDepth - 1);
    isSyncingFromCloud = cloudSyncDepth > 0;
    setAuditSyncMute(isSyncingFromCloud);
};

const buildPublicPortalPayload = (settings: PondokSettings, psbE2eeFingerprint?: string) => {
    const rawPortal = settings.portalConfig;
    const sanitizedPortal = rawPortal
        ? {
            ...rawPortal,
            gasEndpoint: '', // Jangan ekspos URL GAS telanjang di dokumen publik Firestore
            gasApiKey: '',   // Jangan ekspos Token API di dokumen publik Firestore
            gasPublicKey: '',
            gasAdminKey: '', // JANGAN PERNAH kirim ADMIN_KEY ke Firestore publik
            encryptedKey: rawPortal.gasEndpoint
                ? encodePortalKey(
                      rawPortal.gasEndpoint,
                      rawPortal.portalId || 'default-portal',
                      rawPortal.gasPublicKey || rawPortal.gasApiKey || ''
                  )
                : '',
        }
        : {};
    const effectiveFp = psbE2eeFingerprint || settings.e2eeConfig?.publicKeyFingerprint || '';
    const psbE2ee =
        settings.e2eeConfig?.enabled &&
        settings.e2eeConfig?.modules?.psb &&
        settings.e2eeConfig?.publicKeySpki &&
        settings.e2eeConfig?.keyId
            ? {
                enabled: true,
                keyId: settings.e2eeConfig.keyId,
                publicKeySpki: settings.e2eeConfig.publicKeySpki,
                ...(effectiveFp ? { fingerprint: effectiveFp } : {}),
            }
            : null;
    return {
        namaPonpes: settings.namaPonpes,
        logoPonpesUrl: settings.logoPonpesUrl || '',
        telepon: settings.telepon || '',
        email: settings.email || '',
        website: settings.website || '',
        portalConfig: sanitizedPortal,
        psbConfig: {
            tahunAjaranAktif: settings.psbConfig?.tahunAjaranAktif || '',
        },
        psbE2ee,
        updatedAt: Date.now(),
    };
};

const syncPublicPortalConfig = async (tenantId: string, settings: PondokSettings) => {
    try {
        let fp = settings.e2eeConfig?.publicKeyFingerprint || '';
        if (!fp && settings.e2eeConfig?.enabled && settings.e2eeConfig?.modules?.psb && settings.e2eeConfig?.publicKeySpki) {
            fp = await computePublicKeyFingerprint(settings.e2eeConfig.publicKeySpki).catch(() => '');
        }
        await setDoc(doc(fdb, 'publicPortals', tenantId), buildPublicPortalPayload(settings, fp), { merge: true });
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

    activeTenantId.then(async (actualId) => {
        if (sessionToken !== currentSyncSession) return;
        await ensureDeviceVaultHydrated();
        if (sessionToken !== currentSyncSession) return;
        let hadLockedDocs = false;

        if (typeof window !== 'undefined') {
            const onE2eeUnlock = async () => {
                if (sessionToken !== currentSyncSession) return;
                const needsFlush = hasPendingFbOps(actualId);
                if (!hadLockedDocs && !needsFlush) return;
                const rows = await db.settings.toArray();
                const activeCfg = rows[0]?.e2eeConfig;
                if (!activeCfg?.enabled || isDeviceUnlockedForConfig(activeCfg)) {
                    hadLockedDocs = false;
                    await flushPendingFbE2eeQueue(actualId).catch(() => {});
                    await downloadAllFromFirebase(actualId).catch(() => {});
                }
            };
            window.addEventListener(E2EE_CHANGED_EVENT, onE2eeUnlock);
            unsubscribers.push(() => window.removeEventListener(E2EE_CHANGED_EVENT, onE2eeUnlock));
        }

        if (hasPendingFbOps(actualId)) {
            await flushPendingFbE2eeQueue(actualId).catch(() => {});
            if (sessionToken !== currentSyncSession) return;
        }

        TABLES_TO_SYNC.forEach((tableName) => {
            const path = `tenants/${actualId}/${tableName}`;
            const isSettings = tableName === 'settings';
            const target = isSettings ? doc(fdb, path, 'main') : query(collection(fdb, path));

            const unsub = onSnapshot(target as never, async (snap: any) => {
                if (sessionToken !== currentSyncSession) return;
                beginCloudSync();
                try {
                    const isNum = isNumericKeyTable(tableName);

                    const processDoc = async (rawDocData: any, docId: string) => {
                        if (isPendingDeleteFbOp(actualId, tableName, docId)) {
                            return null;
                        }
                        const e2eeCfg = await getLocalE2eeConfig();
                        const rejectPlaintext = Boolean(
                            e2eeCfg?.enabled &&
                            (e2eeCfg?.modules?.sync || (tableName === 'pendaftar' && e2eeCfg?.modules?.psb))
                        );
                        const unwrapped = await unwrapFirestoreDocFromCloud(rawDocData, {
                            expectedContext: `fs-${tableName}`,
                            expectedDocId: docId,
                            rejectPlaintext,
                        });
                        if (!unwrapped.ok) {
                            if (unwrapped.plaintextRejected) {
                                quarantinePlaintextDoc(tableName, docId, unwrapped.rawData);
                                console.warn(`Dokumen Firestore plaintext (${tableName}/${docId}) ditolak karena E2EE aktif.`);
                                return null;
                            }
                            hadLockedDocs = true;
                            if (unwrapped.e2eeConfig) {
                                await syncLockedE2eeMetaToLocal(unwrapped.e2eeConfig);
                            }
                            return null;
                        }
                        clearQuarantineKeyIfPresent(tableName, docId);
                        const docData = unwrapped.data;
                        if (tableName === 'users' && docData.isDefaultAdmin) return null;

                        const rawId = docData.id ?? docData.santriId ?? docId;
                        const targetId = isNum && rawId !== undefined && !isNaN(Number(rawId)) ? Number(rawId) : rawId;

                        const localItem = await (db as any)[tableName].get(
                            isSettings ? (await (db as any)[tableName].toArray())[0]?.id : targetId
                        );
                        const cloudTime = getTime(docData.lastModified);
                        const localTime = localItem ? getTime(localItem.lastModified) : 0;

                        const normalizedDocBase = { ...docData };
                        if (isNum && targetId !== undefined) {
                            if (tableName === 'saldoSantri') {
                                normalizedDocBase.santriId = targetId;
                            } else {
                                normalizedDocBase.id = targetId;
                            }
                        }
                        const normalizedDoc = tableName === 'users'
                            ? mergeSyncedUserCredentials(normalizedDocBase, localItem)
                            : normalizedDocBase;

                        if (!localItem || cloudTime > localTime) {
                            if (tableName === 'inventaris' && localItem) {
                                const servisA = Array.isArray(localItem.riwayatServis) ? localItem.riwayatServis : [];
                                const servisB = Array.isArray(normalizedDoc.riwayatServis) ? normalizedDoc.riwayatServis : [];
                                if (servisA.length > 0 || servisB.length > 0) {
                                    const sMap = new Map<string, any>();
                                    servisA.forEach((s: any) => { if (s?.id) sMap.set(s.id, s); });
                                    servisB.forEach((s: any) => { if (s?.id) sMap.set(s.id, s); });
                                    normalizedDoc.riwayatServis = Array.from(sMap.values()).sort((a, b) =>
                                        String(a.tanggal || '').localeCompare(String(b.tanggal || ''))
                                    );
                                }
                                const pinjamA = Array.isArray(localItem.riwayatPeminjaman) ? localItem.riwayatPeminjaman : [];
                                const pinjamB = Array.isArray(normalizedDoc.riwayatPeminjaman) ? normalizedDoc.riwayatPeminjaman : [];
                                if (pinjamA.length > 0 || pinjamB.length > 0) {
                                    const pMap = new Map<string, any>();
                                    pinjamA.forEach((p: any) => { if (p?.id) pMap.set(p.id, p); });
                                    pinjamB.forEach((p: any) => {
                                        if (!p?.id) return;
                                        const prev = pMap.get(p.id);
                                        if (prev && prev.status === 'Dikembalikan' && p.status !== 'Dikembalikan') return;
                                        pMap.set(p.id, p);
                                    });
                                    const mergedLoans = Array.from(pMap.values()).sort((a, b) =>
                                        String(a.tanggalPinjam || '').localeCompare(String(b.tanggalPinjam || ''))
                                    );
                                    normalizedDoc.riwayatPeminjaman = mergedLoans;
                                    normalizedDoc.statusPinjam = mergedLoans.some((l: any) => l.status === 'Dipinjam') ? 'Dipinjam' : 'Tersedia';
                                }
                            }
                            return tableName === 'pendaftar' ? sanitizePendaftar(normalizedDoc) : normalizedDoc;
                        }

                        if (cloudTime === localTime) {
                            const { lastModified: _cloudTime, ...cloudData } = normalizedDoc;
                            const { lastModified: _localTime, ...localData } = localItem;
                            if (JSON.stringify(cloudData) !== JSON.stringify(localData)) {
                                return tableName === 'pendaftar' ? sanitizePendaftar(normalizedDoc) : normalizedDoc;
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
                                    if (rest.portalConfig || local[0].portalConfig) {
                                        rest.portalConfig = mergePortalConfig(rest.portalConfig, local[0].portalConfig);
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
    await ensureDeviceVaultHydrated();
    beginCloudSync();
    let lockedSkipCount = 0;
    let discoveredLockedMeta: E2eeConfig | undefined;
    try {
        const localE2eeCfg = await getLocalE2eeConfig();
        const shouldRejectPlaintext = (tName: string) => Boolean(
            localE2eeCfg?.enabled &&
            (localE2eeCfg?.modules?.sync || (tName === 'pendaftar' && localE2eeCfg?.modules?.psb))
        );

        for (const tableName of TABLES_TO_SYNC) {
            const path = `tenants/${tenantId}/${tableName}`;
            const snapshot = await getDocs(collection(fdb, path));
            const items = snapshot.docs.map((item) => ({ ...item.data(), _docId: item.id }) as any);

            if (items.length === 0) {
                continue;
            }

            const rejectPlaintext = shouldRejectPlaintext(tableName);

            if (tableName === 'users') {
                const localUsers = await db.users.toArray();
                const decryptedUsers: any[] = [];
                for (const item of items) {
                    const { _docId, ...rest } = item;
                    const unwrapped = await unwrapFirestoreDocFromCloud(rest, {
                        expectedContext: 'fs-users',
                        expectedDocId: String(_docId),
                        rejectPlaintext,
                    });
                    if (unwrapped.ok) {
                        clearQuarantineKeyIfPresent('users', String(_docId));
                        decryptedUsers.push(unwrapped.data);
                    } else if (unwrapped.plaintextRejected) {
                        quarantinePlaintextDoc('users', String(_docId), unwrapped.rawData);
                    } else {
                        lockedSkipCount++;
                        if (unwrapped.e2eeConfig) discoveredLockedMeta = unwrapped.e2eeConfig;
                    }
                }
                const localUserById = new Map(localUsers.map((u) => [u.id, u]));
                const filteredItems = decryptedUsers.filter((user) => !user.isDefaultAdmin || !localUsers.some((localUser) => localUser.isDefaultAdmin));
                const normalizedUsers = filteredItems.map((user) => {
                    const migrated = migrateUserPermissions(user as any).user;
                    return mergeSyncedUserCredentials(migrated, localUserById.get(migrated.id));
                });
                if (normalizedUsers.length > 0) {
                    await db.users.bulkPut(normalizedUsers);
                }
            } else if (tableName === 'settings') {
                const localSettings = await db.settings.toArray();
                const { _docId, ...rawSetting } = items[0];
                const docKey = String(_docId || 'main');
                const unwrapped = await unwrapFirestoreDocFromCloud(rawSetting, {
                    expectedContext: 'fs-settings',
                    expectedDocId: docKey,
                    rejectPlaintext,
                });
                if (!unwrapped.ok) {
                    if (unwrapped.plaintextRejected) {
                        quarantinePlaintextDoc('settings', docKey, unwrapped.rawData);
                        continue;
                    }
                    lockedSkipCount++;
                    if (unwrapped.e2eeConfig) {
                        discoveredLockedMeta = unwrapped.e2eeConfig;
                        await syncLockedE2eeMetaToLocal(unwrapped.e2eeConfig);
                    }
                    continue;
                }
                clearQuarantineKeyIfPresent('settings', docKey);
                const cleanSetting = unwrapped.data;
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
                    if (incomingSettings.portalConfig || localSettings[0].portalConfig) {
                        incomingSettings.portalConfig = mergePortalConfig(incomingSettings.portalConfig, localSettings[0].portalConfig);
                    }
                    await db.settings.update(localSettings[0].id!, incomingSettings);
                } else {
                    await db.settings.add(cleanSetting);
                }
            } else {
                const isNum = isNumericKeyTable(tableName);
                const normalizedItems: any[] = [];
                for (const rawItem of items) {
                    const { _docId, ...rest } = rawItem;
                    const unwrapped = await unwrapFirestoreDocFromCloud(rest, {
                        expectedContext: `fs-${tableName}`,
                        expectedDocId: String(_docId),
                        rejectPlaintext,
                    });
                    if (!unwrapped.ok) {
                        if (unwrapped.plaintextRejected) {
                            quarantinePlaintextDoc(tableName, String(_docId), unwrapped.rawData);
                            continue;
                        }
                        lockedSkipCount++;
                        if (unwrapped.e2eeConfig) discoveredLockedMeta = unwrapped.e2eeConfig;
                        continue;
                    }
                    clearQuarantineKeyIfPresent(tableName, String(_docId));
                    const item = unwrapped.data;
                    const rawId = item.id ?? item.santriId ?? _docId;
                    let normItem: any;
                    if (isNum && rawId !== undefined && !isNaN(Number(rawId))) {
                        if (tableName === 'saldoSantri') {
                            normItem = { ...item, santriId: Number(rawId) };
                        } else {
                            normItem = { ...item, id: Number(rawId) };
                        }
                    } else if (rawId !== undefined && item.id === undefined && tableName !== 'saldoSantri') {
                        normItem = { ...item, id: rawId };
                    } else {
                        normItem = item;
                    }
                    normalizedItems.push(tableName === 'pendaftar' ? sanitizePendaftar(normItem) : normItem);
                }
                if (normalizedItems.length > 0) {
                    await (db as any)[tableName].bulkPut(normalizedItems);
                }
            }
        }

        if (discoveredLockedMeta) {
            await syncLockedE2eeMetaToLocal(discoveredLockedMeta);
        }
        if (lockedSkipCount > 0) {
            throw new Error(
                `E2EE_LOCKED: Konfigurasi E2EE dimuat ke perangkat ini (${lockedSkipCount} dokumen terenkripsi menunggu). Masukkan Master Password E2EE pada banner atas lalu sinkronkan ulang Firebase.`
            );
        }
    } catch (error) {
        if (!(error as Error)?.message?.includes('E2EE_LOCKED')) {
            console.error('Error downloading all from Firebase:', error);
        }
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

    await ensureDeviceVaultHydrated();
    const e2eeCfg = await getLocalSyncE2eeConfig();
    if (e2eeCfg && !isDeviceUnlockedForConfig(e2eeCfg)) {
        enqueuePendingFbOp(tenantId, 'upsert', tableName, docId);
        console.warn(`Sync Firebase untuk ${tableName}/${docId} diantrekan: perangkat E2EE masih terkunci.`);
        return;
    }

    try {
        const rawData = { ...data };
        if (tableName === 'settings') {
            delete rawData.cloudSyncConfig;
        }
        const payloadWithTs = {
            ...rawData,
            lastModified: data.lastModified || Date.now(),
        };
        const prepared = await prepareFirestoreDocForPush(tableName, payloadWithTs, docId);
        await setDoc(doc(fdb, path, docId), prepared, { merge: false });

        if (tableName === 'settings') {
            await syncPublicPortalConfig(tenantId, data as PondokSettings);
        }
    } catch (error) {
        if ((error as Error)?.message?.includes('E2EE_LOCKED')) {
            enqueuePendingFbOp(tenantId, 'upsert', tableName, docId);
            console.warn(`Sync Firebase untuk ${tableName}/${docId} diantrekan sementara karena E2EE terkunci.`);
            return;
        }
        handleFirestoreError(error, OperationType.WRITE, `${path}/${docId}`);
    }
};

export const deleteFromFirebase = async (tenantId: string, tableName: string, docId: string) => {
    await ensureDeviceVaultHydrated();
    const e2eeCfg = await getLocalSyncE2eeConfig();
    if (e2eeCfg && !isDeviceUnlockedForConfig(e2eeCfg)) {
        enqueuePendingFbOp(tenantId, 'delete', tableName, docId);
        console.warn(`Hapus Firebase untuk ${tableName}/${docId} diantrekan: perangkat E2EE masih terkunci.`);
        return;
    }
    const path = `tenants/${tenantId}/${tableName}/${docId}`;
    try {
        await deleteDoc(doc(fdb, path));
    } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, path);
    }
};

export const pushAllToFirebase = async (tenantId: string) => {
    await ensureDeviceVaultHydrated();
    const e2eeCfg = await getLocalSyncE2eeConfig();
    if (e2eeCfg && !isDeviceUnlockedForConfig(e2eeCfg)) {
        throw new Error(
            'E2EE_LOCKED: Perangkat ini masih terkunci. Masukkan Master Password E2EE pada banner atas sebelum mengunggah data ke Firebase.'
        );
    }

    for (const tableName of TABLES_TO_SYNC) {
        if (tableName === 'settings') continue; // Handled explicitly below as 'main'
        const items = await (db as any)[tableName].toArray();

        for (let i = 0; i < items.length; i += 500) {
            const chunk = items.slice(i, i + 500);
            const subBatch = writeBatch(fdb);

            for (const item of chunk) {
                const docId = item.id?.toString() || item.santriId?.toString();
                if (docId) {
                    const ref = doc(fdb, `tenants/${tenantId}/${tableName}`, docId);
                    const prepared = await prepareFirestoreDocForPush(tableName, item, docId);
                    subBatch.set(ref, prepared);
                }
            }

            await subBatch.commit();
        }
    }

    const settings = await db.settings.toArray();
    if (settings.length > 0) {
        const cleanSettings = { ...settings[0] };
        delete (cleanSettings as any).cloudSyncConfig;
        const preparedSettings = await prepareFirestoreDocForPush('settings', {
            ...cleanSettings,
            lastModified: Date.now(),
        }, 'main');
        await setDoc(doc(fdb, `tenants/${tenantId}/settings`, 'main'), preparedSettings, { merge: false });
        await syncPublicPortalConfig(tenantId, settings[0] as PondokSettings);
    }
};

export const syncPsbWithFirebaseHub = async (tenantId: string) => {
    isSyncingFromCloud = true;
    let pulledCount = 0;
    let pushedCount = 0;
    let lockedSkipCount = 0;
    let plaintextRejectedCount = 0;
    let discoveredLockedMeta: E2eeConfig | undefined;

    try {
        await ensureDeviceVaultHydrated();
        const localE2eeCfg = await getLocalE2eeConfig();
        const rejectPlaintext = Boolean(localE2eeCfg?.enabled && (localE2eeCfg?.modules?.sync || localE2eeCfg?.modules?.psb));
        const path = `tenants/${tenantId}/pendaftar`;
        const snapshot = await getDocs(collection(fdb, path));
        const cloudItems: any[] = [];
        for (const d of snapshot.docs) {
            const rawData = d.data() as any;
            const unwrapped = await unwrapFirestoreDocFromCloud(rawData, {
                expectedContext: 'fs-pendaftar',
                expectedDocId: d.id,
                rejectPlaintext,
            });
            if (!unwrapped.ok) {
                if (unwrapped.plaintextRejected) {
                    plaintextRejectedCount++;
                    quarantinePlaintextDoc('pendaftar', d.id, unwrapped.rawData);
                    continue;
                }
                lockedSkipCount++;
                if (unwrapped.e2eeConfig) discoveredLockedMeta = unwrapped.e2eeConfig;
                continue;
            }
            clearQuarantineKeyIfPresent('pendaftar', d.id);
            const data = unwrapped.data;
            const rawId = data.id ?? d.id;
            const parsedId = Number(rawId);
            cloudItems.push({
                ...data,
                id: !isNaN(parsedId) ? parsedId : rawId,
            });
        }
        if (discoveredLockedMeta) {
            await syncLockedE2eeMetaToLocal(discoveredLockedMeta);
        }
        if (lockedSkipCount > 0) {
            throw new Error(
                `E2EE_LOCKED: Terdapat ${lockedSkipCount} data pendaftar PSB terenkripsi. Buka kunci E2EE perangkat terlebih dahulu sebelum melakukan sinkronisasi.`
            );
        }

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
                await db.pendaftar.put(sanitizePendaftar(cloudItem));
                pulledCount++;
            } else if (cloudTime > localTime) {
                await db.pendaftar.put(sanitizePendaftar({ ...localItem, ...cloudItem }));
                pulledCount++;
            }
        }

        // 2. Push any Local Items that are newer or missing in Cloud
        const pendingPushes = localItems.filter((localItem) => {
            if (!localItem.id) return false;
            const cloudItem = cloudMap.get(localItem.id);
            const localTime = getTime(localItem.lastModified);
            const cloudTime = cloudItem ? getTime(cloudItem.lastModified) : 0;
            return !cloudItem || localTime > cloudTime;
        });

        if (pendingPushes.length > 0) {
            const e2eeCfg = await getLocalSyncE2eeConfig();
            if (e2eeCfg && !isDeviceUnlockedForConfig(e2eeCfg)) {
                throw new Error(
                    'E2EE_LOCKED: Perangkat ini masih terkunci. Masukkan Master Password E2EE sebelum mengunggah pendaftar PSB ke Firebase.'
                );
            }
            for (const localItem of pendingPushes) {
                const payload = {
                    ...localItem,
                    lastModified: localItem.lastModified || Date.now(),
                };
                const docId = localItem.id!.toString();
                const prepared = await prepareFirestoreDocForPush('pendaftar', payload, docId);
                await setDoc(doc(fdb, path, docId), prepared, { merge: false });
                pushedCount++;
            }
        }

        const total = await db.pendaftar.count();
        return { pulledCount, pushedCount, total, plaintextRejectedCount };
    } catch (error) {
        if (!(error as Error)?.message?.includes('E2EE_LOCKED')) {
            console.error('Error syncing PSB with Firebase Hub:', error);
        }
        throw error;
    } finally {
        isSyncingFromCloud = false;
    }
};

export const reencryptQuarantinedFirebaseDocs = async (
    tenantId: string,
    keys?: string[]
): Promise<{ processedCount: number }> => {
    await ensureDeviceVaultHydrated();
    const cfg = await getLocalE2eeConfig();
    if (cfg?.enabled && !isDeviceUnlockedForConfig(cfg)) {
        throw new Error('E2EE_LOCKED: Buka kunci Master Password E2EE terlebih dahulu sebelum menerima & mengenkripsi ulang dokumen.');
    }
    const items = getFirebasePlaintextQuarantine().filter((item) => !keys || keys.includes(item.key));
    if (items.length === 0) return { processedCount: 0 };

    beginCloudSync();
    let processedCount = 0;
    try {
        for (const entry of items) {
            const { tableName, docId, rawData } = entry;
            const isNum = isNumericKeyTable(tableName);
            const rawId = rawData?.id ?? rawData?.santriId ?? docId;
            const targetId = isNum && rawId !== undefined && !isNaN(Number(rawId)) ? Number(rawId) : rawId;

            if (tableName === 'settings') {
                const localSettings = await db.settings.toArray();
                if (localSettings.length > 0) {
                    const localPaired = localSettings[0].cloudSyncConfig?.firebasePairedTenantId;
                    const localProvider = localSettings[0].cloudSyncConfig?.provider;
                    const merged = { ...rawData, e2eeConfig: localSettings[0].e2eeConfig };
                    if (localPaired) {
                        merged.cloudSyncConfig = {
                            ...(merged.cloudSyncConfig || {}),
                            firebasePairedTenantId: localPaired,
                            provider: localProvider || 'firebase',
                        };
                    }
                    merged.lastModified = Date.now();
                    await db.settings.update(localSettings[0].id!, merged);
                    const prepared = await prepareFirestoreDocForPush('settings', { ...merged, cloudSyncConfig: undefined }, 'main');
                    await setDoc(doc(fdb, `tenants/${tenantId}/settings`, 'main'), prepared, { merge: false });
                }
            } else {
                const table = (db as any)[tableName];
                if (!table) continue;
                let normalized = { ...rawData };
                if (isNum && targetId !== undefined) {
                    if (tableName === 'saldoSantri') normalized.santriId = targetId;
                    else normalized.id = targetId;
                }
                if (tableName === 'users') {
                    const localUser = await table.get(targetId);
                    normalized = mergeSyncedUserCredentials(migrateUserPermissions(normalized).user, localUser);
                } else if (tableName === 'pendaftar') {
                    normalized = sanitizePendaftar(normalized);
                }
                normalized.lastModified = Math.max(getTime(normalized.lastModified), Date.now());
                await table.put(normalized);

                const prepared = await prepareFirestoreDocForPush(tableName, normalized, docId);
                await setDoc(doc(fdb, `tenants/${tenantId}/${tableName}`, docId), prepared, { merge: false });
            }

            fbPlaintextQuarantineMap.delete(entry.key);
            processedCount++;
        }
    } finally {
        endCloudSync();
        emitFbQuarantineChanged();
    }

    return { processedCount };
};


