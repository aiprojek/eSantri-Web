import { E2eeConfig, E2eeModuleToggles, PondokSettings } from '../types';

export const E2EE_DEVICE_VAULT_STORAGE_KEY = 'esantri_e2ee_device_vault_v1';
export const E2EE_DEVICE_VAULT_V2_STORAGE_KEY = 'esantri_e2ee_device_vault_v2';
export const E2EE_DEVICE_VAULT_MODE_KEY = 'esantri_e2ee_vault_mode_v1';
export const E2EE_DEVICE_KEY_DB_NAME = 'esantri_e2ee_device_key_db';
export const E2EE_CHANGED_EVENT = 'esantri-e2ee-changed';
export type E2eeDeviceVaultMode = 'remember' | 'session';

export interface E2eeSymEnvelope {
    __e2ee: 1;
    v?: 1 | 2;
    mode: 'sym_aes';
    kid: string;
    context: string;
    docId?: string;
    kdf?: 'hkdf-sha256';
    encoding?: 'gzip_b64' | 'json';
    iv: string;
    ct: string;
}

export interface E2eeHybridEnvelope {
    __e2ee: 1;
    v?: 1 | 2;
    mode: 'hybrid_rsa';
    kid: string;
    context?: string;
    iv: string;
    ek: string;
    ct: string;
}

export interface E2eeDecryptOptions {
    expectedContext?: string;
    expectedDocId?: string;
}

export type E2eeEnvelope = E2eeSymEnvelope | E2eeHybridEnvelope;

interface DeviceVaultEntry {
    mdkB64: string;
    privateKeyPkcs8B64: string;
    unlockedAt: string;
}

type DeviceVaultMap = Record<string, DeviceVaultEntry>;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export const DEFAULT_E2EE_MODULES: E2eeModuleToggles = {
    sync: true,
    rapor: true,
    psb: true,
    portal: true,
};

export const isWebCryptoAvailable = (): boolean => {
    return typeof window !== 'undefined' && Boolean(window.crypto?.subtle);
};

const assertWebCrypto = () => {
    if (!isWebCryptoAvailable()) {
        throw new Error('Web Crypto API (HTTPS/localhost) tidak tersedia di browser ini.');
    }
};

export const bytesToBase64 = (bytes: Uint8Array): string => {
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, i + chunkSize);
        binary += String.fromCharCode(...chunk);
    }
    return btoa(binary);
};

export const base64ToBytes = (b64: string): Uint8Array => {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
};

const toBufferSource = (bytes: Uint8Array): Uint8Array<ArrayBuffer> => {
    const copy = new Uint8Array(bytes.byteLength);
    copy.set(bytes);
    return copy;
};

export const sha256Bytes = async (input: Uint8Array | string): Promise<Uint8Array> => {
    assertWebCrypto();
    const raw = typeof input === 'string' ? textEncoder.encode(input) : input;
    const digest = await window.crypto.subtle.digest('SHA-256', toBufferSource(raw));
    return new Uint8Array(digest);
};

export const sha256Hex = async (input: Uint8Array | string): Promise<string> => {
    const digest = await sha256Bytes(input);
    return Array.from(digest).map(b => b.toString(16).padStart(2, '0')).join('');
};

export const normalizePublicKeyFingerprint = (fingerprint?: string | null): string => {
    return String(fingerprint || '').replace(/[:\s-]+/g, '').trim().toLowerCase();
};

export const formatPublicKeyFingerprint = (fingerprint?: string | null): string => {
    const hex = normalizePublicKeyFingerprint(fingerprint);
    if (!hex) return '';
    return hex.toUpperCase().match(/.{1,4}/g)?.join(':') || hex.toUpperCase();
};

export const computePublicKeyFingerprint = async (publicKeySpki: string): Promise<string> => {
    assertWebCrypto();
    const clean = String(publicKeySpki || '').trim();
    if (!clean) {
        throw new Error('Public Key SPKI E2EE tidak tersedia untuk dihitung fingerprint-nya.');
    }
    const spkiBytes = base64ToBytes(clean);
    return sha256Hex(spkiBytes);
};

export const assertPinnedPublicKeyFingerprint = async (
    publicKeySpki: string,
    pinnedFingerprint?: string | null
): Promise<string> => {
    const actual = await computePublicKeyFingerprint(publicKeySpki);
    const expected = normalizePublicKeyFingerprint(pinnedFingerprint);
    if (expected) {
        if (!/^[a-f0-9]{64}$/.test(expected) || actual !== expected) {
            throw new Error(
                'Public Key E2EE tidak cocok dengan fingerprint yang dipin di formulir! Kemungkinan kunci berubah atau terindikasi MITM.'
            );
        }
    }
    return actual;
};

export const E2EE_KDF_VERSION = 2;
export const E2EE_KDF_ITERATIONS = 600000;
export const E2EE_LEGACY_KDF_ITERATIONS = 150000;
export const E2EE_PORTAL_KDF_ITERATIONS = 600000;
export const E2EE_PORTAL_LEGACY_KDF_ITERATIONS = 100000;
export const E2EE_MIN_PASSWORD_LENGTH = 12;

interface WrappedKeyPayload {
    iv: string;
    ct: string;
    v: number;
    iterations: number;
}

const parseWrappedKeyPayload = (raw: string, fallbackIterations: number): WrappedKeyPayload => {
    const parsed = JSON.parse(raw);
    const iter =
        typeof parsed?.iter === 'number' && Number.isFinite(parsed.iter) && parsed.iter >= 10000
            ? Math.floor(parsed.iter)
            : typeof parsed?.iterations === 'number' && Number.isFinite(parsed.iterations) && parsed.iterations >= 10000
            ? Math.floor(parsed.iterations)
            : fallbackIterations;
    const v = typeof parsed?.v === 'number' && Number.isFinite(parsed.v) ? parsed.v : 1;
    return {
        iv: String(parsed?.iv || ''),
        ct: String(parsed?.ct || ''),
        v,
        iterations: iter,
    };
};

const serializeWrappedKeyPayload = (
    enc: { iv: string; ct: string },
    iterations: number = E2EE_KDF_ITERATIONS,
    kdfVersion: number = E2EE_KDF_VERSION
): string => {
    return JSON.stringify({
        v: kdfVersion,
        iter: iterations,
        iv: enc.iv,
        ct: enc.ct,
    });
};

const derivePbkdf2AesKey = async (
    secret: string,
    saltB64: string,
    iterations: number = E2EE_KDF_ITERATIONS
): Promise<CryptoKey> => {
    assertWebCrypto();
    const keyMaterial = await window.crypto.subtle.importKey(
        'raw',
        toBufferSource(textEncoder.encode(secret)),
        'PBKDF2',
        false,
        ['deriveKey']
    );
    return window.crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: toBufferSource(base64ToBytes(saltB64)),
            iterations,
            hash: 'SHA-256',
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
};

