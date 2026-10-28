import React from 'react';
import { ResolvedCellMediaVisual } from '../../utils/raporPlaceholderResolver';

interface RaporSignatureStampMediaProps {
    visual: ResolvedCellMediaVisual;
    mode: 'print' | 'canvas';
    onImageLoad?: () => void;
}

const STAMP_SIZE_CLASSES: Record<'print' | 'canvas', Record<'sm' | 'md' | 'lg', string>> = {
    print: {
        sm: 'h-[52px] w-[52px]',
        md: 'h-[66px] w-[66px]',
        lg: 'h-[80px] w-[80px]',
    },
    canvas: {
        sm: 'h-[40px] w-[40px]',
        md: 'h-[50px] w-[50px]',
        lg: 'h-[60px] w-[60px]',
    },
};

const TTD_SIZE_CLASSES: Record<'print' | 'canvas', Record<'sm' | 'md' | 'lg', string>> = {
    print: {
        sm: 'max-h-[48px] max-w-[110px]',
        md: 'max-h-[58px] max-w-[130px]',
        lg: 'max-h-[68px] max-w-[148px]',
    },
    canvas: {
        sm: 'max-h-[38px] max-w-[92px]',
        md: 'max-h-[44px] max-w-[108px]',
        lg: 'max-h-[52px] max-w-[120px]',
    },
};

/**
 * Transformasi posisi stempel relatif terhadap titik tengah TTD (`left: 50%`, `top: 50%`).
 * Dengan jangkar terpusat pada TTD, stempel selalu menimpa sisi kiri/tengah/kanan TTD secara proporsional
 * berapa pun lebar gabungan kolom sel tabel rapor (baik 120px maupun 320px).
 */
const STAMP_OFFSET_TRANSFORMS: Record<'left' | 'center' | 'right', string> = {
    left: 'translate(-82%, -52%) rotate(-5deg)',
    center: 'translate(-50%, -50%) rotate(-3deg)',
    right: 'translate(-18%, -52%) rotate(4deg)',
};

