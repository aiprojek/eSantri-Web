import React, { useState, useEffect, useRef } from 'react';
import { parseExcelClipboard, ParsedExcelTable, buildTemplateFromExcelTable, overlayPastedTableOntoGrid } from '../utils/excelPasteParser';
import { PondokSettings, RaporTemplate, GridCell } from '../../../types';

interface RaporExcelPasteModalProps {
    isOpen: boolean;
    onClose: () => void;
    settings: PondokSettings;
    activeTemplate: RaporTemplate | null;
    isEditingTemplate: boolean;
    selectedCell?: { r: number; c: number };
    onApplyToCurrentSheet: (updatedCells: GridCell[][], newRowCount: number, newColCount: number) => void;
    onCreateNewTemplate: (newTemplate: RaporTemplate) => void;
    showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const RaporExcelPasteModal: React.FC<RaporExcelPasteModalProps> = ({
    isOpen,
    onClose,
    settings,
    activeTemplate,
    isEditingTemplate,
    selectedCell,
    onApplyToCurrentSheet,
    onCreateNewTemplate,
    showToast
}) => {
    const [pasteMode, setPasteMode] = useState<'new_template' | 'current_sheet'>(
        isEditingTemplate ? 'current_sheet' : 'new_template'
    );
    const [templateName, setTemplateName] = useState('Template Rapor Paste Excel');
    const [selectedJenjangId, setSelectedJenjangId] = useState<number | undefined>(undefined);
    const [customTitle, setCustomTitle] = useState('');
    const [parsedTable, setParsedTable] = useState<ParsedExcelTable | null>(null);
    const [isPasting, setIsPasting] = useState(false);
    const [pasteMethod, setPasteMethod] = useState<'clipboard_btn' | 'manual_input'>('clipboard_btn');
    const [manualText, setManualText] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (isOpen) {
            setPasteMode(isEditingTemplate ? 'current_sheet' : 'new_template');
            setParsedTable(null);
            setManualText('');
            setCustomTitle('');
            setTemplateName(`Template Rapor Excel ${new Date().toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}`);
        }
    }, [isOpen, isEditingTemplate]);

    if (!isOpen) return null;

    const handlePasteFromClipboardApi = async () => {
        setIsPasting(true);
        try {
            // Coba akses Clipboard API
            if (navigator.clipboard && navigator.clipboard.read) {
                const items = await navigator.clipboard.read();
                let htmlText = '';
                let plainText = '';

                for (const item of items) {
                    if (item.types.includes('text/html')) {
                        const blob = await item.getType('text/html');
                        htmlText = await blob.text();
                    }
                    if (item.types.includes('text/plain')) {
                        const blob = await item.getType('text/plain');
                        plainText = await blob.text();
                    }
                }

                const result = parseExcelClipboard(htmlText, plainText);
                if (result && result.rowCount > 0 && result.colCount > 0) {
                    setParsedTable(result);
                    showToast(`Berhasil membaca ${result.rowCount} baris × ${result.colCount} kolom dari Excel!`, 'success');
                    setIsPasting(false);
                    return;
                }
            }

            // Fallback: clipboard.readText
            if (navigator.clipboard && navigator.clipboard.readText) {
                const text = await navigator.clipboard.readText();
                if (text && text.trim()) {
                    const result = parseExcelClipboard(undefined, text);
                    if (result && result.rowCount > 0 && result.colCount > 0) {
                        setParsedTable(result);
                        showToast(`Berhasil membaca ${result.rowCount} baris × ${result.colCount} kolom dari Excel!`, 'success');
                        setIsPasting(false);
                        return;
                    }
                }
            }

            // Jika izin clipboard ditolak oleh browser
            setPasteMethod('manual_input');
            setTimeout(() => textareaRef.current?.focus(), 100);
            showToast('Izin clipboard browser terbatas. Silakan tekan Ctrl+V di kotak teks di bawah.', 'info');
        } catch {
            setPasteMethod('manual_input');
            setTimeout(() => textareaRef.current?.focus(), 100);
            showToast('Silakan tekan Ctrl+V pada kotak teks untuk menempel desain Excel.', 'info');
        } finally {
            setIsPasting(false);
        }
    };

    const handleManualPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
        const html = e.clipboardData.getData('text/html');
        const text = e.clipboardData.getData('text/plain');

        const result = parseExcelClipboard(html, text);
        if (result && result.rowCount > 0 && result.colCount > 0) {
            e.preventDefault();
            setParsedTable(result);
            setManualText(text || `${result.rowCount} baris × ${result.colCount} kolom`);
            showToast(`Berhasil membaca ${result.rowCount} baris × ${result.colCount} kolom dari Excel!`, 'success');
        }
    };

    const handleApply = () => {
        if (!parsedTable) {
            showToast('Belum ada data tabel yang terbaca. Salin sel di Excel lalu paste.', 'error');
            return;
        }

        if (pasteMode === 'new_template') {
            const cleanName = templateName.trim() || 'Template Rapor Excel';
            const newTpl = buildTemplateFromExcelTable(parsedTable, cleanName, selectedJenjangId, customTitle.trim() || undefined);
            onCreateNewTemplate(newTpl);
            showToast(`Template "${cleanName}" berhasil dibuat dari Excel!`, 'success');
            onClose();
        } else {
            if (!activeTemplate) {
                showToast('Tidak ada template aktif yang sedang diedit.', 'error');
                return;
            }
            const startR = selectedCell?.r || 0;
            const startC = selectedCell?.c || 0;
            const { updatedCells, newRowCount, newColCount } = overlayPastedTableOntoGrid(
                activeTemplate.cells,
                parsedTable,
                startR,
                startC
            );
            onApplyToCurrentSheet(updatedCells, newRowCount, newColCount);
            showToast(`Berhasil menempel ${parsedTable.rowCount} baris × ${parsedTable.colCount} kolom ke lembar rapor!`, 'success');
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-gray-200 overflow-hidden my-auto flex flex-col max-h-[92vh]">
                {/* Header */}
                <div className="p-4 sm:p-5 border-b flex justify-between items-center bg-gradient-to-r from-emerald-800 to-teal-800 text-white shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-xl text-emerald-300 shrink-0">
                            <i className="bi bi-file-earmark-spreadsheet-fill"></i>
                        </div>
                        <div>
                            <h3 className="font-bold text-base leading-tight">Paste Desain Rapor dari Excel</h3>
                            <p className="text-xs text-emerald-100">Tempel langsung tabel yang disalin dari Microsoft Excel atau Google Sheets</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10 transition-colors"
                        title="Tutup Modal"
                    >
                        <i className="bi bi-x-lg text-lg"></i>
                    </button>
                </div>

                {/* Body */}
                <div className="p-5 overflow-y-auto space-y-4 text-xs text-gray-700 flex-grow">
                    {/* Panduan Cepat */}
                    <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200/80 flex items-start gap-2.5">
                        <i className="bi bi-lightbulb-fill text-amber-500 text-base shrink-0 mt-0.5"></i>
                        <div className="space-y-1">
                            <p className="font-bold text-emerald-950">Cara Penggunaan Cepat:</p>
                            <p className="text-emerald-900 leading-relaxed">
                                1. Buka file desain rapor Anda di <strong>Excel / Google Sheets</strong>.<br />
                                2. Blok sel yang diinginkan (misal tabel nilai, identitas, atau seluruh format), lalu tekan <strong>Ctrl+C (Copy)</strong>.<br />
                                3. Klik tombol hijau <strong>"Baca dari Clipboard"</strong> atau tekan <strong>Ctrl+V</strong> di kotak area di bawah.
                            </p>
                        </div>
                    </div>

                    {/* Mode Pemilihan: Template Baru vs Sisip ke Lembar Aktif */}
                    <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                            Pilihan Tindakan
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => setPasteMode('new_template')}
                                className={`p-3 rounded-xl border text-left transition-all flex items-start gap-2.5 ${
                                    pasteMode === 'new_template'
                                        ? 'bg-emerald-50/80 border-emerald-400 text-emerald-950 ring-2 ring-emerald-500/20 font-semibold'
                                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                }`}
                            >
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs ${
                                    pasteMode === 'new_template' ? 'bg-emerald-600 text-white' : 'border border-gray-300'
                                }`}>
                                    {pasteMode === 'new_template' && <i className="bi bi-check"></i>}
                                </span>
                                <div>
                                    <div className="font-bold">Buat Template Baru</div>
                                    <div className="text-[11px] text-gray-500 font-normal">Buat template rapor baru dari hasil salinan Excel</div>
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() => setPasteMode('current_sheet')}
                                disabled={!isEditingTemplate}
                                className={`p-3 rounded-xl border text-left transition-all flex items-start gap-2.5 ${
                                    !isEditingTemplate
                                        ? 'opacity-40 cursor-not-allowed bg-gray-50 border-gray-200'
                                        : pasteMode === 'current_sheet'
                                        ? 'bg-emerald-50/80 border-emerald-400 text-emerald-950 ring-2 ring-emerald-500/20 font-semibold'
                                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                }`}
                            >
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs ${
                                    pasteMode === 'current_sheet' ? 'bg-emerald-600 text-white' : 'border border-gray-300'
                                }`}>
                                    {pasteMode === 'current_sheet' && <i className="bi bi-check"></i>}
                                </span>
                                <div>
                                    <div className="font-bold">Tempel ke Lembar yang Sedang Diedit</div>
                                    <div className="text-[11px] text-gray-500 font-normal">
                                        {isEditingTemplate 
                                            ? `Sisipkan mulai dari sel terpilih (R:${(selectedCell?.r || 0) + 1}, C:${(selectedCell?.c || 0) + 1})`
                                            : 'Hanya aktif saat sedang membuka lembar editor'}
                                    </div>
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Jika Template Baru: Input Nama Template & Jenjang */}
                    {pasteMode === 'new_template' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Nama Template Rapor</label>
                                <input
                                    type="text"
                                    value={templateName}
                                    onChange={(e) => setTemplateName(e.target.value)}
                                    placeholder="Contoh: Rapor Semester Ganjil MTs"
                                    className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Marhalah / Jenjang (Opsional)</label>
                                <select
                                    value={selectedJenjangId || ''}
                                    onChange={(e) => setSelectedJenjangId(e.target.value ? parseInt(e.target.value) : undefined)}
                                    className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                                >
                                    <option value="">Semua Jenjang</option>
                                    {settings.jenjang.map(j => (
                                        <option key={j.id} value={j.id}>{j.nama}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="sm:col-span-2 pt-2 border-t border-gray-200">
                                <div className="flex items-center justify-between mb-1">
                                    <label className="block text-xs font-bold text-gray-700">
                                        Judul Dokumen Rapor (Opsional, Bisa 1-3 Baris)
                                    </label>
                                    <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-bold">
                                        Mendukung Enter
                                    </span>
                                </div>
                                <textarea
                                    rows={2}
                                    value={customTitle}
                                    onChange={(e) => setCustomTitle(e.target.value)}
                                    placeholder={`Contoh 3 Baris:\nLAPORAN HASIL EVALUASI BELAJAR (RAPOR)\n${settings.namaPonpes || 'PONDOK PESANTREN'}\nSEMESTER $SEMESTER TAHUN AJARAN $TAHUN_AJARAN`}
                                    className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-medium bg-white focus:ring-2 focus:ring-emerald-500 outline-none leading-relaxed"
                                />
                                <p className="text-[10px] text-gray-500 mt-0.5">
                                    💡 <em>Nama sheet di Excel tidak mendukung baris baru. Gunakan kolom ini jika ingin judul resmi 2-3 baris di bawah Kop.</em>
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Area Tombol Paste & Dropzone */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                                Kotak Penangkapan Salinan Excel
                            </label>
                            <span className="text-[11px] text-gray-500">Mendukung Format Tabel &amp; Merge</span>
                        </div>

                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={handlePasteFromClipboardApi}
                                disabled={isPasting}
                                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-xs transition-all text-xs"
                            >
                                <i className={`bi ${isPasting ? 'bi-arrow-repeat animate-spin' : 'bi-clipboard-check-fill'} text-base`}></i>
                                <span>{isPasting ? 'Membaca Clipboard...' : 'Ambil Otomatis dari Clipboard (Klik di Sini)'}</span>
                            </button>
                        </div>

                        {/* Textarea untuk manual paste (Ctrl+V) */}
                        <div className="relative">
                            <textarea
                                ref={textareaRef}
                                value={manualText}
                                onChange={(e) => {
                                    setManualText(e.target.value);
                                    if (e.target.value.trim()) {
                                        const res = parseExcelClipboard(undefined, e.target.value);
                                        if (res) setParsedTable(res);
                                    }
                                }}
                                onPaste={handleManualPaste}
                                rows={3}
                                placeholder="Atau klik di dalam kotak ini lalu tekan Ctrl+V pada keyboard untuk menempel..."
                                className="w-full border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/20 rounded-xl p-3 text-xs font-mono text-gray-700 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all placeholder:text-gray-400"
                            />
                            <div className="absolute right-2.5 bottom-2.5 text-[10px] text-emerald-700 font-semibold bg-emerald-100/90 px-2 py-0.5 rounded pointer-events-none">
                                Area Paste Keyboard (Ctrl+V)
                            </div>
                        </div>
                    </div>

                    {/* Preview Hasil Parsing Excel */}
                    {parsedTable && (
                        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
                                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                                    <i className="bi bi-check-circle-fill text-emerald-600"></i>
                                    Tabel Berhasil Dianalisis
                                </span>
                                <div className="flex items-center gap-2">
                                    <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded text-[11px]">
                                        {parsedTable.rowCount} Baris × {parsedTable.colCount} Kolom
                                    </span>
                                    {parsedTable.mergeCount > 0 && (
                                        <span className="bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded text-[11px]">
                                            {parsedTable.mergeCount} Merge
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Tag Terdeteksi */}
                            {parsedTable.detectedTags.length > 0 && (
                                <div>
                                    <span className="text-[11px] font-semibold text-gray-500 block mb-1">
                                        Tag / Placeholder eSantri yang Terdeteksi:
                                    </span>
                                    <div className="flex flex-wrap gap-1">
                                        {parsedTable.detectedTags.map((tag) => (
                                            <span
                                                key={tag}
                                                className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold"
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Smart Optimization Badges */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                                <div className="p-2 rounded-lg bg-indigo-50 border border-indigo-100 flex items-start gap-2 text-indigo-900">
                                    <i className="bi bi-file-earmark-check-fill text-indigo-600 text-sm shrink-0 mt-0.5"></i>
                                    <div>
                                        <strong className="block font-bold">Pas 1 Muka (Fit to 1 Page)</strong>
                                        <span className="text-[10px] text-indigo-700">Otomatis diset pas 1 lembar seperti setelan cetak Excel tanpa meluber ke halaman 2.</span>
                                    </div>
                                </div>
                                <div className={`p-2 rounded-lg border flex items-start gap-2 ${
                                    parsedTable.detectedTags.some(t => t === '$NAMA' || t === '$NIS' || t === '$ROMBEL' || t === '$KELAS' || t === '$PERINGKAT')
                                        ? 'bg-amber-50 border-amber-200 text-amber-900'
                                        : 'bg-emerald-50 border-emerald-100 text-emerald-900'
                                }`}>
                                    <i className={`bi ${parsedTable.detectedTags.some(t => t === '$NAMA' || t === '$NIS' || t === '$ROMBEL' || t === '$KELAS' || t === '$PERINGKAT') ? 'bi-shield-check text-amber-600' : 'bi-person-check text-emerald-600'} text-sm shrink-0 mt-0.5`}></i>
                                    <div>
                                        <strong className="block font-bold">Header Data Diri Santri</strong>
                                        <span className="text-[10px]">
                                            {parsedTable.detectedTags.some(t => t === '$NAMA' || t === '$NIS' || t === '$ROMBEL' || t === '$KELAS' || t === '$PERINGKAT')
                                                ? 'Format biodata dibuat mandiri di Excel. Header bawaan otomatis dinonaktifkan agar tidak muncul ganda.'
                                                : 'Belum ada format biodata mandiri. Header biodata ringkas bawaan tetap aktif.'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Pratinjau Mini Tabel */}
                            <div className="border border-slate-200 rounded-lg overflow-x-auto max-h-48 bg-white shadow-2xs">
                                <table className="w-full text-[10px] border-collapse">
                                    <tbody>
                                        {parsedTable.cells.slice(0, 8).map((row, r) => (
                                            <tr key={r} className="border-b border-slate-100 last:border-0">
                                                {row.slice(0, 8).map((cell, c) => {
                                                    if (cell.hidden) return null;
                                                    const b = cell.borders || { top: false, right: false, bottom: false, left: false };
                                                    return (
                                                        <td
                                                            key={c}
                                                            rowSpan={cell.rowSpan}
                                                            colSpan={cell.colSpan}
                                                            style={{
                                                                borderTop: b.top ? '1px solid #cbd5e1' : 'none',
                                                                borderRight: b.right ? '1px solid #cbd5e1' : 'none',
                                                                borderBottom: b.bottom ? '1px solid #cbd5e1' : 'none',
                                                                borderLeft: b.left ? '1px solid #cbd5e1' : 'none',
                                                                backgroundColor: cell.backgroundColor || (cell.type === 'data' ? '#eef2ff' : undefined),
                                                                fontWeight: cell.bold ? 'bold' : (r === 0 ? '600' : 'normal'),
                                                                fontStyle: cell.italic ? 'italic' : undefined,
                                                                color: cell.color || undefined
                                                            }}
                                                            className={`p-1.5 truncate max-w-[120px] ${cell.align === 'center' ? 'text-center' : cell.align === 'right' ? 'text-right' : 'text-left'}`}
                                                        >
                                                            {cell.value || <span className="text-gray-300 italic">-</span>}
                                                        </td>
                                                    );
                                                })}
                                                {row.length > 8 && <td className="p-1 text-gray-400 italic">...</td>}
                                            </tr>
                                        ))}
                                        {parsedTable.cells.length > 8 && (
                                            <tr>
                                                <td colSpan={Math.min(9, parsedTable.colCount)} className="p-1 text-center text-gray-400 italic bg-gray-50">
                                                    ... (+ {parsedTable.cells.length - 8} baris lainnya) ...
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t bg-gray-50 flex items-center justify-end gap-2 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-200 font-semibold text-xs transition-colors"
                    >
                        Batal
                    </button>
                    <button
                        type="button"
                        onClick={handleApply}
                        disabled={!parsedTable}
                        className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
                    >
                        <i className="bi bi-check-lg text-sm"></i>
                        <span>{pasteMode === 'new_template' ? 'Buat Template dari Excel' : 'Terapkan ke Lembar Aktif'}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};