const importRawAesKey = async (keyBytes: Uint8Array): Promise<CryptoKey> => {
    assertWebCrypto();
    return window.crypto.subtle.importKey(
        'raw',
        toBufferSource(keyBytes),
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
};

const aesGcmEncrypt = async (
    key: CryptoKey,
    plaintext: Uint8Array,
    aad?: Uint8Array
): Promise<{ iv: string; ct: string }> => {
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const algo: AesGcmParams = aad
        ? { name: 'AES-GCM', iv: toBufferSource(iv), additionalData: toBufferSource(aad) }
        : { name: 'AES-GCM', iv: toBufferSource(iv) };
    const ctBuffer = await window.crypto.subtle.encrypt(
        algo,
        key,
        toBufferSource(plaintext)
    );
    return {
        iv: bytesToBase64(iv),
        ct: bytesToBase64(new Uint8Array(ctBuffer)),
    };
};

const aesGcmDecrypt = async (
    key: CryptoKey,
    ivB64: string,
    ctB64: string,
    aad?: Uint8Array
): Promise<Uint8Array> => {
    const iv = base64ToBytes(ivB64);
    const ct = base64ToBytes(ctB64);
    const algo: AesGcmParams = aad
        ? { name: 'AES-GCM', iv: toBufferSource(iv), additionalData: toBufferSource(aad) }
        : { name: 'AES-GCM', iv: toBufferSource(iv) };
    const ptBuffer = await window.crypto.subtle.decrypt(
        algo,
        key,
        toBufferSource(ct)
    );
    return new Uint8Array(ptBuffer);
};

const deriveContextAesKey = async (
    mdkBytes: Uint8Array,
    context: string,
    useHkdf: boolean = false
): Promise<CryptoKey> => {
    if (useHkdf) {
        assertWebCrypto();
        const hkdfKey = await window.crypto.subtle.importKey(
            'raw',
            toBufferSource(mdkBytes),
            'HKDF',
            false,
            ['deriveKey']
        );
        return window.crypto.subtle.deriveKey(
            {
                name: 'HKDF',
                hash: 'SHA-256',
                salt: toBufferSource(textEncoder.encode('esantri-e2ee-salt-v2')),
                info: toBufferSource(textEncoder.encode(`esantri-e2ee-v2:${context}`)),
            },
            hkdfKey,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
        );
    }
    const ctxBytes = textEncoder.encode(`esantri-e2ee-v1:${context}`);
    const combined = new Uint8Array(mdkBytes.length + ctxBytes.length);
    combined.set(mdkBytes, 0);
    combined.set(ctxBytes, mdkBytes.length);
    const keyBytes = await sha256Bytes(combined);
    return importRawAesKey(keyBytes);
};

// ============================================================================
// RECOVERY KEY & FILE KUNCI DARURAT
// ============================================================================

const RECOVERY_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const canonicalizeRecoveryKey = (input: string): string => {
    return String(input || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
};

export const generateRecoveryKeyString = (): string => {
    const random = window.crypto.getRandomValues(new Uint8Array(20));
    let chars = '';
    for (let i = 0; i < 20; i++) {
        chars += RECOVERY_ALPHABET[random[i] % RECOVERY_ALPHABET.length];
    }
    return `ESNTR-${chars.slice(0, 4)}-${chars.slice(4, 8)}-${chars.slice(8, 12)}-${chars.slice(12, 16)}-${chars.slice(16, 20)}`;
};

const KEY_BUNDLE_BEGIN = '-----BEGIN ESANTRI E2EE KEY BUNDLE-----';
const KEY_BUNDLE_END = '-----END ESANTRI E2EE KEY BUNDLE-----';

export const buildEmergencyKeyFileText = (
    pondokName: string,
    config: E2eeConfig,
    recoveryKey: string
): string => {
    // Bundle hanya berisi kunci terbungkus (recoveryWrappedMdk, passwordWrappedMdk, encryptedPrivateKeyPkcs8) & metadata publik.
    // Aman disimpan offline karena tanpa Recovery Key / Master Password bundle ini tidak bisa membuka MDK.
    const bundlePayload = {
        v: config.kdfVersion || (config.kdfIterations && config.kdfIterations >= E2EE_KDF_ITERATIONS ? E2EE_KDF_VERSION : 1),
        kdfVersion: config.kdfVersion,
        kdfIterations: config.kdfIterations,
        recoveryKdfIterations: config.recoveryKdfIterations,
        keyId: config.keyId,
        salt: config.salt,
        recoverySalt: config.recoverySalt,
        passwordWrappedMdk: config.passwordWrappedMdk,
        recoveryWrappedMdk: config.recoveryWrappedMdk,
        publicKeySpki: config.publicKeySpki,
        encryptedPrivateKeyPkcs8: config.encryptedPrivateKeyPkcs8,
        keyCheck: config.keyCheck,
        passwordHint: config.passwordHint || '',
        modules: config.modules || DEFAULT_E2EE_MODULES,
        createdAt: config.createdAt,
    };
    const bundleB64 = bytesToBase64(textEncoder.encode(JSON.stringify(bundlePayload)));
    const bundleWrapped = (bundleB64.match(/.{1,64}/g) || [bundleB64]).join('\n');

    const lines = [
        '================================================================',
        'FILE KUNCI DARURAT E2EE - eSantri Web',
        '================================================================',
        `Pondok Pesantren : ${pondokName || 'eSantri Web'}`,
        `Key ID           : ${config.keyId}`,
        `Dibuat Pada      : ${new Date().toLocaleString('id-ID')}`,
        config.passwordHint ? `Petunjuk (Hint)  : ${config.passwordHint}` : '',
        '----------------------------------------------------------------',
        'RECOVERY KEY :',
        recoveryKey,
        '----------------------------------------------------------------',
        KEY_BUNDLE_BEGIN,
        bundleWrapped,
        KEY_BUNDLE_END,
        '----------------------------------------------------------------',
        'PERINGATAN KEAMANAN:',
        '1. Simpan file ini di tempat yang sangat aman (Flashdisk offline,',
        '   brankas, atau Password Manager). Jangan upload ke cloud publik.',
        '2. File ini bersifat SELF-CONTAINED: berisi Recovery Key sekaligus',
        '   cadangan Key Bundle terenkripsi untuk memulihkan E2EE bahkan pada',
        '   perangkat baru atau setelah reset browser.',
        '3. Anda dapat mengunggah file .txt ini pada menu Pengaturan >',
        '   User & Keamanan > Pulihkan E2EE.',
        '================================================================',
    ].filter(Boolean);
    return lines.join('\n');
};

export const parseEmergencyKeyFileText = (content: string): string | null => {
    const match = content.match(/ESNTR-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}/i);
    if (match) return match[0].toUpperCase();
    const cleaned = canonicalizeRecoveryKey(content);
    if (cleaned.startsWith('ESNTR') && cleaned.length === 25) {
        const body = cleaned.slice(5);
        return `ESNTR-${body.slice(0, 4)}-${body.slice(4, 8)}-${body.slice(8, 12)}-${body.slice(12, 16)}-${body.slice(16, 20)}`;
    }
    return null;
};

export const parseEmergencyKeyFileBundle = (
    content: string
): { recoveryKey: string | null; bundledConfig: E2eeConfig | null } => {
    const recoveryKey = parseEmergencyKeyFileText(content);
    let bundledConfig: E2eeConfig | null = null;

    const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const bundleMatch = content.match(
        new RegExp(`${escapeRegex(KEY_BUNDLE_BEGIN)}([\\s\\S]*?)${escapeRegex(KEY_BUNDLE_END)}`)
    );
    if (bundleMatch && bundleMatch[1]) {
        try {
            const cleanB64 = bundleMatch[1].replace(/\s+/g, '');
            const jsonStr = textDecoder.decode(base64ToBytes(cleanB64));
            const raw = JSON.parse(jsonStr);
            if (
                raw &&
                typeof raw === 'object' &&
                typeof raw.keyId === 'string' &&
                typeof raw.recoverySalt === 'string' &&
                typeof raw.recoveryWrappedMdk === 'string' &&
                typeof raw.publicKeySpki === 'string' &&
                typeof raw.encryptedPrivateKeyPkcs8 === 'string' &&
                typeof raw.keyCheck === 'string'
            ) {
                const parsedPwIter =
                    typeof raw.kdfIterations === 'number' && Number.isFinite(raw.kdfIterations) && raw.kdfIterations >= 10000
                        ? Math.floor(raw.kdfIterations)
                        : Number(raw.v) >= 2
                        ? E2EE_KDF_ITERATIONS
                        : E2EE_LEGACY_KDF_ITERATIONS;
                const parsedRkIter =
                    typeof raw.recoveryKdfIterations === 'number' && Number.isFinite(raw.recoveryKdfIterations) && raw.recoveryKdfIterations >= 10000
                        ? Math.floor(raw.recoveryKdfIterations)
                        : parsedPwIter;
                bundledConfig = {
                    enabled: true,
                    version: Number(raw.v) >= 2 ? 2 : 1,
                    kdfVersion: typeof raw.kdfVersion === 'number' ? raw.kdfVersion : (parsedPwIter >= E2EE_KDF_ITERATIONS ? E2EE_KDF_VERSION : 1),
                    kdfIterations: parsedPwIter,
                    recoveryKdfIterations: parsedRkIter,
                    keyId: raw.keyId,
                    salt: String(raw.salt || raw.recoverySalt),
                    recoverySalt: raw.recoverySalt,
                    passwordWrappedMdk: String(raw.passwordWrappedMdk || raw.recoveryWrappedMdk),
                    recoveryWrappedMdk: raw.recoveryWrappedMdk,
                    publicKeySpki: raw.publicKeySpki,
                    encryptedPrivateKeyPkcs8: raw.encryptedPrivateKeyPkcs8,
                    keyCheck: raw.keyCheck,
                    passwordHint: typeof raw.passwordHint === 'string' ? raw.passwordHint : '',
                    modules: {
                        sync: Boolean(raw.modules?.sync ?? true),
                        rapor: Boolean(raw.modules?.rapor ?? true),
                        psb: Boolean(raw.modules?.psb ?? true),
                        portal: Boolean(raw.modules?.portal ?? true),
                    },
                    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                };
            }
        } catch {
            bundledConfig = null;
        }
    }

    return { recoveryKey, bundledConfig };
};

// ============================================================================
// DEVICE VAULT (DEFAULT SESSION + REMEMBER VIA NON-EXTRACTABLE IDB CRYPTOKEY)
// ============================================================================

const DEVICE_KEY_STORE_NAME = 'keys';
const DEVICE_KEY_RECORD_ID = 'device_kek_v2';
const DEVICE_VAULT_V2_AAD = textEncoder.encode('esantri-device-vault-v2');

let memoryVaultCache: DeviceVaultMap = {};
let deviceVaultHydratePromise: Promise<void> | null = null;

const getSafeLocalStorage = (): Storage | undefined => {
    try {
        if (typeof localStorage !== 'undefined') return localStorage;
        if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
    } catch {
        // ignore
    }
    return undefined;
};

const getSafeSessionStorage = (): Storage | undefined => {
    try {
        if (typeof sessionStorage !== 'undefined') return sessionStorage;
        if (typeof window !== 'undefined' && window.sessionStorage) return window.sessionStorage;
    } catch {
        // ignore
    }
    return undefined;
};

const getIndexedDbApi = (): IDBFactory | undefined => {
    try {
        if (typeof indexedDB !== 'undefined' && typeof indexedDB?.open === 'function') return indexedDB;
        if (typeof window !== 'undefined' && typeof (window as any).indexedDB?.open === 'function') {
            return (window as any).indexedDB;
        }
    } catch {
        // ignore
    }
    return undefined;
};

const openDeviceKeyDb = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const idb = getIndexedDbApi();
        if (!idb) {
            reject(new Error('IndexedDB tidak tersedia.'));
            return;
        }
        const req = idb.open(E2EE_DEVICE_KEY_DB_NAME, 1);
        req.onupgradeneeded = () => {
            const dbInstance = req.result;
            if (!dbInstance.objectStoreNames.contains(DEVICE_KEY_STORE_NAME)) {
                dbInstance.createObjectStore(DEVICE_KEY_STORE_NAME);
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error || new Error('Gagal membuka IndexedDB device key.'));
    });
};

const readKeyFromIdb = (dbInstance: IDBDatabase): Promise<CryptoKey | null> => {
    return new Promise((resolve, reject) => {
        const tx = dbInstance.transaction(DEVICE_KEY_STORE_NAME, 'readonly');
        const store = tx.objectStore(DEVICE_KEY_STORE_NAME);
        const req = store.get(DEVICE_KEY_RECORD_ID);
        req.onsuccess = () => resolve((req.result as CryptoKey) || null);
        req.onerror = () => reject(req.error || new Error('Gagal membaca device key dari IndexedDB.'));
    });
};

const writeKeyToIdb = (dbInstance: IDBDatabase, key: CryptoKey): Promise<void> => {
    return new Promise((resolve, reject) => {
        const tx = dbInstance.transaction(DEVICE_KEY_STORE_NAME, 'readwrite');
        const store = tx.objectStore(DEVICE_KEY_STORE_NAME);
        const req = store.put(key, DEVICE_KEY_RECORD_ID);
        tx.oncomplete = () => resolve();
        req.onerror = () => reject(req.error || new Error('Gagal menyimpan device key ke IndexedDB.'));
        tx.onerror = () => reject(tx.error || new Error('Transaksi IndexedDB gagal.'));
    });
};

const deleteDeviceKekFromIdb = async (): Promise<void> => {
    const idb = getIndexedDbApi();
    if (!idb) return;
    let dbInstance: IDBDatabase | null = null;
    try {
        dbInstance = await openDeviceKeyDb();
        await new Promise<void>((resolve, reject) => {
            const tx = dbInstance!.transaction(DEVICE_KEY_STORE_NAME, 'readwrite');
            const store = tx.objectStore(DEVICE_KEY_STORE_NAME);
            const req = store.delete(DEVICE_KEY_RECORD_ID);
            tx.oncomplete = () => resolve();
            req.onerror = () => reject(req.error || new Error('Gagal menghapus device key.'));
            tx.onerror = () => reject(tx.error || new Error('Transaksi hapus IndexedDB gagal.'));
        });
    } catch {
        // ignore if IDB blocked/unavailable
    } finally {
        try {
            dbInstance?.close();
        } catch {
            // ignore
        }
    }
};

const getOrCreateNonExtractableDeviceKek = async (createIfMissing: boolean): Promise<CryptoKey | null> => {
    if (!isWebCryptoAvailable() || !getIndexedDbApi()) return null;
    let dbInstance: IDBDatabase | null = null;
    try {
        dbInstance = await openDeviceKeyDb();
        const existing = await readKeyFromIdb(dbInstance);
        if (existing) return existing;
        if (!createIfMissing) return null;

        const generated = await window.crypto.subtle.generateKey(
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
        );
        await writeKeyToIdb(dbInstance, generated);
        return generated;
    } catch {
        return null;
    } finally {
        try {
            dbInstance?.close();
        } catch {
            // ignore
        }
    }
};

export const getDeviceVaultMode = (): E2eeDeviceVaultMode => {
    const ls = getSafeLocalStorage();
    if (!ls) return 'session';
    try {
        const mode = ls.getItem(E2EE_DEVICE_VAULT_MODE_KEY);
        if (mode === 'session') return 'session';
        if (mode === 'remember') return 'remember';
        // Setup baru default 'session'; pertahankan 'remember' hanya jika vault v1/v2 lama sudah ada
        if (ls.getItem(E2EE_DEVICE_VAULT_V2_STORAGE_KEY) || ls.getItem(E2EE_DEVICE_VAULT_STORAGE_KEY)) {
            return 'remember';
        }
        return 'session';
    } catch {
        return 'session';
    }
};

const readVaultFromStorage = (storage: Storage | undefined, storageKey: string = E2EE_DEVICE_VAULT_STORAGE_KEY): DeviceVaultMap => {
    if (!storage) return {};
    try {
        const raw = storage.getItem(storageKey);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return {};
        // Abaikan struktur terenkripsi v2 pada pembacaan plaintext
        if (parsed.v === 2 && typeof parsed.ct === 'string' && typeof parsed.iv === 'string') {
            return {};
        }
        return parsed as DeviceVaultMap;
    } catch {
        return {};
    }
};

