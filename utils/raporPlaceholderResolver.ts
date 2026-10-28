import React from 'react';
import { Santri, PondokSettings, RaporRecord, DigitalAsset, GridCell, RaporTemplate, TenagaPengajar, Rombel, Jenjang, Kelas } from '../types';
import {
    formatDate,
    getHijriDate,
    formatTanggalDokumen,
    parseLocalDateSafe,
    formatGregorianArabic,
    ensureHijriSuffix,
    resolveTempatRapor
} from './formatters';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { findStrictTeacherTtdAsset } from './digitalAssetUtils';
import {
    evaluateRaporFormula,
    isRaporFormulaExpression,
    parseExcelCellCoord,
    parseExcelRangeCoord,
    splitTopLevelArgs,
    normalizeSubjectKeyForAvg,
    formatCellNumericDisplay
} from './raporFormulaUtils';
import { resolveAcademicYearLabels } from './academicYear';

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
            { tag: '$TAHUN_AJAR', label: 'Tahun Ajaran (Sesuai Master)', description: 'Otomatis Masehi, atau Gabungan bila tampilan Hijriah aktif di Data Master', example: '2026/2027' },
            { tag: '$TAHUN_AJAR_MASEHI', label: 'Tahun Ajaran Masehi', description: 'Khusus tahun ajaran Masehi aktif', example: '2026/2027' },
            { tag: '$TAHUN_AJAR_HIJRIAH', label: 'Tahun Ajaran Hijriah', description: 'Khusus tahun ajaran Hijriah (dari Data Master atau otomatis terkonversi)', example: '1448/1449 H' },
            { tag: '$TAHUN_AJAR_GABUNGAN', label: 'Tahun Ajaran Hijriah & Masehi', description: 'Gabungan Tahun Ajaran Hijriah dan Masehi', example: '1448/1449 H / 2026/2027 M' },
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
            { tag: '$RATA_RATA_KELAS', label: 'Rata-Rata Umum Kelas', description: 'Rata-rata nilai gabungan seluruh santri di rombel', example: '83.45' },
            { tag: '$PREDIKAT_RATA_RATA', label: 'Predikat Rata-Rata', description: 'Predikat hasil belajar (Mumtaz/Jayyid Jiddan/dll)', example: 'Jayyid Jiddan' },
            { tag: '$PERINGKAT', label: 'Peringkat / Ranking Rombel', description: 'Peringkat santri di rombel', example: '3' },
            { tag: '$RANKING', label: 'Ranking Kelas (Alias)', description: 'Peringkat santri di rombel', example: '3' },
            { tag: '$PERINGKAT_KELAS', label: 'Peringkat Paralel Tingkat Kelas', description: 'Peringkat gabungan seluruh rombel se-tingkat kelas', example: '5' },
            { tag: '$PERINGKAT_JENJANG', label: 'Peringkat Paralel Marhalah', description: 'Peringkat gabungan seluruh kelas di marhalah/jenjang', example: '12' },
            { tag: '$TOTAL_SANTRI', label: 'Jumlah Santri di Rombel', description: 'Total santri dalam satu rombel', example: '32' },
            { tag: '$TOTAL_SANTRI_KELAS', label: 'Jumlah Santri Se-Tingkat Kelas', description: 'Total santri gabungan rombel paralel di tingkat kelas', example: '96' },
            { tag: '$TOTAL_SANTRI_JENJANG', label: 'Jumlah Santri Se-Marhalah', description: 'Total santri gabungan di marhalah/jenjang', example: '280' },
        ]
    },
    {
        id: 'pejabat',
        title: 'Wali Kelas & Pimpinan',
        icon: 'bi-person-check-fill',
        color: 'text-purple-600 bg-purple-50 border-purple-200',
        tags: [
            { tag: '$NAMA_WALI_KELAS', label: 'Nama Wali Kelas', description: 'Nama ustadz/ustadzah wali kelas rombel santri', example: 'Ust. Muhammad Rizki, S.Pd.' },
            { tag: '$NIP_WALI_KELAS', label: 'NIP / NIY Wali Kelas', description: 'Nomor induk kepegawaian wali kelas', example: '198501012010011002' },
            { tag: '$NAMA_MUDIR_MARHALAH', label: 'Nama Mudir Marhalah', description: 'Nama Mudir Marhalah / Kepala Jenjang santri', example: 'Ust. H. Abdul Hakim, Lc., M.A.' },
            { tag: '$NIP_MUDIR_MARHALAH', label: 'NIP / NIY Mudir Marhalah', description: 'Nomor induk kepegawaian Mudir Marhalah', example: '197805122005011003' },
            { tag: '$NAMA_MUDIR', label: 'Nama Mudir Aam / Pimpinan', description: 'Nama Pimpinan Pondok / Mudir Aam', example: 'K.H. Ahmad Dahlan, Lc.' },
            { tag: '$NIP_MUDIR', label: 'NIP / NIY Mudir Aam', description: 'Nomor induk pimpinan pondok', example: '197001011995031001' },
            { tag: '$NAMA_KEPALA_SEKOLAH', label: 'Nama Kepala Madrasah', description: 'Alias nama kepala madrasah / pimpinan', example: 'Ust. Ahmad Dahlan, M.Pd.' },
        ]
    },
    {
        id: 'tanggal',
        title: 'Titimangsa & Tanggal Rapor',
        icon: 'bi-calendar3',
        color: 'text-amber-600 bg-amber-50 border-amber-200',
        tags: [
            { tag: '$TITIMANGSA', label: 'Titimangsa Rapor (Sesuai Cetak)', description: 'Tempat & tanggal otomatis mengikuti format di Cetak Rapor', example: 'Banyumas, 20 Juni 2026' },
            { tag: '$TITIMANGSA_GABUNGAN', label: 'Titimangsa Hijriah & Masehi', description: 'Tempat & tanggal gabungan Hijriah dan Masehi', example: 'Banyumas, 5 Muharram 1448 H / 20 Juni 2026 M' },
            { tag: '$TITIMANGSA_MASEHI', label: 'Titimangsa Masehi Saja', description: 'Tempat & tanggal khusus Masehi', example: 'Banyumas, 20 Juni 2026' },
            { tag: '$TITIMANGSA_HIJRIAH', label: 'Titimangsa Hijriah Saja', description: 'Tempat & tanggal khusus Hijriah', example: 'Banyumas, 5 Muharram 1448 H' },
            { tag: '$TEMPAT_RAPOR', label: 'Tempat / Kota Rapor Saja', description: 'Nama kota/tempat pengeluaran rapor saja', example: 'Banyumas' },
            { tag: '$TANGGAL_RAPOR', label: 'Tanggal Rapor Saja (Sesuai Cetak)', description: 'Tanggal saja sesuai format Masehi/Hijriah/Gabungan di Cetak Rapor', example: '20 Juni 2026' },
            { tag: '$TANGGAL_RAPOR_GABUNGAN', label: 'Tanggal Gabungan Hijriah & Masehi', description: 'Tanggal Hijriah & Masehi tanpa nama kota', example: '5 Muharram 1448 H / 20 Juni 2026 M' },
            { tag: '$TANGGAL_RAPOR_MASEHI', label: 'Tanggal Rapor Masehi Saja', description: 'Tanggal Masehi lengkap tanpa nama kota', example: '20 Juni 2026' },
            { tag: '$TANGGAL_RAPOR_HIJRIAH', label: 'Tanggal Rapor Hijriah Saja', description: 'Tanggal Hijriah lengkap tanpa nama kota', example: '5 Muharram 1448 H' },
            { tag: '$TANGGAL_SINGKAT_MASEHI', label: 'Tanggal Singkat (DD/MM/YYYY)', description: 'Format numerik Masehi', example: '20/06/2026' },
            { tag: '$TAHUN_MASEHI', label: 'Tahun Masehi', description: '4 digit tahun Masehi', example: '2026' },
            { tag: '$BULAN_MASEHI', label: 'Nama Bulan Masehi', description: 'Nama bulan Masehi', example: 'Juni' },
            { tag: '$TAHUN_HIJRIAH', label: 'Tahun Hijriah', description: 'Tahun Hijriah', example: '1448 H' },
            { tag: '$BULAN_HIJRIAH', label: 'Bulan Hijriah', description: 'Nama bulan Hijriah', example: 'Muharram' },
            { tag: '$KOTA_TANGGAL_DOKUMEN', label: 'Kota & Tanggal (Alias)', description: 'Alias $TITIMANGSA (sesuai pengaturan cetak)', example: 'Banyumas, 20 Juni 2026' },
            { tag: '$KOTA_TANGGAL_HIJRIAH_MASEHI', label: 'Kota & Tanggal Hijriah/Masehi (Alias)', description: 'Alias $TITIMANGSA_GABUNGAN', example: 'Banyumas, 5 Muharram 1448 H / 20 Juni 2026 M' },
            { tag: '$KOTA_TANGGAL', label: 'Kota & Tanggal Masehi (Alias)', description: 'Alias $TITIMANGSA_MASEHI', example: 'Banyumas, 20 Juni 2026' },
            { tag: '$KOTA_TANGGAL_HIJRIAH', label: 'Kota & Tanggal Hijriah (Alias)', description: 'Alias $TITIMANGSA_HIJRIAH', example: 'Banyumas, 5 Muharram 1448 H' },
            { tag: '$TANGGAL_DOKUMEN', label: 'Tanggal Dokumen (Alias)', description: 'Alias $TANGGAL_RAPOR', example: '20 Juni 2026' },
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
            { tag: '$KOP_SURAT', label: 'Kop Dokumen / Rapor', description: 'Gambar header kop lembaga dari Aset Digital', example: '[Gambar Kop]', isMedia: true },
            { tag: '$TTD_WALI_KELAS', label: 'Tanda Tangan Wali Kelas', description: 'TTD wali kelas sesuai rombel santri (kosong otomatis jika belum ada)', example: '[TTD Wali Kelas]', isMedia: true },
            { tag: '$TTD_MUDIR_MARHALAH', label: 'Tanda Tangan Mudir Marhalah', description: 'TTD Mudir Marhalah sesuai jenjang santri (kosong otomatis jika belum ada)', example: '[TTD Mudir Marhalah]', isMedia: true },
            { tag: '$TTD_MUDIR', label: 'Tanda Tangan Mudir Aam / Pimpinan', description: 'TTD Mudir Aam / Pimpinan Pondok (kosong otomatis jika belum ada)', example: '[TTD Mudir]', isMedia: true },
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
        rankingKelas?: number;
        rankingJenjang?: number;
        rankingGlobal?: number;
        totalSantri?: number;
        totalSantriKelas?: number;
        totalSantriJenjang?: number;
        predikat?: string;
        classAverages?: Record<string, number>;
        classOverallAverage?: number;
        isSimulated?: boolean;
    };
    cohortRecords?: RaporRecord[];
    evaluatingClassAvg?: boolean;
    extraVars?: Record<string, any>;
    tahunAjaran?: string;
    semester?: 'Ganjil' | 'Genap';
    sheetCells?: GridCell[][];
    currentCellCoord?: { r: number; c: number };
    evaluatingCells?: Set<string>;
    decimalPlaces?: number;
}

