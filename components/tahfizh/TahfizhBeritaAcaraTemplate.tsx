import React from 'react';
import { Santri, PondokSettings } from '../../types';
import { PrintHeader } from '../common/PrintHeader';
import { formatDate, ReportFooter } from '../reports/modules/Common';

export interface MunaqosyahScoreBreakdown {
    sesiUjian: string;
    juz: number;
    materiUjian: string;
    tanggal: string;
    pengujiNama: string;
    pengujiJabatan?: string;
    itqanScore: number;
    itqanMax: number;
    tajwidScore: number;
    tajwidMax: number;
    fashahahScore: number;
    fashahahMax: number;
    adabScore: number;
    adabMax: number;
    totalScore: number;
    predikat: string;
    statusKelulusan: 'LULUS' | 'BELUM LULUS' | 'LULUS BERSYARAT';
    catatanPenguji: string;
    minorTawaqquf: number;
    majorFathulAyat: number;
    salahTajwid: number;
    salahMakhraj: number;
}

interface TahfizhBeritaAcaraTemplateProps {
    santri: Santri;
    settings: PondokSettings;
    examData: MunaqosyahScoreBreakdown;
}

export const TahfizhBeritaAcaraTemplate: React.FC<TahfizhBeritaAcaraTemplateProps> = ({
    santri,
    settings,
    examData,
}) => {
    const rombel = settings.rombel.find(r => r.id === santri.rombelId);
    const kelas = settings.kelas.find(k => k.id === santri.kelasId);
    const jenjang = settings.jenjang.find(j => j.id === santri.jenjangId);
    const halaqah = settings.kelompokHalaqah?.find(h => h.id === santri.halaqahId || h.santriIds?.includes(santri.id));

    // Auto-link Mudir / Pengasuh Pondok
    const mudirTeacher = (settings.mudirAamId ? settings.tenagaPengajar.find(t => t.id === settings.mudirAamId) : null)
        || (jenjang?.mudirId ? settings.tenagaPengajar.find(t => t.id === jenjang.mudirId) : null)
        || settings.tenagaPengajar.find(t => t.riwayatJabatan?.some(r => 
            r.jabatan.toLowerCase().includes('mudir') || 
            r.jabatan.toLowerCase().includes('pengasuh') || 
            r.jabatan.toLowerCase().includes('pimpinan') || 
            r.jabatan.toLowerCase().includes('kepala')
        ))
        || settings.tenagaPengajar[0];

    const mudirName = mudirTeacher?.nama || (settings.namaPonpes ? `Mudir ${settings.namaPonpes}` : 'Pimpinan Pondok Pesantren');
    const activeJabatan = mudirTeacher?.riwayatJabatan?.find(r => !r.tanggalSelesai)?.jabatan;
    const mudirJabatan = activeJabatan || 'Pengasuh / Mudir Pondok';

    return (
        <div 
            className="font-sans text-black p-8 bg-white flex flex-col justify-between printable-content-wrapper print-portrait"
            style={{ width: '21cm', minHeight: '29.7cm' }}
        >
            <div>
                <PrintHeader settings={settings} title="BERITA ACARA & LEMBAR PENILAIAN MUNAQOSYAH TAHFIZH" compact />

                {/* Nomor & Identitas Ujian */}
                <div className="border-b-2 border-gray-800 pb-2 mb-4 mt-3 flex justify-between items-end">
                    <div>
                        <span className="text-[11px] font-bold uppercase text-gray-600 block">Jenis Sesi:</span>
                        <span className="text-sm font-black text-gray-900">{examData.sesiUjian}</span>
                    </div>
                    <div className="text-right">
                        <span className="text-[11px] font-bold text-gray-600 block">Tanggal Pelaksanaan:</span>
                        <span className="text-xs font-bold text-gray-900">{formatDate(examData.tanggal)}</span>
                    </div>
                </div>

                {/* Data Santri */}
                <div className="bg-gray-50 border border-gray-300 p-3 rounded-lg mb-4 text-xs">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                        <div className="flex">
                            <span className="w-28 font-bold text-gray-700">Nama Santri</span>
                            <span className="w-3">:</span>
                            <span className="font-bold text-gray-900">{santri.namaLengkap}</span>
                        </div>
                        <div className="flex">
                            <span className="w-28 font-bold text-gray-700">Materi Ujian</span>
                            <span className="w-3">:</span>
                            <span className="font-bold text-gray-900">Juz {examData.juz} ({examData.materiUjian})</span>
                        </div>
                        <div className="flex">
                            <span className="w-28 font-bold text-gray-700">NIS</span>
                            <span className="w-3">:</span>
                            <span>{santri.nis || '-'}</span>
                        </div>
                        <div className="flex">
                            <span className="w-28 font-bold text-gray-700">Halaqah</span>
                            <span className="w-3">:</span>
                            <span>{halaqah?.nama || '-'}</span>
                        </div>
                        <div className="flex">
                            <span className="w-28 font-bold text-gray-700">Kelas / Rombel</span>
                            <span className="w-3">:</span>
                            <span>{jenjang?.nama} {kelas?.nama ? `- ${kelas.nama}` : ''} {rombel?.nama ? `(${rombel.nama})` : ''}</span>
                        </div>
                        <div className="flex">
                            <span className="w-28 font-bold text-gray-700">Dewan Penguji</span>
                            <span className="w-3">:</span>
                            <span className="font-bold">{examData.pengujiNama}</span>
                        </div>
                    </div>
                </div>

                {/* Tabel Aspek Penilaian */}
                <div className="mb-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider mb-2 text-gray-800 flex items-center gap-1.5">
                        <span>A. RINCIAN SKOR PENILAIAN TERSTANDAR</span>
                    </h4>
                    <table className="w-full border-collapse border border-black text-xs">
                        <thead>
                            <tr className="bg-gray-100 font-bold text-center">
                                <th className="border border-black p-2 w-8">No</th>
                                <th className="border border-black p-2 text-left">Aspek & Kriteria Penilaian</th>
                                <th className="border border-black p-2 w-28">Catatan Kesalahan</th>
                                <th className="border border-black p-2 w-20">Bobot Maks</th>
                                <th className="border border-black p-2 w-24">Skor Diperoleh</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td className="border border-black p-2 text-center font-bold">1</td>
                                <td className="border border-black p-2">
                                    <div className="font-bold">Kelancaran & Al-Itqan</div>
                                    <div className="text-[10px] text-gray-600">
                                        Ketepatan menyambung ayat, ketahanan hafalan, tidak sering terhenti / tertukar.
                                    </div>
                                </td>
                                <td className="border border-black p-2 text-center text-[10px]">
                                    <div>Tawaqquf: {examData.minorTawaqquf}x</div>
                                    <div>Fathul Ayat: {examData.majorFathulAyat}x</div>
                                </td>
                                <td className="border border-black p-2 text-center font-bold">{examData.itqanMax}</td>
                                <td className="border border-black p-2 text-center font-bold text-sm bg-gray-50">{examData.itqanScore}</td>
                            </tr>
                            <tr>
                                <td className="border border-black p-2 text-center font-bold">2</td>
                                <td className="border border-black p-2">
                                    <div className="font-bold">Tajwid & Hukum Bacaan</div>
                                    <div className="text-[10px] text-gray-600">
                                        Ahkamul Huruf, Ghunnah, Mad Far'i & Thabi'i, Qalqalah, Idgham, Ikhfa'.
                                    </div>
                                </td>
                                <td className="border border-black p-2 text-center text-[10px]">
                                    {examData.salahTajwid > 0 ? `${examData.salahTajwid} kekeliruan` : 'Sempurna'}
                                </td>
                                <td className="border border-black p-2 text-center font-bold">{examData.tajwidMax}</td>
                                <td className="border border-black p-2 text-center font-bold text-sm bg-gray-50">{examData.tajwidScore}</td>
                            </tr>
                            <tr>
                                <td className="border border-black p-2 text-center font-bold">3</td>
                                <td className="border border-black p-2">
                                    <div className="font-bold">Fashahah & Makharijul Huruf</div>
                                    <div className="text-[10px] text-gray-600">
                                        Ketepatan makhraj, sifatul huruf, waqaf & ibtida' (tanda berhenti/mulai bacaan).
                                    </div>
                                </td>
                                <td className="border border-black p-2 text-center text-[10px]">
                                    {examData.salahMakhraj > 0 ? `${examData.salahMakhraj} kekeliruan` : 'Sempurna'}
                                </td>
                                <td className="border border-black p-2 text-center font-bold">{examData.fashahahMax}</td>
                                <td className="border border-black p-2 text-center font-bold text-sm bg-gray-50">{examData.fashahahScore}</td>
                            </tr>
                            <tr>
                                <td className="border border-black p-2 text-center font-bold">4</td>
                                <td className="border border-black p-2">
                                    <div className="font-bold">Adab, Tartil & Irama</div>
                                    <div className="text-[10px] text-gray-600">
                                        Adab tilawah, ketenangan duduk, keteraturan nafas & keindahan tartil.
                                    </div>
                                </td>
                                <td className="border border-black p-2 text-center text-[10px]">
                                    Kekhusyukan Baik
                                </td>
                                <td className="border border-black p-2 text-center font-bold">{examData.adabMax}</td>
                                <td className="border border-black p-2 text-center font-bold text-sm bg-gray-50">{examData.adabScore}</td>
                            </tr>
                        </tbody>
                        <tfoot>
                            <tr className="bg-gray-100 font-bold">
                                <td colSpan={3} className="border border-black p-2 text-right uppercase">Total Skor Akhir:</td>
                                <td className="border border-black p-2 text-center">100</td>
                                <td className="border border-black p-2 text-center text-base bg-emerald-50 text-emerald-950">
                                    {examData.totalScore}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {/* Hasil & Keputusan Kelulusan */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="border border-black p-3 bg-gray-50 rounded-md">
                        <div className="text-[11px] font-bold text-gray-700 uppercase mb-1">Predikat Kelulusan:</div>
                        <div className="text-base font-black text-gray-900 mb-1">{examData.predikat}</div>
                        <div className="inline-block px-3 py-1 rounded bg-black text-white font-bold text-xs uppercase tracking-wider">
                            STATUS: {examData.statusKelulusan}
                        </div>
                    </div>
                    <div className="border border-black p-3 bg-gray-50 rounded-md">
                        <div className="text-[11px] font-bold text-gray-700 uppercase mb-1">Catatan / Rekomendasi Dewan Penguji:</div>
                        <p className="text-xs italic text-gray-800 leading-relaxed">
                            "{examData.catatanPenguji || 'Tuntas dengan baik, dianjurkan menjaga muraja\'ah harian.'}"
                        </p>
                    </div>
                </div>
            </div>

            {/* Tanda Tangan */}
            <div className="mt-6 pt-4 border-t border-gray-300" style={{ breakInside: 'avoid' }}>
                <div className="flex justify-between items-start text-xs">
                    <div className="text-center w-52">
                        <p className="mb-14">Mengetahui,<br /><strong>{mudirJabatan}</strong></p>
                        <p className="font-bold underline">{mudirName}</p>
                        <p className="text-[11px] text-gray-600">{settings.namaPonpes || 'Pimpinan Pondok'}</p>
                    </div>

                    <div className="text-center w-52">
                        <p className="mb-14">Ditetapkan di: {settings.alamat?.split(',')[1]?.trim() || settings.alamat?.split(',')[0]?.trim() || 'Pondok'}<br />Tanggal: {formatDate(examData.tanggal)}</p>
                        <p className="font-bold underline">{examData.pengujiNama}</p>
                        <p className="text-[11px] text-gray-600">Dewan Penguji Munaqosyah</p>
                    </div>
                </div>
            </div>

            <ReportFooter />
        </div>
    );
};
