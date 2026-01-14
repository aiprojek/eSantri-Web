
export interface SyncedEntity {
  lastModified?: number;
  deleted?: boolean;
}

export enum Page {
  Dashboard = 'Dashboard',
  Santri = 'Santri',
  Akademik = 'Akademik',
  Absensi = 'Absensi', // Verified
  DataMaster = 'DataMaster',
  Keuangan = 'Keuangan',
  Keasramaan = 'Keasramaan',
  BukuKas = 'BukuKas',
  Surat = 'Surat',
  Laporan = 'Laporan',
  AuditLog = 'AuditLog',
  Pengaturan = 'Pengaturan',
  SyncAdmin = 'SyncAdmin',
  Tentang = 'Tentang',
  PSB = 'PSB'
}

export type AccessLevel = 'none' | 'read' | 'write';

export interface UserPermissions {
    santri: AccessLevel;
    psb: AccessLevel;
    akademik: AccessLevel;
    absensi: AccessLevel; // Verified
    datamaster: AccessLevel;
    keuangan: AccessLevel;
    keasramaan: AccessLevel;
    bukukas: AccessLevel;
    surat: AccessLevel;
    laporan: AccessLevel;
    auditlog: AccessLevel;
    pengaturan: AccessLevel;
    syncAdmin: boolean;
}

export interface User {
    id: number;
    username: string;
    passwordHash: string;
    fullName: string;
    role: 'admin' | 'staff';
    permissions: UserPermissions;
    securityQuestion: string;
    securityAnswerHash: string;
    recoveryKeyHash?: string;
    isDefaultAdmin?: boolean;
    lastLogin?: string;
}

export interface Alamat {
    detail: string;
    desaKelurahan?: string;
    kecamatan?: string;
    kabupatenKota?: string;
    provinsi?: string;
    kodePos?: string;
}

export interface RiwayatStatus {
    id: number;
    status: 'Aktif' | 'Hiatus' | 'Lulus' | 'Keluar/Pindah' | 'Masuk';
    tanggal: string;
    keterangan: string;
}

export interface Prestasi {
    id: number;
    jenis: string;
    tingkat: string;
    nama: string;
    tahun: number;
    penyelenggara: string;
}

export interface Pelanggaran {
    id: number;
    tanggal: string;
    jenis: 'Ringan' | 'Sedang' | 'Berat';
    deskripsi: string;
    tindakLanjut: string;
    pelapor: string;
}

export interface Santri extends SyncedEntity {
    id: number;
    nis: string;
    nisn?: string;
    nik?: string;
    namaLengkap: string;
    namaHijrah?: string;
    jenisKelamin: 'Laki-laki' | 'Perempuan';
    tempatLahir: string;
    tanggalLahir: string;
    kewarganegaraan: 'WNI' | 'WNA' | 'Keturunan';
    
    // Alamat
    alamat: Alamat;
    
    // Kontak
    namaAyah?: string;
    nikAyah?: string;
    statusAyah?: string;
    pendidikanAyah?: string;
    pekerjaanAyah?: string;
    penghasilanAyah?: string;
    teleponAyah?: string;
    tanggalLahirAyah?: string;
    tempatLahirAyah?: string;
    alamatAyah?: Alamat;

    namaIbu?: string;
    nikIbu?: string;
    statusIbu?: string;
    pendidikanIbu?: string;
    pekerjaanIbu?: string;
    penghasilanIbu?: string;
    teleponIbu?: string;
    tanggalLahirIbu?: string;
    tempatLahirIbu?: string;
    alamatIbu?: Alamat;

    namaWali?: string;
    statusWali?: string; // Hubungan
    statusHidupWali?: string;
    pendidikanWali?: string;
    pekerjaanWali?: string;
    penghasilanWali?: string;
    teleponWali?: string;
    tanggalLahirWali?: string;
    tempatLahirWali?: string;
    alamatWali?: Alamat;

