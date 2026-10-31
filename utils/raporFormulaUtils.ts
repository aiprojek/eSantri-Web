import { MataPelajaran, GridCell } from '../types';

export interface FormulaSuggestionItem {
    token: string;
    insertText: string;
    label: string;
    syntax: string;
    description: string;
    category: 'formula' | 'tag' | 'input_key';
}

export const RAPOR_FORMULA_SUGGESTIONS: FormulaSuggestionItem[] = [
    {
        token: '=SUM',
        insertText: '=SUM(',
        label: 'Penjumlahan Nilai (SUM)',
        syntax: '=SUM(D6:D15)',
        description: 'Ketik lalu blok/seret sel nilai di tabel (misal D6:D15 atau $A, $B)',
        category: 'formula'
    },
    {
        token: '=RATA2',
        insertText: '=RATA2(',
        label: 'Rata-rata Nilai (RATA2)',
        syntax: '=RATA2(D6:D15)',
        description: 'Ketik lalu blok/seret sel nilai di tabel untuk rata-rata otomatis',
        category: 'formula'
    },
    {
        token: '=RATA2_KELAS',
        insertText: '=RATA2_KELAS(',
        label: 'Rerata Kelas Mapel (RATA2_KELAS)',
        syntax: '=RATA2_KELAS(D6)',
        description: 'Rata-rata kelas untuk suatu mapel (klik sel nilai mapel misal D6 atau ketik $KODE_MAPEL)',
        category: 'formula'
    },
    {
        token: '=RERATA_KELAS',
        insertText: '=RERATA_KELAS(',
        label: 'Rerata Kelas Mapel (RERATA_KELAS / NRK)',
        syntax: '=RERATA_KELAS($KODE_MAPEL)',
        description: 'Alias RATA2_KELAS — klik sel nilai mapel atau ketik $KODE_MAPEL (alias singkat: =NRK)',
        category: 'formula'
    },
    {
        token: '=KKM',
        insertText: '=KKM(',
        label: 'KKM Otomatis dari Data Master (KKM)',
        syntax: '=KKM(B6)',
        description: 'Ambil KKM dari Data Master Mata Pelajaran sesuai nama mapel manual / sel nilai (misal =KKM(B6), =KKM(), atau =KKM(B6, 75))',
        category: 'formula'
    },
    {
        token: '=ROUND',
        insertText: '=ROUND(',
        label: 'Pembulatan Desimal Excel (ROUND / BULAT)',
        syntax: '=ROUND(RATA2(D6:D15), 2)',
        description: 'Bulatkan nilai ke 0, 1, 2, atau 3 angka di belakang koma (contoh: =ROUND(D6, 2))',
        category: 'formula'
    },
    {
        token: '=FIXED',
        insertText: '=FIXED(',
        label: 'Format Desimal Tetap (FIXED / DESIMAL)',
        syntax: '=FIXED(RATA2(D6:D15), 2)',
        description: 'Tampilkan selalu tepat N digit di belakang koma termasuk nol (contoh: 85,5 -> 85.50)',
        category: 'formula'
    },
    {
        token: '=ROUNDUP',
        insertText: '=ROUNDUP(',
        label: 'Pembulatan ke Atas (ROUNDUP / BULAT_ATAS)',
        syntax: '=ROUNDUP(RATA2(D6:D15), 2)',
        description: 'Bulatkan angka ke atas pada jumlah digit desimal tertentu (1, 2, atau 3 digit)',
        category: 'formula'
    },
    {
        token: '=ROUNDDOWN',
        insertText: '=ROUNDDOWN(',
        label: 'Pembulatan ke Bawah (ROUNDDOWN / BULAT_BAWAH)',
        syntax: '=ROUNDDOWN(RATA2(D6:D15), 2)',
        description: 'Potong/bulatkan angka ke bawah pada jumlah digit desimal tertentu (1, 2, atau 3 digit)',
        category: 'formula'
    },
    {
        token: '=PREDIKAT',
        insertText: '=PREDIKAT(',
        label: 'Predikat Huruf / Arab-Latin',
        syntax: '=PREDIKAT($NILAI, "huruf")',
        description: 'Otomatis A/B/C/D atau "pesantren" (Mumtaz, Jayyid Jiddan, dst)',
        category: 'formula'
    },
    {
        token: '=TERBILANG',
        insertText: '=TERBILANG(',
        label: 'Angka ke Huruf Terbilang',
        syntax: '=TERBILANG($NILAI)',
        description: 'Mengubah angka 85 menjadi "Delapan Puluh Lima"',
        category: 'formula'
    },
    {
        token: '=ARAB',
        insertText: '=ARAB(',
        label: 'Angka ke Huruf/Angka Arab',
        syntax: '=ARAB($NILAI)',
        description: 'Mengubah angka Latin 85 menjadi angka Arab ٨٥',
        category: 'formula'
    },
    {
        token: '=IF',
        insertText: '=IF(',
        label: 'Logika Kondisi (IF)',
        syntax: '=IF(D6>=KKM(B6), "Tuntas", "Remidi")',
        description: 'Menampilkan hasil berdasarkan syarat nilai (mendukung angka statis maupun =KKM(B6) / sel $KKM)',
        category: 'formula'
    },
    {
        token: '=IFS',
        insertText: '=IFS(',
        label: 'Multi Kondisi Bertingkat (IFS)',
        syntax: '=IFS(D6>=90, "A", D6>=80, "B", D6>=70, "C", TRUE, "D")',
        description: 'Mengecek beberapa syarat berurutan tanpa perlu IF bertumpuk',
        category: 'formula'
    },
    {
        token: '=AND',
        insertText: '=AND(',
        label: 'Semua Syarat Terpenuhi (AND / DAN)',
        syntax: '=IF(AND(D6>=70, E6>=70), "Lulus", "Remedial")',
        description: 'Bernilai TRUE jika seluruh syarat di dalamnya terpenuhi',
        category: 'formula'
    },
    {
        token: '=OR',
        insertText: '=OR(',
        label: 'Salah Satu Syarat Terpenuhi (OR / ATAU)',
        syntax: '=IF(OR(D6<70, E6<70), "Perlu Bimbingan", "Tuntas")',
        description: 'Bernilai TRUE jika minimal satu syarat terpenuhi',
        category: 'formula'
    },
    {
        token: '=COUNT',
        insertText: '=COUNT(',
        label: 'Hitung Jumlah Mapel Bernilai (COUNT)',
        syntax: '=COUNT(D6:D15)',
        description: 'Menghitung banyaknya sel yang berisi angka nilai pada rentang',
        category: 'formula'
    },
    {
        token: '=COUNTIF',
        insertText: '=COUNTIF(',
        label: 'Hitung Nilai Sesuai Kriteria (COUNTIF)',
        syntax: '=COUNTIF(D6:D15, ">=75")',
        description: 'Menghitung banyaknya nilai yang memenuhi kriteria (misal ">=75" atau "<70")',
        category: 'formula'
    },
    {
        token: '=AVERAGEIF',
        insertText: '=AVERAGEIF(',
        label: 'Rata-rata dengan Kriteria (AVERAGEIF)',
        syntax: '=AVERAGEIF(D6:D15, ">0")',
        description: 'Rata-rata sel yang memenuhi kriteria tertentu (misal abaikan nilai 0)',
        category: 'formula'
    },
    {
        token: '=IFERROR',
        insertText: '=IFERROR(',
        label: 'Antisipasi Nilai Kosong/Error (IFERROR)',
        syntax: '=IFERROR(RATA2(D6:D15), "-")',
        description: 'Tampilkan teks cadangan jika rumus belum memiliki nilai',
        category: 'formula'
    },
    {
        token: '=MAX',
        insertText: '=MAX(',
        label: 'Nilai Tertinggi (MAX)',
        syntax: '=MAX(D6:D15)',
        description: 'Mengambil nilai tertinggi dari blok sel atau daftar variabel',
        category: 'formula'
    },
    {
        token: '=MIN',
        insertText: '=MIN(',
        label: 'Nilai Terendah (MIN)',
        syntax: '=MIN(D6:D15)',
        description: 'Mengambil nilai terendah dari blok sel atau daftar variabel',
        category: 'formula'
    },
    {
        token: '=RANK',
        insertText: '=RANK($TOTAL_NILAI, "rombel")',
        label: 'Peringkat Kelas (RANK)',
        syntax: '=RANK($TOTAL_NILAI, "rombel")',
        description: 'Menampilkan peringkat santri di rombel aktif',
        category: 'formula'
    },
    {
        token: '=CONCAT',
        insertText: '=CONCAT(',
        label: 'Gabung Teks & Variabel (CONCAT)',
        syntax: '=CONCAT("Semester ", $SEMESTER)',
        description: 'Menggabungkan kata & variabel dengan tetap menjaga spasi di dalam tanda kutip (" ")',
        category: 'formula'
    },
    {
        token: '=CONCAT_SPASI',
        insertText: '=CONCAT_SPASI(',
        label: 'Gabung Otomatis Berspasi',
        syntax: '=CONCAT_SPASI("Marhalah", $JENJANG)',
        description: 'Menggabungkan beberapa teks/variabel dan otomatis memberi 1 spasi antar kata',
        category: 'formula'
    },
    {
        token: '=UPPER',
        insertText: '=UPPER(',
        label: 'Huruf Besar Semua (UPPER)',
        syntax: '=UPPER($NAMA)',
        description: 'Mengubah seluruh huruf menjadi KAPITAL / HURUF BESAR',
        category: 'formula'
    },
    {
        token: '=LOWER',
        insertText: '=LOWER(',
        label: 'Huruf Kecil Semua (LOWER)',
        syntax: '=LOWER($TEKS)',
        description: 'Mengubah seluruh huruf menjadi huruf kecil',
        category: 'formula'
    },
    {
        token: '=PROPER',
        insertText: '=PROPER(',
        label: 'Kapital Awal Kata / Judul (PROPER)',
        syntax: '=PROPER($NAMA)',
        description: 'Mengubah huruf pertama setiap kata menjadi Kapital (Ahmad Fauzan)',
        category: 'formula'
    },
    {
        token: '=TAHUN_AJAR',
        insertText: '=TAHUN_AJAR()',
        label: 'Tahun Ajaran (Sesuai Master)',
        syntax: '=TAHUN_AJAR()',
        description: 'Otomatis Masehi atau Gabungan jika tampilan Hijriah diaktifkan di Data Master',
        category: 'formula'
    },
    {
        token: '=TAHUN_AJAR_MASEHI',
        insertText: '=TAHUN_AJAR_MASEHI()',
        label: 'Tahun Ajaran Masehi',
        syntax: '=TAHUN_AJAR_MASEHI()',
        description: 'Menampilkan tahun ajaran Masehi aktif (misal 2026/2027)',
        category: 'formula'
    },
    {
        token: '=TAHUN_AJAR_HIJRIAH',
        insertText: '=TAHUN_AJAR_HIJRIAH()',
        label: 'Tahun Ajaran Hijriah',
        syntax: '=TAHUN_AJAR_HIJRIAH()',
        description: 'Menampilkan tahun ajaran Hijriah aktif (misal 1448/1449 H)',
        category: 'formula'
    },
    {
        token: '=TAHUN_AJAR_GABUNGAN',
        insertText: '=TAHUN_AJAR_GABUNGAN()',
        label: 'Tahun Ajaran Hijriah & Masehi',
        syntax: '=TAHUN_AJAR_GABUNGAN()',
        description: 'Menampilkan gabungan Hijriah & Masehi (misal 1448/1449 H / 2026/2027 M)',
        category: 'formula'
    },
    {
        token: '=SEMESTER',
        insertText: '=SEMESTER()',
        label: 'Semester Aktif',
        syntax: '=SEMESTER()',
        description: 'Memanggil semester aktif berjalan (Ganjil / Genap)',
        category: 'formula'
    },
    {
        token: '=TITIMANGSA',
        insertText: '=TITIMANGSA()',
        label: 'Titimangsa Rapor (Sesuai Cetak)',
        syntax: '=TITIMANGSA()',
        description: 'Tempat & tanggal penandatanganan otomatis sesuai pengaturan Cetak Rapor',
        category: 'formula'
    },
    {
        token: '=TITIMANGSA_GABUNGAN',
        insertText: '=TITIMANGSA_GABUNGAN()',
        label: 'Titimangsa Hijriah & Masehi',
        syntax: '=TITIMANGSA_GABUNGAN()',
        description: 'Kota + tanggal Hijriah & Masehi (opsi: "masehi_dulu" atau "dua_baris")',
        category: 'formula'
    },
    {
        token: '=TITIMANGSA_MASEHI',
        insertText: '=TITIMANGSA_MASEHI()',
        label: 'Titimangsa Khusus Masehi',
        syntax: '=TITIMANGSA_MASEHI()',
        description: 'Kota + tanggal Masehi pengeluaran rapor (misal: Banyumas, 20 Juni 2026)',
        category: 'formula'
    },
    {
        token: '=TITIMANGSA_HIJRIAH',
        insertText: '=TITIMANGSA_HIJRIAH()',
        label: 'Titimangsa Khusus Hijriah',
        syntax: '=TITIMANGSA_HIJRIAH()',
        description: 'Kota + tanggal Hijriah pengeluaran rapor (misal: Banyumas, 5 Muharram 1448 H)',
        category: 'formula'
    },
    {
        token: '=TEMPAT_RAPOR',
        insertText: '=TEMPAT_RAPOR()',
        label: 'Tempat / Kota Rapor Saja',
        syntax: '=TEMPAT_RAPOR()',
        description: 'Menampilkan nama kota pengeluaran rapor saja tanpa tanggal (sendiri)',
        category: 'formula'
    },
    {
        token: '=TANGGAL_RAPOR',
        insertText: '=TANGGAL_RAPOR()',
        label: 'Tanggal Rapor Saja (Sesuai Cetak)',
        syntax: '=TANGGAL_RAPOR()',
        description: 'Tanggal pengeluaran rapor saja mengikuti format di pengaturan Cetak Rapor',
        category: 'formula'
    },
    {
        token: '=TANGGAL_RAPOR_GABUNGAN',
        insertText: '=TANGGAL_RAPOR_GABUNGAN()',
        label: 'Tanggal Rapor Hijriah & Masehi',
        syntax: '=TANGGAL_RAPOR_GABUNGAN()',
        description: 'Tanggal Hijriah & Masehi gabungan tanpa nama kota (opsi: "masehi_dulu", "dua_baris")',
        category: 'formula'
    },
    {
        token: '=TANGGAL_RAPOR_MASEHI',
        insertText: '=TANGGAL_RAPOR_MASEHI()',
        label: 'Tanggal Rapor Masehi Saja',
        syntax: '=TANGGAL_RAPOR_MASEHI()',
        description: 'Tanggal Masehi pengeluaran rapor saja (misal: 20 Juni 2026)',
        category: 'formula'
    },
    {
        token: '=TANGGAL_RAPOR_HIJRIAH',
        insertText: '=TANGGAL_RAPOR_HIJRIAH()',
        label: 'Tanggal Rapor Hijriah Saja',
        syntax: '=TANGGAL_RAPOR_HIJRIAH()',
        description: 'Tanggal Hijriah pengeluaran rapor saja (misal: 5 Muharram 1448 H)',
        category: 'formula'
    }
];

export type TextTransformMode = 'none' | 'uppercase' | 'lowercase' | 'capitalize' | 'sentence';

export interface FormulaEvalMeta {
    rank?: number;
    rankKelas?: number;
    rankJenjang?: number;
    rankGlobal?: number;
    tahunAjaran?: string;          // otomatis (mengikuti hijriEnabled di Data Master)
    tahunAjaranMasehi?: string;    // khusus Masehi (misal "2026/2027")
    tahunAjaranHijriah?: string;   // khusus Hijriah (misal "1448/1449 H")
    tahunAjaranGabungan?: string;  // khusus Gabungan (misal "1448/1449 H / 2026/2027 M")
    semester?: string;
    tempatRapor?: string;                 // misal "Banyumas"
    tanggalRaporOtomatis?: string;        // sesuai formatTanggalRaporDefault di pengaturan Cetak Rapor
    tanggalRaporMasehi?: string;          // misal "20 Juni 2026"
    tanggalRaporSingkat?: string;         // misal "20/06/2026"
    tanggalRaporMasehiArab?: string;      // misal "٢٠ يونيو ٢٠٢٦ م"
    tanggalRaporHijriah?: string;         // misal "5 Muharram 1448 H"
    tanggalRaporHijriahArab?: string;     // misal "٥ محرم ١٤٤٨ هـ"
    tanggalRaporGabungan?: string;        // misal "5 Muharram 1448 H / 20 Juni 2026 M"
    tanggalRaporMasehiHijriah?: string;   // misal "20 Juni 2026 M / 5 Muharram 1448 H"
    classAverages?: Record<string, number>; // rata-rata kelas per kunci mapel (misal { FIQIH: 84.35 })
    classOverallAverage?: number;           // rata-rata umum seluruh mapel di kelas/rombel
    kkmLookup?: Record<string, number>;     // peta nama/kode mapel ternormalisasi -> nilai KKM dari Data Master
    defaultKkm?: number;                    // KKM standar marhalah/pondok jika mapel manual belum terdaftar di Data Master
    rowDetectedKkm?: number;                // KKM hasil deteksi otomatis baris aktif (saat memanggil =KKM() tanpa argumen)
    decimalPlaces?: number;                 // jumlah digit desimal sel (0..4) agar evaluasi rumus tidak membulatkan terlalu dini
}

/**
 * Normalisasi kunci variabel mata pelajaran untuk pencocokan rata-rata kelas secara konsisten
 */
export function normalizeSubjectKeyForAvg(rawKey: string): string {
    return rawKey.trim().replace(/^\$/, '').toUpperCase().replace(/[\s-]+/g, '_');
}

// ============================================================================
// SMART DATA MASTER KKM & MATA PELAJARAN MATCHING ENGINE
// ============================================================================

