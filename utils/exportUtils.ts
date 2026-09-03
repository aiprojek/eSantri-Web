import { loadJsPdf, loadJsPdfAutoTable, loadXLSX } from "./lazyClientLibs";

const getUnifiedPreviewPrintStyles = () => `
    /* Screen Display: Realistic Paper Sheet View (Offline HTML Viewer) */
    @media screen {
        body {
            background-color: #f1f5f9;
            margin: 0;
            padding: 20px 0 40px 0;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            color: #1e293b;
        }
        #print-root {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 24px;
        }
        .printable-content-wrapper,
        .print-portrait,
        .print-landscape,
        .page-break-after,
        .break-after-page {
            background-color: #ffffff !important;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0, 0, 0, 0.05) !important;
            border-radius: 4px !important;
            margin: 0 auto 24px auto !important;
            box-sizing: border-box !important;
            position: relative !important;
        }
        .print-portrait {
            width: 210mm !important;
            min-height: 297mm !important;
            max-width: 210mm !important;
        }
        .print-landscape {
            width: 297mm !important;
            min-height: 210mm !important;
            max-width: 297mm !important;
        }
    }

    .report-signature-footer {
        position: relative !important;
        left: auto !important;
        right: auto !important;
        bottom: auto !important;
        margin-top: 0.35cm !important;
        background: #fff !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
    }
    #jadwal-print-area .printable-content-wrapper,
    #jadwal-print-area .page-break-after {
        width: 100% !important;
        max-width: 29.7cm !important;
        min-height: auto !important;
        box-sizing: border-box !important;
        page-break-inside: auto !important;
        break-inside: auto !important;
        overflow: visible !important;
        display: block !important;
    }
    #jadwal-print-area .printable-content-wrapper > div,
    #jadwal-print-area .jadwal-sheet > div {
        page-break-after: auto !important;
        break-after: auto !important;
        page-break-inside: avoid !important;
        break-inside: avoid-page !important;
    }
    #jadwal-print-area .printable-content-wrapper {
        padding: 0.6cm 0.7cm 0.5cm 0.7cm !important;
        position: relative !important;
    }
    #jadwal-print-area .jadwal-sheet {
        display: block !important;
        min-height: auto !important;
        height: auto !important;
        min-height: 19.2cm !important;
        display: flex !important;
        flex-direction: column !important;
    }
    #jadwal-print-area .jadwal-header-block {
        display: block !important;
    }
    #jadwal-print-area .jadwal-table-block {
        display: block !important;
        flex: 1 1 auto !important;
        overflow: visible !important;
    }
    #jadwal-print-area table {
        margin-top: 0.35cm !important;
        page-break-before: avoid !important;
        break-before: avoid-page !important;
        page-break-inside: auto !important;
        break-inside: auto !important;
        width: 100% !important;
        table-layout: fixed !important;
        font-size: 9px !important;
    }
    #jadwal-print-area .report-signature-footer {
        position: relative !important;
        left: auto !important;
        right: auto !important;
        bottom: auto !important;
        margin-top: auto !important;
        padding-top: 0.16cm !important;
        border-top: 1px solid rgba(100, 116, 139, 0.55) !important;
        color: rgba(71, 85, 105, 0.78) !important;
        font-size: 8.5pt !important;
        font-style: italic !important;
    }
    #calendar-print-area .calendar-sheet {
        width: 21cm !important;
        min-height: 29.7cm !important;
        box-sizing: border-box !important;
        overflow: hidden !important;
        page-break-inside: avoid !important;
        break-inside: avoid-page !important;
    }
    #calendar-print-area .calendar-layout-1_sheet {
        padding: 7mm 7mm 6mm 7mm !important;
    }
    #calendar-print-area .calendar-layout-3_sheets {
        padding: 10mm 9mm 8mm 9mm !important;
    }
    #calendar-print-area .calendar-layout-4_sheets {
        padding: 12mm 11mm 9mm 11mm !important;
    }
    #calendar-print-area .calendar-sheet-content {
        align-content: start !important;
    }
    #calendar-print-area .calendar-sheet-header {
        page-break-inside: avoid !important;
        break-inside: avoid-page !important;
    }
    #calendar-print-area .calendar-sheet-footer {
        page-break-inside: avoid !important;
        break-inside: avoid-page !important;
    }
    #calendar-print-area .calendar-sheet-content > div {
        page-break-inside: avoid !important;
        break-inside: avoid-page !important;
    }

    /* Strict Media Print Formatting for Physical & PDF Output */
    @media print {
        @page {
            size: auto;
            margin: 0;
        }
        @page portrait {
            size: A4 portrait;
            margin: 0;
        }
        @page landscape {
            size: A4 landscape;
            margin: 0;
        }
        html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            width: 100% !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }
        .no-print {
            display: none !important;
        }
        #print-root {
            display: block !important;
            gap: 0 !important;
        }
        .print-portrait {
            page: portrait;
            width: 100% !important;
            max-width: 210mm !important;
            min-height: 0 !important;
            height: auto !important;
            margin: 0 auto !important;
            box-sizing: border-box !important;
            overflow: visible !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            page-break-inside: auto !important;
            break-inside: auto !important;
        }
        .print-landscape {
            page: landscape;
            width: 100% !important;
            max-width: 297mm !important;
            min-height: 0 !important;
            height: auto !important;
            margin: 0 auto !important;
            box-sizing: border-box !important;
            overflow: visible !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            page-break-inside: auto !important;
            break-inside: auto !important;
        }
        .printable-content-wrapper {
            box-shadow: none !important;
            border-radius: 0 !important;
            transform: none !important;
            height: auto !important;
            overflow: visible !important;
        }
        .page-break-after,
        .break-after-page {
            margin: 0 auto !important;
            box-shadow: none !important;
            border: none !important;
            page-break-after: always !important;
            break-after: page !important;
        }
        .page-break-after:last-child,
        .break-after-page:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
        }
        table {
            page-break-inside: auto !important;
            break-inside: auto !important;
        }
        thead {
            display: table-header-group !important;
        }
        tfoot {
            display: table-footer-group !important;
        }
        tr, td, th {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
        }
        #jadwal-print-area .printable-content-wrapper,
        #jadwal-print-area .page-break-after {
            width: 100% !important;
            max-width: 29.7cm !important;
            min-height: auto !important;
            box-sizing: border-box !important;
            overflow: visible !important;
            page-break-inside: auto !important;
            break-inside: auto !important;
        }
        #jadwal-print-area .printable-content-wrapper > div,
        #jadwal-print-area .jadwal-sheet > div {
            page-break-after: auto !important;
            break-after: auto !important;
            page-break-inside: avoid !important;
            break-inside: avoid-page !important;
        }
        #jadwal-print-area .jadwal-sheet {
            min-height: 19.2cm !important;
            height: auto !important;
            display: flex !important;
            flex-direction: column !important;
        }
        #jadwal-print-area .jadwal-table-block {
            flex: 1 1 auto !important;
        }
        #jadwal-print-area .report-signature-footer {
            margin-top: auto !important;
            padding-top: 0.16cm !important;
            border-top: 1px solid rgba(100, 116, 139, 0.55) !important;
            color: rgba(71, 85, 105, 0.78) !important;
            font-size: 8.5pt !important;
            font-style: italic !important;
        }
        #calendar-print-area .calendar-sheet {
            width: 21cm !important;
            min-height: 29.7cm !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
            page-break-inside: avoid !important;
            break-inside: avoid-page !important;
        }
        #calendar-print-area .calendar-layout-1_sheet {
            padding: 7mm 7mm 6mm 7mm !important;
        }
        #calendar-print-area .calendar-layout-3_sheets {
            padding: 10mm 9mm 8mm 9mm !important;
        }
        #calendar-print-area .calendar-layout-4_sheets {
            padding: 12mm 11mm 9mm 11mm !important;
        }
        #calendar-print-area .calendar-sheet-content {
            align-content: start !important;
        }
        #calendar-print-area .calendar-sheet-content > div {
            page-break-inside: avoid !important;
            break-inside: avoid-page !important;
        }
    }
`;

