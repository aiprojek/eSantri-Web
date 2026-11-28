import { db } from '../db';
import { PondokSettings, PortalConfig, PsbConfig } from '../types';
import { extractTemplateKeys } from './raporExcelService';
import { calculatePredikat, isSubjectGradeKey } from './raporCalculationService';
import {
    computePublicKeyFingerprint,
    decryptPortalSantriSummary,
    deriveFirebasePortalPinLookupKey,
    deriveFirebasePortalPlainLookupKey,
    derivePortalAuthHashCandidates,
    derivePortalPinVerificationHash,
    encryptPortalSantriSummary,
    EncryptedPortalSantriRecord,
    isEncryptedPortalRecord,
    isWebCryptoAvailable,
    normalizePortalDob,
    normalizePortalNis,
    normalizePortalPin,
    sanitizeFirebasePortalEntryId,
} from './e2eeService';
import { isFirebaseClientConfigReady } from '../firebaseApp';
import { sanitizePsbSubmissionFields } from '../utils/sanitizePendaftar';
import { makeRegNumber } from '../utils/psbNaming';

interface PortalFetchResponse {
    success?: boolean;
    version?: number;
    updatedAt?: string;
    data?: any;
    message?: string;
}

export interface PortalBillItem {
    id: number;
    deskripsi: string;
    bulan: number;
    tahun: number;
    nominal: number;
    sudahDicicil?: number;
}

export interface PortalPaymentItem {
    id: number;
    tanggal: string;
    jumlah: number;
    metode: string;
    catatan?: string;
}

export interface PortalSavingsMutation {
    tanggal: string;
    jenis: 'Deposit' | 'Penarikan';
    jumlah: number;
    keterangan: string;
    saldoSetelah: number;
}

export interface PortalTahfizhItem {
    tanggal: string;
    tipe: string;
    juz: number;
    surah: string;
    ayat: string;
    predikat: string;
    nilaiAngka?: number;
    catatan?: string;
}

export interface PortalHealthItem {
    tanggal: string;
    status: string;
    diagnosa: string;
    keluhan?: string;
    tindakan?: string;
    suhuTubuh?: number;
}

export interface PortalBookLoanItem {
    judul: string;
    kodeBuku: string;
    tanggalPinjam: string;
    tanggalKembaliSeharusnya: string;
}

export interface PortalRaporSummary {
    tahunAjaran: string;
    semester: string;
    rataRata: number;
    hasNumericScores?: boolean;
    keputusan?: string;
    catatanWaliKelas?: string;
    mapel: Array<{ nama: string; nilai: number; predikat: string }>;
}

export interface PortalCatatanItem {
    kategori: 'Prestasi' | 'Pembinaan';
    deskripsi: string;
    tanggal: string;
    tindakLanjut?: string;
}

export interface PortalSantriSummary {
    id: number;
    nis: string;
    nisn?: string;
    namaLengkap: string;
    jenisKelamin?: string;
    tanggalLahir: string;
    jenjangId: number;
    kelasId: number;
    rombelId: number;
    jenjangNama?: string;
    kelasNama?: string;
    rombelNama?: string;
    waliKelasNama?: string;
    asramaNama?: string;
    kamarNama?: string;
    musyrifNama?: string;
    statusSantri?: string;
    namaWali: string;
    teleponWali: string;
    attendanceToday: string;
    rekapBulanIni?: {
        hadir: number;
        sakit: number;
        izin: number;
        alpha: number;
        bulanLabel: string;
    };
    saldoTabungan: number;
    mutasiTabungan?: PortalSavingsMutation[];
    tunggakanBulanIni: number;
    totalTunggakan?: number;
    daftarTunggakan?: PortalBillItem[];
    pembayaranTerakhir?: PortalPaymentItem[];
    targetJuz?: number;
    totalJuzHafalan?: number;
    raporTerakhir?: PortalRaporSummary | null;
    catatanPembinaan?: PortalCatatanItem[];
    tahfizhTerakhir: { tanggal: string; tipe: string; surah: string; ayat: string; predikat?: string; juz?: number } | null;
    riwayatTahfizh?: PortalTahfizhItem[];
    kesehatanTerakhir: { tanggal: string; status: string; diagnosa: string; keluhan?: string; tindakan?: string; suhuTubuh?: number } | null;
    riwayatKesehatan?: PortalHealthItem[];
    pinjamanBukuAktif: number;
    daftarPinjamanBuku?: PortalBookLoanItem[];
    pinAuthHash?: string;
}

export interface PortalBundle {
    settings: PondokSettings | null;
    santriSummary: PortalSantriSummary[];
    updatedAt?: string;
    serverAuthSupported?: boolean;
}

export interface PortalDecodedCredentials {
    gasEndpoint: string;
    portalId: string;
    gasApiKey: string;
}

export const PORTAL_CIPHER_KEY = 'ESANTRI_PORTAL_V2_GUARD_2026_KEY';

/**
 * Mengenkripsi / menyamarkan URL GAS, Portal ID, dan Token API menjadi string pendek URL-safe (ep2_...)
 * agar URL GAS tidak terpampang sebagai teks telanjang di URL maupun di kode HTML mandiri.
 */
export const encodePortalKey = (gasEndpoint: string, portalId: string, gasApiKey: string = ''): string => {
    try {
        const raw = JSON.stringify({
            g: gasEndpoint.trim(),
            p: portalId.trim(),
            t: (gasApiKey || '').trim(),
        });
        const utf8Bytes = new TextEncoder().encode(raw);
        const keyBytes = new TextEncoder().encode(PORTAL_CIPHER_KEY);
        const xored = new Uint8Array(utf8Bytes.length);
        for (let i = 0; i < utf8Bytes.length; i++) {
            xored[i] = utf8Bytes[i] ^ keyBytes[i % keyBytes.length] ^ ((i * 31) & 0xff);
        }
        let binary = '';
        for (let i = 0; i < xored.length; i++) {
            binary += String.fromCharCode(xored[i]);
        }
        const b64 = btoa(binary)
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
        return `ep2_${b64}`;
    } catch {
        return '';
    }
};

/**
 * Mendekripsi kembali string ep2_... menjadi kredensial koneksi GAS di memori.
 */
export const decodePortalKey = (encoded: string): PortalDecodedCredentials | null => {
    try {
        const clean = (encoded || '').trim();
        if (!clean.startsWith('ep2_')) return null;
        let b64 = clean.slice(4).replace(/-/g, '+').replace(/_/g, '/');
        while (b64.length % 4 !== 0) {
            b64 += '=';
        }
        const binary = atob(b64);
        const xored = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            xored[i] = binary.charCodeAt(i);
        }
        const keyBytes = new TextEncoder().encode(PORTAL_CIPHER_KEY);
        const plainBytes = new Uint8Array(xored.length);
        for (let i = 0; i < xored.length; i++) {
            plainBytes[i] = xored[i] ^ keyBytes[i % keyBytes.length] ^ ((i * 31) & 0xff);
        }
        const jsonStr = new TextDecoder().decode(plainBytes);
        const parsed = JSON.parse(jsonStr);
        if (!parsed || typeof parsed.g !== 'string') return null;
        return {
            gasEndpoint: parsed.g,
            portalId: parsed.p || '',
            gasApiKey: parsed.t || '',
        };
    } catch {
        return null;
    }
};

/**
 * Menggabungkan konfigurasi portal secara cerdas (Multi-Admin Cloud & Hub-and-Spoke)
 * agar kredensial GAS, pengumuman, dan metadata sinkronisasi tidak hilang saat beberapa admin bekerja bersamaan.
 */
export const mergePortalConfig = (
    winnerPortal?: PortalConfig,
    secondaryPortal?: PortalConfig
): PortalConfig | undefined => {
    if (!winnerPortal) return secondaryPortal;
    if (!secondaryPortal) return winnerPortal;

    const merged: PortalConfig = {
        ...secondaryPortal,
        ...winnerPortal,
        portalId: (winnerPortal.portalId || '').trim() || (secondaryPortal.portalId || '').trim() || 'default-portal',
        gasEndpoint: (winnerPortal.gasEndpoint || '').trim() || (secondaryPortal.gasEndpoint || '').trim() || '',
        gasApiKey: (winnerPortal.gasApiKey || '').trim() || (secondaryPortal.gasApiKey || '').trim() || '',
        gasPublicKey: (winnerPortal.gasPublicKey || '').trim() || (secondaryPortal.gasPublicKey || '').trim() || '',
        gasAdminKey: (winnerPortal.gasAdminKey || '').trim() || (secondaryPortal.gasAdminKey || '').trim() || '',
        baseUrl: (winnerPortal.baseUrl || '').trim() || (secondaryPortal.baseUrl || '').trim() || '',
        standalonePublicUrl: (winnerPortal.standalonePublicUrl || '').trim() || (secondaryPortal.standalonePublicUrl || '').trim() || '',
    };

    // Union merge announcementPosts by id (winner takes precedence on same id)
    const postsA = Array.isArray(secondaryPortal.announcementPosts) ? secondaryPortal.announcementPosts : [];
    const postsB = Array.isArray(winnerPortal.announcementPosts) ? winnerPortal.announcementPosts : [];
    if (postsA.length > 0 || postsB.length > 0) {
        const postMap = new Map<string, any>();
        postsA.forEach((p) => { if (p?.id) postMap.set(p.id, p); });
        postsB.forEach((p) => { if (p?.id) postMap.set(p.id, p); });
        merged.announcementPosts = Array.from(postMap.values()).sort((a, b) =>
            String(b.publishedAt || '').localeCompare(String(a.publishedAt || ''))
        );
    }

    // Preserve contacts if winner has none
    if ((!merged.contacts || merged.contacts.length === 0) && Array.isArray(secondaryPortal.contacts) && secondaryPortal.contacts.length > 0) {
        merged.contacts = secondaryPortal.contacts;
    }

    // Preserve customLinks if winner has none
    if ((!merged.customLinks || merged.customLinks.length === 0) && Array.isArray(secondaryPortal.customLinks) && secondaryPortal.customLinks.length > 0) {
        merged.customLinks = secondaryPortal.customLinks;
    }

    // Keep most recent sync metadata
    const timeW = winnerPortal.lastSyncedAt ? new Date(winnerPortal.lastSyncedAt).getTime() : 0;
    const timeS = secondaryPortal.lastSyncedAt ? new Date(secondaryPortal.lastSyncedAt).getTime() : 0;
    if (timeS > timeW) {
        merged.lastSyncedAt = secondaryPortal.lastSyncedAt;
        merged.lastSyncedCount = secondaryPortal.lastSyncedCount;
        merged.lastPayloadSize = secondaryPortal.lastPayloadSize;
    }

    return merged;
};

const ensureGasEndpoint = (settings: PondokSettings): string => {
    const endpoint = settings.portalConfig?.gasEndpoint?.trim();
    if (!endpoint) {
        throw new Error('URL Google Apps Script (Portal GAS) belum diisi.');
    }
    return endpoint;
};

const ensurePortalId = (settings: PondokSettings): string => {
    const portalId = settings.portalConfig?.portalId?.trim();
    if (!portalId) {
        throw new Error('Portal ID belum diisi.');
    }
    return portalId;
};

/**
 * Mengambil konfigurasi publik pondok (tanpa menarik seluruh data santri jika GAS v2 sudah aktif).
 * Tetap mendukung fallback otomatis ke getPortalConfig untuk GAS v1 lama.
 */
export const fetchPortalSettingsFromGas = async (
    gasEndpoint: string,
    portalId: string,
    apiKey?: string
): Promise<PortalBundle> => {
    // Coba panggil endpoint aman v2 (getPortalPublicInfo) terlebih dahulu
    try {
        const urlV2 = new URL(gasEndpoint);
        urlV2.searchParams.set('action', 'getPortalPublicInfo');
        urlV2.searchParams.set('portalId', portalId);
        if (apiKey) {
            urlV2.searchParams.set('apiKey', apiKey);
        }

        const resV2 = await fetch(urlV2.toString(), { method: 'GET' });
        if (resV2.ok) {
            const resultV2: PortalFetchResponse = await resV2.json();
            if (resultV2.success && resultV2.data?.settings) {
                return {
                    settings: resultV2.data.settings as PondokSettings,
                    santriSummary: [], // Kosong karena login dilakukan secara aman di server GAS (loginSantri)
                    updatedAt: resultV2.updatedAt || resultV2.data?.metadata?.updatedAt || '',
                    serverAuthSupported: true,
                };
            }
        }
    } catch {
        // Lanjut ke fallback v1 jika gagal
    }

    // Fallback ke getPortalConfig (kompatibilitas GAS lama)
    const url = new URL(gasEndpoint);
    url.searchParams.set('action', 'getPortalConfig');
    url.searchParams.set('portalId', portalId);
    if (apiKey) {
        url.searchParams.set('apiKey', apiKey);
    }

    const response = await fetch(url.toString(), { method: 'GET' });
    if (!response.ok) {
        throw new Error(`Gagal mengambil data portal (HTTP ${response.status}).`);
    }

    const result: PortalFetchResponse = await response.json();
    if (result.success === false) {
        throw new Error(result.message || 'Gagal mengambil konfigurasi portal dari GAS.');
    }
    const data = result.data || null;

    if (!data || Array.isArray(data)) {
        return { settings: null, santriSummary: [] };
    }

    if (data.settings && typeof data.settings === 'object' && !Array.isArray(data.settings)) {
        return {
            settings: data.settings as PondokSettings,
            santriSummary: (data.santriSummary || []) as PortalSantriSummary[],
            updatedAt: result.updatedAt || data.metadata?.updatedAt || '',
            serverAuthSupported: Boolean(result.version && result.version >= 2),
        };
    }

    // Hanya jika data adalah objek tunggal PondokSettings yang valid (memiliki namaPonpes atau psbConfig)
    if (typeof data === 'object' && !Array.isArray(data) && ((data as any).namaPonpes || (data as any).psbConfig)) {
        return { settings: data as PondokSettings, santriSummary: [] };
    }

    return {
        settings: null,
        santriSummary: [],
        updatedAt: result.updatedAt || '',
        serverAuthSupported: Boolean(result.version && result.version >= 2),
    };
};

