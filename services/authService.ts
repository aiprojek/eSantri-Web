
// Simple client-side hashing service for offline app
// WARNING: This is "Application Level Security", not "Database Level Security".

export const hashString = async (message: string): Promise<string> => {
    if (!message) return '';
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
};

// Generate a random recovery key format: ESANTRI-XXXX-XXXX-XXXX
export const generateRecoveryKey = (): string => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I, O, 1, 0 to avoid confusion
    let result = 'ESANTRI';
    for (let i = 0; i < 3; i++) {
        result += '-';
        for (let j = 0; j < 4; j++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
    }
    return result;
}

// Default Permissions for Super Admin
export const ADMIN_PERMISSIONS = {
    santri: 'write',
    psb: 'write',
    akademik: 'write', 
    absensi: 'write', 
    tahfizh: 'write',
    sarpras: 'write', 
    kalender: 'write', 
    perpustakaan: 'write', // NEW
    datamaster: 'write',
    keuangan: 'write',
    keasramaan: 'write',
    bukukas: 'write',
    surat: 'write',
    laporan: 'write',
    auditlog: 'write',
    pengaturan: 'write',
    syncAdmin: true,
};

// Default Permissions for New Staff
export const DEFAULT_STAFF_PERMISSIONS = {
    santri: 'read',
    psb: 'read',
    akademik: 'none', 
    absensi: 'write', 
    tahfizh: 'read',
    sarpras: 'read', 
    kalender: 'read',
    perpustakaan: 'read', // Default Read for Staff
    datamaster: 'none',
    keuangan: 'none',
    keasramaan: 'read',
    bukukas: 'none',
    surat: 'read',
    laporan: 'read',
    auditlog: 'none',
    pengaturan: 'none',
    syncAdmin: false,
};
