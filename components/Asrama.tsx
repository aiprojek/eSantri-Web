import React, { useState } from 'react';
import { PageHeader } from './common/PageHeader';
import { HeaderTabs } from './common/HeaderTabs';
import { AsramaDashboard } from './asrama/AsramaDashboard';
import { ManajemenGedungKamar } from './asrama/ManajemenGedungKamar';
import { PenempatanMutasiSantri } from './asrama/PenempatanMutasiSantri';
import { JurnalInspeksiAsrama } from './asrama/JurnalInspeksiAsrama';

export const Asrama: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'manajemen' | 'penempatan' | 'jurnal'>('dashboard');

    return (
        <div className="space-y-6">
            <PageHeader
                eyebrow="Pengasuhan & Keasramaan"
                title="Sistem Manajemen Keasramaan"
                description="Monitoring okupansi & kesehatan santri asrama, manajemen kamar & Rais Ghorfah, mutasi kamar cepat, cetak label pintu kamar, serta sidak nadhafah dan jurnal pembinaan harian musyrif."
                tabs={
                    <HeaderTabs
                        value={activeTab}
                        onChange={setActiveTab}
                        tabs={[
                            { value: 'dashboard', label: 'Dashboard Asrama', icon: 'bi-grid-1x2-fill' },
                            { value: 'manajemen', label: 'Gedung & Kamar', icon: 'bi-building-gear' },
                            { value: 'penempatan', label: 'Penempatan & Mutasi', icon: 'bi-people-fill' },
                            { value: 'jurnal', label: 'Jurnal & Inspeksi', icon: 'bi-shield-check' },
                        ]}
                    />
                }
                className="mb-6"
            />

            {activeTab === 'dashboard' && <AsramaDashboard onNavigateTab={setActiveTab} />}
            {activeTab === 'manajemen' && <ManajemenGedungKamar />}
            {activeTab === 'penempatan' && <PenempatanMutasiSantri />}
            {activeTab === 'jurnal' && <JurnalInspeksiAsrama />}
        </div>
    );
};

export default Asrama;
