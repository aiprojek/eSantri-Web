import React, { useEffect, useState } from 'react';
import { ResolvedCellMediaVisual } from '../../utils/raporPlaceholderResolver';
import {
    getCachedTransparentInkAsset,
    InkAssetKind,
    prepareTransparentInkAsset,
} from '../../utils/imageOptimizer';

interface RaporSignatureStampMediaProps {
    visual: ResolvedCellMediaVisual;
    mode: 'print' | 'canvas';
    onImageLoad?: () => void;
}

const STAMP_SIZE_PX: Record<'print' | 'canvas', Record<'sm' | 'md' | 'lg', number>> = {
    print: {
        sm: 52,
        md: 66,
        lg: 80,
    },
    canvas: {
        sm: 40,
        md: 50,
        lg: 60,
    },
};

const TTD_SIZE_PX: Record<'print' | 'canvas', Record<'sm' | 'md' | 'lg', { maxH: number; maxW: number }>> = {
    print: {
        sm: { maxH: 48, maxW: 112 },
        md: { maxH: 58, maxW: 132 },
        lg: { maxH: 68, maxW: 150 },
    },
    canvas: {
        sm: { maxH: 38, maxW: 92 },
        md: { maxH: 44, maxW: 108 },
        lg: { maxH: 52, maxW: 120 },
    },
};

/**
 * Transformasi posisi stempel relatif terhadap jangkar di badan atas-tengah TTD (`left: 50%`, `top: 42%`).
 * Titik vertikal 42% + translateY(-56%) menempatkan cap stempel menimpa bagian atas-tengah goresan TTD
 * sebagaimana lazimnya rapor/ijazah Indonesia (tidak menggantung turun menabrak garis nama pejabat di bawah TTD).
 */
const STAMP_OFFSET_TRANSFORMS: Record<'left' | 'center' | 'right', string> = {
    left: 'translate(-78%, -56%) rotate(-5deg)',
    center: 'translate(-50%, -56%) rotate(-3deg)',
    right: 'translate(-22%, -56%) rotate(4deg)',
};

function useTransparentInkAsset(
    rawSrc: string | null | undefined,
    inkKind: InkAssetKind | null
): { src: string | null; isTransparent: boolean } {
    const cachedInitial = rawSrc && inkKind ? getCachedTransparentInkAsset(rawSrc, inkKind) : null;
    const [processed, setProcessed] = useState<{
        key: string;
        dataUrl: string;
    } | null>(() =>
        rawSrc && inkKind && cachedInitial
            ? { key: `${inkKind}::${rawSrc}`, dataUrl: cachedInitial }
            : null
    );

    useEffect(() => {
        if (!rawSrc || !inkKind) {
            setProcessed(null);
            return;
        }
        const targetKey = `${inkKind}::${rawSrc}`;
        const syncHit = getCachedTransparentInkAsset(rawSrc, inkKind);
        if (syncHit) {
            setProcessed(prev => (prev?.key === targetKey && prev.dataUrl === syncHit ? prev : { key: targetKey, dataUrl: syncHit }));
            return;
        }

        let cancelled = false;
        prepareTransparentInkAsset(rawSrc, inkKind).then(resultUrl => {
            if (!cancelled) {
                setProcessed({ key: targetKey, dataUrl: resultUrl });
            }
        });
        return () => {
            cancelled = true;
        };
    }, [rawSrc, inkKind]);

    if (!rawSrc) return { src: null, isTransparent: false };
    if (!inkKind) return { src: rawSrc, isTransparent: false };

    const targetKey = `${inkKind}::${rawSrc}`;
    const directCached = getCachedTransparentInkAsset(rawSrc, inkKind);
    const activeTransparentUrl =
        directCached || (processed?.key === targetKey ? processed.dataUrl : null);

    if (activeTransparentUrl && activeTransparentUrl.startsWith('data:image/png')) {
        return { src: activeTransparentUrl, isTransparent: true };
    }
    return { src: activeTransparentUrl || rawSrc, isTransparent: false };
}