export const fetchPortalPublicInfoFromGas = async (
    gasEndpoint: string,
    portalId: string,
    apiKey?: string
): Promise<{
    settings: PondokSettings | null;
    syncedAt?: string;
    isLegacyGas?: boolean;
    legacySantriSummary?: PortalSantriSummary[];
}> => {
    const bundle = await fetchPortalSettingsFromGas(gasEndpoint, portalId, apiKey);
    return {
        settings: bundle.settings,
        syncedAt: bundle.updatedAt,
        isLegacyGas: !bundle.serverAuthSupported,
        legacySantriSummary: bundle.santriSummary,
    };
};

/**
 * Login santri langsung di sisi server Google Apps Script (action=loginSantri)
 * sehingga GAS hanya mengembalikan 1 record santri yang cocok dengan kombinasi NIS + Tanggal Lahir.
 */
export const loginPortalSantriViaGas = async (
    gasEndpoint: string,
    portalId: string,
    nis: string,
    dob: string,
    apiKey?: string,
    fallbackSantriList?: Array<PortalSantriSummary | EncryptedPortalSantriRecord>,
    pin?: string,
    preferE2eeOnly: boolean = false
): Promise<PortalSantriSummary | null> => {
    const cleanNis = normalizePortalNis(nis);
    const cleanDob = normalizePortalDob(dob);
    const normPin = normalizePortalPin(pin);
    const authHashes = isWebCryptoAvailable()
        ? await derivePortalAuthHashCandidates(portalId, nis, dob, normPin)
        : [];
    const pinAuthHash = normPin && isWebCryptoAvailable()
        ? await derivePortalPinVerificationHash(portalId, nis, normPin)
        : '';

    // 1. Verifikasi Zero-Knowledge E2EE via POST terlebih dahulu (PBKDF2 v4+PIN -> v3 -> v2 -> SHA-256 v1)
    try {
        for (const candidateHash of authHashes) {
            let result: PortalFetchResponse | null = null;
            try {
                const resPost = await fetch(gasEndpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify({
                        action: 'loginSantri',
                        portalId,
                        apiKey,
                        nis: candidateHash,
                        dob: 'e2ee',
                        ...(pinAuthHash ? { pinAuthHash } : {}),
                    }),
                });
                if (resPost.ok) {
                    result = await resPost.json();
                }
            } catch {
                result = null;
            }

            // Kompatibilitas dengan GAS v2 lama yang hanya melayani doGet untuk hash e2ee (tanpa plaintext nis/dob)
            if (!result || (result.success === false && String(result.message || '').includes('Action POST tidak valid'))) {
                const urlE2ee = new URL(gasEndpoint);
                urlE2ee.searchParams.set('action', 'loginSantri');
                urlE2ee.searchParams.set('portalId', portalId);
                urlE2ee.searchParams.set('nis', candidateHash);
                urlE2ee.searchParams.set('dob', 'e2ee');
                if (apiKey) {
                    urlE2ee.searchParams.set('apiKey', apiKey);
                }
                const resE2ee = await fetch(urlE2ee.toString(), { method: 'GET' });
                if (resE2ee.ok) {
                    result = await resE2ee.json();
                }
            }

            if (result?.success && result.data?.santri) {
                const candidate = result.data.santri;
                if (isEncryptedPortalRecord(candidate)) {
                    return await decryptPortalSantriSummary<PortalSantriSummary>(candidate, portalId, nis, dob, normPin);
                }
                if (candidate.pinAuthHash && candidate.pinAuthHash !== pinAuthHash) {
                    return null;
                }
                return candidate as PortalSantriSummary;
            }
        }
    } catch (err) {
        console.warn('Server-side E2EE login check:', err);
    }

    // 2. Portal non-E2EE: hanya gunakan body POST (tidak pernah kirim plaintext nis+dob via query string URL)
    if (!preferE2eeOnly) {
        try {
            const response = await fetch(gasEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({
                    action: 'loginSantri',
                    portalId,
                    apiKey,
                    nis: cleanNis,
                    dob: cleanDob,
                    ...(pinAuthHash ? { pinAuthHash } : {}),
                }),
            });
            if (response.ok) {
                const result: PortalFetchResponse = await response.json();
                if (result.success && result.data?.santri) {
                    const candidate = result.data.santri;
                    if (isEncryptedPortalRecord(candidate)) {
                        return await decryptPortalSantriSummary<PortalSantriSummary>(candidate, portalId, nis, dob, normPin);
                    }
                    if (candidate.pinAuthHash && candidate.pinAuthHash !== pinAuthHash) {
                        return null;
                    }
                    return candidate as PortalSantriSummary;
                }
            }
        } catch (err) {
            console.warn('Server-side POST login check:', err);
        }
    }

    // 3. Fallback data lokal/legacy tersemat jika server belum mendukung action loginSantri
    if (Array.isArray(fallbackSantriList) && fallbackSantriList.length > 0) {
        const matched = fallbackSantriList.find((santri) => {
            if (isEncryptedPortalRecord(santri)) {
                return authHashes.includes(santri.nis);
            }
            const santriNis = normalizePortalNis(santri.nis);
            const santriDob = normalizePortalDob(santri.tanggalLahir);
            if (santriNis !== cleanNis || santriDob !== cleanDob) return false;
            if (santri.pinAuthHash && santri.pinAuthHash !== pinAuthHash) return false;
            return true;
        });
        if (!matched) return null;
        if (isEncryptedPortalRecord(matched)) {
            return await decryptPortalSantriSummary<PortalSantriSummary>(matched, portalId, nis, dob, normPin);
        }
        return matched;
    }

    return null;
};

export const submitPortalPsbToGas = async (
    gasEndpoint: string,
    portalId: string,
    fields: Record<string, any>,
    apiKey?: string
): Promise<PortalFetchResponse> => {
    const cleanFields = sanitizePsbSubmissionFields(fields || {});
    if (!String(cleanFields.nomorRegistrasi || '').trim()) {
        cleanFields.nomorRegistrasi = makeRegNumber();
    }
    // Hindari menggandakan payload base64 file (cukup dikirim sekali pada summary/payload utama)
    const sanitizedSummaryFields: Record<string, any> = {};
    Object.keys(cleanFields).forEach((k) => {
        const val = cleanFields[k];
        if (val && typeof val === 'object' && (val as any).isFile) {
            sanitizedSummaryFields[k] = `[FILE_UPLOAD: ${(val as any).name || k}]`;
        } else {
            sanitizedSummaryFields[k] = val;
        }
    });

    const response = await fetch(gasEndpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({
            action: 'submitPortalPsb',
            portalId,
            apiKey,
            ...cleanFields,
            fields: sanitizedSummaryFields,
            submittedAt: new Date().toISOString(),
        }),
    });

    if (!response.ok) {
        throw new Error(`Gagal menyimpan pendaftaran portal (HTTP ${response.status}).`);
    }

    let result: PortalFetchResponse = {};
    try {
        result = await response.json();
    } catch {
        const text = await response.text();
        if (!text) {
            result = { success: true };
        } else {
            try {
                result = JSON.parse(text);
            } catch {
                throw new Error(`Respon GAS tidak valid JSON: ${text.slice(0, 200)}`);
            }
        }
    }
    if (result?.success === false) {
        throw new Error(result?.message || 'Gagal menyimpan pendaftaran ke GAS.');
    }
    return result;
};

