import React, { useState, useEffect } from 'react';
import { BkSession, Santri, PondokSettings } from '../../types';
import { formatDate } from '../../utils/formatters';

interface BkWaModalProps {
    isOpen: boolean;
    onClose: () => void;
    session: BkSession;
    santri: Santri;
    settings: PondokSettings;
    onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

type BkWaTemplateType = 'undangan_wali' | 'panggilan_santri' | 'laporan_perkembangan';

export const BkWaModal: React.FC<BkWaModalProps> = ({
    isOpen,
    onClose,
    session,
    santri,
    settings,
    onShowToast,
}) => {
    // Normalisasi nomor telepon ke format internasional 628...
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

    const defaultPhone = formatPhone(santri.teleponWali || santri.teleponAyah || santri.teleponIbu || santri.telepon);
    const [targetPhone, setTargetPhone] = useState(defaultPhone);
    const [templateType, setTemplateType] = useState<BkWaTemplateType>('undangan_wali');
    const [message, setMessage] = useState('');

    const kamarName = santri.kamarId ? (settings.kamar?.find(k => k.id === santri.kamarId)?.nama || '-') : '-';
    const rombelName = santri.rombelId ? (settings.rombel?.find(r => r.id === santri.rombelId)?.nama || '-') : '-';

    // Format tanggal ramah bahasa Indonesia
    const formatIndoDate = (dateStr?: string) => {
        if (!dateStr) return '-';
        try {
            return new Date(dateStr).toLocaleDateString('id-ID', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
        } catch {
            return dateStr;
        }
    };

    // Generate template message
    const generateTemplate = (type: BkWaTemplateType) => {
        const konselorName = session.konselor || 'Tim Bimbingan & Konseling';
        const tglBerikutnya = session.tanggalBerikutnya ? formatIndoDate(session.tanggalBerikutnya) : '-';

        if (type === 'undangan_wali') {
            return `*UNDANGAN SILATURAHMI & KONSULTASI WALI SANTRI*
*Layanan BK ${settings.namaPonpes}*

Assalamu'alaikum Warahmatullahi Wabarakatuh,

Yth. Bapak/Ibu Wali dari Ananda:
• *Nama:* ${santri.namaLengkap}
• *NIS:* ${santri.nis || '-'}
• *Kelas / Asrama:* ${rombelName} / ${kamarName}

Sehubungan dengan pemantauan pembinaan, akhlak, dan kelancaran pendidikan Ananda di pondok pesantren, kami dari Tim Bimbingan & Konseling (BK) bermaksud mengundang Bapak/Ibu Wali Santri untuk bersilaturahmi dan berdiskusi pada:

• *Hari/Tanggal:* ${session.tanggalBerikutnya ? tglBerikutnya : 'Waktu menyusul / Segera dikonfirmasi'}
• *Waktu:* 09:00 WIB (atau sesuai kesepakatan)
• *Tempat:* Ruang Bimbingan & Konseling (BK) ${settings.namaPonpes}
• *Topik Pembahasan:* Konsultasi & Pembinaan Santri (${session.kategori})
• *Pembina / Konselor:* ${konselorName}

Kehadiran serta sinergi Bapak/Ibu sangat berarti bagi kenyamanan dan kesuksesan proses belajar Ananda di pesantren.

Mohon konfirmasi kehadiran Bapak/Ibu melalui balasan pesan ini. Atas perhatian dan kerja samanya, kami sampaikan _Jazakumullahu Khairan Katsiran_.

Wassalamu'alaikum Warahmatullahi Wabarakatuh.
_Bagian Bimbingan & Konseling ${settings.namaPonpes}_`;
        }

        if (type === 'panggilan_santri') {
            return `*PEMBERITAHUAN JADWAL KONSELING SANTRI*
*Layanan BK ${settings.namaPonpes}*

Assalamu'alaikum Warahmatullahi Wabarakatuh,

Yth. Bapak/Ibu Wali dari Ananda:
• *Nama:* ${santri.namaLengkap}
• *NIS:* ${santri.nis || '-'}
• *Kamar / Asrama:* ${kamarName}

Menginformasikan kepada Bapak/Ibu bahwa Ananda telah dijadwalkan mengikuti sesi pendampingan dan bimbingan konseling di pondok pesantren:

• *Tanggal Sesi:* ${formatDate(session.tanggal)}
• *Kategori Bimbingan:* ${session.kategori}
• *Konselor Pembimbing:* ${konselorName}
• *Jadwal Sesi Lanjutan:* ${session.tanggalBerikutnya ? tglBerikutnya : 'Dalam pemantauan berkala'}
• *Status Perkembangan:* ${session.status}

Layanan BK merupakan sarana suportif bagi seluruh santri agar dapat berkembang optimal secara emosional, spiritual, maupun akademik. Mohon senantiasa iringan doa dari Bapak/Ibu di rumah.

Wassalamu'alaikum Warahmatullahi Wabarakatuh.
_BK & Pengasuhan ${settings.namaPonpes}_`;
        }

        // laporan_perkembangan
        const komitmenText = session.komitmenSantri ? `\n• *Komitmen Santri:* "${session.komitmenSantri}"` : '';
        const hasilText = session.hasil ? `\n• *Hasil Evaluasi:* ${session.hasil}` : '';
        const catatanLog = session.followUpLogs && session.followUpLogs.length > 0 
            ? `\n• *Sesi Lanjutan Terakhir:* ${session.followUpLogs[session.followUpLogs.length - 1].catatan}`
            : '';

        return `*LAPORAN PERKEMBANGAN & KONSELING SANTRI*
*Layanan BK ${settings.namaPonpes}*

Assalamu'alaikum Warahmatullahi Wabarakatuh,

Yth. Bapak/Ibu Wali dari Ananda:
• *Nama:* ${santri.namaLengkap}
• *NIS:* ${santri.nis || '-'}
• *Kamar:* ${kamarName}

Alhamdulillah, berikut kami sampaikan ringkasan evaluasi perkembangan pembinaan Ananda per tanggal *${formatDate(session.tanggal)}*:

• *Fokus Pembinaan:* ${session.kategori}
• *Status Kasus:* ${session.status}${komitmenText}${hasilText}${catatanLog}
• *Jadwal Kontrol:* ${session.tanggalBerikutnya ? tglBerikutnya : 'Sesuai jadwal pemantauan'}
• *Pembimbing:* ${konselorName}

Kami mengajak orang tua untuk terus memberikan doa dan dorongan positif saat berkomunikasi dengan Ananda agar komitmen perbaikan terus terjaga.

Wassalamu'alaikum Warahmatullahi Wabarakatuh.
_Tim BK & Pembinaan Karakter ${settings.namaPonpes}_`;
    };

    useEffect(() => {
        if (isOpen && session && santri) {
            const detected = formatPhone(santri.teleponWali || santri.teleponAyah || santri.teleponIbu || santri.telepon);
            setTargetPhone(detected);
            setMessage(generateTemplate(templateType));
        }
    }, [isOpen, session, santri, settings, templateType]);

    const handleSwitchTemplate = (type: BkWaTemplateType) => {
        setTemplateType(type);
        setMessage(generateTemplate(type));
    };

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
            onShowToast('Teks pesan WhatsApp berhasil disalin ke clipboard.', 'success');
        } catch {
            onShowToast('Gagal menyalin teks.', 'error');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[95] flex justify-center items-center p-3 sm:p-4 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl flex flex-col max-h-[92vh] overflow-hidden border border-emerald-100 my-auto">
                {/* Header */}
                <div className="p-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-2.5">
                        <span className="p-2 bg-white/20 rounded-xl">
                            <i className="bi bi-whatsapp text-lg"></i>
                        </span>
                        <div>
                            <h3 className="font-bold text-base leading-tight">Kirim Informasi BK ke Wali Santri</h3>
                            <p className="text-xs text-emerald-100">
                                Santri: <strong>{santri.namaLengkap}</strong> &bull; {session.kategori}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
                        title="Tutup"
                    >
                        <i className="bi bi-x-lg text-lg"></i>
                    </button>
                </div>

                {/* Body */}
                <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-grow text-xs custom-scrollbar">
                    {/* Template Picker */}
                    <div>
                        <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                            <span>Pilih Template Pesan WhatsApp:</span>
                            <span className="text-[10px] font-normal text-gray-400">Siap kirim dengan data otomatis</span>
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <button
                                type="button"
                                onClick={() => handleSwitchTemplate('undangan_wali')}
                                className={`p-2.5 rounded-xl border text-left transition flex flex-col gap-1 cursor-pointer ${
                                    templateType === 'undangan_wali'
                                        ? 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-500/20 shadow-xs'
                                        : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                                }`}
                            >
                                <div className="flex items-center gap-1.5 font-bold text-xs">
                                    <i className="bi bi-envelope-open text-emerald-600"></i>
                                    Undangan Wali
                                </div>
                                <span className="text-[10px] text-gray-500">Musyawarah/silaturahmi</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => handleSwitchTemplate('panggilan_santri')}
                                className={`p-2.5 rounded-xl border text-left transition flex flex-col gap-1 cursor-pointer ${
                                    templateType === 'panggilan_santri'
                                        ? 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-500/20 shadow-xs'
                                        : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                                }`}
                            >
                                <div className="flex items-center gap-1.5 font-bold text-xs">
                                    <i className="bi bi-person-check text-emerald-600"></i>
                                    Jadwal Konseling
                                </div>
                                <span className="text-[10px] text-gray-500">Pemberitahuan sesi santri</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => handleSwitchTemplate('laporan_perkembangan')}
                                className={`p-2.5 rounded-xl border text-left transition flex flex-col gap-1 cursor-pointer ${
                                    templateType === 'laporan_perkembangan'
                                        ? 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-500/20 shadow-xs'
                                        : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                                }`}
                            >
                                <div className="flex items-center gap-1.5 font-bold text-xs">
                                    <i className="bi bi-journal-check text-emerald-600"></i>
                                    Hasil & Komitmen
                                </div>
                                <span className="text-[10px] text-gray-500">Laporan evaluasi/progres</span>
                            </button>
                        </div>
                    </div>

