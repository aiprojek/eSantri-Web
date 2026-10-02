
import React, { useMemo } from 'react';
import { CalendarEvent, PondokSettings } from '../../types';
import { formatDate, getHijriDate, toArabicNumerals, formatLocalDate, resolveTempatPesantren } from '../../utils/formatters';

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
    showAgendaAppendix?: boolean;
    customTempat?: string;
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
    academicHijriStartYear,
    showAgendaAppendix = true,
    customTempat
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
        if (layout === '1_sheet') return "grid grid-cols-3 gap-1 text-[6px]"; // Compact, fit A4 1 page
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
            <style>{`
                @page {
                    size: A4 portrait;
                    margin: 0;
                }
                @media print {
                    .calendar-sheet {
                        width: 210mm !important;
                        height: 297mm !important;
                        min-height: 297mm !important;
                        max-height: 297mm !important;
                        page-break-after: always !important;
                        break-after: page !important;
                        page-break-inside: avoid !important;
                        break-inside: avoid-page !important;
                        box-sizing: border-box !important;
                    }
                    .calendar-sheet:last-child {
                        page-break-after: auto !important;
                        break-after: auto !important;
                    }
                }
            `}</style>
            {chunks.map((chunk, pageIndex) => (
                <div
                    key={pageIndex}
                    className={`printable-content-wrapper calendar-sheet calendar-layout-${layout} ${currentTheme.bg} ${currentTheme.text} flex flex-col justify-between relative overflow-hidden`}
                    style={{
                        width: '210mm',
                        minHeight: '297mm',
                        height: layout === '1_sheet' ? '297mm' : 'auto',
                        padding: layout === '1_sheet' ? '5mm 6mm 4mm 6mm' : layout === '3_sheets' ? '10mm 10mm 8mm 10mm' : '12mm 12mm 9mm 12mm',
                        pageBreakAfter: pageIndex === chunks.length - 1 ? 'auto' : 'always',
                        breakInside: 'avoid',
                        boxSizing: 'border-box',
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
                        <div className={`calendar-sheet-header relative z-10 text-center ${layout === '1_sheet' ? 'mb-1 pb-0.5' : 'mb-3 pb-1.5'}`}>
                            <h2 className={`${layout === '1_sheet' ? 'text-base font-extrabold tracking-tight' : 'text-2xl font-bold'} uppercase ${currentTheme.header}`}>KALENDER PENDIDIKAN</h2>
                            <h3 className={`${layout === '1_sheet' ? 'text-xs font-bold leading-tight' : 'text-xl font-bold mt-1'} uppercase ${currentTheme.header}`}>{settings.namaPonpes}</h3>
                            <p className={`${layout === '1_sheet' ? 'text-[8.5px] mt-0.5' : 'text-sm mt-1'} font-medium tracking-wide uppercase opacity-75`}>{periodText}</p>
                        </div>
                    )}
                    {!showKop && (
                        <div className={`calendar-sheet-header text-center relative z-10 ${layout === '1_sheet' ? 'mb-1 pb-0.5' : 'mb-3'}`}>
                            <h2 className={`${layout === '1_sheet' ? 'text-base font-extrabold' : 'text-2xl font-bold'} uppercase ${currentTheme.header}`}>KALENDER PENDIDIKAN</h2>
                            <p className={`${layout === '1_sheet' ? 'text-[8.5px] mt-0.5' : 'text-sm mt-1'} font-medium tracking-wide uppercase opacity-75`}>{periodText}</p>
                        </div>
                    )}

                    {/* Content */}
                    <div className={`calendar-sheet-content ${getLayoutSpecificClass()} relative z-10`}>
                        {chunk.map(monthData => {
                            // Filter Events for this specific grid duration using string comparison
                            const mStartStr = formatLocalDate(monthData.start);
                            const mEndStr = formatLocalDate(monthData.end);

                            const monthEvents = events.filter(e => {
                                const eStart = (e.startDate || '').split('T')[0];
                                const eEnd = (e.endDate || e.startDate || '').split('T')[0];
                                return eStart <= mEndStr && eEnd >= mStartStr;
                            });

                            return (
                                <div key={monthData.index} className={`border rounded-lg ${currentTheme.border} bg-white/80 backdrop-blur-sm flex flex-col overflow-hidden`}>
                                    <div className={`${layout === '1_sheet' ? 'p-1' : 'p-2'} text-center font-bold ${currentTheme.monthTitle} flex flex-col justify-center border-b ${currentTheme.border}`}>
                                        {/* Main Title (Depending on mode) */}
                                        <div className={`${layout === '1_sheet' ? 'text-xs font-bold' : layout === '3_sheets' ? 'text-base' : 'text-lg'} leading-tight ${primarySystem === 'Hijriah' ? currentTheme.hijriText : ''}`}>
                                            {monthData.titleMain}
                                        </div>
                                        {/* Sub Title */}
                                        <div className={`${layout === '1_sheet' ? 'text-[7px]' : 'text-[9px]'} font-normal mt-0.5 ${primarySystem === 'Masehi' ? currentTheme.hijriText : 'opacity-70'}`}>
                                            {monthData.titleSub}
                                        </div>
                                    </div>
                                    <div className={`grid grid-cols-7 text-center font-bold ${currentTheme.dayHeader} items-center border-b ${currentTheme.border} ${layout === '1_sheet' ? 'h-4 text-[7.5px]' : 'py-2'}`}>
                                        {dayNames.map(d => <div key={d} className="flex items-center justify-center h-full leading-none">{d}</div>)}
                                    </div>
                                    <div className="grid grid-cols-7 text-center border-l border-t" style={{ borderColor: currentTheme.border.replace('border-', '#') }}>
                                        {monthData.days.map((date, idx) => {
                                            if (!date) {
                                                return <div key={idx} className="p-0.5 border-r border-b bg-gray-50/30" style={{ borderColor: currentTheme.border.replace('border-', '#') }}></div>;
                                            }
                                            const hijri = getHijriDate(date, hijriAdjustment);
                                            const hijriDayArabic = toArabicNumerals(hijri.day);
                                            
                                            // Determine Main vs Sub Numbers (Hijri uses Arabic numerals for distinct visual distinction)
                                            const mainNum = primarySystem === 'Masehi' ? date.getDate() : hijriDayArabic;
                                            const subNum = primarySystem === 'Masehi' ? hijriDayArabic : date.getDate();
                                            
                                            // Check Events with timezone-proof local date string
                                            const checkDateStr = formatLocalDate(date);
                                            const dayEvents = monthEvents.filter(e => {
                                                const eStart = (e.startDate || '').split('T')[0];
                                                const eEnd = (e.endDate || e.startDate || '').split('T')[0];
                                                return checkDateStr >= eStart && checkDateStr <= eEnd;
                                            });

                                            const isSunday = date.getDay() === 0;
                                            let textColor = isSunday ? 'text-red-600' : 'inherit';

                                            const cellMinHeight = layout === '1_sheet' ? 'min-h-[11px]' : layout === '3_sheets' ? 'min-h-[34px]' : 'min-h-[38px]';

                                            return (
                                                <div key={idx} className={`p-0.5 border-r border-b relative h-full ${cellMinHeight} flex flex-col items-center justify-start transition-colors`} style={{ borderColor: currentTheme.border.replace('border-', '#') }}>
                                                    <div className="flex justify-between items-center w-full px-0.5 mb-0.5">
                                                        {/* Primary Number (Always Large) */}
                                                        <span className={`z-10 relative ${textColor} ${layout === '1_sheet' ? 'text-[8.5px]' : 'text-xs'} font-bold leading-none ${primarySystem === 'Hijriah' ? 'font-serif' : ''}`}>
                                                            {mainNum}
                                                        </span>
                                                        
                                                        {/* Secondary Number (Hijri displayed in Eastern Arabic Numerals for instant clarity) */}
                                                        <span className={`z-10 relative ${primarySystem === 'Masehi' ? 'text-teal-700 font-serif font-bold text-[7px]' : `${textColor} text-[7px] font-medium opacity-70`} leading-none`}>
                                                            {subNum}
                                                        </span>
                                                    </div>

                                                    {/* Event Indicators */}
                                                    <div className="flex flex-wrap justify-center gap-0.5 mt-0.2 w-full">
                                                        {dayEvents.map(ev => (
                                                            <div 
                                                                key={ev.id} 
                                                                className={`w-full ${layout === '1_sheet' ? 'h-0.5' : 'h-1'} rounded-full ${ev.color.startsWith('#') ? '' : ev.color}`}
                                                                style={ev.color.startsWith('#') ? { backgroundColor: ev.color } : {}}
                                                            ></div>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Month Events Summary */}
                                    {layout === '1_sheet' ? (
                                        monthEvents.length > 0 ? (
                                            <div className={`border-t ${currentTheme.border} px-1.5 py-0.5 bg-white/70 space-y-0.5`}>
                                                {monthEvents
                                                    .sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''))
                                                    .map(ev => (
                                                        <div key={ev.id} className="flex items-center gap-1 text-[7px] leading-tight min-w-0 overflow-hidden" title={`${formatEventDateLabel(ev.startDate, ev.endDate)}: ${ev.title}`}>
                                                            <div
                                                                className={`w-1.5 h-1.5 rounded-full shrink-0 border border-black/10 ${ev.color.startsWith('#') ? '' : ev.color}`}
                                                                style={ev.color.startsWith('#') ? { backgroundColor: ev.color } : {}}
                                                            ></div>
                                                            <span className="truncate min-w-0 flex-1 leading-tight text-gray-800">
                                                                <span className="font-semibold text-gray-900">{formatEventDateLabel(ev.startDate, ev.endDate)}:</span> {ev.title}
                                                            </span>
                                                        </div>
                                                    ))}
                                            </div>
                                        ) : null
                                    ) : (
                                        <div className={`border-t ${currentTheme.border} px-1.5 py-1 bg-white/70`}>
                                            {monthEvents.length > 0 ? (
                                                <div className={`${monthEvents.length > 3 ? 'grid grid-cols-2 gap-x-2 gap-y-1' : 'space-y-1'}`}>
                                                    {monthEvents
                                                        .sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''))
                                                        .map(ev => (
                                                            <div key={ev.id} className="flex items-center gap-1.5 text-[9px] leading-normal min-w-0 overflow-hidden" title={`${formatEventDateLabel(ev.startDate, ev.endDate)}: ${ev.title}`}>
                                                                <div
                                                                    className={`w-2 h-2 rounded-full shrink-0 border border-black/10 ${ev.color.startsWith('#') ? '' : ev.color}`}
                                                                    style={ev.color.startsWith('#') ? { backgroundColor: ev.color } : {}}
                                                                ></div>
                                                                <span className="truncate min-w-0 flex-1 text-gray-800">
                                                                    <span className="font-semibold text-gray-900">{formatEventDateLabel(ev.startDate, ev.endDate)}:</span> {ev.title}
                                                                </span>
                                                            </div>
                                                        ))}
                                                </div>
                                            ) : (
                                                <p className="text-[9px] italic opacity-60">Belum ada agenda.</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* App Footer */}
                    <div className={`calendar-sheet-footer ${layout === '1_sheet' ? 'pt-1' : 'pt-4'} text-center text-[8px] text-gray-400 relative z-10`}>
                        dibuat dengan aplikasi eSantri Web by AI Projek | aiprojek01.my.id
                    </div>
                </div>
            ))}

            {/* Lampiran Rekapitulasi Lengkap Seluruh Agenda Pendidikan */}
            {showAgendaAppendix && events.length > 0 && (
                <div
                    className={`printable-content-wrapper calendar-sheet calendar-appendix ${currentTheme.bg} ${currentTheme.text} flex flex-col relative overflow-hidden`}
                    style={{
                        width: '21cm',
                        minHeight: '29.7cm',
                        padding: '10mm 12mm 10mm 12mm',
                        pageBreakBefore: 'always',
                        breakBefore: 'page',
                        breakInside: 'avoid',
                    }}
                >
                    {/* Header Lampiran */}
                    <div className="border-b-2 border-teal-800 pb-3 mb-4 text-center">
                        <h2 className="text-base font-extrabold uppercase tracking-wide text-teal-900">
                            LAMPIRAN REKAPITULASI AGENDA PENDIDIKAN
                        </h2>
                        <h3 className="text-sm font-bold uppercase text-gray-800 mt-0.5">
                            {settings.namaPonpes || 'PONDOK PESANTREN'}
                        </h3>
                        <p className="text-[10px] text-gray-600 mt-0.5 font-medium uppercase tracking-wider">
                            {periodText}
                        </p>
                    </div>

                    {/* Tabel Agenda Lengkap Tanpa Ada Yang Disembunyikan */}
                    <div className="flex-1 overflow-visible">
                        <table className="w-full text-left border-collapse text-[10px]">
                            <thead>
                                <tr className="bg-teal-800 text-white font-bold text-center">
                                    <th className="p-2 border border-teal-900 w-9">No</th>
                                    <th className="p-2 border border-teal-900 w-36">Tanggal Masehi</th>
                                    <th className="p-2 border border-teal-900 w-36">Tanggal Hijriah</th>
                                    <th className="p-2 border border-teal-900">Nama Agenda / Kegiatan</th>
                                    <th className="p-2 border border-teal-900 w-24">Kategori</th>
                                    <th className="p-2 border border-teal-900 w-44">Keterangan</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-300">
                                {[...events]
                                    .sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''))
                                    .map((ev, idx) => {
                                        const sD = new Date(ev.startDate + 'T00:00:00');
                                        const eD = new Date((ev.endDate || ev.startDate) + 'T00:00:00');
                                        const hStart = getHijriDate(sD, hijriAdjustment);
                                        const hEnd = getHijriDate(eD, hijriAdjustment);
                                        const hijriText = ev.startDate === ev.endDate
                                            ? `${hStart.day} ${hStart.month} ${hStart.year} H`
                                            : `${hStart.day} ${hStart.month} - ${hEnd.day} ${hEnd.month} ${hEnd.year} H`;

                                        return (
                                            <tr key={ev.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/70'}>
                                                <td className="p-1.5 border border-gray-300 text-center font-semibold text-gray-600">
                                                    {idx + 1}
                                                </td>
                                                <td className="p-1.5 border border-gray-300 font-medium">
                                                    {formatEventDateLabel(ev.startDate, ev.endDate)}
                                                </td>
                                                <td className="p-1.5 border border-gray-300 text-teal-800 font-serif text-[9.5px]">
                                                    {hijriText}
                                                </td>
                                                <td className="p-1.5 border border-gray-300 font-semibold text-gray-900">
                                                    <div className="flex items-center gap-1.5">
                                                        <div
                                                            className={`w-2 h-2 rounded-full shrink-0 border border-black/10 ${ev.color.startsWith('#') ? '' : ev.color}`}
                                                            style={ev.color.startsWith('#') ? { backgroundColor: ev.color } : {}}
                                                        ></div>
                                                        <span>{ev.title}</span>
                                                    </div>
                                                </td>
                                                <td className="p-1.5 border border-gray-300 text-center">
                                                    <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                                                        {ev.category || 'Kegiatan'}
                                                    </span>
                                                </td>
                                                <td className="p-1.5 border border-gray-300 text-gray-600 text-[9.5px]">
                                                    {ev.description || '-'}
                                                </td>
                                            </tr>
                                        );
                                    })}
                            </tbody>
                        </table>
                    </div>

                    {/* Tanda Tangan Pengesahan */}
                    <div className="mt-8 flex justify-between items-start text-xs text-gray-800 break-inside-avoid">
                        <div className="text-center w-52">
                            <p>Mengetahui,</p>
                            <p className="font-bold">Pengasuh / Pimpinan Pondok</p>
                            <div className="h-16"></div>
                            <p className="font-bold underline uppercase">
                                ( {settings.namaMudir || '...........................................'} )
                            </p>
                        </div>
                        <div className="text-center w-52">
                            <p>{customTempat?.trim() || resolveTempatPesantren(settings)}, {formatDate(formatLocalDate(new Date()))}</p>
                            <p className="font-bold">Bagian Kurikulum & Akademik</p>
                            <div className="h-16"></div>
                            <p className="font-bold underline uppercase">
                                ( ........................................... )
                            </p>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="pt-4 text-center text-[8px] text-gray-400">
                        dibuat dengan aplikasi eSantri Web by AI Projek | aiprojek01.my.id
                    </div>
                </div>
            )}
        </>
    );
};
