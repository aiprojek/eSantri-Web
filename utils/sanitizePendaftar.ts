import {
    Alamat,
    Pendaftar,
    PendaftarStatus,
    PsbBerkasFisik,
    PsbNilaiUjian,
} from '../types';
import { SAFE_IMG, SAFE_DOC, isSafeHttpUrl } from './safePreview';

const VALID_STATUSES = new Set<PendaftarStatus>([
    'Baru',
    'Verifikasi Berkas',
    'Ujian Masuk',
    'Cadangan',
    'Diterima',
    'Ditolak',
]);

const VALID_GENDERS = new Set<'Laki-laki' | 'Perempuan'>(['Laki-laki', 'Perempuan']);
const VALID_CITIZENSHIPS = new Set<'WNI' | 'WNA' | 'Keturunan'>(['WNI', 'WNA', 'Keturunan']);
const VALID_REKOMENDASI = new Set(['Lulus', 'Dipertimbangkan', 'Tidak Lulus']);

const ALLOWED_UPLOAD_MIME_TYPES = new Set([
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf',
]);

const ALLOWED_UPLOAD_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'pdf']);
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

const MAX_LEN_DEFAULT = 500;
const MAX_LEN_CUSTOM_DATA = 50000;

const BLOCKED_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function sanitizeStringValue(val: unknown, maxLen: number = MAX_LEN_DEFAULT): string {
    if (val === null || val === undefined) return '';
    let str = typeof val === 'string' ? val : (typeof val === 'number' || typeof val === 'boolean' ? String(val) : '');
    if (!str) return '';
    // Tolak skema URI berbahaya jika berada di field teks/URL biasa
    const trimmedLower = str.trim().toLowerCase();
    if (trimmedLower.startsWith('javascript:') || trimmedLower.startsWith('vbscript:')) {
        return '';
    }
    if (trimmedLower.startsWith('data:')) {
        const trimmed = str.trim();
        if (!SAFE_IMG.test(trimmed) && !SAFE_DOC.test(trimmed)) {
            return '';
        }
        return trimmed.length > maxLen ? trimmed.slice(0, maxLen) : trimmed;
    }
    if (trimmedLower.startsWith('http://') || trimmedLower.startsWith('https://')) {
        const trimmed = str.trim();
        if (!isSafeHttpUrl(trimmed)) {
            return '';
        }
        return trimmed.length > maxLen ? trimmed.slice(0, maxLen) : trimmed;
    }
    if (str.length > maxLen) {
        str = str.slice(0, maxLen);
    }
    return str;
}

function sanitizeOptionalString(val: unknown, maxLen: number = MAX_LEN_DEFAULT): string | undefined {
    if (val === undefined || val === null) return undefined;
    const cleaned = sanitizeStringValue(val, maxLen);
    return cleaned === '' && val === undefined ? undefined : cleaned;
}

function sanitizeOptionalNumber(val: unknown): number | undefined {
    if (val === undefined || val === null || val === '') return undefined;
    const num = typeof val === 'number' ? val : Number(val);
    return Number.isFinite(num) ? num : undefined;
}

function sanitizeSafeMediaOrUrl(val: unknown, allowDoc: boolean = false): string | undefined {
    if (typeof val !== 'string') return undefined;
    const trimmed = val.trim();
    if (!trimmed) return undefined;
    if (SAFE_IMG.test(trimmed)) return trimmed;
    if (allowDoc && SAFE_DOC.test(trimmed)) return trimmed;
    if (isSafeHttpUrl(trimmed)) return trimmed;
    return undefined;
}

