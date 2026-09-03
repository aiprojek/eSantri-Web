import React, { useMemo } from 'react';
import { Santri, PondokSettings, TahfizhRecord } from '../../types';
import { formatDate, formatTanggalDokumen, DateFormatMode } from '../../utils/formatters';

export type SyahadahTheme = 'classic' | 'modern' | 'vertical' | 'dark' | 'ceria';

interface TahfizhSyahadahTemplateProps {
    santri: Santri;
    settings: PondokSettings;
    record?: TahfizhRecord;
    temaSyahadah?: SyahadahTheme;
    judulDokumen?: string; // 'SYAHADAH TAHFIZH AL-QUR'AN' | 'PIAGAM PENGHARGAAN' | 'SERTIFIKAT KELULUSAN TAHFIZH' | Custom
    jenisSyahadah?: string; // 'Khatam Juz 30 (Juz 'Amma)' | 'Khatam 5 Juz (Juz 1 s/d 5)' | 'Khatam Al-Qur'an 30 Juz' | Custom
    predikat?: string;
    catatan?: string;
    tanggal?: string;
    formatMode?: DateFormatMode;
    manualHijri?: string;
    muhaffizhName?: string;
    muhaffizhLabelTop?: string;
    muhaffizhRoleBottom?: string;
    nomorSyahadah?: string;
    kalimatPengantar?: string;
    showWatermarkLogo?: boolean;
    pageBreakAfter?: boolean;
}

/**
 * Fallback Official Circular Stamp Seal with rotating Ponpes text & 3 stars in center
 */
const OfficialStampSeal: React.FC<{
    namaPonpes: string;
    themeColor: string;
    subColor?: string;
}> = ({ namaPonpes, themeColor, subColor = themeColor }) => {
    const cleanName = (namaPonpes || 'PONDOK PESANTREN').toUpperCase().trim();
    // Unique ID for SVG arc path
    const pathId = `stamp-curve-top-${cleanName.slice(0, 10).replace(/[^a-zA-Z0-9]/g, '') || 'ponpes'}`;
    const pathBottomId = `stamp-curve-bot-${cleanName.slice(0, 10).replace(/[^a-zA-Z0-9]/g, '') || 'ponpes'}`;

    return (
        <div className="w-20 h-20 relative flex items-center justify-center -rotate-6 select-none opacity-90 transition-transform hover:rotate-0">
            <svg viewBox="0 0 120 120" className="w-full h-full">
                <defs>
                    <path
                        id={pathId}
                        d="M 18,60 A 42,42 0 1,1 102,60"
                        fill="none"
                    />
                    <path
                        id={pathBottomId}
                        d="M 102,60 A 42,42 0 0,1 18,60"
                        fill="none"
                    />
                </defs>
                {/* Outer Double Border Rings */}
                <circle cx="60" cy="60" r="56" fill="none" stroke={themeColor} strokeWidth="2.5" />
                <circle cx="60" cy="60" r="51" fill="none" stroke={themeColor} strokeWidth="1" strokeDasharray="3,2" />
                <circle cx="60" cy="60" r="37" fill="none" stroke={themeColor} strokeWidth="1.5" />

                {/* Curved Top Text: Pondok Pesantren Name */}
                <text fill={themeColor} fontSize="8.5" fontWeight="bold" letterSpacing="1.2">
                    <textPath href={`#${pathId}`} startOffset="50%" textAnchor="middle">
                        {cleanName.length > 28 ? cleanName.slice(0, 28) : cleanName}
                    </textPath>
                </text>

                {/* Curved Bottom Text: LEMBAGA TAHFIZH */}
                <text fill={themeColor} fontSize="7.5" fontWeight="bold" letterSpacing="1.5">
                    <textPath href={`#${pathBottomId}`} startOffset="50%" textAnchor="middle">
                        ★ LEMBAGA TAHFIZH ★
                    </textPath>
                </text>

                {/* Center Content: 3 Stars & RESMI */}
                <text x="60" y="52" fill={subColor} fontSize="11" textAnchor="middle" fontWeight="bold">
                    ★ ★ ★
                </text>
                <text x="60" y="66" fill={themeColor} fontSize="9.5" textAnchor="middle" fontWeight="900" letterSpacing="1.5">
                    RESMI
                </text>
            </svg>
        </div>
    );
};

