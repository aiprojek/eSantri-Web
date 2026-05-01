
import React, { useState, useMemo } from 'react';
import { FEATURE_DATA, FeatureCategory, FeatureItemData } from '../../data/features';
import { SectionCard } from '../common/SectionCard';
import { EmptyState } from '../common/EmptyState';

const FeatureCard: React.FC<{ item: FeatureItemData }> = ({ item }) => (
    <div className="app-panel flex h-full items-start gap-3 rounded-[22px] p-4 transition-all hover:-translate-y-0.5 hover:border-teal-200">
        <div className="app-panel-soft flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl text-teal-600">
            <i className={`bi ${item.icon} text-lg`}></i>
        </div>
        <div>
            <h4 className="mb-1 text-sm font-semibold leading-tight text-app-text">{item.title}</h4>
            <p className="text-xs leading-relaxed app-text-muted">{item.desc}</p>
        </div>
    </div>
);

export const TabTentang: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredGroups = useMemo(() => {
        if (!searchTerm) return FEATURE_DATA;

        const lowerSearch = searchTerm.toLowerCase();
        return FEATURE_DATA.map(group => {
            // Filter items inside the group
            const filteredItems = group.items.filter(item => 
                item.title.toLowerCase().includes(lowerSearch) || 
                item.desc.toLowerCase().includes(lowerSearch)
            );
            
            // Return group only if it has matching items (or if group title matches)
            if (filteredItems.length > 0) {
                return { ...group, items: filteredItems };
            }
            return null;
        }).filter(group => group !== null) as FeatureCategory[];
    }, [searchTerm]);

    return (
        <div className="space-y-8">
            <SectionCard className="overflow-hidden" contentClassName="relative p-6 text-center sm:p-8">
                <div className="absolute top-0 right-0 w-32 h-32 bg-teal-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 -translate-y-1/2 translate-x-1/2"></div>
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 translate-y-1/2 -translate-x-1/2"></div>
                
                <div className="relative z-10">
                    <img src="/icon.svg" alt="Logo eSantri Web" className="mx-auto mb-3 h-16 w-16 rounded-xl shadow-sm" />
                    <h2 className="text-2xl font-bold text-teal-800">eSantri Web</h2>
                    <p className="mt-2 text-base text-teal-700 max-w-xl mx-auto">
                        Sistem Manajemen Pondok Pesantren Modern & Gratis. <br/>
                        Aman, Cepat, Offline-First & Cloud Sync.
                    </p>
                </div>
            </SectionCard>

            <SectionCard
                title="Fitur Unggulan"
                description="Cari dan telusuri kemampuan utama eSantri berdasarkan modul yang paling relevan dengan operasional pondok."
                className="bg-transparent"
                contentClassName="p-5"
                actions={
                    <div className="relative w-full md:w-64">
                        <input
                            type="text"
                            placeholder="Cari fitur..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="app-input w-full pl-10 pr-4 text-sm"
                        />
                        <i className="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
                    </div>
                }
            >
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <h3 className="flex items-center gap-3 text-xl font-semibold text-app-text">
                        <i className="bi bi-stars text-teal-600"></i>
                        <span>Fitur Unggulan</span>
                    </h3>
                </div>

                <div className="space-y-6">
                    {filteredGroups.map(group => (
                        <div key={group.id} className="animate-fade-in">
                            <h4 className={`text-base font-bold mb-3 flex items-center gap-2 ${group.color} border-b pb-2`}>
                                <i className={`bi ${group.icon}`}></i> {group.title}
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {group.items.map((item, idx) => (
                                    <FeatureCard key={idx} item={item} />
                                ))}
                            </div>
                        </div>
                    ))}
                    
                    {filteredGroups.length === 0 && (
                        <EmptyState icon="bi-search" title="Fitur tidak ditemukan" description={`Tidak ada fitur yang cocok dengan pencarian "${searchTerm}".`} />
                    )}
                </div>
            </SectionCard>
            
            <SectionCard title="Dukung & Jelajahi Proyek" description="Bantu pengembangan eSantri atau lihat repositori dan kanal diskusi resminya." contentClassName="p-6">
                <div className="flex flex-col sm:flex-row justify-center items-center gap-3">
                    <a href="https://lynk.id/aiprojek/s/bvBJvdA" target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto app-button-primary px-4 py-2 text-sm" >
                        <i className="bi bi-cup-hot-fill"></i>
                        <span>Traktir Kopi</span>
                    </a>
                    <a href="https://github.com/aiprojek/eSantri-Web" target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto app-button-secondary px-4 py-2 text-sm">
                        <i className="bi bi-github"></i>
                        <span>GitHub</span>
                    </a>
                    <a href="https://t.me/aiprojek_community/32" target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto app-button-secondary px-4 py-2 text-sm">
                        <i className="bi bi-telegram"></i>
                        <span>Diskusi</span>
                    </a>
                </div>
                <div className="mt-8 space-y-2 border-t border-app-border pt-6 text-center text-sm app-text-secondary">
                    <p>
                        <strong>Pengembang:</strong> <a href="https://aiprojek01.my.id" target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline">AI Projek</a>. <strong>Lisensi:</strong> <a href="https://www.gnu.org/licenses/gpl-3.0.html" target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline">GNU GPL v3</a>
                    </p>
                </div>
            </SectionCard>
        </div>
    );
};
