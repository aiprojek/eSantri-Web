
import React, { useState } from 'react';
import { TahfizhInput } from './tahfizh/TahfizhInput';
import { TahfizhHistory } from './tahfizh/TahfizhHistory';
import { TahfizhHalaqahManager } from './tahfizh/TahfizhHalaqahManager';
import { PageHeader } from './common/PageHeader';
import { HeaderTabs } from './common/HeaderTabs';

const Tahfizh: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'input' | 'riwayat' | 'halaqah'>('input');

  return (
    <div className="space-y-6 pb-20">
        <PageHeader
            eyebrow="Kesiswaan"
            title="Tahfizh & Al-Qur'an"
            description="Kelola mutaba'ah hafalan harian, input setoran dengan mushaf terintegrasi, kelompok halaqah santri, dan syahadah kelulusan."
            tabs={
                <HeaderTabs
                    value={activeTab}
                    onChange={setActiveTab}
                    tabs={[
                        { value: 'input', label: 'Input Setoran', icon: 'bi-pencil-square' },
                        { value: 'riwayat', label: 'Riwayat & Laporan', icon: 'bi-journal-bookmark-fill' },
                        { value: 'halaqah', label: 'Kelompok Halaqah', icon: 'bi-diagram-3-fill' },
                    ]}
                />
            }
        />

        {activeTab === 'input' && <TahfizhInput />}
        
        {activeTab === 'riwayat' && <TahfizhHistory />}

        {activeTab === 'halaqah' && <TahfizhHalaqahManager />}
    </div>
  );
};

export default Tahfizh;
