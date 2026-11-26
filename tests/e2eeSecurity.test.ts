import { webcrypto } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import {
    bytesToBase64,
    changeMasterPassword,
    decryptAnyEnvelope,
    decryptHybridEnvelope,
    decryptObjectSym,
    decryptPortalSantriSummary,
    E2EE_DEVICE_VAULT_MODE_KEY,
    E2EE_DEVICE_VAULT_STORAGE_KEY,
    E2EE_DEVICE_VAULT_V2_STORAGE_KEY,
    E2EE_KDF_ITERATIONS,
    E2EE_KDF_VERSION,
    E2EE_LEGACY_KDF_ITERATIONS,
    E2EE_MIN_PASSWORD_LENGTH,
    E2EE_PORTAL_LEGACY_KDF_ITERATIONS,
    encryptObjectHybridWithPublicKey,
    encryptObjectSym,
    encryptPortalSantriSummary,
    ensureDeviceVaultHydrated,
    forgetDeviceVault,
    getDeviceVaultMode,
    getVaultEntryByKeyId,
    lockDeviceVault,
    recoverWithRecoveryKey,
    setDeviceVaultModeAsync,
    setupE2eeConfig,
    sha256Hex,
    unlockWithPassword,
} from '../services/e2eeService';
import type { E2eeConfig } from '../types';

const createMemoryStorage = (): Storage => {
    const store = new Map<string, string>();
    return {
        get length() {
            return store.size;
        },
        clear() {
            store.clear();
        },
        getItem(key: string) {
            return store.has(key) ? store.get(key)! : null;
        },
        key(index: number) {
            return Array.from(store.keys())[index] ?? null;
        },
        removeItem(key: string) {
            store.delete(key);
        },
        setItem(key: string, value: string) {
            store.set(String(key), String(value));
        },
    };
};

const createMemoryIndexedDb = (): { factory: IDBFactory; stores: Map<string, Map<string, Map<string, any>>> } => {
    const dbs = new Map<string, Map<string, Map<string, any>>>();
    const fireAsync = (fn: () => void) => {
        queueMicrotask(fn);
    };
    const factory = {
        open(dbName: string) {
            const req: any = { result: null, error: null, onupgradeneeded: null, onsuccess: null, onerror: null };
            fireAsync(() => {
                let isNew = false;
                if (!dbs.has(dbName)) {
                    dbs.set(dbName, new Map());
                    isNew = true;
                }
                const dbStores = dbs.get(dbName)!;
                const dbObj: any = {
                    objectStoreNames: {
                        contains: (name: string) => dbStores.has(name),
                    },
                    createObjectStore: (name: string) => {
                        if (!dbStores.has(name)) dbStores.set(name, new Map());
                        return {};
                    },
                    transaction: (storeName: string) => {
                        const tx: any = { oncomplete: null, onerror: null, error: null };
                        const storeMap = dbStores.get(storeName) || new Map();
                        dbStores.set(storeName, storeMap);
                        tx.objectStore = () => ({
                            get: (key: string) => {
                                const r: any = { result: undefined, error: null, onsuccess: null, onerror: null };
                                fireAsync(() => {
                                    r.result = storeMap.get(key);
                                    r.onsuccess?.();
                                });
                                return r;
                            },
                            put: (val: any, key: string) => {
                                const r: any = { result: key, error: null, onsuccess: null, onerror: null };
                                fireAsync(() => {
                                    storeMap.set(key, val);
                                    r.onsuccess?.();
                                    tx.oncomplete?.();
                                });
                                return r;
                            },
                            delete: (key: string) => {
                                const r: any = { result: undefined, error: null, onsuccess: null, onerror: null };
                                fireAsync(() => {
                                    storeMap.delete(key);
                                    r.onsuccess?.();
                                    tx.oncomplete?.();
                                });
                                return r;
                            },
                        });
                        return tx;
                    },
                    close: () => {},
                };
                req.result = dbObj;
                if (isNew) req.onupgradeneeded?.();
                req.onsuccess?.();
            });
            return req;
        },
    } as unknown as IDBFactory;
    return { factory, stores: dbs };
};

const installBrowserGlobals = (withIndexedDb: boolean = false) => {
    const ls = createMemoryStorage();
    const ss = createMemoryStorage();
    (globalThis as any).localStorage = ls;
    (globalThis as any).sessionStorage = ss;
    let idbHarness: ReturnType<typeof createMemoryIndexedDb> | null = null;
    if (withIndexedDb) {
        idbHarness = createMemoryIndexedDb();
        (globalThis as any).indexedDB = idbHarness.factory;
    } else {
        delete (globalThis as any).indexedDB;
    }
    (globalThis as any).CustomEvent = class CustomEventShim {
        type: string;
        detail: any;
        constructor(type: string, init?: { detail?: any }) {
            this.type = type;
            this.detail = init?.detail;
        }
    };
    (globalThis as any).window = {
        crypto: webcrypto,
        localStorage: ls,
        sessionStorage: ss,
        ...(idbHarness ? { indexedDB: idbHarness.factory } : {}),
        dispatchEvent: () => true,
    };
    return { ls, ss, idbHarness };
};

