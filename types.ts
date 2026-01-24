
export enum Page {
  Dashboard = 'Dashboard',
  Santri = 'Santri',
  Tahfizh = 'Tahfizh',
  Absensi = 'Absensi',
  Kesehatan = 'Kesehatan',
  BK = 'BK',
  Keasramaan = 'Keasramaan',
  BukuTamu = 'BukuTamu',
  PSB = 'PSB',
  Surat = 'Surat',
  Laporan = 'Laporan',
  Akademik = 'Akademik',
  Perpustakaan = 'Perpustakaan',
  Kalender = 'Kalender',
  DataMaster = 'DataMaster',
  Keuangan = 'Keuangan',
  BukuKas = 'BukuKas',
  Sarpras = 'Sarpras',
  AuditLog = 'AuditLog',
  Pengaturan = 'Pengaturan',
  SyncAdmin = 'SyncAdmin',
  Tentang = 'Tentang'
}

export type AccessLevel = 'read' | 'write' | 'none';

export interface UserPermissions {
  santri: AccessLevel;
  psb: AccessLevel;
  akademik: AccessLevel;
  absensi: AccessLevel;
  tahfizh: AccessLevel;
  sarpras: AccessLevel;
  kalender: AccessLevel;
  perpustakaan: AccessLevel;
  kesehatan: AccessLevel;
  bk: AccessLevel;
  bukutamu: AccessLevel;
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
    jenis: string;
    deskripsi: string;
    tindakLanjut: string;
    pelapor: string;
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
  jenisSantri: string;
  
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
  statusWali?: string; // Hubungan
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
  status: 'Aktif' | 'Hiatus' | 'Lulus' | 'Keluar/Pindah' | 'Masuk';
  tanggalMasuk: string;
  tanggalStatus?: string;
  sekolahAsal?: string;
  alamatSekolahAsal?: string;
  
  fotoUrl?: string;
  
  statusKeluarga?: string;
  anakKe?: number;
  jumlahSaudara?: number;
  berkebutuhanKhusus?: string;
  riwayatPenyakit?: string;
  
  tinggiBadan?: number;
  beratBadan?: number;
  jarakKePondok?: string;
  
  hobi?: string[];
  prestasi?: Prestasi[];
  pelanggaran?: Pelanggaran[];
  riwayatStatus?: RiwayatStatus[];
  kamarId?: number;
  
  deleted?: boolean;
  lastModified?: number;
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
    hariMasuk?: number[]; // NEW: 0 (Ahad) - 6 (Sabtu). If undefined/empty = All Days
    kompetensiMapelIds?: number[]; // NEW: List of Mapel IDs this teacher can teach
}

export interface Jenjang {
    id: number;
    nama: string;
    kode?: string;
    mudirId?: number;
    hariLibur?: number[];
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

export interface MataPelajaran {
    id: number;
    nama: string;
    jenjangId: number;
}

// NEW: Jadwal Pelajaran Types
export interface JamPelajaran {
    id: number;
    urutan: number;
    jamMulai: string; // "07:00"
    jamSelesai: string; // "07:45"
    jenis: 'KBM' | 'Istirahat' | 'Sholat' | 'Lainnya';
    jenjangId: number; // Config per jenjang
}

export interface JadwalPelajaran {
    id: number;
    rombelId: number;
    hari: number; // 0 (Ahad) - 6 (Sabtu)
    jamKe: number; // Reference to JamPelajaran.urutan
    mapelId?: number; // Optional if Istirahat
    guruId?: number;
    keterangan?: string; // e.g., "Istirahat", "Upacara"
    lastModified?: number;
}

// NEW: Arsip Jadwal
export interface ArsipJadwal {
    id: number;
    judul: string;
    tahunAjaran: string;
    semester: 'Ganjil' | 'Genap';
    jenjangId: number; // Arsip per jenjang
    tanggalArsip: string;
    dataJSON: string; // Serialized JadwalPelajaran[]
    lastModified?: number;
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
    dobFormat: string;
    dobSeparator: string;
    dobUseJenjangCode: boolean;
    dobPadding: number;
}

export type SyncProvider = 'none' | 'dropbox' | 'webdav';

export interface CloudSyncConfig {
    provider: SyncProvider;
    autoSync: boolean;
    lastSync: string | null;
    
    // Dropbox
    dropboxAppKey?: string;
    dropboxRefreshToken?: string;
    dropboxToken?: string;
    dropboxTokenExpiresAt?: number;
    
