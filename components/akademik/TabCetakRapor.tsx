
import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../../AppContext';
import { useSantriContext } from '../../contexts/SantriContext';
import { db } from '../../db';
import { RaporLengkapTemplate } from '../reports/modules/AcademicReports';
import { printToPdfNative } from '../../utils/pdfGenerator';
import { Santri, RaporTemplate, RaporRecord } from '../../types';
import { PrintHeader } from '../common/PrintHeader';

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
    const [filterTahun, setFilterTahun] = useState('2024/2025');
    const [filterSemester, setFilterSemester] = useState<'Ganjil' | 'Genap'>('Ganjil');
    const [printRombel, setPrintRombel] = useState('');
    const [selectedTemplateId, setSelectedTemplateId] = useState(''); // Empty = Standard K13
    const [availableYears, setAvailableYears] = useState<string[]>([]);
    
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [previewSantri, setPreviewSantri] = useState<Santri | null>(null);
    const [previewRecord, setPreviewRecord] = useState<RaporRecord | null>(null);

    // Fetch available years from DB on mount
    useEffect(() => {
        const fetchYears = async () => {
            const all = await db.raporRecords.toArray();
            const uniqueYears: string[] = Array.from(new Set(all.map(r => r.tahunAjaran))).sort().reverse() as string[];
            setAvailableYears(uniqueYears);
            
            // Auto-select latest year if available
            if (uniqueYears.length > 0 && !uniqueYears.includes(filterTahun)) {
                setFilterTahun(uniqueYears[0]);
            }
        };
        fetchYears();
    }, []);

    const handlePrintPreview = async (santriId: number) => {
        const santri = santriList.find(s => s.id === santriId);
        if (santri) {
            const record = await db.raporRecords
                .where({ santriId: santri.id, tahunAjaran: filterTahun, semester: filterSemester })
                .first();
            
            setPreviewSantri(santri);
            setPreviewRecord(record || null);
            setIsPreviewOpen(true);
        }
    };

    const selectedTemplate = useMemo(() => settings.raporTemplates?.find(t => t.id === selectedTemplateId), [selectedTemplateId, settings.raporTemplates]);

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Cetak Rapor</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                     <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">Tahun Ajaran</label>
                        {availableYears.length > 0 ? (
                            <select value={filterTahun} onChange={e => setFilterTahun(e.target.value)} className="w-full border rounded p-2 text-sm bg-gray-50">
                                {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        ) : (
                             <input type="text" value={filterTahun} onChange={e => setFilterTahun(e.target.value)} className="w-full border rounded p-2 text-sm bg-gray-50" placeholder="2024/2025" />
                        )}
                        {availableYears.length === 0 && <p className="text-[10px] text-gray-400 mt-1 italic">Belum ada data nilai tersimpan.</p>}
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">Semester</label>
                        <select value={filterSemester} onChange={e => setFilterSemester(e.target.value as any)} className="w-full border rounded p-2 text-sm bg-gray-50">
                            <option value="Ganjil">Ganjil</option><option value="Genap">Genap</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">Pilih Rombel</label>
                        <select value={printRombel} onChange={e => setPrintRombel(e.target.value)} className="w-full border rounded p-2 text-sm bg-yellow-50 focus:ring-2 focus:ring-yellow-400">
                            <option value="">-- Pilih Rombel --</option>
                            {settings.rombel.map(r => <option key={r.id} value={r.id}>{r.nama}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">Desain Rapor</label>
                        <select value={selectedTemplateId} onChange={e => setSelectedTemplateId(e.target.value)} className="w-full border rounded p-2 text-sm bg-blue-50 focus:ring-2 focus:ring-blue-400">
                            <option value="">Standar K13 (Mapel)</option>
                            {settings.raporTemplates?.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </div>
                </div>

                {printRombel ? (
                    <div className="border rounded-lg overflow-hidden">
                        <div className="bg-gray-100 px-4 py-2 text-xs font-bold text-gray-600 uppercase">Daftar Siswa</div>
                        <div className="divide-y max-h-[500px] overflow-y-auto">
                            {santriList
                                .filter(s => s.rombelId === parseInt(printRombel) && s.status === 'Aktif')
                                .sort((a,b) => a.namaLengkap.localeCompare(b.namaLengkap))
                                .map((santri, idx) => (
                                    <div key={santri.id} className="flex justify-between items-center p-3 hover:bg-gray-50">
                                        <div className="flex items-center gap-3">
                                            <span className="w-6 h-6 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-xs font-bold">{idx + 1}</span>
                                            <div>
                                                <div className="font-medium text-sm text-gray-800">{santri.namaLengkap}</div>
                                                <div className="text-xs text-gray-500">{santri.nis}</div>
                                            </div>
                                        </div>
                                        <button onClick={() => handlePrintPreview(santri.id)} className="px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1 bg-blue-600 text-white hover:bg-blue-700">
                                            <i className="bi bi-printer"></i> Preview
                                        </button>
                                    </div>
                                ))
                            }
                            {santriList.filter(s => s.rombelId === parseInt(printRombel)).length === 0 && <div className="p-8 text-center text-gray-500 italic">Tidak ada santri aktif.</div>}
                        </div>
                    </div>
                ) : <div className="p-8 text-center bg-gray-50 rounded border border-dashed border-gray-300 text-gray-500">Pilih Rombel terlebih dahulu.</div>}
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
        </div>
    );
};
