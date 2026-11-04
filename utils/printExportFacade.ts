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
    const sourceWidth = source.offsetWidth || 794;
    host.style.width = `${Math.max(794, sourceWidth)}px`;
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
        if (ctx.elementId === 'calendar-print-area') {
            await printVisualPreview(ctx.elementId, resolvePaperSize(ctx.paperSize));
            return;
        }
        if (ctx.target === 'sarpras') {
            await printVisualPreview(ctx.elementId, resolvePaperSize(ctx.paperSize));
            return;
        }
        await printPreviewExact(ctx.elementId, `${ctx.fileName}.pdf`);
    },
    async downloadPdfImage(ctx: PrintExportContext): Promise<void> {
        const source = document.getElementById(ctx.elementId);
        const isSourceHidden = source
            ? source.getClientRects().length === 0 ||
              source.getBoundingClientRect().width === 0 ||
              source.getBoundingClientRect().height === 0
            : false;

        if (isSourceHidden) {
            await withVisibleClone(ctx.elementId, async (visibleElementId) => {
                await generatePdf(visibleElementId, {
                    paperSize: resolvePaperSize(ctx.paperSize),
                    fileName: `${ctx.fileName}.pdf`,
                });
            });
            return;
        }

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
    async downloadHtml(ctx: PrintExportContext): Promise<void> {
        await exportToHtml(ctx.elementId, ctx.fileName);
    },
    async downloadWord(ctx: PrintExportContext): Promise<void> {
        await exportToWord(ctx.elementId, ctx.fileName);
    },
    printHtmlViaIframe,
};

export function printHtmlViaIframe(htmlDocument: string): void {
    if (typeof document === 'undefined') return;
    const existing = document.getElementById('esantri-hidden-print-iframe');
    if (existing && existing.parentNode) {
        existing.parentNode.removeChild(existing);
    }

    const iframe = document.createElement('iframe');
    iframe.id = 'esantri-hidden-print-iframe';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!doc) {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
        return;
    }

    doc.open();
    doc.write(htmlDocument);
    doc.close();

    const cleanup = () => {
        setTimeout(() => {
            if (iframe.parentNode) {
                iframe.parentNode.removeChild(iframe);
            }
        }, 1500);
    };

    setTimeout(() => {
        try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
        } finally {
            cleanup();
        }
    }, 350);
}

