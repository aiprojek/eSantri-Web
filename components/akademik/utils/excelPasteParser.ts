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
    width?: number;
    height?: number;
    bold?: boolean;
    italic?: boolean;
    backgroundColor?: string;
    color?: string;
    fontSize?: number;
}

export interface ParsedExcelTable {
    rowCount: number;
    colCount: number;
    cells: ParsedExcelCell[][];
    detectedTags: string[];
    mergeCount: number;
    rawText: string;
    colWidths?: number[];
    rowHeights?: number[];
}

const SYSTEM_KEYS = [
    '$NAMA', '$NAMA_LENGKAP', '$NAMA_HIJRAH', '$NIS', '$NISN', '$NIK',
    '$TEMPAT_LAHIR', '$TANGGAL_LAHIR', '$TTL', '$JENIS_KELAMIN', '$ALAMAT_SANTRI',
    '$NAMA_AYAH', '$NAMA_IBU', '$NAMA_WALI', '$TELEPON_ORTU',
    '$KELAS', '$ROMBEL', '$SEMESTER', '$TAHUN_AJAR', '$TAHUN_AJARAN',
    '$NAMA_YAYASAN', '$NAMA_PONPES', '$ALAMAT_PONDOK', '$LOGO',
    '$WALI_KELAS', '$MUDIR', '$TOTAL_NILAI', '$RATA_RATA', '$PERINGKAT',
    '$KKM', '$KKM_STANDAR', '$NILAI_KKM', '$KBM',
    '$TANGGAL_RAPOR', '$TEMPAT_TANGGAL_RAPOR'
];

export const parseCssDimension = (val: string | null | undefined): number | undefined => {
    if (!val) return undefined;
    const s = val.trim().toLowerCase();
    if (s.endsWith('pt')) {
        const pt = parseFloat(s);
        return isNaN(pt) ? undefined : Math.max(8, Math.round(pt * 1.333));
    }
    if (s.endsWith('px')) {
        const px = parseFloat(s);
        return isNaN(px) ? undefined : Math.max(8, Math.round(px));
    }
    if (s.endsWith('in')) {
        const inches = parseFloat(s);
        return isNaN(inches) ? undefined : Math.max(8, Math.round(inches * 96));
    }
    if (s.endsWith('cm')) {
        const cm = parseFloat(s);
        return isNaN(cm) ? undefined : Math.max(8, Math.round(cm * 37.795));
    }
    if (s.endsWith('mm')) {
        const mm = parseFloat(s);
        return isNaN(mm) ? undefined : Math.max(8, Math.round(mm * 3.7795));
    }
    const num = parseFloat(s);
    return isNaN(num) ? undefined : Math.max(8, Math.round(num));
};

/**
 * Mendeteksi tipe cell, formula, dan tag placeholder eSantri (mendukung $TAG, {{TAG}}, [TAG])
 */
