
import React, { useEffect, useState } from 'react';
import { Santri, PondokSettings, RaporRecord } from '../../../types';
import { PrintHeader } from '../../common/PrintHeader';
import { ReportFooter, chunkArray, formatDate } from './Common';
import { db } from '../../../db';

// --- COMMON HEADER FOR ACADEMIC ---
const AcademicHeader: React.FC<{ settings: PondokSettings, title: string, meta: any }> = ({ settings, title, meta }) => (
    <div>
        <PrintHeader settings={settings} title={title} />
        <div className="text-sm font-semibold mb-4 grid grid-cols-2">
            <span>Jenjang: {meta.jenjang || '...'}</span>
            <span className="text-right">Tahun Ajaran: {meta.tahunAjaran || '...'}</span>
            <span>Kelas / Rombel: {meta.kelas || '...'} / {meta.rombel || '...'}</span>
            <span className="text-right">Semester: {meta.semester || '...'}</span>
            {meta.waliKelas && <span>Wali Kelas: {meta.waliKelas}</span>}
        </div>
    </div>
);

// --- RAPOR LENGKAP TEMPLATE ---
export const RaporLengkapTemplate: React.FC<{ santri: Santri; settings: PondokSettings; options: any }> = ({ santri, settings, options }) => {
    const [raporData, setRaporData] = useState<RaporRecord | null>(null);
    const [loading, setLoading] = useState(true);

    const rombel = settings.rombel.find(r => r.id === santri.rombelId);
    const kelas = rombel ? settings.kelas.find(k => k.id === rombel.kelasId) : undefined;
    const jenjang = kelas ? settings.jenjang.find(j => j.id === kelas.jenjangId) : undefined;
    const waliKelas = rombel?.waliKelasId ? settings.tenagaPengajar.find(p => p.id === rombel.waliKelasId) : null;
    const mudir = jenjang?.mudirId ? settings.tenagaPengajar.find(p => p.id === jenjang.mudirId) : null;

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Correctly use the compound index defined in db.ts
                const record = await db.raporRecords
                    .where('[santriId+tahunAjaran+semester]')
                    .equals([santri.id, options.tahunAjaran, options.semester])
                    .first();
                setRaporData(record || null);
            } catch (error) {
                console.error("Gagal mengambil data rapor", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [santri.id, options.tahunAjaran, options.semester]);

    if(loading) return <div className="p-4 text-center">Memuat Data Rapor...</div>;

    if(!raporData) return (
        <div className="font-sans text-black p-8 text-center border-2 border-dashed border-gray-300">
            <h3 className="font-bold text-lg mb-2">Data Rapor Belum Tersedia</h3>
            <p>Belum ada data nilai yang diimpor untuk <strong>{santri.namaLengkap}</strong></p>
            <p className="text-xs mt-1">Periode: {options.tahunAjaran} ({options.semester})</p>
            <p className="text-sm mt-2 text-gray-500">Silakan upload Leger Nilai di menu <strong>Akademik</strong> terlebih dahulu. Pastikan Tahun Ajaran dan Semester di menu upload sama dengan di sini.</p>
        </div>
    );

    return (
        <div className="font-sans text-black flex flex-col h-full justify-between" style={{ fontSize: '10pt', lineHeight: '1.4' }}>
            <div>
                <PrintHeader settings={settings} title="LAPORAN HASIL BELAJAR SANTRI (RAPOR)" />
                
                <table className="w-full text-sm mb-4 font-medium">
                    <tbody>
                        <tr><td className="w-24">Nama</td><td>: {santri.namaLengkap}</td><td className="w-24 text-right">Tahun Ajaran</td><td className="w-32 text-right">: {options.tahunAjaran}</td></tr>
                        <tr><td>NIS</td><td>: {santri.nis}</td><td className="text-right">Semester</td><td className="text-right">: {options.semester}</td></tr>
                        <tr><td>Kelas/Rombel</td><td>: {kelas?.nama} / {rombel?.nama}</td><td></td><td></td></tr>
                    </tbody>
                </table>

                {/* 1. Nilai Akademik */}
                <h4 className="font-bold text-sm mb-1 border-b border-black">A. NILAI AKADEMIK</h4>
                <table className="w-full border-collapse border border-black text-xs mb-4">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="border border-black p-1 w-8 text-center">No</th>
                            <th className="border border-black p-1 text-left">Mata Pelajaran</th>
                            <th className="border border-black p-1 w-16 text-center">KKM</th>
                            <th className="border border-black p-1 w-16 text-center">Nilai</th>
                            <th className="border border-black p-1 w-24 text-center">Predikat</th>
                            <th className="border border-black p-1 text-left">Deskripsi / Keterangan</th>
                        </tr>
                    </thead>
                    <tbody>
                        {settings.mataPelajaran.filter(m => m.jenjangId === santri.jenjangId).map((mapel, idx) => {
                            const nilaiItem = raporData.nilai.find(n => n.mapelId === mapel.id);
                            const val = nilaiItem ? nilaiItem.nilaiAngka : 0;
                            let pred = "D";
                            if(val >= 90) pred = "A"; else if(val >= 80) pred = "B"; else if(val >= 70) pred = "C";
                            
                            return (
                                <tr key={mapel.id}>
                                    <td className="border border-black p-1 text-center">{idx+1}</td>
                                    <td className="border border-black p-1">{mapel.nama}</td>
                                    <td className="border border-black p-1 text-center">70</td>
                                    <td className="border border-black p-1 text-center font-bold">{val}</td>
                                    <td className="border border-black p-1 text-center">{pred}</td>
                                    <td className="border border-black p-1 italic text-gray-600">{val < 70 ? 'Perlu ditingkatkan' : 'Tuntas'}</td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>

                <div className="grid grid-cols-2 gap-4 mb-4" style={{ breakInside: 'avoid' }}>
                    {/* 2. Kepribadian */}
                    <div>
                        <h4 className="font-bold text-sm mb-1 border-b border-black">B. KEPRIBADIAN</h4>
                        <table className="w-full border-collapse border border-black text-xs">
                            <thead className="bg-gray-100"><tr><th className="border border-black p-1">Aspek</th><th className="border border-black p-1">Nilai/Keterangan</th></tr></thead>
                            <tbody>
                                {raporData.kepribadian.map((k, i) => (
                                    <tr key={i}><td className="border border-black p-1">{k.aspek}</td><td className="border border-black p-1 text-center font-semibold">{k.nilai}</td></tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {/* 3. Ketidakhadiran */}
                    <div>
                        <h4 className="font-bold text-sm mb-1 border-b border-black">C. KETIDAKHADIRAN</h4>
                        <table className="w-full border-collapse border border-black text-xs">
                            <tbody>
                                <tr><td className="border border-black p-1 w-1/2">Sakit</td><td className="border border-black p-1 text-center">{raporData.sakit} hari</td></tr>
                                <tr><td className="border border-black p-1">Izin</td><td className="border border-black p-1 text-center">{raporData.izin} hari</td></tr>
                                <tr><td className="border border-black p-1">Tanpa Keterangan</td><td className="border border-black p-1 text-center">{raporData.alpha} hari</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* 4. Catatan */}
                <div className="mb-4 p-2 border border-black min-h-[60px]" style={{ breakInside: 'avoid' }}>
                    <h4 className="font-bold text-sm underline mb-1">Catatan Wali Kelas:</h4>
                    <p className="text-xs italic">{raporData.catatanWaliKelas || 'Tingkatkan terus prestasimu.'}</p>
                </div>

                {/* 5. Keputusan */}
                {options.semester === 'Genap' && (
                    <div className="mb-6 p-2 border border-black text-center font-bold bg-gray-100" style={{ breakInside: 'avoid' }}>
                        KEPUTUSAN: {raporData.keputusan || `NAIK KE KELAS BERIKUTNYA`}
                    </div>
                )}

                {/* Tanda Tangan */}
                <div className="flex justify-between items-end mt-4 px-4 text-xs" style={{ breakInside: 'avoid' }}>
                    <div className="text-center w-40">
                        <p>Mengetahui,</p>
                        <p>Orang Tua / Wali</p>
                        <div className="h-16"></div>
                        <p className="border-b border-black">.........................</p>
                    </div>
                    <div className="text-center w-40">
                        <p>Mudir Marhalah</p>
                        <div className="h-16"></div>
                        <p className="font-bold underline">{mudir?.nama || '.........................'}</p>
                    </div>
                    <div className="text-center w-40">
                        <p>Sumpiuh, {formatDate(new Date().toISOString())}</p>
                        <p>Wali Kelas</p>
                        <div className="h-16"></div>
                        <p className="font-bold underline">{waliKelas?.nama || '.........................'}</p>
                    </div>
                </div>
            </div>
            <ReportFooter />
        </div>
    );
};

export const PanduanPenilaianTemplate: React.FC = () => (
    <div className="font-sans text-black flex flex-col h-full justify-between" style={{ fontSize: '10pt' }}>
        <div>
            <h3 className="font-bold text-xl mb-6 text-center">Panduan Penilaian</h3>
            <div className="columns-2 gap-8 text-justify">
                <div className="break-inside-avoid mb-4">
                    <h4 className="font-bold text-base mb-2">A. Deskripsi Kolom Penilaian</h4>
                    <ul className="list-disc list-outside pl-5 space-y-1 text-sm">
                        <li><strong className="font-semibold">TP (Tujuan Pembelajaran):</strong> Nilai sumatif lingkup materi.</li>
                        <li><strong className="font-semibold">SAS (Sumatif Akhir Semester):</strong> Penilaian akhir semester.</li>
                    </ul>
                </div>
                <div className="break-inside-avoid">
                    <h4 className="font-bold text-base mb-2">B. Skala Penilaian</h4>
                    <table className="text-sm">
                        <tbody>
                            <tr><td className="font-semibold pr-4">A</td><td>90 - 100</td></tr>
                            <tr><td className="font-semibold pr-4">B</td><td>80 - 89</td></tr>
                            <tr><td className="font-semibold pr-4">C</td><td>70 - 79</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        <ReportFooter />
    </div>
);

export const generateNilaiReports = (data: Santri[], settings: PondokSettings, options: any) => {
    const previews: any[] = [];
    const mapelList = settings.mataPelajaran.filter(m => options.selectedMapelIds.includes(m.id));
    
    // Extract metadata from first santri (assuming per-rombel grouping handled by caller)
    const rombel = settings.rombel.find(r => r.id === data[0]?.rombelId);
    const kelas = rombel ? settings.kelas.find(k => k.id === rombel.kelasId) : undefined;
    const jenjang = kelas ? settings.jenjang.find(j => j.id === kelas.jenjangId) : undefined;

    mapelList.forEach(mapel => {
        previews.push({
            content: (
                <div className="font-sans text-black flex flex-col h-full justify-between" style={{ fontSize: '10pt' }}>
                    <AcademicHeader settings={settings} title={`LEMBAR NILAI ${mapel.nama.toUpperCase()}`} meta={{ jenjang: jenjang?.nama, kelas: kelas?.nama, rombel: rombel?.nama, tahunAjaran: options.tahunAjaran, semester: options.semester }} />
                    <table className="w-full border-collapse border border-black text-center text-xs">
                        <thead className="bg-gray-100">
                            <tr>
                                <th rowSpan={3} className="border border-black p-1 w-8">No</th>
                                <th rowSpan={3} className="border border-black p-1 w-24">NIS</th>
                                <th rowSpan={3} className="border border-black p-1">Nama Santri</th>
                                <th colSpan={options.nilaiTpCount + 1} className="border border-black p-1">Nilai Sumatif Lingkup Materi</th>
                                <th colSpan={options.nilaiSmCount + 1} className="border border-black p-1">Nilai Sumatif Akhir</th>
                                {options.showNilaiTengahSemester && <th rowSpan={3} className="border border-black p-1 w-10">STS</th>}
                                <th rowSpan={3} className="border border-black p-1 w-10">SAS</th>
                                <th rowSpan={3} className="border border-black p-1 w-10">NA</th>
                            </tr>
                            <tr>
                                <th colSpan={options.nilaiTpCount} className="border border-black p-1">Tujuan Pembelajaran (TP)</th>
                                <th rowSpan={2} className="border border-black p-1 w-10 rotate-90"><div className="w-4">Rerata TP</div></th>
                                <th colSpan={options.nilaiSmCount} className="border border-black p-1">Sumatif Materi (SM)</th>
                                <th rowSpan={2} className="border border-black p-1 w-10 rotate-90"><div className="w-4">Rerata SM</div></th>
                            </tr>
                            <tr>
                                {[...Array(options.nilaiTpCount)].map((_, i) => <th key={i} className="border border-black p-1 w-8">{i + 1}</th>)}
                                {[...Array(options.nilaiSmCount)].map((_, i) => <th key={i} className="border border-black p-1 w-8">{i + 1}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((s, i) => (
                                <tr key={s.id} className="h-6">
                                    <td className="border border-black">{i + 1}</td>
                                    <td className="border border-black">{s.nis}</td>
                                    <td className="border border-black text-left pl-2">{s.namaLengkap}</td>
                                    {/* Empty cells for grades */}
                                    {[...Array(options.nilaiTpCount + 1 + options.nilaiSmCount + 1 + (options.showNilaiTengahSemester ? 1 : 0) + 2)].map((_, idx) => <td key={idx} className="border border-black"></td>)}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div className="mt-4 flex justify-end">
                        <div className="text-center w-64">
                            <p>Guru Mata Pelajaran,</p><div className="h-16"></div><p className="font-bold border-b border-black inline-block min-w-[150px]"></p>
                        </div>
                    </div>
                    <ReportFooter />
                </div>
            ),
            orientation: 'landscape'
        });
    });

    if (options.guidanceOption === 'show' && mapelList.length > 0) {
        previews.push({ content: <PanduanPenilaianTemplate />, orientation: 'landscape' });
    }

    return previews;
};

export const generateTableReport = (data: Santri[], settings: PondokSettings, options: any, type: 'Absensi' | 'Rombel' | 'Rapor' | 'Kedatangan') => {
    const rombel = settings.rombel.find(r => r.id === (data[0]?.rombelId || options.rombelId));
    const kelas = rombel ? settings.kelas.find(k => k.id === rombel.kelasId) : undefined;
    const jenjang = kelas ? settings.jenjang.find(j => j.id === kelas.jenjangId) : undefined;
    const waliKelas = rombel?.waliKelasId ? settings.tenagaPengajar.find(p => p.id === rombel.waliKelasId) : null;

    const meta = { jenjang: jenjang?.nama, kelas: kelas?.nama, rombel: rombel?.nama, tahunAjaran: options.tahunAjaran, semester: options.semester, waliKelas: waliKelas?.nama };
    let title = '';
    let tableHeader = null;
    let tableRow = (s: Santri, i: number) => <></>;
    let orientation: 'portrait' | 'landscape' = 'portrait';

    if (type === 'Absensi') {
        title = `LEMBAR ABSENSI BULAN ${options.attendanceCalendar === 'Masehi' ? new Date(options.startMonth).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }).toUpperCase() : `HIJRIAH`}`;
        orientation = 'landscape';
        tableHeader = (
            <thead>
                <tr>
                    <th rowSpan={2} className="border border-black p-1 w-8">No</th>
                    <th rowSpan={2} className="border border-black p-1 w-48 text-left">Nama Santri</th>
                    <th colSpan={31} className="border border-black p-1">Tanggal</th>
                    <th colSpan={3} className="border border-black p-1">Rekap</th>
                </tr>
                <tr>
                    {[...Array(31)].map((_, i) => <th key={i} className="border border-black w-6 text-[8pt]">{i+1}</th>)}
                    <th className="border border-black w-8 bg-gray-100">S</th><th className="border border-black w-8 bg-gray-100">I</th><th className="border border-black w-8 bg-gray-100">A</th>
                </tr>
            </thead>
        );
        tableRow = (s, i) => (
            <tr key={s.id} className="h-6">
                <td className="border border-black">{i+1}</td>
                <td className="border border-black text-left px-2 truncate max-w-[150px]">{s.namaLengkap}</td>
                {[...Array(31)].map((_, idx) => <td key={idx} className="border border-black"></td>)}
                <td className="border border-black bg-gray-50"></td><td className="border border-black bg-gray-50"></td><td className="border border-black bg-gray-50"></td>
            </tr>
        );
    } else if (type === 'Rombel') {
        title = "DAFTAR SANTRI PER ROMBEL";
        orientation = 'landscape';
        tableHeader = (
            <thead className="bg-gray-200">
                <tr><th className="border border-black p-2 w-8">No</th><th className="border border-black p-2 w-24">NIS</th><th className="border border-black p-2">Nama Lengkap</th><th className="border border-black p-2 w-10">L/P</th><th className="border border-black p-2 w-32">TTL</th><th className="border border-black p-2 w-32">Ayah / Wali</th><th className="border border-black p-2 w-28">No. Telepon</th><th className="border border-black p-2">Alamat</th></tr>
            </thead>
        );
        tableRow = (s, i) => {
            const wali = s.namaAyah || s.namaWali || '-';
            return (
                <tr key={s.id}>
                    <td className="border border-black p-2 text-center">{i+1}</td><td className="border border-black p-2">{s.nis}</td><td className="border border-black p-2">{s.namaLengkap}</td><td className="border border-black p-2 text-center">{s.jenisKelamin === 'Laki-laki' ? 'L' : 'P'}</td><td className="border border-black p-2">{s.tempatLahir}, {formatDate(s.tanggalLahir)}</td><td className="border border-black p-2">{wali}</td><td className="border border-black p-2">{s.teleponWali || '-'}</td><td className="border border-black p-2">{s.alamat.kecamatan}</td>
                </tr>
            );
        };
    } else if (type === 'Rapor') {
        title = "LEMBAR PENGAMBILAN DAN PENGUMPULAN RAPOR";
        orientation = 'portrait';
        tableHeader = (
            <thead className="text-xs uppercase bg-gray-200 text-center">
                <tr><th rowSpan={2} className="p-2 border border-black">No</th><th rowSpan={2} className="p-2 border border-black">NIS</th><th rowSpan={2} className="p-2 border border-black">Nama Lengkap</th><th colSpan={2} className="p-2 border border-black">Pengambilan</th><th colSpan={2} className="p-2 border border-black">Pengumpulan</th></tr>
                <tr><th className="p-2 border border-black font-medium">Tanggal</th><th className="p-2 border border-black font-medium">Tanda Tangan</th><th className="p-2 border border-black font-medium">Tanggal</th><th className="p-2 border border-black font-medium">Tanda Tangan</th></tr>
            </thead>
        );
        tableRow = (s, i) => (
            <tr key={s.id}>
                <td className="p-2 border border-black text-center">{i + 1}</td><td className="p-2 border border-black">{s.nis}</td><td className="p-2 border border-black">{s.namaLengkap}</td><td className="p-2 border border-black h-12"></td><td className="p-2 border border-black"></td><td className="p-2 border border-black"></td><td className="p-2 border border-black"></td>
            </tr>
        );
    } else if (type === 'Kedatangan') {
        title = "LEMBAR KEDATANGAN SANTRI";
        orientation = 'portrait';
        meta.semester += ` | Agenda: ${options.agendaKedatangan || '...'}`; // Hack to fit agenda
        tableHeader = (
            <thead className="text-xs uppercase bg-gray-200 text-center">
                <tr><th rowSpan={2} className="px-2 py-2 border border-black align-middle">No</th><th rowSpan={2} className="px-2 py-2 border border-black align-middle">NIS</th><th rowSpan={2} className="px-2 py-2 border border-black align-middle" style={{minWidth: '200px'}}>Nama Lengkap</th><th colSpan={2} className="px-2 py-2 border border-black">Waktu Kedatangan</th><th rowSpan={2} className="px-2 py-2 border border-black align-middle">Paraf</th></tr>
                <tr><th className="px-2 py-2 border border-black font-medium">Hari, Tanggal</th><th className="px-2 py-2 border border-black font-medium">Pukul</th></tr>
            </thead>
        );
        tableRow = (s, i) => (
            <tr key={s.id}>
                <td className="px-2 py-2 border border-black text-center">{i + 1}</td><td className="px-2 py-2 border border-black">{s.nis}</td><td className="px-2 py-2 border border-black">{s.namaLengkap}</td><td className="px-2 py-2 border border-black h-8"></td><td className="px-2 py-2 border border-black h-8"></td><td className="px-2 py-2 border border-black h-8"></td>
            </tr>
        );
    }

    return [{
        content: (
            <div className="font-sans text-black flex flex-col h-full justify-between" style={{ fontSize: '10pt' }}>
                <div>
                    <AcademicHeader settings={settings} title={title} meta={meta} />
                    <table className="w-full text-left border-collapse border border-black text-xs">
                        {tableHeader}
                        <tbody>{data.map((s, i) => tableRow(s, i))}</tbody>
                    </table>
                </div>
                <ReportFooter />
            </div>
        ),
        orientation
    }];
};

export const generateRaporLengkapReports = (data: Santri[], settings: PondokSettings, options: any) => {
    return data.map(santri => ({
        content: <RaporLengkapTemplate santri={santri} settings={settings} options={options} />,
        orientation: 'portrait' as const
    }));
};
