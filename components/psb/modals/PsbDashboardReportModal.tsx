import React, { useMemo, useRef } from 'react';
import { Pendaftar, PondokSettings, PsbConfig, PendaftarStatus } from '../../../types';

interface PsbDashboardReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    pendaftarList: Pendaftar[];
    settings: PondokSettings;
    config: PsbConfig;
}

export const PsbDashboardReportModal: React.FC<PsbDashboardReportModalProps> = ({
    isOpen,
    onClose,
    pendaftarList,
    settings,
    config,
}) => {
    const printRef = useRef<HTMLDivElement>(null);

    const totalPendaftar = pendaftarList.length;
    const todayStr = new Date().toISOString().split('T')[0];
    const pendaftarHariIni = pendaftarList.filter(p => p.tanggalDaftar && p.tanggalDaftar.startsWith(todayStr)).length;

    // Per Jenjang Stats
    const statsByJenjang = useMemo(() => {
        return settings.jenjang.map(j => {
            const pendaftarInJenjang = pendaftarList.filter(p => p.jenjangId === j.id);
            const l = pendaftarInJenjang.filter(p => p.jenisKelamin === 'Laki-laki').length;
            const p = pendaftarInJenjang.filter(p => p.jenisKelamin === 'Perempuan').length;
            const total = pendaftarInJenjang.length;
            const percent = totalPendaftar > 0 ? (total / totalPendaftar) * 100 : 0;
            return {
                id: j.id,
                name: j.nama,
                total,
                l,
                p,
                percent: percent.toFixed(1)
            };
        });
    }, [settings.jenjang, pendaftarList, totalPendaftar]);

    // Status Counts
    const statusStats = useMemo(() => {
        const counts: Record<PendaftarStatus, number> = {
            'Baru': 0,
            'Verifikasi Berkas': 0,
            'Ujian Masuk': 0,
            'Cadangan': 0,
            'Diterima': 0,
            'Ditolak': 0
        };
        pendaftarList.forEach(p => {
            if (counts[p.status] !== undefined) {
                counts[p.status]++;
            }
        });
        return counts;
    }, [pendaftarList]);

    // Jalur Pendaftaran
    const jalurStats = useMemo(() => {
        const counts: Record<string, number> = {};
        pendaftarList.forEach(p => {
            const j = p.jalurPendaftaran || 'Reguler';
            counts[j] = (counts[j] || 0) + 1;
        });
        return Object.entries(counts).map(([name, count]) => ({
            name,
            count,
            percent: totalPendaftar > 0 ? ((count / totalPendaftar) * 100).toFixed(1) : '0'
        }));
    }, [pendaftarList, totalPendaftar]);

    // 7-day trend
    const dailyTrend = useMemo(() => {
        const days = [];
        const today = new Date();
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            const dateIso = d.toISOString().split('T')[0];
            const count = pendaftarList.filter(p => p.tanggalDaftar && p.tanggalDaftar.startsWith(dateIso)).length;
            days.push({
                dateFormatted: d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' }),
                count
            });
        }
        return days;
    }, [pendaftarList]);

    // Gender breakdown
    const totalLaki = pendaftarList.filter(p => p.jenisKelamin === 'Laki-laki').length;
    const totalPerempuan = pendaftarList.filter(p => p.jenisKelamin === 'Perempuan').length;
    const percentLaki = totalPendaftar > 0 ? ((totalLaki / totalPendaftar) * 100).toFixed(1) : '0';
    const percentPerempuan = totalPendaftar > 0 ? ((totalPerempuan / totalPendaftar) * 100).toFixed(1) : '0';

    const acceptanceRate = totalPendaftar > 0 ? ((statusStats.Diterima / totalPendaftar) * 100).toFixed(1) : '0';

    if (!isOpen) return null;

    const handlePrint = () => {
        window.print();
    };

    const todayFormatted = new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    return (
        <div className="fixed inset-0 bg-black/70 z-[90] flex justify-center items-center p-2 sm:p-4 overflow-y-auto print-modal-target">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[96vh] overflow-hidden my-auto border border-gray-200 print-modal-card">
                
                {/* Modal Header */}
                <div className="p-4 border-b flex justify-between items-center bg-slate-900 text-white no-print">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-teal-600/30 border border-teal-500/40 flex items-center justify-center text-teal-300">
                            <i className="bi bi-file-earmark-bar-graph-fill text-2xl"></i>
                        </div>
                        <div>
                            <h3 className="text-base sm:text-lg font-bold">Cetak Laporan Rekapitulasi Dashboard PSB</h3>
                            <p className="text-xs text-slate-300">Laporan cetak resmi format tabel data &amp; analitik statistik pendaftaran</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handlePrint}
                            className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all shadow-sm active:scale-95"
                        >
                            <i className="bi bi-printer-fill text-sm"></i>
                            <span>Cetak Laporan / Simpan PDF</span>
                        </button>
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                            title="Tutup Modal"
                        >
                            <i className="bi bi-x-lg text-lg"></i>
                        </button>
                    </div>
                </div>

                {/* Document View */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100 flex justify-center">
                    <div
                        ref={printRef}
                        className="bg-white p-6 sm:p-10 shadow-lg border border-gray-200 w-full max-w-[210mm] text-gray-900 text-xs sm:text-sm print:border-none print:shadow-none print:p-0 print:m-0"
                    >
                        {/* KOP SURAT */}
                        <div className="border-b-2 border-double border-gray-900 pb-3 mb-4 text-center relative">
                            {(settings.logoPonpesUrl || settings.logoYayasanUrl) && (
                                <img
                                    src={settings.logoPonpesUrl || settings.logoYayasanUrl}
                                    alt="Logo Pondok"
                                    className="w-16 h-16 object-contain absolute left-0 top-0 hidden sm:block print:block"
                                    referrerPolicy="no-referrer"
                                />
                            )}
                            <div className="sm:px-16">
                                <h2 className="font-serif font-black text-lg sm:text-xl uppercase tracking-wide text-gray-900">
                                    {settings.namaPonpes || 'PONDOK PESANTREN'}
                                </h2>
                                <h3 className="font-bold text-xs sm:text-sm uppercase tracking-wider text-teal-800">
                                    PANITIA PENERIMAAN SANTRI BARU (PSB)
                                </h3>
                                <p className="text-[11px] text-gray-600 mt-0.5">
                                    {settings.alamat || 'Alamat Lembaga Pondok Pesantren'}
                                    {settings.telepon ? ` • Telp/WA: ${settings.telepon}` : ''}
                                    {settings.email ? ` • Email: ${settings.email}` : ''}
                                </p>
                            </div>
                        </div>

                        {/* JUDUL LAPORAN */}
                        <div className="text-center my-4 pb-2 border-b border-gray-200">
                            <h4 className="font-bold text-sm sm:text-base uppercase tracking-tight text-gray-900">
                                LAPORAN EKSEKUTIF REKAPITULASI PENERIMAAN SANTRI BARU
                            </h4>
                            <p className="text-xs text-gray-600 mt-0.5">
                                Tahun Ajaran: <strong>{config.tahunAjaranAktif || '2025/2026'}</strong> • Dicetak: {todayFormatted}
                            </p>
                        </div>

                        {/* TABEL 1: IKHTISAR METRIK UTAMA */}
                        <div className="mb-5">
                            <div className="bg-slate-800 text-white px-3 py-1 rounded-t font-bold text-xs flex items-center justify-between">
                                <span>I. IKHTISAR INDIKATOR UTAMA PENDAFTARAN</span>
                                <span className="text-[10px] font-mono text-teal-300">Ringkasan Global</span>
                            </div>
                            <table className="w-full border-collapse border border-slate-800 text-xs">
                                <tbody>
                                    <tr className="border-b border-gray-300">
                                        <td className="p-2 bg-gray-50 font-bold w-1/3 border-r border-gray-300">Total Pendaftar Terdaftar</td>
                                        <td className="p-2 font-mono font-bold text-slate-900">{totalPendaftar} Orang</td>
                                        <td className="p-2 bg-gray-50 font-bold w-1/4 border-r border-gray-300">Pendaftar Hari Ini</td>
                                        <td className="p-2 font-mono font-bold text-blue-700">{pendaftarHariIni} Orang</td>
                                    </tr>
                                    <tr className="border-b border-gray-300">
                                        <td className="p-2 bg-gray-50 font-bold border-r border-gray-300">Santri Diterima (Lolos Seleksi)</td>
                                        <td className="p-2 font-mono font-bold text-emerald-700">{statusStats.Diterima} Orang ({acceptanceRate}%)</td>
                                        <td className="p-2 bg-gray-50 font-bold border-r border-gray-300">Santri Cadangan</td>
                                        <td className="p-2 font-mono font-bold text-amber-700">{statusStats.Cadangan} Orang</td>
                                    </tr>
                                    <tr className="border-b border-gray-300">
                                        <td className="p-2 bg-gray-50 font-bold border-r border-gray-300">Sedang Proses Ujian &amp; Berkas</td>
                                        <td className="p-2 font-mono font-bold text-purple-700">{statusStats['Baru'] + statusStats['Verifikasi Berkas'] + statusStats['Ujian Masuk']} Orang</td>
                                        <td className="p-2 bg-gray-50 font-bold border-r border-gray-300">Tidak Diterima / Ditolak</td>
                                        <td className="p-2 font-mono font-bold text-red-700">{statusStats.Ditolak} Orang</td>
                                    </tr>
                                    <tr>
                                        <td className="p-2 bg-gray-50 font-bold border-r border-gray-300">Komposisi Santri (Laki-laki / Perempuan)</td>
                                        <td colSpan={3} className="p-2 font-semibold text-gray-700">
                                            Santri Putra: <strong className="text-teal-900">{totalLaki}</strong> ({percentLaki}%) • 
                                            Santri Putri: <strong className="text-pink-900 ml-1">{totalPerempuan}</strong> ({percentPerempuan}%)
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* TABEL 2: REKAPITULASI BERDASARKAN JENJANG PENDIDIKAN */}
                        <div className="mb-5">
                            <div className="bg-teal-800 text-white px-3 py-1 rounded-t font-bold text-xs flex items-center justify-between">
                                <span>II. DISTRIBUSI PENDAFTAR PER JENJANG PENDIDIKAN</span>
                                <span className="text-[10px] font-mono text-teal-200">Rincian Gender &amp; Porsi</span>
                            </div>
                            <table className="w-full border-collapse border border-teal-800 text-xs text-left">
                                <thead>
                                    <tr className="bg-teal-50 border-b border-teal-200 text-teal-950 font-bold">
                                        <th className="p-1.5 text-center w-10 border-r border-teal-200">No</th>
                                        <th className="p-1.5 border-r border-teal-200">Jenjang Pendidikan</th>
                                        <th className="p-1.5 text-center w-28 border-r border-teal-200">Santri Putra (L)</th>
                                        <th className="p-1.5 text-center w-28 border-r border-teal-200">Santri Putri (P)</th>
                                        <th className="p-1.5 text-center w-28 border-r border-teal-200">Total Pendaftar</th>
                                        <th className="p-1.5 text-center w-24">Persentase</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {statsByJenjang.map((j, idx) => (
                                        <tr key={j.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-teal-50/20'}>
                                            <td className="p-1.5 text-center border-t border-r border-gray-300">{idx + 1}</td>
                                            <td className="p-1.5 font-bold border-t border-r border-gray-300">{j.name}</td>
                                            <td className="p-1.5 text-center font-mono border-t border-r border-gray-300">{j.l}</td>
                                            <td className="p-1.5 text-center font-mono border-t border-r border-gray-300">{j.p}</td>
                                            <td className="p-1.5 text-center font-mono font-bold border-t border-r border-gray-300 text-teal-900">{j.total}</td>
                                            <td className="p-1.5 text-center font-mono border-t border-gray-300 font-semibold">{j.percent}%</td>
                                        </tr>
                                    ))}
                                    <tr className="bg-teal-100/60 font-bold border-t-2 border-teal-800 text-teal-950">
                                        <td colSpan={2} className="p-1.5 text-right uppercase border-r border-teal-300">Total Akumulasi</td>
                                        <td className="p-1.5 text-center font-mono border-r border-teal-300">{totalLaki}</td>
                                        <td className="p-1.5 text-center font-mono border-r border-teal-300">{totalPerempuan}</td>
                                        <td className="p-1.5 text-center font-mono font-black border-r border-teal-300 text-teal-950">{totalPendaftar}</td>
                                        <td className="p-1.5 text-center font-mono">100%</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* TABEL 3: REKAPITULASI STATUS TAHAPAN SELEKSI */}
                        <div className="mb-5">
                            <div className="bg-slate-700 text-white px-3 py-1 rounded-t font-bold text-xs flex items-center justify-between">
                                <span>III. STATUS TAHAPAN SELEKSI CALON SANTRI</span>
                                <span className="text-[10px] font-mono text-slate-300">Progress Pendaftaran</span>
                            </div>
                            <table className="w-full border-collapse border border-slate-700 text-xs text-left">
                                <thead>
                                    <tr className="bg-slate-100 border-b border-slate-300 font-bold text-slate-800">
                                        <th className="p-1.5 text-center w-10 border-r border-slate-300">No</th>
                                        <th className="p-1.5 border-r border-slate-300">Status Tahapan</th>
                                        <th className="p-1.5 text-center w-28 border-r border-slate-300">Jumlah Santri</th>
                                        <th className="p-1.5 text-center w-24 border-r border-slate-300">Persentase</th>
                                        <th className="p-1.5">Keterangan / Alur Lanjutan</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[
                                        { status: 'Baru', count: statusStats['Baru'], ket: 'Formulir masuk, menunggu kelengkapan berkas' },
                                        { status: 'Verifikasi Berkas', count: statusStats['Verifikasi Berkas'], ket: 'Dokumen fisik/digital dalam proses validasi panitia' },
                                        { status: 'Ujian Masuk', count: statusStats['Ujian Masuk'], ket: 'Calon santri telah memiliki kartu ujian & mengikuti tes' },
                                        { status: 'Cadangan', count: statusStats['Cadangan'], ket: 'Menunggu kuota dari santri lulus yang tidak daftar ulang' },
                                        { status: 'Diterima', count: statusStats['Diterima'], ket: 'Resmi diterima, proses pembayaran & daftar ulang' },
                                        { status: 'Ditolak', count: statusStats['Ditolak'], ket: 'Tidak memenuhi kriteria passing grade / daya tampung penuh' },
                                    ].map((row, idx) => {
                                        const p = totalPendaftar > 0 ? ((row.count / totalPendaftar) * 100).toFixed(1) : '0';
                                        return (
                                            <tr key={row.status} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                                <td className="p-1.5 text-center border-t border-r border-gray-300">{idx + 1}</td>
                                                <td className="p-1.5 font-bold border-t border-r border-gray-300">{row.status}</td>
                                                <td className="p-1.5 text-center font-mono font-bold border-t border-r border-gray-300">{row.count}</td>
                                                <td className="p-1.5 text-center font-mono border-t border-r border-gray-300">{p}%</td>
                                                <td className="p-1.5 text-gray-600 border-t border-gray-300">{row.ket}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* TABEL 4 & 5: DUA KOLOM: JALUR PENDAFTARAN & TREN 7 HARI */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5 break-inside-avoid">
                            {/* Jalur Pendaftaran */}
                            <div>
                                <div className="bg-emerald-800 text-white px-3 py-1 rounded-t font-bold text-xs">
                                    IV. Jalur Pendaftaran
                                </div>
                                <table className="w-full border-collapse border border-emerald-800 text-xs text-left">
                                    <thead>
                                        <tr className="bg-emerald-50 border-b border-emerald-200 font-bold text-emerald-950">
                                            <th className="p-1.5 border-r border-emerald-200">Nama Jalur</th>
                                            <th className="p-1.5 text-center w-16 border-r border-emerald-200">Jumlah</th>
                                            <th className="p-1.5 text-center w-16">Porsi</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {jalurStats.map((item, i) => (
                                            <tr key={i} className="border-t border-gray-200">
                                                <td className="p-1.5 border-r border-gray-200 font-semibold">{item.name}</td>
                                                <td className="p-1.5 text-center font-mono border-r border-gray-200 font-bold">{item.count}</td>
                                                <td className="p-1.5 text-center font-mono">{item.percent}%</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Tren 7 Hari Terakhir */}
                            <div>
                                <div className="bg-blue-800 text-white px-3 py-1 rounded-t font-bold text-xs">
                                    V. Tren Pendaftar 7 Hari Terakhir
                                </div>
                                <table className="w-full border-collapse border border-blue-800 text-xs text-left">
                                    <thead>
                                        <tr className="bg-blue-50 border-b border-blue-200 font-bold text-blue-950">
                                            <th className="p-1.5 border-r border-blue-200">Hari &amp; Tanggal</th>
                                            <th className="p-1.5 text-center w-20">Pendaftar Masuk</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {dailyTrend.map((day, idx) => (
                                            <tr key={idx} className="border-t border-gray-200">
                                                <td className="p-1.5 border-r border-gray-200">{day.dateFormatted}</td>
                                                <td className="p-1.5 text-center font-mono font-bold text-blue-900">{day.count}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* PENGESAHAN LAPORAN */}
                        <div className="mt-8 pt-4 border-t border-gray-300 break-inside-avoid">
                            <div className="text-right text-gray-800 mb-4 text-[11px] sm:text-xs">
                                Dicetak di: {settings.alamat?.split(',')[0] || 'Posko PSB Pesantren'}<br />
                                Tanggal: {todayFormatted}
                            </div>
                            <div className="grid grid-cols-2 gap-8 text-center text-xs">
                                <div>
                                    <p className="font-semibold text-gray-700 mb-16">
                                        Koordinator Administrator PSB,
                                    </p>
                                    <p className="font-bold text-gray-900 underline uppercase">
                                        ( ............................................ )
                                    </p>
                                    <p className="text-[10px] text-gray-500 mt-0.5">Admin Pendataan PSB</p>
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-700 mb-16">
                                        Mengetahui,<br />Pimpinan Pondok Pesantren
                                    </p>
                                    <p className="font-bold text-gray-900 underline uppercase">
                                        {settings.tenagaPengajar?.find(t => t.id === settings.mudirAamId)?.nama || '( ............................................ )'}
                                    </p>
                                    <p className="text-[10px] text-gray-500 mt-0.5">Pengasuh / Mudir 'Aam</p>
                                </div>
                            </div>
                        </div>

                        {/* FOOTER NOTA */}
                        <div className="mt-6 pt-2 border-t border-dashed border-gray-300 text-[10px] text-gray-400 flex justify-between">
                            <span>Sistem Informasi Manajemen Pesantren (eSantri Web)</span>
                            <span>Laporan Resmi Statistik PSB</span>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};