const collectDocumentStyles = () => {
    let styles = '';
    document.querySelectorAll('style, link[rel="stylesheet"]').forEach(node => {
        styles += node.outerHTML;
    });
    return styles;
};

const extractPrintableContent = (element: HTMLElement, elementId: string): string => {
    // For report preview, avoid exporting the zoom wrapper (transform: scale)
    // and use raw page nodes directly.
    if (elementId === 'preview-area') {
        const zoomWrapper = element.querySelector('.printable-content-wrapper');
        if (zoomWrapper) {
            return (zoomWrapper as HTMLElement).innerHTML;
        }
    }
    return element.innerHTML;
};

const buildUnifiedHtmlDocument = (
    content: string,
    fileName: string,
    options?: { showToolbar?: boolean; isJadwalPrint?: boolean; isSarprasPrint?: boolean; elementId?: string }
) => {
    const styles = collectDocumentStyles();
    const showToolbar = options?.showToolbar ?? false;
    const isJadwalPrint = options?.isJadwalPrint ?? false;
    const isSarprasPrint = options?.isSarprasPrint ?? false;
    const rootElementId = options?.elementId ?? 'print-root';
    const isCalendarPrint = rootElementId === 'calendar-print-area';

    return `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${fileName}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Amiri:ital,wght@0,400;0,700;1,400;1,700&family=Cinzel:wght@600;700;800;900&family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&family=Inter:wght@400;500;600;700&family=Scheherazade+New:wght@400;700&family=Lateef:wght@400;700&display=swap" rel="stylesheet">
    ${styles}
    <style>
        ${getUnifiedPreviewPrintStyles()}
        @media print {
            @page portrait { size: A4 portrait; margin: 0; }
            @page landscape { size: A4 landscape; margin: 0; }
            .print-portrait { page: portrait; }
            .print-landscape { page: landscape; }
            ${isJadwalPrint ? '@page { margin: 6mm; size: A4 landscape; }' : ''}
            ${isCalendarPrint ? '@page { margin: 0mm; size: A4 portrait; }' : ''}
            body { padding: 0 !important; background: #fff !important; }
            .printable-content-wrapper {
                width: auto !important;
                max-width: 100% !important;
                box-sizing: border-box !important;
                position: relative !important;
                z-index: 1 !important;
            }
            ${isCalendarPrint ? `
            #calendar-print-area .calendar-sheet {
                width: 210mm !important;
                min-height: 297mm !important;
                height: 297mm !important;
                margin: 0 !important;
                box-sizing: border-box !important;
                page-break-after: always !important;
                break-after: page !important;
                overflow: hidden !important;
            }
            #calendar-print-area .calendar-sheet:last-child {
                page-break-after: auto !important;
                break-after: auto !important;
            }
            #calendar-print-area .calendar-sheet-header,
            #calendar-print-area .calendar-sheet-content,
            #calendar-print-area .calendar-sheet-footer {
                page-break-inside: avoid !important;
                break-inside: avoid-page !important;
            }
            ` : ''}
            ${isSarprasPrint ? `
            #sarpras-print-area .printable-content-wrapper {
                min-height: auto !important;
                page-break-after: auto !important;
                break-after: auto !important;
            }
            ` : ''}
        }
    </style>
</head>
<body>
    ${showToolbar ? `
    <div class="no-print" style="position: sticky; top: 0; z-index: 9999; background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(8px); border-bottom: 1px solid #e2e8f0; padding: 12px 24px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); margin-bottom: 24px;">
        <div style="max-width: 1200px; margin: 0 auto; display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 12px;">
            <div style="display: flex; align-items: center; gap: 12px;">
                <div style="background: #0f766e; color: white; width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 16px;">
                    📄
                </div>
                <div>
                    <h1 style="margin: 0; font-size: 15px; font-weight: 700; color: #0f172a;">${fileName}</h1>
                    <p style="margin: 0; font-size: 12px; color: #64748b;">Format Lembar Kerja Standar A4 • eSantri Digital Document Viewer</p>
                </div>
            </div>
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 11px; color: #475569; background: #f1f5f9; padding: 6px 12px; border-radius: 6px; border: 1px solid #cbd5e1;">
                    💡 Tips: Pada dialog cetak, pilih <b>Layout: Otomatis/Portrait</b>, <b>Paper: A4</b> & <b>Margins: None/Default</b>
                </span>
                <button onclick="window.print()" style="background: #0f766e; hover:background: #115e59; color: white; border: none; padding: 8px 18px; border-radius: 8px; cursor: pointer; font-weight: 700; font-size: 13px; display: flex; align-items: center; gap: 6px; box-shadow: 0 2px 4px rgba(15, 118, 110, 0.2);">
                    <span>🖨️</span> Cetak / Simpan PDF
                </button>
            </div>
        </div>
    </div>
    ` : ''}
    <div id="${rootElementId}">
    ${content}
    </div>
</body>
</html>`;
};

