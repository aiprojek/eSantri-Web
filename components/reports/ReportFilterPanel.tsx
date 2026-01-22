
import React from 'react';
import { PondokSettings, ReportType, Santri, Jenjang, Kelas, Rombel } from '../../types';
import { ReportOptions } from './ReportOptions';

interface ReportFilterPanelProps {
    activeReport: ReportType;
    settings: PondokSettings;
    filters: {
        jenjangId: string;
        kelasId: string;
        rombelId: string;
        status: string;
        gender: string;
        gedungId: string;
        provinsi: string;
        kabupaten: string;
        kecamatan: string;
        sortBy: string;
        sortOrder: string;
    };
    onFilterChange: (key: string, value: string) => void;
    reportConfig: any; // Hook result
    filteredSantri: Santri[];
    availableKelas: Kelas[];
    availableRombel: Rombel[];
    onGenerate: () => void;
    isGenerating: boolean;
    canGenerate: boolean;
}

export const ReportFilterPanel: React.FC<ReportFilterPanelProps> = ({
    activeReport, settings, filters, onFilterChange, reportConfig, filteredSantri, availableKelas, availableRombel, onGenerate, isGenerating, canGenerate
}) => {
    
    const isSummaryReport = activeReport === ReportType.DashboardSummary || activeReport === ReportType.FinanceSummary || activeReport === ReportType.DaftarWaliKelas;
    const isFinancialReport = activeReport === ReportType.LaporanArusKas || activeReport === ReportType.RekeningKoranSantri;
    const isAsramaReport = activeReport === ReportType.LaporanAsrama;
    const isEmisReport = activeReport === ReportType.LaporanEMIS;

    return (
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex-1 min-h-0 flex flex-col">
            <div className="flex-grow overflow-y-auto space-y-6 custom-scrollbar pr-2">
                
                {/* --- KHUSUS EMIS --- */}
                {isEmisReport && (
                    <div className="bg-green-50 p-3 rounded-lg border border-green-200 text-sm text-green-900">
                        <h4 className="font-bold flex items-center gap-2 mb-2"><i className="bi bi-cloud-upload-fill"></i> Ekspor Format EMIS</h4>
                        <p className="mb-2 text-xs">
                            Fitur ini akan menghasilkan file Excel berisi data pokok seluruh santri yang sesuai filter. 
                            Kolom data disesuaikan untuk memudahkan Copy-Paste ke template upload EMIS Kemenag.
                        </p>
                        <p className="text-xs italic">
                            *Pastikan data NIK, Nama Ibu Kandung, dan Tempat/Tgl Lahir sudah lengkap di database santri.
                        </p>
                    </div>
                )}

                {/* --- SEKSI 1: FILTER DATA UTAMA --- */}
                {!isSummaryReport && !isFinancialReport && (
                    <div className="space-y-4">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider border-b pb-2">Filter Data Santri</h4>
                        
                        {isAsramaReport ? (
                            <div>
                                <label className="block mb-1 text-xs font-medium text-gray-700">Gedung Asrama</label>
                                <select value={filters.gedungId} onChange={e => onFilterChange('gedungId', e.target.value)} className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg p-2.5">
                                    <option value="">Semua Gedung</option>
                                    {settings.gedungAsrama.map(g => <option key={g.id} value={g.id}>{g.nama}</option>)}
                                </select>
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-1 gap-3">
                                    <div>
                                        <label className="block mb-1 text-xs font-medium text-gray-700">Jenjang</label>
                                        <select value={filters.jenjangId} onChange={e => onFilterChange('jenjangId', e.target.value)} className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg p-2.5">
                                            <option value="">Semua Jenjang</option>
                                            {settings.jenjang.map(j => <option key={j.id} value={j.id}>{j.nama}</option>)}
                                        </select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block mb-1 text-xs font-medium text-gray-700">Kelas</label>
                                            <select value={filters.kelasId} onChange={e => onFilterChange('kelasId', e.target.value)} disabled={!filters.jenjangId} className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg p-2.5 disabled:bg-gray-200">
                                                <option value="">Semua Kelas</option>
                                                {availableKelas.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block mb-1 text-xs font-medium text-gray-700">Rombel</label>
                                            <select value={filters.rombelId} onChange={e => onFilterChange('rombelId', e.target.value)} disabled={!filters.kelasId} className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg p-2.5 disabled:bg-gray-200">
                                                <option value="">Semua Rombel</option>
                                                {availableRombel.map(r => <option key={r.id} value={r.id}>{r.nama}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block mb-1 text-xs font-medium text-gray-700">Status</label>
                                            <select value={filters.status} onChange={e => onFilterChange('status', e.target.value)} className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg p-2.5">
                                                <option value="">Semua</option><option value="Aktif">Aktif</option><option value="Hiatus">Hiatus</option><option value="Lulus">Lulus</option><option value="Keluar/Pindah">Keluar</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block mb-1 text-xs font-medium text-gray-700">Gender</label>
                                            <select value={filters.gender} onChange={e => onFilterChange('gender', e.target.value)} className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg p-2.5">
                                                <option value="">Semua</option><option value="Laki-laki">Laki-laki</option><option value="Perempuan">Perempuan</option>
                                            </select>
                                        </div>
                                    </div>
                                    {/* Sorting */}
                                    <div className="pt-2 border-t mt-2">
                                        <label className="block mb-1 text-xs font-medium text-gray-700">Urutkan Data</label>
                                        <div className="flex gap-2">
                                            <select value={filters.sortBy} onChange={e => onFilterChange('sortBy', e.target.value)} className="w-2/3 bg-white border border-gray-300 text-xs rounded-lg p-2">
                                                <option value="namaLengkap">Nama Lengkap</option>
                                                <option value="nis">NIS</option>
                                            </select>
                                            <select value={filters.sortOrder} onChange={e => onFilterChange('sortOrder', e.target.value)} className="w-1/3 bg-white border border-gray-300 text-xs rounded-lg p-2">
                                                <option value="asc">A-Z</option>
                                                <option value="desc">Z-A</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* --- SEKSI 2: FILTER TANGGAL (MUTASI) --- */}
                {activeReport === ReportType.LaporanMutasi && (
                    <div className="space-y-3">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider border-b pb-2">Periode Mutasi</h4>
                        <div className="grid grid-cols-2 gap-3">
                            <div><label className="block mb-1 text-xs">Dari</label><input type="date" value={reportConfig.options.mutasiStartDate} onChange={e => reportConfig.options.setMutasiStartDate(e.target.value)} className="w-full border rounded p-2 text-sm"/></div>
                            <div><label className="block mb-1 text-xs">Sampai</label><input type="date" value={reportConfig.options.mutasiEndDate} onChange={e => reportConfig.options.setMutasiEndDate(e.target.value)} className="w-full border rounded p-2 text-sm"/></div>
                        </div>
                    </div>
                )}

                {/* --- SEKSI 3: KONFIGURASI LAPORAN SPESIFIK --- */}
                {!isEmisReport && (
                <div className="space-y-3">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider border-b pb-2">Opsi Laporan</h4>
                    
                    {/* Paper Settings */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                        <div>
                            <label className="block mb-1 text-xs font-medium text-gray-700">Kertas</label>
                            <select value={reportConfig.paperSize} onChange={e => reportConfig.setPaperSize(e.target.value)} className="w-full border border-gray-300 rounded p-2 text-xs bg-gray-50">
                                <option value="A4">A4</option><option value="F4">F4</option><option value="Legal">Legal</option><option value="Letter">Letter</option>
                            </select>
                        </div>
                        <div>
                            <label className="block mb-1 text-xs font-medium text-gray-700">Margin</label>
                            <select value={reportConfig.margin} onChange={e => reportConfig.setMargin(e.target.value)} className="w-full border border-gray-300 rounded p-2 text-xs bg-gray-50">
                                <option value="narrow">Tipis</option><option value="normal">Normal</option><option value="wide">Lebar</option>
                            </select>
                        </div>
                    </div>

                    <ReportOptions config={reportConfig} filteredSantri={filteredSantri} settings={settings} selectedJenjangId={filters.jenjangId} />
                </div>
                )}

            </div>

            {/* --- FOOTER: ACTION BUTTON --- */}
            <div className="pt-4 mt-auto border-t shrink-0">
                <button 
                    onClick={onGenerate} 
                    disabled={!canGenerate || isGenerating} 
                    className={`w-full text-white py-3 rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-all hover:-translate-y-0.5 ${isEmisReport ? 'bg-green-600 hover:bg-green-700' : 'bg-teal-600 hover:bg-teal-700'}`}
                >
                    {isGenerating ? (
                        <>
                            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            <span>Memproses...</span>
                        </>
                    ) : (
                        <>
                            <i className={`bi ${isEmisReport ? 'bi-file-earmark-spreadsheet-fill' : 'bi-eye-fill'}`}></i> {isEmisReport ? 'Siapkan Data Ekspor' : 'Tampilkan Preview'}
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};
