import html2canvas from "html2canvas";

// Utility to convert DOM elements (HTML) to SVG files
// Uses html2canvas to render HTML as a high-res bitmap embedded in SVG
// This ensures compatibility with vector editors like Inkscape/CorelDraw which don't support foreignObject HTML.

export const exportReportToSvg = async (elementId: string, baseFileName: string) => {
    const element = document.getElementById(elementId);
    if (!element) return;

    const contentWrapper = element.querySelector('.printable-content-wrapper');
    if (!contentWrapper) return;

    const pages = Array.from(contentWrapper.children) as HTMLElement[];
    if (pages.length === 0) return;

    // Process each page
    for (let i = 0; i < pages.length; i++) {
        const originalPage = pages[i];
        if (originalPage.style.display === 'none') continue;

        // 1. Create a container for the clone to ensure clean capture
        // We place it off-screen so the user doesn't see it
        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.left = '-9999px';
        container.style.top = '0';
        container.style.zIndex = '-9999';
        
        // Force width to match original to maintain grid/flex layout integrity
        // IMPORTANT: Use scrollWidth to capture overflowing content if any
        container.style.width = `${originalPage.scrollWidth}px`; 
        container.style.height = `${originalPage.scrollHeight}px`;
        
        // 2. Clone the node
        const clonedPage = originalPage.cloneNode(true) as HTMLElement;

        // 3. Reset styles on the clone that cause visual artifacts or scaling issues
        clonedPage.style.transform = 'none'; // Remove screen zoom/scale
        clonedPage.style.margin = '0';
        clonedPage.style.boxShadow = 'none';
        clonedPage.classList.remove('shadow-lg');
        
        // Ensure text wrapping and layout matches exactly
        clonedPage.style.whiteSpace = 'normal';
        clonedPage.style.textAlign = 'left';
        
        // Append clone to container, and container to body
        container.appendChild(clonedPage);
        document.body.appendChild(container);

        try {
            // 4. Use html2canvas on the CLEAN CLONE
            // Scale 4 ensures high resolution (approx 300 DPI equivalent) for printing
            const canvas = await html2canvas(clonedPage, {
                scale: 4, 
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff', // Ensure white background
                width: clonedPage.scrollWidth, // Ensure full content is captured
                height: clonedPage.scrollHeight,
                onclone: (clonedDoc) => {
                    const clonedElement = clonedDoc.querySelector(`[data-html2canvas-ignore]`);
                    if (clonedElement) clonedElement.remove();
                }
            });

            // Convert canvas to Data URL (PNG format)
            const imgData = canvas.toDataURL('image/png');
            
            // Get dimensions from the canvas (scaled pixels)
            const width = canvas.width;
            const height = canvas.height;

            // Construct SVG Data
            // We embed the high-res PNG image inside the SVG using the <image> tag.
            // This ensures full compatibility with Inkscape, CorelDraw, and Illustrator.
            const svgString = `
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <image width="${width}" height="${height}" xlink:href="${imgData}" />
</svg>`;

            // Create Blob and Download
            const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            // If multiple pages, suffix with number
            const suffix = pages.length > 1 ? `_Halaman_${i + 1}` : '';
            link.download = `${baseFileName}${suffix}.svg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Error exporting to SVG:", error);
            throw error;
        } finally {
            // 5. Clean up the DOM
            if (document.body.contains(container)) {
                document.body.removeChild(container);
            }
        }
    }
};