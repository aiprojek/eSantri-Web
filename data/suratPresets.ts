import { SuratTemplate } from '../types';

export interface SuratVariableInfo {
    key: string;
    label: string;
    category: 'Santri' | 'Akademik & Asrama' | 'Orang Tua' | 'Lembaga & Surat';
    example: string;
}

export const SURAT_VARIABLES: SuratVariableInfo[] = [
    // Santri
    { key: '{NAMA_SANTRI}', label: 'Nama Santri', category: 'Santri', example: 'Ahmad Fauzi' },
    { key: '{NIS}', label: 'NIS', category: 'Santri', example: '2026001' },
    { key: '{NISN}', label: 'NISN', category: 'Santri', example: '0081234567' },
    { key: '{NIK}', label: 'NIK', category: 'Santri', example: '3201234567890001' },
    { key: '{NO_KK}', label: 'No. KK', category: 'Santri', example: '3201234567890002' },
    { key: '{TEMPAT_LAHIR}', label: 'Tempat Lahir', category: 'Santri', example: 'Surabaya' },
    { key: '{TANGGAL_LAHIR}', label: 'Tanggal Lahir', category: 'Santri', example: '12 Januari 2010' },
    { key: '{TTL}', label: 'Tempat, Tgl Lahir', category: 'Santri', example: 'Surabaya, 12 Januari 2010' },
    { key: '{JENIS_KELAMIN}', label: 'Jenis Kelamin', category: 'Santri', example: 'Laki-laki' },
    
    // Akademik & Asrama
    { key: '{JENJANG}', label: 'Jenjang', category: 'Akademik & Asrama', example: 'MTs / SMP' },
    { key: '{KELAS}', label: 'Kelas', category: 'Akademik & Asrama', example: 'VII (Tujuh)' },
    { key: '{ROMBEL}', label: 'Rombel', category: 'Akademik & Asrama', example: 'A' },
    { key: '{ASRAMA}', label: 'Asrama', category: 'Akademik & Asrama', example: 'Gedung Al-Fath' },
    { key: '{KAMAR}', label: 'Kamar', category: 'Akademik & Asrama', example: 'Kamar 03' },
    { key: '{ANGKATAN}', label: 'Angkatan / Thn Masuk', category: 'Akademik & Asrama', example: '2026' },

    // Orang Tua
    { key: '{ORTU_WALI}', label: 'Ortu / Wali', category: 'Orang Tua', example: 'H. Abdullah' },
    { key: '{NAMA_AYAH}', label: 'Nama Ayah', category: 'Orang Tua', example: 'H. Abdullah' },
    { key: '{NAMA_IBU}', label: 'Nama Ibu', category: 'Orang Tua', example: 'Hj. Aminah' },
    { key: '{NAMA_WALI}', label: 'Nama Wali', category: 'Orang Tua', example: 'H. Abdullah' },
    { key: '{NO_HP}', label: 'No. HP / WA Wali', category: 'Orang Tua', example: '081234567890' },
    { key: '{ALAMAT}', label: 'Alamat Detail', category: 'Orang Tua', example: 'Jl. Pesantren No. 12' },
    { key: '{ALAMAT_LENGKAP}', label: 'Alamat Lengkap', category: 'Orang Tua', example: 'Jl. Pesantren No. 12, Desa Santri, Kec. Pesantren, Kab. Kediri' },

    // Lembaga & Surat
    { key: '{NOMOR_SURAT}', label: 'Nomor Surat', category: 'Lembaga & Surat', example: '012/SKA/PST/IX/2026' },
    { key: '{TANGGAL}', label: 'Tanggal Surat', category: 'Lembaga & Surat', example: '9 September 2026' },
    { key: '{NAMA_PONDOK}', label: 'Nama Lembaga', category: 'Lembaga & Surat', example: 'Pondok Pesantren eSantri' },
    { key: '{ALAMAT_PONDOK}', label: 'Alamat Lembaga', category: 'Lembaga & Surat', example: 'Jl. Raya Pondok Pesantren No. 99' },
    { key: '{PIMPINAN_PONDOK}', label: 'Pimpinan / Pengasuh', category: 'Lembaga & Surat', example: 'KH. Dr. Ahmad Shiddiq, M.Pd' },
];

