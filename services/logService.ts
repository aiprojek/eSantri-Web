import { db } from '../db';
import { AuditLog } from '../types';
import { v4 as uuidv4 } from 'uuid';

let isSyncingMuted = false;
const recentLogKeys = new Map<string, number>();
let hooksInitialized = false;

/**
 * Mutes or unmutes automatic audit logging during background cloud sync / restore operations.
 */
export const setAuditSyncMute = (muted: boolean) => {
    isSyncingMuted = muted;
};

/**
 * Resolves the currently active username from localStorage session or falls back to 'Admin'.
 */
export const resolveActiveUsername = (providedUsername?: string): string => {
    if (providedUsername && providedUsername !== 'System' && providedUsername.trim() !== '') {
        return providedUsername.trim();
    }
    if (typeof window !== 'undefined') {
        try {
            const raw = localStorage.getItem('eSantriCurrentUser');
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed?.username) return String(parsed.username);
                if (parsed?.fullName) return String(parsed.fullName);
            }
        } catch {
            // ignore parse errors
        }
    }
    return providedUsername || 'Admin';
};

/**
 * Sanitizes large binary/base64 strings from audit snapshots to keep IndexedDB & Cloud sync lightweight.
 */
const sanitizeSnapshot = (data: any): any => {
    if (!data || typeof data !== 'object') return data;
    if (Array.isArray(data)) {
        return data.length > 30 ? [...data.slice(0, 30), `...(${data.length - 30} item lainnya)`] : data.map(sanitizeSnapshot);
    }
    const clone: Record<string, any> = {};
    for (const [key, val] of Object.entries(data)) {
        if (typeof val === 'string' && val.length > 500 && (val.startsWith('data:image') || val.startsWith('data:application'))) {
            clone[key] = '[Data Berkas/Gambar Base64]';
        } else if (typeof val === 'string' && val.length > 2000) {
            clone[key] = val.substring(0, 2000) + '...[dipotong]';
        } else {
            clone[key] = val;
        }
    }
    return clone;
};

/**
 * Computes a granular diff between two objects.
 * Returns an object containing the changed fields and their old/new values.
 */
export const computeDiff = (oldData: any, newData: any) => {
    if (!oldData) return { _status: 'CREATED', data: newData };
    if (!newData) return { _status: 'DELETED', data: oldData };

    const diff: { [key: string]: { old: any, new: any } } = {};
    const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);

    allKeys.forEach(key => {
        if (['lastModified', 'updated_at', 'created_at', 'updatedAt', 'createdAt'].includes(key)) return;

        const valOld = oldData[key];
        const valNew = newData[key];

        if (JSON.stringify(valOld) !== JSON.stringify(valNew)) {
            diff[key] = { old: valOld, new: valNew };
        }
    });

    return Object.keys(diff).length > 0 ? diff : null;
};

const markAndCheckDuplicate = (tableName: string, recordId: string, operation: string): boolean => {
    const now = Date.now();
    // Cleanup old entries
    if (recentLogKeys.size > 200) {
        for (const [k, ts] of recentLogKeys.entries()) {
            if (now - ts > 3000) recentLogKeys.delete(k);
        }
    }
    const baseKey = `${tableName}:${recordId}`;
    const lastTs = recentLogKeys.get(baseKey);
    if (lastTs && now - lastTs < 1500) {
        return true; // Duplicate within 1.5s window
    }
    recentLogKeys.set(baseKey, now);
    recentLogKeys.set(`${baseKey}:${operation}`, now);
    return false;
};

/**
 * Logs an activity to the system audit trail.
 */
