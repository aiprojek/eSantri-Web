
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
                eyebrow="Informasi & Dokumentasi"
                title="Tentang Aplikasi eSantri Web"
                description="Pelajari fitur, panduan lengkap per modul, FAQ, lisensi, dan catatan rilis aplikasi dari satu pusat informasi."
                actions={
                    <span className="text-xs font-medium text-slate-500">
                        Versi {latestVersion}
                    </span>
                }
                tabs={<HeaderTabs tabs={TENTANG_TABS} value={activeTab} onChange={setActiveTab} />}
            />

            {activeTab === 'tentang' && <TabTentang />}
            {activeTab === 'panduan' && <TabPanduan initialSection={initialSection} />}
            {activeTab === 'faq' && (
                <SectionCard contentClassName="p-5 sm:p-6">
                    <TabFaq />
                </SectionCard>
            )}
            {activeTab === 'rilis' && <TabRilis />}
            {activeTab === 'lisensi' && (
                <SectionCard contentClassName="p-5 sm:p-6">
                    <TabLisensi />
                </SectionCard>
            )}
            {activeTab === 'kontak' && (
                <SectionCard contentClassName="p-5 sm:p-6">
                    <TabKontak />
                </SectionCard>
            )}
            {activeTab === 'layanan' && (
                <SectionCard contentClassName="p-5 sm:p-6">
                    <TabLayanan />
                </SectionCard>
            )}
        </div>
    );
};

export default Tentang;
