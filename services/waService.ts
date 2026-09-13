
import { PondokSettings, WaGatewayConfig } from '../types';

export const WA_TEMPLATES = {
    // Kategori Santri Aktif & Keuangan
    TAGIHAN: "Assalamualaikum Bapak/Ibu [ortu], menginfokan tagihan santri [nama_santri] (NIS: [nis], Kelas: [kelas]) per [bulan] sebesar [nominal]. Rincian: [rincian_tagihan]. Mohon konfirmasi atau penyelesaiannya. Syukron.",
    KWITANSI: "Alhamdulillah, pembayaran santri [nama_santri] (NIS: [nis]) sebesar [nominal] untuk [item] telah kami terima pada [tanggal]. Jazakumullah Khairan.",
    TAHFIZH: "Laporan Tahfizh [nama_santri] (Kelas: [kelas]): Hari ini telah menyetorkan [tipe] Juz [juz] Surah [surah]. Predikat: [predikat]. Terus semangat!",
    ABSENSI_ALPHA: "Pemberitahuan Pesantren: Ananda [nama_santri] tercatat TIDAK HADIR (Alpha) pada [sesi] tanggal [tanggal] di [rombel]. Mohon konfirmasi kehadiran/keterangan kepada pihak wali kelas. Syukron.",
    ABSENSI_SAKIT: "Pemberitahuan Pesantren: Ananda [nama_santri] hari ini tercatat izin SAKIT ([keterangan]) pada [sesi] tanggal [tanggal]. Semoga ananda lekas sembuh. Aamiin.",
    ABSENSI_IZIN: "Pemberitahuan Pesantren: Izin ketidakhadiran ananda [nama_santri] ([keterangan]) pada [sesi] tanggal [tanggal] telah tercatat dalam sistem absensi pesantren. Syukron.",
    ABSENSI_BLAST: "Laporan Presensi Harian [rombel] - Tanggal [tanggal] ([sesi]): Ananda [nama_santri] tercatat [status] (Ket: [keterangan]). Mohon menjadi maklum. Syukron.",
    PENGUMUMAN: "PENGUMUMAN PONDOK [nama_pondok]: [pesan]. Mohon menjadi periksa. Syukron.",
    SIARAN_UMUM: "Assalamualaikum. [pesan]\n\nInfo: [agenda]\nTanggal: [tanggal]\n\nTerima kasih. - [nama_pondok]",
    SIARAN_GRUP: "Assalamualaikum Ayah/Bunda. [pesan]\n\nPengumuman Grup: [agenda]\nTanggal: [tanggal]\n\nMohon disimak bersama. - [nama_pondok]",

    // Kategori Pendaftaran Santri Baru (PSB)
    PSB_KONFIRMASI: "Assalamualaikum Bapak/Ibu [ortu], pendaftaran calon santri [nama_santri] di [nama_pondok] telah kami terima.\n\nNo. Registrasi: [no_reg]\nJalur: [jalur] ([gelombang])\nStatus Berkas: [status_berkas]\n\nMohon simpan nomor registrasi ini untuk keperluan seleksi dan daftar ulang. Syukron.",
    PSB_UNDANGAN_UJIAN: "Pemberitahuan Seleksi [nama_pondok]: Kepada Yth. Bapak/Ibu [ortu] dari calon santri [nama_santri] (No. Reg: [no_reg]). Mengundang kehadiran ananda pada Ujian Seleksi:\n\nLokasi / Ruang: [ruang_ujian]\nTanggal Ujian: [tanggal_ujian]\n\nMohon hadir 15 menit sebelum ujian dimulai dengan membawa kartu peserta. Syukron.",
    PSB_KELULUSAN: "Alhamdulillah! Diberitahukan kepada Bapak/Ibu [ortu] bahwa calon santri [nama_santri] (No. Reg: [no_reg]) dinyatakan [status_psb] dalam seleksi santri baru [nama_pondok].\n\nSilakan konfirmasi dan lengkapi administrasi daftar ulang sebelum batas waktu yang ditentukan. Jazakumullah Khairan.",
    PSB_PENGINGAT_BERKAS: "Pemberitahuan Posko PSB [nama_pondok]: Kepada Yth Bapak/Ibu [ortu] dari calon santri [nama_santri] (No. Reg: [no_reg]), berkas fisik persyaratan masih [status_berkas]. Mohon dapat segera diserahkan ke posko PSB. Syukron.",
};

