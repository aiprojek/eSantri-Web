import React, { useRef, useState } from 'react';
import { BukuTamu as BukuTamuType, PondokSettings, Santri } from '../../types';
import { useAppContext } from '../../AppContext';
import { printToPdfNative } from '../../utils/pdfGenerator';

export const generateVisitorBadgeWaMessage = (
    guest: BukuTamuType,
    settings: PondokSettings,
    santri?: Santri | null
): string => {
    const tanggalFormatted = new Date(guest.tanggal).toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
    const jamMasukFormatted = new Date(guest.jamMasuk).toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit'
    });
    const namaPonpes = (settings.namaPonpes || 'PONDOK PESANTREN').toUpperCase();
    const nomorBadge = guest.nomorBadge || `T-${guest.id.toString().padStart(3, '0')}`;

    return `*KARTU IZIN MASUK / VISITOR PASS DIGITAL*
*${namaPonpes}*
━━━━━━━━━━━━━━━━━━━━━━
🎫 *NOMOR BADGE: ${nomorBadge}*
📋 *No. Registrasi:* #${guest.id}
━━━━━━━━━━━━━━━━━━━━━━
👤 *Nama Tamu:* ${guest.namaTamu}
🏷️ *Kategori:* ${guest.kategori}
👥 *Jumlah Rombongan:* ${guest.jumlahRombongan || 1} Orang
📅 *Hari/Tanggal:* ${tanggalFormatted}
⏰ *Jam Masuk:* ${jamMasukFormatted} WIB
${santri ? `🎓 *Santri Dikunjungi:* ${santri.namaLengkap} (NIS: ${santri.nis})\n` : ''}${guest.bertemuDengan ? `🤝 *Bertemu Dengan:* ${guest.bertemuDengan}\n` : ''}🎯 *Keperluan:* ${guest.keperluan}
${guest.jenisIdentitas ? `🪪 *Identitas Fisik:* ${guest.jenisIdentitas} ${guest.nomorIdentitas ? `(${guest.nomorIdentitas})` : ''} (Ditahan di Pos Gerbang)\n` : ''}${guest.kendaraan ? `🚗 *Kendaraan:* ${guest.kendaraan} ${guest.platNomor ? `[${guest.platNomor}]` : ''}\n` : ''}👮 *Petugas Jaga:* ${guest.petugas || 'Petugas Satpam'}
━━━━━━━━━━━━━━━━━━━━━━
⚠️ *TATA TERTIB KUNJUNGAN:*
1. Wajib berbusana sopan & menutup aurat di seluruh lingkungan pondok.
2. Menjaga ketertiban, ketenangan belajar & sholat santri.
3. Wajib melapor dan mengembalikan kartu badge saat check-out/pulang.

_Pesan resmi ini sah sebagai bukti izin masuk digital di pos keamanan._
dibuat dengan Esantri Web by AI Projek | aiprojek01.my.id`;
};

interface TiketPassTamuModalProps {
    isOpen: boolean;
    onClose: () => void;
    guest: BukuTamuType | null;
    settings: PondokSettings;
    santri?: Santri | null;
}

