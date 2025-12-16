
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

    // Ref for Debouncing AutoSync
    const autoSyncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const loadData = async () => {
            try {
                const settingsCount = await db.settings.count();
                const santriCount = await db.santri.count();
                const sampleDataDeleted = localStorage.getItem('eSantriSampleDataDeleted') === 'true';

                if ((settingsCount === 0 || santriCount === 0) && !sampleDataDeleted) {
                    await db.transaction('rw', db.settings, db.santri, async () => {
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

                // Migration logic for address format
                const migrateAddress = (addr: any): Alamat | undefined => {
                    if (!addr) return undefined;
                    if (typeof addr === 'string') {
                        return { detail: addr };
                    }
                    return addr;
                };

                const migratedSantri = currentSantri.map(s => ({
                    ...s,
                    alamat: migrateAddress(s.alamat) || { detail: '' },
                    alamatAyah: migrateAddress(s.alamatAyah),
                    alamatIbu: migrateAddress(s.alamatIbu),
                    alamatWali: migrateAddress(s.alamatWali),
                }));

                // Ensure backup config exists (migration fallback for runtime)
                const safeSettings = currentSettings || initialSettings;
                if (!safeSettings.backupConfig) {
                    safeSettings.backupConfig = { frequency: 'weekly', lastBackup: null };
                }
                if (!safeSettings.cloudSyncConfig) {
                    safeSettings.cloudSyncConfig = { provider: 'none', lastSync: null, autoSync: false };
                }

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

    // --- Auto Sync Logic ---
    const triggerAutoSync = useCallback(() => {
        if (!settings.cloudSyncConfig?.autoSync || settings.cloudSyncConfig.provider === 'none') {
            return;
        }
        
        // Don't auto-sync Supabase here (it uses its own realtime mechanism in AuditLogs)
        if (settings.cloudSyncConfig.provider === 'supabase') return;

        if (autoSyncTimeoutRef.current) {
            clearTimeout(autoSyncTimeoutRef.current);
        }

        autoSyncTimeoutRef.current = setTimeout(async () => {
            try {
                showToast('Sinkronisasi otomatis berjalan...', 'info');
                const timestamp = await performSync(settings.cloudSyncConfig, 'up');
                
                // Update local settings with new timestamp WITHOUT triggering another saveSettings cycle that causes loop
                const updatedSettings = {
                    ...settings,
                    cloudSyncConfig: { ...settings.cloudSyncConfig, lastSync: timestamp }
                };
                
                // Direct update to Dexie
                await db.settings.put(updatedSettings);
                
                // Update State silently to reflect UI change
                setSettings(updatedSettings);
                
                showToast('Sinkronisasi otomatis selesai.', 'success');
            } catch (error) {
                console.error("Auto Sync Failed:", error);
                showToast('Gagal sinkronisasi otomatis.', 'error');
            }
        }, 5000); // 5 seconds debounce
    }, [settings, showToast]);


    const showAlert = useCallback((title: string, message: string) => {
        setAlertModal({ isOpen: true, title, message });
    }, []);

    const hideAlert = useCallback(() => {
        setAlertModal({ isOpen: false, title: '', message: '' });
    }, []);
    
    const hideConfirmation = useCallback(() => {
        setConfirmation(prev => ({ ...prev, isOpen: false }));
    }, []);

    const showConfirmation = useCallback((
        title: string, 
        message: string, 
        onConfirm: () => void | Promise<void>, 
        options?: { confirmText?: string; confirmColor?: string }
    ) => {
        setConfirmation({
            isOpen: true,
            title,
            message,
            onConfirm: async () => {
                await onConfirm();
                hideConfirmation();
            },
            ...options
        });
    }, [hideConfirmation]);

    // --- Backup Logic ---
    const downloadBackup = useCallback(async () => {
        try {
            const settingsData = await db.settings.toArray();
            const santriData = await db.santri.toArray();
            const tagihanData = await db.tagihan.toArray();
            const pembayaranData = await db.pembayaran.toArray();
            const saldoSantriData = await db.saldoSantri.toArray();
            const transaksiSaldoData = await db.transaksiSaldo.toArray();
            const transaksiKasData = await db.transaksiKas.toArray();
            const suratTemplatesData = await db.suratTemplates.toArray();
            const arsipSuratData = await db.arsipSurat.toArray();
            
            const backupData = {
                settings: settingsData,
                santri: santriData,
                tagihan: tagihanData,
                pembayaran: pembayaranData,
                saldoSantri: saldoSantriData,
                transaksiSaldo: transaksiSaldoData,
                transaksiKas: transaksiKasData,
                suratTemplates: suratTemplatesData,
                arsipSurat: arsipSuratData,
                backupVersion: '1.2',
                createdAt: new Date().toISOString(),
            };

            const jsonString = JSON.stringify(backupData, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = url;
            
            const timestamp = new Date().toISOString().slice(0, 19).replace(/[-T:]/g, '');
            link.download = `eSantri_backup_${timestamp}.json`;

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            URL.revokeObjectURL(url);
            
            // Update last backup time
            const now = new Date().toISOString();
            const updatedSettings = { ...settings, backupConfig: { ...settings.backupConfig, lastBackup: now } };
            await db.settings.put(updatedSettings);
            setSettings(updatedSettings);

            showToast('Backup data berhasil diunduh!', 'success');
        } catch (error) {
            console.error('Failed to create backup:', error);
            showToast('Gagal membuat backup. Lihat konsol untuk detail.', 'error');
        }
    }, [settings, showToast]);

    const triggerBackupCheck = useCallback((forceAction: boolean = false) => {
        if (forceAction) {
            setBackupModal({ isOpen: true, reason: 'action' });
            return;
        }

        const { frequency, lastBackup } = settings.backupConfig;
        if (frequency === 'never') return;

        const now = new Date();
        const last = lastBackup ? new Date(lastBackup) : new Date(0);
        const diffDays = (now.getTime() - last.getTime()) / (1000 * 3600 * 24);

        let shouldPrompt = false;
        if (frequency === 'daily' && diffDays >= 1) shouldPrompt = true;
        if (frequency === 'weekly' && diffDays >= 7) shouldPrompt = true;

        if (shouldPrompt) {
            setBackupModal({ isOpen: true, reason: 'periodic' });
        }
    }, [settings.backupConfig]);

    const closeBackupModal = useCallback(() => {
        setBackupModal(prev => ({ ...prev, isOpen: false }));
    }, []);

    const onSaveSettings = useCallback(async (newSettings: PondokSettings) => {
        if (!settings?.id) {
            const error = new Error("Settings ID not found, cannot update.");
            console.error(error);
            throw error;
        }
        try {
            const settingsToSave: PondokSettingsWithId = { ...newSettings, id: settings.id };
            await db.settings.put(settingsToSave);
            setSettings(settingsToSave);
            // We do NOT trigger auto sync here because updating settings usually includes updating sync config itself.
            // Also prevents loops.
        } catch (error) {
            console.error("Failed to save settings to DB", error);
            throw error;
        }
    }, [settings.id]);

    const onAddSantri = useCallback(async (santriData: Omit<Santri, 'id'>) => {
        try {
            const newId = await db.santri.add(santriData as Santri);
            setSantriList(prev => [...prev, { ...santriData, id: newId as number }]);
            triggerAutoSync();
        } catch (error) {
            console.error("Failed to add santri to DB", error);
            throw error;
        }
    }, [triggerAutoSync]);

    const onBulkAddSantri = useCallback(async (newSantriData: Omit<Santri, 'id'>[]) => {
        try {
            const newIds = await db.santri.bulkAdd(newSantriData as Santri[], { allKeys: true });
            const addedSantriWithIds = newSantriData.map((santri, index) => ({
                ...santri,
                id: newIds[index] as number,
            }));
            setSantriList(prev => [...prev, ...addedSantriWithIds]);
            triggerBackupCheck(true);
            triggerAutoSync();
        } catch (error) {
            console.error("Failed to bulk add santri to DB", error);
            throw error;
        }
    }, [triggerBackupCheck, triggerAutoSync]);

    const onUpdateSantri = useCallback(async (santri: Santri) => {
        try {
            await db.santri.put(santri);
            setSantriList(prev => prev.map(s => s.id === santri.id ? santri : s));
            triggerAutoSync();
        } catch (error) {
            console.error("Failed to update santri in DB", error);
            throw error;
        }
    }, [triggerAutoSync]);

    const onBulkUpdateSantri = useCallback(async (updatedSantriList: Santri[]) => {
        try {
            await db.santri.bulkPut(updatedSantriList);
            const updatedIds = new Set(updatedSantriList.map(u => u.id));
            const updatedMap = new Map(updatedSantriList.map(u => [u.id, u]));
            
            setSantriList(prevList => 
                prevList.map(s => updatedIds.has(s.id) ? updatedMap.get(s.id)! : s)
            );
            triggerBackupCheck(true);
            triggerAutoSync();
        } catch (error) {
            console.error("Failed to bulk update santri in DB", error);
            throw error;
        }
    }, [triggerBackupCheck, triggerAutoSync]);

    const onDeleteSantri = useCallback(async (id: number) => {
        try {
            await db.santri.delete(id);
            setSantriList(prev => prev.filter(s => s.id !== id));
            triggerAutoSync();
        } catch (error) {
            console.error("Failed to delete santri from DB", error);
            throw error;
        }
    }, [triggerAutoSync]);

    const onDeleteSampleData = useCallback(async () => {
        try {
            await db.transaction('rw', [db.santri, db.tagihan, db.pembayaran, db.saldoSantri, db.transaksiSaldo, db.transaksiKas, db.suratTemplates, db.arsipSurat], async () => {
                await db.santri.clear();
                await db.tagihan.clear();
                await db.pembayaran.clear();
                await db.saldoSantri.clear();
                await db.transaksiSaldo.clear();
                await db.transaksiKas.clear();
                await db.suratTemplates.clear();
                await db.arsipSurat.clear();
            });
            // Update state to reflect changes immediately before reload
            setSantriList([]);
            setTagihanList([]);
            setPembayaranList([]);
            setSaldoSantriList([]);
            setTransaksiSaldoList([]);
            setTransaksiKasList([]);
            setSuratTemplates([]);
            setArsipSuratList([]);
            triggerAutoSync();
        } catch (error) {
            console.error("Failed to delete sample data", error);
            throw error;
        }
    }, [triggerAutoSync]);

    const onGenerateTagihanBulanan = useCallback(async (tahun: number, bulan: number) => {
        const { result, newTagihan } = await generateTagihanBulanan(db, settings, santriList, tahun, bulan);
        if (newTagihan.length > 0) {
            setTagihanList(prev => [...prev, ...newTagihan]);
            triggerBackupCheck(true);
            triggerAutoSync();
        }
        return result;
    }, [settings, santriList, triggerBackupCheck, triggerAutoSync]);

    const onGenerateTagihanAwal = useCallback(async () => {
        const { result, newTagihan } = await generateTagihanAwal(db, settings, santriList);
        if (newTagihan.length > 0) {
            setTagihanList(prev => [...prev, ...newTagihan]);
            triggerBackupCheck(true);
            triggerAutoSync();
        }
        return result;
    }, [settings, santriList, triggerBackupCheck, triggerAutoSync]);

    const onAddPembayaran = useCallback(async (pembayaranData: Omit<Pembayaran, 'id'>) => {
        let paymentId: number;
        await db.transaction('rw', db.pembayaran, db.tagihan, async () => {
            paymentId = await db.pembayaran.add(pembayaranData as Pembayaran);
            
            const tagihanToUpdate = await db.tagihan.where('id').anyOf(pembayaranData.tagihanIds).toArray();
            const updatedTagihan = tagihanToUpdate.map(t => ({
                ...t,
                status: 'Lunas' as const,
                tanggalLunas: pembayaranData.tanggal,
                pembayaranId: paymentId
            }));

            await db.tagihan.bulkPut(updatedTagihan);

            setPembayaranList(prev => [...prev, { ...pembayaranData, id: paymentId }]);
            const updatedIds = new Set(updatedTagihan.map(t => t.id));
            setTagihanList(prev => prev.map(t => updatedIds.has(t.id) ? updatedTagihan.find(ut => ut.id === t.id)! : t));
        });
        triggerAutoSync();
    }, [triggerAutoSync]);

    const onAddTransaksiSaldo = useCallback(async (data: Omit<TransaksiSaldo, 'id' | 'saldoSetelah' | 'tanggal'>) => {
        const { santriId, jenis, jumlah, keterangan } = data;

        if (jumlah <= 0) {
            throw new Error("Jumlah transaksi harus lebih dari nol.");
        }

        try {
            await db.transaction('rw', db.saldoSantri, db.transaksiSaldo, async () => {
                let saldoRecord = await db.saldoSantri.get(santriId);
                if (!saldoRecord) {
                    saldoRecord = { santriId, saldo: 0 };
                }

                const saldoSebelum = saldoRecord.saldo;
                let saldoSetelah;

                if (jenis === 'Deposit') {
                    saldoSetelah = saldoSebelum + jumlah;
                } else { // Penarikan
                    if (saldoSebelum < jumlah) {
                        throw new Error(`Saldo tidak mencukupi. Saldo saat ini: ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(saldoSebelum)}`);
                    }
                    saldoSetelah = saldoSebelum - jumlah;
                }

                const newTransaksi: Omit<TransaksiSaldo, 'id'> = {
                    santriId,
                    tanggal: new Date().toISOString(),
                    jenis,
                    jumlah,
                    keterangan,
                    saldoSetelah,
                };
                
                const newTransaksiId = await db.transaksiSaldo.add(newTransaksi as TransaksiSaldo);
                
                const newSaldoRecord: SaldoSantri = { santriId, saldo: saldoSetelah };
                await db.saldoSantri.put(newSaldoRecord);

                // Update state
                setTransaksiSaldoList(prev => [...prev, { ...newTransaksi, id: newTransaksiId as number }]);
                setSaldoSantriList(prev => {
                    const existing = prev.find(s => s.santriId === santriId);
                    if (existing) {
                        return prev.map(s => s.santriId === santriId ? newSaldoRecord : s);
                    } else {
                        return [...prev, newSaldoRecord];
                    }
                });
            });
            triggerAutoSync();
        } catch (error) {
            console.error("Gagal menambah transaksi saldo:", error);
            // Re-throw the error to be caught by the calling component
            throw error;
        }
    }, [triggerAutoSync]);

    const onAddTransaksiKas = useCallback(async (data: Omit<TransaksiKas, 'id' | 'saldoSetelah' | 'tanggal'>) => {
        const { jenis, jumlah } = data;

        if (jumlah <= 0) {
            throw new Error("Jumlah transaksi harus lebih dari nol.");
        }

        try {
            await db.transaction('rw', db.transaksiKas, async () => {
                const lastTransaction = await db.transaksiKas.orderBy('id').last();
                const saldoSebelum = lastTransaction ? lastTransaction.saldoSetelah : 0;
                
                const saldoSetelah = jenis === 'Pemasukan' ? saldoSebelum + jumlah : saldoSebelum - jumlah;

                const newTransaksi: Omit<TransaksiKas, 'id'> = {
                    ...data,
                    tanggal: new Date().toISOString(),
                    saldoSetelah,
                };

                const newTransaksiId = await db.transaksiKas.add(newTransaksi as TransaksiKas);

                setTransaksiKasList(prev => [...prev, { ...newTransaksi, id: newTransaksiId as number }]);
            });
            triggerAutoSync();
        } catch (error) {
            console.error("Gagal menambah transaksi kas:", error);
            throw error;
        }
    }, [triggerAutoSync]);

    const onSetorKeKas = useCallback(async (pembayaranIds: number[], totalSetoran: number, tanggalSetor: string, penanggungJawab: string, catatan: string) => {
        if (pembayaranIds.length === 0 || totalSetoran <= 0) {
            throw new Error("Tidak ada pembayaran yang dipilih atau total setoran nol.");
        }
        
        try {
            await db.transaction('rw', db.transaksiKas, db.pembayaran, async () => {
                // 1. Create a new general cash transaction
                const lastTransaction = await db.transaksiKas.orderBy('id').last();
                const saldoSebelum = lastTransaction ? lastTransaction.saldoSetelah : 0;
                const saldoSetelah = saldoSebelum + totalSetoran;
    
                const newTransaksiKas: Omit<TransaksiKas, 'id'> = {
                    tanggal: new Date(tanggalSetor).toISOString(),
                    jenis: 'Pemasukan',
                    kategori: 'Penerimaan Santri',
                    deskripsi: catatan || `Setoran penerimaan dari tagihan santri`,
                    jumlah: totalSetoran,
                    saldoSetelah,
                    penanggungJawab,
                };
    
                const newTransaksiId = await db.transaksiKas.add(newTransaksiKas as TransaksiKas);
                
                // 2. Mark payments as deposited
                const paymentsToUpdate = await db.pembayaran.where('id').anyOf(pembayaranIds).toArray();
                const updatedPayments = paymentsToUpdate.map(p => ({ ...p, disetorKeKas: true }));
                await db.pembayaran.bulkPut(updatedPayments);
    
                // 3. Update state
                setTransaksiKasList(prev => [...prev, { ...newTransaksiKas, id: newTransaksiId as number }]);
                const updatedIds = new Set(updatedPayments.map(p => p.id));
                setPembayaranList(prev => prev.map(p => updatedIds.has(p.id) ? updatedPayments.find(up => up.id === p.id)! : p));
            });
            triggerAutoSync();
        } catch (error) {
            console.error("Gagal melakukan setoran ke kas:", error);
            throw error;
        }
    }, [triggerAutoSync]);

    // --- Surat Menyurat Logic ---
    const onSaveSuratTemplate = useCallback(async (template: SuratTemplate) => {
        try {
            const id = await db.suratTemplates.put(template);
            setSuratTemplates(prev => {
                const existing = prev.findIndex(t => t.id === template.id);
                if (existing > -1) {
                    return prev.map(t => t.id === template.id ? template : t);
                }
                return [...prev, { ...template, id: id as number }];
            });
            triggerAutoSync();
        } catch (error) {
            console.error("Gagal menyimpan template surat:", error);
            throw error;
        }
    }, [triggerAutoSync]);

    const onDeleteSuratTemplate = useCallback(async (id: number) => {
        try {
            await db.suratTemplates.delete(id);
            setSuratTemplates(prev => prev.filter(t => t.id !== id));
            triggerAutoSync();
        } catch (error) {
            console.error("Gagal menghapus template surat:", error);
            throw error;
        }
    }, [triggerAutoSync]);

    const onSaveArsipSurat = useCallback(async (surat: Omit<ArsipSurat, 'id'>) => {
        try {
            const id = await db.arsipSurat.add(surat as ArsipSurat);
            setArsipSuratList(prev => [...prev, { ...surat, id: id as number }]);
            triggerAutoSync();
        } catch (error) {
            console.error("Gagal menyimpan arsip surat:", error);
            throw error;
        }
    }, [triggerAutoSync]);

    const onDeleteArsipSurat = useCallback(async (id: number) => {
        try {
            await db.arsipSurat.delete(id);
            setArsipSuratList(prev => prev.filter(s => s.id !== id));
            triggerAutoSync();
        } catch (error) {
            console.error("Gagal menghapus arsip surat:", error);
            throw error;
        }
    }, [triggerAutoSync]);

    const value: AppContextType = useMemo(() => ({
        isLoading,
        settings,
        santriList,
        tagihanList,
        pembayaranList,
        saldoSantriList,
        transaksiSaldoList,
        transaksiKasList,
        suratTemplates,
        arsipSuratList,
        santriFilters,
        setSantriFilters,
        toasts,
        confirmation,
        alertModal,
        backupModal,
        onSaveSettings,
        onAddSantri,
        onBulkAddSantri,
        onUpdateSantri,
        onBulkUpdateSantri,
        onDeleteSantri,
        onDeleteSampleData,
        onGenerateTagihanBulanan,
        onGenerateTagihanAwal,
        onAddPembayaran,
        onAddTransaksiSaldo,
        onAddTransaksiKas,
        onSetorKeKas,
        onSaveSuratTemplate,
        onDeleteSuratTemplate,
        onSaveArsipSurat,
        onDeleteArsipSurat,
        downloadBackup,
        triggerBackupCheck,
        closeBackupModal,
        showToast,
        removeToast,
        showAlert,
        hideAlert,
        showConfirmation,
        hideConfirmation
    }), [
        isLoading,
        settings,
        santriList,
        tagihanList,
        pembayaranList,
        saldoSantriList,
        transaksiSaldoList,
        transaksiKasList,
        suratTemplates,
        arsipSuratList,
        santriFilters,
        toasts,
        confirmation,
        alertModal,
        backupModal,
        onSaveSettings,
        onAddSantri,
        onBulkAddSantri,
        onUpdateSantri,
        onBulkUpdateSantri,
        onDeleteSantri,
        onDeleteSampleData,
        onGenerateTagihanBulanan,
        onGenerateTagihanAwal,
        onAddPembayaran,
        onAddTransaksiSaldo,
        onAddTransaksiKas,
        onSetorKeKas,
        onSaveSuratTemplate,
        onDeleteSuratTemplate,
        onSaveArsipSurat,
        onDeleteArsipSurat,
        downloadBackup,
        triggerBackupCheck,
        closeBackupModal,
        showToast,
        removeToast,
        showAlert,
        hideAlert,
        showConfirmation,
        hideConfirmation
    ]);

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === null) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
