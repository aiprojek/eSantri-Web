import React, { useState } from 'react';
import { useAppContext } from '../AppContext';
import { PageHeader } from './common/PageHeader';
import { HeaderTabs } from './common/HeaderTabs';
import { AsramaDashboard } from './asrama/AsramaDashboard';
import { ManajemenGedungKamar } from './asrama/ManajemenGedungKamar';
import { PenempatanMutasiSantri } from './asrama/PenempatanMutasiSantri';
import { JurnalInspeksiAsrama } from './asrama/JurnalInspeksiAsrama';

export const Asrama: React.FC = () => {
    const { currentUser } = useAppContext();
    const canWrite = currentUser?.role === 'admin' || currentUser?.permissions?.keasramaan === 'write';
    const [activeTab, setActiveTab] = useState<'dashboard' | 'manajemen' | 'penempatan' | 'jurnal'>('dashboard');

    const handleNavigateTab = (tab: 'dashboard' | 'manajemen' | 'penempatan' | 'jurnal') => {
        if (!canWrite && (tab === 'manajemen' || tab === 'penempatan')) return;
        setActiveTab(tab);
    };

    const availableTabs = [
        { value: 'dashboard' as const, label: 'Dashboard Asrama', icon: 'bi-grid-1x2-fill' },
        ...(canWrite
            ? [
                  { value: 'manajemen' as const, label: 'Gedung & Kamar', icon: 'bi-building-gear' },
                  { value: 'penempatan' as const, label: 'Penempatan & Mutasi', icon: 'bi-people-fill' },
              ]
            : []),
        { value: 'jurnal' as const, label: 'Jurnal & Inspeksi', icon: 'bi-shield-check' },
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                eyebrow="Pengasuhan & Keasramaan"
                title="Sistem Manajemen Keasramaan"
                description="Monitoring okupansi & kesehatan santri asrama, manajemen kamar & Rais Ghorfah, mutasi kamar cepat, cetak label pintu kamar, serta sidak nadhafah dan jurnal pembinaan harian musyrif."
                tabs={
                    <HeaderTabs
                        value={activeTab}
                        onChange={handleNavigateTab}
                        tabs={availableTabs}
                    />
                }
                className="mb-6"
            />

            {activeTab === 'dashboard' && <AsramaDashboard onNavigateTab={handleNavigateTab} />}
            {activeTab === 'manajemen' && canWrite && <ManajemenGedungKamar />}
            {activeTab === 'penempatan' && canWrite && <PenempatanMutasiSantri />}
            {activeTab === 'jurnal' && <JurnalInspeksiAsrama />}
        </div>
    );
};

export default Asrama;
