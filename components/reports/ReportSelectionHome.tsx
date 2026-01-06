
import React, { useMemo } from 'react';
import { ReportType } from '../../types';

interface ReportSelectionHomeProps {
    onSelectReport: (id: ReportType) => void;
}

interface ReportItem {
    id: ReportType;
    title: string;
    description: string;
    icon: string;
    color: string;
}

export const ReportSelectionHome: React.FC<ReportSelectionHomeProps> = ({ onSelectReport }) => {
    
    // Define categories and reports
    const categories = useMemo(() => [
        {
            title: "Laporan Utama & Dashboard",
            color: "text-indigo-600",
            bg: "bg-indigo-50",
            border: "border-indigo-100",
            items: [
                { id: ReportType.DashboardSummary, title: 'Ringkasan Dashboard', description: "Statistik utama santri & pondok.", icon: 'bi-pie-chart-fill', color: 'text-indigo-500' },
                { id: ReportType.FinanceSummary, title: 'Ringkasan Keuangan', description: "Rekap tunggakan & pemasukan.", icon: 'bi-graph-up', color: 'text-green-500' },
                { id: ReportType.LaporanMutasi, title: 'Laporan Mutasi', description: "Santri masuk, keluar, & lulus.", icon: 'bi-arrow-left-right', color: 'text-orange-500' },
            ]
        },
        {
            title: "Akademik & Kesiswaan",
            color: "text-teal-600",
            bg: "bg-teal-50",
            border: "border-teal-100",
            items: [
                { id: ReportType.Biodata, title: 'Biodata Santri', description: "Data lengkap profil santri.", icon: 'bi-person-badge', color: 'text-teal-600' },
                { id: ReportType.DaftarRombel, title: 'Absensi / Daftar Hadir', description: "List santri per rombel.", icon: 'bi-people', color: 'text-teal-600' },
                { id: ReportType.LembarAbsensi, title: 'Lembar Absensi Bulanan', description: "Grid absensi tanggal 1-31.", icon: 'bi-calendar-check', color: 'text-teal-600' },
                { id: ReportType.LembarNilai, title: 'Lembar Nilai', description: "Format kosong pengisian nilai.", icon: 'bi-card-checklist', color: 'text-teal-600' },
                { id: ReportType.LembarRapor, title: 'Serah Terima Rapor', description: "Tanda terima pengambilan rapor.", icon: 'bi-file-earmark-check', color: 'text-teal-600' },
                { id: ReportType.LembarPembinaan, title: 'Lembar Pembinaan', description: "Catatan prestasi & pelanggaran.", icon: 'bi-file-person', color: 'text-red-500' },
            ]
        },
        {
            title: "Keuangan & Administrasi",
            color: "text-blue-600",
            bg: "bg-blue-50",
            border: "border-blue-100",
            items: [
                { id: ReportType.RekeningKoranSantri, title: 'Rekening Koran', description: "Rincian tabungan & tagihan.", icon: 'bi-file-earmark-spreadsheet', color: 'text-blue-600' },
                { id: ReportType.LaporanArusKas, title: 'Arus Kas Umum', description: "Buku kas pemasukan/pengeluaran.", icon: 'bi-journal-arrow-up', color: 'text-blue-600' },
                { id: ReportType.KartuSantri, title: 'Kartu Tanda Santri', description: "Cetak ID Card masal.", icon: 'bi-person-vcard', color: 'text-purple-600' },
                { id: ReportType.LabelSantri, title: 'Label Undangan/Buku', description: "Stiker label nama santri.", icon: 'bi-tags-fill', color: 'text-pink-500' },
            ]
        },
        {
            title: "Penunjang & Lainnya",
            color: "text-gray-600",
            bg: "bg-gray-50",
            border: "border-gray-200",
            items: [
                { id: ReportType.LaporanAsrama, title: 'Data Keasramaan', description: "Penghuni kamar & gedung.", icon: 'bi-building', color: 'text-gray-600' },
                { id: ReportType.FormulirIzin, title: 'Surat Izin Pulang', description: "Formulir perizinan resmi.", icon: 'bi-box-arrow-right', color: 'text-gray-600' },
                { id: ReportType.DaftarWaliKelas, title: 'Daftar Wali Kelas', description: "Rekap pengajar wali kelas.", icon: 'bi-person-lines-fill', color: 'text-gray-600' },
                { id: ReportType.LaporanKontak, title: 'Ekspor Kontak HP', description: "CSV kontak wali untuk HP.", icon: 'bi-phone', color: 'text-green-600' },
                { id: ReportType.LembarKedatangan, title: 'Ceklis Kedatangan', description: "Absensi kedatangan liburan.", icon: 'bi-calendar2-check', color: 'text-gray-600' },
            ]
        }
    ], []);

    return (
        <div className="space-y-8 animate-fade-in">
            {categories.map((cat, idx) => (
                <div key={idx}>
                    <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${cat.color}`}>
                        <span className={`w-2 h-6 rounded-full ${cat.bg.replace('bg-', 'bg-').replace('50', '500')}`}></span>
                        {cat.title}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {cat.items.map((report) => (
                            <button
                                key={report.id}
                                onClick={() => onSelectReport(report.id as ReportType)}
                                className={`flex flex-col text-left p-4 bg-white border ${cat.border} rounded-xl shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200 group`}
                            >
                                <div className="flex items-center justify-between w-full mb-3">
                                    <div className={`w-10 h-10 rounded-lg ${cat.bg} flex items-center justify-center ${report.color} text-xl group-hover:scale-110 transition-transform`}>
                                        <i className={`bi ${report.icon}`}></i>
                                    </div>
                                    <i className="bi bi-chevron-right text-gray-300 group-hover:text-gray-500"></i>
                                </div>
                                <h4 className="font-bold text-gray-800 text-sm group-hover:text-teal-700">{report.title}</h4>
                                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{report.description}</p>
                            </button>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};
