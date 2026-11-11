import { loadJsPdf, loadJsPdfAutoTable, loadXLSX } from "./lazyClientLibs";
import { getStandaloneDocumentStyles, getStandaloneDocumentStylesSync } from "./standaloneStyles";

const getUnifiedPreviewPrintStyles = () => `
    * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
    }
    /* Screen Display: Realistic Paper Sheet View (Offline HTML Viewer) */
    @media screen {
        body {
            background-color: #f1f5f9;
            margin: 0;
            padding: 20px 0 40px 0;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            color: #1e293b;
        }
        #print-root, #preview-area, .preview-area-exported, #jadwal-print-area, #sarpras-print-area, #calendar-print-area, #surat-preview-container, #surat-peringatan-print-area {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 24px;
            width: 100%;
            margin: 0 auto;
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
        width: 210mm !important;
        max-width: 210mm !important;
        min-height: 297mm !important;
        box-sizing: border-box !important;
        overflow: visible !important;
        page-break-inside: avoid !important;
        break-inside: avoid-page !important;
    }
    #calendar-print-area .calendar-layout-1_sheet {
        padding: 4mm 5mm 3mm 5mm !important;
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
            filter: none !important;
            -webkit-filter: none !important;
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
            text-rendering: geometricPrecision !important;
            -webkit-font-smoothing: antialiased !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }
        *, *::before, *::after {
            box-shadow: none !important;
            -webkit-box-shadow: none !important;
            text-shadow: none !important;
            filter: none !important;
            -webkit-filter: none !important;
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
        }
        .no-print {
            display: none !important;
        }
        #print-root, #preview-area, .preview-area-exported, #jadwal-print-area, #sarpras-print-area, #calendar-print-area, #surat-preview-container, #surat-peringatan-print-area {
            display: block !important;
            gap: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            background: transparent !important;
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

const collectDocumentStyles = async (): Promise<string> => {
    let styles = '';
    // 1. Embed all active compiled stylesheet rules directly so offline HTML viewer has full styling (Tailwind, grid, flex, colors, borders)
    try {
        const compiledCss = await getStandaloneDocumentStyles();
        if (compiledCss && compiledCss.trim().length > 0) {
            styles += `<style id="embedded-compiled-styles">\n${compiledCss}\n</style>\n`;
        }
    } catch (e) {
        console.warn('Failed to extract standalone document styles:', e);
        try {
            const syncCss = getStandaloneDocumentStylesSync();
            if (syncCss && syncCss.trim().length > 0) {
                styles += `<style id="embedded-compiled-styles">\n${syncCss}\n</style>\n`;
            }
        } catch (err) {
            console.warn('Failed to extract synchronous document styles:', err);
        }
    }

    // 2. Append explicit inline <style> elements from DOM
    document.querySelectorAll('style').forEach(node => {
        if (node.id !== 'embedded-compiled-styles' && node.textContent) {
            styles += `<style>${node.textContent}</style>\n`;
        }
    });

    // 3. Keep external links (CDN fonts/stylesheets with absolute URLs)
    document.querySelectorAll('link[rel="stylesheet"]').forEach(node => {
        const href = node.getAttribute('href');
        if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
            styles += `<link rel="stylesheet" href="${href}">\n`;
        }
    });

    // 4. Always include Bootstrap Icons CDN fallback
    styles += `<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">\n`;

    return styles;
};

const extractPrintableContent = (element: HTMLElement, elementId: string): string => {
    // For report preview, avoid exporting the zoom wrapper (transform: scale)
    // and use raw page nodes directly.
    let targetElement: HTMLElement = element;
    if (elementId === 'preview-area') {
        const zoomWrapper = element.querySelector('.printable-content-wrapper');
        if (zoomWrapper) {
            targetElement = zoomWrapper as HTMLElement;
        }
    }

    // Clone element to normalize relative image paths to absolute URLs without touching live DOM
    const clone = targetElement.cloneNode(true) as HTMLElement;
    const images = clone.querySelectorAll<HTMLImageElement>('img');
    images.forEach(img => {
        const currentSrc = img.getAttribute('src');
        if (currentSrc && !currentSrc.startsWith('data:') && !currentSrc.startsWith('http://') && !currentSrc.startsWith('https://')) {
            try {
                const absoluteUrl = new URL(currentSrc, window.location.href).href;
                img.setAttribute('src', absoluteUrl);
            } catch (e) {
                // Ignore parse errors
            }
        }
    });

    return clone.innerHTML;
};

