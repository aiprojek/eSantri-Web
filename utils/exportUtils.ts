
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

/**
 * AutoTable Export
 * Scrapes tables from the preview area and creates a clean PDF.
 */
export const exportToAutoTable = (elementId: string, fileName: string) => {
    const element = document.getElementById(elementId);
    if (!element) return;

    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Extract contextual metadata if available (e.g., from PrintHeader or AcademicHeader)
    const titles = element.querySelectorAll('h1, h2, h3, h4');
    const metaContainers = element.querySelectorAll('.print-meta');
    let yPos = 15;
    
    titles.forEach((title, idx) => {
        const text = title.textContent?.trim();
        if (text && idx < 3) {
            doc.setFontSize(idx === 0 ? 16 : 12);
            doc.text(text, pageWidth / 2, yPos, { align: 'center' });
            yPos += (idx === 0 ? 10 : 7);
        }
    });

    if (metaContainers.length > 0) {
        doc.setFontSize(10);
        let allMetaLines: string[] = [];
        
        metaContainers.forEach(metaContainer => {
            if (metaContainer.classList.contains('print-header-subtitle')) return; // handled by titles usually
            
            let metaText = '';
            if (metaContainer.classList.contains('grid')) {
                Array.from(metaContainer.children).forEach((child) => {
                    const text = child.textContent?.replace(/\s+/g, ' ').trim();
                    if (text) {
                         metaText += text + " | ";
                    }
                });
                metaText = metaText.replace(/ \|\ $/, ''); // Remove trailing separator
                if (metaText) allMetaLines.push(metaText);
            } else if (metaContainer.nodeName.toLowerCase() === 'table') {
                // If the meta is a table (like in Rekening Koran)
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

    // Find all tables, but exclude tables that were already processed as print-meta
    const allTables = element.querySelectorAll('table');
    const tables: HTMLTableElement[] = [];
    allTables.forEach(t => {
        if (!t.classList.contains('print-meta')) {
            tables.push(t);
        }
    });
    
    if (tables.length === 0) {
        // Fallback: If no real tables, maybe it's a grid? 
        // For Dashboard etc, we might just use the native printer or inform user.
        alert("Tidak ditemukan tabel data yang bisa diproses untuk AutoTable. Gunakan PDF (Asli) untuk hasil visual.");
        return;
    }

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
        
        // Update yPos for next table
        // @ts-ignore
        yPos = (doc as any).lastAutoTable.finalY + 10;
    });

    doc.save(`${fileName}.pdf`);
};
