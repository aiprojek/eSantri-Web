import React from 'react';
import { PondokSettings, Santri, TahfizhRecord } from '../../types';
import { PrintHeader } from '../common/PrintHeader';
import { ReportFooter, formatDate } from '../reports/modules/Common';

interface TahfizhExamReportTemplateProps {
    records: TahfizhRecord[];
    santriList: Santri[];
    settings: PondokSettings;
    startDate: string;
    endDate: string;
    filterLabel: string;
}

const chunkArray = <T,>(items: T[], size: number): T[][] => {
    const result: T[][] = [];
    for (let index = 0; index < items.length; index += size) {
        result.push(items.slice(index, index + size));
    }
    return result;
};

export const TahfizhExamReportTemplate: React.FC<TahfizhExamReportTemplateProps> = ({
    records,
    santriList,
    settings,
    startDate,
    endDate,
    filterLabel
}) => {
    const sortedRecords = [...records].sort((a, b) => {
        const santriA = santriList.find(santri => santri.id === a.santriId)?.namaLengkap || '';
        const santriB = santriList.find(santri => santri.id === b.santriId)?.namaLengkap || '';
        return santriA.localeCompare(santriB) || new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime();
    });
    const pages = chunkArray(sortedRecords, 22);

    return (
        <>
            {(pages.length > 0 ? pages : [[]]).map((pageRecords, pageIndex) => (
                <div
                    key={`tahfizh-exam-page-${pageIndex}`}
                    className={`printable-content-wrapper print-portrait flex min-h-[29.7cm] w-[21cm] flex-col bg-white p-8 text-black ${pageIndex < pages.length - 1 ? 'page-break-after' : ''}`}
                >
                    <PrintHeader settings={settings} title="REKAP UJIAN HAFALAN AL-QUR'AN" compact />

                    <div className="print-meta mb-4 grid grid-cols-2 gap-x-6 gap-y-1 border border-gray-400 bg-gray-50 p-3 text-xs">
                        <div><span className="font-bold">Periode:</span> {formatDate(startDate)} s.d. {formatDate(endDate)}</div>
                        <div className="text-right"><span className="font-bold">Filter:</span> {filterLabel}</div>
                        <div><span className="font-bold">Jumlah Peserta:</span> {new Set(records.map(record => record.santriId)).size} santri</div>
                        <div className="text-right"><span className="font-bold">Jumlah Ujian:</span> {records.length} catatan</div>
                    </div>

                    <table className="w-full border-collapse border border-black text-[9px]">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="w-8 border border-black p-1.5 text-center">No</th>
                                <th className="border border-black p-1.5 text-left">Nama Santri</th>
                                <th className="w-20 border border-black p-1.5 text-center">Sesi</th>
                                <th className="w-20 border border-black p-1.5 text-center">Tanggal</th>
                                <th className="border border-black p-1.5 text-left">Materi Ujian</th>
                                <th className="w-20 border border-black p-1.5 text-center">Hasil</th>
                                <th className="border border-black p-1.5 text-left">Catatan</th>
                                <th className="w-24 border border-black p-1.5 text-left">Penguji</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pageRecords.length > 0 ? pageRecords.map((record, rowIndex) => {
                                const santri = santriList.find(item => item.id === record.santriId);
                                const penguji = settings.tenagaPengajar.find(item => item.id === record.muhaffizhId);
                                return (
                                    <tr key={record.id}>
                                        <td className="border border-black p-1.5 text-center">{pageIndex * 22 + rowIndex + 1}</td>
                                        <td className="border border-black p-1.5">
                                            <span className="font-semibold">{santri?.namaLengkap || '-'}</span>
                                            <span className="block text-[8px] text-gray-500">{santri?.nis || '-'}</span>
                                        </td>
                                        <td className="border border-black p-1.5 text-center">{record.sesiUjian || '-'}</td>
                                        <td className="border border-black p-1.5 text-center">{formatDate(record.tanggal)}</td>
                                        <td className="border border-black p-1.5">Juz {record.juz}, {record.surah}: {record.ayatAwal}-{record.ayatAkhir}</td>
                                        <td className="border border-black p-1.5 text-center font-semibold">{record.predikat}</td>
                                        <td className="border border-black p-1.5">{record.catatan || '-'}</td>
                                        <td className="border border-black p-1.5">{penguji?.nama || '-'}</td>
                                    </tr>
                                );
                            }) : (
                                <tr>
                                    <td colSpan={8} className="border border-black p-8 text-center italic text-gray-500">
                                        Tidak ada data ujian hafalan pada periode dan filter ini.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                    <div className="mt-8 grid grid-cols-2 gap-16 px-10 text-center text-xs" style={{ breakInside: 'avoid' }}>
                        <div>
                            <p>Mengetahui,</p>
                            <p>Koordinator Tahfizh</p>
                            <div className="h-16"></div>
                            <p className="border-b border-black">........................................</p>
                        </div>
                        <div>
                            <p>{settings.alamat.split(',')[1]?.trim() || 'Tempat'}, {formatDate(new Date().toISOString())}</p>
                            <p>Penguji / Pembimbing</p>
                            <div className="h-16"></div>
                            <p className="border-b border-black">........................................</p>
                        </div>
                    </div>

                    <ReportFooter />
                </div>
            ))}
        </>
    );
};
