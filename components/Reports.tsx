
import React, { useState, useMemo, useRef } from 'react';
import { ReportType, Santri } from '../types';
import { useAppContext } from '../AppContext';
import { useReportGenerator } from '../hooks/useReportGenerator';
import { useReportConfig } from '../hooks/useReportConfig';
import { ReportSelectionHome } from './reports/ReportSelectionHome';
import { ReportFilterPanel } from './reports/ReportFilterPanel';
import { ReportPreviewPanel } from './reports/ReportPreviewPanel';

const Reports: React.FC = () => {
  const { santriList, settings, tagihanList, pembayaranList, transaksiSaldoList, transaksiKasList, showToast } = useAppContext();
  
  // -- Navigation State --
  const [currentView, setCurrentView] = useState<'home' | 'detail'>('home');
  const [activeReportType, setActiveReportType] = useState<ReportType | null>(null);

  // -- Filter State (Lifted Up) --
  const [filters, setFilters] = useState({
      jenjangId: '',
      kelasId: '',
      rombelId: '',
      status: '',
      gender: '',
      gedungId: '',
      provinsi: '',
      kabupaten: '',
      kecamatan: '',
      sortBy: 'namaLengkap',
      sortOrder: 'asc'
  });

  // -- Data Derived from Filters --
  const availableKelas = useMemo(() => {
    if (!filters.jenjangId) return settings.kelas;
    return settings.kelas.filter(k => k.jenjangId === parseInt(filters.jenjangId));
  }, [filters.jenjangId, settings.kelas]);

  const availableRombel = useMemo(() => {
    if (!filters.kelasId) return settings.rombel.filter(r => availableKelas.map(k => k.id).includes(r.kelasId));
    return settings.rombel.filter(r => r.kelasId === parseInt(filters.kelasId));
  }, [filters.kelasId, settings.rombel, availableKelas]);

  const filteredSantri = useMemo(() => {
    // If report is pure generic (like Dashboard Summary), we might pass all santri or handle inside generator
    // but consistent filtering is good.
    const result = santriList.filter(s => {
      return (
        (!filters.jenjangId || s.jenjangId === parseInt(filters.jenjangId)) &&
        (!filters.kelasId || s.kelasId === parseInt(filters.kelasId)) &&
        (!filters.rombelId || s.rombelId === parseInt(filters.rombelId)) &&
        (!filters.status || s.status === filters.status) &&
        (!filters.gender || s.jenisKelamin === filters.gender) &&
        (!filters.provinsi || s.alamat.provinsi?.toLowerCase().includes(filters.provinsi.toLowerCase()))
      );
    });

    return result.sort((a, b) => {
        const valA = (a[filters.sortBy as keyof typeof a] || '').toString().toLowerCase();
        const valB = (b[filters.sortBy as keyof typeof b] || '').toString().toLowerCase();
        if (valA < valB) return filters.sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return filters.sortOrder === 'asc' ? 1 : -1;
        return 0;
    });
  }, [santriList, filters]);

  const filteredGedung = useMemo(() => {
    if (!filters.gedungId) return settings.gedungAsrama;
    return settings.gedungAsrama.filter(g => g.id === parseInt(filters.gedungId));
  }, [settings.gedungAsrama, filters.gedungId]);

  // -- Hooks for Logic --
  const reportConfig = useReportConfig(filteredSantri, santriList);
  const { generateReport, paperDimensions, marginValues, resetGuidanceFlag } = useReportGenerator(settings);

  // -- Preview State --
  const [previewContent, setPreviewContent] = useState<React.ReactNode | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);

  // -- Specific Data for Export --
  const [exportData, setExportData] = useState<any>({});

  // -- Handlers --
  const handleSelectReport = (type: ReportType) => {
      setActiveReportType(type);
      reportConfig.setActiveReport(type);
      // Reset basic filters but keep some if useful? Better reset for clean slate.
      setFilters(f => ({ ...f, jenjangId: '', kelasId: '', rombelId: '', status: '', gedungId: '' })); 
      setPreviewContent(null);
      setPageCount(0);
      setCurrentView('detail');
      // Also reset internal report options
      reportConfig.resetReportSpecificState();
  };

  const handleBackToHome = () => {
      setCurrentView('home');
      setActiveReportType(null);
      setPreviewContent(null);
  };

  const handleFilterChange = (key: string, value: string) => {
      setFilters(prev => {
          const next = { ...prev, [key]: value };
          // Cascading reset
          if (key === 'jenjangId') { next.kelasId = ''; next.rombelId = ''; }
          if (key === 'kelasId') { next.rombelId = ''; }
          return next;
      });
      // Clear preview on filter change to avoid stale data visualization? 
      // Or keep it? Let's clear to force user to click "Generate" again for performance.
      setPreviewContent(null); 
  };

  const handleGenerate = () => {
      if (!activeReportType) return;
      setIsGenerating(true);
      resetGuidanceFlag();

      // Artificial timeout to allow UI to render spinner
      setTimeout(() => {
          // Prepare filtered data for export usage
          const filteredKasData = activeReportType === ReportType.LaporanArusKas ? transaksiKasList.filter(t => {
              const d = new Date(t.tanggal);
              const s = new Date(reportConfig.options.kasStartDate);
              const e = new Date(reportConfig.options.kasEndDate + 'T23:59:59');
              return d >= s && d <= e;
          }) : [];

          // Save to state for Export button to access
          setExportData({
              transaksiKas: filteredKasData,
              tagihanList: tagihanList, // For finance summary
          });

          const options: any = { 
              ...reportConfig.options, 
              paperSize: reportConfig.paperSize, 
              margin: reportConfig.margin,
              filteredGedung,
              // Inject heavy data only when needed
              tagihanList: activeReportType === ReportType.FinanceSummary || activeReportType === ReportType.RekeningKoranSantri ? tagihanList : [],
              pembayaranList: activeReportType === ReportType.FinanceSummary || activeReportType === ReportType.RekeningKoranSantri ? pembayaranList : [],
              transaksiSaldoList: activeReportType === ReportType.RekeningKoranSantri ? transaksiSaldoList : [],
              filteredKas: filteredKasData,
              allKas: activeReportType === ReportType.LaporanArusKas ? transaksiKasList : []
          };

          // Logic for generating preview content (same as before but cleaner call)
          // Determine list to use based on report type
          let listToUse = filteredSantri;
          
          // Special handling for selection-based reports
          if (activeReportType === ReportType.Biodata && reportConfig.options.biodataPrintMode === 'selected') {
              listToUse = filteredSantri.filter(s => reportConfig.options.selectedBiodataSantriIds.includes(s.id));
          } 
          // ... (Add other specific selection logic if needed, e.g. Cards, Labels) ...
          if (activeReportType === ReportType.KartuSantri && reportConfig.options.cardPrintMode === 'selected') {
              listToUse = filteredSantri.filter(s => reportConfig.options.selectedCardSantriIds.includes(s.id));
          }
          if (activeReportType === ReportType.LabelSantri && reportConfig.options.labelPrintMode === 'selected') {
              listToUse = filteredSantri.filter(s => reportConfig.options.selectedLabelSantriIds.includes(s.id));
          }

          // Special logic for Rombel grouping (Flattened in hook, but handled here)
          const perRombelReports = [ReportType.DaftarRombel, ReportType.LembarKedatangan, ReportType.LembarNilai, ReportType.LembarAbsensi, ReportType.LembarRapor];
          let generatedPages: any[] = [];

          if (perRombelReports.includes(activeReportType)) {
               const santriByRombel = listToUse.reduce<Record<number, Santri[]>>((acc, s) => {
                  if (!acc[s.rombelId]) acc[s.rombelId] = [];
                  acc[s.rombelId].push(s);
                  return acc;
              }, {});
              Object.values(santriByRombel).forEach((rombelSantri: Santri[]) => {
                  generatedPages.push(...generateReport(activeReportType, rombelSantri, options));
              });
          } else {
              generatedPages = generateReport(activeReportType, listToUse, options);
          }

          // Update Style for Printing
          const styleEl = document.getElementById('print-style-sheet');
          if (styleEl) {
              const dims = paperDimensions[reportConfig.paperSize as keyof typeof paperDimensions];
              const marg = marginValues[reportConfig.margin as keyof typeof marginValues];
              styleEl.innerHTML = `@page portrait { size: ${dims.width}cm ${dims.height}cm; margin: ${marg}cm; } @page landscape { size: ${dims.height}cm ${dims.width}cm; margin: ${marg}cm; }`;
          }

          // Render
          const currentPaper = paperDimensions[reportConfig.paperSize as keyof typeof paperDimensions];
          const currentMarginCm = marginValues[reportConfig.margin as keyof typeof marginValues];
          
          setPreviewContent(
              <>
                  {generatedPages.map((p, i) => (
                      <div key={i} className={`bg-white shadow-lg mx-auto page-break-after flex flex-col ${p.orientation === 'landscape' ? 'print-landscape' : 'print-portrait'} ${i < generatedPages.length - 1 ? 'mb-8' : 'mb-2'}`}
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
          setPageCount(generatedPages.length);
          setIsGenerating(false);
      }, 100);
  };

  const getReportTitle = () => {
      // Simple lookup, could use the list from ReportSelectionHome if exported
      return activeReportType ? activeReportType.replace(/([A-Z])/g, ' $1').trim() : 'Laporan';
  };

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col">
      {/* Header */}
      <div className="mb-4 flex justify-between items-center shrink-0">
          <div>
              <h1 className="text-2xl font-bold text-gray-800">Laporan & Cetak Dokumen</h1>
              <p className="text-sm text-gray-500">Pusat pencetakan dokumen resmi pesantren.</p>
          </div>
          {currentView === 'detail' && (
              <button onClick={handleBackToHome} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors font-medium flex items-center gap-2">
                  <i className="bi bi-arrow-left"></i> Kembali ke Menu
              </button>
          )}
      </div>

      {/* Content Area */}
      <div className="flex-grow relative overflow-hidden">
          {currentView === 'home' ? (
              <div className="h-full overflow-y-auto pr-2 custom-scrollbar">
                  <ReportSelectionHome onSelectReport={handleSelectReport} />
              </div>
          ) : (
              <div className="flex flex-col lg:flex-row gap-6 h-full">
                  {/* Left: Configuration Panel */}
                  <div className="w-full lg:w-1/3 xl:w-1/4 h-full flex flex-col">
                      <div className="bg-teal-50 border border-teal-200 p-3 rounded-lg mb-3 flex items-center gap-3 shrink-0">
                          <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center text-teal-600">
                              <i className="bi bi-file-text-fill text-xl"></i>
                          </div>
                          <div>
                              <div className="text-xs text-teal-600 font-bold uppercase tracking-wider">Laporan Aktif</div>
                              <div className="font-bold text-gray-800 leading-tight">{getReportTitle()}</div>
                          </div>
                      </div>
                      
                      <ReportFilterPanel 
                          activeReport={activeReportType!}
                          settings={settings}
                          filters={filters}
                          onFilterChange={handleFilterChange}
                          reportConfig={reportConfig}
                          filteredSantri={filteredSantri}
                          availableKelas={availableKelas}
                          availableRombel={availableRombel}
                          onGenerate={handleGenerate}
                          isGenerating={isGenerating}
                          canGenerate={reportConfig.canGenerate}
                      />
                  </div>

                  {/* Right: Preview Panel */}
                  <div className="w-full lg:w-2/3 xl:w-3/4 h-full bg-gray-100 rounded-xl overflow-hidden border border-gray-300">
                      <ReportPreviewPanel 
                          previewContent={previewContent}
                          activeReport={activeReportType!}
                          pageCount={pageCount}
                          isLoading={isGenerating}
                          paperSize={reportConfig.paperSize}
                          onToast={showToast}
                          filteredSantri={filteredSantri}
                          settings={settings}
                          excelData={exportData} // Pass the specific data needed for export
                      />
                  </div>
              </div>
          )}
      </div>
    </div>
  );
};

export default Reports;
