import { loadXLSX } from '../utils/lazyClientLibs';
import { RaporTemplate, RaporSheet, Santri, PondokSettings, AbsensiRecord } from '../types';
import { db } from '../db';

export interface ExtractedTemplateKey {
    key: string;
    label: string;
    type: 'input' | 'dropdown' | 'formula';
    options?: string[];
    sheetId?: string;
    sheetName?: string;
}

/**
 * Get all sheets from template with automatic fallback for single-sheet legacy templates
 */
export const getTemplateSheets = (template?: RaporTemplate | null): RaporSheet[] => {
    if (!template) return [];
    if (template.sheets && template.sheets.length > 0) {
        return template.sheets;
    }
    if (template.cells && template.cells.length > 0) {
        return [{
            id: 'sheet_default',
            name: template.name || 'Lembar 1',
            rowCount: template.rowCount || template.cells.length,
            colCount: template.colCount || (template.cells[0]?.length || 0),
            cells: template.cells,
            showJudul: template.showJudul
        }];
    }
    return [];
};

/**
 * Extract input and dropdown keys from a Rapor template grid
 * Supports multi-sheet or specific sheet filtering
 */
export const extractTemplateKeys = (template?: RaporTemplate | null, targetSheetId?: string): ExtractedTemplateKey[] => {
    if (!template) return [];

    const sheets = getTemplateSheets(template);
    if (sheets.length === 0) return [];

    const activeSheets = targetSheetId && targetSheetId !== 'all'
        ? sheets.filter(s => s.id === targetSheetId)
        : sheets;

    const keys: ExtractedTemplateKey[] = [];
    const seen = new Set<string>();

    activeSheets.forEach(sheet => {
        if (!sheet.cells) return;
        sheet.cells.forEach(row => {
            row.forEach(cell => {
                if ((cell.type === 'input' || cell.type === 'dropdown') && cell.key && !cell.hidden) {
                    const trimmedKey = cell.key.trim();
                    if (trimmedKey && !seen.has(trimmedKey)) {
                        seen.add(trimmedKey);

                        // Find a readable label in the same row before this cell, or cell above
                        let label = cell.key;
                        const rowCells = sheet.cells[cell.row] || [];
                        const labelCellLeft = [...rowCells]
                            .reverse()
                            .find(c => c.col < cell.col && c.type === 'label' && c.value && c.value.trim() !== '' && !c.value.startsWith('$'));
                        
                        if (labelCellLeft) {
                            label = labelCellLeft.value.trim();
                        } else if (cell.value && cell.value.trim() !== '' && !cell.value.startsWith('$')) {
                            label = cell.value.trim();
                        }

                        keys.push({
                            key: trimmedKey,
                            label: label || trimmedKey,
                            type: cell.type,
                            options: cell.options,
                            sheetId: sheet.id,
                            sheetName: sheet.name
                        });
                    }
                }
            });
        });
    });

    return keys;
};

/**
 * Export Excel template pre-filled with students and existing grades
 */
export interface ExportRaporExcelParams {
    template?: RaporTemplate | null;
    santriList: Santri[];
    rombelName: string;
    tahunAjaran: string;
    semester: string;
    currentGrades?: Record<number, Record<string, string>>;
}