const readDeviceVault = (): DeviceVaultMap => {
    const ss = getSafeSessionStorage();
    const ls = getSafeLocalStorage();
    return {
        ...readVaultFromStorage(ls, E2EE_DEVICE_VAULT_STORAGE_KEY),
        ...readVaultFromStorage(ss, E2EE_DEVICE_VAULT_STORAGE_KEY),
        ...memoryVaultCache,
    };
};

const dispatchE2eeChangedEvent = () => {
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
        try {
            window.dispatchEvent(new CustomEvent(E2EE_CHANGED_EVENT));
        } catch {
            // ignore
        }
    }
};

const writeWrappedVaultV2WithVerify = async (vault: DeviceVaultMap, kek: CryptoKey): Promise<string> => {
    const plainBytes = textEncoder.encode(JSON.stringify(vault));
    const enc = await aesGcmEncrypt(kek, plainBytes, DEVICE_VAULT_V2_AAD);
    const serialized = JSON.stringify({ v: 2, iv: enc.iv, ct: enc.ct });
    const parsedCheck = JSON.parse(serialized);
    const decryptedBytes = await aesGcmDecrypt(kek, parsedCheck.iv, parsedCheck.ct, DEVICE_VAULT_V2_AAD);
    const roundtripObj = JSON.parse(textDecoder.decode(decryptedBytes));
    for (const kid of Object.keys(vault)) {
        if (
            roundtripObj?.[kid]?.mdkB64 !== vault[kid]?.mdkB64 ||
            roundtripObj?.[kid]?.privateKeyPkcs8B64 !== vault[kid]?.privateKeyPkcs8B64
        ) {
            throw new Error('Verifikasi roundtrip device vault v2 gagal.');
        }
    }
    return serialized;
};

const persistDeviceVaultAsync = async (
    vault: DeviceVaultMap
): Promise<{ effectiveMode: E2eeDeviceVaultMode; fallbackToSession: boolean }> => {
    memoryVaultCache = { ...vault };
    const ls = getSafeLocalStorage();
    const ss = getSafeSessionStorage();
    const requestedMode = getDeviceVaultMode();

    if (Object.keys(vault).length === 0) {
        try {
            ls?.removeItem(E2EE_DEVICE_VAULT_STORAGE_KEY);
            ls?.removeItem(E2EE_DEVICE_VAULT_V2_STORAGE_KEY);
            ss?.removeItem(E2EE_DEVICE_VAULT_STORAGE_KEY);
        } catch {
            // ignore
        }
        dispatchE2eeChangedEvent();
        return { effectiveMode: requestedMode, fallbackToSession: false };
    }

    if (requestedMode === 'remember') {
        try {
            const kek = await getOrCreateNonExtractableDeviceKek(true);
            if (!kek) {
                throw new Error('IndexedDB CryptoKey tidak tersedia.');
            }
            const serializedV2 = await writeWrappedVaultV2WithVerify(vault, kek);
            ls?.setItem(E2EE_DEVICE_VAULT_V2_STORAGE_KEY, serializedV2);
            ls?.removeItem(E2EE_DEVICE_VAULT_STORAGE_KEY);
            ss?.removeItem(E2EE_DEVICE_VAULT_STORAGE_KEY);
            dispatchE2eeChangedEvent();
            return { effectiveMode: 'remember', fallbackToSession: false };
        } catch {
            // Fallback aman ke mode session bila IndexedDB tidak tersedia
            try {
                ss?.setItem(E2EE_DEVICE_VAULT_STORAGE_KEY, JSON.stringify(vault));
                ls?.removeItem(E2EE_DEVICE_VAULT_V2_STORAGE_KEY);
                ls?.removeItem(E2EE_DEVICE_VAULT_STORAGE_KEY);
                ls?.setItem(E2EE_DEVICE_VAULT_MODE_KEY, 'session');
            } catch {
                // ignore
            }
            dispatchE2eeChangedEvent();
            return { effectiveMode: 'session', fallbackToSession: true };
        }
    }

    try {
        ss?.setItem(E2EE_DEVICE_VAULT_STORAGE_KEY, JSON.stringify(vault));
        ls?.removeItem(E2EE_DEVICE_VAULT_STORAGE_KEY);
        ls?.removeItem(E2EE_DEVICE_VAULT_V2_STORAGE_KEY);
    } catch (err) {
        console.warn('Gagal menyimpan device vault E2EE sesi:', err);
    }
    dispatchE2eeChangedEvent();
    return { effectiveMode: 'session', fallbackToSession: false };
};

export const ensureDeviceVaultHydrated = async (): Promise<void> => {
    if (deviceVaultHydratePromise) {
        return deviceVaultHydratePromise;
    }

    deviceVaultHydratePromise = (async () => {
        const ls = getSafeLocalStorage();
        const ss = getSafeSessionStorage();
        let changed = false;

        const ssVault = readVaultFromStorage(ss, E2EE_DEVICE_VAULT_STORAGE_KEY);
        for (const [k, v] of Object.entries(ssVault)) {
            if (!memoryVaultCache[k] && v?.mdkB64 && v?.privateKeyPkcs8B64) {
                memoryVaultCache[k] = v;
                changed = true;
            }
        }

        if (ls) {
            const v2Raw = ls.getItem(E2EE_DEVICE_VAULT_V2_STORAGE_KEY);
            if (v2Raw) {
                try {
                    const parsedV2 = JSON.parse(v2Raw);
                    if (parsedV2?.v === 2 && typeof parsedV2.iv === 'string' && typeof parsedV2.ct === 'string') {
                        const kek = await getOrCreateNonExtractableDeviceKek(false);
                        if (kek) {
                            const ptBytes = await aesGcmDecrypt(kek, parsedV2.iv, parsedV2.ct, DEVICE_VAULT_V2_AAD);
                            const v2Map = JSON.parse(textDecoder.decode(ptBytes)) as DeviceVaultMap;
                            if (v2Map && typeof v2Map === 'object') {
                                for (const [k, v] of Object.entries(v2Map)) {
                                    if (!memoryVaultCache[k] && v?.mdkB64 && v?.privateKeyPkcs8B64) {
                                        memoryVaultCache[k] = v;
                                        changed = true;
                                    }
                                }
                            }
                        }
                    }
                } catch {
                    // Biarkan tetap terkunci jika vault v2 korup atau KEK hilang
                }
            }

            const v1Raw = ls.getItem(E2EE_DEVICE_VAULT_STORAGE_KEY);
            if (v1Raw) {
                const v1Map = readVaultFromStorage(ls, E2EE_DEVICE_VAULT_STORAGE_KEY);
                const validV1Keys = Object.keys(v1Map).filter(
                    (k) => v1Map[k]?.mdkB64 && v1Map[k]?.privateKeyPkcs8B64
                );
                if (validV1Keys.length > 0) {
                    for (const k of validV1Keys) {
                        if (!memoryVaultCache[k]) {
                            memoryVaultCache[k] = v1Map[k];
                            changed = true;
                        }
                    }

                    // Migrasi malas terverifikasi dari v1 plaintext localStorage ke v2 IDB-wrapped
                    if (getDeviceVaultMode() === 'remember') {
                        try {
                            const kek = await getOrCreateNonExtractableDeviceKek(true);
                            if (kek) {
                                const mergedToMigrate: DeviceVaultMap = { ...v1Map, ...memoryVaultCache };
                                const serializedV2 = await writeWrappedVaultV2WithVerify(mergedToMigrate, kek);
                                ls.setItem(E2EE_DEVICE_VAULT_V2_STORAGE_KEY, serializedV2);
                                ls.removeItem(E2EE_DEVICE_VAULT_STORAGE_KEY);
                                changed = true;
                            }
                        } catch {
                            // Jangan hapus v1 jika migrasi gagal atau IDB tidak tersedia
                        }
                    }
                }
            }
        }

        if (changed) {
            dispatchE2eeChangedEvent();
        }
    })().finally(() => {
        deviceVaultHydratePromise = null;
    });

    return deviceVaultHydratePromise;
};

export const setDeviceVaultModeAsync = async (
    mode: E2eeDeviceVaultMode
): Promise<{ effectiveMode: E2eeDeviceVaultMode; fallbackToSession: boolean }> => {
    await ensureDeviceVaultHydrated();
    const existing = readDeviceVault();
    const ls = getSafeLocalStorage();
    try {
        ls?.setItem(E2EE_DEVICE_VAULT_MODE_KEY, mode);
    } catch {
        // ignore
    }
    if (mode === 'session') {
        await deleteDeviceKekFromIdb();
    }
    return persistDeviceVaultAsync(existing);
};

export const setDeviceVaultMode = (mode: E2eeDeviceVaultMode) => {
    const ls = getSafeLocalStorage();
    try {
        ls?.setItem(E2EE_DEVICE_VAULT_MODE_KEY, mode);
    } catch {
        // ignore
    }
    void setDeviceVaultModeAsync(mode);
};

export const saveVaultEntryAsync = async (
    keyId: string,
    mdkBytes: Uint8Array,
    privateKeyPkcs8Bytes: Uint8Array
): Promise<{ effectiveMode: E2eeDeviceVaultMode; fallbackToSession: boolean }> => {
    const nextVault: DeviceVaultMap = {
        ...readDeviceVault(),
        [keyId]: {
            mdkB64: bytesToBase64(mdkBytes),
            privateKeyPkcs8B64: bytesToBase64(privateKeyPkcs8Bytes),
            unlockedAt: new Date().toISOString(),
        },
    };
    return persistDeviceVaultAsync(nextVault);
};

export const saveVaultEntry = (keyId: string, mdkBytes: Uint8Array, privateKeyPkcs8Bytes: Uint8Array) => {
    const nextVault: DeviceVaultMap = {
        ...readDeviceVault(),
        [keyId]: {
            mdkB64: bytesToBase64(mdkBytes),
            privateKeyPkcs8B64: bytesToBase64(privateKeyPkcs8Bytes),
            unlockedAt: new Date().toISOString(),
        },
    };
    memoryVaultCache = nextVault;
    if (getDeviceVaultMode() === 'session') {
        try {
            getSafeSessionStorage()?.setItem(E2EE_DEVICE_VAULT_STORAGE_KEY, JSON.stringify(nextVault));
        } catch {
            // ignore
        }
    }
    void persistDeviceVaultAsync(nextVault);
};

export const getVaultEntryByKeyId = (keyId?: string | null): { mdkBytes: Uint8Array; privateKeyPkcs8Bytes: Uint8Array; unlockedAt: string } | null => {
    if (!keyId) return null;
    const vault = readDeviceVault();
    const entry = vault[keyId];
    if (!entry?.mdkB64 || !entry?.privateKeyPkcs8B64) return null;
    try {
        return {
            mdkBytes: base64ToBytes(entry.mdkB64),
            privateKeyPkcs8Bytes: base64ToBytes(entry.privateKeyPkcs8B64),
            unlockedAt: entry.unlockedAt,
        };
    } catch {
        return null;
    }
};

export const isE2eeActive = (settings?: Partial<PondokSettings> | null, moduleName?: keyof E2eeModuleToggles): boolean => {
    const cfg = settings?.e2eeConfig;
    if (!cfg || !cfg.enabled) return false;
    if (!moduleName) return true;
    return Boolean(cfg.modules?.[moduleName]);
};

export const isDeviceUnlockedForConfig = (config?: E2eeConfig | null): boolean => {
    if (!config || !config.enabled) return true;
    return Boolean(getVaultEntryByKeyId(config.keyId));
};

export const needsDeviceUnlock = (settings?: Partial<PondokSettings> | null): boolean => {
    const cfg = settings?.e2eeConfig;
    if (!cfg?.enabled) return false;
    return !isDeviceUnlockedForConfig(cfg);
};

