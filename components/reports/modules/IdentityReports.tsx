
import React, { useState, useEffect } from 'react';
import { Santri, PondokSettings } from '../../../types';
import { PrintHeader, getKopIdentityLines } from '../../common/PrintHeader';
import { formatDate, toHijri, ReportFooter, SmartAvatar, formatAlamat } from './Common';
import QRCode from 'qrcode';

// --- UTILITY FOR QR/BARCODE ---
// Cache for generated QR code data URLs to minimize re-computation
const qrCodeCache: Record<string, string> = {};

const generateQRCodeDataUrl = async (nis: string, size: number = 100): Promise<string> => {
    const cacheKey = `${nis}-${size}`;
    if (qrCodeCache[cacheKey]) {
        return qrCodeCache[cacheKey];
    }
    try {
        const dataUrl = await QRCode.toDataURL(nis, {
            width: size,
            margin: 1,
            color: {
                dark: '#000000',
                light: '#ffffff'
            }
        });
        qrCodeCache[cacheKey] = dataUrl;
        return dataUrl;
    } catch (error) {
        console.error('QR generation failed:', error);
        return '';
    }
};

// Generate standard Code 128 Barcode as crisp SVG (standard, fully scannable by physical scanners & smartphone apps)
const CODE128_PATTERNS = [
    "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213", // 0-9
    "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132", // 10-19
    "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211", // 20-29
    "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313", // 30-39
    "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331", // 40-49
    "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111", // 50-59
    "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214", // 60-69
    "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111", // 70-79
    "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141", // 80-89
    "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141", // 90-99
    "114131", "311141", "411131", "211412", "211214", "211232", "2331112" // 100-106 (104=StartB, 106=Stop)
];

const generateBarcodeVisual = (nis: string, width: number = 120, height: number = 40): string => {
    const rawText = String(nis || '').trim() || '000000';
    // Use Code 128 Set B (standard ASCII 32-126)
    const startCode = 104; // Start B
    let checksum = startCode;
    const patternCodes: number[] = [startCode];

    for (let i = 0; i < rawText.length; i++) {
        const charCode = rawText.charCodeAt(i);
        const code = (charCode >= 32 && charCode <= 126) ? (charCode - 32) : 0;
        patternCodes.push(code);
        checksum += code * (i + 1);
    }

    const checkDigit = checksum % 103;
    patternCodes.push(checkDigit);
    patternCodes.push(106); // Stop code

    // Convert patterns into continuous sequence of bar and space modules
    const moduleSequence: number[] = [];
    patternCodes.forEach(code => {
        const pattern = CODE128_PATTERNS[code] || CODE128_PATTERNS[0];
        for (let j = 0; j < pattern.length; j++) {
            moduleSequence.push(parseInt(pattern[j], 10));
        }
    });

    const totalModules = moduleSequence.reduce((sum, val) => sum + val, 0);
    const quietZoneModules = 10;
    const grandTotalModules = totalModules + (quietZoneModules * 2);
    const moduleWidth = width / grandTotalModules;

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">`;
    svg += `<rect width="${width}" height="${height}" fill="white"/>`;

    let currentX = quietZoneModules * moduleWidth;
    let isBar = true;

    for (let i = 0; i < moduleSequence.length; i++) {
        const w = moduleSequence[i] * moduleWidth;
        if (isBar) {
            svg += `<rect x="${currentX.toFixed(2)}" y="2" width="${w.toFixed(2)}" height="${height - 4}" fill="black"/>`;
        }
        currentX += w;
        isBar = !isBar;
    }

    svg += `</svg>`;
    return `data:image/svg+xml;base64,${btoa(svg)}`;
};

// --- BIODATA ---

const BiodataItem: React.FC<{ number?: string; label: string; value?: string | number | null; sub?: boolean; }> = (props) => {
    const { number, label, value, sub } = props;
    const isHeaderField = !('value' in props);
    const hasValue = value !== null && value !== undefined && value !== '';
    return (
      <tr>
        <td className={`align-top py-1 ${sub ? 'pl-8' : 'w-8 pr-2'}`}>{number}</td>
        <td className="align-top py-1 pr-2">{label}</td>
        <td className="align-top py-1 px-2 w-4">{isHeaderField ? '' : ':'}</td>
        <td className="align-top py-1 font-semibold">{isHeaderField ? '' : (hasValue ? value : '-')}</td>
      </tr>
    );
};
  
const BiodataSection: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className }) => (
    <tbody style={{ breakInside: 'avoid' }} className={className}>
        <tr><th colSpan={4} className="font-bold text-md pt-6 pb-2 text-left">{title}</th></tr>
        {children}
    </tbody>
);

const BiodataTemplate: React.FC<{ santri: Santri; settings: PondokSettings; useHijriDate: boolean; hijriDateMode: string; manualHijriDate: string; }> = ({ santri, settings, useHijriDate, hijriDateMode, manualHijriDate }) => {
    const rombel = settings.rombel.find(r => r.id === santri.rombelId);
    const kelas = rombel ? settings.kelas.find(k => k.id === rombel.kelasId) : undefined;
    const jenjang = kelas ? settings.jenjang.find(j => j.id === kelas.jenjangId) : undefined;
    const mudir = jenjang?.mudirId ? settings.tenagaPengajar.find(p => p.id === jenjang.mudirId) : undefined;
    const hijriAdjustment = settings.hijriAdjustment || 0;

    const gregorianDateString = formatDate(new Date().toISOString());
    let hijriDateString = '';
    if (useHijriDate) {
        hijriDateString = hijriDateMode === 'auto' ? toHijri(new Date(), hijriAdjustment) : manualHijriDate;
    }

    return (
      <div className="font-sans text-black flex flex-col h-full justify-between" style={{ fontSize: '12pt', lineHeight: '1.5' }}>
        <div>
            <PrintHeader settings={settings} title={`BIODATA SANTRI ${jenjang?.nama?.toUpperCase()} ${kelas?.nama?.toUpperCase()} ROMBEL ${rombel?.nama?.toUpperCase()}`} />
            <table className="w-full">
                <BiodataSection title="A. KETERANGAN PRIBADI SANTRI">
                    <BiodataItem number="1." label="Nama Lengkap" value={santri.namaLengkap} />
                    <BiodataItem number="2." label="Nama Panggilan (Hijrah)" value={santri.namaHijrah} />
                    <BiodataItem number="3." label="Nomor Induk" /><BiodataItem label="a. NIS" value={santri.nis} sub /><BiodataItem label="b. NIK" value={santri.nik} sub /><BiodataItem label="c. NISN" value={santri.nisn} sub />
                    <BiodataItem number="4." label="Jenis Kelamin" value={santri.jenisKelamin} /><BiodataItem number="5." label="Tempat, Tanggal Lahir" value={`${santri.tempatLahir}, ${formatDate(santri.tanggalLahir)}`} />
                    <BiodataItem number="6." label="Kewarganegaraan" value={santri.kewarganegaraan} /><BiodataItem number="7." label="Jenis Santri" value={santri.jenisSantri} /><BiodataItem number="8." label="Berkebutuhan Khusus" value={santri.berkebutuhanKhusus} />
                    <BiodataItem number="9." label="Anak Ke" value={santri.anakKe} /><BiodataItem number="10." label="Jumlah Saudara" value={santri.jumlahSaudara} /><BiodataItem number="11." label="Status Keluarga" value={santri.statusKeluarga} />
                    <BiodataItem number="12." label="Alamat Santri" value={formatAlamat(santri.alamat)} /><BiodataItem number="13." label="Diterima di Ponpes ini" /><BiodataItem label="a. Di Jenjang" value={jenjang?.nama} sub /><BiodataItem label="b. Di Rombel" value={rombel?.nama} sub /><BiodataItem label="c. Pada Tanggal" value={formatDate(santri.tanggalMasuk)} sub />
                    <BiodataItem number="14." label="Sekolah Asal" /><BiodataItem label="a. Nama Sekolah" value={santri.sekolahAsal} sub /><BiodataItem label="b. Alamat Sekolah" value={santri.alamatSekolahAsal} sub />
                </BiodataSection>
                <BiodataSection title="B. KETERANGAN ORANG TUA KANDUNG">
                    <BiodataItem number="15." label="Nama Ayah" value={santri.namaAyah} /><BiodataItem number="16." label="Tempat, Tanggal Lahir Ayah" value={santri.tempatLahirAyah ? `${santri.tempatLahirAyah}, ${formatDate(santri.tanggalLahirAyah)}` : formatDate(santri.tanggalLahirAyah)} />
                    <BiodataItem number="17." label="Pendidikan Terakhir Ayah" value={santri.pendidikanAyah} /><BiodataItem number="18." label="Pekerjaan Ayah" value={santri.pekerjaanAyah} /><BiodataItem number="20." label="No. Telepon Ayah" value={santri.teleponAyah || (santri as any).nomorHpAyah || '-'} />
                    <BiodataItem number="21." label="Nama Ibu" value={santri.namaIbu} /><BiodataItem number="22." label="Tempat, Tanggal Lahir Ibu" value={santri.tempatLahirIbu ? `${santri.tempatLahirIbu}, ${formatDate(santri.tanggalLahirIbu)}` : formatDate(santri.tanggalLahirIbu)} />
                    <BiodataItem number="23." label="Pendidikan Terakhir Ibu" value={santri.pendidikanIbu} /><BiodataItem number="24." label="Pekerjaan Ibu" value={santri.pekerjaanIbu} /><BiodataItem number="26." label="No. Telepon Ibu" value={santri.teleponIbu || (santri as any).nomorHpIbu || '-'} />
                    <BiodataItem number="27." label="Alamat Orang Tua" value={formatAlamat(santri.alamatAyah) || formatAlamat(santri.alamatIbu) || formatAlamat(santri.alamat)} />
                </BiodataSection>
                {santri.namaWali && (
                <BiodataSection title="C. KETERANGAN WALI">
                    <BiodataItem number="28." label="Nama Wali" value={santri.namaWali} /><BiodataItem number="29." label="Hubungan dengan Santri" value={santri.statusWali} /><BiodataItem number="30." label="Pekerjaan Wali" value={santri.pekerjaanWali} /><BiodataItem number="32." label="No. Telepon Wali" value={santri.teleponWali || (santri as any).nomorHpWali || '-'} /><BiodataItem number="33." label="Alamat Wali" value={formatAlamat(santri.alamatWali) || formatAlamat(santri.alamat)} />
                </BiodataSection>
                )}
            </table>
            <div className="mt-16 flow-root" style={{ breakInside: 'avoid' }}>
                <div className="float-right w-72 text-center">
                    <p>Sumpiuh, {gregorianDateString}</p>
                    {hijriDateString && <p className="text-sm">{hijriDateString}</p>}
                    <p className="mt-4">Mudir Marhalah,</p><div className="h-20"></div><p className="font-bold underline">{mudir ? mudir.nama : '_____________________'}</p>
                </div>
            </div>
        </div>
        <ReportFooter />
      </div>
    );
};

export const generateBiodataReports = (data: Santri[], settings: PondokSettings, options: any) => {
    return data.map(santri => ({
        content: <BiodataTemplate santri={santri} settings={settings} useHijriDate={options.useHijriDate} hijriDateMode={options.hijriDateMode} manualHijriDate={options.manualHijriDate} />,
        orientation: 'portrait' as const
    }));
};

// --- QR CODE & BARCODE COMPONENTS FOR CARDS ---
const CardQRCodeView: React.FC<{ value: string; size?: number; className?: string; isDark?: boolean }> = ({ value, size = 42, className, isDark = false }) => {
    const [dataUrl, setDataUrl] = useState<string>('');

    useEffect(() => {
        let active = true;
        generateQRCodeDataUrl(value, size * 2).then(url => {
            if (active) setDataUrl(url);
        });
        return () => { active = false; };
    }, [value, size]);

    if (!dataUrl) {
        return <div className={`animate-pulse rounded bg-gray-200/40 ${className}`} style={{ width: size, height: size }} />;
    }

    return (
        <div className={`p-[1px] rounded bg-white shadow-xs flex items-center justify-center shrink-0 ${isDark ? 'border border-slate-600' : 'border border-gray-200'} ${className}`}>
            <img src={dataUrl} alt={`QR-${value}`} className="object-contain" style={{ width: size, height: size }} referrerPolicy="no-referrer" />
        </div>
    );
};

const CardBarcodeView: React.FC<{ value: string; width?: number; height?: number; className?: string; isDark?: boolean }> = ({ value, width = 85, height = 22, className, isDark = false }) => {
    const src = generateBarcodeVisual(value, width, height);
    return (
        <div className={`p-0.5 rounded bg-white shadow-sm flex items-center justify-center shrink-0 ${isDark ? 'border border-slate-600' : 'border border-gray-200'} ${className}`}>
            <img src={src} alt={`Barcode-${value}`} className="object-contain" style={{ width, height }} referrerPolicy="no-referrer" />
        </div>
    );
};

// --- KARTU SANTRI ---

