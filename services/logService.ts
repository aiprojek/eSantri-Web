
import { db } from '../db';
import { AuditLog } from '../types';
import { v4 as uuidv4 } from 'uuid';

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
        // Ignore internal/noisy fields
        if (['lastModified', 'updated_at', 'created_at', 'updatedAt', 'createdAt'].includes(key)) return;

        const valOld = oldData[key];
        const valNew = newData[key];

        if (JSON.stringify(valOld) !== JSON.stringify(valNew)) {
            diff[key] = { old: valOld, new: valNew };
        }
    });

    return Object.keys(diff).length > 0 ? diff : null;
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
    username: string = 'System'
) => {
    try {
        const log: AuditLog = {
            id: uuidv4(),
            table_name: tableName,
            operation,
            record_id: String(recordId),
            old_data: oldData,
            new_data: newData,
            changed_by: username, // For backward compatibility if needed
            username,
            created_at: new Date().toISOString(),
            lastModified: Date.now()
        };

        await db.auditLogs.add(log);
    } catch (error) {
        console.error("Failed to log activity:", error);
    }
};
