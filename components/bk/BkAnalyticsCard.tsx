import React from 'react';
import { BkSession, Santri } from '../../types';

interface BkAnalyticsCardProps {
    sessions: BkSession[];
    santriList: Santri[];
    onOpenFollowUp?: (session: BkSession, santri: Santri) => void;
    onOpenSurat?: (session: BkSession, santri: Santri) => void;
}

export const BkAnalyticsCard: React.FC<BkAnalyticsCardProps> = ({
    sessions,
    santriList,
    onOpenFollowUp,
    onOpenSurat,
}) => {
    const today = new Date().toISOString().split('T')[0];

    // Upcoming or overdue follow-up sessions
    const upcomingSessions = sessions.filter(s => {
        if (!s.tanggalBerikutnya || s.status === 'Selesai') return false;
        return s.tanggalBerikutnya <= today || (
            // Within next 7 days
            new Date(s.tanggalBerikutnya).getTime() - new Date(today).getTime() <= 7 * 24 * 60 * 60 * 1000
        );
    }).sort((a, b) => (a.tanggalBerikutnya || '').localeCompare(b.tanggalBerikutnya || ''));

    // Category distribution
    const categoryCounts = sessions.reduce((acc, s) => {
        const kat = s.kategori || 'Lainnya';
        acc[kat] = (acc[kat] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const sortedCategories = Object.entries(categoryCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6);

    const totalCount = sessions.length || 1;

    const getCategoryColor = (cat: string) => {
        switch (cat) {
            case 'Pribadi': return 'bg-purple-500';
            case 'Sosial': return 'bg-sky-500';
            case 'Belajar': return 'bg-blue-500';
            case 'Keluarga': return 'bg-amber-500';
            case 'Ibadah': return 'bg-emerald-500';
            case 'Homesick': return 'bg-rose-500';
            case 'Kedisiplinan': return 'bg-orange-500';
            case 'Perundungan': return 'bg-red-600';
            case 'Karir': return 'bg-teal-500';
            default: return 'bg-gray-500';
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Widget 1: Jadwal Kontrol Mendatang & Pengingat Kasus */}
            <div className="bg-white rounded-2xl p-5 border border-indigo-100 shadow-xs flex flex-col justify-between lg:col-span-2">
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <span className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center text-sm font-bold">
                                <i className="bi bi-calendar-event"></i>
                            </span>
                            <div>
                                <h4 className="text-sm font-bold text-gray-800">Jadwal Kontrol & Pendampingan Santri</h4>
                                <p className="text-[11px] text-gray-500">Santri yang dijadwalkan sesi tindak lanjut atau butuh evaluasi pekan ini</p>
                            </div>
                        </div>
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            {upcomingSessions.length} Kasus Terjadwal
                        </span>
                    </div>

                    {upcomingSessions.length === 0 ? (
                        <div className="py-6 text-center text-gray-400 bg-gray-50/70 rounded-xl border border-dashed text-xs">
                            <i className="bi bi-check2-circle text-2xl text-emerald-500"></i>
                            <p className="mt-1 font-medium text-gray-600">Tidak ada jadwal kontrol yang mendesak.</p>
                            <p className="text-[11px] text-gray-400">Semua sesi terpantau dengan baik atau sudah selesai.</p>
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                            {upcomingSessions.slice(0, 4).map(s => {
                                const santri = santriList.find(sa => sa.id === s.santriId);
                                const isOverdue = (s.tanggalBerikutnya || '') < today;
                                const isToday = s.tanggalBerikutnya === today;

                                return (
                                    <div
                                        key={s.id}
                                        className={`p-3 rounded-xl border flex items-center justify-between text-xs transition ${
                                            isOverdue
                                                ? 'bg-rose-50/80 border-rose-200'
                                                : isToday
                                                ? 'bg-amber-50/80 border-amber-200'
                                                : 'bg-gray-50 border-gray-200 hover:bg-indigo-50/50'
                                        }`}
                                    >
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-gray-800 truncate">
                                                    {santri?.namaLengkap || 'Santri ID: ' + s.santriId}
                                                </span>
                                                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-white border text-gray-700">
                                                    {s.kategori}
                                                </span>
                                                {isOverdue && (
                                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-600 text-white">
                                                        Lewat Jadwal
                                                    </span>
                                                )}
                                                {isToday && (
                                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-white">
                                                        Hari Ini
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[11px] text-gray-500 truncate mt-0.5">
                                                Tgl Kontrol: <strong className="text-gray-700">{s.tanggalBerikutnya}</strong> &bull; Konselor: {s.konselor}
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                            {santri && onOpenFollowUp && (
                                                <button
                                                    type="button"
                                                    onClick={() => onOpenFollowUp(s, santri)}
                                                    className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-[11px] shadow-xs flex items-center gap-1"
                                                    title="Catat sesi lanjutan"
                                                >
                                                    <i className="bi bi-clock-history"></i> Log Sesi
                                                </button>
                                            )}
                                            {santri && onOpenSurat && (
                                                <button
                                                    type="button"
                                                    onClick={() => onOpenSurat(s, santri)}
                                                    className="p-1.5 border border-gray-300 hover:bg-white text-gray-700 rounded-lg text-[11px]"
                                                    title="Cetak Surat Panggilan / Undangan"
                                                >
                                                    <i className="bi bi-printer"></i>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center text-[11px] text-gray-500">
                    <span>
                        <i className="bi bi-shield-check text-emerald-600 mr-1"></i>
                        Sesi konseling mengedepankan asas kerahasiaan & pembinaan santun.
                    </span>
                </div>
            </div>

            {/* Widget 2: Distribusi Kategori Permasalahan Santri */}
            <div className="bg-white rounded-2xl p-5 border border-indigo-100 shadow-xs flex flex-col justify-between">
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <span className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-bold">
                                <i className="bi bi-pie-chart"></i>
                            </span>
                            <h4 className="text-sm font-bold text-gray-800">Distribusi Kategori Masalah</h4>
                        </div>
                    </div>

                    <div className="space-y-2.5">
                        {sortedCategories.map(([kategori, count]) => {
                            const percent = Math.round((count / totalCount) * 100);
                            return (
                                <div key={kategori} className="text-xs">
                                    <div className="flex justify-between items-center mb-1 text-[11px]">
                                        <span className="font-semibold text-gray-700">{kategori}</span>
                                        <span className="text-gray-500 font-mono">{count} kasus ({percent}%)</span>
                                    </div>
                                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full ${getCategoryColor(kategori)} transition-all duration-500`}
                                            style={{ width: `${percent}%` }}
                                        ></div>
                                    </div>
                                </div>
                            );
                        })}
                        {sortedCategories.length === 0 && (
                            <p className="text-xs text-gray-400 text-center py-6">Belum ada data kasus tercatat.</p>
                        )}
                    </div>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 text-[11px] text-gray-400 text-center">
                    Berdasarkan {sessions.length} total sesi konseling aktif
                </div>
            </div>
        </div>
    );
};
