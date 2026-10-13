import { Pendaftar, PondokSettings, PsbCustomField, PsbNilaiUjian } from '../../../types';

/**
 * Collects all configured PSB custom fields from active psbConfig and saved templates
 * (prioritizing templates matching the applicant's jenjangId if provided).
 */
export const getAllConfiguredCustomFields = (
    settings?: PondokSettings,
    jenjangId?: number
): PsbCustomField[] => {
    if (!settings?.psbConfig) return [];
    const result: PsbCustomField[] = [];
    const seenIds = new Set<string>();

    const addFields = (fields?: PsbCustomField[]) => {
        if (!Array.isArray(fields)) return;
        for (const f of fields) {
            if (!f || !f.id) continue;
            if (!seenIds.has(f.id)) {
                seenIds.add(f.id);
                result.push(f);
            }
        }
    };

    // 1. Prioritize templates matching jenjangId
    if (jenjangId && Array.isArray(settings.psbConfig.templates)) {
        for (const tpl of settings.psbConfig.templates) {
            if (tpl.targetJenjangId === jenjangId) {
                addFields(tpl.customFields);
            }
        }
    }

    // 2. Active customFields in psbConfig
    addFields(settings.psbConfig.customFields);

    // 3. Remaining templates as fallback lookup for older/other-jenjang submissions
    if (Array.isArray(settings.psbConfig.templates)) {
        for (const tpl of settings.psbConfig.templates) {
            addFields(tpl.customFields);
        }
    }

    return result;
};

/**
 * Resolves any customData key (such as 'custom_field_1791259609262[]', 'field_1791259609262',
 * 'custom field 1791259609262[]', 'docs[]', etc.) into its human-readable question label.
 */
export const resolveCustomFieldLabel = (
    rawKey: string,
    settings?: PondokSettings,
    jenjangId?: number,
    valHint?: any
): string => {
    if (!rawKey) return 'Data Tambahan';
    const trimmed = String(rawKey).trim();

    if (/^docs(\[\])?$/i.test(trimmed)) {
        return 'Checklist Berkas Persyaratan';
    }

    const isStatusSuffix = /(_status|\s+status)$/i.test(trimmed);

    // Normalize away 'custom_', 'custom ', trailing '[]', and trailing '_status'
    const stripped = trimmed
        .replace(/^custom[_\s]+/i, '')
        .replace(/(\[\])+$/g, '')
        .replace(/(_status|\s+status)$/i, '')
        .trim();

    // Extract numeric timestamp if key is like 'field_1791259609262' or 'field 1791259609262' or '1791259609262'
    const timestampMatch = stripped.match(/^(?:field[_\s]*)?(\d{10,})$/i);
    const numericId = timestampMatch ? timestampMatch[1] : null;
    const normalizedFieldId = numericId ? `field_${numericId}` : stripped.replace(/\s+/g, '_');

    const allFields = getAllConfiguredCustomFields(settings, jenjangId);
    if (allFields.length > 0) {
        const matched = allFields.find(f => {
            if (!f.id) return false;
            const fId = String(f.id).trim();
            const fNum = fId.replace(/^field[_\s]*/i, '');
            if (fId === stripped || fId === normalizedFieldId) return true;
            if (numericId && (fNum === numericId || fId === numericId)) return true;
            if (f.label && f.label.trim().toLowerCase() === stripped.toLowerCase()) return true;
            return false;
        });
        if (matched && matched.label && matched.label.trim()) {
            return isStatusSuffix ? `${matched.label.trim()} (Status Berkas)` : matched.label.trim();
        }
    }

    // If it was an unresolved generated ID (e.g. field_1791259609262 whose template was deleted)
    if (numericId) {
        const isFileVal =
            typeof valHint === 'string' &&
            (valHint.startsWith('http://') || valHint.startsWith('https://') || valHint.startsWith('data:'));
        const shortId = numericId.slice(-4);
        return isFileVal
            ? `Dokumen / Berkas Lampiran (#${shortId})`
            : `Pertanyaan Tambahan (#${shortId})`;
    }

    // Otherwise format human-readable key cleanly without 'custom_' or '[]'
    return stripped
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/_/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/^./, str => str.toUpperCase())
        .trim() || 'Data Tambahan';
};

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
    if (!trimmed) return '';

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

