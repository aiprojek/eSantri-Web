import { E2eeConfig, E2eeModuleToggles, PondokSettings } from '../types';

export const E2EE_DEVICE_VAULT_STORAGE_KEY = 'esantri_e2ee_device_vault_v1';
export const E2EE_DEVICE_VAULT_MODE_KEY = 'esantri_e2ee_vault_mode_v1';
export const E2EE_CHANGED_EVENT = 'esantri-e2ee-changed';
export type E2eeDeviceVaultMode = 'remember' | 'session';

export interface E2eeSymEnvelope {
    __e2ee: 1;
    mode: 'sym_aes';
    kid: string;
    context: string;
    kdf?: 'hkdf-sha256';
    encoding?: 'gzip_b64' | 'json';
    iv: string;
    ct: string;
}

export interface E2eeHybridEnvelope {
    __e2ee: 1;
    mode: 'hybrid_rsa';
    kid: string;
    iv: string;
    ek: string;
    ct: string;
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

const derivePbkdf2AesKey = async (
    secret: string,
    saltB64: string,
    iterations: number = 150000
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

const aesGcmEncrypt = async (key: CryptoKey, plaintext: Uint8Array): Promise<{ iv: string; ct: string }> => {
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const ctBuffer = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: toBufferSource(iv) },
        key,
        toBufferSource(plaintext)
    );
    return {
        iv: bytesToBase64(iv),
        ct: bytesToBase64(new Uint8Array(ctBuffer)),
    };
};

const aesGcmDecrypt = async (key: CryptoKey, ivB64: string, ctB64: string): Promise<Uint8Array> => {
    const iv = base64ToBytes(ivB64);
    const ct = base64ToBytes(ctB64);
    const ptBuffer = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: toBufferSource(iv) },
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
        v: 1,
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
                bundledConfig = {
                    enabled: true,
                    version: 1,
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
// DEVICE VAULT (OPSI B: REMEMBER DEVICE + OPSIONAL SESSION-ONLY MODE)
// ============================================================================

export const getDeviceVaultMode = (): E2eeDeviceVaultMode => {
    try {
        const mode = localStorage.getItem(E2EE_DEVICE_VAULT_MODE_KEY);
        return mode === 'session' ? 'session' : 'remember';
    } catch {
        return 'remember';
    }
};

const readVaultFromStorage = (storage: Storage | undefined): DeviceVaultMap => {
    if (!storage) return {};
    try {
        const raw = storage.getItem(E2EE_DEVICE_VAULT_STORAGE_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
        return {};
    }
};

const readDeviceVault = (): DeviceVaultMap => {
    const ss = typeof sessionStorage !== 'undefined' ? sessionStorage : undefined;
    const ls = typeof localStorage !== 'undefined' ? localStorage : undefined;
    return {
        ...readVaultFromStorage(ls),
        ...readVaultFromStorage(ss),
    };
};

const writeDeviceVault = (vault: DeviceVaultMap) => {
    const mode = getDeviceVaultMode();
    try {
        if (mode === 'session') {
            if (typeof sessionStorage !== 'undefined') {
                sessionStorage.setItem(E2EE_DEVICE_VAULT_STORAGE_KEY, JSON.stringify(vault));
            }
            if (typeof localStorage !== 'undefined') {
                localStorage.removeItem(E2EE_DEVICE_VAULT_STORAGE_KEY);
            }
        } else {
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem(E2EE_DEVICE_VAULT_STORAGE_KEY, JSON.stringify(vault));
            }
            if (typeof sessionStorage !== 'undefined') {
                sessionStorage.removeItem(E2EE_DEVICE_VAULT_STORAGE_KEY);
            }
        }
    } catch (err) {
        console.warn('Gagal menyimpan device vault E2EE:', err);
    }
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(E2EE_CHANGED_EVENT));
    }
};

export const setDeviceVaultMode = (mode: E2eeDeviceVaultMode) => {
    const existing = readDeviceVault();
    try {
        localStorage.setItem(E2EE_DEVICE_VAULT_MODE_KEY, mode);
    } catch {
        // ignore
    }
    writeDeviceVault(existing);
};

