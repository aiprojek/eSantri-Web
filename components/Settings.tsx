
import React, { Suspense, useState, useEffect, useMemo } from 'react';
import { PondokSettings, NisJenjangConfig } from '../types';
import { useAppContext } from '../AppContext';
import { LoadingFallback } from './common/LoadingFallback';
import { HeaderTabs, HeaderTabItem } from './common/HeaderTabs';
import { PageHeader } from './common/PageHeader';

const TabUmum = React.lazy(() => import('./settings/tabs/TabUmum').then((module) => ({ default: module.TabUmum })));
const TabAkun = React.lazy(() => import('./settings/tabs/TabAkun').then((module) => ({ default: module.TabAkun })));
const TabNis = React.lazy(() => import('./settings/tabs/TabNis').then((module) => ({ default: module.TabNis })));
const TabCloud = React.lazy(() => import('./settings/tabs/TabCloud').then((module) => ({ default: module.TabCloud })));
const TabBackup = React.lazy(() => import('./settings/tabs/TabBackup').then((module) => ({ default: module.TabBackup })));
const TabDiagnostik = React.lazy(() => import('./settings/tabs/TabDiagnostik').then((module) => ({ default: module.TabDiagnostik })));
const TabDigitalAset = React.lazy(() => import('./settings/tabs/TabDigitalAset').then((module) => ({ default: module.TabDigitalAset })));

type SettingsTab = 'umum' | 'akun' | 'nis' | 'cloud' | 'backup' | 'diagnostik' | 'digitalaset';

const SETTINGS_TABS: HeaderTabItem<SettingsTab>[] = [
    { value: 'umum', label: 'Umum', icon: 'bi-info-circle' },
    { value: 'akun', label: 'User & Keamanan', icon: 'bi-shield-lock' },
    { value: 'nis', label: 'Generator NIS', icon: 'bi-123' },
    { value: 'digitalaset', label: 'Aset Digital', icon: 'bi-image' },
    { value: 'cloud', label: 'Sync Cloud', icon: 'bi-cloud-arrow-up' },
    { value: 'backup', label: 'Backup & Restore', icon: 'bi-hdd-fill' },
    { value: 'diagnostik', label: 'Diagnosa', icon: 'bi-heart-pulse-fill' },
];

