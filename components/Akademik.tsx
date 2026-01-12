
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useAppContext } from '../AppContext';
import { generateRaporFormHtml, parseRaporDataV2, fetchRaporFromCloud } from '../services/academicService';
import { RaporTemplate, GridCell, RaporColumnType, Santri, RaporRecord } from '../types';
import * as XLSX from 'xlsx';
import { db } from '../db';
import { printToPdfNative } from '../utils/pdfGenerator';
import { RaporLengkapTemplate } from './reports/modules/AcademicReports';

const GOOGLE_SCRIPT_TEMPLATE = `
/* GOOGLE APPS SCRIPT FOR RAPOR (eSantri Web) - SMART VERSION */

// 1. FUNGSI BACA DATA (Import ke App)
// Membaca SEMUA sheet (tab) yang ada di spreadsheet ini
function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ss.getSheets();
  var combinedData = [];

  for (var s = 0; s < sheets.length; s++) {
    var sheet = sheets[s];
    var rows = sheet.getDataRange().getValues();
    if (rows.length < 2) continue; // Lewati sheet kosong
    
    var headers = rows[0];
    // Validasi sederhana: harus ada kolom DataJSON
    if (headers.indexOf("DataJSON") === -1) continue;

    for (var i = 1; i < rows.length; i++) {
      var row = rows[i];
      var record = {};
      for (var j = 0; j < headers.length; j++) { 
        record[headers[j]] = row[j]; 
      }
      combinedData.push(record);
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify(combinedData)).setMimeType(ContentService.MimeType.JSON);
}

// 2. FUNGSI TERIMA DATA (Dari Guru)
// Otomatis membuat/memilih Sheet berdasarkan Nama Rombel & Template
function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(30000);

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var data = JSON.parse(e.postData.contents);
    var meta = data.meta;
    var records = data.records;
    
    // Buat nama sheet unik: "NamaRombel - NamaTemplate"
    // Hapus karakter spesial agar valid
    var sheetName = (meta.rombelName + " - " + meta.templateName).substring(0, 99).replace(/[:\/\\?*\[\]]/g, "");
    
    var sheet = ss.getSheetByName(sheetName);
    
    // Jika sheet belum ada, buat baru
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      // Header agar mudah dibaca manusia
      var headers = ["Timestamp", "RombelID", "TemplateID", "TahunAjaran", "Semester", "SantriID", "NamaSantri", "DataJSON"];
      sheet.appendRow(headers);
      sheet.setFrozenRows(1);
    }
    
    // Tambah Data
    var rowsToAdd = [];
    var timestamp = new Date();
    
    records.forEach(function(rec) {
      rowsToAdd.push([
        timestamp, 
        meta.rombelId, 
        meta.templateId, 
        meta.tahunAjaran, 
        meta.semester, 
        rec.santriId, 
        rec.santriName || "", 
        JSON.stringify(rec.data)
      ]);
    });
    
    if(rowsToAdd.length > 0) {
      sheet.getRange(sheet.getLastRow() + 1, 1, rowsToAdd.length, 8).setValues(rowsToAdd);
    }
    
    return ContentService.createTextOutput(JSON.stringify({result: "success", sheet: sheetName})).setMimeType(ContentService.MimeType.JSON);
    
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({result: "error", error: err.toString()})).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}`;

