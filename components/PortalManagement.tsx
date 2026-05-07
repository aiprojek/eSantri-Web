import React, { Suspense, useEffect, useState } from 'react';
import { PondokSettings } from '../types';
import { useAppContext } from '../AppContext';
import { syncPortalBridgeToGas } from '../services/portalGasService';
import { LoadingFallback } from './common/LoadingFallback';
import { PageHeader } from './common/PageHeader';
import { SectionCard } from './common/SectionCard';

const TabPortal = React.lazy(() => import('./settings/tabs/TabPortal').then((module) => ({ default: module.TabPortal })));

const PortalManagement: React.FC = () => {
    const { settings, onSaveSettings, showToast } = useAppContext();
    const [localSettings, setLocalSettings] = useState<PondokSettings>(settings);
    const [isSyncingPortal, setIsSyncingPortal] = useState(false);

    useEffect(() => {
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

    const handleSyncToPortal = async () => {
        setIsSyncingPortal(true);
        try {
            await syncPortalBridgeToGas(localSettings);
            showToast('Data berhasil disinkronkan ke Portal Wali.', 'success');
        } catch (error) {
            showToast(`Gagal sinkronisasi data ke portal: ${(error as Error).message}`, 'error');
        } finally {
            setIsSyncingPortal(false);
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader
                eyebrow="Portal"
                title="Portal Wali Santri"
                description="Kelola konfigurasi portal dan sinkronisasi data dalam satu halaman."
            />

            <SectionCard
                title="Sinkronisasi Data Portal"
                description="Gunakan tombol ini untuk mengirim data terbaru dari aplikasi ke Portal Wali."
                contentClassName="p-6"
            >
                <button
                    onClick={handleSyncToPortal}
                    disabled={isSyncingPortal}
                    className="app-button-primary px-5 py-2.5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {isSyncingPortal ? 'Menyinkronkan...' : 'Sinkronkan Sekarang'}
                </button>
            </SectionCard>

            <Suspense fallback={<LoadingFallback />}>
                <TabPortal
                    localSettings={localSettings}
                    setLocalSettings={setLocalSettings}
                    onSaveSettings={onSaveSettings}
                />
            </Suspense>
        </div>
    );
};

export default PortalManagement;
