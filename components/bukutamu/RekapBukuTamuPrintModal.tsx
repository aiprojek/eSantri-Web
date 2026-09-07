import React, { useRef, useState, useEffect } from 'react';
import { BukuTamu as BukuTamuType, PondokSettings, Santri } from '../../types';
import { printToPdfNative } from '../../utils/pdfGenerator';

interface RekapBukuTamuPrintModalProps {
    isOpen: boolean;
    onClose: () => void;
    records: BukuTamuType[];
    settings: PondokSettings;
    santriList: Santri[];
    startDate?: string;
    endDate?: string;
    selectedCategory?: string;
}

export const RekapBukuTamuPrintModal: React.FC<RekapBukuTamuPrintModalProps> = ({
    isOpen,
    onClose,
    records,
    settings,
    santriList,
    startDate,
    endDate,
    selectedCategory
}) => {
    const printRef = useRef<HTMLDivElement>(null);
    const [isPrinting, setIsPrinting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            document.body.classList.add('modal-print-open');
            return () => {
                document.body.classList.remove('modal-print-open');
            };
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handlePrint = async () => {
        try {
            setIsPrinting(true);
            await printToPdfNative('rekap-buku-tamu-print-area', `Rekap_Buku_Tamu_${new Date().toISOString().split('T')[0]}`, {
                paperSize: 'A4',
                orientation: 'landscape',
                margin: { top: 0.8, right: 0.8, bottom: 0.8, left: 0.8 }
            });
        } catch (err) {
            console.error('Print error:', err);
            window.print();
        } finally {
            setIsPrinting(false);
        }
    };

    const getSantriName = (id?: number) => {
        if (!id) return '';
        const s = santriList.find(sa => sa.id === id);
        return s ? s.namaLengkap : '';
    };

    const getDurationText = (masukStr: string, keluarStr?: string) => {
        if (!keluarStr) return 'Di Dalam';
        const start = new Date(masukStr).getTime();
        const end = new Date(keluarStr).getTime();
        const diffMins = Math.max(0, Math.floor((end - start) / 60000));
        const hours = Math.floor(diffMins / 60);
        const mins = diffMins % 60;
        return `${hours}j ${mins}m`;
    };

    return (
        <div className="print-modal-target fixed inset-0 bg-black/60 z-[75] flex justify-center items-center p-3 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static">
            <style>{`
                @media print {
                    @page {
                        size: A4 landscape;
                        margin: 8mm;
                    }
                    *, *::before, *::after {
                        box-shadow: none !important;
                        -webkit-box-shadow: none !important;
                        text-shadow: none !important;
                        filter: none !important;
                    }
                    html, body {
                        width: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        background: #ffffff !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                }
            `}</style>

            <div className="print-modal-card bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden my-auto print:shadow-none print:w-full print:max-w-none print:rounded-none print:max-h-none print:m-0">
                {/* Header Modal (Hidden in Print) */}
                <div className="p-4 bg-teal-800 text-white flex items-center justify-between shrink-0 print:hidden">
                    <div className="flex items-center gap-2">
                        <i className="bi bi-file-earmark-text-fill text-xl text-teal-200"></i>
                        <div>
                            <h3 className="font-bold text-sm">Cetak Laporan Rekapitulasi Buku Tamu &amp; Ekspedisi Pos Keamanan</h3>
                            <p className="text-[11px] text-teal-100">Total data siap dicetak: {records.length} rekaman</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handlePrint}
                            disabled={isPrinting}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-400 hover:bg-amber-300 text-teal-950 font-bold text-xs rounded-lg transition-colors shadow-sm disabled:opacity-50"
                        >
                            <i className={`bi ${isPrinting ? 'bi-hourglass-split animate-spin' : 'bi-printer'}`}></i>
                            <span>{isPrinting ? 'Menyiapkan...' : 'Cetak Laporan (Print)'}</span>
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 text-white/80 hover:text-white rounded-lg hover:bg-teal-700/50 transition-colors"
                        >
                            <i className="bi bi-x-lg"></i>
                        </button>
                    </div>
                </div>

                {/* Printable Document Area */}
                <div
                    ref={printRef}
                    id="rekap-buku-tamu-print-area"
                    className="flex-1 overflow-y-auto p-4 sm:p-8 bg-white text-gray-900 print:p-0 print:m-0 print:overflow-visible font-sans shadow-none"
                >
                    {/* Kop Pesantren */}
                    <div className="border-b-2 border-teal-950 pb-4 mb-4 text-center relative">
                        {settings.logoPonpesUrl && (
                            <img
                                src={settings.logoPonpesUrl}
                                alt="Logo Pesantren"
                                className="w-16 h-16 object-contain absolute left-0 top-1/2 -translate-y-1/2 hidden sm:block print:block"
                            />
                        )}
                        <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-teal-950">
                            {settings.namaPonpes || 'PONDOK PESANTREN MODERN'}
                        </h2>
                        <p className="text-xs sm:text-sm text-gray-700 font-medium">
                            {settings.alamat || 'Alamat Lembaga Pendidikan Pesantren'} &bull; Telp: {settings.telepon || '-'}
                        </p>
                        <p className="text-[11px] text-teal-800 font-bold tracking-widest uppercase mt-0.5">
                            BAGIAN KEAMANAN &amp; KETERTIBAN KAMPUS (SATUAN PENGAMANAN)
                        </p>
                    </div>

                    {/* Judul Laporan & Periode */}
                    <div className="text-center mb-5">
                        <h3 className="text-base sm:text-lg font-black uppercase text-gray-900 underline decoration-teal-700 underline-offset-4">
                            LAPORAN BUKU TAMU, KUNJUNGAN &amp; EKSPEDISI POS JAGA
                        </h3>
                        <p className="text-xs text-gray-600 mt-1">
                            {startDate && endDate ? (
                                <>Periode: <strong>{new Date(startDate).toLocaleDateString('id-ID')}</strong> s.d. <strong>{new Date(endDate).toLocaleDateString('id-ID')}</strong></>
                            ) : (
                                <>Seluruh Catatan Riwayat Kunjungan &bull; Tanggal Cetak: {new Date().toLocaleDateString('id-ID')}</>
                            )}
                            {selectedCategory && selectedCategory !== 'Semua' && (
                                <> &bull; Kategori: <strong>{selectedCategory}</strong></>
                            )}
                        </p>
                    </div>

                    {/* Tabel Data Rekapitulasi */}
                    <div className="border border-gray-300 rounded-lg overflow-hidden mb-6">
                        <table className="w-full text-left text-[11px] border-collapse">
                            <thead>
                                <tr className="bg-teal-900 text-white font-bold uppercase tracking-wider">
                                    <th className="py-2 px-2.5 border-r border-teal-800 w-8 text-center">No</th>
                                    <th className="py-2 px-2.5 border-r border-teal-800 w-24">Tanggal</th>
                                    <th className="py-2 px-2.5 border-r border-teal-800 w-20 text-center">Badge</th>
                                    <th className="py-2 px-2.5 border-r border-teal-800">Nama Tamu / Kurir</th>
                                    <th className="py-2 px-2.5 border-r border-teal-800 w-24">Kategori</th>
                                    <th className="py-2 px-2.5 border-r border-teal-800">Tujuan / Keperluan</th>
                                    <th className="py-2 px-2.5 border-r border-teal-800 w-24">Kendaraan</th>
                                    <th className="py-2 px-2.5 border-r border-teal-800 w-16 text-center">Masuk</th>
                                    <th className="py-2 px-2.5 border-r border-teal-800 w-16 text-center">Keluar</th>
                                    <th className="py-2 px-2.5 border-r border-teal-800 w-16 text-center">Durasi</th>
                                    <th className="py-2 px-2.5 w-20">Petugas</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 text-gray-800">
                                {records.map((r, idx) => {
                                    const jamMasuk = new Date(r.jamMasuk).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
                                    const jamKeluar = r.jamKeluar ? new Date(r.jamKeluar).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-';
                                    const santriName = getSantriName(r.santriId);

                                    return (
                                        <tr key={r.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/70'}>
                                            <td className="py-1.5 px-2 border-r border-gray-200 text-center font-bold text-gray-600">{idx + 1}</td>
                                            <td className="py-1.5 px-2.5 border-r border-gray-200 whitespace-nowrap">{new Date(r.tanggal).toLocaleDateString('id-ID')}</td>
                                            <td className="py-1.5 px-2 border-r border-gray-200 text-center font-mono font-bold text-teal-900">
                                                {r.nomorBadge || '-'}
                                            </td>
                                            <td className="py-1.5 px-2.5 border-r border-gray-200 font-semibold text-gray-900">
                                                {r.namaTamu}
                                                {r.noHp && <span className="block text-[9px] text-gray-500 font-normal">{r.noHp}</span>}
                                            </td>
                                            <td className="py-1.5 px-2 border-r border-gray-200 text-gray-700">{r.kategori}</td>
                                            <td className="py-1.5 px-2.5 border-r border-gray-200 text-gray-800">
                                                <div>{r.keperluan}</div>
                                                {santriName && <div className="text-[10px] text-teal-800 font-medium">Santri: {santriName}</div>}
                                                {r.bertemuDengan && <div className="text-[10px] text-gray-600">Bertemu: {r.bertemuDengan}</div>}
                                                {r.deskripsiPaket && <div className="text-[10px] text-amber-800 font-medium">Paket: {r.deskripsiPaket} ({r.statusPaket})</div>}
                                            </td>
                                            <td className="py-1.5 px-2 border-r border-gray-200 text-gray-700 text-[10px]">
                                                {r.platNomor ? `${r.platNomor} (${r.kendaraan || 'Kendaraan'})` : (r.kendaraan || '-')}
                                            </td>
                                            <td className="py-1.5 px-2 border-r border-gray-200 text-center font-mono text-emerald-800 font-semibold">{jamMasuk}</td>
                                            <td className="py-1.5 px-2 border-r border-gray-200 text-center font-mono text-gray-700">{jamKeluar}</td>
                                            <td className="py-1.5 px-2 border-r border-gray-200 text-center text-gray-600 text-[10px]">{getDurationText(r.jamMasuk, r.jamKeluar)}</td>
                                            <td className="py-1.5 px-2 text-gray-700 text-[10px] truncate max-w-[80px]">{r.petugas}</td>
                                        </tr>
                                    );
                                })}
                                {records.length === 0 && (
                                    <tr>
                                        <td colSpan={11} className="py-8 text-center text-gray-500 italic">
                                            Tidak ada data rekaman buku tamu sesuai filter periode yang dipilih.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Ringkasan & Tanda Tangan Pengesahan */}
                    <div className="grid grid-cols-2 text-center text-xs mt-8 pt-4 border-t border-gray-200">
                        <div>
                            <p className="text-gray-600">Komandan Regu Keamanan / Satpam,</p>
                            <div className="h-16"></div>
                            <p className="font-bold underline text-gray-900">( ...................................... )</p>
                            <p className="text-[10px] text-gray-500">NIP / Reg: Pos Gerbang Utama</p>
                        </div>
                        <div>
                            <p className="text-gray-600">Kepala Bagian Pengasuhan / Mudir,</p>
                            <div className="h-16"></div>
                            <p className="font-bold underline text-gray-900">( ...................................... )</p>
                            <p className="text-[10px] text-gray-500">Pimpinan Pesantren</p>
                        </div>
                    </div>

                    {/* Footer Kredit Aplikasi */}
                    <div className="mt-8 pt-2 border-t border-gray-200 text-center">
                        <p className="text-[10px] text-gray-500 font-medium tracking-wide">
                            dibuat dengan Esantri Web by AI Projek | aiprojek01.my.id
                        </p>
                    </div>
                </div>

                {/* Footer Modal (Hidden in Print) */}
                <div className="p-4 bg-gray-100 border-t border-gray-200 flex justify-between items-center shrink-0 print:hidden">
                    <span className="text-xs text-gray-500">
                        Tips: Pilih orientasi <strong>Landscape A4</strong> di dialog browser untuk tampilan kolom yang lapang.
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg text-xs font-semibold"
                        >
                            Tutup
                        </button>
                        <button
                            onClick={handlePrint}
                            disabled={isPrinting}
                            className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
                        >
                            <i className={`bi ${isPrinting ? 'bi-hourglass-split animate-spin' : 'bi-printer'}`}></i>
                            <span>{isPrinting ? 'Menyiapkan...' : 'Cetak Laporan'}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
