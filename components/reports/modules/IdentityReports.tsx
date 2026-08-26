
import React, { useState, useEffect } from 'react';
import { Santri, PondokSettings } from '../../../types';
import { PrintHeader } from '../../common/PrintHeader';
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

// --- KARTU SANTRI ---

const KartuSantriTemplate: React.FC<{ santri: Santri; settings: PondokSettings; options: any }> = ({ santri, settings, options }) => {
    const { cardDesign, cardValidUntil, cardFields, cardWidth, cardHeight, cardValidityMode, cardShowQRCode, cardQRCodeType } = options || {};
    const rombel = settings.rombel.find(r => r.id === santri.rombelId);
    const kelas = rombel ? settings.kelas.find(k => k.id === rombel.kelasId) : undefined;
    const jenjang = kelas ? settings.jenjang.find(j => j.id === kelas.jenjangId) : undefined;

    const showPhoto = cardFields.includes('foto');
    const showNama = cardFields.includes('namaLengkap');
    const showNis = cardFields.includes('nis');
    const showJenjang = cardFields.includes('jenjang');
    const showRombel = cardFields.includes('rombel');
    const showTtl = cardFields.includes('ttl');
    const showAlamat = cardFields.includes('alamat');
    const showAyahWali = cardFields.includes('ayahWali');

    const nama = santri.namaLengkap;
    const nis = santri.nis;
    const jenjangKelas = `${jenjang?.nama?.split(' ')[0] || ''} / ${kelas?.nama || ''}`; 
    const rombelNama = rombel?.nama || 'N/A';
    const ttl = `${santri.tempatLahir}, ${formatDate(santri.tanggalLahir)}`;
    const ayahWali = santri.namaAyah || santri.namaWali || '-';
    const alamat = formatAlamat(santri.alamat) || '-';
    
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
                        <SmartAvatar santri={santri} variant="classic" className="w-[2cm] h-[2.5cm] bg-[#f0fdf4] border-2 border-[#D4AF37] shadow-lg rounded-sm" forcePlaceholder={!showPhoto} />
                        <div className="mt-1 text-[6pt] text-center bg-[#D4AF37] text-[#1B4D3E] px-1 rounded font-bold w-full">SANTRI AKTIF</div>
                    </div>
                    <div className="flex-grow text-[7pt] space-y-0.5 z-10 flex flex-col justify-center">
                        {showNama && <div className="font-bold text-[#D4AF37] text-[10pt] border-b border-[#D4AF37]/30 pb-0.5 mb-1">{nama}</div>}
                        {showNis && <div className="grid grid-cols-[35px_1fr]"><span>NIS</span><span>: {nis}</span></div>}
                        {showJenjang && <div className="grid grid-cols-[35px_1fr]"><span>Jenjang</span><span>: {jenjangKelas}</span></div>}
                        {showRombel && <div className="grid grid-cols-[35px_1fr]"><span>Rombel</span><span>: {rombelNama}</span></div>}
                        {showTtl && <div className="grid grid-cols-[35px_1fr]"><span>TTL</span><span>: {ttl}</span></div>}
                        {showAyahWali && <div className="grid grid-cols-[35px_1fr]"><span>Wali</span><span>: {ayahWali}</span></div>}
                        {showAlamat && <div className="grid grid-cols-[35px_1fr] items-start"><span>Alamat</span><span className="leading-tight line-clamp-2">: {alamat}</span></div>}
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
                        <SmartAvatar santri={santri} variant="modern" className="w-[1.8cm] h-[1.8cm] rounded-full border-4 border-white shadow-md bg-white object-cover" forcePlaceholder={!showPhoto} />
                    </div>
                    <div className="text-right flex-grow pl-2 pt-1 flex flex-col items-end">
                        <div className="text-[6pt] text-gray-400 tracking-[0.2em] uppercase mb-1">Kartu Tanda Santri</div>
                        {showNama && <div className="text-[10pt] font-bold text-blue-900 leading-tight">{nama}</div>}
                        {showNis && <div className="text-[8pt] font-mono text-blue-600 bg-blue-50 inline-block px-1 rounded mt-1">{nis}</div>}
                        
                        <div className="mt-2 text-[6.5pt] space-y-0.5 text-gray-600">
                            {showJenjang && <div className="flex justify-end gap-1"><span className="font-semibold">Jenjang:</span> {jenjangKelas}</div>}
                            {showRombel && <div className="flex justify-end gap-1"><span className="font-semibold">Rombel:</span> {rombelNama}</div>}
                            {showTtl && <div className="flex justify-end gap-1"><span className="font-semibold">Lahir:</span> {ttl}</div>}
                            {showAyahWali && <div className="flex justify-end gap-1"><span className="font-semibold">Wali:</span> {ayahWali}</div>}
                            {showAlamat && <div className="flex justify-end gap-1 text-right items-start"><span className="font-semibold shrink-0">Alamat:</span> <span className="line-clamp-2 text-[6pt] leading-tight break-all">{alamat}</span></div>}
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
                    <SmartAvatar santri={santri} variant="vertical" className="w-[2.2cm] h-[2.8cm] rounded-lg shadow-lg border-2 border-white bg-gray-100 object-cover" forcePlaceholder={!showPhoto} />
                </div>

                <div className="z-10 mt-4 px-2 w-full flex-grow flex flex-col items-center overflow-hidden">
                    {showNama && <div className="text-[9pt] font-bold text-gray-800 leading-tight">{nama}</div>}
                    {showNis && <div className="text-[7pt] text-red-600 font-medium mt-0.5 mb-2">{nis}</div>}
                    
                    <div className="w-full border-t border-gray-200 my-1"></div>
                    
                    <div className="text-[6.5pt] text-gray-600 space-y-0.5 w-full text-left px-2">
                        {showJenjang && <div className="grid grid-cols-[40px_1fr]"><span className="text-gray-400">Kelas</span><span>: {jenjangKelas}</span></div>}
                        {showRombel && <div className="grid grid-cols-[40px_1fr]"><span className="text-gray-400">Rombel</span><span>: {rombelNama}</span></div>}
                        {showAyahWali && <div className="grid grid-cols-[40px_1fr]"><span className="text-gray-400">Wali</span><span>: {ayahWali}</span></div>}
                        {showAlamat && <div className="grid grid-cols-[40px_1fr] text-left border-t border-gray-100 pt-0.5 mt-0.5"><span className="text-gray-400">Alamat</span><span className="line-clamp-2 leading-tight">: {alamat}</span></div>}
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
                        <SmartAvatar santri={santri} variant="dark" className="w-[2cm] h-[2cm] rounded-lg border border-slate-600 bg-slate-800 object-cover" forcePlaceholder={!showPhoto} />
                        <div className="text-center">
                            {showNis && <div className="text-[9pt] font-mono font-bold text-teal-400">{nis}</div>}
                            <div className="text-[5pt] text-slate-500 uppercase tracking-widest">Nomor Induk</div>
                        </div>
                    </div>
                    <div className="flex-grow space-y-1">
                        {showNama && (
                            <div className="mb-2">
                                <div className="text-[5pt] text-slate-500 uppercase">Nama Lengkap</div>
                                <div className="text-[8pt] font-bold leading-tight">{nama}</div>
                            </div>
                        )}
                        
                        <div className="grid grid-cols-2 gap-1">
                            {showJenjang && <div><div className="text-[5pt] text-slate-500 uppercase">Jenjang</div><div className="text-[6.5pt]">{jenjangKelas}</div></div>}
                            {showRombel && <div><div className="text-[5pt] text-slate-500 uppercase">Rombel</div><div className="text-[6.5pt]">{rombelNama}</div></div>}
                        </div>
                        {showAyahWali && <div><div className="text-[5pt] text-slate-500 uppercase">Orang Tua / Wali</div><div className="text-[6.5pt] truncate">{ayahWali}</div></div>}
                        {showAlamat && <div><div className="text-[5pt] text-slate-500 uppercase">Alamat</div><div className="text-[6.5pt] leading-tight line-clamp-2">{alamat}</div></div>}
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
                        <SmartAvatar santri={santri} variant="ceria" className="w-[2cm] h-[2cm] rounded-full border-2 border-white bg-teal-200 relative z-10 object-cover" forcePlaceholder={!showPhoto} />
                    </div>
                    
                    <div className="flex-grow pl-2 z-10 relative">
                         {showNama && (
                            <div className="mb-2 border-b border-orange-200 pb-1">
                                <div className="text-[5pt] text-orange-400 uppercase tracking-wide">Nama Lengkap</div>
                                <div className="text-[9pt] font-bold text-teal-800 leading-tight">{nama}</div>
                            </div>
                        )}
                        
                        <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-[6.5pt]">
                             {/* NIS */}
                             {showNis && <div><div className="text-[5pt] text-orange-400 uppercase">NIS</div><div className="font-mono text-orange-700 bg-white/50 inline-block px-1 rounded font-bold">{nis}</div></div>}
                             
                             {/* Jenjang */}
                             {showJenjang && <div><div className="text-[5pt] text-orange-400 uppercase">Jenjang</div><div className="text-teal-700 font-bold leading-tight">{jenjangKelas}</div></div>}
                             
                             {/* Rombel */}
                             {showRombel && <div><div className="text-[5pt] text-orange-400 uppercase">Rombel</div><div className="text-teal-700 font-bold leading-tight">{rombelNama}</div></div>}
                             
                             {/* Wali */}
                             {showAyahWali && <div className="col-span-2"><div className="text-[5pt] text-orange-400 uppercase">Wali</div><div className="text-teal-700 font-bold truncate">{ayahWali}</div></div>}
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
                    <SmartAvatar santri={santri} variant="classic" className="w-[2cm] h-[2.5cm] bg-[#f0fdf4] border-2 border-[#D4AF37] shadow-lg rounded-sm" forcePlaceholder={!showPhoto} />
                </div>
                <div className="flex-grow text-[7pt] space-y-0.5 z-10 flex flex-col justify-center">
                    {showNama && <div className="font-bold text-[#D4AF37] text-[10pt] border-b border-[#D4AF37]/30 pb-0.5 mb-1">{nama}</div>}
                    {showNis && <div className="grid grid-cols-[35px_1fr]"><span>NIS</span><span>: {nis}</span></div>}
                    {showJenjang && <div className="grid grid-cols-[35px_1fr]"><span>Jenjang</span><span>: {jenjangKelas}</span></div>}
                    {showRombel && <div className="grid grid-cols-[35px_1fr]"><span>Rombel</span><span>: {rombelNama}</span></div>}
                    {showAyahWali && <div className="grid grid-cols-[35px_1fr]"><span>Wali</span><span>: {ayahWali}</span></div>}
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
        <div className={`p-0.5 rounded bg-white shadow-sm flex items-center justify-center shrink-0 ${isDark ? 'border border-slate-600' : 'border border-gray-200'} ${className}`}>
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

const KartuSantriBackTemplate: React.FC<{ santri?: Santri; settings: PondokSettings; options: any }> = ({ santri, settings, options }) => {
    const { 
        cardDesign = 'classic', 
        cardWidth = 8.56, 
        cardHeight = 5.4, 
        cardRules, 
        cardRulesFontSize = 'auto',
        cardRulesCustomColor = '',
        cardSignatoryTitle, 
        cardSignatoryId, 
        cardShowQRCode, 
        cardQRCodeType 
    } = options || {};
    
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

    const nisValue = santri?.nis || (santri?.id ? `SAN${santri.id}` : '');
    const showCode = Boolean(cardShowQRCode && (santri?.nis || santri?.id));

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

                    <div className="flex items-center justify-between gap-2 mt-1 pt-0.5 border-t border-[#D4AF37]/20">
                        {totalChars <= 280 ? (
                            <div className="italic text-[#D4AF37]/90 font-serif text-[4.8pt] text-left leading-tight">
                                "Sebaik-baik manusia adalah yang paling bermanfaat bagi orang lain."
                            </div>
                        ) : <div />}

                        <div className="flex flex-col items-end shrink-0">
                            {showCode && (
                                <div className="flex items-center gap-1 mb-0.5">
                                    {(cardQRCodeType === 'qr' || cardQRCodeType === 'both') && (
                                        <CardQRCodeView value={nisValue} size={26} />
                                    )}
                                    {(cardQRCodeType === 'barcode' || cardQRCodeType === 'both') && (
                                        <CardBarcodeView value={nisValue} width={62} height={16} />
                                    )}
                                </div>
                            )}
                            {nisValue && (
                                <div className="font-mono text-[4.8pt] text-[#D4AF37] font-bold tracking-wider">
                                    S: {santri?.nis || nisValue}
                                </div>
                            )}
                        </div>
                    </div>
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

                    <div className="flex items-center justify-between gap-2 mt-1 pt-0.5 border-t border-blue-100">
                        {totalChars <= 280 ? (
                            <div className="italic text-blue-700/80 text-[4.8pt] leading-tight">
                                "Menuntut ilmu adalah kewajiban bagi setiap muslim."
                            </div>
                        ) : <div />}

                        <div className="flex flex-col items-end shrink-0">
                            {showCode && (
                                <div className="flex items-center gap-1 mb-0.5">
                                    {(cardQRCodeType === 'qr' || cardQRCodeType === 'both') && (
                                        <CardQRCodeView value={nisValue} size={26} />
                                    )}
                                    {(cardQRCodeType === 'barcode' || cardQRCodeType === 'both') && (
                                        <CardBarcodeView value={nisValue} width={62} height={16} />
                                    )}
                                </div>
                            )}
                            {nisValue && (
                                <div className="font-mono text-[4.8pt] text-blue-800 font-bold bg-blue-50/80 px-1 rounded border border-blue-200/60 tracking-wider">
                                    S: {santri?.nis || nisValue}
                                </div>
                            )}
                        </div>
                    </div>
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

                    <div className="mt-1 pt-1 border-t border-gray-100 flex flex-col items-center shrink-0">
                        {totalChars <= 250 && (
                            <div className="italic text-red-700/80 text-[4.5pt] text-center mb-0.5 leading-tight">
                                "Disiplin dan adab adalah kunci keberkahan ilmu."
                            </div>
                        )}

                        {showCode && (
                            <div className="flex justify-center gap-1 my-0.5">
                                {(cardQRCodeType === 'qr' || cardQRCodeType === 'both') && (
                                    <CardQRCodeView value={nisValue} size={24} />
                                )}
                                {(cardQRCodeType === 'barcode' || cardQRCodeType === 'both') && (
                                    <CardBarcodeView value={nisValue} width={58} height={15} />
                                )}
                            </div>
                        )}

                        {nisValue && (
                            <div className="font-mono text-[4.8pt] text-red-700 font-bold bg-red-50 px-1.5 py-0.5 rounded border border-red-200/80 mt-0.5 tracking-wider">
                                S: {santri?.nis || nisValue}
                            </div>
                        )}
                    </div>
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

                    <div className="flex items-center justify-between gap-2 mt-1 pt-0.5 border-t border-slate-800">
                        {totalChars <= 280 ? (
                            <div className="italic text-teal-300/80 font-serif text-[4.8pt] leading-tight">
                                "Adab dan akhlak mulia mendahului ketinggian ilmu."
                            </div>
                        ) : <div />}

                        <div className="flex flex-col items-end shrink-0">
                            {showCode && (
                                <div className="flex items-center gap-1 mb-0.5">
                                    {(cardQRCodeType === 'qr' || cardQRCodeType === 'both') && (
                                        <CardQRCodeView value={nisValue} size={26} isDark />
                                    )}
                                    {(cardQRCodeType === 'barcode' || cardQRCodeType === 'both') && (
                                        <CardBarcodeView value={nisValue} width={62} height={16} isDark />
                                    )}
                                </div>
                            )}
                            {nisValue && (
                                <div className="font-mono text-[4.8pt] text-teal-400 font-bold tracking-wider">
                                    S: {santri?.nis || nisValue}
                                </div>
                            )}
                        </div>
                    </div>
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

                    <div className="flex items-center justify-between gap-2 mt-1 pt-0.5 border-t border-orange-200">
                        {totalChars <= 280 ? (
                            <div className="italic text-teal-700 font-medium text-[4.8pt] leading-tight">
                                "Rajin mengaji, santun berbudi, berbakti pada orang tua & guru."
                            </div>
                        ) : <div />}

                        <div className="flex flex-col items-end shrink-0">
                            {showCode && (
                                <div className="flex items-center gap-1 mb-0.5">
                                    {(cardQRCodeType === 'qr' || cardQRCodeType === 'both') && (
                                        <CardQRCodeView value={nisValue} size={26} />
                                    )}
                                    {(cardQRCodeType === 'barcode' || cardQRCodeType === 'both') && (
                                        <CardBarcodeView value={nisValue} width={62} height={16} />
                                    )}
                                </div>
                            )}
                            {nisValue && (
                                <div className="font-mono text-[4.8pt] text-orange-700 font-bold bg-orange-100/80 px-1 rounded border border-orange-200 tracking-wider">
                                    S: {santri?.nis || nisValue}
                                </div>
                            )}
                        </div>
                    </div>
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
                <div className="flex justify-between items-center mt-1 pt-0.5 border-t border-[#D4AF37]/20">
                    <div className="text-[4.2pt] italic text-[#D4AF37]">"Disiplin & Berakhlakul Karimah"</div>
                    {nisValue && (
                        <div className="font-mono text-[4.8pt] text-[#D4AF37] font-bold tracking-wider">
                            S: {santri?.nis || nisValue}
                        </div>
                    )}
                </div>
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