export const lockDeviceVault = (keyId?: string) => {
    const ls = getSafeLocalStorage();
    const ss = getSafeSessionStorage();
    if (!keyId) {
        memoryVaultCache = {};
        try {
            ls?.removeItem(E2EE_DEVICE_VAULT_STORAGE_KEY);
            ls?.removeItem(E2EE_DEVICE_VAULT_V2_STORAGE_KEY);
            ss?.removeItem(E2EE_DEVICE_VAULT_STORAGE_KEY);
        } catch {
            // ignore
        }
        dispatchE2eeChangedEvent();
        return;
    }
    const nextVault = { ...readDeviceVault() };
    delete nextVault[keyId];
    memoryVaultCache = nextVault;
    if (Object.keys(nextVault).length === 0) {
        try {
            ls?.removeItem(E2EE_DEVICE_VAULT_STORAGE_KEY);
            ls?.removeItem(E2EE_DEVICE_VAULT_V2_STORAGE_KEY);
            ss?.removeItem(E2EE_DEVICE_VAULT_STORAGE_KEY);
        } catch {
            // ignore
        }
        dispatchE2eeChangedEvent();
        return;
    }
    void persistDeviceVaultAsync(nextVault);
};

export const forgetDeviceVault = async (keyId?: string): Promise<void> => {
    const ls = getSafeLocalStorage();
    const ss = getSafeSessionStorage();
    if (!keyId) {
        memoryVaultCache = {};
        try {
            ls?.removeItem(E2EE_DEVICE_VAULT_STORAGE_KEY);
            ls?.removeItem(E2EE_DEVICE_VAULT_V2_STORAGE_KEY);
            ss?.removeItem(E2EE_DEVICE_VAULT_STORAGE_KEY);
        } catch {
            // ignore
        }
        await deleteDeviceKekFromIdb();
        dispatchE2eeChangedEvent();
        return;
    }
    const nextVault = { ...readDeviceVault() };
    delete nextVault[keyId];
    if (Object.keys(nextVault).length === 0) {
        await forgetDeviceVault();
        return;
    }
    await persistDeviceVaultAsync(nextVault);
};

// ============================================================================
// SETUP, UNLOCK, CHANGE PASSWORD & RECOVERY
// ============================================================================

export const setupE2eeConfig = async (
    masterPassword: string,
    modules: E2eeModuleToggles = DEFAULT_E2EE_MODULES,
    passwordHint?: string
): Promise<{ config: E2eeConfig; recoveryKey: string }> => {
    assertWebCrypto();
    if (!masterPassword || masterPassword.length < E2EE_MIN_PASSWORD_LENGTH) {
        throw new Error(`Master Password minimal ${E2EE_MIN_PASSWORD_LENGTH} karakter.`);
    }

    const mdkBytes = window.crypto.getRandomValues(new Uint8Array(32));
    const keyPair = await window.crypto.subtle.generateKey(
        {
            name: 'RSA-OAEP',
            modulusLength: 2048,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: 'SHA-256',
        },
        true,
        ['encrypt', 'decrypt']
    );

    const publicSpkiBuffer = await window.crypto.subtle.exportKey('spki', keyPair.publicKey);
    const privatePkcs8Buffer = await window.crypto.subtle.exportKey('pkcs8', keyPair.privateKey);
    const privatePkcs8Bytes = new Uint8Array(privatePkcs8Buffer);

    const mdkKey = await importRawAesKey(mdkBytes);
    const encPrivateKey = await aesGcmEncrypt(mdkKey, privatePkcs8Bytes);

    const salt = bytesToBase64(window.crypto.getRandomValues(new Uint8Array(16)));
    const recoverySalt = bytesToBase64(window.crypto.getRandomValues(new Uint8Array(16)));
    const recoveryKey = generateRecoveryKeyString();

    const pwWrapKey = await derivePbkdf2AesKey(masterPassword, salt, E2EE_KDF_ITERATIONS);
    const rkWrapKey = await derivePbkdf2AesKey(canonicalizeRecoveryKey(recoveryKey), recoverySalt, E2EE_KDF_ITERATIONS);

    const passwordWrappedMdk = serializeWrappedKeyPayload(await aesGcmEncrypt(pwWrapKey, mdkBytes), E2EE_KDF_ITERATIONS, E2EE_KDF_VERSION);
    const recoveryWrappedMdk = serializeWrappedKeyPayload(await aesGcmEncrypt(rkWrapKey, mdkBytes), E2EE_KDF_ITERATIONS, E2EE_KDF_VERSION);
    const keyCheck = await sha256Hex(mdkBytes);

    const randomHex = Array.from(window.crypto.getRandomValues(new Uint8Array(4)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    const keyId = `k_${Date.now().toString(36)}_${randomHex}`;
    const now = new Date().toISOString();

    const publicKeySpki = bytesToBase64(new Uint8Array(publicSpkiBuffer));
    const publicKeyFingerprint = await sha256Hex(new Uint8Array(publicSpkiBuffer));

    const config: E2eeConfig = {
        enabled: true,
        version: E2EE_KDF_VERSION,
        kdfVersion: E2EE_KDF_VERSION,
        kdfIterations: E2EE_KDF_ITERATIONS,
        recoveryKdfIterations: E2EE_KDF_ITERATIONS,
        keyId,
        salt,
        recoverySalt,
        passwordWrappedMdk,
        recoveryWrappedMdk,
        publicKeySpki,
        publicKeyFingerprint,
        encryptedPrivateKeyPkcs8: JSON.stringify(encPrivateKey),
        keyCheck,
        passwordHint: passwordHint?.trim() || '',
        modules: {
            sync: Boolean(modules.sync),
            rapor: Boolean(modules.rapor),
            psb: Boolean(modules.psb),
            portal: Boolean(modules.portal),
        },
        createdAt: now,
        updatedAt: now,
    };

    await saveVaultEntryAsync(keyId, mdkBytes, privatePkcs8Bytes);

    return { config, recoveryKey };
};

export const unlockWithPassword = async (
    config: E2eeConfig,
    password: string
): Promise<{ migratedConfig?: E2eeConfig }> => {
    assertWebCrypto();
    if (!password) throw new Error('Masukkan Master Password.');

    let mdkBytes: Uint8Array;
    let usedIterations = E2EE_LEGACY_KDF_ITERATIONS;
    try {
        const fallbackIter =
            typeof config.kdfIterations === 'number' && config.kdfIterations >= 10000
                ? config.kdfIterations
                : E2EE_LEGACY_KDF_ITERATIONS;
        const wrapped = parseWrappedKeyPayload(config.passwordWrappedMdk, fallbackIter);
        usedIterations = wrapped.iterations;
        const wrapKey = await derivePbkdf2AesKey(password, config.salt, usedIterations);
        mdkBytes = await aesGcmDecrypt(wrapKey, wrapped.iv, wrapped.ct);
    } catch {
        throw new Error('Master Password salah atau tidak sesuai.');
    }

    const check = await sha256Hex(mdkBytes);
    if (check !== config.keyCheck) {
        throw new Error('Master Password tidak cocok dengan sidik jari kunci.');
    }

    const mdkKey = await importRawAesKey(mdkBytes);
    const encPk = JSON.parse(config.encryptedPrivateKeyPkcs8);
    const privatePkcs8Bytes = await aesGcmDecrypt(mdkKey, encPk.iv, encPk.ct);

    await saveVaultEntryAsync(config.keyId, mdkBytes, privatePkcs8Bytes);

    let migratedConfig: E2eeConfig | undefined;
    if (usedIterations < E2EE_KDF_ITERATIONS) {
        try {
            const newSalt = bytesToBase64(window.crypto.getRandomValues(new Uint8Array(16)));
            const newPwWrapKey = await derivePbkdf2AesKey(password, newSalt, E2EE_KDF_ITERATIONS);
            const newWrappedEnc = await aesGcmEncrypt(newPwWrapKey, mdkBytes);
            const newPasswordWrappedMdk = serializeWrappedKeyPayload(newWrappedEnc, E2EE_KDF_ITERATIONS, E2EE_KDF_VERSION);

            // Verifikasi bungkus baru bisa dibuka sebelum mengganti bungkus lama
            const verifyParsed = parseWrappedKeyPayload(newPasswordWrappedMdk, E2EE_KDF_ITERATIONS);
            const verifyKey = await derivePbkdf2AesKey(password, newSalt, verifyParsed.iterations);
            const verifiedMdk = await aesGcmDecrypt(verifyKey, verifyParsed.iv, verifyParsed.ct);
            if ((await sha256Hex(verifiedMdk)) === config.keyCheck) {
                migratedConfig = {
                    ...config,
                    version: E2EE_KDF_VERSION,
                    kdfVersion: E2EE_KDF_VERSION,
                    kdfIterations: E2EE_KDF_ITERATIONS,
                    salt: newSalt,
                    passwordWrappedMdk: newPasswordWrappedMdk,
                    updatedAt: new Date().toISOString(),
                };
            }
        } catch {
            // Jika migrasi malas gagal, tetap biarkan bungkus lama utuh tanpa merusak akses
            migratedConfig = undefined;
        }
    }

    return { migratedConfig };
};

export const recoverWithRecoveryKey = async (
    config: E2eeConfig,
    recoveryKeyInput: string,
    newPassword: string,
    newHint?: string
): Promise<E2eeConfig> => {
    assertWebCrypto();
    if (!newPassword || newPassword.length < E2EE_MIN_PASSWORD_LENGTH) {
        throw new Error(`Password baru minimal ${E2EE_MIN_PASSWORD_LENGTH} karakter.`);
    }
    const canonical = canonicalizeRecoveryKey(recoveryKeyInput);
    if (!canonical) {
        throw new Error('Recovery Key tidak valid.');
    }

    let mdkBytes: Uint8Array;
    let usedRkIterations = E2EE_LEGACY_KDF_ITERATIONS;
    try {
        const fallbackRkIter =
            typeof config.recoveryKdfIterations === 'number' && config.recoveryKdfIterations >= 10000
                ? config.recoveryKdfIterations
                : typeof config.kdfIterations === 'number' && config.kdfIterations >= 10000
                ? config.kdfIterations
                : E2EE_LEGACY_KDF_ITERATIONS;
        const wrapped = parseWrappedKeyPayload(config.recoveryWrappedMdk, fallbackRkIter);
        usedRkIterations = wrapped.iterations;
        const rkWrapKey = await derivePbkdf2AesKey(canonical, config.recoverySalt, usedRkIterations);
        mdkBytes = await aesGcmDecrypt(rkWrapKey, wrapped.iv, wrapped.ct);
    } catch {
        throw new Error('Recovery Key salah atau tidak cocok dengan Key ID ini.');
    }

    const check = await sha256Hex(mdkBytes);
    if (check !== config.keyCheck) {
        throw new Error('Verifikasi kunci gagal.');
    }

    const mdkKey = await importRawAesKey(mdkBytes);
    const encPk = JSON.parse(config.encryptedPrivateKeyPkcs8);
    const privatePkcs8Bytes = await aesGcmDecrypt(mdkKey, encPk.iv, encPk.ct);

    const newSalt = bytesToBase64(window.crypto.getRandomValues(new Uint8Array(16)));
    const newPwWrapKey = await derivePbkdf2AesKey(newPassword, newSalt, E2EE_KDF_ITERATIONS);
    const newPwEnc = await aesGcmEncrypt(newPwWrapKey, mdkBytes);
    const newPasswordWrappedMdk = serializeWrappedKeyPayload(newPwEnc, E2EE_KDF_ITERATIONS, E2EE_KDF_VERSION);

    let nextRecoverySalt = config.recoverySalt;
    let nextRecoveryWrappedMdk = config.recoveryWrappedMdk;
    let nextRecoveryKdfIterations = usedRkIterations;
    if (usedRkIterations < E2EE_KDF_ITERATIONS) {
        try {
            const candidateRkSalt = bytesToBase64(window.crypto.getRandomValues(new Uint8Array(16)));
            const candidateRkKey = await derivePbkdf2AesKey(canonical, candidateRkSalt, E2EE_KDF_ITERATIONS);
            const candidateRkEnc = await aesGcmEncrypt(candidateRkKey, mdkBytes);
            const candidateRkWrapped = serializeWrappedKeyPayload(candidateRkEnc, E2EE_KDF_ITERATIONS, E2EE_KDF_VERSION);
            const verifyRkKey = await derivePbkdf2AesKey(canonical, candidateRkSalt, E2EE_KDF_ITERATIONS);
            const verifiedRkMdk = await aesGcmDecrypt(verifyRkKey, candidateRkEnc.iv, candidateRkEnc.ct);
            if ((await sha256Hex(verifiedRkMdk)) === config.keyCheck) {
                nextRecoverySalt = candidateRkSalt;
                nextRecoveryWrappedMdk = candidateRkWrapped;
                nextRecoveryKdfIterations = E2EE_KDF_ITERATIONS;
            }
        } catch {
            // Pertahankan bungkus recovery lama bila verifikasi gagal
        }
    }

    await saveVaultEntryAsync(config.keyId, mdkBytes, privatePkcs8Bytes);

    return {
        ...config,
        enabled: true,
        version: E2EE_KDF_VERSION,
        kdfVersion: E2EE_KDF_VERSION,
        kdfIterations: E2EE_KDF_ITERATIONS,
        recoveryKdfIterations: nextRecoveryKdfIterations,
        salt: newSalt,
        recoverySalt: nextRecoverySalt,
        passwordWrappedMdk: newPasswordWrappedMdk,
        recoveryWrappedMdk: nextRecoveryWrappedMdk,
        passwordHint: newHint !== undefined ? newHint.trim() : config.passwordHint,
        updatedAt: new Date().toISOString(),
    };
};

export const changeMasterPassword = async (
    config: E2eeConfig,
    currentPassword: string,
    newPassword: string,
    newHint?: string
): Promise<E2eeConfig> => {
    assertWebCrypto();
    if (!newPassword || newPassword.length < E2EE_MIN_PASSWORD_LENGTH) {
        throw new Error(`Password baru minimal ${E2EE_MIN_PASSWORD_LENGTH} karakter.`);
    }

    await unlockWithPassword(config, currentPassword);
    await ensureDeviceVaultHydrated();
    const entry = getVaultEntryByKeyId(config.keyId);
    if (!entry) throw new Error('Gagal membuka kunci perangkat.');

    const newSalt = bytesToBase64(window.crypto.getRandomValues(new Uint8Array(16)));
    const newPwWrapKey = await derivePbkdf2AesKey(newPassword, newSalt, E2EE_KDF_ITERATIONS);
    const newPasswordWrappedMdk = serializeWrappedKeyPayload(
        await aesGcmEncrypt(newPwWrapKey, entry.mdkBytes),
        E2EE_KDF_ITERATIONS,
        E2EE_KDF_VERSION
    );

    return {
        ...config,
        version: E2EE_KDF_VERSION,
        kdfVersion: E2EE_KDF_VERSION,
        kdfIterations: E2EE_KDF_ITERATIONS,
        salt: newSalt,
        passwordWrappedMdk: newPasswordWrappedMdk,
        passwordHint: newHint !== undefined ? newHint.trim() : config.passwordHint,
        updatedAt: new Date().toISOString(),
    };
};

export const regenerateRecoveryKey = async (
    config: E2eeConfig
): Promise<{ config: E2eeConfig; recoveryKey: string }> => {
    assertWebCrypto();
    await ensureDeviceVaultHydrated();
    const entry = getVaultEntryByKeyId(config.keyId);
    if (!entry) {
        throw new Error('Buka kunci E2EE di perangkat ini terlebih dahulu sebelum membuat ulang Recovery Key.');
    }

    const recoverySalt = bytesToBase64(window.crypto.getRandomValues(new Uint8Array(16)));
    const recoveryKey = generateRecoveryKeyString();
    const rkWrapKey = await derivePbkdf2AesKey(canonicalizeRecoveryKey(recoveryKey), recoverySalt, E2EE_KDF_ITERATIONS);
    const recoveryWrappedMdk = serializeWrappedKeyPayload(
        await aesGcmEncrypt(rkWrapKey, entry.mdkBytes),
        E2EE_KDF_ITERATIONS,
        E2EE_KDF_VERSION
    );

    return {
        config: {
            ...config,
            version: E2EE_KDF_VERSION,
            kdfVersion: E2EE_KDF_VERSION,
            recoveryKdfIterations: E2EE_KDF_ITERATIONS,
            recoverySalt,
            recoveryWrappedMdk,
            updatedAt: new Date().toISOString(),
        },
        recoveryKey,
    };
};

// ============================================================================
// SYMMETRIC E2EE ENVELOPE (MULTI-ADMIN CLOUD SYNC: DROPBOX / WEBDAV / FIREBASE)
// ============================================================================

export const isE2eeEnvelope = (value: any): value is E2eeEnvelope => {
    return Boolean(
        value &&
        typeof value === 'object' &&
        value.__e2ee === 1 &&
        (value.mode === 'sym_aes' || value.mode === 'hybrid_rsa') &&
        typeof value.iv === 'string' &&
        typeof value.ct === 'string'
    );
};

export const tryParseE2eeEnvelope = (value: any): E2eeEnvelope | null => {
    if (!value) return null;
    if (isE2eeEnvelope(value)) return value;
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed.startsWith('{')) return null;
        try {
            const parsed = JSON.parse(trimmed);
            return isE2eeEnvelope(parsed) ? parsed : null;
        } catch {
            return null;
        }
    }
    return null;
};

