
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { PondokSettings, Santri, Tagihan, Pembayaran, Alamat, SaldoSantri, TransaksiSaldo, TransaksiKas, SuratTemplate, ArsipSurat, AuditLog, User, AbsensiRecord } from './types';
import { db, PondokSettingsWithId } from './db';
import { initialSantri, initialSettings } from './data/mock';
import { generateTagihanBulanan, generateTagihanAwal } from './services/financeService';
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

// NEW: Sync Status Type
export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

interface AppContextType {
  isLoading: boolean;
  settings: PondokSettingsWithId;
  santriList: Santri[];
  tagihanList: Tagihan[];
  pembayaranList: Pembayaran[];
  saldoSantriList: SaldoSantri[];
  transaksiSaldoList: TransaksiSaldo[];
  transaksiKasList: TransaksiKas[];
  suratTemplates: SuratTemplate[];
  arsipSuratList: ArsipSurat[];
  absensiList: AbsensiRecord[]; // NEW
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
  syncStatus: SyncStatus; // Expose status to UI

  onSaveSettings: (newSettings: PondokSettings) => Promise<void>;
  onAddSantri: (santriData: Omit<Santri, 'id'>) => Promise<void>;
  onBulkAddSantri: (newSantriData: Omit<Santri, 'id'>[]) => Promise<void>;
  onUpdateSantri: (santri: Santri) => Promise<void>;
  onBulkUpdateSantri: (updatedSantriList: Santri[]) => Promise<void>;
  onDeleteSantri: (id: number) => Promise<void>;
  onDeleteSampleData: () => Promise<void>;
  onGenerateTagihanBulanan: (tahun: number, bulan: number) => Promise<{ generated: number; skipped: number }>;
  onGenerateTagihanAwal: () => Promise<{ generated: number; skipped: number }>;
  onAddPembayaran: (pembayaranData: Omit<Pembayaran, 'id'>) => Promise<void>;
  onAddTransaksiSaldo: (data: Omit<TransaksiSaldo, 'id' | 'saldoSetelah' | 'tanggal'>) => Promise<void>;
  onAddTransaksiKas: (data: Omit<TransaksiKas, 'id' | 'saldoSetelah' | 'tanggal'>) => Promise<void>;
  onSetorKeKas: (pembayaranIds: number[], totalSetoran: number, tanggalSetor: string, penanggungJawab: string, catatan: string) => Promise<void>;
  onSaveSuratTemplate: (template: SuratTemplate) => Promise<void>;
  onDeleteSuratTemplate: (id: number) => Promise<void>;
  onSaveArsipSurat: (surat: Omit<ArsipSurat, 'id'>) => Promise<void>;
  onDeleteArsipSurat: (id: number) => Promise<void>;
  onSaveAbsensi: (records: AbsensiRecord[]) => Promise<void>; // NEW
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
    const [settings, setSettings] = useState<PondokSettingsWithId>(initialSettings);
    const [santriList, setSantriList] = useState<Santri[]>([]);
    const [tagihanList, setTagihanList] = useState<Tagihan[]>([]);
    const [pembayaranList, setPembayaranList] = useState<Pembayaran[]>([]);
    const [saldoSantriList, setSaldoSantriList] = useState<SaldoSantri[]>([]);
    const [transaksiSaldoList, setTransaksiSaldoList] = useState<TransaksiSaldo[]>([]);
    const [transaksiKasList, setTransaksiKasList] = useState<TransaksiKas[]>([]);
    const [suratTemplates, setSuratTemplates] = useState<SuratTemplate[]>([]);
    const [arsipSuratList, setArsipSuratList] = useState<ArsipSurat[]>([]);
    const [absensiList, setAbsensiList] = useState<AbsensiRecord[]>([]); // NEW
    
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

