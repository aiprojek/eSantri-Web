import { loadHtml2Canvas, loadJsPdf } from "./lazyClientLibs";

interface PdfGeneratorOptions {
    paperSize: string; // 'A4', 'F4', 'Legal', 'Letter'
    fileName: string;
    margin?: string; // 'narrow', 'normal', 'wide'
}

// Utility to get dimensions in mm
const getPageDimensions = (paperSize: string): [number, number] => {
    switch (paperSize) {
        case 'A4': return [210, 297];
        case 'F4': return [215, 330];
        case 'Legal': return [216, 356];
        case 'Letter': return [216, 279];
        default: return [210, 297];
    }
};

const getRenderablePages = (element: HTMLElement): HTMLElement[] => {
    const explicitReportPages = element.querySelectorAll('.print-portrait, .print-landscape');
    if (explicitReportPages.length > 0) {
        return Array.from(explicitReportPages) as HTMLElement[];
    }

    const wrappers = element.querySelectorAll('.printable-content-wrapper');

    if (wrappers.length > 1) {
        return Array.from(wrappers) as HTMLElement[];
    }

    if (wrappers.length === 1) {
        const wrapper = wrappers[0] as HTMLElement;
        if (wrapper.style.pageBreakAfter === 'always' || wrapper.style.width === '21cm' || wrapper.style.width === '33cm') {
            return [wrapper];
        }
        return Array.from(wrapper.children) as HTMLElement[];
    }

    return [element];
};

const renderPageCanvas = async (page: HTMLElement) => {
    const html2canvas = await loadHtml2Canvas();
    return html2canvas(page, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: page.offsetWidth || 794,
        height: page.offsetHeight || 1123,
        windowWidth: 1400,
        windowHeight: 2200,
        onclone: (clonedDoc) => {
            const clonedElement = clonedDoc.querySelector(`[data-html2canvas-ignore]`);
            if (clonedElement) clonedElement.remove();

            const reportPages = clonedDoc.querySelectorAll('.printable-content-wrapper > div');
            reportPages.forEach((p) => {
                p.classList.remove('shadow-lg');
                (p as HTMLElement).style.boxShadow = 'none';
            });
        }
    });
};

const isCalendarElement = (elementId: string): boolean => elementId === 'calendar-print-area';