const buildSymAad = (kid: string, context: string, docId?: string): Uint8Array => {
    return textEncoder.encode(`v2|sym_aes|${String(kid || '')}|${String(context || '-')}|${String(docId || '-')}`);
};

const buildHybridAad = (kid: string, context?: string): Uint8Array => {
    return textEncoder.encode(`v2|hybrid_rsa|${String(kid || '')}|${String(context || 'hybrid')}`);
};

export const encryptBytesSym = async (
    plainBytes: Uint8Array,
    config: E2eeConfig,
    context: string,
    encoding: 'gzip_b64' | 'json' = 'gzip_b64',
    options?: { docId?: string }
): Promise<E2eeSymEnvelope> => {
    await ensureDeviceVaultHydrated();
    const entry = getVaultEntryByKeyId(config.keyId);
    if (!entry) {
        throw new Error('E2EE_LOCKED: Perangkat ini belum dibuka kuncinya. Masukkan Master Password E2EE di Pengaturan atau banner atas.');
    }
    const cleanDocId = options?.docId !== undefined && options?.docId !== '' ? String(options.docId) : undefined;
    const key = await deriveContextAesKey(entry.mdkBytes, context, true);
    const aad = buildSymAad(config.keyId, context, cleanDocId);
    const { iv, ct } = await aesGcmEncrypt(key, plainBytes, aad);
    return {
        __e2ee: 1,
        v: 2,
        mode: 'sym_aes',
        kid: config.keyId,
        context,
        ...(cleanDocId ? { docId: cleanDocId } : {}),
        kdf: 'hkdf-sha256',
        encoding,
        iv,
        ct,
    };
};

export const decryptBytesSym = async (
    envelope: E2eeSymEnvelope,
    options?: E2eeDecryptOptions
): Promise<Uint8Array> => {
    await ensureDeviceVaultHydrated();
    const entry = getVaultEntryByKeyId(envelope.kid);
    if (!entry) {
        throw new Error(`E2EE_LOCKED: Data terenkripsi (${envelope.kid}). Buka kunci perangkat ini dengan Master Password E2EE terlebih dahulu.`);
    }
    const isV2 = envelope.v === 2;
    if (isV2) {
        if (options?.expectedContext && envelope.context !== options.expectedContext) {
            throw new Error(`Konteks amplop E2EE tidak sesuai (${envelope.context} !== ${options.expectedContext}).`);
        }
        if (options?.expectedDocId !== undefined && String(envelope.docId || '') !== String(options.expectedDocId)) {
            throw new Error('ID dokumen amplop E2EE tidak sesuai (AAD mismatch).');
        }
    }
    const effectiveContext = envelope.context || 'sync';
    const key = await deriveContextAesKey(entry.mdkBytes, effectiveContext, envelope.kdf === 'hkdf-sha256');
    const aad = isV2
        ? buildSymAad(
              envelope.kid,
              options?.expectedContext || effectiveContext,
              options?.expectedDocId !== undefined ? options.expectedDocId : envelope.docId
          )
        : undefined;
    try {
        return await aesGcmDecrypt(key, envelope.iv, envelope.ct, aad);
    } catch {
        throw new Error('Gagal mendekripsi data cloud. Pastikan kunci & konteks E2EE sesuai.');
    }
};

export const encryptObjectSym = async (
    obj: any,
    config: E2eeConfig,
    context: string,
    options?: { docId?: string }
): Promise<E2eeSymEnvelope> => {
    const bytes = textEncoder.encode(JSON.stringify(obj));
    return encryptBytesSym(bytes, config, context, 'json', options);
};

export const decryptObjectSym = async <T = any>(
    envelope: E2eeSymEnvelope,
    options?: E2eeDecryptOptions
): Promise<T> => {
    const bytes = await decryptBytesSym(envelope, options);
    return JSON.parse(textDecoder.decode(bytes)) as T;
};

export interface LocalBerkasEncryptionMeta {
    iv: string;
    kid: string;
    context: string;
    kdf: 'hkdf-sha256';
}

export const BERKAS_LOCAL_E2EE_CONTEXT = 'berkas-local';

export const encryptLocalBerkasBlob = async (
    plainBlob: Blob,
    config: E2eeConfig,
    options?: { context?: string; docId?: string }
): Promise<{ encryptedBlob: Blob; encryptionMeta: LocalBerkasEncryptionMeta }> => {
    assertWebCrypto();
    await ensureDeviceVaultHydrated();
    const entry = getVaultEntryByKeyId(config.keyId);
    if (!entry) {
        throw new Error(
            'E2EE_LOCKED: Perangkat ini belum dibuka kuncinya. Masukkan Master Password E2EE sebelum menyimpan berkas terenkripsi.'
        );
    }
    const context = options?.context || BERKAS_LOCAL_E2EE_CONTEXT;
    const cleanDocId = options?.docId !== undefined && options?.docId !== '' ? String(options.docId) : undefined;
    const key = await deriveContextAesKey(entry.mdkBytes, context, true);
    const aad = buildSymAad(config.keyId, context, cleanDocId);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const plainBytes = new Uint8Array(await plainBlob.arrayBuffer());
    const ctBuffer = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: toBufferSource(iv), additionalData: toBufferSource(aad) },
        key,
        toBufferSource(plainBytes)
    );
    return {
        encryptedBlob: new Blob([new Uint8Array(ctBuffer)], { type: 'application/octet-stream' }),
        encryptionMeta: {
            iv: bytesToBase64(iv),
            kid: config.keyId,
            context,
            kdf: 'hkdf-sha256',
        },
    };
};