export const saveVaultEntry = (keyId: string, mdkBytes: Uint8Array, privateKeyPkcs8Bytes: Uint8Array) => {
    const vault = readDeviceVault();
    vault[keyId] = {
        mdkB64: bytesToBase64(mdkBytes),
        privateKeyPkcs8B64: bytesToBase64(privateKeyPkcs8Bytes),
        unlockedAt: new Date().toISOString(),
    };
    writeDeviceVault(vault);
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
    if (!keyId) {
        try {
            localStorage.removeItem(E2EE_DEVICE_VAULT_STORAGE_KEY);
            sessionStorage.removeItem(E2EE_DEVICE_VAULT_STORAGE_KEY);
        } catch {
            // ignore
        }
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent(E2EE_CHANGED_EVENT));
        }
        return;
    }
    const vault = readDeviceVault();
    delete vault[keyId];
    writeDeviceVault(vault);
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
    if (!masterPassword || masterPassword.length < 8) {
        throw new Error('Master Password minimal 8 karakter.');
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

    const pwWrapKey = await derivePbkdf2AesKey(masterPassword, salt);
    const rkWrapKey = await derivePbkdf2AesKey(canonicalizeRecoveryKey(recoveryKey), recoverySalt);

    const passwordWrappedMdk = JSON.stringify(await aesGcmEncrypt(pwWrapKey, mdkBytes));
    const recoveryWrappedMdk = JSON.stringify(await aesGcmEncrypt(rkWrapKey, mdkBytes));
    const keyCheck = await sha256Hex(mdkBytes);

    const randomHex = Array.from(window.crypto.getRandomValues(new Uint8Array(4)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    const keyId = `k_${Date.now().toString(36)}_${randomHex}`;
    const now = new Date().toISOString();

    const config: E2eeConfig = {
        enabled: true,
        version: 1,
        keyId,
        salt,
        recoverySalt,
        passwordWrappedMdk,
        recoveryWrappedMdk,
        publicKeySpki: bytesToBase64(new Uint8Array(publicSpkiBuffer)),
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

    saveVaultEntry(keyId, mdkBytes, privatePkcs8Bytes);

    return { config, recoveryKey };
};

export const unlockWithPassword = async (config: E2eeConfig, password: string): Promise<void> => {
    assertWebCrypto();
    if (!password) throw new Error('Masukkan Master Password.');

    let mdkBytes: Uint8Array;
    try {
        const wrapped = JSON.parse(config.passwordWrappedMdk);
        const wrapKey = await derivePbkdf2AesKey(password, config.salt);
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

    saveVaultEntry(config.keyId, mdkBytes, privatePkcs8Bytes);
};

export const recoverWithRecoveryKey = async (
    config: E2eeConfig,
    recoveryKeyInput: string,
    newPassword: string,
    newHint?: string
): Promise<E2eeConfig> => {
    assertWebCrypto();
    if (!newPassword || newPassword.length < 8) {
        throw new Error('Password baru minimal 8 karakter.');
    }
    const canonical = canonicalizeRecoveryKey(recoveryKeyInput);
    if (!canonical) {
        throw new Error('Recovery Key tidak valid.');
    }

    let mdkBytes: Uint8Array;
    try {
        const wrapped = JSON.parse(config.recoveryWrappedMdk);
        const rkWrapKey = await derivePbkdf2AesKey(canonical, config.recoverySalt);
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
    const newPwWrapKey = await derivePbkdf2AesKey(newPassword, newSalt);
    const newPasswordWrappedMdk = JSON.stringify(await aesGcmEncrypt(newPwWrapKey, mdkBytes));

    saveVaultEntry(config.keyId, mdkBytes, privatePkcs8Bytes);

    return {
        ...config,
        enabled: true,
        salt: newSalt,
        passwordWrappedMdk: newPasswordWrappedMdk,
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
    if (!newPassword || newPassword.length < 8) {
        throw new Error('Password baru minimal 8 karakter.');
    }

    await unlockWithPassword(config, currentPassword);
    const entry = getVaultEntryByKeyId(config.keyId);
    if (!entry) throw new Error('Gagal membuka kunci perangkat.');

    const newSalt = bytesToBase64(window.crypto.getRandomValues(new Uint8Array(16)));
    const newPwWrapKey = await derivePbkdf2AesKey(newPassword, newSalt);
    const newPasswordWrappedMdk = JSON.stringify(await aesGcmEncrypt(newPwWrapKey, entry.mdkBytes));

    return {
        ...config,
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
    const entry = getVaultEntryByKeyId(config.keyId);
    if (!entry) {
        throw new Error('Buka kunci E2EE di perangkat ini terlebih dahulu sebelum membuat ulang Recovery Key.');
    }

    const recoverySalt = bytesToBase64(window.crypto.getRandomValues(new Uint8Array(16)));
    const recoveryKey = generateRecoveryKeyString();
    const rkWrapKey = await derivePbkdf2AesKey(canonicalizeRecoveryKey(recoveryKey), recoverySalt);
    const recoveryWrappedMdk = JSON.stringify(await aesGcmEncrypt(rkWrapKey, entry.mdkBytes));

    return {
        config: {
            ...config,
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

export const encryptBytesSym = async (
    plainBytes: Uint8Array,
    config: E2eeConfig,
    context: string,
    encoding: 'gzip_b64' | 'json' = 'gzip_b64'
): Promise<E2eeSymEnvelope> => {
    const entry = getVaultEntryByKeyId(config.keyId);
    if (!entry) {
        throw new Error('E2EE_LOCKED: Perangkat ini belum dibuka kuncinya. Masukkan Master Password E2EE di Pengaturan atau banner atas.');
    }
    const key = await deriveContextAesKey(entry.mdkBytes, context, true);
    const { iv, ct } = await aesGcmEncrypt(key, plainBytes);
    return {
        __e2ee: 1,
        mode: 'sym_aes',
        kid: config.keyId,
        context,
        kdf: 'hkdf-sha256',
        encoding,
        iv,
        ct,
    };
};

export const decryptBytesSym = async (envelope: E2eeSymEnvelope): Promise<Uint8Array> => {
    const entry = getVaultEntryByKeyId(envelope.kid);
    if (!entry) {
        throw new Error(`E2EE_LOCKED: Data terenkripsi (${envelope.kid}). Buka kunci perangkat ini dengan Master Password E2EE terlebih dahulu.`);
    }
    const key = await deriveContextAesKey(entry.mdkBytes, envelope.context || 'sync', envelope.kdf === 'hkdf-sha256');
    try {
        return await aesGcmDecrypt(key, envelope.iv, envelope.ct);
    } catch {
        throw new Error('Gagal mendekripsi data cloud. Pastikan kunci E2EE sesuai.');
    }
};

export const encryptObjectSym = async (
    obj: any,
    config: E2eeConfig,
    context: string
): Promise<E2eeSymEnvelope> => {
    const bytes = textEncoder.encode(JSON.stringify(obj));
    return encryptBytesSym(bytes, config, context, 'json');
};

export const decryptObjectSym = async <T = any>(envelope: E2eeSymEnvelope): Promise<T> => {
    const bytes = await decryptBytesSym(envelope);
    return JSON.parse(textDecoder.decode(bytes)) as T;
};

// ============================================================================
// HYBRID RSA-OAEP + AES-GCM ENVELOPE (PSB & RAPOR FORM HTML / CLOUD STAGING)
// ============================================================================

export const encryptObjectHybridWithPublicKey = async (
    payload: any,
    publicKeySpki: string,
    keyId: string
): Promise<E2eeHybridEnvelope> => {
    assertWebCrypto();
    const pubKey = await window.crypto.subtle.importKey(
        'spki',
        toBufferSource(base64ToBytes(publicKeySpki)),
        { name: 'RSA-OAEP', hash: 'SHA-256' },
        false,
        ['encrypt']
    );

    const aesKeyBytes = window.crypto.getRandomValues(new Uint8Array(32));
    const aesKey = await importRawAesKey(aesKeyBytes);
    const ptBytes = textEncoder.encode(JSON.stringify(payload));
    const { iv, ct } = await aesGcmEncrypt(aesKey, ptBytes);

    const ekBuffer = await window.crypto.subtle.encrypt(
        { name: 'RSA-OAEP' },
        pubKey,
        toBufferSource(aesKeyBytes)
    );

    return {
        __e2ee: 1,
        mode: 'hybrid_rsa',
        kid: keyId,
        iv,
        ek: bytesToBase64(new Uint8Array(ekBuffer)),
        ct,
    };
};

export const decryptHybridEnvelope = async <T = any>(envelope: E2eeHybridEnvelope): Promise<T> => {
    assertWebCrypto();
    const entry = getVaultEntryByKeyId(envelope.kid);
    if (!entry) {
        throw new Error(`E2EE_LOCKED: Data terenkripsi (${envelope.kid}). Silakan buka kunci E2EE dengan Master Password terlebih dahulu.`);
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
    const ptBytes = await aesGcmDecrypt(aesKey, envelope.iv, envelope.ct);
    return JSON.parse(textDecoder.decode(ptBytes)) as T;
};

export const decryptAnyEnvelope = async <T = any>(envelopeOrStr: any): Promise<T> => {
    const env = tryParseE2eeEnvelope(envelopeOrStr);
    if (!env) {
        throw new Error('Format amplop E2EE tidak dikenali.');
    }
    if (env.mode === 'hybrid_rsa') {
        return decryptHybridEnvelope<T>(env);
    }
    return decryptObjectSym<T>(env);
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
            iterations: 100000,
            hash: 'SHA-256',
        },
        keyMaterial,
        256
    );
    const hex = Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('');
    return `v2:${hex}`;
};

export const derivePortalAuthHashCandidates = async (
    portalId: string,
    nis: string,
    dob: string
): Promise<string[]> => {
    const [v2, v1] = await Promise.all([
        derivePortalAuthHash(portalId, nis, dob),
        derivePortalAuthHashLegacyV1(portalId, nis, dob),
    ]);
    return [v2, v1];
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

export const deriveFirebasePortalLookupCandidates = async (
    portalId: string,
    nis: string,
    dob: string
): Promise<string[]> => {
    const candidates: string[] = [];
    if (isWebCryptoAvailable()) {
        const authHashes = await derivePortalAuthHashCandidates(portalId, nis, dob);
        authHashes.forEach((h) => candidates.push(sanitizeFirebasePortalEntryId(h)));
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
    dob: string
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
            iterations: 100000,
            hash: 'SHA-256',
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
};

export interface EncryptedPortalSantriRecord {
    id: number;
    nis: string; // authHash
    tanggalLahir: string; // 'e2ee'
    namaLengkap?: string;
    __e2eePortal: 1;
    v: 1;
    iv: string;
    ct: string;
}

export const isEncryptedPortalRecord = (rec: any): rec is EncryptedPortalSantriRecord => {
    return Boolean(rec && typeof rec === 'object' && rec.__e2eePortal === 1 && typeof rec.iv === 'string' && typeof rec.ct === 'string');
};

export const encryptPortalSantriSummary = async (
    summary: any,
    portalId: string
): Promise<EncryptedPortalSantriRecord> => {
    const authHash = await derivePortalAuthHash(portalId, summary.nis, summary.tanggalLahir);
    const key = await derivePortalStudentAesKey(portalId, summary.nis, summary.tanggalLahir);
    const ptBytes = textEncoder.encode(JSON.stringify(summary));
    const { iv, ct } = await aesGcmEncrypt(key, ptBytes);
    return {
        id: 0,
        nis: authHash,
        tanggalLahir: 'e2ee',
        namaLengkap: '[TERENKRIPSI E2EE]',
        __e2eePortal: 1,
        v: 1,
        iv,
        ct,
    };
};

export const decryptPortalSantriSummary = async <T = any>(
    encryptedRec: EncryptedPortalSantriRecord,
    portalId: string,
    nis: string,
    dob: string
): Promise<T> => {
    const key = await derivePortalStudentAesKey(portalId, nis, dob);
    try {
        const ptBytes = await aesGcmDecrypt(key, encryptedRec.iv, encryptedRec.ct);
        return JSON.parse(textDecoder.decode(ptBytes)) as T;
    } catch {
        throw new Error('Gagal mendekripsi data santri. Periksa kembali NIS dan Tanggal Lahir.');
    }
};

// ============================================================================
// STANDALONE VANILLA JS SNIPPETS (FOR GENERATED HTML FORMS & PORTAL HTML)
// ============================================================================

export const buildStandaloneHybridEncryptJsHelper = (publicKeySpki: string, keyId: string): string => {
    const safeSpki = JSON.stringify(publicKeySpki);
    const safeKeyId = JSON.stringify(keyId);
    return `
(function() {
    var PUB_SPKI = ${safeSpki};
    var KEY_ID = ${safeKeyId};
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
    window.__esantriE2eeKeyId = KEY_ID;
    window.__esantriEncryptHybrid = async function(payloadObj) {
        if (!window.crypto || !window.crypto.subtle) {
            throw new Error('Enkripsi E2EE (Web Crypto) membutuhkan browser modern pada HTTPS, localhost, atau file:// (tidak didukung di HTTP non-localhost).');
        }
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
        var ctBuf = await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, aesKey, ptBytes);
        var ekBuf = await window.crypto.subtle.encrypt({ name: 'RSA-OAEP' }, pubKey, aesRaw);
        return {
            __e2ee: 1,
            mode: 'hybrid_rsa',
            kid: KEY_ID,
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
    async function deriveAuthHashLegacyV1(portalId, nis, dob) {
        if (!window.crypto || !window.crypto.subtle) {
            throw new Error('Portal E2EE membutuhkan HTTPS / localhost / file://');
        }
        var pid = String(portalId || 'default').trim();
        var raw = 'esantri-portal-auth:' + pid + ':' + normalizeNis(nis) + '|' + normalizeDob(dob);
        var buf = await window.crypto.subtle.digest('SHA-256', enc.encode(raw));
        return bytesToHex(new Uint8Array(buf));
    }
    async function deriveAuthHash(portalId, nis, dob) {
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
            { name: 'PBKDF2', salt: salt, iterations: 100000, hash: 'SHA-256' },
            km,
            256
        );
        return 'v2:' + bytesToHex(new Uint8Array(bits));
    }
    async function deriveAuthHashes(portalId, nis, dob) {
        var v2 = await deriveAuthHash(portalId, nis, dob);
        var v1 = await deriveAuthHashLegacyV1(portalId, nis, dob);
        return [v2, v1];
    }
    async function decryptRecord(rec, portalId, nis, dob) {
        if (!rec || rec.__e2eePortal !== 1) return rec;
        if (!window.crypto || !window.crypto.subtle) {
            throw new Error('Dekripsi E2EE membutuhkan HTTPS / localhost / file://');
        }
        var pid = String(portalId || 'default').trim();
        var normNis = normalizeNis(nis);
        var normDob = normalizeDob(dob);
        var secret = 'esantri-portal-key:' + normNis + '|' + normDob;
        var salt = enc.encode('esantri:' + pid + ':' + normNis);
        var km = await window.crypto.subtle.importKey('raw', enc.encode(secret), 'PBKDF2', false, ['deriveKey']);
        var key = await window.crypto.subtle.deriveKey(
            { name: 'PBKDF2', salt: salt, iterations: 100000, hash: 'SHA-256' },
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
    async function deriveFirebaseEntryIds(portalId, nis, dob) {
        var ids = [];
        var pid = String(portalId || 'default').trim();
        var normNis = normalizeNis(nis);
        var normDob = normalizeDob(dob);
        var rawPlain = 'esantri-fb-plain:' + pid + ':' + normNis + '|' + normDob;
        if (window.crypto && window.crypto.subtle) {
            var hashes = await deriveAuthHashes(pid, nis, dob);
            hashes.forEach(function(h) {
                ids.push(String(h || '').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128));
            });
            var plainBuf = await window.crypto.subtle.digest('SHA-256', enc.encode(rawPlain));
            ids.push('p_' + bytesToHex(new Uint8Array(plainBuf)));
        }
        var fallbackPlain = 'pf_' + deterministicFnvHex64(rawPlain);
        if (ids.indexOf(fallbackPlain) === -1) {
            ids.push(fallbackPlain);
        }
        return ids;
    }
    window.__esantriPortalCrypto = {
        normalizeNis: normalizeNis,
        normalizeDob: normalizeDob,
        deriveAuthHash: deriveAuthHash,
        deriveAuthHashLegacyV1: deriveAuthHashLegacyV1,
        deriveAuthHashes: deriveAuthHashes,
        deriveFirebaseEntryIds: deriveFirebaseEntryIds,
        decryptRecord: decryptRecord
    };
})();
`;
};
