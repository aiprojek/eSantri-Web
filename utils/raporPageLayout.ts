import { GridCell, PageFitCount } from '../types';

export type RaporPaperSize = 'A4' | 'F4';
export type RaporOrientation = 'portrait' | 'landscape';
export type RaporMarginMode = 'normal' | 'narrow' | 'none';
export const RAPOR_CREDIT_FOOTER_TEXT = 'dibuat dengan eSantri Web by AI Projek | aiprojek01.my.id';
export type RaporPageScalePreset =
    | 'fit_1_page'
    | 'fit_width_1'
    | 'fit_height_1'
    | 'fit_custom'
    | 'manual_scale';

export interface RaporPageSetupInput {
    paperSize?: RaporPaperSize;
    orientation?: RaporOrientation;
    marginMode?: RaporMarginMode;
    fitToPage?: boolean;
    fitWidthPages?: PageFitCount;
    fitHeightPages?: PageFitCount;
    printScale?: number | 'auto';
    repeatHeaderRows?: boolean;
}

export interface NormalizedRaporPageSetup {
    paperSize: RaporPaperSize;
    orientation: RaporOrientation;
    marginMode: RaporMarginMode;
    fitWidthPages: PageFitCount;
    fitHeightPages: PageFitCount;
    printScale: number | 'auto';
    fitToPage: boolean;
    repeatHeaderRows: boolean;
    preset: RaporPageScalePreset;
}

export interface RaporPaperMetrics {
    paperSize: RaporPaperSize;
    orientation: RaporOrientation;
    marginMode: RaporMarginMode;
    widthCss: string;
    heightCss: string;
    pxW: number;
    pxH: number;
    padPx: number;
    paddingClass: string;
    availableW: number;
    availableH: number;
}

export interface AtomicRowGroup {
    startRow: number;
    endRow: number;
}

export interface PaginatedSliceCell {
    cell: GridCell;
    masterR: number;
    masterC: number;
    renderCol: number;
    colSpan: number;
    rowSpan: number;
    borders: {
        top: boolean;
        right: boolean;
        bottom: boolean;
        left: boolean;
    };
}

export interface PaginatedRaporPage {
    pageIndex: number;       // 0-based within sheet
    pageNumber: number;      // 1-based within sheet
    totalPages: number;
    vIndex: number;
    hIndex: number;
    totalVPages: number;
    totalHPages: number;
    includeDocHeader: boolean;
    headerGroupRows: number[]; // Repeated table header rows on continuation pages (vIndex > 0)
    startRow: number;
    endRow: number;
    startCol: number;
    endCol: number;
    sliceColWidths: number[];
    sliceNaturalWidth: number;
    sliceNaturalHeight: number;
    stretchColsToFillWidth: boolean;
}

export interface ComputedPaginatedLayout {
    scale: number;
    naturalWidth: number;
    effectiveRowCount: number;
    effectiveColCount: number;
    isSinglePageFit: boolean;
    pages: PaginatedRaporPage[];
}

export function sanitizePageFitCount(val: unknown, fallback: PageFitCount): PageFitCount {
    if (val === 'auto') return 'auto';
    if (typeof val === 'number' && Number.isFinite(val) && val >= 1) {
        return Math.min(10, Math.round(val));
    }
    if (typeof val === 'string') {
        const trimmed = val.trim().toLowerCase();
        if (trimmed === 'auto' || trimmed === '') return 'auto';
        const parsed = parseInt(trimmed, 10);
        if (!isNaN(parsed) && parsed >= 1) return Math.min(10, parsed);
    }
    return fallback;
}

