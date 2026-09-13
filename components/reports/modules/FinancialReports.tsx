
import React from 'react';
import { Santri, PondokSettings, Tagihan, Pembayaran, TransaksiKas, TransaksiSaldo } from '../../../types';
import { PrintHeader } from '../../common/PrintHeader';
import { ReportFooter, formatRupiah, formatDate, formatDateTime, formatAlamat } from './Common';

// --- FINANCE SUMMARY ---
export const FinanceSummaryTemplate: React.FC<{ santriList: Santri[], tagihanList: Tagihan[], pembayaranList: Pembayaran[], settings: PondokSettings }> = ({ santriList, tagihanList, pembayaranList, settings }) => {
    const now = new Date(); const currentMonth = now.getMonth(); const currentYear = now.getFullYear();
    
    // Safety Update: Ensure values are numbers
    const totalTunggakan = tagihanList.filter(t => t.status === 'Belum Lunas').reduce((sum, t) => sum + (Number(t.nominal) || 0), 0);
    
    const penerimaanBulanIni = pembayaranList.filter(p => { const d = new Date(p.tanggal); return d.getMonth() === currentMonth && d.getFullYear() === currentYear; }).reduce((sum, p) => sum + (Number(p.jumlah) || 0), 0);
    const penerimaanTahunIni = pembayaranList.filter(p => new Date(p.tanggal).getFullYear() === currentYear).reduce((sum, p) => sum + (Number(p.jumlah) || 0), 0);
    
    const jumlahSantriMenunggak = new Set(tagihanList.filter(t => t.status === 'Belum Lunas' && santriList.find(s=>s.id === t.santriId && s.status === 'Aktif')).map(t => t.santriId)).size;
    
    const totalTagihanValue = tagihanList.reduce((sum, t) => sum + (Number(t.nominal) || 0), 0);
    const totalLunasValue = tagihanList.filter(t => t.status === 'Lunas').reduce((sum, t) => sum + (Number(t.nominal) || 0), 0);

    return (
         <div className="font-sans text-black flex flex-col h-full justify-between" style={{ fontSize: '10pt' }}>
            <div>
                <PrintHeader settings={settings} title="Laporan Ringkas Keuangan" />
                <p className="print-meta text-center text-sm mb-4">Dicetak pada: {formatDate(new Date().toISOString())}</p>
                <h4 className="font-bold text-lg mb-2 border-b-2 border-black pb-1">Statistik Keuangan Utama</h4>
                <table className="w-full text-sm my-4">
                    <tbody>
                        <tr className="border-b"><td className="py-2 font-medium">Total Tunggakan</td><td className="py-2 text-right font-bold text-lg">{formatRupiah(totalTunggakan)}</td></tr>
                        <tr className="border-b"><td className="py-2 font-medium">Penerimaan Bulan Ini</td><td className="py-2 text-right font-bold text-lg">{formatRupiah(penerimaanBulanIni)}</td></tr>
                        <tr className="border-b"><td className="py-2 font-medium">Total Penerimaan Tahun Ini</td><td className="py-2 text-right font-bold text-lg">{formatRupiah(penerimaanTahunIni)}</td></tr>
                        <tr className="border-b"><td className="py-2 font-medium">Jumlah Santri Aktif Menunggak</td><td className="py-2 text-right font-bold text-lg">{jumlahSantriMenunggak} Santri</td></tr>
                    </tbody>
                </table>
                <div className="mt-6" style={{ breakInside: 'avoid' }}>
                    <h4 className="font-bold text-lg mb-2 border-b-2 border-black pb-1">Komposisi Seluruh Tagihan</h4>
                    <table className="w-full text-sm">
                        <tbody>
                            <tr><td className="py-1 font-medium">Lunas</td><td className="py-1 text-right">{formatRupiah(totalLunasValue)}</td><td className="py-1 text-right w-24">({(totalTagihanValue > 0 ? (totalLunasValue / totalTagihanValue) * 100 : 0).toFixed(1)}%)</td></tr>
                            <tr><td className="py-1 font-medium">Belum Lunas</td><td className="py-1 text-right">{formatRupiah(totalTunggakan)}</td><td className="py-1 text-right w-24">({(totalTagihanValue > 0 ? (totalTunggakan / totalTagihanValue) * 100 : 0).toFixed(1)}%)</td></tr>
                        </tbody>
                        <tfoot><tr className="border-t-2 border-black"><td className="pt-2 font-bold">Total Keseluruhan Tagihan</td><td className="pt-2 text-right font-bold">{formatRupiah(totalTagihanValue)}</td><td className="pt-2 text-right w-24"></td></tr></tfoot>
                    </table>
                </div>
             </div>
             <ReportFooter />
        </div>
    );
};