export const analyzeCellValue = (rawVal: string): { type: RaporColumnType; key?: string; value: string } => {
    const trimmed = (rawVal || '').trim();
    if (!trimmed) {
        return { type: 'label', value: '' };
    }

    if (trimmed.startsWith('=')) {
        return { type: 'formula', value: trimmed };
    }

    // Dukungan sintaks kurung kurawal {{NAMA}}, {{NIS}}, {{nama}}, dsb dari Excel
    if (trimmed.startsWith('{{') && trimmed.endsWith('}}')) {
        const inner = trimmed.slice(2, -2).trim().toUpperCase();
        const tagMap: Record<string, string> = {
            'NAMA': '$NAMA',
            'NAMA_LENGKAP': '$NAMA_LENGKAP',
            'NAMA_SANTRI': '$NAMA',
            'NIS': '$NIS',
            'NISN': '$NISN',
            'ROMBEL': '$ROMBEL',
            'KELAS': '$ROMBEL',
            'PERINGKAT': '$PERINGKAT',
            'RANKING': '$PERINGKAT',
            'JUARA': '$PERINGKAT',
            'TOTAL_NILAI': '$TOTAL_NILAI',
            'TOTAL': '$TOTAL_NILAI',
            'JUMLAH': '$TOTAL_NILAI',
            'RATA_RATA': '$RATA_RATA',
            'RATA': '$RATA_RATA',
            'PREDIKAT': '$PREDIKAT_RATA_RATA',
            'WALI_KELAS': '$NAMA_WALI_KELAS',
            'NAMA_WALI_KELAS': '$NAMA_WALI_KELAS',
            'MUDIR': '$NAMA_MUDIR',
            'KEPALA_SEKOLAH': '$NAMA_MUDIR',
            'TANGGAL_RAPOR': '$TANGGAL_DOKUMEN',
            'LOGO': '$LOGO_PONPES',
            'LOGO_PONDOK': '$LOGO_PONPES',
            'LOGO_PONPES': '$LOGO_PONPES',
            'SEMESTER': '$SEMESTER',
            'TAHUN_AJAR': '$TAHUN_AJARAN',
            'TAHUN_AJARAN': '$TAHUN_AJARAN',
            'KKM': '$KKM',
            'NILAI_KKM': '$KKM',
            'KKM_STANDAR': '$KKM_STANDAR'
        };
        const mapped = tagMap[inner] || `$${inner}`;
        return { type: 'data', value: mapped };
    }

    if (trimmed.startsWith('$')) {
        const upper = trimmed.toUpperCase();
        if (
            SYSTEM_KEYS.includes(upper) ||
            upper === '$KKM' ||
            upper.startsWith('$KKM_') ||
            upper.startsWith('$MAPEL_') ||
            upper.startsWith('$TOTAL') ||
            upper.startsWith('$RATA') ||
            upper.startsWith('$RANK') ||
            upper.startsWith('$NILAI_') ||
            upper.startsWith('$LOGO') ||
            upper.startsWith('$STEMPEL') ||
            upper.startsWith('$TTD')
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

        // Parse semua rules CSS di dalam <style> Excel (.xl65 { ... })
        const cssRulesMap: Record<string, Record<string, string>> = {};
        const styleTags = Array.from(doc.querySelectorAll('style'));
        styleTags.forEach(st => {
            const text = st.textContent || '';
            const ruleRegex = /\.([a-zA-Z0-9_\-]+)\s*\{([^}]+)\}/g;
            let m: RegExpExecArray | null;
            while ((m = ruleRegex.exec(text)) !== null) {
                const className = m[1];
                const declarations = m[2];
                if (!cssRulesMap[className]) cssRulesMap[className] = {};
                declarations.split(';').forEach(decl => {
                    const colonIdx = decl.indexOf(':');
                    if (colonIdx > 0) {
                        const prop = decl.substring(0, colonIdx).trim().toLowerCase();
                        const val = decl.substring(colonIdx + 1).trim();
                        cssRulesMap[className][prop] = val;
                    }
                });
            }
        });

        const trElements = Array.from(table.querySelectorAll('tr'));
        if (trElements.length === 0) return null;

        // Baca column widths dari <colgroup> jika ada
        const colgroupWidths: (number | undefined)[] = [];
        const colgroup = table.querySelector('colgroup');
        if (colgroup) {
            Array.from(colgroup.querySelectorAll('col')).forEach((col) => {
                const span = parseInt(col.getAttribute('span') || '1', 10);
                const w = parseCssDimension(col.style.width || col.getAttribute('width'));
                for (let i = 0; i < span; i++) {
                    colgroupWidths.push(w);
                }
            });
        }

        // Matrix untuk melacak sel yang sudah terisi / ter-merge
        const gridMatrix: (ParsedExcelCell | null)[][] = [];
        let maxCols = 0;
        const detectedTags = new Set<string>();
        let mergeCount = 0;
        const colWidthsMap: Record<number, number> = {};
        const rowHeightsMap: Record<number, number> = {};

        trElements.forEach((tr, rIdx) => {
            if (!gridMatrix[rIdx]) gridMatrix[rIdx] = [];
            let cIdx = 0;

            // Baca tinggi baris dari tr style/attribute
            const trH = parseCssDimension(tr.style.height || tr.getAttribute('height'));
            if (trH && trH >= 8) {
                rowHeightsMap[rIdx] = trH;
            }

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

                // Ambil gabungan style dari class Excel (.xl65 dll) dan inline style
                const classNames = (td.className || '').split(/\s+/).filter(Boolean);
                const mergedStyle: Record<string, string> = {};
                classNames.forEach(cn => {
                    if (cssRulesMap[cn]) {
                        Object.assign(mergedStyle, cssRulesMap[cn]);
                    }
                });
                if (td.getAttribute('style')) {
                    td.getAttribute('style')!.split(';').forEach(decl => {
                        const colonIdx = decl.indexOf(':');
                        if (colonIdx > 0) {
                            const prop = decl.substring(0, colonIdx).trim().toLowerCase();
                            const val = decl.substring(colonIdx + 1).trim();
                            mergedStyle[prop] = val;
                        }
                    });
                }

                // Cek text-align
                let align: 'left' | 'center' | 'right' | undefined;
                const styleAlign = (mergedStyle['text-align'] || td.style.textAlign || td.getAttribute('align') || '').toLowerCase();
                if (styleAlign === 'center') align = 'center';
                else if (styleAlign === 'right') align = 'right';
                else if (styleAlign === 'left') align = 'left';

                // Cek font-weight (bold)
                const fw = (mergedStyle['font-weight'] || td.style.fontWeight || '').toLowerCase();
                const hasBoldChild = td.querySelector('b, strong') !== null;
                const isBold = hasBoldChild || fw === 'bold' || fw === '700' || fw === '800' || fw === '900';

                // Cek font-style (italic)
                const fs = (mergedStyle['font-style'] || td.style.fontStyle || '').toLowerCase();
                const hasItalicChild = td.querySelector('i, em') !== null;
                const isItalic = hasItalicChild || fs === 'italic';

                // Cek background-color
                let bgColor: string | undefined = mergedStyle['background-color'] || mergedStyle['background'] || td.style.backgroundColor || td.getAttribute('bgcolor') || undefined;
                if (bgColor) {
                    const bgLower = bgColor.toLowerCase();
                    if (bgLower === 'none' || bgLower === 'transparent' || bgLower === 'initial') {
                        bgColor = undefined;
                    }
                }

                // Cek text color
                let textColor: string | undefined = mergedStyle['color'] || td.style.color || undefined;
                const fontTag = td.querySelector('font[color]');
                if (fontTag) {
                    textColor = fontTag.getAttribute('color') || textColor;
                }

                // Cek dimensi sel (lebar kolom & tinggi baris)
                const cellW = parseCssDimension(mergedStyle['width'] || td.style.width || td.getAttribute('width'));
                const cellH = parseCssDimension(mergedStyle['height'] || td.style.height || td.getAttribute('height'));
                if (cellW && colSpan === 1 && (!colWidthsMap[cIdx] || cellW > colWidthsMap[cIdx])) {
                    colWidthsMap[cIdx] = cellW;
                }
                if (cellH && rowSpan === 1 && (!rowHeightsMap[rIdx] || cellH > rowHeightsMap[rIdx])) {
                    rowHeightsMap[rIdx] = cellH;
                }

                // Deteksi border presisi per sisi (Excel border mapping)
                const checkBorder = (val: string | undefined): boolean | null => {
                    if (!val) return null;
                    const v = val.toLowerCase().trim();
                    if (v.includes('none') || v.includes('hidden') || v === '0' || v === '0px' || v.startsWith('none') || v === 'medium none') return false;
                    if (v.includes('solid') || v.includes('pt') || v.includes('px') || v.includes('windowtext') || v.includes('thin') || v.includes('medium') || v.includes('#') || v.includes('double') || v.includes('dashed')) return true;
                    return null;
                };

                const generalBorderVal = mergedStyle['border'] || td.style.border;
                const generalStatus = checkBorder(generalBorderVal);

                const topStatus = checkBorder(mergedStyle['border-top'] || td.style.borderTop);
                const rightStatus = checkBorder(mergedStyle['border-right'] || td.style.borderRight);
                const bottomStatus = checkBorder(mergedStyle['border-bottom'] || td.style.borderBottom);
                const leftStatus = checkBorder(mergedStyle['border-left'] || td.style.borderLeft);

                const bTop = topStatus !== null ? topStatus : (generalStatus === true);
                const bRight = rightStatus !== null ? rightStatus : (generalStatus === true);
                const bBottom = bottomStatus !== null ? bottomStatus : (generalStatus === true);
                const bLeft = leftStatus !== null ? leftStatus : (generalStatus === true);

                const parsedCell: ParsedExcelCell = {
                    value,
                    type,
                    key,
                    colSpan,
                    rowSpan,
                    align,
                    width: (colSpan === 1 ? cellW : undefined) || colgroupWidths[cIdx] || undefined,
                    height: (rowSpan === 1 ? cellH : undefined) || trH || undefined,
                    bold: isBold || undefined,
                    italic: isItalic || undefined,
                    backgroundColor: bgColor,
                    color: textColor,
                    borders: {
                        top: bTop,
                        right: bRight,
                        bottom: bBottom,
                        left: bLeft
                    }
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

        // Normalisasi matrix agar semua cell terdefinisi dan memiliki width & height konsisten per kolom/baris
        const normalizedCells: ParsedExcelCell[][] = [];
        for (let r = 0; r < totalRows; r++) {
            const row: ParsedExcelCell[] = [];
            const rHeight = rowHeightsMap[r] || 30;
            for (let c = 0; c < maxCols; c++) {
                const cWidth = colgroupWidths[c] || colWidthsMap[c] || 100;
                const cell = gridMatrix[r]?.[c] || {
                    value: '',
                    type: 'label',
                    colSpan: 1,
                    rowSpan: 1,
                    borders: { top: false, right: false, bottom: false, left: false }
                };
                row.push({
                    ...cell,
                    width: (cell.colSpan === 1 && cell.width) ? cell.width : cWidth,
                    height: (cell.rowSpan === 1 && cell.height) ? cell.height : rHeight
                });
            }
            normalizedCells.push(row);
        }

        const colWidthsArray: number[] = [];
        for (let c = 0; c < maxCols; c++) {
            colWidthsArray.push(colgroupWidths[c] || colWidthsMap[c] || 100);
        }

        const rowHeightsArray: number[] = [];
        for (let r = 0; r < totalRows; r++) {
            rowHeightsArray.push(rowHeightsMap[r] || 30);
        }

        return {
            rowCount: totalRows,
            colCount: maxCols,
            cells: normalizedCells,
            detectedTags: Array.from(detectedTags),
            mergeCount,
            rawText: table.innerText || '',
            colWidths: colWidthsArray,
            rowHeights: rowHeightsArray
        };
    } catch (e) {
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
            const isCellEmpty = !value || value.trim() === '';
            // Jangan otomatis beri border ke baris judul/biodata terisolasi (misal baris 0-2 dengan sedikit kolom terisi)
            const filledCountInRow = rowsData[r].filter(p => p && p.trim().length > 0).length;
            const isHeaderOrTitleRow = r <= 2 && filledCountInRow <= 2 && maxCols >= 3;
            const shouldHaveBorder = !isCellEmpty && !isHeaderOrTitleRow;

            row.push({
                value,
                type,
                key,
                colSpan: 1,
                rowSpan: 1,
                borders: shouldHaveBorder ? { top: true, right: true, bottom: true, left: true } : { top: false, right: false, bottom: false, left: false },
                width: 100,
                height: 30
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

    // Terapkan hasil paste ke grid beserta width, height, borders presisi
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
                hidden: source.hidden,
                width: source.width || newGrid[targetR][targetC].width,
                height: source.height || newGrid[targetR][targetC].height,
                bold: source.bold !== undefined ? source.bold : newGrid[targetR][targetC].bold,
                italic: source.italic !== undefined ? source.italic : newGrid[targetR][targetC].italic,
                backgroundColor: source.backgroundColor !== undefined ? source.backgroundColor : newGrid[targetR][targetC].backgroundColor,
                color: source.color !== undefined ? source.color : newGrid[targetR][targetC].color,
                fontSize: source.fontSize !== undefined ? source.fontSize : newGrid[targetR][targetC].fontSize
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
    jenjangId?: number,
    customTitle?: string
): RaporTemplate => {
    // Deteksi apakah tabel paste ini sudah memiliki data diri santri sendiri
    const hasBuiltInBiodata = pasted.detectedTags.some(t =>
        t === '$NAMA' || t === '$NIS' || t === '$ROMBEL' || t === '$KELAS' || t === '$PERINGKAT' || t === '$RANKING'
    );

    const newCells: GridCell[][] = [];
    for (let r = 0; r < pasted.rowCount; r++) {
        const row: GridCell[] = [];
        for (let c = 0; c < pasted.colCount; c++) {
            const src = pasted.cells[r][c];
            const w = src.width || pasted.colWidths?.[c] || 100;
            const h = src.height || pasted.rowHeights?.[r] || 30;

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
                borders: src.borders || { top: false, right: false, bottom: false, left: false },
                hidden: src.hidden,
                width: w,
                height: h,
                bold: src.bold,
                italic: src.italic,
                backgroundColor: src.backgroundColor,
                color: src.color,
                fontSize: src.fontSize
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
        paperSize: 'A4',
        showJudul: !!customTitle, // Aktifkan judul jika customTitle diberikan
        showBiodataHeader: !hasBuiltInBiodata, // Jika sudah ada tag $NAMA/$NIS di tabel, matikan header biodata ganda
        fitToPage: true, // Standar Excel: Pas 1 muka per lembar
        printScale: 'auto',
        marginMode: 'narrow',
        customTitle
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
        showJudul: !!customTitle,
        showBiodataHeader: !hasBuiltInBiodata,
        fitToPage: true,
        printScale: 'auto',
        marginMode: 'narrow',
        customTitle,
        lastModified: new Date().toISOString()
    };
};
