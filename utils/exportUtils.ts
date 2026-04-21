
import { jsPDF } from "jspdf";
import "jspdf-autotable";

/**
 * HTML Export with Offline Support
 * Embeds styles and cleans up the document for offline usage.
 */
export const exportToHtml = (elementId: string, fileName: string) => {
    const element = document.getElementById(elementId);
    if (!element) return;

    // Get all styles
    let styles = '';
    document.querySelectorAll('style, link[rel="stylesheet"]').forEach(node => {
        styles += node.outerHTML;
    });

    const content = element.innerHTML;
    
    // Add some offline-friendly tweaks
    const finalHtml = `
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${fileName}</title>
    ${styles}
    <style>
        body { background-color: #f3f4f6; padding: 2rem; }
        .printable-content-wrapper { 
            background-color: white; 
            margin: 0 auto; 
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); 
            border-radius: 0.5rem;
            padding: 0;
            overflow: hidden;
        }
        @media print {
            body { background: white; padding: 0; }
            .printable-content-wrapper { box-shadow: none; border-radius: 0; }
        }
    </style>
</head>
<body>
    <div class="no-print" style="max-width: 21cm; margin: 0 auto 1rem; display: flex; justify-content: space-between; align-items: center; background: white; padding: 1rem; border-radius: 0.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <div>
            <h1 style="margin:0; font-size: 1.25rem; font-weight: bold; color: #1f2937;">${fileName}</h1>
            <p style="margin:0; font-size: 0.875rem; color: #6b7280;">Laporan eSantri - Offline Viewer</p>
        </div>
        <button onclick="window.print()" style="background: #2563eb; color: white; border: none; padding: 0.5rem 1rem; border-radius: 0.375rem; cursor: pointer; font-weight: 500;">Cetak / Simpan PDF</button>
    </div>
    ${content}
</body>
</html>`;

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

export const exportToWord = (elementId: string, fileName: string) => {
    const element = document.getElementById(elementId);
    if (!element) return;

    const content = element.innerHTML;
    
    // Microsoft Word specific CSS overrides to make it look closer to preview
    const finalHtml = `
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
    <meta charset="utf-8">
    <title>${fileName}</title>
    <style>
        /* Word-specific styles */
        body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11pt; color: #333333; }
        h1, h2, h3, h4, h5, h6 { color: #111111; margin-bottom: 8pt; }
        p { margin-bottom: 8pt; }
        
        /* Table rendering for Word */
        table { border-collapse: collapse; width: 100%; margin-bottom: 12pt; border: 1pt solid #dddddd; }
        th, td { border: 1pt solid #dddddd; padding: 5pt; text-align: left; }
        th { background-color: #f3f4f6; font-weight: bold; }
        
        /* Utility classes translation */
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .font-bold, .font-semibold { font-weight: bold; }
        .text-sm { font-size: 10pt; }
        .text-xs { font-size: 8pt; }
        .mb-2 { margin-bottom: 5pt; }
        .mb-4 { margin-bottom: 10pt; }
        .mt-4 { margin-top: 10pt; }
        .p-4 { padding: 10pt; }
        .bg-gray-50 { background-color: #f9fafb; }
        .bg-white { background-color: #ffffff; }
        
        /* Grid and Flex fallbacks (Word doesn't support them well, fallback to inline-block or block) */
        .grid, .flex { display: block; width: 100%; }
        .grid > *, .flex > * { display: inline-block; vertical-align: top; margin-right: 10pt; margin-bottom: 10pt; }
        
        /* Page break support for Word */
        .page-break-after { page-break-after: always; clear: both; }
        @page { margin: 2cm; }
    </style>
</head>
<body>
    <div style="width: 100%; max-width: 21cm; margin: 0 auto;">
        ${content}
    </div>
</body>
</html>`;

    // Process the HTML to handle some specific Tailwind properties Word ignores
    let processedHtml = finalHtml
        .replace(/class="([^"]*?text-center[^"]*?)"/g, 'class="$1" align="center"')
        .replace(/<div class="[^"]*?grid[^"]*?grid-cols-2[^"]*?">/g, '<table width="100%"><tr><td width="50%" valign="top">')
        .replace(/<div class="[^"]*?grid[^"]*?grid-cols-3[^"]*?">/g, '<table width="100%"><tr><td width="33%" valign="top">');

    const blob = new Blob(['\ufeff', processedHtml], {
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

import * as XLSX from 'xlsx';

/**
 * AutoTable Export
 * Scrapes tables from the preview area and creates a clean PDF.
 */
export const exportToAutoTable = (elementId: string, fileName: string) => {
    const element = document.getElementById(elementId);
    if (!element) return;

    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Find all visual pages
    const pages = element.querySelectorAll('.page-break-after');
    
    if (pages.length === 0) {
        alert("Tidak ditemukan halaman laporan yang bisa diproses.");
        return;
    }

    let isFirstPage = true;

    pages.forEach((pageContainer, pageIndex) => {
        const titles = pageContainer.querySelectorAll('h1, h2, h3, h4');
        const metaContainers = pageContainer.querySelectorAll('.print-meta');
        
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

        // Print Titles
        titles.forEach((title, idx) => {
            const text = title.textContent?.trim();
            if (text && idx < 3) {
                doc.setFontSize(idx === 0 ? 16 : 12);
                doc.text(text, pageWidth / 2, yPos, { align: 'center' });
                yPos += (idx === 0 ? 10 : 7);
            }
        });

        // Print Meta
        if (metaContainers.length > 0) {
            doc.setFontSize(10);
            let allMetaLines: string[] = [];
            
            metaContainers.forEach(metaContainer => {
                if (metaContainer.classList.contains('print-header-subtitle')) return;
                
                let metaText = '';
                if (metaContainer.classList.contains('grid')) {
                    Array.from(metaContainer.children).forEach((child) => {
                        const text = child.textContent?.replace(/\s+/g, ' ').trim();
                        if (text) {
                            metaText += text + " | ";
                        }
                    });
                    metaText = metaText.replace(/ \|\ $/, '');
                    if (metaText) allMetaLines.push(metaText);
                } else if (metaContainer.nodeName.toLowerCase() === 'table') {
                    Array.from(metaContainer.querySelectorAll('tr')).forEach(tr => {
                        let rowText = '';
                        Array.from(tr.querySelectorAll('td, th')).forEach(td => rowText += (td.textContent?.trim() + " "));
                        if (rowText.trim()) allMetaLines.push(rowText.replace(/\s+/g, ' ').trim());
                    });
                } else {
                    metaText = metaContainer.textContent?.replace(/\s+/g, ' ').trim() || '';
                    if (metaText) allMetaLines.push(metaText);
                }
            });
            
            allMetaLines.forEach(line => {
                const wrappedLines = doc.splitTextToSize(line, pageWidth - 30);
                doc.text(wrappedLines, 15, yPos);
                yPos += (wrappedLines.length * 5) + 2;
            });
            yPos += 5; // Extra spacing before tables
        }

        // Print Tables for this page
        tables.forEach((table, index) => {
            if (index > 0) yPos += 10;
            
            // @ts-ignore
            doc.autoTable({
                html: table,
                startY: yPos,
                theme: 'grid',
                styles: { fontSize: 8, cellPadding: 2 },
                headStyles: { fillColor: [45, 120, 110], textColor: 255 },
                margin: { left: 10, right: 10 },
                didDrawPage: (data: any) => {
                    yPos = data.cursor?.y || yPos;
                }
            });
            
            // @ts-ignore
            yPos = (doc as any).lastAutoTable.finalY + 5;
        });
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
export const exportPreviewToExcelWorksheets = (elementId: string, fileName: string) => {
    const element = document.getElementById(elementId);
    if (!element) return;

    const pages = element.querySelectorAll('.page-break-after');
    
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
                if (metaContainer.classList.contains('print-header-subtitle')) return;
                
                let metaText = '';
                if (metaContainer.classList.contains('grid')) {
                    Array.from(metaContainer.children).forEach((child) => {
                        const text = child.textContent?.replace(/\s+/g, ' ').trim();
                        if (text) metaText += text + " | ";
                    });
                    metaText = metaText.replace(/ \|\ $/, '');
                    if (metaText) metaLines.push(metaText);
                } else if (metaContainer.nodeName.toLowerCase() === 'table') {
                    Array.from(metaContainer.querySelectorAll('tr')).forEach(tr => {
                        let rowText = '';
                        Array.from(tr.querySelectorAll('td, th')).forEach(td => rowText += (td.textContent?.trim() + " "));
                        if (rowText.trim()) metaLines.push(rowText.replace(/\s+/g, ' ').trim());
                    });
                } else {
                    metaText = metaContainer.textContent?.replace(/\s+/g, ' ').trim() || '';
                    if (metaText) metaLines.push(metaText);
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
