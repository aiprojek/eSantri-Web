
import React, { createContext, useContext, useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { useLiveQuery } from "dexie-react-hooks";
import { PondokSettings, BackupModalState } from '../types';
import { db, PondokSettingsWithId } from '../db';
import { initialSettings, initialSantri } from '../data/mock';

interface SettingsContextType {
    settings: PondokSettingsWithId;
    isLoading: boolean;
    backupModal: BackupModalState;
    onSaveSettings: (newSettings: PondokSettings) => Promise<void>;
    downloadBackup: () => Promise<void>;
    triggerBackupCheck: (forceAction?: boolean) => void;
    closeBackupModal: () => void;
    logActivity: (tableName: string, operation: 'INSERT' | 'UPDATE' | 'DELETE', recordId: string, oldData?: any, newData?: any) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [backupModal, setBackupModal] = useState<BackupModalState>({ isOpen: false, reason: 'periodic' });
    const hasCheckedBackupRef = useRef(false);

    // Core Data - Loaded via LiveQuery for reactivity
    const settingsList = useLiveQuery(() => db.settings.toArray(), []) || [];
    
    // DATA MIGRATION LOGIC (SELF-HEALING)
    const settings = useMemo(() => {
        const rawSettings = settingsList[0];
        if (!rawSettings) return initialSettings as PondokSettingsWithId;
        
        return {
            ...initialSettings,
            ...rawSettings,
            psbConfig: { ...initialSettings.psbConfig, ...(rawSettings.psbConfig || {}) },
            cloudSyncConfig: { ...initialSettings.cloudSyncConfig, ...(rawSettings.cloudSyncConfig || {}) },
            backupConfig: { ...initialSettings.backupConfig, ...(rawSettings.backupConfig || {}) },
            nisSettings: { 
                ...initialSettings.nisSettings, 
                ...(rawSettings.nisSettings || {}),
                jenjangConfig: rawSettings.nisSettings?.jenjangConfig || initialSettings.nisSettings.jenjangConfig
            },
            jenjang: rawSettings.jenjang || [],
            kelas: rawSettings.kelas || [],
            rombel: rawSettings.rombel || [],
            tenagaPengajar: rawSettings.tenagaPengajar || [],
            mataPelajaran: rawSettings.mataPelajaran || [],
            biaya: rawSettings.biaya || [],
        } as PondokSettingsWithId;
    }, [settingsList]);

    // Initial Data Check
    useEffect(() => {
        const checkInit = async () => {
            // Cek apakah ini instalasi baru (Settings kosong)
            const settingsCount = await db.settings.count();
            const isSampleDeleted = localStorage.getItem('eSantriSampleDataDeleted') === 'true';

            if (settingsCount === 0 && !isSampleDeleted) {
                 // Inisialisasi Settings
                 await db.settings.put(initialSettings);
                 
                 // Inisialisasi Santri Sample jika kosong
                 const santriCount = await db.santri.count();
                 if (santriCount === 0) {
                    await db.santri.bulkAdd(initialSantri);
                 }
            }
            setIsLoading(false);
        };
        checkInit();
    }, []);

    const logActivity = async (tableName: string, operation: 'INSERT' | 'UPDATE' | 'DELETE', recordId: string, oldData?: any, newData?: any) => {
        // Simple logging without user context (handled in UI layer or assumed system if called directly)
        // Ideally user info should be passed, but for basic separation, we keep it simple here.
        const log = {
            id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            table_name: tableName,
            record_id: recordId,
            operation,
            old_data: oldData,
            new_data: newData,
            changed_by: 'System/User', // This needs AuthContext to be perfect, but circular dep risk.
            username: 'System/User',
            created_at: new Date().toISOString()
        };
        await db.auditLogs.add(log);
    };

    const onSaveSettings = async (newSettings: PondokSettings) => {
        const id = settings.id;
        const settingsWithId = { ...newSettings, id, lastModified: Date.now() };
        await db.settings.put(settingsWithId);
        await logActivity('settings', 'UPDATE', id?.toString() || '1', null, newSettings);
    };

    const downloadBackup = async () => {
        const data = {
            settings: await db.settings.toArray(), 
            santri: await db.santri.toArray(), 
            tagihan: await db.tagihan.toArray(), 
            pembayaran: await db.pembayaran.toArray(), 
            saldoSantri: await db.saldoSantri.toArray(), 
            transaksiSaldo: await db.transaksiSaldo.toArray(), 
            transaksiKas: await db.transaksiKas.toArray(), 
            suratTemplates: await db.suratTemplates.toArray(), 
            arsipSurat: await db.arsipSurat.toArray(), 
            pendaftar: await db.pendaftar.toArray(), 
            auditLogs: await db.auditLogs.toArray(), 
            users: await db.users.toArray(), 
            raporRecords: await db.raporRecords.toArray(), 
            absensi: await db.absensi.toArray(),
            tahfizh: await db.tahfizh.toArray(),
            buku: await db.buku.toArray(),
            sirkulasi: await db.sirkulasi.toArray(),
            obat: await db.obat.toArray(),
            kesehatanRecords: await db.kesehatanRecords.toArray(),
            bkSessions: await db.bkSessions.toArray(),
            bukuTamu: await db.bukuTamu.toArray(),
            inventaris: await db.inventaris.toArray(),
            calendarEvents: await db.calendarEvents.toArray(),
            jadwalPelajaran: await db.jadwalPelajaran.toArray(),
            arsipJadwal: await db.arsipJadwal.toArray(),
            payrollRecords: await db.payrollRecords.toArray(),
            piketSchedules: await db.piketSchedules.toArray(),
            produkKoperasi: await db.produkKoperasi.toArray(),
            transaksiKoperasi: await db.transaksiKoperasi.toArray(),
            riwayatStok: await db.riwayatStok.toArray(),
            keuanganKoperasi: await db.keuanganKoperasi.toArray(),
            pendingOrders: await db.pendingOrders.toArray(),
            diskon: await db.diskon.toArray(),
            
            version: '3.0',
            timestamp: new Date().toISOString(),
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a'); link.href = url; link.download = `backup_esantri_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url);
        
        const newSettings = { ...settings, backupConfig: { ...settings.backupConfig, lastBackup: new Date().toISOString() } };
        onSaveSettings(newSettings);
    };

    const triggerBackupCheck = useCallback((forceAction: boolean = false) => {
        if (forceAction) { setBackupModal({ isOpen: true, reason: 'action' }); return; }
        if (hasCheckedBackupRef.current) return;
        if (!settings.backupConfig) return;
        const { lastBackup, frequency } = settings.backupConfig;
        if (frequency === 'never') return;
        const now = new Date(); const last = lastBackup ? new Date(lastBackup) : new Date(0); const diffDays = (now.getTime() - last.getTime()) / (1000 * 3600 * 24);
        if ((frequency === 'daily' && diffDays >= 1) || (frequency === 'weekly' && diffDays >= 7)) { setBackupModal({ isOpen: true, reason: 'periodic' }); hasCheckedBackupRef.current = true; }
    }, [settings.backupConfig]);

    const closeBackupModal = () => setBackupModal(prev => ({ ...prev, isOpen: false }));

    return (
        <SettingsContext.Provider value={{
            settings, isLoading, backupModal,
            onSaveSettings, downloadBackup, triggerBackupCheck, closeBackupModal, logActivity
        }}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettingsContext = () => {
    const context = useContext(SettingsContext);
    if (!context) throw new Error('useSettingsContext must be used within a SettingsProvider');
    return context;
};
