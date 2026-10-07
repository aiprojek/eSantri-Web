import { db } from '../db';
import { PondokSettings, PortalConfig } from '../types';

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

    if (!data) {
        return { settings: null, santriSummary: [] };
    }

    if (data && !data.settings && !data.santriSummary) {
        return { settings: data as PondokSettings, santriSummary: [] };
    }

    return {
        settings: (data.settings || null) as PondokSettings | null,
        santriSummary: (data.santriSummary || []) as PortalSantriSummary[],
        updatedAt: result.updatedAt || data.metadata?.updatedAt || '',
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
    fallbackSantriList?: PortalSantriSummary[]
): Promise<PortalSantriSummary | null> => {
    const cleanNis = (nis || '').replace(/\s+/g, '').toLowerCase();
    const cleanDob = (dob || '').trim().slice(0, 10);

    try {
        const url = new URL(gasEndpoint);
        url.searchParams.set('action', 'loginSantri');
        url.searchParams.set('portalId', portalId);
        url.searchParams.set('nis', cleanNis);
        url.searchParams.set('dob', cleanDob);
        if (apiKey) {
            url.searchParams.set('apiKey', apiKey);
        }

        const response = await fetch(url.toString(), { method: 'GET' });
        if (response.ok) {
            const result: PortalFetchResponse = await response.json();
            if (result.success && result.data?.santri) {
                return result.data.santri as PortalSantriSummary;
            }
            // Jika GAS v2 merespons bahwa NIS/Tanggal lahir salah (bukan karena action tidak dikenal)
            if (result.success === false && result.message && !result.message.includes('Action GET tidak valid')) {
                return null;
            }
        }
    } catch (err) {
        console.warn('Server-side login fallback check:', err);
    }

    // Fallback kompatibilitas jika pengguna masih memakai script GAS v1 lama
    if (Array.isArray(fallbackSantriList) && fallbackSantriList.length > 0) {
        const matched = fallbackSantriList.find((santri) => {
            const santriNis = (santri.nis || '').replace(/\s+/g, '').toLowerCase();
            const santriDob = (santri.tanggalLahir || '').slice(0, 10);
            return santriNis === cleanNis && santriDob === cleanDob;
        });
        return matched || null;
    }

    return null;
};

