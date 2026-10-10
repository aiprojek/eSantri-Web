import { Pendaftar, PondokSettings, PsbNilaiUjian } from '../../../types';

/**
 * Extracts a clean Google Drive Folder ID from a raw ID or full Drive URL
 * Supports:
 * - https://drive.google.com/drive/folders/1a2B3c4D5e6F7g8H9i0J?usp=sharing
 * - https://drive.google.com/drive/u/0/folders/1a2B3c4D5e6F7g8H9i0J
 * - https://drive.google.com/open?id=1a2B3c4D5e6F7g8H9i0J
 * - 1a2B3c4D5e6F7g8H9i0J
 */
export const extractDriveFolderId = (input?: string): string => {
    if (!input) return '';
    const trimmed = String(input).trim().replace(/^["']+|["']+$/g, '');
    if (!trimmed || trimmed === 'GANTI_DENGAN_ID_FOLDER_DRIVE_ANDA') return '';

    const foldersMatch = trimmed.match(/\/folders\/([a-zA-Z0-9_-]{15,})/);
    if (foldersMatch && foldersMatch[1]) return foldersMatch[1];

    const idParamMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]{15,})/);
    if (idParamMatch && idParamMatch[1]) return idParamMatch[1];

    const pureIdMatch = trimmed.match(/^([a-zA-Z0-9_-]{15,})$/);
    if (pureIdMatch && pureIdMatch[1]) return pureIdMatch[1];

    return trimmed.split(/[?#&/]/)[0].trim();
};

/**
 * Formats phone number to clean local Indonesian format (08xxxxxxxxxx) without spaces or symbols.
 * Automatically restores leading zero if stripped by Google Sheets (e.g. 81234567890 -> 081234567890)
 * and converts +628... or 628... to 08...
 */
export const normalizePhoneLocal = (phone?: string | number | null): string => {
    if (phone === undefined || phone === null) return '';
    let cleaned = String(phone).replace(/[^0-9]/g, '');
    if (!cleaned) return '';
    if (cleaned.startsWith('0062')) {
        cleaned = '0' + cleaned.slice(4);
    } else if (cleaned.startsWith('62')) {
        cleaned = '0' + cleaned.slice(2);
    } else if (cleaned.startsWith('8') && cleaned.length >= 8 && cleaned.length <= 14) {
        cleaned = '0' + cleaned;
    }
    return cleaned;
};

export const cleanPhoneNumber = (phone?: string | number | null): string => {
    const local = normalizePhoneLocal(phone);
    if (!local || local.length < 9) return '';
    if (local.startsWith('0')) {
        return '62' + local.slice(1);
    }
    if (local.startsWith('62')) {
        return local;
    }
    return '62' + local;
};

export const isPhoneFieldKey = (key?: string): boolean => {
    if (!key) return false;
    const lower = key.toLowerCase();
    return (
        lower === 'telepon' ||
        lower === 'nohp' ||
        lower === 'teleponayah' ||
        lower === 'teleponibu' ||
        lower === 'nomorhpwali' ||
        lower === 'teleponwali' ||
        lower.includes('telepon') ||
        lower.includes('nomorhp') ||
        lower.includes('nohp') ||
        lower.includes('whatsapp')
    );
};

/**
 * Resolves the best available WhatsApp/phone number from a Pendaftar record,
 * checking nomorHpWali, teleponAyah, teleponIbu, telepon, and customData fallback keys.
 */
export const getPendaftarPhone = (p?: Pendaftar | null): string => {
    if (!p) return '';
    const direct =
        normalizePhoneLocal(p.nomorHpWali) ||
        normalizePhoneLocal(p.teleponAyah) ||
        normalizePhoneLocal(p.teleponIbu) ||
        normalizePhoneLocal(p.telepon);
    if (direct && direct.length >= 9) return direct;

    if (p.customData) {
        try {
            const custom = JSON.parse(p.customData);
            const phoneKeys = [
                'nomorHpWali', 'teleponAyah', 'teleponIbu', 'noHpWali', 'noHpAyah', 'noHpIbu',
                'noHp', 'telepon', 'whatsapp', 'wa', 'No HP Wali', 'No. HP Wali', 'Telepon / WA',
                'No. HP / WhatsApp', 'Nomor WhatsApp', 'Nomor HP'
            ];
            for (const key of Object.keys(custom)) {
                const lowerKey = key.toLowerCase();
                if (
                    phoneKeys.some(pk => pk.toLowerCase() === lowerKey) ||
                    lowerKey.includes('telepon') ||
                    lowerKey.includes('whatsapp') ||
                    lowerKey.includes('nohp') ||
                    lowerKey.includes('nomorhp') ||
                    lowerKey.includes('no hp') ||
                    lowerKey.includes('no. hp')
                ) {
                    const candidate = normalizePhoneLocal(custom[key]);
                    if (candidate && candidate.length >= 9) return candidate;
                }
            }
        } catch {
            // ignore JSON parse error
        }
    }
    return '';
};

/**
 * Resolves the best available Wali / Parent name from a Pendaftar record
 */
export const getPendaftarWaliName = (p?: Pendaftar | null): string => {
    if (!p) return '-';
    if (p.namaWali && p.namaWali.trim()) return p.namaWali.trim();
    if (p.namaAyah && p.namaAyah.trim()) return p.namaAyah.trim();
    if (p.namaIbu && p.namaIbu.trim()) return p.namaIbu.trim();
    return '-';
};

/**
 * Automatically heals a Pendaftar record by extracting any standard Pendaftar fields
 * (such as physical data: tinggiBadan, beratBadan, golonganDarah, riwayatPenyakit,
 * parent data: namaAyah, teleponAyah, namaIbu, teleponIbu, etc.) that were trapped
 * inside `customData` ("Data Tambahan") and promoting them to top-level Pendaftar properties,
 * while normalizing phone numbers.
 */
export const healPendaftarRecordWithDetails = (raw: any): {
    healed: Pendaftar;
    cleanedCustomObj: Record<string, any>;
    changed: boolean;
} => {
    if (!raw) return { healed: raw, cleanedCustomObj: {}, changed: false };
    const healed: any = { ...raw };
    let changed = false;

    let customObj: Record<string, any> = {};
    if (typeof healed.customData === 'string' && healed.customData.trim()) {
        try {
            const parsed = JSON.parse(healed.customData);
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                customObj = { ...parsed };
            }
        } catch {
            customObj = {};
        }
    } else if (healed.customData && typeof healed.customData === 'object') {
        customObj = { ...healed.customData };
    }

    const aliasMap: Record<string, string> = {
        namalengkap: 'namaLengkap',
        namapanggilan: 'namaHijrah',
        namahijrah: 'namaHijrah',
        nisn: 'nisn',
        nik: 'nik',
        tempatlahir: 'tempatLahir',
        tanggallahir: 'tanggalLahir',
        jeniskelamin: 'jenisKelamin',
        agama: 'agama',
        kewarganegaraan: 'kewarganegaraan',
        anakke: 'anakKe',
        jumlahsaudara: 'jumlahSaudara',
        statuskeluarga: 'statusKeluarga',
        bahasaseharihari: 'bahasaSehariHari',
        tinggibadan: 'tinggiBadan',
        tinggibadancm: 'tinggiBadan',
        beratbadan: 'beratBadan',
        beratbadankg: 'beratBadan',
        golongandarah: 'golonganDarah',
        riwayatpenyakit: 'riwayatPenyakit',
        kelainanjasmani: 'berkebutuhanKhusus',
        kebutuhankhusus: 'berkebutuhanKhusus',
        berkebutuhankhusus: 'berkebutuhanKhusus',
        citacita: 'citaCita',
        hobi: 'hobi',
        prestasi: 'prestasi',
        telepon: 'telepon',
        nohp: 'telepon',
        nohpsantri: 'telepon',
        jarakkepondok: 'jarakKePondok',
        alamatlengkap: 'alamatRumah',
        alamatrumah: 'alamatRumah',
        alamat: 'alamatRumah',
        desakelurahan: 'desaKelurahan',
        kecamatan: 'kecamatan',
        kabupatenkota: 'kabupatenKota',
        provinsi: 'provinsi',
        kodepos: 'kodePos',
        sekolahasal: 'asalSekolah',
        asalsekolah: 'asalSekolah',
        npsnsekolahasal: 'npsnSekolahAsal',
        alamatsekolahasal: 'alamatSekolahAsal',
        tahunlulus: 'tahunLulusSebelumnya',
        tahunlulussebelumnya: 'tahunLulusSebelumnya',
        noijazah: 'nomorIjazahSebelumnya',
        nomorijazahsebelumnya: 'nomorIjazahSebelumnya',
        noskhun: 'noSkhun',
        namaayah: 'namaAyah',
        nikayah: 'nikAyah',
        statusayah: 'statusAyah',
        tempatlahirayah: 'tempatLahirAyah',
        tanggallahirayah: 'tanggalLahirAyah',
        pendidikanayah: 'pendidikanAyah',
        pekerjaanayah: 'pekerjaanAyah',
        penghasilanayah: 'penghasilanAyah',
        teleponayah: 'teleponAyah',
        nohpayah: 'teleponAyah',
        waayah: 'teleponAyah',
        namaibu: 'namaIbu',
        nikibu: 'nikIbu',
        statusibu: 'statusIbu',
        tempatlahiribu: 'tempatLahirIbu',
        tanggallahiribu: 'tanggalLahirIbu',
        pendidikanibu: 'pendidikanIbu',
        pekerjaanibu: 'pekerjaanIbu',
        penghasilanibu: 'penghasilanIbu',
        teleponibu: 'teleponIbu',
        nohpibu: 'teleponIbu',
        waibu: 'teleponIbu',
        namawali: 'namaWali',
        nikwali: 'nikWali',
        hubunganwali: 'statusWali',
        statuswali: 'statusWali',
        nomorhpwali: 'nomorHpWali',
        nohpwali: 'nomorHpWali',
        teleponwali: 'nomorHpWali',
        teleponwa: 'nomorHpWali',
        nohpwhatsapp: 'nomorHpWali',
        nomorwhatsapp: 'nomorHpWali',
        alamatwali: 'alamatWali',
        pekerjaanwali: 'pekerjaanWali',
        pendidikanwali: 'pendidikanWali',
        penghasilanwali: 'penghasilanWali',
        jenissantri: 'jenisSantri',
        targetjuz: 'targetJuz',
        programpilihan: 'programPilihan',
        jalurpendaftaran: 'jalurPendaftaran',
        gelombang: 'gelombang',
        catatan: 'catatan'
    };

    const numericFields = new Set(['tinggiBadan', 'beratBadan', 'anakKe', 'jumlahSaudara', 'gelombang', 'targetJuz']);
    const metadataKeysToDrop = new Set(['sheetname', 'jenjangid', 'status', 'tanggaldaftar', 'drivefolderid', 'folderid', 'id', 'nomorregistrasi', 'timestamp']);

    const parseNumeric = (val: any): number | undefined => {
        if (val === undefined || val === null || val === '') return undefined;
        if (typeof val === 'number' && !isNaN(val)) return val;
        const match = String(val).match(/\d+(\.\d+)?/);
        if (match) {
            const num = Number(match[0]);
            return !isNaN(num) ? num : undefined;
        }
        return undefined;
    };

    for (const key of Object.keys(customObj)) {
        const val = customObj[key];
        const isFileLink = typeof val === 'string' && (val.startsWith('data:') || val.startsWith('http'));
        if (isFileLink) continue;

        const normKey = key.toLowerCase().replace(/^custom_/, '').replace(/[^a-z0-9]/g, '');
        if (metadataKeysToDrop.has(normKey)) {
            delete customObj[key];
            changed = true;
            continue;
        }

        const targetProp = aliasMap[normKey];
        if (targetProp) {
            if (targetProp === 'alamatRumah') {
                if (typeof healed.alamat === 'object' && healed.alamat !== null) {
                    if (!healed.alamat.detail && val) {
                        healed.alamat = { ...healed.alamat, detail: String(val).trim() };
                    }
                } else if (!healed.alamat && val) {
                    healed.alamat = { detail: String(val).trim() };
                }
            } else if (['desaKelurahan', 'kecamatan', 'kabupatenKota', 'provinsi', 'kodePos'].includes(targetProp)) {
                const currentAddr = typeof healed.alamat === 'object' && healed.alamat !== null ? healed.alamat : { detail: typeof healed.alamat === 'string' ? healed.alamat : '' };
                if (!currentAddr[targetProp] && val) {
                    healed.alamat = { ...currentAddr, [targetProp]: String(val).trim() };
                }
            } else {
                const currentVal = healed[targetProp];
                const isEmptyCurrent = currentVal === undefined || currentVal === null || currentVal === '' || currentVal === 0;
                if (isEmptyCurrent && val !== undefined && val !== null && String(val).trim() !== '') {
                    if (numericFields.has(targetProp)) {
                        const num = parseNumeric(val);
                        if (num !== undefined) healed[targetProp] = num;
                    } else {
                        healed[targetProp] = String(val).trim();
                    }
                }
            }
            delete customObj[key];
            changed = true;
        }
    }

    for (const nf of numericFields) {
        if (healed[nf] !== undefined && healed[nf] !== null && healed[nf] !== '') {
            const num = parseNumeric(healed[nf]);
            if (num !== undefined) {
                if (healed[nf] !== num) changed = true;
                healed[nf] = num;
            } else {
                delete healed[nf];
                changed = true;
            }
        }
    }

    if (healed.sekolahAsal && !healed.asalSekolah) {
        healed.asalSekolah = healed.sekolahAsal;
        changed = true;
    }

    const phoneProps = ['telepon', 'teleponAyah', 'teleponIbu', 'nomorHpWali'];
    for (const pp of phoneProps) {
        if (healed[pp]) {
            const norm = normalizePhoneLocal(healed[pp]);
            if (norm !== healed[pp]) {
                healed[pp] = norm;
                changed = true;
            }
        }
    }

    if (!healed.nomorHpWali) {
        const fallbackPhone = healed.teleponAyah || healed.teleponIbu || healed.telepon || '';
        if (fallbackPhone) {
            healed.nomorHpWali = fallbackPhone;
            changed = true;
        }
    }
    if (!healed.namaWali || !String(healed.namaWali).trim()) {
        const fallbackWali = healed.namaAyah || healed.namaIbu || '';
        if (fallbackWali) {
            healed.namaWali = fallbackWali;
            changed = true;
        }
    }

    const nextCustomStr = Object.keys(customObj).length > 0 ? JSON.stringify(customObj) : '{}';
    if ((healed.customData || '{}') !== nextCustomStr) {
        healed.customData = nextCustomStr;
    }

    return {
        healed: healed as Pendaftar,
        cleanedCustomObj: customObj,
        changed
    };
};