export const decryptLocalBerkasBlob = async (
    encryptedBlob: Blob,
    meta: LocalBerkasEncryptionMeta,
    mime: string,
    options?: { expectedContext?: string; expectedDocId?: string }
): Promise<Blob> => {
    assertWebCrypto();
    await ensureDeviceVaultHydrated();
    const entry = getVaultEntryByKeyId(meta.kid);
    if (!entry) {
        throw new Error(
            `E2EE_LOCKED: Berkas terenkripsi (${meta.kid}). Buka kunci perangkat ini dengan Master Password E2EE terlebih dahulu.`
        );
    }
    const expectedContext = options?.expectedContext || BERKAS_LOCAL_E2EE_CONTEXT;
    if (meta.context !== expectedContext) {
        throw new Error(`Konteks enkripsi berkas tidak sesuai (${meta.context} !== ${expectedContext}).`);
    }
    const cleanDocId =
        options?.expectedDocId !== undefined && options?.expectedDocId !== ''
            ? String(options.expectedDocId)
            : undefined;
    const key = await deriveContextAesKey(entry.mdkBytes, meta.context, true);
    const aad = buildSymAad(meta.kid, meta.context, cleanDocId);
    const iv = base64ToBytes(meta.iv);
    const ctBytes = new Uint8Array(await encryptedBlob.arrayBuffer());
    try {
        const plainBuffer = await window.crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: toBufferSource(iv), additionalData: toBufferSource(aad) },
            key,
            toBufferSource(ctBytes)
        );
        return new Blob([new Uint8Array(plainBuffer)], { type: mime || 'application/octet-stream' });
    } catch {
        throw new Error('Gagal mendekripsi berkas lokal. Pastikan kunci E2EE sesuai atau berkas tidak rusak.');
    }
};

// ============================================================================
// HYBRID RSA-OAEP + AES-GCM ENVELOPE (PSB & RAPOR FORM HTML / CLOUD STAGING)
// ============================================================================

export const encryptObjectHybridWithPublicKey = async (
    payload: any,
    publicKeySpki: string,
    keyId: string,
    options?: { context?: string; expectedFingerprint?: string }
): Promise<E2eeHybridEnvelope> => {
    assertWebCrypto();
    if (options?.expectedFingerprint) {
        await assertPinnedPublicKeyFingerprint(publicKeySpki, options.expectedFingerprint);
    }
    const pubKey = await window.crypto.subtle.importKey(
        'spki',
        toBufferSource(base64ToBytes(publicKeySpki)),
        { name: 'RSA-OAEP', hash: 'SHA-256' },
        false,
        ['encrypt']
    );

    const context = String(options?.context || 'hybrid').trim() || 'hybrid';
    const aesKeyBytes = window.crypto.getRandomValues(new Uint8Array(32));
    const aesKey = await importRawAesKey(aesKeyBytes);
    const ptBytes = textEncoder.encode(JSON.stringify(payload));
    const aad = buildHybridAad(keyId, context);
    const { iv, ct } = await aesGcmEncrypt(aesKey, ptBytes, aad);

    const ekBuffer = await window.crypto.subtle.encrypt(
        { name: 'RSA-OAEP' },
        pubKey,
        toBufferSource(aesKeyBytes)
    );

    return {
        __e2ee: 1,
        v: 2,
        mode: 'hybrid_rsa',
        kid: keyId,
        context,
        iv,
        ek: bytesToBase64(new Uint8Array(ekBuffer)),
        ct,
    };
};

export const decryptHybridEnvelope = async <T = any>(
    envelope: E2eeHybridEnvelope,
    options?: E2eeDecryptOptions
): Promise<T> => {
    assertWebCrypto();
    await ensureDeviceVaultHydrated();
    const entry = getVaultEntryByKeyId(envelope.kid);
    if (!entry) {
        throw new Error(`E2EE_LOCKED: Data terenkripsi (${envelope.kid}). Silakan buka kunci E2EE dengan Master Password terlebih dahulu.`);
    }

    const isV2 = envelope.v === 2;
    if (isV2 && options?.expectedContext && envelope.context !== options.expectedContext) {
        throw new Error(`Konteks amplop hybrid E2EE tidak sesuai (${envelope.context || '-'} !== ${options.expectedContext}).`);
    }

    const privateKey = await window.crypto.subtle.importKey(
        'pkcs8',
        toBufferSource(entry.privateKeyPkcs8Bytes),
        { name: 'RSA-OAEP', hash: 'SHA-256' },
        false,
        ['decrypt']
    );

    const aesKeyBuffer = await window.crypto.subtle.decrypt(
        { name: 'RSA-OAEP' },
        privateKey,
        toBufferSource(base64ToBytes(envelope.ek))
    );
    const aesKey = await importRawAesKey(new Uint8Array(aesKeyBuffer));
    const aad = isV2
        ? buildHybridAad(envelope.kid, options?.expectedContext || envelope.context || 'hybrid')
        : undefined;
    const ptBytes = await aesGcmDecrypt(aesKey, envelope.iv, envelope.ct, aad);
    return JSON.parse(textDecoder.decode(ptBytes)) as T;
};

export const decryptAnyEnvelope = async <T = any>(
    envelopeOrStr: any,
    options?: E2eeDecryptOptions
): Promise<T> => {
    const env = tryParseE2eeEnvelope(envelopeOrStr);
    if (!env) {
        throw new Error('Format amplop E2EE tidak dikenali.');
    }
    if (env.mode === 'hybrid_rsa') {
        return decryptHybridEnvelope<T>(env, options);
    }
    return decryptObjectSym<T>(env, options);
};

// ============================================================================
// PORTAL WALI SANTRI ZERO-KNOWLEDGE PER-STUDENT E2EE
// ============================================================================

export const normalizePortalNis = (nis: string): string => {
    return String(nis || '').trim().replace(/\s+/g, '').toLowerCase();
};

export const normalizePortalDob = (dob: string): string => {
    const clean = String(dob || '').trim();
    if (!clean) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;
    if (/^\d{4}\/\d{2}\/\d{2}$/.test(clean)) return clean.replace(/\//g, '-');
    const dmY = clean.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);
    if (dmY) return `${dmY[3]}-${dmY[2]}-${dmY[1]}`;
    const yMdT = clean.match(/^(\d{4}-\d{2}-\d{2})T/);
    if (yMdT) return yMdT[1];
    return clean;
};

export const normalizePortalPin = (pin?: string): string => {
    return String(pin || '').replace(/\s+/g, '').trim();
};

export const generatePortalPin = (length: number = 6): string => {
    assertWebCrypto();
    const targetLen = Math.max(6, Math.floor(length));
    const out: string[] = [];
    const buf = new Uint8Array(16);
    while (out.length < targetLen) {
        window.crypto.getRandomValues(buf);
        for (let i = 0; i < buf.length && out.length < targetLen; i++) {
            // Rejection sampling (< 250) agar distribusi digit 0-9 seragam tanpa modulo bias
            if (buf[i] < 250) {
                out.push(String(buf[i] % 10));
            }
        }
    }
    return out.join('');
};

export const derivePortalPinVerificationHash = async (
    portalId: string,
    nis: string,
    pin: string
): Promise<string> => {
    const pid = String(portalId || 'default').trim();
    const normNis = normalizePortalNis(nis);
    const normPin = normalizePortalPin(pin);
    if (!normPin) return '';
    return sha256Hex(`esantri-portal-pin-verify:${pid}:${normNis}|${normPin}`);
};

export const derivePortalAuthHashLegacyV1 = async (
    portalId: string,
    nis: string,
    dob: string
): Promise<string> => {
    const pid = String(portalId || 'default').trim();
    const normNis = normalizePortalNis(nis);
    const normDob = normalizePortalDob(dob);
    return sha256Hex(`esantri-portal-auth:${pid}:${normNis}|${normDob}`);
};

export const derivePortalAuthHashLegacyV2 = async (
    portalId: string,
    nis: string,
    dob: string
): Promise<string> => {
    assertWebCrypto();
    const pid = String(portalId || 'default').trim();
    const normNis = normalizePortalNis(nis);
    const normDob = normalizePortalDob(dob);
    const secret = textEncoder.encode(`esantri-portal-auth:${normNis}|${normDob}`);
    const salt = textEncoder.encode(`esantri-auth-v2:${pid}:${normNis}`);
    const keyMaterial = await window.crypto.subtle.importKey(
        'raw',
        toBufferSource(secret),
        'PBKDF2',
        false,
        ['deriveBits']
    );
    const bits = await window.crypto.subtle.deriveBits(
        {
            name: 'PBKDF2',
            salt: toBufferSource(salt),
            iterations: E2EE_PORTAL_LEGACY_KDF_ITERATIONS,
            hash: 'SHA-256',
        },
        keyMaterial,
        256
    );
    const hex = Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('');
    return `v2:${hex}`;
};

export const derivePortalAuthHash = async (
    portalId: string,
    nis: string,
    dob: string
): Promise<string> => {
    assertWebCrypto();
    const pid = String(portalId || 'default').trim();
    const normNis = normalizePortalNis(nis);
    const normDob = normalizePortalDob(dob);
    const secret = textEncoder.encode(`esantri-portal-auth:${normNis}|${normDob}`);
    const salt = textEncoder.encode(`esantri-auth-v2:${pid}:${normNis}`);
    const keyMaterial = await window.crypto.subtle.importKey(
        'raw',
        toBufferSource(secret),
        'PBKDF2',
        false,
        ['deriveBits']
    );
    const bits = await window.crypto.subtle.deriveBits(
        {
            name: 'PBKDF2',
            salt: toBufferSource(salt),
            iterations: E2EE_PORTAL_KDF_ITERATIONS,
            hash: 'SHA-256',
        },
        keyMaterial,
        256
    );
    const hex = Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('');
    return `v3:${hex}`;
};

export const derivePortalAuthHashV4 = async (
    portalId: string,
    nis: string,
    dob: string,
    pin: string
): Promise<string> => {
    assertWebCrypto();
    const pid = String(portalId || 'default').trim();
    const normNis = normalizePortalNis(nis);
    const normDob = normalizePortalDob(dob);
    const normPin = normalizePortalPin(pin);
    if (!normPin) {
        throw new Error('PIN Portal Santri wajib diisi untuk menurunkan kunci autentikasi v4.');
    }
    const secret = textEncoder.encode(`esantri-portal-auth:${normNis}|${normDob}|${normPin}`);
    const salt = textEncoder.encode(`esantri-auth-v4:${pid}:${normNis}`);
    const keyMaterial = await window.crypto.subtle.importKey(
        'raw',
        toBufferSource(secret),
        'PBKDF2',
        false,
        ['deriveBits']
    );
    const bits = await window.crypto.subtle.deriveBits(
        {
            name: 'PBKDF2',
            salt: toBufferSource(salt),
            iterations: E2EE_PORTAL_KDF_ITERATIONS,
            hash: 'SHA-256',
        },
        keyMaterial,
        256
    );
    const hex = Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('');
    return `v4:${hex}`;
};

export const derivePortalAuthHashCandidates = async (
    portalId: string,
    nis: string,
    dob: string,
    pin?: string
): Promise<string[]> => {
    const normPin = normalizePortalPin(pin);
    const promises: Array<Promise<string>> = [
        derivePortalAuthHash(portalId, nis, dob),
        derivePortalAuthHashLegacyV2(portalId, nis, dob),
        derivePortalAuthHashLegacyV1(portalId, nis, dob),
    ];
    if (normPin) {
        promises.unshift(derivePortalAuthHashV4(portalId, nis, dob, normPin));
    }
    return Promise.all(promises);
};

const deterministicFnvHex64 = (input: string): string => {
    // Pure-JS deterministic 64-char hex fallback ONLY for plaintext Firestore doc lookup when Web Crypto is absent
    const bytes = textEncoder.encode(input);
    const out: string[] = [];
    for (let round = 0; round < 8; round++) {
        let h = (0x811c9dc5 ^ (round * 0x9e3779b1)) >>> 0;
        for (let i = 0; i < bytes.length; i++) {
            h ^= bytes[i] ^ round;
            h = Math.imul(h, 0x01000193) >>> 0;
        }
        out.push(h.toString(16).padStart(8, '0'));
    }
    return out.join('');
};