// Method 1: Visual Generator using html2canvas (Bitmap PDF)
export const generatePdf = async (elementId: string, options: PdfGeneratorOptions): Promise<void> => {
    const element = document.getElementById(elementId);
    if (!element) return;
    const [{ jsPDF }] = await Promise.all([loadJsPdf()]);
    const previewWrapper = elementId === 'preview-area'
        ? (element.querySelector('.printable-content-wrapper') as HTMLElement | null)
        : null;
    const previousTransform = previewWrapper?.style.transform;
    const previousTransition = previewWrapper?.style.transition;

    if (previewWrapper) {
        previewWrapper.style.transform = 'none';
        previewWrapper.style.transition = 'none';
    }

    try {
        const pages = getRenderablePages(element as HTMLElement);

        if (pages.length === 0) return;

        let format: [number, number] = getPageDimensions(options.paperSize);
        
        const isFirstPageLandscape = pages[0].classList.contains('print-landscape');
        const orientation = isFirstPageLandscape ? 'l' : 'p';

        const doc = new jsPDF({
            orientation: orientation,
            unit: 'mm',
            format: format,
            compress: true
        });

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        const calendarMode = isCalendarElement(elementId);

        for (let i = 0; i < pages.length; i++) {
            const page = pages[i];
            if (page.style.display === 'none') continue;

            const isLandscape = page.classList.contains('print-landscape');

            const canvas = await renderPageCanvas(page);

            if (canvas.width > 0) {
                if (calendarMode) {
                    const isVeryFirstOutputPage = i === 0;
                    if (!isVeryFirstOutputPage) {
                        doc.addPage(format, isLandscape ? 'l' : 'p');
                    }

                    const imgAspect = canvas.width / canvas.height;
                    const pageAspect = pageWidth / pageHeight;
                    let pdfImgWidth = pageWidth;
                    let pdfImgHeight = pageHeight;
                    let offsetX = 0;
                    let offsetY = 0;

                    if (imgAspect > pageAspect) {
                        pdfImgHeight = pageWidth / imgAspect;
                        offsetY = (pageHeight - pdfImgHeight) / 2;
                    } else {
                        pdfImgWidth = pageHeight * imgAspect;
                        offsetX = (pageWidth - pdfImgWidth) / 2;
                    }

                    const imgData = canvas.toDataURL('image/png');
                    try {
                        doc.addImage(imgData, 'PNG', offsetX, offsetY, pdfImgWidth, pdfImgHeight, undefined, 'FAST');
                    } catch (e) {
                        console.error("PDF addImage error:", e);
                        try {
                            doc.addImage(imgData, offsetX, offsetY, pdfImgWidth, pdfImgHeight);
                        } catch (e2) {
                            console.error("PDF addImage fallback error:", e2);
                        }
                    }
                    continue;
                }

                const pageCanvasHeightPx = Math.floor((canvas.width * pageHeight) / pageWidth);
                const totalSlices = Math.max(1, Math.ceil(canvas.height / pageCanvasHeightPx));

                for (let sliceIndex = 0; sliceIndex < totalSlices; sliceIndex++) {
                    const sourceY = sliceIndex * pageCanvasHeightPx;
                    const sliceHeightPx = Math.min(pageCanvasHeightPx, canvas.height - sourceY);
                    if (sliceHeightPx <= 0) continue;

                    const sliceCanvas = document.createElement('canvas');
                    sliceCanvas.width = canvas.width;
                    sliceCanvas.height = sliceHeightPx;
                    const sliceCtx = sliceCanvas.getContext('2d');
                    if (!sliceCtx) continue;
                    sliceCtx.drawImage(
                        canvas,
                        0,
                        sourceY,
                        canvas.width,
                        sliceHeightPx,
                        0,
                        0,
                        canvas.width,
                        sliceHeightPx
                    );

                    const isVeryFirstOutputPage = i === 0 && sliceIndex === 0;
                    if (!isVeryFirstOutputPage) {
                        doc.addPage(format, isLandscape ? 'l' : 'p');
                    }

                    const pdfImgWidth = pageWidth;
                    const pdfImgHeight = (sliceHeightPx * pageWidth) / canvas.width;
                    const imgData = sliceCanvas.toDataURL('image/png');

                    try {
                        doc.addImage(imgData, 'PNG', 0, 0, pdfImgWidth, pdfImgHeight, undefined, 'FAST');
                    } catch (e) {
                        console.error("PDF addImage error:", e);
                        try {
                            doc.addImage(imgData, 0, 0, pdfImgWidth, pdfImgHeight);
                        } catch (e2) {
                            console.error("PDF addImage fallback error:", e2);
                        }
                    }
                }
            }
        }

        doc.save(options.fileName);
    } finally {
        if (previewWrapper) {
            previewWrapper.style.transform = previousTransform || '';
            previewWrapper.style.transition = previousTransition || '';
        }
    }
};

