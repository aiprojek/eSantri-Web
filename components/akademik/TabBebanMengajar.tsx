import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../AppContext';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { JadwalPelajaran, TenagaPengajar, Rombel, MataPelajaran, Jenjang } from '../../types';
import { loadJsPdf, loadJsPdfAutoTable, loadXLSX } from '../../utils/lazyClientLibs';
import { buildStandardExportFileName } from '../../utils/exportFileName';

interface TeacherLoadDetail {
    guru: TenagaPengajar;
    totalHours: number;
    rombelIds: number[];
    rombelNames: string[];
    mapelIds: number[];
    mapelNames: string[];
    rumpunList: string[];
    hariCount: number;
    jadwalDetails: {
        hari: number;
        jamKe: number;
        rombelName: string;
        mapelName: string;
        rumpun?: string;
        waktu?: string;
    }[];
}

const HARI_NAMES = ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export const TabBebanMengajar: React.FC = () => {
    const { settings, showToast } = useAppContext();
    const [filterJenjangId, setFilterJenjangId] = useState<number>(0);
    const [filterLoadStatus, setFilterLoadStatus] = useState<'all' | 'low' | 'ideal' | 'high'>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTeacherForSlip, setSelectedTeacherForSlip] = useState<TeacherLoadDetail | null>(null);
    const [isExporting, setIsExporting] = useState(false);

    // Live query for current schedules
    const jadwalList = useLiveQuery(() => db.jadwalPelajaran.toArray(), []) || [];

    // Jam pelajaran mapping for time labels
    const jamConfigMap = useMemo(() => {
        const map = new Map<string, string>();
        (settings.jamPelajaran || []).forEach(j => {
            const key = `${j.jenjangId}_${j.urutan}`;
            map.set(key, `${j.jamMulai} - ${j.jamSelesai}`);
        });
        return map;
    }, [settings.jamPelajaran]);

    // Calculate teacher loads
    const teacherLoads = useMemo<TeacherLoadDetail[]>(() => {
        const rombelMap = new Map<number, Rombel>(settings.rombel.map(r => [r.id, r]));
        const mapelMap = new Map<number, MataPelajaran>(settings.mataPelajaran.map(m => [m.id, m]));
        const kelasMap = new Map<number, { jenjangId: number }>(settings.kelas.map(k => [k.id, { jenjangId: k.jenjangId }]));

        return settings.tenagaPengajar.map(guru => {
            // Find all schedules assigned to this teacher
            const teacherJadwals = jadwalList.filter(j => {
                if (j.guruId !== guru.id) return false;
                if (filterJenjangId > 0) {
                    const rombel = rombelMap.get(j.rombelId);
                    if (!rombel) return false;
                    const kelas = kelasMap.get(rombel.kelasId);
                    if (kelas?.jenjangId !== filterJenjangId) return false;
                }
                return true;
            });

            const rombelIdsSet = new Set<number>();
            const mapelIdsSet = new Set<number>();
            const rumpunSet = new Set<string>();
            const hariSet = new Set<number>();

            const details = teacherJadwals.map(j => {
                const rombel = rombelMap.get(j.rombelId);
                const mapel = j.mapelId ? mapelMap.get(j.mapelId) : undefined;
                const kelas = rombel ? kelasMap.get(rombel.kelasId) : undefined;
                const jenjangId = kelas?.jenjangId || 0;

                rombelIdsSet.add(j.rombelId);
                if (j.mapelId) mapelIdsSet.add(j.mapelId);
                if (mapel?.rumpun) rumpunSet.add(mapel.rumpun);
                hariSet.add(j.hari);

                const waktu = jamConfigMap.get(`${jenjangId}_${j.jamKe}`) || `Jam ke-${j.jamKe}`;

                return {
                    hari: j.hari,
                    jamKe: j.jamKe,
                    rombelName: rombel?.nama || `Rombel #${j.rombelId}`,
                    mapelName: mapel?.nama || 'Tanpa Mapel',
                    rumpun: mapel?.rumpun,
                    waktu,
                };
            }).sort((a, b) => a.hari - b.hari || a.jamKe - b.jamKe);

            const rombelNames = Array.from(rombelIdsSet)
                .map(id => rombelMap.get(id)?.nama)
                .filter((n): n is string => Boolean(n));

            const mapelNames = Array.from(mapelIdsSet)
                .map(id => mapelMap.get(id)?.nama)
                .filter((n): n is string => Boolean(n));

            return {
                guru,
                totalHours: teacherJadwals.length,
                rombelIds: Array.from(rombelIdsSet),
                rombelNames,
                mapelIds: Array.from(mapelIdsSet),
                mapelNames,
                rumpunList: Array.from(rumpunSet),
                hariCount: hariSet.size,
                jadwalDetails: details,
            };
        }).sort((a, b) => b.totalHours - a.totalHours || a.guru.nama.localeCompare(b.guru.nama, 'id'));
    }, [settings.tenagaPengajar, settings.rombel, settings.mataPelajaran, settings.kelas, jadwalList, filterJenjangId, jamConfigMap]);

    // Filtered by load status & search
    const filteredTeachers = useMemo(() => {
        return teacherLoads.filter(t => {
            if (filterLoadStatus === 'low' && (t.totalHours >= 12 || t.totalHours === 0)) return false;
            if (filterLoadStatus === 'ideal' && (t.totalHours < 12 || t.totalHours > 24)) return false;
            if (filterLoadStatus === 'high' && t.totalHours <= 24) return false;

            if (searchTerm) {
                const query = searchTerm.toLowerCase();
                const matchName = t.guru.nama.toLowerCase().includes(query);
                const matchMapel = t.mapelNames.some(m => m.toLowerCase().includes(query));
                const matchRombel = t.rombelNames.some(r => r.toLowerCase().includes(query));
                if (!matchName && !matchMapel && !matchRombel) return false;
            }

            return true;
        });
    }, [teacherLoads, filterLoadStatus, searchTerm]);

    // KPI Metrics
    const metrics = useMemo(() => {
        const activeTeachers = teacherLoads.filter(t => t.totalHours > 0);
        const totalHours = teacherLoads.reduce((sum, t) => sum + t.totalHours, 0);
        const avgHours = activeTeachers.length ? (totalHours / activeTeachers.length).toFixed(1) : '0';
        const lowLoad = activeTeachers.filter(t => t.totalHours < 12).length;
        const idealLoad = activeTeachers.filter(t => t.totalHours >= 12 && t.totalHours <= 24).length;
        const highLoad = activeTeachers.filter(t => t.totalHours > 24).length;

        return {
            activeCount: activeTeachers.length,
            totalHours,
            avgHours,
            lowLoad,
            idealLoad,
            highLoad,
        };
    }, [teacherLoads]);

    // Export to Excel
    const handleExportExcel = async () => {
        if (isExporting) return;
        setIsExporting(true);
        try {
            const XLSX = await loadXLSX();
            const wsData: any[][] = [];

            wsData.push([`REKAP BEBAN MENGAJAR TENAGA PENGAJAR (JTM)`]);
            wsData.push([`Pondok Pesantren / Lembaga: ${settings.namaPonpes || 'Pesantren'}`]);
            wsData.push([`Total Guru Mengajar: ${metrics.activeCount} Orang | Total JTM: ${metrics.totalHours} Jam/Pekan`]);
            wsData.push([]);
            wsData.push(['No', 'Nama Guru', 'Status Kepegawaian', 'Total Jam (JTM)', 'Status Beban', 'Jumlah Hari', 'Rumpun Pelajaran', 'Mata Pelajaran', 'Kelas / Rombel']);

            filteredTeachers.forEach((t, idx) => {
                let statusBeban = 'Tidak Mengajar';
                if (t.totalHours > 24) statusBeban = 'Beban Tinggi (>24 Jam)';
                else if (t.totalHours >= 12) statusBeban = 'Beban Ideal (12-24 Jam)';
                else if (t.totalHours > 0) statusBeban = 'Beban Ringan (<12 Jam)';

                wsData.push([
                    idx + 1,
                    t.guru.nama,
                    t.guru.status || 'Aktif',
                    t.totalHours,
                    statusBeban,
                    t.hariCount,
                    t.rumpunList.join(', ') || '-',
                    t.mapelNames.join(', ') || '-',
                    t.rombelNames.join(', ') || '-',
                ]);
            });

            wsData.push([]);
            wsData.push(['dibuat dengan eSantri Web | aiprojek01.my.id']);

            const ws = XLSX.utils.aoa_to_sheet(wsData);
            ws['!cols'] = [
                { wch: 5 },
                { wch: 28 },
                { wch: 18 },
                { wch: 16 },
                { wch: 22 },
                { wch: 14 },
                { wch: 24 },
                { wch: 34 },
                { wch: 34 },
            ];
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'BebanMengajar');
            XLSX.writeFile(wb, `${buildStandardExportFileName('rekap-beban-mengajar-guru', [settings.namaPonpes || 'pondok'])}.xlsx`);
            showToast('Rekap beban mengajar berhasil diekspor ke Excel', 'success');
        } catch (e) {
            showToast('Gagal mengekspor data ke Excel', 'error');
        } finally {
            setIsExporting(false);
        }
    };

    // Print Slip Saku Guru Native
    const handlePrintSlip = (detail: TeacherLoadDetail) => {
        const popup = window.open('', '_blank', 'width=800,height=900');
        if (!popup) {
            showToast('Izinkan pop-up untuk mencetak slip jadwal.', 'error');
            return;
        }

        // Group schedule by day
        const groupedByDay: { [hari: number]: typeof detail.jadwalDetails } = {};
        for (let h = 0; h <= 6; h++) {
            groupedByDay[h] = detail.jadwalDetails.filter(j => j.hari === h);
        }

        let tableRowsHtml = '';
        HARI_NAMES.forEach((hariName, hIdx) => {
            const items = groupedByDay[hIdx];
            if (items.length === 0) return;

            items.forEach((item, itemIdx) => {
                tableRowsHtml += `
                    <tr>
                        ${itemIdx === 0 ? `<td rowspan="${items.length}" style="font-weight:bold; background-color:#f8fafc; text-align:center; vertical-align:middle; width:80px;">${hariName}</td>` : ''}
                        <td style="text-align:center; width:60px;">Jam ${item.jamKe}</td>
                        <td style="text-align:center; width:110px; font-size:11px; color:#475569;">${item.waktu}</td>
                        <td style="font-weight:bold; color:#0f172a;">${item.mapelName}</td>
                        <td style="font-weight:600; text-align:center; color:#0d9488; width:100px;">${item.rombelName}</td>
                        <td style="font-size:11px; text-align:center; color:#64748b; width:90px;">${item.rumpun || '-'}</td>
                    </tr>
                `;
            });
        });

        if (!tableRowsHtml) {
            tableRowsHtml = `<tr><td colspan="6" style="text-align:center; padding:20px; color:#94a3b8;">Belum ada jadwal mengajar yang diatur.</td></tr>`;
        }

        popup.document.write(`
            <!DOCTYPE html>
            <html>
                <head>
                    <title>Slip Jadwal Mengajar - ${detail.guru.nama}</title>
                    <style>
                        @page { size: A5 landscape; margin: 10mm; }
                        body { font-family: system-ui, -apple-system, sans-serif; font-size: 12px; color: #1e293b; margin: 0; padding: 15px; }
                        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0d9488; padding-bottom: 8px; margin-bottom: 12px; }
                        .title { font-size: 15px; font-weight: bold; color: #0f172a; margin: 0; }
                        .sub { font-size: 11px; color: #64748b; margin-top: 2px; }
                        .badge { background: #f0fdfa; color: #0f766e; border: 1px solid #99f6e4; padding: 3px 8px; border-radius: 4px; font-weight: bold; font-size: 11px; }
                        .info-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 12px; background: #f8fafc; padding: 8px 12px; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 11px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 6px; }
                        th { background-color: #0d9488; color: white; padding: 6px 8px; font-size: 11px; border: 1px solid #0d9488; }
                        td { border: 1px solid #cbd5e1; padding: 5px 8px; font-size: 11px; }
                        .footer { margin-top: 15px; display: flex; justify-content: space-between; font-size: 10px; color: #64748b; }
                        .signature-block { margin-top: 20px; display: flex; justify-content: space-between; }
                        .signature { text-align: center; width: 180px; font-size: 11px; }
                        .sign-line { margin-top: 45px; border-bottom: 1px solid #334155; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div>
                            <div class="title">${settings.namaPonpes || 'PONDOK PESANTREN'}</div>
                            <div class="sub">JADWAL MENGAJAR MINGGUAN TENAGA PENGAJAR (SLIP SAKU)</div>
                        </div>
                        <div class="badge">
                            Total JTM: ${detail.totalHours} Jam / Pekan
                        </div>
                    </div>

                    <div class="info-grid">
                        <div><strong>Nama Guru:</strong> ${detail.guru.nama}</div>
                        <div><strong>Hari Mengajar:</strong> ${detail.hariCount} Hari Aktif</div>
                        <div><strong>Kelas/Rombel:</strong> ${detail.rombelNames.join(', ') || '-'}</div>
                    </div>

                    <table>
                        <thead>
                            <tr>
                                <th>Hari</th>
                                <th>Jam Ke</th>
                                <th>Waktu</th>
                                <th>Mata Pelajaran / Kitab</th>
                                <th>Rombel / Kelas</th>
                                <th>Rumpun</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${tableRowsHtml}
                        </tbody>
                    </table>

                    <div class="signature-block">
                        <div class="signature">
                            Mengetahui,<br/>Kepala Kurikulum / Marhalah
                            <div class="sign-line"></div>
                            ( .................................................. )
                        </div>
                        <div class="signature">
                            Guru Pengajar
                            <div class="sign-line"></div>
                            <strong>${detail.guru.nama}</strong>
                        </div>
                    </div>

                    <div class="footer">
                        <span>Dicetak pada: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                        <span>eSantri Web Application | Sistem Manajemen Pesantren</span>
                    </div>
                </body>
            </html>
        `);
        popup.document.close();
        popup.focus();
        popup.print();
        popup.close();
    };

    return (
        <div className="space-y-6">
            {/* Top KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
                    <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Guru Mengajar</div>
                    <div className="text-2xl font-black text-slate-800 mt-1">{metrics.activeCount} <span className="text-xs font-medium text-gray-400">/ {settings.tenagaPengajar.length}</span></div>
                    <div className="text-[10px] text-teal-600 mt-1 flex items-center gap-1 font-medium">
                        <i className="bi bi-person-check-fill"></i> Guru dengan jadwal aktif
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
                    <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Total Jam Tatap Muka</div>
                    <div className="text-2xl font-black text-teal-700 mt-1">{metrics.totalHours} <span className="text-xs font-normal text-teal-600">Jam/Pekan</span></div>
                    <div className="text-[10px] text-gray-500 mt-1">
                        Rata-rata: <strong>{metrics.avgHours}</strong> Jam/Guru
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
                    <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Beban Ideal (12-24)</div>
                    <div className="text-2xl font-black text-emerald-700 mt-1">{metrics.idealLoad} <span className="text-xs font-normal text-emerald-600">Guru</span></div>
                    <div className="text-[10px] text-emerald-600 mt-1 font-medium">
                        Beban KBM proporsional
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
                    <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Beban Tinggi (&gt;24)</div>
                    <div className="text-2xl font-black text-rose-700 mt-1">{metrics.highLoad} <span className="text-xs font-normal text-rose-600">Guru</span></div>
                    <div className="text-[10px] text-rose-600 mt-1 font-medium">
                        Perlu pemerataan jam
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs col-span-2 md:col-span-1">
                    <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Beban Rendah (&lt;12)</div>
                    <div className="text-2xl font-black text-amber-700 mt-1">{metrics.lowLoad} <span className="text-xs font-normal text-amber-600">Guru</span></div>
                    <div className="text-[10px] text-amber-600 mt-1 font-medium">
                        Kapasitas jam tersisa
                    </div>
                </div>
            </div>

            {/* Filter & Action Toolbar */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs space-y-3">
                <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
                    <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                        <select
                            value={filterJenjangId}
                            onChange={e => setFilterJenjangId(Number(e.target.value))}
                            className="bg-gray-50 border border-gray-300 text-gray-800 text-xs rounded-lg px-3 py-2 font-medium focus:ring-teal-500 focus:border-teal-500"
                        >
                            <option value={0}>Semua Marhalah / Jenjang</option>
                            {settings.jenjang.map(j => (
                                <option key={j.id} value={j.id}>{j.nama}</option>
                            ))}
                        </select>

                        <div className="flex bg-gray-100 p-0.5 rounded-lg text-xs font-medium">
                            <button
                                onClick={() => setFilterLoadStatus('all')}
                                className={`px-2.5 py-1.5 rounded-md transition-all ${filterLoadStatus === 'all' ? 'bg-white shadow-2xs text-gray-900 font-bold' : 'text-gray-600 hover:text-gray-900'}`}
                            >
                                Semua Status
                            </button>
                            <button
                                onClick={() => setFilterLoadStatus('ideal')}
                                className={`px-2.5 py-1.5 rounded-md transition-all ${filterLoadStatus === 'ideal' ? 'bg-white shadow-2xs text-emerald-700 font-bold' : 'text-gray-600 hover:text-gray-900'}`}
                            >
                                Ideal (12-24)
                            </button>
                            <button
                                onClick={() => setFilterLoadStatus('high')}
                                className={`px-2.5 py-1.5 rounded-md transition-all ${filterLoadStatus === 'high' ? 'bg-white shadow-2xs text-rose-700 font-bold' : 'text-gray-600 hover:text-gray-900'}`}
                            >
                                Tinggi (&gt;24)
                            </button>
                            <button
                                onClick={() => setFilterLoadStatus('low')}
                                className={`px-2.5 py-1.5 rounded-md transition-all ${filterLoadStatus === 'low' ? 'bg-white shadow-2xs text-amber-700 font-bold' : 'text-gray-600 hover:text-gray-900'}`}
                            >
                                Rendah (&lt;12)
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                        <div className="relative flex-1 md:w-64">
                            <i className="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
                            <input
                                type="text"
                                placeholder="Cari nama guru / mapel..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-300 rounded-lg text-xs focus:ring-teal-500 focus:border-teal-500"
                            />
                        </div>

                        <button
                            onClick={handleExportExcel}
                            disabled={isExporting}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-2 rounded-lg font-bold flex items-center gap-1.5 shadow-2xs transition-colors shrink-0"
                            title="Ekspor rekap beban mengajar ke Excel"
                        >
                            <i className="bi bi-file-earmark-excel-fill"></i>
                            <span className="hidden sm:inline">Ekspor Excel</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Teacher Workload Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 uppercase font-semibold">
                            <tr>
                                <th className="p-3.5 w-12 text-center">No</th>
                                <th className="p-3.5">Nama Guru / Pengajar</th>
                                <th className="p-3.5 text-center">Beban Mengajar (JTM)</th>
                                <th className="p-3.5 text-center">Status Beban</th>
                                <th className="p-3.5">Rumpun Mata Pelajaran</th>
                                <th className="p-3.5">Mata Pelajaran yang Diajar</th>
                                <th className="p-3.5">Rombel / Kelas</th>
                                <th className="p-3.5 text-center w-32">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredTeachers.map((item, idx) => {
                                const percentage = Math.min(100, Math.round((item.totalHours / 24) * 100));

                                return (
                                    <tr key={item.guru.id} className="hover:bg-teal-50/40 transition-colors">
                                        <td className="p-3.5 text-center font-medium text-gray-500">{idx + 1}</td>
                                        <td className="p-3.5 font-bold text-gray-900">
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-full bg-teal-100 text-teal-800 font-bold flex items-center justify-center text-xs shrink-0">
                                                    {item.guru.nama.substring(0, 1).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div>{item.guru.nama}</div>
                                                    <div className="text-[10px] font-normal text-gray-500">
                                                        {item.hariCount > 0 ? `${item.hariCount} Hari Aktif Mengajar` : 'Belum Ada Jadwal'}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-3.5 text-center">
                                            <div className="inline-flex items-baseline gap-1">
                                                <span className="text-base font-black text-slate-800">{item.totalHours}</span>
                                                <span className="text-[10px] text-gray-500">Jam/Pekan</span>
                                            </div>
                                            <div className="w-20 mx-auto bg-gray-200 rounded-full h-1.5 mt-1 overflow-hidden">
                                                <div
                                                    className={`h-1.5 rounded-full ${
                                                        item.totalHours > 24 ? 'bg-rose-600' : item.totalHours >= 12 ? 'bg-emerald-500' : 'bg-amber-500'
                                                    }`}
                                                    style={{ width: `${percentage}%` }}
                                                ></div>
                                            </div>
                                        </td>
                                        <td className="p-3.5 text-center">
                                            {item.totalHours === 0 ? (
                                                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                                                    Non-Aktif
                                                </span>
                                            ) : item.totalHours > 24 ? (
                                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                                    Tinggi (&gt;24)
                                                </span>
                                            ) : item.totalHours >= 12 ? (
                                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                                    Ideal (12-24)
                                                </span>
                                            ) : (
                                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                                    Rendah (&lt;12)
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-3.5">
                                            <div className="flex flex-wrap gap-1">
                                                {item.rumpunList.length > 0 ? (
                                                    item.rumpunList.map(rumpun => (
                                                        <span key={rumpun} className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                                                            {rumpun}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-gray-400 italic text-[11px]">-</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-3.5">
                                            <div className="text-gray-700 line-clamp-2 max-w-xs" title={item.mapelNames.join(', ')}>
                                                {item.mapelNames.join(', ') || <span className="text-gray-400 italic">-</span>}
                                            </div>
                                        </td>
                                        <td className="p-3.5">
                                            <div className="flex flex-wrap gap-1 max-w-xs">
                                                {item.rombelNames.slice(0, 4).map(name => (
                                                    <span key={name} className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-teal-50 text-teal-800 border border-teal-200">
                                                        {name}
                                                    </span>
                                                ))}
                                                {item.rombelNames.length > 4 && (
                                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-700 border border-gray-200">
                                                        +{item.rombelNames.length - 4}
                                                    </span>
                                                )}
                                                {item.rombelNames.length === 0 && <span className="text-gray-400 italic">-</span>}
                                            </div>
                                        </td>
                                        <td className="p-3.5 text-center">
                                            <div className="flex items-center justify-center gap-1.5">
                                                <button
                                                    onClick={() => setSelectedTeacherForSlip(item)}
                                                    className="px-2 py-1 bg-white hover:bg-teal-50 border border-teal-300 text-teal-700 rounded text-[11px] font-bold flex items-center gap-1 transition-colors"
                                                    title="Lihat rincian jadwal guru"
                                                >
                                                    <i className="bi bi-eye"></i> Detail
                                                </button>
                                                <button
                                                    onClick={() => handlePrintSlip(item)}
                                                    disabled={item.totalHours === 0}
                                                    className="px-2 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded text-[11px] font-bold flex items-center gap-1 shadow-2xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                                    title="Cetak slip jadwal saku (A5)"
                                                >
                                                    <i className="bi bi-printer-fill"></i> Slip
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {filteredTeachers.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="p-8 text-center text-gray-400 italic">
                                        Tidak ditemukan data guru dengan filter yang dipilih.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Detail & Pratinjau Slip Jadwal Guru */}
            {selectedTeacherForSlip && (
                <div className="fixed inset-0 bg-black/60 z-[70] flex justify-center items-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl flex flex-col max-h-[85vh] overflow-hidden border border-gray-200">
                        <div className="p-5 border-b border-gray-200 flex justify-between items-center bg-teal-50/60">
                            <div>
                                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                    <i className="bi bi-person-badge-fill text-teal-700"></i>
                                    Jadwal Mengajar: {selectedTeacherForSlip.guru.nama}
                                </h3>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    Total Beban: <strong>{selectedTeacherForSlip.totalHours} Jam Tatap Muka</strong> ({selectedTeacherForSlip.hariCount} hari aktif)
                                </p>
                            </div>
                            <button onClick={() => setSelectedTeacherForSlip(null)} className="text-gray-400 hover:text-gray-600">
                                <i className="bi bi-x-lg text-lg"></i>
                            </button>
                        </div>

                        <div className="p-5 overflow-y-auto flex-grow space-y-4">
                            {selectedTeacherForSlip.jadwalDetails.length === 0 ? (
                                <div className="text-center py-10 text-gray-400 italic">
                                    Guru ini belum memiliki jadwal mengajar di kelas manapun.
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {HARI_NAMES.map((hariName, hIdx) => {
                                        const items = selectedTeacherForSlip.jadwalDetails.filter(j => j.hari === hIdx);
                                        if (items.length === 0) return null;

                                        return (
                                            <div key={hariName} className="border border-gray-200 rounded-xl overflow-hidden shadow-2xs">
                                                <div className="bg-gray-100/80 px-3.5 py-2 border-b border-gray-200 flex justify-between items-center">
                                                    <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                                                        <i className="bi bi-calendar-event text-teal-600"></i> {hariName}
                                                    </span>
                                                    <span className="text-[11px] font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                                                        {items.length} Jam
                                                    </span>
                                                </div>
                                                <div className="divide-y divide-gray-100">
                                                    {items.map((slot, sIdx) => (
                                                        <div key={sIdx} className="p-3 flex items-center justify-between text-xs hover:bg-gray-50">
                                                            <div className="flex items-center gap-3">
                                                                <span className="w-14 font-mono font-bold text-teal-800 bg-teal-50 px-2 py-1 rounded text-center border border-teal-200">
                                                                    Jam {slot.jamKe}
                                                                </span>
                                                                <div>
                                                                    <div className="font-bold text-gray-900">{slot.mapelName}</div>
                                                                    <div className="text-[10px] text-gray-500">{slot.waktu}</div>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                {slot.rumpun && (
                                                                    <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100 font-medium">
                                                                        {slot.rumpun}
                                                                    </span>
                                                                )}
                                                                <span className="font-bold text-teal-800 bg-teal-100/70 px-2.5 py-1 rounded-md">
                                                                    {slot.rombelName}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
                            <button
                                onClick={() => setSelectedTeacherForSlip(null)}
                                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 text-xs font-semibold hover:bg-gray-100"
                            >
                                Tutup
                            </button>
                            <button
                                onClick={() => handlePrintSlip(selectedTeacherForSlip)}
                                disabled={selectedTeacherForSlip.totalHours === 0}
                                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-2xs transition-colors disabled:opacity-40"
                            >
                                <i className="bi bi-printer-fill"></i> Cetak Slip Saku (A5)
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