export const RaporSignatureStampMedia: React.FC<RaporSignatureStampMediaProps> = ({
    visual,
    mode,
    onImageLoad,
}) => {
    const { kind, primarySrc, stempelOverlaySrc, position, size, showWhenTtdEmpty, placeholderLabel, rawTag } = visual;

    if (kind === 'kop') {
        if (primarySrc) {
            return (
                <div className="flex items-center justify-center p-0.5 w-full h-full">
                    <img
                        src={primarySrc}
                        alt={rawTag}
                        onLoad={onImageLoad}
                        className={`object-contain w-full ${mode === 'print' ? 'max-h-28' : 'max-h-16'}`}
                    />
                </div>
            );
        }
        if (mode === 'print') return null;
        return (
            <span className="text-purple-700 font-bold text-[10px] bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded inline-flex items-center gap-1 justify-center">
                <i className="bi bi-file-earmark-richtext"></i> {placeholderLabel}
            </span>
        );
    }

    if (kind === 'logo') {
        if (primarySrc) {
            return (
                <div className="flex items-center justify-center p-0.5 w-full h-full">
                    <img
                        src={primarySrc}
                        alt={rawTag}
                        onLoad={onImageLoad}
                        className={`object-contain ${mode === 'print' ? 'max-h-14 max-w-[100px]' : 'max-h-10 max-w-[80px]'}`}
                    />
                </div>
            );
        }
        if (mode === 'print') return null;
        const isYayasan = rawTag.toUpperCase().includes('YAYASAN');
        return (
            <span
                className={`${
                    isYayasan ? 'text-indigo-700 bg-indigo-50' : 'text-teal-700 bg-teal-50'
                } font-bold text-[10px] px-1.5 py-0.5 rounded inline-flex items-center gap-1 justify-center`}
            >
                <i className={`bi ${isYayasan ? 'bi-image-fill' : 'bi-image'}`}></i> {placeholderLabel}
            </span>
        );
    }

    if (kind === 'stempel_only') {
        if (primarySrc) {
            return (
                <div className="flex items-center justify-center p-0.5 w-full h-full">
                    <img
                        src={primarySrc}
                        alt={rawTag}
                        onLoad={onImageLoad}
                        className={`object-contain opacity-90 mix-blend-multiply ${STAMP_SIZE_CLASSES[mode][size]}`}
                    />
                </div>
            );
        }
        if (mode === 'print') return null;
        return (
            <span className="text-rose-600 font-bold text-[10px] bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded inline-flex items-center gap-1 justify-center">
                <i className="bi bi-patch-check-fill"></i> {placeholderLabel}
            </span>
        );
    }

    if (kind === 'ttd_only') {
        if (primarySrc) {
            return (
                <div className="flex items-center justify-center p-0.5 w-full h-full">
                    <img
                        src={primarySrc}
                        alt={rawTag}
                        onLoad={onImageLoad}
                        className={`object-contain mix-blend-multiply ${TTD_SIZE_CLASSES[mode][size]}`}
                    />
                </div>
            );
        }
        // Di mode cetak, kosongkan bersih untuk tanda tangan basah jika pejabat belum punya TTD digital
        if (mode === 'print') return null;
        return (
            <span className="text-purple-600 font-bold text-[10px] bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded inline-flex items-center gap-1 justify-center">
                <i className="bi bi-pen-fill"></i> {placeholderLabel}
            </span>
        );
    }

    if (kind === 'ttd_with_stempel') {
        // 1. TTD tersedia & Stempel tersedia -> Tumpuk autentik (Stempel menimpa di atas TTD)
        if (primarySrc && stempelOverlaySrc) {
            return (
                <div className="relative inline-flex items-center justify-center w-full h-full select-none py-0.5">
                    <div className="relative inline-flex items-center justify-center">
                        <img
                            src={primarySrc}
                            alt="Tanda Tangan"
                            onLoad={onImageLoad}
                            className={`relative z-[5] object-contain mix-blend-multiply ${TTD_SIZE_CLASSES[mode][size]}`}
                        />
                        <img
                            src={stempelOverlaySrc}
                            alt="Stempel Resmi"
                            onLoad={onImageLoad}
                            className={`pointer-events-none absolute left-1/2 top-1/2 z-[10] max-w-none object-contain opacity-90 mix-blend-multiply ${STAMP_SIZE_CLASSES[mode][size]}`}
                            style={{ transform: STAMP_OFFSET_TRANSFORMS[position] }}
                        />
                    </div>
                </div>
            );
        }

        // 2. TTD tersedia namun Stempel belum diunggah -> Tampilkan TTD (+ badge indikator kecil di mode desain)
        if (primarySrc && !stempelOverlaySrc) {
            return (
                <div className="relative inline-flex items-center justify-center w-full h-full p-0.5">
                    <img
                        src={primarySrc}
                        alt="Tanda Tangan"
                        onLoad={onImageLoad}
                        className={`object-contain mix-blend-multiply ${TTD_SIZE_CLASSES[mode][size]}`}
                    />
                    {mode === 'canvas' && (
                        <span
                            className="absolute -top-1 right-1 z-[12] text-[8px] font-bold bg-rose-100 text-rose-700 border border-rose-300 px-1 rounded shadow-2xs"
                            title="Stempel di atas TTD aktif, namun gambar Stempel belum diunggah di Data Master / Aset Digital"
                        >
                            +Cap (Kosong)
                        </span>
                    )}
                </div>
            );
        }

        // 3. TTD belum tersedia
        if (mode === 'print') {
            if (showWhenTtdEmpty && stempelOverlaySrc) {
                return (
                    <div className="flex items-center justify-center p-0.5 w-full h-full">
                        <img
                            src={stempelOverlaySrc}
                            alt="Stempel Resmi"
                            onLoad={onImageLoad}
                            className={`object-contain opacity-90 mix-blend-multiply ${STAMP_SIZE_CLASSES.print[size]}`}
                        />
                    </div>
                );
            }
            // Standar aman: jika pejabat belum punya TTD digital, biarkan kosong bersih untuk TTD + Cap basah
            return null;
        }

        // Mode Canvas (Desain Rapor) ketika TTD belum ada
        return (
            <div className="inline-flex flex-col items-center justify-center gap-0.5">
                {stempelOverlaySrc ? (
                    <div className="relative inline-flex items-center justify-center py-0.5">
                        <span className="text-purple-700 font-bold text-[9px] bg-purple-50/90 border border-dashed border-purple-300 px-2 py-1 rounded inline-flex items-center gap-1">
                            <i className="bi bi-pen-fill"></i> {placeholderLabel.replace(/^Cap \+ /, '')}
                        </span>
                        <img
                            src={stempelOverlaySrc}
                            alt="Pratinjau Stempel"
                            className="pointer-events-none absolute -left-3 -top-2 z-[10] h-9 w-9 object-contain opacity-85 mix-blend-multiply -rotate-6"
                        />
                    </div>
                ) : (
                    <span className="text-rose-700 font-bold text-[10px] bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded inline-flex items-center gap-1 justify-center">
                        <i className="bi bi-patch-check-fill"></i>
                        <span>{placeholderLabel}</span>
                    </span>
                )}
            </div>
        );
    }

    // Fallback aset umum lainnya ($ASSET_...)
    if (primarySrc) {
        return (
            <div className="flex items-center justify-center p-0.5 w-full h-full">
                <img
                    src={primarySrc}
                    alt={rawTag}
                    onLoad={onImageLoad}
                    className={`object-contain ${mode === 'print' ? 'max-h-14 max-w-[110px]' : 'max-h-10 max-w-[90px]'}`}
                />
            </div>
        );
    }
    if (mode === 'print') return null;
    return (
        <span className="text-rose-500 italic text-[10px] font-mono bg-rose-50 px-1 rounded border border-rose-100">
            [{placeholderLabel}]
        </span>
    );
};
