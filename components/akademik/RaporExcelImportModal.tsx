import React, { useState, useRef } from 'react';
import { RaporTemplate, Santri } from '../../types';
import { parseRaporExcelFile, ParsedRaporExcelResult, exportRaporExcelTemplate } from '../../services/raporExcelService';
import { useAppContext } from '../../AppContext';

interface RaporExcelImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    template?: RaporTemplate | null;
    santriList: Santri[];
    rombelName: string;
    tahunAjaran: string;
    semester: string;
    onImportSuccess: (importedGrades: Record<number, Record<string, string>>, shouldSaveToDb: boolean) => Promise<void>;
}

export const RaporExcelImportModal: React.FC<RaporExcelImportModalProps> = ({
    isOpen,
    onClose,
    template,
    santriList,
    rombelName,
    tahunAjaran,
    semester,
    onImportSuccess
}) => {
    const { showToast } = useAppContext();
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const [isParsing, setIsParsing] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [fileName, setFileName] = useState('');
    const [parseResult, setParseResult] = useState<ParsedRaporExcelResult | null>(null);
    const [autoSaveToDb, setAutoSaveToDb] = useState(true);
    const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);

    if (!isOpen) return null;

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsParsing(true);
        setFileName(file.name);
        setParseResult(null);

        try {
            const result = await parseRaporExcelFile(file, template, santriList);
            setParseResult(result);
            if (!result.success) {
                showToast(result.errors[0] || 'Gagal membaca file Excel', 'error');
            } else if (result.matchedCount === 0) {
                showToast('Tidak ada data santri yang cocok dengan NIS atau Nama di rombel ini.', 'info');
            } else {
                showToast(`Berhasil membaca ${result.matchedCount} santri dari Excel.`, 'success');
            }
        } catch (err: any) {
            showToast('Terjadi kesalahan saat memproses file: ' + err.message, 'error');
        } finally {
            setIsParsing(false);
        }
    };

    const handleDownloadTemplate = async () => {
        try {
            setIsDownloadingTemplate(true);
            const downloadedName = await exportRaporExcelTemplate({
                template,
                santriList,
                rombelName,
                tahunAjaran,
                semester
            });
            showToast(`Template ${downloadedName} berhasil diunduh.`, 'success');
        } catch (err: any) {
            showToast('Gagal mengunduh template: ' + err.message, 'error');
        } finally {
            setIsDownloadingTemplate(false);
        }
    };

    const handleApply = async () => {
        if (!parseResult || parseResult.matchedCount === 0) return;

        setIsSubmitting(true);
        try {
            await onImportSuccess(parseResult.matchedGrades, autoSaveToDb);
            showToast(
                autoSaveToDb
                    ? `Berhasil mengimpor dan menyimpan nilai untuk ${parseResult.matchedCount} santri.`
                    : `Nilai untuk ${parseResult.matchedCount} santri berhasil dimasukkan ke form. Jangan lupa klik Simpan Nilai.`,
                'success'
            );
            handleClose();
        } catch (err: any) {
            showToast('Gagal menyimpan nilai impor: ' + err.message, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setParseResult(null);
        setFileName('');
        if (fileInputRef.current) fileInputRef.current.value = '';
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="px-6 py-4 bg-gradient-to-r from-teal-700 to-emerald-700 text-white flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-sm">
                            <i className="bi bi-file-earmark-excel-fill text-lg text-emerald-200"></i>
                        </div>
                        <div>
                            <h3 className="font-black text-base tracking-tight">Import Nilai dari Excel</h3>
                            <p className="text-xs text-teal-100">
                                {rombelName || 'Rombel'} • {tahunAjaran} ({semester})
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={handleClose}
                        className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white"
                        aria-label="Tutup"
                    >
                        <i className="bi bi-x-lg text-sm"></i>
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto space-y-5 flex-1">
                    {/* Step Info */}
                    <div className="flex items-center justify-between p-3 bg-teal-50/60 border border-teal-100 rounded-xl text-xs">
                        <div className="flex items-center gap-2 text-teal-900 font-medium">
                            <i className="bi bi-lightbulb text-teal-600 text-base"></i>
                            <span>Belum punya format file? Unduh template resmi per rombel:</span>
                        </div>
                        <button
                            type="button"
                            onClick={handleDownloadTemplate}
                            disabled={isDownloadingTemplate}
                            className="px-3 py-1.5 bg-white border border-teal-200 text-teal-800 rounded-lg font-bold hover:bg-teal-50 transition-all flex items-center gap-1.5 shadow-2xs shrink-0 disabled:opacity-50"
                        >
                            {isDownloadingTemplate ? (
                                <span className="w-3.5 h-3.5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></span>
                            ) : (
                                <i className="bi bi-download text-teal-600"></i>
                            )}
                            <span>Unduh Template</span>
                        </button>
                    </div>

                    {/* File Dropzone */}
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                            fileName
                                ? 'border-teal-400 bg-teal-50/30'
                                : 'border-slate-200 hover:border-teal-400 hover:bg-slate-50/70'
                        }`}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".xlsx, .xls"
                            className="hidden"
                            onChange={handleFileChange}
                        />
                        <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center mx-auto mb-3">
                            <i className="bi bi-cloud-arrow-up text-2xl"></i>
                        </div>
                        <h4 className="text-sm font-bold text-slate-800">
                            {fileName ? fileName : 'Pilih atau Tarik File Excel ke Sini'}
                        </h4>
                        <p className="text-xs text-slate-400 mt-1">Format didukung: .xlsx atau .xls</p>
                        <span className="inline-block mt-3 px-3.5 py-1 text-xs font-semibold text-teal-700 bg-teal-100/60 rounded-full">
                            {fileName ? 'Klik untuk mengganti file' : 'Jelajahi File'}
                        </span>
                    </div>

                    {/* Parsing State */}
                    {isParsing && (
                        <div className="p-4 text-center rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center gap-3">
                            <span className="w-5 h-5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></span>
                            <span className="text-xs font-bold text-slate-600">Membaca dan memverifikasi data santri...</span>
                        </div>
                    )}

                    {/* Parse Result Summary */}
                    {parseResult && parseResult.success && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-3 gap-2.5">
                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                                    <div className="text-[10px] uppercase font-bold text-slate-400">Total Baris</div>
                                    <div className="text-lg font-black text-slate-800">{parseResult.totalRows}</div>
                                </div>
                                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
                                    <div className="text-[10px] uppercase font-bold text-emerald-600">Santri Cocok</div>
                                    <div className="text-lg font-black text-emerald-700">{parseResult.matchedCount}</div>
                                </div>
                                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-center">
                                    <div className="text-[10px] uppercase font-bold text-amber-600">Tidak Cocok</div>
                                    <div className="text-lg font-black text-amber-700">{parseResult.unmatchedCount}</div>
                                </div>
                            </div>

                            {/* Detected Keys */}
                            {parseResult.detectedKeys.length > 0 && (
                                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                                    <div className="text-xs font-bold text-slate-700 mb-2 flex items-center justify-between">
                                        <span>Kolom Nilai Terdeteksi ({parseResult.detectedKeys.length}):</span>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                                        {parseResult.detectedKeys.map(k => (
                                            <span
                                                key={k}
                                                className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[11px] font-mono font-medium text-slate-700"
                                            >
                                                ${k}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Unmatched warning */}
                            {parseResult.unmatchedCount > 0 && (
                                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-1">
                                    <div className="font-bold flex items-center gap-1.5">
                                        <i className="bi bi-exclamation-triangle-fill text-amber-600"></i>
                                        <span>{parseResult.unmatchedCount} santri tidak cocok:</span>
                                    </div>
                                    <p className="text-[11px] text-amber-700">
                                        Pastikan NIS atau Nama Santri sesuai dengan data master di aplikasi.
                                    </p>
                                </div>
                            )}

                            {/* Direct Save Checkbox */}
                            <label className="flex items-center gap-2.5 p-3 rounded-xl bg-teal-50/50 border border-teal-100 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={autoSaveToDb}
                                    onChange={e => setAutoSaveToDb(e.target.checked)}
                                    className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500"
                                />
                                <div className="text-xs">
                                    <span className="font-bold text-slate-800">Simpan langsung ke database lokal</span>
                                    <p className="text-slate-500 text-[11px]">
                                        Nilai langsung dipersistensikan untuk rombel dan semester aktif.
                                    </p>
                                </div>
                            </label>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
                    <button
                        type="button"
                        onClick={handleClose}
                        disabled={isSubmitting}
                        className="px-4 py-2 bg-white border border-slate-200 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-100 transition-colors"
                    >
                        Batal
                    </button>
                    <button
                        type="button"
                        onClick={handleApply}
                        disabled={!parseResult || parseResult.matchedCount === 0 || isSubmitting}
                        className="px-5 py-2 bg-teal-600 text-white font-bold text-xs rounded-xl hover:bg-teal-700 shadow-md shadow-teal-600/20 disabled:opacity-40 transition-all flex items-center gap-2"
                    >
                        {isSubmitting ? (
                            <>
                                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                <span>Menyimpan...</span>
                            </>
                        ) : (
                            <>
                                <i className="bi bi-check2-circle text-sm"></i>
                                <span>Terapkan {parseResult?.matchedCount ? `(${parseResult.matchedCount} Santri)` : ''}</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