// --- ARUS KAS ---
export const LaporanArusKasTemplate: React.FC<{ settings: PondokSettings; options: any }> = ({ settings, options }) => {
    const { filteredKas, allKas, kasStartDate, kasEndDate } = options;
    const startDate = new Date(kasStartDate);
    const lastTxBeforePeriod = allKas.filter((t: any) => new Date(t.tanggal) < startDate).sort((a: any, b: any) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime())[0];
    const saldoAwal = lastTxBeforePeriod ? lastTxBeforePeriod.saldoSetelah : 0;
    const saldoAkhir = filteredKas.length > 0 ? filteredKas[0].saldoSetelah : saldoAwal;
    
    // Safety Update: Ensure values are numbers
    const totalPemasukan = filteredKas.filter((t: any) => t.jenis === 'Pemasukan').reduce((sum: number, t: any) => sum + (Number(t.jumlah) || 0), 0);
    const totalPengeluaran = filteredKas.filter((t: any) => t.jenis === 'Pengeluaran').reduce((sum: number, t: any) => sum + (Number(t.jumlah) || 0), 0);

    return (
        <div className="font-sans text-black flex flex-col h-full justify-between" style={{ fontSize: '10pt' }}>
            <div>
                <PrintHeader settings={settings} title="Laporan Arus Kas Umum" />
                <p className="print-meta text-center text-sm mb-4">Periode: {formatDate(kasStartDate)} s.d. {formatDate(kasEndDate)}</p>
                <table className="w-full text-sm my-4">
                    <tbody>
                        <tr className="border-b"><td className="py-1 font-medium">Saldo Awal</td><td className="py-1 text-right font-semibold">{formatRupiah(saldoAwal)}</td></tr>
                        <tr className="border-b text-green-700"><td className="py-1 font-medium">Total Pemasukan</td><td className="py-1 text-right font-semibold">{formatRupiah(totalPemasukan)}</td></tr>
                        <tr className="border-b text-red-700"><td className="py-1 font-medium">Total Pengeluaran</td><td className="py-1 text-right font-semibold">{formatRupiah(totalPengeluaran)}</td></tr>
                        <tr className="border-t-2 border-black"><td className="py-1 font-bold">Saldo Akhir</td><td className="py-1 text-right font-bold">{formatRupiah(saldoAkhir)}</td></tr>
                    </tbody>
                </table>
                <table className="w-full text-left border-collapse border border-black text-xs mt-6">
                    <thead className="bg-gray-200 uppercase">
                        <tr><th className="p-1 border border-black w-8">No</th><th className="p-1 border border-black">Tanggal</th><th className="p-1 border border-black">Kategori</th><th className="p-1 border border-black">Deskripsi</th><th className="p-1 border border-black text-right">Pemasukan</th><th className="p-1 border border-black text-right">Pengeluaran</th><th className="p-1 border border-black text-right">Saldo</th></tr>
                    </thead>
                    <tbody>
                        {filteredKas.length > 0 ? [...filteredKas].reverse().map((t: any, index: number) => (
                            <tr key={t.id}>
                                <td className="p-1 border border-black text-center">{index + 1}</td><td className="p-1 border border-black">{formatDateTime(t.tanggal)}</td><td className="p-1 border border-black">{t.kategori}</td><td className="p-1 border border-black">{t.deskripsi}</td>
                                <td className="p-1 border border-black text-right text-green-700">{t.jenis === 'Pemasukan' ? formatRupiah(t.jumlah) : '-'}</td><td className="p-1 border border-black text-right text-red-700">{t.jenis === 'Pengeluaran' ? formatRupiah(t.jumlah) : '-'}</td><td className="p-1 border border-black text-right font-semibold">{formatRupiah(t.saldoSetelah)}</td>
                            </tr>
                        )) : <tr><td colSpan={7} className="text-center p-4 italic text-gray-500">Tidak ada transaksi.</td></tr>}
                    </tbody>
                </table>
            </div>
            <ReportFooter />
        </div>
    );
};