export const healPendaftarRecord = (raw: any): Pendaftar => {
    return healPendaftarRecordWithDetails(raw).healed;
};

export const getPsbRegistrationNumber = (pendaftar: Pendaftar, jenjangName?: string): string => {
    if (pendaftar.nomorRegistrasi && pendaftar.nomorRegistrasi.trim()) {
        return pendaftar.nomorRegistrasi.trim();
    }
    const year = pendaftar.tanggalDaftar ? new Date(pendaftar.tanggalDaftar).getFullYear() : new Date().getFullYear();
    const cleanJenjang = (jenjangName || 'PSB')
        .replace(/[^a-zA-Z0-9]/g, '')
        .toUpperCase()
        .slice(0, 4);
    const num = String(Math.abs(Math.floor(pendaftar.id || 1))).slice(-4).padStart(4, '0');
    return `PSB-${year}-${cleanJenjang || 'REG'}-${num}`;
};

export const calculatePsbAverageScore = (nilai?: PsbNilaiUjian): number => {
    if (!nilai) return 0;
    const scores: number[] = [];
    if (typeof nilai.bacaQuran === 'number' && !isNaN(nilai.bacaQuran)) scores.push(nilai.bacaQuran);
    if (typeof nilai.tahfizh === 'number' && !isNaN(nilai.tahfizh)) scores.push(nilai.tahfizh);
    if (typeof nilai.akademik === 'number' && !isNaN(nilai.akademik)) scores.push(nilai.akademik);
    if (typeof nilai.wawancara === 'number' && !isNaN(nilai.wawancara)) scores.push(nilai.wawancara);
    
    if (scores.length === 0) return 0;
    const sum = scores.reduce((acc, curr) => acc + curr, 0);
    return Math.round((sum / scores.length) * 10) / 10;
};

