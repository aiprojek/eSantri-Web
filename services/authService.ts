
// Simple client-side hashing service for offline app
// WARNING: This is "Application Level Security", not "Database Level Security".

export const PBKDF2_PREFIX = 'pbkdf2_sha256';
export const PBKDF2_ITERATIONS = 310000;
const PBKDF2_SALT_BYTES = 16;
const PBKDF2_KEY_BITS = 256;

const bytesToBase64 = (bytes: Uint8Array): string => {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
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

const constantTimeEqualBytes = (a: Uint8Array, b: Uint8Array): boolean => {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) {
        diff |= a[i] ^ b[i];
    }
    return diff === 0;
};

const constantTimeEqualStr = (a: string, b: string): boolean => {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) {
        diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return diff === 0;
};

// Legacy SHA-256 hex hash (kept for lazy migration verification of existing hashes)
export const hashString = async (message: string): Promise<string> => {
    if (!message) return '';
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
};

export const isModernSecretHash = (storedHash?: string): boolean =>
    Boolean(storedHash && storedHash.startsWith(`${PBKDF2_PREFIX}$`));

export const hashSecret = async (secret: string): Promise<string> => {
    if (!secret) return '';
    const salt = new Uint8Array(PBKDF2_SALT_BYTES);
    crypto.getRandomValues(salt);
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(secret),
        'PBKDF2',
        false,
        ['deriveBits']
    );
    const derivedBits = await crypto.subtle.deriveBits(
        {
            name: 'PBKDF2',
            hash: 'SHA-256',
            salt,
            iterations: PBKDF2_ITERATIONS,
        },
        keyMaterial,
        PBKDF2_KEY_BITS
    );
    const derivedBytes = new Uint8Array(derivedBits);
    return `${PBKDF2_PREFIX}$${PBKDF2_ITERATIONS}$${bytesToBase64(salt)}$${bytesToBase64(derivedBytes)}`;
};

export const verifySecret = async (
    input: string,
    storedHash?: string
): Promise<{ valid: boolean; needsRehash: boolean }> => {
    if (!input || !storedHash) {
        return { valid: false, needsRehash: false };
    }

    if (storedHash.startsWith(`${PBKDF2_PREFIX}$`)) {
        const parts = storedHash.split('$');
        if (parts.length !== 4) {
            return { valid: false, needsRehash: false };
        }
        const iterations = Number(parts[1]);
        if (!Number.isFinite(iterations) || iterations <= 0) {
            return { valid: false, needsRehash: false };
        }
        try {
            const salt = base64ToBytes(parts[2]);
            const expectedBytes = base64ToBytes(parts[3]);
            const saltBuf = new Uint8Array(salt.byteLength);
            saltBuf.set(salt);
            const keyMaterial = await crypto.subtle.importKey(
                'raw',
                new TextEncoder().encode(input),
                'PBKDF2',
                false,
                ['deriveBits']
            );
            const derivedBits = await crypto.subtle.deriveBits(
                {
                    name: 'PBKDF2',
                    hash: 'SHA-256',
                    salt: saltBuf,
                    iterations,
                },
                keyMaterial,
                expectedBytes.length * 8
            );
            const valid = constantTimeEqualBytes(new Uint8Array(derivedBits), expectedBytes);
            return { valid, needsRehash: valid && iterations < PBKDF2_ITERATIONS };
        } catch {
            return { valid: false, needsRehash: false };
        }
    }

    const legacyHex = await hashString(input);
    const valid = constantTimeEqualStr(legacyHex, storedHash);
    return { valid, needsRehash: valid };
};

// Generate a random initial password using crypto.getRandomValues (rejection sampling, no modulo bias)
export const generateInitialPassword = (length = 12): string => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    const maxValid = Math.floor(256 / chars.length) * chars.length;
    let password = '';
    while (password.length < length) {
        const bytes = new Uint8Array(Math.max(16, (length - password.length) * 2));
        crypto.getRandomValues(bytes);
        for (let i = 0; i < bytes.length && password.length < length; i++) {
            if (bytes[i] < maxValid) {
                password += chars.charAt(bytes[i] % chars.length);
            }
        }
    }
    return password;
};

// Generate a random recovery key format: ESANTRI-XXXX-XXXX-XXXX using CSPRNG
export const generateRecoveryKey = (): string => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 32 chars (divides 256 evenly, bias-free)
    const maxValid = Math.floor(256 / chars.length) * chars.length;
    const needed = 12;
    let tokens = '';
    while (tokens.length < needed) {
        const bytes = new Uint8Array(needed * 2);
        crypto.getRandomValues(bytes);
        for (let i = 0; i < bytes.length && tokens.length < needed; i++) {
            if (bytes[i] < maxValid) {
                tokens += chars.charAt(bytes[i] % chars.length);
            }
        }
    }
    return `ESANTRI-${tokens.slice(0, 4)}-${tokens.slice(4, 8)}-${tokens.slice(8, 12)}`;
};

export const sanitizeUserForExternalSync = <T extends Record<string, any>>(
    user: T,
    e2eeSyncEnabled: boolean
): Omit<T, 'securityAnswerHash' | 'recoveryKeyHash'> & { passwordHash?: string } => {
    if (!user || typeof user !== 'object') return user;
    const {
        securityAnswerHash: _sa,
        recoveryKeyHash: _rk,
        passwordHash,
        ...rest
    } = user as any;
    if (e2eeSyncEnabled && passwordHash) {
        return { ...rest, passwordHash };
    }
    return rest;
};

