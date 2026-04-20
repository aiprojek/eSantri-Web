
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
    
    // Title & Header info extraction (Try to find titles)
    const titles = element.querySelectorAll('h1, h2, h3, h4');
    let yPos = 15;
    
    titles.forEach((title, idx) => {
        const text = title.textContent?.trim();
        if (text && idx < 3) {
            doc.setFontSize(idx === 0 ? 16 : 12);
            doc.text(text, pageWidth / 2, yPos, { align: 'center' });
            yPos += (idx === 0 ? 10 : 7);
        }
    });

    // Find all tables
    const tables = element.querySelectorAll('table');
    
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
