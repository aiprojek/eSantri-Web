import React, { useState, useMemo, useRef, useLayoutEffect } from 'react';
import { RaporTemplate, RaporSheet, GridCell, DigitalAsset } from '../../types';
import { PrintHeader } from '../common/PrintHeader';
import {
    RAPOR_CREDIT_FOOTER_TEXT,
    normalizeRaporPageSetup,
    formatPageSetupBadgeLabel,
    getRaporPaperMetrics,
    getEffectivePopulatedColCount,
    computePaginatedRaporLayout,
    getRenderableRowCellsForPage,
    resolveExactColPixelWidths,
    computeRaporFooterTypography,
    PaginatedRaporPage,
    PaginatedSliceCell,
} from '../../utils/raporPageLayout';
import { resolveRaporText, RaporResolveContext } from '../../utils/raporPlaceholderResolver';
import { applyCellTextTransform, formatCellNumericDisplay } from '../../utils/raporFormulaUtils';

export interface DesignPreviewSheetCardProps {
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

export const DesignPreviewSheetCard: React.FC<DesignPreviewSheetCardProps> = ({
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
