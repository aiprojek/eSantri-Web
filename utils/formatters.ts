
import { format, parseISO, isValid } from 'date-fns';
import { id } from 'date-fns/locale';

export const formatRupiah = (number: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(number);
};

export const formatDate = (dateString?: string | Date) => {
    if (!dateString) return '';
    try {
        const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
        if (!isValid(date)) return '';
        return format(date, 'd MMMM yyyy', { locale: id });
    } catch (e) { return ''; }
};

export const formatDateTime = (dateString?: string | Date) => {
    if (!dateString) return '';
    try {
        const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
        if (!isValid(date)) return '';
        return format(date, 'd MMM yyyy, HH:mm', { locale: id });
    } catch (e) { return ''; }
};

/**
 * Format Date to local YYYY-MM-DD string without timezone conversion bug.
 */
export const formatLocalDate = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

/**
 * Convert Latin/Western digits (0-9) to Eastern Arabic-Indic numerals (٠-٩)
 */
export const toArabicNumerals = (num: number | string | undefined | null): string => {
    if (num === undefined || num === null || num === '') return '';
    const str = String(num);
    const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    return str.replace(/[0-9]/g, (d) => arabicDigits[parseInt(d, 10)]);
};

// Mendapatkan detail Hijriah dari tanggal Masehi dengan opsi Adjustment (Koreksi)
// Note: date-fns tidak memiliki built-in Hijri, kita tetap gunakan Intl.DateTimeFormat
export const getHijriDate = (date: Date, adjustment: number = 0) => {
    try {
        const adjustedDate = new Date(date);
        adjustedDate.setDate(adjustedDate.getDate() + adjustment);

        // Menggunakan islamic-umalqura yang umum digunakan
        const formatter = new Intl.DateTimeFormat('id-ID-u-ca-islamic-umalqura', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });

        const numericFormatter = new Intl.DateTimeFormat('id-ID-u-ca-islamic-umalqura', {
            month: 'numeric'
        });
        
        const parts = formatter.formatToParts(adjustedDate);
        const day = parts.find(p => p.type === 'day')?.value || '';
        const month = parts.find(p => p.type === 'month')?.value || '';
        const year = parts.find(p => p.type === 'year')?.value || '';
        const monthIndex = parseInt(numericFormatter.format(adjustedDate)) - 1;
        const dayArabic = toArabicNumerals(day);

        return { day, dayArabic, month, year, monthIndex, full: `${day} ${month} ${year}` };
    } catch (e) {
        return { day: '', dayArabic: '', month: '', year: '', full: '' };
    }
};

export type DateFormatMode = 'masehi' | 'hijriah_masehi' | 'hijriah';

export interface FormatTanggalDokumenOptions {
    formatMode?: DateFormatMode;
    hijriAdjustment?: number;
    manualHijri?: string;
}

export const formatTanggalDokumen = (
    dateString?: string | Date,
    options?: FormatTanggalDokumenOptions
): string => {
    if (!dateString) return '';
    try {
        const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
        if (!isValid(date)) return '';

        const masehiStr = format(date, 'd MMMM yyyy', { locale: id });
        const formatMode = options?.formatMode || 'masehi';

        if (formatMode === 'masehi') {
            return masehiStr;
        }

        const hijriInfo = getHijriDate(date, options?.hijriAdjustment || 0);
        const hijriStr = options?.manualHijri?.trim()
            || (hijriInfo.full ? `${hijriInfo.full} H` : '');

        if (formatMode === 'hijriah') {
            return hijriStr || masehiStr;
        }

        if (formatMode === 'hijriah_masehi') {
            if (hijriStr) {
                return `${hijriStr} / ${masehiStr} M`;
            }
            return masehiStr;
        }

        return masehiStr;
    } catch (e) {
        return '';
    }
};

// Helper untuk mencari tanggal 1 bulan Hijriah dari sebuah tanggal referensi
export const findStartOfHijriMonth = (referenceDate: Date, adjustment: number = 0): Date => {
    let d = new Date(referenceDate);
    const targetHijriMonth = getHijriDate(d, adjustment).month;
    
    // Mundur ke belakang untuk mencari tanggal 1
    // Batas aman 35 hari untuk mencegah infinite loop
    for (let i = 0; i < 35; i++) {
        const prevDate = new Date(d);
        prevDate.setDate(d.getDate() - 1);
        const prevHijri = getHijriDate(prevDate, adjustment);
        
        if (prevHijri.month !== targetHijriMonth) {
            return d; // d adalah tanggal 1
        }
        d = prevDate;
    }
    return d; // Fallback
};