export const submitPortalPsbToGas = async (
    gasEndpoint: string,
    portalId: string,
    fields: Record<string, any>,
    apiKey?: string
): Promise<void> => {
    const response = await fetch(gasEndpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({
            action: 'submitPortalPsb',
            portalId,
            apiKey,
            fields,
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
};

const BULAN_NAMES = [
    '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export const syncPortalBridgeToGas = async (settings: PondokSettings): Promise<{ syncedCount: number; santriCount: number; syncedAt: string; payloadSize: number }> => {
    const gasEndpoint = ensureGasEndpoint(settings);
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
    const rombelMap = new Map((settings.rombel || []).map((r) => [r.id, r]));
    const guruMap = new Map((settings.tenagaPengajar || []).map((g) => [g.id, g.nama]));
    const mapelMap = new Map((settings.mataPelajaran || []).map((m) => [m.id, m.nama]));
    const gedungMap = new Map((settings.gedungAsrama || []).map((g) => [g.id, g.nama]));
    const kamarMap = new Map((settings.kamar || []).map((k) => [k.id, k]));
    const bukuMap = new Map(buku.filter((b) => !b.deleted).map((b) => [b.id, b]));

    const activeSantri = santri.filter((s) => !s.deleted && s.status !== 'Keluar/Pindah');

    // Sanitasi portalConfig agar tidak menyertakan gasApiKey mentah ke objek publik
    const publicPortalConfig = settings.portalConfig
        ? {
            ...settings.portalConfig,
            gasApiKey: '', // Jangan ekspos token API di profil publik
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
            psbConfig: settings.psbConfig,
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
            const santriRapors = raporRecords
                .filter((r) => r.santriId === s.id && !(r as any).deleted)
                .sort((a, b) => (b.tanggalRapor || '').localeCompare(a.tanggalRapor || '') || (b.lastModified || 0) - (a.lastModified || 0));
            const latestRapor = santriRapors[0];
            let raporTerakhir: PortalRaporSummary | null = null;
            if (latestRapor) {
                const nilaiList = Array.isArray(latestRapor.nilai) ? latestRapor.nilai : [];
                const validScores = nilaiList.filter((n) => typeof n.nilaiAngka === 'number' && n.nilaiAngka > 0);
                const rataRata = validScores.length > 0
                    ? Math.round((validScores.reduce((acc, n) => acc + n.nilaiAngka, 0) / validScores.length) * 10) / 10
                    : 0;
                raporTerakhir = {
                    tahunAjaran: latestRapor.tahunAjaran || settings.tahunAjaranAktif || '-',
                    semester: latestRapor.semester || settings.semesterAktif || 'Ganjil',
                    rataRata,
                    keputusan: latestRapor.keputusan,
                    catatanWaliKelas: latestRapor.catatanWaliKelas,
                    mapel: nilaiList.slice(0, 12).map((n) => ({
                        nama: mapelMap.get(n.mapelId) || `Mapel #${n.mapelId}`,
                        nilai: n.nilaiAngka,
                        predikat: n.predikat || '-',
                    })),
                };
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

    const response = await fetch(gasEndpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({
            action: 'upsertPortalConfig',
            portalId,
            apiKey: settings.portalConfig?.gasApiKey || '',
            payload,
        }),
    });

    if (!response.ok) {
        throw new Error(`Gagal sinkronisasi portal ke GAS (HTTP ${response.status}).`);
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

export const getPortalGasScriptV2 = (defaultPortalId: string = 'ganti-portal-id-di-sini'): string => {
    return PORTAL_GAS_SCRIPT_V2.replace("'ganti-portal-id-di-sini'", `'${(defaultPortalId || 'ganti-portal-id-di-sini').replace(/'/g, '')}'`);
};

/**
 * Kode Google Apps Script Versi 2.0 (Server-Side Authentication & Anti-Bulk Data Leak)
 * - getPortalPublicInfo: Hanya mengembalikan identitas pondok & pengumuman (0% data santri).
 * - loginSantri: Mencocokkan NIS + Tanggal Lahir di server Google dan HANYA mengembalikan 1 santri yang cocok.
 * - getPortalConfig: Diamankan agar tidak membocorkan seluruh daftar santri jika dibuka langsung di browser.
 */
export const PORTAL_GAS_SCRIPT_V2 = `/**
 * eSantri Portal Bridge v2.0 (Secure Server-Side Auth) - Google Apps Script
 *
 * ===================== WAJIB DIISI USER =====================
 * 1) Ganti PORTAL_ID_DEFAULT (contoh: ponpes-alikhlas)
 * 2) Token opsional:
 *    - Jika ingin pakai token, isi API_TOKEN
 *    - Jika tidak ingin pakai token, biarkan kosong ''
 * ============================================================
 * KEAMANAN V2.0:
 * - Endpoint publik TIDAK PERNAH lagi mengeluarkan daftar seluruh santri.
 * - Pencocokan NIS & Tanggal Lahir dilakukan di sisi server Google (action=loginSantri)
 *   dan hanya mengembalikan data 1 santri yang berhasil diverifikasi.
 */
const SHEET_PORTALS = 'portals';
const SHEET_PSB = 'portal_psb_submissions';
const SHEET_SYNC_LOGS = 'portal_sync_logs';
const PORTAL_ID_DEFAULT = 'ganti-portal-id-di-sini';
const API_TOKEN = ''; // opsional, contoh: 'rahasia-pondok-2026'
const PAYLOAD_CHUNK_SIZE = 45000;
const PAYLOAD_MAX_PARTS = 30;

function doGet(e) {
  try {
    const a = ((e && e.parameter && e.parameter.action) || '').trim();
    if (a === 'getPortalPublicInfo') return out(getPortalPublicInfo(e));
    if (a === 'loginSantri') return out(loginSantri(e));
    if (a === 'getPortalConfig') return out(getPortalPublicInfo(e)); // Diamankan: hanya profil publik
    return out({ success: false, message: 'Portal eSantri v2.0 Aktif (Protected Endpoint).' });
  } catch (err) {
    return out({ success: false, message: err.message || String(err) });
  }
}

function doPost(e) {
  try {
    const b = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const a = (b.action || '').trim();
    if (a === 'upsertPortalConfig') return out(upsertPortalConfig(b));
    if (a === 'submitPortalPsb') return out(submitPortalPsb(b));
    if (a === 'loginSantri') return out(loginSantriPost(b));
    return out({ success: false, message: 'Action POST tidak valid.' });
  } catch (err) {
    return out({ success: false, message: err.message || String(err) });
  }
}

function out(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function ensureSheet(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
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

function authCheck(inputApiKey) {
  const expectedByConstant = (API_TOKEN || '').trim();
  const expectedByProperty = (PropertiesService.getScriptProperties().getProperty('PORTAL_API_KEY') || '').trim();
  const expected = expectedByConstant || expectedByProperty;
  if (!expected) return true;
  return expected === (inputApiKey || '').trim();
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
  const apiKey = (e.parameter.apiKey || '').trim();
  if (!authCheck(apiKey)) throw new Error('Token akses tidak valid.');
  const found = loadPortalPayload(portalId);
  if (!found) return { success: false, message: 'Data portal tidak ditemukan untuk ID: ' + portalId };
  const payload = found.payload || {};
  return {
    success: true,
    version: 2,
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

function verifySantriCredentials(portalId, apiKey, rawNis, rawDob) {
  if (!authCheck(apiKey)) throw new Error('Token akses tidak valid.');
  const nis = (rawNis || '').toString().replace(/\\s+/g, '').toLowerCase();
  const dob = normalizeDob(rawDob);
  if (!nis || !dob) return { success: false, message: 'NIS dan Tanggal Lahir wajib diisi.' };
  const found = loadPortalPayload(portalId);
  if (!found) return { success: false, message: 'Data portal belum disinkronkan.' };
  const list = Array.isArray(found.payload.santriSummary) ? found.payload.santriSummary : [];
  for (let i = 0; i < list.length; i++) {
    const item = list[i];
    const itemNis = (item.nis || '').toString().replace(/\\s+/g, '').toLowerCase();
    const itemDob = normalizeDob(item.tanggalLahir);
    if (itemNis === nis && itemDob === dob) {
      return { success: true, version: 2, data: { santri: item } };
    }
  }
  return { success: false, message: 'NIS atau Tanggal Lahir tidak sesuai.' };
}

function loginSantri(e) {
  const portalId = resolvePortalId(e.parameter.portalId);
  const apiKey = (e.parameter.apiKey || '').trim();
  return verifySantriCredentials(portalId, apiKey, e.parameter.nis, e.parameter.dob);
}

function loginSantriPost(body) {
  const portalId = resolvePortalId(body.portalId);
  const apiKey = (body.apiKey || '').trim();
  return verifySantriCredentials(portalId, apiKey, body.nis, body.dob);
}

function upsertPortalConfig(body) {
  const portalId = resolvePortalId(body.portalId);
  const apiKey = (body.apiKey || '').trim();
  const payload = body.payload || {};
  if (!authCheck(apiKey)) throw new Error('API key tidak valid.');
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

function submitPortalPsb(body) {
  const portalId = resolvePortalId(body.portalId);
  const apiKey = (body.apiKey || '').trim();
  const fields = body.fields || {};
  const submittedAt = body.submittedAt || new Date().toISOString();
  if (!authCheck(apiKey)) throw new Error('API key tidak valid.');
  const sh = ensureSheet(SHEET_PSB, ['submittedAt', 'portalId', 'namaLengkap', 'nisn', 'nik', 'jenisKelamin', 'tanggalLahir', 'namaWali', 'teleponWali', 'rawJson']);
  sh.appendRow([submittedAt, portalId, fields.namaLengkap || '', fields.nisn || '', fields.nik || '', fields.jenisKelamin || '', fields.tanggalLahir || '', fields.namaWali || '', fields.teleponWali || '', JSON.stringify(fields)]);
  return { success: true, message: 'Pendaftaran berhasil tersimpan.' };
}`;
