import type { AccessLevel, User, UserPermissions } from '../types';
import { ADMIN_PERMISSIONS, DEFAULT_STAFF_PERMISSIONS, DEFAULT_WALI_KELAS_PERMISSIONS } from './authService';

export const CURRENT_PERMISSION_VERSION = 4;

const ACCESS_LEVELS: AccessLevel[] = ['none', 'read', 'write'];

const PERMISSION_KEYS: Array<keyof UserPermissions> = [
    'santri',
    'psb',
    'whatsapp',
    'akademik',
    'sertifikat',
    'absensi',
    'tahfizh',
    'sarpras',
    'kalender',
    'perpustakaan',
    'kesehatan',
    'bk',
    'bukutamu',
    'datamaster',
    'keuangan',
    'keasramaan',
    'bukukas',
    'surat',
    'laporan',
    'auditlog',
    'pengaturan',
    'portalwali',
    'koperasi',
    'koperasi_manajer',
];

type RoleTemplate = {
    base: UserPermissions;
    syncAdmin: boolean;
};

const getRoleTemplate = (user: User): RoleTemplate => {
    if (user.role === 'admin' || user.isDefaultAdmin) {
        return {
            base: ADMIN_PERMISSIONS as UserPermissions,
            syncAdmin: true,
        };
    }
    if (user.role === 'wali_kelas') {
        return {
            base: DEFAULT_WALI_KELAS_PERMISSIONS as UserPermissions,
            syncAdmin: false,
        };
    }
    return {
        base: DEFAULT_STAFF_PERMISSIONS as UserPermissions,
        syncAdmin: false,
    };
};

const normalizeAccessLevel = (value: unknown, fallback: AccessLevel): AccessLevel => {
    if (typeof value === 'string' && ACCESS_LEVELS.includes(value as AccessLevel)) {
        return value as AccessLevel;
    }
    return fallback;
};

export const normalizeUserPermissions = (user: User): UserPermissions => {
    const template = getRoleTemplate(user);
    const source = user.permissions || {};
    const normalized: UserPermissions = {};
    const isAdminUser = user.role === 'admin' || Boolean(user.isDefaultAdmin);

    for (const key of PERMISSION_KEYS) {
        let fallback = (template.base[key] as AccessLevel) || 'none';

        if (!isAdminUser && key === 'portalwali' && source.portalwali === undefined) {
            if (source.pengaturan && source.pengaturan !== 'none') {
                fallback = source.pengaturan;
            }
        }

        if (!isAdminUser && key === 'koperasi_manajer' && source.koperasi_manajer === undefined) {
            if (source.keuangan === 'write' || source.bukukas === 'write') {
                fallback = 'write';
            }
        }

        if (!isAdminUser && key === 'sertifikat' && source.sertifikat === undefined) {
            if (source.akademik === 'write' || source.surat === 'write') {
                fallback = 'write';
            } else if (
                source.akademik === 'read' ||
                source.surat === 'read' ||
                source.tahfizh === 'write' ||
                source.tahfizh === 'read'
            ) {
                fallback = 'read';
            }
        }

        (normalized as any)[key] = isAdminUser
            ? 'write'
            : normalizeAccessLevel(source[key], fallback);
    }

    normalized.syncAdmin = isAdminUser
        ? true
        : typeof source.syncAdmin === 'boolean'
            ? source.syncAdmin
            : template.syncAdmin;

    return normalized;
};

export interface PermissionMigrationItem {
    userId: number;
    username: string;
    role: User['role'];
    fromVersion: number;
    toVersion: number;
    reason: string;
}

export interface PermissionMigrationReport {
    totalUsers: number;
    migratedCount: number;
    migratedUsers: PermissionMigrationItem[];
    legacyPendingCount: number;
}

export const migrateUserPermissions = (user: User): { user: User; changed: boolean; reason: string } => {
    const normalizedPermissions = normalizeUserPermissions(user);
    const fromVersion = user.permissionVersion ?? 0;
    const samePermissions = JSON.stringify(user.permissions || {}) === JSON.stringify(normalizedPermissions);
    const versionUpToDate = fromVersion >= CURRENT_PERMISSION_VERSION;

    if (samePermissions && versionUpToDate) {
        return { user, changed: false, reason: 'up-to-date' };
    }

    const reason = !versionUpToDate
        ? `permissionVersion ${fromVersion} -> ${CURRENT_PERMISSION_VERSION}`
        : 'permission matrix normalized';

    return {
        user: {
            ...user,
            permissions: normalizedPermissions,
            permissionVersion: CURRENT_PERMISSION_VERSION,
            lastModified: Date.now(),
        },
        changed: true,
        reason,
    };
};
