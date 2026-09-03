import React, { useState, useEffect } from 'react';
import { KesehatanRecord, Santri, PondokSettings } from '../../types';
import { formatDate } from '../../utils/formatters';

interface WhatsAppHealthModalProps {
    isOpen: boolean;
    onClose: () => void;
    record: KesehatanRecord;
    santri: Santri;
    settings: PondokSettings;
    onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const WhatsAppHealthModal: React.FC<WhatsAppHealthModalProps> = ({
    isOpen,
    onClose,
    record,
    santri,
    settings,
    onShowToast
}) => {
    // Normalisasi nomor telepon
    const formatPhone = (phone?: string) => {
        if (!phone) return '';
        let cleaned = phone.replace(/[^0-9]/g, '');
        if (cleaned.startsWith('0')) {
            cleaned = '62' + cleaned.slice(1);
        } else if (cleaned.startsWith('8')) {
            cleaned = '62' + cleaned;
        }
        return cleaned;
    };

    const defaultPhone = formatPhone(santri.teleponWali || santri.teleponAyah || santri.teleponIbu);
    const [targetPhone, setTargetPhone] = useState(defaultPhone);
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (isOpen && record && santri) {
            const detected = formatPhone(santri.teleponWali || santri.teleponAyah || santri.teleponIbu);
            setTargetPhone(detected);

            const kamarName = santri.kamarId ? settings.kamar.find(k => k.id === santri.kamarId)?.nama : '-';
            
            // Format tanda vital
            const vitalList: string[] = [];
            if (record.suhuTubuh) vitalList.push(`Suhu: ${record.suhuTubuh}°C`);
            if (record.tekananDarah) vitalList.push(`Tensi: ${record.tekananDarah} mmHg`);
            if (record.beratBadan) vitalList.push(`BB: ${record.beratBadan} kg`);
            const vitalText = vitalList.length > 0 ? `\n• *Tanda Vital:* ${vitalList.join(', ')}` : '';

            // Format rujukan jika ada
            const rujukanText = record.status === 'Rujuk RS/Klinik' && record.faskesRujukan
                ? `\n• *Faskes Rujukan:* ${record.faskesRujukan}${record.alasanRujukan ? ` (${record.alasanRujukan})` : ''}`
                : '';

            const durasiText = record.lamaIstirahatHari ? ` selama ${record.lamaIstirahatHari} hari` : '';

            const templateMsg = `*PEMBERITAHUAN KESEHATAN SANTRI*
*Poskestren ${settings.namaPonpes}*

Assalamu'alaikum Warahmatullahi Wabarakatuh,
Yth. Bapak/Ibu Wali dari Ananda:
• *Nama:* ${santri.namaLengkap}
• *NIS:* ${santri.nis}
• *Asrama:* ${kamarName}

Menginformasikan bahwa Ananda telah diperiksa di Poskestren pada *${formatDate(record.tanggal)}* dengan rincian:
• *Keluhan:* ${record.keluhan || '-'}
• *Diagnosa:* ${record.diagnosa || '-'}${vitalText}
• *Status Rawat:* ${record.status}${durasiText}${rujukanText}
• *Tindakan / Terapi:* ${record.tindakan || '-'}
${record.catatan ? `• *Catatan Tambahan:* ${record.catatan}\n` : ''}• *Pemeriksa:* ${record.pemeriksa || 'Tim Medis Poskestren'}

Mohon doa dari Bapak/Ibu agar Ananda senantiasa diberikan kesembuhan dan pulih kembali seperti sedia kala. Tim kesehatan kami terus memantau perkembangannya dengan penuh perhatian.

Wassalamu'alaikum Warahmatullahi Wabarakatuh.
_Poskestren ${settings.namaPonpes}_`;

            setMessage(templateMsg);
        }
    }, [isOpen, record, santri, settings]);

    if (!isOpen) return null;

    const handleSendWhatsApp = () => {
        if (!targetPhone) {
            alert('Silakan masukkan nomor WhatsApp wali terlebih dahulu.');
            return;
        }
        const cleaned = formatPhone(targetPhone);
        const encoded = encodeURIComponent(message);
        window.open(`https://wa.me/${cleaned}?text=${encoded}`, '_blank');
        onShowToast('Membuka WhatsApp...', 'info');
        onClose();
    };

    const handleCopyText = async () => {
        try {
            await navigator.clipboard.writeText(message);
            onShowToast('Teks laporan berhasil disalin ke clipboard.', 'success');
        } catch (err) {
            onShowToast('Gagal menyalin teks.', 'error');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[80] flex justify-center items-center p-4 backdrop-blur-xs">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[92vh] overflow-hidden border border-emerald-100 animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex justify-between items-center">
                    <div className="flex items-center gap-2.5">
                        <span className="p-2 bg-white/20 rounded-xl">
                            <i className="bi bi-whatsapp text-lg"></i>
                        </span>
                        <div>
                            <h3 className="font-bold text-base leading-tight">Kirim Laporan Medis ke Wali</h3>
                            <p className="text-xs text-emerald-100">Santri: {santri.namaLengkap}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition">
                        <i className="bi bi-x-lg text-lg"></i>
                    </button>
                </div>

                {/* Body */}
                <div className="p-5 space-y-4 overflow-y-auto flex-grow text-sm">
                    {/* Phone Number Input */}
                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center justify-between">
                            <span>Nomor WhatsApp Wali / Orang Tua</span>
                            <span className="text-[11px] font-normal text-gray-500">Format internasional: 628...</span>
                        </label>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                                <i className="bi bi-telephone-fill text-xs"></i>
                            </span>
                            <input
                                type="text"
                                value={targetPhone}
                                onChange={(e) => setTargetPhone(e.target.value)}
                                placeholder="Contoh: 628123456789"
                                className="w-full border border-gray-300 rounded-xl pl-9 pr-3 py-2 text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden"
                            />
                        </div>

                        {/* Quick Selection Pills */}
                        <div className="flex flex-wrap gap-1.5 mt-2">
                            {santri.teleponWali && (
                                <button
                                    type="button"
                                    onClick={() => setTargetPhone(formatPhone(santri.teleponWali))}
                                    className="text-[11px] bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md transition"
                                >
                                    Wali: {santri.teleponWali}
                                </button>
                            )}
                            {santri.teleponAyah && (
                                <button
                                    type="button"
                                    onClick={() => setTargetPhone(formatPhone(santri.teleponAyah))}
                                    className="text-[11px] bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-md transition"
                                >
                                    Ayah: {santri.teleponAyah}
                                </button>
                            )}
                            {santri.teleponIbu && (
                                <button
                                    type="button"
                                    onClick={() => setTargetPhone(formatPhone(santri.teleponIbu))}
                                    className="text-[11px] bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-md transition"
                                >
                                    Ibu: {santri.teleponIbu}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Message Preview */}
                    <div>
                        <div className="flex justify-between items-center mb-1.5">
                            <label className="text-xs font-bold text-gray-700">Draf Pesan WhatsApp</label>
                            <span className="text-[11px] text-gray-400">Dapat diedit sebelum dikirim</span>
                        </div>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            rows={10}
                            className="w-full border border-gray-300 rounded-xl p-3 text-xs font-sans text-gray-800 leading-relaxed focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden bg-gray-50/50"
                        />
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-4 bg-gray-50 border-t flex flex-wrap justify-between items-center gap-2">
                    <button
                        type="button"
                        onClick={handleCopyText}
                        className="px-3 py-2 rounded-xl text-xs font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 transition flex items-center gap-1.5"
                    >
                        <i className="bi bi-clipboard"></i> Salin Pesan
                    </button>

                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-200 rounded-xl transition"
                        >
                            Batal
                        </button>
                        <button
                            type="button"
                            onClick={handleSendWhatsApp}
                            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-2"
                        >
                            <i className="bi bi-whatsapp"></i> Buka WhatsApp
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
