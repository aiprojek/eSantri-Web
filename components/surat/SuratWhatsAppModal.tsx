import React, { useState, useEffect } from 'react';
import { ArsipSurat, Santri, PondokSettings } from '../../types';

interface SuratWhatsAppModalProps {
    isOpen: boolean;
    onClose: () => void;
    arsip: ArsipSurat | null;
    santri?: Santri | null;
    settings: PondokSettings;
    onToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const SuratWhatsAppModal: React.FC<SuratWhatsAppModalProps> = ({
    isOpen,
    onClose,
    arsip,
    santri,
    settings,
    onToast
}) => {
    const [phone, setPhone] = useState('');
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (!isOpen || !arsip) return;

        // Auto-detect phone number
        const rawPhone = arsip.nomorHpTujuan || santri?.telepon || santri?.teleponAyah || santri?.teleponIbu || santri?.teleponWali || '';
        let cleanPhone = rawPhone.replace(/\D/g, '');
        if (cleanPhone.startsWith('0')) {
            cleanPhone = '62' + cleanPhone.slice(1);
        }
        setPhone(cleanPhone);

        // Pre-fill message
        const namaSantri = santri?.namaLengkap || arsip.tujuan || 'Santri';
        const namaPondok = settings.namaPonpes || 'Pondok Pesantren';
        const perihal = arsip.perihal || 'Pemberitahuan Resmi';
        const nomor = arsip.nomorSurat || '-';
        const tanggal = arsip.tanggalCetak || new Date(arsip.tanggalBuat).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

        const templateMsg = `*NOTIFIKASI SURAT RESMI PESANTREN*
_Assalamu'alaikum Warahmatullahi Wabarakatuh_

Yth. Orang Tua / Wali dari ananda *${namaSantri}*,

Kami menginformasikan bahwa Bagian Administrasi Tata Usaha *${namaPondok}* telah menerbitkan surat resmi:

📄 *Perihal:* ${perihal}
🔢 *Nomor Surat:* ${nomor}
📅 *Tanggal Terbit:* ${tanggal}
👤 *Atas Nama:* ${namaSantri}

Surat fisik/asli dapat diambil langsung di Kantor Sekretariat Tata Usaha Pesantren pada jam kerja kedinasan, atau dapat dikonfirmasikan lebih lanjut ke nomor kontak resmi pondok.

Demikian pemberitahuan ini kami sampaikan. Atas perhatian dan kerja samanya kami ucapkan terima kasih.

_Wassalamu'alaikum Warahmatullahi Wabarakatuh_
*Sekretariat Tata Usaha*
*${namaPondok}*`;

        setMessage(templateMsg);
    }, [isOpen, arsip, santri, settings]);

    if (!isOpen || !arsip) return null;

    const handleSendWhatsApp = () => {
        let cleanPhone = phone.replace(/\D/g, '');
        if (cleanPhone.startsWith('0')) {
            cleanPhone = '62' + cleanPhone.slice(1);
        }
        if (!cleanPhone) {
            onToast?.('Nomor WhatsApp tujuan wajib diisi', 'error');
            return;
        }

        const encodedMsg = encodeURIComponent(message);
        const url = `https://wa.me/${cleanPhone}?text=${encodedMsg}`;
        window.open(url, '_blank', 'noopener,noreferrer');
        onToast?.('Membuka WhatsApp...', 'success');
        onClose();
    };

    const handleCopyText = async () => {
        try {
            await navigator.clipboard.writeText(message);
            onToast?.('Teks pesan berhasil disalin ke clipboard', 'success');
        } catch {
            onToast?.('Gagal menyalin teks', 'error');
        }
    };

    return (
        <div className="app-overlay fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="app-modal flex max-h-[90vh] w-full max-w-lg flex-col rounded-[28px] bg-white shadow-2xl overflow-hidden border border-slate-200">
                <div className="flex items-center justify-between border-b border-app-border bg-emerald-50 px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm">
                            <i className="bi bi-whatsapp text-lg"></i>
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 text-base">Kirim Notifikasi Surat ke Wali</h3>
                            <p className="text-xs text-slate-500">Kirimkan ringkasan surat langsung ke nomor WhatsApp wali santri</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="app-button-ghost h-9 w-9 rounded-full p-0 text-slate-500 hover:bg-emerald-100">
                        <i className="bi bi-x-lg"></i>
                    </button>
                </div>

                <div className="app-scrollbar flex-grow space-y-4 overflow-y-auto p-6 text-sm">
                    <div>
                        <label className="mb-1 block font-medium text-slate-700 text-xs">Nomor WhatsApp Tujuan</label>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                                <i className="bi bi-telephone"></i>
                            </span>
                            <input
                                type="text"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="Contoh: 081234567890 atau 6281234567890"
                                className="app-input w-full pl-9 pr-3 py-2 text-sm font-mono rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                            />
                        </div>
                        <p className="mt-1 text-[11px] text-slate-400">Gunakan awalan 08... atau 628...</p>
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="block font-medium text-slate-700 text-xs">Isi Pesan Notifikasi</label>
                            <button
                                type="button"
                                onClick={handleCopyText}
                                className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
                            >
                                <i className="bi bi-clipboard"></i> Salin Teks
                            </button>
                        </div>
                        <textarea
                            rows={9}
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            className="app-input w-full p-3 text-xs leading-relaxed font-sans rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-emerald-500 resize-none"
                        />
                    </div>
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-app-border bg-slate-50 p-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="app-button-secondary px-4 py-2 text-sm rounded-xl"
                    >
                        Batal
                    </button>
                    <button
                        type="button"
                        onClick={handleSendWhatsApp}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-5 py-2 text-sm rounded-xl flex items-center gap-2 shadow-sm transition-all"
                    >
                        <i className="bi bi-whatsapp"></i> Buka WhatsApp
                    </button>
                </div>
            </div>
        </div>
    );
};
