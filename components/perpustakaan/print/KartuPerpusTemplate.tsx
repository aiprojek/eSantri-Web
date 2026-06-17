import React, { useEffect, useState } from 'react';
import { Santri, PondokSettings } from '../../../types';
import { SmartAvatar } from '../../reports/modules/Common';
import QRCode from 'qrcode';

interface KartuPerpusTemplateProps {
    santri: Santri;
    settings: PondokSettings;
    theme: 'classic' | 'modern' | 'bold' | 'dark' | 'ceria' | 'vertical';
    backsideRules?: string;
    backsideLayout?: 'none' | 'side-by-side' | 'separate';
    displayMode?: 'photo' | 'qr' | 'both';
}

export const KartuPerpusTemplate: React.FC<KartuPerpusTemplateProps> = ({
    santri,
    settings,
    theme,
    backsideRules = '',
    backsideLayout = 'none',
    displayMode = 'both'
}) => {
    const [qrDataUrl, setQrDataUrl] = useState<string>('');

    useEffect(() => {
        QRCode.toDataURL(santri.nis, {
            width: 256,
            margin: 1,
            color: { dark: '#000000', light: '#ffffff' }
        }).then(setQrDataUrl).catch(() => setQrDataUrl(''));
    }, [santri.nis]);

    const cardStyle: React.CSSProperties = {
        width: theme === 'vertical' ? '5.398cm' : '8.56cm',
        height: theme === 'vertical' ? '8.56cm' : '5.398cm',
        flexShrink: 0,
        position: 'relative',
        overflow: 'hidden',
        breakInside: 'avoid',
        boxSizing: 'border-box'
    };

    const rombel = settings.rombel.find(r => r.id === santri.rombelId);
    const kelas = rombel ? settings.kelas.find(k => k.id === rombel.kelasId) : undefined;
    const jenjang = kelas ? settings.jenjang.find(j => j.id === kelas.jenjangId) : undefined;

    const jenjangKelas = `${jenjang?.nama?.split(' ')[0] || ''} / ${kelas?.nama || ''}`;
    const rombelNama = rombel?.nama || '-';

    // Theme configurations
    const themeConfigs = {
        classic: {
            bg: '#1B4D3E', borderColor: '#D4AF37', textClass: 'text-white',
            headerBg: 'bg-black/20', accentColor: '#D4AF37', accentTextClass: 'text-[#D4AF37]'
        },
        modern: {
            bg: 'bg-white', borderColor: '#e5e7eb', textClass: 'text-gray-800',
            headerBg: 'bg-blue-50', accentColor: '#1e40af', accentTextClass: 'text-blue-900'
        },
        bold: {
            bg: 'bg-white', borderColor: '#000', textClass: 'text-black',
            headerBg: 'bg-black', accentColor: '#000', accentTextClass: 'text-black'
        },
        dark: {
            bg: '#0f172a', borderColor: '#334155', textClass: 'text-white',
            headerBg: 'bg-slate-800', accentColor: '#0d9488', accentTextClass: 'text-teal-400'
        },
        ceria: {
            bg: 'bg-orange-50', borderColor: '#fed7aa', textClass: 'text-orange-900',
            headerBg: 'bg-orange-400', accentColor: '#f97316', accentTextClass: 'text-orange-700'
        },
        vertical: {
            bg: 'bg-white', borderColor: '#e5e7eb', textClass: 'text-gray-800',
            headerBg: 'bg-red-700', accentColor: '#dc2626', accentTextClass: 'text-red-700'
        }
    };

    const config = themeConfigs[theme] || themeConfigs.modern;

    // Generate default rules if empty
    const defaultRules = `1. Kartu ini harus dibawa saat pinjam buku.
2. Kartu tidak boleh dipindahtangankan.
3. Keterlambatan pengembalian dikenakan sanksi.
4. Kerusakan buku menjadi tanggung jawab peminjam.
5. Kembalikan buku tepat waktu.`;
    const rules = backsideRules || defaultRules;

    // Mode-based rendering
    const getAvatarVariant = (t: string): 'classic' | 'modern' | 'vertical' | 'dark' | 'ceria' => {
        if (t === 'bold') return 'modern';
        return t as 'classic' | 'modern' | 'vertical' | 'dark' | 'ceria';
    };

    const QrBadge = ({ size = '1cm', rounded = 'rounded-md' }: { size?: string; rounded?: string }) => (
        qrDataUrl ? (
            <div className={`bg-white p-0.5 ${rounded} shadow-md border border-gray-200 overflow-hidden`}>
                <img src={qrDataUrl} alt="QR NIS" className={`object-contain ${rounded}`} style={{ width: size, height: size }} />
            </div>
        ) : null
    );

    const renderAvatarSection = ({
        width = '2cm',
        height = '2cm',
        avatarVariant = getAvatarVariant(theme),
        avatarClassName = '',
        shapeClassName = 'rounded-lg',
        qrSize = '0.8cm',
        qrRounded = 'rounded-md',
        qrOnlyContainerClassName = 'bg-slate-800'
    }: {
        width?: string;
        height?: string;
        avatarVariant?: 'classic' | 'modern' | 'vertical' | 'dark' | 'ceria';
        avatarClassName?: string;
        shapeClassName?: string;
        qrSize?: string;
        qrRounded?: string;
        qrOnlyContainerClassName?: string;
    } = {}) => {
        const frameStyle = { width, height };

        if (displayMode === 'photo') {
            return (
                <div className={`${shapeClassName} overflow-hidden shadow-lg`} style={frameStyle}>
                    <SmartAvatar santri={santri} variant={avatarVariant} className={`w-full h-full object-cover ${avatarClassName}`.trim()} />
                </div>
            );
        }

        if (displayMode === 'qr') {
            return (
                <div
                    className={`flex items-center justify-center ${shapeClassName} overflow-hidden shadow-lg ${qrOnlyContainerClassName}`}
                    style={frameStyle}
                >
                    <QrBadge size={`calc(${width} - 0.45cm)`} rounded={qrRounded} />
                </div>
            );
        }

        return (
            <div className="relative flex items-center justify-center" style={frameStyle}>
                <div className={`${shapeClassName} overflow-hidden shadow-lg w-full h-full`}>
                    <SmartAvatar santri={santri} variant={avatarVariant} className={`w-full h-full object-cover ${avatarClassName}`.trim()} />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5">
                    <QrBadge size={qrSize} rounded={qrRounded} />
                </div>
            </div>
        );
    };


    // Backside content component with app credit
    const BacksideCard = () => (
        <div
            className={`rounded-lg overflow-hidden relative flex flex-col ${config.textClass} border-2`}
            style={{
                ...cardStyle,
                backgroundColor: config.bg.startsWith('#') ? config.bg : undefined,
                borderColor: config.borderColor
            }}
        >
            <div className="p-2 text-center border-b-2" style={{ borderColor: config.borderColor }}>
                <div className="text-[6pt] uppercase tracking-widest opacity-60">PERPUSTAKAAN</div>
                <div className="text-[8pt] font-bold" style={{ color: config.accentColor }}>{settings.namaPonpes}</div>
            </div>
            <div className="flex flex-col items-center justify-center flex-grow p-3">
                <div className="text-[6pt] uppercase tracking-wider mb-2 opacity-70">Tata Tertib Perpustakaan</div>
                <div className="w-full text-[5.5pt] leading-relaxed space-y-0.5" style={{ color: config.accentColor }}>
                    {rules.split('\n').slice(0, 8).map((line, i) => (
                        <div key={i} className="truncate">{line.replace(/^\d+\.\s*/, '')}</div>
                    ))}
                </div>
            </div>
            <div className="p-2 text-center border-t-2 text-[5pt]" style={{ borderColor: config.borderColor }}>
                <div>dibuat dengan eSantri Web by AI Projek | aiprojek01.my.id</div>
            </div>
        </div>
    );

    // --- CLASSIC THEME ---
    if (theme === 'classic') {
        return (
            <div className={backsideLayout === 'side-by-side' ? 'flex gap-0.5' : 'flex flex-col gap-0.5'}>
                <div className="rounded-xl overflow-hidden relative flex flex-col text-white border-4 border-double border-[#D4AF37]"
                    style={{ ...cardStyle, backgroundColor: '#1B4D3E', borderColor: '#D4AF37' }}>
                    <div className="flex justify-between items-center px-2 py-1.5 border-b border-[#D4AF37]/30 bg-black/20 h-[25%]">
                        <div className="w-10 h-full flex items-center justify-center">
                            {settings.logoYayasanUrl && <img src={settings.logoYayasanUrl} alt="Logo Yayasan" className="max-h-full max-w-full object-contain" />}
                        </div>
                        <div className="text-center flex-grow">
                            <div className="text-[6pt] font-bold uppercase tracking-wider text-[#D4AF37]">PERPUSTAKAAN</div>
                            <div className="text-[8pt] font-bold leading-tight">{settings.namaPonpes}</div>
                        </div>
                        <div className="w-10 h-full flex items-center justify-center">
                            {settings.logoPonpesUrl && <img src={settings.logoPonpesUrl} alt="Logo Ponpes" className="max-h-full max-w-full object-contain" />}
                        </div>
                    </div>
                    <div className="flex p-2 gap-2 flex-grow relative overflow-hidden">
                        <div className="w-[35%] flex items-center justify-center relative">
                            {renderAvatarSection({
                                width: '2cm',
                                height: '2cm',
                                avatarVariant: 'classic',
                                shapeClassName: 'rounded-lg',
                                qrSize: '0.9cm',
                                qrRounded: 'rounded-md'
                            })}
                        </div>
                        <div className="flex-grow text-[7pt] space-y-0.5 z-10 flex flex-col justify-center">
                            <div className="font-bold text-[#D4AF37] text-[10pt] border-b border-[#D4AF37]/30 pb-0.5 mb-1 truncate">{santri.namaLengkap}</div>
                            <div className="grid grid-cols-[35px_1fr]"><span>NIS</span><span>: {santri.nis}</span></div>
                            <div className="grid grid-cols-[35px_1fr]"><span>Jenjang</span><span>: {jenjangKelas}</span></div>
                            <div className="grid grid-cols-[35px_1fr]"><span>Rombel</span><span>: {rombelNama}</span></div>
                            <div className="grid grid-cols-[35px_1fr] items-start"><span>Alamat</span><span className="leading-tight line-clamp-2">: {santri.alamat.kabupatenKota}</span></div>
                        </div>
                        <div className="absolute right-[-20px] bottom-[-20px] text-[#D4AF37] opacity-10 text-[80pt] pointer-events-none">
                            <i className="bi bi-book-half"></i>
                        </div>
                    </div>
                </div>
                {backsideLayout !== 'none' && <BacksideCard />}
            </div>
        );
    }

    // --- MODERN THEME ---
    if (theme === 'modern') {
        return (
            <div className={backsideLayout === 'side-by-side' ? 'flex gap-0.5' : 'flex flex-col gap-0.5'}>
                <div className="rounded-lg overflow-hidden relative flex flex-col bg-white text-gray-800 border border-gray-200 shadow-sm" style={cardStyle}>
                    <div className="absolute top-0 left-0 w-2/5 h-full bg-blue-600 skew-x-12 -ml-8 z-0"></div>
                    <div className="absolute top-0 left-0 w-2/5 h-full bg-blue-500 skew-x-12 -ml-4 z-0 opacity-50"></div>
                    <div className="bg-blue-600/10 p-2 border-b border-blue-100 text-center z-10 relative">
                        <div className="text-[6pt] font-light text-gray-500 uppercase tracking-widest">KARTU PERPUSTAKAAN</div>
                        <div className="text-[9pt] font-bold text-blue-900 leading-none mt-0.5">{settings.namaPonpes}</div>
                    </div>
                    <div className="flex justify-between items-start p-3 z-10 relative flex-grow overflow-hidden">
                        <div className="w-[30%] flex items-center justify-center relative">
                            {renderAvatarSection({
                                width: '2cm',
                                height: '2cm',
                                avatarVariant: 'modern',
                                shapeClassName: 'rounded-lg',
                                qrSize: '0.9cm',
                                qrRounded: 'rounded-md'
                            })}
                        </div>
                        <div className="text-right flex-grow pl-2 pt-1 flex flex-col items-end">
                            <div className="text-[10pt] font-bold text-blue-900 leading-tight truncate w-full">{santri.namaLengkap}</div>
                            <div className="text-[8pt] font-mono text-blue-600 bg-blue-50 inline-block px-1 rounded mt-1">{santri.nis}</div>
                            <div className="mt-2 text-[6.5pt] space-y-0.5 text-gray-600">
                                <div className="flex justify-end gap-1"><span className="font-semibold">Jenjang:</span> {jenjangKelas}</div>
                                <div className="flex justify-end gap-1"><span className="font-semibold">Rombel:</span> {rombelNama}</div>
                                <div className="flex justify-end gap-1 text-right"><span className="font-semibold">Alamat:</span> <span className="truncate max-w-[100px]">{santri.alamat.kabupatenKota}</span></div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-blue-50 h-1.5 w-full mt-auto"></div>
                </div>
                {backsideLayout !== 'none' && <BacksideCard />}
            </div>
        );
    }

    // --- VERTICAL THEME ---
    if (theme === 'vertical') {
        return (
            <div className={backsideLayout === 'side-by-side' ? 'flex gap-0.5' : 'flex flex-col gap-0.5'}>
                <div className="rounded-lg overflow-hidden relative flex flex-col bg-white text-gray-800 border shadow-sm items-center text-center" style={cardStyle}>
                    <div className="w-full h-24 bg-red-700 absolute top-0 rounded-b-[50%] scale-x-150 z-0"></div>
                    <div className="z-10 mt-3 text-white">
                        <div className="text-[6pt] opacity-80 uppercase tracking-widest">PERPUSTAKAAN</div>
                        <div className="text-[8pt] font-bold mt-0.5">{settings.namaPonpes}</div>
                    </div>
                    <div className="z-10 mt-3 relative">
                        {renderAvatarSection({
                            width: '2.2cm',
                            height: '2.8cm',
                            avatarVariant: 'vertical',
                            shapeClassName: 'rounded-lg border-2 border-white',
                            qrSize: '0.8cm',
                            qrRounded: 'rounded'
                        })}
                    </div>
                    <div className="z-10 mt-4 px-2 w-full flex-grow flex flex-col items-center overflow-hidden">
                        <div className="text-[9pt] font-bold text-gray-800 leading-tight w-full truncate">{santri.namaLengkap}</div>
                        <div className="text-[7pt] text-red-600 font-medium mt-0.5 mb-2">{santri.nis}</div>
                        <div className="w-full border-t border-gray-200 my-1"></div>
                        <div className="text-[6.5pt] text-gray-600 space-y-0.5 w-full text-left px-3">
                            <div className="grid grid-cols-[40px_1fr]"><span className="text-gray-400">Kelas</span><span>: {jenjangKelas}</span></div>
                            <div className="grid grid-cols-[40px_1fr]"><span className="text-gray-400">Rombel</span><span>: {rombelNama}</span></div>
                            <div className="grid grid-cols-[40px_1fr]"><span className="text-gray-400">Alamat</span><span className="truncate">: {santri.alamat.kabupatenKota}</span></div>
                        </div>
                    </div>
                    <div className="w-full bg-gray-800 text-white text-[5pt] py-1 absolute bottom-0">Kartu Anggota Perpustakaan</div>
                </div>
                {backsideLayout !== 'none' && <BacksideCard />}
            </div>
        );
    }

    // --- BOLD THEME ---
    if (theme === 'bold') {
        return (
            <div className={backsideLayout === 'side-by-side' ? 'flex gap-0.5' : 'flex flex-col gap-0.5'}>
                <div className="rounded-lg overflow-hidden relative flex flex-col bg-white text-black border-2 border-black" style={cardStyle}>
                    <div className="bg-black text-white p-2 flex justify-between items-center">
                        <div className="font-bold text-[10pt] uppercase tracking-tighter">PERPUSTAKAAN</div>
                        <div className="text-[6pt] uppercase tracking-widest">MEMBER CARD</div>
                    </div>
                    <div className="flex p-3 gap-3 items-center h-full">
                        <div className="w-[35%] flex items-center justify-center relative">
                            {renderAvatarSection({
                                width: '2cm',
                                height: '2cm',
                                avatarVariant: 'modern',
                                shapeClassName: 'rounded-lg',
                                qrSize: '0.9cm',
                                qrRounded: 'rounded-md'
                            })}
                        </div>
                        <div className="flex-grow space-y-1">
                            <div className="text-[12pt] font-black leading-none uppercase">{santri.namaLengkap}</div>
                            <div className="text-[9pt] font-mono bg-black text-white inline-block px-1">{santri.nis}</div>
                            <div className="text-[7pt] font-bold mt-2 border-t-2 border-black pt-1">{settings.namaPonpes}</div>
                            <div className="text-[6pt]">{rombelNama} - {jenjang?.nama}</div>
                        </div>
                    </div>
                    <div className="h-4 w-full bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAABCAYAAAD5PA/NAAAAFklEQVR42mN88//wf2ZgYOAAYiYoBwAC9gL57r14sQAAAABJRU5ErkJggg==')] bg-repeat-x opacity-40 mt-auto"></div>
                </div>
                {backsideLayout !== 'none' && <BacksideCard />}
            </div>
        );
    }

    // --- DARK THEME ---
    if (theme === 'dark') {
        return (
            <div className={backsideLayout === 'side-by-side' ? 'flex gap-0.5' : 'flex flex-col gap-0.5'}>
                <div className="rounded-xl overflow-hidden relative flex flex-col bg-slate-900 text-white border border-slate-700" style={cardStyle}>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500 rounded-full blur-[40px] opacity-20 -mr-10 -mt-10"></div>
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-500 rounded-full blur-[30px] opacity-20 -ml-8 -mb-8"></div>
                    <div className="flex items-center justify-between p-3 border-b border-slate-800 z-10">
                        <div className="flex items-center gap-2">
                            {settings.logoPonpesUrl && (
                                <div className="w-8 h-8 flex items-center justify-center">
                                    <img src={settings.logoPonpesUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
                                </div>
                            )}
                            <div>
                                <div className="text-[8pt] font-normal text-teal-400">Kartu Anggota</div>
                                <div className="text-[7pt] font-bold tracking-wide uppercase leading-none">{settings.namaPonpes}</div>
                            </div>
                        </div>
                    </div>
                    <div className="flex p-3 gap-3 z-10 flex-grow overflow-hidden">
                        <div className="w-[30%] flex flex-col gap-2 relative">
                            {renderAvatarSection()}
                            <div className="text-center">
                                <div className="text-[9pt] font-mono font-bold text-teal-400">{santri.nis}</div>
                                <div className="text-[5pt] text-slate-500 uppercase tracking-widest">ID Anggota</div>
                            </div>
                        </div>
                        <div className="flex-grow space-y-1">
                            <div className="mb-2">
                                <div className="text-[5pt] text-slate-500 uppercase">Nama Lengkap</div>
                                <div className="text-[8pt] font-bold leading-tight truncate">{santri.namaLengkap}</div>
                            </div>
                            <div className="grid grid-cols-2 gap-1">
                                <div><div className="text-[5pt] text-slate-500 uppercase">Jenjang</div><div className="text-[6.5pt]">{jenjangKelas}</div></div>
                                <div><div className="text-[5pt] text-slate-500 uppercase">Rombel</div><div className="text-[6.5pt]">{rombelNama}</div></div>
                            </div>
                            <div><div className="text-[5pt] text-slate-500 uppercase">Alamat</div><div className="text-[6.5pt] leading-tight line-clamp-2">{santri.alamat.kabupatenKota}</div></div>
                        </div>
                    </div>
                </div>
                {backsideLayout !== 'none' && <BacksideCard />}
            </div>
        );
    }

    // --- CERIA THEME ---
    const ceriaContent = () => {
        return (
            <div className="rounded-2xl overflow-hidden relative flex flex-col bg-orange-50 text-orange-900 border-2 border-orange-200" style={cardStyle}>
                <div className="bg-orange-400 p-2 text-center text-white relative overflow-hidden">
                    <div className="absolute w-4 h-4 bg-white rounded-full opacity-20 top-1 left-2"></div>
                    <div className="absolute w-6 h-6 bg-white rounded-full opacity-20 bottom-[-10px] right-4"></div>
                    <div className="text-[8pt] font-normal mb-0.5 relative z-10">Kartu Baca</div>
                    <div className="text-[8pt] font-bold relative z-10 leading-none">{settings.namaPonpes}</div>
                </div>
                <div className="flex p-2 gap-3 items-start flex-grow pl-4 overflow-hidden">
                    <div className="relative mt-1">
                        <div className="absolute inset-0 bg-teal-400 rounded-full transform translate-x-1 translate-y-1"></div>
                        <div className="relative">
                            {renderAvatarSection({
                                width: '2cm',
                                height: '2cm',
                                avatarVariant: 'ceria',
                                avatarClassName: 'bg-teal-200',
                                shapeClassName: 'rounded-full border-2 border-white',
                                qrSize: '0.8cm',
                                qrRounded: 'rounded-md',
                                qrOnlyContainerClassName: 'bg-teal-200'
                            })}
                        </div>
                    </div>
                    <div className="flex-grow pl-2 z-10 relative">
                        <div className="mb-2 border-b border-orange-200 pb-1">
                            <div className="text-[5pt] text-orange-400 uppercase tracking-wide">Nama Lengkap</div>
                            <div className="text-[9pt] font-bold text-teal-800 leading-tight truncate">{santri.namaLengkap}</div>
                        </div>
                        <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-[6.5pt]">
                            <div><div className="text-[5pt] text-orange-400 uppercase">NIS</div><div className="font-mono text-orange-700 bg-white/50 inline-block px-1 rounded font-bold">{santri.nis}</div></div>
                            <div><div className="text-[5pt] text-orange-400 uppercase">Kelas</div><div className="text-teal-700 font-bold leading-tight">{rombelNama}</div></div>
                            <div className="col-span-2"><div className="text-[5pt] text-orange-400 uppercase">Alamat</div><div className="text-teal-700 font-bold truncate">{santri.alamat.kabupatenKota}</div></div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className={backsideLayout === 'side-by-side' ? 'flex gap-0.5' : 'flex flex-col gap-0.5'}>
            {ceriaContent()}
            {backsideLayout !== 'none' && <BacksideCard />}
        </div>
    );
};