const Settings: React.FC = () => {
    const { settings, onSaveSettings, showConfirmation, showToast, isSampleDataDetected, onDeleteSampleData } = useAppContext();
    const [localSettings, setLocalSettings] = useState<PondokSettings>(settings);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeletingSample, setIsDeletingSample] = useState(false);
    const [activeTab, setActiveTab] = useState<SettingsTab>('umum');

    useEffect(() => {
        // When settings from context change, update local state
        // but keep sensitive keys empty in the UI (since they are already in the DB)
        setLocalSettings({
            ...settings,
            cloudSyncConfig: {
                ...settings.cloudSyncConfig,
                dropboxAppKey: '',
                dropboxAppSecret: '',
                webdavPassword: ''
            }
        });
    }, [settings]);

    useEffect(() => {
        const handleTabChange = (e: any) => {
            if (e.detail) setActiveTab(e.detail);
        };
        window.addEventListener('change-settings-tab', handleTabChange);
        return () => window.removeEventListener('change-settings-tab', handleTabChange);
    }, []);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('code')) {
            setActiveTab('cloud');
        }
    }, []);

    useEffect(() => {
        const jenjangIdsInConfig = new Set(localSettings.nisSettings.jenjangConfig.map(jc => jc.jenjangId));
        const newConfigs: NisJenjangConfig[] = [];

        localSettings.jenjang.forEach(j => {
            if (!jenjangIdsInConfig.has(j.id)) {
                newConfigs.push({ 
                    jenjangId: j.id, 
                    startNumber: 1, 
                    padding: 3,
                    method: 'global',
                    format: '{TM}{KODE}{NO_URUT}',
                    prefix: '',
                    useYearPrefix: true,
                    useJenjangCode: true
                });
            }
        });

        if (newConfigs.length > 0) {
            setLocalSettings(prev => ({
                ...prev,
                nisSettings: {
                    ...prev.nisSettings,
                    jenjangConfig: [...prev.nisSettings.jenjangConfig, ...newConfigs]
                }
            }));
        }
    }, [localSettings.jenjang, localSettings.nisSettings.jenjangConfig]);

    const activeTeachers = useMemo(() => 
        localSettings.tenagaPengajar.filter(t => !t.riwayatJabatan.some(r => r.tanggalSelesai)),
        [localSettings.tenagaPengajar]
    );

    const hasUnsavedChanges = useMemo(() => {
        const normalizedCurrent = {
            ...settings,
            cloudSyncConfig: {
                ...settings.cloudSyncConfig,
                dropboxAppKey: localSettings.cloudSyncConfig?.dropboxAppKey || '',
                dropboxAppSecret: localSettings.cloudSyncConfig?.dropboxAppSecret || '',
                webdavPassword: localSettings.cloudSyncConfig?.webdavPassword || ''
            }
        };
        return JSON.stringify(localSettings) !== JSON.stringify(normalizedCurrent);
    }, [localSettings, settings]);

    const handleResetChanges = () => {
        setLocalSettings({
            ...settings,
            cloudSyncConfig: {
                ...settings.cloudSyncConfig,
                dropboxAppKey: '',
                dropboxAppSecret: '',
                webdavPassword: ''
            }
        });
        showToast('Perubahan dibatalkan dan dikembalikan ke pengaturan tersimpan.', 'info');
    };

    const handleInputChange = <K extends keyof PondokSettings>(key: K, value: PondokSettings[K]) => {
        setLocalSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleSaveSettingsHandler = () => {
        showConfirmation(
            'Simpan Pengaturan',
            'Apakah Anda yakin ingin menyimpan semua perubahan yang dibuat?',
            async () => {
                setIsSaving(true);
                try {
                    // Smart merge for sensitive cloud keys:
                    // If the UI version is empty, retain the existing version from DB (settings)
                    const dataToSave = { ...localSettings };
                    
                    if (!dataToSave.cloudSyncConfig.dropboxAppKey && settings.cloudSyncConfig.dropboxAppKey) {
                        dataToSave.cloudSyncConfig.dropboxAppKey = settings.cloudSyncConfig.dropboxAppKey;
                    }
                    if (!dataToSave.cloudSyncConfig.dropboxAppSecret && settings.cloudSyncConfig.dropboxAppSecret) {
                        dataToSave.cloudSyncConfig.dropboxAppSecret = settings.cloudSyncConfig.dropboxAppSecret;
                    }
                    if (!dataToSave.cloudSyncConfig.webdavPassword && settings.cloudSyncConfig.webdavPassword) {
                        dataToSave.cloudSyncConfig.webdavPassword = settings.cloudSyncConfig.webdavPassword;
                    }

                    await onSaveSettings(dataToSave);
                    
                    // After successful save, clear the keys from local state (UI) for security
                    setLocalSettings(prev => ({
                        ...prev,
                        cloudSyncConfig: {
                            ...prev.cloudSyncConfig,
                            dropboxAppKey: '',
                            dropboxAppSecret: '',
                            webdavPassword: ''
                        }
                    }));

                    showToast('Pengaturan berhasil disimpan! Kredensial disembunyikan demi keamanan.', 'success');
                } catch (error) {
                    console.error("Failed to save settings:", error);
                    showToast('Gagal menyimpan pengaturan.', 'error');
                } finally {
                    setIsSaving(false);
                }
            },
            { confirmText: 'Ya, Simpan', confirmColor: 'green' }
        );
    };

    const handleDeleteSampleData = () => {
        showConfirmation(
            'Hapus Seluruh Data Sampel?',
            'Tindakan ini akan mengosongkan data santri simulasi, tagihan contoh, kas simulasi, dan catatan mutaba\'ah agar aplikasi siap digunakan untuk data asli pondok Anda. Apakah Anda yakin?',
            async () => {
                setIsDeletingSample(true);
                try {
                    await onDeleteSampleData();
                    showToast('Semua data sampel berhasil dihapus. Aplikasi kini bersih!', 'success');
                } catch (error) {
                    console.error('Failed to delete sample data:', error);
                    showToast('Gagal menghapus data sampel.', 'error');
                } finally {
                    setIsDeletingSample(false);
                }
            },
            { confirmText: 'Ya, Hapus Data Sampel', confirmColor: 'red' }
        );
    };

    return (
        <div className="space-y-6">
            <PageHeader
                eyebrow="Sistem"
                title="Pengaturan Sistem"
                description="Kelola konfigurasi pondok, akun, generator NIS, aset digital, cloud sync, backup, dan diagnostik dari panel terpusat."
                tabs={<HeaderTabs tabs={SETTINGS_TABS} value={activeTab} onChange={setActiveTab} />}
            />

            {/* Warning Banner Data Sampel */}
            {isSampleDataDetected && (
                <div className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 via-amber-50/80 to-yellow-50 p-4 sm:p-5 shadow-sm animate-fade-in">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-3.5">
                            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 border border-amber-200/60 shadow-xs">
                                <i className="bi bi-exclamation-triangle-fill text-lg"></i>
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-amber-950 flex items-center gap-2">
                                    Peringatan: Data Simulasi / Sampel Masih Aktif
                                    <span className="px-2 py-0.5 text-[11px] font-semibold bg-amber-200/80 text-amber-900 rounded-full">Mode Demo</span>
                                </h4>
                                <p className="text-xs text-amber-800 mt-1 leading-relaxed max-w-3xl">
                                    Aplikasi saat ini memuat data contoh (Pondok Pesantren Al-Ikhlas, santri contoh, tagihan, dan mutaba'ah). 
                                    Jika Anda siap memasukkan data riil pondok Anda, bersihkan data sampel atau kelola opsi reset di menu <strong>Backup & Restore</strong>.
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 shrink-0 self-end sm:self-center">
                            <button
                                type="button"
                                onClick={() => setActiveTab('backup')}
                                className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-white border border-amber-200 text-amber-900 hover:bg-amber-100/60 transition-colors shadow-2xs"
                            >
                                <i className="bi bi-arrow-repeat mr-1.5"></i>
                                Menu Reset Data
                            </button>
                            <button
                                type="button"
                                onClick={handleDeleteSampleData}
                                disabled={isDeletingSample}
                                className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-amber-600 hover:bg-amber-700 text-white transition-colors shadow-2xs disabled:opacity-50 inline-flex items-center gap-1.5"
                            >
                                <i className="bi bi-trash3"></i>
                                <span>{isDeletingSample ? 'Membersihkan...' : 'Bersihkan Data Sampel'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="space-y-6">
                <Suspense fallback={<LoadingFallback />}>
                    {activeTab === 'umum' && <TabUmum localSettings={localSettings} handleInputChange={handleInputChange} activeTeachers={activeTeachers} />}
                    {activeTab === 'akun' && <TabAkun localSettings={localSettings} handleInputChange={handleInputChange} />}
                    {activeTab === 'nis' && <TabNis localSettings={localSettings} setLocalSettings={setLocalSettings} />}
                    {activeTab === 'cloud' && <TabCloud localSettings={localSettings} setLocalSettings={setLocalSettings} onSaveSettings={onSaveSettings} />}
                    {activeTab === 'backup' && <TabBackup localSettings={localSettings} setLocalSettings={setLocalSettings} />}
                    {activeTab === 'diagnostik' && <TabDiagnostik />}
                    {activeTab === 'digitalaset' && <TabDigitalAset />}
                </Suspense>
            </div>
            
            {(hasUnsavedChanges || ['umum', 'akun', 'nis', 'cloud'].includes(activeTab)) && (
                <div className="sticky bottom-4 z-20 mt-6">
                    <div className={`flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border p-3.5 shadow-lg backdrop-blur-md transition-all ${
                        hasUnsavedChanges
                            ? 'bg-amber-950/90 border-amber-500/40 text-white'
                            : 'bg-white/90 border-slate-200 text-slate-700'
                    }`}>
                        <div className="flex items-center gap-3 text-xs sm:text-sm px-2">
                            {hasUnsavedChanges ? (
                                <>
                                    <span className="flex h-2.5 w-2.5 relative">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-400"></span>
                                    </span>
                                    <span className="font-semibold text-amber-100">
                                        Terdapat perubahan pengaturan yang belum disimpan.
                                    </span>
                                </>
                            ) : (
                                <>
                                    <i className="bi bi-check2-circle text-teal-600 text-base"></i>
                                    <span className="text-slate-500 font-medium">
                                        Seluruh perubahan pengaturan pada tab ini sudah tersimpan.
                                    </span>
                                </>
                            )}
                        </div>
                        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                            {hasUnsavedChanges && (
                                <button
                                    type="button"
                                    onClick={handleResetChanges}
                                    disabled={isSaving}
                                    className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-amber-100 border border-white/15 transition-colors"
                                >
                                    <i className="bi bi-arrow-counterclockwise mr-1.5"></i>
                                    Reset Perubahan
                                </button>
                            )}
                            <button
                                onClick={handleSaveSettingsHandler}
                                disabled={isSaving}
                                className="app-button-primary min-w-[180px] px-6 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {isSaving ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        <span>Menyimpan...</span>
                                    </>
                                ) : (
                                    <>
                                        <i className="bi bi-save-fill mr-2"></i> Simpan Perubahan
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Settings;