export const mergeSyncedUserCredentials = <T extends Record<string, any>>(
    incomingUser: T,
    localUser?: Record<string, any> | null
): T => {
    if (!localUser) return incomingUser;
    const merged = { ...incomingUser } as any;
    if (!merged.passwordHash && localUser.passwordHash) {
        merged.passwordHash = localUser.passwordHash;
    }
    if (!merged.securityAnswerHash && localUser.securityAnswerHash) {
        merged.securityAnswerHash = localUser.securityAnswerHash;
    }
    if (!merged.recoveryKeyHash && localUser.recoveryKeyHash) {
        merged.recoveryKeyHash = localUser.recoveryKeyHash;
    }
    return merged as T;
};

// Default Permissions for Super Admin
export const ADMIN_PERMISSIONS = {
    santri: 'write',
    psb: 'write',
    whatsapp: 'write',
    akademik: 'write', 
    sertifikat: 'write',
    absensi: 'write', 
    tahfizh: 'write',
    sarpras: 'write', 
    kalender: 'write', 
    perpustakaan: 'write',
    kesehatan: 'write',
    bk: 'write', 
    bukutamu: 'write',
    datamaster: 'write',
    keuangan: 'write',
    keasramaan: 'write',
    bukukas: 'write',
    surat: 'write',
    laporan: 'write',
    auditlog: 'write',
    pengaturan: 'write',
    portalwali: 'write',
    koperasi: 'write',
    koperasi_manajer: 'write',
    syncAdmin: true,
};

// Default Permissions for New Staff
export const DEFAULT_STAFF_PERMISSIONS = {
    santri: 'read',
    psb: 'read',
    whatsapp: 'read',
    akademik: 'none', 
    sertifikat: 'read',
    absensi: 'write', 
    tahfizh: 'read',
    sarpras: 'read', 
    kalender: 'read',
    perpustakaan: 'read',
    kesehatan: 'read', 
    bk: 'none', 
    bukutamu: 'write',
    datamaster: 'none',
    keuangan: 'none',
    keasramaan: 'read',
    bukukas: 'none',
    surat: 'read',
    laporan: 'read',
    auditlog: 'none',
    pengaturan: 'none',
    portalwali: 'none',
    koperasi: 'write', // Staff usually handles POS cashier sales
    koperasi_manajer: 'none', // Cost price, warehouse, supplier & P/L restricted to manager/bendahara
    syncAdmin: false,
};

// ROLE TEMPLATES for Quick Setup
export const ROLE_TEMPLATES = [
    {
        id: 'kesantrian',
        label: 'Kesantrian / Pengasuhan',
        icon: 'bi-people-fill',
        permissions: {
            ...DEFAULT_STAFF_PERMISSIONS,
            santri: 'write',
            absensi: 'write',
            tahfizh: 'write',
            sertifikat: 'write',
            keasramaan: 'write',
            kesehatan: 'write',
            bk: 'write',
            bukutamu: 'write'
        }
    },
    {
        id: 'bendahara',
        label: 'Bendahara / Keuangan',
        icon: 'bi-cash-stack',
        permissions: {
            ...DEFAULT_STAFF_PERMISSIONS,
            keuangan: 'write',
            bukukas: 'write',
            koperasi: 'write',
            koperasi_manajer: 'write',
            santri: 'read'
        }
    },
    {
        id: 'akademik',
        label: 'Tata Usaha / Akademik',
        icon: 'bi-mortarboard-fill',
        permissions: {
            ...DEFAULT_STAFF_PERMISSIONS,
            akademik: 'write',
            sertifikat: 'write',
            surat: 'write',
            psb: 'write',
            portalwali: 'write',
            kalender: 'write',
            santri: 'write',
            datamaster: 'read'
        }
    },
    {
        id: 'sarpras',
        label: 'Sarpras & Aset',
        icon: 'bi-building',
        permissions: {
            ...DEFAULT_STAFF_PERMISSIONS,
            sarpras: 'write',
            kalender: 'read'
        }
    },
    {
        id: 'perpus',
        label: 'Perpustakaan',
        icon: 'bi-book',
        permissions: {
            ...DEFAULT_STAFF_PERMISSIONS,
            perpustakaan: 'write'
        }
    }
];
export const DEFAULT_WALI_KELAS_PERMISSIONS = {
    santri: 'read',
    psb: 'none',
    whatsapp: 'none',
    akademik: 'write', 
    sertifikat: 'read',
    absensi: 'write', 
    tahfizh: 'write',
    sarpras: 'none', 
    kalender: 'read',
    perpustakaan: 'none',
    kesehatan: 'read', 
    bk: 'read', 
    bukutamu: 'none',
    datamaster: 'none',
    keuangan: 'none',
    keasramaan: 'none',
    bukukas: 'none',
    surat: 'none',
    laporan: 'read',
    auditlog: 'none',
    pengaturan: 'none',
    portalwali: 'none',
    koperasi: 'none',
    koperasi_manajer: 'none',
    syncAdmin: false,
};
