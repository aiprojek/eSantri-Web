export const slugifyFilePart = (value: string): string =>
    value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'na';

export const getExportTimestamp = (): string => {
    const now = new Date();
    const yyyy = String(now.getFullYear());
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const mi = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    return `${yyyy}${mm}${dd}-${hh}${mi}${ss}`;
};

export const buildStandardExportFileName = (moduleName: string, segments: Array<string | undefined | null>): string => {
    const moduleSlug = slugifyFilePart(moduleName);
    const parts = segments
        .map((v) => (v || '').trim())
        .filter(Boolean)
        .map(slugifyFilePart);
    const suffix = parts.length > 0 ? `-${parts.join('-')}` : '';
    return `${getExportTimestamp()}-${moduleSlug}${suffix}`;
};

