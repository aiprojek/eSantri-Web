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

    const contentWrapper = element.querySelector('.printable-content-wrapper');
    if (!contentWrapper) return;

    const pages = Array.from(contentWrapper.children) as HTMLElement[];
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

        const canvas = await html2canvas(page, {
            scale: 3, // Higher scale for better resolution (sharp text)
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            // Ensure capture covers the whole element including potential margins
            width: page.offsetWidth,
            height: page.offsetHeight,
            windowWidth: document.documentElement.offsetWidth,
            windowHeight: document.documentElement.offsetHeight,
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

        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const imgProps = doc.getImageProperties(imgData);
        const pdfImgHeight = (imgProps.height * pageWidth) / imgProps.width;

        doc.addImage(imgData, 'JPEG', 0, 0, pageWidth, pdfImgHeight);
    }

    doc.save(options.fileName);
};

// Method 2: Native Browser Print (Vector PDF)
// This creates a temporary iframe, copies content + styles, and triggers the browser's print dialog.
// This allows the user to "Save as PDF" with 100% perfect rendering (Vector text, sharp images).
export const printToPdfNative = (elementId: string, fileName: string) => {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    // Get the inner HTML of the printable wrapper to avoid printing the scroll container background
    const contentWrapper = element.querySelector('.printable-content-wrapper');
    const content = contentWrapper ? contentWrapper.innerHTML : element.innerHTML;

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
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background-color: white; }
            @page { margin: 0; size: auto; }
            .printable-content-wrapper { 
                width: 100% !important; 
                transform: none !important; 
                margin: 0 !important; 
                box-shadow: none !important; 
            }
            /* Reset shadows for print */
            .shadow-lg, .shadow-md, .shadow-xl { box-shadow: none !important; }
        }
        body { background-color: white; margin: 0; padding: 0; }
        /* Ensure grid/flex layouts work inside the iframe context */
        .printable-content-wrapper { transform: none !important; }
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
            <div class="printable-content-wrapper">
                ${content}
            </div>
            <script>
                // Wait for resources (images/fonts) to load before printing
                window.onload = () => {
                    setTimeout(() => {
                        window.focus();
                        window.print();
                        // Removing the iframe immediately can break the print dialog in some browsers
                        // We leave it or the caller cleans it up, but for safety in this utility:
                        // window.parent.document.body.removeChild(window.frameElement); 
                    }, 1000);
                };
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