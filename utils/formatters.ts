
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
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '';
        return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch (e) { return ''; }
};

export const formatDateTime = (dateString?: string | Date) => {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '';
        return date.toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch (e) { return ''; }
};

// Mendapatkan detail Hijriah dari tanggal Masehi
export const getHijriDate = (date: Date) => {
    try {
        // Menggunakan islamic-umalqura yang umum digunakan
        const formatter = new Intl.DateTimeFormat('id-ID-u-ca-islamic-umalqura', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
        
        const parts = formatter.formatToParts(date);
        const day = parts.find(p => p.type === 'day')?.value;
        const month = parts.find(p => p.type === 'month')?.value;
        const year = parts.find(p => p.type === 'year')?.value;

        return { day, month, year, full: `${day} ${month} ${year}` };
    } catch (e) {
        return { day: '', month: '', year: '', full: '' };
    }
};

// Helper untuk mencari tanggal 1 bulan Hijriah dari sebuah tanggal referensi
export const findStartOfHijriMonth = (referenceDate: Date): Date => {
    let d = new Date(referenceDate);
    const targetHijriMonth = getHijriDate(d).month;
    
    // Mundur ke belakang untuk mencari tanggal 1
    // Batas aman 35 hari untuk mencegah infinite loop
    for (let i = 0; i < 35; i++) {
        const prevDate = new Date(d);
        prevDate.setDate(d.getDate() - 1);
        const prevHijri = getHijriDate(prevDate);
        
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
