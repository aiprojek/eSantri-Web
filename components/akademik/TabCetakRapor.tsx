import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../../AppContext';
import { useSantriContext } from '../../contexts/SantriContext';
import { RaporLengkapTemplate } from '../reports/modules/AcademicReports';
import { printToPdfNative } from '../../utils/pdfGenerator';
import { Santri, RaporTemplate, RaporRecord, DigitalAsset, RaporSheet } from '../../types';
import { PrintHeader } from '../common/PrintHeader';
import { MobileFilterDrawer } from '../common/MobileFilterDrawer';
import { useAcademicPeriodFilter } from '../../hooks/useAcademicPeriodFilter';
import { getRaporRecordsByPeriod } from '../../services/academicQueries';
import { resolveRaporText, isMediaTag, getMediaTagImageSrc, templateHasBuiltInBiodata } from '../../utils/raporPlaceholderResolver';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { buildRombelLegerData, StudentLegerRow } from '../../services/raporCalculationService';
import { getTemplateSheets } from '../../services/raporExcelService';
import { RaporTitleEditModal } from './modals/RaporTitleEditModal';

export interface TabCetakRaporProps {
    onNavigateToTab?: (tab: string, rombelId?: number) => void;
}

export type RankingDisplayLimit = 'all' | '3' | '5' | '10' | 'none';

export const getEffectiveRanking = (rawRank: number | undefined, limit: RankingDisplayLimit): number | undefined => {
    if (!rawRank || rawRank <= 0) return undefined;
    if (limit === 'none') return undefined;
    if (limit === '3' && rawRank > 3) return undefined;
    if (limit === '5' && rawRank > 5) return undefined;
    if (limit === '10' && rawRank > 10) return undefined;
    return rawRank;
};

// --- HELPER COMPONENT: DYNAMIC RENDERER ---
interface DynamicRaporPreviewProps {
    template: RaporTemplate;
    targetSheetId?: string;
    santri: Santri;
    record: RaporRecord | null;
    settings: any;
    digitalAssets?: DigitalAsset[];
    tanggalRapor?: string;
    tempatRapor?: string;
    calculation?: {
        totalNilai?: number;
        rataRata?: number;
        ranking?: number;
        totalSantri?: number;
        predikat?: string;
    };
    paperSize?: 'A4' | 'F4';
    showKop?: boolean;
    marginMode?: 'normal' | 'narrow' | 'none';
    showJudul?: boolean;
    showBiodataHeader?: boolean;
    fitToPage?: boolean;
    printScale?: number | 'auto';
}

