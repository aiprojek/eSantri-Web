export const getStandaloneDocumentStylesSync = (): string => {
    if (typeof document === 'undefined') return '';

    let allCss = '';

    // 1. Read directly from document.styleSheets
    for (const sheet of Array.from(document.styleSheets)) {
        try {
            if (!sheet.cssRules) continue;
            for (const rule of Array.from(sheet.cssRules)) {
                allCss += `${rule.cssText}\n`;
            }
        } catch (e) {
            // Sheet might be CORS-protected or a linked stylesheet
        }
    }

    // 2. Extract from all inline <style> elements
    document.querySelectorAll('style').forEach(node => {
        if (node.id !== 'embedded-compiled-styles' && node.textContent) {
            allCss += `${node.textContent}\n`;
        }
    });

    return allCss;
};

export const getStandaloneDocumentStyles = async (): Promise<string> => {
    if (typeof document === 'undefined') return '';

    let allCss = getStandaloneDocumentStylesSync();

    // 3. For any <link rel="stylesheet"> on same origin (like Vite production/dev CSS bundles), fetch text directly
    const linkNodes = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'));
    for (const link of linkNodes) {
        const href = link.getAttribute('href');
        if (!href) continue;
        const isSameOrigin = href.startsWith('/') || href.startsWith(window.location.origin) || !href.startsWith('http');
        if (isSameOrigin) {
            try {
                const res = await fetch(href);
                if (res.ok) {
                    const text = await res.text();
                    allCss += `/* Linked Stylesheet: ${href} */\n${text}\n`;
                }
            } catch (err) {
                console.warn(`Could not fetch stylesheet ${href}:`, err);
            }
        }
    }

    return allCss;
};


