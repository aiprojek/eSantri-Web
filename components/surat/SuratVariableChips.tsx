import React, { useState } from 'react';
import { SURAT_VARIABLES, SuratVariableInfo } from '../../data/suratPresets';

interface SuratVariableChipsProps {
    onInsertVariable: (variableKey: string) => void;
    className?: string;
}

export const SuratVariableChips: React.FC<SuratVariableChipsProps> = ({ onInsertVariable, className = '' }) => {
    const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
    const [copiedKey, setCopiedKey] = useState<string | null>(null);

    const categories = ['Semua', 'Santri', 'Akademik & Asrama', 'Orang Tua', 'Lembaga & Surat'];

    const filteredVariables = selectedCategory === 'Semua' 
        ? SURAT_VARIABLES 
        : SURAT_VARIABLES.filter(v => v.category === selectedCategory);

    const handleChipClick = (variable: SuratVariableInfo) => {
        onInsertVariable(variable.key);
        setCopiedKey(variable.key);
        setTimeout(() => setCopiedKey(null), 1500);
    };

    return (
        <div className={`app-panel-soft rounded-[20px] border border-app-border p-3.5 space-y-2.5 ${className}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-teal-800">
                    <i className="bi bi-braces text-teal-600"></i>
                    <span>Sisipkan Variabel Otomatis (Mail Merge)</span>
                </div>
                <div className="flex flex-wrap gap-1">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            type="button"
                            onClick={() => setSelectedCategory(cat)}
                            className={`rounded-lg px-2 py-0.5 text-[11px] font-medium transition-all ${
                                selectedCategory === cat
                                    ? 'bg-teal-600 text-white shadow-xs'
                                    : 'bg-white/80 text-slate-600 hover:bg-slate-100'
                            }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                {filteredVariables.map(v => {
                    const isCopied = copiedKey === v.key;
                    return (
                        <button
                            key={v.key}
                            type="button"
                            onClick={() => handleChipClick(v)}
                            title={`Klik untuk menyisipkan ${v.key} (Contoh isi: ${v.example})`}
                            className={`group flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-all ${
                                isCopied 
                                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-200' 
                                    : 'border-slate-200 bg-white text-slate-700 hover:border-teal-400 hover:bg-teal-50/70 hover:text-teal-900 shadow-2xs'
                            }`}
                        >
                            <span className="font-mono font-semibold text-[11px] text-teal-700 group-hover:text-teal-900">
                                {v.key}
                            </span>
                            <span className="text-[10px] text-slate-500 border-l border-slate-200 pl-1.5">
                                {isCopied ? 'Tersisip! ✓' : v.label}
                            </span>
                        </button>
                    );
                })}
            </div>
            <p className="text-[11px] text-slate-500 italic">
                *Klik salah satu chip di atas untuk langsung menyisipkan tag ke dalam teks surat. Saat dicetak, tag ini otomatis digantikan dengan data asli santri.
            </p>
        </div>
    );
};
