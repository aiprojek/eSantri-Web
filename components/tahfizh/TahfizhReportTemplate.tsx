
import React from 'react';
import { Santri, TahfizhRecord, PondokSettings } from '../../types';
import { PrintHeader } from '../common/PrintHeader';
import { ReportFooter, formatDate } from '../reports/modules/Common';

interface TahfizhReportTemplateProps {
    santri: Santri;
    records: TahfizhRecord[];
    settings: PondokSettings;
    startDate: string;
    endDate: string;
}

export const TahfizhReportTemplate: React.FC<TahfizhReportTemplateProps> = ({ santri, records, settings, startDate, endDate }) => {
    // Filter records based on date range
    const filteredRecords = records.filter(r => {
        const d = new Date(r.tanggal);
        return d >= new Date(startDate) && d <= new Date(endDate);
    }).sort((a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime());

    // Statistics
    const totalZiyadah = filteredRecords.filter(r => r.tipe === 'Ziyadah').length;
    const totalMurojaah = filteredRecords.filter(r => r.tipe === 'Murojaah').length;
    
    // Get Last Ziyadah for "Capaian Terakhir"
    const lastZiyadah = [...records] // Use all records for absolute progress, not just filtered
        .filter(r => r.tipe === 'Ziyadah')
        .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime())[0];

    const rombel = settings.rombel.find(r => r.id === santri.rombelId);
    const kelas = settings.kelas.find(k => k.id === santri.kelasId);
    const jenjang = settings.jenjang.find(j => j.id === santri.jenjangId);
    const musyrif = settings.tenagaPengajar.find(t => t.id === rombel?.waliKelasId); // Assuming Wali Kelas or specialized Musyrif

    return (
        <div className="font-sans text-black p-8 bg-white flex flex-col h-full justify-between printable-content-wrapper" style={{ width: '21cm', minHeight: '29.7cm' }}>
            <div>
                <PrintHeader settings={settings} title="LAPORAN PERKEMBANGAN TAHFIZHUL QUR'AN" />
                
                {/* Identitas Santri */}
                <table className="w-full text-sm mb-6 mt-4">
                    <tbody>
                        <tr>
                            <td className="w-32 font-bold">Nama Santri</td>
                            <td className="w-4">:</td>
                            <td>{santri.namaLengkap}</td>
                            <td className="w-24 font-bold">Periode</td>
                            <td className="w-4">:</td>
                            <td className="text-right">{formatDate(startDate)} s.d. {formatDate(endDate)}</td>
                        </tr>
                        <tr>
                            <td className="font-bold">NIS</td>
                            <td>:</td>
                            <td>{santri.nis}</td>
                            <td className="font-bold">Kelas</td>
                            <td>:</td>
                            <td className="text-right">{jenjang?.nama} - {kelas?.nama}</td>
                        </tr>
                        <tr>
                            <td className="font-bold">Rombel</td>
                            <td>:</td>
                            <td>{rombel?.nama || '-'}</td>
                            <td className="font-bold">Halaqah</td>
                            <td>:</td>
                            <td className="text-right">{musyrif?.nama || '-'}</td>
                        </tr>
                    </tbody>
                </table>

                {/* Ringkasan Capaian */}
                <div className="mb-6 p-4 border border-black rounded-lg bg-gray-50/50">
                    <h4 className="font-bold text-sm border-b border-black pb-2 mb-2 uppercase">Ringkasan Capaian</h4>
                    <div className="grid grid-cols-3 gap-4 text-center text-sm">
                        <div>
                            <p className="text-gray-600 text-xs">Total Setoran Ziyadah</p>
                            <p className="font-bold text-lg">{totalZiyadah} <span className="text-xs font-normal">kali</span></p>
                        </div>
                        <div>
                            <p className="text-gray-600 text-xs">Total Setoran Murojaah</p>
                            <p className="font-bold text-lg">{totalMurojaah} <span className="text-xs font-normal">kali</span></p>
                        </div>
                        <div>
                            <p className="text-gray-600 text-xs">Posisi Hafalan Terakhir</p>
                            <p className="font-bold text-sm truncate">
                                {lastZiyadah ? `Juz ${lastZiyadah.juz}, ${lastZiyadah.surah} : ${lastZiyadah.ayatAkhir}` : '-'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Tabel Mutaba'ah */}
                <h4 className="font-bold text-sm mb-2 uppercase">Rincian Setoran</h4>
                <table className="w-full border-collapse border border-black text-xs">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="border border-black p-2 w-8 text-center">No</th>
                            <th className="border border-black p-2 w-24 text-center">Tanggal</th>
                            <th className="border border-black p-2 w-20 text-center">Jenis</th>
                            <th className="border border-black p-2 text-left">Hafalan (Juz/Surah/Ayat)</th>
                            <th className="border border-black p-2 w-20 text-center">Predikat</th>
                            <th className="border border-black p-2 text-left">Catatan</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredRecords.length > 0 ? filteredRecords.map((rec, idx) => (
                            <tr key={rec.id}>
                                <td className="border border-black p-2 text-center">{idx + 1}</td>
                                <td className="border border-black p-2 text-center">{formatDate(rec.tanggal)}</td>
                                <td className="border border-black p-2 text-center">
                                    <span className={`px-1 rounded ${rec.tipe === 'Ziyadah' ? 'bg-green-100' : 'bg-blue-100'}`}>
                                        {rec.tipe}
                                    </span>
                                </td>
                                <td className="border border-black p-2">
                                    <span className="font-semibold">Juz {rec.juz}</span>, {rec.surah} : {rec.ayatAwal}-{rec.ayatAkhir}
                                </td>
                                <td className="border border-black p-2 text-center">{rec.predikat}</td>
                                <td className="border border-black p-2 italic text-gray-600">{rec.catatan || '-'}</td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={6} className="border border-black p-8 text-center italic text-gray-500">
                                    Tidak ada data setoran pada periode ini.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
                
                {/* Tanda Tangan */}
                <div className="flex justify-between items-end mt-12 px-4 text-xs" style={{ breakInside: 'avoid' }}>
                    <div className="text-center w-48">
                        <p>Mengetahui,</p>
                        <p>Orang Tua / Wali Santri</p>
                        <div className="h-20"></div>
                        <p className="border-b border-black pb-1">........................................</p>
                    </div>
                    <div className="text-center w-48">
                        <p>{settings.alamat.split(',')[1]?.trim() || 'Tempat'}, {formatDate(new Date().toISOString())}</p>
                        <p>Pembimbing Tahfizh</p>
                        <div className="h-20"></div>
                        <p className="font-bold underline">{musyrif?.nama || '........................................'}</p>
                    </div>
                </div>
            </div>
            
            <ReportFooter />
        </div>
    );
};
