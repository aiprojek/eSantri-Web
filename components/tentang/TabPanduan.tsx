import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAppContext } from '../../AppContext';
import { panduanData, PanduanSectionData } from '../../data/panduan';

interface PanduanCategoryGroup {
    id: string;
    title: string;
    icon: string;
    sectionIds: string[];
}

const PANDUAN_CATEGORIES: PanduanCategoryGroup[] = [
    {
        id: 'cat_persiapan',
        title: 'I. Persiapan & Data Master',
        icon: 'bi-rocket-takeoff',
        sectionIds: ['setup', 'datamaster', 'santri', 'cetak_kartu', 'admin'],
    },
    {
        id: 'cat_akademik',
        title: 'II. Akademik & Kepesantrenan',
        icon: 'bi-mortarboard',
        sectionIds: ['kurikulum', 'akademik', 'rapor', 'jurnal_mengajar', 'absensi', 'tahfizh', 'kalender'],
    },
    {
        id: 'cat_layanan',
        title: 'III. Layanan & Keasramaan',
        icon: 'bi-house-heart',
        sectionIds: ['asrama', 'kesehatan', 'bk', 'perpustakaan', 'bukutamu'],
    },
    {
        id: 'cat_keuangan',
        title: 'IV. Keuangan & Unit Usaha',
        icon: 'bi-wallet2',
        sectionIds: ['finance', 'bukukas', 'koperasi', 'sarpras'],
    },
    {
        id: 'cat_komunikasi',
        title: 'V. Persuratan & Komunikasi',
        icon: 'bi-envelope-paper',
        sectionIds: ['surat', 'whatsapp', 'portal', 'laporan_lanjutan'],
    },
    {
        id: 'cat_sistem',
        title: 'VI. Cloud Sync, Audit & Sistem',
        icon: 'bi-hdd-network',
        sectionIds: ['cloud', 'firebase', 'pusat_sync', 'auditlog', 'pengaturan', 'offline', 'maintenance', 'fitur'],
    },
];

const ALL_ORDERED_IDS = PANDUAN_CATEGORIES.flatMap((c) => c.sectionIds);

const PanduanLangkah: React.FC<{
    id: string;
    number: number;
    title: string;
    children: React.ReactNode;
    isLast?: boolean;
    color?: string;
}> = ({ id, number, title, children, isLast = false, color = 'teal' }) => {
    const colorClasses: Record<string, string> = {
        teal: 'border-teal-500 bg-teal-50 text-teal-700',
        blue: 'border-blue-500 bg-blue-50 text-blue-700',
        orange: 'border-orange-500 bg-orange-50 text-orange-700',
        purple: 'border-purple-500 bg-purple-50 text-purple-700',
        red: 'border-red-500 bg-red-50 text-red-700',
        green: 'border-green-500 bg-green-50 text-green-700',
        indigo: 'border-indigo-500 bg-indigo-50 text-indigo-700',
        gray: 'border-gray-500 bg-gray-50 text-gray-700',
        black: 'border-gray-800 bg-gray-100 text-gray-800',
        yellow: 'border-yellow-500 bg-yellow-50 text-yellow-700',
        cyan: 'border-cyan-500 bg-cyan-50 text-cyan-700',
    };

    const lineColors: Record<string, string> = {
        teal: 'bg-teal-200',
        blue: 'bg-blue-200',
        orange: 'bg-orange-200',
        purple: 'bg-purple-200',
        red: 'bg-red-200',
        green: 'bg-green-200',
        indigo: 'bg-indigo-200',
        gray: 'bg-gray-200',
        black: 'bg-gray-300',
        yellow: 'bg-yellow-200',
        cyan: 'bg-cyan-200',
    };

    const activeClass = colorClasses[color] || colorClasses.teal;
    const activeLine = lineColors[color] || lineColors.teal;

    return (
        <div id={id} className="flex items-start group scroll-mt-32">
            <div className="flex flex-col items-center mr-4 h-full min-h-[80px]">
                <div
                    className={`flex items-center justify-center w-8 h-8 md:w-10 md:h-10 border-2 rounded-full font-bold text-sm md:text-base flex-shrink-0 transition-transform group-hover:scale-105 tabular-nums ${activeClass}`}
                >
                    {number}
                </div>
                {!isLast && <div className={`w-0.5 h-full ${activeLine} my-1.5`}></div>}
            </div>
            <div className="pb-8 w-full text-left min-w-0">
                <h3 className="mb-2.5 text-base md:text-lg font-bold text-slate-800 flex items-center leading-snug">
                    {title}
                </h3>
                <div className="text-slate-600 space-y-3 text-sm leading-relaxed">{children}</div>
            </div>
        </div>
    );
};