export function normalizeRaporPageSetup(input?: RaporPageSetupInput | null): NormalizedRaporPageSetup {
    const paperSize: RaporPaperSize = input?.paperSize === 'F4' ? 'F4' : 'A4';
    const orientation: RaporOrientation = input?.orientation === 'landscape' ? 'landscape' : 'portrait';
    const marginMode: RaporMarginMode =
        input?.marginMode === 'narrow' || input?.marginMode === 'none' ? input.marginMode : 'normal';
    const repeatHeaderRows = Boolean(input?.repeatHeaderRows);

    const rawScale = input?.printScale;
    const manualNumericScale =
        typeof rawScale === 'number' && Number.isFinite(rawScale) && rawScale >= 20 && rawScale <= 200
            ? Math.round(rawScale)
            : null;

    const hasExplicitWidthFit = input?.fitWidthPages !== undefined;
    const hasExplicitHeightFit = input?.fitHeightPages !== undefined;

    let fitWidthPages: PageFitCount;
    let fitHeightPages: PageFitCount;
    let printScale: number | 'auto' = manualNumericScale !== null ? manualNumericScale : 'auto';

    if (hasExplicitWidthFit || hasExplicitHeightFit) {
        const defaultW: PageFitCount = input?.fitToPage === false ? 1 : 1;
        const defaultH: PageFitCount = input?.fitToPage === false ? 'auto' : 1;
        fitWidthPages = sanitizePageFitCount(input?.fitWidthPages, defaultW);
        fitHeightPages = sanitizePageFitCount(input?.fitHeightPages, defaultH);
    } else if (input?.fitToPage === false) {
        // Legacy "Pas 1 Lembar: Off" -> Fit Lebar 1 Halaman & Oper sisa tinggi ke Halaman 2, dst.
        fitWidthPages = manualNumericScale !== null ? 'auto' : 1;
        fitHeightPages = 'auto';
    } else {
        // Default: Fit Dokumen ke 1 Halaman (1 muka)
        fitWidthPages = 1;
        fitHeightPages = 1;
    }

    const fitToPage = printScale === 'auto' && fitWidthPages === 1 && fitHeightPages === 1;

    let preset: RaporPageScalePreset;
    if (typeof printScale === 'number') {
        preset = 'manual_scale';
    } else if (fitWidthPages === 1 && fitHeightPages === 1) {
        preset = 'fit_1_page';
    } else if (fitWidthPages === 1 && fitHeightPages === 'auto') {
        preset = 'fit_width_1';
    } else if (fitWidthPages === 'auto' && fitHeightPages === 1) {
        preset = 'fit_height_1';
    } else {
        preset = 'fit_custom';
    }

    return {
        paperSize,
        orientation,
        marginMode,
        fitWidthPages,
        fitHeightPages,
        printScale,
        fitToPage,
        repeatHeaderRows,
        preset
    };
}

export function buildPageSetupStateFromPreset(
    preset: RaporPageScalePreset,
    current?: Partial<NormalizedRaporPageSetup>
): Pick<NormalizedRaporPageSetup, 'fitWidthPages' | 'fitHeightPages' | 'printScale' | 'fitToPage'> {
    if (preset === 'fit_1_page') {
        return { fitWidthPages: 1, fitHeightPages: 1, printScale: 'auto', fitToPage: true };
    }
    if (preset === 'fit_width_1') {
        return { fitWidthPages: 1, fitHeightPages: 'auto', printScale: 'auto', fitToPage: false };
    }
    if (preset === 'fit_height_1') {
        return { fitWidthPages: 'auto', fitHeightPages: 1, printScale: 'auto', fitToPage: false };
    }
    if (preset === 'manual_scale') {
        const nextScale = typeof current?.printScale === 'number' ? current.printScale : 100;
        return {
            fitWidthPages: 'auto',
            fitHeightPages: 'auto',
            printScale: nextScale,
            fitToPage: false
        };
    }
    // fit_custom: default to 1 wide x 2 tall if coming from fit_1_page
    const curW = current?.fitWidthPages ?? 1;
    const curH = current?.fitHeightPages !== undefined && current.fitHeightPages !== 1 ? current.fitHeightPages : 2;
    const isSingle = curW === 1 && curH === 1;
    return {
        fitWidthPages: curW,
        fitHeightPages: curH,
        printScale: 'auto',
        fitToPage: isSingle
    };
}

export function formatPageSetupBadgeLabel(setup: NormalizedRaporPageSetup, scale: number): string {
    const pct = `${Math.round(scale * 100)}%`;
    if (typeof setup.printScale === 'number') {
        return `Skala ${setup.printScale}%`;
    }
    if (setup.fitWidthPages === 1 && setup.fitHeightPages === 1) {
        return `Fit 1 Halaman (${pct})`;
    }
    if (setup.fitWidthPages === 1 && setup.fitHeightPages === 'auto') {
        return `Fit Lebar 1 Hal (${pct})`;
    }
    if (setup.fitWidthPages === 'auto' && setup.fitHeightPages === 1) {
        return `Fit Tinggi 1 Hal (${pct})`;
    }
    const wText = setup.fitWidthPages === 'auto' ? 'Auto' : `${setup.fitWidthPages}`;
    const hText = setup.fitHeightPages === 'auto' ? 'Auto' : `${setup.fitHeightPages}`;
    return `Fit ${wText}×${hText} Hal (${pct})`;
}

