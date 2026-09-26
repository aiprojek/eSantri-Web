import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../AppContext';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { JadwalPelajaran, Rombel, MataPelajaran, TenagaPengajar, JamPelajaran } from '../../types';
import { loadXLSX } from '../../utils/lazyClientLibs';
import { buildStandardExportFileName } from '../../utils/exportFileName';

const HARI_LIST = [
    { id: -1, nama: 'Semua Hari (Rekap Global TU)' },
    { id: 0, nama: 'Ahad' },
    { id: 1, nama: 'Senin' },
    { id: 2, nama: 'Selasa' },
    { id: 3, nama: 'Rabu' },
    { id: 4, nama: 'Kamis' },
    { id: 5, nama: 'Jumat' },
    { id: 6, nama: 'Sabtu' },
];

export const MatriksJadwalInduk: React.FC = () => {
    const { settings, showToast } = useAppContext();
    const [selectedJenjangId, setSelectedJenjangId] = useState<number>(settings.jenjang[0]?.id || 0);
    const [selectedHari, setSelectedHari] = useState<number>(1); // Default Senin
    const [isExporting, setIsExporting] = useState(false);
    const [viewSubTab, setViewSubTab] = useState<'matriks' | 'rpe'>('matriks');

    // State for RPE (Rencana Pekan Efektif)
    const [semester, setSemester] = useState<'ganjil' | 'genap'>('ganjil');
    const [totalPekan, setTotalPekan] = useState<number>(26);
    const [pekanLiburAwal, setPekanLiburAwal] = useState<number>(1);
    const [pekanUjian, setPekanUjian] = useState<number>(3);
    const [pekanLiburAkhir, setPekanLiburAkhir] = useState<number>(2);
    const [pekanKegiatanLain, setPekanKegiatanLain] = useState<number>(2);

    const pekanTidakEfektif = pekanLiburAwal + pekanUjian + pekanLiburAkhir + pekanKegiatanLain;
    const pekanEfektif = Math.max(0, totalPekan - pekanTidakEfektif);

    // Live query for schedule
    const jadwalList = useLiveQuery(() => db.jadwalPelajaran.toArray(), []) || [];

    // Map helpers
    const mapelMap = useMemo(() => new Map<number, MataPelajaran>(settings.mataPelajaran.map(m => [m.id, m])), [settings.mataPelajaran]);
    const guruMap = useMemo(() => new Map<number, TenagaPengajar>(settings.tenagaPengajar.map(g => [g.id, g])), [settings.tenagaPengajar]);
    const kelasMap = useMemo(() => new Map<number, { jenjangId: number; nama: string }>(settings.kelas.map(k => [k.id, { jenjangId: k.jenjangId, nama: k.nama }])), [settings.kelas]);

    // Rombels in selected jenjang
    const rombelList = useMemo(() => {
        return settings.rombel.filter(r => {
            const k = kelasMap.get(r.kelasId);
            return k?.jenjangId === selectedJenjangId;
        });
    }, [settings.rombel, kelasMap, selectedJenjangId]);

    // Jam pelajaran configuration
    const jamConfig = useMemo(() => {
        const list = (settings.jamPelajaran || []).filter(j => j.jenjangId === selectedJenjangId && j.jenis === 'KBM');
        if (list.length > 0) {
            return [...list].sort((a, b) => a.urutan - b.urutan);
        }
        // Default 8 periods
        return Array.from({ length: 8 }, (_, i) => ({
            id: i + 1,
            urutan: i + 1,
            jamMulai: `0${7 + Math.floor(i / 2)}:${(i % 2) * 45 === 0 ? '00' : '45'}`,
            jamSelesai: `0${7 + Math.floor((i + 1) / 2)}:${((i + 1) % 2) * 45 === 0 ? '00' : '45'}`,
            jenis: 'KBM',
            jenjangId: selectedJenjangId,
        })) as JamPelajaran[];
    }, [settings.jamPelajaran, selectedJenjangId]);

    // Detect teacher conflicts in real-time
    const conflicts = useMemo(() => {
        const conflictKeys = new Set<string>(); // "hari_jamKe_guruId"
        const seen = new Map<string, number>(); // "hari_jamKe_guruId" => rombelId

        jadwalList.forEach(j => {
            if (!j.guruId) return;
            const key = `${j.hari}_${j.jamKe}_${j.guruId}`;
            if (seen.has(key)) {
                conflictKeys.add(key);
            } else {
                seen.set(key, j.rombelId);
            }
        });

        return conflictKeys;
    }, [jadwalList]);

    // Mapel in selected jenjang for RPE calculation
    const mapelInJenjang = useMemo(() => {
        return settings.mataPelajaran.filter(m => m.jenjangId === selectedJenjangId);
    }, [settings.mataPelajaran, selectedJenjangId]);

    // Print Matriks Jadwal Induk
    const handlePrintMatriks = () => {
        const popup = window.open('', '_blank', 'width=1200,height=800');
        if (!popup) {
            showToast('Izinkan pop-up untuk mencetak matriks jadwal.', 'error');
            return;
        }

        const jenjangName = settings.jenjang.find(j => j.id === selectedJenjangId)?.nama || '';
        const hariName = HARI_LIST.find(h => h.id === selectedHari)?.nama || '';
        const isAllDays = selectedHari === -1;
        const targetDays = isAllDays ? HARI_LIST.filter(h => h.id >= 0) : HARI_LIST.filter(h => h.id === selectedHari);

        let theadRombels = rombelList.map(r => `<th style="border:1px solid #0f766e; padding:6px; background:#0d9488; color:white; min-width:110px;">${r.nama}</th>`).join('');

        let tbodyRows = '';
        targetDays.forEach(dayObj => {
            const dayRows = jamConfig.map((jam, jIdx) => {
                let cells = rombelList.map(rombel => {
                    const j = jadwalList.find(item => item.rombelId === rombel.id && item.hari === dayObj.id && item.jamKe === jam.urutan);
                    if (!j) return `<td style="border:1px solid #cbd5e1; padding:5px; text-align:center; color:#94a3b8; font-size:9.5px;">-</td>`;

                    const mapel = j.mapelId ? mapelMap.get(j.mapelId) : undefined;
                    const guru = j.guruId ? guruMap.get(j.guruId) : undefined;
                    const isConflict = j.guruId ? conflicts.has(`${j.hari}_${j.jamKe}_${j.guruId}`) : false;

                    return `
                        <td style="border:1px solid #cbd5e1; padding:5px; font-size:9.5px; ${isConflict ? 'background:#fee2e2;' : 'background:#ffffff;'}">
                            <div style="font-weight:bold; color:#0f172a;">${mapel?.nama || 'Tanpa Mapel'}</div>
                            <div style="color:#0d9488; font-size:9px; margin-top:1px;">${guru?.nama || '-'}</div>
                            ${j.ruangan ? `<div style="color:#64748b; font-size:8.5px;">R: ${j.ruangan}</div>` : ''}
                            ${isConflict ? `<div style="color:#dc2626; font-weight:bold; font-size:8px;">⚠️ BENTROK</div>` : ''}
                        </td>
                    `;
                }).join('');

                return `
                    <tr>
                        ${isAllDays && jIdx === 0 ? `
                            <td rowspan="${jamConfig.length}" style="border:1px solid #334155; padding:6px; font-weight:bold; background:#f1f5f9; text-align:center; font-size:11px; width:90px;">
                                ${dayObj.nama}
                            </td>
                        ` : ''}
                        ${!isAllDays ? `
                            <td style="border:1px solid #cbd5e1; padding:6px; text-align:center; font-weight:bold; background:#f8fafc; font-size:10px; width:40px;">
                                ${jam.urutan}
                            </td>
                            <td style="border:1px solid #cbd5e1; padding:6px; text-align:center; font-size:9px; color:#475569; width:80px;">
                                ${jam.jamMulai} - ${jam.jamSelesai}
                            </td>
                        ` : `
                            <td style="border:1px solid #cbd5e1; padding:5px; text-align:center; font-weight:600; background:#f8fafc; font-size:9.5px; width:95px;">
                                Jam ${jam.urutan}<br><span style="font-size:8.5px; color:#64748b; font-weight:normal;">${jam.jamMulai}-${jam.jamSelesai}</span>
                            </td>
                        `}
                        ${cells}
                    </tr>
                `;
            }).join('');
            tbodyRows += dayRows;
        });

        popup.document.write(`
            <!DOCTYPE html>
            <html>
                <head>
                    <title>Matriks Jadwal Induk - ${hariName} (${jenjangName})</title>
                    <style>
                        @page { size: A4 landscape; margin: 8mm; }
                        body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 10px; color: #1e293b; }
                        .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #0d9488; padding-bottom: 6px; margin-bottom: 10px; }
                        .title { font-size: 14px; font-weight: bold; color: #0f172a; text-transform: uppercase; }
                        .sub { font-size: 11px; color: #475569; margin-top: 2px; }
                        table { width: 100%; border-collapse: collapse; font-size: 9.5px; page-break-inside: auto; }
                        tr { page-break-inside: avoid; page-break-after: auto; }
                        th { padding: 6px; text-transform: uppercase; font-size: 10px; }
                        .footer { margin-top: 15px; font-size: 9px; color: #64748b; display: flex; justify-content: space-between; page-break-inside: avoid; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div>
                            <div class="title">${settings.namaPonpes || 'PONDOK PESANTREN'} - ${isAllDays ? 'REKAPITULASI JADWAL PELAJARAN GLOBAL (PEGANGAN TU)' : 'MATRIKS JADWAL INDUK RUANG GURU'}</div>
                            <div class="sub">HARI: <strong>${hariName.toUpperCase()}</strong> | MARHALAH / JENJANG: <strong>${jenjangName.toUpperCase()}</strong></div>
                        </div>
                        <div style="font-size:10px; font-weight:600; color:#0d9488;">
                            Dokumen Resmi Jadwal KBM
                        </div>
                    </div>

                    <table>
                        <thead>
                            <tr>
                                ${isAllDays ? `<th style="border:1px solid #0f766e; background:#0d9488; color:white; width:90px;">Hari</th>` : ''}
                                ${!isAllDays ? `
                                    <th style="border:1px solid #0f766e; background:#0d9488; color:white; width:40px;">Jam</th>
                                    <th style="border:1px solid #0f766e; background:#0d9488; color:white; width:80px;">Waktu</th>
                                ` : `
                                    <th style="border:1px solid #0f766e; background:#0d9488; color:white; width:95px;">Jam & Waktu</th>
                                `}
                                ${theadRombels}
                            </tr>
                        </thead>
                        <tbody>
                            ${tbodyRows}
                        </tbody>
                    </table>

                    <div class="footer">
                        <span>Dicetak otomatis oleh eSantri Web App | Matriks Jadwal KBM</span>
                        <span>Tanggal cetak: ${new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}</span>
                    </div>
                </body>
            </html>
        `);
        popup.document.close();
        popup.focus();
        setTimeout(() => {
            popup.print();
        }, 300);
    };

    // Export Master Board to Excel
    const handleExportExcelMatriks = async () => {
        if (isExporting) return;
        setIsExporting(true);
        try {
            const XLSX = await loadXLSX();
            const jenjangName = settings.jenjang.find(j => j.id === selectedJenjangId)?.nama || '';
            const hariName = HARI_LIST.find(h => h.id === selectedHari)?.nama || '';
            const isAllDays = selectedHari === -1;
            const targetDays = isAllDays ? HARI_LIST.filter(h => h.id >= 0) : HARI_LIST.filter(h => h.id === selectedHari);

            const wsData: any[][] = [];
            wsData.push([isAllDays ? `REKAPITULASI JADWAL PELAJARAN GLOBAL (PEGANGAN TU) - ${settings.namaPonpes || 'PESANTREN'}` : `MATRIKS JADWAL INDUK KBM - ${settings.namaPonpes || 'PESANTREN'}`]);
            wsData.push([`Hari: ${hariName} | Marhalah: ${jenjangName}`]);
            wsData.push([]);

            // Header row
            const headerRow = isAllDays 
                ? ['Hari', 'Jam & Waktu', ...rombelList.map(r => r.nama)]
                : ['Jam Ke', 'Waktu', ...rombelList.map(r => r.nama)];
            wsData.push(headerRow);

            targetDays.forEach(dayObj => {
                jamConfig.forEach(jam => {
                    const row: string[] = isAllDays
                        ? [dayObj.nama, `${jam.urutan} (${jam.jamMulai} - ${jam.jamSelesai})`]
                        : [String(jam.urutan), `${jam.jamMulai} - ${jam.jamSelesai}`];

                    rombelList.forEach(rombel => {
                        const j = jadwalList.find(item => item.rombelId === rombel.id && item.hari === dayObj.id && item.jamKe === jam.urutan);
                        if (!j) {
                            row.push('-');
                        } else {
                            const mapel = j.mapelId ? mapelMap.get(j.mapelId)?.nama : 'Tanpa Mapel';
                            const guru = j.guruId ? guruMap.get(j.guruId)?.nama : '-';
                            row.push(`${mapel} (${guru})`);
                        }
                    });
                    wsData.push(row);
                });
            });

            wsData.push([]);
            wsData.push(['dibuat dengan eSantri Web']);

            const ws = XLSX.utils.aoa_to_sheet(wsData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, isAllDays ? 'Rekap_Global_TU' : `Matriks_${hariName}`);
            const fileName = isAllDays 
                ? `${buildStandardExportFileName('rekap-jadwal-global-tu', [jenjangName])}.xlsx`
                : `${buildStandardExportFileName('matriks-jadwal-induk', [jenjangName, hariName])}.xlsx`;
            XLSX.writeFile(wb, fileName);
            showToast('Matriks Jadwal Induk berhasil diekspor ke Excel', 'success');
        } catch (e) {
            showToast('Gagal mengekspor matriks jadwal ke Excel', 'error');
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Sub Mode Selector */}
            <div className="w-full sm:w-fit grid grid-cols-2 sm:flex bg-slate-100/90 p-1 rounded-xl border border-slate-200/80 shadow-2xs gap-1 text-xs font-bold">
                <button
                    type="button"
                    onClick={() => setViewSubTab('matriks')}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2 sm:px-4 rounded-lg transition-all text-center ${
                        viewSubTab === 'matriks' ? 'bg-teal-700 text-white shadow-2xs' : 'text-gray-700 hover:text-gray-900 hover:bg-white/60'
                    }`}
                >
                    <i className="bi bi-grid-3x3 text-xs shrink-0"></i>
                    <span className="hidden sm:inline">Matriks Jadwal Induk (Master Board)</span>
                    <span className="sm:hidden">Matriks Induk</span>
                </button>
                <button
                    type="button"
                    onClick={() => setViewSubTab('rpe')}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2 sm:px-4 rounded-lg transition-all text-center ${
                        viewSubTab === 'rpe' ? 'bg-teal-700 text-white shadow-2xs' : 'text-gray-700 hover:text-gray-900 hover:bg-white/60'
                    }`}
                >
                    <i className="bi bi-calculator text-xs shrink-0"></i>
                    <span className="hidden sm:inline">Rencana Pekan Efektif (RPE)</span>
                    <span className="sm:hidden">Pekan Efektif (RPE)</span>
                </button>
            </div>

            {viewSubTab === 'matriks' ? (
                <>
                    {/* Filter Bar */}
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                            <select
                                value={selectedJenjangId}
                                onChange={e => setSelectedJenjangId(Number(e.target.value))}
                                className="bg-gray-50 border border-gray-300 text-gray-800 text-xs rounded-lg px-3 py-2 font-bold focus:ring-teal-500"
                            >
                                {settings.jenjang.map(j => (
                                    <option key={j.id} value={j.id}>{j.nama}</option>
                                ))}
                            </select>

                            <div className="flex overflow-x-auto gap-1 bg-gray-100 p-1 rounded-lg">
                                {HARI_LIST.map(h => (
                                    <button
                                        key={h.id}
                                        onClick={() => setSelectedHari(h.id)}
                                        className={`px-3 py-1.5 rounded-md text-xs font-bold whitespace-nowrap transition-all ${
                                            selectedHari === h.id ? 'bg-white text-teal-700 shadow-2xs' : 'text-gray-600 hover:text-gray-900'
                                        }`}
                                    >
                                        {h.nama}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                            <button
                                onClick={handlePrintMatriks}
                                className="px-3 py-2 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-2xs transition-colors"
                                title="Cetak format mading ruang guru A4 Landscape"
                            >
                                <i className="bi bi-printer"></i>
                                <span>Cetak Matriks</span>
                            </button>
                            <button
                                onClick={handleExportExcelMatriks}
                                disabled={isExporting}
                                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-2xs transition-colors disabled:opacity-50"
                            >
                                <i className="bi bi-file-earmark-excel-fill"></i>
                                <span>Ekspor Excel</span>
                            </button>
                        </div>
                    </div>

                    {/* Master Board Grid */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
                        <div className="p-3 bg-teal-50/70 border-b border-teal-100 flex justify-between items-center text-xs">
                            <div className="font-bold text-teal-900 flex items-center gap-2">
                                <i className="bi bi-display-fill text-teal-700"></i>
                                Matriks Jadwal: {HARI_LIST.find(h => h.id === selectedHari)?.nama} ({rombelList.length} Rombel Terdaftar)
                            </div>
                            <div className="text-[11px] text-gray-500 flex items-center gap-3">
                                <span className="flex items-center gap-1">
                                    <span className="w-2.5 h-2.5 rounded bg-teal-200 border border-teal-400"></span> Terjadwal
                                </span>
                                <span className="flex items-center gap-1">
                                    <span className="w-2.5 h-2.5 rounded bg-rose-200 border border-rose-400"></span> ⚠️ Bentrok Guru
                                </span>
                            </div>
                        </div>

                        {rombelList.length === 0 ? (
                            <div className="p-8 text-center text-gray-400 italic text-xs">
                                Tidak ada rombel di marhalah ini. Tambah rombel di menu Pengaturan Struktur.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse text-left text-xs">
                                    <thead>
                                        <tr className="bg-gray-50 border-b border-gray-200 text-gray-700">
                                            {selectedHari === -1 ? (
                                                <>
                                                    <th className="p-3 w-28 text-center font-bold border-r border-gray-200 bg-slate-100">Hari</th>
                                                    <th className="p-3 w-36 text-center font-bold border-r border-gray-200 bg-slate-100">Jam & Waktu</th>
                                                </>
                                            ) : (
                                                <>
                                                    <th className="p-3 w-14 text-center font-bold border-r border-gray-200">Jam</th>
                                                    <th className="p-3 w-28 text-center font-bold border-r border-gray-200">Waktu</th>
                                                </>
                                            )}
                                            {rombelList.map(r => (
                                                <th key={r.id} className="p-3 text-center font-bold border-r border-gray-200 min-w-[150px] bg-slate-50/80">
                                                    <div className="text-teal-800">{r.nama}</div>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {selectedHari === -1 ? (
                                            HARI_LIST.filter(h => h.id >= 0).map(dayObj => (
                                                jamConfig.map((jam, jIdx) => (
                                                    <tr key={`${dayObj.id}_${jam.urutan}`} className="hover:bg-gray-50/50">
                                                        {jIdx === 0 && (
                                                            <td
                                                                rowSpan={jamConfig.length}
                                                                className="p-3 text-center font-black text-teal-950 bg-teal-50/70 border-r border-gray-300 align-middle text-sm"
                                                            >
                                                                <div className="flex flex-col items-center justify-center">
                                                                    <span>{dayObj.nama}</span>
                                                                    <span className="text-[10px] font-normal text-teal-700 mt-0.5">{jamConfig.length} Jam</span>
                                                                </div>
                                                            </td>
                                                        )}
                                                        <td className="p-2.5 text-center font-bold text-gray-700 bg-gray-50/60 border-r border-gray-200">
                                                            <div className="text-xs">Jam {jam.urutan}</div>
                                                            <div className="text-[10px] text-gray-500 font-mono mt-0.5">{jam.jamMulai} - {jam.jamSelesai}</div>
                                                        </td>
                                                        {rombelList.map(rombel => {
                                                            const j = jadwalList.find(item => item.rombelId === rombel.id && item.hari === dayObj.id && item.jamKe === jam.urutan);
                                                            if (!j) {
                                                                return (
                                                                    <td key={rombel.id} className="p-3 text-center text-gray-300 border-r border-gray-100 font-mono text-[11px]">
                                                                        -
                                                                    </td>
                                                                );
                                                            }

                                                            const mapel = j.mapelId ? mapelMap.get(j.mapelId) : undefined;
                                                            const guru = j.guruId ? guruMap.get(j.guruId) : undefined;
                                                            const isConflict = j.guruId ? conflicts.has(`${j.hari}_${j.jamKe}_${j.guruId}`) : false;

                                                            return (
                                                                <td
                                                                    key={rombel.id}
                                                                    className={`p-2.5 border-r border-gray-200 transition-colors ${
                                                                        isConflict ? 'bg-rose-50 border-rose-300' : 'bg-teal-50/40 hover:bg-teal-50/80'
                                                                    }`}
                                                                >
                                                                    <div className="font-bold text-gray-900 leading-tight">
                                                                        {mapel?.nama || 'Tanpa Mapel'}
                                                                    </div>
                                                                    <div className="text-[11px] text-teal-700 font-medium mt-0.5 flex items-center gap-1">
                                                                        <i className="bi bi-person"></i>
                                                                        <span>{guru?.nama || '-'}</span>
                                                                    </div>
                                                                    <div className="flex items-center justify-between mt-1 pt-1 border-t border-gray-200/60 text-[10px] text-gray-500">
                                                                        <span>{mapel?.rumpun || ''}</span>
                                                                        {j.ruangan && <span>R: {j.ruangan}</span>}
                                                                    </div>
                                                                    {isConflict && (
                                                                        <div className="mt-1 px-1.5 py-0.5 bg-rose-600 text-white rounded text-[9px] font-bold text-center">
                                                                            ⚠️ BENTROK GURU
                                                                        </div>
                                                                    )}
                                                                </td>
                                                            );
                                                        })}
                                                    </tr>
                                                ))
                                            ))
                                        ) : (
                                            jamConfig.map(jam => (
                                                <tr key={jam.urutan} className="hover:bg-gray-50/50">
                                                    <td className="p-3 text-center font-black text-slate-700 bg-gray-50/80 border-r border-gray-200">
                                                        {jam.urutan}
                                                    </td>
                                                    <td className="p-3 text-center text-[11px] text-gray-500 font-mono border-r border-gray-200">
                                                        {jam.jamMulai} - {jam.jamSelesai}
                                                    </td>
                                                    {rombelList.map(rombel => {
                                                        const j = jadwalList.find(item => item.rombelId === rombel.id && item.hari === selectedHari && item.jamKe === jam.urutan);
                                                        if (!j) {
                                                            return (
                                                                <td key={rombel.id} className="p-3 text-center text-gray-300 border-r border-gray-100 font-mono text-[11px]">
                                                                    -
                                                                </td>
                                                            );
                                                        }

                                                        const mapel = j.mapelId ? mapelMap.get(j.mapelId) : undefined;
                                                        const guru = j.guruId ? guruMap.get(j.guruId) : undefined;
                                                        const isConflict = j.guruId ? conflicts.has(`${j.hari}_${j.jamKe}_${j.guruId}`) : false;

                                                        return (
                                                            <td
                                                                key={rombel.id}
                                                                className={`p-2.5 border-r border-gray-200 transition-colors ${
                                                                    isConflict ? 'bg-rose-50 border-rose-300' : 'bg-teal-50/40 hover:bg-teal-50/80'
                                                                }`}
                                                            >
                                                                <div className="font-bold text-gray-900 leading-tight">
                                                                    {mapel?.nama || 'Tanpa Mapel'}
                                                                </div>
                                                                <div className="text-[11px] text-teal-700 font-medium mt-0.5 flex items-center gap-1">
                                                                    <i className="bi bi-person"></i>
                                                                    <span>{guru?.nama || '-'}</span>
                                                                </div>
                                                                <div className="flex items-center justify-between mt-1 pt-1 border-t border-gray-200/60 text-[10px] text-gray-500">
                                                                    <span>{mapel?.rumpun || ''}</span>
                                                                    {j.ruangan && <span>R: {j.ruangan}</span>}
                                                                </div>
                                                                {isConflict && (
                                                                    <div className="mt-1 px-1.5 py-0.5 bg-rose-600 text-white rounded text-[9px] font-bold text-center">
                                                                        ⚠️ BENTROK GURU
                                                                    </div>
                                                                )}
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </>
            ) : (
                /* Rencana Pekan Efektif (RPE) View */
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* RPE Parameters Box */}
                        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-2xs space-y-4">
                            <h3 className="font-bold text-sm text-gray-800 flex items-center gap-2 border-b pb-2">
                                <i className="bi bi-sliders text-teal-600"></i> Parameter Semester & Pekan
                            </h3>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Semester</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setSemester('ganjil')}
                                        className={`py-2 text-xs rounded-lg font-bold border transition-all ${
                                            semester === 'ganjil' ? 'bg-teal-600 text-white border-teal-700' : 'bg-gray-50 text-gray-700 border-gray-200'
                                        }`}
                                    >
                                        Semester Ganjil
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSemester('genap')}
                                        className={`py-2 text-xs rounded-lg font-bold border transition-all ${
                                            semester === 'genap' ? 'bg-teal-600 text-white border-teal-700' : 'bg-gray-50 text-gray-700 border-gray-200'
                                        }`}
                                    >
                                        Semester Genap
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Jumlah Pekan dalam Semester</label>
                                <input
                                    type="number"
                                    min={1}
                                    max={35}
                                    value={totalPekan}
                                    onChange={e => setTotalPekan(Number(e.target.value))}
                                    className="w-full text-sm p-2 bg-gray-50 border rounded-lg"
                                />
                            </div>

                            <div className="pt-2 border-t border-gray-200 space-y-3">
                                <div className="text-xs font-bold text-gray-600 uppercase tracking-wider">Rincian Pekan Tidak Efektif:</div>

                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-gray-600">Libur Awal Semester / Matsama:</span>
                                    <input
                                        type="number"
                                        min={0}
                                        value={pekanLiburAwal}
                                        onChange={e => setPekanLiburAwal(Number(e.target.value))}
                                        className="w-16 p-1 text-center bg-gray-50 border rounded text-xs"
                                    />
                                </div>

                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-gray-600">Pekan Penilaian / Ujian:</span>
                                    <input
                                        type="number"
                                        min={0}
                                        value={pekanUjian}
                                        onChange={e => setPekanUjian(Number(e.target.value))}
                                        className="w-16 p-1 text-center bg-gray-50 border rounded text-xs"
                                    />
                                </div>

                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-gray-600">Libur Akhir Semester:</span>
                                    <input
                                        type="number"
                                        min={0}
                                        value={pekanLiburAkhir}
                                        onChange={e => setPekanLiburAkhir(Number(e.target.value))}
                                        className="w-16 p-1 text-center bg-gray-50 border rounded text-xs"
                                    />
                                </div>

                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-gray-600">Kegiatan Ponpes / Hari Besar:</span>
                                    <input
                                        type="number"
                                        min={0}
                                        value={pekanKegiatanLain}
                                        onChange={e => setPekanKegiatanLain(Number(e.target.value))}
                                        className="w-16 p-1 text-center bg-gray-50 border rounded text-xs"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Summary Cards */}
                        <div className="md:col-span-2 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-teal-50 border border-teal-200 p-5 rounded-xl">
                                    <div className="text-xs font-bold text-teal-800 uppercase tracking-wider">Jumlah Pekan Efektif KBM</div>
                                    <div className="text-3xl font-black text-teal-700 mt-2">{pekanEfektif} <span className="text-sm font-semibold">Pekan</span></div>
                                    <div className="text-xs text-teal-600 mt-1">
                                        Dari total {totalPekan} pekan semester
                                    </div>
                                </div>

                                <div className="bg-rose-50 border border-rose-200 p-5 rounded-xl">
                                    <div className="text-xs font-bold text-rose-800 uppercase tracking-wider">Pekan Tidak Efektif</div>
                                    <div className="text-3xl font-black text-rose-700 mt-2">{pekanTidakEfektif} <span className="text-sm font-semibold">Pekan</span></div>
                                    <div className="text-xs text-rose-600 mt-1">
                                        Libur, ujian, dan kegiatan pondok
                                    </div>
                                </div>
                            </div>

                            {/* Table Alokasi Jam Efektif Mapel */}
                            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-2xs">
                                <div className="p-3 bg-gray-50 border-b border-gray-200 font-bold text-xs text-gray-800">
                                    Distribusi Jam Efektif KBM per Mata Pelajaran ({settings.jenjang.find(j => j.id === selectedJenjangId)?.nama})
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs text-left">
                                        <thead className="bg-gray-50 border-b text-gray-600">
                                            <tr>
                                                <th className="p-3">Mata Pelajaran</th>
                                                <th className="p-3 text-center">Rumpun</th>
                                                <th className="p-3 text-center">Alokasi / Pekan</th>
                                                <th className="p-3 text-center font-bold text-teal-800">Total Jam Efektif</th>
                                                <th className="p-3 text-center">Target Bab</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {mapelInJenjang.map(m => {
                                                const alokasi = m.alokasiJamDefault || 2;
                                                const totalJamSemester = alokasi * pekanEfektif;

                                                return (
                                                    <tr key={m.id} className="hover:bg-teal-50/40">
                                                        <td className="p-3 font-bold text-gray-900">{m.nama}</td>
                                                        <td className="p-3 text-center">
                                                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-gray-100 font-medium">
                                                                {m.rumpun || 'Umum'}
                                                            </span>
                                                        </td>
                                                        <td className="p-3 text-center font-mono">{alokasi} Jam</td>
                                                        <td className="p-3 text-center font-bold text-teal-700 bg-teal-50/50">
                                                            {totalJamSemester} JP
                                                        </td>
                                                        <td className="p-3 text-center text-[11px] text-gray-600">
                                                            {m.targetBabSemester?.length ? `${m.targetBabSemester.length} Bab Pokok` : '-'}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                            {mapelInJenjang.length === 0 && (
                                                <tr>
                                                    <td colSpan={5} className="p-4 text-center text-gray-400 italic">
                                                        Belum ada mata pelajaran untuk jenjang ini.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