const KartuSantriTemplate: React.FC<{ santri: Santri; settings: PondokSettings; options: any }> = ({ santri, settings, options }) => {
    const { cardDesign, cardValidUntil, cardFields, cardWidth, cardHeight, cardValidityMode, cardShowQRCode, cardQRPlacement = 'with_photo' } = options || {};
    const rombel = settings.rombel?.find(r => r.id === santri.rombelId);
    const kelas = rombel ? settings.kelas?.find(k => k.id === rombel.kelasId) : (santri.kelasId ? settings.kelas?.find(k => k.id === santri.kelasId) : undefined);
    const jenjang = kelas ? settings.jenjang?.find(j => j.id === kelas.jenjangId) : (santri.jenjangId ? settings.jenjang?.find(j => j.id === santri.jenjangId) : undefined);
    const gedung = santri.gedungId ? settings.gedungAsrama?.find(g => g.id === santri.gedungId) : undefined;
    const kamar = santri.kamarId ? settings.kamar?.find(k => k.id === santri.kamarId) : undefined;

    const showPhoto = cardFields.includes('foto');
    const showNama = cardFields.includes('namaLengkap');
    const showNamaHijrah = cardFields.includes('namaHijrah');
    const showNis = cardFields.includes('nis');
    const showNisn = cardFields.includes('nisn');
    const showNik = cardFields.includes('nik');
    const showJenjang = cardFields.includes('jenjang');
    const showKelas = cardFields.includes('kelas');
    const showRombel = cardFields.includes('rombel');
    const showAsrama = cardFields.includes('asrama');
    const showTtl = cardFields.includes('ttl');
    const showGolDarah = cardFields.includes('golonganDarah');
    const showJenisSantri = cardFields.includes('jenisSantri');
    const showAyahWali = cardFields.includes('ayahWali');
    const showTeleponWali = cardFields.includes('teleponWali');
    const showTahunMasuk = cardFields.includes('tahunMasuk');
    const showAlamat = cardFields.includes('alamat');

    const nama = santri.namaLengkap;
    const namaHijrah = santri.namaHijrah || santri.namaPanggilan || '';
    const nis = santri.nis;
    const nisn = santri.nisn || '';
    const nik = santri.nik || '';
    const nisValue = santri?.nis || (santri?.id ? `SAN${santri.id}` : '');
    const jenjangNama = jenjang?.nama || '-';
    const kelasNama = kelas?.nama || '-';
    // Backwards compatibility: if jenjang is checked without kelas, display combined format if available
    const jenjangDisplay = (showJenjang && !showKelas)
        ? (jenjang?.nama ? `${jenjang.nama.split(' ')[0]} / ${kelas?.nama || ''}`.replace(/^ \/ | \/ $/g, '') : jenjangNama)
        : jenjangNama;
    const rombelNama = rombel?.nama || '-';
    const asramaText = (gedung && kamar) ? `${gedung.nama} / ${kamar.nama}` : (gedung?.nama || kamar?.nama || '-');
    const ttl = `${santri.tempatLahir || '-'}, ${formatDate(santri.tanggalLahir)}`;
    const golonganDarah = santri.golonganDarah || '-';
    const jenisSantri = santri.jenisSantri || '-';
    const ayahWali = santri.namaAyah || santri.namaWali || santri.namaIbu || '-';
    const teleponWali = santri.teleponWali || santri.teleponAyah || santri.teleponIbu || santri.telepon || '-';
    const tahunMasuk = santri.tanggalMasuk ? santri.tanggalMasuk.split('-')[0] : ((santri as any).tahunMasuk ? String((santri as any).tahunMasuk) : '-');
    const alamat = formatAlamat(santri.alamat) || '-';
    
    // Helper functions: Smart Font Sizing across all Santri Data
    // Determines row density based on how many fields are active
    const activeRowCount = [
        showNis,
        showNisn && Boolean(nisn),
        showNik && Boolean(nik),
        showNamaHijrah && Boolean(namaHijrah),
        showJenjang,
        showKelas,
        showRombel,
        showAsrama,
        showTtl,
        showGolDarah && Boolean(santri.golonganDarah),
        showJenisSantri,
        showAyahWali,
        showTeleponWali && Boolean(teleponWali !== '-'),
        showTahunMasuk,
        showAlamat
    ].filter(Boolean).length;

    // Smart Font Sizing for Nama Lengkap
    const getSmartNamaStyle = (text: string, basePt: number = 9.8): React.CSSProperties => {
        const len = (text || '').trim().length;
        let sizePt = basePt;
        let lineHeight = 1.15;
        if (len > 38) {
            sizePt = Math.max(6.2, basePt - 3.2);
            lineHeight = 1.02;
        } else if (len > 28) {
            sizePt = Math.max(7.2, basePt - 2.2);
            lineHeight = 1.08;
        } else if (len > 20) {
            sizePt = Math.max(8.2, basePt - 1.3);
            lineHeight = 1.12;
        } else if (len > 15) {
            sizePt = Math.max(8.9, basePt - 0.7);
            lineHeight = 1.14;
        }
        return {
            fontSize: `${sizePt.toFixed(1)}pt`,
            lineHeight: lineHeight,
            wordBreak: 'break-word',
            overflowWrap: 'break-word',
        };
    };

    // Seragamkan ukuran font data kartu santri ikut yang paling kecil agar visualnya rapih & konsisten
    const calculateUniformDataPt = (): number => {
        const activeTexts = [
            showNamaHijrah ? namaHijrah : '',
            showNis ? nis : '',
            showNisn ? nisn : '',
            showNik ? nik : '',
            showJenjang ? jenjangDisplay : '',
            showKelas ? kelasNama : '',
            showRombel ? rombelNama : '',
            showAsrama ? asramaText : '',
            showTtl ? ttl : '',
            showGolDarah ? santri.golonganDarah : '',
            showJenisSantri ? jenisSantri : '',
            showAyahWali ? ayahWali : '',
            showTeleponWali ? teleponWali : '',
            showTahunMasuk ? tahunMasuk : '',
            showAlamat ? alamat : ''
        ].filter(Boolean) as string[];

        const maxLen = activeTexts.reduce((m, t) => Math.max(m, (t || '').length), 0);

        // Menentukan ukuran seragam terkecil yang tetap presisi, terbaca tajam, dan tidak melompat-lompat antar baris
        if (activeRowCount >= 9 || maxLen > 55) {
            return 4.8;
        } else if (activeRowCount >= 7 || maxLen > 38) {
            return 5.1;
        } else if (activeRowCount >= 5 || maxLen > 24) {
            return 5.3;
        }
        return 5.5;
    };

    const uniformDataPt = calculateUniformDataPt();

    // Gaya seragam yang dipakai semua baris data kartu santri
    const uniformFieldStyle: React.CSSProperties = {
        fontSize: `${uniformDataPt.toFixed(1)}pt`,
        lineHeight: 1.14,
        wordBreak: 'break-word',
        overflowWrap: 'break-word',
    };

    const uniformAlamatStyle: React.CSSProperties = {
        fontSize: `${uniformDataPt.toFixed(1)}pt`,
        lineHeight: 1.08,
        wordBreak: 'break-word',
        overflowWrap: 'break-word',
    };

    const getSmartFieldStyle = (_text?: string, _basePt?: number): React.CSSProperties => {
        return uniformFieldStyle;
    };

    const getSmartNisStyle = (_text?: string, _basePt?: number): React.CSSProperties => {
        return {
            fontSize: `${uniformDataPt.toFixed(1)}pt`,
            fontWeight: 'bold',
            wordBreak: 'break-all',
            letterSpacing: '0.02em'
        };
    };

    const getSmartAlamatStyle = (_text?: string, _basePt?: number): React.CSSProperties => {
        return uniformAlamatStyle;
    };

    const getSmartTextStyle = getSmartFieldStyle;

    // Logic for Validity Text
    const validityText = cardValidityMode === 'forever' 
        ? 'Berlaku Selama Menjadi Santri' 
        : cardValidityMode === 'none' 
            ? null 
            : `Berlaku s.d. ${formatDate(cardValidUntil)}`;

    // Dynamic Dimensions
    const cardStyle: React.CSSProperties = {
        width: `${cardWidth}cm`,
        height: `${cardHeight}cm`,
        flexShrink: 0,
        boxSizing: 'border-box',
    };

    const themeQrStyles: Record<string, { badgeBorder: string; onlyBorder: string }> = {
        classic: {
            badgeBorder: 'border border-[#D4AF37] ring-1 ring-[#D4AF37]/40 shadow-xs',
            onlyBorder: 'border-2 border-[#D4AF37] shadow-sm'
        },
        modern: {
            badgeBorder: 'border border-blue-400 ring-1 ring-blue-500/20 shadow-xs',
            onlyBorder: 'border-2 border-blue-300 shadow-sm'
        },
        vertical: {
            badgeBorder: 'border border-red-400 ring-1 ring-red-500/20 shadow-xs',
            onlyBorder: 'border-2 border-red-300 shadow-sm'
        },
        dark: {
            badgeBorder: 'border border-teal-400 ring-1 ring-teal-500/30 shadow-xs',
            onlyBorder: 'border-2 border-teal-500 shadow-sm'
        },
        ceria: {
            badgeBorder: 'border-2 border-teal-400 shadow-xs',
            onlyBorder: 'border-2 border-teal-400 shadow-sm'
        }
    };

    // Helper for Photo or QR Placement on Front Card
    const renderSantriPhotoOrQR = ({
        variant,
        shapeClass,
        widthClass,
        heightClass,
        qrSize = 20,
        qrOnlySize = 48,
        borderClass = '',
        qrPositionClass = 'bottom-0.5 right-0.5',
        isDark = false
    }: {
        variant: 'classic' | 'modern' | 'vertical' | 'dark' | 'ceria';
        shapeClass: string;
        widthClass: string;
        heightClass: string;
        qrSize?: number;
        qrOnlySize?: number;
        borderClass?: string;
        qrPositionClass?: string;
        isDark?: boolean;
    }) => {
        const themeStyle = themeQrStyles[variant] || themeQrStyles.classic;
        const isCircular = shapeClass.includes('rounded-full');

        if (cardShowQRCode && cardQRPlacement === 'replace_photo') {
            // For circular frames (e.g. Ceria & Modern), size must fit safely inside inscribed square so corners are never clipped
            const safeQrOnlySize = isCircular ? 34 : qrOnlySize;

            return (
                <div className={`${widthClass} ${heightClass} ${shapeClass} ${themeStyle.onlyBorder} bg-white shadow-md flex items-center justify-center p-1 relative overflow-hidden`}>
                    <CardQRCodeView value={nisValue} size={safeQrOnlySize} className="p-0 border-none shadow-none" isDark={isDark} />
                </div>
            );
        }

        if (cardShowQRCode && cardQRPlacement === 'with_photo') {
            const safeBadgeSize = isCircular ? Math.min(qrSize, 17) : qrSize;

            return (
                <div className={`relative inline-block ${widthClass} ${heightClass}`}>
                    <SmartAvatar
                        santri={santri}
                        variant={variant}
                        className={`w-full h-full object-cover ${shapeClass} ${borderClass}`}
                        forcePlaceholder={!showPhoto}
                    />
                    {nisValue && (
                        <div className={`absolute ${qrPositionClass} z-20 bg-white p-[1.5px] rounded-xs ${themeStyle.badgeBorder} flex items-center justify-center`}>
                            <CardQRCodeView value={nisValue} size={safeBadgeSize} className="p-0 border-none shadow-none" isDark={isDark} />
                        </div>
                    )}
                </div>
            );
        }

        return (
            <SmartAvatar
                santri={santri}
                variant={variant}
                className={`${widthClass} ${heightClass} object-cover ${shapeClass} ${borderClass}`}
                forcePlaceholder={!showPhoto}
            />
        );
    };

    // Dynamic Title Font Sizing without ellipsis
    const yayasanLength = (settings.namaYayasan || '').length;
    const ponpesLength = (settings.namaPonpes || '').length;
    const classicYayasanSize = yayasanLength > 35 ? 'text-[5.5pt]' : yayasanLength > 22 ? 'text-[6.2pt]' : 'text-[7pt]';
    const classicPonpesSize = ponpesLength > 35 ? 'text-[6.8pt]' : ponpesLength > 22 ? 'text-[7.8pt]' : 'text-[9pt]';
    const modernPonpesSize = ponpesLength > 35 ? 'text-[7pt]' : ponpesLength > 22 ? 'text-[8pt]' : 'text-[9pt]';
    const verticalPonpesSize = ponpesLength > 35 ? 'text-[6.5pt]' : ponpesLength > 22 ? 'text-[7.2pt]' : 'text-[8pt]';
    const darkPonpesSize = ponpesLength > 35 ? 'text-[6pt]' : ponpesLength > 22 ? 'text-[6.5pt]' : 'text-[7pt]';
    const ceriaPonpesSize = ponpesLength > 35 ? 'text-[6.8pt]' : ponpesLength > 22 ? 'text-[7.5pt]' : 'text-[8pt]';

    // --- Design 1: Classic Traditional ---
    if (cardDesign === 'classic') {
        return (
            <div className="rounded-xl overflow-hidden relative flex flex-col text-white border-4 border-double border-[#D4AF37]" 
                 style={{ ...cardStyle, backgroundColor: '#1B4D3E', borderColor: '#D4AF37', printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' } as any}>
                <div className="flex justify-between items-center px-2 py-1.5 border-b border-[#D4AF37]/30 bg-black/20 h-1/4">
                    {/* Left Logo (Yayasan) */}
                    <div className="w-10 h-full flex items-center justify-center">
                        {settings.logoYayasanUrl && <img src={settings.logoYayasanUrl} alt="Logo Yayasan" className="max-h-full max-w-full object-contain" referrerPolicy="no-referrer" />}
                    </div>
                    <div className="text-center flex-grow px-1">
                        <div className={`${classicYayasanSize} font-bold uppercase tracking-wider text-[#D4AF37] leading-tight break-words`}>{settings.namaYayasan}</div>
                        <div className={`${classicPonpesSize} font-bold leading-tight break-words`}>{settings.namaPonpes}</div>
                    </div>
                    {/* Right Logo (Ponpes) */}
                    <div className="w-10 h-full flex items-center justify-center">
                        {settings.logoPonpesUrl && <img src={settings.logoPonpesUrl} alt="Logo Ponpes" className="max-h-full max-w-full object-contain" referrerPolicy="no-referrer" />}
                    </div>
                </div>
                
                <div className="flex p-2 gap-2 flex-grow relative overflow-hidden">
                    <div className="flex flex-col items-center justify-center h-full">
                        {renderSantriPhotoOrQR({
                            variant: 'classic',
                            shapeClass: 'rounded-sm',
                            widthClass: 'w-[2cm]',
                            heightClass: 'h-[2.5cm]',
                            borderClass: 'border-2 border-[#D4AF37] shadow-lg bg-[#f0fdf4]',
                            qrSize: 20,
                            qrOnlySize: 48,
                            qrPositionClass: 'bottom-0.5 right-0.5'
                        })}
                    </div>
                    <div className="flex-grow text-[7pt] space-y-0.5 z-10 flex flex-col justify-center">
                        {showNama && <div className="font-bold text-[#D4AF37] border-b border-[#D4AF37]/30 pb-0.5 mb-1" style={getSmartNamaStyle(nama, 9.8)}>{nama}</div>}
                        {showNamaHijrah && Boolean(namaHijrah) && <div className="grid grid-cols-[42px_1fr]" style={getSmartFieldStyle(namaHijrah, 6.5)}><span>Hijrah</span><span>: {namaHijrah}</span></div>}
                        {showNis && <div className="grid grid-cols-[42px_1fr]" style={getSmartFieldStyle(nis, 6.8)}><span>NIS</span><span style={getSmartNisStyle(nis, 6.8)}>: {nis}</span></div>}
                        {showNisn && Boolean(nisn) && <div className="grid grid-cols-[42px_1fr]" style={getSmartFieldStyle(nisn, 6.5)}><span>NISN</span><span>: {nisn}</span></div>}
                        {showNik && Boolean(nik) && <div className="grid grid-cols-[42px_1fr]" style={getSmartFieldStyle(nik, 6.5)}><span>NIK</span><span>: {nik}</span></div>}
                        {showJenjang && <div className="grid grid-cols-[42px_1fr]" style={getSmartFieldStyle(jenjangDisplay, 6.8)}><span>Jenjang</span><span>: {jenjangDisplay}</span></div>}
                        {showKelas && <div className="grid grid-cols-[42px_1fr]" style={getSmartFieldStyle(kelasNama, 6.8)}><span>Kelas</span><span>: {kelasNama}</span></div>}
                        {showRombel && <div className="grid grid-cols-[42px_1fr]" style={getSmartFieldStyle(rombelNama, 6.8)}><span>Rombel</span><span>: {rombelNama}</span></div>}
                        {showAsrama && <div className="grid grid-cols-[42px_1fr]" style={getSmartFieldStyle(asramaText, 6.5)}><span>Asrama</span><span>: {asramaText}</span></div>}
                        {showTtl && <div className="grid grid-cols-[42px_1fr]" style={getSmartFieldStyle(ttl, 6.8)}><span>TTL</span><span>: {ttl}</span></div>}
                        {showGolDarah && Boolean(santri.golonganDarah) && <div className="grid grid-cols-[42px_1fr]" style={getSmartFieldStyle(golonganDarah, 6.5)}><span>Darah</span><span>: {golonganDarah}</span></div>}
                        {showJenisSantri && <div className="grid grid-cols-[42px_1fr]" style={getSmartFieldStyle(jenisSantri, 6.5)}><span>Status</span><span>: {jenisSantri}</span></div>}
                        {showAyahWali && <div className="grid grid-cols-[42px_1fr]" style={getSmartFieldStyle(ayahWali, 6.8)}><span>Wali</span><span>: {ayahWali}</span></div>}
                        {showTeleponWali && Boolean(teleponWali !== '-') && <div className="grid grid-cols-[42px_1fr]" style={getSmartFieldStyle(teleponWali, 6.5)}><span>Kontak</span><span>: {teleponWali}</span></div>}
                        {showTahunMasuk && <div className="grid grid-cols-[42px_1fr]" style={getSmartFieldStyle(tahunMasuk, 6.5)}><span>Angkatan</span><span>: {tahunMasuk}</span></div>}
                        {showAlamat && <div className="grid grid-cols-[42px_1fr] items-start" style={getSmartAlamatStyle(alamat, 6.3)}><span>Alamat</span><span>: {alamat}</span></div>}
                    </div>
                    
                    {/* Pattern Overlay */}
                    <div className="absolute right-[-20px] bottom-[-20px] text-[#D4AF37] opacity-10 text-[80pt] pointer-events-none">
                        <i className="bi bi-stars"></i>
                    </div>
                </div>

                {validityText && (
                    <div className="bg-[#D4AF37] text-[#1B4D3E] text-[5pt] text-center py-0.5 font-bold h-[12px]">
                        {validityText}
                    </div>
                )}
            </div>
        );
    } 
    
    // --- Design 2: Modern Tech ---
    else if (cardDesign === 'modern') {
        return (
            <div className="rounded-lg overflow-hidden relative flex flex-col bg-white text-gray-800 border border-gray-200 shadow-sm" 
                 style={{ ...cardStyle, printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' } as any}>
                {/* Background Decor (Optimized for exports) */}
                <div className="absolute inset-0 z-0" style={{ 
                    background: 'linear-gradient(110deg, #2563eb 0%, #2563eb 38%, transparent 38.2%)' 
                }}></div>
                <div className="absolute inset-0 z-0" style={{ 
                    background: 'linear-gradient(110deg, rgba(59, 130, 246, 0.5) 0%, rgba(59, 130, 246, 0.5) 42%, transparent 42.2%)' 
                }}></div>
                
                {/* Header Section (Moved to Top) */}
                <div className="bg-blue-600/10 p-1.5 border-b border-blue-100 text-center z-10 relative">
                     <div className="text-[5.8pt] font-light text-gray-500 uppercase tracking-widest leading-tight">{settings.namaYayasan}</div>
                     <div className={`${modernPonpesSize} font-bold text-blue-900 leading-tight mt-0.5 break-words`}>{settings.namaPonpes}</div>
                </div>

                {/* Body Section: Photo and Data */}
                <div className="flex justify-between items-start p-3 z-10 relative flex-grow overflow-hidden">
                    <div className="text-white mt-1">
                        {renderSantriPhotoOrQR({
                            variant: 'modern',
                            shapeClass: 'rounded-full',
                            widthClass: 'w-[1.8cm]',
                            heightClass: 'h-[1.8cm]',
                            borderClass: 'border-4 border-white shadow-md bg-white',
                            qrSize: 18,
                            qrOnlySize: 42,
                            qrPositionClass: 'bottom-0 right-0'
                        })}
                    </div>
                    <div className="text-right flex-grow pl-2 pt-1 flex flex-col items-end">
                        <div className="text-[6pt] text-gray-400 tracking-[0.2em] uppercase mb-1">Kartu Tanda Santri</div>
                        {showNama && <div className="font-bold text-blue-900 leading-tight" style={getSmartNamaStyle(nama, 9.5)}>{nama}</div>}
                        {showNis && <div className="font-mono text-blue-600 bg-blue-50 inline-block px-1 rounded mt-1" style={getSmartNisStyle(nis, 7.8)}>{nis}</div>}
                        
                        <div className="mt-1 text-[6.5pt] space-y-0.5 text-gray-600">
                            {showNamaHijrah && Boolean(namaHijrah) && <div className="flex justify-end gap-1" style={getSmartFieldStyle(namaHijrah, 6.5)}><span className="font-semibold">Hijrah:</span> <span>{namaHijrah}</span></div>}
                            {showNisn && Boolean(nisn) && <div className="flex justify-end gap-1" style={getSmartFieldStyle(nisn, 6.5)}><span className="font-semibold">NISN:</span> <span>{nisn}</span></div>}
                            {showNik && Boolean(nik) && <div className="flex justify-end gap-1" style={getSmartFieldStyle(nik, 6.5)}><span className="font-semibold">NIK:</span> <span>{nik}</span></div>}
                            {showJenjang && <div className="flex justify-end gap-1" style={getSmartFieldStyle(jenjangDisplay, 6.5)}><span className="font-semibold">Jenjang:</span> <span>{jenjangDisplay}</span></div>}
                            {showKelas && <div className="flex justify-end gap-1" style={getSmartFieldStyle(kelasNama, 6.5)}><span className="font-semibold">Kelas:</span> <span>{kelasNama}</span></div>}
                            {showRombel && <div className="flex justify-end gap-1" style={getSmartFieldStyle(rombelNama, 6.5)}><span className="font-semibold">Rombel:</span> <span>{rombelNama}</span></div>}
                            {showAsrama && <div className="flex justify-end gap-1" style={getSmartFieldStyle(asramaText, 6.2)}><span className="font-semibold">Asrama:</span> <span>{asramaText}</span></div>}
                            {showTtl && <div className="flex justify-end gap-1" style={getSmartFieldStyle(ttl, 6.5)}><span className="font-semibold">Lahir:</span> <span>{ttl}</span></div>}
                            {showGolDarah && Boolean(santri.golonganDarah) && <div className="flex justify-end gap-1" style={getSmartFieldStyle(golonganDarah, 6.5)}><span className="font-semibold">Darah:</span> <span>{golonganDarah}</span></div>}
                            {showJenisSantri && <div className="flex justify-end gap-1" style={getSmartFieldStyle(jenisSantri, 6.2)}><span className="font-semibold">Status:</span> <span>{jenisSantri}</span></div>}
                            {showAyahWali && <div className="flex justify-end gap-1" style={getSmartFieldStyle(ayahWali, 6.5)}><span className="font-semibold">Wali:</span> <span>{ayahWali}</span></div>}
                            {showTeleponWali && Boolean(teleponWali !== '-') && <div className="flex justify-end gap-1" style={getSmartFieldStyle(teleponWali, 6.2)}><span className="font-semibold">Kontak:</span> <span>{teleponWali}</span></div>}
                            {showTahunMasuk && <div className="flex justify-end gap-1" style={getSmartFieldStyle(tahunMasuk, 6.2)}><span className="font-semibold">Angkatan:</span> <span>{tahunMasuk}</span></div>}
                            {showAlamat && <div className="flex justify-end gap-1 text-right items-start" style={getSmartAlamatStyle(alamat, 6.0)}><span className="font-semibold shrink-0">Alamat:</span> <span>{alamat}</span></div>}
                        </div>
                    </div>
                </div>
                
                {/* Footer: Validity Only */}
                {validityText && (
                    <div className="mt-auto bg-gray-50 px-3 py-1 border-t z-10 relative flex flex-col items-center justify-center text-center">
                        <div className="text-[6pt] text-gray-500">
                            {validityText}
                        </div>
                    </div>
                )}
            </div>
        );
    } 
    
    // --- Design 3: Vertical ID ---
    else if (cardDesign === 'vertical') {
        return (
            <div className="rounded-lg overflow-hidden relative flex flex-col bg-white text-gray-800 border shadow-sm items-center text-center" 
                 style={{ ...cardStyle, printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' } as any}>
                <div className="w-[150%] h-24 bg-red-700 absolute top-0 left-[-25%] rounded-b-[50%] z-0"></div>
                
                <div className="z-10 mt-3 text-white px-2">
                    <div className="text-[5.5pt] opacity-80 uppercase tracking-widest">KARTU SANTRI</div>
                    <div className={`${verticalPonpesSize} font-bold mt-0.5 leading-tight break-words`}>{settings.namaPonpes}</div>
                </div>

                <div className="z-10 mt-3 relative">
                    {renderSantriPhotoOrQR({
                        variant: 'vertical',
                        shapeClass: 'rounded-lg',
                        widthClass: 'w-[2.2cm]',
                        heightClass: 'h-[2.8cm]',
                        borderClass: 'border-2 border-white shadow-lg bg-gray-100',
                        qrSize: 20,
                        qrOnlySize: 52,
                        qrPositionClass: 'bottom-0.5 right-0.5'
                    })}
                </div>

                <div className="z-10 mt-4 px-2 w-full flex-grow flex flex-col items-center overflow-hidden">
                    {showNama && <div className="font-bold text-gray-800 leading-tight" style={getSmartNamaStyle(nama, 8.8)}>{nama}</div>}
                    {showNis && <div className="text-red-600 font-medium mt-0.5 mb-2" style={getSmartNisStyle(nis, 7.0)}>{nis}</div>}
                    
                    <div className="w-full border-t border-gray-200 my-1"></div>
                    
                    <div className="text-[6.5pt] text-gray-600 space-y-0.5 w-full text-left px-2">
                        {showNamaHijrah && Boolean(namaHijrah) && <div className="grid grid-cols-[45px_1fr]" style={getSmartFieldStyle(namaHijrah, 6.2)}><span className="text-gray-400">Hijrah</span><span>: {namaHijrah}</span></div>}
                        {showNisn && Boolean(nisn) && <div className="grid grid-cols-[45px_1fr]" style={getSmartFieldStyle(nisn, 6.2)}><span className="text-gray-400">NISN</span><span>: {nisn}</span></div>}
                        {showNik && Boolean(nik) && <div className="grid grid-cols-[45px_1fr]" style={getSmartFieldStyle(nik, 6.2)}><span className="text-gray-400">NIK</span><span>: {nik}</span></div>}
                        {showJenjang && <div className="grid grid-cols-[45px_1fr]" style={getSmartFieldStyle(jenjangDisplay, 6.5)}><span className="text-gray-400">Jenjang</span><span>: {jenjangDisplay}</span></div>}
                        {showKelas && <div className="grid grid-cols-[45px_1fr]" style={getSmartFieldStyle(kelasNama, 6.5)}><span className="text-gray-400">Kelas</span><span>: {kelasNama}</span></div>}
                        {showRombel && <div className="grid grid-cols-[45px_1fr]" style={getSmartFieldStyle(rombelNama, 6.5)}><span className="text-gray-400">Rombel</span><span>: {rombelNama}</span></div>}
                        {showAsrama && <div className="grid grid-cols-[45px_1fr]" style={getSmartFieldStyle(asramaText, 6.2)}><span className="text-gray-400">Asrama</span><span>: {asramaText}</span></div>}
                        {showTtl && <div className="grid grid-cols-[45px_1fr]" style={getSmartFieldStyle(ttl, 6.2)}><span className="text-gray-400">TTL</span><span>: {ttl}</span></div>}
                        {showGolDarah && Boolean(santri.golonganDarah) && <div className="grid grid-cols-[45px_1fr]" style={getSmartFieldStyle(golonganDarah, 6.2)}><span className="text-gray-400">Darah</span><span>: {golonganDarah}</span></div>}
                        {showJenisSantri && <div className="grid grid-cols-[45px_1fr]" style={getSmartFieldStyle(jenisSantri, 6.2)}><span className="text-gray-400">Status</span><span>: {jenisSantri}</span></div>}
                        {showAyahWali && <div className="grid grid-cols-[45px_1fr]" style={getSmartFieldStyle(ayahWali, 6.5)}><span className="text-gray-400">Wali</span><span>: {ayahWali}</span></div>}
                        {showTeleponWali && Boolean(teleponWali !== '-') && <div className="grid grid-cols-[45px_1fr]" style={getSmartFieldStyle(teleponWali, 6.2)}><span className="text-gray-400">Kontak</span><span>: {teleponWali}</span></div>}
                        {showTahunMasuk && <div className="grid grid-cols-[45px_1fr]" style={getSmartFieldStyle(tahunMasuk, 6.2)}><span className="text-gray-400">Angkatan</span><span>: {tahunMasuk}</span></div>}
                        {showAlamat && <div className="grid grid-cols-[45px_1fr] text-left border-t border-gray-100 pt-0.5 mt-0.5" style={getSmartAlamatStyle(alamat, 5.8)}><span className="text-gray-400">Alamat</span><span>: {alamat}</span></div>}
                    </div>
                </div>
                
                {validityText && (
                    <div className="w-full bg-gray-800 text-white text-[5pt] py-1 absolute bottom-0">
                        {validityText}
                    </div>
                )}
            </div>
        );
    } 
    
    // --- Design 4: Dark Premium ---
    else if (cardDesign === 'dark') {
        return (
            <div className="rounded-xl overflow-hidden relative flex flex-col bg-slate-900 text-white border border-slate-700" 
                 style={{ ...cardStyle, printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' } as any}>
                <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500 rounded-full blur-[40px] opacity-20 -mr-10 -mt-10"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-500 rounded-full blur-[30px] opacity-20 -ml-8 -mb-8"></div>

                <div className="flex items-center justify-between p-3 border-b border-slate-800 z-10">
                    <div className="flex items-center gap-2">
                        {settings.logoPonpesUrl && (
                            <div className="w-8 h-8 flex items-center justify-center">
                                <img src={settings.logoPonpesUrl} alt="Logo" className="max-h-full max-w-full object-contain" referrerPolicy="no-referrer" />
                            </div>
                        )}
                        <div>
                            <div className="text-[7.5pt] font-normal text-teal-400">Kartu Santri</div>
                            <div className={`${darkPonpesSize} font-bold tracking-wide uppercase leading-tight break-words`}>{settings.namaPonpes}</div>
                        </div>
                    </div>
                </div>

                <div className="flex p-3 gap-3 z-10 flex-grow overflow-hidden">
                    <div className="flex flex-col gap-2">
                        {renderSantriPhotoOrQR({
                            variant: 'dark',
                            shapeClass: 'rounded-lg',
                            widthClass: 'w-[2cm]',
                            heightClass: 'h-[2cm]',
                            borderClass: 'border border-slate-600 bg-slate-800',
                            qrSize: 20,
                            qrOnlySize: 46,
                            qrPositionClass: 'bottom-0.5 right-0.5'
                        })}
                        <div className="text-center">
                            {showNis && <div className="font-mono font-bold text-teal-400" style={getSmartNisStyle(nis, 8.5)}>{nis}</div>}
                            <div className="text-[5pt] text-slate-500 uppercase tracking-widest">Nomor Induk</div>
                        </div>
                    </div>
                    <div className="flex-grow space-y-1">
                        {showNama && (
                            <div className="mb-2">
                                <div className="text-[5pt] text-slate-500 uppercase">Nama Lengkap</div>
                                <div className="font-bold leading-tight" style={getSmartNamaStyle(nama, 8.5)}>{nama}</div>
                            </div>
                        )}
                        
                        <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[6.5pt]">
                            {showJenjang && <div><div className="text-[5pt] text-slate-500 uppercase">Jenjang</div><div style={getSmartFieldStyle(jenjangDisplay, 6.5)}>{jenjangDisplay}</div></div>}
                            {showKelas && <div><div className="text-[5pt] text-slate-500 uppercase">Kelas</div><div style={getSmartFieldStyle(kelasNama, 6.5)}>{kelasNama}</div></div>}
                            {showRombel && <div><div className="text-[5pt] text-slate-500 uppercase">Rombel</div><div style={getSmartFieldStyle(rombelNama, 6.5)}>{rombelNama}</div></div>}
                            {showAsrama && <div><div className="text-[5pt] text-slate-500 uppercase">Asrama</div><div style={getSmartFieldStyle(asramaText, 6.2)}>{asramaText}</div></div>}
                            {showNisn && Boolean(nisn) && <div><div className="text-[5pt] text-slate-500 uppercase">NISN</div><div style={getSmartFieldStyle(nisn, 6.5)}>{nisn}</div></div>}
                            {showNik && Boolean(nik) && <div><div className="text-[5pt] text-slate-500 uppercase">NIK</div><div style={getSmartFieldStyle(nik, 6.5)}>{nik}</div></div>}
                            {showNamaHijrah && Boolean(namaHijrah) && <div><div className="text-[5pt] text-slate-500 uppercase">Hijrah</div><div style={getSmartFieldStyle(namaHijrah, 6.5)}>{namaHijrah}</div></div>}
                            {showTtl && <div><div className="text-[5pt] text-slate-500 uppercase">TTL</div><div style={getSmartFieldStyle(ttl, 6.2)}>{ttl}</div></div>}
                            {showGolDarah && Boolean(santri.golonganDarah) && <div><div className="text-[5pt] text-slate-500 uppercase">Gol. Darah</div><div style={getSmartFieldStyle(golonganDarah, 6.5)}>{golonganDarah}</div></div>}
                            {showJenisSantri && <div><div className="text-[5pt] text-slate-500 uppercase">Status</div><div style={getSmartFieldStyle(jenisSantri, 6.2)}>{jenisSantri}</div></div>}
                            {showAyahWali && <div><div className="text-[5pt] text-slate-500 uppercase">Wali</div><div style={getSmartFieldStyle(ayahWali, 6.5)}>{ayahWali}</div></div>}
                            {showTeleponWali && Boolean(teleponWali !== '-') && <div><div className="text-[5pt] text-slate-500 uppercase">Kontak</div><div style={getSmartFieldStyle(teleponWali, 6.2)}>{teleponWali}</div></div>}
                            {showTahunMasuk && <div><div className="text-[5pt] text-slate-500 uppercase">Angkatan</div><div style={getSmartFieldStyle(tahunMasuk, 6.2)}>{tahunMasuk}</div></div>}
                        </div>
                        {showAlamat && (
                            <div className="mt-1 pt-1 border-t border-slate-800">
                                <div className="text-[5pt] text-slate-500 uppercase">Alamat</div>
                                <div className="text-slate-300" style={getSmartAlamatStyle(alamat, 6.0)}>{alamat}</div>
                            </div>
                        )}
                    </div>
                </div>

                {validityText && (
                    <div className="px-3 pb-2 z-10 flex justify-between items-end">
                        <div className="text-[5pt] text-slate-500 w-full text-center">{validityText}</div>
                    </div>
                )}
            </div>
        );
    } 
    
    // --- Design 5: Ceria / TPQ ---
    else if (cardDesign === 'ceria') {
        return (
            <div className="rounded-2xl overflow-hidden relative flex flex-col bg-orange-50 text-orange-900 border-2 border-orange-200" style={cardStyle}>
                <div className="bg-orange-400 p-2 text-center text-white relative overflow-hidden">
                    <div className="absolute w-4 h-4 bg-white rounded-full opacity-20 top-1 left-2"></div>
                    <div className="absolute w-6 h-6 bg-white rounded-full opacity-20 bottom-[-10px] right-4"></div>
                    <div className="text-[7.5pt] font-normal mb-0.5 relative z-10">Kartu Santri</div>
                    <div className={`${ceriaPonpesSize} font-bold relative z-10 leading-tight break-words`}>{settings.namaPonpes}</div>
                </div>

                <div className="flex p-2 gap-3 items-start flex-grow pl-4 overflow-hidden">
                    <div className="relative mt-1">
                        <div className="absolute inset-0 bg-teal-400 rounded-full transform translate-x-1 translate-y-1"></div>
                        <div className="relative z-10">
                            {renderSantriPhotoOrQR({
                                variant: 'ceria',
                                shapeClass: 'rounded-full',
                                widthClass: 'w-[2cm]',
                                heightClass: 'h-[2cm]',
                                borderClass: 'border-2 border-white bg-teal-200',
                                qrSize: 18,
                                qrOnlySize: 44,
                                qrPositionClass: 'bottom-0 right-0'
                            })}
                        </div>
                    </div>
                    
                    <div className="flex-grow pl-2 z-10 relative">
                         {showNama && (
                            <div className="mb-2 border-b border-orange-200 pb-1">
                                <div className="text-[5pt] text-orange-400 uppercase tracking-wide">Nama Lengkap</div>
                                <div className="font-bold text-teal-800 leading-tight" style={getSmartNamaStyle(nama, 8.8)}>{nama}</div>
                            </div>
                        )}
                        
                        <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[6.5pt]">
                             {/* NIS */}
                             {showNis && <div><div className="text-[5pt] text-orange-400 uppercase">NIS</div><div className="font-mono text-orange-700 bg-white/50 inline-block px-1 rounded font-bold" style={getSmartNisStyle(nis, 6.8)}>{nis}</div></div>}
                             {showNisn && Boolean(nisn) && <div><div className="text-[5pt] text-orange-400 uppercase">NISN</div><div className="text-teal-700 font-bold" style={getSmartFieldStyle(nisn, 6.5)}>{nisn}</div></div>}
                             {showNik && Boolean(nik) && <div><div className="text-[5pt] text-orange-400 uppercase">NIK</div><div className="text-teal-700 font-bold" style={getSmartFieldStyle(nik, 6.5)}>{nik}</div></div>}
                             {showNamaHijrah && Boolean(namaHijrah) && <div><div className="text-[5pt] text-orange-400 uppercase">Hijrah</div><div className="text-teal-700 font-bold" style={getSmartFieldStyle(namaHijrah, 6.5)}>{namaHijrah}</div></div>}
                             
                             {/* Jenjang */}
                             {showJenjang && <div><div className="text-[5pt] text-orange-400 uppercase">Jenjang</div><div className="text-teal-700 font-bold leading-tight" style={getSmartFieldStyle(jenjangDisplay, 6.5)}>{jenjangDisplay}</div></div>}
                             
                             {/* Kelas */}
                             {showKelas && <div><div className="text-[5pt] text-orange-400 uppercase">Kelas</div><div className="text-teal-700 font-bold leading-tight" style={getSmartFieldStyle(kelasNama, 6.5)}>{kelasNama}</div></div>}
                             
                             {/* Rombel */}
                             {showRombel && <div><div className="text-[5pt] text-orange-400 uppercase">Rombel</div><div className="text-teal-700 font-bold leading-tight" style={getSmartFieldStyle(rombelNama, 6.5)}>{rombelNama}</div></div>}
                             
                             {/* Asrama */}
                             {showAsrama && <div><div className="text-[5pt] text-orange-400 uppercase">Asrama</div><div className="text-teal-700 font-bold leading-tight" style={getSmartFieldStyle(asramaText, 6.2)}>{asramaText}</div></div>}

                             {/* TTL */}
                             {showTtl && <div><div className="text-[5pt] text-orange-400 uppercase">TTL</div><div className="text-teal-700 font-bold" style={getSmartFieldStyle(ttl, 6.2)}>{ttl}</div></div>}

                             {/* Golongan Darah */}
                             {showGolDarah && Boolean(santri.golonganDarah) && <div><div className="text-[5pt] text-orange-400 uppercase">Gol. Darah</div><div className="text-teal-700 font-bold" style={getSmartFieldStyle(golonganDarah, 6.5)}>{golonganDarah}</div></div>}

                             {/* Status */}
                             {showJenisSantri && <div><div className="text-[5pt] text-orange-400 uppercase">Status</div><div className="text-teal-700 font-bold" style={getSmartFieldStyle(jenisSantri, 6.2)}>{jenisSantri}</div></div>}
                             
                             {/* Wali */}
                             {showAyahWali && <div><div className="text-[5pt] text-orange-400 uppercase">Wali</div><div className="text-teal-700 font-bold" style={getSmartFieldStyle(ayahWali, 6.5)}>{ayahWali}</div></div>}

                             {/* Kontak */}
                             {showTeleponWali && Boolean(teleponWali !== '-') && <div><div className="text-[5pt] text-orange-400 uppercase">Kontak</div><div className="text-teal-700 font-bold" style={getSmartFieldStyle(teleponWali, 6.2)}>{teleponWali}</div></div>}

                             {/* Angkatan */}
                             {showTahunMasuk && <div><div className="text-[5pt] text-orange-400 uppercase">Angkatan</div><div className="text-teal-700 font-bold" style={getSmartFieldStyle(tahunMasuk, 6.2)}>{tahunMasuk}</div></div>}

                             {/* Alamat */}
                             {showAlamat && <div className="col-span-2"><div className="text-[5pt] text-orange-400 uppercase">Alamat</div><div className="text-teal-800" style={getSmartAlamatStyle(alamat, 6.0)}>{alamat}</div></div>}
                        </div>
                    </div>
                </div>

                {validityText && (
                    <div className="bg-teal-50 px-3 py-1 flex justify-center items-center text-[6pt] text-teal-700 border-t border-orange-100">
                        <div>{validityText}</div>
                    </div>
                )}
            </div>
        );
    }
    
    // Fallback to Classic
    return (
        <div className="rounded-xl overflow-hidden relative flex flex-col text-white border-4 border-double border-[#D4AF37]" 
                style={{ ...cardStyle, backgroundColor: '#1B4D3E', borderColor: '#D4AF37' }}>
            <div className="flex justify-between items-center px-2 py-1.5 border-b border-[#D4AF37]/30 bg-black/20 h-1/4">
                <div className="w-10 h-full flex items-center justify-center">
                    {settings.logoYayasanUrl && <img src={settings.logoYayasanUrl} alt="Logo" className="max-h-full max-w-full object-contain" />}
                </div>
                <div className="text-center flex-grow">
                    <div className={`${classicYayasanSize} font-bold uppercase tracking-wider text-[#D4AF37] leading-tight break-words`}>{settings.namaYayasan}</div>
                    <div className={`${classicPonpesSize} font-bold leading-tight break-words`}>{settings.namaPonpes}</div>
                </div>
                <div className="w-10 h-full flex items-center justify-center">
                    {settings.logoPonpesUrl && <img src={settings.logoPonpesUrl} alt="Logo" className="max-h-full max-w-full object-contain" />}
                </div>
            </div>
            <div className="flex p-2 gap-2 flex-grow relative overflow-hidden">
                <div className="flex flex-col items-center justify-center h-full">
                    {renderSantriPhotoOrQR({
                        variant: 'classic',
                        shapeClass: 'rounded-sm',
                        widthClass: 'w-[2cm]',
                        heightClass: 'h-[2.5cm]',
                        borderClass: 'border-2 border-[#D4AF37] shadow-lg bg-[#f0fdf4]',
                        qrSize: 20,
                        qrOnlySize: 48,
                        qrPositionClass: 'bottom-0.5 right-0.5'
                    })}
                </div>
                <div className="flex-grow text-[7pt] space-y-0.5 z-10 flex flex-col justify-center">
                    {showNama && <div className="font-bold text-[#D4AF37] border-b border-[#D4AF37]/30 pb-0.5 mb-1" style={getSmartNamaStyle(nama, 9.8)}>{nama}</div>}
                    {showNis && <div className="grid grid-cols-[35px_1fr]" style={getSmartFieldStyle(nis, 6.8)}><span>NIS</span><span style={getSmartNisStyle(nis, 6.8)}>: {nis}</span></div>}
                    {showJenjang && <div className="grid grid-cols-[35px_1fr]" style={getSmartFieldStyle(jenjangDisplay, 6.8)}><span>Jenjang</span><span>: {jenjangDisplay}</span></div>}
                    {showRombel && <div className="grid grid-cols-[35px_1fr]" style={getSmartFieldStyle(rombelNama, 6.8)}><span>Rombel</span><span>: {rombelNama}</span></div>}
                    {showAyahWali && <div className="grid grid-cols-[35px_1fr]" style={getSmartFieldStyle(ayahWali, 6.8)}><span>Wali</span><span>: {ayahWali}</span></div>}
                    {showAlamat && <div className="grid grid-cols-[35px_1fr] items-start" style={getSmartAlamatStyle(alamat, 6.5)}><span>Alamat</span><span>: {alamat}</span></div>}
                </div>
            </div>
            {validityText && (
                <div className="bg-[#D4AF37] text-[#1B4D3E] text-[5pt] text-center py-0.5 font-bold h-[12px]">
                    {validityText}
                </div>
            )}
        </div>
    );
};

const KartuSantriBackTemplate: React.FC<{ santri?: Santri; settings: PondokSettings; options: any }> = ({ settings, options }) => {
    const { 
        cardDesign = 'classic', 
        cardWidth = 8.56, 
        cardHeight = 5.4, 
        cardRules, 
        cardRulesFontSize = 'auto',
        cardRulesCustomColor = '',
        cardSignatoryTitle, 
        cardSignatoryId,
        cardShowQuote = true,
        cardCustomQuote = '',
    } = options || {};

    // Default quotes per card design
    const defaultDesignQuotes: Record<string, string> = {
        classic: 'Sebaik-baik manusia adalah yang paling bermanfaat bagi orang lain.',
        modern: 'Menuntut ilmu adalah kewajiban bagi setiap muslim.',
        vertical: 'Disiplin dan adab adalah kunci keberkahan ilmu.',
        dark: 'Adab dan akhlak mulia mendahului ketinggian ilmu.',
        ceria: 'Rajin mengaji, santun berbudi, berbakti pada orang tua & guru.',
    };

    const rawQuote = (cardCustomQuote || '').trim() || defaultDesignQuotes[cardDesign] || 'Disiplin & Berakhlakul Karimah';

    const formatQuoteText = (text: string) => {
        const trimmed = text.trim();
        if (!trimmed) return '';
        if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith('“') && trimmed.endsWith('”'))) {
            return trimmed;
        }
        return `"${trimmed}"`;
    };

    const displayQuote = formatQuoteText(rawQuote);
    
    // Replace placeholder with actual name safely
    const finalRulesText = cardRules?.replace(/{NamaPonpes}/gi, settings.namaPonpes || 'Pondok Pesantren') || '';
    const rulesList = finalRulesText.split('\n').filter((r: string) => r.trim() !== '');
    
    // Character count heuristic or user preference for text sizing
    const totalChars = finalRulesText.length;
    let contentTextSize = 'text-[5.5pt]';
    let footerTextSize = 'text-[4.5pt]';
    let headerTextSize = 'text-[6.5pt]';
    
    if (cardRulesFontSize === 'small') {
        contentTextSize = 'text-[4pt]';
        footerTextSize = 'text-[3.8pt]';
        headerTextSize = 'text-[5.2pt]';
    } else if (cardRulesFontSize === 'normal') {
        contentTextSize = 'text-[4.8pt]';
        footerTextSize = 'text-[4.2pt]';
        headerTextSize = 'text-[5.8pt]';
    } else if (cardRulesFontSize === 'large') {
        contentTextSize = 'text-[5.5pt]';
        footerTextSize = 'text-[4.5pt]';
        headerTextSize = 'text-[6.5pt]';
    } else {
        // Auto sizing based on length
        if (totalChars > 350) {
            contentTextSize = 'text-[4pt]';
            footerTextSize = 'text-[3.8pt]';
            headerTextSize = 'text-[5pt]';
        } else if (totalChars > 220) {
            contentTextSize = 'text-[4.8pt]';
            footerTextSize = 'text-[4.2pt]';
            headerTextSize = 'text-[5.8pt]';
        }
    }

    const customTextColorStyle = cardRulesCustomColor ? { color: cardRulesCustomColor } : undefined;

    const signatoryName = cardSignatoryId 
        ? (settings.tenagaPengajar || []).find((p: any) => p.id.toString() === cardSignatoryId)?.nama || 'Pengasuh / Pimpinan' 
        : 'Pengasuh / Pimpinan';

    const cardStyle: React.CSSProperties = {
        width: `${cardWidth}cm`,
        height: `${cardHeight}cm`,
        flexShrink: 0,
        boxSizing: 'border-box',
        printColorAdjust: 'exact',
        WebkitPrintColorAdjust: 'exact'
    } as any;

    // ==========================================
    // DESIGN 1: CLASSIC TRADITIONAL (Hijau & Emas)
    // ==========================================
    if (cardDesign === 'classic') {
        return (
            <div 
                className="rounded-xl overflow-hidden relative flex flex-col text-white border-4 border-double border-[#D4AF37]" 
                style={{ ...cardStyle, backgroundColor: '#1B4D3E', borderColor: '#D4AF37' }}
            >
                {/* Background Watermark Logo */}
                {(settings.logoYayasanUrl || settings.logoPonpesUrl) && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-[0.07] pointer-events-none p-4">
                        <img 
                            src={settings.logoYayasanUrl || settings.logoPonpesUrl} 
                            alt="Watermark Logo" 
                            className="max-w-full max-h-full object-contain filter brightness-200" 
                            referrerPolicy="no-referrer"
                        />
                    </div>
                )}

                {/* Header (Centered) */}
                <div className="flex justify-center items-center px-2.5 py-1 border-b border-[#D4AF37]/30 bg-black/25 shrink-0 z-10 text-center">
                    <div className={`${headerTextSize} font-bold uppercase tracking-wider text-[#D4AF37]`}>
                        Tata Tertib dan Ketentuan Kartu Santri
                    </div>
                </div>

                {/* Content: Rules & Quote */}
                <div 
                    className={`p-2 flex-grow ${contentTextSize} leading-snug relative z-10 flex flex-col justify-between overflow-hidden text-white/90`}
                    style={customTextColorStyle}
                >
                    <ol className="list-decimal pl-3 space-y-0.5">
                        {rulesList.map((rule: string, i: number) => (
                            <li key={i} className="pl-0.5">{rule.trim()}</li>
                        ))}
                    </ol>

                    {cardShowQuote && displayQuote && (
                        <div className="mt-1 pt-0.5 border-t border-[#D4AF37]/20 flex items-center justify-center">
                            <div className="italic text-[#D4AF37]/90 font-serif text-[4.8pt] text-center leading-tight">
                                {displayQuote}
                            </div>
                        </div>
                    )}
                </div>

                {/* Signatory & Footer */}
                <div className={`py-1 px-2.5 border-t border-[#D4AF37]/30 flex justify-between items-end bg-black/25 shrink-0 z-10 ${footerTextSize}`}>
                    <div className="text-white/70 pb-0.5 leading-tight text-[4.2pt]">
                        <div className="text-[#D4AF37] font-semibold">{settings.namaPonpes}</div>
                        <div>Dicetak: {formatDate(new Date().toISOString())}</div>
                        <div className="text-white/50 text-[3.6pt] mt-0.5 tracking-tight font-sans">dibuat dengan eSantri Web by AI Projek | aiprojek01.my.id</div>
                    </div>
                    <div className="text-center min-w-[2.6cm]">
                        <div className="text-[4.5pt] text-[#D4AF37] mb-0.5 leading-none">{cardSignatoryTitle || 'Mengetahui,'}</div>
                        <div className="h-2"></div>
                        <div className="border-b border-[#D4AF37]/70 w-full mb-0.5"></div>
                        <div className="font-bold text-[5pt] text-white leading-none truncate">{signatoryName}</div>
                    </div>
                </div>

                {/* Bottom Gold Strip */}
                <div className="bg-[#D4AF37] text-[#1B4D3E] text-[3.8pt] text-center py-0.2 font-bold tracking-wider uppercase shrink-0">
                    Kartu Tanda Santri Resmi
                </div>
            </div>
        );
    }

    // ==========================================
    // DESIGN 2: MODERN TECH (Biru & Putih Geometris)
    // ==========================================
    else if (cardDesign === 'modern') {
        return (
            <div 
                className="rounded-lg overflow-hidden relative flex flex-col bg-white text-gray-800 border border-blue-200 shadow-sm" 
                style={cardStyle}
            >
                {/* Background Decor matching Modern front */}
                <div className="absolute inset-0 z-0 pointer-events-none" style={{ 
                    background: 'linear-gradient(110deg, #2563eb 0%, #2563eb 8%, transparent 8.2%)' 
                }}></div>
                <div className="absolute inset-0 z-0 pointer-events-none" style={{ 
                    background: 'linear-gradient(110deg, rgba(59, 130, 246, 0.08) 0%, rgba(59, 130, 246, 0.08) 35%, transparent 35.2%)' 
                }}></div>

                {/* Header (Centered) */}
                <div className="bg-blue-600/10 px-2.5 py-1 border-b border-blue-100 flex justify-center items-center z-10 relative shrink-0 text-center">
                    <div className={`${headerTextSize} font-bold text-blue-900 uppercase tracking-wider`}>
                        Tata Tertib dan Ketentuan Kartu Santri
                    </div>
                </div>

                {/* Content: Rules */}
                <div 
                    className={`p-2 flex-grow ${contentTextSize} leading-snug relative z-10 flex flex-col justify-between overflow-hidden text-gray-700`}
                    style={customTextColorStyle}
                >
                    <ol className="list-decimal pl-3 space-y-0.5">
                        {rulesList.map((rule: string, i: number) => (
                            <li key={i} className="pl-0.5">{rule.trim()}</li>
                        ))}
                    </ol>

                    {cardShowQuote && displayQuote && (
                        <div className="mt-1 pt-0.5 border-t border-blue-100 flex items-center justify-center">
                            <div className="italic text-blue-700/80 text-[4.8pt] text-center leading-tight">
                                {displayQuote}
                            </div>
                        </div>
                    )}
                </div>

                {/* Signatory & Footer */}
                <div className={`py-1 px-3 border-t border-blue-100 flex justify-between items-end bg-blue-50/80 shrink-0 z-10 ${footerTextSize}`}>
                    <div className="text-gray-500 pb-0.5 leading-tight text-[4.2pt]">
                        <div className="text-blue-900 font-semibold">{settings.namaPonpes}</div>
                        <div>Dicetak: {formatDate(new Date().toISOString())}</div>
                        <div className="text-gray-400 text-[3.6pt] mt-0.5 tracking-tight font-sans">dibuat dengan eSantri Web by AI Projek | aiprojek01.my.id</div>
                    </div>
                    <div className="text-center min-w-[2.6cm]">
                        <div className="text-[4.5pt] text-blue-800 mb-0.5 leading-none">{cardSignatoryTitle || 'Mengetahui,'}</div>
                        <div className="h-2"></div>
                        <div className="border-b border-blue-300 w-full mb-0.5"></div>
                        <div className="font-bold text-[5pt] text-blue-950 leading-none truncate">{signatoryName}</div>
                    </div>
                </div>
            </div>
        );
    }

    // ==========================================
    // DESIGN 3: VERTICAL ID (Merah & Putih Portrait)
    // ==========================================
    else if (cardDesign === 'vertical') {
        return (
            <div 
                className="rounded-lg overflow-hidden relative flex flex-col bg-white text-gray-800 border border-gray-200 shadow-sm items-center text-center" 
                style={cardStyle}
            >
                {/* Top curved red banner */}
                <div className="w-[140%] h-11 bg-red-700 absolute top-0 left-[-20%] rounded-b-[45%] z-0 shadow-2xs"></div>
                
                {/* Header (Centered) */}
                <div className="z-10 pt-1.5 px-2 text-white shrink-0 w-full text-center">
                    <div className={`${headerTextSize} font-bold uppercase tracking-wider leading-tight text-center`}>
                        Tata Tertib dan Ketentuan Kartu Santri
                    </div>
                </div>

                {/* Content: Positioned safely below the entire red curve with generous margin */}
                <div 
                    className={`z-10 mt-10 px-3.5 w-full flex-grow flex flex-col justify-between overflow-hidden text-left ${contentTextSize} leading-snug text-gray-700`}
                    style={customTextColorStyle}
                >
                    <ol className="list-decimal pl-3 space-y-0.5">
                        {rulesList.map((rule: string, i: number) => (
                            <li key={i} className="pl-0.5">{rule.trim()}</li>
                        ))}
                    </ol>

                    {cardShowQuote && displayQuote && (
                        <div className="mt-1 pt-1 border-t border-gray-100 flex flex-col items-center shrink-0">
                            <div className="italic text-red-700/80 text-[4.5pt] text-center mb-0.5 leading-tight">
                                {displayQuote}
                            </div>
                        </div>
                    )}
                </div>

                {/* Signatory and date */}
                <div className="w-full px-3 py-1 z-10 shrink-0 text-center border-t border-gray-100 bg-gray-50/90">
                    <div className="text-[4.5pt] text-gray-600 mb-0.5 leading-none">{cardSignatoryTitle || 'Mengetahui,'}</div>
                    <div className="border-b border-gray-300 w-24 mx-auto my-0.5"></div>
                    <div className="font-bold text-[5pt] text-gray-900 leading-none truncate">{signatoryName}</div>
                    <div className="text-[3.8pt] text-gray-400 mt-0.5">Dicetak: {formatDate(new Date().toISOString())}</div>
                </div>

                {/* Bottom dark strip with app credit */}
                <div className="w-full bg-gray-800 text-gray-300 text-[3.6pt] py-0.5 shrink-0 uppercase tracking-tight text-center">
                    dibuat dengan eSantri Web by AI Projek | aiprojek01.my.id
                </div>
            </div>
        );
    }

    // ==========================================
    // DESIGN 4: DARK PREMIUM (Slate & Teal Glow)
    // ==========================================
    else if (cardDesign === 'dark') {
        return (
            <div 
                className="rounded-xl overflow-hidden relative flex flex-col bg-slate-900 text-white border border-slate-700" 
                style={cardStyle}
            >
                {/* Ambient glow effects matching Dark front */}
                <div className="absolute top-0 right-0 w-28 h-28 bg-teal-500 rounded-full blur-[35px] opacity-20 -mr-8 -mt-8 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-500 rounded-full blur-[30px] opacity-20 -ml-8 -mb-8 pointer-events-none"></div>

                {/* Header (Centered) */}
                <div className="flex items-center justify-center px-3 py-1 border-b border-slate-800 z-10 shrink-0 bg-slate-950/40 text-center">
                    <div className={`${headerTextSize} font-bold text-teal-400 uppercase tracking-wide`}>
                        Tata Tertib dan Ketentuan Kartu Santri
                    </div>
                </div>

                {/* Content: Rules */}
                <div 
                    className={`p-2 flex-grow ${contentTextSize} leading-snug relative z-10 flex flex-col justify-between overflow-hidden text-slate-300`}
                    style={customTextColorStyle}
                >
                    <ol className="list-decimal pl-3 space-y-0.5">
                        {rulesList.map((rule: string, i: number) => (
                            <li key={i} className="pl-0.5">{rule.trim()}</li>
                        ))}
                    </ol>

                    {cardShowQuote && displayQuote && (
                        <div className="mt-1 pt-0.5 border-t border-slate-800 flex items-center justify-center">
                            <div className="italic text-teal-300/80 font-serif text-[4.8pt] text-center leading-tight">
                                {displayQuote}
                            </div>
                        </div>
                    )}
                </div>

                {/* Signatory & Footer */}
                <div className={`py-1 px-3 border-t border-slate-800 flex justify-between items-end bg-slate-950/80 shrink-0 z-10 ${footerTextSize}`}>
                    <div className="text-slate-400 pb-0.5 leading-tight text-[4.2pt]">
                        <div className="text-teal-400 font-semibold">{settings.namaPonpes}</div>
                        <div>Dicetak: {formatDate(new Date().toISOString())}</div>
                        <div className="text-slate-500 text-[3.6pt] mt-0.5 tracking-tight font-sans">dibuat dengan eSantri Web by AI Projek | aiprojek01.my.id</div>
                    </div>
                    <div className="text-center min-w-[2.6cm]">
                        <div className="text-[4.5pt] text-slate-400 mb-0.5 leading-none">{cardSignatoryTitle || 'Mengetahui,'}</div>
                        <div className="h-2"></div>
                        <div className="border-b border-slate-600 w-full mb-0.5"></div>
                        <div className="font-bold text-[5pt] text-teal-300 leading-none truncate">{signatoryName}</div>
                    </div>
                </div>
            </div>
        );
    }

    // ==========================================
    // DESIGN 5: CERIA / TPQ (Oranye & Tosca Playful)
    // ==========================================
    else if (cardDesign === 'ceria') {
        return (
            <div 
                className="rounded-2xl overflow-hidden relative flex flex-col bg-orange-50 text-orange-950 border-2 border-orange-200" 
                style={cardStyle}
            >
                {/* Header (Centered, clean) */}
                <div className="bg-orange-400 px-2.5 py-1 flex justify-center items-center text-white relative overflow-hidden shrink-0 text-center">
                    <div className="absolute w-3 h-3 bg-white rounded-full opacity-20 top-0.5 left-2"></div>
                    <div className="absolute w-5 h-5 bg-white rounded-full opacity-20 bottom-[-6px] right-3"></div>
                    <div className={`${headerTextSize} font-bold leading-tight uppercase tracking-wider relative z-10`}>
                        Tata Tertib dan Ketentuan Kartu Santri
                    </div>
                </div>

                {/* Content: Rules */}
                <div 
                    className={`p-2 flex-grow ${contentTextSize} leading-snug relative z-10 flex flex-col justify-between overflow-hidden text-teal-900`}
                    style={customTextColorStyle}
                >
                    <ol className="list-decimal pl-3 space-y-0.5">
                        {rulesList.map((rule: string, i: number) => (
                            <li key={i} className="pl-0.5">{rule.trim()}</li>
                        ))}
                    </ol>

                    {cardShowQuote && displayQuote && (
                        <div className="mt-1 pt-0.5 border-t border-orange-200 flex items-center justify-center">
                            <div className="italic text-teal-700 font-medium text-[4.8pt] text-center leading-tight">
                                {displayQuote}
                            </div>
                        </div>
                    )}
                </div>

                {/* Signatory & Footer */}
                <div className={`py-1 px-3 border-t border-orange-200 flex justify-between items-end bg-teal-50 shrink-0 z-10 ${footerTextSize}`}>
                    <div className="text-teal-700/80 pb-0.5 leading-tight text-[4.2pt]">
                        <div className="text-teal-950 font-bold">{settings.namaPonpes}</div>
                        <div>Dicetak: {formatDate(new Date().toISOString())}</div>
                        <div className="text-teal-600/70 text-[3.6pt] mt-0.5 tracking-tight font-sans">dibuat dengan eSantri Web by AI Projek | aiprojek01.my.id</div>
                    </div>
                    <div className="text-center min-w-[2.6cm]">
                        <div className="text-[4.5pt] text-teal-800 mb-0.5 leading-none">{cardSignatoryTitle || 'Mengetahui,'}</div>
                        <div className="h-2"></div>
                        <div className="border-b border-teal-300 w-full mb-0.5"></div>
                        <div className="font-bold text-[5pt] text-teal-950 leading-none truncate">{signatoryName}</div>
                    </div>
                </div>
            </div>
        );
    }

    // Default Fallback to Classic
    return (
        <div 
            className="rounded-xl overflow-hidden relative flex flex-col text-white border-4 border-double border-[#D4AF37]" 
            style={{ ...cardStyle, backgroundColor: '#1B4D3E', borderColor: '#D4AF37' }}
        >
            <div className="text-center px-2 py-1 border-b border-[#D4AF37]/30 bg-black/25">
                <div className={`${headerTextSize} font-bold uppercase tracking-wider text-[#D4AF37]`}>Tata Tertib & Ketentuan</div>
            </div>
            <div className={`p-2 flex-grow ${contentTextSize} leading-snug text-white/90 flex flex-col justify-between`} style={customTextColorStyle}>
                <ol className="list-decimal pl-3 space-y-0.5">
                    {rulesList.map((rule: string, i: number) => (
                        <li key={i}>{rule.trim()}</li>
                    ))}
                </ol>
                {cardShowQuote && displayQuote && (
                    <div className="flex justify-center items-center mt-1 pt-0.5 border-t border-[#D4AF37]/20">
                        <div className="text-[4.5pt] italic text-[#D4AF37] text-center">{displayQuote}</div>
                    </div>
                )}
            </div>
            <div className="py-1 px-2.5 border-t border-[#D4AF37]/30 flex justify-between items-end bg-black/25">
                <div className="text-white/70 text-[4.2pt]">
                    <div>{settings.namaPonpes}</div>
                    <div>Dicetak: {formatDate(new Date().toISOString())}</div>
                    <div className="text-white/50 text-[3.6pt] mt-0.5 tracking-tight font-sans">dibuat dengan eSantri Web by AI Projek | aiprojek01.my.id</div>
                </div>
                <div className="text-center min-w-[2.5cm]">
                    <div className="text-[4.5pt] text-[#D4AF37]">{cardSignatoryTitle || 'Mengetahui,'}</div>
                    <div className="border-b border-[#D4AF37]/70 w-full my-0.5"></div>
                    <div className="font-bold text-[5pt] text-white">{signatoryName}</div>
                </div>
            </div>
        </div>
    );
};

export const generateCardReports = (data: Santri[], settings: PondokSettings, options: any) => {
    const { cardBacksideLayout = 'none' } = options;
    const isSideBySide = cardBacksideLayout === 'side-by-side';
    
    // In side-by-side, the physical unit being printed is twice as wide as 1 card Width (if landscape folding vertical)
    // Wait, usually if card is landscape (width > height), folding side-by-side makes it 2x height (top/bottom fold) OR 2x width (left/right fold).
    // Let's assume left/right fold: total logical width = cardWidth * 2.
    const logicalCardWidth = isSideBySide ? options.cardWidth * 2 : options.cardWidth;

    let sheetOrientation: 'portrait' | 'landscape' = 'portrait';
    if (logicalCardWidth > options.cardHeight) {
        sheetOrientation = 'landscape';
    } else {
        sheetOrientation = 'portrait';
    }

    const paperDimensions = { 'A4': { width: 21.0, height: 29.7 }, 'F4': { width: 21.5, height: 33.0 } };
    const marginValues = { 'narrow': 1.27, 'normal': 2.0, 'wide': 3.0 };
    
    // Default to A4/Normal if not found
    let paperWidth = (paperDimensions[options.paperSize as keyof typeof paperDimensions] || paperDimensions['A4']).width;
    let paperHeight = (paperDimensions[options.paperSize as keyof typeof paperDimensions] || paperDimensions['A4']).height;
    
    const currentMargin = marginValues[options.margin as keyof typeof marginValues] || 2.0;

    // Swap dimensions if paper is landscape
    if (sheetOrientation === 'landscape') {
        const temp = paperWidth;
        paperWidth = paperHeight;
        paperHeight = temp;
    }

    const gapX = 0.5; // cm
    const gapY = 0.8; // cm

    const effectiveWidth = paperWidth - (currentMargin * 2);
    const effectiveHeight = paperHeight - (currentMargin * 2);

    const cols = Math.floor((effectiveWidth + gapX) / (logicalCardWidth + gapX));
    const rows = Math.floor((effectiveHeight + gapY) / (options.cardHeight + gapY));
    
    // Ensure we print at least 1 item per page even if dims are wonky
    const itemsPerPage = Math.max(1, cols * rows);

    const previews = [];

    const renderCardBlock = (santri: Santri, mode: 'front' | 'back' | 'both') => {
        return (
            <div key={`${santri.id}-${mode}`} className={`relative flex ${isSideBySide ? 'flex-row' : ''}`} style={{ breakInside: 'avoid', width: `${logicalCardWidth}cm`, height: `${options.cardHeight}cm` }}>
                {mode === 'front' && <KartuSantriTemplate santri={santri} settings={settings} options={options} />}
                {mode === 'back' && <KartuSantriBackTemplate santri={santri} settings={settings} options={options} />}
                {mode === 'both' && (
                    <>
                        <KartuSantriTemplate santri={santri} settings={settings} options={options} />
                        <KartuSantriBackTemplate santri={santri} settings={settings} options={options} />
                    </>
                )}
                
                {/* Real print cut marks */}
                <div className="absolute -top-[0.2cm] -left-[0.2cm] w-[0.3cm] h-[0.3cm] border-t border-l border-gray-400"></div>
                <div className="absolute -top-[0.2cm] -right-[0.2cm] w-[0.3cm] h-[0.3cm] border-t border-r border-gray-400"></div>
                <div className="absolute -bottom-[0.2cm] -left-[0.2cm] w-[0.3cm] h-[0.3cm] border-b border-l border-gray-400"></div>
                <div className="absolute -bottom-[0.2cm] -right-[0.2cm] w-[0.3cm] h-[0.3cm] border-b border-r border-gray-400"></div>

                {/* Dashboard divider for side-by-side */}
                {isSideBySide && (
                    <div className="absolute inset-y-0 left-1/2 border-l border-dashed border-gray-300 transform -translate-x-1/2 z-20"></div>
                )}
            </div>
        )
    };

    const wrapInPage = (cardsRenderNode: React.ReactNode, keyPrefix: string) => (
        {
            content: (
                <div 
                    key={keyPrefix}
                    className="bg-white print:m-0 mx-auto overflow-hidden flex flex-col items-center" 
                    style={{ 
                        width: `${paperWidth}cm`, 
                        height: `${paperHeight}cm`,
                        padding: `${currentMargin}cm`,
                        boxSizing: 'border-box'
                    }}
                >
                    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignContent: 'flex-start', gap: `${gapY}cm ${gapX}cm`, width: '100%', height: '100%' }}>
                        {cardsRenderNode}
                    </div>
                </div>
            ),
            orientation: sheetOrientation,
            isFullPage: true
        }
    );

    for (let i = 0; i < data.length; i += itemsPerPage) {
        const pageData = data.slice(i, i + itemsPerPage);
        
        if (cardBacksideLayout === 'none') {
            previews.push(wrapInPage(pageData.map(s => renderCardBlock(s, 'front')), `page-front-${i}`));
        } else if (cardBacksideLayout === 'side-by-side') {
            previews.push(wrapInPage(pageData.map(s => renderCardBlock(s, 'both')), `page-both-${i}`));
        } else if (cardBacksideLayout === 'separate') {
            // First page (Front)
            previews.push(wrapInPage(pageData.map(s => renderCardBlock(s, 'front')), `page-sep-front-${i}`));
            
            // Second page (Back)
            // For mirror duplex, we need to reverse the items in each row? 
            // In a simple A4 print, reversing the array makes it roughly match if the printer flips on the long edge.
            // For perfect duplex mirroring in browser: doing array.reverse() per row is ideal.
            // For simplicity, we just render them in standard order and assume the user aligns it or it's non-critical alignment.
            // Actually, reversing the items is best:
            const reversedPageData = [...pageData].reverse();
            previews.push(wrapInPage(reversedPageData.map(s => renderCardBlock(s, 'back')), `page-sep-back-${i}`));
        }
    }
    return previews;
};

// --- LABEL SANTRI ---

export const generateLabelReports = (data: Santri[], settings: PondokSettings, options: any) => {
    const paperDimensions = { 'A4': { width: 21.0, height: 29.7 }, 'F4': { width: 21.5, height: 33.0 } };
    const marginValues = { 'narrow': 1.27, 'normal': 2.0, 'wide': 3.0 };
    
    // Default to A4/Normal if not found
    const currentPaper = paperDimensions[options.paperSize as keyof typeof paperDimensions] || paperDimensions['A4'];
    const currentMargin = marginValues[options.margin as keyof typeof marginValues] || 2.0;

    const effectiveWidth = currentPaper.width - (currentMargin * 2);
    const effectiveHeight = currentPaper.height - (currentMargin * 2);
    const gap = 0.1; 
    const cols = Math.floor((effectiveWidth + gap) / (options.labelWidth + gap));
    const rows = Math.floor((effectiveHeight + gap) / (options.labelHeight + gap));
    const itemsPerPage = Math.max(1, cols * rows);

    const previews = [];
    for (let i = 0; i < data.length; i += itemsPerPage) {
        const pageData = data.slice(i, i + itemsPerPage);
        previews.push({ 
            content: (
                <div 
                    className="bg-white print:m-0 mx-auto overflow-hidden flex flex-col items-start justify-start" 
                    style={{ 
                        width: `${currentPaper.width}cm`, 
                        height: `${currentPaper.height}cm`,
                        padding: `${currentMargin}cm`,
                        boxSizing: 'border-box'
                    }}
                >
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignContent: 'flex-start', gap: `${gap}cm`, width: '100%', height: '100%' }}>
                        {pageData.map(s => {
                            const rombel = settings.rombel.find(r => r.id === s.rombelId)?.nama;
                            const jenjang = settings.jenjang.find(j => j.id === s.jenjangId)?.nama;
                            const fontSizePt = options.labelFontSize || 10;
                            
                            return (
                                <div key={s.id} className="border border-gray-400 border-dashed flex flex-col justify-center items-center text-center overflow-hidden bg-white"
                                        style={{ width: `${options.labelWidth}cm`, height: `${options.labelHeight}cm`, padding: '0.1cm', boxSizing: 'border-box' }}>
                                    {options.labelFields.includes('namaLengkap') && <div className="font-bold leading-tight" style={{ fontSize: `${fontSizePt}pt` }}>{s.namaLengkap}</div>}
                                    {options.labelFields.includes('namaHijrah') && s.namaHijrah && <div className="italic text-gray-600" style={{ fontSize: `${fontSizePt}pt` }}>({s.namaHijrah})</div>}
                                    {options.labelFields.includes('nis') && <div className="font-mono bg-gray-100 px-1 rounded mt-0.5" style={{ fontSize: `${fontSizePt}pt` }}>{s.nis}</div>}
                                    <div className="text-gray-600 mt-0.5 leading-tight" style={{ fontSize: `${Math.max(6, fontSizePt - 2)}pt` }}>
                                        {options.labelFields.includes('jenjang') && <span>{jenjang}</span>}
                                        {options.labelFields.includes('jenjang') && options.labelFields.includes('rombel') && <br/>}
                                        {options.labelFields.includes('rombel') && <span>{rombel}</span>}
                                    </div>
                                    {options.labelFields.includes('ttl') && <div className="text-gray-500 mt-0.5" style={{ fontSize: `${Math.max(6, fontSizePt - 2)}pt` }}>{s.tempatLahir}, {formatDate(s.tanggalLahir)}</div>}
                                    {options.labelFields.includes('alamat') && <div className="text-gray-500 mt-0.5 leading-tight italic" style={{ fontSize: `${Math.max(6, fontSizePt - 2)}pt` }}>{formatAlamat(s.alamat)}</div>}
                                </div>
                            );
                        })}
                    </div>
                </div>
            ), 
            orientation: 'portrait' as const,
            isFullPage: true
        });
    }
    return previews;
};

// --- BUKU INDUK SANTRI (LEMBAR BUKU INDUK RESMI EMIS / KEMENAG) ---
export const BukuIndukSantriTemplate: React.FC<{
    santri: Santri;
    settings: PondokSettings;
    options: any;
}> = ({ santri, settings, options }) => {
    const rombel = settings.rombel.find(r => r.id === santri.rombelId);
    const kelas = rombel ? settings.kelas.find(k => k.id === rombel.kelasId) : undefined;
    const jenjang = kelas ? settings.jenjang.find(j => j.id === kelas.jenjangId) : undefined;
    const gedung = santri.gedungId ? settings.gedungAsrama.find(g => g.id === santri.gedungId) : undefined;
    const kamar = santri.kamarId ? settings.kamar.find(k => k.id === santri.kamarId) : undefined;
    const signatory = settings.tenagaPengajar.find(p => p.id === parseInt(options?.bukuIndukSignatoryId));

    const signatoryTitle = options?.bukuIndukSignatoryTitle || 'Kepala Madrasah / Tata Usaha';
    const signatoryName = signatory ? signatory.nama : (settings.namaMudir || '__________________________');

    return (
        <div className="font-sans text-black flex flex-col h-full justify-between leading-tight p-1" style={{ fontSize: '8.5pt' }}>
            <div>
                {/* Header Dokumen Buku Induk */}
                <div className="flex items-center justify-between pb-2 border-b-2 border-gray-900 mb-2">
                    <div className="w-16 h-16 flex items-center justify-center">
                        {settings.logoYayasanUrl ? (
                            <img src={settings.logoYayasanUrl} alt="Logo" className="max-h-full max-w-full object-contain" referrerPolicy="no-referrer" />
                        ) : settings.logoPonpesUrl ? (
                            <img src={settings.logoPonpesUrl} alt="Logo" className="max-h-full max-w-full object-contain" referrerPolicy="no-referrer" />
                        ) : (
                            <div className="w-14 h-14 rounded border border-black flex items-center justify-center text-sm font-bold">PP</div>
                        )}
                    </div>
                    <div className="text-center flex-1 px-2">
                        <div className="text-[9px] uppercase tracking-widest font-semibold text-gray-600">Dokumen Arsip Pokok Pendidikan Pesantren</div>
                        <h2 className="text-base font-extrabold uppercase tracking-wide">{settings.namaPonpes}</h2>
                        {getKopIdentityLines(settings).length > 0 && (
                            <div className="text-[8.5px] font-semibold text-gray-700">
                                {getKopIdentityLines(settings).join(' | ')}
                            </div>
                        )}
                        <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">LEMBAR BUKU INDUK SANTRI</h3>
                        <p className="text-[9px] text-gray-600">
                            {settings.alamat} {settings.telepon ? `| Telp: ${settings.telepon}` : ''} {settings.email ? `| Email: ${settings.email}` : ''}
                        </p>
                    </div>
                    <div className="w-20 text-right">
                        <div className="border border-gray-800 px-1 py-0.5 rounded text-[8px] font-mono inline-block text-left">
                            <div><strong>NIS :</strong> {santri.nis}</div>
                            <div><strong>NISN:</strong> {santri.nisn || '-'}</div>
                        </div>
                    </div>
                </div>

                {/* Grid Konten Buku Induk */}
                <div className="space-y-2">
                    {/* BAGIAN A: DATA PRIBADI SANTRI */}
                    <div>
                        <div className="bg-gray-800 text-white font-bold px-2 py-0.5 text-[9px] uppercase tracking-wider flex justify-between items-center rounded-sm">
                            <span>A. KETERANGAN TENTANG DIRI SANTRI</span>
                            <span className="font-normal normal-case text-[8px]">Nomor Induk: {santri.nis}</span>
                        </div>
                        <div className="flex gap-2 mt-1">
                            <table className="w-full text-[8.5pt] border-collapse">
                                <tbody>
                                    <tr className="border-b border-gray-200">
                                        <td className="w-6 py-0.5 text-center font-semibold text-gray-500">1.</td>
                                        <td className="w-44 py-0.5 text-gray-700">Nama Lengkap Santri</td>
                                        <td className="w-3 py-0.5">:</td>
                                        <td className="py-0.5 font-bold uppercase tracking-wide" colSpan={2}>{santri.namaLengkap}</td>
                                    </tr>
                                    <tr className="border-b border-gray-200">
                                        <td className="py-0.5 text-center font-semibold text-gray-500">2.</td>
                                        <td className="py-0.5 text-gray-700">Nama Panggilan / Hijrah</td>
                                        <td className="py-0.5">:</td>
                                        <td className="py-0.5" colSpan={2}>{santri.namaPanggilan || santri.namaHijrah || '-'}</td>
                                    </tr>
                                    <tr className="border-b border-gray-200">
                                        <td className="py-0.5 text-center font-semibold text-gray-500">3.</td>
                                        <td className="py-0.5 text-gray-700">Jenis Kelamin</td>
                                        <td className="py-0.5">:</td>
                                        <td className="py-0.5">{santri.jenisKelamin === 'Perempuan' ? 'Perempuan (P)' : 'Laki-laki (L)'}</td>
                                        <td className="py-0.5 text-right font-mono text-[8pt]">NIK: {santri.nik || '-'}</td>
                                    </tr>
                                    <tr className="border-b border-gray-200">
                                        <td className="py-0.5 text-center font-semibold text-gray-500">4.</td>
                                        <td className="py-0.5 text-gray-700">Tempat, Tanggal Lahir</td>
                                        <td className="py-0.5">:</td>
                                        <td className="py-0.5" colSpan={2}>{santri.tempatLahir}, {formatDate(santri.tanggalLahir)}</td>
                                    </tr>
                                    <tr className="border-b border-gray-200">
                                        <td className="py-0.5 text-center font-semibold text-gray-500">5.</td>
                                        <td className="py-0.5 text-gray-700">Agama & Kewarganegaraan</td>
                                        <td className="py-0.5">:</td>
                                        <td className="py-0.5" colSpan={2}>{santri.agama || 'Islam'} / Indonesia (WNI)</td>
                                    </tr>
                                    <tr className="border-b border-gray-200">
                                        <td className="py-0.5 text-center font-semibold text-gray-500">6.</td>
                                        <td className="py-0.5 text-gray-700">Keberadaan dalam Keluarga</td>
                                        <td className="py-0.5">:</td>
                                        <td className="py-0.5" colSpan={2}>
                                            Anak ke-{santri.anakKe || '-'} dari {santri.jumlahSaudara || '-'} bersaudara (Status: {santri.statusAnak || 'Anak Kandung'})
                                        </td>
                                    </tr>
                                    <tr className="border-b border-gray-200">
                                        <td className="py-0.5 text-center font-semibold text-gray-500">7.</td>
                                        <td className="py-0.5 text-gray-700">Kondisi Fisik / Golongan Darah</td>
                                        <td className="py-0.5">:</td>
                                        <td className="py-0.5" colSpan={2}>
                                            Gol. Darah: <strong>{santri.golonganDarah || '-'}</strong> | TB: {santri.tinggiBadan ? `${santri.tinggiBadan} cm` : '-'} | BB: {santri.beratBadan ? `${santri.beratBadan} kg` : '-'} | Riwayat: {santri.riwayatPenyakit || 'Tidak ada catatan'}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                            {/* Pasfoto Box */}
                            <div className="w-24 shrink-0 flex flex-col items-center justify-start pt-1">
                                {santri.fotoUrl ? (
                                    <div className="w-20 h-28 border border-gray-400 p-0.5 bg-white shadow-sm overflow-hidden">
                                        <img src={santri.fotoUrl} alt={santri.namaLengkap} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                    </div>
                                ) : (
                                    <div className="w-20 h-28 border border-dashed border-gray-400 flex flex-col items-center justify-center text-[8px] text-gray-400 text-center p-1">
                                        <span>FOTO RESMI</span>
                                        <span>3 x 4 cm</span>
                                    </div>
                                )}
                                <div className="text-[7.5pt] font-mono text-gray-500 mt-1">{santri.nis}</div>
                            </div>
                        </div>
                    </div>

                    {/* BAGIAN B: ALAMAT & TEMPAT TINGGAL */}
                    <div>
                        <div className="bg-gray-800 text-white font-bold px-2 py-0.5 text-[9px] uppercase tracking-wider rounded-sm">
                            B. KETERANGAN TEMPAT TINGGAL
                        </div>
                        <table className="w-full text-[8.5pt] border-collapse mt-1">
                            <tbody>
                                <tr className="border-b border-gray-200">
                                    <td className="w-6 py-0.5 text-center font-semibold text-gray-500">8.</td>
                                    <td className="w-44 py-0.5 text-gray-700">Alamat Tempat Tinggal</td>
                                    <td className="w-3 py-0.5">:</td>
                                    <td className="py-0.5">{formatAlamat(santri) || '-'}</td>
                                </tr>
                                <tr className="border-b border-gray-200">
                                    <td className="py-0.5 text-center font-semibold text-gray-500">9.</td>
                                    <td className="py-0.5 text-gray-700">Desa / Kelurahan & Kecamatan</td>
                                    <td className="py-0.5">:</td>
                                    <td className="py-0.5">{santri.desaKelurahan || '-'}, Kec. {santri.kecamatan || '-'}</td>
                                </tr>
                                <tr className="border-b border-gray-200">
                                    <td className="py-0.5 text-center font-semibold text-gray-500">10.</td>
                                    <td className="py-0.5 text-gray-700">Kabupaten / Kota & Kode Pos</td>
                                    <td className="py-0.5">:</td>
                                    <td className="py-0.5">{santri.kabupatenKota || '-'} (Kode Pos: {santri.kodePos || '-'})</td>
                                </tr>
                                <tr className="border-b border-gray-200">
                                    <td className="py-0.5 text-center font-semibold text-gray-500">11.</td>
                                    <td className="py-0.5 text-gray-700">Nomor Telepon / Kontak</td>
                                    <td className="py-0.5">:</td>
                                    <td className="py-0.5 font-mono">{santri.telepon || santri.noHp || santri.noHpAyah || santri.noHpIbu || '-'}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* BAGIAN C: RIWAYAT PENDIDIKAN SEBELUMNYA */}
                    <div>
                        <div className="bg-gray-800 text-white font-bold px-2 py-0.5 text-[9px] uppercase tracking-wider rounded-sm">
                            C. RIWAYAT PENDIDIKAN SEBELUMNYA
                        </div>
                        <table className="w-full text-[8.5pt] border-collapse mt-1">
                            <tbody>
                                <tr className="border-b border-gray-200">
                                    <td className="w-6 py-0.5 text-center font-semibold text-gray-500">12.</td>
                                    <td className="w-44 py-0.5 text-gray-700">Asal Sekolah / Madrasah</td>
                                    <td className="w-3 py-0.5">:</td>
                                    <td className="py-0.5 font-semibold">{santri.asalSekolah || '-'}</td>
                                </tr>
                                <tr className="border-b border-gray-200">
                                    <td className="py-0.5 text-center font-semibold text-gray-500">13.</td>
                                    <td className="py-0.5 text-gray-700">Nomor Ijazah & Tahun Lulus</td>
                                    <td className="py-0.5">:</td>
                                    <td className="py-0.5">No: {santri.nomorIjazahSebelumnya || '-'} (Tahun Lulus: {santri.tahunLulusSebelumnya || '-'})</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* BAGIAN D: KETERANGAN ORANG TUA / WALI */}
                    <div>
                        <div className="bg-gray-800 text-white font-bold px-2 py-0.5 text-[9px] uppercase tracking-wider rounded-sm">
                            D. KETERANGAN ORANG TUA KANDUNG / WALI
                        </div>
                        <table className="w-full text-[8pt] border border-gray-400 mt-1 border-collapse text-left">
                            <thead className="bg-gray-100 font-bold border-b border-gray-400">
                                <tr>
                                    <th className="py-1 px-2 border-r border-gray-300 w-36">Keterangan</th>
                                    <th className="py-1 px-2 border-r border-gray-300">Ayah Kandung</th>
                                    <th className="py-1 px-2 border-r border-gray-300">Ibu Kandung</th>
                                    <th className="py-1 px-2">Wali Santri</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="border-b border-gray-200">
                                    <td className="py-0.5 px-2 font-medium border-r border-gray-300 text-gray-700">Nama Lengkap</td>
                                    <td className="py-0.5 px-2 font-bold border-r border-gray-300">{santri.namaAyah || '-'}</td>
                                    <td className="py-0.5 px-2 font-bold border-r border-gray-300">{santri.namaIbu || '-'}</td>
                                    <td className="py-0.5 px-2 font-bold">{santri.namaWali || '-'}</td>
                                </tr>
                                <tr className="border-b border-gray-200">
                                    <td className="py-0.5 px-2 font-medium border-r border-gray-300 text-gray-700">NIK</td>
                                    <td className="py-0.5 px-2 font-mono border-r border-gray-300">{santri.nikAyah || '-'}</td>
                                    <td className="py-0.5 px-2 font-mono border-r border-gray-300">{santri.nikIbu || '-'}</td>
                                    <td className="py-0.5 px-2 font-mono">{santri.nikWali || '-'}</td>
                                </tr>
                                <tr className="border-b border-gray-200">
                                    <td className="py-0.5 px-2 font-medium border-r border-gray-300 text-gray-700">Pendidikan Terakhir</td>
                                    <td className="py-0.5 px-2 border-r border-gray-300">{santri.pendidikanAyah || '-'}</td>
                                    <td className="py-0.5 px-2 border-r border-gray-300">{santri.pendidikanIbu || '-'}</td>
                                    <td className="py-0.5 px-2">{santri.pendidikanWali || '-'}</td>
                                </tr>
                                <tr className="border-b border-gray-200">
                                    <td className="py-0.5 px-2 font-medium border-r border-gray-300 text-gray-700">Pekerjaan Pokok</td>
                                    <td className="py-0.5 px-2 border-r border-gray-300">{santri.pekerjaanAyah || '-'}</td>
                                    <td className="py-0.5 px-2 border-r border-gray-300">{santri.pekerjaanIbu || '-'}</td>
                                    <td className="py-0.5 px-2">{santri.pekerjaanWali || '-'}</td>
                                </tr>
                                <tr className="border-b border-gray-200">
                                    <td className="py-0.5 px-2 font-medium border-r border-gray-300 text-gray-700">Penghasilan Rata-rata</td>
                                    <td className="py-0.5 px-2 border-r border-gray-300">{santri.penghasilanAyah || '-'}</td>
                                    <td className="py-0.5 px-2 border-r border-gray-300">{santri.penghasilanIbu || '-'}</td>
                                    <td className="py-0.5 px-2">{santri.penghasilanWali || '-'}</td>
                                </tr>
                                <tr>
                                    <td className="py-0.5 px-2 font-medium border-r border-gray-300 text-gray-700">No. HP / WhatsApp</td>
                                    <td className="py-0.5 px-2 font-mono border-r border-gray-300">{santri.noHpAyah || '-'}</td>
                                    <td className="py-0.5 px-2 font-mono border-r border-gray-300">{santri.noHpIbu || '-'}</td>
                                    <td className="py-0.5 px-2 font-mono">{santri.noHpWali || '-'}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* BAGIAN E: DATA PENDAFTARAN & PENEMPATAN DI PESANTREN */}
                    <div>
                        <div className="bg-gray-800 text-white font-bold px-2 py-0.5 text-[9px] uppercase tracking-wider rounded-sm">
                            E. PENERIMAAN DI PONDOK PESANTREN
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 text-[8.5pt] mt-1 border border-gray-300 p-1.5 rounded-sm bg-gray-50">
                            <div>
                                <div className="flex justify-between py-0.5 border-b border-gray-200">
                                    <span className="text-gray-600">Tanggal Terdaftar Masuk:</span>
                                    <span className="font-semibold">{santri.tanggalMasuk ? formatDate(santri.tanggalMasuk) : '-'}</span>
                                </div>
                                <div className="flex justify-between py-0.5 border-b border-gray-200">
                                    <span className="text-gray-600">Jenjang Pendidikan:</span>
                                    <span className="font-semibold">{jenjang?.nama || '-'}</span>
                                </div>
                                <div className="flex justify-between py-0.5">
                                    <span className="text-gray-600">Kelas / Rombongan Belajar:</span>
                                    <span className="font-semibold">{kelas?.nama || '-'} ({rombel?.nama || '-'})</span>
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between py-0.5 border-b border-gray-200">
                                    <span className="text-gray-600">Gedung / Asrama:</span>
                                    <span className="font-semibold">{gedung?.nama || 'Asrama Pondok'}</span>
                                </div>
                                <div className="flex justify-between py-0.5 border-b border-gray-200">
                                    <span className="text-gray-600">Kamar Santri:</span>
                                    <span className="font-semibold">{kamar?.nama || '-'}</span>
                                </div>
                                <div className="flex justify-between py-0.5">
                                    <span className="text-gray-600">Status Keberadaan:</span>
                                    <span className="font-bold text-emerald-800 uppercase">{santri.status || 'Aktif'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bagian Pengesahan / Tanda Tangan */}
                <div className="mt-3 flex justify-between items-end px-4" style={{ breakInside: 'avoid' }}>
                    <div className="text-left text-[8pt] text-gray-500">
                        <p>Catatan:</p>
                        <p>Lembar ini adalah dokumen resmi yang tersimpan di Buku Induk Pesantren.</p>
                        <p className="font-mono text-[7pt]">ID Record: {santri.id} | Dicetak: {new Date().toLocaleDateString('id-ID')}</p>
                    </div>
                    <div className="text-center w-56">
                        <p className="text-[8.5pt]">
                            {settings.kabupatenKota || 'Pesantren'}, {formatDate(new Date().toISOString())}
                        </p>
                        <p className="font-bold text-[8.5pt]">{signatoryTitle},</p>
                        <div className="h-14 flex items-center justify-center">
                            <span className="text-[8pt] text-gray-400 italic">[Tanda Tangan & Cap Lembaga]</span>
                        </div>
                        <p className="font-bold underline uppercase text-[8.5pt]">{signatoryName}</p>
                        {signatory?.nip && <p className="font-mono text-[7.5pt] text-gray-600">NIP/NIY: {signatory.nip}</p>}
                    </div>
                </div>
            </div>
            <ReportFooter />
        </div>
    );
};

export const generateBukuIndukReports = (data: Santri[], settings: PondokSettings, options: any) => {
    return data.map(santri => ({
        content: <BukuIndukSantriTemplate santri={santri} settings={settings} options={options} />,
        orientation: 'portrait' as const
    }));
};