export function getRaporPaperMetrics(
    paperSize: RaporPaperSize = 'A4',
    orientation: RaporOrientation = 'portrait',
    marginMode: RaporMarginMode = 'normal'
): RaporPaperMetrics {
    const portraitDims = paperSize === 'F4'
        ? { wCm: '21.5cm', hCm: '33cm', pxW: 812.6, pxH: 1247.2 }
        : { wCm: '21cm', hCm: '29.7cm', pxW: 793.7, pxH: 1122.5 };

    const widthCss = orientation === 'landscape' ? portraitDims.hCm : portraitDims.wCm;
    const heightCss = orientation === 'landscape' ? portraitDims.wCm : portraitDims.hCm;
    const pxW = orientation === 'landscape' ? portraitDims.pxH : portraitDims.pxW;
    const pxH = orientation === 'landscape' ? portraitDims.pxW : portraitDims.pxH;

    const padPx = marginMode === 'normal' ? 32 : marginMode === 'narrow' ? 16 : 8;
    const paddingClass = marginMode === 'normal' ? 'p-8' : marginMode === 'narrow' ? 'p-4' : 'p-2';

    // Subtract padding + 4px horizontal breathing room (2px per side for collapsed 1px borders) + bottom credit footer strip
    const availableW = Math.max(300, Math.floor(pxW - padPx * 2 - 4));
    const availableH = Math.max(320, Math.floor(pxH - padPx * 2 - 22));

    return {
        paperSize,
        orientation,
        marginMode,
        widthCss,
        heightCss,
        pxW,
        pxH,
        padPx,
        paddingClass,
        availableW,
        availableH
    };
}

function cellHasVisualContent(cell: GridCell | undefined): boolean {
    if (!cell || cell.hidden) return false;
    if (cell.value && cell.value.trim() !== '') return true;
    if ((cell.type === 'input' || cell.type === 'dropdown' || cell.type === 'formula') && cell.key && cell.key.trim() !== '') {
        return true;
    }
    const b = cell.borders;
    if (b && (b.top || b.right || b.bottom || b.left)) return true;
    if (cell.backgroundColor && cell.backgroundColor !== 'transparent' && cell.backgroundColor !== '#ffffff') {
        return true;
    }
    return false;
}

/**
 * Finds the effective row count excluding trailing completely empty/unbordered canvas padding rows,
 * while always keeping at least 1 row and respecting rowSpan extensions.
 */
export function getEffectivePopulatedRowCount(cells: GridCell[][]): number {
    if (!cells || cells.length === 0) return 0;
    let lastRow = 0;
    for (let r = 0; r < cells.length; r++) {
        const row = cells[r] || [];
        for (let c = 0; c < row.length; c++) {
            const cell = row[c];
            if (cellHasVisualContent(cell)) {
                const spanEnd = Math.min(cells.length - 1, r + Math.max(1, cell.rowSpan || 1) - 1);
                if (spanEnd > lastRow) lastRow = spanEnd;
            }
        }
    }
    return lastRow + 1;
}

export function getEffectivePopulatedColCount(cells: GridCell[][], fallbackColCount: number): number {
    if (!cells || cells.length === 0) return fallbackColCount;
    let lastCol = 0;
    let anyFound = false;
    for (let r = 0; r < cells.length; r++) {
        const row = cells[r] || [];
        for (let c = 0; c < row.length; c++) {
            const cell = row[c];
            if (cellHasVisualContent(cell)) {
                anyFound = true;
                const spanEnd = Math.min(fallbackColCount - 1, c + Math.max(1, cell.colSpan || 1) - 1);
                if (spanEnd > lastCol) lastCol = spanEnd;
            }
        }
    }
    return anyFound ? Math.max(1, lastCol + 1) : Math.max(1, fallbackColCount);
}

/**
 * Groups rows connected by rowSpan > 1 into atomic intervals so page breaks never slice a merged cell vertically.
 */
export function buildAtomicRowGroups(cells: GridCell[][], rowLimit: number): AtomicRowGroup[] {
    const groups: AtomicRowGroup[] = [];
    let r = 0;
    while (r < rowLimit) {
        let groupEnd = r;
        let cursor = r;
        while (cursor <= groupEnd && cursor < rowLimit) {
            const row = cells[cursor] || [];
            for (let c = 0; c < row.length; c++) {
                const cell = row[c];
                if (cell && !cell.hidden && (cell.rowSpan || 1) > 1) {
                    const spanEnd = Math.min(rowLimit - 1, cursor + (cell.rowSpan || 1) - 1);
                    // Avoid merging an entire 30-row sheet if someone accidentally merged everything
                    if (spanEnd - r < 14) {
                        groupEnd = Math.max(groupEnd, spanEnd);
                    }
                }
            }
            cursor++;
        }
        groups.push({ startRow: r, endRow: groupEnd });
        r = groupEnd + 1;
    }
    return groups;
}

const HEADER_KEYWORDS = [
    'MATA PELAJARAN',
    'MAPEL',
    'BIDANG STUDI',
    'KOMPONEN',
    'ASPEK',
    'MUATAN',
    'NILAI',
    'KKM',
    'KTP',
    'PREDIKAT',
    'CAPAIAN',
    'DESKRIPSI'
];

/**
 * Detects the primary bordered table header row group (e.g. "NO | MATA PELAJARAN | KKM | NILAI | PREDIKAT")
 * so continuation pages can optionally repeat it when repeatHeaderRows is enabled.
 */