                    {/* Phone Number Input */}
                    <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-1.5 flex items-center justify-between">
                            <span>Nomor WhatsApp Wali / Orang Tua</span>
                            <span className="text-[10px] font-normal text-gray-500">Format internasional: 628...</span>
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
                                className="w-full border border-gray-300 rounded-xl pl-9 pr-3 py-2 text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden bg-white"
                            />
                        </div>

                        {/* Quick Selection Pills */}
                        <div className="flex flex-wrap gap-1.5 mt-2">
                            {santri.teleponWali && (
                                <button
                                    type="button"
                                    onClick={() => setTargetPhone(formatPhone(santri.teleponWali))}
                                    className="text-[11px] bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md transition cursor-pointer"
                                >
                                    Wali: {santri.teleponWali}
                                </button>
                            )}
                            {santri.teleponAyah && (
                                <button
                                    type="button"
                                    onClick={() => setTargetPhone(formatPhone(santri.teleponAyah))}
                                    className="text-[11px] bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-md transition cursor-pointer"
                                >
                                    Ayah: {santri.teleponAyah}
                                </button>
                            )}
                            {santri.teleponIbu && (
                                <button
                                    type="button"
                                    onClick={() => setTargetPhone(formatPhone(santri.teleponIbu))}
                                    className="text-[11px] bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-md transition cursor-pointer"
                                >
                                    Ibu: {santri.teleponIbu}
                                </button>
                            )}
                            {santri.telepon && (
                                <button
                                    type="button"
                                    onClick={() => setTargetPhone(formatPhone(santri.telepon))}
                                    className="text-[11px] bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 px-2 py-0.5 rounded-md transition cursor-pointer"
                                >
                                    Santri: {santri.telepon}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Message Preview */}
                    <div>
                        <div className="flex justify-between items-center mb-1.5">
                            <label className="text-[11px] font-bold text-gray-700">Draf Pesan WhatsApp</label>
                            <span className="text-[10px] text-gray-400">Dapat diedit bebas sebelum dikirim</span>
                        </div>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            rows={11}
                            className="w-full border border-gray-300 rounded-xl p-3 text-xs font-sans text-gray-800 leading-relaxed focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden bg-gray-50/70"
                        />
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-3.5 bg-gray-50 border-t border-gray-200 flex flex-wrap justify-between items-center gap-2 shrink-0">
                    <button
                        type="button"
                        onClick={handleCopyText}
                        className="px-3 py-2 rounded-xl text-xs font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 transition flex items-center gap-1.5 cursor-pointer"
                    >
                        <i className="bi bi-clipboard"></i> Salin Pesan
                    </button>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-200 rounded-xl transition cursor-pointer"
                        >
                            Batal
                        </button>
                        <button
                            type="button"
                            onClick={handleSendWhatsApp}
                            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer"
                        >
                            <i className="bi bi-whatsapp"></i> Buka WhatsApp
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
