
import { Santri, Tagihan, Pembayaran, PondokSettings } from '../types';

export const WA_TEMPLATES = {
    TAGIHAN: "Assalamualaikum Bapak/Ibu [ortu], menginfokan tagihan [nama_santri] bulan [bulan] sebesar Rp [nominal] belum terlunasi. Mohon segera diselesaikan. Syukron.",
    KWITANSI: "Alhamdulillah, pembayaran [nama_santri] sebesar Rp [nominal] untuk [item] telah kami terima pada [tanggal]. Jazakumullah Khairan.",
    TAHFIZH: "Laporan Tahfizh [nama_santri]: Hari ini telah menyetorkan [tipe] Juz [juz] Surah [surah]. Predikat: [predikat]. Terus semangat!",
    PENGUMUMAN: "PENGUMUMAN PONDOK: [pesan]. Mohon menjadi periksa. Syukron.",
    SIARAN_UMUM: "Assalamualaikum. [pesan]\n\nInfo: [agenda]\nTanggal: [tanggal]\n\nTerima kasih.",
    SIARAN_GRUP: "Assalamualaikum Ayah/Bunda. [pesan]\n\nPengumuman Grup: [agenda]\nTanggal: [tanggal]\n\nMohon disimak bersama."
};

export const formatWAMessage = (template: string, data: any) => {
    let message = template;
    Object.keys(data).forEach(key => {
        const placeholder = `[${key}]`;
        message = message.replace(new RegExp(`\\${placeholder}`, 'g'), data[key]);
    });
    return message;
};

export const getWAUrl = (phone: string, message: string) => {
    // Clean phone number: remove non-digits, ensure starts with 62
    let cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) {
        cleanPhone = '62' + cleanPhone.substring(1);
    } else if (!cleanPhone.startsWith('62')) {
        cleanPhone = '62' + cleanPhone;
    }
    
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
};

export const sendManualWA = (phone: string | undefined, message: string) => {
    if (!phone) {
        alert("Nomor telepon tidak tersedia!");
        return;
    }
    window.open(getWAUrl(phone, message), '_blank');
};

export const getWAComposerUrl = (message: string) => `https://wa.me/?text=${encodeURIComponent(message)}`;

export const openWAComposer = (message: string) => {
    window.open(getWAComposerUrl(message), '_blank');
};

/**
 * Advanced: If API config is available, it could send via fetch.
 * For now, focusing on the highly effective manual redirect method.
 */
export const triggerAutoNotif = async (type: keyof typeof WA_TEMPLATES, data: any, settings: PondokSettings) => {
    console.log(`Auto-notif triggered for ${type}`, data);
    // Logic for background API could go here
};