export const openWhatsappChat = (phone?: string | null, text?: string): boolean => {
    const formattedPhone = cleanPhoneNumber(phone);
    if (!formattedPhone) {
        return false;
    }
    const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(text || '')}`;
    try {
        const a = document.createElement('a');
        a.href = url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return true;
    } catch {
        window.open(url, '_blank', 'noopener,noreferrer');
        return true;
    }
};

export const generatePsbExamScheduleMessage = (
    pendaftar: Pendaftar,
    settings: PondokSettings,
    options?: {
        tanggalUjian?: string;
        ruangUjian?: string;
        catatan?: string;
    }
): string => {
    const jenjang = settings.jenjang.find(j => j.id === pendaftar.jenjangId)?.nama || '-';
    const noReg = getPsbRegistrationNumber(pendaftar, jenjang);
    const dateStr = options?.tanggalUjian 
        ? new Date(options.tanggalUjian).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
        : 'Sesuai jadwal yang tertera di kartu ujian';
    const roomStr = options?.ruangUjian || 'Posko Panitia PSB';

    return `*PEMBERITAHUAN JADWAL UJIAN SELEKSI MASUK*
*${settings.namaPonpes?.toUpperCase()}*
Tahun Ajaran ${settings.psbConfig?.tahunAjaranAktif || new Date().getFullYear()}

