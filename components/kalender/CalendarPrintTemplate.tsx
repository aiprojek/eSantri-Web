
import React, { useMemo } from 'react';
import { CalendarEvent, PondokSettings } from '../../types';
import { formatDate, getHijriDate } from '../../utils/formatters';

interface CalendarPrintTemplateProps {
    year: number;
    startMonth?: number;
    startYear?: number;
    endMonth?: number;
    endYear?: number;
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
    year, startMonth, startYear, endMonth, endYear,
    events, settings, layout, theme, 
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
            
            // Determine range
            let monthsToRender: { month: number, year: number }[] = [];
            if (startYear !== undefined && startMonth !== undefined && endYear !== undefined && endMonth !== undefined) {
                let currM = startMonth;
                let currY = startYear;
                while (currY < endYear || (currY === endYear && currM <= endMonth)) {
                    monthsToRender.push({ month: currM, year: currY });
                    currM++;
                    if (currM > 11) {
                        currM = 0;
                        currY++;
                    }
                }
            } else {
                for (let i = 0; i < 12; i++) monthsToRender.push({ month: i, year });
            }

            if (monthsToRender.length === 0) return [];

            // Hitung rentang Hijriah untuk Header (Masehi Mode)
            const firstM = monthsToRender[0];
            const lastM = monthsToRender[monthsToRender.length - 1];
            const startH = getHijriDate(new Date(firstM.year, firstM.month, 1), hijriAdjustment);
            const endH = getHijriDate(new Date(lastM.year, lastM.month + 1, 0), hijriAdjustment);
            const hijriRange = startH.year === endH.year ? `${startH.year} H` : `${startH.year} - ${endH.year} H`;

