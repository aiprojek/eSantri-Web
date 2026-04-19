
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
    koperasi: 'write', // NEW
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
    koperasi: 'write', // Staff usually handles sales
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
            surat: 'write',
            psb: 'write',
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
    akademik: 'write', 
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
    koperasi: 'none',
    syncAdmin: false,
};
