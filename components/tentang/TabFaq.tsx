
import React, { useState, useMemo } from 'react';
import { faqData, FaqItemData } from '../../data/faq';

const FaqItem: React.FC<{ item: FaqItemData; isOpen: boolean; toggle: () => void; highlight?: string }> = ({ item, isOpen, toggle, highlight }) => {
    
    // Helper untuk highlight teks pencarian
    const getHighlightedText = (text: string, highlight: string) => {
        if (!highlight.trim()) return text;
        const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
        return parts.map((part, index) => 
            part.toLowerCase() === highlight.toLowerCase() ? <span key={index} className="bg-yellow-200 font-bold">{part}</span> : part
        );
    };

    return (
        <div className={`border rounded-lg bg-white overflow-hidden transition-all duration-300 ${isOpen ? 'border-teal-500 shadow-md ring-1 ring-teal-500/20' : 'border-gray-200 hover:border-teal-300'}`}>
            <button
                onClick={toggle}
                className="w-full flex justify-between items-start p-4 text-left focus:outline-none bg-white"
            >
                <div className="flex gap-3">
                    <div className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${isOpen ? 'bg-teal-100 text-teal-600' : 'bg-gray-100 text-gray-400'}`}>
                        <i className={`bi ${isOpen ? 'bi-dash' : 'bi-plus'} text-lg`}></i>
                    </div>
                    <span className={`font-semibold text-sm md:text-base ${isOpen ? 'text-teal-900' : 'text-gray-700'}`}>
                        {getHighlightedText(item.question, highlight || '')}
                    </span>
                </div>
            </button>
            <div 
                className={`transition-all duration-300 ease-in-out overflow-hidden ${isOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}
            >
                <div className="p-4 pt-0 pl-[3.25rem] text-sm text-gray-600 leading-relaxed">
                    {item.answer}
                </div>
            </div>
        </div>
    );
};

export const TabFaq: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeCategory, setActiveCategory] = useState<string>('Umum & Keamanan Akun'); // Default category
    const [openItems, setOpenItems] = useState<Record<string, boolean>>({});

    const toggleItem = (question: string) => {
        setOpenItems(prev => ({ ...prev, [question]: !prev[question] }));
    };

    // Filter Logic
    const displayData = useMemo(() => {
        if (!searchTerm) {
            // Jika tidak mencari, tampilkan hanya kategori yang dipilih
            const category = faqData.find(c => c.title === activeCategory);
            return category ? [category] : [];
        }

        // Jika mencari, cari di SEMUA kategori dan filter isinya
        const lowerSearch = searchTerm.toLowerCase();
        return faqData.map(cat => ({
            ...cat,
            items: cat.items.filter(item => 
                item.question.toLowerCase().includes(lowerSearch) || 
                (typeof item.answer === 'string' && item.answer.toLowerCase().includes(lowerSearch))
            )
        })).filter(cat => cat.items.length > 0);
    }, [searchTerm, activeCategory]);

    return (
        <div className="min-h-[500px]">
            {/* Header & Search */}
            <div className="mb-8 text-center max-w-2xl mx-auto">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Pusat Bantuan & Pertanyaan</h2>
                <p className="text-gray-600 text-sm mb-6">Temukan jawaban cepat untuk pertanyaan umum seputar penggunaan aplikasi.</p>
                
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Ketik pertanyaan... (misal: 'Lupa Password', 'Import Excel')"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-full shadow-sm focus:ring-4 focus:ring-teal-100 focus:border-teal-500 transition-all text-sm"
                    />
                    <div className="absolute left-4 top-3 text-gray-400">
                        <i className="bi bi-search text-lg"></i>
                    </div>
                    {searchTerm && (
                        <button 
                            onClick={() => setSearchTerm('')}
                            className="absolute right-4 top-3 text-gray-400 hover:text-gray-600"
                        >
                            <i className="bi bi-x-circle-fill"></i>
                        </button>
                    )}
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Left: Category Navigation (Hidden when searching to allow full list) */}
                {!searchTerm && (
                    <div className="w-full lg:w-64 flex-shrink-0">
                        <div className="lg:sticky lg:top-4 bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                            <div className="p-3 bg-gray-50 border-b border-gray-200 font-bold text-gray-700 text-xs uppercase tracking-wide">
                                Kategori Topik
                            </div>
                            <div className="p-2 flex flex-row lg:flex-col overflow-x-auto lg:overflow-visible gap-1 custom-scrollbar">
                                {faqData.map((cat) => (
                                    <button
                                        key={cat.title}
                                        onClick={() => setActiveCategory(cat.title)}
                                        className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all whitespace-nowrap lg:whitespace-normal text-left ${activeCategory === cat.title ? `bg-teal-50 text-teal-700 font-semibold ring-1 ring-teal-200` : 'text-gray-600 hover:bg-gray-50'}`}
                                    >
                                        <i className={`bi ${cat.icon} ${activeCategory === cat.title ? 'text-teal-600' : 'text-gray-400'}`}></i>
                                        <span>{cat.title}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Right: Content List */}
                <div className="flex-1 space-y-8">
                    {displayData.length > 0 ? (
                        displayData.map((category) => (
                            <div key={category.title} className="animate-fade-in">
                                {/* Only show category title if searching (context needed) */}
                                {searchTerm && (
                                    <div className="flex items-center gap-2 mb-3 pb-2 border-b">
                                        <span className={`p-1.5 rounded-md ${category.colorClass.split(' ')[0]} ${category.colorClass.split(' ')[2]}`}>
                                            <i className={`bi ${category.icon}`}></i>
                                        </span>
                                        <h3 className="font-bold text-gray-700">{category.title}</h3>
                                    </div>
                                )}
                                
                                <div className="space-y-3">
                                    {category.items.map((item, idx) => (
                                        <FaqItem 
                                            key={idx} 
                                            item={item} 
                                            isOpen={!!openItems[item.question]} 
                                            toggle={() => toggleItem(item.question)}
                                            highlight={searchTerm}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                            <div className="text-gray-300 mb-3">
                                <i className="bi bi-emoji-frown text-4xl"></i>
                            </div>
                            <h3 className="text-gray-600 font-medium">Tidak ditemukan hasil untuk "{searchTerm}"</h3>
                            <p className="text-sm text-gray-500 mt-1">Coba gunakan kata kunci lain atau periksa ejaan.</p>
                            <button onClick={() => setSearchTerm('')} className="mt-4 text-teal-600 hover:underline text-sm font-medium">Hapus Pencarian</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
