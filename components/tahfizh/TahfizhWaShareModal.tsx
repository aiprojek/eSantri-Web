import React, { useState, useMemo } from 'react';
import { Santri, TahfizhRecord, PondokSettings } from '../../types';
import { QURAN_JUZ_DATA } from '../../data/quran';

interface TahfizhWaShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    santri: Santri;
    records: TahfizhRecord[];
    settings: PondokSettings;
    muhaffizhName?: string;
}

type WaTemplateType = 'daily' | 'weekly' | 'monthly' | 'munaqosyah_ready';

export const TahfizhWaShareModal: React.FC<TahfizhWaShareModalProps> = ({
    isOpen,
    onClose,
    santri,
    records,
    settings,
}) => {
    const [templateType, setTemplateType] = useState<WaTemplateType>('daily');
    const [copied, setCopied] = useState(false);
    const [customNote, setCustomNote] = useState('');

    // Halqah & Guru lookups
    const halaqah = useMemo(() => {
        return settings.kelompokHalaqah?.find(h => h.id === santri.halaqahId || h.santriIds?.includes(santri.id));
    }, [settings.kelompokHalaqah, santri.halaqahId, santri.id]);

    const muhaffizh = useMemo(() => {
        if (!halaqah?.muhaffizhId) return null;
        return settings.tenagaPengajar.find(t => t.id === halaqah.muhaffizhId) || null;
    }, [halaqah, settings.tenagaPengajar]);

    const rombel = useMemo(() => {
        return settings.rombel.find(r => r.id === santri.rombelId);
    }, [settings.rombel, santri.rombelId]);

    // Sorted records (newest first)
    const sortedRecords = useMemo(() => {
        return [...records].sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
    }, [records]);

    const latestRecord = sortedRecords[0];

    // Weekly records (last 7 days from latest or current)
    const weeklyRecords = useMemo(() => {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const isoLimit = oneWeekAgo.toISOString().split('T')[0];
        return sortedRecords.filter(r => r.tanggal >= isoLimit);
    }, [sortedRecords]);

    // Monthly records (current month)
    const monthlyRecords = useMemo(() => {
        const now = new Date();
        const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        return sortedRecords.filter(r => r.tanggal.startsWith(currentMonthPrefix));
    }, [sortedRecords]);

    // Total mutqin juz
    const mutqinJuzList = useMemo(() => {
        const set = new Set<number>();
        records.forEach(r => {
            if (r.tipe === 'Ujian Hafalan' && r.predikat !== 'Belum Lulus') {
                set.add(r.juz);
            }
        });
        return Array.from(set).sort((a, b) => a - b);
    }, [records]);

    const totalZiyadahJuz = useMemo(() => {
        const set = new Set<number>();
        records.filter(r => r.tipe === 'Ziyadah').forEach(r => set.add(r.juz));
        return set.size;
    }, [records]);

    // Format WA Message
    const generatedMessage = useMemo(() => {
        const ponpesName = settings.namaPonpes || 'Pondok Pesantren';
        const namaSantri = santri.namaLengkap;
        const nis = santri.nis ? ` (NIS: ${santri.nis})` : '';
        const kelasStr = rombel?.nama ? ` | Kelas/Rombel: ${rombel.nama}` : '';
        const halaqahStr = halaqah?.nama ? ` | Halaqah: ${halaqah.nama}` : '';
        const ustadzStr = muhaffizh?.nama ? `\n👤 *Muhaffizh / Pembimbing:* ${muhaffizh.nama}` : '';

        const header = `*MUTABA'AH TAHFIZHUL QUR'AN*\n🏛️ *${ponpesName}*\n═══════════════════════\n`;
        const santriInfo = `*Data Santri:*\n👤 *Nama:* ${namaSantri}${nis}${kelasStr}${halaqahStr}${ustadzStr}\n───────────────────────\n`;

        let content = '';

        if (templateType === 'daily') {
            if (latestRecord) {
                const predikatIcon = latestRecord.predikat === 'Sangat Lancar' ? '🌟' : latestRecord.predikat === 'Lancar' ? '✅' : '⚠️';
                content = `📖 *LAPORAN SETORAN HARIAN*\n` +
                    `📅 *Tanggal:* ${latestRecord.tanggal}\n` +
                    `📌 *Jenis:* ${latestRecord.tipe}\n` +
                    `📑 *Materi:* Juz ${latestRecord.juz} • QS. ${latestRecord.surah} (Ayat ${latestRecord.ayatAwal} - ${latestRecord.ayatAkhir})\n` +
                    `${predikatIcon} *Kelancaran / Nilai:* ${latestRecord.predikat}${latestRecord.nilaiAngka ? ` (${latestRecord.nilaiAngka}/100)` : ''}\n` +
                    (latestRecord.catatan ? `💬 *Catatan:* _"${latestRecord.catatan}"_\n` : '') +
                    `\n📊 *Ringkasan Total Hafalan:* ${totalZiyadahJuz} Juz Aktif (${mutqinJuzList.length} Juz Mutqin)\n`;
            } else {
                content = `📖 *LAPORAN SETORAN HARIAN*\n_Belum ada riwayat setoran terbaru yang tercatat._\n`;
            }
        } else if (templateType === 'weekly') {
            content = `📊 *REKAP SETORAN 7 HARI TERAKHIR*\n` +
                `Total Sesi: ${weeklyRecords.length} kali setoran\n\n`;
            if (weeklyRecords.length > 0) {
                weeklyRecords.slice(0, 8).forEach((r, idx) => {
                    content += `${idx + 1}. *[${r.tanggal}]* ${r.tipe} - Juz ${r.juz}, QS. ${r.surah} (${r.ayatAwal}-${r.ayatAkhir}) 👉 *${r.predikat}*\n`;
                });
            } else {
                content += `_Tidak ada setoran dalam 7 hari terakhir._\n`;
            }
            content += `\n🎯 *Capaian Mutqin:* ${mutqinJuzList.length > 0 ? `Juz ${mutqinJuzList.join(', ')}` : 'Sedang proses ziyadah'}\n`;
        } else if (templateType === 'monthly') {
            content = `🗓️ *REKAPITULASI BULAN INI*\n` +
                `Total Sesi Mutaba'ah: ${monthlyRecords.length} kali\n` +
                `Ziyadah Baru: ${monthlyRecords.filter(r => r.tipe === 'Ziyadah').length} sesi\n` +
                `Muroja'ah: ${monthlyRecords.filter(r => r.tipe === 'Murojaah' || r.tipe === "Tasmi'").length} sesi\n\n` +
                `🎯 *Total Ziyadah Keseluruhan:* ${totalZiyadahJuz} Juz\n` +
                `🌟 *Total Juz Mutqin (Lulus Ujian):* ${mutqinJuzList.length} Juz ${mutqinJuzList.length > 0 ? `(Juz ${mutqinJuzList.join(', ')})` : ''}\n`;
        } else if (templateType === 'munaqosyah_ready') {
            const targetJuzStr = halaqah?.targetJuz ? `Juz ${halaqah.targetJuz}` : (latestRecord ? `Juz ${latestRecord.juz}` : 'Juz Al-Qur\'an');
            content = `🎉 *PEMBERITAHUAN KELAYAKAN MUNAQOSYAH / UJIAN TAHFIZH*\n\n` +
                `Alhamdulillah, ananda *${namaSantri}* telah menuntaskan setoran ziyadah & muroja'ah pada *${targetJuzStr}* dengan predikat baik.\n\n` +
                `Ananda dinilai *SIAP MENGIKUTI UJIAN MUNAQOSYAH / TASMI' SATU DUDUK*.\n` +
                `Mohon doa restu dan dukungan Bapak/Ibu Wali Santri agar ananda senantiasa istiqomah dan dilancarkan dalam menjaga ayat-ayat suci Al-Qur'an.\n`;
        }

        if (customNote.trim()) {
            content += `\n📝 *Pesan Khusus Muhaffizh:*\n_${customNote.trim()}_\n`;
        }

        const footer = `\n═══════════════════════\n_Jazakumullahu khairan katsiran atas doa & kerja sama Bapak/Ibu Wali Santri._\n*Layanan Informasi Tahfizh ${ponpesName}*`;

        return `${header}${santriInfo}${content}${footer}`;
    }, [templateType, latestRecord, weeklyRecords, monthlyRecords, santri, rombel, halaqah, muhaffizh, settings, totalZiyadahJuz, mutqinJuzList, customNote]);

    if (!isOpen) return null;

    const handleCopy = () => {
        navigator.clipboard.writeText(generatedMessage);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
    };

    const cleanPhone = (num?: string) => {
        if (!num) return '';
        let cleaned = num.replace(/\D/g, '');
        if (cleaned.startsWith('0')) {
            cleaned = '62' + cleaned.slice(1);
        }
        return cleaned;
    };

    const waliPhone = cleanPhone(santri.teleponWali || santri.telepon);

    const handleOpenWhatsApp = (phone?: string) => {
        const target = phone ? cleanPhone(phone) : waliPhone;
        const encoded = encodeURIComponent(generatedMessage);
        const url = target 
            ? `https://wa.me/${target}?text=${encoded}` 
            : `https://wa.me/?text=${encoded}`;
        window.open(url, '_blank');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[92vh]">
                {/* Header */}
                <div className="bg-gradient-to-r from-emerald-700 to-teal-700 p-4 text-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-xl text-emerald-200 shadow-inner">
                            <i className="bi bi-whatsapp"></i>
                        </div>
                        <div>
                            <h3 className="font-bold text-base">Kirim Laporan Mutaba'ah via WhatsApp</h3>
                            <p className="text-xs text-emerald-100">
                                Santri: <strong>{santri.namaLengkap}</strong> {santri.nis ? `(${santri.nis})` : ''}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                    >
                        <i className="bi bi-x-lg"></i>
                    </button>
                </div>

                <div className="p-4 overflow-y-auto space-y-4 flex-1">
                    {/* Template Chooser */}
                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                            Pilih Format Template Laporan:
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            <button
                                type="button"
                                onClick={() => setTemplateType('daily')}
                                className={`p-2.5 rounded-xl border text-left transition-all ${
                                    templateType === 'daily'
                                        ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold ring-2 ring-emerald-400'
                                        : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                                }`}
                            >
                                <div className="text-xs flex items-center gap-1.5 mb-1">
                                    <i className="bi bi-calendar2-check text-emerald-600"></i>
                                    <span>Setoran Harian</span>
                                </div>
                                <p className="text-[10px] text-gray-500 font-normal">Catatan setoran terakhir</p>
                            </button>

                            <button
                                type="button"
                                onClick={() => setTemplateType('weekly')}
                                className={`p-2.5 rounded-xl border text-left transition-all ${
                                    templateType === 'weekly'
                                        ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold ring-2 ring-emerald-400'
                                        : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                                }`}
                            >
                                <div className="text-xs flex items-center gap-1.5 mb-1">
                                    <i className="bi bi-calendar-range text-emerald-600"></i>
                                    <span>Rekap Pekanan</span>
                                </div>
                                <p className="text-[10px] text-gray-500 font-normal">Aktivitas 7 hari terakhir</p>
                            </button>

                            <button
                                type="button"
                                onClick={() => setTemplateType('monthly')}
                                className={`p-2.5 rounded-xl border text-left transition-all ${
                                    templateType === 'monthly'
                                        ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold ring-2 ring-emerald-400'
                                        : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                                }`}
                            >
                                <div className="text-xs flex items-center gap-1.5 mb-1">
                                    <i className="bi bi-calendar3 text-emerald-600"></i>
                                    <span>Rekap Bulanan</span>
                                </div>
                                <p className="text-[10px] text-gray-500 font-normal">Statistik bulan berjalan</p>
                            </button>

                            <button
                                type="button"
                                onClick={() => setTemplateType('munaqosyah_ready')}
                                className={`p-2.5 rounded-xl border text-left transition-all ${
                                    templateType === 'munaqosyah_ready'
                                        ? 'bg-amber-50 border-amber-500 text-amber-950 font-bold ring-2 ring-amber-400'
                                        : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                                }`}
                            >
                                <div className="text-xs flex items-center gap-1.5 mb-1">
                                    <i className="bi bi-award-fill text-amber-600"></i>
                                    <span>Siap Ujian</span>
                                </div>
                                <p className="text-[10px] text-gray-500 font-normal">Kabar siap munaqosyah</p>
                            </button>
                        </div>
                    </div>

                    {/* Custom Note input */}
                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                            Catatan Tambahan Ustadz / Pembimbing (Opsional):
                        </label>
                        <input
                            type="text"
                            value={customNote}
                            onChange={(e) => setCustomNote(e.target.value)}
                            placeholder="Contoh: Mohon dibantu muraja'ah surah An-Naba' di rumah saat libur akhir pekan."
                            className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                        />
                    </div>

                    {/* Message Preview */}
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-bold text-gray-700 uppercase flex items-center gap-1.5">
                                <i className="bi bi-eye-fill text-teal-600"></i>
                                Pratinjau Teks Pesan WhatsApp:
                            </label>
                            <span className="text-[11px] text-gray-400">Siap kirim & format teks tebal/miring rapi</span>
                        </div>
                        <div className="bg-emerald-950 text-emerald-100 p-4 rounded-xl font-mono text-xs whitespace-pre-wrap border border-emerald-800/60 max-h-56 overflow-y-auto leading-relaxed selection:bg-emerald-700 selection:text-white">
                            {generatedMessage}
                        </div>
                    </div>

                    {/* Recipient info */}
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs">
                        <div className="flex items-center gap-2">
                            <i className="bi bi-person-lines-fill text-emerald-600 text-base"></i>
                            <div>
                                <p className="font-bold text-gray-800">
                                    No. HP / WhatsApp Wali Santri:
                                </p>
                                <p className="text-gray-600 font-mono text-[11px]">
                                    {santri.teleponWali || santri.telepon ? (
                                        <span className="text-emerald-700 font-bold">{santri.teleponWali || santri.telepon}</span>
                                    ) : (
                                        <span className="text-amber-600 italic">Belum tercatat di data santri</span>
                                    )}
                                </p>
                            </div>
                        </div>
                        {santri.namaWali && (
                            <span className="text-[11px] bg-gray-200 text-gray-700 px-2.5 py-1 rounded-lg font-medium">
                                Wali: {santri.namaWali}
                            </span>
                        )}
                    </div>
                </div>

                {/* Actions Footer */}
                <div className="p-4 bg-gray-50 border-t border-gray-200 flex flex-wrap items-center justify-between gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-bold text-xs transition-colors"
                    >
                        Tutup
                    </button>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleCopy}
                            className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
                                copied
                                    ? 'bg-emerald-800 text-white shadow-xs'
                                    : 'bg-gray-800 hover:bg-gray-900 text-white'
                            }`}
                        >
                            <i className={copied ? "bi bi-check2-all text-emerald-300" : "bi bi-clipboard"}></i>
                            {copied ? 'Tersalin ke Clipboard!' : 'Salin Teks'}
                        </button>

                        <button
                            type="button"
                            onClick={() => handleOpenWhatsApp(santri.teleponWali || santri.telepon)}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
                        >
                            <i className="bi bi-whatsapp"></i>
                            Buka WhatsApp Langsung
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