export const exportRaporExcelTemplate = async ({
    template,
    santriList,
    rombelName,
    tahunAjaran,
    semester,
    currentGrades = {}
}: ExportRaporExcelParams): Promise<string> => {
    const XLSX = await loadXLSX();
    const keys = extractTemplateKeys(template);

    // If template has no explicit input keys, provide standard attendance & notes keys
    const effectiveKeys = keys.length > 0 ? keys : [
        { key: 'NILAI_AKHIR', label: 'Nilai Akhir', type: 'input' as const },
        { key: 'SAKIT', label: 'Sakit (Hari)', type: 'input' as const },
        { key: 'IZIN', label: 'Izin (Hari)', type: 'input' as const },
        { key: 'ALPHA', label: 'Alpha (Hari)', type: 'input' as const },
        { key: 'CATATAN_WALI', label: 'Catatan Wali Kelas', type: 'input' as const },
        { key: 'KEPUTUSAN', label: 'Keputusan', type: 'input' as const },
    ];

    const rows: Record<string, any>[] = santriList.map((student, idx) => {
        const studentGrades = currentGrades[student.id] || {};
        const rowData: Record<string, any> = {
            'No': idx + 1,
            'NIS': student.nis || '',
            'Nama Santri': student.namaLengkap,
            'Rombel': rombelName || '-',
        };

        effectiveKeys.forEach(k => {
            const colHeader = k.label && k.label !== k.key 
                ? `${k.label} [${k.key}]` 
                : k.key;
            rowData[colHeader] = studentGrades[k.key] !== undefined ? studentGrades[k.key] : '';
        });

        return rowData;
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);

    // Auto-size columns for readability
    const colKeys = Object.keys(rows[0] || { 'No': 1, 'NIS': '', 'Nama Santri': '', 'Rombel': '' });
    worksheet['!cols'] = colKeys.map(col => {
        if (col === 'No') return { wch: 5 };
        if (col === 'NIS') return { wch: 14 };
        if (col === 'Nama Santri') return { wch: 30 };
        if (col === 'Rombel') return { wch: 16 };
        return { wch: Math.max(col.length + 2, 14) };
    });

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data_Nilai');

    const cleanRombel = (rombelName || 'Rombel').replace(/[^a-zA-Z0-9_-]/g, '_');
    const cleanTA = (tahunAjaran || 'TA').replace(/[^a-zA-Z0-9_-]/g, '-');
    const fileName = `Template_Nilai_${cleanRombel}_${cleanTA}_${semester}.xlsx`;

    XLSX.writeFile(workbook, fileName);
    return fileName;
};

/**
 * Parse uploaded Excel file and map rows to Santri and Template Keys
 */
export interface ParsedRaporExcelResult {
    success: boolean;
    totalRows: number;
    matchedCount: number;
    unmatchedCount: number;
    matchedGrades: Record<number, Record<string, string>>;
    detectedKeys: string[];
    unmatchedRows: { rowNum: number; nis?: string; nama?: string }[];
    errors: string[];
}

export const parseRaporExcelFile = async (
    file: File,
    template: RaporTemplate | null | undefined,
    allSantri: Santri[]
): Promise<ParsedRaporExcelResult> => {
    try {
        const XLSX = await loadXLSX();
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });

        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
            return {
                success: false,
                totalRows: 0,
                matchedCount: 0,
                unmatchedCount: 0,
                matchedGrades: {},
                detectedKeys: [],
                unmatchedRows: [],
                errors: ['File Excel tidak memiliki lembar kerja (worksheet).']
            };
        }

        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rawData: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        if (!rawData || rawData.length === 0) {
            return {
                success: false,
                totalRows: 0,
                matchedCount: 0,
                unmatchedCount: 0,
                matchedGrades: {},
                detectedKeys: [],
                unmatchedRows: [],
                errors: ['Worksheet Excel kosong atau tidak memiliki data santri.']
            };
        }

        // Available template keys
        const expectedKeys = extractTemplateKeys(template);
        const headers = Object.keys(rawData[0] || {});

        // Map column header to template key
        // e.g. "Fiqih [FIQIH_PAS]" -> "FIQIH_PAS", "MTK" -> "MTK"
        const colToKeyMap: Record<string, string> = {};
        const detectedKeysSet = new Set<string>();

        headers.forEach(header => {
            const h = header.trim();
            // Check [KEY] pattern
            const matchBracket = h.match(/\[([A-Za-z0-9_-]+)\]$/);
            if (matchBracket && matchBracket[1]) {
                const extractedKey = matchBracket[1];
                colToKeyMap[h] = extractedKey;
                detectedKeysSet.add(extractedKey);
                return;
            }

            // Check exact key match (case-insensitive)
            const matchedKeyObj = expectedKeys.find(
                k => k.key.toLowerCase() === h.toLowerCase() ||
                     k.label.toLowerCase() === h.toLowerCase()
            );

            if (matchedKeyObj) {
                colToKeyMap[h] = matchedKeyObj.key;
                detectedKeysSet.add(matchedKeyObj.key);
                return;
            }

            // Common attendance / notes matching
            const lowerH = h.toLowerCase();
            if (lowerH === 'sakit' || lowerH === 's') {
                colToKeyMap[h] = 'SAKIT';
                detectedKeysSet.add('SAKIT');
            } else if (lowerH === 'izin' || lowerH === 'i') {
                colToKeyMap[h] = 'IZIN';
                detectedKeysSet.add('IZIN');
            } else if (lowerH === 'alpha' || lowerH === 'alpa' || lowerH === 'a') {
                colToKeyMap[h] = 'ALPHA';
                detectedKeysSet.add('ALPHA');
            } else if (lowerH.includes('catatan') && lowerH.includes('wali')) {
                colToKeyMap[h] = 'CATATAN_WALI';
                detectedKeysSet.add('CATATAN_WALI');
            } else if (lowerH.includes('keputusan')) {
                colToKeyMap[h] = 'KEPUTUSAN';
                detectedKeysSet.add('KEPUTUSAN');
            } else {
                // If it's not a standard student metadata header, consider it as a raw key
                const ignoreHeaders = ['no', 'nis', 'nama', 'nama santri', 'nama lengkap', 'rombel', 'kelas'];
                if (!ignoreHeaders.includes(lowerH)) {
                    colToKeyMap[h] = h;
                    detectedKeysSet.add(h);
                }
            }
        });

        // Fast lookup maps for santri
        const santriByNis = new Map<string, Santri>();
        const santriByName = new Map<string, Santri>();

        allSantri.forEach(s => {
            if (s.nis) santriByNis.set(s.nis.trim().toLowerCase(), s);
            if (s.namaLengkap) santriByName.set(s.namaLengkap.trim().toLowerCase(), s);
        });

        const matchedGrades: Record<number, Record<string, string>> = {};
        const unmatchedRows: { rowNum: number; nis?: string; nama?: string }[] = [];
        let matchedCount = 0;

        rawData.forEach((row, idx) => {
            const rowNum = idx + 2; // 1-based + 1 for header
            // Extract NIS & Nama from row
            let rowNis = '';
            let rowNama = '';

            Object.entries(row).forEach(([col, val]) => {
                const lowerCol = col.trim().toLowerCase();
                if (lowerCol === 'nis' || lowerCol.startsWith('nis ')) {
                    rowNis = String(val).trim();
                } else if (lowerCol === 'nama santri' || lowerCol === 'nama lengkap' || lowerCol === 'nama') {
                    rowNama = String(val).trim();
                }
            });

            // Attempt match by NIS first, then by Name
            let matchedSantri: Santri | undefined;
            if (rowNis) {
                matchedSantri = santriByNis.get(rowNis.toLowerCase());
            }
            if (!matchedSantri && rowNama) {
                matchedSantri = santriByName.get(rowNama.toLowerCase());
            }

            if (!matchedSantri) {
                unmatchedRows.push({ rowNum, nis: rowNis, nama: rowNama });
                return;
            }

            matchedCount++;
            if (!matchedGrades[matchedSantri.id]) {
                matchedGrades[matchedSantri.id] = {};
            }

            // Extract grade values for mapped columns
            Object.entries(row).forEach(([col, val]) => {
                const key = colToKeyMap[col];
                if (key && val !== undefined && val !== null) {
                    const strVal = String(val).trim();
                    if (strVal !== '') {
                        matchedGrades[matchedSantri!.id][key] = strVal;
                    }
                }
            });
        });

        return {
            success: true,
            totalRows: rawData.length,
            matchedCount,
            unmatchedCount: unmatchedRows.length,
            matchedGrades,
            detectedKeys: Array.from(detectedKeysSet),
            unmatchedRows,
            errors: []
        };
    } catch (e) {
        return {
            success: false,
            totalRows: 0,
            matchedCount: 0,
            unmatchedCount: 0,
            matchedGrades: {},
            detectedKeys: [],
            unmatchedRows: [],
            errors: [(e as Error).message || 'Gagal membaca file Excel']
        };
    }
};

