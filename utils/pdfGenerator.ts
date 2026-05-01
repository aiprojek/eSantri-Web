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

// Method 1: Visual Generator using html2canvas (Bitmap PDF)
export const generatePdf = async (elementId: string, options: PdfGeneratorOptions): Promise<void> => {
    const element = document.getElementById(elementId);
    if (!element) return;
    const [{ jsPDF }] = await Promise.all([loadJsPdf()]);

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

    for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        if (page.style.display === 'none') continue;

        if (i > 0) {
            const isLandscape = page.classList.contains('print-landscape');
            doc.addPage(format, isLandscape ? 'l' : 'p');
        }

        const canvas = await renderPageCanvas(page);

        if (canvas.width > 0) {
            let pdfImgWidth = pageWidth;
            let pdfImgHeight = (canvas.height * pageWidth) / canvas.width;
            
            // If image is taller than page, scale it down to fit height
            if (pdfImgHeight > pageHeight) {
                pdfImgHeight = pageHeight;
                pdfImgWidth = (canvas.width * pageHeight) / canvas.height;
            }
            
            const xOffset = (pageWidth - pdfImgWidth) / 2;
            
            const imgData = canvas.toDataURL('image/png');
            
            try {
                doc.addImage(imgData, 'PNG', xOffset, 0, pdfImgWidth, pdfImgHeight, undefined, 'FAST');
            } catch (e) {
                console.error("PDF addImage error:", e);
                try {
                    doc.addImage(imgData, xOffset, 0, pdfImgWidth, pdfImgHeight);
                } catch (e2) {
                    console.error("PDF addImage fallback error:", e2);
                }
            }
        }
    }

    doc.save(options.fileName);
};

export const printVisualPreview = async (elementId: string, paperSize: string): Promise<void> => {
    const element = document.getElementById(elementId);
    if (!element) return;

    const pages = getRenderablePages(element as HTMLElement).filter((page) => page.style.display !== 'none');
    if (pages.length === 0) return;

    const [pageWidthMm, pageHeightMm] = getPageDimensions(paperSize);
    const renderedPages = await Promise.all(
        pages.map(async (page) => {
            const canvas = await renderPageCanvas(page);
            const isLandscape = page.classList.contains('print-landscape');
            const widthMm = isLandscape ? pageHeightMm : pageWidthMm;
            const heightMm = isLandscape ? pageWidthMm : pageHeightMm;
            return {
                src: canvas.toDataURL('image/png'),
                widthMm,
                heightMm
            };
        })
    );

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
                    object-fit: fill;
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
};

// Method 2: Native Browser Print (Vector PDF)
// This creates a temporary iframe, copies content + styles, and triggers the browser's print dialog.
// This allows the user to "Save as PDF" with 100% perfect rendering (Vector text, sharp images).
export const printToPdfNative = (elementId: string, fileName: string) => {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    // Detect orientation from the preview content
    const isLandscape = element.querySelector('.print-landscape') !== null;
    const orientation = isLandscape ? 'landscape' : 'portrait';
    const isJadwalPrint = elementId === 'jadwal-print-area';
    const isCalendarPrint = elementId === 'calendar-print-area';
    
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
    
    // Add specific print overrides to ensure background colors print and layout is preserved
    styles += `
    <style>
        @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background-color: white !important; -webkit-filter: opacity(1) !important; }
            @page { margin: 0; size: ${isJadwalPrint ? 'A4 landscape' : `auto ${orientation}`}; }
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
                page-break-inside: auto !important;
                break-inside: auto !important;
                page-break-after: always !important;
                break-after: page !important;
            }
            #calendar-print-area .calendar-sheet-header {
                display: block !important;
                page-break-after: avoid !important;
                break-after: avoid-page !important;
            }
            #calendar-print-area .calendar-layout-1_sheet {
                transform: scale(0.88) !important;
                transform-origin: top center !important;
                width: calc(21cm / 0.88) !important;
            }
            #calendar-print-area .printable-content-wrapper:last-child {
                page-break-after: auto !important;
                break-after: auto !important;
            }
            #jadwal-print-area .page-break-after,
            #jadwal-print-area .printable-content-wrapper {
                width: 29.7cm !important;
                min-height: 21cm !important;
                overflow: visible !important;
                box-sizing: border-box !important;
            }
            #jadwal-print-area .jadwal-sheet {
                display: flex !important;
                flex-direction: column !important;
                height: 21cm !important;
                overflow: hidden !important;
            }
            #jadwal-print-area .jadwal-header-block {
                flex: 0 0 auto !important;
            }
            #jadwal-print-area .jadwal-table-block {
                flex: 1 1 auto !important;
                min-height: 0 !important;
                overflow: hidden !important;
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