const buildUnifiedHtmlDocument = async (
    content: string,
    fileName: string,
    options?: { showToolbar?: boolean; isJadwalPrint?: boolean; isSarprasPrint?: boolean; elementId?: string }
): Promise<string> => {
    const styles = await collectDocumentStyles();
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
    <!-- Tailwind CSS Engine Fallback: Guarantees 100% precision rendering matching in-app preview -->
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        ${getUnifiedPreviewPrintStyles()}
        @media print {
            @page portrait { size: A4 portrait; margin: 0; }
            @page landscape { size: A4 landscape; margin: 0; }
            .print-portrait { page: portrait; }
            .print-landscape { page: landscape; }
            ${isJadwalPrint ? '@page { margin: 6mm; size: A4 landscape; }' : ''}
            ${isCalendarPrint ? '@page { margin: 4mm; size: A4 portrait; }' : ''}
            body { padding: 0 !important; background: #fff !important; }
            .printable-content-wrapper {
                width: auto !important;
                max-width: 100% !important;
                box-sizing: border-box !important;
                position: relative !important;
                z-index: 1 !important;
            }
            ${isCalendarPrint ? `
            @page { margin: 0; size: A4 portrait; }
            #calendar-print-area .calendar-sheet {
                width: 210mm !important;
                max-width: 210mm !important;
                min-height: 297mm !important;
                height: 297mm !important;
                margin: 0 auto !important;
                box-sizing: border-box !important;
                page-break-after: always !important;
                break-after: page !important;
                page-break-inside: avoid !important;
                break-inside: avoid-page !important;
                overflow: visible !important;
            }
            #calendar-print-area .calendar-layout-1_sheet {
                padding: 4mm 5mm 3mm 5mm !important;
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
    <div id="print-root">
        <div id="${rootElementId}" class="preview-area-exported">
            ${content}
        </div>
    </div>
</body>
</html>`;
};

/**
 * HTML Export with Offline Support
 * Embeds styles and cleans up the document for offline usage.
 */
export const exportToHtml = async (elementId: string, fileName: string): Promise<void> => {
    const element = document.getElementById(elementId);
    if (!element) return;
    const isJadwalPrint = elementId === 'jadwal-print-area';
    const isSarprasPrint = elementId === 'sarpras-print-area';
    const content = extractPrintableContent(element, elementId);
    const finalHtml = await buildUnifiedHtmlDocument(content, fileName, { showToolbar: true, isJadwalPrint, isSarprasPrint, elementId });

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
    const unifiedHtml = await buildUnifiedHtmlDocument(content, fileName, { showToolbar: false, isJadwalPrint, isSarprasPrint, elementId });

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
        `${unifiedHtml}
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

export const exportToWord = async (elementId: string, fileName: string): Promise<void> => {
    const element = document.getElementById(elementId);
    if (!element) return;
    const isJadwalPrint = elementId === 'jadwal-print-area';
    const isSurat = elementId === 'surat-peringatan-print-area' || elementId === 'surat-preview-container';
    
    // Auto-detect landscape orientation from DOM classes or attributes
    const isLandscape = 
        isJadwalPrint ||
        element.classList.contains('print-landscape') ||
        element.querySelector('.print-landscape') !== null ||
        (element.getAttribute('data-orientation') === 'landscape');

    const content = extractPrintableContent(element, elementId);
    const styles = await collectDocumentStyles();
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
        size: ${isLandscape ? '841.9pt 595.3pt' : '595.3pt 841.9pt'};
        mso-page-orientation: ${isLandscape ? 'landscape' : 'portrait'};
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
    if (!element) {
        throw new Error('Elemen pratinjau laporan tidak ditemukan.');
    }

    // Helper: ekstrak base64 dari image element atau muat via canvas
    const extractImageBase64 = async (imgEl: HTMLImageElement | null): Promise<string | null> => {
        if (!imgEl) return null;
        try {
            const src = imgEl.src;
            if (!src) return null;
            if (src.startsWith('data:image/')) return src;
            if (imgEl.complete && imgEl.naturalWidth > 0) {
                const canvas = document.createElement('canvas');
                canvas.width = imgEl.naturalWidth;
                canvas.height = imgEl.naturalHeight;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(imgEl, 0, 0);
                    return canvas.toDataURL('image/png');
                }
            }
            return new Promise((resolve) => {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => {
                    try {
                        const c = document.createElement('canvas');
                        c.width = img.width;
                        c.height = img.height;
                        const cx = c.getContext('2d');
                        if (cx) {
                            cx.drawImage(img, 0, 0);
                            resolve(c.toDataURL('image/png'));
                        } else {
                            resolve(null);
                        }
                    } catch {
                        resolve(null);
                    }
                };
                img.onerror = () => resolve(null);
                img.src = src;
            });
        } catch {
            return null;
        }
    };

    // Helper: tentukan orientasi spesifik per lembar halaman
    const resolvePageOrientation = (pageEl: Element): 'l' | 'p' => {
        if (pageEl.classList.contains('print-landscape')) return 'l';
        if (pageEl.classList.contains('print-portrait')) return 'p';
        if (pageEl.querySelector('.print-landscape')) return 'l';
        if (pageEl.querySelector('.print-portrait')) return 'p';

        // Deteksi dari jumlah kolom tabel utama
        const tables = Array.from(pageEl.querySelectorAll('table')).filter(t => !t.classList.contains('print-meta'));
        for (const t of tables) {
            const ths = t.querySelectorAll('thead th, tr:first-child th, tr:first-child td');
            if (ths.length > 5) return 'l';
        }
        return 'p';
    };

    // Helper: parse blok tanda tangan resmi
    interface SignatureBlock {
        leftHeader: string;
        leftTitle: string;
        leftName: string;
        rightHeader: string;
        rightTitle: string;
        rightName: string;
    }

    const parseSignatures = (container: Element): SignatureBlock | null => {
        const allDivs = Array.from(container.querySelectorAll('div'));
        for (const div of allDivs) {
            const text = div.textContent || '';
            if (text.includes('Mengetahui') && (text.includes('Wali') || text.includes('Mudir') || text.includes('Kepala') || text.includes('Pondok Pesantren') || text.includes('Pengasuh') || text.includes('Pimpinan'))) {
                const columns = Array.from(div.children).filter(c => c.children.length >= 2 || c.querySelectorAll('p').length >= 2);
                if (columns.length >= 2) {
                    const leftPs = Array.from(columns[0].querySelectorAll('p')).map(p => p.textContent?.trim() || '').filter(Boolean);
                    const rightPs = Array.from(columns[1].querySelectorAll('p')).map(p => p.textContent?.trim() || '').filter(Boolean);

                    return {
                        leftHeader: leftPs[0] || 'Mengetahui,',
                        leftTitle: leftPs[1] || 'Wali Kelas',
                        leftName: leftPs[leftPs.length - 1] || '',
                        rightHeader: rightPs[0] || 'Pondok Pesantren',
                        rightTitle: rightPs[1] || 'Kepala Madrasah / Mudir',
                        rightName: rightPs[rightPs.length - 1] || ''
                    };
                }
            }
        }
        return null;
    };

    const [{ jsPDF }, autoTableModule] = await Promise.all([
        loadJsPdf(),
        loadJsPdfAutoTable()
    ]);
    const autoTable = autoTableModule.default;

    // Cari seluruh halaman visual laporan
    let pages = Array.from(element.querySelectorAll('.print-portrait, .print-landscape, .page-break-after'));
    if (pages.length === 0) {
        const wrapperChildren = element.querySelectorAll('.printable-content-wrapper > div');
        if (wrapperChildren.length > 0) {
            pages = Array.from(wrapperChildren);
        } else {
            pages = [element];
        }
    }

    if (pages.length === 0) {
        throw new Error('Tidak ditemukan halaman laporan yang bisa diproses.');
    }

    const firstOrientation = resolvePageOrientation(pages[0]);
    const doc = new jsPDF(firstOrientation, 'mm', 'a4');

    let processedPageCount = 0;

    for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
        const pageContainer = pages[pageIndex];
        const pageOrientation = resolvePageOrientation(pageContainer);

        // Cari tabel data pada halaman ini (kecuali tabel meta)
        const allPageTables = pageContainer.querySelectorAll('table');
        const tables: HTMLTableElement[] = [];
        allPageTables.forEach(t => {
            if (!t.classList.contains('print-meta')) {
                tables.push(t);
            }
        });

        const titles = pageContainer.querySelectorAll('h1, h2, h3, h4');
        const metaContainers = pageContainer.querySelectorAll('.print-meta');

        if (tables.length === 0 && metaContainers.length === 0 && titles.length === 0) {
            continue; // Lewati container kosong
        }

        if (processedPageCount > 0) {
            doc.addPage('a4', pageOrientation);
        }
        processedPageCount++;

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const marginX = 10;
        let yPos = 12;

        // --- 1. DETEKSI & MUAT LOGO ---
        const kopImgs = Array.from(pageContainer.querySelectorAll('img')) as HTMLImageElement[];
        let leftLogoImg: HTMLImageElement | null = null;
        let rightLogoImg: HTMLImageElement | null = null;

        if (kopImgs.length === 1) {
            leftLogoImg = kopImgs[0];
        } else if (kopImgs.length >= 2) {
            const yayasanImg = kopImgs.find(img => img.alt?.toLowerCase().includes('yayasan'));
            const ponpesImg = kopImgs.find(img => img.alt?.toLowerCase().includes('ponpes'));
            leftLogoImg = yayasanImg || kopImgs[0];
            rightLogoImg = ponpesImg || kopImgs[kopImgs.length - 1];
            if (leftLogoImg === rightLogoImg && kopImgs.length > 1) {
                rightLogoImg = kopImgs[1];
            }
        }

        const [leftLogoBase64, rightLogoBase64] = await Promise.all([
            extractImageBase64(leftLogoImg),
            extractImageBase64(rightLogoImg)
        ]);

        // --- 2. DETEKSI INFORMASI KOP & JUDUL LAPORAN ---
        const schoolNameFromH2 = pageContainer.querySelector('h2')?.textContent?.replace(/\s+/g, ' ').trim() || '';
        const reportTitleFromSubtitle = pageContainer.querySelector('.print-header-subtitle')?.textContent?.replace(/\s+/g, ' ').trim() || '';

        const allParagraphs = Array.from(pageContainer.querySelectorAll('p'))
            .map(p => p.textContent?.replace(/\s+/g, ' ').trim() || '')
            .filter(Boolean);

        const yayasanCandidate = allParagraphs.find(p => p.toLowerCase().includes('yayasan')) || '';
        const identityLine = allParagraphs.find(p => p.includes('NSPP') || p.includes('NPSN')) || '';
        const contactLine = allParagraphs.find(p => p.toLowerCase().includes('telp') || p.toLowerCase().includes('email') || p.toLowerCase().includes('website')) || '';
        const addressLine = allParagraphs.find(p => {
            const l = p.toLowerCase();
            return !l.includes('yayasan') &&
                !p.includes('NSPP') &&
                !p.includes('NPSN') &&
                !l.startsWith('telp') &&
                !l.startsWith('email') &&
                !l.startsWith('website') &&
                !l.startsWith('catatan') &&
                !l.startsWith('mengetahui') &&
                !l.startsWith('dibuat dengan') &&
                p.length > 8;
        }) || '';

        let schoolName = schoolNameFromH2;
        if (!schoolName && titles.length > 0) {
            schoolName = titles[0].textContent?.replace(/\s+/g, ' ').trim() || '';
        }
        let reportTitle = reportTitleFromSubtitle;
        if (!reportTitle && titles.length > 1) {
            reportTitle = titles[titles.length - 1].textContent?.replace(/\s+/g, ' ').trim() || '';
        }

        // --- 3. CETAK KOP RESMI ---
        const kopStartY = yPos;
        const logoSize = 17; // mm
        const kopTextCenterX = pageWidth / 2;

        if (yayasanCandidate) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8.5);
            doc.setTextColor(50, 50, 50);
            doc.text(yayasanCandidate.toUpperCase(), kopTextCenterX, yPos, { align: 'center' });
            yPos += 4.5;
        }

        if (schoolName) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(13.5);
            doc.setTextColor(15, 23, 42);
            doc.text(schoolName.toUpperCase(), kopTextCenterX, yPos, { align: 'center' });
            yPos += 5.5;
        }

        if (identityLine) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.setTextColor(60, 60, 60);
            doc.text(identityLine, kopTextCenterX, yPos, { align: 'center' });
            yPos += 4;
        }

        if (addressLine) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(50, 50, 50);
            doc.text(addressLine, kopTextCenterX, yPos, { align: 'center' });
            yPos += 4;
        }

        if (contactLine) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.5);
            doc.setTextColor(80, 80, 80);
            doc.text(contactLine, kopTextCenterX, yPos, { align: 'center' });
            yPos += 4;
        }

        // Cetak Logo jika ada
        if (leftLogoBase64) {
            try {
                doc.addImage(leftLogoBase64, 'PNG', marginX + 2, kopStartY, logoSize, logoSize);
            } catch (err) {
                console.warn('Gagal menyisipkan logo kiri:', err);
            }
        }
        if (rightLogoBase64 && rightLogoBase64 !== leftLogoBase64) {
            try {
                doc.addImage(rightLogoBase64, 'PNG', pageWidth - marginX - logoSize - 2, kopStartY, logoSize, logoSize);
            } catch (err) {
                console.warn('Gagal menyisipkan logo kanan:', err);
            }
        }

        yPos = Math.max(yPos, kopStartY + logoSize) + 2;

        // Garis Ganda KOP Resmi Pondok
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.6);
        doc.line(marginX, yPos, pageWidth - marginX, yPos);
        doc.setLineWidth(0.2);
        doc.line(marginX, yPos + 0.8, pageWidth - marginX, yPos + 0.8);
        yPos += 6;

        // --- 4. JUDUL LAPORAN ---
        if (reportTitle) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(11.5);
            doc.setTextColor(0, 0, 0);
            doc.text(reportTitle.toUpperCase(), pageWidth / 2, yPos, { align: 'center' });
            yPos += 5.5;
        }

        // --- 5. PRINT META (Jenjang, Kelas/Rombel, Tahun Ajaran, Semester, Wali Kelas) ---
        if (metaContainers.length > 0) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(30, 41, 59);
            const allMetaLines: string[] = [];

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
                const wrappedLines = doc.splitTextToSize(line, pageWidth - (marginX * 2) - 10);
                wrappedLines.forEach((wrapped: string) => {
                    doc.text(wrapped, pageWidth / 2, yPos, { align: 'center' });
                    yPos += 4;
                });
                yPos += 1;
            });
            yPos += 2;
        }

        // --- 6. TABEL DATA AUTOTABLE CERDAS ---
        tables.forEach((table, tableIndex) => {
            if (tableIndex > 0) yPos += 8;

            const thList = Array.from(table.querySelectorAll('thead th, tr:first-child th, tr:first-child td'));
            const colCount = thList.length || 8;
            const isLandscape = pageOrientation === 'l';

            // Skala font & padding adaptif sesuai orientasi dan kepadatan kolom
            let tableFontSize = 8;
            let tableCellPadding = 2;

            if (isLandscape) {
                if (colCount >= 14) { tableFontSize = 6; tableCellPadding = 1; }
                else if (colCount >= 11) { tableFontSize = 6.8; tableCellPadding = 1.2; }
                else if (colCount >= 8) { tableFontSize = 7.5; tableCellPadding = 1.5; }
                else { tableFontSize = 8.5; tableCellPadding = 2; }
            } else {
                if (colCount >= 12) { tableFontSize = 5.5; tableCellPadding = 0.8; }
                else if (colCount >= 9) { tableFontSize = 6.5; tableCellPadding = 1.1; }
                else if (colCount >= 7) { tableFontSize = 7.2; tableCellPadding = 1.4; }
                else { tableFontSize = 8; tableCellPadding = 1.8; }
            }

            // Tentukan columnStyles cerdas agar nomor/kode (NIS, NIK, Telepon) tidak patah baris canggung
            const columnStyles: Record<number, any> = {};
            thList.forEach((th, colIdx) => {
                const text = (th.textContent || '').trim().toLowerCase();
                if (text === 'no' || text === '#') {
                    columnStyles[colIdx] = { halign: 'center', cellWidth: 9 };
                } else if (text === 'nis' || text === 'nisn') {
                    columnStyles[colIdx] = { halign: 'center', minCellWidth: 22 };
                } else if (text === 'nik' || text.includes('nik ')) {
                    columnStyles[colIdx] = { halign: 'center', minCellWidth: 28 };
                } else if (text === 'l/p' || text === 'lp' || text === 'jk') {
                    columnStyles[colIdx] = { halign: 'center', cellWidth: 10 };
                } else if (text.includes('telepon') || text.includes('hp') || text.includes('kontak') || text.includes('no. telp')) {
                    columnStyles[colIdx] = { halign: 'center', minCellWidth: 25 };
                } else if (text.includes('nama lengkap') || text === 'nama santri' || text === 'nama') {
                    columnStyles[colIdx] = { halign: 'left', fontStyle: 'bold' };
                } else if (text.includes('tempat') || text.includes('ttl') || text.includes('lahir')) {
                    columnStyles[colIdx] = { halign: 'left' };
                } else if (text.includes('wali') || text.includes('ayah') || text.includes('ibu')) {
                    columnStyles[colIdx] = { halign: 'left' };
                } else if (text.includes('alamat')) {
                    columnStyles[colIdx] = { halign: 'left' };
                }
            });

            // @ts-ignore
            doc.autoTable({
                html: table,
                startY: yPos,
                theme: 'grid',
                styles: {
                    fontSize: tableFontSize,
                    cellPadding: tableCellPadding,
                    overflow: 'linebreak',
                    valign: 'middle',
                    lineColor: [200, 205, 215],
                    lineWidth: 0.15
                },
                headStyles: {
                    fillColor: [45, 120, 110], // Deep Teal
                    textColor: 255,
                    fontStyle: 'bold',
                    halign: 'center',
                    valign: 'middle'
                },
                alternateRowStyles: {
                    fillColor: [250, 252, 252]
                },
                columnStyles,
                margin: { left: marginX, right: marginX },
                didParseCell: (data: any) => {
                    // Cegah pembungkusan canggung pada digit/kode berjarak (NIS: 4625 02 0271, Telp: 0838 2243 4375)
                    if (data.section === 'body') {
                        const colHeader = (thList[data.column.index]?.textContent || '').trim().toLowerCase();
                        const isCodeCol = colHeader === 'nis' || colHeader === 'nisn' || colHeader === 'nik' || colHeader.includes('telepon') || colHeader.includes('hp');
                        if (isCodeCol) {
                            if (Array.isArray(data.cell.text)) {
                                data.cell.text = data.cell.text.map((t: string) => t.replace(/\s+/g, '\u00A0'));
                            } else if (typeof data.cell.text === 'string') {
                                data.cell.text = data.cell.text.replace(/\s+/g, '\u00A0');
                            }
                        }
                    }
                },
                didDrawPage: (data: any) => {
                    yPos = data.cursor?.y || yPos;
                }
            });

            // @ts-ignore
            yPos = (doc as any).lastAutoTable.finalY + 6;
        });

        // --- 7. TANDA TANGAN RESMI PONDOK (JIKA ADA) ---
        const signatures = parseSignatures(pageContainer);
        if (signatures) {
            let sigY = yPos + 6;
            const sigHeight = 28;

            // Jika ruang halaman tidak mencukupi, pindah ke halaman baru
            if (sigY + sigHeight > pageHeight - 16) {
                doc.addPage('a4', pageOrientation);
                sigY = 20;
            }

            const leftCenterX = marginX + 35;
            const rightCenterX = pageWidth - marginX - 35;

            doc.setFontSize(8.5);
            doc.setTextColor(40, 40, 40);

            // Tanda tangan Kiri (Wali Kelas)
            doc.setFont('helvetica', 'normal');
            doc.text(signatures.leftHeader, leftCenterX, sigY, { align: 'center' });
            doc.text(signatures.leftTitle, leftCenterX, sigY + 4.5, { align: 'center' });

            doc.setFont('helvetica', 'bold');
            doc.setTextColor(15, 23, 42);
            doc.text(signatures.leftName, leftCenterX, sigY + 20, { align: 'center' });
            const leftNameWidth = doc.getTextWidth(signatures.leftName);
            if (leftNameWidth > 5) {
                doc.setLineWidth(0.2);
                doc.line(leftCenterX - leftNameWidth / 2, sigY + 21, leftCenterX + leftNameWidth / 2, sigY + 21);
            }

            // Tanda tangan Kanan (Mudir / Kepala Madrasah)
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(40, 40, 40);
            doc.text(signatures.rightHeader, rightCenterX, sigY, { align: 'center' });
            doc.text(signatures.rightTitle, rightCenterX, sigY + 4.5, { align: 'center' });

            doc.setFont('helvetica', 'bold');
            doc.setTextColor(15, 23, 42);
            doc.text(signatures.rightName, rightCenterX, sigY + 20, { align: 'center' });
            const rightNameWidth = doc.getTextWidth(signatures.rightName);
            if (rightNameWidth > 5) {
                doc.setLineWidth(0.2);
                doc.line(rightCenterX - rightNameWidth / 2, sigY + 21, rightCenterX + rightNameWidth / 2, sigY + 21);
            }

            yPos = sigY + 24;
        }

        // --- 8. FOOTER HALAMAN DENGAN BRANDING & NOMOR HALAMAN ---
        const footerLineY = pageHeight - 9;
        const footerTextY = pageHeight - 5;
        doc.setDrawColor(180, 185, 195);
        doc.setLineWidth(0.15);
        doc.line(marginX, footerLineY, pageWidth - marginX, footerLineY);

        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(120, 120, 120);
        doc.text('dibuat dengan eSantri Web by AI Projek | aiprojek01.my.id', marginX, footerTextY);
        doc.text(`Halaman ${pageIndex + 1} dari ${pages.length}`, pageWidth - marginX, footerTextY, { align: 'right' });
        doc.setTextColor(0, 0, 0);
    }

    if (processedPageCount === 0) {
        throw new Error('Tidak ditemukan tabel data untuk AutoTable. Gunakan PDF (Asli) untuk laporan visual.');
    }

    doc.save(`${fileName}.pdf`);
};

/**
 * Excel Export by HTML Tables
 * Scrapes visual pages and tables, putting each page's table into a separate sheet.
 */
export const exportPreviewToExcelWorksheets = async (elementId: string, fileName: string) => {
    const element = document.getElementById(elementId);
    if (!element) {
        throw new Error('Elemen pratinjau laporan tidak ditemukan.');
    }
    const XLSX = await loadXLSX();

    const pages = element.querySelectorAll('.print-portrait, .print-landscape, .page-break-after');
    
    if (pages.length === 0) {
        throw new Error('Tidak ditemukan halaman laporan yang bisa diproses.');
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
        throw new Error('Tidak ada tabel data untuk diekspor ke Excel.');
    }

    XLSX.writeFile(workbook, `${fileName}.xlsx`);
};

export const exportToExcel = async (data: any[], fileName: string, sheetName: string = 'Data') => {
    const XLSX = await loadXLSX();
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.substring(0, 31));
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
};
