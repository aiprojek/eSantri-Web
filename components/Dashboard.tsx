
import React, { Suspense, lazy, useMemo, useState, useEffect } from 'react';
import { Santri, PondokSettings, Page } from '../types';
import { useAppContext } from '../AppContext';
import { useSantriContext } from '../contexts/SantriContext';
import { db } from '../db';
import { PageHeader } from './common/PageHeader';
import { HeaderTabs } from './common/HeaderTabs';

const ExecutiveDashboard = lazy(() =>
  import('./dashboard/ExecutiveDashboard').then((module) => ({
    default: module.ExecutiveDashboard,
  }))
);

interface DashboardProps {
    navigateTo: (page: Page, filters?: any) => void;
}

const StatCard: React.FC<{ icon: React.ReactNode; title: string; value: string | number; color: string; onClick?: () => void }> = ({ icon, title, value, color, onClick }) => (
    <div 
        className={`app-panel-elevated flex flex-col justify-between rounded-panel p-5 transition-transform transform hover:-translate-y-1 ${onClick ? 'cursor-pointer' : ''}`}
        onClick={onClick}
    >
        <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-[18px] ${color}`}>
            {icon}
        </div>
        <div>
            <p className="text-sm font-medium app-text-muted">{title}</p>
            <p className="text-3xl font-bold text-app-text">{value}</p>
        </div>
    </div>
);

const QuickActionButton: React.FC<{ icon: string; label: string; onClick: () => void }> = ({ icon, label, onClick }) => (
    <button onClick={onClick} className="group flex flex-col items-center justify-center rounded-[20px] border border-app-border bg-white p-4 text-center text-app-textSecondary transition-colors hover:border-teal-200 hover:bg-teal-50/80 hover:text-app-text">
        <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full border border-teal-100 bg-teal-50 transition-colors group-hover:bg-teal-100">
             <i className={`${icon} text-2xl text-app-primary`}></i>
        </div>
        <span className="text-sm font-semibold">{label}</span>
    </button>
);

// ... (Existing Charts & InfoCard components are fine to reuse from previous file, just omitting them for brevity in this response but they should exist) ...
interface StatusData {
  name: Santri['status'];
  count: number;
  percentage: number;
  color: string;
}

const StatusSantriChart: React.FC<{ statusData: StatusData[]; total: number }> = ({ statusData, total }) => {
    const size = 160;
    const strokeWidth = 20;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    let accumulatedOffset = 0;
    return (
        <div className="flex flex-col md:flex-row items-center justify-center gap-6 p-4">
            <div className="relative" style={{ width: size, height: size }}>
                <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                    <circle className="text-app-border" stroke="currentColor" strokeWidth={strokeWidth} fill="transparent" r={radius} cx={size / 2} cy={size / 2} />
                    {statusData.map(status => {
                        const segmentLength = (status.percentage / 100) * circumference;
                        const offset = accumulatedOffset;
                        accumulatedOffset += segmentLength;
                        return <circle key={status.name} className={status.color} stroke="currentColor" strokeWidth={strokeWidth} strokeDasharray={`${segmentLength} ${circumference}`} strokeDashoffset={-offset} fill="transparent" r={radius} cx={size / 2} cy={size / 2} style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }} />;
                    })}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-3xl font-bold text-app-text">{total}</span><span className="text-sm app-text-muted">Total Santri</span></div>
            </div>
            <div className="flex-grow space-y-2 w-full md:w-auto">
                {statusData.map(status => (
                    <div key={status.name} className="flex items-center justify-between text-sm">
                        <div className="flex items-center"><span className={`mr-2 h-3 w-3 rounded-full ${status.color.replace('text-', 'bg-')}`}></span><span className="font-medium app-text-secondary">{status.name}</span></div>
                        <div className="font-semibold text-app-text">{status.count} <span className="text-xs app-text-muted">({status.percentage.toFixed(1)}%)</span></div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const InfoPondokCard: React.FC<{ settings: PondokSettings }> = ({ settings }) => {
    const mudirAam = settings.tenagaPengajar.find(tp => tp.id === settings.mudirAamId);
    return (
        <div className="app-panel rounded-panel p-6">
            <h2 className="mb-4 text-xl font-bold text-app-text">Informasi Pondok</h2>
            <div className="space-y-4">
                <div className="flex items-start gap-3"><i className="bi bi-bank mt-1 text-base text-app-primary"></i><div><p className="text-xs app-text-muted">Nama Pondok Pesantren</p><p className="text-sm font-semibold text-app-text">{settings.namaPonpes || '-'}</p></div></div>
                <div className="flex items-start gap-3"><i className="bi bi-person-check-fill mt-1 text-base text-app-primary"></i><div><p className="text-xs app-text-muted">Mudir A'am</p><p className="text-sm font-semibold text-app-text">{mudirAam?.nama || '-'}</p></div></div>
                <div className="flex items-start gap-3"><i className="bi bi-geo-alt-fill mt-1 text-base text-app-primary"></i><div><p className="text-xs app-text-muted">Alamat</p><p className="text-sm font-semibold text-app-text">{settings.alamat || '-'}</p></div></div>
                <div className="flex items-start gap-3"><i className="bi bi-telephone-fill mt-1 text-base text-app-primary"></i><div><p className="text-xs app-text-muted">Telepon</p><p className="text-sm font-semibold text-app-text">{settings.telepon || '-'}</p></div></div>
            </div>
        </div>
    );
};

const DashboardAvatar: React.FC<{ santri: Santri }> = ({ santri }) => {
    const hasValidPhoto = santri.fotoUrl && !santri.fotoUrl.includes('text=Foto');
    return hasValidPhoto ? <img src={santri.fotoUrl} alt={santri.namaLengkap} className="h-12 w-12 flex-shrink-0 rounded-full border border-app-border object-cover bg-slate-100" /> : <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border border-teal-100 bg-teal-50"><svg viewBox="0 0 24 24" fill="currentColor" className="mt-2 h-8 w-8 text-app-primary"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg></div>;
};

const Dashboard: React.FC<DashboardProps> = ({ navigateTo }) => {
  const { settings } = useAppContext();
  const { santriList } = useSantriContext();
  const [totalTunggakan, setTotalTunggakan] = useState(0); 
  const [activeTab, setActiveTab] = useState<'ikhtisar' | 'analitik'>('ikhtisar');
  
  // Calculate tunggakan asynchronously to avoid heavy load on mount
  useEffect(() => {
    const calc = async () => {
        const tagihan = await db.tagihan.where('status').equals('Belum Lunas').toArray();
        const total = tagihan.reduce((sum, t) => sum + t.nominal, 0);
        setTotalTunggakan(total);
    };
    calc();
  }, []);

  const totalSantri = santriList.length;
  const totalPutra = santriList.filter(s => s.jenisKelamin === 'Laki-laki').length;
  const totalPutri = totalSantri - totalPutra;

  const statusCounts = santriList.reduce((acc, santri) => {
      acc[santri.status] = (acc[santri.status] || 0) + 1;
      return acc;
  }, {} as Record<Santri['status'], number>);
  
  const statusColors: Record<Santri['status'], string> = { 
    'Aktif': 'text-teal-500', 
    'Hiatus': 'text-yellow-500', 
    'Lulus': 'text-blue-500', 
    'Keluar/Pindah': 'text-red-500', 
    'Masuk': 'text-gray-500',
    'Baru': 'text-purple-500',
    'Diterima': 'text-green-600',
    'Cadangan': 'text-orange-500',
    'Ditolak': 'text-red-700'
  };

  const statusData: StatusData[] = (['Aktif', 'Hiatus', 'Lulus', 'Keluar/Pindah', 'Masuk'] as Santri['status'][]).map(status => ({
      name: status, count: statusCounts[status] || 0, percentage: totalSantri > 0 ? ((statusCounts[status] || 0) / totalSantri) * 100 : 0, color: statusColors[status]
  }));

  const santriByJenjang = useMemo(() => settings.jenjang.map(jenjang => {
        const santriInJenjang = santriList.filter(s => s.jenjangId === jenjang.id);
        const total = santriInJenjang.length;
        const putra = santriInJenjang.filter(s => s.jenisKelamin === 'Laki-laki').length;
        const putri = total - putra;
        
        const statuses = statusData.map(s => { 
            const count = santriInJenjang.filter(santri => santri.status === s.name).length; 
            return { ...s, count, percentage: total > 0 ? (count / total) * 100 : 0 }; 
        });

        const kelasBreakdown = settings.kelas.filter(k => k.jenjangId === jenjang.id).map(kelas => {
            const santriInKelas = santriInJenjang.filter(s => s.kelasId === kelas.id);
            const rombels = settings.rombel.filter(r => r.kelasId === kelas.id).map(rombel => {
                 const santriInRombel = santriInKelas.filter(s => s.rombelId === rombel.id);
                 return {
                     id: rombel.id,
                     nama: rombel.nama,
                     total: santriInRombel.length,
                     putra: santriInRombel.filter(s => s.jenisKelamin === 'Laki-laki').length,
                     putri: santriInRombel.filter(s => s.jenisKelamin === 'Perempuan').length
                 };
            });
            return { 
                id: kelas.id, 
                nama: kelas.nama, 
                total: santriInKelas.length, 
                putra: santriInKelas.filter(s => s.jenisKelamin === 'Laki-laki').length, 
                putri: santriInKelas.filter(s => s.jenisKelamin === 'Perempuan').length,
                rombels
            };
        });

        return { id: jenjang.id, nama: jenjang.nama, total, putra, putri, statuses, kelasBreakdown };
  }), [settings.jenjang, settings.kelas, settings.rombel, santriList, statusData]);
  
  const recentSantri = [...santriList].sort((a, b) => new Date(b.tanggalMasuk).getTime() - new Date(a.tanggalMasuk).getTime()).slice(0, 5);

  return (
    <div id="dashboard-container" className="printable-content-wrapper">
        <PageHeader
            className="mb-6 no-print"
            eyebrow="Overview"
            title="Dashboard"
            tabs={
                <HeaderTabs
                    value={activeTab}
                    onChange={setActiveTab}
                    tabs={[
                        { value: 'ikhtisar', label: 'Ikhtisar Umum', icon: 'bi-grid-fill' },
                        { value: 'analitik', label: 'Analitik Strategis', icon: 'bi-graph-up-arrow', badge: <span className="rounded-full border border-teal-100 bg-teal-50 px-1.5 py-0.5 text-[10px] text-teal-700">Pro</span> },
                    ]}
                />
            }
        />

        {activeTab === 'analitik' ? (
            <Suspense
                fallback={
                    <div className="app-panel flex h-64 items-center justify-center rounded-panel">
                        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-app-primary"></div>
                    </div>
                }
            >
                <ExecutiveDashboard />
            </Suspense>
        ) : (
            <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-8 print:grid-cols-3 print:gap-4">
            <StatCard title="Total Santri" value={totalSantri} icon={<i className="bi-people-fill text-2xl text-white"></i>} color="bg-blue-500" onClick={() => navigateTo(Page.Santri)} />
            <StatCard title="Santri Putra" value={totalPutra} icon={<i className="bi bi-person text-2xl text-white"></i>} color="bg-sky-500" onClick={() => navigateTo(Page.Santri, { gender: 'Laki-laki' })} />
            <StatCard title="Santri Putri" value={totalPutri} icon={<i className="bi bi-person text-2xl text-white"></i>} color="bg-pink-500" onClick={() => navigateTo(Page.Santri, { gender: 'Perempuan' })} />
            <StatCard title="Total Tunggakan" value={(totalTunggakan / 1000000).toFixed(1) + ' Jt'} icon={<i className="bi-cash-coin text-2xl text-white"></i>} color="bg-red-500" onClick={() => navigateTo(Page.Keuangan)} />
            <StatCard title="Rombel" value={settings.rombel.length} icon={<i className="bi-building text-2xl text-white"></i>} color="bg-purple-500" />
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 print:grid-cols-2 print:gap-4">
            {/* Card 1: Komposisi Status Santri */}
            <div className="app-panel rounded-panel p-6 print:break-inside-avoid print:border print:border-gray-300 print:shadow-none">
                <h2 className="mb-4 text-xl font-bold text-app-text">Komposisi Status Santri</h2>
                <StatusSantriChart statusData={statusData} total={totalSantri} />
            </div>

            {/* Card 2: Informasi Pondok */}
            <div className="print:break-inside-avoid">
                <InfoPondokCard settings={settings} />
            </div>

            {/* Card 3: Aksi Cepat */}
            <div className="app-panel rounded-panel p-6 no-print">
                <h2 className="mb-4 text-xl font-bold text-app-text">Aksi Cepat</h2>
                <div className="grid grid-cols-2 gap-4 w-full">
                    <QuickActionButton icon="bi-person-plus-fill" label="Tambah Santri" onClick={() => navigateTo(Page.Santri)} />
                    <QuickActionButton icon="bi-diagram-3-fill" label="Data Master" onClick={() => navigateTo(Page.DataMaster)} />
                    <QuickActionButton icon="bi-cash-coin" label="Keuangan" onClick={() => navigateTo(Page.Keuangan)} />
                    <QuickActionButton icon="bi-printer-fill" label="Cetak Laporan" onClick={() => navigateTo(Page.Laporan)} />
                    <QuickActionButton icon="bi-gear-fill" label="Pengaturan" onClick={() => navigateTo(Page.Pengaturan)} />
                    <QuickActionButton icon="bi-info-circle-fill" label="Tentang" onClick={() => navigateTo(Page.Tentang)} />
                </div>
            </div>

            {/* Card 4: Santri Terbaru */}
            <div className="app-panel flex flex-col rounded-panel p-6 print:break-inside-avoid print:border print:border-gray-300 print:shadow-none">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-app-text">Santri Terbaru</h2>
                    <button onClick={() => navigateTo(Page.Santri)} className="text-sm font-medium text-app-primary hover:underline no-print">Lihat Semua</button>
                </div>
                <div className="flex-grow flex flex-col justify-center">
                    <ul className="space-y-4">
                        {recentSantri.map(santri => (
                            <li key={santri.id} className="flex items-center gap-4 rounded-[18px] border border-app-border bg-white px-3 py-3">
                                <div className="no-print">
                                    <DashboardAvatar santri={santri} />
                                </div>
                                <div className="flex-grow">
                                    <p className="text-sm font-semibold text-app-text">{santri.namaLengkap}</p>
                                    <p className="text-xs app-text-muted">{settings.rombel.find(r => r.id === santri.rombelId)?.nama || 'N/A'}</p>
                                </div>
                                <span className="flex-shrink-0 text-xs app-text-muted">{new Date(santri.tanggalMasuk).toLocaleDateString()}</span>
                            </li>
                        ))}
                        {recentSantri.length === 0 && <p className="py-4 text-center app-text-muted">Belum ada data santri baru.</p>}
                    </ul>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 gap-6 print:block">
            <div className="app-panel rounded-panel p-6 print:border-none print:p-0 print:shadow-none print:border print:border-gray-300">
                <h2 className="mb-4 text-xl font-bold text-app-text print:mb-6 print:text-black">Distribusi Santri per Jenjang</h2>
                <div className="space-y-8 print:space-y-8">
                    {santriByJenjang.map(item => (
                        <div key={item.id} className="print:break-inside-avoid app-panel-soft rounded-[24px] p-5">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <span className="text-lg font-bold text-app-text">{item.nama}</span>
                                    <div className="mt-1 flex items-center gap-4 text-sm app-text-muted print:text-black">
                                        <span className="flex items-center gap-1.5"><i className="bi bi-person text-blue-500 print:text-black"></i> {item.putra} Putra</span>
                                        <span className="flex items-center gap-1.5"><i className="bi bi-person text-pink-500 print:text-black"></i> {item.putri} Putri</span>
                                    </div>
                                </div>
                                <span className="text-lg font-semibold text-app-text print:text-black">{item.total} <span className="text-sm font-normal app-text-muted print:text-black">Santri</span></span>
                            </div>
                            
                            {/* Progress Bar */}
                            <div className="mb-4 flex h-4 w-full overflow-hidden rounded-full bg-slate-100 print:h-3 print:border print:border-gray-400">
                                {item.statuses.filter(s => s.count > 0).map(s => (
                                    <div key={s.name} className={`${s.color.replace('text-', 'bg-')} print:bg-gray-600`} style={{ width: `${s.percentage}%` }} title={`${s.name}: ${s.count} santri`}></div>
                                ))}
                            </div>

                            {/* Detailed Breakdown */}
                            <div className="rounded-[20px] border border-app-border bg-white p-4 print:border-gray-300 print:bg-white">
                                <h4 className="mb-3 border-b border-app-border pb-2 text-xs font-bold uppercase tracking-wider app-text-muted">Detail Kelas & Rombel</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 print:grid-cols-2">
                                    {item.kelasBreakdown.map(kelas => (
                                        <div key={kelas.id} className="rounded-[18px] border border-app-border bg-slate-50 p-3 shadow-soft print:border-gray-400 print:shadow-none">
                                            <div className="mb-2 flex items-center justify-between border-b border-app-border pb-1">
                                                <span className="text-sm font-bold text-app-text print:text-black">{kelas.nama}</span>
                                                <span className="rounded-full border border-app-border bg-white px-2 py-0.5 text-xs font-bold app-text-secondary print:border-gray-400 print:bg-transparent print:text-black">{kelas.total}</span>
                                            </div>
                                            <div className="space-y-1.5">
                                                {kelas.rombels.map(rombel => (
                                                    <div key={rombel.id} className="flex items-center justify-between text-xs app-text-secondary print:text-black">
                                                        <span className="font-medium truncate pr-2">{rombel.nama}</span>
                                                        <div className="flex gap-2 flex-shrink-0 text-[10px] font-mono">
                                                            <span className="text-blue-600 print:text-black">L:{rombel.putra}</span>
                                                            <span className="text-pink-600 print:text-black">P:{rombel.putri}</span>
                                                            <span className="font-bold text-app-text print:text-black">T:{rombel.total}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                                {kelas.rombels.length === 0 && <div className="text-xs italic app-text-muted">Belum ada rombel</div>}
                                            </div>
                                        </div>
                                    ))}
                                    {item.kelasBreakdown.length === 0 && <div className="col-span-full text-xs italic app-text-muted">Belum ada data kelas.</div>}
                                </div>
                            </div>
                        </div>
                    ))}
                    {santriByJenjang.length === 0 && <p className="py-4 text-center app-text-muted">Data jenjang belum diatur.</p>}
                </div>
            </div>
        </div>
        </>
        )}
    </div>
  );
};

export default Dashboard;
