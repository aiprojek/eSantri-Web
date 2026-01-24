
import React from 'react';
import { Santri, PondokSettings, ReportType, RiwayatStatus } from '../types';
import { generateBiodataReports, generateCardReports, generateLabelReports } from '../components/reports/modules/IdentityReports';
import { generateNilaiReports, generateTableReport, generateRaporLengkapReports } from '../components/reports/modules/AcademicReports';
import { FinanceSummaryTemplate, LaporanArusKasTemplate, RekeningKoranSantriTemplate } from '../components/reports/modules/FinancialReports';
import { DaftarWaliKelasTemplate, LaporanKontakTemplate, LaporanAsramaTemplate, LaporanMutasiTemplate, LembarPembinaanTemplate, FormulirIzinTemplate, DashboardSummaryTemplate } from '../components/reports/modules/AdministrativeReports';
import { chunkArray } from '../components/reports/modules/Common';

export const useReportGenerator = (settings: PondokSettings) => {
    const paperDimensions = {
        'A4': { width: 21.0, height: 29.7 },
        'F4': { width: 21.5, height: 33.0 },
        'Legal': { width: 21.6, height: 35.6 },
        'Letter': { width: 21.6, height: 27.9 },
    };

    const marginValues = {
        'narrow': 1.27,
        'normal': 2.0,
        'wide': 3.0
    };

    const resetGuidanceFlag = () => { /* No-op */ };

    const generateReport = (reportType: ReportType, data: Santri[], options: any) => {
        let previews: { content: React.ReactNode; orientation: 'portrait' | 'landscape' }[] = [];

        switch (reportType) {
            case ReportType.Biodata:
                previews = generateBiodataReports(data, settings, options);
                break;
            case ReportType.KartuSantri:
                previews = generateCardReports(data, settings, options);
                break;
            case ReportType.LabelSantri:
                previews = generateLabelReports(data, settings, options);
                break;
            case ReportType.LembarNilai:
                previews = generateNilaiReports(data, settings, options);
                break;
            case ReportType.RaporLengkap:
                previews = generateRaporLengkapReports(data, settings, options);
                break;
            case ReportType.LembarAbsensi:
                previews = generateTableReport(data, settings, options, 'Absensi');
                break;
            case ReportType.DaftarRombel:
                previews = generateTableReport(data, settings, options, 'Rombel');
                break;
            case ReportType.LembarRapor:
                previews = generateTableReport(data, settings, options, 'Rapor');
                break;
            case ReportType.LembarKedatangan:
                previews = generateTableReport(data, settings, options, 'Kedatangan');
                break;
            case ReportType.DashboardSummary:
                previews.push({ content: <DashboardSummaryTemplate santriList={data} settings={settings} />, orientation: 'portrait' });
                break;
            case ReportType.FinanceSummary:
                previews.push({ content: <FinanceSummaryTemplate santriList={data} tagihanList={options.tagihanList} pembayaranList={options.pembayaranList} settings={settings} />, orientation: 'portrait' });
                break;
            case ReportType.LaporanArusKas:
                previews.push({ content: <LaporanArusKasTemplate settings={settings} options={options} />, orientation: 'portrait' });
                break;
            case ReportType.RekeningKoranSantri:
                data.forEach(santri => previews.push({ content: <RekeningKoranSantriTemplate santri={santri} settings={settings} options={options} />, orientation: 'portrait' }));
                break;
            case ReportType.DaftarWaliKelas:
                previews.push({ content: <DaftarWaliKelasTemplate settings={settings} />, orientation: 'portrait' });
                break;
            case ReportType.LaporanKontak:
                chunkArray(data, 25).forEach(pageData => previews.push({ content: <LaporanKontakTemplate santriList={pageData} settings={settings} />, orientation: 'portrait' }));
                break;
            case ReportType.LaporanAsrama:
                previews.push({ content: <LaporanAsramaTemplate settings={settings} santriList={data} gedungList={options.filteredGedung} />, orientation: 'portrait' });
                break;
            case ReportType.LaporanMutasi:
                const events: { santri: Santri; mutasi: RiwayatStatus }[] = [];
                const start = new Date(options.mutasiStartDate);
                const end = new Date(options.mutasiEndDate + 'T23:59:59');
                data.forEach(s => {
                    if (s.riwayatStatus) {
                        s.riwayatStatus.forEach(r => {
                            const rDate = new Date(r.tanggal);
                            if (rDate >= start && rDate <= end) events.push({ santri: s, mutasi: r });
                        });
                    }
                });
                events.sort((a,b) => new Date(a.mutasi.tanggal).getTime() - new Date(b.mutasi.tanggal).getTime());
                previews.push({ content: <LaporanMutasiTemplate mutasiEvents={events} settings={settings} startDate={options.mutasiStartDate} endDate={options.mutasiEndDate} />, orientation: 'landscape' });
                break;
            case ReportType.LembarPembinaan:
                data.forEach(santri => previews.push({ content: <LembarPembinaanTemplate santri={santri} settings={settings} />, orientation: 'portrait' }));
                break;
            case ReportType.FormulirIzin:
                data.forEach(santri => previews.push({ content: <FormulirIzinTemplate santri={santri} settings={settings} options={options} />, orientation: 'portrait' }));
                break;
            case ReportType.LaporanEMIS:
                // No visual preview for EMIS export, just a placeholder. The download button will handle it.
                previews.push({
                    content: (
                        <div className="flex flex-col items-center justify-center h-full text-center p-8">
                            <div className="text-green-600 text-6xl mb-4"><i className="bi bi-file-earmark-spreadsheet-fill"></i></div>
                            <h3 className="text-xl font-bold text-gray-800">Siap Diekspor</h3>
                            <p className="text-gray-600 mt-2">Data telah disiapkan dalam format Excel yang kompatibel dengan EMIS.</p>
                            <p className="text-sm text-gray-500 mt-4">Silakan klik tombol <strong>Unduh &gt; Excel (.xlsx)</strong> di pojok kanan atas.</p>
                        </div>
                    ),
                    orientation: 'landscape'
                });
                break;
            default:
                break;
        }

        return previews;
    };

    return { generateReport, paperDimensions, marginValues, resetGuidanceFlag };
};