const BULAN_NAMES = [
    '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export const buildFullPortalPayload = async (settings: PondokSettings): Promise<{ payload: any; activeSantri: any[]; syncedAt: string; portalId: string }> => {
    const portalId = ensurePortalId(settings);

    const [
        santri,
        absensi,
        tagihan,
        pembayaran,
        saldoSantri,
        transaksiSaldo,
        kesehatanRecords,
        tahfizh,
        sirkulasi,
        buku,
        raporRecords,
    ] = await Promise.all([
        db.santri.toArray(),
        db.absensi.toArray(),
        db.tagihan.toArray(),
        db.pembayaran.toArray(),
        db.saldoSantri.toArray(),
        db.transaksiSaldo.toArray(),
        db.kesehatanRecords.toArray(),
        db.tahfizh.toArray(),
        db.sirkulasi.toArray(),
        db.buku.toArray(),
        db.raporRecords.toArray(),
    ]);

    const now = new Date();
    const syncedAt = now.toISOString();
    const today = syncedAt.slice(0, 10);
    const currentMonthPrefix = syncedAt.slice(0, 7); // YYYY-MM
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const bulanLabel = `${BULAN_NAMES[currentMonth] || ''} ${currentYear}`;

    const jenjangMap = new Map((settings.jenjang || []).map((j) => [j.id, j.nama]));
    const kelasMap = new Map((settings.kelas || []).map((k) => [k.id, k.nama]));
    const kelasObjMap = new Map((settings.kelas || []).map((k) => [k.id, k]));
    const rombelMap = new Map((settings.rombel || []).map((r) => [r.id, r]));
    const guruMap = new Map((settings.tenagaPengajar || []).map((g) => [g.id, g.nama]));
    const mapelMap = new Map((settings.mataPelajaran || []).map((m) => [m.id, m.nama]));
    const gedungMap = new Map((settings.gedungAsrama || []).map((g) => [g.id, g.nama]));
    const kamarMap = new Map((settings.kamar || []).map((k) => [k.id, k]));
    const bukuMap = new Map(buku.filter((b) => !b.deleted).map((b) => [b.id, b]));

    // Hanya sertakan Santri dengan status 'Aktif' (Alumni / Lulus / Keluar otomatis disaring agar cloud payload tetap ramping)
    const activeSantri = santri.filter((s) => {
        if (s.deleted) return false;
        const st = (s.status || '').trim().toLowerCase();
        return st === 'aktif';
    });

    // Sanitasi portalConfig & psbConfig agar tidak menyertakan gasAdminKey/cloudAdminKey ke objek publik
    const publicPortalConfig = settings.portalConfig
        ? {
            ...settings.portalConfig,
            gasApiKey: '', // Jangan ekspos token API di profil publik
            gasPublicKey: '',
            gasAdminKey: '',
        }
        : undefined;
    const sanitizedPsbConfig = settings.psbConfig
        ? {
            ...settings.psbConfig,
            cloudAdminKey: '',
            templates: Array.isArray(settings.psbConfig.templates)
                ? settings.psbConfig.templates.map((t) => ({ ...t, cloudAdminKey: '' }))
                : undefined,
        }
        : undefined;

    const payload = {
        metadata: {
            updatedAt: syncedAt,
            portalId,
            source: 'esantri-web-v2',
        },
        settings: {
            namaYayasan: settings.namaYayasan,
            namaPonpes: settings.namaPonpes,
            alamat: settings.alamat,
            telepon: settings.telepon,
            email: settings.email,
            website: settings.website,
            logoPonpesUrl: settings.logoPonpesUrl || '',
            tahunAjaranAktif: settings.tahunAjaranAktif || '',
            semesterAktif: settings.semesterAktif || 'Ganjil',
            psbConfig: sanitizedPsbConfig,
            portalConfig: publicPortalConfig,
            jenjang: settings.jenjang,
            kelas: settings.kelas,
            rombel: settings.rombel,
        },
        santriSummary: activeSantri.map((s): PortalSantriSummary => {
            const rombelObj = rombelMap.get(s.rombelId);
            const waliKelasNama = rombelObj?.waliKelasId ? (guruMap.get(rombelObj.waliKelasId) || '-') : '-';
            const kamarObj = s.kamarId ? kamarMap.get(s.kamarId) : undefined;
            const gedungNama = kamarObj ? (gedungMap.get(kamarObj.gedungId) || '') : (s.gedungId ? (gedungMap.get(s.gedungId) || '') : '');
            const musyrifNama = kamarObj?.musyrifId ? (guruMap.get(kamarObj.musyrifId) || '-') : '-';

            // Presensi Hari Ini & Rekap Bulan Berjalan (Filter soft-deleted records)
            const santriAbsensi = absensi.filter((a) => a.santriId === s.id && !(a as any).deleted);
            const todayAttendance = santriAbsensi.find((a) => a.tanggal === today);
            const monthAbsensi = santriAbsensi.filter((a) => (a.tanggal || '').startsWith(currentMonthPrefix));
            const rekapBulanIni = {
                hadir: monthAbsensi.filter((a) => a.status === 'H').length,
                sakit: monthAbsensi.filter((a) => a.status === 'S').length,
                izin: monthAbsensi.filter((a) => a.status === 'I').length,
                alpha: monthAbsensi.filter((a) => a.status === 'A').length,
                bulanLabel,
            };

            // Keuangan: Tagihan, Pembayaran, Tabungan (Perhitungkan cicilan sudahDicicil)
            const saldo = saldoSantri.find((saldoItem) => saldoItem.santriId === s.id)?.saldo || 0;
            const santriMutasi = transaksiSaldo
                .filter((t) => t.santriId === s.id && !t.deleted)
                .sort((a, b) => b.tanggal.localeCompare(a.tanggal))
                .slice(0, 5)
                .map((t) => ({
                    tanggal: t.tanggal,
                    jenis: t.jenis,
                    jumlah: t.jumlah,
                    keterangan: t.keterangan || '-',
                    saldoSetelah: t.saldoSetelah,
                }));

            const unpaidBills = tagihan
                .filter((bill) => bill.santriId === s.id && !bill.deleted && bill.status !== 'Lunas')
                .sort((a, b) => (b.tahun * 100 + b.bulan) - (a.tahun * 100 + a.bulan));

            const getRemainingBill = (bill: any) => Math.max(0, (bill.nominal || 0) - (bill.sudahDicicil || 0));
            const monthBills = unpaidBills.filter((bill) => bill.bulan === currentMonth && bill.tahun === currentYear);
            const tunggakanBulanIni = monthBills.reduce((sum, bill) => sum + getRemainingBill(bill), 0);
            const totalTunggakan = unpaidBills.reduce((sum, bill) => sum + getRemainingBill(bill), 0);

            const daftarTunggakan: PortalBillItem[] = unpaidBills.slice(0, 12).map((bill) => ({
                id: bill.id,
                deskripsi: bill.deskripsi,
                bulan: bill.bulan,
                tahun: bill.tahun,
                nominal: getRemainingBill(bill),
                sudahDicicil: bill.sudahDicicil,
            }));

            const pembayaranTerakhir: PortalPaymentItem[] = pembayaran
                .filter((p) => p.santriId === s.id && !p.deleted)
                .sort((a, b) => b.tanggal.localeCompare(a.tanggal))
                .slice(0, 5)
                .map((p) => ({
                    id: p.id,
                    tanggal: p.tanggal,
                    jumlah: p.jumlah,
                    metode: p.metode,
                    catatan: p.catatan,
                }));

            // Tahfizh (Filter soft-deleted records & hitung Juz unik)
            const santriTahfizh = tahfizh
                .filter((t) => t.santriId === s.id && !(t as any).deleted)
                .sort((a, b) => b.tanggal.localeCompare(a.tanggal));
            const latestTahfizh = santriTahfizh[0];
            const uniqueJuzSet = new Set<number>();
            santriTahfizh.forEach((t) => {
                if (t.juz && Number(t.juz) > 0) uniqueJuzSet.add(Number(t.juz));
            });
            const totalJuzHafalan = uniqueJuzSet.size;
            const riwayatTahfizh: PortalTahfizhItem[] = santriTahfizh.slice(0, 5).map((t) => ({
                tanggal: t.tanggal,
                tipe: t.tipe,
                juz: t.juz,
                surah: t.surah,
                ayat: `${t.ayatAwal}-${t.ayatAkhir}`,
                predikat: t.predikat,
                nilaiAngka: t.nilaiAngka,
                catatan: t.catatan,
            }));

            // Akademik: Rapor Terakhir & Catatan Prestasi/Pembinaan
            const semesterOrder = (sem?: string) => {
                const low = (sem || '').trim().toLowerCase();
                if (low.includes('genap') || low === '2' || low === 'ii') return 2;
                if (low.includes('ganjil') || low.includes('gasal') || low === '1' || low === 'i') return 1;
                return 0;
            };
            const santriRapors = raporRecords
                .filter((r) => r.santriId === s.id && !(r as any).deleted)
                .sort((a, b) =>
                    (b.tahunAjaran || '').localeCompare(a.tahunAjaran || '') ||
                    semesterOrder(b.semester) - semesterOrder(a.semester) ||
                    (b.lastModified || 0) - (a.lastModified || 0) ||
                    (b.tanggalRapor || '').localeCompare(a.tanggalRapor || '')
                );

            let raporTerakhir: PortalRaporSummary | null = null;
            for (const candidateRapor of santriRapors) {
                const nilaiList = Array.isArray(candidateRapor.nilai) ? candidateRapor.nilai : [];
                let parsedCustom: Record<string, any> = {};
                if (candidateRapor.customData) {
                    try {
                        parsedCustom = typeof candidateRapor.customData === 'string'
                            ? JSON.parse(candidateRapor.customData)
                            : candidateRapor.customData;
                    } catch {
                        parsedCustom = {};
                    }
                }

                const effRombelId = s.rombelId || candidateRapor.rombelId || 0;
                const rObj = effRombelId ? rombelMap.get(effRombelId) : undefined;
                const effKelasId = rObj?.kelasId || s.kelasId || candidateRapor.kelasId || 0;
                const kObj = effKelasId ? kelasObjMap.get(effKelasId) : undefined;
                const effJenjangId = kObj?.jenjangId || s.jenjangId || candidateRapor.jenjangId || 0;
                const masterMapel = settings.mataPelajaran || [];
                const resolvedJenjangArg = effJenjangId || undefined;

                let mapelItems: Array<{ nama: string; nilai: number; predikat: string }> = [];
                if (nilaiList.length > 0) {
                    const validScores = nilaiList.filter((n) => typeof n.nilaiAngka === 'number' && !isNaN(n.nilaiAngka));
                    mapelItems = validScores.map((n) => ({
                        nama: mapelMap.get(n.mapelId) || `Mapel #${n.mapelId}`,
                        nilai: n.nilaiAngka,
                        predikat: n.predikat || calculatePredikat(n.nilaiAngka).predikatHuruf,
                    }));
                } else if (Object.keys(parsedCustom).length > 0) {
                    const templates = settings.raporTemplates || [];
                    const matchedTpl =
                        (effRombelId ? templates.find((t) => t.rombelId === effRombelId) : undefined) ||
                        (effJenjangId && effKelasId ? templates.find((t) => t.jenjangId === effJenjangId && t.kelasId === effKelasId && !t.rombelId) : undefined) ||
                        (effJenjangId ? templates.find((t) => t.jenjangId === effJenjangId && !t.kelasId && !t.rombelId) : undefined) ||
                        templates.find((t) => !t.jenjangId) ||
                        templates[0];

                    const subjectCols = matchedTpl
                        ? extractTemplateKeys(matchedTpl, 'all').filter((tk) =>
                              isSubjectGradeKey(tk.key, tk.inputMode, tk.label, tk.type, masterMapel, resolvedJenjangArg)
                          )
                        : [];

                    if (subjectCols.length > 0) {
                        subjectCols.forEach((sc) => {
                            const raw = parsedCustom[sc.key];
                            if (raw === undefined || raw === null) return;
                            const sv = String(raw).trim();
                            if (sv === '' || sv === '-') return; // Skip untaught '-' or blank subjects
                            const num = Number(sv.replace(',', '.'));
                            if (!isNaN(num) && isFinite(num)) {
                                mapelItems.push({
                                    nama: sc.label || sc.key,
                                    nilai: num,
                                    predikat: calculatePredikat(num).predikatHuruf,
                                });
                            }
                        });
                    } else {
                        Object.entries(parsedCustom).forEach(([k, raw]) => {
                            if (!k || k.startsWith('_') || !isSubjectGradeKey(k, undefined, k, undefined, masterMapel, resolvedJenjangArg)) return;
                            if (raw === undefined || raw === null) return;
                            const sv = String(raw).trim();
                            if (sv === '' || sv === '-') return;
                            const num = Number(sv.replace(',', '.'));
                            if (!isNaN(num) && isFinite(num) && num >= 0 && num <= 100) {
                                mapelItems.push({
                                    nama: k.replace(/_/g, ' '),
                                    nilai: num,
                                    predikat: calculatePredikat(num).predikatHuruf,
                                });
                            }
                        });
                    }
                }

                const hasNumericScores = mapelItems.length > 0;
                const rataRata = hasNumericScores
                    ? Math.round((mapelItems.reduce((acc, m) => acc + m.nilai, 0) / mapelItems.length) * 10) / 10
                    : 0;
                const rawKep = candidateRapor.keputusan || String(parsedCustom.KEPUTUSAN || parsedCustom.keputusan || parsedCustom.STATUS_NAIK || '').trim();
                const resolvedKeputusan = rawKep && rawKep !== '-' ? rawKep : undefined;
                const rawCat = candidateRapor.catatanWaliKelas || String(parsedCustom.CATATAN_WALI_KELAS || parsedCustom.catatanWaliKelas || parsedCustom.CATATAN_WALI || parsedCustom.catatan_wali || parsedCustom.CATATAN || '').trim();
                const resolvedCatatan = rawCat && rawCat !== '-' ? rawCat : undefined;

                if (hasNumericScores || resolvedKeputusan || resolvedCatatan) {
                    raporTerakhir = {
                        tahunAjaran: candidateRapor.tahunAjaran || settings.tahunAjaranAktif || '-',
                        semester: candidateRapor.semester || settings.semesterAktif || 'Ganjil',
                        rataRata,
                        hasNumericScores,
                        keputusan: resolvedKeputusan,
                        catatanWaliKelas: resolvedCatatan,
                        mapel: mapelItems.slice(0, 16),
                    };
                    break;
                }
            }

            const prestasiItems: PortalCatatanItem[] = (s.prestasi || []).slice(-3).reverse().map((pr) => ({
                kategori: 'Prestasi',
                deskripsi: `${pr.nama} (${pr.tingkat || pr.jenis || 'Pondok'})`,
                tanggal: pr.tahun ? String(pr.tahun) : '',
                tindakLanjut: pr.penyelenggara || '',
            }));
            const pelanggaranItems: PortalCatatanItem[] = (s.pelanggaran || []).slice(-3).reverse().map((pl) => ({
                kategori: 'Pembinaan',
                deskripsi: `[${pl.jenis}] ${pl.deskripsi}`,
                tanggal: pl.tanggal || '',
                tindakLanjut: pl.tindakLanjut || '',
            }));
            const catatanPembinaan: PortalCatatanItem[] = [...prestasiItems, ...pelanggaranItems].slice(0, 5);

            // Kesehatan
            const santriHealth = kesehatanRecords
                .filter((k) => k.santriId === s.id && !k.deleted)
                .sort((a, b) => b.tanggal.localeCompare(a.tanggal));
            const latestHealth = santriHealth[0];
            const riwayatKesehatan: PortalHealthItem[] = santriHealth.slice(0, 3).map((k) => ({
                tanggal: k.tanggal,
                status: k.status,
                diagnosa: k.diagnosa || '',
                keluhan: k.keluhan || '',
                tindakan: k.tindakan || '',
                suhuTubuh: k.suhuTubuh,
            }));

            // Perpustakaan (Filter soft-deleted records)
            const activeLoans = sirkulasi.filter((item) => item.santriId === s.id && !(item as any).deleted && item.status === 'Dipinjam');
            const daftarPinjamanBuku: PortalBookLoanItem[] = activeLoans.map((loan) => {
                const bk = bukuMap.get(loan.bukuId);
                return {
                    judul: bk?.judul || `Buku #${loan.bukuId}`,
                    kodeBuku: bk?.kodeBuku || '-',
                    tanggalPinjam: loan.tanggalPinjam,
                    tanggalKembaliSeharusnya: loan.tanggalKembaliSeharusnya,
                };
            });

            return {
                id: s.id,
                nis: s.nis,
                nisn: s.nisn || '',
                namaLengkap: s.namaLengkap,
                jenisKelamin: s.jenisKelamin,
                tanggalLahir: s.tanggalLahir,
                jenjangId: s.jenjangId,
                kelasId: s.kelasId,
                rombelId: s.rombelId,
                jenjangNama: jenjangMap.get(s.jenjangId) || '-',
                kelasNama: kelasMap.get(s.kelasId) || '-',
                rombelNama: rombelObj?.nama || '-',
                waliKelasNama,
                asramaNama: gedungNama || '-',
                kamarNama: kamarObj?.nama || '-',
                musyrifNama,
                statusSantri: s.status || 'Aktif',
                namaWali: s.namaWali || s.namaAyah || s.namaIbu || '',
                teleponWali: s.teleponWali || s.teleponAyah || s.teleponIbu || '',
                attendanceToday: todayAttendance?.status || 'Belum Absen',
                rekapBulanIni,
                saldoTabungan: saldo,
                mutasiTabungan: santriMutasi,
                tunggakanBulanIni,
                totalTunggakan,
                daftarTunggakan,
                pembayaranTerakhir,
                targetJuz: s.targetJuz,
                totalJuzHafalan,
                raporTerakhir,
                catatanPembinaan,
                tahfizhTerakhir: latestTahfizh
                    ? {
                        tanggal: latestTahfizh.tanggal,
                        tipe: latestTahfizh.tipe,
                        juz: latestTahfizh.juz,
                        surah: latestTahfizh.surah,
                        ayat: `${latestTahfizh.ayatAwal}-${latestTahfizh.ayatAkhir}`,
                        predikat: latestTahfizh.predikat,
                    }
                    : null,
                riwayatTahfizh,
                kesehatanTerakhir: latestHealth
                    ? {
                        tanggal: latestHealth.tanggal,
                        status: latestHealth.status,
                        diagnosa: latestHealth.diagnosa || '',
                        suhuTubuh: latestHealth.suhuTubuh,
                        keluhan: latestHealth.keluhan || '',
                        tindakan: latestHealth.tindakan || '',
                    }
                    : null,
                riwayatKesehatan,
                pinjamanBukuAktif: activeLoans.length,
                daftarPinjamanBuku,
            };
        }),
    };

    const pinBySantriId = new Map<number, string>();
    activeSantri.forEach((s) => {
        const cleanPin = normalizePortalPin(s.portalPin);
        if (cleanPin) pinBySantriId.set(s.id, cleanPin);
    });

    const portalE2eeActive = Boolean(settings.e2eeConfig?.enabled && settings.e2eeConfig?.modules?.portal);
    if (portalE2eeActive && Array.isArray(payload.santriSummary) && payload.santriSummary.length > 0) {
        payload.santriSummary = (await Promise.all(
            payload.santriSummary.map((item) => encryptPortalSantriSummary(item, portalId, pinBySantriId.get(item.id)))
        )) as any[];
    } else if (Array.isArray(payload.santriSummary) && payload.santriSummary.length > 0) {
        payload.santriSummary = await Promise.all(
            payload.santriSummary.map(async (item) => {
                const pin = pinBySantriId.get(item.id);
                if (!pin || !isWebCryptoAvailable()) return item;
                const pinAuthHash = await derivePortalPinVerificationHash(portalId, item.nis, pin);
                return pinAuthHash ? { ...item, pinAuthHash } : item;
            })
        );
    }

    return {
        payload,
        activeSantri,
        syncedAt,
        portalId,
    };
};

