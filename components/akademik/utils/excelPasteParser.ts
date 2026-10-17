import { GridCell, RaporColumnType, RaporSheet, RaporTemplate } from '../../../types';

export interface ParsedExcelCell {
    value: string;
    type: RaporColumnType;
    key?: string;
    colSpan: number;
    rowSpan: number;
    align?: 'left' | 'center' | 'right';
    borders?: { top: boolean; right: boolean; bottom: boolean; left: boolean };
    isFormula?: boolean;
    hidden?: boolean;
}

export interface ParsedExcelTable {
    rowCount: number;
    colCount: number;
    cells: ParsedExcelCell[][];
    detectedTags: string[];
    mergeCount: number;
    rawText: string;
}

const SYSTEM_KEYS = [
    '$NAMA', '$NAMA_LENGKAP', '$NAMA_HIJRAH', '$NIS', '$NISN', '$NIK',
    '$TEMPAT_LAHIR', '$TANGGAL_LAHIR', '$TTL', '$JENIS_KELAMIN', '$ALAMAT_SANTRI',
    '$NAMA_AYAH', '$NAMA_IBU', '$NAMA_WALI', '$TELEPON_ORTU',
    '$KELAS', '$ROMBEL', '$SEMESTER', '$TAHUN_AJAR', '$TAHUN_AJARAN',
    '$NAMA_YAYASAN', '$NAMA_PONPES', '$ALAMAT_PONDOK', '$LOGO',
    '$WALI_KELAS', '$MUDIR', '$TOTAL_NILAI', '$RATA_RATA', '$PERINGKAT',
    '$TANGGAL_RAPOR', '$TEMPAT_TANGGAL_RAPOR'
];

/**
 * Mendeteksi tipe cell, formula, dan tag placeholder eSantri
 */
export const analyzeCellValue = (rawVal: string): { type: RaporColumnType; key?: string; value: string } => {
    const trimmed = (rawVal || '').trim();
    if (!trimmed) {
        return { type: 'label', value: '' };
    }

    if (trimmed.startsWith('=')) {
        return { type: 'formula', value: trimmed };
    }

    if (trimmed.startsWith('$')) {
        const upper = trimmed.toUpperCase();
        if (
            SYSTEM_KEYS.includes(upper) ||
            upper.startsWith('$MAPEL_') ||
            upper.startsWith('$TOTAL') ||
            upper.startsWith('$RATA') ||
            upper.startsWith('$RANK') ||
            upper.startsWith('$NILAI_')
        ) {
            return { type: 'data', value: upper };
        }

        // Custom variable / input wali
        const cleanKey = upper.substring(1).replace(/[^A-Z0-9_]/g, '');
        return {
            type: 'input',
            key: cleanKey,
            value: ''
        };
    }

    return { type: 'label', value: trimmed };
};

/**
 * Parsing HTML table yang disalin dari Microsoft Excel atau Google Sheets
 */