export function detectTableHeaderGroup(cells: GridCell[][], groups: AtomicRowGroup[]): AtomicRowGroup | null {
    for (const grp of groups) {
        if (grp.endRow - grp.startRow > 2) continue;
        let borderedCount = 0;
        let visibleCount = 0;
        let keywordMatches = 0;
        for (let r = grp.startRow; r <= grp.endRow; r++) {
            const row = cells[r] || [];
            for (let c = 0; c < row.length; c++) {
                const cell = row[c];
                if (!cell || cell.hidden) continue;
                visibleCount++;
                const b = cell.borders;
                if (b && (b.top || b.bottom || b.left || b.right)) {
                    borderedCount++;
                }
                const up = (cell.value || '').toUpperCase().trim();
                if (up === 'NO' || up === 'NO.' || up === 'NOMOR' || HEADER_KEYWORDS.some(k => up.includes(k))) {
                    keywordMatches++;
                }
            }
        }
        if (visibleCount >= 2 && borderedCount >= Math.ceil(visibleCount * 0.5) && keywordMatches >= 2) {
            return grp;
        }
    }
    return null;
}

function rowHasTableBorders(cells: GridCell[][], r: number): boolean {
    const row = cells[r] || [];
    let bordered = 0;
    for (let c = 0; c < row.length; c++) {
        const cell = row[c];
        if (!cell || cell.hidden) continue;
        const b = cell.borders;
        if (b && (b.left || b.right) && (b.top || b.bottom)) {
            bordered++;
        }
    }
    return bordered >= 2;
}

function partitionColumnsIntoPages(colWidths: number[], colLimit: number, budgetWidthPx: number): Array<{ startCol: number; endCol: number }> {
    if (colLimit <= 0) return [{ startCol: 0, endCol: 0 }];
    const totalW = colWidths.slice(0, colLimit).reduce((a, b) => a + b, 0);
    if (totalW <= budgetWidthPx + 2) {
        return [{ startCol: 0, endCol: colLimit - 1 }];
    }

    const slices: Array<{ startCol: number; endCol: number }> = [];
    let startCol = 0;
    let accW = 0;

    for (let c = 0; c < colLimit; c++) {
        const w = colWidths[c] || 100;
        if (c > startCol && accW + w > budgetWidthPx + 1) {
            slices.push({ startCol, endCol: c - 1 });
            startCol = c;
            accW = w;
        } else {
            accW += w;
        }
    }
    if (startCol < colLimit) {
        slices.push({ startCol, endCol: colLimit - 1 });
    }
    return slices;
}

interface VerticalSliceInternal {
    startRow: number;
    endRow: number;
    includeDocHeader: boolean;
    headerGroupRows: number[];
}

function partitionRowsIntoPages(
    cells: GridCell[][],
    groups: AtomicRowGroup[],
    rowHeights: number[],
    docHeaderHeight: number,
    budgetHeightPx: number,
    repeatHeaderGroup: AtomicRowGroup | null
): VerticalSliceInternal[] {
    if (groups.length === 0) {
        return [{ startRow: 0, endRow: 0, includeDocHeader: true, headerGroupRows: [] }];
    }

    const groupHeight = (grp: AtomicRowGroup): number => {
        let sum = 0;
        for (let r = grp.startRow; r <= grp.endRow; r++) {
            sum += rowHeights[r] ?? 30;
        }
        return sum;
    };

    const repeatHeaderH = repeatHeaderGroup ? groupHeight(repeatHeaderGroup) : 0;
    const repeatHeaderRowIndices = repeatHeaderGroup
        ? Array.from({ length: repeatHeaderGroup.endRow - repeatHeaderGroup.startRow + 1 }, (_, i) => repeatHeaderGroup.startRow + i)
        : [];

    const slices: VerticalSliceInternal[] = [];
    let curStartGrpIdx = 0;

    while (curStartGrpIdx < groups.length) {
        const isFirstVerticalPage = slices.length === 0;
        const firstGrp = groups[curStartGrpIdx];

        const shouldRepeatTableHeader = Boolean(
            !isFirstVerticalPage &&
            repeatHeaderGroup &&
            firstGrp.startRow > repeatHeaderGroup.endRow &&
            rowHasTableBorders(cells, firstGrp.startRow) &&
            repeatHeaderH < budgetHeightPx * 0.35
        );

        let usedH = isFirstVerticalPage ? docHeaderHeight : (shouldRepeatTableHeader ? repeatHeaderH : 0);
        let endGrpIdx = curStartGrpIdx;

        for (let g = curStartGrpIdx; g < groups.length; g++) {
            const gH = groupHeight(groups[g]);
            if (g === curStartGrpIdx) {
                // Always place at least one atomic row group on the page to guarantee forward progress,
                // unless Page 1's docHeaderHeight itself leaves no room AND putting rows on Page 2 fits cleanly
                if (isFirstVerticalPage && docHeaderHeight > 0 && usedH + gH > budgetHeightPx && gH <= budgetHeightPx) {
                    // Header alone fills Page 1 (rare extreme case)
                    endGrpIdx = -1;
                    break;
                }
                usedH += gH;
                endGrpIdx = g;
            } else if (usedH + gH <= budgetHeightPx + 1) {
                usedH += gH;
                endGrpIdx = g;
            } else {
                break;
            }
        }

        if (endGrpIdx === -1) {
            slices.push({
                startRow: 0,
                endRow: -1,
                includeDocHeader: true,
                headerGroupRows: []
            });
            // Next iteration will not be first page, so curStartGrpIdx progresses
            continue;
        }

        slices.push({
            startRow: groups[curStartGrpIdx].startRow,
            endRow: groups[endGrpIdx].endRow,
            includeDocHeader: isFirstVerticalPage,
            headerGroupRows: shouldRepeatTableHeader ? repeatHeaderRowIndices : []
        });

        curStartGrpIdx = endGrpIdx + 1;
    }

    return slices;
}