export const DEFAULT_SURAT_TEMPLATES: Omit<SuratTemplate, 'id'>[] = [
    {
        nama: 'Surat Keterangan Santri Aktif',
        kategori: 'Resmi',
        kodeSurat: 'SKA',
        judul: 'SURAT KETERANGAN AKTIF BELAJAR',
        konten: `<p>Yang bertanda tangan di bawah ini Pimpinan / Pengasuh Pondok Pesantren <b>{NAMA_PONDOK}</b>, menerangkan dengan sebenarnya bahwa:</p>
<table style="width: 100%; margin: 12px 0; border-collapse: collapse; font-size: 11pt;">
  <tbody>
    <tr><td style="width: 210px; padding: 4px 0;">Nama Lengkap</td><td style="width: 20px;">:</td><td><b>{NAMA_SANTRI}</b></td></tr>
    <tr><td style="padding: 4px 0;">Nomor Induk Santri (NIS)</td><td>:</td><td>{NIS}</td></tr>
    <tr><td style="padding: 4px 0;">NISN</td><td>:</td><td>{NISN}</td></tr>
    <tr><td style="padding: 4px 0;">NIK</td><td>:</td><td>{NIK}</td></tr>
    <tr><td style="padding: 4px 0;">Tempat, Tanggal Lahir</td><td>:</td><td>{TTL}</td></tr>
    <tr><td style="padding: 4px 0;">Jenis Kelamin</td><td>:</td><td>{JENIS_KELAMIN}</td></tr>
    <tr><td style="padding: 4px 0;">Jenjang / Kelas</td><td>:</td><td>{JENJANG} - {KELAS} {ROMBEL}</td></tr>
    <tr><td style="padding: 4px 0;">Asrama / Kamar</td><td>:</td><td>{ASRAMA} / {KAMAR}</td></tr>
    <tr><td style="padding: 4px 0;">Nama Orang Tua / Wali</td><td>:</td><td>{ORTU_WALI}</td></tr>
    <tr><td style="padding: 4px 0; vertical-align: top;">Alamat Lengkap</td><td style="vertical-align: top;">:</td><td>{ALAMAT_LENGKAP}</td></tr>
  </tbody>
</table>
<p>Adalah benar-benar santri yang saat ini masih berstatus <b>AKTIF</b> mengikuti kegiatan belajar mengajar dan tarbiyah di Pondok Pesantren {NAMA_PONDOK} pada tahun ajaran berjalan, serta berkelakuan baik dan mematuhi seluruh tata tertib pesantren.</p>
<p>Surat keterangan ini diterbitkan atas permohonan yang bersangkutan untuk keperluan <i>kelengkapan administrasi dan pengurusan beasiswa / dinas</i>.</p>
<p>Demikian surat keterangan ini kami buat dengan sebenarnya dan penuh tanggung jawab agar dapat dipergunakan sebagaimana mestinya.</p>`,
        signatories: [
            { id: 'sig-pimpinan', jabatan: 'Pengasuh / Pimpinan Pondok', nama: '{PIMPINAN_PONDOK}' }
        ],
        tempatTanggalConfig: { show: true, position: 'bottom-right', align: 'right' },
        marginConfig: { top: 2, right: 2, bottom: 2, left: 2 },
        showJudul: true,
        usePrePrintedKop: false,
        kopMarginTop: 4.0
    },
    {
        nama: 'Surat Izin Pulang / Cuti Santri',
        kategori: 'Izin',
        kodeSurat: 'SIP',
        judul: 'SURAT IZIN PULANG / CUTI KHUSUS',
        konten: `<p>Berdasarkan permohonan dari orang tua / wali santri, bersama ini Bagian Pengasuhan Santri Pondok Pesantren <b>{NAMA_PONDOK}</b> memberikan izin kepulangan / cuti kepada:</p>
<table style="width: 100%; margin: 12px 0; border-collapse: collapse; font-size: 11pt;">
  <tbody>
    <tr><td style="width: 210px; padding: 4px 0;">Nama Santri</td><td style="width: 20px;">:</td><td><b>{NAMA_SANTRI}</b></td></tr>
    <tr><td style="padding: 4px 0;">NIS / Kelas</td><td>:</td><td>{NIS} / {KELAS} {ROMBEL}</td></tr>
    <tr><td style="padding: 4px 0;">Asrama / Kamar</td><td>:</td><td>{ASRAMA} / {KAMAR}</td></tr>
    <tr><td style="padding: 4px 0;">Nama Orang Tua / Wali</td><td>:</td><td>{ORTU_WALI}</td></tr>
    <tr><td style="padding: 4px 0; vertical-align: top;">Alamat Rumah</td><td style="vertical-align: top;">:</td><td>{ALAMAT_LENGKAP}</td></tr>
    <tr><td style="padding: 4px 0;">Keperluan / Alasan</td><td>:</td><td>...........................................................................</td></tr>
    <tr><td style="padding: 4px 0;">Masa Cuti / Izin</td><td>:</td><td>Mulai tanggal ............... s/d ...............</td></tr>
  </tbody>
</table>
<p>Dengan ketentuan santri yang bersangkutan wajib mematuhi ketentuan cuti, menjaga nama baik almamater pesantren selama di rumah, dan kembali ke pondok pesantren tepat waktu. Keterlambatan tanpa konfirmasi resmi akan dikenakan sanksi tata tertib kepesantrenan.</p>
<p>Demikian surat izin cuti ini dibuat untuk diketahui dan ditaati bersama.</p>`,
        mengetahuiConfig: { show: true, jabatan: 'Mengetahui, Orang Tua / Wali', align: 'left' },
        signatories: [
            { id: 'sig-keamanan', jabatan: 'Bagian Keamanan & Pengasuhan', nama: '...................................' }
        ],
        tempatTanggalConfig: { show: true, position: 'bottom-right', align: 'right' },
        marginConfig: { top: 2, right: 2, bottom: 2, left: 2 },
        showJudul: true,
        usePrePrintedKop: false,
        kopMarginTop: 4.0
    },
    {
        nama: 'Surat Keterangan Berkelakuan Baik',
        kategori: 'Resmi',
        kodeSurat: 'SKB',
        judul: 'SURAT KETERANGAN BERKELAKUAN BAIK',
        konten: `<p>Yang bertanda tangan di bawah ini Pimpinan / Kepala Lembaga Pondok Pesantren <b>{NAMA_PONDOK}</b>, menerangkan bahwa:</p>
<table style="width: 100%; margin: 12px 0; border-collapse: collapse; font-size: 11pt;">
  <tbody>
    <tr><td style="width: 210px; padding: 4px 0;">Nama Lengkap</td><td style="width: 20px;">:</td><td><b>{NAMA_SANTRI}</b></td></tr>
    <tr><td style="padding: 4px 0;">NIS / NISN</td><td>:</td><td>{NIS} / {NISN}</td></tr>
    <tr><td style="padding: 4px 0;">Tempat, Tanggal Lahir</td><td>:</td><td>{TTL}</td></tr>
    <tr><td style="padding: 4px 0;">Kelas / Jenjang</td><td>:</td><td>{KELAS} ({JENJANG})</td></tr>
    <tr><td style="padding: 4px 0;">Nama Orang Tua / Wali</td><td>:</td><td>{ORTU_WALI}</td></tr>
    <tr><td style="padding: 4px 0; vertical-align: top;">Alamat Lengkap</td><td style="vertical-align: top;">:</td><td>{ALAMAT_LENGKAP}</td></tr>
  </tbody>
</table>
<p>Sepanjang masa pendidikan dan pembinaan yang bersangkutan di pondok pesantren ini sampai dengan tanggal diterbitkannya surat ini, yang bersangkutan:</p>
<ol style="margin-left: 20px; padding-left: 10px; line-height: 1.6;">
  <li>Selalu menunjukkan akhlakul karimah, keteladanan, serta budi pekerti yang baik di lingkungan asrama dan madrasah.</li>
  <li>Tidak pernah terlibat dalam tindak pidana kejahatan, tawuran, atau penyalahgunaan narkoba/miras.</li>
  <li>Tidak pernah melanggar qanun dan tata tertib disiplin berat pesantren.</li>
</ol>
<p>Demikian surat keterangan ini kami buat dengan sebenarnya dan penuh tanggung jawab agar dapat dipergunakan sebagaimana mestinya.</p>`,
        signatories: [
            { id: 'sig-pimpinan', jabatan: 'Pimpinan Pondok Pesantren', nama: '{PIMPINAN_PONDOK}' }
        ],
        tempatTanggalConfig: { show: true, position: 'bottom-right', align: 'right' },
        marginConfig: { top: 2, right: 2, bottom: 2, left: 2 },
        showJudul: true,
        usePrePrintedKop: false,
        kopMarginTop: 4.0
    },
    {
        nama: 'Surat Undangan Wali Santri',
        kategori: 'Pemberitahuan',
        kodeSurat: 'UND',
        judul: 'SURAT UNDANGAN WALI SANTRI',
        konten: `<p>Kepada Yth.<br/>Bapak / Ibu Wali Santri dari <b>{NAMA_SANTRI}</b><br/>Kelas {KELAS} {ROMBEL}<br/>di Tempat</p>
<p><i>Assalamu'alaikum Warahmatullahi Wabarakatuh</i></p>
<p>Puji syukur kehadirat Allah SWT atas segala limpahan rahmat dan hidayah-Nya. Sholawat serta salam semoga senantiasa tercurah kepada junjungan kita Nabi Muhammad SAW.</p>
<p>Sehubungan dengan agenda evaluasi pendidikan dan perkembangan ananda di pondok pesantren, kami mengharap kehadiran Bapak/Ibu Wali Santri pada pertemuan yang insyaAllah akan diselenggarakan pada:</p>
<table style="width: 100%; margin: 12px 0; border-collapse: collapse; font-size: 11pt;">
  <tbody>
    <tr><td style="width: 180px; padding: 4px 0;">Hari / Tanggal</td><td style="width: 20px;">:</td><td>............................................................</td></tr>
    <tr><td style="padding: 4px 0;">Waktu</td><td>:</td><td>08.30 WIB s/d Selesai</td></tr>
    <tr><td style="padding: 4px 0;">Tempat</td><td>:</td><td>Aula Pertemuan Pondok Pesantren {NAMA_PONDOK}</td></tr>
    <tr><td style="padding: 4px 0; vertical-align: top;">Agenda</td><td style="vertical-align: top;">:</td><td>Silaturahmi, Evaluasi Hasil Belajar Santri & Musyawarah Wali</td></tr>
  </tbody>
</table>
<p>Mengingat pentingnya agenda tersebut demi sinergi pembinaan santri antara keluarga dan pesantren, kami sangat mengharapkan kehadiran Bapak/Ibu tepat pada waktunya.</p>
<p>Demikian undangan ini kami sampaikan. Atas perhatian dan kerja samanya kami haturkan jazakumullahu khairan katsiran.</p>
<p><i>Wassalamu'alaikum Warahmatullahi Wabarakatuh</i></p>`,
        signatories: [
            { id: 'sig-sekretaris', jabatan: 'Sekretaris Pondok', nama: '...................................' },
            { id: 'sig-pengasuh', jabatan: 'Pengasuh Pondok Pesantren', nama: '{PIMPINAN_PONDOK}' }
        ],
        tempatTanggalConfig: { show: true, position: 'bottom-right', align: 'right' },
        marginConfig: { top: 2, right: 2, bottom: 2, left: 2 },
        showJudul: true,
        usePrePrintedKop: false,
        kopMarginTop: 4.0
    },
    {
        nama: 'Surat Rekomendasi Beasiswa & Studi',
        kategori: 'Resmi',
        kodeSurat: 'REK',
        judul: 'SURAT REKOMENDASI',
        konten: `<p>Yang bertanda tangan di bawah ini Pimpinan Pondok Pesantren <b>{NAMA_PONDOK}</b>, dengan ini memberikan rekomendasi penuh kepada:</p>
<table style="width: 100%; margin: 12px 0; border-collapse: collapse; font-size: 11pt;">
  <tbody>
    <tr><td style="width: 210px; padding: 4px 0;">Nama Lengkap</td><td style="width: 20px;">:</td><td><b>{NAMA_SANTRI}</b></td></tr>
    <tr><td style="padding: 4px 0;">Nomor Induk Santri (NIS)</td><td>:</td><td>{NIS}</td></tr>
    <tr><td style="padding: 4px 0;">NISN / NIK</td><td>:</td><td>{NISN} / {NIK}</td></tr>
    <tr><td style="padding: 4px 0;">Tempat, Tanggal Lahir</td><td>:</td><td>{TTL}</td></tr>
    <tr><td style="padding: 4px 0;">Jenjang / Tingkat</td><td>:</td><td>{JENJANG} ({KELAS})</td></tr>
    <tr><td style="padding: 4px 0;">Nama Orang Tua / Wali</td><td>:</td><td>{ORTU_WALI}</td></tr>
    <tr><td style="padding: 4px 0; vertical-align: top;">Alamat Lengkap</td><td style="vertical-align: top;">:</td><td>{ALAMAT_LENGKAP}</td></tr>
  </tbody>
</table>
<p>Berdasarkan pengamatan dan evaluasi selama menempuh pendidikan di pondok pesantren ini, yang bersangkutan terbukti memiliki prestasi akademik yang membanggakan, ketekunan dalam menghafal dan mengkaji Al-Qur'an/kitab, serta berintegritas tinggi.</p>
<p>Oleh karena itu, kami memberikan <b>REKOMENDASI</b> kepada santri tersebut untuk dapat diikutsertakan dalam program <b>Beasiswa Prestasi / Lanjut Studi Perguruan Tinggi</b>.</p>
<p>Demikian surat rekomendasi ini kami berikan dengan sungguh-sungguh untuk dapat dipergunakan sebagaimana mestinya.</p>`,
        signatories: [
            { id: 'sig-pimpinan', jabatan: 'Pimpinan Pondok Pesantren', nama: '{PIMPINAN_PONDOK}' }
        ],
        tempatTanggalConfig: { show: true, position: 'bottom-right', align: 'right' },
        marginConfig: { top: 2, right: 2, bottom: 2, left: 2 },
        showJudul: true,
        usePrePrintedKop: false,
        kopMarginTop: 4.0
    },
    {
        nama: 'Surat Keterangan Pindah / Mutasi Santri',
        kategori: 'Resmi',
        kodeSurat: 'MUT',
        judul: 'SURAT KETERANGAN PINDAH / MUTASI',
        konten: `<p>Yang bertanda tangan di bawah ini Kepala Lembaga / Pengasuh Pondok Pesantren <b>{NAMA_PONDOK}</b>, menerangkan bahwa:</p>
<table style="width: 100%; margin: 12px 0; border-collapse: collapse; font-size: 11pt;">
  <tbody>
    <tr><td style="width: 210px; padding: 4px 0;">Nama Lengkap</td><td style="width: 20px;">:</td><td><b>{NAMA_SANTRI}</b></td></tr>
    <tr><td style="padding: 4px 0;">NIS / NISN</td><td>:</td><td>{NIS} / {NISN}</td></tr>
    <tr><td style="padding: 4px 0;">NIK</td><td>:</td><td>{NIK}</td></tr>
    <tr><td style="padding: 4px 0;">Tempat, Tanggal Lahir</td><td>:</td><td>{TTL}</td></tr>
    <tr><td style="padding: 4px 0;">Tingkat / Kelas Terakhir</td><td>:</td><td>{KELAS} {ROMBEL} ({JENJANG})</td></tr>
    <tr><td style="padding: 4px 0;">Nama Orang Tua / Wali</td><td>:</td><td>{ORTU_WALI}</td></tr>
    <tr><td style="padding: 4px 0; vertical-align: top;">Alamat Asal</td><td style="vertical-align: top;">:</td><td>{ALAMAT_LENGKAP}</td></tr>
  </tbody>
</table>
<p>Sesuai dengan surat permohonan pindah resmi dari orang tua/wali santri tertanggal ..............., maka terhitung sejak tanggal surat ini diterbitkan, santri tersebut di atas dinyatakan <b>PINDAH / MUTASI</b> dari Pondok Pesantren {NAMA_PONDOK} ke lembaga pendidikan yang dituju.</p>
<p>Selama belajar di pondok pesantren ini, santri yang bersangkutan telah menyelesaikan seluruh kewajiban administrasi kepesantrenan dan berkelakuan baik.</p>
<p>Demikian surat keterangan mutasi ini kami buat dengan sebenarnya untuk dipergunakan sebagai kelengkapan administrasi pada lembaga pendidikan yang baru.</p>`,
        signatories: [
            { id: 'sig-pimpinan', jabatan: 'Pimpinan Pondok Pesantren', nama: '{PIMPINAN_PONDOK}' }
        ],
        tempatTanggalConfig: { show: true, position: 'bottom-right', align: 'right' },
        marginConfig: { top: 2, right: 2, bottom: 2, left: 2 },
        showJudul: true,
        usePrePrintedKop: false,
        kopMarginTop: 4.0
    }
];

