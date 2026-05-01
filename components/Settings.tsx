
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
const TabPortal = React.lazy(() => import('./settings/tabs/TabPortal').then((module) => ({ default: module.TabPortal })));
const TabDiagnostik = React.lazy(() => import('./settings/tabs/TabDiagnostik').then((module) => ({ default: module.TabDiagnostik })));

type SettingsTab = 'umum' | 'akun' | 'nis' | 'cloud' | 'portal' | 'backup' | 'diagnostik';

const SETTINGS_TABS: HeaderTabItem<SettingsTab>[] = [
    { value: 'umum', label: 'Umum', icon: 'bi-info-circle' },
    { value: 'akun', label: 'User & Keamanan', icon: 'bi-shield-lock' },
    { value: 'nis', label: 'Generator NIS', icon: 'bi-123' },
    { value: 'portal', label: 'Portal Wali', icon: 'bi-globe2' },
    { value: 'cloud', label: 'Sync Cloud', icon: 'bi-cloud-arrow-up' },
    { value: 'backup', label: 'Backup & Restore', icon: 'bi-hdd-fill' },
    { value: 'diagnostik', label: 'Diagnosa', icon: 'bi-heart-pulse-fill' },
];

const Settings: React.FC = () => {
    const { settings, onSaveSettings, showConfirmation, showToast } = useAppContext();
    const [localSettings, setLocalSettings] = useState<PondokSettings>(settings);
    const [isSaving, setIsSaving] = useState(false);
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

    return (
        <div className="space-y-6">
            <PageHeader
                eyebrow="Sistem"
                title="Pengaturan Sistem"
                description="Kelola konfigurasi pondok, akun, generator NIS, portal, cloud sync, backup, dan diagnostik dari panel terpusat."
                tabs={<HeaderTabs tabs={SETTINGS_TABS} value={activeTab} onChange={setActiveTab} />}
            />

            <div className="space-y-6">
                <Suspense fallback={<LoadingFallback />}>
                    {activeTab === 'umum' && <TabUmum localSettings={localSettings} handleInputChange={handleInputChange} activeTeachers={activeTeachers} />}
                    {activeTab === 'akun' && <TabAkun localSettings={localSettings} handleInputChange={handleInputChange} />}
                    {activeTab === 'nis' && <TabNis localSettings={localSettings} setLocalSettings={setLocalSettings} />}
                    {activeTab === 'portal' && <TabPortal localSettings={localSettings} setLocalSettings={setLocalSettings} onSaveSettings={onSaveSettings} />}
                    {activeTab === 'cloud' && <TabCloud localSettings={localSettings} setLocalSettings={setLocalSettings} onSaveSettings={onSaveSettings} />}
                    {activeTab === 'backup' && <TabBackup localSettings={localSettings} setLocalSettings={setLocalSettings} />}
                    {activeTab === 'diagnostik' && <TabDiagnostik />}
                </Suspense>
            </div>
            
             <div className="sticky bottom-4 z-10 mt-6 flex justify-end">
                <button onClick={handleSaveSettingsHandler} disabled={isSaving} className="app-button-primary min-w-[190px] px-8 py-3 disabled:cursor-not-allowed disabled:opacity-60">
                    {isSaving ? <><svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg><span>Menyimpan...</span></> : <><i className="bi bi-save-fill mr-2"></i> Simpan Perubahan</>}
                </button>
            </div>
        </div>
    );
};

export default Settings;
