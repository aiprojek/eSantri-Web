import React from 'react';
import { Santri, PondokSettings, RaporRecord, DigitalAsset, GridCell, RaporTemplate } from '../types';
import { formatDate, getHijriDate, formatTanggalDokumen } from './formatters';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { evaluateRaporFormula, isRaporFormulaExpression } from './raporFormulaUtils';
import { getAcademicYearsFromSettings, getDefaultAcademicYear } from './academicYear';

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
            { tag: '$SEMESTER', label: 'Semester (Teks)', description: 'Ganjil atau Genap (otomatis dari periode aktif)', example: 'Ganjil' },
            { tag: '$SEMESTER_ANGKA', label: 'Semester (Angka)', description: '1 atau 2', example: '1' },
            { tag: '$TAHUN_AJAR', label: 'Tahun Ajaran Aktif', description: 'Tahun pelajaran aktif dari Data Master', example: '2026/2027' },
            { tag: '$TAHUN_AJAR_HIJRIAH', label: 'Tahun Ajaran Hijriah', description: 'Tahun pelajaran Hijriah dari pengaturan Tahun Ajaran', example: '1447/1448 H' },
            { tag: '$TAHUN_AJAR_LENGKAP', label: 'Tahun Ajaran Hijriah / Masehi', description: 'Gabungan Tahun Ajaran Hijriah & Masehi bila diaktifkan', example: '1447/1448 H / 2026/2027 M' },
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
            { tag: '$NILAI_TAHFIZH', label: 'Nilai Rata-rata Tahfizh', description: 'Skor angka rata-rata setoran/ujian tahfizh', example: '90' },
            { tag: '$PREDIKAT_TAHFIZH', label: 'Predikat Tahfizh', description: 'Predikat kelancaran tahfizh santri', example: 'Sangat Lancar' },
        ]
    },
    {
        id: 'absensi_catatan',
        title: 'Presensi & Catatan',
        icon: 'bi-calendar-check',
        color: 'text-amber-700 bg-amber-50 border-amber-200',
        tags: [
            { tag: '$SAKIT', label: 'Jumlah Sakit (Hari)', description: 'Akumulasi izin sakit semester ini', example: '2' },
            { tag: '$IZIN', label: 'Jumlah Izin (Hari)', description: 'Akumulasi izin keperluan semester ini', example: '1' },
            { tag: '$ALPHA', label: 'Jumlah Alpha (Hari)', description: 'Akumulasi tanpa keterangan', example: '0' },
            { tag: '$TOTAL_ABSEN', label: 'Total Ketidakhadiran (Hari)', description: 'Total Sakit + Izin + Alpha', example: '3' },
            { tag: '$CATATAN_WALI_KELAS', label: 'Catatan Wali Kelas', description: 'Catatan kemajuan santri dari wali kelas', example: 'Pertahankan prestasi belajar dan kedisiplinan.' },
            { tag: '$KEPUTUSAN', label: 'Keputusan Kenaikan / Kelulusan', description: 'Naik ke kelas / Lulus', example: 'Naik ke Kelas VIII' },
        ]
    },
    {
        id: 'kalkulasi',
        title: 'Kalkulasi & Ranking',
        icon: 'bi-calculator-fill',
        color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
        tags: [
            { tag: '$TOTAL_NILAI', label: 'Total Akumulasi Nilai', description: 'Jumlah total seluruh nilai mapel santri', example: '850' },
            { tag: '$RATA_RATA', label: 'Nilai Rata-Rata', description: 'Rata-rata seluruh nilai mapel santri', example: '85.50' },
            { tag: '$PREDIKAT_RATA_RATA', label: 'Predikat Rata-Rata', description: 'Predikat hasil belajar (Mumtaz/Jayyid Jiddan/dll)', example: 'Jayyid Jiddan' },
            { tag: '$PERINGKAT', label: 'Peringkat / Ranking', description: 'Peringkat santri di rombel', example: '3' },
            { tag: '$RANKING', label: 'Ranking Kelas (Alias)', description: 'Peringkat santri di rombel', example: '3' },
            { tag: '$TOTAL_SANTRI', label: 'Jumlah Santri di Rombel', description: 'Total santri dalam satu rombel', example: '32' },
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
        id: 'kurikulum_merdeka',
        title: 'Kurikulum Merdeka & Capaian (CP/TP)',
        icon: 'bi-stars',
        color: 'text-violet-600 bg-violet-50 border-violet-200',
        tags: [
            { tag: '$DESKRIPSI_CAPAIAN_TERTINGGI', label: 'Deskripsi Capaian Tertinggi', description: 'Narasi kompetensi yang paling dikuasai santri secara optimal', example: 'Menunjukkan pemahaman yang sangat mendalam dan optimal dalam menguasai seluruh capaian materi pembelajaran.' },
            { tag: '$DESKRIPSI_CAPAIAN_TERENDAH', label: 'Deskripsi Capaian Perlu Peningkatan', description: 'Narasi kompetensi yang perlu pembinaan dan bimbingan lebih', example: 'Perlu bimbingan dan peningkatan konsentrasi serta penguatan konsep materi yang belum tuntas.' },
            { tag: '$DESKRIPSI_KOMPETENSI', label: 'Deskripsi Capaian Pembelajaran Umum', description: 'Rangkuman narasi menyeluruh perkembangan belajar santri', example: 'Menunjukkan penguasaan kompetensi yang sangat baik, berinisiatif tinggi serta aktif dalam kegiatan belajar.' },
            { tag: '$STATUS_KELULUSAN', label: 'Status Kelulusan / Kenaikan', description: 'Lulus / Naik Kelas / Tinggal Kelas', example: 'Naik ke Tingkat Berikutnya' },
        ]
    },
    {
        id: 'mapel_repeater',
        title: 'Repeater Mata Pelajaran',
        icon: 'bi-list-ol',
        color: 'text-cyan-700 bg-cyan-50 border-cyan-200',
        tags: [
            { tag: '$MAPEL_NO', label: 'Nomor Urut Mapel', description: 'Nomor urut otomatis 1, 2, 3...', example: '1' },
            { tag: '$MAPEL_NAMA', label: 'Nama Mata Pelajaran', description: 'Nama mapel dinamis', example: 'Bahasa Arab' },
            { tag: '$MAPEL_KKM', label: 'KKM / Nilai Kriteria', description: 'Nilai standar ketuntasan minimal', example: '75' },
            { tag: '$MAPEL_NILAI', label: 'Nilai Akhir Mapel', description: 'Nilai angka hasil evaluasi', example: '88' },
            { tag: '$MAPEL_PREDIKAT', label: 'Predikat Mapel', description: 'Huruf predikat (A / B / C atau Mumtaz)', example: 'Mumtaz' },
            { tag: '$MAPEL_DESKRIPSI', label: 'Deskripsi Capaian Mapel', description: 'Deskripsi narasi capaian per mapel', example: 'Sangat baik dalam penguasaan kaidah nahwu dasar.' },
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
    calculation?: {
        totalNilai?: number;
        rataRata?: number;
        ranking?: number;
        totalSantri?: number;
        predikat?: string;
    };
    extraVars?: Record<string, any>;
    tahunAjaran?: string;
    semester?: 'Ganjil' | 'Genap';
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

export const templateHasBuiltInBiodata = (template: RaporTemplate | null | undefined): boolean => {
    if (!template) return false;
    const sheets = template.sheets && template.sheets.length > 0 ? template.sheets : [{ cells: template.cells }];
    for (const sheet of sheets) {
        if (!sheet || !sheet.cells) continue;
        for (const row of sheet.cells) {
            for (const cell of row) {
                if (!cell || !cell.value) continue;
                const v = cell.value.toUpperCase();
                if (
                    v.includes('$NAMA') || v.includes('{{NAMA') || v.includes('{NAMA') ||
                    v.includes('$NIS') || v.includes('{{NIS') || v.includes('{NIS') ||
                    v.includes('$ROMBEL') || v.includes('{{ROMBEL') || v.includes('{ROMBEL') ||
                    v.includes('$KELAS') || v.includes('{{KELAS') || v.includes('{KELAS') ||
                    v.includes('$PERINGKAT') || v.includes('{{PERINGKAT') || v.includes('{PERINGKAT') ||
                    v.includes('$RANKING') || v.includes('{{RANKING') || v.includes('{RANKING')
                ) {
                    return true;
                }
            }
        }
    }
    return false;
};

export const resolveRaporText = (text: string, context: RaporResolveContext): string => {
    if (!text) return '';
    const { santri, settings, record } = context;
    let res = text;

    // Normalisasi tag format {{nama}}, {nama}, [nama] dsb ke $TAG untuk fleksibilitas maksimal dari Excel
    const normalizeTagWord = (word: string): string => {
        const u = word.trim().toUpperCase().replace(/[\s-]+/g, '_');
        if (u === 'NAMA' || u === 'NAMA_SANTRI' || u === 'NAMASANTRI') return '$NAMA';
        if (u === 'NAMA_LENGKAP' || u === 'NAMALENGKAP') return '$NAMA_LENGKAP';
        if (u === 'NIS') return '$NIS';
        if (u === 'NISN') return '$NISN';
        if (u === 'ROMBEL') return '$ROMBEL';
        if (u === 'KELAS') return '$KELAS';
        if (u === 'JENJANG' || u === 'MARHALAH') return '$JENJANG';
        if (u === 'PERINGKAT' || u === 'RANKING' || u === 'JUARA') return '$PERINGKAT';
        if (u === 'TOTAL_NILAI' || u === 'TOTAL' || u === 'JUMLAH' || u === 'TOTALNILAI') return '$TOTAL_NILAI';
        if (u === 'RATA_RATA' || u === 'RATA' || u === 'RATARATA' || u === 'RATA2') return '$RATA_RATA';
        if (u === 'PREDIKAT') return '$PREDIKAT_RATA_RATA';
        if (u === 'WALI_KELAS' || u === 'NAMA_WALI_KELAS' || u === 'WALIKELAS') return '$NAMA_WALI_KELAS';
        if (u === 'MUDIR' || u === 'PIMPINAN' || u === 'KEPALA_SEKOLAH' || u === 'KEPALASEKOLAH') return '$NAMA_MUDIR';
        if (u === 'TANGGAL_RAPOR' || u === 'TANGGAL' || u === 'TANGGALRAPOR') return '$TANGGAL_DOKUMEN';
        if (u === 'TEMPAT_RAPOR' || u === 'KOTA' || u === 'TEMPATRAPOR') return '$TEMPAT_RAPOR';
        if (u === 'SEMESTER' || u === 'SEMESTER_AKTIF') return '$SEMESTER';
        if (
            u === 'TAHUN_AJAR' ||
            u === 'TAHUN_AJARAN' ||
            u === 'TAHUNAJAR' ||
            u === 'TAHUNAJARAN' ||
            u === 'TAPEL' ||
            u === 'TAHUN_PELAJARAN' ||
            u === 'TAHUN_AJAR_AKTIF' ||
            u === 'TAHUN_AJARAN_AKTIF'
        ) {
            return '$TAHUN_AJARAN';
        }
        if (u === 'TAHUN_AJAR_HIJRIAH' || u === 'TAHUN_AJARAN_HIJRIAH' || u === 'TAHUN_HIJRIYAH') {
            return '$TAHUN_AJAR_HIJRIAH';
        }
        if (u === 'TAHUN_AJAR_LENGKAP' || u === 'TAHUN_AJARAN_LENGKAP') {
            return '$TAHUN_AJAR_LENGKAP';
        }
        if (u === 'CATATAN_WALI' || u === 'CATATAN' || u === 'CATATANWALIKELAS' || u === 'CATATAN_WALI_KELAS') return '$CATATAN_WALI_KELAS';
        return `$${u}`;
    };

    // Replace {{tag}}
    res = res.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, p1) => normalizeTagWord(p1));
    // Replace {tag} (single curly)
    res = res.replace(/\{([a-zA-Z0-9_]+)\}/g, (_match, p1) => normalizeTagWord(p1));
    // Replace [tag] (square brackets)
    res = res.replace(/\[([a-zA-Z0-9_]+)\]/g, (_match, p1) => normalizeTagWord(p1));
    // Replace $tag (mendukung penulisan $Jenjang, $jenjang, $tahunajar, dsb. secara case-insensitive)
    res = res.replace(/\$([a-zA-Z0-9_]+)/g, (_match, p1) => normalizeTagWord(p1));

    const tokenMap = new Map<string, string>();
    const setToken = (key: string, val: string) => {
        tokenMap.set(key.startsWith('$') ? key.toUpperCase() : `$${key.toUpperCase()}`, val);
    };

    // Santri Data
    if (santri) {
        setToken('$NAMA_LENGKAP', santri.namaLengkap);
        setToken('$NAMA', santri.namaLengkap);
        setToken('$NAMA_HIJRAH', santri.namaHijrah || santri.namaLengkap);
        setToken('$NISN', santri.nisn || '-');
        setToken('$NIS', santri.nis);
        setToken('$NIK', santri.nik || '-');
        setToken('$TEMPAT_LAHIR', santri.tempatLahir || '-');
        setToken('$TANGGAL_LAHIR', santri.tanggalLahir ? formatDate(santri.tanggalLahir) : '-');
        setToken('$TTL', `${santri.tempatLahir || '-'}, ${santri.tanggalLahir ? formatDate(santri.tanggalLahir) : '-'}`);
        setToken('$JENIS_KELAMIN', santri.jenisKelamin || '-');
        const alamatStr = santri.alamat ? `${santri.alamat.detail || ''} ${santri.alamat.desaKelurahan || ''} ${santri.alamat.kecamatan || ''} ${santri.alamat.kabupatenKota || ''} ${santri.alamat.provinsi || ''}`.trim() : '-';
        setToken('$ALAMAT_SANTRI', alamatStr || '-');

        // Orang Tua / Wali
        setToken('$NAMA_AYAH', santri.namaAyah || '-');
        setToken('$NAMA_IBU', santri.namaIbu || '-');
        setToken('$NAMA_WALI', santri.namaWali || santri.namaAyah || santri.namaIbu || '-');
        setToken('$TELEPON_ORTU', santri.teleponAyah || santri.teleponIbu || santri.teleponWali || '-');
        setToken('$PEKERJAAN_AYAH', santri.pekerjaanAyah || '-');
        setToken('$PEKERJAAN_IBU', santri.pekerjaanIbu || '-');

        // Tahfizh Data
        setToken('$TARGET_JUZ', santri.targetJuz ? `${santri.targetJuz} Juz` : '-');
    }

    // Settings & Academic
    if (settings) {
        if (santri) {
            const jenjang = settings.jenjang.find(j => j.id === santri.jenjangId);
            const kelas = settings.kelas.find(k => k.id === santri.kelasId);
            const rombel = settings.rombel.find(r => r.id === santri.rombelId);
            const halaqah = (settings.kelompokHalaqah || []).find(h => h.id === santri.halaqahId);
            setToken('$JENJANG', jenjang?.nama || '');
            setToken('$MARHALAH', jenjang?.nama || '');
            setToken('$KELAS', kelas?.nama || '');
            setToken('$ROMBEL', rombel?.nama || '');
            setToken('$HALAQAH', halaqah?.nama || '-');

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
            setToken('$NAMA_WALI_KELAS', waliName);
            setToken('$NIP_WALI_KELAS', waliNip);
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
        setToken('$NAMA_MUDIR', mudirName);
        setToken('$NAMA_PIMPINAN', mudirName);
        setToken('$NAMA_KEPALA_SEKOLAH', mudirName);
        setToken('$NIP_MUDIR', mudirNip);

        // Identitas Lembaga
        setToken('$NAMA_PONPES', settings.namaPonpes || '');
        setToken('$NAMA_YAYASAN', settings.namaYayasan || '');
        setToken('$NSPP', settings.nspp || '-');
        setToken('$NPSN', settings.npsn || '-');
        setToken('$ALAMAT_PONPES', settings.alamat || '');
        setToken('$TELEPON_PONPES', settings.telepon || '-');
        setToken('$EMAIL_PONPES', settings.email || '-');
        setToken('$WEBSITE_PONPES', settings.website || '-');

        if (Array.isArray(settings.customInfoFields)) {
            settings.customInfoFields.forEach((field) => {
                if (field && field.label) {
                    const cleanKey = field.label.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
                    if (cleanKey) {
                        setToken(`$${cleanKey}`, field.value || '-');
                    }
                }
            });
        }
    }

    // Period / Record (terhubung langsung ke Tahun Ajaran Aktif di Data Master settings.academicYears)
    const academicYears = getAcademicYearsFromSettings(settings);
    const activeYearCfg = academicYears.find(y => y.isActive) || academicYears[0];
    const legacyTahunAktif = (settings as any)?.tahunAjaranAktif;
    const legacySemesterAktif = (settings as any)?.semesterAktif;

    const tahunAjarAktif = (
        context.tahunAjaran?.trim() ||
        record?.tahunAjaran?.trim() ||
        activeYearCfg?.labelMasehi?.trim() ||
        (typeof legacyTahunAktif === 'string' ? legacyTahunAktif.trim() : '') ||
        getDefaultAcademicYear(settings) ||
        '-'
    );
    const matchedYearCfg = academicYears.find(y => y.labelMasehi?.trim() === tahunAjarAktif) || activeYearCfg;
    const rawHijriLabel = matchedYearCfg?.labelHijriah?.trim() || '';
    const tahunAjarHijriah = rawHijriLabel
        ? (/\bH$/i.test(rawHijriLabel) ? rawHijriLabel : `${rawHijriLabel} H`)
        : '-';
    const tahunAjarLengkap = (matchedYearCfg?.hijriEnabled && rawHijriLabel)
        ? `${tahunAjarHijriah} / ${tahunAjarAktif} M`
        : tahunAjarAktif;

    const sem: 'Ganjil' | 'Genap' = (
        context.semester ||
        record?.semester ||
        matchedYearCfg?.semesterAktif ||
        (legacySemesterAktif === 'Genap' ? 'Genap' : legacySemesterAktif === 'Ganjil' ? 'Ganjil' : undefined) ||
        'Ganjil'
    );

    setToken('$SEMESTER_ANGKA', sem === 'Genap' ? '2' : '1');
    setToken('$SEMESTER', sem);
    setToken('$TAHUN_AJARAN', tahunAjarAktif);
    setToken('$TAHUN_AJAR', tahunAjarAktif);
    setToken('$TAHUNAJAR', tahunAjarAktif);
    setToken('$TAHUNAJARAN', tahunAjarAktif);
    setToken('$TAHUN_PELAJARAN', tahunAjarAktif);
    setToken('$TAHUN_AJAR_HIJRIAH', tahunAjarHijriah);
    setToken('$TAHUN_AJAR_LENGKAP', tahunAjarLengkap);

    // Presensi & Catatan Wali
    let customObj: Record<string, any> = {};
    if (record?.customData) {
        try {
            customObj = JSON.parse(record.customData);
        } catch {}
    }
    const findCustomVal = (...keys: string[]) => {
        for (const k of keys) {
            if (customObj[k] !== undefined && customObj[k] !== null && String(customObj[k]).trim() !== '') {
                return customObj[k];
            }
        }
        return undefined;
    };
    const sakitVal = record?.sakit ?? (findCustomVal('SAKIT', 'sakit', 'S', 'ABSENSI_SAKIT') ?? 0);
    const izinVal = record?.izin ?? (findCustomVal('IZIN', 'izin', 'I', 'ABSENSI_IZIN') ?? 0);
    const alphaVal = record?.alpha ?? (findCustomVal('ALPHA', 'alpha', 'ALPA', 'alpa', 'A', 'ABSENSI_ALPHA') ?? 0);
    const totalAbsen = Number(sakitVal || 0) + Number(izinVal || 0) + Number(alphaVal || 0);
    const catatanWali = record?.catatanWaliKelas || findCustomVal('CATATAN_WALI_KELAS', 'catatanWaliKelas', 'CATATAN_WALI', 'catatan_wali') || '-';
    const keputusanVal = record?.keputusan || findCustomVal('KEPUTUSAN', 'keputusan') || '-';

    setToken('$SAKIT', String(sakitVal));
    setToken('$IZIN', String(izinVal));
    setToken('$ALPHA', String(alphaVal));
    setToken('$TOTAL_ABSEN', String(totalAbsen));
    setToken('$CATATAN_WALI_KELAS', String(catatanWali));
    setToken('$CATATAN_WALI', String(catatanWali));
    setToken('$KEPUTUSAN', String(keputusanVal));

    // Tahfizh Dynamic Tags (dari record tahfizhGanjil/Genap atau customData hasil Tarik Tahfizh)
    const tahfizhSem = sem === 'Genap' ? record?.tahfizhGenap : record?.tahfizhGanjil;
    const capaianTahfizhVal = findCustomVal('CAPAIAN_TAHFIZH', 'TAHFIZH_CAPAIAN', 'HAFALAN_TERAKHIR')
        || (tahfizhSem?.lastSurah ? `Juz ${tahfizhSem.lastJuz || '-'}, QS. ${tahfizhSem.lastSurah}` : '-');
    const totalSetoranVal = findCustomVal('TOTAL_SETORAN_TAHFIZH', 'TOTAL_SETORAN', 'JUMLAH_SETORAN') || '-';
    const nilaiTahfizhVal = findCustomVal('NILAI_TAHFIZH', 'TAHFIZH_NILAI', 'TAHFIZH') || '-';
    const predikatTahfizhVal = findCustomVal('PREDIKAT_TAHFIZH', 'TAHFIZH_PREDIKAT') || tahfizhSem?.averagePredikat || '-';

    setToken('$CAPAIAN_TAHFIZH', String(capaianTahfizhVal));
    setToken('$TOTAL_SETORAN_TAHFIZH', String(totalSetoranVal));
    setToken('$NILAI_TAHFIZH', String(nilaiTahfizhVal));
    setToken('$PREDIKAT_TAHFIZH', String(predikatTahfizhVal));

    // Kalkulasi & Ranking
    let totalScore = context.calculation?.totalNilai;
    let avgScore = context.calculation?.rataRata;
    let predikatStr = context.calculation?.predikat;
    const rankVal = context.calculation?.ranking;
    const totalSantriVal = context.calculation?.totalSantri;

    if (totalScore === undefined || avgScore === undefined) {
        let sum = 0;
        let count = 0;
        const nonGradeSet = new Set(['sakit', 'izin', 'alpha', 'alpa', 'total_absen', 's', 'i', 'a']);
        Object.entries(customObj).forEach(([k, val]) => {
            if (!nonGradeSet.has(k.toLowerCase()) && val !== undefined && val !== null && String(val).trim() !== '') {
                const num = Number(val);
                if (!isNaN(num) && num >= 0 && num <= 100) {
                    sum += num;
                    count += 1;
                }
            }
        });
        if (count > 0) {
            totalScore = sum;
            avgScore = Math.round((sum / count) * 100) / 100;
            if (!predikatStr) {
                if (avgScore >= 90) predikatStr = 'Mumtaz';
                else if (avgScore >= 80) predikatStr = 'Jayyid Jiddan';
                else if (avgScore >= 70) predikatStr = 'Jayyid';
                else if (avgScore >= 60) predikatStr = 'Maqbul';
                else predikatStr = 'Rasib';
            }
        }
    }

    setToken('$TOTAL_NILAI', totalScore !== undefined && totalScore > 0 ? String(totalScore) : '-');
    setToken('$RATA_RATA', avgScore !== undefined && avgScore > 0 ? avgScore.toFixed(2) : '-');
    setToken('$PREDIKAT_RATA_RATA', predikatStr || '-');
    setToken('$PERINGKAT', rankVal !== undefined && rankVal > 0 ? String(rankVal) : '-');
    setToken('$RANKING', rankVal !== undefined && rankVal > 0 ? String(rankVal) : '-');
    setToken('$TOTAL_SANTRI', totalSantriVal !== undefined && totalSantriVal > 0 ? String(totalSantriVal) : '-');

    // Kurikulum Merdeka & Deskripsi Capaian Pembelajaran (CP/TP)
    const customCpTertinggi = findCustomVal('DESKRIPSI_CAPAIAN_TERTINGGI', 'CP_TERTINGGI', 'CAPAIAN_TERTINGGI', 'DESKRIPSI_TERTINGGI');
    const customCpTerendah = findCustomVal('DESKRIPSI_CAPAIAN_TERENDAH', 'CP_TERENDAH', 'CAPAIAN_TERENDAH', 'DESKRIPSI_TERENDAH');
    const customKompetensi = findCustomVal('DESKRIPSI_KOMPETENSI', 'CAPAIAN_UMUM', 'DESKRIPSI_RAPOR');
    const customKelulusan = findCustomVal('STATUS_KELULUSAN', 'KELULUSAN', 'KENAIKAN_KELAS');

    const defaultCpTertinggi = customCpTertinggi || (
        avgScore && avgScore >= 85
            ? 'Menunjukkan penguasaan yang sangat optimal dan mandiri dalam memahami seluruh tujuan pembelajaran serta mampu mengaplikasikan materi dengan sangat baik.'
            : (avgScore && avgScore >= 75
                ? 'Menunjukkan penguasaan yang baik dalam sebagian besar kompetensi materi pokok dan mampu menyelesaikan penugasan dengan konsisten.'
                : 'Mampu memahami konsep-konsep dasar pembelajaran dengan cukup baik.')
    );

    const defaultCpTerendah = customCpTerendah || (
        avgScore && avgScore < 75
            ? 'Perlu pendampingan dan bimbingan lebih intensif dalam penguatan konsep dasar materi pembelajaran serta peningkatan disiplin belajar.'
            : (avgScore && avgScore < 85
                ? 'Perlu peningkatan ketelitian dan latihan berkelanjutan pada materi yang memerlukan analisis mendalam.'
                : 'Perlu terus mempertahankan prestasi belajar dan aktif membantu rekan dalam diskusi kelompok.')
    );

    const defaultKompetensi = customKompetensi || (
        avgScore && avgScore >= 85
            ? 'Ananda menunjukkan antusiasme, akhlak mulia, dan capaian kompetensi belajar yang luar biasa sepanjang semester ini. Pertahankan ketekunan ini.'
            : (avgScore && avgScore >= 75
                ? 'Ananda telah mencapai kriteria ketuntasan dengan baik. Diharapkan dapat terus meningkatkan semangat belajar di semester berikutnya.'
                : 'Ananda perlu lebih giat mengulang pelajaran di luar jam kelas serta meminta arahan guru pada materi yang belum dipahami.')
    );

    const defaultKelulusan = customKelulusan || (
        keputusanVal !== '-' ? keputusanVal : (avgScore && avgScore >= 70 ? 'Naik ke Tingkat Berikutnya' : 'Perlu Evaluasi Lanjutan')
    );

    setToken('$DESKRIPSI_CAPAIAN_TERTINGGI', String(defaultCpTertinggi));
    setToken('$DESKRIPSI_CAPAIAN_TERENDAH', String(defaultCpTerendah));
    setToken('$DESKRIPSI_KOMPETENSI', String(defaultKompetensi));
    setToken('$CAPAIAN_UMUM', String(defaultKompetensi));
    setToken('$STATUS_KELULUSAN', String(defaultKelulusan));

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

    setToken('$TANGGAL_MASEHI', masehiStr);
    setToken('$TANGGAL_SINGKAT_MASEHI', format(dateObj, 'dd/MM/yyyy'));
    setToken('$TAHUN_MASEHI', format(dateObj, 'yyyy'));
    setToken('$BULAN_MASEHI', format(dateObj, 'MMMM', { locale: idLocale }));

    setToken('$TANGGAL_HIJRIAH_MASEHI', hijriMasehiCombined);
    setToken('$TANGGAL_HIJRIAH', hijriFullWithH || '-');
    setToken('$TAHUN_HIJRIAH', hijriInfo.year ? `${hijriInfo.year} H` : '-');
    setToken('$BULAN_HIJRIAH', hijriInfo.month || '-');

    setToken('$TANGGAL_DOKUMEN', docFormattedDate);

    const kotaPondok = settings?.tempatRaporDefault?.trim() 
        || (settings?.alamat ? (settings.alamat.includes(',') ? settings.alamat.split(',')[0].trim() : 'Pesantren') : 'Pesantren');
    
    setToken('$TEMPAT_RAPOR', kotaPondok);
    setToken('$KOTA_PONPES', kotaPondok);
    setToken('$KOTA_TANGGAL_HIJRIAH_MASEHI', `${kotaPondok}, ${hijriMasehiCombined}`);
    setToken('$KOTA_TANGGAL_HIJRIAH', `${kotaPondok}, ${hijriFullWithH || '-'}`);
    setToken('$KOTA_TANGGAL_DOKUMEN', `${kotaPondok}, ${docFormattedDate}`);
    setToken('$KOTA_TANGGAL', `${kotaPondok}, ${masehiStr}`);

    // Substitusi seluruh variabel input kustom ($MTK, $FIQIH, $UH1, dsb.) dari customData & extraVars
    const mergedVars: Record<string, any> = {
        ...customObj,
        ...(context.extraVars || {})
    };
    for (const [rawKey, val] of Object.entries(mergedVars)) {
        if (!rawKey || val === undefined || val === null) continue;
        const upperKey = rawKey.trim().toUpperCase().replace(/[\s-]+/g, '_');
        if (!upperKey) continue;
        setToken(`$${upperKey}`, String(val));
    }

    const isFormula = isRaporFormulaExpression(res);
    const PURE_NUMBER_REGEX = /^-?(?:0|[1-9]\d*)(?:\.\d+)?$/;

    // Substitusi token $TAG dengan pemindai sadar-kutip agar nilai teks seperti "2026/2027" atau "Ust. Rizki, S.Pd."
    // tidak pernah dibagi secara matematis menjadi "1" atau terpecah komanya saat berada di dalam rumus (=...)
    let substituted = '';
    let inQuote: '"' | "'" | null = null;
    let idx = 0;
    while (idx < res.length) {
        const ch = res[idx];
        if (inQuote) {
            if (ch === inQuote && res[idx - 1] !== '\\') {
                inQuote = null;
                substituted += ch;
                idx++;
                continue;
            }
            if (ch === '$') {
                const m = res.slice(idx).match(/^\$([A-Z0-9_]+)/);
                if (m) {
                    const tok = `$${m[1]}`;
                    const found = tokenMap.get(tok);
                    if (found !== undefined) {
                        const escaped = isFormula
                            ? (inQuote === '"' ? found.replace(/\\/g, '\\\\').replace(/"/g, '\\"') : found.replace(/\\/g, '\\\\').replace(/'/g, "\\'"))
                            : found;
                        substituted += escaped;
                        idx += tok.length;
                        continue;
                    }
                }
            }
            substituted += ch;
            idx++;
            continue;
        }

        if (ch === '"' || ch === "'") {
            inQuote = ch;
            substituted += ch;
            idx++;
            continue;
        }

        if (ch === '$') {
            const m = res.slice(idx).match(/^\$([A-Z0-9_]+)/);
            if (m) {
                const tok = `$${m[1]}`;
                const found = tokenMap.get(tok);
                if (found !== undefined) {
                    if (isFormula && !PURE_NUMBER_REGEX.test(found.trim())) {
                        const escaped = found.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
                        substituted += `"${escaped}"`;
                    } else {
                        substituted += found;
                    }
                    idx += tok.length;
                    continue;
                }
            }
        }

        substituted += ch;
        idx++;
    }

    // Evaluasi seluruh rumus sel rapor (=SUM, =RATA2, =IF, =PREDIKAT, =TERBILANG, =ARAB, =UPPER, =LOWER, =PROPER, =TAHUN_AJAR, =SEMESTER, &)
    return evaluateRaporFormula(substituted, {
        rank: rankVal,
        tahunAjaran: tahunAjarAktif,
        tahunAjaranHijriah: tahunAjarHijriah,
        semester: sem
    });
};