function sanitizeAlamat(raw: unknown, fallbackObj?: Record<string, unknown>): Alamat {
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
        const a = raw as Record<string, unknown>;
        return {
            detail: sanitizeStringValue(a.detail ?? '', 500),
            ...(a.desaKelurahan !== undefined ? { desaKelurahan: sanitizeStringValue(a.desaKelurahan, 200) } : {}),
            ...(a.kecamatan !== undefined ? { kecamatan: sanitizeStringValue(a.kecamatan, 200) } : {}),
            ...(a.kabupatenKota !== undefined ? { kabupatenKota: sanitizeStringValue(a.kabupatenKota, 200) } : {}),
            ...(a.provinsi !== undefined ? { provinsi: sanitizeStringValue(a.provinsi, 200) } : {}),
            ...(a.kodePos !== undefined ? { kodePos: sanitizeStringValue(a.kodePos, 20) } : {}),
        };
    }
    return {
        detail: sanitizeStringValue(typeof raw === 'string' ? raw : '', 500),
        desaKelurahan: sanitizeStringValue(fallbackObj?.desaKelurahan ?? '', 200),
        kecamatan: sanitizeStringValue(fallbackObj?.kecamatan ?? '', 200),
        kabupatenKota: sanitizeStringValue(fallbackObj?.kabupatenKota ?? '', 200),
        provinsi: sanitizeStringValue(fallbackObj?.provinsi ?? '', 200),
        kodePos: sanitizeStringValue(fallbackObj?.kodePos ?? '', 20),
    };
}

function sanitizeOptionalAlamat(raw: unknown): Alamat | undefined {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
    return sanitizeAlamat(raw);
}

function sanitizeBerkasFisik(raw: unknown): PsbBerkasFisik | undefined {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
    const b = raw as Record<string, unknown>;
    return {
        kk: Boolean(b.kk),
        akta: Boolean(b.akta),
        ijazahSkl: Boolean(b.ijazahSkl),
        suratSehat: Boolean(b.suratSehat),
        pasFoto: Boolean(b.pasFoto),
        ...(b.catatanBerkas !== undefined ? { catatanBerkas: sanitizeStringValue(b.catatanBerkas, 1000) } : {}),
        ...(b.checkedAt !== undefined ? { checkedAt: sanitizeStringValue(b.checkedAt, 100) } : {}),
        ...(b.checkedBy !== undefined ? { checkedBy: sanitizeStringValue(b.checkedBy, 200) } : {}),
    };
}

function sanitizeNilaiUjian(raw: unknown): PsbNilaiUjian | undefined {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
    const n = raw as Record<string, unknown>;
    const rek = typeof n.rekomendasi === 'string' && VALID_REKOMENDASI.has(n.rekomendasi)
        ? (n.rekomendasi as PsbNilaiUjian['rekomendasi'])
        : undefined;
    return {
        ...(sanitizeOptionalNumber(n.bacaQuran) !== undefined ? { bacaQuran: sanitizeOptionalNumber(n.bacaQuran) } : {}),
        ...(sanitizeOptionalNumber(n.tulisArab) !== undefined ? { tulisArab: sanitizeOptionalNumber(n.tulisArab) } : {}),
        ...(sanitizeOptionalNumber(n.wawancara) !== undefined ? { wawancara: sanitizeOptionalNumber(n.wawancara) } : {}),
        ...(sanitizeOptionalNumber(n.pengetahuanUmum) !== undefined ? { pengetahuanUmum: sanitizeOptionalNumber(n.pengetahuanUmum) } : {}),
        ...(rek ? { rekomendasi: rek } : {}),
        ...(n.catatanUjian !== undefined ? { catatanUjian: sanitizeStringValue(n.catatanUjian, 1000) } : {}),
        ...(n.penguji !== undefined ? { penguji: sanitizeStringValue(n.penguji, 200) } : {}),
        ...(n.tanggalUjian !== undefined ? { tanggalUjian: sanitizeStringValue(n.tanggalUjian, 100) } : {}),
        ...(n.ruangUjian !== undefined ? { ruangUjian: sanitizeStringValue(n.ruangUjian, 200) } : {}),
    };
}

export function sanitizeCustomDataValue(val: unknown): unknown {
    if (val === null || val === undefined) return '';
    if (typeof val === 'number') return Number.isFinite(val) ? val : 0;
    if (typeof val === 'boolean') return val;
    if (Array.isArray(val)) {
        return val
            .slice(0, 100)
            .map((item) => sanitizeStringValue(item, 500))
            .filter((s) => s !== '');
    }
    if (typeof val === 'string') {
        const trimmed = val.trim();
        const lower = trimmed.toLowerCase();
        if (lower.startsWith('javascript:') || lower.startsWith('vbscript:')) {
            return '';
        }
        if (lower.startsWith('data:')) {
            return SAFE_IMG.test(trimmed) || SAFE_DOC.test(trimmed) ? trimmed : '';
        }
        if (lower.startsWith('http://') || lower.startsWith('https://')) {
            return isSafeHttpUrl(trimmed) ? trimmed : '';
        }
        return val.length > 5000 ? val.slice(0, 5000) : val;
    }
    if (typeof val === 'object') {
        // Nested object: stringify safely bounded
        try {
            return sanitizeStringValue(JSON.stringify(val), 2000);
        } catch {
            return '';
        }
    }
    return '';
}