export const syncPortalBridgeToGas = async (settings: PondokSettings): Promise<{ syncedCount: number; santriCount: number; syncedAt: string; payloadSize: number }> => {
    const gasEndpoint = ensureGasEndpoint(settings);
    const { payload, activeSantri, syncedAt, portalId } = await buildFullPortalPayload(settings);

    const adminKey = (settings.portalConfig?.gasAdminKey || '').trim();
    const publicKey = (settings.portalConfig?.gasPublicKey || settings.portalConfig?.gasApiKey || '').trim();

    const response = await fetch(gasEndpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({
            action: 'upsertPortalConfig',
            portalId,
            adminKey,
            apiKey: publicKey,
            payload,
        }),
    });

    if (!response.ok) {
        throw new Error(`Gagal sinkronisasi portal ke GAS (HTTP ${response.status}).`);
    }

    let result: PortalFetchResponse = {};
    const rawRespText = await response.text().catch(() => '');
    if (rawRespText) {
        try {
            result = JSON.parse(rawRespText);
        } catch {
            throw new Error(`Respon GAS tidak valid JSON: ${rawRespText.slice(0, 200)}`);
        }
    }
    if (result?.success === false) {
        throw new Error(result?.message || 'Sinkronisasi portal ke GAS gagal.');
    }

    const payloadStr = JSON.stringify(payload);
    return {
        syncedCount: activeSantri.length,
        santriCount: activeSantri.length,
        syncedAt,
        payloadSize: payloadStr.length,
    };
};

export const buildPublicPsbConfigPayload = (
    settings: PondokSettings,
    overridePsbConfig?: PsbConfig,
    overridePsbE2eeFingerprint?: string
): { payload: any; syncedAt: string; portalId: string } => {
    const portalId = settings.portalConfig?.portalId?.trim() || 'psb-online';
    const syncedAt = new Date().toISOString();
    const effectivePsbConfig = overridePsbConfig || settings.psbConfig;
    const publicPortalConfig = settings.portalConfig
        ? {
            ...settings.portalConfig,
            gasApiKey: '',
            gasPublicKey: '',
            gasAdminKey: '',
        }
        : undefined;
    const sanitizedPsbConfig = effectivePsbConfig
        ? {
            ...effectivePsbConfig,
            cloudAdminKey: '',
            templates: Array.isArray(effectivePsbConfig.templates)
                ? effectivePsbConfig.templates.map((t) => ({ ...t, cloudAdminKey: '' }))
                : undefined,
        }
        : undefined;

    const effectiveFp = overridePsbE2eeFingerprint || settings.e2eeConfig?.publicKeyFingerprint || '';
    const psbE2ee =
        settings.e2eeConfig?.enabled &&
        settings.e2eeConfig?.modules?.psb &&
        settings.e2eeConfig?.publicKeySpki &&
        settings.e2eeConfig?.keyId
            ? {
                enabled: true,
                keyId: settings.e2eeConfig.keyId,
                publicKeySpki: settings.e2eeConfig.publicKeySpki,
                ...(effectiveFp ? { fingerprint: effectiveFp } : {}),
            }
            : undefined;

    const payload = {
        metadata: {
            updatedAt: syncedAt,
            portalId,
            source: 'esantri-psb-sync-v3',
        },
        settings: {
            namaYayasan: settings.namaYayasan,
            namaPonpes: settings.namaPonpes,
            alamat: settings.alamat,
            telepon: settings.telepon,
            email: settings.email,
            website: settings.website,
            logoPonpesUrl: settings.logoPonpesUrl || '',
            tahunAjaranAktif: settings.tahunAjaranAktif || '',
            semesterAktif: settings.semesterAktif || 'Ganjil',
            psbConfig: sanitizedPsbConfig,
            portalConfig: publicPortalConfig,
            jenjang: settings.jenjang,
            kelas: settings.kelas,
            rombel: settings.rombel,
        },
        ...(psbE2ee ? { psbE2ee } : {}),
        santriSummary: [],
    };

    return { payload, syncedAt, portalId };
};

export const syncPsbPublicConfigToGas = async (
    settings: PondokSettings,
    overridePsbConfig?: PsbConfig,
    overrideGasUrl?: string
): Promise<{ syncedUrls: string[]; syncedAt: string; payloadSize: number }> => {
    const effectivePsbConfig = overridePsbConfig || settings.psbConfig;
    const portalGasUrl = settings.portalConfig?.gasEndpoint?.trim() || '';
    const isValidGas = (u?: string) => Boolean(u && /^https:\/\/script\.google\.com\/(?:a\/(?:macros\/[^/\s]+\/|[^/\s]+\/macros\/)|macros\/)s\/[^/\s]+\/exec(?:\?.*)?$/i.test(u.trim()));

    const candidateUrls = new Set<string>();
    if (isValidGas(overrideGasUrl)) candidateUrls.add(overrideGasUrl!.trim());
    if (isValidGas(effectivePsbConfig?.googleScriptUrl)) candidateUrls.add(effectivePsbConfig!.googleScriptUrl!.trim());
    if (Array.isArray(effectivePsbConfig?.templates)) {
        effectivePsbConfig.templates.forEach((tpl) => {
            if (isValidGas(tpl.googleScriptUrl)) {
                candidateUrls.add(tpl.googleScriptUrl!.trim());
            }
        });
    }
    if (candidateUrls.size === 0 && isValidGas(portalGasUrl)) {
        candidateUrls.add(portalGasUrl);
    }

    if (candidateUrls.size === 0) {
        throw new Error('URL Google Apps Script (GAS) PSB belum diisi atau belum valid (/exec).');
    }

    let psbE2eeFp = settings.e2eeConfig?.publicKeyFingerprint || '';
    if (!psbE2eeFp && settings.e2eeConfig?.enabled && settings.e2eeConfig?.modules?.psb && settings.e2eeConfig?.publicKeySpki) {
        psbE2eeFp = await computePublicKeyFingerprint(settings.e2eeConfig.publicKeySpki).catch(() => '');
    }
    const { payload: publicPayload, syncedAt, portalId } = buildPublicPsbConfigPayload(settings, effectivePsbConfig, psbE2eeFp);
    const syncedUrls: string[] = [];
    let lastSize = JSON.stringify(publicPayload).length;

    for (const targetUrl of Array.from(candidateUrls)) {
        // Jika target URL sama persis dengan Portal Wali GAS, pertahankan santriSummary agar Portal Wali tidak kosong!
        let payloadToSend = publicPayload;
        if (portalGasUrl && targetUrl === portalGasUrl) {
            const mergedSettings: PondokSettings = {
                ...settings,
                psbConfig: effectivePsbConfig,
            };
            const fullBuilt = await buildFullPortalPayload(mergedSettings);
            payloadToSend = fullBuilt.payload;
        }
        lastSize = JSON.stringify(payloadToSend).length;

        const adminKey = (settings.portalConfig?.gasAdminKey || effectivePsbConfig?.cloudAdminKey || '').trim();
        const publicKey = (settings.portalConfig?.gasPublicKey || settings.portalConfig?.gasApiKey || '').trim();
        const response = await fetch(targetUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            },
            body: JSON.stringify({
                action: 'upsertPortalConfig',
                portalId,
                adminKey,
                apiKey: publicKey,
                payload: payloadToSend,
            }),
        });

        if (!response.ok) {
            throw new Error(`Gagal sinkronisasi formulir PSB ke GAS (HTTP ${response.status}).`);
        }

        let result: PortalFetchResponse = {};
        const rawRespText = await response.text().catch(() => '');
        if (rawRespText) {
            try {
                result = JSON.parse(rawRespText);
            } catch {
                throw new Error(`Respon GAS tidak valid JSON: ${rawRespText.slice(0, 200)}`);
            }
        }
        if (result?.success === false) {
            throw new Error(result?.message || 'Sinkronisasi konfigurasi PSB ke GAS gagal.');
        }
        syncedUrls.push(targetUrl);
    }

    return {
        syncedUrls,
        syncedAt,
        payloadSize: lastSize,
    };
};

export const syncPortalToCloudflare = async (settings: PondokSettings): Promise<{ syncedCount: number; santriCount: number; syncedAt: string; payloadSize: number }> => {
    const workerUrl = settings.portalConfig?.cloudflareWorkerUrl?.trim();
    if (!workerUrl) {
        throw new Error('URL Cloudflare Worker belum diisi. Masukkan URL Worker Anda terlebih dahulu.');
    }
    const apiKey = settings.portalConfig?.cloudflareApiKey || '';
    const { payload, activeSantri, syncedAt, portalId } = await buildFullPortalPayload(settings);

    const response = await fetch(workerUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(apiKey ? { 'X-API-Key': apiKey } : {}),
        },
        body: JSON.stringify({
            action: 'upsertPortalConfig',
            portalId,
            apiKey,
            payload,
        }),
    });

    if (!response.ok) {
        throw new Error(`Gagal sinkronisasi ke Cloudflare Worker (HTTP ${response.status}).`);
    }

    const payloadStr = JSON.stringify(payload);
    return {
        syncedCount: activeSantri.length,
        santriCount: activeSantri.length,
        syncedAt,
        payloadSize: payloadStr.length,
    };
};