export const sanitizeFirebasePortalEntryId = (rawKey: string): string => {
    return String(rawKey || '').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128);
};

export const deriveFirebasePortalPlainLookupKey = async (
    portalId: string,
    nis: string,
    dob: string
): Promise<string> => {
    const pid = String(portalId || 'default').trim();
    const normNis = normalizePortalNis(nis);
    const normDob = normalizePortalDob(dob);
    const raw = `esantri-fb-plain:${pid}:${normNis}|${normDob}`;
    if (isWebCryptoAvailable()) {
        const hex = await sha256Hex(raw);
        return `p_${hex}`;
    }
    return `pf_${deterministicFnvHex64(raw)}`;
};

export const deriveFirebasePortalPinLookupKey = async (
    portalId: string,
    nis: string,
    dob: string,
    pin: string
): Promise<string> => {
    const pid = String(portalId || 'default').trim();
    const normNis = normalizePortalNis(nis);
    const normDob = normalizePortalDob(dob);
    const normPin = normalizePortalPin(pin);
    const raw = `esantri-fb-pin:${pid}:${normNis}|${normDob}|${normPin}`;
    if (isWebCryptoAvailable()) {
        const hex = await sha256Hex(raw);
        return `pp_${hex}`;
    }
    return `ppf_${deterministicFnvHex64(raw)}`;
};

export const deriveFirebasePortalLookupCandidates = async (
    portalId: string,
    nis: string,
    dob: string,
    pin?: string
): Promise<string[]> => {
    const candidates: string[] = [];
    const normPin = normalizePortalPin(pin);
    if (isWebCryptoAvailable()) {
        const authHashes = await derivePortalAuthHashCandidates(portalId, nis, dob, normPin);
        authHashes.forEach((h) => candidates.push(sanitizeFirebasePortalEntryId(h)));
    }
    if (normPin) {
        const pinLookup = await deriveFirebasePortalPinLookupKey(portalId, nis, dob, normPin);
        candidates.push(pinLookup);
        const fallbackPin = `ppf_${deterministicFnvHex64(`esantri-fb-pin:${String(portalId || 'default').trim()}:${normalizePortalNis(nis)}|${normalizePortalDob(dob)}|${normPin}`)}`;
        if (!candidates.includes(fallbackPin)) {
            candidates.push(fallbackPin);
        }
    }
    const plainKey = await deriveFirebasePortalPlainLookupKey(portalId, nis, dob);
    candidates.push(plainKey);
    const pid = String(portalId || 'default').trim();
    const normNis = normalizePortalNis(nis);
    const normDob = normalizePortalDob(dob);
    const fallbackPlain = `pf_${deterministicFnvHex64(`esantri-fb-plain:${pid}:${normNis}|${normDob}`)}`;
    if (!candidates.includes(fallbackPlain)) {
        candidates.push(fallbackPlain);
    }
    return candidates;
};

const derivePortalStudentAesKey = async (
    portalId: string,
    nis: string,
    dob: string,
    iterations: number = E2EE_PORTAL_KDF_ITERATIONS
): Promise<CryptoKey> => {
    assertWebCrypto();
    const pid = String(portalId || 'default').trim();
    const normNis = normalizePortalNis(nis);
    const normDob = normalizePortalDob(dob);
    const secret = `esantri-portal-key:${normNis}|${normDob}`;
    const salt = textEncoder.encode(`esantri:${pid}:${normNis}`);

    const keyMaterial = await window.crypto.subtle.importKey(
        'raw',
        toBufferSource(textEncoder.encode(secret)),
        'PBKDF2',
        false,
        ['deriveKey']
    );
    return window.crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: toBufferSource(salt),
            iterations,
            hash: 'SHA-256',
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
};

const derivePortalStudentAesKeyV3 = async (
    portalId: string,
    nis: string,
    dob: string,
    pin: string,
    iterations: number = E2EE_PORTAL_KDF_ITERATIONS
): Promise<CryptoKey> => {
    assertWebCrypto();
    const pid = String(portalId || 'default').trim();
    const normNis = normalizePortalNis(nis);
    const normDob = normalizePortalDob(dob);
    const normPin = normalizePortalPin(pin);
    if (!normPin) {
        throw new Error('PIN Portal Santri wajib diisi.');
    }
    const secret = `esantri-portal-key:${normNis}|${normDob}|${normPin}`;
    const salt = textEncoder.encode(`esantri-v3:${pid}:${normNis}`);

    const keyMaterial = await window.crypto.subtle.importKey(
        'raw',
        toBufferSource(textEncoder.encode(secret)),
        'PBKDF2',
        false,
        ['deriveKey']
    );
    return window.crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: toBufferSource(salt),
            iterations,
            hash: 'SHA-256',
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
};

const buildPortalV3AadBytes = (portalId: string, nis: string): Uint8Array => {
    const pid = String(portalId || 'default').trim();
    const normNis = normalizePortalNis(nis);
    return textEncoder.encode(`v3|portal|${pid}|${normNis}`);
};

export interface EncryptedPortalSantriRecord {
    id: number;
    nis: string; // authHash
    tanggalLahir: string; // 'e2ee'
    namaLengkap?: string;
    __e2eePortal: 1;
    v: 1 | 2 | 3;
    pinRequired?: 1;
    iter?: number;
    iv: string;
    ct: string;
}

export const isEncryptedPortalRecord = (rec: any): rec is EncryptedPortalSantriRecord => {
    return Boolean(rec && typeof rec === 'object' && rec.__e2eePortal === 1 && typeof rec.iv === 'string' && typeof rec.ct === 'string');
};

export const encryptPortalSantriSummary = async (
    summary: any,
    portalId: string,
    pin?: string
): Promise<EncryptedPortalSantriRecord> => {
    const normPin = normalizePortalPin(pin);
    const ptBytes = textEncoder.encode(JSON.stringify(summary));
    if (normPin) {
        const authHash = await derivePortalAuthHashV4(portalId, summary.nis, summary.tanggalLahir, normPin);
        const key = await derivePortalStudentAesKeyV3(portalId, summary.nis, summary.tanggalLahir, normPin, E2EE_PORTAL_KDF_ITERATIONS);
        const aad = buildPortalV3AadBytes(portalId, summary.nis);
        const { iv, ct } = await aesGcmEncrypt(key, ptBytes, aad);
        return {
            id: 0,
            nis: authHash,
            tanggalLahir: 'e2ee',
            namaLengkap: '[TERENKRIPSI E2EE]',
            __e2eePortal: 1,
            v: 3,
            pinRequired: 1,
            iter: E2EE_PORTAL_KDF_ITERATIONS,
            iv,
            ct,
        };
    }

    const authHash = await derivePortalAuthHash(portalId, summary.nis, summary.tanggalLahir);
    const key = await derivePortalStudentAesKey(portalId, summary.nis, summary.tanggalLahir, E2EE_PORTAL_KDF_ITERATIONS);
    const { iv, ct } = await aesGcmEncrypt(key, ptBytes);
    return {
        id: 0,
        nis: authHash,
        tanggalLahir: 'e2ee',
        namaLengkap: '[TERENKRIPSI E2EE]',
        __e2eePortal: 1,
        v: 2,
        iter: E2EE_PORTAL_KDF_ITERATIONS,
        iv,
        ct,
    };
};

export const decryptPortalSantriSummary = async <T = any>(
    encryptedRec: EncryptedPortalSantriRecord,
    portalId: string,
    nis: string,
    dob: string,
    pin?: string
): Promise<T> => {
    const recIter =
        typeof encryptedRec.iter === 'number' && Number.isFinite(encryptedRec.iter) && encryptedRec.iter >= 10000
            ? Math.floor(encryptedRec.iter)
            : Number(encryptedRec.v) >= 2
            ? E2EE_PORTAL_KDF_ITERATIONS
            : E2EE_PORTAL_LEGACY_KDF_ITERATIONS;

    if (Number(encryptedRec.v) >= 3) {
        const normPin = normalizePortalPin(pin);
        if (!normPin) {
            throw new Error('Data tidak ditemukan atau kredensial tidak sesuai.');
        }
        const key = await derivePortalStudentAesKeyV3(portalId, nis, dob, normPin, recIter);
        const aad = buildPortalV3AadBytes(portalId, nis);
        try {
            const ptBytes = await aesGcmDecrypt(key, encryptedRec.iv, encryptedRec.ct, aad);
            return JSON.parse(textDecoder.decode(ptBytes)) as T;
        } catch {
            throw new Error('Data tidak ditemukan atau kredensial tidak sesuai.');
        }
    }

    const key = await derivePortalStudentAesKey(portalId, nis, dob, recIter);
    try {
        const ptBytes = await aesGcmDecrypt(key, encryptedRec.iv, encryptedRec.ct);
        return JSON.parse(textDecoder.decode(ptBytes)) as T;
    } catch {
        throw new Error('Data tidak ditemukan atau kredensial tidak sesuai.');
    }
};

// ============================================================================
// STANDALONE VANILLA JS SNIPPETS (FOR GENERATED HTML FORMS & PORTAL HTML)
// ============================================================================

export const buildStandaloneHybridEncryptJsHelper = (
    publicKeySpki: string,
    keyId: string,
    context: string = 'hybrid',
    expectedFingerprint?: string
): string => {
    const safeSpki = JSON.stringify(publicKeySpki);
    const safeKeyId = JSON.stringify(keyId);
    const safeContext = JSON.stringify(String(context || 'hybrid').trim() || 'hybrid');
    const safePinnedFp = JSON.stringify(normalizePublicKeyFingerprint(expectedFingerprint));
    return `
(function() {
    var PUB_SPKI = ${safeSpki};
    var KEY_ID = ${safeKeyId};
    var DEFAULT_CTX = ${safeContext};
    var PINNED_FP = ${safePinnedFp};
    function b64ToBytes(b64) {
        var bin = atob(b64);
        var u8 = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
        return u8;
    }
    function bytesToB64(u8) {
        var bin = '';
        for (var i = 0; i < u8.length; i++) bin += String.fromCharCode(u8[i]);
        return btoa(bin);
    }
    function bytesToHex(u8) {
        return Array.from(u8).map(function(b) { return b.toString(16).padStart(2, '0'); }).join('');
    }
    async function computeSpkiFp(spkiB64) {
        var buf = await window.crypto.subtle.digest('SHA-256', b64ToBytes(String(spkiB64 || '').trim()));
        return bytesToHex(new Uint8Array(buf)).toLowerCase();
    }
    window.__esantriE2eeKeyId = KEY_ID;
    window.__esantriE2eePinnedFingerprint = PINNED_FP;
    window.__esantriVerifyE2eeFingerprint = async function(spkiB64) {
        if (!window.crypto || !window.crypto.subtle) {
            throw new Error('Enkripsi E2EE (Web Crypto) membutuhkan browser modern pada HTTPS, localhost, atau file://.');
        }
        var target = String(spkiB64 || PUB_SPKI || '').trim();
        if (!target) {
            throw new Error('Public Key E2EE tidak tersedia.');
        }
        var actual = await computeSpkiFp(target);
        if (PINNED_FP && actual !== PINNED_FP) {
            throw new Error('Public Key E2EE tidak cocok dengan fingerprint yang dipin di formulir! Kemungkinan kunci berubah atau terindikasi MITM.');
        }
        return actual;
    };
    window.__esantriEncryptHybrid = async function(payloadObj, overrideContext) {
        if (!window.crypto || !window.crypto.subtle) {
            throw new Error('Enkripsi E2EE (Web Crypto) membutuhkan browser modern pada HTTPS, localhost, atau file:// (tidak didukung di HTTP non-localhost).');
        }
        await window.__esantriVerifyE2eeFingerprint(PUB_SPKI);
        var ctx = String(overrideContext || DEFAULT_CTX || 'hybrid');
        var aadBytes = new TextEncoder().encode('v2|hybrid_rsa|' + KEY_ID + '|' + ctx);
        var pubKey = await window.crypto.subtle.importKey(
            'spki',
            b64ToBytes(PUB_SPKI),
            { name: 'RSA-OAEP', hash: 'SHA-256' },
            false,
            ['encrypt']
        );
        var aesRaw = window.crypto.getRandomValues(new Uint8Array(32));
        var aesKey = await window.crypto.subtle.importKey(
            'raw',
            aesRaw,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt']
        );
        var iv = window.crypto.getRandomValues(new Uint8Array(12));
        var ptBytes = new TextEncoder().encode(JSON.stringify(payloadObj));
        var ctBuf = await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv, additionalData: aadBytes }, aesKey, ptBytes);
        var ekBuf = await window.crypto.subtle.encrypt({ name: 'RSA-OAEP' }, pubKey, aesRaw);
        return {
            __e2ee: 1,
            v: 2,
            mode: 'hybrid_rsa',
            kid: KEY_ID,
            context: ctx,
            iv: bytesToB64(iv),
            ek: bytesToB64(new Uint8Array(ekBuf)),
            ct: bytesToB64(new Uint8Array(ctBuf))
        };
    };
})();
`;
};