// Romawi helper for Auto-Numbering
export const toRomanMonth = (monthNumber: number): string => {
    const romans = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
    return romans[Math.max(0, Math.min(11, monthNumber - 1))] || 'I';
};

// Generates next smart letter number: e.g. "001/SKA/PST/IX/2026"
export const generateNextNomorSurat = (
    kodeKategori: string,
    schoolName: string,
    existingCountInCurrentYearAndMonth: number,
    dateInput?: string
): string => {
    const d = dateInput ? new Date(dateInput) : new Date();
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const romanMonth = toRomanMonth(month);

    // Format urut: 001, 002, 015, etc.
    const seq = String(existingCountInCurrentYearAndMonth + 1).padStart(3, '0');
    
    // Singkatan lembaga dari schoolName (contoh: "Pondok Pesantren Darussalam" -> "PPD" atau "PST")
    const words = schoolName.replace(/[^a-zA-Z0-9\s]/g, '').trim().split(/\s+/).filter(Boolean);
    let instituteCode = 'PST';
    if (words.length >= 2) {
        instituteCode = words.map(w => w[0].toUpperCase()).slice(0, 4).join('');
    } else if (words.length === 1 && words[0].length >= 3) {
        instituteCode = words[0].substring(0, 3).toUpperCase();
    }

    const cleanKode = (kodeKategori || 'SRT').toUpperCase().replace(/[^A-Z0-9]/g, '');

    return `${seq}/${cleanKode}/${instituteCode}/${romanMonth}/${year}`;
};
