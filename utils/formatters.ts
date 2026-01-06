
export const formatRupiah = (number: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(number);
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
        str = terbilang(Math.floor(n / 1000)) + " ribu " + terbilang(n % 1000);
    } else if (n < 1000000000) {
        str = terbilang(Math.floor(n / 1000000)) + " juta " + terbilang(n % 1000000);
    } else if (n < 1000000000000) {
        str = terbilang(Math.floor(n / 1000000000)) + " milyar " + terbilang(n % 1000000000);
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
