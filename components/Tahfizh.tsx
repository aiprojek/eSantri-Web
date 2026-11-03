
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../AppContext';
import { TahfizhInput } from './tahfizh/TahfizhInput';
import { TahfizhHistory } from './tahfizh/TahfizhHistory';
import { TahfizhHalaqahManager } from './tahfizh/TahfizhHalaqahManager';
import { PageHeader } from './common/PageHeader';
import { HeaderTabs } from './common/HeaderTabs';

const Tahfizh: React.FC = () => {
  const { currentUser } = useAppContext();
  const canWrite = currentUser?.role === 'admin' || currentUser?.permissions?.tahfizh === 'write';
  const [activeTab, setActiveTab] = useState<'input' | 'riwayat' | 'halaqah'>(() => (canWrite ? 'input' : 'riwayat'));

  useEffect(() => {
    if (!canWrite && activeTab !== 'riwayat') {
      setActiveTab('riwayat');
    }
  }, [canWrite, activeTab]);

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
                        ...(canWrite ? [{ value: 'input' as const, label: 'Input Setoran', icon: 'bi-pencil-square' }] : []),
                        { value: 'riwayat', label: 'Riwayat & Laporan', icon: 'bi-journal-bookmark-fill' },
                        ...(canWrite ? [{ value: 'halaqah' as const, label: 'Kelompok Halaqah', icon: 'bi-diagram-3-fill' }] : []),
                    ]}
                />
            }
        />

        {activeTab === 'input' && canWrite && <TahfizhInput />}
        
        {activeTab === 'riwayat' && <TahfizhHistory />}

        {activeTab === 'halaqah' && canWrite && <TahfizhHalaqahManager />}
    </div>
  );
};

export default Tahfizh;
