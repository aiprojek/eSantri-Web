export interface Prestasi {
  id: number;
  jenis: 'Akademik' | 'Non-Akademik' | 'Tahfidz' | 'Lainnya';
  tingkat: 'Desa' | 'Kecamatan' | 'Kabupaten' | 'Provinsi' | 'Nasional' | 'Internasional';
  nama: string;
  tahun: number;
  penyelenggara: string;
}

export interface Pelanggaran {
  id: number;
  tanggal: string; // YYYY-MM-DD
  jenis: 'Ringan' | 'Sedang' | 'Berat';
  deskripsi: string;
  tindakLanjut: string; // Sanksi atau tindakan yang diberikan
  pelapor: string; // Nama ustadz/ustadzah yang mencatat
}

export interface RiwayatStatus {
  id: number;
  status: 'Aktif' | 'Hiatus' | 'Lulus' | 'Keluar/Pindah' | 'Masuk';
  tanggal: string; // YYYY-MM-DD
  keterangan: string; // Contoh: "Pindah ke Ponpes Al-Amin", "Lulus Angkatan ke-X"
}

export interface Alamat {
  detail: string; // Jalan, RT/RW, Dusun
  desaKelurahan?: string;
  kecamatan?: string;
  kabupatenKota?: string;
  provinsi?: string;
  kodePos?: string;
}


export interface Santri {
  id: number;
  nis: string; // Nomor Induk Santri
  nik?: string; // Nomor Induk Kependudukan
  nisn?: string; // Nomor Induk Siswa Nasional
  namaLengkap: string;
  namaHijrah?: string;
  fotoUrl?: string; // URL untuk foto santri
  kewarganegaraan?: 'WNI' | 'WNA' | 'Keturunan';
  berkebutuhanKhusus?: string;
  jenisSantri?: 'Mondok - Baru' | 'Mondok - Pindahan' | 'Laju - Baru' | 'Laju - Pindahan';
  tempatLahir: string;
  tanggalLahir: string; // YYYY-MM-DD
  jenisKelamin: 'Laki-laki' | 'Perempuan';
  anakKe?: number;
  statusKeluarga?: 'Anak Kandung' | 'Anak Tiri' | 'Anak Angkat' | 'Anak Asuh';
  alamat: Alamat;
  
  // Data Periodik (tidak dicetak)
  tinggiBadan?: number; // cm
  beratBadan?: number; // kg
  jarakKePondok?: string; // e.g., "5 km", "< 1 km"
  jumlahSaudara?: number;
  riwayatPenyakit?: string;
  prestasi?: Prestasi[];
  pelanggaran?: Pelanggaran[];
  hobi?: string[];

  tanggalMasuk: string; // YYYY-MM-DD, menggantikan tahunMasuk
  sekolahAsal?: string;
  alamatSekolahAsal?: string;

  // Data Ayah
  namaAyah: string;
  nikAyah?: string;
  tempatLahirAyah?: string;
  tanggalLahirAyah?: string; // YYYY-MM-DD
  pekerjaanAyah?: string;
  pendidikanAyah?: string;
  penghasilanAyah?: string;
  alamatAyah?: Alamat;
  agamaAyah?: string;
  statusAyah?: 'Hidup' | 'Cerai Hidup' | 'Cerai Wafat';
  teleponAyah?: string;

  // Data Ibu
  namaIbu: string;
  nikIbu?: string;
  tempatLahirIbu?: string;
  tanggalLahirIbu?: string; // YYYY-MM-DD
  pekerjaanIbu?: string;
  pendidikanIbu?: string;
  penghasilanIbu?: string;
  alamatIbu?: Alamat;
  agamaIbu?: string;
  statusIbu?: 'Hidup' | 'Cerai Hidup' | 'Cerai Wafat';
  teleponIbu?: string;

  // Data Wali (opsional)
  namaWali?: string;
  tempatLahirWali?: string;
  tanggalLahirWali?: string; // YYYY-MM-DD
  pekerjaanWali?: string;
  pendidikanWali?: string;
  penghasilanWali?: string;
  agamaWali?: string;
  statusWali?: 'Kakek' | 'Paman (Saudara Ayah)' | 'Saudara Laki-laki Seayah' | 'Saudara Laki-laki Kandung' | 'Orang Tua Angkat' | 'Orang Tua Asuh' | 'Orang Tua Tiri' | 'Kerabat Mahram Lainnya' | 'Lainnya';
  alamatWali?: Alamat;
  teleponWali: string; // Dipindah dari data utama

  jenjangId: number;
  kelasId: number; // Sebelumnya tingkatId
  rombelId: number; // Sebelumnya kelasId
  kamarId?: number; // ID Kamar Asrama
  status: 'Aktif' | 'Hiatus' | 'Lulus' | 'Keluar/Pindah';
  tanggalStatus?: string; // YYYY-MM-DD, untuk Hiatus, Lulus, Keluar/Pindah
  riwayatStatus?: RiwayatStatus[];
}

export interface RiwayatJabatan {
  id: number;
  jabatan: string;
  tanggalMulai: string; // YYYY-MM-DD
  tanggalSelesai?: string; // YYYY-MM-DD, jika kosong berarti masih aktif
}

