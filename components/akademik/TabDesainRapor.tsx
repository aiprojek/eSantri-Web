import React, { useState, useEffect, useMemo, useRef, useLayoutEffect } from 'react';
import { useAppContext } from '../../AppContext';
import { useSantriContext } from '../../contexts/SantriContext';
import { RaporTemplate, RaporSheet, GridCell, RaporColumnType, DigitalAsset } from '../../types';
import { loadXLSX } from '../../utils/lazyClientLibs';
import { DYNAMIC_TAG_CATEGORIES, isMediaTag, getMediaTagImageSrc, resolveRaporText, RaporResolveContext } from '../../utils/raporPlaceholderResolver';
import { RAPOR_FORMULA_SUGGESTIONS, applyCellTextTransform } from '../../utils/raporFormulaUtils';
import { getAcademicYearsFromSettings, getDefaultAcademicYear } from '../../utils/academicYear';
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
    activeTemplate: RaporTemplate;
    settings: any;
    digitalAssets: DigitalAsset[];
    resolveContext: RaporResolveContext;
    renderPreviewCell: (cell: GridCell) => { content: React.ReactNode; isMedia: boolean };
}

const DesignPreviewSheetCard: React.FC<DesignPreviewSheetCardProps> = ({
    sh,
    sIdx,
    activeTemplate,
    resolveContext,
    renderPreviewCell
}) => {
    const innerRef = useRef<HTMLDivElement>(null);
    const [measuredHeight, setMeasuredHeight] = useState<number>(0);

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

    const rowHeights = useMemo(() => {
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

    const totalColWidth = colWidths.reduce((a, b) => a + b, 0) || 727;
    const isF4 = sh.paperSize === 'F4' || activeTemplate.paperSize === 'F4';
    const marginMode = sh.marginMode || activeTemplate.marginMode || 'normal';
    const padSidePx = marginMode === 'normal' ? 32 : marginMode === 'narrow' ? 16 : 8;
    const paperWidth = isF4 ? '21.5cm' : '21cm';
    const paperHeight = isF4 ? '33cm' : '29.7cm';
    const paperPxW = isF4 ? 812.6 : 793.7;
    const paperPxH = isF4 ? 1247.2 : 1122.5;
    const availableW = Math.max(300, Math.floor(paperPxW - padSidePx * 2 - 2));
    const availableH = Math.max(400, Math.floor(paperPxH - padSidePx * 2 - 8));

    const naturalWidth = Math.max(availableW, totalColWidth);
    const isFitPage = sh.fitToPage !== false && activeTemplate.fitToPage !== false;
    const printScale = sh.printScale ?? activeTemplate.printScale ?? 'auto';

    const estimatedHeight = useMemo(() => {
        const rowsSum = rowHeights.reduce<number>((acc, h) => acc + (h || 30), 0);
        return ((sh.customTitle || sh.showJudul) ? 55 : 0) + rowsSum + 16;
    }, [rowHeights, sh.customTitle, sh.showJudul]);

    useLayoutEffect(() => {
        const measure = () => {
            const el = innerRef.current;
            if (!el) return;
            const h = Math.max(el.offsetHeight, el.scrollHeight);
            if (h > 0) {
                setMeasuredHeight(prev => (Math.abs(h - prev) > 1 ? h : prev));
            }
        };
        measure();
        let ro: ResizeObserver | null = null;
        if (typeof ResizeObserver !== 'undefined' && innerRef.current) {
            ro = new ResizeObserver(() => measure());
            ro.observe(innerRef.current);
        }
        return () => {
            if (ro) ro.disconnect();
        };
    }, [sh, naturalWidth]);

    const effectiveNaturalH = measuredHeight > 0 ? measuredHeight : estimatedHeight;
    const scaleX = availableW / naturalWidth;
    const scaleY = isFitPage && effectiveNaturalH > availableH ? availableH / effectiveNaturalH : 1;
    const rawScale = typeof printScale === 'number'
        ? (isFitPage ? Math.min(printScale / 100, scaleX, scaleY) : Math.min(printScale / 100, scaleX))
        : (isFitPage ? Math.min(1, scaleX, scaleY) : Math.min(1, scaleX));
    const sheetScale = Math.max(0.2, Math.min(1, Number(rawScale.toFixed(4))));
    const scaledW = Math.floor(naturalWidth * sheetScale);
    const scaledH = effectiveNaturalH > 0 ? Math.ceil(effectiveNaturalH * sheetScale) : undefined;

    const paddingClass = marginMode === 'normal' ? 'p-8' : marginMode === 'narrow' ? 'p-4' : 'p-2';

    return (
        <div className="w-full overflow-x-auto p-1 flex justify-start sm:justify-center">
            <div
                className={`bg-white shadow-2xl ${paddingClass} relative shrink-0 rounded-xs border border-slate-300`}
                style={{
                    width: paperWidth,
                    minHeight: isFitPage ? undefined : paperHeight,
                    height: isFitPage ? paperHeight : undefined,
                    maxHeight: isFitPage ? paperHeight : undefined,
                    overflow: isFitPage ? 'hidden' : undefined,
                    boxSizing: 'border-box'
                }}
            >
                <div className="absolute top-2 right-4 text-[10px] text-gray-400 font-mono select-none flex items-center gap-2 z-30">
                    <span>{sh.name} (Lembar {sIdx + 1})</span>
                    <span className="px-1.5 py-0.5 bg-slate-100 rounded text-[9px] font-bold text-slate-500 uppercase">{isF4 ? 'F4' : 'A4'}</span>
                    {isFitPage && (
                        <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[9px] font-bold">
                            Fit 1 Muka ({Math.round(sheetScale * 100)}%)
                        </span>
                    )}
                    {!isFitPage && sheetScale < 1 && (
                        <span className="px-1.5 py-0.5 bg-teal-50 text-teal-700 rounded text-[9px] font-bold">
                            Skala: {Math.round(sheetScale * 100)}%
                        </span>
                    )}
                </div>

                <div
                    style={{
                        width: `${scaledW}px`,
                        height: sheetScale < 1 && scaledH ? `${scaledH}px` : undefined,
                        overflow: isFitPage ? 'hidden' : 'visible',
                        margin: '0 auto',
                        position: 'relative'
                    }}
                >
                    <div
                        ref={innerRef}
                        className="flex flex-col justify-start"
                        style={{
                            width: `${naturalWidth}px`,
                            transform: sheetScale < 1 ? `scale(${sheetScale})` : undefined,
                            transformOrigin: 'top left'
                        }}
                    >
                        {(sh.customTitle || sh.showJudul) && (
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

                        <table className="w-full border-collapse table-fixed">
                            <colgroup>
                                {colWidths.map((w, cIdx) => (
                                    <col
                                        key={cIdx}
                                        style={{
                                            width: totalColWidth > availableW
                                                ? `${w}px`
                                                : `${((w / totalColWidth) * 100).toFixed(3)}%`
                                        }}
                                    />
                                ))}
                            </colgroup>
                            <tbody>
                                {sh.cells.map((row, rIdx) => {
                                    const rH = rowHeights[rIdx];
                                    return (
                                        <tr key={rIdx} style={{ height: rH ? `${rH}px` : undefined }}>
                                            {row.map((cell, cIdx) => {
                                                if (cell.hidden) return null;
                                                const borders = cell.borders || { top: false, right: false, bottom: false, left: false };
                                                const isLogo = typeof cell.value === 'string' && (cell.value.includes('LOGO') || cell.value === '$LOGO');
                                                const hasCustomBg = Boolean(cell.backgroundColor && cell.backgroundColor !== 'transparent' && cell.backgroundColor !== '#ffffff');
                                                const { content: rawContent, isMedia } = renderPreviewCell(cell);
                                                const content = (!isMedia && (typeof rawContent === 'string' || typeof rawContent === 'number') && cell.textTransform && cell.textTransform !== 'none')
                                                    ? applyCellTextTransform(String(rawContent), cell.textTransform)
                                                    : rawContent;

                                                const effectiveFontSize = cell.fontSize || 11;
                                                const hAlign = cell.align || 'center';
                                                const vAlign = cell.verticalAlign || 'middle';
                                                const textWrap = cell.textWrap || 'wrap';
                                                const isFloat = textWrap === 'float' && !isMedia;
                                                const isClip = textWrap === 'clip';

                                                const cellColSpan = cell.colSpan || 1;
                                                let cellWidthPx = 0;
                                                for (let i = 0; i < cellColSpan; i++) {
                                                    cellWidthPx += colWidths[cIdx + i] || 100;
                                                }

                                                const cellRowSpan = cell.rowSpan || 1;
                                                let cellHeightPx: number | undefined = undefined;
                                                if (rH !== undefined || cell.height !== undefined) {
                                                    let sumH = 0;
                                                    for (let i = 0; i < cellRowSpan; i++) {
                                                        sumH += rowHeights[rIdx + i] ?? cell.height ?? 30;
                                                    }
                                                    cellHeightPx = sumH;
                                                }

                                                const cellPadding = cellWidthPx < 22 ? '1px' : '2px 4px';

                                                return (
                                                    <td
                                                        key={`${rIdx}-${cIdx}`}
                                                        colSpan={cell.colSpan}
                                                        rowSpan={cell.rowSpan}
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
                                                            overflow: isFloat ? 'visible' : 'hidden',
                                                            position: isFloat ? 'relative' : undefined
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
                                                                    height: cellHeightPx ? `${cellHeightPx}px` : '100%',
                                                                    maxHeight: cellHeightPx ? `${cellHeightPx}px` : undefined,
                                                                    padding: isMedia ? '1px' : cellPadding,
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
                                                                    {content}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const TabDesainRapor: React.FC = () => {
    const { settings, onSaveSettings, showToast, showConfirmation, showAlert, currentUser } = useAppContext();
    const { santriList } = useSantriContext();
    const canWrite = currentUser?.role === 'admin' || currentUser?.permissions?.akademik === 'write';
    const digitalAssets = useLiveQuery(() => db.digitalAssets.toArray(), []) || [];
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
            return activeTemplate.sheets;
        }
        return [{
            id: 'sheet_default',
            name: 'Lembar 1 (Akademik)',
            rowCount: activeTemplate.rowCount,
            colCount: activeTemplate.colCount,
            cells: activeTemplate.cells,
            paperSize: 'A4' as const
        }];
    }, [activeTemplate]);

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
                colCount: currentSheet.colCount
            };
        }
        const defaultSheet: RaporSheet = {
            id: 'sheet_' + Date.now(),
            name: 'Lembar 1 (Akademik)',
            rowCount: tpl.rowCount || tpl.cells?.length || 10,
            colCount: tpl.colCount || tpl.cells?.[0]?.length || 8,
            cells: tpl.cells || createInitialGrid(10, 8),
            showJudul: tpl.showJudul,
            paperSize: 'A4'
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
            paperSize: 'A4' as const
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
                paperSize: tpl.paperSize || sheets[idx].paperSize,
                printScale: tpl.printScale || sheets[idx].printScale,
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
                paperSize: tpl.paperSize || 'A4',
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
            paperSize: targetSheet.paperSize,
            printScale: targetSheet.printScale,
            marginMode: targetSheet.marginMode
        });
    };

    const handleAddSheet = (name?: string) => {
        if (!activeTemplate) return;
        const synced = syncCurrentSheetToTemplate(activeTemplate, activeSheetId);
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

        const clonedCells: GridCell[][] = targetSheet.cells.map((row, r) =>
            row.map((cell, c) => ({
                ...cell,
                id: `cell_${Date.now()}_${r}_${c}_${Math.random().toString(36).substr(2, 4)}`
            }))
        );
        const newSheetId = 'sheet_' + Date.now();
        const newSheetName = `${targetSheet.name} (Salinan)`;
        const newSheet: RaporSheet = {
            id: newSheetId,
            name: newSheetName,
            rowCount: targetSheet.rowCount,
            colCount: targetSheet.colCount,
            cells: clonedCells,
            paperSize: targetSheet.paperSize,
            orientation: targetSheet.orientation
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
            colCount: targetSheet.colCount
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
        setActiveTemplate(prev => {
            if (!prev) return null;
            const sheets = (prev.sheets || []).map(s => s.id === sheetId ? { ...s, name: newName.trim() } : s);
            return { ...prev, sheets };
        });
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
                
                const systemKeys = ['$NAMA', '$NIS', '$NISN', '$KELAS', '$ROMBEL', '$SEMESTER', '$TAHUN_AJAR', '$NAMA_YAYASAN', '$NAMA_PONPES', '$ALAMAT_PONDOK', '$LOGO', '$WALI_KELAS', '$MUDIR', '$TOTAL_NILAI', '$RATA_RATA', '$PERINGKAT'];
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
                                        : `$${inner}`;
                                    newCells[r][c].value = mappedTag;
                                    newCells[r][c].type = 'data';
                                    hasBiodataInSheet = true;
                                } else if (valStr.startsWith('$')) {
                                    if (systemKeys.includes(valStr) || valStr.startsWith('$MAPEL_NAME') || valStr.startsWith('$TOTAL') || valStr.startsWith('$RATA') || valStr.startsWith('$RANK')) {
                                        newCells[r][c].type = 'data';
                                        if (valStr === '$NAMA' || valStr === '$NIS' || valStr === '$ROMBEL' || valStr === '$PERINGKAT') {
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
                setZoomScale(1);
                showToast(`Import Berhasil! (${importedSheets.length} lembar dimuat)`, 'success');
            } catch (e) { showAlert('Gagal Import File', (e as Error).message); } finally { if (fileInputRef.current) fileInputRef.current.value = ''; }
        };
        reader.readAsBinaryString(file);
    };

    // --- UNDO / REDO HISTORY & GRID OPERATIONS ---
    const pushToHistory = (tpl: RaporTemplate) => {
        try {
            const snapshot = JSON.parse(JSON.stringify(tpl));
            setUndoStack(prev => [...prev.slice(-24), snapshot]);
            setRedoStack([]);
            setIsDirty(true);
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
        showToast('Undo: Berhasil membatalkan aksi terakhir.', 'info');
    };

    const handleRedo = () => {
        if (redoStack.length === 0 || !activeTemplate) return;
        const next = redoStack[redoStack.length - 1];
        setRedoStack(r => r.slice(0, -1));
        setUndoStack(u => [...u.slice(-24), JSON.parse(JSON.stringify(activeTemplate))]);
        setActiveTemplate(next);
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
        if (up.startsWith('$MAPEL_') || up.startsWith('$TTD_')) return true;
        for (const cat of DYNAMIC_TAG_CATEGORIES) {
            if (cat.tags.some(t => t.tag.toUpperCase() === up)) return true;
        }
        const aliases = [
            '$TAHUNAJAR', '$TAHUN_AJAR', '$TAHUNAJARAN', '$TAHUN_AJARAN',
            '$MARHALAH', '$JENJANG', '$TINGKAT', '$KELAS', '$ROMBEL', '$SEMESTER',
            '$FASE', '$CAPAIAN_KOMPETENSI', '$P5', '$CATATAN_WALIKELAS', '$LOGO'
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
            nextValue = trimmed;
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
        const next = { r: master.r, c: master.c, draft };
        editingCellRef.current = next;
        setEditingCell(next);
    };

    const commitInlineEdit = (moveDelta?: { dr: number; dc: number }) => {
        const current = editingCellRef.current;
        if (!current) return;
        editingCellRef.current = null;
        setEditingCell(null);

        let latestTpl = activeTemplate;
        if (activeTemplate && canWrite) {
            const { updatedTpl, changed } = applySmartCellTextCommit(activeTemplate, current.r, current.c, current.draft);
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

        return items;
    }, [activeTemplate, activeSheetId]);

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
    }, [isEditing, isDesignPreviewOpen, isExcelPasteModalOpen, isKurikulumGeneratorOpen, isFormatPainterActive, internalClipboard, undoStack, redoStack, activeTemplate, selectedCells, canWrite]);

    // --- GRID OPERATIONS ---
    const handleMouseDown = (r: number, c: number) => {
        if (editingCellRef.current) {
            if (editingCellRef.current.r === r && editingCellRef.current.c === c) {
                return;
            }
            commitInlineEdit();
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
        if (!isDragging || !dragStart) return;
        const rMin = Math.min(dragStart.r, r); const rMax = Math.max(dragStart.r, r);
        const cMin = Math.min(dragStart.c, c); const cMax = Math.max(dragStart.c, c);
        const newSelection = [];
        for(let i=rMin; i<=rMax; i++) for(let j=cMin; j<=cMax; j++) newSelection.push({ r: i, c: j });
        setSelectedCells(newSelection);
    };
    const handleMouseUp = () => {
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
        const newCells = [...activeTemplate.cells];
        const { row, col } = activeCellData;
        newCells[row][col] = { ...newCells[row][col], ...updates };
        if (updates.key) newCells[row][col].key = updates.key.toUpperCase().replace(/[^A-Z0-9_]/g, '');
        if (typeof updates.width === 'number') {
            for (let r = 0; r < newCells.length; r++) {
                if (newCells[r][col]) newCells[r][col].width = updates.width;
            }
        }
        if (typeof updates.height === 'number') {
            for (let c = 0; c < newCells[row].length; c++) {
                if (newCells[row][c]) newCells[row][c].height = updates.height;
            }
        }
        const updated = { ...activeTemplate, cells: newCells };
        setActiveTemplate(syncCurrentSheetToTemplate(updated, activeSheetId));
    };

    const curSheet = useMemo(() => {
        if (!activeSheets.length) return null;
        return activeSheets.find(s => s.id === (activeSheetId || activeTemplate?.activeSheetId)) || activeSheets[0];
    }, [activeSheets, activeSheetId, activeTemplate]);

    const paperFormat = curSheet?.paperSize || activeTemplate?.paperSize || 'A4';
    // Printable height estimation at 96 DPI: A4 is 297mm (printable ~980px); F4 is 330mm (printable ~1100px)
    const pageBreakThresholdPx = paperFormat === 'F4' ? 1100 : 980;

    const rowHeightsList = useMemo(() => {
        if (!activeTemplate) return [];
        return Array.from({ length: activeTemplate.rowCount }).map((_, rIdx) => getRowHeight(rIdx));
    }, [activeTemplate]);

    const totalDesignHeight = useMemo(() => {
        return rowHeightsList.reduce((acc, h) => acc + h, 0);
    }, [rowHeightsList]);

    const pageBreakRowIndices = useMemo(() => {
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
    }, [rowHeightsList, pageBreakThresholdPx]);

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
            paperSize: updates.paperSize || activeTemplate.paperSize,
            printScale: updates.printScale || activeTemplate.printScale,
            marginMode: updates.marginMode || activeTemplate.marginMode
        };
        setActiveTemplate(updatedTpl);
    };

    const getSimulatedValue = (cell: GridCell) => {
        const formatText = (str: string) => applyCellTextTransform(str, cell.textTransform);

        if (cell.type === 'label') return formatText(cell.value || '');
        if (cell.type === 'input') return <span className="text-blue-500 italic text-[10px] font-mono bg-blue-50 px-1 rounded border border-blue-100">[Input: {cell.key || 'NILAI'}]</span>;
        if (cell.type === 'formula') return <span className="text-yellow-700 italic text-[10px] font-mono bg-yellow-50 px-1 rounded border border-yellow-100">{cell.value || '[Rumus]'}</span>;
        if (cell.type === 'dropdown') {
            const firstOpt = cell.options && cell.options.length > 0 ? cell.options[0] : (cell.key || 'Pilihan');
            return <span className="text-orange-700 italic text-[10px] font-mono bg-orange-50 px-1 rounded border border-orange-200">[▼ {formatText(firstOpt)}]</span>;
        }
        if (cell.type === 'data') {
            const val = cell.value?.trim() || '';
            if (isMediaTag(val)) {
                const simulatedContext = {
                    settings,
                    digitalAssets,
                    santri: { id: 1, namaLengkap: 'Ahmad Fauzan', nis: '202401001', nisn: '0081234567', rombelId: 1, kelasId: 1, jenjangId: 1, status: 'Aktif' } as any,
                    targetDate: new Date()
                };
                const imgSrc = getMediaTagImageSrc(val, simulatedContext);
                if (imgSrc) {
                    const isStempel = val.includes('STEMPEL');
                    const isTtd = val.includes('TTD');
                    return (
                        <div className="flex items-center justify-center p-0.5">
                            <img 
                                src={imgSrc} 
                                alt={val} 
                                className={`object-contain ${isStempel ? 'max-h-12 max-w-[80px] opacity-90' : isTtd ? 'max-h-10 max-w-[100px]' : 'max-h-10 max-w-[80px]'}`} 
                            />
                        </div>
                    );
                }
                if (val === '$STEMPEL_PONPES') return <span className="text-rose-600 font-bold text-[10px] bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded flex items-center gap-1 justify-center"><i className="bi bi-patch-check-fill"></i> Stempel Ponpes</span>;
                if (val === '$LOGO_PONPES') return <span className="text-teal-700 font-bold text-[10px] bg-teal-50 px-1.5 py-0.5 rounded flex items-center gap-1 justify-center"><i className="bi bi-image"></i> Logo Ponpes</span>;
                if (val === '$LOGO_YAYASAN') return <span className="text-indigo-700 font-bold text-[10px] bg-indigo-50 px-1.5 py-0.5 rounded flex items-center gap-1 justify-center"><i className="bi bi-image-fill"></i> Logo Yayasan</span>;
                if (val.includes('TTD')) return <span className="text-purple-600 font-bold text-[10px] bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded flex items-center gap-1 justify-center"><i className="bi bi-pen-fill"></i> {val.replace('$', '')}</span>;
                return <span className="text-rose-500 italic text-[10px] font-mono bg-rose-50 px-1 rounded border border-rose-100">[{val}]</span>;
            }

            // Live values from active settings for Tahun Ajaran, Semester, & Identitas Pondok
            const upperVal = val.toUpperCase();
            const years = getAcademicYearsFromSettings(settings);
            const activeYearObj = years.find(y => y.isActive) || years[0];
            const liveTahunAjar = activeYearObj?.labelMasehi?.trim() || getDefaultAcademicYear(settings);
            const liveSemester = activeYearObj?.semesterAktif || 'Ganjil';

            if (upperVal === '$TAHUN_AJAR' || upperVal === '$TAHUN_AJARAN' || upperVal === '$TAPEL' || upperVal === '$TAHUN_PELAJARAN') {
                return formatText(liveTahunAjar);
            }
            if (upperVal === '$TAHUN_AJAR_HIJRIAH' || upperVal === '$TAHUN_AJARAN_HIJRIAH') {
                const hj = activeYearObj?.labelHijriah?.trim();
                return formatText(hj ? (/\bH$/i.test(hj) ? hj : `${hj} H`) : '1447/1448 H');
            }
            if (upperVal === '$TAHUN_AJAR_LENGKAP') {
                const hj = activeYearObj?.labelHijriah?.trim();
                return formatText(activeYearObj?.hijriEnabled && hj ? `${/\bH$/i.test(hj) ? hj : `${hj} H`} / ${liveTahunAjar} M` : liveTahunAjar);
            }
            if (upperVal === '$SEMESTER') {
                return formatText(liveSemester);
            }
            if (upperVal === '$SEMESTER_ANGKA') {
                return formatText(liveSemester === 'Genap' ? '2' : '1');
            }
            if (upperVal === '$NAMA_PONPES' && settings.namaPonpes) {
                return formatText(settings.namaPonpes);
            }
            if (upperVal === '$NAMA_YAYASAN' && settings.namaYayasan) {
                return formatText(settings.namaYayasan);
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
                        onChange={e => setActiveTemplate(t => t ? {...t, jenjangId: e.target.value ? parseInt(e.target.value) : undefined, kelasId: undefined, rombelId: undefined} : null)}
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
                            }}
                            onBlur={() => {
                                setTimeout(() => {
                                    setAutocompleteState(prev => (prev?.source === 'fx' ? null : prev));
                                }, 150);
                            }}
                            onChange={(e) => {
                                if (!activeTemplate || !activeCellData || !canWrite) return;
                                const val = e.target.value;
                                const caret = e.target.selectionStart ?? val.length;
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
                                if (e.key === 'Enter' && activeCellData) {
                                    e.preventDefault();
                                    moveSelectionFrom(activeCellData.row, activeCellData.col, 1, 0);
                                    scrollContainerRef.current?.focus({ preventScroll: true });
                                }
                            }}
                            placeholder={activeCellData ? 'Ketik = untuk Rumus atau $ untuk Tag Dinamis (Cth: =TERBILANG($MTK))' : 'Klik sel pada tabel lalu langsung ketik seperti di Excel...'}
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
                            <span className="text-xs text-slate-300 font-semibold whitespace-nowrap hidden sm:inline">
                                Format Rentang:
                            </span>
                        </div>

                        <div className="flex flex-nowrap items-center gap-1.5 shrink-0 pr-2">
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
                                                        <div className="bg-rose-100 text-rose-900 text-[10px] font-black py-1 px-3 flex items-center justify-between">
                                                            <span className="flex items-center gap-1.5">
                                                                <i className="bi bi-scissors rotate-90 text-rose-600"></i>
                                                                <span>✂ BATAS HALAMAN ({paperFormat}: ~{pageBreakThresholdPx}px)</span>
                                                            </span>
                                                            <span className="text-[9px] font-bold text-rose-700 bg-white/90 px-2 py-0.5 rounded">
                                                                Baris ke-{rIdx + 1} akan masuk ke Halaman Berikutnya
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
                                                const borders = cell.borders || { top: false, right: false, bottom: false, left: false };
                                                let cellClass = `relative transition-colors ${showGridlines ? 'border border-dashed border-gray-300' : 'border border-transparent'} `;
                                                if (borders.top) cellClass += "!border-t !border-t-black !border-solid ";
                                                if (borders.right) cellClass += "!border-r !border-r-black !border-solid ";
                                                if (borders.bottom) cellClass += "!border-b !border-b-black !border-solid ";
                                                if (borders.left) cellClass += "!border-l !border-l-black !border-solid ";
                                                if (isSelected) cellClass += "bg-blue-100/80 ";
                                                if (isActive && !isEditingThisCell) cellClass += "ring-2 ring-blue-500 ";

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

                                                const effectiveFontSize = cell.fontSize || 11;
                                                const hAlign = cell.align || 'center';
                                                const vAlign = cell.verticalAlign || 'middle';
                                                const textWrap = cell.textWrap || 'wrap';
                                                const isFloat = textWrap === 'float' && !(cell.type === 'data' && isMediaTag(cell.value || ''));
                                                const isClip = textWrap === 'clip';
                                                const cellPadding = cellWidthPx < 22 ? '1px' : '2px 4px';

                                                return (
                                                    <td 
                                                        key={cell.id} 
                                                        colSpan={cellColSpan} 
                                                        rowSpan={cellRowSpan} 
                                                        className={cellClass} 
                                                        onMouseDown={() => handleMouseDown(rIdx, cIdx)} 
                                                        onMouseEnter={() => handleMouseEnter(rIdx, cIdx)}
                                                        onClick={() => {
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
                                                            backgroundColor: !isSelected && cell.backgroundColor ? cell.backgroundColor : undefined,
                                                            color: cell.color || undefined,
                                                            fontSize: `${effectiveFontSize}px`,
                                                            overflow: (isEditingThisCell || isFloat) ? 'visible' : 'hidden',
                                                            zIndex: isEditingThisCell ? 40 : isActive ? 25 : isFloat ? 15 : undefined
                                                        }}
                                                    >
                                                        {isEditingThisCell && editingCell ? (
                                                            <textarea
                                                                ref={inlineEditorRef}
                                                                value={editingCell.draft}
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    const caret = e.target.selectionStart ?? val.length;
                                                                    detectAutocompleteTrigger(val, caret, 'inline');
                                                                    setEditingCell(prev => {
                                                                        const next = prev ? { ...prev, draft: val } : null;
                                                                        editingCellRef.current = next;
                                                                        return next;
                                                                    });
                                                                }}
                                                                onMouseDown={(e) => e.stopPropagation()}
                                                                onClick={(e) => e.stopPropagation()}
                                                                onDoubleClick={(e) => e.stopPropagation()}
                                                                onBlur={() => commitInlineEdit()}
                                                                onKeyDown={(e) => {
                                                                    e.stopPropagation();
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
                                                                    padding: cellPadding,
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
                                                                    className="absolute -right-2 top-0 bottom-0 w-4 cursor-col-resize z-30 hover:bg-teal-500/60 transition-colors touch-none"
                                                                    title="Tahan & seret ke kanan/kiri untuk mengubah lebar kolom"
                                                                    onMouseDown={(e) => handleStartColResize(e, cIdx + (cellColSpan - 1))}
                                                                    onTouchStart={(e) => handleStartColResizeTouch(e, cIdx + (cellColSpan - 1))}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                />
                                                                <div
                                                                    className="absolute left-0 right-0 -bottom-2 h-4 cursor-row-resize z-30 hover:bg-teal-500/60 transition-colors touch-none"
                                                                    title="Tahan & seret ke atas/bawah untuk mengubah tinggi baris"
                                                                    onMouseDown={(e) => handleStartRowResize(e, rIdx + (cellRowSpan - 1))}
                                                                    onTouchStart={(e) => handleStartRowResizeTouch(e, rIdx + (cellRowSpan - 1))}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                />
                                                            </>
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

                                {/* Specific Teacher Signature Helper */}
                                {selectedTagCategory === 'media' && (
                                    <div className="p-2 bg-white rounded-lg border border-purple-200 space-y-1.5 mt-2">
                                        <label className="block text-[10px] font-bold text-gray-700 uppercase">TTD Pengajar Spesifik</label>
                                        <div className="flex gap-1.5">
                                            <select
                                                id="specificTeacherTtdSelect"
                                                className="w-full text-xs border rounded p-1.5 bg-gray-50 font-medium"
                                                onChange={e => {
                                                    if (e.target.value) updateActiveCell({ value: e.target.value });
                                                }}
                                            >
                                                <option value="">-- Pilih Guru / Ustadz --</option>
                                                {settings.tenagaPengajar.map(t => (
                                                    <option key={t.id} value={`$TTD_PENGAJAR:${t.id}`}>
                                                        {t.nama}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
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
                            <div className="space-y-2">
                                <div>
                                    <label className="block text-xs font-bold mb-1 text-blue-700">KODE VARIABEL ($)</label>
                                    <input 
                                        type="text" 
                                        value={activeCellData.key || ''} 
                                        onChange={e => updateActiveCell({ key: e.target.value })} 
                                        className="w-full border rounded p-2 text-sm font-mono uppercase" 
                                        placeholder="CONTOH: UH1"
                                    />
                                    <p className="text-[10px] text-gray-400 mt-0.5">Kode unik untuk referensi rumus (tanpa spasi).</p>
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
                                <div>
                                    <label className="block text-xs font-bold mb-1 text-yellow-700">Rumus</label>
                                    <input 
                                        type="text" 
                                        value={activeCellData.value} 
                                        onChange={e => updateActiveCell({ value: e.target.value })} 
                                        className="w-full border rounded p-2 text-sm font-mono" 
                                        placeholder="= RATA2($A, $B)"
                                    />
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
                                        <summary className="font-semibold text-yellow-700 hover:underline">Lihat Daftar Rumus</summary>
                                        <ul className="mt-1 space-y-1 text-[10px] text-gray-600 pl-2 border-l-2 border-yellow-300">
                                            <li><code>=RATA2($A, $B)</code> : Rata-rata nilai</li>
                                            <li><code>=SUM($A, $B)</code> : Penjumlahan nilai</li>
                                            <li><code>=TERBILANG($A)</code> : Angka ke huruf Indonesia</li>
                                            <li><code>=ARAB($A)</code> : Angka ke Arab-Timur (٨٨)</li>
                                            <li><code>=PREDIKAT($A, "pesantren")</code> : Mumtaz / Jayyid Jiddan</li>
                                            <li><code>=PREDIKAT($A, "huruf")</code> : Predikat A / B / C / D</li>
                                            <li><code>=IF($A&gt;=75, "Tuntas", "Remidi")</code> : Logika IF</li>
                                            <li><code>=MAX($A, $B)</code> / <code>=MIN($A, $B)</code> : Nilai maks / min</li>
                                            <li><code>=RANK($TOTAL, "rombel")</code> : Peringkat per Rombel</li>
                                            <li><code>=UPPER($NAMA)</code> / <code>=LOWER($NAMA)</code> / <code>=PROPER($NAMA)</code> : Format HURUF BESAR / kecil / Judul</li>
                                            <li><code>=TAHUN_AJAR()</code> / <code>=$TAHUN_AJAR</code> : Tahun Ajaran Aktif</li>
                                            <li><code>=SEMESTER()</code> / <code>=$SEMESTER</code> : Semester Aktif</li>
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

                        {/* 4. Fit to 1 Page */}
                        <div className="pt-2 border-t border-slate-200 space-y-2">
                            <label className="flex items-center justify-between cursor-pointer font-bold text-xs text-slate-800">
                                <span className="flex items-center gap-1.5">
                                    <i className="bi bi-file-earmark-check-fill text-indigo-600"></i>
                                    <span>Paksa Pas 1 Muka (Fit to 1 Page):</span>
                                </span>
                                <input
                                    type="checkbox"
                                    checked={activeTemplate?.fitToPage !== false}
                                    onChange={e => {
                                        const val = e.target.checked;
                                        updateActiveSheet({ fitToPage: val });
                                    }}
                                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                                />
                            </label>
                            <p className="text-[10.5px] text-slate-500 leading-snug">
                                Memaksa lembar ini pas tepat dalam 1 lembar cetak tanpa meluber ke halaman 2 seperti setelan cetak di Excel.
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

                        {/* 6. Pembersihan & Pengaturan Border Lembar */}
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

                const previewSantriObj = selectedRealSantri || ({
                    id: 1,
                    namaLengkap: 'Ahmad Fauzan',
                    nis: '202401001',
                    nisn: '0081234567',
                    tempatLahir: 'Banda Aceh',
                    tanggalLahir: '2010-05-14',
                    namaAyah: 'H. Abdullah',
                    namaIbu: 'Hj. Siti Aminah',
                    rombelId: activeTemplate.rombelId || settings.rombel?.[0]?.id || 1,
                    kelasId: activeTemplate.kelasId || settings.kelas?.[0]?.id || 1,
                    jenjangId: activeTemplate.jenjangId || settings.jenjang?.[0]?.id || 1,
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
                                        if (ku.includes('CATATAN')) {
                                            baseExtraVars[c.key] = 'Tingkatkan terus semangat belajar, muraja\'ah hafalan, dan adab keseharian di asrama.';
                                        } else if (ku.includes('KEPUTUSAN')) {
                                            baseExtraVars[c.key] = 'NAIK KE KELAS BERIKUTNYA';
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

                const baseResolveContext: RaporResolveContext = {
                    settings,
                    digitalAssets,
                    santri: previewSantriObj,
                    record: activeRecord,
                    targetDate: new Date(),
                    extraVars: baseExtraVars,
                    calculation: {
                        totalNilai: sumVal || 850,
                        rataRata: avgVal,
                        ranking: 1,
                        totalSantri: Math.max(1, effectiveSantriOptions.length || 28),
                        predikat: avgVal >= 90 ? 'A' : avgVal >= 80 ? 'B' : 'C'
                    }
                };

                // Multi-pass chained evaluation so formula cells with keys feed into downstream formulas (e.g. =TERBILANG($TOTAL))
                for (let pass = 0; pass < 2; pass++) {
                    activeSheets.forEach(sheetObj => {
                        sheetObj.cells.forEach(row => {
                            row.forEach(c => {
                                if (!c.hidden && c.type === 'formula' && c.key && c.value) {
                                    const rawExpr = c.value.trim().startsWith('=') ? c.value : `=${c.value.trim()}`;
                                    baseExtraVars[c.key] = resolveRaporText(rawExpr, baseResolveContext);
                                }
                            });
                        });
                    });
                }

                return (
                    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-[80] flex justify-center items-center p-0 sm:p-4">
                        <div className="bg-white sm:rounded-2xl shadow-2xl w-full max-w-6xl h-full sm:h-[92vh] flex flex-col overflow-hidden">
                            <div className="p-3 sm:p-4 border-b border-slate-200 flex flex-wrap justify-between items-center bg-slate-50 gap-2 shrink-0">
                                <div className="flex flex-wrap items-center gap-2 sm:gap-3 flex-grow min-w-0">
                                    <h3 className="text-sm sm:text-base font-black text-slate-800 shrink-0 flex items-center gap-1.5">
                                        <i className="bi bi-printer text-teal-600"></i>
                                        <span>Preview Cetak</span>
                                    </h3>
                                    <div className="flex bg-slate-200/80 p-0.5 sm:p-1 rounded-xl text-xs font-bold overflow-x-auto no-scrollbar max-w-full">
                                        <button
                                            type="button"
                                            onClick={() => setPreviewSheetId('all')}
                                            className={`px-2.5 py-1 rounded-lg transition-all shrink-0 ${previewSheetId === 'all' ? 'bg-white text-teal-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
                                        >
                                            Semua ({activeSheets.length})
                                        </button>
                                        {activeSheets.map((sh) => (
                                            <button
                                                key={sh.id}
                                                type="button"
                                                onClick={() => setPreviewSheetId(sh.id)}
                                                className={`px-2.5 py-1 rounded-lg transition-all shrink-0 ${previewSheetId === sh.id ? 'bg-white text-teal-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
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
                                                className="text-xs font-bold text-slate-700 bg-transparent focus:outline-none max-w-[210px] sm:max-w-[260px]"
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
                                            <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 bg-white border border-slate-200 px-2.5 py-1 rounded-xl cursor-pointer select-none">
                                                <input
                                                    type="checkbox"
                                                    checked={previewFallbackDummyGrades}
                                                    onChange={(e) => setPreviewFallbackDummyGrades(e.target.checked)}
                                                    className="rounded text-teal-600 focus:ring-teal-500"
                                                />
                                                <span>Isi contoh angka jika nilai kosong</span>
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
                            <div className="flex-grow overflow-auto bg-slate-300 p-2 sm:p-6 md:p-8 flex flex-col items-center gap-6">
                                {activeSheets
                                    .filter(sh => previewSheetId === 'all' || previewSheetId === sh.id)
                                    .map((sh, sIdx) => {
                                        const renderPreviewCell = (cell: GridCell): { content: React.ReactNode; isMedia: boolean } => {
                                            if (cell.type === 'data' && isMediaTag(cell.value || '')) {
                                                const imgSrc = getMediaTagImageSrc(cell.value?.trim() || '', baseResolveContext);
                                                if (imgSrc) {
                                                    const val = cell.value?.trim() || '';
                                                    const isStempel = val.includes('STEMPEL');
                                                    const isTtd = val.includes('TTD');
                                                    return {
                                                        content: (
                                                            <div className="flex items-center justify-center p-0.5">
                                                                <img
                                                                    src={imgSrc}
                                                                    alt={val}
                                                                    className={`object-contain ${isStempel ? 'max-h-12 max-w-[80px] opacity-90' : isTtd ? 'max-h-10 max-w-[100px]' : 'max-h-10 max-w-[80px]'}`}
                                                                />
                                                            </div>
                                                        ),
                                                        isMedia: true
                                                    };
                                                }
                                                return { content: getSimulatedValue(cell), isMedia: true };
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
                                                return { content: resolveRaporText(rawExpr, baseResolveContext), isMedia: false };
                                            }
                                            return { content: getSimulatedValue(cell), isMedia: false };
                                        };

                                        return (
                                            <DesignPreviewSheetCard
                                                key={sh.id}
                                                sh={sh}
                                                sIdx={sIdx}
                                                activeTemplate={activeTemplate}
                                                settings={settings}
                                                digitalAssets={digitalAssets}
                                                resolveContext={baseResolveContext}
                                                renderPreviewCell={renderPreviewCell}
                                            />
                                        );
                                    })}
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

