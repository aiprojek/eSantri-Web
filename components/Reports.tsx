import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Santri, PondokSettings, ReportType, GedungAsrama, TransaksiKas } from '../types';
import { useAppContext } from '../AppContext';
import { useReportGenerator } from '../hooks/useReportGenerator';
import { useReportConfig } from '../hooks/useReportConfig';
import { ReportOptions } from './reports/ReportOptions';

const Reports: React.FC = () => {
  const { santriList, settings, tagihanList, pembayaranList, transaksiSaldoList, transaksiKasList } = useAppContext();
  
  const [selectedJenjangId, setSelectedJenjangId] = useState<string>('');
  const [selectedKelasId, setSelectedKelasId] = useState<string>('');
  const [selectedRombelId, setSelectedRombelId] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedGender, setSelectedGender] = useState<string>('');
  const [selectedProvinsi, setSelectedProvinsi] = useState<string>('');
  const [selectedKabupaten, setSelectedKabupaten] = useState<string>('');
  const [selectedKecamatan, setSelectedKecamatan] = useState<string>('');
  const [selectedGedungId, setSelectedGedungId] = useState<string>('');

  const [previewContent, setPreviewContent] = useState<React.ReactNode | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [isPreviewGenerating, setIsPreviewGenerating] = useState(false);

  const [manualZoom, setManualZoom] = useState(1);
  const [smartZoomScale, setSmartZoomScale] = useState(1);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const contentWrapperRef = useRef<HTMLDivElement>(null);
  const previewAreaRef = useRef<HTMLDivElement>(null);

  const availableKelas = useMemo(() => {
    if (!selectedJenjangId) return settings.kelas;
    return settings.kelas.filter(k => k.jenjangId === parseInt(selectedJenjangId));
  }, [selectedJenjangId, settings.kelas]);

  const availableRombel = useMemo(() => {
    if (!selectedKelasId) return settings.rombel.filter(r => availableKelas.map(k => k.id).includes(r.kelasId));
    return settings.rombel.filter(r => r.kelasId === parseInt(selectedKelasId));
  }, [selectedKelasId, settings.rombel, availableKelas]);

  const filteredSantri = useMemo(() => {
    return santriList.filter(s => {
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
  }, [santriList, selectedJenjangId, selectedKelasId, selectedRombelId, selectedStatus, selectedGender, selectedProvinsi, selectedKabupaten, selectedKecamatan]);
  
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
    { id: ReportType.LembarKedatangan, title: 'Lembar Kedatangan Santri', description: "Rekapitulasi kedatangan santri setelah liburan.", icon: 'bi-calendar2-check-fill' },
    { id: ReportType.LembarRapor, title: 'Pengambilan & Pengumpulan Rapor', description: "Cetak lembar rekapitulasi pengambilan dan pengumpulan rapor.", icon: 'bi-file-earmark-check-fill' },
    { id: ReportType.LembarNilai, title: 'Lembar Nilai', description: "Cetak lembar nilai kosong untuk satu rombel.", icon: 'bi-card-checklist' },
    { id: ReportType.LembarAbsensi, title: 'Lembar Absensi', description: "Cetak lembar absensi bulanan untuk satu rombel.", icon: 'bi-calendar-check' },
  ], []);

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
    clearPreview();
    resetReportSpecificState();
  };
  
  const handlePrint = () => { window.print(); };

  const handleGeneratePreview = () => {
    if (!activeReport) return;
    setIsPreviewGenerating(true);
    setManualZoom(1);
    resetGuidanceFlag();

    setTimeout(() => {
        let options: any = { ...reportConfig.options, paperSize, margin, filteredGedung };
        let allPreviews: { content: React.ReactNode; orientation: 'portrait' | 'landscape' }[] = [];
        const perRombelReports = [ReportType.DaftarRombel, ReportType.LembarKedatangan, ReportType.LembarNilai, ReportType.LembarAbsensi, ReportType.LembarRapor];
        const allSantriReports = [ReportType.LaporanMutasi, ReportType.DashboardSummary, ReportType.FinanceSummary, ReportType.LaporanAsrama];

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
            allPreviews = generateReport(activeReport, santriList, options);
        } else if (perRombelReports.includes(activeReport)) {
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
                  <div key={i} className={`bg-white shadow-lg mx-auto page-break-after ${p.orientation === 'landscape' ? 'print-landscape' : 'print-portrait'} ${i < allPreviews.length - 1 ? 'mb-8' : 'mb-2'}`}
                      style={{ width: `${p.orientation === 'landscape' ? currentPaper.height : currentPaper.width}cm` }}>
                      <div style={{ padding: `${currentMarginCm}cm` }}>{p.content}</div>
                  </div>
                ))}
            </>
        );
        setPageCount(allPreviews.length);
        setIsPreviewGenerating(false);
    }, 50);
  };

  const isSummaryReport = activeReport === ReportType.DashboardSummary || activeReport === ReportType.FinanceSummary;
  const isFinancialReport = activeReport === ReportType.LaporanArusKas || activeReport === ReportType.RekeningKoranSantri;

  return (
    <div>
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

        {activeReport && (
          <div className="mt-6 border-t pt-6">
            <h2 className="text-xl font-bold text-gray-700 mb-4">2. Atur Filter & Lihat Pratinjau</h2>
            <div className="bg-gray-50 p-4 rounded-lg space-y-4">
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
                    </>
                  )}
                </>
              ) : null}

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
                <button onClick={handlePrint} className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 font-medium w-full sm:w-auto"><i className="bi bi-printer-fill"></i><span className="hidden lg:inline">Cetak Laporan Ini</span><span className="lg:hidden">Cetak</span></button>
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