export const logActivity = async (
    operation: 'INSERT' | 'UPDATE' | 'DELETE',
    tableName: string,
    recordId: string | number,
    oldData: any | null,
    newData: any | null,
    username?: string
) => {
    try {
        if (isSyncingMuted || tableName === 'auditLogs') return;
        const recIdStr = String(recordId ?? '');
        if (!recIdStr) return;

        if (markAndCheckDuplicate(tableName, recIdStr, operation)) {
            return;
        }

        const resolvedUser = resolveActiveUsername(username);
        const log: AuditLog = {
            id: uuidv4(),
            table_name: tableName,
            operation,
            record_id: recIdStr,
            old_data: sanitizeSnapshot(oldData),
            new_data: sanitizeSnapshot(newData),
            changed_by: resolvedUser,
            username: resolvedUser,
            created_at: new Date().toISOString(),
            lastModified: Date.now()
        };

        await db.auditLogs.put(log);
    } catch (error) {
        console.error("Failed to log activity:", error);
    }
};

const AUDITED_TABLES = [
    'santri', 'tagihan', 'pembayaran', 'saldoSantri', 'transaksiSaldo',
    'transaksiKas', 'chartOfAccounts', 'payrollRecords', 'users', 'raporRecords',
    'absensi', 'tahfizh', 'inventaris', 'calendarEvents', 'buku', 'sirkulasi',
    'kesehatanRecords', 'bkSessions', 'bukuTamu', 'suratTemplates', 'arsipSurat',
    'produkKoperasi', 'transaksiKoperasi', 'riwayatStok', 'keuanganKoperasi',
    'pembayaranHutang', 'diskon', 'suppliers', 'warehouses', 'stockTransfers',
    'jurnalMengajar', 'pendaftar', 'settings'
];

/**
 * Registers non-blocking Dexie hooks across all operational tables so any create, update,
 * soft-delete, or hard-delete is automatically recorded in db.auditLogs even if a module
 * does not manually invoke logActivity().
 */
export const setupGlobalAuditHooks = () => {
    if (hooksInitialized) return;
    hooksInitialized = true;

    AUDITED_TABLES.forEach((tableName) => {
        const table = (db as any)[tableName];
        if (!table || !table.hook) return;

        table.hook('creating', function (primKey: any, obj: any) {
            if (isSyncingMuted) return;
            const snapshot = obj ? JSON.parse(JSON.stringify(obj)) : null;
            const resolvedKey = primKey ?? obj?.id ?? obj?.santriId;
            setTimeout(() => {
                if (isSyncingMuted) return;
                const finalId = resolvedKey ?? snapshot?.id ?? snapshot?.santriId;
                if (finalId === undefined || finalId === null) return;
                logActivity('INSERT', tableName, String(finalId), null, snapshot);
            }, 90);
        });

        table.hook('updating', function (mods: any, primKey: any, obj: any) {
            if (isSyncingMuted) return;
            const oldSnapshot = obj ? JSON.parse(JSON.stringify(obj)) : null;
            const newSnapshot = oldSnapshot ? { ...oldSnapshot, ...mods } : mods;
            const resolvedKey = primKey ?? obj?.id ?? obj?.santriId;

            // Check if there are meaningful changes (excluding lastModified)
            const diff = computeDiff(oldSnapshot, newSnapshot);
            if (!diff) return;

            // Detect soft-delete
            const isSoftDelete = Boolean(newSnapshot?.deleted && !oldSnapshot?.deleted);
            const op: 'UPDATE' | 'DELETE' = isSoftDelete ? 'DELETE' : 'UPDATE';

            setTimeout(() => {
                if (isSyncingMuted) return;
                if (resolvedKey === undefined || resolvedKey === null) return;
                logActivity(
                    op,
                    tableName,
                    String(resolvedKey),
                    oldSnapshot,
                    isSoftDelete ? null : newSnapshot
                );
            }, 90);
        });

        table.hook('deleting', function (primKey: any, obj: any) {
            if (isSyncingMuted) return;
            const oldSnapshot = obj ? JSON.parse(JSON.stringify(obj)) : null;
            const resolvedKey = primKey ?? obj?.id ?? obj?.santriId;
            setTimeout(() => {
                if (isSyncingMuted) return;
                if (resolvedKey === undefined || resolvedKey === null) return;
                logActivity('DELETE', tableName, String(resolvedKey), oldSnapshot, null);
            }, 90);
        });
    });
};