/**
 * HTML Export with Offline Support
 * Embeds styles and cleans up the document for offline usage.
 */
export const exportToHtml = (elementId: string, fileName: string) => {
    const element = document.getElementById(elementId);
    if (!element) return;
    const isJadwalPrint = elementId === 'jadwal-print-area';
    const isSarprasPrint = elementId === 'sarpras-print-area';
    const content = extractPrintableContent(element, elementId);
    const finalHtml = buildUnifiedHtmlDocument(content, fileName, { showToolbar: true, isJadwalPrint, isSarprasPrint, elementId });

    const blob = new Blob([finalHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileName}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

export const printPreviewExact = async (elementId: string, fileName: string): Promise<void> => {
    const element = document.getElementById(elementId);
    if (!element) return;
    const isJadwalPrint = elementId === 'jadwal-print-area';
    const isSarprasPrint = elementId === 'sarpras-print-area';
    const content = extractPrintableContent(element, elementId);
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(
        `${buildUnifiedHtmlDocument(content, fileName, { showToolbar: false, isJadwalPrint, isSarprasPrint, elementId })}
         <script>
            window.onload = () => {
                setTimeout(() => {
                    window.focus();
                    window.print();
                }, 700);
            };
         </script>`
    );
    doc.close();

    setTimeout(() => {
        if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
        }
    }, 60000);
};

export const exportToWord = (elementId: string, fileName: string) => {
    const element = document.getElementById(elementId);
    if (!element) return;
    const isJadwalPrint = elementId === 'jadwal-print-area';
    const isSurat = elementId === 'surat-peringatan-print-area' || elementId === 'surat-preview-container';
    const content = extractPrintableContent(element, elementId);
    const styles = collectDocumentStyles();
    const finalHtml = `
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
<meta charset="utf-8">
<title>${fileName}</title>
<!--[if gte mso 9]>
<xml>
<w:WordDocument>
    <w:View>Print</w:View>
    <w:Zoom>100</w:Zoom>
    <w:DoNotOptimizeForBrowser/>
</w:WordDocument>
</xml>
<![endif]-->
${styles}
<style>
    @page Section1 {
        size: ${isJadwalPrint ? '841.9pt 595.3pt' : '595.3pt 841.9pt'};
        mso-page-orientation: ${isJadwalPrint ? 'landscape' : 'portrait'};
        margin: ${isSurat ? '54.0pt 54.0pt 54.0pt 54.0pt' : '36.0pt 36.0pt 36.0pt 36.0pt'};
        mso-header-margin: 36.0pt;
        mso-footer-margin: 36.0pt;
        mso-paper-source: 0;
    }
    div.Section1 { 
        page: Section1; 
        font-family: 'Times New Roman', 'Book Antiqua', Palatino, serif;
        font-size: 11pt;
        line-height: 1.4;
        color: #000;
    }
    body { 
        margin: 0; 
        padding: 0; 
        background: #fff; 
        font-family: 'Times New Roman', 'Book Antiqua', Palatino, serif;
    }
    table {
        border-collapse: collapse;
        mso-table-lspace: 0pt;
        mso-table-rspace: 0pt;
    }
    td, th {
        mso-table-rspace: 0pt;
        mso-table-lspace: 0pt;
    }
    p {
        margin-top: 0;
        margin-bottom: 6pt;
    }
    .print-portrait, .print-landscape {
        width: 100% !important;
        max-width: 100% !important;
        padding: 0 !important;
        margin: 0 !important;
        box-shadow: none !important;
        min-height: auto !important;
    }
    ${getUnifiedPreviewPrintStyles()}
</style>
</head>
<body>
<div class="Section1">
${content}
</div>
</body>
</html>`;

    const blob = new Blob(['\ufeff', finalHtml], {
        type: 'application/msword'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileName}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

/**
 * AutoTable Export
 * Scrapes tables from the preview area and creates a clean PDF.
 */
export const exportToAutoTable = async (elementId: string, fileName: string) => {
    const element = document.getElementById(elementId);
    if (!element) return;

    const detectAutoOrientation = (): 'p' | 'l' => {
        // Cek eksplisit class .print-landscape atau .print-portrait
        const hasLandscapeClass = element.classList.contains('print-landscape') || element.querySelector('.print-landscape') !== null;
        const hasPortraitClass = element.classList.contains('print-portrait') || element.querySelector('.print-portrait') !== null;

        if (hasLandscapeClass && !hasPortraitClass) return 'l';
        if (hasPortraitClass && !hasLandscapeClass) return 'p';

        const pages = element.querySelectorAll('.print-portrait, .print-landscape, .page-break-after');
        let maxEstimatedWidth = 0;

        pages.forEach((pageContainer) => {
            const tables = Array.from(pageContainer.querySelectorAll('table')).filter(t => !t.classList.contains('print-meta')) as HTMLTableElement[];
            tables.forEach((table) => {
                const headers = Array.from(table.querySelectorAll('thead th'));
                if (headers.length === 0) return;

                const columnCount = headers.length;
                let textFactor = 0;
                headers.forEach((th) => {
                    const len = (th.textContent || '').replace(/\s+/g, ' ').trim().length;
                    textFactor += Math.min(len, 20);
                });

                // Estimasi sederhana lebar tabel:
                // - basis lebar per kolom
                // - ditambah bobot panjang header
                const estimatedWidth = (columnCount * 22) + (textFactor * 1.2);
                if (estimatedWidth > maxEstimatedWidth) {
                    maxEstimatedWidth = estimatedWidth;
                }
            });
        });

        // Ambang ini membuat tabel sempit tetap portrait, tabel lebar otomatis landscape.
        return maxEstimatedWidth > 165 ? 'l' : 'p';
    };

    const [{ jsPDF }, autoTableModule] = await Promise.all([
        loadJsPdf(),
        loadJsPdfAutoTable()
    ]);
    const autoTable = autoTableModule.default;

    const orientation = detectAutoOrientation();
    const doc = new jsPDF(orientation, 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Find all visual pages (including the last page without page-break-after)
    const pages = element.querySelectorAll('.print-portrait, .print-landscape, .page-break-after');
    
    if (pages.length === 0) {
        alert("Tidak ditemukan halaman laporan yang bisa diproses.");
        return;
    }

    let isFirstPage = true;

    pages.forEach((pageContainer, pageIndex) => {
        const titles = pageContainer.querySelectorAll('h1, h2, h3, h4');
        const metaContainers = pageContainer.querySelectorAll('.print-meta');
        const schoolNameFromH2 = pageContainer.querySelector('h2')?.textContent?.replace(/\s+/g, ' ').trim() || '';
        const addressFromParagraph = pageContainer.querySelector('p')?.textContent?.replace(/\s+/g, ' ').trim() || '';
        const reportTitleFromSubtitle = pageContainer.querySelector('.print-header-subtitle')?.textContent?.replace(/\s+/g, ' ').trim() || '';
        
        // Find tables in this specific page, excluding meta tables
        const allPageTables = pageContainer.querySelectorAll('table');
        const tables: HTMLTableElement[] = [];
        allPageTables.forEach(t => {
            if (!t.classList.contains('print-meta')) {
                tables.push(t);
            }
        });

        if (tables.length === 0 && metaContainers.length === 0 && titles.length === 0) {
            return; // Skip completely empty containers
        }

        if (!isFirstPage) {
            doc.addPage();
        }
        isFirstPage = false;
        
        let yPos = 15;
        let reportTitle = '';
        let schoolName = '';
        let address = '';

        const titleTexts = Array.from(titles)
            .map((title) => title.textContent?.replace(/\s+/g, ' ').trim() || '')
            .filter(Boolean);

        if (titleTexts.length > 0) {
            schoolName = titleTexts[0];
            reportTitle = titleTexts.length > 1 ? titleTexts[titleTexts.length - 1] : '';
        }
        if (schoolNameFromH2) schoolName = schoolName || schoolNameFromH2;
        if (addressFromParagraph) address = addressFromParagraph;
        if (reportTitleFromSubtitle) reportTitle = reportTitleFromSubtitle;

        // KOP rapi: nama pondok -> alamat -> garis -> judul
        if (schoolName) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(14);
            doc.text(schoolName, pageWidth / 2, yPos, { align: 'center' });
            yPos += 6;
        }
        if (address) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.text(address, pageWidth / 2, yPos, { align: 'center' });
            yPos += 5;
        }

        doc.setDrawColor(80, 80, 80);
        doc.setLineWidth(0.3);
        doc.line(10, yPos, pageWidth - 10, yPos);
        yPos += 8;

        if (reportTitle) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12);
            doc.text(reportTitle, pageWidth / 2, yPos, { align: 'center' });
            yPos += 7;
        }

        // Print Meta
        if (metaContainers.length > 0) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            let allMetaLines: string[] = [];
            
            metaContainers.forEach(metaContainer => {
                if (metaContainer.classList.contains('print-header-subtitle') || metaContainer.classList.contains('report-signature-footer')) return;
                
                let metaText = '';
                if (metaContainer.classList.contains('grid')) {
                    Array.from(metaContainer.children).forEach((child) => {
                        const text = child.textContent?.replace(/\s+/g, ' ').trim();
                        if (text) {
                            metaText += text + " | ";
                        }
                    });
                    metaText = metaText.replace(/ \|\ $/, '');
                    if (metaText && !metaText.toLowerCase().includes('dibuat dengan aplikasi esantri web')) allMetaLines.push(metaText);
                } else if (metaContainer.nodeName.toLowerCase() === 'table') {
                    Array.from(metaContainer.querySelectorAll('tr')).forEach(tr => {
                        let rowText = '';
                        Array.from(tr.querySelectorAll('td, th')).forEach(td => rowText += (td.textContent?.trim() + " "));
                        const cleaned = rowText.replace(/\s+/g, ' ').trim();
                        if (cleaned && !cleaned.toLowerCase().includes('dibuat dengan aplikasi esantri web')) allMetaLines.push(cleaned);
                    });
                } else {
                    metaText = metaContainer.textContent?.replace(/\s+/g, ' ').trim() || '';
                    if (metaText && !metaText.toLowerCase().includes('dibuat dengan aplikasi esantri web')) allMetaLines.push(metaText);
                }
            });
            
            allMetaLines.forEach(line => {
                const wrappedLines = doc.splitTextToSize(line, pageWidth - 30);
                wrappedLines.forEach((wrapped: string) => {
                    doc.text(wrapped, pageWidth / 2, yPos, { align: 'center' });
                    yPos += 4.5;
                });
                yPos += 1.5;
            });
            yPos += 3;
        }

        // Print Tables for this page
        tables.forEach((table, index) => {
            if (index > 0) yPos += 10;

            // @ts-ignore
            doc.autoTable({
                html: table,
                startY: yPos,
                theme: 'grid',
                styles: {
                    fontSize: 8,
                    cellPadding: 2
                },
                headStyles: { fillColor: [45, 120, 110], textColor: 255 },
                margin: { left: 10, right: 10 },
                didDrawPage: (data: any) => {
                    yPos = data.cursor?.y || yPos;
                }
            });
            
            // @ts-ignore
            yPos = (doc as any).lastAutoTable.finalY + 5;
        });

        // Footer tetap di bawah halaman
        const pageHeight = doc.internal.pageSize.getHeight();
        const footerLineY = pageHeight - 9;
        const footerTextY = pageHeight - 5;
        doc.setDrawColor(170, 170, 170);
        doc.setLineWidth(0.15);
        doc.line(10, footerLineY, pageWidth - 10, footerLineY);
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.text('dibuat dengan eSantri Web by AI Projek | aiprojek01.my.id', pageWidth / 2, footerTextY, { align: 'center' });
        doc.setTextColor(0, 0, 0);
    });

    if (isFirstPage) {
        alert("Tidak ditemukan tabel data yang bisa diproses untuk AutoTable. Gunakan PDF (Asli) untuk hasil visual.");
        return;
    }

    doc.save(`${fileName}.pdf`);
};

