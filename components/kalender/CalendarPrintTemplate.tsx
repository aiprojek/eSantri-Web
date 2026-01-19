
import React, { useMemo } from 'react';
import { CalendarEvent, PondokSettings } from '../../types';
import { formatDate, getHijriDate } from '../../utils/formatters';

interface CalendarPrintTemplateProps {
    year: number;
    events: CalendarEvent[];
    settings: PondokSettings;
    layout: '1_sheet' | '3_sheets' | '4_sheets';
    theme: 'classic' | 'modern' | 'bold' | 'dark' | 'ceria';
    primarySystem?: 'Masehi' | 'Hijriah';
    showKop?: boolean;
    customImage?: string;
    imagePosition?: 'banner' | 'watermark' | 'none';
}

interface MonthData {
    index: number;
    days: (Date | null)[];
    titleMain: string;
    titleSub: string;
    start: Date;
    end: Date;
    yearLabel: string; // To carry the year info to the header
    secondaryYearLabel: string;
}

export const CalendarPrintTemplate: React.FC<CalendarPrintTemplateProps> = ({ 
    year, events, settings, layout, theme, 
    primarySystem = 'Masehi', showKop = true, 
    customImage, imagePosition = 'none' 
}) => {
    const dayNames = ["Ah", "Sn", "Sl", "Rb", "Km", "Jm", "Sb"];
    const hijriAdjustment = settings.hijriAdjustment || 0;

    // Theme Styles
    const themes = {
        classic: {
            bg: 'bg-white',
            text: 'text-black',
            header: 'text-[#1B4D3E]',
            border: 'border-[#D4AF37]',
            monthTitle: 'text-[#1B4D3E] font-serif',
            today: 'bg-[#f0fdf4]',
            dayHeader: 'bg-[#1B4D3E] text-[#D4AF37]',
            eventDot: 'bg-[#D4AF37]',
            hijriText: 'text-[#D4AF37]'
        },
        modern: {
            bg: 'bg-white',
            text: 'text-gray-800',
            header: 'text-blue-600',
            border: 'border-blue-200',
            monthTitle: 'text-blue-700 font-sans',
            today: 'bg-blue-50',
            dayHeader: 'bg-blue-100 text-blue-800',
            eventDot: 'bg-blue-500',
            hijriText: 'text-blue-400'
        },
        bold: {
            bg: 'bg-white',
            text: 'text-black',
            header: 'text-black',
            border: 'border-black',
            monthTitle: 'text-black font-bold uppercase',
            today: 'bg-gray-100',
            dayHeader: 'bg-black text-white',
            eventDot: 'bg-red-600',
            hijriText: 'text-gray-500'
        },
        dark: {
            bg: 'bg-slate-900',
            text: 'text-white',
            header: 'text-teal-400',
            border: 'border-slate-700',
            monthTitle: 'text-teal-400',
            today: 'bg-slate-800',
            dayHeader: 'bg-slate-800 text-teal-300',
            eventDot: 'bg-teal-500',
            hijriText: 'text-teal-600'
        },
        ceria: {
            bg: 'bg-orange-50',
            text: 'text-gray-800',
            header: 'text-orange-600',
            border: 'border-orange-200',
            monthTitle: 'text-pink-600 font-comic',
            today: 'bg-yellow-100',
            dayHeader: 'bg-orange-200 text-orange-800',
            eventDot: 'bg-pink-500',
            hijriText: 'text-orange-400'
        }
    };

    const currentTheme = themes[theme];

    // Data Generator Logic
    const monthsData: MonthData[] = useMemo(() => {
        const results: MonthData[] = [];

        if (primarySystem === 'Masehi') {
            const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
            
            // Hitung rentang Hijriah untuk Header (Masehi Mode)
            const startH = getHijriDate(new Date(year, 0, 1), hijriAdjustment);
            const endH = getHijriDate(new Date(year, 11, 31), hijriAdjustment);
            const hijriRange = startH.year === endH.year ? `${startH.year} H` : `${startH.year} - ${endH.year} H`;

            for (let i = 0; i < 12; i++) {
                const date = new Date(year, i, 1);
                const firstDayIndex = date.getDay(); 
                const daysInMonth = new Date(year, i + 1, 0).getDate();
                
                const days: (Date | null)[] = [];
                for (let j = 0; j < firstDayIndex; j++) days.push(null);
                for (let j = 1; j <= daysInMonth; j++) days.push(new Date(year, i, j));

                const start = new Date(year, i, 1);
                const end = new Date(year, i + 1, 0);
                const hStart = getHijriDate(start, hijriAdjustment);
                const hEnd = getHijriDate(end, hijriAdjustment);
                
                // Masehi: 1 Bulan Utama, Hijriah: Range
                const titleMain = monthNames[i].toUpperCase();
                const hijriHeader = hStart.month === hEnd.month ? hStart.month : `${hStart.month} - ${hEnd.month}`;
                const titleSub = `${hijriHeader} ${hStart.year}`.toUpperCase();

                results.push({ 
                    index: i, days, titleMain, titleSub, start, end,
                    yearLabel: year.toString(),
                    secondaryYearLabel: hijriRange
                });
            }

        } else {
            // Hijriah Logic: Generate 1 Full Hijri Year (Muharram to Dzulhijjah)
            
            // 1. Tentukan Tahun Hijriah Target (Berdasarkan 1 Januari tahun yang dipilih)
            const refDate = new Date(year, 0, 1);
            const refHijri = getHijriDate(refDate, hijriAdjustment);
            const targetHijriYear = parseInt(refHijri.year); // misal 1446

            // 2. Cari tanggal Masehi untuk 1 Muharram tahun tersebut
            // Mundur dari refDate sampai ketemu 1 Muharram
            let cursorDate = new Date(refDate);
            // Safety: cari mundur maksimal 360 hari
            let foundStart = false;
            for(let k=0; k<360; k++) {
                const h = getHijriDate(cursorDate, hijriAdjustment);
                if (h.month === 'Muharram' && h.day === '1' && parseInt(h.year) === targetHijriYear) {
                    foundStart = true;
                    break;
                }
                // Jika mundur terlalu jauh ke tahun sebelumnya, berarti kita harus maju (kasus jarang terjadi tapi mungkin)
                if (parseInt(h.year) < targetHijriYear) {
                    cursorDate.setDate(cursorDate.getDate() + 2); // Koreksi maju
                    break; 
                }
                cursorDate.setDate(cursorDate.getDate() - 1);
            }
            // Jika tidak ketemu persis (karena konversi), pakai yang terakhir di loop (mendekati)

            // Hitung rentang Masehi untuk Header
            // 1 Muharram s.d 29/30 Dzulhijjah akan mencakup 2 tahun Masehi biasanya
            const mStartYear = cursorDate.getFullYear();
            // Estimasi akhir tahun (tambah 354 hari)
            const estimEnd = new Date(cursorDate);
            estimEnd.setDate(estimEnd.getDate() + 354);
            const mEndYear = estimEnd.getFullYear();
            const masehiRange = mStartYear === mEndYear ? mStartYear.toString() : `${mStartYear} - ${mEndYear}`;

            // 3. Generate 12 Bulan Hijriah
            for (let i = 0; i < 12; i++) {
                const currentMonthStart = new Date(cursorDate);
                const hStart = getHijriDate(currentMonthStart, hijriAdjustment);
                const targetMonthName = hStart.month;

                const days: (Date | null)[] = [];
                // Padding awal
                const firstDayIndex = currentMonthStart.getDay();
                for (let j = 0; j < firstDayIndex; j++) days.push(null);

                const currentMonthDays: Date[] = [];
                let tempD = new Date(currentMonthStart);
                
                // Loop hari dalam bulan Hijriah ini
                // Loop sampai bulan berubah
                while (true) {
                    const hCheck = getHijriDate(tempD, hijriAdjustment);
                    if (hCheck.month !== targetMonthName) break;
                    
                    currentMonthDays.push(new Date(tempD));
                    days.push(new Date(tempD));
                    tempD.setDate(tempD.getDate() + 1);
                    
                    // Safety break loop infinite
                    if (currentMonthDays.length > 32) break; 
                }

                // Sub Title (Rentang Masehi)
                const mStart = currentMonthDays[0];
                const mEnd = currentMonthDays[currentMonthDays.length - 1];
                const mStartName = mStart.toLocaleString('id-ID', { month: 'long' });
                const mEndName = mEnd.toLocaleString('id-ID', { month: 'long' });
                const mYearStr = mStart.getFullYear() === mEnd.getFullYear() ? mStart.getFullYear() : `${mStart.getFullYear()}/${mEnd.getFullYear()}`;
                
                const titleMain = `${hStart.month}`.toUpperCase(); // Nama Bulan Hijriah
                const masehiHeader = mStartName === mEndName ? mStartName : `${mStartName} - ${mEndName}`;
                const titleSub = `${masehiHeader} ${mYearStr}`.toUpperCase();

                results.push({ 
                    index: i, 
                    days, 
                    titleMain, 
                    titleSub, 
                    start: mStart, 
                    end: mEnd,
                    yearLabel: `${targetHijriYear} H`,
                    secondaryYearLabel: `PERIODE MASEHI ${masehiRange}`
                });

                // Siapkan cursor untuk bulan berikutnya
                cursorDate = new Date(tempD);
            }
        }
        return results;
    }, [year, primarySystem, hijriAdjustment]);


    // Calculate chunks based on layout
    const chunks: MonthData[][] = [];
    if (layout === '1_sheet') chunks.push(monthsData);
    else if (layout === '3_sheets') {
        chunks.push(monthsData.slice(0, 4));
        chunks.push(monthsData.slice(4, 8));
        chunks.push(monthsData.slice(8, 12));
    } else { // 4_sheets
        chunks.push(monthsData.slice(0, 3));
        chunks.push(monthsData.slice(3, 6));
        chunks.push(monthsData.slice(6, 9));
        chunks.push(monthsData.slice(9, 12));
    }

    const getGridClass = () => {
        if (layout === '1_sheet') return "grid grid-cols-3 gap-4 text-[8px]"; // Compact
        if (layout === '3_sheets') return "grid grid-cols-2 gap-8 text-[10px]"; // Balanced
        return "grid grid-cols-1 gap-8 text-[12px]"; // Detail
    };

    const getLayoutSpecificClass = () => {
        if (layout === '4_sheets') return "grid grid-cols-1 gap-6";
        return getGridClass();
    };

    // Ambil info tahun dari chunk pertama (karena konsisten untuk semua halaman)
    const displayYear = monthsData[0]?.yearLabel || year;
    const displaySubYear = monthsData[0]?.secondaryYearLabel || '';

    return (
        <>
            {chunks.map((chunk, pageIndex) => (
                <div key={pageIndex} className={`printable-content-wrapper ${currentTheme.bg} ${currentTheme.text} flex flex-col p-8 relative overflow-hidden`} style={{ width: '21cm', minHeight: '29.7cm', pageBreakAfter: 'always' }}>
                    
                    {/* Watermark Image Layer */}
                    {customImage && imagePosition === 'watermark' && (
                        <div className="absolute inset-0 flex items-center justify-center z-0 pointer-events-none opacity-15 print:opacity-10">
                            <img src={customImage} alt="Background" className="w-[80%] h-[80%] object-contain grayscale" />
                        </div>
                    )}

                    {/* Banner Image Layer (Top) */}
                    {customImage && imagePosition === 'banner' && (
                        <div className="w-full h-48 mb-6 rounded-b-3xl overflow-hidden shadow-md relative z-10 -mt-8 -mx-8 !w-[calc(100%+4rem)]">
                            <img src={customImage} alt="Banner" className="w-full h-full object-cover" />
                            {/* Gradient Overlay for Aesthetics */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
                        </div>
                    )}

                    {/* Header */}
                    {showKop && (
                        <div className="flex justify-between items-center mb-6 border-b-2 pb-4 relative z-10" style={{ borderColor: currentTheme.border.replace('border-', '#') }}> 
                            <div className="flex items-center gap-4">
                                {settings.logoPonpesUrl && <img src={settings.logoPonpesUrl} className="h-16 w-16 object-contain" alt="Logo" />}
                                <div>
                                    <h1 className={`text-2xl font-bold ${currentTheme.header}`}>{settings.namaPonpes}</h1>
                                    <p className="text-sm opacity-80">{settings.alamat}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <h2 className={`text-3xl font-bold ${currentTheme.header}`}>KALENDER {primarySystem === 'Hijriah' ? 'ISLAM' : 'AKADEMIK'}</h2>
                                <p className={`text-xl font-bold opacity-70 ${currentTheme.header}`}>TAHUN {displayYear}</p>
                                <p className="text-xs uppercase font-medium mt-1 tracking-widest opacity-60">{primarySystem === 'Masehi' ? `Hijriah: ${displaySubYear}` : displaySubYear}</p>
                            </div>
                        </div>
                    )}
                    {!showKop && (
                        <div className="mb-4 text-center relative z-10">
                            <h2 className={`text-3xl font-bold ${currentTheme.header}`}>KALENDER {displayYear}</h2>
                        </div>
                    )}

                    {/* Content */}
                    <div className={`flex-grow ${getLayoutSpecificClass()} relative z-10`}>
                        {chunk.map(monthData => {
                            // Filter Events for this specific grid duration
                            const monthEvents = events.filter(e => {
                                const start = new Date(e.startDate);
                                const end = new Date(e.endDate);
                                // Normalise
                                start.setHours(0,0,0,0);
                                end.setHours(0,0,0,0);
                                // Check overlap
                                return start <= monthData.end && end >= monthData.start;
                            });

                            return (
                                <div key={monthData.index} className={`border rounded-lg overflow-hidden ${currentTheme.border} bg-white/80 backdrop-blur-sm`}>
                                    <div className={`p-1.5 text-center font-bold ${currentTheme.monthTitle} flex flex-col justify-center`}>
                                        {/* Main Title (Depending on mode) */}
                                        <div className={`text-lg leading-none ${primarySystem === 'Hijriah' ? currentTheme.hijriText : ''}`}>
                                            {monthData.titleMain}
                                        </div>
                                        {/* Sub Title */}
                                        <div className={`text-[8px] font-normal mt-0.5 ${primarySystem === 'Masehi' ? currentTheme.hijriText : 'opacity-70'}`}>
                                            {monthData.titleSub}
                                        </div>
                                    </div>
                                    <div className={`grid grid-cols-7 text-center py-1 font-bold ${currentTheme.dayHeader}`}>
                                        {dayNames.map(d => <div key={d}>{d}</div>)}
                                    </div>
                                    <div className="grid grid-cols-7 text-center">
                                        {monthData.days.map((date, idx) => {
                                            if (!date) return <div key={idx} className="p-1"></div>;
                                            const hijri = getHijriDate(date, hijriAdjustment);
                                            
                                            // Determine Main vs Sub Numbers
                                            const mainNum = primarySystem === 'Masehi' ? date.getDate() : hijri.day;
                                            const subNum = primarySystem === 'Masehi' ? hijri.day : date.getDate();

                                            // Check Events
                                            const dayEvents = monthEvents.filter(e => {
                                                const start = new Date(e.startDate);
                                                const end = new Date(e.endDate);
                                                start.setHours(0,0,0,0);
                                                end.setHours(0,0,0,0);
                                                const checkDate = new Date(date);
                                                checkDate.setHours(0,0,0,0);
                                                return checkDate >= start && checkDate <= end;
                                            });

                                            const isSunday = date.getDay() === 0;
                                            let textColor = isSunday ? 'text-red-600' : 'inherit';

                                            return (
                                                <div key={idx} className={`p-1 border-t ${currentTheme.border} relative h-full min-h-[30px] flex flex-col items-center justify-start`}>
                                                    <div className="flex justify-between w-full px-0.5">
                                                        {/* Primary Number (Always Large) */}
                                                        <span className={`z-10 relative ${textColor} text-xs font-bold`}>
                                                            {mainNum}
                                                        </span>
                                                        
                                                        {/* Secondary Number (Always Small) */}
                                                        <span className={`z-10 relative ${textColor} text-[6px] opacity-60`}>
                                                            {subNum}
                                                        </span>
                                                    </div>

                                                    {/* Event Indicators */}
                                                    <div className="flex flex-wrap justify-center gap-0.5 mt-0.5 w-full">
                                                        {dayEvents.map(ev => (
                                                            <div 
                                                                key={ev.id} 
                                                                className={`w-full h-1 rounded-full ${ev.color.startsWith('#') ? '' : ev.color}`}
                                                                style={ev.color.startsWith('#') ? { backgroundColor: ev.color } : {}}
                                                            ></div>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Footer / Legend */}
                    <div className="mt-4 pt-4 border-t text-xs relative z-10 bg-white/80 backdrop-blur-sm rounded-lg p-2">
                        <h4 className="font-bold mb-2">Agenda Penting Periode Ini:</h4>
                        <ul className="grid grid-cols-2 gap-2">
                             {events.filter(e => {
                                 const start = new Date(e.startDate);
                                 // Simple approximate filter for legend to avoid showing too many
                                 return start >= chunk[0].start && start <= chunk[chunk.length-1].end;
                             }).slice(0, 10).map(e => ( 
                                 <li key={e.id} className="flex items-center gap-2 truncate">
                                     <span className={`w-2 h-2 rounded-full ${e.color.startsWith('#') ? '' : e.color}`} style={e.color.startsWith('#') ? { backgroundColor: e.color } : {}}></span>
                                     <span className="font-mono text-[10px]">{formatDate(e.startDate)}</span>
                                     <span className="truncate">{e.title}</span>
                                 </li>
                             ))}
                        </ul>
                    </div>
                </div>
            ))}
        </>
    );
};
