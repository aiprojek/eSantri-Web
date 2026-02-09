
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useLiveQuery } from "dexie-react-hooks";
import { SuratTemplate, ArsipSurat, AuditLog, PondokSettings } from './types';
import { db } from './db';
import { uploadStaffChanges, downloadAndMergeMaster, publishMasterData } from './services/syncService';
import { initialSantri } from './data/mock';

// Import New Contexts
import { useUIContext } from './contexts/UIContext';
import { useAuthContext } from './contexts/AuthContext';
import { useSettingsContext } from './contexts/SettingsContext';
import { useSantriContext } from './contexts/SantriContext';

// Legacy Types Re-export (for compatibility)
export type { ToastData, ConfirmationState, AlertState, SyncStatus } from './types';
import { SyncStatus } from './types'; // Need specific import for value

interface AppContextType {
  // From SettingsContext
  isLoading: boolean;
  settings: PondokSettings;
  backupModal: any;
  onSaveSettings: (newSettings: PondokSettings) => Promise<void>;
  downloadBackup: () => Promise<void>;
  triggerBackupCheck: (forceAction?: boolean) => void;
  closeBackupModal: () => void;
  
  // From AuthContext
  currentUser: any;
  login: (user: any) => void;
  logout: () => void;

  // From UIContext
  toasts: any[];
  confirmation: any;
  alertModal: any;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: number) => void;
  showAlert: (title: string, message: string) => void;
  hideAlert: () => void;
  showConfirmation: (title: string, message: string, onConfirm: () => void | Promise<void>, options?: any) => void;
  hideConfirmation: () => void;

  // From SantriContext
  santriFilters: any;
  setSantriFilters: React.Dispatch<React.SetStateAction<any>>;

  // Local/Legacy (Surat & Sync)
  suratTemplates: SuratTemplate[];
  arsipSuratList: ArsipSurat[];
  syncStatus: SyncStatus;
  
  onSaveSuratTemplate: (template: SuratTemplate) => Promise<void>;
  onDeleteSuratTemplate: (id: number) => Promise<void>;
  onSaveArsipSurat: (surat: Omit<ArsipSurat, 'id'>) => Promise<void>;
  onDeleteArsipSurat: (id: number) => Promise<void>;
  onDeleteSampleData: () => Promise<void>;
  triggerManualSync: (action: 'up' | 'down' | 'admin_publish') => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // Consume sub-contexts
    const ui = useUIContext();
    const auth = useAuthContext();
    const sets = useSettingsContext();
    const santriCtx = useSantriContext();

    // Local State for Surat & Sync
    const suratTemplates = useLiveQuery(() => db.suratTemplates.filter((t: SuratTemplate) => !t.deleted).toArray(), []) || [];
    const arsipSuratList = useLiveQuery(() => db.arsipSurat.filter((a: ArsipSurat) => !a.deleted).toArray(), []) || [];
    const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
    const autoSyncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pullSyncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const generateUniqueId = (): number => {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000);
        return parseInt(`${timestamp}${random}`.slice(0, 16)); 
    };

    // Helper Log
    const logActivity = sets.logActivity;

    const addTimestamp = (data: any) => ({ ...data, lastModified: Date.now() });

    // Sync Logic
    useEffect(() => {
        if (sets.settings.cloudSyncConfig?.autoSync && sets.settings.cloudSyncConfig.provider !== 'none') {
            if (pullSyncIntervalRef.current) clearInterval(pullSyncIntervalRef.current);
            pullSyncIntervalRef.current = setInterval(() => {
                triggerManualSync('down');
            }, 300000); 
        }
        return () => { if (pullSyncIntervalRef.current) clearInterval(pullSyncIntervalRef.current); }
    }, [sets.settings.cloudSyncConfig]);

    const triggerAutoSync = useCallback(() => {
        if (!sets.settings.cloudSyncConfig?.autoSync || sets.settings.cloudSyncConfig.provider === 'none') return;
        if (auth.currentUser?.role === 'admin' && sets.settings.multiUserMode) return;

        setSyncStatus('syncing');

        if (autoSyncTimeoutRef.current) clearTimeout(autoSyncTimeoutRef.current);

        autoSyncTimeoutRef.current = setTimeout(async () => {
            try {
                const username = auth.currentUser?.username || 'user';
                await uploadStaffChanges(sets.settings.cloudSyncConfig, username);
                
                const id = sets.settings.id;
                await db.settings.update(id!, { 
                    cloudSyncConfig: { ...sets.settings.cloudSyncConfig, lastSync: new Date().toISOString() } 
                });

                setSyncStatus('success');
                setTimeout(() => setSyncStatus('idle'), 3000);
            } catch (error) {
                setSyncStatus('error');
            }
        }, 5000); 
    }, [sets.settings, auth.currentUser]);

    const triggerManualSync = async (action: 'up' | 'down' | 'admin_publish') => {
        const config = sets.settings.cloudSyncConfig;
        if (!config || config.provider === 'none') return;

        setSyncStatus('syncing');
        try {
            if (action === 'admin_publish') {
                if (auth.currentUser?.role !== 'admin' && !auth.currentUser?.permissions?.syncAdmin) {
                    throw new Error("Anda tidak memiliki izin untuk mempublikasikan master data.");
                }
                await publishMasterData(config);
                ui.showToast('Data Master berhasil dipublikasikan.', 'success');
            } else if (action === 'up') {
                const username = auth.currentUser?.username || 'user';
                await uploadStaffChanges(config, username);
                ui.showToast('Perubahan lokal berhasil dikirim ke Cloud.', 'success');
            } else {
                const result = await downloadAndMergeMaster(config);
                if (result.status === 'merged') {
                    ui.showToast('Data terbaru dari Admin berhasil digabungkan.', 'success');
                    setTimeout(() => window.location.reload(), 1500);
                } else if (result.status === 'no_master') {
                    ui.showToast('Belum ada Master Data dari Admin di Cloud.', 'info');
                }
            }
            setSyncStatus('success');
            setTimeout(() => setSyncStatus('idle'), 3000);
        } catch (e) {
            setSyncStatus('error');
            ui.showToast(`Gagal Sync: ${(e as Error).message}`, 'error');
        }
    };

    // Surat Actions
    const onSaveSuratTemplate = async (template: SuratTemplate) => { const withTs = addTimestamp(template); if (template.id) { await db.suratTemplates.put(withTs); await logActivity('suratTemplates', 'UPDATE', template.id.toString()); } else { const newId = generateUniqueId(); const newItem = { ...withTs, id: newId }; await db.suratTemplates.put(newItem); await logActivity('suratTemplates', 'INSERT', newId.toString()); } triggerAutoSync(); };
    const onDeleteSuratTemplate = async (id: number) => { const item = suratTemplates.find(t => t.id === id); if(!item) return; const deletedItem = { ...item, deleted: true, lastModified: Date.now() }; await db.suratTemplates.put(deletedItem); await logActivity('suratTemplates', 'DELETE', id.toString()); triggerAutoSync(); };
    const onSaveArsipSurat = async (surat: Omit<ArsipSurat, 'id'>) => { const id = generateUniqueId(); const withTs = addTimestamp({ ...surat, id }); await db.arsipSurat.put(withTs as ArsipSurat); await logActivity('arsipSurat', 'INSERT', id.toString()); triggerAutoSync(); };
    const onDeleteArsipSurat = async (id: number) => { const item = arsipSuratList.find(a => a.id === id); if(!item) return; const deletedItem = { ...item, deleted: true, lastModified: Date.now() }; await db.arsipSurat.put(deletedItem); await logActivity('arsipSurat', 'DELETE', id.toString()); triggerAutoSync(); };

    // Sample Data
    const onDeleteSampleData = async () => { 
        await (db as any).transaction('rw', db.santri, db.tagihan, db.pembayaran, db.saldoSantri, db.transaksiSaldo, db.transaksiKas, db.auditLogs, db.absensi, db.tahfizh, db.kesehatanRecords, db.bkSessions, db.bukuTamu, db.buku, db.sirkulasi, db.inventaris, db.calendarEvents, db.jadwalPelajaran, db.arsipJadwal, db.pendaftar, db.raporRecords, db.users, db.payrollRecords, db.piketSchedules, db.produkKoperasi, db.transaksiKoperasi, db.riwayatStok, db.keuanganKoperasi, db.pendingOrders, async () => { 
            await db.santri.clear(); await db.tagihan.clear(); await db.pembayaran.clear(); 
            await db.saldoSantri.clear(); await db.transaksiSaldo.clear(); await db.transaksiKas.clear(); 
            await db.auditLogs.clear(); await db.absensi.clear(); 
            await db.tahfizh.clear(); await db.kesehatanRecords.clear(); await db.bkSessions.clear(); await db.bukuTamu.clear();
            await db.buku.clear(); await db.sirkulasi.clear(); await db.inventaris.clear(); await db.calendarEvents.clear();
            await db.jadwalPelajaran.clear(); await db.arsipJadwal.clear(); await db.pendaftar.clear(); await db.raporRecords.clear();
            
            // New Modules Clear
            await db.payrollRecords.clear();
            await db.piketSchedules.clear();
            await db.produkKoperasi.clear();
            await db.transaksiKoperasi.clear();
            await db.riwayatStok.clear();
            await db.keuanganKoperasi.clear();
            await db.pendingOrders.clear();
        }); 
        triggerAutoSync(); 
    };

    return (
        <AppContext.Provider value={{
            // Spread sub-contexts
            ...ui,
            ...auth,
            ...sets,
            santriFilters: santriCtx.santriFilters,
            setSantriFilters: santriCtx.setSantriFilters,

            // Local
            suratTemplates, arsipSuratList, syncStatus,
            onSaveSuratTemplate, onDeleteSuratTemplate, onSaveArsipSurat, onDeleteArsipSurat,
            onDeleteSampleData, triggerManualSync
        }}>
            {children}
        </AppContext.Provider>
    );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within an AppProvider');
  return context;
};

// Legacy alias
export const useSettingsContextLegacy = useAppContext;