/**
 * Excel Export by HTML Tables
 * Scrapes visual pages and tables, putting each page's table into a separate sheet.
 */
export const exportPreviewToExcelWorksheets = async (elementId: string, fileName: string) => {
    const element = document.getElementById(elementId);
    if (!element) return;
    const XLSX = await loadXLSX();

    const pages = element.querySelectorAll('.print-portrait, .print-landscape, .page-break-after');
    
    if (pages.length === 0) {
        alert("Tidak ditemukan halaman laporan yang bisa diproses.");
        return;
    }

    const workbook = XLSX.utils.book_new();
    let sheetCount = 1;

    pages.forEach((pageContainer) => {
        const titles = pageContainer.querySelectorAll('h1, h2, h3, h4');
        const metaContainers = pageContainer.querySelectorAll('.print-meta');
        
        // Find main tables
        const allPageTables = pageContainer.querySelectorAll('table');
        const tables: HTMLTableElement[] = [];
        allPageTables.forEach(t => {
            if (!t.classList.contains('print-meta')) {
                tables.push(t);
            }
        });

        if (tables.length === 0) return; // Skip pages without tables

        tables.forEach((table, tableIndex) => {
            // Determine sheet name
            let sheetName = `Halaman ${sheetCount}`;
            // Try to use title if available
            if (titles.length > 0 && titles[0].textContent) {
                const safeTitle = titles[0].textContent.substring(0, 20).replace(/[\\/?*[\]]/g, '');
                if (safeTitle) sheetName = `${safeTitle} ${sheetCount}`;
            }
            // Ensure sheet name exists and is unique (max 31 chars)
            if (sheetName.length > 31) sheetName = sheetName.substring(0, 31);
            if (workbook.SheetNames.includes(sheetName)) sheetName = `${sheetName.substring(0, 27)}_${sheetCount}`;
            
            // Extract meta text
            let metaLines: string[] = [];
            titles.forEach(t => metaLines.push(t.textContent?.trim() || ''));
            
            metaContainers.forEach(metaContainer => {
                if (metaContainer.classList.contains('print-header-subtitle') || metaContainer.classList.contains('report-signature-footer')) return;
                
                let metaText = '';
                if (metaContainer.classList.contains('grid')) {
                    Array.from(metaContainer.children).forEach((child) => {
                        const text = child.textContent?.replace(/\s+/g, ' ').trim();
                        if (text) metaText += text + " | ";
                    });
                    metaText = metaText.replace(/ \|\ $/, '');
                    if (metaText && !metaText.toLowerCase().includes('dibuat dengan aplikasi esantri web')) metaLines.push(metaText);
                } else if (metaContainer.nodeName.toLowerCase() === 'table') {
                    Array.from(metaContainer.querySelectorAll('tr')).forEach(tr => {
                        let rowText = '';
                        Array.from(tr.querySelectorAll('td, th')).forEach(td => rowText += (td.textContent?.trim() + " "));
                        const cleaned = rowText.replace(/\s+/g, ' ').trim();
                        if (cleaned && !cleaned.toLowerCase().includes('dibuat dengan aplikasi esantri web')) metaLines.push(cleaned);
                    });
                } else {
                    metaText = metaContainer.textContent?.replace(/\s+/g, ' ').trim() || '';
                    if (metaText && !metaText.toLowerCase().includes('dibuat dengan aplikasi esantri web')) metaLines.push(metaText);
                }
            });
            metaLines = metaLines.filter(m => m !== '');

            // Convert HTML table to sheet
            const worksheet = XLSX.utils.table_to_sheet(table);

            // If there's header meta, shift rows down and add them at the top
            if (metaLines.length > 0) {
                const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
                const shiftRows = metaLines.length + 2; // Shift by meta lines + empty row
                
                // Shift all existing cells down
                for (let r = range.e.r; r >= range.s.r; r--) {
                    for (let c = range.s.c; c <= range.e.c; c++) {
                        const oldCell = XLSX.utils.encode_cell({ r: r, c: c });
                        const newCell = XLSX.utils.encode_cell({ r: r + shiftRows, c: c });
                        if (worksheet[oldCell]) {
                            worksheet[newCell] = worksheet[oldCell];
                            delete worksheet[oldCell];
                        }
                    }
                }
                
                // Adjust ref
                range.e.r += shiftRows;
                worksheet['!ref'] = XLSX.utils.encode_range(range);

                // Insert Meta lines at top
                metaLines.forEach((text, i) => {
                    XLSX.utils.sheet_add_aoa(worksheet, [[text]], { origin: `A${i + 1}` });
                });
            }

            XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.substring(0,31));
            sheetCount++;
        });
    });

    if (workbook.SheetNames.length === 0) {
        alert("Tidak ada tabel data untuk diekspor ke Excel.");
        return;
    }

    XLSX.writeFile(workbook, `${fileName}.xlsx`);
};