// --- REKENING KORAN ---
export const RekeningKoranSantriTemplate: React.FC<{ santri: Santri; settings: PondokSettings; options: any }> = ({ santri, settings, options }) => {
    const { tagihanList, pembayaranList, transaksiSaldoList, rekeningKoranStartDate, rekeningKoranEndDate } = options;
    const startDate = new Date(rekeningKoranStartDate);
    const endDate = new Date(rekeningKoranEndDate + 'T23:59:59');

    const allTx: any[] = [];
    tagihanList.filter((t: any) => t.santriId === santri.id).forEach((t: any) => allTx.push({ tanggal: new Date(t.tahun, t.bulan - 1), deskripsi: `Tagihan: ${t.deskripsi}`, debit: Number(t.nominal), kredit: 0 }));
    pembayaranList.filter((p: any) => p.santriId === santri.id).forEach((p: any) => allTx.push({ tanggal: new Date(p.tanggal), deskripsi: `Pembayaran Tagihan`, debit: 0, kredit: Number(p.jumlah) }));
    transaksiSaldoList.filter((t: any) => t.santriId === santri.id).forEach((t: any) => {
        if (t.jenis === 'Deposit') allTx.push({ tanggal: new Date(t.tanggal), deskripsi: `Uang Saku: ${t.keterangan || 'Deposit'}`, debit: 0, kredit: Number(t.jumlah) });
        else allTx.push({ tanggal: new Date(t.tanggal), deskripsi: `Uang Saku: ${t.keterangan || 'Penarikan'}`, debit: Number(t.jumlah), kredit: 0 });
    });

    const saldoAwal = allTx.filter(tx => tx.tanggal < startDate).reduce((saldo, tx) => saldo + tx.kredit - tx.debit, 0);
    const periodTx = allTx.filter(tx => tx.tanggal >= startDate && tx.tanggal <= endDate).sort((a,b) => a.tanggal.getTime() - b.tanggal.getTime());
    let saldoBerjalan = saldoAwal;
    const transactionsWithRunningBalance = periodTx.map(tx => { saldoBerjalan = saldoBerjalan + tx.kredit - tx.debit; return { ...tx, saldo: saldoBerjalan }; });

    return (
        <div className="font-sans text-black flex flex-col h-full justify-between" style={{ fontSize: '10pt' }}>
            <div>
                <PrintHeader settings={settings} title="Rekening Koran Santri" />
                <table className="print-meta w-full text-sm my-4">
                    <tbody>
                        <tr><td className="pr-4 font-medium w-32">Nama Santri</td><td>: {santri.namaLengkap}</td></tr>
                        <tr><td className="pr-4 font-medium">NIS</td><td>: {santri.nis}</td></tr>
                        <tr><td className="pr-4 font-medium">Alamat</td><td>: {formatAlamat(santri.alamat) || '-'}</td></tr>
                        <tr><td className="pr-4 font-medium">Periode</td><td>: {formatDate(rekeningKoranStartDate)} s.d. {formatDate(rekeningKoranEndDate)}</td></tr>
                    </tbody>
                </table>
                <table className="w-full text-left border-collapse border border-black text-xs mt-6">
                    <thead className="bg-gray-200 uppercase"><tr><th className="p-1 border border-black">Tanggal</th><th className="p-1 border border-black">Deskripsi</th><th className="p-1 border border-black text-right">Debit</th><th className="p-1 border border-black text-right">Kredit</th><th className="p-1 border border-black text-right">Saldo</th></tr></thead>
                    <tbody>
                        <tr><td colSpan={4} className="p-1 border border-black font-semibold">Saldo Awal</td><td className="p-1 border border-black text-right font-semibold">{formatRupiah(saldoAwal)}</td></tr>
                        {transactionsWithRunningBalance.map((tx, i) => (
                            <tr key={i}><td className="p-1 border border-black">{formatDateTime(tx.tanggal)}</td><td className="p-1 border border-black">{tx.deskripsi}</td><td className="p-1 border border-black text-right text-red-700">{tx.debit > 0 ? formatRupiah(tx.debit) : '-'}</td><td className="p-1 border border-black text-right text-green-700">{tx.kredit > 0 ? formatRupiah(tx.kredit) : '-'}</td><td className="p-1 border border-black text-right font-semibold">{formatRupiah(tx.saldo)}</td></tr>
                        ))}
                    </tbody>
                    <tfoot><tr className="bg-gray-200"><td colSpan={4} className="p-1 border border-black font-bold text-right">SALDO AKHIR</td><td className="p-1 border border-black text-right font-bold">{formatRupiah(saldoBerjalan)}</td></tr></tfoot>
                </table>
            </div>
            <ReportFooter />
        </div>
    );
};