    // Global Error Handler
    useEffect(() => {
        const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
            const message = event.reason?.message || (typeof event.reason === 'string' ? event.reason : "Terjadi kesalahan yang tidak terduga.");
            console.error("Unhandled Rejection:", event.reason);
            if (!message.includes('ResizeObserver')) {
                 showToast(`Error: ${message}`, 'error');
            }
        };

        const handleError = (event: ErrorEvent) => {
            const message = event.message || "Terjadi kesalahan sistem.";
            console.error("Global Error:", event.error);
            showToast(`System Error: ${message}`, 'error');
        };

        window.addEventListener('unhandledrejection', handleUnhandledRejection);
        window.addEventListener('error', handleError);

        return () => {
            window.removeEventListener('unhandledrejection', handleUnhandledRejection);
            window.removeEventListener('error', handleError);
        };
    }, [showToast]);

    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (syncStatus === 'syncing' || hasPendingChanges.current) {
                e.preventDefault();
                e.returnValue = 'Data sedang disinkronkan ke Cloud. Mohon tunggu sebentar.';
                return e.returnValue;
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [syncStatus]);

    useEffect(() => {
        const loadData = async () => {
            try {
                const settingsCount = await db.settings.count();
                const santriCount = await db.santri.count();
                const sampleDataDeleted = localStorage.getItem('eSantriSampleDataDeleted') === 'true';

                if ((settingsCount === 0 || santriCount === 0) && !sampleDataDeleted) {
                    await (db as any).transaction('rw', db.settings, db.santri, async () => {
                        await db.settings.clear();
                        await db.santri.clear();
                        await db.settings.put(initialSettings);
                        await db.santri.bulkPut(initialSantri);
                    });
                }

                const [currentSettings, currentSantri, currentTagihan, currentPembayaran, currentSaldo, currentTransaksi, currentKas, currentTemplates, currentArsip, currentAbsensi] = await Promise.all([
                    db.settings.toCollection().first(),
                    db.santri.toArray(),
                    db.tagihan.toArray(),
                    db.pembayaran.toArray(),
                    db.saldoSantri.toArray(),
                    db.transaksiSaldo.toArray(),
                    db.transaksiKas.toArray(),
                    db.suratTemplates.toArray(),
                    db.arsipSurat.toArray(),
                    db.absensi.toArray(), // Fetch Absensi
                ]);

                const migrateAddress = (addr: any): Alamat | undefined => {
                    if (!addr) return undefined;
                    if (typeof addr === 'string') return { detail: addr };
                    return addr;
                };

                const filterDeleted = (list: any[]) => list.filter(item => !item.deleted);

                const migratedSantri = filterDeleted(currentSantri).map(s => ({
                    ...s,
                    alamat: migrateAddress(s.alamat) || { detail: '' },
                    alamatAyah: migrateAddress(s.alamatAyah),
                    alamatIbu: migrateAddress(s.alamatIbu),
                    alamatWali: migrateAddress(s.alamatWali),
                }));

                const safeSettings = currentSettings || initialSettings;
                if (!safeSettings.backupConfig) safeSettings.backupConfig = { frequency: 'weekly', lastBackup: null };
                if (!safeSettings.cloudSyncConfig) safeSettings.cloudSyncConfig = { provider: 'none', lastSync: null, autoSync: false };
                if (!safeSettings.psbConfig) safeSettings.psbConfig = initialSettings.psbConfig;
                if (safeSettings.multiUserMode === undefined) safeSettings.multiUserMode = false;

                setSettings(safeSettings);
                setSantriList(migratedSantri);
                setTagihanList(filterDeleted(currentTagihan));
                setPembayaranList(filterDeleted(currentPembayaran));
                setSaldoSantriList(filterDeleted(currentSaldo));
                setTransaksiSaldoList(filterDeleted(currentTransaksi));
                setTransaksiKasList(filterDeleted(currentKas));
                setSuratTemplates(filterDeleted(currentTemplates));
                setArsipSuratList(filterDeleted(currentArsip));
                setAbsensiList(filterDeleted(currentAbsensi)); // Set Absensi State

                if (!safeSettings.multiUserMode) {
                    setCurrentUser(VIRTUAL_ADMIN);
                } else {
                    setCurrentUser(null);
                }

                // AUTO PULL ON LOAD
                if (safeSettings.cloudSyncConfig?.autoSync && safeSettings.cloudSyncConfig.provider === 'dropbox') {
                    showToast('Memeriksa pembaruan data dari cloud...', 'info');
                    setSyncStatus('syncing');
                    downloadAndMergeMaster(safeSettings.cloudSyncConfig).then(result => {
                        if (result.status === 'merged') {
                            showToast('Data berhasil diperbarui dari Cloud.', 'success');
                            setTimeout(() => window.location.reload(), 1500);
                        }
                        setSyncStatus('success');
                        setTimeout(() => setSyncStatus('idle'), 3000);
                    }).catch(err => {
                        console.error("Auto pull failed", err);
                        setSyncStatus('error');
                    });
                }

            } catch (error) {
                console.error("Failed to load data from DexieDB", error);
                showToast("Gagal memuat data lokal. Aplikasi akan menggunakan data default/kosong.", 'error');
                setSettings(initialSettings);
                setSantriList(initialSantri);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
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

    const login = (user: User) => {
        setCurrentUser(user);
    };

    const logout = () => {
        setCurrentUser(null);
    };

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
                
                const now = new Date().toISOString();
                setSettings(prev => ({ ...prev, cloudSyncConfig: { ...prev.cloudSyncConfig, lastSync: now } }));
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
                showToast('Data Master berhasil dipublikasikan untuk semua staff.', 'success');
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
            console.error(e);
            setSyncStatus('error');
            showToast(`Gagal Sync: ${(e as Error).message}`, 'error');
        }
    };

    const addTimestamp = (data: any) => ({ ...data, lastModified: Date.now() });

    const onSaveSettings = async (newSettings: PondokSettings) => {
        const id = (settings as PondokSettingsWithId).id;
        const settingsWithId = { ...newSettings, id, lastModified: Date.now() };
        await db.settings.put(settingsWithId);
        setSettings(settingsWithId);
        await logActivity('settings', 'UPDATE', id?.toString() || '1', null, newSettings);
        triggerAutoSync();
        
        if (newSettings.multiUserMode === false) {
            setCurrentUser(VIRTUAL_ADMIN);
        } else if (newSettings.multiUserMode === true && !currentUser) {
            setCurrentUser(null);
        }
    };

    // ... [Other Handlers Omitted for Brevity, but exist] ...
    const onAddSantri = async (santriData: Omit<Santri, 'id'>) => { const id = generateUniqueId(); const withTs = addTimestamp({ ...santriData, id }); await db.santri.put(withTs as Santri); setSantriList(prev => [...prev, withTs as Santri]); await logActivity('santri', 'INSERT', id.toString(), null, withTs); triggerAutoSync(); };
    const onBulkAddSantri = async (newSantriData: Omit<Santri, 'id'>[]) => { const withTs = newSantriData.map(s => addTimestamp({ ...s, id: generateUniqueId() })); await db.santri.bulkPut(withTs as Santri[]); setSantriList(prev => [...prev, ...withTs as Santri[]]); await logActivity('santri', 'INSERT', 'BULK', null, { count: withTs.length }); triggerAutoSync(); };
    const onUpdateSantri = async (santri: Santri) => { const withTs = addTimestamp(santri); await db.santri.put(withTs); setSantriList(prev => prev.map(s => s.id === santri.id ? withTs : s)); await logActivity('santri', 'UPDATE', santri.id.toString(), null, santri); triggerAutoSync(); };
    const onBulkUpdateSantri = async (updatedSantriList: Santri[]) => { const withTs = updatedSantriList.map(s => addTimestamp(s)); await db.santri.bulkPut(withTs); const updatedIds = withTs.map(s => s.id); setSantriList(prev => prev.map(s => updatedIds.includes(s.id) ? withTs.find(u => u.id === s.id)! : s)); await logActivity('santri', 'UPDATE', 'BULK', null, { count: withTs.length }); triggerAutoSync(); };
    const onDeleteSantri = async (id: number) => { const santri = santriList.find(s => s.id === id); if (!santri) return; const deletedSantri = { ...santri, deleted: true, lastModified: Date.now() }; await db.santri.put(deletedSantri); setSantriList(prev => prev.filter(s => s.id !== id)); await logActivity('santri', 'DELETE', id.toString()); triggerAutoSync(); };
    const onDeleteSampleData = async () => { await (db as any).transaction('rw', db.settings, db.santri, db.tagihan, db.pembayaran, db.saldoSantri, db.transaksiSaldo, db.transaksiKas, db.auditLogs, db.absensi, async () => { await db.santri.clear(); await db.tagihan.clear(); await db.pembayaran.clear(); await db.saldoSantri.clear(); await db.transaksiSaldo.clear(); await db.transaksiKas.clear(); await db.auditLogs.clear(); await db.absensi.clear(); }); setSantriList([]); setTagihanList([]); setPembayaranList([]); setSaldoSantriList([]); setTransaksiSaldoList([]); setTransaksiKasList([]); setAbsensiList([]); triggerAutoSync(); };
    
    // ... [Finance Handlers] ...
    const onGenerateTagihanBulanan = async (tahun: number, bulan: number) => { const { result, newTagihan } = await generateTagihanBulanan(db, settings, santriList, tahun, bulan); const withTs = newTagihan.map(t => addTimestamp({ ...t, id: generateUniqueId() })); await db.tagihan.bulkPut(withTs); setTagihanList(prev => [...prev, ...withTs]); await logActivity('tagihan', 'INSERT', 'GENERATE_BULANAN', null, { tahun, bulan, count: result.generated }); triggerAutoSync(); return result; };
    const onGenerateTagihanAwal = async () => { const { result, newTagihan } = await generateTagihanAwal(db, settings, santriList); const withTs = newTagihan.map(t => addTimestamp({ ...t, id: generateUniqueId() })); await db.tagihan.bulkPut(withTs); setTagihanList(prev => [...prev, ...withTs]); await logActivity('tagihan', 'INSERT', 'GENERATE_AWAL', null, { count: result.generated }); triggerAutoSync(); return result; };
    const onAddPembayaran = async (pembayaranData: Omit<Pembayaran, 'id'>) => { const id = generateUniqueId(); const withTs = addTimestamp({ ...pembayaranData, id }); await db.pembayaran.put(withTs as Pembayaran); setPembayaranList(prev => [...prev, withTs as Pembayaran]); const updatedTagihanList: Tagihan[] = []; for (const tagihanId of pembayaranData.tagihanIds) { const tagihan = tagihanList.find(t => t.id === tagihanId); if (tagihan) { const updatedTagihan = { ...tagihan, status: 'Lunas' as const, tanggalLunas: pembayaranData.tanggal, pembayaranId: id, lastModified: Date.now() }; await db.tagihan.put(updatedTagihan); updatedTagihanList.push(updatedTagihan); } } setTagihanList(prev => prev.map(t => updatedTagihanList.find(ut => ut.id === t.id) || t)); await logActivity('pembayaran', 'INSERT', id.toString(), null, withTs); triggerAutoSync(); };
    const onAddTransaksiSaldo = async (data: Omit<TransaksiSaldo, 'id' | 'saldoSetelah' | 'tanggal'>) => { const tanggal = new Date().toISOString(); const currentSaldo = saldoSantriList.find(s => s.santriId === data.santriId)?.saldo || 0; let saldoSetelah = currentSaldo; if (data.jenis === 'Deposit') saldoSetelah += data.jumlah; else { if (currentSaldo < data.jumlah) throw new Error('Saldo tidak mencukupi.'); saldoSetelah -= data.jumlah; } const id = generateUniqueId(); const txWithTs = addTimestamp({ ...data, saldoSetelah, tanggal, id }); await db.transaksiSaldo.put(txWithTs as TransaksiSaldo); setTransaksiSaldoList(prev => [...prev, txWithTs as TransaksiSaldo]); const saldoWithTs = addTimestamp({ santriId: data.santriId, saldo: saldoSetelah }); await db.saldoSantri.put(saldoWithTs); setSaldoSantriList(prev => { const existing = prev.find(s => s.santriId === data.santriId); if (existing) return prev.map(s => s.santriId === data.santriId ? saldoWithTs : s); return [...prev, saldoWithTs]; }); await logActivity('transaksiSaldo', 'INSERT', id.toString(), null, txWithTs); triggerAutoSync(); };
    const onAddTransaksiKas = async (data: Omit<TransaksiKas, 'id' | 'saldoSetelah' | 'tanggal'>) => { const tanggal = new Date().toISOString(); const sortedKas = [...transaksiKasList].sort((a,b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime()); const lastBalance = sortedKas.length > 0 ? sortedKas[sortedKas.length - 1].saldoSetelah : 0; let saldoSetelah = lastBalance; if (data.jenis === 'Pemasukan') saldoSetelah += data.jumlah; else saldoSetelah -= data.jumlah; const id = generateUniqueId(); const withTs = addTimestamp({ ...data, saldoSetelah, tanggal, id }); await db.transaksiKas.put(withTs as TransaksiKas); setTransaksiKasList(prev => [...prev, withTs as TransaksiKas]); await logActivity('transaksiKas', 'INSERT', id.toString(), null, data); triggerAutoSync(); };
    const onSetorKeKas = async (pembayaranIds: number[], totalSetoran: number, tanggalSetor: string, penanggungJawab: string, catatan: string) => { await onAddTransaksiKas({ jenis: 'Pemasukan', kategori: 'Setoran Pembayaran Santri', deskripsi: catatan || `Setoran ${pembayaranIds.length} transaksi pembayaran`, jumlah: totalSetoran, penanggungJawab }); const updatedPembayaran: Pembayaran[] = []; for (const pid of pembayaranIds) { const p = pembayaranList.find(item => item.id === pid); if (p) { const updated = { ...p, disetorKeKas: true, lastModified: Date.now() }; await db.pembayaran.put(updated); updatedPembayaran.push(updated); } } setPembayaranList(prev => prev.map(p => updatedPembayaran.find(up => up.id === p.id) || p)); triggerAutoSync(); };
    const onSaveSuratTemplate = async (template: SuratTemplate) => { const withTs = addTimestamp(template); if (template.id) { await db.suratTemplates.put(withTs); setSuratTemplates(prev => prev.map(t => t.id === template.id ? withTs : t)); await logActivity('suratTemplates', 'UPDATE', template.id.toString()); } else { const newId = generateUniqueId(); const newItem = { ...withTs, id: newId }; await db.suratTemplates.put(newItem); setSuratTemplates(prev => [...prev, newItem]); await logActivity('suratTemplates', 'INSERT', newId.toString()); } triggerAutoSync(); };
    const onDeleteSuratTemplate = async (id: number) => { const item = suratTemplates.find(t => t.id === id); if(!item) return; const deletedItem = { ...item, deleted: true, lastModified: Date.now() }; await db.suratTemplates.put(deletedItem); setSuratTemplates(prev => prev.filter(t => t.id !== id)); await logActivity('suratTemplates', 'DELETE', id.toString()); triggerAutoSync(); };
    const onSaveArsipSurat = async (surat: Omit<ArsipSurat, 'id'>) => { const id = generateUniqueId(); const withTs = addTimestamp({ ...surat, id }); await db.arsipSurat.put(withTs as ArsipSurat); setArsipSuratList(prev => [...prev, withTs as ArsipSurat]); await logActivity('arsipSurat', 'INSERT', id.toString()); triggerAutoSync(); };
    const onDeleteArsipSurat = async (id: number) => { const item = arsipSuratList.find(a => a.id === id); if(!item) return; const deletedItem = { ...item, deleted: true, lastModified: Date.now() }; await db.arsipSurat.put(deletedItem); setArsipSuratList(prev => prev.filter(a => a.id !== id)); await logActivity('arsipSurat', 'DELETE', id.toString()); triggerAutoSync(); };

    // NEW: Absensi Logic
    const onSaveAbsensi = async (records: AbsensiRecord[]) => {
        // Bulk put for efficiency
        const withTs = records.map(r => ({ ...r, lastModified: Date.now() }));
        
        // Remove existing records for same santri & date if any (overwrite logic)
        // Dexie bulkPut handles overwrite if primary key matches, but here we don't use simple ID
        // We rely on [rombelId+tanggal] index queries if needed, but for bulk save we might just add/update.
        // For simplicity: We query existing IDs by [rombelId+tanggal] if we want to update specific rows, 
        // but here 'id' is primary key. If we create new records, they get new IDs.
        // Ideally, UI provides the ID if editing. If creating new daily attendance, ID is undefined.
        
        // Strategy: Use a transaction to delete old records for the same day/rombel/santri before adding new ones? 
        // Or upsert. Let's use simple logic: UI passes IDs if update.
        
        await db.absensi.bulkPut(withTs);
        
        // Update State (Optimized: Just re-fetch for simplicity or append)
        const allAbsensi = await db.absensi.toArray();
        setAbsensiList(allAbsensi.filter(a => !a.deleted));
        
        await logActivity('absensi', 'INSERT', 'BULK', null, { count: records.length });
        triggerAutoSync();
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
            absensi: await db.absensi.toArray(), // Backup Absensi
            version: '1.5', 
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
            isLoading, settings, santriList, tagihanList, pembayaranList, saldoSantriList, transaksiSaldoList, transaksiKasList, suratTemplates, arsipSuratList, absensiList, santriFilters, setSantriFilters, toasts, confirmation, alertModal, backupModal, 
            currentUser, login, logout,
            syncStatus,
            onSaveSettings, onAddSantri, onBulkAddSantri, onUpdateSantri, onBulkUpdateSantri, onDeleteSantri, onDeleteSampleData, onGenerateTagihanBulanan, onGenerateTagihanAwal, onAddPembayaran, onAddTransaksiSaldo, onAddTransaksiKas, onSetorKeKas, onSaveSuratTemplate, onDeleteSuratTemplate, onSaveArsipSurat, onDeleteArsipSurat, onSaveAbsensi, downloadBackup, triggerBackupCheck, closeBackupModal, showToast, removeToast, showAlert, hideAlert, showConfirmation, hideConfirmation,
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
