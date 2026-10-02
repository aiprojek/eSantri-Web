import { PondokSettings, PiketSchedule, Santri, PiketPrintConfig } from '../types';
import { formatDate, getHijriDate, toArabicNumerals, resolveTempatPesantren } from './formatters';
import { loadJsPdf, loadJsPdfAutoTable } from './lazyClientLibs';

export interface PiketPdfExportOptions {
    settings: PondokSettings;
    weekDates: string[];
    piketList: PiketSchedule[];
    santriList: Santri[];
    fileName?: string;
    orientation?: 'landscape' | 'portrait';
    customTempat?: string;
    piketConfig?: PiketPrintConfig;
}

/**
 * Generates a clean, crisp, native vector PDF for Jadwal Piket Muadzin & Imam.
 * Does NOT rely on rasterized html2canvas screenshots, ensuring sharp text,
 * perfect proportions, and professional document styling suitable for printing.
 */
export const exportPiketSchedulePdf = async ({
    settings,
    weekDates,
    piketList,
    santriList,
    fileName,
    orientation = 'landscape',
    customTempat,
    piketConfig
}: PiketPdfExportOptions): Promise<void> => {
    const [{ jsPDF }, autoTableModule] = await Promise.all([
        loadJsPdf(),
        loadJsPdfAutoTable()
    ]);
    const autoTable = autoTableModule.default || autoTableModule;

    const isLandscape = orientation === 'landscape';
    const doc = new jsPDF({
        orientation: isLandscape ? 'landscape' : 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = isLandscape ? 12 : 10;
    let currentY = 10;

    const getSantriName = (id?: number): string => {
        if (!id) return '-';
        const s = santriList.find(santri => santri.id === id);
        return s ? s.namaLengkap : '-';
    };

    const sholatList = ['Subuh', 'Dzuhur', 'Ashar', 'Maghrib', 'Isya'] as const;
    const daysName = ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

    const startDate = weekDates[0];
    const endDate = weekDates[weekDates.length - 1];
    const hijriStart = startDate ? getHijriDate(new Date(startDate), settings.hijriAdjustment || 0) : null;
    const hijriEnd = endDate ? getHijriDate(new Date(endDate), settings.hijriAdjustment || 0) : null;

    const periodMasehi = startDate && endDate
        ? `${formatDate(startDate)} s/d ${formatDate(endDate)}`
        : '';
    const periodHijri = hijriStart && hijriEnd
        ? `${hijriStart.day} ${hijriStart.month} - ${hijriEnd.day} ${hijriEnd.month} ${hijriEnd.year} H`
        : '';

    // --- 1. KOP SURAT PESANTREN ---
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(isLandscape ? 14 : 13);
    doc.setTextColor(15, 118, 110); // Teal 700
    const namaPonpes = (settings.namaPonpes || 'PONDOK PESANTREN').toUpperCase();
    doc.text(namaPonpes, pageWidth / 2, currentY, { align: 'center' });
    currentY += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(isLandscape ? 8.5 : 8);
    doc.setTextColor(71, 85, 105); // Slate 600
    const alamatPonpes = settings.alamat || 'Alamat Pesantren';
    doc.text(alamatPonpes, pageWidth / 2, currentY, { align: 'center' });
    currentY += 4;

    if (settings.telepon) {
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        doc.text(`Kontak / Telp: ${settings.telepon}`, pageWidth / 2, currentY, { align: 'center' });
        currentY += 3.5;
    }

    // Double Rule Under Kop
    doc.setDrawColor(15, 118, 110);
    doc.setLineWidth(0.8);
    doc.line(marginX, currentY, pageWidth - marginX, currentY);
    currentY += 0.8;
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.line(marginX, currentY, pageWidth - marginX, currentY);
    currentY += 4;

    // --- 2. JUDUL DOKUMEN & PERIODE ---
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(isLandscape ? 11 : 10);
    doc.setTextColor(15, 23, 42); // Slate 900
    doc.text('JADWAL PETUGAS ADZAN & IMAM SHOLAT FARDHU', pageWidth / 2, currentY, { align: 'center' });
    currentY += 4.5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    let periodeLabel = `Periode: ${periodMasehi}`;
    if (periodHijri) {
        periodeLabel += `  •  ( ${periodHijri} )`;
    }
    doc.text(periodeLabel, pageWidth / 2, currentY, { align: 'center' });
    currentY += 4;

    // --- 3. AUTO TABLE JADWAL PIKET ---
    const tableBody: any[][] = [];

    weekDates.forEach((dateStr) => {
        const d = new Date(dateStr + 'T00:00:00');
        const dayIdx = d.getDay();
        const dayName = daysName[dayIdx];
        const hijri = getHijriDate(d, settings.hijriAdjustment || 0);

        const row: any[] = [];

        // Col 0: Hari & Tanggal (Format ringkas agar tidak terpotong atau terputus antar baris)
        const masehiStr = `${d.getDate()} ${d.toLocaleDateString('id-ID', { month: 'short' })} ${d.getFullYear()}`;
        const hijriText = hijri.day ? `${hijri.day} ${hijri.month}` : '';
        row.push({
            content: `${dayName}\n${masehiStr}\n${hijriText}`,
            isFriday: dayIdx === 5,
            isSunday: dayIdx === 0
        });

        // 5 Sholat Columns
        sholatList.forEach((sholat) => {
            const item = piketList.find(p => p.tanggal === dateStr && p.sholat === sholat);
            const muadzin = getSantriName(item?.muadzinSantriId);
            const imam = getSantriName(item?.imamSantriId);

            row.push({
                content: `M: ${muadzin}\nI : ${imam}`,
                muadzin,
                imam
            });
        });

        tableBody.push(row);
    });

    const colWidthDay = isLandscape ? 38 : 32;
    const colWidthSholat = isLandscape ? 47.8 : 31.6;

    autoTable(doc, {
        startY: currentY,
        margin: { left: marginX, right: marginX },
        head: [
            [
                { content: 'Hari / Tanggal', styles: { halign: 'center', valign: 'middle' } },
                { content: 'Subuh\n(Muadzin & Imam)', styles: { halign: 'center' } },
                { content: 'Dzuhur\n(Muadzin & Imam)', styles: { halign: 'center' } },
                { content: 'Ashar\n(Muadzin & Imam)', styles: { halign: 'center' } },
                { content: 'Maghrib\n(Muadzin & Imam)', styles: { halign: 'center' } },
                { content: 'Isya\n(Muadzin & Imam)', styles: { halign: 'center' } }
            ]
        ],
        body: tableBody.map(r => r.map(c => c.content)),
        theme: 'grid',
        headStyles: {
            fillColor: [15, 118, 110], // Deep Teal
            textColor: [255, 255, 255],
            fontSize: isLandscape ? 8.5 : 7.5,
            fontStyle: 'bold',
            cellPadding: 2,
            lineColor: [13, 94, 88],
            lineWidth: 0.2
        },
        styles: {
            fontSize: isLandscape ? 7.8 : 7,
            cellPadding: isLandscape ? 2 : 1.5,
            lineColor: [203, 213, 225],
            lineWidth: 0.2,
            textColor: [30, 41, 59],
            valign: 'middle',
            overflow: 'linebreak',
            minCellHeight: isLandscape ? 12 : 10
        },
        columnStyles: {
            0: { cellWidth: colWidthDay, fontStyle: 'bold', fillColor: [248, 250, 252] },
            1: { cellWidth: colWidthSholat },
            2: { cellWidth: colWidthSholat },
            3: { cellWidth: colWidthSholat },
            4: { cellWidth: colWidthSholat },
            5: { cellWidth: colWidthSholat }
        },
        alternateRowStyles: {
            fillColor: [255, 255, 255]
        },
        didParseCell: (data: any) => {
            // Highlight Friday in soft teal
            if (data.section === 'body') {
                const rowIdx = data.row.index;
                const rowDate = weekDates[rowIdx];
                if (rowDate) {
                    const d = new Date(rowDate + 'T00:00:00');
                    if (d.getDay() === 5) { // Jumat
                        if (data.column.index === 0) {
                            data.cell.styles.fillColor = [204, 251, 241]; // Light teal
                            data.cell.styles.textColor = [15, 118, 110];
                        } else {
                            data.cell.styles.fillColor = [240, 253, 250]; // Very soft teal
                        }
                    }
                }
            }
        }
    });

    const finalY = (doc as any).lastAutoTable?.finalY || (currentY + 80);
    let afterTableY = finalY + 4;

    // --- 4. TATA TERTIB / KETENTUAN SHOLAT ---
    const showKetentuan = piketConfig?.showKetentuan !== false;
    if (showKetentuan) {
        const boxWidth = pageWidth - (marginX * 2);
        const rules = (piketConfig?.ketentuanList && piketConfig.ketentuanList.length > 0)
            ? piketConfig.ketentuanList
            : [
                '1. Muadzin hadir di masjid sekurang-kurangnya 10 menit sebelum waktu adzan tiba.',
                '2. Muadzin langsung mengumandangkan iqomah setelah jeda sholat sunnah qabliyah (3-5 menit).',
                '3. Imam santri bertugas sebagai latihan kepemimpinan ibadah & imam badal apabila Ustadz/Kyai udzur.',
                '4. Petugas yang berhalangan (sakit/izin) wajib melapor ke Pengurus Asrama dan mencari pengganti (badal).'
            ];
        const judul = piketConfig?.judulKetentuan?.trim() || 'KETENTUAN PETUGAS SHOLAT FARDHU:';
        const boxHeight = isLandscape ? Math.max(17, Math.ceil(rules.length / 2) * 5 + 6) : (rules.length * 4 + 7);

        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.2);
        doc.roundedRect(marginX, afterTableY, boxWidth, boxHeight, 1.5, 1.5, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(15, 23, 42);
        doc.text(judul, marginX + 3, afterTableY + 3.8);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(isLandscape ? 7 : 6.5);
        doc.setTextColor(51, 65, 85);

        if (isLandscape && rules.length <= 4) {
            if (rules[0]) doc.text(rules[0], marginX + 3, afterTableY + 8);
            if (rules[1]) doc.text(rules[1], marginX + 3, afterTableY + 12);
            if (rules[2]) doc.text(rules[2], marginX + (boxWidth / 2) + 2, afterTableY + 8);
            if (rules[3]) doc.text(rules[3], marginX + (boxWidth / 2) + 2, afterTableY + 12);
        } else {
            rules.forEach((rule, idx) => {
                doc.text(rule, marginX + 3, afterTableY + 7.5 + (idx * 3.5));
            });
        }

        afterTableY += boxHeight + 4;
    }

    // --- 5. TANDA TANGAN (SIGNATURES) ---
    const showTandaTangan = piketConfig?.showTandaTangan !== false;
    if (showTandaTangan) {
        const sigY = Math.min(afterTableY, pageHeight - 34);
        const colSigWidth = 60;
        const rightSigX = pageWidth - marginX - colSigWidth;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(30, 41, 59);

        // Kiri: Pengasuh / Pimpinan
        const leftTitle = piketConfig?.leftTitle?.trim() || 'Pengasuh / Pimpinan Pondok';
        const rawLeftName = piketConfig?.leftName?.trim() || settings.namaMudir?.trim() || '';
        const leftNameStr = rawLeftName ? (rawLeftName.startsWith('(') ? rawLeftName : `( ${rawLeftName} )`) : '( ........................................... )';

        doc.text('Mengetahui,', marginX + (colSigWidth / 2), sigY, { align: 'center' });
        doc.setFont('helvetica', 'bold');
        doc.text(leftTitle, marginX + (colSigWidth / 2), sigY + 3.5, { align: 'center' });
        doc.text(leftNameStr, marginX + (colSigWidth / 2), sigY + 18, { align: 'center' });

        // Kanan: Bagian Ibadah
        const rightTitle = piketConfig?.rightTitle?.trim() || 'Bagian Keasramaan & Ibadah';
        const rawRightName = piketConfig?.rightName?.trim() || '';
        const rightNameStr = rawRightName ? (rawRightName.startsWith('(') ? rawRightName : `( ${rawRightName} )`) : '( ........................................... )';

        const kota = piketConfig?.tempat?.trim() || customTempat?.trim() || resolveTempatPesantren(settings);
        const tanggalCetak = formatDate(new Date());
        doc.setFont('helvetica', 'normal');
        doc.text(`${kota}, ${tanggalCetak}`, rightSigX + (colSigWidth / 2), sigY, { align: 'center' });
        doc.setFont('helvetica', 'bold');
        doc.text(rightTitle, rightSigX + (colSigWidth / 2), sigY + 3.5, { align: 'center' });
        doc.text(rightNameStr, rightSigX + (colSigWidth / 2), sigY + 18, { align: 'center' });
    }

    // --- 6. FOOTER WATERMARK ---
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184); // Slate 400
    doc.text('Dokumen Resmi Jadwal Piket Ibadah Santri', marginX, pageHeight - 5);
    doc.text('dibuat dengan eSantri Web by AI Projek | aiprojek01.my.id', pageWidth - marginX, pageHeight - 5, { align: 'right' });

    const outputName = fileName || `Jadwal_Piket_${startDate}_sd_${endDate}.pdf`;
    doc.save(outputName.endsWith('.pdf') ? outputName : `${outputName}.pdf`);
};
