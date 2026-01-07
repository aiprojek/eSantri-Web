
export type Page = 
  | 'Dashboard' 
  | 'Santri' 
  | 'PSB' 
  | 'DataMaster' 
  | 'Keuangan' 
  | 'Keasramaan' 
  | 'BukuKas' 
  | 'Surat' 
  | 'Laporan' 
  | 'AuditLog' 
  | 'Pengaturan' 
  | 'SyncAdmin' 
  | 'Tentang';

export const Page = {
  Dashboard: 'Dashboard' as Page,
  Santri: 'Santri' as Page,
  PSB: 'PSB' as Page,
  DataMaster: 'DataMaster' as Page,
  Keuangan: 'Keuangan' as Page,
  Keasramaan: 'Keasramaan' as Page,
  BukuKas: 'BukuKas' as Page,
  Surat: 'Surat' as Page,
  Laporan: 'Laporan' as Page,
  AuditLog: 'AuditLog' as Page,
  Pengaturan: 'Pengaturan' as Page,
  SyncAdmin: 'SyncAdmin' as Page,
  Tentang: 'Tentang' as Page,
};

export type UserRole = 'admin' | 'staff';
export type AccessLevel = 'none' | 'read' | 'write';

export interface UserPermissions {
    santri: AccessLevel;
    psb: AccessLevel;
    datamaster: AccessLevel;
    keuangan: AccessLevel;
    keasramaan: AccessLevel;
    bukukas: AccessLevel;
    surat: AccessLevel;
    laporan: AccessLevel;
    auditlog: AccessLevel;
    pengaturan: AccessLevel;
    syncAdmin?: boolean; // New Permission: Allow staff to act as Sync Admin
}

export interface User {
    id: number;
    username: string;
    passwordHash: string;
    fullName: string;
    role: UserRole;
    permissions: UserPermissions;
    securityQuestion: string;
    securityAnswerHash: string;
    recoveryKeyHash?: string; // New field for emergency reset
    isDefaultAdmin?: boolean;
    lastLogin?: string;
}

export type SyncProvider = 'none' | 'dropbox';

export interface CloudSyncConfig {
    provider: SyncProvider;
    lastSync: string | null;
    autoSync?: boolean;
    dropboxToken?: string;
    dropboxAppKey?: string;
    dropboxRefreshToken?: string;
    dropboxTokenExpiresAt?: number;
}

export interface StorageStats {
    used: number;
    total?: number;
    percent?: number;
}

// UPDATE: Added 'deleted' property for Soft Delete support
export interface SyncedEntity {
    lastModified?: number;
    deleted?: boolean; 
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
    jenisSantri?: string;
    statusKeluarga?: string;
    anakKe?: number;
    jumlahSaudara?: number;
    berkebutuhanKhusus?: string;
    
    alamat: Alamat;
    
    namaAyah?: string;
    nikAyah?: string;
    statusAyah?: string;
    pekerjaanAyah?: string;
    pendidikanAyah?: string;
    penghasilanAyah?: string;
    teleponAyah?: string;
    tempatLahirAyah?: string;
    tanggalLahirAyah?: string;
    alamatAyah?: Alamat;

    namaIbu?: string;
    nikIbu?: string;
    statusIbu?: string;
    pekerjaanIbu?: string;
    pendidikanIbu?: string;
    penghasilanIbu?: string;
    teleponIbu?: string;
    tempatLahirIbu?: string;
    tanggalLahirIbu?: string;
    alamatIbu?: Alamat;

    namaWali?: string;
    statusWali?: string;
    statusHidupWali?: string;
    pekerjaanWali?: string;
    pendidikanWali?: string;
    penghasilanWali?: string;
    teleponWali?: string;
    tempatLahirWali?: string;
    tanggalLahirWali?: string;
    alamatWali?: Alamat;

    jenjangId: number;
    kelasId: number;
    rombelId: number;
    tanggalMasuk: string;
    sekolahAsal?: string;
    alamatSekolahAsal?: string;
    status: 'Aktif' | 'Hiatus' | 'Lulus' | 'Keluar/Pindah';
    tanggalStatus?: string;
    fotoUrl?: string;

    kamarId?: number;

    riwayatStatus?: RiwayatStatus[];
    prestasi?: Prestasi[];
    pelanggaran?: Pelanggaran[];
    hobi?: string[];
    
    tinggiBadan?: number;
    beratBadan?: number;
    riwayatPenyakit?: string;
    jarakKePondok?: string;
}

