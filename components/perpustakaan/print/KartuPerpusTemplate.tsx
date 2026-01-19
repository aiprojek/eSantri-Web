
import React from 'react';
import { Santri, PondokSettings } from '../../../types';
import { SmartAvatar } from '../../reports/modules/Common';
import { formatDate } from '../../../utils/formatters';

interface KartuPerpusTemplateProps {
    santri: Santri;
    settings: PondokSettings;
    theme: 'classic' | 'modern' | 'bold' | 'dark' | 'ceria';
}

export const KartuPerpusTemplate: React.FC<KartuPerpusTemplateProps> = ({ santri, settings, theme }) => {
    // Reusing dimensions from KartuSantri (Standard ID Card)
    const cardStyle: React.CSSProperties = {
        width: theme === 'vertical' ? '5.398cm' : '8.56cm',
        height: theme === 'vertical' ? '8.56cm' : '5.398cm',
        flexShrink: 0,
        position: 'relative',
        overflow: 'hidden',
        border: '1px solid #ccc',
        breakInside: 'avoid',
        boxSizing: 'border-box'
    };

    const rombel = settings.rombel.find(r => r.id === santri.rombelId);
    const kelas = rombel ? settings.kelas.find(k => k.id === rombel.kelasId) : undefined;
    const jenjang = kelas ? settings.jenjang.find(j => j.id === kelas.jenjangId) : undefined;

    const jenjangKelas = `${jenjang?.nama?.split(' ')[0] || ''} / ${kelas?.nama || ''}`; 
    const rombelNama = rombel?.nama || '-';

    // --- Design 1: Classic Traditional ---
    if (theme === 'classic') {
        return (
            <div className="rounded-xl overflow-hidden relative flex flex-col text-white border-4 border-double border-[#D4AF37]" 
                 style={{ ...cardStyle, backgroundColor: '#1B4D3E', borderColor: '#D4AF37' }}>
                <div className="flex justify-between items-center px-2 py-1.5 border-b border-[#D4AF37]/30 bg-black/20 h-1/4">
                    {/* Left Logo (Yayasan) */}
                    <div className="w-10 h-full flex items-center justify-center">
                        {settings.logoYayasanUrl && <img src={settings.logoYayasanUrl} alt="Logo Yayasan" className="max-h-full max-w-full object-contain" />}
                    </div>
                    <div className="text-center flex-grow">
                        <div className="text-[6pt] font-bold uppercase tracking-wider text-[#D4AF37]">PERPUSTAKAAN</div>
                        <div className="text-[8pt] font-bold leading-tight">{settings.namaPonpes}</div>
                    </div>
                    {/* Right Logo (Ponpes) */}
                    <div className="w-10 h-full flex items-center justify-center">
                        {settings.logoPonpesUrl && <img src={settings.logoPonpesUrl} alt="Logo Ponpes" className="max-h-full max-w-full object-contain" />}
                    </div>
                </div>
                
                <div className="flex p-2 gap-2 flex-grow relative overflow-hidden">
                    <div className="flex flex-col items-center justify-center h-full">
                        <SmartAvatar santri={santri} variant="classic" className="w-[2cm] h-[2.5cm] bg-[#f0fdf4] border-2 border-[#D4AF37] shadow-lg rounded-sm" />
                        <div className="mt-1 text-[5pt] text-center bg-[#D4AF37] text-[#1B4D3E] px-1 rounded font-bold w-full uppercase">Anggota Aktif</div>
                    </div>
                    <div className="flex-grow text-[7pt] space-y-0.5 z-10 flex flex-col justify-center">
                        <div className="font-bold text-[#D4AF37] text-[10pt] border-b border-[#D4AF37]/30 pb-0.5 mb-1 truncate">{santri.namaLengkap}</div>
                        <div className="grid grid-cols-[35px_1fr]"><span>NIS</span><span>: {santri.nis}</span></div>
                        <div className="grid grid-cols-[35px_1fr]"><span>Jenjang</span><span>: {jenjangKelas}</span></div>
                        <div className="grid grid-cols-[35px_1fr]"><span>Rombel</span><span>: {rombelNama}</span></div>
                        <div className="grid grid-cols-[35px_1fr] items-start"><span>Alamat</span><span className="leading-tight line-clamp-2">: {santri.alamat.kabupatenKota}</span></div>
                    </div>
                    
                    {/* Pattern Overlay */}
                    <div className="absolute right-[-20px] bottom-[-20px] text-[#D4AF37] opacity-10 text-[80pt] pointer-events-none">
                        <i className="bi bi-book-half"></i>
                    </div>
                </div>
            </div>
        );
    } 
    
    // --- Design 2: Modern Tech ---
    else if (theme === 'modern') {
        return (
            <div className="rounded-lg overflow-hidden relative flex flex-col bg-white text-gray-800 border border-gray-200 shadow-sm" style={cardStyle}>
                {/* Background Shapes */}
                <div className="absolute top-0 left-0 w-2/5 h-full bg-blue-600 skew-x-12 -ml-8 z-0"></div>
                <div className="absolute top-0 left-0 w-2/5 h-full bg-blue-500 skew-x-12 -ml-4 z-0 opacity-50"></div>
                
                {/* Header Section (Moved to Top) */}
                <div className="bg-blue-600/10 p-2 border-b border-blue-100 text-center z-10 relative">
                     <div className="text-[6pt] font-light text-gray-500 uppercase tracking-widest">KARTU PERPUSTAKAAN</div>
                     <div className="text-[9pt] font-bold text-blue-900 leading-none mt-0.5">{settings.namaPonpes}</div>
                </div>

                {/* Body Section: Photo and Data */}
                <div className="flex justify-between items-start p-3 z-10 relative flex-grow overflow-hidden">
                    <div className="text-white mt-1">
                        <SmartAvatar santri={santri} variant="modern" className="w-[1.8cm] h-[1.8cm] rounded-full border-4 border-white shadow-md bg-white object-cover" />
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
        );
    } 
    
    // --- Design 3: Vertical ID ---
    else if (theme === 'vertical') { // Reused ID `vertical` but mapped to Bold/Vertical logic
         // NOTE: The user requested "5 themes". In the original Kartu Santri, 'bold' was mapped to a specific landscape design, 
         // but 'vertical' was the ID used for the portrait one. I will use the Vertical layout here as requested.
        return (
            <div className="rounded-lg overflow-hidden relative flex flex-col bg-white text-gray-800 border shadow-sm items-center text-center" style={cardStyle}>
                <div className="w-full h-24 bg-red-700 absolute top-0 rounded-b-[50%] scale-x-150 z-0"></div>
                
                <div className="z-10 mt-3 text-white">
                    <div className="text-[6pt] opacity-80 uppercase tracking-widest">PERPUSTAKAAN</div>
                    <div className="text-[8pt] font-bold mt-0.5">{settings.namaPonpes}</div>
                </div>

                <div className="z-10 mt-3 relative">
                    <SmartAvatar santri={santri} variant="vertical" className="w-[2.2cm] h-[2.8cm] rounded-lg shadow-lg border-2 border-white bg-gray-100 object-cover" />
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
                
                <div className="w-full bg-gray-800 text-white text-[5pt] py-1 absolute bottom-0">
                    Kartu Anggota Perpustakaan
                </div>
            </div>
        );
    } 

     // --- Design 4: Bold B&W (Mapped to 'bold' prop from caller) ---
    else if (theme === 'bold') {
        return (
            <div className="rounded-lg overflow-hidden relative flex flex-col bg-white text-black border-2 border-black" style={cardStyle}>
                 <div className="bg-black text-white p-2 flex justify-between items-center">
                    <div className="font-bold text-[10pt] uppercase tracking-tighter">PERPUSTAKAAN</div>
                    <div className="text-[6pt] uppercase tracking-widest">MEMBER CARD</div>
                 </div>
                 <div className="flex p-3 gap-3 items-center h-full">
                     <SmartAvatar santri={santri} variant="modern" className="w-[2cm] h-[2.5cm] bg-gray-200 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex-shrink-0" />
                     <div className="flex-grow space-y-1">
                         <div className="text-[12pt] font-black leading-none uppercase">{santri.namaLengkap}</div>
                         <div className="text-[9pt] font-mono bg-black text-white inline-block px-1">{santri.nis}</div>
                         <div className="text-[7pt] font-bold mt-2 border-t-2 border-black pt-1">{settings.namaPonpes}</div>
                         <div className="text-[6pt]">{rombelNama} - {jenjang?.nama}</div>
                     </div>
                 </div>
                 {/* Barcode Strip Simulation */}
                 <div className="h-4 w-full bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAABCAYAAAD5PA/NAAAAFklEQVR42mN88//wf2ZgYOAAYiYoBwAC9gL57r14sQAAAABJRU5ErkJggg==')] bg-repeat-x opacity-40 mt-auto"></div>
            </div>
        )
    }
    
    // --- Design 5: Dark Premium ---
    else if (theme === 'dark') {
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
                            <div className="text-[8pt] font-normal text-teal-400">Kartu Anggota</div>
                            <div className="text-[7pt] font-bold tracking-wide uppercase leading-none">{settings.namaPonpes}</div>
                        </div>
                    </div>
                </div>

                <div className="flex p-3 gap-3 z-10 flex-grow overflow-hidden">
                    <div className="flex flex-col gap-2">
                        <SmartAvatar santri={santri} variant="dark" className="w-[2cm] h-[2cm] rounded-lg border border-slate-600 bg-slate-800 object-cover" />
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
        );
    } 
    
    // --- Design 6: Ceria / TPQ ---
    else { // 'ceria'
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
                        <SmartAvatar santri={santri} variant="ceria" className="w-[2cm] h-[2cm] rounded-full border-2 border-white bg-teal-200 relative z-10 object-cover" />
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
    }
};