export function sanitizeCustomDataJson(raw: unknown): string {
    if (raw === undefined || raw === null || raw === '') return '{}';
    let parsed: Record<string, unknown> | null = null;
    if (typeof raw === 'string') {
        const trimmed = raw.trim();
        if (!trimmed) return '{}';
        try {
            const candidate = JSON.parse(trimmed);
            if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
                parsed = candidate as Record<string, unknown>;
            }
        } catch {
            // Jika bukan JSON valid, simpan sebagai catatan mentah yang disanitasi
            const safeText = sanitizeStringValue(trimmed, 5000);
            return safeText ? JSON.stringify({ rawText: safeText }) : '{}';
        }
    } else if (typeof raw === 'object' && !Array.isArray(raw)) {
        parsed = raw as Record<string, unknown>;
    }

    if (!parsed) return '{}';

    const cleanObj: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(parsed)) {
        if (!k || BLOCKED_KEYS.has(k) || k.length > 150) continue;
        // Pertahankan metadata amplop E2EE jika masih ada saat sinkronisasi parsial
        if (k === '__e2ee_bio' && typeof v === 'string' && v.length <= MAX_LEN_CUSTOM_DATA) {
            cleanObj[k] = v;
            continue;
        }
        cleanObj[k] = sanitizeCustomDataValue(v);
    }

    let serialized = JSON.stringify(cleanObj);
    if (serialized.length > MAX_LEN_CUSTOM_DATA) {
        // Pangkas entri terbesar satu per satu (prioritaskan menghapus base64/teks non-E2EE terlalu besar; pertahankan __e2ee_bio terakhir)
        const keysByLen = Object.keys(cleanObj).sort((a, b) => {
            if (a === '__e2ee_bio') return 1;
            if (b === '__e2ee_bio') return -1;
            const la = JSON.stringify(cleanObj[a] ?? '').length;
            const lb = JSON.stringify(cleanObj[b] ?? '').length;
            return lb - la;
        });
        for (const k of keysByLen) {
            if (serialized.length <= MAX_LEN_CUSTOM_DATA) break;
            if (typeof cleanObj[k] === 'string' && String(cleanObj[k]).length > 1000) {
                delete cleanObj[k];
                serialized = JSON.stringify(cleanObj);
            }
        }
        if (serialized.length > MAX_LEN_CUSTOM_DATA) {
            return '{}';
        }
    }
    return serialized;
}

