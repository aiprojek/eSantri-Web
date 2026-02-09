
export type Page = 
  | 'Dashboard' | 'Santri' | 'Absensi' | 'Tahfizh' | 'Akademik' | 'Sarpras' 
  | 'Kalender' | 'Perpustakaan' | 'Kesehatan' | 'BK' | 'BukuTamu' | 'DataMaster' 
  | 'Keuangan' | 'Keasramaan' | 'BukuKas' | 'Koperasi' | 'Surat' | 'PSB' 
  | 'Pengaturan' | 'Laporan' | 'AuditLog' | 'SyncAdmin' | 'Tentang';

export const Page = {
  Dashboard: 'Dashboard',
  Santri: 'Santri',
  Absensi: 'Absensi',
  Tahfizh: 'Tahfizh',
  Akademik: 'Akademik',
  Sarpras: 'Sarpras',
  Kalender: 'Kalender',
  Perpustakaan: 'Perpustakaan',
  Kesehatan: 'Kesehatan',
  BK: 'BK',
  BukuTamu: 'BukuTamu',
  DataMaster: 'DataMaster',
  Keuangan: 'Keuangan',
  Keasramaan: 'Keasramaan',
  BukuKas: 'BukuKas',
  Koperasi: 'Koperasi',
  Surat: 'Surat',
  PSB: 'PSB',
  Pengaturan: 'Pengaturan',
  Laporan: 'Laporan',
  AuditLog: 'AuditLog',
  SyncAdmin: 'SyncAdmin',
  Tentang: 'Tentang'
} as const;

export type AccessLevel = 'none' | 'read' | 'write';

export interface UserPermissions {
    santri?: AccessLevel;
    psb?: AccessLevel;
    akademik?: AccessLevel;
    absensi?: AccessLevel;
    tahfizh?: AccessLevel;
    sarpras?: AccessLevel;
    kalender?: AccessLevel;
    perpustakaan?: AccessLevel;
    kesehatan?: AccessLevel;
    bk?: AccessLevel;
    bukutamu?: AccessLevel;
    datamaster?: AccessLevel;
    keuangan?: AccessLevel;
    keasramaan?: AccessLevel;
    bukukas?: AccessLevel;
    surat?: AccessLevel;
    laporan?: AccessLevel;
    auditlog?: AccessLevel;
    pengaturan?: AccessLevel;
    koperasi?: AccessLevel;
    syncAdmin?: boolean;
}

export interface User {
    id: number;
    username: string;
    passwordHash: string;
    fullName: string;
    role: 'admin' | 'staff';
    permissions: UserPermissions;
    securityQuestion?: string;
    securityAnswerHash?: string;
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
    keterangan: string;
}

export interface Santri {
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
    
    alamat: Alamat;
    
    // Orang Tua
    namaAyah: string;
    nikAyah?: string;
    statusAyah?: string;
    pekerjaanAyah?: string;
    pendidikanAyah?: string;
    penghasilanAyah?: string;
    teleponAyah?: string;
    alamatAyah?: Alamat;
    tanggalLahirAyah?: string;
    tempatLahirAyah?: string;

    namaIbu: string;
    nikIbu?: string;
    statusIbu?: string;
    pekerjaanIbu?: string;
    pendidikanIbu?: string;
    penghasilanIbu?: string;
    teleponIbu?: string;
    alamatIbu?: Alamat;
    tanggalLahirIbu?: string;
    tempatLahirIbu?: string;

    // Wali
    namaWali?: string;
    statusWali?: string; // Hubungan
    statusHidupWali?: string;
    pekerjaanWali?: string;
    pendidikanWali?: string;
    penghasilanWali?: string;
    teleponWali?: string;
    alamatWali?: Alamat;
    tanggalLahirWali?: string;
    tempatLahirWali?: string;

    // Akademik
    jenjangId: number;
    kelasId: number;
    rombelId: number;
    tanggalMasuk: string;
    status: 'Aktif' | 'Hiatus' | 'Lulus' | 'Keluar/Pindah' | 'Masuk' | 'Baru' | 'Diterima' | 'Cadangan' | 'Ditolak';
    tanggalStatus?: string;
    
    fotoUrl?: string;
    
    // Extra
    anakKe?: number;
    jumlahSaudara?: number;
    berkebutuhanKhusus?: string;
    riwayatPenyakit?: string;
    hobi?: string[];
    