export const printVisualPreview = async (elementId: string, paperSize: string): Promise<void> => {
    const element = document.getElementById(elementId);
    if (!element) return;
    const previewWrapper = elementId === 'preview-area'
        ? (element.querySelector('.printable-content-wrapper') as HTMLElement | null)
        : null;
    const previousTransform = previewWrapper?.style.transform;
    const previousTransition = previewWrapper?.style.transition;

    if (previewWrapper) {
        previewWrapper.style.transform = 'none';
        previewWrapper.style.transition = 'none';
    }

    try {
        const pages = getRenderablePages(element as HTMLElement).filter((page) => page.style.display !== 'none');
        if (pages.length === 0) return;

        const [pageWidthMm, pageHeightMm] = getPageDimensions(paperSize);
        const calendarMode = isCalendarElement(elementId);
        const renderedPages: Array<{ src: string; widthMm: number; heightMm: number }> = [];

        for (const page of pages) {
            const canvas = await renderPageCanvas(page);
            const isLandscape = page.classList.contains('print-landscape');
            const widthMm = isLandscape ? pageHeightMm : pageWidthMm;
            const heightMm = isLandscape ? pageWidthMm : pageHeightMm;

            if (calendarMode) {
                renderedPages.push({
                    src: canvas.toDataURL('image/png'),
                    widthMm,
                    heightMm
                });
                continue;
            }

            const pageCanvasHeightPx = Math.floor((canvas.width * heightMm) / widthMm);
            const totalSlices = Math.max(1, Math.ceil(canvas.height / pageCanvasHeightPx));

            for (let sliceIndex = 0; sliceIndex < totalSlices; sliceIndex++) {
                const sourceY = sliceIndex * pageCanvasHeightPx;
                const sliceHeightPx = Math.min(pageCanvasHeightPx, canvas.height - sourceY);
                if (sliceHeightPx <= 0) continue;

                const sliceCanvas = document.createElement('canvas');
                sliceCanvas.width = canvas.width;
                sliceCanvas.height = sliceHeightPx;
                const sliceCtx = sliceCanvas.getContext('2d');
                if (!sliceCtx) continue;
                sliceCtx.drawImage(
                    canvas,
                    0,
                    sourceY,
                    canvas.width,
                    sliceHeightPx,
                    0,
                    0,
                    canvas.width,
                    sliceHeightPx
                );

                renderedPages.push({
                    src: sliceCanvas.toDataURL('image/png'),
                    widthMm,
                    heightMm
                });
            }
        }

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

        const pagesHtml = renderedPages.map((page, index) => `
        <div class="print-page ${index < renderedPages.length - 1 ? 'page-break-after' : ''}" style="width:${page.widthMm}mm;height:${page.heightMm}mm;">
            <img src="${page.src}" alt="Preview halaman ${index + 1}" />
        </div>
    `).join('');

        doc.open();
        doc.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                @media print {
                    @page { margin: 0; }
                    body { margin: 0; }
                    .page-break-after { page-break-after: always; break-after: page; }
                }
                html, body {
                    margin: 0;
                    padding: 0;
                    background: white;
                }
                .print-page {
                    margin: 0 auto;
                    display: flex;
                    align-items: stretch;
                    justify-content: center;
                    overflow: hidden;
                }
                .print-page img {
                    width: 100%;
                    height: 100%;
                    object-fit: contain;
                    display: block;
                }
            </style>
        </head>
        <body>
            ${pagesHtml}
            <script>
                window.onload = () => {
                    setTimeout(() => {
                        window.focus();
                        window.print();
                    }, 700);
                };
            </script>
        </body>
        </html>
    `);
        doc.close();

        setTimeout(() => {
            if (document.body.contains(iframe)) {
                document.body.removeChild(iframe);
            }
        }, 60000);
    } finally {
        if (previewWrapper) {
            previewWrapper.style.transform = previousTransform || '';
            previewWrapper.style.transition = previousTransition || '';
        }
    }
};

// Method 2: Native Browser Print (Vector PDF)
// This creates a temporary iframe, copies content + styles, and triggers the browser's print dialog.
// This allows the user to "Save as PDF" with 100% perfect rendering (Vector text, sharp images).
interface PrintToPdfNativeOptions {
    paperSize?: string;
    orientation?: 'portrait' | 'landscape';
    margin?: { top: number; right: number; bottom: number; left: number };
}
export const printToPdfNative = (elementId: string, fileName: string, options?: PrintToPdfNativeOptions) => {
    const element = document.getElementById(elementId);
    if (!element) return;

    const paperSize = options?.paperSize || 'A4';
    const orientation = options?.orientation || 'portrait';
    const margin = options?.margin;

    // Detect orientation from the preview content
    const isLandscape = element.querySelector('.print-landscape') !== null || orientation === 'landscape';
    const actualOrientation = isLandscape ? 'landscape' : 'portrait';
    const isJadwalPrint = elementId === 'jadwal-print-area';
    const isCalendarPrint = elementId === 'calendar-print-area';
    const isPerpusPrint = ['preview-kartu', 'preview-slip', 'preview-label'].includes(elementId);
    const paperDimensions: Record<string, [number, number]> = {
        A4: [21, 29.7],
        F4: [21.5, 33],
        Legal: [21.6, 35.6],
        Letter: [21.59, 27.94]
    };
    const [portraitWidth, portraitHeight] = paperDimensions[paperSize] || paperDimensions.A4;
    const pageWidth = actualOrientation === 'landscape' ? portraitHeight : portraitWidth;
    const pageHeight = actualOrientation === 'landscape' ? portraitWidth : portraitHeight;

    // Keep outer wrapper id/class so print-specific selectors (e.g. #calendar-print-area) can apply correctly.
    const content = element.outerHTML;

    // Create a hidden iframe
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if(!doc) return;

    // Collect all styles from the main document (Tailwind, custom styles, etc)
    let styles = '';
    document.querySelectorAll('style, link[rel="stylesheet"]').forEach(node => {
        styles += node.outerHTML;
    });

    // Build margin string
    const marginStr = isPerpusPrint
        ? '0'
        : margin
        ? `${margin.top}cm ${margin.right}cm ${margin.bottom}cm ${margin.left}cm`
        : '0';

    // Add specific print overrides to ensure background colors print and layout is preserved
    styles += `
    <style>
        @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background-color: white !important; -webkit-filter: opacity(1) !important; }
            @page { margin: ${marginStr}; size: ${pageWidth}cm ${pageHeight}cm; }
            .printable-content-wrapper {
                width: auto !important;
                height: auto !important;
                min-height: initial !important;
                transform: none !important;
                margin: 0 !important;
                padding: 0 !important;
                box-shadow: none !important;
                overflow: visible !important;
                display: block !important;
                background-color: transparent !important;
            }
            /* Hide items tagged with no-print */
            .no-print { display: none !important; }

            /* Ensure pages take full sheet and handle breaks */
            .page-break-after {
                page-break-after: always !important;
                break-after: page !important;
                margin-top: 0 !important;
                margin-bottom: 0 !important;
                box-shadow: none !important;
                border: none !important;
            }
            .page-break-after,
            .printable-content-wrapper {
                page-break-inside: auto !important;
                break-inside: auto !important;
            }
            #calendar-print-area {
                width: 21cm !important;
                margin: 0 auto !important;
                padding: 0 !important;
                background: white !important;
            }
            #calendar-print-area .printable-content-wrapper {
                width: 21cm !important;
                min-height: 29.7cm !important;
                box-sizing: border-box !important;
                margin: 0 !important;
                page-break-inside: avoid !important;
                break-inside: avoid-page !important;
                page-break-after: always !important;
                break-after: page !important;
                overflow: hidden !important;
            }
            #calendar-print-area .calendar-sheet-header {
                display: block !important;
                page-break-after: avoid !important;
                break-after: avoid-page !important;
            }
            #calendar-print-area .printable-content-wrapper:last-child {
                page-break-after: auto !important;
                break-after: auto !important;
            }
            #jadwal-print-area .page-break-after,
            #jadwal-print-area .printable-content-wrapper {
                width: 100% !important;
                max-width: 29.7cm !important;
                min-height: auto !important;
                overflow: visible !important;
                box-sizing: border-box !important;
            }
            #jadwal-print-area .jadwal-sheet {
                display: flex !important;
                flex-direction: column !important;
                height: auto !important;
                overflow: visible !important;
            }
            #jadwal-print-area .jadwal-header-block {
                flex: 0 0 auto !important;
            }
            #jadwal-print-area .jadwal-table-block {
                flex: 1 1 auto !important;
                min-height: 0 !important;
                overflow: visible !important;
            }
            #preview-kartu,
            #preview-slip,
            #preview-label {
                display: block !important;
                width: auto !important;
                margin: 0 !important;
                padding: 0 !important;
                transform: none !important;
            }
            #preview-kartu .perpus-print-page,
            #preview-slip .perpus-print-page,
            #preview-label .perpus-print-page {
                margin: 0 !important;
                box-shadow: none !important;
                border-radius: 0 !important;
                box-sizing: border-box !important;
                overflow: hidden !important;
                page-break-inside: avoid !important;
                break-inside: avoid-page !important;
            }
            #preview-kartu .perpus-print-page:last-child,
            #preview-slip .perpus-print-page:last-child,
            #preview-label .perpus-print-page:last-child {
                page-break-after: auto !important;
                break-after: auto !important;
            }

            /* Reset card shadows for cleaner printing */
            .rounded-lg, .rounded-xl, .shadow-lg, .shadow-md, .shadow-xl {
                box-shadow: none !important;
                filter: none !important;
            }
            * { transition: none !important; animation: none !important; }
        }
        body { background-color: white; margin: 0; padding: 0; }
        .printable-content-wrapper { transform: none !important; margin: 0 auto; }
        ${isCalendarPrint ? '#calendar-print-area .printable-content-wrapper { width: 21cm; min-height: 29.7cm; box-sizing: border-box; }' : ''}
    </style>`;

    doc.open();
    doc.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>${fileName}</title>
            ${styles}
        </head>
        <body>
            ${content}
            <script>
                // Wait for resources (images/fonts) to load before printing
                window.onload = () => {
                    setTimeout(() => {
                        window.focus();
                        window.print();
                    }, 1000);
                };
                // Fallback if onload takes too long
                setTimeout(() => {
                    if (!window.printCalled) {
                        window.focus();
                        window.print();
                        window.printCalled = true;
                    }
                }, 5000);
            </script>
        </body>
        </html>
    `);
    doc.close();
    
    // Clean up iframe after a sufficient delay (allow user to interact with print dialog)
    setTimeout(() => {
        if(document.body.contains(iframe)) {
            document.body.removeChild(iframe);
        }
    }, 60000); // 1 minute cleanup timer
};