const DynamicRaporPreview: React.FC<DynamicRaporPreviewProps> = ({
    template,
    targetSheetId = 'all',
    santri,
    record,
    settings,
    digitalAssets = [],
    tanggalRapor,
    tempatRapor,
    calculation,
    paperSize = 'A4',
    showKop = true,
    marginMode = 'normal',
    showJudul,
    showBiodataHeader,
    fitToPage = true,
    printScale = 'auto'
}) => {
    const sheets = useMemo(() => {
        const allSheets = getTemplateSheets(template);
        if (!targetSheetId || targetSheetId === 'all') {
            return allSheets;
        }
        const filtered = allSheets.filter(s => s.id === targetSheetId);
        return filtered.length > 0 ? filtered : allSheets;
    }, [template, targetSheetId]);

    const customData = record?.customData ? JSON.parse(record.customData) : {};
    const effectiveDate = record?.tanggalRapor
        ? new Date(record.tanggalRapor)
        : (tanggalRapor ? new Date(tanggalRapor) : (settings?.tanggalRaporDefault ? new Date(settings.tanggalRaporDefault) : new Date()));

    const effectiveSettings = {
        ...settings,
        tempatRaporDefault: tempatRapor?.trim() || settings?.tempatRaporDefault
    };

    const resolveContext = {
        santri,
        settings: effectiveSettings,
        record,
        digitalAssets,
        targetDate: effectiveDate,
        calculation
    };

    const paperDimensions = {
        A4: { width: '21cm', minHeight: '29.7cm', maxHeight: '29.7cm' },
        F4: { width: '21.5cm', minHeight: '33cm', maxHeight: '33cm' }
    };

    const paddingClasses = {
        normal: 'p-8',
        narrow: 'p-4 sm:p-5',
        none: 'p-2'
    };

    const currentDimensions = paperDimensions[paperSize] || paperDimensions.A4;
    const hasBuiltInBiodata = useMemo(() => templateHasBuiltInBiodata(template), [template]);

    const marginPx = marginMode === 'normal' ? 64 : marginMode === 'narrow' ? 36 : 16;
    const basePaperW = paperSize === 'F4' ? 813 : 794;
    const availableW = Math.max(300, basePaperW - marginPx);

    // Hitung skala otomatis (Auto Fit 1 Lembar - Memperhitungkan Lebar Kolom dan Tinggi Baris)
    const getEffectiveScale = (sheet: RaporSheet) => {
        if (typeof printScale === 'number') {
            return printScale / 100;
        }

        const rowCount = sheet.cells.length;
        let vertScale = 1.0;
        if (fitToPage) {
            if (rowCount <= 22) vertScale = 1.0;
            else if (rowCount <= 27) vertScale = 0.94;
            else if (rowCount <= 32) vertScale = 0.88;
            else if (rowCount <= 38) vertScale = 0.82;
            else if (rowCount <= 44) vertScale = 0.75;
            else vertScale = 0.68;
        }

        const colCount = sheet.colCount || sheet.cells?.[0]?.length || 1;
        let totalColW = 0;
        for (let c = 0; c < colCount; c++) {
            let colW = 100;
            if (sheet.cells) {
                for (let r = 0; r < sheet.cells.length; r++) {
                    const cell = sheet.cells[r]?.[c];
                    if (cell && !cell.hidden && (!cell.colSpan || cell.colSpan === 1)) {
                        if (typeof cell.width === 'number' && cell.width > 0) {
                            colW = cell.width;
                            break;
                        }
                    }
                }
            }
            totalColW += colW;
        }

        // Pastikan tabel dengan banyak kolom dari Excel tidak terpotong di kanan
        const horizScale = totalColW > availableW ? Math.max(0.60, availableW / totalColW) : 1.0;

        if (fitToPage) {
            return Math.min(vertScale, horizScale);
        }
        // Bahkan jika fitToPage false, tabel harus tetap muat secara horizontal agar tepi kanan tidak terpotong kertas
        return Math.min(1.0, horizScale);
    };

    return (
        <div className="dynamic-rapor-container space-y-8 print:space-y-0">
            {sheets.map((sheet, sheetIdx) => {
                const isLastSheet = sheetIdx === sheets.length - 1;
                const shouldShowBiodataHeader = showBiodataHeader !== undefined
                    ? showBiodataHeader
                    : (sheet.showBiodataHeader !== undefined 
                        ? sheet.showBiodataHeader 
                        : (template.showBiodataHeader !== undefined ? template.showBiodataHeader : !hasBuiltInBiodata));

                const scale = getEffectiveScale(sheet);

                // Hitung lebar proporsional kolom untuk sheet ini
                const colCount = sheet.colCount || sheet.cells?.[0]?.length || 0;
                const sheetColWidths: number[] = [];
                for (let c = 0; c < colCount; c++) {
                    let colW = 100;
                    if (sheet.cells) {
                        for (let r = 0; r < sheet.cells.length; r++) {
                            const cell = sheet.cells[r]?.[c];
                            if (cell && !cell.hidden && (!cell.colSpan || cell.colSpan === 1)) {
                                if (typeof cell.width === 'number' && cell.width > 0) {
                                    colW = cell.width;
                                    break;
                                }
                            }
                        }
                    }
                    sheetColWidths.push(colW);
                }
                const totalColWidth = sheetColWidths.reduce((a, b) => a + b, 0) || 720;

                return (
                    <div
                        key={sheet.id}
                        className={`bg-white text-black font-sans text-sm printable-content-wrapper shadow-md mx-auto ${paddingClasses[marginMode]} ${!isLastSheet ? 'page-break-after' : ''} ${fitToPage ? 'rapor-fit-1-page' : ''}`}
                        style={{
                            width: currentDimensions.width,
                            minHeight: currentDimensions.minHeight,
                            maxHeight: fitToPage ? currentDimensions.maxHeight : undefined,
                            overflow: fitToPage ? 'hidden' : undefined,
                            pageBreakAfter: isLastSheet ? 'auto' : 'always',
                            breakAfter: isLastSheet ? 'auto' : 'page',
                            pageBreakInside: 'avoid',
                            breakInside: 'avoid',
                            boxSizing: 'border-box'
                        }}
                    >
                        <div
                            className="w-full h-full flex flex-col justify-start"
                            style={{
                                transform: scale < 1 ? `scale(${scale})` : undefined,
                                transformOrigin: 'top center',
                                width: scale < 1 ? `${(100 / scale).toFixed(2)}%` : '100%'
                            }}
                        >
                            {(() => {
                                if (!showKop) return null;

                                // Deteksi cerdas apakah baris teratas (0-2) sudah didesain memuat judul sendiri di sel Excel
                                const hasTitleInGrid = sheet.cells && sheet.cells.length > 0 && sheet.cells.slice(0, 3).some(row =>
                                    row.some(cell => {
                                        if (!cell || !cell.value) return false;
                                        const up = cell.value.toUpperCase();
                                        return up.includes('RAPOR') || up.includes('LAPORAN HASIL') || up.includes('CAPAIAN KOMPETENSI') || up.includes('HASIL EVALUASI');
                                    })
                                );

                                const shouldShowTitle = showJudul !== undefined
                                    ? showJudul
                                    : (sheet.showJudul !== undefined
                                        ? sheet.showJudul
                                        : (template.showJudul !== undefined ? template.showJudul : !hasTitleInGrid));

                                // Ambil teks judul: prioritaskan customTitle (bisa multi-line hingga 3 baris teks resmi)
                                const rawTitle = sheet.customTitle !== undefined
                                    ? sheet.customTitle
                                    : (template.customTitle !== undefined ? template.customTitle : (shouldShowTitle ? (sheet.name || template.name) : ''));

                                const resolvedTitle = rawTitle ? resolveRaporText(rawTitle, resolveContext) : undefined;

                                return (
                                    <PrintHeader
                                        settings={settings}
                                        title={shouldShowTitle ? resolvedTitle : undefined}
                                    />
                                );
                            })()}
                            
                            {/* Header Data Diri Otomatis: Hanya muncul jika diizinkan & template belum memiliki biodata mandiri */}
                            {shouldShowBiodataHeader && (
                                <div className="mb-3">
                                    <table className="w-full text-sm font-medium mb-3">
                                        <tbody>
                                            <tr>
                                                <td className="w-24 font-bold">Nama</td>
                                                <td>: {santri.namaLengkap}</td>
                                                <td className="w-24 text-right font-bold">NIS</td>
                                                <td className="w-32 text-right">: {santri.nis}</td>
                                            </tr>
                                            <tr>
                                                <td className="w-24 font-bold">Rombel</td>
                                                <td>: {settings.rombel.find((r: any) => r.id === santri.rombelId)?.nama || '-'}</td>
                                                <td className="w-24 text-right font-bold">{sheets.length > 1 ? 'Format / Lembar' : 'Peringkat'}</td>
                                                <td className="w-32 text-right font-semibold">
                                                    {sheets.length > 1
                                                        ? `: ${sheet.name}`
                                                        : `: ${calculation?.ranking ? `${calculation.ranking} / ${calculation.totalSantri || '-'}` : '-'}`
                                                    }
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            <table className="w-full border-collapse text-xs table-fixed">
                                <colgroup>
                                    {sheetColWidths.map((w, cIdx) => (
                                        <col key={cIdx} style={{ width: `${((w / totalColWidth) * 100).toFixed(2)}%` }} />
                                    ))}
                                </colgroup>
                                <tbody>
                                    {sheet.cells.map((row, rIdx) => {
                                        const rH = row?.[0]?.height;
                                        return (
                                        <tr key={rIdx} style={{ breakInside: 'avoid', pageBreakInside: 'avoid', height: rH ? `${rH}px` : undefined }}>
                                            {row.map((cell, cIdx) => {
                                                if (cell.hidden) return null;
                                                let renderedContent: React.ReactNode = cell.value;

                                                if (cell.type === 'data') {
                                                    if (isMediaTag(cell.value)) {
                                                        const imgSrc = getMediaTagImageSrc(cell.value, resolveContext);
                                                        if (imgSrc) {
                                                            const isStempel = cell.value.includes('STEMPEL');
                                                            const isTtd = cell.value.includes('TTD');
                                                            renderedContent = (
                                                                <div className="flex items-center justify-center p-1">
                                                                    <img
                                                                        src={imgSrc}
                                                                        alt={cell.value}
                                                                        className={`object-contain ${isStempel ? 'max-h-16 max-w-[90px] opacity-90' : isTtd ? 'max-h-14 max-w-[120px]' : 'max-h-12 max-w-[100px]'}`}
                                                                    />
                                                                </div>
                                                            );
                                                        } else {
                                                            renderedContent = <span className="text-[10px] text-gray-400 italic">[{cell.value.replace('$', '')}]</span>;
                                                        }
                                                    } else {
                                                        renderedContent = resolveRaporText(cell.value, resolveContext);
                                                    }
                                                } else if ((cell.type === 'input' || cell.type === 'formula' || cell.type === 'dropdown') && cell.key) {
                                                    renderedContent = customData[cell.key] || '';
                                                } else if (cell.type === 'label') {
                                                    renderedContent = resolveRaporText(cell.value, resolveContext);
                                                }

                                                // Apply borders & rich styles (Hanya sel yang memang di-border yang akan digambar garisnya)
                                                const isLogoMedia = typeof cell.value === 'string' && (cell.value.includes('LOGO_PONPES') || cell.value.includes('LOGO_YAYASAN') || cell.value === '$LOGO');
                                                const b = cell.borders || { top: false, right: false, bottom: false, left: false };
                                                
                                                // Hormati warna background, font weight, dan italic asli dari desain / Excel
                                                // Tidak memaksakan latar abu-abu (#f3f4f6) agar sel non-tabel tetap bersih dan transparan
                                                const hasCustomBg = Boolean(cell.backgroundColor && cell.backgroundColor !== 'transparent' && cell.backgroundColor !== '#ffffff');
                                                const effectiveBg = hasCustomBg ? cell.backgroundColor : 'transparent';

                                                const effectiveFontWeight = cell.bold !== undefined 
                                                    ? (cell.bold ? 'bold' : 'normal') 
                                                    : 'normal';

                                                const borderStyle: React.CSSProperties = {
                                                    borderTop: (!isLogoMedia && b.top) ? '1px solid black' : 'none',
                                                    borderRight: (!isLogoMedia && b.right) ? '1px solid black' : 'none',
                                                    borderBottom: (!isLogoMedia && b.bottom) ? '1px solid black' : 'none',
                                                    borderLeft: (!isLogoMedia && b.left) ? '1px solid black' : 'none',
                                                    textAlign: cell.align || 'center',
                                                    height: cell.height ? `${cell.height}px` : undefined,
                                                    backgroundColor: effectiveBg,
                                                    fontWeight: effectiveFontWeight,
                                                    fontStyle: cell.italic ? 'italic' : undefined,
                                                    color: cell.color || undefined,
                                                    fontSize: cell.fontSize ? `${cell.fontSize}px` : (colCount > 12 ? '10px' : undefined),
                                                    padding: (sheetColWidths[cIdx] || 100) < 30 ? '1px 2px' : (colCount > 10 ? '2px 4px' : '4px'),
                                                    boxSizing: 'border-box',
                                                    overflow: 'hidden',
                                                    wordBreak: 'break-word'
                                                };

                                                return (
                                                    <td key={cIdx} colSpan={cell.colSpan} rowSpan={cell.rowSpan} style={borderStyle}>
                                                        {renderedContent}
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
                );
            })}
        </div>
    );
};

export const TabCetakRapor: React.FC<TabCetakRaporProps> = ({ onNavigateToTab }) => {
    const { settings, onUpdateSettings, showToast } = useAppContext();
    const { santriList } = useSantriContext();
    const digitalAssets = useLiveQuery(() => db.digitalAssets.toArray(), []) || [];
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
    const [selectedTemplateId, setSelectedTemplateId] = useState('');
    const [selectedPrintSheetId, setSelectedPrintSheetId] = useState<string>('all');

    useEffect(() => {
        setSelectedPrintSheetId('all');
    }, [selectedTemplateId]);

    // Search and Status Tabs
    const [searchQuery, setSearchQuery] = useState('');
    const [statusTab, setStatusTab] = useState<'all' | 'complete' | 'partial' | 'empty'>('all');
    const [sortBy, setSortBy] = useState<'name' | 'rank' | 'nis'>('name');

    // Selection state for Batch Print
    const [selectedSantriIds, setSelectedSantriIds] = useState<Set<number>>(new Set());

    // Print Layout & Output Settings
    const [paperSize, setPaperSize] = useState<'A4' | 'F4'>('A4');
    const [showKop, setShowKop] = useState<boolean>(true);
    const [marginMode, setMarginMode] = useState<'normal' | 'narrow' | 'none'>('normal');
    const [rankingDisplayLimit, setRankingDisplayLimit] = useState<RankingDisplayLimit>('all');
    const [fitToPage, setFitToPage] = useState<boolean>(true);
    const [printScale, setPrintScale] = useState<number | 'auto'>('auto');
    const [showBiodataHeader, setShowBiodataHeader] = useState<boolean | 'auto'>('auto');
    const [showJudul, setShowJudul] = useState<boolean | 'auto'>('auto');

    // Universal / Custom Issuance Date & Place
    const [tanggalRapor, setTanggalRapor] = useState(settings.tanggalRaporDefault || new Date().toISOString().split('T')[0]);
    const [tempatRapor, setTempatRapor] = useState(settings.tempatRaporDefault || '');
    const [isSavingUniversalDate, setIsSavingUniversalDate] = useState(false);

    // Records and Leger Calculations Map
    const [periodRecordsMap, setPeriodRecordsMap] = useState<Map<number, RaporRecord>>(new Map());
    const [studentLegerMap, setStudentLegerMap] = useState<Map<number, StudentLegerRow>>(new Map());

    // Preview and Batch Modals
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [previewSantriIndex, setPreviewSantriIndex] = useState<number>(0);
    const [isBatchPrinting, setIsBatchPrinting] = useState(false);
    const [batchData, setBatchData] = useState<{ santri: Santri; record: RaporRecord | null; calculation?: any }[]>([]);
    const [isTitleModalOpen, setIsTitleModalOpen] = useState(false);

    useEffect(() => {
        if (settings.tanggalRaporDefault && !tanggalRapor) {
            setTanggalRapor(settings.tanggalRaporDefault);
        }
        if (settings.tempatRaporDefault && !tempatRapor) {
            setTempatRapor(settings.tempatRaporDefault);
        }
    }, [settings.tanggalRaporDefault, settings.tempatRaporDefault]);

    const handleSaveRaporTitle = async (customTitle: string, isShowJudul: boolean, targetSheet: 'all' | string) => {
        if (!selectedTemplate) return;
        const allTemplates = (settings.raporTemplates || []) as RaporTemplate[];
        const updated = allTemplates.map(tpl => {
            if (tpl.id !== selectedTemplate.id) return tpl;
            const sheets = getTemplateSheets(tpl);
            const updatedSheets = sheets.map(s => {
                if (targetSheet === 'all' || s.id === targetSheet) {
                    return {
                        ...s,
                        customTitle,
                        showJudul: isShowJudul
                    };
                }
                return s;
            });

            return {
                ...tpl,
                sheets: updatedSheets,
                customTitle: targetSheet === 'all' ? customTitle : tpl.customTitle,
                showJudul: isShowJudul
            };
        });

        await onUpdateSettings({
            ...settings,
            raporTemplates: updated
        });
        setShowJudul(isShowJudul);
        showToast('Judul dokumen rapor berhasil disimpan!', 'success');
    };

    const handleSaveUniversalDate = async () => {
        try {
            setIsSavingUniversalDate(true);
            await onUpdateSettings({
                ...settings,
                tanggalRaporDefault: tanggalRapor,
                tempatRaporDefault: tempatRapor.trim()
            });
            showToast('Tanggal & Tempat Rapor berhasil disimpan sebagai default universal!', 'success');
        } catch (error) {
            showToast('Gagal menyimpan default tanggal: ' + String(error), 'error');
        } finally {
            setIsSavingUniversalDate(false);
        }
    };

    const filteredTemplates = useMemo(() => {
        const allTemplates = settings.raporTemplates || [];
        const jenjangId = filterJenjang ? parseInt(filterJenjang) : 0;
        const rombelId = printRombel ? parseInt(printRombel) : 0;
        const rombel = rombelId ? settings.rombel.find(r => r.id === rombelId) : null;
        const kelas = rombel ? settings.kelas.find(k => k.id === rombel.kelasId) : null;

        if (!jenjangId) return allTemplates;

        return allTemplates.filter(t => {
            if (!t.jenjangId) return true;
            if (t.jenjangId !== jenjangId) return false;
            if (t.kelasId && (!kelas || t.kelasId !== kelas.id)) return false;
            if (t.rombelId && (!rombel || t.rombelId !== rombel.id)) return false;
            return true;
        });
    }, [filterJenjang, printRombel, settings.raporTemplates, settings.rombel, settings.kelas]);

    useEffect(() => {
        if (filterJenjang) {
            if (selectedTemplateId && !filteredTemplates.find(t => t.id === selectedTemplateId)) {
                setSelectedTemplateId('');
            }
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

    // Load Period Records
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

    // Derived Available Rombels based on Jenjang
    const availableRombels = useMemo(() => {
        if (!filterJenjang) return settings.rombel;
        const kelasInJenjang = settings.kelas.filter(k => k.jenjangId === parseInt(filterJenjang)).map(k => k.id);
        return settings.rombel.filter(r => kelasInJenjang.includes(r.kelasId));
    }, [filterJenjang, settings]);

    // Base active students according to Jenjang and Rombel filter
    const baseSantriList = useMemo(() => {
        return santriList.filter(s => {
            if (s.status !== 'Aktif') return false;
            if (filterJenjang && s.jenjangId !== parseInt(filterJenjang)) return false;
            if (printRombel && s.rombelId !== parseInt(printRombel)) return false;
            return true;
        });
    }, [santriList, filterJenjang, printRombel]);

    // Compute Leger Calculations per Rombel to get exact ranks, averages, and completeness
    useEffect(() => {
        const calculateRombelData = () => {
            const newMap = new Map<number, StudentLegerRow>();
            const studentsByRombel = new Map<number, Santri[]>();

            baseSantriList.forEach(s => {
                const list = studentsByRombel.get(s.rombelId) || [];
                list.push(s);
                studentsByRombel.set(s.rombelId, list);
            });

            studentsByRombel.forEach((rombelStudents, rId) => {
                const rombel = settings.rombel.find(r => r.id === rId);
                const kelas = rombel ? settings.kelas.find(k => k.id === rombel.kelasId) : null;
                const templates = (settings.raporTemplates || []) as RaporTemplate[];

                let matchedTemplate: RaporTemplate | null = null;
                if (selectedTemplateId) {
                    matchedTemplate = templates.find(t => t.id === selectedTemplateId) || null;
                } else if (kelas?.jenjangId) {
                    matchedTemplate = templates.find(t => t.jenjangId === kelas.jenjangId) || null;
                }
                if (!matchedTemplate && templates.length > 0) {
                    matchedTemplate = templates[0];
                }

                const rombelRecords = rombelStudents
                    .map(s => periodRecordsMap.get(s.id))
                    .filter((r): r is RaporRecord => r !== undefined);

                const rombelData = buildRombelLegerData({
                    template: matchedTemplate,
                    santriList: rombelStudents,
                    records: rombelRecords
                });

                rombelData.students.forEach(row => {
                    newMap.set(row.santri.id, row);
                });
            });

            setStudentLegerMap(newMap);
        };

        calculateRombelData();
    }, [baseSantriList, periodRecordsMap, selectedTemplateId, settings]);

    // Counts for status tabs
    const counts = useMemo(() => {
        let complete = 0;
        let partial = 0;
        let empty = 0;

        baseSantriList.forEach(s => {
            const row = studentLegerMap.get(s.id);
            const status = row?.completenessStatus || (periodRecordsMap.has(s.id) ? 'Sebagian' : 'Kosong');
            if (status === 'Lengkap') complete++;
            else if (status === 'Sebagian') partial++;
            else empty++;
        });

        return { all: baseSantriList.length, complete, partial, empty };
    }, [baseSantriList, studentLegerMap, periodRecordsMap]);

    // Filtered & Sorted Santri for Display
    const filteredSantriList = useMemo(() => {
        return baseSantriList
            .filter(s => {
                // Status Tab Filter
                if (statusTab !== 'all') {
                    const row = studentLegerMap.get(s.id);
                    const status = row?.completenessStatus || (periodRecordsMap.has(s.id) ? 'Sebagian' : 'Kosong');
                    if (statusTab === 'complete' && status !== 'Lengkap') return false;
                    if (statusTab === 'partial' && status !== 'Sebagian') return false;
                    if (statusTab === 'empty' && status !== 'Kosong') return false;
                }

                // Search Query
                if (searchQuery.trim()) {
                    const q = searchQuery.toLowerCase().trim();
                    const nameMatch = s.namaLengkap.toLowerCase().includes(q);
                    const nisMatch = s.nis?.toLowerCase().includes(q);
                    if (!nameMatch && !nisMatch) return false;
                }

                return true;
            })
            .sort((a, b) => {
                const rowA = studentLegerMap.get(a.id);
                const rowB = studentLegerMap.get(b.id);

                if (sortBy === 'rank') {
                    const rankA = rowA?.ranking || 999;
                    const rankB = rowB?.ranking || 999;
                    if (rankA !== rankB) return rankA - rankB;
                } else if (sortBy === 'nis') {
                    return (a.nis || '').localeCompare(b.nis || '');
                }

                if (!printRombel && a.rombelId !== b.rombelId) {
                    return a.rombelId - b.rombelId;
                }
                return a.namaLengkap.localeCompare(b.namaLengkap);
            });
    }, [baseSantriList, statusTab, searchQuery, sortBy, printRombel, studentLegerMap, periodRecordsMap]);

    // Multi-Select Handlers
    const handleToggleSelectSantri = (id: number) => {
        setSelectedSantriIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleSelectAllFiltered = () => {
        setSelectedSantriIds(new Set(filteredSantriList.map(s => s.id)));
    };

    const handleSelectCompleteOnly = () => {
        const completeIds = filteredSantriList
            .filter(s => {
                const row = studentLegerMap.get(s.id);
                return row?.completenessStatus === 'Lengkap';
            })
            .map(s => s.id);
        setSelectedSantriIds(new Set(completeIds));
    };

    const handleDeselectAll = () => {
        setSelectedSantriIds(new Set());
    };

    // Single Preview Handlers
    const handleOpenPreview = (santriId: number) => {
        const idx = filteredSantriList.findIndex(s => s.id === santriId);
        if (idx !== -1) {
            setPreviewSantriIndex(idx);
            setIsPreviewOpen(true);
        }
    };

    const currentPreviewSantri = filteredSantriList[previewSantriIndex] || null;
    const currentPreviewRecord = currentPreviewSantri ? periodRecordsMap.get(currentPreviewSantri.id) || null : null;
    const currentPreviewRow = currentPreviewSantri ? studentLegerMap.get(currentPreviewSantri.id) : null;
    const currentPreviewEffectiveRank = getEffectiveRanking(currentPreviewRow?.ranking, rankingDisplayLimit);
    const currentPreviewCalculation = currentPreviewRow ? {
        totalNilai: currentPreviewRow.totalNilai,
        rataRata: currentPreviewRow.rataRata,
        ranking: currentPreviewEffectiveRank,
        totalSantri: currentPreviewEffectiveRank ? (baseSantriList.filter(s => s.rombelId === currentPreviewSantri?.rombelId).length || 1) : undefined,
        predikat: currentPreviewRow.predikat.predikat
    } : undefined;

    const handlePrevStudent = () => {
        if (previewSantriIndex > 0) {
            setPreviewSantriIndex(prev => prev - 1);
        }
    };

    const handleNextStudent = () => {
        if (previewSantriIndex < filteredSantriList.length - 1) {
            setPreviewSantriIndex(prev => prev + 1);
        }
    };

    // Helper to build batch data with ranking limit applied
    const buildBatchData = (targetSantri: Santri[], limit: RankingDisplayLimit) => {
        return targetSantri.map(santri => {
            const row = studentLegerMap.get(santri.id);
            const rombelTotal = baseSantriList.filter(s => s.rombelId === santri.rombelId).length;
            const effectiveRank = getEffectiveRanking(row?.ranking, limit);
            const calculation = row ? {
                totalNilai: row.totalNilai,
                rataRata: row.rataRata,
                ranking: effectiveRank,
                totalSantri: effectiveRank ? rombelTotal : undefined,
                predikat: row.predikat.predikat
            } : undefined;

            return {
                santri,
                record: periodRecordsMap.get(santri.id) || null,
                calculation
            };
        });
    };

    // Sync batchData when rankingDisplayLimit changes during active batch print modal
    useEffect(() => {
        if (isBatchPrinting && batchData.length > 0) {
            const targetSantri = batchData.map(b => b.santri);
            setBatchData(buildBatchData(targetSantri, rankingDisplayLimit));
        }
    }, [rankingDisplayLimit]);

    // Batch Print Execution
    const handleStartBatchPrint = () => {
        const targetSantri = selectedSantriIds.size > 0
            ? filteredSantriList.filter(s => selectedSantriIds.has(s.id))
            : filteredSantriList;

        if (targetSantri.length === 0) {
            showToast('Tidak ada santri yang dapat dicetak.', 'error');
            return;
        }

        const data = buildBatchData(targetSantri, rankingDisplayLimit);
        setBatchData(data);
        setIsBatchPrinting(true);
    };

    const selectedTemplate = useMemo(() => settings.raporTemplates?.find(t => t.id === selectedTemplateId), [selectedTemplateId, settings.raporTemplates]);

    const isTemplateHasCustomBiodata = useMemo(() => {
        if (!selectedTemplate) return false;
        return templateHasBuiltInBiodata(selectedTemplate);
    }, [selectedTemplate]);

    useEffect(() => {
        if (selectedTemplate) {
            if (selectedTemplate.fitToPage !== undefined) {
                setFitToPage(selectedTemplate.fitToPage);
            }
            if (selectedTemplate.printScale !== undefined) {
                setPrintScale(selectedTemplate.printScale);
            }
            if (selectedTemplate.marginMode !== undefined) {
                setMarginMode(selectedTemplate.marginMode);
            }
            if (selectedTemplate.paperSize !== undefined) {
                setPaperSize(selectedTemplate.paperSize);
            }
            if (selectedTemplate.showBiodataHeader !== undefined) {
                setShowBiodataHeader(selectedTemplate.showBiodataHeader);
            } else {
                // Default cerdas: jika template buatan user sudah memiliki tag biodata, matikan header bawaan
                const hasCustom = templateHasBuiltInBiodata(selectedTemplate);
                setShowBiodataHeader(!hasCustom);
            }
            if (selectedTemplate.showJudul !== undefined) {
                setShowJudul(selectedTemplate.showJudul);
            } else {
                setShowJudul('auto');
            }
        }
    }, [selectedTemplate]);

    const isTemplateHasCustomTitle = useMemo(() => {
        if (!selectedTemplate) return false;
        const sheets = getTemplateSheets(selectedTemplate);
        return sheets.some(sh => {
            if (sh.customTitle && sh.customTitle.trim()) return true;
            if (!sh.cells) return false;
            return sh.cells.slice(0, 3).some(row =>
                row.some(cell => {
                    if (!cell || !cell.value) return false;
                    const up = cell.value.toUpperCase();
                    return up.includes('RAPOR') || up.includes('LAPORAN HASIL') || up.includes('CAPAIAN KOMPETENSI') || up.includes('HASIL EVALUASI');
                })
            );
        });
    }, [selectedTemplate]);

    const effectiveShowBiodata = showBiodataHeader === 'auto'
        ? !isTemplateHasCustomBiodata
        : showBiodataHeader;

    const effectiveShowJudul = showJudul === 'auto'
        ? (selectedTemplate?.showJudul !== undefined ? selectedTemplate.showJudul : true)
        : showJudul;

    const templateSheets = useMemo(() => {
        if (!selectedTemplate) return [];
        return getTemplateSheets(selectedTemplate);
    }, [selectedTemplate]);

    return (
        <div className="space-y-6 animate-fade-in relative">
            <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-xs border border-slate-200">
                {/* Header Title & Batch Trigger */}
                <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 mb-6 border-b border-slate-100 pb-5">
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-xl font-black text-slate-800 tracking-tight">Layanan Cetak Rapor</h3>
                            <span className="bg-teal-50 text-teal-700 text-xs font-bold px-2.5 py-0.5 rounded-full border border-teal-200">
                                Fase 3 Production
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 font-medium mt-1">
                            Manajemen cetak rapor otomatis, seleksi massal, format kertas A4/F4, dan integrasi kalkulasi peringkat
                        </p>
                    </div>

                    {/* Mobile Filter & Quick Print Actions */}
                    <div className="flex md:hidden gap-2 w-full">
                        <button
                            onClick={() => setIsFilterDrawerOpen(true)}
                            className="flex-grow flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-50 text-teal-700 border border-teal-200 rounded-xl font-bold text-sm shadow-xs"
                        >
                            <i className="bi bi-funnel-fill"></i>
                            <span>Filter</span>
                        </button>
                        <button
                            onClick={handleStartBatchPrint}
                            disabled={filteredSantriList.length === 0}
                            className="shrink-0 px-4 h-[44px] bg-teal-600 text-white rounded-xl flex items-center justify-center gap-2 font-bold text-sm shadow-sm active:scale-95 transition-all disabled:opacity-50"
                        >
                            <i className="bi bi-printer-fill"></i>
                            <span>{selectedSantriIds.size > 0 ? `Cetak (${selectedSantriIds.size})` : `Cetak (${filteredSantriList.length})`}</span>
                        </button>
                    </div>

                    {/* Desktop Batch Print Trigger */}
                    <div className="hidden md:flex items-center gap-3">
                        {selectedSantriIds.size > 0 && (
                            <button
                                onClick={handleDeselectAll}
                                className="text-xs text-slate-500 hover:text-slate-700 font-semibold px-2 py-1"
                            >
                                Batalkan ({selectedSantriIds.size})
                            </button>
                        )}
                        <button
                            onClick={handleStartBatchPrint}
                            disabled={filteredSantriList.length === 0}
                            className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-xl text-sm font-black flex items-center gap-2 shadow-sm transition-all active:scale-95"
                        >
                            <i className="bi bi-printer-fill"></i>
                            <span>
                                {selectedSantriIds.size > 0
                                    ? `Cetak Terpilih (${selectedSantriIds.size} Santri)`
                                    : `Cetak Massal (${filteredSantriList.length} Santri)`}
                            </span>
                        </button>
                    </div>
                </div>

                {/* Filter Grid (Desktop) */}
                <div className={`hidden md:grid grid-cols-2 ${templateSheets.length > 1 ? 'lg:grid-cols-6' : 'lg:grid-cols-5'} gap-3.5 mb-5`}>
                    <div className="flex flex-col">
                        <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1 tracking-wider pl-1">Tahun Ajaran</label>
                        <select
                            value={filterTahun}
                            onChange={e => setFilterTahun(e.target.value)}
                            className="w-full border border-slate-200 rounded-xl p-2.5 text-sm font-bold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-500 transition-all"
                        >
                            {(availableYears.length > 0 ? availableYears : [defaultAcademicYear]).map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex flex-col">
                        <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1 tracking-wider pl-1">Semester</label>
                        <select
                            value={filterSemester}
                            onChange={e => setFilterSemester(e.target.value as any)}
                            className="w-full border border-slate-200 rounded-xl p-2.5 text-sm font-bold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-500 transition-all"
                        >
                            <option value="Ganjil">Ganjil</option>
                            <option value="Genap">Genap</option>
                        </select>
                    </div>

                    <div className="flex flex-col">
                        <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1 tracking-wider pl-1">Jenjang / Marhalah</label>
                        <select
                            value={filterJenjang}
                            onChange={e => { setFilterJenjang(e.target.value); setPrintRombel(''); }}
                            className="w-full border border-slate-200 rounded-xl p-2.5 text-sm font-bold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-500 transition-all"
                        >
                            <option value="">Semua Jenjang</option>
                            {settings.jenjang.map(j => <option key={j.id} value={j.id}>{j.nama}</option>)}
                        </select>
                    </div>

                    <div className="flex flex-col">
                        <label className="block text-[11px] font-bold text-teal-700 uppercase mb-1 tracking-wider pl-1">Pilih Rombel</label>
                        <select
                            value={printRombel}
                            onChange={e => setPrintRombel(e.target.value)}
                            className="w-full border-2 border-teal-100 rounded-xl p-2.5 text-sm font-black bg-teal-50/30 focus:bg-white focus:ring-2 focus:ring-teal-500 transition-all"
                        >
                            <option value="">Semua Rombel ({availableRombels.length})</option>
                            {availableRombels.map(r => <option key={r.id} value={r.id}>{r.nama}</option>)}
                        </select>
                    </div>

                    <div className="flex flex-col">
                        <label className="block text-[11px] font-bold text-amber-700 uppercase mb-1 tracking-wider pl-1">Desain Template</label>
                        <select
                            value={selectedTemplateId}
                            onChange={e => setSelectedTemplateId(e.target.value)}
                            className="w-full border-2 border-amber-100 rounded-xl p-2.5 text-sm font-black bg-amber-50/30 focus:bg-white focus:ring-2 focus:ring-amber-500 transition-all"
                        >
                            <option value="">Standar K13 (Mapel Otomatis)</option>
                            {filteredTemplates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </div>

                    {templateSheets.length > 1 && (
                        <div className="flex flex-col">
                            <label className="block text-[11px] font-bold text-indigo-700 uppercase mb-1 tracking-wider pl-1">
                                Lembar / Format
                            </label>
                            <select
                                value={selectedPrintSheetId}
                                onChange={e => setSelectedPrintSheetId(e.target.value)}
                                className="w-full border-2 border-indigo-100 rounded-xl p-2.5 text-sm font-black bg-indigo-50/30 focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all"
                            >
                                <option value="all">Semua Lembar ({templateSheets.length})</option>
                                {templateSheets.map((sh, idx) => (
                                    <option key={sh.id} value={sh.id}>
                                        Lembar {idx + 1}: {sh.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                {/* Print Settings & Titimangsa Toolbar */}
                <div className="mb-5 p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
                    {/* Titimangsa Controls */}
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2 text-slate-700 font-bold text-xs shrink-0">
                            <i className="bi bi-calendar-check text-base text-teal-600"></i>
                            <span>Titimangsa Rapor:</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={tempatRapor}
                                onChange={e => setTempatRapor(e.target.value)}
                                placeholder="Kota (Contoh: Banyumas)"
                                className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 w-36 sm:w-44"
                                title="Kota / Tempat Ditetapkannya Rapor"
                            />
                            <span className="text-slate-400 font-bold">,</span>
                            <input
                                type="date"
                                value={tanggalRapor}
                                onChange={e => setTanggalRapor(e.target.value)}
                                className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                                title="Tanggal Diresmikan / Dikeluarkannya Rapor"
                            />
                        </div>
                        <button
                            onClick={handleSaveUniversalDate}
                            disabled={isSavingUniversalDate}
                            title="Simpan tanggal & tempat ini sebagai default universal untuk semua santri"
                            className="bg-white hover:bg-slate-100 text-teal-700 border border-teal-200 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                        >
                            {isSavingUniversalDate ? <span className="animate-spin h-3 w-3 border-2 border-teal-600 border-t-transparent rounded-full"></span> : <i className="bi bi-floppy"></i>}
                            <span className="hidden sm:inline">Set Default</span>
                        </button>
                    </div>

                    {/* Print Output Controls (Paper size & Kop) */}
                    <div className="flex flex-wrap items-center gap-3 self-end lg:self-auto border-t lg:border-t-0 pt-3 lg:pt-0">
                        {/* Paper Size Switch */}
                        <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-xs">
                            <button
                                onClick={() => setPaperSize('A4')}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${paperSize === 'A4' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                            >
                                A4
                            </button>
                            <button
                                onClick={() => setPaperSize('F4')}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${paperSize === 'F4' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                                title="F4 / Folio (21.5 x 33.0 cm)"
                            >
                                F4 (Folio)
                            </button>
                        </div>

                        {/* Fit to 1 Page (Paksa Pas 1 Muka) */}
                        <button
                            type="button"
                            onClick={() => setFitToPage(prev => !prev)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                                fitToPage ? 'bg-indigo-50 text-indigo-800 border-indigo-200 shadow-2xs' : 'bg-slate-100 text-slate-500 border-slate-200'
                            }`}
                            title="Fit to 1 Page: Memaksa desain rapor pas tepat dalam 1 lembar tanpa meluber ke halaman 2 seperti di Excel"
                        >
                            <i className={`bi ${fitToPage ? 'bi-file-earmark-check-fill text-indigo-600' : 'bi-file-earmark'}`}></i>
                            <span>{fitToPage ? 'Pas 1 Lembar' : 'Tinggi Bebas'}</span>
                        </button>

                        {/* Skala Cetak */}
                        <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-xs shadow-xs">
                            <i className="bi bi-aspect-ratio text-slate-500 text-xs"></i>
                            <span className="font-bold text-slate-500 text-[11px] hidden sm:inline">Skala:</span>
                            <select
                                value={String(printScale)}
                                onChange={e => {
                                    const v = e.target.value;
                                    setPrintScale(v === 'auto' ? 'auto' : parseInt(v, 10));
                                }}
                                className="font-bold text-xs bg-transparent text-slate-800 focus:outline-none cursor-pointer"
                                title="Skala cetak rapor. Pilih 'Auto Fit' agar pas 1 lembar atau tentukan persen ukuran"
                            >
                                <option value="auto">Auto Fit (1 Muka)</option>
                                <option value="100">100% (Normal)</option>
                                <option value="95">95%</option>
                                <option value="90">90%</option>
                                <option value="85">85%</option>
                                <option value="80">80%</option>
                                <option value="75">75%</option>
                            </select>
                        </div>

                        {/* Toggle Biodata Otomatis (Nama, NIS, Rombel, Ranking) */}
                        <button
                            type="button"
                            onClick={() => setShowBiodataHeader(prev => (prev === 'auto' ? isTemplateHasCustomBiodata : !prev))}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                                effectiveShowBiodata
                                    ? 'bg-blue-50 text-blue-800 border-blue-200 shadow-2xs'
                                    : 'bg-slate-100 text-slate-500 border-slate-200'
                            }`}
                            title={
                                isTemplateHasCustomBiodata
                                    ? "Template ini sudah memiliki format nama/nis/rombel sendiri di tabelnya. Header bawaan dinonaktifkan agar tidak muncul dobel."
                                    : "Aktifkan atau nonaktifkan header identitas santri bawaan sistem"
                            }
                        >
                            <i className={`bi ${effectiveShowBiodata ? 'bi-person-badge-fill text-blue-600' : 'bi-person-x text-slate-400'}`}></i>
                            <span>{effectiveShowBiodata ? 'Biodata: Aktif' : 'Biodata: Nonaktif'}</span>
                            {isTemplateHasCustomBiodata && !effectiveShowBiodata && (
                                <span className="bg-amber-100 text-amber-800 text-[9px] font-black px-1.5 py-0.5 rounded-md hidden xl:inline" title="Format santri dibuat mandiri di dalam tabel desain">
                                    Format Sendiri
                                </span>
                            )}
                        </button>

                        {/* Kop Toggle */}
                        <button
                            onClick={() => setShowKop(prev => !prev)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${showKop ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}
                            title="Toggle tampilan Kop Lembaga (nonaktifkan jika mencetak pada kertas berkop cetak sendiri)"
                        >
                            <i className={`bi ${showKop ? 'bi-check-circle-fill text-emerald-600' : 'bi-circle'}`}></i>
                            <span>{showKop ? 'Kop Aktif' : 'Tanpa Kop'}</span>
                        </button>

                        {/* Judul Rapor Toggle (Bisa 1-3 Baris) & Tombol Atur Judul */}
                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                onClick={() => setShowJudul(prev => (prev === 'auto' ? (isTemplateHasCustomTitle ? true : false) : !prev))}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                                    effectiveShowJudul ? 'bg-amber-50 text-amber-800 border-amber-200 shadow-2xs' : 'bg-slate-100 text-slate-500 border-slate-200'
                                }`}
                                title={
                                    effectiveShowJudul
                                        ? "Judul dokumen rapor di bawah Kop sedang aktif (teks 1-3 baris). Klik untuk sembunyikan jika judul sudah didesain di dalam tabel."
                                        : "Judul dokumen rapor di bawah Kop dinonaktifkan."
                                }
                            >
                                <i className={`bi ${effectiveShowJudul ? 'bi-card-heading text-amber-600' : 'bi-card-text text-slate-400'}`}></i>
                                <span>{effectiveShowJudul ? 'Judul: Aktif' : 'Judul: Nonaktif'}</span>
                                {isTemplateHasCustomTitle && !effectiveShowJudul && (
                                    <span className="bg-amber-100 text-amber-800 text-[9px] font-black px-1.5 py-0.5 rounded-md hidden xl:inline" title="Judul rapor dibuat mandiri di dalam tabel sel desain">
                                        Format Sendiri
                                    </span>
                                )}
                            </button>
                            {selectedTemplate && (
                                <button
                                    type="button"
                                    onClick={() => setIsTitleModalOpen(true)}
                                    className="px-2.5 py-1.5 rounded-xl text-xs font-bold border border-amber-300 bg-amber-100/90 hover:bg-amber-200 text-amber-900 transition-all flex items-center gap-1 shadow-2xs"
                                    title="Atur teks judul dokumen rapor resmi (bisa 1 - 3 baris dengan Enter dan tag otomatis)"
                                >
                                    <i className="bi bi-pencil-square text-amber-700"></i>
                                    <span className="hidden sm:inline">Atur 3 Baris</span>
                                </button>
                            )}
                        </div>

                        {/* Margins */}
                        <select
                            value={marginMode}
                            onChange={e => setMarginMode(e.target.value as any)}
                            className="border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold bg-white text-slate-700"
                            title="Pilihan Margin Kertas"
                        >
                            <option value="normal">Margin Normal</option>
                            <option value="narrow">Margin Sempit</option>
                            <option value="none">Tanpa Margin (Nol)</option>
                        </select>

                        {/* Batas Tampilan Ranking */}
                        <div className="flex items-center gap-1.5 bg-amber-50/70 border border-amber-200/80 rounded-xl px-2.5 py-1 text-xs">
                            <i className="bi bi-trophy-fill text-amber-500 text-xs"></i>
                            <span className="font-bold text-amber-900 text-[11px] hidden sm:inline">Batas Ranking:</span>
                            <select
                                value={rankingDisplayLimit}
                                onChange={e => setRankingDisplayLimit(e.target.value as RankingDisplayLimit)}
                                className="font-bold text-xs bg-transparent text-amber-950 focus:outline-none cursor-pointer"
                                title="Atur batasan peringkat kelas yang dicetak pada rapor santri"
                            >
                                <option value="all">Semua Peringkat (1 s.d. Selesai)</option>
                                <option value="3">Hanya Top 3 (Juara 1 - 3)</option>
                                <option value="5">Hanya Top 5 (Juara 1 - 5)</option>
                                <option value="10">Hanya Top 10 (Juara 1 - 10)</option>
                                <option value="none">Sembunyikan Ranking (Off)</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Sub-bar: Search, Filter Tabs & Selection Tools */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
                    {/* Status Tabs */}
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                        <button
                            onClick={() => setStatusTab('all')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${statusTab === 'all' ? 'bg-slate-800 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        >
                            Semua ({counts.all})
                        </button>
                        <button
                            onClick={() => setStatusTab('complete')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${statusTab === 'complete' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}
                        >
                            <i className="bi bi-check-circle"></i>
                            <span>Siap Cetak ({counts.complete})</span>
                        </button>
                        <button
                            onClick={() => setStatusTab('partial')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${statusTab === 'partial' ? 'bg-amber-600 text-white shadow-xs' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'}`}
                        >
                            <i className="bi bi-exclamation-circle"></i>
                            <span>Sebagian ({counts.partial})</span>
                        </button>
                        <button
                            onClick={() => setStatusTab('empty')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${statusTab === 'empty' ? 'bg-rose-600 text-white shadow-xs' : 'bg-rose-50 text-rose-700 hover:bg-rose-100'}`}
                        >
                            <i className="bi bi-dash-circle"></i>
                            <span>Belum Diisi ({counts.empty})</span>
                        </button>
                    </div>

                    {/* Search & Sort Controls */}
                    <div className="flex items-center gap-2">
                        <div className="relative flex-grow sm:w-56">
                            <i className="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Cari santri / NIS..."
                                className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    <i className="bi bi-x-circle-fill text-xs"></i>
                                </button>
                            )}
                        </div>

                        <select
                            value={sortBy}
                            onChange={e => setSortBy(e.target.value as any)}
                            className="border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold bg-white text-slate-700"
                        >
                            <option value="name">Urut Nama</option>
                            <option value="rank">Urut Ranking</option>
                            <option value="nis">Urut NIS</option>
                        </select>
                    </div>
                </div>

                {/* Selection Action Ribbon */}
                <div className="bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 mb-4 text-xs font-semibold text-slate-600">
                    <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                            <input
                                type="checkbox"
                                checked={filteredSantriList.length > 0 && selectedSantriIds.size === filteredSantriList.length}
                                onChange={e => {
                                    if (e.target.checked) handleSelectAllFiltered();
                                    else handleDeselectAll();
                                }}
                                className="rounded text-teal-600 focus:ring-teal-500 w-4 h-4 cursor-pointer"
                            />
                            <span>Pilih Semua yang Tampil ({filteredSantriList.length})</span>
                        </label>

                        <button
                            onClick={handleSelectCompleteOnly}
                            className="text-teal-700 hover:text-teal-800 font-bold hover:underline"
                        >
                            Pilih Hanya yang Siap Cetak
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        <span>Terpilih: <strong className="text-teal-700">{selectedSantriIds.size}</strong> santri</span>
                        {selectedSantriIds.size > 0 && (
                            <button
                                onClick={handleDeselectAll}
                                className="text-slate-400 hover:text-rose-600 font-bold"
                            >
                                Reset
                            </button>
                        )}
                    </div>
                </div>

                {/* Student Roster List */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                    <div className="max-h-[540px] overflow-y-auto divide-y divide-slate-100 no-scrollbar sm:scrollbar">
                        {filteredSantriList.map((santri, idx) => {
                            const isSelected = selectedSantriIds.has(santri.id);
                            const row = studentLegerMap.get(santri.id);
                            const hasRecord = periodRecordsMap.has(santri.id);
                            const status = row?.completenessStatus || (hasRecord ? 'Sebagian' : 'Kosong');
                            const rombel = settings.rombel.find(r => r.id === santri.rombelId);

                            return (
                                <div
                                    key={santri.id}
                                    className={`flex items-center justify-between p-3 sm:p-4 transition-colors group ${isSelected ? 'bg-teal-50/40' : 'hover:bg-slate-50/80'}`}
                                >
                                    {/* Left: Checkbox + Number + Student Details */}
                                    <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => handleToggleSelectSantri(santri.id)}
                                            className="rounded text-teal-600 focus:ring-teal-500 w-4 h-4 cursor-pointer shrink-0"
                                        />

                                        <span className="hidden xs:flex w-7 h-7 rounded-lg bg-slate-100 text-slate-500 items-center justify-center text-[10px] font-black group-hover:bg-teal-50 group-hover:text-teal-700 transition-colors shrink-0">
                                            {idx + 1}
                                        </span>

                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                                <span className="font-black text-xs sm:text-sm text-slate-800 truncate">
                                                    {santri.namaLengkap}
                                                </span>

                                                {/* Ranking Badge */}
                                                {row && row.ranking > 0 && (() => {
                                                    const isHidden = rankingDisplayLimit !== 'all' && (
                                                        rankingDisplayLimit === 'none' ||
                                                        (rankingDisplayLimit === '3' && row.ranking > 3) ||
                                                        (rankingDisplayLimit === '5' && row.ranking > 5) ||
                                                        (rankingDisplayLimit === '10' && row.ranking > 10)
                                                    );
                                                    return (
                                                        <span
                                                            className={`${isHidden ? 'bg-slate-100 text-slate-500 border border-slate-200' : 'bg-indigo-50 text-indigo-700 border border-indigo-200'} text-[10px] font-black px-2 py-0.5 rounded-md flex items-center gap-1`}
                                                            title={isHidden ? 'Peringkat ini disembunyikan pada cetak rapor sesuai batas tampilan' : 'Peringkat akan dicetak pada rapor'}
                                                        >
                                                            <i className={`bi bi-award-fill ${isHidden ? 'text-slate-400' : 'text-amber-500'}`}></i>
                                                            <span>Juara #{row.ranking}</span>
                                                            {isHidden && <span className="text-[9px] text-slate-400 font-normal italic">(Off di Rapor)</span>}
                                                        </span>
                                                    );
                                                })()}

                                                {/* Rata-rata Score Badge */}
                                                {row && row.rataRata > 0 && (
                                                    <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                                                        Rerata: {row.rataRataFormatted} ({row.predikat.predikat})
                                                    </span>
                                                )}
                                            </div>

                                            <div className="text-[10px] text-slate-400 flex items-center gap-2 font-semibold">
                                                <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                                                    NIS: {santri.nis || '-'}
                                                </span>
                                                <span className="text-teal-700 bg-teal-50 px-2 py-0.5 rounded font-bold">
                                                    {rombel?.nama || 'Tanpa Rombel'}
                                                </span>

                                                {/* Status indicator badge */}
                                                {status === 'Lengkap' ? (
                                                    <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                                                        <i className="bi bi-check-circle-fill text-emerald-600"></i>
                                                        <span>Lengkap</span>
                                                    </span>
                                                ) : status === 'Sebagian' ? (
                                                    <span className="bg-amber-50 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                                                        <i className="bi bi-exclamation-circle-fill text-amber-500"></i>
                                                        <span>Sebagian ({row?.percentComplete || 50}%)</span>
                                                    </span>
                                                ) : (
                                                    <span className="bg-rose-50 text-rose-600 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                                                        <i className="bi bi-dash-circle-fill text-rose-500"></i>
                                                        <span>Belum Diisi</span>
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right: Actions */}
                                    <div className="flex items-center gap-2 shrink-0 ml-2">
                                        {status !== 'Lengkap' && onNavigateToTab && (
                                            <button
                                                onClick={() => onNavigateToTab('input_wali', santri.rombelId)}
                                                className="hidden sm:flex bg-slate-50 hover:bg-teal-50 text-slate-600 hover:text-teal-700 border border-slate-200 hover:border-teal-200 px-3 py-1.5 rounded-xl text-xs font-bold transition-all items-center gap-1.5"
                                                title="Input atau lengkapi nilai santri ini di Lembar Wali Kelas"
                                            >
                                                <i className="bi bi-pencil-square text-xs"></i>
                                                <span>Isi Nilai</span>
                                            </button>
                                        )}

                                        <button
                                            onClick={() => handleOpenPreview(santri.id)}
                                            className="bg-white hover:bg-teal-600 text-teal-700 hover:text-white px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 border border-teal-200 hover:border-teal-600 shadow-xs active:scale-95"
                                        >
                                            <i className="bi bi-eye-fill"></i>
                                            <span>Pratinjau</span>
                                        </button>
                                    </div>
                                </div>
                            );
                        })}

                        {filteredSantriList.length === 0 && (
                            <div className="p-12 text-center text-slate-400 italic bg-slate-50/50">
                                <i className="bi bi-person-dash text-4xl mb-3 block opacity-20"></i>
                                Tidak ada santri aktif sesuai filter yang dipilih.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* SINGLE PREVIEW MODAL WITH SLIDER NAVIGATION */}
            {isPreviewOpen && currentPreviewSantri && (
                <div className="fixed inset-0 bg-black/75 z-[70] flex justify-center items-center p-2 sm:p-4 animate-fade-in backdrop-blur-xs">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[92vh] flex flex-col overflow-hidden border border-slate-200">
                        {/* Modal Header */}
                        <div className="p-3.5 sm:p-4 border-b border-slate-200 flex flex-wrap justify-between items-center bg-slate-50 gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                                {/* Navigation Carousel Controls */}
                                <div className="flex items-center bg-white border border-slate-200 rounded-xl p-0.5 shadow-xs">
                                    <button
                                        onClick={handlePrevStudent}
                                        disabled={previewSantriIndex <= 0}
                                        className="p-1.5 text-slate-600 hover:text-teal-700 disabled:opacity-30 disabled:hover:text-slate-600 transition-all rounded-lg"
                                        title="Santri Sebelumnya"
                                    >
                                        <i className="bi bi-chevron-left text-sm font-bold"></i>
                                    </button>
                                    <span className="text-[11px] font-black text-slate-700 px-2">
                                        {previewSantriIndex + 1} / {filteredSantriList.length}
                                    </span>
                                    <button
                                        onClick={handleNextStudent}
                                        disabled={previewSantriIndex >= filteredSantriList.length - 1}
                                        className="p-1.5 text-slate-600 hover:text-teal-700 disabled:opacity-30 disabled:hover:text-slate-600 transition-all rounded-lg"
                                        title="Santri Selanjutnya"
                                    >
                                        <i className="bi bi-chevron-right text-sm font-bold"></i>
                                    </button>
                                </div>

                                <div className="min-w-0">
                                    <h3 className="text-sm sm:text-base font-black text-slate-800 truncate">
                                        {currentPreviewSantri.namaLengkap}
                                    </h3>
                                    <div className="text-[10px] text-slate-500 font-bold flex items-center gap-2">
                                        <span>NIS: {currentPreviewSantri.nis}</span>
                                        {currentPreviewCalculation?.ranking ? (
                                            <span className="text-indigo-600 font-bold">
                                                Juara #{currentPreviewCalculation.ranking}
                                            </span>
                                        ) : currentPreviewRow?.ranking && currentPreviewRow.ranking > 0 ? (
                                            <span className="text-slate-400 font-medium italic">
                                                Rank #{currentPreviewRow.ranking} (Off di Rapor)
                                            </span>
                                        ) : null}
                                        <span>• Format: {paperSize}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Modal Header Right: Actions */}
                            <div className="flex items-center gap-2 shrink-0">
                                {templateSheets.length > 1 && (
                                    <select
                                        value={selectedPrintSheetId}
                                        onChange={e => setSelectedPrintSheetId(e.target.value)}
                                        className="px-2.5 py-1.5 bg-indigo-50 border border-indigo-200 rounded-xl text-xs font-bold text-indigo-800 hover:bg-indigo-100 transition-all focus:outline-none"
                                        title="Pilih Lembar / Format yang ditampilkan"
                                    >
                                        <option value="all">Semua Lembar ({templateSheets.length})</option>
                                        {templateSheets.map(sh => (
                                            <option key={sh.id} value={sh.id}>{sh.name}</option>
                                        ))}
                                    </select>
                                )}

                                <select
                                    value={rankingDisplayLimit}
                                    onChange={e => setRankingDisplayLimit(e.target.value as RankingDisplayLimit)}
                                    className="px-2.5 py-1.5 bg-amber-50 border border-amber-200 rounded-xl text-xs font-bold text-amber-900 focus:outline-none cursor-pointer"
                                    title="Batasi tampilan peringkat pada cetak rapor"
                                >
                                    <option value="all">Rank: Semua</option>
                                    <option value="3">Rank: Top 3</option>
                                    <option value="5">Rank: Top 5</option>
                                    <option value="10">Rank: Top 10</option>
                                    <option value="none">Rank: Off</option>
                                </select>

                                <button
                                    onClick={() => setPaperSize(prev => prev === 'A4' ? 'F4' : 'A4')}
                                    className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all"
                                    title="Ganti ukuran kertas (A4 / F4)"
                                >
                                    Kertas: {paperSize}
                                </button>

                                <button
                                    onClick={() => setShowKop(prev => !prev)}
                                    className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all ${showKop ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}
                                    title="Toggle Kop"
                                >
                                    {showKop ? 'Ada Kop' : 'Tanpa Kop'}
                                </button>

                                <button
                                    onClick={() => printToPdfNative('rapor-preview-container', `Rapor_${currentPreviewSantri.namaLengkap.replace(/\s+/g, '_')}_${filterTahun.replace('/', '-')}`, { paperSize })}
                                    className="bg-teal-600 hover:bg-teal-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-black shadow-xs flex items-center gap-1.5 transition-all"
                                >
                                    <i className="bi bi-printer"></i>
                                    <span>Cetak PDF</span>
                                </button>

                                <button
                                    onClick={() => setIsPreviewOpen(false)}
                                    className="w-8 h-8 rounded-xl bg-slate-100 text-slate-500 hover:text-slate-800 hover:bg-slate-200 flex items-center justify-center transition-all ml-1"
                                    title="Tutup Pratinjau"
                                >
                                    <i className="bi bi-x-lg text-sm"></i>
                                </button>
                            </div>
                        </div>

                        {/* Modal Body: Render Area */}
                        <div className="flex-grow overflow-auto bg-slate-200/90 p-4 sm:p-8 flex justify-center">
                            <div id="rapor-preview-container">
                                {selectedTemplate ? (
                                    <DynamicRaporPreview
                                        template={selectedTemplate}
                                        targetSheetId={selectedPrintSheetId}
                                        santri={currentPreviewSantri}
                                        record={currentPreviewRecord}
                                        settings={settings}
                                        digitalAssets={digitalAssets}
                                        tanggalRapor={tanggalRapor}
                                        tempatRapor={tempatRapor}
                                        calculation={currentPreviewCalculation}
                                        paperSize={paperSize}
                                        showKop={showKop}
                                        marginMode={marginMode}
                                        fitToPage={fitToPage}
                                        printScale={printScale}
                                        showJudul={effectiveShowJudul}
                                        showBiodataHeader={effectiveShowBiodata}
                                    />
                                ) : (
                                    <div
                                        className="bg-white shadow-lg p-8 printable-content-wrapper"
                                        style={{ width: paperSize === 'F4' ? '21.5cm' : '21cm', minHeight: paperSize === 'F4' ? '33cm' : '29.7cm', padding: marginMode === 'narrow' ? '1.2cm' : marginMode === 'none' ? '0.4cm' : '2cm' }}
                                    >
                                        <RaporLengkapTemplate
                                            santri={currentPreviewSantri}
                                            settings={settings}
                                            options={{
                                                tahunAjaran: filterTahun,
                                                semester: filterSemester,
                                                tanggalRapor,
                                                tempatRapor,
                                                showKop,
                                                paperSize
                                            }}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* BATCH PRINT MODAL */}
            {isBatchPrinting && batchData.length > 0 && (
                <div className="fixed inset-0 bg-black/75 z-[70] flex justify-center items-center p-2 sm:p-4 animate-fade-in backdrop-blur-xs">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[92vh] flex flex-col overflow-hidden border border-slate-200">
                        {/* Modal Header */}
                        <div className="p-3.5 sm:p-4 border-b border-slate-200 flex flex-wrap justify-between items-center bg-slate-50 gap-3">
                            <div>
                                <h3 className="text-sm sm:text-base font-black text-slate-800">
                                    Cetak Massal ({batchData.length} Dokumen Rapor)
                                </h3>
                                <p className="text-[10px] text-slate-500 font-bold">
                                    Ukuran: {paperSize} • Kop: {showKop ? 'Aktif' : 'Nonaktif'} • Setiap santri dicetak pada halaman baru
                                </p>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                                {templateSheets.length > 1 && (
                                    <select
                                        value={selectedPrintSheetId}
                                        onChange={e => setSelectedPrintSheetId(e.target.value)}
                                        className="px-2.5 py-1.5 bg-indigo-50 border border-indigo-200 rounded-xl text-xs font-bold text-indigo-800 hover:bg-indigo-100 transition-all focus:outline-none"
                                        title="Pilih Format / Lembar untuk cetak massal"
                                    >
                                        <option value="all">Semua Format ({templateSheets.length})</option>
                                        {templateSheets.map(sh => (
                                            <option key={sh.id} value={sh.id}>Cetak: {sh.name}</option>
                                        ))}
                                    </select>
                                )}

                                <select
                                    value={rankingDisplayLimit}
                                    onChange={e => setRankingDisplayLimit(e.target.value as RankingDisplayLimit)}
                                    className="px-2.5 py-1.5 bg-amber-50 border border-amber-200 rounded-xl text-xs font-bold text-amber-900 focus:outline-none cursor-pointer"
                                    title="Batasi tampilan peringkat pada cetak rapor massal"
                                >
                                    <option value="all">Rank: Semua</option>
                                    <option value="3">Rank: Top 3</option>
                                    <option value="5">Rank: Top 5</option>
                                    <option value="10">Rank: Top 10</option>
                                    <option value="none">Rank: Off</option>
                                </select>

                                <button
                                    onClick={() => setPaperSize(prev => prev === 'A4' ? 'F4' : 'A4')}
                                    className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all"
                                >
                                    Format: {paperSize}
                                </button>

                                <button
                                    onClick={() => setShowKop(prev => !prev)}
                                    className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all ${showKop ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}
                                >
                                    {showKop ? 'Kop Aktif' : 'Tanpa Kop'}
                                </button>

                                <button
                                    onClick={() => printToPdfNative('batch-print-container', `Rapor_Massal_${filterTahun.replace('/', '-')}_${filterSemester}`, { paperSize })}
                                    className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-xl text-xs font-black shadow-xs flex items-center gap-1.5 transition-all"
                                >
                                    <i className="bi bi-printer-fill"></i>
                                    <span>Mulai Cetak Semua ({batchData.length})</span>
                                </button>

                                <button
                                    onClick={() => setIsBatchPrinting(false)}
                                    className="w-8 h-8 rounded-xl bg-slate-100 text-slate-500 hover:text-slate-800 hover:bg-slate-200 flex items-center justify-center transition-all ml-1"
                                >
                                    <i className="bi bi-x-lg text-sm"></i>
                                </button>
                            </div>
                        </div>

                        {/* Modal Body: Continuous Batch Render */}
                        <div className="flex-grow overflow-auto bg-slate-200/90 p-4 sm:p-8 flex justify-center">
                            <div id="batch-print-container" className="space-y-8">
                                {batchData.map((item, idx) => (
                                    <div
                                        key={item.santri.id}
                                        className="page-break-after"
                                        style={{ pageBreakAfter: 'always', breakAfter: 'page' }}
                                    >
                                        {selectedTemplate ? (
                                            <DynamicRaporPreview
                                                template={selectedTemplate}
                                                targetSheetId={selectedPrintSheetId}
                                                santri={item.santri}
                                                record={item.record}
                                                settings={settings}
                                                digitalAssets={digitalAssets}
                                                tanggalRapor={tanggalRapor}
                                                tempatRapor={tempatRapor}
                                                calculation={item.calculation}
                                                paperSize={paperSize}
                                                showKop={showKop}
                                                marginMode={marginMode}
                                                fitToPage={fitToPage}
                                                printScale={printScale}
                                                showJudul={effectiveShowJudul}
                                                showBiodataHeader={effectiveShowBiodata}
                                            />
                                        ) : (
                                            <div
                                                className="bg-white shadow-lg p-8 printable-content-wrapper"
                                                style={{ width: paperSize === 'F4' ? '21.5cm' : '21cm', minHeight: paperSize === 'F4' ? '33cm' : '29.7cm', padding: marginMode === 'narrow' ? '1.2cm' : marginMode === 'none' ? '0.4cm' : '2cm' }}
                                            >
                                                <RaporLengkapTemplate
                                                    santri={item.santri}
                                                    settings={settings}
                                                    options={{
                                                        tahunAjaran: filterTahun,
                                                        semester: filterSemester,
                                                        tanggalRapor,
                                                        tempatRapor,
                                                        showKop,
                                                        paperSize
                                                    }}
                                                />
                                            </div>
                                        )}
                                        {/* CSS Page Break for Batch Print */}
                                        <div style={{ pageBreakAfter: 'always', breakAfter: 'page' }}></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Mobile Filter Drawer */}
            <MobileFilterDrawer
                isOpen={isFilterDrawerOpen}
                onClose={() => setIsFilterDrawerOpen(false)}
                title="Filter Cetak Rapor"
            >
                <div className="space-y-5">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 tracking-wider pl-1">Tahun Ajaran</label>
                            <select
                                value={filterTahun}
                                onChange={e => setFilterTahun(e.target.value)}
                                className="w-full border border-slate-200 rounded-xl p-2.5 text-sm font-bold bg-white"
                            >
                                {(availableYears.length > 0 ? availableYears : [defaultAcademicYear]).map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        </div>
                        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 tracking-wider pl-1">Semester</label>
                            <select
                                value={filterSemester}
                                onChange={e => setFilterSemester(e.target.value as any)}
                                className="w-full border border-slate-200 rounded-xl p-2.5 text-sm font-bold bg-white"
                            >
                                <option value="Ganjil">Ganjil</option>
                                <option value="Genap">Genap</option>
                            </select>
                        </div>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-wider pl-1">Jenjang</label>
                            <select
                                value={filterJenjang}
                                onChange={e => { setFilterJenjang(e.target.value); setPrintRombel(''); }}
                                className="w-full border border-slate-200 rounded-xl p-2.5 text-sm font-bold bg-white"
                            >
                                <option value="">Semua Jenjang</option>
                                {settings.jenjang.map(j => <option key={j.id} value={j.id}>{j.nama}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-wider pl-1">Rombel</label>
                            <select
                                value={printRombel}
                                onChange={e => setPrintRombel(e.target.value)}
                                className="w-full border border-teal-200 rounded-xl p-2.5 text-sm font-bold bg-teal-50/40"
                            >
                                <option value="">Semua Rombel</option>
                                {availableRombels.map(r => <option key={r.id} value={r.id}>{r.nama}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-wider pl-1">Template</label>
                            <select
                                value={selectedTemplateId}
                                onChange={e => setSelectedTemplateId(e.target.value)}
                                className="w-full border border-amber-200 rounded-xl p-2.5 text-sm font-bold bg-amber-50/40"
                            >
                                <option value="">Standar K13 (Mapel)</option>
                                {filteredTemplates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        </div>
                        {templateSheets.length > 1 && (
                            <div>
                                <label className="block text-[10px] font-black text-indigo-500 uppercase mb-1 tracking-wider pl-1">Lembar / Format</label>
                                <select
                                    value={selectedPrintSheetId}
                                    onChange={e => setSelectedPrintSheetId(e.target.value)}
                                    className="w-full border border-indigo-200 rounded-xl p-2.5 text-sm font-bold bg-indigo-50/40 text-indigo-900"
                                >
                                    <option value="all">Semua Lembar ({templateSheets.length})</option>
                                    {templateSheets.map((sh, idx) => (
                                        <option key={sh.id} value={sh.id}>Lembar {idx + 1}: {sh.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        {selectedTemplate && (
                            <button
                                type="button"
                                onClick={() => {
                                    setIsFilterDrawerOpen(false);
                                    setIsTitleModalOpen(true);
                                }}
                                className="w-full mt-2.5 py-2 px-3 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-2xs"
                            >
                                <i className="bi bi-pencil-square text-amber-700"></i>
                                <span>Atur Judul Rapor Resmi (1-3 Baris)</span>
                            </button>
                        )}
                    </div>

                    <div className="bg-teal-50/50 p-4 rounded-2xl border border-teal-100 space-y-3">
                        <h4 className="text-xs font-black text-teal-800 uppercase tracking-wider flex items-center gap-2">
                            <i className="bi bi-calendar-check"></i> Titimangsa Rapor
                        </h4>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tempat / Kota</label>
                            <input
                                type="text"
                                value={tempatRapor}
                                onChange={e => setTempatRapor(e.target.value)}
                                placeholder="Contoh: Banyumas"
                                className="w-full border border-slate-200 rounded-xl p-2.5 text-sm font-semibold bg-white"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tanggal Rapor</label>
                            <input
                                type="date"
                                value={tanggalRapor}
                                onChange={e => setTanggalRapor(e.target.value)}
                                className="w-full border border-slate-200 rounded-xl p-2.5 text-sm font-semibold bg-white"
                            />
                        </div>
                        <button
                            onClick={handleSaveUniversalDate}
                            disabled={isSavingUniversalDate}
                            className="w-full bg-teal-600 text-white p-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2"
                        >
                            <i className="bi bi-floppy"></i> Simpan Sebagai Default Universal
                        </button>
                    </div>
                </div>
            </MobileFilterDrawer>

            {/* Modal Atur Judul Rapor 1-3 Baris */}
            <RaporTitleEditModal
                isOpen={isTitleModalOpen}
                onClose={() => setIsTitleModalOpen(false)}
                template={selectedTemplate}
                settings={settings}
                selectedSheetId={selectedPrintSheetId}
                onSave={handleSaveRaporTitle}
                showToast={showToast}
            />
        </div>
    );
};
