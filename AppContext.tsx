import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useLiveQuery } from "dexie-react-hooks";
import { PondokSettings, SuratTemplate, ArsipSurat, AuditLog, User } from './types';
import { db, PondokSettingsWithId } from './db';
import { initialSettings, initialSantri } from './data/mock';
import { uploadStaffChanges, downloadAndMergeMaster, publishMasterData } from './services/syncService';
import { ADMIN_PERMISSIONS } from './services/authService';

// --- Types ---
export interface ToastData {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

export interface ConfirmationState {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void | Promise<void>;
  confirmText?: string;
  confirmColor?: string;
}

export interface AlertState {
    isOpen: boolean;
    title: string;
    message: string;
}

interface SantriFilters {
  search: string;
  jenjang: string;
  kelas: string;
  rombel: string;
  status: string;
  gender: string;
  provinsi: string;
  kabupatenKota: string;
  kecamatan: string;
}

interface BackupModalState {
    isOpen: boolean;
    reason: 'periodic' | 'action';
}

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

// This Context now focuses on CORE functionality: Settings, Auth, UI, Sync
interface AppContextType {
  isLoading: boolean;
  settings: PondokSettingsWithId;
  
  // These are light enough to keep in Core or move to a LettersContext, but we'll keep here for simplicity of migration
  suratTemplates: SuratTemplate[];
  arsipSuratList: ArsipSurat[];
  
  // UI State
  santriFilters: SantriFilters;
  setSantriFilters: React.Dispatch<React.SetStateAction<SantriFilters>>;
  toasts: ToastData[];
  confirmation: ConfirmationState;
  alertModal: AlertState;
  backupModal: BackupModalState;
  
  // Auth State
  currentUser: User | null;
  login: (user: User) => void;
  logout: () => void;

  // Sync State
  syncStatus: SyncStatus;

  // Actions
  onSaveSettings: (newSettings: PondokSettings) => Promise<void>;
  onSaveSuratTemplate: (template: SuratTemplate) => Promise<void>;
  onDeleteSuratTemplate: (id: number) => Promise<void>;
  onSaveArsipSurat: (surat: Omit<ArsipSurat, 'id'>) => Promise<void>;
  onDeleteArsipSurat: (id: number) => Promise<void>;
  onDeleteSampleData: () => Promise<void>;
  
  downloadBackup: () => Promise<void>;
  triggerBackupCheck: (forceAction?: boolean) => void;
  closeBackupModal: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: number) => void;
  showAlert: (title: string, message: string) => void;
  hideAlert: () => void;
  showConfirmation: (
    title: string,
    message: string,
    onConfirm: () => void | Promise<void>,
    options?: { confirmText?: string; confirmColor?: string }
  ) => void;
  hideConfirmation: () => void;
  triggerManualSync: (action: 'up' | 'down' | 'admin_publish') => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

const VIRTUAL_ADMIN: User = {
    id: 0,
    username: 'admin',
    passwordHash: '',
    fullName: 'Administrator Inti',
    role: 'admin',
    permissions: ADMIN_PERMISSIONS as any,
    securityQuestion: '',
    securityAnswerHash: '',
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isLoading, setIsLoading] = useState(true);
    
    // Core Data - Loaded via LiveQuery for reactivity
    const settingsList = useLiveQuery(() => db.settings.toArray(), []) || [];
    const settings = settingsList[0] || initialSettings as PondokSettingsWithId;
    
    // Use filter because 'deleted' is not indexed
    const suratTemplates = useLiveQuery(() => db.suratTemplates.filter(t => !t.deleted).toArray(), []) || [];
    const arsipSuratList = useLiveQuery(() => db.arsipSurat.filter(a => !a.deleted).toArray(), []) || [];
    
    // Auth State
    const [currentUser, setCurrentUser] = useState<User | null>(null);

    // Sync Status State
    const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
    const hasPendingChanges = useRef(false);

    const [santriFilters, setSantriFilters] = useState<SantriFilters>({
      search: '', jenjang: '', kelas: '', rombel: '', status: '', gender: '', provinsi: '', kabupatenKota: '', kecamatan: ''
    });
    const [toasts, setToasts] = useState<ToastData[]>([]);
    const [confirmation, setConfirmation] = useState<ConfirmationState>({
        isOpen: false, title: '', message: '', onConfirm: () => {},
    });
    const [alertModal, setAlertModal] = useState<AlertState>({ isOpen: false, title: '', message: '' });
    const [backupModal, setBackupModal] = useState<BackupModalState>({ isOpen: false, reason: 'periodic' });

    const autoSyncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pullSyncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const hasCheckedBackupRef = useRef(false);

