import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Pendaftar, PondokSettings, PsbConfig, PendaftarStatus } from '../../../types';
import { printToPdfNative } from '../../../utils/pdfGenerator';

interface PsbDashboardReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    pendaftarList: Pendaftar[];
    settings: PondokSettings;
    config: PsbConfig;
    onSaveConfig?: (newConfig: PsbConfig) => void;
}

export const PsbDashboardReportModal: React.FC<PsbDashboardReportModalProps> = ({
    isOpen,
    onClose,
    pendaftarList,
    settings,
    config,
    onSaveConfig,
}) => {
    const printRef = useRef<HTMLDivElement>(null);

    // Isolate print styles on document body when modal is mounted
    useEffect(() => {
        if (isOpen) {
            document.body.classList.add('modal-print-open');
            return () => {
                document.body.classList.remove('modal-print-open');
            };
        }
    }, [isOpen]);

    // Admin & Pimpinan Signature State
    const [adminName, setAdminName] = useState(() => {
        return config.namaAdminPsb || localStorage.getItem('psb_signature_admin_name') || '';
    });
    const [adminJabatan, setAdminJabatan] = useState(() => {
        return config.jabatanAdminPsb || localStorage.getItem('psb_signature_admin_jabatan') || 'Koordinator Administrator PSB';
    });
    const [pimpinanName, setPimpinanName] = useState(() => {
        return config.namaPimpinanPsb || settings.tenagaPengajar?.find(t => t.id === settings.mudirAamId)?.nama || '';
    });
    const [pimpinanJabatan, setPimpinanJabatan] = useState(() => {
        return config.jabatanPimpinanPsb || 'Pimpinan Pondok Pesantren';
    });
    const [tempatCetak, setTempatCetak] = useState(() => {
        return config.kotaSuratPsb || settings.alamat?.split(',')[0] || 'Posko PSB Pesantren';
    });

    const [showSignatureSettings, setShowSignatureSettings] = useState(false);
    const [zoomLevel, setZoomLevel] = useState<'fit' | '100' | '90' | '80'>('100');
    const [isSavedMessage, setIsSavedMessage] = useState(false);

    // Sync if config changes
    useEffect(() => {
        if (config.namaAdminPsb) setAdminName(config.namaAdminPsb);
        if (config.jabatanAdminPsb) setAdminJabatan(config.jabatanAdminPsb);
        if (config.namaPimpinanPsb) setPimpinanName(config.namaPimpinanPsb);
        if (config.jabatanPimpinanPsb) setPimpinanJabatan(config.jabatanPimpinanPsb);
        if (config.kotaSuratPsb) setTempatCetak(config.kotaSuratPsb);
    }, [config]);

    const handleSaveDefaultSignature = () => {
        try {
            localStorage.setItem('psb_signature_admin_name', adminName);
            localStorage.setItem('psb_signature_admin_jabatan', adminJabatan);
        } catch {
            // Ignore storage quota
        }

        if (onSaveConfig) {
            onSaveConfig({
                ...config,
                namaAdminPsb: adminName,
                jabatanAdminPsb: adminJabatan,
                namaPimpinanPsb: pimpinanName,
                jabatanPimpinanPsb: pimpinanJabatan,
                kotaSuratPsb: tempatCetak,
            });
        }

        setIsSavedMessage(true);
        setTimeout(() => setIsSavedMessage(false), 2500);
    };

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
        const taStr = (config.tahunAjaranAktif || 'Aktif').replace(/[\/\\:*?"<>|]/g, '-');
        printToPdfNative(
            'psb-dashboard-report-sheet',
            `Laporan_Rekapitulasi_Dashboard_PSB_TA_${taStr}_${new Date().toISOString().slice(0, 10)}`,
            {
                paperSize: 'A4',
                orientation: 'portrait'
            }
        );
    };

    const todayFormatted = new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    return createPortal(
        <div className="fixed inset-0 bg-black/75 z-[90] flex justify-center items-start sm:items-center p-2 sm:p-4 overflow-y-auto print-modal-target">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col max-h-[96vh] h-[95vh] sm:h-auto overflow-hidden border border-gray-300 print-modal-card">
                
                {/* Modal Header (Screen Only) */}
                <div className="p-3.5 sm:p-4 border-b flex justify-between items-center bg-slate-900 text-white no-print shrink-0">
                    <div className="flex items-center gap-2.5 sm:gap-3">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-teal-600/30 border border-teal-500/40 flex items-center justify-center text-teal-300 shrink-0">
                            <i className="bi bi-file-earmark-bar-graph-fill text-xl sm:text-2xl"></i>
                        </div>
                        <div>
                            <h3 className="text-sm sm:text-base font-bold">Cetak Laporan Rekapitulasi Statistik PSB</h3>
                            <p className="text-[11px] sm:text-xs text-slate-300">Format resmi rekapitulasi data eksekutif untuk pengarsipan dan pelaporan pimpinan</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setShowSignatureSettings(!showSignatureSettings)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border ${
                                showSignatureSettings
                                    ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                                    : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
                            }`}
                            title="Atur Nama Admin & Pimpinan Penandatangan Laporan"
                        >
                            <i className="bi bi-pen-fill text-xs text-amber-300"></i>
                            <span className="hidden sm:inline">{showSignatureSettings ? 'Tutup Pengaturan TTD' : 'Atur Tanda Tangan'}</span>
                            <span className="sm:hidden">TTD</span>
                        </button>
                        <button
                            type="button"
                            onClick={handlePrint}
                            className="px-3 sm:px-4 py-1.5 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 sm:gap-2 transition-all shadow-sm active:scale-95"
                            title="Cetak bersih ke kertas A4 atau simpan PDF"
                        >
                            <i className="bi bi-printer-fill text-xs sm:text-sm"></i>
                            <span>Cetak / PDF</span>
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                            title="Tutup Modal"
                        >
                            <i className="bi bi-x-lg text-base"></i>
                        </button>
                    </div>
                </div>

                {/* Sub Toolbar: Zoom & Controls */}
                <div className="px-3.5 py-2 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs no-print shrink-0">
                    <div className="flex items-center gap-1.5 text-slate-600">
                        <span className="font-semibold text-[11px] text-slate-500">Skala Preview:</span>
                        <div className="inline-flex rounded-lg bg-white border border-slate-300 p-0.5 shadow-2xs">
                            <button
                                type="button"
                                onClick={() => setZoomLevel('fit')}
                                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition ${zoomLevel === 'fit' ? 'bg-teal-700 text-white' : 'text-slate-600 hover:text-slate-900'}`}
                            >
                                Muat (85%)
                            </button>
                            <button
                                type="button"
                                onClick={() => setZoomLevel('90')}
                                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition ${zoomLevel === '90' ? 'bg-teal-700 text-white' : 'text-slate-600 hover:text-slate-900'}`}
                            >
                                90%
                            </button>
                            <button
                                type="button"
                                onClick={() => setZoomLevel('100')}
                                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition ${zoomLevel === '100' ? 'bg-teal-700 text-white' : 'text-slate-600 hover:text-slate-900'}`}
                            >
                                100% (Nyata)
                            </button>
                        </div>
                    </div>
                    <div className="text-[11px] text-slate-500 italic hidden md:block">
                        * Data dokumen dicetak eksklusif tanpa menyertakan tombol menu atau sidebar aplikasi.
                    </div>
                </div>

                {/* Signature Settings Panel (Screen Only) */}
                {showSignatureSettings && (
                    <div className="p-3 sm:p-4 bg-amber-50/95 border-b border-amber-200 no-print transition-all">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <i className="bi bi-person-badge-fill text-amber-700 text-base"></i>
                                <h4 className="font-bold text-xs sm:text-sm text-amber-950">
                                    Pengaturan Nama &amp; Jabatan Penandatangan Laporan PSB
                                </h4>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowSignatureSettings(false)}
                                className="text-amber-800 hover:text-amber-950 p-1 rounded-lg text-xs"
                            >
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                            <div>
                                <label className="block text-[11px] font-bold text-amber-900 mb-1">
                                    Nama Administrator / Koordinator PSB:
                                </label>
                                <input
                                    type="text"
                                    value={adminName}
                                    onChange={(e) => setAdminName(e.target.value)}
                                    placeholder="Contoh: Ustadz Ahmad Zaki, S.Pd.I"
                                    className="w-full bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-amber-900 mb-1">
                                    Jabatan Koordinator PSB:
                                </label>
                                <input
                                    type="text"
                                    value={adminJabatan}
                                    onChange={(e) => setAdminJabatan(e.target.value)}
                                    placeholder="Koordinator Administrator PSB"
                                    className="w-full bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-amber-900 mb-1">
                                    Nama Pimpinan Pondok Pesantren:
                                </label>
                                <input
                                    type="text"
                                    value={pimpinanName}
                                    onChange={(e) => setPimpinanName(e.target.value)}
                                    placeholder="Contoh: KH. Abdullah Faqih"
                                    className="w-full bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-amber-900 mb-1">
                                    Jabatan Pimpinan:
                                </label>
                                <input
                                    type="text"
                                    value={pimpinanJabatan}
                                    onChange={(e) => setPimpinanJabatan(e.target.value)}
                                    placeholder="Pimpinan Pondok Pesantren"
                                    className="w-full bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-amber-900 mb-1">
                                    Kota / Tempat Penetapan:
                                </label>
                                <input
                                    type="text"
                                    value={tempatCetak}
                                    onChange={(e) => setTempatCetak(e.target.value)}
                                    placeholder="Contoh: Jombang"
                                    className="w-full bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                                />
                            </div>

                            <div className="flex items-end">
                                <button
                                    type="button"
                                    onClick={handleSaveDefaultSignature}
                                    className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-1.5 px-3 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                                >
                                    <i className="bi bi-save2"></i>
                                    <span>Simpan Sebagai Default</span>
                                </button>
                            </div>
                        </div>

                        {isSavedMessage && (
                            <div className="mt-2 text-xs font-semibold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                                <i className="bi bi-check-circle-fill text-emerald-600"></i>
                                <span>Pengaturan nama tanda tangan berhasil disimpan sebagai default PSB!</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Document View - Responsive scroll wrapper without vertical clipping */}
                <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto p-3 sm:p-6 md:p-8 bg-slate-200/90 flex flex-col items-center custom-scrollbar print-modal-scroll-wrapper">
                    <div
                        style={{
                            transform: zoomLevel === 'fit' ? 'scale(0.85)' : zoomLevel === '90' ? 'scale(0.9)' : zoomLevel === '80' ? 'scale(0.8)' : 'none',
                            transformOrigin: 'top center'
                        }}
                        className="w-full flex justify-center transition-transform"
                    >
                        <div
                            id="psb-dashboard-report-sheet"
                            ref={printRef}
                            className="bg-white p-6 sm:p-10 shadow-2xl border border-gray-300 w-full max-w-[210mm] min-h-[297mm] text-gray-900 text-xs box-border my-2 shrink-0 print:border-none print:shadow-none print:p-0 print:m-0 print:w-full print:max-w-none print:min-h-0"
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
                            <div className="mb-5 overflow-hidden rounded-t border border-slate-800">
                                <div className="bg-slate-800 text-white px-3 py-1.5 font-bold text-xs flex items-center justify-between">
                                    <span>I. IKHTISAR INDIKATOR UTAMA PENDAFTARAN</span>
                                    <span className="text-[10px] font-mono text-teal-300">Ringkasan Global</span>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full border-collapse text-xs table-fixed min-w-[500px]">
                                        <tbody>
                                            <tr className="border-b border-gray-300">
                                                <td className="p-2 bg-gray-50 font-bold w-1/4 border-r border-gray-300">Total Pendaftar</td>
                                                <td className="p-2 font-mono font-bold text-slate-900 w-1/4 border-r border-gray-300">{totalPendaftar} Orang</td>
                                                <td className="p-2 bg-gray-50 font-bold w-1/4 border-r border-gray-300">Pendaftar Hari Ini</td>
                                                <td className="p-2 font-mono font-bold text-blue-700 w-1/4">{pendaftarHariIni} Orang</td>
                                            </tr>
                                            <tr className="border-b border-gray-300">
                                                <td className="p-2 bg-gray-50 font-bold border-r border-gray-300">Santri Diterima</td>
                                                <td className="p-2 font-mono font-bold text-emerald-700 border-r border-gray-300">{statusStats.Diterima} Orang ({acceptanceRate}%)</td>
                                                <td className="p-2 bg-gray-50 font-bold border-r border-gray-300">Santri Cadangan</td>
                                                <td className="p-2 font-mono font-bold text-amber-700">{statusStats.Cadangan} Orang</td>
                                            </tr>
                                            <tr className="border-b border-gray-300">
                                                <td className="p-2 bg-gray-50 font-bold border-r border-gray-300">Sedang Proses Seleksi</td>
                                                <td className="p-2 font-mono font-bold text-purple-700 border-r border-gray-300">{statusStats['Baru'] + statusStats['Verifikasi Berkas'] + statusStats['Ujian Masuk']} Orang</td>
                                                <td className="p-2 bg-gray-50 font-bold border-r border-gray-300">Ditolak / Gugur</td>
                                                <td className="p-2 font-mono font-bold text-red-700">{statusStats.Ditolak} Orang</td>
                                            </tr>
                                            <tr>
                                                <td className="p-2 bg-gray-50 font-bold border-r border-gray-300">Komposisi Gender</td>
                                                <td colSpan={3} className="p-2 font-semibold text-gray-700">
                                                    Santri Putra: <strong className="text-teal-900">{totalLaki}</strong> ({percentLaki}%) • 
                                                    Santri Putri: <strong className="text-pink-900 ml-1">{totalPerempuan}</strong> ({percentPerempuan}%)
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* TABEL 2: REKAPITULASI BERDASARKAN JENJANG PENDIDIKAN */}
                            <div className="mb-5 overflow-hidden rounded-t border border-teal-800">
                                <div className="bg-teal-800 text-white px-3 py-1.5 font-bold text-xs flex items-center justify-between">
                                    <span>II. DISTRIBUSI PENDAFTAR PER JENJANG PENDIDIKAN</span>
                                    <span className="text-[10px] font-mono text-teal-200">Rincian Gender &amp; Porsi</span>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full border-collapse text-xs text-left min-w-[500px]">
                                        <thead>
                                            <tr className="bg-teal-50 border-b border-teal-200 text-teal-950 font-bold">
                                                <th className="p-1.5 text-center w-8 border-r border-teal-200">No</th>
                                                <th className="p-1.5 border-r border-teal-200">Jenjang Pendidikan</th>
                                                <th className="p-1.5 text-center w-20 border-r border-teal-200">Putra (L)</th>
                                                <th className="p-1.5 text-center w-20 border-r border-teal-200">Putri (P)</th>
                                                <th className="p-1.5 text-center w-24 border-r border-teal-200">Total</th>
                                                <th className="p-1.5 text-center w-20">Persentase</th>
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
                            </div>

                            {/* TABEL 3: REKAPITULASI STATUS TAHAPAN SELEKSI */}
                            <div className="mb-5 overflow-hidden rounded-t border border-slate-700">
                                <div className="bg-slate-700 text-white px-3 py-1.5 font-bold text-xs flex items-center justify-between">
                                    <span>III. STATUS TAHAPAN SELEKSI CALON SANTRI</span>
                                    <span className="text-[10px] font-mono text-slate-300">Progress Pendaftaran</span>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full border-collapse text-xs text-left min-w-[500px]">
                                        <thead>
                                            <tr className="bg-slate-100 border-b border-slate-300 font-bold text-slate-800">
                                                <th className="p-1.5 text-center w-8 border-r border-slate-300">No</th>
                                                <th className="p-1.5 border-r border-slate-300 w-36">Status Tahapan</th>
                                                <th className="p-1.5 text-center w-20 border-r border-slate-300">Jumlah</th>
                                                <th className="p-1.5 text-center w-20 border-r border-slate-300">Persentase</th>
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
                            </div>

                            {/* TABEL 4 & 5: DUA KOLOM: JALUR PENDAFTARAN & TREN 7 HARI */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5 break-inside-avoid">
                                {/* Jalur Pendaftaran */}
                                <div className="overflow-hidden rounded-t border border-emerald-800">
                                    <div className="bg-emerald-800 text-white px-3 py-1.5 font-bold text-xs">
                                        IV. Jalur Pendaftaran
                                    </div>
                                    <table className="w-full border-collapse text-xs text-left">
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
                                <div className="overflow-hidden rounded-t border border-blue-800">
                                    <div className="bg-blue-800 text-white px-3 py-1.5 font-bold text-xs">
                                        V. Tren Pendaftar 7 Hari Terakhir
                                    </div>
                                    <table className="w-full border-collapse text-xs text-left">
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

                            {/* PENGESAHAN LAPORAN (DENGAN NAMA ADMIN & PIMPINAN DARI PENGATURAN) */}
                            <div className="mt-8 pt-4 border-t border-gray-300 break-inside-avoid">
                                <div className="text-right text-gray-800 mb-4 text-[11px] sm:text-xs">
                                    Dicetak di: <strong>{tempatCetak || 'Posko PSB Pesantren'}</strong><br />
                                    Tanggal: {todayFormatted}
                                </div>
                                <div className="grid grid-cols-2 gap-8 text-center text-xs">
                                    <div>
                                        <p className="font-semibold text-gray-700 mb-16">
                                            {adminJabatan || 'Koordinator Administrator PSB'},
                                        </p>
                                        <p className="font-bold text-gray-900 underline uppercase tracking-wide">
                                            {adminName ? adminName : '( ............................................ )'}
                                        </p>
                                        <p className="text-[10px] text-gray-500 mt-0.5">Admin Pendataan PSB</p>
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-700 mb-16">
                                            Mengetahui,<br />{pimpinanJabatan || 'Pimpinan Pondok Pesantren'}
                                        </p>
                                        <p className="font-bold text-gray-900 underline uppercase tracking-wide">
                                            {pimpinanName ? pimpinanName : '( ............................................ )'}
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
        </div>,
        document.body
    );
};