export const syncPortalToFirebase = async (settings: PondokSettings): Promise<{ syncedCount: number; santriCount: number; syncedAt: string; payloadSize: number }> => {
    if (!isFirebaseClientConfigReady) {
        throw new Error('Konfigurasi Firebase belum lengkap. Pastikan project Firebase sudah diatur di Pengaturan > Sinkronisasi Cloud.');
    }

    const { auth, db: fdb, collection, doc, getDocs, setDoc, writeBatch } = await import('../firebase');
    const targetTenantId = settings.cloudSyncConfig?.firebasePairedTenantId?.trim() || auth?.currentUser?.uid || '';
    if (!targetTenantId) {
        throw new Error('Tenant Firebase belum terhubung atau admin belum login Firebase Sync. Silakan hubungkan Firebase di Pengaturan > Sinkronisasi Cloud.');
    }

    const { payload, activeSantri, syncedAt, portalId } = await buildFullPortalPayload(settings);
    const santriList: any[] = Array.isArray(payload.santriSummary) ? payload.santriSummary : [];

    const sanitizedPortalConfig = payload.settings?.portalConfig
        ? {
            ...payload.settings.portalConfig,
            gasEndpoint: '',
            gasApiKey: '',
            gasPublicKey: '',
            gasAdminKey: '',
            encryptedKey: settings.portalConfig?.gasEndpoint
                ? encodePortalKey(
                      settings.portalConfig.gasEndpoint,
                      portalId,
                      settings.portalConfig.gasPublicKey || settings.portalConfig.gasApiKey || ''
                  )
                : '',
        }
        : {};

    let psbE2eeFp = settings.e2eeConfig?.publicKeyFingerprint || '';
    if (!psbE2eeFp && settings.e2eeConfig?.enabled && settings.e2eeConfig?.modules?.psb && settings.e2eeConfig?.publicKeySpki) {
        psbE2eeFp = await computePublicKeyFingerprint(settings.e2eeConfig.publicKeySpki).catch(() => '');
    }
    const psbE2ee =
        settings.e2eeConfig?.enabled &&
        settings.e2eeConfig?.modules?.psb &&
        settings.e2eeConfig?.publicKeySpki &&
        settings.e2eeConfig?.keyId
            ? {
                enabled: true,
                keyId: settings.e2eeConfig.keyId,
                publicKeySpki: settings.e2eeConfig.publicKeySpki,
                ...(psbE2eeFp ? { fingerprint: psbE2eeFp } : {}),
            }
            : null;

    const rootDoc = {
        namaPonpes: settings.namaPonpes || 'Pondok Pesantren',
        logoPonpesUrl: settings.logoPonpesUrl || '',
        telepon: settings.telepon || '',
        email: settings.email || '',
        website: settings.website || '',
        metadata: payload.metadata,
        settings: {
            ...payload.settings,
            portalConfig: sanitizedPortalConfig,
        },
        portalConfig: sanitizedPortalConfig,
        santriSummary: [], // Disimpan terisolasi di subkoleksi entries/{entryId} agar lolos batas 1 MiB & anti-enumeration
        santriCount: santriList.length,
        psbE2ee,
        updatedAt: Date.now(),
    };

    await setDoc(doc(fdb, 'publicPortals', targetTenantId), rootDoc, { merge: true });

    const pinBySantriId = new Map<number, string>();
    activeSantri.forEach((s) => {
        const cleanPin = normalizePortalPin(s.portalPin);
        if (cleanPin) pinBySantriId.set(s.id, cleanPin);
    });

    // Siapkan peta dokumen individual per santri pada publicPortals/{tenantId}/entries/{entryId}
    const targetEntries = new Map<string, any>();
    for (const rec of santriList) {
        const entryId = isEncryptedPortalRecord(rec)
            ? sanitizeFirebasePortalEntryId(rec.nis)
            : (pinBySantriId.get(rec.id)
                ? await deriveFirebasePortalPinLookupKey(portalId, rec.nis, rec.tanggalLahir, pinBySantriId.get(rec.id)!)
                : await deriveFirebasePortalPlainLookupKey(portalId, rec.nis, rec.tanggalLahir));
        if (!entryId) continue;
        targetEntries.set(entryId, {
            ...rec,
            updatedAt: Date.now(),
        });
    }

    const entriesColRef = collection(fdb, 'publicPortals', targetTenantId, 'entries');
    const existingSnap = await getDocs(entriesColRef);

    const ops: Array<{ type: 'set' | 'delete'; id: string; data?: any }> = [];
    existingSnap.forEach((existingDoc) => {
        if (!targetEntries.has(existingDoc.id)) {
            ops.push({ type: 'delete', id: existingDoc.id });
        }
    });
    targetEntries.forEach((entryData, entryId) => {
        ops.push({ type: 'set', id: entryId, data: entryData });
    });

    const BATCH_LIMIT = 450;
    for (let i = 0; i < ops.length; i += BATCH_LIMIT) {
        const chunk = ops.slice(i, i + BATCH_LIMIT);
        const batch = writeBatch(fdb);
        for (const op of chunk) {
            const ref = doc(fdb, 'publicPortals', targetTenantId, 'entries', op.id);
            if (op.type === 'delete') {
                batch.delete(ref);
            } else {
                batch.set(ref, op.data);
            }
        }
        await batch.commit();
    }

    const payloadStr = JSON.stringify(payload);
    return {
        syncedCount: activeSantri.length,
        santriCount: activeSantri.length,
        syncedAt,
        payloadSize: payloadStr.length,
    };
};

export const syncPortalToSupabase = async (settings: PondokSettings): Promise<{ syncedCount: number; santriCount: number; syncedAt: string; payloadSize: number }> => {
    const supabaseUrl = settings.portalConfig?.supabaseUrl?.trim();
    const supabaseAnonKey = settings.portalConfig?.supabaseAnonKey?.trim();
    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('URL Supabase dan Anon Key wajib diisi untuk sinkronisasi Supabase.');
    }
    const tableName = settings.portalConfig?.supabaseTable?.trim() || 'portal_data';
    const { payload, activeSantri, syncedAt, portalId } = await buildFullPortalPayload(settings);

    const cleanUrl = supabaseUrl.replace(/\/+$/, '');
    const endpoint = `${cleanUrl}/rest/v1/${tableName}`;

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${supabaseAnonKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates',
        },
        body: JSON.stringify([{
            portal_id: portalId,
            payload: payload,
            updated_at: syncedAt,
        }]),
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Gagal kirim data ke Supabase (HTTP ${response.status}): ${errText.slice(0, 150)}`);
    }

    const payloadStr = JSON.stringify(payload);
    return {
        syncedCount: activeSantri.length,
        santriCount: activeSantri.length,
        syncedAt,
        payloadSize: payloadStr.length,
    };
};

export const syncPortalData = async (
    settings: PondokSettings
): Promise<{ syncedCount: number; santriCount: number; syncedAt: string; payloadSize: number; providerName: string }> => {
    const provider = settings.portalConfig?.provider || 'gas';

    if (provider === 'gas') {
        const res = await syncPortalBridgeToGas(settings);
        return { ...res, providerName: 'Google Apps Script (GAS)' };
    }

    if (provider === 'cloudflare') {
        const res = await syncPortalToCloudflare(settings);
        return { ...res, providerName: 'Cloudflare Pages / Worker' };
    }

    if (provider === 'firebase') {
        const res = await syncPortalToFirebase(settings);
        return { ...res, providerName: 'Firebase Firestore' };
    }

    if (provider === 'supabase') {
        const res = await syncPortalToSupabase(settings);
        return { ...res, providerName: 'Supabase PostgreSQL' };
    }

    // Standalone
    const { activeSantri, syncedAt, payload } = await buildFullPortalPayload(settings);
    return {
        syncedCount: activeSantri.length,
        santriCount: activeSantri.length,
        syncedAt,
        payloadSize: JSON.stringify(payload).length,
        providerName: 'HTML Mandiri Terenkripsi',
    };
};

export const getPortalCloudflareWorkerScript = (portalId: string = 'ponpes-alikhlas'): string => {
    return `/**
 * Cloudflare Worker Backend for eSantri Portal Wali Santri
 * Bind a KV namespace named PORTAL_KV to this worker
 */
export default {
  async fetch(request, env, ctx) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-API-Key, Authorization"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const action = url.searchParams.get("action");
    const reqPortalId = url.searchParams.get("portalId") || "${portalId}";

    // 1. GET PUBLIC INFO (0% data santri)
    if (request.method === "GET" && (action === "getPortalPublicInfo" || action === "getPortalConfig")) {
      const stored = await env.PORTAL_KV.get("portal_" + reqPortalId, "json");
      if (!stored) {
        return Response.json({ success: false, message: "Data portal belum disinkronkan." }, { headers: corsHeaders });
      }
      return Response.json({
        success: true,
        version: 2,
        portalId: reqPortalId,
        syncedAt: stored.metadata?.updatedAt,
        settings: stored.settings,
        santriCount: stored.santriSummary?.length || 0
      }, { headers: corsHeaders });
    }

    async function sha256HexWorker(input) {
      const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(input || "")));
      return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
    }

    // 2. POST LOGIN SANTRI (Server-Side Verification dengan Rate Limiting KV; tolak query GET plaintext)
    if (action === "loginSantri" && (request.method === "GET" || request.method === "POST")) {
      let body = {};
      if (request.method === "POST") {
        try { body = await request.json(); } catch {}
      }
      const nis = String((body.nis != null ? body.nis : url.searchParams.get("nis")) || "").replace(/\\s+/g, "").toLowerCase();
      const dob = String((body.dob != null ? body.dob : url.searchParams.get("dob")) || "").trim().slice(0, 10);
      const pinAuthHash = String((body.pinAuthHash != null ? body.pinAuthHash : "") || "").trim();
      const targetPortal = String((body.portalId != null ? body.portalId : reqPortalId) || "${portalId}");

      if (request.method === "GET" && dob !== "e2ee") {
        return Response.json({ success: false, message: "Data tidak ditemukan atau kredensial tidak sesuai." }, { status: 400, headers: corsHeaders });
      }

      const clientIp = request.headers.get("CF-Connecting-IP") || "unknown";
      const rlKey = "rl_login_" + await sha256HexWorker(targetPortal + "|" + clientIp + "|" + nis.slice(0, 32));
      const failCount = Number((await env.PORTAL_KV.get(rlKey)) || "0");
      if (failCount >= 5) {
        return Response.json({ success: false, message: "Terlalu banyak percobaan login gagal. Silakan tunggu beberapa menit." }, { status: 429, headers: corsHeaders });
      }

      const stored = await env.PORTAL_KV.get("portal_" + targetPortal, "json");
      if (!stored || !stored.santriSummary) {
        await env.PORTAL_KV.put(rlKey, String(failCount + 1), { expirationTtl: 300 });
        return Response.json({ success: false, message: "Data tidak ditemukan atau kredensial tidak sesuai." }, { headers: corsHeaders });
      }

      const match = stored.santriSummary.find(s =>
        String(s.nis || "").replace(/\\s+/g, "").toLowerCase() === nis &&
        String(s.tanggalLahir || "").trim().slice(0, 10) === dob &&
        (!s.pinAuthHash || String(s.pinAuthHash) === pinAuthHash)
      );

      if (!match) {
        await env.PORTAL_KV.put(rlKey, String(failCount + 1), { expirationTtl: 300 });
        return Response.json({ success: false, message: "Data tidak ditemukan atau kredensial tidak sesuai." }, { headers: corsHeaders });
      }

      await env.PORTAL_KV.delete(rlKey);
      return Response.json({ success: true, version: 2, data: { santri: match }, santri: match }, { headers: corsHeaders });
    }

    function checkPostAuth(request, env, body) {
      if (!env.API_KEY) return true;
      const headerKey = request.headers.get("X-API-Key") || "";
      const auth = request.headers.get("Authorization") || "";
      const bearer = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
      const bodyKey = (body && body.apiKey) ? String(body.apiKey).trim() : "";
      return headerKey === env.API_KEY || bearer === env.API_KEY || bodyKey === env.API_KEY;
    }

    // 3. POST UPSERT FROM ESANTRI WEB ADMIN (Wajib cek env.API_KEY jika diset)
    if (request.method === "POST") {
      let body = {};
      try { body = await request.json(); } catch { body = {}; }
      if (!checkPostAuth(request, env, body)) {
        return Response.json({ success: false, message: "Unauthorized: API Key Worker tidak valid." }, { status: 401, headers: corsHeaders });
      }
      if (body.action === "upsertPortalConfig" && body.payload) {
        await env.PORTAL_KV.put("portal_" + (body.portalId || reqPortalId), JSON.stringify(body.payload));
        return Response.json({ success: true, message: "Berhasil update data portal." }, { headers: corsHeaders });
      }
    }

    return Response.json({ success: false, message: "Endpoint tidak dikenali." }, { headers: corsHeaders });
  }
};`;
};

export const getPortalSupabaseSchemaSql = (): string => {
    return `-- SQL Schema untuk Portal Wali Santri eSantri di Supabase
CREATE TABLE IF NOT EXISTS public.portal_data (
    portal_id TEXT PRIMARY KEY,
    payload JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Aktifkan Row Level Security (RLS)
ALTER TABLE public.portal_data ENABLE ROW LEVEL SECURITY;

-- Izinkan publik membaca profil portal (SELECT)
CREATE POLICY "Public Read Portal Data" 
ON public.portal_data 
FOR SELECT 
USING (true);

-- Izinkan admin eSantri menyimpan data (INSERT / UPDATE)
CREATE POLICY "Admin Upsert Portal Data" 
ON public.portal_data 
FOR ALL 
USING (true) 
WITH CHECK (true);
`;
};

export const getPortalFirebaseGuide = (): string => {
    return `// Aturan Keamanan (firestore.rules) untuk Public Portal di Firebase:
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Dokumen profil publik Portal Wali (tanpa daftar santri)
    match /publicPortals/{tenantId} {
      allow read: if true;
      allow write: if request.auth != null;

      // Subkoleksi entri per santri (Anti-Enumeration & Tanpa Batas 1 MiB)
      match /entries/{entryId} {
        allow get: if true;
        allow list: if request.auth != null;
        allow write: if request.auth != null;
      }
    }
  }
}`;
};

export const getPortalGasScriptV2 = (
    defaultPortalId: string = 'ganti-portal-id-di-sini',
    defaultDriveFolderId: string = '',
    defaultPublicKey: string = '',
    defaultAdminKey: string = ''
): string => {
    const cleanPortalId = (defaultPortalId || 'ganti-portal-id-di-sini').replace(/['"\\]/g, '');
    const cleanFolderId = (defaultDriveFolderId || '').replace(/['"\\]/g, '').trim();
    const cleanPublicKey = (defaultPublicKey || '').replace(/['"\\]/g, '').trim();
    const cleanAdminKey = (defaultAdminKey || '').replace(/['"\\]/g, '').trim();
    return PORTAL_GAS_SCRIPT_V2
        .replace("'ganti-portal-id-di-sini'", `'${cleanPortalId}'`)
        .replace("const DEFAULT_DRIVE_FOLDER_ID = '';", `const DEFAULT_DRIVE_FOLDER_ID = '${cleanFolderId}';`)
        .replace("const PUBLIC_KEY = '';", `const PUBLIC_KEY = '${cleanPublicKey}';`)
        .replace("const ADMIN_KEY = '';", `const ADMIN_KEY = '${cleanAdminKey}';`);
};

/**
 * Kode Google Apps Script Versi 2.0 (Server-Side Authentication & Anti-Bulk Data Leak)
 * - getPortalPublicInfo: Hanya mengembalikan identitas pondok & pengumuman (0% data santri).
 * - loginSantri: Mencocokkan NIS + Tanggal Lahir di server Google dan HANYA mengembalikan 1 santri yang cocok.
 * - getPortalConfig: Diamankan agar tidak membocorkan seluruh daftar santri jika dibuka langsung di browser.
 */
export const PORTAL_GAS_SCRIPT_V2 = `/**
 * eSantri Portal Bridge v2.x (Secure Server-Side Auth & Dual-Key) - Google Apps Script
 *
 * ===================== KONFIGURASI AWAL =====================
 * 1) PORTAL_ID_DEFAULT: contoh 'ponpes-alikhlas'
 * 2) PUBLIC_KEY: Kunci Kirim Publik untuk form PSB & baca info publik (bukan rahasia)
 * 3) ADMIN_KEY: Kunci Admin RAHASIA (wajib diisi / di Script Properties untuk baca/ubah/hapus)
 * ============================================================
 */