export const buildStandalonePortalCryptoJsHelper = (): string => {
    return `
(function() {
    var enc = new TextEncoder();
    var dec = new TextDecoder();
    function bytesToHex(u8) {
        return Array.from(u8).map(function(b) { return b.toString(16).padStart(2, '0'); }).join('');
    }
    function b64ToBytes(b64) {
        var bin = atob(b64);
        var u8 = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
        return u8;
    }
    function normalizeNis(nis) {
        return String(nis || '').trim().replace(/\\s+/g, '').toLowerCase();
    }
    function normalizePin(pin) {
        return String(pin || '').replace(/\\s+/g, '').trim();
    }
    function normalizeDob(dob) {
        var c = String(dob || '').trim();
        if (!c) return '';
        if (/^\\d{4}-\\d{2}-\\d{2}$/.test(c)) return c;
        if (/^\\d{4}\\/\\d{2}\\/\\d{2}$/.test(c)) return c.replace(/\\//g, '-');
        var m = c.match(/^(\\d{2})[-\\/](\\d{2})[-\\/](\\d{4})$/);
        if (m) return m[3] + '-' + m[2] + '-' + m[1];
        var m2 = c.match(/^(\\d{4}-\\d{2}-\\d{2})T/);
        if (m2) return m2[1];
        return c;
    }
    async function sha256Hex(raw) {
        if (!window.crypto || !window.crypto.subtle) return '';
        var buf = await window.crypto.subtle.digest('SHA-256', enc.encode(raw));
        return bytesToHex(new Uint8Array(buf));
    }
    async function derivePinVerifyHash(portalId, nis, pin) {
        var pid = String(portalId || 'default').trim();
        var normPin = normalizePin(pin);
        if (!normPin) return '';
        return sha256Hex('esantri-portal-pin-verify:' + pid + ':' + normalizeNis(nis) + '|' + normPin);
    }
    async function deriveAuthHashLegacyV1(portalId, nis, dob) {
        if (!window.crypto || !window.crypto.subtle) {
            throw new Error('Portal E2EE membutuhkan HTTPS / localhost / file://');
        }
        var pid = String(portalId || 'default').trim();
        var raw = 'esantri-portal-auth:' + pid + ':' + normalizeNis(nis) + '|' + normalizeDob(dob);
        var buf = await window.crypto.subtle.digest('SHA-256', enc.encode(raw));
        return bytesToHex(new Uint8Array(buf));
    }
    async function deriveAuthHashWithIterations(portalId, nis, dob, iterations, prefix) {
        if (!window.crypto || !window.crypto.subtle) {
            throw new Error('Portal E2EE membutuhkan HTTPS / localhost / file://');
        }
        var pid = String(portalId || 'default').trim();
        var normNis = normalizeNis(nis);
        var normDob = normalizeDob(dob);
        var secret = enc.encode('esantri-portal-auth:' + normNis + '|' + normDob);
        var salt = enc.encode('esantri-auth-v2:' + pid + ':' + normNis);
        var km = await window.crypto.subtle.importKey('raw', secret, 'PBKDF2', false, ['deriveBits']);
        var bits = await window.crypto.subtle.deriveBits(
            { name: 'PBKDF2', salt: salt, iterations: iterations, hash: 'SHA-256' },
            km,
            256
        );
        return prefix + bytesToHex(new Uint8Array(bits));
    }
    async function deriveAuthHashV4(portalId, nis, dob, pin) {
        if (!window.crypto || !window.crypto.subtle) {
            throw new Error('Portal E2EE membutuhkan HTTPS / localhost / file://');
        }
        var pid = String(portalId || 'default').trim();
        var normNis = normalizeNis(nis);
        var normDob = normalizeDob(dob);
        var normPin = normalizePin(pin);
        if (!normPin) throw new Error('PIN Portal Santri wajib diisi.');
        var secret = enc.encode('esantri-portal-auth:' + normNis + '|' + normDob + '|' + normPin);
        var salt = enc.encode('esantri-auth-v4:' + pid + ':' + normNis);
        var km = await window.crypto.subtle.importKey('raw', secret, 'PBKDF2', false, ['deriveBits']);
        var bits = await window.crypto.subtle.deriveBits(
            { name: 'PBKDF2', salt: salt, iterations: 600000, hash: 'SHA-256' },
            km,
            256
        );
        return 'v4:' + bytesToHex(new Uint8Array(bits));
    }
    async function deriveAuthHash(portalId, nis, dob, pin) {
        if (normalizePin(pin)) {
            return deriveAuthHashV4(portalId, nis, dob, pin);
        }
        return deriveAuthHashWithIterations(portalId, nis, dob, 600000, 'v3:');
    }
    async function deriveAuthHashes(portalId, nis, dob, pin) {
        var normPin = normalizePin(pin);
        var v3 = await deriveAuthHashWithIterations(portalId, nis, dob, 600000, 'v3:');
        var v2 = await deriveAuthHashWithIterations(portalId, nis, dob, 100000, 'v2:');
        var v1 = await deriveAuthHashLegacyV1(portalId, nis, dob);
        if (normPin) {
            var v4 = await deriveAuthHashV4(portalId, nis, dob, normPin);
            return [v4, v3, v2, v1];
        }
        return [v3, v2, v1];
    }
    async function decryptRecord(rec, portalId, nis, dob, pin) {
        if (!rec || rec.__e2eePortal !== 1) return rec;
        if (!window.crypto || !window.crypto.subtle) {
            throw new Error('Dekripsi E2EE membutuhkan HTTPS / localhost / file://');
        }
        var pid = String(portalId || 'default').trim();
        var normNis = normalizeNis(nis);
        var normDob = normalizeDob(dob);
        var iter = (typeof rec.iter === 'number' && rec.iter >= 10000) ? Math.floor(rec.iter) : (Number(rec.v) >= 2 ? 600000 : 100000);
        if (Number(rec.v) >= 3) {
            var normPin = normalizePin(pin);
            if (!normPin) throw new Error('Data tidak ditemukan atau kredensial tidak sesuai.');
            var secretV3 = 'esantri-portal-key:' + normNis + '|' + normDob + '|' + normPin;
            var saltV3 = enc.encode('esantri-v3:' + pid + ':' + normNis);
            var kmV3 = await window.crypto.subtle.importKey('raw', enc.encode(secretV3), 'PBKDF2', false, ['deriveKey']);
            var keyV3 = await window.crypto.subtle.deriveKey(
                { name: 'PBKDF2', salt: saltV3, iterations: iter, hash: 'SHA-256' },
                kmV3,
                { name: 'AES-GCM', length: 256 },
                false,
                ['decrypt']
            );
            var aadV3 = enc.encode('v3|portal|' + pid + '|' + normNis);
            var ptBufV3 = await window.crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: b64ToBytes(rec.iv), additionalData: aadV3 },
                keyV3,
                b64ToBytes(rec.ct)
            );
            return JSON.parse(dec.decode(new Uint8Array(ptBufV3)));
        }
        var secret = 'esantri-portal-key:' + normNis + '|' + normDob;
        var salt = enc.encode('esantri:' + pid + ':' + normNis);
        var km = await window.crypto.subtle.importKey('raw', enc.encode(secret), 'PBKDF2', false, ['deriveKey']);
        var key = await window.crypto.subtle.deriveKey(
            { name: 'PBKDF2', salt: salt, iterations: iter, hash: 'SHA-256' },
            km,
            { name: 'AES-GCM', length: 256 },
            false,
            ['decrypt']
        );
        var ptBuf = await window.crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: b64ToBytes(rec.iv) },
            key,
            b64ToBytes(rec.ct)
        );
        return JSON.parse(dec.decode(new Uint8Array(ptBuf)));
    }
    function deterministicFnvHex64(input) {
        var bytes = enc.encode(input);
        var out = [];
        for (var round = 0; round < 8; round++) {
            var h = (0x811c9dc5 ^ (round * 0x9e3779b1)) >>> 0;
            for (var i = 0; i < bytes.length; i++) {
                h ^= bytes[i] ^ round;
                h = Math.imul(h, 0x01000193) >>> 0;
            }
            out.push(h.toString(16).padStart(8, '0'));
        }
        return out.join('');
    }
    async function deriveFirebaseEntryIds(portalId, nis, dob, pin) {
        var ids = [];
        var pid = String(portalId || 'default').trim();
        var normNis = normalizeNis(nis);
        var normDob = normalizeDob(dob);
        var normPin = normalizePin(pin);
        var rawPlain = 'esantri-fb-plain:' + pid + ':' + normNis + '|' + normDob;
        if (window.crypto && window.crypto.subtle) {
            var hashes = await deriveAuthHashes(pid, nis, dob, normPin);
            hashes.forEach(function(h) {
                ids.push(String(h || '').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128));
            });
            if (normPin) {
                var rawPin = 'esantri-fb-pin:' + pid + ':' + normNis + '|' + normDob + '|' + normPin;
                var pinBuf = await window.crypto.subtle.digest('SHA-256', enc.encode(rawPin));
                ids.push('pp_' + bytesToHex(new Uint8Array(pinBuf)));
                var ppf = 'ppf_' + deterministicFnvHex64(rawPin);
                if (ids.indexOf(ppf) === -1) ids.push(ppf);
            }
            var plainBuf = await window.crypto.subtle.digest('SHA-256', enc.encode(rawPlain));
            ids.push('p_' + bytesToHex(new Uint8Array(plainBuf)));
        } else if (normPin) {
            var ppfNoCrypto = 'ppf_' + deterministicFnvHex64('esantri-fb-pin:' + pid + ':' + normNis + '|' + normDob + '|' + normPin);
            ids.push(ppfNoCrypto);
        }
        var fallbackPlain = 'pf_' + deterministicFnvHex64(rawPlain);
        if (ids.indexOf(fallbackPlain) === -1) {
            ids.push(fallbackPlain);
        }
        return ids;
    }
    window.__esantriPortalCrypto = {
        normalizeNis: normalizeNis,
        normalizePin: normalizePin,
        normalizeDob: normalizeDob,
        derivePinVerifyHash: derivePinVerifyHash,
        deriveAuthHash: deriveAuthHash,
        deriveAuthHashV4: deriveAuthHashV4,
        deriveAuthHashLegacyV1: deriveAuthHashLegacyV1,
        deriveAuthHashes: deriveAuthHashes,
        deriveFirebaseEntryIds: deriveFirebaseEntryIds,
        decryptRecord: decryptRecord
    };
})();
`;
};