export const PSB_PENDIDIKAN_OPTIONS: string[] = [
    'Tidak Sekolah',
    'SD/Sederajat',
    'SMP/Sederajat',
    'SMA/Sederajat',
    'D1-D3',
    'S1/D4',
    'S2',
    'S3',
    'Pesantren'
];

export const PSB_PENGHASILAN_OPTIONS: string[] = [
    'Tidak Berpenghasilan',
    '< Rp 1.000.000',
    'Rp 1.000.000 - Rp 2.500.000',
    'Rp 2.500.000 - Rp 5.000.000',
    'Rp 5.000.000 - Rp 10.000.000',
    '> Rp 10.000.000'
];

export const PSB_PEKERJAAN_OPTIONS: string[] = [
    'Tidak Bekerja / IRT',
    'PNS/TNI/Polri',
    'Guru/Dosen',
    'Pegawai Swasta',
    'Wiraswasta/Pedagang',
    'Petani/Peternak',
    'Nelayan',
    'Buruh (Tani/Pabrik/Bangunan)',
    'Dokter/Bidan/Perawat',
    'Sopir/Masinis/Kondektur',
    'Pensiunan',
    'Pengacara/Hakim/Jaksa/Notaris',
    'Seniman/Pelukis/Artis',
    'Pilot/Pramugari',
    'Politikus',
    'Lainnya'
];

export const withCurrentOption = (options: string[], currentVal?: string | null): string[] => {
    const trimmed = currentVal ? String(currentVal).trim() : '';
    if (!trimmed) return options;
    if (options.includes(trimmed)) return options;
    return [trimmed, ...options];
};

export const normalizePendidikanValue = (val?: any): string => {
    if (val === undefined || val === null) return '';
    const s = String(val).trim();
    if (!s) return '';
    if (PSB_PENDIDIKAN_OPTIONS.includes(s)) return s;
    const lower = s.toLowerCase().replace(/\s+/g, ' ');
    if (['tidak sekolah', 'tidak/belum sekolah', 'belum sekolah', '-'].includes(lower)) return 'Tidak Sekolah';
    if (['sd', 'mi', 'sd/mi', 'sd / mi', 'sd/sederajat', 'paket a'].includes(lower)) return 'SD/Sederajat';
    if (['smp', 'mts', 'smp/mts', 'smp / mts', 'sltp', 'sltp/sederajat', 'smp/sederajat', 'paket b'].includes(lower)) return 'SMP/Sederajat';
    if (['sma', 'smk', 'ma', 'sma/smk', 'sma/ma', 'sma/ma/smk', 'slta', 'slta/sederajat', 'sma/sederajat', 'paket c', 'aliyah'].includes(lower)) return 'SMA/Sederajat';
    if (['d1', 'd2', 'd3', 'd1-d3', 'd1/d2/d3', 'diploma', 'akademi'].includes(lower)) return 'D1-D3';
    if (['s1', 'd4', 's1/d4', 'd4/s1', 'sarjana', 'strata 1'].includes(lower)) return 'S1/D4';
    if (['s2', 'magister', 'strata 2', 'pascasarjana'].includes(lower)) return 'S2';
    if (['s3', 'doktor', 'strata 3'].includes(lower)) return 'S3';
    if (['pesantren', 'pondok pesantren', 'salafiyah', 'nyantri'].includes(lower)) return 'Pesantren';
    return s;
};