    jenisSantri: string; // Mondok - Baru etc.
    statusKeluarga?: string;
    
    sekolahAsal?: string;
    alamatSekolahAsal?: string;
    
    kamarId?: number;

    riwayatStatus?: RiwayatStatus[];
    prestasi?: Prestasi[];
    pelanggaran?: Pelanggaran[];
    
    deleted?: boolean;
    lastModified?: number;
}

export interface Jenjang {
    id: number;
    nama: string;
    kode?: string;
    mudirId?: number;
    hariLibur?: number[]; // 0=Sunday
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

export interface ConfigGaji {
    gajiPokok: number;
    tunjanganJabatan: number;
    honorPerJam: number;
    tunjanganLain: number;
    potonganLain: number;
    bank?: string;
    noRekening?: string;
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
    hariMasuk?: number[]; // Days available
    kompetensiMapelIds?: number[];
    configGaji?: ConfigGaji;
}

export interface MataPelajaran {
    id: number;
    nama: string;
    jenjangId: number;
}

export interface Biaya {
    id: number;
    nama: string;
    jenis: 'Bulanan' | 'Sekali Bayar' | 'Cicilan';
    nominal: number;
    jenjangId?: number;
    tahunMasuk?: number;
    jumlahCicilan?: number;
    nominalCicilan?: number;
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

export type SyncProvider = 'none' | 'dropbox' | 'webdav';

export interface CloudSyncConfig {
    provider: SyncProvider;
    dropboxAppKey?: string;
    dropboxAppSecret?: string; // New field for Secret
    dropboxRefreshToken?: string;
    dropboxToken?: string;
    dropboxTokenExpiresAt?: number;
    webdavUrl?: string;
    webdavUsername?: string;
    webdavPassword?: string;
    lastSync?: string;
    autoSync?: boolean;
}

export type BackupFrequency = 'daily' | 'weekly' | 'never';

export interface BackupConfig {
    frequency: BackupFrequency;
    lastBackup?: string;
}

export interface JamPelajaran {
    id: number;
    urutan: number;
    jamMulai: string;
    jamSelesai: string;
    jenis: 'KBM' | 'Istirahat' | 'Sholat' | 'Lainnya';
    jenjangId: number;
}

// PSB Types
export type PsbDesignStyle = 'classic' | 'modern' | 'bold' | 'dark' | 'ceria';
export type PsbFieldType = 'text' | 'paragraph' | 'radio' | 'checkbox' | 'file' | 'section' | 'statement';
export type PsbSubmissionMethod = 'whatsapp' | 'google_sheet' | 'hybrid';

export interface PsbCustomField {
    id: string;
    type: PsbFieldType;
    label: string;
    required: boolean;
    options?: string[]; // for radio/checkbox
}

export interface PsbFormTemplate {
    id: string;
    name: string;
    targetJenjangId?: number;
    designStyle?: PsbDesignStyle;
    activeFields: string[];
    requiredStandardFields?: string[];
    requiredDocuments: string[];
    customFields?: PsbCustomField[];
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
    activeFields: string[];
    requiredStandardFields?: string[];
    requiredDocuments: string[];
    designStyle?: PsbDesignStyle;
    posterTitle?: string;
    posterSubtitle?: string;
    posterInfo?: string;
    customFields?: PsbCustomField[];
    templates?: PsbFormTemplate[];
    posterTemplates?: PsbPosterTemplate[];
    submissionMethod?: PsbSubmissionMethod;
    googleScriptUrl?: string;
    registrationDeadline?: string;
}

export interface RaporTemplate {
    id: string;
    name: string;
    rowCount: number;
    colCount: number;
    cells: GridCell[][];
    lastModified: string;
    showJudul?: boolean;
}

export type RaporColumnType = 'label' | 'data' | 'input' | 'formula' | 'dropdown';

export interface GridCell {
    id: string;
    row: number;
    col: number;
    value: string;
    type: RaporColumnType;
    colSpan?: number;
    rowSpan?: number;
    width?: number;
    key?: string; // For input/data mapping
    options?: string[]; // For dropdown
    align?: 'left' | 'center' | 'right';
    borders?: { top: boolean; right: boolean; bottom: boolean; left: boolean };
    hidden?: boolean;
}

export interface PondokSettings {
    id?: number;
    namaYayasan: string;
    namaPonpes: string;
    nspp: string;
    npsn: string;
    alamat: string;
    telepon: string;
    email: string;
    website: string;
    logoYayasanUrl?: string;
    logoPonpesUrl?: string;
    
