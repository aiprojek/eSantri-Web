
import React, { useMemo } from 'react';
import { Pendaftar, PsbConfig, PondokSettings } from '../../types';
import { PrintHeader } from '../common/PrintHeader';
import { SectionCard } from '../common/SectionCard';
import { EmptyState } from '../common/EmptyState';

interface PsbDashboardProps {
    pendaftarList: Pendaftar[];
    config: PsbConfig;
    settings: PondokSettings;
}

export const PsbDashboard: React.FC<PsbDashboardProps> = ({ pendaftarList, config, settings }) => {
    const totalPendaftar = pendaftarList.length;
    
    const statsByJenjang = useMemo(() => {
        return settings.jenjang.map(j => {
            const pendaftarInJenjang = pendaftarList.filter(p => p.jenjangId === j.id);
            const l = pendaftarInJenjang.filter(p => p.jenisKelamin === 'Laki-laki').length;
            const p = pendaftarInJenjang.filter(p => p.jenisKelamin === 'Perempuan').length;
            const total = pendaftarInJenjang.length;
            return { 
                id: j.id, 
                name: j.nama, 
                total, 
                l, 
                p, 
                percentL: total > 0 ? (l / total) * 100 : 0,
                percentP: total > 0 ? (p / total) * 100 : 0
            };
        });
    }, [settings.jenjang, pendaftarList]);

    const dailyTrend = useMemo(() => {
        const days = [];
        const today = new Date();
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const count = pendaftarList.filter(p => p.tanggalDaftar.startsWith(dateStr)).length;
            days.push({ date: d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' }), count });
        }
        return days;
    }, [pendaftarList]);

    const maxDaily = Math.max(...dailyTrend.map(d => d.count), 1);

    const statusStats = useMemo(() => {
        const counts = { Baru: 0, Diterima: 0, Cadangan: 0, Ditolak: 0 };
        pendaftarList.forEach(p => {
            if (counts[p.status] !== undefined) counts[p.status]++;
        });
        return counts;
    }, [pendaftarList]);

    const todayStr = new Date().toISOString().split('T')[0];
    const pendaftarHariIni = pendaftarList.filter(p => p.tanggalDaftar.startsWith(todayStr)).length;

    const handlePrint = () => { window.print(); };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2 no-print">
                <div>
                    <h2 className="text-xl font-black tracking-tight text-app-text">Analitik Pendaftaran Santri Baru</h2>
                    <p className="mt-1 text-sm app-text-muted">Pantau laju pendaftar, distribusi jenjang, dan hasil seleksi dari dashboard PSB.</p>
                </div>
                <button onClick={handlePrint} className="app-button-secondary px-4 py-2.5 text-sm">
                    <i className="bi bi-printer-fill"></i> Cetak Laporan
                </button>
            </div>
            <div className="hidden print:block mb-8">
                <PrintHeader settings={settings} title="LAPORAN DASHBOARD PENERIMAAN SANTRI BARU" />
                <p className="text-center text-sm">Dicetak pada: {new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="app-panel rounded-panel border-l-4 border-l-teal-500 p-5">
                    <p className="text-sm font-medium app-text-muted">Total Pendaftar</p>
                    <p className="text-3xl font-bold text-app-text">{totalPendaftar}</p>
                    <p className="mt-1 text-xs app-text-muted">Tahun Ajaran {config.tahunAjaranAktif}</p>
                </div>
                <div className="app-panel rounded-panel border-l-4 border-l-blue-500 p-5">
                    <p className="text-sm font-medium app-text-muted">Pendaftar Hari Ini</p>
                    <p className="text-3xl font-bold text-app-text">{pendaftarHariIni}</p>
                    <p className="mt-1 text-xs app-text-muted">{new Date().toLocaleDateString('id-ID')}</p>
                </div>
                <div className="app-panel rounded-panel border-l-4 border-l-green-500 p-5">
                    <p className="text-sm font-medium app-text-muted">Sudah Diterima</p>
                    <p className="text-3xl font-bold text-app-text">{statusStats.Diterima}</p>
                    <p className="mt-1 text-xs app-text-muted">Santri Lolos Seleksi</p>
                </div>
            </div>
            <SectionCard title="Jumlah Pendaftar per Jenjang" className="print:break-inside-avoid" contentClassName="p-6">
                <div className="space-y-6">
                    {statsByJenjang.map((jenjang) => (
                        <div key={jenjang.id}>
                            <div className="flex justify-between items-end mb-2">
                                <div>
                                    <span className="text-base font-semibold text-app-text">{jenjang.name}</span>
                                </div>
                                <span className="text-lg font-bold text-app-text">{jenjang.total} <span className="text-sm font-normal app-text-muted">Pendaftar</span></span>
                            </div>
                            <div className="w-full h-6 flex rounded-full overflow-hidden bg-gray-100">
                                {jenjang.total > 0 ? (
                                    <>
                                        <div className="bg-blue-500 h-full flex items-center justify-center text-[10px] text-white font-bold" style={{ width: `${jenjang.percentL}%` }} title={`Laki-laki: ${jenjang.l}`}>{jenjang.percentL > 10 && `${Math.round(jenjang.percentL)}%`}</div>
                                        <div className="bg-pink-500 h-full flex items-center justify-center text-[10px] text-white font-bold" style={{ width: `${jenjang.percentP}%` }} title={`Perempuan: ${jenjang.p}`}>{jenjang.percentP > 10 && `${Math.round(jenjang.percentP)}%`}</div>
                                    </>
                                ) : (<div className="w-full h-full bg-gray-100 flex items-center justify-center text-[10px] app-text-muted">Belum ada data</div>)}
                            </div>
                            <div className="flex justify-between mt-2 text-sm">
                                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-blue-500"></span><span className="app-text-secondary">Putra: <strong>{jenjang.l}</strong></span></div>
                                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-pink-500"></span><span className="app-text-secondary">Putri: <strong>{jenjang.p}</strong></span></div>
                            </div>
                        </div>
                    ))}
                    {statsByJenjang.length === 0 && <EmptyState icon="bi-diagram-3" title="Jenjang belum dikonfigurasi" description="Tambahkan data jenjang terlebih dahulu agar dashboard distribusi pendaftar dapat ditampilkan." />}
                </div>
            </SectionCard>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" style={{ breakInside: 'avoid' }}>
                <SectionCard title="Tren Pendaftaran (7 Hari Terakhir)" contentClassName="p-6">
                    <div className="h-48 flex items-end justify-between gap-2 pt-4">
                        {dailyTrend.map((d, idx) => (
                            <div key={idx} className="flex flex-col items-center w-full group">
                                <div className="relative w-full flex justify-center"><div className="w-4/5 bg-teal-500 rounded-t-md hover:bg-teal-600 transition-all" style={{ height: `${d.count > 0 ? (d.count / maxDaily) * 150 : 2}px` }}></div><div className="absolute -top-6 bg-black text-white text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">{d.count}</div></div>
                                <span className="text-[10px] text-gray-500 mt-2 text-center leading-tight">{d.date}</span>
                            </div>
                        ))}
                    </div>
                </SectionCard>
                <SectionCard title="Status Seleksi" contentClassName="p-6">
                    <div className="space-y-4">
                        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border-l-4 border-blue-500"><span className="font-medium text-gray-700">Baru (Belum Diseleksi)</span><span className="font-bold text-gray-900">{statusStats.Baru}</span></div>
                        <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg border-l-4 border-green-500"><span className="font-medium text-green-800">Diterima</span><span className="font-bold text-green-900">{statusStats.Diterima}</span></div>
                        <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg border-l-4 border-yellow-500"><span className="font-medium text-yellow-800">Cadangan</span><span className="font-bold text-yellow-900">{statusStats.Cadangan}</span></div>
                        <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg border-l-4 border-red-500"><span className="font-medium text-red-800">Ditolak / Batal</span><span className="font-bold text-red-900">{statusStats.Ditolak}</span></div>
                    </div>
                </SectionCard>
            </div>
        </div>
    );
};
