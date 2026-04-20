import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

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

// Method 1: Visual Generator using html2canvas (Bitmap PDF)
export const generatePdf = async (elementId: string, options: PdfGeneratorOptions): Promise<void> => {
    const element = document.getElementById(elementId);
    if (!element) return;

    let pages: HTMLElement[] = [];
    const wrappers = element.querySelectorAll('.printable-content-wrapper');
    
    if (wrappers.length > 1) {
        // Case 1: Multiple wrappers, each is a page
        pages = Array.from(wrappers) as HTMLElement[];
    } else if (wrappers.length === 1) {
        const wrapper = wrappers[0] as HTMLElement;
        // Check if the wrapper itself is styled as a page
        if (wrapper.style.pageBreakAfter === 'always' || wrapper.style.width === '21cm' || wrapper.style.width === '33cm') {
            pages = [wrapper];
        } else {
            // Case 2: One wrapper, its children are pages
            pages = Array.from(wrapper.children) as HTMLElement[];
        }
    } else {
        // Case 3: No wrapper, just use the element itself or its children
        pages = [element as HTMLElement];
    }

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

        console.log(`Generating PDF for page ${i + 1}/${pages.length}`, {
            width: page.offsetWidth,
            height: page.offsetHeight,
            id: page.id,
            className: page.className
        });

        const canvas = await html2canvas(page, {
            scale: 2.5, // Balanced scale
            useCORS: true,
            allowTaint: true,
            logging: true, // Enable logging for debugging
            backgroundColor: '#ffffff',
            width: page.offsetWidth || 794, // Fallback to A4 width in pixels if 0
            height: page.offsetHeight || 1123, // Fallback to A4 height in pixels if 0
            windowWidth: 1200,
            windowHeight: 1600,
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

        if (canvas.width > 0) {
            let pdfImgWidth = pageWidth;
            let pdfImgHeight = (canvas.height * pageWidth) / canvas.width;
            
            // If image is taller than page, scale it down to fit height
            if (pdfImgHeight > pageHeight) {
                pdfImgHeight = pageHeight;
                pdfImgWidth = (canvas.width * pageHeight) / canvas.height;
            }
            
            const xOffset = (pageWidth - pdfImgWidth) / 2;
            
            // Get image data and detect format
            let imgData = canvas.toDataURL('image/jpeg', 0.8);
            let format = 'JPEG';
            
            if (!imgData.startsWith('data:image/jpeg')) {
                imgData = canvas.toDataURL('image/png');
                format = 'PNG';
            }
            
            try {
                doc.addImage(imgData, format, xOffset, 0, pdfImgWidth, pdfImgHeight, undefined, 'FAST');
            } catch (e) {
                console.error("PDF addImage error:", e);
                // Last resort: try without format to let jsPDF auto-detect
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

// Method 2: Native Browser Print (Vector PDF)
// This creates a temporary iframe, copies content + styles, and triggers the browser's print dialog.
// This allows the user to "Save as PDF" with 100% perfect rendering (Vector text, sharp images).
export const printToPdfNative = (elementId: string, fileName: string) => {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    // Detect orientation from the preview content
    const isLandscape = element.querySelector('.print-landscape') !== null;
    const orientation = isLandscape ? 'landscape' : 'portrait';
    
    // Use the element's innerHTML directly to preserve multiple pages and their specific wrapper classes
    const content = element.innerHTML;

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
            @page { margin: 0; size: auto ${orientation}; }
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
            
            /* Reset card shadows for cleaner printing */
            .rounded-lg, .rounded-xl, .shadow-lg, .shadow-md, .shadow-xl { 
                box-shadow: none !important; 
                filter: none !important;
            }
            * { transition: none !important; animation: none !important; }
        }
        body { background-color: white; margin: 0; padding: 0; }
        .printable-content-wrapper { transform: none !important; margin: 0 auto; }
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