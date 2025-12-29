
export enum Page {
  Dashboard = 'Dashboard',
  Santri = 'Data Santri',
  PSB = 'PSB',
  DataMaster = 'Data Master',
  Keuangan = 'Keuangan',
  Keasramaan = 'Keasramaan',
  BukuKas = 'Buku Kas',
  Surat = 'Surat Menyurat',
  Laporan = 'Laporan',
  AuditLog = 'Log Aktivitas',
  Pengaturan = 'Pengaturan',
  Tentang = 'Tentang'
}

export type PsbDesignStyle = 'classic' | 'modern' | 'bold' | 'dark' | 'ceria';

export type PsbFieldType = 'section' | 'text' | 'paragraph' | 'radio' | 'checkbox' | 'statement' | 'file';

export interface PsbCustomField {
    id: string;
    type: PsbFieldType;
    label: string; // Pertanyaan atau Judul Section
    options?: string[]; // Untuk radio/checkbox
    required: boolean;
    description?: string; // Keterangan tambahan di bawah label
}

export interface PsbFormTemplate {
    id: string;
    name: string;
    targetJenjangId?: number; 
    designStyle?: PsbDesignStyle;
    activeFields: string[];
    requiredDocuments: string[];
    customFields: PsbCustomField[];
}

export interface PsbConfig {
    tahunAjaranAktif: string; 
    targetKuota: number;
    nomorHpAdmin: string;
    telegramUsername?: string;
    pesanSukses: string;
    activeGelombang: number;
    biayaPendaftaran: number;
    infoRekening: string;
    targetJenjangId?: number; 
    activeFields: string[];
    requiredDocuments: string[];
    designStyle: PsbDesignStyle;
    posterTitle: string;
    posterSubtitle: string;
    posterInfo: string;
    customFields: PsbCustomField[]; 
    templates?: PsbFormTemplate[];
    enableCloudSubmit?: boolean; 
}

export interface Alamat {
    detail: string;
    desaKelurahan?: string;
    kecamatan?: string;
    kabupatenKota?: string;
    provinsi?: string;
    kodePos?: string;
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

export interface RiwayatStatus {
    id: number;
    status: 'Aktif' | 'Hiatus' | 'Lulus' | 'Keluar/Pindah' | 'Masuk';
    tanggal: string;
    keterangan?: string;
}

export interface Santri {
    id: number;
    nis: string;
    nisn?: string;
    nik?: string;
    namaLengkap: string;
    namaHijrah?: string; // Panggilan
    jenisKelamin: 'Laki-laki' | 'Perempuan';
    tempatLahir: string;
    tanggalLahir: string;
    kewarganegaraan: 'WNI' | 'WNA' | 'Keturunan';
    
    // Status
    status: 'Aktif' | 'Hiatus' | 'Lulus' | 'Keluar/Pindah';
    tanggalStatus?: string;
    riwayatStatus?: RiwayatStatus[];
    
    // Akademik
    jenjangId: number;
    kelasId: number;
    rombelId: number;
    tanggalMasuk: string;
    sekolahAsal?: string;
    alamatSekolahAsal?: string;

    // Asrama
    kamarId?: number;

    // Data Keluarga
    statusKeluarga?: string; // Anak Kandung, Yatim, Piatu, dll
    anakKe?: number;
    jumlahSaudara?: number;
    berkebutuhanKhusus?: string;

    // Alamat
    alamat: Alamat;
    jarakKePondok?: string;

    // Data Orang Tua / Wali
    namaAyah?: string;
    nikAyah?: string;
    statusAyah?: string; // Hidup/Meninggal
    tempatLahirAyah?: string;
    tanggalLahirAyah?: string;
    pendidikanAyah?: string;
    pekerjaanAyah?: string;
    penghasilanAyah?: string;
    teleponAyah?: string;
    alamatAyah?: Alamat;
    agamaAyah?: string;

    namaIbu?: string;
    nikIbu?: string;
    statusIbu?: string; // Hidup/Meninggal
    tempatLahirIbu?: string;
    tanggalLahirIbu?: string;
    pendidikanIbu?: string;
    pekerjaanIbu?: string;
    penghasilanIbu?: string;
    teleponIbu?: string;
    alamatIbu?: Alamat;
    agamaIbu?: string;

    namaWali?: string;
    statusWali?: string; // Hubungan
    statusHidupWali?: string;
    tempatLahirWali?: string;
    tanggalLahirWali?: string;
    pekerjaanWali?: string;
    pendidikanWali?: string;
    penghasilanWali?: string;
    teleponWali?: string;
    alamatWali?: Alamat;
    agamaWali?: string;

    // Data Fisik
    tinggiBadan?: number;
    beratBadan?: number;
    riwayatPenyakit?: string;

    // Data Lain
    hobi?: string[];
    prestasi?: Prestasi[];
    pelanggaran?: Pelanggaran[];
    
    fotoUrl?: string;
    
    // Jenis Santri (Mondok/Laju)
    jenisSantri?: string;
}

export interface Jenjang {
    id: number;
    nama: string;
    kode?: string;
    mudirId?: number;
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
    jenjangId?: number; // Jika kosong berlaku semua
    tahunMasuk?: number; // Opsional filter
    jumlahCicilan?: number;
    nominalCicilan?: number;
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
    dobFormat: 'DDMMYY' | 'YYYYMMDD' | 'YYMMDD';
    dobSeparator: string;
    dobUseJenjangCode: boolean;
    dobPadding: number;
}

export type BackupFrequency = 'daily' | 'weekly' | 'never';

export interface BackupConfig {
    frequency: BackupFrequency;
    lastBackup: string | null;
}

export type SyncProvider = 'none' | 'supabase' | 'dropbox' | 'webdav';

export interface CloudSyncConfig {
    provider: SyncProvider;
    lastSync: string | null;
    autoSync?: boolean; // For legacy providers
    
