
import React, { Suspense, lazy, useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../AppContext';
import { PageHeader } from './common/PageHeader';
import { HeaderTabs } from './common/HeaderTabs';
import { RaporCloudPullControl } from './akademik/RaporWaCloudImportModal';

const TabDesainRapor = lazy(() => import('./akademik/TabDesainRapor').then((module) => ({ default: module.TabDesainRapor })));
const TabGeneratorFormulir = lazy(() => import('./akademik/TabGeneratorFormulir').then((module) => ({ default: module.TabGeneratorFormulir })));
const TabDataNilai = lazy(() => import('./akademik/TabDataNilai').then((module) => ({ default: module.TabDataNilai })));
const TabCetakRapor = lazy(() => import('./akademik/TabCetakRapor').then((module) => ({ default: module.TabCetakRapor })));
const TabMonitoringNilai = lazy(() => import('./akademik/TabMonitoringNilai').then((module) => ({ default: module.TabMonitoringNilai })));
const TabLegerNilai = lazy(() => import('./akademik/TabLegerNilai').then((module) => ({ default: module.TabLegerNilai })));
const TabJadwalPelajaran = lazy(() => import('./akademik/TabJadwalPelajaran').then((module) => ({ default: module.TabJadwalPelajaran })));
const TabInputNilaiWali = lazy(() => import('./akademik/TabInputNilaiWali').then((module) => ({ default: module.TabInputNilaiWali })));
const TabJurnalMengajar = lazy(() => import('./akademik/TabJurnalMengajar').then((module) => ({ default: module.TabJurnalMengajar })));

const TabLoadingFallback = () => (
    <div className="flex justify-center items-center h-48">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600"></div>
    </div>
);

type AkademikCategory = 'kurikulum' | 'rapor';
type AkademikTabId = 'jadwal' | 'designer' | 'generator' | 'import' | 'monitoring' | 'leger' | 'data' | 'print' | 'input_wali' | 'jurnal';

interface RaporNavigationContext {
    rombelId?: number;
    tahunAjaran?: string;
    semester?: 'Ganjil' | 'Genap';
    templateId?: string;
    generatorMode?: 'ledger' | 'audit_portal';
}

const Akademik: React.FC = () => {
    const { currentUser, showConfirmation } = useAppContext();
    const isWaliKelas = currentUser?.role === 'wali_kelas';
    const isAdmin = currentUser?.role === 'admin';
    const akademikPermission = currentUser?.permissions?.akademik;
    const canReadAkademik = isAdmin || isWaliKelas || akademikPermission === 'read' || akademikPermission === 'write';
    const canWriteAkademik = isAdmin || akademikPermission === 'write';

    const [activeCategory, setActiveCategory] = useState<AkademikCategory>(isWaliKelas ? 'rapor' : 'kurikulum');
    const [activeTab, setActiveTab] = useState<AkademikTabId>(isWaliKelas ? 'input_wali' : 'jadwal');
    const [raporNavContext, setRaporNavContext] = useState<RaporNavigationContext>({});
    const [isDesignerDirty, setIsDesignerDirty] = useState<boolean>(false);

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
                { value: 'generator', label: 'Generate Form', icon: 'bi-file-earmark-code' }
            );
        }

        if (isWaliKelas || isAdmin || canWriteAkademik) {
            tabs.push({ value: 'input_wali', label: 'Input Nilai', icon: 'bi-pencil-square' });
        }

        if (canReadAkademik) {
            tabs.push({ value: 'leger', label: 'Leger Nilai', icon: 'bi-table' });
        }

        if (!isWaliKelas && canReadAkademik) {
            tabs.push({ value: 'data', label: 'Review Data Nilai', icon: 'bi-database' });
        }

        if (canReadAkademik) {
            tabs.push({ value: 'print', label: 'Cetak Rapor', icon: 'bi-printer' });
        }

        return tabs;
    }, [isWaliKelas, isAdmin, canReadAkademik, canWriteAkademik]);

    const availableTabs = activeCategory === 'kurikulum' ? kurikulumTabs : raporTabs;

    const guardDesignerExit = (proceed: () => void) => {
        if (activeTab === 'designer' && isDesignerDirty) {
            showConfirmation(
                'Perubahan Desain Belum Disimpan',
                'Anda memiliki perubahan pada desain template rapor yang belum disimpan. Yakin ingin berpindah tab dan mengabaikan perubahan?',
                () => {
                    setIsDesignerDirty(false);
                    proceed();
                },
                { confirmColor: 'amber', confirmText: 'Ya, Pindah Tab' }
            );
            return;
        }
        proceed();
    };

    const handleCategoryChange = (cat: AkademikCategory) => {
        if (cat === activeCategory) return;
        guardDesignerExit(() => {
            setActiveCategory(cat);
            const nextTabs = cat === 'kurikulum' ? kurikulumTabs : raporTabs;
            if (nextTabs.length > 0) setActiveTab(nextTabs[0].value);
        });
    };

    const handleTabChange = (next: AkademikTabId) => {
        if (next === activeTab) return;
        guardDesignerExit(() => {
            setActiveTab(next);
        });
    };

    const handleNavigateRaporTab = (
        tab: string,
        rombelIdOrPayload?: number | Record<string, any>,
        period?: { tahunAjaran: string; semester: 'Ganjil' | 'Genap' }
    ) => {
        setRaporNavContext(prev => ({
            ...prev,
            ...(typeof rombelIdOrPayload === 'number'
                ? { rombelId: rombelIdOrPayload }
                : rombelIdOrPayload && typeof rombelIdOrPayload === 'object'
                ? rombelIdOrPayload
                : {}),
            ...(period?.tahunAjaran ? { tahunAjaran: period.tahunAjaran } : {}),
            ...(period?.semester ? { semester: period.semester } : {})
        }));
        setActiveCategory('rapor');
        setActiveTab(tab as AkademikTabId);
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
                actions={
                    activeCategory === 'rapor' ? (
                        <RaporCloudPullControl
                            showWaShortcut
                            defaultTahunAjaran={raporNavContext.tahunAjaran}
                            defaultSemester={raporNavContext.semester}
                            defaultRombelId={raporNavContext.rombelId}
                            defaultTemplateId={raporNavContext.templateId}
                        />
                    ) : undefined
                }
                tabs={
                    <div className="space-y-3">
                        <HeaderTabs
                            value={activeCategory}
                            onChange={handleCategoryChange}
                            tabs={[
                                ...(isWaliKelas ? [] : [{ value: 'kurikulum' as AkademikCategory, label: 'Kurikulum', icon: 'bi-book-half' }]),
                                { value: 'rapor' as AkademikCategory, label: 'Manajemen Rapor', icon: 'bi-file-earmark-spreadsheet-fill' },
                            ]}
                        />
                        <HeaderTabs
                            value={activeTab}
                            onChange={(next) => handleTabChange(next as AkademikTabId)}
                            tabs={availableTabs}
                        />
                    </div>
                }
            />

            <div className="app-panel rounded-panel p-3 sm:p-6 min-w-0 overflow-x-hidden">
                <Suspense fallback={<TabLoadingFallback />}>
                    {activeTab === 'jadwal' && <TabJadwalPelajaran />}
                    {activeTab === 'designer' && <TabDesainRapor onDirtyChange={setIsDesignerDirty} />}
                    {activeTab === 'generator' && (
                        <TabGeneratorFormulir
                            initialMode={raporNavContext.generatorMode}
                            initialTahunAjaran={raporNavContext.tahunAjaran}
                            initialSemester={raporNavContext.semester}
                        />
                    )}
                    {activeTab === 'monitoring' && <TabMonitoringNilai onNavigateToTab={handleNavigateRaporTab} />}
                    {activeTab === 'leger' && (
                        <TabLegerNilai
                            initialRombelId={raporNavContext.rombelId}
                            initialTahunAjaran={raporNavContext.tahunAjaran}
                            initialSemester={raporNavContext.semester}
                            onNavigateToInputWali={(rId) => handleNavigateRaporTab('input_wali', rId)}
                        />
                    )}
                    {activeTab === 'data' && <TabDataNilai initialContext={raporNavContext} />}
                    {activeTab === 'print' && (
                        <TabCetakRapor
                            initialContext={raporNavContext}
                            onNavigateToTab={handleNavigateRaporTab}
                        />
                    )}
                    {(activeTab === 'input_wali' || activeTab === 'import') && (
                        <TabInputNilaiWali
                            initialContext={raporNavContext}
                            onContextChange={(ctx) => setRaporNavContext(prev => ({ ...prev, ...ctx }))}
                        />
                    )}
                    {activeTab === 'jurnal' && <TabJurnalMengajar />}
                </Suspense>
            </div>
        </div>
    );
};

export default Akademik;