export function sanitizePendaftar(input: unknown): Pendaftar {
    const src: Record<string, unknown> =
        input && typeof input === 'object' && !Array.isArray(input)
            ? (input as Record<string, unknown>)
            : {};

    const rawId = sanitizeOptionalNumber(src.id);
    const id = rawId && rawId > 0 ? Math.floor(rawId) : Date.now();

    const rawGender = sanitizeStringValue(src.jenisKelamin, 30);
    const jenisKelamin: 'Laki-laki' | 'Perempuan' = VALID_GENDERS.has(rawGender as any)
        ? (rawGender as 'Laki-laki' | 'Perempuan')
        : 'Laki-laki';

    const rawCitizenship = sanitizeStringValue(src.kewarganegaraan, 30);
    const kewarganegaraan: 'WNI' | 'WNA' | 'Keturunan' = VALID_CITIZENSHIPS.has(rawCitizenship as any)
        ? (rawCitizenship as 'WNI' | 'WNA' | 'Keturunan')
        : 'WNI';

    const rawStatus = sanitizeStringValue(src.status, 40);
    const status: PendaftarStatus = VALID_STATUSES.has(rawStatus as PendaftarStatus)
        ? (rawStatus as PendaftarStatus)
        : 'Baru';

    const tanggalDaftar = sanitizeStringValue(src.tanggalDaftar, 64) || new Date().toISOString();
    const tanggalMasuk = sanitizeStringValue(src.tanggalMasuk, 64) || tanggalDaftar;

    const result: Pendaftar = {
        id,
        nis: sanitizeStringValue(src.nis, 100),
        namaLengkap: sanitizeStringValue(src.namaLengkap, 200),
        jenisKelamin,
        tempatLahir: sanitizeStringValue(src.tempatLahir, 150),
        tanggalLahir: sanitizeStringValue(src.tanggalLahir, 64),
        kewarganegaraan,
        alamat: sanitizeAlamat(src.alamat, src),
        namaAyah: sanitizeStringValue(src.namaAyah, 200),
        namaIbu: sanitizeStringValue(src.namaIbu, 200),
        jenjangId: sanitizeOptionalNumber(src.jenjangId) ?? 0,
        kelasId: sanitizeOptionalNumber(src.kelasId) ?? 0,
        rombelId: sanitizeOptionalNumber(src.rombelId) ?? 0,
        tanggalMasuk,
        jenisSantri: sanitizeStringValue(src.jenisSantri, 100) || 'Mondok - Baru',
        tanggalDaftar,
        status,
        customData: sanitizeCustomDataJson(src.customData),
    };

    // Optional string fields (hanya whitelist field yang ada di tipe Pendaftar)
    const setOptStr = (key: keyof Pendaftar, maxLen: number = MAX_LEN_DEFAULT) => {
        const val = src[key as string];
        if (val !== undefined && val !== null) {
            (result as any)[key] = sanitizeStringValue(val, maxLen);
        }
    };

    setOptStr('nisn', 50);
    setOptStr('nik', 50);
    setOptStr('namaHijrah', 200);
    setOptStr('nikAyah', 50);
    setOptStr('statusAyah', 60);
    setOptStr('pekerjaanAyah', 150);
    setOptStr('pendidikanAyah', 150);
    setOptStr('penghasilanAyah', 150);
    setOptStr('teleponAyah', 50);
    setOptStr('tanggalLahirAyah', 64);
    setOptStr('tempatLahirAyah', 150);
    setOptStr('nikIbu', 50);
    setOptStr('statusIbu', 60);
    setOptStr('pekerjaanIbu', 150);
    setOptStr('pendidikanIbu', 150);
    setOptStr('penghasilanIbu', 150);
    setOptStr('teleponIbu', 50);
    setOptStr('tanggalLahirIbu', 64);
    setOptStr('tempatLahirIbu', 150);
    setOptStr('namaWali', 200);
    setOptStr('nikWali', 50);
    setOptStr('statusWali', 100);
    setOptStr('statusHidupWali', 60);
    setOptStr('pekerjaanWali', 150);
    setOptStr('pendidikanWali', 150);
    setOptStr('penghasilanWali', 150);
    setOptStr('teleponWali', 50);
    setOptStr('tanggalLahirWali', 64);
    setOptStr('tempatLahirWali', 150);
    setOptStr('tanggalStatus', 64);
    setOptStr('berkebutuhanKhusus', 300);
    setOptStr('riwayatPenyakit', 500);
    setOptStr('citaCita', 200);
    setOptStr('jarakKePondok', 100);
    setOptStr('statusKeluarga', 100);
    setOptStr('sekolahAsal', 250);
    setOptStr('asalSekolah', 250);
    setOptStr('alamatSekolahAsal', 500);
    setOptStr('nomorIjazahSebelumnya', 100);
    setOptStr('tahunLulusSebelumnya', 20);
    setOptStr('namaPanggilan', 100);
    setOptStr('agama', 50);
    setOptStr('statusAnak', 100);
    setOptStr('golonganDarah', 20);
    setOptStr('telepon', 50);
    setOptStr('noHp', 50);
    setOptStr('noHpAyah', 50);
    setOptStr('noHpIbu', 50);
    setOptStr('noHpWali', 50);
    setOptStr('desaKelurahan', 200);
    setOptStr('kecamatan', 200);
    setOptStr('kabupatenKota', 200);
    setOptStr('kodePos', 20);
    setOptStr('catatan', 2000);
    setOptStr('nomorRegistrasi', 100);
    setOptStr('jalurPendaftaran', 100);
    setOptStr('tahunAjaran', 50);
    setOptStr('nomorHpWali', 50);

    // Optional number fields
    const setOptNum = (key: keyof Pendaftar) => {
        const num = sanitizeOptionalNumber(src[key as string]);
        if (num !== undefined) {
            (result as any)[key] = num;
        }
    };
    setOptNum('anakKe');
    setOptNum('jumlahSaudara');
    setOptNum('tinggiBadan');
    setOptNum('beratBadan');
    setOptNum('gedungId');
    setOptNum('kamarId');
    setOptNum('halaqahId');
    setOptNum('targetJuz');
    setOptNum('gelombang');
    setOptNum('santriId');
    setOptNum('lastModified');

    // Media / URL
    const safeFoto = sanitizeSafeMediaOrUrl(src.fotoUrl, false);
    if (safeFoto) {
        result.fotoUrl = safeFoto;
    }

    // Sub-objects & arrays
    const alamatAyah = sanitizeOptionalAlamat(src.alamatAyah);
    if (alamatAyah) result.alamatAyah = alamatAyah;
    const alamatIbu = sanitizeOptionalAlamat(src.alamatIbu);
    if (alamatIbu) result.alamatIbu = alamatIbu;
    const alamatWali = sanitizeOptionalAlamat(src.alamatWali);
    if (alamatWali) result.alamatWali = alamatWali;

    if (Array.isArray(src.hobi)) {
        result.hobi = src.hobi
            .slice(0, 30)
            .map((h) => sanitizeStringValue(h, 100))
            .filter(Boolean);
    }

    const berkas = sanitizeBerkasFisik(src.berkasFisik);
    if (berkas) result.berkasFisik = berkas;

    const ujian = sanitizeNilaiUjian(src.nilaiUjian);
    if (ujian) result.nilaiUjian = ujian;

    if (src.deleted !== undefined) {
        result.deleted = Boolean(src.deleted);
    }

    return result;
}