    // Supabase
    supabaseUrl?: string;
    supabaseKey?: string;
    adminIdentity?: string; // Username for logs

    // Dropbox
    dropboxToken?: string;

    // WebDAV
    webdavUrl?: string;
    webdavUsername?: string;
    webdavPassword?: string;
}

export interface PondokSettings {
    namaYayasan: string;
    namaPonpes: string;
    nspp: string;
    npsn: string;
    skMenteri?: string;
    aktaNotaris?: string;
    alamat: string;
    telepon: string;
    website: string;
    email: string;
    logoYayasanUrl?: string;
    logoPonpesUrl?: string;
    
    mudirAamId?: number;
    
    // Master Data
    jenjang: Jenjang[];
    kelas: Kelas[];
    rombel: Rombel[];
    tenagaPengajar: TenagaPengajar[];
    mataPelajaran: MataPelajaran[];
    gedungAsrama: GedungAsrama[];
    kamar: Kamar[];
    biaya: Biaya[];

    // Configs
    nisSettings: NisSettings;
    backupConfig: BackupConfig;
    cloudSyncConfig: CloudSyncConfig;
    psbConfig: PsbConfig;

    // Redaksi Surat & WA
    suratTagihanPembuka: string;
    suratTagihanPenutup: string;
    suratTagihanCatatan?: string;
    pesanWaTunggakan: string;
}

export interface Tagihan {
    id: number;
    santriId: number;
    biayaId: number;
    deskripsi: string;
    nominal: number;
    tahun: number;
    bulan: number; // 1-12
    status: 'Belum Lunas' | 'Lunas';
    tanggalLunas?: string;
    pembayaranId?: number; // Link to payment transaction
}

export interface Pembayaran {
    id: number;
    santriId: number;
    tagihanIds: number[];
    jumlah: number;
    tanggal: string;
    metode: 'Tunai' | 'Transfer';
    catatan?: string;
    disetorKeKas: boolean;
}

export interface SaldoSantri {
    santriId: number;
    saldo: number;
}

export interface TransaksiSaldo {
    id: number;
    santriId: number;
    tanggal: string;
    jenis: 'Deposit' | 'Penarikan';
    jumlah: number;
    keterangan: string;
    saldoSetelah: number;
}

export interface TransaksiKas {
    id: number;
    tanggal: string;
    jenis: 'Pemasukan' | 'Pengeluaran';
    kategori: string;
    deskripsi: string;
    jumlah: number;
    saldoSetelah: number;
    penanggungJawab?: string;
}

export interface AuditLog {
    id: string;
    table_name: string;
    record_id: string;
    operation: 'INSERT' | 'UPDATE' | 'DELETE';
    old_data: any;
    new_data: any;
    changed_by: string; // UUID
    username: string;
    created_at: string;
}

export interface Pendaftar {
    id: number;
    namaLengkap: string;
    namaHijrah?: string; 
    nisn?: string;
    nik?: string;
    jenisKelamin: 'Laki-laki' | 'Perempuan';
    tempatLahir: string;
    tanggalLahir: string;
    kewarganegaraan?: string;
    statusKeluarga?: string;
    anakKe?: number;
    jumlahSaudara?: number;
    berkebutuhanKhusus?: string;
    
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
    
    namaWali: string;
    nomorHpWali: string;
    hubunganWali?: string; 
    pekerjaanWali?: string;
    pendidikanWali?: string;
    penghasilanWali?: string;
    statusHidupWali?: string;
    
    jenjangId: number;
    asalSekolah: string;
    alamatSekolahAsal?: string;
    tanggalDaftar: string;
    gelombang?: number;
    jalurPendaftaran?: 'Reguler' | 'Prestasi' | 'Yatim/Dhuafa';
    status: 'Baru' | 'Diterima' | 'Cadangan' | 'Ditolak';
    catatan?: string;
    
    customData?: string; 
}

// FIX: Added missing ReportType enum
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

// FIX: Added missing configurations and types for Letter management
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

export interface SuratTemplate {
    id: number;
    nama: string;
    judul: string;
    showJudul?: boolean;
    konten: string;
    kategori: 'Resmi' | 'Pemberitahuan' | 'Izin' | 'Lainnya';
    signatories: SuratSignatory[];
    mengetahuiConfig?: MengetahuiConfig;
    tempatTanggalConfig?: TempatTanggalConfig;
    marginConfig?: MarginConfig;
    stampConfig?: StampConfig;
}

export interface ArsipSurat {
    id: number;
    nomorSurat: string;
    perihal: string;
    tujuan: string;
    isiSurat: string;
    tanggalBuat: string;
    templateId: number;
    tempatCetak?: string;
    tanggalCetak?: string;
    tempatTanggalConfig?: TempatTanggalConfig;
    signatoriesSnapshot?: SuratSignatory[];
    mengetahuiSnapshot?: MengetahuiConfig;
    marginConfig?: MarginConfig;
    stampSnapshot?: StampConfig;
    showJudulSnapshot?: boolean;
}
