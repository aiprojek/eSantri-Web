export const ENCRYPTED_BACKUP_FORMAT = 'esantri-encrypted-backup' as const;
export const ENCRYPTED_BACKUP_VERSION = 1 as const;
export const ENCRYPTED_BACKUP_ITERATIONS = 310000;
const BACKUP_AAD = 'esantri-backup-v1';

export interface EncryptedBackupEnvelope {
    format: typeof ENCRYPTED_BACKUP_FORMAT;
    version: typeof ENCRYPTED_BACKUP_VERSION;
    cipher: 'AES-GCM';
    kdf: 'PBKDF2';
    kdfHash: 'SHA-256';
    iterations: number;
    salt: string;
    iv: string;
    ciphertext: string;
    createdAt: string;
}

const bytesToBase64 = (bytes: Uint8Array): string => {
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
};

const base64ToBytes = (b64: string): Uint8Array => {
    const binary = atob(b64);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        out[i] = binary.charCodeAt(i);
    }
    return out;
};

const deriveAesGcmKey = async (
    password: string,
    salt: Uint8Array,
    iterations: number,
    usage: KeyUsage[]
): Promise<CryptoKey> => {
    const saltBuf = new Uint8Array(salt.byteLength);
    saltBuf.set(salt);
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(password),
        'PBKDF2',
        false,
        ['deriveKey']
    );
    return crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            hash: 'SHA-256',
            salt: saltBuf,
            iterations,
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        usage
    );
};

export const isEncryptedBackupEnvelope = (input: unknown): input is EncryptedBackupEnvelope => {
    if (!input || typeof input !== 'object') return false;
    const obj = input as Record<string, unknown>;
    return (
        obj.format === ENCRYPTED_BACKUP_FORMAT &&
        obj.version === ENCRYPTED_BACKUP_VERSION &&
        obj.cipher === 'AES-GCM' &&
        obj.kdf === 'PBKDF2' &&
        typeof obj.salt === 'string' &&
        typeof obj.iv === 'string' &&
        typeof obj.ciphertext === 'string' &&
        typeof obj.iterations === 'number'
    );
};

export const encryptBackupPayload = async (
    payload: Record<string, unknown>,
    password: string
): Promise<EncryptedBackupEnvelope> => {
    if (!password) {
        throw new Error('Password enkripsi cadangan wajib diisi.');
    }
    const salt = new Uint8Array(16);
    const iv = new Uint8Array(12);
    crypto.getRandomValues(salt);
    crypto.getRandomValues(iv);

    const key = await deriveAesGcmKey(password, salt, ENCRYPTED_BACKUP_ITERATIONS, ['encrypt']);
    const plaintext = new TextEncoder().encode(JSON.stringify(payload));
    const aad = new TextEncoder().encode(BACKUP_AAD);

    const encryptedBuf = await crypto.subtle.encrypt(
        {
            name: 'AES-GCM',
            iv,
            additionalData: aad,
        },
        key,
        plaintext
    );

    return {
        format: ENCRYPTED_BACKUP_FORMAT,
        version: ENCRYPTED_BACKUP_VERSION,
        cipher: 'AES-GCM',
        kdf: 'PBKDF2',
        kdfHash: 'SHA-256',
        iterations: ENCRYPTED_BACKUP_ITERATIONS,
        salt: bytesToBase64(salt),
        iv: bytesToBase64(iv),
        ciphertext: bytesToBase64(new Uint8Array(encryptedBuf)),
        createdAt: new Date().toISOString(),
    };
};

export const decryptBackupPayload = async (
    envelope: EncryptedBackupEnvelope,
    password: string
): Promise<Record<string, unknown>> => {
    if (!password) {
        throw new Error('Password cadangan wajib diisi.');
    }
    if (!Number.isFinite(envelope.iterations) || envelope.iterations < 100000) {
        throw new Error('Parameter KDF file cadangan tidak valid.');
    }

    const salt = base64ToBytes(envelope.salt);
    const ivBytes = base64ToBytes(envelope.iv);
    const ivBuf = new Uint8Array(ivBytes.byteLength);
    ivBuf.set(ivBytes);
    const cipherBytes = base64ToBytes(envelope.ciphertext);
    const cipherBuf = new Uint8Array(cipherBytes.byteLength);
    cipherBuf.set(cipherBytes);
    const aad = new TextEncoder().encode(BACKUP_AAD);

    const key = await deriveAesGcmKey(password, salt, envelope.iterations, ['decrypt']);
    let decryptedBuf: ArrayBuffer;
    try {
        decryptedBuf = await crypto.subtle.decrypt(
            {
                name: 'AES-GCM',
                iv: ivBuf,
                additionalData: aad,
            },
            key,
            cipherBuf
        );
    } catch {
        throw new Error('Password cadangan salah atau file cadangan rusak/dimodifikasi.');
    }

    const parsed = JSON.parse(new TextDecoder().decode(decryptedBuf));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('Isi file cadangan terenkripsi tidak valid.');
    }
    return parsed as Record<string, unknown>;
};
