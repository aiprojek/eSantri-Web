
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Buku, Santri } from '../../types';
import { useAppContext } from '../../AppContext';
import { useSantriContext } from '../../contexts/SantriContext';
import { KartuPerpusTemplate } from './print/KartuPerpusTemplate';
import { SlipBukuTemplate } from './print/SlipBukuTemplate';
import { LabelBukuTemplate } from './print/LabelBukuTemplate';
import { printToPdfNative } from '../../utils/pdfGenerator';

interface CetakPerpusProps {
    bukuList: Buku[];
}

export const CetakPerpus: React.FC<CetakPerpusProps> = ({ bukuList }) => {
    const { santriList } = useSantriContext();
    const { settings } = useAppContext();
    const [activeTab, setActiveTab] = useState<'kartu' | 'slip' | 'label'>('kartu');

    // Page Config State
    const [margin, setMargin] = useState({ top: 1.0, right: 1.0, bottom: 1.0, left: 1.0 });
    const [paperSize, setPaperSize] = useState<'A4' | 'F4' | 'Legal'>('A4');
    const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');

    // Custom Dimensions State
    const [slipSize, setSlipSize] = useState({ w: 7.5, h: 12.0 });
    const [labelSize, setLabelSize] = useState({ w: 3.0, h: 4.0 });
    const [isProcessingPrint, setIsProcessingPrint] = useState(false);
    const [isDownloadMenuOpen, setIsDownloadMenuOpen] = useState(false);

    // Smart Zoom State (matching ReportPreviewPanel pattern)
    const [manualZoom, setManualZoom] = useState(1);
    const [smartZoomScale, setSmartZoomScale] = useState(1);
    const [fitToWidth, setFitToWidth] = useState(true);
    const hasInitializedZoomModeRef = useRef(false);

    // Preview State
    const [isPreviewMode, setIsPreviewMode] = useState(false);

    // Kartu Anggota State
    const [selectedSantriIds, setSelectedSantriIds] = useState<number[]>([]);
    const [cardTheme, setCardTheme] = useState<'classic' | 'modern' | 'bold' | 'dark' | 'ceria' | 'vertical'>('classic');
    // Card display mode: photo only, QR only, or both
    const [cardDisplayMode, setCardDisplayMode] = useState<'photo' | 'qr' | 'both'>('both');
    const [filterJenjang, setFilterJenjang] = useState('');
    const [searchSantri, setSearchSantri] = useState('');

    // Backside Layout Options (matching KartuSantri pattern)
    const [backsideLayout, setBacksideLayout] = useState<'none' | 'side-by-side' | 'separate'>('none');
    const [backsideRules, setBacksideRules] = useState(
        `1. Kartu ini harus dibawa saat pinjam buku.\n` +
        `2. Kartu tidak boleh dipindahtangankan.\n` +
        `3. Keterlambatan pengembalian dikenakan sanksi.\n` +
        `4. Kerusakan/kehilangan buku menjadi tanggung jawab peminjam.\n` +
        `5. Kembalikan buku tepat waktu.`
    );

    // Slip & Label Buku State
    const [selectedBukuIds, setSelectedBukuIds] = useState<number[]>([]);
    const [filterKategori, setFilterKategori] = useState('');
    const [searchBuku, setSearchBuku] = useState('');

    // --- LOGIC KARTU ---
    const filteredSantri = useMemo(() => {
        return santriList.filter((s: Santri) => {
            const matchJenjang = !filterJenjang || s.jenjangId === parseInt(filterJenjang);
            const matchSearch = !searchSantri || s.namaLengkap.toLowerCase().includes(searchSantri.toLowerCase()) || s.nis.includes(searchSantri);
            return s.status === 'Aktif' && matchJenjang && matchSearch;
        });
    }, [santriList, filterJenjang, searchSantri]);

    const handleSelectSantri = (id: number) => {
        setSelectedSantriIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };
    const handleSelectAllSantri = () => {
        if (selectedSantriIds.length === filteredSantri.length) setSelectedSantriIds([]);
        else setSelectedSantriIds(filteredSantri.map(s => s.id));
    };

    // --- LOGIC BUKU ---
    const filteredBuku = useMemo(() => {
        return bukuList.filter(b => {
            const matchKategori = !filterKategori || b.kategori === filterKategori;
            const matchSearch = !searchBuku || b.judul.toLowerCase().includes(searchBuku.toLowerCase()) || b.kodeBuku.toLowerCase().includes(searchBuku.toLowerCase());
            return matchKategori && matchSearch;
        });
    }, [bukuList, filterKategori, searchBuku]);

    const handleSelectBuku = (id: number) => {
        setSelectedBukuIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };
    const handleSelectAllBuku = () => {
        if (selectedBukuIds.length === filteredBuku.length) setSelectedBukuIds([]);
        else setSelectedBukuIds(filteredBuku.map(b => b.id));
    };

    // --- PAPER LOGIC ---
    const getPaperDimensions = () => {
        const sizes = {
            'A4': { w: 21.0, h: 29.7 },
            'F4': { w: 21.5, h: 33.0 },
            'Legal': { w: 21.6, h: 35.6 }
        };
        const dim = sizes[paperSize];
        return orientation === 'portrait' ? dim : { w: dim.h, h: dim.w };
    };

    const currentPaper = getPaperDimensions();
    const cardGapCm = 0.25;
    const slipGapCm = 0.35;
    const labelGapCm = 0.15;
    const effectiveZoomScale = smartZoomScale * manualZoom;
    const cmToPx = 96 / 2.54;
    const paperOrientationClass = orientation === 'landscape' ? 'print-landscape' : 'print-portrait';
    const [previewContentHeight, setPreviewContentHeight] = useState(currentPaper.h * cmToPx);

    const updateMargin = (position: keyof typeof margin, rawValue: string) => {
        const parsed = Number(rawValue);
        const value = Number.isFinite(parsed) ? Math.max(0, Math.min(5, parsed)) : 0;
        setMargin(current => ({ ...current, [position]: value }));
    };

    const paginateItems = <T,>(items: T[], perPage: number): T[][] => {
        if (perPage <= 0) return [items];
        const pages: T[][] = [];
        for (let i = 0; i < items.length; i += perPage) {
            pages.push(items.slice(i, i + perPage));
        }
        return pages;
    };

    const selectedSantri = useMemo(
        () => filteredSantri.filter((s) => selectedSantriIds.includes(s.id)),
        [filteredSantri, selectedSantriIds]
    );
    const selectedBuku = useMemo(
        () => filteredBuku.filter((b) => selectedBukuIds.includes(b.id)),
        [filteredBuku, selectedBukuIds]
    );

    const kartuPages = useMemo(() => {
        if (selectedSantri.length === 0) return [];
        const baseW = cardTheme === 'vertical' ? 5.398 : 8.56;
        const baseH = cardTheme === 'vertical' ? 8.56 : 5.398;
        const backsideGapCm = 0.04;
        const itemW = backsideLayout === 'side-by-side' ? (baseW * 2) + backsideGapCm : baseW;
        const itemH = backsideLayout === 'separate' ? (baseH * 2) + backsideGapCm : baseH;
        const usableW = Math.max(1, currentPaper.w - (margin.left + margin.right));
        const usableH = Math.max(1, currentPaper.h - (margin.top + margin.bottom));
        const cols = Math.max(1, Math.floor((usableW + cardGapCm) / (itemW + cardGapCm)));
        const rows = Math.max(1, Math.floor((usableH + cardGapCm) / (itemH + cardGapCm)));
        return paginateItems(selectedSantri, cols * rows);
    }, [selectedSantri, cardTheme, backsideLayout, currentPaper.w, currentPaper.h, margin.left, margin.right, margin.top, margin.bottom, cardGapCm]);

    const slipPages = useMemo(() => {
        if (selectedBuku.length === 0) return [];
        const usableW = Math.max(1, currentPaper.w - (margin.left + margin.right));
        const usableH = Math.max(1, currentPaper.h - (margin.top + margin.bottom));
        const cols = Math.max(1, Math.floor((usableW + slipGapCm) / (slipSize.w + slipGapCm)));
        const rows = Math.max(1, Math.floor((usableH + slipGapCm) / (slipSize.h + slipGapCm)));
        return paginateItems(selectedBuku, cols * rows);
    }, [selectedBuku, currentPaper.w, currentPaper.h, margin.left, margin.right, margin.top, margin.bottom, slipSize.w, slipSize.h, slipGapCm]);

    const labelPages = useMemo(() => {
        if (selectedBuku.length === 0) return [];
        const usableW = Math.max(1, currentPaper.w - (margin.left + margin.right));
        const usableH = Math.max(1, currentPaper.h - (margin.top + margin.bottom));
        const cols = Math.max(1, Math.floor((usableW + labelGapCm) / (labelSize.w + labelGapCm)));
        const rows = Math.max(1, Math.floor((usableH + labelGapCm) / (labelSize.h + labelGapCm)));
        return paginateItems(selectedBuku, cols * rows);
    }, [selectedBuku, currentPaper.w, currentPaper.h, margin.left, margin.right, margin.top, margin.bottom, labelSize.w, labelSize.h, labelGapCm]);

    const handlePrint = (elementId: string, filename: string) => {
        if (isProcessingPrint) return;
        setIsProcessingPrint(true);

        printToPdfNative(elementId, filename, {
            paperSize,
            orientation,
            margin
        });
        setTimeout(() => setIsProcessingPrint(false), 700);
    };

    const handleExportPdf = () => {
        const elementId = activeTab === 'kartu' ? 'preview-kartu' : activeTab === 'slip' ? 'preview-slip' : 'preview-label';
        const filename = activeTab === 'kartu' ? 'Kartu_Anggota_Perpus' : activeTab === 'slip' ? 'Slip_Buku' : 'Label_Buku';
        handlePrint(elementId, filename);
    };

    const handleExportHtml = () => {
        const elementId = activeTab === 'kartu' ? 'preview-kartu' : activeTab === 'slip' ? 'preview-slip' : 'preview-label';
        const element = document.getElementById(elementId);
        if (!element) return;

        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Cetak Perpustakaan</title>
    <style>
        @import url('https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { margin: 0; padding: 0; background: #e5e7eb; }
        body { font-family: system-ui, sans-serif; }
        #${elementId} { display: flex; flex-direction: column; align-items: center; gap: 24px; padding: 24px 0; }
        .perpus-print-page {
            width: ${currentPaper.w}cm;
            height: ${currentPaper.h}cm;
            padding: ${margin.top}cm ${margin.right}cm ${margin.bottom}cm ${margin.left}cm;
            box-sizing: border-box;
            overflow: hidden;
            background: white;
        }
        @media print {
            @page { size: ${currentPaper.w}cm ${currentPaper.h}cm; margin: 0; }
            html, body { background: white; }
            #${elementId} { display: block; padding: 0; }
            .perpus-print-page { margin: 0; box-shadow: none !important; break-inside: avoid; }
            .page-break-after { page-break-after: always; break-after: page; }
        }
    </style>
</head>
<body>
    <div id="${elementId}">
        ${element.innerHTML}
    </div>
</body>
</html>`;

        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Cetak_Perpustakaan.html';
        a.click();
        URL.revokeObjectURL(url);
    };

    // --- SMART ZOOM (matching ReportPreviewPanel) ---
    const previewContainerRef = useRef<HTMLDivElement>(null);
    const contentWrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const updateViewportMode = () => {
            const mobile = window.matchMedia('(max-width: 768px)').matches;
            if (!hasInitializedZoomModeRef.current) {
                setFitToWidth(!mobile);
                hasInitializedZoomModeRef.current = true;
            }
        };

        const calculateZoom = () => {
            if (previewContainerRef.current && contentWrapperRef.current) {
                setPreviewContentHeight(contentWrapperRef.current.scrollHeight);
                if (!fitToWidth) {
                    setSmartZoomScale(1);
                    return;
                }
                const containerStyle = window.getComputedStyle(previewContainerRef.current);
                const horizontalPadding = parseFloat(containerStyle.paddingLeft) + parseFloat(containerStyle.paddingRight);
                const containerW = previewContainerRef.current.clientWidth - horizontalPadding;
                const contentW = contentWrapperRef.current.scrollWidth;
                const availableW = Math.max(1, containerW - 8);
                if (contentW > availableW) {
                    setSmartZoomScale(availableW / contentW);
                } else {
                    setSmartZoomScale(1);
                }
            }
        };

        updateViewportMode();

        // Recalculate when content changes
        setTimeout(calculateZoom, 100);
        window.addEventListener('resize', updateViewportMode);
        window.addEventListener('resize', calculateZoom);

        return () => {
            window.removeEventListener('resize', updateViewportMode);
            window.removeEventListener('resize', calculateZoom);
        };
    }, [
        fitToWidth,
        isPreviewMode,
        activeTab,
        selectedSantriIds.length,
        selectedBukuIds.length,
        cardTheme,
        cardDisplayMode,
        backsideLayout,
        paperSize,
        orientation,
        margin.top,
        margin.right,
        margin.bottom,
        margin.left,
        slipSize.w,
        slipSize.h,
        labelSize.w,
        labelSize.h
    ]);

    // Determine if preview has content to show controls
    const hasPreviewContent = (activeTab === 'kartu' && isPreviewMode && kartuPages.length > 0)
        || (activeTab === 'slip' && selectedBukuIds.length > 0 && slipPages.length > 0)
        || (activeTab === 'label' && selectedBukuIds.length > 0 && labelPages.length > 0);

    const currentPageCount = activeTab === 'kartu' ? kartuPages.length : activeTab === 'slip' ? slipPages.length : labelPages.length;

    return (
        <div className="app-panel rounded-panel p-4 sm:p-6 min-h-[600px] flex flex-col lg:flex-row gap-6">
            {/* Sidebar Controls */}
            <div className="w-full lg:w-1/3 app-panel p-4 rounded-panel h-fit space-y-6">
                <div className="flex border-b mb-2 overflow-x-auto">
                    <button onClick={() => setActiveTab('kartu')} className={`flex-1 py-2 px-2 text-sm font-bold whitespace-nowrap ${activeTab === 'kartu' ? 'text-teal-600 border-b-2 border-teal-600' : 'text-gray-500'}`}>Kartu</button>
                    <button onClick={() => setActiveTab('slip')} className={`flex-1 py-2 px-2 text-sm font-bold whitespace-nowrap ${activeTab === 'slip' ? 'text-teal-600 border-b-2 border-teal-600' : 'text-gray-500'}`}>Slip Buku</button>
                    <button onClick={() => setActiveTab('label')} className={`flex-1 py-2 px-2 text-sm font-bold whitespace-nowrap ${activeTab === 'label' ? 'text-teal-600 border-b-2 border-teal-600' : 'text-gray-500'}`}>Label</button>
                </div>

                {/* PAGE & MARGIN CONFIGURATION */}
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg space-y-3">
                    <h4 className="text-xs font-bold text-gray-600 uppercase flex items-center gap-2"><i className="bi bi-printer"></i> Konfigurasi Kertas</h4>

                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block text-[10px] text-gray-500 mb-1">Ukuran Kertas</label>
                            <select value={paperSize} onChange={e => setPaperSize(e.target.value as any)} className="w-full border rounded p-1 text-xs">
                                <option value="A4">A4</option>
                                <option value="F4">F4 (Folio)</option>
                                <option value="Legal">Legal</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] text-gray-500 mb-1">Orientasi</label>
                            <select value={orientation} onChange={e => setOrientation(e.target.value as any)} className="w-full border rounded p-1 text-xs">
                                <option value="portrait">Portrait (Tegak)</option>
                                <option value="landscape">Landscape (Miring)</option>
                            </select>
                        </div>
                    </div>

                    <div className="border-t border-gray-200 pt-2">
                        <label className="block text-[10px] font-bold text-gray-500 mb-2">Margin Halaman (cm)</label>
                        <div className="grid grid-cols-4 gap-1">
                            {(['top', 'bottom', 'left', 'right'] as const).map(pos => (
                                <div key={pos}>
                                    <label className="block text-[9px] text-gray-400 capitalize text-center">{pos}</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="5"
                                        step="0.1"
                                        value={margin[pos]}
                                        onChange={e => updateMargin(pos, e.target.value)}
                                        className="w-full border rounded p-1 text-xs text-center"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ITEM SIZE CONFIGURATION (Context Sensitive) */}
                {activeTab === 'slip' && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <h4 className="text-xs font-bold text-blue-700 uppercase mb-2">Ukuran Slip (cm)</h4>
                        <div className="grid grid-cols-2 gap-2">
                            <div><label className="block text-[10px] text-blue-600">Lebar (W)</label><input type="number" step="0.1" value={slipSize.w} onChange={e => setSlipSize({ ...slipSize, w: Number(e.target.value) })} className="w-full border rounded p-1 text-xs text-center" /></div>
                            <div><label className="block text-[10px] text-blue-600">Tinggi (H)</label><input type="number" step="0.1" value={slipSize.h} onChange={e => setSlipSize({ ...slipSize, h: Number(e.target.value) })} className="w-full border rounded p-1 text-xs text-center" /></div>
                        </div>
                    </div>
                )}
                {activeTab === 'label' && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <h4 className="text-xs font-bold text-green-700 uppercase mb-2">Ukuran Label (cm)</h4>
                        <div className="grid grid-cols-2 gap-2">
                            <div><label className="block text-[10px] text-green-600">Lebar (W)</label><input type="number" step="0.1" value={labelSize.w} onChange={e => setLabelSize({ ...labelSize, w: Number(e.target.value) })} className="w-full border rounded p-1 text-xs text-center" /></div>
                            <div><label className="block text-[10px] text-green-600">Tinggi (H)</label><input type="number" step="0.1" value={labelSize.h} onChange={e => setLabelSize({ ...labelSize, h: Number(e.target.value) })} className="w-full border rounded p-1 text-xs text-center" /></div>
                        </div>
                    </div>
                )}

                {/* TAB SPECIFIC CONTENT */}
                {activeTab === 'kartu' && (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Tema Kartu</label>
                            <select value={cardTheme} onChange={e => setCardTheme(e.target.value as any)} className="w-full border rounded p-2 text-sm">
                                <option value="classic">Classic (Emas/Hijau)</option>
                                <option value="modern">Modern Tech (Biru)</option>
                                <option value="bold">Bold B&W (Hitam Putih)</option>
                                <option value="dark">Premium Dark (Gelap)</option>
                                <option value="ceria">Ceria (Warna-warni)</option>
                                <option value="vertical">Vertical ID (Merah)</option>
                            </select>
                        </div>

                        {/* Backside Layout Option (matching KartuSantri) */}
                        <div className="border rounded p-3 bg-gray-50 space-y-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-2">Tampilan Kartu</label>
                                <select
                                    value={cardDisplayMode}
                                    onChange={e => setCardDisplayMode(e.target.value as 'photo' | 'qr' | 'both')}
                                    className="w-full border rounded p-2 text-xs"
                                >
                                    <option value="photo">Tampilkan foto saja</option>
                                    <option value="qr">Tampilkan QR saja</option>
                                    <option value="both">Tampilkan foto dan QR</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-2">Layout Sisi Belakang Kartu</label>
                            <select
                                value={backsideLayout}
                                onChange={e => setBacksideLayout(e.target.value as any)}
                                className="w-full border rounded p-2 text-xs mb-2"
                            >
                                <option value="none">Tanpa Sisi Belakang (Hanya 1 Sisi)</option>
                                <option value="side-by-side">Bersebelahan dalam 1 Kotak (Bisa dilipat)</option>
                                <option value="separate">Halaman Terpisah (Untuk Printer Duplex)</option>
                            </select>
                            <p className="text-[10px] text-gray-500 italic mb-2">
                                Opsi Bersebelahan cocok untuk cetak manual & laminating. Opsi Halaman Terpisah merender sisi belakang di lembar kertas berikutnya.
                            </p>
                            </div>

                            {backsideLayout !== 'none' && (
                                <div className="mt-2 space-y-2">
                                    <label className="block text-[10px] text-gray-600 font-medium">Tata Tertib / Ketentuan</label>
                                    <textarea
                                        value={backsideRules}
                                        onChange={e => setBacksideRules(e.target.value)}
                                        rows={4}
                                        className="w-full border rounded p-2 text-xs"
                                        placeholder="Masukkan setiap poin pada baris baru..."
                                    />
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Filter Jenjang</label>
                            <select value={filterJenjang} onChange={e => setFilterJenjang(e.target.value)} className="w-full border rounded p-2 text-sm">
                                <option value="">Semua Jenjang</option>
                                {settings.jenjang.map(j => <option key={j.id} value={j.id}>{j.nama}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Cari Santri</label>
                            <input value={searchSantri} onChange={e => setSearchSantri(e.target.value)} className="w-full border rounded p-2 text-sm" placeholder="Nama / NIS..." />
                        </div>
                        <div className="border rounded max-h-60 overflow-y-auto p-2 bg-gray-50">
                            <div className="flex justify-between mb-2 text-xs">
                                <span className="font-bold">Pilih Santri</span>
                                <button onClick={handleSelectAllSantri} className="text-blue-600">All</button>
                            </div>
                            {filteredSantri.map(s => (
                                <div key={s.id} className="flex items-center gap-2 mb-1">
                                    <input type="checkbox" checked={selectedSantriIds.includes(s.id)} onChange={() => handleSelectSantri(s.id)} />
                                    <span className="text-xs truncate">{s.namaLengkap}</span>
                                </div>
                            ))}
                        </div>
                        <button
                            onClick={() => setIsPreviewMode(true)}
                            disabled={selectedSantriIds.length === 0}
                            className="w-full bg-teal-600 text-white py-2 rounded font-bold hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                        >
                            <i className="bi bi-eye mr-1"></i> Tampilkan Preview Kartu
                        </button>
                    </div>
                )}

                {(activeTab === 'slip' || activeTab === 'label') && (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Filter Kategori</label>
                            <select value={filterKategori} onChange={e => setFilterKategori(e.target.value)} className="w-full border rounded p-2 text-sm">
                                <option value="">Semua Kategori</option>
                                <option value="Kitab Kuning">Kitab Kuning</option>
                                <option value="Buku Pelajaran">Buku Pelajaran</option>
                                <option value="Umum">Umum</option>
                                <option value="Referensi">Referensi</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Cari Buku</label>
                            <input value={searchBuku} onChange={e => setSearchBuku(e.target.value)} className="w-full border rounded p-2 text-sm" placeholder="Judul / Kode..." />
                        </div>
                        <div className="border rounded max-h-60 overflow-y-auto p-2 bg-gray-50">
                            <div className="flex justify-between mb-2 text-xs">
                                <span className="font-bold">Pilih Buku</span>
                                <button onClick={handleSelectAllBuku} className="text-blue-600">All</button>
                            </div>
                            {filteredBuku.map(b => (
                                <div key={b.id} className="flex items-center gap-2 mb-1">
                                    <input type="checkbox" checked={selectedBukuIds.includes(b.id)} onChange={() => handleSelectBuku(b.id)} />
                                    <span className="text-xs truncate" title={b.judul}>{b.judul}</span>
                                </div>
                            ))}
                        </div>
                        <button
                            onClick={() => handlePrint(activeTab === 'slip' ? 'preview-slip' : 'preview-label', activeTab === 'slip' ? 'Slip_Buku' : 'Label_Buku')}
                            disabled={selectedBukuIds.length === 0 || isProcessingPrint}
                            className="w-full bg-blue-600 text-white py-2 rounded font-bold hover:bg-blue-700 disabled:bg-gray-300"
                        >
                            {isProcessingPrint ? 'Memproses...' : (activeTab === 'slip' ? 'Cetak Slip' : 'Cetak Label')}
                        </button>
                    </div>
                )}
            </div>

            {/* Preview Area - matching ReportPreviewPanel pattern */}
            <div className="flex-1 bg-gray-200 rounded-xl shadow-inner border border-gray-300 min-h-[500px] flex flex-col relative overflow-hidden">
                {/* Toolbar */}
                <div className="bg-white border-b px-3 sm:px-4 py-2.5 flex flex-wrap gap-2 justify-between items-center z-20 shadow-sm shrink-0">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-700">Preview</span>
                        {currentPageCount > 0 && <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full border">{currentPageCount} Halaman</span>}
                    </div>
                    {hasPreviewContent && (
                        <div className="flex items-center flex-wrap justify-end gap-2">
                            {/* Zoom Controls - matching ReportPreviewPanel */}
                            <div className="flex items-center bg-gray-100 rounded-lg p-1">
                                <button onClick={() => setManualZoom(z => Math.max(0.3, z - 0.1))} className="h-7 w-7 hover:bg-white rounded text-gray-700"><i className="bi bi-dash"></i></button>
                                <span className="text-[11px] font-mono w-11 text-center">{Math.round(smartZoomScale * manualZoom * 100)}%</span>
                                <button onClick={() => setManualZoom(z => Math.min(2, z + 0.1))} className="h-7 w-7 hover:bg-white rounded text-gray-700"><i className="bi bi-plus"></i></button>
                                <button onClick={() => setManualZoom(1)} className="ml-1 h-7 px-2 text-[11px] rounded hover:bg-white text-gray-600 border border-transparent hover:border-gray-200">100%</button>
                                <button
                                    onClick={() => setFitToWidth(v => !v)}
                                    className={`ml-1 h-7 px-2 text-[11px] rounded border ${fitToWidth ? 'bg-teal-50 border-teal-200 text-teal-700' : 'bg-white border-gray-200 text-gray-600'}`}
                                    title={fitToWidth ? 'Mode fit ke lebar layar' : 'Mode ukuran asli (scroll)'}
                                >
                                    {fitToWidth ? 'Fit' : 'Asli'}
                                </button>
                            </div>

                            {/* Export Dropdown */}
                            <div className="relative">
                                <button
                                    onClick={() => setIsDownloadMenuOpen(!isDownloadMenuOpen)}
                                    disabled={isProcessingPrint}
                                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm disabled:opacity-70"
                                >
                                    {isProcessingPrint ? (
                                        <span className="animate-spin h-3 w-3 border-2 border-white rounded-full border-t-transparent"></span>
                                    ) : (
                                        <i className="bi bi-download"></i>
                                    )}
                                    <span className="hidden sm:inline">Unduh</span>
                                </button>
                                {isDownloadMenuOpen && (
                                    <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-xl ring-1 ring-black ring-opacity-5 z-[90] py-1 min-w-[160px]">
                                        <button onClick={() => { handleExportPdf(); setIsDownloadMenuOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-red-50 border-b flex items-center gap-2 bg-red-50/40">
                                            <i className="bi bi-printer text-red-600"></i> Cetak Langsung
                                        </button>
                                        <button onClick={() => { handleExportPdf(); setIsDownloadMenuOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-red-50 border-b flex items-center gap-2">
                                            <i className="bi bi-file-earmark-pdf text-red-600"></i> PDF
                                        </button>
                                        <button onClick={() => { handleExportHtml(); setIsDownloadMenuOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 flex items-center gap-2">
                                            <i className="bi bi-code-slash text-indigo-600"></i> HTML
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Scrollable Preview Area - zoom applied to content wrapper, NOT to scroll area */}
                <div ref={previewContainerRef} className="flex-grow overflow-auto p-3 sm:p-8 bg-gray-200/50 backdrop-blur-sm">
                    <div
                        className="relative transition-[width,height] duration-200"
                        style={{
                            width: `${currentPaper.w * cmToPx * effectiveZoomScale}px`,
                            height: `${previewContentHeight * effectiveZoomScale}px`,
                            marginInline: 'auto'
                        }}
                    >
                    <div
                        ref={contentWrapperRef}
                        className="absolute left-0 top-0 origin-top-left transition-transform duration-200"
                        style={{
                            width: `${currentPaper.w}cm`,
                            transform: `scale(${effectiveZoomScale})`
                        }}
                    >
                        {activeTab === 'kartu' && (
                            <>
                                {!isPreviewMode ? (
                                    <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-xl min-h-[400px] w-full flex flex-col items-center justify-center text-gray-400">
                                        <i className="bi bi-eye text-6xl mb-4 opacity-50"></i>
                                        <p className="text-lg font-medium">Area Pratinjau</p>
                                        <p className="text-sm">Pilih santri dan klik "Tampilkan Preview Kartu"</p>
                                    </div>
                                ) : kartuPages.length > 0 ? (
                                    <div id="preview-kartu" className="flex flex-col items-center gap-6">
                                        {kartuPages.map((pageItems, pageIndex) => (
                                            <div
                                                key={`kartu-page-${pageIndex}`}
                                                className={`perpus-print-page ${paperOrientationClass} bg-white shadow-lg rounded-md ${pageIndex < kartuPages.length - 1 ? 'page-break-after' : ''}`}
                                                style={{
                                                    width: `${currentPaper.w}cm`,
                                                    height: `${currentPaper.h}cm`,
                                                    paddingTop: `${margin.top}cm`,
                                                    paddingRight: `${margin.right}cm`,
                                                    paddingBottom: `${margin.bottom}cm`,
                                                    paddingLeft: `${margin.left}cm`,
                                                    boxSizing: 'border-box',
                                                    overflow: 'hidden'
                                                }}
                                            >
                                                <div
                                                    className="flex flex-wrap justify-center content-start"
                                                    style={{ gap: `${cardGapCm}cm` }}
                                                >
                                                    {pageItems.map((santri) => (
                                                        <div key={santri.id} className="break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
                                                            <KartuPerpusTemplate
                                                                santri={santri}
                                                                settings={settings}
                                                                theme={cardTheme as any}
                                                                backsideRules={backsideRules}
                                                                backsideLayout={backsideLayout}
                                                                displayMode={cardDisplayMode}
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center text-gray-400 py-12 w-full">
                                        <i className="bi bi-inbox text-5xl mb-3 block"></i>
                                        <p>Tidak ada Kartu untuk ditampilkan</p>
                                    </div>
                                )}
                            </>
                        )}

                        {activeTab === 'slip' && (
                            selectedBukuIds.length === 0 ? (
                                <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-xl min-h-[400px] w-full flex flex-col items-center justify-center text-gray-400">
                                    <i className="bi bi-file-earmark-text text-6xl mb-4 opacity-50"></i>
                                    <p className="text-lg font-medium">Pratinjau Slip Buku</p>
                                    <p className="text-sm">Pilih buku dan klik "Cetak Slip"</p>
                                </div>
                            ) : slipPages.length > 0 ? (
                                <div id="preview-slip" className="flex flex-col items-center gap-6">
                                    {slipPages.map((pageItems, pageIndex) => (
                                        <div
                                            key={`slip-page-${pageIndex}`}
                                            className={`perpus-print-page ${paperOrientationClass} bg-white shadow-lg rounded-md ${pageIndex < slipPages.length - 1 ? 'page-break-after' : ''}`}
                                            style={{
                                                width: `${currentPaper.w}cm`,
                                                height: `${currentPaper.h}cm`,
                                                paddingTop: `${margin.top}cm`,
                                                paddingRight: `${margin.right}cm`,
                                                paddingBottom: `${margin.bottom}cm`,
                                                paddingLeft: `${margin.left}cm`,
                                                boxSizing: 'border-box',
                                                overflow: 'hidden'
                                            }}
                                        >
                                            <div className="flex flex-wrap justify-start content-start" style={{ gap: `${slipGapCm}cm` }}>
                                                {pageItems.map((buku) => (
                                                    <div key={buku.id} className="break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
                                                        <SlipBukuTemplate buku={buku} settings={settings} width={slipSize.w} height={slipSize.h} />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : null
                        )}

                        {activeTab === 'label' && (
                            selectedBukuIds.length === 0 ? (
                                <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-xl min-h-[400px] w-full flex flex-col items-center justify-center text-gray-400">
                                    <i className="bi bi-tags text-6xl mb-4 opacity-50"></i>
                                    <p className="text-lg font-medium">Pratinjau Label Buku</p>
                                    <p className="text-sm">Pilih buku dan klik "Cetak Label"</p>
                                </div>
                            ) : labelPages.length > 0 ? (
                                <div id="preview-label" className="flex flex-col items-center gap-6">
                                    {labelPages.map((pageItems, pageIndex) => (
                                        <div
                                            key={`label-page-${pageIndex}`}
                                            className={`perpus-print-page ${paperOrientationClass} bg-white shadow-lg rounded-md ${pageIndex < labelPages.length - 1 ? 'page-break-after' : ''}`}
                                            style={{
                                                width: `${currentPaper.w}cm`,
                                                height: `${currentPaper.h}cm`,
                                                paddingTop: `${margin.top}cm`,
                                                paddingRight: `${margin.right}cm`,
                                                paddingBottom: `${margin.bottom}cm`,
                                                paddingLeft: `${margin.left}cm`,
                                                boxSizing: 'border-box',
                                                overflow: 'hidden'
                                            }}
                                        >
                                            <div className="flex flex-wrap justify-start content-start" style={{ gap: `${labelGapCm}cm` }}>
                                                {pageItems.map((buku) => (
                                                    <div key={buku.id} className="break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
                                                        <LabelBukuTemplate buku={buku} settings={settings} width={labelSize.w} height={labelSize.h} />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : null
                        )}
                    </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
