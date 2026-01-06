
import React, { useState, useEffect, useMemo } from 'react';
import { PondokSettings, NisJenjangConfig } from '../types';
import { useAppContext } from '../AppContext';
import { TabUmum } from './settings/tabs/TabUmum';
import { TabAkun } from './settings/tabs/TabAkun';
import { TabNis } from './settings/tabs/TabNis';
import { TabCloud } from './settings/tabs/TabCloud';
import { TabBackup } from './settings/tabs/TabBackup';

const Settings: React.FC = () => {
    const { settings, onSaveSettings, showConfirmation, showToast } = useAppContext();
    const [localSettings, setLocalSettings] = useState<PondokSettings>(settings);
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'umum' | 'akun' | 'nis' | 'cloud' | 'backup'>('umum');

    useEffect(() => {
        setLocalSettings(settings);
    }, [settings]);

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
                newConfigs.push({ jenjangId: j.id, startNumber: 1, padding: 3 });
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
                    await onSaveSettings(localSettings);
                    showToast('Pengaturan berhasil disimpan!', 'success');
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

    const TabButton: React.FC<{
        tabId: 'umum' | 'akun' | 'nis' | 'cloud' | 'backup';
        label: string;
        icon: string;
    }> = ({ tabId, label, icon }) => (
        <button
            onClick={() => setActiveTab(tabId)}
            className={`flex items-center gap-2 py-3 px-4 text-center font-medium text-sm whitespace-nowrap border-b-2 transition-colors duration-200 ${activeTab === tabId ? 'border-teal-600 text-teal-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
        >
            <i className={`bi ${icon}`}></i>
            <span>{label}</span>
        </button>
    );
    
    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Pengaturan Sistem</h1>
            
            <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200">
                <nav className="flex -mb-px overflow-x-auto">
                    <TabButton tabId="umum" label="Umum" icon="bi-info-circle" />
                    <TabButton tabId="akun" label="User & Keamanan" icon="bi-shield-lock" />
                    <TabButton tabId="nis" label="Generator NIS" icon="bi-123" />
                    <TabButton tabId="cloud" label="Sync Cloud" icon="bi-cloud-arrow-up" />
                    <TabButton tabId="backup" label="Backup & Restore" icon="bi-hdd-fill" />
                </nav>
            </div>

            <div className="space-y-6">
                {activeTab === 'umum' && <TabUmum localSettings={localSettings} handleInputChange={handleInputChange} activeTeachers={activeTeachers} />}
                {activeTab === 'akun' && <TabAkun localSettings={localSettings} handleInputChange={handleInputChange} />}
                {activeTab === 'nis' && <TabNis localSettings={localSettings} setLocalSettings={setLocalSettings} />}
                {activeTab === 'cloud' && <TabCloud localSettings={localSettings} setLocalSettings={setLocalSettings} onSaveSettings={onSaveSettings} />}
                {activeTab === 'backup' && <TabBackup localSettings={localSettings} setLocalSettings={setLocalSettings} />}
            </div>
            
             <div className="mt-6 flex justify-end sticky bottom-4 z-10">
                <button onClick={handleSaveSettingsHandler} disabled={isSaving} className="text-white bg-teal-700 hover:bg-teal-800 focus:ring-4 focus:ring-teal-300 font-medium rounded-lg text-sm px-8 py-3 flex items-center justify-center min-w-[190px] disabled:bg-teal-400 disabled:cursor-not-allowed shadow-lg transition-transform hover:-translate-y-1">
                    {isSaving ? <><svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg><span>Menyimpan...</span></> : <><i className="bi bi-save-fill mr-2"></i> Simpan Perubahan</>}
                </button>
            </div>
        </div>
    );
};

export default Settings;