    // Akademik
    jenjangId: number;
    kelasId: number;
    rombelId: number;
    tanggalMasuk: string;
    status: 'Aktif' | 'Hiatus' | 'Lulus' | 'Keluar/Pindah' | 'Masuk';
    tanggalStatus?: string;
    
    // Data Lain
    fotoUrl?: string;
    sekolahAsal?: string;
    alamatSekolahAsal?: string;
    jenisSantri?: string;
    statusKeluarga?: string;
    anakKe?: number;
    jumlahSaudara?: number;
    berkebutuhanKhusus?: string;
    riwayatPenyakit?: string;
    tinggiBadan?: number;
    beratBadan?: number;
    jarakKePondok?: string;
    hobi?: string[];
    
    riwayatStatus?: RiwayatStatus[];
    prestasi?: Prestasi[];
    pelanggaran?: Pelanggaran[];
    
    // Kamar
    kamarId?: number;
}

export interface Jenjang {
    id: number;
    nama: string;
    kode?: string;
    mudirId?: number;
    hariLibur?: number[]; // NEW: 0 (Minggu) - 6 (Sabtu), Specific per Jenjang
}

export interface Kelas {
    id: number;
    nama: string;
    jenjangId: number;
}

export interface Rombel {
    id: number;
    nama: string;
    kelasId: number;
    waliKelasId?: number;
}

export interface RiwayatJabatan {
    id: number;
    jabatan: string;
    tanggalMulai: string;
    tanggalSelesai?: string;
}

export interface TenagaPengajar {
    id: number;
    nama: string;
    riwayatJabatan: RiwayatJabatan[];
}

export interface MataPelajaran {
    id: number;
    nama: string;
    jenjangId: number;
}

export interface GedungAsrama {
    id: number;
    nama: string;
    jenis: 'Putra' | 'Putri';
}

export interface Kamar {
    id: number;
    nama: string;
    gedungId: number;
    kapasitas: number;
    musyrifId?: number;
}

export interface Biaya {
    id: number;
    nama: string;
    nominal: number;
    jenis: 'Bulanan' | 'Sekali Bayar' | 'Cicilan';
    jenjangId?: number;
    tahunMasuk?: number;
    jumlahCicilan?: number;
    nominalCicilan?: number;
}

export interface Tagihan extends SyncedEntity {
    id: number;
    santriId: number;
    biayaId: number;
    deskripsi: string;
    nominal: number;
    status: 'Lunas' | 'Belum Lunas';
    bulan: number;
    tahun: number;
    tanggalLunas?: string;
    pembayaranId?: number;
}

export interface Pembayaran extends SyncedEntity {
    id: number;
    santriId: number;
    tagihanIds: number[];
    jumlah: number;
    tanggal: string;
    metode: 'Tunai' | 'Transfer';
    catatan?: string;
    disetorKeKas: boolean;
}

export interface SaldoSantri extends SyncedEntity {
    santriId: number;
    saldo: number;
}

export interface TransaksiSaldo extends SyncedEntity {
    id: number;
    santriId: number;
    jenis: 'Deposit' | 'Penarikan';
    jumlah: number;
    keterangan: string;
    tanggal: string;
    saldoSetelah: number;
}

export interface TransaksiKas extends SyncedEntity {
    id: number;
    tanggal: string;
    jenis: 'Pemasukan' | 'Pengeluaran';
    kategori: string;
    deskripsi: string;
    jumlah: number;
    saldoSetelah: number;
    penanggungJawab?: string;
}

export interface SuratSignatory {
    id: string;
    jabatan: string;
    nama: string;
    nip?: string;
    signatureUrl?: string; // Base64 or URL
}

export interface MengetahuiConfig {
    show: boolean;
    jabatan: string;
    align: 'left' | 'center' | 'right';
}

export interface TempatTanggalConfig {
    show: boolean;
    position: 'top-right' | 'bottom-left' | 'bottom-right';
    align: 'left' | 'center' | 'right';
}

export interface MarginConfig {
    top: number;
    right: number;
    bottom: number;
    left: number;
}

