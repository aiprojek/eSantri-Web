
import React, { useMemo, useState } from 'react';
import { useFinanceContext } from '../../contexts/FinanceContext';
import { useSantriContext } from '../../contexts/SantriContext';
import { useAppContext } from '../../AppContext';
import { formatRupiah } from '../../utils/formatters';
import { Tagihan, Santri } from '../../types';
import { sendManualWA, formatWAMessage, WA_TEMPLATES } from '../../services/waService';
import { MobileFilterDrawer } from '../common/MobileFilterDrawer';
import { SectionCard } from '../common/SectionCard';
import { EmptyState } from '../common/EmptyState';

export const LaporanTunggakan: React.FC = () => {
    const { tagihanList } = useFinanceContext();
    const { santriList } = useSantriContext();
    const { settings } = useAppContext();
    
    const [filterJenjang, setFilterJenjang] = useState('');
    const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
    const btnWa = "rounded-md border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700 transition-colors hover:bg-green-100";

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

    const handleSendDuesWA = (santriId: number, total: number) => {
        const santri = santriList.find(s => s.id === santriId);
        if (!santri) return;

        const phone = santri.teleponAyah || santri.teleponIbu || santri.teleponWali;
        if (!phone) {
            alert("Nomor telepon orang tua tidak tersedia!");
            return;
        }

        const message = formatWAMessage(WA_TEMPLATES.TAGIHAN, {
            nama_santri: santri.namaLengkap,
            ortu: santri.namaAyah || santri.namaIbu || 'Wali Santri',
            nominal: total.toLocaleString('id-ID'),
            bulan: new Date().toLocaleString('id-ID', { month: 'long' })
        });

        sendManualWA(phone, message);
    };

    return (
        <SectionCard
            title="Laporan Umur Piutang (Aging Report)"
            description="Analisa umur tunggakan aktif per santri untuk membantu prioritas tindak lanjut dan pengingat."
            contentClassName="flex h-full flex-col p-5 sm:p-6"
        >
            <div className="no-print mb-6 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
                
                {/* Mobile Actions */}
                <div className="md:hidden flex w-full gap-2">
                    <button 
                        onClick={() => setIsFilterDrawerOpen(true)}
                        className="app-button-secondary flex-grow px-4 py-2.5 text-sm"
                    >
                        <i className="bi bi-funnel-fill"></i>
                        <span>Filter</span>
                    </button>
                    <button onClick={handlePrint} className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white shadow-lg">
                        <i className="bi bi-printer text-xl"></i>
                    </button>
                </div>

                {/* Desktop Actions */}
                <div className="hidden md:flex gap-2">
                    <select value={filterJenjang} onChange={e => setFilterJenjang(e.target.value)} className="app-select h-10 min-w-[170px] px-3 text-sm font-semibold">
                        <option value="">Semua Jenjang</option>
                        {settings.jenjang.map(j => <option key={j.id} value={j.id}>{j.nama}</option>)}
                    </select>
                    <button onClick={handlePrint} className="app-button-secondary h-10 px-4 text-sm">
                        <i className="bi bi-printer"></i> Cetak
                    </button>
                </div>
            </div>

            <MobileFilterDrawer 
                isOpen={isFilterDrawerOpen} 
                onClose={() => setIsFilterDrawerOpen(false)}
                title="Filter Laporan"
            >
                <div className="space-y-6">
                    <div className="app-panel-soft rounded-[2rem] p-6">
                        <label className="app-label mb-3 ml-1 block">Pilih Jenjang</label>
                        <select 
                            value={filterJenjang} 
                            onChange={e => setFilterJenjang(e.target.value)}
                            className="app-select w-full rounded-[20px] p-4 text-base font-semibold"
                        >
                            <option value="">Semua Jenjang</option>
                            {settings.jenjang.map(j => <option key={j.id} value={j.id}>{j.nama}</option>)}
                        </select>
                    </div>
                </div>
            </MobileFilterDrawer>

            <div className="mb-6 grid grid-cols-1 gap-4 text-white no-print md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl bg-blue-600 p-4 shadow-soft">
                    <p className="text-xs uppercase opacity-80">Total Piutang</p>
                    <p className="text-2xl font-bold">{formatRupiah(grandTotal.total)}</p>
                </div>
                <div className="rounded-2xl bg-green-600 p-4 shadow-soft">
                    <p className="text-xs uppercase opacity-80">Lancar (0-30 Hari)</p>
                    <p className="text-xl font-bold">{formatRupiah(grandTotal.lancar)}</p>
                </div>
                <div className="rounded-2xl bg-yellow-600 p-4 shadow-soft">
                    <p className="text-xs uppercase opacity-80">Perhatian (31-90 Hari)</p>
                    <p className="text-xl font-bold">{formatRupiah(grandTotal.kurangLancar)}</p>
                </div>
                <div className="rounded-2xl bg-red-600 p-4 shadow-soft">
                    <p className="text-xs uppercase opacity-80">Macet (&gt; 90 Hari)</p>
                    <p className="text-xl font-bold">{formatRupiah(grandTotal.macet)}</p>
                </div>
            </div>

            {/* Printable Area */}
            <div className="app-table-shell app-scrollbar printable-content-wrapper overflow-auto">
                <div className="hidden print:block mb-4 text-center">
                    <h3 className="text-xl font-bold">{settings.namaPonpes}</h3>
                    <h4 className="text-lg">Laporan Analisa Umur Piutang Santri</h4>
                    <p className="text-sm text-gray-600">Per Tanggal: {new Date().toLocaleDateString('id-ID')}</p>
                </div>

                <div className="space-y-3 p-3 print:hidden md:hidden">
                    {agingData.map((item) => (
                        <div key={item.santriId} className="rounded-2xl border border-slate-200 bg-white p-3">
                            <p className="text-sm font-semibold text-slate-800">{item.nama}</p>
                            <p className="text-xs text-slate-500">{item.kelas}</p>
                            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                                <div className="rounded-lg bg-green-50 p-2"><p className="text-green-700">0-30 Hari</p><p className="font-semibold">{item.lancar > 0 ? formatRupiah(item.lancar) : '-'}</p></div>
                                <div className="rounded-lg bg-yellow-50 p-2"><p className="text-yellow-700">31-90 Hari</p><p className="font-semibold">{item.kurangLancar > 0 ? formatRupiah(item.kurangLancar) : '-'}</p></div>
                                <div className="rounded-lg bg-red-50 p-2"><p className="text-red-700">&gt; 90 Hari</p><p className="font-semibold">{item.macet > 0 ? formatRupiah(item.macet) : '-'}</p></div>
                                <div className="rounded-lg bg-slate-50 p-2"><p className="text-slate-600">Total</p><p className="font-semibold">{formatRupiah(item.total)}</p></div>
                            </div>
                            <div className="mt-3">
                                <button
                                    onClick={() => handleSendDuesWA(item.santriId, item.total)}
                                    className={btnWa}
                                >
                                    Kirim Pengingat WA
                                </button>
                            </div>
                        </div>
                    ))}
                    {agingData.length === 0 && (
                        <EmptyState
                            icon="bi-bar-chart-line"
                            title="Belum ada data piutang"
                            description="Tidak ada tunggakan aktif untuk filter jenjang yang dipilih saat ini."
                            compact
                        />
                    )}
                </div>

                <table className="app-table hidden w-full border-collapse text-left text-sm md:table">
                    <thead className="border-b-2 border-slate-300 text-slate-700">
                        <tr>
                            <th className="p-3 border">Nama Santri</th>
                            <th className="p-3 border">Kelas</th>
                            <th className="p-3 border text-right bg-green-50">0 - 30 Hari</th>
                            <th className="p-3 border text-right bg-yellow-50">31 - 90 Hari</th>
                            <th className="p-3 border text-right bg-red-50">&gt; 90 Hari</th>
                            <th className="p-3 border text-right font-bold">Total Tunggakan</th>
                            <th className="p-3 border text-center no-print">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {agingData.map((item) => (
                            <tr key={item.santriId} className="hover:bg-teal-50/40">
                                <td className="p-3 border font-medium">{item.nama}</td>
                                <td className="p-3 border">{item.kelas}</td>
                                <td className="p-3 border text-right text-slate-600">{item.lancar > 0 ? formatRupiah(item.lancar) : '-'}</td>
                                <td className="p-3 border text-right text-yellow-700 font-medium">{item.kurangLancar > 0 ? formatRupiah(item.kurangLancar) : '-'}</td>
                                <td className="p-3 border text-right text-red-600 font-bold">{item.macet > 0 ? formatRupiah(item.macet) : '-'}</td>
                                <td className="p-3 border text-right font-bold">{formatRupiah(item.total) }</td>
                                <td className="p-3 border text-center no-print">
                                    <button 
                                        onClick={() => handleSendDuesWA(item.santriId, item.total)}
                                        className={btnWa}
                                        title="Kirim Pengingat WA"
                                    >
                                        WA
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {agingData.length === 0 && (
                            <tr>
                                <td colSpan={7} className="p-0">
                                    <EmptyState
                                        icon="bi-bar-chart-line"
                                        title="Belum ada data piutang"
                                        description="Tidak ada tunggakan aktif untuk filter jenjang yang dipilih saat ini."
                                        compact
                                    />
                                </td>
                            </tr>
                        )}
                    </tbody>
                    {agingData.length > 0 && (
                    <tfoot className="border-t-2 border-slate-300 bg-slate-100 font-bold">
                        <tr>
                            <td colSpan={2} className="p-3 text-right">GRAND TOTAL</td>
                            <td className="p-3 text-right">{formatRupiah(grandTotal.lancar)}</td>
                            <td className="p-3 text-right">{formatRupiah(grandTotal.kurangLancar)}</td>
                            <td className="p-3 text-right text-red-600">{formatRupiah(grandTotal.macet)}</td>
                            <td className="p-3 text-right">{formatRupiah(grandTotal.total)}</td>
                            <td className="p-3 text-center no-print"></td>
                        </tr>
                    </tfoot>
                    )}
                </table>
            </div>
            
            <div className="mt-4 text-xs italic text-slate-500 no-print">
                * Kategori umur piutang dihitung berdasarkan asumsi tanggal jatuh tempo tgl 10 setiap bulan.
            </div>
        </SectionCard>
    );
};
