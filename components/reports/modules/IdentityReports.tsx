
import React from 'react';
import { Santri, PondokSettings } from '../../../types';
import { PrintHeader } from '../../common/PrintHeader';
import { formatDate, toHijri, ReportFooter, SmartAvatar } from './Common';

// --- BIODATA ---

const BiodataItem: React.FC<{ number?: string; label: string; value?: string | number | null; sub?: boolean; }> = ({ number, label, value, sub }) => {
    const isHeaderField = !Object.prototype.hasOwnProperty.call({number, label, value, sub}, 'value');
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
                    <BiodataItem number="12." label="Alamat Santri" value={santri.alamat.detail} /><BiodataItem number="13." label="Diterima di Ponpes ini" /><BiodataItem label="a. Di Jenjang" value={jenjang?.nama} sub /><BiodataItem label="b. Di Rombel" value={rombel?.nama} sub /><BiodataItem label="c. Pada Tanggal" value={formatDate(santri.tanggalMasuk)} sub />
                    <BiodataItem number="14." label="Sekolah Asal" /><BiodataItem label="a. Nama Sekolah" value={santri.sekolahAsal} sub /><BiodataItem label="b. Alamat Sekolah" value={santri.alamatSekolahAsal} sub />
                </BiodataSection>
                <BiodataSection title="B. KETERANGAN ORANG TUA KANDUNG">
                    <BiodataItem number="15." label="Nama Ayah" value={santri.namaAyah} /><BiodataItem number="16." label="Tempat, Tanggal Lahir Ayah" value={santri.tempatLahirAyah ? `${santri.tempatLahirAyah}, ${formatDate(santri.tanggalLahirAyah)}` : formatDate(santri.tanggalLahirAyah)} />
                    <BiodataItem number="17." label="Pendidikan Terakhir Ayah" value={santri.pendidikanAyah} /><BiodataItem number="18." label="Pekerjaan Ayah" value={santri.pekerjaanAyah} /><BiodataItem number="19." label="Penghasilan Ayah" value={santri.penghasilanAyah} /><BiodataItem number="20." label="No. Telepon Ayah" value={santri.teleponAyah} />
                    <BiodataItem number="21." label="Nama Ibu" value={santri.namaIbu} /><BiodataItem number="22." label="Tempat, Tanggal Lahir Ibu" value={santri.tempatLahirIbu ? `${santri.tempatLahirIbu}, ${formatDate(santri.tanggalLahirIbu)}` : formatDate(santri.tanggalLahirIbu)} />
                    <BiodataItem number="23." label="Pendidikan Terakhir Ibu" value={santri.pendidikanIbu} /><BiodataItem number="24." label="Pekerjaan Ibu" value={santri.pekerjaanIbu} /><BiodataItem number="25." label="Penghasilan Ibu" value={santri.penghasilanIbu} /><BiodataItem number="26." label="No. Telepon Ibu" value={santri.teleponIbu} />
                    <BiodataItem number="27." label="Alamat Orang Tua" value={santri.alamatAyah?.detail || santri.alamatIbu?.detail} />
                </BiodataSection>
                {santri.namaWali && (
                <BiodataSection title="C. KETERANGAN WALI">
                    <BiodataItem number="28." label="Nama Wali" value={santri.namaWali} /><BiodataItem number="29." label="Hubungan dengan Santri" value={santri.statusWali} /><BiodataItem number="30." label="Pekerjaan Wali" value={santri.pekerjaanWali} /><BiodataItem number="31." label="Penghasilan Wali" value={santri.penghasilanWali} /><BiodataItem number="32." label="No. Telepon Wali" value={santri.teleponWali} /><BiodataItem number="33." label="Alamat Wali" value={santri.alamatWali?.detail} />
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
    const { cardDesign, cardValidUntil, cardFields, cardWidth, cardHeight, cardValidityMode } = options || {};
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
    const alamat = santri.alamat.detail || '-';
    
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

    // --- Design 1: Classic Traditional ---
    if (cardDesign === 'classic') {
        return (
            <div className="rounded-xl overflow-hidden relative flex flex-col text-white border-4 border-double border-[#D4AF37]" 
                 style={{ ...cardStyle, backgroundColor: '#1B4D3E', borderColor: '#D4AF37' }}>
                <div className="flex justify-between items-center px-2 py-1.5 border-b border-[#D4AF37]/30 bg-black/20 h-1/4">
                    {/* Left Logo (Yayasan) */}
                    <div className="w-10 h-full flex items-center justify-center">
                        {settings.logoYayasanUrl && <img src={settings.logoYayasanUrl} alt="Logo Yayasan" className="max-h-full max-w-full object-contain" />}
                    </div>
                    <div className="text-center flex-grow">
                        <div className="text-[7pt] font-bold uppercase tracking-wider text-[#D4AF37]">{settings.namaYayasan}</div>
                        <div className="text-[9pt] font-bold leading-tight">{settings.namaPonpes}</div>
                    </div>
                    {/* Right Logo (Ponpes) */}
                    <div className="w-10 h-full flex items-center justify-center">
                        {settings.logoPonpesUrl && <img src={settings.logoPonpesUrl} alt="Logo Ponpes" className="max-h-full max-w-full object-contain" />}
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
            <div className="rounded-lg overflow-hidden relative flex flex-col bg-white text-gray-800 border border-gray-200 shadow-sm" style={cardStyle}>
                {/* Background Shapes */}
                <div className="absolute top-0 left-0 w-2/5 h-full bg-blue-600 skew-x-12 -ml-8 z-0"></div>
                <div className="absolute top-0 left-0 w-2/5 h-full bg-blue-500 skew-x-12 -ml-4 z-0 opacity-50"></div>
                
                {/* Header Section (Moved to Top) */}
                <div className="bg-blue-600/10 p-2 border-b border-blue-100 text-center z-10 relative">
                     <div className="text-[6pt] font-light text-gray-500 uppercase tracking-widest">{settings.namaYayasan}</div>
                     <div className="text-[9pt] font-bold text-blue-900 leading-none mt-0.5">{settings.namaPonpes}</div>
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
                            {showAlamat && <div className="flex justify-end gap-1 text-right"><span className="font-semibold">Alamat:</span> <span className="truncate max-w-[120px]">{alamat}</span></div>}
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
            <div className="rounded-lg overflow-hidden relative flex flex-col bg-white text-gray-800 border shadow-sm items-center text-center" style={cardStyle}>
                <div className="w-full h-24 bg-red-700 absolute top-0 rounded-b-[50%] scale-x-150 z-0"></div>
                
                <div className="z-10 mt-3 text-white">
                    <div className="text-[6pt] opacity-80 uppercase tracking-widest">KARTU SANTRI</div>
                    <div className="text-[8pt] font-bold mt-0.5">{settings.namaPonpes}</div>
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
                        {showAlamat && <div className="grid grid-cols-[40px_1fr]"><span className="text-gray-400">Alamat</span><span className="truncate">: {alamat}</span></div>}
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
                            <div className="text-[8pt] font-normal text-teal-400">Kartu Santri</div>
                            <div className="text-[7pt] font-bold tracking-wide uppercase leading-none">{settings.namaPonpes}</div>
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
                    <div className="text-[8pt] font-normal mb-0.5 relative z-10">Kartu Santri</div>
                    <div className="text-[8pt] font-bold relative z-10 leading-none">{settings.namaPonpes}</div>
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
                    <div className="text-[7pt] font-bold uppercase tracking-wider text-[#D4AF37]">{settings.namaYayasan}</div>
                    <div className="text-[9pt] font-bold leading-tight">{settings.namaPonpes}</div>
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

export const generateCardReports = (data: Santri[], settings: PondokSettings, options: any) => {
    // Logic for sheet orientation based on card dimensions
    // If cardWidth > cardHeight (Landscape Card), use Landscape Sheet to fit more columns?
    // Actually, usually A4 Portrait fits 2 cols of Landscape cards (8.5cm * 2 = 17cm < 21cm)
    // A4 Landscape fits 3 cols of Landscape cards (8.5cm * 3 = 25.5cm < 29.7cm)
    // Vertical cards (5.4cm): A4 Portrait fits 3 cols (16.2cm).
    
    // For simplicity and best fit on standard paper:
    // Landscape Cards -> Landscape Sheet
    // Portrait Cards -> Portrait Sheet
    
    let sheetOrientation: 'portrait' | 'landscape' = 'portrait';
    if (options.cardWidth > options.cardHeight) {
        sheetOrientation = 'landscape';
    } else {
        sheetOrientation = 'portrait';
    }

    const cardsPerPage = 9; // Grid 3x3
    const previews = [];

    for (let i = 0; i < data.length; i += cardsPerPage) {
        const pageData = data.slice(i, i + cardsPerPage);
        previews.push({
            content: (
                <div className="flex flex-wrap gap-4 justify-center items-start content-start h-full">
                    {pageData.map((santri) => (
                        <div key={santri.id} className="relative" style={{ breakInside: 'avoid' }}>
                            <KartuSantriTemplate santri={santri} settings={settings} options={options} />
                            {/* Cut marks */}
                            <div className="absolute -top-1 -left-1 w-2 h-2 border-t border-l border-gray-300"></div>
                            <div className="absolute -top-1 -right-1 w-2 h-2 border-t border-r border-gray-300"></div>
                            <div className="absolute -bottom-1 -left-1 w-2 h-2 border-b border-l border-gray-300"></div>
                            <div className="absolute -bottom-1 -right-1 w-2 h-2 border-b border-r border-gray-300"></div>
                        </div>
                    ))}
                </div>
            ),
            orientation: sheetOrientation
        });
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
                            </div>
                        );
                    })}
                </div>
            ), 
            orientation: 'portrait' as const
        });
    }
    return previews;
};