export const formatTeacherNip = (teacher?: TenagaPengajar | null): string => {
    if (!teacher) return '-';
    return teacher.nip?.trim() || teacher.kodeGuru?.trim() || '-';
};

export const resolveSantriAcademicHierarchy = (
    santri?: Santri | null,
    settings?: PondokSettings | null
): { rombel?: Rombel; kelas?: Kelas; jenjang?: Jenjang } => {
    if (!settings) return {};
    const rombel = santri?.rombelId !== undefined && santri?.rombelId !== null
        ? settings.rombel.find(r => Number(r.id) === Number(santri.rombelId))
        : undefined;
    const targetKelasId = santri?.kelasId || rombel?.kelasId;
    const kelas = targetKelasId !== undefined && targetKelasId !== null
        ? settings.kelas.find(k => Number(k.id) === Number(targetKelasId))
        : undefined;
    const targetJenjangId = santri?.jenjangId || kelas?.jenjangId;
    const jenjang = targetJenjangId !== undefined && targetJenjangId !== null
        ? settings.jenjang.find(j => Number(j.id) === Number(targetJenjangId))
        : undefined;
    return { rombel, kelas, jenjang };
};

export const resolveWaliKelasTeacher = (
    rombel?: Rombel | null,
    settings?: PondokSettings | null
): TenagaPengajar | undefined => {
    if (!rombel || !settings?.tenagaPengajar) return undefined;

    // 1. Utama: rombel.waliKelasId (ID TenagaPengajar dari Data Master > Struktur Pendidikan / Tenaga Pendidik)
    if (rombel.waliKelasId !== undefined && rombel.waliKelasId !== null) {
        const direct = settings.tenagaPengajar.find(tp => Number(tp.id) === Number(rombel.waliKelasId));
        if (direct) return direct;
    }

    // 2. Fallback: riwayatJabatan aktif "Wali Kelas" untuk rombel terkait
    const fromRiwayat = settings.tenagaPengajar.find(tp =>
        Array.isArray(tp.riwayatJabatan) &&
        tp.riwayatJabatan.some(rj =>
            !rj.tanggalSelesai &&
            (rj.jabatan || '').toLowerCase().includes('wali kelas') &&
            rj.rombelId !== undefined &&
            Number(rj.rombelId) === Number(rombel.id)
        )
    );
    if (fromRiwayat) return fromRiwayat;

    // 3. Fallback lama: waliKelasUserId jika kebetulan disamakan dengan ID pengajar
    if (rombel.waliKelasUserId !== undefined && rombel.waliKelasUserId !== null) {
        return settings.tenagaPengajar.find(tp => Number(tp.id) === Number(rombel.waliKelasUserId));
    }

    return undefined;
};

export const resolveMudirMarhalahTeacher = (
    jenjang?: Jenjang | null,
    settings?: PondokSettings | null
): TenagaPengajar | undefined => {
    if (!settings?.tenagaPengajar) return undefined;

    // 1. Utama: jenjang.mudirId (Mudir Marhalah pada Data Master > Struktur Pendidikan)
    if (jenjang?.mudirId !== undefined && jenjang?.mudirId !== null) {
        const direct = settings.tenagaPengajar.find(tp => Number(tp.id) === Number(jenjang.mudirId));
        if (direct) return direct;
    }

    // 2. Fallback: riwayatJabatan aktif "Mudir Marhalah" / "Kepala Marhalah"
    const jenjangNameLower = (jenjang?.nama || '').trim().toLowerCase();
    if (jenjangNameLower) {
        const matchedWithKet = settings.tenagaPengajar.find(tp =>
            Array.isArray(tp.riwayatJabatan) &&
            tp.riwayatJabatan.some(rj => {
                if (rj.tanggalSelesai) return false;
                const jbt = (rj.jabatan || '').toLowerCase();
                const ket = (rj.keterangan || '').toLowerCase();
                return (jbt.includes('mudir marhalah') || jbt.includes('kepala marhalah') || jbt.includes('kepala jenjang')) &&
                    ket.includes(jenjangNameLower);
            })
        );
        if (matchedWithKet) return matchedWithKet;
    }

    // 3. Fallback umum hanya jika jenjang belum ditentukan ATAU hanya ada 1 jenjang di pondok
    //    DAN pengajar tersebut tidak sedang menjadi Mudir di jenjang lain
    const otherJenjangMudirIds = new Set(
        (settings.jenjang || [])
            .filter(j => (!jenjang || Number(j.id) !== Number(jenjang.id)) && j.mudirId !== undefined && j.mudirId !== null)
            .map(j => Number(j.mudirId))
    );

    if (!jenjang || (settings.jenjang || []).length <= 1) {
        return settings.tenagaPengajar.find(tp =>
            !otherJenjangMudirIds.has(Number(tp.id)) &&
            Array.isArray(tp.riwayatJabatan) &&
            tp.riwayatJabatan.some(rj => {
                if (rj.tanggalSelesai) return false;
                const jbt = (rj.jabatan || '').toLowerCase();
                return jbt.includes('mudir marhalah') || jbt.includes('kepala marhalah');
            })
        );
    }

    return undefined;
};

export const resolveMudirAamInfo = (
    settings?: PondokSettings | null
): { teacher?: TenagaPengajar; nama: string; nip: string } => {
    if (!settings) {
        return { nama: 'K.H. Pimpinan Pesantren', nip: '-' };
    }
    if (settings.mudirAamId !== undefined && settings.mudirAamId !== null) {
        const mudir = settings.tenagaPengajar?.find(tp => Number(tp.id) === Number(settings.mudirAamId));
        if (mudir) {
            return {
                teacher: mudir,
                nama: mudir.nama,
                nip: formatTeacherNip(mudir)
            };
        }
    }
    if (settings.namaMudir && settings.namaMudir.trim() !== '') {
        const matchedByName = settings.tenagaPengajar?.find(
            tp => tp.nama.trim().toLowerCase() === settings.namaMudir!.trim().toLowerCase()
        );
        return {
            teacher: matchedByName,
            nama: settings.namaMudir.trim(),
            nip: formatTeacherNip(matchedByName)
        };
    }
    return { nama: 'K.H. Pimpinan Pesantren', nip: '-' };
};

