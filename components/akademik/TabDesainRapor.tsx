
import React, { useState, useMemo, useRef } from 'react';
import { useAppContext } from '../../AppContext';
import { RaporTemplate, GridCell, RaporColumnType } from '../../types';
import * as XLSX from 'xlsx';

export const TabDesainRapor: React.FC = () => {
    const { settings, onSaveSettings, showToast, showConfirmation, showAlert, currentUser } = useAppContext();
    const canWrite = currentUser?.role === 'admin' || currentUser?.permissions?.akademik === 'write';

    const [templates, setTemplates] = useState<RaporTemplate[]>(settings.raporTemplates || []);
    const [activeTemplate, setActiveTemplate] = useState<RaporTemplate | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    
    // Grid Selection & Zoom & Preview State
    const [selectedCells, setSelectedCells] = useState<{r: number, c: number}[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState<{r: number, c: number} | null>(null);
    const [zoomScale, setZoomScale] = useState(1);
    const [isDesignPreviewOpen, setIsDesignPreviewOpen] = useState(false);

    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- HELPER FUNCTIONS ---
    const createEmptyCell = (r: number, c: number): GridCell => ({
        id: `cell_${Date.now()}_${r}_${c}_${Math.random()}`,
        row: r, col: c, value: '', type: 'label', colSpan: 1, rowSpan: 1, width: 100,
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
        setZoomScale(1);
    };

    const handleEditTemplate = (tpl: RaporTemplate) => {
        setActiveTemplate(JSON.parse(JSON.stringify(tpl)));
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

    const handleSaveActiveTemplate = () => {
        if (!activeTemplate || !activeTemplate.name.trim()) {
            showToast('Nama template wajib diisi.', 'error');
            return;
        }
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

    // --- IMPORT EXCEL ---
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
                const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1');
                const rowCount = range.e.r + 1;
                const colCount = range.e.c + 1;
                if (rowCount > 100 || colCount > 30) throw new Error("File terlalu besar. Maksimum 100 baris x 30 kolom.");
                
                const newCells: GridCell[][] = [];
                for (let r = 0; r < rowCount; r++) {
                    const row: GridCell[] = [];
                    for (let c = 0; c < colCount; c++) row.push(createEmptyCell(r, c));
                    newCells.push(row);
                }
                const systemKeys = ['$NAMA', '$NIS', '$NISN', '$KELAS', '$ROMBEL', '$SEMESTER', '$TAHUN_AJAR', '$NAMA_YAYASAN', '$NAMA_PONPES', '$ALAMAT_PONDOK', '$LOGO', '$WALI_KELAS', '$MUDIR'];

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
                                if (systemKeys.includes(valStr) || valStr.startsWith('$MAPEL_NAME')) {
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
                const cleanName = file.name.replace(/\.(xlsx|xls|ods|csv)$/i, '');
                const newTemplate: RaporTemplate = {
                    id: 'tpl_' + Date.now(), name: `Import_${cleanName}`, rowCount, colCount, cells: newCells, lastModified: new Date().toISOString()
                };
                setActiveTemplate(newTemplate); setIsEditing(true); setZoomScale(1);
                showToast(`Import Berhasil!`, 'success');
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

    const addRow = () => { if (!activeTemplate) return; const newRow = []; for(let c=0; c<activeTemplate.colCount; c++) newRow.push(createEmptyCell(activeTemplate.rowCount, c)); setActiveTemplate({ ...activeTemplate, rowCount: activeTemplate.rowCount + 1, cells: [...activeTemplate.cells, newRow] }); };
    const addCol = () => { if (!activeTemplate) return; const newCells = activeTemplate.cells.map(row => [...row, createEmptyCell(row[0].row, activeTemplate.colCount)]); setActiveTemplate({ ...activeTemplate, colCount: activeTemplate.colCount + 1, cells: newCells }); };

    const mergeCells = () => {
        if (!activeTemplate || selectedCells.length < 2) return;
        const rMin = Math.min(...selectedCells.map(c => c.r)); const rMax = Math.max(...selectedCells.map(c => c.r));
        const cMin = Math.min(...selectedCells.map(c => c.c)); const cMax = Math.max(...selectedCells.map(c => c.c));
        const newCells = [...activeTemplate.cells];
        const masterCell = newCells[rMin][cMin];
        masterCell.rowSpan = (rMax - rMin) + 1; masterCell.colSpan = (cMax - cMin) + 1; masterCell.hidden = false;
        for(let r=rMin; r<=rMax; r++) for(let c=cMin; c<=cMax; c++) { if (r === rMin && c === cMin) continue; newCells[r][c].hidden = true; newCells[r][c].value = ''; newCells[r][c].key = ''; }
        setActiveTemplate({ ...activeTemplate, cells: newCells }); setSelectedCells([{ r: rMin, c: cMin }]);
    };

    const unmergeCells = () => {
        if (!activeTemplate || selectedCells.length === 0) return;
        const target = selectedCells[0]; const newCells = [...activeTemplate.cells]; const cell = newCells[target.r][target.c];
        if ((cell.rowSpan || 1) === 1 && (cell.colSpan || 1) === 1) return;
        const rMax = target.r + (cell.rowSpan || 1) - 1; const cMax = target.c + (cell.colSpan || 1) - 1;
        cell.rowSpan = 1; cell.colSpan = 1;
        for(let r=target.r; r<=rMax; r++) for(let c=target.c; c<=cMax; c++) newCells[r][c].hidden = false;
        setActiveTemplate({ ...activeTemplate, cells: newCells });
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
        setActiveTemplate({ ...activeTemplate, cells: newCells });
    };

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
        if (updates.key) newCells[row][col].key = updates.key.toUpperCase().replace(/[^A-Z0-9_]/g, '');
        setActiveTemplate({ ...activeTemplate, cells: newCells });
    };

    const getSimulatedValue = (cell: GridCell) => {
        if (cell.type === 'label') return cell.value;
        if (cell.type === 'input') return <span className="text-blue-400 italic text-[10px] font-mono bg-blue-50 px-1 rounded border border-blue-100">[Input: {cell.key}]</span>;
        if (cell.type === 'formula') return <span className="text-yellow-600 italic text-[10px] font-mono bg-yellow-50 px-1 rounded border border-yellow-100">{cell.value || '[Rumus]'}</span>;
        if (cell.type === 'dropdown') return <span className="text-orange-600 italic text-[10px] font-mono bg-orange-50 px-1 rounded border border-orange-100">[Pilihan: {cell.key}]</span>;
        if (cell.type === 'data') {
            const val = cell.value;
            if (val === '$NAMA') return 'Ahmad Fauzan (Contoh)';
            if (val === '$NIS') return '12345678';
            if (val.includes('$MAPEL')) return 'Matematika (Contoh)';
            return val;
        }
        return cell.value;
    }

    if (!isEditing) {
        return (
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
        <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-250px)]">
             <div className="flex-grow flex flex-col bg-gray-100 rounded-lg border overflow-hidden">
                <div className="bg-white border-b p-2 flex flex-wrap items-center gap-2">
                    <input type="text" value={activeTemplate?.name} onChange={e => setActiveTemplate(t => t ? {...t, name: e.target.value} : null)} className="border rounded px-2 py-1 text-sm font-bold w-48 focus:ring-2 focus:ring-teal-500" placeholder="Nama Template" />
                    <div className="h-6 w-px bg-gray-300 mx-2"></div>
                    <button onClick={mergeCells} className="p-1.5 hover:bg-gray-100 rounded text-gray-700" title="Merge Cells"><i className="bi bi-intersect"></i></button>
                    <button onClick={unmergeCells} className="p-1.5 hover:bg-gray-100 rounded text-gray-700" title="Unmerge Cells"><i className="bi bi-union"></i></button>
                    <div className="h-6 w-px bg-gray-300 mx-2"></div>
                    <button onClick={() => toggleBorder('all')} className="p-1.5 hover:bg-gray-100 rounded text-gray-700"><i className="bi bi-border-all"></i></button>
                    <button onClick={() => toggleBorder('none')} className="p-1.5 hover:bg-gray-100 rounded text-gray-700"><i className="bi bi-border-none"></i></button>
                    <div className="h-6 w-px bg-gray-300 mx-2"></div>
                    <button onClick={addRow} className="p-1.5 hover:bg-gray-100 rounded text-gray-700"><i className="bi bi-arrow-down-square"></i></button>
                    <button onClick={addCol} className="p-1.5 hover:bg-gray-100 rounded text-gray-700"><i className="bi bi-arrow-right-square"></i></button>
                    
                    <div className="h-6 w-px bg-gray-300 mx-2"></div>
                    <div className="flex items-center bg-gray-50 rounded border border-gray-200">
                        <button onClick={() => setZoomScale(z => Math.max(0.5, z - 0.1))} className="px-2 py-1 hover:bg-gray-200 text-gray-600 rounded-l"><i className="bi bi-dash-lg"></i></button>
                        <span className="text-xs font-mono w-12 text-center select-none bg-white py-1">{Math.round(zoomScale * 100)}%</span>
                        <button onClick={() => setZoomScale(z => Math.min(2.0, z + 0.1))} className="px-2 py-1 hover:bg-gray-200 text-gray-600 rounded-r"><i className="bi bi-plus-lg"></i></button>
                    </div>

                    <div className="flex-grow"></div>
                    <button onClick={() => setIsDesignPreviewOpen(true)} className="bg-blue-100 text-blue-700 px-3 py-1.5 rounded text-sm font-semibold hover:bg-blue-200 flex items-center gap-2 mr-2"><i className="bi bi-eye"></i> Preview</button>
                    <button onClick={handleSaveActiveTemplate} className="bg-teal-600 text-white px-4 py-1.5 rounded text-sm font-bold hover:bg-teal-700"><i className="bi bi-save"></i> Simpan</button>
                    <button onClick={() => setIsEditing(false)} className="bg-gray-200 text-gray-700 px-3 py-1.5 rounded text-sm hover:bg-gray-300">Batal</button>
                </div>
                <div className="flex-grow overflow-auto p-4 relative bg-gray-200/50" onMouseUp={handleMouseUp} ref={scrollContainerRef}>
                    <table className="border-collapse bg-white shadow-sm select-none origin-top-left transition-transform duration-200 ease-out" style={{ transform: `scale(${zoomScale})` }}>
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
                                        
                                        return (
                                            <td key={cell.id} colSpan={cell.colSpan || 1} rowSpan={cell.rowSpan || 1} className={cellClass} onMouseDown={() => handleMouseDown(rIdx, cIdx)} onMouseEnter={() => handleMouseEnter(rIdx, cIdx)} style={{ width: cell.width ? `${cell.width}px` : 'auto', textAlign: cell.align || 'center' }}>
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
            </div>
             <div className="w-full lg:w-80 bg-white border rounded-lg flex flex-col shrink-0">
                <div className="p-3 border-b font-bold bg-gray-50 text-gray-700 flex items-center gap-2"><i className="bi bi-sliders"></i> Properti Sel</div>
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
                             <div className="p-2 bg-purple-50 rounded border"><label className="block text-xs font-bold text-purple-800">Pilih Data</label><select className="w-full text-xs border rounded p-1.5" onChange={(e) => updateActiveCell({ value: e.target.value })}><option value="">-- Pilih --</option><option value="$NAMA">Nama Santri</option><option value="$NIS">NIS</option><option value="$KELAS">Kelas</option><option value="$NAMA_PONPES">Nama Pondok</option><option value="$MAPEL_NAME_1">Mapel (Set ID manual)</option></select></div>
                        )}
                        {(activeCellData.type === 'input' || activeCellData.type === 'dropdown') && (
                            <div><label className="block text-xs font-bold mb-1 text-blue-700">KODE VARIABEL ($)</label><input type="text" value={activeCellData.key || ''} onChange={e => updateActiveCell({ key: e.target.value })} className="w-full border rounded p-2 text-sm font-mono uppercase" placeholder="CONTOH: UH1"/></div>
                        )}
                         {activeCellData.type === 'formula' && (
                            <div><label className="block text-xs font-bold mb-1 text-yellow-700">Rumus</label><input type="text" value={activeCellData.value} onChange={e => updateActiveCell({ value: e.target.value })} className="w-full border rounded p-2 text-sm font-mono" placeholder="= RATA2($A, $B)"/></div>
                        )}
                         <div className="grid grid-cols-2 gap-3 pt-3 border-t">
                            <div><label className="block text-xs font-bold mb-1">Lebar (px)</label><input type="number" value={activeCellData.width || ''} onChange={e => updateActiveCell({ width: parseInt(e.target.value) })} className="w-full border rounded p-2 text-sm"/></div>
                            <div><label className="block text-xs font-bold mb-1">Align</label><select value={activeCellData.align || 'center'} onChange={e => updateActiveCell({ align: e.target.value as any })} className="w-full border rounded p-2 text-sm"><option value="left">Kiri</option><option value="center">Tengah</option><option value="right">Kanan</option></select></div>
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
                <div className="fixed inset-0 bg-black bg-opacity-70 z-[80] flex justify-center items-center p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-[90vh] flex flex-col">
                        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                            <h3 className="text-lg font-bold text-gray-800">Preview Desain</h3>
                            <button onClick={() => setIsDesignPreviewOpen(false)}><i className="bi bi-x-lg text-xl"></i></button>
                        </div>
                        <div className="flex-grow overflow-auto bg-gray-200 p-8 flex justify-center">
                            <div className="bg-white shadow-lg p-8" style={{ width: '21cm', minHeight: '29.7cm' }}>
                                <table className="border-collapse w-full">
                                    <tbody>
                                        {activeTemplate.cells.map((row, rIdx) => (
                                            <tr key={rIdx}>
                                                {row.map((cell, cIdx) => {
                                                    if (cell.hidden) return null;
                                                    const borders = cell.borders || { top: true, right: true, bottom: true, left: true };
                                                    return (
                                                        <td key={`${rIdx}-${cIdx}`} colSpan={cell.colSpan} rowSpan={cell.rowSpan} style={{ borderTop: borders.top?'1px solid black':'none', borderRight: borders.right?'1px solid black':'none', borderBottom: borders.bottom?'1px solid black':'none', borderLeft: borders.left?'1px solid black':'none', textAlign: cell.align||'center', width: cell.width?`${cell.width}px`:'auto', padding:'4px', fontSize:'11px' }}>
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
            )}
        </div>
    );
};
