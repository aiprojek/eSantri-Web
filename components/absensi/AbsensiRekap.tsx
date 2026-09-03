import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAppContext } from '../../AppContext';
import { useSantriContext } from '../../contexts/SantriContext';
import { Santri, SesiAbsensi } from '../../types';
import { SESI_ABSENSI_LIST, AtRiskSantriInfo } from './absensiConstants';
import { AbsensiWarningBanner } from './AbsensiWarningBanner';
import { AbsensiWaModal, AbsentStudentItem } from './AbsensiWaModal';
import { AbsensiBkModal } from './AbsensiBkModal';
import { PrintHeader } from '../common/PrintHeader';
import { ReportFooter } from '../reports/modules/Common';
import { loadJsPdf, loadJsPdfAutoTable, loadXLSX } from '../../utils/lazyClientLibs';
import { buildStandardExportFileName } from '../../utils/exportFileName';
import { printExportFacade } from '../../utils/printExportFacade';
import { MobileFilterDrawer } from '../common/MobileFilterDrawer';
import { AbsensiImportModal } from './AbsensiImportModal';

export const AbsensiRekap: React.FC = () => {
    const { settings, showToast } = useAppContext();
    const { santriList, absensiList } = useSantriContext();
    
    const now = new Date();
    const [bulanMulai, setBulanMulai] = useState(now.getMonth() + 1);
    const [bulanSelesai, setBulanSelesai] = useState(now.getMonth() + 1);
    const [tahun, setTahun] = useState(now.getFullYear());
    const [jenjangId, setJenjangId] = useState<number>(0);
    const [kelasId, setKelasId] = useState<number>(0);
    const [rombelId, setRombelId] = useState<number>(0);
    const [selectedSesiFilter, setSelectedSesiFilter] = useState<string>('Semua Sesi');
    const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
    const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const exportMenuRef = useRef<HTMLDivElement>(null);

    // Modals
    const [isWaModalOpen, setIsWaModalOpen] = useState(false);
    const [waInitialSantriId, setWaInitialSantriId] = useState<number | null>(null);
    const [isBkModalOpen, setIsBkModalOpen] = useState(false);
    const [bkTargetSantri, setBkTargetSantri] = useState<Santri | null>(null);
    const [bkTargetReason, setBkTargetReason] = useState<string>('');

    const availableKelas = useMemo(() => (
        jenjangId ? settings.kelas.filter(k => k.jenjangId === jenjangId) : settings.kelas
    ), [jenjangId, settings.kelas]);
    const availableRombel = useMemo(() => (
        kelasId ? settings.rombel.filter(r => r.kelasId === kelasId) : settings.rombel
    ), [kelasId, settings.rombel]);

    useEffect(() => {
        if (!rombelId && availableRombel.length > 0) {
            setRombelId(availableRombel[0].id);
        }
    }, [availableRombel, rombelId]);

    // Close export menu on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
                setIsExportMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const selectedRombel = useMemo(() => settings.rombel.find(r => r.id === rombelId), [rombelId, settings.rombel]);
    const selectedKelas = useMemo(() => settings.kelas.find(k => k.id === selectedRombel?.kelasId), [settings.kelas, selectedRombel]);
    const selectedJenjang = useMemo(() => settings.jenjang.find(j => j.id === selectedKelas?.jenjangId), [settings.jenjang, selectedKelas]);
    
    const santriInRombel = useMemo(() => santriList.filter(s => s.rombelId === rombelId && s.status === 'Aktif').sort((a,b) => a.namaLengkap.localeCompare(b.namaLengkap)), [santriList, rombelId]);
    const normalizedMonthRange = useMemo(() => {
        const start = Math.max(1, Math.min(12, bulanMulai));
        const end = Math.max(1, Math.min(12, bulanSelesai));
        return start <= end ? { start, end } : { start: end, end: start };
    }, [bulanMulai, bulanSelesai]);
    const monthRange = useMemo(() => {
        const months: number[] = [];
        for (let m = normalizedMonthRange.start; m <= normalizedMonthRange.end; m++) months.push(m);
        return months;
    }, [normalizedMonthRange]);
    const getPeriodeName = (month: number) =>
        new Date(tahun, month - 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    const previewMonth = monthRange[0] ?? now.getMonth() + 1;
    const daysInMonth = useMemo(() => new Date(tahun, previewMonth, 0).getDate(), [tahun, previewMonth]);

    const buildAttendanceForMonth = (month: number) => {
        const matrix: Record<number, Record<number, string>> = {};
        const stats: Record<number, { H: number, S: number, I: number, A: number }> = {};

        santriInRombel.forEach(s => {
            matrix[s.id] = {};
            stats[s.id] = { H: 0, S: 0, I: 0, A: 0 };
        });

        const records = absensiList.filter(a => {
            const d = new Date(a.tanggal);
            const matchSesi = selectedSesiFilter === 'Semua Sesi' || (a.sesi || 'KBM Pagi') === selectedSesiFilter;
            return a.rombelId === rombelId && d.getMonth() + 1 === month && d.getFullYear() === tahun && matchSesi;
        });

        records.forEach(r => {
            const dateNum = new Date(r.tanggal).getDate();
            if (matrix[r.santriId]) {
                matrix[r.santriId][dateNum] = r.status;
                if (['H', 'S', 'I', 'A'].includes(r.status)) {
                    stats[r.santriId][r.status as 'H'|'S'|'I'|'A']++;
                }
            }
        });

        return { matrix, stats };
    };

    const attendanceMatrix = useMemo(() => {
        return buildAttendanceForMonth(previewMonth);
    }, [absensiList, rombelId, previewMonth, tahun, santriInRombel, selectedSesiFilter]);

    // Total Stats for the whole class
    const classStats = useMemo(() => {
        const total = { H: 0, S: 0, I: 0, A: 0 };
        monthRange.forEach((month) => {
            const monthData = buildAttendanceForMonth(month);
            Object.values(monthData.stats).forEach(s => {
                const stat = s as { H: number; S: number; I: number; A: number };
                total.H += stat.H; total.S += stat.S; total.I += stat.I; total.A += stat.A;
            });
        });
        return total;
    }, [monthRange, absensiList, rombelId, tahun, santriInRombel, selectedSesiFilter]);

    // Calculate at-risk students for the selected month/rekap
    const atRiskStudents = useMemo<AtRiskSantriInfo[]>(() => {
        if (!rombelId || santriInRombel.length === 0) return [];

        const list: AtRiskSantriInfo[] = [];
        santriInRombel.forEach(s => {
            const stat = attendanceMatrix.stats[s.id];
            if (!stat) return;
            const totalRecorded = stat.H + stat.S + stat.I + stat.A;
            const rate = totalRecorded > 0 ? (stat.H / totalRecorded) * 100 : 100;

            if (stat.A >= 3 || (totalRecorded >= 5 && rate < 80)) {
                list.push({
                    santriId: s.id,
                    namaLengkap: s.namaLengkap,
                    nis: s.nis,
                    alphaCount: stat.A,
                    sakitCount: stat.S,
                    izinCount: stat.I,
                    hadirCount: stat.H,
                    totalDays: totalRecorded,
                    attendanceRate: rate,
                    reasons: [`Rekap ${getPeriodeName(previewMonth)}: ${stat.A}x Alpha, ${stat.S}x Sakit, ${stat.I}x Izin`]
                });
            }
        });
        return list.sort((a, b) => b.alphaCount - a.alphaCount);
    }, [rombelId, santriInRombel, attendanceMatrix, previewMonth, tahun]);

    const handlePrint = async () => {
        if (isExporting) return;
        setIsExporting(true);
        const fileName = buildStandardExportFileName('rekap-absensi', [
            selectedJenjang?.nama || 'semua-marhalah',
            selectedKelas?.nama || 'semua-kelas',
            selectedRombel?.nama || 'semua-rombel',
            monthRange.length > 1
                ? `bulan-${normalizedMonthRange.start}-${normalizedMonthRange.end}`
                : `bulan-${previewMonth}`,
            `tahun-${tahun}`,
        ]);
        try {
            await printExportFacade.printDialog({
                elementId: 'absensi-rekap-print-area',
                fileName,
                paperSize: 'A4',
                target: 'report',
            });
        } finally {
            setIsExporting(false);
        }
    };

    const handleExport = async (type: 'pdf' | 'xlsx' | 'pdfImage' | 'csv' | 'html') => {
        if (isExporting) return;
        setIsExporting(true);
        setIsExportMenuOpen(false);

        const fileName = buildStandardExportFileName('rekap-absensi', [
            selectedJenjang?.nama || 'semua-marhalah',
            selectedKelas?.nama || 'semua-kelas',
            selectedRombel?.nama || 'semua-rombel',
            monthRange.length > 1
                ? `bulan-${normalizedMonthRange.start}-${normalizedMonthRange.end}`
                : `bulan-${previewMonth}`,
            `tahun-${tahun}`,
        ]);

        try {
            if (type === 'pdfImage') {
                await printExportFacade.downloadPdfImage({
                    elementId: 'absensi-rekap-print-area',
                    fileName,
                    paperSize: 'A4',
                });
                showToast('Rekap absensi berhasil diekspor ke PDF Gambar.', 'success');
                return;
            }

            if (type === 'csv') {
                const lines: string[] = [];
                lines.push(`"REKAPITULASI ABSENSI SANTRI"`);
                lines.push(`"Lembaga: ${settings.namaPonpes || settings.namaYayasan || 'Pondok Pesantren'}"`);
                lines.push(`"Marhalah: ${selectedJenjang?.nama || '-'} | Kelas: ${selectedKelas?.nama || '-'} | Rombel: ${selectedRombel?.nama || '-'}"`);
                lines.push(`"Sesi: ${selectedSesiFilter} | Tahun: ${tahun}"`);
                lines.push(`""`);

                monthRange.forEach((month) => {
                    const monthDays = new Date(tahun, month, 0).getDate();
                    const monthData = buildAttendanceForMonth(month);
                    lines.push(`"PERIODE: ${getPeriodeName(month).toUpperCase()}"`);
                    
                    const header = [
                        'No', 'NIS', 'Nama Santri',
                        ...Array.from({length: monthDays}, (_, i) => `${i+1}`),
                        'Sakit (S)', 'Izin (I)', 'Alpha (A)', 'Hadir (H)', 'Tingkat Kehadiran (%)'
                    ];
                    lines.push(header.map(h => `"${h}"`).join(';'));

                    santriInRombel.forEach((s, idx) => {
                        const days = Array.from({length: monthDays}, (_, d) => monthData.matrix[s.id][d+1] || '-');
                        const st = monthData.stats[s.id];
                        const total = st.H + st.S + st.I + st.A;
                        const rate = total > 0 ? ((st.H / total) * 100).toFixed(1) + '%' : '100%';
                        const row = [
                            String(idx + 1),
                            s.nis || '',
                            s.namaLengkap.replace(/"/g, '""'),
                            ...days,
                            String(st.S),
                            String(st.I),
                            String(st.A),
                            String(st.H),
                            rate
                        ];
                        lines.push(row.map(cell => `"${cell}"`).join(';'));
                    });
                    lines.push(`""`);
                });

                const csvContent = '\uFEFF' + lines.join('\r\n');
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${fileName}.csv`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                showToast('Rekap absensi berhasil diekspor ke CSV.', 'success');
                return;
            }

            if (type === 'html') {
                const dateStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
                let tablesHtml = '';

                monthRange.forEach((month) => {
                    const monthDays = new Date(tahun, month, 0).getDate();
                    const monthData = buildAttendanceForMonth(month);

                    let thDays = '';
                    for (let d = 1; d <= monthDays; d++) {
                        thDays += `<th style="padding: 4px; border: 1px solid #cbd5e1; text-align: center; width: 22px; font-size: 10px;">${d}</th>`;
                    }

                    let rowsHtml = '';
                    santriInRombel.forEach((s, idx) => {
                        const st = monthData.stats[s.id];
                        const total = st.H + st.S + st.I + st.A;
                        const rate = total > 0 ? ((st.H / total) * 100).toFixed(1) + '%' : '100%';
                        
                        let tdDays = '';
                        for (let d = 1; d <= monthDays; d++) {
                            const status = monthData.matrix[s.id][d] || '';
                            let colorStyle = 'color: #94a3b8;';
                            if (status === 'H') colorStyle = 'background-color: #dcfce7; color: #15803d; font-weight: bold;';
                            else if (status === 'S') colorStyle = 'background-color: #fef9c3; color: #a16207; font-weight: bold;';
                            else if (status === 'I') colorStyle = 'background-color: #dbeafe; color: #1d4ed8; font-weight: bold;';
                            else if (status === 'A') colorStyle = 'background-color: #fee2e2; color: #b91c1c; font-weight: bold;';
                            
                            tdDays += `<td style="padding: 4px; border: 1px solid #cbd5e1; text-align: center; ${colorStyle} font-size: 10px;">${status || '-'}</td>`;
                        }

                        rowsHtml += `
                            <tr style="${idx % 2 === 0 ? 'background-color: #ffffff;' : 'background-color: #f8fafc;'}">
                                <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: center; font-size: 11px;">${idx + 1}</td>
                                <td style="padding: 6px; border: 1px solid #cbd5e1; font-size: 11px;">${s.nis || '-'}</td>
                                <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: left; font-weight: 600; font-size: 11px;">${s.namaLengkap}</td>
                                ${tdDays}
                                <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold; color: #a16207; font-size: 11px;">${st.S}</td>
                                <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold; color: #1d4ed8; font-size: 11px;">${st.I}</td>
                                <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold; color: #b91c1c; font-size: 11px;">${st.A}</td>
                                <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold; color: #15803d; font-size: 11px;">${st.H}</td>
                                <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold; font-size: 11px;">${rate}</td>
                            </tr>
                        `;
                    });

                    tablesHtml += `
                        <div style="margin-bottom: 30px; page-break-after: always;">
                            <h3 style="font-size: 13px; font-weight: bold; color: #0f172a; margin-bottom: 8px; border-bottom: 2px solid #0d9488; padding-bottom: 4px;">
                                Periode: ${getPeriodeName(month)} (${selectedSesiFilter})
                            </h3>
                            <table style="width: 100%; border-collapse: collapse; text-align: center; font-family: sans-serif;">
                                <thead>
                                    <tr style="background-color: #f1f5f9; color: #334155; font-size: 11px; font-weight: bold;">
                                        <th rowspan="2" style="padding: 6px; border: 1px solid #cbd5e1; width: 30px;">No</th>
                                        <th rowspan="2" style="padding: 6px; border: 1px solid #cbd5e1; width: 70px;">NIS</th>
                                        <th rowspan="2" style="padding: 6px; border: 1px solid #cbd5e1; text-align: left; min-width: 150px;">Nama Santri</th>
                                        <th colspan="${monthDays}" style="padding: 6px; border: 1px solid #cbd5e1;">Tanggal</th>
                                        <th colspan="4" style="padding: 6px; border: 1px solid #cbd5e1;">Akumulasi</th>
                                        <th rowspan="2" style="padding: 6px; border: 1px solid #cbd5e1; width: 55px;">% Hadir</th>
                                    </tr>
                                    <tr style="background-color: #f8fafc; color: #475569; font-size: 10px;">
                                        ${thDays}
                                        <th style="padding: 4px; border: 1px solid #cbd5e1; color: #a16207; width: 25px;">S</th>
                                        <th style="padding: 4px; border: 1px solid #cbd5e1; color: #1d4ed8; width: 25px;">I</th>
                                        <th style="padding: 4px; border: 1px solid #cbd5e1; color: #b91c1c; width: 25px;">A</th>
                                        <th style="padding: 4px; border: 1px solid #cbd5e1; color: #15803d; width: 25px;">H</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${rowsHtml}
                                </tbody>
                            </table>
                        </div>
                    `;
                });

                const htmlDoc = `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Rekap Presensi - ${selectedRombel?.nama || 'Pesantren'}</title>
    <style>
        @page { size: landscape; margin: 12mm; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; margin: 0; padding: 20px; font-size: 12px; background: #fff; }
        .kop-container { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 16px; }
        .kop-title { font-size: 16px; font-weight: bold; text-transform: uppercase; margin: 0; }
        .kop-sub { font-size: 11px; color: #475569; margin: 3px 0 0 0; }
        .meta-info { display: flex; justify-content: space-between; margin-bottom: 14px; font-size: 11px; }
        @media print {
            body { padding: 0; }
        }
    </style>
</head>
<body>
    <div class="kop-container">
        <h1 class="kop-title">${settings.namaPonpes || settings.namaYayasan || 'PONDOK PESANTREN'}</h1>
        <p class="kop-sub">${settings.alamat || ''} ${settings.telepon ? '• Telp: ' + settings.telepon : ''}</p>
        <p style="font-size: 12px; font-weight: bold; margin-top: 5px; text-transform: uppercase;">
            REKAPITULASI PRESENSI SANTRI
        </p>
    </div>

    <div class="meta-info">
        <div>
            <div><strong>Marhalah:</strong> ${selectedJenjang?.nama || '-'}</div>
            <div><strong>Kelas / Rombel:</strong> ${selectedKelas?.nama || '-'} / ${selectedRombel?.nama || '-'}</div>
        </div>
        <div style="text-align: right;">
            <div><strong>Tahun:</strong> ${tahun}</div>
            <div><strong>Sesi:</strong> ${selectedSesiFilter}</div>
        </div>
    </div>

    ${tablesHtml}

    <div style="margin-top: 30px; display: flex; justify-content: space-between; font-size: 11px;">
        <div style="text-align: center; width: 200px;">
            <p>Mengetahui,</p>
            <p style="font-weight: bold; margin-top: 50px;">Mudir / Kepala Pondok</p>
        </div>
        <div style="text-align: center; width: 200px;">
            <p>${settings.alamat?.split(',')[0] || 'Pesantren'}, ${dateStr}</p>
            <p style="font-weight: bold; margin-top: 50px;">Wali Kelas / Ustadz Pengampu</p>
        </div>
    </div>
</body>
</html>`;

                const blob = new Blob([htmlDoc], { type: 'text/html;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${fileName}.html`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                showToast('Dokumen HTML rekap absensi berhasil diunduh.', 'success');
                return;
            }

            if (type === 'pdf') {
                const { jsPDF } = await loadJsPdf();
                await loadJsPdfAutoTable();
                const doc = new jsPDF('landscape', 'mm', 'a4');

                monthRange.forEach((month, idx) => {
                    if (idx > 0) doc.addPage('a4', 'landscape');
                    const monthDays = new Date(tahun, month, 0).getDate();
                    const monthData = buildAttendanceForMonth(month);

                    doc.setFontSize(14);
                    doc.text(settings.namaPonpes || 'PONDOK PESANTREN', 148, 15, { align: 'center' });
                    doc.setFontSize(10);
                    doc.text(`REKAPITULASI ABSENSI ${selectedJenjang?.nama?.toUpperCase() || '-'} / ${selectedKelas?.nama?.toUpperCase() || '-'} / ${selectedRombel?.nama?.toUpperCase() || '-'}`, 148, 20, { align: 'center' });
                    doc.text(`PERIODE: ${getPeriodeName(month).toUpperCase()} (${selectedSesiFilter.toUpperCase()})`, 148, 25, { align: 'center' });

                    const headers = [
                        ['No', 'NIS', 'Nama Santri', ...Array.from({length: monthDays}, (_, i) => `${i+1}`), 'S', 'I', 'A', 'H', '%']
                    ];

                    const rows = santriInRombel.map((s, i) => {
                        const days = Array.from({length: monthDays}, (_, d) => monthData.matrix[s.id][d+1] || '');
                        const st = monthData.stats[s.id];
                        const total = st.H + st.S + st.I + st.A;
                        const rate = total > 0 ? ((st.H / total) * 100).toFixed(0) + '%' : '100%';
                        return [
                            i + 1,
                            s.nis || '-',
                            s.namaLengkap,
                            ...days,
                            st.S,
                            st.I,
                            st.A,
                            st.H,
                            rate
                        ];
                    });

                    (doc as any).autoTable({
                        head: headers,
                        body: rows,
                        startY: 30,
                        styles: { fontSize: 7, cellPadding: 1, halign: 'center' },
                        columnStyles: {
                            0: { cellWidth: 8 },
                            1: { cellWidth: 16 },
                            2: { halign: 'left', cellWidth: 38 }
                        },
                        theme: 'grid'
                    });
                });

                doc.save(`${fileName}.pdf`);
                showToast('Rekap absensi berhasil diekspor ke PDF Tabel.', 'success');
            } else if (type === 'xlsx') {
                const XLSX = await loadXLSX();
                const wb = XLSX.utils.book_new();

                monthRange.forEach((month) => {
                    const monthDays = new Date(tahun, month, 0).getDate();
                    const monthData = buildAttendanceForMonth(month);

                    const sheetData: any[] = [];
                    sheetData.push([`REKAP ABSENSI - ${getPeriodeName(month)}`]);
                    sheetData.push([`Rombel: ${selectedRombel?.nama || '-'} | Sesi: ${selectedSesiFilter} | Tahun: ${tahun}`]);
                    sheetData.push([]);

                    const headers = ['No', 'NIS', 'Nama Santri', ...Array.from({length: monthDays}, (_, i) => `${i+1}`), 'Sakit', 'Izin', 'Alpha', 'Hadir', 'Kehadiran (%)'];
                    sheetData.push(headers);

                    santriInRombel.forEach((s, idx) => {
                        const days = Array.from({length: monthDays}, (_, d) => monthData.matrix[s.id][d+1] || '-');
                        const st = monthData.stats[s.id];
                        const total = st.H + st.S + st.I + st.A;
                        const rate = total > 0 ? ((st.H / total) * 100).toFixed(1) + '%' : '100%';
                        sheetData.push([
                            idx + 1,
                            s.nis,
                            s.namaLengkap,
                            ...days,
                            st.S,
                            st.I,
                            st.A,
                            st.H,
                            rate
                        ]);
                    });

                    const ws = XLSX.utils.aoa_to_sheet(sheetData);
                    const sheetName = new Date(tahun, month - 1).toLocaleString('id-ID', { month: 'short' });
                    XLSX.utils.book_append_sheet(wb, ws, `${sheetName} ${tahun}`);
                });

                XLSX.writeFile(wb, `${fileName}.xlsx`);
                showToast('Rekap absensi berhasil diekspor ke Excel.', 'success');
            }
        } catch (error) {
            console.error('Export error:', error);
            showToast('Gagal melakukan export data absensi.', 'error');
        } finally {
            setIsExporting(false);
        }
    };

    const handleOpenWaSingle = (santriId: number) => {
        setWaInitialSantriId(santriId);
        setIsWaModalOpen(true);
    };

    const handleOpenBkModal = (santri: Santri, reason: string) => {
        setBkTargetSantri(santri);
        setBkTargetReason(reason);
        setIsBkModalOpen(true);
    };

    return (
        <div className="space-y-6">
            {/* Filter & Export Card */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                        <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                            <i className="bi bi-file-earmark-spreadsheet text-teal-600"></i>
                            Rekapitulasi Kehadiran Santri
                        </h3>
                        <p className="text-xs text-gray-500">
                            Matriks bulanan, status H/S/I/A, deteksi ketidakhadiran berulang, serta ekspor dokumen resmi.
                        </p>
                    </div>

                    <div className="md:hidden w-full">
                        <button
                            type="button"
                            onClick={() => setIsFilterDrawerOpen(true)}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-50 text-teal-700 border border-teal-200 rounded-xl font-bold text-xs shadow-xs"
                        >
                            <i className="bi bi-funnel-fill"></i>
                            <span>Filter & Export Rekap</span>
                        </button>
                    </div>
                </div>

                {/* Desktop Filters */}
                <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-8 gap-3">
                    <div>
                        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-gray-500">Bulan Mulai</label>
                        <select value={bulanMulai} onChange={e => setBulanMulai(Number(e.target.value))} className="w-full border rounded-xl p-2 text-xs bg-white">
                            {Array.from({length: 12}, (_, i) => <option key={i} value={i+1}>{new Date(0, i).toLocaleString('id-ID', {month:'long'})}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-gray-500">Bulan Selesai</label>
                        <select value={bulanSelesai} onChange={e => setBulanSelesai(Number(e.target.value))} className="w-full border rounded-xl p-2 text-xs bg-white">
                            {Array.from({length: 12}, (_, i) => <option key={i} value={i+1}>{new Date(0, i).toLocaleString('id-ID', {month:'long'})}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-gray-500">Tahun</label>
                        <select value={tahun} onChange={e => setTahun(Number(e.target.value))} className="w-full border rounded-xl p-2 text-xs bg-white">
                            {Array.from({length: 5}, (_, i) => <option key={i} value={now.getFullYear() - 2 + i}>{now.getFullYear() - 2 + i}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-gray-500">Sesi Presensi</label>
                        <select value={selectedSesiFilter} onChange={e => setSelectedSesiFilter(e.target.value)} className="w-full border rounded-xl p-2 text-xs bg-white font-medium">
                            <option value="Semua Sesi">Semua Sesi</option>
                            {SESI_ABSENSI_LIST.map(sesi => <option key={sesi} value={sesi}>{sesi}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-gray-500">Marhalah</label>
                        <select value={jenjangId} onChange={e => { setJenjangId(Number(e.target.value)); setKelasId(0); setRombelId(0); }} className="w-full border rounded-xl p-2 text-xs bg-white">
                            <option value={0}>Semua Marhalah</option>
                            {settings.jenjang.map(j => <option key={j.id} value={j.id}>{j.nama}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-gray-500">Kelas</label>
                        <select value={kelasId} onChange={e => { setKelasId(Number(e.target.value)); setRombelId(0); }} className="w-full border rounded-xl p-2 text-xs bg-white">
                            <option value={0}>Semua Kelas</option>
                            {availableKelas.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-gray-500">Rombel</label>
                        <select value={rombelId} onChange={e => setRombelId(Number(e.target.value))} className="w-full border rounded-xl p-2 text-xs bg-white font-medium">
                            {availableRombel.map(r => <option key={r.id} value={r.id}>{r.nama}</option>)}
                        </select>
                    </div>
                    <div className="relative" ref={exportMenuRef}>
                        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-gray-500">Unduh / Cetak</label>
                        <button 
                            disabled={isExporting} 
                            onClick={() => setIsExportMenuOpen(!isExportMenuOpen)} 
                            className="w-full bg-teal-600 text-white px-3 py-2 rounded-xl text-xs font-bold hover:bg-teal-700 flex items-center justify-center gap-1.5 disabled:opacity-60 shadow-xs cursor-pointer"
                        >
                            <i className={`bi ${isExporting ? 'bi-arrow-repeat animate-spin' : 'bi-download'}`}></i> 
                            {isExporting ? 'Proses...' : 'Export'}
                        </button>
                        {isExportMenuOpen && (
                            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl ring-1 ring-black/5 z-50 overflow-hidden text-xs py-1 border border-gray-100">
                                <button disabled={isExporting} onClick={() => handleExport('pdf')} className="w-full text-left px-4 py-2.5 hover:bg-gray-50 flex items-center gap-2 text-gray-700 cursor-pointer">
                                    <i className="bi bi-file-earmark-pdf text-red-500 text-sm"></i> 
                                    <span>PDF Tabel (Vektor)</span>
                                </button>
                                <button disabled={isExporting} onClick={() => handleExport('pdfImage')} className="w-full text-left px-4 py-2.5 hover:bg-gray-50 flex items-center gap-2 text-gray-700 cursor-pointer">
                                    <i className="bi bi-file-earmark-image text-orange-500 text-sm"></i> 
                                    <span>PDF Gambar (Canvas)</span>
                                </button>
                                <button disabled={isExporting} onClick={() => handleExport('xlsx')} className="w-full text-left px-4 py-2.5 hover:bg-gray-50 flex items-center gap-2 text-gray-700 cursor-pointer">
                                    <i className="bi bi-file-earmark-spreadsheet text-green-600 text-sm"></i> 
                                    <span>Excel (.xlsx)</span>
                                </button>
                                <button disabled={isExporting} onClick={() => handleExport('csv')} className="w-full text-left px-4 py-2.5 hover:bg-gray-50 flex items-center gap-2 text-gray-700 cursor-pointer">
                                    <i className="bi bi-filetype-csv text-blue-600 text-sm"></i> 
                                    <span>Data CSV (.csv)</span>
                                </button>
                                <button disabled={isExporting} onClick={() => handleExport('html')} className="w-full text-left px-4 py-2.5 hover:bg-gray-50 flex items-center gap-2 text-gray-700 cursor-pointer">
                                    <i className="bi bi-filetype-html text-amber-600 text-sm"></i> 
                                    <span>Dokumen Web (.html)</span>
                                </button>
                                <button disabled={isExporting} onClick={() => { setIsExportMenuOpen(false); setIsImportModalOpen(true); }} className="w-full text-left px-4 py-2.5 hover:bg-teal-50 flex items-center gap-2 text-teal-700 font-bold border-t border-gray-100 cursor-pointer">
                                    <i className="bi bi-cloud-arrow-up text-teal-600 text-sm"></i> 
                                    <span>Impor Massal Excel</span>
                                </button>
                                <button disabled={isExporting} onClick={handlePrint} className="w-full text-left px-4 py-2.5 hover:bg-gray-50 flex items-center gap-2 text-gray-700 border-t border-gray-100 cursor-pointer">
                                    <i className="bi bi-printer text-gray-600 text-sm"></i> 
                                    <span>Cetak Langsung (Print)</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Mobile Filter Drawer */}
            <MobileFilterDrawer
                isOpen={isFilterDrawerOpen}
                onClose={() => setIsFilterDrawerOpen(false)}
                title="Filter & Export Rekap"
            >
                <div className="space-y-4 text-xs">
                    <div>
                        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-gray-500">Bulan Mulai</label>
                        <select value={bulanMulai} onChange={e => setBulanMulai(Number(e.target.value))} className="w-full border rounded-xl p-3 text-xs bg-white">
                            {Array.from({length: 12}, (_, i) => <option key={i} value={i+1}>{new Date(0, i).toLocaleString('id-ID', {month:'long'})}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-gray-500">Bulan Selesai</label>
                        <select value={bulanSelesai} onChange={e => setBulanSelesai(Number(e.target.value))} className="w-full border rounded-xl p-3 text-xs bg-white">
                            {Array.from({length: 12}, (_, i) => <option key={i} value={i+1}>{new Date(0, i).toLocaleString('id-ID', {month:'long'})}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-gray-500">Tahun</label>
                        <select value={tahun} onChange={e => setTahun(Number(e.target.value))} className="w-full border rounded-xl p-3 text-xs bg-white">
                            {Array.from({length: 5}, (_, i) => <option key={i} value={now.getFullYear() - 2 + i}>{now.getFullYear() - 2 + i}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-gray-500">Sesi Presensi</label>
                        <select value={selectedSesiFilter} onChange={e => setSelectedSesiFilter(e.target.value)} className="w-full border rounded-xl p-3 text-xs bg-white font-medium">
                            <option value="Semua Sesi">Semua Sesi</option>
                            {SESI_ABSENSI_LIST.map(sesi => <option key={sesi} value={sesi}>{sesi}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-gray-500">Marhalah</label>
                        <select value={jenjangId} onChange={e => { setJenjangId(Number(e.target.value)); setKelasId(0); setRombelId(0); }} className="w-full border rounded-xl p-3 text-xs bg-white">
                            <option value={0}>Semua Marhalah</option>
                            {settings.jenjang.map(j => <option key={j.id} value={j.id}>{j.nama}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-gray-500">Kelas</label>
                        <select value={kelasId} onChange={e => { setKelasId(Number(e.target.value)); setRombelId(0); }} className="w-full border rounded-xl p-3 text-xs bg-white">
                            <option value={0}>Semua Kelas</option>
                            {availableKelas.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-gray-500">Rombel</label>
                        <select value={rombelId} onChange={e => setRombelId(Number(e.target.value))} className="w-full border rounded-xl p-3 text-xs bg-white">
                            {availableRombel.map(r => <option key={r.id} value={r.id}>{r.nama}</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-2">
                        <button disabled={isExporting} onClick={() => handleExport('pdf')} className="px-3 py-2.5 text-xs font-bold rounded-xl border border-red-200 text-red-700 bg-red-50 hover:bg-red-100 disabled:opacity-50">PDF Tabel</button>
                        <button disabled={isExporting} onClick={() => handleExport('xlsx')} className="px-3 py-2.5 text-xs font-bold rounded-xl border border-green-200 text-green-700 bg-green-50 hover:bg-green-100 disabled:opacity-50">Excel (.xlsx)</button>
                        <button disabled={isExporting} onClick={() => handleExport('csv')} className="px-3 py-2.5 text-xs font-bold rounded-xl border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 disabled:opacity-50">CSV (.csv)</button>
                        <button disabled={isExporting} onClick={() => handleExport('html')} className="px-3 py-2.5 text-xs font-bold rounded-xl border border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100 disabled:opacity-50">HTML (.html)</button>
                        <button disabled={isExporting} onClick={() => handleExport('pdfImage')} className="px-3 py-2.5 text-xs font-bold rounded-xl border border-orange-200 text-orange-700 bg-orange-50 hover:bg-orange-100 disabled:opacity-50">PDF Gambar</button>
                        <button disabled={isExporting} onClick={handlePrint} className="px-3 py-2.5 text-xs font-bold rounded-xl border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50">Cetak</button>
                    </div>
                </div>
            </MobileFilterDrawer>

            {/* Early Warning Banner if at-risk students are detected */}
            {atRiskStudents.length > 0 && (
                <AbsensiWarningBanner
                    atRiskStudents={atRiskStudents}
                    santriList={santriList}
                    onOpenBkModal={handleOpenBkModal}
                    onOpenWaModal={handleOpenWaSingle}
                />
            )}

            {/* Class Total Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-green-50/80 p-4 rounded-2xl border border-green-200 text-center shadow-2xs">
                    <div className="text-xs font-bold text-green-700 uppercase tracking-wider">Hadir (H)</div>
                    <div className="text-2xl font-black text-green-900 mt-0.5">{classStats.H}</div>
                </div>
                <div className="bg-yellow-50/80 p-4 rounded-2xl border border-yellow-200 text-center shadow-2xs">
                    <div className="text-xs font-bold text-yellow-700 uppercase tracking-wider">Sakit (S)</div>
                    <div className="text-2xl font-black text-yellow-900 mt-0.5">{classStats.S}</div>
                </div>
                <div className="bg-blue-50/80 p-4 rounded-2xl border border-blue-200 text-center shadow-2xs">
                    <div className="text-xs font-bold text-blue-700 uppercase tracking-wider">Izin (I)</div>
                    <div className="text-2xl font-black text-blue-900 mt-0.5">{classStats.I}</div>
                </div>
                <div className="bg-red-50/80 p-4 rounded-2xl border border-red-200 text-center shadow-2xs">
                    <div className="text-xs font-bold text-red-700 uppercase tracking-wider">Alpha (A)</div>
                    <div className="text-2xl font-black text-red-900 mt-0.5">{classStats.A}</div>
                </div>
            </div>

            {/* Monthly Attendance Table Matrix */}
            <div className="border border-gray-200 rounded-2xl bg-white overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                    <table className="w-full text-xs text-center border-collapse">
                        <thead className="bg-gray-100 text-gray-700 font-bold border-b border-gray-200">
                            <tr>
                                <th rowSpan={2} className="p-2 border w-8">No</th>
                                <th rowSpan={2} className="p-2 border text-left min-w-[180px] sticky left-0 bg-gray-100 z-10 shadow-xs">
                                    Nama Santri
                                </th>
                                <th colSpan={daysInMonth} className="p-1.5 border bg-teal-50/50 text-teal-900">
                                    Tanggal ({getPeriodeName(previewMonth)})
                                </th>
                                <th colSpan={4} className="p-1.5 border bg-gray-200">Total</th>
                                <th rowSpan={2} className="p-2 border w-16">Aksi</th>
                            </tr>
                            <tr>
                                {Array.from({length: daysInMonth}, (_, i) => (
                                    <th key={i} className="p-1 border w-7 font-normal bg-white min-w-[24px] text-[10px]">
                                        {i+1}
                                    </th>
                                ))}
                                <th className="p-1 border w-8 bg-green-100 text-green-900">H</th>
                                <th className="p-1 border w-8 bg-yellow-100 text-yellow-900">S</th>
                                <th className="p-1 border w-8 bg-blue-100 text-blue-900">I</th>
                                <th className="p-1 border w-8 bg-red-100 text-red-900">A</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {santriInRombel.map((s, idx) => {
                                const stat = attendanceMatrix.stats[s.id];
                                const hasAlphaWarning = stat.A >= 3;

                                return (
                                    <tr key={s.id} className="hover:bg-gray-50/80 transition-colors">
                                        <td className="p-1.5 border text-gray-500">{idx+1}</td>
                                        <td className="p-1.5 border text-left px-2 font-medium sticky left-0 bg-white shadow-xs whitespace-nowrap">
                                            <div className="flex items-center gap-1.5">
                                                <span className="font-bold text-gray-800">{s.namaLengkap}</span>
                                                {hasAlphaWarning && (
                                                    <span className="w-2 h-2 rounded-full bg-red-500" title="Peringatan Alpha >= 3"></span>
                                                )}
                                            </div>
                                        </td>
                                        {Array.from({length: daysInMonth}, (_, i) => {
                                            const status = attendanceMatrix.matrix[s.id][i+1];
                                            let bgClass = "";
                                            if (status === 'H') bgClass = "bg-green-50 text-green-700 font-bold";
                                            else if (status === 'S') bgClass = "bg-yellow-50 text-yellow-700 font-bold";
                                            else if (status === 'I') bgClass = "bg-blue-50 text-blue-700 font-bold";
                                            else if (status === 'A') bgClass = "bg-red-100 text-red-700 font-bold";
                                            
                                            return (
                                                <td key={i} className={`p-1 border ${bgClass} text-center text-[11px]`}>
                                                    {status || ''}
                                                </td>
                                            );
                                        })}
                                        <td className="p-1 border font-bold bg-green-50/70 text-green-900">{stat.H}</td>
                                        <td className="p-1 border font-bold bg-yellow-50/70 text-yellow-900">{stat.S}</td>
                                        <td className="p-1 border font-bold bg-blue-50/70 text-blue-900">{stat.I}</td>
                                        <td className={`p-1 border font-bold ${stat.A > 0 ? 'bg-red-100 text-red-900' : 'bg-red-50/70 text-red-900'}`}>
                                            {stat.A}
                                        </td>
                                        <td className="p-1 border text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenWaSingle(s.id)}
                                                    title="Hubungi Wali via WA"
                                                    className="p-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded transition-colors"
                                                >
                                                    <i className="bi bi-whatsapp text-[11px]"></i>
                                                </button>
                                                {stat.A > 0 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenBkModal(s, `Rekap ${getPeriodeName(previewMonth)}: Total ${stat.A}x Alpha`)}
                                                        title="Rujuk ke BK"
                                                        className="p-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded transition-colors"
                                                    >
                                                        <i className="bi bi-person-exclamation text-[11px]"></i>
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modals */}
            <AbsensiWaModal
                isOpen={isWaModalOpen}
                onClose={() => setIsWaModalOpen(false)}
                absentStudents={santriInRombel
                    .filter(s => (attendanceMatrix.stats[s.id]?.A > 0 || attendanceMatrix.stats[s.id]?.S > 0 || attendanceMatrix.stats[s.id]?.I > 0))
                    .map(s => ({
                        santri: s,
                        status: attendanceMatrix.stats[s.id]?.A > 0 ? 'A' : attendanceMatrix.stats[s.id]?.S > 0 ? 'S' : 'I',
                        keterangan: `Rekap ${getPeriodeName(previewMonth)}: Total ${attendanceMatrix.stats[s.id]?.A || 0}x Alpha, ${attendanceMatrix.stats[s.id]?.S || 0}x Sakit`
                    }))}
                initialSantriId={waInitialSantriId}
                tanggal={getPeriodeName(previewMonth)}
                sesi={selectedSesiFilter}
                rombelName={selectedRombel?.nama || 'Rombel'}
            />

            <AbsensiBkModal
                isOpen={isBkModalOpen}
                onClose={() => setIsBkModalOpen(false)}
                santri={bkTargetSantri}
                alasanRujukan={bkTargetReason}
            />

            {/* Hidden Printable Area */}
            <div className="hidden">
                <div id="absensi-rekap-print-area">
                    {monthRange.map((month, idx) => {
                        const monthDays = new Date(tahun, month, 0).getDate();
                        const monthData = buildAttendanceForMonth(month);
                        return (
                            <div
                                key={month}
                                className={`printable-content-wrapper print-landscape bg-white p-6 ${idx < monthRange.length - 1 ? 'page-break-after' : ''}`}
                                style={{ width: '29.7cm', minHeight: '21cm' }}
                            >
                                <PrintHeader settings={settings} title={`REKAPITULASI ABSENSI ${selectedJenjang?.nama?.toUpperCase() || '-'} / ${selectedKelas?.nama?.toUpperCase() || '-'} / ${selectedRombel?.nama?.toUpperCase() || '-'}`} />
                                <p className="text-center text-sm mb-4">PERIODE: {getPeriodeName(month).toUpperCase()} - SESI: {selectedSesiFilter.toUpperCase()}</p>
                                <table className="w-full text-xs text-center border-collapse border border-black">
                                    <thead>
                                        <tr>
                                            <th className="p-1 border border-black w-8">No</th>
                                            <th className="p-1 border border-black text-left w-48">Nama Santri</th>
                                            {Array.from({length: monthDays}, (_, i) => (
                                                <th key={i} className="p-0 border border-black w-4 font-normal" style={{fontSize: '8px'}}>{i+1}</th>
                                            ))}
                                            <th className="p-1 border border-black w-6">S</th>
                                            <th className="p-1 border border-black w-6">I</th>
                                            <th className="p-1 border border-black w-6">A</th>
                                            <th className="p-1 border border-black w-6">H</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {santriInRombel.map((s, santriIdx) => (
                                            <tr key={s.id}>
                                                <td className="p-1 border border-black">{santriIdx+1}</td>
                                                <td className="p-1 border border-black text-left px-2 font-medium">{s.namaLengkap}</td>
                                                {Array.from({length: monthDays}, (_, dayIdx) => (
                                                    <td key={dayIdx} className="p-0 border border-black" style={{fontSize: '9px'}}>{monthData.matrix[s.id][dayIdx+1] || ''}</td>
                                                ))}
                                                <td className="p-1 border border-black">{monthData.stats[s.id].S}</td>
                                                <td className="p-1 border border-black">{monthData.stats[s.id].I}</td>
                                                <td className="p-1 border border-black">{monthData.stats[s.id].A}</td>
                                                <td className="p-1 border border-black">{monthData.stats[s.id].H}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <ReportFooter />
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Import Excel Modal */}
            <AbsensiImportModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
            />
        </div>
    );
};
