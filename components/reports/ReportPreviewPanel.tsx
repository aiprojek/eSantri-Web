
import React, { useRef, useState, useEffect } from 'react';
import { ReportType } from '../../types';
import { generatePdf, printToPdfNative } from '../../utils/pdfGenerator';
import { exportReportToSvg } from '../../utils/svgExporter';
import { generateContactCsv } from '../../services/csvService';
import { exportSantriToExcel, exportContactsToExcel, exportArusKasToExcel, exportFinanceSummaryToExcel } from '../../services/excelService';

interface ReportPreviewPanelProps {
    previewContent: React.ReactNode | null;
    activeReport: ReportType;
    pageCount: number;
    isLoading: boolean;
    paperSize: string;
    onToast: (msg: string, type: 'success' | 'error' | 'info') => void;
    filteredSantri: any[]; // for CSV export
    settings: any; // for CSV export
    excelData?: any; // Extra data passed from parent for specific exports (Kas, Tagihan, etc)
}

export const ReportPreviewPanel: React.FC<ReportPreviewPanelProps> = ({ previewContent, activeReport, pageCount, isLoading, paperSize, onToast, filteredSantri, settings, excelData }) => {
    const previewContainerRef = useRef<HTMLDivElement>(null);
    const contentWrapperRef = useRef<HTMLDivElement>(null);
    const [manualZoom, setManualZoom] = useState(1);
    const [smartZoomScale, setSmartZoomScale] = useState(1);
    const [isGeneratingFile, setIsGeneratingFile] = useState(false);
    const [isDownloadMenuOpen, setIsDownloadMenuOpen] = useState(false);

    // Auto-fit zoom logic
    useEffect(() => {
        const calculateZoom = () => {
            if (previewContainerRef.current && contentWrapperRef.current) {
                const containerW = previewContainerRef.current.clientWidth;
                const contentW = contentWrapperRef.current.scrollWidth;
                if (contentW > containerW - 40) { // 40px buffer
                    setSmartZoomScale((containerW - 40) / contentW);
                } else {
                    setSmartZoomScale(1);
                }
            }
        };
        
        if (previewContent) {
            setTimeout(calculateZoom, 100); // Delay for render
            window.addEventListener('resize', calculateZoom);
        }
        return () => window.removeEventListener('resize', calculateZoom);
    }, [previewContent]);

    // Download Handlers
    const handlePrintNative = () => {
        printToPdfNative('preview-area', `Laporan_${activeReport}`);
        onToast('Membuka dialog cetak...', 'info');
    };

    const handleDownloadPdfImage = async () => {
        if (!previewContent || !contentWrapperRef.current) return;
        setIsGeneratingFile(true);
        const originalTransform = contentWrapperRef.current.style.transform;
        contentWrapperRef.current.style.transform = 'none'; // Reset zoom for capture
        try {
            await generatePdf('preview-area', { paperSize, fileName: `Laporan_${activeReport}.pdf` });
            onToast('PDF berhasil diunduh.', 'success');
        } catch (e) {
            onToast('Gagal membuat PDF.', 'error');
        } finally {
            contentWrapperRef.current.style.transform = originalTransform;
            setIsGeneratingFile(false);
            setIsDownloadMenuOpen(false);
        }
    };

    const handleDownloadCsv = () => {
        const csvContent = generateContactCsv(filteredSantri, settings);
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Kontak_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
        setIsDownloadMenuOpen(false);
        onToast('CSV berhasil diunduh.', 'success');
    };

    const handleDownloadExcel = () => {
        setIsGeneratingFile(true);
        try {
            const fileName = `Laporan_${activeReport}_${new Date().toISOString().slice(0,10)}`;
            
            if (activeReport === ReportType.LaporanKontak) {
                exportContactsToExcel(filteredSantri, settings, fileName);
            } 
            else if (activeReport === ReportType.LaporanArusKas && excelData?.transaksiKas) {
                exportArusKasToExcel(excelData.transaksiKas, fileName);
            }
            else if (activeReport === ReportType.FinanceSummary && excelData?.tagihanList) {
                exportFinanceSummaryToExcel(filteredSantri, excelData.tagihanList, settings, fileName);
            }
            else {
                // Default: Export Santri Data (for Biodata, Rombel, etc)
                exportSantriToExcel(filteredSantri, settings, fileName);
            }
            onToast('Excel berhasil diunduh.', 'success');
        } catch (error) {
            console.error(error);
            onToast('Gagal membuat Excel. Pastikan data tersedia.', 'error');
        } finally {
            setIsGeneratingFile(false);
            setIsDownloadMenuOpen(false);
        }
    };

    const handleDownloadSvg = async () => {
        setIsGeneratingFile(true);
        try {
            await exportReportToSvg('preview-area', `Card_${new Date().getTime()}`);
            onToast('SVG berhasil diunduh.', 'success');
        } catch(e) { onToast('Gagal ekspor SVG.', 'error'); } 
        finally { setIsGeneratingFile(false); setIsDownloadMenuOpen(false); }
    };

    // List of reports eligible for Excel Export
    const canExportToExcel = [
        ReportType.LaporanKontak, 
        ReportType.DaftarRombel,
        ReportType.Biodata,
        ReportType.LaporanArusKas, // New
        ReportType.FinanceSummary // New
    ].includes(activeReport);

    if (!previewContent && !isLoading) {
        return (
            <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-xl h-full min-h-[400px] flex flex-col items-center justify-center text-gray-400">
                <i className="bi bi-file-earmark-text text-6xl mb-4 opacity-50"></i>
                <p className="text-lg font-medium">Area Pratinjau</p>
                <p className="text-sm">Silakan atur filter dan klik "Tampilkan Preview".</p>
            </div>
        );
    }

    return (
        <div className="bg-gray-200 rounded-xl shadow-inner border border-gray-300 h-full flex flex-col relative overflow-hidden">
            {/* Toolbar */}
            <div className="bg-white border-b px-4 py-3 flex justify-between items-center z-20 shadow-sm shrink-0">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-700">Preview</span>
                    {pageCount > 0 && <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full border">{pageCount} Halaman</span>}
                </div>
                <div className="flex items-center gap-2">
                    {/* Zoom Controls */}
                    <div className="hidden md:flex items-center bg-gray-100 rounded-lg p-1 mr-2">
                        <button onClick={() => setManualZoom(z => Math.max(0.3, z - 0.1))} className="p-1 hover:bg-white rounded"><i className="bi bi-dash"></i></button>
                        <span className="text-xs font-mono w-10 text-center">{Math.round(smartZoomScale * manualZoom * 100)}%</span>
                        <button onClick={() => setManualZoom(z => Math.min(2, z + 0.1))} className="p-1 hover:bg-white rounded"><i className="bi bi-plus"></i></button>
                    </div>

                    {/* Download Actions */}
                    <div className="relative">
                        <button onClick={() => setIsDownloadMenuOpen(!isDownloadMenuOpen)} disabled={isGeneratingFile} className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm disabled:opacity-70">
                            {isGeneratingFile ? <span className="animate-spin h-3 w-3 border-2 border-white rounded-full border-t-transparent"></span> : <i className="bi bi-download"></i>}
                            <span className="hidden sm:inline">Unduh</span>
                        </button>
                        {isDownloadMenuOpen && (
                            <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl ring-1 ring-black ring-opacity-5 z-50 overflow-hidden">
                                {/* Excel Option (Priority) */}
                                {canExportToExcel && (
                                    <button onClick={handleDownloadExcel} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-green-50 border-b flex items-center gap-2 bg-green-50/50">
                                        <i className="bi bi-file-earmark-spreadsheet-fill text-green-600"></i> Excel (.xlsx)
                                    </button>
                                )}
                                
                                {activeReport === ReportType.LaporanKontak && (
                                    <button onClick={handleDownloadCsv} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100 border-b flex items-center gap-2"><i className="bi bi-file-earmark-spreadsheet text-gray-500"></i> CSV (Legacy)</button>
                                )}
                                <button onClick={handlePrintNative} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100 border-b flex items-center gap-2"><i className="bi bi-printer text-blue-600"></i> Cetak / PDF (Asli)</button>
                                <button onClick={handleDownloadPdfImage} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"><i className="bi bi-file-earmark-pdf text-red-600"></i> PDF (Gambar)</button>
                                {activeReport === ReportType.KartuSantri && (
                                    <button onClick={handleDownloadSvg} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 border-t"><i className="bi bi-vector-pen text-purple-600"></i> SVG (Vektor)</button>
                                )}
                            </div>
                        )}
                    </div>
                    
                    <button onClick={handlePrintNative} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium shadow-sm flex items-center gap-2">
                        <i className="bi bi-printer-fill"></i>
                        <span className="hidden sm:inline">Cetak</span>
                    </button>
                </div>
            </div>

            {/* Scrollable Preview Area */}
            <div id="preview-area" ref={previewContainerRef} className="flex-grow overflow-auto p-8 flex justify-center items-start bg-gray-200/50 backdrop-blur-sm">
                <div 
                    ref={contentWrapperRef} 
                    className="printable-content-wrapper origin-top transition-transform duration-200"
                    style={{ transform: `scale(${smartZoomScale * manualZoom})` }}
                >
                    {previewContent}
                </div>
            </div>
            
            {isLoading && (
                <div className="absolute inset-0 bg-white/80 z-30 flex flex-col items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mb-3"></div>
                    <p className="text-gray-600 font-medium">Sedang menyusun laporan...</p>
                </div>
            )}
        </div>
    );
};