export interface Jenjang extends SyncedEntity {
    id: number;
    nama: string;
    kode?: string;
    mudirId?: number;
}

export interface Kelas extends SyncedEntity {
    id: number;
    nama: string;
    jenjangId: number;
}

export interface Rombel extends SyncedEntity {
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

export interface TenagaPengajar extends SyncedEntity {
    id: number;
    nama: string;
    riwayatJabatan: RiwayatJabatan[];
}

export interface MataPelajaran extends SyncedEntity {
    id: number;
    nama: string;
    jenjangId: number;
}

export interface GedungAsrama extends SyncedEntity {
    id: number;
    nama: string;
    jenis: 'Putra' | 'Putri';
}

export interface Kamar extends SyncedEntity {
    id: number;
    nama: string;
    gedungId: number;
    kapasitas: number;
    musyrifId?: number;
}

export interface Biaya extends SyncedEntity {
    id: number;
    nama: string;
    jenis: 'Bulanan' | 'Sekali Bayar' | 'Cicilan';
    nominal: number;
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
    bulan: number;
    tahun: number;
    nominal: number;
    status: 'Belum Lunas' | 'Lunas';
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
    tanggal: string;
    jenis: 'Deposit' | 'Penarikan';
    jumlah: number;
    keterangan?: string;
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
    penanggungJawab: string;
}

export interface NisJenjangConfig {
    jenjangId: number;
    startNumber: number;
    padding: number;
}

export interface NisSettings {
    generationMethod: 'custom' | 'global' | 'dob';
    format: string;
    jenjangConfig: NisJenjangConfig[];
    masehiYearSource: 'auto' | 'manual';
    manualMasehiYear: number;
    hijriahYearSource: 'auto' | 'manual';
    manualHijriahYear: number;
    globalPrefix: string;
    globalUseYearPrefix: boolean;
    globalUseJenjangCode: boolean;
    globalStartNumber: number;
    globalPadding: number;
    dobFormat: 'YYYYMMDD' | 'DDMMYY' | 'YYMMDD';
    dobSeparator: string;
    dobUseJenjangCode: boolean;
    dobPadding: number;
}

export interface BackupConfig {
    frequency: BackupFrequency;
    lastBackup: string | null;
}

export type BackupFrequency = 'daily' | 'weekly' | 'never';
export type PsbDesignStyle = 'classic' | 'modern' | 'bold' | 'dark' | 'ceria';
export type PsbFieldType = 'text' | 'paragraph' | 'radio' | 'checkbox' | 'file' | 'section' | 'statement';
export type PsbSubmissionMethod = 'whatsapp' | 'google_sheet' | 'hybrid'; 

export interface PsbCustomField {
    id: string;
    type: PsbFieldType;
    label: string;
    required: boolean;
    options?: string[];
}

export interface PsbFormTemplate {
    id: string;
    name: string;
    targetJenjangId?: number;
    designStyle: PsbDesignStyle;
    activeFields: string[];
    requiredDocuments: string[];
    customFields: PsbCustomField[];
    submissionMethod?: PsbSubmissionMethod;
    googleScriptUrl?: string;
}

// NEW INTERFACE FOR POSTER TEMPLATES
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
    activeFields: string[];
    requiredDocuments: string[];
    designStyle: PsbDesignStyle;
    posterTitle?: string;
    posterSubtitle?: string;
    posterInfo?: string;
    customFields?: PsbCustomField[];
    templates?: PsbFormTemplate[];
    posterTemplates?: PsbPosterTemplate[]; // Added this
    enableCloudSubmit?: boolean;
    suratPernyataan?: { aktif: boolean; judul: string; isi: string; };
    telegramUsername?: string;
    submissionMethod?: PsbSubmissionMethod; 
    googleScriptUrl?: string; 
}

export interface PondokSettings extends SyncedEntity {
    namaYayasan: string;
    namaPonpes: string;
    skMenteri?: string;
    aktaNotaris?: string;
    nspp?: string;
    npsn?: string;
    alamat: string;
    telepon: string;
    website: string;
    email: string;
    logoYayasanUrl?: string;
    logoPonpesUrl?: string;
    mudirAamId?: number;
    
    jenjang: Jenjang[];
    kelas: Kelas[];
    rombel: Rombel[];
    tenagaPengajar: TenagaPengajar[];
    mataPelajaran: MataPelajaran[];
    gedungAsrama: GedungAsrama[];
    kamar: Kamar[];
    biaya: Biaya[];
    
