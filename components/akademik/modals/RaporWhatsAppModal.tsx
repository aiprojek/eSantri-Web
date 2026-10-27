import React, { useState, useMemo } from 'react';
import { Santri, PondokSettings, RaporRecord } from '../../../types';
import { resolveRaporText } from '../../../utils/raporPlaceholderResolver';

export interface RaporWhatsAppModalProps {
    isOpen: boolean;
    onClose: () => void;
    santri: Santri;
    record: RaporRecord | null;
    settings: PondokSettings;
    tahunAjaran: string;
    semester: string;
    calculation?: {
        totalNilai?: number;
        rataRata?: number;
        ranking?: number;
        totalSantri?: number;
        predikat?: string;
    };
    onCopySuccess?: () => void;
}

export const RaporWhatsAppModal: React.FC<RaporWhatsAppModalProps> = ({
    isOpen,
    onClose,
    santri,
    record,
    settings,
    tahunAjaran,
    semester,
    calculation,
    onCopySuccess
}) => {
    // Determine available phone numbers
    const phoneOptions = useMemo(() => {
        const opts: { label: string; number: string; type: string }[] = [];
        const clean = (num?: string) => {
            if (!num) return '';
            let s = num.replace(/[^0-9]/g, '');
            if (s.startsWith('0')) s = '62' + s.slice(1);
            if (s.startsWith('8')) s = '628' + s.slice(1);
            return s;
        };

        const ayah = clean(santri.teleponAyah || santri.noHpAyah);
        if (ayah) opts.push({ label: `Ayah: ${santri.namaAyah || 'Bpk. Orang Tua'} (${ayah})`, number: ayah, type: 'Ayah' });

        const ibu = clean(santri.teleponIbu || santri.noHpIbu);
        if (ibu) opts.push({ label: `Ibu: ${santri.namaIbu || 'Ibu Orang Tua'} (${ibu})`, number: ibu, type: 'Ibu' });

        const wali = clean(santri.teleponWali || santri.noHpWali);
        if (wali && wali !== ayah && wali !== ibu) opts.push({ label: `Wali: ${santri.namaWali || 'Wali Santri'} (${wali})`, number: wali, type: 'Wali' });

        const santriHp = clean(santri.telepon || santri.noHp);
        if (santriHp && santriHp !== ayah && santriHp !== ibu && santriHp !== wali) {
            opts.push({ label: `Santri Sendiri (${santriHp})`, number: santriHp, type: 'Santri' });
        }

        return opts;
    }, [santri]);

    const [selectedPhone, setSelectedPhone] = useState<string>(phoneOptions[0]?.number || '');
    const [customPhone, setCustomPhone] = useState<string>('');
    const [copied, setCopied] = useState<boolean>(false);

    const rombelName = useMemo(() => {
        return settings.rombel.find(r => r.id === santri.rombelId)?.nama || '-';
    }, [settings.rombel, santri.rombelId]);

    const targetNumber = useMemo(() => {
        if (customPhone.trim()) {
            let s = customPhone.replace(/[^0-9]/g, '');
            if (s.startsWith('0')) s = '62' + s.slice(1);
            if (s.startsWith('8')) s = '628' + s.slice(1);
            return s;
        }
        return selectedPhone;
    }, [customPhone, selectedPhone]);

    const defaultMessage = useMemo(() => {
        const ponpesName = settings.namaPonpes || 'Pondok Pesantren';
        const rankText = calculation?.ranking 
            ? `\n🏆 *Peringkat:* Juara #${calculation.ranking} dari ${calculation.totalSantri || '-'} Santri` 
            : '';
        const avgText = calculation?.rataRata 
            ? `\n📊 *Nilai Rata-rata:* ${calculation.rataRata.toFixed(2)} (${calculation.predikat || 'Baik'})` 
            : '';

        let customObj: Record<string, any> = {};
        if (record?.customData) {
            try { customObj = JSON.parse(record.customData); } catch {}
        }

        const sakit = record?.sakit ?? (customObj['SAKIT'] ?? 0);
        const izin = record?.izin ?? (customObj['IZIN'] ?? 0);
        const alpha = record?.alpha ?? (customObj['ALPHA'] ?? 0);
        const catatan = record?.catatanWaliKelas || customObj['CATATAN_WALI_KELAS'] || 'Pertahankan prestasi belajar dan kedisiplinan.';

        return `*LAPORAN HASIL EVALUASI BELAJAR (RAPOR)*
*${ponpesName.toUpperCase()}*
Semester ${semester} Tahun Ajaran ${tahunAjaran}

Assalamu'alaikum Warahmatullahi Wabarakatuh,
Yth. Bapak/Ibu Orang Tua / Wali dari ananda:
👤 *Nama:* ${santri.namaLengkap}
🏷️ *NIS:* ${santri.nis}
🏫 *Kelas / Rombel:* ${rombelName}${avgText}${rankText}

📋 *Kehadiran Semester Ini:*
- Sakit: ${sakit} hari
- Izin: ${izin} hari
- Tanpa Keterangan: ${alpha} hari

📝 *Catatan Wali Kelas:*
_"${catatan}"_

Alhamdulillah evaluasi hasil belajar telah selesai dilaksanakan dengan tertib. Rapor lengkap cetak resmi telah disahkan oleh pimpinan pondok. Semoga ananda selalu istiqamah, berakhlak mulia, dan berprestasi.

Wassalamu'alaikum Warahmatullahi Wabarakatuh.
_Panitia Akademik & Wali Kelas ${ponpesName}_`;
    }, [settings.namaPonpes, semester, tahunAjaran, santri, rombelName, calculation, record]);

    const [message, setMessage] = useState<string>(defaultMessage);

    // Update message if santri changes
    React.useEffect(() => {
        setMessage(defaultMessage);
        if (phoneOptions.length > 0) {
            setSelectedPhone(phoneOptions[0].number);
        } else {
            setSelectedPhone('');
        }
        setCustomPhone('');
        setCopied(false);
    }, [defaultMessage, phoneOptions]);

    if (!isOpen) return null;

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(message);
            setCopied(true);
            onCopySuccess?.();
            setTimeout(() => setCopied(false), 2500);
        } catch {
            // fallback
        }
    };

    const whatsappUrl = targetNumber
        ? `https://api.whatsapp.com/send?phone=${targetNumber}&text=${encodeURIComponent(message)}`
        : '';

    return (
        <div className="fixed inset-0 bg-black/75 z-[90] flex justify-center items-center p-3 sm:p-4 animate-fade-in backdrop-blur-xs">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
                {/* Header */}
                <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-emerald-50/70">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-xl shadow-xs">
                            <i className="bi bi-whatsapp"></i>
                        </div>
                        <div>
                            <h3 className="text-base font-black text-slate-800">
                                Kirim Rapor via WhatsApp
                            </h3>
                            <p className="text-xs text-slate-500 font-medium">
                                {santri.namaLengkap} • NIS: {santri.nis}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors"
                    >
                        <i className="bi bi-x-lg text-sm"></i>
                    </button>
                </div>

                {/* Body */}
                <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-grow">
                    {/* Nomor Tujuan */}
                    <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-700">
                            Nomor WhatsApp Tujuan:
                        </label>
                        {phoneOptions.length > 0 ? (
                            <div className="space-y-2">
                                <select
                                    value={selectedPhone}
                                    onChange={e => {
                                        setSelectedPhone(e.target.value);
                                        setCustomPhone('');
                                    }}
                                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold bg-white text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                                >
                                    {phoneOptions.map((opt, i) => (
                                        <option key={i} value={opt.number}>
                                            {opt.label}
                                        </option>
                                    ))}
                                    <option value="">-- Ketik Nomor Lain Secara Manual --</option>
                                </select>

                                {(!selectedPhone || selectedPhone === '') && (
                                    <input
                                        type="tel"
                                        placeholder="Contoh: 08123456789 atau 628123456789"
                                        value={customPhone}
                                        onChange={e => setCustomPhone(e.target.value)}
                                        className="w-full border border-emerald-300 rounded-xl px-3 py-2 text-xs font-semibold bg-emerald-50/30 text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                                        autoFocus
                                    />
                                )}
                            </div>
                        ) : (
                            <div>
                                <input
                                    type="tel"
                                    placeholder="Contoh: 08123456789 atau 628123456789"
                                    value={customPhone}
                                    onChange={e => setCustomPhone(e.target.value)}
                                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold bg-white text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                                />
                                <span className="text-[10px] text-amber-600 mt-1 block">
                                    ⚠️ Belum ada nomor HP orang tua tersimpan di data profil santri.
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Editor Pesan */}
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-slate-700">
                                Pesan Ringkasan Rapor:
                            </label>
                            <button
                                type="button"
                                onClick={() => setMessage(defaultMessage)}
                                className="text-[10.5px] font-bold text-emerald-700 hover:underline"
                            >
                                Reset Template
                            </button>
                        </div>
                        <textarea
                            rows={11}
                            value={message}
                            onChange={e => setMessage(e.target.value)}
                            className="w-full border border-slate-300 rounded-xl p-3 text-xs font-mono text-slate-800 bg-slate-50/70 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none leading-relaxed"
                        />
                        <p className="text-[10.5px] text-slate-400">
                            Pesan dapat disesuaikan sebelum dikirim. Format bintang (*teks*) akan menjadi tebal di WhatsApp.
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
                    <button
                        type="button"
                        onClick={handleCopy}
                        className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                            copied ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                    >
                        <i className={`bi ${copied ? 'bi-check-lg text-emerald-600 font-bold' : 'bi-copy'}`}></i>
                        <span>{copied ? 'Tersalin!' : 'Salin Pesan'}</span>
                    </button>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors"
                        >
                            Tutup
                        </button>
                        {whatsappUrl ? (
                            <a
                                href={whatsappUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl text-xs font-black shadow-md shadow-emerald-200 flex items-center gap-2 transition-all active:scale-95 no-underline"
                            >
                                <i className="bi bi-whatsapp text-sm"></i>
                                <span>Buka WhatsApp</span>
                            </a>
                        ) : (
                            <button
                                type="button"
                                disabled
                                title="Masukkan nomor WhatsApp tujuan terlebih dahulu"
                                className="bg-emerald-600 opacity-50 cursor-not-allowed text-white px-5 py-2 rounded-xl text-xs font-black shadow-md shadow-emerald-200 flex items-center gap-2"
                            >
                                <i className="bi bi-whatsapp text-sm"></i>
                                <span>Buka WhatsApp</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
