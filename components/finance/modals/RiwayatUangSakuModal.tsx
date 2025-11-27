
import React, { useMemo, useState, useEffect } from 'react';
import { useAppContext } from '../../../AppContext';
import { Santri } from '../../../types';
import { formatRupiah } from '../../../utils/formatters';
import { UangSakuPrintTemplate } from '../print/UangSakuPrintTemplate';

interface RiwayatUangSakuModalProps {
    isOpen: boolean;
    onClose: () => void;
    santri: Santri;
}

export const RiwayatUangSakuModal: React.FC<RiwayatUangSakuModalProps> = ({ isOpen, onClose, santri }) => {
    const { transaksiSaldoList, saldoSantriList, settings } = useAppContext();
    const [printableData, setPrintableData] = useState<{ santri: Santri; riwayat: any[] } | null>(null);

    const riwayatTransaksi = useMemo(() => {
        return transaksiSaldoList
            .filter(t => t.santriId === santri.id)
            .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
    }, [transaksiSaldoList, santri.id]);

    useEffect(() => {
        if (printableData) {
            const timer = setTimeout(() => {
                window.print();
                setPrintableData(null);
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [printableData]);

    if (!isOpen) return null;

    const handlePrint = () => {
        setPrintableData({ santri, riwayat: riwayatTransaksi });
    };

    const handleShare = () => {
        const totalDeposit = riwayatTransaksi.filter(t => t.jenis === 'Deposit').reduce((sum, t) => sum + t.jumlah, 0);
        const totalPenarikan = riwayatTransaksi.filter(t => t.jenis === 'Penarikan').reduce((sum, t) => sum + t.jumlah, 0);
        const saldoAkhir = riwayatTransaksi[0]?.saldoSetelah || 0;
        const saldoAwal = saldoAkhir - totalDeposit + totalPenarikan;
        
        let message = `*Laporan Uang Saku - ${santri.namaLengkap}*\n`;
        message += `NIS: ${santri.nis}\n\n`;
        
        message += `*Ringkasan Saldo*\n`;
        message += `Saldo Awal: ${formatRupiah(saldoAwal)}\n`;
        message += `Total Deposit: ${formatRupiah(totalDeposit)}\n`;
        message += `Total Penarikan: ${formatRupiah(totalPenarikan)}\n`;
        message += `-----------------------------------\n`;
        message += `*Saldo Akhir: ${formatRupiah(saldoAkhir)}*\n\n`;

        message += `*Rincian Transaksi:*\n`;
        if (riwayatTransaksi.length > 0) {
             [...riwayatTransaksi].reverse().forEach(t => { // Reverse for chronological order
                const tanggal = new Date(t.tanggal).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                const icon = t.jenis === 'Deposit' ? '✅ Masuk' : '🔴 Keluar';
                const jumlah = formatRupiah(t.jumlah);
                const keterangan = t.keterangan || t.jenis;

                message += `\n🗓️ *${tanggal}*\n`;
                message += `   ${icon}: *${jumlah}*\n`;
                message += `   Keterangan: ${keterangan}\n`;
                message += `   Saldo Setelah: ${formatRupiah(t.saldoSetelah)}\n`;
             });
        } else {
             message += "_Tidak ada riwayat transaksi._\n";
        }

        message += "\n\n_dibuat dengan aplikasi eSantri Web by AI Projek | aiprojek01.my.id_";

        const encodedMessage = encodeURIComponent(message);
        window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
    };

    return (
        <>
            <div className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex justify-center items-center p-4">
                <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl" onClick={e => e.stopPropagation()}>
                    <div className="p-5 border-b flex justify-between items-center">
                        <h3 className="text-lg font-semibold text-gray-800">Riwayat Uang Saku - {santri.namaLengkap}</h3>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><i className="bi bi-x-lg"></i></button>
                    </div>
                    <div className="p-5 max-h-[70vh] overflow-y-auto">
                        <div className="border rounded-lg">
                            <table className="min-w-full divide-y divide-gray-200 text-sm">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-2 text-left font-medium text-gray-600">Tanggal</th>
                                        <th className="px-4 py-2 text-left font-medium text-gray-600">Jenis</th>
                                        <th className="px-4 py-2 text-left font-medium text-gray-600">Keterangan</th>
                                        <th className="px-4 py-2 text-right font-medium text-gray-600">Jumlah</th>
                                        <th className="px-4 py-2 text-right font-medium text-gray-600">Saldo Setelah</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {riwayatTransaksi.length > 0 ? riwayatTransaksi.map(t => (
                                        <tr key={t.id}>
                                            <td className="px-4 py-2 whitespace-nowrap">{new Date(t.tanggal).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                                            <td className="px-4 py-2">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${t.jenis === 'Deposit' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                                    {t.jenis}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2">{t.keterangan || '-'}</td>
                                            <td className={`px-4 py-2 text-right font-medium ${t.jenis === 'Deposit' ? 'text-green-600' : 'text-red-600'}`}>
                                                {t.jenis === 'Deposit' ? '+' : '-'} {formatRupiah(t.jumlah)}
                                            </td>
                                            <td className="px-4 py-2 text-right font-semibold">{formatRupiah(t.saldoSetelah)}</td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={5} className="text-center p-8 text-gray-500">Belum ada riwayat transaksi.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div className="p-4 border-t flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                                <i className="bi bi-printer-fill"></i> Cetak Laporan
                            </button>
                            <button onClick={handleShare} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-500 rounded-lg hover:bg-green-600">
                                <i className="bi bi-whatsapp"></i> Bagikan via Chat
                            </button>
                        </div>
                        <button onClick={onClose} className="px-5 py-2.5 text-sm rounded-lg border bg-white hover:bg-gray-100">Tutup</button>
                    </div>
                </div>
            </div>
            <div className="hidden print:block">
                {printableData && <div id="preview-area"><UangSakuPrintTemplate data={printableData} settings={settings} /></div>}
            </div>
        </>
    );
};