export const parseHtmlExcelTable = (html: string): ParsedExcelTable | null => {
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const table = doc.querySelector('table');
        if (!table) return null;

        const trElements = Array.from(table.querySelectorAll('tr'));
        if (trElements.length === 0) return null;

        // Matrix untuk melacak sel yang sudah terisi / ter-merge
        const gridMatrix: (ParsedExcelCell | null)[][] = [];
        let maxCols = 0;
        const detectedTags = new Set<string>();
        let mergeCount = 0;

        trElements.forEach((tr, rIdx) => {
            if (!gridMatrix[rIdx]) gridMatrix[rIdx] = [];
            let cIdx = 0;

            const cellsInRow = Array.from(tr.querySelectorAll('td, th')) as HTMLElement[];
            cellsInRow.forEach((td) => {
                // Lewati kolom yang sudah ditempati merge dari baris sebelumnya
                while (gridMatrix[rIdx][cIdx]) {
                    cIdx++;
                }

                const rawText = td.textContent || '';
                const { type, key, value } = analyzeCellValue(rawText);
                if (type === 'data' && value.startsWith('$')) {
                    detectedTags.add(value);
                }

                const rowSpan = Math.max(1, parseInt(td.getAttribute('rowspan') || '1', 10));
                const colSpan = Math.max(1, parseInt(td.getAttribute('colspan') || '1', 10));
                if (rowSpan > 1 || colSpan > 1) {
                    mergeCount++;
                }

                // Cek text-align
                let align: 'left' | 'center' | 'right' | undefined;
                const styleAlign = td.style.textAlign?.toLowerCase();
                const attrAlign = td.getAttribute('align')?.toLowerCase();
                if (styleAlign === 'center' || attrAlign === 'center') align = 'center';
                else if (styleAlign === 'right' || attrAlign === 'right') align = 'right';
                else if (styleAlign === 'left' || attrAlign === 'left') align = 'left';

                // Cek borders
                const hasBorder = Boolean(
                    td.style.border ||
                    td.style.borderTop ||
                    td.style.borderRight ||
                    td.style.borderBottom ||
                    td.style.borderLeft ||
                    table.getAttribute('border')
                );

                const parsedCell: ParsedExcelCell = {
                    value,
                    type,
                    key,
                    colSpan,
                    rowSpan,
                    align,
                    borders: hasBorder
                        ? { top: true, right: true, bottom: true, left: true }
                        : { top: false, right: false, bottom: false, left: false }
                };

                gridMatrix[rIdx][cIdx] = parsedCell;

                // Tandai sel-sel yang di-merge sebagai hidden
                for (let r = 0; r < rowSpan; r++) {
                    for (let c = 0; c < colSpan; c++) {
                        if (r === 0 && c === 0) continue;
                        const targetR = rIdx + r;
                        const targetC = cIdx + c;
                        if (!gridMatrix[targetR]) gridMatrix[targetR] = [];
                        gridMatrix[targetR][targetC] = {
                            value: '',
                            type: 'label',
                            colSpan: 1,
                            rowSpan: 1,
                            hidden: true,
                            borders: parsedCell.borders
                        };
                    }
                }

                cIdx += colSpan;
                if (cIdx > maxCols) maxCols = cIdx;
            });

            if (cIdx > maxCols) maxCols = cIdx;
        });

        const totalRows = gridMatrix.length;
        if (totalRows === 0 || maxCols === 0) return null;

        // Normalisasi matrix agar semua cell terdefinisi
        const normalizedCells: ParsedExcelCell[][] = [];
        for (let r = 0; r < totalRows; r++) {
            const row: ParsedExcelCell[] = [];
            for (let c = 0; c < maxCols; c++) {
                const cell = gridMatrix[r]?.[c] || {
                    value: '',
                    type: 'label',
                    colSpan: 1,
                    rowSpan: 1,
                    borders: { top: false, right: false, bottom: false, left: false }
                };
                row.push(cell);
            }
            normalizedCells.push(row);
        }

        return {
            rowCount: totalRows,
            colCount: maxCols,
            cells: normalizedCells,
            detectedTags: Array.from(detectedTags),
            mergeCount,
            rawText: table.innerText || ''
        };
    } catch (e) {
        console.warn('Gagal parsing HTML table dari clipboard:', e);
        return null;
    }
};

/**
 * Parsing teks biasa dengan pemisah Tab (\t) dan Newline (\n) dari Excel / Sheets
 */
export const parsePlainTextTsv = (tsv: string): ParsedExcelTable | null => {
    const clean = (tsv || '').trim();
    if (!clean) return null;

    const lines = clean.split(/\r?\n/).filter(line => line.length > 0);
    if (lines.length === 0) return null;

    const detectedTags = new Set<string>();
    let maxCols = 0;

    const rowsData = lines.map(line => {
        const parts = line.split('\t');
        if (parts.length > maxCols) maxCols = parts.length;
        return parts;
    });

    if (maxCols === 0) return null;

    const cells: ParsedExcelCell[][] = [];
    for (let r = 0; r < rowsData.length; r++) {
        const row: ParsedExcelCell[] = [];
        for (let c = 0; c < maxCols; c++) {
            const rawVal = rowsData[r][c] || '';
            const { type, key, value } = analyzeCellValue(rawVal);
            if (type === 'data' && value.startsWith('$')) {
                detectedTags.add(value);
            }
            row.push({
                value,
                type,
                key,
                colSpan: 1,
                rowSpan: 1,
                borders: { top: true, right: true, bottom: true, left: true }
            });
        }
        cells.push(row);
    }

    return {
        rowCount: lines.length,
        colCount: maxCols,
        cells,
        detectedTags: Array.from(detectedTags),
        mergeCount: 0,
        rawText: clean
    };
};

/**
 * Parsing data clipboard utama (mendukung HTML Table dan Text TSV)
 */
