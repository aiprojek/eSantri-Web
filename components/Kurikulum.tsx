import React, { Suspense, lazy } from 'react';
import { useAppContext } from '../AppContext';
import { PageHeader } from './common/PageHeader';
import { HeaderTabs } from './common/HeaderTabs';

const TabJadwalPelajaran = lazy(() => import('./akademik/TabJadwalPelajaran').then((module) => ({ default: module.TabJadwalPelajaran })));
const TabJurnalMengajar = lazy(() => import('./akademik/TabJurnalMengajar').then((module) => ({ default: module.TabJurnalMengajar })));
const TabBebanMengajar = lazy(() => import('./akademik/TabBebanMengajar').then((module) => ({ default: module.TabBebanMengajar })));
const MatriksJadwalInduk = lazy(() => import('./akademik/MatriksJadwalInduk').then((module) => ({ default: module.MatriksJadwalInduk })));
const TabKurikulumMapel = lazy(() => import('./akademik/TabKurikulumMapel').then((module) => ({ default: module.TabKurikulumMapel })));
const TabJadwalUjian = lazy(() => import('./akademik/TabJadwalUjian').then((module) => ({ default: module.TabJadwalUjian })));

const TabLoadingFallback = () => (
    <div className="flex h-48 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-teal-600"></div>
    </div>
);

type KurikulumTabId = 'jadwal' | 'matriks' | 'ujian' | 'beban_guru' | 'jurnal' | 'mapel';

const Kurikulum: React.FC = () => {
    const { currentUser } = useAppContext();
    const isWaliKelas = currentUser?.role === 'wali_kelas';
    const isAdmin = currentUser?.role === 'admin';
    const akademikPermission = currentUser?.permissions?.akademik;
    const canReadAkademik = isAdmin || isWaliKelas || akademikPermission === 'read' || akademikPermission === 'write';
    const [activeTab, setActiveTab] = React.useState<KurikulumTabId>('jadwal');

    if (!canReadAkademik) {
        return (
            <div className="app-panel rounded-panel p-8 text-center">
                <i className="bi bi-shield-lock text-4xl text-slate-300" />
                <h3 className="mt-4 text-lg font-bold app-text-primary">Akses Modul Kurikulum Dibatasi</h3>
                <p className="mt-1 text-sm app-text-muted">Hubungi admin untuk memberikan izin `akademik: read` atau `akademik: write`.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <PageHeader
                eyebrow="Pendidikan"
                title="Kurikulum"
                description="Kelola jadwal pelajaran, matriks induk, jadwal ujian, beban mengajar guru, jurnal KBM, dan silabus mata pelajaran dalam satu workspace terpadu."
                tabs={
                    <HeaderTabs
                        value={activeTab}
                        onChange={(next) => setActiveTab(next as KurikulumTabId)}
                        tabs={[
                            { value: 'jadwal', label: 'Jadwal Pelajaran', icon: 'bi-calendar-week' },
                            { value: 'matriks', label: 'Matriks Induk & RPE', icon: 'bi-grid-3x3' },
                            { value: 'ujian', label: 'Jadwal & Generator Ujian', icon: 'bi-file-earmark-ruled' },
                            { value: 'beban_guru', label: 'Beban Mengajar & Slip', icon: 'bi-person-check' },
                            { value: 'jurnal', label: 'Jurnal Mengajar (Log)', icon: 'bi-journal-text' },
                            { value: 'mapel', label: 'Mata Pelajaran & Silabus', icon: 'bi-book' },
                        ]}
                    />
                }
            />
            <div className="app-panel rounded-panel p-6">
                <Suspense fallback={<TabLoadingFallback />}>
                    {activeTab === 'jadwal' && <TabJadwalPelajaran />}
                    {activeTab === 'matriks' && <MatriksJadwalInduk />}
                    {activeTab === 'ujian' && <TabJadwalUjian />}
                    {activeTab === 'beban_guru' && <TabBebanMengajar />}
                    {activeTab === 'jurnal' && <TabJurnalMengajar />}
                    {activeTab === 'mapel' && <TabKurikulumMapel />}
                </Suspense>
            </div>
        </div>
    );
};

export default Kurikulum;

