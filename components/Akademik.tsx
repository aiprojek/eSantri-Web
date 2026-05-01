
import React, { Suspense, lazy, useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../AppContext';
import { PageHeader } from './common/PageHeader';
import { HeaderTabs } from './common/HeaderTabs';

const TabDesainRapor = lazy(() => import('./akademik/TabDesainRapor').then((module) => ({ default: module.TabDesainRapor })));
const TabGeneratorFormulir = lazy(() => import('./akademik/TabGeneratorFormulir').then((module) => ({ default: module.TabGeneratorFormulir })));
const TabImportNilai = lazy(() => import('./akademik/TabImportNilai').then((module) => ({ default: module.TabImportNilai })));
const TabDataNilai = lazy(() => import('./akademik/TabDataNilai').then((module) => ({ default: module.TabDataNilai })));
const TabCetakRapor = lazy(() => import('./akademik/TabCetakRapor').then((module) => ({ default: module.TabCetakRapor })));
const TabMonitoringNilai = lazy(() => import('./akademik/TabMonitoringNilai').then((module) => ({ default: module.TabMonitoringNilai })));
const TabJadwalPelajaran = lazy(() => import('./akademik/TabJadwalPelajaran').then((module) => ({ default: module.TabJadwalPelajaran })));
const TabInputNilaiWali = lazy(() => import('./akademik/TabInputNilaiWali').then((module) => ({ default: module.TabInputNilaiWali })));
const TabJurnalMengajar = lazy(() => import('./akademik/TabJurnalMengajar').then((module) => ({ default: module.TabJurnalMengajar })));

const TabLoadingFallback = () => (
    <div className="flex justify-center items-center h-48">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600"></div>
    </div>
);

type AkademikCategory = 'kurikulum' | 'rapor';
type AkademikTabId = 'jadwal' | 'designer' | 'generator' | 'import' | 'monitoring' | 'data' | 'print' | 'input_wali' | 'jurnal';

const Akademik: React.FC = () => {
    const { currentUser } = useAppContext();
    const isWaliKelas = currentUser?.role === 'wali_kelas';
    const isAdmin = currentUser?.role === 'admin';
    const akademikPermission = currentUser?.permissions?.akademik;
    const canReadAkademik = isAdmin || isWaliKelas || akademikPermission === 'read' || akademikPermission === 'write';
    const canWriteAkademik = isAdmin || akademikPermission === 'write';

    const [activeCategory, setActiveCategory] = useState<AkademikCategory>(isWaliKelas ? 'rapor' : 'kurikulum');
    const [activeTab, setActiveTab] = useState<AkademikTabId>(isWaliKelas ? 'input_wali' : 'jadwal');

    const kurikulumTabs = useMemo<Array<{ value: AkademikTabId; label: string; icon: string }>>(
        () => [
            { value: 'jadwal', label: 'Jadwal Pelajaran', icon: 'bi-calendar-week' },
            { value: 'jurnal', label: 'Jurnal Mengajar (Log)', icon: 'bi-journal-text' },
        ],
        []
    );

    const raporTabs = useMemo(() => {
        const tabs: Array<{ value: AkademikTabId; label: string; icon: string }> = [];

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

    const availableTabs = activeCategory === 'kurikulum' ? kurikulumTabs : raporTabs;

    const handleCategoryChange = (cat: AkademikCategory) => {
        setActiveCategory(cat);
        const nextTabs = cat === 'kurikulum' ? kurikulumTabs : raporTabs;
        if (nextTabs.length > 0) setActiveTab(nextTabs[0].value);
    };

    useEffect(() => {
        if (isWaliKelas) {
            setActiveCategory('rapor');
            setActiveTab('input_wali');
        }
    }, [isWaliKelas]);

    useEffect(() => {
        if (!availableTabs.find(tab => tab.value === activeTab) && availableTabs.length > 0) {
            setActiveTab(availableTabs[0].value);
        }
    }, [availableTabs, activeTab]);

    if (!canReadAkademik) {
        return (
            <div className="app-panel rounded-panel p-8 text-center">
                <i className="bi bi-shield-lock text-4xl text-slate-300" />
                <h3 className="mt-4 text-lg font-bold app-text-primary">Akses Modul Akademik Dibatasi</h3>
                <p className="mt-1 text-sm app-text-muted">
                    Hubungi admin untuk memberikan izin `akademik: read` atau `akademik: write`.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <PageHeader
                eyebrow="Pendidikan"
                title="Akademik"
                description="Kelola kurikulum, jurnal mengajar, progres nilai, dan rapor dari workspace akademik yang lebih modern."
                tabs={
                    <div className="space-y-3">
                        <HeaderTabs
                            value={activeCategory}
                            onChange={handleCategoryChange}
                            tabs={[
                                { value: 'kurikulum', label: 'Kurikulum', icon: 'bi-book-half' },
                                { value: 'rapor', label: 'Manajemen Rapor', icon: 'bi-file-earmark-spreadsheet-fill' },
                            ]}
                        />
                        <HeaderTabs
                            value={activeTab}
                            onChange={(next) => setActiveTab(next as typeof activeTab)}
                            tabs={availableTabs}
                        />
                    </div>
                }
            />

            <div className="app-panel rounded-panel p-6">
                <Suspense fallback={<TabLoadingFallback />}>
                    {activeTab === 'jadwal' && <TabJadwalPelajaran />}
                    {activeTab === 'designer' && <TabDesainRapor />}
                    {activeTab === 'generator' && <TabGeneratorFormulir />}
                    {activeTab === 'import' && <TabImportNilai />}
                    {activeTab === 'monitoring' && <TabMonitoringNilai />}
                    {activeTab === 'data' && <TabDataNilai />}
                    {activeTab === 'print' && <TabCetakRapor />}
                    {activeTab === 'input_wali' && <TabInputNilaiWali />}
                    {activeTab === 'jurnal' && <TabJurnalMengajar />}
                </Suspense>
            </div>
        </div>
    );
};

export default Akademik;
