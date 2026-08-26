
import React, { Suspense, lazy, useMemo, useState, useEffect } from 'react';
import { Santri, PondokSettings, Page } from '../types';
import { useAppContext } from '../AppContext';
import { useSantriContext } from '../contexts/SantriContext';
import { db } from '../db';
import { PageHeader } from './common/PageHeader';
import { HeaderTabs } from './common/HeaderTabs';
import { isSantriPutra, isSantriPutri } from '../utils/formatters';

const ExecutiveDashboard = lazy(() =>
  import('./dashboard/ExecutiveDashboard').then((module) => ({
    default: module.ExecutiveDashboard,
  }))
);

interface DashboardProps {
    navigateTo: (page: Page, filters?: any) => void;
}

const StatCard: React.FC<{ 
    icon: React.ReactNode; 
    title: string; 
    value: string | number; 
    subtitle?: string;
    color: string; 
    badge?: React.ReactNode;
    onClick?: () => void 
}> = ({ icon, title, value, subtitle, color, badge, onClick }) => (
    <div 
        className={`app-panel-elevated flex flex-col justify-between rounded-panel p-5 transition-transform transform hover:-translate-y-1 ${onClick ? 'cursor-pointer' : ''}`}
        onClick={onClick}
    >
        <div className="flex items-center justify-between mb-4">
            <div className={`flex h-12 w-12 items-center justify-center rounded-[18px] ${color}`}>
                {icon}
            </div>
            {badge}
        </div>
        <div>
            <p className="text-xs font-semibold uppercase tracking-wider app-text-muted">{title}</p>
            <p className="text-3xl font-bold text-app-text mt-1">{value}</p>
            {subtitle && <p className="text-xs font-medium text-slate-500 mt-1">{subtitle}</p>}
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

interface StatusData {
  name: Santri['status'];
  count: number;
  percentage: number;
  color: string;
}

const StatusSantriChart: React.FC<{ 
    statusData: StatusData[]; 
    total: number; 
    activeCount: number;
    onSelectStatus?: (status: Santri['status']) => void;
}> = ({ statusData, total, activeCount, onSelectStatus }) => {
    const size = 170;
    const strokeWidth = 22;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    let accumulatedOffset = 0;
    return (
        <div className="flex flex-col md:flex-row items-center justify-center gap-6 p-4">
            <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
                <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                    <circle className="text-slate-100" stroke="currentColor" strokeWidth={strokeWidth} fill="transparent" r={radius} cx={size / 2} cy={size / 2} />
                    {statusData.map(status => {
                        const segmentLength = (status.percentage / 100) * circumference;
                        const offset = accumulatedOffset;
                        accumulatedOffset += segmentLength;
                        return <circle key={status.name} className={status.color} stroke="currentColor" strokeWidth={strokeWidth} strokeDasharray={`${segmentLength} ${circumference}`} strokeDashoffset={-offset} fill="transparent" r={radius} cx={size / 2} cy={size / 2} style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }} />;
                    })}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-2">
                    <span className="text-2xl font-black text-app-text leading-tight">{activeCount}</span>
                    <span className="text-[11px] font-bold text-teal-600 uppercase tracking-wide">Santri Aktif</span>
                    <span className="text-[10px] text-slate-400 font-medium">dari {total} total</span>
                </div>
            </div>
            <div className="flex-grow space-y-2 w-full">
                {statusData.map(status => (
                    <button
                        key={status.name}
                        type="button"
                        onClick={() => onSelectStatus?.(status.name)}
                        className={`w-full flex items-center justify-between text-sm py-1.5 px-2.5 rounded-lg border border-transparent transition-all text-left ${onSelectStatus ? 'hover:bg-slate-50 hover:border-slate-200 cursor-pointer' : ''}`}
                        title={onSelectStatus ? `Klik untuk filter santri berstatus ${status.name}` : undefined}
                    >
                        <div className="flex items-center">
                            <span className={`mr-2.5 h-3 w-3 rounded-full flex-shrink-0 ${status.color.replace('text-', 'bg-')}`}></span>
                            <span className="font-medium app-text-secondary">{status.name}</span>
                        </div>
                        <div className="font-semibold text-app-text flex items-center gap-1.5">
                            <span>{status.count}</span>
                            <span className="text-xs text-slate-400 font-normal">({status.percentage.toFixed(1)}%)</span>
                            {onSelectStatus && <i className="bi bi-chevron-right text-[10px] text-slate-300 ml-1"></i>}
                        </div>
                    </button>
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
  const [viewScope, setViewScope] = useState<'aktif' | 'semua'>('aktif');
  
  // Calculate tunggakan asynchronously to avoid heavy load on mount
  useEffect(() => {
    const calc = async () => {
        const tagihan = await db.tagihan.where('status').equals('Belum Lunas').toArray();
        const total = tagihan.reduce((sum, t) => sum + t.nominal, 0);
        setTotalTunggakan(total);
    };
    calc();
  }, []);

  // Total counts across entire database
  const totalSantri = santriList.length;
  const activeSantri = useMemo(() => santriList.filter(s => s.status === 'Aktif'), [santriList]);
  const activeSantriCount = activeSantri.length;
  
  const activePutraCount = useMemo(() => activeSantri.filter(s => isSantriPutra(s)).length, [activeSantri]);
  const activePutriCount = useMemo(() => activeSantri.filter(s => isSantriPutri(s)).length, [activeSantri]);

  const allPutraCount = useMemo(() => santriList.filter(s => isSantriPutra(s)).length, [santriList]);
  const allPutriCount = useMemo(() => santriList.filter(s => isSantriPutri(s)).length, [santriList]);

  // Current displayed santri dataset based on viewScope toggle
  const currentSantriList = viewScope === 'aktif' ? activeSantri : santriList;
  const currentTotal = currentSantriList.length;
  const currentPutra = viewScope === 'aktif' ? activePutraCount : allPutraCount;
  const currentPutri = viewScope === 'aktif' ? activePutriCount : allPutriCount;

  // Status breakdown counts
  const statusCounts = useMemo(() => santriList.reduce((acc, santri) => {
      acc[santri.status] = (acc[santri.status] || 0) + 1;
      return acc;
  }, {} as Record<Santri['status'], number>), [santriList]);
  
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

  const statusData: StatusData[] = useMemo(() => {
    return (['Aktif', 'Hiatus', 'Lulus', 'Keluar/Pindah'] as Santri['status'][]).map(status => ({
        name: status, 
        count: statusCounts[status] || 0, 
        percentage: totalSantri > 0 ? ((statusCounts[status] || 0) / totalSantri) * 100 : 0, 
        color: statusColors[status] || 'text-gray-400'
    }));
  }, [statusCounts, totalSantri]);

  // Distribution per Jenjang, Kelas, and Rombel (using currentSantriList and type-coercion safe matching)
  const santriByJenjang = useMemo(() => settings.jenjang.map(jenjang => {
        const santriInJenjang = currentSantriList.filter(s => Number(s.jenjangId) === Number(jenjang.id));
        const total = santriInJenjang.length;
        const putra = santriInJenjang.filter(s => isSantriPutra(s)).length;
        const putri = santriInJenjang.filter(s => isSantriPutri(s)).length;
        
        const statuses = statusData.map(s => { 
            const count = santriInJenjang.filter(santri => santri.status === s.name).length; 
            return { ...s, count, percentage: total > 0 ? (count / total) * 100 : 0 }; 
        });

        const kelasBreakdown = settings.kelas.filter(k => Number(k.jenjangId) === Number(jenjang.id)).map(kelas => {
            const santriInKelas = santriInJenjang.filter(s => Number(s.kelasId) === Number(kelas.id));
            const rombels = settings.rombel.filter(r => Number(r.kelasId) === Number(kelas.id)).map(rombel => {
                 const santriInRombel = santriInKelas.filter(s => Number(s.rombelId) === Number(rombel.id));
                 return {
                     id: rombel.id,
                     nama: rombel.nama,
                     total: santriInRombel.length,
                     putra: santriInRombel.filter(s => isSantriPutra(s)).length,
                     putri: santriInRombel.filter(s => isSantriPutri(s)).length
                 };
            });
            return { 
                id: kelas.id, 
                nama: kelas.nama, 
                total: santriInKelas.length, 
                putra: santriInKelas.filter(s => isSantriPutra(s)).length, 
                putri: santriInKelas.filter(s => isSantriPutri(s)).length,
                rombels
            };
        });

        return { id: jenjang.id, nama: jenjang.nama, total, putra, putri, statuses, kelasBreakdown };
  }), [settings.jenjang, settings.kelas, settings.rombel, currentSantriList, statusData]);
  
  const recentSantri = [...santriList].sort((a, b) => new Date(b.tanggalMasuk).getTime() - new Date(a.tanggalMasuk).getTime()).slice(0, 5);

  return (
    <div id="dashboard-container" className="printable-content-wrapper space-y-6">
        <PageHeader
            className="no-print"
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
                {/* Focus Scope Switcher & Quick Navigation */}
                <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-app-border rounded-panel p-3 sm:px-4 shadow-sm">
                    <div className="flex items-center gap-2.5">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Fokus Tampilan:</span>
                        <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                            <button
                                type="button"
                                onClick={() => setViewScope('aktif')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${viewScope === 'aktif' ? 'bg-teal-700 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                            >
                                <i className="bi bi-person-check-fill"></i>
                                <span>Santri Aktif ({activeSantriCount})</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewScope('semua')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${viewScope === 'semua' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                            >
                                <i className="bi bi-people-fill"></i>
                                <span>Semua Terdaftar ({totalSantri})</span>
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => navigateTo(Page.Santri)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100 transition-colors"
                        >
                            <i className="bi bi-person-lines-fill"></i>
                            <span>Buka Data Santri</span>
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 print:grid-cols-3 print:gap-4">
                    <StatCard 
                        title={viewScope === 'aktif' ? "Santri Aktif" : "Total Terdaftar"} 
                        value={currentTotal} 
                        subtitle={viewScope === 'aktif' ? `dari ${totalSantri} total santri terdaftar` : `${activeSantriCount} santri berstatus aktif`}
                        icon={<i className="bi-people-fill text-2xl text-white"></i>} 
                        color="bg-teal-600" 
                        badge={
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${viewScope === 'aktif' ? 'bg-teal-50 text-teal-700 border border-teal-200' : 'bg-slate-100 text-slate-700 border border-slate-200'}`}>
                                {viewScope === 'aktif' ? 'Aktif' : 'Semua'}
                            </span>
                        }
                        onClick={() => navigateTo(Page.Santri, { status: viewScope === 'aktif' ? 'Aktif' : undefined })} 
                    />
                    <StatCard 
                        title={viewScope === 'aktif' ? "Santri Putra (Aktif)" : "Santri Putra"} 
                        value={currentPutra} 
                        subtitle={`${totalSantri > 0 ? ((currentPutra / (currentTotal || 1)) * 100).toFixed(0) : 0}% dari ${viewScope === 'aktif' ? 'santri aktif' : 'total'}`}
                        icon={<i className="bi bi-person text-2xl text-white"></i>} 
                        color="bg-sky-500" 
                        onClick={() => navigateTo(Page.Santri, { gender: 'Laki-laki', status: viewScope === 'aktif' ? 'Aktif' : undefined })} 
                    />
                    <StatCard 
                        title={viewScope === 'aktif' ? "Santri Putri (Aktif)" : "Santri Putri"} 
                        value={currentPutri} 
                        subtitle={`${totalSantri > 0 ? ((currentPutri / (currentTotal || 1)) * 100).toFixed(0) : 0}% dari ${viewScope === 'aktif' ? 'santri aktif' : 'total'}`}
                        icon={<i className="bi bi-person text-2xl text-white"></i>} 
                        color="bg-pink-500" 
                        onClick={() => navigateTo(Page.Santri, { gender: 'Perempuan', status: viewScope === 'aktif' ? 'Aktif' : undefined })} 
                    />
                    <StatCard 
                        title="Total Tunggakan" 
                        value={(totalTunggakan / 1000000).toFixed(1) + ' Jt'} 
                        subtitle="SPP & tagihan belum lunas"
                        icon={<i className="bi-cash-coin text-2xl text-white"></i>} 
                        color="bg-amber-500" 
                        onClick={() => navigateTo(Page.Keuangan)} 
                    />
                    <StatCard 
                        title="Rombel Aktif" 
                        value={settings.rombel.length} 
                        subtitle={`${settings.kelas.length} kelas di ${settings.jenjang.length} jenjang`}
                        icon={<i className="bi-building text-2xl text-white"></i>} 
                        color="bg-purple-500" 
                    />
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:grid-cols-2 print:gap-4">
                    {/* Card 1: Komposisi Status Santri */}
                    <div className="app-panel rounded-panel p-6 print:break-inside-avoid print:border print:border-gray-300 print:shadow-none">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-app-text">Komposisi Status Santri</h2>
                            <span className="text-xs text-slate-500 font-medium">{totalSantri} Terdaftar</span>
                        </div>
                        <StatusSantriChart 
                            statusData={statusData} 
                            total={totalSantri} 
                            activeCount={activeSantriCount} 
                            onSelectStatus={(status) => navigateTo(Page.Santri, { status })}
                        />
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
                                        <div className="flex-grow min-w-0">
                                            <p className="text-sm font-semibold text-app-text truncate">{santri.namaLengkap}</p>
                                            <p className="text-xs app-text-muted">{settings.rombel.find(r => Number(r.id) === Number(santri.rombelId))?.nama || 'N/A'}</p>
                                        </div>
                                        <div className="flex flex-col items-end flex-shrink-0">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${santri.status === 'Aktif' ? 'bg-teal-50 text-teal-700' : 'bg-slate-100 text-slate-600'}`}>{santri.status}</span>
                                            <span className="text-[10px] app-text-muted mt-1">{new Date(santri.tanggalMasuk).toLocaleDateString()}</span>
                                        </div>
                                    </li>
                                ))}
                                {recentSantri.length === 0 && <p className="py-4 text-center app-text-muted">Belum ada data santri baru.</p>}
                            </ul>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6 print:block">
                    <div className="app-panel rounded-panel p-6 print:border-none print:p-0 print:shadow-none print:border print:border-gray-300">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 print:mb-6">
                            <div>
                                <h2 className="text-xl font-bold text-app-text print:text-black">Distribusi Santri per Jenjang & Rombel</h2>
                                <p className="text-xs text-slate-500">
                                    Menampilkan data: <strong className="text-teal-700">{viewScope === 'aktif' ? 'Santri Aktif Saja' : 'Semua Santri (Termasuk Lulus/Keluar)'}</strong>
                                </p>
                            </div>
                            <div className="no-print inline-flex items-center gap-2 bg-slate-100 px-2.5 py-1 rounded-lg text-xs">
                                <span className="text-slate-600 font-medium">Filter:</span>
                                <button 
                                    onClick={() => setViewScope(viewScope === 'aktif' ? 'semua' : 'aktif')}
                                    className="font-bold text-teal-700 hover:underline"
                                >
                                    {viewScope === 'aktif' ? 'Tampilkan Semua Data' : 'Tampilkan Santri Aktif Saja'}
                                </button>
                            </div>
                        </div>

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
                                                        <span className="rounded-full border border-app-border bg-white px-2 py-0.5 text-xs font-bold app-text-secondary print:border-gray-400 print:bg-transparent print:text-black">{kelas.total} Santri</span>
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        {kelas.rombels.map(rombel => (
                                                            <div key={rombel.id} className="flex items-center justify-between text-xs app-text-secondary print:text-black py-1 px-1.5 rounded hover:bg-white transition-colors">
                                                                <span className="font-medium truncate pr-2" title={rombel.nama}>{rombel.nama}</span>
                                                                <div className="flex gap-2 flex-shrink-0 text-[11px] font-mono">
                                                                    <span className="text-blue-600 font-semibold print:text-black" title="Putra">L: {rombel.putra}</span>
                                                                    <span className="text-pink-600 font-semibold print:text-black" title="Putri">P: {rombel.putri}</span>
                                                                    <span className="font-bold text-app-text print:text-black" title="Total">T: {rombel.total}</span>
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

