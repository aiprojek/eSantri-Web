
import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { PondokSettings, Santri, Tagihan, Pembayaran, Alamat, SaldoSantri, TransaksiSaldo, TransaksiKas, SuratTemplate, ArsipSurat } from './types';
import { db, PondokSettingsWithId } from './db';
import { initialSantri, initialSettings } from './data/mock';
import { generateTagihanBulanan, generateTagihanAwal } from './services/financeService';
import { performSync } from './services/syncService';

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

interface AppContextType {
  isLoading: boolean;
  settings: PondokSettingsWithId; // Will not be null after loading
  santriList: Santri[];
  tagihanList: Tagihan[];
  pembayaranList: Pembayaran[];
  saldoSantriList: SaldoSantri[];
  transaksiSaldoList: TransaksiSaldo[];
  transaksiKasList: TransaksiKas[];
  suratTemplates: SuratTemplate[];
  arsipSuratList: ArsipSurat[];
  santriFilters: SantriFilters;
  setSantriFilters: React.Dispatch<React.SetStateAction<SantriFilters>>;
  toasts: ToastData[];
  confirmation: ConfirmationState;
  alertModal: AlertState;
  backupModal: BackupModalState;
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
}

const AppContext = createContext<AppContextType | null>(null);

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
    const hasCheckedBackupRef = useRef(false);

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

                const [currentSettings, currentSantri, currentTagihan, currentPembayaran, currentSaldo, currentTransaksi, currentKas, currentTemplates, currentArsip] = await Promise.all([
                    db.settings.toCollection().first(),
                    db.santri.toArray(),
                    db.tagihan.toArray(),
                    db.pembayaran.toArray(),
                    db.saldoSantri.toArray(),
                    db.transaksiSaldo.toArray(),
                    db.transaksiKas.toArray(),
                    db.suratTemplates.toArray(),
                    db.arsipSurat.toArray(),
                ]);

                const migrateAddress = (addr: any): Alamat | undefined => {
                    if (!addr) return undefined;
                    if (typeof addr === 'string') return { detail: addr };
                    return addr;
                };

                const migratedSantri = currentSantri.map(s => ({
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

                setSettings(safeSettings);
                setSantriList(migratedSantri);
                setTagihanList(currentTagihan);
                setPembayaranList(currentPembayaran);
                setSaldoSantriList(currentSaldo);
                setTransaksiSaldoList(currentTransaksi);
                setTransaksiKasList(currentKas);
                setSuratTemplates(currentTemplates);
                setArsipSuratList(currentArsip);

            } catch (error) {
                console.error("Failed to load data from DexieDB", error);
                setSettings(initialSettings);
                setSantriList(initialSantri);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, []);

    const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
        setToasts(prev => [...prev, { id: Date.now(), message, type }]);
    }, []);

    const removeToast = useCallback((id: number) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    }, []);

    const triggerAutoSync = useCallback(() => {
        if (!settings.cloudSyncConfig?.autoSync || settings.cloudSyncConfig.provider === 'none') return;
        if (settings.cloudSyncConfig.provider === 'supabase') return;
        if (autoSyncTimeoutRef.current) clearTimeout(autoSyncTimeoutRef.current);

        autoSyncTimeoutRef.current = setTimeout(async () => {
            try {
                const timestamp = await performSync(settings.cloudSyncConfig, 'up');
                setSettings(prev => ({
                    ...prev,
                    cloudSyncConfig: { ...prev.cloudSyncConfig, lastSync: timestamp }
                }));
                await db.settings.update(settings.id as number, {
                    cloudSyncConfig: { ...settings.cloudSyncConfig, lastSync: timestamp }
                });
            } catch (error) {
                console.warn('Auto-sync failed:', error);
            }
        }, 5000); 
    }, [settings]);

    const onSaveSettings = async (newSettings: PondokSettings) => {
        const id = (settings as PondokSettingsWithId).id;
        const settingsWithId = { ...newSettings, id };
        await db.settings.put(settingsWithId);
        setSettings(settingsWithId);
        triggerAutoSync();
    };

    const onAddSantri = async (santriData: Omit<Santri, 'id'>) => {
        const id = await db.santri.add(santriData as Santri);
        const newSantri = { ...santriData, id } as Santri;
        setSantriList(prev => [...prev, newSantri]);
        triggerAutoSync();
    };

    const onBulkAddSantri = async (newSantriData: Omit<Santri, 'id'>[]) => {
        const ids = await db.santri.bulkAdd(newSantriData as Santri[], { allKeys: true });
        const addedSantri = newSantriData.map((s, i) => ({ ...s, id: ids[i] as number } as Santri));
        setSantriList(prev => [...prev, ...addedSantri]);
        triggerAutoSync();
    };

    const onUpdateSantri = async (santri: Santri) => {
        await db.santri.put(santri);
        setSantriList(prev => prev.map(s => s.id === santri.id ? santri : s));
        triggerAutoSync();
    };

    const onBulkUpdateSantri = async (updatedSantriList: Santri[]) => {
        await db.santri.bulkPut(updatedSantriList);
        const updatedIds = updatedSantriList.map(s => s.id);
        setSantriList(prev => prev.map(s => updatedIds.includes(s.id) ? updatedSantriList.find(u => u.id === s.id)! : s));
        triggerAutoSync();
    };

    const onDeleteSantri = async (id: number) => {
        await db.santri.delete(id);
        setSantriList(prev => prev.filter(s => s.id !== id));
        triggerAutoSync();
    };

    const onDeleteSampleData = async () => {
        await (db as any).transaction('rw', db.settings, db.santri, db.tagihan, db.pembayaran, db.saldoSantri, db.transaksiSaldo, db.transaksiKas, async () => {
            await db.santri.clear();
            await db.tagihan.clear();
            await db.pembayaran.clear();
            await db.saldoSantri.clear();
            await db.transaksiSaldo.clear();
            await db.transaksiKas.clear();
        });
        setSantriList([]); setTagihanList([]); setPembayaranList([]); setSaldoSantriList([]); setTransaksiSaldoList([]); setTransaksiKasList([]);
        triggerAutoSync();
    };

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

    const onGenerateTagihanBulanan = async (tahun: number, bulan: number) => {
        const { result, newTagihan } = await generateTagihanBulanan(db, settings, santriList, tahun, bulan);
        setTagihanList(prev => [...prev, ...newTagihan]);
        triggerAutoSync();
        return result;
    };

    const onGenerateTagihanAwal = async () => {
        const { result, newTagihan } = await generateTagihanAwal(db, settings, santriList);
        setTagihanList(prev => [...prev, ...newTagihan]);
        triggerAutoSync();
        return result;
    };

    const onAddPembayaran = async (pembayaranData: Omit<Pembayaran, 'id'>) => {
        const id = await db.pembayaran.add(pembayaranData as Pembayaran);
        const newPembayaran = { ...pembayaranData, id } as Pembayaran;
        setPembayaranList(prev => [...prev, newPembayaran]);
        // Fix TS7034: Explicitly type this array
        const updatedTagihanList: Tagihan[] = [];
        for (const tagihanId of pembayaranData.tagihanIds) {
            const tagihan = tagihanList.find(t => t.id === tagihanId);
            if (tagihan) {
                const updatedTagihan = { ...tagihan, status: 'Lunas' as const, tanggalLunas: pembayaranData.tanggal, pembayaranId: id };
                await db.tagihan.put(updatedTagihan);
                updatedTagihanList.push(updatedTagihan);
            }
        }
        setTagihanList(prev => prev.map(t => updatedTagihanList.find(ut => ut.id === t.id) || t));
        triggerAutoSync();
    };

    const onAddTransaksiSaldo = async (data: Omit<TransaksiSaldo, 'id' | 'saldoSetelah' | 'tanggal'>) => {
        const tanggal = new Date().toISOString();
        const currentSaldo = saldoSantriList.find(s => s.santriId === data.santriId)?.saldo || 0;
        let saldoSetelah = currentSaldo;
        if (data.jenis === 'Deposit') saldoSetelah += data.jumlah;
        else { if (currentSaldo < data.jumlah) throw new Error('Saldo tidak mencukupi.'); saldoSetelah -= data.jumlah; }
        const id = await db.transaksiSaldo.add({ ...data, saldoSetelah, tanggal } as TransaksiSaldo);
        const newTransaksi = { ...data, saldoSetelah, tanggal, id } as TransaksiSaldo;
        setTransaksiSaldoList(prev => [...prev, newTransaksi]);
        await db.saldoSantri.put({ santriId: data.santriId, saldo: saldoSetelah });
        setSaldoSantriList(prev => {
            const existing = prev.find(s => s.santriId === data.santriId);
            if (existing) return prev.map(s => s.santriId === data.santriId ? { ...s, saldo: saldoSetelah } : s);
            return [...prev, { santriId: data.santriId, saldo: saldoSetelah }];
        });
        triggerAutoSync();
    };

    const onAddTransaksiKas = async (data: Omit<TransaksiKas, 'id' | 'saldoSetelah' | 'tanggal'>) => {
        const tanggal = new Date().toISOString();
        const sortedKas = [...transaksiKasList].sort((a,b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime());
        const lastBalance = sortedKas.length > 0 ? sortedKas[sortedKas.length - 1].saldoSetelah : 0;
        let saldoSetelah = lastBalance;
        if (data.jenis === 'Pemasukan') saldoSetelah += data.jumlah;
        else saldoSetelah -= data.jumlah;
        const id = await db.transaksiKas.add({ ...data, saldoSetelah, tanggal } as TransaksiKas);
        setTransaksiKasList(prev => [...prev, { ...data, saldoSetelah, tanggal, id } as TransaksiKas]);
        triggerAutoSync();
    };

    const onSetorKeKas = async (pembayaranIds: number[], totalSetoran: number, tanggalSetor: string, penanggungJawab: string, catatan: string) => {
        await onAddTransaksiKas({ jenis: 'Pemasukan', kategori: 'Setoran Pembayaran Santri', deskripsi: catatan || `Setoran ${pembayaranIds.length} transaksi pembayaran`, jumlah: totalSetoran, penanggungJawab });
        // Fix TS7034: Explicitly type this array
        const updatedPembayaran: Pembayaran[] = [];
        for (const pid of pembayaranIds) {
            const p = pembayaranList.find(item => item.id === pid);
            if (p) { const updated = { ...p, disetorKeKas: true }; await db.pembayaran.put(updated); updatedPembayaran.push(updated); }
        }
        setPembayaranList(prev => prev.map(p => updatedPembayaran.find(up => up.id === p.id) || p));
        triggerAutoSync();
    };

    const onSaveSuratTemplate = async (template: SuratTemplate) => {
        if (template.id) { await db.suratTemplates.put(template); setSuratTemplates(prev => prev.map(t => t.id === template.id ? template : t)); }
        else { const newId = await db.suratTemplates.add(template); setSuratTemplates(prev => [...prev, { ...template, id: newId }]); }
        triggerAutoSync();
    };

    const onDeleteSuratTemplate = async (id: number) => { await db.suratTemplates.delete(id); setSuratTemplates(prev => prev.filter(t => t.id !== id)); triggerAutoSync(); };
    const onSaveArsipSurat = async (surat: Omit<ArsipSurat, 'id'>) => { const id = await db.arsipSurat.add(surat as ArsipSurat); setArsipSuratList(prev => [...prev, { ...surat, id } as ArsipSurat]); triggerAutoSync(); };
    const onDeleteArsipSurat = async (id: number) => { await db.arsipSurat.delete(id); setArsipSuratList(prev => prev.filter(a => a.id !== id)); triggerAutoSync(); };

    const downloadBackup = async () => {
        const data = {
            settings: await db.settings.toArray(), santri: await db.santri.toArray(), tagihan: await db.tagihan.toArray(), pembayaran: await db.pembayaran.toArray(), saldoSantri: await db.saldoSantri.toArray(), transaksiSaldo: await db.transaksiSaldo.toArray(), transaksiKas: await db.transaksiKas.toArray(), suratTemplates: await db.suratTemplates.toArray(), arsipSurat: await db.arsipSurat.toArray(), version: '1.2', timestamp: new Date().toISOString(),
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a'); link.href = url; link.download = `backup_esantri_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url);
        const newSettings = { ...settings, backupConfig: { ...settings.backupConfig, lastBackup: new Date().toISOString() } };
        await onSaveSettings(newSettings);
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
        <AppContext.Provider value={{
            isLoading, settings, santriList, tagihanList, pembayaranList, saldoSantriList, transaksiSaldoList, transaksiKasList, suratTemplates, arsipSuratList, santriFilters, setSantriFilters, toasts, confirmation, alertModal, backupModal, onSaveSettings, onAddSantri, onBulkAddSantri, onUpdateSantri, onBulkUpdateSantri, onDeleteSantri, onDeleteSampleData, onGenerateTagihanBulanan, onGenerateTagihanAwal, onAddPembayaran, onAddTransaksiSaldo, onAddTransaksiKas, onSetorKeKas, onSaveSuratTemplate, onDeleteSuratTemplate, onSaveArsipSurat, onDeleteArsipSurat, downloadBackup, triggerBackupCheck, closeBackupModal, showToast, removeToast, showAlert, hideAlert, showConfirmation, hideConfirmation,
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