    mudirAamId?: number;
    
    jenjang: Jenjang[];
    kelas: Kelas[];
    rombel: Rombel[];
    tenagaPengajar: TenagaPengajar[];
    mataPelajaran: MataPelajaran[];
    jamPelajaran?: JamPelajaran[];
    biaya: Biaya[];
    gedungAsrama: GedungAsrama[];
    kamar: Kamar[];
    
    multiUserMode: boolean;
    nisSettings: NisSettings;
    cloudSyncConfig: CloudSyncConfig;
    backupConfig: BackupConfig;
    psbConfig: PsbConfig;
    
    raporTemplates?: RaporTemplate[];
    
    // Surat Menyurat Redaksi
    suratTagihanPembuka: string;
    suratTagihanPenutup: string;
    suratTagihanCatatan: string;
    pesanWaTunggakan: string;

    hijriAdjustment: number;
    
    lastModified?: number;
}

export interface Tagihan {
    id: number;
    santriId: number;
    biayaId: number;
    deskripsi: string;
    bulan: number;
    tahun: number;
    nominal: number;
    status: 'Lunas' | 'Belum Lunas';
    tanggalLunas?: string;
    pembayaranId?: number;
    deleted?: boolean;
    lastModified?: number;
}

export interface Pembayaran {
    id: number;
    santriId: number;
    tagihanIds: number[];
    jumlah: number;
    tanggal: string;
    metode: 'Tunai' | 'Transfer';
    catatan?: string;
    disetorKeKas: boolean; // false = di laci, true = masuk kas umum
    deleted?: boolean;
    lastModified?: number;
}

export interface SaldoSantri {
    santriId: number;
    saldo: number;
    lastModified?: number;
}

export interface TransaksiSaldo {
    id: number;
    santriId: number;
    tanggal: string;
    jenis: 'Deposit' | 'Penarikan';
    jumlah: number;
    keterangan: string;
    saldoSetelah: number;
    lastModified?: number;
}

export interface ChartOfAccount {
    id: number;
    kode: string;
    nama: string;
    kategori: 'Harta' | 'Kewajiban' | 'Modal' | 'Pendapatan' | 'Beban';
    lastModified?: number;
}

export interface TransaksiKas {
    id: number;
    tanggal: string;
    jenis: 'Pemasukan' | 'Pengeluaran';
    kategori: string;
    deskripsi: string;
    jumlah: number;
    saldoSetelah: number;
    penanggungJawab: string;
    deleted?: boolean;
    lastModified?: number;
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
    placementSignatoryId?: string; // ID of signatory to overlay stamp
}

export interface SuratTemplate {
    id: number;
    nama: string;
    kategori: 'Resmi' | 'Pemberitahuan' | 'Izin' | 'Lainnya';
    judul: string; // Kop/Header
    konten: string; // HTML Content
    signatories?: SuratSignatory[];
    mengetahuiConfig?: MengetahuiConfig;
    tempatTanggalConfig?: TempatTanggalConfig;
    marginConfig?: MarginConfig;
    stampConfig?: StampConfig;
    showJudul?: boolean;
    deleted?: boolean;
    lastModified?: number;
}

export interface ArsipSurat {
    id: number;
    nomorSurat: string;
    perihal: string;
    tujuan: string;
    isiSurat: string; // Processed HTML content
    tanggalBuat: string;
    templateId: number;
    
    // Snapshot of config at time of creation
    tempatCetak?: string;
    tanggalCetak?: string;
    tempatTanggalConfig?: TempatTanggalConfig;
    signatoriesSnapshot?: SuratSignatory[];
    mengetahuiSnapshot?: MengetahuiConfig;
    marginConfig?: MarginConfig;
    stampSnapshot?: StampConfig;
    showJudulSnapshot?: boolean;

    deleted?: boolean;
    lastModified?: number;
}

export interface Pendaftar extends Omit<Santri, 'id' | 'status' | 'riwayatStatus' | 'prestasi' | 'pelanggaran' | 'kamarId' | 'fotoUrl'> {
    id: number;
    tanggalDaftar: string;
    status: 'Baru' | 'Diterima' | 'Cadangan' | 'Ditolak';
    catatan?: string;
    jalurPendaftaran?: string; // Reguler, Prestasi, Beasiswa
    gelombang?: number;
    customData?: string; // JSON string for flexible additional fields
    