export interface StampConfig {
    show: boolean;
    stampUrl?: string;
    placementSignatoryId?: string;
}

export interface SuratTemplate extends SyncedEntity {
    id: number;
    nama: string;
    kategori: 'Resmi' | 'Pemberitahuan' | 'Izin' | 'Lainnya';
    judul: string; // Kop Judul
    konten: string; // HTML content with placeholders
    signatories?: SuratSignatory[];
    mengetahuiConfig?: MengetahuiConfig;
    tempatTanggalConfig?: TempatTanggalConfig;
    marginConfig?: MarginConfig;
    stampConfig?: StampConfig;
    showJudul?: boolean;
}

export interface ArsipSurat extends SyncedEntity {
    id: number;
    nomorSurat: string;
    perihal: string;
    tujuan: string;
    isiSurat: string; // Final generated HTML
    tanggalBuat: string;
    templateId?: number;
    tempatCetak?: string;
    tanggalCetak?: string;
    
    // Snapshots of configs at time of creation
    tempatTanggalConfig?: TempatTanggalConfig;
    signatoriesSnapshot?: SuratSignatory[];
    mengetahuiSnapshot?: MengetahuiConfig;
    marginConfig?: MarginConfig;
    stampSnapshot?: StampConfig;
    showJudulSnapshot?: boolean;
}

export interface NisJenjangConfig {
    jenjangId: number;
    startNumber: number;
    padding: number;
}

export interface NisSettings {
    generationMethod: 'custom' | 'global' | 'dob';
    
    // Custom
    format: string;
    jenjangConfig: NisJenjangConfig[];
    masehiYearSource: 'auto' | 'manual';
    manualMasehiYear: number;
    hijriahYearSource: 'auto' | 'manual';
    manualHijriahYear: number;

    // Global
    globalPrefix: string;
    globalUseYearPrefix: boolean;
    globalUseJenjangCode: boolean;
    globalStartNumber: number;
    globalPadding: number;

    // DOB
    dobFormat: 'YYYYMMDD' | 'DDMMYY' | 'YYMMDD';
    dobSeparator: string;
    dobUseJenjangCode: boolean;
    dobPadding: number;
}

export type SyncProvider = 'none' | 'dropbox';

export interface CloudSyncConfig {
    provider: SyncProvider;
    dropboxAppKey?: string;
    dropboxRefreshToken?: string;
    dropboxToken?: string;
    dropboxTokenExpiresAt?: number;
    lastSync: string | null;
    autoSync: boolean;
}

export interface StorageStats {
    used: number;
    total: number;
    percent: number;
}

export interface SyncFileRecord {
    id: string;
    name: string;
    path_lower: string;
    client_modified: string;
    size: number;
    status: 'pending' | 'merged';
}

export type BackupFrequency = 'daily' | 'weekly' | 'never';

export interface BackupConfig {
    frequency: BackupFrequency;
    lastBackup: string | null;
}

export type PsbFieldType = 'text' | 'paragraph' | 'radio' | 'checkbox' | 'file' | 'section' | 'statement';

export interface PsbCustomField {
    id: string;
    type: PsbFieldType;
    label: string;
    required: boolean;
    options?: string[]; // for radio/checkbox
}

export type PsbDesignStyle = 'classic' | 'modern' | 'bold' | 'dark' | 'ceria';
export type PsbSubmissionMethod = 'whatsapp' | 'google_sheet' | 'hybrid';

export interface PsbFormTemplate {
    id: string;
    name: string;
    targetJenjangId?: number;
    designStyle?: PsbDesignStyle;
    activeFields: string[];
    requiredDocuments: string[];
    customFields: PsbCustomField[];
    submissionMethod?: PsbSubmissionMethod;
    googleScriptUrl?: string;
}

export interface PsbPosterTemplate {
    id: string;
    name: string;
    style: PsbDesignStyle;
    ratio: string;
    customInfo: string;
    details: string;
    generatedPrompt?: string;
}

