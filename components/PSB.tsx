
import React, { Suspense, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useAppContext } from '../AppContext';
import { Pendaftar, PsbConfig } from '../types';
import { db } from '../db';
import { initialSettings } from '../data/mock';
import { LoadingFallback } from './common/LoadingFallback';
import { PageHeader } from './common/PageHeader';
import { HeaderTabs } from './common/HeaderTabs';
import { getPsbAcademicYearOptions } from './psb/utils/psbUtils';
import { PsbShareLinkModal } from './psb/modals/PsbShareLinkModal';

const PsbDashboard = React.lazy(() => import('./psb/PsbDashboard').then((module) => ({ default: module.PsbDashboard })));
const PsbRekap = React.lazy(() => import('./psb/PsbRekap').then((module) => ({ default: module.PsbRekap })));
const PsbFormBuilder = React.lazy(() => import('./psb/PsbFormBuilder').then((module) => ({ default: module.PsbFormBuilder })));
const PsbPosterMaker = React.lazy(() => import('./psb/PsbPosterMaker').then((module) => ({ default: module.PsbPosterMaker })));

const PSB: React.FC = () => {
    const { settings, onSaveSettings, showToast, currentUser } = useAppContext();
    const [activeTab, setActiveTab] = useState<'dashboard' | 'rekap' | 'form' | 'poster'>('dashboard');
    const [isShareLinkModalOpen, setIsShareLinkModalOpen] = useState(false);
    
    // Reactive live query ensures Firebase Realtime updates from Hub replicate to UI instantly
    const livePendaftarList = useLiveQuery(() => db.pendaftar.toArray(), []);
    const pendaftarList = livePendaftarList || [];

    // Permission Check
    const canWrite = currentUser?.role === 'admin' || currentUser?.permissions?.psb === 'write';

    // Fallback Config (Safe access)
    const psbConfig = settings.psbConfig || initialSettings.psbConfig;
    const { activeYear } = getPsbAcademicYearOptions(settings);
    const currentPsbYear = psbConfig.tahunAjaranAktif || activeYear;

    const fetchPendaftar = () => {
        // useLiveQuery handles reactive updates automatically
    };

    const handleSaveConfig = async (newConfig: PsbConfig) => {
        if (!canWrite) {
            showToast('Anda tidak memiliki akses untuk mengubah konfigurasi.', 'error');
            return;
        }
        const updatedSettings = { ...settings, psbConfig: newConfig };
        await onSaveSettings(updatedSettings);
    };

    const handleImportFromWA = (text: string) => {
        try {
            const match = text.match(/PSB_START([\s\S]*?)PSB_END/);
            if (match && match[1]) {
                const data = JSON.parse(match[1].trim());
                const newPendaftar: Pendaftar = {
                    id: Date.now(),
                    ...data,
                    jenjangId: parseInt(data.jenjangId),
                    tanggalDaftar: data.tanggalDaftar || new Date().toISOString(),
                    status: 'Baru',
                    kewarganegaraan: 'WNI',
                    gelombang: psbConfig.activeGelombang
                };
                db.pendaftar.add(newPendaftar).then(() => {
                    fetchPendaftar();
                    showToast('Data dari WhatsApp berhasil diimpor.', 'success');
                });
            } else {
                showToast('Format pesan tidak valid.', 'error');
            }
        } catch (e) {
            showToast('Gagal memproses data JSON.', 'error');
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader
                eyebrow="PSB"
                title="Penerimaan Santri Baru (PSB)"
                description="Kelola dashboard pendaftar, formulir online, rekap penerimaan, dan materi promosi PSB dalam satu ruang kerja yang konsisten."
                actions={
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setIsShareLinkModalOpen(true)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
                            title="Bagikan Tautan Pendaftaran Online PSB"
                        >
                            <i className="bi bi-link-45deg text-base"></i>
                            <span>Bagikan Link PSB</span>
                        </button>
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-50 border border-teal-200/80 text-teal-800 text-xs font-semibold">
                            <i className="bi bi-calendar-check text-teal-600"></i>
                            <span>TA PSB Aktif: <strong className="font-bold text-teal-950">{currentPsbYear}</strong></span>
                            <span className="text-[10px] text-teal-600/80 font-normal ml-1">(Diatur di Desain Formulir)</span>
                        </div>
                    </div>
                }
                tabs={
                    <HeaderTabs
                        value={activeTab}
                        onChange={setActiveTab}
                        tabs={[
                            { value: 'dashboard', label: 'Dashboard', icon: 'bi-speedometer2' },
                            { value: 'rekap', label: 'Rekap Pendaftar', icon: 'bi-people-fill' },
                            ...(canWrite ? [{ value: 'form' as const, label: 'Desain Formulir', icon: 'bi-ui-checks' }] : []),
                            { value: 'poster', label: 'Poster AI', icon: 'bi-stars' },
                        ]}
                    />
                }
            />
            <Suspense fallback={<LoadingFallback />}>
                {activeTab === 'dashboard' && <PsbDashboard pendaftarList={pendaftarList} config={psbConfig} settings={settings} onSaveConfig={handleSaveConfig} />}
                {activeTab === 'rekap' && <PsbRekap pendaftarList={pendaftarList} settings={settings} onImportFromWA={handleImportFromWA} onUpdateList={fetchPendaftar} canWrite={canWrite} onSaveConfig={handleSaveConfig} />}
                {activeTab === 'form' && canWrite && <PsbFormBuilder config={psbConfig} settings={settings} onSave={handleSaveConfig} />}
                {activeTab === 'poster' && <PsbPosterMaker config={psbConfig} onSave={handleSaveConfig} settings={settings} />}
            </Suspense>

            {isShareLinkModalOpen && (
                <PsbShareLinkModal
                    isOpen={isShareLinkModalOpen}
                    onClose={() => setIsShareLinkModalOpen(false)}
                    settings={settings}
                    config={psbConfig}
                />
            )}
        </div>
    );
};

export default PSB;