// --- MATRIKS TUNGGAKAN SPP ROMBEL (12 BULAN) ---
export const MatriksTunggakanSPPTemplate: React.FC<{
    santriList: Santri[];
    tagihanList: Tagihan[];
    pembayaranList: Pembayaran[];
    settings: PondokSettings;
    options: any;
    filters?: any;
}> = ({ santriList, tagihanList, settings, options, filters }) => {
    const rawTahunAjaran = options?.matriksTahunAjaran || filters?.tahunAjaran || settings.tahunAjaranAktif || '2024/2025';
    const firstYear = parseInt(rawTahunAjaran.split('/')[0]) || new Date().getFullYear();
    const secondYear = parseInt(rawTahunAjaran.split('/')[1]) || (firstYear + 1);

    // 12 Months of Indonesian Academic Calendar (Juli - Juni)
    const months = [
        { label: 'Jul', full: 'Juli', month: 7, year: firstYear },
        { label: 'Agu', full: 'Agustus', month: 8, year: firstYear },
        { label: 'Sep', full: 'September', month: 9, year: firstYear },
        { label: 'Okt', full: 'Oktober', month: 10, year: firstYear },
        { label: 'Nov', full: 'November', month: 11, year: firstYear },
        { label: 'Des', full: 'Desember', month: 12, year: firstYear },
        { label: 'Jan', full: 'Januari', month: 1, year: secondYear },
        { label: 'Feb', full: 'Februari', month: 2, year: secondYear },
        { label: 'Mar', full: 'Maret', month: 3, year: secondYear },
        { label: 'Apr', full: 'April', month: 4, year: secondYear },
        { label: 'Mei', full: 'Mei', month: 5, year: secondYear },
        { label: 'Jun', full: 'Juni', month: 6, year: secondYear },
    ];

    // Info Rombel & Jenjang
    const rombel = filters?.rombelId ? settings.rombel.find(r => r.id === parseInt(filters.rombelId)) : undefined;
    const kelas = rombel ? settings.kelas.find(k => k.id === rombel.kelasId) : (filters?.kelasId ? settings.kelas.find(k => k.id === parseInt(filters.kelasId)) : undefined);
    const jenjang = kelas ? settings.jenjang.find(j => j.id === kelas.jenjangId) : (filters?.jenjangId ? settings.jenjang.find(j => j.id === parseInt(filters.jenjangId)) : undefined);

    // Process each santri
    const rows = santriList.map((santri, index) => {
        let countMenunggak = 0;
        let sumTunggakan = 0;

        const monthStatuses = months.map(m => {
            const matches = tagihanList.filter(t => 
                t.santriId === santri.id && 
                Number(t.bulan) === m.month && 
                Number(t.tahun) === m.year
            );

            if (matches.length === 0) {
                return { status: 'none', text: '-', nominal: 0 };
            }

            const isAllLunas = matches.every(t => t.status === 'Lunas');
            const totalNominal = matches.reduce((sum, t) => sum + (Number(t.nominal) || 0), 0);
            const unpaidNominal = matches.filter(t => t.status !== 'Lunas').reduce((sum, t) => sum + (Number(t.nominal) || 0), 0);

            if (isAllLunas) {
                return { status: 'lunas', text: '✓', nominal: totalNominal };
            } else {
                countMenunggak += 1;
                sumTunggakan += unpaidNominal;
                return { status: 'menunggak', text: '✗', nominal: unpaidNominal };
            }
        });

        return {
            no: index + 1,
            santri,
            monthStatuses,
            countMenunggak,
            sumTunggakan
        };
    });

    const totalSantri = rows.length;
    const totalSemuaTunggakan = rows.reduce((acc, r) => acc + r.sumTunggakan, 0);
    const santriMenunggakCount = rows.filter(r => r.countMenunggak > 0).length;
    const santriTertibCount = totalSantri - santriMenunggakCount;

    // Monthly summary stats
    const monthStats = months.map((m, idx) => {
        let lunasCount = 0;
        let nunggakCount = 0;
        let nominalTunggak = 0;

        rows.forEach(r => {
            const st = r.monthStatuses[idx];
            if (st.status === 'lunas') lunasCount++;
            else if (st.status === 'menunggak') {
                nunggakCount++;
                nominalTunggak += st.nominal;
            }
        });

        return { lunasCount, nunggakCount, nominalTunggak };
    });

    // Signatories
    const sig1 = settings.tenagaPengajar.find(p => p.id === parseInt(options?.matriksSignatory1Id));
    const sig2 = settings.tenagaPengajar.find(p => p.id === parseInt(options?.matriksSignatory2Id));
    const title1 = options?.matriksSignatory1Title || 'Wali Kelas';
    const title2 = options?.matriksSignatory2Title || 'Bendahara Pondok Pesantren';

    return (
        <div className="font-sans text-black flex flex-col h-full justify-between leading-tight text-xs" style={{ fontSize: '8.5pt' }}>
            <div>
                {/* Header */}
                <PrintHeader settings={settings} title={`MATRIKS TUNGGAKAN SPP & SYAHRIAH ROMBEL`} />

                {/* Sub-Header / Filter Info */}
                <div className="flex justify-between items-center bg-gray-100 border border-gray-300 px-3 py-1.5 rounded mb-3 text-xs">
                    <div className="flex gap-6 font-medium">
                        <div><span className="text-gray-600">Tahun Ajaran:</span> <strong>{rawTahunAjaran}</strong></div>
                        <div><span className="text-gray-600">Jenjang:</span> <strong>{jenjang?.nama || 'Semua Jenjang'}</strong></div>
                        <div><span className="text-gray-600">Kelas / Rombel:</span> <strong>{kelas?.nama || '-'} {rombel ? `(${rombel.nama})` : ''}</strong></div>
                    </div>
                    <div className="text-gray-600 text-[8pt]">
                        Total: <strong>{totalSantri}</strong> Santri | Dicetak: <strong>{formatDate(new Date().toISOString())}</strong>
                    </div>
                </div>

                {/* Table Matriks 12 Bulan */}
                <div className="overflow-x-auto">
                    <table className="w-full text-center border-collapse border border-black text-[8pt]">
                        <thead>
                            <tr className="bg-gray-200">
                                <th rowSpan={2} className="border border-black p-1 w-7">No</th>
                                <th rowSpan={2} className="border border-black p-1 w-16 text-center font-mono">NIS</th>
                                <th rowSpan={2} className="border border-black p-1 text-left min-w-[150px]">Nama Lengkap Santri</th>
                                <th colSpan={6} className="border border-black p-0.5 text-center bg-gray-300">Semester Ganjil ({firstYear})</th>
                                <th colSpan={6} className="border border-black p-0.5 text-center bg-gray-200">Semester Genap ({secondYear})</th>
                                <th rowSpan={2} className="border border-black p-1 w-12 text-center">Bln Tgk</th>
                                <th rowSpan={2} className="border border-black p-1 w-24 text-right">Total Tunggakan</th>
                            </tr>
                            <tr className="bg-gray-100 text-[7.5pt]">
                                {months.map(m => (
                                    <th key={`${m.month}-${m.year}`} className="border border-black p-0.5 w-8 font-semibold">
                                        {m.label}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.length > 0 ? rows.map((row) => (
                                <tr key={row.santri.id} className={row.countMenunggak > 0 ? 'hover:bg-red-50' : 'hover:bg-gray-50'}>
                                    <td className="border border-black p-1 text-center">{row.no}</td>
                                    <td className="border border-black p-1 text-center font-mono text-[7.5pt]">{row.santri.nis}</td>
                                    <td className="border border-black p-1 text-left font-medium truncate max-w-[180px]">
                                        {row.santri.namaLengkap}
                                    </td>
                                    {row.monthStatuses.map((st, idx) => (
                                        <td 
                                            key={idx} 
                                            className={`border border-black p-0.5 font-bold ${
                                                st.status === 'lunas' 
                                                    ? 'text-emerald-700 bg-emerald-50/40' 
                                                    : st.status === 'menunggak' 
                                                    ? 'text-rose-700 bg-rose-50 font-extrabold' 
                                                    : 'text-gray-400'
                                            }`}
                                        >
                                            {st.text}
                                        </td>
                                    ))}
                                    <td className={`border border-black p-1 text-center font-bold ${row.countMenunggak > 0 ? 'text-red-700 bg-red-100/50' : 'text-emerald-700'}`}>
                                        {row.countMenunggak}
                                    </td>
                                    <td className={`border border-black p-1 text-right font-mono text-[7.5pt] ${row.sumTunggakan > 0 ? 'text-red-700 font-bold' : 'text-gray-600'}`}>
                                        {row.sumTunggakan > 0 ? formatRupiah(row.sumTunggakan) : 'Lunas'}
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={17} className="border border-black p-4 text-center italic text-gray-500">
                                        Tidak ada data santri pada kelas / rombel ini.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                        {/* Summary Footer of Table */}
                        <tfoot>
                            <tr className="bg-gray-100 font-bold border-t-2 border-black text-[7.5pt]">
                                <td colSpan={3} className="border border-black p-1 text-left">
                                    Rekap Tunggakan Per Bulan:
                                </td>
                                {monthStats.map((ms, idx) => (
                                    <td key={idx} className="border border-black p-0.5 text-center">
                                        <span className={ms.nunggakCount > 0 ? 'text-red-700 font-bold' : 'text-emerald-700'}>
                                            {ms.nunggakCount > 0 ? `${ms.nunggakCount} tgk` : '0'}
                                        </span>
                                    </td>
                                ))}
                                <td className="border border-black p-1 text-center">
                                    {santriMenunggakCount}
                                </td>
                                <td className="border border-black p-1 text-right font-mono text-red-700 text-[8pt]">
                                    {formatRupiah(totalSemuaTunggakan)}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {/* Legend & Summary Cards */}
                <div className="mt-3 flex justify-between items-center text-[8pt] border border-gray-300 p-2 rounded bg-gray-50">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <span className="inline-block w-4 h-4 bg-emerald-100 text-emerald-700 text-center font-bold text-xs rounded border border-emerald-400 leading-tight">✓</span>
                            <span>= Lunas</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="inline-block w-4 h-4 bg-rose-100 text-rose-700 text-center font-bold text-xs rounded border border-rose-400 leading-tight">✗</span>
                            <span>= Menunggak / Belum Bayar</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="inline-block w-4 h-4 bg-gray-100 text-gray-500 text-center text-xs rounded border border-gray-300 leading-tight">-</span>
                            <span>= Tidak Ada Tagihan</span>
                        </div>
                    </div>
                    <div className="flex gap-4 font-semibold">
                        <span>Tertib Bayar: <strong className="text-emerald-700">{santriTertibCount}</strong> Santri ({totalSantri > 0 ? ((santriTertibCount / totalSantri) * 100).toFixed(1) : 0}%)</span>
                        <span>Menunggak: <strong className="text-red-700">{santriMenunggakCount}</strong> Santri</span>
                        <span>Total Piutang Rombel: <strong className="text-red-700 font-mono">{formatRupiah(totalSemuaTunggakan)}</strong></span>
                    </div>
                </div>

                {/* Signatures */}
                <div className="flex justify-between items-end mt-8 px-8" style={{ breakInside: 'avoid' }}>
                    <div className="text-center w-56">
                        <p className="text-xs">Mengetahui,</p>
                        <p className="font-bold text-xs mt-0.5">{title1}</p>
                        <div className="h-16 flex items-center justify-center">
                            <span className="text-[9px] text-gray-400 italic">[Tanda Tangan]</span>
                        </div>
                        <p className="font-bold underline text-xs">{sig1 ? sig1.nama : '__________________________'}</p>
                        {sig1?.nip && <p className="font-mono text-[7.5pt] text-gray-600">NIP/NIY: {sig1.nip}</p>}
                    </div>
                    <div className="text-center w-56">
                        <p className="text-xs">{settings.kabupatenKota || 'Pesantren'}, {formatDate(new Date().toISOString())}</p>
                        <p className="font-bold text-xs mt-0.5">{title2}</p>
                        <div className="h-16 flex items-center justify-center">
                            <span className="text-[9px] text-gray-400 italic">[Tanda Tangan & Cap]</span>
                        </div>
                        <p className="font-bold underline text-xs">{sig2 ? sig2.nama : (settings.namaBendahara || '__________________________')}</p>
                        {sig2?.nip && <p className="font-mono text-[7.5pt] text-gray-600">NIP/NIY: {sig2.nip}</p>}
                    </div>
                </div>
            </div>
            <ReportFooter />
        </div>
    );
};
