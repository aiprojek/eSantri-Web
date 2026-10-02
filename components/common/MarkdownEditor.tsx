import React, { useState, useRef } from 'react';
import { parseMarkdownToHtml } from '../../utils/markdownUtils';

interface MarkdownEditorProps {
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
    label?: string;
    hint?: string;
    rows?: number;
    required?: boolean;
    className?: string;
}

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
    value,
    onChange,
    placeholder = 'Tulis catatan dengan format markdown...',
    label,
    hint,
    rows = 4,
    required = false,
    className = ''
}) => {
    const [viewMode, setViewMode] = useState<'write' | 'preview' | 'split'>('write');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const insertFormat = (before: string, after: string = '', defaultText: string = '') => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const currentVal = textarea.value;
        const selectedText = currentVal.substring(start, end) || defaultText;

        const replacement = `${before}${selectedText}${after}`;
        const updatedVal = currentVal.substring(0, start) + replacement + currentVal.substring(end);

        onChange(updatedVal);

        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(
                start + before.length,
                start + before.length + selectedText.length
            );
        }, 10);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'b' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            insertFormat('**', '**', 'teks tebal');
        } else if (e.key === 'i' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            insertFormat('*', '*', 'teks miring');
        }
    };

    return (
        <div className={`space-y-1.5 ${className}`}>
            {label && (
                <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-gray-700">
                        {label} {required && <span className="text-red-500">*</span>}
                    </label>
                    <span className="text-[11px] text-gray-400 font-mono flex items-center gap-1">
                        <i className="bi bi-markdown text-teal-600 text-sm"></i>
                        <span>Markdown Aktif</span>
                    </span>
                </div>
            )}

            {hint && (
                <p className="text-[11px] text-gray-500 italic leading-snug">{hint}</p>
            )}

            <div className="border border-gray-300 rounded-xl overflow-hidden bg-white shadow-2xs focus-within:border-teal-500 focus-within:ring-1 focus-within:ring-teal-500 transition-all">
                {/* Formatting Toolbar */}
                <div className="flex flex-wrap items-center justify-between border-b border-gray-200 bg-gray-50 px-2 py-1.5 gap-1">
                    <div className="flex flex-wrap items-center gap-1">
                        <button
                            type="button"
                            onClick={() => insertFormat('**', '**', 'teks tebal')}
                            title="Tebal (Ctrl+B)"
                            className="p-1.5 text-xs font-bold text-gray-700 hover:bg-gray-200 rounded transition-colors"
                        >
                            <i className="bi bi-type-bold"></i>
                        </button>
                        <button
                            type="button"
                            onClick={() => insertFormat('*', '*', 'teks miring')}
                            title="Miring (Ctrl+I)"
                            className="p-1.5 text-xs italic text-gray-700 hover:bg-gray-200 rounded transition-colors"
                        >
                            <i className="bi bi-type-italic"></i>
                        </button>
                        <span className="w-px h-4 bg-gray-300 mx-0.5"></span>
                        <button
                            type="button"
                            onClick={() => insertFormat('### ', '', 'Judul Poin')}
                            title="Judul / Subheading"
                            className="px-2 py-1 text-xs font-bold text-gray-700 hover:bg-gray-200 rounded transition-colors font-mono"
                        >
                            H3
                        </button>
                        <button
                            type="button"
                            onClick={() => insertFormat('- ', '', 'Poin daftar')}
                            title="Daftar Poin (Bullets)"
                            className="p-1.5 text-xs text-gray-700 hover:bg-gray-200 rounded transition-colors"
                        >
                            <i className="bi bi-list-ul"></i>
                        </button>
                        <button
                            type="button"
                            onClick={() => insertFormat('1. ', '', 'Langkah')}
                            title="Daftar Bernomor"
                            className="p-1.5 text-xs text-gray-700 hover:bg-gray-200 rounded transition-colors"
                        >
                            <i className="bi bi-list-ol"></i>
                        </button>
                        <button
                            type="button"
                            onClick={() => insertFormat('- [ ] ', '', 'Tugas / Checklist')}
                            title="Checklist / Kotak Centang"
                            className="p-1.5 text-xs text-gray-700 hover:bg-gray-200 rounded transition-colors"
                        >
                            <i className="bi bi-check2-square"></i>
                        </button>
                        <button
                            type="button"
                            onClick={() => insertFormat('> ', '', 'Kutipan catatan')}
                            title="Kutipan / Catatan Penting"
                            className="p-1.5 text-xs text-gray-700 hover:bg-gray-200 rounded transition-colors"
                        >
                            <i className="bi bi-quote"></i>
                        </button>
                        <button
                            type="button"
                            onClick={() => insertFormat('`', '`', 'kode')}
                            title="Kode / Teks Sorot"
                            className="p-1.5 text-xs text-gray-700 hover:bg-gray-200 rounded transition-colors font-mono"
                        >
                            <i className="bi bi-code"></i>
                        </button>
                    </div>

                    {/* Mode Toggle Tabs */}
                    <div className="flex items-center gap-1 bg-gray-200/70 p-0.5 rounded-lg text-xs">
                        <button
                            type="button"
                            onClick={() => setViewMode('write')}
                            className={`px-2 py-1 rounded font-medium transition-colors ${
                                viewMode === 'write' ? 'bg-white text-teal-800 shadow-2xs font-semibold' : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            Tulis
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('preview')}
                            className={`px-2 py-1 rounded font-medium transition-colors ${
                                viewMode === 'preview' ? 'bg-white text-teal-800 shadow-2xs font-semibold' : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            Pratinjau
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('split')}
                            className={`hidden sm:inline-block px-2 py-1 rounded font-medium transition-colors ${
                                viewMode === 'split' ? 'bg-white text-teal-800 shadow-2xs font-semibold' : 'text-gray-600 hover:text-gray-900'
                            }`}
                            title="Tampilan Berdampingan"
                        >
                            Split
                        </button>
                    </div>
                </div>

                {/* Editor & Preview Body */}
                <div className={`grid ${viewMode === 'split' ? 'grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-200' : 'grid-cols-1'}`}>
                    {(viewMode === 'write' || viewMode === 'split') && (
                        <textarea
                            ref={textareaRef}
                            value={value}
                            onChange={(e) => onChange(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={placeholder}
                            rows={rows}
                            required={required}
                            className="w-full p-3 text-sm font-normal text-gray-800 focus:outline-none resize-y bg-white min-h-[100px]"
                        />
                    )}

                    {(viewMode === 'preview' || viewMode === 'split') && (
                        <div className="p-3 bg-gray-50/50 min-h-[100px] overflow-y-auto max-h-[300px] text-sm">
                            {value.trim() ? (
                                <div
                                    className="prose prose-sm max-w-none space-y-1.5"
                                    dangerouslySetInnerHTML={{ __html: parseMarkdownToHtml(value) }}
                                />
                            ) : (
                                <p className="text-gray-400 italic text-xs">Belum ada konten untuk dipratinjau.</p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
