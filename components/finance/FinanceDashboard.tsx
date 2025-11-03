import React, { useMemo } from 'react';
import { Santri, Tagihan, Pembayaran, PondokSettings } from '../../types';
import { formatRupiah } from '../../utils/formatters';

const StatCard: React.FC<{ icon: string; title: string; value: string | number; color: string; }> = ({ icon, title, value, color }) => (
    <div className="bg-white p-5 rounded-xl shadow-md flex items-start">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${color} mr-4 flex-shrink-0`}>
            <i className={`${icon} text-2xl text-white`}></i>
        </div>
        <div>
            <p className="text-gray-500 text-sm font-medium">{title}</p>
            <p className="text-2xl font-bold text-gray-800">{value}</p>
        </div>
    </div>
);

const FinancialProjectionChart: React.FC<{ data: { month: string; actual: number | null; projected: number | null }[] }> = ({ data }) => {
    if (data.length === 0) {
        return <p className="text-center text-gray-500 py-10">Data pembayaran tidak cukup untuk menampilkan grafik.</p>;
    }
    const maxVal = Math.max(...data.map(d => Math.max(d.actual ?? 0, d.projected ?? 0)), 1);

    return (
        <div>
            <div className="flex justify-end gap-4 text-xs mb-2">
                <div className="flex items-center"><span className="w-3 h-3 bg-teal-400 mr-2 rounded-sm"></span>Penerimaan Aktual</div>
                <div className="flex items-center"><span className="w-3 h-3 bg-sky-300 mr-2 rounded-sm"></span>Proyeksi Penerimaan</div>
            </div>
            <div className="h-64 flex flex-col justify-end">
                <div className="flex items-end justify-around gap-2 h-full">
                    {data.map(({ month, actual, projected }) => (
                        <div key={month} className="flex flex-col items-center flex-grow text-center group w-full">
                            <div className="relative w-full flex items-end justify-center h-full">
                                {actual !== null && actual > 0 && (
                                    <div
                                        className="w-3/4 max-w-8 bg-teal-400 rounded-t-md group-hover:bg-teal-500 transition-all duration-300"
                                        style={{ height: `${(actual / maxVal) * 100}%` }}
                                        title={`Aktual ${formatRupiah(actual)} pada ${month}`}
                                    />
                                )}
                                {projected !== null && (
                                     <div
                                        className="w-3/4 max-w-8 bg-sky-300 rounded-t-md group-hover:bg-sky-400 transition-all duration-300"
                                        style={{ height: `${(projected / maxVal) * 100}%` }}
                                        title={`Proyeksi ${formatRupiah(projected)} pada ${month}`}
                                    />
                                )}
                            </div>
                            <span className="mt-2 text-[10px] font-medium text-gray-500">{month}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};


export const FinanceDashboard: React.FC<{ santriList: Santri[], tagihanList: Tagihan[], pembayaranList: Pembayaran[], settings: PondokSettings }> = ({ santriList, tagihanList, pembayaranList, settings }) => {
    const stats = useMemo(() => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const totalTunggakan = tagihanList
            .filter(t => t.status === 'Belum Lunas')
            .reduce((sum, t) => sum + (parseFloat(String(t.nominal)) || 0), 0);

        const penerimaanBulanIni = pembayaranList
            .filter(p => {
                const d = new Date(p.tanggal);
                return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
            })
            .reduce((sum, p) => sum + p.jumlah, 0);

        const penerimaanTahunIni = pembayaranList
            .filter(p => new Date(p.tanggal).getFullYear() === currentYear)
            .reduce((sum, p) => sum + p.jumlah, 0);

        const santriAktifIds = new Set(santriList.filter(s => s.status === 'Aktif').map(s => s.id));

        const santriMenunggakIds = new Set(
            tagihanList
                .filter(t => t.status === 'Belum Lunas' && santriAktifIds.has(t.santriId))
                .map(t => t.santriId)
        );

        const jumlahSantriMenunggak = santriMenunggakIds.size;
        
        return {
            totalTunggakan,
            penerimaanBulanIni,
            penerimaanTahunIni,
            jumlahSantriMenunggak,
        };
    }, [santriList, tagihanList, pembayaranList]);

    const projectionData = useMemo(() => {
        const now = new Date();
        const pastMonths: { key: string }[] = [];
        const futureMonths: { key: string }[] = [];

        // 1. Get month keys for last 6 and next 6 months
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            pastMonths.push({
                key: `${d.toLocaleString('id-ID', { month: 'short' })} '${d.getFullYear().toString().slice(-2)}`,
            });
        }
        for (let i = 1; i <= 6; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
            futureMonths.push({
                key: `${d.toLocaleString('id-ID', { month: 'short' })} '${d.getFullYear().toString().slice(-2)}`,
            });
        }

        // 2. Calculate actual income for past months
        const actuals: { [key: string]: number } = {};
        pastMonths.forEach(m => actuals[m.key] = 0);

        pembayaranList.forEach(p => {
            const d = new Date(p.tanggal);
            const key = `${d.toLocaleString('id-ID', { month: 'short' })} '${d.getFullYear().toString().slice(-2)}`;
            if (actuals.hasOwnProperty(key)) {
                actuals[key] += p.jumlah;
            }
        });

        // 3. Calculate projection average from past months with payments
        const recentPayments = Object.values(actuals).filter(total => total > 0);
        const average = recentPayments.length > 0 ? recentPayments.reduce((sum, val) => sum + val, 0) / recentPayments.length : 0;
        
        // 4. Build final data array
        const result = [
            ...pastMonths.map(m => ({
                month: m.key,
                actual: actuals[m.key],
                projected: null,
            })),
            ...futureMonths.map(m => ({
                month: m.key,
                actual: null,
                projected: average > 0 ? average : null,
            }))
        ];

        return result;
    }, [pembayaranList]);
    
    const topArrears = useMemo(() => {
        const arrearsMap = new Map<number, number>();
        tagihanList.forEach(t => {
            if (t.status === 'Belum Lunas') {
                arrearsMap.set(t.santriId, (arrearsMap.get(t.santriId) || 0) + (parseFloat(String(t.nominal)) || 0));
            }
        });

        const sorted = Array.from(arrearsMap.entries()).sort((a, b) => b[1] - a[1]);
        
        return sorted.slice(0, 5).map(([santriId, total]) => {
            const santri = santriList.find(s => s.id === santriId);
            return {
                santri,
                total
            };
        }).filter(item => item.santri); // Filter out cases where santri might not be found
    }, [tagihanList, santriList]);
    
    const arrearsByJenjang = useMemo(() => {
        const data = new Map<number, { nama: string; totalTunggakan: number, totalTagihan: number }>();
        settings.jenjang.forEach(j => {
            data.set(j.id, { nama: j.nama, totalTunggakan: 0, totalTagihan: 0 });
        });

        const santriJenjangMap = new Map(santriList.map(s => [s.id, s.jenjangId]));

        tagihanList.forEach(t => {
            const jenjangId = santriJenjangMap.get(t.santriId);
            if (jenjangId && data.has(jenjangId)) {
                const jenjangData = data.get(jenjangId)!;
                // FIX: Explicitly cast `t.nominal` to a Number before performing addition to prevent potential type errors
                // where `t.nominal` might not be correctly inferred as a number.
                jenjangData.totalTagihan += (parseFloat(String(t.nominal)) || 0);
                if (t.status === 'Belum Lunas') {
                // FIX: Explicitly cast `t.nominal` to a Number before performing addition to prevent potential type errors
                // where `t.nominal` might not be correctly inferred as a number.
                    jenjangData.totalTunggakan += (parseFloat(String(t.nominal)) || 0);
                }
            }
        });
        
        return Array.from(data.values()).filter(d => d.totalTagihan > 0);
    }, [tagihanList, santriList, settings.jenjang]);

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-700">Dashboard Keuangan</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                 <StatCard 
                    title="Total Tunggakan Aktif" 
                    value={formatRupiah(stats.totalTunggakan)} 
                    icon="bi-exclamation-triangle-fill" 
                    color="bg-red-500"
                />
                <StatCard 
                    title="Penerimaan Bulan Ini" 
                    value={formatRupiah(stats.penerimaanBulanIni)} 
                    icon="bi-calendar-check-fill" 
                    color="bg-green-500"
                />
                <StatCard 
                    title="Penerimaan Tahun Ini" 
                    value={formatRupiah(stats.penerimaanTahunIni)} 
                    icon="bi-bar-chart-line-fill" 
                    color="bg-blue-500"
                />
                 <StatCard 
                    title="Santri Aktif Menunggak" 
                    value={`${stats.jumlahSantriMenunggak} Santri`}
                    icon="bi-people-fill" 
                    color="bg-yellow-500"
                />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2 bg-white p-6 rounded-xl shadow-md">
                    <h3 className="text-xl font-bold text-gray-700 mb-4">Penerimaan Aktual & Proyeksi Pendapatan</h3>
                    <FinancialProjectionChart data={projectionData} />
                </div>
                
                <div className="bg-white p-6 rounded-xl shadow-md">
                    <h3 className="text-xl font-bold text-gray-700 mb-4">Santri dengan Tunggakan Teratas</h3>
                    <ul className="space-y-4">
                        {topArrears.map(({ santri, total }) => (
                            <li key={santri!.id} className="flex items-center gap-4">
                                <img 
                                    src={santri!.fotoUrl || 'https://placehold.co/150x200/e2e8f0/334155?text=Foto'}
                                    alt={santri!.namaLengkap}
                                    className="w-10 h-10 rounded-full object-cover bg-gray-200 flex-shrink-0"
                                />
                                <div className="flex-grow">
                                    <p className="font-semibold text-sm text-gray-800">{santri!.namaLengkap}</p>
                                    <p className="text-xs text-gray-500">{settings.rombel.find(r => r.id === santri!.rombelId)?.nama || 'N/A'}</p>
                                </div>
                                <span className="font-bold text-sm text-red-600">{formatRupiah(total)}</span>
                            </li>
                        ))}
                        {topArrears.length === 0 && (
                            <p className="text-center text-gray-500 py-4">Tidak ada data tunggakan.</p>
                        )}
                    </ul>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-md">
                    <h3 className="text-xl font-bold text-gray-700 mb-4">Rekap Tunggakan per Jenjang</h3>
                    <div className="space-y-4">
                        {arrearsByJenjang.map(item => (
                            <div key={item.nama}>
                                <div className="flex justify-between items-center mb-1 text-sm">
                                    <span className="font-medium text-gray-700">{item.nama}</span>
                                    <div className="font-semibold text-gray-800">
                                        {formatRupiah(item.totalTunggakan)} 
                                        <span className="text-xs text-gray-500 font-normal"> / {formatRupiah(item.totalTagihan)}</span>
                                    </div>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-4">
                                    <div 
                                        className="bg-red-500 h-4 rounded-full" 
                                        style={{ width: `${item.totalTagihan > 0 ? (item.totalTunggakan / item.totalTagihan) * 100 : 0}%` }}
                                        title={`${(item.totalTagihan > 0 ? (item.totalTunggakan / item.totalTagihan) * 100 : 0).toFixed(1)}%`}
                                    ></div>
                                </div>
                            </div>
                        ))}
                        {arrearsByJenjang.length === 0 && <p className="text-center text-gray-500 py-4">Tidak ada data tunggakan untuk ditampilkan.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};