export const TahfizhSyahadahTemplateComponent: React.FC<TahfizhSyahadahTemplateProps> = ({
    santri,
    settings,
    record,
    temaSyahadah = 'classic',
    judulDokumen = "SYAHADAH TAHFIZH AL-QUR'AN",
    jenisSyahadah = "Khatam Juz 30 (Juz 'Amma)",
    predikat = 'Mumtaz (Sangat Baik / Istimewa)',
    catatan,
    tanggal,
    formatMode,
    manualHijri,
    muhaffizhName,
    muhaffizhLabelTop,
    muhaffizhRoleBottom,
    nomorSyahadah,
    kalimatPengantar,
    showWatermarkLogo = true,
    pageBreakAfter = false,
}) => {
    const finalTanggal = tanggal || settings.tanggalSyahadahDefault || new Date().toISOString().split('T')[0];
    const activeFormatMode = formatMode || settings.formatTanggalSyahadahDefault || 'masehi';
    const activeManualHijri = manualHijri || settings.manualHijriSyahadahDefault || '';
    const tanggalDisplay = useMemo(() => formatTanggalDokumen(finalTanggal, {
        formatMode: activeFormatMode,
        hijriAdjustment: settings.hijriAdjustment || 0,
        manualHijri: activeManualHijri
    }), [finalTanggal, activeFormatMode, settings.hijriAdjustment, activeManualHijri]);

    const tempatPenetapan = settings.tempatSyahadahDefault?.trim()
        || (settings.alamat ? (settings.alamat.includes(',') ? settings.alamat.split(',')[0].trim() : settings.namaPonpes.split(' ')[0]) : settings.namaPonpes.split(' ')[0])
        || 'Pesantren';

    const jenjang = useMemo(() => settings.jenjang?.find(j => j.id === santri.jenjangId), [settings.jenjang, santri.jenjangId]);
    const jenjangName = jenjang?.nama || '';
    const rombelName = useMemo(() => settings.rombel?.find(r => r.id === santri.rombelId)?.nama || '-', [settings.rombel, santri.rombelId]);
    
    // Auto-link Mudir / Pimpinan from settings
    const mudirTeacher = useMemo(() => (settings.mudirAamId ? settings.tenagaPengajar?.find(t => t.id === settings.mudirAamId) : null)
        || (jenjang?.mudirId ? settings.tenagaPengajar?.find(t => t.id === jenjang.mudirId) : null)
        || settings.tenagaPengajar?.find(t => t.riwayatJabatan?.some(r => 
            r.jabatan.toLowerCase().includes('mudir') || 
            r.jabatan.toLowerCase().includes('pengasuh') || 
            r.jabatan.toLowerCase().includes('pimpinan') || 
            r.jabatan.toLowerCase().includes('kepala')
        ))
        || settings.tenagaPengajar?.[0], [settings.mudirAamId, settings.tenagaPengajar, jenjang?.mudirId]);
    const mudirName = mudirTeacher?.nama || 'Pimpinan Pondok Pesantren';
    
    const guruName = muhaffizhName || (record?.muhaffizhId ? settings.tenagaPengajar.find(t => t.id === record.muhaffizhId)?.nama : 'Ustadz Pembimbing');
    const displayNomor = nomorSyahadah || `SYH/TFZ/${santri.nis || santri.id}/${new Date(finalTanggal).getFullYear()}`;

    const defaultLabelTop = muhaffizhLabelTop || 'Muhaffizh / Pembimbing,';
    const defaultRoleBottom = muhaffizhRoleBottom || 'Pembimbing Tahfizh';

    const capaianText = record 
        ? `Juz ${record.juz} • QS. ${record.surah} (Ayat ${record.ayatAwal}-${record.ayatAkhir})` 
        : jenisSyahadah;

    const predikatFinal = record?.predikat || predikat;
    const catatanFinal = catatan || record?.catatan;

    const logoUrl = settings.logoPonpesUrl || settings.logoYayasanUrl;

    // =========================================================================
    // TEMA 1: CLASSIC (Hijau Emerald & Emas Islami Tradisional)
    // =========================================================================
    if (temaSyahadah === 'classic') {
        const textPengantar = kalimatPengantar || "Dewan Asatidz & Lembaga Tahfizh Al-Qur'an menerangkan dengan sebenarnya bahwa:";

        return (
            <div 
                className={`w-[29.7cm] h-[21cm] p-8 mx-auto bg-[#FDFBF7] text-gray-900 font-serif relative overflow-hidden flex flex-col justify-between box-border select-none print-landscape printable-content-wrapper ${pageBreakAfter ? 'break-after-page' : ''}`}
                style={{ fontFamily: "'Cinzel', 'Amiri', 'Georgia', serif" }}
            >
                {/* Borders */}
                <div className="absolute inset-4 border-4 border-[#1B4D3E] pointer-events-none"></div>
                <div className="absolute inset-5 border border-[#D4AF37] pointer-events-none"></div>
                <div className="absolute inset-7 border-2 border-double border-[#1B4D3E]/40 pointer-events-none"></div>

                {/* Corner Arabesque Accents */}
                <div className="absolute top-6 left-6 w-12 h-12 border-t-4 border-l-4 border-[#D4AF37] pointer-events-none"></div>
                <div className="absolute top-6 right-6 w-12 h-12 border-t-4 border-r-4 border-[#D4AF37] pointer-events-none"></div>
                <div className="absolute bottom-6 left-6 w-12 h-12 border-b-4 border-l-4 border-[#D4AF37] pointer-events-none"></div>
                <div className="absolute bottom-6 right-6 w-12 h-12 border-b-4 border-r-4 border-[#D4AF37] pointer-events-none"></div>

                {/* Background Watermark (Logo Pondok Pesantren) */}
                {showWatermarkLogo && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0">
                        {logoUrl ? (
                            <img 
                                src={logoUrl} 
                                alt="Logo Pondok" 
                                className="w-80 h-80 object-contain opacity-[0.06] filter grayscale" 
                                referrerPolicy="no-referrer"
                            />
                        ) : (
                            <div className="w-80 h-80 rounded-full border-8 border-[#1B4D3E]/10 flex items-center justify-center opacity-[0.06]">
                                <span className="text-8xl font-serif text-[#1B4D3E] font-bold">
                                    {settings.namaPonpes.charAt(0) || 'P'}
                                </span>
                            </div>
                        )}
                    </div>
                )}

                {/* Header */}
                <div className="relative z-10 text-center pt-2">
                    <div className="text-2xl text-[#1B4D3E] font-bold tracking-wider mb-2 leading-relaxed" style={{ fontFamily: "'Amiri', serif" }}>
                        بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                    </div>
                    <div className="text-xs uppercase tracking-[0.3em] text-[#D4AF37] font-bold mt-2.5">
                        {settings.namaYayasan}
                    </div>
                    <h1 className="text-2xl font-bold uppercase tracking-widest text-[#1B4D3E] mt-1">
                        {settings.namaPonpes}
                    </h1>
                    <p className="text-[10px] text-gray-500 max-w-xl mx-auto italic mt-0.5">
                        {settings.alamat} • Telp: {settings.telepon}
                    </p>

                    <div className="w-48 h-0.5 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent mx-auto my-3"></div>

                    <div className="inline-block px-8 py-1.5 bg-gradient-to-r from-[#1B4D3E]/10 via-[#1B4D3E]/20 to-[#1B4D3E]/10 border-y-2 border-[#D4AF37] text-[#1B4D3E] shadow-xs">
                        <span className="text-xl font-bold tracking-[0.2em] uppercase font-sans">
                            {judulDokumen}
                        </span>
                    </div>
                    <div className="text-[11px] text-gray-500 mt-1 font-mono tracking-widest">
                        Nomor: {displayNomor}
                    </div>
                </div>

                {/* Body Content */}
                <div className="relative z-10 text-center my-auto px-12">
                    <p className="text-sm text-gray-700 italic mb-2">
                        {textPengantar}
                    </p>

                    <div className="text-3xl font-bold text-[#1B4D3E] tracking-wide border-b-2 border-dashed border-[#D4AF37] pb-1.5 max-w-2xl mx-auto">
                        {santri.namaLengkap}
                    </div>

                    <div className="flex justify-center items-center gap-4 text-xs text-gray-600 mt-2 font-sans flex-wrap">
                        <span>NIS: <strong className="text-gray-900 font-mono">{santri.nis || santri.id}</strong></span>
                        {jenjangName && (
                            <>
                                <span>•</span>
                                <span>Jenjang: <strong className="text-gray-900">{jenjangName}</strong></span>
                            </>
                        )}
                        <span>•</span>
                        <span>Kelas/Rombel: <strong className="text-gray-900">{rombelName}</strong></span>
                    </div>

                    <p className="text-sm text-gray-700 mt-4 leading-relaxed max-w-3xl mx-auto">
                        Telah menyelesaikan setoran dan dinyatakan lulus ujian mutaba'ah hafalan Al-Qur'an pada capaian:
                    </p>

                    <div className="mt-2.5 inline-flex flex-col items-center justify-center px-8 py-2.5 bg-emerald-50/90 rounded-xl border border-emerald-300 shadow-xs">
                        <span className="text-lg font-bold text-[#1B4D3E] tracking-wide">
                            {capaianText}
                        </span>
                        <span className="text-xs text-emerald-800 mt-0.5 font-sans">
                            Predikat Kelulusan: <strong className="text-emerald-700 font-bold">{predikatFinal}</strong>
                        </span>
                    </div>

                    {catatanFinal && (
                        <p className="text-xs text-gray-500 italic mt-3 max-w-xl mx-auto">
                            "{catatanFinal}"
                        </p>
                    )}
                </div>

                {/* Signatures */}
                <div className="relative z-10 grid grid-cols-3 items-end pt-2 pb-2 text-center text-xs text-gray-800 font-sans">
                    <div className="flex flex-col items-center">
                        <p className="text-[11px] text-gray-600 mb-12">{defaultLabelTop}</p>
                        <p className="font-bold text-sm text-[#1B4D3E] border-b border-gray-400 pb-0.5 min-w-[180px]">
                            {guruName}
                        </p>
                        <p className="text-[10px] text-gray-500 mt-0.5">{defaultRoleBottom}</p>
                    </div>

                    <div className="flex flex-col items-center justify-center">
                        {settings.stempelPonpesUrl ? (
                            <div className="w-20 h-20 flex items-center justify-center">
                                <img src={settings.stempelPonpesUrl} alt="Stempel Resmi" className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
                            </div>
                        ) : (
                            <OfficialStampSeal 
                                namaPonpes={settings.namaPonpes} 
                                themeColor="#1B4D3E" 
                                subColor="#D4AF37" 
                            />
                        )}
                        <p className="text-[11px] text-gray-600 mt-2">
                            Ditetapkan di {tempatPenetapan}, {tanggalDisplay}
                        </p>
                    </div>

                    <div className="flex flex-col items-center">
                        <p className="text-[11px] text-gray-600 mb-12">Mudir / Pengasuh Pondok,</p>
                        <p className="font-bold text-sm text-[#1B4D3E] border-b border-gray-400 pb-0.5 min-w-[180px]">
                            {mudirName}
                        </p>
                        <p className="text-[10px] text-gray-500 mt-0.5">Pimpinan Lembaga</p>
                    </div>
                </div>

                <div className="relative z-10 text-center text-[8px] text-gray-400 border-t border-gray-200 pt-1 font-sans">
                    Dokumen Resmi Syahadah Tahfizh • Dicetak melalui eSantri Web • aiprojek01.my.id
                </div>
            </div>
        );
    }

    // =========================================================================
    // TEMA 2: MODERN TECH (Biru Royal & Silver Navy)
    // =========================================================================
    if (temaSyahadah === 'modern') {
        const textPengantar = kalimatPengantar || "Diberikan sebagai bukti kelulusan dan penghargaan resmi kepada:";

        return (
            <div 
                className={`w-[29.7cm] h-[21cm] p-8 mx-auto bg-white text-slate-800 font-sans relative overflow-hidden flex flex-col justify-between box-border select-none print-landscape printable-content-wrapper ${pageBreakAfter ? 'break-after-page' : ''}`}
            >
                {/* Modern Geometric Border */}
                <div className="absolute inset-4 border-2 border-blue-900 pointer-events-none"></div>
                <div className="absolute inset-6 border border-blue-400/40 pointer-events-none"></div>
                
                {/* Modern Top & Bottom Strip Accents */}
                <div className="absolute top-0 left-0 right-0 h-3 bg-gradient-to-r from-blue-900 via-blue-600 to-indigo-900 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 right-0 h-3 bg-gradient-to-r from-indigo-900 via-blue-600 to-blue-900 pointer-events-none"></div>
                
                {/* Modern Corner Diamonds */}
                <div className="absolute top-7 left-7 w-4 h-4 bg-blue-600 rotate-45 pointer-events-none shadow-sm"></div>
                <div className="absolute top-7 right-7 w-4 h-4 bg-blue-600 rotate-45 pointer-events-none shadow-sm"></div>
                <div className="absolute bottom-7 left-7 w-4 h-4 bg-blue-600 rotate-45 pointer-events-none shadow-sm"></div>
                <div className="absolute bottom-7 right-7 w-4 h-4 bg-blue-600 rotate-45 pointer-events-none shadow-sm"></div>

                {/* Background Watermark (Logo Pondok Pesantren) */}
                {showWatermarkLogo && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0">
                        {logoUrl ? (
                            <img 
                                src={logoUrl} 
                                alt="Logo Pondok" 
                                className="w-80 h-80 object-contain opacity-[0.05] filter grayscale" 
                                referrerPolicy="no-referrer"
                            />
                        ) : (
                            <div className="w-80 h-80 rounded-full border-8 border-blue-900/10 flex items-center justify-center opacity-[0.05]">
                                <span className="text-8xl font-sans text-blue-950 font-bold">
                                    {settings.namaPonpes.charAt(0) || 'P'}
                                </span>
                            </div>
                        )}
                    </div>
                )}

                {/* Header */}
                <div className="relative z-10 text-center pt-3">
                    <div className="text-xl text-blue-950 font-bold tracking-wider mb-2 leading-relaxed" style={{ fontFamily: "'Amiri', serif" }}>
                        بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                    </div>
                    <div className="text-xs uppercase tracking-[0.25em] text-blue-600 font-bold mt-2.5">
                        {settings.namaYayasan}
                    </div>
                    <h1 className="text-2xl font-black uppercase tracking-wider text-blue-950 mt-1">
                        {settings.namaPonpes}
                    </h1>
                    <p className="text-[10px] text-slate-500 max-w-xl mx-auto mt-0.5">
                        {settings.alamat} • Telp: {settings.telepon}
                    </p>

                    <div className="mt-3.5 inline-block px-10 py-2 bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 text-white rounded-lg shadow-md">
                        <span className="text-lg font-extrabold tracking-[0.2em] uppercase">
                            {judulDokumen}
                        </span>
                    </div>
                    <div className="text-[11px] text-blue-800 mt-1.5 font-mono font-semibold tracking-wider">
                        No. Sertifikat: {displayNomor}
                    </div>
                </div>

                {/* Body Content */}
                <div className="relative z-10 text-center my-auto px-12">
                    <p className="text-sm text-slate-600 italic mb-2 font-serif">
                        {textPengantar}
                    </p>

                    <div className="text-3xl font-black text-blue-950 tracking-wide border-b-2 border-blue-600 pb-2 max-w-2xl mx-auto">
                        {santri.namaLengkap}
                    </div>

                    <div className="flex justify-center items-center gap-4 text-xs text-slate-600 mt-2 flex-wrap">
                        <span>NIS: <strong className="text-blue-900 font-mono font-bold">{santri.nis || santri.id}</strong></span>
                        {jenjangName && (
                            <>
                                <span>•</span>
                                <span>Jenjang: <strong className="text-blue-950 font-bold">{jenjangName}</strong></span>
                            </>
                        )}
                        <span>•</span>
                        <span>Rombel/Kelas: <strong className="text-slate-900">{rombelName}</strong></span>
                    </div>

                    <p className="text-sm text-slate-700 mt-4 max-w-3xl mx-auto">
                        Telah menuntaskan setoran hafalan Al-Qur'an dan lulus munaqosyah tahfizh pada tingkatan:
                    </p>

                    <div className="mt-2.5 inline-flex flex-col items-center justify-center px-10 py-3 bg-blue-50/90 rounded-xl border border-blue-200 shadow-sm">
                        <span className="text-lg font-black text-blue-950 tracking-wide">
                            {capaianText}
                        </span>
                        <span className="text-xs text-blue-700 mt-0.5 font-medium">
                            Predikat: <strong className="text-blue-900 font-bold bg-blue-100 px-2 py-0.5 rounded">{predikatFinal}</strong>
                        </span>
                    </div>

                    {catatanFinal && (
                        <p className="text-xs text-slate-500 italic mt-3 max-w-xl mx-auto">
                            "{catatanFinal}"
                        </p>
                    )}
                </div>

                {/* Signatures */}
                <div className="relative z-10 grid grid-cols-3 items-end pt-2 pb-2 text-center text-xs text-slate-800">
                    <div className="flex flex-col items-center">
                        <p className="text-[11px] text-slate-500 mb-12">{defaultLabelTop}</p>
                        <p className="font-bold text-sm text-blue-950 border-b-2 border-slate-300 pb-0.5 min-w-[180px]">
                            {guruName}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{defaultRoleBottom}</p>
                    </div>

                    <div className="flex flex-col items-center justify-center">
                        {settings.stempelPonpesUrl ? (
                            <div className="w-20 h-20 flex items-center justify-center">
                                <img src={settings.stempelPonpesUrl} alt="Stempel Resmi" className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
                            </div>
                        ) : (
                            <OfficialStampSeal 
                                namaPonpes={settings.namaPonpes} 
                                themeColor="#1e3a8a" 
                                subColor="#2563eb" 
                            />
                        )}
                        <p className="text-[11px] text-slate-600 mt-2">
                            {tempatPenetapan}, {tanggalDisplay}
                        </p>
                    </div>

                    <div className="flex flex-col items-center">
                        <p className="text-[11px] text-slate-500 mb-12">Mudir / Pimpinan Pesantren,</p>
                        <p className="font-bold text-sm text-blue-950 border-b-2 border-slate-300 pb-0.5 min-w-[180px]">
                            {mudirName}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Pimpinan Lembaga</p>
                    </div>
                </div>

                <div className="relative z-10 text-center text-[8px] text-slate-400 border-t border-slate-200 pt-1">
                    Dokumen Resmi eSantri Web • Terverifikasi Sistem Informasi Pesantren • aiprojek01.my.id
                </div>
            </div>
        );
    }

    // =========================================================================
    // TEMA 3: VERTICAL / MERAH-PUTIH (Merah Marun & Gold Nusantara)
    // =========================================================================
    if (temaSyahadah === 'vertical') {
        const textPengantar = kalimatPengantar || "Atas berkat rahmat Allah SWT, Majelis Dewan Guru & Pengasuh menerangkan bahwa:";

        return (
            <div 
                className={`w-[29.7cm] h-[21cm] p-8 mx-auto bg-[#FFFCFA] text-gray-900 font-serif relative overflow-hidden flex flex-col justify-between box-border select-none print-landscape printable-content-wrapper ${pageBreakAfter ? 'break-after-page' : ''}`}
                style={{ fontFamily: "'Cinzel', 'Amiri', 'Georgia', serif" }}
            >
                {/* Red & Gold Regal Borders */}
                <div className="absolute inset-4 border-4 border-[#881337] pointer-events-none"></div>
                <div className="absolute inset-5 border border-[#CA8A04] pointer-events-none"></div>
                <div className="absolute inset-7 border border-[#881337]/30 pointer-events-none"></div>

                {/* Corner Ornaments */}
                <div className="absolute top-6 left-6 w-10 h-10 border-t-4 border-l-4 border-[#CA8A04] pointer-events-none"></div>
                <div className="absolute top-6 right-6 w-10 h-10 border-t-4 border-r-4 border-[#CA8A04] pointer-events-none"></div>
                <div className="absolute bottom-6 left-6 w-10 h-10 border-b-4 border-l-4 border-[#CA8A04] pointer-events-none"></div>
                <div className="absolute bottom-6 right-6 w-10 h-10 border-b-4 border-r-4 border-[#CA8A04] pointer-events-none"></div>

                {/* Background Watermark (Logo Pondok Pesantren) */}
                {showWatermarkLogo && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0">
                        {logoUrl ? (
                            <img 
                                src={logoUrl} 
                                alt="Logo Pondok" 
                                className="w-80 h-80 object-contain opacity-[0.06] filter grayscale" 
                                referrerPolicy="no-referrer"
                            />
                        ) : (
                            <div className="w-80 h-80 rounded-full border-8 border-[#881337]/10 flex items-center justify-center opacity-[0.06]">
                                <span className="text-8xl font-serif text-[#881337] font-bold">
                                    {settings.namaPonpes.charAt(0) || 'P'}
                                </span>
                            </div>
                        )}
                    </div>
                )}

                {/* Header */}
                <div className="relative z-10 text-center pt-2">
                    <div className="text-2xl text-[#881337] font-bold tracking-wider mb-2 leading-relaxed" style={{ fontFamily: "'Amiri', serif" }}>
                        بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                    </div>
                    <div className="text-xs uppercase tracking-[0.28em] text-[#CA8A04] font-bold mt-2.5">
                        {settings.namaYayasan}
                    </div>
                    <h1 className="text-2xl font-bold uppercase tracking-widest text-[#881337] mt-1">
                        {settings.namaPonpes}
                    </h1>
                    <p className="text-[10px] text-gray-500 max-w-xl mx-auto italic mt-0.5">
                        {settings.alamat} • Telp: {settings.telepon}
                    </p>

                    <div className="w-52 h-0.5 bg-gradient-to-r from-transparent via-[#CA8A04] to-transparent mx-auto my-3"></div>

                    <div className="inline-block px-8 py-1.5 bg-[#881337] text-[#FEF08A] rounded border-2 border-[#CA8A04] shadow-md">
                        <span className="text-xl font-bold tracking-[0.2em] uppercase font-sans">
                            {judulDokumen}
                        </span>
                    </div>
                    <div className="text-[11px] text-[#881337] mt-1 font-mono font-bold tracking-widest">
                        Nomor: {displayNomor}
                    </div>
                </div>

                {/* Body Content */}
                <div className="relative z-10 text-center my-auto px-12">
                    <p className="text-sm text-gray-700 italic mb-2">
                        {textPengantar}
                    </p>

                    <div className="text-3xl font-bold text-[#881337] tracking-wide border-b-2 border-dashed border-[#CA8A04] pb-1.5 max-w-2xl mx-auto">
                        {santri.namaLengkap}
                    </div>

                    <div className="flex justify-center items-center gap-4 text-xs text-gray-600 mt-2 font-sans flex-wrap">
                        <span>NIS: <strong className="text-gray-900 font-mono">{santri.nis || santri.id}</strong></span>
                        {jenjangName && (
                            <>
                                <span>•</span>
                                <span>Jenjang: <strong className="text-gray-900">{jenjangName}</strong></span>
                            </>
                        )}
                        <span>•</span>
                        <span>Kelas/Rombel: <strong className="text-gray-900">{rombelName}</strong></span>
                    </div>

                    <p className="text-sm text-gray-700 mt-4 leading-relaxed max-w-3xl mx-auto">
                        Telah menyelesaikan setoran dan dinyatakan berhak menyandang kelulusan pada capaian:
                    </p>

                    <div className="mt-2.5 inline-flex flex-col items-center justify-center px-8 py-2.5 bg-rose-50/90 rounded-xl border border-rose-200 shadow-xs">
                        <span className="text-lg font-bold text-[#881337] tracking-wide">
                            {capaianText}
                        </span>
                        <span className="text-xs text-[#881337] mt-0.5 font-sans">
                            Predikat Kelulusan: <strong className="text-[#881337] font-bold">{predikatFinal}</strong>
                        </span>
                    </div>

                    {catatanFinal && (
                        <p className="text-xs text-gray-500 italic mt-3 max-w-xl mx-auto">
                            "{catatanFinal}"
                        </p>
                    )}
                </div>

                {/* Signatures */}
                <div className="relative z-10 grid grid-cols-3 items-end pt-2 pb-2 text-center text-xs text-gray-800 font-sans">
                    <div className="flex flex-col items-center">
                        <p className="text-[11px] text-gray-600 mb-12">{defaultLabelTop}</p>
                        <p className="font-bold text-sm text-[#881337] border-b border-gray-400 pb-0.5 min-w-[180px]">
                            {guruName}
                        </p>
                        <p className="text-[10px] text-gray-500 mt-0.5">{defaultRoleBottom}</p>
                    </div>

                    <div className="flex flex-col items-center justify-center">
                        {settings.stempelPonpesUrl ? (
                            <div className="w-20 h-20 flex items-center justify-center">
                                <img src={settings.stempelPonpesUrl} alt="Stempel Resmi" className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
                            </div>
                        ) : (
                            <OfficialStampSeal 
                                namaPonpes={settings.namaPonpes} 
                                themeColor="#881337" 
                                subColor="#CA8A04" 
                            />
                        )}
                        <p className="text-[11px] text-gray-600 mt-2">
                            {tempatPenetapan}, {tanggalDisplay}
                        </p>
                    </div>

                    <div className="flex flex-col items-center">
                        <p className="text-[11px] text-gray-600 mb-12">Mudir / Pengasuh Pondok,</p>
                        <p className="font-bold text-sm text-[#881337] border-b border-gray-400 pb-0.5 min-w-[180px]">
                            {mudirName}
                        </p>
                        <p className="text-[10px] text-gray-500 mt-0.5">Pimpinan Lembaga</p>
                    </div>
                </div>

                <div className="relative z-10 text-center text-[8px] text-gray-400 border-t border-rose-100 pt-1 font-sans">
                    Dokumen Resmi Syahadah Tahfizh • Dicetak melalui eSantri Web • aiprojek01.my.id
                </div>
            </div>
        );
    }

    // =========================================================================
    // TEMA 4: DARK LUXURY (Midnight Slate & Glowing Gold)
    // =========================================================================
    if (temaSyahadah === 'dark') {
        const textPengantar = kalimatPengantar || "Dengan memohon ridha Allah SWT, Dewan Penguji Tahfizh menerangkan bahwa:";

        return (
            <div 
                className={`w-[29.7cm] h-[21cm] p-8 mx-auto bg-[#0F172A] text-slate-100 font-serif relative overflow-hidden flex flex-col justify-between box-border select-none print-landscape printable-content-wrapper ${pageBreakAfter ? 'break-after-page' : ''}`}
                style={{ fontFamily: "'Cinzel', 'Amiri', 'Georgia', serif" }}
            >
                {/* Glowing Radial Background */}
                <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>

                {/* Gold Double Borders */}
                <div className="absolute inset-4 border-2 border-amber-500/70 pointer-events-none"></div>
                <div className="absolute inset-5 border border-amber-300/30 pointer-events-none"></div>
                <div className="absolute inset-7 border border-slate-700/80 pointer-events-none"></div>

                {/* Corner Gold Flourishes */}
                <div className="absolute top-6 left-6 w-10 h-10 border-t-2 border-l-2 border-amber-400 pointer-events-none"></div>
                <div className="absolute top-6 right-6 w-10 h-10 border-t-2 border-r-2 border-amber-400 pointer-events-none"></div>
                <div className="absolute bottom-6 left-6 w-10 h-10 border-b-2 border-l-2 border-amber-400 pointer-events-none"></div>
                <div className="absolute bottom-6 right-6 w-10 h-10 border-b-2 border-r-2 border-amber-400 pointer-events-none"></div>

                {/* Background Watermark (Logo Pondok Pesantren) */}
                {showWatermarkLogo && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0">
                        {logoUrl ? (
                            <img 
                                src={logoUrl} 
                                alt="Logo Pondok" 
                                className="w-80 h-80 object-contain opacity-[0.06] filter invert brightness-200" 
                                referrerPolicy="no-referrer"
                            />
                        ) : (
                            <div className="w-80 h-80 rounded-full border-8 border-amber-400/10 flex items-center justify-center opacity-[0.06]">
                                <span className="text-8xl font-serif text-amber-300 font-bold">
                                    {settings.namaPonpes.charAt(0) || 'P'}
                                </span>
                            </div>
                        )}
                    </div>
                )}

                {/* Header */}
                <div className="relative z-10 text-center pt-2">
                    <div className="text-2xl text-amber-300 font-bold tracking-wider mb-2 leading-relaxed" style={{ fontFamily: "'Amiri', serif" }}>
                        بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                    </div>
                    <div className="text-xs uppercase tracking-[0.3em] text-amber-400/90 font-bold mt-2.5">
                        {settings.namaYayasan}
                    </div>
                    <h1 className="text-2xl font-bold uppercase tracking-widest text-amber-100 mt-1">
                        {settings.namaPonpes}
                    </h1>
                    <p className="text-[10px] text-slate-400 max-w-xl mx-auto italic mt-0.5">
                        {settings.alamat} • Telp: {settings.telepon}
                    </p>

                    <div className="w-56 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent mx-auto my-3"></div>

                    <div className="inline-block px-8 py-1.5 bg-gradient-to-r from-amber-500/20 via-amber-500/30 to-amber-500/20 border-y border-amber-400 text-amber-300">
                        <span className="text-xl font-bold tracking-[0.2em] uppercase font-sans">
                            {judulDokumen}
                        </span>
                    </div>
                    <div className="text-[11px] text-amber-400/80 mt-1 font-mono tracking-widest">
                        Nomor: {displayNomor}
                    </div>
                </div>

                {/* Body Content */}
                <div className="relative z-10 text-center my-auto px-12">
                    <p className="text-sm text-slate-300 italic mb-2">
                        {textPengantar}
                    </p>

                    <div className="text-3xl font-bold text-amber-300 tracking-wide border-b-2 border-dashed border-amber-400/60 pb-1.5 max-w-2xl mx-auto">
                        {santri.namaLengkap}
                    </div>

                    <div className="flex justify-center items-center gap-4 text-xs text-slate-300 mt-2 font-sans flex-wrap">
                        <span>NIS: <strong className="text-amber-200 font-mono">{santri.nis || santri.id}</strong></span>
                        {jenjangName && (
                            <>
                                <span>•</span>
                                <span>Jenjang: <strong className="text-amber-300">{jenjangName}</strong></span>
                            </>
                        )}
                        <span>•</span>
                        <span>Kelas/Rombel: <strong className="text-slate-100">{rombelName}</strong></span>
                    </div>

                    <p className="text-sm text-slate-300 mt-4 leading-relaxed max-w-3xl mx-auto">
                        Telah berhasil menyelesaikan tasmi' setoran serta lulus munaqosyah tahfizh pada capaian:
                    </p>

                    <div className="mt-2.5 inline-flex flex-col items-center justify-center px-8 py-2.5 bg-slate-800/90 rounded-xl border border-amber-400/50 shadow-inner">
                        <span className="text-lg font-bold text-amber-200 tracking-wide">
                            {capaianText}
                        </span>
                        <span className="text-xs text-amber-400 mt-0.5 font-sans">
                            Predikat Kelulusan: <strong className="text-amber-300 font-bold">{predikatFinal}</strong>
                        </span>
                    </div>

                    {catatanFinal && (
                        <p className="text-xs text-slate-400 italic mt-3 max-w-xl mx-auto">
                            "{catatanFinal}"
                        </p>
                    )}
                </div>

                {/* Signatures */}
                <div className="relative z-10 grid grid-cols-3 items-end pt-2 pb-2 text-center text-xs text-slate-300 font-sans">
                    <div className="flex flex-col items-center">
                        <p className="text-[11px] text-slate-400 mb-12">{defaultLabelTop}</p>
                        <p className="font-bold text-sm text-amber-300 border-b border-slate-600 pb-0.5 min-w-[180px]">
                            {guruName}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{defaultRoleBottom}</p>
                    </div>

                    <div className="flex flex-col items-center justify-center">
                        {settings.stempelPonpesUrl ? (
                            <div className="w-20 h-20 flex items-center justify-center">
                                <img src={settings.stempelPonpesUrl} alt="Stempel Resmi" className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
                            </div>
                        ) : (
                            <OfficialStampSeal 
                                namaPonpes={settings.namaPonpes} 
                                themeColor="#f59e0b" 
                                subColor="#fbbf24" 
                            />
                        )}
                        <p className="text-[11px] text-slate-400 mt-2">
                            {tempatPenetapan}, {tanggalDisplay}
                        </p>
                    </div>

                    <div className="flex flex-col items-center">
                        <p className="text-[11px] text-slate-400 mb-12">Mudir / Pengasuh Pondok,</p>
                        <p className="font-bold text-sm text-amber-300 border-b border-slate-600 pb-0.5 min-w-[180px]">
                            {mudirName}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Pimpinan Lembaga</p>
                    </div>
                </div>

                <div className="relative z-10 text-center text-[8px] text-slate-500 border-t border-slate-800 pt-1 font-sans">
                    Dokumen Resmi Syahadah Tahfizh • Dicetak melalui eSantri Web • aiprojek01.my.id
                </div>
            </div>
        );
    }

    // =========================================================================
    // TEMA 5: CERIA (Amber & Tosca Playful Madrasah/TPQ)
    // =========================================================================
    const textPengantar = kalimatPengantar || "Piagam Penghargaan & Kelulusan ini dengan penuh rasa bangga dianugerahkan kepada:";

    return (
        <div 
            className={`w-[29.7cm] h-[21cm] p-8 mx-auto bg-[#FFFDF5] text-amber-950 font-sans relative overflow-hidden flex flex-col justify-between box-border select-none print-landscape printable-content-wrapper ${pageBreakAfter ? 'break-after-page' : ''}`}
        >
            {/* Playful Colorful Borders */}
            <div className="absolute inset-4 border-4 border-amber-500 rounded-2xl pointer-events-none"></div>
            <div className="absolute inset-6 border-2 border-dashed border-teal-500 rounded-xl pointer-events-none"></div>
            
            {/* Decorative Colorful Corner Circles */}
            <div className="absolute top-5 left-5 w-8 h-8 rounded-full bg-amber-400/40 pointer-events-none"></div>
            <div className="absolute top-5 right-5 w-8 h-8 rounded-full bg-teal-400/40 pointer-events-none"></div>
            <div className="absolute bottom-5 left-5 w-8 h-8 rounded-full bg-teal-400/40 pointer-events-none"></div>
            <div className="absolute bottom-5 right-5 w-8 h-8 rounded-full bg-amber-400/40 pointer-events-none"></div>

            {/* Background Watermark (Logo Pondok Pesantren) */}
            {showWatermarkLogo && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0">
                    {logoUrl ? (
                        <img 
                            src={logoUrl} 
                            alt="Logo Pondok" 
                            className="w-80 h-80 object-contain opacity-[0.06] filter grayscale" 
                            referrerPolicy="no-referrer"
                        />
                    ) : (
                        <div className="w-80 h-80 rounded-full border-8 border-teal-600/10 flex items-center justify-center opacity-[0.06]">
                            <span className="text-8xl font-sans text-teal-900 font-bold">
                                {settings.namaPonpes.charAt(0) || 'P'}
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* Header */}
            <div className="relative z-10 text-center pt-2">
                <div className="text-xl text-teal-800 font-bold tracking-wider mb-2 leading-relaxed" style={{ fontFamily: "'Amiri', serif" }}>
                    بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                </div>
                <div className="text-xs uppercase tracking-[0.25em] text-amber-700 font-extrabold mt-2.5">
                    {settings.namaYayasan}
                </div>
                <h1 className="text-2xl font-black uppercase tracking-wider text-teal-900 mt-1">
                    {settings.namaPonpes}
                </h1>
                <p className="text-[10px] text-amber-800/80 max-w-xl mx-auto font-medium mt-0.5">
                    {settings.alamat} • Telp: {settings.telepon}
                </p>

                <div className="mt-3 inline-block px-10 py-2 bg-gradient-to-r from-amber-500 via-orange-500 to-teal-600 text-white rounded-full shadow-md">
                    <span className="text-lg font-black tracking-[0.2em] uppercase">
                        {judulDokumen}
                    </span>
                </div>
                <div className="text-[11px] text-teal-800 mt-1 font-mono font-bold tracking-wider">
                    Nomor Piagam: {displayNomor}
                </div>
            </div>

            {/* Body Content */}
            <div className="relative z-10 text-center my-auto px-12">
                <p className="text-sm text-teal-900 font-medium italic mb-2">
                    {textPengantar}
                </p>

                <div className="text-3xl font-black text-amber-900 tracking-wide border-b-4 border-amber-400 pb-1.5 max-w-2xl mx-auto">
                    {santri.namaLengkap}
                </div>

                <div className="flex justify-center items-center gap-4 text-xs text-teal-900 mt-2 font-medium flex-wrap">
                    <span>NIS: <strong className="text-amber-900 font-mono font-bold">{santri.nis || santri.id}</strong></span>
                    {jenjangName && (
                        <>
                            <span>•</span>
                            <span>Jenjang: <strong className="text-teal-950 font-bold">{jenjangName}</strong></span>
                        </>
                    )}
                    <span>•</span>
                    <span>Kelas/Kelompok: <strong className="text-teal-950 font-bold">{rombelName}</strong></span>
                </div>

                <p className="text-sm text-amber-950 font-medium mt-4 max-w-3xl mx-auto">
                    Telah berhasil dan bersemangat menyelesaikan hafalan Al-Qur'an pada capaian:
                </p>

                <div className="mt-2.5 inline-flex flex-col items-center justify-center px-10 py-3 bg-amber-100/90 rounded-2xl border-2 border-amber-300 shadow-sm">
                    <span className="text-lg font-black text-amber-950 tracking-wide">
                        {capaianText}
                    </span>
                    <span className="text-xs text-teal-800 mt-0.5 font-bold">
                        Predikat: <strong className="text-amber-800 font-black">{predikatFinal}</strong>
                    </span>
                </div>

                {catatanFinal && (
                    <p className="text-xs text-amber-800/80 italic mt-3 max-w-xl mx-auto font-medium">
                        "{catatanFinal}"
                    </p>
                )}
            </div>

            {/* Signatures */}
            <div className="relative z-10 grid grid-cols-3 items-end pt-2 pb-2 text-center text-xs text-teal-950">
                <div className="flex flex-col items-center">
                    <p className="text-[11px] text-teal-800 mb-12 font-semibold">{defaultLabelTop}</p>
                    <p className="font-bold text-sm text-amber-950 border-b-2 border-amber-400 pb-0.5 min-w-[180px]">
                        {guruName}
                    </p>
                    <p className="text-[10px] text-teal-700 mt-0.5">{defaultRoleBottom}</p>
                </div>

                <div className="flex flex-col items-center justify-center">
                    {settings.stempelPonpesUrl ? (
                        <div className="w-20 h-20 flex items-center justify-center">
                            <img src={settings.stempelPonpesUrl} alt="Stempel Resmi" className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
                        </div>
                    ) : (
                        <OfficialStampSeal 
                            namaPonpes={settings.namaPonpes} 
                            themeColor="#0d9488" 
                            subColor="#f59e0b" 
                        />
                    )}
                    <p className="text-[11px] text-teal-900 font-medium mt-2">
                        {tempatPenetapan}, {tanggalDisplay}
                    </p>
                </div>

                <div className="flex flex-col items-center">
                    <p className="text-[11px] text-teal-800 mb-12 font-semibold">Mudir / Kepala Madrasah,</p>
                    <p className="font-bold text-sm text-amber-950 border-b-2 border-amber-400 pb-0.5 min-w-[180px]">
                        {mudirName}
                    </p>
                    <p className="text-[10px] text-teal-700 mt-0.5">Pimpinan Lembaga</p>
                </div>
            </div>

            <div className="relative z-10 text-center text-[8px] text-amber-700/70 border-t border-amber-200 pt-1">
                Dokumen Piagam Tahfizh Ceria • Dicetak dengan eSantri Web • aiprojek01.my.id
            </div>
        </div>
    );
};

export const TahfizhSyahadahTemplate = React.memo(TahfizhSyahadahTemplateComponent);