const Akademik: React.FC = () => {
    const { settings, santriList, showToast, currentUser, showAlert, onSaveSettings, showConfirmation } = useAppContext();
    // Split 'archive' into 'data' and 'print'
    const [activeTab, setActiveTab] = useState<'designer' | 'generator' | 'import' | 'data' | 'print'>('designer');
    
    // --- Designer State ---
    const [templates, setTemplates] = useState<RaporTemplate[]>(settings.raporTemplates || []);
    const [activeTemplate, setActiveTemplate] = useState<RaporTemplate | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    
    // Grid Selection & Zoom & Preview State
    const [selectedCells, setSelectedCells] = useState<{r: number, c: number}[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState<{r: number, c: number} | null>(null);
    const [zoomScale, setZoomScale] = useState(1); // Zoom State
    const [isDesignPreviewOpen, setIsDesignPreviewOpen] = useState(false); // Design Preview State

    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null); // For Excel Import

    // --- Generator State ---
    const [genTemplateId, setGenTemplateId] = useState('');
    const [genJenjangId, setGenJenjangId] = useState(0);
    const [genKelasId, setGenKelasId] = useState(0);
    const [genRombelId, setGenRombelId] = useState(0);
    const [genSemester, setGenSemester] = useState<'Ganjil' | 'Genap'>('Ganjil');
    const [genTahunAjaran, setGenTahunAjaran] = useState('2024/2025');
    
    // Generator: Submission Configuration
    const [submissionMethod, setSubmissionMethod] = useState<'whatsapp' | 'google_sheet' | 'hybrid'>('whatsapp');
    const [googleScriptUrl, setGoogleScriptUrl] = useState('');
    const [waDestination, setWaDestination] = useState(''); // NEW STATE
    const [showScriptHelper, setShowScriptHelper] = useState(false);

    // --- Import State ---
    const [importSource, setImportSource] = useState<'wa' | 'cloud'>('wa');
    const [waInput, setWaInput] = useState('');
    const [cloudScriptUrl, setCloudScriptUrl] = useState(''); // Separate URL for fetching
    const [isProcessing, setIsProcessing] = useState(false);

    // --- Archive & Print State ---
    const [filterTahun, setFilterTahun] = useState('2024/2025');
    const [filterSemester, setFilterSemester] = useState<'Ganjil' | 'Genap'>('Ganjil');
    const [filterRombel, setFilterRombel] = useState(''); // Used for Data Tab
    
    // Print Tab Specific
    const [printRombel, setPrintRombel] = useState('');
    
    const [archiveRecords, setArchiveRecords] = useState<RaporRecord[]>([]);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [previewSantri, setPreviewSantri] = useState<Santri | null>(null);
    const [isPreviewGenerating, setIsPreviewGenerating] = useState(false);

    const canWrite = currentUser?.role === 'admin' || currentUser?.permissions?.akademik === 'write';
    const availableKelas = useMemo(() => genJenjangId ? settings.kelas.filter(k => k.jenjangId === genJenjangId) : [], [genJenjangId, settings.kelas]);
    const availableRombel = useMemo(() => genKelasId ? settings.rombel.filter(r => r.kelasId === genKelasId) : [], [genKelasId, settings.rombel]);

    // Helper: Collect available variables from current template
    const availableVars = useMemo(() => {
        if (!activeTemplate) return [];
        const vars: string[] = [];
        activeTemplate.cells.flat().forEach(cell => {
            if (cell.type === 'input' && cell.key) {
                vars.push(cell.key);
            }
        });
        return [...new Set(vars)].sort(); // Unique & Sorted keys
    }, [activeTemplate]);

    // Load Records on Tab Change or Filter Change
    useEffect(() => {
        if (activeTab === 'data' || activeTab === 'print') {
            const fetchRecords = async () => {
                let collection = db.raporRecords
                    .where('[santriId+tahunAjaran+semester]') 
                    .between([0, filterTahun, filterSemester], [Infinity, filterTahun, filterSemester]);
                
                const all = await db.raporRecords.toArray();
                const filtered = all.filter(r => r.tahunAjaran === filterTahun && r.semester === filterSemester);
                
                // For Data Tab
                if (activeTab === 'data' && filterRombel) {
                    const filteredByRombel = filtered.filter(r => r.rombelId === parseInt(filterRombel));
                    setArchiveRecords(filteredByRombel);
                } 
                // For Print Tab, we load everything for the semester to map later
                else {
                    setArchiveRecords(filtered);
                }
            };
            fetchRecords();
        }
    }, [activeTab, filterTahun, filterSemester, filterRombel]);

    const saveTemplatesToSettings = async (updatedTemplates: RaporTemplate[]) => {
        if (!canWrite) return;
        setTemplates(updatedTemplates);
        await onSaveSettings({ ...settings, raporTemplates: updatedTemplates });
    };

    // --- HELPER FUNCTIONS ---
    
    const createEmptyCell = (r: number, c: number): GridCell => ({
        id: `cell_${Date.now()}_${r}_${c}_${Math.random()}`,
        row: r, col: c, value: '', type: 'label', colSpan: 1, rowSpan: 1, width: 100,
        // Default borders OFF (Cleaner default, user can select all -> toggle on)
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

    const handleCreateTemplate = () => {
        const newTemplate: RaporTemplate = {
            id: 'tpl_' + Date.now(),
            name: 'Template Baru',
            rowCount: 10, 
            colCount: 8,
            cells: createInitialGrid(10, 8),
            lastModified: new Date().toISOString()
        };
        
        const setBorderOn = (cell: GridCell) => ({ ...cell, borders: { top: true, right: true, bottom: true, left: true } });

        newTemplate.cells[5][0] = setBorderOn({ ...newTemplate.cells[5][0], value: 'NO', type: 'label' });
        newTemplate.cells[5][1] = setBorderOn({ ...newTemplate.cells[5][1], value: 'MATA PELAJARAN', type: 'label' });
        newTemplate.cells[5][2] = setBorderOn({ ...newTemplate.cells[5][2], value: 'NILAI', type: 'label' });

        setActiveTemplate(newTemplate);
        setIsEditing(true);
        setSelectedCells([]);
        setZoomScale(1); // Reset zoom
    };

    const handleEditTemplate = (tpl: RaporTemplate) => {
        setActiveTemplate(JSON.parse(JSON.stringify(tpl)));
        setIsEditing(true);
        setSelectedCells([]);
        setZoomScale(1); // Reset zoom
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

        // Auto-name to avoid prompt blocking issues
        // Deep copy essential for nested grid cells
        const newTemplate: RaporTemplate = JSON.parse(JSON.stringify(original));
        
        newTemplate.id = 'tpl_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
        newTemplate.name = `${original.name} (Salinan)`;
        newTemplate.lastModified = new Date().toISOString();

        const updated = [...templates, newTemplate];
        saveTemplatesToSettings(updated);
        showToast('Template berhasil disalin. Silakan ubah namanya di menu Edit.', 'success');
    };

    const handleSaveActiveTemplate = () => {
        if (!activeTemplate || !activeTemplate.name.trim()) {
            showToast('Nama template wajib diisi.', 'error');
            return;
        }
        
        // Validation: Check for duplicate Keys
        const allKeys: string[] = [];
        activeTemplate.cells.flat().forEach(cell => {
            if (cell.key && !cell.hidden && (cell.type === 'input' || cell.type === 'formula' || cell.type === 'dropdown')) {
                allKeys.push(cell.key);
            }
        });
        const duplicates = allKeys.filter((item, index) => allKeys.indexOf(item) !== index);
        if (duplicates.length > 0) {
            showAlert('Error Validasi', `Kode Variabel ($KEY) harus unik. Ditemukan duplikat: ${duplicates.join(', ')}`);
            return;
        }

        const existingIdx = templates.findIndex(t => t.id === activeTemplate.id);
        let updated;
        if (existingIdx >= 0) {
            updated = [...templates];
            updated[existingIdx] = { ...activeTemplate, lastModified: new Date().toISOString() };
        } else {
            updated = [...templates, { ...activeTemplate, lastModified: new Date().toISOString() }];
        }
        saveTemplatesToSettings(updated);
        setIsEditing(false);
        setActiveTemplate(null);
        showToast('Template berhasil disimpan.', 'success');
    };

    // --- IMPORT EXCEL/ODS/CSV LOGIC ---
    const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                
                // Decode range to get dimensions
                const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1');
                const rowCount = range.e.r + 1;
                const colCount = range.e.c + 1;

                if (rowCount > 100 || colCount > 30) {
                    throw new Error("File terlalu besar. Maksimum 100 baris x 30 kolom.");
                }

                // Initialize Grid
                const newCells: GridCell[][] = [];
                for (let r = 0; r < rowCount; r++) {
                    const row: GridCell[] = [];
                    for (let c = 0; c < colCount; c++) {
                        row.push(createEmptyCell(r, c));
                    }
                    newCells.push(row);
                }

                // System Keys Detection List
                const systemKeys = ['$NAMA', '$NIS', '$NISN', '$KELAS', '$ROMBEL', '$SEMESTER', '$TAHUN_AJAR', '$NAMA_YAYASAN', '$NAMA_PONPES', '$ALAMAT_PONDOK', '$LOGO', '$WALI_KELAS', '$MUDIR'];

                // Fill Data
                for (let r = 0; r < rowCount; r++) {
                    for (let c = 0; c < colCount; c++) {
                        const cellAddr = XLSX.utils.encode_cell({ r, c });
                        const cellVal = ws[cellAddr];
                        
                        if (cellVal) {
                            const valStr = String(cellVal.v).trim();
                            newCells[r][c].value = valStr;

                            // Auto-Detect Type
                            if (valStr.startsWith('=')) {
                                newCells[r][c].type = 'formula';
                            } else if (valStr.startsWith('$')) {
                                if (systemKeys.includes(valStr) || valStr.startsWith('$MAPEL_NAME')) {
                                    newCells[r][c].type = 'data';
                                } else {
                                    // Variable Input
                                    newCells[r][c].type = 'input';
                                    newCells[r][c].key = valStr.substring(1).toUpperCase().replace(/[^A-Z0-9_]/g, '');
                                    // Remove $ for value display if input, or keep it as placeholder? 
                                    // In designer we usually show empty for input, but here key is important.
                                    // Let's reset value to empty for input type, as key holds the variable
                                    newCells[r][c].value = ''; 
                                }
                            } else {
                                newCells[r][c].type = 'label';
                            }

                            // Auto Border (Assume valid data cells have borders)
                            newCells[r][c].borders = { top: true, right: true, bottom: true, left: true };
                        }
                    }
                }

                // Handle Merges
                if (ws['!merges']) {
                    ws['!merges'].forEach(merge => {
                        const startR = merge.s.r;
                        const startC = merge.s.c;
                        const endR = merge.e.r;
                        const endC = merge.e.c;
                        
                        // Ensure bounds
                        if (startR < rowCount && startC < colCount) {
                            const cell = newCells[startR][startC];
                            cell.rowSpan = endR - startR + 1;
                            cell.colSpan = endC - startC + 1;

                            // Hide covered cells
                            for(let r = startR; r <= endR; r++) {
                                for(let c = startC; c <= endC; c++) {
                                    if (r === startR && c === startC) continue;
                                    if (r < rowCount && c < colCount) {
                                        newCells[r][c].hidden = true;
                                        newCells[r][c].value = ''; // clear content of hidden cells
                                    }
                                }
                            }
                        }
                    });
                }

                // Set Active Template
                // Remove extension from name
                const cleanName = file.name.replace(/\.(xlsx|xls|ods|csv)$/i, '');

                const newTemplate: RaporTemplate = {
                    id: 'tpl_' + Date.now(),
                    name: `Import_${cleanName}`,
                    rowCount,
                    colCount,
                    cells: newCells,
                    lastModified: new Date().toISOString()
                };

                setActiveTemplate(newTemplate);
                setIsEditing(true);
                setZoomScale(1);
                showToast(`Import ${file.name.split('.').pop()?.toUpperCase()} Berhasil!`, 'success');

            } catch (e) {
                showAlert('Gagal Import File', (e as Error).message);
            } finally {
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        };
        reader.readAsBinaryString(file);
    };

    // --- GRID INTERACTION LOGIC ---
    const handleMouseDown = (r: number, c: number) => {
        setIsDragging(true);
        setDragStart({ r, c });
        setSelectedCells([{ r, c }]);
    };

    const handleMouseEnter = (r: number, c: number) => {
        if (!isDragging || !dragStart) return;
        const rMin = Math.min(dragStart.r, r);
        const rMax = Math.max(dragStart.r, r);
        const cMin = Math.min(dragStart.c, c);
        const cMax = Math.max(dragStart.c, c);
        const newSelection = [];
        for(let i=rMin; i<=rMax; i++) {
            for(let j=cMin; j<=cMax; j++) {
                newSelection.push({ r: i, c: j });
            }
        }
        setSelectedCells(newSelection);
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    // --- GRID OPERATIONS ---

    const addRow = () => {
        if (!activeTemplate) return;
        const newRow = [];
        for(let c=0; c<activeTemplate.colCount; c++) newRow.push(createEmptyCell(activeTemplate.rowCount, c));
        setActiveTemplate({
            ...activeTemplate,
            rowCount: activeTemplate.rowCount + 1,
            cells: [...activeTemplate.cells, newRow]
        });
    };

    const addCol = () => {
        if (!activeTemplate) return;
        const newCells = activeTemplate.cells.map(row => {
            return [...row, createEmptyCell(row[0].row, activeTemplate.colCount)];
        });
        setActiveTemplate({
            ...activeTemplate,
            colCount: activeTemplate.colCount + 1,
            cells: newCells
        });
    };

    const mergeCells = () => {
        if (!activeTemplate || selectedCells.length < 2) return;
        const rMin = Math.min(...selectedCells.map(c => c.r));
        const rMax = Math.max(...selectedCells.map(c => c.r));
        const cMin = Math.min(...selectedCells.map(c => c.c));
        const cMax = Math.max(...selectedCells.map(c => c.c));

        const newCells = [...activeTemplate.cells];
        const masterCell = newCells[rMin][cMin];
        masterCell.rowSpan = (rMax - rMin) + 1;
        masterCell.colSpan = (cMax - cMin) + 1;
        masterCell.hidden = false;

        for(let r=rMin; r<=rMax; r++) {
            for(let c=cMin; c<=cMax; c++) {
                if (r === rMin && c === cMin) continue;
                newCells[r][c].hidden = true;
                newCells[r][c].value = '';
                newCells[r][c].key = '';
            }
        }
        setActiveTemplate({ ...activeTemplate, cells: newCells });
        setSelectedCells([{ r: rMin, c: cMin }]);
    };

    const unmergeCells = () => {
        if (!activeTemplate || selectedCells.length === 0) return;
        const target = selectedCells[0];
        const newCells = [...activeTemplate.cells];
        const cell = newCells[target.r][target.c];

        if ((cell.rowSpan || 1) === 1 && (cell.colSpan || 1) === 1) return;
        const rMax = target.r + (cell.rowSpan || 1) - 1;
        const cMax = target.c + (cell.colSpan || 1) - 1;

        cell.rowSpan = 1;
        cell.colSpan = 1;
        for(let r=target.r; r<=rMax; r++) {
            for(let c=target.c; c<=cMax; c++) {
                newCells[r][c].hidden = false;
            }
        }
        setActiveTemplate({ ...activeTemplate, cells: newCells });
    };
    
    // --- BORDER MANAGEMENT ---
    const toggleBorder = (side: 'top' | 'right' | 'bottom' | 'left' | 'all' | 'none') => {
        if (!activeTemplate || selectedCells.length === 0) return;
        const newCells = [...activeTemplate.cells];
        
        selectedCells.forEach(({ r, c }) => {
            const cell = newCells[r][c];
            if (cell.hidden) return;
            
            const currentBorders = cell.borders || { top: false, right: false, bottom: false, left: false };
            let newBorders = { ...currentBorders };
            
            if (side === 'all') {
                newBorders = { top: true, right: true, bottom: true, left: true };
            } else if (side === 'none') {
                newBorders = { top: false, right: false, bottom: false, left: false };
            } else {
                newBorders[side] = !newBorders[side];
            }
            
            newCells[r][c] = { ...cell, borders: newBorders };
        });
        
        setActiveTemplate({ ...activeTemplate, cells: newCells });
    };

    // --- CELL PROPERTY EDITING ---
    const activeCellData = useMemo(() => {
        if (!activeTemplate || selectedCells.length !== 1) return null;
        const { r, c } = selectedCells[0];
        return activeTemplate.cells[r][c];
    }, [activeTemplate, selectedCells]);

    const updateActiveCell = (updates: Partial<GridCell>) => {
        if (!activeTemplate || !activeCellData) return;
        const newCells = [...activeTemplate.cells];
        const { row, col } = activeCellData;
        newCells[row][col] = { ...newCells[row][col], ...updates };
        if (updates.key) {
            newCells[row][col].key = updates.key.toUpperCase().replace(/[^A-Z0-9_]/g, '');
        }
        setActiveTemplate({ ...activeTemplate, cells: newCells });
    };

    const handleDeleteRecord = (id: number) => {
        showConfirmation('Hapus Data Rapor?', 'Data nilai santri ini akan dihapus dari arsip.', async () => {
            await db.raporRecords.delete(id);
            setArchiveRecords(prev => prev.filter(p => p.id !== id));
            showToast('Data rapor dihapus.', 'success');
        }, { confirmColor: 'red' });
    }

    const handlePrintPreview = (santriId: number) => {
        const santri = santriList.find(s => s.id === santriId);
        if (santri) {
            setPreviewSantri(santri);
            setIsPreviewOpen(true);
        }
    }

    const handleGenerate = () => {
        if (!genTemplateId || !genRombelId) {
            showToast('Pilih template dan rombel terlebih dahulu', 'error');
            return;
        }
        
        const tpl = templates.find(t => t.id === genTemplateId);
        if (!tpl) return;

        try {
            const html = generateRaporFormHtml(santriList, settings, {
                rombelId: genRombelId,
                semester: genSemester,
                tahunAjaran: genTahunAjaran,
                template: tpl,
                submissionMethod,
                googleScriptUrl,
                waDestination // Pass the destination number
            });
            
            const blob = new Blob([html], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Form_Nilai_${settings.rombel.find(r=>r.id===genRombelId)?.nama}.html`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast('Formulir berhasil diunduh.', 'success');
        } catch (e) {
            showAlert('Gagal Generate', (e as Error).message);
        }
    };

    const handleProcessImport = async () => {
        if (importSource === 'wa' && !waInput.trim()) return;
        if (importSource === 'cloud' && !cloudScriptUrl.trim()) return;

        setIsProcessing(true);
        try {
            let dataStrings: string[] = [];

            if (importSource === 'wa') {
                const match = waInput.match(/RAPOR_V2_START([\s\S]*?)RAPOR_V2_END/);
                if (!match || !match[1]) throw new Error("Format kode WA tidak valid.");
                dataStrings.push(match[1]);
            } else {
                if (importSource === 'cloud') {
                     const cloudData = await fetchRaporFromCloud(cloudScriptUrl);
                     const jsonString = JSON.stringify(cloudData);
                     const b64 = btoa(unescape(encodeURIComponent(jsonString)));
                     dataStrings.push(b64);
                }
            }

            let totalSuccess = 0;
            let totalErrors: string[] = [];

            for (const str of dataStrings) {
                const { successCount, errors } = await parseRaporDataV2(str, settings);
                totalSuccess += successCount;
                totalErrors = [...totalErrors, ...errors];
            }

            if (totalSuccess > 0) {
                showToast(`Berhasil menyimpan ${totalSuccess} data nilai.`, 'success');
            }
            if (totalErrors.length > 0) {
                showAlert('Beberapa Error Terjadi', totalErrors.join('\n'));
            }
            if (totalSuccess > 0) {
                setWaInput('');
            }

        } catch (e) {
            showAlert('Gagal Memproses Data', (e as Error).message);
        } finally {
            setIsProcessing(false);
        }
    };
    
    // ... (renderDesignPreviewModal and renderPreviewModal unchanged)
    const renderDesignPreviewModal = () => {
        if (!isDesignPreviewOpen || !activeTemplate) return null;
        
        // Helper to simulate data for preview
        const getSimulatedValue = (cell: GridCell) => {
            if (cell.type === 'label') return cell.value;
            if (cell.type === 'input') return <span className="text-blue-400 italic text-[10px] font-mono bg-blue-50 px-1 rounded border border-blue-100">[Input: {cell.key}]</span>;
            if (cell.type === 'formula') return <span className="text-yellow-600 italic text-[10px] font-mono bg-yellow-50 px-1 rounded border border-yellow-100">{cell.value || '[Rumus]'}</span>;
            if (cell.type === 'dropdown') return <span className="text-orange-600 italic text-[10px] font-mono bg-orange-50 px-1 rounded border border-orange-100">[Pilihan: {cell.key}]</span>;
            
            if (cell.type === 'data') {
                const val = cell.value;
                if (val === '$NAMA') return 'Ahmad Fauzan (Contoh)';
                if (val === '$NIS') return '12345678';
                if (val === '$NISN') return '0012345678';
                if (val === '$KELAS') return '1A';
                if (val === '$ROMBEL') return 'Wustho - 1A';
                if (val === '$SEMESTER') return 'Ganjil';
                if (val === '$TAHUN_AJAR') return '2024/2025';
                if (val === '$NAMA_YAYASAN') return settings.namaYayasan || 'Yayasan Contoh';
                if (val === '$NAMA_PONPES') return settings.namaPonpes || 'Ponpes Contoh';
                if (val === '$ALAMAT_PONDOK') return settings.alamat || 'Jl. Contoh No. 1';
                if (val.includes('$MAPEL')) return 'Matematika (Contoh)';
                return val;
            }
            return cell.value;
        }
    
        return (
            <div className="fixed inset-0 bg-black bg-opacity-70 z-[80] flex justify-center items-center p-4">
                <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-[90vh] flex flex-col">
                    <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                        <div>
                            <h3 className="text-lg font-bold text-gray-800">Preview Desain Rapor</h3>
                            <p className="text-xs text-gray-500">Simulasi tampilan cetak dengan data dummy.</p>
                        </div>
                        <button onClick={() => setIsDesignPreviewOpen(false)} className="text-gray-500 hover:text-gray-700"><i className="bi bi-x-lg text-xl"></i></button>
                    </div>
                    <div className="flex-grow overflow-auto bg-gray-200 p-8 flex justify-center">
                        <div className="bg-white shadow-lg p-8" style={{ width: '21cm', minHeight: '29.7cm' }}>
                            <table className="border-collapse w-full">
                                <tbody>
                                    {activeTemplate.cells.map((row, rIdx) => (
                                        <tr key={rIdx}>
                                            {row.map((cell, cIdx) => {
                                                if (cell.hidden) return null;
                                                const borders = cell.borders || { top: true, right: true, bottom: true, left: true }; // Fallback to full borders if undefined in legacy
                                                const borderStyle: React.CSSProperties = {
                                                    borderTop: borders.top ? '1px solid black' : 'none',
                                                    borderRight: borders.right ? '1px solid black' : 'none',
                                                    borderBottom: borders.bottom ? '1px solid black' : 'none',
                                                    borderLeft: borders.left ? '1px solid black' : 'none',
                                                    textAlign: cell.align || 'center',
                                                    width: cell.width ? `${cell.width}px` : 'auto',
                                                    padding: '4px',
                                                    verticalAlign: 'middle',
                                                    fontSize: '11px'
                                                };
                                                
                                                return (
                                                    <td 
                                                        key={`${rIdx}-${cIdx}`} 
                                                        colSpan={cell.colSpan || 1} 
                                                        rowSpan={cell.rowSpan || 1}
                                                        style={borderStyle}
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
                </div>
            </div>
        );
    }

    const renderPreviewModal = () => {
        if (!isPreviewOpen || !previewSantri) return null;
        return (
            <div className="fixed inset-0 bg-black bg-opacity-70 z-[70] flex justify-center items-center p-4">
                <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl h-[90vh] flex flex-col">
                    <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                        <h3 className="text-lg font-bold text-gray-800">Pratinjau Rapor: {previewSantri.namaLengkap}</h3>
                        <div className="flex gap-2">
                             <button onClick={() => printToPdfNative('rapor-preview-container', `Rapor_${previewSantri.namaLengkap}`)} className="bg-gray-700 text-white px-3 py-1.5 rounded text-sm hover:bg-gray-800"><i className="bi bi-printer"></i> Cetak</button>
                             <button onClick={() => setIsPreviewOpen(false)} className="text-gray-500 hover:text-gray-700"><i className="bi bi-x-lg text-xl"></i></button>
                        </div>
                    </div>
                    <div className="flex-grow overflow-auto bg-gray-200 p-8 flex justify-center">
                        <div id="rapor-preview-container" className="printable-content-wrapper bg-white shadow-lg p-8" style={{ width: '21cm', minHeight: '29.7cm', padding: '2cm' }}>
                            <RaporLengkapTemplate 
                                santri={previewSantri} 
                                settings={settings} 
                                options={{ tahunAjaran: filterTahun, semester: filterSemester }} 
                            />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Main Render ...
    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-800">Akademik: Desainer Rapor Grid</h1>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <nav className="flex -mb-px overflow-x-auto border-b">
                    <button onClick={() => setActiveTab('designer')} className={`py-4 px-6 font-medium text-sm border-b-2 transition-colors ${activeTab === 'designer' ? 'border-teal-600 text-teal-600 bg-teal-50' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><i className="bi bi-grid-3x3 mr-2"></i> 1. Desain Grid</button>
                    <button onClick={() => setActiveTab('generator')} className={`py-4 px-6 font-medium text-sm border-b-2 transition-colors ${activeTab === 'generator' ? 'border-teal-600 text-teal-600 bg-teal-50' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><i className="bi bi-file-earmark-code mr-2"></i> 2. Generate Formulir</button>
                    <button onClick={() => setActiveTab('import')} className={`py-4 px-6 font-medium text-sm border-b-2 transition-colors ${activeTab === 'import' ? 'border-teal-600 text-teal-600 bg-teal-50' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><i className="bi bi-box-arrow-in-down mr-2"></i> 3. Import Nilai</button>
                    <button onClick={() => setActiveTab('data')} className={`py-4 px-6 font-medium text-sm border-b-2 transition-colors ${activeTab === 'data' ? 'border-teal-600 text-teal-600 bg-teal-50' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><i className="bi bi-database mr-2"></i> 4. Data Nilai</button>
                    <button onClick={() => setActiveTab('print')} className={`py-4 px-6 font-medium text-sm border-b-2 transition-colors ${activeTab === 'print' ? 'border-teal-600 text-teal-600 bg-teal-50' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><i className="bi bi-printer mr-2"></i> 5. Cetak Rapor</button>
                </nav>

                <div className="p-6">
                    {/* === DESIGNER === */}
                    {activeTab === 'designer' && (
                        !isEditing ? (
                            // LIST VIEW
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <h3 className="font-bold text-gray-700">Daftar Template</h3>
                                    {canWrite && (
                                        <div className="flex gap-2">
                                            <input type="file" ref={fileInputRef} onChange={handleImportExcel} accept=".xlsx, .xls, .ods, .csv" className="hidden" />
                                            <button onClick={() => fileInputRef.current?.click()} className="bg-green-600 text-white px-4 py-2 rounded shadow hover:bg-green-700 text-sm flex items-center gap-2">
                                                <i className="bi bi-file-earmark-spreadsheet"></i> Import Excel/ODS/CSV
                                            </button>
                                            <button onClick={handleCreateTemplate} className="bg-teal-600 text-white px-4 py-2 rounded shadow hover:bg-teal-700 text-sm flex items-center gap-2">
                                                <i className="bi bi-plus-lg"></i> Buat Baru
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {templates.map(tpl => (
                                        <div key={tpl.id} className="border p-4 rounded-lg bg-white shadow-sm hover:shadow-md transition">
                                            <div className="font-bold text-teal-800 text-lg mb-1">{tpl.name}</div>
                                            <div className="text-xs text-gray-500">Dimensi: {tpl.rowCount} Baris x {tpl.colCount} Kolom</div>
                                            <div className="text-xs text-gray-400 mt-2">{new Date(tpl.lastModified).toLocaleDateString()}</div>
                                            {canWrite && <div className="mt-3 flex gap-2 justify-end">
                                                <button onClick={() => handleDuplicateTemplate(tpl.id)} className="bg-green-50 text-green-600 px-3 py-1 rounded text-xs hover:bg-green-100 flex items-center gap-1" title="Duplikasi Template"><i className="bi bi-copy"></i> Copy</button>
                                                <button onClick={() => handleEditTemplate(tpl)} className="bg-blue-50 text-blue-600 px-3 py-1 rounded text-xs hover:bg-blue-100">Edit</button>
                                                <button onClick={() => handleDeleteTemplate(tpl.id)} className="bg-red-50 text-red-600 px-3 py-1 rounded text-xs hover:bg-red-100">Hapus</button>
                                            </div>}
                                        </div>
                                    ))}
                                    {templates.length === 0 && <p className="col-span-3 text-center text-gray-500 italic py-10 border rounded bg-gray-50">Belum ada template. Silakan buat baru atau import dari Excel/ODS/CSV.</p>}
                                </div>
                                
                                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800 mt-4">
                                    <strong className="block mb-1"><i className="bi bi-info-circle-fill"></i> Tips Import Spreadsheet:</strong>
                                    Buat layout rapor di Excel, LibreOffice (ODS), atau CSV. Gunakan kode <code>$NAMA</code>, <code>$NIS</code>, dll untuk data otomatis. Gunakan <code>$KODE_VARIABEL</code> (contoh: <code>$MTK</code>, <code>$PAI</code>) untuk kolom yang perlu diisi nilai oleh guru. Merge cell akan terdeteksi otomatis (kecuali CSV).
                                </div>
                            </div>
                        ) : (
                            // EDITOR VIEW
                            <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-250px)]">
                                {/* LEFT: Grid Area */}
                                <div className="flex-grow flex flex-col bg-gray-100 rounded-lg border overflow-hidden">
                                    {/* Toolbar */}
                                    <div className="bg-white border-b p-2 flex flex-wrap items-center gap-2">
                                        <input 
                                            type="text" 
                                            value={activeTemplate?.name} 
                                            onChange={e => setActiveTemplate(t => t ? {...t, name: e.target.value} : null)} 
                                            className="border rounded px-2 py-1 text-sm font-bold w-48 focus:ring-2 focus:ring-teal-500" 
                                            placeholder="Nama Template"
                                        />
                                        <div className="h-6 w-px bg-gray-300 mx-2"></div>
                                        <button onClick={mergeCells} className="p-1.5 hover:bg-gray-100 rounded text-gray-700" title="Merge Cells"><i className="bi bi-intersect"></i> Merge</button>
                                        <button onClick={unmergeCells} className="p-1.5 hover:bg-gray-100 rounded text-gray-700" title="Unmerge Cells"><i className="bi bi-union"></i> Split</button>
                                        <div className="h-6 w-px bg-gray-300 mx-2"></div>
                                        <button onClick={() => toggleBorder('all')} className="p-1.5 hover:bg-gray-100 rounded text-gray-700" title="All Borders"><i className="bi bi-border-all"></i></button>
                                        <button onClick={() => toggleBorder('none')} className="p-1.5 hover:bg-gray-100 rounded text-gray-700" title="No Borders"><i className="bi bi-border-none"></i></button>
                                        <div className="h-6 w-px bg-gray-300 mx-2"></div>
                                        <button onClick={addRow} className="p-1.5 hover:bg-gray-100 rounded text-gray-700" title="Add Row Bottom"><i className="bi bi-arrow-down-square"></i> +Baris</button>
                                        <button onClick={addCol} className="p-1.5 hover:bg-gray-100 rounded text-gray-700" title="Add Column Right"><i className="bi bi-arrow-right-square"></i> +Kolom</button>
                                        
                                        {/* NEW: Zoom Controls */}
                                        <div className="h-6 w-px bg-gray-300 mx-2"></div>
                                        <div className="flex items-center bg-gray-50 rounded border border-gray-200">
                                            <button onClick={() => setZoomScale(z => Math.max(0.5, z - 0.1))} className="px-2 py-1 hover:bg-gray-200 text-gray-600 rounded-l" title="Zoom Out"><i className="bi bi-dash-lg"></i></button>
                                            <span className="text-xs font-mono w-12 text-center select-none bg-white py-1">{Math.round(zoomScale * 100)}%</span>
                                            <button onClick={() => setZoomScale(z => Math.min(2.0, z + 0.1))} className="px-2 py-1 hover:bg-gray-200 text-gray-600 rounded-r" title="Zoom In"><i className="bi bi-plus-lg"></i></button>
                                        </div>

                                        <div className="flex-grow"></div>
                                        <button onClick={() => setIsDesignPreviewOpen(true)} className="bg-blue-100 text-blue-700 px-3 py-1.5 rounded text-sm font-semibold hover:bg-blue-200 flex items-center gap-2 mr-2"><i className="bi bi-eye"></i> Preview</button>
                                        <button onClick={handleSaveActiveTemplate} className="bg-teal-600 text-white px-4 py-1.5 rounded text-sm font-bold hover:bg-teal-700"><i className="bi bi-save"></i> Simpan</button>
                                        <button onClick={() => setIsEditing(false)} className="bg-gray-200 text-gray-700 px-3 py-1.5 rounded text-sm hover:bg-gray-300">Batal</button>
                                    </div>

                                    {/* The Grid Container */}
                                    <div className="flex-grow overflow-auto p-4 relative bg-gray-200/50" onMouseUp={handleMouseUp} ref={scrollContainerRef}>
                                        <table 
                                            className="border-collapse bg-white shadow-sm select-none origin-top-left transition-transform duration-200 ease-out"
                                            style={{ transform: `scale(${zoomScale})` }}
                                        >
                                            <tbody>
                                                {activeTemplate?.cells.map((row, rIdx) => (
                                                    <tr key={rIdx}>
                                                        {row.map((cell, cIdx) => {
                                                            if (cell.hidden) return null;
                                                            
                                                            const isSelected = selectedCells.some(s => s.r === rIdx && s.c === cIdx);
                                                            const isActive = selectedCells.length === 1 && selectedCells[0].r === rIdx && selectedCells[0].c === cIdx;
                                                            const borders = cell.borders || { top: false, right: false, bottom: false, left: false };
                                                            
                                                            let cellClass = "text-xs p-1 min-w-[80px] h-[30px] relative transition-colors border border-dashed border-gray-200 ";
                                                            
                                                            if (borders.top) cellClass += "!border-t !border-t-black !border-solid ";
                                                            if (borders.right) cellClass += "!border-r !border-r-black !border-solid ";
                                                            if (borders.bottom) cellClass += "!border-b !border-b-black !border-solid ";
                                                            if (borders.left) cellClass += "!border-l !border-l-black !border-solid ";

                                                            if (isSelected) cellClass += "bg-blue-100 ";
                                                            if (isActive) cellClass += "ring-2 ring-blue-500 z-10 ";
                                                            
                                                            if (cell.type === 'input') cellClass += "text-blue-700 font-medium ";
                                                            if (cell.type === 'formula') cellClass += "bg-yellow-50 text-yellow-800 font-mono ";
                                                            if (cell.type === 'label') cellClass += "font-bold text-gray-700 bg-gray-50 ";
                                                            if (cell.type === 'data') cellClass += "text-purple-700 bg-purple-50 ";
                                                            if (cell.type === 'dropdown') cellClass += "text-orange-700 font-medium bg-orange-50 ";

                                                            return (
                                                                <td 
                                                                    key={cell.id}
                                                                    colSpan={cell.colSpan || 1}
                                                                    rowSpan={cell.rowSpan || 1}
                                                                    className={cellClass}
                                                                    onMouseDown={() => handleMouseDown(rIdx, cIdx)}
                                                                    onMouseEnter={() => handleMouseEnter(rIdx, cIdx)}
                                                                    style={{ width: cell.width ? `${cell.width}px` : 'auto', textAlign: cell.align || 'center' }}
                                                                >
                                                                    <div className="w-full h-full flex flex-col items-center justify-center overflow-hidden">
                                                                        <span>{cell.value}</span>
                                                                        {cell.key && <span className="text-[9px] opacity-60 font-normal">${cell.key}</span>}
                                                                    </div>
                                                                </td>
                                                            );
                                                        })}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="bg-gray-50 border-t p-2 text-xs text-gray-500 text-center">
                                        Garis putus-putus abu = Garis Bantu. Garis hitam = Border Cetak. Gunakan toolbar untuk mengatur border.
                                    </div>
                                </div>

                                {/* RIGHT: Properties Panel (ENHANCED) */}
                                <div className="w-full lg:w-80 bg-white border rounded-lg flex flex-col shrink-0">
                                    <div className="p-3 border-b font-bold bg-gray-50 text-gray-700 flex items-center gap-2">
                                        <i className="bi bi-sliders"></i> Properti Sel
                                    </div>
                                    {activeCellData ? (
                                        <div className="p-4 space-y-5 overflow-y-auto">
                                            {/* Border Controls */}
                                            <div className="p-3 bg-gray-50 border rounded">
                                                <label className="block text-xs font-bold text-gray-600 mb-2 uppercase">Border / Garis</label>
                                                <div className="flex justify-center gap-2">
                                                    {/* Top */}
                                                    <button onClick={() => toggleBorder('top')} className={`p-1 rounded ${activeCellData.borders?.top ? 'bg-blue-200 text-blue-800' : 'hover:bg-gray-200'}`} title="Top Border">
                                                        <i className="bi bi-border-top"></i>
                                                    </button>
                                                    {/* Bottom */}
                                                    <button onClick={() => toggleBorder('bottom')} className={`p-1 rounded ${activeCellData.borders?.bottom ? 'bg-blue-200 text-blue-800' : 'hover:bg-gray-200'}`} title="Bottom Border">
                                                        <i className="bi bi-border-bottom"></i>
                                                    </button>
                                                    {/* Left */}
                                                    <button onClick={() => toggleBorder('left')} className={`p-1 rounded ${activeCellData.borders?.left ? 'bg-blue-200 text-blue-800' : 'hover:bg-gray-200'}`} title="Left Border">
                                                        <i className="bi bi-border-left"></i>
                                                    </button>
                                                    {/* Right */}
                                                    <button onClick={() => toggleBorder('right')} className={`p-1 rounded ${activeCellData.borders?.right ? 'bg-blue-200 text-blue-800' : 'hover:bg-gray-200'}`} title="Right Border">
                                                        <i className="bi bi-border-right"></i>
                                                    </button>
                                                </div>
                                                <div className="flex justify-center gap-2 mt-2">
                                                    <button onClick={() => toggleBorder('all')} className="text-xs bg-white border px-2 py-1 rounded hover:bg-gray-100">All</button>
                                                    <button onClick={() => toggleBorder('none')} className="text-xs bg-white border px-2 py-1 rounded hover:bg-gray-100">None</button>
                                                </div>
                                            </div>

                                            {/* Section 1: Type Selection */}
                                            <div>
                                                <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Tipe Data Sel</label>
                                                <select 
                                                    value={activeCellData.type} 
                                                    onChange={e => updateActiveCell({ type: e.target.value as RaporColumnType })}
                                                    className="w-full border rounded p-2 text-sm bg-gray-50 focus:ring-2 focus:ring-teal-500"
                                                >
                                                    <option value="label">Label / Teks Statis</option>
                                                    <option value="data">Data Dinamis (Sistem)</option>
                                                    <option value="input">Input Nilai (Manual)</option>
                                                    <option value="dropdown">Dropdown / Pilihan</option>
                                                    <option value="formula">Formula (Rumus)</option>
                                                </select>
                                                <p className="text-[10px] text-gray-500 mt-1 italic">
                                                    {activeCellData.type === 'label' && "Teks biasa. Contoh: 'Nama:', 'Mata Pelajaran', 'Nilai'."}
                                                    {activeCellData.type === 'data' && "Mengambil data otomatis dari database (Santri, Mapel, Pondok)."}
                                                    {activeCellData.type === 'input' && "Kolom kosong yang akan diisi nilai oleh guru."}
                                                    {activeCellData.type === 'dropdown' && "Pilihan terbatas (Lulus/Tidak, Naik/Tinggal)."}
                                                    {activeCellData.type === 'formula' && "Menghitung nilai otomatis (Rata-rata, Jumlah)."}
                                                </p>
                                            </div>

                                            {/* Section 2: Content Editing based on Type */}
                                            
                                            {/* TYPE: LABEL */}
                                            {activeCellData.type === 'label' && (
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-600 mb-1">Teks Label</label>
                                                    <textarea 
                                                        value={activeCellData.value} 
                                                        onChange={e => updateActiveCell({ value: e.target.value })}
                                                        className="w-full border rounded p-2 text-sm"
                                                        rows={3}
                                                        placeholder="Ketik teks di sini..."
                                                    />
                                                </div>
                                            )}

                                            {/* TYPE: DATA (Comprehensive) */}
                                            {activeCellData.type === 'data' && (
                                                <div className="space-y-3 p-3 bg-purple-50 rounded border border-purple-100">
                                                    <label className="block text-xs font-bold text-purple-800 uppercase">Pilih Data Sistem</label>
                                                    
                                                    {/* Kategori Data */}
                                                    <div>
                                                        <p className="text-[10px] font-bold text-gray-500 mb-1">1. Identitas Santri</p>
                                                        <select className="w-full text-xs border rounded p-1.5 mb-2" onChange={(e) => updateActiveCell({ value: e.target.value })}>
                                                            <option value="">-- Pilih --</option>
                                                            <option value="$NAMA">Nama Lengkap</option>
                                                            <option value="$NIS">Nomor Induk (NIS)</option>
                                                            <option value="$NISN">NISN</option>
                                                            <option value="$KELAS">Kelas</option>
                                                            <option value="$ROMBEL">Rombel</option>
                                                            <option value="$SEMESTER">Semester</option>
                                                            <option value="$TAHUN_AJAR">Tahun Ajaran</option>
                                                        </select>

                                                        <p className="text-[10px] font-bold text-gray-500 mb-1">2. Kop / Identitas Pondok</p>
                                                        <select className="w-full text-xs border rounded p-1.5 mb-2" onChange={(e) => updateActiveCell({ value: e.target.value })}>
                                                            <option value="">-- Pilih --</option>
                                                            <option value="$NAMA_YAYASAN">Nama Yayasan</option>
                                                            <option value="$NAMA_PONPES">Nama Pondok</option>
                                                            <option value="$ALAMAT_PONDOK">Alamat Lengkap</option>
                                                            <option value="$LOGO">Logo Pondok (Gambar)</option>
                                                        </select>

                                                        <p className="text-[10px] font-bold text-gray-500 mb-1">3. Nama Mata Pelajaran</p>
                                                        <select className="w-full text-xs border rounded p-1.5 mb-2" onChange={(e) => updateActiveCell({ value: e.target.value })}>
                                                            <option value="">-- Pilih Mapel --</option>
                                                            {settings.mataPelajaran.map(m => (
                                                                <option key={m.id} value={`$MAPEL_NAME_${m.id}`}>{m.nama}</option>
                                                            ))}
                                                        </select>

                                                        <p className="text-[10px] font-bold text-gray-500 mb-1">4. Tanda Tangan / Guru</p>
                                                        <select className="w-full text-xs border rounded p-1.5" onChange={(e) => updateActiveCell({ value: e.target.value })}>
                                                            <option value="">-- Pilih --</option>
                                                            <option value="$WALI_KELAS">Nama Wali Kelas</option>
                                                            <option value="$MUDIR">Nama Mudir</option>
                                                        </select>
                                                    </div>
                                                    <div className="mt-2">
                                                        <label className="block text-[10px] font-bold text-purple-800">Preview Kode:</label>
                                                        <input type="text" readOnly value={activeCellData.value} className="w-full bg-white border rounded px-2 py-1 text-xs font-mono text-gray-600"/>
                                                    </div>
                                                </div>
                                            )}

                                            {/* TYPE: INPUT OR DROPDOWN (Variable Key) */}
                                            {(activeCellData.type === 'input' || activeCellData.type === 'dropdown') && (
                                                <div className={`p-3 rounded border ${activeCellData.type === 'dropdown' ? 'bg-orange-50 border-orange-200' : 'bg-blue-50 border-blue-200'}`}>
                                                    <label className={`block text-xs font-bold mb-1 ${activeCellData.type === 'dropdown' ? 'text-orange-700' : 'text-blue-700'}`}>KODE VARIABEL ($)</label>
                                                    <input 
                                                        type="text" 
                                                        value={activeCellData.key || ''} 
                                                        onChange={e => updateActiveCell({ key: e.target.value })}
                                                        className="w-full border rounded p-2 text-sm font-mono uppercase"
                                                        placeholder="CONTOH: UH1_MTK"
                                                    />
                                                    <p className={`text-[10px] mt-2 ${activeCellData.type === 'dropdown' ? 'text-orange-600' : 'text-blue-600'}`}>
                                                        <strong>PENTING:</strong> Kode ini adalah nama variabel unik untuk kolom ini.
                                                    </p>

                                                    {activeCellData.type === 'dropdown' && (
                                                        <div className="mt-4 border-t border-orange-200 pt-2">
                                                            <label className="block text-xs font-bold text-orange-700 mb-1">OPSI PILIHAN (Dropdown)</label>
                                                            <textarea 
                                                                value={activeCellData.options?.join('\n') || ''} 
                                                                onChange={e => updateActiveCell({ options: e.target.value.split(/[\n,]/).map(s => s.trim()).filter(s => s) })}
                                                                className="w-full border rounded p-2 text-sm"
                                                                rows={4}
                                                                placeholder="Naik Kelas, Tinggal Kelas (Pisahkan dengan baris baru atau koma)"
                                                            />
                                                            <p className="text-[10px] text-gray-500 mt-1">Masukkan pilihan yang akan muncul di dropdown.</p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* TYPE: FORMULA */}
                                            {activeCellData.type === 'formula' && (
                                                <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
                                                    <label className="block text-xs font-bold text-yellow-700 mb-1">Rumus Excel</label>
                                                    <input 
                                                        type="text" 
                                                        value={activeCellData.value} 
                                                        onChange={e => updateActiveCell({ value: e.target.value })}
                                                        className="w-full border rounded p-2 text-sm font-mono bg-white"
                                                        placeholder="= RATA2($UH1, $UH2)"
                                                    />
                                                    <p className="text-[10px] text-yellow-700 mt-2 space-y-1">
                                                        <strong>Fungsi Tersedia:</strong> <br/>
                                                        <code>RATA2($VAR1, ...)</code>: Rata-rata. <br/>
                                                        <code>SUM($VAR1, ...)</code>: Jumlah. <br/>
                                                        <code>IF(Kondisi, Benar, Salah)</code>: Logika. <br/>
                                                        <code>AND(Kondisi1, Kondisi2)</code>: Logika Dan. <br/>
                                                        <code>OR(Kondisi1, Kondisi2)</code>: Logika Atau. <br/>
                                                        <code>RANK($VAR, [limit])</code>: Peringkat. <br/>
                                                    </p>

                                                    {/* Helper Buttons for Formula */}
                                                    <div className="flex flex-wrap gap-1 mt-2 mb-2">
                                                        <button onClick={() => updateActiveCell({ value: (activeCellData.value || '') + 'IF(' })} className="px-2 py-1 bg-white border rounded text-[10px] hover:bg-yellow-100">IF</button>
                                                        <button onClick={() => updateActiveCell({ value: (activeCellData.value || '') + 'AND(' })} className="px-2 py-1 bg-white border rounded text-[10px] hover:bg-yellow-100">AND</button>
                                                        <button onClick={() => updateActiveCell({ value: (activeCellData.value || '') + 'OR(' })} className="px-2 py-1 bg-white border rounded text-[10px] hover:bg-yellow-100">OR</button>
                                                        <button onClick={() => updateActiveCell({ value: (activeCellData.value || '') + 'RANK(' })} className="px-2 py-1 bg-white border rounded text-[10px] hover:bg-yellow-100">RANK</button>
                                                        <button onClick={() => updateActiveCell({ value: (activeCellData.value || '') + 'RATA2(' })} className="px-2 py-1 bg-white border rounded text-[10px] hover:bg-yellow-100">RATA2</button>
                                                        <button onClick={() => updateActiveCell({ value: (activeCellData.value || '') + 'SUM(' })} className="px-2 py-1 bg-white border rounded text-[10px] hover:bg-yellow-100">SUM</button>
                                                    </div>
                                                    
                                                    {/* Variable Helper */}
                                                    <div className="mt-2 border-t border-yellow-200 pt-2">
                                                        <p className="text-[10px] font-bold text-gray-500 mb-1 uppercase">Variabel Input Tersedia:</p>
                                                        <div className="flex flex-wrap gap-1">
                                                            {availableVars.length > 0 ? availableVars.map(v => (
                                                                <button 
                                                                    key={v}
                                                                    onClick={() => updateActiveCell({ value: (activeCellData.value || '') + '$' + v })}
                                                                    className="px-2 py-1 bg-white border border-gray-300 rounded text-[10px] hover:bg-blue-50 hover:border-blue-300 text-gray-700 font-mono transition-colors"
                                                                    title="Klik untuk tambah ke rumus"
                                                                >
                                                                    ${v}
                                                                </button>
                                                            )) : <span className="text-[10px] text-gray-400 italic">Belum ada kolom input dengan KODE VARIABEL.</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="grid grid-cols-2 gap-3 pt-3 border-t">
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-500 mb-1">Lebar (px)</label>
                                                    <input type="number" value={activeCellData.width || ''} onChange={e => updateActiveCell({ width: parseInt(e.target.value) })} className="w-full border rounded p-2 text-sm"/>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-500 mb-1">Perataan</label>
                                                    <select value={activeCellData.align || 'center'} onChange={e => updateActiveCell({ align: e.target.value as any })} className="w-full border rounded p-2 text-sm">
                                                        <option value="left">Kiri</option>
                                                        <option value="center">Tengah</option>
                                                        <option value="right">Kanan</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="p-8 text-center text-gray-400 text-sm flex flex-col items-center justify-center h-full opacity-60">
                                            <i className="bi bi-mouse text-3xl mb-2"></i>
                                            <p>Klik salah satu sel di tabel kiri untuk mengedit properti.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    )}

                    {/* === GENERATOR === */}
                    {activeTab === 'generator' && (
                        <div className="max-w-3xl mx-auto space-y-6">
                            <div className="bg-teal-50 border border-teal-100 p-4 rounded-lg flex gap-3">
                                <i className="bi bi-1-circle-fill text-teal-600 text-xl"></i>
                                <div><h4 className="font-bold text-teal-800">Pilih Template</h4><select value={genTemplateId} onChange={e => setGenTemplateId(e.target.value)} className="mt-2 w-full border border-teal-300 rounded p-2"><option value="">-- Pilih Template --</option>{templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
                            </div>
                            <div className="bg-white border p-4 rounded-lg">
                                <h4 className="font-bold text-gray-700 mb-4 flex items-center gap-2"><i className="bi bi-2-circle-fill text-gray-400"></i> Target Kelas</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div><label className="block text-xs font-bold mb-1">Jenjang</label><select value={genJenjangId} onChange={e => {setGenJenjangId(Number(e.target.value)); setGenKelasId(0); setGenRombelId(0)}} className="w-full border rounded p-2 text-sm"><option value={0}>Pilih...</option>{settings.jenjang.map(j => <option key={j.id} value={j.id}>{j.nama}</option>)}</select></div>
                                    <div><label className="block text-xs font-bold mb-1">Kelas</label><select value={genKelasId} onChange={e => {setGenKelasId(Number(e.target.value)); setGenRombelId(0)}} disabled={!genJenjangId} className="w-full border rounded p-2 text-sm disabled:bg-gray-100"><option value={0}>Pilih...</option>{availableKelas.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}</select></div>
                                    <div><label className="block text-xs font-bold mb-1">Rombel</label><select value={genRombelId} onChange={e => setGenRombelId(Number(e.target.value))} disabled={!genKelasId} className="w-full border rounded p-2 text-sm disabled:bg-gray-100"><option value={0}>Pilih...</option>{availableRombel.map(r => <option key={r.id} value={r.id}>{r.nama}</option>)}</select></div>
                                </div>
                                <div className="grid grid-cols-2 gap-4 mt-4">
                                    <div><label className="block text-xs font-bold mb-1">Tahun Ajaran</label><input type="text" value={genTahunAjaran} onChange={e => setGenTahunAjaran(e.target.value)} className="w-full border rounded p-2 text-sm" /></div>
                                    <div><label className="block text-xs font-bold mb-1">Semester</label><select value={genSemester} onChange={e => setGenSemester(e.target.value as any)} className="w-full border rounded p-2 text-sm"><option value="Ganjil">Ganjil</option><option value="Genap">Genap</option></select></div>
                                </div>
                            </div>

                            {/* Submission Method Configuration */}
                            <div className="bg-white border p-4 rounded-lg">
                                <h4 className="font-bold text-gray-700 mb-4 flex items-center gap-2"><i className="bi bi-3-circle-fill text-gray-400"></i> Metode Pengiriman</h4>
                                <div className="space-y-3">
                                    <div className="flex flex-col md:flex-row gap-2">
                                        <button 
                                            onClick={() => setSubmissionMethod('whatsapp')}
                                            className={`flex-1 py-2 px-3 rounded border text-center text-xs font-semibold flex items-center justify-center gap-2 ${submissionMethod === 'whatsapp' ? 'bg-green-100 border-green-500 text-green-800' : 'bg-white border-gray-300 text-gray-600'}`}
                                        >
                                            <i className="bi bi-whatsapp"></i> WhatsApp
                                        </button>
                                        <button 
                                            onClick={() => setSubmissionMethod('google_sheet')}
                                            className={`flex-1 py-2 px-3 rounded border text-center text-xs font-semibold flex items-center justify-center gap-2 ${submissionMethod === 'google_sheet' ? 'bg-blue-100 border-blue-500 text-blue-800' : 'bg-white border-gray-300 text-gray-600'}`}
                                        >
                                            <i className="bi bi-file-earmark-spreadsheet"></i> Google Sheet
                                        </button>
                                        <button 
                                            onClick={() => setSubmissionMethod('hybrid')}
                                            className={`flex-1 py-2 px-3 rounded border text-center text-xs font-semibold flex items-center justify-center gap-2 ${submissionMethod === 'hybrid' ? 'bg-teal-100 border-teal-500 text-teal-800' : 'bg-white border-gray-300 text-gray-600'}`}
                                        >
                                            <i className="bi bi-hdd-network"></i> Hybrid (WA+Cloud)
                                        </button>
                                    </div>
                                    <p className="text-xs text-gray-500 italic">
                                        {submissionMethod === 'whatsapp' && "Guru akan mengirim data nilai langsung ke WhatsApp Admin (Text Base)."}
                                        {submissionMethod === 'google_sheet' && "Guru akan mengirim data nilai langsung ke Spreadsheet Anda via Web App."}
                                        {submissionMethod === 'hybrid' && "Data dikirim ke Spreadsheet, lalu WhatsApp Admin akan terbuka berisi kode backup data."}
                                    </p>

                                    {/* WA Destination Input */}
                                    {(submissionMethod === 'whatsapp' || submissionMethod === 'hybrid') && (
                                        <div className="mt-2 p-3 bg-green-50 border border-green-100 rounded-lg">
                                            <label className="block text-xs font-bold text-green-800 mb-1">Nomor WA Admin / Wali Kelas</label>
                                            <input 
                                                type="text" 
                                                value={waDestination} 
                                                onChange={e => setWaDestination(e.target.value)}
                                                placeholder="628xxxxxxxxxx (kosongkan untuk buka kontak)" 
                                                className="w-full border rounded p-1.5 text-xs font-mono"
                                            />
                                            <p className="text-[10px] text-green-600 mt-1">Data nilai akan dikirim ke nomor ini.</p>
                                        </div>
                                    )}

                                    {(submissionMethod === 'google_sheet' || submissionMethod === 'hybrid') && (
                                        <div className="mt-2 p-3 bg-gray-50 border rounded-lg">
                                            <label className="block text-xs font-bold text-gray-700 mb-1">Web App URL (Google Apps Script)</label>
                                            <input 
                                                type="text" 
                                                value={googleScriptUrl} 
                                                onChange={e => setGoogleScriptUrl(e.target.value)}
                                                placeholder="https://script.google.com/macros/s/..." 
                                                className="w-full border rounded p-1.5 text-xs font-mono"
                                            />
                                            <button 
                                                onClick={() => setShowScriptHelper(!showScriptHelper)}
                                                className="text-xs text-blue-600 underline mt-2 block"
                                            >
                                                {showScriptHelper ? 'Sembunyikan Panduan Script' : 'Lihat Kode Google Apps Script'}
                                            </button>
                                            
                                            {showScriptHelper && (
                                                <div className="mt-2 text-xs text-gray-600 bg-white p-2 border rounded">
                                                    <p className="mb-1">Salin kode ini ke Google Apps Script editor Anda, lalu Deploy sebagai Web App (Exec: Me, Access: Anyone).</p>
                                                    <div className="relative">
                                                        <textarea readOnly className="w-full h-32 text-[10px] font-mono border rounded p-1 bg-gray-100" value={GOOGLE_SCRIPT_TEMPLATE}></textarea>
                                                        <button 
                                                            onClick={() => {navigator.clipboard.writeText(GOOGLE_SCRIPT_TEMPLATE); showToast('Kode disalin!', 'success')}}
                                                            className="absolute top-1 right-1 bg-gray-200 hover:bg-gray-300 p-1 rounded text-xs" title="Salin Kode"
                                                        >
                                                            <i className="bi bi-clipboard"></i>
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <button onClick={handleGenerate} disabled={!genTemplateId || !genRombelId} className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold shadow-lg hover:bg-blue-700 disabled:bg-gray-300 flex items-center justify-center gap-2"><i className="bi bi-download"></i> Download Formulir HTML</button>
                        </div>
                    )}
                    
                    {/* ... (rest of render code) ... */}
                    {activeTab === 'import' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <h3 className="font-bold text-gray-800">Impor Data Nilai</h3>
                                
                                {/* Source Selection */}
                                <div className="flex gap-2">
                                    <button onClick={() => setImportSource('wa')} className={`flex-1 py-2 rounded text-sm font-medium border ${importSource === 'wa' ? 'bg-green-50 border-green-500 text-green-700' : 'bg-white border-gray-300 text-gray-600'}`}>
                                        <i className="bi bi-whatsapp"></i> Via WhatsApp
                                    </button>
                                    <button onClick={() => setImportSource('cloud')} className={`flex-1 py-2 rounded text-sm font-medium border ${importSource === 'cloud' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-gray-300 text-gray-600'}`}>
                                        <i className="bi bi-cloud-arrow-down"></i> Via Google Cloud
                                    </button>
                                </div>

                                {importSource === 'wa' ? (
                                    <textarea 
                                        value={waInput} 
                                        onChange={e => setWaInput(e.target.value)} 
                                        className="w-full h-48 border rounded-lg p-3 font-mono text-xs bg-gray-50 focus:ring-2 focus:ring-teal-500 outline-none" 
                                        placeholder="Paste kode RAPOR_V2_START dari WA..."
                                    ></textarea>
                                ) : (
                                    <div className="space-y-2">
                                        <label className="block text-xs font-bold text-gray-700">URL Web App (Google Script)</label>
                                        <input 
                                            type="text" 
                                            value={cloudScriptUrl} 
                                            onChange={e => setCloudScriptUrl(e.target.value)}
                                            placeholder="https://script.google.com/macros/s/..." 
                                            className="w-full border rounded p-2 text-xs font-mono"
                                        />
                                        <p className="text-[10px] text-gray-500">Pastikan script yang digunakan mendukung fungsi <code>doGet</code> (Lihat panduan di tab Generator).</p>
                                    </div>
                                )}

                                <button onClick={handleProcessImport} disabled={isProcessing || (!waInput.trim() && !cloudScriptUrl.trim()) || !canWrite} className="w-full bg-teal-600 text-white py-3 rounded-lg hover:bg-teal-700 disabled:bg-gray-300 font-bold shadow-md flex items-center justify-center gap-2">
                                    {isProcessing ? <><span className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent"></span> Memproses...</> : 'Proses & Simpan'}
                                </button>
                            </div>

                            <div className="flex flex-col items-center justify-center text-center p-8 text-gray-500 border-2 border-dashed rounded-xl bg-gray-50">
                                <i className="bi bi-database-check text-5xl mb-4 text-gray-300"></i>
                                <h4 className="font-bold text-gray-700">Data Tersimpan?</h4>
                                <p className="text-sm mt-2 max-w-xs">Data nilai yang berhasil diimpor akan masuk ke database <strong>Data Nilai</strong>. Gunakan tab <strong>Cetak Rapor</strong> untuk mencetak hasilnya.</p>
                            </div>
                        </div>
                    )}
                    {/* ... data and print tabs ... */}
                    {activeTab === 'data' && (
                        <div className="space-y-6">
                            <div className="bg-yellow-50 p-4 border-l-4 border-yellow-500 text-yellow-800 rounded-r-lg mb-4 text-sm">
                                <i className="bi bi-exclamation-circle-fill mr-2"></i>
                                Halaman ini khusus untuk <strong>Manajemen Data Mentah (Arsip)</strong>. Gunakan tab <strong>"5. Cetak Rapor"</strong> untuk mencetak rapor siswa.
                            </div>

                            {/* Filter Bar */}
                            <div className="bg-white p-4 rounded-lg border border-gray-200 flex flex-wrap gap-4 items-end">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Tahun Ajaran</label>
                                    <input type="text" value={filterTahun} onChange={e => setFilterTahun(e.target.value)} className="border rounded p-2 text-sm w-32" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Semester</label>
                                    <select value={filterSemester} onChange={e => setFilterSemester(e.target.value as any)} className="border rounded p-2 text-sm w-32">
                                        <option value="Ganjil">Ganjil</option><option value="Genap">Genap</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Rombel</label>
                                    <select value={filterRombel} onChange={e => setFilterRombel(e.target.value)} className="border rounded p-2 text-sm w-48">
                                        <option value="">Semua Rombel</option>
                                        {settings.rombel.map(r => <option key={r.id} value={r.id}>{r.nama}</option>)}
                                    </select>
                                </div>
                                <div className="ml-auto flex items-center">
                                    <span className="text-sm text-gray-500 italic mr-2">Total Data: {archiveRecords.length}</span>
                                </div>
                            </div>

                            {/* Data Table */}
                            <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 text-gray-600 border-b">
                                        <tr>
                                            <th className="p-3 w-10">No</th>
                                            <th className="p-3">Nama Santri</th>
                                            <th className="p-3">Rombel</th>
                                            <th className="p-3 text-center">Waktu Import</th>
                                            <th className="p-3 text-center">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {archiveRecords.length > 0 ? (
                                            archiveRecords.map((rec, idx) => {
                                                const santri = santriList.find(s => s.id === rec.santriId);
                                                const rombelName = settings.rombel.find(r => r.id === rec.rombelId)?.nama || '-';
                                                return (
                                                    <tr key={rec.id} className="hover:bg-gray-50">
                                                        <td className="p-3 text-center">{idx + 1}</td>
                                                        <td className="p-3 font-medium">{santri ? santri.namaLengkap : `Unknown (ID: ${rec.santriId})`}</td>
                                                        <td className="p-3">{rombelName}</td>
                                                        <td className="p-3 text-center text-xs text-gray-500">{new Date(rec.tanggalRapor).toLocaleString()}</td>
                                                        <td className="p-3 text-center flex justify-center gap-2">
                                                            {canWrite && <button onClick={() => handleDeleteRecord(rec.id)} className="text-red-600 hover:bg-red-50 p-1.5 rounded flex items-center gap-1 text-xs font-bold border border-red-200" title="Hapus Data"><i className="bi bi-trash"></i> Hapus</button>}
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        ) : (
                                            <tr><td colSpan={5} className="p-8 text-center text-gray-400">Belum ada data rapor untuk periode ini.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* === PRINT RAPOR (NEW TAB) === */}
                    {activeTab === 'print' && (
                        <div className="space-y-6">
                            <div className="bg-white p-6 rounded-lg shadow-md">
                                <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Pilih Rombel & Siswa</h3>
                                
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1">Tahun Ajaran</label>
                                        <input type="text" value={filterTahun} onChange={e => setFilterTahun(e.target.value)} className="w-full border rounded p-2 text-sm bg-gray-50" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1">Semester</label>
                                        <select value={filterSemester} onChange={e => setFilterSemester(e.target.value as any)} className="w-full border rounded p-2 text-sm bg-gray-50">
                                            <option value="Ganjil">Ganjil</option><option value="Genap">Genap</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1">Pilih Rombel (Wajib)</label>
                                        <select value={printRombel} onChange={e => setPrintRombel(e.target.value)} className="w-full border rounded p-2 text-sm bg-yellow-50 focus:ring-2 focus:ring-yellow-400">
                                            <option value="">-- Pilih Rombel --</option>
                                            {settings.rombel.map(r => <option key={r.id} value={r.id}>{r.nama}</option>)}
                                        </select>
                                    </div>
                                </div>

                                {printRombel ? (
                                    <div className="border rounded-lg overflow-hidden">
                                        <div className="bg-gray-100 px-4 py-2 text-xs font-bold text-gray-600 uppercase flex justify-between">
                                            <span>Daftar Siswa</span>
                                            <span>Status Data Nilai</span>
                                        </div>
                                        <div className="divide-y max-h-[500px] overflow-y-auto">
                                            {santriList
                                                .filter(s => s.rombelId === parseInt(printRombel) && s.status === 'Aktif')
                                                .sort((a,b) => a.namaLengkap.localeCompare(b.namaLengkap))
                                                .map((santri, idx) => {
                                                    const hasData = archiveRecords.some(r => r.santriId === santri.id);
                                                    return (
                                                        <div key={santri.id} className="flex justify-between items-center p-3 hover:bg-gray-50">
                                                            <div className="flex items-center gap-3">
                                                                <span className="w-6 h-6 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-xs font-bold">{idx + 1}</span>
                                                                <div>
                                                                    <div className="font-medium text-sm text-gray-800">{santri.namaLengkap}</div>
                                                                    <div className="text-xs text-gray-500">{santri.nis}</div>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-4">
                                                                {hasData ? (
                                                                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold">Data Tersedia</span>
                                                                ) : (
                                                                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full">Belum Ada Data</span>
                                                                )}
                                                                
                                                                <button 
                                                                    onClick={() => handlePrintPreview(santri.id)} 
                                                                    disabled={!hasData}
                                                                    className="px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed bg-blue-600 text-white hover:bg-blue-700"
                                                                >
                                                                    <i className="bi bi-printer"></i> Cetak
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            }
                                            {santriList.filter(s => s.rombelId === parseInt(printRombel)).length === 0 && (
                                                <div className="p-8 text-center text-gray-500 italic">Tidak ada santri aktif di rombel ini.</div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-8 text-center bg-gray-50 rounded border border-dashed border-gray-300 text-gray-500">
                                        <i className="bi bi-arrow-up-circle text-2xl mb-2 block"></i>
                                        Silakan pilih Rombel terlebih dahulu untuk menampilkan daftar siswa.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
            {renderPreviewModal()}
            {renderDesignPreviewModal()}
        </div>
    );
};

export default Akademik;