export interface VariableChip {
    tag: string;
    label: string;
    audience: 'santri' | 'psb' | 'all';
    description?: string;
}

export const VARIABLE_CHIPS: VariableChip[] = [
    // Bersama
    { tag: '[nama_santri]', label: 'Nama Santri / Calon', audience: 'all', description: 'Nama lengkap santri atau calon santri' },
    { tag: '[ortu]', label: 'Nama Ortu / Wali', audience: 'all', description: 'Nama wali, ayah, atau ibu' },
    { tag: '[nama_pondok]', label: 'Nama Pondok', audience: 'all', description: 'Nama pondok pesantren dari pengaturan' },
    { tag: '[tanggal]', label: 'Tanggal', audience: 'all', description: 'Tanggal saat ini / kegiatan' },

    // Khusus Santri Aktif
    { tag: '[nis]', label: 'NIS Santri', audience: 'santri', description: 'Nomor induk santri aktif' },
    { tag: '[kelas]', label: 'Kelas', audience: 'santri', description: 'Nama tingkatan kelas santri' },
    { tag: '[rombel]', label: 'Rombel', audience: 'santri', description: 'Rombongan belajar / kelas spesifik' },
    { tag: '[asrama]', label: 'Gedung / Kamar', audience: 'santri', description: 'Nama kamar dan gedung asrama santri' },
    { tag: '[nominal]', label: 'Total Tunggakan Rp', audience: 'santri', description: 'Total tagihan belum lunas terformat Rp' },
    { tag: '[tunggakan]', label: 'Tunggakan Singkat', audience: 'santri', description: 'Nominal tunggakan singkat' },
    { tag: '[rincian_tagihan]', label: 'Rincian Tagihan', audience: 'santri', description: 'Daftar item tagihan yang belum dibayar' },
    { tag: '[bulan]', label: 'Bulan Berjalan', audience: 'santri', description: 'Nama bulan saat ini (contoh: September)' },

    // Khusus PSB
    { tag: '[no_reg]', label: 'No. Registrasi PSB', audience: 'psb', description: 'Nomor pendaftaran resmi PSB' },
    { tag: '[jalur]', label: 'Jalur Pendaftaran', audience: 'psb', description: 'Jalur pendaftaran (Reguler, Prestasi, dll)' },
    { tag: '[gelombang]', label: 'Gelombang', audience: 'psb', description: 'Gelombang pendaftaran aktif' },
    { tag: '[status_psb]', label: 'Status PSB', audience: 'psb', description: 'Status pendaftar (Baru, Lulus, Cadangan, dll)' },
    { tag: '[status_berkas]', label: 'Status Berkas', audience: 'psb', description: 'Keterangan berkas lengkap / belum lengkap' },
    { tag: '[ruang_ujian]', label: 'Ruang Ujian', audience: 'psb', description: 'Ruang tes seleksi PSB' },
    { tag: '[tanggal_ujian]', label: 'Tanggal Ujian', audience: 'psb', description: 'Jadwal pelaksanaan tes' },
    { tag: '[asal_sekolah]', label: 'Asal Sekolah', audience: 'psb', description: 'Nama sekolah asal pendaftar' },
];

/**
 * Normalizes an Indonesian phone number into standard international format (628xxxxxxxx).
 * Cleans spaces, dashes, leading '0' or '+62' or raw '8xxx'.
 */
export const normalizePhoneNumber = (phone?: string): string => {
    if (!phone) return '';
    let clean = phone.replace(/\D/g, '');
    if (!clean) return '';

    if (clean.startsWith('0')) {
        clean = '62' + clean.substring(1);
    } else if (clean.startsWith('8')) {
        clean = '62' + clean;
    } else if (!clean.startsWith('62')) {
        clean = '62' + clean;
    }

    // Minimum valid length for Indonesian mobile numbers with country code is 10 digits
    if (clean.length < 10) return '';
    return clean;
};

export const formatWAMessage = (template: string, data: Record<string, any>) => {
    let message = template;
    Object.keys(data).forEach(key => {
        const val = data[key] !== undefined && data[key] !== null ? String(data[key]) : '';
        const placeholder = `[${key}]`;
        message = message.replace(new RegExp(`\\${placeholder}`, 'g'), val);
    });
    return message;
};

export const getWAUrl = (phone: string, message: string) => {
    const cleanPhone = normalizePhoneNumber(phone);
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
};

