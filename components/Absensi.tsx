import React, { useState, useEffect } from 'react';
import { useAppContext } from '../AppContext';
import { PageHeader } from './common/PageHeader';
import { HeaderTabs } from './common/HeaderTabs';
import { AbsensiInput } from './absensi/AbsensiInput';
import { AbsensiDispensasi } from './absensi/AbsensiDispensasi';
import { AbsensiSuratPeringatan } from './absensi/AbsensiSuratPeringatan';
import { AbsensiAnalitik } from './absensi/AbsensiAnalitik';
import { AbsensiRekap } from './absensi/AbsensiRekap';

type AbsensiTabType = 'input' | 'dispensasi' | 'peringatan' | 'analitik' | 'rekap';

const Absensi: React.FC = () => {
    const { currentUser } = useAppContext();
    const canWrite = currentUser?.role === 'admin' || currentUser?.permissions?.absensi === 'write';
    const [activeTab, setActiveTab] = useState<AbsensiTabType>(() => (canWrite ? 'input' : 'rekap'));

    useEffect(() => {
        if (!canWrite && (activeTab === 'input' || activeTab === 'dispensasi' || activeTab === 'peringatan')) {
            setActiveTab('rekap');
        }
    }, [canWrite, activeTab]);

    return (
        <div className="flex min-h-0 flex-col space-y-6">
            <PageHeader
                eyebrow="Kesiswaan & Kedisiplinan"
                title="Manajemen Presensi & Absensi"
                description="Pencatatan multi-sesi (KBM, Sholat, Halaqah), izin & dispensasi multi-hari, generator Surat Peringatan (SP) & Panggilan Wali, kalender kehadiran santri, serta rekapitulasi matriks dokumen resmi."
                tabs={
                    <HeaderTabs
                        value={activeTab}
                        onChange={val => setActiveTab(val as AbsensiTabType)}
                        tabs={[
                            ...(canWrite
                                ? [
                                      { value: 'input' as const, label: 'Input Harian', icon: 'bi-pencil-square' },
                                      { value: 'dispensasi' as const, label: 'Izin & Dispensasi', icon: 'bi-calendar2-range-fill' },
                                      { value: 'peringatan' as const, label: 'Surat Peringatan & SP', icon: 'bi-file-earmark-medical-fill' },
                                  ]
                                : []),
                            { value: 'analitik', label: 'Kalender & Analitik', icon: 'bi-bar-chart-line-fill' },
                            { value: 'rekap', label: 'Rekap & Dokumen', icon: 'bi-table' },
                        ]}
                    />
                }
            />

            <div className="min-h-0 flex-grow">
                {activeTab === 'input' && canWrite && <AbsensiInput />}
                {activeTab === 'dispensasi' && canWrite && <AbsensiDispensasi />}
                {activeTab === 'peringatan' && canWrite && <AbsensiSuratPeringatan />}
                {activeTab === 'analitik' && <AbsensiAnalitik />}
                {activeTab === 'rekap' && <AbsensiRekap />}
            </div>
        </div>
    );
};

export default Absensi;
