
import * as XLSX from 'xlsx';
import { Santri, PondokSettings, TransaksiKas, Tagihan, TransaksiKoperasi } from '../types';

// Stub functions to satisfy TS - implementation logic resides in actual files if preserved, 
// otherwise these placeholders prevent build errors.
// Helper to format date consistent with common report logic
const formatExcelDate = (dateVal: string | Date | undefined) => {
    if (!dateVal) return '-';
    try {
        const d = typeof dateVal === 'string' ? new Date(dateVal) : dateVal;
        return d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch (e) {
        return '-';
    }
};

/**
 * Ekspor Data Santri ke Excel (Default Export)
 */
export const exportSantriToExcel = (data: Santri[], settings: PondokSettings, fileName: string) => { 
    const excelData = data.map((s, index) => {
        const rombel = settings.rombel.find(r => r.id === s.rombelId);
        const kelas = settings.kelas.find(k => k.id === s.kelasId);
        const jenjang = settings.jenjang.find(j => j.id === s.jenjangId);
        
        return {
            'No': index + 1,
            'NIS': s.nis,
            'Nama Lengkap': s.namaLengkap,
            'Nama Hijrah': s.namaHijrah || '-',
            'L/P': s.jenisKelamin === 'Laki-laki' ? 'L' : 'P',
            'Tempat Lahir': s.tempatLahir,
            'Tanggal Lahir': formatExcelDate(s.tanggalLahir),
            'Jenjang': jenjang?.nama || '-',
            'Kelas': kelas?.nama || '-',
            'Rombel': rombel?.nama || '-',
            'Status': s.status,
            'Nama Ayah': s.namaAyah,
            'No HP Ayah': s.teleponAyah || '-',
            'Nama Ibu': s.namaIbu,
            'No HP Ibu': s.teleponIbu || '-',
            'Nama Wali': s.namaWali || '-',
            'No HP Wali': s.teleponWali || '-',
            'Alamat Detail': s.alamat?.detail || '-',
            'Kecamatan': s.alamat?.kecamatan || '-',
            'Kab/Kota': s.alamat?.kabupatenKota || '-'
        };
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data Santri");
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
};

/**
 * Ekspor Kontak untuk Import HP (Format CSV-Friendly)
 */
export const exportContactsToExcel = (data: Santri[], settings: PondokSettings, fileName: string) => { 
    const excelData = data.map((s, index) => {
        return {
            'First Name': s.namaLengkap,
            'Last Name': `SANTRI-${settings.rombel.find(r => r.id === s.rombelId)?.nama || ''}`,
            'Mobile Phone': s.teleponWali || s.teleponAyah || s.teleponIbu || '',
            'Home Address': s.alamat?.detail || '',
            'Notes': `Orang Tua: ${s.namaAyah || s.namaWali || ''}`
        };
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Kontak Wali");
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
};

/**
 * Ekspor Arus Kas ke Excel
 */
export const exportArusKasToExcel = (data: TransaksiKas[], fileName: string) => { 
    const excelData = data.map((t, index) => ({
        'No': index + 1,
        'Tanggal': formatExcelDate(t.tanggal),
        'Jenis': t.jenis,
        'Kategori': t.kategori,
        'Deskripsi': t.deskripsi,
        'Jumlah': t.jumlah,
        'P. Jawab': t.penanggungJawab
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Arus Kas");
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
};

/**
 * Ekspor Ringkasan Keuangan
 */
export const exportFinanceSummaryToExcel = (data: Santri[], tagihan: Tagihan[], settings: PondokSettings, fileName: string) => { 
    const excelData = data.map((s, index) => {
        const santriTagihan = tagihan.filter(t => t.santriId === s.id && t.status === 'Belum Lunas');
        const totalTunggakan = santriTagihan.reduce((acc, curr) => acc + curr.nominal, 0);
        
        return {
            'No': index + 1,
            'NIS': s.nis,
            'Nama Santri': s.namaLengkap,
            'Rombel': settings.rombel.find(r => r.id === s.rombelId)?.nama || '-',
            'Total Tunggakan': totalTunggakan,
            'Jumlah Item': santriTagihan.length
        };
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Tunggakan");
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
};

/**
 * Ekspor Template EMIS (Simplified)
 */
export const exportEmisTemplate = (data: Santri[], settings: PondokSettings, fileName: string) => { 
    const excelData = data.map(s => ({
        'NIK': s.nik || '',
        'NISN': s.nisn || '',
        'NAMA LENGKAP': s.namaLengkap,
        'TEMPAT LAHIR': s.tempatLahir,
        'TANGGAL LAHIR (YYYY-MM-DD)': s.tanggalLahir,
        'JENIS KELAMIN (L/P)': s.jenisKelamin === 'Laki-laki' ? 'L' : 'P',
        'NAMA AYAH': s.namaAyah,
        'NAMA IBU': s.namaIbu,
        'ALAMAT': s.alamat?.detail || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template EMIS");
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
};


/**
 * Ekspor Transaksi Koperasi ke Excel
 */
export const exportKoperasiToExcel = (transaksiList: TransaksiKoperasi[], fileName: string = 'Laporan_Koperasi') => {
    const data = transaksiList.map((t, index) => {
        // Flatten items for string representation
        const itemDetails = t.items.map(i => `${i.nama} (${i.qty}x)`).join(', ');
        
        return {
            'No': index + 1,
            'Tanggal': new Date(t.tanggal).toLocaleDateString('id-ID'),
            'Waktu': new Date(t.tanggal).toLocaleTimeString('id-ID'),
            'Tipe Pelanggan': t.tipePembeli,
            'Nama Pembeli': t.namaPembeli,
            'Metode Bayar': t.metodePembayaran,
            'Total Belanja': t.totalBelanja,
            'Bayar': t.bayar,
            'Kembali': t.kembali,
            'Kembalian Ke Saldo': t.kembalianMasukSaldo ? 'Ya' : 'Tidak',
            'Item': itemDetails,
            'Kasir': t.kasir
        };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    
    // Auto-width hint
    const wscols = [
        { wch: 5 }, { wch: 12 }, { wch: 10 }, { wch: 15 }, { wch: 25 }, 
        { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 50 }, { wch: 15 }
    ];
    worksheet['!cols'] = wscols;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Transaksi");
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
};
