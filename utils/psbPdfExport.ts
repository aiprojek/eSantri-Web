import { PondokSettings, PsbConfig, Pendaftar, PendaftarStatus } from '../types';
import { calculatePsbAverageScore, getPsbRegistrationNumber } from '../components/psb/utils/psbUtils';
import { loadJsPdf, loadJsPdfAutoTable } from './lazyClientLibs';

// Helper to convert an image URL (such as logo) to base64 for embedding in jsPDF
const tryLoadImageAsBase64 = (url?: string): Promise<string | null> => {
    return new Promise((resolve) => {
        if (!url || (!url.startsWith('http') && !url.startsWith('data:'))) {
            return resolve(null);
        }
        if (url.startsWith('data:image')) {
            return resolve(url);
        }
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0);
                    resolve(canvas.toDataURL('image/png'));
                } else {
                    resolve(null);
                }
            } catch {
                resolve(null);
            }
        };
        img.onerror = () => resolve(null);
        img.src = url;
    });
};

// =========================================================================
// 1. EXPORT LAPORAN REKAPITULASI STATISTIK PSB (EXECUTIVE REPORT)
// =========================================================================

export interface PsbDashboardReportPdfOptions {
    settings: PondokSettings;
    config: PsbConfig;
    pendaftarList: Pendaftar[];
    statsByJenjang: {
        id: number;
        name: string;
        total: number;
        l: number;
        p: number;
        percent: string;
    }[];
    statusStats: Record<PendaftarStatus, number>;
    jalurStats: {
        name: string;
        count: number;
        percent: string;
    }[];
    dailyTrend: {
        dateFormatted: string;
        count: number;
    }[];
    adminName: string;
    adminJabatan: string;
    pimpinanName: string;
    pimpinanJabatan: string;
    tempatCetak: string;
    fileName?: string;
}