describe('e2eeService KDF & backward compatibility (Butir 2.1)', () => {
    beforeEach(() => {
        installBrowserGlobals();
        lockDeviceVault();
    });

    it('creates new E2EE config with PBKDF2 600,000 iterations and version 2 metadata', async () => {
        const { config } = await setupE2eeConfig('sandi-pondok-kuat-2026');
        expect(config.version).toBe(E2EE_KDF_VERSION);
        expect(config.kdfVersion).toBe(E2EE_KDF_VERSION);
        expect(config.kdfIterations).toBe(E2EE_KDF_ITERATIONS);
        expect(config.kdfIterations).toBeGreaterThanOrEqual(600000);
        expect(config.recoveryKdfIterations).toBe(E2EE_KDF_ITERATIONS);

        const parsedPwWrap = JSON.parse(config.passwordWrappedMdk);
        expect(parsedPwWrap.iter).toBe(600000);
        expect(parsedPwWrap.v).toBe(2);

        lockDeviceVault();
        const res = await unlockWithPassword(config, 'sandi-pondok-kuat-2026');
        expect(res.migratedConfig).toBeUndefined();
    });

    it('opens legacy 150,000-iteration wrapped key and lazily migrates to 600,000 after verification', async () => {
        const legacyPw = 'sandilama';
        const mdkBytes = webcrypto.getRandomValues(new Uint8Array(32));
        const saltBytes = webcrypto.getRandomValues(new Uint8Array(16));
        const saltB64 = bytesToBase64(saltBytes);
        const keyCheck = await sha256Hex(mdkBytes);

        // Derive legacy 150k wrap key & wrap mdkBytes
        const pwKm = await webcrypto.subtle.importKey('raw', new TextEncoder().encode(legacyPw), 'PBKDF2', false, ['deriveKey']);
        const legacyWrapKey = await webcrypto.subtle.deriveKey(
            { name: 'PBKDF2', salt: saltBytes, iterations: E2EE_LEGACY_KDF_ITERATIONS, hash: 'SHA-256' },
            pwKm,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
        );
        const iv = webcrypto.getRandomValues(new Uint8Array(12));
        const wrappedMdkCt = await webcrypto.subtle.encrypt({ name: 'AES-GCM', iv }, legacyWrapKey, mdkBytes);

        // Create RSA pair & encrypt PKCS8 private key with MDK
        const rsa = await webcrypto.subtle.generateKey(
            { name: 'RSA-OAEP', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
            true,
            ['encrypt', 'decrypt']
        );
        const pubSpki = new Uint8Array(await webcrypto.subtle.exportKey('spki', rsa.publicKey));
        const privPkcs8 = new Uint8Array(await webcrypto.subtle.exportKey('pkcs8', rsa.privateKey));
        const mdkKey = await webcrypto.subtle.importKey('raw', mdkBytes, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
        const pkIv = webcrypto.getRandomValues(new Uint8Array(12));
        const pkCt = await webcrypto.subtle.encrypt({ name: 'AES-GCM', iv: pkIv }, mdkKey, privPkcs8);

        const legacyConfig: E2eeConfig = {
            enabled: true,
            version: 1,
            keyId: 'k_legacy_150k',
            salt: saltB64,
            recoverySalt: saltB64,
            passwordWrappedMdk: JSON.stringify({ iv: bytesToBase64(iv), ct: bytesToBase64(new Uint8Array(wrappedMdkCt)) }),
            recoveryWrappedMdk: JSON.stringify({ iv: bytesToBase64(iv), ct: bytesToBase64(new Uint8Array(wrappedMdkCt)) }),
            publicKeySpki: bytesToBase64(pubSpki),
            encryptedPrivateKeyPkcs8: JSON.stringify({ iv: bytesToBase64(pkIv), ct: bytesToBase64(new Uint8Array(pkCt)) }),
            keyCheck,
            modules: { sync: true, rapor: true, psb: true, portal: true },
            createdAt: '2025-01-01T00:00:00.000Z',
            updatedAt: '2025-01-01T00:00:00.000Z',
        };

        const unlockResult = await unlockWithPassword(legacyConfig, legacyPw);
        expect(unlockResult.migratedConfig).toBeDefined();
        expect(unlockResult.migratedConfig!.kdfIterations).toBe(600000);
        expect(unlockResult.migratedConfig!.kdfVersion).toBe(2);

        // Verify newly migrated config opens cleanly without triggering another migration
        lockDeviceVault();
        const secondUnlock = await unlockWithPassword(unlockResult.migratedConfig!, legacyPw);
        expect(secondUnlock.migratedConfig).toBeUndefined();
    });

    it('supports portal v2 (600k) encryption while still decrypting legacy portal v1 (100k) records', async () => {
        const summary = { id: 7, nis: '2026001', tanggalLahir: '2012-05-14', namaLengkap: 'Santri Uji' };
        const portalId = 'ponpes-uji';

        // New v2 (600k) roundtrip
        const encV2 = await encryptPortalSantriSummary(summary, portalId);
        expect(encV2.v).toBe(2);
        expect(encV2.iter).toBe(600000);
        expect(encV2.nis.startsWith('v3:')).toBe(true);
        const decV2 = await decryptPortalSantriSummary(encV2, portalId, '2026001', '2012-05-14');
        expect(decV2).toEqual(summary);

        // Legacy v1 (100k) compatibility decryption
        const secret = new TextEncoder().encode('esantri-portal-key:2026001|2012-05-14');
        const salt = new TextEncoder().encode('esantri:ponpes-uji:2026001');
        const km = await webcrypto.subtle.importKey('raw', secret, 'PBKDF2', false, ['deriveKey']);
        const legacyPortalKey = await webcrypto.subtle.deriveKey(
            { name: 'PBKDF2', salt, iterations: E2EE_PORTAL_LEGACY_KDF_ITERATIONS, hash: 'SHA-256' },
            km,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt']
        );
        const iv = webcrypto.getRandomValues(new Uint8Array(12));
        const ct = await webcrypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            legacyPortalKey,
            new TextEncoder().encode(JSON.stringify(summary))
        );
        const legacyRec = {
            id: 0,
            nis: 'v2:legacyhash',
            tanggalLahir: 'e2ee',
            __e2eePortal: 1 as const,
            v: 1 as const,
            iv: bytesToBase64(iv),
            ct: bytesToBase64(new Uint8Array(ct)),
        };
        const decLegacy = await decryptPortalSantriSummary(legacyRec, portalId, '2026001', '2012-05-14');
        expect(decLegacy).toEqual(summary);
    });
});

describe('e2eeService password policy (Butir 2.2)', () => {
    beforeEach(() => {
        installBrowserGlobals();
        lockDeviceVault();
    });

    it('rejects passwords shorter than 12 chars on setup, change, and recovery while preserving legacy shorter unlock', async () => {
        expect(E2EE_MIN_PASSWORD_LENGTH).toBe(12);
        await expect(setupE2eeConfig('pendek12345')).rejects.toThrow(/minimal 12 karakter/i);

        const { config, recoveryKey } = await setupE2eeConfig('sandi-pondok-kuat-2026');
        await expect(changeMasterPassword(config, 'sandi-pondok-kuat-2026', 'pendek12345')).rejects.toThrow(/minimal 12 karakter/i);
        await expect(recoverWithRecoveryKey(config, recoveryKey, 'pendek12345')).rejects.toThrow(/minimal 12 karakter/i);

        const changed = await changeMasterPassword(config, 'sandi-pondok-kuat-2026', 'sandi-baru-yang-lebih-panjang');
        lockDeviceVault();
        await expect(unlockWithPassword(changed, 'sandi-baru-yang-lebih-panjang')).resolves.toBeDefined();
    });
});

describe('e2eeService Device Vault v2 (Butir 2.3)', () => {
    it('defaults new setups to session mode and gracefully falls back when IndexedDB is unavailable', async () => {
        const { ls, ss } = installBrowserGlobals(false);
        lockDeviceVault();
        expect(getDeviceVaultMode()).toBe('session');

        const { config } = await setupE2eeConfig('sandi-pondok-kuat-2026');
        expect(getVaultEntryByKeyId(config.keyId)).not.toBeNull();
        expect(ss.getItem(E2EE_DEVICE_VAULT_STORAGE_KEY)).toBeTruthy();
        expect(ls.getItem(E2EE_DEVICE_VAULT_STORAGE_KEY)).toBeNull();
        expect(ls.getItem(E2EE_DEVICE_VAULT_V2_STORAGE_KEY)).toBeNull();

        const modeRes = await setDeviceVaultModeAsync('remember');
        expect(modeRes.fallbackToSession).toBe(true);
        expect(modeRes.effectiveMode).toBe('session');
        expect(ls.getItem(E2EE_DEVICE_VAULT_MODE_KEY)).toBe('session');
        expect(ls.getItem(E2EE_DEVICE_VAULT_STORAGE_KEY)).toBeNull();
    });

    it('wraps vault with non-extractable IDB CryptoKey in remember mode and lazily migrates v1 after verification', async () => {
        const { ls, ss, idbHarness } = installBrowserGlobals(true);
        lockDeviceVault();

        const { config } = await setupE2eeConfig('sandi-pondok-kuat-2026');
        const modeRes = await setDeviceVaultModeAsync('remember');
        expect(modeRes.fallbackToSession).toBe(false);
        expect(modeRes.effectiveMode).toBe('remember');

        // Plaintext v1 must NOT exist; v2 ciphertext must exist without mdkB64 plaintext
        expect(ls.getItem(E2EE_DEVICE_VAULT_STORAGE_KEY)).toBeNull();
        expect(ss.getItem(E2EE_DEVICE_VAULT_STORAGE_KEY)).toBeNull();
        const rawV2 = ls.getItem(E2EE_DEVICE_VAULT_V2_STORAGE_KEY);
        expect(rawV2).toBeTruthy();
        expect(rawV2).not.toContain('mdkB64');
        const parsedV2 = JSON.parse(rawV2!);
        expect(parsedV2.v).toBe(2);

        // Stored IDB CryptoKey must be non-extractable
        const storedKek = idbHarness!.stores.get('esantri_e2ee_device_key_db')?.get('keys')?.get('device_kek_v2');
        expect(storedKek).toBeDefined();
        expect(storedKek.extractable).toBe(false);

        // Simulate fresh reload by wiping memory cache while keeping IDB + v2 localStorage, then hydrate
        const savedV2 = ls.getItem(E2EE_DEVICE_VAULT_V2_STORAGE_KEY)!;
        const savedMode = ls.getItem(E2EE_DEVICE_VAULT_MODE_KEY)!;
        lockDeviceVault();
        expect(getVaultEntryByKeyId(config.keyId)).toBeNull();
        ls.setItem(E2EE_DEVICE_VAULT_V2_STORAGE_KEY, savedV2);
        ls.setItem(E2EE_DEVICE_VAULT_MODE_KEY, savedMode);
        await ensureDeviceVaultHydrated();
        expect(getVaultEntryByKeyId(config.keyId)).not.toBeNull();

        // Simulate legacy v1 plaintext in localStorage and verify lazy v1->v2 migration
        const entryBefore = getVaultEntryByKeyId(config.keyId)!;
        await forgetDeviceVault();
        ls.removeItem(E2EE_DEVICE_VAULT_MODE_KEY);
        ls.setItem(
            E2EE_DEVICE_VAULT_STORAGE_KEY,
            JSON.stringify({
                [config.keyId]: {
                    mdkB64: bytesToBase64(entryBefore.mdkBytes),
                    privateKeyPkcs8B64: bytesToBase64(entryBefore.privateKeyPkcs8Bytes),
                    unlockedAt: entryBefore.unlockedAt,
                },
            })
        );
        expect(getDeviceVaultMode()).toBe('remember');
        await ensureDeviceVaultHydrated();
        expect(ls.getItem(E2EE_DEVICE_VAULT_STORAGE_KEY)).toBeNull();
        expect(ls.getItem(E2EE_DEVICE_VAULT_V2_STORAGE_KEY)).toBeTruthy();
        expect(getVaultEntryByKeyId(config.keyId)).not.toBeNull();

        // forgetDeviceVault wipes IDB key + localStorage + sessionStorage + memory
        await forgetDeviceVault();
        expect(ls.getItem(E2EE_DEVICE_VAULT_V2_STORAGE_KEY)).toBeNull();
        expect(ss.getItem(E2EE_DEVICE_VAULT_STORAGE_KEY)).toBeNull();
        expect(idbHarness!.stores.get('esantri_e2ee_device_key_db')?.get('keys')?.get('device_kek_v2')).toBeUndefined();
        expect(getVaultEntryByKeyId(config.keyId)).toBeNull();
    });
});

describe('e2eeService AES-GCM AAD binding & v1 compatibility (Butir 2.4)', () => {
    it('binds context and docId via AAD for v2 sym_aes & hybrid_rsa and rejects cross-doc/cross-context swaps', async () => {
        installBrowserGlobals(false);
        lockDeviceVault();
        const { config } = await setupE2eeConfig('sandi-pondok-kuat-2026');

        // Symmetric v2 with context & docId
        const symEnv = await encryptObjectSym(
            { nama: 'Zaid', nominal: 500000 },
            config,
            'fs-pembayaran',
            { docId: '101' }
        );
        expect(symEnv.v).toBe(2);
        expect(symEnv.docId).toBe('101');

        await expect(
            decryptObjectSym(symEnv, { expectedContext: 'fs-pembayaran', expectedDocId: '101' })
        ).resolves.toEqual({ nama: 'Zaid', nominal: 500000 });

        // Moving ciphertext to another docId or tampering docId fails
        await expect(
            decryptObjectSym(symEnv, { expectedContext: 'fs-pembayaran', expectedDocId: '102' })
        ).rejects.toThrow();
        await expect(
            decryptObjectSym({ ...symEnv, docId: '102' })
        ).rejects.toThrow();
        await expect(
            decryptObjectSym({ ...symEnv, context: 'fs-tagihan' })
        ).rejects.toThrow();

        // Hybrid v2 with context
        const hybEnv = await encryptObjectHybridWithPublicKey(
            { santriName: 'Ali', nilai: 95 },
            config.publicKeySpki,
            config.keyId,
            { context: 'rapor' }
        );
        expect(hybEnv.v).toBe(2);
        expect(hybEnv.context).toBe('rapor');

        await expect(decryptHybridEnvelope(hybEnv, { expectedContext: 'rapor' })).resolves.toEqual({
            santriName: 'Ali',
            nilai: 95,
        });
        await expect(decryptHybridEnvelope(hybEnv, { expectedContext: 'psb' })).rejects.toThrow();
        await expect(decryptHybridEnvelope({ ...hybEnv, context: 'psb' })).rejects.toThrow();
    });

    it('still decrypts legacy v1 envelopes without AAD', async () => {
        installBrowserGlobals(false);
        lockDeviceVault();
        const { config } = await setupE2eeConfig('sandi-pondok-kuat-2026');
        const entry = getVaultEntryByKeyId(config.keyId)!;

        // Legacy v1 sym_aes (no v field, no AAD)
        const hkdfKey = await webcrypto.subtle.importKey('raw', entry.mdkBytes, 'HKDF', false, ['deriveKey']);
        const symKey = await webcrypto.subtle.deriveKey(
            {
                name: 'HKDF',
                hash: 'SHA-256',
                salt: new TextEncoder().encode('esantri-e2ee-salt-v2'),
                info: new TextEncoder().encode('esantri-e2ee-v2:fs-santri'),
            },
            hkdfKey,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt']
        );
        const iv = webcrypto.getRandomValues(new Uint8Array(12));
        const ct = await webcrypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            symKey,
            new TextEncoder().encode(JSON.stringify({ id: 1, nama: 'Legacy Santri' }))
        );
        const legacySymEnv = {
            __e2ee: 1 as const,
            mode: 'sym_aes' as const,
            kid: config.keyId,
            context: 'fs-santri',
            kdf: 'hkdf-sha256' as const,
            encoding: 'json' as const,
            iv: bytesToBase64(iv),
            ct: bytesToBase64(new Uint8Array(ct)),
        };
        await expect(
            decryptAnyEnvelope(legacySymEnv, { expectedContext: 'fs-santri', expectedDocId: '1' })
        ).resolves.toEqual({ id: 1, nama: 'Legacy Santri' });

        // Legacy v1 hybrid_rsa (no v field, no AAD)
        const aesRaw = webcrypto.getRandomValues(new Uint8Array(32));
        const aesKey = await webcrypto.subtle.importKey('raw', aesRaw, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
        const hIv = webcrypto.getRandomValues(new Uint8Array(12));
        const hCt = await webcrypto.subtle.encrypt(
            { name: 'AES-GCM', iv: hIv },
            aesKey,
            new TextEncoder().encode(JSON.stringify({ namaLengkap: 'Legacy Pendaftar' }))
        );
        const spkiBytes = Uint8Array.from(atob(config.publicKeySpki), (c) => c.charCodeAt(0));
        const pubKey = await webcrypto.subtle.importKey('spki', spkiBytes, { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['encrypt']);
        const ek = await webcrypto.subtle.encrypt({ name: 'RSA-OAEP' }, pubKey, aesRaw);
        const legacyHybridEnv = {
            __e2ee: 1 as const,
            mode: 'hybrid_rsa' as const,
            kid: config.keyId,
            iv: bytesToBase64(hIv),
            ek: bytesToBase64(new Uint8Array(ek)),
            ct: bytesToBase64(new Uint8Array(hCt)),
        };
        await expect(decryptAnyEnvelope(legacyHybridEnv, { expectedContext: 'psb' })).resolves.toEqual({
            namaLengkap: 'Legacy Pendaftar',
        });
    });
});

describe('Butir 2.5 Tolak Plaintext Saat E2EE Aktif', () => {
    beforeEach(() => {
        installBrowserGlobals(false);
        lockDeviceVault();
    });

    it('rejects plaintext JSON and GZIP Sync payloads when rejectPlaintext=true while accepting encrypted bundles', async () => {
        const { decodeSyncPayload, E2eePlaintextRejectedError } = await import('../services/syncService');
        const { encryptBytesSym } = await import('../services/e2eeService');
        const { config } = await setupE2eeConfig('sandi-pondok-kuat-2026');

        const plainBundle = {
            timestamp: '2026-01-01T00:00:00.000Z',
            santri: [{ id: 1, namaLengkap: 'Ahmad' }],
            tagihan: [],
            pembayaran: [],
        };
        const jsonString = JSON.stringify(plainBundle);

        // Plaintext JSON rejected
        await expect(decodeSyncPayload(jsonString, { rejectPlaintext: true })).rejects.toBeInstanceOf(
            E2eePlaintextRejectedError
        );
        // Allowed when explicitly allowed (rejectPlaintext=false)
        await expect(decodeSyncPayload(jsonString, { rejectPlaintext: false })).resolves.toEqual(plainBundle);

        // Plaintext GZIP rejected
        const gzipStream = new Blob([jsonString]).stream().pipeThrough(new CompressionStream('gzip'));
        const gzipBuf = await new Response(gzipStream).arrayBuffer();
        await expect(decodeSyncPayload(gzipBuf, { rejectPlaintext: true })).rejects.toBeInstanceOf(
            E2eePlaintextRejectedError
        );

        // Encrypted E2EE sync-bundle accepted
        const env = await encryptBytesSym(new Uint8Array(gzipBuf), config, 'sync-bundle', 'gzip_b64');
        const decoded = await decodeSyncPayload(JSON.stringify(env), { rejectPlaintext: true });
        expect(decoded).toEqual(plainBundle);
    });

    it('rejects plaintext Firestore documents when rejectPlaintext=true and decrypts valid sym_aes envelopes', async () => {
        const { unwrapFirestoreDocFromCloud } = await import('../services/firebaseRealtimeRuntime');
        const { encryptObjectSym } = await import('../services/e2eeService');
        const { config } = await setupE2eeConfig('sandi-pondok-kuat-2026');

        const plainDoc = { id: 55, namaLengkap: 'Santri Plaintext', lastModified: 1000 };
        const rejRes = await unwrapFirestoreDocFromCloud(plainDoc, {
            expectedContext: 'fs-santri',
            expectedDocId: '55',
            rejectPlaintext: true,
        });
        expect(rejRes.ok).toBe(false);
        expect((rejRes as any).plaintextRejected).toBe(true);
        expect((rejRes as any).rawData).toEqual(plainDoc);

        const allowRes = await unwrapFirestoreDocFromCloud(plainDoc, {
            expectedContext: 'fs-santri',
            expectedDocId: '55',
            rejectPlaintext: false,
        });
        expect(allowRes).toEqual({ ok: true, data: plainDoc });

        const env = await encryptObjectSym(plainDoc, config, 'fs-santri', { docId: '55' });
        const encRes = await unwrapFirestoreDocFromCloud(env, {
            expectedContext: 'fs-santri',
            expectedDocId: '55',
            rejectPlaintext: true,
        });
        expect(encRes).toEqual({ ok: true, data: plainDoc });
    });

    it('rejects plaintext PSB cloud rows when requireEncrypted=true unless allowPlaintext=true', async () => {
        const { decryptPsbCloudRowsWithReport } = await import('../services/psbCloudService');
        const { config } = await setupE2eeConfig('sandi-pondok-kuat-2026');

        const env = await encryptObjectHybridWithPublicKey(
            { namaLengkap: 'Calon Santri', nik: '32010001' },
            config.publicKeySpki,
            config.keyId,
            { context: 'psb' }
        );
        const encRow = {
            id: 1,
            namaLengkap: '[Terenkripsi E2EE]',
            __e2ee_bio: JSON.stringify(env),
            fotoUrl: 'https://drive.google.com/file/d/abc123/view',
        };
        const plainRow = {
            id: 2,
            namaLengkap: 'Calon Plaintext',
            nik: '32019999',
        };

        const strictReport = await decryptPsbCloudRowsWithReport([encRow, plainRow], config.keyId, {
            requireEncrypted: true,
        });
        expect(strictReport.failedCount).toBe(0);
        expect(strictReport.rejectedPlaintextCount).toBe(1);
        expect(strictReport.rejectedPlaintextRows).toEqual([plainRow]);
        expect(strictReport.rows.map((r) => r.namaLengkap)).toEqual(['Calon Santri']);

        const overrideReport = await decryptPsbCloudRowsWithReport([plainRow], config.keyId, {
            requireEncrypted: true,
            allowPlaintext: true,
        });
        expect(overrideReport.rejectedPlaintextCount).toBe(0);
        expect(overrideReport.rows).toHaveLength(1);
    });

    it('rejects plaintext Rapor cloud rows when rejectPlaintext=true and accepts __e2ee_* rows', async () => {
        const { isRaporCloudRowPlaintextRejected } = await import('../services/academicService');

        const plainRaporRow = {
            SantriID: 10,
            TahunAjaran: '2026/2027',
            Semester: 'Ganjil',
            DataJSON: JSON.stringify({ FIQIH: '90' }),
        };
        const encRaporRow = {
            SantriID: 11,
            TahunAjaran: '2026/2027',
            Semester: 'Ganjil',
            DataJSON: JSON.stringify({ __e2ee_123_abc: '{"__e2ee":1,"mode":"hybrid_rsa"}' }),
        };

        expect(isRaporCloudRowPlaintextRejected(plainRaporRow, true)).toBe(true);
        expect(isRaporCloudRowPlaintextRejected(plainRaporRow, false)).toBe(false);
        expect(isRaporCloudRowPlaintextRejected(encRaporRow, true)).toBe(false);
    });
});

describe('e2eeService Portal PIN v3/v4 & security hardening (Butir 2.6)', () => {
    beforeEach(() => {
        installBrowserGlobals();
        lockDeviceVault();
    });

    it('generates 6-digit numeric CSPRNG portal PINs', async () => {
        const { generatePortalPin } = await import('../services/e2eeService');
        const pins = new Set<string>();
        for (let i = 0; i < 20; i++) {
            const pin = generatePortalPin();
            expect(pin).toMatch(/^\d{6}$/);
            pins.add(pin);
        }
        expect(pins.size).toBeGreaterThan(10);
    });

    it('encrypts portal summary with PIN (v3 + AAD + v4 authHash) and rejects wrong PIN or context', async () => {
        const { derivePortalAuthHashCandidates, derivePortalAuthHashV4 } = await import('../services/e2eeService');
        const portalId = 'ponpes-pin-2026';
        const summary = { id: 12, nis: '2026099', tanggalLahir: '2011-08-17', namaLengkap: 'Santri Pin' };
        const pin = '482913';

        const encV3 = await encryptPortalSantriSummary(summary, portalId, pin);
        expect(encV3.v).toBe(3);
        expect(encV3.pinRequired).toBe(1);
        expect(encV3.iter).toBe(600000);
        expect(encV3.nis.startsWith('v4:')).toBe(true);
        expect(encV3.nis).toBe(await derivePortalAuthHashV4(portalId, '2026099', '2011-08-17', pin));

        const candidates = await derivePortalAuthHashCandidates(portalId, '2026099', '2011-08-17', pin);
        expect(candidates).toHaveLength(4);
        expect(candidates[0]).toBe(encV3.nis);

        const decrypted = await decryptPortalSantriSummary(encV3, portalId, '2026099', '2011-08-17', pin);
        expect(decrypted).toEqual(summary);

        await expect(decryptPortalSantriSummary(encV3, portalId, '2026099', '2011-08-17', '000000')).rejects.toThrow();
        await expect(decryptPortalSantriSummary(encV3, portalId, '2026099', '2011-08-17')).rejects.toThrow();
        await expect(decryptPortalSantriSummary(encV3, 'ponpes-lain', '2026099', '2011-08-17', pin)).rejects.toThrow();
    });

    it('supports standalone portal crypto JS helper for v4 authHash & v3 AAD decryption with PIN', async () => {
        const { buildStandalonePortalCryptoJsHelper } = await import('../services/e2eeService');
        const helperCode = buildStandalonePortalCryptoJsHelper();
        new Function(helperCode)();
        const helper = (globalThis as any).window.__esantriPortalCrypto;

        const portalId = 'ponpes-standalone';
        const summary = { id: 44, nis: '2026123', tanggalLahir: '2013-02-10', namaLengkap: 'Ahmad' };
        const pin = '918273';

        const encV3 = await encryptPortalSantriSummary(summary, portalId, pin);
        const helperHashes = await helper.deriveAuthHashes(portalId, '2026123', '2013-02-10', pin);
        expect(helperHashes[0]).toBe(encV3.nis);

        const decrypted = await helper.decryptRecord(encV3, portalId, '2026123', '2013-02-10', pin);
        expect(decrypted).toEqual(summary);
        await expect(helper.decryptRecord(encV3, portalId, '2026123', '2013-02-10', '111111')).rejects.toThrow();
    });

    it('removes GET plaintext nis+dob query fallback and enforces rate limiting in GAS & Worker templates', async () => {
        const fs = await import('node:fs/promises');
        const path = await import('node:path');
        const root = process.cwd();

        const [gasSrc, publicPortalSrc, standaloneSrc] = await Promise.all([
            fs.readFile(path.join(root, 'services/portalGasService.ts'), 'utf8'),
            fs.readFile(path.join(root, 'components/portal/PublicPortal.tsx'), 'utf8'),
            fs.readFile(path.join(root, 'utils/portalStandaloneGenerator.ts'), 'utf8'),
        ]);

        // Tidak ada lagi query URL GET plaintext &nis=...&dob=... atau .concat([{ n: nis, d: dob }])
        expect(gasSrc).not.toContain("url.searchParams.set('nis', cleanNis)");
        expect(gasSrc).not.toContain("url.searchParams.set('dob', cleanDob)");
        expect(publicPortalSrc).not.toContain('&nis=${encodeURIComponent(att.qNis)}&dob=');
        expect(standaloneSrc).not.toContain('concat([{ n: nis, d: dob }])');
        expect(standaloneSrc).not.toContain('"&nis=" + encodeURIComponent(att.n) + "&dob="');

        // Rate limiting di PORTAL_GAS_SCRIPT_V2 dan Cloudflare Worker
        const { getPortalGasScriptV2, getPortalCloudflareWorkerScript } = await import('../services/portalGasService');
        const gasScript = getPortalGasScriptV2('ponpes-uji', '', 'pub_test123', 'adm_test1234567890123456789012345678');
        expect(gasScript).toContain('checkPortalLoginRateLimit');
        expect(gasScript).toContain("if (isGetRequest && dob !== 'e2ee')");
        expect(gasScript).toContain('Data tidak ditemukan atau kredensial tidak sesuai.');

        const workerScript = getPortalCloudflareWorkerScript('ponpes-uji');
        expect(workerScript).toContain('rl_login_');
        expect(workerScript).toContain('if (request.method === "GET" && dob !== "e2ee")');
        expect(workerScript).toContain('Data tidak ditemukan atau kredensial tidak sesuai.');
    });
});

describe('e2eeService Public Key Fingerprint Pinning PSB (Butir 2.7)', () => {
    beforeEach(() => {
        installBrowserGlobals();
        lockDeviceVault();
    });

    it('computes SPKI SHA-256 fingerprint and rejects mismatched/substituted public keys in TS & standalone helper', async () => {
        const {
            assertPinnedPublicKeyFingerprint,
            buildStandaloneHybridEncryptJsHelper,
            computePublicKeyFingerprint,
            encryptObjectHybridWithPublicKey,
            formatPublicKeyFingerprint,
        } = await import('../services/e2eeService');

        const { config: ownerCfg } = await setupE2eeConfig('PassphrasePondok#2026!');
        const { config: attackerCfg } = await setupE2eeConfig('PassphrasePenyerang#99!');

        const fp = await computePublicKeyFingerprint(ownerCfg.publicKeySpki);
        expect(fp).toMatch(/^[a-f0-9]{64}$/);
        expect(ownerCfg.publicKeyFingerprint).toBe(fp);

        await expect(
            assertPinnedPublicKeyFingerprint(ownerCfg.publicKeySpki, formatPublicKeyFingerprint(fp))
        ).resolves.toBe(fp);

        await expect(assertPinnedPublicKeyFingerprint(attackerCfg.publicKeySpki, fp)).rejects.toThrow(/fingerprint/i);
        await expect(
            encryptObjectHybridWithPublicKey({ namaLengkap: 'Santri' }, attackerCfg.publicKeySpki, ownerCfg.keyId, {
                context: 'psb',
                expectedFingerprint: fp,
            })
        ).rejects.toThrow(/fingerprint/i);

        const goodHelper = buildStandaloneHybridEncryptJsHelper(ownerCfg.publicKeySpki, ownerCfg.keyId, 'psb', fp);
        new Function(goodHelper)();
        expect((globalThis as any).window.__esantriE2eePinnedFingerprint).toBe(fp);
        const encEnv = await (globalThis as any).window.__esantriEncryptHybrid({ namaLengkap: 'Calon Valid' });
        expect(encEnv.__e2ee).toBe(1);
        expect(encEnv.v).toBe(2);

        const tamperedHelper = buildStandaloneHybridEncryptJsHelper(attackerCfg.publicKeySpki, ownerCfg.keyId, 'psb', fp);
        new Function(tamperedHelper)();
        await expect((globalThis as any).window.__esantriEncryptHybrid({ namaLengkap: 'MITM' })).rejects.toThrow(
            /fingerprint/i
        );
    });

    it('attaches psbE2ee.fingerprint in buildPublicPsbConfigPayload when active', async () => {
        const { config } = await setupE2eeConfig('PassphrasePondok#2026!');
        const { buildPublicPsbConfigPayload } = await import('../services/portalGasService');
        const built = buildPublicPsbConfigPayload({
            namaYayasan: 'Y',
            namaPonpes: 'Ponpes Uji',
            nspp: '',
            npsn: '',
            alamat: '',
            telepon: '',
            email: '',
            website: '',
            tahunAjaranAktif: '2026/2027',
            semesterAktif: 'Ganjil',
            mudir: '',
            ketuaYayasan: '',
            jenjang: [],
            kelas: [],
            rombel: [],
            e2eeConfig: config,
        } as any);

        expect(built.payload.psbE2ee?.fingerprint).toBe(config.publicKeyFingerprint);
    });
});