    // Inherited from Santri but re-declared for clarity in Pendaftar context
    namaAyah: string;
    namaIbu: string;
    nomorHpWali?: string; // Alias for teleponWali often used in forms
    asalSekolah?: string; // Alias for sekolahAsal
    
    // Mapping back to Santri props if accepted
    fotoUrl?: string;
    kamarId?: number;
}

export interface AuditLog {
    id: string;
    table_name: string;
    record_id: string;
    operation: 'INSERT' | 'UPDATE' | 'DELETE';
    old_data?: any;
    new_data?: any;
    changed_by: string;
    username?: string;
    created_at: string;
}

export interface SyncHistory {
    id: string;
    fileId: string;
    fileName: string;
    mergedAt: string;
    mergedBy: string;
    recordCount: number;
}

export interface SyncFileRecord {
    id: string;
    name: string;
    path_lower: string;
    client_modified: string;
    size: number;
    status: 'pending' | 'merged';
}

export interface ConflictItem {
    id: string;
    tableName: string;
    recordId: number;
    localData: any;
    cloudData: any;
    resolved: boolean;
}

export interface StorageStats {
    used: number;
    total: number;
    percent: number;
}

export interface RaporRecord {
    id: number;
    santriId: number;
    tahunAjaran: string;
    semester: 'Ganjil' | 'Genap';
    rombelId: number; // Snapshot
    jenjangId: number; // Snapshot
    kelasId: number; // Snapshot
    nilai: NilaiMapel[]; // Array of values
    
    // Sikap & Absensi (Summary)
    sakit: number;
    izin: number;
    alpha: number;
    kepribadian: { aspek: string; nilai: string }[];
    ekstrakurikuler: { kegiatan: string; nilai: string; keterangan: string }[];
    
    catatanWaliKelas?: string;
    keputusan?: string; // Naik kelas / Lulus
    
