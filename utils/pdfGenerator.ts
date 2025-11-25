
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";
import { PondokSettings } from "../types";

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

// Fallback / Visual Generator using html2canvas (Screenshots the DOM)
export const generatePdf = async (elementId: string, options: PdfGeneratorOptions): Promise<void> => {
    const element = document.getElementById(elementId);
    if (!element) {
        console.error(`Element with id ${elementId} not found`);
        return;
    }

    const contentWrapper = element.querySelector('.printable-content-wrapper');
    if (!contentWrapper) {
         console.error("Printable content wrapper not found");
         return;
    }

    const pages = Array.from(contentWrapper.children) as HTMLElement[];
    if (pages.length === 0) return;

    let format: [number, number] = getPageDimensions(options.paperSize);
    
    // Check orientation from the first page class
    const isFirstPageLandscape = pages[0].classList.contains('print-landscape');
    const orientation = isFirstPageLandscape ? 'l' : 'p';

    const doc = new jsPDF({
        orientation: orientation,
        unit: 'mm',
        format: format,
        compress: true
    });

    for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        if (page.style.display === 'none') continue;

        if (i > 0) {
            const isLandscape = page.classList.contains('print-landscape');
            doc.addPage(format, isLandscape ? 'l' : 'p');
        }

        const canvas = await html2canvas(page, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            windowWidth: page.scrollWidth,
            windowHeight: page.scrollHeight,
            onclone: (clonedDoc) => {
                const clonedElement = clonedDoc.querySelector(`[data-html2canvas-ignore]`);
                if (clonedElement) clonedElement.remove();
            }
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        doc.addImage(imgData, 'JPEG', 0, 0, pageWidth, pageHeight);
    }

    doc.save(options.fileName);
};

