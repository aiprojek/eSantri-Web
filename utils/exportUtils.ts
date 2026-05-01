import { loadJsPdf, loadJsPdfAutoTable, loadXLSX } from "./lazyClientLibs";

const getUnifiedPreviewPrintStyles = () => `
    .printable-content-wrapper {
        background-color: white;
        margin: 0 auto;
    }
    .page-break-after {
        page-break-after: always;
        break-after: page;
    }
    .report-signature-footer {
        position: absolute !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        background: #fff !important;
    }
    #jadwal-print-area .printable-content-wrapper,
    #jadwal-print-area .page-break-after {
        width: 29.7cm !important;
        min-height: 21cm !important;
        box-sizing: border-box !important;
        page-break-inside: auto !important;
        break-inside: auto !important;
        overflow: visible !important;
        display: block !important;
    }
    #jadwal-print-area .printable-content-wrapper {
        padding: 1.1cm 1.1cm 0.9cm 1.1cm !important;
        position: relative !important;
    }
    #jadwal-print-area .jadwal-sheet {
        display: flex !important;
        flex-direction: column !important;
        height: 21cm !important;
    }
    #jadwal-print-area .jadwal-header-block {
        flex: 0 0 auto !important;
    }
    #jadwal-print-area .jadwal-table-block {
        flex: 1 1 auto !important;
        min-height: 0 !important;
        overflow: hidden !important;
    }
    #jadwal-print-area table {
        margin-top: 0.35cm !important;
        page-break-before: avoid !important;
        break-before: avoid-page !important;
    }
    @media print {
        html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        @page {
            margin: 0;
            size: auto;
        }
        @page :first {
            margin: 0;
        }
        .no-print { display: none !important; }
        .printable-content-wrapper {
            box-shadow: none !important;
            border-radius: 0 !important;
            transform: none !important;
        }
        .page-break-after {
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
        }
        #jadwal-print-area .printable-content-wrapper,
        #jadwal-print-area .page-break-after {
            width: 29.7cm !important;
            min-height: 21cm !important;
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

const buildUnifiedHtmlDocument = (content: string, fileName: string, options?: { showToolbar?: boolean; isJadwalPrint?: boolean }) => {
    const styles = collectDocumentStyles();
    const showToolbar = options?.showToolbar ?? false;
    const isJadwalPrint = options?.isJadwalPrint ?? false;

    return `
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${fileName}</title>
    ${styles}
    <style>
        body { background-color: #f3f4f6; padding: 2rem; }
        ${getUnifiedPreviewPrintStyles()}
        @media print {
            @page {
                margin: 0;
                size: ${isJadwalPrint ? 'A4 landscape' : 'auto'};
            }
        }
    </style>
</head>
<body>
    ${showToolbar ? `
    <div class="no-print" style="max-width: 29.7cm; margin: 0 auto 1rem; display: flex; justify-content: space-between; align-items: center; background: white; padding: 1rem; border-radius: 0.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <div>
            <h1 style="margin:0; font-size: 1.25rem; font-weight: bold; color: #1f2937;">${fileName}</h1>
            <p style="margin:0; font-size: 0.875rem; color: #6b7280;">Laporan eSantri - Offline Viewer</p>
        </div>
        <button onclick="window.print()" style="background: #2563eb; color: white; border: none; padding: 0.5rem 1rem; border-radius: 0.375rem; cursor: pointer; font-weight: 500;">Cetak / Simpan PDF</button>
    </div>
    ` : ''}
    ${content}
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
    const content = element.innerHTML;
    const finalHtml = buildUnifiedHtmlDocument(content, fileName, { showToolbar: true, isJadwalPrint });

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
    const content = element.innerHTML;
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
        `${buildUnifiedHtmlDocument(content, fileName, { showToolbar: false, isJadwalPrint })}
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
    const content = element.innerHTML;
    const styles = collectDocumentStyles();
    const finalHtml = `
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
<meta charset="utf-8">
<title>${fileName}</title>
${styles}
<style>
    @page Section1 {
        size: ${isJadwalPrint ? '841.9pt 595.3pt' : '595.3pt 841.9pt'};
        mso-page-orientation: ${isJadwalPrint ? 'landscape' : 'portrait'};
        margin: 0pt;
    }
    div.Section1 { page: Section1; }
    body { margin: 0; padding: 0; background: #fff; }
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
    const [{ jsPDF }, autoTableModule] = await Promise.all([
        loadJsPdf(),
        loadJsPdfAutoTable()
    ]);
    const autoTable = autoTableModule.default;

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
export const exportPreviewToExcelWorksheets = async (elementId: string, fileName: string) => {
    const element = document.getElementById(elementId);
    if (!element) return;
    const XLSX = await loadXLSX();

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
