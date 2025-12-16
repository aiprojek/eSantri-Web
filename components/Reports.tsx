
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Santri, PondokSettings, ReportType, GedungAsrama, TransaksiKas } from '../types';
import { useAppContext } from '../AppContext';
import { useReportGenerator } from '../hooks/useReportGenerator';
import { useReportConfig } from '../hooks/useReportConfig';
import { ReportOptions } from './reports/ReportOptions';
import { generatePdf, printToPdfNative } from '../utils/pdfGenerator';
import { exportReportToSvg } from '../utils/svgExporter';
import { generateContactCsv } from '../services/csvService';

const Reports: React.FC = () => {
  const { santriList, settings, tagihanList, pembayaranList, transaksiSaldoList, transaksiKasList, showToast } = useAppContext();
  
  const [selectedJenjangId, setSelectedJenjangId] = useState<string>('');
  const [selectedKelasId, setSelectedKelasId] = useState<string>('');
  const [selectedRombelId, setSelectedRombelId] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedGender, setSelectedGender] = useState<string>('');
  const [selectedProvinsi, setSelectedProvinsi] = useState<string>('');
  const [selectedKabupaten, setSelectedKabupaten] = useState<string>('');
  const [selectedKecamatan, setSelectedKecamatan] = useState<string>('');
  const [selectedGedungId, setSelectedGedungId] = useState<string>('');

  // Sorting State
  const [sortBy, setSortBy] = useState<'namaLengkap' | 'nis'>('namaLengkap');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const [previewContent, setPreviewContent] = useState<React.ReactNode | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [isPreviewGenerating, setIsPreviewGenerating] = useState(false);
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);

  const [manualZoom, setManualZoom] = useState(1);
  const [smartZoomScale, setSmartZoomScale] = useState(1);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const contentWrapperRef = useRef<HTMLDivElement>(null);
  const previewAreaRef = useRef<HTMLDivElement>(null);
  
  // State for download dropdown
  const [isDownloadMenuOpen, setIsDownloadMenuOpen] = useState(false);
  const downloadMenuRef = useRef<HTMLDivElement>(null);

  // ... (rest of the component logic remains the same until download handlers) ...
  const reportTypes = useMemo(() => [
    { id: ReportType.DashboardSummary, title: 'Laporan Ringkas Dashboard', description: "Cetak ringkasan statistik utama dari dashboard.", icon: 'bi-pie-chart-fill' },
    { id: ReportType.FinanceSummary, title: 'Laporan Ringkas Keuangan', description: "Cetak ringkasan statistik utama dari dashboard keuangan.", icon: 'bi-graph-up' },
    { id: ReportType.LaporanArusKas, title: 'Laporan Arus Kas Umum', description: "Cetak riwayat transaksi dari buku kas umum untuk periode tertentu.", icon: 'bi-journal-arrow-up' },
    { id: ReportType.LaporanAsrama, title: 'Laporan Keasramaan', description: "Cetak rekapitulasi data gedung, kamar, musyrif, dan penghuni.", icon: 'bi-building-check' },
    { id: ReportType.RekeningKoranSantri, title: 'Rekening Koran Santri', description: "Cetak mutasi keuangan (tagihan, pembayaran, uang saku) per santri.", icon: 'bi-file-earmark-person' },
    { id: ReportType.Biodata, title: 'Biodata Santri', description: "Cetak biodata lengkap untuk satu atau semua santri per rombel.", icon: 'bi-person-badge' },
    { id: ReportType.KartuSantri, title: 'Kartu Tanda Santri', description: "Cetak kartu identitas profesional untuk santri.", icon: 'bi-person-vcard' },
    { id: ReportType.LembarPembinaan, title: 'Lembar Pembinaan Santri', description: "Cetak rekam jejak prestasi dan pelanggaran santri.", icon: 'bi-file-person-fill' },
    { id: ReportType.LaporanMutasi, title: 'Laporan Mutasi Santri', description: "Cetak rekapitulasi santri yang masuk, keluar, atau lulus.", icon: 'bi-arrow-left-right' },
    { id: ReportType.FormulirIzin, title: 'Formulir Izin Santri', description: "Cetak surat izin keluar/pulang resmi untuk santri.", icon: 'bi-box-arrow-right' },
    { id: ReportType.LabelSantri, title: 'Cetak Label Santri', description: "Cetak label nama, NIS, dan rombel untuk satu rombel.", icon: 'bi-tags-fill' },
    { id: ReportType.DaftarRombel, title: 'Daftar Santri per Rombel', description: "Cetak daftar nama santri dalam satu rombel.", icon: 'bi-people' },
    { id: ReportType.DaftarWaliKelas, title: 'Daftar Wali Kelas', description: "Cetak rekapitulasi daftar wali kelas per rombel.", icon: 'bi-person-lines-fill' },
    { id: ReportType.LembarKedatangan, title: 'Lembar Kedatangan Santri', description: "Rekapitulasi kedatangan santri setelah liburan.", icon: 'bi-calendar2-check-fill' },
    { id: ReportType.LembarRapor, title: 'Pengambilan & Pengumpulan Rapor', description: "Cetak lembar rekapitulasi pengambilan dan pengumpulan rapor.", icon: 'bi-file-earmark-check-fill' },
    { id: ReportType.LembarNilai, title: 'Lembar Nilai', description: "Cetak lembar nilai kosong untuk satu rombel.", icon: 'bi-card-checklist' },
    { id: ReportType.LembarAbsensi, title: 'Lembar Absensi', description: "Cetak lembar absensi bulanan untuk satu rombel.", icon: 'bi-calendar-check' },
    { id: ReportType.LaporanKontak, title: 'Laporan Kontak Wali Santri', description: "Ekspor daftar kontak wali santri ke format CSV (untuk Google Contacts/HP).", icon: 'bi-person-lines-fill' },
  ], []);

  const availableKelas = useMemo(() => {
    if (!selectedJenjangId) return settings.kelas;
    return settings.kelas.filter(k => k.jenjangId === parseInt(selectedJenjangId));
  }, [selectedJenjangId, settings.kelas]);

  const availableRombel = useMemo(() => {
    if (!selectedKelasId) return settings.rombel.filter(r => availableKelas.map(k => k.id).includes(r.kelasId));
    return settings.rombel.filter(r => r.kelasId === parseInt(selectedKelasId));
  }, [selectedKelasId, settings.rombel, availableKelas]);

  const filteredSantri = useMemo(() => {
    const filtered = santriList.filter(s => {
      const provinsiMatch = !selectedProvinsi || s.alamat.provinsi?.toLowerCase().includes(selectedProvinsi.toLowerCase());
      const kabupatenMatch = !selectedKabupaten || s.alamat.kabupatenKota?.toLowerCase().includes(selectedKabupaten.toLowerCase());
      const kecamatanMatch = !selectedKecamatan || s.alamat.kecamatan?.toLowerCase().includes(selectedKecamatan.toLowerCase());

      return (
        (!selectedJenjangId || s.jenjangId === parseInt(selectedJenjangId)) &&
        (!selectedKelasId || s.kelasId === parseInt(selectedKelasId)) &&
        (!selectedRombelId || s.rombelId === parseInt(selectedRombelId)) &&
        (!selectedStatus || s.status === selectedStatus) &&
        (!selectedGender || s.jenisKelamin === selectedGender) &&
        provinsiMatch &&
        kabupatenMatch &&
        kecamatanMatch
      );
    });

    // Apply Sorting
    return filtered.sort((a, b) => {
        const valA = (a[sortBy] || '').toString().toLowerCase();
        const valB = (b[sortBy] || '').toString().toLowerCase();

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
    });
  }, [santriList, selectedJenjangId, selectedKelasId, selectedRombelId, selectedStatus, selectedGender, selectedProvinsi, selectedKabupaten, selectedKecamatan, sortBy, sortOrder]);
  
  const filteredGedung = useMemo(() => {
    if (!selectedGedungId) return settings.gedungAsrama;
    return settings.gedungAsrama.filter(g => g.id === parseInt(selectedGedungId));
  }, [settings.gedungAsrama, selectedGedungId]);

  const reportConfig = useReportConfig(filteredSantri, santriList);
  const { activeReport, setActiveReport, canGenerate, resetReportSpecificState, paperSize, margin } = reportConfig;

  const { generateReport, paperDimensions, marginValues, resetGuidanceFlag } = useReportGenerator(settings);

  useEffect(() => {
    const calculateAndSetZoom = () => {
        if (previewContainerRef.current && contentWrapperRef.current) {
            const containerWidth = previewContainerRef.current.clientWidth;
            const contentWidth = contentWrapperRef.current.scrollWidth;
            if (contentWidth > containerWidth) {
                const scale = (containerWidth - 16) / contentWidth;
                setSmartZoomScale(scale);
            } else {
                setSmartZoomScale(1);
            }
        }
    };
    if (previewContent) {
        const timer = setTimeout(calculateAndSetZoom, 50);
        window.addEventListener('resize', calculateAndSetZoom);
        return () => { clearTimeout(timer); window.removeEventListener('resize', calculateAndSetZoom); };
    } else {
        setSmartZoomScale(1);
    }
  }, [previewContent]);

  useEffect(() => {
    if (previewContent && previewAreaRef.current) {
        previewAreaRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [previewContent]);

  useEffect(() => {
    const styleEl = document.getElementById('print-style-sheet');
    if (styleEl) {
      const dims = paperDimensions[paperSize as keyof typeof paperDimensions];
      const marg = marginValues[margin as keyof typeof marginValues];
      const portraitRule = `@page portrait { size: ${dims.width}cm ${dims.height}cm; margin: ${marg}cm; }`;
      const landscapeRule = `@page landscape { size: ${dims.height}cm ${dims.width}cm; margin: ${marg}cm; }`;
      styleEl.innerHTML = `${portraitRule}\n${landscapeRule}`;
    }
  }, [paperSize, margin, paperDimensions, marginValues]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (downloadMenuRef.current && !downloadMenuRef.current.contains(event.target as Node)) {
            setIsDownloadMenuOpen(false);
        }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
        document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const clearPreview = () => {
    setPreviewContent(null);
    setPageCount(0);
  };

  const handleSelectReport = (reportId: ReportType) => {
    setActiveReport(reportId);
    setSelectedJenjangId('');
    setSelectedKelasId('');
    setSelectedRombelId('');
    setSelectedStatus('');
    setSelectedGender('');
    setSelectedProvinsi('');
    setSelectedKabupaten('');
    setSelectedKecamatan('');
    setSelectedGedungId('');
    // Reset Sort defaults
    setSortBy('namaLengkap');
    setSortOrder('asc');
    clearPreview();
    resetReportSpecificState();
  };
  
  const handlePrint = () => { window.print(); };

  // New Function for High Quality Native PDF
  const handleDownloadPdfNative = () => {
      const fileName = `Laporan_${activeReport}_${new Date().toISOString().slice(0, 10)}`;
      printToPdfNative('preview-area', fileName);
      setIsDownloadMenuOpen(false);
      showToast('Membuka dialog cetak... Pilih "Save as PDF".', 'info');
  };

  const handleDownloadPdf = async () => {
      if (!previewContainerRef.current || !contentWrapperRef.current) return;
      
      setIsPdfGenerating(true);
      const originalTransform = contentWrapperRef.current.style.transform;
      contentWrapperRef.current.style.transform = 'none';

      try {
          const fileName = `Laporan_${activeReport}_${new Date().toISOString().slice(0, 10)}.pdf`;
          
          await generatePdf('preview-area', {
              paperSize: paperSize,
              fileName: fileName
          });
          
          showToast('PDF (Gambar) berhasil diunduh', 'success');
      } catch (error) {
          console.error('Failed to generate PDF:', error);
          showToast('Gagal membuat PDF', 'error');
      } finally {
          contentWrapperRef.current.style.transform = originalTransform;
          setIsPdfGenerating(false);
          setIsDownloadMenuOpen(false);
      }
  };

  const handleDownloadSvg = async () => {
      if (!contentWrapperRef.current) return;
      setIsPdfGenerating(true);
      try {
          const fileName = `Kartu_Santri_${new Date().toISOString().slice(0, 10)}`;
          await exportReportToSvg('preview-area', fileName);
          showToast('File SVG berhasil diunduh', 'success');
      } catch (error) {
          console.error('Failed to export SVG:', error);
          showToast('Gagal mengekspor SVG', 'error');
      } finally {
          setIsPdfGenerating(false);
          setIsDownloadMenuOpen(false);
      }
  };

  const handleDownloadHtml = () => {
    const previewHtml = contentWrapperRef.current?.innerHTML;
    if (!previewHtml) {
        alert("Tidak ada konten pratinjau untuk diunduh.");
        return;
    }

    let allCss = '';
    for (const sheet of Array.from(document.styleSheets)) {
        try {
            if (sheet.cssRules) {
                for (const rule of Array.from(sheet.cssRules)) {
                    allCss += rule.cssText + '\n';
                }
            }
        } catch (e) {
            console.warn('Gagal membaca aturan CSS dari stylesheet:', sheet.href, e);
        }
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="id">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=1200">
          <title>Laporan eSantri - ${activeReport ? reportTypes.find(r => r.id === activeReport)?.title : ''}</title>
          <style>
            /* Embedded CSS rules */
            ${allCss}
            /* Add a body style for better viewing of the downloaded file */
            body {
              background-color: #e5e7eb; /* bg-gray-200 */
              padding: 2rem; /* p-8 */
            }
          </style>
        </head>
        <body>
          <div class="printable-content-wrapper">
            ${previewHtml}
          </div>
        </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `laporan_${activeReport}_${new Date().toISOString().slice(0, 10)}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setIsDownloadMenuOpen(false);
};

  const handleDownloadCsvContacts = () => {
      const csvContent = generateContactCsv(filteredSantri, settings);
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `Kontak_Wali_Santri_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setIsDownloadMenuOpen(false);
      showToast('File CSV Kontak berhasil diunduh. Silakan impor ke Google Contacts/HP.', 'success');
  };


  const handleGeneratePreview = () => {
    // ... (rest of the logic remains the same)
    if (!activeReport) return;
    setIsPreviewGenerating(true);
    setManualZoom(1);
    resetGuidanceFlag();

    setTimeout(() => {
        let options: any = { ...reportConfig.options, paperSize, margin, filteredGedung };
        let allPreviews: { content: React.ReactNode; orientation: 'portrait' | 'landscape' }[] = [];
        const perRombelReports = [ReportType.DaftarRombel, ReportType.LembarKedatangan, ReportType.LembarNilai, ReportType.LembarAbsensi, ReportType.LembarRapor];
        const allSantriReports = [ReportType.LaporanMutasi, ReportType.DashboardSummary, ReportType.FinanceSummary, ReportType.LaporanAsrama, ReportType.LaporanKontak, ReportType.DaftarWaliKelas];

        // --- Data preparation for financial reports ---
        if (activeReport === ReportType.FinanceSummary) {
            options.tagihanList = tagihanList;
            options.pembayaranList = pembayaranList;
        }
        
        if (activeReport === ReportType.LaporanArusKas) {
            const startDate = new Date(reportConfig.options.kasStartDate);
            const endDate = new Date(reportConfig.options.kasEndDate + 'T23:59:59');
            options.filteredKas = transaksiKasList.filter(t => {
                const tDate = new Date(t.tanggal);
                return tDate >= startDate && tDate <= endDate;
            });
            options.allKas = transaksiKasList;
        }

        if (activeReport === ReportType.RekeningKoranSantri) {
            options.tagihanList = tagihanList;
            options.pembayaranList = pembayaranList;
            options.transaksiSaldoList = transaksiSaldoList;
        }
        // --- End data preparation ---

        if (allSantriReports.includes(activeReport) || activeReport === ReportType.LaporanArusKas) {
            allPreviews = generateReport(activeReport, filteredSantri, options);
        } else if (perRombelReports.includes(activeReport)) {
            // Group filtered (and sorted) santri by rombel
            const santriByRombel = filteredSantri.reduce<Record<number, Santri[]>>((acc, santri) => {
                const rombelId = santri.rombelId;
                if (!acc[rombelId]) acc[rombelId] = [];
                acc[rombelId].push(santri);
                return acc;
            }, {} as Record<number, Santri[]>);

            for (const rombelList of Object.values(santriByRombel)) {
                const typedRombelList = rombelList as Santri[];
                if (typedRombelList.length > 0) {
                     allPreviews.push(...generateReport(activeReport, typedRombelList, options));
                }
            }
        } else {
            let listToPrint: Santri[] = [];
            if (activeReport === ReportType.Biodata) listToPrint = options.biodataPrintMode === 'all' ? filteredSantri : filteredSantri.filter(s => options.selectedBiodataSantriIds.includes(s.id));
            else if (activeReport === ReportType.LembarPembinaan) listToPrint = options.pembinaanPrintMode === 'all' ? filteredSantri : filteredSantri.filter(s => options.selectedPembinaanSantriIds.includes(s.id));
            else if (activeReport === ReportType.FormulirIzin) listToPrint = options.izinPrintMode === 'all' ? filteredSantri : filteredSantri.filter(s => options.selectedIzinSantriIds.includes(s.id));
            else if (activeReport === ReportType.KartuSantri) listToPrint = options.cardPrintMode === 'all' ? filteredSantri : filteredSantri.filter(s => options.selectedCardSantriIds.includes(s.id));
            else if (activeReport === ReportType.LabelSantri) listToPrint = options.labelPrintMode === 'all' ? filteredSantri : filteredSantri.filter(s => options.selectedLabelSantriIds.includes(s.id));
            else if (activeReport === ReportType.RekeningKoranSantri) listToPrint = options.rekeningKoranPrintMode === 'all' ? filteredSantri : filteredSantri.filter(s => options.selectedRekeningKoranSantriIds.includes(s.id));

            if (listToPrint.length > 0) allPreviews = generateReport(activeReport, listToPrint, options);
        }
        
        const currentPaper = paperDimensions[paperSize as keyof typeof paperDimensions];
        const currentMarginCm = marginValues[margin as keyof typeof marginValues];

        setPreviewContent(
            <>
                {allPreviews.map((p, i) => (
                  <div key={i} className={`bg-white shadow-lg mx-auto page-break-after flex flex-col ${p.orientation === 'landscape' ? 'print-landscape' : 'print-portrait'} ${i < allPreviews.length - 1 ? 'mb-8' : 'mb-2'}`}
                      style={{ 
                          width: `${p.orientation === 'landscape' ? currentPaper.height : currentPaper.width}cm`,
                          minHeight: `${p.orientation === 'landscape' ? currentPaper.width : currentPaper.height}cm`
                      }}>
                      <div style={{ padding: `${currentMarginCm}cm`, flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
                        {p.content}
                      </div>
                  </div>
                ))}
            </>
        );
        setPageCount(allPreviews.length);
        setIsPreviewGenerating(false);
    }, 50);
  };

  const isSummaryReport = activeReport === ReportType.DashboardSummary || activeReport === ReportType.FinanceSummary || activeReport === ReportType.DaftarWaliKelas;
  const isFinancialReport = activeReport === ReportType.LaporanArusKas || activeReport === ReportType.RekeningKoranSantri;

  return (
    <div>
      {/* ... (Previous code) ... */}
      <h1 className="text-3xl font-bold text-gray-800 mb-6 no-print">Laporan & Cetak</h1>
      <div className="bg-white p-6 rounded-lg shadow-md no-print">
        <h2 className="text-xl font-bold text-gray-700 mb-4">1. Pilih Jenis Laporan</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {reportTypes.map(report => (
            <button key={report.id} onClick={() => handleSelectReport(report.id)} className={`p-4 border rounded-lg text-left transition-all duration-200 ${activeReport === report.id ? 'bg-teal-50 border-teal-500 ring-2 ring-teal-300' : 'bg-white hover:bg-gray-50 hover:border-gray-300'}`}>
              <div className="flex items-start gap-4"><div className={`p-2 rounded-md bg-teal-100 text-teal-600`}><i className={`bi ${report.icon} text-xl`}></i></div><div><h3 className="font-semibold text-gray-800">{report.title}</h3><p className="text-sm text-gray-500 mt-1">{report.description}</p></div></div>
            </button>
          ))}
        </div>

        {/* ... (Options Rendering Logic) ... */}
        {activeReport && (
          <div className="mt-6 border-t pt-6">
            <h2 className="text-xl font-bold text-gray-700 mb-4">2. Atur Filter & Lihat Pratinjau</h2>
            <div className="bg-gray-50 p-4 rounded-lg space-y-4">
              {/* ... (Filter Components) ... */}
              {activeReport === ReportType.LaporanMutasi ? (
                <div>
                  <h3 className="text-md font-semibold text-gray-700 mb-2">Filter Rentang Tanggal Mutasi</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div><label className="block mb-1 text-sm font-medium text-gray-700">Tanggal Mulai</label><input type="date" value={reportConfig.options.mutasiStartDate} onChange={e => reportConfig.options.setMutasiStartDate(e.target.value)} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5" /></div>
                      <div><label className="block mb-1 text-sm font-medium text-gray-700">Tanggal Selesai</label><input type="date" value={reportConfig.options.mutasiEndDate} onChange={e => reportConfig.options.setMutasiEndDate(e.target.value)} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5" /></div>
                  </div>
                </div>
              ) : !isSummaryReport && !isFinancialReport ? (
                <>
                  {/* ... (Gedung/Santri Filters) ... */}
                  {activeReport === ReportType.LaporanAsrama ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        <div>
                            <label className="block mb-1 text-sm font-medium text-gray-700">Gedung Asrama</label>
                            <select value={selectedGedungId} onChange={e => { setSelectedGedungId(e.target.value); clearPreview(); }} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5">
                                <option value="">Semua Gedung</option>
                                {settings.gedungAsrama.map(g => <option key={g.id} value={g.id}>{g.nama}</option>)}
                            </select>
                        </div>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                          <div><label className="block mb-1 text-sm font-medium text-gray-700">Jenjang</label><select value={selectedJenjangId} onChange={e => { setSelectedJenjangId(e.target.value); setSelectedKelasId(''); setSelectedRombelId(''); clearPreview(); reportConfig.options.setSelectedMapelIds([]); }} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5"><option value="">Semua Jenjang</option>{settings.jenjang.map(j => <option key={j.id} value={j.id}>{j.nama}</option>)}</select></div>
                          <div><label className="block mb-1 text-sm font-medium text-gray-700">Kelas</label><select value={selectedKelasId} onChange={e => { setSelectedKelasId(e.target.value); setSelectedRombelId(''); clearPreview(); }} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5"><option value="">Semua Kelas</option>{availableKelas.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}</select></div>
                          <div><label className="block mb-1 text-sm font-medium text-gray-700">Rombel</label><select value={selectedRombelId} onChange={e => { setSelectedRombelId(e.target.value); clearPreview(); resetReportSpecificState(); }} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5"><option value="">Semua Rombel</option>{availableRombel.map(r => <option key={r.id} value={r.id}>{r.nama}</option>)}</select></div>
                          <div><label className="block mb-1 text-sm font-medium text-gray-700">Status Santri</label><select value={selectedStatus} onChange={e => { setSelectedStatus(e.target.value); clearPreview(); }} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5"><option value="">Semua Status</option><option value="Aktif">Aktif</option><option value="Hiatus">Hiatus</option><option value="Lulus">Lulus</option><option value="Keluar/Pindah">Keluar/Pindah</option></select></div>
                          <div><label className="block mb-1 text-sm font-medium text-gray-700">Jenis Kelamin</label><select value={selectedGender} onChange={e => { setSelectedGender(e.target.value); clearPreview(); }} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5"><option value="">Semua Gender</option><option value="Laki-laki">Laki-laki</option><option value="Perempuan">Perempuan</option></select></div>
                      </div>
                      <div className="pt-4 border-t grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div><label className="block mb-1 text-sm font-medium text-gray-700">Provinsi</label><input type="text" placeholder="Filter Provinsi..." value={selectedProvinsi} onChange={e => setSelectedProvinsi(e.target.value)} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5" /></div>
                          <div><label className="block mb-1 text-sm font-medium text-gray-700">Kabupaten/Kota</label><input type="text" placeholder="Filter Kabupaten/Kota..." value={selectedKabupaten} onChange={e => setSelectedKabupaten(e.target.value)} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5" /></div>
                          <div><label className="block mb-1 text-sm font-medium text-gray-700">Kecamatan</label><input type="text" placeholder="Filter Kecamatan..." value={selectedKecamatan} onChange={e => setSelectedKecamatan(e.target.value)} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5" /></div>
                      </div>
                      
                      {/* Sorting Options */}
                      <div className="pt-4 border-t">
                          <label className="block mb-1 text-sm font-medium text-gray-700">Pengaturan Urutan Data</label>
                          <div className="flex gap-4">
                              <div className="w-full md:w-1/3">
                                  <select value={sortBy} onChange={(e) => { setSortBy(e.target.value as any); clearPreview(); }} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5">
                                      <option value="namaLengkap">Urut Berdasarkan: Nama Lengkap</option>
                                      <option value="nis">Urut Berdasarkan: NIS</option>
                                  </select>
                              </div>
                              <div className="w-full md:w-1/3">
                                  <select value={sortOrder} onChange={(e) => { setSortOrder(e.target.value as any); clearPreview(); }} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5">
                                      <option value="asc">A - Z (Naik)</option>
                                      <option value="desc">Z - A (Turun)</option>
                                  </select>
                              </div>
                          </div>
                      </div>
                    </>
                  )}
                </>
              ) : null}

              {/* ... (Paper Config) ... */}
              <div className="pt-4 border-t">
                  <h3 className="text-md font-semibold text-gray-700 mb-2">Pengaturan Kertas & Cetak</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div><label className="block mb-1 text-sm font-medium text-gray-700">Ukuran Kertas</label><select value={paperSize} onChange={e => reportConfig.setPaperSize(e.target.value)} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5"><option value="A4">A4 (21 x 29.7 cm)</option><option value="F4">F4 (21.5 x 33 cm)</option><option value="Legal">Legal (21.6 x 35.6 cm)</option><option value="Letter">Letter (21.6 x 27.9 cm)</option></select></div>
                      <div><label className="block mb-1 text-sm font-medium text-gray-700">Margin Halaman</label><select value={margin} onChange={e => reportConfig.setMargin(e.target.value)} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5"><option value="narrow">Narrow (1.27 cm)</option><option value="normal">Normal (2 cm)</option><option value="wide">Wide (3 cm)</option></select></div>
                  </div>
              </div>
              
              <ReportOptions config={reportConfig} filteredSantri={filteredSantri} settings={settings} selectedJenjangId={selectedJenjangId} />

              <div className="flex justify-end pt-4 border-t">
                  <button onClick={handleGeneratePreview} disabled={!canGenerate || isPreviewGenerating} className="bg-teal-600 text-white px-5 py-2.5 rounded-lg hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium min-w-[190px]">
                      {isPreviewGenerating ? (<><svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg><span>Memproses...</span></>) : (<><i className="bi bi-eye-fill"></i> Tampilkan Pratinjau</>)}
                  </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {previewContent && (
        <div className="bg-white p-6 rounded-lg shadow-md mt-6 preview-container" ref={previewAreaRef}>
            <div className="flex flex-wrap justify-between items-center gap-x-4 gap-y-2 mb-4 no-print">
                <div className="flex items-center gap-x-4 gap-y-2 flex-wrap"><h2 className="text-xl font-bold text-gray-700 whitespace-nowrap">3. Pratinjau Laporan</h2>{pageCount > 0 && (<span className="text-sm font-medium bg-gray-200 text-gray-700 px-2.5 py-1 rounded-full">Estimasi: {pageCount} halaman</span>)}</div>
                <div className="flex items-center gap-2">
                    {/* Combined Download Dropdown */}
                    <div className="relative" ref={downloadMenuRef}>
                        <button
                            onClick={() => setIsDownloadMenuOpen(!isDownloadMenuOpen)}
                            disabled={isPdfGenerating}
                            className="bg-green-600 text-white px-5 py-2 rounded-lg hover:bg-green-700 flex items-center justify-center gap-2 font-medium w-full sm:w-auto disabled:bg-gray-300 disabled:cursor-not-allowed"
                        >
                            {isPdfGenerating ? (
                                <><span className="animate-spin h-4 w-4 border-b-2 border-white rounded-full"></span> Proses...</>
                            ) : (
                                <><i className="bi bi-download"></i> Unduh <i className={`bi bi-chevron-down text-xs transition-transform duration-200 ${isDownloadMenuOpen ? 'rotate-180' : ''}`}></i></>
                            )}
                        </button>
                        {isDownloadMenuOpen && !isPdfGenerating && (
                            <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg py-1 z-50 ring-1 ring-black ring-opacity-5">
                                {activeReport === ReportType.LaporanKontak && (
                                    <button
                                        onClick={handleDownloadCsvContacts}
                                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 border-b"
                                    >
                                        <i className="bi bi-file-earmark-spreadsheet-fill text-green-700"></i>
                                        <div>
                                            <div className="font-semibold">Unduh CSV (Format Kontak)</div>
                                            <div className="text-[10px] text-gray-500">Kompatibel Google Contacts / HP</div>
                                        </div>
                                    </button>
                                )}
                                <button
                                    onClick={handleDownloadPdfNative}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 border-b"
                                    title="Disarankan untuk percetakan. Gunakan opsi 'Save as PDF' di dialog cetak."
                                >
                                    <i className="bi bi-file-earmark-pdf-fill text-red-600"></i> 
                                    <div>
                                        <div className="font-semibold">Cetak PDF (Vektor)</div>
                                        <div className="text-[10px] text-gray-500">Kualitas Terbaik (Print Native)</div>
                                    </div>
                                </button>
                                <button
                                    onClick={handleDownloadPdf}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                >
                                    <i className="bi bi-image text-gray-500"></i> Format PDF (Gambar)
                                </button>
                                {activeReport === ReportType.KartuSantri && (
                                    <button
                                        onClick={handleDownloadSvg}
                                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                    >
                                        <i className="bi bi-vector-pen text-purple-600"></i> Format SVG (Vector)
                                    </button>
                                )}
                                <button
                                    onClick={handleDownloadHtml}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                >
                                    <i className="bi bi-filetype-html text-green-600"></i> Format HTML
                                </button>
                            </div>
                        )}
                    </div>

                    <button onClick={handlePrint} className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 font-medium w-full sm:w-auto">
                        <i className="bi bi-printer-fill"></i><span className="hidden lg:inline">Cetak Laporan</span><span className="lg:hidden">Cetak</span>
                    </button>
                </div>
            </div>
            <div className="relative">
                <div id="preview-area" ref={previewContainerRef} className="p-8 bg-gray-200 rounded-lg overflow-auto flex justify-center max-h-[80vh]">
                    <div ref={contentWrapperRef} className="printable-content-wrapper" style={{ transform: `scale(${smartZoomScale * manualZoom})`, transformOrigin: 'top center', transition: 'transform 0.2s ease-in-out' }}>
                        {previewContent}
                    </div>
                </div>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 opacity-30 hover:opacity-100 focus-within:opacity-100 transition-opacity duration-300 no-print">
                    <div className="flex items-center gap-2 bg-gray-900/80 backdrop-blur-sm text-white rounded-full p-2 shadow-lg"><button onClick={() => setManualZoom(z => Math.max(0.25, z - 0.1))} className="w-10 h-10 rounded-full hover:bg-white/20 transition-colors flex items-center justify-center" aria-label="Zoom Out" title="Zoom Out"><i className="bi bi-zoom-out text-xl"></i></button><span className="font-mono text-sm w-16 text-center select-none">{Math.round(smartZoomScale * manualZoom * 100)}%</span><button onClick={() => setManualZoom(z => Math.min(3, z + 0.1))} className="w-10 h-10 rounded-full hover:bg-white/20 transition-colors flex items-center justify-center" aria-label="Zoom In" title="Zoom In"><i className="bi bi-zoom-in text-xl"></i></button></div>
                </div>
            </div>
        </div>
      )}
      {!activeReport && 
        <div className="text-center py-10 px-6 bg-gray-50 mt-6 rounded-lg no-print">
            <i className="bi bi-journal-arrow-up text-5xl text-gray-300"></i>
            <p className="mt-4 text-gray-500">Pilih jenis laporan di atas untuk memulai.</p>
        </div>
      }
    </div>
  );
};

export default Reports;