    nisSettings: NisSettings;
    backupConfig: BackupConfig;
    cloudSyncConfig: CloudSyncConfig;
    psbConfig: PsbConfig;
    
    multiUserMode: boolean;

    suratTagihanPembuka: string;
    suratTagihanPenutup: string;
    suratTagihanCatatan: string;
    pesanWaTunggakan: string;
}

export interface SuratSignatory {
    id: string;
    jabatan: string;
    nama: string;
    nip?: string;
    signatureUrl?: string;
}

export interface MengetahuiConfig {
    show: boolean;
    jabatan: string;
    align: 'left' | 'center' | 'right';
}

export interface TempatTanggalConfig {
    show: boolean;
    position: 'top-right' | 'bottom-right' | 'bottom-left';
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
    judul: string;
    showJudul?: boolean;
    konten: string;
    signatories?: SuratSignatory[];
    mengetahuiConfig?: MengetahuiConfig;
    tempatTanggalConfig?: TempatTanggalConfig;
    marginConfig?: MarginConfig;
    stampConfig?: StampConfig;
}

export interface ArsipSurat extends SyncedEntity {
    id: number;
    nomorSurat: string;
    perihal: string;
    tujuan: string;
    isiSurat: string;
    tanggalBuat: string;
    templateId: number;
    tempatCetak?: string;
    tanggalCetak?: string;
    signatoriesSnapshot?: SuratSignatory[];
    mengetahuiSnapshot?: MengetahuiConfig;
    tempatTanggalConfig?: TempatTanggalConfig;
    marginConfig?: MarginConfig;
    stampSnapshot?: StampConfig;
    showJudulSnapshot?: boolean;
}

export interface Pendaftar extends SyncedEntity {
    id: number;
    namaLengkap: string;
    namaHijrah?: string;
    nisn?: string;
    nik?: string;
    jenisKelamin: 'Laki-laki' | 'Perempuan';
    tempatLahir: string;
    tanggalLahir: string;
    kewarganegaraan?: 'WNI' | 'WNA' | 'Keturunan';
    
    alamat: string;
    desaKelurahan?: string;
    kecamatan?: string;
    kabupatenKota?: string;
    provinsi?: string;
    kodePos?: string;

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

    namaWali?: string;
    nomorHpWali: string;
    hubunganWali?: string;
    statusHidupWali?: string;
    pekerjaanWali?: string;
    pendidikanWali?: string;
    penghasilanWali?: string;

    jenjangId: number;
    asalSekolah: string;
    alamatSekolahAsal?: string;
    
    tanggalDaftar: string;
    status: 'Baru' | 'Diterima' | 'Cadangan' | 'Ditolak';
    catatan?: string;
    jalurPendaftaran?: string;
    gelombang?: number;
    customData?: string;

    statusKeluarga?: string;
    anakKe?: number;
    jumlahSaudara?: number;
    berkebutuhanKhusus?: string;
}

export interface AuditLog {
    id: string;
    table_name: string;
    record_id: string;
    operation: 'INSERT' | 'UPDATE' | 'DELETE';
    old_data: any;
    new_data: any;
    changed_by: string;
    username?: string;
    created_at: string;
}

export interface SyncFileRecord {
    id: string;
    name: string;
    path_lower: string;
    client_modified: string;
    size: number;
    status: 'pending' | 'merged' | 'ignored';
}

export interface SyncHistory {
    id: string;
    fileId: string;
    fileName: string;
    mergedAt: string;
    mergedBy: string;
    recordCount: number;
}

export enum ReportType {
    DashboardSummary = 'DashboardSummary',
    FinanceSummary = 'FinanceSummary',
    LaporanArusKas = 'LaporanArusKas',
    LaporanAsrama = 'LaporanAsrama',
    RekeningKoranSantri = 'RekeningKoranSantri',
    Biodata = 'Biodata',
    KartuSantri = 'KartuSantri',
    LembarPembinaan = 'LembarPembinaan',
    LaporanMutasi = 'LaporanMutasi',
    FormulirIzin = 'FormulirIzin',
    LabelSantri = 'LabelSantri',
    DaftarRombel = 'DaftarRombel',
    DaftarWaliKelas = 'DaftarWaliKelas',
    LembarKedatangan = 'LembarKedatangan',
    LembarRapor = 'LembarRapor',
    LembarNilai = 'LembarNilai',
    LembarAbsensi = 'LembarAbsensi',
    LaporanKontak = 'LaporanKontak',
}
