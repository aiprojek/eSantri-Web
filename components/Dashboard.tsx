


import React, { useMemo, useState, useEffect } from 'react';
import { Santri, PondokSettings, Page } from '../types';
import { useAppContext } from '../AppContext';
import { useSantriContext } from '../contexts/SantriContext';
import { db } from '../db';

interface DashboardProps {
    navigateTo: (page: Page, filters?: any) => void;
}

const StatCard: React.FC<{ icon: React.ReactNode; title: string; value: string | number; color: string; onClick?: () => void }> = ({ icon, title, value, color, onClick }) => (
    <div 
        className={`bg-white p-5 rounded-xl shadow-md flex flex-col justify-between transition-transform transform hover:-translate-y-1 ${onClick ? 'cursor-pointer hover:shadow-lg' : ''}`}
        onClick={onClick}
    >
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${color} mb-4`}>
            {icon}
        </div>
        <div>
            <p className="text-gray-500 text-sm font-medium">{title}</p>
            <p className="text-3xl font-bold text-gray-800">{value}</p>
        </div>
    </div>
);

const QuickActionButton: React.FC<{ icon: string; label: string; onClick: () => void }> = ({ icon, label, onClick }) => (
    <button onClick={onClick} className="flex flex-col items-center justify-center p-4 text-center text-gray-700 rounded-lg hover:bg-gray-100 transition-colors group">
        <div className="w-12 h-12 rounded-full flex items-center justify-center bg-gray-100 group-hover:bg-teal-100 mb-2 transition-colors">
             <i className={`${icon} text-2xl text-teal-600`}></i>
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
                    <circle className="text-gray-200" stroke="currentColor" strokeWidth={strokeWidth} fill="transparent" r={radius} cx={size / 2} cy={size / 2} />
                    {statusData.map(status => {
                        const segmentLength = (status.percentage / 100) * circumference;
                        const offset = accumulatedOffset;
                        accumulatedOffset += segmentLength;
                        return <circle key={status.name} className={status.color} stroke="currentColor" strokeWidth={strokeWidth} strokeDasharray={`${segmentLength} ${circumference}`} strokeDashoffset={-offset} fill="transparent" r={radius} cx={size / 2} cy={size / 2} style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }} />;
                    })}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-3xl font-bold text-gray-800">{total}</span><span className="text-sm text-gray-500">Total Santri</span></div>
            </div>
            <div className="flex-grow space-y-2 w-full md:w-auto">
                {statusData.map(status => (
                    <div key={status.name} className="flex items-center justify-between text-sm">
                        <div className="flex items-center"><span className={`w-3 h-3 rounded-full mr-2 ${status.color.replace('text-', 'bg-')}`}></span><span className="font-medium text-gray-600">{status.name}</span></div>
                        <div className="font-semibold text-gray-800">{status.count} <span className="text-xs text-gray-500">({status.percentage.toFixed(1)}%)</span></div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const InfoPondokCard: React.FC<{ settings: PondokSettings }> = ({ settings }) => {
    const mudirAam = settings.tenagaPengajar.find(tp => tp.id === settings.mudirAamId);
    return (
        <div className="bg-white p-6 rounded-xl shadow-md h-full flex flex-col">
            <h2 className="text-xl font-bold text-gray-700 mb-4">Informasi Pondok</h2>
            <div className="space-y-4 my-auto">
                <div className="flex items-start gap-3"><i className="bi bi-bank text-base text-teal-600 mt-1"></i><div><p className="text-xs text-gray-500">Nama Pondok Pesantren</p><p className="text-sm font-semibold text-gray-800">{settings.namaPonpes || '-'}</p></div></div>
                <div className="flex items-start gap-3"><i className="bi bi-person-check-fill text-base text-teal-600 mt-1"></i><div><p className="text-xs text-gray-500">Mudir A'am</p><p className="text-sm font-semibold text-gray-800">{mudirAam?.nama || '-'}</p></div></div>
                <div className="flex items-start gap-3"><i className="bi bi-geo-alt-fill text-base text-teal-600 mt-1"></i><div><p className="text-xs text-gray-500">Alamat</p><p className="text-sm font-semibold text-gray-800">{settings.alamat || '-'}</p></div></div>
                <div className="flex items-start gap-3"><i className="bi bi-telephone-fill text-base text-teal-600 mt-1"></i><div><p className="text-xs text-gray-500">Telepon</p><p className="text-sm font-semibold text-gray-800">{settings.telepon || '-'}</p></div></div>
            </div>
        </div>
    );
};

const DashboardAvatar: React.FC<{ santri: Santri }> = ({ santri }) => {
    const hasValidPhoto = santri.fotoUrl && !santri.fotoUrl.includes('text=Foto');
    return hasValidPhoto ? <img src={santri.fotoUrl} alt={santri.namaLengkap} className="w-12 h-12 rounded-full object-cover bg-gray-200 flex-shrink-0 border border-gray-200" /> : <div className="w-12 h-12 rounded-full bg-teal-50 flex items-center justify-center flex-shrink-0 border border-teal-200 overflow-hidden"><svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-teal-600 mt-2"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg></div>;
};

const Dashboard: React.FC<DashboardProps> = ({ navigateTo }) => {
  const { settings } = useAppContext();
  const { santriList } = useSantriContext();
  const [totalTunggakan, setTotalTunggakan] = useState(0); // Lightweight stats
  
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

  const handlePrint = () => {
      window.print();
  };

  return (
    <div className="printable-content-wrapper">
        <div className="flex justify-between items-center mb-6 no-print">
            <div>
                <h1 className="text-3xl font-bold text-gray-800 mb-2">Dashboard</h1>
                <p className="text-gray-600">Selamat datang! Berikut adalah ringkasan data di {settings.namaPonpes}</p>
            </div>
            <button onClick={handlePrint} className="bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-900 flex items-center gap-2 shadow-sm transition-colors">
                <i className="bi bi-printer-fill"></i> Cetak Dashboard
            </button>
        </div>

        {/* Print Header (Visible only in print) */}
        <div className="hidden print:block mb-8 text-center border-b pb-4">
            <h1 className="text-2xl font-bold uppercase">{settings.namaPonpes}</h1>
            <p className="text-sm text-gray-600">{settings.alamat}</p>
            <h2 className="text-xl font-bold mt-4">LAPORAN RINGKASAN DASHBOARD</h2>
            <p className="text-xs text-gray-500">Dicetak pada: {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-8 print:grid-cols-3 print:gap-4">
            <StatCard title="Total Santri" value={totalSantri} icon={<i className="bi-people-fill text-2xl text-white"></i>} color="bg-blue-500" onClick={() => navigateTo(Page.Santri)} />
            <StatCard title="Santri Putra" value={totalPutra} icon={<i className="bi bi-person text-2xl text-white"></i>} color="bg-sky-500" onClick={() => navigateTo(Page.Santri, { gender: 'Laki-laki' })} />
            <StatCard title="Santri Putri" value={totalPutri} icon={<i className="bi bi-person text-2xl text-white"></i>} color="bg-pink-500" onClick={() => navigateTo(Page.Santri, { gender: 'Perempuan' })} />
            <StatCard title="Total Tunggakan" value={(totalTunggakan / 1000000).toFixed(1) + ' Jt'} icon={<i className="bi-cash-coin text-2xl text-white"></i>} color="bg-red-500" onClick={() => navigateTo(Page.Keuangan)} />
            <StatCard title="Rombel" value={settings.rombel.length} icon={<i className="bi-building text-2xl text-white"></i>} color="bg-purple-500" />
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 print:grid-cols-2 print:gap-4">
            <div className="bg-white p-6 rounded-xl shadow-md print:shadow-none print:border print:border-gray-300 print:break-inside-avoid">
                <h2 className="text-xl font-bold text-gray-700 mb-4">Komposisi Status Santri</h2>
                <StatusSantriChart statusData={statusData} total={totalSantri} />
            </div>
            <div className="flex flex-col gap-6 print:gap-4">
                 <div className="print:break-inside-avoid h-full">
                    <InfoPondokCard settings={settings} />
                 </div>
                 <div className="bg-white p-6 rounded-xl shadow-md print:shadow-none print:border print:border-gray-300 print:break-inside-avoid flex-grow">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-gray-700">Santri Terbaru</h2>
                        <button onClick={() => navigateTo(Page.Santri)} className="text-sm font-medium text-teal-600 hover:underline no-print">Lihat Semua</button>
                    </div>
                    <ul className="space-y-4">
                        {recentSantri.map(santri => (
                            <li key={santri.id} className="flex items-center gap-4">
                                <div className="no-print">
                                    <DashboardAvatar santri={santri} />
                                </div>
                                <div className="flex-grow">
                                    <p className="font-semibold text-sm text-gray-800">{santri.namaLengkap}</p>
                                    <p className="text-xs text-gray-500">{settings.rombel.find(r => r.id === santri.rombelId)?.nama || 'N/A'}</p>
                                </div>
                                <span className="text-xs text-gray-400 flex-shrink-0">{new Date(santri.tanggalMasuk).toLocaleDateString()}</span>
                            </li>
                        ))}
                        {recentSantri.length === 0 && <p className="text-center text-gray-500 py-4">Belum ada data santri baru.</p>}
                    </ul>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 gap-6 mb-6 no-print">
             <div className="bg-white p-6 rounded-xl shadow-md flex flex-col">
                <h2 className="text-xl font-bold text-gray-700 mb-4">Aksi Cepat</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-auto">
                    <QuickActionButton icon="bi-person-plus-fill" label="Tambah Santri" onClick={() => navigateTo(Page.Santri)} />
                    <QuickActionButton icon="bi-person-lines-fill" label="Pendaftaran (PSB)" onClick={() => navigateTo(Page.PSB)} />
                    <QuickActionButton icon="bi-printer-fill" label="Cetak Laporan" onClick={() => navigateTo(Page.Laporan)} />
                    <QuickActionButton icon="bi-gear-fill" label="Pengaturan" onClick={() => navigateTo(Page.Pengaturan)} />
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 gap-6 print:block">
            <div className="bg-white p-6 rounded-xl shadow-md print:shadow-none print:border print:border-gray-300 print:p-0 print:border-none">
                <h2 className="text-xl font-bold text-gray-700 mb-4 print:mb-6 print:text-black">Distribusi Santri per Jenjang</h2>
                <div className="space-y-8 print:space-y-8">
                    {santriByJenjang.map(item => (
                        <div key={item.id} className="print:break-inside-avoid">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <span className="text-lg font-bold text-gray-800">{item.nama}</span>
                                    <div className="flex items-center gap-4 text-sm text-gray-500 mt-1 print:text-black">
                                        <span className="flex items-center gap-1.5"><i className="bi bi-person text-blue-500 print:text-black"></i> {item.putra} Putra</span>
                                        <span className="flex items-center gap-1.5"><i className="bi bi-person text-pink-500 print:text-black"></i> {item.putri} Putri</span>
                                    </div>
                                </div>
                                <span className="text-lg font-semibold text-gray-800 print:text-black">{item.total} <span className="text-sm font-normal text-gray-500 print:text-black">Santri</span></span>
                            </div>
                            
                            {/* Progress Bar */}
                            <div className="w-full bg-gray-200 rounded-full h-4 flex overflow-hidden mb-4 print:border print:border-gray-400 print:h-3">
                                {item.statuses.filter(s => s.count > 0).map(s => (
                                    <div key={s.name} className={`${s.color.replace('text-', 'bg-')} print:bg-gray-600`} style={{ width: `${s.percentage}%` }} title={`${s.name}: ${s.count} santri`}></div>
                                ))}
                            </div>

                            {/* Detailed Breakdown */}
                            <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 print:bg-white print:border-gray-300">
                                <h4 className="text-xs font-bold text-gray-500 uppercase mb-3 tracking-wider border-b pb-2">Detail Kelas & Rombel</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 print:grid-cols-2">
                                    {item.kelasBreakdown.map(kelas => (
                                        <div key={kelas.id} className="bg-white p-3 rounded border border-gray-200 shadow-sm print:shadow-none print:border-gray-400">
                                            <div className="flex justify-between items-center mb-2 pb-1 border-b border-gray-100">
                                                <span className="font-bold text-gray-700 text-sm print:text-black">{kelas.nama}</span>
                                                <span className="text-xs font-bold bg-gray-100 px-2 py-0.5 rounded text-gray-600 print:bg-transparent print:text-black print:border print:border-gray-400">{kelas.total}</span>
                                            </div>
                                            <div className="space-y-1.5">
                                                {kelas.rombels.map(rombel => (
                                                    <div key={rombel.id} className="flex justify-between items-center text-xs text-gray-600 print:text-black">
                                                        <span className="font-medium truncate pr-2">{rombel.nama}</span>
                                                        <div className="flex gap-2 flex-shrink-0 text-[10px] font-mono">
                                                            <span className="text-blue-600 print:text-black">L:{rombel.putra}</span>
                                                            <span className="text-pink-600 print:text-black">P:{rombel.putri}</span>
                                                            <span className="font-bold text-gray-800 print:text-black">T:{rombel.total}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                                {kelas.rombels.length === 0 && <div className="text-xs text-gray-400 italic">Belum ada rombel</div>}
                                            </div>
                                        </div>
                                    ))}
                                    {item.kelasBreakdown.length === 0 && <div className="text-xs text-gray-400 italic col-span-full">Belum ada data kelas.</div>}
                                </div>
                            </div>
                        </div>
                    ))}
                    {santriByJenjang.length === 0 && <p className="text-center text-gray-500 py-4">Data jenjang belum diatur.</p>}
                </div>
            </div>
        </div>
    </div>
  );
};

export default Dashboard;