export const parseExcelClipboard = (htmlContent?: string, textContent?: string): ParsedExcelTable | null => {
    if (htmlContent && (htmlContent.includes('<table') || htmlContent.includes('<tr'))) {
        const htmlParsed = parseHtmlExcelTable(htmlContent);
        if (htmlParsed && htmlParsed.rowCount > 0 && htmlParsed.colCount > 0) {
            return htmlParsed;
        }
    }

    if (textContent) {
        return parsePlainTextTsv(textContent);
    }

    return null;
};

/**
 * Menimpa/menempelkan ParsedExcelTable ke grid canvas aktif mulai dari sel (startRow, startCol)
 */
export const overlayPastedTableOntoGrid = (
    currentCells: GridCell[][],
    pasted: ParsedExcelTable,
    startRow: number = 0,
    startCol: number = 0
): { updatedCells: GridCell[][]; newRowCount: number; newColCount: number } => {
    const requiredRows = Math.max(currentCells.length, startRow + pasted.rowCount);
    let currentMaxCols = currentCells[0]?.length || 0;
    const requiredCols = Math.max(currentMaxCols, startCol + pasted.colCount);

    // Salin dan perluas grid jika dibutuhkan
    const newGrid: GridCell[][] = [];
    for (let r = 0; r < requiredRows; r++) {
        const row: GridCell[] = [];
        for (let c = 0; c < requiredCols; c++) {
            if (currentCells[r] && currentCells[r][c]) {
                row.push({ ...currentCells[r][c] });
            } else {
                row.push({
                    id: `cell_${Date.now()}_${r}_${c}_${Math.random().toString(36).substr(2, 4)}`,
                    row: r,
                    col: c,
                    value: '',
                    type: 'label',
                    colSpan: 1,
                    rowSpan: 1,
                    width: 100,
                    height: 30,
                    borders: { top: false, right: false, bottom: false, left: false }
                });
            }
        }
        newGrid.push(row);
    }

    // Terapkan hasil paste ke grid
    for (let pr = 0; pr < pasted.rowCount; pr++) {
        for (let pc = 0; pc < pasted.colCount; pc++) {
            const targetR = startRow + pr;
            const targetC = startCol + pc;
            const source = pasted.cells[pr][pc];

            newGrid[targetR][targetC] = {
                ...newGrid[targetR][targetC],
                row: targetR,
                col: targetC,
                value: source.value,
                type: source.type,
                key: source.key,
                colSpan: source.colSpan,
                rowSpan: source.rowSpan,
                align: source.align || newGrid[targetR][targetC].align,
                borders: source.borders || newGrid[targetR][targetC].borders,
                hidden: source.hidden
            };
        }
    }

    return {
        updatedCells: newGrid,
        newRowCount: requiredRows,
        newColCount: requiredCols
    };
};

/**
 * Mengonversi ParsedExcelTable menjadi template baru lengkap
 */
export const buildTemplateFromExcelTable = (
    pasted: ParsedExcelTable,
    templateName: string = 'Template Rapor Excel',
    jenjangId?: number
): RaporTemplate => {
    const newCells: GridCell[][] = [];
    for (let r = 0; r < pasted.rowCount; r++) {
        const row: GridCell[] = [];
        for (let c = 0; c < pasted.colCount; c++) {
            const src = pasted.cells[r][c];
            row.push({
                id: `cell_${Date.now()}_${r}_${c}_${Math.random().toString(36).substr(2, 4)}`,
                row: r,
                col: c,
                value: src.value,
                type: src.type,
                key: src.key,
                colSpan: src.colSpan,
                rowSpan: src.rowSpan,
                align: src.align,
                borders: src.borders || { top: true, right: true, bottom: true, left: true },
                hidden: src.hidden,
                width: 100,
                height: 30
            });
        }
        newCells.push(row);
    }

    const defaultSheet: RaporSheet = {
        id: 'sheet_' + Date.now(),
        name: 'Lembar 1 (Akademik)',
        rowCount: pasted.rowCount,
        colCount: pasted.colCount,
        cells: newCells,
        paperSize: 'A4'
    };

    return {
        id: 'tpl_' + Date.now(),
        name: templateName,
        rowCount: pasted.rowCount,
        colCount: pasted.colCount,
        cells: newCells,
        sheets: [defaultSheet],
        activeSheetId: defaultSheet.id,
        jenjangId,
        lastModified: new Date().toISOString()
    };
};