Assalamu'alaikum Warahmatullahi Wabarakatuh,
Yth. Bapak/Ibu Wali dari Calon Santri:
*${pendaftar.namaLengkap}*

Diberitahukan bahwa berkas pendaftaran calon santri telah terverifikasi. Berikut adalah rincian pelaksanaan Ujian Seleksi Masuk:

📋 *Data Peserta:*
• No. Registrasi: *${noReg}*
• Nama: *${pendaftar.namaLengkap}*
• Jenjang Tujuan: *${jenjang}*
• Jalur: *${pendaftar.jalurPendaftaran || 'Reguler'}*

🗓️ *Jadwal & Lokasi Ujian:*
• Hari/Tanggal: *${dateStr}*
• Lokasi/Ruang: *${roomStr}*
• Materi Ujian:
  1. Tes Baca Al-Qur'an (Tajwid & Makhraj)
  2. Tes Hafalan Al-Qur'an (Tahfizh)
  3. Tes Pengetahuan Diniyah & Akademik
  4. Wawancara Calon Santri & Wali

📁 *Kelengkapan Berkas Fisik yang Wajib Dibawa:*
1. Fotokopi Kartu Keluarga (KK)
2. Fotokopi Akta Kelahiran
3. Fotokopi Ijazah / Surat Keterangan Lulus (SKL)
4. Surat Keterangan Sehat Dokter
5. Pas Foto 3x4 (3 Lembar)
6. Membawa Kartu Tanda Peserta Ujian

