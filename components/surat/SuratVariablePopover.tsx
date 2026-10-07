import React, { useState, useRef, useEffect, useMemo } from 'react';
import { SURAT_VARIABLES, SuratVariableInfo } from '../../data/suratPresets';
import { useAppContext } from '../../AppContext';
import { formatCustomFieldTag } from '../common/PrintHeader';

interface SuratVariablePopoverProps {
    onInsertVariable: (variableKey: string) => void;
}

export const SuratVariablePopover: React.FC<SuratVariablePopoverProps> = ({ onInsertVariable }) => {
    const { settings } = useAppContext();
    const [isOpen, setIsOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string>('Santri');
    const [search, setSearch] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    const categories = ['Santri', 'Akademik & Asrama', 'Orang Tua', 'Lembaga & Surat', 'Semua'];

    const allVariables = useMemo(() => {
        const customVars: SuratVariableInfo[] = (settings.customInfoFields || [])
            .filter(f => f && f.label && f.label.trim())
            .map(f => ({
                key: formatCustomFieldTag(f.label),
                label: f.label.trim(),
                category: 'Lembaga & Surat' as const,
                example: f.value || '-'
            }));
        return [...SURAT_VARIABLES, ...customVars];
    }, [settings.customInfoFields]);

    const filteredVariables = allVariables.filter(v => {
        if (selectedCategory !== 'Semua' && v.category !== selectedCategory) return false;
        if (search) {
            const q = search.toLowerCase();
            return v.key.toLowerCase().includes(q) || v.label.toLowerCase().includes(q) || v.example.toLowerCase().includes(q);
        }
        return true;
    });

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    return (
        <div className="relative inline-block" ref={containerRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs ${
                    isOpen 
                        ? 'bg-teal-600 text-white shadow-teal-500/20 ring-2 ring-teal-300' 
                        : 'bg-white hover:bg-teal-50 text-teal-800 border border-teal-200/80 hover:border-teal-300'
                }`}
                title="Sisipkan variabel otomatis (Mail Merge)"
            >
                <i className="bi bi-braces text-teal-600 group-hover:text-teal-700"></i>
                <span>Sisipkan Variabel</span>
                <i className={`bi bi-chevron-down text-[10px] transition-transform ${isOpen ? 'rotate-180' : ''}`}></i>
            </button>

            {isOpen && (
                <div className="absolute left-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white p-3.5 shadow-2xl border border-slate-200 z-[120] animate-in fade-in zoom-in-95 duration-100">
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                        <div className="flex items-center gap-1.5">
                            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-teal-100 text-teal-700 text-[11px]">
                                <i className="bi bi-braces"></i>
                            </span>
                            <span className="text-xs font-bold text-slate-800">Variabel Mail Merge</span>
                        </div>
                        <span className="text-[10px] text-slate-400">Klik tag untuk menyisipkan</span>
                    </div>

                    {/* Search */}
                    <div className="relative mb-2">
                        <i className="bi bi-search absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[11px]"></i>
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Cari variabel (cth: nama, nis, kelas)..."
                            className="app-input w-full pl-7 pr-2.5 py-1 text-xs rounded-lg bg-slate-50"
                        />
                    </div>

                    {/* Category tabs */}
                    <div className="flex flex-wrap gap-1 mb-2.5">
                        {categories.map(cat => (
                            <button
                                key={cat}
                                type="button"
                                onClick={() => setSelectedCategory(cat)}
                                className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold transition-all ${
                                    selectedCategory === cat
                                        ? 'bg-teal-700 text-white shadow-2xs'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>

                    {/* Chips grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-56 overflow-y-auto pr-1">
                        {filteredVariables.map(v => (
                            <button
                                key={v.key}
                                type="button"
                                onClick={() => {
                                    onInsertVariable(v.key);
                                    setIsOpen(false);
                                }}
                                className="group flex flex-col items-start p-1.5 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-teal-50 hover:border-teal-300 text-left transition-all"
                            >
                                <span className="font-mono text-[11px] font-bold text-teal-800 group-hover:text-teal-900">
                                    {v.key}
                                </span>
                                <div className="flex items-center justify-between w-full text-[10px] text-slate-500 mt-0.5">
                                    <span>{v.label}</span>
                                    <span className="text-slate-400 truncate max-w-[80px] text-right font-mono" title={v.example}>
                                        {v.example}
                                    </span>
                                </div>
                            </button>
                        ))}
                        {filteredVariables.length === 0 && (
                            <div className="col-span-full py-4 text-center text-xs text-slate-400">
                                Tidak ada variabel yang cocok.
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