const normalizeMediaTag = (raw: string): string => {
    const trimmed = (raw || '').trim();
    if (!trimmed) return '';
    // Pertahankan case ID aset untuk $ASSET_<id>
    if (/^\$ASSET_/i.test(trimmed)) {
        return `$ASSET_${trimmed.slice(7)}`;
    }
    const u = trimmed.replace(/^\{+|\}+$/g, '').replace(/^\[+|\]+$/g, '').replace(/^\$/, '').trim().toUpperCase().replace(/[\s-]+/g, '_');
    if (u === 'LOGO_PONPES' || u === 'LOGO') return '$LOGO_PONPES';
    if (u === 'LOGO_YAYASAN') return '$LOGO_YAYASAN';
    if (u === 'STEMPEL_PONPES' || u === 'STEMPEL') return '$STEMPEL_PONPES';
    if (u === 'KOP_SURAT' || u === 'KOP_PONPES' || u === 'KOP') return '$KOP_SURAT';
    if (u === 'TTD_WALI_KELAS' || u === 'TTD_WALIKELAS' || u === 'TTD_WALI') return '$TTD_WALI_KELAS';
    if (u === 'TTD_MUDIR_MARHALAH' || u === 'TTD_MUDIRMARHALAH' || u === 'TTD_KEPALA_MARHALAH' || u === 'TTD_MUDIR_JENJANG' || u === 'TTD_KEPALA_JENJANG') {
        return '$TTD_MUDIR_MARHALAH';
    }
    if (u === 'TTD_MUDIR' || u === 'TTD_MUDIR_AAM' || u === 'TTD_PIMPINAN' || u === 'TTD_KEPALA_SEKOLAH' || u === 'TTD_KEPALA_MADRASAH') {
        return '$TTD_MUDIR';
    }
    return trimmed.startsWith('$') ? `$${u}` : '';
};

export const isMediaTag = (value: string): boolean => {
    if (!value) return false;
    const v = normalizeMediaTag(value);
    if (!v) return false;
    return v === '$LOGO_PONPES' ||
           v === '$LOGO_YAYASAN' ||
           v === '$STEMPEL_PONPES' ||
           v === '$KOP_SURAT' ||
           v === '$TTD_WALI_KELAS' ||
           v === '$TTD_MUDIR_MARHALAH' ||
           v === '$TTD_MUDIR' ||
           v.startsWith('$TTD_PENGAJAR') ||
           v.startsWith('$STEMPEL_') ||
           v.startsWith('$ASSET_');
};