export const sendManualWA = (phone: string | undefined, message: string) => {
    const clean = normalizePhoneNumber(phone);
    if (!clean) {
        alert("Nomor WhatsApp tidak valid atau tidak tersedia!");
        return false;
    }
    window.open(`https://wa.me/${clean}?text=${encodeURIComponent(message)}`, '_blank');
    return true;
};

export const getWAComposerUrl = (message: string) => `https://wa.me/?text=${encodeURIComponent(message)}`;

export const openWAComposer = (message: string) => {
    window.open(getWAComposerUrl(message), '_blank');
};

/**
 * Dispatches a message via external WhatsApp Gateway (Fonnte, Wablas, or Custom Webhook).
 */
export const sendViaGateway = async (
    phone: string,
    message: string,
    config: WaGatewayConfig
): Promise<{ success: boolean; message: string }> => {
    const cleanPhone = normalizePhoneNumber(phone);
    if (!cleanPhone) {
        return { success: false, message: 'Nomor telepon penerima tidak valid' };
    }

    try {
        if (config.provider === 'fonnte') {
            if (!config.apiKey) {
                return { success: false, message: 'API Key Fonnte belum diatur di Pengaturan Gateway WA' };
            }
            const formData = new URLSearchParams();
            formData.append('target', cleanPhone);
            formData.append('message', message);

            const res = await fetch('https://api.fonnte.com/send', {
                method: 'POST',
                headers: {
                    Authorization: config.apiKey.trim(),
                },
                body: formData,
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok && (data.status === true || data.status === 'true' || res.status === 200)) {
                return { success: true, message: 'Pesan berhasil terkirim melalui Fonnte API' };
            }
            return { success: false, message: data.reason || data.detail || `Gagal kirim via Fonnte (${res.status})` };
        }

        if (config.provider === 'wablas') {
            if (!config.apiKey) {
                return { success: false, message: 'API Key Wablas belum diatur di Pengaturan Gateway WA' };
            }
            const domain = (config.endpointUrl || 'https://pati.wablas.com').replace(/\/+$/, '');
            const res = await fetch(`${domain}/api/send-message`, {
                method: 'POST',
                headers: {
                    Authorization: config.apiKey.trim(),
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    phone: cleanPhone,
                    message,
                }),
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok && data.status === true) {
                return { success: true, message: 'Pesan berhasil terkirim melalui Wablas API' };
            }
            return { success: false, message: data.message || `Gagal kirim via Wablas (${res.status})` };
        }

        if (config.provider === 'custom') {
            if (!config.endpointUrl) {
                return { success: false, message: 'Endpoint URL Webhook belum diatur' };
            }
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
            };
            if (config.apiKey) {
                headers.Authorization = `Bearer ${config.apiKey.trim()}`;
            }
            const res = await fetch(config.endpointUrl, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    phone: cleanPhone,
                    message,
                    timestamp: Date.now(),
                }),
            });
            if (res.ok) {
                return { success: true, message: 'Pesan berhasil dikirim via Custom Webhook' };
            }
            return { success: false, message: `Webhook error: ${res.statusText} (${res.status})` };
        }

        return { success: false, message: 'Provider gateway manual: gunakan pembuka tautan wa.me' };
    } catch (error: any) {
        console.error('WhatsApp Gateway Dispatch Error:', error);
        return { success: false, message: error.message || 'Gagal menghubungi server WhatsApp Gateway' };
    }
};

/**
 * Unified sender: Uses configured Gateway API if active, or falls back to direct browser wa.me redirection.
 */
export const dispatchWhatsAppMessage = async (
    phone: string,
    message: string,
    config?: WaGatewayConfig
): Promise<{ success: boolean; channel: 'gateway' | 'manual'; message: string }> => {
    if (config && config.provider && config.provider !== 'manual' && config.apiKey) {
        const result = await sendViaGateway(phone, message, config);
        if (result.success) {
            return { success: true, channel: 'gateway', message: result.message };
        }
        // If gateway fails, we can fall back to manual wa.me
        console.warn('Gateway dispatch failed, falling back to manual wa.me:', result.message);
        sendManualWA(phone, message);
        return { success: true, channel: 'manual', message: `Gateway gagal (${result.message}), dialihkan ke WhatsApp Web` };
    }

    sendManualWA(phone, message);
    return { success: true, channel: 'manual', message: 'Tautan WhatsApp Web/App telah dibuka' };
};

export const triggerAutoNotif = async (type: keyof typeof WA_TEMPLATES, data: any, settings: PondokSettings) => {
    console.log(`Auto-notif triggered for ${type}`, data);
};