            monthsToRender.forEach((mInfo, idx) => {
                const i = mInfo.month;
                const y = mInfo.year;
                const date = new Date(y, i, 1);
                const firstDayIndex = date.getDay(); 
                const daysInMonth = new Date(y, i + 1, 0).getDate();
                
                const days: (Date | null)[] = [];
                for (let j = 0; j < firstDayIndex; j++) days.push(null);
                for (let j = 1; j <= daysInMonth; j++) days.push(new Date(y, i, j));

                const start = new Date(y, i, 1);
                const end = new Date(y, i + 1, 0);
                const hStart = getHijriDate(start, hijriAdjustment);
                const hEnd = getHijriDate(end, hijriAdjustment);
                
                const titleMain = monthNames[i].toUpperCase();
                const hijriHeader = hStart.month === hEnd.month ? hStart.month : `${hStart.month} - ${hEnd.month}`;
                const titleSub = `${hijriHeader} ${hStart.year}`.toUpperCase();

                results.push({ 
                    index: idx, days, titleMain, titleSub, start, end,
                    yearLabel: y === firstM.year && y === lastM.year ? y.toString() : `${firstM.year}-${lastM.year}`,
                    secondaryYearLabel: hijriRange
                });
            });

        } else {
            // Hijriah Logic
            // If custom range is provided in Hijri mode, we need to map those Hijri months to Masehi dates
            // For now, if no custom range, use the existing 1 full Hijri year logic
            if (startYear !== undefined && startMonth !== undefined && endYear !== undefined && endMonth !== undefined) {
                // Custom Hijri Range
                // We need to find the Masehi start date for the first Hijri month
                let currHM = startMonth;
                let currHY = startYear;
                
                // Find Masehi start for first month
                // Hijri year 1 is approx 622 AD. Hijri year H is approx H * 0.97 + 622 AD.
                let estimatedYear = Math.floor(currHY * 0.97 + 621);
                let cursorDate = new Date(estimatedYear, 0, 1);
                
                // Refine cursor to find the exact start of the Hijri month
                let found = false;
                for(let k=0; k<1000; k++) {
                    const h = getHijriDate(cursorDate, hijriAdjustment);
                    if (parseInt(h.year) === currHY && h.monthIndex === currHM && h.day === '1') {
                        found = true;
                        break;
                    }
                    cursorDate.setDate(cursorDate.getDate() + 1);
                }

                // If not found, try searching backwards a bit
                if (!found) {
                    cursorDate = new Date(estimatedYear, 0, 1);
                    for(let k=0; k<1000; k++) {
                        cursorDate.setDate(cursorDate.getDate() - 1);
                        const h = getHijriDate(cursorDate, hijriAdjustment);
                        if (parseInt(h.year) === currHY && h.monthIndex === currHM && h.day === '1') {
                            found = true;
                            break;
                        }
                    }
                }

                const mStartYear = cursorDate.getFullYear();

                let idx = 0;
                const tempResults: MonthData[] = [];
                while (currHY < endYear || (currHY === endYear && currHM <= endMonth)) {
                    const currentMonthStart = new Date(cursorDate);
                    const hStart = getHijriDate(currentMonthStart, hijriAdjustment);
                    const targetMonthName = hStart.month;

                    const days: (Date | null)[] = [];
                    const firstDayIndex = currentMonthStart.getDay();
                    for (let j = 0; j < firstDayIndex; j++) days.push(null);

                    const currentMonthDays: Date[] = [];
                    let tempD = new Date(currentMonthStart);
                    while (true) {
                        const hCheck = getHijriDate(tempD, hijriAdjustment);
                        if (hCheck.month !== targetMonthName) break;
                        currentMonthDays.push(new Date(tempD));
                        days.push(new Date(tempD));
                        tempD.setDate(tempD.getDate() + 1);
                        if (currentMonthDays.length > 32) break; 
                    }

                    const mStart = currentMonthDays[0];
                    const mEnd = currentMonthDays[currentMonthDays.length - 1];
                    const mStartName = mStart.toLocaleString('id-ID', { month: 'long' });
                    const mEndName = mEnd.toLocaleString('id-ID', { month: 'long' });
                    const mYearStr = mStart.getFullYear() === mEnd.getFullYear() ? mStart.getFullYear() : `${mStart.getFullYear()}/${mEnd.getFullYear()}`;
                    
                    const titleMain = `${hStart.month}`.toUpperCase();
                    const masehiHeader = mStartName === mEndName ? mStartName : `${mStartName} - ${mEndName}`;
                    const titleSub = `${masehiHeader} ${mYearStr}`.toUpperCase();

                    tempResults.push({ 
                        index: idx++, days, titleMain, titleSub, start: mStart, end: mEnd,
                        yearLabel: `${startYear === endYear ? startYear : startYear + '-' + endYear} H`,
                        secondaryYearLabel: '' // Will be filled after loop
                    });

                    cursorDate = new Date(tempD);
                    currHM++;
                    if (currHM > 11) {
                        currHM = 0;
                        currHY++;
                    }
                }

                // Calculate Masehi Range for the whole results
                if (tempResults.length > 0) {
                    const firstM = tempResults[0];
                    const lastM = tempResults[tempResults.length - 1];
                    const mStartYearRange = firstM.start.getFullYear();
                    const mEndYearRange = lastM.end.getFullYear();
                    const masehiRange = mStartYearRange === mEndYearRange ? mStartYearRange.toString() : `${mStartYearRange} - ${mEndYearRange}`;
                    
                    tempResults.forEach(res => {
                        res.secondaryYearLabel = `PERIODE MASEHI ${masehiRange}`;
                        results.push(res);
                    });
                }
            } else {
                // Existing 1 Full Hijri Year logic
                const refDate = new Date(year, 0, 1);
                const refHijri = getHijriDate(refDate, hijriAdjustment);
                const targetHijriYear = parseInt(refHijri.year);

                let cursorDate = new Date(refDate);
                let foundStart = false;
                for(let k=0; k<360; k++) {
                    const h = getHijriDate(cursorDate, hijriAdjustment);
                    if (h.month === 'Muharram' && h.day === '1' && parseInt(h.year) === targetHijriYear) {
                        foundStart = true;
                        break;
                    }
                    if (parseInt(h.year) < targetHijriYear) {
                        cursorDate.setDate(cursorDate.getDate() + 2);
                        break; 
                    }
                    cursorDate.setDate(cursorDate.getDate() - 1);
                }

                const mStartYear = cursorDate.getFullYear();
                const estimEnd = new Date(cursorDate);
                estimEnd.setDate(estimEnd.getDate() + 354);
                const mEndYear = estimEnd.getFullYear();
                const masehiRange = mStartYear === mEndYear ? mStartYear.toString() : `${mStartYear} - ${mEndYear}`;

                for (let i = 0; i < 12; i++) {
                    const currentMonthStart = new Date(cursorDate);
                    const hStart = getHijriDate(currentMonthStart, hijriAdjustment);
                    const targetMonthName = hStart.month;

                    const days: (Date | null)[] = [];
                    const firstDayIndex = currentMonthStart.getDay();
                    for (let j = 0; j < firstDayIndex; j++) days.push(null);

                    const currentMonthDays: Date[] = [];
                    let tempD = new Date(currentMonthStart);
                    while (true) {
                        const hCheck = getHijriDate(tempD, hijriAdjustment);
                        if (hCheck.month !== targetMonthName) break;
                        currentMonthDays.push(new Date(tempD));
                        days.push(new Date(tempD));
                        tempD.setDate(tempD.getDate() + 1);
                        if (currentMonthDays.length > 32) break; 
                    }

                    const mStart = currentMonthDays[0];
                    const mEnd = currentMonthDays[currentMonthDays.length - 1];
                    const mStartName = mStart.toLocaleString('id-ID', { month: 'long' });
                    const mEndName = mEnd.toLocaleString('id-ID', { month: 'long' });
                    const mYearStr = mStart.getFullYear() === mEnd.getFullYear() ? mStart.getFullYear() : `${mStart.getFullYear()}/${mEnd.getFullYear()}`;
                    
                    const titleMain = `${hStart.month}`.toUpperCase();
                    const masehiHeader = mStartName === mEndName ? mStartName : `${mStartName} - ${mEndName}`;
                    const titleSub = `${masehiHeader} ${mYearStr}`.toUpperCase();

                    results.push({ 
                        index: i, days, titleMain, titleSub, start: mStart, end: mEnd,
                        yearLabel: `${targetHijriYear} H`,
                        secondaryYearLabel: `PERIODE MASEHI ${masehiRange}`
                    });
                    cursorDate = new Date(tempD);
                }
            }
        }
        return results;
    }, [year, startMonth, startYear, endMonth, endYear, primarySystem, hijriAdjustment]);


    // Calculate chunks based on layout
    const chunks: MonthData[][] = useMemo(() => {
        const results: MonthData[][] = [];
        if (monthsData.length === 0) return [];

        if (layout === '1_sheet') {
            // Chunk by 12 months
            for (let i = 0; i < monthsData.length; i += 12) {
                results.push(monthsData.slice(i, i + 12));
            }
        } else if (layout === '3_sheets') {
            for (let i = 0; i < monthsData.length; i += 4) {
                results.push(monthsData.slice(i, i + 4));
            }
        } else if (layout === '4_sheets') {
            for (let i = 0; i < monthsData.length; i += 3) {
                results.push(monthsData.slice(i, i + 3));
            }
        } else {
            // Default 1 month per page
            for (let i = 0; i < monthsData.length; i++) {
                results.push([monthsData[i]]);
            }
        }
        return results;
    }, [monthsData, layout]);

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
                                <div key={monthData.index} className={`border rounded-lg overflow-hidden ${currentTheme.border} bg-white/80 backdrop-blur-sm flex flex-col`}>
                                    <div className={`p-2 text-center font-bold ${currentTheme.monthTitle} flex flex-col justify-center border-b ${currentTheme.border}`}>
                                        {/* Main Title (Depending on mode) */}
                                        <div className={`text-lg leading-tight ${primarySystem === 'Hijriah' ? currentTheme.hijriText : ''}`}>
                                            {monthData.titleMain}
                                        </div>
                                        {/* Sub Title */}
                                        <div className={`text-[9px] font-normal mt-0.5 ${primarySystem === 'Masehi' ? currentTheme.hijriText : 'opacity-70'}`}>
                                            {monthData.titleSub}
                                        </div>
                                    </div>
                                    <div className={`grid grid-cols-7 text-center py-2 font-bold ${currentTheme.dayHeader} items-center border-b ${currentTheme.border}`}>
                                        {dayNames.map(d => <div key={d} className="flex items-center justify-center h-full leading-none">{d}</div>)}
                                    </div>
                                    <div className="grid grid-cols-7 text-center flex-grow border-l border-t" style={{ borderColor: currentTheme.border.replace('border-', '#') }}>
                                        {monthData.days.map((date, idx) => {
                                            if (!date) {
                                                return <div key={idx} className="p-1 border-r border-b bg-gray-50/30" style={{ borderColor: currentTheme.border.replace('border-', '#') }}></div>;
                                            }
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

                                            const cellMinHeight = layout === '1_sheet' ? 'min-h-[28px]' : 'min-h-[35px]';

                                            return (
                                                <div key={idx} className={`p-1 border-r border-b relative h-full ${cellMinHeight} flex flex-col items-center justify-start transition-colors`} style={{ borderColor: currentTheme.border.replace('border-', '#') }}>
                                                    <div className="flex justify-between w-full px-0.5 mb-1">
                                                        {/* Primary Number (Always Large) */}
                                                        <span className={`z-10 relative ${textColor} text-xs font-bold leading-none`}>
                                                            {mainNum}
                                                        </span>
                                                        
                                                        {/* Secondary Number (Always Small) */}
                                                        <span className={`z-10 relative ${textColor} text-[7px] font-medium opacity-70 leading-none`}>
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
                    <div className={`mt-auto pt-4 border-t text-xs relative z-10 bg-white/80 backdrop-blur-sm rounded-lg p-3 ${layout === '1_sheet' ? 'max-h-[150px]' : ''}`}>
                        <h4 className="font-bold mb-2 text-sm border-b pb-1">Agenda Penting Periode Ini:</h4>
                        <div className={`grid ${layout === '1_sheet' ? 'grid-cols-3' : 'grid-cols-2'} gap-x-6 gap-y-2`}>
                             {events.filter(e => {
                                 const start = new Date(e.startDate);
                                 return start >= chunk[0].start && start <= chunk[chunk.length-1].end;
                             }).slice(0, layout === '1_sheet' ? 18 : 12).map(e => ( 
                                 <div key={e.id} className="flex items-start gap-2 text-[10px] leading-tight">
                                     <div 
                                        className={`w-2.5 h-2.5 rounded-full shrink-0 mt-0.5 border border-black/10 ${e.color.startsWith('#') ? '' : e.color}`} 
                                        style={e.color.startsWith('#') ? { backgroundColor: e.color } : {}}
                                     ></div>
                                     <div className="flex flex-col overflow-hidden">
                                        <span className="font-mono text-[9px] font-bold text-gray-500 leading-none mb-0.5">{formatDate(e.startDate).split(' ')[0]}</span>
                                        <span className="truncate font-semibold text-gray-900 leading-tight">{e.title}</span>
                                     </div>
                                 </div>
                             ))}
                        </div>
                    </div>
                    
                    {/* App Footer */}
                    <div className="mt-auto pt-4 text-center text-[10px] text-gray-500 relative z-10">
                        dibuat dengan aplikasi eSantri Web by AI Projek | aiprojek01.my.id
                    </div>
                </div>
            ))}
        </>
    );
};
