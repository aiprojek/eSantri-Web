
import React, { useState, useMemo, useRef } from 'react';
import { useAppContext } from '../../AppContext';
import { RaporTemplate, RaporSheet, GridCell, RaporColumnType, DigitalAsset } from '../../types';
import { loadXLSX } from '../../utils/lazyClientLibs';
import { DYNAMIC_TAG_CATEGORIES, isMediaTag, getMediaTagImageSrc, resolveRaporText } from '../../utils/raporPlaceholderResolver';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';

export const TabDesainRapor: React.FC = () => {
    const { settings, onSaveSettings, showToast, showConfirmation, showAlert, currentUser } = useAppContext();
    const canWrite = currentUser?.role === 'admin' || currentUser?.permissions?.akademik === 'write';
    const digitalAssets = useLiveQuery(() => db.digitalAssets.toArray(), []) || [];

    const [templates, setTemplates] = useState<RaporTemplate[]>(settings.raporTemplates || []);
    const [activeTemplate, setActiveTemplate] = useState<RaporTemplate | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    
    // Grid Selection & Zoom & Preview State
    const [selectedCells, setSelectedCells] = useState<{r: number, c: number}[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState<{r: number, c: number} | null>(null);
    const [zoomScale, setZoomScale] = useState(1);
    const [isDesignPreviewOpen, setIsDesignPreviewOpen] = useState(false);
    const [selectedTagCategory, setSelectedTagCategory] = useState<string>('santri');

    // Column & Row Live Resizing State (Excel-like drag resize)
    const [resizingCol, setResizingCol] = useState<{ colIdx: number; startX: number; startWidth: number; currentWidth: number } | null>(null);
    const [resizingRow, setResizingRow] = useState<{ rowIdx: number; startY: number; startHeight: number; currentHeight: number } | null>(null);

    // Multi-sheet / Worksheet State
    const [activeSheetId, setActiveSheetId] = useState<string>('');
    const [editingSheetNameId, setEditingSheetNameId] = useState<string | null>(null);
    const [previewSheetId, setPreviewSheetId] = useState<string>('all');

    // Mobile View Toggle ('grid' = canvas view, 'properties' = cell settings)
    const [mobileViewTab, setMobileViewTab] = useState<'grid' | 'properties'>('grid');

    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

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
                showJudul: tpl.showJudul
            };
        } else {
            sheets.push({
                id: sheetId,
                name: `Lembar ${sheets.length + 1}`,
                rowCount: tpl.rowCount,
                colCount: tpl.colCount,
                cells: tpl.cells,
                showJudul: tpl.showJudul,
                paperSize: 'A4'
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
        showConfirmation('Hapus Template?', 'Template ini akan dihapus permanen.', () => {
            const updated = templates.filter(t => t.id !== tplId);
            saveTemplatesToSettings(updated);
            showToast('Template dihapus.', 'success');
        }, { confirmColor: 'red' });
    };
    
    const handleDuplicateTemplate = (tplId: string) => {
        const original = templates.find(t => t.id === tplId);
        if (!original) return;
        const newTemplate: RaporTemplate = JSON.parse(JSON.stringify(original));
        newTemplate.id = 'tpl_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
        newTemplate.name = `${original.name} (Salinan)`;
        newTemplate.lastModified = new Date().toISOString();
        const updated = [...templates, newTemplate];
        saveTemplatesToSettings(updated);
        showToast('Template berhasil disalin.', 'success');
    };

    // --- WORKSHEET TAB ACTIONS ---
    const handleSwitchSheet = (targetSheetId: string) => {
        if (!activeTemplate) return;
        const synced = syncCurrentSheetToTemplate(activeTemplate, activeSheetId);
        const targetSheet = synced.sheets?.find(s => s.id === targetSheetId);
        if (!targetSheet) return;

        setActiveSheetId(targetSheetId);
        setSelectedCells([]);
        setActiveTemplate({
            ...synced,
            activeSheetId: targetSheetId,
            cells: targetSheet.cells,
            rowCount: targetSheet.rowCount,
            colCount: targetSheet.colCount
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

    const handleSaveActiveTemplate = () => {
        if (!activeTemplate || !activeTemplate.name.trim()) {
            showToast('Nama template wajib diisi.', 'error');
            return;
        }
        // Sync active sheet first
        const finalTemplate = syncCurrentSheetToTemplate(activeTemplate, activeSheetId);

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

        const existingIdx = templates.findIndex(t => t.id === finalTemplate.id);
        let updated;
        if (existingIdx >= 0) {
            updated = [...templates];
            updated[existingIdx] = { ...finalTemplate, lastModified: new Date().toISOString() };
        } else {
            updated = [...templates, { ...finalTemplate, lastModified: new Date().toISOString() }];
        }
        saveTemplatesToSettings(updated);
        setIsEditing(false);
        setActiveTemplate(null);
        showToast('Template multi-sheet berhasil disimpan.', 'success');
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
                    
                    const newCells: GridCell[][] = [];
                    for (let r = 0; r < rowCount; r++) {
                        const row: GridCell[] = [];
                        for (let c = 0; c < colCount; c++) row.push(createEmptyCell(r, c));
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
                                } else if (valStr.startsWith('$')) {
                                    if (systemKeys.includes(valStr) || valStr.startsWith('$MAPEL_NAME') || valStr.startsWith('$TOTAL') || valStr.startsWith('$RATA') || valStr.startsWith('$RANK')) {
                                        newCells[r][c].type = 'data';
                                    } else {
                                        newCells[r][c].type = 'input';
                                        newCells[r][c].key = valStr.substring(1).toUpperCase().replace(/[^A-Z0-9_]/g, '');
                                        newCells[r][c].value = ''; 
                                    }
                                } else {
                                    newCells[r][c].type = 'label';
                                }
                                newCells[r][c].borders = { top: true, right: true, bottom: true, left: true };
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
                        paperSize: 'A4'
                    });
                });

                if (importedSheets.length === 0) throw new Error("Gagal membaca lembar dari file.");

                const cleanName = file.name.replace(/\.(xlsx|xls|ods|csv)$/i, '');
                const firstSheet = importedSheets[0];
                const newTemplate: RaporTemplate = {
                    id: 'tpl_' + Date.now(),
                    name: `Import_${cleanName}`,
                    rowCount: firstSheet.rowCount,
                    colCount: firstSheet.colCount,
                    cells: firstSheet.cells,
                    sheets: importedSheets,
                    activeSheetId: firstSheet.id,
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

    // --- GRID OPERATIONS ---
    const handleMouseDown = (r: number, c: number) => { setIsDragging(true); setDragStart({ r, c }); setSelectedCells([{ r, c }]); };
    const handleMouseEnter = (r: number, c: number) => {
        if (!isDragging || !dragStart) return;
        const rMin = Math.min(dragStart.r, r); const rMax = Math.max(dragStart.r, r);
        const cMin = Math.min(dragStart.c, c); const cMax = Math.max(dragStart.c, c);
        const newSelection = [];
        for(let i=rMin; i<=rMax; i++) for(let j=cMin; j<=cMax; j++) newSelection.push({ r: i, c: j });
        setSelectedCells(newSelection);
    };
    const handleMouseUp = () => setIsDragging(false);

    const addRow = () => {
        if (!activeTemplate) return;
        const newRow = [];
        for(let c=0; c<activeTemplate.colCount; c++) newRow.push(createEmptyCell(activeTemplate.rowCount, c));
        const updatedCells = [...activeTemplate.cells, newRow];
        const newRowCount = activeTemplate.rowCount + 1;
        const updated = { ...activeTemplate, rowCount: newRowCount, cells: updatedCells };
        setActiveTemplate(syncCurrentSheetToTemplate(updated, activeSheetId));
    };

    const addCol = () => {
        if (!activeTemplate) return;
        const updatedCells = activeTemplate.cells.map(row => [...row, createEmptyCell(row[0].row, activeTemplate.colCount)]);
        const newColCount = activeTemplate.colCount + 1;
        const updated = { ...activeTemplate, colCount: newColCount, cells: updatedCells };
        setActiveTemplate(syncCurrentSheetToTemplate(updated, activeSheetId));
    };

    const mergeCells = () => {
        if (!activeTemplate || selectedCells.length < 2) return;
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
        const target = selectedCells[0]; const newCells = [...activeTemplate.cells]; const cell = newCells[target.r][target.c];
        if ((cell.rowSpan || 1) === 1 && (cell.colSpan || 1) === 1) return;
        const rMax = target.r + (cell.rowSpan || 1) - 1; const cMax = target.c + (cell.colSpan || 1) - 1;
        cell.rowSpan = 1; cell.colSpan = 1;
        for(let r=target.r; r<=rMax; r++) for(let c=target.c; c<=cMax; c++) newCells[r][c].hidden = false;
        const updated = { ...activeTemplate, cells: newCells };
        setActiveTemplate(syncCurrentSheetToTemplate(updated, activeSheetId));
    };

    const toggleBorder = (side: 'top' | 'right' | 'bottom' | 'left' | 'all' | 'none') => {
        if (!activeTemplate || selectedCells.length === 0) return;
        const newCells = [...activeTemplate.cells];
        selectedCells.forEach(({ r, c }) => {
            const cell = newCells[r][c]; if (cell.hidden) return;
            const currentBorders = cell.borders || { top: false, right: false, bottom: false, left: false };
            let newBorders = { ...currentBorders };
            if (side === 'all') newBorders = { top: true, right: true, bottom: true, left: true };
            else if (side === 'none') newBorders = { top: false, right: false, bottom: false, left: false };
            else newBorders[side] = !newBorders[side];
            newCells[r][c] = { ...cell, borders: newBorders };
        });
        const updated = { ...activeTemplate, cells: newCells };
        setActiveTemplate(syncCurrentSheetToTemplate(updated, activeSheetId));
    };

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
                const w = activeTemplate.cells[r]?.[c]?.width;
                if (typeof w === 'number' && w > 0) return w;
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
                const h = activeTemplate.cells[r][c]?.height;
                if (typeof h === 'number' && h > 0) return h;
            }
        }
        return 30;
    };

    const handleUpdateColWidth = (cIdx: number, newWidth: number) => {
        if (!activeTemplate) return;
        const clampedWidth = Math.max(35, Math.min(1000, Math.round(newWidth)));
        const newCells = activeTemplate.cells.map(row =>
            row.map((cell, c) => c === cIdx ? { ...cell, width: clampedWidth } : cell)
        );
        const updated = { ...activeTemplate, cells: newCells };
        setActiveTemplate(syncCurrentSheetToTemplate(updated, activeSheetId));
    };

    const handleUpdateRowHeight = (rIdx: number, newHeight: number) => {
        if (!activeTemplate) return;
        const clampedHeight = Math.max(20, Math.min(600, Math.round(newHeight)));
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
            const newW = Math.max(35, Math.round(resizingCol.startWidth + delta));
            setResizingCol(prev => prev ? { ...prev, currentWidth: newW } : null);
        };
        const onTouchMove = (e: TouchEvent) => {
            if (e.touches.length !== 1) return;
            const delta = (e.touches[0].clientX - resizingCol.startX) / zoomScale;
            const newW = Math.max(35, Math.round(resizingCol.startWidth + delta));
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
            const newH = Math.max(20, Math.round(resizingRow.startHeight + delta));
            setResizingRow(prev => prev ? { ...prev, currentHeight: newH } : null);
        };
        const onTouchMove = (e: TouchEvent) => {
            if (e.touches.length !== 1) return;
            const delta = (e.touches[0].clientY - resizingRow.startY) / zoomScale;
            const newH = Math.max(20, Math.round(resizingRow.startHeight + delta));
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

    const updateActiveCell = (updates: Partial<GridCell>) => {
        if (!activeTemplate || !activeCellData) return;
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

    const getSimulatedValue = (cell: GridCell) => {
        if (cell.type === 'label') return cell.value;
        if (cell.type === 'input') return <span className="text-blue-500 italic text-[10px] font-mono bg-blue-50 px-1 rounded border border-blue-100">[Input: {cell.key || 'NILAI'}]</span>;
        if (cell.type === 'formula') return <span className="text-yellow-700 italic text-[10px] font-mono bg-yellow-50 px-1 rounded border border-yellow-100">{cell.value || '[Rumus]'}</span>;
        if (cell.type === 'dropdown') {
            const firstOpt = cell.options && cell.options.length > 0 ? cell.options[0] : (cell.key || 'Pilihan');
            return <span className="text-orange-700 italic text-[10px] font-mono bg-orange-50 px-1 rounded border border-orange-200">[▼ {firstOpt}]</span>;
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
                if (val === '$LOGO_PONPES') return <span className="text-teal-600 font-bold text-[10px] bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded flex items-center gap-1 justify-center"><i className="bi bi-image"></i> Logo Ponpes</span>;
                if (val === '$LOGO_YAYASAN') return <span className="text-indigo-600 font-bold text-[10px] bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded flex items-center gap-1 justify-center"><i className="bi bi-image-fill"></i> Logo Yayasan</span>;
                if (val.includes('TTD')) return <span className="text-purple-600 font-bold text-[10px] bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded flex items-center gap-1 justify-center"><i className="bi bi-pen-fill"></i> {val.replace('$', '')}</span>;
                return <span className="text-rose-500 italic text-[10px] font-mono bg-rose-50 px-1 rounded border border-rose-100">[{val}]</span>;
            }

            // Find matching example in dynamic tag list
            for (const cat of DYNAMIC_TAG_CATEGORIES) {
                const found = cat.tags.find(t => t.tag === val);
                if (found) return found.example;
            }
            if (val.includes('$MAPEL')) return 'Pendidikan Agama Islam';
            return val || '[Data]';
        }
        return cell.value;
    };

    if (!isEditing) {
        return (
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h3 className="font-bold text-gray-700">Daftar Template Rapor</h3>
                    {canWrite && (
                        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 no-scrollbar">
                            <input type="file" ref={fileInputRef} onChange={handleImportExcel} accept=".xlsx, .xls, .ods, .csv" className="hidden" />
                            <div className="flex gap-2 flex-grow sm:flex-none">
                                <button onClick={() => fileInputRef.current?.click()} className="flex-1 sm:flex-none whitespace-nowrap bg-indigo-50 text-indigo-700 border border-indigo-100 px-3 py-2.5 rounded-xl text-[10px] font-black flex items-center justify-center gap-1.5 transition-all active:scale-95">
                                    <i className="bi bi-file-earmark-spreadsheet text-base"></i> <span>Import</span>
                                </button>
                                <button onClick={handleCreateSampleTemplate} className="flex-1 sm:flex-none whitespace-nowrap bg-purple-50 text-purple-700 border border-purple-100 px-3 py-2.5 rounded-xl text-[10px] font-black flex items-center justify-center gap-1.5 transition-all active:scale-95">
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
                            {canWrite && <div className="mt-3 flex gap-2 justify-end">
                                <button onClick={() => handleDuplicateTemplate(tpl.id)} className="bg-green-50 text-green-600 px-3 py-1 rounded text-xs hover:bg-green-100 flex items-center gap-1" title="Duplikasi Template"><i className="bi bi-copy"></i> Copy</button>
                                <button onClick={() => handleEditTemplate(tpl)} className="bg-blue-50 text-blue-600 px-3 py-1 rounded text-xs hover:bg-blue-100">Edit</button>
                                <button onClick={() => handleDeleteTemplate(tpl.id)} className="bg-red-50 text-red-600 px-3 py-1 rounded text-xs hover:bg-red-100">Hapus</button>
                            </div>}
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
                            onClick={() => setIsEditing(false)} 
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shrink-0" 
                            title="Batal & Kembali ke Daftar"
                        >
                            <i className="bi bi-chevron-left text-sm"></i>
                            <span className="hidden sm:inline">Batal</span>
                        </button>

                        <div className="flex-grow max-w-xs min-w-0">
                            <input 
                                type="text" 
                                value={activeTemplate?.name} 
                                onChange={e => setActiveTemplate(t => t ? {...t, name: e.target.value} : null)} 
                                className="w-full border border-slate-200 rounded-xl px-2.5 py-1 text-xs sm:text-sm font-bold focus:ring-2 focus:ring-teal-500 bg-slate-50 focus:bg-white" 
                                placeholder="Nama Template Rapor" 
                            />
                        </div>

                        <select 
                            value={activeTemplate?.jenjangId || ''} 
                            onChange={e => setActiveTemplate(t => t ? {...t, jenjangId: e.target.value ? parseInt(e.target.value) : undefined, kelasId: undefined, rombelId: undefined} : null)}
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

                        <button 
                            type="button"
                            onClick={() => setIsDesignPreviewOpen(true)} 
                            className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 p-2 sm:px-3 sm:py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all shrink-0" 
                            title="Pratinjau Hasil Cetak"
                        >
                            <i className="bi bi-eye text-sm"></i>
                            <span className="hidden md:inline">Preview</span>
                        </button>
                        
                        <button 
                            type="button"
                            onClick={handleSaveActiveTemplate} 
                            className="bg-teal-600 hover:bg-teal-700 text-white px-3 sm:px-4 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm active:scale-95 transition-all shrink-0"
                        >
                            <i className="bi bi-save"></i>
                            <span>Simpan</span>
                        </button>
                    </div>
                </div>

                {/* TOOLBAR TIER 2: Excel Mobile Ribbon */}
                <div className="px-2 py-1.5 bg-slate-50/90 border-b border-slate-200 flex items-center gap-1.5 overflow-x-auto no-scrollbar select-none shrink-0">
                    <select 
                        value={activeTemplate?.jenjangId || ''} 
                        onChange={e => setActiveTemplate(t => t ? {...t, jenjangId: e.target.value ? parseInt(e.target.value) : undefined, kelasId: undefined, rombelId: undefined} : null)}
                        className="sm:hidden border border-slate-300 rounded-lg px-2 py-1 text-[11px] font-bold bg-white text-slate-700 shrink-0"
                    >
                        <option value="">Semua Marhalah</option>
                        {settings.jenjang.map(j => <option key={j.id} value={j.id}>{j.nama}</option>)}
                    </select>

                    <div className="sm:hidden h-5 w-px bg-slate-300 shrink-0"></div>

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

                    <button 
                        type="button" 
                        onClick={() => toggleBorder('all')} 
                        className="p-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 shrink-0 text-xs shadow-2xs" 
                        title="Beri Border Semua Sisi"
                    >
                        <i className="bi bi-border-all"></i>
                    </button>
                    <button 
                        type="button" 
                        onClick={() => toggleBorder('none')} 
                        className="p-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 shrink-0 text-xs shadow-2xs" 
                        title="Hapus Border"
                    >
                        <i className="bi bi-border-none"></i>
                    </button>

                    <div className="h-5 w-px bg-slate-300 shrink-0"></div>

                    <button 
                        type="button" 
                        onClick={addRow} 
                        className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 shrink-0 text-xs font-semibold flex items-center gap-1 shadow-2xs" 
                        title="Tambah 1 Baris di Bawah"
                    >
                        <i className="bi bi-plus-lg text-teal-600"></i>
                        <span>Baris</span>
                    </button>
                    <button 
                        type="button" 
                        onClick={addCol} 
                        className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 shrink-0 text-xs font-semibold flex items-center gap-1 shadow-2xs" 
                        title="Tambah 1 Kolom di Kanan"
                    >
                        <i className="bi bi-plus-lg text-teal-600"></i>
                        <span>Kolom</span>
                    </button>

                    <div className="h-5 w-px bg-slate-300 shrink-0"></div>

                    {/* Zoom Controls */}
                    <div className="flex items-center bg-white rounded-lg border border-slate-200 shadow-2xs shrink-0">
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
                <div className="flex-grow overflow-auto p-4 sm:p-6 relative bg-slate-200/70 flex items-start justify-start border-b min-w-0 min-h-0" onMouseUp={handleMouseUp} ref={scrollContainerRef}>
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
                        <table className="border-collapse bg-white shadow-xl select-none border border-slate-400 table-fixed">
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
                                        return (
                                            <th
                                                key={cIdx}
                                                className={`relative border border-slate-300 text-slate-700 font-bold text-[11px] text-center select-none cursor-pointer h-7 px-1 transition-colors sticky top-0 z-20 shadow-xs ${
                                                    isColSelected ? 'bg-blue-200 text-blue-900 font-black' : 'bg-slate-100 hover:bg-slate-200'
                                                }`}
                                                style={{ width: `${colW}px`, minWidth: `${colW}px`, maxWidth: `${colW}px` }}
                                                onClick={() => handleSelectColumn(cIdx)}
                                                title={`Kolom ${colName} (${colW}px) - Klik untuk pilih seluruh kolom, seret pembatas kanan untuk atur lebar`}
                                            >
                                                <span className="truncate block pointer-events-none">{colName}</span>
                                                {/* Excel-style Column Resizer Handle (Touch & Mouse) */}
                                                <div
                                                    className="absolute top-0 right-0 bottom-0 w-4 -mr-1.5 cursor-col-resize hover:bg-teal-500/80 active:bg-teal-700 z-30 transition-colors touch-none flex items-center justify-center"
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
                                    return (
                                        <tr key={rIdx} style={{ height: `${rowH}px` }}>
                                            {/* Row Header 1, 2, 3... */}
                                            <th
                                                className={`relative w-10 min-w-[40px] max-w-[40px] border border-slate-300 text-slate-700 font-bold text-[11px] text-center select-none cursor-pointer transition-colors sticky left-0 z-10 shadow-xs ${
                                                    isRowSelected ? 'bg-blue-200 text-blue-900 font-black' : 'bg-slate-100 hover:bg-slate-200'
                                                }`}
                                                style={{ height: `${rowH}px`, minHeight: `${rowH}px` }}
                                                onClick={() => handleSelectRow(rIdx)}
                                                title={`Baris ${rIdx + 1} (${rowH}px) - Klik untuk pilih seluruh baris, seret pembatas bawah untuk atur tinggi`}
                                            >
                                                <span className="pointer-events-none">{rIdx + 1}</span>
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
                                                const borders = cell.borders || { top: false, right: false, bottom: false, left: false };
                                                let cellClass = "text-[10px] sm:text-xs p-1 relative transition-colors border border-dashed border-gray-300 ";
                                                if (borders.top) cellClass += "!border-t !border-t-black !border-solid ";
                                                if (borders.right) cellClass += "!border-r !border-r-black !border-solid ";
                                                if (borders.bottom) cellClass += "!border-b !border-b-black !border-solid ";
                                                if (borders.left) cellClass += "!border-l !border-l-black !border-solid ";
                                                if (isSelected) cellClass += "bg-blue-100 ";
                                                if (isActive) cellClass += "ring-2 ring-blue-500 z-10 ";

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

                                                return (
                                                    <td 
                                                        key={cell.id} 
                                                        colSpan={cellColSpan} 
                                                        rowSpan={cellRowSpan} 
                                                        className={cellClass} 
                                                        onMouseDown={() => handleMouseDown(rIdx, cIdx)} 
                                                        onMouseEnter={() => handleMouseEnter(rIdx, cIdx)} 
                                                        style={{ 
                                                            width: `${cellWidthPx}px`, 
                                                            minWidth: `${cellWidthPx}px`,
                                                            height: `${cellHeightPx}px`,
                                                            textAlign: cell.align || 'center' 
                                                        }}
                                                    >
                                                        <div className="w-full h-full flex flex-col items-center justify-center overflow-hidden leading-tight pointer-events-none">
                                                            <span className="truncate w-full">{getSimulatedValue(cell)}</span>
                                                            {cell.key && <span className="text-[8px] opacity-60 font-normal leading-none mt-0.5">${cell.key}</span>}
                                                        </div>

                                                        {/* Direct Resizers on Active Cell Edge (Touch & Mouse) */}
                                                        {isActive && (
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
                                    );
                                })}
                            </tbody>
                        </table>
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
                <div className="bg-slate-100 border-t border-slate-300 px-3 py-1 flex items-center gap-1.5 overflow-x-auto select-none shrink-0 no-scrollbar">
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
            <div className={`${mobileViewTab === 'properties' ? 'flex' : 'hidden lg:flex'} w-full lg:w-80 bg-white border border-slate-300 rounded-xl flex-col shrink-0 min-h-0 overflow-hidden shadow-xs`}>
                <div className="p-3 border-b font-bold bg-gray-50 text-gray-700 flex items-center justify-between gap-2 shrink-0">
                    <div className="flex items-center gap-2">
                        <i className="bi bi-sliders text-teal-600"></i>
                        <span>Properti Sel</span>
                        {activeCellData && (
                            <span className="bg-teal-100 text-teal-800 text-xs px-2 py-0.5 rounded font-mono font-bold">
                                {getExcelColName(activeCellData.col)}{activeCellData.row + 1}
                            </span>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={() => setMobileViewTab('grid')}
                        className="lg:hidden text-xs font-bold text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 px-2.5 py-1 rounded-lg border border-teal-200 flex items-center gap-1 transition-all"
                    >
                        <i className="bi bi-grid-3x3"></i>
                        <span>Kembali ke Kanvas</span>
                    </button>
                </div>
                {activeCellData ? (
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
                                            <li><code>RATA2($A, $B)</code> : Rata-rata nilai</li>
                                            <li><code>SUM($A, $B)</code> : Penjumlahan</li>
                                            <li><code>MAX($A, $B)</code> : Nilai tertinggi</li>
                                            <li><code>MIN($A, $B)</code> : Nilai terendah</li>
                                            <li><code>IF($A&gt;75, "Lulus", "Remidi")</code> : Logika IF</li>
                                            <li><code>TERBILANG($A)</code> : Mengubah angka jadi teks</li>
                                            <li><code>RANK($TOTAL, "rombel")</code> : Peringkat per Rombel</li>
                                            <li><code>RANK($TOTAL, "kelas")</code> : Peringkat per Tingkat Kelas</li>
                                            <li><code>RANK($TOTAL, "jenjang")</code> : Peringkat per Jenjang</li>
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
                                            min="35" 
                                            max="800" 
                                            value={getColWidth(activeCellData.col)} 
                                            onChange={e => handleUpdateColWidth(activeCellData.col, parseInt(e.target.value) || 35)} 
                                            className="w-full border rounded-l-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                                            title="Ubah lebar kolom (live preview)"
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
                                            min="20" 
                                            max="500" 
                                            value={getRowHeight(activeCellData.row)} 
                                            onChange={e => handleUpdateRowHeight(activeCellData.row, parseInt(e.target.value) || 20)} 
                                            className="w-full border rounded-l-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                                            title="Ubah tinggi baris (live preview)"
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

                            {/* Align */}
                            <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                                <label className="text-xs font-bold text-slate-700">Perataan Teks</label>
                                <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200">
                                    <button 
                                        type="button" 
                                        onClick={() => updateActiveCell({ align: 'left' })} 
                                        className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors flex items-center gap-1 ${(activeCellData.align || 'center') === 'left' ? 'bg-teal-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                                        title="Rata Kiri"
                                    >
                                        <i className="bi bi-text-left"></i> Kiri
                                    </button>
                                    <button 
                                        type="button" 
                                        onClick={() => updateActiveCell({ align: 'center' })} 
                                        className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors flex items-center gap-1 ${(activeCellData.align || 'center') === 'center' ? 'bg-teal-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                                        title="Rata Tengah"
                                    >
                                        <i className="bi bi-text-center"></i> Tengah
                                    </button>
                                    <button 
                                        type="button" 
                                        onClick={() => updateActiveCell({ align: 'right' })} 
                                        className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors flex items-center gap-1 ${(activeCellData.align || 'center') === 'right' ? 'bg-teal-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                                        title="Rata Kanan"
                                    >
                                        <i className="bi bi-text-right"></i> Kanan
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="p-8 text-center text-gray-400 text-sm flex flex-col items-center justify-center h-full opacity-60">
                        <i className="bi bi-mouse text-3xl mb-2"></i><p>Klik sel untuk edit properti.</p>
                    </div>
                )}
            </div>
            
            {/* PREVIEW MODAL */}
            {isDesignPreviewOpen && activeTemplate && (
                <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-[80] flex justify-center items-center p-0 sm:p-4">
                    <div className="bg-white sm:rounded-2xl shadow-2xl w-full max-w-6xl h-full sm:h-[92vh] flex flex-col overflow-hidden">
                        <div className="p-3 sm:p-4 border-b border-slate-200 flex flex-wrap justify-between items-center bg-slate-50 gap-2 shrink-0">
                            <div className="flex items-center gap-2 sm:gap-3 flex-grow min-w-0">
                                <h3 className="text-sm sm:text-base font-black text-slate-800 shrink-0">Preview Rapor</h3>
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
                                .map((sh, sIdx) => (
                                    <div key={sh.id} className="w-full overflow-x-auto p-1 flex justify-start sm:justify-center">
                                        <div className="bg-white shadow-2xl p-4 sm:p-8 relative shrink-0" style={{ width: '21cm', minHeight: '29.7cm' }}>
                                            <div className="absolute top-2 right-4 text-[10px] text-gray-400 font-mono select-none">
                                                {sh.name} (Lembar {sIdx + 1})
                                            </div>
                                            <table className="border-collapse w-full">
                                                <tbody>
                                                    {sh.cells.map((row, rIdx) => (
                                                        <tr key={rIdx}>
                                                            {row.map((cell, cIdx) => {
                                                                if (cell.hidden) return null;
                                                                const borders = cell.borders || { top: true, right: true, bottom: true, left: true };
                                                                return (
                                                                    <td 
                                                                        key={`${rIdx}-${cIdx}`} 
                                                                        colSpan={cell.colSpan} 
                                                                        rowSpan={cell.rowSpan} 
                                                                        style={{ 
                                                                            borderTop: borders.top ? '1px solid black' : 'none', 
                                                                            borderRight: borders.right ? '1px solid black' : 'none', 
                                                                            borderBottom: borders.bottom ? '1px solid black' : 'none', 
                                                                            borderLeft: borders.left ? '1px solid black' : 'none', 
                                                                            textAlign: cell.align || 'center', 
                                                                            width: cell.width ? `${cell.width}px` : 'auto', 
                                                                            height: cell.height ? `${cell.height}px` : 'auto',
                                                                            padding: '4px', 
                                                                            fontSize: '11px' 
                                                                        }}
                                                                    >
                                                                        {getSimulatedValue(cell)}
                                                                    </td>
                                                                );
                                                            })}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