const SCRIPT_VERSION = 4;
const SHEET_PORTALS = 'portals';
const SHEET_PSB = 'portal_psb_submissions';
const SHEET_SYNC_LOGS = 'portal_sync_logs';
const PORTAL_ID_DEFAULT = 'ganti-portal-id-di-sini';
const DEFAULT_DRIVE_FOLDER_ID = '';
const PUBLIC_KEY = '';
const ADMIN_KEY = '';
const API_TOKEN = ''; // legacy alias (opsional)
const PAYLOAD_CHUNK_SIZE = 45000;
const PAYLOAD_MAX_PARTS = 30;
const PSB_MAX_POST_BYTES = 22000000;

function doGet(e) {
  try {
    const a = ((e && e.parameter && e.parameter.action) || '').trim();
    if (a === 'version') {
      return out({
        success: true,
        result: 'success',
        scriptVersion: SCRIPT_VERSION,
        service: 'esantri-portal-gas'
      });
    }
    if (a === 'getPortalPublicInfo') return out(getPortalPublicInfo(e));
    if (a === 'loginSantri') return out(loginSantri(e));
    if (a === 'getPortalConfig') return out(getPortalPublicInfo(e)); // Diamankan: hanya profil publik
    return out({ success: false, message: 'Portal eSantri Aktif (Akses GET pendaftar dinonaktifkan; gunakan POST dengan ADMIN_KEY).' });
  } catch (err) {
    return out({ success: false, message: err.message || String(err) });
  }
}

function doPost(e) {
  try {
    const rawContents = (e && e.postData && e.postData.contents) ? String(e.postData.contents) : '{}';
    if (rawContents.length > PSB_MAX_POST_BYTES) {
      return out({ success: false, result: 'error', message: 'Ukuran payload melebihi batas maksimum yang diizinkan (22 MB).' });
    }
    const b = JSON.parse(rawContents);
    const a = (b.action || '').trim();
    if (a === 'diagnose') return out(diagnosePortalAdminPost(b));
    if (a === 'upsertPortalConfig') return out(upsertPortalConfig(b));
    if (a === 'list' || a === 'getPsbSubmissions') return out(getPsbSubmissionsPost(b));
    if (a === 'getFile') return out(getFilePost(b));
    if (a === 'deleteFile') return out(deleteFilePost(b));
    if (a === 'submitPortalPsb') return out(submitPortalPsb(b));
    if (a === 'loginSantri') return out(loginSantriPost(b));
    return out({ success: false, result: 'error', message: 'Action POST tidak valid.' });
  } catch (err) {
    return out({ success: false, result: 'error', message: err.message || String(err) });
  }
}

function out(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function getActiveSpreadsheetOrThrow() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    throw new Error('Spreadsheet aktif tidak ditemukan. Pastikan Apps Script dibuat dari Google Sheets (Ekstensi > Apps Script), bukan script standalone.');
  }
  return ss;
}

function ensureSheet(name, headers) {
  const ss = getActiveSpreadsheetOrThrow();
  let sh = ss.getSheetByName(name);
  if (!sh) { sh = ss.insertSheet(name); }
  const currentHeaders = sh.getRange(1, 1, 1, headers.length).getValues()[0];
  const isHeaderMatch = headers.every((h, i) => (currentHeaders[i] || '').toString().trim() === h);
  if (!isHeaderMatch) { sh.getRange(1, 1, 1, headers.length).setValues([headers]); }
  return sh;
}

function getPortalHeaders() {
  const partHeaders = [];
  for (let i = 1; i <= PAYLOAD_MAX_PARTS; i++) { partHeaders.push('payloadPart' + i); }
  return ['portalId', 'updatedAt', 'partCount', 'payloadSize'].concat(partHeaders);
}

function splitPayload(payloadJson) {
  const parts = [];
  for (let i = 0; i < payloadJson.length; i += PAYLOAD_CHUNK_SIZE) {
    parts.push(payloadJson.slice(i, i + PAYLOAD_CHUNK_SIZE));
  }
  if (parts.length > PAYLOAD_MAX_PARTS) {
    throw new Error('Payload portal terlalu besar (' + payloadJson.length + ' karakter).');
  }
  return parts;
}

function mergePayloadFromRow(headers, row) {
  const idxLegacyPayload = headers.indexOf('payloadJson');
  if (idxLegacyPayload >= 0 && row[idxLegacyPayload]) {
    return (row[idxLegacyPayload] || '').toString();
  }
  const idxPartCount = headers.indexOf('partCount');
  const partCount = Number(row[idxPartCount] || 0);
  if (!partCount || partCount < 1) return '';
  let merged = '';
  for (let i = 1; i <= partCount; i++) {
    const idxPart = headers.indexOf('payloadPart' + i);
    if (idxPart < 0) continue;
    merged += (row[idxPart] || '').toString();
  }
  return merged;
}

function sanitizeScriptKeyValue(val) {
  const s = (val || '').toString().trim();
  if (!s || /^ganti-/i.test(s) || /^isi-/i.test(s)) return '';
  return s;
}

function resolveScriptKey(propName, constVal) {
  const props = PropertiesService.getScriptProperties();
  const fromProp = sanitizeScriptKeyValue(props.getProperty(propName) || '');
  const fromConst = sanitizeScriptKeyValue(constVal);
  const seedPropName = propName + '_SEED';
  const fromSeed = sanitizeScriptKeyValue(props.getProperty(seedPropName) || '');
  if (fromConst && (!fromProp || fromConst !== fromSeed)) {
    try {
      props.setProperty(propName, fromConst);
      props.setProperty(seedPropName, fromConst);
    } catch (e) {}
    return fromConst;
  }
  return fromProp || fromConst;
}

function resolvePublicKey() {
  return resolveScriptKey('PUBLIC_KEY', PUBLIC_KEY) || resolveScriptKey('PORTAL_API_KEY', API_TOKEN);
}

function resolveAdminKey() {
  return resolveScriptKey('ADMIN_KEY', ADMIN_KEY);
}

function diagnoseAdminKey(inputAdminKey) {
  const expectedAdmin = resolveAdminKey();
  const expectedPublic = resolvePublicKey();
  if (!expectedAdmin || expectedAdmin === expectedPublic || expectedAdmin !== String(inputAdminKey || '').trim()) {
    return {
      ok: false,
      errorCode: 'UNAUTHORIZED',
      message: 'Akses ditolak: kredensial admin tidak valid atau konfigurasi belum siap.'
    };
  }
  return { ok: true };
}

function verifyAdminKey(inputAdminKey) {
  return diagnoseAdminKey(inputAdminKey).ok;
}

function buildAuthenticatedAdminDiagnostics() {
  const pub = resolvePublicKey();
  const adm = resolveAdminKey();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const folderId = resolveConfiguredDriveFolderId();
  let driveFolderAccessible = null;
  if (folderId) {
    try {
      DriveApp.getFolderById(folderId).getName();
      driveFolderAccessible = true;
    } catch (e) {
      driveFolderAccessible = false;
    }
  }
  return {
    hasPublicKey: Boolean(pub),
    hasAdminKey: Boolean(adm),
    keysEqual: Boolean(adm && adm === pub),
    hasSpreadsheet: Boolean(ss),
    hasDriveFolder: Boolean(folderId),
    driveFolderAccessible: driveFolderAccessible
  };
}

function diagnosePortalAdminPost(body) {
  const auth = diagnoseAdminKey(body.adminKey);
  if (!auth.ok) {
    return { success: false, result: 'error', errorCode: auth.errorCode, message: auth.message };
  }
  return {
    success: true,
    result: 'success',
    scriptVersion: SCRIPT_VERSION,
    service: 'esantri-portal-gas',
    diagnostics: buildAuthenticatedAdminDiagnostics()
  };
}

function verifyPublicSubmitKey(inputPublicKey) {
  const expectedPublic = resolvePublicKey();
  if (!expectedPublic) {
    throw new Error('PUBLIC_KEY belum dikonfigurasi pada script backend. Perbarui script GAS lalu terbitkan ulang formulir.');
  }
  if (expectedPublic !== String(inputPublicKey || '').trim()) {
    throw new Error('Kunci kirim formulir (PUBLIC_KEY) tidak valid atau sudah dirotasi. Silakan terbitkan ulang formulir PSB.');
  }
}

function authCheck(inputApiKey) {
  const expected = resolvePublicKey();
  if (!expected) return true;
  return expected === String(inputApiKey || '').trim();
}

function resolvePortalId(inputPortalId) {
  const p = (inputPortalId || '').trim();
  if (p) return p;
  const fallback = (PORTAL_ID_DEFAULT || '').trim();
  if (fallback && !fallback.includes('ganti-portal-id')) return fallback;
  throw new Error('portalId wajib diisi.');
}

function loadPortalPayload(portalId) {
  const sh = ensureSheet(SHEET_PORTALS, getPortalHeaders());
  const values = sh.getDataRange().getValues();
  const headers = values.shift();
  const idxPortal = headers.indexOf('portalId');
  const idxUpdated = headers.indexOf('updatedAt');
  for (let i = values.length - 1; i >= 0; i--) {
    if ((values[i][idxPortal] || '').toString().trim() === portalId) {
      const payloadJson = mergePayloadFromRow(headers, values[i]);
      const payload = JSON.parse(payloadJson || '{}');
      const updatedAt = idxUpdated >= 0 ? (values[i][idxUpdated] || '').toString() : '';
      return { payload: payload, updatedAt: updatedAt };
    }
  }
  return null;
}

function getPortalPublicInfo(e) {
  const portalId = resolvePortalId(e.parameter.portalId);
  const apiKey = (e.parameter.publicKey || e.parameter.apiKey || '').trim();
  if (!authCheck(apiKey)) throw new Error('Token akses tidak valid.');
  const found = loadPortalPayload(portalId);
  if (!found) return { success: false, message: 'Data portal tidak ditemukan untuk ID: ' + portalId };
  const payload = found.payload || {};
  return {
    success: true,
    version: 2,
    scriptVersion: SCRIPT_VERSION,
    updatedAt: found.updatedAt || (payload.metadata && payload.metadata.updatedAt) || '',
    data: {
      settings: payload.settings || null,
      metadata: payload.metadata || null,
      santriSummary: [] // Data santri disembunyikan dari publik, wajib melalui loginSantri
    }
  };
}

function normalizeDob(raw) {
  const s = (raw || '').toString().trim().slice(0, 10);
  if (/^\\d{2}[\\/-]\\d{2}[\\/-]\\d{4}$/.test(s)) {
    const parts = s.split(/[\\/-]/);
    return parts[2] + '-' + parts[1] + '-' + parts[0];
  }
  return s;
}

function getPortalLoginRlKey(portalId, rawNis) {
  const digest = digestBytesToHex(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(portalId || '') + '|' + String(rawNis || '').slice(0, 32)));
  return 'portal_login_rl_' + digest.slice(0, 32);
}

function checkPortalLoginRateLimit(portalId, rawNis) {
  const cache = CacheService.getScriptCache();
  const rlKey = getPortalLoginRlKey(portalId, rawNis);
  const count = Number(cache.get(rlKey) || '0');
  if (count >= 5) {
    throw new Error('Terlalu banyak percobaan login gagal. Silakan tunggu beberapa menit.');
  }
  return rlKey;
}

function recordPortalLoginFailure(rlKey) {
  const cache = CacheService.getScriptCache();
  const count = Number(cache.get(rlKey) || '0');
  cache.put(rlKey, String(count + 1), 300);
}