/**
 * Derive date range for an academic period
 */
export const getSemesterDateRange = (
    tahunAjaran: string,
    semester: 'Ganjil' | 'Genap',
    settings?: PondokSettings | null
): { startDate: string; endDate: string; label: string } => {
    // 1. Check if configured in settings.academicYears
    const configuredYears = settings?.academicYears || [];
    const matchedYear = configuredYears.find(y => y.labelMasehi === tahunAjaran);

    let startYear = new Date().getFullYear();
    let endYear = startYear + 1;

    if (matchedYear) {
        startYear = matchedYear.masehiStartYear || startYear;
        endYear = matchedYear.masehiEndYear || (startYear + 1);
    } else if (tahunAjaran && tahunAjaran.includes('/')) {
        const parts = tahunAjaran.split('/');
        const parsedStart = parseInt(parts[0], 10);
        const parsedEnd = parseInt(parts[1], 10);
        if (!isNaN(parsedStart)) startYear = parsedStart;
        if (!isNaN(parsedEnd)) endYear = parsedEnd;
        else endYear = startYear + 1;
    }

    if (semester === 'Ganjil') {
        return {
            startDate: `${startYear}-07-01`,
            endDate: `${startYear}-12-31`,
            label: `Semester Ganjil ${tahunAjaran} (01 Jul ${startYear} - 31 Des ${startYear})`
        };
    } else {
        return {
            startDate: `${endYear}-01-01`,
            endDate: `${endYear}-06-30`,
            label: `Semester Genap ${tahunAjaran} (01 Jan ${endYear} - 30 Jun ${endYear})`
        };
    }
};

