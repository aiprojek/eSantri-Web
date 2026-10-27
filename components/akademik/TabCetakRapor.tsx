import React, { useState, useMemo, useEffect, useRef, useLayoutEffect } from 'react';
import { useAppContext } from '../../AppContext';
import { useSantriContext } from '../../contexts/SantriContext';
import { RaporLengkapTemplate } from '../reports/modules/AcademicReports';
import { printToPdfNative } from '../../utils/pdfGenerator';
import { Santri, RaporTemplate, RaporRecord, DigitalAsset, RaporSheet, PageFitCount } from '../../types';
import { PrintHeader } from '../common/PrintHeader';
import { MobileFilterDrawer } from '../common/MobileFilterDrawer';
import { useAcademicPeriodFilter } from '../../hooks/useAcademicPeriodFilter';
import { getRaporRecordsByPeriod } from '../../services/academicQueries';
import { resolveRaporText, isMediaTag, getMediaTagImageSrc, templateHasBuiltInBiodata } from '../../utils/raporPlaceholderResolver';
import { applyCellTextTransform } from '../../utils/raporFormulaUtils';
import {
    formatLocalDate,
    parseLocalDateSafe,
    resolveTempatRapor,
    formatTanggalDokumen,
    getHijriDate,
    DateFormatMode
} from '../../utils/formatters';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { buildRombelLegerData, StudentLegerRow } from '../../services/raporCalculationService';
import { getTemplateSheets } from '../../services/raporExcelService';
import { RaporTitleEditModal } from './modals/RaporTitleEditModal';
import { RaporWhatsAppModal } from './modals/RaporWhatsAppModal';
import {
    RAPOR_CREDIT_FOOTER_TEXT,
    normalizeRaporPageSetup,
    buildPageSetupStateFromPreset,
    formatPageSetupBadgeLabel,
    getRaporPaperMetrics,
    getEffectivePopulatedColCount,
    computePaginatedRaporLayout,
    getRenderableRowCellsForPage,
    PaginatedRaporPage,
    PaginatedSliceCell,
    RaporPageScalePreset,
    RaporPageSetupInput
} from '../../utils/raporPageLayout';

export interface TabCetakRaporProps {
    onNavigateToTab?: (tab: string, rombelId?: number) => void;
}

export type RankingDisplayLimit = 'all' | '3' | '5' | '10' | 'none';

export const getEffectiveRanking = (rawRank: number | undefined, limit: RankingDisplayLimit): number | undefined => {
    if (!rawRank || rawRank <= 0) return undefined;
    if (limit === 'none') return undefined;
    if (limit === '3' && rawRank > 3) return undefined;
    if (limit === '5' && rawRank > 5) return undefined;
    if (limit === '10' && rawRank > 10) return undefined;
    return rawRank;
};

// --- HELPER COMPONENT: DYNAMIC RENDERER ---
interface DynamicRaporPreviewProps {
    template: RaporTemplate;
    targetSheetId?: string;
    santri: Santri;
    record: RaporRecord | null;
    settings: any;
    digitalAssets?: DigitalAsset[];
    tanggalRapor?: string;
    tempatRapor?: string;
    formatTanggalRapor?: DateFormatMode;
    manualHijriRapor?: string;
    tahunAjaran?: string;
    semester?: 'Ganjil' | 'Genap';
    calculation?: {
        totalNilai?: number;
        rataRata?: number;
        ranking?: number;
        totalSantri?: number;
        predikat?: string;
        classAverages?: Record<string, number>;
        classOverallAverage?: number;
    };
    cohortRecords?: RaporRecord[];
    paperSize?: 'A4' | 'F4';
    orientation?: 'portrait' | 'landscape';
    showKop?: boolean;
    marginMode?: 'normal' | 'narrow' | 'none';
    showJudul?: boolean;
    showBiodataHeader?: boolean;
    fitToPage?: boolean;
    fitWidthPages?: PageFitCount;
    fitHeightPages?: PageFitCount;
    repeatHeaderRows?: boolean;
    printScale?: number | 'auto';
    isLastDocument?: boolean;
}

interface ScaledRaporSheetProps {
    sheet: RaporSheet;
    sheetsCount: number;
    isLastSheet: boolean;
    isLastDocument: boolean;
    template: RaporTemplate;
    santri: Santri;
    settings: any;
    customData: Record<string, any>;
    resolveContext: any;
    calculation?: DynamicRaporPreviewProps['calculation'];
    paperSize: 'A4' | 'F4';
    orientation: 'portrait' | 'landscape';
    showKop: boolean;
    marginMode: 'normal' | 'narrow' | 'none';
    showJudul?: boolean;
    shouldShowBiodataHeader: boolean;
    fitToPage: boolean;
    fitWidthPages?: PageFitCount;
    fitHeightPages?: PageFitCount;
    repeatHeaderRows?: boolean;
    printScale: number | 'auto';
}

