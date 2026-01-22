
import * as XLSX from 'xlsx';
import { Santri, PondokSettings, TransaksiKas, Tagihan } from '../types';

/**
 * Mengonversi daftar santri menjadi format yang ramah Excel
 * dan mengunduhnya sebagai file .xlsx
 */
export const exportSantriToExcel = (santriList: Santri[], settings: PondokSettings, fileName: string = 'Data_Santri') => {
    // 1. Transformasi Data: Mapping data kompleks ke flat object
    const dataForExcel = santriList.map((s, index) => {
        // Helper untuk mencari nama jenjang/kelas/rombel
        const jenjang = settings.jenjang.find(j => j.id === s.jenjangId)?.nama || '-';
        const rombel = settings.rombel.find(r => r.id === s.rombelId)?.nama || '-';
        
        // Prioritas Kontak Wali
        const kontakWali = s.teleponWali || s.teleponAyah || s.teleponIbu || '-';
        const namaWali = s.namaWali || s.namaAyah || s.namaIbu || '-';

        return {
            'No': index + 1,
            'NIS': s.nis,
            'NISN': s.nisn || '',
            'Nama Lengkap': s.namaLengkap,
            'Gender': s.jenisKelamin,
            'Tempat Lahir': s.tempatLahir,
            'Tanggal Lahir': s.tanggalLahir,
            'Jenjang': jenjang,
            'Rombel/Kelas': rombel,
            'Status': s.status,
            'Nama Ayah': s.namaAyah || '',
            'Nama Ibu': s.namaIbu || '',
            'Nama Wali': namaWali,
            'Kontak Wali': kontakWali,
            'Alamat Lengkap': s.alamat.detail || '',
            'Kabupaten/Kota': s.alamat.kabupatenKota || '',
            'Provinsi': s.alamat.provinsi || ''
        };
    });

    // 2. Membuat Worksheet
    const worksheet = XLSX.utils.json_to_sheet(dataForExcel);

    // 3. Mengatur Lebar Kolom (Auto Width sederhana)
    const wscols = [
        { wch: 5 },  // No
        { wch: 15 }, // NIS
        { wch: 15 }, // NISN
        { wch: 30 }, // Nama
        { wch: 10 }, // Gender
        { wch: 15 }, // Tempat Lahir
        { wch: 12 }, // Tgl Lahir
        { wch: 15 }, // Jenjang
        { wch: 15 }, // Rombel
        { wch: 10 }, // Status
        { wch: 20 }, // Ayah
        { wch: 20 }, // Ibu
        { wch: 20 }, // Wali
        { wch: 15 }, // Kontak
        { wch: 40 }, // Alamat
        { wch: 15 }, // Kab/Kota
        { wch: 15 }, // Provinsi
    ];
    worksheet['!cols'] = wscols;

    // 4. Membuat Workbook dan Append Worksheet
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data Santri");

    // 5. Generate File dan Download
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
};

/**
 * Ekspor data Kontak Wali ke Excel (Format Sederhana)
 */
