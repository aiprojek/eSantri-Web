
import React, { useMemo } from 'react';
import { Santri, PondokSettings, Page } from '../types';
import { useAppContext } from '../AppContext';

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

interface StatusData {
  name: 'Aktif' | 'Hiatus' | 'Lulus' | 'Keluar/Pindah' | 'Masuk';
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
                    <circle
                        className="text-gray-200"
                        stroke="currentColor"
                        strokeWidth={strokeWidth}
                        fill="transparent"
                        r={radius}
                        cx={size / 2}
                        cy={size / 2}
                    />
                    {statusData.map(status => {
                        const segmentLength = (status.percentage / 100) * circumference;
                        const offset = accumulatedOffset;
                        accumulatedOffset += segmentLength;

                        return (
                            <circle
                                key={status.name}
                                className={status.color}
                                stroke="currentColor"
                                strokeWidth={strokeWidth}
                                strokeDasharray={`${segmentLength} ${circumference}`}
                                strokeDashoffset={-offset}
                                fill="transparent"
                                r={radius}
                                cx={size / 2}
                                cy={size / 2}
                                style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}
                            />
                        );
                    })}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold text-gray-800">{total}</span>
                    <span className="text-sm text-gray-500">Total Santri</span>
                </div>
            </div>
            <div className="flex-grow space-y-2 w-full md:w-auto">
                {statusData.map(status => (
                    <div key={status.name} className="flex items-center justify-between text-sm">
                        <div className="flex items-center">
                            <span className={`w-3 h-3 rounded-full mr-2 ${status.color.replace('text-', 'bg-')}`}></span>
                            <span className="font-medium text-gray-600">{status.name}</span>
                        </div>
                        <div className="font-semibold text-gray-800">
                            {status.count} <span className="text-xs text-gray-500">({status.percentage.toFixed(1)}%)</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const InfoPondokCard: React.FC<{ settings: PondokSettings }> = ({ settings }) => {
    const mudirAam = settings.tenagaPengajar.find(tp => tp.id === settings.mudirAamId);

    const InfoItem: React.FC<{ icon: string; label: string; value?: string }> = ({ icon, label, value }) => (
        <div className="flex items-start gap-3">
            <i className={`${icon} text-base text-teal-600 mt-1`}></i>
            <div>
                <p className="text-xs text-gray-500">{label}</p>
                <p className="text-sm font-semibold text-gray-800">{value || '-'}</p>
            </div>
        </div>
    );

    return (
        <div className="bg-white p-6 rounded-xl shadow-md h-full flex flex-col">
            <h2 className="text-xl font-bold text-gray-700 mb-4">Informasi Pondok</h2>
            <div className="space-y-4 my-auto">
                <InfoItem icon="bi-bank" label="Nama Pondok Pesantren" value={settings.namaPonpes} />
                <InfoItem icon="bi-person-check-fill" label="Mudir A'am" value={mudirAam?.nama} />
                <InfoItem icon="bi-geo-alt-fill" label="Alamat" value={settings.alamat} />
                <InfoItem icon="bi-telephone-fill" label="Telepon" value={settings.telepon} />
            </div>
        </div>
    );
};

// --- Avatar Component for Dashboard ---
const DashboardAvatar: React.FC<{ santri: Santri }> = ({ santri }) => {
    // Treat placeholder URL with text as no photo
    const hasValidPhoto = santri.fotoUrl && !santri.fotoUrl.includes('text=Foto');

    if (hasValidPhoto) {
        return (
            <img 
                src={santri.fotoUrl}
                alt={santri.namaLengkap}
                className="w-12 h-12 rounded-full object-cover bg-gray-200 flex-shrink-0 border border-gray-200"
            />
        );
    }
    
    // Abstract Neutral Avatar
    return (
        <div className="w-12 h-12 rounded-full bg-teal-50 flex items-center justify-center flex-shrink-0 border border-teal-200 overflow-hidden">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-teal-600 mt-2">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
        </div>
    );
};


const Dashboard: React.FC<DashboardProps> = ({ navigateTo }) => {
  const { santriList, settings } = useAppContext();
  
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
    'Masuk': 'text-gray-500'
  };

  const statusData: StatusData[] = (['Aktif', 'Hiatus', 'Lulus', 'Keluar/Pindah', 'Masuk'] as Santri['status'][]).map(status => ({
      name: status,
      count: statusCounts[status] || 0,
      percentage: totalSantri > 0 ? ((statusCounts[status] || 0) / totalSantri) * 100 : 0,
      color: statusColors[status]
  }));

  const santriByJenjang = useMemo(() => {
    return settings.jenjang.map(jenjang => {
        const santriInJenjang = santriList.filter(s => s.jenjangId === jenjang.id);
        const total = santriInJenjang.length;
        const putra = santriInJenjang.filter(s => s.jenisKelamin === 'Laki-laki').length;
        const putri = total - putra;

        const statuses = statusData.map(s => {
            const count = santriInJenjang.filter(santri => santri.status === s.name).length;
            return {
                ...s,
                count,
                percentage: total > 0 ? (count / total) * 100 : 0,
            };
        });
        
        const kelasInJenjang = settings.kelas.filter(k => k.jenjangId === jenjang.id);
        const kelasBreakdown = kelasInJenjang.map(kelas => {
            const santriInKelas = santriInJenjang.filter(s => s.kelasId === kelas.id);
            const totalKelas = santriInKelas.length;
            const putraKelas = santriInKelas.filter(s => s.jenisKelamin === 'Laki-laki').length;
            const putriKelas = totalKelas - putraKelas;
            return {
                id: kelas.id,
                nama: kelas.nama,
                total: totalKelas,
                putra: putraKelas,
                putri: putriKelas,
            };
        });

        return {
            id: jenjang.id,
            nama: jenjang.nama,
            total,
            putra,
            putri,
            statuses,
            kelasBreakdown
        };
    });
  }, [settings.jenjang, settings.kelas, santriList, statusData]);
  
  const recentSantri = [...santriList]
    .sort((a, b) => new Date(b.tanggalMasuk).getTime() - new Date(a.tanggalMasuk).getTime())
    .slice(0, 5);

  const timeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " tahun lalu";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " bulan lalu";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " hari lalu";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " jam lalu";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " menit lalu";
    return "Baru saja";
  };
  
  const getRombelName = (rombelId: number) => {
    return settings.rombel.find(r => r.id === rombelId)?.nama || 'N/A';
  }

  const GenderIcon = <i className="bi bi-person text-2xl text-white"></i>;

  return (
    <div>
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Dashboard</h1>
        <p className="text-gray-600 mb-8">Selamat datang! Berikut adalah ringkasan data di {settings.namaPonpes}</p>

        {/* Top Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            <StatCard title="Total Santri" value={totalSantri} icon={<i className="bi-people-fill text-2xl text-white"></i>} color="bg-blue-500" onClick={() => navigateTo(Page.Santri)} />
            <StatCard title="Santri Putra" value={totalPutra} icon={GenderIcon} color="bg-sky-500" onClick={() => navigateTo(Page.Santri, { gender: 'Laki-laki' })} />
            <StatCard title="Santri Putri" value={totalPutri} icon={GenderIcon} color="bg-pink-500" onClick={() => navigateTo(Page.Santri, { gender: 'Perempuan' })} />
            <StatCard title="Jenjang" value={settings.jenjang.length} icon={<i className="bi-layers-half text-2xl text-white"></i>} color="bg-indigo-500" />
            <StatCard title="Rombel" value={settings.rombel.length} icon={<i className="bi-building text-2xl text-white"></i>} color="bg-purple-500" />
        </div>
        
        {/* Main Content Grid - 2 Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            
            {/* Komposisi Status Santri */}
            <div className="bg-white p-6 rounded-xl shadow-md">
                <h2 className="text-xl font-bold text-gray-700 mb-4">Komposisi Status Santri</h2>
                <StatusSantriChart statusData={statusData} total={totalSantri} />
            </div>

            {/* Informasi Pondok */}
            <InfoPondokCard settings={settings} />

            {/* Santri Terbaru */}
            <div className="bg-white p-6 rounded-xl shadow-md">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-700">Santri Terbaru</h2>
                    <button onClick={() => navigateTo(Page.Santri)} className="text-sm font-medium text-teal-600 hover:underline">Lihat Semua</button>
                </div>
                <ul className="space-y-4">
                    {recentSantri.map(santri => (
                        <li key={santri.id} className="flex items-center gap-4">
                            <DashboardAvatar santri={santri} />
                            <div className="flex-grow">
                                <p className="font-semibold text-sm text-gray-800">{santri.namaLengkap}</p>
                                <p className="text-xs text-gray-500">{getRombelName(santri.rombelId)}</p>
                            </div>
                            <span className="text-xs text-gray-400 flex-shrink-0">{timeAgo(santri.tanggalMasuk)}</span>
                        </li>
                    ))}
                    {recentSantri.length === 0 && (
                        <p className="text-center text-gray-500 py-4">Belum ada data santri baru.</p>
                    )}
                </ul>
            </div>

            {/* Aksi Cepat */}
            <div className="bg-white p-6 rounded-xl shadow-md flex flex-col">
                <h2 className="text-xl font-bold text-gray-700 mb-4">Aksi Cepat</h2>
                <div className="grid grid-cols-2 gap-4 my-auto">
                    <QuickActionButton icon="bi-person-plus-fill" label="Tambah Santri" onClick={() => navigateTo(Page.Santri)} />
                    <QuickActionButton icon="bi-person-lines-fill" label="Pendaftaran (PSB)" onClick={() => navigateTo(Page.PSB)} />
                    <QuickActionButton icon="bi-printer-fill" label="Cetak" onClick={() => navigateTo(Page.Laporan)} />
                    <QuickActionButton icon="bi-gear-fill" label="Pengaturan" onClick={() => navigateTo(Page.Pengaturan)} />
                </div>
            </div>
        </div>

        {/* Third Row (Full Width) */}
        <div className="grid grid-cols-1 gap-6">
            {/* Distribusi Santri per Jenjang */}
            <div className="bg-white p-6 rounded-xl shadow-md">
                <h2 className="text-xl font-bold text-gray-700 mb-4">Distribusi Santri per Jenjang</h2>
                <div className="space-y-6">
                    {santriByJenjang.map(item => (
                        <div key={item.id}>
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <span className="text-base font-medium text-gray-700">{item.nama}</span>
                                    <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                                        <span className="flex items-center gap-1.5"><i className="bi bi-person text-blue-500"></i> {item.putra} Putra</span>
                                        <span className="flex items-center gap-1.5"><i className="bi bi-person text-pink-500"></i> {item.putri} Putri</span>
                                    </div>
                                </div>
                                <span className="text-lg font-semibold text-gray-800">{item.total} <span className="text-sm font-normal text-gray-500">Santri</span></span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-4 flex overflow-hidden">
                                {item.statuses.filter(s => s.count > 0).map(s => (
                                    <div 
                                        key={s.name}
                                        className={`${s.color.replace('text-', 'bg-')}`}
                                        style={{ width: `${s.percentage}%` }}
                                        title={`${s.name}: ${s.count} santri (${s.percentage.toFixed(1)}%)`}
                                    ></div>
                                ))}
                            </div>
                             <div className="mt-3 pl-4 border-l-2 border-gray-200 space-y-2">
                                {item.kelasBreakdown.filter(k => k.total > 0).map(kelas => (
                                    <div key={kelas.id}>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="font-medium text-gray-600">{kelas.nama}</span>
                                            <span className="text-gray-500">{kelas.putra} Putra, {kelas.putri} Putri</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2.5 mt-1 flex overflow-hidden">
                                            <div 
                                                className="bg-blue-500 h-2.5" 
                                                style={{ width: `${kelas.total > 0 ? (kelas.putra / kelas.total) * 100 : 0}%` }}
                                                title={`${kelas.putra} Putra`}
                                            ></div>
                                            <div 
                                                className="bg-pink-500 h-2.5" 
                                                style={{ width: `${kelas.total > 0 ? (kelas.putri / kelas.total) * 100 : 0}%` }}
                                                title={`${kelas.putri} Putri`}
                                            ></div>
                                        </div>
                                    </div>
                                ))}
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
