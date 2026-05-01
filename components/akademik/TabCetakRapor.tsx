
import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../../AppContext';
import { useSantriContext } from '../../contexts/SantriContext';
import { RaporLengkapTemplate } from '../reports/modules/AcademicReports';
import { printToPdfNative } from '../../utils/pdfGenerator';
import { Santri, RaporTemplate, RaporRecord } from '../../types';
import { PrintHeader } from '../common/PrintHeader';
import { MobileFilterDrawer } from '../common/MobileFilterDrawer';
import { useAcademicPeriodFilter } from '../../hooks/useAcademicPeriodFilter';
import { getRaporRecordsByPeriod } from '../../services/academicQueries';

// --- HELPER COMPONENT: DYNAMIC RENDERER ---
const DynamicRaporPreview: React.FC<{ template: RaporTemplate, santri: Santri, record: RaporRecord | null, settings: any }> = ({ template, santri, record, settings }) => {
    const customData = record?.customData ? JSON.parse(record.customData) : {};
    
    // Simple placeholder replacement logic (reused concept)
    const replacePlaceholders = (text: string) => {
        let res = text;
        res = res.replace(/\$NAMA/g, santri.namaLengkap).replace(/\$NISN/g, santri.nisn || '-').replace(/\$NIS/g, santri.nis);
        res = res.replace(/\$KELAS/g, settings.kelas.find((k: any) => k.id === santri.kelasId)?.nama || '');
        res = res.replace(/\$ROMBEL/g, settings.rombel.find((r: any) => r.id === santri.rombelId)?.nama || '');
        res = res.replace(/\$TAHUN_AJAR/g, record?.tahunAjaran || '-').replace(/\$SEMESTER/g, record?.semester || '-');
        return res;
    };

    return (
        <div className="bg-white p-8 text-black font-sans text-sm printable-content-wrapper" style={{ width: '21cm', minHeight: '29.7cm' }}>
            <PrintHeader settings={settings} title={template.name} />
            <div className="mb-4">
                <table className="w-full text-sm font-medium mb-4">
                    <tbody>
                        <tr><td className="w-24">Nama</td><td>: {santri.namaLengkap}</td><td className="w-24 text-right">NIS</td><td className="w-32 text-right">: {santri.nis}</td></tr>
                    </tbody>
                </table>
            </div>
            <table className="w-full border-collapse border border-black text-xs">
                <tbody>
                    {template.cells.map((row, rIdx) => (
                        <tr key={rIdx}>
                            {row.map((cell, cIdx) => {
                                if (cell.hidden) return null;
                                let content = cell.value;
                                
                                if (cell.type === 'data') {
                                    content = replacePlaceholders(cell.value);
                                } else if ((cell.type === 'input' || cell.type === 'formula' || cell.type === 'dropdown') && cell.key) {
                                    content = customData[cell.key] || '';
                                }

                                // Apply borders
                                const b = cell.borders || { top: true, right: true, bottom: true, left: true };
                                const borderStyle: React.CSSProperties = {
                                    borderTop: b.top ? '1px solid black' : undefined,
                                    borderRight: b.right ? '1px solid black' : undefined,
                                    borderBottom: b.bottom ? '1px solid black' : undefined,
                                    borderLeft: b.left ? '1px solid black' : undefined,
                                    textAlign: cell.align || 'center',
                                    width: cell.width ? `${cell.width}px` : undefined,
                                    backgroundColor: (rIdx === 0 || cell.type === 'label') && cell.type !== 'input' && cell.type !== 'formula' && cell.type !== 'dropdown' && cell.value !== '' ? '#f3f4f6' : 'transparent', // Light gray for headers
                                    fontWeight: (rIdx === 0 || cell.type === 'label') ? 'bold' : 'normal',
                                    padding: '4px'
                                };

                                return (
                                    <td key={cIdx} colSpan={cell.colSpan} rowSpan={cell.rowSpan} style={borderStyle}>
                                        {content}
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export const TabCetakRapor: React.FC = () => {
    const { settings } = useAppContext();
    const { santriList } = useSantriContext();
    const {
        filterTahun,
        setFilterTahun,
        filterSemester,
        setFilterSemester,
        availableYears,
        defaultAcademicYear
    } = useAcademicPeriodFilter(settings);
    const [filterJenjang, setFilterJenjang] = useState('');
    const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
    const [printRombel, setPrintRombel] = useState('');
    const [selectedTemplateId, setSelectedTemplateId] = useState(''); // Empty = Standard K13
    
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [isBatchPrinting, setIsBatchPrinting] = useState(false);
    const [previewSantri, setPreviewSantri] = useState<Santri | null>(null);
    const [previewRecord, setPreviewRecord] = useState<RaporRecord | null>(null);
    const [batchData, setBatchData] = useState<{ santri: Santri, record: RaporRecord | null }[]>([]);
    const [periodRecordsMap, setPeriodRecordsMap] = useState<Map<number, RaporRecord>>(new Map());

    const filteredTemplates = useMemo(() => {
        const allTemplates = settings.raporTemplates || [];
        const jenjangId = filterJenjang ? parseInt(filterJenjang) : 0;
        const rombelId = printRombel ? parseInt(printRombel) : 0;
        const rombel = rombelId ? settings.rombel.find(r => r.id === rombelId) : null;
        const kelas = rombel ? settings.kelas.find(k => k.id === rombel.kelasId) : null;

        if (!jenjangId) return allTemplates;
        
        return allTemplates.filter(t => {
            // Global template
            if (!t.jenjangId) return true;
            
            // Jenjang mismatch
            if (t.jenjangId !== jenjangId) return false;
            
            // Kelas lock check
            if (t.kelasId && (!kelas || t.kelasId !== kelas.id)) return false;
            
            // Rombel lock check
            if (t.rombelId && (!rombel || t.rombelId !== rombel.id)) return false;
            
            return true;
        });
    }, [filterJenjang, printRombel, settings.raporTemplates, settings.rombel, settings.kelas]);

    // Auto-select template if only one matches, or reset if current is invalid
    useEffect(() => {
        if (filterJenjang) {
            // If current selection is not in filtered list, reset it
            if (selectedTemplateId && !filteredTemplates.find(t => t.id === selectedTemplateId)) {
                setSelectedTemplateId('');
            }
            
            // If there's exactly one template available for this context, auto-select it
            if (filteredTemplates.length === 1 && selectedTemplateId !== filteredTemplates[0].id) {
                setSelectedTemplateId(filteredTemplates[0].id);
            }
        }
    }, [filterJenjang, filteredTemplates, selectedTemplateId]);

    useEffect(() => {
        if (availableYears.length === 0 && !filterTahun.trim()) {
            setFilterTahun(defaultAcademicYear);
        }
    }, [availableYears, defaultAcademicYear, filterTahun, setFilterTahun]);

    useEffect(() => {
        const loadPeriodRecords = async () => {
            if (!filterTahun || !filterSemester) {
                setPeriodRecordsMap(new Map());
                return;
            }

            const records = await getRaporRecordsByPeriod(filterTahun, filterSemester);
            const map = new Map<number, RaporRecord>();
            records.forEach((record) => {
                map.set(record.santriId, record);
            });
            setPeriodRecordsMap(map);
        };

        loadPeriodRecords();
    }, [filterTahun, filterSemester]);

    const handlePrintPreview = async (santriId: number) => {
        const santri = santriList.find(s => s.id === santriId);
        if (santri) {
            setPreviewSantri(santri);
            setPreviewRecord(periodRecordsMap.get(santri.id) || null);
            setIsPreviewOpen(true);
        }
    };

    const handlePrintAll = async () => {
        const data = filteredSantriList.map((santri) => ({
            santri,
            record: periodRecordsMap.get(santri.id) || null
        }));
        setBatchData(data);
        setIsBatchPrinting(true);
    };

    const selectedTemplate = useMemo(() => settings.raporTemplates?.find(t => t.id === selectedTemplateId), [selectedTemplateId, settings.raporTemplates]);

    // Derived Available Rombels based on Jenjang
    const availableRombels = useMemo(() => {
        if (!filterJenjang) return settings.rombel;
        const kelasInJenjang = settings.kelas.filter(k => k.jenjangId === parseInt(filterJenjang)).map(k => k.id);
        return settings.rombel.filter(r => kelasInJenjang.includes(r.kelasId));
    }, [filterJenjang, settings]);

    // Filtered Santri for List
    const filteredSantriList = useMemo(() => {
        return santriList
            .filter(s => {
                if (s.status !== 'Aktif') return false;
                if (filterJenjang && s.jenjangId !== parseInt(filterJenjang)) return false;
                if (printRombel && s.rombelId !== parseInt(printRombel)) return false;
                return true;
            })
            .sort((a,b) => {
                // Sort by Rombel first if "All Rombels" selected, then Name
                if (!printRombel) {
                    if (a.rombelId !== b.rombelId) return a.rombelId - b.rombelId;
                }
                return a.namaLengkap.localeCompare(b.namaLengkap);
            });
    }, [santriList, filterJenjang, printRombel]);

    return (
        <div className="space-y-6 animate-fade-in relative">
            <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 mb-6 border-b pb-6">
                    <div>
                        <h3 className="text-xl font-black text-gray-800 tracking-tight">Layanan Cetak Rapor</h3>
                        <p className="text-[10px] text-teal-600 font-bold uppercase tracking-widest mt-1">Sistem Administrasi Santri</p>
                    </div>

                    {/* Mobile Filter & Action */}
                    <div className="flex md:hidden gap-2 w-full">
                        <button 
                             onClick={() => setIsFilterDrawerOpen(true)}
                             className="flex-grow flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-50 text-teal-700 border border-teal-200 rounded-xl font-bold text-sm shadow-sm"
                        >
                            <i className="bi bi-funnel-fill"></i>
                            <span>Filter</span>
                        </button>
                        <button 
                            onClick={handlePrintAll} 
                            disabled={isBatchPrinting || filteredSantriList.length === 0}
                            className="shrink-0 w-[44px] h-[44px] bg-teal-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-teal-100 active:scale-95 transition-all disabled:opacity-50"
                            title={`Cetak Massal (${filteredSantriList.length} Santri)`}
                        >
                             {isBatchPrinting ? <span className="animate-spin h-5 w-5 border-2 border-white/30 border-t-white rounded-full"></span> : <i className="bi bi-printer-fill text-xl"></i>}
                        </button>
                    </div>

                    <button 
                        onClick={handlePrintAll} 
                        disabled={isBatchPrinting || filteredSantriList.length === 0}
                        className="hidden md:flex flex-row bg-teal-600 text-white px-6 py-3 rounded-xl text-sm font-black items-center gap-2 hover:bg-teal-700 shadow-lg shadow-teal-100 transition-all active:scale-95 h-[48px]"
                    >
                        {isBatchPrinting ? <span className="animate-spin h-5 w-5 border-2 border-white/30 border-t-white rounded-full"></span> : <i className="bi bi-printer-fill"></i>}
                        <span>Cetak Massal ({filteredSantriList.length})</span>
                    </button>
                </div>
                
                {/* Desktop View Filter Bar */}
                <div className="hidden md:grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                     <div className="flex flex-col">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5 tracking-widest pl-1">Tahun Ajaran</label>
                        {availableYears.length > 0 ? (
                            <select value={filterTahun} onChange={e => setFilterTahun(e.target.value)} className="w-full border rounded-lg p-2.5 text-sm font-bold bg-gray-50 focus:bg-white focus:ring-2 focus:ring-teal-500 transition-all">
                                {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        ) : (
                            <select value={filterTahun} onChange={e => setFilterTahun(e.target.value)} className="w-full border rounded-lg p-2.5 text-sm font-bold bg-gray-50 focus:bg-white focus:ring-2 focus:ring-teal-500 transition-all">
                                <option value={defaultAcademicYear}>{defaultAcademicYear}</option>
                            </select>
                        )}
                    </div>
                    <div className="flex flex-col">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5 tracking-widest pl-1">Semester</label>
                        <select value={filterSemester} onChange={e => setFilterSemester(e.target.value as any)} className="w-full border rounded-lg p-2.5 text-sm font-bold bg-gray-50 focus:bg-white focus:ring-2 focus:ring-teal-500 transition-all">
                            <option value="Ganjil">Ganjil</option><option value="Genap">Genap</option>
                        </select>
                    </div>
                    <div className="flex flex-col">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5 tracking-widest pl-1">Pilih Jenjang</label>
                        <select value={filterJenjang} onChange={e => { setFilterJenjang(e.target.value); setPrintRombel(''); }} className="w-full border rounded-lg p-2.5 text-sm font-bold bg-gray-50 focus:ring-2 focus:ring-teal-500 transition-all">
                            <option value="">Semua Jenjang</option>
                            {settings.jenjang.map(j => <option key={j.id} value={j.id}>{j.nama}</option>)}
                        </select>
                    </div>
                    <div className="flex flex-col">
                        <label className="block text-[10px] font-bold text-teal-600 uppercase mb-1.5 tracking-widest pl-1">Pilih Rombel</label>
                        <select value={printRombel} onChange={e => setPrintRombel(e.target.value)} className="w-full border-2 border-teal-100 rounded-lg p-2.5 text-sm font-black bg-teal-50/20 focus:bg-white focus:ring-2 focus:ring-teal-500 transition-all">
                            <option value="">Semua Rombel</option>
                            {availableRombels.map(r => <option key={r.id} value={r.id}>{r.nama}</option>)}
                        </select>
                    </div>
                    <div className="flex flex-col">
                         <label className="block text-[10px] font-bold text-orange-600 uppercase mb-1.5 tracking-widest pl-1">Template Rapor</label>
                        <select value={selectedTemplateId} onChange={e => setSelectedTemplateId(e.target.value)} className="w-full border-2 border-orange-100 rounded-lg p-2.5 text-sm font-black bg-orange-50 focus:bg-white focus:ring-2 focus:ring-orange-500 transition-all">
                            <option value="">Standar K13 (Mapel)</option>
                            {filteredTemplates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </div>
                </div>

                {/* Mobile Filter Drawer */}
                <MobileFilterDrawer 
                    isOpen={isFilterDrawerOpen} 
                    onClose={() => setIsFilterDrawerOpen(false)}
                    title="Filter Cetak Rapor"
                >
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest pl-1">Tahun Ajaran</label>
                                <select value={filterTahun} onChange={e => setFilterTahun(e.target.value)} className="w-full border-2 border-white rounded-xl p-3 text-sm font-bold shadow-sm focus:border-teal-500 outline-none bg-white">
                                    {(availableYears.length > 0 ? availableYears : [defaultAcademicYear]).map((y) => (
                                        <option key={y} value={y}>{y}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest pl-1">Semester</label>
                                <select value={filterSemester} onChange={e => setFilterSemester(e.target.value as any)} className="w-full border-2 border-white rounded-xl p-3 text-sm font-bold shadow-sm focus:border-teal-500 outline-none">
                                    <option value="Ganjil">Ganjil</option>
                                    <option value="Genap">Genap</option>
                                </select>
                            </div>
                        </div>

                        <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100 space-y-4">
                            <h4 className="text-xs font-black text-teal-700 uppercase tracking-widest flex items-center gap-2"><i className="bi bi-funnel"></i> Marhalah & Rombel</h4>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 tracking-widest ml-1">Pilih Jenjang / Marhalah</label>
                                    <select value={filterJenjang} onChange={e => { setFilterJenjang(e.target.value); setPrintRombel(''); }} className="w-full border-2 border-white rounded-2xl p-4 text-base font-bold shadow-sm focus:border-teal-500 outline-none">
                                        <option value="">Semua Jenjang</option>
                                        {settings.jenjang.map(j => <option key={j.id} value={j.id}>{j.nama}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 tracking-widest ml-1">Pilih Rombongan Belajar</label>
                                    <select value={printRombel} onChange={e => setPrintRombel(e.target.value)} className="w-full border-2 border-teal-100 rounded-2xl p-4 text-base font-black bg-teal-50 shadow-sm focus:border-teal-500 outline-none">
                                        <option value="">Semua Rombel</option>
                                        {availableRombels.map(r => <option key={r.id} value={r.id}>{r.nama}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="bg-orange-50 p-6 rounded-[2rem] border-2 border-orange-100">
                            <label className="block text-xs font-black text-orange-700 uppercase mb-3 tracking-widest ml-1">Pilih Template Rapor</label>
                            <select value={selectedTemplateId} onChange={e => setSelectedTemplateId(e.target.value)} className="w-full border-2 border-white rounded-2xl p-4 text-base font-black text-orange-900 bg-white shadow-xl shadow-orange-900/5 focus:border-teal-500 outline-none">
                                <option value="">Standar K13 (Mapel)</option>
                                {filteredTemplates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        </div>
                    </div>
                </MobileFilterDrawer>

                <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
                    <div className="bg-white px-4 py-3 text-[10px] font-bold text-gray-400 uppercase border-b flex justify-between items-center tracking-widest">
                        <span>Daftar Siswa ({filteredSantriList.length})</span>
                        {!printRombel && filterJenjang && <span className="text-teal-600 bg-teal-50 px-2 py-1 rounded">Jenjang Aktif</span>}
                    </div>
                    <div className="max-h-[500px] overflow-y-auto divide-y divide-gray-100 bg-white no-scrollbar sm:scrollbar">
                        {filteredSantriList.map((santri, idx) => (
                            <div key={santri.id} className="flex justify-between items-center p-3 sm:p-4 hover:bg-gray-50 transition-colors group">
                                <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
                                    <span className="hidden xs:flex w-8 h-8 rounded-lg bg-gray-100 text-gray-400 items-center justify-center text-[10px] font-black group-hover:bg-teal-50 group-hover:text-teal-600 transition-colors shrink-0">{idx + 1}</span>
                                    <div className="min-w-0 flex-1">
                                        <div className="font-black text-xs sm:text-sm text-gray-800 truncate leading-none mb-1">{santri.namaLengkap}</div>
                                        <div className="text-[9px] sm:text-[10px] text-gray-400 flex items-center gap-1.5 font-bold uppercase tracking-wide">
                                            <span className="bg-gray-100 px-1 py-0.5 rounded leading-none">{santri.nis}</span>
                                            <span className="text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded leading-none">{settings.rombel.find(r=>r.id===santri.rombelId)?.nama}</span>
                                        </div>
                                    </div>
                                </div>
                                <button onClick={() => handlePrintPreview(santri.id)} className="shrink-0 bg-white text-teal-700 hover:bg-teal-600 hover:text-white px-3 py-2 sm:px-4 rounded-xl text-[10px] font-black transition-all flex items-center gap-2 border-2 border-teal-50 shadow-sm active:scale-95">
                                    <i className="bi bi-eye-fill text-sm"></i> <span className="hidden sm:inline">Review</span>
                                </button>
                            </div>
                        ))}
                        {filteredSantriList.length === 0 && (
                            <div className="p-12 text-center text-gray-400 italic bg-gray-50">
                                <i className="bi bi-person-dash text-4xl mb-4 block opacity-20"></i>
                                Tidak ada santri aktif sesuai filter.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* PREVIEW MODAL */}
            {isPreviewOpen && previewSantri && (
                <div className="fixed inset-0 bg-black bg-opacity-70 z-[70] flex justify-center items-center p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl h-[90vh] flex flex-col">
                        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                            <h3 className="text-lg font-bold text-gray-800">Pratinjau: {previewSantri.namaLengkap}</h3>
                            <div className="flex gap-2">
                                 <button onClick={() => printToPdfNative('rapor-preview-container', `Rapor_${previewSantri.namaLengkap}`)} className="bg-gray-700 text-white px-3 py-1.5 rounded text-sm hover:bg-gray-800"><i className="bi bi-printer"></i> Cetak PDF</button>
                                 <button onClick={() => setIsPreviewOpen(false)} className="text-gray-500 hover:text-gray-700"><i className="bi bi-x-lg text-xl"></i></button>
                            </div>
                        </div>
                        <div className="flex-grow overflow-auto bg-gray-200 p-8 flex justify-center">
                            <div id="rapor-preview-container">
                                {selectedTemplate ? (
                                    <DynamicRaporPreview template={selectedTemplate} santri={previewSantri} record={previewRecord} settings={settings} />
                                ) : (
                                    <div className="bg-white shadow-lg p-8 printable-content-wrapper" style={{ width: '21cm', minHeight: '29.7cm', padding: '2cm' }}>
                                        <RaporLengkapTemplate santri={previewSantri} settings={settings} options={{ tahunAjaran: filterTahun, semester: filterSemester }} />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* BATCH PRINT MODAL */}
            {isBatchPrinting && batchData.length > 0 && (
                <div className="fixed inset-0 bg-black bg-opacity-70 z-[70] flex justify-center items-center p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl h-[90vh] flex flex-col">
                        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                            <h3 className="text-lg font-bold text-gray-800">Cetak Massal ({batchData.length} Rapor)</h3>
                            <div className="flex gap-2">
                                 <button onClick={() => printToPdfNative('batch-print-container', `Rapor_Massal_${filterTahun.replace('/','-')}`)} className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-teal-700"><i className="bi bi-printer"></i> Mulai Cetak</button>
                                 <button onClick={() => setIsBatchPrinting(false)} className="text-gray-500 hover:text-gray-700"><i className="bi bi-x-lg text-xl"></i></button>
                            </div>
                        </div>
                        <div className="flex-grow overflow-auto bg-gray-200 p-8 flex justify-center">
                            <div id="batch-print-container" className="space-y-8">
                                {batchData.map((item, idx) => (
                                    <div key={item.santri.id} className={idx < batchData.length - 1 ? 'break-after-page' : ''}>
                                        {selectedTemplate ? (
                                            <DynamicRaporPreview template={selectedTemplate} santri={item.santri} record={item.record} settings={settings} />
                                        ) : (
                                            <div className="bg-white shadow-lg p-8 printable-content-wrapper" style={{ width: '21cm', minHeight: '29.7cm', padding: '2cm' }}>
                                                <RaporLengkapTemplate santri={item.santri} settings={settings} options={{ tahunAjaran: filterTahun, semester: filterSemester }} />
                                            </div>
                                        )}
                                        {/* Page Break for Printing */}
                                        <div style={{ pageBreakAfter: 'always' }}></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
