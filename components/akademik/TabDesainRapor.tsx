import React, { useState, useEffect, useMemo, useRef, useLayoutEffect } from 'react';
import { useAppContext } from '../../AppContext';
import { useSantriContext } from '../../contexts/SantriContext';
import { RaporTemplate, RaporSheet, GridCell, RaporColumnType, RaporInputMode, DigitalAsset, PageFitCount, RaporCustomSignatory } from '../../types';
import { loadXLSX } from '../../utils/lazyClientLibs';
import { printToPdfNative } from '../../utils/pdfGenerator';
import { PrintHeader } from '../common/PrintHeader';
import {
    RAPOR_CREDIT_FOOTER_TEXT,
    normalizeRaporPageSetup,
    buildPageSetupStateFromPreset,
    formatPageSetupBadgeLabel,
    getRaporPaperMetrics,
    getEffectivePopulatedColCount,
    computePaginatedRaporLayout,
    getRenderableRowCellsForPage,
    resolveExactColPixelWidths,
    computeRaporFooterTypography,
    PaginatedRaporPage,
    PaginatedSliceCell,
    RaporPageScalePreset,
    RaporPageSetupInput
} from '../../utils/raporPageLayout';
import {
    DYNAMIC_TAG_CATEGORIES,
    isMediaTag,
    isTtdMediaCellValue,
    resolveCellMediaVisual,
    resolveRaporText,
    RaporResolveContext,
    resolveWaliKelasTeacher,
    resolveMudirMarhalahTeacher,
    resolveMudirAamInfo,
    resolveMuhaffizhTeacher,
    resolveCustomSignatoryInfo,
    formatTeacherNip
} from '../../utils/raporPlaceholderResolver';
import { RaporSignatureStampMedia } from '../common/RaporSignatureStampMedia';
import { RaporCustomSignatoryConfigurator } from './RaporCustomSignatoryConfigurator';
import { findStrictTeacherTtdAsset, findJenjangStempelAsset, reconcileDigitalAssetsWithSettings } from '../../utils/digitalAssetUtils';
import {
    RAPOR_FORMULA_SUGGESTIONS,
    applyCellTextTransform,
    formatCellNumericDisplay,
    isFormulaReadyForCellPick,
    autoCloseFormulaParens,
    extractFormulaReferencedCoords,
    normalizeSubjectKeyForAvg,
    canonicalizeMapelLookupKey,
    computeDefaultKkmForPool,
    findMapelInMasterPool,
    inspectSheetRowKkm,
    shiftFormulaReferences,
    cycleFormulaReferenceLockAtCaret,
    computeSeriesStringAtOffset,
    computeAutoFillNextInputKey,
    AutoFillMode,
    AutoFillDirection
} from '../../utils/raporFormulaUtils';
import { resolveAcademicYearLabels } from '../../utils/academicYear';
import {
    parseLocalDateSafe,
    resolveTempatRapor,
    formatTanggalDokumen,
    formatDate,
    getHijriDate,
    ensureHijriSuffix
} from '../../utils/formatters';
import { computeClassAveragesFromRecords, classifyRaporInputField } from '../../services/raporCalculationService';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { RaporExcelPasteModal } from './modals/RaporExcelPasteModal';
import { RaporKurikulumGeneratorModal } from './modals/RaporKurikulumGeneratorModal';
import { parseExcelClipboard, overlayPastedTableOntoGrid } from './utils/excelPasteParser';

interface AutocompleteOption {
    id: string;
    label: string;
    insertText: string;
    subtitle: string;
    badge: string;
    badgeClass: string;
}

interface DesignPreviewSheetCardProps {
    sh: RaporSheet;
    sIdx: number;
    sheetsCount: number;
    isLastSheet: boolean;
    activeTemplate: RaporTemplate;
    settings: any;
    digitalAssets: DigitalAsset[];
    resolveContext: RaporResolveContext;
    renderPreviewCell: (cell: GridCell) => { content: React.ReactNode; isMedia: boolean };
    showKop: boolean;
    santriObj: any;
}

const DesignPreviewSheetCard: React.FC<DesignPreviewSheetCardProps> = ({
    sh,
    sIdx,
    sheetsCount,
    isLastSheet,
    activeTemplate,
    settings,
    resolveContext,
    renderPreviewCell,
    showKop,
    santriObj
}) => {
    const measureContainerRef = useRef<HTMLDivElement>(null);
    const measureHeaderRef = useRef<HTMLDivElement>(null);
    const [measuredMetrics, setMeasuredMetrics] = useState<{
        headerHeight: number;
        rowHeights: number[];
    } | null>(null);

    const colCount = sh.colCount || sh.cells?.[0]?.length || 0;
    const colWidths = useMemo(() => {
        const widths: number[] = [];
        for (let c = 0; c < colCount; c++) {
            let colW = 100;
            let found = false;
            if (sh.cells) {
                for (let r = 0; r < sh.cells.length; r++) {
                    const cell = sh.cells[r]?.[c];
                    if (cell && !cell.hidden && (!cell.colSpan || cell.colSpan === 1)) {
                        if (typeof cell.width === 'number' && cell.width > 0) {
                            colW = cell.width;
                            found = true;
                            break;
                        }
                    }
                }
                if (!found) {
                    for (let r = 0; r < sh.cells.length; r++) {
                        const cell = sh.cells[r]?.[c];
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
    }, [sh.cells, colCount]);

    const configuredRowHeights = useMemo(() => {
        if (!sh.cells) return [];
        return sh.cells.map(row => {
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
    }, [sh.cells]);

    const pageSetup = useMemo(
        () =>
            normalizeRaporPageSetup({
                paperSize: sh.paperSize || activeTemplate.paperSize,
                orientation: sh.orientation || activeTemplate.orientation,
                marginMode: sh.marginMode || activeTemplate.marginMode,
                fitToPage: sh.fitToPage ?? activeTemplate.fitToPage,
                fitWidthPages: sh.fitWidthPages ?? activeTemplate.fitWidthPages,
                fitHeightPages: sh.fitHeightPages ?? activeTemplate.fitHeightPages,
                printScale: sh.printScale ?? activeTemplate.printScale,
                repeatHeaderRows: sh.repeatHeaderRows ?? activeTemplate.repeatHeaderRows
            }),
        [sh, activeTemplate]
    );

    const paperMetrics = useMemo(
        () => getRaporPaperMetrics(pageSetup.paperSize, pageSetup.orientation, pageSetup.marginMode),
        [pageSetup.paperSize, pageSetup.orientation, pageSetup.marginMode]
    );

    const effectiveColCount = useMemo(
        () => Math.max(1, getEffectivePopulatedColCount(sh.cells || [], Math.max(1, colCount))),
        [sh.cells, colCount]
    );
    const activeColWidths = useMemo(
        () => colWidths.slice(0, effectiveColCount),
        [colWidths, effectiveColCount]
    );
    const totalColWidth = activeColWidths.reduce((a, b) => a + b, 0) || paperMetrics.availableW;
    const measureWidth = pageSetup.fitWidthPages === 1
        ? Math.max(paperMetrics.availableW, totalColWidth)
        : totalColWidth;

    const shouldShowBiodataHeader = sh.showBiodataHeader !== undefined
        ? sh.showBiodataHeader
        : Boolean(activeTemplate.showBiodataHeader);

    const hasTitleInGrid = useMemo(() => {
        if (!sh.cells || sh.cells.length === 0) return false;
        return sh.cells.slice(0, 3).some(row =>
            row.some(cell => {
                if (!cell || !cell.value) return false;
                const up = cell.value.toUpperCase();
                return up.includes('RAPOR') || up.includes('LAPORAN HASIL') || up.includes('CAPAIAN KOMPETENSI') || up.includes('HASIL EVALUASI');
            })
        );
    }, [sh.cells]);

    const shouldShowDocTitle = sh.showJudul !== undefined
        ? sh.showJudul
        : (activeTemplate.showJudul !== undefined ? activeTemplate.showJudul : !hasTitleInGrid);

    const rawDocTitle = sh.customTitle !== undefined
        ? sh.customTitle
        : (activeTemplate.customTitle !== undefined ? activeTemplate.customTitle : (shouldShowDocTitle ? sh.name : ''));

    const resolvedDocTitle = useMemo(
        () => (rawDocTitle ? resolveRaporText(rawDocTitle, resolveContext) : undefined),
        [rawDocTitle, resolveContext]
    );

    const renderDocumentHeader = () => {
        const hasStandaloneTitle = !showKop && (Boolean(sh.customTitle) || sh.showJudul === true);
        if (!showKop && !hasStandaloneTitle && !shouldShowBiodataHeader) return null;
        return (
            <div>
                {showKop && (
                    <PrintHeader
                        settings={settings}
                        title={shouldShowDocTitle ? resolvedDocTitle : undefined}
                    />
                )}
                {hasStandaloneTitle && (
                    <div className="text-center mb-4 space-y-0.5">
                        {(sh.customTitle || sh.name).split('\n').map((line, lIdx) => (
                            <div
                                key={lIdx}
                                className={`${lIdx === 0 ? 'font-black text-sm text-slate-900 tracking-wide uppercase' : 'font-semibold text-xs text-slate-700'}`}
                            >
                                {resolveRaporText(line, resolveContext)}
                            </div>
                        ))}
                    </div>
                )}
                {shouldShowBiodataHeader && santriObj && (
                    <div className="mb-3">
                        <table className="w-full text-sm font-medium mb-3">
                            <tbody>
                                <tr>
                                    <td className="w-24 font-bold">Nama</td>
                                    <td>: {santriObj.namaLengkap}</td>
                                    <td className="w-24 text-right font-bold">NIS</td>
                                    <td className="w-32 text-right">: {santriObj.nis}</td>
                                </tr>
                                <tr>
                                    <td className="w-24 font-bold">Rombel</td>
                                    <td>: {settings.rombel?.find((r: any) => r.id === santriObj.rombelId)?.nama || '-'}</td>
                                    <td className="w-24 text-right font-bold">{sheetsCount > 1 ? 'Format / Lembar' : 'Peringkat'}</td>
                                    <td className="w-32 text-right font-semibold">
                                        {sheetsCount > 1
                                            ? `: ${sh.name}`
                                            : `: ${resolveContext.calculation?.ranking ? `${resolveContext.calculation.ranking} / ${resolveContext.calculation.totalSantri || '-'}` : '-'}`}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        );
    };

    useLayoutEffect(() => {
        const measure = () => {
            const container = measureContainerRef.current;
            if (!container) return;

            // Normalize against any ancestor CSS transform (e.g. previewModalZoom scale) so measurements stay 100% unscaled
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
            const nextRowHeights: number[] = (sh.cells || []).map((_, rIdx) => configuredRowHeights[rIdx] ?? 30);
            trNodes.forEach((tr) => {
                const idx = Number(tr.getAttribute('data-measure-row'));
                if (!Number.isNaN(idx)) {
                    const rectH = tr.getBoundingClientRect().height;
                    const unscaledH = zoomFactor > 0 && rectH > 0 ? rectH / zoomFactor : tr.offsetHeight;
                    if (unscaledH > 0) {
                        nextRowHeights[idx] = Math.max(configuredRowHeights[idx] ?? 0, Math.ceil(unscaledH));
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

        measure();
        let ro: ResizeObserver | null = null;
        const container = measureContainerRef.current;
        if (typeof ResizeObserver !== 'undefined' && container) {
            ro = new ResizeObserver(() => measure());
            ro.observe(container);
        }
        const imgNodes = container ? Array.from(container.querySelectorAll('img')) : [];
        const onImgLoad = () => measure();
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
    }, [sh, measureWidth, showKop, shouldShowBiodataHeader, shouldShowDocTitle, resolvedDocTitle, configuredRowHeights]);

    const fallbackHeaderH =
        (showKop ? 145 : (sh.customTitle || sh.showJudul ? 52 : 0)) +
        (shouldShowBiodataHeader ? 62 : 0);
    const effectiveHeaderH = measuredMetrics ? measuredMetrics.headerHeight : fallbackHeaderH;
    const effectiveRowHeights = useMemo(
        () =>
            measuredMetrics?.rowHeights && measuredMetrics.rowHeights.length === (sh.cells?.length || 0)
                ? measuredMetrics.rowHeights
                : configuredRowHeights.map(h => h ?? 30),
        [measuredMetrics, configuredRowHeights, sh.cells]
    );

    const paginatedLayout = useMemo(
        () =>
            computePaginatedRaporLayout({
                cells: sh.cells || [],
                colWidths,
                rowHeights: effectiveRowHeights,
                headerHeight: effectiveHeaderH,
                paperMetrics,
                pageSetup
            }),
        [sh.cells, colWidths, effectiveRowHeights, effectiveHeaderH, paperMetrics, pageSetup]
    );

    const badgeText = formatPageSetupBadgeLabel(pageSetup, paginatedLayout.scale);
    const footerTypo = useMemo(
        () => computeRaporFooterTypography(sh.cells, paginatedLayout.scale),
        [sh.cells, paginatedLayout.scale]
    );

    const renderSliceCellTd = (sliceItem: PaginatedSliceCell, rowIdx: number, keyPrefix: string) => {
        const { cell, masterC, colSpan, rowSpan, borders } = sliceItem;
        const rH = configuredRowHeights[rowIdx];
        const upperValForMedia = typeof cell.value === 'string' ? cell.value.toUpperCase() : '';
        const isLogo = upperValForMedia.includes('LOGO');
        const isKop = upperValForMedia.includes('KOP');
        const hasCustomBg = Boolean(cell.backgroundColor && cell.backgroundColor !== 'transparent' && cell.backgroundColor !== '#ffffff');
        const { content: rawContent, isMedia } = renderPreviewCell(cell);
        let content: React.ReactNode = rawContent;
        if (!isMedia && (typeof rawContent === 'string' || typeof rawContent === 'number')) {
            let formattedStr = formatCellNumericDisplay(String(rawContent), cell.decimalPlaces);
            if (cell.textTransform && cell.textTransform !== 'none') {
                formattedStr = applyCellTextTransform(formattedStr, cell.textTransform);
            }
            content = formattedStr;
        }

        const effectiveFontSize = cell.fontSize || 11;
        const hAlign = cell.align || 'center';
        const vAlign = cell.verticalAlign || 'middle';
        const textWrap = cell.textWrap || 'wrap';
        const isFloat = textWrap === 'float' && !isMedia;
        const isClip = textWrap === 'clip';

        let cellWidthPx = 0;
        for (let i = 0; i < colSpan; i++) {
            cellWidthPx += colWidths[masterC + i] || 100;
        }

        let cellHeightPx: number | undefined = undefined;
        if (rH !== undefined || cell.height !== undefined) {
            let sumH = 0;
            for (let i = 0; i < rowSpan; i++) {
                sumH += configuredRowHeights[rowIdx + i] ?? cell.height ?? 30;
            }
            cellHeightPx = sumH;
        }

        const upperToken = `${cell.value || ''} ${cell.key || ''}`.toUpperCase();
        const isExpandableDynamic = (upperToken.includes('DESKRIPSI') || upperToken.includes('CATATAN')) && !isClip && !isFloat && (cellHeightPx === undefined || cellHeightPx >= 28);
        const cellPadding = cellWidthPx < 22 ? '1px' : '2px 4px';

        const isSigOrStampMedia = isMedia && !isLogo && !isKop;
        const allowMediaOverflow = isSigOrStampMedia || (isMedia && !isLogo && !borders.top && !borders.left && !borders.right);

        return (
            <td
                key={`${keyPrefix}-${rowIdx}-${sliceItem.renderCol}`}
                colSpan={colSpan > 1 ? colSpan : undefined}
                rowSpan={rowSpan > 1 ? rowSpan : undefined}
                style={{
                    borderTop: (!isLogo && borders.top) ? '1px solid black' : 'none',
                    borderRight: (!isLogo && borders.right) ? '1px solid black' : 'none',
                    borderBottom: (!isLogo && borders.bottom) ? '1px solid black' : 'none',
                    borderLeft: (!isLogo && borders.left) ? '1px solid black' : 'none',
                    textAlign: hAlign,
                    verticalAlign: vAlign,
                    height: cellHeightPx ? `${cellHeightPx}px` : undefined,
                    backgroundColor: hasCustomBg ? cell.backgroundColor : 'transparent',
                    fontWeight: cell.bold ? 'bold' : 'normal',
                    fontStyle: cell.italic ? 'italic' : undefined,
                    color: cell.color || undefined,
                    fontSize: `${effectiveFontSize}px`,
                    padding: 0,
                    boxSizing: 'border-box',
                    overflow: (isFloat || allowMediaOverflow) ? 'visible' : 'hidden',
                    position: (isFloat || allowMediaOverflow) ? 'relative' : undefined,
                    zIndex: isSigOrStampMedia ? 12 : undefined
                }}
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
                            {content}
                        </div>
                    </div>
                ) : (
                    <div
                        style={{
                            width: '100%',
                            height: (!isExpandableDynamic && cellHeightPx) ? `${cellHeightPx}px` : '100%',
                            minHeight: (isExpandableDynamic && cellHeightPx) ? `${cellHeightPx}px` : undefined,
                            maxHeight: (!isExpandableDynamic && cellHeightPx) ? `${cellHeightPx}px` : undefined,
                            padding: isMedia ? '1px' : cellPadding,
                            boxSizing: 'border-box',
                            overflow: allowMediaOverflow ? 'visible' : 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: vAlign === 'top' ? 'flex-start' : vAlign === 'bottom' ? 'flex-end' : 'center',
                            alignItems: hAlign === 'left' ? 'flex-start' : hAlign === 'right' ? 'flex-end' : 'center',
                            textAlign: hAlign,
                            lineHeight: 1.25
                        }}
                    >
                        <div
                            style={
                                isMedia
                                    ? {
                                          width: '100%',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: hAlign === 'left' ? 'flex-start' : hAlign === 'right' ? 'flex-end' : 'center',
                                          overflow: allowMediaOverflow ? 'visible' : 'hidden',
                                      }
                                    : {
                                          width: '100%',
                                          marginTop: vAlign === 'top' ? 0 : 'auto',
                                          marginBottom: vAlign === 'bottom' ? 0 : 'auto',
                                          whiteSpace: isClip ? 'pre' : 'pre-wrap',
                                          wordBreak: isClip ? 'normal' : 'break-word',
                                          overflowWrap: isClip ? 'normal' : 'anywhere',
                                          overflow: isClip ? 'hidden' : undefined,
                                          textAlign: hAlign
                                      }
                            }
                        >
                            {content}
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
        endRow: Math.max(0, (sh.cells?.length || 1) - 1),
        startCol: 0,
        endCol: Math.max(0, effectiveColCount - 1),
        sliceColWidths: activeColWidths,
        sliceNaturalWidth: measureWidth,
        sliceNaturalHeight: 0,
        stretchColsToFillWidth: totalColWidth <= paperMetrics.availableW
    };

    return (
        <div className="rapor-sheet-group w-full flex flex-col items-center gap-6 print:block print:gap-0">
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
                <table className="border-collapse table-fixed" style={{ width: `${measureWidth}px` }}>
                    <colgroup>
                        {resolveExactColPixelWidths(
                            activeColWidths,
                            measureWidth,
                            totalColWidth <= paperMetrics.availableW
                        ).map((pxW, cIdx) => (
                            <col key={cIdx} style={{ width: `${pxW}px` }} />
                        ))}
                    </colgroup>
                    <tbody>
                        {(sh.cells || []).map((_, rIdx) => {
                            const rH = configuredRowHeights[rIdx];
                            const rowSliceCells = getRenderableRowCellsForPage(sh.cells, rIdx, fullMeasurePage, false);
                            return (
                                <tr key={rIdx} data-measure-row={rIdx} style={{ height: rH ? `${rH}px` : undefined }}>
                                    {rowSliceCells.map(sc => renderSliceCellTd(sc, rIdx, 'measure'))}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Discrete Paginated Paper Sheets */}
            {paginatedLayout.pages.map((page, pIdx) => {
                const isVeryLastPage = isLastSheet && pIdx === paginatedLayout.pages.length - 1;
                const scaledSliceW = Math.ceil(page.sliceNaturalWidth * paginatedLayout.scale);
                const viewportMaxH = paperMetrics.availableH;
                const footerBottomPx = Math.max(4, Math.min(10, Math.floor(paperMetrics.padPx * 0.35)));
                const isScaled = paginatedLayout.scale !== 1;
                const exactSliceColPx = resolveExactColPixelWidths(
                    page.sliceColWidths,
                    page.sliceNaturalWidth,
                    page.stretchColsToFillWidth
                );
                const rowIndices: number[] = [];
                if (page.endRow >= page.startRow) {
                    for (let r = page.startRow; r <= page.endRow; r++) {
                        rowIndices.push(r);
                    }
                }

                return (
                    <div key={`${sh.id}-p-${page.pageIndex}`} className="rapor-page-slot w-full overflow-x-auto p-1 print:block print:overflow-visible print:p-0 flex justify-start sm:justify-center">
                        <div
                            data-print-orientation={paperMetrics.orientation}
                            className={`bg-white text-black font-sans text-sm printable-content-wrapper rapor-exact-page ${paginatedLayout.isSinglePageFit ? 'rapor-fit-1-page' : ''} ${paperMetrics.orientation === 'landscape' ? 'print-landscape' : ''} shadow-2xl ${paperMetrics.paddingClass} relative shrink-0 rounded-xs border border-slate-300 print:border-none ${!isVeryLastPage ? 'page-break-after' : ''}`}
                            style={{
                                width: paperMetrics.widthCss,
                                height: paperMetrics.heightCss,
                                minHeight: paperMetrics.heightCss,
                                maxHeight: paperMetrics.heightCss,
                                padding: `${paperMetrics.padPx}px`,
                                overflow: 'hidden',
                                pageBreakAfter: isVeryLastPage ? 'auto' : 'always',
                                breakAfter: isVeryLastPage ? 'auto' : 'page',
                                pageBreakInside: 'avoid',
                                breakInside: 'avoid',
                                boxSizing: 'border-box'
                            }}
                        >
                            {/* Screen-Only Metadata Line */}
                            <div className="no-print absolute top-2 right-4 text-[10px] text-slate-500 font-mono tabular-nums select-none flex items-center gap-1.5 z-30">
                                <span>{sh.name} (Lembar {sIdx + 1})</span>
                                <span aria-hidden="true">·</span>
                                <span>{paperMetrics.paperSize}{paperMetrics.orientation === 'landscape' ? ' Landscape' : ''}</span>
                                <span aria-hidden="true">·</span>
                                <span className="font-semibold text-slate-700">
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
                                    overflow: 'visible',
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

                                    <table
                                        className="border-collapse table-fixed"
                                        style={{ width: `${page.sliceNaturalWidth}px` }}
                                    >
                                        <colgroup>
                                            {exactSliceColPx.map((pxW, cIdx) => (
                                                <col key={cIdx} style={{ width: `${pxW}px` }} />
                                            ))}
                                        </colgroup>
                                        <tbody>
                                            {page.headerGroupRows.map((hrIdx) => {
                                                const rH = configuredRowHeights[hrIdx];
                                                const rowCells = getRenderableRowCellsForPage(sh.cells, hrIdx, page, true);
                                                return (
                                                    <tr key={`hdr-${hrIdx}`} style={{ height: rH ? `${rH}px` : undefined }}>
                                                        {rowCells.map(sc => renderSliceCellTd(sc, hrIdx, `hdr-${page.pageIndex}`))}
                                                    </tr>
                                                );
                                            })}
                                            {rowIndices.map((rIdx) => {
                                                const rH = configuredRowHeights[rIdx];
                                                const rowCells = getRenderableRowCellsForPage(sh.cells, rIdx, page, false);
                                                return (
                                                    <tr key={rIdx} style={{ height: rH ? `${rH}px` : undefined }}>
                                                        {rowCells.map(sc => renderSliceCellTd(sc, rIdx, `pg-${page.pageIndex}`))}
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div
                                className={`rapor-credit-footer italic select-none flex items-center ${
                                    page.totalPages > 1 ? 'justify-between gap-2' : 'justify-center text-center'
                                }`}
                                style={{
                                    position: 'absolute',
                                    bottom: `${footerBottomPx}px`,
                                    left: `${paperMetrics.padPx}px`,
                                    right: `${paperMetrics.padPx}px`,
                                    borderTop: `${footerTypo.borderTopWidthPx}px solid #bfbfbf`,
                                    paddingTop: `${footerTypo.paddingTopPx}px`,
                                    fontSize: `${footerTypo.footerFontPx}px`,
                                    lineHeight: 1.2,
                                    color: '#666666'
                                }}
                            >
                                <span style={{ color: '#666666' }}>{RAPOR_CREDIT_FOOTER_TEXT}</span>
                                {page.totalPages > 1 && (
                                    <span
                                        className="not-italic tabular-nums shrink-0"
                                        style={{ color: '#666666', fontSize: `${footerTypo.footerFontPx}px` }}
                                    >
                                        Halaman {page.pageNumber} dari {page.totalPages}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export interface TabDesainRaporProps {
    onDirtyChange?: (dirty: boolean) => void;
}

export const TabDesainRapor: React.FC<TabDesainRaporProps> = ({ onDirtyChange }) => {
    const { settings, onSaveSettings, showToast, showConfirmation, showAlert, currentUser } = useAppContext();
    const { santriList } = useSantriContext();
    const canWrite = currentUser?.role === 'admin' || currentUser?.permissions?.akademik === 'write';
    const digitalAssets = useLiveQuery(() => db.digitalAssets.toArray(), []) || [];

    useEffect(() => {
        reconcileDigitalAssetsWithSettings(settings).catch(() => {});
    }, [settings]);
    const raporRecords = useLiveQuery(() => db.raporRecords.filter(r => !r.deleted).toArray(), []) || [];

    const [templates, setTemplates] = useState<RaporTemplate[]>(settings.raporTemplates || []);
    const [activeTemplate, setActiveTemplate] = useState<RaporTemplate | null>(null);
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        setTemplates(settings.raporTemplates || []);
    }, [settings.raporTemplates]);
    
    // Grid Selection & Zoom & Preview State
    const [selectedCells, setSelectedCells] = useState<{r: number, c: number}[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState<{r: number, c: number} | null>(null);
    const [zoomScale, setZoomScale] = useState(1);
    const [isDesignPreviewOpen, setIsDesignPreviewOpen] = useState(false);
    const [previewSantriId, setPreviewSantriId] = useState<string>('simulasi');
    const [previewFallbackDummyGrades, setPreviewFallbackDummyGrades] = useState<boolean>(true);
    const [previewModalZoom, setPreviewModalZoom] = useState<number>(1);
    const [previewShowKop, setPreviewShowKop] = useState<boolean>(false);
    const [isExcelPasteModalOpen, setIsExcelPasteModalOpen] = useState(false);
    const [isKurikulumGeneratorOpen, setIsKurikulumGeneratorOpen] = useState(false);
    const [selectedTagCategory, setSelectedTagCategory] = useState<string>('santri');
    const [showGridlines, setShowGridlines] = useState(true);
    const [showPageBreakGuide, setShowPageBreakGuide] = useState(true);

    // Internal Clipboard & Format Painter State
    const [internalClipboard, setInternalClipboard] = useState<{
        cells: GridCell[][];
        isCut: boolean;
        sourceSheetId: string;
        sourceRange: { rMin: number; rMax: number; cMin: number; cMax: number };
        signature: string;
    } | null>(null);
    const [copiedFormat, setCopiedFormat] = useState<Partial<GridCell> | null>(null);
    const [isFormatPainterActive, setIsFormatPainterActive] = useState(false);

    // Autocomplete ($Tag & =Formula) State
    const [autocompleteState, setAutocompleteState] = useState<{
        source: 'fx' | 'inline';
        query: string;
        mode: 'formula' | 'tag';
        replaceStart: number;
        replaceEnd: number;
        selectedIndex: number;
    } | null>(null);
    const fxInputRef = useRef<HTMLInputElement | null>(null);
    const sidebarFormulaInputRef = useRef<HTMLInputElement | null>(null);

    // Excel-style Formula Point & Drag Selection State
    const [activeFormulaSource, setActiveFormulaSource] = useState<'inline' | 'fx' | 'sidebar' | null>(null);
    const activeFormulaSourceRef = useRef<'inline' | 'fx' | 'sidebar' | null>(null);
    activeFormulaSourceRef.current = activeFormulaSource;
    const formulaPickedSpanRef = useRef<{
        source: 'inline' | 'fx' | 'sidebar';
        start: number;
        end: number;
        wasEmptyCellFormula?: boolean;
    } | null>(null);
    const formulaDragAnchorRef = useRef<{
        r: number;
        c: number;
        source: 'inline' | 'fx' | 'sidebar';
    } | null>(null);
    const isFormulaSelectingRef = useRef(false);
    const [formulaDragPreview, setFormulaDragPreview] = useState<{ r1: number; c1: number; r2: number; c2: number } | null>(null);

    // Excel-style AutoFill / Fill Handle & Post-Fill Mode Switcher State
    const [fillDragState, setFillDragState] = useState<{
        sourceBounds: { rMin: number; rMax: number; cMin: number; cMax: number };
        targetBounds: { rMin: number; rMax: number; cMin: number; cMax: number } | null;
        direction: AutoFillDirection | null;
        forceIncrement: boolean;
    } | null>(null);
    const fillDragStateRef = useRef<{
        sourceBounds: { rMin: number; rMax: number; cMin: number; cMax: number };
        targetBounds: { rMin: number; rMax: number; cMin: number; cMax: number } | null;
        direction: AutoFillDirection | null;
        forceIncrement: boolean;
    } | null>(null);
    fillDragStateRef.current = fillDragState;

    const [lastAutoFillSession, setLastAutoFillSession] = useState<{
        snapshotTemplate: RaporTemplate;
        sheetId: string;
        sourceBounds: { rMin: number; rMax: number; cMin: number; cMax: number };
        targetBounds: { rMin: number; rMax: number; cMin: number; cMax: number };
        direction: AutoFillDirection;
        mode: AutoFillMode;
    } | null>(null);

    // Inline Cell Editing State (Excel-style click & type directly inside cell)
    const [editingCell, setEditingCell] = useState<{ r: number; c: number; draft: string } | null>(null);
    const editingCellRef = useRef<{ r: number; c: number; draft: string } | null>(null);
    editingCellRef.current = editingCell;
    const inlineEditorRef = useRef<HTMLTextAreaElement | null>(null);
    const wasAlreadySingleSelectedRef = useRef(false);
    const formulaInputHistoryPushedRef = useRef(false);

    // Undo & Redo History Stacks
    const [undoStack, setUndoStack] = useState<RaporTemplate[]>([]);
    const [redoStack, setRedoStack] = useState<RaporTemplate[]>([]);

    // Column & Row Live Resizing State (Excel-like drag resize)
    const [resizingCol, setResizingCol] = useState<{ colIdx: number; startX: number; startWidth: number; currentWidth: number } | null>(null);
    const [resizingRow, setResizingRow] = useState<{ rowIdx: number; startY: number; startHeight: number; currentHeight: number } | null>(null);

    // Multi-sheet / Worksheet State
    const [activeSheetId, setActiveSheetId] = useState<string>('');
    const [editingSheetNameId, setEditingSheetNameId] = useState<string | null>(null);
    const [previewSheetId, setPreviewSheetId] = useState<string>('all');

    // Mobile View Toggle ('grid' = canvas view, 'properties' = cell settings)
    const [mobileViewTab, setMobileViewTab] = useState<'grid' | 'properties'>('grid');
    const [sidebarTab, setSidebarTab] = useState<'cell' | 'sheet'>('cell');
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isDirty, setIsDirty] = useState(false);
    const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number; r: number; c: number } | null>(null);

    useEffect(() => {
        onDirtyChange?.(isEditing && isDirty);
        return () => onDirtyChange?.(false);
    }, [isEditing, isDirty, onDirtyChange]);

    // Auto-dismiss context menu on outside click or scroll
    useEffect(() => {
        const handleDismissMenu = () => setContextMenuPos(null);
        if (contextMenuPos) {
            window.addEventListener('click', handleDismissMenu);
            window.addEventListener('scroll', handleDismissMenu, true);
            return () => {
                window.removeEventListener('click', handleDismissMenu);
                window.removeEventListener('scroll', handleDismissMenu, true);
            };
        }
    }, [contextMenuPos]);

    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const jsonInputRef = useRef<HTMLInputElement>(null);

    const activeCellData = useMemo(() => {
        if (!activeTemplate || selectedCells.length === 0) return null;
        const { r, c } = selectedCells[0];
        return activeTemplate.cells[r]?.[c] || null;
    }, [activeTemplate, selectedCells]);

    const activeSheets = useMemo(() => {
        if (!activeTemplate) return [];
        if (activeTemplate.sheets && activeTemplate.sheets.length > 0) {
            const curId = activeSheetId || activeTemplate.activeSheetId || activeTemplate.sheets[0].id;
            return activeTemplate.sheets.map(s =>
                s.id === curId
                    ? {
                          ...s,
                          cells: activeTemplate.cells,
                          rowCount: activeTemplate.rowCount,
                          colCount: activeTemplate.colCount,
                      }
                    : s
            );
        }
        return [{
            id: 'sheet_default',
            name: 'Lembar 1 (Akademik)',
            rowCount: activeTemplate.rowCount,
            colCount: activeTemplate.colCount,
            cells: activeTemplate.cells,
            paperSize: 'A4' as const
        }];
    }, [activeTemplate, activeSheetId]);

    const getExcelColName = (colIndex: number): string => {
        let name = '';
        let num = colIndex;
        while (num >= 0) {
            name = String.fromCharCode((num % 26) + 65) + name;
            num = Math.floor(num / 26) - 1;
        }
        return name;
    };

    const getColWidth = (c: number): number => {
        if (resizingCol && resizingCol.colIdx === c) {
            return resizingCol.currentWidth;
        }
        if (activeTemplate?.cells) {
            for (let r = 0; r < activeTemplate.cells.length; r++) {
                const cell = activeTemplate.cells[r]?.[c];
                if (cell && !cell.hidden && (!cell.colSpan || cell.colSpan === 1)) {
                    const w = cell.width;
                    if (typeof w === 'number' && w > 0) return w;
                }
            }
            for (let r = 0; r < activeTemplate.cells.length; r++) {
                const cell = activeTemplate.cells[r]?.[c];
                if (cell && typeof cell.width === 'number' && cell.width > 0) return cell.width;
            }
        }
        return 100;
    };

    const getRowHeight = (r: number): number => {
        if (resizingRow && resizingRow.rowIdx === r) {
            return resizingRow.currentHeight;
        }
        if (activeTemplate?.cells?.[r]) {
            for (let c = 0; c < activeTemplate.cells[r].length; c++) {
                const cell = activeTemplate.cells[r][c];
                if (cell && !cell.hidden && (!cell.rowSpan || cell.rowSpan === 1)) {
                    const h = cell.height;
                    if (typeof h === 'number' && h > 0) return h;
                }
            }
            for (let c = 0; c < activeTemplate.cells[r].length; c++) {
                const cell = activeTemplate.cells[r][c];
                if (cell && typeof cell.height === 'number' && hIsValid(cell.height)) return cell.height;
            }
        }
        return 30;
    };
    function hIsValid(h: number | undefined): h is number {
        return typeof h === 'number' && h > 0;
    }

    // --- HELPER FUNCTIONS ---
    const createEmptyCell = (r: number, c: number): GridCell => ({
        id: `cell_${Date.now()}_${r}_${c}_${Math.random().toString(36).substr(2, 4)}`,
        row: r, col: c, value: '', type: 'label', colSpan: 1, rowSpan: 1, width: 100, height: 30,
        borders: { top: false, right: false, bottom: false, left: false } 
    });

    const createInitialGrid = (rows: number, cols: number): GridCell[][] => {
        const grid: GridCell[][] = [];
        for(let r=0; r<rows; r++) {
            const rowArr = [];
            for(let c=0; c<cols; c++) rowArr.push(createEmptyCell(r,c));
            grid.push(rowArr);
        }
        return grid;
    };

    const saveTemplatesToSettings = async (updatedTemplates: RaporTemplate[]) => {
        if (!canWrite) return;
        setTemplates(updatedTemplates);
        await onSaveSettings({ ...settings, raporTemplates: updatedTemplates });
    };

    const ensureTemplateSheets = (tpl: RaporTemplate): RaporTemplate => {
        if (tpl.sheets && tpl.sheets.length > 0) {
            const activeId = tpl.activeSheetId || tpl.sheets[0].id;
            const currentSheet = tpl.sheets.find(s => s.id === activeId) || tpl.sheets[0];
            return {
                ...tpl,
                activeSheetId: currentSheet.id,
                cells: currentSheet.cells,
                rowCount: currentSheet.rowCount,
                colCount: currentSheet.colCount,
                customTitle: currentSheet.customTitle !== undefined ? currentSheet.customTitle : tpl.customTitle,
                showJudul: currentSheet.showJudul !== undefined ? currentSheet.showJudul : tpl.showJudul,
                showBiodataHeader: currentSheet.showBiodataHeader !== undefined ? currentSheet.showBiodataHeader : tpl.showBiodataHeader,
                fitToPage: currentSheet.fitToPage !== undefined ? currentSheet.fitToPage : tpl.fitToPage,
                fitWidthPages: currentSheet.fitWidthPages !== undefined ? currentSheet.fitWidthPages : tpl.fitWidthPages,
                fitHeightPages: currentSheet.fitHeightPages !== undefined ? currentSheet.fitHeightPages : tpl.fitHeightPages,
                repeatHeaderRows: currentSheet.repeatHeaderRows !== undefined ? currentSheet.repeatHeaderRows : tpl.repeatHeaderRows,
                paperSize: currentSheet.paperSize || tpl.paperSize,
                orientation: currentSheet.orientation || tpl.orientation,
                printScale: currentSheet.printScale !== undefined ? currentSheet.printScale : tpl.printScale,
                marginMode: currentSheet.marginMode || tpl.marginMode
            };
        }
        const defaultSheet: RaporSheet = {
            id: 'sheet_' + Date.now(),
            name: 'Lembar 1 (Akademik)',
            rowCount: tpl.rowCount || tpl.cells?.length || 10,
            colCount: tpl.colCount || tpl.cells?.[0]?.length || 8,
            cells: tpl.cells || createInitialGrid(10, 8),
            customTitle: tpl.customTitle,
            showJudul: tpl.showJudul,
            showBiodataHeader: tpl.showBiodataHeader,
            fitToPage: tpl.fitToPage,
            fitWidthPages: tpl.fitWidthPages,
            fitHeightPages: tpl.fitHeightPages,
            repeatHeaderRows: tpl.repeatHeaderRows,
            paperSize: tpl.paperSize || 'A4',
            orientation: tpl.orientation,
            printScale: tpl.printScale,
            marginMode: tpl.marginMode
        };
        return {
            ...tpl,
            sheets: [defaultSheet],
            activeSheetId: defaultSheet.id,
            cells: defaultSheet.cells,
            rowCount: defaultSheet.rowCount,
            colCount: defaultSheet.colCount
        };
    };

    const syncCurrentSheetToTemplate = (tpl: RaporTemplate, curSheetId?: string): RaporTemplate => {
        const sheetId = curSheetId || activeSheetId || tpl.activeSheetId || (tpl.sheets?.[0]?.id) || 'sheet_1';
        const sheets = tpl.sheets && tpl.sheets.length > 0 ? [...tpl.sheets] : [{
            id: sheetId,
            name: 'Lembar 1',
            rowCount: tpl.rowCount,
            colCount: tpl.colCount,
            cells: tpl.cells,
            showJudul: tpl.showJudul,
            paperSize: (tpl.paperSize || 'A4') as 'A4' | 'F4'
        }];

        const idx = sheets.findIndex(s => s.id === sheetId);
        if (idx >= 0) {
            sheets[idx] = {
                ...sheets[idx],
                rowCount: tpl.rowCount,
                colCount: tpl.colCount,
                cells: tpl.cells,
                customTitle: tpl.customTitle !== undefined ? tpl.customTitle : sheets[idx].customTitle,
                showJudul: tpl.showJudul !== undefined ? tpl.showJudul : sheets[idx].showJudul,
                showBiodataHeader: tpl.showBiodataHeader !== undefined ? tpl.showBiodataHeader : sheets[idx].showBiodataHeader,
                fitToPage: tpl.fitToPage !== undefined ? tpl.fitToPage : sheets[idx].fitToPage,
                fitWidthPages: tpl.fitWidthPages !== undefined ? tpl.fitWidthPages : sheets[idx].fitWidthPages,
                fitHeightPages: tpl.fitHeightPages !== undefined ? tpl.fitHeightPages : sheets[idx].fitHeightPages,
                repeatHeaderRows: tpl.repeatHeaderRows !== undefined ? tpl.repeatHeaderRows : sheets[idx].repeatHeaderRows,
                paperSize: tpl.paperSize || sheets[idx].paperSize,
                orientation: tpl.orientation || sheets[idx].orientation,
                printScale: tpl.printScale !== undefined ? tpl.printScale : sheets[idx].printScale,
                marginMode: tpl.marginMode || sheets[idx].marginMode
            };
        } else {
            sheets.push({
                id: sheetId,
                name: `Lembar ${sheets.length + 1}`,
                customTitle: tpl.customTitle,
                rowCount: tpl.rowCount,
                colCount: tpl.colCount,
                cells: tpl.cells,
                showJudul: tpl.showJudul,
                showBiodataHeader: tpl.showBiodataHeader,
                fitToPage: tpl.fitToPage,
                fitWidthPages: tpl.fitWidthPages,
                fitHeightPages: tpl.fitHeightPages,
                repeatHeaderRows: tpl.repeatHeaderRows,
                paperSize: tpl.paperSize || 'A4',
                orientation: tpl.orientation,
                printScale: tpl.printScale,
                marginMode: tpl.marginMode
            });
        }

        return {
            ...tpl,
            sheets,
            activeSheetId: sheetId
        };
    };

    const handleCreateTemplate = () => {
        const sheetId = 'sheet_' + Date.now();
        const initialCells = createInitialGrid(10, 8);
        const setBorderOn = (cell: GridCell) => ({ ...cell, borders: { top: true, right: true, bottom: true, left: true } });
        initialCells[5][0] = setBorderOn({ ...initialCells[5][0], value: 'NO', type: 'label' });
        initialCells[5][1] = setBorderOn({ ...initialCells[5][1], value: 'MATA PELAJARAN', type: 'label' });
        initialCells[5][2] = setBorderOn({ ...initialCells[5][2], value: 'NILAI', type: 'label' });

        const firstSheet: RaporSheet = {
            id: sheetId,
            name: 'Lembar 1 (Akademik)',
            rowCount: 10,
            colCount: 8,
            cells: initialCells,
            paperSize: 'A4'
        };

        const newTemplate: RaporTemplate = {
            id: 'tpl_' + Date.now(),
            name: 'Template Baru',
            rowCount: 10, 
            colCount: 8,
            cells: initialCells,
            sheets: [firstSheet],
            activeSheetId: sheetId,
            lastModified: new Date().toISOString()
        };

        setActiveTemplate(newTemplate);
        setActiveSheetId(sheetId);
        setIsEditing(true);
        setSelectedCells([]);
        setZoomScale(1);
    };

    const handleCreateSampleTemplate = () => {
        const setBorderOn = (cell: GridCell) => ({ ...cell, borders: { top: true, right: true, bottom: true, left: true } });

        // --- SHEET 1: AKADEMIK & MAPEL ---
        const sheet1Id = 'sheet_akademik_' + Date.now();
        const grid1 = createInitialGrid(11, 6);
        // Title
        grid1[0][0] = { ...grid1[0][0], value: 'LAPORAN HASIL BELAJAR - AKADEMIK', type: 'label', colSpan: 6, align: 'center' };
        for(let c=1; c<6; c++) grid1[0][c].hidden = true;

        // Info
        grid1[2][0] = { ...grid1[2][0], value: 'Nama Santri:', type: 'label', align: 'left' };
        grid1[2][1] = { ...grid1[2][1], value: '$NAMA', type: 'data', align: 'left', colSpan: 2 };
        grid1[2][2].hidden = true;
        grid1[2][4] = { ...grid1[2][4], value: 'Kelas / Rombel:', type: 'label', align: 'left' };
        grid1[2][5] = { ...grid1[2][5], value: '$ROMBEL', type: 'data', align: 'left' };

        // Table Headers
        grid1[4][0] = setBorderOn({ ...grid1[4][0], value: 'NO', type: 'label' });
        grid1[4][1] = setBorderOn({ ...grid1[4][1], value: 'MATA PELAJARAN', type: 'label', colSpan: 2 });
        grid1[4][2].hidden = true;
        grid1[4][3] = setBorderOn({ ...grid1[4][3], value: 'NILAI', type: 'label' });
        grid1[4][4] = setBorderOn({ ...grid1[4][4], value: 'TERBILANG', type: 'label' });
        grid1[4][5] = setBorderOn({ ...grid1[4][5], value: 'KETERANGAN', type: 'label' });

        // Table Rows
        grid1[5][0] = setBorderOn({ ...grid1[5][0], value: '1', type: 'label' });
        grid1[5][1] = setBorderOn({ ...grid1[5][1], value: 'Matematika', type: 'label', colSpan: 2, align: 'left' });
        grid1[5][2].hidden = true;
        grid1[5][3] = setBorderOn({ ...grid1[5][3], value: '', type: 'input', key: 'MTK' });
        grid1[5][4] = setBorderOn({ ...grid1[5][4], value: '=TERBILANG($MTK)', type: 'formula', key: 'TB_MTK' });
        grid1[5][5] = setBorderOn({ ...grid1[5][5], value: '=IF($MTK>=75, "Lulus", "Remidi")', type: 'formula', key: 'KET_MTK' });

        grid1[6][0] = setBorderOn({ ...grid1[6][0], value: '2', type: 'label' });
        grid1[6][1] = setBorderOn({ ...grid1[6][1], value: 'Bahasa Arab', type: 'label', colSpan: 2, align: 'left' });
        grid1[6][2].hidden = true;
        grid1[6][3] = setBorderOn({ ...grid1[6][3], value: '', type: 'input', key: 'BARAB' });
        grid1[6][4] = setBorderOn({ ...grid1[6][4], value: '=TERBILANG($BARAB)', type: 'formula', key: 'TB_BARAB' });
        grid1[6][5] = setBorderOn({ ...grid1[6][5], value: '=IF($BARAB>=75, "Lulus", "Remidi")', type: 'formula', key: 'KET_BARAB' });

        grid1[7][0] = setBorderOn({ ...grid1[7][0], value: '3', type: 'label' });
        grid1[7][1] = setBorderOn({ ...grid1[7][1], value: 'Bahasa Inggris', type: 'label', colSpan: 2, align: 'left' });
        grid1[7][2].hidden = true;
        grid1[7][3] = setBorderOn({ ...grid1[7][3], value: '', type: 'input', key: 'BING' });
        grid1[7][4] = setBorderOn({ ...grid1[7][4], value: '=TERBILANG($BING)', type: 'formula', key: 'TB_BING' });
        grid1[7][5] = setBorderOn({ ...grid1[7][5], value: '=IF($BING>=75, "Lulus", "Remidi")', type: 'formula', key: 'KET_BING' });

        // Summary
        grid1[8][1] = setBorderOn({ ...grid1[8][1], value: 'TOTAL NILAI', type: 'label', colSpan: 2, align: 'right' });
        grid1[8][2].hidden = true;
        grid1[8][3] = setBorderOn({ ...grid1[8][3], value: '=SUM($MTK, $BARAB, $BING)', type: 'formula', key: 'TOTAL_AKADEMIK' });
        grid1[8][4] = setBorderOn({ ...grid1[8][4], value: '', type: 'label', colSpan: 2 });
        grid1[8][5].hidden = true;

        grid1[9][1] = setBorderOn({ ...grid1[9][1], value: 'RATA-RATA', type: 'label', colSpan: 2, align: 'right' });
        grid1[9][2].hidden = true;
        grid1[9][3] = setBorderOn({ ...grid1[9][3], value: '=RATA2($MTK, $BARAB, $BING)', type: 'formula', key: 'RATA_AKADEMIK' });
        grid1[9][4] = setBorderOn({ ...grid1[9][4], value: '', type: 'label', colSpan: 2 });
        grid1[9][5].hidden = true;

        grid1[10][1] = setBorderOn({ ...grid1[10][1], value: 'PERINGKAT KELAS', type: 'label', colSpan: 2, align: 'right' });
        grid1[10][2].hidden = true;
        grid1[10][3] = setBorderOn({ ...grid1[10][3], value: '=RANK($TOTAL_AKADEMIK)', type: 'formula', key: 'RANKING_AKADEMIK' });
        grid1[10][4] = setBorderOn({ ...grid1[10][4], value: '', type: 'label', colSpan: 2 });
        grid1[10][5].hidden = true;

        const sheet1: RaporSheet = {
            id: sheet1Id,
            name: '1. Akademik & Umum',
            rowCount: 11,
            colCount: 6,
            cells: grid1,
            paperSize: 'A4'
        };

        // --- SHEET 2: KEPESANTRENAN, TAHFIZH & ADAB ---
        const sheet2Id = 'sheet_diniyah_' + Date.now();
        const grid2 = createInitialGrid(10, 6);
        // Title
        grid2[0][0] = { ...grid2[0][0], value: 'LAPORAN HASIL BELAJAR - DINIYAH & TAHFIZH', type: 'label', colSpan: 6, align: 'center' };
        for(let c=1; c<6; c++) grid2[0][c].hidden = true;

        // Info
        grid2[2][0] = { ...grid2[2][0], value: 'Nama Santri:', type: 'label', align: 'left' };
        grid2[2][1] = { ...grid2[2][1], value: '$NAMA', type: 'data', align: 'left', colSpan: 2 };
        grid2[2][2].hidden = true;
        grid2[2][4] = { ...grid2[2][4], value: 'NIS / NISN:', type: 'label', align: 'left' };
        grid2[2][5] = { ...grid2[2][5], value: '$NIS', type: 'data', align: 'left' };

        // Table Headers
        grid2[4][0] = setBorderOn({ ...grid2[4][0], value: 'NO', type: 'label' });
        grid2[4][1] = setBorderOn({ ...grid2[4][1], value: 'BIDANG DINIYAH & TAHFIZH', type: 'label', colSpan: 2 });
        grid2[4][2].hidden = true;
        grid2[4][3] = setBorderOn({ ...grid2[4][3], value: 'NILAI / CAPAIAN', type: 'label' });
        grid2[4][4] = setBorderOn({ ...grid2[4][4], value: 'PREDIKAT', type: 'label', colSpan: 2 });
        grid2[4][5].hidden = true;

        // Diniyah Rows
        grid2[5][0] = setBorderOn({ ...grid2[5][0], value: '1', type: 'label' });
        grid2[5][1] = setBorderOn({ ...grid2[5][1], value: 'Tahfizh Al-Quran (Juz)', type: 'label', colSpan: 2, align: 'left' });
        grid2[5][2].hidden = true;
        grid2[5][3] = setBorderOn({ ...grid2[5][3], value: '', type: 'input', key: 'TAHFIZH_NILAI' });
        grid2[5][4] = setBorderOn({ ...grid2[5][4], value: '', type: 'dropdown', key: 'TAHFIZH_PREDIKAT', options: ['Mumtaz', 'Jayyid Jiddan', 'Jayyid', 'Maqbul'], colSpan: 2 });
        grid2[5][5].hidden = true;

        grid2[6][0] = setBorderOn({ ...grid2[6][0], value: '2', type: 'label' });
        grid2[6][1] = setBorderOn({ ...grid2[6][1], value: 'Nahwu & Shorof', type: 'label', colSpan: 2, align: 'left' });
        grid2[6][2].hidden = true;
        grid2[6][3] = setBorderOn({ ...grid2[6][3], value: '', type: 'input', key: 'NAHWU' });
        grid2[6][4] = setBorderOn({ ...grid2[6][4], value: '=IF($NAHWU>=80, "Jayyid Jiddan", "Jayyid")', type: 'formula', key: 'PRED_NAHWU', colSpan: 2 });
        grid2[6][5].hidden = true;

        grid2[7][0] = setBorderOn({ ...grid2[7][0], value: '3', type: 'label' });
        grid2[7][1] = setBorderOn({ ...grid2[7][1], value: 'Adab & Kedisiplinan Asrama', type: 'label', colSpan: 2, align: 'left' });
        grid2[7][2].hidden = true;
        grid2[7][3] = setBorderOn({ ...grid2[7][3], value: '', type: 'dropdown', key: 'ADAB_ASRAMA', options: ['Sangat Baik', 'Baik', 'Cukup', 'Perlu Perbaikan'] });
        grid2[7][4] = setBorderOn({ ...grid2[7][4], value: '', type: 'label', colSpan: 2 });
        grid2[7][5].hidden = true;

        // Catatan
        grid2[8][0] = setBorderOn({ ...grid2[8][0], value: 'CATATAN WALI ASRAMA / KELAS:', type: 'label', colSpan: 6, align: 'left' });
        for(let c=1; c<6; c++) grid2[8][c].hidden = true;
        grid2[9][0] = setBorderOn({ ...grid2[9][0], value: '', type: 'input', key: 'CATATAN_ASRAMA', colSpan: 6, align: 'left' });
        for(let c=1; c<6; c++) grid2[9][c].hidden = true;

        const sheet2: RaporSheet = {
            id: sheet2Id,
            name: '2. Diniyah & Tahfizh',
            rowCount: 10,
            colCount: 6,
            cells: grid2,
            paperSize: 'A4'
        };

        const newTemplate: RaporTemplate = {
            id: 'tpl_sample_' + Date.now(),
            name: 'Template Multi-Sheet (Akademik & Diniyah)',
            rowCount: 11,
            colCount: 6,
            cells: grid1,
            sheets: [sheet1, sheet2],
            activeSheetId: sheet1Id,
            lastModified: new Date().toISOString()
        };

        setActiveTemplate(newTemplate);
        setActiveSheetId(sheet1Id);
        setIsEditing(true);
        setSelectedCells([]);
        setZoomScale(1);
        showToast('Template demo multi-sheet berhasil dimuat (2 Lembar).', 'success');
    };

    const handleEditTemplate = (tpl: RaporTemplate) => {
        const initialized = ensureTemplateSheets(JSON.parse(JSON.stringify(tpl)));
        setActiveTemplate(initialized);
        setActiveSheetId(initialized.activeSheetId || initialized.sheets![0].id);
        setIsEditing(true);
        setSelectedCells([]);
        setZoomScale(1);
    };

    const handleDeleteTemplate = (tplId: string) => {
        showConfirmation('Hapus Template?', 'Template ini akan dihapus permanen.', async () => {
            const currentList = settings.raporTemplates || templates;
            const updated = currentList.filter(t => t.id !== tplId);
            await saveTemplatesToSettings(updated);
            showToast('Template dihapus.', 'success');
        }, { confirmColor: 'red' });
    };
    
    const handleDuplicateTemplate = async (tplId: string) => {
        const currentList = settings.raporTemplates || templates;
        const original = currentList.find(t => t.id === tplId);
        if (!original) return;
        const newTemplate: RaporTemplate = JSON.parse(JSON.stringify(original));
        newTemplate.id = 'tpl_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
        newTemplate.name = `${original.name} (Salinan)`;
        newTemplate.lastModified = new Date().toISOString();
        const updated = [...currentList, newTemplate];
        await saveTemplatesToSettings(updated);
        showToast('Template berhasil disalin.', 'success');
    };

    const handleExportTemplateJson = (tplToExport: RaporTemplate) => {
        try {
            let finalTpl = tplToExport;
            if (isEditing && activeTemplate && activeTemplate.id === tplToExport.id) {
                let baseTpl = activeTemplate;
                if (editingCellRef.current) {
                    const cur = editingCellRef.current;
                    const res = applySmartCellTextCommit(baseTpl, cur.r, cur.c, cur.draft);
                    if (res.changed) baseTpl = res.updatedTpl;
                }
                finalTpl = syncCurrentSheetToTemplate(baseTpl, activeSheetId);
            }
            const payload = {
                _format: 'esantri_rapor_template_v1',
                exportedAt: new Date().toISOString(),
                template: finalTpl
            };
            const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const safeName = (finalTpl.name || 'Template_Rapor').replace(/[^a-zA-Z0-9_-]/g, '_');
            const a = document.createElement('a');
            a.href = url;
            a.download = `${safeName}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast(`Template "${finalTpl.name}" berhasil diekspor ke JSON.`, 'success');
        } catch (err) {
            showAlert('Gagal Ekspor JSON', (err as Error).message);
        }
    };

    const handleImportTemplateJson = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const raw = String(evt.target?.result || '');
                const parsed = JSON.parse(raw);
                const rawList: any[] = Array.isArray(parsed)
                    ? parsed
                    : parsed?.template
                    ? [parsed.template]
                    : parsed?.templates && Array.isArray(parsed.templates)
                    ? parsed.templates
                    : parsed?.cells || parsed?.sheets
                    ? [parsed]
                    : [];

                if (rawList.length === 0) {
                    throw new Error('Format file JSON tidak dikenali sebagai Template Rapor.');
                }

                const importedTemplates: RaporTemplate[] = rawList.map((item, idx) => {
                    const cloned: RaporTemplate = JSON.parse(JSON.stringify(item));
                    cloned.id = `tpl_json_${Date.now()}_${idx}_${Math.floor(Math.random() * 1000)}`;
                    cloned.name = cloned.name ? `${cloned.name}` : `Import JSON ${idx + 1}`;
                    cloned.lastModified = new Date().toISOString();
                    return ensureTemplateSheets(cloned);
                });

                const updated = [...templates, ...importedTemplates];
                saveTemplatesToSettings(updated);
                if (importedTemplates.length === 1) {
                    const first = importedTemplates[0];
                    setActiveTemplate(first);
                    setActiveSheetId(first.activeSheetId || first.sheets?.[0]?.id || '');
                    setIsEditing(true);
                    setSelectedCells([]);
                    setZoomScale(1);
                }
                showToast(`Berhasil mengimpor ${importedTemplates.length} template rapor dari JSON!`, 'success');
            } catch (err) {
                showAlert('Gagal Import JSON', (err as Error).message);
            } finally {
                if (jsonInputRef.current) jsonInputRef.current.value = '';
            }
        };
        reader.readAsText(file);
    };

    // --- WORKSHEET TAB ACTIONS ---
    const handleSwitchSheet = (targetSheetId: string) => {
        if (!activeTemplate) return;
        let baseTpl = activeTemplate;
        if (editingCellRef.current) {
            const cur = editingCellRef.current;
            editingCellRef.current = null;
            setEditingCell(null);
            const res = applySmartCellTextCommit(baseTpl, cur.r, cur.c, cur.draft);
            if (res.changed) baseTpl = res.updatedTpl;
        }
        const synced = syncCurrentSheetToTemplate(baseTpl, activeSheetId);
        const targetSheet = synced.sheets?.find(s => s.id === targetSheetId);
        if (!targetSheet) return;

        setActiveSheetId(targetSheetId);
        setSelectedCells([]);
        setLastAutoFillSession(null);
        setActiveTemplate({
            ...synced,
            activeSheetId: targetSheetId,
            cells: targetSheet.cells,
            rowCount: targetSheet.rowCount,
            colCount: targetSheet.colCount,
            customTitle: targetSheet.customTitle,
            showJudul: targetSheet.showJudul,
            showBiodataHeader: targetSheet.showBiodataHeader,
            fitToPage: targetSheet.fitToPage,
            fitWidthPages: targetSheet.fitWidthPages,
            fitHeightPages: targetSheet.fitHeightPages,
            repeatHeaderRows: targetSheet.repeatHeaderRows,
            paperSize: targetSheet.paperSize,
            orientation: targetSheet.orientation,
            printScale: targetSheet.printScale,
            marginMode: targetSheet.marginMode
        });
    };

    const handleAddSheet = (name?: string) => {
        if (!activeTemplate) return;
        const synced = syncCurrentSheetToTemplate(activeTemplate, activeSheetId);
        pushToHistory(synced);
        const sheets = synced.sheets ? [...synced.sheets] : [];
        const newSheetId = 'sheet_' + Date.now();
        const newSheetName = name || `Lembar ${sheets.length + 1}`;
        const newCells = createInitialGrid(10, 8);
        const newSheet: RaporSheet = {
            id: newSheetId,
            name: newSheetName,
            rowCount: 10,
            colCount: 8,
            cells: newCells,
            paperSize: 'A4'
        };
        sheets.push(newSheet);
        setActiveSheetId(newSheetId);
        setSelectedCells([]);
        setActiveTemplate({
            ...synced,
            sheets,
            activeSheetId: newSheetId,
            cells: newCells,
            rowCount: 10,
            colCount: 8
        });
        showToast(`Lembar baru "${newSheetName}" ditambahkan.`, 'success');
    };

    const handleDuplicateSheet = (sheetId: string) => {
        if (!activeTemplate) return;
        const synced = syncCurrentSheetToTemplate(activeTemplate, activeSheetId);
        const targetSheet = synced.sheets?.find(s => s.id === sheetId);
        if (!targetSheet) return;
        pushToHistory(synced);

        const clonedCells: GridCell[][] = targetSheet.cells.map((row, r) =>
            row.map((cell, c) => ({
                ...cell,
                id: `cell_${Date.now()}_${r}_${c}_${Math.random().toString(36).substr(2, 4)}`
            }))
        );
        const newSheetId = 'sheet_' + Date.now();
        const newSheetName = `${targetSheet.name} (Salinan)`;
        const newSheet: RaporSheet = {
            ...targetSheet,
            id: newSheetId,
            name: newSheetName,
            rowCount: targetSheet.rowCount,
            colCount: targetSheet.colCount,
            cells: clonedCells
        };

        const sheets = [...(synced.sheets || []), newSheet];
        setActiveSheetId(newSheetId);
        setSelectedCells([]);
        setActiveTemplate({
            ...synced,
            sheets,
            activeSheetId: newSheetId,
            cells: clonedCells,
            rowCount: targetSheet.rowCount,
            colCount: targetSheet.colCount,
            customTitle: newSheet.customTitle,
            showJudul: newSheet.showJudul,
            showBiodataHeader: newSheet.showBiodataHeader,
            fitToPage: newSheet.fitToPage,
            fitWidthPages: newSheet.fitWidthPages,
            fitHeightPages: newSheet.fitHeightPages,
            repeatHeaderRows: newSheet.repeatHeaderRows,
            paperSize: newSheet.paperSize,
            orientation: newSheet.orientation,
            printScale: newSheet.printScale,
            marginMode: newSheet.marginMode
        });
        showToast(`Lembar "${targetSheet.name}" berhasil digandakan.`, 'success');
    };

    const handleDeleteSheet = (sheetId: string) => {
        if (!activeTemplate) return;
        const synced = syncCurrentSheetToTemplate(activeTemplate, activeSheetId);
        if (!synced.sheets || synced.sheets.length <= 1) {
            showToast('Template harus memiliki minimal 1 lembar!', 'error');
            return;
        }
        const targetSheet = synced.sheets.find(s => s.id === sheetId);
        showConfirmation(
            'Hapus Lembar Rapor?',
            `Apakah Anda yakin ingin menghapus lembar "${targetSheet?.name || 'ini'}"? Seluruh format tabel pada lembar ini akan dihapus.`,
            () => {
                pushToHistory(synced);
                const filteredSheets = synced.sheets!.filter(s => s.id !== sheetId);
                const nextSheet = filteredSheets[0];
                setActiveSheetId(nextSheet.id);
                setSelectedCells([]);
                setActiveTemplate({
                    ...synced,
                    sheets: filteredSheets,
                    activeSheetId: nextSheet.id,
                    cells: nextSheet.cells,
                    rowCount: nextSheet.rowCount,
                    colCount: nextSheet.colCount
                });
                showToast('Lembar berhasil dihapus.', 'success');
            },
            { confirmColor: 'red' }
        );
    };

    const handleRenameSheet = (sheetId: string, newName: string) => {
        if (!activeTemplate || !newName.trim()) return;
        pushToHistory(activeTemplate);
        setActiveTemplate(prev => {
            if (!prev) return null;
            const sheets = (prev.sheets || []).map(s => s.id === sheetId ? { ...s, name: newName.trim() } : s);
            return { ...prev, sheets };
        });
    };

    const handleUpdateCustomSignatories = (nextSignatories: RaporCustomSignatory[]) => {
        if (!activeTemplate) return;
        pushToHistory(activeTemplate);
        setActiveTemplate(prev => (prev ? { ...prev, customSignatories: nextSignatories } : null));
    };

    const handleSaveActiveTemplate = async (shouldClose: boolean = false) => {
        if (!activeTemplate || !activeTemplate.name.trim()) {
            showToast('Nama template wajib diisi.', 'error');
            return;
        }
        let baseTpl = activeTemplate;
        if (editingCellRef.current) {
            const cur = editingCellRef.current;
            editingCellRef.current = null;
            setEditingCell(null);
            const res = applySmartCellTextCommit(baseTpl, cur.r, cur.c, cur.draft);
            if (res.changed) baseTpl = res.updatedTpl;
        }
        // Sync active sheet first
        const finalTemplate = syncCurrentSheetToTemplate(baseTpl, activeSheetId);

        // Check duplicates across all sheets
        const allKeys: string[] = [];
        (finalTemplate.sheets || []).forEach(sh => {
            sh.cells.flat().forEach(cell => {
                if (cell.key && !cell.hidden && (cell.type === 'input' || cell.type === 'formula' || cell.type === 'dropdown')) {
                    allKeys.push(cell.key);
                }
            });
        });

        const duplicates = allKeys.filter((item, index) => allKeys.indexOf(item) !== index);
        if (duplicates.length > 0) {
            showAlert('Error Validasi', `Kode Variabel ($KEY) harus unik di seluruh lembar template. Ditemukan duplikat: ${duplicates.join(', ')}`);
            return;
        }

        const currentList = settings.raporTemplates || templates;
        const savedTemplate = { ...finalTemplate, lastModified: new Date().toISOString() };
        const existingIdx = currentList.findIndex(t => t.id === finalTemplate.id);
        let updated: RaporTemplate[];
        if (existingIdx >= 0) {
            updated = [...currentList];
            updated[existingIdx] = savedTemplate;
        } else {
            updated = [...currentList, savedTemplate];
        }
        await saveTemplatesToSettings(updated);
        setIsDirty(false);

        if (shouldClose) {
            setIsEditing(false);
            setActiveTemplate(null);
            showToast('Template multi-sheet berhasil disimpan.', 'success');
        } else {
            setActiveTemplate(savedTemplate);
            showToast('Desain template tersimpan! Anda dapat terus mengedit.', 'success');
        }
    };

    const handleCancelEditing = () => {
        if (isDirty) {
            showConfirmation(
                'Batalkan Perubahan Desain?',
                'Terdapat perubahan desain template yang belum disimpan. Yakin ingin keluar tanpa menyimpan?',
                () => {
                    setIsEditing(false);
                    setActiveTemplate(null);
                    setIsDirty(false);
                },
                { confirmColor: 'red' }
            );
        } else {
            setIsEditing(false);
            setActiveTemplate(null);
            setIsDirty(false);
        }
    };

    // --- IMPORT EXCEL (WITH MULTI-SHEET SUPPORT) ---
    const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const XLSX = await loadXLSX();
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                if (!wb.SheetNames || wb.SheetNames.length === 0) throw new Error("File tidak memiliki lembar sheet.");
                
                const systemKeys = ['$NAMA', '$NIS', '$NISN', '$KELAS', '$ROMBEL', '$SEMESTER', '$TAHUN_AJAR', '$NAMA_YAYASAN', '$NAMA_PONPES', '$ALAMAT_PONDOK', '$LOGO', '$WALI_KELAS', '$MUDIR', '$TOTAL_NILAI', '$RATA_RATA', '$PERINGKAT', '$KKM', '$KKM_STANDAR', '$NILAI_KKM', '$KBM'];
                const importedSheets: RaporSheet[] = [];

                wb.SheetNames.forEach((sheetName, sIdx) => {
                    const ws = wb.Sheets[sheetName];
                    if (!ws) return;
                    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1');
                    const rowCount = Math.min(range.e.r + 1, 100);
                    const colCount = Math.min(range.e.c + 1, 30);

                    // Ekstrak lebar kolom dari format Excel asli (mendukung hingga mepet 8px)
                    const colWidths: number[] = [];
                    if (ws['!cols']) {
                        for (let c = 0; c < colCount; c++) {
                            const colInfo = ws['!cols'][c];
                            if (colInfo) {
                                if (colInfo.wpx) colWidths[c] = Math.max(8, Math.min(800, Math.round(colInfo.wpx)));
                                else if (colInfo.wch) colWidths[c] = Math.max(8, Math.min(800, Math.round(colInfo.wch * 8)));
                                else if (colInfo.width) colWidths[c] = Math.max(8, Math.min(800, Math.round(colInfo.width * 8)));
                            }
                        }
                    }

                    // Ekstrak tinggi baris dari format Excel asli (mendukung hingga mepet 8px)
                    const rowHeights: number[] = [];
                    if (ws['!rows']) {
                        for (let r = 0; r < rowCount; r++) {
                            const rowInfo = ws['!rows'][r];
                            if (rowInfo) {
                                if (rowInfo.hpx) rowHeights[r] = Math.max(8, Math.min(400, Math.round(rowInfo.hpx)));
                                else if (rowInfo.hpt) rowHeights[r] = Math.max(8, Math.min(400, Math.round(rowInfo.hpt * 1.333)));
                            }
                        }
                    }

                    let hasBiodataInSheet = false;
                    const newCells: GridCell[][] = [];
                    for (let r = 0; r < rowCount; r++) {
                        const row: GridCell[] = [];
                        for (let c = 0; c < colCount; c++) {
                            const cell = createEmptyCell(r, c);
                            cell.width = colWidths[c] || 100;
                            cell.height = rowHeights[r] || 30;
                            row.push(cell);
                        }
                        newCells.push(row);
                    }

                    for (let r = 0; r < rowCount; r++) {
                        for (let c = 0; c < colCount; c++) {
                            const cellAddr = XLSX.utils.encode_cell({ r, c });
                            const cellVal = ws[cellAddr];
                            if (cellVal) {
                                const valStr = String(cellVal.v).trim();
                                newCells[r][c].value = valStr;
                                if (valStr.startsWith('=')) {
                                    newCells[r][c].type = 'formula';
                                } else if (valStr.startsWith('{{') && valStr.endsWith('}}')) {
                                    const inner = valStr.slice(2, -2).trim().toUpperCase();
                                    const mappedTag = inner === 'NAMA' || inner === 'NAMA_LENGKAP' ? '$NAMA'
                                        : inner === 'NIS' ? '$NIS'
                                        : inner === 'NISN' ? '$NISN'
                                        : inner === 'ROMBEL' || inner === 'KELAS' ? '$ROMBEL'
                                        : inner === 'PERINGKAT' || inner === 'RANKING' ? '$PERINGKAT'
                                        : inner === 'KKM' || inner === 'NILAI_KKM' ? '$KKM'
                                        : `$${inner}`;
                                    newCells[r][c].value = mappedTag;
                                    newCells[r][c].type = 'data';
                                    if (mappedTag !== '$KKM' && !mappedTag.startsWith('$KKM_')) {
                                        hasBiodataInSheet = true;
                                    }
                                } else if (valStr.startsWith('$')) {
                                    const upVal = valStr.toUpperCase();
                                    if (
                                        systemKeys.includes(upVal) ||
                                        upVal === '$KKM' ||
                                        upVal.startsWith('$KKM_') ||
                                        upVal.startsWith('$MAPEL_') ||
                                        upVal.startsWith('$TOTAL') ||
                                        upVal.startsWith('$RATA') ||
                                        upVal.startsWith('$RANK')
                                    ) {
                                        newCells[r][c].type = 'data';
                                        newCells[r][c].value = upVal;
                                        if (upVal === '$NAMA' || upVal === '$NIS' || upVal === '$ROMBEL' || upVal === '$PERINGKAT') {
                                            hasBiodataInSheet = true;
                                        }
                                    } else {
                                        newCells[r][c].type = 'input';
                                        newCells[r][c].key = valStr.substring(1).toUpperCase().replace(/[^A-Z0-9_]/g, '');
                                        newCells[r][c].value = ''; 
                                    }
                                }
                                const b = (cellVal as any)?.s?.border;
                                const hasBorder = b ? {
                                    top: Boolean(b.top && b.top.style && b.top.style !== 'none'),
                                    right: Boolean(b.right && b.right.style && b.right.style !== 'none'),
                                    bottom: Boolean(b.bottom && b.bottom.style && b.bottom.style !== 'none'),
                                    left: Boolean(b.left && b.left.style && b.left.style !== 'none')
                                } : null;
                                newCells[r][c].borders = hasBorder || { top: false, right: false, bottom: false, left: false };
                            }
                        }
                    }

                    if (ws['!merges']) {
                        ws['!merges'].forEach(merge => {
                            const startR = merge.s.r; const startC = merge.s.c; const endR = merge.e.r; const endC = merge.e.c;
                            if (startR < rowCount && startC < colCount) {
                                const cell = newCells[startR][startC];
                                cell.rowSpan = endR - startR + 1;
                                cell.colSpan = endC - startC + 1;
                                for(let r = startR; r <= endR; r++) {
                                    for(let c = startC; c <= endC; c++) {
                                        if (r === startR && c === startC) continue;
                                        if (r < rowCount && c < colCount) { newCells[r][c].hidden = true; newCells[r][c].value = ''; }
                                    }
                                }
                            }
                        });
                    }

                    importedSheets.push({
                        id: 'sheet_' + Date.now() + '_' + sIdx,
                        name: sheetName || `Lembar ${sIdx + 1}`,
                        rowCount,
                        colCount,
                        cells: newCells,
                        paperSize: 'A4',
                        showJudul: false,
                        showBiodataHeader: !hasBiodataInSheet,
                        fitToPage: true
                    });
                });

                if (importedSheets.length === 0) throw new Error("Gagal membaca lembar dari file.");

                const cleanName = file.name.replace(/\.(xlsx|xls|ods|csv)$/i, '');
                const firstSheet = importedSheets[0];
                const hasAnyBiodata = importedSheets.some(s => s.showBiodataHeader === false);
                const newTemplate: RaporTemplate = {
                    id: 'tpl_' + Date.now(),
                    name: `Import_${cleanName}`,
                    rowCount: firstSheet.rowCount,
                    colCount: firstSheet.colCount,
                    cells: firstSheet.cells,
                    sheets: importedSheets,
                    activeSheetId: firstSheet.id,
                    showJudul: false,
                    showBiodataHeader: !hasAnyBiodata,
                    fitToPage: true,
                    lastModified: new Date().toISOString()
                };

                setActiveTemplate(newTemplate);
                setActiveSheetId(firstSheet.id);
                setIsEditing(true);
                setIsDirty(true);
                setZoomScale(1);
                showToast(`Import Berhasil! (${importedSheets.length} lembar dimuat)`, 'success');
            } catch (e) { showAlert('Gagal Import File', (e as Error).message); } finally { if (fileInputRef.current) fileInputRef.current.value = ''; }
        };
        reader.readAsBinaryString(file);
    };

    // --- UNDO / REDO HISTORY & GRID OPERATIONS ---
    const pushToHistory = (tpl: RaporTemplate, keepAutoFillSession = false) => {
        try {
            const snapshot = JSON.parse(JSON.stringify(tpl));
            setUndoStack(prev => [...prev.slice(-24), snapshot]);
            setRedoStack([]);
            setIsDirty(true);
            if (!keepAutoFillSession) {
                setLastAutoFillSession(null);
            }
        } catch {
            // fallback
        }
    };

    const handleUndo = () => {
        if (undoStack.length === 0 || !activeTemplate) return;
        const prev = undoStack[undoStack.length - 1];
        setUndoStack(u => u.slice(0, -1));
        setRedoStack(r => [...r.slice(-24), JSON.parse(JSON.stringify(activeTemplate))]);
        setActiveTemplate(prev);
        setLastAutoFillSession(null);
        showToast('Undo: Berhasil membatalkan aksi terakhir.', 'info');
    };

    const handleRedo = () => {
        if (redoStack.length === 0 || !activeTemplate) return;
        const next = redoStack[redoStack.length - 1];
        setRedoStack(r => r.slice(0, -1));
        setUndoStack(u => [...u.slice(-24), JSON.parse(JSON.stringify(activeTemplate))]);
        setActiveTemplate(next);
        setLastAutoFillSession(null);
        showToast('Redo: Berhasil mengulangi aksi.', 'info');
    };

    const handleBulkUpdateCells = (updates: Partial<GridCell>) => {
        if (!activeTemplate || selectedCells.length === 0) return;
        pushToHistory(activeTemplate);
        const newCells = activeTemplate.cells.map(row => row.map(c => ({ ...c })));
        selectedCells.forEach(({ r, c }) => {
            if (newCells[r] && newCells[r][c] && !newCells[r][c].hidden) {
                newCells[r][c] = { ...newCells[r][c], ...updates };
            }
        });
        const updated = { ...activeTemplate, cells: newCells };
        setActiveTemplate(syncCurrentSheetToTemplate(updated, activeSheetId));
    };

    const handleStepDecimalPlaces = (delta: 1 | -1) => {
        if (!activeTemplate || selectedCells.length === 0) return;
        const cur = activeCellData?.decimalPlaces;
        const next = cur === undefined
            ? (delta > 0 ? 2 : 1)
            : Math.max(0, Math.min(3, cur + delta));
        handleBulkUpdateCells({ decimalPlaces: next });
    };

    const handleBulkClearValues = () => {
        if (!activeTemplate || selectedCells.length === 0) return;
        pushToHistory(activeTemplate);
        const newCells = activeTemplate.cells.map(row => row.map(c => ({ ...c })));
        selectedCells.forEach(({ r, c }) => {
            if (newCells[r] && newCells[r][c] && !newCells[r][c].hidden) {
                newCells[r][c] = { ...newCells[r][c], value: '', key: undefined };
            }
        });
        const updated = { ...activeTemplate, cells: newCells };
        setActiveTemplate(syncCurrentSheetToTemplate(updated, activeSheetId));
        showToast(`Isi pada ${selectedCells.length} sel berhasil dikosongkan.`, 'success');
    };

    const handleInsertMapelRow = () => {
        if (!activeTemplate) return;
        pushToHistory(activeTemplate);
        const setBorderOn = (c: GridCell) => ({ ...c, borders: { top: true, right: true, bottom: true, left: true } });
        const insertAfterR = selectedCells.length > 0 ? selectedCells[selectedCells.length - 1].r : activeTemplate.rowCount - 1;
        const targetRow = insertAfterR + 1;

        const newRow: GridCell[] = [];
        for (let c = 0; c < activeTemplate.colCount; c++) {
            newRow.push(createEmptyCell(targetRow, c));
        }

        if (newRow.length >= 1) newRow[0] = setBorderOn({ ...newRow[0], value: '$MAPEL_NO', type: 'data', align: 'center', width: 35 });
        if (newRow.length >= 2) newRow[1] = setBorderOn({ ...newRow[1], value: '$MAPEL_NAMA', type: 'data', align: 'left', width: 200 });
        if (newRow.length >= 3) newRow[2] = setBorderOn({ ...newRow[2], value: '$MAPEL_KKM', type: 'data', align: 'center', width: 55 });
        if (newRow.length >= 4) newRow[3] = setBorderOn({ ...newRow[3], value: '$MAPEL_NILAI', type: 'data', align: 'center', width: 65 });
        if (newRow.length >= 5) newRow[4] = setBorderOn({ ...newRow[4], value: '$MAPEL_PREDIKAT', type: 'data', align: 'center', width: 65 });
        if (newRow.length >= 6) newRow[5] = setBorderOn({ ...newRow[5], value: '$MAPEL_DESKRIPSI', type: 'data', align: 'left', width: 220 });

        const newGrid = [
            ...activeTemplate.cells.slice(0, targetRow),
            newRow,
            ...activeTemplate.cells.slice(targetRow)
        ].map((rowArr, r) => rowArr.map((c, col) => ({ ...c, row: r, col })));

        const updated = {
            ...activeTemplate,
            rowCount: newGrid.length,
            cells: newGrid
        };
        setActiveTemplate(syncCurrentSheetToTemplate(updated, activeSheetId));
        showToast('Berhasil menyisipkan baris mata pelajaran dengan tag dinamis.', 'success');
    };

    // --- INLINE CELL EDITING & EXCEL KEYBOARD NAVIGATION ---
    const isKnownDynamicSystemTag = (raw: string): boolean => {
        const up = raw.trim().toUpperCase();
        if (!up.startsWith('$') || up.includes(' ')) return false;
        if (up === '$KKM' || up.startsWith('$KKM_') || up.startsWith('$MAPEL_') || up.startsWith('$TTD_')) return true;
        for (const cat of DYNAMIC_TAG_CATEGORIES) {
            if (cat.tags.some(t => t.tag.toUpperCase() === up)) return true;
        }
        const aliases = [
            '$TAHUNAJAR', '$TAHUN_AJAR', '$TAHUNAJARAN', '$TAHUN_AJARAN',
            '$MARHALAH', '$JENJANG', '$TINGKAT', '$KELAS', '$ROMBEL', '$SEMESTER',
            '$FASE', '$CAPAIAN_KOMPETENSI', '$P5', '$CATATAN_WALIKELAS', '$LOGO',
            '$NILAI_KKM', '$STANDAR_KKM', '$KKM_DEFAULT', '$KKM_MARHALAH', '$KBM'
        ];
        return aliases.includes(up);
    };

    const findMasterCell = (tpl: RaporTemplate, r: number, c: number): { r: number; c: number } => {
        const target = tpl.cells[r]?.[c];
        if (!target || !target.hidden) return { r, c };
        for (let mr = r; mr >= 0; mr--) {
            for (let mc = c; mc >= 0; mc--) {
                const candidate = tpl.cells[mr]?.[mc];
                if (candidate && !candidate.hidden) {
                    const rSpan = candidate.rowSpan || 1;
                    const cSpan = candidate.colSpan || 1;
                    if (r >= mr && r < mr + rSpan && c >= mc && c < mc + cSpan) {
                        return { r: mr, c: mc };
                    }
                }
            }
        }
        return { r, c };
    };

    const getEditableCellString = (cell: GridCell): string => {
        if (cell.type === 'input') {
            return cell.key ? `$${cell.key}` : (cell.value || '');
        }
        return cell.value || '';
    };

    const applySmartCellTextCommit = (
        tpl: RaporTemplate,
        r: number,
        c: number,
        rawDraft: string
    ): { updatedTpl: RaporTemplate; changed: boolean } => {
        const cell = tpl.cells[r]?.[c];
        if (!cell) return { updatedTpl: tpl, changed: false };

        const trimmed = rawDraft.trim();
        let nextType: RaporColumnType = cell.type;
        let nextValue = rawDraft;
        let nextKey = cell.key;

        if (trimmed.startsWith('=')) {
            nextType = 'formula';
            nextValue = rawDraft;
        } else if (isMediaTag(trimmed) || isKnownDynamicSystemTag(trimmed)) {
            nextType = 'data';
            const upTrim = trimmed.toUpperCase();
            nextValue = (upTrim === '$NILAI_KKM' || upTrim === '$KBM') ? '$KKM' : (trimmed.startsWith('$TTD_PENGAJAR:') ? trimmed : upTrim);
            nextKey = undefined;
        } else if (/^\$[A-Za-z0-9_]+$/.test(trimmed)) {
            nextType = 'input';
            nextKey = trimmed.replace(/^\$/, '').toUpperCase().replace(/[^A-Z0-9_]/g, '');
            nextValue = '';
        } else if (cell.type === 'input') {
            if (trimmed === '') {
                nextType = 'label';
                nextValue = '';
                nextKey = undefined;
            } else {
                nextType = 'label';
                nextValue = rawDraft;
                nextKey = undefined;
            }
        } else if (cell.type === 'formula') {
            nextType = 'label';
            nextValue = rawDraft;
        } else if (cell.type === 'data') {
            nextType = 'label';
            nextValue = rawDraft;
        } else {
            nextValue = rawDraft;
        }

        const changed =
            nextValue !== (cell.value || '') ||
            nextType !== cell.type ||
            nextKey !== cell.key;

        if (!changed) return { updatedTpl: tpl, changed: false };

        const newCells = tpl.cells.map((rowArr, rIdx) =>
            rIdx === r
                ? rowArr.map((item, cIdx) =>
                      cIdx === c ? { ...item, type: nextType, value: nextValue, key: nextKey } : item
                  )
                : rowArr
        );
        const updated = syncCurrentSheetToTemplate({ ...tpl, cells: newCells }, activeSheetId);
        return { updatedTpl: updated, changed: true };
    };

    const moveSelectionFrom = (fromR: number, fromC: number, dr: number, dc: number, baseTpl?: RaporTemplate) => {
        const tpl = baseTpl || activeTemplate;
        if (!tpl) return;
        const master = findMasterCell(tpl, fromR, fromC);
        const curCell = tpl.cells[master.r]?.[master.c];
        const rStep = dr > 0 ? (curCell?.rowSpan || 1) : dr;
        const cStep = dc > 0 ? (curCell?.colSpan || 1) : dc;
        const nextR = Math.max(0, Math.min(tpl.rowCount - 1, master.r + rStep));
        const nextC = Math.max(0, Math.min(tpl.colCount - 1, master.c + cStep));
        const dest = findMasterCell(tpl, nextR, nextC);
        setSelectedCells([{ r: dest.r, c: dest.c }]);
    };

    const startInlineEdit = (r: number, c: number, initialOverride?: string) => {
        if (!canWrite || !activeTemplate) return;
        const master = findMasterCell(activeTemplate, r, c);
        const cell = activeTemplate.cells[master.r]?.[master.c];
        if (!cell) return;
        const draft = initialOverride !== undefined ? initialOverride : getEditableCellString(cell);
        setSelectedCells([{ r: master.r, c: master.c }]);
        formulaPickedSpanRef.current = null;
        formulaInputHistoryPushedRef.current = false;
        setActiveFormulaSource('inline');
        activeFormulaSourceRef.current = 'inline';
        const next = { r: master.r, c: master.c, draft };
        editingCellRef.current = next;
        setEditingCell(next);
    };

    const commitInlineEdit = (moveDelta?: { dr: number; dc: number }) => {
        const current = editingCellRef.current;
        if (!current) return;
        editingCellRef.current = null;
        setEditingCell(null);
        formulaPickedSpanRef.current = null;
        formulaDragAnchorRef.current = null;
        isFormulaSelectingRef.current = false;
        setFormulaDragPreview(null);
        if (activeFormulaSourceRef.current === 'inline') {
            setActiveFormulaSource(null);
            activeFormulaSourceRef.current = null;
        }

        let latestTpl = activeTemplate;
        if (activeTemplate && canWrite) {
            const finalDraft = autoCloseFormulaParens(current.draft);
            const { updatedTpl, changed } = applySmartCellTextCommit(activeTemplate, current.r, current.c, finalDraft);
            if (changed) {
                pushToHistory(activeTemplate);
                setActiveTemplate(updatedTpl);
                latestTpl = updatedTpl;
            }
        }

        if (moveDelta && latestTpl) {
            moveSelectionFrom(current.r, current.c, moveDelta.dr, moveDelta.dc, latestTpl);
            requestAnimationFrame(() => {
                scrollContainerRef.current?.focus({ preventScroll: true });
            });
        }
    };

    const cancelInlineEdit = () => {
        editingCellRef.current = null;
        setEditingCell(null);
        formulaPickedSpanRef.current = null;
        formulaDragAnchorRef.current = null;
        isFormulaSelectingRef.current = false;
        setFormulaDragPreview(null);
        if (activeFormulaSourceRef.current === 'inline') {
            setActiveFormulaSource(null);
            activeFormulaSourceRef.current = null;
        }
        setAutocompleteState(null);
        requestAnimationFrame(() => {
            scrollContainerRef.current?.focus({ preventScroll: true });
        });
    };

    // --- AUTOCOMPLETE ($TAG & =FORMULA) ENGINE ---
    const allAutocompletePool = useMemo<AutocompleteOption[]>(() => {
        const items: AutocompleteOption[] = [];
        // 1. Formula suggestions
        RAPOR_FORMULA_SUGGESTIONS.forEach((f, idx) => {
            items.push({
                id: `fn_${idx}_${f.label}`,
                label: f.syntax,
                insertText: f.insertText,
                subtitle: `${f.description} • Syntax: ${f.syntax}`,
                badge: 'Rumus',
                badgeClass: 'bg-amber-100 text-amber-800 border-amber-200'
            });
        });

        // 2. Custom $KEY variables defined across sheets in this template
        if (activeTemplate) {
            const seenKeys = new Set<string>();
            const sheetsList = activeTemplate.sheets && activeTemplate.sheets.length > 0
                ? activeTemplate.sheets
                : [{ id: 'cur', name: 'Lembar 1', cells: activeTemplate.cells, rowCount: activeTemplate.rowCount, colCount: activeTemplate.colCount }];
            sheetsList.forEach(sh => {
                const cells = sh.id === activeSheetId ? activeTemplate.cells : sh.cells;
                cells?.forEach((row, rIdx) => {
                    row.forEach(c => {
                        if (c.key && !c.hidden && !seenKeys.has(c.key)) {
                            seenKeys.add(c.key);
                            items.push({
                                id: `key_${c.key}`,
                                label: `$${c.key}`,
                                insertText: `$${c.key}`,
                                subtitle: `Variabel ${c.type.toUpperCase()} (${sh.name}, Baris ${rIdx + 1})`,
                                badge: 'Variabel Nilai',
                                badgeClass: 'bg-blue-100 text-blue-800 border-blue-200'
                            });
                        }
                    });
                });
            });
        }

        // 3. System Dynamic Tags
        DYNAMIC_TAG_CATEGORIES.forEach(cat => {
            cat.tags.forEach(t => {
                items.push({
                    id: `tag_${t.tag}`,
                    label: t.tag,
                    insertText: t.tag,
                    subtitle: `${t.label} (Cth: ${t.example})`,
                    badge: cat.title,
                    badgeClass: 'bg-teal-100 text-teal-800 border-teal-200'
                });
            });
        });

        // 4. Per-Subject $KKM_<MAPEL> Tags Directly from Data Master Mata Pelajaran
        const jenjangMap = new Map<number, string>((settings.jenjang || []).map(j => [j.id, j.nama]));
        const targetJId = activeTemplate?.jenjangId;
        const mapelCandidates = (settings.mataPelajaran || []).filter(mp => !targetJId || Number(mp.jenjangId) === Number(targetJId));
        const mapelPoolForAuto = mapelCandidates.length > 0 ? mapelCandidates : (settings.mataPelajaran || []);
        const seenKkmTags = new Set<string>();
        mapelPoolForAuto.forEach(mp => {
            const rawSuffix = canonicalizeMapelLookupKey(mp.kodeMapel || mp.nama || '', false);
            if (!rawSuffix) return;
            const kkmTag = `$KKM_${rawSuffix}`;
            if (seenKkmTags.has(kkmTag)) return;
            seenKkmTags.add(kkmTag);
            const jName = jenjangMap.get(mp.jenjangId);
            items.push({
                id: `kkm_master_${mp.id}`,
                label: kkmTag,
                insertText: kkmTag,
                subtitle: `KKM ${mp.nama}${jName ? ` (${jName})` : ''} → ${mp.kkm ?? 70} (Data Master)`,
                badge: 'KKM Master',
                badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200'
            });
        });

        return items;
    }, [activeTemplate, activeSheetId, settings.mataPelajaran, settings.jenjang]);

    const detectAutocompleteTrigger = (text: string, caretPos: number, source: 'fx' | 'inline') => {
        const beforeCaret = text.slice(0, caretPos);
        // Check $Tag or $KEY token before caret
        const tagMatch = beforeCaret.match(/(\$[A-Za-z0-9_]*)$/);
        if (tagMatch) {
            const token = tagMatch[1];
            setAutocompleteState(prev => ({
                source,
                query: token,
                mode: 'tag',
                replaceStart: caretPos - token.length,
                replaceEnd: caretPos,
                selectedIndex: prev?.query === token ? prev.selectedIndex : 0
            }));
            return;
        }

        // Check =Formula token when cell starts with =
        if (text.trimStart().startsWith('=')) {
            const leadingEqMatch = beforeCaret.match(/^\s*(=[A-Za-z0-9_]*)$/);
            if (leadingEqMatch) {
                const token = leadingEqMatch[1];
                setAutocompleteState(prev => ({
                    source,
                    query: token,
                    mode: 'formula',
                    replaceStart: caretPos - token.length,
                    replaceEnd: caretPos,
                    selectedIndex: prev?.query === token ? prev.selectedIndex : 0
                }));
                return;
            }
            const nestedFnMatch = beforeCaret.match(/[=,(+\-*/\s]([A-Za-z]{2,}[0-9]*)$/);
            if (nestedFnMatch) {
                const token = nestedFnMatch[1];
                setAutocompleteState(prev => ({
                    source,
                    query: `=${token}`,
                    mode: 'formula',
                    replaceStart: caretPos - token.length,
                    replaceEnd: caretPos,
                    selectedIndex: prev?.query === `=${token}` ? prev.selectedIndex : 0
                }));
                return;
            }
        }

        setAutocompleteState(null);
    };

    const filteredAutocompleteOptions = useMemo<AutocompleteOption[]>(() => {
        if (!autocompleteState) return [];
        const q = autocompleteState.query.toUpperCase();
        if (autocompleteState.mode === 'formula') {
            return allAutocompletePool
                .filter(opt => opt.id.startsWith('fn_') && (q === '=' || opt.insertText.toUpperCase().startsWith(q) || opt.label.toUpperCase().includes(q.replace(/^=/, ''))))
                .slice(0, 8);
        }
        return allAutocompletePool
            .filter(opt => !opt.id.startsWith('fn_') && (q === '$' || opt.insertText.toUpperCase().includes(q) || opt.subtitle.toUpperCase().includes(q.replace(/^\$/, ''))))
            .slice(0, 10);
    }, [autocompleteState, allAutocompletePool]);

    const applyAutocompleteOption = (opt: AutocompleteOption) => {
        if (!autocompleteState || !activeTemplate) return;
        const { source, replaceStart, replaceEnd } = autocompleteState;
        formulaPickedSpanRef.current = null;

        if (source === 'inline' && editingCellRef.current) {
            const cur = editingCellRef.current;
            const prefix = cur.draft.slice(0, replaceStart);
            const suffix = cur.draft.slice(replaceEnd);
            // If inserting nested function inside =IF(..., TERB -> don't duplicate leading '='
            const rawInsert = opt.id.startsWith('fn_') && replaceStart > 0 && prefix.trimStart().startsWith('=')
                ? opt.insertText.replace(/^=/, '')
                : opt.insertText;
            const nextDraft = prefix + rawInsert + suffix;
            const nextCaret = prefix.length + rawInsert.length;
            const nextState = { ...cur, draft: nextDraft };
            editingCellRef.current = nextState;
            setEditingCell(nextState);
            setAutocompleteState(null);
            requestAnimationFrame(() => {
                if (inlineEditorRef.current) {
                    inlineEditorRef.current.focus({ preventScroll: true });
                    inlineEditorRef.current.setSelectionRange(nextCaret, nextCaret);
                }
            });
            return;
        }

        if (source === 'fx' && activeCellData) {
            const currentStr = editingCellRef.current && editingCellRef.current.r === activeCellData.row && editingCellRef.current.c === activeCellData.col
                ? editingCellRef.current.draft
                : getEditableCellString(activeCellData);
            const prefix = currentStr.slice(0, replaceStart);
            const suffix = currentStr.slice(replaceEnd);
            const rawInsert = opt.id.startsWith('fn_') && replaceStart > 0 && prefix.trimStart().startsWith('=')
                ? opt.insertText.replace(/^=/, '')
                : opt.insertText;
            const nextStr = prefix + rawInsert + suffix;
            const nextCaret = prefix.length + rawInsert.length;

            if (!formulaInputHistoryPushedRef.current) {
                pushToHistory(activeTemplate);
                formulaInputHistoryPushedRef.current = true;
            }
            const { updatedTpl, changed } = applySmartCellTextCommit(activeTemplate, activeCellData.row, activeCellData.col, nextStr);
            if (changed) {
                setActiveTemplate(updatedTpl);
            }
            setAutocompleteState(null);
            requestAnimationFrame(() => {
                if (fxInputRef.current) {
                    fxInputRef.current.focus({ preventScroll: true });
                    fxInputRef.current.setSelectionRange(nextCaret, nextCaret);
                }
            });
        }
    };

    // --- INTERNAL COPY / CUT / PASTE & FORMAT PAINTER ---
    const handleCopySelection = (isCut = false) => {
        if (!activeTemplate || selectedCells.length === 0) return;
        const rMin = Math.min(...selectedCells.map(s => s.r));
        const rMax = Math.max(...selectedCells.map(s => s.r));
        const cMin = Math.min(...selectedCells.map(s => s.c));
        const cMax = Math.max(...selectedCells.map(s => s.c));

        const copiedMatrix: GridCell[][] = [];
        const tsvLines: string[] = [];
        for (let r = rMin; r <= rMax; r++) {
            const rowSlice: GridCell[] = [];
            const txtCols: string[] = [];
            for (let c = cMin; c <= cMax; c++) {
                const cell = activeTemplate.cells[r]?.[c] || createEmptyCell(r, c);
                rowSlice.push(JSON.parse(JSON.stringify(cell)));
                txtCols.push(cell.hidden ? '' : getEditableCellString(cell));
            }
            copiedMatrix.push(rowSlice);
            tsvLines.push(txtCols.join('\t'));
        }
        const tsv = tsvLines.join('\n');
        const sig = tsv.trim();
        setInternalClipboard({
            cells: copiedMatrix,
            isCut,
            sourceSheetId: activeSheetId || activeTemplate.activeSheetId || '',
            sourceRange: { rMin, rMax, cMin, cMax },
            signature: sig
        });
        if (navigator.clipboard?.writeText) {
            navigator.clipboard.writeText(tsv).catch(() => {});
        }
        const rowLen = rMax - rMin + 1;
        const colLen = cMax - cMin + 1;
        showToast(
            isCut
                ? `Dipindahkan (Cut) ${rowLen}×${colLen} sel. Klik sel tujuan lalu tekan Ctrl+V.`
                : `Disalin ${rowLen}×${colLen} sel ke clipboard.`,
            'info'
        );
    };

    const handlePasteFromInternalClipboard = (): boolean => {
        if (!activeTemplate || !canWrite || !internalClipboard) return false;
        pushToHistory(activeTemplate);
        const startR = selectedCells[0]?.r ?? 0;
        const startC = selectedCells[0]?.c ?? 0;
        const pasteRows = internalClipboard.cells.length;
        const pasteCols = internalClipboard.cells[0]?.length || 0;
        if (pasteRows === 0 || pasteCols === 0) return false;

        const targetRowCount = Math.max(activeTemplate.rowCount, startR + pasteRows);
        const targetColCount = Math.max(activeTemplate.colCount, startC + pasteCols);

        const newGrid: GridCell[][] = [];
        for (let r = 0; r < targetRowCount; r++) {
            const rowArr: GridCell[] = [];
            for (let c = 0; c < targetColCount; c++) {
                const existing = activeTemplate.cells[r]?.[c];
                if (existing) {
                    rowArr.push({ ...existing, row: r, col: c });
                } else {
                    const w = activeTemplate.cells[0]?.[c]?.width || 100;
                    const h = activeTemplate.cells[r]?.[0]?.height || 30;
                    rowArr.push({ ...createEmptyCell(r, c), width: w, height: h });
                }
            }
            newGrid.push(rowArr);
        }

        // If Cut on the same sheet, clear source cells first before placing destination cells
        const isSameSheetCut = internalClipboard.isCut && internalClipboard.sourceSheetId === (activeSheetId || activeTemplate.activeSheetId || '');
        if (isSameSheetCut) {
            const { rMin, rMax, cMin, cMax } = internalClipboard.sourceRange;
            for (let r = rMin; r <= rMax; r++) {
                for (let c = cMin; c <= cMax; c++) {
                    if (newGrid[r]?.[c]) {
                        newGrid[r][c] = {
                            ...createEmptyCell(r, c),
                            width: newGrid[r][c].width,
                            height: newGrid[r][c].height
                        };
                    }
                }
            }
        }

        // Collect existing keys across all sheets (excluding destination cells being overwritten)
        const usedKeys = new Set<string>();
        const syncedCheck = syncCurrentSheetToTemplate(activeTemplate, activeSheetId);
        (syncedCheck.sheets || []).forEach(sh => {
            const isCur = sh.id === (activeSheetId || activeTemplate.activeSheetId);
            const gridRef = isCur ? newGrid : sh.cells;
            gridRef.forEach((rowArr, r) => {
                rowArr.forEach((cell, c) => {
                    if (isCur && r >= startR && r < startR + pasteRows && c >= startC && c < startC + pasteCols) {
                        return;
                    }
                    if (cell.key && !cell.hidden) usedKeys.add(cell.key.toUpperCase());
                });
            });
        });

        const nextSelection: { r: number; c: number }[] = [];
        for (let dr = 0; dr < pasteRows; dr++) {
            for (let dc = 0; dc < pasteCols; dc++) {
                const destR = startR + dr;
                const destC = startC + dc;
                const src = internalClipboard.cells[dr][dc];
                let nextKey = src.key;
                if (nextKey && !src.hidden) {
                    const baseKey = nextKey.toUpperCase();
                    if (usedKeys.has(baseKey)) {
                        let suffix = 2;
                        while (usedKeys.has(`${baseKey}_${suffix}`)) suffix++;
                        nextKey = `${baseKey}_${suffix}`;
                    }
                    usedKeys.add(nextKey.toUpperCase());
                }
                newGrid[destR][destC] = {
                    ...JSON.parse(JSON.stringify(src)),
                    id: `cell_${Date.now()}_${destR}_${destC}_${Math.random().toString(36).slice(2, 6)}`,
                    row: destR,
                    col: destC,
                    key: nextKey,
                    width: newGrid[destR][destC].width,
                    height: newGrid[destR][destC].height
                };
                nextSelection.push({ r: destR, c: destC });
            }
        }

        const updated = {
            ...activeTemplate,
            rowCount: targetRowCount,
            colCount: targetColCount,
            cells: newGrid
        };
        setActiveTemplate(syncCurrentSheetToTemplate(updated, activeSheetId));
        setSelectedCells(nextSelection);
        if (internalClipboard.isCut) {
            setInternalClipboard(prev => prev ? { ...prev, isCut: false } : null);
        }
        showToast(`Berhasil menempel ${pasteRows}×${pasteCols} sel.`, 'success');
        return true;
    };

    const handleToggleFormatPainter = () => {
        if (isFormatPainterActive) {
            setIsFormatPainterActive(false);
            setCopiedFormat(null);
            return;
        }
        if (!activeCellData) {
            showToast('Pilih sel sumber terlebih dahulu untuk menyalin formatnya.', 'info');
            return;
        }
        setCopiedFormat({
            borders: activeCellData.borders ? { ...activeCellData.borders } : { top: false, right: false, bottom: false, left: false },
            bold: activeCellData.bold,
            italic: activeCellData.italic,
            fontSize: activeCellData.fontSize,
            align: activeCellData.align,
            verticalAlign: activeCellData.verticalAlign,
            textWrap: activeCellData.textWrap,
            textTransform: activeCellData.textTransform,
            decimalPlaces: activeCellData.decimalPlaces,
            backgroundColor: activeCellData.backgroundColor,
            color: activeCellData.color
        });
        setIsFormatPainterActive(true);
        showToast('Format sel disalin! Klik atau blok sel tujuan untuk menerapkan format.', 'info');
    };

    const isInlineEditingOpen = Boolean(editingCell);
    React.useEffect(() => {
        if (editingCell && inlineEditorRef.current) {
            const el = inlineEditorRef.current;
            el.focus({ preventScroll: true });
            const len = el.value.length;
            el.setSelectionRange(len, len);
        }
    }, [editingCell?.r, editingCell?.c, isInlineEditingOpen]);

    // Keyboard listener for Undo/Redo, Copy/Cut, Excel-style arrow navigation, F2/Enter edit, Delete, & direct typing
    React.useEffect(() => {
        if (!isEditing || isDesignPreviewOpen || isExcelPasteModalOpen || isKurikulumGeneratorOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            const targetEl = e.target as HTMLElement | null;
            const targetTag = targetEl?.tagName?.toLowerCase();
            if (targetTag === 'input' || targetTag === 'textarea' || targetTag === 'select' || targetEl?.isContentEditable) {
                return;
            }

            if (e.key === 'Escape' && isFormatPainterActive) {
                e.preventDefault();
                setIsFormatPainterActive(false);
                setCopiedFormat(null);
                return;
            }

            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
                e.preventDefault();
                handleSaveActiveTemplate(false);
                return;
            }
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b' && canWrite) {
                e.preventDefault();
                if (selectedCells.length > 0 && activeTemplate) {
                    const isAnyNotBold = selectedCells.some(s => !activeTemplate.cells[s.r]?.[s.c]?.bold);
                    handleBulkUpdateCells({ bold: isAnyNotBold });
                }
                return;
            }
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i' && canWrite) {
                e.preventDefault();
                if (selectedCells.length > 0 && activeTemplate) {
                    const isAnyNotItalic = selectedCells.some(s => !activeTemplate.cells[s.r]?.[s.c]?.italic);
                    handleBulkUpdateCells({ italic: isAnyNotItalic });
                }
                return;
            }
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
                e.preventDefault();
                if (e.shiftKey) handleRedo();
                else handleUndo();
                return;
            }
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
                e.preventDefault();
                handleRedo();
                return;
            }
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
                if (selectedCells.length > 0) {
                    e.preventDefault();
                    handleCopySelection(false);
                }
                return;
            }
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'x' && canWrite) {
                if (selectedCells.length > 0) {
                    e.preventDefault();
                    handleCopySelection(true);
                }
                return;
            }
            if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'd' && canWrite) {
                if (selectedCells.length > 0) {
                    e.preventDefault();
                    handleFillDownShortcut();
                }
                return;
            }
            if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'r' && canWrite) {
                if (selectedCells.length > 0) {
                    e.preventDefault();
                    handleFillRightShortcut();
                }
                return;
            }

            if (!activeTemplate || selectedCells.length === 0) return;
            const primary = selectedCells[0];

            if (e.key === 'ArrowUp') {
                e.preventDefault();
                moveSelectionFrom(primary.r, primary.c, -1, 0);
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                moveSelectionFrom(primary.r, primary.c, 1, 0);
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                moveSelectionFrom(primary.r, primary.c, 0, -1);
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                moveSelectionFrom(primary.r, primary.c, 0, 1);
            } else if (e.key === 'Tab') {
                e.preventDefault();
                moveSelectionFrom(primary.r, primary.c, 0, e.shiftKey ? -1 : 1);
            } else if (e.key === 'Enter' || e.key === 'F2') {
                e.preventDefault();
                startInlineEdit(primary.r, primary.c);
            } else if ((e.key === 'Delete' || e.key === 'Backspace') && canWrite) {
                e.preventDefault();
                handleBulkClearValues();
            } else if (
                canWrite &&
                selectedCells.length === 1 &&
                e.key.length === 1 &&
                !e.ctrlKey &&
                !e.metaKey &&
                !e.altKey
            ) {
                e.preventDefault();
                startInlineEdit(primary.r, primary.c, e.key);
                if (e.key === '$' || e.key === '=') {
                    detectAutocompleteTrigger(e.key, 1, 'inline');
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isEditing, isDesignPreviewOpen, isExcelPasteModalOpen, isKurikulumGeneratorOpen, isFormatPainterActive, internalClipboard, undoStack, redoStack, activeTemplate, activeSheetId, selectedCells, canWrite]);

    // --- EXCEL-STYLE FORMULA POINT & DRAG SELECTION ENGINE ---
    const getFormulaEditSession = (): {
        source: 'inline' | 'fx' | 'sidebar';
        text: string;
        ownerR: number;
        ownerC: number;
        inputEl: HTMLInputElement | HTMLTextAreaElement | null;
        isFormulaCellType: boolean;
    } | null => {
        if (!activeTemplate || !canWrite) return null;
        if (editingCellRef.current) {
            const { r, c, draft } = editingCellRef.current;
            const ownerCell = activeTemplate.cells[r]?.[c];
            return {
                source: 'inline',
                text: draft,
                ownerR: r,
                ownerC: c,
                inputEl: inlineEditorRef.current,
                isFormulaCellType: ownerCell?.type === 'formula'
            };
        }
        const src = activeFormulaSourceRef.current;
        if (src === 'fx' && activeCellData) {
            return {
                source: 'fx',
                text: getEditableCellString(activeCellData),
                ownerR: activeCellData.row,
                ownerC: activeCellData.col,
                inputEl: fxInputRef.current,
                isFormulaCellType: activeCellData.type === 'formula'
            };
        }
        if (src === 'sidebar' && activeCellData) {
            return {
                source: 'sidebar',
                text: activeCellData.value || '',
                ownerR: activeCellData.row,
                ownerC: activeCellData.col,
                inputEl: sidebarFormulaInputRef.current,
                isFormulaCellType: activeCellData.type === 'formula'
            };
        }
        return null;
    };

    const buildFormulaRefToken = (r1: number, c1: number, r2: number, c2: number): string => {
        if (!activeTemplate) return '';
        const m1 = findMasterCell(activeTemplate, r1, c1);
        const m2 = findMasterCell(activeTemplate, r2, c2);
        if (m1.r === m2.r && m1.c === m2.c) {
            const targetCell = activeTemplate.cells[m1.r]?.[m1.c];
            if (targetCell && !targetCell.hidden && targetCell.key && (targetCell.type === 'input' || targetCell.type === 'dropdown')) {
                return `$${targetCell.key}`;
            }
            return `${getExcelColName(m1.c)}${m1.r + 1}`;
        }
        const topR = Math.min(m1.r, m2.r);
        const botR = Math.max(m1.r, m2.r);
        const leftC = Math.min(m1.c, m2.c);
        const rightC = Math.max(m1.c, m2.c);
        return `${getExcelColName(leftC)}${topR + 1}:${getExcelColName(rightC)}${botR + 1}`;
    };

    const applyFormulaTextUpdate = (
        source: 'inline' | 'fx' | 'sidebar',
        ownerR: number,
        ownerC: number,
        nextText: string,
        nextCaretPos: number
    ) => {
        if (!activeTemplate) return;
        if (source === 'inline' && editingCellRef.current) {
            const nextState = { ...editingCellRef.current, draft: nextText };
            editingCellRef.current = nextState;
            setEditingCell(nextState);
            requestAnimationFrame(() => {
                if (inlineEditorRef.current) {
                    inlineEditorRef.current.focus({ preventScroll: true });
                    inlineEditorRef.current.setSelectionRange(nextCaretPos, nextCaretPos);
                }
            });
            return;
        }

        if (!formulaInputHistoryPushedRef.current) {
            pushToHistory(activeTemplate);
            formulaInputHistoryPushedRef.current = true;
        }

        if (source === 'sidebar') {
            const newCells = activeTemplate.cells.map((rowArr, rIdx) =>
                rIdx === ownerR
                    ? rowArr.map((cellObj, cIdx) => (cIdx === ownerC ? { ...cellObj, type: 'formula' as RaporColumnType, value: nextText } : cellObj))
                    : rowArr
            );
            setActiveTemplate(syncCurrentSheetToTemplate({ ...activeTemplate, cells: newCells }, activeSheetId));
            requestAnimationFrame(() => {
                if (sidebarFormulaInputRef.current) {
                    sidebarFormulaInputRef.current.focus({ preventScroll: true });
                    sidebarFormulaInputRef.current.setSelectionRange(nextCaretPos, nextCaretPos);
                }
            });
            return;
        }

        // source === 'fx'
        const { updatedTpl, changed } = applySmartCellTextCommit(activeTemplate, ownerR, ownerC, nextText);
        if (changed) {
            setActiveTemplate(updatedTpl);
        }
        requestAnimationFrame(() => {
            if (fxInputRef.current) {
                fxInputRef.current.focus({ preventScroll: true });
                fxInputRef.current.setSelectionRange(nextCaretPos, nextCaretPos);
            }
        });
    };

    const updateFormulaPickedReference = (r1: number, c1: number, r2: number, c2: number) => {
        const session = getFormulaEditSession();
        if (!session || !activeTemplate) return;

        const m1 = findMasterCell(activeTemplate, r1, c1);
        const m2 = findMasterCell(activeTemplate, r2, c2);
        const isMulti = m1.r !== m2.r || m1.c !== m2.c;
        const token = buildFormulaRefToken(r1, c1, r2, c2);
        if (!token) return;

        const curSpan = formulaPickedSpanRef.current;
        let nextText = session.text;
        let nextSpanStart = 0;
        let nextSpanEnd = 0;
        let wasEmptyCell = false;

        if (curSpan && curSpan.source === session.source) {
            if (curSpan.wasEmptyCellFormula) {
                nextText = isMulti ? `=SUM(${token})` : `=${token}`;
                nextSpanStart = 0;
                nextSpanEnd = nextText.length;
                wasEmptyCell = true;
            } else {
                nextText = session.text.slice(0, curSpan.start) + token + session.text.slice(curSpan.end);
                nextSpanStart = curSpan.start;
                nextSpanEnd = curSpan.start + token.length;
            }
        } else if (session.text.trim() === '' && session.isFormulaCellType) {
            nextText = isMulti ? `=SUM(${token})` : `=${token}`;
            nextSpanStart = 0;
            nextSpanEnd = nextText.length;
            wasEmptyCell = true;
        } else {
            const insStart = session.inputEl?.selectionStart ?? session.text.length;
            const insEnd = session.inputEl?.selectionEnd ?? insStart;
            nextText = session.text.slice(0, insStart) + token + session.text.slice(insEnd);
            nextSpanStart = insStart;
            nextSpanEnd = insStart + token.length;
        }

        formulaPickedSpanRef.current = {
            source: session.source,
            start: nextSpanStart,
            end: nextSpanEnd,
            wasEmptyCellFormula: wasEmptyCell
        };
        setFormulaDragPreview({
            r1: Math.min(m1.r, m2.r),
            c1: Math.min(m1.c, m2.c),
            r2: Math.max(m1.r, m2.r),
            c2: Math.max(m1.c, m2.c)
        });
        setAutocompleteState(null);
        applyFormulaTextUpdate(session.source, session.ownerR, session.ownerC, nextText, nextSpanEnd);
    };

    const tryStartFormulaCellPick = (r: number, c: number, appendComma: boolean): boolean => {
        const session = getFormulaEditSession();
        if (!session || !activeTemplate) return false;

        const clickedMaster = findMasterCell(activeTemplate, r, c);
        if (clickedMaster.r === session.ownerR && clickedMaster.c === session.ownerC) {
            return false;
        }

        const existingSpan = formulaPickedSpanRef.current;
        const hasActiveSpan = Boolean(existingSpan && existingSpan.source === session.source);
        if (!hasActiveSpan) {
            const caret = session.inputEl?.selectionStart ?? session.text.length;
            if (!isFormulaReadyForCellPick(session.text.slice(0, caret), session.text, session.isFormulaCellType)) {
                return false;
            }
        }

        isFormulaSelectingRef.current = true;
        if (appendComma && existingSpan && existingSpan.source === session.source && !existingSpan.wasEmptyCellFormula) {
            const withComma = session.text.slice(0, existingSpan.end) + ', ' + session.text.slice(existingSpan.end);
            const commaPos = existingSpan.end + 2;
            applyFormulaTextUpdate(session.source, session.ownerR, session.ownerC, withComma, commaPos);
            formulaPickedSpanRef.current = {
                source: session.source,
                start: commaPos,
                end: commaPos
            };
        }

        formulaDragAnchorRef.current = { r, c, source: session.source };
        updateFormulaPickedReference(r, c, r, c);
        return true;
    };

    const finishFormulaPointMode = () => {
        const session = getFormulaEditSession();
        formulaPickedSpanRef.current = null;
        formulaDragAnchorRef.current = null;
        isFormulaSelectingRef.current = false;
        setFormulaDragPreview(null);

        if (!session || !activeTemplate) {
            setActiveFormulaSource(null);
            activeFormulaSourceRef.current = null;
            return;
        }

        if (session.source === 'inline') {
            commitInlineEdit({ dr: 1, dc: 0 });
            return;
        }

        const closedText = autoCloseFormulaParens(session.text);
        if (closedText !== session.text) {
            applyFormulaTextUpdate(session.source, session.ownerR, session.ownerC, closedText, closedText.length);
        }
        setActiveFormulaSource(null);
        activeFormulaSourceRef.current = null;
        requestAnimationFrame(() => {
            scrollContainerRef.current?.focus({ preventScroll: true });
        });
    };

    // Global mouseup safety when dragging formula range and releasing outside table
    useEffect(() => {
        const onGlobalMouseUp = () => {
            if (formulaDragAnchorRef.current) {
                formulaDragAnchorRef.current = null;
                setFormulaDragPreview(null);
                setTimeout(() => {
                    isFormulaSelectingRef.current = false;
                }, 80);
            }
        };
        window.addEventListener('mouseup', onGlobalMouseUp);
        return () => window.removeEventListener('mouseup', onGlobalMouseUp);
    }, []);

    // Quick 1-Click AutoSum / Rerata when user blocks multiple cells first (just like Excel AutoSum Σ)
    const handleQuickRangeFormula = (fnName: 'SUM' | 'RATA2' | 'MAX' | 'MIN') => {
        if (!activeTemplate || !canWrite || selectedCells.length < 2) return;
        pushToHistory(activeTemplate);

        const rMin = Math.min(...selectedCells.map(s => s.r));
        const rMax = Math.max(...selectedCells.map(s => s.r));
        const cMin = Math.min(...selectedCells.map(s => s.c));
        const cMax = Math.max(...selectedCells.map(s => s.c));

        const isHorizontalRow = rMin === rMax && cMax > cMin;
        let calcRMax = rMax;
        let calcCMax = cMax;
        let destR = isHorizontalRow ? rMin : rMax + 1;
        let destC = isHorizontalRow ? cMax + 1 : cMin;

        // Jika sel paling ujung bawah/kanan yang ikut diblok masih kosong (seperti kebiasaan di Excel blok nilai + 1 sel kosong di bawahnya), taruh hasil di sel kosong tersebut
        if (!isHorizontalRow && rMax > rMin) {
            const bottomCell = activeTemplate.cells[rMax]?.[cMin];
            const isBottomEmpty = bottomCell && !bottomCell.hidden && bottomCell.type === 'label' && !(bottomCell.value || '').trim() && !bottomCell.key;
            if (isBottomEmpty) {
                calcRMax = rMax - 1;
                destR = rMax;
            }
        } else if (isHorizontalRow && cMax > cMin) {
            const rightCell = activeTemplate.cells[rMin]?.[cMax];
            const isRightEmpty = rightCell && !rightCell.hidden && rightCell.type === 'label' && !(rightCell.value || '').trim() && !rightCell.key;
            if (isRightEmpty) {
                calcCMax = cMax - 1;
                destC = cMax;
            }
        }

        const rangeStr = calcRMax === rMin && calcCMax === cMin
            ? buildFormulaRefToken(rMin, cMin, rMin, cMin)
            : `${getExcelColName(cMin)}${rMin + 1}:${getExcelColName(calcCMax)}${calcRMax + 1}`;
        const formulaExpr = `=${fnName}(${rangeStr})`;

        const newCells = activeTemplate.cells.map(row => row.map(cell => ({ ...cell })));
        let nextRowCount = activeTemplate.rowCount;
        let nextColCount = activeTemplate.colCount;

        if (destR >= nextRowCount) {
            const addedRow: GridCell[] = [];
            for (let cc = 0; cc < nextColCount; cc++) {
                addedRow.push({ ...createEmptyCell(nextRowCount, cc), width: getColWidth(cc) });
            }
            newCells.push(addedRow);
            nextRowCount++;
        }
        if (destC >= nextColCount) {
            newCells.forEach((rowArr, rr) => {
                rowArr.push({ ...createEmptyCell(rr, nextColCount), height: getRowHeight(rr) });
            });
            nextColCount++;
        }

        const destMaster = findMasterCell({ ...activeTemplate, cells: newCells, rowCount: nextRowCount, colCount: nextColCount }, destR, destC);
        const existingDest = newCells[destMaster.r][destMaster.c];
        newCells[destMaster.r][destMaster.c] = {
            ...existingDest,
            type: 'formula',
            value: formulaExpr,
            bold: true,
            align: existingDest.align || 'center'
        };

        const updated = syncCurrentSheetToTemplate(
            { ...activeTemplate, rowCount: nextRowCount, colCount: nextColCount, cells: newCells },
            activeSheetId
        );
        setActiveTemplate(updated);
        setSelectedCells([{ r: destMaster.r, c: destMaster.c }]);
        showToast(
            `Rumus ${formulaExpr} ditempatkan di sel ${getExcelColName(destMaster.c)}${destMaster.r + 1}!`,
            'success'
        );
    };

    const currentFormulaTextForHighlight = useMemo(() => {
        if (editingCell) return editingCell.draft;
        if ((activeFormulaSource === 'fx' || activeFormulaSource === 'sidebar') && activeCellData) {
            return getEditableCellString(activeCellData);
        }
        return '';
    }, [editingCell, activeFormulaSource, activeCellData]);

    const formulaReferencedCoords = useMemo(() => {
        return extractFormulaReferencedCoords(currentFormulaTextForHighlight, activeTemplate?.cells);
    }, [currentFormulaTextForHighlight, activeTemplate?.cells]);

    const isFormulaPointModeBannerVisible = useMemo(() => {
        if (!canWrite || !activeTemplate) return false;
        const isEditingAnyFormulaInput = Boolean(editingCell) || activeFormulaSource === 'fx' || activeFormulaSource === 'sidebar';
        if (!isEditingAnyFormulaInput) return false;
        const isTypeFormula = editingCell
            ? activeTemplate.cells[editingCell.r]?.[editingCell.c]?.type === 'formula'
            : activeCellData?.type === 'formula';
        if (formulaPickedSpanRef.current) return true;
        return isFormulaReadyForCellPick(currentFormulaTextForHighlight, currentFormulaTextForHighlight, Boolean(isTypeFormula));
    }, [canWrite, activeTemplate, editingCell, activeFormulaSource, activeCellData, currentFormulaTextForHighlight]);

    // Siklus penguncian referensi '$' ala F4 di Excel (D6 -> $D$6 -> D$6 -> $D6 -> D6)
    const handleCycleFormulaLock = (): boolean => {
        const session = getFormulaEditSession();
        if (!session || !activeTemplate) return false;
        const trimmed = session.text.trimStart();
        if (!trimmed.startsWith('=') && !session.isFormulaCellType) return false;

        const selStart = session.inputEl?.selectionStart ?? session.text.length;
        const selEnd = session.inputEl?.selectionEnd ?? selStart;
        const cycled = cycleFormulaReferenceLockAtCaret(
            session.text,
            selStart,
            selEnd,
            activeTemplate.cells
        );
        if (!cycled) {
            showToast('Arahkan kursor pada alamat sel (misal D6 atau D6:D15) lalu tekan F4 untuk mengunci $.', 'info');
            return false;
        }

        if (formulaPickedSpanRef.current && formulaPickedSpanRef.current.source === session.source) {
            formulaPickedSpanRef.current = {
                ...formulaPickedSpanRef.current,
                start: cycled.selStart,
                end: cycled.selEnd
            };
        }

        if (session.source === 'inline' && editingCellRef.current) {
            const nextState = { ...editingCellRef.current, draft: cycled.nextText };
            editingCellRef.current = nextState;
            setEditingCell(nextState);
            requestAnimationFrame(() => {
                if (inlineEditorRef.current) {
                    inlineEditorRef.current.focus({ preventScroll: true });
                    inlineEditorRef.current.setSelectionRange(cycled.selStart, cycled.selEnd);
                }
            });
            return true;
        }

        applyFormulaTextUpdate(session.source, session.ownerR, session.ownerC, cycled.nextText, cycled.selEnd);
        requestAnimationFrame(() => {
            const el = session.source === 'sidebar' ? sidebarFormulaInputRef.current : fxInputRef.current;
            if (el) {
                el.focus({ preventScroll: true });
                el.setSelectionRange(cycled.selStart, cycled.selEnd);
            }
        });
        return true;
    };

    // --- EXCEL-STYLE AUTOFILL, FILL SERIES & FORMULA DRAG-FILL ENGINE ---
    const selectionBounds = useMemo(() => {
        if (!activeTemplate || selectedCells.length === 0) return null;
        let rMin = Infinity;
        let rMax = -Infinity;
        let cMin = Infinity;
        let cMax = -Infinity;
        for (const s of selectedCells) {
            const master = findMasterCell(activeTemplate, s.r, s.c);
            const mc = activeTemplate.cells[master.r]?.[master.c];
            const rSpan = mc?.rowSpan || 1;
            const cSpan = mc?.colSpan || 1;
            rMin = Math.min(rMin, master.r);
            cMin = Math.min(cMin, master.c);
            rMax = Math.max(rMax, master.r + rSpan - 1);
            cMax = Math.max(cMax, master.c + cSpan - 1);
        }
        if (!isFinite(rMin)) return null;
        return { rMin, rMax, cMin, cMax };
    }, [activeTemplate, selectedCells]);

    const computeFillTargetFromHover = (
        srcBounds: { rMin: number; rMax: number; cMin: number; cMax: number },
        hoverR: number,
        hoverC: number
    ): { targetBounds: { rMin: number; rMax: number; cMin: number; cMax: number } | null; direction: AutoFillDirection | null } => {
        if (!activeTemplate) return { targetBounds: null, direction: null };
        const master = findMasterCell(activeTemplate, hoverR, hoverC);
        const mc = activeTemplate.cells[master.r]?.[master.c];
        const hR1 = Math.min(hoverR, master.r);
        const hC1 = Math.min(hoverC, master.c);
        const hR2 = Math.max(hoverR, master.r + (mc?.rowSpan || 1) - 1);
        const hC2 = Math.max(hoverC, master.c + (mc?.colSpan || 1) - 1);

        const distDown = hR2 > srcBounds.rMax ? hR2 - srcBounds.rMax : 0;
        const distUp = hR1 < srcBounds.rMin ? srcBounds.rMin - hR1 : 0;
        const distRight = hC2 > srcBounds.cMax ? hC2 - srcBounds.cMax : 0;
        const distLeft = hC1 < srcBounds.cMin ? srcBounds.cMin - hC1 : 0;

        const maxVert = Math.max(distDown, distUp);
        const maxHoriz = Math.max(distRight, distLeft);
        if (maxVert === 0 && maxHoriz === 0) {
            return { targetBounds: null, direction: null };
        }

        if (maxVert >= maxHoriz) {
            if (distDown >= distUp) {
                return {
                    direction: 'down',
                    targetBounds: { rMin: srcBounds.rMax + 1, rMax: hR2, cMin: srcBounds.cMin, cMax: srcBounds.cMax }
                };
            }
            return {
                direction: 'up',
                targetBounds: { rMin: hR1, rMax: srcBounds.rMin - 1, cMin: srcBounds.cMin, cMax: srcBounds.cMax }
            };
        }

        if (distRight >= distLeft) {
            return {
                direction: 'right',
                targetBounds: { rMin: srcBounds.rMin, rMax: srcBounds.rMax, cMin: srcBounds.cMax + 1, cMax: hC2 }
            };
        }
        return {
            direction: 'left',
            targetBounds: { rMin: srcBounds.rMin, rMax: srcBounds.rMax, cMin: hC1, cMax: srcBounds.cMin - 1 }
        };
    };

    const hasColumnNumberingHeader = (tpl: RaporTemplate, colIdx: number, aboveRow: number): boolean => {
        const headerTokens = new Set(['NO', 'NO.', 'NOMOR', 'URUT', 'NO URUT', 'NO. URUT', '#', 'الرقم']);
        for (let r = aboveRow - 1; r >= Math.max(0, aboveRow - 4); r--) {
            const master = findMasterCell(tpl, r, colIdx);
            const txt = (tpl.cells[master.r]?.[master.c]?.value || '').trim().toUpperCase();
            if (!txt) continue;
            if (headerTokens.has(txt)) return true;
        }
        return false;
    };

    const executeAutoFillOnTemplate = (
        baseTpl: RaporTemplate,
        srcBounds: { rMin: number; rMax: number; cMin: number; cMax: number },
        tgtBounds: { rMin: number; rMax: number; cMin: number; cMax: number },
        direction: AutoFillDirection,
        mode: AutoFillMode,
        curSheetId?: string
    ): { updatedTpl: RaporTemplate; unionSelection: { r: number; c: number }[]; summaryLabel: string } => {
        const newGrid: GridCell[][] = baseTpl.cells.map((rowArr, r) =>
            rowArr.map((cell, c) => ({
                ...JSON.parse(JSON.stringify(cell)),
                row: r,
                col: c
            }))
        );

        const srcH = srcBounds.rMax - srcBounds.rMin + 1;
        const srcW = srcBounds.cMax - srcBounds.cMin + 1;

        // Jika bukan mode 'format', lepaskan merge lama pada area tujuan yang bertabrakan sebagian dengan batas area tujuan
        if (mode !== 'format') {
            for (let mr = 0; mr < newGrid.length; mr++) {
                for (let mc = 0; mc < (newGrid[mr]?.length || 0); mc++) {
                    const cell = newGrid[mr][mc];
                    if (!cell || cell.hidden) continue;
                    const rs = cell.rowSpan || 1;
                    const cs = cell.colSpan || 1;
                    if (rs === 1 && cs === 1) continue;
                    const mRMax = mr + rs - 1;
                    const mCMax = mc + cs - 1;
                    const overlapsTarget =
                        mr <= tgtBounds.rMax &&
                        mRMax >= tgtBounds.rMin &&
                        mc <= tgtBounds.cMax &&
                        mCMax >= tgtBounds.cMin;
                    if (overlapsTarget) {
                        newGrid[mr][mc] = { ...newGrid[mr][mc], rowSpan: 1, colSpan: 1 };
                        for (let rr = mr; rr <= mRMax; rr++) {
                            for (let cc = mc; cc <= mCMax; cc++) {
                                if (rr === mr && cc === mc) continue;
                                if (newGrid[rr]?.[cc]) {
                                    newGrid[rr][cc] = {
                                        ...newGrid[rr][cc],
                                        hidden: false,
                                        rowSpan: 1,
                                        colSpan: 1
                                    };
                                }
                            }
                        }
                    }
                }
            }
        }

        // Kumpulkan semua $KEY yang sudah terpakai di seluruh lembar (kecuali area target yang akan ditimpa)
        const usedKeysUpper = new Set<string>();
        const targetSheetKey = curSheetId || activeSheetId || baseTpl.activeSheetId || '';
        const syncedForKeys = syncCurrentSheetToTemplate(baseTpl, targetSheetKey);
        (syncedForKeys.sheets || []).forEach(sh => {
            const isCur = sh.id === targetSheetKey;
            const refCells = isCur ? newGrid : sh.cells;
            refCells.forEach((rowArr, r) => {
                rowArr.forEach((cell, c) => {
                    if (
                        isCur &&
                        mode !== 'format' &&
                        r >= tgtBounds.rMin &&
                        r <= tgtBounds.rMax &&
                        c >= tgtBounds.cMin &&
                        c <= tgtBounds.cMax
                    ) {
                        return;
                    }
                    if (cell.key && !cell.hidden) {
                        usedKeysUpper.add(cell.key.trim().toUpperCase());
                    }
                });
            });
        });

        const isVertical = direction === 'down' || direction === 'up';
        const coveredByNewMerge = new Set<string>();

        for (let destR = tgtBounds.rMin; destR <= tgtBounds.rMax; destR++) {
            for (let destC = tgtBounds.cMin; destC <= tgtBounds.cMax; destC++) {
                if (!newGrid[destR]?.[destC]) continue;
                if (coveredByNewMerge.has(`${destR}:${destC}`)) continue;

                const offsetTop = destR - srcBounds.rMin;
                const offsetLeft = destC - srcBounds.cMin;
                const localR = ((offsetTop % srcH) + srcH) % srcH;
                const localC = ((offsetLeft % srcW) + srcW) % srcW;
                const srcR = srcBounds.rMin + localR;
                const srcC = srcBounds.cMin + localC;
                const srcCell = baseTpl.cells[srcR]?.[srcC] || createEmptyCell(srcR, srcC);
                const existingDest = newGrid[destR][destC];

                // Mode 'format': salin gaya saja tanpa menyentuh isi / rumus / key sel tujuan
                if (mode === 'format') {
                    const srcMaster = findMasterCell(baseTpl, srcR, srcC);
                    const fmtSrc = baseTpl.cells[srcMaster.r]?.[srcMaster.c] || srcCell;
                    if (!existingDest.hidden) {
                        newGrid[destR][destC] = {
                            ...existingDest,
                            borders: fmtSrc.borders ? { ...fmtSrc.borders } : existingDest.borders,
                            bold: fmtSrc.bold,
                            italic: fmtSrc.italic,
                            fontSize: fmtSrc.fontSize,
                            align: fmtSrc.align,
                            verticalAlign: fmtSrc.verticalAlign,
                            textWrap: fmtSrc.textWrap,
                            textTransform: fmtSrc.textTransform,
                            decimalPlaces: fmtSrc.decimalPlaces,
                            backgroundColor: fmtSrc.backgroundColor,
                            color: fmtSrc.color
                        };
                    }
                    continue;
                }

                // Jika sel sumber bagian dari merge internal yang utuh di dalam blok sumber, lewati bila sudah ditandai hidden
                if (srcCell.hidden) {
                    continue;
                }

                const deltaR = destR - srcR;
                const deltaC = destC - srcC;

                let nextType: RaporColumnType = srcCell.type;
                let nextValue = srcCell.value || '';
                let nextKey = srcCell.key;
                const nextOptions = srcCell.options ? [...srcCell.options] : undefined;

                const isFormulaExpr = srcCell.type === 'formula' || nextValue.trim().startsWith('=');

                if (isFormulaExpr) {
                    if (mode === 'copy') {
                        // Salin rumus mentah persis tanpa menggeser koordinat
                        nextValue = srcCell.value || '';
                    } else {
                        const rawFormula = nextValue.trim().startsWith('=') ? nextValue : `=${nextValue.trim()}`;
                        nextValue = shiftFormulaReferences(rawFormula, deltaR, deltaC, {
                            sheetCells: baseTpl.cells
                        });
                    }
                    nextType = 'formula';
                    if (nextKey) {
                        nextKey = computeAutoFillNextInputKey([nextKey], isVertical ? offsetTop : offsetLeft, usedKeysUpper, mode);
                    }
                } else if (srcCell.type === 'input' || srcCell.type === 'dropdown') {
                    const sliceKeys: (string | undefined)[] = [];
                    if (isVertical) {
                        for (let rr = srcBounds.rMin; rr <= srcBounds.rMax; rr++) {
                            sliceKeys.push(baseTpl.cells[rr]?.[srcC]?.key);
                        }
                    } else {
                        for (let cc = srcBounds.cMin; cc <= srcBounds.cMax; cc++) {
                            sliceKeys.push(baseTpl.cells[srcR]?.[cc]?.key);
                        }
                    }
                    nextKey = computeAutoFillNextInputKey(
                        sliceKeys,
                        isVertical ? offsetTop : offsetLeft,
                        usedKeysUpper,
                        mode
                    );
                } else if (srcCell.type === 'label' && (mode === 'series' || mode === 'increment')) {
                    const sliceVals: string[] = [];
                    let canBuild1DSlice = true;
                    if (isVertical) {
                        for (let rr = srcBounds.rMin; rr <= srcBounds.rMax; rr++) {
                            const sc = baseTpl.cells[rr]?.[srcC];
                            if (!sc || sc.hidden || sc.type !== 'label') {
                                canBuild1DSlice = false;
                                break;
                            }
                            sliceVals.push(sc.value || '');
                        }
                    } else {
                        for (let cc = srcBounds.cMin; cc <= srcBounds.cMax; cc++) {
                            const sc = baseTpl.cells[srcR]?.[cc];
                            if (!sc || sc.hidden || sc.type !== 'label') {
                                canBuild1DSlice = false;
                                break;
                            }
                            sliceVals.push(sc.value || '');
                        }
                    }

                    if (canBuild1DSlice && sliceVals.length > 0) {
                        const hasHeaderHint = isVertical ? hasColumnNumberingHeader(baseTpl, destC, srcBounds.rMin) : false;
                        nextValue = computeSeriesStringAtOffset(sliceVals, isVertical ? offsetTop : offsetLeft, {
                            forceSingleNumberIncrement: mode === 'increment',
                            hasNumberingHeaderHint: hasHeaderHint
                        });
                    }
                }

                // Replikasi merge internal jika sel sumber punya rowSpan/colSpan yang muat utuh dalam blok sumber & blok target
                const rawRSpan = srcCell.rowSpan || 1;
                const rawCSpan = srcCell.colSpan || 1;
                const fitsSource = srcR + rawRSpan - 1 <= srcBounds.rMax && srcC + rawCSpan - 1 <= srcBounds.cMax;
                const fitsTarget = destR + rawRSpan - 1 <= tgtBounds.rMax && destC + rawCSpan - 1 <= tgtBounds.cMax;
                const finalRSpan = fitsSource && fitsTarget ? rawRSpan : 1;
                const finalCSpan = fitsSource && fitsTarget ? rawCSpan : 1;

                newGrid[destR][destC] = {
                    ...JSON.parse(JSON.stringify(srcCell)),
                    id: existingDest.id || `cell_${Date.now()}_${destR}_${destC}_${Math.random().toString(36).slice(2, 6)}`,
                    row: destR,
                    col: destC,
                    type: nextType,
                    value: nextValue,
                    key: nextKey,
                    options: nextOptions,
                    rowSpan: finalRSpan,
                    colSpan: finalCSpan,
                    hidden: false,
                    width: existingDest.width,
                    height: existingDest.height
                };

                if (finalRSpan > 1 || finalCSpan > 1) {
                    for (let rr = destR; rr < destR + finalRSpan; rr++) {
                        for (let cc = destC; cc < destC + finalCSpan; cc++) {
                            if (rr === destR && cc === destC) continue;
                            coveredByNewMerge.add(`${rr}:${cc}`);
                            if (newGrid[rr]?.[cc]) {
                                newGrid[rr][cc] = {
                                    ...createEmptyCell(rr, cc),
                                    id: newGrid[rr][cc].id,
                                    hidden: true,
                                    width: newGrid[rr][cc].width,
                                    height: newGrid[rr][cc].height
                                };
                            }
                        }
                    }
                }
            }
        }

        const unionRMin = Math.min(srcBounds.rMin, tgtBounds.rMin);
        const unionRMax = Math.max(srcBounds.rMax, tgtBounds.rMax);
        const unionCMin = Math.min(srcBounds.cMin, tgtBounds.cMin);
        const unionCMax = Math.max(srcBounds.cMax, tgtBounds.cMax);
        const unionSelection: { r: number; c: number }[] = [];
        for (let r = unionRMin; r <= unionRMax; r++) {
            for (let c = unionCMin; c <= unionCMax; c++) {
                unionSelection.push({ r, c });
            }
        }

        const sampleDestCell =
            direction === 'up' || direction === 'left'
                ? newGrid[tgtBounds.rMin]?.[tgtBounds.cMin]
                : newGrid[tgtBounds.rMax]?.[tgtBounds.cMax];
        const summaryLabel = sampleDestCell
            ? sampleDestCell.type === 'input' && sampleDestCell.key
                ? `$${sampleDestCell.key}`
                : sampleDestCell.value || ''
            : '';

        const updatedTpl = syncCurrentSheetToTemplate(
            { ...baseTpl, cells: newGrid },
            targetSheetKey
        );
        return { updatedTpl, unionSelection, summaryLabel };
    };

    const commitAutoFillAction = (
        srcBounds: { rMin: number; rMax: number; cMin: number; cMax: number },
        tgtBounds: { rMin: number; rMax: number; cMin: number; cMax: number },
        direction: AutoFillDirection,
        mode: AutoFillMode
    ) => {
        if (!activeTemplate || !canWrite) return;
        const snapshot = JSON.parse(JSON.stringify(activeTemplate)) as RaporTemplate;
        const curSheet = activeSheetId || activeTemplate.activeSheetId || '';
        pushToHistory(activeTemplate, true);

        const { updatedTpl, unionSelection } = executeAutoFillOnTemplate(
            activeTemplate,
            srcBounds,
            tgtBounds,
            direction,
            mode,
            curSheet
        );
        setActiveTemplate(updatedTpl);
        setSelectedCells(unionSelection);
        setLastAutoFillSession({
            snapshotTemplate: snapshot,
            sheetId: curSheet,
            sourceBounds: srcBounds,
            targetBounds: tgtBounds,
            direction,
            mode
        });
    };

    const handleReapplyAutoFillMode = (nextMode: AutoFillMode) => {
        if (!lastAutoFillSession || !canWrite) return;
        const { snapshotTemplate, sheetId, sourceBounds, targetBounds, direction } = lastAutoFillSession;
        const { updatedTpl, unionSelection } = executeAutoFillOnTemplate(
            snapshotTemplate,
            sourceBounds,
            targetBounds,
            direction,
            nextMode,
            sheetId
        );
        setActiveTemplate(updatedTpl);
        setSelectedCells(unionSelection);
        setLastAutoFillSession(prev => (prev ? { ...prev, mode: nextMode } : null));
    };

    // Ctrl+D (Fill Down seperti Excel)
    const handleFillDownShortcut = () => {
        if (!activeTemplate || !canWrite || !selectionBounds) return;
        const { rMin, rMax, cMin, cMax } = selectionBounds;
        // Jika hanya 1 baris dipilih, ambil sumber dari baris tepat di atasnya
        if (rMin === rMax) {
            if (rMin === 0) {
                showToast('Blok baris sumber beserta baris bawahnya, atau pilih baris di bawah baris sumber untuk Ctrl+D.', 'info');
                return;
            }
            const aboveMaster = findMasterCell(activeTemplate, rMin - 1, cMin);
            const srcBounds = { rMin: aboveMaster.r, rMax: rMin - 1, cMin, cMax };
            const tgtBounds = { rMin, rMax, cMin, cMax };
            commitAutoFillAction(srcBounds, tgtBounds, 'down', 'series');
            return;
        }
        // Multi-baris: baris teratas pada seleksi mengisi baris-baris di bawahnya
        let topRowEnd = rMin;
        for (let c = cMin; c <= cMax; c++) {
            const m = findMasterCell(activeTemplate, rMin, c);
            const rs = activeTemplate.cells[m.r]?.[m.c]?.rowSpan || 1;
            topRowEnd = Math.max(topRowEnd, m.r + rs - 1);
        }
        if (topRowEnd >= rMax) return;
        commitAutoFillAction(
            { rMin, rMax: topRowEnd, cMin, cMax },
            { rMin: topRowEnd + 1, rMax, cMin, cMax },
            'down',
            'series'
        );
    };

    // Ctrl+R (Fill Right seperti Excel)
    const handleFillRightShortcut = () => {
        if (!activeTemplate || !canWrite || !selectionBounds) return;
        const { rMin, rMax, cMin, cMax } = selectionBounds;
        if (cMin === cMax) {
            if (cMin === 0) {
                showToast('Blok kolom sumber beserta kolom kanannya, atau pilih kolom di kanan sel sumber untuk Ctrl+R.', 'info');
                return;
            }
            const leftMaster = findMasterCell(activeTemplate, rMin, cMin - 1);
            const srcBounds = { rMin, rMax, cMin: leftMaster.c, cMax: cMin - 1 };
            const tgtBounds = { rMin, rMax, cMin, cMax };
            commitAutoFillAction(srcBounds, tgtBounds, 'right', 'series');
            return;
        }
        let leftColEnd = cMin;
        for (let r = rMin; r <= rMax; r++) {
            const m = findMasterCell(activeTemplate, r, cMin);
            const cs = activeTemplate.cells[m.r]?.[m.c]?.colSpan || 1;
            leftColEnd = Math.max(leftColEnd, m.c + cs - 1);
        }
        if (leftColEnd >= cMax) return;
        commitAutoFillAction(
            { rMin, rMax, cMin, cMax: leftColEnd },
            { rMin, rMax, cMin: leftColEnd + 1, cMax },
            'right',
            'series'
        );
    };

    // Klik Ganda pada Fill Handle: otomatis isi ke bawah mengikuti panjang baris terisi di kolom sebelah kiri/kanan (persis Excel)
    const handleDoubleClickFillHandle = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!activeTemplate || !canWrite || !selectionBounds) return;
        const { rMin, rMax, cMin, cMax } = selectionBounds;
        if (rMax >= activeTemplate.rowCount - 1) return;

        const isCellPopulated = (r: number, c: number): boolean => {
            if (c < 0 || c >= activeTemplate.colCount) return false;
            const m = findMasterCell(activeTemplate, r, c);
            const cl = activeTemplate.cells[m.r]?.[m.c];
            if (!cl) return false;
            // Berhenti jika baris merupakan sel merge lebar yang melintasi banyak kolom (misal baris "JUMLAH" / "RATA-RATA")
            if ((cl.colSpan || 1) > 1 && m.c < cMin && m.c + (cl.colSpan || 1) - 1 >= cMin) {
                return false;
            }
            return Boolean((cl.value && cl.value.trim() !== '') || (cl.key && cl.key.trim() !== ''));
        };

        // Cari kolom tetangga terdekat yang terisi pada baris rMax + 1
        const candidateCols: number[] = [];
        for (let cc = cMin - 1; cc >= 0; cc--) candidateCols.push(cc);
        for (let cc = cMax + 1; cc < activeTemplate.colCount; cc++) candidateCols.push(cc);

        const refCol = candidateCols.find(cc => isCellPopulated(rMax, cc) && isCellPopulated(rMax + 1, cc));
        if (refCol === undefined) {
            showToast('Tarik titik sudut (Fill Handle) ke bawah atau kanan untuk melanjutkan seri / rumus.', 'info');
            return;
        }

        const startType = activeTemplate.cells[findMasterCell(activeTemplate, rMax, refCol).r]?.[findMasterCell(activeTemplate, rMax, refCol).c]?.type;
        let lastRow = rMax;
        for (let rr = rMax + 1; rr < activeTemplate.rowCount; rr++) {
            if (!isCellPopulated(rr, refCol)) break;
            const curM = findMasterCell(activeTemplate, rr, refCol);
            const curCell = activeTemplate.cells[curM.r]?.[curM.c];
            // Jika kolom referensi adalah daftar input mapel, berhenti tepat sebelum baris rekap rumus (misal =SUM)
            if ((startType === 'input' || startType === 'dropdown') && curCell?.type === 'formula') {
                break;
            }
            lastRow = rr;
        }

        if (lastRow <= rMax) return;
        commitAutoFillAction(
            selectionBounds,
            { rMin: rMax + 1, rMax: lastRow, cMin, cMax },
            'down',
            'series'
        );
    };

    const handleStartFillHandleDrag = (e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!canWrite || !activeTemplate || !selectionBounds) return;
        if (editingCellRef.current) {
            commitInlineEdit();
        }
        const forceInc = 'ctrlKey' in e ? Boolean(e.ctrlKey || e.altKey) : false;
        const initial = {
            sourceBounds: selectionBounds,
            targetBounds: null,
            direction: null,
            forceIncrement: forceInc
        };
        fillDragStateRef.current = initial;
        setFillDragState(initial);
    };

    // Global mousemove / touchmove / mouseup / touchend listener untuk Fill Handle Drag
    useEffect(() => {
        if (!fillDragState) return;

        const updateFromPoint = (clientX: number, clientY: number, ctrlOrAlt: boolean) => {
            const cur = fillDragStateRef.current;
            if (!cur) return;
            const el = document.elementFromPoint(clientX, clientY)?.closest('td[data-grid-rc]');
            const rcAttr = el?.getAttribute('data-grid-rc');
            if (!rcAttr) return;
            const [hr, hc] = rcAttr.split(':').map(Number);
            if (isNaN(hr) || isNaN(hc)) return;
            const { targetBounds, direction } = computeFillTargetFromHover(cur.sourceBounds, hr, hc);
            const next = {
                ...cur,
                targetBounds,
                direction,
                forceIncrement: ctrlOrAlt
            };
            fillDragStateRef.current = next;
            setFillDragState(next);
        };

        const onMove = (ev: MouseEvent) => {
            updateFromPoint(ev.clientX, ev.clientY, Boolean(ev.ctrlKey || ev.altKey));
        };
        const onTouchMoveGlobal = (ev: TouchEvent) => {
            if (ev.touches.length !== 1) return;
            ev.preventDefault();
            updateFromPoint(ev.touches[0].clientX, ev.touches[0].clientY, false);
        };
        const onFinish = (ev: MouseEvent | TouchEvent) => {
            const cur = fillDragStateRef.current;
            fillDragStateRef.current = null;
            setFillDragState(null);
            if (cur && cur.targetBounds && cur.direction) {
                const forceInc = 'ctrlKey' in ev ? Boolean(ev.ctrlKey || ev.altKey) : cur.forceIncrement;
                commitAutoFillAction(
                    cur.sourceBounds,
                    cur.targetBounds,
                    cur.direction,
                    forceInc ? 'increment' : 'series'
                );
            }
        };

        window.addEventListener('mousemove', onMove);
        window.addEventListener('touchmove', onTouchMoveGlobal, { passive: false });
        window.addEventListener('mouseup', onFinish);
        window.addEventListener('touchend', onFinish);
        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('touchmove', onTouchMoveGlobal);
            window.removeEventListener('mouseup', onFinish);
            window.removeEventListener('touchend', onFinish);
        };
    }, [Boolean(fillDragState), activeTemplate, activeSheetId, canWrite]);

    const fillDragLivePreviewBadge = useMemo(() => {
        if (!fillDragState?.targetBounds || !fillDragState.direction || !activeTemplate) return null;
        const { sourceBounds, targetBounds, direction, forceIncrement } = fillDragState;
        const rangeLabel = `${getExcelColName(targetBounds.cMin)}${targetBounds.rMin + 1}:${getExcelColName(targetBounds.cMax)}${targetBounds.rMax + 1}`;
        const dirLabel =
            direction === 'down' ? 'Bawah' : direction === 'up' ? 'Atas' : direction === 'right' ? 'Kanan' : 'Kiri';
        const previewRes = executeAutoFillOnTemplate(
            activeTemplate,
            sourceBounds,
            targetBounds,
            direction,
            forceIncrement ? 'increment' : 'series'
        );
        return {
            dirLabel,
            rangeLabel,
            sample: previewRes.summaryLabel
        };
    }, [fillDragState, activeTemplate]);

    // --- GRID OPERATIONS ---
    const handleMouseDown = (r: number, c: number, e?: React.MouseEvent) => {
        // Jika sedang dalam Mode Pilih Sel Rumus ala Excel, klik/seret akan memasukkan koordinat/rentang sel ke rumus!
        if (tryStartFormulaCellPick(r, c, Boolean(e?.ctrlKey || e?.metaKey))) {
            e?.preventDefault();
            e?.stopPropagation();
            return;
        }

        if (editingCellRef.current) {
            if (editingCellRef.current.r === r && editingCellRef.current.c === c) {
                return;
            }
            commitInlineEdit();
        }
        formulaPickedSpanRef.current = null;
        if (activeFormulaSourceRef.current) {
            setActiveFormulaSource(null);
            activeFormulaSourceRef.current = null;
        }
        setAutocompleteState(null);
        wasAlreadySingleSelectedRef.current =
            !isFormatPainterActive && selectedCells.length === 1 && selectedCells[0].r === r && selectedCells[0].c === c;
        setIsDragging(true);
        setDragStart({ r, c });
        setSelectedCells([{ r, c }]);
        requestAnimationFrame(() => {
            if (!editingCellRef.current) {
                scrollContainerRef.current?.focus({ preventScroll: true });
            }
        });
    };
    const handleMouseEnter = (r: number, c: number) => {
        if (fillDragStateRef.current) {
            const cur = fillDragStateRef.current;
            const { targetBounds, direction } = computeFillTargetFromHover(cur.sourceBounds, r, c);
            const next = { ...cur, targetBounds, direction };
            fillDragStateRef.current = next;
            setFillDragState(next);
            return;
        }
        if (formulaDragAnchorRef.current) {
            updateFormulaPickedReference(formulaDragAnchorRef.current.r, formulaDragAnchorRef.current.c, r, c);
            return;
        }
        if (!isDragging || !dragStart) return;
        const rMin = Math.min(dragStart.r, r); const rMax = Math.max(dragStart.r, r);
        const cMin = Math.min(dragStart.c, c); const cMax = Math.max(dragStart.c, c);
        const newSelection = [];
        for(let i=rMin; i<=rMax; i++) for(let j=cMin; j<=cMax; j++) newSelection.push({ r: i, c: j });
        setSelectedCells(newSelection);
    };
    const handleMouseUp = () => {
        if (formulaDragAnchorRef.current) {
            formulaDragAnchorRef.current = null;
            setFormulaDragPreview(null);
            setTimeout(() => {
                isFormulaSelectingRef.current = false;
            }, 80);
            return;
        }
        if (isDragging && isFormatPainterActive && copiedFormat && activeTemplate && selectedCells.length > 0 && canWrite) {
            pushToHistory(activeTemplate);
            const newCells = activeTemplate.cells.map(row => row.map(c => ({ ...c })));
            selectedCells.forEach(({ r, c }) => {
                if (newCells[r]?.[c] && !newCells[r][c].hidden) {
                    newCells[r][c] = {
                        ...newCells[r][c],
                        borders: copiedFormat.borders ? { ...copiedFormat.borders } : newCells[r][c].borders,
                        bold: copiedFormat.bold,
                        italic: copiedFormat.italic,
                        fontSize: copiedFormat.fontSize,
                        align: copiedFormat.align,
                        verticalAlign: copiedFormat.verticalAlign,
                        textWrap: copiedFormat.textWrap,
                        textTransform: copiedFormat.textTransform,
                        decimalPlaces: copiedFormat.decimalPlaces,
                        backgroundColor: copiedFormat.backgroundColor,
                        color: copiedFormat.color
                    };
                }
            });
            const updated = { ...activeTemplate, cells: newCells };
            setActiveTemplate(syncCurrentSheetToTemplate(updated, activeSheetId));
            setIsFormatPainterActive(false);
            setCopiedFormat(null);
            showToast(`Format berhasil diterapkan ke ${selectedCells.length} sel.`, 'success');
        }
        setIsDragging(false);
    };

    const handleCanvasPaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
        if (!canWrite || !activeTemplate) return;
        const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
        if (targetTag === 'input' || targetTag === 'textarea') return;

        const html = e.clipboardData.getData('text/html');
        const text = e.clipboardData.getData('text/plain');

        // Prefer internal rich clipboard when clipboard text matches our internal copy/cut
        if (internalClipboard && (!html || html.trim() === '') && text.trim() === internalClipboard.signature) {
            e.preventDefault();
            handlePasteFromInternalClipboard();
            return;
        }
        if (!html && !text) {
            if (internalClipboard) {
                e.preventDefault();
                handlePasteFromInternalClipboard();
            }
            return;
        }

        const result = parseExcelClipboard(html, text);
        if (result && result.rowCount > 0 && result.colCount > 0) {
            e.preventDefault();
            pushToHistory(activeTemplate);
            const startR = selectedCells[0]?.r ?? 0;
            const startC = selectedCells[0]?.c ?? 0;
            const { updatedCells, newRowCount, newColCount } = overlayPastedTableOntoGrid(
                activeTemplate.cells,
                result,
                startR,
                startC
            );
            const updated = {
                ...activeTemplate,
                rowCount: newRowCount,
                colCount: newColCount,
                cells: updatedCells
            };
            setActiveTemplate(syncCurrentSheetToTemplate(updated, activeSheetId));
            showToast(`Berhasil menempel ${result.rowCount} baris × ${result.colCount} kolom dari Excel!`, 'success');
        }
    };

    const addRow = () => {
        if (!activeTemplate) return;
        pushToHistory(activeTemplate);
        const newRow = [];
        for(let c=0; c<activeTemplate.colCount; c++) {
            const w = getColWidth(c);
            newRow.push({ ...createEmptyCell(activeTemplate.rowCount, c), width: w });
        }
        const updatedCells = [...activeTemplate.cells, newRow];
        const newRowCount = activeTemplate.rowCount + 1;
        const updated = { ...activeTemplate, rowCount: newRowCount, cells: updatedCells };
        setActiveTemplate(syncCurrentSheetToTemplate(updated, activeSheetId));
    };

    const addCol = () => {
        if (!activeTemplate) return;
        pushToHistory(activeTemplate);
        const updatedCells = activeTemplate.cells.map((row, rIdx) => [
            ...row,
            { ...createEmptyCell(rIdx, activeTemplate.colCount), height: getRowHeight(rIdx) }
        ]);
        const newColCount = activeTemplate.colCount + 1;
        const updated = { ...activeTemplate, colCount: newColCount, cells: updatedCells };
        setActiveTemplate(syncCurrentSheetToTemplate(updated, activeSheetId));
    };

    const handleInsertRowRelative = (position: 'above' | 'below') => {
        if (!activeTemplate || !canWrite) return;
        pushToHistory(activeTemplate);

        let insertIdx = position === 'above' ? 0 : activeTemplate.rowCount;
        if (selectedCells.length > 0) {
            if (position === 'above') {
                insertIdx = Math.min(...selectedCells.map(s => s.r));
            } else {
                let maxR = 0;
                selectedCells.forEach(s => {
                    const master = findMasterCell(activeTemplate, s.r, s.c);
                    const cell = activeTemplate.cells[master.r]?.[master.c];
                    const endR = master.r + ((cell?.rowSpan || 1) - 1);
                    if (endR > maxR) maxR = endR;
                });
                insertIdx = maxR + 1;
            }
        }

        const oldCells: GridCell[][] = activeTemplate.cells.map(row => row.map(c => ({ ...c })));
        const newRow: GridCell[] = [];
        for (let c = 0; c < activeTemplate.colCount; c++) {
            newRow.push({
                ...createEmptyCell(insertIdx, c),
                width: getColWidth(c),
                height: 30
            });
        }

        // Adjust rowSpan for merged cells that cross across insertIdx
        for (let r = 0; r < insertIdx; r++) {
            for (let c = 0; c < activeTemplate.colCount; c++) {
                const cell = oldCells[r]?.[c];
                if (cell && !cell.hidden && (cell.rowSpan || 1) > 1) {
                    const rEnd = r + (cell.rowSpan || 1) - 1;
                    if (rEnd >= insertIdx) {
                        cell.rowSpan = (cell.rowSpan || 1) + 1;
                        const cSpan = cell.colSpan || 1;
                        for (let dc = 0; dc < cSpan; dc++) {
                            if (newRow[c + dc]) newRow[c + dc].hidden = true;
                        }
                    }
                }
            }
        }

        const spliced = [
            ...oldCells.slice(0, insertIdx),
            newRow,
            ...oldCells.slice(insertIdx)
        ].map((rowArr, r) => rowArr.map((cell, c) => ({ ...cell, row: r, col: c })));

        const updated = {
            ...activeTemplate,
            rowCount: spliced.length,
            cells: spliced
        };
        setActiveTemplate(syncCurrentSheetToTemplate(updated, activeSheetId));
        const activeC = selectedCells[0]?.c ?? 0;
        const targetSelect = findMasterCell(updated, insertIdx, activeC);
        setSelectedCells([{ r: targetSelect.r, c: targetSelect.c }]);
        showToast(
            position === 'above'
                ? `1 baris disisipkan di atas Baris ${insertIdx + 1}.`
                : `1 baris disisipkan di bawah Baris ${insertIdx}.`,
            'success'
        );
    };

    const handleInsertColRelative = (position: 'left' | 'right') => {
        if (!activeTemplate || !canWrite) return;
        pushToHistory(activeTemplate);

        let insertIdx = position === 'left' ? 0 : activeTemplate.colCount;
        if (selectedCells.length > 0) {
            if (position === 'left') {
                insertIdx = Math.min(...selectedCells.map(s => s.c));
            } else {
                let maxC = 0;
                selectedCells.forEach(s => {
                    const master = findMasterCell(activeTemplate, s.r, s.c);
                    const cell = activeTemplate.cells[master.r]?.[master.c];
                    const endC = master.c + ((cell?.colSpan || 1) - 1);
                    if (endC > maxC) maxC = endC;
                });
                insertIdx = maxC + 1;
            }
        }

        const oldCells: GridCell[][] = activeTemplate.cells.map(row => row.map(c => ({ ...c })));
        const hiddenRowsInNewCol = new Set<number>();

        // Adjust colSpan for merged cells that cross across insertIdx
        for (let r = 0; r < activeTemplate.rowCount; r++) {
            for (let c = 0; c < insertIdx; c++) {
                const cell = oldCells[r]?.[c];
                if (cell && !cell.hidden && (cell.colSpan || 1) > 1) {
                    const cEnd = c + (cell.colSpan || 1) - 1;
                    if (cEnd >= insertIdx) {
                        cell.colSpan = (cell.colSpan || 1) + 1;
                        const rSpan = cell.rowSpan || 1;
                        for (let dr = 0; dr < rSpan; dr++) {
                            hiddenRowsInNewCol.add(r + dr);
                        }
                    }
                }
            }
        }

        const spliced = oldCells.map((rowArr, r) => {
            const insertedCell: GridCell = {
                ...createEmptyCell(r, insertIdx),
                width: 100,
                height: getRowHeight(r),
                hidden: hiddenRowsInNewCol.has(r)
            };
            const nextRow = [
                ...rowArr.slice(0, insertIdx),
                insertedCell,
                ...rowArr.slice(insertIdx)
            ];
            return nextRow.map((cell, c) => ({ ...cell, row: r, col: c }));
        });

        const updated = {
            ...activeTemplate,
            colCount: spliced[0]?.length || activeTemplate.colCount + 1,
            cells: spliced
        };
        setActiveTemplate(syncCurrentSheetToTemplate(updated, activeSheetId));
        const activeR = selectedCells[0]?.r ?? 0;
        const targetSelect = findMasterCell(updated, activeR, insertIdx);
        setSelectedCells([{ r: targetSelect.r, c: targetSelect.c }]);
        showToast(
            position === 'left'
                ? `1 kolom disisipkan di kiri Kolom ${getExcelColName(insertIdx)}.`
                : `1 kolom disisipkan di kanan Kolom ${getExcelColName(Math.max(0, insertIdx - 1))}.`,
            'success'
        );
    };

    const handleApplyKurikulumRows = (
        generatedRows: GridCell[][],
        insertMode: 'insert_below' | 'replace_sheet',
        colWidths: number[]
    ) => {
        if (!activeTemplate || !canWrite || generatedRows.length === 0) return;
        pushToHistory(activeTemplate);

        if (insertMode === 'replace_sheet') {
            const newColCount = generatedRows[0]?.length || 1;
            const reindexed = generatedRows.map((rowArr, r) =>
                rowArr.map((cell, c) => ({
                    ...cell,
                    row: r,
                    col: c,
                    width: colWidths[c] || cell.width || 100
                }))
            );
            const updated = {
                ...activeTemplate,
                rowCount: reindexed.length,
                colCount: newColCount,
                cells: reindexed
            };
            setActiveTemplate(syncCurrentSheetToTemplate(updated, activeSheetId));
            setSelectedCells([{ r: 0, c: 0 }]);
            showToast(`Berhasil membuat tabel kurikulum (${reindexed.length} baris).`, 'success');
            return;
        }

        // insert_below active cell row (or bottom of sheet)
        const insertAfterR = selectedCells.length > 0
            ? Math.max(...selectedCells.map(s => s.r))
            : activeTemplate.rowCount - 1;
        const insertIdx = Math.min(activeTemplate.rowCount, insertAfterR + 1);
        const genColCount = generatedRows[0]?.length || 1;
        const finalColCount = Math.max(activeTemplate.colCount, genColCount);

        const normalizedExisting = activeTemplate.cells.map((rowArr, r) => {
            const padded = [...rowArr.map(c => ({ ...c }))];
            while (padded.length < finalColCount) {
                const cIdx = padded.length;
                padded.push({
                    ...createEmptyCell(r, cIdx),
                    width: colWidths[cIdx] || 100,
                    height: getRowHeight(r)
                });
            }
            return padded;
        });

        const normalizedGen = generatedRows.map((rowArr, r) => {
            const padded = [...rowArr.map(c => ({ ...c }))];
            while (padded.length < finalColCount) {
                const cIdx = padded.length;
                padded.push({
                    ...createEmptyCell(r, cIdx),
                    width: getColWidth(cIdx),
                    height: padded[0]?.height || 28
                });
            }
            return padded;
        });

        const combined = [
            ...normalizedExisting.slice(0, insertIdx),
            ...normalizedGen,
            ...normalizedExisting.slice(insertIdx)
        ].map((rowArr, r) =>
            rowArr.map((cell, c) => ({
                ...cell,
                row: r,
                col: c,
                width: c < colWidths.length && activeTemplate.rowCount <= 1 ? colWidths[c] : (cell.width || getColWidth(c))
            }))
        );

        const updated = {
            ...activeTemplate,
            rowCount: combined.length,
            colCount: finalColCount,
            cells: combined
        };
        setActiveTemplate(syncCurrentSheetToTemplate(updated, activeSheetId));
        setSelectedCells([{ r: insertIdx, c: 0 }]);
        showToast(`Berhasil menyisipkan ${generatedRows.length} baris mapel kurikulum.`, 'success');
    };

    const mergeCells = () => {
        if (!activeTemplate || selectedCells.length < 2) return;
        pushToHistory(activeTemplate);
        const rMin = Math.min(...selectedCells.map(c => c.r)); const rMax = Math.max(...selectedCells.map(c => c.r));
        const cMin = Math.min(...selectedCells.map(c => c.c)); const cMax = Math.max(...selectedCells.map(c => c.c));
        const newCells = [...activeTemplate.cells];
        const masterCell = newCells[rMin][cMin];
        masterCell.rowSpan = (rMax - rMin) + 1; masterCell.colSpan = (cMax - cMin) + 1; masterCell.hidden = false;
        for(let r=rMin; r<=rMax; r++) for(let c=cMin; c<=cMax; c++) { if (r === rMin && c === cMin) continue; newCells[r][c].hidden = true; newCells[r][c].value = ''; newCells[r][c].key = ''; }
        const updated = { ...activeTemplate, cells: newCells };
        setActiveTemplate(syncCurrentSheetToTemplate(updated, activeSheetId));
        setSelectedCells([{ r: rMin, c: cMin }]);
    };

    const unmergeCells = () => {
        if (!activeTemplate || selectedCells.length === 0) return;
        pushToHistory(activeTemplate);
        const target = selectedCells[0]; const newCells = [...activeTemplate.cells]; const cell = newCells[target.r][target.c];
        if ((cell.rowSpan || 1) === 1 && (cell.colSpan || 1) === 1) return;
        const rMax = target.r + (cell.rowSpan || 1) - 1; const cMax = target.c + (cell.colSpan || 1) - 1;
        cell.rowSpan = 1; cell.colSpan = 1;
        for(let r=target.r; r<=rMax; r++) for(let c=target.c; c<=cMax; c++) newCells[r][c].hidden = false;
        const updated = { ...activeTemplate, cells: newCells };
        setActiveTemplate(syncCurrentSheetToTemplate(updated, activeSheetId));
    };

    const toggleBorder = (side: 'top' | 'right' | 'bottom' | 'left' | 'all' | 'none' | 'outer') => {
        if (!activeTemplate || selectedCells.length === 0) return;
        pushToHistory(activeTemplate);
        const newCells = [...activeTemplate.cells];
        if (side === 'outer') {
            const minR = Math.min(...selectedCells.map(c => c.r));
            const maxR = Math.max(...selectedCells.map(c => c.r));
            const minC = Math.min(...selectedCells.map(c => c.c));
            const maxC = Math.max(...selectedCells.map(c => c.c));

            selectedCells.forEach(({ r, c }) => {
                const cell = newCells[r][c]; if (cell.hidden) return;
                const currentBorders = cell.borders || { top: false, right: false, bottom: false, left: false };
                newCells[r][c] = {
                    ...cell,
                    borders: {
                        top: r === minR ? true : currentBorders.top,
                        bottom: r === maxR ? true : currentBorders.bottom,
                        left: c === minC ? true : currentBorders.left,
                        right: c === maxC ? true : currentBorders.right
                    }
                };
            });
        } else {
            selectedCells.forEach(({ r, c }) => {
                const cell = newCells[r][c]; if (cell.hidden) return;
                const currentBorders = cell.borders || { top: false, right: false, bottom: false, left: false };
                let newBorders = { ...currentBorders };
                if (side === 'all') newBorders = { top: true, right: true, bottom: true, left: true };
                else if (side === 'none') newBorders = { top: false, right: false, bottom: false, left: false };
                else newBorders[side] = !newBorders[side];
                newCells[r][c] = { ...cell, borders: newBorders };
            });
        }
        const updated = { ...activeTemplate, cells: newCells };
        setActiveTemplate(syncCurrentSheetToTemplate(updated, activeSheetId));
    };

    const handleCleanEmptyCellBorders = () => {
        if (!activeTemplate) return;
        pushToHistory(activeTemplate);
        let cleanedCount = 0;
        const newCells = activeTemplate.cells.map(row =>
            row.map(cell => {
                const isBlank = (!cell.value || cell.value.trim() === '') && !cell.key && (!cell.backgroundColor || cell.backgroundColor === 'transparent' || cell.backgroundColor === '#ffffff');
                const hasBorders = cell.borders && (cell.borders.top || cell.borders.bottom || cell.borders.left || cell.borders.right);
                if (isBlank && hasBorders) {
                    cleanedCount++;
                    return {
                        ...cell,
                        borders: { top: false, right: false, bottom: false, left: false }
                    };
                }
                return cell;
            })
        );
        const updated = { ...activeTemplate, cells: newCells };
        setActiveTemplate(syncCurrentSheetToTemplate(updated, activeSheetId));
        showToast(cleanedCount > 0 ? `Berhasil membersihkan garis pada ${cleanedCount} sel kosong!` : 'Semua sel kosong sudah bersih tanpa garis.', 'success');
    };

    const handleCleanTitleAndOuterBorders = () => {
        if (!activeTemplate) return;
        pushToHistory(activeTemplate);
        let cleanedCount = 0;
        const newCells = activeTemplate.cells.map((row, r) =>
            row.map(cell => {
                const val = (cell.value || '').toUpperCase();
                const isTitleRow = r <= 3 && (val.includes('RAPOR') || val.includes('LAPORAN') || val.includes('CAPAIAN') || val.includes('EVALUASI') || val.includes('PONDOK') || val.includes('YAYASAN') || val.includes('SEMESTER'));
                const isIdentitasRow = r <= 4 && (val.includes('NAMA') || val.includes('NIS') || val.includes('KELAS') || val.includes('ROMBEL') || cell.value === '$NAMA' || cell.value === '$NIS' || cell.value === '$ROMBEL');
                const hasBorders = cell.borders && (cell.borders.top || cell.borders.bottom || cell.borders.left || cell.borders.right);
                if ((isTitleRow || isIdentitasRow) && hasBorders) {
                    cleanedCount++;
                    return {
                        ...cell,
                        borders: { top: false, right: false, bottom: false, left: false }
                    };
                }
                return cell;
            })
        );
        const updated = { ...activeTemplate, cells: newCells };
        setActiveTemplate(syncCurrentSheetToTemplate(updated, activeSheetId));
        showToast(cleanedCount > 0 ? `Berhasil menghapus border pada ${cleanedCount} sel judul & biodata!` : 'Sel judul & biodata sudah bersih tanpa border.', 'success');
    };

    const handleClearAllBordersInSheet = () => {
        if (!activeTemplate) return;
        showConfirmation(
            'Hapus Semua Border di Lembar Ini?',
            'Semua garis border pada lembar aktif akan dihapus. Anda dapat menambahkan border kembali secara spesifik hanya pada tabel nilai yang diinginkan.',
            () => {
                pushToHistory(activeTemplate);
                const newCells = activeTemplate.cells.map(row =>
                    row.map(cell => ({
                        ...cell,
                        borders: { top: false, right: false, bottom: false, left: false }
                    }))
                );
                const updated = { ...activeTemplate, cells: newCells };
                setActiveTemplate(syncCurrentSheetToTemplate(updated, activeSheetId));
                showToast('Seluruh border pada lembar aktif berhasil dihapus.', 'success');
            },
            { confirmColor: 'amber' }
        );
    };

    const handleSetAllColWidths = (width: number) => {
        if (!activeTemplate) return;
        pushToHistory(activeTemplate);
        const clamped = Math.max(8, Math.min(1000, width));
        const newCells = activeTemplate.cells.map(row =>
            row.map(cell => ({ ...cell, width: clamped }))
        );
        const updated = { ...activeTemplate, cells: newCells };
        setActiveTemplate(syncCurrentSheetToTemplate(updated, activeSheetId));
        showToast(`Seluruh kolom diatur seragam menjadi ${clamped}px`, 'success');
    };

    const handleSetAllRowHeights = (height: number) => {
        if (!activeTemplate) return;
        pushToHistory(activeTemplate);
        const clamped = Math.max(8, Math.min(500, height));
        const newCells = activeTemplate.cells.map(row =>
            row.map(cell => ({ ...cell, height: clamped }))
        );
        const updated = { ...activeTemplate, cells: newCells };
        setActiveTemplate(syncCurrentSheetToTemplate(updated, activeSheetId));
        showToast(`Seluruh baris diatur seragam menjadi ${clamped}px`, 'success');
    };

    const handleResetDimensions = () => {
        if (!activeTemplate) return;
        showConfirmation(
            'Reset Ukuran Sel ke Standar?',
            'Semua lebar kolom akan dikembalikan ke 100px dan tinggi baris ke 30px agar sefleksibel membuat template dari nol.',
            () => {
                pushToHistory(activeTemplate);
                const newCells = activeTemplate.cells.map(row =>
                    row.map(cell => ({ ...cell, width: 100, height: 30 }))
                );
                const updated = { ...activeTemplate, cells: newCells };
                setActiveTemplate(syncCurrentSheetToTemplate(updated, activeSheetId));
                showToast('Ukuran kolom & baris berhasil di-reset ke standar 100px × 30px.', 'success');
            },
            { confirmColor: 'teal' }
        );
    };

    const handleFitColumnsToPageWidth = () => {
        if (!activeTemplate) return;
        pushToHistory(activeTemplate);
        const colCount = activeTemplate.colCount || 1;
        // Lebar area cetak A4 portrait standar ~720px
        const targetColW = Math.max(8, Math.floor(720 / colCount));
        const newCells = activeTemplate.cells.map(row =>
            row.map(cell => ({ ...cell, width: targetColW }))
        );
        const updated = { ...activeTemplate, cells: newCells };
        setActiveTemplate(syncCurrentSheetToTemplate(updated, activeSheetId));
        showToast(`Seluruh kolom disesuaikan menjadi ${targetColW}px agar pas 1 lembar A4.`, 'success');
    };

    const executeDeleteRows = (rowsToDelete: number[]) => {
        if (!activeTemplate || !canWrite) return;
        pushToHistory(activeTemplate);
        const rowsSet = new Set(rowsToDelete);
        const oldCells: GridCell[][] = activeTemplate.cells.map(row => row.map(c => ({ ...c })));

        // Handle merged cells
        for (let r = 0; r < activeTemplate.rowCount; r++) {
            for (let c = 0; c < activeTemplate.colCount; c++) {
                const cell = oldCells[r][c];
                if (!cell.hidden && cell.rowSpan && cell.rowSpan > 1) {
                    const spanEnd = r + cell.rowSpan - 1;
                    if (rowsSet.has(r)) {
                        // Master cell row is deleted; promote first non-deleted row in span
                        let nextR = -1;
                        for (let k = r + 1; k <= spanEnd; k++) {
                            if (!rowsSet.has(k)) {
                                nextR = k;
                                break;
                            }
                        }
                        if (nextR !== -1) {
                            let remainingSpan = 0;
                            for (let k = nextR; k <= spanEnd; k++) {
                                if (!rowsSet.has(k)) remainingSpan++;
                            }
                            const targetCell = oldCells[nextR][c];
                            targetCell.hidden = false;
                            targetCell.value = cell.value;
                            targetCell.type = cell.type;
                            targetCell.key = cell.key;
                            targetCell.align = cell.align;
                            targetCell.borders = cell.borders;
                            targetCell.colSpan = cell.colSpan;
                            targetCell.rowSpan = remainingSpan;
                        }
                    } else {
                        // Master cell remains; reduce span by count of deleted spanned rows
                        let deletedInRange = 0;
                        for (let k = r + 1; k <= spanEnd; k++) {
                            if (rowsSet.has(k)) deletedInRange++;
                        }
                        if (deletedInRange > 0) {
                            cell.rowSpan = Math.max(1, cell.rowSpan - deletedInRange);
                        }
                    }
                }
            }
        }

        const newGrid = oldCells.filter((_, r) => !rowsSet.has(r));
        const reindexedGrid = newGrid.map((rowArr, newR) => {
            return rowArr.map((cell, newC) => ({
                ...cell,
                row: newR,
                col: newC
            }));
        });

        const newRowCount = reindexedGrid.length;
        const updated = {
            ...activeTemplate,
            rowCount: newRowCount,
            cells: reindexedGrid
        };
        setActiveTemplate(syncCurrentSheetToTemplate(updated, activeSheetId));
        setSelectedCells([]);
        showToast(`Berhasil menghapus ${rowsToDelete.length} baris.`, 'success');
    };

    const handleDeleteRow = (targetRowIdx?: number) => {
        if (!activeTemplate || !canWrite) return;
        if (activeTemplate.rowCount <= 1) {
            showToast('Template harus memiliki minimal 1 baris!', 'error');
            return;
        }

        let rowsToDelete: number[] = [];
        if (typeof targetRowIdx === 'number') {
            rowsToDelete = [targetRowIdx];
        } else if (selectedCells.length > 0) {
            rowsToDelete = Array.from(new Set(selectedCells.map(s => s.r))).sort((a, b) => a - b);
        } else {
            rowsToDelete = [activeTemplate.rowCount - 1];
        }

        if (rowsToDelete.length === 0) return;
        if (rowsToDelete.length >= activeTemplate.rowCount) {
            showToast('Tidak dapat menghapus seluruh baris. Sisakan minimal 1 baris.', 'error');
            return;
        }

        const label = rowsToDelete.map(r => r + 1).join(', ');
        showConfirmation(
            'Hapus Baris?',
            `Apakah Anda yakin ingin menghapus baris ke-${label}? Data pada baris tersebut akan dihapus dari template desain rapor.`,
            () => {
                executeDeleteRows(rowsToDelete);
            },
            { confirmColor: 'red' }
        );
    };

    const executeDeleteCols = (colsToDelete: number[]) => {
        if (!activeTemplate || !canWrite) return;
        pushToHistory(activeTemplate);
        const colsSet = new Set(colsToDelete);
        const oldCells: GridCell[][] = activeTemplate.cells.map(row => row.map(c => ({ ...c })));

        // Handle merged cells
        for (let r = 0; r < activeTemplate.rowCount; r++) {
            for (let c = 0; c < activeTemplate.colCount; c++) {
                const cell = oldCells[r][c];
                if (!cell.hidden && cell.colSpan && cell.colSpan > 1) {
                    const spanEnd = c + cell.colSpan - 1;
                    if (colsSet.has(c)) {
                        // Master cell column is deleted; promote first non-deleted column in span
                        let nextC = -1;
                        for (let k = c + 1; k <= spanEnd; k++) {
                            if (!colsSet.has(k)) {
                                nextC = k;
                                break;
                            }
                        }
                        if (nextC !== -1) {
                            let remainingSpan = 0;
                            for (let k = nextC; k <= spanEnd; k++) {
                                if (!colsSet.has(k)) remainingSpan++;
                            }
                            const targetCell = oldCells[r][nextC];
                            targetCell.hidden = false;
                            targetCell.value = cell.value;
                            targetCell.type = cell.type;
                            targetCell.key = cell.key;
                            targetCell.align = cell.align;
                            targetCell.borders = cell.borders;
                            targetCell.rowSpan = cell.rowSpan;
                            targetCell.colSpan = remainingSpan;
                        }
                    } else {
                        // Master cell remains; reduce span by count of deleted spanned columns
                        let deletedInRange = 0;
                        for (let k = c + 1; k <= spanEnd; k++) {
                            if (colsSet.has(k)) deletedInRange++;
                        }
                        if (deletedInRange > 0) {
                            cell.colSpan = Math.max(1, cell.colSpan - deletedInRange);
                        }
                    }
                }
            }
        }

        const newGrid = oldCells.map(rowArr => rowArr.filter((_, c) => !colsSet.has(c)));
        const reindexedGrid = newGrid.map((rowArr, newR) => {
            return rowArr.map((cell, newC) => ({
                ...cell,
                row: newR,
                col: newC
            }));
        });

        const newColCount = reindexedGrid[0]?.length || 0;
        const updated = {
            ...activeTemplate,
            colCount: newColCount,
            cells: reindexedGrid
        };
        setActiveTemplate(syncCurrentSheetToTemplate(updated, activeSheetId));
        setSelectedCells([]);
        showToast(`Berhasil menghapus ${colsToDelete.length} kolom.`, 'success');
    };

    const handleDeleteCol = (targetColIdx?: number) => {
        if (!activeTemplate || !canWrite) return;
        if (activeTemplate.colCount <= 1) {
            showToast('Template harus memiliki minimal 1 kolom!', 'error');
            return;
        }

        let colsToDelete: number[] = [];
        if (typeof targetColIdx === 'number') {
            colsToDelete = [targetColIdx];
        } else if (selectedCells.length > 0) {
            colsToDelete = Array.from(new Set(selectedCells.map(s => s.c))).sort((a, b) => a - b);
        } else {
            colsToDelete = [activeTemplate.colCount - 1];
        }

        if (colsToDelete.length === 0) return;
        if (colsToDelete.length >= activeTemplate.colCount) {
            showToast('Tidak dapat menghapus seluruh kolom. Sisakan minimal 1 kolom.', 'error');
            return;
        }

        const label = colsToDelete.map(c => getExcelColName(c)).join(', ');
        showConfirmation(
            'Hapus Kolom?',
            `Apakah Anda yakin ingin menghapus kolom ${label}? Data pada kolom tersebut akan dihapus dari template desain rapor.`,
            () => {
                executeDeleteCols(colsToDelete);
            },
            { confirmColor: 'red' }
        );
    };

    const handleUpdateColWidth = (cIdx: number, newWidth: number) => {
        if (!activeTemplate) return;
        const clampedWidth = Math.max(8, Math.min(1000, Math.round(newWidth)));
        const newCells = activeTemplate.cells.map(row =>
            row.map((cell, c) => c === cIdx ? { ...cell, width: clampedWidth } : cell)
        );
        const updated = { ...activeTemplate, cells: newCells };
        setActiveTemplate(syncCurrentSheetToTemplate(updated, activeSheetId));
    };

    const handleUpdateRowHeight = (rIdx: number, newHeight: number) => {
        if (!activeTemplate) return;
        const clampedHeight = Math.max(8, Math.min(600, Math.round(newHeight)));
        const newCells = activeTemplate.cells.map((row, r) =>
            r === rIdx ? row.map(cell => ({ ...cell, height: clampedHeight })) : row
        );
        const updated = { ...activeTemplate, cells: newCells };
        setActiveTemplate(syncCurrentSheetToTemplate(updated, activeSheetId));
    };

    const handleStartColResize = (e: React.MouseEvent, cIdx: number) => {
        e.preventDefault();
        e.stopPropagation();
        const startW = getColWidth(cIdx);
        setResizingCol({
            colIdx: cIdx,
            startX: e.clientX,
            startWidth: startW,
            currentWidth: startW
        });
    };

    const handleStartColResizeTouch = (e: React.TouchEvent, cIdx: number) => {
        if (e.touches.length !== 1) return;
        e.stopPropagation();
        const touch = e.touches[0];
        const startW = getColWidth(cIdx);
        setResizingCol({
            colIdx: cIdx,
            startX: touch.clientX,
            startWidth: startW,
            currentWidth: startW
        });
    };

    const handleStartRowResize = (e: React.MouseEvent, rIdx: number) => {
        e.preventDefault();
        e.stopPropagation();
        const startH = getRowHeight(rIdx);
        setResizingRow({
            rowIdx: rIdx,
            startY: e.clientY,
            startHeight: startH,
            currentHeight: startH
        });
    };

    const handleStartRowResizeTouch = (e: React.TouchEvent, rIdx: number) => {
        if (e.touches.length !== 1) return;
        e.stopPropagation();
        const touch = e.touches[0];
        const startH = getRowHeight(rIdx);
        setResizingRow({
            rowIdx: rIdx,
            startY: touch.clientY,
            startHeight: startH,
            currentHeight: startH
        });
    };

    const handleSelectColumn = (cIdx: number) => {
        if (!activeTemplate) return;
        const colCells: { r: number; c: number }[] = [];
        for (let r = 0; r < activeTemplate.rowCount; r++) {
            colCells.push({ r, c: cIdx });
        }
        setSelectedCells(colCells);
    };

    const handleSelectRow = (rIdx: number) => {
        if (!activeTemplate) return;
        const rowCells: { r: number; c: number }[] = [];
        for (let c = 0; c < activeTemplate.colCount; c++) {
            rowCells.push({ r: rIdx, c });
        }
        setSelectedCells(rowCells);
    };

    const handleSelectAllCells = () => {
        if (!activeTemplate) return;
        const all: { r: number; c: number }[] = [];
        for (let r = 0; r < activeTemplate.rowCount; r++) {
            for (let c = 0; c < activeTemplate.colCount; c++) {
                all.push({ r, c });
            }
        }
        setSelectedCells(all);
    };

    // Global mouse & touch event listeners during live column resize
    React.useEffect(() => {
        if (!resizingCol) return;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        const onMouseMove = (e: MouseEvent) => {
            const delta = (e.clientX - resizingCol.startX) / zoomScale;
            const newW = Math.max(8, Math.round(resizingCol.startWidth + delta));
            setResizingCol(prev => prev ? { ...prev, currentWidth: newW } : null);
        };
        const onTouchMove = (e: TouchEvent) => {
            if (e.touches.length !== 1) return;
            const delta = (e.touches[0].clientX - resizingCol.startX) / zoomScale;
            const newW = Math.max(8, Math.round(resizingCol.startWidth + delta));
            setResizingCol(prev => prev ? { ...prev, currentWidth: newW } : null);
        };
        const onEnd = () => {
            if (resizingCol) {
                handleUpdateColWidth(resizingCol.colIdx, resizingCol.currentWidth);
                setResizingCol(null);
            }
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onEnd);
        window.addEventListener('touchmove', onTouchMove, { passive: true });
        window.addEventListener('touchend', onEnd);
        window.addEventListener('touchcancel', onEnd);
        return () => {
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onEnd);
            window.removeEventListener('touchmove', onTouchMove);
            window.removeEventListener('touchend', onEnd);
            window.removeEventListener('touchcancel', onEnd);
        };
    }, [resizingCol, zoomScale, activeTemplate, activeSheetId]);

    // Global mouse & touch event listeners during live row resize
    React.useEffect(() => {
        if (!resizingRow) return;
        document.body.style.cursor = 'row-resize';
        document.body.style.userSelect = 'none';
        const onMouseMove = (e: MouseEvent) => {
            const delta = (e.clientY - resizingRow.startY) / zoomScale;
            const newH = Math.max(8, Math.round(resizingRow.startHeight + delta));
            setResizingRow(prev => prev ? { ...prev, currentHeight: newH } : null);
        };
        const onTouchMove = (e: TouchEvent) => {
            if (e.touches.length !== 1) return;
            const delta = (e.touches[0].clientY - resizingRow.startY) / zoomScale;
            const newH = Math.max(8, Math.round(resizingRow.startHeight + delta));
            setResizingRow(prev => prev ? { ...prev, currentHeight: newH } : null);
        };
        const onEnd = () => {
            if (resizingRow) {
                handleUpdateRowHeight(resizingRow.rowIdx, resizingRow.currentHeight);
                setResizingRow(null);
            }
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onEnd);
        window.addEventListener('touchmove', onTouchMove, { passive: true });
        window.addEventListener('touchend', onEnd);
        window.addEventListener('touchcancel', onEnd);
        return () => {
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onEnd);
            window.removeEventListener('touchmove', onTouchMove);
            window.removeEventListener('touchend', onEnd);
            window.removeEventListener('touchcancel', onEnd);
        };
    }, [resizingRow, zoomScale, activeTemplate, activeSheetId]);

    const updateActiveCell = (updates: Partial<GridCell>) => {
        if (!activeTemplate || !activeCellData) return;
        pushToHistory(activeTemplate);
        const newCells = activeTemplate.cells.map(r => [...r]);
        const { row, col } = activeCellData;
        newCells[row][col] = { ...newCells[row][col], ...updates };
        if (updates.key) newCells[row][col].key = updates.key.toUpperCase().replace(/[^A-Z0-9_]/g, '');
        if (typeof updates.width === 'number') {
            for (let r = 0; r < newCells.length; r++) {
                if (newCells[r][col]) newCells[r][col] = { ...newCells[r][col], width: updates.width };
            }
        }
        if (typeof updates.height === 'number') {
            for (let c = 0; c < newCells[row].length; c++) {
                if (newCells[row][c]) newCells[row][c] = { ...newCells[row][c], height: updates.height };
            }
        }
        const updated = { ...activeTemplate, cells: newCells };
        setActiveTemplate(syncCurrentSheetToTemplate(updated, activeSheetId));
    };

    const curSheet = useMemo(() => {
        if (!activeSheets.length) return null;
        return activeSheets.find(s => s.id === (activeSheetId || activeTemplate?.activeSheetId)) || activeSheets[0];
    }, [activeSheets, activeSheetId, activeTemplate]);

    const curPageSetup = useMemo(
        () =>
            normalizeRaporPageSetup({
                paperSize: curSheet?.paperSize || activeTemplate?.paperSize,
                orientation: curSheet?.orientation || activeTemplate?.orientation,
                marginMode: curSheet?.marginMode || activeTemplate?.marginMode,
                fitToPage: curSheet?.fitToPage ?? activeTemplate?.fitToPage,
                fitWidthPages: curSheet?.fitWidthPages ?? activeTemplate?.fitWidthPages,
                fitHeightPages: curSheet?.fitHeightPages ?? activeTemplate?.fitHeightPages,
                printScale: curSheet?.printScale ?? activeTemplate?.printScale,
                repeatHeaderRows: curSheet?.repeatHeaderRows ?? activeTemplate?.repeatHeaderRows
            }),
        [curSheet, activeTemplate]
    );

    const curPaperMetrics = useMemo(
        () => getRaporPaperMetrics(curPageSetup.paperSize, curPageSetup.orientation, curPageSetup.marginMode),
        [curPageSetup.paperSize, curPageSetup.orientation, curPageSetup.marginMode]
    );

    const paperFormat = curPageSetup.paperSize;
    const pageBreakThresholdPx = curPaperMetrics.availableH;

    const rowHeightsList = useMemo(() => {
        if (!activeTemplate) return [];
        return Array.from({ length: activeTemplate.rowCount }).map((_, rIdx) => getRowHeight(rIdx));
    }, [activeTemplate]);

    const colWidthsList = useMemo(() => {
        if (!activeTemplate) return [];
        return Array.from({ length: activeTemplate.colCount }).map((_, cIdx) => getColWidth(cIdx));
    }, [activeTemplate]);

    const totalDesignHeight = useMemo(() => {
        return rowHeightsList.reduce((acc, h) => acc + h, 0);
    }, [rowHeightsList]);

    const canvasPaginatedLayout = useMemo(() => {
        if (!activeTemplate) return null;
        const estHeaderH = (curSheet?.customTitle || curSheet?.showJudul) ? 50 : 0;
        return computePaginatedRaporLayout({
            cells: activeTemplate.cells,
            colWidths: colWidthsList,
            rowHeights: rowHeightsList,
            headerHeight: estHeaderH,
            paperMetrics: curPaperMetrics,
            pageSetup: curPageSetup
        });
    }, [activeTemplate, colWidthsList, rowHeightsList, curSheet?.customTitle, curSheet?.showJudul, curPaperMetrics, curPageSetup]);

    const pageBreakRowIndices = useMemo(() => {
        if (!canvasPaginatedLayout) return [];
        if (canvasPaginatedLayout.pages.length > 1) {
            const seen = new Set<number>();
            const breaks: number[] = [];
            for (const pg of canvasPaginatedLayout.pages) {
                if (pg.vIndex > 0 && pg.startRow > 0 && !seen.has(pg.startRow)) {
                    seen.add(pg.startRow);
                    breaks.push(pg.startRow);
                }
            }
            return breaks;
        }
        // In Fit 1 Page mode, still show natural 100% height reference line if total height exceeds 1 sheet
        const breaks: number[] = [];
        let cum = 0;
        let page = 1;
        rowHeightsList.forEach((h, r) => {
            cum += h;
            if (cum > pageBreakThresholdPx * page && breaks.length < page) {
                breaks.push(r);
                page++;
            }
        });
        return breaks;
    }, [canvasPaginatedLayout, rowHeightsList, pageBreakThresholdPx]);

    const updateActiveSheet = (updates: Partial<RaporSheet>) => {
        if (!activeTemplate) return;
        const targetId = activeSheetId || activeTemplate.activeSheetId || activeTemplate.sheets?.[0]?.id || '';
        const sheets = activeSheets.map(sh => {
            if (sh.id === targetId) {
                return { ...sh, ...updates };
            }
            return sh;
        });
        const updatedTpl: RaporTemplate = {
            ...activeTemplate,
            sheets,
            customTitle: updates.customTitle !== undefined ? updates.customTitle : activeTemplate.customTitle,
            showJudul: updates.showJudul !== undefined ? updates.showJudul : activeTemplate.showJudul,
            showBiodataHeader: updates.showBiodataHeader !== undefined ? updates.showBiodataHeader : activeTemplate.showBiodataHeader,
            fitToPage: updates.fitToPage !== undefined ? updates.fitToPage : activeTemplate.fitToPage,
            fitWidthPages: updates.fitWidthPages !== undefined ? updates.fitWidthPages : activeTemplate.fitWidthPages,
            fitHeightPages: updates.fitHeightPages !== undefined ? updates.fitHeightPages : activeTemplate.fitHeightPages,
            repeatHeaderRows: updates.repeatHeaderRows !== undefined ? updates.repeatHeaderRows : activeTemplate.repeatHeaderRows,
            paperSize: updates.paperSize !== undefined ? updates.paperSize : activeTemplate.paperSize,
            orientation: updates.orientation !== undefined ? updates.orientation : activeTemplate.orientation,
            printScale: updates.printScale !== undefined ? updates.printScale : activeTemplate.printScale,
            marginMode: updates.marginMode !== undefined ? updates.marginMode : activeTemplate.marginMode
        };
        setActiveTemplate(updatedTpl);
    };

    const applyActiveSheetPageSetupPatch = (patch: Partial<RaporPageSetupInput>) => {
        const next = normalizeRaporPageSetup({
            ...curPageSetup,
            ...patch
        });
        updateActiveSheet({
            paperSize: next.paperSize,
            orientation: next.orientation,
            marginMode: next.marginMode,
            fitToPage: next.fitToPage,
            fitWidthPages: next.fitWidthPages,
            fitHeightPages: next.fitHeightPages,
            printScale: next.printScale,
            repeatHeaderRows: next.repeatHeaderRows
        });
    };

    const getTemplateSimulatedHierarchy = () => {
        const rombels = settings.rombel || [];
        const kelases = settings.kelas || [];
        const jenjangs = settings.jenjang || [];

        let simRombel = activeTemplate?.rombelId ? rombels.find(r => Number(r.id) === Number(activeTemplate.rombelId)) : undefined;
        let simKelas = activeTemplate?.kelasId ? kelases.find(k => Number(k.id) === Number(activeTemplate.kelasId)) : undefined;
        let simJenjang = activeTemplate?.jenjangId ? jenjangs.find(j => Number(j.id) === Number(activeTemplate.jenjangId)) : undefined;

        if (simRombel && !simKelas) {
            simKelas = kelases.find(k => Number(k.id) === Number(simRombel!.kelasId));
        }
        if (simKelas && !simJenjang) {
            simJenjang = jenjangs.find(j => Number(j.id) === Number(simKelas!.jenjangId));
        }
        if (!simJenjang) {
            simJenjang = jenjangs.find(j => j.mudirId) || jenjangs[0];
        }
        if (!simKelas && simJenjang) {
            simKelas = kelases.find(k => Number(k.jenjangId) === Number(simJenjang!.id)) || kelases[0];
        }
        if (!simRombel) {
            if (simKelas) {
                simRombel = rombels.find(r => Number(r.kelasId) === Number(simKelas!.id) && r.waliKelasId)
                    || rombels.find(r => Number(r.kelasId) === Number(simKelas!.id));
            }
            if (!simRombel) {
                simRombel = rombels.find(r => r.waliKelasId) || rombels[0];
            }
        }
        return { simRombel, simKelas, simJenjang };
    };

    const getSimulatedValue = (cell: GridCell) => {
        const formatText = (str: string) => applyCellTextTransform(formatCellNumericDisplay(str, cell.decimalPlaces), cell.textTransform);
        const val = cell.value?.trim() || '';
        const decTag = cell.decimalPlaces !== undefined ? (cell.decimalPlaces === 0 ? ' (0)' : ` (.${'0'.repeat(cell.decimalPlaces)})`) : '';

        if ((cell.type === 'data' || cell.type === 'label') && isMediaTag(val)) {
            const { simRombel, simKelas, simJenjang } = getTemplateSimulatedHierarchy();
            const simulatedContext = {
                template: activeTemplate,
                settings,
                digitalAssets,
                santri: {
                    id: 1,
                    namaLengkap: 'Ahmad Fauzan',
                    nis: '202401001',
                    nisn: '0081234567',
                    rombelId: simRombel?.id || 1,
                    kelasId: simKelas?.id || 1,
                    jenjangId: simJenjang?.id || 1,
                    status: 'Aktif'
                } as any,
                targetDate: new Date()
            };
            const mediaVisual = resolveCellMediaVisual(cell, simulatedContext);
            if (mediaVisual) {
                return <RaporSignatureStampMedia visual={mediaVisual} mode="canvas" />;
            }
            return <span className="text-rose-500 italic text-[10px] font-mono bg-rose-50 px-1 rounded border border-rose-100">[{val}]</span>;
        }

        if (cell.type === 'label') return formatText(cell.value || '');
        if (cell.type === 'input') {
            const cls = classifyRaporInputField({
                key: cell.key || 'NILAI',
                type: cell.type,
                inputMode: cell.inputMode,
                mataPelajaran: settings.mataPelajaran || [],
                jenjangId: activeTemplate?.jenjangId
            });
            if (cls.isLongText) {
                return <span className="text-teal-700 italic text-[10px] font-mono bg-teal-50 px-1 rounded border border-teal-200">[Catatan: {cell.key || 'TEKS'}]</span>;
            }
            return <span className="text-blue-500 italic text-[10px] font-mono bg-blue-50 px-1 rounded border border-blue-100">[Input: {cell.key || 'NILAI'}{decTag}]</span>;
        }
        if (cell.type === 'formula') return <span className="text-yellow-700 italic text-[10px] font-mono bg-yellow-50 px-1 rounded border border-yellow-100">{cell.value || '[Rumus]'}{decTag}</span>;
        if (cell.type === 'dropdown') {
            const firstOpt = cell.options && cell.options.length > 0 ? cell.options[0] : (cell.key || 'Pilihan');
            return <span className="text-orange-700 italic text-[10px] font-mono bg-orange-50 px-1 rounded border border-orange-200">[▼ {formatText(firstOpt)}]</span>;
        }
        if (cell.type === 'data') {
            // Live values from active settings for Tahun Ajaran, Semester, Pejabat & Identitas Pondok
            const upperVal = val.toUpperCase();
            const ay = resolveAcademicYearLabels(settings);
            const { simRombel, simKelas, simJenjang } = getTemplateSimulatedHierarchy();

            if (upperVal === '$TAHUN_AJAR' || upperVal === '$TAHUN_AJARAN' || upperVal === '$TAPEL' || upperVal === '$TAHUN_PELAJARAN') {
                return formatText(ay.otomatis);
            }
            if (upperVal === '$TAHUN_AJAR_MASEHI' || upperVal === '$TAHUN_AJARAN_MASEHI' || upperVal === '$TAPEL_MASEHI') {
                return formatText(ay.masehi);
            }
            if (upperVal === '$TAHUN_AJAR_HIJRIAH' || upperVal === '$TAHUN_AJARAN_HIJRIAH' || upperVal === '$TAHUN_AJAR_HIJRIYAH' || upperVal === '$TAPEL_HIJRIAH') {
                return formatText(ay.hijriah);
            }
            if (upperVal === '$TAHUN_AJAR_GABUNGAN' || upperVal === '$TAHUN_AJARAN_GABUNGAN' || upperVal === '$TAHUN_AJAR_LENGKAP' || upperVal === '$TAPEL_GABUNGAN') {
                return formatText(ay.gabungan);
            }
            if (upperVal === '$SEMESTER') {
                return formatText(ay.semester);
            }
            if (upperVal === '$SEMESTER_ANGKA') {
                return formatText(ay.semester === 'Genap' ? '2' : '1');
            }
            if (
                upperVal.includes('TITIMANGSA') ||
                upperVal.includes('TANGGAL_RAPOR') ||
                upperVal.includes('TANGGAL_DOKUMEN') ||
                upperVal.includes('TANGGAL_MASEHI') ||
                upperVal.includes('TANGGAL_HIJRIAH') ||
                upperVal.includes('KOTA_TANGGAL') ||
                upperVal === '$TEMPAT_RAPOR' ||
                upperVal === '$KOTA_PONPES'
            ) {
                const simDate = parseLocalDateSafe(settings.tanggalRaporDefault) || new Date();
                const kotaSim = resolveTempatRapor(settings, 'Pesantren');
                const masehiSim = formatDate(simDate);
                const hijriSimInfo = getHijriDate(simDate, settings.hijriAdjustment || 0);
                const hijriSim = settings.manualHijriRaporDefault?.trim()
                    ? ensureHijriSuffix(settings.manualHijriRaporDefault)
                    : (hijriSimInfo.full ? `${hijriSimInfo.full} H` : '');
                const gabunganSim = hijriSim ? `${hijriSim} / ${masehiSim} M` : masehiSim;
                const docDateSim = formatTanggalDokumen(simDate, {
                    formatMode: settings.formatTanggalRaporDefault || 'masehi',
                    hijriAdjustment: settings.hijriAdjustment || 0,
                    manualHijri: settings.manualHijriRaporDefault
                });

                if (upperVal === '$TEMPAT_RAPOR' || upperVal === '$KOTA_PONPES') return formatText(kotaSim);
                if (upperVal === '$TITIMANGSA' || upperVal === '$KOTA_TANGGAL_DOKUMEN') return formatText(`${kotaSim}, ${docDateSim}`);
                if (upperVal === '$TITIMANGSA_GABUNGAN' || upperVal === '$KOTA_TANGGAL_HIJRIAH_MASEHI') return formatText(`${kotaSim}, ${gabunganSim}`);
                if (upperVal === '$TITIMANGSA_MASEHI' || upperVal === '$KOTA_TANGGAL') return formatText(`${kotaSim}, ${masehiSim}`);
                if (upperVal === '$TITIMANGSA_HIJRIAH' || upperVal === '$KOTA_TANGGAL_HIJRIAH') return formatText(`${kotaSim}, ${hijriSim || masehiSim}`);
                if (upperVal === '$TANGGAL_RAPOR' || upperVal === '$TANGGAL_DOKUMEN') return formatText(docDateSim);
                if (upperVal === '$TANGGAL_RAPOR_GABUNGAN' || upperVal === '$TANGGAL_HIJRIAH_MASEHI') return formatText(gabunganSim);
                if (upperVal === '$TANGGAL_RAPOR_MASEHI' || upperVal === '$TANGGAL_MASEHI') return formatText(masehiSim);
                if (upperVal === '$TANGGAL_RAPOR_HIJRIAH' || upperVal === '$TANGGAL_HIJRIAH') return formatText(hijriSim || masehiSim);
            }
            if (upperVal === '$NAMA_PONPES' && settings.namaPonpes) {
                return formatText(settings.namaPonpes);
            }
            if (upperVal === '$NAMA_YAYASAN' && settings.namaYayasan) {
                return formatText(settings.namaYayasan);
            }
            if ((upperVal === '$JENJANG' || upperVal === '$MARHALAH') && simJenjang?.nama) {
                return formatText(simJenjang.nama);
            }
            if (upperVal === '$KELAS' && simKelas?.nama) {
                return formatText(simKelas.nama);
            }
            if (upperVal === '$ROMBEL' && simRombel?.nama) {
                return formatText(simRombel.nama);
            }
            if (upperVal === '$NAMA_WALI_KELAS' || upperVal === '$WALI_KELAS' || upperVal === '$WALIKELAS') {
                const wali = resolveWaliKelasTeacher(simRombel, settings);
                if (wali?.nama) return formatText(wali.nama);
            }
            if (upperVal === '$NIP_WALI_KELAS' || upperVal === '$NIY_WALI_KELAS') {
                const wali = resolveWaliKelasTeacher(simRombel, settings);
                const nip = formatTeacherNip(wali);
                if (nip !== '-') return formatText(nip);
            }
            if (
                upperVal === '$NAMA_MUDIR_MARHALAH' ||
                upperVal === '$MUDIR_MARHALAH' ||
                upperVal === '$KEPALA_MARHALAH' ||
                upperVal === '$NAMA_KEPALA_MARHALAH' ||
                upperVal === '$MUDIR_JENJANG' ||
                upperVal === '$NAMA_MUDIR_JENJANG'
            ) {
                const mm = resolveMudirMarhalahTeacher(simJenjang, settings);
                if (mm?.nama) return formatText(mm.nama);
            }
            if (upperVal === '$NIP_MUDIR_MARHALAH' || upperVal === '$NIY_MUDIR_MARHALAH' || upperVal === '$NIP_KEPALA_MARHALAH') {
                const mm = resolveMudirMarhalahTeacher(simJenjang, settings);
                const nip = formatTeacherNip(mm);
                if (nip !== '-') return formatText(nip);
            }
            if (upperVal === '$NAMA_MUDIR' || upperVal === '$NAMA_PIMPINAN' || upperVal === '$NAMA_KEPALA_SEKOLAH' || upperVal === '$MUDIR') {
                const mudirInfo = resolveMudirAamInfo(settings);
                if (mudirInfo.nama && mudirInfo.nama !== 'K.H. Pimpinan Pesantren') return formatText(mudirInfo.nama);
            }
            if (upperVal === '$NIP_MUDIR' || upperVal === '$NIY_MUDIR') {
                const mudirInfo = resolveMudirAamInfo(settings);
                if (mudirInfo.nip !== '-') return formatText(mudirInfo.nip);
            }
            const pengampuSimMatch = upperVal.match(/^\$(NAMA|NIP|NIY|JABATAN|LABEL)_(?:PENGAMPU|GURU_KHUSUS|PENGUJI)(?:_(\d+))?$/);
            if (pengampuSimMatch) {
                const fieldType = pengampuSimMatch[1];
                const slotNum = pengampuSimMatch[2] ? parseInt(pengampuSimMatch[2], 10) : 1;
                const sigInfo = resolveCustomSignatoryInfo(
                    slotNum,
                    { settings, template: activeTemplate, santri: null },
                    simRombel
                );
                if (fieldType === 'JABATAN' || fieldType === 'LABEL') {
                    return formatText(sigInfo.jabatan);
                }
                if (fieldType === 'NAMA') {
                    return formatText(sigInfo.nama !== '-' ? sigInfo.nama : `[Guru ${sigInfo.jabatan}]`);
                }
                return formatText(sigInfo.nip !== '-' ? sigInfo.nip : '-');
            }
            if (upperVal === '$NAMA_MUHAFFIZH' || upperVal === '$MUHAFFIZH' || upperVal === '$MUSYRIF_HALAQAH') {
                const mh = resolveMuhaffizhTeacher(null, settings);
                if (mh?.nama) return formatText(mh.nama);
            }
            if (upperVal === '$NIP_MUHAFFIZH' || upperVal === '$NIY_MUHAFFIZH') {
                const mh = resolveMuhaffizhTeacher(null, settings);
                const nip = formatTeacherNip(mh);
                if (nip !== '-') return formatText(nip);
            }
            const specificTeacherSimMatch = upperVal.match(/^\$(NAMA|NIP|NIY)_(?:PENGAJAR|GURU)[:_](\d+)$/);
            if (specificTeacherSimMatch) {
                const tId = parseInt(specificTeacherSimMatch[2], 10);
                const tp = settings.tenagaPengajar?.find(t => Number(t.id) === tId);
                if (tp) {
                    return formatText(specificTeacherSimMatch[1] === 'NAMA' ? tp.nama : formatTeacherNip(tp));
                }
            }

            // Live KKM preview from Data Master Mata Pelajaran ($KKM, $MAPEL_KKM, $KKM_STANDAR, $KKM_<MAPEL>)
            const activeJenjangForKkm = simJenjang?.id || activeTemplate?.jenjangId;
            if (upperVal === '$KKM' || upperVal === '$MAPEL_KKM' || upperVal === '$NILAI_KKM' || upperVal === '$KBM') {
                const rowInspect = inspectSheetRowKkm({
                    sheetCells: activeTemplate?.cells,
                    row: cell.row,
                    col: cell.col,
                    mataPelajaran: settings.mataPelajaran || [],
                    preferredJenjangId: activeJenjangForKkm
                });
                const previewKkm = rowInspect.kkmValue !== null ? rowInspect.kkmValue : rowInspect.defaultKkm;
                return formatText(String(previewKkm));
            }
            if (
                upperVal === '$KKM_STANDAR' ||
                upperVal === '$STANDAR_KKM' ||
                upperVal === '$KKM_DEFAULT' ||
                upperVal === '$KKM_UMUM' ||
                upperVal === '$KKM_MARHALAH' ||
                upperVal === '$KKM_JENJANG'
            ) {
                const stdKkm = computeDefaultKkmForPool(settings.mataPelajaran || [], activeJenjangForKkm);
                return formatText(String(stdKkm));
            }
            if (upperVal.startsWith('$KKM_')) {
                const matchedMp = findMapelInMasterPool(upperVal, settings.mataPelajaran || [], activeJenjangForKkm);
                const fallbackStd = computeDefaultKkmForPool(settings.mataPelajaran || [], activeJenjangForKkm);
                return formatText(String(matchedMp?.kkm ?? fallbackStd));
            }

            // Find matching example in dynamic tag list
            for (const cat of DYNAMIC_TAG_CATEGORIES) {
                const found = cat.tags.find(t => t.tag === upperVal);
                if (found) return formatText(found.example);
            }
            if (upperVal.includes('$MAPEL')) return formatText('Pendidikan Agama Islam');
            return formatText(val || '[Data]');
        }
        return formatText(cell.value || '');
    };

    const handleToolbarWheel = (e: React.WheelEvent<HTMLDivElement>) => {
        const el = e.currentTarget;
        if (el.scrollWidth > el.clientWidth && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
            el.scrollLeft += e.deltaY;
        }
    };

    if (!isEditing) {
        return (
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h3 className="font-bold text-gray-700">Daftar Template Rapor</h3>
                    {canWrite && (
                        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 no-scrollbar">
                            <input type="file" ref={fileInputRef} onChange={handleImportExcel} accept=".xlsx, .xls, .ods, .csv" className="hidden" />
                            <input type="file" ref={jsonInputRef} onChange={handleImportTemplateJson} accept=".json,application/json" className="hidden" />
                            <div className="flex gap-2 flex-grow sm:flex-none">
                                <button onClick={() => setIsExcelPasteModalOpen(true)} className="flex-1 sm:flex-none whitespace-nowrap bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 px-3 py-2.5 rounded-xl text-[10px] font-black flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-2xs" title="Salin tabel dari Excel lalu tempel langsung di sini">
                                    <i className="bi bi-clipboard2-data-fill text-emerald-600 text-sm"></i> <span>Paste Excel</span>
                                </button>
                                <button onClick={() => fileInputRef.current?.click()} className="flex-1 sm:flex-none whitespace-nowrap bg-indigo-50 text-indigo-700 border border-indigo-100 hover:bg-indigo-100 px-3 py-2.5 rounded-xl text-[10px] font-black flex items-center justify-center gap-1.5 transition-all active:scale-95" title="Import dari file Excel (.xlsx, .xls, .ods, .csv)">
                                    <i className="bi bi-file-earmark-spreadsheet text-base"></i> <span>Import Excel</span>
                                </button>
                                <button onClick={() => jsonInputRef.current?.click()} className="flex-1 sm:flex-none whitespace-nowrap bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 px-3 py-2.5 rounded-xl text-[10px] font-black flex items-center justify-center gap-1.5 transition-all active:scale-95" title="Import file desain template rapor (.json)">
                                    <i className="bi bi-filetype-json text-base text-amber-600"></i> <span>Import JSON</span>
                                </button>
                                <button onClick={handleCreateSampleTemplate} className="flex-1 sm:flex-none whitespace-nowrap bg-purple-50 text-purple-700 border border-purple-100 hover:bg-purple-100 px-3 py-2.5 rounded-xl text-[10px] font-black flex items-center justify-center gap-1.5 transition-all active:scale-95">
                                    <i className="bi bi-magic text-base"></i> <span>Demo</span>
                                </button>
                                <button onClick={handleCreateTemplate} className="flex-1 sm:flex-none whitespace-nowrap bg-teal-600 text-white px-4 py-2.5 rounded-xl shadow-lg shadow-teal-100 hover:bg-teal-700 text-xs font-black flex items-center justify-center gap-2 transition-all active:scale-95">
                                    <i className="bi bi-plus-lg text-sm"></i> <span>Baru</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {templates.map(tpl => (
                        <div key={tpl.id} className="border p-4 rounded-lg bg-white shadow-sm hover:shadow-md transition">
                            <div className="font-bold text-teal-800 text-lg mb-1">{tpl.name}</div>
                            <div className="flex flex-wrap gap-2 mb-2">
                                <div className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">Dimensi: {tpl.rowCount}x{tpl.colCount}</div>
                                <div className="text-xs text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded font-bold flex items-center gap-1">
                                    <i className="bi bi-collection"></i> {(tpl.sheets && tpl.sheets.length > 0) ? tpl.sheets.length : 1} Lembar
                                </div>
                                {tpl.jenjangId && (
                                    <div className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 font-medium">
                                        <i className="bi bi-lock-fill mr-1"></i>
                                        {settings.jenjang.find(j => j.id === tpl.jenjangId)?.nama || 'Marhalah Terhapus'}
                                        {tpl.kelasId && ` > ${settings.kelas.find(k => k.id === tpl.kelasId)?.nama || 'Kelas Terhapus'}`}
                                        {tpl.rombelId && ` > ${settings.rombel.find(r => r.id === tpl.rombelId)?.nama || 'Rombel Terhapus'}`}
                                    </div>
                                )}
                            </div>
                            <div className="text-xs text-gray-400 mt-2">{new Date(tpl.lastModified).toLocaleDateString()}</div>
                            <div className="mt-3 flex flex-wrap gap-1.5 justify-end">
                                <button onClick={() => handleExportTemplateJson(tpl)} className="bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded text-xs hover:bg-amber-100 flex items-center gap-1" title="Ekspor Template ke File JSON"><i className="bi bi-download"></i> JSON</button>
                                {canWrite && (
                                    <>
                                        <button onClick={() => handleDuplicateTemplate(tpl.id)} className="bg-green-50 text-green-600 px-2.5 py-1 rounded text-xs hover:bg-green-100 flex items-center gap-1" title="Duplikasi Template"><i className="bi bi-copy"></i> Copy</button>
                                        <button onClick={() => handleEditTemplate(tpl)} className="bg-blue-50 text-blue-600 px-3 py-1 rounded text-xs hover:bg-blue-100 font-semibold">Edit</button>
                                        <button onClick={() => handleDeleteTemplate(tpl.id)} className="bg-red-50 text-red-600 px-2.5 py-1 rounded text-xs hover:bg-red-100">Hapus</button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                    {templates.length === 0 && <p className="col-span-3 text-center text-gray-500 italic py-10 border rounded bg-gray-50">Belum ada template. Silakan buat baru atau import dari Excel.</p>}
                </div>
                
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800 mt-4">
                    <strong className="block mb-1"><i className="bi bi-info-circle-fill"></i> Tips Import Spreadsheet:</strong>
                    Buat layout rapor di Excel, LibreOffice (ODS), atau CSV. Gunakan kode <code>$NAMA</code>, <code>$NIS</code>, dll untuk data otomatis. Gunakan <code>$KODE_VARIABEL</code> (contoh: <code>$MTK</code>, <code>$PAI</code>) untuk kolom yang perlu diisi nilai oleh guru.
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col lg:flex-row gap-3 sm:gap-4 h-[calc(100dvh-130px)] lg:h-[calc(100vh-180px)] min-w-0">
            {/* GRID CANVAS CONTAINER */}
            <div className={`${mobileViewTab === 'grid' ? 'flex' : 'hidden lg:flex'} flex-grow flex-col bg-gray-100 rounded-xl border border-slate-300 overflow-hidden min-h-0 min-w-0 w-full relative`}>
                {/* TOOLBAR TIER 1: Primary Controls */}
                <div className="bg-white border-b border-slate-200 p-2 sm:px-3 sm:py-2 flex items-center justify-between gap-2 shrink-0">
                    <div className="flex items-center gap-2 flex-grow min-w-0">
                        <button 
                            type="button"
                            onClick={handleCancelEditing} 
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shrink-0" 
                            title="Batal & Kembali ke Daftar (Memeriksa perubahan belum tersimpan)"
                        >
                            <i className="bi bi-chevron-left text-sm"></i>
                            <span className="hidden sm:inline">Batal</span>
                        </button>

                        <div className="flex items-center gap-2 flex-grow max-w-xs min-w-0">
                            <input 
                                type="text" 
                                value={activeTemplate?.name} 
                                onChange={e => {
                                    setIsDirty(true);
                                    setActiveTemplate(t => t ? {...t, name: e.target.value} : null);
                                }} 
                                className="w-full border border-slate-200 rounded-xl px-2.5 py-1 text-xs sm:text-sm font-bold focus:ring-2 focus:ring-teal-500 bg-slate-50 focus:bg-white" 
                                placeholder="Nama Template Rapor" 
                            />
                            {isDirty && (
                                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full shrink-0" title="Ada perubahan yang belum disimpan (Ctrl+S untuk simpan cepat)">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                                    <span>Draf</span>
                                </span>
                            )}
                        </div>

                        <select 
                            value={activeTemplate?.jenjangId || ''} 
                            onChange={e => {
                                setIsDirty(true);
                                setActiveTemplate(t => t ? {...t, jenjangId: e.target.value ? parseInt(e.target.value) : undefined, kelasId: undefined, rombelId: undefined} : null);
                            }}
                            className="hidden sm:block border border-slate-200 rounded-xl px-2 py-1 text-xs font-semibold bg-slate-50 focus:ring-2 focus:ring-teal-500 max-w-[140px]"
                            title="Pilih Marhalah / Jenjang"
                        >
                            <option value="">Semua Marhalah</option>
                            {settings.jenjang.map(j => <option key={j.id} value={j.id}>{j.nama}</option>)}
                        </select>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                        {/* Mobile View Switcher */}
                        <div className="flex lg:hidden bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-bold shrink-0">
                            <button
                                type="button"
                                onClick={() => setMobileViewTab('grid')}
                                className={`px-2 py-1 rounded-lg flex items-center gap-1 transition-all ${mobileViewTab === 'grid' ? 'bg-white text-teal-800 shadow-2xs font-black' : 'text-slate-500'}`}
                            >
                                <i className="bi bi-grid-3x3"></i>
                                <span className="hidden xs:inline">Kanvas</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setMobileViewTab('properties')}
                                className={`px-2 py-1 rounded-lg flex items-center gap-1 transition-all ${mobileViewTab === 'properties' ? 'bg-white text-teal-800 shadow-2xs font-black' : 'text-slate-500'}`}
                            >
                                <i className="bi bi-sliders"></i>
                                <span className="hidden xs:inline">Properti</span>
                                {activeCellData && <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>}
                            </button>
                        </div>

                        {/* Collapsible Right Sidebar Toggle */}
                        <button
                            type="button"
                            onClick={() => setIsSidebarCollapsed(prev => !prev)}
                            className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all shrink-0 ${
                                isSidebarCollapsed
                                    ? 'bg-teal-50 text-teal-800 border-teal-300 shadow-2xs font-black'
                                    : 'bg-white text-slate-600 hover:text-slate-900 border-slate-200'
                            }`}
                            title={isSidebarCollapsed ? "Tampilkan Panel Properti Sel (Perlebar)" : "Sembunyikan Panel Properti (Maksimalkan Kanvas)"}
                        >
                            <i className={`bi ${isSidebarCollapsed ? 'bi-layout-sidebar' : 'bi-layout-sidebar-reverse'} text-sm`}></i>
                            <span className="hidden xl:inline">{isSidebarCollapsed ? 'Panel Properti' : 'Perlebar'}</span>
                        </button>

                        {activeTemplate && (
                            <button
                                type="button"
                                onClick={() => handleExportTemplateJson(activeTemplate)}
                                className="bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 p-2 sm:px-2.5 sm:py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all shrink-0"
                                title="Ekspor Template ke File JSON (Backup / Bagikan)"
                            >
                                <i className="bi bi-download text-xs"></i>
                                <span className="hidden xl:inline">JSON</span>
                            </button>
                        )}

                        <button 
                            type="button"
                            onClick={() => { commitInlineEdit(); setIsDesignPreviewOpen(true); }} 
                            className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 p-2 sm:px-3 sm:py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all shrink-0" 
                            title="Pratinjau Hasil Cetak"
                        >
                            <i className="bi bi-eye text-sm"></i>
                            <span className="hidden md:inline">Preview</span>
                        </button>
                        
                        {/* Quick Save in place (Ctrl+S) */}
                        <button 
                            type="button"
                            onClick={() => handleSaveActiveTemplate(false)} 
                            className="bg-teal-600 hover:bg-teal-700 text-white px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm active:scale-95 transition-all shrink-0"
                            title="Simpan perubahan langsung di kanvas tanpa menutup editor (Ctrl+S)"
                        >
                            <i className="bi bi-floppy"></i>
                            <span>Simpan</span>
                            {isDirty && <span className="w-1.5 h-1.5 rounded-full bg-amber-300"></span>}
                        </button>

                        {/* Save and Exit */}
                        <button 
                            type="button"
                            onClick={() => handleSaveActiveTemplate(true)} 
                            className="hidden sm:flex bg-slate-800 hover:bg-slate-900 text-white px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold items-center gap-1 shadow-sm active:scale-95 transition-all shrink-0"
                            title="Simpan perubahan dan kembali ke daftar template rapor"
                        >
                            <i className="bi bi-check-lg"></i>
                            <span>Selesai</span>
                        </button>
                    </div>
                </div>

                {/* TOOLBAR TIER 2: Excel Ribbon (Horizontally Scrollable) */}
                <div
                    onWheel={handleToolbarWheel}
                    className="w-full max-w-full px-2 py-1.5 bg-slate-50/95 border-b border-slate-200 flex flex-nowrap items-center gap-1.5 overflow-x-auto overscroll-x-contain touch-pan-x [scrollbar-width:thin] select-none shrink-0"
                >
                    {/* Undo & Redo Controls */}
                    <div className="flex items-center rounded-lg border border-slate-200 bg-white shadow-2xs overflow-hidden shrink-0">
                        <button
                            type="button"
                            onClick={handleUndo}
                            disabled={undoStack.length === 0}
                            className="px-2 py-1 hover:bg-slate-100 text-slate-700 disabled:opacity-30 disabled:hover:bg-white text-xs font-semibold flex items-center gap-1 transition-colors"
                            title="Undo / Batalkan Aksi (Ctrl+Z)"
                        >
                            <i className="bi bi-arrow-counterclockwise text-slate-600"></i>
                            <span className="hidden sm:inline">Undo</span>
                            {undoStack.length > 0 && <span className="text-[9px] font-mono text-teal-600 font-bold">({undoStack.length})</span>}
                        </button>
                        <div className="w-px h-4 bg-slate-200"></div>
                        <button
                            type="button"
                            onClick={handleRedo}
                            disabled={redoStack.length === 0}
                            className="px-2 py-1 hover:bg-slate-100 text-slate-700 disabled:opacity-30 disabled:hover:bg-white text-xs font-semibold flex items-center gap-1 transition-colors"
                            title="Redo / Ulangi Aksi (Ctrl+Y)"
                        >
                            <i className="bi bi-arrow-clockwise text-slate-600"></i>
                            <span className="hidden sm:inline">Redo</span>
                        </button>
                    </div>

                    <div className="h-5 w-px bg-slate-300 shrink-0"></div>

                    <select 
                        value={activeTemplate?.jenjangId || ''} 
                        onChange={e => {
                            setIsDirty(true);
                            setActiveTemplate(t => t ? {...t, jenjangId: e.target.value ? parseInt(e.target.value) : undefined, kelasId: undefined, rombelId: undefined} : null);
                        }}
                        className="sm:hidden border border-slate-300 rounded-lg px-2 py-1 text-[11px] font-bold bg-white text-slate-700 shrink-0"
                    >
                        <option value="">Semua Marhalah</option>
                        {settings.jenjang.map(j => <option key={j.id} value={j.id}>{j.nama}</option>)}
                    </select>

                    <div className="sm:hidden h-5 w-px bg-slate-300 shrink-0"></div>

                    {/* Quick Excel Paste */}
                    {canWrite && (
                        <>
                            <button 
                                type="button" 
                                onClick={() => setIsExcelPasteModalOpen(true)} 
                                className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-1 shadow-2xs shrink-0 transition-colors" 
                                title="Tempel tabel dari Microsoft Excel (Ctrl+V juga bisa langsung di kanvas)"
                            >
                                <i className="bi bi-clipboard2-data text-emerald-600"></i>
                                <span>Paste Excel</span>
                            </button>
                            <div className="h-5 w-px bg-slate-300 shrink-0"></div>
                        </>
                    )}

                    <button 
                        type="button" 
                        onClick={mergeCells} 
                        className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 shrink-0 text-xs font-semibold flex items-center gap-1 shadow-2xs" 
                        title="Gabung Sel yang Dipilih"
                    >
                        <i className="bi bi-intersect"></i>
                        <span>Merge</span>
                    </button>
                    <button 
                        type="button" 
                        onClick={unmergeCells} 
                        className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 shrink-0 text-xs font-semibold flex items-center gap-1 shadow-2xs" 
                        title="Pisah Sel Gabungan"
                    >
                        <i className="bi bi-union"></i>
                        <span>Pisah</span>
                    </button>

                    <div className="h-5 w-px bg-slate-300 shrink-0"></div>

                    <div className="flex items-center gap-0.5 shrink-0 bg-slate-50 p-0.5 rounded-lg border border-slate-200">
                        <button 
                            type="button" 
                            onClick={() => toggleBorder('all')} 
                            className="p-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded text-slate-700 text-xs shadow-2xs" 
                            title="Beri Border Semua Sisi"
                        >
                            <i className="bi bi-border-all"></i>
                        </button>
                        <button 
                            type="button" 
                            onClick={() => toggleBorder('outer')} 
                            className="p-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded text-slate-700 text-xs shadow-2xs" 
                            title="Garis Batas Luar Saja"
                        >
                            <i className="bi bi-border-outer"></i>
                        </button>
                        <button 
                            type="button" 
                            onClick={() => toggleBorder('bottom')} 
                            className="p-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded text-slate-700 text-xs shadow-2xs" 
                            title="Garis Batas Bawah"
                        >
                            <i className="bi bi-border-bottom"></i>
                        </button>
                        <button 
                            type="button" 
                            onClick={() => toggleBorder('none')} 
                            className="p-1.5 bg-white hover:bg-red-50 hover:text-red-700 border border-slate-200 rounded text-slate-700 text-xs shadow-2xs" 
                            title="Hapus Garis / Tanpa Border"
                        >
                            <i className="bi bi-border-none"></i>
                        </button>
                    </div>

                    <div className="h-5 w-px bg-slate-300 shrink-0"></div>

                    {/* Copy / Cut / Paste & Format Painter */}
                    {canWrite && (
                        <>
                            <div className="flex items-center rounded-lg border border-slate-200 bg-white shadow-2xs overflow-hidden shrink-0">
                                <button
                                    type="button"
                                    disabled={selectedCells.length === 0}
                                    onClick={() => handleCopySelection(false)}
                                    className="px-2 py-1 hover:bg-slate-100 text-slate-700 disabled:opacity-40 text-xs font-semibold flex items-center gap-1 transition-colors"
                                    title="Salin Sel Terpilih (Ctrl+C)"
                                >
                                    <i className="bi bi-copy text-slate-600"></i>
                                    <span className="hidden xl:inline">Salin</span>
                                </button>
                                <div className="w-px h-4 bg-slate-200"></div>
                                <button
                                    type="button"
                                    disabled={selectedCells.length === 0}
                                    onClick={() => handleCopySelection(true)}
                                    className="px-2 py-1 hover:bg-slate-100 text-slate-700 disabled:opacity-40 text-xs font-semibold flex items-center gap-1 transition-colors"
                                    title="Potong / Pindahkan Sel Terpilih (Ctrl+X)"
                                >
                                    <i className="bi bi-scissors text-slate-600"></i>
                                </button>
                                <div className="w-px h-4 bg-slate-200"></div>
                                <button
                                    type="button"
                                    disabled={!internalClipboard}
                                    onClick={() => handlePasteFromInternalClipboard()}
                                    className="px-2 py-1 hover:bg-slate-100 text-slate-700 disabled:opacity-40 text-xs font-semibold flex items-center gap-1 transition-colors"
                                    title="Tempel Sel (Ctrl+V)"
                                >
                                    <i className="bi bi-clipboard-check text-teal-600"></i>
                                </button>
                            </div>

                            <button
                                type="button"
                                onClick={handleToggleFormatPainter}
                                disabled={!activeCellData && !isFormatPainterActive}
                                className={`px-2 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1 shadow-2xs shrink-0 transition-all disabled:opacity-40 ${
                                    isFormatPainterActive
                                        ? 'bg-amber-500 text-white border-amber-600 ring-2 ring-amber-300 animate-pulse'
                                        : 'bg-white hover:bg-amber-50 text-slate-700 border-slate-200'
                                }`}
                                title="Salin Format (Format Painter): Menyalin border, warna, font, dan rata teks ke sel lain"
                            >
                                <i className="bi bi-brush"></i>
                                <span className="hidden lg:inline">{isFormatPainterActive ? 'Klik Target...' : 'Format'}</span>
                            </button>

                            <div className="h-5 w-px bg-slate-300 shrink-0"></div>
                        </>
                    )}

                    {/* Row Management: Insert Above, Insert Below & Delete */}
                    <div className="flex items-center rounded-lg border border-slate-200 bg-white shadow-2xs overflow-hidden shrink-0">
                        <button 
                            type="button" 
                            onClick={() => handleInsertRowRelative('above')} 
                            disabled={!canWrite}
                            className="px-2 py-1 hover:bg-teal-50 text-slate-700 text-xs font-semibold flex items-center gap-1 transition-colors disabled:opacity-40" 
                            title="Sisipkan 1 Baris di Atas Sel Aktif"
                        >
                            <i className="bi bi-arrow-bar-up text-teal-600"></i>
                            <span>+Atas</span>
                        </button>
                        <div className="w-px h-4 bg-slate-200"></div>
                        <button 
                            type="button" 
                            onClick={() => handleInsertRowRelative('below')} 
                            disabled={!canWrite}
                            className="px-2 py-1 hover:bg-teal-50 text-slate-700 text-xs font-semibold flex items-center gap-1 transition-colors disabled:opacity-40" 
                            title="Sisipkan 1 Baris di Bawah Sel Aktif"
                        >
                            <i className="bi bi-arrow-bar-down text-teal-600"></i>
                            <span>+Bawah</span>
                        </button>
                        <div className="w-px h-4 bg-slate-200"></div>
                        <button 
                            type="button" 
                            onClick={() => handleDeleteRow()} 
                            disabled={!canWrite || !activeTemplate || activeTemplate.rowCount <= 1}
                            className="px-2 py-1 hover:bg-red-50 hover:text-red-700 text-slate-600 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-600 text-xs font-semibold flex items-center gap-1 transition-colors" 
                            title={selectedCells.length > 0 
                                ? `Hapus baris terpilih (${Array.from(new Set(selectedCells.map(s => s.r + 1))).join(', ')})` 
                                : `Hapus baris terakhir (${activeTemplate?.rowCount || 1})`}
                        >
                            <i className="bi bi-trash3 text-red-500 text-[11px]"></i>
                        </button>
                    </div>

                    {/* Generator Tabel Mapel Kurikulum 1-Klik & + Mapel Repeater */}
                    <button
                        type="button"
                        onClick={() => setIsKurikulumGeneratorOpen(true)}
                        disabled={!canWrite}
                        className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-800 rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs shrink-0 transition-colors disabled:opacity-40"
                        title="Generate tabel mata pelajaran lengkap otomatis dari Data Master Kurikulum (+ Terbilang/Arab, Predikat, Jumlah & Rata-rata)"
                    >
                        <i className="bi bi-journal-check text-indigo-600"></i>
                        <span>Mapel Kurikulum</span>
                    </button>

                    <button
                        type="button"
                        onClick={handleInsertMapelRow}
                        disabled={!canWrite}
                        className="px-2 py-1 bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 text-cyan-800 rounded-lg text-xs font-semibold flex items-center gap-1 shadow-2xs shrink-0 transition-colors disabled:opacity-40"
                        title="Sisipkan 1 baris mapel dengan tag dinamis ($MAPEL_NO, $MAPEL_NAMA, $MAPEL_KKM, $MAPEL_NILAI, $MAPEL_PREDIKAT)"
                    >
                        <i className="bi bi-table text-cyan-600"></i>
                        <span>+ Mapel</span>
                    </button>

                    {/* Column Management: Insert Left, Insert Right & Delete */}
                    <div className="flex items-center rounded-lg border border-slate-200 bg-white shadow-2xs overflow-hidden shrink-0">
                        <button 
                            type="button" 
                            onClick={() => handleInsertColRelative('left')} 
                            disabled={!canWrite}
                            className="px-2 py-1 hover:bg-teal-50 text-slate-700 text-xs font-semibold flex items-center gap-1 transition-colors disabled:opacity-40" 
                            title="Sisipkan 1 Kolom di Kiri Sel Aktif"
                        >
                            <i className="bi bi-arrow-bar-left text-teal-600"></i>
                            <span>+Kiri</span>
                        </button>
                        <div className="w-px h-4 bg-slate-200"></div>
                        <button 
                            type="button" 
                            onClick={() => handleInsertColRelative('right')} 
                            disabled={!canWrite}
                            className="px-2 py-1 hover:bg-teal-50 text-slate-700 text-xs font-semibold flex items-center gap-1 transition-colors disabled:opacity-40" 
                            title="Sisipkan 1 Kolom di Kanan Sel Aktif"
                        >
                            <i className="bi bi-arrow-bar-right text-teal-600"></i>
                            <span>+Kanan</span>
                        </button>
                        <div className="w-px h-4 bg-slate-200"></div>
                        <button 
                            type="button" 
                            onClick={() => handleDeleteCol()} 
                            disabled={!canWrite || !activeTemplate || activeTemplate.colCount <= 1}
                            className="px-2 py-1 hover:bg-red-50 hover:text-red-700 text-slate-600 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-600 text-xs font-semibold flex items-center gap-1 transition-colors" 
                            title={selectedCells.length > 0 
                                ? `Hapus kolom terpilih (${Array.from(new Set(selectedCells.map(s => getExcelColName(s.c)))).join(', ')})` 
                                : `Hapus kolom terakhir (${getExcelColName((activeTemplate?.colCount || 1) - 1)})`}
                        >
                            <i className="bi bi-trash3 text-red-500 text-[11px]"></i>
                        </button>
                    </div>

                    <div className="h-5 w-px bg-slate-300 shrink-0"></div>

                    {/* Page Break Guide Toggle & Zoom Controls */}
                    <div className="flex items-center gap-1.5 shrink-0">
                        <button
                            type="button"
                            onClick={() => setShowPageBreakGuide(g => !g)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 ${
                                showPageBreakGuide ? 'bg-rose-50 text-rose-800 border-rose-300 shadow-2xs' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                            }`}
                            title="Tampilkan garis panduan batas halaman (A4 ~980px, F4 ~1100px) agar tabel tidak terpotong saat dicetak"
                        >
                            <i className={`bi ${showPageBreakGuide ? 'bi-scissors text-rose-600' : 'bi-dash-lg text-slate-400'}`}></i>
                            <span className="hidden sm:inline">{showPageBreakGuide ? 'Batas Kertas: Nyala' : 'Batas Kertas: Mati'}</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setShowGridlines(g => !g)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 ${
                                showGridlines ? 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50' : 'bg-teal-50 text-teal-800 border-teal-300 shadow-2xs'
                            }`}
                            title={showGridlines ? "Garis bantu editor aktif (garis putus-putus abu). Klik untuk melihat tampilan hanya sel ber-border cetak asli." : "Tampilan border cetak asli aktif. Klik untuk menampilkan garis bantu editor."}
                        >
                            <i className={`bi ${showGridlines ? 'bi-grid-3x3 text-slate-400' : 'bi-eye-fill text-teal-600'}`}></i>
                            <span className="hidden sm:inline">{showGridlines ? 'Garis Bantu: Nyala' : 'Border Asli Saja'}</span>
                        </button>

                        <div className="flex items-center bg-white rounded-lg border border-slate-200 shadow-2xs">
                            <button 
                                type="button"
                                onClick={() => setZoomScale(z => Math.max(0.3, Number((z - 0.1).toFixed(1))))} 
                                className="px-2 py-1 hover:bg-slate-100 text-slate-600 rounded-l-lg transition-colors" 
                                title="Zoom Out"
                            >
                                <i className="bi bi-dash-lg"></i>
                            </button>
                            <button 
                                type="button"
                                onClick={() => setZoomScale(1)} 
                                className="text-[10px] font-mono px-2 text-center select-none py-1 hover:bg-teal-50 hover:text-teal-700 font-bold transition-colors" 
                                title="Reset Zoom ke 100%"
                            >
                                {Math.round(zoomScale * 100)}%
                            </button>
                            <button 
                                type="button"
                                onClick={() => setZoomScale(z => Math.min(2.0, Number((z + 0.1).toFixed(1))))} 
                                className="px-2 py-1 hover:bg-slate-100 text-slate-600 rounded-r-lg transition-colors" 
                                title="Zoom In"
                            >
                                <i className="bi bi-plus-lg"></i>
                            </button>
                        </div>
                    </div>
                </div>

                {/* TOOLBAR TIER 3: Cell Formula / Direct Input & Quick Cell Formatting Toolbar (Horizontally Scrollable) */}
                <div
                    onWheel={handleToolbarWheel}
                    className="w-full max-w-full px-2 py-1.5 bg-white border-b border-slate-200 flex flex-nowrap items-center gap-1.5 overflow-x-auto overscroll-x-contain touch-pan-x [scrollbar-width:thin] shrink-0"
                >
                    {/* Active Cell Address Badge */}
                    <div
                        className="px-2 py-1 bg-slate-100 border border-slate-300 rounded-lg text-[11px] font-mono font-black text-slate-700 min-w-[54px] text-center select-none shrink-0"
                        title="Alamat Sel Aktif (Klik sel lalu langsung ketik seperti di Excel)"
                    >
                        {selectedCells.length === 0
                            ? '—'
                            : selectedCells.length === 1
                            ? `${getExcelColName(selectedCells[0].c)}${selectedCells[0].r + 1}`
                            : `${getExcelColName(selectedCells[0].c)}${selectedCells[0].r + 1}:${getExcelColName(selectedCells[selectedCells.length - 1].c)}${selectedCells[selectedCells.length - 1].r + 1}`}
                    </div>

                    {/* Quick Cell Type Selector */}
                    <select
                        value={activeCellData?.type || 'label'}
                        disabled={!activeCellData || !canWrite}
                        onChange={(e) => updateActiveCell({ type: e.target.value as RaporColumnType })}
                        className="border border-slate-200 rounded-lg px-1.5 py-1 text-[11px] font-bold bg-slate-50 text-slate-700 focus:ring-1 focus:ring-teal-500 disabled:opacity-40 shrink-0"
                        title="Tipe Data Sel Aktif"
                    >
                        <option value="label">Teks</option>
                        <option value="data">Data ($)</option>
                        <option value="input">Input</option>
                        <option value="formula">Rumus (=)</option>
                        <option value="dropdown">Dropdown</option>
                    </select>

                    {/* Excel fx Formula / Direct Value Input with $Tag & =Formula Autocomplete */}
                    <div className="relative flex items-center w-48 sm:w-64 xl:flex-grow min-w-[180px] shrink-0 border border-slate-300 focus-within:border-teal-500 focus-within:ring-1 focus-within:ring-teal-500 rounded-lg bg-white">
                        <span className="px-2 py-1 bg-slate-50 border-r border-slate-200 rounded-l-lg text-[11px] font-serif italic font-bold text-slate-500 select-none shrink-0">
                            fx
                        </span>
                        <input
                            ref={fxInputRef}
                            type="text"
                            disabled={!activeCellData || !canWrite}
                            value={
                                editingCell && activeCellData && editingCell.r === activeCellData.row && editingCell.c === activeCellData.col
                                    ? editingCell.draft
                                    : activeCellData
                                    ? getEditableCellString(activeCellData)
                                    : ''
                            }
                            onFocus={() => {
                                formulaInputHistoryPushedRef.current = false;
                                formulaPickedSpanRef.current = null;
                                setActiveFormulaSource('fx');
                                activeFormulaSourceRef.current = 'fx';
                            }}
                            onClick={() => {
                                formulaPickedSpanRef.current = null;
                            }}
                            onBlur={() => {
                                setTimeout(() => {
                                    if (isFormulaSelectingRef.current) return;
                                    setAutocompleteState(prev => (prev?.source === 'fx' ? null : prev));
                                    if (activeFormulaSourceRef.current === 'fx' && document.activeElement !== fxInputRef.current) {
                                        if (activeTemplate && activeCellData && canWrite) {
                                            const curStr = getEditableCellString(activeCellData);
                                            const closedStr = autoCloseFormulaParens(curStr);
                                            if (closedStr !== curStr) {
                                                const { updatedTpl, changed } = applySmartCellTextCommit(activeTemplate, activeCellData.row, activeCellData.col, closedStr);
                                                if (changed) setActiveTemplate(updatedTpl);
                                            }
                                        }
                                        formulaPickedSpanRef.current = null;
                                        setActiveFormulaSource(null);
                                        activeFormulaSourceRef.current = null;
                                    }
                                }, 150);
                            }}
                            onChange={(e) => {
                                if (!activeTemplate || !activeCellData || !canWrite) return;
                                const val = e.target.value;
                                const caret = e.target.selectionStart ?? val.length;
                                formulaPickedSpanRef.current = null;
                                detectAutocompleteTrigger(val, caret, 'fx');
                                if (editingCellRef.current && editingCellRef.current.r === activeCellData.row && editingCellRef.current.c === activeCellData.col) {
                                    const next = { ...editingCellRef.current, draft: val };
                                    editingCellRef.current = next;
                                    setEditingCell(next);
                                    return;
                                }
                                if (!formulaInputHistoryPushedRef.current) {
                                    pushToHistory(activeTemplate);
                                    formulaInputHistoryPushedRef.current = true;
                                }
                                const { updatedTpl, changed } = applySmartCellTextCommit(activeTemplate, activeCellData.row, activeCellData.col, val);
                                if (changed) {
                                    setActiveTemplate(updatedTpl);
                                }
                            }}
                            onKeyDown={(e) => {
                                if (autocompleteState?.source === 'fx' && filteredAutocompleteOptions.length > 0) {
                                    if (e.key === 'ArrowDown') {
                                        e.preventDefault();
                                        setAutocompleteState(prev => prev ? { ...prev, selectedIndex: (prev.selectedIndex + 1) % filteredAutocompleteOptions.length } : null);
                                        return;
                                    }
                                    if (e.key === 'ArrowUp') {
                                        e.preventDefault();
                                        setAutocompleteState(prev => prev ? { ...prev, selectedIndex: (prev.selectedIndex - 1 + filteredAutocompleteOptions.length) % filteredAutocompleteOptions.length } : null);
                                        return;
                                    }
                                    if (e.key === 'Tab' || e.key === 'Enter') {
                                        e.preventDefault();
                                        const chosen = filteredAutocompleteOptions[autocompleteState.selectedIndex] || filteredAutocompleteOptions[0];
                                        if (chosen) applyAutocompleteOption(chosen);
                                        return;
                                    }
                                    if (e.key === 'Escape') {
                                        e.preventDefault();
                                        setAutocompleteState(null);
                                        return;
                                    }
                                }
                                if (e.key === 'F4') {
                                    e.preventDefault();
                                    handleCycleFormulaLock();
                                    return;
                                }
                                if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
                                    formulaPickedSpanRef.current = null;
                                }
                                if (e.key === 'Enter' && activeCellData && activeTemplate) {
                                    e.preventDefault();
                                    const curStr = getEditableCellString(activeCellData);
                                    const closedStr = autoCloseFormulaParens(curStr);
                                    let latestTpl = activeTemplate;
                                    if (closedStr !== curStr) {
                                        const { updatedTpl, changed } = applySmartCellTextCommit(activeTemplate, activeCellData.row, activeCellData.col, closedStr);
                                        if (changed) {
                                            setActiveTemplate(updatedTpl);
                                            latestTpl = updatedTpl;
                                        }
                                    }
                                    formulaPickedSpanRef.current = null;
                                    setActiveFormulaSource(null);
                                    activeFormulaSourceRef.current = null;
                                    moveSelectionFrom(activeCellData.row, activeCellData.col, 1, 0, latestTpl);
                                    scrollContainerRef.current?.focus({ preventScroll: true });
                                }
                            }}
                            placeholder={activeCellData ? 'Ketik =SUM( atau =RATA2( lalu blok sel di tabel seperti Excel...' : 'Klik sel pada tabel lalu langsung ketik seperti di Excel...'}
                            className="w-full px-2.5 py-1 text-xs text-slate-800 rounded-r-lg focus:outline-none disabled:bg-slate-50"
                        />
                    </div>

                    {/* Quick Font Size, Align, Vertical Align & Float Text Controls (Scrollable Left-Right on All Screen Sizes) */}
                    {canWrite && (
                        <div className="flex items-center gap-1 shrink-0 pr-2">
                            {/* Font Size Stepper */}
                            <div className="flex items-center border border-slate-200 rounded-lg bg-slate-50 overflow-hidden shrink-0" title="Ukuran Font (Tetap konsisten meskipun sel diperkecil)">
                                <button
                                    type="button"
                                    disabled={selectedCells.length === 0}
                                    onClick={() => handleBulkUpdateCells({ fontSize: Math.max(7, (activeCellData?.fontSize || 11) - 1) })}
                                    className="px-1.5 py-1 hover:bg-slate-200 text-slate-600 text-[10px] font-bold disabled:opacity-40"
                                >
                                    <i className="bi bi-dash"></i>
                                </button>
                                <span className="px-1.5 text-[11px] font-mono font-bold text-slate-800 bg-white border-x border-slate-200 py-0.5 min-w-[26px] text-center">
                                    {activeCellData?.fontSize || 11}
                                </span>
                                <button
                                    type="button"
                                    disabled={selectedCells.length === 0}
                                    onClick={() => handleBulkUpdateCells({ fontSize: Math.min(36, (activeCellData?.fontSize || 11) + 1) })}
                                    className="px-1.5 py-1 hover:bg-slate-200 text-slate-600 text-[10px] font-bold disabled:opacity-40"
                                >
                                    <i className="bi bi-plus"></i>
                                </button>
                            </div>

                            {/* Bold & Italic */}
                            <button
                                type="button"
                                disabled={selectedCells.length === 0}
                                onClick={() => handleBulkUpdateCells({ bold: !activeCellData?.bold })}
                                className={`px-2 py-1 rounded-lg text-xs font-black border transition-colors disabled:opacity-40 ${activeCellData?.bold ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'}`}
                                title="Tebal (Bold)"
                            >
                                B
                            </button>
                            <button
                                type="button"
                                disabled={selectedCells.length === 0}
                                onClick={() => handleBulkUpdateCells({ italic: !activeCellData?.italic })}
                                className={`px-2 py-1 rounded-lg text-xs italic font-serif font-bold border transition-colors disabled:opacity-40 ${activeCellData?.italic ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'}`}
                                title="Miring (Italic)"
                            >
                                I
                            </button>

                            {/* Text Case / Format Huruf (UPPERCASE, lowercase, Title Case, Sentence case) */}
                            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 shrink-0" title="Format Huruf (UPPERCASE / lowercase / Title Case / Kalimat)">
                                {([
                                    { id: 'uppercase', label: 'AA', title: 'HURUF BESAR SEMUA (UPPERCASE)' },
                                    { id: 'lowercase', label: 'aa', title: 'huruf kecil semua (lowercase)' },
                                    { id: 'capitalize', label: 'Aa', title: 'Kapital Setiap Kata / Judul (Title Case)' },
                                    { id: 'sentence', label: 'Ab.', title: 'Kapital Awal Kalimat (Sentence case)' }
                                ] as const).map((item) => {
                                    const active = activeCellData?.textTransform === item.id;
                                    return (
                                        <button
                                            key={item.id}
                                            type="button"
                                            disabled={selectedCells.length === 0}
                                            onClick={() => handleBulkUpdateCells({ textTransform: active ? 'none' : item.id })}
                                            className={`px-1.5 py-0.5 rounded text-[11px] font-bold transition-colors disabled:opacity-40 ${active ? 'bg-violet-600 text-white shadow-2xs' : 'text-slate-700 hover:bg-white'}`}
                                            title={active ? `${item.title} (Klik lagi untuk kembali Normal)` : item.title}
                                        >
                                            {item.label}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Excel-style Decimal Places Rounding (.0<- / ->.00 + 0/1/2/3/Auto) */}
                            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 shrink-0" title="Pembulatan Angka di Belakang Koma (Seperti Decrease / Increase Decimal di Excel)">
                                <button
                                    type="button"
                                    disabled={selectedCells.length === 0}
                                    onClick={() => handleStepDecimalPlaces(-1)}
                                    className="px-1.5 py-0.5 rounded text-[11px] font-mono font-bold text-slate-700 hover:bg-white transition-colors disabled:opacity-40"
                                    title="Kurangi Digit Desimal (Decrease Decimal)"
                                >
                                    .0←
                                </button>
                                <button
                                    type="button"
                                    disabled={selectedCells.length === 0}
                                    onClick={() => handleStepDecimalPlaces(1)}
                                    className="px-1.5 py-0.5 rounded text-[11px] font-mono font-bold text-slate-700 hover:bg-white transition-colors disabled:opacity-40"
                                    title="Tambah Digit Desimal hingga 3 angka di belakang koma (Increase Decimal)"
                                >
                                    →.00
                                </button>
                                <select
                                    disabled={selectedCells.length === 0}
                                    value={activeCellData?.decimalPlaces === undefined ? '' : String(activeCellData.decimalPlaces)}
                                    onChange={(e) => {
                                        const raw = e.target.value;
                                        handleBulkUpdateCells({ decimalPlaces: raw === '' ? undefined : Number(raw) });
                                    }}
                                    className={`ml-0.5 px-1 py-0.5 rounded text-[11px] font-mono font-bold focus:outline-none cursor-pointer disabled:opacity-40 ${
                                        activeCellData?.decimalPlaces !== undefined
                                            ? 'bg-emerald-600 text-white'
                                            : 'bg-white text-slate-700 border border-slate-200'
                                    }`}
                                    title="Pilih jumlah digit di belakang koma (Auto, Bulat 0, 1 digit .0, 2 digit .00, atau 3 digit .000)"
                                >
                                    <option value="" className="bg-white text-slate-800">Desimal: Auto</option>
                                    <option value="0" className="bg-white text-slate-800">0 (Bulat)</option>
                                    <option value="1" className="bg-white text-slate-800">.0 (1 Digit)</option>
                                    <option value="2" className="bg-white text-slate-800">.00 (2 Digit)</option>
                                    <option value="3" className="bg-white text-slate-800">.000 (3 Digit)</option>
                                </select>
                            </div>

                            {/* Horizontal Align */}
                            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                                {(['left', 'center', 'right'] as const).map((al) => {
                                    const active = (activeCellData?.align || 'center') === al;
                                    const icon = al === 'left' ? 'bi-text-left' : al === 'center' ? 'bi-text-center' : 'bi-text-right';
                                    const label = al === 'left' ? 'Rata Kiri' : al === 'center' ? 'Rata Tengah' : 'Rata Kanan';
                                    return (
                                        <button
                                            key={al}
                                            type="button"
                                            disabled={selectedCells.length === 0}
                                            onClick={() => handleBulkUpdateCells({ align: al })}
                                            className={`px-1.5 py-0.5 rounded text-xs transition-colors disabled:opacity-40 ${active ? 'bg-teal-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-white'}`}
                                            title={label}
                                        >
                                            <i className={`bi ${icon}`}></i>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Vertical Align */}
                            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                                {(['top', 'middle', 'bottom'] as const).map((va) => {
                                    const active = (activeCellData?.verticalAlign || 'middle') === va;
                                    const icon = va === 'top' ? 'bi-align-top' : va === 'middle' ? 'bi-align-middle' : 'bi-align-bottom';
                                    const label = va === 'top' ? 'Rata Atas' : va === 'middle' ? 'Rata Tengah Vertikal' : 'Rata Bawah';
                                    return (
                                        <button
                                            key={va}
                                            type="button"
                                            disabled={selectedCells.length === 0}
                                            onClick={() => handleBulkUpdateCells({ verticalAlign: va })}
                                            className={`px-1.5 py-0.5 rounded text-xs transition-colors disabled:opacity-40 ${active ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-white'}`}
                                            title={label}
                                        >
                                            <i className={`bi ${icon}`}></i>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Wrap vs Float Text Toggle */}
                            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                                <button
                                    type="button"
                                    disabled={selectedCells.length === 0}
                                    onClick={() => handleBulkUpdateCells({ textWrap: 'wrap' })}
                                    className={`px-2 py-0.5 rounded text-[11px] font-bold flex items-center gap-1 transition-colors disabled:opacity-40 ${(activeCellData?.textWrap || 'wrap') === 'wrap' ? 'bg-teal-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-white'}`}
                                    title="Wrap Text: Teks turun ke baris bawah jika lebar sel sempit (seperti Wrap Text di Excel)"
                                >
                                    <i className="bi bi-text-wrap"></i>
                                    <span>Wrap</span>
                                </button>
                                <button
                                    type="button"
                                    disabled={selectedCells.length === 0}
                                    onClick={() => handleBulkUpdateCells({ textWrap: 'float' })}
                                    className={`px-2 py-0.5 rounded text-[11px] font-bold flex items-center gap-1 transition-colors disabled:opacity-40 ${activeCellData?.textWrap === 'float' ? 'bg-amber-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-white'}`}
                                    title="Float Text: Teks melayang melewati batas sel samping tanpa perlu Merge sel (seperti teks panjang di Excel)"
                                >
                                    <i className="bi bi-arrows-expand-vertical rotate-90"></i>
                                    <span>Float</span>
                                </button>
                                <button
                                    type="button"
                                    disabled={selectedCells.length === 0}
                                    onClick={() => handleBulkUpdateCells({ textWrap: 'clip' })}
                                    className={`px-1.5 py-0.5 rounded text-[11px] font-bold transition-colors disabled:opacity-40 ${activeCellData?.textWrap === 'clip' ? 'bg-slate-700 text-white shadow-2xs' : 'text-slate-600 hover:bg-white'}`}
                                    title="Potong Teks (Clip): Teks tetap 1 baris dan terpotong rapi sesuai lebar sel"
                                >
                                    <i className="bi bi-scissors"></i>
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* FLOATING AUTOCOMPLETE BAR FOR FX / INLINE CELL EDITOR */}
                {autocompleteState && filteredAutocompleteOptions.length > 0 && (
                    <div className="bg-slate-900 text-white px-2.5 py-1.5 border-b border-slate-700 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0 z-40">
                        <span className="text-[10px] font-black uppercase tracking-wider text-teal-300 shrink-0 flex items-center gap-1">
                            <i className="bi bi-lightning-charge-fill"></i>
                            {autocompleteState.mode === 'formula' ? 'Saran Rumus:' : 'Saran Tag / Variabel:'}
                        </span>
                        <div className="flex items-center gap-1.5">
                            {filteredAutocompleteOptions.map((opt, idx) => {
                                const isSel = idx === autocompleteState.selectedIndex;
                                return (
                                    <button
                                        key={opt.id}
                                        type="button"
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            applyAutocompleteOption(opt);
                                        }}
                                        className={`px-2 py-0.5 rounded-lg text-[11px] font-mono flex items-center gap-1.5 transition-all shrink-0 border ${
                                            isSel
                                                ? 'bg-teal-500 text-slate-950 font-black border-teal-300 shadow-sm'
                                                : 'bg-slate-800 hover:bg-slate-700 text-slate-100 border-slate-700'
                                        }`}
                                        title={opt.subtitle}
                                    >
                                        <span>{opt.label}</span>
                                        <span className={`text-[9px] font-sans px-1 rounded ${isSel ? 'bg-slate-900/20 text-slate-950' : 'bg-slate-700 text-slate-300'}`}>
                                            {opt.badge}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                        <span className="text-[10px] text-slate-400 ml-auto hidden md:inline shrink-0">
                            Tab / Klik untuk sisipkan • Esc tutup
                        </span>
                    </div>
                )}

                {/* EXCEL FORMULA POINT-AND-SELECT ACTIVE BANNER */}
                {isFormulaPointModeBannerVisible && (
                    <div className="bg-emerald-950 text-emerald-50 px-3 py-1.5 border-b border-emerald-700 flex items-center justify-between gap-2 text-xs shrink-0 z-30">
                        <div className="flex items-center gap-2 min-w-0">
                            <span className="bg-emerald-400 text-emerald-950 font-black px-2 py-0.5 rounded-md text-[10px] uppercase tracking-wider shrink-0 flex items-center gap-1">
                                <i className="bi bi-bounding-box-circles"></i>
                                Pilih Sel Rumus
                            </span>
                            <span className="text-[11px] text-emerald-100 truncate">
                                Klik/blok sel nilai untuk masuk ke rumus <span className="hidden md:inline text-emerald-300">• Tekan <strong>F4</strong> untuk kunci <code>$D$6 / D$6 / $D6</code> • Ctrl+Klik tambah rentang</span>
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                            <button
                                type="button"
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    handleCycleFormulaLock();
                                }}
                                className="px-2 py-0.5 bg-emerald-800 hover:bg-emerald-700 text-emerald-100 border border-emerald-500/60 font-mono font-bold rounded-lg text-[11px] flex items-center gap-1 transition-colors"
                                title="Siklus kunci referensi $ seperti tombol F4 di Excel: D6 → $D$6 → D$6 → $D6 → D6"
                            >
                                <i className="bi bi-lock-fill text-amber-300 text-[10px]"></i>
                                <span>$ Kunci (F4)</span>
                            </button>
                            <button
                                type="button"
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    finishFormulaPointMode();
                                }}
                                className="px-2.5 py-0.5 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-black rounded-lg text-[11px] flex items-center gap-1 transition-colors"
                                title="Tutup kurung otomatis & simpan rumus (Enter)"
                            >
                                <i className="bi bi-check2-circle"></i>
                                <span>Selesai</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* POST-AUTOFILL OPTIONS BAR (Seperti tombol kecil AutoFill Options di Excel seusai tarik sel) */}
                {lastAutoFillSession && canWrite && (
                    <div className="bg-teal-950 text-teal-50 px-3 py-1.5 border-b border-teal-700 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0 z-30">
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="bg-teal-400 text-teal-950 font-black px-2 py-0.5 rounded-md text-[10px] uppercase tracking-wider flex items-center gap-1">
                                <i className="bi bi-magic"></i>
                                Opsi AutoFill
                            </span>
                            <span className="text-[11px] text-teal-200 mr-1 hidden sm:inline">Mode isian tarik sel:</span>
                            {([
                                { id: 'series', label: 'Seri & Lanjut Rumus', tip: 'Geser referensi rumus otomatis (kecuali dikunci $) & lanjutkan seri (1,2,3 / Senin,Selasa / UH 1,UH 2)' },
                                { id: 'increment', label: 'Urutkan Angka (+1)', tip: 'Paksa satu angka tunggal ikut bertambah +1 (misal 75 → 76, 77)' },
                                { id: 'copy', label: 'Salin Persis', tip: 'Salin isi/rumus persis apa adanya tanpa seri dan tanpa menggeser koordinat' },
                                { id: 'format', label: 'Format Saja', tip: 'Salin garis border, warna, perataan, dan huruf saja tanpa mengubah nilai sel' }
                            ] as const).map(opt => {
                                const isCur = lastAutoFillSession.mode === opt.id;
                                return (
                                    <button
                                        key={opt.id}
                                        type="button"
                                        onClick={() => handleReapplyAutoFillMode(opt.id)}
                                        className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition-colors border ${
                                            isCur
                                                ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-2xs'
                                                : 'bg-teal-900/80 hover:bg-teal-800 text-teal-100 border-teal-700'
                                        }`}
                                        title={opt.tip}
                                    >
                                        {opt.label}
                                    </button>
                                );
                            })}
                        </div>
                        <button
                            type="button"
                            onClick={() => setLastAutoFillSession(null)}
                            className="text-teal-300 hover:text-white px-1.5 py-0.5 rounded text-[11px]"
                            title="Tutup bilah opsi AutoFill"
                        >
                            <i className="bi bi-x-lg"></i>
                        </button>
                    </div>
                )}

                {/* MULTI-CELL SELECTION TOOLBAR: Docked to Viewport Width & Horizontally Scrollable */}
                {selectedCells.length > 1 && (
                    <div
                        onWheel={handleToolbarWheel}
                        className="w-full max-w-full px-2.5 py-1.5 bg-slate-900 text-white border-b border-slate-800 flex flex-nowrap items-center gap-1.5 overflow-x-auto overscroll-x-contain touch-pan-x [scrollbar-width:thin] select-none shrink-0"
                    >
                        <div className="flex items-center gap-1.5 shrink-0">
                            <span className="bg-teal-400 text-slate-950 font-black px-2 py-0.5 rounded-lg text-xs font-mono whitespace-nowrap">
                                {selectedCells.length} Sel Terpilih
                            </span>
                        </div>

                        <div className="flex flex-nowrap items-center gap-1.5 shrink-0 pr-2">
                            {/* Quick Excel AutoSum / Rerata & Fill Down/Right on Selected Range */}
                            {canWrite && (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => handleQuickRangeFormula('SUM')}
                                        className="px-2 py-1 bg-emerald-500/25 hover:bg-emerald-500/45 text-emerald-200 border border-emerald-400/40 rounded-lg text-xs font-bold flex items-center gap-1 whitespace-nowrap shrink-0 transition-colors"
                                        title="AutoSum seperti Excel: Taruh rumus =SUM(...) otomatis di bawah/kanan sel yang diblok"
                                    >
                                        <span className="font-serif font-black">Σ</span>
                                        <span>Jumlah (SUM)</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleQuickRangeFormula('RATA2')}
                                        className="px-2 py-1 bg-amber-500/25 hover:bg-amber-500/45 text-amber-200 border border-amber-400/40 rounded-lg text-xs font-bold flex items-center gap-1 whitespace-nowrap shrink-0 transition-colors"
                                        title="Taruh rumus =RATA2(...) otomatis di bawah/kanan sel yang diblok"
                                    >
                                        <span className="font-mono font-black">x̄</span>
                                        <span>Rerata</span>
                                    </button>
                                    {selectionBounds && selectionBounds.rMax > selectionBounds.rMin && (
                                        <button
                                            type="button"
                                            onClick={handleFillDownShortcut}
                                            className="px-2 py-1 bg-sky-500/25 hover:bg-sky-500/45 text-sky-200 border border-sky-400/40 rounded-lg text-xs font-bold flex items-center gap-1 whitespace-nowrap shrink-0 transition-colors"
                                            title="Isi ke Bawah (Ctrl+D): Lanjutkan rumus / seri dari baris teratas ke seluruh baris yang diblok"
                                        >
                                            <i className="bi bi-arrow-down-square"></i>
                                            <span>Isi Bawah</span>
                                        </button>
                                    )}
                                    {selectionBounds && selectionBounds.cMax > selectionBounds.cMin && (
                                        <button
                                            type="button"
                                            onClick={handleFillRightShortcut}
                                            className="px-2 py-1 bg-sky-500/25 hover:bg-sky-500/45 text-sky-200 border border-sky-400/40 rounded-lg text-xs font-bold flex items-center gap-1 whitespace-nowrap shrink-0 transition-colors"
                                            title="Isi ke Kanan (Ctrl+R): Lanjutkan rumus / seri dari kolom paling kiri ke seluruh kolom yang diblok"
                                        >
                                            <i className="bi bi-arrow-right-square"></i>
                                            <span>Isi Kanan</span>
                                        </button>
                                    )}
                                    <div className="h-4 w-px bg-slate-700 shrink-0"></div>
                                </>
                            )}

                            {/* Borders */}
                            <button
                                type="button"
                                onClick={() => toggleBorder('all')}
                                className="px-2 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold flex items-center gap-1 whitespace-nowrap shrink-0 transition-colors"
                                title="Beri Border Kotak Semua Sisi"
                            >
                                <i className="bi bi-border-all"></i>
                                <span>Kotak Penuh</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => toggleBorder('outer')}
                                className="px-2 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold flex items-center gap-1 whitespace-nowrap shrink-0 transition-colors"
                                title="Beri Border Luar Saja"
                            >
                                <i className="bi bi-border-outer"></i>
                                <span>Luar</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => toggleBorder('none')}
                                className="px-2 py-1 bg-rose-500/20 hover:bg-rose-500/40 text-rose-200 border border-rose-500/30 rounded-lg text-xs font-semibold flex items-center gap-1 whitespace-nowrap shrink-0 transition-colors"
                                title="Hapus Garis Border pada Semua Sel Terpilih"
                            >
                                <i className="bi bi-border-none"></i>
                                <span>Hapus Border</span>
                            </button>

                            <div className="h-4 w-px bg-slate-700 shrink-0"></div>

                            {/* Styling */}
                            <button
                                type="button"
                                onClick={() => handleBulkUpdateCells({ bold: true })}
                                className="px-2 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold shrink-0"
                                title="Tebalkan Teks (Bold)"
                            >
                                B
                            </button>
                            <button
                                type="button"
                                onClick={() => handleBulkUpdateCells({ italic: true })}
                                className="px-2 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs italic font-serif shrink-0"
                                title="Miringkan Teks (Italic)"
                            >
                                I
                            </button>
                            <button
                                type="button"
                                onClick={() => handleBulkUpdateCells({ textTransform: 'uppercase' })}
                                className="px-2 py-1 bg-violet-500/30 hover:bg-violet-500/50 text-violet-100 border border-violet-400/30 rounded-lg text-[11px] font-bold shrink-0"
                                title="HURUF BESAR SEMUA (UPPERCASE)"
                            >
                                AA
                            </button>
                            <button
                                type="button"
                                onClick={() => handleBulkUpdateCells({ textTransform: 'lowercase' })}
                                className="px-2 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[11px] font-bold shrink-0"
                                title="huruf kecil semua (lowercase)"
                            >
                                aa
                            </button>
                            <button
                                type="button"
                                onClick={() => handleBulkUpdateCells({ textTransform: 'capitalize' })}
                                className="px-2 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[11px] font-bold shrink-0"
                                title="Kapital Setiap Kata / Judul (Title Case)"
                            >
                                Aa
                            </button>
                            <button
                                type="button"
                                onClick={() => handleBulkUpdateCells({ textTransform: 'none' })}
                                className="px-2 py-1 bg-white/10 hover:bg-white/20 text-slate-300 rounded-lg text-[11px] font-semibold shrink-0"
                                title="Format Huruf Normal (Sesuai Asli)"
                            >
                                Normal
                            </button>

                            <div className="h-4 w-px bg-slate-700 shrink-0"></div>

                            {/* Quick Decimal Places on Multi-cell Selection */}
                            {([
                                { val: 0, label: '0', tip: 'Bulatkan ke bilangan bulat (0 desimal)' },
                                { val: 1, label: '.0', tip: 'Format 1 angka di belakang koma' },
                                { val: 2, label: '.00', tip: 'Format 2 angka di belakang koma' },
                                { val: 3, label: '.000', tip: 'Format 3 angka di belakang koma' },
                                { val: undefined, label: 'Auto', tip: 'Kembalikan desimal otomatis' }
                            ] as const).map(item => (
                                <button
                                    key={String(item.label)}
                                    type="button"
                                    onClick={() => handleBulkUpdateCells({ decimalPlaces: item.val })}
                                    className="px-1.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-100 border border-emerald-400/30 rounded-lg text-[11px] font-mono font-bold shrink-0"
                                    title={item.tip}
                                >
                                    {item.label}
                                </button>
                            ))}

                            <div className="h-4 w-px bg-slate-700 shrink-0"></div>
                            <button
                                type="button"
                                onClick={() => handleBulkUpdateCells({ align: 'left' })}
                                className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs shrink-0"
                                title="Rata Kiri"
                            >
                                <i className="bi bi-text-left"></i>
                            </button>
                            <button
                                type="button"
                                onClick={() => handleBulkUpdateCells({ align: 'center' })}
                                className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs shrink-0"
                                title="Rata Tengah"
                            >
                                <i className="bi bi-text-center"></i>
                            </button>
                            <button
                                type="button"
                                onClick={() => handleBulkUpdateCells({ align: 'right' })}
                                className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs shrink-0"
                                title="Rata Kanan"
                            >
                                <i className="bi bi-text-right"></i>
                            </button>
                            <button
                                type="button"
                                onClick={() => handleBulkUpdateCells({ verticalAlign: 'top' })}
                                className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs shrink-0"
                                title="Rata Atas"
                            >
                                <i className="bi bi-align-top"></i>
                            </button>
                            <button
                                type="button"
                                onClick={() => handleBulkUpdateCells({ verticalAlign: 'middle' })}
                                className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs shrink-0"
                                title="Rata Tengah Vertikal"
                            >
                                <i className="bi bi-align-middle"></i>
                            </button>
                            <button
                                type="button"
                                onClick={() => handleBulkUpdateCells({ verticalAlign: 'bottom' })}
                                className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs shrink-0"
                                title="Rata Bawah"
                            >
                                <i className="bi bi-align-bottom"></i>
                            </button>
                            <button
                                type="button"
                                onClick={() => handleBulkUpdateCells({ textWrap: 'wrap' })}
                                className="px-2 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold whitespace-nowrap shrink-0"
                                title="Wrap Text (Teks turun ke baris bawah)"
                            >
                                Wrap
                            </button>
                            <button
                                type="button"
                                onClick={() => handleBulkUpdateCells({ textWrap: 'float' })}
                                className="px-2 py-1 bg-amber-500/30 hover:bg-amber-500/50 text-amber-200 border border-amber-400/30 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0"
                                title="Float Text (Teks melayang melewati batas sel samping)"
                            >
                                Float
                            </button>
                            <button
                                type="button"
                                onClick={() => handleBulkUpdateCells({ textWrap: 'clip' })}
                                className="px-2 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold whitespace-nowrap shrink-0"
                                title="Potong Teks (Clip)"
                            >
                                Clip
                            </button>

                            <div className="h-4 w-px bg-slate-700 shrink-0"></div>

                            {/* Merge & Clear */}
                            <button
                                type="button"
                                onClick={mergeCells}
                                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm whitespace-nowrap shrink-0 transition-colors"
                                title="Gabungkan Sel Terpilih (Merge Cells)"
                            >
                                <i className="bi bi-intersect"></i>
                                <span>Merge</span>
                            </button>
                            <button
                                type="button"
                                onClick={handleBulkClearValues}
                                className="px-2 py-1 bg-white/10 hover:bg-red-500/40 text-slate-300 hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1 whitespace-nowrap shrink-0 transition-colors"
                                title="Kosongkan Nilai pada Sel-Sel Terpilih"
                            >
                                <i className="bi bi-eraser"></i>
                                <span>Kosongkan</span>
                            </button>
                        </div>
                    </div>
                )}

                <div 
                    className="flex-grow overflow-auto p-4 sm:p-6 relative bg-slate-200/70 flex items-start justify-start border-b min-w-0 min-h-0 focus:outline-none" 
                    onMouseUp={handleMouseUp} 
                    onPaste={handleCanvasPaste}
                    tabIndex={0}
                    ref={scrollContainerRef}
                >
                    {/* Live Resizing Dimension Badge Overlay */}
                    {resizingCol && (
                        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[100] bg-slate-900/90 backdrop-blur text-white text-xs font-mono font-bold px-4 py-2 rounded-full shadow-2xl pointer-events-none flex items-center gap-2.5 border border-teal-400 animate-pulse">
                            <i className="bi bi-arrows-expand-vertical rotate-90 text-teal-400 text-sm"></i>
                            <span>Lebar Kolom <strong>{getExcelColName(resizingCol.colIdx)}</strong>: <span className="text-teal-300 text-sm font-black">{resizingCol.currentWidth}px</span></span>
                        </div>
                    )}
                    {resizingRow && (
                        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[100] bg-slate-900/90 backdrop-blur text-white text-xs font-mono font-bold px-4 py-2 rounded-full shadow-2xl pointer-events-none flex items-center gap-2.5 border border-teal-400 animate-pulse">
                            <i className="bi bi-arrows-expand-vertical text-teal-400 text-sm"></i>
                            <span>Tinggi Baris <strong>{resizingRow.rowIdx + 1}</strong>: <span className="text-teal-300 text-sm font-black">{resizingRow.currentHeight}px</span></span>
                        </div>
                    )}
                    {fillDragLivePreviewBadge && (
                        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[100] bg-slate-900/95 backdrop-blur text-white text-xs font-mono font-bold px-4 py-2 rounded-full shadow-2xl pointer-events-none flex items-center gap-2.5 border border-emerald-400">
                            <i className="bi bi-plus-square-dotted text-emerald-400 text-sm"></i>
                            <span>
                                AutoFill ke <strong>{fillDragLivePreviewBadge.dirLabel}</strong> (<span className="text-emerald-300">{fillDragLivePreviewBadge.rangeLabel}</span>)
                                {fillDragLivePreviewBadge.sample && (
                                    <span className="ml-2 text-amber-300">→ {fillDragLivePreviewBadge.sample.slice(0, 38)}</span>
                                )}
                            </span>
                        </div>
                    )}

                    <div
                        className="inline-block transition-all duration-150 origin-top-left pb-32 pr-32"
                        style={{
                            zoom: zoomScale,
                            minWidth: 'max-content'
                        }}
                    >
                        <table className="border-collapse bg-white shadow-xl select-none table-fixed ring-1 ring-slate-300">
                            <colgroup>
                                <col style={{ width: '40px', minWidth: '40px', maxWidth: '40px' }} />
                                {Array.from({ length: activeTemplate?.colCount || activeTemplate?.cells?.[0]?.length || 0 }).map((_, cIdx) => {
                                    const colW = getColWidth(cIdx);
                                    return <col key={cIdx} style={{ width: `${colW}px`, minWidth: `${colW}px`, maxWidth: `${colW}px` }} />;
                                })}
                            </colgroup>
                            <thead>
                                <tr className="bg-slate-100 select-none">
                                    {/* Corner Header: Select All */}
                                    <th 
                                        className="w-10 min-w-[40px] max-w-[40px] h-7 bg-slate-200 hover:bg-slate-300 border border-slate-300 text-slate-500 font-bold text-[10px] text-center select-none cursor-pointer transition-colors sticky top-0 left-0 z-30 shadow-xs"
                                        onClick={handleSelectAllCells}
                                        title="Pilih Semua Sel"
                                    >
                                        ◢
                                    </th>
                                    {/* Column Headers A, B, C... */}
                                    {Array.from({ length: activeTemplate?.colCount || activeTemplate?.cells?.[0]?.length || 0 }).map((_, cIdx) => {
                                        const colName = getExcelColName(cIdx);
                                        const colW = getColWidth(cIdx);
                                        const isColSelected = selectedCells.length > 0 && selectedCells.every(s => s.c === cIdx);
                                        const isNarrow = colW < 28;
                                        return (
                                            <th
                                                key={cIdx}
                                                className={`group/col relative border border-slate-300 text-slate-700 font-bold text-center select-none cursor-pointer h-7 ${isNarrow ? 'px-0 text-[9px]' : 'px-1 text-[11px]'} transition-colors sticky top-0 z-20 shadow-xs ${
                                                    isColSelected ? 'bg-blue-200 text-blue-900 font-black' : 'bg-slate-100 hover:bg-slate-200'
                                                }`}
                                                style={{ width: `${colW}px`, minWidth: `${colW}px`, maxWidth: `${colW}px`, boxSizing: 'border-box' }}
                                                onClick={() => handleSelectColumn(cIdx)}
                                                title={`Kolom ${colName} (${colW}px) - Klik untuk pilih seluruh kolom, seret pembatas kanan untuk atur lebar`}
                                            >
                                                <div className="flex items-center justify-center gap-0.5 w-full h-full relative overflow-hidden">
                                                    <span className="truncate block pointer-events-none">{colName}</span>
                                                    {activeTemplate && activeTemplate.colCount > 1 && canWrite && !isNarrow && (
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDeleteCol(cIdx);
                                                            }}
                                                            className="opacity-0 group-hover/col:opacity-100 hover:bg-red-500 hover:text-white text-slate-400 p-0.5 rounded transition-all text-[9px] leading-none shrink-0"
                                                            title={`Hapus Kolom ${colName}`}
                                                        >
                                                            <i className="bi bi-x-lg"></i>
                                                        </button>
                                                    )}
                                                </div>
                                                {/* Excel-style Column Resizer Handle (Touch & Mouse) */}
                                                <div
                                                    className="absolute top-0 right-0 bottom-0 w-3 -mr-1.5 cursor-col-resize hover:bg-teal-500/80 active:bg-teal-700 z-30 transition-colors touch-none flex items-center justify-center"
                                                    onMouseDown={(e) => handleStartColResize(e, cIdx)}
                                                    onTouchStart={(e) => handleStartColResizeTouch(e, cIdx)}
                                                    title={`Tahan & seret ke kanan/kiri untuk mengubah lebar kolom ${colName}`}
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            </th>
                                        );
                                    })}
                                </tr>
                            </thead>
                            <tbody>
                                {activeTemplate?.cells.map((row, rIdx) => {
                                    const rowH = getRowHeight(rIdx);
                                    const isRowSelected = selectedCells.length > 0 && selectedCells.every(s => s.r === rIdx);
                                    const isPageBreak = showPageBreakGuide && pageBreakRowIndices.includes(rIdx);

                                    return (
                                        <React.Fragment key={rIdx}>
                                            {isPageBreak && (
                                                <tr className="pointer-events-none select-none bg-rose-500/10">
                                                    <td colSpan={(activeTemplate?.colCount || 1) + 1} className="p-0 border-y-2 border-dashed border-rose-500">
                                                        <div className="bg-rose-100 text-rose-900 text-[10px] font-black py-1 px-3 flex items-center justify-between gap-2">
                                                            <span className="flex items-center gap-1.5">
                                                                <i className="bi bi-scissors rotate-90 text-rose-600"></i>
                                                                <span>
                                                                    BATAS HALAMAN ({paperFormat}{curPageSetup.orientation === 'landscape' ? ' Landscape' : ''})
                                                                </span>
                                                            </span>
                                                            <span className="text-[9px] font-bold text-rose-700 bg-white/90 px-2 py-0.5 rounded tabular-nums">
                                                                {canvasPaginatedLayout?.isSinglePageFit
                                                                    ? `Batas 100% — Otomatis diperkecil ke ${Math.round((canvasPaginatedLayout?.scale || 1) * 100)}% (Fit 1 Halaman)`
                                                                    : `Mulai Halaman ${(pageBreakRowIndices.indexOf(rIdx) + 2)} (Baris ke-${rIdx + 1} di-oper ke halaman baru)`}
                                                            </span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                            <tr style={{ height: `${rowH}px` }}>
                                            {/* Row Header 1, 2, 3... */}
                                            <th
                                                className={`group/row relative w-10 min-w-[40px] max-w-[40px] border border-slate-300 text-slate-700 font-bold text-[11px] text-center select-none cursor-pointer transition-colors sticky left-0 z-10 shadow-xs ${
                                                    isRowSelected ? 'bg-blue-200 text-blue-900 font-black' : 'bg-slate-100 hover:bg-slate-200'
                                                }`}
                                                style={{ height: `${rowH}px`, minHeight: `${rowH}px` }}
                                                onClick={() => handleSelectRow(rIdx)}
                                                title={`Baris ${rIdx + 1} (${rowH}px) - Klik untuk pilih seluruh baris, seret pembatas bawah untuk atur tinggi`}
                                            >
                                                <div className="flex items-center justify-center gap-1 w-full h-full relative px-0.5">
                                                    <span className="pointer-events-none">{rIdx + 1}</span>
                                                    {activeTemplate && activeTemplate.rowCount > 1 && canWrite && (
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDeleteRow(rIdx);
                                                            }}
                                                            className="opacity-0 group-hover/row:opacity-100 hover:bg-red-500 hover:text-white text-slate-400 p-0.5 rounded transition-all text-[8px] leading-none shrink-0"
                                                            title={`Hapus Baris ${rIdx + 1}`}
                                                        >
                                                            <i className="bi bi-x-lg"></i>
                                                        </button>
                                                    )}
                                                </div>
                                                {/* Excel-style Row Resizer Handle (Touch & Mouse) */}
                                                <div
                                                    className="absolute left-0 right-0 bottom-0 h-4 -mb-1.5 cursor-row-resize hover:bg-teal-500/80 active:bg-teal-700 z-30 transition-colors touch-none flex items-center justify-center"
                                                    onMouseDown={(e) => handleStartRowResize(e, rIdx)}
                                                    onTouchStart={(e) => handleStartRowResizeTouch(e, rIdx)}
                                                    title={`Tahan & seret ke atas/bawah untuk mengubah tinggi baris ${rIdx + 1}`}
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            </th>

                                            {/* Data Cells */}
                                            {row.map((cell, cIdx) => {
                                                if (cell.hidden) return null;
                                                const isSelected = selectedCells.some(s => s.r === rIdx && s.c === cIdx);
                                                const isActive = selectedCells.length === 1 && selectedCells[0].r === rIdx && selectedCells[0].c === cIdx;
                                                const isEditingThisCell = Boolean(editingCell && editingCell.r === rIdx && editingCell.c === cIdx);
                                                const isFormulaRef = formulaReferencedCoords.has(`${rIdx}:${cIdx}`);
                                                const isLiveDragRef = Boolean(
                                                    formulaDragPreview &&
                                                    rIdx >= formulaDragPreview.r1 &&
                                                    rIdx <= formulaDragPreview.r2 &&
                                                    cIdx >= formulaDragPreview.c1 &&
                                                    cIdx <= formulaDragPreview.c2
                                                );
                                                const cellColSpan = cell.colSpan || 1;
                                                let cellWidthPx = getColWidth(cIdx);
                                                if (cellColSpan > 1) {
                                                    cellWidthPx = 0;
                                                    for (let i = 0; i < cellColSpan; i++) {
                                                        cellWidthPx += getColWidth(cIdx + i);
                                                    }
                                                }

                                                const cellRowSpan = cell.rowSpan || 1;
                                                let cellHeightPx = getRowHeight(rIdx);
                                                if (cellRowSpan > 1) {
                                                    cellHeightPx = 0;
                                                    for (let i = 0; i < cellRowSpan; i++) {
                                                        cellHeightPx += getRowHeight(rIdx + i);
                                                    }
                                                }

                                                const isFillTargetPreview = Boolean(
                                                    fillDragState?.targetBounds &&
                                                    rIdx <= fillDragState.targetBounds.rMax &&
                                                    rIdx + cellRowSpan - 1 >= fillDragState.targetBounds.rMin &&
                                                    cIdx <= fillDragState.targetBounds.cMax &&
                                                    cIdx + cellColSpan - 1 >= fillDragState.targetBounds.cMin
                                                );

                                                const isFillHandleHost = Boolean(
                                                    canWrite &&
                                                    !editingCell &&
                                                    !isFormulaPointModeBannerVisible &&
                                                    !isFormatPainterActive &&
                                                    selectionBounds &&
                                                    rIdx + cellRowSpan - 1 === selectionBounds.rMax &&
                                                    cIdx + cellColSpan - 1 === selectionBounds.cMax
                                                );

                                                const borders = cell.borders || { top: false, right: false, bottom: false, left: false };
                                                let cellClass = `relative transition-colors ${showGridlines ? 'border border-dashed border-gray-300' : 'border border-transparent'} `;
                                                if (borders.top) cellClass += "!border-t !border-t-black !border-solid ";
                                                if (borders.right) cellClass += "!border-r !border-r-black !border-solid ";
                                                if (borders.bottom) cellClass += "!border-b !border-b-black !border-solid ";
                                                if (borders.left) cellClass += "!border-l !border-l-black !border-solid ";
                                                if (isFillTargetPreview) cellClass += "bg-teal-100/80 ring-2 ring-inset ring-teal-600 ";
                                                else if (isLiveDragRef || isFormulaRef) cellClass += "bg-emerald-100/80 ring-2 ring-inset ring-emerald-500 ";
                                                else if (isSelected) cellClass += "bg-blue-100/80 ";
                                                if (isActive && !isEditingThisCell) cellClass += "ring-2 ring-blue-500 ";

                                                const effectiveFontSize = cell.fontSize || 11;
                                                const hAlign = cell.align || 'center';
                                                const vAlign = cell.verticalAlign || 'middle';
                                                const textWrap = cell.textWrap || 'wrap';
                                                const upperCanvasCellVal = (cell.value || '').toUpperCase();
                                                const isCanvasMedia = (cell.type === 'data' || cell.type === 'label') && isMediaTag(cell.value || '');
                                                const isCanvasSigOrStamp = isCanvasMedia && !upperCanvasCellVal.includes('LOGO') && !upperCanvasCellVal.includes('KOP');
                                                const isFloat = textWrap === 'float' && !isCanvasMedia;
                                                const isClip = textWrap === 'clip';
                                                const cellPadding = cellWidthPx < 22 ? '1px' : '2px 4px';

                                                return (
                                                    <td 
                                                        key={cell.id} 
                                                        data-grid-rc={`${rIdx}:${cIdx}`}
                                                        colSpan={cellColSpan} 
                                                        rowSpan={cellRowSpan} 
                                                        className={cellClass} 
                                                        onMouseDown={(e) => handleMouseDown(rIdx, cIdx, e)} 
                                                        onMouseEnter={() => handleMouseEnter(rIdx, cIdx)}
                                                        onTouchStart={(e) => {
                                                            if (e.touches.length === 1 && tryStartFormulaCellPick(rIdx, cIdx, false)) {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                            }
                                                        }}
                                                        onTouchMove={(e) => {
                                                            if (!formulaDragAnchorRef.current || e.touches.length !== 1) return;
                                                            e.preventDefault();
                                                            const touch = e.touches[0];
                                                            const el = document.elementFromPoint(touch.clientX, touch.clientY)?.closest('td[data-grid-rc]');
                                                            const rcAttr = el?.getAttribute('data-grid-rc');
                                                            if (rcAttr) {
                                                                const [tr, tc] = rcAttr.split(':').map(Number);
                                                                if (!isNaN(tr) && !isNaN(tc)) {
                                                                    updateFormulaPickedReference(formulaDragAnchorRef.current.r, formulaDragAnchorRef.current.c, tr, tc);
                                                                }
                                                            }
                                                        }}
                                                        onTouchEnd={() => {
                                                            if (formulaDragAnchorRef.current) {
                                                                formulaDragAnchorRef.current = null;
                                                                setFormulaDragPreview(null);
                                                                setTimeout(() => {
                                                                    isFormulaSelectingRef.current = false;
                                                                }, 80);
                                                            }
                                                        }}
                                                        onClick={() => {
                                                            if (isFormulaSelectingRef.current) return;
                                                            if (wasAlreadySingleSelectedRef.current && selectedCells.length === 1 && !editingCellRef.current && canWrite) {
                                                                startInlineEdit(rIdx, cIdx);
                                                            }
                                                        }}
                                                        onDoubleClick={() => startInlineEdit(rIdx, cIdx)}
                                                        onContextMenu={(e) => {
                                                            e.preventDefault();
                                                            if (editingCellRef.current) commitInlineEdit();
                                                            const isAlreadyInSelection = selectedCells.some(s => s.r === rIdx && s.c === cIdx);
                                                            if (!isAlreadyInSelection) {
                                                                setSelectedCells([{ r: rIdx, c: cIdx }]);
                                                            }
                                                            setContextMenuPos({ x: e.clientX, y: e.clientY, r: rIdx, c: cIdx });
                                                        }}
                                                        style={{ 
                                                            width: `${cellWidthPx}px`, 
                                                            minWidth: `${cellWidthPx}px`,
                                                            height: `${cellHeightPx}px`,
                                                            padding: 0,
                                                            boxSizing: 'border-box',
                                                            textAlign: hAlign,
                                                            verticalAlign: vAlign,
                                                            fontWeight: cell.bold ? 'bold' : 'normal',
                                                            fontStyle: cell.italic ? 'italic' : undefined,
                                                            backgroundColor: !isSelected && !isFillTargetPreview && !isLiveDragRef && !isFormulaRef && cell.backgroundColor ? cell.backgroundColor : undefined,
                                                            color: cell.color || undefined,
                                                            fontSize: `${effectiveFontSize}px`,
                                                            overflow: (isEditingThisCell || isFloat || isFillHandleHost || isActive || isCanvasSigOrStamp) ? 'visible' : 'hidden',
                                                            zIndex: isEditingThisCell ? 40 : isFillHandleHost ? 28 : isActive ? 25 : isFloat ? 15 : isCanvasSigOrStamp ? 12 : undefined
                                                        }}
                                                    >
                                                        {isEditingThisCell && editingCell ? (
                                                            <textarea
                                                                ref={inlineEditorRef}
                                                                value={editingCell.draft}
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    const caret = e.target.selectionStart ?? val.length;
                                                                    formulaPickedSpanRef.current = null;
                                                                    detectAutocompleteTrigger(val, caret, 'inline');
                                                                    setEditingCell(prev => {
                                                                        const next = prev ? { ...prev, draft: val } : null;
                                                                        editingCellRef.current = next;
                                                                        return next;
                                                                    });
                                                                }}
                                                                onMouseDown={(e) => {
                                                                    e.stopPropagation();
                                                                    formulaPickedSpanRef.current = null;
                                                                }}
                                                                onClick={(e) => e.stopPropagation()}
                                                                onDoubleClick={(e) => e.stopPropagation()}
                                                                onBlur={() => {
                                                                    if (isFormulaSelectingRef.current) return;
                                                                    commitInlineEdit();
                                                                }}
                                                                onKeyDown={(e) => {
                                                                    e.stopPropagation();
                                                                    if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
                                                                        formulaPickedSpanRef.current = null;
                                                                    }
                                                                    if (autocompleteState?.source === 'inline' && filteredAutocompleteOptions.length > 0) {
                                                                        if (e.key === 'ArrowDown') {
                                                                            e.preventDefault();
                                                                            setAutocompleteState(prev => prev ? { ...prev, selectedIndex: (prev.selectedIndex + 1) % filteredAutocompleteOptions.length } : null);
                                                                            return;
                                                                        }
                                                                        if (e.key === 'ArrowUp') {
                                                                            e.preventDefault();
                                                                            setAutocompleteState(prev => prev ? { ...prev, selectedIndex: (prev.selectedIndex - 1 + filteredAutocompleteOptions.length) % filteredAutocompleteOptions.length } : null);
                                                                            return;
                                                                        }
                                                                        if (e.key === 'Tab') {
                                                                            e.preventDefault();
                                                                            const chosen = filteredAutocompleteOptions[autocompleteState.selectedIndex] || filteredAutocompleteOptions[0];
                                                                            if (chosen) applyAutocompleteOption(chosen);
                                                                            return;
                                                                        }
                                                                    }
                                                                    if (e.key === 'Escape') {
                                                                        e.preventDefault();
                                                                        if (autocompleteState) {
                                                                            setAutocompleteState(null);
                                                                        } else {
                                                                            cancelInlineEdit();
                                                                        }
                                                                    } else if (e.key === 'Enter' && !e.altKey && !e.shiftKey) {
                                                                        e.preventDefault();
                                                                        if (autocompleteState?.source === 'inline' && filteredAutocompleteOptions.length > 0) {
                                                                            const chosen = filteredAutocompleteOptions[autocompleteState.selectedIndex] || filteredAutocompleteOptions[0];
                                                                            if (chosen) applyAutocompleteOption(chosen);
                                                                            return;
                                                                        }
                                                                        commitInlineEdit({ dr: 1, dc: 0 });
                                                                    } else if (e.key === 'Enter' && (e.altKey || e.shiftKey)) {
                                                                        e.preventDefault();
                                                                        const ta = e.currentTarget;
                                                                        const start = ta.selectionStart ?? editingCell.draft.length;
                                                                        const end = ta.selectionEnd ?? editingCell.draft.length;
                                                                        const nextVal = editingCell.draft.slice(0, start) + '\n' + editingCell.draft.slice(end);
                                                                        setEditingCell(prev => {
                                                                            const next = prev ? { ...prev, draft: nextVal } : null;
                                                                            editingCellRef.current = next;
                                                                            return next;
                                                                        });
                                                                        requestAnimationFrame(() => {
                                                                            ta.selectionStart = ta.selectionEnd = start + 1;
                                                                        });
                                                                    } else if (e.key === 'Tab') {
                                                                        e.preventDefault();
                                                                        commitInlineEdit({ dr: 0, dc: e.shiftKey ? -1 : 1 });
                                                                    }
                                                                }}
                                                                title="Enter: Simpan & Turun | Ketik = atau $ untuk saran otomatis | Alt/Shift+Enter: Baris Baru | Esc: Batal"
                                                                className="absolute top-0 left-0 bg-white text-slate-900 resize-none focus:outline-none ring-2 ring-teal-600 shadow-xl z-50 select-text"
                                                                style={{
                                                                    minWidth: `${Math.max(cellWidthPx, 130)}px`,
                                                                    width: `${Math.max(cellWidthPx, 130)}px`,
                                                                    minHeight: `${Math.max(cellHeightPx, 28)}px`,
                                                                    height: `${Math.max(cellHeightPx, 28)}px`,
                                                                    padding: '3px 5px',
                                                                    fontSize: `${effectiveFontSize}px`,
                                                                    fontWeight: cell.bold ? 'bold' : 'normal',
                                                                    fontStyle: cell.italic ? 'italic' : 'normal',
                                                                    textAlign: hAlign,
                                                                    lineHeight: 1.25
                                                                }}
                                                            />
                                                        ) : isFloat ? (
                                                            <div
                                                                className="pointer-events-none"
                                                                style={{
                                                                    position: 'relative',
                                                                    width: '100%',
                                                                    height: `${cellHeightPx}px`,
                                                                    minHeight: `${cellHeightPx}px`,
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
                                                                    {getSimulatedValue(cell)}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div
                                                                className="pointer-events-none"
                                                                style={{
                                                                    width: '100%',
                                                                    height: `${cellHeightPx}px`,
                                                                    maxHeight: `${cellHeightPx}px`,
                                                                    padding: isCanvasMedia ? '1px' : cellPadding,
                                                                    boxSizing: 'border-box',
                                                                    overflow: isCanvasSigOrStamp ? 'visible' : 'hidden',
                                                                    display: 'flex',
                                                                    flexDirection: 'column',
                                                                    justifyContent: vAlign === 'top' ? 'flex-start' : vAlign === 'bottom' ? 'flex-end' : 'center',
                                                                    alignItems: hAlign === 'left' ? 'flex-start' : hAlign === 'right' ? 'flex-end' : 'center',
                                                                    textAlign: hAlign,
                                                                    lineHeight: 1.25
                                                                }}
                                                            >
                                                                <div
                                                                    style={
                                                                        isCanvasMedia
                                                                            ? {
                                                                                  width: '100%',
                                                                                  display: 'flex',
                                                                                  alignItems: 'center',
                                                                                  justifyContent: hAlign === 'left' ? 'flex-start' : hAlign === 'right' ? 'flex-end' : 'center',
                                                                                  overflow: isCanvasSigOrStamp ? 'visible' : 'hidden',
                                                                              }
                                                                            : {
                                                                                  width: '100%',
                                                                                  marginTop: vAlign === 'top' ? 0 : 'auto',
                                                                                  marginBottom: vAlign === 'bottom' ? 0 : 'auto',
                                                                                  whiteSpace: isClip ? 'pre' : 'pre-wrap',
                                                                                  wordBreak: isClip ? 'normal' : 'break-word',
                                                                                  overflowWrap: isClip ? 'normal' : 'anywhere',
                                                                                  overflow: isClip ? 'hidden' : undefined,
                                                                                  textAlign: hAlign
                                                                              }
                                                                    }
                                                                >
                                                                    {getSimulatedValue(cell)}
                                                                </div>
                                                                {cell.key && cellWidthPx >= 35 && cellHeightPx >= 26 && (
                                                                    <span className="text-[8px] opacity-60 font-normal leading-none mt-0.5 shrink-0">${cell.key}</span>
                                                                )}
                                                            </div>
                                                        )}

                                                        {/* Direct Resizers on Active Cell Edge (Touch & Mouse) */}
                                                        {isActive && !isEditingThisCell && (
                                                            <>
                                                                <div
                                                                    className="absolute -right-2 top-0 bottom-2.5 w-4 cursor-col-resize z-30 hover:bg-teal-500/60 transition-colors touch-none"
                                                                    title="Tahan & seret ke kanan/kiri untuk mengubah lebar kolom"
                                                                    onMouseDown={(e) => handleStartColResize(e, cIdx + (cellColSpan - 1))}
                                                                    onTouchStart={(e) => handleStartColResizeTouch(e, cIdx + (cellColSpan - 1))}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                />
                                                                <div
                                                                    className="absolute left-0 right-2.5 -bottom-2 h-4 cursor-row-resize z-30 hover:bg-teal-500/60 transition-colors touch-none"
                                                                    title="Tahan & seret ke atas/bawah untuk mengubah tinggi baris"
                                                                    onMouseDown={(e) => handleStartRowResize(e, rIdx + (cellRowSpan - 1))}
                                                                    onTouchStart={(e) => handleStartRowResizeTouch(e, rIdx + (cellRowSpan - 1))}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                />
                                                            </>
                                                        )}

                                                        {/* Excel-style Corner Fill Handle (Drag to Fill Series / Shift Formulas, Double-Click to AutoFill Down) */}
                                                        {isFillHandleHost && (
                                                            <div
                                                                onMouseDown={handleStartFillHandleDrag}
                                                                onTouchStart={handleStartFillHandleDrag}
                                                                onClick={(e) => e.stopPropagation()}
                                                                onDoubleClick={handleDoubleClickFillHandle}
                                                                title="Fill Handle (Seperti Excel): Seret ke bawah/samping untuk melanjutkan seri atau rumus • Klik ganda untuk isi otomatis ke bawah • Tahan Ctrl saat menyeret untuk paksa urut angka +1"
                                                                className="absolute -right-[5px] -bottom-[5px] w-[10px] h-[10px] bg-blue-600 hover:bg-teal-600 hover:scale-125 border-[1.5px] border-white shadow-sm cursor-crosshair z-40 transition-transform touch-none"
                                                            />
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>

                        {/* Page Height & Fit Summary Badge */}
                        <div className="mt-4 flex flex-wrap items-center gap-2 select-none">
                            <div className="inline-flex items-center gap-2 bg-white/90 backdrop-blur border border-slate-300 rounded-xl px-3 py-1.5 shadow-xs text-xs">
                                <i className="bi bi-file-earmark-text text-teal-600"></i>
                                <span className="text-slate-600 font-medium">Tinggi Desain:</span>
                                <span className="font-mono font-black text-slate-800">{totalDesignHeight}px</span>
                                <span className="text-slate-400">/</span>
                                <span className="text-slate-500 font-medium">Batas {paperFormat}:</span>
                                <span className="font-mono font-bold text-slate-600">{pageBreakThresholdPx}px</span>
                            </div>

                            {totalDesignHeight <= pageBreakThresholdPx ? (
                                <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-xl text-xs font-bold shadow-2xs">
                                    <i className="bi bi-check-circle-fill text-emerald-600"></i>
                                    <span>Pas 1 Halaman ({paperFormat})</span>
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-800 border border-amber-300 px-3 py-1.5 rounded-xl text-xs font-bold shadow-2xs" title="Tabel meluber ke halaman 2. Aktifkan 'Fit to 1 Page' di tab Lembar jika ingin otomatis diskalakan pas 1 muka saat dicetak.">
                                    <i className="bi bi-exclamation-triangle-fill text-amber-600"></i>
                                    <span>Meluber ke Halaman 2 (Gunakan 'Fit to 1 Page' jika ingin 1 muka)</span>
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Mobile Floating Active Cell Action Pill */}
                    {activeCellData && (
                        <div className="lg:hidden fixed bottom-14 left-2 right-2 z-40 bg-slate-900/95 backdrop-blur-md text-white p-2.5 rounded-2xl shadow-2xl border border-slate-700/80 flex items-center justify-between gap-2 animate-in fade-in slide-in-from-bottom-2">
                            <div className="min-w-0 flex items-center gap-2">
                                <span className="bg-teal-400 text-slate-950 font-black px-2 py-0.5 rounded-lg text-xs font-mono shrink-0">
                                    {getExcelColName(activeCellData.col)}{activeCellData.row + 1}
                                </span>
                                <div className="min-w-0">
                                    <p className="text-xs font-bold text-white truncate">
                                        {activeCellData.value || <span className="italic text-slate-400">Sel Kosong</span>}
                                    </p>
                                    <p className="text-[10px] text-teal-300 font-mono">
                                        {getColWidth(activeCellData.col)}×{getRowHeight(activeCellData.row)}px • {activeCellData.type.toUpperCase()}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setMobileViewTab('properties')}
                                className="bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-md active:scale-95 transition-all shrink-0"
                            >
                                <i className="bi bi-sliders"></i>
                                <span>Edit Properti</span>
                            </button>
                        </div>
                    )}
                </div>

                {/* WORKSHEET / MULTI-SHEET TABS BAR */}
                <div
                    onWheel={handleToolbarWheel}
                    className="w-full max-w-full bg-slate-100 border-t border-slate-300 px-3 py-1 flex flex-nowrap items-center gap-1.5 overflow-x-auto overscroll-x-contain touch-pan-x [scrollbar-width:thin] select-none shrink-0"
                >
                    <div className="flex items-center gap-1 shrink-0">
                        {activeSheets.map((sh) => {
                            const isActive = sh.id === (activeSheetId || activeTemplate?.activeSheetId);
                            return (
                                <div 
                                    key={sh.id}
                                    className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg border border-b-0 text-xs font-bold cursor-pointer transition-all shrink-0 ${
                                        isActive 
                                            ? 'bg-white text-teal-800 border-slate-300 shadow-sm border-t-2 !border-t-teal-600 -mb-1.5 z-10' 
                                            : 'bg-slate-200/90 text-slate-600 hover:bg-slate-200 border-transparent'
                                    }`}
                                    onClick={() => handleSwitchSheet(sh.id)}
                                >
                                    <i className={`bi ${isActive ? 'bi-file-earmark-spreadsheet-fill text-teal-600' : 'bi-file-earmark text-slate-400'}`}></i>
                                    {editingSheetNameId === sh.id ? (
                                        <input
                                            type="text"
                                            autoFocus
                                            defaultValue={sh.name}
                                            onBlur={(e) => {
                                                handleRenameSheet(sh.id, e.target.value);
                                                setEditingSheetNameId(null);
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    handleRenameSheet(sh.id, (e.target as HTMLInputElement).value);
                                                    setEditingSheetNameId(null);
                                                }
                                            }}
                                            className="border rounded px-1.5 py-0.5 text-xs w-28 sm:w-32 bg-white text-slate-800 focus:ring-1 focus:ring-teal-500"
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    ) : (
                                        <span 
                                            onDoubleClick={(e) => { e.stopPropagation(); setEditingSheetNameId(sh.id); }} 
                                            title="Klik ganda untuk mengubah nama sheet"
                                            className="truncate max-w-[120px] sm:max-w-[140px]"
                                        >
                                            {sh.name}
                                        </span>
                                    )}

                                    <button 
                                        type="button" 
                                        onClick={(e) => { e.stopPropagation(); setEditingSheetNameId(editingSheetNameId === sh.id ? null : sh.id); }}
                                        className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-slate-300 rounded text-slate-500 text-[10px] transition-opacity"
                                        title="Ubah Nama"
                                    >
                                        <i className="bi bi-pencil"></i>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); handleDuplicateSheet(sh.id); }}
                                        className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-slate-300 rounded text-slate-500 text-[10px] transition-opacity"
                                        title="Duplikat Lembar"
                                    >
                                        <i className="bi bi-copy"></i>
                                    </button>

                                    {activeSheets.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); handleDeleteSheet(sh.id); }}
                                            className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-red-200 rounded text-red-500 text-[10px] transition-opacity"
                                            title="Hapus Lembar"
                                        >
                                            <i className="bi bi-x"></i>
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <button
                        type="button"
                        onClick={() => handleAddSheet()}
                        className="px-2.5 py-1 text-xs font-bold text-teal-700 hover:bg-teal-100/80 rounded-lg transition-colors flex items-center gap-1 border border-dashed border-teal-300 bg-teal-50/60 shrink-0 ml-1"
                        title="Tambah Lembar / Worksheet Baru"
                    >
                        <i className="bi bi-plus-lg"></i>
                        <span>Tambah Sheet</span>
                    </button>

                    <div className="ml-auto text-[11px] text-slate-500 hidden md:flex items-center gap-2">
                        <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded text-[10px] font-mono">
                            Sheet {activeSheets.findIndex(s => s.id === (activeSheetId || activeTemplate?.activeSheetId)) + 1} dari {activeSheets.length}
                        </span>
                        <span className="text-[10px] text-slate-400 italic">Klik ganda nama sheet untuk rename</span>
                    </div>
                </div>
            </div>

            {/* PROPERTIES SIDEBAR (Side-by-side on desktop, switchable view on mobile) */}
            <div className={`${mobileViewTab === 'properties' ? 'flex' : isSidebarCollapsed ? 'hidden' : 'hidden lg:flex'} w-full lg:w-80 bg-white border border-slate-300 rounded-xl flex-col shrink-0 min-h-0 overflow-hidden shadow-xs transition-all`}>
                <div className="p-2 border-b bg-gray-50 flex items-center justify-between gap-1 shrink-0">
                    <div className="flex bg-slate-200/90 p-0.5 rounded-lg text-xs font-bold">
                        <button
                            type="button"
                            onClick={() => setSidebarTab('cell')}
                            className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 ${
                                sidebarTab === 'cell' ? 'bg-white text-teal-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <i className="bi bi-ui-checks-grid text-teal-600"></i>
                            <span>Sel</span>
                            {activeCellData && (
                                <span className="bg-teal-100 text-teal-800 text-[10px] px-1 py-0.2 rounded font-mono font-bold">
                                    {getExcelColName(activeCellData.col)}{activeCellData.row + 1}
                                </span>
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={() => setSidebarTab('sheet')}
                            className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 ${
                                sidebarTab === 'sheet' ? 'bg-white text-indigo-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                            }`}
                            title="Atur Nama Sheet, Judul Dokumen Rapor (1-3 Baris), Pas 1 Muka, dan Biodata"
                        >
                            <i className="bi bi-file-earmark-text text-indigo-600"></i>
                            <span>Lembar &amp; Judul</span>
                        </button>
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            onClick={() => setIsSidebarCollapsed(true)}
                            className="hidden lg:flex p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-md transition-colors"
                            title="Sembunyikan Panel Properti (Perlebar Kanvas)"
                        >
                            <i className="bi bi-chevron-right text-xs"></i>
                        </button>
                        <button
                            type="button"
                            onClick={() => setMobileViewTab('grid')}
                            className="lg:hidden text-xs font-bold text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 px-2 py-1 rounded-lg border border-teal-200 flex items-center gap-1 transition-all"
                        >
                            <i className="bi bi-grid-3x3"></i>
                            <span>Kanvas</span>
                        </button>
                    </div>
                </div>
                {sidebarTab === 'cell' && activeCellData ? (
                    <div className="p-4 space-y-5 overflow-y-auto">
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Tipe Data</label>
                            <select value={activeCellData.type} onChange={e => updateActiveCell({ type: e.target.value as RaporColumnType })} className="w-full border rounded p-2 text-sm bg-gray-50">
                                <option value="label">Label / Teks Statis</option>
                                <option value="data">Data Dinamis (Sistem)</option>
                                <option value="input">Input Nilai (Manual)</option>
                                <option value="dropdown">Dropdown</option>
                                <option value="formula">Formula</option>
                            </select>
                        </div>
                        {activeCellData.type === 'label' && <div><label className="block text-xs font-bold mb-1">Teks</label><textarea value={activeCellData.value} onChange={e => updateActiveCell({ value: e.target.value })} className="w-full border rounded p-2 text-sm" rows={3}/></div>}
                        {activeCellData.type === 'data' && (
                             <div className="space-y-3 p-3 bg-purple-50/70 rounded-xl border border-purple-100">
                                <div className="flex items-center justify-between">
                                    <label className="block text-xs font-bold text-purple-900 flex items-center gap-1.5">
                                        <i className="bi bi-tags-fill"></i> Pilih Data Dinamis
                                    </label>
                                    <span className="text-[10px] font-mono text-purple-700 font-bold">{activeCellData.value || 'Belum dipilih'}</span>
                                </div>

                                {/* Category Tabs */}
                                <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar border-b border-purple-200">
                                    {DYNAMIC_TAG_CATEGORIES.map(cat => (
                                        <button
                                            key={cat.id}
                                            type="button"
                                            onClick={() => setSelectedTagCategory(cat.id)}
                                            className={`px-2 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all flex items-center gap-1 ${selectedTagCategory === cat.id ? 'bg-purple-600 text-white shadow-sm' : 'bg-white text-gray-600 hover:bg-purple-100'}`}
                                        >
                                            <i className={`bi ${cat.icon}`}></i>
                                            <span>{cat.title.split(' ')[0]}</span>
                                        </button>
                                    ))}
                                </div>

                                {/* Tag List for Selected Category */}
                                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                                    {DYNAMIC_TAG_CATEGORIES.find(c => c.id === selectedTagCategory)?.tags.map(item => (
                                        <button
                                            key={item.tag}
                                            type="button"
                                            onClick={() => updateActiveCell({ value: item.tag })}
                                            className={`w-full text-left p-2 rounded-lg border transition-all text-xs flex flex-col gap-0.5 ${activeCellData.value === item.tag ? 'bg-purple-100 border-purple-400 ring-1 ring-purple-400 font-bold' : 'bg-white hover:bg-purple-50 border-gray-200'}`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="font-bold text-gray-800">{item.label}</span>
                                                <span className="font-mono text-[9px] text-purple-700 bg-purple-100 px-1 py-0.2 rounded">{item.tag}</span>
                                            </div>
                                            <div className="text-[10px] text-gray-500 truncate">{item.description} (Contoh: {item.example})</div>
                                        </button>
                                    ))}
                                </div>

                                {/* Smart KKM Data Master Picker & Live Row Detection Inspector */}
                                {(selectedTagCategory === 'kalkulasi' ||
                                    selectedTagCategory === 'mapel_repeater' ||
                                    (activeCellData.value || '').toUpperCase().includes('KKM')) && (() => {
                                    const { simJenjang } = getTemplateSimulatedHierarchy();
                                    const effJenjangId = simJenjang?.id || activeTemplate?.jenjangId;
                                    const jenjangMap = new Map<number, string>((settings.jenjang || []).map(j => [j.id, j.nama]));
                                    const filteredMasterMapel = (settings.mataPelajaran || []).filter(
                                        mp => !effJenjangId || Number(mp.jenjangId) === Number(effJenjangId)
                                    );
                                    const displayMasterMapel =
                                        filteredMasterMapel.length > 0 ? filteredMasterMapel : (settings.mataPelajaran || []);

                                    const curValUpper = (activeCellData.value || '').trim().toUpperCase();
                                    const isRowAutoKkm =
                                        curValUpper === '$KKM' ||
                                        curValUpper === '$MAPEL_KKM' ||
                                        curValUpper === '$NILAI_KKM' ||
                                        curValUpper === '$KBM';
                                    const isSpecificMapelKkm =
                                        curValUpper.startsWith('$KKM_') &&
                                        curValUpper !== '$KKM_STANDAR' &&
                                        curValUpper !== '$KKM_DEFAULT' &&
                                        curValUpper !== '$KKM_MARHALAH';

                                    const rowInspect = inspectSheetRowKkm({
                                        sheetCells: activeTemplate?.cells,
                                        row: activeCellData.row,
                                        col: activeCellData.col,
                                        mataPelajaran: settings.mataPelajaran || [],
                                        preferredJenjangId: effJenjangId
                                    });

                                    const specificMatchedMp = isSpecificMapelKkm
                                        ? findMapelInMasterPool(curValUpper, settings.mataPelajaran || [], effJenjangId)
                                        : undefined;

                                    return (
                                        <div className="p-2.5 bg-emerald-50/70 rounded-lg border border-emerald-200 space-y-2 mt-2">
                                            <div className="flex items-center justify-between gap-1">
                                                <span className="text-[10.5px] font-black text-emerald-900 uppercase flex items-center gap-1">
                                                    <i className="bi bi-database-check text-emerald-600"></i>
                                                    <span>Integrasi KKM Data Master</span>
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => updateActiveCell({ type: 'data', value: '$KKM' })}
                                                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border transition-colors ${
                                                        isRowAutoKkm
                                                            ? 'bg-emerald-600 text-white border-emerald-700'
                                                            : 'bg-white text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                                                    }`}
                                                    title="Gunakan $KKM agar otomatis membaca nama mapel ketikan manual di baris ini"
                                                >
                                                    Pakai $KKM Otomatis
                                                </button>
                                            </div>

                                            {isRowAutoKkm && (
                                                <div
                                                    className={`p-2 rounded border text-[10px] leading-snug ${
                                                        rowInspect.matchedMapel
                                                            ? 'bg-white border-emerald-300 text-emerald-900'
                                                            : rowInspect.source === 'fallback_jenjang'
                                                            ? 'bg-amber-50 border-amber-300 text-amber-900'
                                                            : 'bg-slate-50 border-slate-200 text-slate-600'
                                                    }`}
                                                >
                                                    {rowInspect.matchedMapel ? (
                                                        <div>
                                                            <div className="font-bold flex items-center justify-between">
                                                                <span>
                                                                    <i className="bi bi-check-circle-fill text-emerald-600 mr-1"></i>
                                                                    Cocok Data Master: {rowInspect.matchedMapel.nama}
                                                                </span>
                                                                <span className="font-mono bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-black">
                                                                    KKM {rowInspect.kkmValue}
                                                                </span>
                                                            </div>
                                                            <div className="text-[9.5px] text-slate-500 mt-0.5">
                                                                Terdeteksi otomatis dari{' '}
                                                                {rowInspect.source === 'master_label'
                                                                    ? `teks baris "${rowInspect.detectedLabel}"`
                                                                    : `kode variabel $${rowInspect.detectedInputKey}`}{' '}
                                                                pada Baris #{activeCellData.row + 1}.
                                                            </div>
                                                        </div>
                                                    ) : rowInspect.source === 'fallback_jenjang' ? (
                                                        <div>
                                                            <div className="font-bold flex items-center justify-between">
                                                                <span>
                                                                    <i className="bi bi-exclamation-circle-fill text-amber-600 mr-1"></i>
                                                                    Mapel Manual: &ldquo;{rowInspect.detectedLabel || `$${rowInspect.detectedInputKey}`}&rdquo;
                                                                </span>
                                                                <span className="font-mono bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded font-black">
                                                                    KKM {rowInspect.kkmValue}
                                                                </span>
                                                            </div>
                                                            <div className="text-[9.5px] text-amber-800 mt-0.5">
                                                                Nama mapel ini belum ada di Data Master &gt; Mata Pelajaran, sehingga memakai KKM standar marhalah ({rowInspect.defaultKkm}).
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div>
                                                            <i className="bi bi-info-circle mr-1 text-slate-500"></i>
                                                            Ketik nama mapel manual di Baris #{activeCellData.row + 1} (misal <strong>Fiqih</strong>) agar <code>$KKM</code> otomatis menarik nilai KKM-nya dari Data Master (default: <strong>{rowInspect.defaultKkm}</strong>).
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {isSpecificMapelKkm && (
                                                <div className="p-2 rounded border bg-white border-emerald-300 text-[10px] text-emerald-900 flex items-center justify-between">
                                                    <span>
                                                        <i className="bi bi-pin-angle-fill text-emerald-600 mr-1"></i>
                                                        {specificMatchedMp
                                                            ? ` Terkunci ke Mapel: ${specificMatchedMp.nama}`
                                                            : ' Mapel spesifik belum terdaftar (pakai KKM standar)'}
                                                    </span>
                                                    <span className="font-mono bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-black">
                                                        KKM {specificMatchedMp?.kkm ?? rowInspect.defaultKkm}
                                                    </span>
                                                </div>
                                            )}

                                            {displayMasterMapel.length > 0 && (
                                                <div>
                                                    <label className="block text-[10px] font-semibold text-emerald-900 mb-1">
                                                        Atau Kunci ke KKM Mapel Tertentu (Data Master):
                                                    </label>
                                                    <select
                                                        value={isSpecificMapelKkm ? curValUpper : ''}
                                                        onChange={e => {
                                                            if (e.target.value) {
                                                                updateActiveCell({ type: 'data', value: e.target.value });
                                                            }
                                                        }}
                                                        className="w-full text-xs border border-emerald-200 rounded p-1.5 bg-white font-medium text-slate-800"
                                                    >
                                                        <option value="">-- Pilih KKM Mapel Spesifik ($KKM_...) --</option>
                                                        {displayMasterMapel.map(mp => {
                                                            const codeSuffix = canonicalizeMapelLookupKey(mp.kodeMapel || mp.nama || '', false);
                                                            const tagVal = codeSuffix ? `$KKM_${codeSuffix}` : `$KKM_MAPEL_${mp.id}`;
                                                            const jLabel = !effJenjangId ? jenjangMap.get(mp.jenjangId) : '';
                                                            return (
                                                                <option key={mp.id} value={tagVal}>
                                                                    {mp.nama}{jLabel ? ` (${jLabel})` : ''} — KKM {mp.kkm ?? 70} ({tagVal})
                                                                </option>
                                                            );
                                                        })}
                                                    </select>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}

                                {/* Specific Teacher Name / NIP Helper under Pejabat Category */}
                                {selectedTagCategory === 'pejabat' && (
                                    <div className="space-y-2 mt-2">
                                        <div className="p-2 bg-white rounded-lg border border-purple-200 space-y-1.5">
                                            <label className="block text-[10px] font-bold text-gray-700 uppercase">
                                                Nama / NIP Guru Spesifik (1 Orang Tetap)
                                            </label>
                                            <div className="grid grid-cols-1 gap-1.5">
                                                <select
                                                    value={activeCellData.value?.startsWith('$NAMA_PENGAJAR_') ? activeCellData.value : ''}
                                                    className="w-full text-xs border rounded p-1.5 bg-gray-50 font-medium"
                                                    onChange={e => {
                                                        if (e.target.value) updateActiveCell({ value: e.target.value });
                                                    }}
                                                >
                                                    <option value="">-- Sisipkan Nama Guru Spesifik --</option>
                                                    {settings.tenagaPengajar.map(t => (
                                                        <option key={t.id} value={`$NAMA_PENGAJAR_${t.id}`}>
                                                            Nama: {t.nama}
                                                        </option>
                                                    ))}
                                                </select>
                                                <select
                                                    value={activeCellData.value?.startsWith('$NIP_PENGAJAR_') ? activeCellData.value : ''}
                                                    className="w-full text-xs border rounded p-1.5 bg-gray-50 font-medium"
                                                    onChange={e => {
                                                        if (e.target.value) updateActiveCell({ value: e.target.value });
                                                    }}
                                                >
                                                    <option value="">-- Sisipkan NIP/NIY Guru Spesifik --</option>
                                                    {settings.tenagaPengajar.map(t => (
                                                        <option key={t.id} value={`$NIP_PENGAJAR_${t.id}`}>
                                                            NIP: {t.nama} ({formatTeacherNip(t)})
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <p className="text-[10px] text-indigo-700 bg-indigo-50 border border-indigo-100 rounded p-1.5 leading-snug">
                                                💡 <strong>Tips Rapor Hadits / Mutun:</strong> Gunakan tag <code>$NAMA_PENGAMPU</code> &amp; <code>$TTD_PENGAMPU</code> agar guru pengampu bisa diatur fleksibel (1 guru semua rombel, beda tiap rombel, atau ikut halaqah).
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Specific Teacher Signature & Custom Digital Asset Helper */}
                                {selectedTagCategory === 'media' && (
                                    <div className="space-y-2 mt-2">
                                        <div className="p-2 bg-white rounded-lg border border-purple-200 space-y-1.5">
                                            <label className="block text-[10px] font-bold text-gray-700 uppercase">TTD Pengajar / Pengurus Spesifik</label>
                                            <select
                                                id="specificTeacherTtdSelect"
                                                value={activeCellData.value?.startsWith('$TTD_PENGAJAR:') ? activeCellData.value : ''}
                                                className="w-full text-xs border rounded p-1.5 bg-gray-50 font-medium"
                                                onChange={e => {
                                                    if (e.target.value) updateActiveCell({ value: e.target.value });
                                                }}
                                            >
                                                <option value="">-- Pilih Guru / Pengurus --</option>
                                                {settings.tenagaPengajar.map(t => {
                                                    const hasTtd = Boolean(findStrictTeacherTtdAsset(digitalAssets, t));
                                                    return (
                                                        <option key={t.id} value={`$TTD_PENGAJAR:${t.id}`}>
                                                            {t.nama} {hasTtd ? '(✓ Ada TTD)' : '(Belum ada TTD)'}
                                                        </option>
                                                    );
                                                })}
                                            </select>
                                        </div>

                                        {digitalAssets.length > 0 && (
                                            <div className="p-2 bg-white rounded-lg border border-purple-200 space-y-1.5">
                                                <label className="block text-[10px] font-bold text-gray-700 uppercase">Pilih dari Daftar Aset Digital ($ASSET)</label>
                                                <select
                                                    value={activeCellData.value?.startsWith('$ASSET_') ? activeCellData.value : ''}
                                                    className="w-full text-xs border rounded p-1.5 bg-gray-50 font-medium"
                                                    onChange={e => {
                                                        if (e.target.value) updateActiveCell({ value: e.target.value });
                                                    }}
                                                >
                                                    <option value="">-- Pilih Aset Tersimpan --</option>
                                                    {digitalAssets.map(asset => (
                                                        <option key={asset.id} value={`$ASSET_${asset.id}`}>
                                                            [{asset.type.toUpperCase()}] {asset.namaPemilik} {asset.jabatan ? `— ${asset.jabatan}` : ''}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {(activeCellData.type === 'data' || activeCellData.type === 'label') &&
                            isTtdMediaCellValue(activeCellData.value, digitalAssets) && (() => {
                                const upperRaw = (activeCellData.value || '').trim().toUpperCase();
                                const isBuiltInCombined =
                                    upperRaw.includes('TTD_STEMPEL_') ||
                                    upperRaw.includes('STEMPEL_TTD_') ||
                                    upperRaw.includes('TTD_CAP_') ||
                                    (upperRaw.includes('STEMPEL') && upperRaw.includes('TTD'));
                                const overlayCfg = activeCellData.stempelOverlay;
                                const isOverlayActive = isBuiltInCombined
                                    ? overlayCfg?.enabled !== false
                                    : Boolean(overlayCfg?.enabled);
                                const currentSource = overlayCfg?.source || 'auto';
                                const currentPos = overlayCfg?.position || 'left';
                                const currentSize = overlayCfg?.size || 'md';
                                const showWhenEmpty = Boolean(overlayCfg?.showWhenTtdEmpty);
                                const stempelAssets = digitalAssets.filter(a => a.type === 'stempel');

                                return (
                                    <div className="space-y-2.5 p-3 bg-rose-50/70 rounded-xl border border-rose-200">
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="min-w-0">
                                                <div className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                                                    <i className="bi bi-patch-check-fill text-rose-600"></i>
                                                    <span>Stempel di Atas TTD</span>
                                                </div>
                                                <p className="text-[10px] text-rose-700/80 leading-tight mt-0.5">
                                                    Tumpuk cap stempel menimpa tanda tangan secara proporsional
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    updateActiveCell({
                                                        stempelOverlay: {
                                                            enabled: !isOverlayActive,
                                                            source: currentSource,
                                                            position: currentPos,
                                                            size: currentSize,
                                                            showWhenTtdEmpty: showWhenEmpty,
                                                        },
                                                    })
                                                }
                                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all shrink-0 ${
                                                    isOverlayActive
                                                        ? 'bg-rose-600 text-white border-rose-700 shadow-2xs'
                                                        : 'bg-white text-slate-600 border-slate-300 hover:bg-rose-100'
                                                }`}
                                            >
                                                {isOverlayActive ? 'Aktif' : 'Nonaktif'}
                                            </button>
                                        </div>

                                        {isOverlayActive && (
                                            <div className="space-y-2.5 pt-2 border-t border-rose-200/80">
                                                <div>
                                                    <label className="block text-[10px] font-bold text-rose-900 uppercase mb-1">
                                                        Sumber Gambar Stempel
                                                    </label>
                                                    <select
                                                        value={currentSource}
                                                        onChange={e =>
                                                            updateActiveCell({
                                                                stempelOverlay: {
                                                                    enabled: true,
                                                                    source: e.target.value,
                                                                    position: currentPos,
                                                                    size: currentSize,
                                                                    showWhenTtdEmpty: showWhenEmpty,
                                                                },
                                                            })
                                                        }
                                                        className="w-full text-xs border border-rose-200 rounded-lg p-1.5 bg-white font-medium text-slate-800"
                                                    >
                                                        <option value="auto">
                                                            Otomatis (Stempel Marhalah → Stempel Pondok)
                                                        </option>
                                                        <option value="ponpes">
                                                            Stempel Resmi Utama Pondok ($STEMPEL_PONPES)
                                                        </option>
                                                        <option value="marhalah">
                                                            Khusus Stempel Marhalah Santri ($STEMPEL_MARHALAH)
                                                        </option>
                                                        {(settings.jenjang || []).map(j => {
                                                            const hasJStempel = Boolean(findJenjangStempelAsset(digitalAssets, j));
                                                            return (
                                                                <option key={j.id} value={`jenjang:${j.id}`}>
                                                                    Stempel Marhalah: {j.nama} {hasJStempel ? '(✓ Ada)' : '(Belum diunggah)'}
                                                                </option>
                                                            );
                                                        })}
                                                        {stempelAssets
                                                            .filter(a => !a.systemRole && a.jenjangId === undefined)
                                                            .map(a => (
                                                                <option key={a.id} value={`asset:${a.id}`}>
                                                                    Aset Stempel: {a.namaPemilik}
                                                                </option>
                                                            ))}
                                                    </select>
                                                </div>

                                                <div className="grid grid-cols-2 gap-2">
                                                    <div>
                                                        <label className="block text-[10px] font-bold text-rose-900 uppercase mb-1">
                                                            Posisi Stempel
                                                        </label>
                                                        <div className="grid grid-cols-3 rounded-lg border border-rose-200 bg-white overflow-hidden">
                                                            {([
                                                                { id: 'left', label: 'Kiri', title: 'Sisi kiri TTD (Standar Resmi Indonesia)' },
                                                                { id: 'center', label: 'Tengah', title: 'Tepat di tengah TTD' },
                                                                { id: 'right', label: 'Kanan', title: 'Sisi kanan TTD (Cocok untuk Rapor Arab / RTL)' },
                                                            ] as const).map(opt => (
                                                                <button
                                                                    key={opt.id}
                                                                    type="button"
                                                                    title={opt.title}
                                                                    onClick={() =>
                                                                        updateActiveCell({
                                                                            stempelOverlay: {
                                                                                enabled: true,
                                                                                source: currentSource,
                                                                                position: opt.id,
                                                                                size: currentSize,
                                                                                showWhenTtdEmpty: showWhenEmpty,
                                                                            },
                                                                        })
                                                                    }
                                                                    className={`py-1 text-[10px] font-bold transition-colors ${
                                                                        currentPos === opt.id
                                                                            ? 'bg-rose-600 text-white'
                                                                            : 'text-slate-600 hover:bg-rose-50'
                                                                    }`}
                                                                >
                                                                    {opt.label}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <label className="block text-[10px] font-bold text-rose-900 uppercase mb-1">
                                                            Ukuran Cap
                                                        </label>
                                                        <div className="grid grid-cols-3 rounded-lg border border-rose-200 bg-white overflow-hidden">
                                                            {([
                                                                { id: 'sm', label: 'Kecil' },
                                                                { id: 'md', label: 'Normal' },
                                                                { id: 'lg', label: 'Besar' },
                                                            ] as const).map(opt => (
                                                                <button
                                                                    key={opt.id}
                                                                    type="button"
                                                                    onClick={() =>
                                                                        updateActiveCell({
                                                                            stempelOverlay: {
                                                                                enabled: true,
                                                                                source: currentSource,
                                                                                position: currentPos,
                                                                                size: opt.id,
                                                                                showWhenTtdEmpty: showWhenEmpty,
                                                                            },
                                                                        })
                                                                    }
                                                                    className={`py-1 text-[10px] font-bold transition-colors ${
                                                                        currentSize === opt.id
                                                                            ? 'bg-rose-600 text-white'
                                                                            : 'text-slate-600 hover:bg-rose-50'
                                                                    }`}
                                                                >
                                                                    {opt.label}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>

                                                <label className="flex items-start gap-2 pt-0.5 cursor-pointer select-none">
                                                    <input
                                                        type="checkbox"
                                                        checked={showWhenEmpty}
                                                        onChange={e =>
                                                            updateActiveCell({
                                                                stempelOverlay: {
                                                                    enabled: true,
                                                                    source: currentSource,
                                                                    position: currentPos,
                                                                    size: currentSize,
                                                                    showWhenTtdEmpty: e.target.checked,
                                                                },
                                                            })
                                                        }
                                                        className="mt-0.5 rounded text-rose-600 focus:ring-rose-500"
                                                    />
                                                    <span className="text-[10px] text-slate-700 leading-snug">
                                                        Tetap cetak stempel meskipun TTD pejabat belum diunggah{' '}
                                                        <span className="text-slate-400">(jika tidak dicentang, area dikosongkan untuk TTD &amp; cap basah)</span>
                                                    </span>
                                                </label>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}
                        {activeTemplate &&
                            (activeCellData.type === 'data' || activeCellData.type === 'label' || activeCellData.type === 'formula') &&
                            /\$(?:TTD_(?:STEMPEL_)?|STEMPEL_TTD_|NAMA_|NIP_|NIY_|JABATAN_|LABEL_)?(?:PENGAMPU|GURU_KHUSUS|PENGUJI)(?:_(\d+))?/i.test(activeCellData.value || '') && (() => {
                                const m = (activeCellData.value || '').toUpperCase().match(/(?:PENGAMPU|GURU_KHUSUS|PENGUJI)(?:_(\d+))?/);
                                const detectedSlot = m?.[1] ? Math.max(1, parseInt(m[1], 10)) : 1;
                                const { simRombel } = getTemplateSimulatedHierarchy();
                                return (
                                    <div className="p-3 bg-indigo-50/70 rounded-xl border border-indigo-200 space-y-2 mt-2">
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-1.5">
                                                <i className="bi bi-person-workspace text-indigo-600 text-sm"></i>
                                                <span className="text-xs font-bold text-indigo-950">
                                                    Konfigurasi Pengampu / Guru Khusus
                                                </span>
                                            </div>
                                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800">
                                                Slot #{detectedSlot}
                                            </span>
                                        </div>
                                        <RaporCustomSignatoryConfigurator
                                            template={activeTemplate}
                                            settings={settings}
                                            digitalAssets={digitalAssets}
                                            canWrite={canWrite}
                                            compact
                                            focusSlot={detectedSlot}
                                            activeRombelId={simRombel?.id}
                                            onChangeSignatories={handleUpdateCustomSignatories}
                                            onInsertTagToActiveCell={tag => updateActiveCell({ type: 'data', value: tag })}
                                        />
                                    </div>
                                );
                            })()}
                        {activeCellData.type === 'dropdown' && (
                            <div className="space-y-3 p-3 bg-orange-50/70 rounded-xl border border-orange-200">
                                <div>
                                    <label className="block text-xs font-bold mb-1 text-orange-800 flex items-center justify-between">
                                        <span>KODE VARIABEL ($)</span>
                                        <span className="text-[10px] text-orange-600 font-normal">Wajib diisi</span>
                                    </label>
                                    <input 
                                        type="text" 
                                        value={activeCellData.key || ''} 
                                        onChange={e => updateActiveCell({ key: e.target.value })} 
                                        className="w-full border rounded-lg p-2 text-sm font-mono uppercase bg-white focus:ring-2 focus:ring-orange-500" 
                                        placeholder="CONTOH: SIKAP_1"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold mb-1 text-orange-800">Daftar Pilihan (Pisahkan dengan koma)</label>
                                    <textarea
                                        value={(activeCellData.options || []).join(', ')}
                                        onChange={e => {
                                            const opts = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                                            updateActiveCell({ options: opts });
                                        }}
                                        className="w-full border rounded-lg p-2 text-xs bg-white focus:ring-2 focus:ring-orange-500"
                                        rows={2}
                                        placeholder="Sangat Baik, Baik, Cukup, Kurang"
                                    />
                                </div>

                                {/* Preset Templates for Dropdowns */}
                                <div className="space-y-1.5">
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase">Template Pilihan Cepat</label>
                                    <div className="flex flex-wrap gap-1">
                                        {[
                                            { label: 'A, B, C, D, E', opts: ['A', 'B', 'C', 'D', 'E'] },
                                            { label: 'Sangat Baik - Kurang', opts: ['Sangat Baik', 'Baik', 'Cukup', 'Kurang'] },
                                            { label: 'Mumtaz - Rosib', opts: ['Mumtaz', 'Jayyid Jiddan', 'Jayyid', 'Maqbul', 'Rosib'] },
                                            { label: 'Tuntas / Belum', opts: ['Tuntas', 'Belum Tuntas'] },
                                            { label: 'Hadir, Izin, Sakit, Alpa', opts: ['Hadir', 'Izin', 'Sakit', 'Alpa'] },
                                            { label: 'Naik / Tinggal', opts: ['Naik Kelas', 'Tinggal Kelas'] }
                                        ].map(preset => (
                                            <button
                                                key={preset.label}
                                                type="button"
                                                onClick={() => updateActiveCell({ options: preset.opts })}
                                                className="px-2 py-1 rounded bg-white hover:bg-orange-100 border border-orange-200 text-[10px] font-bold text-orange-800 transition-colors shadow-2xs"
                                            >
                                                {preset.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {activeCellData.options && activeCellData.options.length > 0 && (
                                    <div className="pt-2 border-t border-orange-200">
                                        <div className="text-[10px] font-bold text-orange-900 mb-1">Pratinjau Opsi ({activeCellData.options.length}):</div>
                                        <div className="flex flex-wrap gap-1">
                                            {activeCellData.options.map((opt, i) => (
                                                <span key={i} className="bg-white border border-orange-300 text-orange-800 text-[10px] px-1.5 py-0.5 rounded font-medium">
                                                    {opt}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                        {activeCellData.type === 'input' && (
                            <div className="space-y-2.5">
                                <div>
                                    <label className="block text-xs font-bold mb-1 text-blue-700">KODE VARIABEL ($)</label>
                                    <input 
                                        type="text" 
                                        value={activeCellData.key || ''} 
                                        onChange={e => updateActiveCell({ key: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '') })} 
                                        className="w-full border rounded p-2 text-sm font-mono uppercase" 
                                        placeholder="CONTOH: AKHLAK atau UH1"
                                    />
                                    <p className="text-[10px] text-gray-400 mt-0.5">Kode unik untuk referensi rumus &amp; kolom Leger Input (tanpa spasi).</p>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold mb-1 text-slate-700">JENIS ISIAN DI LEGER INPUT</label>
                                    <select
                                        value={activeCellData.inputMode || 'auto'}
                                        onChange={e => {
                                            const val = e.target.value as RaporInputMode;
                                            updateActiveCell({ inputMode: val === 'auto' ? undefined : val });
                                        }}
                                        className="w-full border border-slate-300 rounded-lg p-2 text-xs font-bold bg-white text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                                    >
                                        <option value="auto">Otomatis (Nilai Angka / Deteksi Cerdas)</option>
                                        <option value="number">Nilai Angka (0–100 + Validasi KKM)</option>
                                        <option value="text">Teks / Catatan Panjang</option>
                                    </select>
                                    <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                                        {(() => {
                                            const rowInspectForInput = inspectSheetRowKkm({
                                                sheetCells: activeTemplate?.cells,
                                                row: activeCellData.row,
                                                col: activeCellData.col,
                                                mataPelajaran: settings.mataPelajaran || [],
                                                preferredJenjangId: activeTemplate?.jenjangId
                                            });
                                            const cls = classifyRaporInputField({
                                                key: activeCellData.key || 'NILAI',
                                                label: rowInspectForInput.detectedLabel,
                                                type: activeCellData.type,
                                                inputMode: activeCellData.inputMode,
                                                mataPelajaran: settings.mataPelajaran || [],
                                                jenjangId: activeTemplate?.jenjangId
                                            });
                                            if (cls.isLongText) {
                                                return 'Tampil sebagai kolom Teks / Catatan lebar di Leger Input Wali Kelas.';
                                            }
                                            if (cls.isAttendanceCount) {
                                                return 'Tampil sebagai kolom angka jumlah hari presensi (tanpa KKM).';
                                            }
                                            return `Tampil sebagai kolom Input Nilai Angka (KKM: ${cls.kkm}${rowInspectForInput.matchedMapel ? ` • ${rowInspectForInput.matchedMapel.nama}` : ''}) di Leger Input & ikut dihitung rata-rata.`;
                                        })()}
                                    </p>
                                </div>
                                
                                {/* Variable List Helper */}
                                <div className="bg-blue-50 p-2 rounded border border-blue-100 text-xs">
                                    <div className="font-bold text-blue-800 mb-1">Variabel Tersedia:</div>
                                    <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                                        {activeTemplate?.cells.flat()
                                            .filter(c => c.key && c.key !== activeCellData.key)
                                            .map(c => (
                                                <span key={c.id} className="bg-white border border-blue-200 px-1.5 py-0.5 rounded text-[10px] font-mono text-blue-600">
                                                    ${c.key}
                                                </span>
                                            ))
                                        }
                                        {activeTemplate?.cells.flat().filter(c => c.key).length === 0 && <span className="text-gray-400 italic">Belum ada variabel lain.</span>}
                                    </div>
                                </div>
                            </div>
                        )}
                         {activeCellData.type === 'formula' && (
                            <div className="space-y-2">
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold text-yellow-700">Rumus</label>
                                    <input 
                                        ref={sidebarFormulaInputRef}
                                        type="text" 
                                        value={activeCellData.value} 
                                        onFocus={() => {
                                            formulaInputHistoryPushedRef.current = false;
                                            formulaPickedSpanRef.current = null;
                                            setActiveFormulaSource('sidebar');
                                            activeFormulaSourceRef.current = 'sidebar';
                                        }}
                                        onClick={() => {
                                            formulaPickedSpanRef.current = null;
                                        }}
                                        onBlur={() => {
                                            setTimeout(() => {
                                                if (isFormulaSelectingRef.current) return;
                                                if (activeFormulaSourceRef.current === 'sidebar' && document.activeElement !== sidebarFormulaInputRef.current) {
                                                    const closedVal = autoCloseFormulaParens(activeCellData.value || '');
                                                    if (closedVal !== (activeCellData.value || '')) {
                                                        updateActiveCell({ value: closedVal });
                                                    }
                                                    formulaPickedSpanRef.current = null;
                                                    setActiveFormulaSource(null);
                                                    activeFormulaSourceRef.current = null;
                                                }
                                            }, 150);
                                        }}
                                        onChange={e => {
                                            formulaPickedSpanRef.current = null;
                                            updateActiveCell({ value: e.target.value });
                                        }} 
                                        onKeyDown={e => {
                                            if (e.key === 'F4') {
                                                e.preventDefault();
                                                handleCycleFormulaLock();
                                                return;
                                            }
                                            if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
                                                formulaPickedSpanRef.current = null;
                                            }
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                finishFormulaPointMode();
                                            }
                                        }}
                                        className="w-full border rounded p-2 text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none" 
                                        placeholder="=SUM(D6:D15) atau =RATA2(D6:D15)"
                                    />
                                    <div className="flex flex-wrap gap-1">
                                        {(['=SUM(', '=RATA2(', '=KKM(', '=ROUND(', '=FIXED(', '=RATA2_KELAS(', '=TERBILANG(', '=PREDIKAT('] as const).map(starter => (
                                            <button
                                                key={starter}
                                                type="button"
                                                onClick={() => {
                                                    formulaPickedSpanRef.current = null;
                                                    updateActiveCell({ value: starter });
                                                    setActiveFormulaSource('sidebar');
                                                    activeFormulaSourceRef.current = 'sidebar';
                                                    requestAnimationFrame(() => {
                                                        if (sidebarFormulaInputRef.current) {
                                                            sidebarFormulaInputRef.current.focus({ preventScroll: true });
                                                            sidebarFormulaInputRef.current.setSelectionRange(starter.length, starter.length);
                                                        }
                                                    });
                                                }}
                                                className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded text-[10px] font-mono font-bold transition-colors"
                                                title={`Mulai rumus ${starter}...) lalu langsung blok sel nilai di tabel`}
                                            >
                                                + {starter}...)
                                            </button>
                                        ))}
                                        <button
                                            type="button"
                                            onMouseDown={(e) => {
                                                e.preventDefault();
                                                setActiveFormulaSource('sidebar');
                                                activeFormulaSourceRef.current = 'sidebar';
                                                handleCycleFormulaLock();
                                            }}
                                            className="px-2 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded text-[10px] font-mono font-bold transition-colors"
                                            title="Kunci / lepas simbol $ pada koordinat sel di kursor (sama seperti tombol F4 di Excel: D6 → $D$6 → D$6 → $D6)"
                                        >
                                            🔒 Kunci $ (F4)
                                        </button>
                                    </div>
                                    <div className="pt-1 border-t border-slate-100 space-y-1">
                                        <span className="block text-[10px] font-semibold text-slate-500">Sisip Cepat Titimangsa &amp; Tanggal Rapor:</span>
                                        <div className="flex flex-wrap gap-1">
                                            {([
                                                { expr: '=TITIMANGSA()', label: '=TITIMANGSA()', desc: 'Tempat & Tanggal sesuai pengaturan di Cetak Rapor' },
                                                { expr: '=TITIMANGSA_GABUNGAN()', label: 'Titimangsa Hijriah+Masehi', desc: 'Contoh: Banyumas, 5 Muharram 1448 H / 20 Juni 2026 M' },
                                                { expr: '=TITIMANGSA_MASEHI()', label: 'Titimangsa Masehi', desc: 'Contoh: Banyumas, 20 Juni 2026' },
                                                { expr: '=TITIMANGSA_HIJRIAH()', label: 'Titimangsa Hijriah', desc: 'Contoh: Banyumas, 5 Muharram 1448 H' },
                                                { expr: '=TEMPAT_RAPOR()', label: 'Tempat Saja', desc: 'Nama kota/tempat rapor saja (Contoh: Banyumas)' },
                                                { expr: '=TANGGAL_RAPOR_GABUNGAN()', label: 'Tgl Gabungan Saja', desc: 'Tanggal Hijriah & Masehi tanpa nama kota' },
                                                { expr: '=TANGGAL_RAPOR_HIJRIAH()', label: 'Tgl Hijriah Saja', desc: 'Tanggal Hijriah saja tanpa nama kota' },
                                                { expr: '=TANGGAL_RAPOR_MASEHI()', label: 'Tgl Masehi Saja', desc: 'Tanggal Masehi saja tanpa nama kota' }
                                            ] as const).map(item => (
                                                <button
                                                    key={item.expr}
                                                    type="button"
                                                    onClick={() => {
                                                        formulaPickedSpanRef.current = null;
                                                        updateActiveCell({ value: item.expr });
                                                        setActiveFormulaSource('sidebar');
                                                        activeFormulaSourceRef.current = 'sidebar';
                                                    }}
                                                    className="px-1.5 py-0.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded text-[10px] font-mono font-semibold transition-colors"
                                                    title={`${item.expr} — ${item.desc}`}
                                                >
                                                    {item.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-emerald-700 bg-emerald-50/80 border border-emerald-200 rounded px-2 py-1 leading-snug">
                                        <i className="bi bi-cursor-fill mr-1"></i>
                                        <strong>Seperti Excel:</strong> Blok sel di tabel untuk menyisipkan rentang, tekan <strong>F4</strong> untuk mengunci <code>$D$6 / D$6 / $D6</code>, lalu tarik titik sudut sel ke bawah/samping untuk melanjutkan rumus!
                                    </p>
                                </div>
                                
                                {/* Formula Guide & Helpers */}
                                <div className="bg-yellow-50 p-2 rounded border border-yellow-100 text-xs space-y-2">
                                    <div className="font-bold text-yellow-800 border-b border-yellow-200 pb-1 mb-1">Panduan & Helper</div>
                                    
                                    {/* Ranking Helper */}
                                    <div className="bg-white p-2 rounded border border-yellow-200 space-y-1.5">
                                        <label className="block font-bold text-gray-700 text-[11px]">Buat Peringkat (Ranking)</label>
                                        <div className="space-y-1">
                                            <select id="rankSourceSelect" className="w-full border rounded px-1.5 py-1 text-[10px] bg-gray-50 font-mono">
                                                <option value="">-- Pilih Sumber Nilai --</option>
                                                {activeTemplate?.cells.flat()
                                                    .filter(c => c.key && c.key !== activeCellData.key)
                                                    .map(c => <option key={c.id} value={c.key}>${c.key}</option>)
                                                }
                                            </select>
                                            <div className="flex gap-1">
                                                <select id="rankScopeSelect" className="flex-grow border rounded px-1.5 py-1 text-[10px] bg-gray-50 font-medium">
                                                    <option value="rombel">Per Rombel (Standar)</option>
                                                    <option value="kelas">Per Tingkat Kelas</option>
                                                    <option value="jenjang">Per Jenjang</option>
                                                </select>
                                                <button 
                                                    type="button"
                                                    onClick={() => {
                                                        const sel = document.getElementById('rankSourceSelect') as HTMLSelectElement;
                                                        const scopeSel = document.getElementById('rankScopeSelect') as HTMLSelectElement;
                                                        if(sel.value) {
                                                            const scope = scopeSel?.value || 'rombel';
                                                            updateActiveCell({ value: `RANK($${sel.value}, "${scope}")` });
                                                        }
                                                    }}
                                                    className="bg-yellow-600 text-white px-2.5 py-1 rounded text-xs font-bold hover:bg-yellow-700 transition-colors shrink-0"
                                                >
                                                    Terapkan
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <details className="cursor-pointer group">
                                        <summary className="font-semibold text-yellow-700 hover:underline">Lihat Daftar Rumus &amp; Kode Pejabat</summary>
                                        <ul className="mt-1 space-y-1 text-[10px] text-gray-600 pl-2 border-l-2 border-yellow-300">
                                            <li><code>=SUM(D6:D15)</code> : Jumlahkan blok sel (bisa seret/blok langsung di tabel)</li>
                                            <li><code>=RATA2(D6:D15)</code> : Rata-rata blok sel santri (atau <code>=RATA2($A, $B)</code>)</li>
                                            <li><code>=RATA2_KELAS(D6)</code> : Rerata kelas suatu mapel (klik sel mapel / <code>$KODE</code>; alias <code>=RERATA_KELAS</code>, <code>=NRK</code>)</li>
                                            <li><code>=RATA2_KELAS()</code> / <code>$RATA_RATA_KELAS</code> : Rata-rata umum seluruh kelas/rombel</li>
                                            <li><code>=KKM(B6)</code> / <code>=KKM()</code> / <code>$KKM</code> : Ambil KKM otomatis dari Data Master sesuai nama mapel manual di sel <code>B6</code> atau baris aktif (bisa fallback <code>=KKM(B6, 75)</code>)</li>
                                            <li><code>=ROUND(D6, 2)</code> / <code>=BULAT(D6, 2)</code> : Bulatkan ke 1, 2, atau 3 angka di belakang koma</li>
                                            <li><code>=FIXED(RATA2(D6:D15), 2)</code> / <code>=DESIMAL(..., 2)</code> : Format desimal tetap (misal <code>85,50</code>)</li>
                                            <li><code>=ROUNDUP(D6, 1)</code> / <code>=ROUNDDOWN(D6, 1)</code> : Bulatkan ke atas / ke bawah</li>
                                            <li><code>=TERBILANG(D6)</code> : Angka ke huruf Indonesia</li>
                                            <li><code>=ARAB(D6)</code> : Angka ke Arab-Timur (٨٨)</li>
                                            <li><code>=PREDIKAT(D6, "pesantren")</code> : Mumtaz / Jayyid Jiddan</li>
                                            <li><code>=PREDIKAT(D6, "huruf")</code> : Predikat A / B / C / D</li>
                                            <li><code>=IF(D6&gt;=KKM(B6), "Tuntas", "Remidi")</code> : Logika syarat ketuntasan otomatis terhadap KKM Data Master</li>
                                            <li><code>=MAX(D6:D15)</code> / <code>=MIN(D6:D15)</code> : Nilai tertinggi / terendah</li>
                                            <li><code>=RANK($TOTAL_NILAI, "rombel")</code> : Peringkat kelas otomatis</li>
                                            <li><code>=CONCAT("Semester ", $SEMESTER)</code> : Gabung teks (spasi dalam kutip terjaga)</li>
                                            <li><code>=CONCAT_SPASI("Kelas", $KELAS)</code> : Gabung teks otomatis dipisah spasi</li>
                                            <li><code>="Marhalah " &amp; $JENJANG</code> : Operator gabung teks <code>&amp;</code></li>
                                            <li><code>=UPPER($NAMA)</code> / <code>=LOWER($NAMA)</code> / <code>=PROPER($NAMA)</code> : Format HURUF BESAR / kecil / Judul</li>
                                            <li><code>=TAHUN_AJAR()</code> / <code>=TAHUN_AJAR_MASEHI()</code> / <code>=TAHUN_AJAR_HIJRIAH()</code> / <code>=TAHUN_AJAR_GABUNGAN()</code> : Tahun Ajaran</li>
                                            <li><code>=SEMESTER()</code> / <code>$SEMESTER</code> : Semester Aktif</li>
                                            <li><code>=TITIMANGSA()</code> : Tempat &amp; tanggal rapor sesuai pengaturan di Cetak Rapor (atau mode <code>&quot;gabungan&quot;</code>, <code>&quot;masehi&quot;</code>, <code>&quot;hijriah&quot;</code>, <code>&quot;dua_baris&quot;</code>, <code>&quot;arab&quot;</code>)</li>
                                            <li><code>=TITIMANGSA_GABUNGAN()</code> / <code>=TITIMANGSA_MASEHI()</code> / <code>=TITIMANGSA_HIJRIAH()</code> : Titimangsa gabungan Hijriah+Masehi atau masing-masing</li>
                                            <li><code>=TEMPAT_RAPOR()</code> : Nama tempat/kota penandatanganan rapor saja</li>
                                            <li><code>=TANGGAL_RAPOR()</code> / <code>=TANGGAL_RAPOR_GABUNGAN()</code> / <code>=TANGGAL_RAPOR_MASEHI()</code> / <code>=TANGGAL_RAPOR_HIJRIAH()</code> : Tanggal rapor saja (tanpa kota)</li>
                                            <li><code>$NAMA_WALI_KELAS</code>, <code>$NIP_WALI_KELAS</code>, <code>$TTD_WALI_KELAS</code> : Wali Kelas</li>
                                            <li><code>$JABATAN_PENGAMPU</code>, <code>$NAMA_PENGAMPU</code>, <code>$NIP_PENGAMPU</code>, <code>$TTD_PENGAMPU</code> : Pengampu / Guru Khusus (Global / Per Rombel / Halaqah)</li>
                                            <li><code>$NAMA_MUDIR_MARHALAH</code>, <code>$NIP_MUDIR_MARHALAH</code>, <code>$TTD_MUDIR_MARHALAH</code> : Mudir Marhalah</li>
                                            <li><code>$NAMA_MUDIR</code>, <code>$NIP_MUDIR</code>, <code>$TTD_MUDIR</code> : Mudir Aam / Pimpinan</li>
                                        </ul>
                                    </details>
                                </div>
                            </div>
                        )}
                         {/* DIMENSI KOLOM & BARIS (SEPERTI EXCEL) */}
                         <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-3 mt-3">
                            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                    <i className="bi bi-arrows-angle-expand text-teal-600"></i> Dimensi Sel & Header
                                </span>
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-teal-100 text-teal-800 font-bold">
                                    Sel {getExcelColName(activeCellData.col)}{activeCellData.row + 1}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2.5">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                                        <span>Lebar Kolom</span>
                                        <span className="text-[9px] text-slate-400 font-normal">Kolom {getExcelColName(activeCellData.col)}</span>
                                    </label>
                                    <div className="flex items-center">
                                        <input 
                                            type="number" 
                                            min="8" 
                                            max="800" 
                                            value={getColWidth(activeCellData.col)} 
                                            onChange={e => handleUpdateColWidth(activeCellData.col, Math.max(8, parseInt(e.target.value) || 8))} 
                                            className="w-full border rounded-l-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                                            title="Ubah lebar kolom (live preview, bisa sampai mepet 8px seperti Excel)"
                                        />
                                        <span className="bg-slate-200 border border-l-0 rounded-r-lg px-2 py-1.5 text-[10px] text-slate-600 font-mono font-bold">px</span>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                                        <span>Tinggi Baris</span>
                                        <span className="text-[9px] text-slate-400 font-normal">Baris {activeCellData.row + 1}</span>
                                    </label>
                                    <div className="flex items-center">
                                        <input 
                                            type="number" 
                                            min="8" 
                                            max="500" 
                                            value={getRowHeight(activeCellData.row)} 
                                            onChange={e => handleUpdateRowHeight(activeCellData.row, Math.max(8, parseInt(e.target.value) || 8))} 
                                            className="w-full border rounded-l-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                                            title="Ubah tinggi baris (live preview, bisa sampai mepet 8px seperti Excel)"
                                        />
                                        <span className="bg-slate-200 border border-l-0 rounded-r-lg px-2 py-1.5 text-[10px] text-slate-600 font-mono font-bold">px</span>
                                    </div>
                                </div>
                            </div>

                            {/* Quick Presets for Width and Height */}
                            <div className="space-y-1.5 pt-1 border-t border-slate-200/60">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Preset Cepat:</span>
                                <div className="flex flex-wrap gap-1">
                                    <button 
                                        type="button" 
                                        onClick={() => { handleUpdateColWidth(activeCellData.col, 15); handleUpdateRowHeight(activeCellData.row, 20); }} 
                                        className="px-2 py-1 bg-white hover:bg-teal-50 hover:border-teal-300 border rounded text-[10px] font-medium text-slate-700 transition-colors shadow-2xs"
                                        title="Set sangat mepet lebar 15px dan tinggi 20px (cocok untuk No. urut / checklist)"
                                    >
                                        Mepet (15×20)
                                    </button>
                                    <button 
                                        type="button" 
                                        onClick={() => { handleUpdateColWidth(activeCellData.col, 30); handleUpdateRowHeight(activeCellData.row, 26); }} 
                                        className="px-2 py-1 bg-white hover:bg-teal-50 hover:border-teal-300 border rounded text-[10px] font-medium text-slate-700 transition-colors shadow-2xs"
                                        title="Set sempit lebar 30px dan tinggi 26px"
                                    >
                                        Sempit (30×26)
                                    </button>
                                    <button 
                                        type="button" 
                                        onClick={() => { handleUpdateColWidth(activeCellData.col, 60); handleUpdateRowHeight(activeCellData.row, 28); }} 
                                        className="px-2 py-1 bg-white hover:bg-teal-50 hover:border-teal-300 border rounded text-[10px] font-medium text-slate-700 transition-colors shadow-2xs"
                                        title="Set lebar 60px dan tinggi 28px"
                                    >
                                        Kecil (60×28)
                                    </button>
                                    <button 
                                        type="button" 
                                        onClick={() => { handleUpdateColWidth(activeCellData.col, 100); handleUpdateRowHeight(activeCellData.row, 32); }} 
                                        className="px-2 py-1 bg-white hover:bg-teal-50 hover:border-teal-300 border rounded text-[10px] font-medium text-slate-700 transition-colors shadow-2xs"
                                        title="Set lebar 100px dan tinggi 32px"
                                    >
                                        Standar (100×32)
                                    </button>
                                    <button 
                                        type="button" 
                                        onClick={() => { handleUpdateColWidth(activeCellData.col, 160); handleUpdateRowHeight(activeCellData.row, 38); }} 
                                        className="px-2 py-1 bg-white hover:bg-teal-50 hover:border-teal-300 border rounded text-[10px] font-medium text-slate-700 transition-colors shadow-2xs"
                                        title="Set lebar 160px dan tinggi 38px"
                                    >
                                        Lebar (160×38)
                                    </button>
                                    <button 
                                        type="button" 
                                        onClick={() => { handleUpdateRowHeight(activeCellData.row, 50); }} 
                                        className="px-2 py-1 bg-white hover:bg-teal-50 hover:border-teal-300 border rounded text-[10px] font-medium text-slate-700 transition-colors shadow-2xs"
                                        title="Set tinggi baris 50px"
                                    >
                                        Tinggi (50px)
                                    </button>
                                </div>
                            </div>

                            {/* Flexible Sheet-wide Dimension Utilities */}
                            {canWrite && (
                                <div className="space-y-1.5 pt-1.5 border-t border-slate-200/60">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Atur Seluruh Lembar:</span>
                                    <div className="grid grid-cols-2 gap-1.5">
                                        <button
                                            type="button"
                                            onClick={() => handleSetAllColWidths(100)}
                                            className="px-2 py-1.5 bg-slate-100 hover:bg-teal-50 hover:text-teal-800 border rounded text-[10.5px] font-bold text-slate-700 transition-colors shadow-2xs flex items-center justify-center gap-1"
                                            title="Atur semua kolom menjadi seragam 100px"
                                        >
                                            <i className="bi bi-distribute-horizontal text-teal-600"></i>
                                            <span>Kolom 100px</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleSetAllRowHeights(32)}
                                            className="px-2 py-1.5 bg-slate-100 hover:bg-teal-50 hover:text-teal-800 border rounded text-[10.5px] font-bold text-slate-700 transition-colors shadow-2xs flex items-center justify-center gap-1"
                                            title="Atur semua baris menjadi seragam 32px"
                                        >
                                            <i className="bi bi-distribute-vertical text-teal-600"></i>
                                            <span>Baris 32px</span>
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                                        <button
                                            type="button"
                                            onClick={handleFitColumnsToPageWidth}
                                            className="py-1.5 px-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded text-[10px] font-bold transition-colors flex items-center justify-center gap-1 shadow-2xs"
                                            title="Sesuaikan otomatis lebar seluruh kolom agar pas tepat 1 lembar kertas A4 tanpa terpotong di kanan"
                                        >
                                            <i className="bi bi-arrows-collapse text-indigo-600"></i>
                                            <span>Pas Lebar A4</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleResetDimensions}
                                            className="py-1.5 px-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded text-[10px] font-semibold transition-colors flex items-center justify-center gap-1 shadow-2xs"
                                            title="Kembalikan semua ukuran kolom dan baris ke standar (100px × 30px) agar sefleksibel membuat template dari nol"
                                        >
                                            <i className="bi bi-arrow-counterclockwise text-slate-500"></i>
                                            <span>Reset (100×30)</span>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Actions: Sisipkan & Hapus Baris / Kolom Aktif */}
                            {canWrite && (
                                <div className="pt-2 border-t border-slate-200/60 space-y-1.5">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Sisipkan / Hapus di Sel Aktif:</span>
                                    <div className="grid grid-cols-2 gap-1.5">
                                        <button
                                            type="button"
                                            onClick={() => handleInsertRowRelative('above')}
                                            className="px-2 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-lg text-[10.5px] font-bold flex items-center justify-center gap-1 transition-colors shadow-2xs"
                                        >
                                            <i className="bi bi-arrow-bar-up"></i>
                                            <span>+ Baris Atas</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleInsertRowRelative('below')}
                                            className="px-2 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-lg text-[10.5px] font-bold flex items-center justify-center gap-1 transition-colors shadow-2xs"
                                        >
                                            <i className="bi bi-arrow-bar-down"></i>
                                            <span>+ Baris Bawah</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleInsertColRelative('left')}
                                            className="px-2 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-lg text-[10.5px] font-bold flex items-center justify-center gap-1 transition-colors shadow-2xs"
                                        >
                                            <i className="bi bi-arrow-bar-left"></i>
                                            <span>+ Kolom Kiri</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleInsertColRelative('right')}
                                            className="px-2 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-lg text-[10.5px] font-bold flex items-center justify-center gap-1 transition-colors shadow-2xs"
                                        >
                                            <i className="bi bi-arrow-bar-right"></i>
                                            <span>+ Kolom Kanan</span>
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                                        <button 
                                            type="button" 
                                            onClick={() => handleDeleteRow(activeCellData.row)} 
                                            disabled={!activeTemplate || activeTemplate.rowCount <= 1}
                                            className="px-2 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors disabled:opacity-40 disabled:hover:bg-red-50 shadow-2xs"
                                            title={`Hapus seluruh baris ke-${activeCellData.row + 1}`}
                                        >
                                            <i className="bi bi-trash3 text-red-600"></i>
                                            <span>Hapus Baris {activeCellData.row + 1}</span>
                                        </button>
                                        <button 
                                            type="button" 
                                            onClick={() => handleDeleteCol(activeCellData.col)} 
                                            disabled={!activeTemplate || activeTemplate.colCount <= 1}
                                            className="px-2 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors disabled:opacity-40 disabled:hover:bg-red-50 shadow-2xs"
                                            title={`Hapus seluruh kolom ${getExcelColName(activeCellData.col)}`}
                                        >
                                            <i className="bi bi-trash3 text-red-600"></i>
                                            <span>Hapus Kolom {getExcelColName(activeCellData.col)}</span>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Align, Font Size, Vertical Align & Float Text */}
                            <div className="pt-2 border-t border-slate-200/60 space-y-2.5">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-bold text-slate-700">Gaya, Font &amp; Perataan</label>
                                    <div className="flex items-center gap-1">
                                        {/* Ukuran Font (px) */}
                                        <div className="flex items-center border border-slate-200 rounded-lg bg-white overflow-hidden mr-1" title="Ukuran Font (px) - Tetap konsisten saat sel diperkecil">
                                            <button
                                                type="button"
                                                onClick={() => updateActiveCell({ fontSize: Math.max(7, (activeCellData.fontSize || 11) - 1) })}
                                                className="px-1.5 py-1 hover:bg-slate-100 text-slate-600 text-[10px] font-bold"
                                            >
                                                -
                                            </button>
                                            <input
                                                type="number"
                                                min="7"
                                                max="48"
                                                value={activeCellData.fontSize || 11}
                                                onChange={(e) => updateActiveCell({ fontSize: Math.max(7, Math.min(48, parseInt(e.target.value) || 11)) })}
                                                className="w-9 text-center text-[11px] font-mono font-bold text-slate-800 border-x border-slate-200 py-0.5 focus:outline-none"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => updateActiveCell({ fontSize: Math.min(48, (activeCellData.fontSize || 11) + 1) })}
                                                className="px-1.5 py-1 hover:bg-slate-100 text-slate-600 text-[10px] font-bold"
                                            >
                                                +
                                            </button>
                                        </div>

                                        {/* Bold & Italic */}
                                        <button 
                                            type="button" 
                                            onClick={() => updateActiveCell({ bold: !activeCellData.bold })} 
                                            className={`p-1.5 rounded-lg text-xs font-bold transition-all border ${activeCellData.bold ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'}`}
                                            title="Tebalkan Teks (Bold)"
                                        >
                                            <i className="bi bi-type-bold"></i>
                                        </button>
                                        <button 
                                            type="button" 
                                            onClick={() => updateActiveCell({ italic: !activeCellData.italic })} 
                                            className={`p-1.5 rounded-lg text-xs font-bold transition-all border ${activeCellData.italic ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'}`}
                                            title="Miringkan Teks (Italic)"
                                        >
                                            <i className="bi bi-type-italic"></i>
                                        </button>
                                    </div>
                                </div>

                                {/* Format Huruf / Text Case */}
                                <div>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Format Huruf (Case):</span>
                                    <div className="grid grid-cols-5 gap-1 bg-white p-0.5 rounded-lg border border-slate-200">
                                        {([
                                            { id: 'none', label: 'Normal', tip: 'Sesuai teks asli tanpa ubahan kapitalisasi' },
                                            { id: 'uppercase', label: 'AA', tip: 'HURUF BESAR SEMUA (UPPERCASE)' },
                                            { id: 'lowercase', label: 'aa', tip: 'huruf kecil semua (lowercase)' },
                                            { id: 'capitalize', label: 'Aa', tip: 'Kapital Setiap Kata / Judul (Title Case)' },
                                            { id: 'sentence', label: 'Ab.', tip: 'Kapital Awal Kalimat (Sentence case)' }
                                        ] as const).map(opt => {
                                            const isCur = (activeCellData.textTransform || 'none') === opt.id;
                                            return (
                                                <button
                                                    key={opt.id}
                                                    type="button"
                                                    onClick={() => updateActiveCell({ textTransform: opt.id })}
                                                    className={`py-1 px-1 rounded text-[11px] font-bold transition-colors flex items-center justify-center ${isCur ? 'bg-violet-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'}`}
                                                    title={opt.tip}
                                                >
                                                    {opt.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Pembulatan Desimal Ala Excel (0, 1, 2, 3 Digit di Belakang Koma) */}
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Pembulatan Desimal (Ala Excel):</span>
                                        <div className="flex items-center gap-1">
                                            <button
                                                type="button"
                                                onClick={() => handleStepDecimalPlaces(-1)}
                                                className="px-1.5 py-0.5 bg-white hover:bg-slate-100 border border-slate-200 rounded text-[10px] font-mono font-bold text-slate-700"
                                                title="Kurangi Digit Desimal (Decrease Decimal)"
                                            >
                                                .0←
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleStepDecimalPlaces(1)}
                                                className="px-1.5 py-0.5 bg-white hover:bg-slate-100 border border-slate-200 rounded text-[10px] font-mono font-bold text-slate-700"
                                                title="Tambah Digit Desimal (Increase Decimal)"
                                            >
                                                →.00
                                            </button>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-5 gap-1 bg-white p-0.5 rounded-lg border border-slate-200">
                                        {([
                                            { val: undefined, label: 'Auto', tip: 'Otomatis (tanpa nol berlebih di belakang koma)' },
                                            { val: 0, label: '0', tip: 'Bilangan bulat tanpa koma (Contoh: 86)' },
                                            { val: 1, label: '.0', tip: '1 digit di belakang koma (Contoh: 85,7)' },
                                            { val: 2, label: '.00', tip: '2 digit di belakang koma (Contoh: 85,67)' },
                                            { val: 3, label: '.000', tip: '3 digit di belakang koma (Contoh: 85,667)' }
                                        ] as const).map(opt => {
                                            const isCur = activeCellData.decimalPlaces === opt.val;
                                            return (
                                                <button
                                                    key={opt.label}
                                                    type="button"
                                                    onClick={() => updateActiveCell({ decimalPlaces: opt.val })}
                                                    className={`py-1 px-1 rounded text-[11px] font-mono font-bold transition-colors flex items-center justify-center ${
                                                        isCur ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
                                                    }`}
                                                    title={opt.tip}
                                                >
                                                    {opt.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Horizontal Align */}
                                <div>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Rata Horizontal:</span>
                                    <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200 w-full justify-between">
                                        <button 
                                            type="button" 
                                            onClick={() => updateActiveCell({ align: 'left' })} 
                                            className={`flex-1 py-1 rounded text-xs font-semibold transition-colors flex items-center justify-center gap-1 ${(activeCellData.align || 'center') === 'left' ? 'bg-teal-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                                            title="Rata Kiri"
                                        >
                                            <i className="bi bi-text-left"></i> Kiri
                                        </button>
                                        <button 
                                            type="button" 
                                            onClick={() => updateActiveCell({ align: 'center' })} 
                                            className={`flex-1 py-1 rounded text-xs font-semibold transition-colors flex items-center justify-center gap-1 ${(activeCellData.align || 'center') === 'center' ? 'bg-teal-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                                            title="Rata Tengah"
                                        >
                                            <i className="bi bi-text-center"></i> Tengah
                                        </button>
                                        <button 
                                            type="button" 
                                            onClick={() => updateActiveCell({ align: 'right' })} 
                                            className={`flex-1 py-1 rounded text-xs font-semibold transition-colors flex items-center justify-center gap-1 ${(activeCellData.align || 'center') === 'right' ? 'bg-teal-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                                            title="Rata Kanan"
                                        >
                                            <i className="bi bi-text-right"></i> Kanan
                                        </button>
                                    </div>
                                </div>

                                {/* Vertical Align */}
                                <div>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Rata Vertikal:</span>
                                    <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200 w-full justify-between">
                                        <button
                                            type="button"
                                            onClick={() => updateActiveCell({ verticalAlign: 'top' })}
                                            className={`flex-1 py-1 rounded text-xs font-semibold transition-colors flex items-center justify-center gap-1 ${(activeCellData.verticalAlign || 'middle') === 'top' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                                        >
                                            <i className="bi bi-align-top"></i> Atas
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => updateActiveCell({ verticalAlign: 'middle' })}
                                            className={`flex-1 py-1 rounded text-xs font-semibold transition-colors flex items-center justify-center gap-1 ${(activeCellData.verticalAlign || 'middle') === 'middle' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                                        >
                                            <i className="bi bi-align-middle"></i> Tengah
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => updateActiveCell({ verticalAlign: 'bottom' })}
                                            className={`flex-1 py-1 rounded text-xs font-semibold transition-colors flex items-center justify-center gap-1 ${(activeCellData.verticalAlign || 'middle') === 'bottom' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                                        >
                                            <i className="bi bi-align-bottom"></i> Bawah
                                        </button>
                                    </div>
                                </div>

                                {/* Mode Teks: Wrap / Float Text / Clip */}
                                <div>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Mode Teks &amp; Float Text:</span>
                                    <div className="grid grid-cols-3 gap-1 bg-white p-0.5 rounded-lg border border-slate-200">
                                        <button
                                            type="button"
                                            onClick={() => updateActiveCell({ textWrap: 'wrap' })}
                                            className={`py-1 px-1 rounded text-[11px] font-bold transition-colors flex items-center justify-center gap-1 ${(activeCellData.textWrap || 'wrap') === 'wrap' ? 'bg-teal-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                                            title="Wrap Text: Teks turun ke bawah saat lebar sel kecil, terpotong jika tinggi dikurangi"
                                        >
                                            <i className="bi bi-text-wrap"></i> Wrap
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => updateActiveCell({ textWrap: 'float' })}
                                            className={`py-1 px-1 rounded text-[11px] font-bold transition-colors flex items-center justify-center gap-1 ${activeCellData.textWrap === 'float' ? 'bg-amber-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                                            title="Float Text: Teks melayang melewati batas sel samping seperti Excel tanpa perlu Merge"
                                        >
                                            <i className="bi bi-arrows-expand-vertical rotate-90"></i> Float
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => updateActiveCell({ textWrap: 'clip' })}
                                            className={`py-1 px-1 rounded text-[11px] font-bold transition-colors flex items-center justify-center gap-1 ${activeCellData.textWrap === 'clip' ? 'bg-slate-700 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                                            title="Potong (Clip): Teks tetap 1 baris dan dipotong rapi di tepi sel"
                                        >
                                            <i className="bi bi-scissors"></i> Potong
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-1 leading-snug">
                                        {activeCellData.textWrap === 'float'
                                            ? 'Float Text aktif: teks panjang melayang bebas lintas sel samping tanpa perlu Merge.'
                                            : activeCellData.textWrap === 'clip'
                                            ? 'Potong aktif: teks dijaga 1 baris dan dipotong tepat di batas sel.'
                                            : 'Wrap aktif: ukuran font tetap utuh, teks otomatis turun ke bawah atau terpotong jika tinggi baris dikurangi.'}
                                    </p>
                                </div>
                            </div>

                            {/* Warna Latar Sel (Background Color) */}
                            <div className="pt-2 border-t border-slate-200/60 space-y-1.5">
                                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                                    <span>Warna Latar Sel</span>
                                    {activeCellData.backgroundColor && (
                                        <button
                                            type="button"
                                            onClick={() => updateActiveCell({ backgroundColor: undefined })}
                                            className="text-[10px] text-red-600 hover:underline font-semibold"
                                        >
                                            Reset
                                        </button>
                                    )}
                                </label>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    {[
                                        { label: 'Putih', color: '#ffffff' },
                                        { label: 'Abu', color: '#f3f4f6' },
                                        { label: 'Biru', color: '#dbeafe' },
                                        { label: 'Hijau', color: '#dcfce7' },
                                        { label: 'Kuning', color: '#fef9c3' },
                                        { label: 'Merah', color: '#fee2e2' },
                                        { label: 'Ungu', color: '#f3e8ff' }
                                    ].map(c => (
                                        <button
                                            key={c.color}
                                            type="button"
                                            onClick={() => updateActiveCell({ backgroundColor: c.color })}
                                            className="w-6 h-6 rounded-lg border border-slate-300 shadow-2xs hover:scale-110 transition-transform relative flex items-center justify-center"
                                            style={{ backgroundColor: c.color }}
                                            title={`Warna ${c.label}`}
                                        >
                                            {activeCellData.backgroundColor === c.color && (
                                                <i className="bi bi-check text-xs font-black text-slate-800"></i>
                                            )}
                                        </button>
                                    ))}
                                    <input
                                        type="color"
                                        value={activeCellData.backgroundColor || '#ffffff'}
                                        onChange={e => updateActiveCell({ backgroundColor: e.target.value })}
                                        className="w-6 h-6 rounded-lg border border-slate-300 p-0 cursor-pointer"
                                        title="Pilih Warna Custom"
                                    />
                                </div>
                            </div>

                            {/* Garis Batas Sel (Border) */}
                            <div className="pt-2 border-t border-slate-200/60 space-y-1.5">
                                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                                    <span>Garis Batas Sel (Border)</span>
                                    <span className="text-[10px] text-slate-400">Pilih Sisi</span>
                                </label>
                                <div className="grid grid-cols-4 gap-1">
                                    <button
                                        type="button"
                                        onClick={() => toggleBorder('all')}
                                        className="py-1 px-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 text-[10.5px] font-semibold flex items-center justify-center gap-1 shadow-2xs"
                                        title="Beri Garis Semua Sisi"
                                    >
                                        <i className="bi bi-border-all"></i> Semua
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => toggleBorder('outer')}
                                        className="py-1 px-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 text-[10.5px] font-semibold flex items-center justify-center gap-1 shadow-2xs"
                                        title="Garis Luar Saja"
                                    >
                                        <i className="bi bi-border-outer"></i> Luar
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => toggleBorder('bottom')}
                                        className="py-1 px-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 text-[10.5px] font-semibold flex items-center justify-center gap-1 shadow-2xs"
                                        title="Garis Bawah Saja"
                                    >
                                        <i className="bi bi-border-bottom"></i> Bawah
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => toggleBorder('none')}
                                        className="py-1 px-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-[10.5px] font-semibold flex items-center justify-center gap-1 shadow-2xs"
                                        title="Hapus Semua Garis pada Sel Terpilih"
                                    >
                                        <i className="bi bi-border-none"></i> Tanpa
                                    </button>
                                </div>
                                <div className="flex items-center gap-1 pt-0.5">
                                    <button
                                        type="button"
                                        onClick={() => toggleBorder('top')}
                                        className={`flex-1 py-1 text-[10px] font-bold rounded border transition-all ${
                                            activeCellData.borders?.top ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                        }`}
                                    >
                                        Atas
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => toggleBorder('bottom')}
                                        className={`flex-1 py-1 text-[10px] font-bold rounded border transition-all ${
                                            activeCellData.borders?.bottom ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                        }`}
                                    >
                                        Bawah
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => toggleBorder('left')}
                                        className={`flex-1 py-1 text-[10px] font-bold rounded border transition-all ${
                                            activeCellData.borders?.left ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                        }`}
                                    >
                                        Kiri
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => toggleBorder('right')}
                                        className={`flex-1 py-1 text-[10px] font-bold rounded border transition-all ${
                                            activeCellData.borders?.right ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                        }`}
                                    >
                                        Kanan
                                    </button>
                                </div>
                            </div>

                            {/* Quick Link to Sheet & Title Settings */}
                            <div className="pt-2 border-t border-slate-200/60">
                                <button
                                    type="button"
                                    onClick={() => setSidebarTab('sheet')}
                                    className="w-full p-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 rounded-xl border border-indigo-200 text-xs font-bold flex items-center justify-between transition-colors shadow-2xs"
                                >
                                    <div className="flex items-center gap-2">
                                        <i className="bi bi-file-earmark-text text-indigo-600 text-base"></i>
                                        <div className="text-left">
                                            <div className="font-extrabold text-[11px]">Setelan Lembar &amp; Judul Rapor</div>
                                            <div className="text-[10px] text-indigo-700 font-normal">Nama tab, Judul 3 baris, Pas 1 muka</div>
                                        </div>
                                    </div>
                                    <i className="bi bi-chevron-right text-xs text-indigo-500"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* PANEL SETELAN LEMBAR & JUDUL RAPOR RESMI */
                    <div className="p-4 space-y-4 overflow-y-auto">
                        <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-1">
                            <div className="flex items-center gap-1.5 font-bold text-indigo-950 text-xs">
                                <i className="bi bi-info-circle-fill text-indigo-600"></i>
                                <span>Format Nama Tab vs Judul Dokumen</span>
                            </div>
                            <p className="text-[11px] text-indigo-900 leading-relaxed">
                                <strong>Nama Tab</strong> adalah label singkat worksheet (misal: <em>Akademik</em>).
                                Sedangkan <strong>Judul Dokumen</strong> adalah judul resmi yang dicetak (bisa 2-3 baris lengkap).
                            </p>
                        </div>

                        {/* 1. Nama Tab Lembar */}
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                Nama Tab Lembar (Singkat)
                            </label>
                            <input
                                type="text"
                                value={curSheet?.name || ''}
                                onChange={e => {
                                    const val = e.target.value;
                                    updateActiveSheet({ name: val });
                                }}
                                placeholder="Contoh: Lembar 1 / Akademik"
                                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                            <span className="text-[10px] text-slate-400 mt-1 block">Tampil pada tab navigasi di bagian bawah kanvas.</span>
                        </div>

                        {/* 2. Toggle Tampilkan Judul Rapor di Bawah Kop */}
                        <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                            <label className="flex items-center justify-between cursor-pointer font-bold text-xs text-slate-800">
                                <span>Tampilkan Judul di Bawah Kop:</span>
                                <input
                                    type="checkbox"
                                    checked={activeTemplate?.showJudul !== false}
                                    onChange={e => {
                                        const val = e.target.checked;
                                        updateActiveSheet({ showJudul: val });
                                    }}
                                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                                />
                            </label>
                            <p className="text-[10.5px] text-slate-500 leading-snug">
                                {activeTemplate?.showJudul !== false
                                    ? "Judul resmi di bawah ini akan dicetak tepat di bawah garis Kop Pondok."
                                    : "Judul cetak di bawah Kop dinonaktifkan (Gunakan jika judul rapor 2-3 baris sudah Anda buat sendiri di dalam sel tabel)."}
                            </p>
                        </div>

                        {/* 3. Judul Rapor Resmi (Bisa 1-3 Baris) */}
                        {activeTemplate?.showJudul !== false && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                        Judul Dokumen Rapor (1 - 3 Baris)
                                    </label>
                                    <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.5 rounded">
                                        Mendukung Baris Baru
                                    </span>
                                </div>
                                
                                <textarea
                                    rows={4}
                                    value={curSheet?.customTitle !== undefined ? curSheet.customTitle : (activeTemplate?.customTitle || '')}
                                    onChange={e => {
                                        const val = e.target.value;
                                        updateActiveSheet({ customTitle: val });
                                    }}
                                    placeholder={`Contoh Judul 3 Baris:\nLAPORAN CAPAIAN KOMPETENSI SANTRI (RAPOR)\nMADRASAH DINIYAH TAKMILIYAH AWALIYAH\nSEMESTER $SEMESTER TAHUN AJARAN $TAHUN_AJARAN`}
                                    className="w-full border border-slate-300 rounded-xl p-2.5 text-xs font-mono font-medium text-slate-800 bg-white focus:ring-2 focus:ring-indigo-500 outline-none leading-relaxed"
                                />

                                {/* Preset Cepat */}
                                <div className="space-y-1">
                                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Preset Cepat:</span>
                                    <div className="flex flex-wrap gap-1">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const standard3Lines = `LAPORAN HASIL EVALUASI BELAJAR (RAPOR)\n${settings.namaPonpes || 'PONDOK PESANTREN'}\nSEMESTER $SEMESTER TAHUN AJARAN $TAHUN_AJARAN`;
                                                updateActiveSheet({ customTitle: standard3Lines });
                                            }}
                                            className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded text-[10px] font-semibold transition-all"
                                            title="Isi 3 baris standar lengkap dengan variabel dinamis"
                                        >
                                            + Format 3 Baris Standar
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const title2Lines = `RAPOR HASIL BELAJAR SANTRI\nSEMESTER $SEMESTER TAHUN AJARAN $TAHUN_AJARAN`;
                                                updateActiveSheet({ customTitle: title2Lines });
                                            }}
                                            className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded text-[10px] font-semibold transition-all"
                                        >
                                            + Format 2 Baris
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => updateActiveSheet({ customTitle: curSheet?.name || '' })}
                                            className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded text-[10px] font-semibold transition-all"
                                        >
                                            Gunakan Nama Tab
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => updateActiveSheet({ customTitle: '' })}
                                            className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded text-[10px] font-semibold transition-all"
                                        >
                                            Kosongkan
                                        </button>
                                    </div>
                                </div>

                                <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 text-[10px] text-slate-500">
                                    <span className="font-bold text-slate-700">Tag Otomatis: </span>
                                    <code className="text-indigo-600 font-bold">$SEMESTER</code>, <code className="text-indigo-600 font-bold">$TAHUN_AJARAN</code>, <code className="text-indigo-600 font-bold">$ROMBEL</code>, <code className="text-indigo-600 font-bold">$KELAS</code>, <code className="text-indigo-600 font-bold">$NAMA_PONPES</code>
                                </div>
                            </div>
                        )}

                        {/* 4. Tata Letak Kertas & Penyesuaian Halaman (Ala Excel) */}
                        <div className="pt-2 border-t border-slate-200 space-y-2.5">
                            <div className="flex items-center justify-between">
                                <span className="flex items-center gap-1.5 font-bold text-xs text-slate-800">
                                    <i className="bi bi-aspect-ratio text-indigo-600"></i>
                                    <span>Ukuran Kertas &amp; Fit Halaman</span>
                                </span>
                                {canvasPaginatedLayout && (
                                    <span className="text-[10px] font-semibold text-teal-700 tabular-nums">
                                        {canvasPaginatedLayout.pages.length} Hal · {Math.round(canvasPaginatedLayout.scale * 100)}%
                                    </span>
                                )}
                            </div>

                            {/* Kertas, Orientasi & Margin */}
                            <div className="grid grid-cols-3 gap-1.5">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Kertas</label>
                                    <select
                                        value={curPageSetup.paperSize}
                                        onChange={e => applyActiveSheetPageSetupPatch({ paperSize: e.target.value as 'A4' | 'F4' })}
                                        className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-bold bg-white text-slate-800"
                                    >
                                        <option value="A4">A4</option>
                                        <option value="F4">F4 / Folio</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Orientasi</label>
                                    <select
                                        value={curPageSetup.orientation}
                                        onChange={e => applyActiveSheetPageSetupPatch({ orientation: e.target.value as 'portrait' | 'landscape' })}
                                        className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-bold bg-white text-slate-800"
                                    >
                                        <option value="portrait">Portrait</option>
                                        <option value="landscape">Landscape</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Margin</label>
                                    <select
                                        value={curPageSetup.marginMode}
                                        onChange={e => applyActiveSheetPageSetupPatch({ marginMode: e.target.value as 'normal' | 'narrow' | 'none' })}
                                        className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-bold bg-white text-slate-800"
                                    >
                                        <option value="normal">Normal</option>
                                        <option value="narrow">Sempit</option>
                                        <option value="none">Tipis</option>
                                    </select>
                                </div>
                            </div>

                            {/* Preset Penyesuaian Halaman Ala Excel */}
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Mode Skala &amp; Pemecahan Halaman</label>
                                <select
                                    value={curPageSetup.preset}
                                    onChange={e => {
                                        const nextPreset = e.target.value as RaporPageScalePreset;
                                        applyActiveSheetPageSetupPatch(buildPageSetupStateFromPreset(nextPreset, curPageSetup));
                                    }}
                                    className="w-full border border-indigo-200 rounded-lg px-2.5 py-1.5 text-xs font-bold bg-indigo-50/40 text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                                >
                                    <option value="fit_1_page">Fit Dokumen ke 1 Halaman (Pas 1 Muka)</option>
                                    <option value="fit_width_1">Fit Lebar ke 1 Halaman (Sisa Bawah Oper ke Hal. 2+)</option>
                                    <option value="fit_height_1">Fit Tinggi ke 1 Halaman (Lebar Mengikuti)</option>
                                    <option value="fit_custom">Fit Lebar ke X &amp; Tinggi ke Y Halaman...</option>
                                    <option value="manual_scale">Skala Persentase Manual (%)</option>
                                </select>
                            </div>

                            {/* Kontrol Detail Fit Lebar X & Fit Tinggi Y atau Skala % */}
                            {curPageSetup.preset === 'manual_scale' ? (
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Skala Cetak Manual (%)</label>
                                    <select
                                        value={String(typeof curPageSetup.printScale === 'number' ? curPageSetup.printScale : 100)}
                                        onChange={e => {
                                            const val = parseInt(e.target.value, 10) || 100;
                                            applyActiveSheetPageSetupPatch({
                                                printScale: val,
                                                fitWidthPages: 'auto',
                                                fitHeightPages: 'auto'
                                            });
                                        }}
                                        className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold bg-white text-slate-800 tabular-nums"
                                    >
                                        <option value="100">100% (Ukuran Asli — Oper Otomatis)</option>
                                        <option value="95">95%</option>
                                        <option value="90">90%</option>
                                        <option value="85">85%</option>
                                        <option value="80">80%</option>
                                        <option value="75">75%</option>
                                        <option value="70">70%</option>
                                    </select>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Fit Lebar ke</label>
                                        <select
                                            value={String(curPageSetup.fitWidthPages)}
                                            onChange={e => {
                                                const v = e.target.value === 'auto' ? 'auto' : parseInt(e.target.value, 10);
                                                applyActiveSheetPageSetupPatch({ printScale: 'auto', fitWidthPages: v });
                                            }}
                                            className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-bold bg-white text-slate-800"
                                        >
                                            <option value="auto">Otomatis</option>
                                            <option value="1">1 Halaman</option>
                                            <option value="2">2 Halaman</option>
                                            <option value="3">3 Halaman</option>
                                            <option value="4">4 Halaman</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Fit Tinggi ke</label>
                                        <select
                                            value={String(curPageSetup.fitHeightPages)}
                                            onChange={e => {
                                                const v = e.target.value === 'auto' ? 'auto' : parseInt(e.target.value, 10);
                                                applyActiveSheetPageSetupPatch({ printScale: 'auto', fitHeightPages: v });
                                            }}
                                            className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-bold bg-white text-slate-800"
                                        >
                                            <option value="auto">Otomatis (Oper Hal.)</option>
                                            <option value="1">1 Halaman</option>
                                            <option value="2">2 Halaman</option>
                                            <option value="3">3 Halaman</option>
                                            <option value="4">4 Halaman</option>
                                            <option value="5">5 Halaman</option>
                                        </select>
                                    </div>
                                </div>
                            )}

                            {curPageSetup.fitHeightPages !== 1 && (
                                <label className="flex items-center justify-between cursor-pointer text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
                                    <span>Ulangi baris judul tabel di Hal. 2+</span>
                                    <input
                                        type="checkbox"
                                        checked={curPageSetup.repeatHeaderRows}
                                        onChange={e => applyActiveSheetPageSetupPatch({ repeatHeaderRows: e.target.checked })}
                                        className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                                    />
                                </label>
                            )}

                            <p className="text-[10.5px] text-slate-500 leading-snug">
                                Saat <strong>Fit Tinggi</strong> diatur ke <em>Otomatis</em> atau <em>2+ Halaman</em>, sisa baris bagian bawah otomatis di-oper rapi ke lembar halaman berikutnya tanpa menggantung.
                            </p>
                        </div>

                        {/* 5. Header Biodata Otomatis */}
                        <div className="pt-2 border-t border-slate-200 space-y-2">
                            <label className="flex items-center justify-between cursor-pointer font-bold text-xs text-slate-800">
                                <span className="flex items-center gap-1.5">
                                    <i className="bi bi-person-badge-fill text-blue-600"></i>
                                    <span>Header Biodata Otomatis:</span>
                                </span>
                                <input
                                    type="checkbox"
                                    checked={activeTemplate?.showBiodataHeader === true}
                                    onChange={e => {
                                        const val = e.target.checked;
                                        updateActiveSheet({ showBiodataHeader: val });
                                    }}
                                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                />
                            </label>
                            <p className="text-[10.5px] text-slate-500 leading-snug">
                                Tampilkan kotak biodata bawaan sistem (Nama, NIS, Rombel, Ranking). Nonaktifkan jika format biodata sudah didesain sendiri di dalam sel tabel.
                            </p>
                        </div>

                        {/* 6. Penandatangan / Pengampu Khusus (Hadits, Mutun, Tahfizh) */}
                        {activeTemplate && (
                            <div className="pt-2 border-t border-slate-200 space-y-2.5">
                                <div>
                                    <label className="flex items-center gap-1.5 font-bold text-xs text-slate-800">
                                        <i className="bi bi-person-workspace text-indigo-600"></i>
                                        <span>Pengampu / Guru Khusus Rapor:</span>
                                    </label>
                                    <p className="text-[10.5px] text-slate-500 leading-snug mt-0.5">
                                        Khusus Rapor Hafalan Hadits, Mutun, atau Tahfizh yang ditandatangani oleh guru pengampu di luar Wali Kelas &amp; Mudir. Bisa diatur 1 guru semua rombel, beda tiap rombel, atau otomatis Muhaffizh halaqah.
                                    </p>
                                </div>
                                <RaporCustomSignatoryConfigurator
                                    template={activeTemplate}
                                    settings={settings}
                                    digitalAssets={digitalAssets}
                                    canWrite={canWrite}
                                    activeRombelId={getTemplateSimulatedHierarchy().simRombel?.id}
                                    onChangeSignatories={handleUpdateCustomSignatories}
                                    onInsertTagToActiveCell={
                                        activeCellData
                                            ? tag => updateActiveCell({ type: 'data', value: tag })
                                            : undefined
                                    }
                                />
                            </div>
                        )}

                        {/* 7. Pembersihan & Pengaturan Border Lembar */}
                        <div className="pt-2 border-t border-slate-200 space-y-2.5">
                            <div>
                                <label className="block font-bold text-xs text-slate-800">
                                    Pembersihan Border Lembar:
                                </label>
                                <p className="text-[10.5px] text-slate-500 leading-snug mt-0.5">
                                    Atur agar hanya tabel nilai yang ber-garis kotak, tanpa mengotaki judul, biodata, atau sel kosong luar.
                                </p>
                            </div>
                            <div className="space-y-1.5">
                                <button
                                    type="button"
                                    onClick={handleCleanEmptyCellBorders}
                                    className="w-full py-2 px-3 bg-white hover:bg-amber-50 text-amber-800 border border-amber-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs"
                                    title="Hapus garis border otomatis pada sel-sel kosong di luar tabel nilai"
                                >
                                    <i className="bi bi-eraser-fill text-amber-600"></i>
                                    <span>🧹 Bersihkan Border Sel Kosong</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={handleCleanTitleAndOuterBorders}
                                    className="w-full py-2 px-3 bg-white hover:bg-blue-50 text-blue-800 border border-blue-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs"
                                    title="Hapus garis border pada baris judul, nama ponpes, dan identitas santri agar hanya tabel nilai yang bergaris"
                                >
                                    <i className="bi bi-card-heading text-blue-600"></i>
                                    <span>📋 Bersihkan Border Judul & Biodata</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={handleClearAllBordersInSheet}
                                    className="w-full py-1.5 px-3 bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-700 border border-slate-200 hover:border-rose-300 rounded-xl text-[11px] font-semibold transition-all flex items-center justify-center gap-1.5"
                                    title="Hapus semua border pada lembar ini untuk mulai pasang border dari awal secara selektif"
                                >
                                    <i className="bi bi-border-none text-slate-400"></i>
                                    <span>Hapus Semua Border di Lembar Ini</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            
            {/* PREVIEW MODAL WITH LIVE SANTRI DATA SELECTOR */}
            {isDesignPreviewOpen && activeTemplate && (() => {
                const candidateSantriList = santriList.filter(s => {
                    if (s.status !== 'Aktif') return false;
                    if (activeTemplate.rombelId) return s.rombelId === activeTemplate.rombelId;
                    if (activeTemplate.kelasId) return s.kelasId === activeTemplate.kelasId;
                    if (activeTemplate.jenjangId) return s.jenjangId === activeTemplate.jenjangId;
                    return true;
                });
                const effectiveSantriOptions = candidateSantriList.length > 0
                    ? candidateSantriList
                    : santriList.filter(s => s.status === 'Aktif');

                const selectedRealSantri = previewSantriId !== 'simulasi'
                    ? santriList.find(s => String(s.id) === previewSantriId) || null
                    : null;

                const matchingRecords = selectedRealSantri
                    ? raporRecords
                        .filter(r => r.santriId === selectedRealSantri.id)
                        .sort((a, b) => (b.lastModified || 0) - (a.lastModified || 0))
                    : [];
                const activeRecord = matchingRecords[0];

                let realParsedCustomData: Record<string, any> = {};
                if (activeRecord?.customData) {
                    try {
                        realParsedCustomData = typeof activeRecord.customData === 'string'
                            ? JSON.parse(activeRecord.customData)
                            : activeRecord.customData;
                    } catch {
                        realParsedCustomData = {};
                    }
                }

                const { simRombel, simKelas, simJenjang } = getTemplateSimulatedHierarchy();
                const previewSantriObj = selectedRealSantri || ({
                    id: 1,
                    namaLengkap: 'Ahmad Fauzan',
                    nis: '202401001',
                    nisn: '0081234567',
                    tempatLahir: 'Banda Aceh',
                    tanggalLahir: '2010-05-14',
                    namaAyah: 'H. Abdullah',
                    namaIbu: 'Hj. Siti Aminah',
                    rombelId: simRombel?.id || 1,
                    kelasId: simKelas?.id || 1,
                    jenjangId: simJenjang?.id || 1,
                    status: 'Aktif'
                } as any);

                // Collect initial variables across all sheets (real grades or sample 85-92 numbers so formulas work)
                const baseExtraVars: Record<string, any> = { ...realParsedCustomData };
                let sampleIdx = 0;
                const sampleGrades = [88, 92, 85, 79, 90, 84, 87, 94];
                activeSheets.forEach(sheetObj => {
                    sheetObj.cells.forEach(row => {
                        row.forEach(c => {
                            if (c.hidden || !c.key) return;
                            const existingVal = baseExtraVars[c.key];
                            const hasVal = existingVal !== undefined && existingVal !== null && String(existingVal).trim() !== '';
                            if (!hasVal) {
                                if (!selectedRealSantri || previewFallbackDummyGrades) {
                                    if (c.type === 'input') {
                                        const ku = c.key.toUpperCase();
                                        const cls = classifyRaporInputField({
                                            key: c.key,
                                            type: c.type,
                                            inputMode: c.inputMode,
                                            mataPelajaran: settings.mataPelajaran || [],
                                            jenjangId: activeTemplate.jenjangId
                                        });
                                        if (ku.includes('KEPUTUSAN')) {
                                            baseExtraVars[c.key] = 'NAIK KE KELAS BERIKUTNYA';
                                        } else if (cls.isLongText) {
                                            baseExtraVars[c.key] = 'Tingkatkan terus semangat belajar, muraja\'ah hafalan, dan adab keseharian di asrama.';
                                        } else if (cls.isAttendanceCount) {
                                            baseExtraVars[c.key] = '0';
                                        } else {
                                            baseExtraVars[c.key] = String(sampleGrades[sampleIdx % sampleGrades.length]);
                                            sampleIdx++;
                                        }
                                    } else if (c.type === 'dropdown') {
                                        baseExtraVars[c.key] = c.options && c.options.length > 0 ? c.options[0] : 'Baik';
                                    }
                                }
                            }
                        });
                    });
                });

                // Compute cohort class averages per mapel (real rombel records when available, plus realistic simulation fallback)
                const rombelSantriIds = new Set(
                    santriList
                        .filter(s => s.status === 'Aktif' && s.rombelId === previewSantriObj.rombelId)
                        .map(s => s.id)
                );
                const previewCohortRecords = selectedRealSantri
                    ? raporRecords.filter(r => {
                        if (!rombelSantriIds.has(r.santriId)) return false;
                        if (activeRecord?.tahunAjaran && r.tahunAjaran !== activeRecord.tahunAjaran) return false;
                        if (activeRecord?.semester && r.semester !== activeRecord.semester) return false;
                        return true;
                    })
                    : [];

                const {
                    classAverages: realClassAverages,
                    classOverallAverage: realClassOverallAvg
                } = computeClassAveragesFromRecords(previewCohortRecords, activeTemplate);

                const previewClassAverages: Record<string, number> = { ...realClassAverages };
                const isSimulationFallback = !selectedRealSantri || previewFallbackDummyGrades;
                if (isSimulationFallback) {
                    const sampleClassAvgs = [82.4, 84.8, 81.5, 78.6, 85.2, 80.9, 83.7, 86.1];
                    let simAvgIdx = 0;
                    activeSheets.forEach(sheetObj => {
                        sheetObj.cells.forEach(row => {
                            row.forEach(c => {
                                if (c.hidden || !c.key || c.type !== 'input') return;
                                const cls = classifyRaporInputField({
                                    key: c.key,
                                    type: c.type,
                                    inputMode: c.inputMode,
                                    mataPelajaran: settings.mataPelajaran || [],
                                    jenjangId: activeTemplate.jenjangId
                                });
                                if (!cls.isNumericScore) return;
                                const ku = normalizeSubjectKeyForAvg(c.key);
                                if (previewClassAverages[ku] === undefined) {
                                    previewClassAverages[ku] = sampleClassAvgs[simAvgIdx % sampleClassAvgs.length];
                                    simAvgIdx++;
                                }
                            });
                        });
                    });
                }

                // Compute numeric summary from baseExtraVars for $TOTAL_NILAI & $RATA_RATA
                const numericInputs: number[] = [];
                activeSheets.forEach(sheetObj => {
                    sheetObj.cells.forEach(row => {
                        row.forEach(c => {
                            if (!c.hidden && c.type === 'input' && c.key) {
                                const n = Number(baseExtraVars[c.key]);
                                if (!isNaN(n) && String(baseExtraVars[c.key] ?? '').trim() !== '') {
                                    numericInputs.push(n);
                                }
                            }
                        });
                    });
                });
                const sumVal = numericInputs.reduce((a, b) => a + b, 0);
                const avgVal = numericInputs.length > 0 ? Number((sumVal / numericInputs.length).toFixed(1)) : 88;
                const classAvgVals = Object.values(previewClassAverages).filter(v => typeof v === 'number' && v > 0 && v <= 100);
                const computedClassOverallAvg = realClassOverallAvg > 0
                    ? realClassOverallAvg
                    : (classAvgVals.length > 0
                        ? Number((classAvgVals.reduce((a, b) => a + b, 0) / classAvgVals.length).toFixed(2))
                        : (isSimulationFallback ? 83.15 : 0));

                const baseResolveContext: RaporResolveContext = {
                    template: activeTemplate,
                    settings,
                    digitalAssets,
                    santri: previewSantriObj,
                    record: activeRecord,
                    cohortRecords: previewCohortRecords,
                    targetDate: parseLocalDateSafe(settings.tanggalRaporDefault) || new Date(),
                    extraVars: baseExtraVars,
                    calculation: {
                        totalNilai: sumVal || 850,
                        rataRata: avgVal,
                        ranking: 1,
                        rankingKelas: 2,
                        rankingJenjang: 4,
                        rankingGlobal: 7,
                        totalSantri: Math.max(1, effectiveSantriOptions.length || 28),
                        totalSantriKelas: Math.max(2, (effectiveSantriOptions.length || 28) * 3),
                        totalSantriJenjang: Math.max(4, (effectiveSantriOptions.length || 28) * 9),
                        predikat: avgVal >= 90 ? 'A' : avgVal >= 80 ? 'B' : 'C',
                        classAverages: previewClassAverages,
                        classOverallAverage: computedClassOverallAvg,
                        isSimulated: isSimulationFallback
                    }
                };

                // Multi-pass chained evaluation so formula cells (with keys or cell coordinates) feed into downstream formulas
                for (let pass = 0; pass < 2; pass++) {
                    activeSheets.forEach(sheetObj => {
                        sheetObj.cells.forEach(row => {
                            row.forEach(c => {
                                if (!c.hidden && c.type === 'formula' && c.key && c.value) {
                                    const rawExpr = c.value.trim().startsWith('=') ? c.value : `=${c.value.trim()}`;
                                    const evaluatedVal = resolveRaporText(rawExpr, {
                                        ...baseResolveContext,
                                        sheetCells: sheetObj.cells,
                                        currentCellCoord: { r: c.row, c: c.col },
                                        decimalPlaces: c.decimalPlaces !== undefined ? c.decimalPlaces : 4
                                    });
                                    baseExtraVars[c.key] = c.decimalPlaces !== undefined
                                        ? formatCellNumericDisplay(evaluatedVal, c.decimalPlaces)
                                        : evaluatedVal;
                                }
                            });
                        });
                    });
                }

                const visiblePreviewSheets = activeSheets.filter(
                    sh => previewSheetId === 'all' || previewSheetId === sh.id
                );
                const targetSetupSheet = previewSheetId !== 'all'
                    ? (activeSheets.find(sh => sh.id === previewSheetId) || curSheet)
                    : curSheet;
                const modalPageSetup = normalizeRaporPageSetup({
                    paperSize: targetSetupSheet?.paperSize || activeTemplate.paperSize,
                    orientation: targetSetupSheet?.orientation || activeTemplate.orientation,
                    marginMode: targetSetupSheet?.marginMode || activeTemplate.marginMode,
                    fitToPage: targetSetupSheet?.fitToPage ?? activeTemplate.fitToPage,
                    fitWidthPages: targetSetupSheet?.fitWidthPages ?? activeTemplate.fitWidthPages,
                    fitHeightPages: targetSetupSheet?.fitHeightPages ?? activeTemplate.fitHeightPages,
                    printScale: targetSetupSheet?.printScale ?? activeTemplate.printScale,
                    repeatHeaderRows: targetSetupSheet?.repeatHeaderRows ?? activeTemplate.repeatHeaderRows
                });

                const applyModalPageSetup = (patch: Partial<RaporPageSetupInput>) => {
                    pushToHistory(activeTemplate);
                    const next = normalizeRaporPageSetup({ ...modalPageSetup, ...patch });
                    const sheetUpdates: Partial<RaporSheet> = {
                        paperSize: next.paperSize,
                        orientation: next.orientation,
                        marginMode: next.marginMode,
                        fitToPage: next.fitToPage,
                        fitWidthPages: next.fitWidthPages,
                        fitHeightPages: next.fitHeightPages,
                        printScale: next.printScale,
                        repeatHeaderRows: next.repeatHeaderRows
                    };
                    if (previewSheetId === 'all') {
                        const updatedSheets = activeSheets.map(s => ({ ...s, ...sheetUpdates }));
                        setActiveTemplate({
                            ...activeTemplate,
                            ...sheetUpdates,
                            sheets: updatedSheets
                        });
                    } else {
                        const updatedSheets = activeSheets.map(s =>
                            s.id === previewSheetId ? { ...s, ...sheetUpdates } : s
                        );
                        const isAlsoActive = previewSheetId === (activeSheetId || activeTemplate.activeSheetId);
                        setActiveTemplate({
                            ...activeTemplate,
                            ...(isAlsoActive ? sheetUpdates : {}),
                            sheets: updatedSheets
                        });
                    }
                };

                return (
                    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-[80] flex justify-center items-center p-0 sm:p-4">
                        <div className="bg-white sm:rounded-2xl shadow-2xl w-full max-w-6xl h-full sm:h-[94vh] flex flex-col overflow-hidden">
                            <div className="p-3 sm:p-4 border-b border-slate-200 bg-slate-50 flex flex-col gap-2.5 shrink-0">
                                {/* Row 1: Title, Sheet Filter, Santri Selector & Close */}
                                <div className="flex flex-wrap justify-between items-center gap-2">
                                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 flex-grow min-w-0">
                                        <h3 className="text-sm sm:text-base font-black text-slate-800 shrink-0 flex items-center gap-1.5">
                                            <i className="bi bi-printer text-teal-600"></i>
                                            <span>Preview Cetak</span>
                                        </h3>
                                        <div className="flex bg-slate-200/80 p-0.5 sm:p-1 rounded-xl text-xs font-bold overflow-x-auto no-scrollbar max-w-full">
                                            <button
                                                type="button"
                                                onClick={() => setPreviewSheetId('all')}
                                                className={`px-2.5 py-1 rounded-lg transition-all shrink-0 whitespace-nowrap ${previewSheetId === 'all' ? 'bg-white text-teal-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
                                            >
                                                Semua ({activeSheets.length})
                                            </button>
                                            {activeSheets.map((sh) => (
                                                <button
                                                    key={sh.id}
                                                    type="button"
                                                    onClick={() => setPreviewSheetId(sh.id)}
                                                    className={`px-2.5 py-1 rounded-lg transition-all shrink-0 whitespace-nowrap ${previewSheetId === sh.id ? 'bg-white text-teal-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
                                                >
                                                    {sh.name}
                                                </button>
                                            ))}
                                        </div>

                                        {/* Live Santri Data Selector */}
                                        <div className="flex flex-wrap items-center gap-2 ml-auto sm:ml-2">
                                            <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-xl px-2.5 py-1 shadow-2xs">
                                                <i className="bi bi-person-check-fill text-teal-600 text-xs"></i>
                                                <select
                                                    value={previewSantriId}
                                                    onChange={(e) => setPreviewSantriId(e.target.value)}
                                                    className="text-xs font-bold text-slate-700 bg-transparent focus:outline-none max-w-[200px] sm:max-w-[240px]"
                                                    title="Uji tampilan desain dengan data santri asli dari database"
                                                >
                                                    <option value="simulasi">Data Simulasi (Ahmad Fauzan)</option>
                                                    {effectiveSantriOptions.slice(0, 150).map(s => {
                                                        const rName = settings.rombel.find(r => r.id === s.rombelId)?.nama || '-';
                                                        const hasRec = raporRecords.some(rec => rec.santriId === s.id);
                                                        return (
                                                            <option key={s.id} value={String(s.id)}>
                                                                {s.namaLengkap} ({rName}){hasRec ? ' ✓ Ada Nilai' : ''}
                                                            </option>
                                                        );
                                                    })}
                                                </select>
                                            </div>

                                            {selectedRealSantri && (
                                                <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 bg-white border border-slate-200 px-2.5 py-1 rounded-xl cursor-pointer select-none whitespace-nowrap">
                                                    <input
                                                        type="checkbox"
                                                        checked={previewFallbackDummyGrades}
                                                        onChange={(e) => setPreviewFallbackDummyGrades(e.target.checked)}
                                                        className="rounded text-teal-600 focus:ring-teal-500"
                                                    />
                                                    <span>Isi contoh jika kosong</span>
                                                </label>
                                            )}
                                        </div>
                                    </div>
                                    <button 
                                        type="button"
                                        onClick={() => setIsDesignPreviewOpen(false)} 
                                        className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center justify-center transition-colors shrink-0"
                                        title="Tutup"
                                    >
                                        <i className="bi bi-x-lg text-sm"></i>
                                    </button>
                                </div>

                                {/* Row 2: Excel-Style Page Fit Controls, Paper Size, Zoom & Print PDF */}
                                <div className="pt-2 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        {/* Zoom */}
                                        <div className="flex items-center bg-white border border-slate-200 rounded-xl px-1.5 h-[32px] shadow-2xs text-xs shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => setPreviewModalZoom(z => Math.max(0.5, Number((z - 0.1).toFixed(1))))}
                                                disabled={previewModalZoom <= 0.5}
                                                className="p-1 text-slate-500 hover:text-slate-800 disabled:opacity-30"
                                                title="Perkecil tampilan"
                                            >
                                                <i className="bi bi-dash-lg"></i>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setPreviewModalZoom(1)}
                                                className="px-1.5 font-black text-slate-700 hover:text-teal-700 text-[11px] tabular-nums"
                                                title="Reset zoom 100%"
                                            >
                                                {Math.round(previewModalZoom * 100)}%
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setPreviewModalZoom(z => Math.min(1.6, Number((z + 0.1).toFixed(1))))}
                                                disabled={previewModalZoom >= 1.6}
                                                className="p-1 text-slate-500 hover:text-slate-800 disabled:opacity-30"
                                                title="Perbesar tampilan"
                                            >
                                                <i className="bi bi-plus-lg"></i>
                                            </button>
                                        </div>

                                        {/* Paper Size & Orientation */}
                                        <div className="flex items-center bg-white border border-slate-200 rounded-xl px-2 h-[32px] gap-1.5 text-xs shrink-0">
                                            <select
                                                value={modalPageSetup.paperSize}
                                                onChange={e => applyModalPageSetup({ paperSize: e.target.value as 'A4' | 'F4' })}
                                                className="font-bold text-slate-700 bg-transparent focus:outline-none cursor-pointer"
                                                title="Ukuran Kertas"
                                            >
                                                <option value="A4">A4</option>
                                                <option value="F4">F4</option>
                                            </select>
                                            <span className="text-slate-300">|</span>
                                            <select
                                                value={modalPageSetup.orientation}
                                                onChange={e => applyModalPageSetup({ orientation: e.target.value as 'portrait' | 'landscape' })}
                                                className="font-bold text-slate-700 bg-transparent focus:outline-none cursor-pointer"
                                                title="Orientasi Kertas"
                                            >
                                                <option value="portrait">Portrait</option>
                                                <option value="landscape">Landscape</option>
                                            </select>
                                        </div>

                                        {/* Preset Fit Mode */}
                                        <div className="flex items-center bg-indigo-50/70 border border-indigo-200 rounded-xl px-2.5 h-[32px] gap-1.5 text-xs shrink-0">
                                            <i className="bi bi-aspect-ratio text-indigo-600"></i>
                                            <select
                                                value={modalPageSetup.preset}
                                                onChange={e => {
                                                    const nextPreset = e.target.value as RaporPageScalePreset;
                                                    applyModalPageSetup(buildPageSetupStateFromPreset(nextPreset, modalPageSetup));
                                                }}
                                                className="font-bold text-indigo-950 bg-transparent focus:outline-none cursor-pointer"
                                                title="Mode Penyesuaian Halaman (Ala Excel)"
                                            >
                                                <option value="fit_1_page">Fit Dokumen ke 1 Halaman</option>
                                                <option value="fit_width_1">Fit Lebar 1 Hal (Oper Bawah)</option>
                                                <option value="fit_height_1">Fit Tinggi 1 Hal</option>
                                                <option value="fit_custom">Fit Lebar × Tinggi Kustom</option>
                                                <option value="manual_scale">Skala Manual (%)</option>
                                            </select>
                                        </div>

                                        {/* Explicit Width x Height Pages OR Manual Scale % */}
                                        {modalPageSetup.preset === 'manual_scale' ? (
                                            <div className="flex items-center bg-white border border-slate-200 rounded-xl px-2.5 h-[32px] gap-1 text-xs shrink-0">
                                                <span className="text-slate-500 font-semibold">Skala:</span>
                                                <select
                                                    value={String(typeof modalPageSetup.printScale === 'number' ? modalPageSetup.printScale : 100)}
                                                    onChange={e =>
                                                        applyModalPageSetup({
                                                            printScale: parseInt(e.target.value, 10) || 100,
                                                            fitWidthPages: 'auto',
                                                            fitHeightPages: 'auto'
                                                        })
                                                    }
                                                    className="font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer tabular-nums"
                                                >
                                                    <option value="100">100%</option>
                                                    <option value="95">95%</option>
                                                    <option value="90">90%</option>
                                                    <option value="85">85%</option>
                                                    <option value="80">80%</option>
                                                    <option value="75">75%</option>
                                                    <option value="70">70%</option>
                                                </select>
                                            </div>
                                        ) : (
                                            <div className="flex items-center bg-white border border-slate-200 rounded-xl px-2.5 h-[32px] gap-1.5 text-xs shrink-0">
                                                <span className="text-slate-500 font-semibold whitespace-nowrap">Lebar:</span>
                                                <select
                                                    value={String(modalPageSetup.fitWidthPages)}
                                                    onChange={e =>
                                                        applyModalPageSetup({
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
                                                <span className="text-slate-500 font-semibold whitespace-nowrap">Tinggi:</span>
                                                <select
                                                    value={String(modalPageSetup.fitHeightPages)}
                                                    onChange={e =>
                                                        applyModalPageSetup({
                                                            printScale: 'auto',
                                                            fitHeightPages: e.target.value === 'auto' ? 'auto' : parseInt(e.target.value, 10)
                                                        })
                                                    }
                                                    className="font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
                                                    title="Fit tinggi ke Y halaman (Auto = oper sisa baris ke halaman selanjutnya)"
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

                                        {modalPageSetup.fitHeightPages !== 1 && (
                                            <button
                                                type="button"
                                                onClick={() => applyModalPageSetup({ repeatHeaderRows: !modalPageSetup.repeatHeaderRows })}
                                                className={`h-[32px] px-2.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1 whitespace-nowrap ${
                                                    modalPageSetup.repeatHeaderRows
                                                        ? 'bg-teal-50 text-teal-800 border-teal-200'
                                                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                                                }`}
                                                title="Ulangi baris judul tabel secara otomatis di halaman ke-2 dan seterusnya"
                                            >
                                                <i className="bi bi-layout-three-columns"></i>
                                                <span>Ulangi Header Tabel</span>
                                            </button>
                                        )}

                                        <button
                                            type="button"
                                            onClick={() => setPreviewShowKop(v => !v)}
                                            className={`h-[32px] px-2.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1 whitespace-nowrap ${
                                                previewShowKop
                                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                                            }`}
                                            title="Simulasikan Kop Resmi Pondok di atas halaman pertama"
                                        >
                                            <i className={`bi ${previewShowKop ? 'bi-check-circle-fill text-emerald-600' : 'bi-circle'}`}></i>
                                            <span>Simulasi Kop</span>
                                        </button>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            printToPdfNative(
                                                'rapor-design-preview-print-area',
                                                `Uji_Desain_${(activeTemplate.name || 'Rapor').replace(/\s+/g, '_')}`,
                                                {
                                                    paperSize: modalPageSetup.paperSize,
                                                    orientation: modalPageSetup.orientation
                                                }
                                            )
                                        }
                                        className="h-[32px] bg-teal-600 hover:bg-teal-700 text-white px-3.5 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-2xs transition-colors whitespace-nowrap shrink-0"
                                        title="Cetak atau simpan uji pratinjau sebagai PDF"
                                    >
                                        <i className="bi bi-printer-fill"></i>
                                        <span>Cetak Uji PDF</span>
                                    </button>
                                </div>
                            </div>

                            <div className="flex-grow overflow-auto bg-slate-300 p-2 sm:p-6 md:p-8 flex justify-center">
                                <div
                                    id="rapor-design-preview-print-area"
                                    className="w-full flex flex-col items-center gap-6 print:block print:gap-0"
                                    style={{
                                        transform: previewModalZoom !== 1 ? `scale(${previewModalZoom})` : undefined,
                                        transformOrigin: 'top center',
                                        transition: 'transform 0.15s ease'
                                    }}
                                >
                                    {visiblePreviewSheets.map((sh, sIdx) => {
                                        const renderPreviewCell = (cell: GridCell): { content: React.ReactNode; isMedia: boolean } => {
                                            if ((cell.type === 'data' || cell.type === 'label') && isMediaTag(cell.value || '')) {
                                                const mediaVisual = resolveCellMediaVisual(cell, baseResolveContext);
                                                return {
                                                    content: mediaVisual ? (
                                                        <RaporSignatureStampMedia visual={mediaVisual} mode="print" />
                                                    ) : null,
                                                    isMedia: true
                                                };
                                            }
                                            if (cell.type === 'input') {
                                                const v = cell.key ? baseExtraVars[cell.key] : '';
                                                return { content: v !== undefined && v !== '' ? String(v) : '-', isMedia: false };
                                            }
                                            if (cell.type === 'dropdown') {
                                                const v = cell.key ? baseExtraVars[cell.key] : undefined;
                                                const fallbackOpt = cell.options && cell.options.length > 0 ? cell.options[0] : '-';
                                                return { content: v !== undefined && v !== '' ? String(v) : fallbackOpt, isMedia: false };
                                            }
                                            if (cell.value && (cell.value.includes('$') || cell.value.trim().startsWith('=') || cell.type === 'formula')) {
                                                const rawExpr = cell.type === 'formula' && !cell.value.trim().startsWith('=')
                                                    ? `=${cell.value.trim()}`
                                                    : cell.value;
                                                return {
                                                    content: resolveRaporText(rawExpr, {
                                                        ...baseResolveContext,
                                                        sheetCells: sh.cells,
                                                        currentCellCoord: { r: cell.row, c: cell.col },
                                                        decimalPlaces: cell.decimalPlaces
                                                    }),
                                                    isMedia: false
                                                };
                                            }
                                            return { content: getSimulatedValue(cell), isMedia: false };
                                        };

                                        return (
                                            <DesignPreviewSheetCard
                                                key={sh.id}
                                                sh={sh}
                                                sIdx={sIdx}
                                                sheetsCount={visiblePreviewSheets.length}
                                                isLastSheet={sIdx === visiblePreviewSheets.length - 1}
                                                activeTemplate={activeTemplate}
                                                settings={settings}
                                                digitalAssets={digitalAssets}
                                                resolveContext={baseResolveContext}
                                                renderPreviewCell={renderPreviewCell}
                                                showKop={previewShowKop}
                                                santriObj={previewSantriObj}
                                            />
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* 1-CLICK KURIKULUM GENERATOR MODAL */}
            {activeTemplate && (
                <RaporKurikulumGeneratorModal
                    isOpen={isKurikulumGeneratorOpen}
                    onClose={() => setIsKurikulumGeneratorOpen(false)}
                    settings={settings}
                    defaultJenjangId={activeTemplate.jenjangId}
                    existingGrid={activeTemplate.cells}
                    activeRowIndex={selectedCells.length > 0 ? Math.max(...selectedCells.map(s => s.r)) : 0}
                    onGenerateRows={handleApplyKurikulumRows}
                />
            )}

            {/* EXCEL PASTE MODAL */}
            <RaporExcelPasteModal
                isOpen={isExcelPasteModalOpen}
                onClose={() => setIsExcelPasteModalOpen(false)}
                settings={settings}
                activeTemplate={activeTemplate}
                isEditingTemplate={isEditing}
                selectedCell={selectedCells[0]}
                onCreateNewTemplate={(newTpl) => {
                    const updated = [...templates, newTpl];
                    saveTemplatesToSettings(updated);
                    setActiveTemplate(newTpl);
                    setActiveSheetId(newTpl.activeSheetId || newTpl.sheets?.[0]?.id || '');
                    setIsEditing(true);
                    setZoomScale(1);
                    setIsExcelPasteModalOpen(false);
                }}
                onApplyToCurrentSheet={(updatedCells, newRowCount, newColCount) => {
                    if (!activeTemplate) return;
                    pushToHistory(activeTemplate);
                    const updated = {
                        ...activeTemplate,
                        rowCount: newRowCount,
                        colCount: newColCount,
                        cells: updatedCells
                    };
                    setActiveTemplate(syncCurrentSheetToTemplate(updated, activeSheetId));
                    setIsExcelPasteModalOpen(false);
                }}
                showToast={showToast}
            />

            {/* CUSTOM CONTEXT MENU (Right-click on Table Cell) */}
            {contextMenuPos && (
                <div
                    className="fixed z-[100] bg-white rounded-xl shadow-2xl border border-slate-200 py-1.5 w-60 text-xs font-semibold text-slate-700 animate-fade-in select-none"
                    style={{
                        top: `${Math.min(contextMenuPos.y, window.innerHeight - 440)}px`,
                        left: `${Math.min(contextMenuPos.x, window.innerWidth - 260)}px`
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 flex items-center justify-between">
                        <span>Aksi Sel ({getExcelColName(contextMenuPos.c)}{contextMenuPos.r + 1})</span>
                        <span className="text-slate-300 font-mono text-[9px]">Menu Excel</span>
                    </div>

                    <button
                        type="button"
                        onClick={() => {
                            handleCopySelection(true);
                            setContextMenuPos(null);
                        }}
                        disabled={!canWrite || selectedCells.length === 0}
                        className="w-full px-3 py-1.5 text-left hover:bg-slate-100 flex items-center justify-between disabled:opacity-40"
                    >
                        <span className="flex items-center gap-2"><i className="bi bi-scissors text-slate-500"></i> Potong (Cut)</span>
                        <span className="text-[10px] text-slate-400 font-mono">Ctrl+X</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            handleCopySelection(false);
                            setContextMenuPos(null);
                        }}
                        disabled={selectedCells.length === 0}
                        className="w-full px-3 py-1.5 text-left hover:bg-slate-100 flex items-center justify-between disabled:opacity-40"
                    >
                        <span className="flex items-center gap-2"><i className="bi bi-copy text-slate-500"></i> Salin (Copy)</span>
                        <span className="text-[10px] text-slate-400 font-mono">Ctrl+C</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            handlePasteFromInternalClipboard();
                            setContextMenuPos(null);
                        }}
                        disabled={!canWrite || !internalClipboard}
                        className="w-full px-3 py-1.5 text-left hover:bg-slate-100 flex items-center justify-between disabled:opacity-40"
                    >
                        <span className="flex items-center gap-2"><i className="bi bi-clipboard text-slate-500"></i> Tempel (Paste)</span>
                        <span className="text-[10px] text-slate-400 font-mono">Ctrl+V</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            handleFillDownShortcut();
                            setContextMenuPos(null);
                        }}
                        disabled={!canWrite || selectedCells.length === 0}
                        className="w-full px-3 py-1.5 text-left hover:bg-slate-100 flex items-center justify-between disabled:opacity-40"
                    >
                        <span className="flex items-center gap-2"><i className="bi bi-arrow-down-square text-teal-600"></i> Isi ke Bawah (Fill Down)</span>
                        <span className="text-[10px] text-slate-400 font-mono">Ctrl+D</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            handleFillRightShortcut();
                            setContextMenuPos(null);
                        }}
                        disabled={!canWrite || selectedCells.length === 0}
                        className="w-full px-3 py-1.5 text-left hover:bg-slate-100 flex items-center justify-between disabled:opacity-40"
                    >
                        <span className="flex items-center gap-2"><i className="bi bi-arrow-right-square text-teal-600"></i> Isi ke Kanan (Fill Right)</span>
                        <span className="text-[10px] text-slate-400 font-mono">Ctrl+R</span>
                    </button>

                    <div className="my-1 border-t border-slate-100"></div>

                    <div className="px-3 py-1.5 flex items-center justify-between gap-1.5">
                        <span className="text-[10px] font-bold text-slate-500">Format Huruf:</span>
                        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                            {([
                                { id: 'none', label: 'Asli', title: 'Normal / Asli' },
                                { id: 'uppercase', label: 'AA', title: 'HURUF BESAR' },
                                { id: 'lowercase', label: 'aa', title: 'huruf kecil' },
                                { id: 'capitalize', label: 'Aa', title: 'Judul (Title Case)' }
                            ] as const).map(item => {
                                const isCur = (activeCellData?.textTransform || 'none') === item.id;
                                return (
                                    <button
                                        key={item.id}
                                        type="button"
                                        disabled={!canWrite || selectedCells.length === 0}
                                        onClick={() => {
                                            handleBulkUpdateCells({ textTransform: item.id });
                                            setContextMenuPos(null);
                                        }}
                                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors disabled:opacity-40 ${isCur ? 'bg-violet-600 text-white' : 'text-slate-700 hover:bg-white'}`}
                                        title={item.title}
                                    >
                                        {item.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="my-1 border-t border-slate-100"></div>

                    {selectedCells.length > 1 ? (
                        <button
                            type="button"
                            onClick={() => {
                                mergeCells();
                                setContextMenuPos(null);
                            }}
                            disabled={!canWrite}
                            className="w-full px-3 py-1.5 text-left hover:bg-slate-100 flex items-center gap-2 text-indigo-700 font-bold"
                        >
                            <i className="bi bi-union"></i>
                            <span>Gabungkan Sel (Merge)</span>
                        </button>
                    ) : (activeCellData && ((activeCellData.rowSpan || 1) > 1 || (activeCellData.colSpan || 1) > 1)) ? (
                        <button
                            type="button"
                            onClick={() => {
                                unmergeCells();
                                setContextMenuPos(null);
                            }}
                            disabled={!canWrite}
                            className="w-full px-3 py-1.5 text-left hover:bg-slate-100 flex items-center gap-2 text-amber-700 font-bold"
                        >
                            <i className="bi bi-arrows-angle-expand"></i>
                            <span>Pisahkan Sel (Unmerge)</span>
                        </button>
                    ) : null}

                    <button
                        type="button"
                        onClick={() => {
                            handleInsertRowRelative('above');
                            setContextMenuPos(null);
                        }}
                        disabled={!canWrite}
                        className="w-full px-3 py-1.5 text-left hover:bg-slate-100 flex items-center gap-2"
                    >
                        <i className="bi bi-arrow-bar-up text-teal-600"></i>
                        <span>Sisipkan Baris Di Atas</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            handleInsertRowRelative('below');
                            setContextMenuPos(null);
                        }}
                        disabled={!canWrite}
                        className="w-full px-3 py-1.5 text-left hover:bg-slate-100 flex items-center gap-2"
                    >
                        <i className="bi bi-arrow-bar-down text-teal-600"></i>
                        <span>Sisipkan Baris Di Bawah</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            handleInsertColRelative('left');
                            setContextMenuPos(null);
                        }}
                        disabled={!canWrite}
                        className="w-full px-3 py-1.5 text-left hover:bg-slate-100 flex items-center gap-2"
                    >
                        <i className="bi bi-arrow-bar-left text-teal-600"></i>
                        <span>Sisipkan Kolom Di Kiri</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            handleInsertColRelative('right');
                            setContextMenuPos(null);
                        }}
                        disabled={!canWrite}
                        className="w-full px-3 py-1.5 text-left hover:bg-slate-100 flex items-center gap-2"
                    >
                        <i className="bi bi-arrow-bar-right text-teal-600"></i>
                        <span>Sisipkan Kolom Di Kanan</span>
                    </button>

                    <div className="my-1 border-t border-slate-100"></div>

                    <button
                        type="button"
                        onClick={() => {
                            handleDeleteRow(contextMenuPos.r);
                            setContextMenuPos(null);
                        }}
                        disabled={!canWrite || !activeTemplate || activeTemplate.rowCount <= 1}
                        className="w-full px-3 py-1.5 text-left hover:bg-rose-50 text-rose-700 flex items-center gap-2"
                    >
                        <i className="bi bi-trash text-rose-500"></i>
                        <span>Hapus Baris Ini</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            handleDeleteCol(contextMenuPos.c);
                            setContextMenuPos(null);
                        }}
                        disabled={!canWrite || !activeTemplate || activeTemplate.colCount <= 1}
                        className="w-full px-3 py-1.5 text-left hover:bg-rose-50 text-rose-700 flex items-center gap-2"
                    >
                        <i className="bi bi-trash text-rose-500"></i>
                        <span>Hapus Kolom Ini</span>
                    </button>

                    <div className="my-1 border-t border-slate-100"></div>

                    <button
                        type="button"
                        onClick={() => {
                            handleBulkClearValues();
                            setContextMenuPos(null);
                        }}
                        disabled={!canWrite}
                        className="w-full px-3 py-1.5 text-left hover:bg-slate-100 flex items-center justify-between text-slate-600"
                    >
                        <span className="flex items-center gap-2"><i className="bi bi-backspace"></i> Kosongkan Isi Sel</span>
                        <span className="text-[10px] text-slate-400 font-mono">Del</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            toggleBorder('none');
                            setContextMenuPos(null);
                        }}
                        disabled={!canWrite}
                        className="w-full px-3 py-1.5 text-left hover:bg-slate-100 flex items-center gap-2 text-slate-600"
                    >
                        <i className="bi bi-border"></i>
                        <span>Hapus Garis / Border Sel</span>
                    </button>
                </div>
            )}
        </div>
    );
};

