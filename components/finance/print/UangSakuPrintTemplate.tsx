
import React from 'react';
import { Santri, PondokSettings, TransaksiSaldo } from '../../../types';
import { formatRupiah } from '../../../utils/formatters';
import { PrintHeader } from '../../common/PrintHeader';

interface UangSakuPrintTemplateProps {
    data: {
        santri: Santri;
        riwayat: TransaksiSaldo[];
    };
    settings: PondokSettings;
}

export const UangSakuPrintTemplate: React.FC<UangSakuPrintTemplateProps> = ({ data, settings }) => {
    const { santri, riwayat } = data;

    const totalDeposit = riwayat.filter(t => t.jenis === 'Deposit').reduce((sum, t) => sum + t.jumlah, 0);
    const totalPenarikan = riwayat.filter(t => t.jenis === 'Penarikan').reduce((sum, t) => sum + t.jumlah, 0);
    const saldoAkhir = riwayat[0]?.saldoSetelah || 0;
    const saldoAwal = saldoAkhir - totalDeposit + totalPenarikan;

    return (
        <div className="font-serif text-black p-4 flex flex-col min-h-full" style={{ fontSize: '11pt', lineHeight: '1.5' }}>
            <div className="flex-grow">
                <PrintHeader settings={settings} title="LAPORAN RIWAYAT UANG SAKU" />
                
                <table className="w-full text-sm my-4">
                    <tbody>
                        <tr><td className="pr-4 font-medium w-32">Nama Santri</td><td>: {santri.namaLengkap}</td></tr>
                        <tr><td className="pr-4 font-medium">NIS</td><td>: {santri.nis}</td></tr>
                        <tr><td className="pr-4 font-medium">Tanggal Cetak</td><td>: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</td></tr>
                    </tbody>
                </table>

                <table className="w-full text-sm my-4 border-t border-b py-2">
                    <tbody>
                        <tr><td className="py-1 font-medium">Saldo Awal Periode</td><td className="py-1 text-right font-semibold">{formatRupiah(saldoAwal)}</td></tr>
                        <tr className="text-green-700"><td className="py-1 font-medium">Total Deposit</td><td className="py-1 text-right font-semibold">{formatRupiah(totalDeposit)}</td></tr>
                        <tr className="text-red-700"><td className="py-1 font-medium">Total Penarikan</td><td className="py-1 text-right font-semibold">{formatRupiah(totalPenarikan)}</td></tr>
                        <tr className="border-t-2 border-black"><td className="py-1 font-bold">Saldo Akhir</td><td className="py-1 text-right font-bold">{formatRupiah(saldoAkhir)}</td></tr>
                    </tbody>
                </table>
                
                <h4 className="font-bold text-base mt-6 mb-2">Detail Transaksi:</h4>
                <table className="w-full text-left border-collapse border border-black text-xs">
                    <thead className="bg-gray-200 uppercase">
                        <tr>
                            <th className="p-1 border border-black w-8">No</th>
                            <th className="p-1 border border-black">Tanggal</th>
                            <th className="p-1 border border-black">Keterangan</th>
                            <th className="p-1 border border-black text-right">Deposit</th>
                            <th className="p-1 border border-black text-right">Penarikan</th>
                            <th className="p-1 border border-black text-right">Saldo</th>
                        </tr>
                    </thead>
                    <tbody>
                        {riwayat.length > 0 ? (
                            [...riwayat].reverse().map((t, index) => (
                                <tr key={t.id}>
                                    <td className="p-1 border border-black text-center">{index + 1}</td>
                                    <td className="p-1 border border-black whitespace-nowrap">{new Date(t.tanggal).toLocaleString('id-ID', { day: '2-digit', month: 'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}</td>
                                    <td className="p-1 border border-black">{t.keterangan || t.jenis}</td>
                                    <td className="p-1 border border-black text-right text-green-700">{t.jenis === 'Deposit' ? formatRupiah(t.jumlah) : '-'}</td>
                                    <td className="p-1 border border-black text-right text-red-700">{t.jenis === 'Penarikan' ? formatRupiah(t.jumlah) : '-'}</td>
                                    <td className="p-1 border border-black text-right font-semibold">{formatRupiah(t.saldoSetelah)}</td>
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan={6} className="text-center p-4 italic text-gray-500">Tidak ada riwayat transaksi.</td></tr>
                        )}
                    </tbody>
                </table>

                 <div className="mt-12 flow-root" style={{ breakInside: 'avoid' }}>
                    <div className="float-right w-72 text-center text-sm">
                        <p>{settings.alamat.split(',')[1] || 'Sumpiuh'}, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                        <p className="mt-2">Bendahara,</p>
                        <div className="h-20"></div>
                        <p className="font-bold underline">( ............................................ )</p>
                    </div>
                </div>
            </div>
            <div className="mt-auto pt-2 border-t border-gray-400 text-center text-[8pt] text-gray-500 italic w-full clear-both">
                dibuat dengan aplikasi eSantri Web by AI Projek | aiprojek01.my.id
            </div>
        </div>
    );
};