const ScaledRaporSheet: React.FC<ScaledRaporSheetProps> = ({
    sheet,
    sheetsCount,
    isLastSheet,
    isLastDocument,
    template,
    santri,
    settings,
    customData,
    resolveContext,
    calculation,
    paperSize,
    orientation,
    showKop,
    marginMode,
    showJudul,
    shouldShowBiodataHeader,
    fitToPage,
    fitWidthPages,
    fitHeightPages,
    repeatHeaderRows,
    printScale
}) => {
    const measureContainerRef = useRef<HTMLDivElement>(null);
    const measureHeaderRef = useRef<HTMLDivElement>(null);
    const [measuredMetrics, setMeasuredMetrics] = useState<{
        headerHeight: number;
        rowHeights: number[];
    } | null>(null);

    const colCount = sheet.colCount || sheet.cells?.[0]?.length || 0;
    const sheetColWidths = useMemo(() => {
        const widths: number[] = [];
        for (let c = 0; c < colCount; c++) {
            let colW = 100;
            let found = false;
            if (sheet.cells) {
                for (let r = 0; r < sheet.cells.length; r++) {
                    const cell = sheet.cells[r]?.[c];
                    if (cell && !cell.hidden && (!cell.colSpan || cell.colSpan === 1)) {
                        if (typeof cell.width === 'number' && cell.width > 0) {
                            colW = cell.width;
                            found = true;
                            break;
                        }
                    }
                }
                if (!found) {
                    for (let r = 0; r < sheet.cells.length; r++) {
                        const cell = sheet.cells[r]?.[c];
                        if (cell && typeof cell.width === 'number' && cell.width > 0) {
                            colW = cell.width;
                            break;
                        }
                    }
                }
            }
            widths.push(colW);
        }
        return widths;
    }, [sheet.cells, colCount]);

    const sheetRowHeights = useMemo(() => {
        if (!sheet.cells) return [];
        return sheet.cells.map(row => {
            for (let c = 0; c < row.length; c++) {
                const cell = row[c];
                if (cell && !cell.hidden && (!cell.rowSpan || cell.rowSpan === 1) && typeof cell.height === 'number' && cell.height > 0) {
                    return cell.height;
                }
            }
            for (let c = 0; c < row.length; c++) {
                const cell = row[c];
                if (cell && typeof cell.height === 'number' && cell.height > 0) {
                    return cell.height;
                }
            }
            return undefined;
        });
    }, [sheet.cells]);

    const pageSetup = useMemo(
        () =>
            normalizeRaporPageSetup({
                paperSize,
                orientation,
                marginMode,
                fitToPage,
                fitWidthPages,
                fitHeightPages,
                printScale,
                repeatHeaderRows
            }),
        [paperSize, orientation, marginMode, fitToPage, fitWidthPages, fitHeightPages, printScale, repeatHeaderRows]
    );

    const paperMetrics = useMemo(
        () => getRaporPaperMetrics(pageSetup.paperSize, pageSetup.orientation, pageSetup.marginMode),
        [pageSetup.paperSize, pageSetup.orientation, pageSetup.marginMode]
    );

    const effectiveColCount = useMemo(
        () => Math.max(1, getEffectivePopulatedColCount(sheet.cells || [], Math.max(1, colCount))),
        [sheet.cells, colCount]
    );
    const activeColWidths = useMemo(
        () => sheetColWidths.slice(0, effectiveColCount),
        [sheetColWidths, effectiveColCount]
    );
    const totalColWidth = activeColWidths.reduce((a, b) => a + b, 0) || paperMetrics.availableW;
    const measureWidth = pageSetup.fitWidthPages === 1
        ? Math.max(paperMetrics.availableW, totalColWidth)
        : totalColWidth;

    // Evaluasi berantai untuk sel rumus yang juga diberi kode variabel ($KEY) agar bisa direferensikan oleh rumus lain (misal =TERBILANG($SUBTOTAL))
    const sheetResolveContext = useMemo(() => {
        const extraVars: Record<string, any> = { ...(resolveContext?.extraVars || {}), ...customData };
        const ctx = { ...resolveContext, extraVars, sheetCells: sheet.cells };
        if (sheet.cells) {
            for (let pass = 0; pass < 2; pass++) {
                for (const row of sheet.cells) {
                    for (const cell of row) {
                        if (!cell || cell.hidden) continue;
                        if (cell.type === 'formula' && cell.key && cell.value) {
                            const rawExpr = cell.value.trim().startsWith('=') ? cell.value : `=${cell.value.trim()}`;
                            const val = resolveRaporText(rawExpr, { ...ctx, currentCellCoord: { r: cell.row, c: cell.col } });
                            extraVars[cell.key] = val;
                        }
                    }
                }
            }
        }
        return ctx;
    }, [sheet.cells, customData, resolveContext]);

    const hasTitleInGrid = useMemo(() => {
        if (!sheet.cells || sheet.cells.length === 0) return false;
        return sheet.cells.slice(0, 3).some(row =>
            row.some(cell => {
                if (!cell || !cell.value) return false;
                const up = cell.value.toUpperCase();
                return up.includes('RAPOR') || up.includes('LAPORAN HASIL') || up.includes('CAPAIAN KOMPETENSI') || up.includes('HASIL EVALUASI');
            })
        );
    }, [sheet.cells]);

    const shouldShowTitle = showJudul !== undefined
        ? showJudul
        : (sheet.showJudul !== undefined
            ? sheet.showJudul
            : (template.showJudul !== undefined ? template.showJudul : !hasTitleInGrid));

    const rawTitle = sheet.customTitle !== undefined
        ? sheet.customTitle
        : (template.customTitle !== undefined ? template.customTitle : (shouldShowTitle ? (sheet.name || template.name) : ''));

    const resolvedTitle = useMemo(
        () => (rawTitle ? resolveRaporText(rawTitle, sheetResolveContext) : undefined),
        [rawTitle, sheetResolveContext]
    );

    const renderDocumentHeader = () => {
        if (!showKop && !shouldShowBiodataHeader) return null;
        return (
            <div>
                {showKop && (
                    <PrintHeader
                        settings={settings}
                        title={shouldShowTitle ? resolvedTitle : undefined}
                    />
                )}
                {shouldShowBiodataHeader && (
                    <div className="mb-3">
                        <table className="w-full text-sm font-medium mb-3">
                            <tbody>
                                <tr>
                                    <td className="w-24 font-bold">Nama</td>
                                    <td>: {santri.namaLengkap}</td>
                                    <td className="w-24 text-right font-bold">NIS</td>
                                    <td className="w-32 text-right">: {santri.nis}</td>
                                </tr>
                                <tr>
                                    <td className="w-24 font-bold">Rombel</td>
                                    <td>: {settings.rombel.find((r: any) => r.id === santri.rombelId)?.nama || '-'}</td>
                                    <td className="w-24 text-right font-bold">{sheetsCount > 1 ? 'Format / Lembar' : 'Peringkat'}</td>
                                    <td className="w-32 text-right font-semibold">
                                        {sheetsCount > 1
                                            ? `: ${sheet.name}`
                                            : `: ${calculation?.ranking ? `${calculation.ranking} / ${calculation.totalSantri || '-'}` : '-'}`
                                        }
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        );
    };

    const triggerMeasure = () => {
        const container = measureContainerRef.current;
        if (!container) return;

        // Normalize against any ancestor CSS transform (e.g. previewZoom scale) so measurements remain 100% unscaled
        const rectW = container.getBoundingClientRect().width;
        const layoutW = container.offsetWidth || measureWidth;
        const zoomFactor = rectW > 0 && layoutW > 0 ? rectW / layoutW : 1;

        const hdrEl = measureHeaderRef.current;
        const hdrRectH = hdrEl ? hdrEl.getBoundingClientRect().height : 0;
        const rawHdrH = hdrEl
            ? (zoomFactor > 0 && hdrRectH > 0 ? hdrRectH / zoomFactor : hdrEl.offsetHeight)
            : 0;
        const nextHeaderH = Math.ceil(rawHdrH);

        const trNodes = container.querySelectorAll<HTMLTableRowElement>('tr[data-measure-row]');
        const nextRowHeights: number[] = (sheet.cells || []).map((_, rIdx) => sheetRowHeights[rIdx] ?? 30);
        trNodes.forEach((tr) => {
            const idx = Number(tr.getAttribute('data-measure-row'));
            if (!Number.isNaN(idx)) {
                const rectH = tr.getBoundingClientRect().height;
                const unscaledH = zoomFactor > 0 && rectH > 0 ? rectH / zoomFactor : tr.offsetHeight;
                if (unscaledH > 0) {
                    nextRowHeights[idx] = Math.max(sheetRowHeights[idx] ?? 0, Math.ceil(unscaledH));
                }
            }
        });

        setMeasuredMetrics((prev) => {
            if (
                prev &&
                Math.abs(prev.headerHeight - nextHeaderH) <= 1 &&
                prev.rowHeights.length === nextRowHeights.length &&
                prev.rowHeights.every((v, i) => Math.abs(v - nextRowHeights[i]) <= 1)
            ) {
                return prev;
            }
            return { headerHeight: nextHeaderH, rowHeights: nextRowHeights };
        });
    };

    useLayoutEffect(() => {
        triggerMeasure();
        let ro: ResizeObserver | null = null;
        const container = measureContainerRef.current;
        if (typeof ResizeObserver !== 'undefined' && container) {
            ro = new ResizeObserver(() => triggerMeasure());
            ro.observe(container);
        }
        const imgNodes = container ? Array.from(container.querySelectorAll('img')) : [];
        const onImgLoad = () => triggerMeasure();
        imgNodes.forEach(img => {
            if (!img.complete) {
                img.addEventListener('load', onImgLoad);
                img.addEventListener('error', onImgLoad);
            }
        });
        return () => {
            if (ro) ro.disconnect();
            imgNodes.forEach(img => {
                img.removeEventListener('load', onImgLoad);
                img.removeEventListener('error', onImgLoad);
            });
        };
    }, [sheet, measureWidth, showKop, shouldShowTitle, resolvedTitle, shouldShowBiodataHeader, santri.id, sheetRowHeights]);

    const fallbackHeaderH = (showKop ? 150 : 0) + (shouldShowBiodataHeader ? 65 : 0);
    const effectiveHeaderH = measuredMetrics ? measuredMetrics.headerHeight : fallbackHeaderH;
    const effectiveRowHeights = useMemo(
        () =>
            measuredMetrics?.rowHeights && measuredMetrics.rowHeights.length === (sheet.cells?.length || 0)
                ? measuredMetrics.rowHeights
                : sheetRowHeights.map(h => h ?? 30),
        [measuredMetrics, sheetRowHeights, sheet.cells]
    );

    const paginatedLayout = useMemo(
        () =>
            computePaginatedRaporLayout({
                cells: sheet.cells || [],
                colWidths: sheetColWidths,
                rowHeights: effectiveRowHeights,
                headerHeight: effectiveHeaderH,
                paperMetrics,
                pageSetup
            }),
        [sheet.cells, sheetColWidths, effectiveRowHeights, effectiveHeaderH, paperMetrics, pageSetup]
    );

    const badgeText = formatPageSetupBadgeLabel(pageSetup, paginatedLayout.scale);

    const renderSliceCellTd = (sliceItem: PaginatedSliceCell, rIdx: number, keyPrefix: string) => {
        const { cell, masterC, colSpan, rowSpan, borders } = sliceItem;
        const rH = sheetRowHeights[rIdx];
        let renderedContent: React.ReactNode = cell.value;
        let isMediaElement = false;

        if ((cell.type === 'data' || cell.type === 'label') && isMediaTag(cell.value)) {
            isMediaElement = true;
            const imgSrc = getMediaTagImageSrc(cell.value, sheetResolveContext);
            const upperCellVal = (cell.value || '').toUpperCase();
            if (imgSrc) {
                const isStempel = upperCellVal.includes('STEMPEL');
                const isTtd = upperCellVal.includes('TTD');
                renderedContent = (
                    <div className="flex items-center justify-center p-0.5 w-full h-full">
                        <img
                            src={imgSrc}
                            alt={cell.value}
                            onLoad={triggerMeasure}
                            className={`object-contain ${isStempel ? 'max-h-16 max-w-[90px] opacity-90' : isTtd ? 'max-h-14 max-w-[120px]' : 'max-h-12 max-w-[100px]'}`}
                        />
                    </div>
                );
            } else {
                renderedContent = <span className="text-[10px] text-gray-400 italic">[{cell.value.replace('$', '')}]</span>;
            }
        } else if (cell.type === 'data') {
            renderedContent = resolveRaporText(cell.value, { ...sheetResolveContext, currentCellCoord: { r: rIdx, c: masterC } });
        } else if (cell.type === 'formula') {
            if (cell.value && cell.value.trim() !== '') {
                const rawExpr = cell.value.trim().startsWith('=') ? cell.value : `=${cell.value.trim()}`;
                renderedContent = resolveRaporText(rawExpr, { ...sheetResolveContext, currentCellCoord: { r: rIdx, c: masterC } });
            } else if (cell.key && customData[cell.key] !== undefined && customData[cell.key] !== '') {
                renderedContent = customData[cell.key];
            } else {
                renderedContent = '-';
            }
        } else if ((cell.type === 'input' || cell.type === 'dropdown') && cell.key) {
            renderedContent = (customData[cell.key] !== undefined && customData[cell.key] !== '')
                ? customData[cell.key]
                : resolveRaporText(cell.value, { ...sheetResolveContext, currentCellCoord: { r: rIdx, c: masterC } });
        } else {
            renderedContent = resolveRaporText(cell.value, { ...sheetResolveContext, currentCellCoord: { r: rIdx, c: masterC } });
        }

        if (!isMediaElement && (typeof renderedContent === 'string' || typeof renderedContent === 'number') && cell.textTransform && cell.textTransform !== 'none') {
            renderedContent = applyCellTextTransform(String(renderedContent), cell.textTransform);
        }

        const isLogoMedia = typeof cell.value === 'string' && (cell.value.includes('LOGO_PONPES') || cell.value.includes('LOGO_YAYASAN') || cell.value === '$LOGO');
        const hasCustomBg = Boolean(cell.backgroundColor && cell.backgroundColor !== 'transparent' && cell.backgroundColor !== '#ffffff');
        const effectiveBg = hasCustomBg ? cell.backgroundColor : 'transparent';
        const effectiveFontWeight = cell.bold ? 'bold' : 'normal';
        const effectiveFontSize = cell.fontSize || 11;
        const hAlign = cell.align || 'center';
        const vAlign = cell.verticalAlign || 'middle';
        const textWrap = cell.textWrap || 'wrap';
        const isFloat = textWrap === 'float' && !isMediaElement;
        const isClip = textWrap === 'clip';

        let cellWidthPx = 0;
        for (let i = 0; i < colSpan; i++) {
            cellWidthPx += sheetColWidths[masterC + i] || 100;
        }

        let cellHeightPx: number | undefined = undefined;
        if (rH !== undefined || cell.height !== undefined) {
            let sumH = 0;
            for (let i = 0; i < rowSpan; i++) {
                sumH += sheetRowHeights[rIdx + i] ?? cell.height ?? 30;
            }
            cellHeightPx = sumH;
        }

        const upperToken = `${cell.value || ''} ${cell.key || ''}`.toUpperCase();
        const isExpandableDynamic = (upperToken.includes('DESKRIPSI') || upperToken.includes('CATATAN')) && !isClip && !isFloat && (cellHeightPx === undefined || cellHeightPx >= 28);
        const cellPadding = cellWidthPx < 22 ? '1px' : '2px 4px';

        const tdStyle: React.CSSProperties = {
            borderTop: (!isLogoMedia && borders.top) ? '1px solid black' : 'none',
            borderRight: (!isLogoMedia && borders.right) ? '1px solid black' : 'none',
            borderBottom: (!isLogoMedia && borders.bottom) ? '1px solid black' : 'none',
            borderLeft: (!isLogoMedia && borders.left) ? '1px solid black' : 'none',
            textAlign: hAlign,
            verticalAlign: vAlign,
            height: cellHeightPx ? `${cellHeightPx}px` : undefined,
            backgroundColor: effectiveBg,
            fontWeight: effectiveFontWeight,
            fontStyle: cell.italic ? 'italic' : undefined,
            color: cell.color || undefined,
            fontSize: `${effectiveFontSize}px`,
            padding: 0,
            boxSizing: 'border-box',
            overflow: isFloat ? 'visible' : 'hidden',
            position: isFloat ? 'relative' : undefined
        };

        return (
            <td
                key={`${keyPrefix}-${rIdx}-${sliceItem.renderCol}`}
                colSpan={colSpan > 1 ? colSpan : undefined}
                rowSpan={rowSpan > 1 ? rowSpan : undefined}
                style={tdStyle}
            >
                {isFloat ? (
                    <div
                        style={{
                            position: 'relative',
                            width: '100%',
                            height: cellHeightPx ? `${cellHeightPx}px` : '100%',
                            minHeight: cellHeightPx ? `${cellHeightPx}px` : '22px',
                            overflow: 'visible',
                            zIndex: 20
                        }}
                    >
                        <div
                            style={{
                                position: 'absolute',
                                whiteSpace: 'pre',
                                left: hAlign === 'left' ? '4px' : hAlign === 'center' ? '50%' : undefined,
                                right: hAlign === 'right' ? '4px' : undefined,
                                top: vAlign === 'top' ? '2px' : vAlign === 'bottom' ? undefined : '50%',
                                bottom: vAlign === 'bottom' ? '2px' : undefined,
                                transform:
                                    hAlign === 'center' && vAlign === 'middle'
                                        ? 'translate(-50%, -50%)'
                                        : hAlign === 'center'
                                        ? 'translateX(-50%)'
                                        : vAlign === 'middle'
                                        ? 'translateY(-50%)'
                                        : undefined,
                                textAlign: hAlign,
                                lineHeight: 1.25
                            }}
                        >
                            {renderedContent}
                        </div>
                    </div>
                ) : (
                    <div
                        style={{
                            width: '100%',
                            height: (!isExpandableDynamic && cellHeightPx) ? `${cellHeightPx}px` : '100%',
                            minHeight: (isExpandableDynamic && cellHeightPx) ? `${cellHeightPx}px` : undefined,
                            maxHeight: (!isExpandableDynamic && cellHeightPx) ? `${cellHeightPx}px` : undefined,
                            padding: isMediaElement ? '1px' : cellPadding,
                            boxSizing: 'border-box',
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: hAlign === 'left' ? 'flex-start' : hAlign === 'right' ? 'flex-end' : 'center',
                            textAlign: hAlign,
                            lineHeight: 1.25
                        }}
                    >
                        <div
                            style={{
                                width: '100%',
                                marginTop: vAlign === 'top' ? 0 : 'auto',
                                marginBottom: vAlign === 'bottom' ? 0 : 'auto',
                                whiteSpace: isClip ? 'pre' : 'pre-wrap',
                                wordBreak: isClip ? 'normal' : 'break-word',
                                overflowWrap: isClip ? 'normal' : 'anywhere',
                                overflow: isClip ? 'hidden' : undefined,
                                textAlign: hAlign
                            }}
                        >
                            {renderedContent}
                        </div>
                    </div>
                )}
            </td>
        );
    };

    const fullMeasurePage: PaginatedRaporPage = {
        pageIndex: 0,
        pageNumber: 1,
        totalPages: 1,
        vIndex: 0,
        hIndex: 0,
        totalVPages: 1,
        totalHPages: 1,
        includeDocHeader: true,
        headerGroupRows: [],
        startRow: 0,
        endRow: Math.max(0, (sheet.cells?.length || 1) - 1),
        startCol: 0,
        endCol: Math.max(0, effectiveColCount - 1),
        sliceColWidths: activeColWidths,
        sliceNaturalWidth: measureWidth,
        sliceNaturalHeight: 0,
        stretchColsToFillWidth: totalColWidth <= paperMetrics.availableW
    };

    return (
        <div className="rapor-sheet-group space-y-6 print:block print:space-y-0">
            {/* Offscreen Unscaled Measurement Container */}
            <div
                ref={measureContainerRef}
                aria-hidden="true"
                data-html2canvas-ignore="true"
                data-rapor-measure-only="true"
                className="no-print text-black font-sans text-sm"
                style={{
                    position: 'fixed',
                    left: '-99999px',
                    top: 0,
                    width: `${measureWidth}px`,
                    visibility: 'hidden',
                    pointerEvents: 'none',
                    zIndex: -50
                }}
            >
                <div ref={measureHeaderRef}>{renderDocumentHeader()}</div>
                <table className="w-full border-collapse table-fixed">
                    <colgroup>
                        {activeColWidths.map((w, cIdx) => (
                            <col
                                key={cIdx}
                                style={{
                                    width: totalColWidth > paperMetrics.availableW
                                        ? `${w}px`
                                        : `${((w / Math.max(1, totalColWidth)) * 100).toFixed(3)}%`
                                }}
                            />
                        ))}
                    </colgroup>
                    <tbody>
                        {(sheet.cells || []).map((_, rIdx) => {
                            const rH = sheetRowHeights[rIdx];
                            const rowCells = getRenderableRowCellsForPage(sheet.cells, rIdx, fullMeasurePage, false);
                            return (
                                <tr key={rIdx} data-measure-row={rIdx} style={{ height: rH ? `${rH}px` : undefined }}>
                                    {rowCells.map(sc => renderSliceCellTd(sc, rIdx, 'measure'))}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Discrete Physical Paper Pages */}
            {paginatedLayout.pages.map((page, pageIdx) => {
                const isVeryLastOutputPage = isLastDocument && isLastSheet && pageIdx === paginatedLayout.pages.length - 1;
                const scaledSliceW = Math.floor(page.sliceNaturalWidth * paginatedLayout.scale);
                const viewportMaxH = paperMetrics.availableH;
                const footerBottomPx = Math.max(4, Math.min(10, Math.floor(paperMetrics.padPx * 0.35)));
                const isScaled = paginatedLayout.scale !== 1;
                const sliceSumCols = page.sliceColWidths.reduce((a, b) => a + b, 0) || 1;
                const rowIndices: number[] = [];
                if (page.endRow >= page.startRow) {
                    for (let r = page.startRow; r <= page.endRow; r++) {
                        rowIndices.push(r);
                    }
                }

                return (
                    <div
                        key={`${sheet.id}-page-${page.pageIndex}`}
                        data-print-orientation={paperMetrics.orientation}
                        className={`bg-white text-black font-sans text-sm printable-content-wrapper rapor-exact-page ${paginatedLayout.isSinglePageFit ? 'rapor-fit-1-page' : ''} ${paperMetrics.orientation === 'landscape' ? 'print-landscape' : ''} shadow-md mx-auto relative ${paperMetrics.paddingClass} ${!isVeryLastOutputPage ? 'page-break-after' : ''}`}
                        style={{
                            width: paperMetrics.widthCss,
                            height: paperMetrics.heightCss,
                            minHeight: paperMetrics.heightCss,
                            maxHeight: paperMetrics.heightCss,
                            overflow: 'hidden',
                            pageBreakAfter: isVeryLastOutputPage ? 'auto' : 'always',
                            breakAfter: isVeryLastOutputPage ? 'auto' : 'page',
                            pageBreakInside: 'avoid',
                            breakInside: 'avoid',
                            boxSizing: 'border-box'
                        }}
                    >
                        {/* Screen-Only Metadata Line */}
                        <div className="no-print absolute top-2 right-4 text-[10px] text-slate-400 font-mono tabular-nums select-none flex items-center gap-1.5 z-30">
                            <span>{sheet.name}</span>
                            <span aria-hidden="true">·</span>
                            <span className="font-semibold text-slate-600">
                                Hal. {page.pageNumber}/{page.totalPages}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="text-teal-700 font-semibold">{badgeText}</span>
                        </div>

                        <div
                            className="rapor-scaled-viewport"
                            style={{
                                width: `${scaledSliceW}px`,
                                height: isScaled ? `${viewportMaxH}px` : undefined,
                                maxHeight: `${viewportMaxH}px`,
                                overflow: 'hidden',
                                margin: '0 auto',
                                position: 'relative'
                            }}
                        >
                            <div
                                className="flex flex-col justify-start"
                                style={{
                                    width: `${page.sliceNaturalWidth}px`,
                                    position: isScaled ? 'absolute' : 'relative',
                                    top: isScaled ? 0 : undefined,
                                    left: isScaled ? 0 : undefined,
                                    transform: isScaled ? `scale(${paginatedLayout.scale})` : undefined,
                                    transformOrigin: 'top left'
                                }}
                            >
                                {page.includeDocHeader && renderDocumentHeader()}

                                <table className="w-full border-collapse table-fixed">
                                    <colgroup>
                                        {page.sliceColWidths.map((w, cIdx) => (
                                            <col
                                                key={cIdx}
                                                style={{
                                                    width: page.stretchColsToFillWidth
                                                        ? `${((w / sliceSumCols) * 100).toFixed(3)}%`
                                                        : `${w}px`
                                                }}
                                            />
                                        ))}
                                    </colgroup>
                                    <tbody>
                                        {page.headerGroupRows.map((hrIdx) => {
                                            const rH = sheetRowHeights[hrIdx];
                                            const rowCells = getRenderableRowCellsForPage(sheet.cells, hrIdx, page, true);
                                            return (
                                                <tr key={`hdr-${hrIdx}`} style={{ breakInside: 'avoid', pageBreakInside: 'avoid', height: rH ? `${rH}px` : undefined }}>
                                                    {rowCells.map(sc => renderSliceCellTd(sc, hrIdx, `hdr-${page.pageIndex}`))}
                                                </tr>
                                            );
                                        })}
                                        {rowIndices.map((rIdx) => {
                                            const rH = sheetRowHeights[rIdx];
                                            const rowCells = getRenderableRowCellsForPage(sheet.cells, rIdx, page, false);
                                            return (
                                                <tr key={rIdx} style={{ breakInside: 'avoid', pageBreakInside: 'avoid', height: rH ? `${rH}px` : undefined }}>
                                                    {rowCells.map(sc => renderSliceCellTd(sc, rIdx, `pg-${page.pageIndex}`))}
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div
                            className={`border-t border-slate-300 pt-0.5 text-[8pt] text-slate-500 italic leading-tight select-none flex items-center ${
                                page.totalPages > 1 ? 'justify-between gap-2' : 'justify-center text-center'
                            }`}
                            style={{
                                position: 'absolute',
                                bottom: `${footerBottomPx}px`,
                                left: `${paperMetrics.padPx}px`,
                                right: `${paperMetrics.padPx}px`
                            }}
                        >
                            <span>{RAPOR_CREDIT_FOOTER_TEXT}</span>
                            {page.totalPages > 1 && (
                                <span className="not-italic text-[9px] tabular-nums shrink-0">
                                    {santri.namaLengkap} · Halaman {page.pageNumber} dari {page.totalPages}
                                </span>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

const DynamicRaporPreview: React.FC<DynamicRaporPreviewProps> = ({
    template,
    targetSheetId = 'all',
    santri,
    record,
    settings,
    digitalAssets = [],
    tanggalRapor,
    tempatRapor,
    formatTanggalRapor,
    manualHijriRapor,
    tahunAjaran,
    semester,
    calculation,
    cohortRecords,
    paperSize = 'A4',
    orientation,
    showKop = true,
    marginMode = 'normal',
    showJudul,
    showBiodataHeader,
    fitToPage = true,
    fitWidthPages,
    fitHeightPages,
    repeatHeaderRows,
    printScale = 'auto',
    isLastDocument = true
}) => {
    const sheets = useMemo(() => {
        const allSheets = getTemplateSheets(template);
        if (!targetSheetId || targetSheetId === 'all') {
            return allSheets;
        }
        const filtered = allSheets.filter(s => s.id === targetSheetId);
        return filtered.length > 0 ? filtered : allSheets;
    }, [template, targetSheetId]);

    const customData = record?.customData ? JSON.parse(record.customData) : {};
    const effectiveDate =
        parseLocalDateSafe(record?.tanggalRapor) ||
        parseLocalDateSafe(tanggalRapor) ||
        parseLocalDateSafe(settings?.tanggalRaporDefault) ||
        new Date();

    const effectiveSettings = {
        ...settings,
        tempatRaporDefault: tempatRapor?.trim() || settings?.tempatRaporDefault,
        formatTanggalRaporDefault: formatTanggalRapor || settings?.formatTanggalRaporDefault || 'masehi',
        manualHijriRaporDefault: manualHijriRapor !== undefined ? manualHijriRapor : settings?.manualHijriRaporDefault
    };

    const resolveContext = {
        santri,
        settings: effectiveSettings,
        record,
        digitalAssets,
        targetDate: effectiveDate,
        tahunAjaran,
        semester,
        calculation,
        cohortRecords
    };

    const hasBuiltInBiodata = useMemo(() => templateHasBuiltInBiodata(template), [template]);

    return (
        <div className="dynamic-rapor-container space-y-8 print:block print:space-y-0">
            {sheets.map((sheet, sheetIdx) => {
                const isLastSheet = sheetIdx === sheets.length - 1;
                const shouldShowBiodataHeader = showBiodataHeader !== undefined
                    ? showBiodataHeader
                    : (sheet.showBiodataHeader !== undefined
                        ? sheet.showBiodataHeader
                        : (template.showBiodataHeader !== undefined ? template.showBiodataHeader : !hasBuiltInBiodata));

                const effectiveOrientation = orientation || sheet.orientation || template.orientation || 'portrait';

                return (
                    <ScaledRaporSheet
                        key={sheet.id}
                        sheet={sheet}
                        sheetsCount={sheets.length}
                        isLastSheet={isLastSheet}
                        isLastDocument={isLastDocument}
                        template={template}
                        santri={santri}
                        settings={settings}
                        customData={customData}
                        resolveContext={resolveContext}
                        calculation={calculation}
                        paperSize={paperSize}
                        orientation={effectiveOrientation}
                        showKop={showKop}
                        marginMode={marginMode}
                        showJudul={showJudul}
                        shouldShowBiodataHeader={shouldShowBiodataHeader}
                        fitToPage={fitToPage}
                        fitWidthPages={fitWidthPages}
                        fitHeightPages={fitHeightPages}
                        repeatHeaderRows={repeatHeaderRows}
                        printScale={printScale}
                    />
                );
            })}
        </div>
    );
};

export const TabCetakRapor: React.FC<TabCetakRaporProps> = ({ onNavigateToTab }) => {
    const { settings, onUpdateSettings, showToast } = useAppContext();
    const { santriList } = useSantriContext();
    const digitalAssets = useLiveQuery(() => db.digitalAssets.toArray(), []) || [];
    const {
        filterTahun,
        setFilterTahun,
        filterSemester,
        setFilterSemester,
        availableYears,
        defaultAcademicYear
    } = useAcademicPeriodFilter(settings);
    const [filterJenjang, setFilterJenjang] = useState('');
    const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
    const [printRombel, setPrintRombel] = useState('');
    const [selectedTemplateId, setSelectedTemplateId] = useState('');
    const [selectedPrintSheetId, setSelectedPrintSheetId] = useState<string>('all');

    useEffect(() => {
        setSelectedPrintSheetId('all');
    }, [selectedTemplateId]);

    // Search and Status Tabs
    const [searchQuery, setSearchQuery] = useState('');
    const [statusTab, setStatusTab] = useState<'all' | 'complete' | 'partial' | 'empty'>('all');
    const [sortBy, setSortBy] = useState<'name' | 'rank' | 'nis'>('name');

    // Selection state for Batch Print
    const [selectedSantriIds, setSelectedSantriIds] = useState<Set<number>>(new Set());

    // Print Layout & Output Settings
    const [paperSize, setPaperSize] = useState<'A4' | 'F4'>('A4');
    const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
    const [hasManualOrientationOverride, setHasManualOrientationOverride] = useState<boolean>(false);
    const [showKop, setShowKop] = useState<boolean>(true);
    const [marginMode, setMarginMode] = useState<'normal' | 'narrow' | 'none'>('normal');
    const [rankingDisplayLimit, setRankingDisplayLimit] = useState<RankingDisplayLimit>('all');
    const [fitToPage, setFitToPage] = useState<boolean>(true);
    const [fitWidthPages, setFitWidthPages] = useState<PageFitCount>(1);
    const [fitHeightPages, setFitHeightPages] = useState<PageFitCount>(1);
    const [repeatHeaderRows, setRepeatHeaderRows] = useState<boolean>(true);
    const [printScale, setPrintScale] = useState<number | 'auto'>('auto');
    const [showBiodataHeader, setShowBiodataHeader] = useState<boolean | 'auto'>('auto');
    const [showJudul, setShowJudul] = useState<boolean | 'auto'>('auto');
    const [showAdvancedPrintSettings, setShowAdvancedPrintSettings] = useState(false);
    const [previewZoom, setPreviewZoom] = useState<number>(1.0);

    const currentPageSetup = useMemo(
        () =>
            normalizeRaporPageSetup({
                paperSize,
                orientation,
                marginMode,
                fitToPage,
                fitWidthPages,
                fitHeightPages,
                printScale,
                repeatHeaderRows
            }),
        [paperSize, orientation, marginMode, fitToPage, fitWidthPages, fitHeightPages, printScale, repeatHeaderRows]
    );

    const applyPrintPageSetupPatch = (patch: Partial<RaporPageSetupInput>) => {
        if (patch.orientation !== undefined) {
            setHasManualOrientationOverride(true);
        }
        const next = normalizeRaporPageSetup({
            ...currentPageSetup,
            ...patch
        });
        setPaperSize(next.paperSize);
        setOrientation(next.orientation);
        setMarginMode(next.marginMode);
        setFitToPage(next.fitToPage);
        setFitWidthPages(next.fitWidthPages);
        setFitHeightPages(next.fitHeightPages);
        setPrintScale(next.printScale);
        setRepeatHeaderRows(next.repeatHeaderRows);
    };

    // Load and persist print preferences across sessions
    const PRINT_PREF_KEY = 'esantri_rapor_print_preferences_v1';
    useEffect(() => {
        try {
            const stored = localStorage.getItem(PRINT_PREF_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                const normalized = normalizeRaporPageSetup({
                    paperSize: parsed.paperSize,
                    orientation: parsed.orientation,
                    marginMode: parsed.marginMode,
                    fitToPage: parsed.fitToPage,
                    fitWidthPages: parsed.fitWidthPages,
                    fitHeightPages: parsed.fitHeightPages,
                    printScale: parsed.printScale,
                    repeatHeaderRows: parsed.repeatHeaderRows ?? true
                });
                setPaperSize(normalized.paperSize);
                setOrientation(normalized.orientation);
                setMarginMode(normalized.marginMode);
                setFitToPage(normalized.fitToPage);
                setFitWidthPages(normalized.fitWidthPages);
                setFitHeightPages(normalized.fitHeightPages);
                setPrintScale(normalized.printScale);
                setRepeatHeaderRows(normalized.repeatHeaderRows);
                if (parsed.showKop !== undefined) setShowKop(parsed.showKop);
                if (parsed.rankingDisplayLimit) setRankingDisplayLimit(parsed.rankingDisplayLimit);
            }
        } catch {}
    }, []);

    useEffect(() => {
        try {
            localStorage.setItem(PRINT_PREF_KEY, JSON.stringify({
                paperSize,
                orientation,
                showKop,
                marginMode,
                fitToPage,
                fitWidthPages,
                fitHeightPages,
                repeatHeaderRows,
                printScale,
                rankingDisplayLimit
            }));
        } catch {}
    }, [paperSize, orientation, showKop, marginMode, fitToPage, fitWidthPages, fitHeightPages, repeatHeaderRows, printScale, rankingDisplayLimit]);

    // Universal / Custom Issuance Date, Place & Calendar Format (Masehi / Hijriah / Gabungan)
    const [tanggalRapor, setTanggalRapor] = useState(settings.tanggalRaporDefault || formatLocalDate(new Date()));
    const [tempatRapor, setTempatRapor] = useState(() => settings.tempatRaporDefault || resolveTempatRapor(settings, ''));
    const [formatTanggalRapor, setFormatTanggalRapor] = useState<DateFormatMode>(settings.formatTanggalRaporDefault || 'masehi');
    const [manualHijriRapor, setManualHijriRapor] = useState(settings.manualHijriRaporDefault || '');
    const [isSavingUniversalDate, setIsSavingUniversalDate] = useState(false);

    const liveTitimangsaPreview = useMemo(() => {
        const city = tempatRapor.trim() || resolveTempatRapor(settings, 'Pesantren');
        const dateFormatted = formatTanggalDokumen(tanggalRapor, {
            formatMode: formatTanggalRapor,
            hijriAdjustment: settings.hijriAdjustment || 0,
            manualHijri: manualHijriRapor
        });
        return dateFormatted ? `${city}, ${dateFormatted}` : city;
    }, [tempatRapor, tanggalRapor, formatTanggalRapor, manualHijriRapor, settings]);

    const autoHijriHint = useMemo(() => {
        const d = parseLocalDateSafe(tanggalRapor) || new Date();
        const info = getHijriDate(d, settings.hijriAdjustment || 0);
        return info.full ? `${info.full} H` : '5 Muharram 1448 H';
    }, [tanggalRapor, settings.hijriAdjustment]);

    // Records and Leger Calculations Map
    const [periodRecordsMap, setPeriodRecordsMap] = useState<Map<number, RaporRecord>>(new Map());
    const [studentLegerMap, setStudentLegerMap] = useState<Map<number, StudentLegerRow>>(new Map());
    const [rombelCohortMetaMap, setRombelCohortMetaMap] = useState<Map<number, {
        classAverages: Record<string, number>;
        classOverallAverage: number;
        rombelRecords: RaporRecord[];
    }>>(new Map());

    // Preview and Batch Modals
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [previewSantriIndex, setPreviewSantriIndex] = useState<number>(0);
    const [isBatchPrinting, setIsBatchPrinting] = useState(false);
    const [batchData, setBatchData] = useState<{ santri: Santri; record: RaporRecord | null; calculation?: any; cohortRecords?: RaporRecord[] }[]>([]);
    const [isTitleModalOpen, setIsTitleModalOpen] = useState(false);

    // WhatsApp Distribution Modal
    const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
    const [whatsAppTargetSantri, setWhatsAppTargetSantri] = useState<Santri | null>(null);

    // Rapor Approval & Lock Status Key
    const approvalKey = `${filterTahun}_${filterSemester}_${printRombel || 'all'}`;
    const currentApprovalStatus = (settings.raporApprovalStatus?.[approvalKey]) || 'draft';

    const handleCycleApprovalStatus = async () => {
        const nextStatus: 'draft' | 'verified' | 'locked' = 
            currentApprovalStatus === 'draft' ? 'verified' :
            currentApprovalStatus === 'verified' ? 'locked' : 'draft';
        
        const updatedStatusMap = {
            ...(settings.raporApprovalStatus || {}),
            [approvalKey]: nextStatus
        };

        await onUpdateSettings({
            ...settings,
            raporApprovalStatus: updatedStatusMap
        });

        const label = nextStatus === 'locked' ? 'Disahkan & Terkunci' : nextStatus === 'verified' ? 'Terverifikasi Wali Kelas' : 'Draf';
        showToast(`Status pengesahan rapor diubah: ${label}`, 'success');
    };

    const handleOpenWhatsAppModal = (santri: Santri) => {
        setWhatsAppTargetSantri(santri);
        setIsWhatsAppModalOpen(true);
    };

    useEffect(() => {
        if (settings.tanggalRaporDefault && !tanggalRapor) {
            setTanggalRapor(settings.tanggalRaporDefault);
        }
        if (settings.tempatRaporDefault && !tempatRapor) {
            setTempatRapor(settings.tempatRaporDefault);
        }
        if (settings.formatTanggalRaporDefault) {
            setFormatTanggalRapor(settings.formatTanggalRaporDefault);
        }
        if (settings.manualHijriRaporDefault !== undefined) {
            setManualHijriRapor(settings.manualHijriRaporDefault);
        }
    }, [settings.tanggalRaporDefault, settings.tempatRaporDefault, settings.formatTanggalRaporDefault, settings.manualHijriRaporDefault]);

    const handleSaveRaporTitle = async (customTitle: string, isShowJudul: boolean, targetSheet: 'all' | string) => {
        if (!selectedTemplate) return;
        const allTemplates = (settings.raporTemplates || []) as RaporTemplate[];
        const updated = allTemplates.map(tpl => {
            if (tpl.id !== selectedTemplate.id) return tpl;
            const sheets = getTemplateSheets(tpl);
            const updatedSheets = sheets.map(s => {
                if (targetSheet === 'all' || s.id === targetSheet) {
                    return {
                        ...s,
                        customTitle,
                        showJudul: isShowJudul
                    };
                }
                return s;
            });

            return {
                ...tpl,
                sheets: updatedSheets,
                customTitle: targetSheet === 'all' ? customTitle : tpl.customTitle,
                showJudul: isShowJudul
            };
        });

        await onUpdateSettings({
            ...settings,
            raporTemplates: updated
        });
        setShowJudul(isShowJudul);
        showToast('Judul dokumen rapor berhasil disimpan!', 'success');
    };

    const handleSaveUniversalDate = async () => {
        try {
            setIsSavingUniversalDate(true);
            await onUpdateSettings({
                ...settings,
                tanggalRaporDefault: tanggalRapor,
                tempatRaporDefault: tempatRapor.trim(),
                formatTanggalRaporDefault: formatTanggalRapor,
                manualHijriRaporDefault: manualHijriRapor.trim()
            });
            showToast('Titimangsa (Tempat, Tanggal & Format Kalender) berhasil disimpan sebagai default!', 'success');
        } catch (error) {
            showToast('Gagal menyimpan default tanggal: ' + String(error), 'error');
        } finally {
            setIsSavingUniversalDate(false);
        }
    };

    const filteredTemplates = useMemo(() => {
        const allTemplates = settings.raporTemplates || [];
        const jenjangId = filterJenjang ? parseInt(filterJenjang) : 0;
        const rombelId = printRombel ? parseInt(printRombel) : 0;
        const rombel = rombelId ? settings.rombel.find(r => r.id === rombelId) : null;
        const kelas = rombel ? settings.kelas.find(k => k.id === rombel.kelasId) : null;

        if (!jenjangId) return allTemplates;

        return allTemplates.filter(t => {
            if (!t.jenjangId) return true;
            if (t.jenjangId !== jenjangId) return false;
            if (t.kelasId && (!kelas || t.kelasId !== kelas.id)) return false;
            if (t.rombelId && (!rombel || t.rombelId !== rombel.id)) return false;
            return true;
        });
    }, [filterJenjang, printRombel, settings.raporTemplates, settings.rombel, settings.kelas]);

    useEffect(() => {
        if (filterJenjang) {
            if (selectedTemplateId && !filteredTemplates.find(t => t.id === selectedTemplateId)) {
                setSelectedTemplateId('');
            }
            if (filteredTemplates.length === 1 && selectedTemplateId !== filteredTemplates[0].id) {
                setSelectedTemplateId(filteredTemplates[0].id);
            }
        }
    }, [filterJenjang, filteredTemplates, selectedTemplateId]);

    useEffect(() => {
        if (availableYears.length === 0 && !filterTahun.trim()) {
            setFilterTahun(defaultAcademicYear);
        }
    }, [availableYears, defaultAcademicYear, filterTahun, setFilterTahun]);

    // Load Period Records
    useEffect(() => {
        const loadPeriodRecords = async () => {
            if (!filterTahun || !filterSemester) {
                setPeriodRecordsMap(new Map());
                return;
            }

            const records = await getRaporRecordsByPeriod(filterTahun, filterSemester);
            const map = new Map<number, RaporRecord>();
            records.forEach((record) => {
                map.set(record.santriId, record);
            });
            setPeriodRecordsMap(map);
        };

        loadPeriodRecords();
    }, [filterTahun, filterSemester]);

    // Derived Available Rombels based on Jenjang
    const availableRombels = useMemo(() => {
        if (!filterJenjang) return settings.rombel;
        const kelasInJenjang = settings.kelas.filter(k => k.jenjangId === parseInt(filterJenjang)).map(k => k.id);
        return settings.rombel.filter(r => kelasInJenjang.includes(r.kelasId));
    }, [filterJenjang, settings]);

    // Base active students according to Jenjang and Rombel filter
    const baseSantriList = useMemo(() => {
        return santriList.filter(s => {
            if (s.status !== 'Aktif') return false;
            if (filterJenjang && s.jenjangId !== parseInt(filterJenjang)) return false;
            if (printRombel && s.rombelId !== parseInt(printRombel)) return false;
            return true;
        });
    }, [santriList, filterJenjang, printRombel]);

    // Compute Leger Calculations per Rombel to get exact ranks, averages, and completeness
    useEffect(() => {
        const calculateRombelData = () => {
            const newMap = new Map<number, StudentLegerRow>();
            const newCohortMetaMap = new Map<number, {
                classAverages: Record<string, number>;
                classOverallAverage: number;
                rombelRecords: RaporRecord[];
            }>();
            const studentsByRombel = new Map<number, Santri[]>();

            baseSantriList.forEach(s => {
                const list = studentsByRombel.get(s.rombelId) || [];
                list.push(s);
                studentsByRombel.set(s.rombelId, list);
            });

            studentsByRombel.forEach((rombelStudents, rId) => {
                const rombel = settings.rombel.find(r => r.id === rId);
                const kelas = rombel ? settings.kelas.find(k => k.id === rombel.kelasId) : null;
                const templates = (settings.raporTemplates || []) as RaporTemplate[];

                let matchedTemplate: RaporTemplate | null = null;
                if (selectedTemplateId) {
                    matchedTemplate = templates.find(t => t.id === selectedTemplateId) || null;
                } else if (kelas?.jenjangId) {
                    matchedTemplate = templates.find(t => t.jenjangId === kelas.jenjangId) || null;
                }
                if (!matchedTemplate && templates.length > 0) {
                    matchedTemplate = templates[0];
                }

                const rombelRecords = rombelStudents
                    .map(s => periodRecordsMap.get(s.id))
                    .filter((r): r is RaporRecord => r !== undefined);

                const rombelData = buildRombelLegerData({
                    template: matchedTemplate,
                    santriList: rombelStudents,
                    records: rombelRecords
                });

                newCohortMetaMap.set(rId, {
                    classAverages: rombelData.classAverages,
                    classOverallAverage: rombelData.classAverage,
                    rombelRecords
                });

                rombelData.students.forEach(row => {
                    newMap.set(row.santri.id, row);
                });
            });

            setStudentLegerMap(newMap);
            setRombelCohortMetaMap(newCohortMetaMap);
        };

        calculateRombelData();
    }, [baseSantriList, periodRecordsMap, selectedTemplateId, settings]);

    // Counts for status tabs
    const counts = useMemo(() => {
        let complete = 0;
        let partial = 0;
        let empty = 0;

        baseSantriList.forEach(s => {
            const row = studentLegerMap.get(s.id);
            const status = row?.completenessStatus || (periodRecordsMap.has(s.id) ? 'Sebagian' : 'Kosong');
            if (status === 'Lengkap') complete++;
            else if (status === 'Sebagian') partial++;
            else empty++;
        });

        return { all: baseSantriList.length, complete, partial, empty };
    }, [baseSantriList, studentLegerMap, periodRecordsMap]);

    // Filtered & Sorted Santri for Display
    const filteredSantriList = useMemo(() => {
        return baseSantriList
            .filter(s => {
                // Status Tab Filter
                if (statusTab !== 'all') {
                    const row = studentLegerMap.get(s.id);
                    const status = row?.completenessStatus || (periodRecordsMap.has(s.id) ? 'Sebagian' : 'Kosong');
                    if (statusTab === 'complete' && status !== 'Lengkap') return false;
                    if (statusTab === 'partial' && status !== 'Sebagian') return false;
                    if (statusTab === 'empty' && status !== 'Kosong') return false;
                }

                // Search Query
                if (searchQuery.trim()) {
                    const q = searchQuery.toLowerCase().trim();
                    const nameMatch = s.namaLengkap.toLowerCase().includes(q);
                    const nisMatch = s.nis?.toLowerCase().includes(q);
                    if (!nameMatch && !nisMatch) return false;
                }

                return true;
            })
            .sort((a, b) => {
                const rowA = studentLegerMap.get(a.id);
                const rowB = studentLegerMap.get(b.id);

                if (sortBy === 'rank') {
                    const rankA = rowA?.ranking || 999;
                    const rankB = rowB?.ranking || 999;
                    if (rankA !== rankB) return rankA - rankB;
                } else if (sortBy === 'nis') {
                    return (a.nis || '').localeCompare(b.nis || '');
                }

                if (!printRombel && a.rombelId !== b.rombelId) {
                    return a.rombelId - b.rombelId;
                }
                return a.namaLengkap.localeCompare(b.namaLengkap);
            });
    }, [baseSantriList, statusTab, searchQuery, sortBy, printRombel, studentLegerMap, periodRecordsMap]);

    // Multi-Select Handlers
    const handleToggleSelectSantri = (id: number) => {
        setSelectedSantriIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleSelectAllFiltered = () => {
        setSelectedSantriIds(new Set(filteredSantriList.map(s => s.id)));
    };

    const handleSelectCompleteOnly = () => {
        const completeIds = filteredSantriList
            .filter(s => {
                const row = studentLegerMap.get(s.id);
                return row?.completenessStatus === 'Lengkap';
            })
            .map(s => s.id);
        setSelectedSantriIds(new Set(completeIds));
        if (completeIds.length > 0) {
            showToast(`${completeIds.length} santri berstatus Lengkap (100%) dipilih untuk cetak massal.`, 'success');
        } else {
            showToast('Belum ada santri dengan status nilai Lengkap (100%) pada tampilan ini.', 'info');
        }
    };

    const handleDeselectAll = () => {
        setSelectedSantriIds(new Set());
    };

    // Single Preview Handlers
    const handleOpenPreview = (santriId: number) => {
        const idx = filteredSantriList.findIndex(s => s.id === santriId);
        if (idx !== -1) {
            setPreviewSantriIndex(idx);
            setIsPreviewOpen(true);
        }
    };

    const currentPreviewSantri = filteredSantriList[previewSantriIndex] || null;
    const currentPreviewRecord = currentPreviewSantri ? periodRecordsMap.get(currentPreviewSantri.id) || null : null;
    const currentPreviewRow = currentPreviewSantri ? studentLegerMap.get(currentPreviewSantri.id) : null;
    const currentPreviewCohortMeta = currentPreviewSantri ? rombelCohortMetaMap.get(currentPreviewSantri.rombelId) : undefined;
    const currentPreviewEffectiveRank = getEffectiveRanking(currentPreviewRow?.ranking, rankingDisplayLimit);
    const currentPreviewCalculation = currentPreviewRow ? {
        totalNilai: currentPreviewRow.totalNilai,
        rataRata: currentPreviewRow.rataRata,
        ranking: currentPreviewEffectiveRank,
        totalSantri: currentPreviewEffectiveRank ? (baseSantriList.filter(s => s.rombelId === currentPreviewSantri?.rombelId).length || 1) : undefined,
        predikat: currentPreviewRow.predikat.predikat,
        classAverages: currentPreviewCohortMeta?.classAverages,
        classOverallAverage: currentPreviewCohortMeta?.classOverallAverage
    } : (currentPreviewCohortMeta ? {
        classAverages: currentPreviewCohortMeta.classAverages,
        classOverallAverage: currentPreviewCohortMeta.classOverallAverage
    } : undefined);

    const handlePrevStudent = () => {
        if (previewSantriIndex > 0) {
            setPreviewSantriIndex(prev => prev - 1);
        }
    };

    const handleNextStudent = () => {
        if (previewSantriIndex < filteredSantriList.length - 1) {
            setPreviewSantriIndex(prev => prev + 1);
        }
    };

    // Keyboard shortcut handler for Preview Modal (ArrowLeft, ArrowRight, Escape)
    useEffect(() => {
        if (!isPreviewOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement | null;
            if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;

            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                handlePrevStudent();
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                handleNextStudent();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                setIsPreviewOpen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isPreviewOpen, previewSantriIndex, filteredSantriList.length]);

    // Helper to build batch data with ranking limit applied
    const buildBatchData = (targetSantri: Santri[], limit: RankingDisplayLimit) => {
        return targetSantri.map(santri => {
            const row = studentLegerMap.get(santri.id);
            const cohortMeta = rombelCohortMetaMap.get(santri.rombelId);
            const rombelTotal = baseSantriList.filter(s => s.rombelId === santri.rombelId).length;
            const effectiveRank = getEffectiveRanking(row?.ranking, limit);
            const calculation = row ? {
                totalNilai: row.totalNilai,
                rataRata: row.rataRata,
                ranking: effectiveRank,
                totalSantri: effectiveRank ? rombelTotal : undefined,
                predikat: row.predikat.predikat,
                classAverages: cohortMeta?.classAverages,
                classOverallAverage: cohortMeta?.classOverallAverage
            } : (cohortMeta ? {
                classAverages: cohortMeta.classAverages,
                classOverallAverage: cohortMeta.classOverallAverage
            } : undefined);

            return {
                santri,
                record: periodRecordsMap.get(santri.id) || null,
                calculation,
                cohortRecords: cohortMeta?.rombelRecords
            };
        });
    };

    // Sync batchData when rankingDisplayLimit changes during active batch print modal
    useEffect(() => {
        if (isBatchPrinting && batchData.length > 0) {
            const targetSantri = batchData.map(b => b.santri);
            setBatchData(buildBatchData(targetSantri, rankingDisplayLimit));
        }
    }, [rankingDisplayLimit]);

    // Batch Print Execution
    const handleStartBatchPrint = () => {
        const targetSantri = selectedSantriIds.size > 0
            ? filteredSantriList.filter(s => selectedSantriIds.has(s.id))
            : filteredSantriList;

        if (targetSantri.length === 0) {
            showToast('Tidak ada santri yang dapat dicetak.', 'error');
            return;
        }

        const data = buildBatchData(targetSantri, rankingDisplayLimit);
        setBatchData(data);
        setIsBatchPrinting(true);
    };

    const selectedTemplate = useMemo(() => settings.raporTemplates?.find(t => t.id === selectedTemplateId), [selectedTemplateId, settings.raporTemplates]);

    const isTemplateHasCustomBiodata = useMemo(() => {
        if (!selectedTemplate) return false;
        return templateHasBuiltInBiodata(selectedTemplate);
    }, [selectedTemplate]);

    useEffect(() => {
        if (selectedTemplate) {
            setHasManualOrientationOverride(false);
            const hasSavedLayoutProp =
                selectedTemplate.paperSize !== undefined ||
                selectedTemplate.orientation !== undefined ||
                selectedTemplate.marginMode !== undefined ||
                selectedTemplate.fitToPage !== undefined ||
                selectedTemplate.fitWidthPages !== undefined ||
                selectedTemplate.fitHeightPages !== undefined ||
                selectedTemplate.printScale !== undefined ||
                selectedTemplate.repeatHeaderRows !== undefined;

            if (hasSavedLayoutProp) {
                const normalized = normalizeRaporPageSetup({
                    paperSize: selectedTemplate.paperSize ?? paperSize,
                    orientation: selectedTemplate.orientation ?? orientation,
                    marginMode: selectedTemplate.marginMode ?? marginMode,
                    fitToPage: selectedTemplate.fitToPage,
                    fitWidthPages: selectedTemplate.fitWidthPages,
                    fitHeightPages: selectedTemplate.fitHeightPages,
                    printScale: selectedTemplate.printScale,
                    repeatHeaderRows: selectedTemplate.repeatHeaderRows ?? repeatHeaderRows
                });
                setPaperSize(normalized.paperSize);
                setOrientation(normalized.orientation);
                setMarginMode(normalized.marginMode);
                setFitToPage(normalized.fitToPage);
                setFitWidthPages(normalized.fitWidthPages);
                setFitHeightPages(normalized.fitHeightPages);
                setPrintScale(normalized.printScale);
                setRepeatHeaderRows(normalized.repeatHeaderRows);
            }

            if (selectedTemplate.showBiodataHeader !== undefined) {
                setShowBiodataHeader(selectedTemplate.showBiodataHeader);
            } else {
                // Default cerdas: jika template buatan user sudah memiliki tag biodata, matikan header bawaan
                const hasCustom = templateHasBuiltInBiodata(selectedTemplate);
                setShowBiodataHeader(!hasCustom);
            }
            if (selectedTemplate.showJudul !== undefined) {
                setShowJudul(selectedTemplate.showJudul);
            } else {
                setShowJudul('auto');
            }
        }
    }, [selectedTemplate]);

    const isTemplateHasCustomTitle = useMemo(() => {
        if (!selectedTemplate) return false;
        const sheets = getTemplateSheets(selectedTemplate);
        return sheets.some(sh => {
            if (sh.customTitle && sh.customTitle.trim()) return true;
            if (!sh.cells) return false;
            return sh.cells.slice(0, 3).some(row =>
                row.some(cell => {
                    if (!cell || !cell.value) return false;
                    const up = cell.value.toUpperCase();
                    return up.includes('RAPOR') || up.includes('LAPORAN HASIL') || up.includes('CAPAIAN KOMPETENSI') || up.includes('HASIL EVALUASI');
                })
            );
        });
    }, [selectedTemplate]);

    const effectiveShowBiodata = showBiodataHeader === 'auto'
        ? !isTemplateHasCustomBiodata
        : showBiodataHeader;

    const effectiveShowJudul = showJudul === 'auto'
        ? (selectedTemplate?.showJudul !== undefined ? selectedTemplate.showJudul : true)
        : showJudul;

    const templateSheets = useMemo(() => {
        if (!selectedTemplate) return [];
        return getTemplateSheets(selectedTemplate);
    }, [selectedTemplate]);

    return (
        <div className="space-y-6 animate-fade-in relative">
            <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-xs border border-slate-200">
                {/* Header Title & Batch Trigger */}
                <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 mb-6 border-b border-slate-100 pb-5">
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-xl font-black text-slate-800 tracking-tight">Layanan Cetak Rapor</h3>
                            <span className="bg-teal-50 text-teal-700 text-xs font-bold px-2.5 py-0.5 rounded-full border border-teal-200">
                                Fase 3 Production
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 font-medium mt-1">
                            Manajemen cetak rapor otomatis, seleksi massal, format kertas A4/F4, dan integrasi kalkulasi peringkat
                        </p>
                    </div>

                    {/* Mobile Filter & Quick Print Actions */}
                    <div className="flex md:hidden gap-2 w-full">
                        <button
                            onClick={() => setIsFilterDrawerOpen(true)}
                            className="flex-grow flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-50 text-teal-700 border border-teal-200 rounded-xl font-bold text-sm shadow-xs"
                        >
                            <i className="bi bi-funnel-fill"></i>
                            <span>Filter</span>
                        </button>
                        <button
                            onClick={handleStartBatchPrint}
                            disabled={filteredSantriList.length === 0}
                            className="shrink-0 px-4 h-[44px] bg-teal-600 text-white rounded-xl flex items-center justify-center gap-2 font-bold text-sm shadow-sm active:scale-95 transition-all disabled:opacity-50"
                        >
                            <i className="bi bi-printer-fill"></i>
                            <span>{selectedSantriIds.size > 0 ? `Cetak (${selectedSantriIds.size})` : `Cetak (${filteredSantriList.length})`}</span>
                        </button>
                    </div>

                    {/* Desktop Batch Print & Approval Trigger */}
                    <div className="hidden md:flex items-center gap-3">
                        {/* Status Pengesahan Rapor */}
                        <button
                            type="button"
                            onClick={handleCycleApprovalStatus}
                            className={`px-3 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all shadow-2xs ${
                                currentApprovalStatus === 'locked'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                                    : currentApprovalStatus === 'verified'
                                    ? 'bg-blue-50 text-blue-800 border-blue-300 hover:bg-blue-100'
                                    : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                            }`}
                            title="Klik untuk mengubah alur pengesahan: Draf -> Terverifikasi Wali -> Disahkan & Terkunci"
                        >
                            <i className={`bi ${currentApprovalStatus === 'locked' ? 'bi-lock-fill text-emerald-600' : currentApprovalStatus === 'verified' ? 'bi-patch-check-fill text-blue-600' : 'bi-pencil-square text-amber-600'}`}></i>
                            <span>
                                {currentApprovalStatus === 'locked' ? 'Disahkan & Terkunci' : currentApprovalStatus === 'verified' ? 'Terverifikasi Wali' : 'Status: Draf'}
                            </span>
                        </button>

                        {selectedSantriIds.size > 0 && (
                            <button
                                onClick={handleDeselectAll}
                                className="text-xs text-slate-500 hover:text-slate-700 font-semibold px-2 py-1"
                            >
                                Batalkan ({selectedSantriIds.size})
                            </button>
                        )}
                        <button
                            onClick={handleStartBatchPrint}
                            disabled={filteredSantriList.length === 0}
                            className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-xl text-sm font-black flex items-center gap-2 shadow-sm transition-all active:scale-95"
                        >
                            <i className="bi bi-printer-fill"></i>
                            <span>
                                {selectedSantriIds.size > 0
                                    ? `Cetak Terpilih (${selectedSantriIds.size} Santri)`
                                    : `Cetak Massal (${filteredSantriList.length} Santri)`}
                            </span>
                        </button>
                    </div>
                </div>

                {/* Lock Status Alert Banner */}
                {currentApprovalStatus === 'locked' && (
                    <div className="mb-4 p-3 bg-emerald-50/90 border border-emerald-300 rounded-xl text-xs text-emerald-900 flex items-center justify-between gap-3 shadow-2xs animate-fade-in">
                        <div className="flex items-center gap-2">
                            <i className="bi bi-shield-lock-fill text-emerald-600 text-base"></i>
                            <span>
                                <strong>Rapor Telah Disahkan & Terkunci:</strong> Nilai rapor pada periode dan rombel ini telah diverifikasi dan dikunci untuk menjaga integritas dokumen cetak.
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={handleCycleApprovalStatus}
                            className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 bg-white px-2.5 py-1 rounded-lg border border-emerald-200 transition-colors shrink-0"
                        >
                            Buka Kunci
                        </button>
                    </div>
                )}

                {/* Filter Grid (Desktop) */}
                <div className={`hidden md:grid grid-cols-2 ${templateSheets.length > 1 ? 'lg:grid-cols-6' : 'lg:grid-cols-5'} gap-3.5 mb-5`}>
                    <div className="flex flex-col">
                        <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1 tracking-wider pl-1">Tahun Ajaran</label>
                        <select
                            value={filterTahun}
                            onChange={e => setFilterTahun(e.target.value)}
                            className="w-full border border-slate-200 rounded-xl p-2.5 text-sm font-bold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-500 transition-all"
                        >
                            {(availableYears.length > 0 ? availableYears : [defaultAcademicYear]).map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex flex-col">
                        <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1 tracking-wider pl-1">Semester</label>
                        <select
                            value={filterSemester}
                            onChange={e => setFilterSemester(e.target.value as any)}
                            className="w-full border border-slate-200 rounded-xl p-2.5 text-sm font-bold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-500 transition-all"
                        >
                            <option value="Ganjil">Ganjil</option>
                            <option value="Genap">Genap</option>
                        </select>
                    </div>

                    <div className="flex flex-col">
                        <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1 tracking-wider pl-1">Jenjang / Marhalah</label>
                        <select
                            value={filterJenjang}
                            onChange={e => { setFilterJenjang(e.target.value); setPrintRombel(''); }}
                            className="w-full border border-slate-200 rounded-xl p-2.5 text-sm font-bold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-500 transition-all"
                        >
                            <option value="">Semua Jenjang</option>
                            {settings.jenjang.map(j => <option key={j.id} value={j.id}>{j.nama}</option>)}
                        </select>
                    </div>

                    <div className="flex flex-col">
                        <label className="block text-[11px] font-bold text-teal-700 uppercase mb-1 tracking-wider pl-1">Pilih Rombel</label>
                        <select
                            value={printRombel}
                            onChange={e => setPrintRombel(e.target.value)}
                            className="w-full border-2 border-teal-100 rounded-xl p-2.5 text-sm font-black bg-teal-50/30 focus:bg-white focus:ring-2 focus:ring-teal-500 transition-all"
                        >
                            <option value="">Semua Rombel ({availableRombels.length})</option>
                            {availableRombels.map(r => <option key={r.id} value={r.id}>{r.nama}</option>)}
                        </select>
                    </div>

                    <div className="flex flex-col">
                        <label className="block text-[11px] font-bold text-amber-700 uppercase mb-1 tracking-wider pl-1">Desain Template</label>
                        <select
                            value={selectedTemplateId}
                            onChange={e => setSelectedTemplateId(e.target.value)}
                            className="w-full border-2 border-amber-100 rounded-xl p-2.5 text-sm font-black bg-amber-50/30 focus:bg-white focus:ring-2 focus:ring-amber-500 transition-all"
                        >
                            <option value="">Standar K13 (Mapel Otomatis)</option>
                            {filteredTemplates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </div>

                    {templateSheets.length > 1 && (
                        <div className="flex flex-col">
                            <label className="block text-[11px] font-bold text-indigo-700 uppercase mb-1 tracking-wider pl-1">
                                Lembar / Format
                            </label>
                            <select
                                value={selectedPrintSheetId}
                                onChange={e => setSelectedPrintSheetId(e.target.value)}
                                className="w-full border-2 border-indigo-100 rounded-xl p-2.5 text-sm font-black bg-indigo-50/30 focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all"
                            >
                                <option value="all">Semua Lembar ({templateSheets.length})</option>
                                {templateSheets.map((sh, idx) => (
                                    <option key={sh.id} value={sh.id}>
                                        Lembar {idx + 1}: {sh.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                {/* Print Settings & Titimangsa Toolbar */}
                <div className="mb-5 p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
                    {/* Primary Quick Bar */}
                    <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 sm:gap-4">
                        {/* Titimangsa Controls (Responsive & Anti-Overflow di Layar Mobile) */}
                        <div className="flex flex-col gap-1.5 w-full lg:w-auto min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-2.5 flex-wrap">
                                <div className="flex items-center justify-between sm:justify-start gap-2">
                                    <div className="flex items-center gap-1.5 text-slate-700 font-bold text-xs shrink-0">
                                        <i className="bi bi-calendar-check text-base text-teal-600"></i>
                                        <span>Titimangsa:</span>
                                    </div>
                                    <button
                                        onClick={handleSaveUniversalDate}
                                        disabled={isSavingUniversalDate}
                                        title="Simpan tempat, tanggal & format kalender ini sebagai default universal untuk desain & cetak rapor"
                                        className="sm:hidden bg-white hover:bg-slate-100 text-teal-700 border border-teal-200 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all shadow-2xs flex items-center gap-1 disabled:opacity-50 shrink-0"
                                    >
                                        {isSavingUniversalDate ? <span className="animate-spin h-3 w-3 border-2 border-teal-600 border-t-transparent rounded-full"></span> : <i className="bi bi-floppy"></i>}
                                        <span>Set Default</span>
                                    </button>
                                </div>

                                <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto min-w-0">
                                    <input
                                        type="text"
                                        value={tempatRapor}
                                        onChange={e => setTempatRapor(e.target.value)}
                                        placeholder="Kota (Cth: Banyumas)"
                                        className="flex-1 sm:flex-initial sm:w-32 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 min-w-[110px]"
                                        title="Kota / Tempat Ditetapkannya Rapor (=TEMPAT_RAPOR() / =TITIMANGSA())"
                                    />
                                    <span className="text-slate-400 font-bold shrink-0">,</span>
                                    <input
                                        type="date"
                                        value={tanggalRapor}
                                        onChange={e => setTanggalRapor(e.target.value)}
                                        className="flex-1 sm:flex-initial sm:w-36 border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-semibold bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 min-w-[130px]"
                                        title="Tanggal Pengeluaran Rapor (=TANGGAL_RAPOR() / =TITIMANGSA())"
                                    />
                                    <select
                                        value={formatTanggalRapor}
                                        onChange={e => setFormatTanggalRapor(e.target.value as DateFormatMode)}
                                        className="border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-bold bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer shrink-0"
                                        title="Format kalender default untuk =TITIMANGSA(), =TANGGAL_RAPOR(), dan Rapor Standar"
                                    >
                                        <option value="masehi">Masehi</option>
                                        <option value="hijriah_masehi">Hijriah &amp; Masehi</option>
                                        <option value="hijriah">Hijriah Saja</option>
                                    </select>
                                    {formatTanggalRapor !== 'masehi' && (
                                        <input
                                            type="text"
                                            value={manualHijriRapor}
                                            onChange={e => setManualHijriRapor(e.target.value)}
                                            placeholder={`Otomatis: ${autoHijriHint}`}
                                            className="w-full sm:w-44 border border-amber-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold bg-amber-50/40 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                            title="Opsional: Ketik tanggal Hijriah manual jika mengikuti ketetapan rukyat/istimal pondok (kosongkan untuk konversi otomatis)"
                                        />
                                    )}
                                    <button
                                        onClick={handleSaveUniversalDate}
                                        disabled={isSavingUniversalDate}
                                        title="Simpan tempat, tanggal & format kalender ini sebagai default universal untuk desain & cetak rapor"
                                        className="hidden sm:flex bg-white hover:bg-slate-100 text-teal-700 border border-teal-200 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs items-center gap-1.5 disabled:opacity-50 shrink-0"
                                    >
                                        {isSavingUniversalDate ? <span className="animate-spin h-3 w-3 border-2 border-teal-600 border-t-transparent rounded-full"></span> : <i className="bi bi-floppy"></i>}
                                        <span className="hidden sm:inline">Set Default</span>
                                    </button>
                                </div>
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-1.5 flex-wrap pl-0.5">
                                <span>Hasil Titimangsa:</span>
                                <span className="font-semibold text-slate-700">{liveTitimangsaPreview}</span>
                                {formatTanggalRapor === 'masehi' && (
                                    <>
                                        <span aria-hidden="true">·</span>
                                        <span>Hijriah: {manualHijriRapor.trim() || autoHijriHint}</span>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Quick Format & Drawer Toggle */}
                        <div className="w-full lg:w-auto grid grid-cols-2 xs:flex xs:flex-wrap sm:flex-nowrap items-center gap-2 border-t border-slate-200/70 lg:border-t-0 pt-3 lg:pt-0">
                            {/* Paper Size Switch */}
                            <div className="col-span-1 flex items-center justify-center bg-white border border-slate-200 rounded-xl p-0.5 sm:p-1 shadow-2xs h-[36px] shrink-0">
                                <button
                                    type="button"
                                    onClick={() => applyPrintPageSetupPatch({ paperSize: 'A4' })}
                                    className={`flex-1 xs:flex-initial px-2.5 py-1 rounded-lg text-xs font-bold transition-all h-full flex items-center justify-center ${currentPageSetup.paperSize === 'A4' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                                >
                                    A4
                                </button>
                                <button
                                    type="button"
                                    onClick={() => applyPrintPageSetupPatch({ paperSize: 'F4' })}
                                    className={`flex-1 xs:flex-initial px-2.5 py-1 rounded-lg text-xs font-bold transition-all h-full flex items-center justify-center ${currentPageSetup.paperSize === 'F4' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                                    title="F4 / Folio (21.5 x 33.0 cm)"
                                >
                                    F4
                                </button>
                            </div>

                            {/* Excel-Style Page Fit Preset Selector */}
                            <div className="col-span-1 flex-1 sm:flex-initial flex items-center gap-1.5 bg-indigo-50/70 border border-indigo-200 rounded-xl px-2.5 h-[36px] shadow-2xs min-w-0">
                                <i className="bi bi-aspect-ratio text-indigo-600 text-xs shrink-0"></i>
                                <select
                                    value={currentPageSetup.preset}
                                    onChange={e => {
                                        const nextPreset = e.target.value as RaporPageScalePreset;
                                        applyPrintPageSetupPatch(buildPageSetupStateFromPreset(nextPreset, currentPageSetup));
                                        if (nextPreset === 'fit_custom' || nextPreset === 'manual_scale') {
                                            setShowAdvancedPrintSettings(true);
                                        }
                                    }}
                                    className="font-bold text-xs text-indigo-950 bg-transparent focus:outline-none cursor-pointer w-full truncate"
                                    title="Pilih mode penyesuaian halaman seperti di Excel (Fit 1 Halaman, Fit Lebar ke X Halaman, Fit Tinggi ke Y Halaman, atau Skala Manual)"
                                >
                                    <option value="fit_1_page">Fit Dokumen ke 1 Halaman</option>
                                    <option value="fit_width_1">Fit Lebar 1 Hal (Oper Bawah)</option>
                                    <option value="fit_height_1">Fit Tinggi 1 Hal</option>
                                    <option value="fit_custom">Fit Lebar × Tinggi Kustom</option>
                                    <option value="manual_scale">Skala Manual (%)</option>
                                </select>
                            </div>

                            {/* Collapsible Advanced Settings Toggle */}
                            <button
                                type="button"
                                onClick={() => setShowAdvancedPrintSettings(prev => !prev)}
                                className={`col-span-2 xs:flex-1 sm:flex-initial px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 h-[36px] shrink-0 ${
                                    showAdvancedPrintSettings || !showKop || marginMode !== 'normal' || currentPageSetup.preset !== 'fit_1_page' || orientation !== 'portrait' || rankingDisplayLimit !== 'all'
                                        ? 'bg-teal-50 text-teal-800 border-teal-300 shadow-2xs font-bold'
                                        : 'bg-white text-slate-600 hover:text-slate-900 border-slate-200'
                                }`}
                                title="Buka / tutup opsi tata letak lanjutan (Fit Lebar/Tinggi ke X Halaman, Orientasi, Kop, Judul 3 Baris, Skala %, Margin, Batas Ranking)"
                            >
                                <i className="bi bi-sliders2 text-teal-600"></i>
                                <span className="whitespace-nowrap">Atur Lanjutan</span>
                                <i className={`bi bi-chevron-${showAdvancedPrintSettings ? 'up' : 'down'} text-[10px]`}></i>
                            </button>
                        </div>
                    </div>

                    {/* Collapsible Advanced Settings Drawer */}
                    {showAdvancedPrintSettings && (
                        <div className="mt-3 pt-3 border-t border-slate-200/80 flex flex-wrap items-center gap-2.5 animate-fade-in bg-white/70 p-3 rounded-xl border border-slate-200/60">
                            {/* Orientasi Kertas */}
                            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs shadow-2xs">
                                <i className="bi bi-file-earmark-ruled text-slate-500"></i>
                                <select
                                    value={currentPageSetup.orientation}
                                    onChange={e => applyPrintPageSetupPatch({ orientation: e.target.value as 'portrait' | 'landscape' })}
                                    className="font-bold text-xs bg-transparent text-slate-800 focus:outline-none cursor-pointer"
                                    title="Orientasi Kertas"
                                >
                                    <option value="portrait">Orientasi: Portrait</option>
                                    <option value="landscape">Orientasi: Landscape</option>
                                </select>
                            </div>

                            {/* Excel Fit Lebar ke X Hal & Fit Tinggi ke Y Hal OR Skala Manual */}
                            {currentPageSetup.preset === 'manual_scale' ? (
                                <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs shadow-2xs">
                                    <i className="bi bi-zoom-in text-slate-500"></i>
                                    <span className="font-bold text-slate-500 text-[11px]">Skala:</span>
                                    <select
                                        value={String(typeof currentPageSetup.printScale === 'number' ? currentPageSetup.printScale : 100)}
                                        onChange={e => {
                                            const v = e.target.value;
                                            if (v === 'auto') {
                                                applyPrintPageSetupPatch(buildPageSetupStateFromPreset('fit_1_page', currentPageSetup));
                                            } else {
                                                applyPrintPageSetupPatch({
                                                    printScale: parseInt(v, 10) || 100,
                                                    fitWidthPages: 'auto',
                                                    fitHeightPages: 'auto'
                                                });
                                            }
                                        }}
                                        className="font-bold text-xs bg-transparent text-slate-800 focus:outline-none cursor-pointer tabular-nums"
                                        title="Skala persentase manual (sisa baris/kolom otomatis di-oper ke halaman berikutnya)"
                                    >
                                        <option value="auto">Auto (Fit 1 Halaman)</option>
                                        <option value="100">100% (Normal)</option>
                                        <option value="95">95%</option>
                                        <option value="90">90%</option>
                                        <option value="85">85%</option>
                                        <option value="80">80%</option>
                                        <option value="75">75%</option>
                                        <option value="70">70%</option>
                                    </select>
                                </div>
                            ) : (
                                <div className="flex flex-wrap items-center gap-1.5 bg-indigo-50/50 border border-indigo-200 rounded-xl px-2.5 py-1.5 text-xs shadow-2xs">
                                    <span className="font-bold text-indigo-900 text-[11px] whitespace-nowrap">Fit Lebar:</span>
                                    <select
                                        value={String(currentPageSetup.fitWidthPages)}
                                        onChange={e =>
                                            applyPrintPageSetupPatch({
                                                printScale: 'auto',
                                                fitWidthPages: e.target.value === 'auto' ? 'auto' : parseInt(e.target.value, 10)
                                            })
                                        }
                                        className="font-bold text-xs bg-white border border-indigo-200 rounded-lg px-2 py-0.5 text-slate-800 focus:outline-none cursor-pointer"
                                        title="Fit lebar dokumen ke X halaman"
                                    >
                                        <option value="auto">Otomatis</option>
                                        <option value="1">1 Halaman</option>
                                        <option value="2">2 Halaman</option>
                                        <option value="3">3 Halaman</option>
                                        <option value="4">4 Halaman</option>
                                    </select>
                                    <span className="text-indigo-300 font-bold">×</span>
                                    <span className="font-bold text-indigo-900 text-[11px] whitespace-nowrap">Fit Tinggi:</span>
                                    <select
                                        value={String(currentPageSetup.fitHeightPages)}
                                        onChange={e =>
                                            applyPrintPageSetupPatch({
                                                printScale: 'auto',
                                                fitHeightPages: e.target.value === 'auto' ? 'auto' : parseInt(e.target.value, 10)
                                            })
                                        }
                                        className="font-bold text-xs bg-white border border-indigo-200 rounded-lg px-2 py-0.5 text-slate-800 focus:outline-none cursor-pointer"
                                        title="Fit tinggi dokumen ke Y halaman (Otomatis = sisa bawah di-oper ke halaman selanjutnya)"
                                    >
                                        <option value="auto">Otomatis (Oper Hal.)</option>
                                        <option value="1">1 Halaman</option>
                                        <option value="2">2 Halaman</option>
                                        <option value="3">3 Halaman</option>
                                        <option value="4">4 Halaman</option>
                                        <option value="5">5 Halaman</option>
                                    </select>
                                </div>
                            )}

                            {/* Toggle Ulangi Baris Header Tabel saat Multi-Halaman */}
                            {currentPageSetup.fitHeightPages !== 1 && (
                                <button
                                    type="button"
                                    onClick={() => applyPrintPageSetupPatch({ repeatHeaderRows: !currentPageSetup.repeatHeaderRows })}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 whitespace-nowrap ${
                                        currentPageSetup.repeatHeaderRows
                                            ? 'bg-teal-50 text-teal-800 border-teal-200 shadow-2xs'
                                            : 'bg-slate-100 text-slate-500 border-slate-200'
                                    }`}
                                    title="Ulangi baris judul tabel nilai secara otomatis di Halaman 2 dan seterusnya"
                                >
                                    <i className="bi bi-layout-three-columns"></i>
                                    <span>{currentPageSetup.repeatHeaderRows ? 'Ulangi Header: Aktif' : 'Ulangi Header: Off'}</span>
                                </button>
                            )}

                            {/* Kop Toggle */}
                            <button
                                onClick={() => setShowKop(prev => !prev)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 whitespace-nowrap ${showKop ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}
                                title="Toggle tampilan Kop Lembaga (nonaktifkan jika mencetak pada kertas berkop cetak sendiri)"
                            >
                                <i className={`bi ${showKop ? 'bi-check-circle-fill text-emerald-600' : 'bi-circle'}`}></i>
                                <span>{showKop ? 'Kop Aktif' : 'Tanpa Kop'}</span>
                            </button>

                            {/* Judul Rapor Toggle (Bisa 1-3 Baris) & Tombol Atur Judul */}
                            <div className="flex items-center gap-1">
                                <button
                                    type="button"
                                    onClick={() => setShowJudul(prev => (prev === 'auto' ? (isTemplateHasCustomTitle ? true : false) : !prev))}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 whitespace-nowrap ${
                                        effectiveShowJudul ? 'bg-amber-50 text-amber-800 border-amber-200 shadow-2xs' : 'bg-slate-100 text-slate-500 border-slate-200'
                                    }`}
                                    title={
                                        effectiveShowJudul
                                            ? "Judul dokumen rapor di bawah Kop sedang aktif (teks 1-3 baris). Klik untuk sembunyikan jika judul sudah didesain di dalam tabel."
                                            : "Judul dokumen rapor di bawah Kop dinonaktifkan."
                                    }
                                >
                                    <i className={`bi ${effectiveShowJudul ? 'bi-card-heading text-amber-600' : 'bi-card-text text-slate-400'}`}></i>
                                    <span>{effectiveShowJudul ? 'Judul: Aktif' : 'Judul: Nonaktif'}</span>
                                    {isTemplateHasCustomTitle && !effectiveShowJudul && (
                                        <span className="text-amber-700 text-[10px] font-semibold hidden xl:inline" title="Judul rapor dibuat mandiri di dalam tabel sel desain">
                                            · Format Sendiri
                                        </span>
                                    )}
                                </button>
                                {selectedTemplate && (
                                    <button
                                        type="button"
                                        onClick={() => setIsTitleModalOpen(true)}
                                        className="px-2.5 py-1.5 rounded-xl text-xs font-bold border border-amber-300 bg-amber-100/90 hover:bg-amber-200 text-amber-900 transition-all flex items-center gap-1 shadow-2xs whitespace-nowrap"
                                        title="Atur teks judul dokumen rapor resmi (bisa 1 - 3 baris dengan Enter dan tag otomatis)"
                                    >
                                        <i className="bi bi-pencil-square text-amber-700"></i>
                                        <span className="hidden sm:inline">Atur 3 Baris</span>
                                    </button>
                                )}
                            </div>

                            {/* Toggle Biodata Otomatis (Nama, NIS, Rombel, Ranking) */}
                            <button
                                type="button"
                                onClick={() => setShowBiodataHeader(prev => (prev === 'auto' ? isTemplateHasCustomBiodata : !prev))}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 whitespace-nowrap ${
                                    effectiveShowBiodata
                                        ? 'bg-blue-50 text-blue-800 border-blue-200 shadow-2xs'
                                        : 'bg-slate-100 text-slate-500 border-slate-200'
                                }`}
                                title={
                                    isTemplateHasCustomBiodata
                                        ? "Template ini sudah memiliki format nama/nis/rombel sendiri di tabelnya. Header bawaan dinonaktifkan agar tidak muncul dobel."
                                        : "Aktifkan atau nonaktifkan header identitas santri bawaan sistem"
                                }
                            >
                                <i className={`bi ${effectiveShowBiodata ? 'bi-person-badge-fill text-blue-600' : 'bi-person-x text-slate-400'}`}></i>
                                <span>{effectiveShowBiodata ? 'Biodata: Aktif' : 'Biodata: Nonaktif'}</span>
                                {isTemplateHasCustomBiodata && !effectiveShowBiodata && (
                                    <span className="text-amber-700 text-[10px] font-semibold hidden xl:inline" title="Format santri dibuat mandiri di dalam tabel desain">
                                        · Format Sendiri
                                    </span>
                                )}
                            </button>

                            {/* Margins */}
                            <select
                                value={currentPageSetup.marginMode}
                                onChange={e => applyPrintPageSetupPatch({ marginMode: e.target.value as any })}
                                className="border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold bg-white text-slate-700"
                                title="Pilihan Margin Kertas"
                            >
                                <option value="normal">Margin Normal</option>
                                <option value="narrow">Margin Sempit</option>
                                <option value="none">Tanpa Margin (Nol)</option>
                            </select>

                            {/* Batas Tampilan Ranking */}
                            <div className="flex items-center gap-1.5 bg-amber-50/70 border border-amber-200/80 rounded-xl px-2.5 py-1 text-xs">
                                <i className="bi bi-trophy-fill text-amber-500 text-xs"></i>
                                <span className="font-bold text-amber-900 text-[11px] hidden sm:inline">Batas Ranking:</span>
                                <select
                                    value={rankingDisplayLimit}
                                    onChange={e => setRankingDisplayLimit(e.target.value as RankingDisplayLimit)}
                                    className="font-bold text-xs bg-transparent text-amber-950 focus:outline-none cursor-pointer"
                                    title="Atur batasan peringkat kelas yang dicetak pada rapor santri"
                                >
                                    <option value="all">Semua Peringkat (1 s.d. Selesai)</option>
                                    <option value="3">Hanya Top 3 (Juara 1 - 3)</option>
                                    <option value="5">Hanya Top 5 (Juara 1 - 5)</option>
                                    <option value="10">Hanya Top 10 (Juara 1 - 10)</option>
                                    <option value="none">Sembunyikan Ranking (Off)</option>
                                </select>
                            </div>
                        </div>
                    )}
                </div>

                {/* Sub-bar: Search, Filter Tabs & Selection Tools */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
                    {/* Status Tabs */}
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                        <button
                            onClick={() => setStatusTab('all')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${statusTab === 'all' ? 'bg-slate-800 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        >
                            Semua ({counts.all})
                        </button>
                        <button
                            onClick={() => setStatusTab('complete')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${statusTab === 'complete' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}
                        >
                            <i className="bi bi-check-circle"></i>
                            <span>Siap Cetak ({counts.complete})</span>
                        </button>
                        <button
                            onClick={() => setStatusTab('partial')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${statusTab === 'partial' ? 'bg-amber-600 text-white shadow-xs' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'}`}
                        >
                            <i className="bi bi-exclamation-circle"></i>
                            <span>Sebagian ({counts.partial})</span>
                        </button>
                        <button
                            onClick={() => setStatusTab('empty')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${statusTab === 'empty' ? 'bg-rose-600 text-white shadow-xs' : 'bg-rose-50 text-rose-700 hover:bg-rose-100'}`}
                        >
                            <i className="bi bi-dash-circle"></i>
                            <span>Belum Diisi ({counts.empty})</span>
                        </button>
                    </div>

                    {/* Search & Sort Controls */}
                    <div className="flex items-center gap-2">
                        <div className="relative flex-grow sm:w-56">
                            <i className="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Cari santri / NIS..."
                                className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    <i className="bi bi-x-circle-fill text-xs"></i>
                                </button>
                            )}
                        </div>

                        <select
                            value={sortBy}
                            onChange={e => setSortBy(e.target.value as any)}
                            className="border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold bg-white text-slate-700"
                        >
                            <option value="name">Urut Nama</option>
                            <option value="rank">Urut Ranking</option>
                            <option value="nis">Urut NIS</option>
                        </select>
                    </div>
                </div>

                {/* Selection Action Ribbon */}
                <div className="bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 mb-4 text-xs font-semibold text-slate-600">
                    <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                            <input
                                type="checkbox"
                                checked={filteredSantriList.length > 0 && selectedSantriIds.size === filteredSantriList.length}
                                onChange={e => {
                                    if (e.target.checked) handleSelectAllFiltered();
                                    else handleDeselectAll();
                                }}
                                className="rounded text-teal-600 focus:ring-teal-500 w-4 h-4 cursor-pointer"
                            />
                            <span>Pilih Semua yang Tampil ({filteredSantriList.length})</span>
                        </label>

                        <button
                            type="button"
                            onClick={handleSelectCompleteOnly}
                            className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold flex items-center gap-1 transition-colors"
                            title="Pilih otomatis hanya santri yang seluruh kolom nilainya sudah terisi 100% Lengkap"
                        >
                            <i className="bi bi-check2-all text-emerald-600"></i>
                            <span>Pilih Hanya yang Lengkap 100% ({counts.complete})</span>
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        <span>Terpilih: <strong className="text-teal-700">{selectedSantriIds.size}</strong> santri</span>
                        {selectedSantriIds.size > 0 && (
                            <button
                                onClick={handleDeselectAll}
                                className="text-slate-400 hover:text-rose-600 font-bold"
                            >
                                Reset
                            </button>
                        )}
                    </div>
                </div>

                {/* Student Roster List */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                    <div className="max-h-[540px] overflow-y-auto divide-y divide-slate-100 no-scrollbar sm:scrollbar">
                        {filteredSantriList.map((santri, idx) => {
                            const isSelected = selectedSantriIds.has(santri.id);
                            const row = studentLegerMap.get(santri.id);
                            const hasRecord = periodRecordsMap.has(santri.id);
                            const status = row?.completenessStatus || (hasRecord ? 'Sebagian' : 'Kosong');
                            const rombel = settings.rombel.find(r => r.id === santri.rombelId);

                            return (
                                <div
                                    key={santri.id}
                                    className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 gap-2.5 sm:gap-4 transition-colors group ${isSelected ? 'bg-teal-50/40' : 'hover:bg-slate-50/80'}`}
                                >
                                    {/* Top (Mobile) / Left (Desktop): Checkbox + Number + Student Details */}
                                    <div className="flex items-start sm:items-center gap-2.5 sm:gap-3 flex-1 min-w-0">
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => handleToggleSelectSantri(santri.id)}
                                            className="rounded text-teal-600 focus:ring-teal-500 w-4 h-4 cursor-pointer shrink-0 mt-0.5 sm:mt-0"
                                        />

                                        <span className="hidden xs:flex w-7 h-7 rounded-lg bg-slate-100 text-slate-500 items-center justify-center text-[10px] font-black group-hover:bg-teal-50 group-hover:text-teal-700 transition-colors shrink-0">
                                            {idx + 1}
                                        </span>

                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap mb-1">
                                                <span className="font-black text-xs sm:text-sm text-slate-800 break-words">
                                                    {santri.namaLengkap}
                                                </span>

                                                {/* Ranking Badge */}
                                                {row && row.ranking > 0 && (() => {
                                                    const isHidden = rankingDisplayLimit !== 'all' && (
                                                        rankingDisplayLimit === 'none' ||
                                                        (rankingDisplayLimit === '3' && row.ranking > 3) ||
                                                        (rankingDisplayLimit === '5' && row.ranking > 5) ||
                                                        (rankingDisplayLimit === '10' && row.ranking > 10)
                                                    );
                                                    return (
                                                        <span
                                                            className={`${isHidden ? 'bg-slate-100 text-slate-500 border border-slate-200' : 'bg-indigo-50 text-indigo-700 border border-indigo-200'} text-[10px] font-black px-2 py-0.5 rounded-md flex items-center gap-1 shrink-0`}
                                                            title={isHidden ? 'Peringkat ini disembunyikan pada cetak rapor sesuai batas tampilan' : 'Peringkat akan dicetak pada rapor'}
                                                        >
                                                            <i className={`bi bi-award-fill ${isHidden ? 'text-slate-400' : 'text-amber-500'}`}></i>
                                                            <span>Juara #{row.ranking}</span>
                                                            {isHidden && <span className="text-[9px] text-slate-400 font-normal italic">(Off di Rapor)</span>}
                                                        </span>
                                                    );
                                                })()}

                                                {/* Rata-rata Score Badge */}
                                                {row && row.rataRata > 0 && (
                                                    <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0">
                                                        Rerata: {row.rataRataFormatted} ({row.predikat.predikat})
                                                    </span>
                                                )}
                                            </div>

                                            <div className="text-[10px] text-slate-400 flex items-center gap-1.5 sm:gap-2 font-semibold flex-wrap">
                                                <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded shrink-0">
                                                    NIS: {santri.nis || '-'}
                                                </span>
                                                <span className="text-teal-700 bg-teal-50 px-2 py-0.5 rounded font-bold shrink-0">
                                                    {rombel?.nama || 'Tanpa Rombel'}
                                                </span>

                                                {/* Status indicator badge */}
                                                {status === 'Lengkap' ? (
                                                    <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 shrink-0">
                                                        <i className="bi bi-check-circle-fill text-emerald-600"></i>
                                                        <span>Lengkap</span>
                                                    </span>
                                                ) : status === 'Sebagian' ? (
                                                    <span className="bg-amber-50 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 shrink-0">
                                                        <i className="bi bi-exclamation-circle-fill text-amber-500"></i>
                                                        <span>Sebagian ({row?.percentComplete || 50}%)</span>
                                                    </span>
                                                ) : (
                                                    <span className="bg-rose-50 text-rose-600 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 shrink-0">
                                                        <i className="bi bi-dash-circle-fill text-rose-500"></i>
                                                        <span>Belum Diisi</span>
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Bottom (Mobile) / Right (Desktop): Actions */}
                                    <div className="flex items-center gap-2 shrink-0 border-t border-slate-100 sm:border-t-0 pt-2 sm:pt-0 pl-6.5 sm:pl-0 w-full sm:w-auto">
                                        <button
                                            type="button"
                                            onClick={() => handleOpenWhatsAppModal(santri)}
                                            className="flex-1 sm:flex-initial bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border border-emerald-200 hover:border-emerald-600 shadow-2xs active:scale-95"
                                            title="Kirim ringkasan laporan hasil belajar santri ini via WhatsApp ke orang tua / wali"
                                        >
                                            <i className="bi bi-whatsapp"></i>
                                            <span>Kirim WA</span>
                                        </button>

                                        {status !== 'Lengkap' && onNavigateToTab && (
                                            <button
                                                type="button"
                                                onClick={() => onNavigateToTab('input_wali', santri.rombelId)}
                                                className="hidden md:flex bg-slate-50 hover:bg-teal-50 text-slate-600 hover:text-teal-700 border border-slate-200 hover:border-teal-200 px-3 py-1.5 rounded-xl text-xs font-bold transition-all items-center gap-1.5"
                                                title="Input atau lengkapi nilai santri ini di Lembar Wali Kelas"
                                            >
                                                <i className="bi bi-pencil-square text-xs"></i>
                                                <span>Isi Nilai</span>
                                            </button>
                                        )}

                                        <button
                                            type="button"
                                            onClick={() => handleOpenPreview(santri.id)}
                                            className="flex-1 sm:flex-initial bg-white hover:bg-teal-600 text-teal-700 hover:text-white px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 border border-teal-200 hover:border-teal-600 shadow-xs active:scale-95"
                                        >
                                            <i className="bi bi-eye-fill"></i>
                                            <span>Pratinjau</span>
                                        </button>
                                    </div>
                                </div>
                            );
                        })}

                        {filteredSantriList.length === 0 && (
                            <div className="p-12 text-center text-slate-400 italic bg-slate-50/50">
                                <i className="bi bi-person-dash text-4xl mb-3 block opacity-20"></i>
                                Tidak ada santri aktif sesuai filter yang dipilih.
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Kredit Cetak Rapor */}
                <div className="no-print pt-3 pb-1 text-center text-xs text-slate-500">
                    <span>dibuat dengan eSantri Web by AI Projek | </span>
                    <a
                        href="https://aiprojek01.my.id"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-teal-700 hover:underline"
                    >
                        aiprojek01.my.id
                    </a>
                </div>
            </div>

            {/* SINGLE PREVIEW MODAL WITH SLIDER NAVIGATION */}
            {isPreviewOpen && currentPreviewSantri && (
                <div className="fixed inset-0 bg-black/75 z-[70] flex justify-center items-center p-1 sm:p-4 animate-fade-in backdrop-blur-xs">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[95vh] sm:h-[92vh] max-h-[96dvh] flex flex-col overflow-hidden border border-slate-200">
                        {/* Modal Header */}
                        <div className="p-3 sm:p-4 border-b border-slate-200 bg-slate-50 flex flex-col gap-2.5 sm:gap-3 shrink-0">
                            {/* Row 1: Student Title + Carousel + Pinned Close Button (Always visible on mobile) */}
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                                    {/* Navigation Carousel Controls */}
                                    <div className="flex items-center bg-white border border-slate-200 rounded-xl p-0.5 shadow-2xs shrink-0">
                                        <button
                                            onClick={handlePrevStudent}
                                            disabled={previewSantriIndex <= 0}
                                            className="p-1 sm:p-1.5 text-slate-600 hover:text-teal-700 disabled:opacity-30 disabled:hover:text-slate-600 transition-all rounded-lg active:scale-95"
                                            title="Santri Sebelumnya"
                                        >
                                            <i className="bi bi-chevron-left text-xs sm:text-sm font-bold"></i>
                                        </button>
                                        <span className="text-[10px] sm:text-[11px] font-black text-slate-700 px-1.5 sm:px-2 whitespace-nowrap">
                                            {previewSantriIndex + 1} / {filteredSantriList.length}
                                        </span>
                                        <button
                                            onClick={handleNextStudent}
                                            disabled={previewSantriIndex >= filteredSantriList.length - 1}
                                            className="p-1 sm:p-1.5 text-slate-600 hover:text-teal-700 disabled:opacity-30 disabled:hover:text-slate-600 transition-all rounded-lg active:scale-95"
                                            title="Santri Selanjutnya"
                                        >
                                            <i className="bi bi-chevron-right text-xs sm:text-sm font-bold"></i>
                                        </button>
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <h3 className="text-xs sm:text-base font-black text-slate-800 truncate" title={currentPreviewSantri.namaLengkap}>
                                            {currentPreviewSantri.namaLengkap}
                                        </h3>
                                        <div className="text-[10px] text-slate-500 font-bold flex items-center gap-1.5 sm:gap-2 flex-wrap">
                                            <span>NIS: {currentPreviewSantri.nis || '-'}</span>
                                            {currentPreviewCalculation?.ranking ? (
                                                <span className="text-indigo-600 font-bold">
                                                    Juara #{currentPreviewCalculation.ranking}
                                                </span>
                                            ) : currentPreviewRow?.ranking && currentPreviewRow.ranking > 0 ? (
                                                <span className="text-slate-400 font-medium italic">
                                                    Rank #{currentPreviewRow.ranking} (Off)
                                                </span>
                                            ) : null}
                                            <span className="hidden xs:inline">• Format: {paperSize}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* PINNED CLOSE BUTTON - GUARANTEED VISIBLE ON ALL SCREENS */}
                                <button
                                    type="button"
                                    onClick={() => setIsPreviewOpen(false)}
                                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-200/80 hover:bg-slate-300 text-slate-600 hover:text-slate-900 flex items-center justify-center transition-all shrink-0 active:scale-90"
                                    title="Tutup Pratinjau (Esc)"
                                >
                                    <i className="bi bi-x-lg text-sm sm:text-base font-bold"></i>
                                </button>
                            </div>

                            {/* Row 2: Responsive Toolbar & Action Buttons */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-200/70">
                                {/* Settings & View Controls Strip */}
                                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 sm:pb-0 flex-wrap">
                                    {/* Zoom Controls */}
                                    <div className="flex items-center bg-white border border-slate-200 rounded-xl px-1.5 py-0.5 shadow-2xs text-xs h-[32px] shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => setPreviewZoom(prev => Math.max(0.4, Number((prev - 0.1).toFixed(1))))}
                                            disabled={previewZoom <= 0.4}
                                            className="p-1 text-slate-500 hover:text-slate-800 disabled:opacity-30 rounded hover:bg-slate-100"
                                            title="Perkecil Zoom"
                                        >
                                            <i className="bi bi-dash-lg text-xs"></i>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setPreviewZoom(1.0)}
                                            className="px-1.5 font-black text-slate-700 hover:text-teal-700 text-[10px] sm:text-[11px] cursor-pointer"
                                            title="Klik untuk reset zoom ke 100%"
                                        >
                                            {Math.round(previewZoom * 100)}%
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setPreviewZoom(prev => Math.min(1.8, Number((prev + 0.1).toFixed(1))))}
                                            disabled={previewZoom >= 1.8}
                                            className="p-1 text-slate-500 hover:text-slate-800 disabled:opacity-30 rounded hover:bg-slate-100"
                                            title="Perbesar Zoom"
                                        >
                                            <i className="bi bi-plus-lg text-xs"></i>
                                        </button>
                                    </div>

                                    {templateSheets.length > 1 && (
                                        <select
                                            value={selectedPrintSheetId}
                                            onChange={e => setSelectedPrintSheetId(e.target.value)}
                                            className="h-[32px] px-2 bg-indigo-50 border border-indigo-200 rounded-xl text-xs font-bold text-indigo-800 hover:bg-indigo-100 transition-all focus:outline-none shrink-0"
                                            title="Pilih Lembar / Format yang ditampilkan"
                                        >
                                            <option value="all">Semua Lembar ({templateSheets.length})</option>
                                            {templateSheets.map(sh => (
                                                <option key={sh.id} value={sh.id}>{sh.name}</option>
                                            ))}
                                        </select>
                                    )}

                                    {/* Excel Page Fit Preset & Dimension Controls in Single Preview */}
                                    <select
                                        value={currentPageSetup.preset}
                                        onChange={e => {
                                            const nextPreset = e.target.value as RaporPageScalePreset;
                                            applyPrintPageSetupPatch(buildPageSetupStateFromPreset(nextPreset, currentPageSetup));
                                        }}
                                        className="h-[32px] px-2 bg-indigo-50/70 border border-indigo-200 rounded-xl text-xs font-bold text-indigo-950 focus:outline-none cursor-pointer shrink-0"
                                        title="Mode Penyesuaian Halaman (Ala Excel)"
                                    >
                                        <option value="fit_1_page">Fit Dokumen 1 Hal</option>
                                        <option value="fit_width_1">Fit Lebar 1 Hal (Oper Bawah)</option>
                                        <option value="fit_height_1">Fit Tinggi 1 Hal</option>
                                        <option value="fit_custom">Fit Lebar × Tinggi Kustom</option>
                                        <option value="manual_scale">Skala Manual (%)</option>
                                    </select>

                                    {currentPageSetup.preset === 'manual_scale' ? (
                                        <select
                                            value={String(typeof currentPageSetup.printScale === 'number' ? currentPageSetup.printScale : 100)}
                                            onChange={e =>
                                                applyPrintPageSetupPatch({
                                                    printScale: parseInt(e.target.value, 10) || 100,
                                                    fitWidthPages: 'auto',
                                                    fitHeightPages: 'auto'
                                                })
                                            }
                                            className="h-[32px] px-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none cursor-pointer shrink-0 tabular-nums"
                                            title="Skala Cetak Manual"
                                        >
                                            <option value="100">100%</option>
                                            <option value="95">95%</option>
                                            <option value="90">90%</option>
                                            <option value="85">85%</option>
                                            <option value="80">80%</option>
                                            <option value="75">75%</option>
                                        </select>
                                    ) : (
                                        <div className="flex items-center bg-white border border-slate-200 rounded-xl px-2 h-[32px] gap-1 text-xs shrink-0">
                                            <span className="text-slate-500 font-semibold">L:</span>
                                            <select
                                                value={String(currentPageSetup.fitWidthPages)}
                                                onChange={e =>
                                                    applyPrintPageSetupPatch({
                                                        printScale: 'auto',
                                                        fitWidthPages: e.target.value === 'auto' ? 'auto' : parseInt(e.target.value, 10)
                                                    })
                                                }
                                                className="font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
                                                title="Fit lebar ke X halaman"
                                            >
                                                <option value="auto">Auto</option>
                                                <option value="1">1 Hal</option>
                                                <option value="2">2 Hal</option>
                                                <option value="3">3 Hal</option>
                                                <option value="4">4 Hal</option>
                                            </select>
                                            <span className="text-slate-300">×</span>
                                            <span className="text-slate-500 font-semibold">T:</span>
                                            <select
                                                value={String(currentPageSetup.fitHeightPages)}
                                                onChange={e =>
                                                    applyPrintPageSetupPatch({
                                                        printScale: 'auto',
                                                        fitHeightPages: e.target.value === 'auto' ? 'auto' : parseInt(e.target.value, 10)
                                                    })
                                                }
                                                className="font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
                                                title="Fit tinggi ke Y halaman (Auto = sisa bawah di-oper ke halaman selanjutnya)"
                                            >
                                                <option value="auto">Auto (Oper)</option>
                                                <option value="1">1 Hal</option>
                                                <option value="2">2 Hal</option>
                                                <option value="3">3 Hal</option>
                                                <option value="4">4 Hal</option>
                                                <option value="5">5 Hal</option>
                                            </select>
                                        </div>
                                    )}

                                    <select
                                        value={rankingDisplayLimit}
                                        onChange={e => setRankingDisplayLimit(e.target.value as RankingDisplayLimit)}
                                        className="h-[32px] px-2 bg-amber-50 border border-amber-200 rounded-xl text-xs font-bold text-amber-900 focus:outline-none cursor-pointer shrink-0"
                                        title="Batasi tampilan peringkat pada cetak rapor"
                                    >
                                        <option value="all">Rank: Semua</option>
                                        <option value="3">Rank: Top 3</option>
                                        <option value="5">Rank: Top 5</option>
                                        <option value="10">Rank: Top 10</option>
                                        <option value="none">Rank: Off</option>
                                    </select>

                                    <button
                                        type="button"
                                        onClick={() => applyPrintPageSetupPatch({ paperSize: currentPageSetup.paperSize === 'A4' ? 'F4' : 'A4' })}
                                        className="h-[32px] px-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all shrink-0 shadow-2xs whitespace-nowrap"
                                        title="Ganti ukuran kertas (A4 / F4)"
                                    >
                                        Kertas: {currentPageSetup.paperSize}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => applyPrintPageSetupPatch({ orientation: currentPageSetup.orientation === 'portrait' ? 'landscape' : 'portrait' })}
                                        className="h-[32px] px-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all shrink-0 shadow-2xs whitespace-nowrap"
                                        title="Ganti orientasi kertas (Portrait / Landscape)"
                                    >
                                        {currentPageSetup.orientation === 'landscape' ? 'Landscape' : 'Portrait'}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setShowKop(prev => !prev)}
                                        className={`h-[32px] px-2.5 rounded-xl text-xs font-bold border transition-all shrink-0 shadow-2xs flex items-center gap-1 whitespace-nowrap ${
                                            showKop ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                                        }`}
                                        title="Toggle Kop Dokumen"
                                    >
                                        <i className={`bi ${showKop ? 'bi-check-circle-fill text-emerald-600' : 'bi-circle'}`}></i>
                                        <span>{showKop ? 'Kop Aktif' : 'Tanpa Kop'}</span>
                                    </button>
                                </div>

                                {/* Primary Action Buttons (Side by side 50/50 on mobile, inline on desktop) */}
                                <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => handleOpenWhatsAppModal(currentPreviewSantri)}
                                        className="flex-1 sm:flex-initial h-[36px] bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 shrink-0 whitespace-nowrap"
                                        title="Kirim ringkasan rapor santri ini via WhatsApp"
                                    >
                                        <i className="bi bi-whatsapp"></i>
                                        <span>Kirim WA</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            printToPdfNative(
                                                'rapor-preview-container',
                                                `Rapor_${currentPreviewSantri.namaLengkap.replace(/\s+/g, '_')}_${filterTahun.replace('/', '-')}`,
                                                {
                                                    paperSize: currentPageSetup.paperSize,
                                                    orientation: currentPageSetup.orientation
                                                }
                                            )
                                        }
                                        className="flex-1 sm:flex-initial h-[36px] bg-teal-600 hover:bg-teal-700 text-white px-4 py-1.5 rounded-xl text-xs font-black shadow-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 shrink-0 whitespace-nowrap"
                                        title="Cetak Rapor ke printer atau simpan sebagai PDF"
                                    >
                                        <i className="bi bi-printer-fill"></i>
                                        <span>Cetak PDF</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Modal Body: Render Area */}
                        <div className="flex-grow overflow-auto bg-slate-200/90 p-4 sm:p-8 flex justify-center">
                            <div
                                id="rapor-preview-container"
                                className="print:block"
                                style={{
                                    transform: `scale(${previewZoom})`,
                                    transformOrigin: 'top center',
                                    transition: 'transform 0.15s ease'
                                }}
                            >
                                {selectedTemplate ? (
                                    <DynamicRaporPreview
                                        template={selectedTemplate}
                                        targetSheetId={selectedPrintSheetId}
                                        santri={currentPreviewSantri}
                                        record={currentPreviewRecord}
                                        settings={settings}
                                        digitalAssets={digitalAssets}
                                        tanggalRapor={tanggalRapor}
                                        tempatRapor={tempatRapor}
                                        formatTanggalRapor={formatTanggalRapor}
                                        manualHijriRapor={manualHijriRapor}
                                        tahunAjaran={filterTahun}
                                        semester={filterSemester}
                                        calculation={currentPreviewCalculation}
                                        cohortRecords={currentPreviewCohortMeta?.rombelRecords}
                                        paperSize={currentPageSetup.paperSize}
                                        orientation={hasManualOrientationOverride ? currentPageSetup.orientation : undefined}
                                        showKop={showKop}
                                        marginMode={currentPageSetup.marginMode}
                                        fitToPage={currentPageSetup.fitToPage}
                                        fitWidthPages={currentPageSetup.fitWidthPages}
                                        fitHeightPages={currentPageSetup.fitHeightPages}
                                        repeatHeaderRows={currentPageSetup.repeatHeaderRows}
                                        printScale={currentPageSetup.printScale}
                                        showJudul={effectiveShowJudul}
                                        showBiodataHeader={effectiveShowBiodata}
                                        isLastDocument={true}
                                    />
                                ) : (
                                    <div
                                        className="bg-white shadow-lg p-8 printable-content-wrapper"
                                        style={{ width: currentPageSetup.paperSize === 'F4' ? '21.5cm' : '21cm', minHeight: currentPageSetup.paperSize === 'F4' ? '33cm' : '29.7cm', padding: currentPageSetup.marginMode === 'narrow' ? '1.2cm' : currentPageSetup.marginMode === 'none' ? '0.4cm' : '2cm' }}
                                    >
                                        <RaporLengkapTemplate
                                            santri={currentPreviewSantri}
                                            settings={settings}
                                            options={{
                                                tahunAjaran: filterTahun,
                                                semester: filterSemester,
                                                tanggalRapor,
                                                tempatRapor,
                                                formatMode: formatTanggalRapor,
                                                manualHijri: manualHijriRapor,
                                                showKop,
                                                paperSize: currentPageSetup.paperSize
                                            }}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* BATCH PRINT MODAL */}
            {isBatchPrinting && batchData.length > 0 && (
                <div className="fixed inset-0 bg-black/75 z-[70] flex justify-center items-center p-1 sm:p-4 animate-fade-in backdrop-blur-xs">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[95vh] sm:h-[92vh] max-h-[96dvh] flex flex-col overflow-hidden border border-slate-200">
                        {/* Modal Header */}
                        <div className="p-3 sm:p-4 border-b border-slate-200 bg-slate-50 flex flex-col gap-2.5 sm:gap-3 shrink-0">
                            {/* Row 1: Title + Subtitle + PINNED CLOSE BUTTON */}
                            <div className="flex items-center justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                    <h3 className="text-sm sm:text-base font-black text-slate-800 truncate">
                                        Cetak Massal ({batchData.length} Dokumen Rapor)
                                    </h3>
                                    <p className="text-[10px] text-slate-500 font-bold truncate">
                                        Ukuran: {currentPageSetup.paperSize} ({currentPageSetup.orientation === 'landscape' ? 'Landscape' : 'Portrait'}) · Kop: {showKop ? 'Aktif' : 'Nonaktif'} · Tiap santri otomatis mulai di halaman baru
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setIsBatchPrinting(false)}
                                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-200/80 hover:bg-slate-300 text-slate-600 hover:text-slate-900 flex items-center justify-center transition-all shrink-0 active:scale-90"
                                    title="Tutup (Esc)"
                                >
                                    <i className="bi bi-x-lg text-sm sm:text-base font-bold"></i>
                                </button>
                            </div>

                            {/* Row 2: Controls & Start Print CTA */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-200/70">
                                {/* Settings Strip */}
                                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 sm:pb-0 flex-wrap">
                                    {templateSheets.length > 1 && (
                                        <select
                                            value={selectedPrintSheetId}
                                            onChange={e => setSelectedPrintSheetId(e.target.value)}
                                            className="h-[32px] px-2 bg-indigo-50 border border-indigo-200 rounded-xl text-xs font-bold text-indigo-800 hover:bg-indigo-100 transition-all focus:outline-none shrink-0"
                                            title="Pilih Format / Lembar untuk cetak massal"
                                        >
                                            <option value="all">Semua Format ({templateSheets.length})</option>
                                            {templateSheets.map(sh => (
                                                <option key={sh.id} value={sh.id}>Cetak: {sh.name}</option>
                                            ))}
                                        </select>
                                    )}

                                    <select
                                        value={currentPageSetup.preset}
                                        onChange={e => {
                                            const nextPreset = e.target.value as RaporPageScalePreset;
                                            applyPrintPageSetupPatch(buildPageSetupStateFromPreset(nextPreset, currentPageSetup));
                                        }}
                                        className="h-[32px] px-2 bg-indigo-50/70 border border-indigo-200 rounded-xl text-xs font-bold text-indigo-950 focus:outline-none cursor-pointer shrink-0"
                                        title="Mode Penyesuaian Halaman (Ala Excel)"
                                    >
                                        <option value="fit_1_page">Fit Dokumen 1 Hal</option>
                                        <option value="fit_width_1">Fit Lebar 1 Hal (Oper Bawah)</option>
                                        <option value="fit_height_1">Fit Tinggi 1 Hal</option>
                                        <option value="fit_custom">Fit Lebar × Tinggi Kustom</option>
                                        <option value="manual_scale">Skala Manual (%)</option>
                                    </select>

                                    {currentPageSetup.preset !== 'manual_scale' ? (
                                        <div className="flex items-center bg-white border border-slate-200 rounded-xl px-2 h-[32px] gap-1 text-xs shrink-0">
                                            <span className="text-slate-500 font-semibold">L:</span>
                                            <select
                                                value={String(currentPageSetup.fitWidthPages)}
                                                onChange={e =>
                                                    applyPrintPageSetupPatch({
                                                        printScale: 'auto',
                                                        fitWidthPages: e.target.value === 'auto' ? 'auto' : parseInt(e.target.value, 10)
                                                    })
                                                }
                                                className="font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
                                            >
                                                <option value="auto">Auto</option>
                                                <option value="1">1 Hal</option>
                                                <option value="2">2 Hal</option>
                                                <option value="3">3 Hal</option>
                                                <option value="4">4 Hal</option>
                                            </select>
                                            <span className="text-slate-300">×</span>
                                            <span className="text-slate-500 font-semibold">T:</span>
                                            <select
                                                value={String(currentPageSetup.fitHeightPages)}
                                                onChange={e =>
                                                    applyPrintPageSetupPatch({
                                                        printScale: 'auto',
                                                        fitHeightPages: e.target.value === 'auto' ? 'auto' : parseInt(e.target.value, 10)
                                                    })
                                                }
                                                className="font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
                                            >
                                                <option value="auto">Auto (Oper)</option>
                                                <option value="1">1 Hal</option>
                                                <option value="2">2 Hal</option>
                                                <option value="3">3 Hal</option>
                                                <option value="4">4 Hal</option>
                                                <option value="5">5 Hal</option>
                                            </select>
                                        </div>
                                    ) : (
                                        <select
                                            value={String(typeof currentPageSetup.printScale === 'number' ? currentPageSetup.printScale : 100)}
                                            onChange={e =>
                                                applyPrintPageSetupPatch({
                                                    printScale: parseInt(e.target.value, 10) || 100,
                                                    fitWidthPages: 'auto',
                                                    fitHeightPages: 'auto'
                                                })
                                            }
                                            className="h-[32px] px-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none cursor-pointer shrink-0 tabular-nums"
                                        >
                                            <option value="100">100%</option>
                                            <option value="95">95%</option>
                                            <option value="90">90%</option>
                                            <option value="85">85%</option>
                                            <option value="80">80%</option>
                                            <option value="75">75%</option>
                                        </select>
                                    )}

                                    <select
                                        value={rankingDisplayLimit}
                                        onChange={e => setRankingDisplayLimit(e.target.value as RankingDisplayLimit)}
                                        className="h-[32px] px-2 bg-amber-50 border border-amber-200 rounded-xl text-xs font-bold text-amber-900 focus:outline-none cursor-pointer shrink-0"
                                        title="Batasi tampilan peringkat pada cetak rapor massal"
                                    >
                                        <option value="all">Rank: Semua</option>
                                        <option value="3">Rank: Top 3</option>
                                        <option value="5">Rank: Top 5</option>
                                        <option value="10">Rank: Top 10</option>
                                        <option value="none">Rank: Off</option>
                                    </select>

                                    <button
                                        type="button"
                                        onClick={() => applyPrintPageSetupPatch({ paperSize: currentPageSetup.paperSize === 'A4' ? 'F4' : 'A4' })}
                                        className="h-[32px] px-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all shrink-0 shadow-2xs whitespace-nowrap"
                                        title="Ganti ukuran kertas (A4 / F4)"
                                    >
                                        Format: {currentPageSetup.paperSize}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => applyPrintPageSetupPatch({ orientation: currentPageSetup.orientation === 'portrait' ? 'landscape' : 'portrait' })}
                                        className="h-[32px] px-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all shrink-0 shadow-2xs whitespace-nowrap"
                                        title="Ganti orientasi kertas (Portrait / Landscape)"
                                    >
                                        {currentPageSetup.orientation === 'landscape' ? 'Landscape' : 'Portrait'}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setShowKop(prev => !prev)}
                                        className={`h-[32px] px-2.5 rounded-xl text-xs font-bold border transition-all shrink-0 shadow-2xs flex items-center gap-1 whitespace-nowrap ${
                                            showKop ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                                        }`}
                                    >
                                        <i className={`bi ${showKop ? 'bi-check-circle-fill text-emerald-600' : 'bi-circle'}`}></i>
                                        <span>{showKop ? 'Kop Aktif' : 'Tanpa Kop'}</span>
                                    </button>
                                </div>

                                {/* Start Batch Print Action Button */}
                                <div className="w-full sm:w-auto shrink-0">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            printToPdfNative(
                                                'batch-print-container',
                                                `Rapor_Massal_${filterTahun.replace('/', '-')}_${filterSemester}`,
                                                {
                                                    paperSize: currentPageSetup.paperSize,
                                                    orientation: currentPageSetup.orientation
                                                }
                                            )
                                        }
                                        className="w-full sm:w-auto h-[36px] bg-teal-600 hover:bg-teal-700 text-white px-4 py-1.5 rounded-xl text-xs font-black shadow-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 shrink-0 whitespace-nowrap"
                                    >
                                        <i className="bi bi-printer-fill"></i>
                                        <span>Mulai Cetak Semua ({batchData.length})</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Modal Body: Continuous Batch Render */}
                        <div className="flex-grow overflow-auto bg-slate-200/90 p-4 sm:p-8 flex justify-center">
                            <div id="batch-print-container" className="space-y-8 print:block print:space-y-0">
                                {batchData.map((item, idx) => {
                                    const isLastDoc = idx === batchData.length - 1;
                                    return (
                                        <div
                                            key={item.santri.id}
                                            className={`rapor-batch-item print:block ${!selectedTemplate && !isLastDoc ? 'page-break-after' : ''}`}
                                            style={!selectedTemplate && !isLastDoc ? { pageBreakAfter: 'always', breakAfter: 'page' } : undefined}
                                        >
                                            {selectedTemplate ? (
                                                <DynamicRaporPreview
                                                    template={selectedTemplate}
                                                    targetSheetId={selectedPrintSheetId}
                                                    santri={item.santri}
                                                    record={item.record}
                                                    settings={settings}
                                                    digitalAssets={digitalAssets}
                                                    tanggalRapor={tanggalRapor}
                                                    tempatRapor={tempatRapor}
                                                    formatTanggalRapor={formatTanggalRapor}
                                                    manualHijriRapor={manualHijriRapor}
                                                    tahunAjaran={filterTahun}
                                                    semester={filterSemester}
                                                    calculation={item.calculation}
                                                    cohortRecords={item.cohortRecords}
                                                    paperSize={currentPageSetup.paperSize}
                                                    orientation={hasManualOrientationOverride ? currentPageSetup.orientation : undefined}
                                                    showKop={showKop}
                                                    marginMode={currentPageSetup.marginMode}
                                                    fitToPage={currentPageSetup.fitToPage}
                                                    fitWidthPages={currentPageSetup.fitWidthPages}
                                                    fitHeightPages={currentPageSetup.fitHeightPages}
                                                    repeatHeaderRows={currentPageSetup.repeatHeaderRows}
                                                    printScale={currentPageSetup.printScale}
                                                    showJudul={effectiveShowJudul}
                                                    showBiodataHeader={effectiveShowBiodata}
                                                    isLastDocument={isLastDoc}
                                                />
                                            ) : (
                                                <div
                                                    className="bg-white shadow-lg p-8 printable-content-wrapper"
                                                    style={{ width: currentPageSetup.paperSize === 'F4' ? '21.5cm' : '21cm', minHeight: currentPageSetup.paperSize === 'F4' ? '33cm' : '29.7cm', padding: currentPageSetup.marginMode === 'narrow' ? '1.2cm' : currentPageSetup.marginMode === 'none' ? '0.4cm' : '2cm' }}
                                                >
                                                    <RaporLengkapTemplate
                                                        santri={item.santri}
                                                        settings={settings}
                                                        options={{
                                                            tahunAjaran: filterTahun,
                                                            semester: filterSemester,
                                                            tanggalRapor,
                                                            tempatRapor,
                                                            formatMode: formatTanggalRapor,
                                                            manualHijri: manualHijriRapor,
                                                            showKop,
                                                            paperSize: currentPageSetup.paperSize
                                                        }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Mobile Filter Drawer */}
            <MobileFilterDrawer
                isOpen={isFilterDrawerOpen}
                onClose={() => setIsFilterDrawerOpen(false)}
                title="Filter Cetak Rapor"
            >
                <div className="space-y-5">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 tracking-wider pl-1">Tahun Ajaran</label>
                            <select
                                value={filterTahun}
                                onChange={e => setFilterTahun(e.target.value)}
                                className="w-full border border-slate-200 rounded-xl p-2.5 text-sm font-bold bg-white"
                            >
                                {(availableYears.length > 0 ? availableYears : [defaultAcademicYear]).map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        </div>
                        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 tracking-wider pl-1">Semester</label>
                            <select
                                value={filterSemester}
                                onChange={e => setFilterSemester(e.target.value as any)}
                                className="w-full border border-slate-200 rounded-xl p-2.5 text-sm font-bold bg-white"
                            >
                                <option value="Ganjil">Ganjil</option>
                                <option value="Genap">Genap</option>
                            </select>
                        </div>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-wider pl-1">Jenjang</label>
                            <select
                                value={filterJenjang}
                                onChange={e => { setFilterJenjang(e.target.value); setPrintRombel(''); }}
                                className="w-full border border-slate-200 rounded-xl p-2.5 text-sm font-bold bg-white"
                            >
                                <option value="">Semua Jenjang</option>
                                {settings.jenjang.map(j => <option key={j.id} value={j.id}>{j.nama}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-wider pl-1">Rombel</label>
                            <select
                                value={printRombel}
                                onChange={e => setPrintRombel(e.target.value)}
                                className="w-full border border-teal-200 rounded-xl p-2.5 text-sm font-bold bg-teal-50/40"
                            >
                                <option value="">Semua Rombel</option>
                                {availableRombels.map(r => <option key={r.id} value={r.id}>{r.nama}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-wider pl-1">Template</label>
                            <select
                                value={selectedTemplateId}
                                onChange={e => setSelectedTemplateId(e.target.value)}
                                className="w-full border border-amber-200 rounded-xl p-2.5 text-sm font-bold bg-amber-50/40"
                            >
                                <option value="">Standar K13 (Mapel)</option>
                                {filteredTemplates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        </div>
                        {templateSheets.length > 1 && (
                            <div>
                                <label className="block text-[10px] font-black text-indigo-500 uppercase mb-1 tracking-wider pl-1">Lembar / Format</label>
                                <select
                                    value={selectedPrintSheetId}
                                    onChange={e => setSelectedPrintSheetId(e.target.value)}
                                    className="w-full border border-indigo-200 rounded-xl p-2.5 text-sm font-bold bg-indigo-50/40 text-indigo-900"
                                >
                                    <option value="all">Semua Lembar ({templateSheets.length})</option>
                                    {templateSheets.map((sh, idx) => (
                                        <option key={sh.id} value={sh.id}>Lembar {idx + 1}: {sh.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        {selectedTemplate && (
                            <button
                                type="button"
                                onClick={() => {
                                    setIsFilterDrawerOpen(false);
                                    setIsTitleModalOpen(true);
                                }}
                                className="w-full mt-2.5 py-2 px-3 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-2xs"
                            >
                                <i className="bi bi-pencil-square text-amber-700"></i>
                                <span>Atur Judul Rapor Resmi (1-3 Baris)</span>
                            </button>
                        )}
                    </div>

                    <div className="bg-teal-50/50 p-4 rounded-2xl border border-teal-100 space-y-3">
                        <h4 className="text-xs font-black text-teal-800 uppercase tracking-wider flex items-center gap-2">
                            <i className="bi bi-calendar-check"></i> Titimangsa Rapor
                        </h4>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tempat / Kota</label>
                            <input
                                type="text"
                                value={tempatRapor}
                                onChange={e => setTempatRapor(e.target.value)}
                                placeholder="Contoh: Banyumas"
                                className="w-full border border-slate-200 rounded-xl p-2.5 text-sm font-semibold bg-white"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tanggal Rapor</label>
                            <input
                                type="date"
                                value={tanggalRapor}
                                onChange={e => setTanggalRapor(e.target.value)}
                                className="w-full border border-slate-200 rounded-xl p-2.5 text-sm font-semibold bg-white"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Format Kalender Default</label>
                            <select
                                value={formatTanggalRapor}
                                onChange={e => setFormatTanggalRapor(e.target.value as DateFormatMode)}
                                className="w-full border border-slate-200 rounded-xl p-2.5 text-sm font-bold bg-white"
                            >
                                <option value="masehi">Masehi</option>
                                <option value="hijriah_masehi">Hijriah &amp; Masehi (Gabungan)</option>
                                <option value="hijriah">Hijriah Saja</option>
                            </select>
                        </div>
                        {formatTanggalRapor !== 'masehi' && (
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tanggal Hijriah Manual (Opsional)</label>
                                <input
                                    type="text"
                                    value={manualHijriRapor}
                                    onChange={e => setManualHijriRapor(e.target.value)}
                                    placeholder={`Otomatis: ${autoHijriHint}`}
                                    className="w-full border border-amber-200 rounded-xl p-2.5 text-sm font-semibold bg-white"
                                />
                            </div>
                        )}
                        <div className="text-[11px] text-slate-600">
                            Hasil: <span className="font-semibold text-slate-800">{liveTitimangsaPreview}</span>
                        </div>
                        <button
                            onClick={handleSaveUniversalDate}
                            disabled={isSavingUniversalDate}
                            className="w-full bg-teal-600 text-white p-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2"
                        >
                            <i className="bi bi-floppy"></i> Simpan Sebagai Default Universal
                        </button>
                    </div>
                </div>
            </MobileFilterDrawer>

            {/* Modal Atur Judul Rapor 1-3 Baris */}
            <RaporTitleEditModal
                isOpen={isTitleModalOpen}
                onClose={() => setIsTitleModalOpen(false)}
                template={selectedTemplate}
                settings={settings}
                selectedSheetId={selectedPrintSheetId}
                onSave={handleSaveRaporTitle}
                showToast={showToast}
            />

            {/* Modal Distribusi Rapor WhatsApp */}
            {isWhatsAppModalOpen && whatsAppTargetSantri && (
                <RaporWhatsAppModal
                    isOpen={isWhatsAppModalOpen}
                    onClose={() => {
                        setIsWhatsAppModalOpen(false);
                        setWhatsAppTargetSantri(null);
                    }}
                    santri={whatsAppTargetSantri}
                    record={periodRecordsMap.get(whatsAppTargetSantri.id) || null}
                    calculation={(() => {
                        const row = studentLegerMap.get(whatsAppTargetSantri.id);
                        return row ? {
                            totalNilai: row.totalNilai,
                            rataRata: row.rataRata,
                            ranking: getEffectiveRanking(row.ranking, rankingDisplayLimit),
                            totalSantri: baseSantriList.filter(s => s.rombelId === whatsAppTargetSantri?.rombelId).length || 1,
                            predikat: row.predikat.predikat
                        } : undefined;
                    })()}
                    settings={settings}
                    tahunAjaran={filterTahun}
                    semester={filterSemester}
                    onCopySuccess={() => showToast('Ringkasan rapor santri berhasil disalin!', 'success')}
                />
            )}
        </div>
    );
};
