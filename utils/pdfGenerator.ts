
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

// Visual Generator using html2canvas
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
            // If orientation changes, we might need to adjust format, 
            // but typically all pages in a report batch share orientation.
            // jsPDF addPage takes format as first arg if needed, or just orientation.
            // We pass orientation to be safe.
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

                // Remove shadows from the cloned page to avoid ugly borders in PDF
                // We try to find the page element in the clone. 
                // Since 'page' is a child of wrapper, we look for the corresponding child.
                // A generic approach is to strip shadow classes from all report pages in the clone.
                const reportPages = clonedDoc.querySelectorAll('.printable-content-wrapper > div');
                reportPages.forEach((p) => {
                    p.classList.remove('shadow-lg');
                    (p as HTMLElement).style.boxShadow = 'none';
                });
            }
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        
        // Calculate dimensions to fit width while preserving aspect ratio
        const imgProps = doc.getImageProperties(imgData);
        const pdfImgHeight = (imgProps.height * pageWidth) / imgProps.width;

        // Render image. 
        // We prioritize width fit. If height exceeds page, it will be cut off (standard print behavior),
        // or we could shrink-to-fit. For reports, maintaining aspect ratio is key.
        // If the content is significantly smaller than the page (e.g. half page), 
        // this ensures it doesn't get stretched vertically.
        doc.addImage(imgData, 'JPEG', 0, 0, pageWidth, pdfImgHeight);
    }

    doc.save(options.fileName);
};
