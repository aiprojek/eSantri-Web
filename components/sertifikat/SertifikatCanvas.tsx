import React, { useId } from 'react';
import {
    PondokSettings,
    SertifikatArchiveSnapshot,
    SertifikatSignatoryConfig,
} from '../../types';

interface OfficialStampSealProps {
    namaPonpes: string;
    bottomText?: string;
    themeColor: string;
    subColor?: string;
}

export const OfficialStampSeal: React.FC<OfficialStampSealProps> = ({
    namaPonpes,
    bottomText = '★ DEWAN PENGASUH ★',
    themeColor,
    subColor = themeColor,
}) => {
    const reactId = useId().replace(/[^a-zA-Z0-9]/g, '');
    const cleanName = (namaPonpes || 'PONDOK PESANTREN').toUpperCase().trim();
    const cleanBottom = (bottomText || '★ DEWAN PENGASUH ★').toUpperCase().trim();
    const pathTopId = `sert-stamp-top-${reactId}`;
    const pathBotId = `sert-stamp-bot-${reactId}`;

    return (
        <div className="w-20 h-20 relative flex items-center justify-center -rotate-6 select-none opacity-90">
            <svg viewBox="0 0 120 120" className="w-full h-full">
                <defs>
                    <path id={pathTopId} d="M 18,60 A 42,42 0 1,1 102,60" fill="none" />
                    <path id={pathBotId} d="M 102,60 A 42,42 0 0,1 18,60" fill="none" />
                </defs>
                <circle cx="60" cy="60" r="56" fill="none" stroke={themeColor} strokeWidth="2.5" />
                <circle cx="60" cy="60" r="51" fill="none" stroke={themeColor} strokeWidth="1" strokeDasharray="3,2" />
                <circle cx="60" cy="60" r="37" fill="none" stroke={themeColor} strokeWidth="1.5" />

                <text fill={themeColor} fontSize="8.2" fontWeight="bold" letterSpacing="1.1">
                    <textPath href={`#${pathTopId}`} startOffset="50%" textAnchor="middle">
                        {cleanName.length > 28 ? cleanName.slice(0, 28) : cleanName}
                    </textPath>
                </text>

                <text fill={themeColor} fontSize="7.2" fontWeight="bold" letterSpacing="1.2">
                    <textPath href={`#${pathBotId}`} startOffset="50%" textAnchor="middle">
                        {cleanBottom.length > 26 ? cleanBottom.slice(0, 26) : cleanBottom}
                    </textPath>
                </text>

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

interface SignatureSlotProps {
    sig: SertifikatSignatoryConfig;
    labelClass: string;
    nameClass: string;
    roleClass: string;
    nipClass?: string;
    isDarkTheme?: boolean;
}

const SignatureSlot: React.FC<SignatureSlotProps> = ({
    sig,
    labelClass,
    nameClass,
    roleClass,
    nipClass = 'text-[10px] opacity-75',
    isDarkTheme = false,
}) => {
    const showSigImg = Boolean(sig.useDigitalTtd && sig.signatureUrl);
    return (
        <div className="flex flex-col items-center">
            <p className={labelClass}>{sig.labelTop}</p>
            <div className="h-14 w-44 flex items-center justify-center my-0.5 relative">
                {showSigImg && (
                    <img
                        src={sig.signatureUrl}
                        alt={`TTD ${sig.nama}`}
                        className={`max-h-14 max-w-[160px] object-contain pointer-events-none ${
                            isDarkTheme ? 'filter invert brightness-200 contrast-125' : ''
                        }`}
                        referrerPolicy="no-referrer"
                    />
                )}
            </div>
            <p className={nameClass}>{sig.nama || '........................................'}</p>
            {sig.roleBottom && <p className={roleClass}>{sig.roleBottom}</p>}
            {sig.showNip && sig.nip && <p className={nipClass}>NIP/NIY. {sig.nip}</p>}
        </div>
    );
};

export interface SertifikatCanvasProps {
    snapshot: SertifikatArchiveSnapshot;
    settings: PondokSettings;
    pageBreakAfter?: boolean;
}

const SertifikatCanvasComponent: React.FC<SertifikatCanvasProps> = ({
    snapshot,
    settings,
    pageBreakAfter = false,
}) => {
    const {
        tema = 'classic',
        showBismillah = true,
        showWatermarkLogo = true,
        judulDokumen,
        nomorSertifikat,
        kalimatPengantar,
        namaPenerima,
        identitasItems = [],
        deskripsiCapaian,
        capaianUtama,
        showPredikat,
        predikatLabel = 'Predikat',
        predikatValue,
        catatanDoa,
        tempatPenetapan,
        tanggalFormatted,
        signatoryCount = 2,
        leftSignatory,
        rightSignatory,
        stampMode = 'auto',
        stampUrl,
        stampBottomText = '★ DEWAN PENGASUH ★',
        footerText,
    } = snapshot;

    const logoUrl = settings.logoPonpesUrl || settings.logoYayasanUrl;
    const validIdentitas = identitasItems.filter((item) => item.value && item.value.trim() !== '' && item.value.trim() !== '-');
    const resolvedStampImg =
        stampMode === 'image'
            ? stampUrl || settings.stempelPonpesUrl
            : stampMode === 'auto'
              ? stampUrl || settings.stempelPonpesUrl
              : undefined;

    const renderCenterStamp = (themeColor: string, subColor: string, dateTextClass: string, prefixDitetapkan = false) => (
        <div className="flex flex-col items-center justify-center">
            {stampMode !== 'none' && (
                resolvedStampImg && stampMode !== 'seal' ? (
                    <div className="w-20 h-20 flex items-center justify-center">
                        <img
                            src={resolvedStampImg}
                            alt="Stempel Resmi"
                            className="max-w-full max-h-full object-contain"
                            referrerPolicy="no-referrer"
                        />
                    </div>
                ) : (
                    <OfficialStampSeal
                        namaPonpes={settings.namaPonpes}
                        bottomText={stampBottomText}
                        themeColor={themeColor}
                        subColor={subColor}
                    />
                )
            )}
            <p className={dateTextClass}>
                {prefixDitetapkan ? `Ditetapkan di ${tempatPenetapan}, ${tanggalFormatted}` : `${tempatPenetapan}, ${tanggalFormatted}`}
            </p>
        </div>
    );

    const resolvedFooter =
        footerText !== undefined && footerText.trim() !== ''
            ? footerText
            : `Dokumen Resmi ${settings.namaPonpes || 'Pondok Pesantren'}`;

    const breakClasses = pageBreakAfter ? 'page-break-after break-after-page' : '';

    // =========================================================================
    // TEMA 1: CLASSIC (Hijau Emerald & Emas Islami Tradisional)
    // =========================================================================
    if (tema === 'classic') {
        return (
            <div
                data-print-orientation="landscape"
                className={`w-[29.7cm] h-[20.95cm] p-8 mx-auto bg-[#FDFBF7] text-gray-900 font-serif relative overflow-hidden flex flex-col justify-between box-border select-none print-landscape printable-content-wrapper ${breakClasses}`}
                style={{ fontFamily: "'Cinzel', 'Amiri', 'Georgia', serif" }}
            >
                <div className="absolute inset-4 border-4 border-[#1B4D3E] pointer-events-none"></div>
                <div className="absolute inset-5 border border-[#D4AF37] pointer-events-none"></div>
                <div className="absolute inset-7 border-2 border-double border-[#1B4D3E]/40 pointer-events-none"></div>

                <div className="absolute top-6 left-6 w-12 h-12 border-t-4 border-l-4 border-[#D4AF37] pointer-events-none"></div>
                <div className="absolute top-6 right-6 w-12 h-12 border-t-4 border-r-4 border-[#D4AF37] pointer-events-none"></div>
                <div className="absolute bottom-6 left-6 w-12 h-12 border-b-4 border-l-4 border-[#D4AF37] pointer-events-none"></div>
                <div className="absolute bottom-6 right-6 w-12 h-12 border-b-4 border-r-4 border-[#D4AF37] pointer-events-none"></div>

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
                <div className="relative z-10 text-center pt-1.5">
                    {showBismillah && (
                        <div className="text-2xl text-[#1B4D3E] font-bold tracking-wider leading-[1.8] pb-2.5 mb-2" style={{ fontFamily: "'Amiri', serif" }}>
                            بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                        </div>
                    )}
                    <div className="text-xs uppercase tracking-[0.3em] text-[#D4AF37] font-bold mt-1.5">
                        {settings.namaYayasan}
                    </div>
                    <h1 className="text-2xl font-bold uppercase tracking-widest text-[#1B4D3E] mt-1">
                        {settings.namaPonpes}
                    </h1>
                    <p className="text-[10px] text-gray-500 max-w-xl mx-auto italic mt-0.5">
                        {settings.alamat}{settings.telepon ? ` • Telp: ${settings.telepon}` : ''}
                    </p>

                    <div className="w-48 h-0.5 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent mx-auto my-2.5"></div>

                    <div className="inline-block px-8 py-1.5 bg-gradient-to-r from-[#1B4D3E]/10 via-[#1B4D3E]/20 to-[#1B4D3E]/10 border-y-2 border-[#D4AF37] text-[#1B4D3E]">
                        <span className="text-xl font-bold tracking-[0.18em] uppercase font-sans">
                            {judulDokumen}
                        </span>
                    </div>
                    {nomorSertifikat && (
                        <div className="text-[11px] text-gray-500 mt-1 font-mono tracking-widest">
                            Nomor: {nomorSertifikat}
                        </div>
                    )}
                </div>

                {/* Body */}
                <div className="relative z-10 text-center my-auto px-12">
                    {kalimatPengantar && (
                        <p className="text-sm text-gray-700 italic mb-2">
                            {kalimatPengantar}
                        </p>
                    )}

                    <div className="text-3xl font-bold text-[#1B4D3E] tracking-wide border-b-2 border-dashed border-[#D4AF37] pb-1.5 max-w-2xl mx-auto">
                        {namaPenerima}
                    </div>

                    {validIdentitas.length > 0 && (
                        <div className="flex justify-center items-center gap-3 text-xs text-gray-600 mt-2 font-sans flex-wrap">
                            {validIdentitas.map((item, idx) => (
                                <React.Fragment key={idx}>
                                    {idx > 0 && <span>•</span>}
                                    <span>
                                        {item.label ? <>{item.label}: </> : null}
                                        <strong className="text-gray-900">{item.value}</strong>
                                    </span>
                                </React.Fragment>
                            ))}
                        </div>
                    )}

                    {deskripsiCapaian && (
                        <p className="text-sm text-gray-700 mt-3.5 leading-relaxed max-w-3xl mx-auto">
                            {deskripsiCapaian}
                        </p>
                    )}

                    {capaianUtama && (
                        <div className="mt-2.5 inline-flex flex-col items-center justify-center px-8 py-2.5 bg-emerald-50/90 rounded-xl border border-emerald-300">
                            <span className="text-lg font-bold text-[#1B4D3E] tracking-wide">
                                {capaianUtama}
                            </span>
                            {showPredikat && predikatValue && (
                                <span className="text-xs text-emerald-800 mt-0.5 font-sans">
                                    {predikatLabel}: <strong className="text-emerald-700 font-bold">{predikatValue}</strong>
                                </span>
                            )}
                        </div>
                    )}

                    {catatanDoa && (
                        <p className="text-xs text-gray-500 italic mt-2.5 max-w-2xl mx-auto leading-relaxed">
                            &ldquo;{catatanDoa}&rdquo;
                        </p>
                    )}
                </div>

                {/* Signatures */}
                <div className="relative z-10 grid grid-cols-3 items-end pt-1 pb-1.5 text-center text-xs text-gray-800 font-sans">
                    {signatoryCount === 2 && leftSignatory ? (
                        <SignatureSlot
                            sig={leftSignatory}
                            labelClass="text-[11px] text-gray-600"
                            nameClass="font-bold text-sm text-[#1B4D3E] border-b border-gray-400 pb-0.5 min-w-[180px]"
                            roleClass="text-[10px] text-gray-500 mt-0.5"
                            nipClass="text-[9.5px] text-gray-500 font-mono"
                        />
                    ) : (
                        <div></div>
                    )}

                    {renderCenterStamp('#1B4D3E', '#D4AF37', 'text-[11px] text-gray-600 mt-1.5', true)}

                    <SignatureSlot
                        sig={rightSignatory}
                        labelClass="text-[11px] text-gray-600"
                        nameClass="font-bold text-sm text-[#1B4D3E] border-b border-gray-400 pb-0.5 min-w-[180px]"
                        roleClass="text-[10px] text-gray-500 mt-0.5"
                        nipClass="text-[9.5px] text-gray-500 font-mono"
                    />
                </div>

                <div className="relative z-10 text-center text-[8px] text-gray-400 border-t border-gray-200 pt-1 font-sans">
                    {resolvedFooter}
                </div>
            </div>
        );
    }

    // =========================================================================
    // TEMA 2: MODERN (Biru Royal & Silver Navy)
    // =========================================================================
    if (tema === 'modern') {
        return (
            <div
                data-print-orientation="landscape"
                className={`w-[29.7cm] h-[20.95cm] p-8 mx-auto bg-white text-slate-800 font-sans relative overflow-hidden flex flex-col justify-between box-border select-none print-landscape printable-content-wrapper ${breakClasses}`}
            >
                <div className="absolute inset-4 border-2 border-blue-900 pointer-events-none"></div>
                <div className="absolute inset-6 border border-blue-400/40 pointer-events-none"></div>

                <div className="absolute top-0 left-0 right-0 h-3 bg-gradient-to-r from-blue-900 via-blue-600 to-indigo-900 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 right-0 h-3 bg-gradient-to-r from-indigo-900 via-blue-600 to-blue-900 pointer-events-none"></div>

                <div className="absolute top-7 left-7 w-4 h-4 bg-blue-600 rotate-45 pointer-events-none"></div>
                <div className="absolute top-7 right-7 w-4 h-4 bg-blue-600 rotate-45 pointer-events-none"></div>
                <div className="absolute bottom-7 left-7 w-4 h-4 bg-blue-600 rotate-45 pointer-events-none"></div>
                <div className="absolute bottom-7 right-7 w-4 h-4 bg-blue-600 rotate-45 pointer-events-none"></div>

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
                <div className="relative z-10 text-center pt-2">
                    {showBismillah && (
                        <div className="text-xl text-blue-950 font-bold tracking-wider leading-[1.8] pb-2.5 mb-2" style={{ fontFamily: "'Amiri', serif" }}>
                            بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                        </div>
                    )}
                    <div className="text-xs uppercase tracking-[0.25em] text-blue-600 font-bold mt-1.5">
                        {settings.namaYayasan}
                    </div>
                    <h1 className="text-2xl font-black uppercase tracking-wider text-blue-950 mt-1">
                        {settings.namaPonpes}
                    </h1>
                    <p className="text-[10px] text-slate-500 max-w-xl mx-auto mt-0.5">
                        {settings.alamat}{settings.telepon ? ` • Telp: ${settings.telepon}` : ''}
                    </p>

                    <div className="mt-3 inline-block px-10 py-1.5 bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 text-white rounded-lg">
                        <span className="text-lg font-extrabold tracking-[0.18em] uppercase">
                            {judulDokumen}
                        </span>
                    </div>
                    {nomorSertifikat && (
                        <div className="text-[11px] text-blue-800 mt-1 font-mono font-semibold tracking-wider">
                            No. Dokumen: {nomorSertifikat}
                        </div>
                    )}
                </div>

                {/* Body */}
                <div className="relative z-10 text-center my-auto px-12">
                    {kalimatPengantar && (
                        <p className="text-sm text-slate-600 italic mb-2 font-serif">
                            {kalimatPengantar}
                        </p>
                    )}

                    <div className="text-3xl font-black text-blue-950 tracking-wide border-b-2 border-blue-600 pb-1.5 max-w-2xl mx-auto">
                        {namaPenerima}
                    </div>

                    {validIdentitas.length > 0 && (
                        <div className="flex justify-center items-center gap-3 text-xs text-slate-600 mt-2 flex-wrap">
                            {validIdentitas.map((item, idx) => (
                                <React.Fragment key={idx}>
                                    {idx > 0 && <span>•</span>}
                                    <span>
                                        {item.label ? <>{item.label}: </> : null}
                                        <strong className="text-blue-950 font-bold">{item.value}</strong>
                                    </span>
                                </React.Fragment>
                            ))}
                        </div>
                    )}

                    {deskripsiCapaian && (
                        <p className="text-sm text-slate-700 mt-3.5 max-w-3xl mx-auto leading-relaxed">
                            {deskripsiCapaian}
                        </p>
                    )}

                    {capaianUtama && (
                        <div className="mt-2.5 inline-flex flex-col items-center justify-center px-10 py-2.5 bg-blue-50/90 rounded-xl border border-blue-200">
                            <span className="text-lg font-black text-blue-950 tracking-wide">
                                {capaianUtama}
                            </span>
                            {showPredikat && predikatValue && (
                                <span className="text-xs text-blue-700 mt-0.5 font-medium">
                                    {predikatLabel}: <strong className="text-blue-900 font-bold bg-blue-100 px-2 py-0.5 rounded">{predikatValue}</strong>
                                </span>
                            )}
                        </div>
                    )}

                    {catatanDoa && (
                        <p className="text-xs text-slate-500 italic mt-2.5 max-w-2xl mx-auto leading-relaxed">
                            &ldquo;{catatanDoa}&rdquo;
                        </p>
                    )}
                </div>

                {/* Signatures */}
                <div className="relative z-10 grid grid-cols-3 items-end pt-1 pb-1.5 text-center text-xs text-slate-800">
                    {signatoryCount === 2 && leftSignatory ? (
                        <SignatureSlot
                            sig={leftSignatory}
                            labelClass="text-[11px] text-slate-500"
                            nameClass="font-bold text-sm text-blue-950 border-b-2 border-slate-300 pb-0.5 min-w-[180px]"
                            roleClass="text-[10px] text-slate-500 mt-0.5"
                            nipClass="text-[9.5px] text-slate-400 font-mono"
                        />
                    ) : (
                        <div></div>
                    )}

                    {renderCenterStamp('#1e3a8a', '#2563eb', 'text-[11px] text-slate-600 mt-1.5')}

                    <SignatureSlot
                        sig={rightSignatory}
                        labelClass="text-[11px] text-slate-500"
                        nameClass="font-bold text-sm text-blue-950 border-b-2 border-slate-300 pb-0.5 min-w-[180px]"
                        roleClass="text-[10px] text-slate-500 mt-0.5"
                        nipClass="text-[9.5px] text-slate-400 font-mono"
                    />
                </div>

                <div className="relative z-10 text-center text-[8px] text-slate-400 border-t border-slate-200 pt-1">
                    {resolvedFooter}
                </div>
            </div>
        );
    }

    // =========================================================================
    // TEMA 3: VERTICAL / MARUN NUSANTARA (Merah Marun & Gold)
    // =========================================================================
    if (tema === 'vertical') {
        return (
            <div
                data-print-orientation="landscape"
                className={`w-[29.7cm] h-[20.95cm] p-8 mx-auto bg-[#FFFCFA] text-gray-900 font-serif relative overflow-hidden flex flex-col justify-between box-border select-none print-landscape printable-content-wrapper ${breakClasses}`}
                style={{ fontFamily: "'Cinzel', 'Amiri', 'Georgia', serif" }}
            >
                <div className="absolute inset-4 border-4 border-[#881337] pointer-events-none"></div>
                <div className="absolute inset-5 border border-[#CA8A04] pointer-events-none"></div>
                <div className="absolute inset-7 border border-[#881337]/30 pointer-events-none"></div>

                <div className="absolute top-6 left-6 w-10 h-10 border-t-4 border-l-4 border-[#CA8A04] pointer-events-none"></div>
                <div className="absolute top-6 right-6 w-10 h-10 border-t-4 border-r-4 border-[#CA8A04] pointer-events-none"></div>
                <div className="absolute bottom-6 left-6 w-10 h-10 border-b-4 border-l-4 border-[#CA8A04] pointer-events-none"></div>
                <div className="absolute bottom-6 right-6 w-10 h-10 border-b-4 border-r-4 border-[#CA8A04] pointer-events-none"></div>

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
                <div className="relative z-10 text-center pt-1.5">
                    {showBismillah && (
                        <div className="text-2xl text-[#881337] font-bold tracking-wider leading-[1.8] pb-2.5 mb-2" style={{ fontFamily: "'Amiri', serif" }}>
                            بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                        </div>
                    )}
                    <div className="text-xs uppercase tracking-[0.28em] text-[#CA8A04] font-bold mt-1.5">
                        {settings.namaYayasan}
                    </div>
                    <h1 className="text-2xl font-bold uppercase tracking-widest text-[#881337] mt-1">
                        {settings.namaPonpes}
                    </h1>
                    <p className="text-[10px] text-gray-500 max-w-xl mx-auto italic mt-0.5">
                        {settings.alamat}{settings.telepon ? ` • Telp: ${settings.telepon}` : ''}
                    </p>

                    <div className="w-52 h-0.5 bg-gradient-to-r from-transparent via-[#CA8A04] to-transparent mx-auto my-2.5"></div>

                    <div className="inline-block px-8 py-1.5 bg-[#881337] text-[#FEF08A] rounded border-2 border-[#CA8A04]">
                        <span className="text-xl font-bold tracking-[0.18em] uppercase font-sans">
                            {judulDokumen}
                        </span>
                    </div>
                    {nomorSertifikat && (
                        <div className="text-[11px] text-[#881337] mt-1 font-mono font-bold tracking-widest">
                            Nomor: {nomorSertifikat}
                        </div>
                    )}
                </div>

                {/* Body */}
                <div className="relative z-10 text-center my-auto px-12">
                    {kalimatPengantar && (
                        <p className="text-sm text-gray-700 italic mb-2">
                            {kalimatPengantar}
                        </p>
                    )}

                    <div className="text-3xl font-bold text-[#881337] tracking-wide border-b-2 border-dashed border-[#CA8A04] pb-1.5 max-w-2xl mx-auto">
                        {namaPenerima}
                    </div>

                    {validIdentitas.length > 0 && (
                        <div className="flex justify-center items-center gap-3 text-xs text-gray-600 mt-2 font-sans flex-wrap">
                            {validIdentitas.map((item, idx) => (
                                <React.Fragment key={idx}>
                                    {idx > 0 && <span>•</span>}
                                    <span>
                                        {item.label ? <>{item.label}: </> : null}
                                        <strong className="text-gray-900">{item.value}</strong>
                                    </span>
                                </React.Fragment>
                            ))}
                        </div>
                    )}

                    {deskripsiCapaian && (
                        <p className="text-sm text-gray-700 mt-3.5 leading-relaxed max-w-3xl mx-auto">
                            {deskripsiCapaian}
                        </p>
                    )}

                    {capaianUtama && (
                        <div className="mt-2.5 inline-flex flex-col items-center justify-center px-8 py-2.5 bg-rose-50/90 rounded-xl border border-rose-200">
                            <span className="text-lg font-bold text-[#881337] tracking-wide">
                                {capaianUtama}
                            </span>
                            {showPredikat && predikatValue && (
                                <span className="text-xs text-[#881337] mt-0.5 font-sans">
                                    {predikatLabel}: <strong className="text-[#881337] font-bold">{predikatValue}</strong>
                                </span>
                            )}
                        </div>
                    )}

                    {catatanDoa && (
                        <p className="text-xs text-gray-500 italic mt-2.5 max-w-2xl mx-auto leading-relaxed">
                            &ldquo;{catatanDoa}&rdquo;
                        </p>
                    )}
                </div>

                {/* Signatures */}
                <div className="relative z-10 grid grid-cols-3 items-end pt-1 pb-1.5 text-center text-xs text-gray-800 font-sans">
                    {signatoryCount === 2 && leftSignatory ? (
                        <SignatureSlot
                            sig={leftSignatory}
                            labelClass="text-[11px] text-gray-600"
                            nameClass="font-bold text-sm text-[#881337] border-b border-gray-400 pb-0.5 min-w-[180px]"
                            roleClass="text-[10px] text-gray-500 mt-0.5"
                            nipClass="text-[9.5px] text-gray-500 font-mono"
                        />
                    ) : (
                        <div></div>
                    )}

                    {renderCenterStamp('#881337', '#CA8A04', 'text-[11px] text-gray-600 mt-1.5')}

                    <SignatureSlot
                        sig={rightSignatory}
                        labelClass="text-[11px] text-gray-600"
                        nameClass="font-bold text-sm text-[#881337] border-b border-gray-400 pb-0.5 min-w-[180px]"
                        roleClass="text-[10px] text-gray-500 mt-0.5"
                        nipClass="text-[9.5px] text-gray-500 font-mono"
                    />
                </div>

                <div className="relative z-10 text-center text-[8px] text-gray-400 border-t border-rose-100 pt-1 font-sans">
                    {resolvedFooter}
                </div>
            </div>
        );
    }

    // =========================================================================
    // TEMA 4: DARK LUXURY (Midnight Slate & Glowing Gold)
    // =========================================================================
    if (tema === 'dark') {
        return (
            <div
                data-print-orientation="landscape"
                className={`w-[29.7cm] h-[20.95cm] p-8 mx-auto bg-[#0F172A] text-slate-100 font-serif relative overflow-hidden flex flex-col justify-between box-border select-none print-landscape printable-content-wrapper ${breakClasses}`}
                style={{ fontFamily: "'Cinzel', 'Amiri', 'Georgia', serif" }}
            >
                <div className="absolute inset-4 border-2 border-amber-500/70 pointer-events-none"></div>
                <div className="absolute inset-5 border border-amber-300/30 pointer-events-none"></div>
                <div className="absolute inset-7 border border-slate-700/80 pointer-events-none"></div>

                <div className="absolute top-6 left-6 w-10 h-10 border-t-2 border-l-2 border-amber-400 pointer-events-none"></div>
                <div className="absolute top-6 right-6 w-10 h-10 border-t-2 border-r-2 border-amber-400 pointer-events-none"></div>
                <div className="absolute bottom-6 left-6 w-10 h-10 border-b-2 border-l-2 border-amber-400 pointer-events-none"></div>
                <div className="absolute bottom-6 right-6 w-10 h-10 border-b-2 border-r-2 border-amber-400 pointer-events-none"></div>

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
                <div className="relative z-10 text-center pt-1.5">
                    {showBismillah && (
                        <div className="text-2xl text-amber-300 font-bold tracking-wider leading-[1.8] pb-2.5 mb-2" style={{ fontFamily: "'Amiri', serif" }}>
                            بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                        </div>
                    )}
                    <div className="text-xs uppercase tracking-[0.3em] text-amber-400/90 font-bold mt-1.5">
                        {settings.namaYayasan}
                    </div>
                    <h1 className="text-2xl font-bold uppercase tracking-widest text-amber-100 mt-1">
                        {settings.namaPonpes}
                    </h1>
                    <p className="text-[10px] text-slate-400 max-w-xl mx-auto italic mt-0.5">
                        {settings.alamat}{settings.telepon ? ` • Telp: ${settings.telepon}` : ''}
                    </p>

                    <div className="w-56 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent mx-auto my-2.5"></div>

                    <div className="inline-block px-8 py-1.5 bg-amber-500/20 border-y border-amber-400 text-amber-300">
                        <span className="text-xl font-bold tracking-[0.18em] uppercase font-sans">
                            {judulDokumen}
                        </span>
                    </div>
                    {nomorSertifikat && (
                        <div className="text-[11px] text-amber-400/80 mt-1 font-mono tracking-widest">
                            Nomor: {nomorSertifikat}
                        </div>
                    )}
                </div>

                {/* Body */}
                <div className="relative z-10 text-center my-auto px-12">
                    {kalimatPengantar && (
                        <p className="text-sm text-slate-300 italic mb-2">
                            {kalimatPengantar}
                        </p>
                    )}

                    <div className="text-3xl font-bold text-amber-300 tracking-wide border-b-2 border-dashed border-amber-400/60 pb-1.5 max-w-2xl mx-auto">
                        {namaPenerima}
                    </div>

                    {validIdentitas.length > 0 && (
                        <div className="flex justify-center items-center gap-3 text-xs text-slate-300 mt-2 font-sans flex-wrap">
                            {validIdentitas.map((item, idx) => (
                                <React.Fragment key={idx}>
                                    {idx > 0 && <span>•</span>}
                                    <span>
                                        {item.label ? <>{item.label}: </> : null}
                                        <strong className="text-amber-200">{item.value}</strong>
                                    </span>
                                </React.Fragment>
                            ))}
                        </div>
                    )}

                    {deskripsiCapaian && (
                        <p className="text-sm text-slate-300 mt-3.5 leading-relaxed max-w-3xl mx-auto">
                            {deskripsiCapaian}
                        </p>
                    )}

                    {capaianUtama && (
                        <div className="mt-2.5 inline-flex flex-col items-center justify-center px-8 py-2.5 bg-slate-800/95 rounded-xl border border-amber-400/50">
                            <span className="text-lg font-bold text-amber-200 tracking-wide">
                                {capaianUtama}
                            </span>
                            {showPredikat && predikatValue && (
                                <span className="text-xs text-amber-400 mt-0.5 font-sans">
                                    {predikatLabel}: <strong className="text-amber-300 font-bold">{predikatValue}</strong>
                                </span>
                            )}
                        </div>
                    )}

                    {catatanDoa && (
                        <p className="text-xs text-slate-400 italic mt-2.5 max-w-2xl mx-auto leading-relaxed">
                            &ldquo;{catatanDoa}&rdquo;
                        </p>
                    )}
                </div>

                {/* Signatures */}
                <div className="relative z-10 grid grid-cols-3 items-end pt-1 pb-1.5 text-center text-xs text-slate-300 font-sans">
                    {signatoryCount === 2 && leftSignatory ? (
                        <SignatureSlot
                            sig={leftSignatory}
                            labelClass="text-[11px] text-slate-400"
                            nameClass="font-bold text-sm text-amber-300 border-b border-slate-600 pb-0.5 min-w-[180px]"
                            roleClass="text-[10px] text-slate-400 mt-0.5"
                            nipClass="text-[9.5px] text-slate-400 font-mono"
                            isDarkTheme={true}
                        />
                    ) : (
                        <div></div>
                    )}

                    {renderCenterStamp('#f59e0b', '#fbbf24', 'text-[11px] text-slate-400 mt-1.5')}

                    <SignatureSlot
                        sig={rightSignatory}
                        labelClass="text-[11px] text-slate-400"
                        nameClass="font-bold text-sm text-amber-300 border-b border-slate-600 pb-0.5 min-w-[180px]"
                        roleClass="text-[10px] text-slate-400 mt-0.5"
                        nipClass="text-[9.5px] text-slate-400 font-mono"
                        isDarkTheme={true}
                    />
                </div>

                <div className="relative z-10 text-center text-[8px] text-slate-500 border-t border-slate-800 pt-1 font-sans">
                    {resolvedFooter}
                </div>
            </div>
        );
    }

    // =========================================================================
    // TEMA 5: CERIA (Amber & Tosca Playful Madrasah/TPQ)
    // =========================================================================
    if (tema === 'ceria') {
        return (
            <div
                data-print-orientation="landscape"
                className={`w-[29.7cm] h-[20.95cm] p-8 mx-auto bg-[#FFFDF5] text-amber-950 font-sans relative overflow-hidden flex flex-col justify-between box-border select-none print-landscape printable-content-wrapper ${breakClasses}`}
            >
                <div className="absolute inset-4 border-4 border-amber-500 rounded-2xl pointer-events-none"></div>
                <div className="absolute inset-6 border-2 border-dashed border-teal-500 rounded-xl pointer-events-none"></div>

                <div className="absolute top-5 left-5 w-8 h-8 rounded-full bg-amber-400/40 pointer-events-none"></div>
                <div className="absolute top-5 right-5 w-8 h-8 rounded-full bg-teal-400/40 pointer-events-none"></div>
                <div className="absolute bottom-5 left-5 w-8 h-8 rounded-full bg-teal-400/40 pointer-events-none"></div>
                <div className="absolute bottom-5 right-5 w-8 h-8 rounded-full bg-amber-400/40 pointer-events-none"></div>

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
                <div className="relative z-10 text-center pt-1.5">
                    {showBismillah && (
                        <div className="text-xl text-teal-800 font-bold tracking-wider leading-[1.8] pb-2.5 mb-2" style={{ fontFamily: "'Amiri', serif" }}>
                            بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                        </div>
                    )}
                    <div className="text-xs uppercase tracking-[0.25em] text-amber-700 font-extrabold mt-1.5">
                        {settings.namaYayasan}
                    </div>
                    <h1 className="text-2xl font-black uppercase tracking-wider text-teal-900 mt-1">
                        {settings.namaPonpes}
                    </h1>
                    <p className="text-[10px] text-amber-800/80 max-w-xl mx-auto font-medium mt-0.5">
                        {settings.alamat}{settings.telepon ? ` • Telp: ${settings.telepon}` : ''}
                    </p>

                    <div className="mt-2.5 inline-block px-10 py-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-teal-600 text-white rounded-full">
                        <span className="text-lg font-black tracking-[0.18em] uppercase">
                            {judulDokumen}
                        </span>
                    </div>
                    {nomorSertifikat && (
                        <div className="text-[11px] text-teal-800 mt-1 font-mono font-bold tracking-wider">
                            Nomor Piagam: {nomorSertifikat}
                        </div>
                    )}
                </div>

                {/* Body */}
                <div className="relative z-10 text-center my-auto px-12">
                    {kalimatPengantar && (
                        <p className="text-sm text-teal-900 font-medium italic mb-2">
                            {kalimatPengantar}
                        </p>
                    )}

                    <div className="text-3xl font-black text-amber-900 tracking-wide border-b-4 border-amber-400 pb-1.5 max-w-2xl mx-auto">
                        {namaPenerima}
                    </div>

                    {validIdentitas.length > 0 && (
                        <div className="flex justify-center items-center gap-3 text-xs text-teal-900 mt-2 font-medium flex-wrap">
                            {validIdentitas.map((item, idx) => (
                                <React.Fragment key={idx}>
                                    {idx > 0 && <span>•</span>}
                                    <span>
                                        {item.label ? <>{item.label}: </> : null}
                                        <strong className="text-teal-950 font-bold">{item.value}</strong>
                                    </span>
                                </React.Fragment>
                            ))}
                        </div>
                    )}

                    {deskripsiCapaian && (
                        <p className="text-sm text-amber-950 font-medium mt-3.5 max-w-3xl mx-auto leading-relaxed">
                            {deskripsiCapaian}
                        </p>
                    )}

                    {capaianUtama && (
                        <div className="mt-2.5 inline-flex flex-col items-center justify-center px-10 py-2.5 bg-amber-100/90 rounded-2xl border-2 border-amber-300">
                            <span className="text-lg font-black text-amber-950 tracking-wide">
                                {capaianUtama}
                            </span>
                            {showPredikat && predikatValue && (
                                <span className="text-xs text-teal-800 mt-0.5 font-bold">
                                    {predikatLabel}: <strong className="text-amber-800 font-black">{predikatValue}</strong>
                                </span>
                            )}
                        </div>
                    )}

                    {catatanDoa && (
                        <p className="text-xs text-amber-800/80 italic mt-2.5 max-w-2xl mx-auto font-medium leading-relaxed">
                            &ldquo;{catatanDoa}&rdquo;
                        </p>
                    )}
                </div>

                {/* Signatures */}
                <div className="relative z-10 grid grid-cols-3 items-end pt-1 pb-1.5 text-center text-xs text-teal-950">
                    {signatoryCount === 2 && leftSignatory ? (
                        <SignatureSlot
                            sig={leftSignatory}
                            labelClass="text-[11px] text-teal-800 font-semibold"
                            nameClass="font-bold text-sm text-amber-950 border-b-2 border-amber-400 pb-0.5 min-w-[180px]"
                            roleClass="text-[10px] text-teal-700 mt-0.5"
                            nipClass="text-[9.5px] text-teal-700 font-mono"
                        />
                    ) : (
                        <div></div>
                    )}

                    {renderCenterStamp('#0d9488', '#f59e0b', 'text-[11px] text-teal-900 font-medium mt-1.5')}

                    <SignatureSlot
                        sig={rightSignatory}
                        labelClass="text-[11px] text-teal-800 font-semibold"
                        nameClass="font-bold text-sm text-amber-950 border-b-2 border-amber-400 pb-0.5 min-w-[180px]"
                        roleClass="text-[10px] text-teal-700 mt-0.5"
                        nipClass="text-[9.5px] text-teal-700 font-mono"
                    />
                </div>

                <div className="relative z-10 text-center text-[8px] text-amber-700/70 border-t border-amber-200 pt-1">
                    {resolvedFooter}
                </div>
            </div>
        );
    }

    // =========================================================================
    // TEMA 6: POLOS BLANKO (Tanpa Hiasan Bingkai / Khusus Kertas Piagam Fisik)
    // =========================================================================
    return (
        <div
            data-print-orientation="landscape"
            className={`w-[29.7cm] h-[20.95cm] px-14 py-8 mx-auto bg-transparent text-slate-900 font-serif relative overflow-hidden flex flex-col justify-between box-border select-none print-landscape printable-content-wrapper ${breakClasses}`}
            style={{ fontFamily: "'Cinzel', 'Amiri', 'Georgia', serif" }}
        >
            {/* Tanpa garis/bingkai hiasan agar pas dengan kertas piagam berbingkai fisik */}

            {/* Background Watermark Opsional */}
            {showWatermarkLogo && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0">
                    {logoUrl ? (
                        <img
                            src={logoUrl}
                            alt="Logo Pondok"
                            className="w-80 h-80 object-contain opacity-[0.04] filter grayscale"
                            referrerPolicy="no-referrer"
                        />
                    ) : (
                        <div className="w-80 h-80 rounded-full border-4 border-slate-900/10 flex items-center justify-center opacity-[0.04]">
                            <span className="text-8xl font-serif text-slate-900 font-bold">
                                {settings.namaPonpes.charAt(0) || 'P'}
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* Header */}
            <div className="relative z-10 text-center pt-1.5">
                {showBismillah && (
                    <div className="text-2xl text-slate-800 font-bold tracking-wider leading-[1.8] pb-2.5 mb-2" style={{ fontFamily: "'Amiri', serif" }}>
                        بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                    </div>
                )}
                {settings.namaYayasan && (
                    <div className="text-xs uppercase tracking-[0.25em] text-slate-600 font-bold mt-1.5">
                        {settings.namaYayasan}
                    </div>
                )}
                <h1 className="text-2xl font-bold uppercase tracking-widest text-slate-900 mt-0.5">
                    {settings.namaPonpes}
                </h1>
                <p className="text-[10px] text-slate-500 max-w-xl mx-auto italic mt-0.5">
                    {settings.alamat}{settings.telepon ? ` • Telp: ${settings.telepon}` : ''}
                </p>

                <div className="w-48 h-0.5 bg-gradient-to-r from-transparent via-slate-400 to-transparent mx-auto my-2"></div>

                <div className="inline-block px-8 py-1 border-y border-slate-700 text-slate-900">
                    <span className="text-xl font-bold tracking-[0.18em] uppercase font-sans">
                        {judulDokumen}
                    </span>
                </div>
                {nomorSertifikat && (
                    <div className="text-[11px] text-slate-600 mt-1 font-mono tracking-widest">
                        Nomor: {nomorSertifikat}
                    </div>
                )}
            </div>

            {/* Body */}
            <div className="relative z-10 text-center my-auto px-10">
                {kalimatPengantar && (
                    <p className="text-sm text-slate-700 italic mb-2">
                        {kalimatPengantar}
                    </p>
                )}

                <div className="text-3xl font-bold text-slate-900 tracking-wide border-b border-slate-400 pb-1.5 max-w-2xl mx-auto">
                    {namaPenerima}
                </div>

                {validIdentitas.length > 0 && (
                    <div className="flex justify-center items-center gap-3 text-xs text-slate-700 mt-2 font-sans flex-wrap">
                        {validIdentitas.map((item, idx) => (
                            <React.Fragment key={idx}>
                                {idx > 0 && <span>•</span>}
                                <span>
                                    {item.label ? <>{item.label}: </> : null}
                                    <strong className="text-slate-900 font-semibold">{item.value}</strong>
                                </span>
                            </React.Fragment>
                        ))}
                    </div>
                )}

                {deskripsiCapaian && (
                    <p className="text-sm text-slate-700 mt-3 max-w-3xl mx-auto leading-relaxed">
                        {deskripsiCapaian}
                    </p>
                )}

                {capaianUtama && (
                    <div className="mt-2.5 inline-flex flex-col items-center justify-center px-8 py-2 bg-slate-50/70 rounded-xl border border-slate-300">
                        <span className="text-lg font-bold text-slate-900 tracking-wide">
                            {capaianUtama}
                        </span>
                        {showPredikat && predikatValue && (
                            <span className="text-xs text-slate-600 mt-0.5 font-sans">
                                {predikatLabel}: <strong className="text-slate-900 font-bold">{predikatValue}</strong>
                            </span>
                        )}
                    </div>
                )}

                {catatanDoa && (
                    <p className="text-xs text-slate-600 italic mt-2.5 max-w-2xl mx-auto leading-relaxed">
                        &ldquo;{catatanDoa}&rdquo;
                    </p>
                )}
            </div>

            {/* Signatures */}
            <div className="relative z-10 grid grid-cols-3 items-end pt-1 pb-1.5 text-center text-xs text-slate-900 font-sans">
                {signatoryCount === 2 && leftSignatory ? (
                    <SignatureSlot
                        sig={leftSignatory}
                        labelClass="text-[11px] text-slate-600 font-medium"
                        nameClass="font-bold text-sm text-slate-900 border-b border-slate-400 pb-0.5 min-w-[180px]"
                        roleClass="text-[10px] text-slate-600 mt-0.5"
                        nipClass="text-[9.5px] text-slate-500 font-mono"
                    />
                ) : (
                    <div></div>
                )}

                {renderCenterStamp('#1e293b', '#475569', 'text-[11px] text-slate-600 font-medium mt-1.5')}

                <SignatureSlot
                    sig={rightSignatory}
                    labelClass="text-[11px] text-slate-600 font-medium"
                    nameClass="font-bold text-sm text-slate-900 border-b border-slate-400 pb-0.5 min-w-[180px]"
                    roleClass="text-[10px] text-slate-600 mt-0.5"
                    nipClass="text-[9.5px] text-slate-500 font-mono"
                />
            </div>

            <div className="relative z-10 text-center text-[8px] text-slate-400 border-t border-slate-200/80 pt-1 font-sans">
                {resolvedFooter}
            </div>
        </div>
    );
};

export const SertifikatCanvas = React.memo(SertifikatCanvasComponent);
