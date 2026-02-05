
import React, { useMemo, useState } from 'react';
import { useFinanceContext } from '../../contexts/FinanceContext';
import { useSantriContext } from '../../contexts/SantriContext';
import { useAppContext } from '../../AppContext';
import { formatRupiah } from '../../utils/formatters';
import { Tagihan } from '../../types';

export const LaporanTunggakan: React.FC = () => {
    const { tagihanList } = useFinanceContext();
    const { santriList } = useSantriContext();
    const { settings } = useAppContext();
    
    const [filterJenjang, setFilterJenjang] = useState('');

    const agingData = useMemo(() => {
        const today = new Date();
        const report = new Map<number, {
            santriId: number;
            nama: string;
            kelas: string;
            total: number;
            lancar: number; // 0-30 hari
            kurangLancar: number; // 31-90 hari
            macet: number; // >90 hari
            detail: Tagihan[];
        }>();

        tagihanList.filter(t => t.status === 'Belum Lunas').forEach(t => {
            const santri = santriList.find(s => s.id === t.santriId);
            if (!santri || santri.status !== 'Aktif') return;
            if (filterJenjang && santri.jenjangId !== parseInt(filterJenjang)) return;

            // Hitung umur tagihan
            // Asumsi tanggal jatuh tempo adalah tanggal 10 bulan tagihan
            const dueDate = new Date(t.tahun, t.bulan - 1, 10);
            const diffTime = Math.abs(today.getTime() - dueDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (!report.has(t.santriId)) {
                const rombel = settings.rombel.find(r => r.id === santri.rombelId)?.nama || '-';
                report.set(t.santriId, {
                    santriId: t.santriId,
                    nama: santri.namaLengkap,
                    kelas: rombel,
                    total: 0,
                    lancar: 0,
                    kurangLancar: 0,
                    macet: 0,
                    detail: []
                });
            }

            const entry = report.get(t.santriId)!;
            entry.total += t.nominal;
            entry.detail.push(t);

            if (diffDays <= 30) entry.lancar += t.nominal;
            else if (diffDays <= 90) entry.kurangLancar += t.nominal;
            else entry.macet += t.nominal;
        });

        return Array.from(report.values()).sort((a, b) => b.total - a.total);
    }, [tagihanList, santriList, filterJenjang, settings]);

    const grandTotal = agingData.reduce((acc, curr) => ({
        total: acc.total + curr.total,
        lancar: acc.lancar + curr.lancar,
        kurangLancar: acc.kurangLancar + curr.kurangLancar,
        macet: acc.macet + curr.macet
    }), { total: 0, lancar: 0, kurangLancar: 0, macet: 0 });

    const handlePrint = () => window.print();

    return (
        <div className="bg-white p-6 rounded-lg shadow-md h-full flex flex-col">
            <div className="flex justify-between items-center mb-6 no-print">
                <h2 className="text-xl font-bold text-gray-800">Laporan Umur Piutang (Aging Report)</h2>
                <div className="flex gap-2">
                    <select value={filterJenjang} onChange={e => setFilterJenjang(e.target.value)} className="border rounded p-2 text-sm">
                        <option value="">Semua Jenjang</option>
                        {settings.jenjang.map(j => <option key={j.id} value={j.id}>{j.nama}</option>)}
                    </select>
                    <button onClick={handlePrint} className="bg-gray-700 text-white px-4 py-2 rounded text-sm font-bold flex items-center gap-2">
                        <i className="bi bi-printer"></i> Cetak
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-4 gap-4 mb-6 text-white no-print">
                <div className="p-4 rounded-lg bg-blue-600 shadow">
                    <p className="text-xs uppercase opacity-80">Total Piutang</p>
                    <p className="text-2xl font-bold">{formatRupiah(grandTotal.total)}</p>
                </div>
                <div className="p-4 rounded-lg bg-green-600 shadow">
                    <p className="text-xs uppercase opacity-80">Lancar (0-30 Hari)</p>
                    <p className="text-xl font-bold">{formatRupiah(grandTotal.lancar)}</p>
                </div>
                <div className="p-4 rounded-lg bg-yellow-600 shadow">
                    <p className="text-xs uppercase opacity-80">Perhatian (31-90 Hari)</p>
                    <p className="text-xl font-bold">{formatRupiah(grandTotal.kurangLancar)}</p>
                </div>
                <div className="p-4 rounded-lg bg-red-600 shadow">
                    <p className="text-xs uppercase opacity-80">Macet (&gt; 90 Hari)</p>
                    <p className="text-xl font-bold">{formatRupiah(grandTotal.macet)}</p>
                </div>
            </div>

            {/* Printable Area */}
            <div className="overflow-auto border rounded-lg printable-content-wrapper">
                <div className="hidden print:block mb-4 text-center">
                    <h3 className="text-xl font-bold">{settings.namaPonpes}</h3>
                    <h4 className="text-lg">Laporan Analisa Umur Piutang Santri</h4>
                    <p className="text-sm text-gray-600">Per Tanggal: {new Date().toLocaleDateString('id-ID')}</p>
                </div>

                <table className="w-full text-sm text-left border-collapse">
                    <thead className="bg-gray-50 text-gray-700 border-b-2 border-gray-300">
                        <tr>
                            <th className="p-3 border">Nama Santri</th>
                            <th className="p-3 border">Kelas</th>
                            <th className="p-3 border text-right bg-green-50">0 - 30 Hari</th>
                            <th className="p-3 border text-right bg-yellow-50">31 - 90 Hari</th>
                            <th className="p-3 border text-right bg-red-50">&gt; 90 Hari</th>
                            <th className="p-3 border text-right font-bold">Total Tunggakan</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {agingData.map((item) => (
                            <tr key={item.santriId} className="hover:bg-gray-50">
                                <td className="p-3 border font-medium">{item.nama}</td>
                                <td className="p-3 border">{item.kelas}</td>
                                <td className="p-3 border text-right text-gray-600">{item.lancar > 0 ? formatRupiah(item.lancar) : '-'}</td>
                                <td className="p-3 border text-right text-yellow-700 font-medium">{item.kurangLancar > 0 ? formatRupiah(item.kurangLancar) : '-'}</td>
                                <td className="p-3 border text-right text-red-600 font-bold">{item.macet > 0 ? formatRupiah(item.macet) : '-'}</td>
                                <td className="p-3 border text-right font-bold">{formatRupiah(item.total)}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="bg-gray-100 font-bold border-t-2 border-gray-300">
                        <tr>
                            <td colSpan={2} className="p-3 text-right">GRAND TOTAL</td>
                            <td className="p-3 text-right">{formatRupiah(grandTotal.lancar)}</td>
                            <td className="p-3 text-right">{formatRupiah(grandTotal.kurangLancar)}</td>
                            <td className="p-3 text-right text-red-600">{formatRupiah(grandTotal.macet)}</td>
                            <td className="p-3 text-right">{formatRupiah(grandTotal.total)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
            
            <div className="mt-4 text-xs text-gray-500 italic no-print">
                * Kategori umur piutang dihitung berdasarkan asumsi tanggal jatuh tempo tgl 10 setiap bulan.
            </div>
        </div>
    );
};
