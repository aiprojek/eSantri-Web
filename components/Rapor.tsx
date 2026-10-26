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
const TabLegerNilai = lazy(() => import('./akademik/TabLegerNilai').then((module) => ({ default: module.TabLegerNilai })));

const TabLoadingFallback = () => (
    <div className="flex h-48 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-teal-600"></div>
    </div>
);

export interface SharedRaporContext {
    rombelId?: number;
    santriId?: number;
    tahunAjaran?: string;
    semester?: 'Ganjil' | 'Genap';
    templateId?: string;
}

type RaporTabId = 'designer' | 'generator' | 'import' | 'monitoring' | 'data' | 'print' | 'input_wali' | 'leger';

const RAPOR_ACTIVE_TAB_KEY = 'esantri_rapor_active_tab';

const Rapor: React.FC = () => {
    const { currentUser } = useAppContext();
    const isWaliKelas = currentUser?.role === 'wali_kelas';
    const isAdmin = currentUser?.role === 'admin';
    const akademikPermission = currentUser?.permissions?.akademik;
    const canReadAkademik = isAdmin || isWaliKelas || akademikPermission === 'read' || akademikPermission === 'write';
    const canWriteAkademik = isAdmin || akademikPermission === 'write';
    const [activeTab, setActiveTab] = useState<RaporTabId>(() => {
        const defaultTab: RaporTabId = isWaliKelas ? 'input_wali' : 'monitoring';
        try {
            const saved = sessionStorage.getItem(RAPOR_ACTIVE_TAB_KEY) as RaporTabId | null;
            if (saved) return saved;
        } catch {
            // ignore storage errors
        }
        return defaultTab;
    });

    // Shared navigation context across all tabs
    const [sharedContext, setSharedContext] = useState<SharedRaporContext>({});

    const handleNavigateWithContext = (
        tab: string,
        contextPayload?: number | Partial<SharedRaporContext>
    ) => {
        let updatedContext: SharedRaporContext = { ...sharedContext };
        if (typeof contextPayload === 'number') {
            updatedContext.rombelId = contextPayload;
        } else if (contextPayload && typeof contextPayload === 'object') {
            updatedContext = { ...updatedContext, ...contextPayload };
        }
        setSharedContext(updatedContext);
        setActiveTab(tab as RaporTabId);
    };

    const handleUpdateSharedContext = (newContext: Partial<SharedRaporContext>) => {
        setSharedContext(prev => ({ ...prev, ...newContext }));
    };

    const raporTabs = useMemo(() => {
        const tabs: Array<{ value: RaporTabId; label: string; icon: string; mobileLabel?: string }> = [];

        if (!isWaliKelas && canReadAkademik) {
            tabs.push({ value: 'monitoring', label: 'Progres Nilai', icon: 'bi-activity', mobileLabel: 'Progres' });
        }
        if (isWaliKelas || isAdmin || canWriteAkademik) {
            tabs.push({ value: 'input_wali', label: 'Input Nilai', icon: 'bi-pencil-square', mobileLabel: 'Input' });
            tabs.push({ value: 'leger', label: 'Leger Nilai', icon: 'bi-table', mobileLabel: 'Leger' });
        }
        if (canReadAkademik) {
            tabs.push({ value: 'print', label: 'Cetak Rapor', icon: 'bi-printer', mobileLabel: 'Cetak' });
        }
        if (!isWaliKelas && canReadAkademik) {
            tabs.push({ value: 'data', label: 'Review Data', icon: 'bi-database', mobileLabel: 'Review' });
        }
        if (!isWaliKelas && canWriteAkademik) {
            tabs.push(
                { value: 'designer', label: 'Design & Template', icon: 'bi-grid-3x3', mobileLabel: 'Desain' },
                { value: 'generator', label: 'Generate Form', icon: 'bi-file-earmark-code', mobileLabel: 'Formulir' }
            );
        }
        return tabs;
    }, [isWaliKelas, isAdmin, canReadAkademik, canWriteAkademik]);

    useEffect(() => {
        if (!raporTabs.find(tab => tab.value === activeTab) && raporTabs.length > 0) {
            setActiveTab(raporTabs[0].value);
            return;
        }
        try {
            sessionStorage.setItem(RAPOR_ACTIVE_TAB_KEY, activeTab);
        } catch {
            // ignore storage errors
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
        <div className="space-y-4 sm:space-y-6">
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
            <div className="app-panel rounded-panel p-2 sm:p-4 lg:p-6 min-w-0 overflow-x-hidden">
                <Suspense fallback={<TabLoadingFallback />}>
                    {activeTab === 'designer' && <TabDesainRapor />}
                    {activeTab === 'generator' && <TabGeneratorFormulir />}
                    {activeTab === 'monitoring' && (
                        <TabMonitoringNilai 
                            onNavigateToTab={(tab, payload) => handleNavigateWithContext(tab, payload)} 
                        />
                    )}
                    {activeTab === 'data' && <TabDataNilai />}
                    {activeTab === 'print' && (
                        <TabCetakRapor 
                            onNavigateToTab={(tab, payload) => handleNavigateWithContext(tab, payload)} 
                        />
                    )}
                    {(activeTab === 'input_wali' || activeTab === 'import') && (
                        <TabInputNilaiWali 
                            initialContext={sharedContext}
                            onContextChange={handleUpdateSharedContext}
                        />
                    )}
                    {activeTab === 'leger' && (
                        <TabLegerNilai 
                            initialRombelId={sharedContext.rombelId}
                            initialTahunAjaran={sharedContext.tahunAjaran}
                            initialSemester={sharedContext.semester}
                            onNavigateToInputWali={(rId) => handleNavigateWithContext('input_wali', rId)} 
                        />
                    )}
                </Suspense>
            </div>
        </div>
    );
};

export default Rapor;