const MAPEL_WORD_SYNONYM_MAP: Record<string, string> = {
    FIQH: 'FIQIH',
    FIKIH: 'FIQIH',
    FEQIH: 'FIQIH',
    TAHFIDZ: 'TAHFIZH',
    TAHFIZ: 'TAHFIZH',
    TAHFIDH: 'TAHFIZH',
    HIFDZ: 'TAHFIZH',
    HIFZ: 'TAHFIZH',
    SHARAF: 'SHOROF',
    SOROF: 'SHOROF',
    SARAF: 'SHOROF',
    SHORF: 'SHOROF',
    NAHU: 'NAHWU',
    AQIDAH: 'AKIDAH',
    AKHLAQ: 'AKHLAK',
    AHLAQ: 'AKHLAK',
    AHLAK: 'AKHLAK',
    QURAN: 'ALQURAN',
    HADIS: 'HADITS',
    HADIST: 'HADITS',
    ALHADITS: 'HADITS',
    ALHADIS: 'HADITS',
    IMLAK: 'IMLA',
    KHAT: 'KHOT',
    KHATH: 'KHOT',
    MUHADASAH: 'MUHADATSAH',
    MUTHOLAAH: 'MUTHALAAH',
    MUTOLAAH: 'MUTHALAAH',
    INSYAK: 'INSYA',
    BALAGHOH: 'BALAGHAH',
    FAROID: 'FARAIDH',
    FAROIDH: 'FARAIDH',
    USUL: 'USHUL',
    MUSTHOLAH: 'MUSTHALAH',
    MTK: 'MATEMATIKA',
    PKN: 'PPKN',
    PENJAS: 'PJOK',
    PENJASKES: 'PJOK',
    PENJASORKES: 'PJOK',
    OLAHRAGA: 'PJOK',
    TIK: 'INFORMATIKA',
    BIND: 'BAHASA_INDONESIA',
    BINDO: 'BAHASA_INDONESIA'
};

const MAPEL_PHRASE_REPLACEMENTS: Array<[RegExp, string]> = [
    [/^(?:B|BHS|BASA)_+ARAB$/i, 'BAHASA_ARAB'],
    [/(?:^|_)(?:B|BHS)_+ARAB(?=_|$)/gi, '_BAHASA_ARAB_'],
    [/^(?:AL_)?LUGHAH_(?:AL_)?ARABIYYAH$/i, 'BAHASA_ARAB'],
    [/^(?:B|BHS)_+INGGRIS$/i, 'BAHASA_INGGRIS'],
    [/(?:^|_)(?:B|BHS)_+INGGRIS(?=_|$)/gi, '_BAHASA_INGGRIS_'],
    [/^ENGLISH$/i, 'BAHASA_INGGRIS'],
    [/^(?:B|BHS)_+(?:INDONESIA|INDO)$/i, 'BAHASA_INDONESIA'],
    [/(?:^|_)(?:B|BHS)_+(?:INDONESIA|INDO)(?=_|$)/gi, '_BAHASA_INDONESIA_'],
    [/^(?:B|BHS)_+JAWA$/i, 'BAHASA_JAWA'],
    [/^(?:B|BHS)_+SUNDA$/i, 'BAHASA_SUNDA'],
    [/^(?:B|BHS)_+DAERAH$/i, 'BAHASA_DAERAH'],
    [/^AL_+QURAN/i, 'ALQURAN'],
    [/_AL_+QURAN/gi, '_ALQURAN'],
    [/^AL_+HADITS/i, 'HADITS'],
    [/_AL_+HADITS/gi, '_HADITS'],
    [/^PENDIDIKAN_AGAMA_ISLAM(?:_DAN_BUDI_PEKERTI)?$/i, 'PAI'],
    [/^PENDIDIKAN_(?:PANCASILA(?:_DAN_KEWARGANEGARAAN)?|KEWARGANEGARAAN)$/i, 'PPKN'],
    [/^SEJARAH_KEBUDAYAAN_ISLAM$/i, 'SKI']
];

const NON_SUBJECT_ROW_LABELS = new Set([
    'NO',
    'NOMOR',
    'URUT',
    'MATA_PELAJARAN',
    'MATAPELAJARAN',
    'MAPEL',
    'NAMA_MAPEL',
    'NAMA_MATA_PELAJARAN',
    'KOMPONEN',
    'BIDANG_STUDI',
    'KITAB',
    'MATERI',
    'KKM',
    'KBM',
    'KRITERIA_KETUNTASAN_MINIMAL',
    'STANDAR_KETUNTASAN',
    'NILAI',
    'NILAI_ANGKA',
    'NILAI_HURUF',
    'NILAI_RAPOR',
    'NILAI_AKHIR',
    'ANGKA',
    'ANGKA_ARAB',
    'HURUF',
    'TERBILANG',
    'TERBILANG_HURUF',
    'PREDIKAT',
    'TAQDIR',
    'DESKRIPSI',
    'CAPAIAN_KOMPETENSI',
    'KETERANGAN',
    'CATATAN',
    'CATATAN_WALI_KELAS',
    'RERATA_KELAS',
    'RATA_RATA_KELAS',
    'NRK',
    'JUMLAH',
    'JUMLAH_NILAI',
    'TOTAL',
    'TOTAL_NILAI',
    'RATA_RATA',
    'RATA_RATA_NILAI',
    'RERATA',
    'PERINGKAT',
    'PERINGKAT_KELAS',
    'RANKING',
    'SAKIT',
    'IZIN',
    'IJIN',
    'ALPHA',
    'ALPA',
    'KEHADIRAN',
    'KETIDAKHADIRAN'
]);

/**
 * Mengubah nama/kode mapel menjadi kunci pencocokan kanonik (mendukung ejaan Latin, Arab, transliterasi, dan singkatan umum)
 */
export function canonicalizeMapelLookupKey(raw: string, applySynonyms = true): string {
    if (!raw) return '';
    // Hapus apostrof/ain/hamzah transkripsi agar Al-Qur'an, Al-Quran, Muthala'ah, Imla' seragam
    const withoutQuotes = raw
        .trim()
        .replace(/^\$+/, '')
        .replace(/['’‘`ʼʻʿʾ]/g, '');

    const rawTokens = withoutQuotes
        .toUpperCase()
        .split(/[^A-Z0-9\u0600-\u06FF]+/)
        .filter(Boolean);

    if (rawTokens.length === 0) return '';
    if (!applySynonyms) {
        return rawTokens.join('_');
    }

    const mappedTokens = rawTokens.map(tok => MAPEL_WORD_SYNONYM_MAP[tok] || tok);
    let joined = mappedTokens.join('_');

    for (const [pattern, replacement] of MAPEL_PHRASE_REPLACEMENTS) {
        joined = joined.replace(pattern, replacement);
    }

    return joined.replace(/_+/g, '_').replace(/^_+|_+$/g, '');
}

/**
 * Mengekstrak kandidat kunci pencocokan dari teks mapel ketikan manual maupun kode variabel ($KEY).
 * Contoh:
 * - "1. Fiqih (Safinatun Najah)" -> ["FIQIH_SAFINATUN_NAJAH", "FIQIH", "SAFINATUN_NAJAH"]
 * - "B. Arab" -> ["B_ARAB", "BAHASA_ARAB"]
 * - "Al-Qur'an & Hadits" -> ["ALQURAN_HADITS"]
 * - "NILAI_TAHFIDZ_PAS" -> ["TAHFIDZ", "TAHFIZH"]
 */
export function extractMapelLookupCandidates(raw: string): string[] {
    if (!raw) return [];
    const cleaned = raw.trim().replace(/^\$+/, '');
    if (!cleaned) return [];

    const textVariants: string[] = [];
    const pushVariant = (v: string) => {
        const t = v.trim();
        if (t && !textVariants.includes(t)) {
            textVariants.push(t);
        }
    };

    // Hilangkan prefix KKM_ bila dipanggil dari tag $KKM_<MAPEL>
    const baseInput = cleaned.replace(/^KKM_+/i, '');
    pushVariant(baseInput);

    // Hilangkan penomoran di awal baris ("1. ", "10) ", "١. ", "- ", "Mapel: "), namun JANGAN merusak "B. Arab" / "B. Inggris" / "B. Indo"
    const withoutPrefixLabel = baseInput.replace(/^(?:mata\s+pelajaran|mapel)\s*[:.\-]\s*/i, '').trim();
    pushVariant(withoutPrefixLabel);

    const numericBulletStripped = withoutPrefixLabel.replace(/^[0-9٠-٩]{1,2}\s*[.)\-:]\s*/, '').trim();
    pushVariant(numericBulletStripped);

    if (!/^b\.\s*(?:arab|inggris|indo|indonesia|jawa|sunda|madura|daerah)\b/i.test(numericBulletStripped)) {
        const alphaBulletStripped = numericBulletStripped.replace(/^(?:[a-z]|[ivxlcdm]{1,4})\s*[.)]\s+/i, '').trim();
        pushVariant(alphaBulletStripped);
    }

    // Ekstrak nama utama sebelum (...) dan isi di dalam (...) — misal "Fiqih (Safinatun Najah)" atau "Sejarah Kebudayaan Islam (SKI)"
    const snapshotForParts = [...textVariants];
    for (const v of snapshotForParts) {
        const parenMatch = v.match(/^([^(]+)\(([^)]+)\)/);
        if (parenMatch) {
            pushVariant(parenMatch[1]);
            pushVariant(parenMatch[2]);
        }
        // Ekstrak pemisah kitab / sub-mapel ("Fiqih - Safinatun Najah", "Fiqih: Ibadah", "Al-Qur'an / Tahfizh")
        const splitParts = v.split(/\s*(?:\s-\s|:\s|\/)\s*/).map(p => p.trim()).filter(p => p.length >= 2);
        if (splitParts.length >= 2) {
            splitParts.forEach(pushVariant);
        }
        // Hilangkan prefix/suffix variabel nilai seperti NILAI_FIQIH_PAS -> FIQIH
        const strippedAffix = v
            .replace(/^(?:NILAI|ANGKA|SKOR|MAPEL)[_\s-]+/i, '')
            .replace(/[_\s-]+(?:UH\d*|PTS|PAS|PAT|UTS|UAS|HARIAN|UJIAN|PRAKTEK|PRAKTIK|TEORI|NILAI|ANGKA)$/i, '')
            .trim();
        pushVariant(strippedAffix);
    }

    const keysOut: string[] = [];
    const pushKey = (k: string) => {
        if (k && !keysOut.includes(k)) {
            keysOut.push(k);
        }
    };

    for (const variant of textVariants) {
        const exactKey = canonicalizeMapelLookupKey(variant, false);
        const canonKey = canonicalizeMapelLookupKey(variant, true);
        pushKey(exactKey);
        pushKey(canonKey);

        // Variasi tanpa kata hubung ("Al-Qur'an dan Hadits" <-> "Al-Qur'an Hadits")
        if (canonKey.includes('_')) {
            const noConj = canonKey
                .split('_')
                .filter(tok => tok !== 'DAN' && tok !== 'WA' && tok !== 'SERTA')
                .join('_');
            if (noConj && noConj !== canonKey) {
                pushKey(noConj);
            }
        }
    }

    return keysOut;
}

/**
 * Menghitung KKM standar dominan pada suatu Marhalah/Jenjang (atau seluruh pondok jika jenjang belum memiliki mapel).
 * Jika mayoritas mapel di Marhalah memiliki KKM 75, maka KKM standar otomatis bernilai 75 (default 70 bila kosong).
 */
export function computeDefaultKkmForPool(mataPelajaran?: MataPelajaran[], preferredJenjangId?: number): number {
    const all = (mataPelajaran || []).filter(mp => typeof mp.kkm === 'number' && isFinite(mp.kkm) && mp.kkm > 0);
    if (all.length === 0) return 70;

    const jenjangPool = preferredJenjangId
        ? all.filter(mp => Number(mp.jenjangId) === Number(preferredJenjangId))
        : [];
    const targetPool = jenjangPool.length > 0 ? jenjangPool : all;

    const freq = new Map<number, number>();
    let bestVal = targetPool[0].kkm;
    let bestCount = 0;
    for (const mp of targetPool) {
        const k = Math.round(Number(mp.kkm));
        const nextCount = (freq.get(k) || 0) + 1;
        freq.set(k, nextCount);
        if (nextCount > bestCount) {
            bestCount = nextCount;
            bestVal = k;
        }
    }
    return bestVal || 70;
}

/**
 * Mencari entitas MataPelajaran dari Data Master berdasarkan nama ketikan manual, kodeMapel, atau kode $KEY.
 * Memprioritaskan mata pelajaran pada Marhalah/Jenjang aktif terlebih dahulu, lalu lintas jenjang sebagai cadangan.
 */
export function findMapelInMasterPool(
    queries: string | string[],
    mataPelajaran?: MataPelajaran[],
    preferredJenjangId?: number
): MataPelajaran | undefined {
    const list = mataPelajaran || [];
    if (list.length === 0) return undefined;

    const rawList = (Array.isArray(queries) ? queries : [queries])
        .map(q => (q || '').trim())
        .filter(Boolean);
    if (rawList.length === 0) return undefined;

    // 1. Cek referensi ID eksplisit (misal MAPEL_12 atau $KKM_MAPEL_12)
    for (const q of rawList) {
        const idMatch = q.replace(/^\$+/, '').replace(/^KKM_+/i, '').match(/^(?:MAPEL|ID)[_:](\d+)$/i);
        if (idMatch) {
            const targetId = Number(idMatch[1]);
            const byId = list.find(m => Number(m.id) === targetId);
            if (byId) return byId;
        }
    }

    const pools: MataPelajaran[][] = [];
    if (preferredJenjangId) {
        const sameJenjang = list.filter(m => Number(m.jenjangId) === Number(preferredJenjangId));
        const otherJenjang = list.filter(m => Number(m.jenjangId) !== Number(preferredJenjangId));
        if (sameJenjang.length > 0) pools.push(sameJenjang);
        if (otherJenjang.length > 0) pools.push(otherJenjang);
    } else {
        pools.push(list);
    }

    const preparedPoolEntries = pools.map(pool =>
        pool.map(mp => ({
            mp,
            exactKeys: [
                canonicalizeMapelLookupKey(mp.kodeMapel || '', false),
                canonicalizeMapelLookupKey(mp.nama || '', false)
            ].filter(Boolean),
            candidateKeys: [
                ...(mp.kodeMapel ? extractMapelLookupCandidates(mp.kodeMapel) : []),
                ...extractMapelLookupCandidates(mp.nama || '')
            ]
        }))
    );

    for (const q of rawList) {
        const qExact = canonicalizeMapelLookupKey(q.replace(/^KKM_+/i, ''), false);
        const qCandidates = extractMapelLookupCandidates(q);
        if (qCandidates.length === 0) continue;

        for (const entries of preparedPoolEntries) {
            // Prioritas A: Kecocokan persis nama atau kodeMapel
            if (qExact) {
                const exactHit = entries.find(e => e.exactKeys.includes(qExact));
                if (exactHit) return exactHit.mp;
            }
            // Prioritas B: Kecocokan kandidat kanonik / sinonim / kitab dalam kurung
            for (const cand of qCandidates) {
                if (!cand || NON_SUBJECT_ROW_LABELS.has(cand)) continue;
                const candHit = entries.find(e => e.candidateKeys.includes(cand));
                if (candHit) return candHit.mp;
            }
        }
    }

    return undefined;
}

/**
 * Membangun kamus pencarian cepat KKM dari Data Master Mata Pelajaran (mendukung kodeMapel, nama lengkap, sinonim, dan ID)
 */
export function buildMasterKkmLookupMap(
    mataPelajaran?: MataPelajaran[],
    preferredJenjangId?: number
): Record<string, number> {
    const lookup: Record<string, number> = {};
    const list = mataPelajaran || [];
    if (list.length === 0) return lookup;

    const defaultKkm = computeDefaultKkmForPool(list, preferredJenjangId);
    // Urutkan agar jenjang lain diisi lebih dulu, kemudian ditimpa oleh jenjang aktif (prioritas tertinggi)
    const ordered = preferredJenjangId
        ? [
              ...list.filter(m => Number(m.jenjangId) !== Number(preferredJenjangId)),
              ...list.filter(m => Number(m.jenjangId) === Number(preferredJenjangId))
          ]
        : list;

    for (const mp of ordered) {
        const kkmVal = typeof mp.kkm === 'number' && isFinite(mp.kkm) && mp.kkm > 0 ? mp.kkm : defaultKkm;
        lookup[`MAPEL_${mp.id}`] = kkmVal;
        lookup[`ID_${mp.id}`] = kkmVal;

        const keys = [
            ...(mp.kodeMapel ? extractMapelLookupCandidates(mp.kodeMapel) : []),
            ...extractMapelLookupCandidates(mp.nama || '')
        ];
        for (const k of keys) {
            if (k && !NON_SUBJECT_ROW_LABELS.has(k)) {
                lookup[k] = kkmVal;
            }
        }
    }

    return lookup;
}

export interface RowKkmInspectionResult {
    matchedMapel?: MataPelajaran;
    detectedLabel?: string;
    detectedInputKey?: string;
    kkmValue: number | null;
    defaultKkm: number;
    source: 'master_label' | 'master_key' | 'fallback_jenjang' | 'empty_row';
}

function isMeaningfulSubjectLabelText(raw?: string): boolean {
    if (!raw) return false;
    const t = raw.trim();
    if (!t || t.startsWith('$') || t.startsWith('=')) return false;
    // Abaikan angka murni / nomor urut ("1", "2.", "١", "75", "-")
    if (/^(?:[+-]?[0-9٠-٩]+(?:[.,][0-9٠-٩]+)?%?|[0-9٠-٩]{1,3}[.)\-]|[IVXLCDM]{1,4}[.)]|[.:\-/#()]+)$/i.test(t)) {
        return false;
    }
    if (!/[A-Za-z\u0600-\u06FF]/.test(t)) return false;
    const exactNorm = canonicalizeMapelLookupKey(t, false);
    if (!exactNorm || NON_SUBJECT_ROW_LABELS.has(exactNorm)) return false;
    return true;
}

/**
 * Mendeteksi mata pelajaran pada suatu baris tabel Rapor secara otomatis (baik dari teks nama mapel ketikan manual
 * maupun dari kode variabel $KEY sel nilai pada baris yang sama) lalu mengambil nilai KKM-nya dari Data Master.
 */
