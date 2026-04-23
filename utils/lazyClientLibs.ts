let xlsxPromise: Promise<typeof import('xlsx')> | null = null;
let jsPdfPromise: Promise<typeof import('jspdf')> | null = null;
let autoTablePromise: Promise<typeof import('jspdf-autotable')> | null = null;
let html2canvasPromise: Promise<typeof import('html2canvas')> | null = null;

export const loadXLSX = () => {
    if (!xlsxPromise) {
        xlsxPromise = import('xlsx');
    }
    return xlsxPromise;
};

export const loadJsPdf = () => {
    if (!jsPdfPromise) {
        jsPdfPromise = import('jspdf');
    }
    return jsPdfPromise;
};

export const loadJsPdfAutoTable = () => {
    if (!autoTablePromise) {
        autoTablePromise = import('jspdf-autotable');
    }
    return autoTablePromise;
};

export const loadHtml2Canvas = async () => {
    if (!html2canvasPromise) {
        html2canvasPromise = import('html2canvas');
    }
    const module = await html2canvasPromise;
    return module.default;
};
