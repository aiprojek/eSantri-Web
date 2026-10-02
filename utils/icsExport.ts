import { CalendarEvent } from '../types';

/**
 * Helper to escape text fields for iCalendar format (RFC 5545).
 */
const escapeIcsText = (str: string = ''): string => {
    return str
        .replace(/\\/g, '\\\\')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,')
        .replace(/\r?\n/g, '\\n');
};

/**
 * Format date to YYYYMMDD for all-day iCalendar events.
 */
const formatDateToIcs = (dateStr: string): string => {
    return dateStr.replace(/[^0-9]/g, '').slice(0, 8);
};

/**
 * Add one day to a YYYY-MM-DD string and return YYYYMMDD format.
 * (RFC 5545 specifies that all-day DTEND is exclusive).
 */
const getNextDayIcs = (dateStr: string): string => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return formatDateToIcs(dateStr);
    d.setDate(d.getDate() + 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}${m}${day}`;
};

/**
 * Generate RFC 5545 iCalendar (.ics) string from a list of CalendarEvent items.
 */
export const generateIcsContent = (events: CalendarEvent[], pondokName: string = 'eSantri Pesantren'): string => {
    const nowUtc = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

    const lines: string[] = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//eSantri Web//Sistem Informasi Manajemen Pesantren//ID',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        `X-WR-CALNAME:Agenda ${escapeIcsText(pondokName)}`,
        'X-WR-TIMEZONE:Asia/Jakarta',
        'X-WR-CALDESC:Sinkronisasi agenda kegiatan dan kalender akademik santri',
    ];

    events.forEach((evt, idx) => {
        if (evt.deleted) return;
        const uid = `event-${evt.id || Date.now()}-${idx}@esantri.internal`;
        const dtstart = formatDateToIcs(evt.startDate);
        const dtend = getNextDayIcs(evt.endDate || evt.startDate);
        const summary = escapeIcsText(evt.title);
        
        let descParts: string[] = [];
        if (evt.category) descParts.push(`Kategori: ${evt.category}`);
        if (evt.description) descParts.push(evt.description);
        descParts.push(`Diterbitkan oleh: ${pondokName}`);
        const description = escapeIcsText(descParts.join('\n'));

        lines.push('BEGIN:VEVENT');
        lines.push(`UID:${uid}`);
        lines.push(`DTSTAMP:${nowUtc}`);
        lines.push(`DTSTART;VALUE=DATE:${dtstart}`);
        lines.push(`DTEND;VALUE=DATE:${dtend}`);
        lines.push(`SUMMARY:${summary}`);
        if (description) {
            lines.push(`DESCRIPTION:${description}`);
        }
        if (evt.category) {
            lines.push(`CATEGORIES:${escapeIcsText(evt.category)}`);
        }
        lines.push('STATUS:CONFIRMED');
        lines.push('TRANSP:TRANSPARENT');
        lines.push('END:VEVENT');
    });

    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
};

/**
 * Trigger download of an .ics calendar file in browser.
 */
export const downloadIcsFile = (events: CalendarEvent[], fileName?: string, pondokName?: string): void => {
    if (!events || events.length === 0) return;
    const content = generateIcsContent(events, pondokName);
    const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const cleanFileName = (fileName || `agenda-pesantren-${new Date().toISOString().split('T')[0]}`)
        .replace(/[^a-zA-Z0-9_-]/g, '_');
    link.download = `${cleanFileName}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};