    tanggalRapor: string;
    customData?: string; // JSON string for flexible fields from dynamic templates
    lastModified?: number;
}

export interface NilaiMapel {
    mapelId: number;
    nilaiAngka: number;
    predikat: string;
    deskripsi?: string;
}

export interface AbsensiRecord {
    id: number;
    santriId: number;
    rombelId: number;
    tanggal: string; // YYYY-MM-DD
    status: 'H' | 'S' | 'I' | 'A';
    keterangan?: string;
    recordedBy?: string;
    lastModified?: number;
}

export interface TahfizhRecord {
    id: number;
    santriId: number;
    tanggal: string;
    tipe: 'Ziyadah' | 'Murojaah' | 'Tasmi\'';
    juz: number;
    surah: string;
    ayatAwal: number;
    ayatAkhir: number;
    predikat: 'Sangat Lancar' | 'Lancar' | 'Kurang Lancar' | 'Belum Lulus';
    catatan?: string;
    muhaffizhId?: number;
    lastModified?: number;
}

export interface Inventaris {
    id: number;
    kode: string;
    nama: string;
    jenis: 'Bergerak' | 'Tidak Bergerak';
    kategori: string; // Elektronik, Meubeler, Tanah, Bangunan
    kondisi: 'Baik' | 'Rusak Ringan' | 'Rusak Berat' | 'Afkir';
    lokasi: string;
    jumlah: number;
    satuan?: string; // Unit, Pcs, Set
    luas?: number; // m2 (untuk tanah/bangunan)
    tanggalPerolehan: string;
    sumber: 'Beli Sendiri' | 'Wakaf' | 'Hibah/Hadiah' | 'Bantuan Pemerintah';
    hargaPerolehan: number;
    keterangan?: string;
    legalitas?: string; // SHM No..., Akta Wakaf No...
    deleted?: boolean;
    lastModified?: number;
}

export interface CalendarEvent {
    id: number;
    title: string;
    startDate: string; // YYYY-MM-DD
    endDate: string;
    category: 'Libur' | 'Ujian' | 'Kegiatan' | 'Rapat' | 'Lainnya';
    color: string; // Tailwind class like 'bg-red-500'
    description?: string;
    deleted?: boolean;
    lastModified?: number;
}

export interface Buku {
    id: number;
    kodeBuku: string;
    judul: string;
    penulis?: string;
    penerbit?: string;
    tahunTerbit?: number;
    kategori: string; // Kitab, Umum, Pelajaran
    stok: number;
    lokasiRak?: string;
    deleted?: boolean;
    lastModified?: number;
}

export interface Sirkulasi {
    id: number;
    santriId: number;
    bukuId: number;
    tanggalPinjam: string;
    tanggalKembaliSeharusnya: string;
    tanggalDikembalikan?: string;
    status: 'Dipinjam' | 'Kembali' | 'Hilang' | 'Rusak';
    denda?: number;
    catatan?: string;
    lastModified?: number;
}

export interface Obat {
    id: number;
    nama: string;
    jenis: string; // Tablet, Sirup, Salep
    stok: number;
    satuan: string;
    keterangan?: string;
    deleted?: boolean;
    lastModified?: number;
}

export interface ResepItem {
    obatId: number;
    namaObat: string;
    jumlah: number;
    dosis: string;
}

export interface KesehatanRecord {
    id: number;
    santriId: number;
    tanggal: string;
    keluhan: string;
    diagnosa: string;
    tindakan: string;
    resep?: ResepItem[]; // JSON stored usually or linked
    status: 'Rawat Jalan' | 'Rawat Inap (Pondok)' | 'Rujuk RS/Klinik' | 'Sembuh';
    pemeriksa: string;
    catatan?: string;
    deleted?: boolean;
    lastModified?: number;
}

export interface BkSession {
    id: number;
    santriId: number;
    tanggal: string;
    kategori: 'Pribadi' | 'Sosial' | 'Belajar' | 'Karir' | 'Keluarga' | 'Ibadah' | 'Lainnya';
    keluhan: string;
    penanganan: string;
    hasil?: string;
    status: 'Baru' | 'Proses' | 'Selesai' | 'Pemantauan';
    privasi: 'Biasa' | 'Rahasia' | 'Sangat Rahasia';
    konselor: string;
    deleted?: boolean;
    lastModified?: number;
}

export interface BukuTamu {
    id: number;
    tanggal: string;
    jamMasuk: string;
    jamKeluar?: string;
    namaTamu: string;
    noHp?: string;
    kategori: 'Wali Santri' | 'Tamu Dinas' | 'Vendor/Paket' | 'Alumni' | 'Lainnya';
    santriId?: number; // Jika wali santri
    bertemuDengan?: string; // Jika dinas
    keperluan: string;
    kendaraan?: string;
    platNomor?: string;
    status: 'Bertamu' | 'Selesai';
    petugas: string;
    lastModified?: number;
}

export interface JadwalPelajaran {
    id: number;
    rombelId: number;
    hari: number; // 0=Ahad, 1=Senin
    jamKe: number;
    mapelId?: number;
    guruId?: number;
    keterangan?: string; // Istirahat, Upacara
    lastModified?: number;
}

export interface ArsipJadwal {
    id: number;
    judul: string;
    tahunAjaran: string;
    semester: 'Ganjil' | 'Genap';
    jenjangId: number;
    tanggalArsip: string;
    dataJSON: string; // Stringified JadwalPelajaran[]
    lastModified?: number;
}

export interface PayrollRecord {
    id: number;
    guruId: number;
    namaGuru: string;
    jabatan: string;
    bulan: number;
    tahun: number;
    tanggalBayar: string;
    
    // Rincian
    gajiPokok: number;
    tunjanganJabatan: number;
    totalJamMengajar: number;
    honorPerJam: number;
    totalHonorJTM: number;
    tunjanganLain: number;
    bonus: number;
    
    potonganAbsen: number;
    potonganLain: number;
    
    totalDiterima: number;
    catatan?: string;
    lastModified?: number;
}

export interface PiketSchedule {
    id: number;
    tanggal: string; // YYYY-MM-DD
    sholat: 'Subuh' | 'Dzuhur' | 'Ashar' | 'Maghrib' | 'Isya';
    muadzinSantriId?: number;
    imamSantriId?: number;
    lastModified?: number;
}

// KOPERASI TYPES
export interface ProdukKoperasi {
    id: number;
    nama: string;
    kategori: string;
    hargaBeli: number;
    hargaJual: number;
    stok: number;
    satuan: string;
    barcode?: string;
    minStok?: number;
    
