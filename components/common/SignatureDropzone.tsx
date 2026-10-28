import React, { useRef, useState } from 'react';
import { optimizeSignatureImage } from '../../utils/imageOptimizer';

export interface SignatureDropzoneProps {
    value: string | null | undefined;
    onChange: (nextBase64: string | null) => void;
    label?: string;
    helperText?: string;
    compact?: boolean;
    maxWidth?: number;
    maxHeight?: number;
    defaultRemoveWhiteBg?: boolean;
    showTransparentTool?: boolean;
    onError?: (message: string) => void;
}

export const SignatureDropzone: React.FC<SignatureDropzoneProps> = ({
    value,
    onChange,
    label = 'Berkas Gambar (PNG / JPG / WEBP / SVG)',
    helperText = 'Klik pilih berkas, seret & lepas (drag & drop) gambar ke kotak ini, atau tempel (Ctrl+V).',
    compact = false,
    maxWidth = 650,
    maxHeight = 360,
    defaultRemoveWhiteBg = false,
    showTransparentTool = true,
    onError,
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const dragCounterRef = useRef(0);

    const [isDragging, setIsDragging] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [rawSourceBase64, setRawSourceBase64] = useState<string | null>(null);
    const [isWhiteBgRemoved, setIsWhiteBgRemoved] = useState(defaultRemoveWhiteBg);

    const processIncomingFileOrDataUrl = async (input: File | string, cleanWhiteBg: boolean) => {
        if (typeof input !== 'string') {
            if (!input.type.startsWith('image/')) {
                onError?.('Berkas yang dipilih bukan gambar. Gunakan format PNG, JPG, WEBP, atau SVG.');
                return;
            }
            if (input.size > 8 * 1024 * 1024) {
                onError?.('Ukuran gambar terlalu besar (maksimal 8 MB).');
                return;
            }
        }

        setIsProcessing(true);
        try {
            const rawOptimized = await optimizeSignatureImage(input, {
                maxWidth,
                maxHeight,
                removeWhiteBg: false,
                autoTrim: false,
            });
            setRawSourceBase64(rawOptimized);

            if (cleanWhiteBg) {
                const cleaned = await optimizeSignatureImage(rawOptimized, {
                    maxWidth,
                    maxHeight,
                    removeWhiteBg: true,
                    autoTrim: true,
                });
                setIsWhiteBgRemoved(true);
                onChange(cleaned);
            } else {
                setIsWhiteBgRemoved(false);
                onChange(rawOptimized);
            }
        } catch (err: any) {
            onError?.(err?.message || 'Gagal memproses gambar.');
        } finally {
            setIsProcessing(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleToggleRemoveWhiteBg = async () => {
        const baseToUse = rawSourceBase64 || value;
        if (!baseToUse) return;

        setIsProcessing(true);
        try {
            if (!rawSourceBase64 && value) {
                setRawSourceBase64(value);
            }
            if (!isWhiteBgRemoved) {
                const cleaned = await optimizeSignatureImage(baseToUse, {
                    maxWidth,
                    maxHeight,
                    removeWhiteBg: true,
                    autoTrim: true,
                });
                setIsWhiteBgRemoved(true);
                onChange(cleaned);
            } else if (rawSourceBase64) {
                setIsWhiteBgRemoved(false);
                onChange(rawSourceBase64);
            }
        } catch (err: any) {
            onError?.(err?.message || 'Gagal memproses transparansi gambar.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleAutoTrimOnly = async () => {
        if (!value) return;
        setIsProcessing(true);
        try {
            if (!rawSourceBase64) setRawSourceBase64(value);
            const trimmed = await optimizeSignatureImage(value, {
                maxWidth,
                maxHeight,
                removeWhiteBg: false,
                autoTrim: true,
            });
            onChange(trimmed);
        } catch (err: any) {
            onError?.(err?.message || 'Gagal merapikan tepi gambar.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounterRef.current += 1;
        if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
            setIsDragging(true);
        }
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'copy';
        if (!isDragging) setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
        if (dragCounterRef.current === 0) {
            setIsDragging(false);
        }
    };

    const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounterRef.current = 0;
        setIsDragging(false);

        const droppedFile = e.dataTransfer.files?.[0];
        if (droppedFile) {
            await processIncomingFileOrDataUrl(droppedFile, defaultRemoveWhiteBg);
        }
    };

    const handlePaste = async (e: React.ClipboardEvent<HTMLDivElement>) => {
        const items = e.clipboardData?.items;
        if (!items) return;
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.type.startsWith('image/')) {
                e.preventDefault();
                const file = item.getAsFile();
                if (file) {
                    await processIncomingFileOrDataUrl(file, defaultRemoveWhiteBg);
                    break;
                }
            }
        }
    };

    const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            await processIncomingFileOrDataUrl(file, defaultRemoveWhiteBg);
        }
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        setRawSourceBase64(null);
        setIsWhiteBgRemoved(false);
        onChange(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <div className="space-y-2">
            {label && <label className="block text-xs font-semibold text-slate-700">{label}</label>}

            <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={handleFileInput}
                className="hidden"
            />

            <div
                tabIndex={0}
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onPaste={handlePaste}
                onClick={() => {
                    if (!value && !isProcessing) {
                        fileInputRef.current?.click();
                    }
                }}
                className={`relative rounded-xl border-2 border-dashed transition-all outline-none focus:ring-2 focus:ring-teal-500/40 ${
                    isDragging
                        ? 'border-teal-500 bg-teal-50/80 ring-4 ring-teal-500/15 scale-[1.005]'
                        : value
                        ? 'border-slate-200 bg-white'
                        : 'border-slate-300 bg-slate-50/70 hover:border-teal-500 hover:bg-teal-50/30 cursor-pointer'
                } ${compact ? 'p-3' : 'p-4'}`}
            >
                {isProcessing ? (
                    <div className={`flex flex-col items-center justify-center text-center ${compact ? 'py-4' : 'py-7'}`}>
                        <div className="w-7 h-7 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mb-2"></div>
                        <p className="text-xs font-semibold text-teal-700">Memproses gambar...</p>
                    </div>
                ) : value ? (
                    <div className="space-y-3">
                        <div
                            className={`relative flex items-center justify-center rounded-lg border border-slate-200 overflow-hidden bg-[linear-gradient(45deg,#f1f5f9_25%,transparent_25%,transparent_75%,#f1f5f9_75%,#f1f5f9),linear-gradient(45deg,#f1f5f9_25%,transparent_25%,transparent_75%,#f1f5f9_75%,#f1f5f9)] bg-[length:16px_16px] bg-[position:0_0,8px_8px] bg-white ${
                                compact ? 'h-24 p-2' : 'h-32 p-3'
                            }`}
                        >
                            <img
                                src={value}
                                alt="Preview TTD / Aset"
                                className="max-h-full max-w-full object-contain select-none"
                            />
                            {isDragging && (
                                <div className="absolute inset-0 bg-teal-600/90 text-white flex flex-col items-center justify-center text-xs font-bold">
                                    <i className="bi bi-cloud-arrow-down-fill text-xl mb-1"></i>
                                    Lepaskan untuk mengganti gambar
                                </div>
                            )}
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-1.5">
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        fileInputRef.current?.click();
                                    }}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                                >
                                    <i className="bi bi-folder2-open"></i>
                                    Ganti Berkas
                                </button>

                                {showTransparentTool && (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleToggleRemoveWhiteBg();
                                        }}
                                        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                                            isWhiteBgRemoved
                                                ? 'bg-teal-50 border-teal-300 text-teal-800 hover:bg-teal-100'
                                                : 'bg-white border-slate-200 text-slate-700 hover:border-teal-400 hover:text-teal-700'
                                        }`}
                                        title="Otomatis mengubah background kertas putih/terang pada foto tanda tangan menjadi transparan bersih"
                                    >
                                        <i className={`bi ${isWhiteBgRemoved ? 'bi-magic' : 'bi-eraser'}`}></i>
                                        {isWhiteBgRemoved ? 'Kembalikan Gambar Asli' : 'Hapus Background Putih'}
                                    </button>
                                )}

                                {showTransparentTool && !isWhiteBgRemoved && (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleAutoTrimOnly();
                                        }}
                                        className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
                                        title="Potong otomatis ruang kosong berlebih di sekeliling tanda tangan"
                                    >
                                        <i className="bi bi-crop"></i>
                                        Rapikan Tepi
                                    </button>
                                )}
                            </div>

                            <button
                                type="button"
                                onClick={handleClear}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                            >
                                <i className="bi bi-trash3"></i>
                                Hapus
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className={`flex flex-col items-center justify-center text-center select-none ${compact ? 'py-3' : 'py-5'}`}>
                        <div
                            className={`rounded-full flex items-center justify-center mb-2 transition-colors ${
                                isDragging ? 'bg-teal-600 text-white' : 'bg-teal-50 text-teal-600'
                            } ${compact ? 'w-9 h-9 text-lg' : 'w-11 h-11 text-xl'}`}
                        >
                            <i className={`bi ${isDragging ? 'bi-cloud-arrow-down-fill' : 'bi-cloud-arrow-up'}`}></i>
                        </div>
                        <p className="text-xs font-semibold text-slate-700">
                            {isDragging ? 'Lepaskan gambar di sini...' : 'Pilih berkas atau seret & lepas gambar ke sini'}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-1 max-w-md leading-relaxed">{helperText}</p>
                    </div>
                )}
            </div>
        </div>
    );
};
