
import React, { useState } from 'react';
import { TahfizhInput } from './tahfizh/TahfizhInput';
import { TahfizhHistory } from './tahfizh/TahfizhHistory';
import { PageHeader } from './common/PageHeader';
import { HeaderTabs } from './common/HeaderTabs';

const Tahfizh: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'input' | 'riwayat'>('input');

  return (
    <div className="space-y-6 pb-20">
        <PageHeader
            eyebrow="Kesiswaan"
            title="Tahfizh & Al-Qur'an"
            description="Kelola mutaba'ah hafalan, input setoran, dan riwayat laporan tahfizh dengan tampilan kerja yang lebih rapi."
            tabs={
                <HeaderTabs
                    value={activeTab}
                    onChange={setActiveTab}
                    tabs={[
                        { value: 'input', label: 'Input Setoran', icon: 'bi-pencil-square' },
                        { value: 'riwayat', label: 'Riwayat & Laporan', icon: 'bi-journal-bookmark-fill' },
                    ]}
                />
            }
        />

        {activeTab === 'input' && <TahfizhInput />}
        
        {activeTab === 'riwayat' && <TahfizhHistory />}
    </div>
  );
};

export default Tahfizh;
