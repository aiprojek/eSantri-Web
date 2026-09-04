import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../../AppContext';
import { useSantriContext } from '../../contexts/SantriContext';
import { db } from '../../db';
import { KesehatanRecord, AbsensiRecord } from '../../types';

interface AsramaDashboardProps {
    onNavigateTab?: (tab: 'dashboard' | 'manajemen' | 'penempatan' | 'jurnal') => void;
}

export const AsramaDashboard: React.FC<AsramaDashboardProps> = ({ onNavigateTab }) => {
    const { settings } = useAppContext();
    const { santriList } = useSantriContext();
    const { gedungAsrama = [], kamar = [], inspeksiKamar = [], jurnalAsrama = [] } = settings;

    const [activeHealthRecords, setActiveHealthRecords] = useState<KesehatanRecord[]>([]);
    const [todayAbsensi, setTodayAbsensi] = useState<AbsensiRecord[]>([]);

    useEffect(() => {
        let isMounted = true;
        const loadRealtimeStatus = async () => {
            try {
                // Fetch non-cured medical cases
                const health = await db.kesehatanRecords
                    .filter(rec => !rec.deleted && rec.status !== 'Sembuh')
                    .toArray();
                
                // Fetch today's permission / sickness
                const todayStr = new Date().toISOString().split('T')[0];
                const abs = await db.absensi
                    .where('tanggal')
                    .equals(todayStr)
                    .filter(rec => rec.status === 'I' || rec.status === 'S')
                    .toArray();

                if (isMounted) {
                    setActiveHealthRecords(health);
                    setTodayAbsensi(abs);
                }
            } catch (err) {
                console.error('Failed to load asrama health/absensi records:', err);
            }
        };

        loadRealtimeStatus();
        return () => {
            isMounted = false;
        };
    }, []);

    const stats = useMemo(() => {
        const totalGedung = gedungAsrama.length;
        const totalKamar = kamar.length;
        const totalKapasitas = kamar.reduce((sum, k) => sum + (k.kapasitas || 0), 0);
        const santriDiKamar = santriList.filter(s => s.kamarId && s.status === 'Aktif').length;
        const santriTanpaKamar = santriList.filter(s => !s.kamarId && s.status === 'Aktif').length;
        const tingkatHunian = totalKapasitas > 0 ? (santriDiKamar / totalKapasitas) * 100 : 0;

        const occupancyByBuilding = gedungAsrama.map(gedung => {
            const kamarDiGedung = kamar.filter(k => k.gedungId === gedung.id);
            const kapasitasGedung = kamarDiGedung.reduce((sum, k) => sum + (k.kapasitas || 0), 0);
            const penghuniGedung = santriList.filter(s => {
                const santriKamar = kamar.find(k => k.id === s.kamarId);
                return santriKamar && santriKamar.gedungId === gedung.id && s.status === 'Aktif';
            }).length;
            return {
                id: gedung.id,
                nama: gedung.nama,
                jenis: gedung.jenis,
                totalKamar: kamarDiGedung.length,
                penghuni: penghuniGedung,
                kapasitas: kapasitasGedung,
                persentase: kapasitasGedung > 0 ? (penghuniGedung / kapasitasGedung) * 100 : 0
            };
        });

        // Room condition statistics
        const kondisiCounts = {
            baik: kamar.filter(k => !k.kondisiFasilitas || k.kondisiFasilitas === 'Baik').length,
            cukup: kamar.filter(k => k.kondisiFasilitas === 'Cukup').length,
            perluPerbaikan: kamar.filter(k => k.kondisiFasilitas === 'Perlu Perbaikan').length
        };

        // Leaderboard Top Cleanest Rooms (based on latest inspection scores)
        const latestInspectionMap = new Map<number, typeof inspeksiKamar[0]>();
        [...inspeksiKamar]
            .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime())
            .forEach(ins => {
                if (!latestInspectionMap.has(ins.kamarId)) {
                    latestInspectionMap.set(ins.kamarId, ins);
                }
            });

        const leaderboardKebersihan = Array.from(latestInspectionMap.values())
            .sort((a, b) => b.skorTotal - a.skorTotal)
            .slice(0, 5)
            .map(ins => {
                const targetKamar = kamar.find(k => k.id === ins.kamarId);
                const targetGedung = targetKamar ? gedungAsrama.find(g => g.id === targetKamar.gedungId) : null;
                return {
                    ...ins,
                    kamarNama: targetKamar?.nama || `Kamar #${ins.kamarId}`,
                    gedungNama: targetGedung?.nama || '-'
                };
            });

        // Dormitory santri who are currently sick / on leave
        const rawatInapCount = activeHealthRecords.filter(h => h.status === 'Rawat Inap (Pondok)').length;
        const izinCount = todayAbsensi.filter(a => a.status === 'I').length;

        return {
            totalGedung,
            totalKamar,
            totalKapasitas,
            santriDiKamar,
            santriTanpaKamar,
            tingkatHunian,
            occupancyByBuilding,
            kondisiCounts,
            leaderboardKebersihan,
            rawatInapCount,
            izinCount
        };
    }, [gedungAsrama, kamar, santriList, inspeksiKamar, activeHealthRecords, todayAbsensi]);

    return (
        <div className="space-y-6">
            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between">
                    <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Gedung &amp; Kamar</p>
                        <h4 className="text-2xl font-black text-gray-800 mt-1">{stats.totalGedung} Gedung</h4>
                        <p className="text-xs text-gray-500 mt-0.5">{stats.totalKamar} Kamar Terdaftar</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl">
                        <i className="bi bi-building"></i>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between">
                    <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Kapasitas &amp; Hunian</p>
                        <h4 className="text-2xl font-black text-teal-900 mt-1">{stats.tingkatHunian.toFixed(1)}%</h4>
                        <p className="text-xs text-teal-700 mt-0.5">{stats.santriDiKamar} dari {stats.totalKapasitas} Kasur</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center text-xl">
                        <i className="bi bi-pie-chart-fill"></i>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between">
                    <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Santri Tanpa Kamar</p>
                        <h4 className={`text-2xl font-black mt-1 ${stats.santriTanpaKamar > 0 ? 'text-rose-600' : 'text-gray-800'}`}>
                            {stats.santriTanpaKamar}
                        </h4>
                        <p className="text-xs text-gray-500 mt-0.5">
                            {stats.santriTanpaKamar > 0 ? 'Perlu penempatan kamar' : 'Semua santri aktif ditempatkan'}
                        </p>
                    </div>
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${stats.santriTanpaKamar > 0 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                        <i className="bi bi-person-x-fill"></i>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between">
                    <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Monitoring Santri Asrama</p>
                        <div className="flex items-center gap-3 mt-1.5">
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md">
                                <i className="bi bi-hospital text-rose-600"></i> {stats.rawatInapCount} Sakit
                            </span>
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md">
                                <i className="bi bi-card-checklist text-amber-600"></i> {stats.izinCount} Izin
                            </span>
                        </div>
                        <p className="text-[11px] text-gray-500 mt-1">Terintegrasi Poskestren &amp; Absensi</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center text-xl">
                        <i className="bi bi-activity"></i>
                    </div>
                </div>
            </div>

            {/* Middle Grid: Okupansi Gedung & Fasilitas */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Okupansi per Gedung (2 Cols) */}
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                        <div>
                            <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
                                <i className="bi bi-bar-chart-line-fill text-teal-600"></i> Okupansi Kapasitas per Gedung
                            </h3>
                            <p className="text-xs text-gray-500">Persebaran santri aktif di masing-masing gedung asrama.</p>
                        </div>
                        {onNavigateTab && (
                            <button
                                onClick={() => onNavigateTab('penempatan')}
                                className="text-xs text-teal-700 font-bold hover:text-teal-800 hover:underline flex items-center gap-1"
                            >
                                Kelola Penempatan <i className="bi bi-arrow-right"></i>
                            </button>
                        )}
                    </div>

                    <div className="space-y-4 pt-1">
                        {stats.occupancyByBuilding.map(gedung => (
                            <div key={gedung.id} className="p-3.5 bg-gray-50/70 border border-gray-100 rounded-xl space-y-2">
                                <div className="flex justify-between items-center text-xs">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-gray-800 text-sm">{gedung.nama}</span>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${gedung.jenis === 'Putra' ? 'bg-blue-100 text-blue-800' : 'bg-pink-100 text-pink-800'}`}>
                                            {gedung.jenis}
                                        </span>
                                        <span className="text-gray-400">&bull; {gedung.totalKamar} Kamar</span>
                                    </div>
                                    <div className="font-semibold text-gray-700">
                                        <span className="text-teal-800 font-bold">{gedung.penghuni}</span> / {gedung.kapasitas} Kasur
                                        <span className="ml-2 font-mono text-gray-500">({gedung.persentase.toFixed(0)}%)</span>
                                    </div>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                                    <div
                                        className={`h-3 rounded-full transition-all duration-500 ${
                                            gedung.persentase > 95
                                                ? 'bg-rose-500'
                                                : gedung.persentase > 80
                                                ? 'bg-amber-500'
                                                : 'bg-teal-600'
                                        }`}
                                        style={{ width: `${Math.min(100, gedung.persentase)}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                        {stats.occupancyByBuilding.length === 0 && (
                            <p className="text-center text-gray-500 py-8 text-sm">
                                Belum ada gedung asrama yang diatur. Silakan tambahkan di tab <strong>Manajemen Asrama</strong>.
                            </p>
                        )}
                    </div>
                </div>

                {/* Kondisi Fisik Kamar (1 Col) */}
                <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
                    <div className="border-b border-gray-100 pb-3">
                        <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
                            <i className="bi bi-shield-check text-teal-600"></i> Kelayakan Fasilitas Kamar
                        </h3>
                        <p className="text-xs text-gray-500">Ranjang, kasur, lemari &amp; sirkulasi udara.</p>
                    </div>

                    <div className="space-y-3 pt-2">
                        <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-base">
                                    <i className="bi bi-check-circle-fill"></i>
                                </div>
                                <div>
                                    <h5 className="font-bold text-xs text-emerald-950">Kondisi Fasilitas Baik</h5>
                                    <p className="text-[11px] text-emerald-700">Ranjang &amp; perlengkapan prima</p>
                                </div>
                            </div>
                            <span className="text-lg font-black text-emerald-900">{stats.kondisiCounts.baik} Kamar</span>
                        </div>

                        <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-base">
                                    <i className="bi bi-exclamation-triangle-fill"></i>
                                </div>
                                <div>
                                    <h5 className="font-bold text-xs text-amber-950">Kondisi Cukup</h5>
                                    <p className="text-[11px] text-amber-700">Perlu perawatan ringan</p>
                                </div>
                            </div>
                            <span className="text-lg font-black text-amber-900">{stats.kondisiCounts.cukup} Kamar</span>
                        </div>

                        <div className="p-3 bg-rose-50/80 border border-rose-200 rounded-xl flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-base">
                                    <i className="bi bi-tools"></i>
                                </div>
                                <div>
                                    <h5 className="font-bold text-xs text-rose-950">Perlu Perbaikan</h5>
                                    <p className="text-[11px] text-rose-700">Segera ajukan ke bagian Sarpras</p>
                                </div>
                            </div>
                            <span className="text-lg font-black text-rose-900">{stats.kondisiCounts.perluPerbaikan} Kamar</span>
                        </div>
                    </div>

                    <div className="p-3 bg-teal-50/60 border border-teal-100 rounded-xl text-[11px] text-teal-900">
                        <i className="bi bi-lightbulb-fill text-teal-700 mr-1"></i>
                        Status fasilitas kamar dapat diperbarui pada tab <strong>Manajemen Asrama</strong> saat musyrif melakukan inventarisasi.
                    </div>
                </div>
            </div>

            {/* Bottom Grid: Leaderboard Kebersihan & Jurnal Musyrif */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Leaderboard Kebersihan */}
                <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                        <div>
                            <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
                                <i className="bi bi-trophy-fill text-amber-500"></i> Peringkat Kamar Terbersih (Top 5)
                            </h3>
                            <p className="text-xs text-gray-500">Hasil sidak inspeksi nadhafah &amp; kerapian asrama terbaru.</p>
                        </div>
                        {onNavigateTab && (
                            <button
                                onClick={() => onNavigateTab('jurnal')}
                                className="text-xs text-teal-700 font-bold hover:underline"
                            >
                                Catat Sidak
                            </button>
                        )}
                    </div>

                    <div className="divide-y divide-gray-100">
                        {stats.leaderboardKebersihan.map((item, idx) => (
                            <div key={item.id} className="py-2.5 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className={`w-6 h-6 rounded-full inline-flex items-center justify-center font-black text-xs ${
                                        idx === 0
                                            ? 'bg-amber-400 text-teal-950 shadow-sm'
                                            : idx === 1
                                            ? 'bg-gray-300 text-gray-800'
                                            : idx === 2
                                            ? 'bg-amber-700/70 text-white'
                                            : 'bg-gray-100 text-gray-600'
                                    }`}>
                                        {idx + 1}
                                    </span>
                                    <div>
                                        <h5 className="font-bold text-xs text-gray-900">{item.kamarNama}</h5>
                                        <p className="text-[10px] text-gray-500">{item.gedungNama} &bull; {item.tanggal}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="inline-block font-black text-sm text-teal-800">
                                        {item.skorTotal} <span className="text-[10px] font-normal text-gray-400">/ 100</span>
                                    </span>
                                    <span className={`block text-[9px] font-bold px-1.5 py-0.2 rounded ${
                                        item.predikat === 'Mumtaz' ? 'bg-emerald-100 text-emerald-800' : 'bg-teal-100 text-teal-800'
                                    }`}>
                                        {item.predikat}
                                    </span>
                                </div>
                            </div>
                        ))}

                        {stats.leaderboardKebersihan.length === 0 && (
                            <div className="p-8 text-center text-gray-500 text-xs">
                                <i className="bi bi-clipboard-x text-2xl text-gray-300 block mb-1"></i>
                                Belum ada data inspeksi kebersihan. Lakukan sidak berkala di tab <strong>Jurnal &amp; Inspeksi</strong>.
                            </div>
                        )}
                    </div>
                </div>

                {/* Log Jurnal Asrama Terkini */}
                <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                        <div>
                            <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
                                <i className="bi bi-journal-bookmark-fill text-indigo-600"></i> Jurnal &amp; Pembinaan Terakhir
                            </h3>
                            <p className="text-xs text-gray-500">Catatan kronologis kegiatan dan pembinaan santri.</p>
                        </div>
                        {onNavigateTab && (
                            <button
                                onClick={() => onNavigateTab('jurnal')}
                                className="text-xs text-indigo-700 font-bold hover:underline"
                            >
                                Lihat Semua
                            </button>
                        )}
                    </div>

                    <div className="space-y-3">
                        {[...jurnalAsrama]
                            .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime())
                            .slice(0, 3)
                            .map(j => {
                                const targetKamar = kamar.find(k => k.id === j.kamarId);
                                const targetGedung = targetKamar ? gedungAsrama.find(g => g.id === targetKamar.gedungId) : null;
                                return (
                                    <div key={j.id} className="p-3 bg-gray-50 border border-gray-200/70 rounded-xl space-y-1">
                                        <div className="flex justify-between items-center text-[10px]">
                                            <span className="font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                                                {j.jenisKegiatan}
                                            </span>
                                            <span className="text-gray-500 font-mono">
                                                {j.tanggal} {j.waktu ? `• ${j.waktu}` : ''}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-800 line-clamp-2 mt-1">{j.keterangan}</p>
                                        <div className="flex justify-between items-center text-[10px] text-gray-500 pt-1">
                                            <span>{targetGedung?.nama} &bull; {targetKamar?.nama || '-'}</span>
                                            <span className="font-medium text-teal-800">{j.namaMusyrif || 'Musyrif'}</span>
                                        </div>
                                    </div>
                                );
                            })}

                        {jurnalAsrama.length === 0 && (
                            <div className="p-8 text-center text-gray-500 text-xs">
                                <i className="bi bi-journal-x text-2xl text-gray-300 block mb-1"></i>
                                Belum ada catatan jurnal harian asrama.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