export interface PsbConfig {
    tahunAjaranAktif: string;
    targetKuota: number;
    nomorHpAdmin: string;
    pesanSukses: string;
    activeGelombang: number;
    biayaPendaftaran: number;
    infoRekening: string;
    targetJenjangId?: number;
    
    // Form Builder
    activeFields: string[];
    requiredDocuments: string[];
    customFields?: PsbCustomField[];
    
    // Submission Config
    submissionMethod?: PsbSubmissionMethod;
    googleScriptUrl?: string; // For Google Sheet / Hybrid

    // Visuals
    designStyle?: PsbDesignStyle;
    posterTitle?: string;
    posterSubtitle?: string;
    posterInfo?: string;

    // Templates
    templates?: PsbFormTemplate[];
    posterTemplates?: PsbPosterTemplate[];
}

export interface Pendaftar {
    id: number;
    namaLengkap: string;
    nisn: string;
    nik: string;
    jenisKelamin: 'Laki-laki' | 'Perempuan';
    tempatLahir: string;
    tanggalLahir: string;
    kewarganegaraan?: string;
    alamat: string;
    desaKelurahan?: string;
    kecamatan?: string;
    kabupatenKota?: string;
    provinsi?: string;
    kodePos?: string;
    
    namaWali: string;
    nomorHpWali: string;
    hubunganWali?: string;
    statusHidupWali?: string;
    pekerjaanWali?: string;
    pendidikanWali?: string;
    penghasilanWali?: string;

    namaAyah?: string;
    nikAyah?: string;
    statusAyah?: string;
    pekerjaanAyah?: string;
    pendidikanAyah?: string;
    penghasilanAyah?: string;
    teleponAyah?: string;

    namaIbu?: string;
    nikIbu?: string;
    statusIbu?: string;
    pekerjaanIbu?: string;
    pendidikanIbu?: string;
    penghasilanIbu?: string;
    teleponIbu?: string;

    jenjangId: number;
    asalSekolah: string;
    alamatSekolahAsal?: string;
    jalurPendaftaran?: 'Reguler' | 'Prestasi' | 'Yatim/Dhuafa';
    status: 'Baru' | 'Diterima' | 'Cadangan' | 'Ditolak';
    tanggalDaftar: string;
    catatan?: string;
    gelombang?: number;
    
    customData?: string; // JSON string for extra fields / files
    
    // Fields for transfer to Santri
    statusKeluarga?: string;
    anakKe?: number;
    jumlahSaudara?: number;
    berkebutuhanKhusus?: string;
    namaHijrah?: string;
}

export interface AuditLog {
    id: string;
    table_name: string;
    record_id: string;
    operation: 'INSERT' | 'UPDATE' | 'DELETE';
    old_data?: any;
    new_data?: any;
    changed_by: string;
    username?: string; // Added for clarity
    created_at: string;
}

export interface SyncHistory {
    id: string; // fileId
    fileId: string;
    fileName: string;
    mergedAt: string;
    mergedBy: string;
    recordCount: number;
}

// Rapor Designer Types: Excel-like Grid Logic
export type RaporColumnType = 'label' | 'data' | 'input' | 'formula' | 'dropdown';

export interface GridCell {
    id: string;
    row: number;
    col: number;
    value: string; // The Label or Content
    type: RaporColumnType;
    key?: string; // $VAR name
    colSpan?: number;
    rowSpan?: number;
    hidden?: boolean; // If covered by a merge
    width?: number; // In pixels
    align?: 'left' | 'center' | 'right';
    // NEW: Border Control (Excel-like)
    borders?: {
        top?: boolean;
        right?: boolean;
        bottom?: boolean;
        left?: boolean;
    };
    // NEW: Options for Dropdown type
    options?: string[]; 
}

export interface RaporTemplate {
    id: string;
    name: string;
    rowCount: number;
    colCount: number;
    cells: GridCell[][]; // 2D Array
    lastModified: string;
}

// Legacy support if needed, but we'll try to migrate logic to GridCell
export type RaporColumn = GridCell; 