export const exportContactsToExcel = (santriList: Santri[], settings: PondokSettings, fileName: string = 'Kontak_Wali') => {
    const data = santriList.map((s, index) => {
        const rombel = settings.rombel.find(r => r.id === s.rombelId)?.nama || '-';
        let parent = s.namaWali || s.namaAyah || s.namaIbu || 'Orang Tua';
        let phone = s.teleponWali || s.teleponAyah || s.teleponIbu || '';
        
        // Bersihkan nomor HP agar formatnya angka saja
        phone = phone.replace(/[^0-9]/g, '');
        if (phone.startsWith('0')) phone = '62' + phone.substring(1);

        return {
            'No': index + 1,
            'Nama Santri': s.namaLengkap,
            'Kelas/Rombel': rombel,
            'Nama Wali': parent,
            'Nomor HP (WhatsApp)': phone
        };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Kontak Wali");
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
};

/**
 * Ekspor Buku Kas Umum ke Excel
 */
export const exportArusKasToExcel = (transaksiList: TransaksiKas[], fileName: string = 'Laporan_Arus_Kas') => {
    const data = transaksiList.map((t, index) => ({
        'No': index + 1,
        'Tanggal': new Date(t.tanggal).toLocaleDateString('id-ID'),
        'Waktu': new Date(t.tanggal).toLocaleTimeString('id-ID'),
        'Kategori': t.kategori,
        'Deskripsi': t.deskripsi,
        'Pemasukan': t.jenis === 'Pemasukan' ? t.jumlah : 0,
        'Pengeluaran': t.jenis === 'Pengeluaran' ? t.jumlah : 0,
        'Saldo': t.saldoSetelah,
        'PJ': t.penanggungJawab || '-'
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    
    // Format kolom angka (optional if needed, sheetjs usually handles types)
    const wscols = [
        { wch: 5 }, { wch: 12 }, { wch: 10 }, { wch: 20 }, { wch: 40 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }
    ];
    worksheet['!cols'] = wscols;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Arus Kas");
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
};

/**
 * Ekspor Ringkasan Keuangan (Tunggakan) ke Excel
 */
export const exportFinanceSummaryToExcel = (santriList: Santri[], tagihanList: Tagihan[], settings: PondokSettings, fileName: string = 'Laporan_Tunggakan') => {
    // Filter tagihan yang belum lunas
    const tagihanBelumLunas = tagihanList.filter(t => t.status === 'Belum Lunas');
    
    // Group by Santri
    const mapTunggakan = new Map<number, number>();
    tagihanBelumLunas.forEach(t => {
        const current = mapTunggakan.get(t.santriId) || 0;
        mapTunggakan.set(t.santriId, current + t.nominal);
    });

    const data = santriList.map((s, index) => {
        const tunggakan = mapTunggakan.get(s.id) || 0;
        const rombel = settings.rombel.find(r => r.id === s.rombelId)?.nama || '-';
        
        return {
            'No': index + 1,
            'NIS': s.nis,
            'Nama Santri': s.namaLengkap,
            'Kelas/Rombel': rombel,
            'Status Santri': s.status,
            'Total Tunggakan': tunggakan,
            'Status Keuangan': tunggakan > 0 ? 'Menunggak' : 'Lunas'
        };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const wscols = [
        { wch: 5 }, { wch: 15 }, { wch: 30 }, { wch: 15 }, { wch: 12 }, { wch: 20 }, { wch: 15 }
    ];
    worksheet['!cols'] = wscols;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Tunggakan Santri");
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
};

/**
 * Ekspor Format EMIS (Data Pokok Santri)
 * Kolom disesuaikan dengan kebutuhan umum template EMIS/Dapodik
 */
export const exportEmisTemplate = (santriList: Santri[], settings: PondokSettings, fileName: string = 'Format_EMIS') => {
    const data = santriList.map((s, index) => {
        const rombel = settings.rombel.find(r => r.id === s.rombelId)?.nama || '-';
        const jenjang = settings.jenjang.find(j => j.id === s.jenjangId)?.nama || '-';
        
        return {
            'NO': index + 1,
            'NAMA LENGKAP': s.namaLengkap?.toUpperCase(),
            'NIS LOKAL': s.nis,
            'NISN': s.nisn || '',
            'NIK': s.nik || '',
            'TEMPAT LAHIR': s.tempatLahir,
            'TANGGAL LAHIR': s.tanggalLahir, // YYYY-MM-DD
            'JENIS KELAMIN': s.jenisKelamin === 'Laki-laki' ? 'L' : 'P',
            'NAMA IBU KANDUNG': s.namaIbu?.toUpperCase(),
            'NAMA AYAH KANDUNG': s.namaAyah?.toUpperCase(),
            'JENJANG': jenjang,
            'KELAS/ROMBEL': rombel,
            'ALAMAT JALAN': s.alamat.detail,
            'DESA/KELURAHAN': s.alamat.desaKelurahan,
            'KECAMATAN': s.alamat.kecamatan,
            'KABUPATEN/KOTA': s.alamat.kabupatenKota,
            'PROVINSI': s.alamat.provinsi,
            'KODE POS': s.alamat.kodePos,
            'JENIS TEMPAT TINGGAL': 'Pesantren', // Default
            'KK': '', // Placeholder
            'ANAK KE': s.anakKe || '',
            'JUMLAH SAUDARA': s.jumlahSaudara || '',
            'HOBBY': s.hobi ? s.hobi.join(', ') : '',
            'CITA-CITA': '', // Placeholder
        };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    
    // Auto-width hint
    const wscols = Object.keys(data[0] || {}).map(() => ({ wch: 20 }));
    worksheet['!cols'] = wscols;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "EMIS_Data");
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
};