export interface TenagaPengajar {
  id: number;
  nama: string;
  riwayatJabatan: RiwayatJabatan[];
}

export interface Jenjang {
  id: number;
  nama: string;
  kode?: string;
  mudirId?: number;
}

// Sebelumnya adalah Tingkat
export interface Kelas {
  id: number;
  nama: string;
  jenjangId: number;
}

// Sebelumnya adalah Kelas
export interface Rombel {
  id: number;
  nama: string;
  kelasId: number; // sebelumnya tingkatId
  waliKelasId?: number;
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

export interface MataPelajaran {
  id: number;
  nama: string;
  jenjangId: number;
}

export interface NisJenjangConfig {
  jenjangId: number;
  startNumber: number;
  padding: number;
}

export interface NisSettings {
  generationMethod: 'custom' | 'global' | 'dob';

  // For 'custom' method
  format: string;
  jenjangConfig: NisJenjangConfig[];
  masehiYearSource: 'auto' | 'manual';
  manualMasehiYear: number;
  hijriahYearSource: 'auto' | 'manual';
  manualHijriahYear: number;
  
  // For 'global' method
  globalPrefix: string;
  globalUseYearPrefix: boolean;
  globalUseJenjangCode: boolean;
  globalStartNumber: number;
  globalPadding: number;

  // For 'dob' method
  dobFormat: 'YYYYMMDD' | 'DDMMYY' | 'YYMMDD';
  dobSeparator: string;
  dobUseJenjangCode: boolean;
  dobPadding: number;
}

export interface Biaya {
  id: number;
  nama: string;
  nominal: number; // For Cicilan, this is the TOTAL amount
  jenis: 'Bulanan' | 'Sekali Bayar' | 'Cicilan';
  jenjangId?: number; // if undefined, applies to all
  tahunMasuk?: number; // if undefined, applies to all
  jumlahCicilan?: number; // Only for 'Cicilan'
  nominalCicilan?: number; // Only for 'Cicilan'
}

export interface Tagihan {
  id: number;
  santriId: number;
  biayaId: number;
  deskripsi: string; // e.g., "SPP Bulan Juli 2025" or "Uang Pangkal (Cicilan 1/3)"
  bulan: number; // 1-12, for 'Bulanan' or installment number
  tahun: number;
  nominal: number;
  status: 'Belum Lunas' | 'Lunas';
  tanggalLunas?: string;
  pembayaranId?: number;
}

export interface Pembayaran {
  id: number;
  santriId: number;
  tagihanIds: number[];
  jumlah: number;
  tanggal: string; // YYYY-MM-DD
  metode: 'Tunai' | 'Transfer';
  catatan?: string;
  disetorKeKas?: boolean;
}

export interface SaldoSantri {
  santriId: number; // Primary key, same as Santri ID
  saldo: number;
}

export interface TransaksiSaldo {
  id: number;
  santriId: number;
  tanggal: string; // YYYY-MM-DDTHH:mm:ss
  jenis: 'Deposit' | 'Penarikan';
  jumlah: number;
  keterangan: string;
  saldoSetelah: number;
}

export interface TransaksiKas {
  id: number;
  tanggal: string; // YYYY-MM-DDTHH:mm:ss
  jenis: 'Pemasukan' | 'Pengeluaran';
  kategori: string;
  deskripsi: string;
  jumlah: number;
  saldoSetelah: number;
  penanggungJawab: string;
}

export interface PondokSettings {
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
  kelas: Kelas[]; // sebelumnya tingkat
  rombel: Rombel[]; // sebelumnya kelas
  tenagaPengajar: TenagaPengajar[];
  nisSettings: NisSettings;
  mataPelajaran: MataPelajaran[];
  gedungAsrama: GedungAsrama[];
  kamar: Kamar[];
  biaya: Biaya[];
  suratTagihanPembuka: string;
  suratTagihanPenutup: string;
  suratTagihanCatatan?: string;
  pesanWaTunggakan: string;
}

export enum Page {
  Dashboard = 'Dashboard',
  Santri = 'Data Santri',
  Keuangan = 'Keuangan',
  Keasramaan = 'Keasramaan',
  BukuKas = 'Buku Kas',
  Pengaturan = 'Pengaturan',
  Laporan = 'Laporan & Cetak',
  Tentang = 'Tentang',
}

export enum ReportType {
  Biodata = 'biodata',
  KartuSantri = 'kartuSantri',
  LabelSantri = 'labelSantri',
  DaftarRombel = 'daftarRombel',
  LembarNilai = 'lembarNilai',
  LembarAbsensi = 'lembarAbsensi',
  LembarKedatangan = 'lembarKedatangan',
  LembarRapor = 'lembarRapor',
  LembarPembinaan = 'lembarPembinaan',
  LaporanMutasi = 'laporanMutasi',
  FormulirIzin = 'formulirIzin',
  DashboardSummary = 'dashboardSummary',
  FinanceSummary = 'financeSummary',
  LaporanAsrama = 'laporanAsrama',
  RekeningKoranSantri = 'rekeningKoranSantri',
  LaporanArusKas = 'laporanArusKas',
}