    hasVarian?: boolean;
    varian?: VarianProduk[];
    grosir?: GrosirTier[];
    
    deleted?: boolean;
    lastModified?: number;
}

export interface VarianProduk {
    nama: string; // Coklat, Strawberry, XL, L
    stok: number;
    harga?: number; // Override harga jual
}

export interface GrosirTier {
    minQty: number;
    harga: number;
}

export interface CartItem {
    produkId: number;
    nama: string;
    harga: number;
    qty: number;
    subtotal: number;
    stokTersedia: number;
    varian?: string;
    isGrosirApplied?: boolean;
    hargaAsli?: number;
}

export interface TransaksiKoperasi {
    id: number;
    tanggal: string;
    tipePembeli: 'Santri' | 'Guru' | 'Umum';
    pembeliId?: number; // SantriID or null
    namaPembeli: string;
    metodePembayaran: 'Tunai' | 'Tabungan' | 'Non-Tunai' | 'Hutang';
    catatanPembayaran?: string; // Ref No, Bukti Trf
    
    items: CartItem[];
    totalBelanja: number;
    diskonId?: number;
    diskonNama?: string;
    potonganDiskon?: number;
    totalFinal: number;
    
    bayar?: number;
    kembali?: number;
    kembalianMasukSaldo?: boolean;

    // Hutang Logic
    statusTransaksi: 'Lunas' | 'Belum Lunas' | 'Dibatalkan';
    sisaTagihan?: number;
    
    kasir: string;
    lastModified?: number;
}

export interface RiwayatStok {
    id?: number;
    produkId: number;
    tanggal: string;
    tipe: 'Masuk' | 'Penjualan' | 'Koreksi' | 'Retur';
    jumlah: number;
    stokAwal: number;
    stokAkhir: number;
    keterangan?: string;
    operator: string;
    varian?: string;
}

export interface KeuanganKoperasi {
    id: number;
    tanggal: string;
    jenis: 'Pemasukan' | 'Pengeluaran';
    kategori: string; // Operasional, Kulakan, Gaji Pegawai
    deskripsi: string;
    jumlah: number;
    operator: string;
    lastModified?: number;
}

export interface PendingOrder {
    id: number;
    customerName: string;
    timestamp: string;
    items: CartItem[];
    customerType?: 'Santri' | 'Umum' | 'Guru';
}

export interface Diskon {
    id: number;
    nama: string;
    tipe: 'Persen' | 'Nominal';
    nilai: number;
    aktif: boolean;
}

export enum ReportType {
  DashboardSummary = 'DashboardSummary',
  FinanceSummary = 'FinanceSummary',
  LaporanMutasi = 'LaporanMutasi',
  Biodata = 'Biodata',
  DaftarRombel = 'DaftarRombel',
  LembarAbsensi = 'LembarAbsensi',
  LembarNilai = 'LembarNilai',
  LembarPembinaan = 'LembarPembinaan',
  RekeningKoranSantri = 'RekeningKoranSantri',
  LaporanArusKas = 'LaporanArusKas',
  KartuSantri = 'KartuSantri',
  LabelSantri = 'LabelSantri',
  LaporanEMIS = 'LaporanEMIS',
  LaporanAsrama = 'LaporanAsrama',
  FormulirIzin = 'FormulirIzin',
  DaftarWaliKelas = 'DaftarWaliKelas',
  LaporanKontak = 'LaporanKontak',
  LembarKedatangan = 'LembarKedatangan',
  LembarRapor = 'LembarRapor',
  RaporLengkap = 'RaporLengkap',
}

// --- NEW GLOBAL STATE TYPES ---

export interface ToastData {
    id: number;
    message: string;
    type: 'success' | 'error' | 'info';
}

export interface ConfirmationState {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
    confirmText?: string;
    confirmColor?: string;
}

export interface AlertState {
    isOpen: boolean;
    title: string;
    message: string;
}

export interface BackupModalState {
    isOpen: boolean;
    reason: 'periodic' | 'action';
}

export interface SantriFilters {
    search: string;
    jenjang: string;
    kelas: string;
    rombel: string;
    status: string;
    gender: string;
    provinsi: string;
    kabupatenKota: string;
    kecamatan: string;
}

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';