export const TiketPassTamuModal: React.FC<TiketPassTamuModalProps> = ({
    isOpen,
    onClose,
    guest,
    settings,
    santri
}) => {
    const { showToast, showAlert } = useAppContext();
    const printRef = useRef<HTMLDivElement>(null);
    const [targetPhone, setTargetPhone] = useState<string>(guest?.noHp || '');
    const [showPhoneEditor, setShowPhoneEditor] = useState(false);
    const [copied, setCopied] = useState(false);
    const [isPrinting, setIsPrinting] = useState(false);

    // Track print modal state on body for print isolation
    React.useEffect(() => {
        if (isOpen) {
            document.body.classList.add('modal-print-open');
            return () => {
                document.body.classList.remove('modal-print-open');
            };
        }
    }, [isOpen]);

    // Update target phone if guest changes
    React.useEffect(() => {
        if (guest) {
            setTargetPhone(guest.noHp || '');
            setShowPhoneEditor(!guest.noHp);
            setCopied(false);
        }
    }, [guest]);

    if (!isOpen || !guest) return null;

    const handlePrint = async () => {
        try {
            setIsPrinting(true);
            await printToPdfNative('tiket-pass-tamu-print', `Badge_Visitor_${guest.namaTamu.replace(/\s+/g, '_')}`, {
                paperSize: 'A6',
                orientation: 'portrait',
                margin: { top: 0.4, right: 0.5, bottom: 0.4, left: 0.5 }
            });
            showToast('Dialog cetak kartu badge terbuka', 'info');
        } catch (err) {
            console.error('Print error:', err);
            window.print();
        } finally {
            setIsPrinting(false);
        }
    };

    const handleSendWhatsApp = (customNumber?: string) => {
        const phone = (customNumber ?? targetPhone)?.replace(/\D/g, '');
        if (!phone) {
            setShowPhoneEditor(true);
            showAlert('Nomor WhatsApp Diperlukan', 'Silakan masukkan nomor WhatsApp tujuan pengiriman kartu badge digital.');
            return;
        }
        const cleanPhone = phone.startsWith('0') ? '62' + phone.substring(1) : phone;
        const msg = generateVisitorBadgeWaMessage(guest, settings, santri);
        window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
        showToast('Membuka WhatsApp untuk mengirim kartu badge...', 'info');
    };

    const handleCopyBadgeText = () => {
        const msg = generateVisitorBadgeWaMessage(guest, settings, santri);
        navigator.clipboard.writeText(msg);
        setCopied(true);
        showToast('Teks lengkap kartu badge berhasil disalin ke clipboard', 'success');
        setTimeout(() => setCopied(false), 3000);
    };

    const jamMasukFormatted = new Date(guest.jamMasuk).toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit'
    });

    const tanggalFormatted = new Date(guest.tanggal).toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    return (
        <div className="print-modal-target fixed inset-0 bg-black/60 z-[75] flex justify-center items-center p-3 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static">
            {/* CSS Cetak Khusus Standar Ukuran Kertas A6 */}
            <style>{`
                @media print {
                    @page {
                        size: A6 portrait;
                        margin: 4mm 5mm;
                    }
                    *, *::before, *::after {
                        box-shadow: none !important;
                        -webkit-box-shadow: none !important;
                        text-shadow: none !important;
                        filter: none !important;
                    }
                    html, body {
                        width: 100% !important;
                        height: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        background: #ffffff !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    .print-ticket-a6 {
                        width: 100% !important;
                        max-width: 100% !important;
                        margin: 0 auto !important;
                        padding: 4mm !important;
                        box-shadow: none !important;
                        border: 1px dashed #9ca3af !important;
                        page-break-inside: avoid !important;
                    }
                }
            `}</style>

            <div className="print-modal-card bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden my-auto print:shadow-none print:w-full print:max-w-none print:rounded-none print:max-h-none print:m-0">
                {/* Header Modal (Hidden in Print) */}
                <div className="p-4 bg-teal-800 text-white flex items-center justify-between shrink-0 print:hidden">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-teal-700/80 text-teal-200 flex items-center justify-center text-lg shrink-0">
                            <i className="bi bi-ticket-perforated-fill"></i>
                        </div>
                        <div>
                            <h3 className="font-bold text-sm leading-tight">Tiket Pass &amp; Badge Visitor</h3>
                            <p className="text-[11px] text-teal-100">{guest.namaTamu} &bull; Badge: <strong className="text-white">{guest.nomorBadge || 'Tanpa Badge'}</strong></p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={handlePrint}
                            disabled={isPrinting}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-teal-950 font-bold text-xs rounded-lg transition-colors shadow-sm disabled:opacity-50"
                            title="Cetak Tiket ke Kertas Ukuran A6"
                        >
                            <i className={`bi ${isPrinting ? 'bi-hourglass-split animate-spin' : 'bi-printer'}`}></i>
                            <span>{isPrinting ? 'Menyiapkan...' : 'Cetak A6'}</span>
                        </button>
                        <button
                            onClick={onClose}
                            className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-teal-700/50 transition-colors"
                        >
                            <i className="bi bi-x-lg"></i>
                        </button>
                    </div>
                </div>

                {/* Banner Info Kertas A6 & Alternatif WhatsApp (Hidden in Print) */}
                <div className="bg-teal-50 border-b border-teal-100 px-4 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs text-teal-900 shrink-0 print:hidden">
                    <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-teal-800 text-white font-black text-[10px] uppercase tracking-wider shrink-0">
                            Format A6
                        </span>
                        <span className="text-[11px] font-semibold text-teal-950">
                            Ukuran Kertas 105 × 148 mm (¼ Lembar HVS A4)
                        </span>
                    </div>
                    <span className="text-[11px] text-emerald-800 font-bold flex items-center gap-1">
                        <i className="bi bi-whatsapp text-emerald-600"></i> Alternatif Tanpa Printer: Kirim via WA
                    </span>
                </div>

                {/* Scrollable Body Modal */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-5 bg-gray-100/60 print:p-0 print:bg-white overscroll-contain">
                    {/* Kotak Pengiriman WhatsApp Digital Pass (Hidden in Print) */}
                    <div className="mb-4 bg-emerald-50/90 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-950 shadow-2xs space-y-2.5 print:hidden">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2 font-bold text-emerald-900">
                                <i className="bi bi-whatsapp text-lg text-emerald-600"></i>
                                <span>Kirim Kartu Badge Digital via WhatsApp</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <button
                                    type="button"
                                    onClick={handleCopyBadgeText}
                                    className="px-2.5 py-1 bg-white hover:bg-emerald-100/60 border border-emerald-300 text-emerald-900 text-[11px] font-bold rounded-lg transition-colors flex items-center gap-1"
                                    title="Salin seluruh format teks kartu badge ke clipboard"
                                >
                                    <i className={`bi ${copied ? 'bi-check-lg text-emerald-600' : 'bi-clipboard'}`}></i>
                                    <span>{copied ? 'Tersalin!' : 'Salin Teks WA'}</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleSendWhatsApp()}
                                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg transition-colors shadow-2xs flex items-center gap-1"
                                    title="Buka WhatsApp & Kirim Langsung"
                                >
                                    <i className="bi bi-send-fill"></i>
                                    <span>Kirim ke WA Tamu</span>
                                </button>
                            </div>
                        </div>

                        {/* Field No WhatsApp */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-1 border-t border-emerald-200/70">
                            <span className="text-[11px] text-emerald-800 font-medium shrink-0">
                                No. WhatsApp Tamu:
                            </span>
                            <div className="flex-1 flex items-center gap-2">
                                <input
                                    type="tel"
                                    value={targetPhone}
                                    onChange={(e) => setTargetPhone(e.target.value)}
                                    placeholder="Contoh: 08123456789"
                                    className="flex-1 bg-white border border-emerald-300 rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-emerald-950 focus:ring-1 focus:ring-emerald-500"
                                />
                                {targetPhone && targetPhone !== guest.noHp && (
                                    <span className="text-[10px] text-emerald-700 italic shrink-0">
                                        (Nomor kustom)
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Preview Kertas A6 (Printable Ticket Area) */}
                    <div
                        ref={printRef}
                        id="tiket-pass-tamu-print"
                        className="print-ticket-a6 mx-auto bg-white text-gray-900 rounded-xl shadow-none sm:shadow-xs border border-gray-300 p-4 sm:p-5 max-w-[400px] font-sans print:shadow-none print:rounded-none"
                    >
                        {/* Kop Pesantren */}
                        <div className="border-b-2 border-dashed border-gray-400 pb-2.5 mb-2.5 text-center relative">
                            {settings.logoPonpesUrl && (
                                <img
                                    src={settings.logoPonpesUrl}
                                    alt="Logo"
                                    className="w-10 h-10 object-contain mx-auto mb-1"
                                />
                            )}
                            <h2 className="text-sm sm:text-base font-black uppercase tracking-wide text-teal-950 leading-tight">
                                {settings.namaPonpes || 'PONDOK PESANTREN MODERN'}
                            </h2>
                            <p className="text-[9px] text-gray-600 mt-0.5 leading-snug">
                                {settings.alamat || 'Alamat Pesantren'} &bull; Telp: {settings.telepon || '-'}
                            </p>
                            <div className="mt-1.5 inline-block px-2.5 py-0.5 bg-teal-900 text-white text-[8px] font-extrabold uppercase tracking-widest rounded-full">
                                KARTU IZIN MASUK / VISITOR PASS
                            </div>
                        </div>

                        {/* Badge & Pass Number Highlight */}
                        <div className="border border-teal-200 bg-teal-50/70 rounded-xl p-2 text-center mb-2.5">
                            <div className="text-[9px] font-bold text-teal-700 uppercase tracking-wider">
                                NOMOR BADGE VISITOR
                            </div>
                            <div className="text-2xl font-black text-teal-950 font-mono tracking-tight leading-tight my-0.5">
                                {guest.nomorBadge || `T-${guest.id.toString().padStart(3, '0')}`}
                            </div>
                            <div className="text-[9px] text-gray-500">
                                Wajib dikenakan selama berada di lingkungan pesantren
                            </div>
                        </div>

                        {/* Guest Detail Data */}
                        <div className="space-y-1 text-[11px] border-b border-dashed border-gray-300 pb-2.5 mb-2.5">
                            <div className="flex justify-between">
                                <span className="text-gray-500">No. Registrasi:</span>
                                <span className="font-mono font-bold text-gray-800">#{guest.id}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Hari &amp; Tanggal:</span>
                                <span className="font-medium text-gray-800">{tanggalFormatted}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Jam Masuk:</span>
                                <span className="font-mono font-bold text-teal-800">{jamMasukFormatted} WIB</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Nama Tamu:</span>
                                <span className="font-bold text-gray-900">{guest.namaTamu}</span>
                            </div>
                            {guest.noHp && (
                                <div className="flex justify-between">
                                    <span className="text-gray-500">No. HP/WA:</span>
                                    <span className="font-mono text-gray-800">{guest.noHp}</span>
                                </div>
                            )}
                            <div className="flex justify-between">
                                <span className="text-gray-500">Kategori Tamu:</span>
                                <span className="font-semibold text-gray-800">{guest.kategori}</span>
                            </div>
                            {guest.jumlahRombongan && guest.jumlahRombongan > 1 && (
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Jumlah Rombongan:</span>
                                    <span className="font-bold text-gray-800">{guest.jumlahRombongan} Orang</span>
                                </div>
                            )}
                            {guest.jenisIdentitas && (
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Identitas Ditahan:</span>
                                    <span className="font-medium text-gray-800">
                                        {guest.jenisIdentitas} {guest.nomorIdentitas ? `(${guest.nomorIdentitas})` : ''}
                                    </span>
                                </div>
                            )}
                            {guest.kendaraan && (
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Kendaraan:</span>
                                    <span className="font-mono text-gray-800">
                                        {guest.kendaraan} {guest.platNomor ? `[${guest.platNomor}]` : ''}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Tujuan / Keperluan */}
                        <div className="bg-gray-50 p-2 rounded-lg border border-gray-200 text-[11px] mb-2.5 space-y-1">
                            {santri && (
                                <div>
                                    <span className="text-gray-500 block text-[9px] uppercase font-bold">Santri Dikunjungi:</span>
                                    <span className="font-bold text-teal-900 text-xs">{santri.namaLengkap}</span>
                                    <span className="text-[9px] text-gray-500 block">NIS: {santri.nis}</span>
                                </div>
                            )}
                            {guest.bertemuDengan && (
                                <div>
                                    <span className="text-gray-500 block text-[9px] uppercase font-bold">Bertemu Dengan:</span>
                                    <span className="font-bold text-gray-900">{guest.bertemuDengan}</span>
                                </div>
                            )}
                            <div>
                                <span className="text-gray-500 block text-[9px] uppercase font-bold">Keperluan:</span>
                                <span className="text-gray-800 italic">"{guest.keperluan}"</span>
                            </div>
                        </div>

                        {/* Tata Tertib Singkat Kunjungan */}
                        <div className="text-[8.5px] text-gray-600 border border-gray-200 bg-gray-50/60 p-2 rounded mb-3 space-y-0.5 leading-tight">
                            <strong className="block text-gray-800 font-bold uppercase">Tata Tertib Kunjungan:</strong>
                            <p>1. Wajib berbusana sopan &amp; menutup aurat di seluruh lingkungan pondok.</p>
                            <p>2. Menjaga ketenangan kegiatan belajar santri &amp; sholat berjamaah.</p>
                            <p>3. Kembalikan tiket pass &amp; badge visitor ke pos satpam saat check-out/pulang.</p>
                        </div>

                        {/* Tanda Tangan */}
                        <div className="grid grid-cols-2 text-center text-[9px] gap-2 pt-1 border-t border-dashed border-gray-300">
                            <div>
                                <p className="text-gray-500">Tamu Pengunjung,</p>
                                <div className="h-8"></div>
                                <p className="font-bold text-gray-800 underline">{guest.namaTamu}</p>
                            </div>
                            <div>
                                <p className="text-gray-500">Petugas Jaga Satpam,</p>
                                <div className="h-8"></div>
                                <p className="font-bold text-gray-800 underline">{guest.petugas || 'Petugas Pos'}</p>
                            </div>
                        </div>

                        {/* Footer Kredit Aplikasi */}
                        <div className="mt-3 pt-1.5 border-t border-gray-200 text-center">
                            <p className="text-[7.5px] text-gray-400 font-medium tracking-tight">
                                dibuat dengan Esantri Web by AI Projek | aiprojek01.my.id
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer Modal (Hidden in Print) */}
                <div className="p-3 sm:p-3.5 bg-gray-50 border-t border-gray-200 flex flex-wrap items-center justify-between gap-2 print:hidden shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-3.5 py-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 rounded-xl text-xs font-semibold transition-colors"
                    >
                        Tutup
                    </button>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => handleSendWhatsApp()}
                            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                            title="Kirim Kartu Badge Lengkap ke WhatsApp Tamu"
                        >
                            <i className="bi bi-whatsapp"></i>
                            <span>Kirim ke WA Tamu</span>
                        </button>
                        <button
                            type="button"
                            onClick={handlePrint}
                            disabled={isPrinting}
                            className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
                            title="Cetak Tiket Langsung (Format Kertas A6)"
                        >
                            <i className={`bi ${isPrinting ? 'bi-hourglass-split animate-spin' : 'bi-printer'}`}></i>
                            <span>{isPrinting ? 'Menyiapkan...' : 'Cetak Tiket (A6)'}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
export default TiketPassTamuModal;