${options?.catatan ? `_Catatan Tambahan:_ ${options.catatan}\n\n` : ''}Mohon hadir 15 menit sebelum pelaksanaan dengan berpakaian rapi, sopan, dan menutup aurat.

Wassalamu'alaikum Warahmatullahi Wabarakatuh.
_Panitia Penerimaan Santri Baru (PSB)_
*${settings.namaPonpes}*
${settings.telepon ? `📞 Kontak: ${settings.telepon}` : ''}`;
};

export const generatePsbAcceptanceMessage = (
    pendaftar: Pendaftar,
    settings: PondokSettings,
    options?: {
        nominalDaftarUlang?: number;
        batasWaktu?: string;
        rekeningPembayaran?: string;
        catatan?: string;
    }
): string => {
    const jenjang = settings.jenjang.find(j => j.id === pendaftar.jenjangId)?.nama || '-';
    const noReg = getPsbRegistrationNumber(pendaftar, jenjang);
    const nominalStr = options?.nominalDaftarUlang 
        ? `Rp ${options.nominalDaftarUlang.toLocaleString('id-ID')}`
        : '-';
    const batasStr = options?.batasWaktu
        ? new Date(options.batasWaktu).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
        : '14 Hari Kerja setelah pengumuman';

    return `*PENGUMUMAN HASIL SELEKSI PENERIMAAN SANTRI BARU*
*${settings.namaPonpes?.toUpperCase()}*
Tahun Ajaran ${settings.psbConfig?.tahunAjaranAktif || new Date().getFullYear()}

Assalamu'alaikum Warahmatullahi Wabarakatuh,
Yth. Bapak/Ibu Wali dari:
*${pendaftar.namaLengkap}*

Alhamdulillah, bersyukur kepada Allah SWT, kami menginformasikan bahwa ananda dinyatakan:

🎉 *LULUS SELEKSI / DITERIMA* 🎉
Sebagai Santri Baru di *${settings.namaPonpes}*
• No. Registrasi: *${noReg}*
• Jenjang: *${jenjang}*
• Jalur: *${pendaftar.jalurPendaftaran || 'Reguler'}*

📝 *Informasi Daftar Ulang & Administrasi:*
• Biaya Daftar Ulang / Pangkal: *${nominalStr}*
• Batas Waktu Daftar Ulang: *${batasStr}*
${options?.rekeningPembayaran ? `• Rekening Tujuan: *${options.rekeningPembayaran}*\n` : ''}
${options?.catatan ? `_Catatan Khusus:_ ${options.catatan}\n\n` : ''}Silakan mengonfirmasi pembayaran dan berkas administrasi daftar ulang ke panitia PSB. Kami menyambut kehadiran ananda dengan hangat di keluarga besar pesantren.

