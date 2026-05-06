import { exportPreviewToExcelWorksheets, exportToAutoTable, exportToHtml, exportToWord, printPreviewExact } from './exportUtils';
import { generatePdf, printVisualPreview } from './pdfGenerator';

type PreviewTarget = 'report' | 'sarpras' | 'jadwal';

interface PrintExportContext {
    elementId: string;
    fileName: string;
    paperSize?: string;
    target?: PreviewTarget;
}

const resolvePaperSize = (paperSize?: string) => paperSize || 'A4';

const withVisibleClone = async (elementId: string, task: (visibleElementId: string) => Promise<void>) => {
    const source = document.getElementById(elementId);
    if (!source) return;

    const host = document.createElement('div');
    host.style.position = 'fixed';
    host.style.left = '-100000px';
    host.style.top = '0';
    host.style.width = '4000px';
    host.style.visibility = 'hidden';
    host.style.pointerEvents = 'none';
    host.style.zIndex = '-1';
    host.style.background = '#fff';

    const clone = source.cloneNode(true) as HTMLElement;
    const tempId = `${elementId}-visible-clone`;
    clone.id = tempId;
    clone.style.display = 'block';
    clone.style.visibility = 'visible';

    host.appendChild(clone);
    document.body.appendChild(host);

    try {
        await task(tempId);
    } finally {
        if (document.body.contains(host)) {
            document.body.removeChild(host);
        }
    }
};

export const printExportFacade = {
    async printDialog(ctx: PrintExportContext): Promise<void> {
        if (ctx.target === 'sarpras') {
            await printVisualPreview(ctx.elementId, resolvePaperSize(ctx.paperSize));
            return;
        }
        await printPreviewExact(ctx.elementId, `${ctx.fileName}.pdf`);
    },
    async downloadPdfImage(ctx: PrintExportContext): Promise<void> {
        if (ctx.target === 'jadwal') {
            await withVisibleClone(ctx.elementId, async (visibleElementId) => {
                await generatePdf(visibleElementId, {
                    paperSize: resolvePaperSize(ctx.paperSize),
                    fileName: `${ctx.fileName}.pdf`,
                });
            });
            return;
        }

        await generatePdf(ctx.elementId, {
            paperSize: resolvePaperSize(ctx.paperSize),
            fileName: `${ctx.fileName}.pdf`,
        });
    },
    async downloadPdfAutoTable(ctx: PrintExportContext): Promise<void> {
        await exportToAutoTable(ctx.elementId, ctx.fileName);
    },
    async downloadExcelVisual(ctx: PrintExportContext): Promise<void> {
        await exportPreviewToExcelWorksheets(ctx.elementId, ctx.fileName);
    },
    downloadHtml(ctx: PrintExportContext): void {
        exportToHtml(ctx.elementId, ctx.fileName);
    },
    downloadWord(ctx: PrintExportContext): void {
        exportToWord(ctx.elementId, ctx.fileName);
    },
};