export const RaporSignatureStampMedia: React.FC<RaporSignatureStampMediaProps> = ({
    visual,
    mode,
    onImageLoad,
}) => {
    const { kind, primarySrc, stempelOverlaySrc, position, size, showWhenTtdEmpty, placeholderLabel, rawTag } = visual;

    const primaryInkKind: InkAssetKind | null =
        kind === 'stempel_only'
            ? 'stempel'
            : kind === 'ttd_only' || kind === 'ttd_with_stempel'
            ? 'ttd'
            : null;

    const cleanPrimary = useTransparentInkAsset(primarySrc, primaryInkKind);
    const cleanStamp = useTransparentInkAsset(stempelOverlaySrc, 'stempel');

    const stampPx = STAMP_SIZE_PX[mode][size];
    const ttdDim = TTD_SIZE_PX[mode][size];

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
                <div
                    className="flex items-center justify-center p-0.5 w-full h-full"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                    <img
                        src={cleanPrimary.src || primarySrc}
                        alt={rawTag}
                        onLoad={onImageLoad}
                        className="object-contain"
                        style={{
                            width: `${stampPx}px`,
                            height: `${stampPx}px`,
                            objectFit: 'contain',
                            opacity: 0.92,
                            mixBlendMode: cleanPrimary.isTransparent ? 'normal' : 'multiply',
                        }}
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
                <div
                    className="flex items-center justify-center p-0.5 w-full h-full"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                    <img
                        src={cleanPrimary.src || primarySrc}
                        alt={rawTag}
                        onLoad={onImageLoad}
                        className="object-contain"
                        style={{
                            maxHeight: `${ttdDim.maxH}px`,
                            maxWidth: `${ttdDim.maxW}px`,
                            objectFit: 'contain',
                            mixBlendMode: cleanPrimary.isTransparent ? 'normal' : 'multiply',
                        }}
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
        // 1. TTD tersedia & Stempel tersedia -> Tumpuk autentik (Layer 2 Stempel menimpa DI ATAS Layer 1 TTD)
        if (primarySrc && stempelOverlaySrc) {
            return (
                <div
                    className="select-none py-0.5"
                    style={{
                        position: 'relative',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '100%',
                        height: '100%',
                        overflow: 'visible',
                    }}
                >
                    <div
                        style={{
                            position: 'relative',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            isolation: 'isolate',
                            overflow: 'visible',
                        }}
                    >
                        {/* Layer 1 (Bawah): Tanda Tangan Pejabat */}
                        <img
                            src={cleanPrimary.src || primarySrc}
                            alt="Tanda Tangan"
                            onLoad={onImageLoad}
                            style={{
                                position: 'relative',
                                zIndex: 1,
                                display: 'block',
                                maxHeight: `${ttdDim.maxH}px`,
                                maxWidth: `${ttdDim.maxW}px`,
                                objectFit: 'contain',
                                mixBlendMode: cleanPrimary.isTransparent ? 'normal' : 'multiply',
                            }}
                        />
                        {/* Layer 2 (Atas): Cap Stempel Resmi menimpa di atas goresan TTD */}
                        <img
                            src={cleanStamp.src || stempelOverlaySrc}
                            alt="Stempel Resmi"
                            onLoad={onImageLoad}
                            style={{
                                position: 'absolute',
                                left: '50%',
                                top: '42%',
                                zIndex: 10,
                                width: `${stampPx}px`,
                                height: `${stampPx}px`,
                                maxWidth: 'none',
                                maxHeight: 'none',
                                objectFit: 'contain',
                                pointerEvents: 'none',
                                opacity: 0.92,
                                mixBlendMode: cleanStamp.isTransparent ? 'normal' : 'multiply',
                                transform: STAMP_OFFSET_TRANSFORMS[position],
                            }}
                        />
                    </div>
                </div>
            );
        }

        // 2. TTD tersedia namun Stempel belum diunggah -> Tampilkan TTD (+ badge indikator kecil di mode desain)
        if (primarySrc && !stempelOverlaySrc) {
            return (
                <div
                    className="p-0.5"
                    style={{
                        position: 'relative',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '100%',
                        height: '100%',
                    }}
                >
                    <img
                        src={cleanPrimary.src || primarySrc}
                        alt="Tanda Tangan"
                        onLoad={onImageLoad}
                        style={{
                            maxHeight: `${ttdDim.maxH}px`,
                            maxWidth: `${ttdDim.maxW}px`,
                            objectFit: 'contain',
                            mixBlendMode: cleanPrimary.isTransparent ? 'normal' : 'multiply',
                        }}
                    />
                    {mode === 'canvas' && (
                        <span
                            className="text-[8px] font-bold bg-rose-100 text-rose-700 border border-rose-300 px-1 rounded shadow-2xs"
                            style={{ position: 'absolute', top: '-4px', right: '4px', zIndex: 12 }}
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
                const printStampPx = STAMP_SIZE_PX.print[size];
                return (
                    <div
                        className="flex items-center justify-center p-0.5 w-full h-full"
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                        <img
                            src={cleanStamp.src || stempelOverlaySrc}
                            alt="Stempel Resmi"
                            onLoad={onImageLoad}
                            style={{
                                width: `${printStampPx}px`,
                                height: `${printStampPx}px`,
                                objectFit: 'contain',
                                opacity: 0.92,
                                mixBlendMode: cleanStamp.isTransparent ? 'normal' : 'multiply',
                            }}
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
                    <div
                        style={{
                            position: 'relative',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            isolation: 'isolate',
                            padding: '2px 0',
                        }}
                    >
                        <span
                            className="text-purple-700 font-bold text-[9px] bg-purple-50/90 border border-dashed border-purple-300 px-2 py-1 rounded inline-flex items-center gap-1"
                            style={{ position: 'relative', zIndex: 1 }}
                        >
                            <i className="bi bi-pen-fill"></i> {placeholderLabel.replace(/^Cap \+ /, '')}
                        </span>
                        <img
                            src={cleanStamp.src || stempelOverlaySrc}
                            alt="Pratinjau Stempel"
                            style={{
                                position: 'absolute',
                                left: '-12px',
                                top: '-8px',
                                zIndex: 10,
                                width: '36px',
                                height: '36px',
                                maxWidth: 'none',
                                objectFit: 'contain',
                                pointerEvents: 'none',
                                opacity: 0.9,
                                mixBlendMode: cleanStamp.isTransparent ? 'normal' : 'multiply',
                                transform: 'rotate(-6deg)',
                            }}
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

