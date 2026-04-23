
import React, { useRef, useState, useEffect } from 'react';
import { ReportType } from '../../types';
import { printToPdfNative } from '../../utils/pdfGenerator';
import { exportToHtml, exportToAutoTable, exportPreviewToExcelWorksheets, exportToWord } from '../../utils/exportUtils';
import { generateContactCsv } from '../../services/csvService';
import { exportSantriToExcel, exportContactsToExcel, exportArusKasToExcel, exportFinanceSummaryToExcel, exportEmisTemplate } from '../../services/excelService';

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
    const [showDonationModal, setShowDonationModal] = useState(false);

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
        // Setting timeout to show modal after print dialog opens
        setTimeout(() => setShowDonationModal(true), 2000);
    };

    const handleDownloadCsv = () => {
        const csvContent = generateContactCsv(filteredSantri, settings);
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Kontak_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
        setIsDownloadMenuOpen(false);
        triggerSuccessDownload('CSV berhasil diunduh.');
    };

    const handleDownloadExcel = async () => {
        setIsGeneratingFile(true);
        try {
            const fileName = `Laporan_${activeReport}_${new Date().toISOString().slice(0,10)}`;
            
            if (activeReport === ReportType.LaporanKontak) {
                await exportContactsToExcel(filteredSantri, settings, fileName);
            } 
            else if (activeReport === ReportType.LaporanArusKas && excelData?.transaksiKas) {
                await exportArusKasToExcel(excelData.transaksiKas, fileName);
            }
            else if (activeReport === ReportType.FinanceSummary && excelData?.tagihanList) {
                await exportFinanceSummaryToExcel(filteredSantri, excelData.tagihanList, settings, fileName);
            }
            else if (activeReport === ReportType.LaporanEMIS) {
                await exportEmisTemplate(filteredSantri, settings, `EMIS_Export_${new Date().toISOString().slice(0,10)}`);
            }
            else {
                // Default: Export Santri Data (for Biodata, Rombel, etc)
                await exportSantriToExcel(filteredSantri, settings, fileName);
            }
            triggerSuccessDownload('Excel berhasil diunduh.');
        } catch (error) {
            console.error(error);
            onToast('Gagal membuat Excel. Pastikan data tersedia.', 'error');
        } finally {
            setIsGeneratingFile(false);
            setIsDownloadMenuOpen(false);
        }
    };

    const triggerSuccessDownload = (message: string) => {
        onToast(message, 'success');
        setShowDonationModal(true);
    };

    const handleDownloadAutoTable = async () => {
        setIsGeneratingFile(true);
        try {
            await exportToAutoTable('preview-area', `Laporan_${activeReport}`);
            triggerSuccessDownload('PDF AutoTable berhasil diunduh.');
        } catch (e) {
            onToast('Gagal ekspor AutoTable.', 'error');
        } finally {
            setIsGeneratingFile(false);
            setIsDownloadMenuOpen(false);
        }
    };

    const handleDownloadVisualExcel = async () => {
        setIsGeneratingFile(true);
        try {
            await exportPreviewToExcelWorksheets('preview-area', `Laporan_${activeReport}`);
            triggerSuccessDownload('Excel Visual berhasil diunduh.');
        } catch (e) {
            onToast('Gagal ekspor Excel Visual.', 'error');
        } finally {
            setIsGeneratingFile(false);
            setIsDownloadMenuOpen(false);
        }
    };

    const handleDownloadHtml = () => {
        setIsGeneratingFile(true);
        try {
            exportToHtml('preview-area', `Laporan_${activeReport}`);
            triggerSuccessDownload('HTML Offline berhasil diunduh.');
        } catch (e) {
            onToast('Gagal ekspor HTML.', 'error');
        } finally {
            setIsGeneratingFile(false);
            setIsDownloadMenuOpen(false);
        }
    };

    const handleDownloadWord = () => {
        setIsGeneratingFile(true);
        try {
            exportToWord('preview-area', `Laporan_${activeReport}`);
            triggerSuccessDownload('Word Document (.doc) berhasil diunduh.');
        } catch (e) {
            onToast('Gagal ekspor Word Document.', 'error');
        } finally {
            setIsGeneratingFile(false);
            setIsDownloadMenuOpen(false);
        }
    };

    // List of reports eligible for Excel Export
    const canExportToExcel = [
        ReportType.LaporanKontak, 
        ReportType.DaftarRombel,
        ReportType.Biodata,
        ReportType.LaporanArusKas,
        ReportType.FinanceSummary,
        ReportType.LaporanEMIS,
        ReportType.KartuSantri
    ].includes(activeReport);

    // List of reports eligible for AutoTable Export (Clean Data PDF)
    const canExportToAutoTable = [
        ReportType.DashboardSummary,
        ReportType.FinanceSummary,
        ReportType.LaporanMutasi,
        ReportType.DaftarRombel,
        ReportType.LembarAbsensi,
        ReportType.LembarNilai,
        ReportType.LembarRapor,
        ReportType.LembarPembinaan,
        ReportType.RaporLengkap,
        ReportType.RekeningKoranSantri,
        ReportType.LaporanArusKas,
        ReportType.LaporanAsrama,
        ReportType.DaftarWaliKelas,
        ReportType.LaporanMapel,
        ReportType.LaporanKontakStaf,
        ReportType.LembarKedatangan
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
                                
                                <button onClick={handlePrintNative} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-red-50 border-b flex items-center gap-2">
                                    <i className="bi bi-file-earmark-pdf text-red-600"></i> Cetak / PDF (Vektor Asli)
                                </button>
                                
                                <button onClick={handleDownloadWord} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 border-b flex items-center gap-2">
                                    <i className="bi bi-file-earmark-word text-blue-800"></i> Word Document (.doc)
                                </button>

                                {canExportToAutoTable && (
                                    <>
                                        <button onClick={handleDownloadAutoTable} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-teal-50 border-b flex items-center gap-2">
                                            <i className="bi bi-file-earmark-ruled text-teal-600"></i> PDF Data (AutoTable)
                                        </button>
                                        <button onClick={handleDownloadVisualExcel} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-green-50 border-b flex items-center gap-2">
                                            <i className="bi bi-file-earmark-spreadsheet text-green-600"></i> Excel (Tabel Visual)
                                        </button>
                                    </>
                                )}

                                <button onClick={handleDownloadHtml} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 border-b flex items-center gap-2">
                                    <i className="bi bi-code-slash text-indigo-600"></i> HTML (Offline)
                                </button>
                                
                                {activeReport === ReportType.KartuSantri && (
                                    <button onClick={() => {
                                        setIsDownloadMenuOpen(false);
                                        onToast('Untuk hasil Kartu SVG/PDF terbaik (teks tidak pecah), silakan klik "Cetak / PDF", lalu pilih "Save as PDF" di dialog browser.', 'info');
                                        setTimeout(handlePrintNative, 1000);
                                    }} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-purple-50 flex items-center gap-2 border-t">
                                        <i className="bi bi-vector-pen text-purple-600"></i> SVG / PDF (Kartu HD)
                                    </button>
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
            
            {showDonationModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-60 backldrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden text-center items-center flex flex-col">
                        <div className="bg-teal-50 w-full pt-8 pb-6 border-b border-teal-100 flex flex-col items-center">
                            <div className="bg-white p-3 rounded-full shadow-sm mb-4">
                                <i className="bi bi-gift-fill text-4xl text-teal-500"></i>
                            </div>
                            <h3 className="text-xl font-bold text-teal-800 px-4">Selamat! Laporan Selesai</h3>
                        </div>
                        
                        <div className="p-6">
                            <p className="text-gray-600 text-sm mb-6 leading-relaxed">
                                File laporan Anda berhasil diunduh dan siap digunakan. 
                                Dukung terus pengembangan <strong>eSantri Web</strong> dengan memberikan donasi atau kontribusi terbaik Anda agar kami dapat terus menghadirkan fitur bermanfaat!
                            </p>
                            
                            <div className="flex flex-col gap-3 w-full">
                                <button 
                                    onClick={() => {
                                        window.open('https://lynk.id/aiprojek/s/bvBJvdA', '_blank');
                                        setShowDonationModal(false);
                                    }}
                                    className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 px-4 rounded-xl shadow-md transition-colors flex items-center justify-center gap-2"
                                >
                                    <i className="bi bi-heart-fill text-pink-300"></i> Donasi via Link.id
                                </button>
                                <button 
                                    onClick={() => setShowDonationModal(false)}
                                    className="w-full bg-white border-2 border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-50 hover:border-gray-300 font-medium py-2.5 px-4 rounded-xl transition-colors"
                                >
                                    Tidak, terima kasih
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