export interface ComputePaginatedLayoutParams {
    cells: GridCell[][];
    colWidths: number[];
    rowHeights: number[];
    headerHeight: number;
    paperMetrics: RaporPaperMetrics;
    pageSetup: NormalizedRaporPageSetup;
}

export function computePaginatedRaporLayout({
    cells,
    colWidths,
    rowHeights,
    headerHeight,
    paperMetrics,
    pageSetup
}: ComputePaginatedLayoutParams): ComputedPaginatedLayout {
    const rawRowCount = cells?.length || 0;
    const rawColCount = colWidths.length || cells?.[0]?.length || 1;
    const { availableW, availableH } = paperMetrics;

    const isSinglePageFit =
        typeof pageSetup.printScale !== 'number' &&
        pageSetup.fitWidthPages === 1 &&
        pageSetup.fitHeightPages === 1;

    // Trim trailing completely empty, unbordered, uncolored canvas rows/columns across all fit presets
    // so blank grid padding never distorts 1-page scaling or creates phantom overflow.
    const effectiveRowCount = Math.max(1, getEffectivePopulatedRowCount(cells));
    const effectiveColCount = Math.max(1, getEffectivePopulatedColCount(cells, rawColCount));

    const activeColWidths = colWidths.slice(0, effectiveColCount);
    const totalColWidth = activeColWidths.reduce((a, b) => a + b, 0) || availableW;
    const naturalWidth = pageSetup.fitWidthPages === 1
        ? Math.max(availableW, totalColWidth)
        : totalColWidth;

    const groups = buildAtomicRowGroups(cells, effectiveRowCount);
    const detectedHeaderGrp = pageSetup.repeatHeaderRows ? detectTableHeaderGroup(cells, groups) : null;

    const totalRowsHeight = rowHeights
        .slice(0, effectiveRowCount)
        .reduce((acc, h) => acc + (h || 30), 0);
    const totalNaturalHeight = headerHeight + totalRowsHeight + (isSinglePageFit ? 14 : 4);

    let scale = 1;

    if (typeof pageSetup.printScale === 'number') {
        scale = Math.max(0.2, Math.min(1.5, pageSetup.printScale / 100));
    } else {
        // 1. Solve max scale allowed by Fit Width Pages
        let maxScaleW = 1;
        if (pageSetup.fitWidthPages === 1) {
            maxScaleW = Math.min(1, availableW / naturalWidth);
        } else if (typeof pageSetup.fitWidthPages === 'number' && pageSetup.fitWidthPages > 1) {
            const targetWPages = pageSetup.fitWidthPages;
            if (partitionColumnsIntoPages(activeColWidths, effectiveColCount, availableW).length > targetWPages) {
                let lo = 0.2;
                let hi = 1.0;
                for (let iter = 0; iter < 24; iter++) {
                    const mid = (lo + hi) / 2;
                    const count = partitionColumnsIntoPages(activeColWidths, effectiveColCount, availableW / mid).length;
                    if (count <= targetWPages) lo = mid;
                    else hi = mid;
                }
                maxScaleW = lo;
            }
        }

        // 2. Solve max scale allowed by Fit Height Pages
        let maxScaleH = 1;
        if (pageSetup.fitHeightPages === 1) {
            maxScaleH = totalNaturalHeight > availableH ? availableH / totalNaturalHeight : 1;
        } else if (typeof pageSetup.fitHeightPages === 'number' && pageSetup.fitHeightPages > 1) {
            const targetHPages = pageSetup.fitHeightPages;
            // First check if at maxScaleW it ALREADY fits within targetHPages!
            const pagesAtMaxW = partitionRowsIntoPages(
                cells,
                groups,
                rowHeights,
                headerHeight,
                availableH / maxScaleW,
                detectedHeaderGrp
            ).length;

            if (pagesAtMaxW <= targetHPages) {
                maxScaleH = maxScaleW;
            } else {
                let lo = 0.2;
                let hi = maxScaleW;
                for (let iter = 0; iter < 26; iter++) {
                    const mid = (lo + hi) / 2;
                    const vCount = partitionRowsIntoPages(
                        cells,
                        groups,
                        rowHeights,
                        headerHeight,
                        availableH / mid,
                        detectedHeaderGrp
                    ).length;
                    if (vCount <= targetHPages) lo = mid;
                    else hi = mid;
                }
                maxScaleH = lo;
            }
        }

        const rawMinScale = Math.min(maxScaleW, maxScaleH);
        scale = Math.max(0.2, Math.min(1, Math.floor(rawMinScale * 10000) / 10000));
    }

    // Build final slices using the resolved scale
    if (isSinglePageFit) {
        const singlePage: PaginatedRaporPage = {
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
            endRow: Math.max(0, effectiveRowCount - 1),
            startCol: 0,
            endCol: Math.max(0, effectiveColCount - 1),
            sliceColWidths: activeColWidths,
            sliceNaturalWidth: naturalWidth,
            sliceNaturalHeight: totalNaturalHeight,
            stretchColsToFillWidth: totalColWidth <= availableW
        };
        return {
            scale,
            naturalWidth,
            effectiveRowCount,
            effectiveColCount,
            isSinglePageFit: true,
            pages: [singlePage]
        };
    }

    const hSlices = pageSetup.fitWidthPages === 1
        ? [{ startCol: 0, endCol: effectiveColCount - 1 }]
        : partitionColumnsIntoPages(activeColWidths, effectiveColCount, Math.floor(availableW / scale));

    const vSlices = pageSetup.fitHeightPages === 1
        ? [{
            startRow: 0,
            endRow: effectiveRowCount - 1,
            includeDocHeader: true,
            headerGroupRows: [] as number[]
        }]
        : partitionRowsIntoPages(
            cells,
            groups,
            rowHeights,
            headerHeight,
            Math.floor(availableH / scale),
            detectedHeaderGrp
        );

    const totalVPages = vSlices.length;
    const totalHPages = hSlices.length;
    const totalPages = totalVPages * totalHPages;
    const pages: PaginatedRaporPage[] = [];

    // Excel default page order: "Down, then Over" (Halaman 1..V turun ke bawah dulu, baru kolom samping bila ada)
    let pageIndex = 0;
    for (let hIdx = 0; hIdx < totalHPages; hIdx++) {
        const hSlice = hSlices[hIdx];
        const sliceColWidths = colWidths.slice(hSlice.startCol, hSlice.endCol + 1);
        const rawSliceW = sliceColWidths.reduce((a, b) => a + b, 0) || availableW;
        const stretchColsToFillWidth = totalHPages === 1 && pageSetup.fitWidthPages === 1 && rawSliceW <= availableW;
        const sliceNaturalWidth = stretchColsToFillWidth ? availableW : rawSliceW;

        for (let vIdx = 0; vIdx < totalVPages; vIdx++) {
            const vSlice = vSlices[vIdx];
            const includeHdr = vSlice.includeDocHeader && hIdx === 0;
            const repeatedHdrH = vSlice.headerGroupRows.reduce((acc, r) => acc + (rowHeights[r] || 30), 0);
            let bodyRowsH = 0;
            if (vSlice.endRow >= vSlice.startRow) {
                for (let r = vSlice.startRow; r <= vSlice.endRow; r++) {
                    bodyRowsH += rowHeights[r] || 30;
                }
            }
            const sliceNaturalHeight = (includeHdr ? headerHeight : 0) + repeatedHdrH + bodyRowsH + 4;

            pages.push({
                pageIndex,
                pageNumber: pageIndex + 1,
                totalPages,
                vIndex: vIdx,
                hIndex: hIdx,
                totalVPages,
                totalHPages,
                includeDocHeader: includeHdr,
                headerGroupRows: vSlice.headerGroupRows,
                startRow: vSlice.startRow,
                endRow: vSlice.endRow,
                startCol: hSlice.startCol,
                endCol: hSlice.endCol,
                sliceColWidths,
                sliceNaturalWidth,
                sliceNaturalHeight,
                stretchColsToFillWidth
            });
            pageIndex++;
        }
    }

    return {
        scale,
        naturalWidth,
        effectiveRowCount,
        effectiveColCount,
        isSinglePageFit: false,
        pages
    };
}