// Native Generator using AutoTable (Better for text selection and multi-page tables)
export const generateAutoTablePdf = async (
    elementId: string, 
    options: PdfGeneratorOptions, 
    settings: PondokSettings,
    reportTitle: string
): Promise<void> => {
    const element = document.getElementById(elementId);
    if (!element) return;

    const contentWrapper = element.querySelector('.printable-content-wrapper');
    if (!contentWrapper) return;

    // 1. Determine Orientation based on CSS class of the first page div
    const firstPage = contentWrapper.firstElementChild as HTMLElement;
    const isLandscape = firstPage?.classList.contains('print-landscape');
    const orientation = isLandscape ? 'l' : 'p';
    const format = getPageDimensions(options.paperSize);

    const doc = new jsPDF({
        orientation: orientation,
        unit: 'mm',
        format: format
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    
    // --- Helper Functions ---

    const drawKopSurat = (currentY: number) => {
        const margin = 15; // mm
        const logoSize = 20; // mm
        let cursorX = margin;
        let cursorY = currentY + 10;

        // Left Logo
        if (settings.logoYayasanUrl) {
            try {
                doc.addImage(settings.logoYayasanUrl, 'PNG', cursorX, cursorY, logoSize, logoSize);
            } catch (e) { console.warn('Failed to load Yayasan logo', e); }
        }

        // Right Logo
        if (settings.logoPonpesUrl) {
            try {
                doc.addImage(settings.logoPonpesUrl, 'PNG', pageWidth - margin - logoSize, cursorY, logoSize, logoSize);
            } catch (e) { console.warn('Failed to load Ponpes logo', e); }
        }

        // Center Text
        const centerX = pageWidth / 2;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text(settings.namaYayasan.toUpperCase(), centerX, cursorY + 5, { align: 'center' });
        
        doc.setFontSize(14);
        doc.text(settings.namaPonpes.toUpperCase(), centerX, cursorY + 12, { align: 'center' });
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.text(settings.alamat, centerX, cursorY + 17, { align: 'center' });
        doc.text(`Telp: ${settings.telepon} | Website: ${settings.website}`, centerX, cursorY + 21, { align: 'center' });

        // Line
        doc.setLineWidth(0.5);
        doc.line(margin, cursorY + 24, pageWidth - margin, cursorY + 24);

        // Report Title
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text(reportTitle.toUpperCase(), centerX, cursorY + 32, { align: 'center' });

        return cursorY + 35; // Return next Y position (approx 45mm from top if currentY is 0)
    };

    const drawInfoBlock = (element: HTMLElement, startY: number, margin: number) => {
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        
        let heightUsed = 0;
        const lineHeight = 5;

        // 1. Handle Grid Layout (Usually 2 columns for header info)
        const isGrid = element.classList.contains('grid') || window.getComputedStyle(element).display === 'grid';
        
        if (isGrid) {
            const children = Array.from(element.children) as HTMLElement[];
            const y = startY;
            
            // Left Column
            if (children[0]) {
                const text = children[0].innerText.trim();
                if(text) {
                    const lines = doc.splitTextToSize(text, (pageWidth / 2) - margin - 5);
                    doc.text(lines, margin, y);
                    heightUsed = Math.max(heightUsed, lines.length * lineHeight);
                }
            }

            // Right Column
            if (children[1]) {
                const text = children[1].innerText.trim();
                if(text) {
                    const lines = doc.splitTextToSize(text, (pageWidth / 2) - margin - 5);
                    doc.text(lines, pageWidth - margin, y, { align: 'right' });
                    heightUsed = Math.max(heightUsed, lines.length * lineHeight);
                }
            }
            
            return heightUsed > 0 ? heightUsed + 2 : 0;
        } 
        
        // 2. Handle Simple Text
        const text = element.innerText.trim();
        if (!text) return 0;
        
        const isCenter = element.classList.contains('text-center') || element.tagName.startsWith('H');
        const isRight = element.classList.contains('text-right');
        const align = isCenter ? 'center' : isRight ? 'right' : 'left';
        const x = isCenter ? pageWidth / 2 : isRight ? pageWidth - margin : margin;
        
        if (element.tagName.startsWith('H')) {
            doc.setFont("helvetica", "bold");
            doc.setFontSize(10);
        }

        const lines = doc.splitTextToSize(text, pageWidth - (margin * 2));
        doc.text(lines, x, startY, { align });
        
        return (lines.length * lineHeight) + 2;
    };

    // --- Main Generation Loop ---

    const tables = Array.from(contentWrapper.querySelectorAll('table'));

    if (tables.length === 0) {
        console.warn("No tables found for AutoTable generation. Falling back to standard PDF.");
        await generatePdf(elementId, options);
        return;
    }

    for (let i = 0; i < tables.length; i++) {
        const htmlTable = tables[i];
        
        // Add a new page for every table except the first one
        if (i > 0) {
            doc.addPage(); 
        }
        
        const currentTableStartPage = doc.internal.getNumberOfPages();

        // 1. Draw Full Header (Kop Surat & Title) MANUALLY on the start page
        // This ensures it's always there for every new section/table
        let currentY = drawKopSurat(0); 
        
        // 2. Draw Info Blocks (Context Details) MANUALLY
        // Identify context elements between this table and the previous table
        const contextElements: HTMLElement[] = [];
        let prevEl = htmlTable.previousElementSibling as HTMLElement;
        let safetyCount = 0;

        while (prevEl && safetyCount < 15) {
            if (prevEl.classList.contains('pdf-ignore-context')) break; // Stop at PrintHeader
            if (prevEl.tagName === 'HR') break;
            if (prevEl.tagName === 'TABLE') break;
            if (prevEl.querySelector('img')) break; 
            
            if (['DIV', 'P', 'H3', 'H4', 'H5'].includes(prevEl.tagName) && prevEl.innerText.trim().length > 0) {
                contextElements.unshift(prevEl);
            }
            prevEl = prevEl.previousElementSibling as HTMLElement;
            safetyCount++;
        }

        // Draw context elements below the header
        currentY += 3; // Small gap after title
        for (const el of contextElements) {
            const addedHeight = drawInfoBlock(el, currentY, 15);
            currentY += addedHeight;
        }
        
        currentY += 2; // Gap before table

        // 3. Draw Table using AutoTable
        autoTable(doc, {
            html: htmlTable,
            startY: currentY,
            theme: 'grid',
            headStyles: { fillColor: [15, 118, 110], textColor: 255, fontStyle: 'bold', halign: 'center' },
            styles: { 
                fontSize: 8, 
                cellPadding: 1.5, 
                valign: 'middle',
                overflow: 'linebreak' 
            },
            alternateRowStyles: { fillColor: [245, 247, 250] },
            // Margin top for continuation pages (to allow space for minimal header)
            margin: { top: 20, bottom: 20, left: 15, right: 15 }, 
            
            // Draw Minimal Header on overflow pages only
            didDrawPage: (data) => {
                // If we are on a page LATER than the start page of this table, it means the table overflowed.
                // Draw a minimal header.
                if (data.pageNumber > currentTableStartPage) {
                    doc.setFontSize(8);
                    doc.setFont("helvetica", "italic");
                    doc.text(`${reportTitle} - Lanjutan (Hal. ${data.pageNumber})`, pageWidth - 15, 10, { align: 'right' });
                }
            },
        });
    }
    
    // 4. Add Footer (Timestamp) to ALL pages
    const totalPages = doc.internal.getNumberOfPages();
    for(let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont("helvetica", "italic");
        // Prevent overwriting data if table goes to bottom
        doc.text(`Dicetak otomatis oleh eSantri Web pada ${new Date().toLocaleString('id-ID')}`, 15, doc.internal.pageSize.height - 10);
    }

    doc.save(options.fileName);
};