function verifySantriCredentials(portalId, apiKey, rawNis, rawDob, rawPinAuthHash, isGetRequest) {
  if (!authCheck(apiKey)) throw new Error('Token akses tidak valid.');
  const nis = (rawNis || '').toString().replace(/\\s+/g, '').toLowerCase();
  const dob = normalizeDob(rawDob);
  const pinAuthHash = String(rawPinAuthHash || '').trim();
  if (!nis || !dob) return { success: false, message: 'Data tidak ditemukan atau kredensial tidak sesuai.' };
  if (isGetRequest && dob !== 'e2ee') {
    return { success: false, message: 'Data tidak ditemukan atau kredensial tidak sesuai.' };
  }
  const rlKey = checkPortalLoginRateLimit(portalId, nis);
  const found = loadPortalPayload(portalId);
  if (!found) {
    recordPortalLoginFailure(rlKey);
    return { success: false, message: 'Data tidak ditemukan atau kredensial tidak sesuai.' };
  }
  const list = Array.isArray(found.payload.santriSummary) ? found.payload.santriSummary : [];
  for (let i = 0; i < list.length; i++) {
    const item = list[i];
    const itemNis = (item.nis || '').toString().replace(/\\s+/g, '').toLowerCase();
    const itemDob = normalizeDob(item.tanggalLahir);
    if (itemNis === nis && itemDob === dob) {
      if (item.pinAuthHash && String(item.pinAuthHash) !== pinAuthHash) {
        recordPortalLoginFailure(rlKey);
        return { success: false, message: 'Data tidak ditemukan atau kredensial tidak sesuai.' };
      }
      CacheService.getScriptCache().remove(rlKey);
      return { success: true, version: 2, data: { santri: item } };
    }
  }
  recordPortalLoginFailure(rlKey);
  return { success: false, message: 'Data tidak ditemukan atau kredensial tidak sesuai.' };
}

function loginSantri(e) {
  const portalId = resolvePortalId(e.parameter.portalId);
  const apiKey = (e.parameter.publicKey || e.parameter.apiKey || '').trim();
  return verifySantriCredentials(portalId, apiKey, e.parameter.nis, e.parameter.dob, e.parameter.pinAuthHash, true);
}

function loginSantriPost(body) {
  const portalId = resolvePortalId(body.portalId);
  const apiKey = (body.publicKey || body.apiKey || '').trim();
  return verifySantriCredentials(portalId, apiKey, body.nis, body.dob, body.pinAuthHash, false);
}

function upsertPortalConfig(body) {
  const auth = diagnoseAdminKey(body.adminKey);
  if (!auth.ok) return { success: false, result: 'error', errorCode: auth.errorCode, message: auth.message };
  const portalId = resolvePortalId(body.portalId);
  const payload = body.payload || {};
  const portalHeaders = getPortalHeaders();
  const sh = ensureSheet(SHEET_PORTALS, portalHeaders);
  const values = sh.getDataRange().getValues();
  const headers = values.shift();
  const idxPortal = headers.indexOf('portalId');
  let targetRow = -1;
  for (let i = 0; i < values.length; i++) {
    if ((values[i][idxPortal] || '').toString().trim() === portalId) { targetRow = i + 2; break; }
  }
  const payloadJson = JSON.stringify(payload);
  const payloadParts = splitPayload(payloadJson);
  const rowData = new Array(portalHeaders.length).fill('');
  rowData[portalHeaders.indexOf('portalId')] = portalId;
  rowData[portalHeaders.indexOf('updatedAt')] = new Date().toISOString();
  rowData[portalHeaders.indexOf('partCount')] = payloadParts.length;
  rowData[portalHeaders.indexOf('payloadSize')] = payloadJson.length;
  for (let i = 0; i < payloadParts.length; i++) {
    rowData[portalHeaders.indexOf('payloadPart' + (i + 1))] = payloadParts[i];
  }
  if (targetRow > 0) {
    sh.getRange(targetRow, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sh.appendRow(rowData);
  }
  const logSh = ensureSheet(SHEET_SYNC_LOGS, ['loggedAt', 'portalId', 'status', 'santriCount', 'payloadSize', 'note']);
  const count = Array.isArray(payload.santriSummary) ? payload.santriSummary.length : 0;
  logSh.appendRow([new Date().toISOString(), portalId, targetRow > 0 ? 'updated' : 'inserted', count, payloadJson.length, 'upsertPortalConfig-v2']);
  return { success: true, version: 2, message: 'Portal config v2 tersimpan.' };
}

function extractCleanDriveFolderId(rawInput) {
  if (!rawInput) return '';
  const trimmed = String(rawInput).trim();
  if (!trimmed) return '';
  const folderMatch = trimmed.match(/\/folders\/([a-zA-Z0-9_-]{10,})/);
  if (folderMatch && folderMatch[1]) return folderMatch[1];
  const idParamMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
  if (idParamMatch && idParamMatch[1]) return idParamMatch[1];
  const clean = trimmed.split('?')[0].split('#')[0].replace(/\/+$/, '');
  if (/^[a-zA-Z0-9_-]{15,}$/.test(clean)) return clean;
  return '';
}

const PSB_MAX_FILE_BYTES = 5 * 1024 * 1024;
const PSB_ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

function resolveConfiguredDriveFolderId() {
  const props = PropertiesService.getScriptProperties();
  const fromProp = extractCleanDriveFolderId(props.getProperty('DRIVE_FOLDER_ID') || '');
  const fromDefault = extractCleanDriveFolderId(DEFAULT_DRIVE_FOLDER_ID);
  const seed = extractCleanDriveFolderId(props.getProperty('DRIVE_FOLDER_ID_SEED') || '');
  if (fromDefault && (!fromProp || fromDefault !== seed)) {
    try {
      props.setProperty('DRIVE_FOLDER_ID', fromDefault);
      props.setProperty('DRIVE_FOLDER_ID_SEED', fromDefault);
    } catch (e) {}
    return fromDefault;
  }
  if (!fromDefault && seed && fromProp === seed) {
    try {
      props.deleteProperty('DRIVE_FOLDER_ID');
      props.deleteProperty('DRIVE_FOLDER_ID_SEED');
    } catch (e) {}
    return '';
  }
  return fromProp || fromDefault;
}

function normalizeAllowedMimeType(mime) {
  let m = String(mime || '').trim().toLowerCase().split(';')[0];
  if (m === 'image/jpg') m = 'image/jpeg';
  return m;
}

function verifyFileMagicBytes(bytes, expectedMime) {
  if (!bytes || bytes.length < 4) return false;
  const b0 = bytes[0] & 0xFF;
  const b1 = bytes[1] & 0xFF;
  const b2 = bytes[2] & 0xFF;
  const b3 = bytes[3] & 0xFF;
  if (expectedMime === 'application/pdf') {
    return b0 === 0x25 && b1 === 0x50 && b2 === 0x44 && b3 === 0x46;
  }
  if (expectedMime === 'image/jpeg') {
    return b0 === 0xFF && b1 === 0xD8 && b2 === 0xFF;
  }
  if (expectedMime === 'image/png') {
    return b0 === 0x89 && b1 === 0x50 && b2 === 0x4E && b3 === 0x47;
  }
  if (expectedMime === 'image/webp') {
    if (bytes.length < 12) return false;
    const b8 = bytes[8] & 0xFF;
    const b9 = bytes[9] & 0xFF;
    const b10 = bytes[10] & 0xFF;
    const b11 = bytes[11] & 0xFF;
    return (
      b0 === 0x52 && b1 === 0x49 && b2 === 0x46 && b3 === 0x46 &&
      b8 === 0x57 && b9 === 0x45 && b10 === 0x42 && b11 === 0x50
    );
  }
  return false;
}

function decodeAndValidateUploadedFile(fileObj) {
  const mime = normalizeAllowedMimeType(fileObj && fileObj.mime);
  if (PSB_ALLOWED_MIME_TYPES.indexOf(mime) === -1) {
    throw new Error('Tipe berkas tidak diizinkan (' + (mime || 'tidak diketahui') + '). Hanya PDF, JPEG, PNG, dan WebP yang diperbolehkan.');
  }
  const rawData = String((fileObj && fileObj.data) || '');
  if (!rawData) {
    throw new Error('Isi berkas unggahan kosong.');
  }
  let cleanB64 = rawData.indexOf(',') !== -1 ? rawData.split(',')[1] : rawData;
  cleanB64 = cleanB64.replace(/\\s+/g, '');
  if (cleanB64.length > 7400000) {
    throw new Error('Ukuran berkas unggahan melebihi batas maksimum 5 MB.');
  }
  const bytes = Utilities.base64Decode(cleanB64);
  if (!bytes || bytes.length === 0) {
    throw new Error('Data berkas unggahan tidak valid atau kosong.');
  }
  if (bytes.length > PSB_MAX_FILE_BYTES) {
    throw new Error('Ukuran berkas melebihi batas maksimum 5 MB.');
  }
  if (!verifyFileMagicBytes(bytes, mime)) {
    throw new Error('Konten berkas tidak sesuai dengan tipe MIME ' + mime + ' (magic-bytes gagal).');
  }
  return { bytes: bytes, mime: mime };
}

function getOrCreatePsbFolderIn(parentContainer, folderName) {
  const it = parentContainer.getFoldersByName(folderName);
  while (it.hasNext()) {
    const existing = it.next();
    if (!existing.isTrashed()) return existing;
  }
  return parentContainer.createFolder(folderName);
}

function resolvePsbUploadFolder(tahunAjaran) {
  const slug = String(tahunAjaran || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || String(new Date().getFullYear());
  const yearFolderName = 'berkas-psb-' + slug;
  const targetFolderId = resolveConfiguredDriveFolderId();
  if (targetFolderId) {
    try {
      const baseFolder = DriveApp.getFolderById(targetFolderId);
      if (baseFolder.getName().toLowerCase() === yearFolderName.toLowerCase()) {
        return baseFolder;
      }
      return getOrCreatePsbFolderIn(baseFolder, yearFolderName);
    } catch (err) {}
  }
  return getOrCreatePsbFolderIn(DriveApp, yearFolderName);
}

function extractAndValidateDriveFileId(rawInput) {
  const s = String(rawInput || '').trim();
  if (!s) {
    throw new Error('ID atau URL berkas Google Drive wajib diisi.');
  }
  const idMatch = s.match(/\\/d\\/([a-zA-Z0-9_-]{15,80})/i);
  if (idMatch && idMatch[1]) return idMatch[1];
  const qMatch = s.match(/[?&]id=([a-zA-Z0-9_-]{15,80})/i);
  if (qMatch && qMatch[1]) return qMatch[1];
  const clean = s.split('?')[0].split('#')[0].replace(/\\/+$/, '');
  if (/^[a-zA-Z0-9_-]{15,80}$/.test(clean)) return clean;
  throw new Error('Format ID atau URL berkas Google Drive tidak valid.');
}

function folderHasPsbPrefixOrTargetAncestor(folder, targetFolderId, depth, visited) {
  if (!folder || depth > 6) return false;
  if (folder.isTrashed && folder.isTrashed()) return false;
  const fid = folder.getId();
  if (visited[fid]) return false;
  visited[fid] = true;
  if (targetFolderId) {
    if (fid === targetFolderId) return true;
  } else {
    const fname = String(folder.getName() || '').toLowerCase();
    if (depth <= 3 && fname.indexOf('berkas-psb-') === 0) return true;
  }
  const ups = folder.getParents();
  while (ups.hasNext()) {
    if (folderHasPsbPrefixOrTargetAncestor(ups.next(), targetFolderId, depth + 1, visited)) {
      return true;
    }
  }
  return false;
}

function isFileInPsbDestinationFolder(file) {
  const targetFolderId = resolveConfiguredDriveFolderId();
  const parents = file.getParents();
  const visited = {};
  while (parents.hasNext()) {
    const parent = parents.next();
    if (folderHasPsbPrefixOrTargetAncestor(parent, targetFolderId, 1, visited)) {
      return true;
    }
  }
  return false;
}

function describeFileParentFolders(file) {
  const names = [];
  const parents = file.getParents();
  while (parents.hasNext()) {
    const p = parents.next();
    names.push(String(p.getName() || 'Drive'));
  }
  return names.length > 0 ? names.join(', ') : 'Root / Tanpa Folder';
}

function digestBytesToHex(digestBytes) {
  let hex = '';
  for (let i = 0; i < digestBytes.length; i++) {
    const b = digestBytes[i] & 0xFF;
    let h = b.toString(16);
    if (h.length === 1) h = '0' + h;
    hex += h;
  }
  return hex;
}

function getFilePost(body) {
  const auth = diagnoseAdminKey(body.adminKey);
  if (!auth.ok) {
    return { result: 'error', success: false, errorCode: auth.errorCode, message: auth.message };
  }
  const fileId = extractAndValidateDriveFileId(body.fileId || body.fileUrl || body.url);
  let file;
  try {
    file = DriveApp.getFileById(fileId);
  } catch (err) {
    throw new Error('Berkas tidak ditemukan atau tidak dapat diakses di Google Drive.');
  }
  if (!file || file.isTrashed()) {
    throw new Error('Berkas tidak ditemukan atau sudah berada di tempat sampah Drive.');
  }
  if (!isFileInPsbDestinationFolder(file)) {
    const folderHint = resolveConfiguredDriveFolderId()
      ? 'Pindahkan berkas ke dalam folder tujuan PSB yang dikonfigurasi di Google Drive (atau kosongkan ID Folder jika ingin memakai folder otomatis "berkas-psb-...").'
      : 'Pindahkan berkas ke dalam folder "berkas-psb-..." di Google Drive.';
    throw new Error('Akses ditolak: berkas berada di luar folder tujuan PSB yang dikonfigurasi (folder berkas saat ini: ' + describeFileParentFolders(file) + '). ' + folderHint);
  }
  const fileSize = Number(file.getSize() || 0);
  if (fileSize > PSB_MAX_FILE_BYTES) {
    throw new Error('Ukuran berkas melebihi batas maksimum 5 MB.');
  }
  const mime = normalizeAllowedMimeType(file.getMimeType());
  if (PSB_ALLOWED_MIME_TYPES.indexOf(mime) === -1) {
    throw new Error('Tipe berkas tidak diizinkan (' + (mime || 'tidak diketahui') + '). Hanya PDF, JPEG, PNG, dan WebP yang diperbolehkan.');
  }
  const blob = file.getBlob();
  const bytes = blob.getBytes();
  if (bytes.length > PSB_MAX_FILE_BYTES) {
    throw new Error('Ukuran berkas hasil baca melebihi batas maksimum 5 MB.');
  }
  const sha256 = digestBytesToHex(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, bytes));
  return {
    result: 'success',
    success: true,
    name: file.getName(),
    mime: mime,
    size: bytes.length,
    sha256: sha256,
    data: Utilities.base64Encode(bytes)
  };
}

function deleteFilePost(body) {
  const auth = diagnoseAdminKey(body.adminKey);
  if (!auth.ok) {
    return { result: 'error', success: false, errorCode: auth.errorCode, message: auth.message };
  }
  const fileId = extractAndValidateDriveFileId(body.fileId || body.fileUrl || body.url);
  let file;
  try {
    file = DriveApp.getFileById(fileId);
  } catch (err) {
    throw new Error('Berkas tidak ditemukan atau tidak dapat diakses di Google Drive.');
  }
  if (!file) {
    throw new Error('Berkas tidak ditemukan di Google Drive.');
  }
  if (!isFileInPsbDestinationFolder(file)) {
    const delFolderHint = resolveConfiguredDriveFolderId()
      ? 'Pindahkan berkas ke dalam folder tujuan PSB yang dikonfigurasi di Google Drive (atau kosongkan ID Folder jika ingin memakai folder otomatis "berkas-psb-...").'
      : 'Pindahkan berkas ke dalam folder "berkas-psb-..." di Google Drive.';
    throw new Error('Akses ditolak: berkas berada di luar folder tujuan PSB yang dikonfigurasi (folder berkas saat ini: ' + describeFileParentFolders(file) + '). ' + delFolderHint);
  }
  if (!file.isTrashed()) {
    file.setTrashed(true);
  }
  return {
    result: 'success',
    success: true,
    trashed: true,
    fileId: fileId
  };
}

function getPsbSubmissionsPost(body) {
  const auth = diagnoseAdminKey(body.adminKey);
  if (!auth.ok) {
    return { success: false, result: 'error', errorCode: auth.errorCode, message: auth.message };
  }
  const ss = getActiveSpreadsheetOrThrow();
  const sh = ss.getSheetByName(SHEET_PSB);
  const listRes = { success: true, result: 'success', scriptVersion: SCRIPT_VERSION, records: [] };
  if (body.includeDiagnostics) {
    listRes.diagnostics = buildAuthenticatedAdminDiagnostics();
  }
  if (!sh) return listRes;
  const rows = sh.getDataRange().getValues();
  if (rows.length < 2) return listRes;
  const headers = rows[0];
  const items = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const rec = {};
    for (let j = 0; j < headers.length; j++) {
      rec[headers[j]] = row[j];
    }
    if (rec.rawJson) {
      try {
        const parsed = JSON.parse(rec.rawJson);
        for (const k in parsed) {
          if (rec[k] === undefined || rec[k] === '') rec[k] = parsed[k];
        }
      } catch (err) {}
    }
    items.push(rec);
  }
  listRes.records = items;
  return listRes;
}