/**
 * Resolves the renderable cells for a specific row `rIdx` within a `PaginatedRaporPage`,
 * clamping colSpan/rowSpan to the page slice and ensuring shared table borders at cut boundaries remain closed.
 */
export function getRenderableRowCellsForPage(
    cells: GridCell[][],
    rIdx: number,
    page: PaginatedRaporPage,
    isRepeatedHeaderRow: boolean = false
): PaginatedSliceCell[] {
    const row = cells[rIdx] || [];
    const result: PaginatedSliceCell[] = [];
    const { startCol, endCol } = page;
    const sliceRowStart = isRepeatedHeaderRow ? page.headerGroupRows[0] : page.startRow;
    const sliceRowEnd = isRepeatedHeaderRow
        ? page.headerGroupRows[page.headerGroupRows.length - 1]
        : page.endRow;

    let c = startCol;
    while (c <= endCol) {
        const directCell = row[c];

        if (directCell && !directCell.hidden) {
            const rawColSpan = Math.max(1, directCell.colSpan || 1);
            const rawRowSpan = Math.max(1, directCell.rowSpan || 1);
            const clampedColSpan = Math.min(rawColSpan, endCol - c + 1);
            const clampedRowSpan = Math.min(rawRowSpan, Math.max(1, sliceRowEnd - rIdx + 1));

            const origBorders = directCell.borders || { top: false, right: false, bottom: false, left: false };
            const cellBottomRow = rIdx + clampedRowSpan - 1;
            const cellRightCol = c + clampedColSpan - 1;

            // Inherit shared neighbor border if this cell sits right on a vertical/horizontal page split line
            const topNeighborBorder =
                rIdx === sliceRowStart && rIdx > 0
                    ? Boolean(cells[rIdx - 1]?.[c]?.borders?.bottom)
                    : false;
            const bottomNeighborBorder =
                cellBottomRow === sliceRowEnd && cellBottomRow + 1 < cells.length
                    ? Boolean(cells[cellBottomRow + 1]?.[c]?.borders?.top)
                    : false;
            const leftNeighborBorder =
                c === startCol && c > 0
                    ? Boolean(cells[rIdx]?.[c - 1]?.borders?.right)
                    : false;
            const rightNeighborBorder =
                cellRightCol === endCol && cellRightCol + 1 < row.length
                    ? Boolean(cells[rIdx]?.[cellRightCol + 1]?.borders?.left)
                    : false;

            result.push({
                cell: directCell,
                masterR: rIdx,
                masterC: c,
                renderCol: c,
                colSpan: clampedColSpan,
                rowSpan: clampedRowSpan,
                borders: {
                    top: Boolean(origBorders.top || topNeighborBorder),
                    right: Boolean(origBorders.right || rightNeighborBorder),
                    bottom: Boolean(origBorders.bottom || bottomNeighborBorder),
                    left: Boolean(origBorders.left || leftNeighborBorder)
                }
            });

            c += clampedColSpan;
            continue;
        }

        // Handle rare case where a horizontal page split starts inside a colSpan that began on an earlier horizontal page
        if (c === startCol && startCol > 0) {
            let foundMaster: { cell: GridCell; mc: number; mr: number } | null = null;
            for (let mc = startCol - 1; mc >= 0; mc--) {
                const candidate = row[mc];
                if (candidate && !candidate.hidden) {
                    const spanEndCol = mc + Math.max(1, candidate.colSpan || 1) - 1;
                    if (spanEndCol >= startCol) {
                        foundMaster = { cell: candidate, mc, mr: rIdx };
                    }
                    break;
                }
            }
            if (foundMaster) {
                const spanEndCol = foundMaster.mc + Math.max(1, foundMaster.cell.colSpan || 1) - 1;
                const clampedColSpan = Math.min(spanEndCol - startCol + 1, endCol - startCol + 1);
                const clampedRowSpan = Math.min(
                    Math.max(1, foundMaster.cell.rowSpan || 1),
                    Math.max(1, sliceRowEnd - rIdx + 1)
                );
                const origB = foundMaster.cell.borders || { top: false, right: false, bottom: false, left: false };
                result.push({
                    cell: { ...foundMaster.cell, value: '' },
                    masterR: foundMaster.mr,
                    masterC: foundMaster.mc,
                    renderCol: startCol,
                    colSpan: clampedColSpan,
                    rowSpan: clampedRowSpan,
                    borders: {
                        top: Boolean(origB.top),
                        right: Boolean(origB.right),
                        bottom: Boolean(origB.bottom),
                        left: Boolean(origB.left)
                    }
                });
                c += clampedColSpan;
                continue;
            }
        }

        // Hidden cell covered by an in-page rowSpan/colSpan above or to the left -> skip rendering <td>
        c++;
    }

    return result;
}

