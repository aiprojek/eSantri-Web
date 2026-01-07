
import React from 'react';
import { Santri, PondokSettings, Tagihan, Pembayaran, TransaksiKas, TransaksiSaldo } from '../../../types';
import { PrintHeader } from '../../common/PrintHeader';
import { ReportFooter, formatRupiah, formatDate, formatDateTime } from './Common';

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
                <p className="text-center text-sm mb-4">Dicetak pada: {formatDate(new Date().toISOString())}</p>
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
                <p className="text-center text-sm mb-4">Periode: {formatDate(kasStartDate)} s.d. {formatDate(kasEndDate)}</p>
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
                <table className="w-full text-sm my-4"><tbody><tr><td className="pr-4 font-medium">Nama Santri</td><td>: {santri.namaLengkap}</td></tr><tr><td className="pr-4 font-medium">NIS</td><td>: {santri.nis}</td></tr><tr><td className="pr-4 font-medium">Periode</td><td>: {formatDate(rekeningKoranStartDate)} s.d. {formatDate(rekeningKoranEndDate)}</td></tr></tbody></table>
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