// Helper function to convert number to Indonesian words
export const terbilang = (n: number): string => {
    if (n < 0) return "minus " + terbilang(-n);
    const ang = ["", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas"];
    let str = "";
    if (n < 12) {
        str = ang[n];
    } else if (n < 20) {
        str = terbilang(n - 10) + " belas";
    } else if (n < 100) {
        str = terbilang(Math.floor(n / 10)) + " puluh " + terbilang(n % 10);
    } else if (n < 200) {
        str = "seratus " + terbilang(n - 100);
    } else if (n < 1000) {
        str = terbilang(Math.floor(n / 100)) + " ratus " + terbilang(n % 100);
    } else if (n < 2000) {
        str = "seribu " + terbilang(n - 1000);
    } else if (n < 1000000) {
        str = terbilang(Math.floor(n / 1000)) + " juta " + terbilang(n % 1000);
    } else if (n < 1000000000) {
        str = terbilang(Math.floor(n / 1000000)) + " milyar " + terbilang(n % 1000000);
    } else {
        str = terbilang(Math.floor(n / 1000000000000)) + " triliun " + terbilang(n % 1000000000000);
    }
    return str.replace(/satu puluh/g, 'sepuluh').replace(/satu ratus/g, 'seratus').replace(/satu ribu/g, 'seribu').trim().replace(/\s+/g, ' ');
};

export const formatBytes = (bytes: number, decimals = 2) => {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

export const isSantriPutra = (santri?: { jenisKelamin?: string } | string | null): boolean => {
    const raw = typeof santri === 'string' ? santri : santri?.jenisKelamin;
    const g = String(raw || '').trim().toLowerCase();
    return g === 'laki-laki' || g === 'l' || g === 'putra' || g === 'pria' || g.startsWith('lak');
};

export const isSantriPutri = (santri?: { jenisKelamin?: string } | string | null): boolean => {
    const raw = typeof santri === 'string' ? santri : santri?.jenisKelamin;
    const g = String(raw || '').trim().toLowerCase();
    return g === 'perempuan' || g === 'p' || g === 'putri' || g === 'wanita' || g.startsWith('perem');
};

/**
 * Resolves a concise, professional city/locality name for official letterheads & signatures.
 * Avoids printing lengthy street names or house numbers.
 * Example outputs: "Banyumas", "Kudus", "Kedungbanteng", "Jakarta Selatan"
 */
export const resolveTempatPesantren = (
    settings?: { kabupatenKota?: string; tempatRaporDefault?: string; alamat?: string } | null,
    fallback = 'Pesantren'
): string => {
    if (!settings) return fallback;

    const cleanName = (str: string): string => {
        return str
            .replace(/^(kabupaten|kab\.|kota|kecamatan|kec\.)\s+/i, '')
            .replace(/\b\d{5}\b/g, '') // remove postal code
            .replace(/\b(Provinsi|Prov\.|Jawa Tengah|Jawa Barat|Jawa Timur|DKI Jakarta|DIY|DI Yogyakarta|Banten|Sumatera|Kalimantan|Sulawesi|Bali)\b.*/gi, '')
            .replace(/,\s*$/, '')
            .trim();
    };

    if (settings.kabupatenKota && settings.kabupatenKota.trim()) {
        const cleaned = cleanName(settings.kabupatenKota.trim());
        if (cleaned) return cleaned;
    }
    if (settings.tempatRaporDefault && settings.tempatRaporDefault.trim()) {
        const cleaned = cleanName(settings.tempatRaporDefault.trim());
        if (cleaned) return cleaned;
    }

    const rawAlamat = settings.alamat || '';
    if (!rawAlamat.trim()) return fallback;

    // 1. Try finding "Kabupaten X", "Kab. X", "Kota X"
    const matchKabKota = rawAlamat.match(/(?:Kabupaten|Kab\.|Kota)\s+([A-Za-z\s]+?)(?:,|$|\.|\d|\b(?:Kec|Kecamatan|Desa|Kelurahan|Jawa|Sumatera|Kalimantan|Sulawesi|Bali|Nusa|Papua|Barat|Timur|Tengah|Selatan|Utara|Provinsi)\b)/i);
    if (matchKabKota && matchKabKota[1]?.trim()) {
        const candidate = cleanName(matchKabKota[1].trim());
        if (candidate.length >= 2 && candidate.length <= 25) {
            return candidate;
        }
    }

    // 2. Try finding "Kecamatan X", "Kec. X"
    const matchKec = rawAlamat.match(/(?:Kecamatan|Kec\.)\s+([A-Za-z\s]+?)(?:,|$|\.|\d|\b(?:Kab|Kabupaten|Kota|Desa|Kelurahan)\b)/i);
    if (matchKec && matchKec[1]?.trim()) {
        const candidate = cleanName(matchKec[1].trim());
        if (candidate.length >= 2 && candidate.length <= 25) {
            return candidate;
        }
    }

    // 3. Comma-separated parts: pick non-street segment (searching from end backward)
    const parts = rawAlamat.split(',').map(p => p.trim()).filter(Boolean);
    if (parts.length > 1) {
        for (let i = parts.length - 1; i >= 0; i--) {
            const p = parts[i];
            if (/^(jl|jalan|dusun|kp|kampung|rt|rw|no\b|komplek|gedung)/i.test(p)) continue;
            const cleaned = cleanName(p);
            if (cleaned.length >= 2 && cleaned.length <= 25) {
                return cleaned;
            }
        }
    }

    return fallback;
};