export function sanitizePsbSubmissionFields(fields: Record<string, unknown>): Record<string, unknown> {
    const clean: Record<string, unknown> = {};
    if (!fields || typeof fields !== 'object' || Array.isArray(fields)) return clean;

    for (const [key, val] of Object.entries(fields)) {
        if (!key || BLOCKED_KEYS.has(key) || key.length > 150) continue;
        if (val instanceof File) {
            assertSafePsbUploadFile(val);
            clean[key] = val;
            continue;
        }
        if (key === 'namaLengkap') {
            clean[key] = sanitizeStringValue(val, 200);
        } else if (key === 'catatan') {
            clean[key] = sanitizeStringValue(val, 2000);
        } else if (key === 'nomorRegistrasi') {
            clean[key] = sanitizeStringValue(val, 100);
        } else if (key === 'nomorHpWali') {
            clean[key] = sanitizeStringValue(val, 50);
        } else if (key === 'customData') {
            clean[key] = sanitizeCustomDataJson(val);
        } else if (typeof val === 'string') {
            clean[key] = sanitizeCustomDataValue(val);
        } else if (typeof val === 'number') {
            clean[key] = Number.isFinite(val) ? val : 0;
        } else if (typeof val === 'boolean') {
            clean[key] = val;
        } else if (Array.isArray(val)) {
            clean[key] = val.slice(0, 50).map((x) => sanitizeStringValue(x, 300)).filter(Boolean);
        } else if (val && typeof val === 'object') {
            clean[key] = sanitizeCustomDataValue(val);
        }
    }
    return clean;
}

export function assertSafePsbUploadFile(file: File): void {
    if (!file || typeof file.name !== 'string') {
        throw new Error('Berkas unggahan tidak valid.');
    }
    if (file.size > MAX_UPLOAD_BYTES) {
        throw new Error(`Ukuran berkas "${file.name}" melebihi batas maksimal 10 MB.`);
    }
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    const mimeOk = file.type ? ALLOWED_UPLOAD_MIME_TYPES.has(file.type.toLowerCase()) : false;
    const extOk = ALLOWED_UPLOAD_EXTENSIONS.has(ext);
    if (!mimeOk && !extOk) {
        throw new Error(`Tipe berkas "${file.name}" tidak diizinkan. Gunakan JPG, PNG, WebP, GIF, atau PDF.`);
    }
}