    // WebDAV
    webdavUrl?: string;
    webdavUsername?: string;
    webdavPassword?: string;
}

export type BackupFrequency = 'daily' | 'weekly' | 'never';

export interface BackupConfig {
    frequency: BackupFrequency;
    lastBackup: string | null;
}

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

export interface PsbPosterTemplate {
    id: string;
    name: string;
    style: PsbDesignStyle;
    ratio: string;
    customInfo: string;
    details: string;
    generatedPrompt?: string;
}

export interface PsbFormTemplate {
    id: string;
    name: string;
    targetJenjangId?: number;
    designStyle?: PsbDesignStyle;
    activeFields: string[];
    requiredDocuments: string[];
    customFields?: PsbCustomField[];
    submissionMethod?: PsbSubmissionMethod;
    googleScriptUrl?: string;
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
    designStyle?: PsbDesignStyle;
    posterTitle?: string;
    posterSubtitle?: string;
    posterInfo?: string;
    customFields?: PsbCustomField[];
    templates?: PsbFormTemplate[];
    posterTemplates?: PsbPosterTemplate[];
    
    submissionMethod?: PsbSubmissionMethod;
    googleScriptUrl?: string;
}

// Rapor Types
export type RaporColumnType = 'label' | 'data' | 'input' | 'formula' | 'dropdown';

export interface GridCell {
    id: string;
    row: number;
    col: number;
    value: string;
    type: RaporColumnType;
    key?: string; // Var name for input/formula
    colSpan?: number;
    rowSpan?: number;
    width?: number; // px
    align?: 'left' | 'center' | 'right';
    hidden?: boolean;
    borders?: { top: boolean; right: boolean; bottom: boolean; left: boolean };
    options?: string[]; // For dropdown
}

export interface RaporTemplate {
    id: string;
    name: string;
    rowCount: number;
    colCount: number;
    cells: GridCell[][];
    lastModified: string;
    showJudul?: boolean; // New for hiding title in preview
}

export interface PondokSettings {
  id?: number;
  namaYayasan: string;
  skMenteri: string;
  aktaNotaris: string;
  namaPonpes: string;
  nspp: string;
  npsn: string;
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
  
  // NEW: Config Jam Pelajaran (per Jenjang)
  jamPelajaran?: JamPelajaran[];

  hijriAdjustment: number;
  
  nisSettings: NisSettings;
  multiUserMode: boolean;
  
  suratTagihanPembuka: string;
  suratTagihanPenutup: string;
  suratTagihanCatatan?: string;
  pesanWaTunggakan: string;
  
  backupConfig: BackupConfig;
  cloudSyncConfig: CloudSyncConfig;
  
  psbConfig: PsbConfig;
  raporTemplates?: RaporTemplate[];
  
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
    status: 'Belum Lunas' | 'Lunas';
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
    disetorKeKas: boolean;
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

export interface TransaksiKas {
    id: number;
    tanggal: string;
    jenis: 'Pemasukan' | 'Pengeluaran';
    kategori: string;
    deskripsi: string;
    jumlah: number;
    saldoSetelah: number;
    penanggungJawab?: string;
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
    placementSignatoryId?: string; // ID of signatory where stamp should be placed
}

export interface SuratTemplate {
    id: number;
    nama: string;
    kategori: 'Resmi' | 'Pemberitahuan' | 'Izin' | 'Lainnya';
    judul: string;
    konten: string;
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
    isiSurat: string; // HTML processed content
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

    deleted?: boolean;
    lastModified?: number;
}

export interface Pendaftar {
    id: number;
    // Identitas
    namaLengkap: string;
    namaHijrah?: string;
    nisn: string;
    nik: string;
    jenisKelamin: 'Laki-laki' | 'Perempuan';
    tempatLahir: string;
    tanggalLahir: string;
    kewarganegaraan: 'WNI' | 'WNA' | 'Keturunan';
    
    // Alamat
    alamat: string;
    desaKelurahan?: string;
    kecamatan?: string;
    kabupatenKota?: string;
    provinsi?: string;
    kodePos?: string;
    
    // Ortu
    namaAyah: string;
    nikAyah: string;
    statusAyah?: string;
    pekerjaanAyah: string;
    pendidikanAyah?: string;
    penghasilanAyah?: string;
    teleponAyah: string;
    
    namaIbu: string;
    nikIbu: string;
    statusIbu?: string;
    pekerjaanIbu: string;
    pendidikanIbu?: string;
    penghasilanIbu?: string;
    teleponIbu: string;

