import { db } from '../db';
import { PondokSettings } from '../types';

interface PortalFetchResponse {
    success?: boolean;
    data?: any;
    message?: string;
}

export interface PortalSantriSummary {
    id: number;
    nis: string;
    namaLengkap: string;
    tanggalLahir: string;
    jenjangId: number;
    kelasId: number;
    rombelId: number;
    namaWali: string;
    teleponWali: string;
    attendanceToday: string;
    saldoTabungan: number;
    tunggakanBulanIni: number;
    tahfizhTerakhir: { tanggal: string; tipe: string; surah: string; ayat: string } | null;
    kesehatanTerakhir: { tanggal: string; status: string; diagnosa: string } | null;
    pinjamanBukuAktif: number;
}

export interface PortalBundle {
    settings: PondokSettings | null;
    santriSummary: PortalSantriSummary[];
}

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

export const fetchPortalSettingsFromGas = async (
    gasEndpoint: string,
    portalId: string,
    apiKey?: string
): Promise<PortalBundle> => {
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

    // Backward compatibility: GAS lama hanya mengirim settings langsung.
    if (data && !data.settings && !data.santriSummary) {
        return { settings: data as PondokSettings, santriSummary: [] };
    }

    return {
        settings: (data.settings || null) as PondokSettings | null,
        santriSummary: (data.santriSummary || []) as PortalSantriSummary[],
    };
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

export const syncPortalBridgeToGas = async (settings: PondokSettings): Promise<void> => {
    const gasEndpoint = ensureGasEndpoint(settings);
    const portalId = ensurePortalId(settings);

    const [santri, absensi, tagihan, saldoSantri, kesehatanRecords, tahfizh, sirkulasi] = await Promise.all([
        db.santri.toArray(),
        db.absensi.toArray(),
        db.tagihan.toArray(),
        db.saldoSantri.toArray(),
        db.kesehatanRecords.toArray(),
        db.tahfizh.toArray(),
        db.sirkulasi.toArray(),
    ]);

    const today = new Date().toISOString().slice(0, 10);
    const activeSantri = santri.filter((s) => !s.deleted && s.status !== 'Keluar/Pindah');
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    const payload = {
        metadata: {
            updatedAt: new Date().toISOString(),
            portalId,
            source: 'esantri-web',
        },
        settings: {
            namaPonpes: settings.namaPonpes,
            alamat: settings.alamat,
            telepon: settings.telepon,
            email: settings.email,
            website: settings.website,
            logoPonpesUrl: settings.logoPonpesUrl || '',
            psbConfig: settings.psbConfig,
            portalConfig: settings.portalConfig,
            jenjang: settings.jenjang,
            kelas: settings.kelas,
            rombel: settings.rombel,
        },
        santriSummary: activeSantri.map((s) => {
            const todayAttendance = absensi.find((a) => a.santriId === s.id && a.tanggal === today);
            const saldo = saldoSantri.find((saldoItem) => saldoItem.santriId === s.id)?.saldo || 0;
            const monthBills = tagihan.filter((bill) => bill.santriId === s.id && bill.bulan === currentMonth && bill.tahun === currentYear);
            const outstanding = monthBills
                .filter((bill) => bill.status !== 'Lunas')
                .reduce((sum, bill) => sum + (bill.nominal || 0), 0);
            const latestTahfizh = tahfizh
                .filter((t) => t.santriId === s.id)
                .sort((a, b) => b.tanggal.localeCompare(a.tanggal))[0];
            const latestHealth = kesehatanRecords
                .filter((k) => k.santriId === s.id)
                .sort((a, b) => b.tanggal.localeCompare(a.tanggal))[0];
            const borrowedBooks = sirkulasi.filter((item) => item.santriId === s.id && item.status === 'Dipinjam').length;

            return {
                id: s.id,
                nis: s.nis,
                namaLengkap: s.namaLengkap,
                tanggalLahir: s.tanggalLahir,
                jenjangId: s.jenjangId,
                kelasId: s.kelasId,
                rombelId: s.rombelId,
                namaWali: s.namaWali || s.namaAyah || s.namaIbu || '',
                teleponWali: s.teleponWali || s.teleponAyah || s.teleponIbu || '',
                attendanceToday: todayAttendance?.status || 'Belum Absen',
                saldoTabungan: saldo,
                tunggakanBulanIni: outstanding,
                tahfizhTerakhir: latestTahfizh
                    ? { tanggal: latestTahfizh.tanggal, tipe: latestTahfizh.tipe, surah: latestTahfizh.surah, ayat: `${latestTahfizh.ayatAwal}-${latestTahfizh.ayatAkhir}` }
                    : null,
                kesehatanTerakhir: latestHealth
                    ? { tanggal: latestHealth.tanggal, status: latestHealth.status, diagnosa: latestHealth.diagnosa || '' }
                    : null,
                pinjamanBukuAktif: borrowedBooks,
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
};
