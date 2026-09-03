
import React, { useEffect, useState } from 'react';
import { Santri, PondokSettings, RaporRecord } from '../../../types';
import { PrintHeader } from '../../common/PrintHeader';
import { ReportFooter, chunkArray, formatDate, formatAlamat } from './Common';
import { formatTanggalDokumen } from '../../../utils/formatters';
import { db } from '../../../db';
import { formatAcademicYearDisplay } from '../../../utils/academicYear';

// --- COMMON HEADER FOR ACADEMIC ---
const AcademicHeader: React.FC<{ settings: PondokSettings, title: string, meta: any }> = ({ settings, title, meta }) => (
    <div>
        <PrintHeader settings={settings} title={title} />
        <div className="print-meta text-sm font-semibold mb-4 grid grid-cols-2 gap-y-1 bg-gray-50 p-3 rounded-lg border border-gray-200">
            <span>Jenjang: <span className="font-normal">{meta.jenjang || '-'}</span></span>
            <span className="text-right">
                <span className="font-normal">{meta.tahunAjaran ? formatAcademicYearDisplay(settings, meta.tahunAjaran) : '-'}</span>
            </span>
            <span>Kelas / Rombel: <span className="font-normal">{meta.kelas || '-'} / {meta.rombel || '-'}</span></span>
            <span className="text-right">Semester: <span className="font-normal">{meta.semester || '-'}</span></span>
            {meta.waliKelas && <span>Wali Kelas: <span className="font-normal">{meta.waliKelas}</span></span>}
            {meta.agenda && <span className={meta.waliKelas ? "text-right" : "col-span-2"}>Agenda: <span className="font-normal text-blue-700">{meta.agenda}</span></span>}
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
            <p className="text-xs mt-1">Periode: {formatAcademicYearDisplay(settings, options.tahunAjaran)} ({options.semester})</p>
            <p className="text-sm mt-2 text-gray-500">Silakan upload Leger Nilai di menu <strong>Akademik</strong> terlebih dahulu. Pastikan Tahun Ajaran dan Semester di menu upload sama dengan di sini.</p>
        </div>
    );

    return (
        <div className="font-sans text-black flex flex-col h-full justify-between" style={{ fontSize: '10pt', lineHeight: '1.4' }}>
            <div>
                <PrintHeader settings={settings} title="LAPORAN HASIL BELAJAR SANTRI (RAPOR)" />
                
                <table className="print-meta w-full text-sm mb-4 font-medium">
                    <tbody>
                        <tr><td className="w-24">Nama</td><td>: {santri.namaLengkap}</td><td className="w-24 text-right">Tahun Ajaran</td><td className="w-32 text-right">: {formatAcademicYearDisplay(settings, options.tahunAjaran)}</td></tr>
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

                {/* 4B. Dynamic Tags - Tahfizh */}
                {(raporData.tahfizhGanjil || raporData.tahfizhGenap || raporData.juzYangDiujikan) && (
                    <div className="mb-4 p-2 border border-black bg-gray-50" style={{ breakInside: 'avoid' }}>
                        <h4 className="font-bold text-sm underline mb-2">D. PERKEMBANGAN TAHFIZHUL QUR'AN</h4>
                        <div className="grid grid-cols-2 gap-4 text-xs">
                            {raporData.tahfizhGanjil && (
                                <div className="border border-gray-300 rounded p-2 bg-white">
                                    <p className="font-semibold text-teal-700 mb-1">Semester Ganjil</p>
                                    <p>Predikat Rata-rata: <span className="font-bold">{raporData.tahfizhGanjil.averagePredikat}</span></p>
                                    <p>Posisi Terakhir: <span className="font-semibold">Juz {raporData.tahfizhGanjil.lastJuz}, {raporData.tahfizhGanjil.lastSurah}</span></p>
                                    {raporData.tahfizhGanjil.catatan && <p className="italic text-gray-600">Catatan: {raporData.tahfizhGanjil.catatan}</p>}
                                </div>
                            )}
                            {raporData.tahfizhGenap && (
                                <div className="border border-gray-300 rounded p-2 bg-white">
                                    <p className="font-semibold text-amber-700 mb-1">Semester Genap</p>
                                    <p>Predikat Rata-rata: <span className="font-bold">{raporData.tahfizhGenap.averagePredikat}</span></p>
                                    <p>Posisi Terakhir: <span className="font-semibold">Juz {raporData.tahfizhGenap.lastJuz}, {raporData.tahfizhGenap.lastSurah}</span></p>
                                    {raporData.tahfizhGenap.catatan && <p className="italic text-gray-600">Catatan: {raporData.tahfizhGenap.catatan}</p>}
                                </div>
                            )}
                            {raporData.juzYangDiujikan && (
                                <div className="border border-gray-300 rounded p-2 bg-white">
                                    <p className="font-semibold text-blue-700 mb-1">Juz yang Diujikan</p>
                                    <p className="text-lg font-bold">Juz {raporData.juzYangDiujikan}</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 5. Keputusan */}
                {options.semester === 'Genap' && (
                    <div className="mb-6 p-2 border border-black text-center font-bold bg-gray-100" style={{ breakInside: 'avoid' }}>
                        KEPUTUSAN: {raporData.keputusan || `NAIK KE KELAS BERIKUTNYA`}
                    </div>
                )}

                {/* Tanda Tangan */}
                {(() => {
                    const tempatRapor = options?.tempatRapor || settings?.tempatRaporDefault?.trim() || (settings?.alamat ? (settings.alamat.includes(',') ? settings.alamat.split(',')[0].trim() : 'Pesantren') : 'Pesantren');
                    const tanggalRaw = options?.tanggalRapor || (raporData as any)?.tanggalRapor || settings?.tanggalRaporDefault || new Date().toISOString();
                    const formatMode = options?.formatMode || settings?.formatTanggalRaporDefault || 'masehi';
                    const manualHijri = options?.manualHijri || settings?.manualHijriRaporDefault || '';
                    const tanggalDisplay = formatTanggalDokumen(tanggalRaw, {
                        formatMode,
                        hijriAdjustment: settings?.hijriAdjustment || 0,
                        manualHijri
                    });

                    return (
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
                            <div className="text-center w-44">
                                <p>{tempatRapor}, {tanggalDisplay}</p>
                                <p>Wali Kelas</p>
                                <div className="h-16"></div>
                                <p className="font-bold underline">{waliKelas?.nama || '.........................'}</p>
                            </div>
                        </div>
                    );
                })()}
            </div>
            <ReportFooter />
        </div>
    );
};

export const PanduanPenilaianTemplate: React.FC<{ settings?: PondokSettings; options?: any }> = ({ settings, options }) => (
    <div className="font-sans text-black flex flex-col h-full justify-between" style={{ fontSize: '9pt', lineHeight: '1.35' }}>
        <div>
            {/* Header */}
            {settings && (
                <PrintHeader 
                    settings={settings} 
                    title="PANDUAN & PETUNJUK TEKNIS PENGISIAN LEMBAR PENILAIAN AKADEMIK" 
                />
            )}
            {!settings && (
                <div className="text-center mb-3 pb-2 border-b border-black">
                    <h3 className="font-bold text-base uppercase">PANDUAN & PETUNJUK TEKNIS PENGISIAN LEMBAR PENILAIAN AKADEMIK</h3>
                </div>
            )}

            {options?.tahunAjaran && (
                <div className="text-xs font-semibold mb-3 bg-gray-100 p-2 rounded border border-gray-300 flex justify-between">
                    <span>Tahun Ajaran: {settings ? formatAcademicYearDisplay(settings, options.tahunAjaran) : options.tahunAjaran}</span>
                    <span>Semester: {options.semester || '-'}</span>
                    <span>Standar KKM: 70</span>
                </div>
            )}

            <div className="grid grid-cols-2 gap-4 text-left">
                {/* Kolom Kiri: Glosarium & Rumus Perhitungan */}
                <div className="space-y-3">
                    {/* Bagian A: Glosarium Kolom */}
                    <div className="border border-black p-2.5 rounded bg-white">
                        <h4 className="font-bold text-xs uppercase mb-1.5 border-b border-black pb-0.5 text-teal-800">
                            A. Glosarium & Penjelasan Kolom Penilaian
                        </h4>
                        <table className="w-full text-[8.5pt] border-collapse">
                            <tbody>
                                <tr className="border-b border-gray-200">
                                    <td className="font-bold w-20 py-1 align-top text-gray-800">TP 1, 2, ...</td>
                                    <td className="py-1"><strong>Tujuan Pembelajaran:</strong> Nilai formatif/sumatif per topik bahasan (tugas, kuis harian, setoran materi).</td>
                                </tr>
                                <tr className="border-b border-gray-200">
                                    <td className="font-bold py-1 align-top text-gray-800">Rerata TP</td>
                                    <td className="py-1">Rata-rata dari seluruh nilai TP yang dilaksanakan: <em>(TP₁ + TP₂ + ... + TPₙ) ÷ n</em>.</td>
                                </tr>
                                <tr className="border-b border-gray-200">
                                    <td className="font-bold py-1 align-top text-gray-800">SM 1, 2, ...</td>
                                    <td className="py-1"><strong>Sumatif Materi:</strong> Nilai ulangan bab / evaluasi modul yang diujikan secara tertulis atau lisan.</td>
                                </tr>
                                <tr className="border-b border-gray-200">
                                    <td className="font-bold py-1 align-top text-gray-800">Rerata SM</td>
                                    <td className="py-1">Rata-rata dari seluruh nilai Sumatif Materi: <em>(SM₁ + SM₂ + ... + SMₙ) ÷ n</em>.</td>
                                </tr>
                                <tr className="border-b border-gray-200">
                                    <td className="font-bold py-1 align-top text-gray-800">STS</td>
                                    <td className="py-1"><strong>Sumatif Tengah Semester:</strong> Penilaian paruh semester untuk mengukur capaian tengah periode.</td>
                                </tr>
                                <tr className="border-b border-gray-200">
                                    <td className="font-bold py-1 align-top text-gray-800">SAS</td>
                                    <td className="py-1"><strong>Sumatif Akhir Semester:</strong> Ujian komprehensif pada akhir semester (PAS / PAT).</td>
                                </tr>
                                <tr>
                                    <td className="font-bold py-1 align-top text-gray-800">NA</td>
                                    <td className="py-1"><strong>Nilai Akhir Rapor:</strong> Akumulasi nilai berbobot yang dimasukkan ke dalam buku Rapor.</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Bagian B: Rumus Pembobotan NA */}
                    <div className="border border-black p-2.5 rounded bg-gray-50">
                        <h4 className="font-bold text-xs uppercase mb-1.5 border-b border-black pb-0.5 text-teal-800">
                            B. Rumus Formulasi Nilai Akhir (NA) & Total Bobot
                        </h4>
                        <div className="space-y-2 text-[8.5pt]">
                            <div>
                                <p className="font-semibold text-gray-900">1. Skema Dengan STS (Sumatif Tengah Semester):</p>
                                <div className="bg-white p-1.5 border border-gray-300 font-mono text-center text-[8.5pt] font-bold my-1 text-slate-800">
                                    NA = [(2 × Rerata TP) + (2 × Rerata SM) + (1 × STS) + (1 × SAS)] ÷ 6
                                </div>
                                <p className="text-[7.5pt] text-gray-600 italic">
                                    *Pembagi 6 berasal dari total bobot: 2 (TP) + 2 (SM) + 1 (STS) + 1 (SAS) = 6.
                                </p>
                            </div>
                            <div>
                                <p className="font-semibold text-gray-900">2. Skema Tanpa STS (Jika STS Tidak Diadakan):</p>
                                <div className="bg-white p-1.5 border border-gray-300 font-mono text-center text-[8.5pt] font-bold my-1 text-slate-800">
                                    NA = [(2 × Rerata TP) + (2 × Rerata SM) + (2 × SAS)] ÷ 6
                                </div>
                                <p className="text-[7.5pt] text-gray-600 italic">
                                    *Pembagi 6 berasal dari total bobot: 2 (TP) + 2 (SM) + 2 (SAS) = 6.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Kolom Kanan: Contoh Simulasi, Skala Nilai & Juknis */}
                <div className="space-y-3">
                    {/* Bagian C: Contoh Simulasi Perhitungan Riil */}
                    <div className="border border-black p-2.5 rounded bg-white">
                        <h4 className="font-bold text-xs uppercase mb-1.5 border-b border-black pb-0.5 text-teal-800">
                            C. Contoh Simulasi Perhitungan Riil
                        </h4>
                        <div className="text-[8.5pt] space-y-1">
                            <p className="font-semibold">Nama Santri: <em>Ahmad Fauzan (Kelas VII-A)</em></p>
                            <ul className="list-disc list-inside text-gray-700 space-y-0.5 pl-1">
                                <li>Nilai TP: TP1 = 85, TP2 = 80, TP3 = 90 &rarr; <strong>Rerata TP = 85</strong></li>
                                <li>Nilai SM: SM1 = 80, SM2 = 90 &rarr; <strong>Rerata SM = 85</strong></li>
                                <li>Nilai STS = <strong>80</strong>, Nilai SAS = <strong>90</strong></li>
                            </ul>
                            <div className="bg-teal-50 border border-teal-200 p-1.5 rounded mt-1 font-mono text-[8.5pt]">
                                NA = [(2×85) + (2×85) + (1×80) + (1×90)] ÷ 6<br />
                                NA = [170 + 170 + 80 + 90] ÷ 6 = 510 ÷ 6 = <strong className="text-teal-900 text-[9pt]">85.0 (Predikat B / Baik)</strong>
                            </div>
                        </div>
                    </div>

                    {/* Bagian D: Skala Predikat & KKM */}
                    <div className="border border-black p-2.5 rounded bg-white">
                        <h4 className="font-bold text-xs uppercase mb-1.5 border-b border-black pb-0.5 text-teal-800">
                            D. Standar Skala Predikat & KKM (Acuan KKM: 70)
                        </h4>
                        <table className="w-full text-center text-[8.5pt] border-collapse border border-black">
                            <thead className="bg-gray-100 font-bold">
                                <tr>
                                    <th className="border border-black p-1 w-20">Rentang Nilai</th>
                                    <th className="border border-black p-1 w-14">Predikat</th>
                                    <th className="border border-black p-1 w-24">Istilah Pesantren</th>
                                    <th className="border border-black p-1 text-left px-2">Keterangan Capaian</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="border border-black p-1 font-bold">90 – 100</td>
                                    <td className="border border-black p-1 font-bold text-teal-700">A</td>
                                    <td className="border border-black p-1">Mumtaz</td>
                                    <td className="border border-black p-1 text-left px-2">Sangat Baik (Menguasai seluruh capaian)</td>
                                </tr>
                                <tr>
                                    <td className="border border-black p-1 font-bold">80 – 89</td>
                                    <td className="border border-black p-1 font-bold text-blue-700">B</td>
                                    <td className="border border-black p-1">Jayyid Jiddan</td>
                                    <td className="border border-black p-1 text-left px-2">Baik (Memenuhi seluruh kompetensi)</td>
                                </tr>
                                <tr>
                                    <td className="border border-black p-1 font-bold">70 – 79</td>
                                    <td className="border border-black p-1 font-bold text-amber-700">C</td>
                                    <td className="border border-black p-1">Jayyid</td>
                                    <td className="border border-black p-1 text-left px-2">Cukup (Tuntas batas KKM minimal)</td>
                                </tr>
                                <tr className="bg-rose-50">
                                    <td className="border border-black p-1 font-bold text-rose-700">&lt; 70</td>
                                    <td className="border border-black p-1 font-bold text-rose-700">D</td>
                                    <td className="border border-black p-1">Maqbul / Rosib</td>
                                    <td className="border border-black p-1 text-left px-2 text-rose-800">Belum Tuntas (Wajib Bimbingan Remedial)</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Bagian E: Petunjuk Teknis Guru */}
                    <div className="border border-black p-2 rounded bg-gray-50 text-[8pt]">
                        <h4 className="font-bold text-[8.5pt] uppercase mb-1 text-slate-800">
                            E. Petunjuk Teknis & Tata Tertib Pengisian Guru:
                        </h4>
                        <ol className="list-decimal list-inside space-y-0.5 text-gray-700">
                            <li>Isi skor rentang <strong>0 – 100</strong> tanpa desimal (pembulatan &ge; 0.5 ke atas).</li>
                            <li>Bagi santri dengan nilai di bawah KKM (&lt; 70), berikan program <strong>Remedial</strong> sebelum mengisi kolom NA. Nilai maksimal remedial adalah KKM (70).</li>
                            <li>Bagi santri <em>Hiatus / Izin Khusus</em>, kolom nilai dikosongkan sementara dan dikoordinasikan ke Wali Kelas.</li>
                            <li>Lembar nilai yang sudah ditandatangani diserahkan ke Bagian Kurikulum untuk penginputan sistem rapor eSantri.</li>
                        </ol>
                    </div>
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
                                    <td className="border border-black text-left pl-2">{s.namaLengkap} {s.status === 'Hiatus' && <span className="italic text-xs text-red-600 print:text-black print:font-bold border-red-200 border rounded px-1 ml-1 scale-75 inline-block">Hiatus</span>}</td>
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
        previews.push({ content: <PanduanPenilaianTemplate settings={settings} options={options} />, orientation: 'landscape' });
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

    // Calculate days in month based on selected month for accurate attendance grid
    const getDaysInMonth = (year: number, month: number) => {
        return new Date(year, month, 0).getDate();
    };

    // Parse month from options.startMonth (format: YYYY-MM)
    const parseMonthFromOption = (dateStr: string) => {
        const [year, month] = dateStr.split('-').map(Number);
        return { year, month };
    };

    // Calculate days for the attendance grid
    const { year: startYear, month: startMonth } = parseMonthFromOption(options.startMonth || new Date().toISOString().slice(0, 7));
    const daysInSelectedMonth = getDaysInMonth(startYear, startMonth);

    if (type === 'Absensi') {
        title = `LEMBAR ABSENSI BULAN ${options.attendanceCalendar === 'Masehi' ? new Date(options.startMonth).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }).toUpperCase() : `HIJRIAH`}`;
        orientation = 'landscape';
        tableHeader = (
            <thead>
                <tr>
                    <th rowSpan={2} className="border border-black p-1 w-8">No</th>
                    <th rowSpan={2} className="border border-black p-1 w-48 text-left">Nama Santri</th>
                    <th colSpan={daysInSelectedMonth} className="border border-black p-1">Tanggal</th>
                    <th colSpan={3} className="border border-black p-1">Rekap</th>
                </tr>
                <tr>
                    {[...Array(daysInSelectedMonth)].map((_, i) => <th key={i} className="border border-black w-6 text-[8pt]">{i+1}</th>)}
                    <th className="border border-black w-8 bg-gray-100">S</th><th className="border border-black w-8 bg-gray-100">I</th><th className="border border-black w-8 bg-gray-100">A</th>
                </tr>
            </thead>
        );
        tableRow = (s, i) => (
            <tr key={s.id} className="h-6">
                <td className="border border-black">{i+1}</td>
                <td className="border border-black text-left px-2 truncate max-w-[150px]">{s.namaLengkap} {s.status === 'Hiatus' && <span className="italic text-xs text-red-600 print:text-black print:font-bold border-red-200 border rounded px-1 ml-1 scale-75 inline-block">Hiatus</span>}</td>
                {[...Array(daysInSelectedMonth)].map((_, idx) => <td key={idx} className="border border-black"></td>)}
                <td className="border border-black bg-gray-50"></td><td className="border border-black bg-gray-50"></td><td className="border border-black bg-gray-50"></td>
            </tr>
        );
    } else if (type === 'Rombel') {
        const customTitle = options.rombelTitle?.trim() || "DAFTAR SANTRI";
        title = customTitle;
        const defaultColumns = ['no', 'nis', 'namaLengkap', 'lp', 'ttl', 'wali', 'telepon', 'alamat'];
        const activeColumns: string[] = (options.rombelVisibleColumns && options.rombelVisibleColumns.length > 0)
            ? options.rombelVisibleColumns
            : defaultColumns;
            
        // Calculate orientation
        if (options.rombelOrientation === 'portrait') {
            orientation = 'portrait';
        } else if (options.rombelOrientation === 'landscape') {
            orientation = 'landscape';
        } else {
            orientation = activeColumns.length > 7 ? 'landscape' : 'portrait';
        }

        const getColumnLabel = (id: string) => {
            const labels: Record<string, string> = {
                no: 'No',
                nis: 'NIS',
                nisn: 'NISN',
                nik: 'NIK',
                namaLengkap: 'Nama Lengkap',
                namaHijrah: 'Nama Hijrah',
                lp: 'L/P',
                tempatLahir: 'Tempat Lahir',
                tanggalLahir: 'Tanggal Lahir',
                ttl: 'Tempat, Tgl Lahir',
                kewarganegaraan: 'Kewarganegaraan',
                ayah: 'Nama Ayah',
                ibu: 'Nama Ibu',
                wali: 'Ayah / Wali / Ibu',
                telepon: 'No. Telepon',
                teleponAyah: 'Telepon Ayah',
                teleponIbu: 'Telepon Ibu',
                teleponWali: 'Telepon Wali',
                jenjang: 'Jenjang',
                kelas: 'Kelas',
                rombel: 'Rombel',
                status: 'Status',
                jenisSantri: 'Jenis Santri',
                tanggalMasuk: 'Tgl Masuk',
                alamat: 'Alamat Lengkap',
                desa: 'Desa/Kel.',
                kecamatan: 'Kecamatan',
                kabupaten: 'Kab./Kota',
                provinsi: 'Provinsi',
                kodePos: 'Kode Pos',
                sekolahAsal: 'Sekolah Asal',
                anakKe: 'Anak Ke-',
                jumlahSaudara: 'Jml Sdr',
                tinggiBadan: 'TB (cm)',
                beratBadan: 'BB (kg)',
            };
            return labels[id] || id;
        };

        const getColumnClass = (id: string) => {
            const baseClass = 'border border-black px-2 py-1.5 text-xs';
            const widthMap: Record<string, string> = {
                no: 'border border-black px-1 py-1.5 text-center w-8',
                lp: 'border border-black px-1 py-1.5 text-center w-10',
                nis: 'border border-black px-2 py-1.5 text-center w-20',
                nisn: 'border border-black px-2 py-1.5 text-center w-24',
                nik: 'border border-black px-2 py-1.5 text-center w-28',
                namaLengkap: 'border border-black px-2 py-1.5 font-medium',
                namaHijrah: 'border border-black px-2 py-1.5',
                tempatLahir: 'border border-black px-2 py-1.5',
                tanggalLahir: 'border border-black px-2 py-1.5 text-center',
                ttl: 'border border-black px-2 py-1.5',
                kewarganegaraan: 'border border-black px-2 py-1.5 text-center',
                ayah: 'border border-black px-2 py-1.5',
                ibu: 'border border-black px-2 py-1.5',
                wali: 'border border-black px-2 py-1.5',
                telepon: 'border border-black px-2 py-1.5 text-center',
                teleponAyah: 'border border-black px-2 py-1.5 text-center',
                teleponIbu: 'border border-black px-2 py-1.5 text-center',
                teleponWali: 'border border-black px-2 py-1.5 text-center',
                jenjang: 'border border-black px-2 py-1.5 text-center',
                kelas: 'border border-black px-2 py-1.5 text-center',
                rombel: 'border border-black px-2 py-1.5 text-center',
                status: 'border border-black px-2 py-1.5 text-center',
                jenisSantri: 'border border-black px-2 py-1.5 text-center',
                tanggalMasuk: 'border border-black px-2 py-1.5 text-center',
                alamat: 'border border-black px-2 py-1.5',
                desa: 'border border-black px-2 py-1.5',
                kecamatan: 'border border-black px-2 py-1.5',
                kabupaten: 'border border-black px-2 py-1.5',
                provinsi: 'border border-black px-2 py-1.5',
                kodePos: 'border border-black px-2 py-1.5 text-center',
                sekolahAsal: 'border border-black px-2 py-1.5',
                anakKe: 'border border-black px-1 py-1.5 text-center',
                jumlahSaudara: 'border border-black px-1 py-1.5 text-center',
                tinggiBadan: 'border border-black px-1 py-1.5 text-center',
                beratBadan: 'border border-black px-1 py-1.5 text-center',
            };
            return widthMap[id] || baseClass;
        };

        const renderSingleRow = (s: Santri, i: number) => {
            const currentRombel = settings.rombel.find(r => r.id === s.rombelId);
            const currentKelas = settings.kelas.find(k => k.id === s.kelasId);
            const currentJenjang = settings.jenjang.find(j => j.id === s.jenjangId);
            const wali = s.namaWali || s.namaAyah || s.namaIbu || '-';
            const telepon = s.teleponWali || (s as any).nomorHpWali || s.teleponAyah || s.teleponIbu || '-';
            const alamat = formatAlamat(s.alamat) || '-';
            const valueMap: Record<string, string> = {
                no: String(i + 1),
                nis: s.nis || '-',
                nisn: s.nisn || '-',
                nik: s.nik || '-',
                namaLengkap: s.namaLengkap || '-',
                namaHijrah: s.namaHijrah || '-',
                lp: s.jenisKelamin === 'Laki-laki' ? 'L' : 'P',
                tempatLahir: s.tempatLahir || '-',
                tanggalLahir: s.tanggalLahir ? formatDate(s.tanggalLahir) : '-',
                ttl: `${s.tempatLahir || '-'}, ${s.tanggalLahir ? formatDate(s.tanggalLahir) : '-'}`,
                kewarganegaraan: s.kewarganegaraan || '-',
                ayah: s.namaAyah || '-',
                ibu: s.namaIbu || '-',
                wali,
                telepon,
                teleponAyah: s.teleponAyah || '-',
                teleponIbu: s.teleponIbu || '-',
                teleponWali: s.teleponWali || ((s as any).nomorHpWali || '-'),
                jenjang: currentJenjang?.nama || '-',
                kelas: currentKelas?.nama || '-',
                rombel: currentRombel?.nama || '-',
                status: s.status || '-',
                jenisSantri: s.jenisSantri || '-',
                tanggalMasuk: s.tanggalMasuk ? formatDate(s.tanggalMasuk) : '-',
                alamat,
                desa: s.alamat?.desaKelurahan || '-',
                kecamatan: s.alamat?.kecamatan || '-',
                kabupaten: s.alamat?.kabupatenKota || '-',
                provinsi: s.alamat?.provinsi || '-',
                kodePos: s.alamat?.kodePos || '-',
                sekolahAsal: s.sekolahAsal || '-',
                anakKe: typeof s.anakKe === 'number' ? String(s.anakKe) : '-',
                jumlahSaudara: typeof s.jumlahSaudara === 'number' ? String(s.jumlahSaudara) : '-',
                tinggiBadan: typeof s.tinggiBadan === 'number' ? String(s.tinggiBadan) : '-',
                beratBadan: typeof s.beratBadan === 'number' ? String(s.beratBadan) : '-',
            };
            
            return (
                <tr key={s.id} className="hover:bg-gray-50/50">
                    {activeColumns.map(col => (
                        <td key={col} className={getColumnClass(col)}>
                            {col === 'namaLengkap' ? (
                                <>
                                    <span className="font-semibold">{valueMap[col]}</span>
                                    {s.status === 'Hiatus' && (
                                        <span className="italic text-xs text-red-600 print:text-black print:font-bold border-red-200 border rounded px-1 ml-1 scale-75 inline-block">Hiatus</span>
                                    )}
                                </>
                            ) : (
                                valueMap[col] || '-'
                            )}
                        </td>
                    ))}
                </tr>
            );
        };

        const renderTableHeader = () => (
            <thead className="bg-gray-200 uppercase font-semibold text-xs text-center border-b border-black">
                <tr>
                    {activeColumns.map(col => (
                        <th key={col} className={getColumnClass(col)}>{getColumnLabel(col)}</th>
                    ))}
                </tr>
            </thead>
        );

        // Grouping logic for Daftar Santri
        const groupingMode = options.rombelGrouping || 'rombel';
        let groups: { groupTitle: string; groupMeta: any; items: Santri[] }[] = [];

        if (groupingMode === 'rombel') {
            const rombelMap = new Map<number, Santri[]>();
            const unassigned: Santri[] = [];
            data.forEach(s => {
                if (s.rombelId) {
                    const list = rombelMap.get(s.rombelId) || [];
                    list.push(s);
                    rombelMap.set(s.rombelId, list);
                } else {
                    unassigned.push(s);
                }
            });

            rombelMap.forEach((items, rombelId) => {
                const rombelObj = settings.rombel.find(r => r.id === rombelId);
                const kelasObj = rombelObj ? settings.kelas.find(k => k.id === rombelObj.kelasId) : undefined;
                const jenjangObj = kelasObj ? settings.jenjang.find(j => j.id === kelasObj.jenjangId) : undefined;
                const waliKelasObj = rombelObj?.waliKelasId ? settings.tenagaPengajar.find(tp => tp.id === rombelObj.waliKelasId) : undefined;

                groups.push({
                    groupTitle: rombelObj?.nama ? `Rombel: ${rombelObj.nama}` : `Rombel ID ${rombelId}`,
                    groupMeta: {
                        ...meta,
                        jenjang: jenjangObj?.nama || meta.jenjang,
                        kelas: kelasObj?.nama || meta.kelas,
                        rombel: rombelObj?.nama || meta.rombel,
                        waliKelas: waliKelasObj?.nama || meta.waliKelas,
                    },
                    items
                });
            });

            if (unassigned.length > 0) {
                groups.push({
                    groupTitle: 'Tanpa Rombel',
                    groupMeta: meta,
                    items: unassigned
                });
            }
        } else if (groupingMode === 'kelas') {
            const kelasMap = new Map<number, Santri[]>();
            const unassigned: Santri[] = [];
            data.forEach(s => {
                if (s.kelasId) {
                    const list = kelasMap.get(s.kelasId) || [];
                    list.push(s);
                    kelasMap.set(s.kelasId, list);
                } else {
                    unassigned.push(s);
                }
            });

            kelasMap.forEach((items, kelasId) => {
                const kelasObj = settings.kelas.find(k => k.id === kelasId);
                const jenjangObj = kelasObj ? settings.jenjang.find(j => j.id === kelasObj.jenjangId) : undefined;
                groups.push({
                    groupTitle: kelasObj?.nama ? `Kelas: ${kelasObj.nama}` : `Kelas ID ${kelasId}`,
                    groupMeta: {
                        ...meta,
                        jenjang: jenjangObj?.nama || meta.jenjang,
                        kelas: kelasObj?.nama || meta.kelas,
                        rombel: 'Semua Rombel',
                    },
                    items
                });
            });

            if (unassigned.length > 0) {
                groups.push({ groupTitle: 'Tanpa Kelas', groupMeta: meta, items: unassigned });
            }
        } else if (groupingMode === 'jenjang') {
            const jenjangMap = new Map<number, Santri[]>();
            const unassigned: Santri[] = [];
            data.forEach(s => {
                if (s.jenjangId) {
                    const list = jenjangMap.get(s.jenjangId) || [];
                    list.push(s);
                    jenjangMap.set(s.jenjangId, list);
                } else {
                    unassigned.push(s);
                }
            });

            jenjangMap.forEach((items, jenjangId) => {
                const jenjangObj = settings.jenjang.find(j => j.id === jenjangId);
                groups.push({
                    groupTitle: jenjangObj?.nama ? `Jenjang: ${jenjangObj.nama}` : `Jenjang ID ${jenjangId}`,
                    groupMeta: {
                        ...meta,
                        jenjang: jenjangObj?.nama || meta.jenjang,
                        kelas: 'Semua Kelas',
                        rombel: 'Semua Rombel',
                    },
                    items
                });
            });

            if (unassigned.length > 0) {
                groups.push({ groupTitle: 'Tanpa Jenjang', groupMeta: meta, items: unassigned });
            }
        } else if (groupingMode === 'jenisSantri') {
            const jenisMap = new Map<string, Santri[]>();
            data.forEach(s => {
                const jenis = s.jenisSantri || 'Lainnya';
                const list = jenisMap.get(jenis) || [];
                list.push(s);
                jenisMap.set(jenis, list);
            });

            jenisMap.forEach((items, jenisName) => {
                groups.push({
                    groupTitle: `Jenis Santri: ${jenisName}`,
                    groupMeta: { ...meta, agenda: `Kategori ${jenisName}` },
                    items
                });
            });
        } else {
            // No grouping (flat list)
            groups = [{
                groupTitle: '',
                groupMeta: meta,
                items: data
            }];
        }

        if (groups.length === 0) {
            groups = [{ groupTitle: '', groupMeta: meta, items: [] }];
        }

        // Return formatted report pages for each group
        return groups.map((group) => {
            const totalCount = group.items.length;
            const lCount = group.items.filter(s => s.jenisKelamin === 'Laki-laki').length;
            const pCount = group.items.filter(s => s.jenisKelamin === 'Perempuan').length;
            
            // Flexible matching for Mondok (Mukim/Asrama) vs Laju (Non-Mukim/Pulang Pergi)
            const isMondok = (js?: string) => js ? (js.toLowerCase().includes('mondok') || js.toLowerCase().includes('mukim') || js.toLowerCase().includes('asrama')) : false;
            const isLaju = (js?: string) => js ? (js.toLowerCase().includes('laju') || js.toLowerCase().includes('non') || js.toLowerCase().includes('pulang')) : false;

            const mondokCount = group.items.filter(s => isMondok(s.jenisSantri)).length;
            const lajuCount = group.items.filter(s => isLaju(s.jenisSantri)).length;

            const sig1Title = options.rombelSignatory1Title || 'Wali Kelas';
            let sig1Name = '...........................................';
            if (options.rombelSignatory1Id) {
                const found = settings.tenagaPengajar.find(t => t.id === Number(options.rombelSignatory1Id));
                if (found) sig1Name = found.nama;
            } else if (group.groupMeta.waliKelas && group.groupMeta.waliKelas !== '-') {
                sig1Name = group.groupMeta.waliKelas;
            }

            const sig2Title = options.rombelSignatory2Title || 'Kepala Madrasah / Mudir';
            let sig2Name = '...........................................';
            if (options.rombelSignatory2Id) {
                const found = settings.tenagaPengajar.find(t => t.id === Number(options.rombelSignatory2Id));
                if (found) sig2Name = found.nama;
            } else {
                const pimpinan = settings.tenagaPengajar.find(t => t.riwayatJabatan?.some(rj => rj.jabatan?.toLowerCase().includes('mudir') || rj.jabatan?.toLowerCase().includes('kepala') || rj.jabatan?.toLowerCase().includes('pimpinan')));
                if (pimpinan) sig2Name = pimpinan.nama;
            }

            return {
                content: (
                    <div className="font-sans text-black flex flex-col h-full justify-between" style={{ fontSize: '9.5pt' }}>
                        <div>
                            <AcademicHeader settings={settings} title={title} meta={group.groupMeta} />

                            {/* Optional Group Title header if multiple groups */}
                            {groups.length > 1 && group.groupTitle && (
                                <div className="mb-2 px-3 py-1 bg-gray-100 border border-gray-300 rounded font-bold text-sm text-gray-800 flex justify-between items-center">
                                    <span>{group.groupTitle}</span>
                                    <span className="text-xs font-normal text-gray-600">Total: {totalCount} Santri</span>
                                </div>
                            )}

                            {/* Summary Statistics Bar */}
                            {(options.showRombelStats ?? true) && (
                                <div className="mb-3 p-2 bg-gray-50 border border-gray-200 rounded flex flex-wrap items-center justify-between text-xs gap-2">
                                    <div className="flex items-center gap-4">
                                        <span><strong>Total:</strong> {totalCount} Santri</span>
                                        <span><strong>Laki-laki (L):</strong> {lCount}</span>
                                        <span><strong>Perempuan (P):</strong> {pCount}</span>
                                    </div>
                                    <div className="flex items-center gap-4 text-gray-700">
                                        <span><strong>Mondok (Mukim):</strong> {mondokCount}</span>
                                        <span><strong>Laju (Non-Mukim):</strong> {lajuCount}</span>
                                    </div>
                                </div>
                            )}

                            {/* Table */}
                            <table className="w-full text-left border-collapse border border-black text-xs">
                                {renderTableHeader()}
                                <tbody>
                                    {group.items.length > 0 ? (
                                        group.items.map((s, i) => renderSingleRow(s, i))
                                    ) : (
                                        <tr>
                                            <td colSpan={activeColumns.length} className="text-center py-6 text-gray-400 italic border border-black">
                                                Tidak ada santri yang terdaftar dalam kelompok ini.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>

                            {/* Formal Signature Section */}
                            {(options.rombelShowSignatures ?? true) && (
                                <div className="mt-8 pt-4 flex justify-between text-center text-xs" style={{ breakInside: 'avoid' }}>
                                    <div className="w-56">
                                        <p className="font-medium text-gray-700">Mengetahui,</p>
                                        <p className="font-semibold text-gray-900 mt-0.5 mb-14">{sig1Title}</p>
                                        <p className="font-bold underline text-gray-900">{sig1Name}</p>
                                    </div>
                                    <div className="w-56">
                                        <p className="font-medium text-gray-700">Pondok Pesantren, {formatTanggalDokumen(new Date())}</p>
                                        <p className="font-semibold text-gray-900 mt-0.5 mb-14">{sig2Title}</p>
                                        <p className="font-bold underline text-gray-900">{sig2Name}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                        <ReportFooter />
                    </div>
                ),
                orientation
            };
        });
    } else if (type === 'Rapor') {
        title = "LEMBAR PENGAMBILAN DAN PENGEMBALIAN RAPOR";
        orientation = 'portrait';
        tableHeader = (
            <thead className="text-xs uppercase bg-gray-200 text-center">
                <tr><th rowSpan={2} className="p-2 border border-black">No</th><th rowSpan={2} className="p-2 border border-black">NIS</th><th rowSpan={2} className="p-2 border border-black">Nama Lengkap</th><th colSpan={2} className="p-2 border border-black">Pengambilan</th><th colSpan={2} className="p-2 border border-black">Pengumpulan</th></tr>
                <tr><th className="p-2 border border-black font-medium">Tanggal</th><th className="p-2 border border-black font-medium">Tanda Tangan</th><th className="p-2 border border-black font-medium">Tanggal</th><th className="p-2 border border-black font-medium">Tanda Tangan</th></tr>
            </thead>
        );
        tableRow = (s, i) => (
            <tr key={s.id}>
                <td className="p-2 border border-black text-center">{i + 1}</td><td className="p-2 border border-black">{s.nis}</td><td className="p-2 border border-black">{s.namaLengkap} {s.status === 'Hiatus' && <span className="italic text-xs font-normal text-red-600 print:text-black print:font-bold border-red-200 border rounded px-1 ml-1 scale-75 inline-block">Hiatus</span>}</td><td className="p-2 border border-black h-12"></td><td className="p-2 border border-black"></td><td className="p-2 border border-black"></td><td className="p-2 border border-black"></td>
            </tr>
        );
    } else if (type === 'Kedatangan') {
        title = "LEMBAR KEDATANGAN SANTRI";
        orientation = 'portrait';
        (meta as any).agenda = options.agendaKedatangan || '...';
        tableHeader = (
            <thead className="text-xs uppercase bg-gray-200 text-center">
                <tr>
                    <th rowSpan={2} className="px-2 py-2 border border-black align-middle">No</th>
                    <th rowSpan={2} className="px-2 py-2 border border-black align-middle">NIS</th>
                    <th rowSpan={2} className="px-2 py-2 border border-black align-middle" style={{minWidth: '180px'}}>Nama Lengkap</th>
                    <th rowSpan={2} className="px-2 py-2 border border-black align-middle">Rombel / Kamar</th>
                    <th colSpan={2} className="px-2 py-2 border border-black">Waktu Kedatangan</th>
                    <th rowSpan={2} className="px-2 py-2 border border-black align-middle">Paraf</th>
                </tr>
                <tr>
                    <th className="px-2 py-2 border border-black font-medium">Hari, Tanggal</th>
                    <th className="px-2 py-2 border border-black font-medium">Pukul</th>
                </tr>
            </thead>
        );
        tableRow = (s, i) => {
            const rombel = settings.rombel.find(r => r.id === s.rombelId)?.nama || '-';
            const kamar = s.kamarId ? settings.kamar.find(k => k.id === s.kamarId)?.nama : '-';
            return (
                <tr key={s.id}>
                    <td className="px-2 py-2 border border-black text-center">{i + 1}</td>
                    <td className="px-2 py-2 border border-black text-center">{s.nis}</td>
                    <td className="px-2 py-2 border border-black">{s.namaLengkap} {s.status === 'Hiatus' && <span className="italic text-xs font-normal text-red-600 print:text-black print:font-bold border-red-200 border rounded px-1 ml-1 scale-75 inline-block">Hiatus</span>}</td>
                    <td className="px-2 py-2 border border-black text-center text-[10px]">{rombel} / {kamar}</td>
                    <td className="px-2 py-2 border border-black h-9"></td>
                    <td className="px-2 py-2 border border-black h-9"></td>
                    <td className="px-2 py-2 border border-black h-9"></td>
                </tr>
            );
        };
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

export const JurnalMengajarTemplate: React.FC<{ santriList: Santri[]; settings: PondokSettings; options: any }> = ({ santriList, settings, options }) => {
    const rombel = settings.rombel.find(r => r.id === santriList[0]?.rombelId);
    const kelas = rombel ? settings.kelas.find(k => k.id === rombel.kelasId) : undefined;
    const jenjang = kelas ? settings.jenjang.find(j => j.id === kelas.jenjangId) : undefined;
    
    // Convert array to object mapping
    const recordsMap: Record<number, any> = {};
    if (options.jurnalMengajarList) {
         options.jurnalMengajarList.forEach((jurnal: any) => {
             recordsMap[jurnal.id] = jurnal;
         });
    }
    
    const startDate = options.jurnalTanggalFilter || new Date().toISOString().split('T')[0];
    const endDate = options.jurnalEndDate || startDate;
    const selectedMapelId = Number(options.jurnalMapelFilter || 0) || null;

    const filteredRecords = (options.jurnalMengajarList || [])
        .filter((j: any) => j.rombelId === rombel?.id)
        .filter((j: any) => j.tanggal >= startDate && j.tanggal <= endDate)
        .filter((j: any) => selectedMapelId ? j.mataPelajaranId === selectedMapelId : true)
        .sort((a: any, b: any) => {
            if (a.tanggal !== b.tanggal) return a.tanggal.localeCompare(b.tanggal);
            return (a.jamPelajaranIds?.[0] || 0) - (b.jamPelajaranIds?.[0] || 0);
        });

    const selectedMapelName = selectedMapelId
        ? settings.mataPelajaran.find(m => m.id === selectedMapelId)?.nama || '-'
        : 'Semua Mata Pelajaran';


    return (
        <div className="font-sans text-black flex flex-col h-full justify-between" style={{ fontSize: '10pt' }}>
            <div>
                 <AcademicHeader settings={settings} title={`JURNAL MENGAJAR (AGENDA KELAS)`} meta={{ jenjang: jenjang?.nama, kelas: kelas?.nama, rombel: rombel?.nama, tahunAjaran: options.tahunAjaran, semester: options.semester }} />
                 
                 <div className="mb-4">
                     <p className="font-bold">Periode: {formatDate(startDate)} s/d {formatDate(endDate)}</p>
                     <p className="text-xs">Mapel: {selectedMapelName}</p>
                 </div>

                 <table className="w-full border-collapse border border-black text-xs text-left">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="border border-black p-2 w-10 text-center">Jam</th>
                            <th className="border border-black p-2 w-32">Mata Pelajaran</th>
                            <th className="border border-black p-2 w-32">Guru Pengajar</th>
                            <th className="border border-black p-2">Materi / Kompetensi Dasar</th>
                            <th className="border border-black p-2 w-48">Catatan Kejadian</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredRecords.length > 0 ? filteredRecords.map((r: any) => {
                             const guru = settings.tenagaPengajar.find(t => t.id === r.guruId);
                             const mapel = settings.mataPelajaran.find(m => m.id === r.mataPelajaranId);
                             const tipe = r.tipeEntri || (r.mataPelajaranId && r.sesiEkstra?.length ? 'campuran' : r.sesiEkstra?.length ? 'ekstra' : 'kbm');
                             return (
                                 <tr key={r.id}>
                                     <td className="border border-black p-2 text-center align-top">
                                        <div>{r.jamPelajaranIds?.join(', ') || '-'}</div>
                                        <div className="text-[10px] text-gray-600 mt-1">{formatDate(r.tanggal)}</div>
                                     </td>
                                     <td className="border border-black p-2 font-semibold align-top">
                                        {mapel?.nama || 'Kegiatan Non-Mapel'}
                                        <div className="text-[10px] text-gray-600 mt-0.5 uppercase">{tipe}</div>
                                     </td>
                                     <td className="border border-black p-2 align-top">{guru?.nama}</td>
                                     <td className="border border-black p-2 whitespace-pre-wrap align-top">{r.kompetensiMateri}</td>
                                     <td className="border border-black p-2 whitespace-pre-wrap italic align-top">{r.catatanKejadian || '-'}</td>
                                 </tr>
                             )
                        }) : (
                            <tr><td colSpan={5} className="border border-black p-4 text-center italic text-gray-500">Tidak ada data jurnal mengajar pada periode/filter ini.</td></tr>
                        )}
                    </tbody>
                 </table>
            </div>
            <ReportFooter />
        </div>
    )
}

export const KesehatanRekapTemplate: React.FC<{ santriList: Santri[]; settings: PondokSettings; options: any }> = ({ santriList, settings, options }) => {
    const start = new Date(options.kesehatanStartDate);
    const end = new Date(options.kesehatanEndDate + 'T23:59:59');
    
    const recordsInRange = (options.kesehatanRecords || []).filter((r: any) => {
        const d = new Date(r.tanggal);
        return d >= start && d <= end;
    }).sort((a: any, b: any) => b.tanggal.localeCompare(a.tanggal));

    return (
        <div className="font-sans text-black flex flex-col h-full justify-between" style={{ fontSize: '10pt' }}>
            <div>
                 <PrintHeader settings={settings} title={`REKAPITULASI LAYANAN KESEHATAN (UKP)`} />
                 <div className="mb-4">
                     <p className="font-bold text-center">Periode: {formatDate(options.kesehatanStartDate)} s/d {formatDate(options.kesehatanEndDate)}</p>
                 </div>
                 <table className="w-full border-collapse border border-black text-xs text-left">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="border border-black p-2 w-10 text-center">No</th>
                            <th className="border border-black p-2 w-24">Tanggal</th>
                            <th className="border border-black p-2 w-40">Nama Santri</th>
                            <th className="border border-black p-2">Keluhan / Diagnosa</th>
                            <th className="border border-black p-2">Tindakan / Resep</th>
                            <th className="border border-black p-2 w-24">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {recordsInRange.length > 0 ? recordsInRange.map((r: any, idx: number) => {
                             const santri = santriList?.find((s: any) => s.id === r.santriId);
                             return (
                                 <tr key={r.id}>
                                     <td className="border border-black p-2 text-center">{idx + 1}</td>
                                     <td className="border border-black p-2">{formatDate(r.tanggal)}</td>
                                     <td className="border border-black p-2 font-bold">{santri?.namaLengkap || 'ID: ' + r.santriId}</td>
                                     <td className="border border-black p-2">
                                         <div className="font-bold">Keluhan: {r.keluhan}</div>
                                         <div className="italic">Diagnosa: {r.diagnosa}</div>
                                     </td>
                                     <td className="border border-black p-2">
                                         <div>{r.tindakan}</div>
                                         {r.resep && r.resep.length > 0 && (
                                             <div className="mt-1 pt-1 border-t border-gray-200">
                                                 <span className="font-bold">Resep:</span> {r.resep.map((it: any) => `${it.namaObat} (${it.jumlah})`).join(', ')}
                                             </div>
                                         )}
                                     </td>
                                     <td className="border border-black p-2 text-center">{r.status}</td>
                                 </tr>
                             )
                        }) : (
                            <tr><td colSpan={6} className="border border-black p-4 text-center italic text-gray-500">Tidak ada data rekam kesehatan ditemukan pada periode tersebut.</td></tr>
                        )}
                    </tbody>
                 </table>
            </div>
            <ReportFooter />
        </div>
    );
};

export const KonselingRekapTemplate: React.FC<{ santriList: Santri[]; settings: PondokSettings; options: any }> = ({ santriList, settings, options }) => {
    const start = new Date(options.bkStartDate);
    const end = new Date(options.bkEndDate + 'T23:59:59');
    
    const recordsInRange = (options.bkSessions || []).filter((r: any) => {
        const d = new Date(r.tanggal);
        return d >= start && d <= end;
    }).sort((a: any, b: any) => b.tanggal.localeCompare(a.tanggal));

    return (
        <div className="font-sans text-black flex flex-col h-full justify-between" style={{ fontSize: '10pt' }}>
            <div>
                 <PrintHeader settings={settings} title={`REKAPITULASI BIMBINGAN & KONSELING (BK)`} />
                 <div className="mb-4">
                     <p className="font-bold text-center">Periode: {formatDate(options.bkStartDate)} s/d {formatDate(options.bkEndDate)}</p>
                 </div>
                 <table className="w-full border-collapse border border-black text-xs text-left">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="border border-black p-2 w-10 text-center">No</th>
                            <th className="border border-black p-2 w-24">Tanggal</th>
                            <th className="border border-black p-2 w-40">Nama Santri</th>
                            <th className="border border-black p-2 w-24">Kategori</th>
                            <th className="border border-black p-2">Masalah / Keluhan</th>
                            <th className="border border-black p-2">Penanganan / Hasil</th>
                            <th className="border border-black p-2 w-20">Privasi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {recordsInRange.length > 0 ? recordsInRange.map((r: any, idx: number) => {
                             const santri = santriList?.find((s: any) => s.id === r.santriId);
                             return (
                                 <tr key={r.id}>
                                     <td className="border border-black p-2 text-center">{idx + 1}</td>
                                     <td className="border border-black p-2">{formatDate(r.tanggal)}</td>
                                     <td className="border border-black p-2 font-bold">{santri?.namaLengkap || 'ID: ' + r.santriId}</td>
                                     <td className="border border-black p-2 text-center">{r.kategori}</td>
                                     <td className="border border-black p-2">{r.keluhan}</td>
                                     <td className="border border-black p-2">
                                         <div>{r.penanganan}</div>
                                         {r.hasil && <div className="mt-1 pt-1 border-t border-gray-200 italic font-bold">Hasil: {r.hasil}</div>}
                                     </td>
                                     <td className="border border-black p-2 text-center">
                                         <span className={`px-1 rounded ${r.privasi === 'Rahasia' ? 'bg-yellow-100' : r.privasi === 'Sangat Rahasia' ? 'bg-red-100 text-red-700' : ''}`}>
                                            {r.privasi}
                                         </span>
                                     </td>
                                 </tr>
                             )
                        }) : (
                            <tr><td colSpan={7} className="border border-black p-4 text-center italic text-gray-500">Tidak ada data bimbingan konseling ditemukan pada periode tersebut.</td></tr>
                        )}
                    </tbody>
                 </table>
            </div>
            <ReportFooter />
        </div>
    );
};