export const TabPanduan: React.FC<{ initialSection?: string | null }> = ({ initialSection }) => {
    const { showConfirmation, onDeleteSampleData, showToast, isSampleDataDetected } = useAppContext();
    const [searchQuery, setSearchQuery] = useState('');
    const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
    const [showBackToTop, setShowBackToTop] = useState(false);
    const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
    const contentTopRef = useRef<HTMLDivElement>(null);

    // Deduplicate and order sections cleanly
    const orderedPanduanData = useMemo<PanduanSectionData[]>(() => {
        const uniqueMap = new Map<string, PanduanSectionData>();
        for (const item of panduanData) {
            if (!uniqueMap.has(item.id)) {
                uniqueMap.set(item.id, item);
            }
        }
        const ordered: PanduanSectionData[] = [];
        for (const id of ALL_ORDERED_IDS) {
            const found = uniqueMap.get(id);
            if (found) {
                ordered.push(found);
                uniqueMap.delete(id);
            }
        }
        for (const remaining of uniqueMap.values()) {
            ordered.push(remaining);
        }
        return ordered;
    }, []);

    // Map section ID -> 1-based sequential chapter number ("01", "02", ...)
    const sectionOrderNumberMap = useMemo(() => {
        const map: Record<string, string> = {};
        orderedPanduanData.forEach((sec, idx) => {
            map[sec.id] = String(idx + 1).padStart(2, '0');
        });
        return map;
    }, [orderedPanduanData]);

    const [activeSectionId, setActiveSectionId] = useState<string>(orderedPanduanData[0]?.id || 'setup');

    useEffect(() => {
        if (initialSection && orderedPanduanData.some((s) => s.id === initialSection)) {
            setActiveSectionId(initialSection);
        }
    }, [initialSection, orderedPanduanData]);

    // Track window scroll for FAB Back to Top button
    useEffect(() => {
        const handleScroll = () => {
            setShowBackToTop(window.scrollY > 350);
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll();
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Ensure the category containing activeSectionId is expanded
    useEffect(() => {
        const parentCat = PANDUAN_CATEGORIES.find((cat) => cat.sectionIds.includes(activeSectionId));
        if (parentCat && collapsedCategories[parentCat.id]) {
            setCollapsedCategories((prev) => ({ ...prev, [parentCat.id]: false }));
        }
    }, [activeSectionId]);

    const scrollToGuideTop = () => {
        if (contentTopRef.current) {
            const rect = contentTopRef.current.getBoundingClientRect();
            const absoluteTop = window.scrollY + rect.top - 92;
            window.scrollTo({ top: Math.max(0, absoluteTop), behavior: 'smooth' });
        } else {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handleSelectSection = (id: string) => {
        setActiveSectionId(id);
        setIsMobileDrawerOpen(false);
        setTimeout(() => {
            scrollToGuideTop();
        }, 30);
    };

    const handleJumpToStep = (stepIndex: number) => {
        const el = document.getElementById(`panduan-step-${stepIndex + 1}`);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    const handleScrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const toggleCategory = (catId: string) => {
        setCollapsedCategories((prev) => ({ ...prev, [catId]: !prev[catId] }));
    };

    const handleDeleteSampleData = () => {
        showConfirmation(
            'Hapus Semua Data Sampel?',
            'PERHATIAN: Tindakan ini akan MENGHAPUS SEMUA data santri simulasi, keuangan contoh, dan kas contoh yang ada saat ini. Data pengaturan lembaga tetap tersimpan.',
            async () => {
                try {
                    await onDeleteSampleData();
                    localStorage.setItem('eSantriSampleDataDeleted', 'true');
                    showToast('Data sampel berhasil dihapus.', 'success');
                } catch (error) {
                    showToast('Gagal menghapus data sampel.', 'error');
                }
            },
            { confirmText: 'Ya, Hapus Data Sampel', confirmColor: 'red' }
        );
    };

    const getColorClass = (color: string) => {
        const map: Record<string, string> = {
            purple: 'bg-purple-600',
            gray: 'bg-slate-800',
            teal: 'bg-teal-600',
            indigo: 'bg-indigo-600',
            blue: 'bg-blue-600',
            orange: 'bg-orange-500',
            green: 'bg-emerald-600',
            red: 'bg-rose-600',
            yellow: 'bg-amber-500',
            cyan: 'bg-cyan-600',
        };
        return map[color] || 'bg-teal-600';
    };

    // Filtered categories & sections based on searchQuery
    const categorizedSections = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        return PANDUAN_CATEGORIES.map((cat) => {
            const sections = cat.sectionIds
                .map((id) => orderedPanduanData.find((s) => s.id === id))
                .filter((s): s is PanduanSectionData => Boolean(s))
                .filter((sec) => {
                    if (!q) return true;
                    const titleMatch = sec.title.toLowerCase().includes(q);
                    const stepMatch = sec.steps.some((st) => st.title.toLowerCase().includes(q));
                    return titleMatch || stepMatch;
                });
            return {
                ...cat,
                sections,
            };
        }).filter((cat) => cat.sections.length > 0);
    }, [orderedPanduanData, searchQuery]);

    const activeSectionIndex = useMemo(
        () => orderedPanduanData.findIndex((s) => s.id === activeSectionId),
        [orderedPanduanData, activeSectionId]
    );
    const activeSection = orderedPanduanData[activeSectionIndex] || orderedPanduanData[0];
    const prevSection = activeSectionIndex > 0 ? orderedPanduanData[activeSectionIndex - 1] : null;
    const nextSection =
        activeSectionIndex >= 0 && activeSectionIndex < orderedPanduanData.length - 1
            ? orderedPanduanData[activeSectionIndex + 1]
            : null;
    const activeCategory = PANDUAN_CATEGORIES.find((c) => c.sectionIds.includes(activeSection?.id || ''));

    if (!activeSection) {
        return null;
    }

    const renderTocList = (isMobile = false) => (
        <div className="divide-y divide-slate-100">
            {categorizedSections.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">
                    <i className="bi bi-search text-2xl text-slate-300 block mb-2"></i>
                    Tidak ada topik panduan yang cocok dengan <strong>&quot;{searchQuery}&quot;</strong>.
                </div>
            ) : (
                categorizedSections.map((cat) => {
                    const isCollapsed = !searchQuery.trim() && Boolean(collapsedCategories[cat.id]);
                    return (
                        <div key={cat.id} className="py-1.5">
                            <button
                                type="button"
                                onClick={() => toggleCategory(cat.id)}
                                className="w-full px-3.5 py-2 flex items-center justify-between text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-800 transition-colors"
                            >
                                <span className="flex items-center gap-2 truncate">
                                    <i className={`bi ${cat.icon} text-teal-600`}></i>
                                    <span className="truncate">{cat.title}</span>
                                </span>
                                <i
                                    className={`bi bi-chevron-${isCollapsed ? 'down' : 'up'} text-[10px] text-slate-400`}
                                ></i>
                            </button>

                            {!isCollapsed && (
                                <ul className="mt-0.5 space-y-0.5 px-2">
                                    {cat.sections.map((section) => {
                                        const isActive = activeSectionId === section.id;
                                        const chapNum = sectionOrderNumberMap[section.id] || '•';
                                        return (
                                            <li key={section.id}>
                                                <button
                                                    type="button"
                                                    onClick={() => handleSelectSection(section.id)}
                                                    className={`w-full text-left px-2.5 py-2 rounded-xl text-xs transition-all flex items-start gap-2.5 group ${
                                                        isActive
                                                            ? 'bg-teal-600 text-white font-semibold shadow-2xs'
                                                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                                    }`}
                                                >
                                                    <span
                                                        className={`font-mono text-[11px] tabular-nums px-1.5 py-0.5 rounded-md shrink-0 mt-0.5 ${
                                                            isActive
                                                                ? 'bg-white/20 text-white font-bold'
                                                                : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'
                                                        }`}
                                                    >
                                                        {chapNum}
                                                    </span>
                                                    <span className="leading-snug flex-1">{section.title}</span>
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>
                    );
                })
            )}
        </div>
    );

    return (
        <div className="text-left relative" ref={contentTopRef}>
            {/* --- SAMPLE DATA WARNING (Synced with AppContext) --- */}
            {isSampleDataDetected && (
                <div className="p-4 mb-6 rounded-2xl border border-amber-200 bg-amber-50 text-amber-950 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                            <i className="bi bi-exclamation-triangle-fill text-lg"></i>
                        </div>
                        <div>
                            <h4 className="font-bold text-sm">Data Simulasi / Sampel Masih Aktif</h4>
                            <p className="mt-0.5 text-xs text-amber-800">
                                Aplikasi ini sedang memuat data dummy untuk demonstrasi. Bersihkan data sampel sebelum mulai menginput data asli pesantren Anda.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleDeleteSampleData}
                        className="px-4 py-2 text-xs font-bold text-white bg-amber-600 rounded-xl hover:bg-amber-700 whitespace-nowrap shadow-2xs transition-colors"
                    >
                        <i className="bi bi-trash3 mr-1.5"></i>
                        Bersihkan Data Sampel
                    </button>
                </div>
            )}

            {/* --- MOBILE & TABLET STICKY BAR (< lg) --- */}
            <div className="block lg:hidden sticky top-[70px] z-20 mb-4 -mx-1 px-1">
                <div className="bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl p-2.5 shadow-md flex items-center justify-between gap-2">
                    <button
                        type="button"
                        onClick={() => setIsMobileDrawerOpen(true)}
                        className="flex items-center gap-2.5 min-w-0 flex-1 text-left px-2 py-1 rounded-xl hover:bg-slate-50"
                    >
                        <span className="w-8 h-8 rounded-xl bg-teal-600 text-white font-mono font-bold text-xs flex items-center justify-center shrink-0 tabular-nums">
                            {sectionOrderNumberMap[activeSection.id]}
                        </span>
                        <div className="min-w-0 flex-1">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-teal-700 truncate">
                                {activeCategory?.title || 'Panduan Penggunaan'}
                            </div>
                            <div className="text-xs font-bold text-slate-800 truncate">{activeSection.title}</div>
                        </div>
                    </button>

                    <button
                        type="button"
                        onClick={() => setIsMobileDrawerOpen(true)}
                        className="px-3 py-2 rounded-xl bg-teal-50 text-teal-800 border border-teal-200 text-xs font-bold flex items-center gap-1.5 shrink-0 hover:bg-teal-100 transition-colors"
                    >
                        <i className="bi bi-list-ul text-sm"></i>
                        <span>Daftar Isi ({orderedPanduanData.length})</span>
                    </button>
                </div>
            </div>

            {/* --- MOBILE & TABLET TOC DRAWER MODAL --- */}
            {isMobileDrawerOpen && (
                <div
                    className="fixed inset-0 z-[95] bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 lg:hidden"
                    onClick={() => setIsMobileDrawerOpen(false)}
                >
                    <div
                        className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200 animate-fade-in"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                            <div>
                                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                    <i className="bi bi-book-half text-teal-600"></i>
                                    Daftar Isi Panduan ({orderedPanduanData.length} Bab)
                                </h3>
                                <p className="text-[11px] text-slate-500">Pilih bab panduan untuk langsung melompat ke materi</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsMobileDrawerOpen(false)}
                                className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100"
                            >
                                <i className="bi bi-x-lg text-xs"></i>
                            </button>
                        </div>

                        <div className="p-3 border-b border-slate-200 bg-white">
                            <div className="relative">
                                <i className="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Cari topik atau langkah panduan..."
                                    className="w-full pl-8 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
                                />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    >
                                        <i className="bi bi-x-circle-fill text-xs"></i>
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="overflow-y-auto flex-1 py-2 custom-scrollbar">{renderTocList(true)}</div>
                    </div>
                </div>
            )}

            <div className="flex flex-col lg:flex-row gap-6 items-start">
                {/* --- DESKTOP STICKY TABLE OF CONTENTS (lg+) --- */}
                <aside className="hidden lg:flex lg:flex-col w-72 xl:w-80 lg:sticky lg:top-24 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden shrink-0 max-h-[calc(100vh-7.5rem)]">
                    <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                        <span className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
                            <i className="bi bi-journal-bookmark-fill text-teal-600"></i>
                            Daftar Isi Panduan
                        </span>
                        <span className="text-[11px] font-mono font-semibold text-slate-500 tabular-nums">
                            {orderedPanduanData.length} Bab
                        </span>
                    </div>

                    {/* Search Input in Sidebar */}
                    <div className="p-2.5 border-b border-slate-200 bg-white">
                        <div className="relative">
                            <i className="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Cari bab atau topik..."
                                className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-colors"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    <i className="bi bi-x-circle-fill text-xs"></i>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Scrollable Categorized List */}
                    <div className="overflow-y-auto flex-1 py-1.5 custom-scrollbar">{renderTocList(false)}</div>
                </aside>

                {/* --- ACTIVE CHAPTER CONTENT --- */}
                <div className="flex-1 w-full min-w-0 animate-fade-in">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                        {/* Section Header */}
                        <div className="p-5 sm:p-6 bg-slate-50/80 border-b border-slate-200">
                            <div className="flex items-start gap-4">
                                <span
                                    className={`${getColorClass(
                                        activeSection.badgeColor
                                    )} text-white w-12 h-12 rounded-2xl flex items-center justify-center font-mono font-bold text-lg shadow-sm shrink-0 tabular-nums`}
                                >
                                    {sectionOrderNumberMap[activeSection.id]}
                                </span>
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mb-1">
                                        <span>{activeCategory?.title || 'Dokumentasi Modul'}</span>
                                        <span aria-hidden="true">·</span>
                                        <span>{activeSection.steps.length} Langkah Pembahasan</span>
                                    </div>
                                    <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight leading-snug">
                                        {activeSection.title}
                                    </h2>
                                </div>
                            </div>

                            {/* Quick Step Jump Bar (when chapter has >= 3 steps) */}
                            {activeSection.steps.length >= 3 && (
                                <div className="mt-4 pt-3.5 border-t border-slate-200/80">
                                    <div className="text-[11px] font-semibold text-slate-500 mb-2 flex items-center gap-1.5">
                                        <i className="bi bi-signpost-split text-teal-600"></i>
                                        <span>Loncat Cepat ke Langkah:</span>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {activeSection.steps.map((step, idx) => (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => handleJumpToStep(idx)}
                                                className="px-2.5 py-1 rounded-lg bg-white hover:bg-teal-50 text-slate-700 hover:text-teal-800 border border-slate-200 hover:border-teal-300 text-xs font-medium transition-colors flex items-center gap-1.5 max-w-[240px]"
                                                title={step.title}
                                            >
                                                <span className="font-mono font-bold text-teal-600 tabular-nums">
                                                    #{idx + 1}
                                                </span>
                                                <span className="truncate">
                                                    {step.title.replace(/^\d+\.\s*/, '')}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Section Body */}
                        <div className="p-5 sm:p-8">
                            {activeSection.id === 'whatsapp' && (
                                <div className="bg-emerald-50 p-4 rounded-xl mb-8 text-sm text-emerald-950 border border-emerald-200 flex items-start gap-3">
                                    <i className="bi bi-shield-check text-xl text-emerald-600 shrink-0"></i>
                                    <div>
                                        <strong className="block mb-1">KEAMANAN NOMOR WHATSAPP:</strong>
                                        Kami menggunakan metode <strong>Redirect Resmi</strong>. Aplikasi tidak meminta scan QR (pairing) pihak ketiga yang berisiko pencurian sesi atau blokir spam. Nomor Anda tetap aman karena pesan dikirim melalui kendali WhatsApp Web/Desktop Anda sendiri.
                                    </div>
                                </div>
                            )}

                            {/* Steps Timeline */}
                            <div className="space-y-2">
                                {activeSection.steps.map((step, idx) => (
                                    <PanduanLangkah
                                        key={idx}
                                        id={`panduan-step-${idx + 1}`}
                                        number={idx + 1}
                                        title={step.title}
                                        color={step.color || activeSection.badgeColor}
                                        isLast={idx === activeSection.steps.length - 1}
                                    >
                                        {step.content}
                                    </PanduanLangkah>
                                ))}
                            </div>

                            {/* Prev / Next Chapter Navigation Footer */}
                            <div className="mt-8 pt-6 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {prevSection ? (
                                    <button
                                        type="button"
                                        onClick={() => handleSelectSection(prevSection.id)}
                                        className="p-4 rounded-xl border border-slate-200 hover:border-teal-300 hover:bg-teal-50/40 text-left transition-all group flex items-center gap-3"
                                    >
                                        <div className="w-9 h-9 rounded-xl bg-slate-100 group-hover:bg-teal-100 text-slate-600 group-hover:text-teal-700 flex items-center justify-center shrink-0 transition-colors">
                                            <i className="bi bi-arrow-left"></i>
                                        </div>
                                        <div className="min-w-0">
                                            <div className="text-[11px] font-semibold text-slate-400">
                                                Bab Sebelumnya ({sectionOrderNumberMap[prevSection.id]})
                                            </div>
                                            <div className="text-xs font-bold text-slate-800 group-hover:text-teal-800 truncate">
                                                {prevSection.title}
                                            </div>
                                        </div>
                                    </button>
                                ) : (
                                    <div />
                                )}

                                {nextSection ? (
                                    <button
                                        type="button"
                                        onClick={() => handleSelectSection(nextSection.id)}
                                        className="p-4 rounded-xl border border-slate-200 hover:border-teal-300 hover:bg-teal-50/40 text-right transition-all group flex items-center justify-end gap-3"
                                    >
                                        <div className="min-w-0">
                                            <div className="text-[11px] font-semibold text-slate-400">
                                                Bab Selanjutnya ({sectionOrderNumberMap[nextSection.id]})
                                            </div>
                                            <div className="text-xs font-bold text-slate-800 group-hover:text-teal-800 truncate">
                                                {nextSection.title}
                                            </div>
                                        </div>
                                        <div className="w-9 h-9 rounded-xl bg-slate-100 group-hover:bg-teal-100 text-slate-600 group-hover:text-teal-700 flex items-center justify-center shrink-0 transition-colors">
                                            <i className="bi bi-arrow-right"></i>
                                        </div>
                                    </button>
                                ) : (
                                    <div />
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- FLOATING ACTION BUTTON (FAB) BACK TO TOP --- */}
            {showBackToTop && (
                <button
                    type="button"
                    onClick={handleScrollToTop}
                    className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-teal-700 hover:bg-teal-800 text-white px-4 py-3 text-xs font-bold shadow-lg transition-all hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-teal-500 no-print"
                    aria-label="Kembali ke atas"
                    title="Kembali ke atas halaman"
                >
                    <i className="bi bi-arrow-up text-sm"></i>
                    <span className="hidden sm:inline">Ke Atas</span>
                </button>
            )}
        </div>
    );
};