export function inspectSheetRowKkm(params: {
    sheetCells?: GridCell[][];
    row: number;
    col: number;
    mataPelajaran?: MataPelajaran[];
    preferredJenjangId?: number;
}): RowKkmInspectionResult {
    const { sheetCells, row, col, mataPelajaran = [], preferredJenjangId } = params;
    const defaultKkm = computeDefaultKkmForPool(mataPelajaran, preferredJenjangId);

    if (!sheetCells || row < 0 || row >= sheetCells.length) {
        return { kkmValue: null, defaultKkm, source: 'empty_row' };
    }

    const colCount = sheetCells[row]?.length || 0;
    const resolveMasterAt = (r: number, c: number): GridCell | undefined => {
        const direct = sheetCells[r]?.[c];
        if (direct && !direct.hidden) return direct;
        for (let mr = r; mr >= 0; mr--) {
            for (let mc = c; mc >= 0; mc--) {
                const cand = sheetCells[mr]?.[mc];
                if (cand && !cand.hidden) {
                    const rSpan = cand.rowSpan || 1;
                    const cSpan = cand.colSpan || 1;
                    if (r >= mr && r < mr + rSpan && c >= mc && c < mc + cSpan) {
                        return cand;
                    }
                }
            }
        }
        return direct;
    };

    const seenCellCoords = new Set<string>();
    const labelCells: Array<{ cell: GridCell; isSingleRow: boolean; isLeft: boolean; dist: number }> = [];
    const inputKeys: string[] = [];

    for (let cc = 0; cc < colCount; cc++) {
        if (cc === col) continue;
        const mCell = resolveMasterAt(row, cc);
        if (!mCell || mCell.hidden) continue;
        if (mCell.row === row && mCell.col === col) continue;

        const coordId = `${mCell.row}:${mCell.col}`;
        if (seenCellCoords.has(coordId)) continue;
        seenCellCoords.add(coordId);

        if ((mCell.type === 'input' || mCell.type === 'dropdown') && mCell.key?.trim()) {
            const k = mCell.key.trim();
            const normK = canonicalizeMapelLookupKey(k, false);
            if (normK && !NON_SUBJECT_ROW_LABELS.has(normK)) {
                inputKeys.push(k);
            }
        }

        if (mCell.type === 'label' && isMeaningfulSubjectLabelText(mCell.value)) {
            labelCells.push({
                cell: mCell,
                isSingleRow: (mCell.rowSpan || 1) === 1,
                isLeft: mCell.col < col,
                dist: Math.abs(mCell.col - col)
            });
        }
    }

    // Prioritaskan sel teks yang khusus milik baris ini (rowSpan === 1) dibanding sel kategori vertikal yang di-merge lintas baris,
    // lalu prioritaskan sel di sebelah kiri kolom KKM (atau sebelah kanan untuk tabel Rapor Arab RTL) berdasarkan kedekatan.
    labelCells.sort((a, b) => {
        if (a.isSingleRow !== b.isSingleRow) return a.isSingleRow ? -1 : 1;
        if (a.isLeft !== b.isLeft) return a.isLeft ? -1 : 1;
        return a.dist - b.dist;
    });

    // 1. Cek kecocokan teks nama mapel manual dengan Data Master Mata Pelajaran
    for (const item of labelCells) {
        const matched = findMapelInMasterPool(item.cell.value, mataPelajaran, preferredJenjangId);
        if (matched) {
            return {
                matchedMapel: matched,
                detectedLabel: item.cell.value.trim(),
                detectedInputKey: inputKeys[0],
                kkmValue: typeof matched.kkm === 'number' && isFinite(matched.kkm) ? matched.kkm : defaultKkm,
                defaultKkm,
                source: 'master_label'
            };
        }
    }

    // 2. Cek kecocokan kode variabel input ($KEY) pada baris yang sama (berguna misal nama mapel memakai huruf Arab namun $KEY memakai kode Latin $FIQIH)
    for (const key of inputKeys) {
        const matched = findMapelInMasterPool(key, mataPelajaran, preferredJenjangId);
        if (matched) {
            return {
                matchedMapel: matched,
                detectedLabel: labelCells[0]?.cell.value.trim(),
                detectedInputKey: key,
                kkmValue: typeof matched.kkm === 'number' && isFinite(matched.kkm) ? matched.kkm : defaultKkm,
                defaultKkm,
                source: 'master_key'
            };
        }
    }

    // 3. Jika baris memang memiliki nama mapel manual (yang belum didaftarkan di Data Master) atau sel nilai, gunakan KKM standar Marhalah
    const primarySingleRowLabel = labelCells.find(l => l.isSingleRow)?.cell.value.trim();
    if (primarySingleRowLabel || inputKeys.length > 0) {
        return {
            detectedLabel: primarySingleRowLabel || labelCells[0]?.cell.value.trim(),
            detectedInputKey: inputKeys[0],
            kkmValue: defaultKkm,
            defaultKkm,
            source: 'fallback_jenjang'
        };
    }

    return {
        kkmValue: null,
        defaultKkm,
        source: 'empty_row'
    };
}

/**
 * Mengubah teks menjadi Kapital Setiap Kata (Title Case / Proper Case) termasuk bila sumbernya HURUF BESAR SEMUA
 */