    // Wali
    namaWali: string;
    nomorHpWali: string;
    hubunganWali?: string;
    statusHidupWali?: string;
    pekerjaanWali?: string;
    pendidikanWali?: string;
    penghasilanWali?: string;
    
    // Sekolah
    jenjangId: number;
    asalSekolah: string;
    alamatSekolahAsal?: string;
    
    tanggalDaftar: string;
    status: 'Baru' | 'Diterima' | 'Cadangan' | 'Ditolak';
    catatan: string;
    jalurPendaftaran: 'Reguler' | 'Prestasi' | 'Yatim/Dhuafa';
    gelombang?: number;
    
    // Extra
    customData?: string; // JSON string for flexible fields
    
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
    old_data?: any;
    new_data?: any;
    changed_by: string;
    username: string;
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

export interface NilaiMapel {
    mapelId: number;
    nilaiAngka: number;
    nilaiHuruf?: string;
    deskripsi?: string;
}

export interface RaporRecord {
    id: number;
    santriId: number;
    tahunAjaran: string;
    semester: 'Ganjil' | 'Genap';
    rombelId: number;
    jenjangId: number;
    kelasId: number;
    
    // Legacy Structure Support
    nilai: NilaiMapel[];
    sakit: number;
    izin: number;
    alpha: number;
    kepribadian: { aspek: string, nilai: string }[];
    ekstrakurikuler: { kegiatan: string, nilai: string }[];
    catatanWaliKelas: string;
    keputusan?: string;
    
    // New Grid-based Data
    customData?: string; // JSON string of all cell values by key

    tanggalRapor: string;
    lastModified?: number;
}

export interface AbsensiRecord {
    id: number;
    santriId: number;
    rombelId: number;
    tanggal: string;
    status: 'H' | 'S' | 'I' | 'A';
    keterangan?: string;
    recordedBy: string;
    lastModified?: number;
}

export interface TahfizhRecord {
    id: number;
    santriId: number;
    tanggal: string;
    tipe: 'Ziyadah' | 'Murojaah' | "Tasmi'";
    juz: number;
    surah: string;
    ayatAwal: number;
    ayatAkhir: number;
    predikat: 'Sangat Lancar' | 'Lancar' | 'Kurang Lancar' | 'Belum Lulus';
    catatan: string;
    muhaffizhId?: number;
    deleted?: boolean;
    lastModified?: number;
}

export interface Inventaris {
    id: number;
    kode: string;
    nama: string;
    jenis: 'Bergerak' | 'Tidak Bergerak';
    kategori: string;
    lokasi: string;
    kondisi: 'Baik' | 'Rusak Ringan' | 'Rusak Berat' | 'Afkir';
    jumlah?: number;
    satuan?: string;
    luas?: number;
    legalitas?: string;
    sumber: string;
    tanggalPerolehan: string;
    hargaPerolehan: number;
    keterangan?: string;
    deleted?: boolean;
    lastModified?: number;
}

export interface CalendarEvent {
    id: number;
    title: string;
    startDate: string;
    endDate: string;
    category: 'Libur' | 'Ujian' | 'Kegiatan' | 'Rapat' | 'Lainnya';
    color: string;
    description: string;
    deleted?: boolean;
    lastModified?: number;
}

export interface Buku {
    id: number;
    kodeBuku: string;
    judul: string;
    penulis: string;
    penerbit: string;
    tahunTerbit?: number;
    kategori: string;
    stok: number;
    lokasiRak: string;
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
    status: 'Dipinjam' | 'Kembali' | 'Hilang';
    denda: number;
    catatan?: string;
    lastModified?: number;
}

export interface Obat {
    id: number;
    nama: string;
    jenis: string;
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
    resep?: ResepItem[];
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
    santriId?: number; // Jika Wali
    keperluan: string;
    bertemuDengan?: string;
    kendaraan?: string;
    platNomor?: string;
    petugas: string;
    status: 'Bertamu' | 'Selesai';
    lastModified?: number;
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
    RaporLengkap = 'RaporLengkap',
    LaporanEMIS = 'LaporanEMIS'
}

export interface SyncFileRecord {
    id: string;
    name: string;
    path_lower: string;
    client_modified: string;
    size: number;
    status: 'pending' | 'merged';
}

export interface StorageStats {
    used: number;
    total: number;
    percent: number;
}