export interface NilaiMapel {
    mapelId: number;
    nilaiAngka: number;
    nilaiHuruf?: string;
    predikat?: string; // A, B, C, D
    deskripsi?: string;
}

export interface RaporRecord extends SyncedEntity {
    id: number;
    santriId: number;
    tahunAjaran: string; // "2024/2025"
    semester: 'Ganjil' | 'Genap';
    jenjangId: number;
    kelasId: number;
    rombelId: number;
    
    // Akademik (Standardized for Reports)
    nilai: NilaiMapel[];
    
    // Absensi
    sakit: number;
    izin: number;
    alpha: number;
    
    // Kepribadian / Akhlak (Key-Value dynamic)
    kepribadian: { aspek: string; nilai: string }[];
    
    // Ekstrakurikuler
    ekstrakurikuler: { kegiatan: string; nilai: string; keterangan?: string }[];
    
    // Catatan
    catatanWaliKelas?: string;
    keputusan?: string; // "Naik ke Kelas ..." atau "Lulus"
    tanggalRapor: string;

    // NEW: Store raw data from the custom builder form 
    // This allows preserving data fields that don't map to standard schema
    customData?: string; // JSON string of Record<columnKey, value>
}

// NEW: Absensi Record
export interface AbsensiRecord extends SyncedEntity {
    id: number;
    santriId: number;
    rombelId: number;
    tanggal: string; // YYYY-MM-DD
    status: 'H' | 'S' | 'I' | 'A';
    keterangan?: string;
    recordedBy?: string; // Username of teacher
}

export enum ReportType {
    DashboardSummary = 'DashboardSummary',
    Biodata = 'Biodata',
    KartuSantri = 'KartuSantri',
    LabelSantri = 'LabelSantri',
    DaftarRombel = 'DaftarRombel',
    LembarAbsensi = 'LembarAbsensi',
    LembarNilai = 'LembarNilai',
    LembarPembinaan = 'LembarPembinaan',
    LembarKedatangan = 'LembarKedatangan',
    LembarRapor = 'LembarRapor',
    FinanceSummary = 'FinanceSummary',
    LaporanArusKas = 'LaporanArusKas',
    RekeningKoranSantri = 'RekeningKoranSantri',
    DaftarWaliKelas = 'DaftarWaliKelas',
    LaporanKontak = 'LaporanKontak',
    LaporanAsrama = 'LaporanAsrama',
    LaporanMutasi = 'LaporanMutasi',
    FormulirIzin = 'FormulirIzin',
    RaporLengkap = 'RaporLengkap', // NEW
}

export interface PondokSettings extends SyncedEntity {
    id?: number;
    namaYayasan: string;
    namaPonpes: string;
    nspp: string;
    npsn: string;
    alamat: string;
    telepon: string;
    website: string;
    email: string;
    logoYayasanUrl?: string;
    logoPonpesUrl?: string;
    
    // Struktur
    mudirAamId?: number;
    jenjang: Jenjang[];
    kelas: Kelas[];
    rombel: Rombel[];
    tenagaPengajar: TenagaPengajar[];
    mataPelajaran: MataPelajaran[];
    
    // Asrama
    gedungAsrama: GedungAsrama[];
    kamar: Kamar[];
    
    // Keuangan
    biaya: Biaya[];
    
    // Pengaturan Lain
    nisSettings: NisSettings;
    multiUserMode: boolean;
    suratTagihanPembuka: string;
    suratTagihanPenutup: string;
    suratTagihanCatatan?: string;
    pesanWaTunggakan: string;
    // Removed global hariLibur in favor of Jenjang-specific holidays
    
    backupConfig: BackupConfig;
    cloudSyncConfig: CloudSyncConfig;
    psbConfig: PsbConfig;
    
    // Akademik
    raporTemplates?: RaporTemplate[]; // NEW: Saved Templates
    
    // Legalitas (Optional for now)
    skMenteri?: string;
    aktaNotaris?: string;
}
