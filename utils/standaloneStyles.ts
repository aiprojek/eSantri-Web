export const getStandaloneDocumentStyles = (): string => {
    if (typeof document === 'undefined') return '';

    let allCss = '';

    for (const sheet of Array.from(document.styleSheets)) {
        try {
            if (!sheet.cssRules) continue;
            for (const rule of Array.from(sheet.cssRules)) {
                allCss += `${rule.cssText}\n`;
            }
        } catch (e) {
            // Ignore stylesheets that are not readable, e.g. browser-protected sheets.
        }
    }

    return allCss;
};
