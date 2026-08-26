import React from 'react';
import { PondokSettings, Santri, TahfizhRecord } from '../../types';
import { PrintHeader } from '../common/PrintHeader';
import { ReportFooter, formatDate } from '../reports/modules/Common';
import { formatTanggalDokumen, DateFormatMode } from '../../utils/formatters';

export interface RombelSummaryData {
    rombelId: number;
    rombelName: string;
    kelasName: string;
    jenjangName: string;
    totalSantri: number;
    totalSetoran: number;
    ziyadah: number;
    murojaah: number;
    tasmi: number;
    ujian: number;
    totalTeguran: number;
    totalKesalahan: number;
    tajwid: number;
    makhraj: number;
    kelancaran: number;
    terlewat: number;
    lancarCount: number;
    kurangLancarCount: number;
    mutqinSantriCount: number;
}

interface TahfizhRombelRekapTemplateProps {
    data: RombelSummaryData[];
    settings: PondokSettings;
    startDate: string;
    endDate: string;
    filterLabel: string;
    tanggalRapor?: string;
    tempatRapor?: string;
    dateFormatMode?: DateFormatMode;
    manualHijri?: string;
}

export const TahfizhRombelRekapTemplate: React.FC<TahfizhRombelRekapTemplateProps> = ({
    data,
    settings,
    startDate,
    endDate,
    filterLabel,
    tanggalRapor,
    tempatRapor,
    dateFormatMode = 'masehi',
    manualHijri
}) => {
    const totalSemuaSantri = data.reduce((acc, r) => acc + r.totalSantri, 0);
    const totalSemuaSetoran = data.reduce((acc, r) => acc + r.totalSetoran, 0);
    const totalSemuaZiyadah = data.reduce((acc, r) => acc + r.ziyadah, 0);
    const totalSemuaMurojaah = data.reduce((acc, r) => acc + r.murojaah, 0);
    const totalSemuaTasmi = data.reduce((acc, r) => acc + r.tasmi, 0);
    const totalSemuaUjian = data.reduce((acc, r) => acc + r.ujian, 0);
    const totalSemuaTeguran = data.reduce((acc, r) => acc + r.totalTeguran, 0);
    const totalSemuaKesalahan = data.reduce((acc, r) => acc + r.totalKesalahan, 0);

    const activeTanggal = tanggalRapor || new Date().toISOString().split('T')[0];
    const activeTempat = tempatRapor || settings.tempatRaporDefault || settings.alamat?.split(',')[1]?.trim() || settings.alamat?.split(',')[0]?.trim() || 'Pondok';
    const formattedTanggal = formatTanggalDokumen(activeTanggal, {
        formatMode: dateFormatMode,
        hijriAdjustment: settings.hijriAdjustment || 0,
        manualHijri: manualHijri || settings.manualHijriRaporDefault
    });

    const mudirName = settings.tenagaPengajar?.find(t => t.id === settings.mudirAamId)?.nama
        || settings.tenagaPengajar?.find(t => t.riwayatJabatan?.some(r => r.jabatan.toLowerCase().includes('mudir') || r.jabatan.toLowerCase().includes('kepala') || r.jabatan.toLowerCase().includes('pimpinan')))?.nama
        || 'Mudir Pondok Pesantren';

    const koordinatorTahfizh = settings.tenagaPengajar?.find(t => t.riwayatJabatan?.some(r => r.jabatan.toLowerCase().includes('tahfizh') || r.jabatan.toLowerCase().includes('quran')))?.nama
        || settings.tenagaPengajar?.[0]?.nama
        || 'Koordinator Tahfizh';

    return (
        <div className="printable-content-wrapper print-portrait flex min-h-[29.7cm] w-[21cm] flex-col bg-white p-8 text-black">
            <PrintHeader settings={settings} title="REKAPITULASI CAPAIAN & EVALUASI TAHFIZH PER ROMBEL / KELAS" compact />

            <div className="print-meta mb-4 grid grid-cols-2 gap-x-6 gap-y-1 border border-gray-400 bg-gray-50 p-3 text-xs">
                <div><span className="font-bold">Periode:</span> {formatDate(startDate)} s.d. {formatDate(endDate)}</div>
                <div className="text-right"><span className="font-bold">Filter:</span> {filterLabel}</div>
                <div><span className="font-bold">Total Rombel:</span> {data.length} kelas/rombel</div>
                <div className="text-right"><span className="font-bold">Total Santri Terdata:</span> {totalSemuaSantri} santri ({totalSemuaSetoran} sesi setoran)</div>
            </div>

            {/* Tabel Ringkasan per Rombel */}
            <table className="w-full border-collapse border border-black text-[9px] mb-4">
                <thead className="bg-gray-100 font-bold">
                    <tr>
                        <th rowSpan={2} className="border border-black p-1.5 w-7 text-center">No</th>
                        <th rowSpan={2} className="border border-black p-1.5 text-left min-w-[120px]">Rombel / Kelas</th>
                        <th rowSpan={2} className="border border-black p-1.5 w-12 text-center">Jml Santri</th>
                        <th colSpan={4} className="border border-black p-1 text-center bg-gray-200">Aktivitas Setoran (Sesi)</th>
                        <th colSpan={2} className="border border-black p-1 text-center bg-amber-100">Evaluasi Mutu</th>
                        <th colSpan={4} className="border border-black p-1 text-center bg-rose-50">Klasifikasi Kendala</th>
                        <th rowSpan={2} className="border border-black p-1.5 w-14 text-center">Kelancaran</th>
                    </tr>
                    <tr>
                        <th className="border border-black p-1 w-10 text-center">Ziyadah</th>
                        <th className="border border-black p-1 w-10 text-center">Murojaah</th>
                        <th className="border border-black p-1 w-9 text-center">Tasmi'</th>
                        <th className="border border-black p-1 w-9 text-center">Ujian</th>
                        <th className="border border-black p-1 w-10 text-center text-amber-900">Teguran</th>
                        <th className="border border-black p-1 w-10 text-center text-rose-900">Kesalahan</th>
                        <th className="border border-black p-1 w-8 text-center text-[8px]">Tajwid</th>
                        <th className="border border-black p-1 w-8 text-center text-[8px]">Makhraj</th>
                        <th className="border border-black p-1 w-8 text-center text-[8px]">Kelancaran</th>
                        <th className="border border-black p-1 w-8 text-center text-[8px]">Terlewat</th>
                    </tr>
                </thead>
                <tbody>
                    {data.length > 0 ? (
                        data.map((row, idx) => {
                            const totalEvaluasi = row.lancarCount + row.kurangLancarCount;
                            const pctLancar = totalEvaluasi > 0 ? Math.round((row.lancarCount / totalEvaluasi) * 100) : 100;
                            return (
                                <tr key={row.rombelId || idx} className="hover:bg-gray-50">
                                    <td className="border border-black p-1.5 text-center font-medium">{idx + 1}</td>
                                    <td className="border border-black p-1.5 font-bold">
                                        {row.rombelName}
                                        {row.jenjangName && <span className="block text-[8px] text-gray-500 font-normal">{row.jenjangName}</span>}
                                    </td>
                                    <td className="border border-black p-1.5 text-center font-semibold">{row.totalSantri}</td>
                                    <td className="border border-black p-1.5 text-center font-semibold text-emerald-800">{row.ziyadah}</td>
                                    <td className="border border-black p-1.5 text-center font-semibold text-blue-800">{row.murojaah}</td>
                                    <td className="border border-black p-1.5 text-center">{row.tasmi}</td>
                                    <td className="border border-black p-1.5 text-center font-semibold text-purple-800">{row.ujian}</td>
                                    <td className="border border-black p-1.5 text-center font-bold text-amber-900 bg-amber-50/50">{row.totalTeguran}</td>
                                    <td className="border border-black p-1.5 text-center font-bold text-rose-900 bg-rose-50/50">{row.totalKesalahan}</td>
                                    <td className="border border-black p-1 text-center text-[8px]">{row.tajwid || '-'}</td>
                                    <td className="border border-black p-1 text-center text-[8px]">{row.makhraj || '-'}</td>
                                    <td className="border border-black p-1 text-center text-[8px]">{row.kelancaran || '-'}</td>
                                    <td className="border border-black p-1 text-center text-[8px]">{row.terlewat || '-'}</td>
                                    <td className="border border-black p-1.5 text-center font-bold">
                                        <span className={`px-1 rounded text-[8.5px] ${pctLancar >= 85 ? 'text-emerald-800' : pctLancar >= 70 ? 'text-amber-800' : 'text-rose-800'}`}>
                                            {pctLancar}%
                                        </span>
                                    </td>
                                </tr>
                            );
                        })
                    ) : (
                        <tr>
                            <td colSpan={14} className="border border-black p-8 text-center italic text-gray-500">
                                Tidak ada data aktivitas tahfizh untuk rombel yang dipilih pada periode ini.
                            </td>
                        </tr>
                    )}
                </tbody>
                {data.length > 0 && (
                    <tfoot className="bg-gray-100 font-bold">
                        <tr>
                            <td colSpan={2} className="border border-black p-1.5 text-center uppercase">TOTAL KESELURUHAN</td>
                            <td className="border border-black p-1.5 text-center">{totalSemuaSantri}</td>
                            <td className="border border-black p-1.5 text-center text-emerald-900">{totalSemuaZiyadah}</td>
                            <td className="border border-black p-1.5 text-center text-blue-900">{totalSemuaMurojaah}</td>
                            <td className="border border-black p-1.5 text-center">{totalSemuaTasmi}</td>
                            <td className="border border-black p-1.5 text-center text-purple-900">{totalSemuaUjian}</td>
                            <td className="border border-black p-1.5 text-center text-amber-900">{totalSemuaTeguran}</td>
                            <td className="border border-black p-1.5 text-center text-rose-900">{totalSemuaKesalahan}</td>
                            <td colSpan={4} className="border border-black p-1 text-center text-[8px] text-gray-600">Akumulasi Kendala</td>
                            <td className="border border-black p-1.5 text-center">{totalSemuaSetoran} sesi</td>
                        </tr>
                    </tfoot>
                )}
            </table>

            {/* Catatan Analisis */}
            <div className="border border-black p-2 bg-gray-50 rounded text-[9.5px] mb-6 space-y-1">
                <span className="font-bold text-gray-800 uppercase block">Keterangan Metrik Evaluasi:</span>
                <p className="text-gray-700 leading-snug">
                    • <b>Teguran (Tawaqquf)</b>: Pengingat atau bantuan awal ayat/kalimat dari pembimbing saat santri terhenti.<br />
                    • <b>Kesalahan (Khatha')</b>: Kekeliruan pada kaidah tajwid, makharijul huruf, harakat, maupun ayat yang tertukar/terlewat.<br />
                    • <b>Kelancaran</b>: Rasio kelulusan setoran berkategori Lancar/Sangat Lancar terhadap total setoran santri di kelas tersebut.
                </p>
            </div>

            {/* Tanda Tangan */}
            <div className="mt-auto grid grid-cols-2 gap-16 px-10 text-center text-xs" style={{ breakInside: 'avoid' }}>
                <div>
                    <p>Mengetahui,</p>
                    <p className="font-bold">Mudir / Kepala Pondok</p>
                    <div className="h-16"></div>
                    <p className="font-bold border-b border-black inline-block min-w-[180px]">
                        {mudirName}
                    </p>
                </div>
                <div>
                    <p>{activeTempat}, {formattedTanggal}</p>
                    <p className="font-bold">Koordinator Tahfizh / Al-Qur'an</p>
                    <div className="h-16"></div>
                    <p className="font-bold border-b border-black inline-block min-w-[180px]">
                        {koordinatorTahfizh}
                    </p>
                </div>
            </div>

            <ReportFooter />
        </div>
    );
};