    const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
        setToasts(prev => [...prev, { id: Date.now(), message, type }]);
    }, []);

    const removeToast = useCallback((id: number) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    }, []);

    const generateUniqueId = (): number => {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000);
        return parseInt(`${timestamp}${random}`.slice(0, 16)); 
    };

    // Initial Data Check
    useEffect(() => {
        const checkInit = async () => {
            const count = await db.settings.count();
            if (count === 0 && localStorage.getItem('eSantriSampleDataDeleted') !== 'true') {
                 await db.settings.put(initialSettings);
                 await db.santri.bulkPut(initialSantri);
            }
            setIsLoading(false);
        };
        checkInit();
    }, []);

    // Sync Current User with Multi-User Mode
    useEffect(() => {
        if (!settings) return;
        if (!settings.multiUserMode) {
            setCurrentUser(VIRTUAL_ADMIN);
        } else if (currentUser && currentUser.id === 0) {
            setCurrentUser(null); // Logout virtual admin if switched to multi-user
        }
    }, [settings?.multiUserMode]);

    // Global Error Handler
    useEffect(() => {
        const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
            const message = event.reason?.message || (typeof event.reason === 'string' ? event.reason : "Terjadi kesalahan yang tidak terduga.");
            if (!message.includes('ResizeObserver')) {
                 showToast(`Error: ${message}`, 'error');
            }
        };
        window.addEventListener('unhandledrejection', handleUnhandledRejection);
        return () => window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    }, [showToast]);

    useEffect(() => {
        if (settings.cloudSyncConfig?.autoSync && settings.cloudSyncConfig.provider === 'dropbox') {
            if (pullSyncIntervalRef.current) clearInterval(pullSyncIntervalRef.current);
            pullSyncIntervalRef.current = setInterval(() => {
                triggerManualSync('down');
            }, 300000); 
        }
        return () => { if (pullSyncIntervalRef.current) clearInterval(pullSyncIntervalRef.current); }
    }, [settings.cloudSyncConfig]);

    const login = (user: User) => setCurrentUser(user);
    const logout = () => setCurrentUser(null);

    const logActivity = async (tableName: string, operation: 'INSERT' | 'UPDATE' | 'DELETE', recordId: string, oldData?: any, newData?: any) => {
        const username = currentUser?.username || 'System';
        const log: AuditLog = {
            id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            table_name: tableName,
            record_id: recordId,
            operation,
            old_data: oldData,
            new_data: newData,
            changed_by: username,
            username: username,
            created_at: new Date().toISOString()
        };
        await db.auditLogs.add(log);
    };

    const triggerAutoSync = useCallback(() => {
        if (!settings.cloudSyncConfig?.autoSync || settings.cloudSyncConfig.provider === 'none') return;
        if (currentUser?.role === 'admin' && settings.multiUserMode) return;

        setSyncStatus('syncing');
        hasPendingChanges.current = true;

        if (autoSyncTimeoutRef.current) clearTimeout(autoSyncTimeoutRef.current);

        autoSyncTimeoutRef.current = setTimeout(async () => {
            try {
                const username = currentUser?.username || 'user';
                await uploadStaffChanges(settings.cloudSyncConfig, username);
                
                // Update Last Sync
                const id = settings.id;
                await db.settings.update(id!, { 
                    cloudSyncConfig: { ...settings.cloudSyncConfig, lastSync: new Date().toISOString() } 
                });

                setSyncStatus('success');
                hasPendingChanges.current = false;
                setTimeout(() => setSyncStatus('idle'), 3000);
            } catch (error) {
                setSyncStatus('error');
            }
        }, 5000); 
    }, [settings, currentUser, showToast]);

    const triggerManualSync = async (action: 'up' | 'down' | 'admin_publish') => {
        const config = settings.cloudSyncConfig;
        if (config.provider !== 'dropbox') return;

        setSyncStatus('syncing');
        try {
            if (action === 'admin_publish') {
                if (currentUser?.role !== 'admin' && !currentUser?.permissions?.syncAdmin) {
                    throw new Error("Anda tidak memiliki izin untuk mempublikasikan master data.");
                }
                await publishMasterData(config);
                showToast('Data Master berhasil dipublikasikan.', 'success');
            } else if (action === 'up') {
                const username = currentUser?.username || 'user';
                await uploadStaffChanges(config, username);
                showToast('Perubahan lokal berhasil dikirim ke Cloud.', 'success');
                hasPendingChanges.current = false;
            } else {
                const result = await downloadAndMergeMaster(config);
                if (result.status === 'merged') {
                    showToast('Data terbaru dari Admin berhasil digabungkan.', 'success');
                    setTimeout(() => window.location.reload(), 1500);
                } else if (result.status === 'no_master') {
                    showToast('Belum ada Master Data dari Admin di Cloud.', 'info');
                }
            }
            setSyncStatus('success');
            setTimeout(() => setSyncStatus('idle'), 3000);
        } catch (e) {
            setSyncStatus('error');
            showToast(`Gagal Sync: ${(e as Error).message}`, 'error');
        }
    };

    const addTimestamp = (data: any) => ({ ...data, lastModified: Date.now() });

    const onSaveSettings = async (newSettings: PondokSettings) => {
        const id = settings.id;
        const settingsWithId = { ...newSettings, id, lastModified: Date.now() };
        await db.settings.put(settingsWithId);
        await logActivity('settings', 'UPDATE', id?.toString() || '1', null, newSettings);
        triggerAutoSync();
        
        if (newSettings.multiUserMode === false) {
            setCurrentUser(VIRTUAL_ADMIN);
        } else if (newSettings.multiUserMode === true && !currentUser) {
            setCurrentUser(null);
        }
    };

    const onDeleteSampleData = async () => { 
        await (db as any).transaction('rw', db.santri, db.tagihan, db.pembayaran, db.saldoSantri, db.transaksiSaldo, db.transaksiKas, db.auditLogs, db.absensi, async () => { 
            await db.santri.clear(); await db.tagihan.clear(); await db.pembayaran.clear(); 
            await db.saldoSantri.clear(); await db.transaksiSaldo.clear(); await db.transaksiKas.clear(); 
            await db.auditLogs.clear(); await db.absensi.clear(); 
        }); 
        triggerAutoSync(); 
    };

    const onSaveSuratTemplate = async (template: SuratTemplate) => { const withTs = addTimestamp(template); if (template.id) { await db.suratTemplates.put(withTs); await logActivity('suratTemplates', 'UPDATE', template.id.toString()); } else { const newId = generateUniqueId(); const newItem = { ...withTs, id: newId }; await db.suratTemplates.put(newItem); await logActivity('suratTemplates', 'INSERT', newId.toString()); } triggerAutoSync(); };
    const onDeleteSuratTemplate = async (id: number) => { const item = suratTemplates.find(t => t.id === id); if(!item) return; const deletedItem = { ...item, deleted: true, lastModified: Date.now() }; await db.suratTemplates.put(deletedItem); await logActivity('suratTemplates', 'DELETE', id.toString()); triggerAutoSync(); };
    const onSaveArsipSurat = async (surat: Omit<ArsipSurat, 'id'>) => { const id = generateUniqueId(); const withTs = addTimestamp({ ...surat, id }); await db.arsipSurat.put(withTs as ArsipSurat); await logActivity('arsipSurat', 'INSERT', id.toString()); triggerAutoSync(); };
    const onDeleteArsipSurat = async (id: number) => { const item = arsipSuratList.find(a => a.id === id); if(!item) return; const deletedItem = { ...item, deleted: true, lastModified: Date.now() }; await db.arsipSurat.put(deletedItem); await logActivity('arsipSurat', 'DELETE', id.toString()); triggerAutoSync(); };

    const downloadBackup = async () => {
        const data = {
            settings: await db.settings.toArray(), santri: await db.santri.toArray(), tagihan: await db.tagihan.toArray(), pembayaran: await db.pembayaran.toArray(), saldoSantri: await db.saldoSantri.toArray(), 
            transaksiSaldo: await db.transaksiSaldo.toArray(), transaksiKas: await db.transaksiKas.toArray(), suratTemplates: await db.suratTemplates.toArray(), arsipSurat: await db.arsipSurat.toArray(), 
            pendaftar: await db.pendaftar.toArray(), auditLogs: await db.auditLogs.toArray(), users: await db.users.toArray(), raporRecords: await db.raporRecords.toArray(), absensi: await db.absensi.toArray(), 
            version: '2.0', timestamp: new Date().toISOString(),
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
    const showAlert = (title: string, message: string) => setAlertModal({ isOpen: true, title, message });
    const hideAlert = () => setAlertModal({ ...alertModal, isOpen: false });

    const showConfirmation = (title: string, message: string, onConfirm: () => void | Promise<void>, options: { confirmText?: string; confirmColor?: string } = {}) => {
        setConfirmation({
            isOpen: true, title, message,
            onConfirm: async () => { await onConfirm(); setConfirmation(prev => ({ ...prev, isOpen: false })); },
            confirmText: options.confirmText, confirmColor: options.confirmColor
        });
    };
    const hideConfirmation = () => setConfirmation(prev => ({ ...prev, isOpen: false }));

    return (
        <AppContext.Provider value={{
            isLoading, settings, suratTemplates, arsipSuratList, santriFilters, setSantriFilters, toasts, confirmation, alertModal, backupModal, 
            currentUser, login, logout, syncStatus,
            onSaveSettings, onSaveSuratTemplate, onDeleteSuratTemplate, onSaveArsipSurat, onDeleteArsipSurat, onDeleteSampleData, 
            downloadBackup, triggerBackupCheck, closeBackupModal, showToast, removeToast, showAlert, hideAlert, showConfirmation, hideConfirmation,
            triggerManualSync
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

// Alias for semantic clarity in other files
export const useSettingsContext = useAppContext;