export const exportPsbDashboardReportPdf = async ({
    settings,
    config,
    pendaftarList,
    statsByJenjang,
    statusStats,
    jalurStats,
    dailyTrend,
    adminName,
    adminJabatan,
    pimpinanName,
    pimpinanJabatan,
    tempatCetak,
    fileName,
}: PsbDashboardReportPdfOptions): Promise<void> => {
    const [{ jsPDF }, autoTableModule] = await Promise.all([
        loadJsPdf(),
        loadJsPdfAutoTable()
    ]);
    const autoTable = autoTableModule.default || autoTableModule;

    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 12;
    const contentWidth = pageWidth - (marginX * 2);
    let currentY = 12;

    const totalPendaftar = pendaftarList.length;
    const todayStr = new Date().toISOString().split('T')[0];
    const pendaftarHariIni = pendaftarList.filter(p => p.tanggalDaftar && p.tanggalDaftar.startsWith(todayStr)).length;
    const totalLaki = pendaftarList.filter(p => p.jenisKelamin === 'Laki-laki').length;
    const totalPerempuan = pendaftarList.filter(p => p.jenisKelamin === 'Perempuan').length;
    const percentLaki = totalPendaftar > 0 ? ((totalLaki / totalPendaftar) * 100).toFixed(1) : '0';
    const percentPerempuan = totalPendaftar > 0 ? ((totalPerempuan / totalPendaftar) * 100).toFixed(1) : '0';
    const acceptanceRate = totalPendaftar > 0 ? ((statusStats.Diterima / totalPendaftar) * 100).toFixed(1) : '0';
    const prosesCount = (statusStats['Baru'] || 0) + (statusStats['Verifikasi Berkas'] || 0) + (statusStats['Ujian Masuk'] || 0);

    const todayFormatted = new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    // Try loading logo
    const logoUrl = settings.logoPonpesUrl || settings.logoYayasanUrl;
    const base64Logo = logoUrl ? await tryLoadImageAsBase64(logoUrl) : null;

    // --- KOP SURAT ---
    const hasLogo = Boolean(base64Logo);
    if (hasLogo && base64Logo) {
        try {
            doc.addImage(base64Logo, 'PNG', marginX, currentY - 2, 18, 18);
        } catch {
            // continue without logo
        }
    }

    const kopTextCenterX = hasLogo ? (marginX + 20 + (pageWidth - marginX - 20) / 2) : (pageWidth / 2);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(15, 118, 110); // Deep Teal
    const namaPonpes = (settings.namaPonpes || 'PONDOK PESANTREN').toUpperCase();
    doc.text(namaPonpes, kopTextCenterX, currentY + 3, { align: 'center' });

    doc.setFontSize(9.5);
    doc.setTextColor(30, 41, 59); // Slate 800
    doc.text('PANITIA PENERIMAAN SANTRI BARU (PSB)', kopTextCenterX, currentY + 8, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139); // Slate 500
    const kontakLine = [
        settings.alamat || 'Alamat Lembaga Pondok Pesantren',
        settings.telepon ? `Telp/WA: ${settings.telepon}` : '',
        settings.email ? `Email: ${settings.email}` : ''
    ].filter(Boolean).join(' • ');
    doc.text(kontakLine, kopTextCenterX, currentY + 12.5, { align: 'center' });

    currentY += 16;

    // Double rule
    doc.setDrawColor(15, 118, 110);
    doc.setLineWidth(0.7);
    doc.line(marginX, currentY, pageWidth - marginX, currentY);
    currentY += 0.8;
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.line(marginX, currentY, pageWidth - marginX, currentY);
    currentY += 5;

    // --- JUDUL LAPORAN ---
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42); // Slate 900
    doc.text('LAPORAN EKSEKUTIF REKAPITULASI PENERIMAAN SANTRI BARU', pageWidth / 2, currentY, { align: 'center' });
    currentY += 4.5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(`Tahun Ajaran: ${config.tahunAjaranAktif || '2025/2026'}   •   Dicetak: ${todayFormatted}`, pageWidth / 2, currentY, { align: 'center' });
    currentY += 4.5;

    // --- TABEL 1: IKHTISAR INDIKATOR UTAMA ---
    autoTable(doc, {
        startY: currentY,
        margin: { left: marginX, right: marginX },
        head: [
            [
                {
                    content: 'I. IKHTISAR INDIKATOR UTAMA PENDAFTARAN',
                    colSpan: 4,
                    styles: {
                        halign: 'left',
                        fontStyle: 'bold',
                        fillColor: [30, 41, 59],
                        textColor: [255, 255, 255],
                        fontSize: 7.5
                    }
                }
            ]
        ],
        body: [
            [
                { content: 'Total Pendaftar', styles: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 38 } },
                { content: `${totalPendaftar} Orang`, styles: { fontStyle: 'bold', textColor: [15, 23, 42], cellWidth: 55 } },
                { content: 'Pendaftar Hari Ini', styles: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 38 } },
                { content: `${pendaftarHariIni} Orang`, styles: { fontStyle: 'bold', textColor: [37, 99, 235], cellWidth: 55 } }
            ],
            [
                { content: 'Santri Diterima', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
                { content: `${statusStats.Diterima} Orang (${acceptanceRate}%)`, styles: { fontStyle: 'bold', textColor: [5, 150, 105] } },
                { content: 'Santri Cadangan', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
                { content: `${statusStats.Cadangan} Orang`, styles: { fontStyle: 'bold', textColor: [217, 119, 6] } }
            ],
            [
                { content: 'Sedang Proses Seleksi', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
                { content: `${prosesCount} Orang`, styles: { fontStyle: 'bold', textColor: [126, 34, 206] } },
                { content: 'Ditolak / Gugur', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
                { content: `${statusStats.Ditolak} Orang`, styles: { fontStyle: 'bold', textColor: [225, 29, 72] } }
            ],
            [
                { content: 'Komposisi Gender', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
                {
                    content: `Santri Putra: ${totalLaki} (${percentLaki}%)   •   Santri Putri: ${totalPerempuan} (${percentPerempuan}%)`,
                    colSpan: 3,
                    styles: { textColor: [51, 65, 85] }
                }
            ]
        ],
        theme: 'grid',
        styles: {
            fontSize: 7.2,
            cellPadding: 1.5,
            lineColor: [203, 213, 225],
            lineWidth: 0.15,
            textColor: [30, 41, 59]
        }
    });

    currentY = (doc as any).lastAutoTable.finalY + 3.5;

    // --- TABEL 2: DISTRIBUSI PENDAFTAR PER JENJANG PENDIDIKAN ---
    const jenjangBody = statsByJenjang.map((j, idx) => [
        { content: String(idx + 1), styles: { halign: 'center' } },
        { content: j.name, styles: { fontStyle: 'bold' } },
        { content: String(j.l), styles: { halign: 'center' } },
        { content: String(j.p), styles: { halign: 'center' } },
        { content: String(j.total), styles: { halign: 'center', fontStyle: 'bold', textColor: [15, 118, 110] } },
        { content: `${j.percent}%`, styles: { halign: 'center' } }
    ]);

    autoTable(doc, {
        startY: currentY,
        margin: { left: marginX, right: marginX },
        head: [
            [
                {
                    content: 'II. DISTRIBUSI PENDAFTAR PER JENJANG PENDIDIKAN',
                    colSpan: 6,
                    styles: {
                        halign: 'left',
                        fontStyle: 'bold',
                        fillColor: [15, 118, 110],
                        textColor: [255, 255, 255],
                        fontSize: 7.5
                    }
                }
            ],
            [
                { content: 'No', styles: { halign: 'center', cellWidth: 10 } },
                { content: 'Jenjang Pendidikan', styles: { halign: 'left' } },
                { content: 'Putra (L)', styles: { halign: 'center', cellWidth: 26 } },
                { content: 'Putri (P)', styles: { halign: 'center', cellWidth: 26 } },
                { content: 'Total', styles: { halign: 'center', cellWidth: 26 } },
                { content: 'Persentase', styles: { halign: 'center', cellWidth: 26 } }
            ]
        ],
        body: jenjangBody as any,
        foot: [
            [
                { content: 'TOTAL AKUMULASI', colSpan: 2, styles: { halign: 'right', fontStyle: 'bold', textColor: [15, 118, 110] } },
                { content: String(totalLaki), styles: { halign: 'center', fontStyle: 'bold' } },
                { content: String(totalPerempuan), styles: { halign: 'center', fontStyle: 'bold' } },
                { content: String(totalPendaftar), styles: { halign: 'center', fontStyle: 'bold', textColor: [15, 118, 110] } },
                { content: '100%', styles: { halign: 'center', fontStyle: 'bold' } }
            ]
        ] as any,
        theme: 'grid',
        styles: {
            fontSize: 7.0,
            cellPadding: 1.4,
            lineColor: [203, 213, 225],
            lineWidth: 0.15,
            textColor: [30, 41, 59]
        },
        headStyles: {
            fillColor: [204, 251, 241],
            textColor: [19, 78, 74],
            fontStyle: 'bold',
            fontSize: 7.0
        },
        footStyles: {
            fillColor: [204, 251, 241],
            textColor: [15, 118, 110]
        },
        alternateRowStyles: {
            fillColor: [250, 250, 250]
        }
    });

    currentY = (doc as any).lastAutoTable.finalY + 3.5;

    // --- TABEL 3: STATUS TAHAPAN SELEKSI ---
    const statusData = [
        { status: 'Baru', count: statusStats['Baru'] || 0, ket: 'Formulir masuk, menunggu kelengkapan berkas' },
        { status: 'Verifikasi Berkas', count: statusStats['Verifikasi Berkas'] || 0, ket: 'Dokumen fisik/digital dalam proses validasi panitia' },
        { status: 'Ujian Masuk', count: statusStats['Ujian Masuk'] || 0, ket: 'Calon santri telah memiliki kartu ujian & mengikuti tes seleksi' },
        { status: 'Cadangan', count: statusStats['Cadangan'] || 0, ket: 'Menunggu kuota dari santri lulus yang tidak daftar ulang' },
        { status: 'Diterima', count: statusStats['Diterima'] || 0, ket: 'Resmi diterima, proses pembayaran & daftar ulang santri' },
        { status: 'Ditolak', count: statusStats['Ditolak'] || 0, ket: 'Tidak memenuhi kriteria passing grade / daya tampung penuh' },
    ];

    const statusBody = statusData.map((row, idx) => {
        const p = totalPendaftar > 0 ? ((row.count / totalPendaftar) * 100).toFixed(1) : '0';
        return [
            { content: String(idx + 1), styles: { halign: 'center' } },
            { content: row.status, styles: { fontStyle: 'bold' } },
            { content: String(row.count), styles: { halign: 'center', fontStyle: 'bold' } },
            { content: `${p}%`, styles: { halign: 'center' } },
            { content: row.ket, styles: { textColor: [71, 85, 105] } }
        ];
    });

    autoTable(doc, {
        startY: currentY,
        margin: { left: marginX, right: marginX },
        head: [
            [
                {
                    content: 'III. STATUS TAHAPAN SELEKSI CALON SANTRI',
                    colSpan: 5,
                    styles: {
                        halign: 'left',
                        fontStyle: 'bold',
                        fillColor: [51, 65, 85],
                        textColor: [255, 255, 255],
                        fontSize: 7.5
                    }
                }
            ],
            [
                { content: 'No', styles: { halign: 'center', cellWidth: 10 } },
                { content: 'Status Tahapan', styles: { halign: 'left', cellWidth: 38 } },
                { content: 'Jumlah', styles: { halign: 'center', cellWidth: 22 } },
                { content: 'Persentase', styles: { halign: 'center', cellWidth: 22 } },
                { content: 'Keterangan / Alur Lanjutan', styles: { halign: 'left' } }
            ]
        ],
        body: statusBody as any,
        theme: 'grid',
        styles: {
            fontSize: 6.8,
            cellPadding: 1.3,
            lineColor: [203, 213, 225],
            lineWidth: 0.15,
            textColor: [30, 41, 59]
        },
        headStyles: {
            fillColor: [226, 232, 240],
            textColor: [15, 23, 42],
            fontStyle: 'bold',
            fontSize: 6.8
        },
        alternateRowStyles: {
            fillColor: [250, 250, 250]
        }
    });

    currentY = (doc as any).lastAutoTable.finalY + 3.5;

    // --- TABEL 4 & 5: DUA KOLOM SIDE-BY-SIDE (JALUR PENDAFTARAN & TREN 7 HARI) ---
    const twoColStartY = currentY;
    const colGap = 4;
    const colWidth = (contentWidth - colGap) / 2; // 91mm each

    // Tabel 4: Jalur Pendaftaran (Kolom Kiri)
    const jalurRows = jalurStats.map(item => [
        { content: item.name, styles: { fontStyle: 'bold' } },
        { content: String(item.count), styles: { halign: 'center' } },
        { content: `${item.percent}%`, styles: { halign: 'center' } }
    ]);

    autoTable(doc, {
        startY: twoColStartY,
        tableWidth: colWidth,
        margin: { left: marginX, right: pageWidth - marginX - colWidth },
        head: [
            [
                {
                    content: 'IV. JALUR PENDAFTARAN',
                    colSpan: 3,
                    styles: {
                        halign: 'left',
                        fontStyle: 'bold',
                        fillColor: [6, 95, 70],
                        textColor: [255, 255, 255],
                        fontSize: 7.2
                    }
                }
            ],
            [
                { content: 'Nama Jalur', styles: { halign: 'left' } },
                { content: 'Jumlah', styles: { halign: 'center', cellWidth: 20 } },
                { content: 'Porsi', styles: { halign: 'center', cellWidth: 20 } }
            ]
        ],
        body: (jalurRows.length > 0 ? jalurRows : [[{ content: 'Belum ada data jalur', colSpan: 3, styles: { halign: 'center', textColor: [148, 163, 184] } }]]) as any,
        theme: 'grid',
        styles: {
            fontSize: 6.8,
            cellPadding: 1.2,
            lineColor: [203, 213, 225],
            lineWidth: 0.15,
            textColor: [30, 41, 59]
        },
        headStyles: {
            fillColor: [209, 250, 229],
            textColor: [6, 78, 59],
            fontStyle: 'bold',
            fontSize: 6.8
        }
    });
    const table4FinalY = (doc as any).lastAutoTable.finalY;

    // Tabel 5: Tren 7 Hari Terakhir (Kolom Kanan)
    const rightColLeft = marginX + colWidth + colGap;
    const trendRows = dailyTrend.map(d => [
        { content: d.dateFormatted, styles: { halign: 'left' } },
        { content: String(d.count), styles: { halign: 'center', fontStyle: 'bold', textColor: [30, 64, 175] } }
    ]);

    autoTable(doc, {
        startY: twoColStartY,
        tableWidth: colWidth,
        margin: { left: rightColLeft, right: marginX },
        head: [
            [
                {
                    content: 'V. TREN PENDAFTAR 7 HARI TERAKHIR',
                    colSpan: 2,
                    styles: {
                        halign: 'left',
                        fontStyle: 'bold',
                        fillColor: [30, 64, 175],
                        textColor: [255, 255, 255],
                        fontSize: 7.2
                    }
                }
            ],
            [
                { content: 'Hari & Tanggal', styles: { halign: 'left' } },
                { content: 'Pendaftar Masuk', styles: { halign: 'center', cellWidth: 32 } }
            ]
        ],
        body: (trendRows.length > 0 ? trendRows : [[{ content: 'Belum ada data tren', colSpan: 2, styles: { halign: 'center', textColor: [148, 163, 184] } }]]) as any,
        theme: 'grid',
        styles: {
            fontSize: 6.8,
            cellPadding: 1.2,
            lineColor: [203, 213, 225],
            lineWidth: 0.15,
            textColor: [30, 41, 59]
        },
        headStyles: {
            fillColor: [219, 234, 254],
            textColor: [30, 58, 138],
            fontStyle: 'bold',
            fontSize: 6.8
        }
    });
    const table5FinalY = (doc as any).lastAutoTable.finalY;

    currentY = Math.max(table4FinalY, table5FinalY) + 3.5;

    // --- PENGESAHAN / TANDA TANGAN ---
    const kotaDanTanggal = `Dicetak di: ${tempatCetak || 'Posko PSB Pesantren'}`;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(71, 85, 105);
    doc.text(kotaDanTanggal, pageWidth - marginX, currentY, { align: 'right' });
    currentY += 3.2;
    doc.text(`Tanggal: ${todayFormatted}`, pageWidth - marginX, currentY, { align: 'right' });
    currentY += 3.5;

    const colSigWidth = 72;
    const leftSigX = marginX + 10;
    const rightSigX = pageWidth - marginX - colSigWidth - 10;

    // Kiri: Admin PSB
    const cleanAdminJabatan = adminJabatan || 'Koordinator Administrator PSB';
    const cleanAdminName = adminName ? adminName.toUpperCase() : '( ............................................ )';

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 41, 59);
    doc.text(`${cleanAdminJabatan},`, leftSigX + (colSigWidth / 2), currentY, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.text(cleanAdminName, leftSigX + (colSigWidth / 2), currentY + 16, { align: 'center' });
    
    // Underline Admin Name
    const adminNameWidth = doc.getTextWidth(cleanAdminName);
    doc.setDrawColor(30, 41, 59);
    doc.setLineWidth(0.2);
    doc.line(
        leftSigX + (colSigWidth / 2) - (adminNameWidth / 2),
        currentY + 16.8,
        leftSigX + (colSigWidth / 2) + (adminNameWidth / 2),
        currentY + 16.8
    );

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(100, 116, 139);
    doc.text('Admin Pendataan PSB', leftSigX + (colSigWidth / 2), currentY + 20.5, { align: 'center' });

    // Kanan: Pimpinan Pesantren
    const cleanPimpinanJabatan = pimpinanJabatan || 'Pimpinan Pondok Pesantren';
    const cleanPimpinanName = pimpinanName ? pimpinanName.toUpperCase() : '( ............................................ )';

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 41, 59);
    doc.text('Mengetahui,', rightSigX + (colSigWidth / 2), currentY - 3.2, { align: 'center' });
    doc.text(cleanPimpinanJabatan, rightSigX + (colSigWidth / 2), currentY, { align: 'center' });
    
    doc.setFont('helvetica', 'bold');
    doc.text(cleanPimpinanName, rightSigX + (colSigWidth / 2), currentY + 16, { align: 'center' });
    
    // Underline Pimpinan Name
    const pimpinanNameWidth = doc.getTextWidth(cleanPimpinanName);
    doc.setDrawColor(30, 41, 59);
    doc.setLineWidth(0.2);
    doc.line(
        rightSigX + (colSigWidth / 2) - (pimpinanNameWidth / 2),
        currentY + 16.8,
        rightSigX + (colSigWidth / 2) + (pimpinanNameWidth / 2),
        currentY + 16.8
    );

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(100, 116, 139);
    // --- FOOTER ON ALL PAGES (MATCHING PREVIEW NOTA) ---
    const totalPages = (doc as any).getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.2);
        doc.line(marginX, pageHeight - 9, pageWidth - marginX, pageHeight - 9);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(148, 163, 184); // Slate 400
        doc.text('Sistem Informasi Manajemen Pesantren (eSantri Web)', marginX, pageHeight - 5);
        doc.text(totalPages > 1 ? `Laporan Resmi Statistik PSB • Hal ${p}/${totalPages}` : 'Laporan Resmi Statistik PSB', pageWidth - marginX, pageHeight - 5, { align: 'right' });
    }

    const taStr = (config.tahunAjaranAktif || 'Aktif').replace(/[\/\\:*?"<>|]/g, '-');
    const defaultFileName = `Laporan_Rekapitulasi_Dashboard_PSB_TA_${taStr}_${todayStr}.pdf`;
    doc.save(fileName || defaultFileName);
};

// =========================================================================
// 2. EXPORT PENGUMUMAN HASIL KELULUSAN SELEKSI PSB (ANNOUNCEMENT DOCUMENT)
// =========================================================================

export interface PsbAnnouncementPdfOptions {
    settings: PondokSettings;
    config: PsbConfig;
    suratNumber?: string;
    viewMode: 'semua' | 'diterima' | 'ditolak' | 'cadangan';
    selectedJenjangName?: string;
    selectedGelombang?: string;
    sortOrder: 'ranking' | 'noreg' | 'nama';
    candidates: Pendaftar[];
    allProcessedCandidates?: Pendaftar[];
    acceptedCount?: number;
    waitingCount?: number;
    rejectedCount?: number;
    notesDiterima: string[];
    notesCadangan: string;
    notesDitolak: string;
    customAdditionalNotes: string;
    adminName: string;
    adminJabatan: string;
    pimpinanName: string;
    pimpinanJabatan: string;
    tempatCetak: string;
    fileName?: string;
}

export const exportPsbAnnouncementPdf = async ({
    settings,
    config,
    suratNumber,
    viewMode,
    selectedJenjangName,
    selectedGelombang,
    sortOrder: _sortOrder,
    candidates,
    allProcessedCandidates,
    acceptedCount: propAcceptedCount,
    waitingCount: propWaitingCount,
    rejectedCount: propRejectedCount,
    notesDiterima,
    notesCadangan,
    notesDitolak,
    customAdditionalNotes,
    adminName,
    adminJabatan,
    pimpinanName,
    pimpinanJabatan,
    tempatCetak,
    fileName,
}: PsbAnnouncementPdfOptions): Promise<void> => {
    const [{ jsPDF }, autoTableModule] = await Promise.all([
        loadJsPdf(),
        loadJsPdfAutoTable()
    ]);
    const autoTable = autoTableModule.default || autoTableModule;

    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 10;
    let currentY = 10;

    const todayFormatted = new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
    const yearLabel = config.tahunAjaranAktif || `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`;

    const acceptedCount = propAcceptedCount ?? (allProcessedCandidates || candidates).filter(c => c.status === 'Diterima').length;
    const waitingCount = propWaitingCount ?? (allProcessedCandidates || candidates).filter(c => c.status === 'Cadangan').length;
    const rejectedCount = propRejectedCount ?? (allProcessedCandidates || candidates).filter(c => c.status === 'Ditolak').length;

    // Try loading logo
    const logoUrl = settings.logoPonpesUrl || settings.logoYayasanUrl;
    const base64Logo = logoUrl ? await tryLoadImageAsBase64(logoUrl) : null;

    // --- KOP SURAT (EXACT MATCH TO PREVIEW) ---
    const hasLogo = Boolean(base64Logo);
    if (hasLogo && base64Logo) {
        try {
            doc.addImage(base64Logo, 'PNG', marginX, currentY - 1, 16, 16);
        } catch {
            // continue without logo
        }
    }

    const kopTextCenterX = hasLogo ? (marginX + 18 + (pageWidth - marginX - 18) / 2) : (pageWidth / 2);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42); // Slate 900
    const namaPonpes = (settings.namaPonpes || 'PONDOK PESANTREN').toUpperCase();
    doc.text(namaPonpes, kopTextCenterX, currentY + 2.5, { align: 'center' });

    doc.setFontSize(9);
    doc.setTextColor(15, 118, 110); // Deep Teal
    doc.text('PANITIA PENERIMAAN SANTRI BARU (PSB)', kopTextCenterX, currentY + 7, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(100, 116, 139); // Slate 500
    const kontakLine = [
        settings.alamat || 'Alamat Lembaga Pondok Pesantren',
        settings.telepon ? `Telp/WA: ${settings.telepon}` : '',
        settings.email ? `Email: ${settings.email}` : ''
    ].filter(Boolean).join(' • ');
    doc.text(kontakLine, kopTextCenterX, currentY + 11.5, { align: 'center' });

    currentY += 15;

    // Double rule (border-b-2 border-double border-gray-900)
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.6);
    doc.line(marginX, currentY, pageWidth - marginX, currentY);
    currentY += 0.8;
    doc.setLineWidth(0.2);
    doc.line(marginX, currentY, pageWidth - marginX, currentY);
    currentY += 4.5;

    // --- JUDUL RESMI PENGUMUMAN (SURAT KEPUTUSAN PANITIA PSB) ---
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('SURAT KEPUTUSAN PANITIA PSB', pageWidth / 2, currentY, { align: 'center' });
    currentY += 4.2;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Nomor: ${suratNumber || '...........................................'}`, pageWidth / 2, currentY, { align: 'center' });
    currentY += 4.2;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.8);
    doc.setTextColor(30, 41, 59);
    doc.text(`TENTANG HASIL SELEKSI PENERIMAAN SANTRI BARU TAHUN AJARAN ${yearLabel}`, pageWidth / 2, currentY, { align: 'center' });
    currentY += 4.5;

    // --- KALIMAT PENGANTAR RESMI ---
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text('Bismillaahirrohmaanirrohiim,', marginX, currentY);
    currentY += 3.5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(51, 65, 85);
    const namaLembaga = settings.namaPonpes || 'Pesantren';
    const pengantarText = `Berdasarkan hasil rekapitulasi verifikasi berkas, tes seleksi masuk, observasi baca Al-Qur'an, dan rapat pleno Panitia Penerimaan Santri Baru (PSB) Pondok Pesantren ${namaLembaga} Tahun Ajaran ${yearLabel}, dengan ini panitia menetapkan hasil seleksi calon santri baru sebagaimana tercantum pada daftar berikut:`;
    const introLines = doc.splitTextToSize(pengantarText, pageWidth - (marginX * 2));
    introLines.forEach((line: string) => {
        doc.text(line, marginX, currentY);
        currentY += 3.2;
    });
    currentY += 2;

    // --- TABEL DATA CALON SANTRI (7 KOLOM SESUAI PREVIEW) ---
    const getJenjangLabel = (id?: number) => {
        if (!id) return '-';
        return settings.jenjang.find(j => j.id === id)?.nama || '-';
    };

    const tableRows = candidates.map((p, idx) => {
        const noReg = p.nomorRegistrasi || getPsbRegistrationNumber(p, config.tahunAjaranAktif);
        const score = calculatePsbAverageScore(p.nilaiUjian);
        const scoreStr = score !== null && score > 0 ? score.toFixed(1) : '-';
        const gender = p.jenisKelamin === 'Laki-laki' ? 'L' : p.jenisKelamin === 'Perempuan' ? 'P' : '-';
        const jenjang = getJenjangLabel(p.jenjangId);

        return [
            { content: String(idx + 1), styles: { halign: 'center' } },
            { content: noReg, styles: { halign: 'center', fontStyle: 'bold' } },
            { content: p.namaLengkap, styles: { fontStyle: 'bold' } },
            { content: gender, styles: { halign: 'center' } },
            { content: jenjang, styles: { halign: 'center' } },
            { content: scoreStr, styles: { halign: 'center' } },
            { content: p.status, styles: { halign: 'center', fontStyle: 'bold' } }
        ];
    });

    autoTable(doc, {
        startY: currentY,
        margin: { top: 12, bottom: 12, left: marginX, right: marginX },
        head: [
            [
                { content: 'No', styles: { halign: 'center', cellWidth: 8 } },
                { content: 'No. Registrasi', styles: { halign: 'center', cellWidth: 28 } },
                { content: 'Nama Calon Santri', styles: { halign: 'left' } },
                { content: 'L/P', styles: { halign: 'center', cellWidth: 10 } },
                { content: 'Jenjang / Jurusan', styles: { halign: 'center', cellWidth: 30 } },
                { content: 'Nilai', styles: { halign: 'center', cellWidth: 14 } },
                { content: 'Hasil Seleksi', styles: { halign: 'center', cellWidth: 28 } }
            ]
        ],
        body: (tableRows.length > 0 ? tableRows : [
            [{ content: 'Tidak ada data calon santri yang sesuai kriteria filter saat ini', colSpan: 7, styles: { halign: 'center', textColor: [148, 163, 184] } }]
        ]) as any,
        theme: 'grid',
        styles: {
            fontSize: 7.2,
            cellPadding: 1.6,
            lineColor: [203, 213, 225],
            lineWidth: 0.15,
            textColor: [30, 41, 59],
            valign: 'middle',
            overflow: 'linebreak'
        },
        headStyles: {
            fillColor: [241, 245, 249], // Slate 100
            textColor: [15, 23, 42],    // Slate 900 bold
            fontStyle: 'bold',
            fontSize: 7.5,
            lineColor: [148, 163, 184],
            lineWidth: 0.2
        },
        alternateRowStyles: {
            fillColor: [255, 255, 255]
        },
        didParseCell: (data: any) => {
            // Style status column (index 6) with soft tints matching preview
            if (data.section === 'body' && data.column.index === 6) {
                const text = String(data.cell.raw?.content || data.cell.text?.[0] || '');
                if (text === 'Diterima') {
                    data.cell.styles.fillColor = [236, 253, 245]; // soft emerald 50
                    data.cell.styles.textColor = [6, 95, 70];     // emerald 800
                } else if (text === 'Cadangan') {
                    data.cell.styles.fillColor = [254, 252, 232]; // soft amber 50
                    data.cell.styles.textColor = [146, 64, 14];   // amber 800
                } else if (text === 'Ditolak') {
                    data.cell.styles.fillColor = [255, 241, 242]; // soft rose 50
                    data.cell.styles.textColor = [190, 18, 60];    // rose 700
                }
            }
        }
    });

    currentY = (doc as any).lastAutoTable.finalY + 3.5;

    // --- REKAPITULASI HASIL SINGKAT BOX (MATCHING PREVIEW) ---
    if (currentY > pageHeight - 55) {
        doc.addPage();
        currentY = 12;
    }

    doc.setFillColor(248, 250, 252); // Gray 50
    doc.setDrawColor(203, 213, 225); // Gray 300
    doc.setLineWidth(0.2);
    doc.roundedRect(marginX, currentY, pageWidth - (marginX * 2), 6.5, 1.2, 1.2, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(51, 65, 85);
    doc.text(`Total Pendaftar Tersaring: ${candidates.length} orang`, marginX + 3, currentY + 4.2);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(6, 95, 70);
    doc.text(`Diterima: ${acceptedCount}`, pageWidth - marginX - 45, currentY + 4.2);
    doc.setTextColor(146, 64, 14);
    doc.text(`Cadangan: ${waitingCount}`, pageWidth - marginX - 28, currentY + 4.2);
    doc.setTextColor(190, 18, 60);
    doc.text(`Tidak Diterima: ${rejectedCount}`, pageWidth - marginX - 3, currentY + 4.2, { align: 'right' });
    currentY += 9.5;

    // --- PETUNJUK & CATATAN PENGUMUMAN ---
    const showDiterimaNotes = (viewMode === 'diterima' || viewMode === 'semua') && notesDiterima.length > 0;
    const showCadanganNotes = (viewMode === 'cadangan' || viewMode === 'semua') && Boolean(notesCadangan);
    const showDitolakNotes = (viewMode === 'ditolak' || viewMode === 'semua') && Boolean(notesDitolak);
    const showCustomNotes = Boolean(customAdditionalNotes?.trim());

    if (showDiterimaNotes || showCadanganNotes || showDitolakNotes || showCustomNotes) {
        if (currentY > pageHeight - 50) {
            doc.addPage();
            currentY = 12;
        }

        if (showDiterimaNotes) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.2);
            doc.setTextColor(6, 95, 70); // Emerald 900
            doc.text('Ketentuan & Tata Cara Santri yang Dinyatakan DITERIMA:', marginX + 2, currentY);
            currentY += 3.2;

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(6.8);
            doc.setTextColor(6, 95, 70);
            notesDiterima.forEach((pt, i) => {
                const lines = doc.splitTextToSize(`${i + 1}. ${pt}`, pageWidth - (marginX * 2) - 6);
                lines.forEach((line: string) => {
                    doc.text(line, marginX + 4, currentY);
                    currentY += 3;
                });
            });
            currentY += 1.5;
        }

        if (showCadanganNotes) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.2);
            doc.setTextColor(146, 64, 14); // Amber 900
            doc.text('Ketentuan Status CADANGAN:', marginX + 2, currentY);
            currentY += 3.2;

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(6.8);
            doc.setTextColor(146, 64, 14);
            const lines = doc.splitTextToSize(`• ${notesCadangan}`, pageWidth - (marginX * 2) - 6);
            lines.forEach((line: string) => {
                doc.text(line, marginX + 4, currentY);
                currentY += 3;
            });
            currentY += 1.5;
        }

        if (showDitolakNotes) {
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(6.8);
            doc.setTextColor(100, 116, 139);
            const lines = doc.splitTextToSize(notesDitolak, pageWidth - (marginX * 2) - 4);
            lines.forEach((line: string) => {
                doc.text(line, marginX + 2, currentY);
                currentY += 3;
            });
            currentY += 1.5;
        }

        if (showCustomNotes) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7);
            doc.setTextColor(30, 41, 59);
            doc.text('Catatan Tambahan Panitia:', marginX + 2, currentY);
            currentY += 3;

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(6.8);
            doc.setTextColor(71, 85, 105);
            const lines = doc.splitTextToSize(customAdditionalNotes, pageWidth - (marginX * 2) - 4);
            lines.forEach((line: string) => {
                doc.text(line, marginX + 2, currentY);
                currentY += 3;
            });
            currentY += 1.5;
        }

        currentY += 2;
    }

    // --- TANDA TANGAN & PENGESAHAN DOKUMEN ---
    if (currentY > pageHeight - 42) {
        doc.addPage();
        currentY = 12;
    }

    const kotaDanTanggal = `Ditetapkan di: ${tempatCetak || 'Posko PSB Pesantren'}\nPada tanggal: ${todayFormatted}`;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text(kotaDanTanggal, pageWidth - marginX - 5, currentY, { align: 'right' });
    currentY += 7;

    const colSigWidth = 70;
    const leftSigX = marginX + 10;
    const rightSigX = pageWidth - marginX - colSigWidth - 10;

    // Sisi Kiri: Ketua Panitia PSB
    const cleanAdminJabatan = adminJabatan || 'Ketua Panitia PSB';
    const cleanAdminName = adminName ? adminName.toUpperCase() : '( ............................................ )';

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 41, 59);
    doc.text(`${cleanAdminJabatan},`, leftSigX + (colSigWidth / 2), currentY, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.text(cleanAdminName, leftSigX + (colSigWidth / 2), currentY + 14, { align: 'center' });
    
    // Draw underline under name
    if (adminName) {
        const textW = doc.getTextWidth(cleanAdminName);
        const startLineX = leftSigX + (colSigWidth / 2) - (textW / 2);
        doc.setLineWidth(0.3);
        doc.setDrawColor(30, 41, 59);
        doc.line(startLineX, currentY + 14.8, startLineX + textW, currentY + 14.8);
    }
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(100, 116, 139);
    doc.text('Admin / Panitia PSB', leftSigX + (colSigWidth / 2), currentY + 18, { align: 'center' });

    // Sisi Kanan: Pimpinan Pesantren
    const cleanPimpinanJabatan = pimpinanJabatan || 'Pimpinan Pondok Pesantren';
    const cleanPimpinanName = pimpinanName ? pimpinanName.toUpperCase() : '( ............................................ )';

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 41, 59);
    doc.text('Mengetahui,', rightSigX + (colSigWidth / 2), currentY, { align: 'center' });
    doc.text(cleanPimpinanJabatan, rightSigX + (colSigWidth / 2), currentY + 3.5, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.text(cleanPimpinanName, rightSigX + (colSigWidth / 2), currentY + 14, { align: 'center' });

    // Draw underline under pimpinan name
    if (pimpinanName) {
        const textW2 = doc.getTextWidth(cleanPimpinanName);
        const startLineX2 = rightSigX + (colSigWidth / 2) - (textW2 / 2);
        doc.setLineWidth(0.3);
        doc.setDrawColor(30, 41, 59);
        doc.line(startLineX2, currentY + 14.8, startLineX2 + textW2, currentY + 14.8);
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(100, 116, 139);
    doc.text("Pengasuh / Mudir 'Aam", rightSigX + (colSigWidth / 2), currentY + 18, { align: 'center' });

    // --- FOOTER ON ALL PAGES ---
    const totalPages = (doc as any).getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.2);
        doc.line(marginX, pageHeight - 8, pageWidth - marginX, pageHeight - 8);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(148, 163, 184); // Slate 400
        doc.text('Dokumen Resmi Keputusan Panitia PSB • eSantri Web', marginX, pageHeight - 4.5);
        doc.text(`Halaman ${p} dari ${totalPages}   •   Dicetak: ${todayFormatted}`, pageWidth - marginX, pageHeight - 4.5, { align: 'right' });
    }

    const cleanDocNum = (suratNumber || 'Pengumuman').replace(/[\/\\:*?"<>|]/g, '-');
    const cleanTa = yearLabel.replace(/[\/\\:*?"<>|]/g, '-');
    const defaultFileName = `Pengumuman_Hasil_PSB_${cleanDocNum}_TA_${cleanTa}.pdf`;
    doc.save(fileName || defaultFileName);
};
