import React from 'react';
import { Santri, PondokSettings, RaporRecord, DigitalAsset, GridCell } from '../types';
import { formatDate, getHijriDate, formatTanggalDokumen } from './formatters';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

export interface DynamicTagItem {
    tag: string;
    label: string;
    description: string;
    example: string;
    isMedia?: boolean;
}

export interface DynamicTagCategory {
    id: string;
    title: string;
    icon: string;
    color: string;
    tags: DynamicTagItem[];
}

export const DYNAMIC_TAG_CATEGORIES: DynamicTagCategory[] = [
    {
        id: 'santri',
        title: 'Data Santri',
        icon: 'bi-person-badge',
        color: 'text-blue-600 bg-blue-50 border-blue-200',
        tags: [
            { tag: '$NAMA', label: 'Nama Lengkap Santri', description: 'Nama resmi santri', example: 'Ahmad Fauzan' },
            { tag: '$NAMA_HIJRAH', label: 'Nama Hijrah / Arab', description: 'Nama hijrah jika ada', example: 'Abu Bakar' },
            { tag: '$NIS', label: 'Nomor Induk Santri (NIS)', description: 'NIS santri', example: '202401001' },
            { tag: '$NISN', label: 'NISN', description: 'Nomor Induk Siswa Nasional', example: '0081234567' },
            { tag: '$NIK', label: 'NIK Santri', description: 'Nomor Induk Kependudukan', example: '3509012345670001' },
            { tag: '$TEMPAT_LAHIR', label: 'Tempat Lahir', description: 'Kota tempat kelahiran', example: 'Jember' },
            { tag: '$TANGGAL_LAHIR', label: 'Tanggal Lahir', description: 'Format: 15 Januari 2010', example: '15 Januari 2010' },
            { tag: '$TTL', label: 'Tempat, Tanggal Lahir', description: 'Gabungan tempat & tanggal lahir', example: 'Jember, 15 Januari 2010' },
            { tag: '$JENIS_KELAMIN', label: 'Jenis Kelamin', description: 'Laki-laki / Perempuan', example: 'Laki-laki' },
            { tag: '$ALAMAT_SANTRI', label: 'Alamat Santri', description: 'Alamat lengkap domisili', example: 'Jl. Melati No. 12, Krajan' },
        ]
    },
    {
        id: 'ortu',
        title: 'Orang Tua / Wali',
        icon: 'bi-people-fill',
        color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
        tags: [
            { tag: '$NAMA_AYAH', label: 'Nama Ayah', description: 'Nama lengkap ayah santri', example: 'H. Abdullah Pratama' },
            { tag: '$NAMA_IBU', label: 'Nama Ibu', description: 'Nama lengkap ibu santri', example: 'Hj. Siti Aminah' },
            { tag: '$NAMA_WALI', label: 'Nama Orang Tua / Wali', description: 'Nama wali atau ayah', example: 'H. Abdullah Pratama' },
            { tag: '$TELEPON_ORTU', label: 'No. HP Orang Tua', description: 'Nomor WhatsApp / HP orang tua', example: '081234567890' },
            { tag: '$PEKERJAAN_AYAH', label: 'Pekerjaan Ayah', description: 'Profesi / pekerjaan ayah', example: 'Wiraswasta' },
            { tag: '$PEKERJAAN_IBU', label: 'Pekerjaan Ibu', description: 'Profesi / pekerjaan ibu', example: 'Guru' },
        ]
    },
    {
        id: 'akademik',
        title: 'Akademik & Kelas',
        icon: 'bi-book-half',
        color: 'text-indigo-600 bg-indigo-50 border-indigo-200',
        tags: [
            { tag: '$SEMESTER', label: 'Semester (Teks)', description: 'Ganjil atau Genap', example: 'Ganjil' },
            { tag: '$SEMESTER_ANGKA', label: 'Semester (Angka)', description: '1 atau 2', example: '1' },
            { tag: '$TAHUN_AJAR', label: 'Tahun Ajaran', description: 'Tahun pelajaran berjalan', example: '2026/2027' },
            { tag: '$JENJANG', label: 'Jenjang / Marhalah', description: 'Nama marhalah pendidikan', example: 'Tsanawiyyah' },
            { tag: '$KELAS', label: 'Tingkat Kelas', description: 'Nama kelas', example: 'Kelas 7' },
            { tag: '$ROMBEL', label: 'Rombongan Belajar', description: 'Nama rombel santri', example: '7A Ula' },
        ]
    },
    {
        id: 'tahfizh',
        title: 'Tahfizh & Al-Qur\'an',
        icon: 'bi-journal-bookmark-fill',
        color: 'text-teal-600 bg-teal-50 border-teal-200',
        tags: [
            { tag: '$HALAQAH', label: 'Kelompok Halaqah', description: 'Nama halaqah tahfizh santri', example: 'Halaqah Imam Nafi\'' },
            { tag: '$TARGET_JUZ', label: 'Target Hafalan (Juz)', description: 'Target juz yang ditetapkan', example: '30' },
            { tag: '$CAPAIAN_TAHFIZH', label: 'Capaian Terakhir', description: 'Surah dan ayat terakhir yang disetorkan', example: 'Juz 30, QS. An-Naba: 1-40' },
            { tag: '$TOTAL_SETORAN_TAHFIZH', label: 'Total Setoran', description: 'Jumlah mutaba\'ah setoran santri', example: '42 Setoran' },
        ]
    },
    {
        id: 'pejabat',
        title: 'Wali Kelas & Pimpinan',
        icon: 'bi-person-check-fill',
        color: 'text-purple-600 bg-purple-50 border-purple-200',
        tags: [
            { tag: '$NAMA_WALI_KELAS', label: 'Nama Wali Kelas', description: 'Nama pengajar wali kelas', example: 'Ust. Muhammad Rizki, S.Pd.' },
            { tag: '$NIP_WALI_KELAS', label: 'NIP/NIY Wali Kelas', description: 'Nomor identitas wali kelas', example: '198501012010011002' },
            { tag: '$NAMA_MUDIR', label: 'Nama Mudir / Pimpinan', description: 'Nama Pimpinan / Mudir Aam', example: 'K.H. Ahmad Dahlan, Lc.' },
            { tag: '$NIP_MUDIR', label: 'NIP/NIY Mudir', description: 'Nomor induk pimpinan pondok', example: '197001011995031001' },
            { tag: '$NAMA_KEPALA_SEKOLAH', label: 'Nama Kepala Madrasah', description: 'Nama kepala madrasah / sekolah', example: 'Ust. Ahmad Dahlan, M.Pd.' },
        ]
    },
    {
        id: 'tanggal',
        title: 'Tanggal & Kalender',
        icon: 'bi-calendar3',
        color: 'text-amber-600 bg-amber-50 border-amber-200',
        tags: [
            { tag: '$TANGGAL_MASEHI', label: 'Tanggal Lengkap Masehi', description: 'Hari, tanggal bulan tahun', example: '18 Agustus 2026' },
            { tag: '$TANGGAL_SINGKAT_MASEHI', label: 'Tanggal Singkat (DD/MM/YYYY)', description: 'Format numerik', example: '18/08/2026' },
            { tag: '$TAHUN_MASEHI', label: 'Tahun Masehi', description: '4 digit tahun masehi', example: '2026' },
            { tag: '$BULAN_MASEHI', label: 'Nama Bulan Masehi', description: 'Nama bulan masehi', example: 'Agustus' },
            { tag: '$TANGGAL_HIJRIAH', label: 'Tanggal Lengkap Hijriah', description: 'Sesuai kalender Hijriah & koreksi', example: '5 Shafar 1448 H' },
            { tag: '$TANGGAL_HIJRIAH_MASEHI', label: 'Tanggal Hijriah & Masehi', description: 'Format: Hijriah / Masehi', example: '5 Shafar 1448 H / 18 Agustus 2026 M' },
            { tag: '$TAHUN_HIJRIAH', label: 'Tahun Hijriah', description: 'Tahun hijriah', example: '1448 H' },
            { tag: '$BULAN_HIJRIAH', label: 'Bulan Hijriah', description: 'Nama bulan hijriah', example: 'Shafar' },
            { tag: '$KOTA_TANGGAL', label: 'Kota & Tanggal Masehi', description: 'Kota pondok dan tanggal cetak', example: 'Jember, 18 Agustus 2026' },
            { tag: '$KOTA_TANGGAL_HIJRIAH', label: 'Kota & Tanggal Hijriah', description: 'Kota pondok dan tanggal hijriah', example: 'Jember, 5 Shafar 1448 H' },
            { tag: '$KOTA_TANGGAL_HIJRIAH_MASEHI', label: 'Kota & Tanggal Hijriah/Masehi', description: 'Kota dan tanggal gabungan', example: 'Jember, 5 Shafar 1448 H / 18 Agustus 2026 M' },
            { tag: '$TANGGAL_DOKUMEN', label: 'Tanggal Rapor (Format Pengaturan)', description: 'Otomatis sesuai format Masehi/Hijriah di pengaturan', example: '18 Agustus 2026' },
            { tag: '$KOTA_TANGGAL_DOKUMEN', label: 'Kota & Tanggal (Format Pengaturan)', description: 'Kota dan tanggal sesuai format di pengaturan', example: 'Jember, 18 Agustus 2026' },
        ]
    },
    {
        id: 'pondok',
        title: 'Identitas Lembaga / Pondok',
        icon: 'bi-building',
        color: 'text-teal-600 bg-teal-50 border-teal-200',
        tags: [
            { tag: '$NAMA_PONPES', label: 'Nama Pondok Pesantren', description: 'Nama resmi pondok', example: 'Pondok Pesantren Al-Iman' },
            { tag: '$NAMA_YAYASAN', label: 'Nama Yayasan', description: 'Nama yayasan pembina', example: 'Yayasan Bina Insan Mulia' },
            { tag: '$NSPP', label: 'NSPP', description: 'Nomor Statistik Pondok', example: '510035090001' },
            { tag: '$NPSN', label: 'NPSN', description: 'Nomor Pokok Sekolah Nasional', example: '69912345' },
            { tag: '$ALAMAT_PONPES', label: 'Alamat Lengkap Pondok', description: 'Alamat pondok', example: 'Jl. Pesantren No. 99, Jawa Timur' },
            { tag: '$TELEPON_PONPES', label: 'Telepon Pondok', description: 'Nomor telepon resmi', example: '(0331) 456789' },
            { tag: '$EMAIL_PONPES', label: 'Email Pondok', description: 'Alamat email lembaga', example: 'info@pesantren.sch.id' },
            { tag: '$WEBSITE_PONPES', label: 'Website Pondok', description: 'Alamat website resmi', example: 'www.pesantren.sch.id' },
        ]
    },
    {
        id: 'media',
        title: 'Logo, TTD & Stempel',
        icon: 'bi-image',
        color: 'text-rose-600 bg-rose-50 border-rose-200',
        tags: [
            { tag: '$LOGO_PONPES', label: 'Logo Pondok Pesantren', description: 'Gambar logo resmi pondok', example: '[Gambar Logo Ponpes]', isMedia: true },
            { tag: '$LOGO_YAYASAN', label: 'Logo Yayasan', description: 'Gambar logo yayasan', example: '[Gambar Logo Yayasan]', isMedia: true },
            { tag: '$STEMPEL_PONPES', label: 'Stempel Resmi Pondok', description: 'Cap stempel lembaga', example: '[Gambar Stempel Ponpes]', isMedia: true },
            { tag: '$TTD_WALI_KELAS', label: 'Tanda Tangan Wali Kelas', description: 'TTD digital wali kelas', example: '[TTD Wali Kelas]', isMedia: true },
            { tag: '$TTD_MUDIR', label: 'Tanda Tangan Mudir / Pimpinan', description: 'TTD digital mudir aam', example: '[TTD Mudir]', isMedia: true },
        ]
    }
];

