import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

const readRepoFile = (relPath: string): string =>
    fs.readFileSync(path.resolve(process.cwd(), relPath), 'utf8');

describe('santriBerkas Schema & Exclusion Guardrails (Butir 3.1)', () => {
    it('defines Dexie version 53 with santriBerkas table and indexes without altering Santri', () => {
        const dbSrc = readRepoFile('db.ts');
        expect(dbSrc).toContain('santriBerkas!: Table<SantriBerkas, number>;');
        expect(dbSrc).toContain('.version(53).stores({');
        expect(dbSrc).toContain(
            "santriBerkas: '++id, santriId, pendaftarId, jenis, statusUnduh, [pendaftarId+fieldId], fieldId, lastModified'"
        );
        expect(dbSrc).toContain('.version(51).stores({');
        expect(dbSrc).toContain('.version(52).stores({');
    });

    it('excludes santriBerkas from Firebase TABLES_TO_SYNC', () => {
        const rtSrc = readRepoFile('services/firebaseRealtimeRuntime.ts');
        const match = rtSrc.match(/const TABLES_TO_SYNC\s*=\s*\[([\s\S]*?)\];/);
        expect(match).toBeTruthy();
        expect(match![1]).not.toContain('santriBerkas');
    });

    it('excludes santriBerkas from Dropbox/WebDAV syncService table lists & publishMasterData', () => {
        const syncSrc = readRepoFile('services/syncService.ts');
        expect(syncSrc).not.toContain('santriBerkas');
    });

    it('excludes santriBerkas from SettingsContext downloadBackup JSON export and TabBackup RESTORE_TABLE_CONFIG', () => {
        const settingsCtxSrc = readRepoFile('contexts/SettingsContext.tsx');
        const backupMatch = settingsCtxSrc.match(/const data\s*=\s*\{([\s\S]*?)version:\s*'3\.0'/);
        expect(backupMatch).toBeTruthy();
        expect(backupMatch![1]).not.toContain('santriBerkas');

        const tabBackupSrc = readRepoFile('components/settings/tabs/TabBackup.tsx');
        const restoreMatch = tabBackupSrc.match(/const RESTORE_TABLE_CONFIG[\s\S]*?=\s*\[([\s\S]*?)\];/);
        expect(restoreMatch).toBeTruthy();
        expect(restoreMatch![1]).not.toContain('santriBerkas');
    });

    it('cascades onDeleteSampleData by santriId without clearing entire santriBerkas table', () => {
        const appCtxSrc = readRepoFile('AppContext.tsx');
        const deleteSampleMatch = appCtxSrc.match(/const onDeleteSampleData\s*=\s*async[\s\S]*?const onResetToSampleData/);
        expect(deleteSampleMatch).toBeTruthy();
        expect(deleteSampleMatch![0]).toContain("db.santriBerkas.where('santriId').anyOf(deletedSantriIds).delete()");
        expect(deleteSampleMatch![0]).not.toContain('db.santriBerkas.clear()');
    });
});