export const getMediaTagImageSrc = (tag: string, context: RaporResolveContext): string | null => {
    const { settings, santri, digitalAssets = [] } = context;
    const t = normalizeMediaTag(tag);
    if (!t) return null;

    if (t === '$LOGO_PONPES') {
        if (settings?.logoPonpesUrl) return settings.logoPonpesUrl;
        const logoAsset = digitalAssets.find(a => a.systemRole === 'logo_ponpes' || a.id === 'aset_utama_logo_ponpes');
        return logoAsset?.base64Image || null;
    }
    if (t === '$LOGO_YAYASAN') {
        if (settings?.logoYayasanUrl) return settings.logoYayasanUrl;
        const logoAsset = digitalAssets.find(a => a.systemRole === 'logo_yayasan' || a.id === 'aset_utama_logo_yayasan');
        return logoAsset?.base64Image || null;
    }
    if (t === '$STEMPEL_PONPES') {
        if (settings?.stempelPonpesUrl) return settings.stempelPonpesUrl;
        const primaryStempel = digitalAssets.find(a => a.systemRole === 'stempel_ponpes' || a.id === 'aset_utama_stempel_ponpes');
        if (primaryStempel?.base64Image) return primaryStempel.base64Image;
        const stempelAsset = digitalAssets.find(a => a.type === 'stempel');
        return stempelAsset?.base64Image || null;
    }
    if (t === '$KOP_SURAT') {
        const kopAsset = digitalAssets.find(a => a.type === 'kop');
        return kopAsset?.base64Image || null;
    }
    if (t === '$TTD_WALI_KELAS') {
        if (!settings) return null;
        const { rombel } = resolveSantriAcademicHierarchy(santri, settings);
        const targetRombel = rombel || (!santri ? settings.rombel?.[0] : undefined);
        const teacher = resolveWaliKelasTeacher(targetRombel, settings);
        // Jika rombel belum punya wali kelas ATAU wali kelas tersebut belum punya TTD digital,
        // biarkan KOSONG (null) untuk tanda tangan basah — JANGAN PERNAH mengambil TTD pejabat lain!
        if (!teacher) return null;
        const teacherAsset = findStrictTeacherTtdAsset(digitalAssets, teacher);
        return teacherAsset?.base64Image || null;
    }
    if (t === '$TTD_MUDIR_MARHALAH') {
        if (!settings) return null;
        const { jenjang } = resolveSantriAcademicHierarchy(santri, settings);
        const targetJenjang = jenjang || (!santri ? settings.jenjang?.[0] : undefined);
        const mudirMarhalah = resolveMudirMarhalahTeacher(targetJenjang, settings);
        // Jika jenjang belum punya Mudir Marhalah ATAU Mudir Marhalah tersebut belum punya TTD,
        // biarkan KOSONG (null) — jangan mengambil TTD Mudir Aam atau Mudir Marhalah lain!
        if (!mudirMarhalah) return null;
        const mmAsset = findStrictTeacherTtdAsset(digitalAssets, mudirMarhalah);
        return mmAsset?.base64Image || null;
    }
    if (t === '$TTD_MUDIR') {
        if (!settings) return null;
        const mudirInfo = resolveMudirAamInfo(settings);
        if (mudirInfo.teacher) {
            const mudirAsset = findStrictTeacherTtdAsset(digitalAssets, mudirInfo.teacher);
            return mudirAsset?.base64Image || null;
        }
        if (settings.namaMudir && settings.namaMudir.trim() !== '') {
            const manualMudirAsset = findStrictTeacherTtdAsset(digitalAssets, { nama: settings.namaMudir });
            return manualMudirAsset?.base64Image || null;
        }
        return null;
    }
    if (t.startsWith('$TTD_PENGAJAR')) {
        // e.g. $TTD_PENGAJAR:12 or $TTD_PENGAJAR_12
        const match = tag.trim().match(/[:_](\d+)/);
        if (match && settings) {
            const teacherId = parseInt(match[1], 10);
            const teacher = settings.tenagaPengajar.find(tp => Number(tp.id) === teacherId);
            if (!teacher) return null;
            const teacherAsset = findStrictTeacherTtdAsset(digitalAssets, teacher);
            return teacherAsset?.base64Image || null;
        }
        return null;
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

    // Parse customData lebih awal agar semua $KEY milik pengguna (baik di lembar aktif, lintas lembar, maupun customData) tidak tertimpa alias sistem umum
    let customObj: Record<string, any> = {};
    if (record?.customData) {
        try {
            customObj = typeof record.customData === 'string' ? JSON.parse(record.customData) : record.customData;
        } catch {
            customObj = {};
        }
    }

    const sheetCells = context.sheetCells;
    const sheetRowCount = sheetCells?.length || 0;
    const sheetColCount = sheetCells?.[0]?.length || 0;
    const definedSheetKeys = new Set<string>();
    const userDefinedUpperKeys = new Set<string>();
    if (sheetCells) {
        for (let r = 0; r < sheetRowCount; r++) {
            const row = sheetCells[r] || [];
            for (let c = 0; c < row.length; c++) {
                const cell = row[c];
                if (cell && !cell.hidden && cell.key) {
                    const uk = cell.key.trim().toUpperCase().replace(/[\s-]+/g, '_');
                    if (uk) {
                        definedSheetKeys.add(`$${uk}`);
                        userDefinedUpperKeys.add(uk);
                    }
                }
            }
        }
    }
    for (const rawK of [...Object.keys(customObj || {}), ...Object.keys(context.extraVars || {})]) {
        const uk = rawK.trim().toUpperCase().replace(/[\s-]+/g, '_');
        if (uk) userDefinedUpperKeys.add(uk);
    }

    // Normalisasi tag format {{nama}}, {nama}, [nama] dsb ke $TAG untuk fleksibilitas maksimal dari Excel
    const normalizeTagWord = (word: string): string => {
        const u = word.trim().toUpperCase().replace(/[\s-]+/g, '_');
        if (userDefinedUpperKeys.has(u)) return `$${u}`;
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
        if (u === 'WALI_KELAS' || u === 'NAMA_WALI_KELAS' || u === 'WALIKELAS' || u === 'NAMAWALIKELAS') return '$NAMA_WALI_KELAS';
        if (u === 'NIP_WALI_KELAS' || u === 'NIY_WALI_KELAS' || u === 'NIP_WALIKELAS' || u === 'NIY_WALIKELAS') return '$NIP_WALI_KELAS';
        if (u === 'TTD_WALI_KELAS' || u === 'TTD_WALIKELAS' || u === 'TTD_WALI') return '$TTD_WALI_KELAS';
        if (
            u === 'MUDIR_MARHALAH' ||
            u === 'NAMA_MUDIR_MARHALAH' ||
            u === 'MUDIRMARHALAH' ||
            u === 'NAMAMUDIRMARHALAH' ||
            u === 'KEPALA_MARHALAH' ||
            u === 'NAMA_KEPALA_MARHALAH' ||
            u === 'MUDIR_JENJANG' ||
            u === 'NAMA_MUDIR_JENJANG' ||
            u === 'KEPALA_JENJANG' ||
            u === 'NAMA_KEPALA_JENJANG'
        ) {
            return '$NAMA_MUDIR_MARHALAH';
        }
        if (
            u === 'NIP_MUDIR_MARHALAH' ||
            u === 'NIY_MUDIR_MARHALAH' ||
            u === 'NIP_MUDIRMARHALAH' ||
            u === 'NIP_KEPALA_MARHALAH' ||
            u === 'NIY_KEPALA_MARHALAH' ||
            u === 'NIP_MUDIR_JENJANG' ||
            u === 'NIP_KEPALA_JENJANG'
        ) {
            return '$NIP_MUDIR_MARHALAH';
        }
        if (
            u === 'TTD_MUDIR_MARHALAH' ||
            u === 'TTD_MUDIRMARHALAH' ||
            u === 'TTD_KEPALA_MARHALAH' ||
            u === 'TTD_MUDIR_JENJANG' ||
            u === 'TTD_KEPALA_JENJANG'
        ) {
            return '$TTD_MUDIR_MARHALAH';
        }
        if (
            u === 'MUDIR' ||
            u === 'MUDIR_AAM' ||
            u === 'NAMA_MUDIR' ||
            u === 'NAMA_MUDIR_AAM' ||
            u === 'PIMPINAN' ||
            u === 'NAMA_PIMPINAN' ||
            u === 'KEPALA_SEKOLAH' ||
            u === 'KEPALASEKOLAH' ||
            u === 'KEPALA_MADRASAH' ||
            u === 'NAMA_KEPALA_MADRASAH'
        ) {
            return '$NAMA_MUDIR';
        }
        if (
            u === 'NIP_MUDIR' ||
            u === 'NIY_MUDIR' ||
            u === 'NIP_MUDIR_AAM' ||
            u === 'NIY_MUDIR_AAM' ||
            u === 'NIP_PIMPINAN' ||
            u === 'NIP_KEPALA_SEKOLAH' ||
            u === 'NIP_KEPALA_MADRASAH'
        ) {
            return '$NIP_MUDIR';
        }
        if (u === 'TTD_MUDIR' || u === 'TTD_MUDIR_AAM' || u === 'TTD_PIMPINAN' || u === 'TTD_KEPALA_SEKOLAH' || u === 'TTD_KEPALA_MADRASAH') {
            return '$TTD_MUDIR';
        }
        if (u === 'TITIMANGSA' || u === 'TITIMANGSA_RAPOR' || u === 'KOTA_TANGGAL_DOKUMEN') return '$TITIMANGSA';
        if (u === 'TITIMANGSA_MASEHI' || u === 'KOTA_TANGGAL_MASEHI') return '$TITIMANGSA_MASEHI';
        if (u === 'TITIMANGSA_HIJRIAH' || u === 'TITIMANGSA_HIJRIYAH') return '$TITIMANGSA_HIJRIAH';
        if (
            u === 'TITIMANGSA_GABUNGAN' ||
            u === 'TITIMANGSA_HIJRIAH_MASEHI' ||
            u === 'TITIMANGSA_HIJRIYAH_MASEHI' ||
            u === 'TITIMANGSA_LENGKAP'
        ) {
            return '$TITIMANGSA_GABUNGAN';
        }
        if (u === 'TITIMANGSA_MASEHI_HIJRIAH' || u === 'TITIMANGSA_MASEHI_HIJRIYAH') {
            return '$TITIMANGSA_MASEHI_HIJRIAH';
        }
        if (u === 'TANGGAL_RAPOR' || u === 'TANGGAL' || u === 'TANGGALRAPOR' || u === 'TANGGAL_DOKUMEN') return '$TANGGAL_RAPOR';
        if (u === 'TANGGAL_RAPOR_MASEHI' || u === 'TANGGAL_MASEHI') return '$TANGGAL_RAPOR_MASEHI';
        if (
            u === 'TANGGAL_RAPOR_HIJRIAH' ||
            u === 'TANGGAL_RAPOR_HIJRIYAH' ||
            u === 'TANGGAL_HIJRIAH' ||
            u === 'TANGGAL_HIJRIYAH'
        ) {
            return '$TANGGAL_RAPOR_HIJRIAH';
        }
        if (
            u === 'TANGGAL_RAPOR_GABUNGAN' ||
            u === 'TANGGAL_RAPOR_LENGKAP' ||
            u === 'TANGGAL_GABUNGAN' ||
            u === 'TANGGAL_HIJRIAH_MASEHI' ||
            u === 'TANGGAL_HIJRIYAH_MASEHI'
        ) {
            return '$TANGGAL_RAPOR_GABUNGAN';
        }
        if (u === 'TANGGAL_MASEHI_HIJRIAH' || u === 'TANGGAL_MASEHI_HIJRIYAH') {
            return '$TANGGAL_MASEHI_HIJRIAH';
        }
        if (u === 'TEMPAT_RAPOR' || u === 'KOTA_RAPOR' || u === 'TEMPAT_TTD' || u === 'KOTA' || u === 'TEMPATRAPOR') return '$TEMPAT_RAPOR';
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
        if (u === 'TAHUN_AJAR_MASEHI' || u === 'TAHUN_AJARAN_MASEHI' || u === 'TAPEL_MASEHI') {
            return '$TAHUN_AJAR_MASEHI';
        }
        if (u === 'TAHUN_AJAR_HIJRIAH' || u === 'TAHUN_AJARAN_HIJRIAH' || u === 'TAHUN_AJAR_HIJRIYAH' || u === 'TAHUN_AJARAN_HIJRIYAH' || u === 'TAHUN_HIJRIYAH' || u === 'TAPEL_HIJRIAH') {
            return '$TAHUN_AJAR_HIJRIAH';
        }
        if (u === 'TAHUN_AJAR_GABUNGAN' || u === 'TAHUN_AJARAN_GABUNGAN' || u === 'TAHUN_AJAR_LENGKAP' || u === 'TAHUN_AJARAN_LENGKAP' || u === 'TAPEL_GABUNGAN') {
            return '$TAHUN_AJAR_GABUNGAN';
        }
        if (u === 'CATATAN_WALI' || u === 'CATATAN' || u === 'CATATANWALIKELAS' || u === 'CATATAN_WALI_KELAS') return '$CATATAN_WALI_KELAS';
        return `$${u}`;
    };

    const normalizeTagsInSegment = (segment: string, insideFormulaQuotes: boolean): string => {
        let s = segment.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, p1) => normalizeTagWord(p1));
        if (!insideFormulaQuotes) {
            s = s.replace(/\{([a-zA-Z0-9_]+)\}/g, (_match, p1) => normalizeTagWord(p1));
            s = s.replace(/\[([a-zA-Z0-9_]+)\]/g, (_match, p1) => normalizeTagWord(p1));
        }
        // Jangan merusak koordinat absolut Excel seperti $D$6 saat menormalisasi $tag
        s = s.replace(/(\$[A-Za-z]{1,2}\$[1-9]\d{0,2})(?![A-Za-z0-9_])|\$([a-zA-Z0-9_]+)/g, (full, absRef, tagWord) => {
            if (absRef) return absRef;
            return normalizeTagWord(tagWord);
        });
        return s;
    };

    if (isRaporFormulaExpression(res)) {
        let normOut = '';
        let curSeg = '';
        let qChar: '"' | "'" | null = null;
        for (let i = 0; i < res.length; i++) {
            const ch = res[i];
            if (qChar) {
                if (ch === qChar && res[i - 1] !== '\\') {
                    normOut += normalizeTagsInSegment(curSeg, true) + ch;
                    curSeg = '';
                    qChar = null;
                } else {
                    curSeg += ch;
                }
            } else if (ch === '"' || ch === "'") {
                normOut += normalizeTagsInSegment(curSeg, false) + ch;
                curSeg = '';
                qChar = ch;
            } else {
                curSeg += ch;
            }
        }
        if (curSeg) {
            normOut += normalizeTagsInSegment(curSeg, qChar !== null);
        }
        res = normOut;
    } else {
        res = normalizeTagsInSegment(res, false);
    }

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
        const { rombel, kelas, jenjang } = resolveSantriAcademicHierarchy(santri, settings);
        if (santri) {
            const halaqah = (settings.kelompokHalaqah || []).find(h => Number(h.id) === Number(santri.halaqahId));
            setToken('$JENJANG', jenjang?.nama || '');
            setToken('$MARHALAH', jenjang?.nama || '');
            setToken('$KELAS', kelas?.nama || '');
            setToken('$ROMBEL', rombel?.nama || '');
            setToken('$HALAQAH', halaqah?.nama || '-');
        }

        // Wali Kelas (memprioritaskan rombel.waliKelasId lalu riwayatJabatan aktif)
        const targetRombel = rombel || (!santri ? settings.rombel?.[0] : undefined);
        const waliTeacher = resolveWaliKelasTeacher(targetRombel, settings);
        setToken('$NAMA_WALI_KELAS', waliTeacher?.nama || '-');
        setToken('$NIP_WALI_KELAS', formatTeacherNip(waliTeacher));

        // Mudir Marhalah / Kepala Jenjang (memprioritaskan jenjang.mudirId lalu riwayatJabatan aktif)
        const targetJenjang = jenjang || (!santri ? settings.jenjang?.[0] : undefined);
        const mudirMarhalahTeacher = resolveMudirMarhalahTeacher(targetJenjang, settings);
        setToken('$NAMA_MUDIR_MARHALAH', mudirMarhalahTeacher?.nama || '-');
        setToken('$NIP_MUDIR_MARHALAH', formatTeacherNip(mudirMarhalahTeacher));

        // Mudir Aam / Pimpinan Pondok
        const mudirAam = resolveMudirAamInfo(settings);
        setToken('$NAMA_MUDIR', mudirAam.nama);
        setToken('$NAMA_PIMPINAN', mudirAam.nama);
        setToken('$NAMA_KEPALA_SEKOLAH', mudirAam.nama);
        setToken('$NIP_MUDIR', mudirAam.nip);

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

    // Period / Record (terhubung ke Tahun Ajaran Aktif Masehi, Hijriah, & Gabungan di Data Master)
    const yearInfo = resolveAcademicYearLabels(
        settings,
        context.tahunAjaran?.trim() || record?.tahunAjaran?.trim() || null,
        context.semester || record?.semester || null
    );
    const sem = yearInfo.semester;

    setToken('$SEMESTER_ANGKA', sem === 'Genap' ? '2' : '1');
    setToken('$SEMESTER', sem);
    setToken('$TAHUN_AJARAN', yearInfo.otomatis);
    setToken('$TAHUN_AJAR', yearInfo.otomatis);
    setToken('$TAHUNAJAR', yearInfo.otomatis);
    setToken('$TAHUNAJARAN', yearInfo.otomatis);
    setToken('$TAHUN_PELAJARAN', yearInfo.otomatis);
    setToken('$TAHUN_AJAR_MASEHI', yearInfo.masehi);
    setToken('$TAHUN_AJAR_HIJRIAH', yearInfo.hijriah);
    setToken('$TAHUN_AJAR_GABUNGAN', yearInfo.gabungan);
    setToken('$TAHUN_AJAR_LENGKAP', yearInfo.gabungan);

    // Presensi & Catatan Wali
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
    const catatanWali = record?.catatanWaliKelas || findCustomVal('CATATAN_WALI_KELAS', 'catatanWaliKelas', 'CATATAN_WALI', 'catatan_wali', 'CATATAN', 'catatan') || '-';
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
    const rankKelasVal = context.calculation?.rankingKelas ?? rankVal;
    const rankJenjangVal = context.calculation?.rankingJenjang ?? rankVal;
    const rankGlobalVal = context.calculation?.rankingGlobal ?? rankVal;
    const totalSantriVal = context.calculation?.totalSantri;
    const totalSantriKelasVal = context.calculation?.totalSantriKelas ?? totalSantriVal;
    const totalSantriJenjangVal = context.calculation?.totalSantriJenjang ?? totalSantriVal;

    if (totalScore === undefined || avgScore === undefined) {
        let sum = 0;
        let count = 0;
        const nonGradeSet = new Set(['sakit', 'izin', 'alpha', 'alpa', 'total_absen', 's', 'i', 'a']);
        Object.entries(customObj).forEach(([k, val]) => {
            if (!nonGradeSet.has(k.toLowerCase()) && val !== undefined && val !== null && String(val).trim() !== '') {
                const num = Number(String(val).trim().replace(',', '.'));
                if (!isNaN(num) && num >= 0 && num <= 100) {
                    sum += num;
                    count += 1;
                }
            }
        });
        if (count > 0) {
            totalScore = sum;
            avgScore = Math.round((sum / count) * 10000) / 10000;
            if (!predikatStr) {
                if (avgScore >= 90) predikatStr = 'Mumtaz';
                else if (avgScore >= 80) predikatStr = 'Jayyid Jiddan';
                else if (avgScore >= 70) predikatStr = 'Jayyid';
                else if (avgScore >= 60) predikatStr = 'Maqbul';
                else predikatStr = 'Rasib';
            }
        }
    }

    // Siapkan peta rata-rata kelas per mata pelajaran (dari calculation.classAverages maupun cohortRecords bila tersedia)
    const effectiveClassAverages: Record<string, number> = {};
    if (context.calculation?.classAverages) {
        for (const [k, v] of Object.entries(context.calculation.classAverages)) {
            if (typeof v === 'number' && isFinite(v)) {
                effectiveClassAverages[normalizeSubjectKeyForAvg(k)] = v;
            }
        }
    }
    if (context.cohortRecords && context.cohortRecords.length > 0 && Object.keys(effectiveClassAverages).length === 0) {
        const cohortAccum = new Map<string, { sum: number; count: number }>();
        for (const cRec of context.cohortRecords) {
            if (!cRec?.customData) continue;
            let cObj: Record<string, any> = {};
            try {
                cObj = typeof cRec.customData === 'string' ? JSON.parse(cRec.customData) : cRec.customData;
            } catch {
                cObj = {};
            }
            for (const [rk, rv] of Object.entries(cObj)) {
                if (!rk || rv === undefined || rv === null) continue;
                const sv = String(rv).trim();
                if (sv === '' || sv === '-') continue;
                const num = Number(sv.replace(',', '.'));
                if (isNaN(num) || !isFinite(num)) continue;
                const nk = normalizeSubjectKeyForAvg(rk);
                if (!nk) continue;
                const entry = cohortAccum.get(nk) || { sum: 0, count: 0 };
                entry.sum += num;
                entry.count += 1;
                cohortAccum.set(nk, entry);
            }
        }
        for (const [nk, st] of cohortAccum.entries()) {
            if (st.count > 0) {
                effectiveClassAverages[nk] = Math.round((st.sum / st.count) * 10000) / 10000;
            }
        }
    }

    let effectiveClassOverallAvg = context.calculation?.classOverallAverage;
    if ((effectiveClassOverallAvg === undefined || effectiveClassOverallAvg <= 0) && Object.keys(effectiveClassAverages).length > 0) {
        const nonGradeSetForAvg = new Set(['sakit', 'izin', 'alpha', 'alpa', 'total_absen', 's', 'i', 'a']);
        const subjectAvgVals = Object.entries(effectiveClassAverages)
            .filter(([k, v]) => !nonGradeSetForAvg.has(k.toLowerCase()) && v > 0 && v <= 100)
            .map(([, v]) => v);
        if (subjectAvgVals.length > 0) {
            effectiveClassOverallAvg = Math.round((subjectAvgVals.reduce((a, b) => a + b, 0) / subjectAvgVals.length) * 10000) / 10000;
        }
    }

    const tokenDigits = context.decimalPlaces !== undefined
        ? Math.max(0, Math.min(4, Math.floor(context.decimalPlaces)))
        : 2;

    const formattedClassOverall = effectiveClassOverallAvg !== undefined && effectiveClassOverallAvg > 0
        ? (context.decimalPlaces !== undefined
            ? effectiveClassOverallAvg.toFixed(tokenDigits)
            : Number(effectiveClassOverallAvg.toFixed(2)).toString())
        : '-';

    setToken('$TOTAL_NILAI', totalScore !== undefined && totalScore > 0 ? String(totalScore) : '-');
    setToken('$RATA_RATA', avgScore !== undefined && avgScore > 0 ? avgScore.toFixed(tokenDigits) : '-');
    setToken('$RATA_RATA_KELAS', formattedClassOverall);
    setToken('$RERATA_KELAS', formattedClassOverall);
    setToken('$RATA2_KELAS', formattedClassOverall);
    setToken('$PREDIKAT_RATA_RATA', predikatStr || '-');
    setToken('$PERINGKAT', rankVal !== undefined && rankVal > 0 ? String(rankVal) : '-');
    setToken('$RANKING', rankVal !== undefined && rankVal > 0 ? String(rankVal) : '-');
    setToken('$PERINGKAT_KELAS', rankKelasVal !== undefined && rankKelasVal > 0 ? String(rankKelasVal) : '-');
    setToken('$PERINGKAT_JENJANG', rankJenjangVal !== undefined && rankJenjangVal > 0 ? String(rankJenjangVal) : '-');
    setToken('$TOTAL_SANTRI', totalSantriVal !== undefined && totalSantriVal > 0 ? String(totalSantriVal) : '-');
    setToken('$TOTAL_SANTRI_KELAS', totalSantriKelasVal !== undefined && totalSantriKelasVal > 0 ? String(totalSantriKelasVal) : '-');
    setToken('$TOTAL_SANTRI_JENJANG', totalSantriJenjangVal !== undefined && totalSantriJenjangVal > 0 ? String(totalSantriJenjangVal) : '-');

    // Daftarkan juga tag per mapel seperti $RATA2_KELAS_FIQIH, $RERATA_KELAS_FIQIH, dan $NRK_FIQIH untuk sel bertipe Data Dinamis
    for (const [normKey, avgNum] of Object.entries(effectiveClassAverages)) {
        const cleanAvgStr = context.decimalPlaces !== undefined
            ? avgNum.toFixed(tokenDigits)
            : Number(avgNum.toFixed(2)).toString();
        setToken(`$RATA2_KELAS_${normKey}`, cleanAvgStr);
        setToken(`$RERATA_KELAS_${normKey}`, cleanAvgStr);
        setToken(`$NRK_${normKey}`, cleanAvgStr);
    }

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

    // Date, Hijri & Titimangsa Rapor
    const dateObj: Date =
        parseLocalDateSafe(record?.tanggalRapor) ||
        parseLocalDateSafe(context.targetDate) ||
        parseLocalDateSafe(settings?.tanggalRaporDefault) ||
        new Date();

    const hijriAdjustment = settings?.hijriAdjustment || 0;
    const hijriInfo = getHijriDate(dateObj, hijriAdjustment);
    const masehiStr = formatDate(dateObj);
    const singkatMasehiStr = format(dateObj, 'dd/MM/yyyy');
    const masehiArabStr = formatGregorianArabic(dateObj);

    const manualHijriOverride = !record?.tanggalRapor && settings?.manualHijriRaporDefault?.trim()
        ? ensureHijriSuffix(settings.manualHijriRaporDefault)
        : '';
    const hijriFullWithH = manualHijriOverride || (hijriInfo.full ? `${hijriInfo.full} H` : '');
    const hijriArabStr = hijriInfo.fullArabic || hijriFullWithH;
    const hijriMasehiCombined = hijriFullWithH ? `${hijriFullWithH} / ${masehiStr} M` : masehiStr;
    const masehiHijriCombined = hijriFullWithH ? `${masehiStr} M / ${hijriFullWithH}` : masehiStr;

    const docFormattedDate = formatTanggalDokumen(dateObj, {
        formatMode: settings?.formatTanggalRaporDefault || 'masehi',
        hijriAdjustment,
        manualHijri: !record?.tanggalRapor ? settings?.manualHijriRaporDefault : undefined
    });

    const kotaPondok = resolveTempatRapor(settings, 'Pesantren');

    // Separate Date Tokens
    setToken('$TANGGAL_RAPOR', docFormattedDate);
    setToken('$TANGGAL_DOKUMEN', docFormattedDate);
    setToken('$TANGGAL_RAPOR_MASEHI', masehiStr);
    setToken('$TANGGAL_MASEHI', masehiStr);
    setToken('$TANGGAL_SINGKAT_MASEHI', singkatMasehiStr);
    setToken('$TAHUN_MASEHI', format(dateObj, 'yyyy'));
    setToken('$BULAN_MASEHI', format(dateObj, 'MMMM', { locale: idLocale }));

    setToken('$TANGGAL_RAPOR_HIJRIAH', hijriFullWithH || '-');
    setToken('$TANGGAL_HIJRIAH', hijriFullWithH || '-');
    setToken('$TANGGAL_RAPOR_GABUNGAN', hijriMasehiCombined);
    setToken('$TANGGAL_HIJRIAH_MASEHI', hijriMasehiCombined);
    setToken('$TANGGAL_MASEHI_HIJRIAH', masehiHijriCombined);
    setToken('$TAHUN_HIJRIAH', hijriInfo.year ? `${hijriInfo.year} H` : '-');
    setToken('$BULAN_HIJRIAH', hijriInfo.month || '-');

    // Separate Place & Combined Titimangsa Tokens
    setToken('$TEMPAT_RAPOR', kotaPondok);
    setToken('$KOTA_PONPES', kotaPondok);
    setToken('$TITIMANGSA', `${kotaPondok}, ${docFormattedDate}`);
    setToken('$KOTA_TANGGAL_DOKUMEN', `${kotaPondok}, ${docFormattedDate}`);
    setToken('$TITIMANGSA_MASEHI', `${kotaPondok}, ${masehiStr}`);
    setToken('$KOTA_TANGGAL', `${kotaPondok}, ${masehiStr}`);
    setToken('$TITIMANGSA_HIJRIAH', `${kotaPondok}, ${hijriFullWithH || '-'}`);
    setToken('$KOTA_TANGGAL_HIJRIAH', `${kotaPondok}, ${hijriFullWithH || '-'}`);
    setToken('$TITIMANGSA_GABUNGAN', `${kotaPondok}, ${hijriMasehiCombined}`);
    setToken('$KOTA_TANGGAL_HIJRIAH_MASEHI', `${kotaPondok}, ${hijriMasehiCombined}`);
    setToken('$TITIMANGSA_MASEHI_HIJRIAH', `${kotaPondok}, ${masehiHijriCombined}`);

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
    // Mendukung angka bulat maupun desimal titik (85.5) atau koma Indonesia (85,5)
    const NUMERIC_SCALAR_REGEX = /^-?(?:0|[1-9]\d*)(?:[.,]\d+)?$/;

    const findMasterCoord = (r: number, c: number): { r: number; c: number } => {
        if (!sheetCells) return { r, c };
        const target = sheetCells[r]?.[c];
        if (!target || !target.hidden) return { r, c };
        for (let mr = r; mr >= 0; mr--) {
            for (let mc = c; mc >= 0; mc--) {
                const cand = sheetCells[mr]?.[mc];
                if (cand && !cand.hidden) {
                    const rSpan = cand.rowSpan || 1;
                    const cSpan = cand.colSpan || 1;
                    if (r >= mr && r < mr + rSpan && c >= mc && c < mc + cSpan) {
                        return { r: mr, c: mc };
                    }
                }
            }
        }
        return { r, c };
    };

    const activeEvalSet = new Set<string>(context.evaluatingCells || []);
    if (context.currentCellCoord) {
        const masterCur = findMasterCoord(context.currentCellCoord.r, context.currentCellCoord.c);
        activeEvalSet.add(`${masterCur.r}:${masterCur.c}`);
    }

    const formatScalarForFormula = (rawVal: string): string => {
        const strVal = rawVal ?? '';
        const trimmedVal = strVal.trim();
        if (strVal === '' || trimmedVal === '-') return '""';
        if (trimmedVal !== '' && NUMERIC_SCALAR_REGEX.test(trimmedVal)) {
            return trimmedVal.replace(',', '.');
        }
        const escaped = strVal.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        return `"${escaped}"`;
    };

    const resolveGridCellScalar = (r: number, c: number): string => {
        if (!sheetCells) return '';
        const master = findMasterCoord(r, c);
        const coordKey = `${master.r}:${master.c}`;
        if (activeEvalSet.has(coordKey)) return '';
        const cell = sheetCells[master.r]?.[master.c];
        if (!cell) return '';

        const nextEvalSet = new Set(activeEvalSet);
        nextEvalSet.add(coordKey);
        const childCtx: RaporResolveContext = {
            ...context,
            currentCellCoord: master,
            evaluatingCells: nextEvalSet
        };

        if ((cell.type === 'input' || cell.type === 'dropdown') && cell.key) {
            const kToken = `$${cell.key.trim().toUpperCase().replace(/[\s-]+/g, '_')}`;
            const foundVal = tokenMap.get(kToken);
            if (foundVal !== undefined && foundVal !== '') return foundVal;
            return cell.value ? resolveRaporText(cell.value, childCtx) : '';
        }
        if (cell.type === 'formula') {
            if (cell.value && cell.value.trim() !== '') {
                const rawExpr = cell.value.trim().startsWith('=') ? cell.value : `=${cell.value.trim()}`;
                const evaluated = resolveRaporText(rawExpr, {
                    ...childCtx,
                    decimalPlaces: cell.decimalPlaces !== undefined ? cell.decimalPlaces : 6
                });
                return cell.decimalPlaces !== undefined
                    ? formatCellNumericDisplay(evaluated, cell.decimalPlaces)
                    : evaluated;
            }
            if (cell.key) {
                const kToken = `$${cell.key.trim().toUpperCase().replace(/[\s-]+/g, '_')}`;
                return tokenMap.get(kToken) || '';
            }
            return '';
        }
        if (cell.type === 'data') {
            if (isMediaTag(cell.value || '')) return '';
            return cell.value ? resolveRaporText(cell.value, childCtx) : '';
        }
        if (cell.value && (cell.value.includes('$') || cell.value.trim().startsWith('='))) {
            return resolveRaporText(cell.value, childCtx);
        }
        return cell.value ?? '';
    };

    // Pra-pemrosesan argumen fungsi RATA2_KELAS / RERATA_KELAS / RATA_KELAS / NRK / AVG_KELAS
    // agar argumen sel (misal D6) maupun variabel ($FIQIH) dipetakan ke kunci mapel / rerata rombel, bukan nilai individu santri
    const resolveCellToClassAvgArg = (r: number, c: number): string => {
        if (!sheetCells) return '"__EMPTY__"';
        const master = findMasterCoord(r, c);
        const cell = sheetCells[master.r]?.[master.c];
        if (!cell) return '"__EMPTY__"';

        if ((cell.type === 'input' || cell.type === 'dropdown') && cell.key) {
            const nk = normalizeSubjectKeyForAvg(cell.key);
            return `"${nk}"`;
        }

        if (cell.type === 'formula') {
            if (cell.key) {
                const nk = normalizeSubjectKeyForAvg(cell.key);
                if (effectiveClassAverages[nk] !== undefined) {
                    return `"${nk}"`;
                }
            }
            if (cell.value && cell.value.trim() !== '' && !context.evaluatingClassAvg) {
                const rawFormulaExpr = cell.value.trim().startsWith('=') ? cell.value : `=${cell.value.trim()}`;
                if (context.cohortRecords && context.cohortRecords.length > 0) {
                    const cohortNums: number[] = [];
                    for (const cRec of context.cohortRecords) {
                        const evalStr = resolveRaporText(rawFormulaExpr, {
                            ...context,
                            record: cRec,
                            extraVars: undefined,
                            evaluatingClassAvg: true,
                            currentCellCoord: master,
                            evaluatingCells: new Set([`${master.r}:${master.c}`])
                        });
                        const cleaned = evalStr.trim().replace(',', '.');
                        if (cleaned !== '' && cleaned !== '-') {
                            const n = Number(cleaned);
                            if (!isNaN(n) && isFinite(n)) cohortNums.push(n);
                        }
                    }
                    if (cohortNums.length > 0) {
                        const meanVal = Math.round((cohortNums.reduce((a, b) => a + b, 0) / cohortNums.length) * 100) / 100;
                        return `"__VAL__:${meanVal}"`;
                    }
                } else if (context.calculation?.isSimulated) {
                    const simEval = resolveRaporText(rawFormulaExpr, {
                        ...context,
                        evaluatingClassAvg: true,
                        currentCellCoord: master,
                        evaluatingCells: new Set([`${master.r}:${master.c}`])
                    });
                    const simNum = Number(simEval.trim().replace(',', '.'));
                    if (!isNaN(simNum) && isFinite(simNum)) {
                        const offset = ((master.r * 3 + master.c) % 5) * 0.7 + 1.2;
                        const simAvg = Math.max(60, Math.min(98, Number((simNum - offset).toFixed(1))));
                        return `"__VAL__:${simAvg}"`;
                    }
                }
            }
            return '"__EMPTY__"';
        }

        if (cell.type === 'data' && cell.value) {
            const tv = cell.value.trim();
            const tagM = tv.match(/^\$([A-Za-z0-9_]+)$/);
            if (tagM) {
                const nk = normalizeSubjectKeyForAvg(tagM[1]);
                return `"${nk}"`;
            }
        }

        return '"__EMPTY__"';
    };

    const resolveSingleClassAvgTarget = (rawArg: string): string[] => {
        const t = rawArg.trim();
        if (!t) return [];

        // 1. Rentang sel Excel (contoh: D6:D15)
        if (sheetCells && sheetRowCount > 0) {
            const rng = parseExcelRangeCoord(t);
            if (rng) {
                const rStart = Math.max(0, rng.rMin);
                const rEnd = Math.min(sheetRowCount - 1, rng.rMax);
                const cStart = Math.max(0, rng.cMin);
                const cEnd = Math.min(sheetColCount - 1, rng.cMax);
                const seen = new Set<string>();
                const out: string[] = [];
                for (let rr = rStart; rr <= rEnd; rr++) {
                    for (let cc = cStart; cc <= cEnd; cc++) {
                        const m = findMasterCoord(rr, cc);
                        const mk = `${m.r}:${m.c}`;
                        if (seen.has(mk)) continue;
                        seen.add(mk);
                        out.push(resolveCellToClassAvgArg(m.r, m.c));
                    }
                }
                return out.length > 0 ? out : ['"__EMPTY__"'];
            }
        }

        // 2. Koordinat sel tunggal Excel (contoh: D6, $D$6, atau D$6)
        if (sheetCells && sheetRowCount > 0) {
            const coord = parseExcelCellCoord(t, false);
            if (coord && coord.r >= 0 && coord.r < sheetRowCount && coord.c >= 0 && coord.c < sheetColCount) {
                return [resolveCellToClassAvgArg(coord.r, coord.c)];
            }
        }

        // 3. Variabel $KODE_MAPEL (contoh: $FIQIH) atau koordinat kolom-terkunci $D6
        const dollarMatch = t.match(/^\$([A-Za-z0-9_]+)$/);
        if (dollarMatch) {
            const nk = normalizeSubjectKeyForAvg(dollarMatch[1]);
            if (effectiveClassAverages[nk] !== undefined) {
                return [`"${nk}"`];
            }
            if (sheetCells) {
                for (let rr = 0; rr < sheetCells.length; rr++) {
                    const row = sheetCells[rr] || [];
                    for (let cc = 0; cc < row.length; cc++) {
                        const cand = row[cc];
                        if (cand && !cand.hidden && cand.key && normalizeSubjectKeyForAvg(cand.key) === nk) {
                            return [resolveCellToClassAvgArg(rr, cc)];
                        }
                    }
                }
                // Jika bukan $KEY mapel di sheet, cek apakah koordinat kolom-terkunci seperti $D6
                if (sheetRowCount > 0) {
                    const colLocked = parseExcelCellCoord(t, true);
                    if (colLocked && colLocked.r >= 0 && colLocked.r < sheetRowCount && colLocked.c >= 0 && colLocked.c < sheetColCount) {
                        return [resolveCellToClassAvgArg(colLocked.r, colLocked.c)];
                    }
                }
            }
            return [`"${nk}"`];
        }

        // 4. Teks kutip ("FIQIH") atau identifier polos (FIQIH)
        const stripped = (t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))
            ? t.slice(1, -1)
            : t;
        const escaped = stripped.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        return [`"${escaped}"`];
    };

    const preprocessClassAvgFormulaCalls = (exprStr: string): string => {
        let out = '';
        let i = 0;
        let q: '"' | "'" | null = null;
        while (i < exprStr.length) {
            const c = exprStr[i];
            if (q) {
                if (c === q && exprStr[i - 1] !== '\\') q = null;
                out += c;
                i++;
                continue;
            }
            if (c === '"' || c === "'") {
                q = c;
                out += c;
                i++;
                continue;
            }
            if (/[A-Za-z]/.test(c) && (i === 0 || !/[A-Za-z0-9_$]/.test(exprStr[i - 1]))) {
                const fnStartMatch = exprStr.slice(i).match(/^(RATA2_KELAS|RERATA_KELAS|RATA_KELAS|NRK|AVG_KELAS)(\s*)\(/i);
                if (fnStartMatch) {
                    const fnCallPrefix = fnStartMatch[0]; // misal "RATA2_KELAS("
                    const openParenIdx = i + fnCallPrefix.length - 1;
                    let depth = 0;
                    let innerQ: '"' | "'" | null = null;
                    let closeParenIdx = -1;
                    for (let j = openParenIdx; j < exprStr.length; j++) {
                        const jc = exprStr[j];
                        if (innerQ) {
                            if (jc === innerQ && exprStr[j - 1] !== '\\') innerQ = null;
                            continue;
                        }
                        if (jc === '"' || jc === "'") {
                            innerQ = jc;
                            continue;
                        }
                        if (jc === '(') depth++;
                        else if (jc === ')') {
                            depth--;
                            if (depth === 0) {
                                closeParenIdx = j;
                                break;
                            }
                        }
                    }

                    if (closeParenIdx !== -1) {
                        const rawInner = exprStr.slice(openParenIdx + 1, closeParenIdx);
                        if (rawInner.trim() === '') {
                            out += `${fnStartMatch[1]}()`;
                        } else {
                            const topArgs = splitTopLevelArgs(rawInner);
                            let targetList = topArgs;
                            let digitsArgSuffix = '';
                            if (topArgs.length === 2 && /^[0-4]$/.test(topArgs[1].trim())) {
                                targetList = [topArgs[0]];
                                digitsArgSuffix = `, ${topArgs[1].trim()}`;
                            }
                            const rewrittenTargets: string[] = [];
                            for (const ta of targetList) {
                                rewrittenTargets.push(...resolveSingleClassAvgTarget(ta));
                            }
                            out += `${fnStartMatch[1]}(${rewrittenTargets.join(', ')}${digitsArgSuffix})`;
                        }
                        i = closeParenIdx + 1;
                        continue;
                    }
                }
            }
            out += c;
            i++;
        }
        return out;
    };

    const preparedRes = isFormula ? preprocessClassAvgFormulaCalls(res) : res;

    // Substitusi token $TAG serta koordinat/rentang sel Excel (misal D6:D15 atau D6) dengan pemindai sadar-kutip
    let substituted = '';
    let inQuote: '"' | "'" | null = null;
    let idx = 0;
    while (idx < preparedRes.length) {
        const ch = preparedRes[idx];
        if (inQuote) {
            if (ch === inQuote && preparedRes[idx - 1] !== '\\') {
                inQuote = null;
                substituted += ch;
                idx++;
                continue;
            }
            if (ch === '$') {
                const m = preparedRes.slice(idx).match(/^\$([A-Z0-9_]+)/);
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

        // Ekspansi rentang sel Excel (contoh: D6:D15 atau $D$6:$D$15) saat di dalam rumus
        if (isFormula && sheetCells && sheetRowCount > 0 && (idx === 0 || !/[A-Za-z0-9_]/.test(preparedRes[idx - 1]))) {
            const rangeMatch = preparedRes.slice(idx).match(/^(\$?[A-Za-z]{1,2}\$?[1-9]\d{0,2}\s*:\s*\$?[A-Za-z]{1,2}\$?[1-9]\d{0,2})(?![A-Za-z0-9_])/);
            if (rangeMatch) {
                const rng = parseExcelRangeCoord(rangeMatch[1]);
                if (rng) {
                    const rStart = Math.max(0, rng.rMin);
                    const rEnd = Math.min(sheetRowCount - 1, rng.rMax);
                    const cStart = Math.max(0, rng.cMin);
                    const cEnd = Math.min(sheetColCount - 1, rng.cMax);
                    const seenMasters = new Set<string>();
                    const expandedVals: string[] = [];

                    for (let rr = rStart; rr <= rEnd; rr++) {
                        for (let cc = cStart; cc <= cEnd; cc++) {
                            const master = findMasterCoord(rr, cc);
                            const mKey = `${master.r}:${master.c}`;
                            if (seenMasters.has(mKey) || activeEvalSet.has(mKey)) continue;
                            seenMasters.add(mKey);
                            expandedVals.push(formatScalarForFormula(resolveGridCellScalar(master.r, master.c)));
                        }
                    }

                    substituted += expandedVals.length > 0 ? expandedVals.join(', ') : '""';
                    idx += rangeMatch[1].length;
                    continue;
                }
            }
        }

        if (ch === '$') {
            // Koordinat absolut penuh Excel $D$6 selalu diproses terlebih dahulu (dua '$')
            if (isFormula && sheetCells && sheetRowCount > 0) {
                const absMatch = preparedRes.slice(idx).match(/^(\$[A-Za-z]{1,2}\$[1-9]\d{0,2})(?![A-Za-z0-9_(])/);
                if (absMatch) {
                    const coord = parseExcelCellCoord(absMatch[1], false);
                    if (coord && coord.r >= 0 && coord.r < sheetRowCount && coord.c >= 0 && coord.c < sheetColCount) {
                        substituted += formatScalarForFormula(resolveGridCellScalar(coord.r, coord.c));
                        idx += absMatch[1].length;
                        continue;
                    }
                }
            }

            const m = preparedRes.slice(idx).match(/^\$([A-Za-z0-9_]+)/);
            if (m) {
                const rawTok = `$${m[1]}`;
                const upperTok = rawTok.toUpperCase();
                const found = tokenMap.get(upperTok);
                if (found !== undefined) {
                    substituted += isFormula ? formatScalarForFormula(found) : found;
                    idx += rawTok.length;
                    continue;
                }
                // Jika merupakan $KEY variabel input pada sheet namun nilainya masih kosong
                if (definedSheetKeys.has(upperTok)) {
                    substituted += isFormula ? '""' : '';
                    idx += rawTok.length;
                    continue;
                }
                // Koordinat kolom-terkunci Excel $D6 (ketika bukan $TAG maupun $KEY)
                if (isFormula && sheetCells && sheetRowCount > 0) {
                    const colLockedMatch = preparedRes.slice(idx).match(/^(\$[A-Za-z]{1,2}[1-9]\d{0,2})(?![A-Za-z0-9_(])/);
                    if (colLockedMatch) {
                        const coord = parseExcelCellCoord(colLockedMatch[1], true);
                        if (coord && coord.r >= 0 && coord.r < sheetRowCount && coord.c >= 0 && coord.c < sheetColCount) {
                            substituted += formatScalarForFormula(resolveGridCellScalar(coord.r, coord.c));
                            idx += colLockedMatch[1].length;
                            continue;
                        }
                    }
                }
            }
        }

        // Koordinat sel tunggal Excel tanpa '$' di depan (contoh: D6 atau D$6) di dalam rumus
        if (isFormula && sheetCells && sheetRowCount > 0 && /[A-Za-z]/.test(ch) && (idx === 0 || !/[A-Za-z0-9_$]/.test(preparedRes[idx - 1]))) {
            const singleMatch = preparedRes.slice(idx).match(/^([A-Za-z]{1,2}\$?[1-9]\d{0,2})(?![A-Za-z0-9_(])/);
            if (singleMatch) {
                const coord = parseExcelCellCoord(singleMatch[1], false);
                if (coord && coord.r >= 0 && coord.r < sheetRowCount && coord.c >= 0 && coord.c < sheetColCount) {
                    substituted += formatScalarForFormula(resolveGridCellScalar(coord.r, coord.c));
                    idx += singleMatch[1].length;
                    continue;
                }
            }
        }

        substituted += ch;
        idx++;
    }

    // Evaluasi seluruh rumus sel rapor (=SUM, =RATA2, =RATA2_KELAS, =IF, =PREDIKAT, =TERBILANG, =ARAB, =UPPER, =LOWER, =PROPER, =TAHUN_AJAR_*, =SEMESTER, =TITIMANGSA*, =TANGGAL_RAPOR*, =TEMPAT_RAPOR, &)
    return evaluateRaporFormula(substituted, {
        rank: rankVal,
        rankKelas: rankKelasVal,
        rankJenjang: rankJenjangVal,
        rankGlobal: rankGlobalVal,
        tahunAjaran: yearInfo.otomatis,
        tahunAjaranMasehi: yearInfo.masehi,
        tahunAjaranHijriah: yearInfo.hijriah,
        tahunAjaranGabungan: yearInfo.gabungan,
        semester: sem,
        tempatRapor: kotaPondok,
        tanggalRaporOtomatis: docFormattedDate,
        tanggalRaporMasehi: masehiStr,
        tanggalRaporSingkat: singkatMasehiStr,
        tanggalRaporMasehiArab: masehiArabStr,
        tanggalRaporHijriah: hijriFullWithH,
        tanggalRaporHijriahArab: hijriArabStr,
        tanggalRaporGabungan: hijriMasehiCombined,
        tanggalRaporMasehiHijriah: masehiHijriCombined,
        classAverages: effectiveClassAverages,
        classOverallAverage: effectiveClassOverallAvg,
        decimalPlaces: context.decimalPlaces
    });
};