/**
 * Calculate attendance aggregates (Sakit, Izin, Alpha) from db.absensi
 */
export interface SantriPresensiAggregate {
    sakit: number;
    izin: number;
    alpha: number;
    hadir: number;
    totalAbsen: number;
}

export interface PresensiSyncResult {
    aggregates: Record<number, SantriPresensiAggregate>;
    totalRecordsQueried: number;
    studentsWithAbsence: number;
    dateRange: { startDate: string; endDate: string; label: string };
}

export const syncPresensiFromDb = async (
    santriIds: number[],
    tahunAjaran: string,
    semester: 'Ganjil' | 'Genap',
    settings?: PondokSettings | null,
    customDateRange?: { startDate: string; endDate: string }
): Promise<PresensiSyncResult> => {
    const defaultRange = getSemesterDateRange(tahunAjaran, semester, settings);
    const startDate = customDateRange?.startDate || defaultRange.startDate;
    const endDate = customDateRange?.endDate || defaultRange.endDate;

    const santriIdSet = new Set(santriIds);

    // Query absensi within date range
    let records: AbsensiRecord[] = [];
    try {
        records = await db.absensi
            .where('tanggal')
            .between(startDate, endDate, true, true)
            .toArray();
    } catch {
        // Fallback in case of index issues
        const all = await db.absensi.toArray();
        records = all.filter(r => r.tanggal >= startDate && r.tanggal <= endDate);
    }

    // Filter to target santri
    const filtered = records.filter(r => santriIdSet.has(r.santriId));

    const aggregates: Record<number, SantriPresensiAggregate> = {};
    santriIds.forEach(id => {
        aggregates[id] = { sakit: 0, izin: 0, alpha: 0, hadir: 0, totalAbsen: 0 };
    });

    let studentsWithAbsence = 0;

    filtered.forEach(rec => {
        if (!aggregates[rec.santriId]) {
            aggregates[rec.santriId] = { sakit: 0, izin: 0, alpha: 0, hadir: 0, totalAbsen: 0 };
        }
        const agg = aggregates[rec.santriId];
        if (rec.status === 'S') agg.sakit += 1;
        else if (rec.status === 'I') agg.izin += 1;
        else if (rec.status === 'A') agg.alpha += 1;
        else if (rec.status === 'H') agg.hadir += 1;
        agg.totalAbsen = agg.sakit + agg.izin + agg.alpha;
    });

    santriIds.forEach(id => {
        if (aggregates[id] && aggregates[id].totalAbsen > 0) {
            studentsWithAbsence++;
        }
    });

    return {
        aggregates,
        totalRecordsQueried: filtered.length,
        studentsWithAbsence,
        dateRange: {
            startDate,
            endDate,
            label: defaultRange.label
        }
    };
};