export const normalizePenghasilanValue = (val?: any): string => {
    if (val === undefined || val === null) return '';
    const s = String(val).trim();
    if (!s) return '';
    if (PSB_PENGHASILAN_OPTIONS.includes(s)) return s;
    const lower = s.toLowerCase().replace(/\s+/g, ' ');
    if (
        lower.includes('tidak berpenghasilan') ||
        lower === 'tidak ada' ||
        lower === 'irt' ||
        lower === '0' ||
        lower === 'rp 0' ||
        lower === 'rp. 0' ||
        lower === '-'
    ) {
        return 'Tidak Berpenghasilan';
    }
    if (lower === '< rp 500.000' || lower === 'rp 500.000 - rp 999.999' || lower.includes('< rp 1.000.000') || lower.includes('< 1 juta') || lower.includes('dibawah 1 juta')) {
        return '< Rp 1.000.000';
    }
    if (lower === '1 - 2 juta' || lower === 'rp 1.000.000 - rp 1.999.999' || lower.includes('1.000.000 - rp 2.500.000') || lower.includes('1.000.000 - 2.500.000')) {
        return 'Rp 1.000.000 - Rp 2.500.000';
    }
    if (lower === '2 - 5 juta' || lower === 'rp 2.000.000 - rp 4.999.999' || lower.includes('2.500.000 - rp 5.000.000') || lower.includes('2.500.000 - 5.000.000')) {
        return 'Rp 2.500.000 - Rp 5.000.000';
    }
    if (lower === '> 5 juta' || lower === '> rp 5.000.000' || lower === 'rp 5.000.000 - rp 20.000.000' || lower.includes('5.000.000 - rp 10.000.000') || lower.includes('5.000.000 - 10.000.000')) {
        return 'Rp 5.000.000 - Rp 10.000.000';
    }
    if (lower === '> rp 20.000.000' || lower.includes('> rp 10.000.000') || lower.includes('> 10.000.000') || lower.includes('diatas 10 juta')) {
        return '> Rp 10.000.000';
    }
    // Check if pure number (e.g. "3000000" or "Rp 3.000.000")
    const digitsOnly = s.replace(/[^0-9]/g, '');
    if (digitsOnly && !s.includes('-') && !s.includes('<') && !s.includes('>')) {
        const num = Number(digitsOnly);
        if (!isNaN(num)) {
            if (num === 0) return 'Tidak Berpenghasilan';
            if (num > 0 && num < 1000000) return '< Rp 1.000.000';
            if (num >= 1000000 && num <= 2500000) return 'Rp 1.000.000 - Rp 2.500.000';
            if (num > 2500000 && num <= 5000000) return 'Rp 2.500.000 - Rp 5.000.000';
            if (num > 5000000 && num <= 10000000) return 'Rp 5.000.000 - Rp 10.000.000';
            if (num > 10000000) return '> Rp 10.000.000';
        }
    }
    return s;
};

export const normalizePekerjaanValue = (val?: any): string => {
    if (val === undefined || val === null) return '';
    const s = String(val).trim();
    if (!s) return '';
    if (PSB_PEKERJAAN_OPTIONS.includes(s)) return s;
    const lower = s.toLowerCase().replace(/\s+/g, ' ');
    if (['tidak bekerja', 'irt', 'ibu rumah tangga', 'mengurus rumah tangga', 'tidak bekerja / irt', 'belum bekerja', '-'].includes(lower)) {
        return 'Tidak Bekerja / IRT';
    }
    if (['pns', 'asn', 'tni', 'polri', 'pns/tni/polri', 'pns / tni / polri', 'pegawai negeri', 'pegawai negeri sipil'].includes(lower)) {
        return 'PNS/TNI/Polri';
    }
    if (['guru', 'dosen', 'guru/dosen', 'guru / dosen', 'pengajar', 'ustadz', 'ustadzah'].includes(lower)) {
        return 'Guru/Dosen';
    }
    if (['pegawai swasta', 'karyawan swasta', 'karyawan', 'swasta', 'pegawai'].includes(lower)) {
        return 'Pegawai Swasta';
    }
    if (['wiraswasta', 'pedagang', 'wirausaha', 'usaha sendiri', 'dagang', 'pengusaha', 'wiraswasta/pedagang', 'wiraswasta / pedagang'].includes(lower)) {
        return 'Wiraswasta/Pedagang';
    }
    if (['petani', 'peternak', 'pekebun', 'tani', 'petani/peternak', 'petani / peternak'].includes(lower)) {
        return 'Petani/Peternak';
    }
    if (['nelayan'].includes(lower)) {
        return 'Nelayan';
    }
    if (['buruh', 'buruh harian', 'buruh harian lepas', 'buruh tani', 'buruh pabrik', 'buruh bangunan', 'kuli', 'buruh (tani/pabrik/bangunan)'].includes(lower)) {
        return 'Buruh (Tani/Pabrik/Bangunan)';
    }
    if (['dokter', 'bidan', 'perawat', 'nakes', 'tenaga medis', 'dokter/bidan/perawat'].includes(lower)) {
        return 'Dokter/Bidan/Perawat';
    }
    if (['sopir', 'supir', 'driver', 'masinis', 'kondektur', 'ojek', 'kurir', 'sopir/masinis/kondektur'].includes(lower)) {
        return 'Sopir/Masinis/Kondektur';
    }
    if (['pensiunan', 'pensiun'].includes(lower)) {
        return 'Pensiunan';
    }
    return s;
};