/**
 * Resolves exact integer pixel widths for `<col>` elements so their sum equals `targetTotalWidth`
 * without subpixel percentage rounding drift (`100.003%` / `99.997%`) under `table-layout: fixed` + CSS `scale()`.
 */
export function resolveExactColPixelWidths(
    colWidths: number[],
    targetTotalWidth: number,
    stretch: boolean
): number[] {
    if (colWidths.length === 0) return [];
    if (!stretch) return colWidths.map(w => Math.max(1, Math.round(w || 100)));
    const rawSum = colWidths.reduce((a, b) => a + (b || 0), 0);
    if (rawSum <= 0) return colWidths.map(w => Math.max(1, Math.round(w || 100)));

    const roundedTarget = Math.max(colWidths.length, Math.round(targetTotalWidth));
    const exact = colWidths.map(w => ((w || 0) / rawSum) * roundedTarget);
    const floored = exact.map(v => Math.max(1, Math.floor(v)));
    const currentSum = floored.reduce((a, b) => a + b, 0);
    const remainder = roundedTarget - currentSum;

    if (remainder > 0) {
        const indicesByFrac = exact
            .map((v, idx) => ({ idx, frac: v - Math.floor(v) }))
            .sort((a, b) => b.frac - a.frac);
        for (let i = 0; i < remainder; i++) {
            floored[indicesByFrac[i % indicesByFrac.length].idx] += 1;
        }
    } else if (remainder < 0) {
        const indicesByWidth = floored
            .map((v, idx) => ({ idx, v }))
            .sort((a, b) => b.v - a.v);
        let toSub = -remainder;
        for (let i = 0; i < indicesByWidth.length && toSub > 0; i++) {
            const targetIdx = indicesByWidth[i].idx;
            const removable = Math.max(0, floored[targetIdx] - 1);
            const delta = Math.min(removable, toSub);
            floored[targetIdx] -= delta;
            toSub -= delta;
        }
    }

    return floored;
}

