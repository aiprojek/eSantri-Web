
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
    periodLabelMasehi?: string;
    periodLabelHijriah?: string;
    useAcademicPeriodLabel?: boolean;
    academicHijriStartMonthIndex?: number;
    academicHijriStartYear?: number;
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
    customImage, imagePosition = 'none',
    periodLabelMasehi,
    periodLabelHijriah,
    useAcademicPeriodLabel = false,
    academicHijriStartMonthIndex,
    academicHijriStartYear
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
    const cleanRange = (value: string) => value.replace(/PERIODE\s+(MASEHI|HIJRIAH)\s*/gi, '').replace(/\s+/g, ' ').trim();
    const hijriMonthNames = ['Muharram', 'Safar', "Rabi'ul Awwal", "Rabi'ul Akhir", 'Jumadil Ula', 'Jumadil Akhir', 'Rajab', "Sya'ban", 'Ramadhan', 'Syawwal', "Dzulqa'dah", 'Dzulhijjah'];
    const formatEventDateLabel = (startDate: string, endDate: string) => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);

        const sameDay = start.getTime() === end.getTime();
        if (sameDay) {
            return `${start.getDate()} ${start.toLocaleDateString('id-ID', { month: 'long' })}`;
        }

        const sameMonthYear = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
        if (sameMonthYear) {
            return `${start.getDate()}-${end.getDate()} ${start.toLocaleDateString('id-ID', { month: 'long' })}`;
        }

        const sameYear = start.getFullYear() === end.getFullYear();
        if (sameYear) {
            return `${start.getDate()} ${start.toLocaleDateString('id-ID', { month: 'short' })} - ${end.getDate()} ${end.toLocaleDateString('id-ID', { month: 'short' })}`;
        }

        return `${start.toLocaleDateString('id-ID')} - ${end.toLocaleDateString('id-ID')}`;
    };

    const findHijriMonthStartDate = (targetYear: number, targetMonthIndex: number): Date => {
        const estimatedMasehiYear = Math.floor(targetYear * 0.97023 + 621.57);
        const anchor = new Date(estimatedMasehiYear, 5, 15);
        const maxSearchDays = 1200;

        for (let offset = 0; offset <= maxSearchDays; offset++) {
            const forward = new Date(anchor);
            forward.setDate(anchor.getDate() + offset);
            const hForward = getHijriDate(forward, hijriAdjustment);
            if (parseInt(hForward.year) === targetYear && hForward.monthIndex === targetMonthIndex && hForward.day === '1') {
                return forward;
            }

            if (offset > 0) {
                const backward = new Date(anchor);
                backward.setDate(anchor.getDate() - offset);
                const hBackward = getHijriDate(backward, hijriAdjustment);
                if (parseInt(hBackward.year) === targetYear && hBackward.monthIndex === targetMonthIndex && hBackward.day === '1') {
                    return backward;
                }
            }
        }

        // Fallback aman agar proses tetap jalan meski tidak ketemu presisi
        return new Date(estimatedMasehiYear, 0, 1);
    };

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
                let titleSub = '';
                if (
                    useAcademicPeriodLabel &&
                    typeof academicHijriStartMonthIndex === 'number' &&
                    typeof academicHijriStartYear === 'number'
                ) {
                    const rawStartIndex = academicHijriStartMonthIndex + idx;
                    const mappedStartIndex = ((rawStartIndex % 12) + 12) % 12;
                    const mappedStartYear = academicHijriStartYear + Math.floor(rawStartIndex / 12);
                    const rawEndIndex = rawStartIndex + 1;
                    const mappedEndIndex = ((rawEndIndex % 12) + 12) % 12;
                    const mappedEndYear = academicHijriStartYear + Math.floor(rawEndIndex / 12);
                    const startName = hijriMonthNames[mappedStartIndex];
                    const endName = hijriMonthNames[mappedEndIndex];
                    titleSub = `${startName} - ${endName} ${mappedStartYear === mappedEndYear ? mappedStartYear : `${mappedStartYear}/${mappedEndYear}`}`.toUpperCase();
                } else {
                    const hijriHeader = hStart.month === hEnd.month ? hStart.month : `${hStart.month} - ${hEnd.month}`;
                    titleSub = `${hijriHeader} ${hStart.year}`.toUpperCase();
                }

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
                let currHM = startMonth;
                let currHY = startYear;
                let cursorDate = findHijriMonthStartDate(currHY, currHM);

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
        if (layout === '1_sheet') return "grid grid-cols-3 gap-1.5 text-[6px]"; // Compact, fit A4 1 page
        if (layout === '3_sheets') return "grid grid-cols-2 gap-5 text-[10px] content-start auto-rows-max"; // Balanced
        return "grid grid-cols-1 gap-5 text-[11px] content-start auto-rows-max"; // Detail
    };

    const getLayoutSpecificClass = () => {
        if (layout === '4_sheets') return "grid grid-cols-1 gap-5 content-start auto-rows-max";
        return getGridClass();
    };

    // Ambil info tahun dari chunk pertama (karena konsisten untuk semua halaman)
    const displayYear = monthsData[0]?.yearLabel || year;
    const displaySubYear = monthsData[0]?.secondaryYearLabel || '';
    const masehiRange = useAcademicPeriodLabel && periodLabelMasehi
        ? cleanRange(periodLabelMasehi)
        : primarySystem === 'Masehi'
            ? cleanRange(String(displayYear))
            : cleanRange(displaySubYear);
    const hijriRange = useAcademicPeriodLabel && periodLabelHijriah
        ? cleanRange(periodLabelHijriah)
        : primarySystem === 'Masehi'
            ? cleanRange(displaySubYear)
            : cleanRange(String(displayYear));
    const periodText = `Periode ${hijriRange.replace(/\s*H$/i, '')}H / ${masehiRange.replace(/\s*M$/i, '')}M`;

    return (
        <>
            {chunks.map((chunk, pageIndex) => (
                <div
                    key={pageIndex}
                    className={`printable-content-wrapper calendar-sheet calendar-layout-${layout} ${currentTheme.bg} ${currentTheme.text} flex flex-col relative overflow-hidden`}
                    style={{
                        width: '21cm',
                        minHeight: '29.7cm',
                        padding: layout === '1_sheet' ? '8mm 8mm 7mm 8mm' : layout === '3_sheets' ? '11mm 10mm 9mm 10mm' : '13mm 12mm 10mm 12mm',
                        pageBreakAfter: pageIndex === chunks.length - 1 ? 'auto' : 'always',
                        breakInside: 'avoid',
                    }}
                >
                    
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
                        <div className={`calendar-sheet-header relative z-10 text-center ${layout === '1_sheet' ? 'mb-2 pb-1' : 'mb-3 pb-1.5'}`}>
                            <h2 className={`${layout === '1_sheet' ? 'text-lg' : 'text-2xl'} font-bold uppercase ${currentTheme.header}`}>KALENDER PENDIDIKAN</h2>
                            <h3 className={`${layout === '1_sheet' ? 'text-base' : 'text-xl'} font-bold uppercase mt-1 ${currentTheme.header}`}>{settings.namaPonpes}</h3>
                            <p className={`${layout === '1_sheet' ? 'text-[10px]' : 'text-sm'} font-medium mt-1 tracking-wide uppercase opacity-75`}>{periodText}</p>
                        </div>
                    )}
                    {!showKop && (
                        <div className={`calendar-sheet-header text-center relative z-10 ${layout === '1_sheet' ? 'mb-2' : 'mb-3'}`}>
                            <h2 className={`${layout === '1_sheet' ? 'text-lg' : 'text-2xl'} font-bold uppercase ${currentTheme.header}`}>KALENDER PENDIDIKAN</h2>
                            <p className={`${layout === '1_sheet' ? 'text-[10px]' : 'text-sm'} font-medium mt-1 tracking-wide uppercase opacity-75`}>{periodText}</p>
                        </div>
                    )}

                    {/* Content */}
                    <div className={`calendar-sheet-content ${getLayoutSpecificClass()} relative z-10`}>
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
                                <div key={monthData.index} className={`border rounded-lg ${currentTheme.border} bg-white/80 backdrop-blur-sm flex flex-col overflow-hidden`}>
                                    <div className={`${layout === '1_sheet' ? 'p-1.5' : 'p-2'} text-center font-bold ${currentTheme.monthTitle} flex flex-col justify-center border-b ${currentTheme.border}`}>
                                        {/* Main Title (Depending on mode) */}
                                        <div className={`${layout === '1_sheet' ? 'text-sm' : layout === '3_sheets' ? 'text-base' : 'text-lg'} leading-tight ${primarySystem === 'Hijriah' ? currentTheme.hijriText : ''}`}>
                                            {monthData.titleMain}
                                        </div>
                                        {/* Sub Title */}
                                        <div className={`${layout === '1_sheet' ? 'text-[8px]' : 'text-[9px]'} font-normal mt-0.5 ${primarySystem === 'Masehi' ? currentTheme.hijriText : 'opacity-70'}`}>
                                            {monthData.titleSub}
                                        </div>
                                    </div>
                                    <div className={`grid grid-cols-7 text-center font-bold ${currentTheme.dayHeader} items-center border-b ${currentTheme.border} ${layout === '1_sheet' ? 'h-5 text-[9px]' : 'py-2'}`}>
                                        {dayNames.map(d => <div key={d} className="flex items-center justify-center h-full leading-none">{d}</div>)}
                                    </div>
                                    <div className="grid grid-cols-7 text-center border-l border-t" style={{ borderColor: currentTheme.border.replace('border-', '#') }}>
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

                                            const cellMinHeight = layout === '1_sheet' ? 'min-h-[15px]' : layout === '3_sheets' ? 'min-h-[34px]' : 'min-h-[38px]';

                                            return (
                                                <div key={idx} className={`p-1 border-r border-b relative h-full ${cellMinHeight} flex flex-col items-center justify-start transition-colors`} style={{ borderColor: currentTheme.border.replace('border-', '#') }}>
                                                    <div className="flex justify-between w-full px-0.5 mb-0.5">
                                                        {/* Primary Number (Always Large) */}
                                                        <span className={`z-10 relative ${textColor} ${layout === '1_sheet' ? 'text-[10px]' : 'text-xs'} font-bold leading-none`}>
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
                                    <div className={`border-t ${currentTheme.border} px-1.5 py-1 bg-white/70`}>
                                        {monthEvents.length > 0 ? (
                                            <div className={`${monthEvents.length > 3 ? 'grid grid-cols-2 gap-x-2 gap-y-1' : 'space-y-1'}`}>
                                                {monthEvents
                                                    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
                                                    .slice(0, layout === '1_sheet' ? 6 : layout === '3_sheets' ? 8 : 10)
                                                    .map(ev => (
                                                        <div key={ev.id} className="flex items-center gap-1.5 text-[9px] leading-[1.35]">
                                                            <div
                                                                className={`w-2 h-2 rounded-full shrink-0 border border-black/10 ${ev.color.startsWith('#') ? '' : ev.color}`}
                                                                style={ev.color.startsWith('#') ? { backgroundColor: ev.color } : {}}
                                                            ></div>
                                                            <span className="break-words">
                                                                <span className="font-semibold">{formatEventDateLabel(ev.startDate, ev.endDate)}:</span> {ev.title}
                                                            </span>
                                                        </div>
                                                    ))}
                                            </div>
                                        ) : (
                                            <p className="text-[9px] italic opacity-60">Belum ada agenda.</p>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* App Footer */}
                    <div className="calendar-sheet-footer pt-4 text-center text-[10px] text-gray-500 relative z-10">
                        dibuat dengan aplikasi eSantri Web by AI Projek | aiprojek01.my.id
                    </div>
                </div>
            ))}
        </>
    );
};
