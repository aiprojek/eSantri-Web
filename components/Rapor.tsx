import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { useAppContext } from '../AppContext';
import { PageHeader } from './common/PageHeader';
import { HeaderTabs } from './common/HeaderTabs';

const TabDesainRapor = lazy(() => import('./akademik/TabDesainRapor').then((module) => ({ default: module.TabDesainRapor })));
const TabGeneratorFormulir = lazy(() => import('./akademik/TabGeneratorFormulir').then((module) => ({ default: module.TabGeneratorFormulir })));
const TabImportNilai = lazy(() => import('./akademik/TabImportNilai').then((module) => ({ default: module.TabImportNilai })));
const TabDataNilai = lazy(() => import('./akademik/TabDataNilai').then((module) => ({ default: module.TabDataNilai })));
const TabCetakRapor = lazy(() => import('./akademik/TabCetakRapor').then((module) => ({ default: module.TabCetakRapor })));
const TabMonitoringNilai = lazy(() => import('./akademik/TabMonitoringNilai').then((module) => ({ default: module.TabMonitoringNilai })));
const TabInputNilaiWali = lazy(() => import('./akademik/TabInputNilaiWali').then((module) => ({ default: module.TabInputNilaiWali })));

const TabLoadingFallback = () => (
    <div className="flex h-48 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-teal-600"></div>
    </div>
);

type RaporTabId = 'designer' | 'generator' | 'import' | 'monitoring' | 'data' | 'print' | 'input_wali';

const Rapor: React.FC = () => {
    const { currentUser } = useAppContext();
    const isWaliKelas = currentUser?.role === 'wali_kelas';
    const isAdmin = currentUser?.role === 'admin';
    const akademikPermission = currentUser?.permissions?.akademik;
    const canReadAkademik = isAdmin || isWaliKelas || akademikPermission === 'read' || akademikPermission === 'write';
    const canWriteAkademik = isAdmin || akademikPermission === 'write';
    const [activeTab, setActiveTab] = useState<RaporTabId>(isWaliKelas ? 'input_wali' : 'monitoring');

    const raporTabs = useMemo(() => {
        const tabs: Array<{ value: RaporTabId; label: string; icon: string }> = [];

        if (!isWaliKelas && canReadAkademik) {
            tabs.push({ value: 'monitoring', label: 'Progres Nilai', icon: 'bi-activity' });
        }
        if (!isWaliKelas && canWriteAkademik) {
            tabs.push(
                { value: 'designer', label: 'Design & Template', icon: 'bi-grid-3x3' },
                { value: 'generator', label: 'Generate Form', icon: 'bi-file-earmark-code' },
                { value: 'import', label: 'Import Nilai', icon: 'bi-box-arrow-in-down' }
            );
        }
        if (isWaliKelas || isAdmin || canWriteAkademik) {
            tabs.push({ value: 'input_wali', label: 'Input Nilai Wali Kelas', icon: 'bi-pencil-square' });
        }
        if (!isWaliKelas && canReadAkademik) {
            tabs.push(
                { value: 'data', label: 'Review Data Nilai', icon: 'bi-database' },
                { value: 'print', label: 'Cetak Rapor', icon: 'bi-printer' }
            );
        }
        return tabs;
    }, [isWaliKelas, isAdmin, canReadAkademik, canWriteAkademik]);

    useEffect(() => {
        if (!raporTabs.find(tab => tab.value === activeTab) && raporTabs.length > 0) {
            setActiveTab(raporTabs[0].value);
        }
    }, [raporTabs, activeTab]);

    if (!canReadAkademik) {
        return (
            <div className="app-panel rounded-panel p-8 text-center">
                <i className="bi bi-shield-lock text-4xl text-slate-300" />
                <h3 className="mt-4 text-lg font-bold app-text-primary">Akses Modul Rapor Dibatasi</h3>
                <p className="mt-1 text-sm app-text-muted">Hubungi admin untuk memberikan izin `akademik: read` atau `akademik: write`.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <PageHeader
                eyebrow="Pendidikan"
                title="Rapor"
                description="Kelola template, input, monitoring, review, dan cetak rapor dalam workspace terpisah."
                tabs={
                    <HeaderTabs
                        value={activeTab}
                        onChange={(next) => setActiveTab(next as RaporTabId)}
                        tabs={raporTabs}
                    />
                }
            />
            <div className="app-panel rounded-panel p-6">
                <Suspense fallback={<TabLoadingFallback />}>
                    {activeTab === 'designer' && <TabDesainRapor />}
                    {activeTab === 'generator' && <TabGeneratorFormulir />}
                    {activeTab === 'import' && <TabImportNilai />}
                    {activeTab === 'monitoring' && <TabMonitoringNilai />}
                    {activeTab === 'data' && <TabDataNilai />}
                    {activeTab === 'print' && <TabCetakRapor />}
                    {activeTab === 'input_wali' && <TabInputNilaiWali />}
                </Suspense>
            </div>
        </div>
    );
};

export default Rapor;