Wassalamu'alaikum Warahmatullahi Wabarakatuh.
_Panitia Penerimaan Santri Baru (PSB)_
*${settings.namaPonpes}*
${settings.telepon ? `📞 Kontak: ${settings.telepon}` : ''}`;
};

export interface PsbFieldGroupDef {
    title: string;
    fields: {
        key: string;
        label: string;
        type?: 'text' | 'date' | 'select' | 'markdown' | 'number';
        options?: string[];
        isFullWidth?: boolean;
    }[];
}

export const PSB_STANDARD_FIELD_GROUPS: PsbFieldGroupDef[] = [
    {
        title: 'Identitas Calon Santri',
        fields: [
            { key: 'namaLengkap', label: 'Nama Lengkap (Sesuai Ijazah/Akta)', isFullWidth: true },
            { key: 'namaHijrah', label: 'Nama Panggilan / Nama Hijrah' },
            { key: 'nisn', label: 'NISN (10 Digit)' },
            { key: 'nik', label: 'NIK Santri (16 Digit Sesuai KK)' },
            { key: 'jenisKelamin', label: 'Jenis Kelamin', type: 'select', options: ['Laki-laki', 'Perempuan'] },
            { key: 'tempatLahir', label: 'Tempat Lahir' },
            { key: 'tanggalLahir', label: 'Tanggal Lahir', type: 'date' },
            { key: 'kewarganegaraan', label: 'Kewarganegaraan', type: 'select', options: ['WNI', 'WNA', 'Keturunan'] },
            { key: 'agama', label: 'Agama', type: 'select', options: ['Islam', 'Lainnya'] },
            { key: 'golonganDarah', label: 'Golongan Darah', type: 'select', options: ['A', 'B', 'AB', 'O', 'Tidak Tahu'] },
            { key: 'statusKeluarga', label: 'Status dalam Keluarga', type: 'select', options: ['Anak Kandung', 'Anak Yatim', 'Anak Piatu', 'Anak Yatim Piatu', 'Anak Angkat', 'Anak Asuh', 'Anak Tiri'] },
            { key: 'anakKe', label: 'Anak Ke-', type: 'number' },
            { key: 'jumlahSaudara', label: 'Jumlah Saudara Kandung/Tiri', type: 'number' },
            { key: 'citaCita', label: 'Cita-Cita Santri' },
            { key: 'hobi', label: 'Hobi / Minat Santri' },
        ]
    },
    {
        title: 'Alamat Domisili & Kontak Santri',
        fields: [
            { key: 'alamat', label: 'Alamat Jalan, RT/RW, Dusun', isFullWidth: true },
            { key: 'desaKelurahan', label: 'Desa / Kelurahan' },
            { key: 'kecamatan', label: 'Kecamatan' },
            { key: 'kabupatenKota', label: 'Kabupaten / Kota' },
            { key: 'provinsi', label: 'Provinsi' },
            { key: 'kodePos', label: 'Kode Pos (5 Digit)' },
            { key: 'telepon', label: 'No. HP / WhatsApp Santri (Jika Ada)' },
            { key: 'jarakKePondok', label: 'Jarak Domisili ke Pondok (Contoh: < 1 km, 5 km, 20 km)' },
        ]
    },
    {
        title: 'Kondisi Fisik & Riwayat Kesehatan',
        fields: [
            { key: 'tinggiBadan', label: 'Tinggi Badan (cm)', type: 'number' },
            { key: 'beratBadan', label: 'Berat Badan (kg)', type: 'number' },
            { key: 'riwayatPenyakit', label: 'Riwayat Penyakit Menahun / Alergi', isFullWidth: true },
            { key: 'berkebutuhanKhusus', label: 'Kebutuhan Khusus / Catatan Medis Khusus', isFullWidth: true },
        ]
    },
    {
        title: 'Data Ayah Kandung',
        fields: [
            { key: 'namaAyah', label: 'Nama Lengkap Ayah' },
            { key: 'nikAyah', label: 'NIK Ayah (16 Digit)' },
            { key: 'statusAyah', label: 'Status Ayah (Hidup / Meninggal / Cerai)', type: 'select', options: ['Hidup', 'Meninggal', 'Cerai'] },
            { key: 'pekerjaanAyah', label: 'Pekerjaan Ayah' },
            { key: 'pendidikanAyah', label: 'Pendidikan Terakhir Ayah', type: 'select', options: ['SD/MI', 'SMP/MTs', 'SMA/MA/SMK', 'Diploma', 'S1', 'S2', 'S3', 'Pondok Pesantren', 'Tidak/Belum Sekolah'] },
            { key: 'penghasilanAyah', label: 'Penghasilan Rata-rata Ayah / Bulan', type: 'select', options: ['< Rp 1.000.000', 'Rp 1.000.000 - Rp 2.500.000', 'Rp 2.500.000 - Rp 5.000.000', '> Rp 5.000.000', 'Tidak Berpenghasilan'] },
            { key: 'teleponAyah', label: 'No. HP / WhatsApp Aktif Ayah' },
            { key: 'tempatLahirAyah', label: 'Tempat Lahir Ayah' },
            { key: 'tanggalLahirAyah', label: 'Tanggal Lahir Ayah', type: 'date' },
        ]
    },
    {
        title: 'Data Ibu Kandung',
        fields: [
            { key: 'namaIbu', label: 'Nama Lengkap Ibu' },
            { key: 'nikIbu', label: 'NIK Ibu (16 Digit)' },
            { key: 'statusIbu', label: 'Status Ibu (Hidup / Meninggal / Cerai)', type: 'select', options: ['Hidup', 'Meninggal', 'Cerai'] },
            { key: 'pekerjaanIbu', label: 'Pekerjaan Ibu' },
            { key: 'pendidikanIbu', label: 'Pendidikan Terakhir Ibu', type: 'select', options: ['SD/MI', 'SMP/MTs', 'SMA/MA/SMK', 'Diploma', 'S1', 'S2', 'S3', 'Pondok Pesantren', 'Tidak/Belum Sekolah'] },
            { key: 'penghasilanIbu', label: 'Penghasilan Rata-rata Ibu / Bulan', type: 'select', options: ['< Rp 1.000.000', 'Rp 1.000.000 - Rp 2.500.000', 'Rp 2.500.000 - Rp 5.000.000', '> Rp 5.000.000', 'Tidak Berpenghasilan (IRT)'] },
            { key: 'teleponIbu', label: 'No. HP / WhatsApp Aktif Ibu' },
            { key: 'tempatLahirIbu', label: 'Tempat Lahir Ibu' },
            { key: 'tanggalLahirIbu', label: 'Tanggal Lahir Ibu', type: 'date' },
        ]
    },
    {
        title: 'Data Wali Murid (Jika Berbeda dari Orang Tua)',
        fields: [
            { key: 'namaWali', label: 'Nama Lengkap Wali' },
            { key: 'nikWali', label: 'NIK Wali (16 Digit)' },
            { key: 'nomorHpWali', label: 'No. HP / WhatsApp Wali' },
            { key: 'hubunganWali', label: 'Hubungan dengan Santri', type: 'select', options: ['Kakek/Nenek', 'Paman/Bibi', 'Kakak Kandung', 'Orang Tua Asuh', 'Orang Tua Angkat', 'Lainnya'] },
            { key: 'pekerjaanWali', label: 'Pekerjaan Wali' },
            { key: 'pendidikanWali', label: 'Pendidikan Terakhir Wali' },
            { key: 'penghasilanWali', label: 'Penghasilan Wali / Bulan' },
        ]
    },
    {
        title: 'Pendidikan Asal & Pilihan Program Santri',
        fields: [
            { key: 'asalSekolah', label: 'Nama Sekolah / Madrasah Sebelumnya' },
            { key: 'alamatSekolahAsal', label: 'Alamat Sekolah / Madrasah Sebelumnya' },
            { key: 'nomorIjazahSebelumnya', label: 'Nomor Ijazah / SKL Terakhir' },
            { key: 'tahunLulusSebelumnya', label: 'Tahun Kelulusan (Contoh: 2024)', type: 'number' },
            { key: 'jalurPendaftaran', label: 'Jalur Pendaftaran', type: 'select', options: ['Reguler', 'Prestasi Akademik/Non-Akademik', 'Tahfizh Al-Qur\'an', 'Beasiswa Yatim/Dhuafa', 'Pindahan'] },
            { key: 'jenisSantri', label: 'Status Mukim Santri', type: 'select', options: ['Mondok - Baru', 'Laju - Baru', 'Mondok - Pindahan', 'Laju - Pindahan'] },
            { key: 'targetJuz', label: 'Target Hafalan Al-Qur\'an (Juz)', type: 'number' },
            { key: 'catatan', label: 'Catatan Khusus / Pesan Orang Tua (Mendukung Markdown)', type: 'markdown', isFullWidth: true },
        ]
    },
];

export const PSB_DEFAULT_FIELD_HINTS: Record<string, string> = {
    namaLengkap: 'Isi nama lengkap calon santri sesuai ijazah terakhir / akta kelahiran resmi',
    namaHijrah: 'Nama panggilan akrab sehari-hari di rumah atau sebutan hijrah di pondok',
    nisn: '10 digit Nomor Induk Siswa Nasional dari Kementerian Pendidikan / Kemenag',
    nik: '16 digit NIK santri sesuai Kartu Keluarga (KK)',
    jenisKelamin: 'Pilih jenis kelamin calon santri',
    tempatLahir: 'Kota atau Kabupaten tempat lahir sesuai akta kelahiran',
    tanggalLahir: 'Pilih tanggal, bulan, dan tahun lahir calon santri melalui pemilih tanggal',
    kewarganegaraan: 'WNI (Warga Negara Indonesia), WNA, atau Keturunan',
    agama: 'Agama yang dianut calon santri',
    golonganDarah: 'Golongan darah calon santri: A, B, AB, atau O',
    statusKeluarga: 'Contoh: Anak Kandung, Yatim, Piatu, Yatim Piatu, Anak Angkat, dll.',
    anakKe: 'Urutan kelahiran anak dalam susunan keluarga kandung (angka)',
    jumlahSaudara: 'Total jumlah saudara kandung / tiri (angka)',
    citaCita: 'Cita-cita atau profesi impian santri di masa depan',
    hobi: 'Kegemaran atau aktivitas positif yang diminati',
    alamat: 'Nama jalan, gang, nomor rumah, RT/RW atau dusun tempat tinggal saat ini',
    desaKelurahan: 'Nama kelurahan atau desa domisili saat ini',
    kecamatan: 'Kecamatan tempat tinggal saat ini',
    kabupatenKota: 'Kabupaten atau Kota domisili saat ini',
    provinsi: 'Provinsi domisili tempat tinggal saat ini',
    kodePos: '5 digit kode pos domisili',
    telepon: 'Nomor HP atau WhatsApp calon santri jika memiliki ponsel pribadi',
    jarakKePondok: 'Perkiraan jarak dari rumah ke pesantren (contoh: < 1 km, 5 km, 20 km)',
    tinggiBadan: 'Tinggi badan calon santri dalam satuan centimeter (cm)',
    beratBadan: 'Berat badan calon santri dalam satuan kilogram (kg)',
    riwayatPenyakit: 'Riwayat alergi, asma, riwayat operasi, atau penyakit yang perlu penanganan khusus',
    berkebutuhanKhusus: 'Isi jika santri memerlukan pendampingan belajar atau fasilitas khusus',
    namaAyah: 'Nama lengkap ayah kandung (sesuai KTP / KK)',
    nikAyah: '16 digit NIK ayah kandung sesuai Kartu Keluarga',
    statusAyah: 'Pilih status: Masih Hidup, Meninggal Dunia, atau Cerai',
    pekerjaanAyah: 'Contoh: PNS, Guru, Wiraswasta, Petani, Karyawan, TNI/Polri',
    pendidikanAyah: 'Tingkat pendidikan formal terakhir yang ditempuh ayah',
    penghasilanAyah: 'Perkiraan rentang penghasilan rata-rata ayah per bulan',
    teleponAyah: 'Nomor WhatsApp aktif ayah untuk konfirmasi seleksi dan pengumuman',
    tempatLahirAyah: 'Kota / Kabupaten tempat kelahiran ayah',
    tanggalLahirAyah: 'Tanggal, bulan, dan tahun lahir ayah kandung',
    namaIbu: 'Nama lengkap ibu kandung sesuai KTP / Kartu Keluarga',
    nikIbu: '16 digit NIK ibu kandung sesuai Kartu Keluarga',
    statusIbu: 'Pilih status: Masih Hidup, Meninggal Dunia, atau Cerai',
    pekerjaanIbu: 'Pekerjaan ibu saat ini (atau Ibu Rumah Tangga / IRT)',
    pendidikanIbu: 'Tingkat pendidikan formal terakhir yang ditempuh ibu',
    penghasilanIbu: 'Perkiraan rentang penghasilan rata-rata ibu per bulan (atau Rp 0 jika IRT)',
    teleponIbu: 'Nomor WhatsApp aktif ibu untuk koordinasi panitia PSB',
    tempatLahirIbu: 'Kota / Kabupaten tempat kelahiran ibu',
    tanggalLahirIbu: 'Tanggal, bulan, dan tahun lahir ibu kandung',
    namaWali: 'Nama lengkap wali jika calon santri tinggal / diasuh bersama wali',
    nikWali: '16 digit NIK wali sesuai KTP / KK',
    nomorHpWali: 'Nomor WhatsApp aktif wali murid yang bisa dihubungi pihak pondok',
    hubunganWali: 'Hubungan kekerabatan wali dengan santri (Paman, Kakek, Kakak, dll.)',
    pekerjaanWali: 'Profesi / pekerjaan utama wali murid saat ini',
    pendidikanWali: 'Pendidikan terakhir wali murid',
    penghasilanWali: 'Penghasilan rata-rata per bulan wali murid',
    asalSekolah: 'Nama sekolah atau madrasah sebelumnya (misal: SD Negeri 1 / MI Al-Hikmah)',
    alamatSekolahAsal: 'Alamat lengkap atau kota sekolah/madrasah asal calon santri',
    nomorIjazahSebelumnya: 'Nomor seri ijazah terakhir atau surat keterangan lulus (SKL)',
    tahunLulusSebelumnya: 'Tahun kelulusan di jenjang pendidikan sebelumnya (contoh: 2024)',
    jalurPendaftaran: 'Pilih jalur seleksi: Reguler, Prestasi, Tahfizh, Beasiswa, atau Pindahan',
    jenisSantri: 'Pilih status mukim santri di pondok: Mondok (Asrama Penuh) atau Laju (Pulang Pergi)',
    targetJuz: 'Target capaian hafalan Al-Qur\'an yang ingin diselesaikan selama belajar di pondok',
    catatan: 'Catatan pesan, harapan orang tua, atau informasi penting lainnya (mendukung format Markdown seperti tebal, miring, poin, dan kutipan)',
};

export const PSB_ALL_STANDARD_FIELD_KEYS: string[] = PSB_STANDARD_FIELD_GROUPS.flatMap(g => g.fields.map(f => f.key));