export function toTitleCase(input: string): string {
    if (!input) return '';
    return input
        .toLowerCase()
        .replace(/(^|[\s\-/'".()[\]]+)([a-zà-ÿ])/g, (_m, sep: string, ch: string) => `${sep}${ch.toUpperCase()}`);
}

/**
 * Mengubah teks menjadi Kapital Awal Kalimat (Sentence case)
 */
export function toSentenceCase(input: string): string {
    if (!input) return '';
    return input
        .toLowerCase()
        .replace(/(^\s*|[.!?]\s+|\n\s*)([a-zà-ÿ])/g, (_m, sep: string, ch: string) => `${sep}${ch.toUpperCase()}`);
}

/**
 * Menerapkan format huruf sel (UPPERCASE, lowercase, Title Case, Sentence case) secara konsisten di kanvas, preview, dan cetak PDF
 */
export function applyCellTextTransform(text: string, mode?: TextTransformMode): string {
    if (!text || !mode || mode === 'none') return text;
    if (mode === 'uppercase') return text.toUpperCase();
    if (mode === 'lowercase') return text.toLowerCase();
    if (mode === 'capitalize') return toTitleCase(text);
    if (mode === 'sentence') return toSentenceCase(text);
    return text;
}

/**
 * Pembulatan half-away-from-zero bebas galat floating-point (seperti perilaku standar Excel)
 */
export function roundHalfAwayFromZero(num: number, digits: number): number {
    if (!isFinite(num) || isNaN(num)) return num;
    const d = Math.max(0, Math.min(6, Math.floor(digits)));
    const factor = Math.pow(10, d);
    const sign = num < 0 ? -1 : 1;
    const rounded = (sign * Math.round((Math.abs(num) + Number.EPSILON) * factor)) / factor;
    return Object.is(rounded, -0) ? 0 : rounded;
}

/**
 * Format tampilan angka sel ala Excel (.0, .00, .000, atau bilangan bulat 0 desimal).
 * Aman terhadap teks non-angka maupun nomor identitas berawalan nol seperti NISN/NIK/No. HP ("0081234567").
 */
export function formatCellNumericDisplay(val: string | number, decimalPlaces?: number): string {
    if (decimalPlaces === undefined || decimalPlaces === null || decimalPlaces < 0) {
        return String(val);
    }
    const rawStr = String(val);
    const trimmed = rawStr.trim();
    if (!trimmed || trimmed === '-') return rawStr;

    // Abaikan string angka dengan leading zero (misal NISN "0081234567" atau telepon "08123456789")
    if (!/^-?(?:0|[1-9]\d*)(?:[.,]\d+)?$/.test(trimmed)) {
        return rawStr;
    }

    const num = Number(trimmed.replace(',', '.'));
    if (!isFinite(num) || isNaN(num)) return rawStr;

    const d = Math.max(0, Math.min(4, Math.floor(decimalPlaces)));
    const rounded = roundHalfAwayFromZero(num, d);
    const formatted = rounded.toFixed(d);
    if (trimmed.includes(',') && !trimmed.includes('.')) {
        return formatted.replace('.', ',');
    }
    return formatted;
}

const SATUAN = [
    '',
    'Satu',
    'Dua',
    'Tiga',
    'Empat',
    'Lima',
    'Enam',
    'Tujuh',
    'Delapan',
    'Sembilan',
    'Sepuluh',
    'Sebelas'
];

function terbilangBulatPositif(n: number): string {
    const num = Math.floor(Math.abs(n));
    if (num === 0) return '';
    if (num < 12) return SATUAN[num];
    if (num < 20) return `${terbilangBulatPositif(num - 10)} Belas`.trim();
    if (num < 100) {
        const puluh = Math.floor(num / 10);
        const sisa = num % 10;
        return `${terbilangBulatPositif(puluh)} Puluh ${terbilangBulatPositif(sisa)}`.trim();
    }
    if (num < 200) {
        return `Seratus ${terbilangBulatPositif(num - 100)}`.trim();
    }
    if (num < 1000) {
        const ratus = Math.floor(num / 100);
        const sisa = num % 100;
        return `${terbilangBulatPositif(ratus)} Ratus ${terbilangBulatPositif(sisa)}`.trim();
    }
    if (num < 2000) {
        return `Seribu ${terbilangBulatPositif(num - 1000)}`.trim();
    }
    if (num < 1_000_000) {
        const ribu = Math.floor(num / 1000);
        const sisa = num % 1000;
        return `${terbilangBulatPositif(ribu)} Ribu ${terbilangBulatPositif(sisa)}`.trim();
    }
    if (num < 1_000_000_000) {
        const juta = Math.floor(num / 1_000_000);
        const sisa = num % 1_000_000;
        return `${terbilangBulatPositif(juta)} Juta ${terbilangBulatPositif(sisa)}`.trim();
    }
    return String(num);
}

/**
 * Mengubah angka menjadi teks Bahasa Indonesia (contoh: 85 -> "Delapan Puluh Lima", 85.5 -> "Delapan Puluh Lima Koma Lima")
 */
export function angkaKeTerbilang(input: number | string): string {
    if (input === null || input === undefined) return '-';
    const raw = String(input).trim().replace(',', '.');
    if (raw === '' || raw === '-') return '-';

    const parsed = Number(raw);
    if (isNaN(parsed)) return String(input);

    if (parsed === 0) return 'Nol';

    const isNegative = parsed < 0;
    const absStr = Math.abs(parsed).toString();
    const [intPartStr, decPartStr] = absStr.split('.');
    const intPart = parseInt(intPartStr, 10) || 0;

    let result = intPart === 0 ? 'Nol' : terbilangBulatPositif(intPart);

    if (decPartStr && decPartStr.length > 0) {
        const decWords = decPartStr
            .slice(0, 2)
            .split('')
            .map(d => (d === '0' ? 'Nol' : SATUAN[parseInt(d, 10)] || ''))
            .filter(Boolean)
            .join(' ');
        if (decWords) {
            result = `${result} Koma ${decWords}`;
        }
    }

    return isNegative ? `Minus ${result}` : result;
}

const ARABIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

/**
 * Mengubah angka Latin (0-9) menjadi angka Arab Timur (٠-٩)
 */
export function angkaKeArab(input: number | string): string {
    if (input === null || input === undefined) return '-';
    const raw = String(input).trim();
    if (raw === '') return '-';
    return raw
        .replace(/([0-9]),([0-9])/g, '$1٫$2')
        .replace(/([0-9])\.([0-9])/g, '$1٫$2')
        .replace(/[0-9]/g, d => ARABIC_DIGITS[parseInt(d, 10)] ?? d)
        .replace(/\./g, '٫');
}

/**
 * Konversi nilai angka ke predikat huruf (A-E) atau taqdir pesantren
 */
export function nilaiKePredikatOtomatis(nilaiInput: number | string, mode: string = 'huruf'): string {
    const raw = String(nilaiInput ?? '').trim().replace(',', '.');
    if (!raw || raw === '-') return '-';
    const n = Number(raw);
    if (isNaN(n)) return '-';

    const m = mode.toLowerCase();
    if (m === 'pesantren' || m === 'arab' || m === 'taqdir') {
        if (n >= 90) return 'Mumtaz';
        if (n >= 80) return 'Jayyid Jiddan';
        if (n >= 70) return 'Jayyid';
        if (n >= 60) return 'Maqbul';
        return 'Rasib';
    }
    if (m === 'arab_script') {
        if (n >= 90) return 'ممتاز';
        if (n >= 80) return 'جيد جدا';
        if (n >= 70) return 'جيد';
        if (n >= 60) return 'مقبول';
        return 'راسب';
    }
    if (m === 'deskripsi') {
        if (n >= 90) return 'Sangat Baik';
        if (n >= 80) return 'Baik';
        if (n >= 70) return 'Cukup';
        return 'Perlu Bimbingan';
    }
    // Default huruf A-E
    if (n >= 90) return 'A';
    if (n >= 80) return 'B';
    if (n >= 70) return 'C';
    if (n >= 60) return 'D';
    return 'E';
}

/**
 * Memecah argumen fungsi tingkat atas dengan menghormati tanda kutip dan kurung bersarang.
 * Mendukung pemisah koma (,) maupun titik koma (;) seperti Excel regional Indonesia.
 */
export function splitTopLevelArgs(argsStr: string): string[] {
    const result: string[] = [];
    let current = '';
    let depth = 0;
    let inQuote: '"' | "'" | null = null;

    for (let i = 0; i < argsStr.length; i++) {
        const ch = argsStr[i];
        if (inQuote) {
            if (ch === inQuote && argsStr[i - 1] !== '\\') {
                inQuote = null;
            }
            current += ch;
            continue;
        }
        if (ch === '"' || ch === "'") {
            inQuote = ch;
            current += ch;
            continue;
        }
        if (ch === '(') {
            depth++;
            current += ch;
            continue;
        }
        if (ch === ')') {
            depth = Math.max(0, depth - 1);
            current += ch;
            continue;
        }
        if ((ch === ',' || ch === ';') && depth === 0) {
            result.push(current.trim());
            current = '';
            continue;
        }
        current += ch;
    }
    if (current.trim() !== '' || result.length > 0) {
        result.push(current.trim());
    }
    return result;
}

function isSingleQuotedLiteral(str: string): boolean {
    const t = str.trim();
    if (t.length < 2) return false;
    const quote = t[0];
    if (quote !== '"' && quote !== "'") return false;
    for (let i = 1; i < t.length; i++) {
        if (t[i] === quote && t[i - 1] !== '\\') {
            return i === t.length - 1;
        }
    }
    return false;
}

function unquote(str: string): string {
    const t = str.trim();
    if (isSingleQuotedLiteral(t)) {
        const q = t[0];
        const inner = t.slice(1, -1);
        return q === '"'
            ? inner.replace(/\\"/g, '"').replace(/\\\\/g, '\\')
            : inner.replace(/\\'/g, "'").replace(/\\\\/g, '\\');
    }
    // Pertahankan spasi asli pada string yang sudah dievaluasi/di-unquote sebelumnya (misal "Semester " atau " ")
    return str;
}

function joinTextArgsSmart(evalArgs: string[]): string {
    const parts = evalArgs.map(unquote);
    if (parts.length === 0) return '';
    if (parts.length === 1) return parts[0];
    return parts.reduce((acc, part, idx) => {
        if (idx === 0) return part;
        if (!acc) return part;
        if (!part) return acc;
        return (/\s$/.test(acc) || /^\s/.test(part)) ? (acc + part) : `${acc} ${part}`;
    }, '');
}

function parseNumericValues(evaluatedArgs: string[]): number[] {
    const nums: number[] = [];
    for (const item of evaluatedArgs) {
        const cleaned = unquote(item).trim().replace(',', '.');
        if (cleaned !== '' && cleaned !== '-') {
            const n = Number(cleaned);
            if (!isNaN(n)) nums.push(n);
        }
    }
    return nums;
}

function formatNumberClean(n: number, maxDecimals = 2): string {
    if (!isFinite(n) || isNaN(n)) return '-';
    if (Number.isInteger(n)) return String(n);
    const rounded = roundHalfAwayFromZero(n, maxDecimals);
    return Number(rounded.toFixed(maxDecimals)).toString();
}

/**
 * Evaluator aritmatika aman (+, -, *, /, ^, %, tanda kurung) tanpa eval()
 * Mendukung desimal koma Indonesia (0,4 -> 0.4) dan sel kosong "" / "-" sebagai 0 dalam operasi hitung
 */
function evaluateSafeMath(expr: string): number | null {
    const normalized = expr
        .replace(/""|''|"-"|'-'/g, '0')
        .replace(/(\d),(\d)/g, '$1.$2');
    const s = normalized.replace(/\s+/g, '');
    if (!s || !/[0-9]/.test(s) || !/^[0-9.+\-*/^%()]+$/.test(s)) return null;

    let pos = 0;

    const parseExpression = (): number => {
        let val = parseTerm();
        while (pos < s.length && (s[pos] === '+' || s[pos] === '-')) {
            const op = s[pos++];
            const right = parseTerm();
            val = op === '+' ? val + right : val - right;
        }
        return val;
    };

    const parseTerm = (): number => {
        let val = parsePower();
        while (pos < s.length && (s[pos] === '*' || s[pos] === '/')) {
            const op = s[pos++];
            const right = parsePower();
            val = op === '*' ? val * right : (right === 0 ? 0 : val / right);
        }
        return val;
    };

    const parsePower = (): number => {
        let base = parseUnary();
        if (pos < s.length && s[pos] === '^') {
            pos++;
            const exp = parsePower();
            base = Math.pow(base, exp);
        }
        return base;
    };

    const parseUnary = (): number => {
        if (s[pos] === '+') {
            pos++;
            return parseUnary();
        }
        if (s[pos] === '-') {
            pos++;
            return -parseUnary();
        }
        return parsePostfix();
    };

    const parsePostfix = (): number => {
        let val = parsePrimary();
        while (pos < s.length && s[pos] === '%') {
            pos++;
            val = val / 100;
        }
        return val;
    };

    const parsePrimary = (): number => {
        if (s[pos] === '(') {
            pos++;
            const val = parseExpression();
            if (s[pos] !== ')') return NaN;
            pos++;
            return val;
        }
        const start = pos;
        let dotCount = 0;
        while (pos < s.length && /[0-9.]/.test(s[pos])) {
            if (s[pos] === '.') dotCount++;
            pos++;
        }
        if (start === pos || dotCount > 1) return NaN;
        return parseFloat(s.slice(start, pos));
    };

    try {
        const res = parseExpression();
        if (pos !== s.length || isNaN(res) || !isFinite(res)) return null;
        return res;
    } catch {
        return null;
    }
}

/**
 * Pencocokan kriteria ala Excel untuk COUNTIF, SUMIF, AVERAGEIF (contoh: ">=75", "<70", "<>-", "A", 80)
 */
function matchesExcelCriteria(rawItem: string, rawCriteria: string): boolean {
    const itemStr = unquote(rawItem).trim();
    const critRaw = unquote(rawCriteria).trim();

    let op = '=';
    let rhs = critRaw;
    const opMatch = critRaw.match(/^(>=|<=|<>|!=|==|=|>|<)\s*([\s\S]*)$/);
    if (opMatch) {
        op = opMatch[1];
        rhs = unquote(opMatch[2]).trim();
    }

    const itemNum = Number(itemStr.replace(',', '.'));
    const rhsNum = Number(rhs.replace(',', '.'));
    const itemIsNum = itemStr !== '' && itemStr !== '-' && !isNaN(itemNum) && isFinite(itemNum);
    const rhsIsNum = rhs !== '' && rhs !== '-' && !isNaN(rhsNum) && isFinite(rhsNum);

    if (itemIsNum && rhsIsNum) {
        if (op === '>=') return itemNum >= rhsNum;
        if (op === '<=') return itemNum <= rhsNum;
        if (op === '>') return itemNum > rhsNum;
        if (op === '<') return itemNum < rhsNum;
        if (op === '<>' || op === '!=') return itemNum !== rhsNum;
        return itemNum === rhsNum;
    }

    // Jika kriteria numerik dengan operator urutan (>, <, >=, <=) namun sel kosong/"-", abaikan sel non-angka (seperti perilaku COUNTIF/AVERAGEIF di Excel)
    if ((op === '>' || op === '<' || op === '>=' || op === '<=') && rhsIsNum && !itemIsNum) {
        return false;
    }

    const lLower = itemStr.toLowerCase();
    const rLower = rhs.toLowerCase();
    if (op === '<>' || op === '!=') return lLower !== rLower;
    if (op === '>') return lLower.localeCompare(rLower) > 0;
    if (op === '<') return lLower.localeCompare(rLower) < 0;
    if (op === '>=') return lLower.localeCompare(rLower) >= 0;
    if (op === '<=') return lLower.localeCompare(rLower) <= 0;

    if (rLower.includes('*') || rLower.includes('?')) {
        const pattern = '^' + rLower.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$';
        return new RegExp(pattern, 'i').test(itemStr);
    }
    return lLower === rLower;
}

function evaluateCondition(condExpr: string, meta?: FormulaEvalMeta): boolean {
    const trimmedCond = condExpr.trim();
    const upperCond = trimmedCond.toUpperCase();
    if (upperCond === 'TRUE' || upperCond === 'BENAR') return true;
    if (upperCond === 'FALSE' || upperCond === 'SALAH') return false;

    const ops = ['>=', '<=', '<>', '!=', '==', '=', '>', '<'] as const;
    let inQuote: '"' | "'" | null = null;
    let depth = 0;

    for (const op of ops) {
        inQuote = null;
        depth = 0;
        for (let i = 0; i <= condExpr.length - op.length; i++) {
            const ch = condExpr[i];
            if (inQuote) {
                if (ch === inQuote && condExpr[i - 1] !== '\\') inQuote = null;
                continue;
            }
            if (ch === '"' || ch === "'") {
                inQuote = ch;
                continue;
            }
            if (ch === '(') { depth++; continue; }
            if (ch === ')') { depth = Math.max(0, depth - 1); continue; }

            if (depth === 0 && condExpr.slice(i, i + op.length) === op) {
                // Pastikan '=' tidak mencocokkan bagian dari '>=', '<=', '!=', '=='
                if (op === '=' && (condExpr[i - 1] === '>' || condExpr[i - 1] === '<' || condExpr[i - 1] === '!' || condExpr[i + 1] === '=')) {
                    continue;
                }
                const leftRaw = evaluateFormulaNode(condExpr.slice(0, i), meta, true);
                const rightRaw = evaluateFormulaNode(condExpr.slice(i + op.length), meta, true);
                const lClean = unquote(leftRaw).trim();
                const rClean = unquote(rightRaw).trim();
                const leftNum = Number(lClean.replace(',', '.'));
                const rightNum = Number(rClean.replace(',', '.'));
                const lIsNum = lClean !== '' && lClean !== '-' && !isNaN(leftNum) && isFinite(leftNum);
                const rIsNum = rClean !== '' && rClean !== '-' && !isNaN(rightNum) && isFinite(rightNum);
                const lIsEmpty = lClean === '' || lClean === '-';
                const rIsEmpty = rClean === '' || rClean === '-';

                if (lIsNum && rIsNum) {
                    if (op === '>=') return leftNum >= rightNum;
                    if (op === '<=') return leftNum <= rightNum;
                    if (op === '>') return leftNum > rightNum;
                    if (op === '<') return leftNum < rightNum;
                    if (op === '<>' || op === '!=') return leftNum !== rightNum;
                    return leftNum === rightNum;
                }

                // Jika salah satu sisi angka dan sisi lain sel kosong/"-", perlakukan sel kosong sebagai 0 pada perbandingan numerik (<, >, <=, >=) seperti sel kosong di Excel
                if ((op === '>' || op === '<' || op === '>=' || op === '<=') && ((lIsNum && rIsEmpty) || (rIsNum && lIsEmpty))) {
                    const effL = lIsNum ? leftNum : 0;
                    const effR = rIsNum ? rightNum : 0;
                    if (op === '>=') return effL >= effR;
                    if (op === '<=') return effL <= effR;
                    if (op === '>') return effL > effR;
                    return effL < effR;
                }

                const lStr = lClean.toLowerCase();
                const rStr = rClean.toLowerCase();
                if (op === '<>' || op === '!=') return lStr !== rStr;
                if (op === '>') return lStr.localeCompare(rStr) > 0;
                if (op === '<') return lStr.localeCompare(rStr) < 0;
                if (op === '>=') return lStr.localeCompare(rStr) >= 0;
                if (op === '<=') return lStr.localeCompare(rStr) <= 0;
                return lStr === rStr;
            }
        }
    }

    const val = unquote(evaluateFormulaNode(condExpr, meta, true)).trim().toLowerCase();
    return Boolean(val && val !== '0' && val !== 'false' && val !== 'salah' && val !== '-');
}

function evaluateFormulaNode(expr: string, meta?: FormulaEvalMeta, isNested = false): string {
    const trimmed = expr.trim();
    if (!trimmed) return '';
    const autoDecimals = isNested ? 6 : (meta?.decimalPlaces !== undefined ? Math.max(6, Math.floor(meta.decimalPlaces)) : 2);

    // String literal murni
    if (isSingleQuotedLiteral(trimmed)) {
        return unquote(trimmed);
    }

    // Operator penggabungan teks (&) pada level terluar
    {
        const ampParts: string[] = [];
        let cur = '';
        let depth = 0;
        let inQuote: '"' | "'" | null = null;
        for (let i = 0; i < trimmed.length; i++) {
            const ch = trimmed[i];
            if (inQuote) {
                if (ch === inQuote && trimmed[i - 1] !== '\\') inQuote = null;
                cur += ch;
                continue;
            }
            if (ch === '"' || ch === "'") { inQuote = ch; cur += ch; continue; }
            if (ch === '(') { depth++; cur += ch; continue; }
            if (ch === ')') { depth = Math.max(0, depth - 1); cur += ch; continue; }
            if (ch === '&' && depth === 0) {
                ampParts.push(cur);
                cur = '';
                continue;
            }
            cur += ch;
        }
        if (ampParts.length > 0) {
            ampParts.push(cur);
            return ampParts.map(p => unquote(evaluateFormulaNode(p, meta, false))).join('');
        }
    }

    // Pemanggilan Fungsi: FUNC_NAME(...)
    const fnMatch = trimmed.match(/^([A-Za-z0-9_]+)\s*\(([\s\S]*)\)$/);
    if (fnMatch) {
        // Pastikan kurung penutup di akhir benar-benar pasangan kurung pembuka pertama
        const openIdx = trimmed.indexOf('(');
        let depth = 0;
        let inQuote: '"' | "'" | null = null;
        let closedAtEnd = false;
        for (let i = openIdx; i < trimmed.length; i++) {
            const ch = trimmed[i];
            if (inQuote) {
                if (ch === inQuote && trimmed[i - 1] !== '\\') inQuote = null;
                continue;
            }
            if (ch === '"' || ch === "'") { inQuote = ch; continue; }
            if (ch === '(') depth++;
            else if (ch === ')') {
                depth--;
                if (depth === 0) {
                    closedAtEnd = i === trimmed.length - 1;
                    break;
                }
            }
        }

        if (closedAtEnd) {
            const fnName = fnMatch[1].toUpperCase();
            const rawInner = fnMatch[2];
            const rawArgs = splitTopLevelArgs(rawInner);

            if (fnName === 'IF' || fnName === 'JIKA') {
                if (rawArgs.length >= 2) {
                    const cond = evaluateCondition(rawArgs[0], meta);
                    if (cond) return unquote(evaluateFormulaNode(rawArgs[1], meta, isNested));
                    return rawArgs[2] !== undefined ? unquote(evaluateFormulaNode(rawArgs[2], meta, isNested)) : '';
                }
                return '-';
            }

            if (fnName === 'IFS') {
                for (let idx = 0; idx + 1 < rawArgs.length; idx += 2) {
                    if (evaluateCondition(rawArgs[idx], meta)) {
                        return unquote(evaluateFormulaNode(rawArgs[idx + 1], meta, isNested));
                    }
                }
                return '-';
            }

            if (fnName === 'AND' || fnName === 'DAN') {
                if (rawArgs.length === 0) return 'FALSE';
                return rawArgs.every(a => evaluateCondition(a, meta)) ? 'TRUE' : 'FALSE';
            }

            if (fnName === 'OR' || fnName === 'ATAU') {
                if (rawArgs.length === 0) return 'FALSE';
                return rawArgs.some(a => evaluateCondition(a, meta)) ? 'TRUE' : 'FALSE';
            }

            if (fnName === 'NOT' || fnName === 'BUKAN') {
                if (rawArgs.length === 0) return 'TRUE';
                return !evaluateCondition(rawArgs[0], meta) ? 'TRUE' : 'FALSE';
            }

            if (fnName === 'IFERROR' || fnName === 'JIKA_ERROR') {
                if (rawArgs.length === 0) return '';
                const primaryVal = unquote(evaluateFormulaNode(rawArgs[0], meta, isNested));
                const trimmedPrimary = primaryVal.trim();
                const isErrLike =
                    trimmedPrimary === '' ||
                    trimmedPrimary === '-' ||
                    trimmedPrimary === 'NaN' ||
                    trimmedPrimary.startsWith('#');
                if (isErrLike) {
                    return rawArgs[1] !== undefined ? unquote(evaluateFormulaNode(rawArgs[1], meta, isNested)) : '';
                }
                return primaryVal;
            }

            const evalArgs = rawArgs.map(a => evaluateFormulaNode(a, meta, true));

            if (fnName === 'CONCAT' || fnName === 'CONCATENATE' || fnName === 'GABUNG') {
                return evalArgs.map(unquote).join('');
            }
            if (fnName === 'CONCAT_SPASI' || fnName === 'GABUNG_SPASI' || fnName === 'TEXTJOIN_SPASI') {
                return evalArgs.map(a => unquote(a).trim()).filter(Boolean).join(' ');
            }
            if (fnName === 'UPPER' || fnName === 'BESAR' || fnName === 'KAPITAL') {
                return joinTextArgsSmart(evalArgs).toUpperCase();
            }
            if (fnName === 'LOWER' || fnName === 'KECIL') {
                return joinTextArgsSmart(evalArgs).toLowerCase();
            }
            if (fnName === 'PROPER' || fnName === 'JUDUL' || fnName === 'TITLE' || fnName === 'CAPITALIZE') {
                return toTitleCase(joinTextArgsSmart(evalArgs));
            }
            if (fnName === 'SENTENCE' || fnName === 'KALIMAT') {
                return toSentenceCase(joinTextArgsSmart(evalArgs));
            }
            if (fnName === 'TRIM') {
                return joinTextArgsSmart(evalArgs).replace(/\s+/g, ' ').trim();
            }
            if (fnName === 'TAHUN_AJAR' || fnName === 'TAHUN_AJARAN' || fnName === 'TAHUNAJAR' || fnName === 'TAHUNAJARAN' || fnName === 'TAPEL' || fnName === 'TAHUN_PELAJARAN') {
                const modeArg = evalArgs[0] !== undefined ? unquote(evalArgs[0]).trim().toLowerCase() : '';
                const masehiVal = meta?.tahunAjaranMasehi || meta?.tahunAjaran || '-';
                const hijriVal = meta?.tahunAjaranHijriah || '-';
                const gabunganVal = meta?.tahunAjaranGabungan || (hijriVal !== '-' ? `${hijriVal} / ${masehiVal} M` : masehiVal);

                if (modeArg === 'masehi' || modeArg === 'm') {
                    return modeArg === 'm' && masehiVal !== '-' && !/\bM$/i.test(masehiVal) ? `${masehiVal} M` : masehiVal;
                }
                if (modeArg === 'hijriah' || modeArg === 'hijriyah' || modeArg === 'hijri' || modeArg === 'h') {
                    return hijriVal;
                }
                if (modeArg === 'lengkap' || modeArg === 'gabungan' || modeArg === 'hijriah_masehi' || modeArg === 'hm') {
                    return gabunganVal;
                }
                if (modeArg === 'masehi_hijriah' || modeArg === 'mh' || modeArg === 'masehi_dulu') {
                    const mWithSuffix = masehiVal !== '-' && !/\bM$/i.test(masehiVal) ? `${masehiVal} M` : masehiVal;
                    return hijriVal !== '-' ? `${mWithSuffix} / ${hijriVal}` : masehiVal;
                }
                return meta?.tahunAjaran || masehiVal;
            }
            if (fnName === 'TAHUN_AJAR_MASEHI' || fnName === 'TAHUN_AJARAN_MASEHI' || fnName === 'TAPEL_MASEHI') {
                const modeArg = evalArgs[0] !== undefined ? unquote(evalArgs[0]).trim().toLowerCase() : '';
                const masehiVal = meta?.tahunAjaranMasehi || meta?.tahunAjaran || '-';
                if (masehiVal === '-') return '-';
                if (modeArg === 'm' || modeArg === 'lengkap') {
                    return /\bM$/i.test(masehiVal) ? masehiVal : `${masehiVal} M`;
                }
                if (modeArg === 'arab') {
                    return `${angkaKeArab(masehiVal.replace(/\s*M$/i, ''))} م`;
                }
                return masehiVal;
            }
            if (fnName === 'TAHUN_AJAR_HIJRIAH' || fnName === 'TAHUN_AJARAN_HIJRIAH' || fnName === 'TAHUN_AJAR_HIJRIYAH' || fnName === 'TAHUN_AJARAN_HIJRIYAH' || fnName === 'TAPEL_HIJRIAH') {
                const modeArg = evalArgs[0] !== undefined ? unquote(evalArgs[0]).trim().toLowerCase() : '';
                const hijriVal = meta?.tahunAjaranHijriah || '-';
                if (hijriVal === '-') return '-';
                if (modeArg === 'angka' || modeArg === 'tanpa_h' || modeArg === 'polos') {
                    return hijriVal.replace(/\s*H$/i, '').trim();
                }
                if (modeArg === 'arab') {
                    return `${angkaKeArab(hijriVal.replace(/\s*H$/i, '').trim())} هـ`;
                }
                return hijriVal;
            }
            if (fnName === 'TAHUN_AJAR_GABUNGAN' || fnName === 'TAHUN_AJAR_LENGKAP' || fnName === 'TAHUN_AJARAN_GABUNGAN' || fnName === 'TAHUN_AJARAN_LENGKAP' || fnName === 'TAPEL_GABUNGAN') {
                const modeArg = evalArgs[0] !== undefined ? unquote(evalArgs[0]).trim().toLowerCase() : '';
                const masehiVal = meta?.tahunAjaranMasehi || meta?.tahunAjaran || '-';
                const hijriVal = meta?.tahunAjaranHijriah || '-';
                const gabunganVal = meta?.tahunAjaranGabungan || (hijriVal !== '-' ? `${hijriVal} / ${masehiVal} M` : masehiVal);
                if (modeArg === 'masehi_dulu' || modeArg === 'masehi_hijriah' || modeArg === 'mh') {
                    const mWithSuffix = masehiVal !== '-' && !/\bM$/i.test(masehiVal) ? `${masehiVal} M` : masehiVal;
                    return hijriVal !== '-' ? `${mWithSuffix} / ${hijriVal}` : masehiVal;
                }
                if (modeArg === 'arab') {
                    const hClean = hijriVal.replace(/\s*H$/i, '').trim();
                    const mClean = masehiVal.replace(/\s*M$/i, '').trim();
                    return `${angkaKeArab(hClean)} هـ / ${angkaKeArab(mClean)} م`;
                }
                return gabunganVal;
            }
            if (fnName === 'SEMESTER') {
                const modeArg = evalArgs[0] !== undefined ? unquote(evalArgs[0]).trim().toLowerCase() : '';
                const semStr = meta?.semester || 'Ganjil';
                if (modeArg === 'angka' || modeArg === 'nomor') {
                    return semStr === 'Genap' ? '2' : '1';
                }
                if (modeArg === 'romawi') {
                    return semStr === 'Genap' ? 'II' : 'I';
                }
                return semStr;
            }
            if (fnName === 'SEMESTER_ANGKA') {
                return (meta?.semester || 'Ganjil') === 'Genap' ? '2' : '1';
            }

            // --- RUMUS TEMPAT, TANGGAL & TITIMANGSA PENANDATANGANAN RAPOR ---
            if (fnName === 'TEMPAT_RAPOR' || fnName === 'KOTA_RAPOR' || fnName === 'TEMPAT_TTD' || fnName === 'KOTA_PONPES') {
                const overrideCity = evalArgs[0] !== undefined ? unquote(evalArgs[0]).trim() : '';
                return overrideCity || meta?.tempatRapor || 'Pesantren';
            }

            const DATE_MODE_KEYWORDS = new Set([
                '',
                'otomatis',
                'default',
                'masehi',
                'm',
                'singkat',
                'angka',
                'hijriah',
                'hijriyah',
                'hijri',
                'h',
                'polos',
                'tanpa_h',
                'gabungan',
                'lengkap',
                'hijriah_masehi',
                'hijriah_dulu',
                'hm',
                'masehi_hijriah',
                'masehi_dulu',
                'mh',
                'dua_baris',
                '2baris',
                'baris_baru',
                'masehi_dulu_2baris',
                'mh_2baris',
                'arab',
                'angka_arab'
            ]);

            const formatDatePartByMode = (
                family: 'auto' | 'masehi' | 'hijriah' | 'gabungan' | 'masehi_hijriah',
                rawMode: string
            ): string => {
                const mode = rawMode.trim().toLowerCase().replace(/[\s-]+/g, '_');
                const masehiVal = meta?.tanggalRaporMasehi || '-';
                const masehiWithM = masehiVal !== '-' && !/\bM$/i.test(masehiVal) ? `${masehiVal} M` : masehiVal;
                const singkatVal = meta?.tanggalRaporSingkat || masehiVal;
                const masehiArab = meta?.tanggalRaporMasehiArab || (masehiVal !== '-' ? `${angkaKeArab(masehiVal.replace(/\s*M$/i, ''))} م` : '-');
                const hijriVal = meta?.tanggalRaporHijriah || '-';
                const hijriPolos = hijriVal !== '-' ? hijriVal.replace(/\s*H\.?$/i, '').trim() : '-';
                const hijriArab = meta?.tanggalRaporHijriahArab || (hijriPolos !== '-' ? `${angkaKeArab(hijriPolos)} هـ` : '-');
                const gabunganHM = meta?.tanggalRaporGabungan || (hijriVal !== '-' ? `${hijriVal} / ${masehiWithM}` : masehiVal);
                const gabunganMH = meta?.tanggalRaporMasehiHijriah || (hijriVal !== '-' ? `${masehiWithM} / ${hijriVal}` : masehiVal);
                const autoVal = meta?.tanggalRaporOtomatis || masehiVal;

                if (family === 'masehi') {
                    if (masehiVal === '-') return '-';
                    if (mode === 'm' || mode === 'lengkap') return masehiWithM;
                    if (mode === 'singkat' || mode === 'angka') return singkatVal;
                    if (mode === 'arab') return masehiArab;
                    if (mode === 'angka_arab') return angkaKeArab(masehiVal);
                    return masehiVal;
                }

                if (family === 'hijriah') {
                    if (hijriVal === '-') return masehiVal;
                    if (mode === 'polos' || mode === 'tanpa_h' || mode === 'angka') return hijriPolos;
                    if (mode === 'arab') return hijriArab;
                    if (mode === 'angka_arab') return angkaKeArab(hijriVal);
                    return hijriVal;
                }

                if (family === 'gabungan' || family === 'masehi_hijriah') {
                    if (mode === 'masehi_dulu' || mode === 'masehi_hijriah' || mode === 'mh') {
                        return gabunganMH;
                    }
                    if (mode === 'hijriah_dulu' || mode === 'hijriah_masehi' || mode === 'hm') {
                        return gabunganHM;
                    }
                    if (mode === 'dua_baris' || mode === '2baris' || mode === 'baris_baru') {
                        if (family === 'masehi_hijriah') {
                            return hijriVal !== '-' ? `${masehiWithM}\n${hijriVal}` : masehiVal;
                        }
                        return hijriVal !== '-' ? `${hijriVal}\n${masehiWithM}` : masehiVal;
                    }
                    if (mode === 'masehi_dulu_2baris' || mode === 'mh_2baris') {
                        return hijriVal !== '-' ? `${masehiWithM}\n${hijriVal}` : masehiVal;
                    }
                    if (mode === 'arab') {
                        if (family === 'masehi_hijriah') {
                            return hijriArab !== '-' ? `${masehiArab} / ${hijriArab}` : masehiArab;
                        }
                        return hijriArab !== '-' ? `${hijriArab} / ${masehiArab}` : masehiArab;
                    }
                    if (mode === 'angka_arab') {
                        return angkaKeArab(family === 'masehi_hijriah' ? gabunganMH : gabunganHM);
                    }
                    return family === 'masehi_hijriah' ? gabunganMH : gabunganHM;
                }

                // family === 'auto'
                if (mode === 'masehi') return masehiVal;
                if (mode === 'm') return masehiWithM;
                if (mode === 'singkat' || mode === 'angka') return singkatVal;
                if (mode === 'hijriah' || mode === 'hijriyah' || mode === 'hijri' || mode === 'h') return hijriVal !== '-' ? hijriVal : masehiVal;
                if (mode === 'polos' || mode === 'tanpa_h') return hijriPolos !== '-' ? hijriPolos : masehiVal;
                if (mode === 'gabungan' || mode === 'lengkap' || mode === 'hijriah_masehi' || mode === 'hijriah_dulu' || mode === 'hm') return gabunganHM;
                if (mode === 'masehi_hijriah' || mode === 'masehi_dulu' || mode === 'mh') return gabunganMH;
                if (mode === 'dua_baris' || mode === '2baris' || mode === 'baris_baru') {
                    return hijriVal !== '-' ? `${hijriVal}\n${masehiWithM}` : masehiVal;
                }
                if (mode === 'masehi_dulu_2baris' || mode === 'mh_2baris') {
                    return hijriVal !== '-' ? `${masehiWithM}\n${hijriVal}` : masehiVal;
                }
                if (mode === 'arab') {
                    if (autoVal.includes('/')) {
                        return hijriArab !== '-' ? `${hijriArab} / ${masehiArab}` : masehiArab;
                    }
                    if (/\bH$/i.test(autoVal)) return hijriArab;
                    return masehiArab;
                }
                if (mode === 'angka_arab') return angkaKeArab(autoVal);
                return autoVal;
            };

            if (fnName === 'TANGGAL_RAPOR' || fnName === 'TANGGAL_TTD' || fnName === 'TANGGAL_CETAK' || fnName === 'TANGGAL_DOKUMEN') {
                const modeArg = evalArgs[0] !== undefined ? unquote(evalArgs[0]).trim() : '';
                return formatDatePartByMode('auto', modeArg);
            }
            if (fnName === 'TANGGAL_RAPOR_MASEHI' || fnName === 'TANGGAL_MASEHI') {
                const modeArg = evalArgs[0] !== undefined ? unquote(evalArgs[0]).trim() : '';
                return formatDatePartByMode('masehi', modeArg);
            }
            if (
                fnName === 'TANGGAL_RAPOR_HIJRIAH' ||
                fnName === 'TANGGAL_RAPOR_HIJRIYAH' ||
                fnName === 'TANGGAL_HIJRIAH' ||
                fnName === 'TANGGAL_HIJRIYAH'
            ) {
                const modeArg = evalArgs[0] !== undefined ? unquote(evalArgs[0]).trim() : '';
                return formatDatePartByMode('hijriah', modeArg);
            }
            if (
                fnName === 'TANGGAL_RAPOR_GABUNGAN' ||
                fnName === 'TANGGAL_RAPOR_LENGKAP' ||
                fnName === 'TANGGAL_HIJRIAH_MASEHI' ||
                fnName === 'TANGGAL_MASEHI_HIJRIAH'
            ) {
                const modeArg = evalArgs[0] !== undefined ? unquote(evalArgs[0]).trim() : '';
                const fam = fnName === 'TANGGAL_MASEHI_HIJRIAH' ? 'masehi_hijriah' : 'gabungan';
                return formatDatePartByMode(fam, modeArg);
            }

            if (
                fnName === 'TITIMANGSA' ||
                fnName === 'TITIMANGSA_RAPOR' ||
                fnName === 'KOTA_TANGGAL' ||
                fnName === 'TEMPAT_TANGGAL' ||
                fnName === 'KOTA_TANGGAL_DOKUMEN' ||
                fnName === 'TITIMANGSA_MASEHI' ||
                fnName === 'KOTA_TANGGAL_MASEHI' ||
                fnName === 'TEMPAT_TANGGAL_MASEHI' ||
                fnName === 'TITIMANGSA_HIJRIAH' ||
                fnName === 'TITIMANGSA_HIJRIYAH' ||
                fnName === 'KOTA_TANGGAL_HIJRIAH' ||
                fnName === 'TEMPAT_TANGGAL_HIJRIAH' ||
                fnName === 'TITIMANGSA_GABUNGAN' ||
                fnName === 'TITIMANGSA_HIJRIAH_MASEHI' ||
                fnName === 'TITIMANGSA_MASEHI_HIJRIAH' ||
                fnName === 'TITIMANGSA_LENGKAP' ||
                fnName === 'KOTA_TANGGAL_GABUNGAN' ||
                fnName === 'KOTA_TANGGAL_HIJRIAH_MASEHI'
            ) {
                const arg0 = evalArgs[0] !== undefined ? unquote(evalArgs[0]).trim() : '';
                const arg1 = evalArgs[1] !== undefined ? unquote(evalArgs[1]).trim() : '';
                const normArg0 = arg0.toLowerCase().replace(/[\s-]+/g, '_');

                let modeStr = '';
                let cityVal = meta?.tempatRapor || 'Pesantren';

                if (arg0 && !DATE_MODE_KEYWORDS.has(normArg0) && !arg1) {
                    // Contoh: =TITIMANGSA("Gontor") atau =TITIMANGSA_GABUNGAN("Gontor")
                    cityVal = arg0;
                } else {
                    modeStr = arg0;
                    if (arg1) cityVal = arg1;
                }

                let family: 'auto' | 'masehi' | 'hijriah' | 'gabungan' | 'masehi_hijriah' = 'auto';
                if (
                    fnName === 'TITIMANGSA_MASEHI' ||
                    fnName === 'KOTA_TANGGAL_MASEHI' ||
                    fnName === 'TEMPAT_TANGGAL_MASEHI' ||
                    (fnName === 'KOTA_TANGGAL' && !modeStr)
                ) {
                    family = fnName === 'KOTA_TANGGAL' ? 'auto' : 'masehi';
                } else if (
                    fnName === 'TITIMANGSA_HIJRIAH' ||
                    fnName === 'TITIMANGSA_HIJRIYAH' ||
                    fnName === 'KOTA_TANGGAL_HIJRIAH' ||
                    fnName === 'TEMPAT_TANGGAL_HIJRIAH'
                ) {
                    family = 'hijriah';
                } else if (fnName === 'TITIMANGSA_MASEHI_HIJRIAH') {
                    family = 'masehi_hijriah';
                } else if (
                    fnName === 'TITIMANGSA_GABUNGAN' ||
                    fnName === 'TITIMANGSA_HIJRIAH_MASEHI' ||
                    fnName === 'TITIMANGSA_LENGKAP' ||
                    fnName === 'KOTA_TANGGAL_GABUNGAN' ||
                    fnName === 'KOTA_TANGGAL_HIJRIAH_MASEHI'
                ) {
                    family = 'gabungan';
                }

                const formattedDatePart = formatDatePartByMode(family, modeStr);
                const commaSep = modeStr.trim().toLowerCase() === 'arab' ? '، ' : ', ';
                return cityVal ? `${cityVal}${commaSep}${formattedDatePart}` : formattedDatePart;
            }

            if (fnName === 'SUM' || fnName === 'JUMLAH' || fnName === 'TOTAL') {
                const nums = parseNumericValues(evalArgs);
                if (nums.length === 0) return '-';
                return formatNumberClean(nums.reduce((a, b) => a + b, 0), autoDecimals);
            }
            if (fnName === 'RATA2' || fnName === 'AVERAGE' || fnName === 'AVG' || fnName === 'RERATA') {
                const nums = parseNumericValues(evalArgs);
                if (nums.length === 0) return '-';
                return formatNumberClean(nums.reduce((a, b) => a + b, 0) / nums.length, autoDecimals);
            }
            if (
                fnName === 'RATA2_KELAS' ||
                fnName === 'RERATA_KELAS' ||
                fnName === 'RATA_KELAS' ||
                fnName === 'NRK' ||
                fnName === 'AVG_KELAS'
            ) {
                const avgLookup = new Map<string, number>();
                if (meta?.classAverages) {
                    for (const [k, v] of Object.entries(meta.classAverages)) {
                        if (typeof v === 'number' && isFinite(v)) {
                            avgLookup.set(normalizeSubjectKeyForAvg(k), v);
                            const alnumKey = k.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
                            if (alnumKey && !avgLookup.has(alnumKey)) {
                                avgLookup.set(alnumKey, v);
                            }
                        }
                    }
                }

                // Pemanggilan tanpa argumen: =RATA2_KELAS() -> rata-rata umum kelas
                const nonEmptyArgs = evalArgs.filter(a => unquote(a).trim() !== '');
                if (nonEmptyArgs.length === 0) {
                    if (typeof meta?.classOverallAverage === 'number' && isFinite(meta.classOverallAverage) && meta.classOverallAverage > 0) {
                        return formatNumberClean(meta.classOverallAverage, autoDecimals);
                    }
                    return '-';
                }

                // Cek apakah argumen ke-2 adalah jumlah digit desimal (0 s/d 4), misal =RATA2_KELAS(D6, 1)
                let explicitDigits: number | undefined;
                let targetArgs = evalArgs;
                if (evalArgs.length === 2) {
                    const secondTrimmed = unquote(evalArgs[1]).trim();
                    if (/^[0-4]$/.test(secondTrimmed)) {
                        explicitDigits = parseInt(secondTrimmed, 10);
                        targetArgs = [evalArgs[0]];
                    }
                }

                const collected: number[] = [];
                for (const item of targetArgs) {
                    const clean = unquote(item).trim();
                    if (!clean || clean === '-' || clean === '__EMPTY__') continue;

                    if (clean.startsWith('__VAL__:')) {
                        const preNum = Number(clean.slice(8));
                        if (!isNaN(preNum) && isFinite(preNum)) {
                            collected.push(preNum);
                        }
                        continue;
                    }

                    const normKey = normalizeSubjectKeyForAvg(clean);
                    if (
                        normKey === '__OVERALL__' ||
                        normKey === 'RATA_RATA' ||
                        normKey === 'RERATA' ||
                        normKey === 'TOTAL_NILAI' ||
                        normKey === 'RATA_RATA_KELAS' ||
                        normKey === 'RERATA_KELAS'
                    ) {
                        if (typeof meta?.classOverallAverage === 'number' && isFinite(meta.classOverallAverage) && meta.classOverallAverage > 0) {
                            collected.push(meta.classOverallAverage);
                        }
                        continue;
                    }

                    const directMatch = avgLookup.get(normKey);
                    if (directMatch !== undefined) {
                        collected.push(directMatch);
                        continue;
                    }

                    const looseKey = clean.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
                    const looseMatch = looseKey ? avgLookup.get(looseKey) : undefined;
                    if (looseMatch !== undefined) {
                        collected.push(looseMatch);
                    }
                }

                if (collected.length === 0) return '-';
                const meanVal = collected.reduce((a, b) => a + b, 0) / collected.length;
                if (explicitDigits !== undefined) {
                    return roundHalfAwayFromZero(meanVal, explicitDigits).toFixed(explicitDigits);
                }
                return formatNumberClean(meanVal, autoDecimals);
            }
            if (fnName === 'KKM' || fnName === 'NILAI_KKM' || fnName === 'STANDAR_KKM') {
                // Pemanggilan =KKM() tanpa argumen -> gunakan deteksi otomatis baris aktif atau KKM standar jenjang
                if (evalArgs.length === 0) {
                    if (meta?.rowDetectedKkm !== undefined && isFinite(meta.rowDetectedKkm)) {
                        return formatNumberClean(meta.rowDetectedKkm, autoDecimals);
                    }
                    if (meta?.defaultKkm !== undefined && isFinite(meta.defaultKkm)) {
                        return formatNumberClean(meta.defaultKkm, autoDecimals);
                    }
                    return '-';
                }

                // Argumen ke-2 opsional: fallback KKM manual jika mapel tidak ditemukan di Data Master, misal =KKM(B6, 75)
                let explicitFallback: number | undefined;
                if (evalArgs.length >= 2) {
                    const fbStr = unquote(evalArgs[1]).trim().replace(',', '.');
                    const fbNum = Number(fbStr);
                    if (fbStr !== '' && fbStr !== '-' && !isNaN(fbNum) && isFinite(fbNum)) {
                        explicitFallback = fbNum;
                    }
                }

                const rawTarget = unquote(evalArgs[0]).trim();
                if (rawTarget.startsWith('__KKM_RESOLVED__:')) {
                    const resolvedNum = Number(rawTarget.slice('__KKM_RESOLVED__:'.length));
                    if (!isNaN(resolvedNum) && isFinite(resolvedNum)) {
                        return formatNumberClean(resolvedNum, autoDecimals);
                    }
                }
                if (rawTarget === '__KKM_EMPTY__' || rawTarget === '' || rawTarget === '-') {
                    if (explicitFallback !== undefined) {
                        return formatNumberClean(explicitFallback, autoDecimals);
                    }
                    if (rawTarget === '' && meta?.rowDetectedKkm !== undefined && isFinite(meta.rowDetectedKkm)) {
                        return formatNumberClean(meta.rowDetectedKkm, autoDecimals);
                    }
                    return '-';
                }
                if (rawTarget.startsWith('__KKM_UNMATCHED__:')) {
                    const fallbackVal = explicitFallback ?? meta?.defaultKkm;
                    return fallbackVal !== undefined && isFinite(fallbackVal)
                        ? formatNumberClean(fallbackVal, autoDecimals)
                        : '-';
                }

                // Pencarian langsung pada kamus Data Master (misal =KKM("Fiqih") atau =KKM(B6))
                if (meta?.kkmLookup) {
                    const candidates = extractMapelLookupCandidates(rawTarget);
                    for (const cand of candidates) {
                        if (meta.kkmLookup[cand] !== undefined) {
                            return formatNumberClean(meta.kkmLookup[cand], autoDecimals);
                        }
                    }
                }

                const finalFallback = explicitFallback ?? meta?.defaultKkm;
                if (finalFallback !== undefined && isFinite(finalFallback)) {
                    return formatNumberClean(finalFallback, autoDecimals);
                }
                return '-';
            }
            if (fnName === 'MAX') {
                const nums = parseNumericValues(evalArgs);
                if (nums.length === 0) return '-';
                return formatNumberClean(Math.max(...nums), autoDecimals);
            }
            if (fnName === 'MIN') {
                const nums = parseNumericValues(evalArgs);
                if (nums.length === 0) return '-';
                return formatNumberClean(Math.min(...nums), autoDecimals);
            }
            if (fnName === 'ROUND' || fnName === 'BULAT') {
                const nums = parseNumericValues(evalArgs);
                if (nums.length === 0) return '-';
                const digits = nums[1] !== undefined ? Math.max(0, Math.min(4, Math.floor(nums[1]))) : 0;
                const rounded = roundHalfAwayFromZero(nums[0], digits);
                return Number(rounded.toFixed(digits)).toString();
            }
            if (fnName === 'ROUNDUP' || fnName === 'BULAT_ATAS') {
                const nums = parseNumericValues(evalArgs);
                if (nums.length === 0) return '-';
                const digits = nums[1] !== undefined ? Math.max(0, Math.min(4, Math.floor(nums[1]))) : 0;
                const factor = Math.pow(10, digits);
                const sign = nums[0] < 0 ? -1 : 1;
                const up = (sign * Math.ceil((Math.abs(nums[0]) - 1e-12) * factor)) / factor;
                const clean = Object.is(up, -0) ? 0 : up;
                return Number(clean.toFixed(digits)).toString();
            }
            if (fnName === 'ROUNDDOWN' || fnName === 'BULAT_BAWAH') {
                const nums = parseNumericValues(evalArgs);
                if (nums.length === 0) return '-';
                const digits = nums[1] !== undefined ? Math.max(0, Math.min(4, Math.floor(nums[1]))) : 0;
                const factor = Math.pow(10, digits);
                const sign = nums[0] < 0 ? -1 : 1;
                const down = (sign * Math.floor((Math.abs(nums[0]) + 1e-12) * factor)) / factor;
                const clean = Object.is(down, -0) ? 0 : down;
                return Number(clean.toFixed(digits)).toString();
            }
            if (fnName === 'FIXED' || fnName === 'DESIMAL') {
                const nums = parseNumericValues(evalArgs);
                if (nums.length === 0) return '-';
                const digits = nums[1] !== undefined ? Math.max(0, Math.min(4, Math.floor(nums[1]))) : 2;
                return roundHalfAwayFromZero(nums[0], digits).toFixed(digits);
            }
            if (fnName === 'TERBILANG') {
                const val = evalArgs[0] !== undefined ? unquote(evalArgs[0]) : '';
                return angkaKeTerbilang(val);
            }
            if (fnName === 'ARAB' || fnName === 'ANGKA_ARAB') {
                const val = evalArgs[0] !== undefined ? unquote(evalArgs[0]) : '';
                return angkaKeArab(val);
            }
            if (fnName === 'PREDIKAT' || fnName === 'HURUF' || fnName === 'TAQDIR') {
                const val = evalArgs[0] !== undefined ? unquote(evalArgs[0]) : '';
                const mode = evalArgs[1] !== undefined ? unquote(evalArgs[1]) : (fnName === 'TAQDIR' ? 'pesantren' : 'huruf');
                return nilaiKePredikatOtomatis(val, mode);
            }
            if (fnName === 'COUNT' || fnName === 'HITUNG') {
                return String(parseNumericValues(evalArgs).length);
            }
            if (fnName === 'COUNTA' || fnName === 'HITUNG_ISI') {
                const filled = evalArgs.filter(a => {
                    const u = unquote(a).trim();
                    return u !== '' && u !== '-';
                });
                return String(filled.length);
            }
            if (fnName === 'COUNTBLANK' || fnName === 'HITUNG_KOSONG') {
                const blanks = evalArgs.filter(a => {
                    const u = unquote(a).trim();
                    return u === '' || u === '-';
                });
                return String(blanks.length);
            }
            if (fnName === 'COUNTIF' || fnName === 'HITUNG_JIKA') {
                if (evalArgs.length < 2) return '0';
                const crit = evalArgs[evalArgs.length - 1];
                const items = evalArgs.slice(0, -1);
                return String(items.filter(it => matchesExcelCriteria(it, crit)).length);
            }
            if (fnName === 'SUMIF' || fnName === 'JUMLAH_JIKA') {
                if (evalArgs.length < 2) return '-';
                const crit = evalArgs[evalArgs.length - 1];
                const matched = evalArgs.slice(0, -1).filter(it => matchesExcelCriteria(it, crit));
                const nums = parseNumericValues(matched);
                if (nums.length === 0) return '0';
                return formatNumberClean(nums.reduce((a, b) => a + b, 0), autoDecimals);
            }
            if (fnName === 'AVERAGEIF' || fnName === 'RATA2_JIKA' || fnName === 'RERATA_JIKA') {
                if (evalArgs.length < 2) return '-';
                const crit = evalArgs[evalArgs.length - 1];
                const matched = evalArgs.slice(0, -1).filter(it => matchesExcelCriteria(it, crit));
                const nums = parseNumericValues(matched);
                if (nums.length === 0) return '-';
                return formatNumberClean(nums.reduce((a, b) => a + b, 0) / nums.length, autoDecimals);
            }
            if (fnName === 'ABS') {
                const nums = parseNumericValues(evalArgs);
                if (nums.length === 0) return '-';
                return formatNumberClean(Math.abs(nums[0]), autoDecimals);
            }
            if (fnName === 'INT' || fnName === 'TRUNC') {
                const nums = parseNumericValues(evalArgs);
                if (nums.length === 0) return '-';
                return String(fnName === 'INT' ? Math.floor(nums[0]) : Math.trunc(nums[0]));
            }
            if (fnName === 'MOD') {
                const nums = parseNumericValues(evalArgs);
                if (nums.length < 2 || nums[1] === 0) return '-';
                return formatNumberClean(nums[0] - nums[1] * Math.floor(nums[0] / nums[1]), autoDecimals);
            }
            if (fnName === 'POWER' || fnName === 'PANGKAT') {
                const nums = parseNumericValues(evalArgs);
                if (nums.length < 2) return '-';
                return formatNumberClean(Math.pow(nums[0], nums[1]), autoDecimals);
            }
            if (fnName === 'SQRT' || fnName === 'AKAR') {
                const nums = parseNumericValues(evalArgs);
                if (nums.length === 0 || nums[0] < 0) return '-';
                return formatNumberClean(Math.sqrt(nums[0]), autoDecimals);
            }
            if (fnName === 'LEN' || fnName === 'PANJANG') {
                return String(unquote(evalArgs[0] ?? '').length);
            }
            if (fnName === 'LEFT' || fnName === 'KIRI') {
                const str = unquote(evalArgs[0] ?? '');
                const len = evalArgs[1] !== undefined ? Math.max(0, parseInt(unquote(evalArgs[1]).trim(), 10) || 0) : 1;
                return str.slice(0, len);
            }
            if (fnName === 'RIGHT' || fnName === 'KANAN') {
                const str = unquote(evalArgs[0] ?? '');
                const len = evalArgs[1] !== undefined ? Math.max(0, parseInt(unquote(evalArgs[1]).trim(), 10) || 0) : 1;
                return len === 0 ? '' : str.slice(-len);
            }
            if (fnName === 'MID' || fnName === 'TENGAH') {
                const str = unquote(evalArgs[0] ?? '');
                const start = evalArgs[1] !== undefined ? Math.max(1, parseInt(unquote(evalArgs[1]).trim(), 10) || 1) : 1;
                const len = evalArgs[2] !== undefined ? Math.max(0, parseInt(unquote(evalArgs[2]).trim(), 10) || 0) : str.length;
                return str.slice(start - 1, start - 1 + len);
            }
            if (fnName === 'RANK' || fnName === 'PERINGKAT') {
                let scope: 'rombel' | 'kelas' | 'jenjang' | 'global' = 'rombel';
                let limit = 0;

                for (let idx = 0; idx < evalArgs.length; idx++) {
                    const cleanArg = unquote(evalArgs[idx]).trim().toLowerCase();
                    if (cleanArg === 'kelas' || cleanArg === 'tingkat' || cleanArg === 'paralel') {
                        scope = 'kelas';
                    } else if (cleanArg === 'jenjang' || cleanArg === 'marhalah') {
                        scope = 'jenjang';
                    } else if (cleanArg === 'global' || cleanArg === 'pondok' || cleanArg === 'all') {
                        scope = 'global';
                    } else if (cleanArg === 'rombel') {
                        scope = 'rombel';
                    } else if (idx >= 1 && /^\d+$/.test(cleanArg)) {
                        limit = parseInt(cleanArg, 10);
                    }
                }

                let effectiveRank = meta?.rank;
                if (scope === 'kelas') {
                    effectiveRank = meta?.rankKelas ?? meta?.rank;
                } else if (scope === 'jenjang') {
                    effectiveRank = meta?.rankJenjang ?? meta?.rank;
                } else if (scope === 'global') {
                    effectiveRank = meta?.rankGlobal ?? meta?.rank;
                }

                if (!effectiveRank || effectiveRank <= 0) return '-';
                if (limit > 0 && effectiveRank > limit) return '-';
                return String(effectiveRank);
            }
        }
    }

    // Evaluasi fungsi yang tertanam di dalam ekspresi gabungan/aritmatika (contoh: =SUM(D6:D10)/5 atau =RATA2(D6:D8)*0.4 + RATA2(E6:E8)*0.6)
    let exprForMath = trimmed;
    if (/[A-Za-z]/.test(exprForMath) && exprForMath.includes('(')) {
        let rebuilt = '';
        let i = 0;
        let q: '"' | "'" | null = null;
        let replacedAny = false;
        while (i < exprForMath.length) {
            const ch = exprForMath[i];
            if (q) {
                if (ch === q && exprForMath[i - 1] !== '\\') q = null;
                rebuilt += ch;
                i++;
                continue;
            }
            if (ch === '"' || ch === "'") {
                q = ch;
                rebuilt += ch;
                i++;
                continue;
            }
            if (/[A-Za-z]/.test(ch) && (i === 0 || !/[A-Za-z0-9_$]/.test(exprForMath[i - 1]))) {
                const subMatch = exprForMath.slice(i).match(/^([A-Za-z0-9_]+)(\s*)\(/);
                if (subMatch) {
                    const candName = subMatch[1];
                    const openPos = i + subMatch[0].length - 1;
                    let d = 0;
                    let iq: '"' | "'" | null = null;
                    let closePos = -1;
                    for (let j = openPos; j < exprForMath.length; j++) {
                        const jc = exprForMath[j];
                        if (iq) {
                            if (jc === iq && exprForMath[j - 1] !== '\\') iq = null;
                            continue;
                        }
                        if (jc === '"' || jc === "'") { iq = jc; continue; }
                        if (jc === '(') d++;
                        else if (jc === ')') {
                            d--;
                            if (d === 0) {
                                closePos = j;
                                break;
                            }
                        }
                    }
                    if (closePos !== -1) {
                        const subCall = exprForMath.slice(i, closePos + 1);
                        if (KNOWN_FORMULA_CALL_REGEX.test(subCall)) {
                            const subRes = unquote(evaluateFormulaNode(subCall, meta, true)).trim();
                            if (subRes === '' || subRes === '-') {
                                rebuilt += '0';
                            } else if (/^-?(?:0|[1-9]\d*)(?:[.,]\d+)?$/.test(subRes)) {
                                rebuilt += subRes.replace(',', '.');
                            } else {
                                rebuilt += `"${subRes.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
                            }
                            replacedAny = true;
                            i = closePos + 1;
                            continue;
                        }
                    }
                }
            }
            rebuilt += ch;
            i++;
        }
        if (replacedAny) {
            exprForMath = rebuilt;
        }
    }

    // Coba evaluasi ekspresi matematika jika mengandung angka/operator
    const mathVal = evaluateSafeMath(exprForMath);
    if (mathVal !== null) {
        return formatNumberClean(mathVal, autoDecimals);
    }

    return unquote(exprForMath);
}

const KNOWN_FORMULA_CALL_REGEX = /^(?:SUM|JUMLAH|TOTAL|RATA2|AVERAGE|AVG|RERATA|RATA2_KELAS|RERATA_KELAS|RATA_KELAS|NRK|AVG_KELAS|KKM|NILAI_KKM|STANDAR_KKM|MAX|MIN|COUNT|HITUNG|COUNTA|HITUNG_ISI|COUNTBLANK|HITUNG_KOSONG|COUNTIF|HITUNG_JIKA|SUMIF|JUMLAH_JIKA|AVERAGEIF|RATA2_JIKA|RERATA_JIKA|ROUND|BULAT|ROUNDUP|BULAT_ATAS|ROUNDDOWN|BULAT_BAWAH|FIXED|DESIMAL|ABS|INT|TRUNC|MOD|POWER|PANGKAT|SQRT|AKAR|LEN|PANJANG|LEFT|KIRI|RIGHT|KANAN|MID|TENGAH|IF|JIKA|IFS|AND|DAN|OR|ATAU|NOT|BUKAN|IFERROR|JIKA_ERROR|TERBILANG|ARAB|ANGKA_ARAB|PREDIKAT|HURUF|TAQDIR|RANK|PERINGKAT|CONCAT|CONCATENATE|GABUNG|CONCAT_SPASI|GABUNG_SPASI|TEXTJOIN_SPASI|UPPER|BESAR|KAPITAL|LOWER|KECIL|PROPER|JUDUL|TITLE|CAPITALIZE|SENTENCE|KALIMAT|TRIM|TAHUN_AJAR|TAHUN_AJARAN|TAHUNAJAR|TAHUNAJARAN|TAPEL|TAHUN_PELAJARAN|TAHUN_AJAR_MASEHI|TAHUN_AJARAN_MASEHI|TAPEL_MASEHI|TAHUN_AJAR_HIJRIAH|TAHUN_AJARAN_HIJRIAH|TAHUN_AJAR_HIJRIYAH|TAHUN_AJARAN_HIJRIYAH|TAPEL_HIJRIAH|TAHUN_AJAR_GABUNGAN|TAHUN_AJAR_LENGKAP|TAHUN_AJARAN_GABUNGAN|TAHUN_AJARAN_LENGKAP|TAPEL_GABUNGAN|SEMESTER|SEMESTER_ANGKA|TEMPAT_RAPOR|KOTA_RAPOR|TEMPAT_TTD|KOTA_PONPES|TANGGAL_RAPOR|TANGGAL_TTD|TANGGAL_CETAK|TANGGAL_DOKUMEN|TANGGAL_RAPOR_MASEHI|TANGGAL_MASEHI|TANGGAL_RAPOR_HIJRIAH|TANGGAL_RAPOR_HIJRIYAH|TANGGAL_HIJRIAH|TANGGAL_HIJRIYAH|TANGGAL_RAPOR_GABUNGAN|TANGGAL_RAPOR_LENGKAP|TANGGAL_HIJRIAH_MASEHI|TANGGAL_MASEHI_HIJRIAH|TITIMANGSA|TITIMANGSA_RAPOR|KOTA_TANGGAL|TEMPAT_TANGGAL|KOTA_TANGGAL_DOKUMEN|TITIMANGSA_MASEHI|KOTA_TANGGAL_MASEHI|TEMPAT_TANGGAL_MASEHI|TITIMANGSA_HIJRIAH|TITIMANGSA_HIJRIYAH|KOTA_TANGGAL_HIJRIAH|TEMPAT_TANGGAL_HIJRIAH|TITIMANGSA_GABUNGAN|TITIMANGSA_HIJRIAH_MASEHI|TITIMANGSA_MASEHI_HIJRIAH|TITIMANGSA_LENGKAP|KOTA_TANGGAL_GABUNGAN|KOTA_TANGGAL_HIJRIAH_MASEHI)\s*\([\s\S]*\)$/i;

/**
 * Mengecek apakah string teks sel merupakan ekspresi rumus rapor
 */
export function isRaporFormulaExpression(rawText: string): boolean {
    const trimmed = (rawText || '').trim();
    if (!trimmed) return false;
    if (trimmed.startsWith('=')) return true;
    return KNOWN_FORMULA_CALL_REGEX.test(trimmed);
}

/**
 * Mengevaluasi rumus sel rapor setelah seluruh placeholder $TAG disubstitusi.
 * Mendukung penulisan dengan awalan '=' (misal '=RATA2(80, 90)') maupun fungsi langsung pada sel bertipe formula ('RATA2(80, 90)').
 */
export function evaluateRaporFormula(resolvedText: string, rankOrMeta?: number | FormulaEvalMeta): string {
    const trimmed = resolvedText.trim();
    if (!trimmed) return '';

    const meta: FormulaEvalMeta | undefined = typeof rankOrMeta === 'number'
        ? { rank: rankOrMeta }
        : rankOrMeta;

    const isExplicitFormula = trimmed.startsWith('=');
    const body = isExplicitFormula ? trimmed.slice(1).trim() : trimmed;

    // Jika diawali '=' atau cocok dengan pola fungsi rumus standar rapor
    const isKnownFunctionCall = KNOWN_FORMULA_CALL_REGEX.test(body);

    if (!isExplicitFormula && !isKnownFunctionCall) {
        return resolvedText;
    }

    // Jika masih ada variabel $BELUM_DIISI di luar tanda kutip, ganti menjadi "" agar tidak merusak SUM/RATA2/aritmatika
    let sanitizedBody = '';
    let inQ: '"' | "'" | null = null;
    let idx = 0;
    while (idx < body.length) {
        const ch = body[idx];
        if (inQ) {
            if (ch === inQ && body[idx - 1] !== '\\') {
                inQ = null;
            }
            sanitizedBody += ch;
            idx++;
            continue;
        }
        if (ch === '"' || ch === "'") {
            inQ = ch;
            sanitizedBody += ch;
            idx++;
            continue;
        }
        if (ch === '$') {
            const m = body.slice(idx).match(/^\$[A-Za-z0-9_]+/);
            if (m) {
                sanitizedBody += '""';
                idx += m[0].length;
                continue;
            }
        }
        sanitizedBody += ch;
        idx++;
    }
    return evaluateFormulaNode(sanitizedBody, meta);
}

/**
 * Membuat kode unik variabel $KEY yang rapi dari nama Mata Pelajaran Kurikulum
 */
export function generateSubjectKeyFromName(
    mapel: Pick<MataPelajaran, 'nama' | 'kodeMapel'>,
    usedKeys: Set<string>
): string {
    const rawBase = (mapel.kodeMapel && mapel.kodeMapel.trim())
        ? mapel.kodeMapel.trim()
        : mapel.nama.trim();

    let cleaned = rawBase
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');

    if (!cleaned || /^[0-9]/.test(cleaned)) {
        cleaned = `MAPEL_${cleaned || '1'}`;
    }
    if (cleaned.length > 18) {
        cleaned = cleaned.slice(0, 18).replace(/_+$/, '');
    }

    let candidate = cleaned;
    let counter = 2;
    while (usedKeys.has(candidate)) {
        candidate = `${cleaned}_${counter}`;
        counter++;
    }
    usedKeys.add(candidate);
    return candidate;
}

/**
 * Konversi indeks kolom 0-based menjadi huruf kolom Excel (0 -> A, 25 -> Z, 26 -> AA)
 */
export function colIndexToExcelLetters(colIndex: number): string {
    let name = '';
    let num = colIndex;
    while (num >= 0) {
        name = String.fromCharCode((num % 26) + 65) + name;
        num = Math.floor(num / 26) - 1;
    }
    return name;
}

/**
 * Konversi huruf kolom Excel (A, B, ..., Z, AA) menjadi indeks kolom 0-based
 */
export function excelLettersToColIndex(letters: string): number {
    const clean = letters.trim().toUpperCase();
    if (!/^[A-Z]{1,3}$/.test(clean)) return -1;
    let idx = 0;
    for (let i = 0; i < clean.length; i++) {
        idx = idx * 26 + (clean.charCodeAt(i) - 64);
    }
    return idx - 1;
}

/**
 * Format koordinat baris & kolom 0-based ke alamat Excel (misal r=5, c=3 -> "D6")
 */
export function formatExcelCellCoord(r: number, c: number): string {
    return `${colIndexToExcelLetters(c)}${r + 1}`;
}

/**
 * Mem-parsing koordinat sel tunggal Excel seperti "D6", "$D$6", "D$6", atau (bila diizinkan) "$D6" menjadi { r, c } 0-based.
 * Secara bawaan menolak awalan satu '$' tanpa '$' kedua (seperti "$UH1") agar tidak bentrok dengan kode variabel input ($KEY),
 * kecuali allowSingleLeadingDollar = true. Format "D$6" selalu diizinkan karena variabel $KEY tidak pernah diawali huruf sebelum '$'.
 */
export function parseExcelCellCoord(
    token: string,
    allowSingleLeadingDollar: boolean = false
): { r: number; c: number } | null {
    const t = token.trim();
    const match = allowSingleLeadingDollar
        ? t.match(/^\$?([A-Za-z]{1,2})\$?([1-9]\d{0,2})$/)
        : t.match(/^(?:\$([A-Za-z]{1,2})\$([1-9]\d{0,2})|([A-Za-z]{1,2})\$?([1-9]\d{0,2}))$/);
    if (!match) return null;
    const colLetters = (match[1] || match[3] || '').toUpperCase();
    const rowStr = match[2] || match[4] || '';
    const c = excelLettersToColIndex(colLetters);
    const r = parseInt(rowStr, 10) - 1;
    if (c < 0 || r < 0) return null;
    return { r, c };
}

export interface ParsedExcelRefWithLocks {
    r: number;
    c: number;
    lockCol: boolean;
    lockRow: boolean;
}

/**
 * Mem-parsing koordinat sel Excel beserta status kunci '$' pada kolom dan baris (D6, $D$6, D$6, $D6).
 */
export function parseExcelRefWithLocks(
    token: string,
    allowSingleLeadingDollar: boolean = true
): ParsedExcelRefWithLocks | null {
    const t = token.trim();
    const m = t.match(/^(\$?)([A-Za-z]{1,2})(\$?)([1-9]\d{0,2})$/);
    if (!m) return null;
    const lockCol = m[1] === '$';
    const lockRow = m[3] === '$';
    if (lockCol && !lockRow && !allowSingleLeadingDollar) return null;
    const c = excelLettersToColIndex(m[2].toUpperCase());
    const r = parseInt(m[4], 10) - 1;
    if (c < 0 || r < 0) return null;
    return { r, c, lockCol, lockRow };
}

/**
 * Memformat objek koordinat ber-lock menjadi string alamat Excel (misal $D$6, $D6, D$6, atau D6)
 */
export function formatExcelRefWithLocks(ref: ParsedExcelRefWithLocks): string {
    const colStr = colIndexToExcelLetters(Math.max(0, ref.c));
    const rowNum = Math.max(0, ref.r) + 1;
    return `${ref.lockCol ? '$' : ''}${colStr}${ref.lockRow ? '$' : ''}${rowNum}`;
}

/**
 * Mem-parsing rentang sel Excel seperti "D6:D15", "$D$6:$D$15", "$D6:$D15", atau "D$6:D$15" menjadi batas baris & kolom 0-based
 */
export function parseExcelRangeCoord(
    token: string
): { rMin: number; rMax: number; cMin: number; cMax: number } | null {
    const parts = token.trim().split(/\s*:\s*/);
    if (parts.length !== 2) return null;
    const start = parseExcelCellCoord(parts[0], true);
    const end = parseExcelCellCoord(parts[1], true);
    if (!start || !end) return null;
    return {
        rMin: Math.min(start.r, end.r),
        rMax: Math.max(start.r, end.r),
        cMin: Math.min(start.c, end.c),
        cMax: Math.max(start.c, end.c)
    };
}

/**
 * Mengecek apakah posisi kursor di dalam rumus sedang siap menerima klik/blok sel dari tabel (seperti Point Mode di Excel)
 */
export function isFormulaReadyForCellPick(
    textBeforeCaret: string,
    fullText: string,
    isFormulaCellType: boolean = false
): boolean {
    const trimmedFull = fullText.trimStart();
    const startsAsFormula = trimmedFull.startsWith('=') || isFormulaCellType;
    if (!startsAsFormula) return false;

    // Pastikan kursor tidak sedang berada di dalam tanda kutip teks ("..." atau '...')
    let inQuote: '"' | "'" | null = null;
    for (let i = 0; i < textBeforeCaret.length; i++) {
        const ch = textBeforeCaret[i];
        if (inQuote) {
            if (ch === inQuote && textBeforeCaret[i - 1] !== '\\') inQuote = null;
        } else if (ch === '"' || ch === "'") {
            inQuote = ch;
        }
    }
    if (inQuote) return false;

    const trimmedBefore = textBeforeCaret.trimEnd();
    if (!trimmedBefore) {
        return isFormulaCellType && fullText.trim() === '';
    }

    const lastCh = trimmedBefore[trimmedBefore.length - 1];
    return ['=', '(', ',', ';', '+', '-', '*', '/', '&', '>', '<'].includes(lastCh);
}

/**
 * Menutup kurung buka '(' yang belum ditutup pada akhir penulisan rumus (misal '=SUM(D6:D15' -> '=SUM(D6:D15)')
 */
export function autoCloseFormulaParens(draft: string): string {
    const trimmed = draft.trim();
    if (!trimmed) return draft;
    if (!trimmed.startsWith('=') && !isRaporFormulaExpression(trimmed)) return draft;

    let openCount = 0;
    let inQuote: '"' | "'" | null = null;
    for (let i = 0; i < draft.length; i++) {
        const ch = draft[i];
        if (inQuote) {
            if (ch === inQuote && draft[i - 1] !== '\\') inQuote = null;
            continue;
        }
        if (ch === '"' || ch === "'") {
            inQuote = ch;
            continue;
        }
        if (ch === '(') openCount++;
        else if (ch === ')') openCount = Math.max(0, openCount - 1);
    }

    if (openCount > 0) {
        return draft.trimEnd() + ')'.repeat(openCount);
    }
    return draft;
}

/**
 * Mengekstrak daftar koordinat sel ("r:c") yang sedang direferensikan di dalam rumus (baik rentang D6:D15, sel tunggal D6/$D$6/$D6/D$6, maupun $KEY)
 * untuk memberikan highlight warna bergaris putus-putus ala Excel pada kanvas desainer.
 */
export function extractFormulaReferencedCoords(
    formulaText: string,
    sheetCells?: { key?: string; hidden?: boolean; row: number; col: number }[][]
): Set<string> {
    const result = new Set<string>();
    if (!formulaText || !sheetCells || sheetCells.length === 0) return result;
    const trimmed = formulaText.trim();
    if (!trimmed.startsWith('=') && !isRaporFormulaExpression(trimmed)) return result;

    const rowCount = sheetCells.length;
    const colCount = sheetCells[0]?.length || 0;

    // Peta $KEY -> koordinat sel pada sheet aktif
    const keyMap = new Map<string, { r: number; c: number }[]>();
    for (let r = 0; r < rowCount; r++) {
        const row = sheetCells[r] || [];
        for (let c = 0; c < row.length; c++) {
            const cell = row[c];
            if (cell && !cell.hidden && cell.key) {
                const k = `$${cell.key.trim().toUpperCase()}`;
                const arr = keyMap.get(k) || [];
                arr.push({ r, c });
                keyMap.set(k, arr);
            }
        }
    }

    // Buang bagian string dalam tanda kutip agar tidak salah mendeteksi teks biasa
    let stripped = '';
    let inQuote: '"' | "'" | null = null;
    for (let i = 0; i < trimmed.length; i++) {
        const ch = trimmed[i];
        if (inQuote) {
            if (ch === inQuote && trimmed[i - 1] !== '\\') inQuote = null;
            stripped += ' ';
            continue;
        }
        if (ch === '"' || ch === "'") {
            inQuote = ch;
            stripped += ' ';
            continue;
        }
        stripped += ch;
    }

    // 1. Rentang Excel seperti D6:D15, $D$6:$D$15, $D6:$D15, D$6:D$15
    const rangeRegex = /(\$?[A-Za-z]{1,2}\$?[1-9]\d{0,2}\s*:\s*\$?[A-Za-z]{1,2}\$?[1-9]\d{0,2})(?![A-Za-z0-9_])/g;
    stripped = stripped.replace(rangeRegex, (full) => {
        const rng = parseExcelRangeCoord(full);
        if (rng) {
            const rEnd = Math.min(rowCount - 1, rng.rMax);
            const cEnd = Math.min(colCount - 1, rng.cMax);
            for (let r = Math.max(0, rng.rMin); r <= rEnd; r++) {
                for (let c = Math.max(0, rng.cMin); c <= cEnd; c++) {
                    result.add(`${r}:${c}`);
                }
            }
        }
        return ' '.repeat(full.length);
    });

    // 2. Variabel $KEY pada sheet (prioritas di atas $D6 agar $UH1 tidak dianggap kolom UH)
    const tagRegex = /\$[A-Za-z0-9_]+/g;
    stripped = stripped.replace(tagRegex, (tok) => {
        const coords = keyMap.get(tok.toUpperCase());
        if (coords) {
            coords.forEach(({ r, c }) => result.add(`${r}:${c}`));
            return ' '.repeat(tok.length);
        }
        // Biarkan format $C$6 atau $C6 diproses pada tahap koordinat tunggal jika berada dalam batas lembar
        if (/^\$[A-Za-z]{1,2}\$?[1-9]\d{0,2}$/.test(tok)) {
            return tok;
        }
        return ' '.repeat(tok.length);
    });

    // 3. Koordinat sel tunggal seperti D6, $D$6, $D6, atau D$6 (bukan nama fungsi yang diikuti '(')
    const singleRegex = /(?:^|[^A-Za-z0-9_$])(\$?[A-Za-z]{1,2}\$?[1-9]\d{0,2})(?![A-Za-z0-9_(])/g;
    let m: RegExpExecArray | null;
    while ((m = singleRegex.exec(stripped)) !== null) {
        const coord = parseExcelCellCoord(m[1], true);
        if (coord && coord.r >= 0 && coord.r < rowCount && coord.c >= 0 && coord.c < colCount) {
            result.add(`${coord.r}:${coord.c}`);
        }
    }

    return result;
}

/**
 * Menggeser referensi sel dan rentang di dalam rumus secara proporsional seperti Excel saat ditarik (AutoFill / Fill Handle / Ctrl+D / Ctrl+R).
 * Menghormati penguncian '$':
 * - D6   -> geser kolom & baris
 * - $D$6 -> kolom & baris dikunci tetap
 * - $D6  -> kolom dikunci tetap, baris ikut bergeser
 * - D$6  -> kolom ikut bergeser, baris dikunci tetap
 * - $KEY -> jika merujuk ke sel input/dropdown tunggal pada sheet dan sel hasil geser (r+deltaR, c+deltaC) memiliki key sejenis,
 *           otomatis menyesuaikan ke $KEY_BARU (kecuali diawali $$KEY atau sel target tidak punya key).
 */
export function shiftFormulaReferences(
    formula: string,
    deltaR: number,
    deltaC: number,
    options?: {
        sheetCells?: { key?: string; type?: string; hidden?: boolean; row: number; col: number }[][];
    }
): string {
    if (!formula || (deltaR === 0 && deltaC === 0)) return formula;
    const sheetCells = options?.sheetCells;
    const sheetRowCount = sheetCells?.length || 0;
    const sheetColCount = sheetCells?.[0]?.length || 0;
    const maxColForSingleDollarCoord = sheetColCount > 0 ? Math.max(sheetColCount + 10, 52) : 52;

    // Peta $KEY tunggal pada sheet untuk mendukung geser otomatis rumus berbasis $KEY (misal =TERBILANG($FIQIH) -> =TERBILANG($NAHWU))
    const keyCoordMap = new Map<string, { r: number; c: number; type?: string; count: number }>();
    if (sheetCells) {
        for (let r = 0; r < sheetRowCount; r++) {
            const row = sheetCells[r] || [];
            for (let c = 0; c < row.length; c++) {
                const cell = row[c];
                if (cell && !cell.hidden && cell.key) {
                    const upper = cell.key.trim().toUpperCase();
                    if (!upper) continue;
                    const existing = keyCoordMap.get(upper);
                    if (existing) {
                        existing.count += 1;
                    } else {
                        keyCoordMap.set(upper, { r, c, type: cell.type, count: 1 });
                    }
                }
            }
        }
    }

    const shiftSingleCoord = (ref: ParsedExcelRefWithLocks): string => {
        const nextR = ref.lockRow ? ref.r : Math.max(0, ref.r + deltaR);
        const nextC = ref.lockCol ? ref.c : Math.max(0, ref.c + deltaC);
        return formatExcelRefWithLocks({
            r: nextR,
            c: nextC,
            lockCol: ref.lockCol,
            lockRow: ref.lockRow
        });
    };

    let out = '';
    let inQuote: '"' | "'" | null = null;
    let idx = 0;

    while (idx < formula.length) {
        const ch = formula[idx];
        if (inQuote) {
            if (ch === inQuote && formula[idx - 1] !== '\\') {
                inQuote = null;
            }
            out += ch;
            idx++;
            continue;
        }

        if (ch === '"' || ch === "'") {
            inQuote = ch;
            out += ch;
            idx++;
            continue;
        }

        const prevCh = idx > 0 ? formula[idx - 1] : '';
        const isTokenBoundary = idx === 0 || !/[A-Za-z0-9_$]/.test(prevCh);

        if (isTokenBoundary) {
            const rest = formula.slice(idx);

            // 1. Rentang sel Excel: D6:D15, $D$6:$D$15, $D$6:D6, $D6:F$6, dll.
            const rangeMatch = rest.match(/^(\$?[A-Za-z]{1,2}\$?[1-9]\d{0,2})(\s*:\s*)(\$?[A-Za-z]{1,2}\$?[1-9]\d{0,2})(?![A-Za-z0-9_])/);
            if (rangeMatch) {
                const ref1 = parseExcelRefWithLocks(rangeMatch[1], true);
                const ref2 = parseExcelRefWithLocks(rangeMatch[3], true);
                if (ref1 && ref2) {
                    out += `${shiftSingleCoord(ref1)}${rangeMatch[2]}${shiftSingleCoord(ref2)}`;
                    idx += rangeMatch[0].length;
                    continue;
                }
            }

            // 2. Escape $$KEY -> dikunci tetap (dipertahankan sebagai $KEY atau $$KEY? Simpan $KEY pada hasil)
            const lockedVarMatch = rest.match(/^\$\$([A-Za-z0-9_]+)/);
            if (lockedVarMatch) {
                out += `$${lockedVarMatch[1]}`;
                idx += lockedVarMatch[0].length;
                continue;
            }

            // 3. Token diawali '$': cek apakah $KEY pada sheet, atau koordinat $D$6 / $D6
            if (ch === '$') {
                // 3a. Koordinat absolut penuh $D$6 (selalu tidak ambigu karena memiliki dua '$')
                const fullLockMatch = rest.match(/^(\$[A-Za-z]{1,2}\$[1-9]\d{0,2})(?![A-Za-z0-9_]|\s*\()/);
                if (fullLockMatch) {
                    const ref = parseExcelRefWithLocks(fullLockMatch[1], true);
                    if (ref) {
                        out += shiftSingleCoord(ref);
                        idx += fullLockMatch[1].length;
                        continue;
                    }
                }

                // 3b. Variabel $KEY pada sheet atau Tag Sistem
                const varMatch = rest.match(/^\$([A-Za-z0-9_]+)(?!\s*\()/);
                if (varMatch) {
                    const rawVarName = varMatch[1];
                    const upperVar = rawVarName.toUpperCase();
                    const keyInfo = keyCoordMap.get(upperVar);
                    if (keyInfo) {
                        // Jika variabel unik di sheet dan sel pada posisi geser (r+deltaR, c+deltaC) punya key input/dropdown, geser ke key target!
                        if (
                            keyInfo.count === 1 &&
                            sheetCells &&
                            (keyInfo.type === 'input' || keyInfo.type === 'dropdown')
                        ) {
                            const targetR = keyInfo.r + deltaR;
                            const targetC = keyInfo.c + deltaC;
                            const targetCell = sheetCells[targetR]?.[targetC];
                            if (
                                targetCell &&
                                !targetCell.hidden &&
                                targetCell.key &&
                                targetCell.key.trim() !== '' &&
                                (targetCell.type === 'input' || targetCell.type === 'dropdown')
                            ) {
                                out += `$${targetCell.key.trim()}`;
                                idx += varMatch[0].length;
                                continue;
                            }
                        }
                        // Jika tidak ada pasangan geser (misal sel KKM / Total di bawah), biarkan $KEY tetap utuh
                        out += varMatch[0];
                        idx += varMatch[0].length;
                        continue;
                    }

                    // 3c. Bukan $KEY yang terdaftar di sheet: cek apakah koordinat kolom-terkunci $D6
                    const colLockRef = parseExcelRefWithLocks(`$${rawVarName}`, true);
                    if (colLockRef && colLockRef.c < maxColForSingleDollarCoord) {
                        out += shiftSingleCoord(colLockRef);
                        idx += varMatch[0].length;
                        continue;
                    }

                    // Tag sistem seperti $SEMESTER, $NAMA, $RATA_RATA_KELAS -> tetap utuh
                    out += varMatch[0];
                    idx += varMatch[0].length;
                    continue;
                }
            }

            // 4. Koordinat sel tanpa '$' di awal: D6 (relatif penuh) atau D$6 (baris dikunci)
            if (/[A-Za-z]/.test(ch)) {
                const relMatch = rest.match(/^([A-Za-z]{1,2}\$?[1-9]\d{0,2})(?![A-Za-z0-9_]|\s*\()/);
                if (relMatch) {
                    const ref = parseExcelRefWithLocks(relMatch[1], false);
                    if (ref && ref.c < maxColForSingleDollarCoord) {
                        out += shiftSingleCoord(ref);
                        idx += relMatch[1].length;
                        continue;
                    }
                }
            }
        }

        out += ch;
        idx++;
    }

    return out;
}

/**
 * Siklus penguncian referensi '$' ala tombol F4 di Microsoft Excel pada posisi kursor aktif:
 * Urutan: D6 -> $D$6 -> D$6 -> $D6 -> D6 (berlaku juga pada rentang D6:D15 -> $D$6:$D$15 -> D$6:D$15 -> $D6:$D15 -> D6:D15).
 * Jika kursor berada pada variabel $KEY yang merujuk ke sel di sheet (misal $FIQIH di D6), F4 akan mengubahnya ke alamat terkunci $D$6.
 */
export function cycleFormulaReferenceLockAtCaret(
    text: string,
    caretStart: number,
    caretEnd: number,
    sheetCells?: { key?: string; hidden?: boolean; row: number; col: number }[][]
): { nextText: string; selStart: number; selEnd: number; tokenAfter: string } | null {
    if (!text) return null;

    const nextLockState = (ref: ParsedExcelRefWithLocks): ParsedExcelRefWithLocks => {
        if (!ref.lockCol && !ref.lockRow) return { ...ref, lockCol: true, lockRow: true };   // D6 -> $D$6
        if (ref.lockCol && ref.lockRow) return { ...ref, lockCol: false, lockRow: true };    // $D$6 -> D$6
        if (!ref.lockCol && ref.lockRow) return { ...ref, lockCol: true, lockRow: false };   // D$6 -> $D6
        return { ...ref, lockCol: false, lockRow: false };                                    // $D6 -> D6
    };

    const s = Math.max(0, Math.min(caretStart, caretEnd));
    const e = Math.max(0, Math.max(caretStart, caretEnd));

    // Kumpulkan span token yang berada di luar tanda kutip
    interface TokenCandidate {
        start: number;
        end: number;
        raw: string;
        kind: 'range' | 'coord' | 'var';
        part1?: string;
        sep?: string;
        part2?: string;
    }

    const candidates: TokenCandidate[] = [];
    let inQuote: '"' | "'" | null = null;
    let i = 0;
    while (i < text.length) {
        const ch = text[i];
        if (inQuote) {
            if (ch === inQuote && text[i - 1] !== '\\') inQuote = null;
            i++;
            continue;
        }
        if (ch === '"' || ch === "'") {
            inQuote = ch;
            i++;
            continue;
        }

        const prevCh = i > 0 ? text[i - 1] : '';
        if (i === 0 || !/[A-Za-z0-9_$]/.test(prevCh)) {
            const rest = text.slice(i);
            const rngM = rest.match(/^(\$?[A-Za-z]{1,2}\$?[1-9]\d{0,2})(\s*:\s*)(\$?[A-Za-z]{1,2}\$?[1-9]\d{0,2})(?![A-Za-z0-9_])/);
            if (rngM) {
                candidates.push({
                    start: i,
                    end: i + rngM[0].length,
                    raw: rngM[0],
                    kind: 'range',
                    part1: rngM[1],
                    sep: rngM[2],
                    part2: rngM[3]
                });
                i += rngM[0].length;
                continue;
            }

            const coordM = rest.match(/^(\$?[A-Za-z]{1,2}\$?[1-9]\d{0,2})(?![A-Za-z0-9_]|\s*\()/);
            if (coordM && parseExcelRefWithLocks(coordM[1], true)) {
                // Pastikan bukan $KEY di sheet terlebih dahulu
                let isDefinedSheetVar = false;
                if (coordM[1].startsWith('$') && !coordM[1].slice(1).includes('$') && sheetCells) {
                    const keyLookup = coordM[1].slice(1).toUpperCase();
                    for (let rr = 0; rr < sheetCells.length && !isDefinedSheetVar; rr++) {
                        for (let cc = 0; cc < (sheetCells[rr]?.length || 0); cc++) {
                            const cl = sheetCells[rr][cc];
                            if (cl && !cl.hidden && cl.key?.trim().toUpperCase() === keyLookup) {
                                isDefinedSheetVar = true;
                                break;
                            }
                        }
                    }
                }
                if (!isDefinedSheetVar) {
                    candidates.push({
                        start: i,
                        end: i + coordM[1].length,
                        raw: coordM[1],
                        kind: 'coord'
                    });
                    i += coordM[1].length;
                    continue;
                }
            }

            if (ch === '$') {
                const varM = rest.match(/^\$([A-Za-z0-9_]+)(?!\s*\()/);
                if (varM) {
                    candidates.push({
                        start: i,
                        end: i + varM[0].length,
                        raw: varM[0],
                        kind: 'var'
                    });
                    i += varM[0].length;
                    continue;
                }
            }
        }
        i++;
    }

    // Cari kandidat yang bersentuhan dengan posisi kursor [s, e] (atau kandidat terakhir jika kursor tepat di ujung kurung tutup ')')
    let hit = candidates.find(c => (s === e ? s >= c.start && s <= c.end : s < c.end && e > c.start));
    if (!hit && s === e && text[s - 1] === ')') {
        hit = candidates.find(c => c.end === s - 1);
    }
    if (!hit && candidates.length === 1) {
        hit = candidates[0];
    }
    if (!hit) return null;

    let replacement = '';
    if (hit.kind === 'range' && hit.part1 && hit.part2 && hit.sep !== undefined) {
        const r1 = parseExcelRefWithLocks(hit.part1, true);
        const r2 = parseExcelRefWithLocks(hit.part2, true);
        if (!r1 || !r2) return null;
        const p1End = hit.start + hit.part1.length;
        // Jika kursor tunggal berada khusus di dalam koordinat pertama sebelum ':', kunci bagian pertama saja (mendukung pola $D$6:D6)
        if (s === e && s > hit.start && s < p1End) {
            const n1 = formatExcelRefWithLocks(nextLockState(r1));
            replacement = `${n1}${hit.sep}${hit.part2}`;
        } else {
            const n1 = formatExcelRefWithLocks(nextLockState(r1));
            const n2 = formatExcelRefWithLocks(
                r1.lockCol === r2.lockCol && r1.lockRow === r2.lockRow
                    ? nextLockState(r2)
                    : { ...r2, lockCol: nextLockState(r1).lockCol, lockRow: nextLockState(r1).lockRow }
            );
            replacement = `${n1}${hit.sep}${n2}`;
        }
    } else if (hit.kind === 'coord') {
        const ref = parseExcelRefWithLocks(hit.raw, true);
        if (!ref) return null;
        replacement = formatExcelRefWithLocks(nextLockState(ref));
    } else if (hit.kind === 'var' && sheetCells) {
        const keyName = hit.raw.slice(1).toUpperCase();
        let foundCoord: { r: number; c: number } | null = null;
        for (let rr = 0; rr < sheetCells.length && !foundCoord; rr++) {
            for (let cc = 0; cc < (sheetCells[rr]?.length || 0); cc++) {
                const cl = sheetCells[rr][cc];
                if (cl && !cl.hidden && cl.key?.trim().toUpperCase() === keyName) {
                    foundCoord = { r: rr, c: cc };
                    break;
                }
            }
        }
        if (!foundCoord) return null;
        replacement = formatExcelRefWithLocks({
            r: foundCoord.r,
            c: foundCoord.c,
            lockCol: true,
            lockRow: true
        });
    } else {
        return null;
    }

    const nextText = text.slice(0, hit.start) + replacement + text.slice(hit.end);
    return {
        nextText,
        selStart: hit.start,
        selEnd: hit.start + replacement.length,
        tokenAfter: replacement
    };
}

// ============================================================================
// EXCEL-STYLE FILL SERIES & AUTOFILL ENGINE
// ============================================================================

export type AutoFillMode = 'series' | 'increment' | 'copy' | 'format';
export type AutoFillDirection = 'down' | 'up' | 'right' | 'left';

const CALENDAR_SERIES_LISTS: string[][] = [
    ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'],
    ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'],
    ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'],
    ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'],
    ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'],
    ['Muharram', 'Shafar', 'Rabiul Awal', 'Rabiul Akhir', 'Jumadil Awal', 'Jumadil Akhir', 'Rajab', "Sya'ban", 'Ramadhan', 'Syawal', "Dzulqa'dah", 'Dzulhijjah']
];

const ARABIC_DIGITS_STR = '٠١٢٣٤٥٦٧٨٩';

function parseEasternArabicInteger(str: string): { num: number; padLen: number } | null {
    const t = str.trim();
    if (!/^[٠-٩]+$/.test(t)) return null;
    let ascii = '';
    for (let i = 0; i < t.length; i++) {
        const idx = ARABIC_DIGITS_STR.indexOf(t[i]);
        if (idx < 0) return null;
        ascii += String(idx);
    }
    const num = parseInt(ascii, 10);
    if (isNaN(num)) return null;
    return { num, padLen: t.length > 1 && t.startsWith('٠') ? t.length : 0 };
}

function formatEasternArabicInteger(num: number, padLen: number = 0): string {
    const safe = Math.max(0, Math.round(num));
    const raw = padLen > 0 ? String(safe).padStart(padLen, '0') : String(safe);
    return raw.replace(/\d/g, d => ARABIC_DIGITS_STR[Number(d)]);
}

function applyDetectedCasing(sample: string, target: string): string {
    if (!sample) return target;
    if (sample === sample.toUpperCase() && sample !== sample.toLowerCase()) {
        return target.toUpperCase();
    }
    if (sample === sample.toLowerCase() && sample !== sample.toUpperCase()) {
        return target.toLowerCase();
    }
    return target;
}

function matchCalendarSeries(values: string[], stepIndex: number): string | null {
    if (values.length === 0) return null;
    for (const list of CALENDAR_SERIES_LISTS) {
        const lowerList = list.map(item => item.toLowerCase());
        const indices = values.map(v => lowerList.indexOf(v.trim().toLowerCase()));
        if (indices.some(idx => idx < 0)) continue;

        let stride = 1;
        if (indices.length >= 2) {
            const firstDiff = (indices[1] - indices[0] + list.length) % list.length || list.length;
            let consistent = true;
            for (let i = 2; i < indices.length; i++) {
                const d = (indices[i] - indices[i - 1] + list.length) % list.length || list.length;
                if (d !== firstDiff) {
                    consistent = false;
                    break;
                }
            }
            if (!consistent) continue;
            stride = firstDiff;
        }

        const rawIdx = (indices[0] + stepIndex * stride) % list.length;
        const wrappedIdx = (rawIdx + list.length) % list.length;
        const sample = values[values.length - 1].trim();
        return applyDetectedCasing(sample, list[wrappedIdx]);
    }
    return null;
}

/**
 * Menghitung nilai seri berikutnya dari deretan nilai teks/angka sumber (1D) pada indeks target `targetOffsetFromStart`
 * Contoh:
 * - sourceValues = ["1", "2"], targetOffsetFromStart = 2 -> "3"
 * - sourceValues = ["2", "3"], targetOffsetFromStart = -1 (tarik ke atas) -> "1"
 * - sourceValues = ["UH 1"], targetOffsetFromStart = 1 -> "UH 2"
 * - sourceValues = ["1."], targetOffsetFromStart = 1 -> "2."
 * - sourceValues = ["Senin"], targetOffsetFromStart = 1 -> "Selasa"
 */
export function computeSeriesStringAtOffset(
    sourceValues: string[],
    targetOffsetFromStart: number,
    options?: {
        forceSingleNumberIncrement?: boolean;
        hasNumberingHeaderHint?: boolean;
    }
): string {
    const n = sourceValues.length;
    if (n === 0) return '';
    const modIdx = ((targetOffsetFromStart % n) + n) % n;
    const cyclicFallback = sourceValues[modIdx];

    // Jangan ubah tag variabel $NAMA / media / rumus di sini
    if (sourceValues.some(v => v.trim().startsWith('$') || v.trim().startsWith('='))) {
        return cyclicFallback;
    }

    // 1. Cek daftar kalender (Hari, Bulan Masehi, Bulan Hijriah)
    const calMatch = matchCalendarSeries(sourceValues, targetOffsetFromStart);
    if (calMatch !== null) return calMatch;

    // 2. Cek angka Arab Timur murni (١, ٢, ٣...)
    const arabParsed = sourceValues.map(parseEasternArabicInteger);
    if (arabParsed.every(p => p !== null)) {
        const nums = arabParsed.map(p => p!.num);
        if (n >= 2) {
            const step = nums[1] - nums[0];
            const isLinear = nums.every((val, i) => i === 0 || val - nums[i - 1] === step);
            if (isLinear) {
                return formatEasternArabicInteger(nums[0] + targetOffsetFromStart * step, arabParsed[0]!.padLen);
            }
        } else {
            const shouldInc = Boolean(options?.forceSingleNumberIncrement || options?.hasNumberingHeaderHint || nums[0] === 1);
            if (shouldInc) {
                return formatEasternArabicInteger(nums[0] + targetOffsetFromStart, arabParsed[0]!.padLen);
            }
        }
        return cyclicFallback;
    }

    // 3. Cek angka Latin murni (contoh: "1", "2", "01", "75", "80.5")
    const pureNumRegex = /^([+-]?\d+(?:\.\d+)?)$/;
    if (sourceValues.every(v => pureNumRegex.test(v.trim()))) {
        const nums = sourceValues.map(v => Number(v.trim()));
        const firstTrim = sourceValues[0].trim();
        const padLen = /^\d+$/.test(firstTrim) && firstTrim.length > 1 && firstTrim.startsWith('0') ? firstTrim.length : 0;
        const maxDecimals = Math.max(
            0,
            ...sourceValues.map(v => {
                const parts = v.trim().split('.');
                return parts[1] ? parts[1].length : 0;
            })
        );

        const formatNumOut = (val: number): string => {
            if (maxDecimals > 0) {
                return Number(val.toFixed(maxDecimals)).toString();
            }
            const rounded = Math.round(val);
            if (padLen > 0 && rounded >= 0) {
                return String(rounded).padStart(padLen, '0');
            }
            return String(rounded);
        };

        if (n >= 2) {
            const step = nums[1] - nums[0];
            const isArithmetic = nums.every((val, i) => i === 0 || Math.abs((val - nums[i - 1]) - step) < 1e-9);
            if (isArithmetic) {
                return formatNumOut(nums[0] + targetOffsetFromStart * step);
            }
            return cyclicFallback;
        }

        // Jika hanya 1 sel angka: otomatis urutkan jika nilainya "1" / "01", atau kolom bernomor ("NO"), atau mode 'increment' (Ctrl+Drag / Opsi Urutkan)
        const shouldIncrementSingle = Boolean(
            options?.forceSingleNumberIncrement ||
            options?.hasNumberingHeaderHint ||
            firstTrim === '1' ||
            /^0+1$/.test(firstTrim)
        );
        if (shouldIncrementSingle) {
            const nextVal = nums[0] + targetOffsetFromStart;
            // Hindari angka <= 0 saat ditarik ke atas kecuali dipaksa
            if (nextVal <= 0 && nums[0] >= 1 && !options?.forceSingleNumberIncrement) {
                return '1';
            }
            return formatNumOut(nextVal);
        }
        return cyclicFallback;
    }

    // 4. Cek teks berpola angka di akhir atau awal (contoh: "1.", "(1)", "UH 1", "Tugas 01", "Mapel 1", "Semester 1")
    const patternRegex = /^(.*?)(\d+)([^\d]*)$/;
    const parsedPatterns = sourceValues.map(v => v.match(patternRegex));
    if (parsedPatterns.every(m => m !== null)) {
        const p0 = parsedPatterns[0]!;
        const sameAffix = parsedPatterns.every(m => m![1].toLowerCase() === p0[1].toLowerCase() && m![3].toLowerCase() === p0[3].toLowerCase());
        // Hindari mengubah tahun seperti "Tahun 2026/2027"
        const looksLikeSlashYear = p0[3].trim().startsWith('/') || p0[1].trim().endsWith('/');
        if (sameAffix && !looksLikeSlashYear) {
            const nums = parsedPatterns.map(m => parseInt(m![2], 10));
            const padLen = p0[2].length > 1 && p0[2].startsWith('0') ? p0[2].length : 0;
            let step = 1;
            let valid = true;
            if (n >= 2) {
                step = nums[1] - nums[0];
                valid = nums.every((val, i) => i === 0 || val - nums[i - 1] === step);
            }
            if (valid) {
                const rawNext = nums[0] + targetOffsetFromStart * step;
                if (rawNext >= 0) {
                    const numStr = padLen > 0 ? String(rawNext).padStart(padLen, '0') : String(rawNext);
                    const sampleAffix = parsedPatterns[modIdx]!;
                    return `${sampleAffix[1]}${numStr}${sampleAffix[3]}`;
                }
            }
        }
    }

    return cyclicFallback;
}

/**
 * Menghasilkan key variabel input berikutnya saat sel bertipe 'input'/'dropdown' di-autofill
 * Contoh: "UH1" -> "UH2", "NILAI_1" -> "NILAI_2", atau "FIQIH" -> "FIQIH_2" (unik tidak bentrok).
 */
export function computeAutoFillNextInputKey(
    sourceKeys: (string | undefined)[],
    targetOffsetFromStart: number,
    usedKeysUpper: Set<string>,
    mode: AutoFillMode
): string | undefined {
    const n = sourceKeys.length;
    if (n === 0) return undefined;
    const modIdx = ((targetOffsetFromStart % n) + n) % n;
    const baseRaw = sourceKeys[modIdx]?.trim();
    if (!baseRaw) return undefined;

    let candidate = baseRaw;
    if (mode === 'series' || mode === 'increment') {
        const trailingNumMatches = sourceKeys.map(k => (k || '').trim().match(/^(.*?)(\d+)$/));
        if (trailingNumMatches.every(m => m !== null)) {
            const m0 = trailingNumMatches[0]!;
            const samePrefix = trailingNumMatches.every(m => m![1].toUpperCase() === m0[1].toUpperCase());
            if (samePrefix) {
                const nums = trailingNumMatches.map(m => parseInt(m![2], 10));
                const padLen = m0[2].length > 1 && m0[2].startsWith('0') ? m0[2].length : 0;
                const step = n >= 2 ? nums[1] - nums[0] : 1;
                const isLin = n < 2 || nums.every((val, i) => i === 0 || val - nums[i - 1] === step);
                if (isLin) {
                    const nextNum = Math.max(1, nums[0] + targetOffsetFromStart * step);
                    const numStr = padLen > 0 ? String(nextNum).padStart(padLen, '0') : String(nextNum);
                    candidate = `${m0[1]}${numStr}`;
                }
            }
        }
    }

    let finalKey = candidate.toUpperCase().replace(/\s+/g, '_');
    if (usedKeysUpper.has(finalKey)) {
        const stem = finalKey.replace(/_\d+$/, '');
        let suffix = 2;
        while (usedKeysUpper.has(`${stem}_${suffix}`)) {
            suffix++;
        }
        finalKey = `${stem}_${suffix}`;
    }
    usedKeysUpper.add(finalKey);
    return finalKey;
}