/**
 * Automatically heals a Pendaftar record by extracting any standard Pendaftar fields
 * (such as physical data: tinggiBadan, beratBadan, golonganDarah, riwayatPenyakit,
 * parent data: namaAyah, teleponAyah, namaIbu, teleponIbu, etc.) that were trapped
 * inside `customData` ("Data Tambahan") and promoting them to top-level Pendaftar properties,
 * while normalizing phone numbers.
 */
export const healPendaftarRecordWithDetails = (
    raw: any,
    settings?: PondokSettings
): {
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

    // Unwrap nested customObj.customData if it was double-wrapped during Google Sheet sync
    if (customObj.customData !== undefined) {
        try {
            const inner = typeof customObj.customData === 'string'
                ? JSON.parse(customObj.customData)
                : customObj.customData;
            if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
                customObj = { ...inner, ...customObj };
            }
        } catch {
            // ignore invalid inner JSON
        }
        delete customObj.customData;
        changed = true;
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
        namalengkapayah: 'namaAyah',
        nikayah: 'nikAyah',
        statusayah: 'statusAyah',
        tempatlahirayah: 'tempatLahirAyah',
        tanggallahirayah: 'tanggalLahirAyah',
        pendidikanayah: 'pendidikanAyah',
        pendidikanterakhirayah: 'pendidikanAyah',
        pendidikanbapak: 'pendidikanAyah',
        pendidikanabi: 'pendidikanAyah',
        pendidikanortu: 'pendidikanAyah',
        pendidikanorangtua: 'pendidikanAyah',
        pekerjaanayah: 'pekerjaanAyah',
        pekerjaanbapak: 'pekerjaanAyah',
        pekerjaanabi: 'pekerjaanAyah',
        pekerjaanortu: 'pekerjaanAyah',
        pekerjaanorangtua: 'pekerjaanAyah',
        profesiayah: 'pekerjaanAyah',
        profesiorangtua: 'pekerjaanAyah',
        penghasilanayah: 'penghasilanAyah',
        penghasilanratarataayahbulan: 'penghasilanAyah',
        penghasilanayahbulan: 'penghasilanAyah',
        penghasilanperbulanayah: 'penghasilanAyah',
        penghasilanbapak: 'penghasilanAyah',
        penghasilanabi: 'penghasilanAyah',
        penghasilanortu: 'penghasilanAyah',
        penghasilanorangtua: 'penghasilanAyah',
        gajiayah: 'penghasilanAyah',
        gajibapak: 'penghasilanAyah',
        pendapatanayah: 'penghasilanAyah',
        teleponayah: 'teleponAyah',
        nohpayah: 'teleponAyah',
        waayah: 'teleponAyah',
        namaibu: 'namaIbu',
        namalengkapibu: 'namaIbu',
        nikibu: 'nikIbu',
        statusibu: 'statusIbu',
        tempatlahiribu: 'tempatLahirIbu',
        tanggallahiribu: 'tanggalLahirIbu',
        pendidikanibu: 'pendidikanIbu',
        pendidikanterakhiribu: 'pendidikanIbu',
        pendidikanummi: 'pendidikanIbu',
        pekerjaanibu: 'pekerjaanIbu',
        pekerjaanummi: 'pekerjaanIbu',
        profesiibu: 'pekerjaanIbu',
        penghasilanibu: 'penghasilanIbu',
        penghasilanratarataibubulan: 'penghasilanIbu',
        penghasilanibubulan: 'penghasilanIbu',
        penghasilanperbulanibu: 'penghasilanIbu',
        penghasilanummi: 'penghasilanIbu',
        gajiibu: 'penghasilanIbu',
        pendapatanibu: 'penghasilanIbu',
        teleponibu: 'teleponIbu',
        nohpibu: 'teleponIbu',
        waibu: 'teleponIbu',
        namawali: 'namaWali',
        namalengkapwali: 'namaWali',
        nikwali: 'nikWali',
        hubunganwali: 'statusWali',
        hubungandengansantri: 'statusWali',
        statuswali: 'statusWali',
        nomorhpwali: 'nomorHpWali',
        nohpwali: 'nomorHpWali',
        teleponwali: 'nomorHpWali',
        teleponwa: 'nomorHpWali',
        nohpwhatsapp: 'nomorHpWali',
        nomorwhatsapp: 'nomorHpWali',
        alamatwali: 'alamatWali',
        pekerjaan: 'pekerjaanWali',
        profesi: 'pekerjaanWali',
        pekerjaanwali: 'pekerjaanWali',
        pekerjaanwalimurid: 'pekerjaanWali',
        profesiwali: 'pekerjaanWali',
        pendidikan: 'pendidikanWali',
        pendidikanterakhir: 'pendidikanWali',
        pendidikanwali: 'pendidikanWali',
        pendidikanterakhirwali: 'pendidikanWali',
        pendidikanwalimurid: 'pendidikanWali',
        penghasilan: 'penghasilanWali',
        penghasilanwali: 'penghasilanWali',
        penghasilanwalibulan: 'penghasilanWali',
        penghasilanperbulanwali: 'penghasilanWali',
        penghasilanrataratawalibulan: 'penghasilanWali',
        penghasilanwalimurid: 'penghasilanWali',
        gaji: 'penghasilanWali',
        gajiwali: 'penghasilanWali',
        pendapatan: 'penghasilanWali',
        pendapatanwali: 'penghasilanWali',
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

    // Promote any top-level alias keys (e.g. hubunganWali, Pekerjaan Ayah, etc.) onto canonical Pendaftar props
    for (const topKey of Object.keys(healed)) {
        if (topKey === 'customData' || topKey === 'alamat') continue;
        const topVal = healed[topKey];
        if (topVal === undefined || topVal === null || topVal === '') continue;
        const normTop = topKey.toLowerCase().replace(/^custom_/, '').replace(/[^a-z0-9]/g, '');
        const targetProp = aliasMap[normTop];
        if (targetProp && targetProp !== topKey && targetProp !== 'alamatRumah') {
            const currentVal = healed[targetProp];
            const isEmptyCurrent = currentVal === undefined || currentVal === null || currentVal === '' || currentVal === 0;
            if (isEmptyCurrent) {
                if (numericFields.has(targetProp)) {
                    const num = parseNumeric(topVal);
                    if (num !== undefined) healed[targetProp] = num;
                } else {
                    healed[targetProp] = String(topVal).trim();
                }
                changed = true;
            }
        }
    }

    const allConfiguredFields = getAllConfiguredCustomFields(settings, healed.jenjangId);

    for (const key of Object.keys(customObj)) {
        let val = customObj[key];
        if (Array.isArray(val)) {
            val = val.filter(Boolean).join(', ');
            customObj[key] = val;
            changed = true;
        }
        const isFileLink = typeof val === 'string' && (val.startsWith('data:') || val.startsWith('http'));

        if (!isFileLink) {
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
                continue;
            }
        }

        // Normalize custom_field_xxx[] or docs[] keys if we can resolve them to a configured question label
        if (/^docs(\[\])?$/i.test(key.trim())) {
            const cleanLabel = 'Checklist Berkas Persyaratan';
            if (key !== cleanLabel) {
                customObj[cleanLabel] = val;
                delete customObj[key];
                changed = true;
            }
            continue;
        }

        if (allConfiguredFields.length > 0) {
            const resolvedLabel = resolveCustomFieldLabel(key, settings, healed.jenjangId, val);
            // Only replace key if it matched a real configured label (not a generic fallback with (#xxxx))
            if (resolvedLabel && resolvedLabel !== key && !/\(#\d{4}\)$/.test(resolvedLabel)) {
                if (customObj[resolvedLabel] === undefined) {
                    customObj[resolvedLabel] = val;
                }
                delete customObj[key];
                changed = true;
            }
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

    // Normalize pendidikan, penghasilan, and pekerjaan for Ayah, Ibu, and Wali
    for (const pendKey of ['pendidikanAyah', 'pendidikanIbu', 'pendidikanWali'] as const) {
        if (healed[pendKey]) {
            const norm = normalizePendidikanValue(healed[pendKey]);
            if (norm !== healed[pendKey]) {
                healed[pendKey] = norm;
                changed = true;
            }
        }
    }
    for (const pengKey of ['penghasilanAyah', 'penghasilanIbu', 'penghasilanWali'] as const) {
        if (healed[pengKey]) {
            const norm = normalizePenghasilanValue(healed[pengKey]);
            if (norm !== healed[pengKey]) {
                healed[pengKey] = norm;
                changed = true;
            }
        }
    }
    for (const pekKey of ['pekerjaanAyah', 'pekerjaanIbu', 'pekerjaanWali'] as const) {
        if (healed[pekKey]) {
            const norm = normalizePekerjaanValue(healed[pekKey]);
            if (norm !== healed[pekKey]) {
                healed[pekKey] = norm;
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
            if (!healed.statusWali) {
                healed.statusWali = healed.namaAyah ? 'Ayah Kandung' : 'Ibu Kandung';
            }
            changed = true;
        }
    }

    // If Wali is Ayah or Ibu (or defaulted from Ayah/Ibu), fill missing Wali pekerjaan/pendidikan/penghasilan
    const waliNameClean = String(healed.namaWali || '').trim().toLowerCase();
    const ayahNameClean = String(healed.namaAyah || '').trim().toLowerCase();
    const ibuNameClean = String(healed.namaIbu || '').trim().toLowerCase();
    const isWaliAyah =
        healed.statusWali === 'Ayah Kandung' ||
        (waliNameClean && ayahNameClean && waliNameClean === ayahNameClean);
    const isWaliIbu =
        !isWaliAyah &&
        (healed.statusWali === 'Ibu Kandung' ||
            (waliNameClean && ibuNameClean && waliNameClean === ibuNameClean));

    if (isWaliAyah) {
        if (!healed.statusWali) { healed.statusWali = 'Ayah Kandung'; changed = true; }
        if (!healed.nikWali && healed.nikAyah) { healed.nikWali = healed.nikAyah; changed = true; }
        if (!healed.nikAyah && healed.nikWali) { healed.nikAyah = healed.nikWali; changed = true; }
        if (!healed.pekerjaanWali && healed.pekerjaanAyah) { healed.pekerjaanWali = healed.pekerjaanAyah; changed = true; }
        if (!healed.pekerjaanAyah && healed.pekerjaanWali) { healed.pekerjaanAyah = healed.pekerjaanWali; changed = true; }
        if (!healed.pendidikanWali && healed.pendidikanAyah) { healed.pendidikanWali = healed.pendidikanAyah; changed = true; }
        if (!healed.pendidikanAyah && healed.pendidikanWali) { healed.pendidikanAyah = healed.pendidikanWali; changed = true; }
        if (!healed.penghasilanWali && healed.penghasilanAyah) { healed.penghasilanWali = healed.penghasilanAyah; changed = true; }
        if (!healed.penghasilanAyah && healed.penghasilanWali) { healed.penghasilanAyah = healed.penghasilanWali; changed = true; }
    } else if (isWaliIbu) {
        if (!healed.statusWali) { healed.statusWali = 'Ibu Kandung'; changed = true; }
        if (!healed.nikWali && healed.nikIbu) { healed.nikWali = healed.nikIbu; changed = true; }
        if (!healed.nikIbu && healed.nikWali) { healed.nikIbu = healed.nikWali; changed = true; }
        if (!healed.pekerjaanWali && healed.pekerjaanIbu) { healed.pekerjaanWali = healed.pekerjaanIbu; changed = true; }
        if (!healed.pekerjaanIbu && healed.pekerjaanWali) { healed.pekerjaanIbu = healed.pekerjaanWali; changed = true; }
        if (!healed.pendidikanWali && healed.pendidikanIbu) { healed.pendidikanWali = healed.pendidikanIbu; changed = true; }
        if (!healed.pendidikanIbu && healed.pendidikanWali) { healed.pendidikanIbu = healed.pendidikanWali; changed = true; }
        if (!healed.penghasilanWali && healed.penghasilanIbu) { healed.penghasilanWali = healed.penghasilanIbu; changed = true; }
        if (!healed.penghasilanIbu && healed.penghasilanWali) { healed.penghasilanIbu = healed.penghasilanWali; changed = true; }
    } else {
        // Generic fallback if only Wali or only Ayah was filled in simple forms
        if (!healed.pekerjaanWali && healed.pekerjaanAyah) { healed.pekerjaanWali = healed.pekerjaanAyah; changed = true; }
        if (!healed.pendidikanWali && healed.pendidikanAyah) { healed.pendidikanWali = healed.pendidikanAyah; changed = true; }
        if (!healed.penghasilanWali && healed.penghasilanAyah) { healed.penghasilanWali = healed.penghasilanAyah; changed = true; }
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

export const getPsbAcademicYearOptions = (settings?: PondokSettings): {
    activeYear: string;
    nextYear: string;
    options: string[];
} => {
    const currentYear = new Date().getFullYear();
    const customList = (settings as any)?.tahunAjaranList;
    const activeFromList = Array.isArray(customList) ? customList.find((t: any) => t?.isActive)?.nama : undefined;
    const activeYear = (activeFromList || settings?.tahunAjaranAktif || settings?.psbConfig?.tahunAjaranAktif || `${currentYear}/${currentYear + 1}`).trim();

    let startY = currentYear;
    const match = activeYear.match(/^(\d{4})\s*\/\s*(\d{4})/);
    if (match) {
        startY = parseInt(match[1], 10);
    }
    const nextYear = `${startY + 1}/${startY + 2}`;
    const yearAfterNext = `${startY + 2}/${startY + 3}`;
    const prevYear = `${startY - 1}/${startY}`;

    const set = new Set<string>();
    if (settings?.psbConfig?.tahunAjaranAktif) set.add(settings.psbConfig.tahunAjaranAktif.trim());
    if (settings?.tahunAjaranAktif) set.add(settings.tahunAjaranAktif.trim());
    set.add(activeYear);
    set.add(nextYear);
    set.add(yearAfterNext);
    set.add(prevYear);
    if (Array.isArray(customList)) {
        customList.forEach((t: any) => {
            if (t?.nama?.trim()) set.add(t.nama.trim());
        });
    }

    return {
        activeYear,
        nextYear,
        options: Array.from(set).filter(Boolean)
    };
};

export const healPendaftarRecord = (raw: any, settings?: PondokSettings): Pendaftar => {
    return healPendaftarRecordWithDetails(raw, settings).healed;
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
            { key: 'pekerjaanAyah', label: 'Pekerjaan Ayah', type: 'select', options: PSB_PEKERJAAN_OPTIONS },
            { key: 'pendidikanAyah', label: 'Pendidikan Terakhir Ayah', type: 'select', options: PSB_PENDIDIKAN_OPTIONS },
            { key: 'penghasilanAyah', label: 'Penghasilan Rata-rata Ayah / Bulan', type: 'select', options: PSB_PENGHASILAN_OPTIONS },
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
            { key: 'pekerjaanIbu', label: 'Pekerjaan Ibu', type: 'select', options: PSB_PEKERJAAN_OPTIONS },
            { key: 'pendidikanIbu', label: 'Pendidikan Terakhir Ibu', type: 'select', options: PSB_PENDIDIKAN_OPTIONS },
            { key: 'penghasilanIbu', label: 'Penghasilan Rata-rata Ibu / Bulan', type: 'select', options: PSB_PENGHASILAN_OPTIONS },
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
            { key: 'hubunganWali', label: 'Hubungan dengan Santri', type: 'select', options: ['Ayah Kandung', 'Ibu Kandung', 'Kakek/Nenek', 'Paman/Bibi', 'Kakak Kandung', 'Orang Tua Asuh', 'Orang Tua Angkat', 'Lainnya'] },
            { key: 'pekerjaanWali', label: 'Pekerjaan Wali', type: 'select', options: PSB_PEKERJAAN_OPTIONS },
            { key: 'pendidikanWali', label: 'Pendidikan Terakhir Wali', type: 'select', options: PSB_PENDIDIKAN_OPTIONS },
            { key: 'penghasilanWali', label: 'Penghasilan Wali / Bulan', type: 'select', options: PSB_PENGHASILAN_OPTIONS },
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