export interface RaporResolveContext {
    santri?: Santri | null;
    settings?: PondokSettings | null;
    record?: RaporRecord | null;
    digitalAssets?: DigitalAsset[];
    targetDate?: Date;
}

export const isMediaTag = (value: string): boolean => {
    if (!value) return false;
    const v = value.trim();
    return v === '$LOGO_PONPES' ||
           v === '$LOGO_YAYASAN' ||
           v === '$STEMPEL_PONPES' ||
           v === '$TTD_WALI_KELAS' ||
           v === '$TTD_MUDIR' ||
           v.startsWith('$TTD_PENGAJAR') ||
           v.startsWith('$STEMPEL_') ||
           v.startsWith('$ASSET_');
};

export const getMediaTagImageSrc = (tag: string, context: RaporResolveContext): string | null => {
    const { settings, santri, digitalAssets = [] } = context;
    const t = tag.trim();

    if (t === '$LOGO_PONPES') {
        return settings?.logoPonpesUrl || null;
    }
    if (t === '$LOGO_YAYASAN') {
        return settings?.logoYayasanUrl || null;
    }
    if (t === '$STEMPEL_PONPES') {
        if (settings?.stempelPonpesUrl) return settings.stempelPonpesUrl;
        const stempelAsset = digitalAssets.find(a => a.type === 'stempel');
        return stempelAsset?.base64Image || null;
    }
    if (t === '$TTD_WALI_KELAS') {
        if (santri && settings) {
            const rombel = settings.rombel.find(r => r.id === santri.rombelId);
            if (rombel?.waliKelasUserId) {
                const teacher = settings.tenagaPengajar.find(tp => tp.id === rombel.waliKelasUserId);
                if (teacher) {
                    const teacherAsset = digitalAssets.find(a => a.type === 'ttd' && a.namaPemilik === teacher.nama);
                    if (teacherAsset?.base64Image) return teacherAsset.base64Image;
                }
            }
        }
        const anyWaliAsset = digitalAssets.find(a => a.type === 'ttd' && a.jabatan?.toLowerCase().includes('wali'));
        return anyWaliAsset?.base64Image || null;
    }
    if (t === '$TTD_MUDIR') {
        if (settings?.mudirAamId) {
            const mudir = settings.tenagaPengajar.find(tp => tp.id === settings.mudirAamId);
            if (mudir) {
                const mudirAsset = digitalAssets.find(a => a.type === 'ttd' && (a.namaPemilik === mudir.nama || a.jabatan?.toLowerCase().includes('mudir') || a.jabatan?.toLowerCase().includes('pimpinan')));
                if (mudirAsset?.base64Image) return mudirAsset.base64Image;
            }
        }
        const mudirAsset = digitalAssets.find(a => a.type === 'ttd' && (a.jabatan?.toLowerCase().includes('mudir') || a.jabatan?.toLowerCase().includes('pimpinan') || a.jabatan?.toLowerCase().includes('pengasuh')));
        return mudirAsset?.base64Image || null;
    }
    if (t.startsWith('$TTD_PENGAJAR')) {
        // e.g. $TTD_PENGAJAR:12 or $TTD_PENGAJAR_12 or $TTD_PENGAJAR
        const match = t.match(/[:_](\d+)/);
        if (match && settings) {
            const teacherId = parseInt(match[1], 10);
            const teacher = settings.tenagaPengajar.find(tp => tp.id === teacherId);
            if (teacher) {
                const teacherAsset = digitalAssets.find(a => a.type === 'ttd' && a.namaPemilik === teacher.nama);
                if (teacherAsset?.base64Image) return teacherAsset.base64Image;
            }
        }
        const anyTeacherAsset = digitalAssets.find(a => a.type === 'ttd');
        return anyTeacherAsset?.base64Image || null;
    }
    if (t.startsWith('$ASSET_')) {
        const assetId = t.replace('$ASSET_', '');
        const asset = digitalAssets.find(a => a.id === assetId);
        return asset?.base64Image || null;
    }
    return null;
};

