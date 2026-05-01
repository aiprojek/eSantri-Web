
import React, { useState } from 'react';
import { TabTentang } from './tentang/TabTentang';
import { TabPanduan } from './tentang/TabPanduan';
import { TabRilis, latestVersion, latestUpdateDate } from './tentang/TabRilis';
import { TabLisensi } from './tentang/TabLisensi';
import { TabKontak } from './tentang/TabKontak';
import { TabFaq } from './tentang/TabFaq';
import { TabLayanan } from './tentang/TabLayanan';
import { HeaderTabs, HeaderTabItem } from './common/HeaderTabs';
import { PageHeader } from './common/PageHeader';
import { SectionCard } from './common/SectionCard';

type TentangTab = 'tentang' | 'panduan' | 'faq' | 'rilis' | 'kontak' | 'lisensi' | 'layanan';

const TENTANG_TABS: HeaderTabItem<TentangTab>[] = [
    { value: 'tentang', label: 'Tentang Aplikasi', icon: 'bi-info-circle' },
    { value: 'panduan', label: 'Panduan Pengguna', icon: 'bi-book-half' },
    { value: 'faq', label: 'FAQ / Tanya Jawab', icon: 'bi-question-circle' },
    { value: 'rilis', label: 'Catatan Rilis', icon: 'bi-clock-history' },
    { value: 'lisensi', label: 'Lisensi', icon: 'bi-file-earmark-text' },
    { value: 'kontak', label: 'Kontak', icon: 'bi-envelope' },
    { value: 'layanan', label: 'Layanan Premium', icon: 'bi-stars' },
];

const Tentang: React.FC<{ 
    initialTab?: TentangTab;
    initialSection?: string | null;
}> = ({ initialTab = 'tentang', initialSection }) => {
    const [activeTab, setActiveTab] = useState<TentangTab>(initialTab);

    // Update active tab if initialTab changes (e.g. from global event)
    React.useEffect(() => {
        setActiveTab(initialTab);
    }, [initialTab]);

    return (
        <div className="space-y-6">
            <PageHeader
                eyebrow="Informasi"
                title="Tentang Aplikasi eSantri Web"
                description="Pelajari fitur, panduan, layanan, lisensi, dan catatan rilis aplikasi dari satu pusat informasi yang lebih rapi."
                actions={
                    <span className="app-chip">
                        <i className="bi bi-rocket-takeoff"></i>
                        Versi Terbaru: {latestVersion}
                    </span>
                }
                tabs={<HeaderTabs tabs={TENTANG_TABS} value={activeTab} onChange={setActiveTab} />}
            />

            <SectionCard
                title="Pusat Informasi eSantri"
                description="Pilih tab untuk membuka profil aplikasi, panduan pengguna, FAQ, layanan premium, lisensi, dan catatan rilis."
                contentClassName="p-4 sm:p-5"
            >
                <div>
                    {activeTab === 'tentang' && <TabTentang />}
                    {activeTab === 'layanan' && <TabLayanan />}
                    {activeTab === 'panduan' && <TabPanduan initialSection={initialSection} />}
                    {activeTab === 'faq' && <TabFaq />}
                    {activeTab === 'rilis' && <TabRilis />}
                    {activeTab === 'lisensi' && <TabLisensi />}
                    {activeTab === 'kontak' && <TabKontak />}
                </div>
            </SectionCard>
        </div>
    );
};

export default Tentang;