export interface RaporFooterTypography {
    baseBodyFontPx: number;
    renderedBodyFontPx: number;
    footerFontPx: number;
    borderTopWidthPx: number;
    paddingTopPx: number;
}

/**
 * Computes balanced footer & credit typography proportional to the Rapor's dominant body font size
 * and active page-fit scale so the footer never overpowers or clashes with the Rapor text.
 */
export function computeRaporFooterTypography(
    cells: GridCell[][] | undefined,
    scale: number = 1
): RaporFooterTypography {
    const allSizes: number[] = [];
    const bodySizes: number[] = [];

    if (cells && cells.length > 0) {
        for (let r = 0; r < cells.length; r++) {
            const row = cells[r] || [];
            for (let c = 0; c < row.length; c++) {
                const cell = row[c];
                if (!cell || cell.hidden) continue;
                const val = (cell.value || '').trim();
                const hasText = val !== '' && !/^\$(LOGO|KOP|TTD|STEMPEL)/i.test(val);
                const hasInputKey =
                    (cell.type === 'input' || cell.type === 'dropdown' || cell.type === 'formula') &&
                    Boolean(cell.key && cell.key.trim() !== '');
                if (!hasText && !hasInputKey) continue;

                const fs = typeof cell.fontSize === 'number' && cell.fontSize > 0 ? cell.fontSize : 11;
                allSizes.push(fs);
                if (!(r <= 3 && fs >= 14)) {
                    bodySizes.push(fs);
                }
            }
        }
    }

    const pool = bodySizes.length > 0 ? bodySizes : allSizes;
    let baseBodyFontPx = 11;
    if (pool.length > 0) {
        const freq = new Map<number, number>();
        for (const s of pool) {
            const rounded = Math.round(s * 2) / 2;
            freq.set(rounded, (freq.get(rounded) || 0) + 1);
        }
        const sortedPool = [...pool].sort((a, b) => a - b);
        const median = sortedPool[Math.floor(sortedPool.length / 2)];

        let bestSize = median;
        let bestCount = 0;
        freq.forEach((count, sz) => {
            if (count > bestCount || (count === bestCount && Math.abs(sz - median) < Math.abs(bestSize - median))) {
                bestCount = count;
                bestSize = sz;
            }
        });
        baseBodyFontPx = bestSize;
    }

    const safeScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
    const renderedBodyFontPx = baseBodyFontPx * safeScale;
    const rawFooterPx = renderedBodyFontPx * 0.8;
    const footerFontPx = Number(Math.max(5.5, Math.min(10, rawFooterPx)).toFixed(2));
    const borderTopWidthPx = safeScale < 0.85 ? 0.75 : 1;
    const paddingTopPx = Number(Math.max(1.5, Math.min(4, footerFontPx * 0.28)).toFixed(1));

    return {
        baseBodyFontPx,
        renderedBodyFontPx,
        footerFontPx,
        borderTopWidthPx,
        paddingTopPx
    };
}