export const resolveRaporText = (text: string, context: RaporResolveContext): string => {
    if (!text) return '';
    const { santri, settings, record, targetDate = new Date() } = context;
    let res = text;

    // Santri Data
    if (santri) {
        res = res.replace(/\$NAMA_LENGKAP/g, santri.namaLengkap);
        res = res.replace(/\$NAMA/g, santri.namaLengkap);
        res = res.replace(/\$NAMA_HIJRAH/g, santri.namaHijrah || santri.namaLengkap);
        res = res.replace(/\$NISN/g, santri.nisn || '-');
        res = res.replace(/\$NIS/g, santri.nis);
        res = res.replace(/\$NIK/g, santri.nik || '-');
        res = res.replace(/\$TEMPAT_LAHIR/g, santri.tempatLahir || '-');
        res = res.replace(/\$TANGGAL_LAHIR/g, santri.tanggalLahir ? formatDate(santri.tanggalLahir) : '-');
        res = res.replace(/\$TTL/g, `${santri.tempatLahir || '-'}, ${santri.tanggalLahir ? formatDate(santri.tanggalLahir) : '-'}`);
        res = res.replace(/\$JENIS_KELAMIN/g, santri.jenisKelamin || '-');
        const alamatStr = santri.alamat ? `${santri.alamat.detail || ''} ${santri.alamat.desaKelurahan || ''} ${santri.alamat.kecamatan || ''} ${santri.alamat.kabupatenKota || ''} ${santri.alamat.provinsi || ''}`.trim() : '-';
        res = res.replace(/\$ALAMAT_SANTRI/g, alamatStr || '-');

        // Orang Tua / Wali
        res = res.replace(/\$NAMA_AYAH/g, santri.namaAyah || '-');
        res = res.replace(/\$NAMA_IBU/g, santri.namaIbu || '-');
        res = res.replace(/\$NAMA_WALI/g, santri.namaWali || santri.namaAyah || santri.namaIbu || '-');
        res = res.replace(/\$TELEPON_ORTU/g, santri.teleponAyah || santri.teleponIbu || santri.teleponWali || '-');
        res = res.replace(/\$PEKERJAAN_AYAH/g, santri.pekerjaanAyah || '-');
        res = res.replace(/\$PEKERJAAN_IBU/g, santri.pekerjaanIbu || '-');

        // Tahfizh Data
        res = res.replace(/\$TARGET_JUZ/g, santri.targetJuz ? `${santri.targetJuz} Juz` : '-');
    }

    // Settings & Academic
    if (settings) {
        if (santri) {
            const jenjang = settings.jenjang.find(j => j.id === santri.jenjangId);
            const kelas = settings.kelas.find(k => k.id === santri.kelasId);
            const rombel = settings.rombel.find(r => r.id === santri.rombelId);
            const halaqah = (settings.kelompokHalaqah || []).find(h => h.id === santri.halaqahId);
            res = res.replace(/\$JENJANG/g, jenjang?.nama || '');
            res = res.replace(/\$KELAS/g, kelas?.nama || '');
            res = res.replace(/\$ROMBEL/g, rombel?.nama || '');
            res = res.replace(/\$HALAQAH/g, halaqah?.nama || '-');

            // Wali Kelas
            let waliName = '-';
            let waliNip = '-';
            if (rombel?.waliKelasUserId) {
                const teacher = settings.tenagaPengajar.find(tp => tp.id === rombel.waliKelasUserId);
                if (teacher) {
                    waliName = teacher.nama;
                    waliNip = teacher.kodeGuru || teacher.telepon || '-';
                }
            }
            res = res.replace(/\$NAMA_WALI_KELAS/g, waliName);
            res = res.replace(/\$NIP_WALI_KELAS/g, waliNip);
        }

        // Mudir / Pimpinan
        let mudirName = 'K.H. Pimpinan Pesantren';
        let mudirNip = '-';
        if (settings.mudirAamId) {
            const mudir = settings.tenagaPengajar.find(tp => tp.id === settings.mudirAamId);
            if (mudir) {
                mudirName = mudir.nama;
                mudirNip = mudir.kodeGuru || mudir.telepon || '-';
            }
        }
        res = res.replace(/\$NAMA_MUDIR/g, mudirName);
        res = res.replace(/\$NAMA_PIMPINAN/g, mudirName);
        res = res.replace(/\$NAMA_KEPALA_SEKOLAH/g, mudirName);
        res = res.replace(/\$NIP_MUDIR/g, mudirNip);

        // Identitas Lembaga
        res = res.replace(/\$NAMA_PONPES/g, settings.namaPonpes || '');
        res = res.replace(/\$NAMA_YAYASAN/g, settings.namaYayasan || '');
        res = res.replace(/\$NSPP/g, settings.nspp || '-');
        res = res.replace(/\$NPSN/g, settings.npsn || '-');
        res = res.replace(/\$ALAMAT_PONPES/g, settings.alamat || '');
        res = res.replace(/\$TELEPON_PONPES/g, settings.telepon || '-');
        res = res.replace(/\$EMAIL_PONPES/g, settings.email || '-');
        res = res.replace(/\$WEBSITE_PONPES/g, settings.website || '-');
    }

    // Period / Record
    const sem = record?.semester || 'Ganjil';
    res = res.replace(/\$SEMESTER_ANGKA/g, sem === 'Genap' ? '2' : '1');
    res = res.replace(/\$SEMESTER/g, sem);
    res = res.replace(/\$TAHUN_AJARAN/g, record?.tahunAjaran || '-');
    res = res.replace(/\$TAHUN_AJAR/g, record?.tahunAjaran || '-');

    // Date & Hijri
    let dateObj: Date;
    if (record?.tanggalRapor) {
        dateObj = new Date(record.tanggalRapor);
    } else if (context.targetDate) {
        dateObj = context.targetDate;
    } else if (settings?.tanggalRaporDefault) {
        dateObj = new Date(settings.tanggalRaporDefault);
    } else {
        dateObj = new Date();
    }

    const hijriAdjustment = settings?.hijriAdjustment || 0;
    const hijriInfo = getHijriDate(dateObj, hijriAdjustment);
    const masehiStr = formatDate(dateObj);
    const hijriFullWithH = hijriInfo.full ? `${hijriInfo.full} H` : '';
    const hijriMasehiCombined = hijriFullWithH ? `${hijriFullWithH} / ${masehiStr} M` : masehiStr;

    const docFormattedDate = formatTanggalDokumen(dateObj, {
        formatMode: settings?.formatTanggalRaporDefault || 'masehi',
        hijriAdjustment,
        manualHijri: settings?.manualHijriRaporDefault
    });

    res = res.replace(/\$TANGGAL_MASEHI/g, masehiStr);
    res = res.replace(/\$TANGGAL_SINGKAT_MASEHI/g, format(dateObj, 'dd/MM/yyyy'));
    res = res.replace(/\$TAHUN_MASEHI/g, format(dateObj, 'yyyy'));
    res = res.replace(/\$BULAN_MASEHI/g, format(dateObj, 'MMMM', { locale: idLocale }));

    res = res.replace(/\$TANGGAL_HIJRIAH_MASEHI/g, hijriMasehiCombined);
    res = res.replace(/\$TANGGAL_HIJRIAH/g, hijriFullWithH || '-');
    res = res.replace(/\$TAHUN_HIJRIAH/g, hijriInfo.year ? `${hijriInfo.year} H` : '-');
    res = res.replace(/\$BULAN_HIJRIAH/g, hijriInfo.month || '-');

    res = res.replace(/\$TANGGAL_DOKUMEN/g, docFormattedDate);

    const kotaPondok = settings?.tempatRaporDefault?.trim() 
        || (settings?.alamat ? (settings.alamat.includes(',') ? settings.alamat.split(',')[0].trim() : 'Pesantren') : 'Pesantren');
    
    res = res.replace(/\$TEMPAT_RAPOR/g, kotaPondok);
    res = res.replace(/\$KOTA_PONPES/g, kotaPondok);
    res = res.replace(/\$KOTA_TANGGAL_HIJRIAH_MASEHI/g, `${kotaPondok}, ${hijriMasehiCombined}`);
    res = res.replace(/\$KOTA_TANGGAL_HIJRIAH/g, `${kotaPondok}, ${hijriFullWithH || ''}`);
    res = res.replace(/\$KOTA_TANGGAL_DOKUMEN/g, `${kotaPondok}, ${docFormattedDate}`);
    res = res.replace(/\$KOTA_TANGGAL/g, `${kotaPondok}, ${masehiStr}`);

    return res;
};