function makePsbRandomCode(len) {
  const chars = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, Utilities.getUuid() + ':' + Date.now() + ':' + Math.random());
  let out = '';
  for (let i = 0; i < len; i++) {
    const idx = (digest[i % digest.length] & 0xFF) & 31;
    out += chars.charAt(idx);
  }
  return out;
}

function makePsbRegNumber(year) {
  const y = year || new Date().getFullYear();
  return 'PSB-' + y + '-REG-' + makePsbRandomCode(6);
}

function makePsbInitials(nama) {
  const s = String(nama || '').trim();
  if (!s || s.toUpperCase() === '[TERENKRIPSI E2EE]') return 'X';
  const cleaned = s.normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').replace(/[^a-zA-Z0-9\\s]/g, ' ').trim();
  if (!cleaned) return 'X';
  const tokens = cleaned.split(/\\s+/).filter(Boolean);
  let out = '';
  for (let i = 0; i < tokens.length && i < 3; i++) {
    out += tokens[i].charAt(0).toUpperCase();
  }
  return out || 'X';
}

function detectPsbDocPrefix(fieldKey, fileName, fieldLabel) {
  const s = (String(fieldKey || '') + ' ' + String(fileName || '') + ' ' + String(fieldLabel || '')).toLowerCase();
  if (s.indexOf('kartu keluarga') !== -1 || s.indexOf(' kk') !== -1 || s.indexOf('kk ') !== -1 || s === 'kk' || s.indexOf('uploadkk') !== -1) return 'kk';
  if (s.indexOf('akta') !== -1) return 'akta';
  if (s.indexOf('ijazah') !== -1) return 'ijazah';
  if (s.indexOf('rapor') !== -1 || s.indexOf('raport') !== -1) return 'rapor';
  if (s.indexOf('pasfoto') !== -1 || s.indexOf('foto') !== -1) return 'foto';
  if (s.indexOf('kip') !== -1) return 'kip';
  if (s.indexOf('ktp') !== -1) return 'ktp';
  return 'dokumen';
}

function extractPsbExt(fileName, mimeType) {
  const o = String(fileName || '').trim();
  const dot = o.lastIndexOf('.');
  if (dot > -1 && dot < o.length - 1) {
    const ext = o.substring(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, '');
    if (ext) return ext === 'jpeg' ? 'jpg' : ext;
  }
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') return 'jpg';
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  return '';
}

function makePsbAttachmentFileName(regNo, nama, fieldKey, fileObj, mime) {
  const jenis = detectPsbDocPrefix(fieldKey, fileObj && fileObj.name, fileObj && fileObj.fieldLabel);
  const inisial = makePsbInitials(nama);
  const ext = extractPsbExt(fileObj && fileObj.name, mime);
  const base = regNo + '_' + inisial + '_' + jenis + '-' + makePsbRandomCode(4);
  return ext ? base + '.' + ext : base;
}

function submitPortalPsb(body) {
  const portalId = resolvePortalId(body.portalId);
  const submitKey = (body.publicKey || body.apiKey || '').trim();
  verifyPublicSubmitKey(submitKey);

  const fields = (body.fields && typeof body.fields === 'object') ? body.fields : {};
  const merged = {};
  for (const fk in fields) {
    if (fk !== 'driveFolderId' && fk !== 'folderId' && fk !== 'publicKey' && fk !== 'adminKey') merged[fk] = fields[fk];
  }
  for (const bk in body) {
    if (['action', 'portalId', 'apiKey', 'publicKey', 'adminKey', 'driveFolderId', 'folderId', 'fields', 'submittedAt'].indexOf(bk) === -1) {
      merged[bk] = body[bk];
    }
  }
  if (!merged.nomorRegistrasi || !String(merged.nomorRegistrasi).trim()) {
    merged.nomorRegistrasi = makePsbRegNumber();
  }

  let uploadFolder = null;
  for (const key in merged) {
    const val = merged[key];
    if (val && typeof val === 'object' && val.isFile && val.data) {
      const validated = decodeAndValidateUploadedFile(val);
      if (!uploadFolder) {
        uploadFolder = resolvePsbUploadFolder(merged.tahunAjaranAktif || merged.tahunAjaran);
      }
      const fileName = makePsbAttachmentFileName(merged.nomorRegistrasi, merged.namaLengkap, key, val, validated.mime);
      const blob = Utilities.newBlob(validated.bytes, validated.mime, fileName);
      const uploaded = uploadFolder.createFile(blob);
      merged[key] = uploaded.getUrl();
    }
  }

  const submittedAt = body.submittedAt || new Date().toISOString();
  const sh = ensureSheet(SHEET_PSB, ['submittedAt', 'portalId', 'jenjangId', 'targetJenjangNama', 'namaLengkap', 'nisn', 'nik', 'jenisKelamin', 'tanggalLahir', 'namaWali', 'nomorHpWali', 'rawJson']);
  sh.appendRow([
    submittedAt,
    portalId,
    merged.jenjangId || '',
    merged.targetJenjangNama || merged.namaJenjang || '',
    merged.namaLengkap || '',
    merged.nisn || '',
    merged.nik || '',
    merged.jenisKelamin || '',
    merged.tanggalLahir || '',
    merged.namaWali || merged.namaAyah || merged.namaIbu || '',
    merged.nomorHpWali || merged.teleponAyah || merged.teleponIbu || merged.telepon || '',
    JSON.stringify(merged)
  ]);
  return {
    success: true,
    nomorRegistrasi: merged.nomorRegistrasi,
    message: 'Pendaftaran & berkas berhasil tersimpan.',
    folderUsed: uploadFolder ? uploadFolder.getId() : (resolveConfiguredDriveFolderId() || 'auto-berkas-psb')
  };
}

function makeExistingFilesPrivateInFolder(folder, counters) {
  const files = folder.getFiles();
  while (files.hasNext()) {
    const file = files.next();
    if (file.isTrashed && file.isTrashed()) continue;
    try {
      file.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE);
      counters.updated++;
    } catch (err) {
      counters.failed++;
    }
  }
  const children = folder.getFolders();
  while (children.hasNext()) {
    const child = children.next();
    if (child.isTrashed && child.isTrashed()) continue;
    makeExistingFilesPrivateInFolder(child, counters);
  }
}

/**
 * Jalankan MANUAL dari editor Apps Script (Run > makeExistingFilesPrivate)
 * untuk mengamankan berkas PSB lama menjadi PRIVATE.
 */
function makeExistingFilesPrivate() {
  const counters = { updated: 0, failed: 0 };
  const targetFolderId = resolveConfiguredDriveFolderId();
  if (targetFolderId) {
    const rootFolder = DriveApp.getFolderById(targetFolderId);
    makeExistingFilesPrivateInFolder(rootFolder, counters);
  } else {
    const folders = DriveApp.getFolders();
    while (folders.hasNext()) {
      const f = folders.next();
      if (f.isTrashed && f.isTrashed()) continue;
      const name = String(f.getName() || '').toLowerCase();
      if (name.indexOf('berkas-psb-') === 0) {
        makeExistingFilesPrivateInFolder(f, counters);
      }
    }
  }
  Logger.log('makeExistingFilesPrivate selesai. Diubah ke privat: ' + counters.updated + ', gagal/dilewati: ' + counters.failed);
  return counters;
}`;

export const getLocalSantriSummary = async (
    normalizedNis: string,
    dob: string,
    settings?: PondokSettings,
    pin?: string
): Promise<PortalSantriSummary | null> => {
    try {
        const sett = settings || (await db.settings.toCollection().first());
        if (!sett) return null;
        const { payload, portalId } = await buildFullPortalPayload(sett);
        const list: Array<PortalSantriSummary | EncryptedPortalSantriRecord> = payload?.santriSummary || [];
        const cleanTargetNis = normalizePortalNis(normalizedNis);
        const targetDobNorm = normalizePortalDob(dob);
        const normPin = normalizePortalPin(pin);
        const authHashes = (targetDobNorm && isWebCryptoAvailable())
            ? await derivePortalAuthHashCandidates(portalId, normalizedNis, targetDobNorm, normPin)
            : [];
        const pinAuthHash = (normPin && isWebCryptoAvailable())
            ? await derivePortalPinVerificationHash(portalId, normalizedNis, normPin)
            : '';

        for (const item of list) {
            if (isEncryptedPortalRecord(item)) {
                if (authHashes.length > 0 && authHashes.includes(item.nis)) {
                    return await decryptPortalSantriSummary<PortalSantriSummary>(item, portalId, normalizedNis, targetDobNorm, normPin);
                }
                continue;
            }
            const sNis = normalizePortalNis(item.nis);
            if (sNis !== cleanTargetNis) continue;
            if (item.pinAuthHash && item.pinAuthHash !== pinAuthHash) continue;
            if (!targetDobNorm) return item;
            const sDobNorm = normalizePortalDob(item.tanggalLahir);
            if (sDobNorm === targetDobNorm) return item;
        }
        return null;
    } catch (err) {
        console.error('Error getting local santri summary:', err);
        return null;
    }
};

