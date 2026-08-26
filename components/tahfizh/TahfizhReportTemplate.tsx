
import React, { useMemo } from 'react';
import { Santri, TahfizhRecord, PondokSettings } from '../../types';
import { PrintHeader } from '../common/PrintHeader';
import { ReportFooter, formatDate } from '../reports/modules/Common';

interface TahfizhReportTemplateProps {
    santri: Santri;
    records: TahfizhRecord[];
    settings: PondokSettings;
    startDate: string;
    endDate: string;
    pageBreakAfter?: boolean;
}

export const TahfizhReportTemplateComponent: React.FC<TahfizhReportTemplateProps> = ({ santri, records, settings, startDate, endDate, pageBreakAfter = false }) => {
    // Filter records based on date range (memoized)
    const filteredRecords = useMemo(() => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        return records.filter(r => {
            const d = new Date(r.tanggal);
            return d >= start && d <= end;
        }).sort((a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime());
    }, [records, startDate, endDate]);

    // Statistics (memoized)
    const { totalZiyadah, totalMurojaah, totalTasmi, totalUjian, totalTeguran, totalKesalahan } = useMemo(() => {
        let ziyadah = 0;
        let murojaah = 0;
        let tasmi = 0;
        let ujian = 0;
        let teguran = 0;
        let kesalahan = 0;

        filteredRecords.forEach(r => {
            if (r.tipe === 'Ziyadah') ziyadah++;
            else if (r.tipe === 'Murojaah') murojaah++;
            else if (r.tipe === "Tasmi'") tasmi++;
            else if (r.tipe === 'Ujian Hafalan') ujian++;

            teguran += r.jumlahTeguran || 0;
            kesalahan += r.jumlahKesalahan || 0;
        });

        return {
            totalZiyadah: ziyadah,
            totalMurojaah: murojaah,
            totalTasmi: tasmi,
            totalUjian: ujian,
            totalTeguran: teguran,
            totalKesalahan: kesalahan
        };
    }, [filteredRecords]);
    
    // Get Last Ziyadah for "Capaian Terakhir" (memoized)
    const lastZiyadah = useMemo(() => {
        return records
            .filter(r => r.tipe === 'Ziyadah')
            .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime())[0];
    }, [records]);

    const rombel = useMemo(() => settings.rombel?.find(r => r.id === santri.rombelId), [settings.rombel, santri.rombelId]);
    const kelas = useMemo(() => settings.kelas?.find(k => k.id === santri.kelasId), [settings.kelas, santri.kelasId]);
    const jenjang = useMemo(() => settings.jenjang?.find(j => j.id === santri.jenjangId), [settings.jenjang, santri.jenjangId]);
    const halaqah = useMemo(() => settings.kelompokHalaqah?.find(h => h.id === santri.halaqahId || h.santriIds?.includes(santri.id)), [settings.kelompokHalaqah, santri.halaqahId, santri.id]);
    const teacherFromHalaqah = useMemo(() => halaqah?.muhaffizhId ? settings.tenagaPengajar?.find(t => t.id === halaqah.muhaffizhId) : null, [halaqah, settings.tenagaPengajar]);
    const musyrif = useMemo(() => teacherFromHalaqah || settings.tenagaPengajar?.find(t => t.id === rombel?.waliKelasId) || settings.tenagaPengajar?.[0], [teacherFromHalaqah, settings.tenagaPengajar, rombel]);
    const musyrifName = musyrif?.nama || '........................................';
    
    const orangTuaName = santri.namaWali?.trim() || santri.namaAyah?.trim() || santri.namaIbu?.trim() || '........................................';
    const orangTuaLabel = santri.namaWali?.trim() ? 'Wali Santri' : (santri.namaAyah?.trim() ? 'Ayah / Wali' : (santri.namaIbu?.trim() ? 'Ibu / Wali' : 'Orang Tua / Wali Santri'));

    return (
        <div className={`font-sans text-black p-8 bg-white flex flex-col h-full justify-between printable-content-wrapper print-portrait ${pageBreakAfter ? 'page-break-after' : ''}`} style={{ width: '21cm', minHeight: '29.7cm' }}>
            <div>
                <PrintHeader settings={settings} title="LAPORAN PERKEMBANGAN TAHFIZHUL QUR'AN" />
                
                {/* Identitas Santri */}
                <table className="w-full text-sm mb-5 mt-4">
                    <tbody>
                        <tr>
                            <td className="w-32 font-bold">Nama Santri</td>
                            <td className="w-4">:</td>
                            <td className="font-bold">{santri.namaLengkap}</td>
                            <td className="w-24 font-bold">Periode</td>
                            <td className="w-4">:</td>
                            <td className="text-right">{formatDate(startDate)} s.d. {formatDate(endDate)}</td>
                        </tr>
                        <tr>
                            <td className="font-bold">NIS</td>
                            <td>:</td>
                            <td>{santri.nis || '-'}</td>
                            <td className="font-bold">Kelas</td>
                            <td>:</td>
                            <td className="text-right">{jenjang?.nama || ''} {kelas?.nama ? `- ${kelas.nama}` : ''}</td>
                        </tr>
                        <tr>
                            <td className="font-bold">Rombel</td>
                            <td>:</td>
                            <td>{rombel?.nama || '-'}</td>
                            <td className="font-bold">Halaqah</td>
                            <td>:</td>
                            <td className="text-right">{halaqah?.nama || musyrif?.nama || '-'}</td>
                        </tr>
                    </tbody>
                </table>

                {/* Ringkasan Capaian */}
                <div className="mb-5 p-3.5 border border-black rounded-lg bg-gray-50/50">
                    <div className="flex justify-between items-center border-b border-black pb-1.5 mb-2">
                        <h4 className="font-bold text-xs uppercase">Ringkasan Mutaba'ah & Capaian</h4>
                        {(totalTeguran > 0 || totalKesalahan > 0) && (
                            <span className="text-[10px] font-semibold text-gray-700">
                                Evaluasi Periode: <b>{totalTeguran}x</b> Teguran • <b>{totalKesalahan}x</b> Kesalahan
                            </span>
                        )}
                    </div>
                    <div className="grid grid-cols-5 gap-2 text-center text-xs">
                        <div>
                            <p className="text-gray-600 text-[10px]">Ziyadah</p>
                            <p className="font-bold text-base">{totalZiyadah} <span className="text-[10px] font-normal">kali</span></p>
                        </div>
                        <div>
                            <p className="text-gray-600 text-[10px]">Murojaah</p>
                            <p className="font-bold text-base">{totalMurojaah} <span className="text-[10px] font-normal">kali</span></p>
                        </div>
                        <div>
                            <p className="text-gray-600 text-[10px]">Tasmi'</p>
                            <p className="font-bold text-base">{totalTasmi} <span className="text-[10px] font-normal">kali</span></p>
                        </div>
                        <div>
                            <p className="text-gray-600 text-[10px]">Ujian</p>
                            <p className="font-bold text-base">{totalUjian} <span className="text-[10px] font-normal">kali</span></p>
                        </div>
                        <div>
                            <p className="text-gray-600 text-[10px]">Hafalan Terakhir</p>
                            <p className="font-bold text-xs truncate" title={lastZiyadah ? `Juz ${lastZiyadah.juz}, ${lastZiyadah.surah} : ${lastZiyadah.ayatAkhir}` : '-'}>
                                {lastZiyadah ? `Juz ${lastZiyadah.juz}, ${lastZiyadah.surah}` : '-'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Tabel Mutaba'ah */}
                <h4 className="font-bold text-xs mb-1.5 uppercase">Rincian Riwayat Setoran & Evaluasi</h4>
                <table className="w-full border-collapse border border-black text-xs">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="border border-black p-1.5 w-7 text-center">No</th>
                            <th className="border border-black p-1.5 w-20 text-center">Tanggal</th>
                            <th className="border border-black p-1.5 w-16 text-center">Jenis</th>
                            <th className="border border-black p-1.5 text-left">Hafalan (Juz/Surah/Ayat)</th>
                            <th className="border border-black p-1.5 w-20 text-center">Predikat</th>
                            <th className="border border-black p-1.5 w-24 text-center">Teguran / Salah</th>
                            <th className="border border-black p-1.5 text-left">Catatan & Koreksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredRecords.length > 0 ? filteredRecords.map((rec, idx) => (
                            <tr key={rec.id}>
                                <td className="border border-black p-1.5 text-center">{idx + 1}</td>
                                <td className="border border-black p-1.5 text-center whitespace-nowrap">{formatDate(rec.tanggal)}</td>
                                <td className="border border-black p-1.5 text-center">
                                    <span className={`px-1 py-0.5 rounded text-[10px] font-semibold ${rec.tipe === 'Ziyadah' ? 'bg-green-100' : rec.tipe === 'Murojaah' ? 'bg-blue-100' : 'bg-amber-100'}`}>
                                        {rec.tipe}
                                    </span>
                                    {rec.sesiUjian && (
                                        <span className="block text-[8px] text-gray-500 mt-0.5">{rec.sesiUjian}</span>
                                    )}
                                </td>
                                <td className="border border-black p-1.5">
                                    <span className="font-semibold">Juz {rec.juz}</span>, QS. {rec.surah} ({rec.ayatAwal}-{rec.ayatAkhir})
                                </td>
                                <td className="border border-black p-1.5 text-center font-medium">{rec.predikat}</td>
                                <td className="border border-black p-1.5 text-center text-[10px]">
                                    {(rec.jumlahTeguran || rec.jumlahKesalahan) ? (
                                        <span className="font-semibold text-gray-800">
                                            {rec.jumlahTeguran || 0} Teg / {rec.jumlahKesalahan || 0} Salah
                                        </span>
                                    ) : (
                                        <span className="text-gray-400">-</span>
                                    )}
                                </td>
                                <td className="border border-black p-1.5 text-[11px]">
                                    {rec.rincianKesalahan && (
                                        <div className="font-semibold text-amber-900 mb-0.5">
                                            Koreksi: {rec.rincianKesalahan}
                                        </div>
                                    )}
                                    {rec.catatan ? (
                                        <span className="italic text-gray-700">{rec.catatan}</span>
                                    ) : (
                                        !rec.rincianKesalahan && <span className="text-gray-400">-</span>
                                    )}
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={7} className="border border-black p-8 text-center italic text-gray-500">
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
                        <p className="border-b border-black pb-1 font-semibold">{orangTuaName}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">{orangTuaLabel}</p>
                    </div>
                    <div className="text-center w-48">
                        <p>{settings.alamat.split(',')[1]?.trim() || settings.alamat.split(',')[0]?.trim() || 'Tempat'}, {formatDate(new Date().toISOString())}</p>
                        <p>Pembimbing Tahfizh</p>
                        <div className="h-20"></div>
                        <p className="font-bold underline">{musyrifName}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">{halaqah?.nama || 'Pembimbing Halaqah'}</p>
                    </div>
                </div>
            </div>
            
            <ReportFooter />
        </div>
    );
};

export const TahfizhReportTemplate = React.memo(TahfizhReportTemplateComponent);
