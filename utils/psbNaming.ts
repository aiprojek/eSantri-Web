const CROCKFORD_SAFE_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; // 32 chars (tanpa I, L, O, U)

export function generateSafeBase32Code(length: number): string {
    const len = Math.max(1, Math.floor(length));
    const bytes = new Uint8Array(len);
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
        crypto.getRandomValues(bytes);
    } else {
        for (let i = 0; i < len; i++) {
            bytes[i] = Math.floor(Math.random() * 256);
        }
    }
    let result = '';
    for (let i = 0; i < len; i++) {
        // Alphabet 32 karakter -> modulo 32 bebas bias
        result += CROCKFORD_SAFE_ALPHABET[bytes[i] & 31];
    }
    return result;
}

export function makeInitials(nama: string): string {
    const raw = String(nama || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9\s]/g, ' ')
        .trim();

    if (!raw || raw.toUpperCase() === 'TERENKRIPSI E2EE') {
        return 'X';
    }

    const tokens = raw.split(/\s+/).filter(Boolean);
    if (tokens.length === 0) {
        return 'X';
    }

    const initials = tokens
        .slice(0, 3)
        .map((t) => t.charAt(0).toUpperCase())
        .join('')
        .replace(/[^A-Z0-9]/g, '');

    return initials || 'X';
}

export function makeRegNumber(year?: number): string {
    const y = Number.isFinite(year) && Number(year) > 1900 ? Math.floor(Number(year)) : new Date().getFullYear();
    return `PSB-${y}-REG-${generateSafeBase32Code(6)}`;
}

export function normalizeDocExtension(fileName?: string, mimeType?: string): string {
    const original = String(fileName || '').trim();
    const dotIndex = original.lastIndexOf('.');
    if (dotIndex > -1 && dotIndex < original.length - 1) {
        const ext = original.substring(dotIndex + 1).toLowerCase().replace(/[^a-z0-9]/g, '');
        if (ext) return ext === 'jpeg' ? 'jpg' : ext;
    }
    const cleanMime = String(mimeType || '').trim().toLowerCase().split(';')[0];
    if (cleanMime === 'application/pdf') return 'pdf';
    if (cleanMime === 'image/jpeg' || cleanMime === 'image/jpg') return 'jpg';
    if (cleanMime === 'image/png') return 'png';
    if (cleanMime === 'image/webp') return 'webp';
    return '';
}

export function detectPsbDocKind(fieldKey?: string, fileName?: string, fieldLabel?: string): string {
    const s = `${fieldKey || ''} ${fileName || ''} ${fieldLabel || ''}`.toLowerCase();
    if (s.includes('kartu keluarga') || s.includes(' kk') || s.includes('kk ') || s.trim() === 'kk' || s.includes('uploadkk') || s.includes('filekk')) return 'kk';
    if (s.includes('akta')) return 'akta';
    if (s.includes('ijazah')) return 'ijazah';
    if (s.includes('rapor') || s.includes('raport')) return 'rapor';
    if (s.includes('pasfoto') || s.includes('foto')) return 'foto';
    if (s.includes('kip')) return 'kip';
    if (s.includes('ktp')) return 'ktp';
    return 'dokumen';
}

export function makeFileName(params: {
    nomorRegistrasi: string;
    nama: string;
    jenisBerkas: string;
    ext?: string;
}): string {
    const cleanReg = String(params.nomorRegistrasi || '')
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9-]+/g, '-')
        .replace(/^-+|-+$/g, '') || makeRegNumber();

    const inisial = makeInitials(params.nama);
    const slugJenis = String(params.jenisBerkas || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 24) || 'dokumen';

    const cleanExt = String(params.ext || '')
        .trim()
        .toLowerCase()
        .replace(/^\./, '')
        .replace(/[^a-z0-9]/g, '');

    const rand4 = generateSafeBase32Code(4);
    return cleanExt
        ? `${cleanReg}_${inisial}_${slugJenis}-${rand4}.${cleanExt}`
        : `${cleanReg}_${inisial}_${slugJenis}-${rand4}`;
}
