import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../AppContext';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { JadwalUjian, TenagaPengajar, MataPelajaran, Rombel } from '../../types';
import { loadXLSX } from '../../utils/lazyClientLibs';
import { buildStandardExportFileName } from '../../utils/exportFileName';
import { getDefaultAcademicYear } from '../../utils/academicYear';
import { groupRombelsForTable, RombelSplitMode, RombelTableGroup } from '../../utils/rombelGrouping';

const HARI_NAMES = ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

const JENIS_UJIAN_OPTIONS = [
    'Penilaian Tengah Semester (PTS)',
    'Penilaian Akhir Semester (PAS / SAS)',
    'Penilaian Akhir Tahun (PAT / SAT)',
    'Ujian Akhir Diniyah / Salafiyah',
    'Ujian Munaqosyah & Tasmi Tahfizh',
    'Simulasi / Try Out Ujian',
];

interface SesiConfig {
    sesiKe: number;
    jamMulai: string;
    jamSelesai: string;
}

const DEFAULT_SESI_CONFIG: SesiConfig[] = [
    { sesiKe: 1, jamMulai: '07:30', jamSelesai: '09:00' },
    { sesiKe: 2, jamMulai: '09:30', jamSelesai: '11:00' },
    { sesiKe: 3, jamMulai: '11:15', jamSelesai: '12:30' },
];

export const TabJadwalUjian: React.FC = () => {
    const { settings, showToast, showConfirmation, currentUser } = useAppContext();
    const canWrite = currentUser?.role === 'admin' || currentUser?.permissions?.akademik === 'write';

    // Filters
    const [selectedJenjangId, setSelectedJenjangId] = useState<number>(settings.jenjang[0]?.id || 0);
    const [selectedJenisUjian, setSelectedJenisUjian] = useState<string>(JENIS_UJIAN_OPTIONS[1]); // Default PAS
    const [selectedSemester, setSelectedSemester] = useState<'Ganjil' | 'Genap'>('Ganjil');
    const [selectedTahunAjaran, setSelectedTahunAjaran] = useState<string>(getDefaultAcademicYear(settings));
    const [viewMode, setViewMode] = useState<'global_tu' | 'per_rombel' | 'pengawas'>('global_tu');
    const [selectedRombelId, setSelectedRombelId] = useState<number>(0);
    const [splitMode, setSplitMode] = useState<RombelSplitMode>('gender');
    const [activeGroupFilter, setActiveGroupFilter] = useState<string>('all');

    // Generator Modal State
    const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
    const [genTanggalMulai, setGenTanggalMulai] = useState<string>(() => {
        const today = new Date();
        return today.toISOString().split('T')[0];
    });
    const [genJumlahHari, setGenJumlahHari] = useState<number>(6);
    const [genSesiCount, setGenSesiCount] = useState<number>(2);
    const [genSesiTimes, setGenSesiTimes] = useState<SesiConfig[]>(DEFAULT_SESI_CONFIG);
    const [genCrossSupervisor, setGenCrossSupervisor] = useState<boolean>(true); // Pengawas silang
    const [genRespectAvailability, setGenRespectAvailability] = useState<boolean>(true); // Sesuai kesanggupan guru

    // Edit Slot Modal State
    const [editingSlot, setEditingSlot] = useState<Partial<JadwalUjian> | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    // Live query data from Dexie
    const allJadwalUjian = useLiveQuery(() => db.jadwalUjian.toArray(), []) || [];

    // Filtered data for active workspace
    const filteredJadwal = useMemo(() => {
        return allJadwalUjian.filter(j => 
            j.jenjangId === selectedJenjangId && 
            j.jenisUjian === selectedJenisUjian
        );
    }, [allJadwalUjian, selectedJenjangId, selectedJenisUjian]);

    // Helpers & Maps
    const kelasMap = useMemo(() => new Map(settings.kelas.map(k => [k.id, k])), [settings.kelas]);
    const mapelMap = useMemo(() => new Map<number, MataPelajaran>(settings.mataPelajaran.map(m => [m.id, m])), [settings.mataPelajaran]);
    const guruMap = useMemo(() => new Map<number, TenagaPengajar>(settings.tenagaPengajar.map(g => [g.id, g])), [settings.tenagaPengajar]);

    // Rombels for selected jenjang
    const rombelList = useMemo(() => {
        return settings.rombel.filter(r => {
            const k = kelasMap.get(r.kelasId);
            return k?.jenjangId === selectedJenjangId;
        });
    }, [settings.rombel, kelasMap, selectedJenjangId]);

    // Santri data for detecting rombel gender
    const allSantri = useLiveQuery(() => db.santri.toArray(), []) || [];

    // Grouping rombel for split table views
    const rombelGroups = useMemo<RombelTableGroup[]>(() => {
        return groupRombelsForTable(rombelList, splitMode, settings.kelas, allSantri);
    }, [rombelList, splitMode, settings.kelas, allSantri]);

    // Visible groups based on tab selection
    const visibleRombelGroups = useMemo<RombelTableGroup[]>(() => {
        if (splitMode === 'all' || activeGroupFilter === 'all') {
            return rombelGroups;
        }
        const found = rombelGroups.find(g => g.id === activeGroupFilter);
        return found ? [found] : rombelGroups;
    }, [rombelGroups, splitMode, activeGroupFilter]);

    // Mapels for selected jenjang
    const mapelList = useMemo(() => {
        return settings.mataPelajaran.filter(m => m.jenjangId === selectedJenjangId);
    }, [settings.mataPelajaran, selectedJenjangId]);

    // Distinct dates/days present in the schedule
    const distinctDates = useMemo(() => {
        const dateSet = new Set<string>();
        filteredJadwal.forEach(j => {
            if (j.tanggal) dateSet.add(j.tanggal);
        });
        return Array.from(dateSet).sort();
    }, [filteredJadwal]);

    // Distinct sessions
    const distinctSessions = useMemo(() => {
        const sesiSet = new Set<number>();
        filteredJadwal.forEach(j => sesiSet.add(j.sesiKe));
        if (sesiSet.size === 0) return [1, 2];
        return Array.from(sesiSet).sort((a, b) => a - b);
    }, [filteredJadwal]);

    // Conflict detection: supervisor assigned to more than 1 rombel on the same date & session
    const supervisorConflicts = useMemo(() => {
        const conflictKeys = new Set<string>(); // "tanggal_sesiKe_pengawasId"
        const seen = new Map<string, number>();

        filteredJadwal.forEach(j => {
            if (!j.pengawasId) return;
            const key = `${j.tanggal}_${j.sesiKe}_${j.pengawasId}`;
            if (seen.has(key)) {
                conflictKeys.add(key);
            } else {
                seen.set(key, j.rombelId);
            }
        });
        return conflictKeys;
    }, [filteredJadwal]);

    // ==========================================
    // AUTO GENERATOR JADWAL UJIAN
    // ==========================================
    const handleRunGenerator = async () => {
        if (!selectedJenjangId || rombelList.length === 0) {
            showToast('Tidak ada rombel terdaftar pada jenjang ini.', 'error');
            return;
        }
        if (mapelList.length === 0) {
            showToast('Tidak ada mata pelajaran terdaftar pada jenjang ini.', 'error');
            return;
        }

        showConfirmation(
            'Generate Jadwal Ujian Otomatis?',
            `Sistem akan menyusun jadwal ujian untuk ${rombelList.length} kelas di jenjang ini selama ${genJumlahHari} hari (${genSesiCount} sesi/hari). Pengawas akan diatur berdasarkan jam kesanggupan${genCrossSupervisor ? ' dengan metode pengawas silang' : ''}. Jadwal ujian sebelumnya pada filter ini akan ditimpa. Lanjutkan?`,
            async () => {
                try {
                    // 1. Delete existing schedules for this jenjang & exam type
                    const existingIds = filteredJadwal.map(j => j.id);
                    if (existingIds.length > 0) {
                        await db.jadwalUjian.bulkDelete(existingIds);
                    }

                    const newItems: JadwalUjian[] = [];
                    const startDateObj = new Date(genTanggalMulai);
                    const teachers = settings.tenagaPengajar;

                    // Supervisor assignment load tracker to balance distribution
                    const supervisorLoad = new Map<number, number>();
                    teachers.forEach(t => supervisorLoad.set(t.id, 0));

                    // Generate date list skipping Sunday if not active, or just sequential dates
                    const examDates: { dateStr: string; dayIndex: number; dayKe: number }[] = [];
                    let curDate = new Date(startDateObj);
                    let daysCounted = 0;
                    while (daysCounted < genJumlahHari) {
                        const dayIdx = curDate.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
                        // If Sunday (0) and pondok doesn't study on Sunday, skip or include? Default include if started on Sunday
                        const yyyy = curDate.getFullYear();
                        const mm = String(curDate.getMonth() + 1).padStart(2, '0');
                        const dd = String(curDate.getDate()).padStart(2, '0');
                        examDates.push({
                            dateStr: `${yyyy}-${mm}-${dd}`,
                            dayIndex: dayIdx,
                            dayKe: daysCounted + 1,
                        });
                        daysCounted++;
                        curDate.setDate(curDate.getDate() + 1);
                    }

                    // Build session schedule per rombel
                    // Distribute mapel sequentially across sessions
                    const sessionsToUse = genSesiTimes.slice(0, genSesiCount);

                    for (let dIdx = 0; dIdx < examDates.length; dIdx++) {
                        const dayInfo = examDates[dIdx];

                        for (const sesi of sessionsToUse) {
                            const globalSlotIndex = dIdx * genSesiCount + (sesi.sesiKe - 1);
                            const assignedSupervisorsThisSession = new Set<number>();

                            for (const rombel of rombelList) {
                                // Pick a mapel for this rombel (wrap around if mapel count < total slots)
                                const mapel = mapelList[globalSlotIndex % mapelList.length];
                                const mapelId = mapel ? mapel.id : undefined;

                                // Find suitable supervisor
                                // Candidate criteria:
                                // 1. Not already assigned in another room in this session
                                // 2. If genRespectAvailability: matches teacher's hariMasuk / jamMasuk
                                // 3. If genCrossSupervisor: teacher is NOT the primary teacher of this mapel
                                const candidates = teachers.filter(t => {
                                    // Conflict check
                                    if (assignedSupervisorsThisSession.has(t.id)) return false;

                                    // Day availability check
                                    if (genRespectAvailability && t.hariMasuk && t.hariMasuk.length > 0) {
                                        if (!t.hariMasuk.includes(dayInfo.dayIndex)) return false;
                                    }

                                    // Cross-supervisor check (guru pengampu mapel tidak mengawasi ujian mapelnya)
                                    if (genCrossSupervisor && mapelId && t.kompetensiMapelIds && t.kompetensiMapelIds.includes(mapelId)) {
                                        return false;
                                    }

                                    return true;
                                });

                                // Sort candidates by current load (least assigned gets priority)
                                candidates.sort((a, b) => {
                                    const loadA = supervisorLoad.get(a.id) || 0;
                                    const loadB = supervisorLoad.get(b.id) || 0;
                                    return loadA - loadB;
                                });

                                const chosenSupervisor = candidates[0] || teachers.find(t => !assignedSupervisorsThisSession.has(t.id));

                                if (chosenSupervisor) {
                                    assignedSupervisorsThisSession.add(chosenSupervisor.id);
                                    supervisorLoad.set(chosenSupervisor.id, (supervisorLoad.get(chosenSupervisor.id) || 0) + 1);
                                }

                                newItems.push({
                                    id: Date.now() + Math.random() * 100000 + newItems.length,
                                    jenjangId: selectedJenjangId,
                                    rombelId: rombel.id,
                                    jenisUjian: selectedJenisUjian,
                                    tahunAjaran: selectedTahunAjaran,
                                    semester: selectedSemester,
                                    tanggal: dayInfo.dateStr,
                                    hari: dayInfo.dayIndex,
                                    hariKe: dayInfo.dayKe,
                                    sesiKe: sesi.sesiKe,
                                    jamMulai: sesi.jamMulai,
                                    jamSelesai: sesi.jamSelesai,
                                    mapelId: mapelId,
                                    pengawasId: chosenSupervisor?.id,
                                    ruangan: rombel.nama,
                                    lastModified: Date.now(),
                                });
                            }
                        }
                    }

                    await db.jadwalUjian.bulkAdd(newItems);
                    setIsGeneratorOpen(false);
                    showToast(`Berhasil men-generate ${newItems.length} slot jadwal ujian dengan pengawas tertata!`, 'success');
                } catch (err) {
                    console.error('Generator error:', err);
                    showToast('Gagal men-generate jadwal ujian.', 'error');
                }
            },
            { confirmText: 'Ya, Susun Otomatis', confirmColor: 'green' }
        );
    };

    // ==========================================
    // EXPORT REKAP GLOBAL TU (PISAH TABEL ATAU GABUNG)
    // ==========================================
    const handleExportExcelGlobalTU = async () => {
        if (filteredJadwal.length === 0) {
            showToast('Belum ada jadwal ujian untuk diekspor.', 'error');
            return;
        }

        try {
            const XLSX = await loadXLSX();
            const jenjangName = settings.jenjang.find(j => j.id === selectedJenjangId)?.nama || 'Semua';
            const wb = XLSX.utils.book_new();

            const groupsToExport = visibleRombelGroups.length > 0 ? visibleRombelGroups : [{
                id: 'all',
                key: 'all',
                title: 'Seluruh Rombel',
                badge: `${rombelList.length} Kelas`,
                badgeColor: '',
                icon: '',
                rombels: rombelList,
            }];

            groupsToExport.forEach((group) => {
                const groupRombels = group.rombels;
                if (groupRombels.length === 0) return;

                const wsData: any[][] = [];

                // Title block
                wsData.push([`REKAPITULASI JADWAL UJIAN (PEGANGAN TU & PANITIA)`]);
                wsData.push([`Pondok Pesantren / Madrasah: ${settings.namaPonpes || 'Pondok Pesantren'}`]);
                wsData.push([`Jenis Ujian: ${selectedJenisUjian} | Jenjang: ${jenjangName} | Kelompok: ${group.title} (${groupRombels.map(r => r.nama).join(', ')})`]);
                wsData.push([`Tahun Ajaran: ${selectedTahunAjaran} (${selectedSemester})`]);
                wsData.push([]);

                // Headers: Hari & Tanggal | Sesi & Waktu | Rombel 1 | Rombel 2 | ...
                const headerRow = ['Hari & Tanggal', 'Sesi & Waktu', ...groupRombels.map(r => r.nama)];
                wsData.push(headerRow);

                // Group dates and sessions
                distinctDates.forEach(dateStr => {
                    const dateObj = new Date(dateStr);
                    const dayName = HARI_NAMES[dateObj.getDay()] || '';
                    const formattedDate = `${dayName}, ${dateStr}`;

                    distinctSessions.forEach(sesiKe => {
                        const sampleItem = filteredJadwal.find(j => j.tanggal === dateStr && j.sesiKe === sesiKe);
                        const waktuStr = sampleItem ? `${sampleItem.jamMulai} - ${sampleItem.jamSelesai}` : '-';
                        const sesiLabel = `Sesi ${sesiKe} (${waktuStr})`;

                        const rowCells: string[] = [formattedDate, sesiLabel];

                        groupRombels.forEach(rombel => {
                            const item = filteredJadwal.find(j => j.rombelId === rombel.id && j.tanggal === dateStr && j.sesiKe === sesiKe);
                            if (!item) {
                                rowCells.push('-');
                            } else {
                                const mapelName = item.mapelId ? (mapelMap.get(item.mapelId)?.nama || 'Mapel') : 'Kosong';
                                const pengawasName = item.pengawasId ? (guruMap.get(item.pengawasId)?.nama || '-') : 'Tanpa Pengawas';
                                rowCells.push(`${mapelName}\n(P: ${pengawasName})`);
                            }
                        });

                        wsData.push(rowCells);
                    });
                });

                const ws = XLSX.utils.aoa_to_sheet(wsData);
                ws['!cols'] = [
                    { wch: 22 },
                    { wch: 22 },
                    ...groupRombels.map(() => ({ wch: 24 })),
                ];

                let sheetName = groupsToExport.length === 1
                    ? 'Rekap_Ujian_TU'
                    : `TU_${group.title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 25)}`;
                if (sheetName.length > 31) sheetName = sheetName.substring(0, 31);

                XLSX.utils.book_append_sheet(wb, ws, sheetName);
            });

            const fileName = `${buildStandardExportFileName('rekap-jadwal-ujian-global-tu', [jenjangName, selectedJenisUjian])}.xlsx`;
            XLSX.writeFile(wb, fileName);
            showToast('Rekap global jadwal ujian berhasil diekspor ke Excel.', 'success');
        } catch (e) {
            console.error(e);
            showToast('Gagal mengekspor data ke Excel.', 'error');
        }
    };

    // ==========================================
    // CETAK REKAP GLOBAL TU (A4 LANDSCAPE)
    // ==========================================
    const handlePrintGlobalTU = () => {
        if (filteredJadwal.length === 0) {
            showToast('Belum ada data jadwal untuk dicetak.', 'error');
            return;
        }

        const popup = window.open('', '_blank', 'width=1200,height=800');
        if (!popup) {
            showToast('Izinkan pop-up untuk mencetak rekap jadwal ujian.', 'error');
            return;
        }

        const jenjangName = settings.jenjang.find(j => j.id === selectedJenjangId)?.nama || '';

        const groupsToPrint = visibleRombelGroups.length > 0 ? visibleRombelGroups : [{
            id: 'all',
            key: 'all',
            title: 'Seluruh Rombel',
            badge: `${rombelList.length} Kelas`,
            badgeColor: '',
            icon: '',
            rombels: rombelList,
        }];

        let tablesHtml = '';
        groupsToPrint.forEach((group, gIdx) => {
            const groupRombels = group.rombels;
            if (groupRombels.length === 0) return;

            let tableRowsHtml = '';
            distinctDates.forEach(dateStr => {
                const dateObj = new Date(dateStr);
                const dayName = HARI_NAMES[dateObj.getDay()] || '';
                const formattedDate = `${dayName}, ${dateStr}`;
                const sesiCountForDay = distinctSessions.length;

                distinctSessions.forEach((sesiKe, sIdx) => {
                    const sampleItem = filteredJadwal.find(j => j.tanggal === dateStr && j.sesiKe === sesiKe);
                    const waktuStr = sampleItem ? `${sampleItem.jamMulai} - ${sampleItem.jamSelesai}` : '-';

                    let rowHtml = '<tr>';
                    if (sIdx === 0) {
                        rowHtml += `<td rowspan="${sesiCountForDay}" style="border:1px solid #334155; padding:6px; font-weight:bold; background:#f1f5f9; text-align:center; font-size:11px; width:110px;">${formattedDate}</td>`;
                    }

                    rowHtml += `<td style="border:1px solid #334155; padding:6px; text-align:center; background:#f8fafc; font-weight:600; font-size:10.5px; width:115px;">Sesi ${sesiKe}<br><span style="font-size:9px; color:#64748b; font-weight:normal;">${waktuStr}</span></td>`;

                    groupRombels.forEach(rombel => {
                        const item = filteredJadwal.find(j => j.rombelId === rombel.id && j.tanggal === dateStr && j.sesiKe === sesiKe);
                        if (!item) {
                            rowHtml += `<td style="border:1px solid #cbd5e1; padding:6px; text-align:center; color:#94a3b8; font-size:10px;">-</td>`;
                        } else {
                            const mapel = item.mapelId ? mapelMap.get(item.mapelId) : undefined;
                            const pengawas = item.pengawasId ? guruMap.get(item.pengawasId) : undefined;
                            const isConflict = item.pengawasId ? supervisorConflicts.has(`${item.tanggal}_${item.sesiKe}_${item.pengawasId}`) : false;

                            rowHtml += `
                                <td style="border:1px solid #cbd5e1; padding:6px; font-size:10px; ${isConflict ? 'background:#fee2e2;' : 'background:#ffffff;'}">
                                    <div style="font-weight:bold; color:#0f172a; font-size:10.5px;">${mapel?.nama || 'Tanpa Mapel'}</div>
                                    <div style="color:#0d9488; font-size:9.5px; margin-top:2px; font-weight:600;">P: ${pengawas?.nama || '-'}</div>
                                    ${isConflict ? `<div style="color:#dc2626; font-size:8.5px; font-weight:bold;">⚠️ BENTROK PENGAWAS</div>` : ''}
                                </td>
                            `;
                        }
                    });

                    rowHtml += '</tr>';
                    tableRowsHtml += rowHtml;
                });
            });

            const isLast = gIdx === groupsToPrint.length - 1;
            const groupBanner = groupsToPrint.length > 1 ? `
                <div style="background:#f0fdfa; border:1px solid #99f6e4; padding:6px 12px; border-radius:6px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-weight:bold; font-size:12px; color:#0f766e; text-transform:uppercase;">
                        ${group.title} (${group.rombels.length} Kelas: ${group.rombels.map(r => r.nama).join(', ')})
                    </span>
                    <span style="font-size:10px; color:#0d9488; font-weight:bold;">
                        Tabel ${gIdx + 1} dari ${groupsToPrint.length}
                    </span>
                </div>
            ` : '';

            tablesHtml += `
                <div style="${!isLast ? 'page-break-after: always; margin-bottom: 25px;' : ''}">
                    ${groupBanner}
                    <table style="width:100%; border-collapse:collapse; margin-bottom:15px;">
                        <thead>
                            <tr>
                                <th style="width:110px;">Hari & Tanggal</th>
                                <th style="width:115px;">Sesi & Waktu</th>
                                ${groupRombels.map(r => `<th>${r.nama}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            ${tableRowsHtml}
                        </tbody>
                    </table>
                </div>
            `;
        });

        popup.document.write(`
            <!DOCTYPE html>
            <html>
                <head>
                    <title>Rekap Global Jadwal Ujian - Pegangan TU</title>
                    <style>
                        @page { size: A4 landscape; margin: 10mm; }
                        body { font-family: Arial, sans-serif; color: #0f172a; margin: 0; padding: 10px; }
                        .kop { text-align: center; border-bottom: 2px solid #0f766e; padding-bottom: 8px; margin-bottom: 12px; }
                        .kop h1 { margin: 0; font-size: 16px; font-weight: bold; color: #0f766e; text-transform: uppercase; }
                        .kop p { margin: 2px 0 0; font-size: 10px; color: #475569; }
                        .title-box { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 10px; }
                        .title-box h2 { margin: 0; font-size: 13px; font-weight: bold; text-transform: uppercase; }
                        .title-box span { font-size: 10px; font-weight: 600; color: #0f766e; }
                        table { width: 100%; border-collapse: collapse; page-break-inside: auto; }
                        tr { page-break-inside: avoid; page-break-after: auto; }
                        th { background: #0f766e; color: white; border: 1px solid #0f766e; padding: 6px; font-size: 10.5px; text-transform: uppercase; }
                        .footer-sign { margin-top: 25px; display: flex; justify-content: space-between; page-break-inside: avoid; }
                        .sign-box { width: 200px; text-align: center; font-size: 10.5px; }
                        .sign-space { height: 50px; }
                    </style>
                </head>
                <body>
                    <div class="kop">
                        <h1>${settings.namaPonpes || 'PONDOK PESANTREN'}</h1>
                        <p>${settings.alamat || ''} | Telp: ${settings.telepon || '-'} | NPSN: ${settings.npsn || '-'}</p>
                    </div>

                    <div class="title-box">
                        <div>
                            <h2>${selectedJenisUjian} - REKAPITULASI MASTER PEGANGAAN TU</h2>
                            <div style="font-size:10px; color:#475569; margin-top:2px;">
                                Jenjang: <strong>${jenjangName}</strong> | Tahun Ajaran: <strong>${selectedTahunAjaran} (${selectedSemester})</strong>
                            </div>
                        </div>
                        <span>Dicetak: ${new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })} (${groupsToPrint.length} Kelompok Tabel)</span>
                    </div>

                    ${tablesHtml}

                    <div class="footer-sign">
                        <div class="sign-box">
                            Mengetahui,<br>
                            <strong>Kepala Madrasah / Pimpinan</strong>
                            <div class="sign-space"></div>
                            <strong>( .................................................. )</strong>
                        </div>
                        <div class="sign-box">
                            ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}<br>
                            <strong>Ketua Panitia Ujian</strong>
                            <div class="sign-space"></div>
                            <strong>( .................................................. )</strong>
                        </div>
                    </div>

                    <script>
                        window.onload = function() { window.print(); }
                    </script>
                </body>
            </html>
        `);
        popup.document.close();
    };

    // ==========================================
    // SAVE / DELETE MANUAL SLOT
    // ==========================================
    const handleSaveManualSlot = async () => {
        if (!editingSlot || !editingSlot.rombelId || !editingSlot.tanggal) return;

        try {
            if (editingSlot.id && editingSlot.id > 0) {
                await db.jadwalUjian.update(editingSlot.id, {
                    ...editingSlot,
                    lastModified: Date.now(),
                });
            } else {
                await db.jadwalUjian.add({
                    id: Date.now(),
                    jenjangId: selectedJenjangId,
                    rombelId: editingSlot.rombelId,
                    jenisUjian: selectedJenisUjian,
                    tahunAjaran: selectedTahunAjaran,
                    semester: selectedSemester,
                    tanggal: editingSlot.tanggal,
                    hari: new Date(editingSlot.tanggal).getDay(),
                    sesiKe: editingSlot.sesiKe || 1,
                    jamMulai: editingSlot.jamMulai || '07:30',
                    jamSelesai: editingSlot.jamSelesai || '09:00',
                    mapelId: editingSlot.mapelId,
                    pengawasId: editingSlot.pengawasId,
                    ruangan: editingSlot.ruangan,
                    lastModified: Date.now(),
                } as JadwalUjian);
            }
            setIsEditModalOpen(false);
            setEditingSlot(null);
            showToast('Slot jadwal ujian berhasil disimpan.', 'success');
        } catch (e) {
            console.error(e);
            showToast('Gagal menyimpan slot jadwal ujian.', 'error');
        }
    };

    const handleDeleteSlot = async (id: number) => {
        if (!canWrite) return;
        try {
            await db.jadwalUjian.delete(id);
            setIsEditModalOpen(false);
            setEditingSlot(null);
            showToast('Slot jadwal ujian dihapus.', 'info');
        } catch (e) {
            showToast('Gagal menghapus slot.', 'error');
        }
    };

    const handleClearAllExamSchedules = () => {
        if (!canWrite || filteredJadwal.length === 0) return;
        showConfirmation(
            'Hapus Seluruh Jadwal Ujian?',
            `Apakah Anda yakin ingin mengosongkan seluruh jadwal ${selectedJenisUjian} untuk jenjang ini? Data tidak dapat dikembalikan.`,
            async () => {
                const ids = filteredJadwal.map(j => j.id);
                await db.jadwalUjian.bulkDelete(ids);
                showToast('Jadwal ujian berhasil dibersihkan.', 'success');
            },
            { confirmText: 'Ya, Kosongkan', confirmColor: 'red' }
        );
    };

    return (
        <div className="space-y-6">
            {/* Top Control & Filter Bar */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-gray-100 pb-4 mb-4">
                    <div>
                        <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
                            <i className="bi bi-file-earmark-ruled-fill text-teal-600"></i>
                            Jadwal Ujian & Generator Pengawas
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Penyusunan jadwal ujian otomatis berbasis jam kesanggupan pengajar, anti-bentrok, dan rekap satu tabel pegangan TU.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                        {canWrite && (
                            <>
                                <button
                                    onClick={() => setIsGeneratorOpen(true)}
                                    className="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-black flex items-center gap-1.5 shadow-xs transition-all active:scale-95"
                                >
                                    <i className="bi bi-magic"></i>
                                    <span>Auto Generator Ujian</span>
                                </button>
                                <button
                                    onClick={handleClearAllExamSchedules}
                                    disabled={filteredJadwal.length === 0}
                                    className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-bold disabled:opacity-50 transition-colors"
                                >
                                    <i className="bi bi-trash"></i>
                                </button>
                            </>
                        )}
                        <button
                            onClick={handlePrintGlobalTU}
                            disabled={filteredJadwal.length === 0}
                            className="px-3.5 py-2 bg-gray-900 hover:bg-black text-white rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 shadow-xs"
                        >
                            <i className="bi bi-printer"></i>
                            <span>Cetak Rekap TU</span>
                        </button>
                        <button
                            onClick={handleExportExcelGlobalTU}
                            disabled={filteredJadwal.length === 0}
                            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 shadow-xs"
                        >
                            <i className="bi bi-file-earmark-excel"></i>
                            <span>Export Excel TU</span>
                        </button>
                    </div>
                </div>

                {/* Filter Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Jenjang Pendidikan</label>
                        <select
                            value={selectedJenjangId}
                            onChange={e => setSelectedJenjangId(Number(e.target.value))}
                            className="w-full border border-gray-300 rounded-lg p-2 text-xs font-bold bg-gray-50 focus:bg-white focus:ring-1 focus:ring-teal-500"
                        >
                            {settings.jenjang.map(j => (
                                <option key={j.id} value={j.id}>{j.nama}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Jenis Evaluasi / Ujian</label>
                        <select
                            value={selectedJenisUjian}
                            onChange={e => setSelectedJenisUjian(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg p-2 text-xs font-bold bg-gray-50 focus:bg-white focus:ring-1 focus:ring-teal-500"
                        >
                            {JENIS_UJIAN_OPTIONS.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Semester & Tahun Ajaran</label>
                        <div className="flex gap-2">
                            <select
                                value={selectedSemester}
                                onChange={e => setSelectedSemester(e.target.value as any)}
                                className="w-1/2 border border-gray-300 rounded-lg p-2 text-xs font-bold bg-gray-50"
                            >
                                <option value="Ganjil">Ganjil</option>
                                <option value="Genap">Genap</option>
                            </select>
                            <input
                                type="text"
                                value={selectedTahunAjaran}
                                onChange={e => setSelectedTahunAjaran(e.target.value)}
                                className="w-1/2 border border-gray-300 rounded-lg p-2 text-xs font-bold bg-gray-50"
                                placeholder="2026/2027"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Format Tampilan</label>
                        <div className="flex rounded-lg border border-gray-300 p-0.5 bg-gray-50">
                            <button
                                onClick={() => setViewMode('global_tu')}
                                className={`flex-1 py-1 text-xs font-bold rounded-md transition-all ${viewMode === 'global_tu' ? 'bg-teal-600 text-white shadow-2xs' : 'text-gray-600 hover:text-gray-900'}`}
                            >
                                Rekap Global TU
                            </button>
                            <button
                                onClick={() => setViewMode('per_rombel')}
                                className={`flex-1 py-1 text-xs font-bold rounded-md transition-all ${viewMode === 'per_rombel' ? 'bg-teal-600 text-white shadow-2xs' : 'text-gray-600 hover:text-gray-900'}`}
                            >
                                Per Rombel
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Metrics & Conflict Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-white border border-gray-200 rounded-xl shadow-2xs">
                    <div className="text-[10px] font-bold text-gray-500 uppercase">Total Rombel</div>
                    <div className="text-xl font-black text-gray-900 mt-0.5">{rombelList.length} <span className="text-xs font-normal text-gray-500">Kelas</span></div>
                </div>
                <div className="p-3 bg-white border border-gray-200 rounded-xl shadow-2xs">
                    <div className="text-[10px] font-bold text-gray-500 uppercase">Total Hari Pelaksanaan</div>
                    <div className="text-xl font-black text-teal-700 mt-0.5">{distinctDates.length} <span className="text-xs font-normal text-gray-500">Hari</span></div>
                </div>
                <div className="p-3 bg-white border border-gray-200 rounded-xl shadow-2xs">
                    <div className="text-[10px] font-bold text-gray-500 uppercase">Slot Terjadwal</div>
                    <div className="text-xl font-black text-indigo-700 mt-0.5">{filteredJadwal.length} <span className="text-xs font-normal text-gray-500">Ujian</span></div>
                </div>
                <div className={`p-3 border rounded-xl shadow-2xs ${supervisorConflicts.size > 0 ? 'bg-red-50 border-red-200 text-red-900' : 'bg-emerald-50 border-emerald-200 text-emerald-900'}`}>
                    <div className="text-[10px] font-bold uppercase">{supervisorConflicts.size > 0 ? 'Bentrok Pengawas' : 'Integritas Jadwal'}</div>
                    <div className="text-xl font-black mt-0.5 flex items-center gap-1.5">
                        {supervisorConflicts.size > 0 ? (
                            <>
                                <span>{supervisorConflicts.size}</span>
                                <span className="text-xs font-bold text-red-600">Perlu Koreksi</span>
                            </>
                        ) : (
                            <>
                                <i className="bi bi-check-circle-fill text-emerald-600 text-lg"></i>
                                <span className="text-xs font-bold text-emerald-700">100% Aman</span>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* MAIN CONTENT AREA */}
            {filteredJadwal.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
                    <i className="bi bi-calendar-x text-4xl text-gray-300 mb-2 block"></i>
                    <h4 className="text-base font-bold text-gray-700">Belum Ada Jadwal Ujian Tersusun</h4>
                    <p className="text-xs text-gray-500 max-w-md mx-auto mt-1 mb-4">
                        Gunakan fitur <strong>Auto Generator Ujian</strong> untuk menyusun distribusi mata pelajaran dan pengawas otomatis berdasarkan jam kesanggupan pengajar.
                    </p>
                    {canWrite && (
                        <button
                            onClick={() => setIsGeneratorOpen(true)}
                            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 shadow-xs"
                        >
                            <i className="bi bi-magic"></i>
                            <span>Buka Generator Jadwal Ujian</span>
                        </button>
                    )}
                </div>
            ) : (
                <>
                    {/* VIEW MODE 1: REKAP GLOBAL TU (PISAH TABEL ATAU GABUNG SELURUH KELAS) */}
                    {viewMode === 'global_tu' && (
                        <div className="space-y-4">
                            {/* Opsi Pisah Tabel Antar Rombel */}
                            <div className="bg-white rounded-xl border border-teal-200 p-3 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
                                        <i className="bi bi-layout-split text-base"></i>
                                    </div>
                                    <div>
                                        <div className="text-xs font-black text-gray-900 flex items-center gap-2">
                                            <span>Opsi Format Tabel Rombel:</span>
                                            {splitMode !== 'all' && (
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">
                                                    {rombelGroups.length} Tabel Terpisah
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-[10px] text-gray-500">
                                            Pisahkan kolom rombel agar tidak sesak dan mudah dibaca/dicetak
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                                    <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg p-1">
                                        <span className="text-[10px] font-bold text-gray-500 pl-1">Bagi Tabel:</span>
                                        <select
                                            value={splitMode}
                                            onChange={(e) => {
                                                setSplitMode(e.target.value as RombelSplitMode);
                                                setActiveGroupFilter('all');
                                            }}
                                            className="text-xs font-bold bg-white border border-gray-300 rounded px-2 py-1 text-gray-800 focus:ring-1 focus:ring-teal-500"
                                        >
                                            <option value="all">Satu Tabel Gabungan (Semua Rombel)</option>
                                            <option value="gender">Pisah Tabel Putra & Putri (Disarankan)</option>
                                            <option value="kelas">Pisah Per Tingkat Kelas</option>
                                            <option value="chunk4">Bagi Maks. 4 Rombel / Tabel</option>
                                            <option value="chunk3">Bagi Maks. 3 Rombel / Tabel (Renggang)</option>
                                        </select>
                                    </div>

                                    {/* Group tabs selector */}
                                    {splitMode !== 'all' && rombelGroups.length > 1 && (
                                        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
                                            <button
                                                type="button"
                                                onClick={() => setActiveGroupFilter('all')}
                                                className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-colors ${
                                                    activeGroupFilter === 'all'
                                                        ? 'bg-teal-700 text-white shadow-2xs'
                                                        : 'text-gray-600 hover:text-gray-900'
                                                }`}
                                            >
                                                Tampilkan Semua ({rombelGroups.length})
                                            </button>
                                            {rombelGroups.map(g => (
                                                <button
                                                    key={g.id}
                                                    type="button"
                                                    onClick={() => setActiveGroupFilter(g.id)}
                                                    className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-colors flex items-center gap-1.5 ${
                                                        activeGroupFilter === g.id
                                                            ? 'bg-teal-700 text-white shadow-2xs'
                                                            : 'text-gray-600 hover:text-gray-900'
                                                    }`}
                                                >
                                                    {g.icon && <i className={`bi ${g.icon}`}></i>}
                                                    <span>{g.title}</span>
                                                    <span className="text-[9px] px-1 py-0.2 rounded bg-black/10">
                                                        {g.rombels.length}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Multi Table Rendering */}
                            {visibleRombelGroups.map((group, groupIndex) => {
                                const groupRombels = group.rombels;
                                if (groupRombels.length === 0) return null;

                                return (
                                    <div key={group.id} className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
                                        <div className="p-3.5 bg-gray-50 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                            <div className="flex items-center gap-2">
                                                {group.icon && (
                                                    <div className="w-6 h-6 rounded bg-teal-100 text-teal-800 flex items-center justify-center text-xs">
                                                        <i className={`bi ${group.icon}`}></i>
                                                    </div>
                                                )}
                                                <div>
                                                    <span className="text-xs font-black text-gray-900 uppercase tracking-wide">
                                                        {group.title}
                                                    </span>
                                                    <span className="text-[11px] text-gray-500 block sm:inline sm:ml-2">
                                                        • Klik pada sel jadwal untuk mengedit mapel atau menugaskan pengawas
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[11px] font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200">
                                                    {groupRombels.length} Kolom Kelas ({groupRombels.map(r => r.nama).join(', ')})
                                                </span>
                                                {visibleRombelGroups.length > 1 && (
                                                    <span className="text-[10px] text-gray-400 font-bold">
                                                        Tabel {groupIndex + 1}/{visibleRombelGroups.length}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left border-collapse min-w-[700px]">
                                                <thead>
                                                    <tr className="bg-teal-700 text-white text-[11px] font-bold uppercase tracking-wider">
                                                        <th className="p-2.5 border border-teal-800 text-center w-36">Hari & Tanggal</th>
                                                        <th className="p-2.5 border border-teal-800 text-center w-36">Sesi & Waktu</th>
                                                        {groupRombels.map(r => (
                                                            <th key={r.id} className="p-2.5 border border-teal-800 text-center min-w-[150px]">
                                                                {r.nama}
                                                            </th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-200 text-xs">
                                                    {distinctDates.map(dateStr => {
                                                        const dateObj = new Date(dateStr);
                                                        const dayName = HARI_NAMES[dateObj.getDay()] || '';
                                                        const formattedDate = `${dayName}, ${dateStr}`;
                                                        const sesiCountForDay = distinctSessions.length;

                                                        return distinctSessions.map((sesiKe, sIdx) => {
                                                            const sampleItem = filteredJadwal.find(j => j.tanggal === dateStr && j.sesiKe === sesiKe);
                                                            const waktuStr = sampleItem ? `${sampleItem.jamMulai} - ${sampleItem.jamSelesai}` : '-';

                                                            return (
                                                                <tr key={`${dateStr}_${sesiKe}`} className="hover:bg-gray-50/70 transition-colors">
                                                                    {sIdx === 0 && (
                                                                        <td
                                                                            rowSpan={sesiCountForDay}
                                                                            className="p-3 border border-gray-200 font-black text-gray-800 bg-gray-50 text-center align-middle"
                                                                        >
                                                                            <div className="text-xs">{dayName}</div>
                                                                            <div className="text-[10px] text-gray-500 font-mono mt-0.5">{dateStr}</div>
                                                                        </td>
                                                                    )}

                                                                    <td className="p-2.5 border border-gray-200 text-center font-bold text-gray-700 bg-gray-50/50">
                                                                        <div className="text-xs text-teal-800">Sesi {sesiKe}</div>
                                                                        <div className="text-[10px] font-mono text-gray-500 mt-0.5">{waktuStr}</div>
                                                                    </td>

                                                                    {groupRombels.map(rombel => {
                                                                        const item = filteredJadwal.find(j => j.rombelId === rombel.id && j.tanggal === dateStr && j.sesiKe === sesiKe);
                                                                        const mapel = item?.mapelId ? mapelMap.get(item.mapelId) : undefined;
                                                                        const pengawas = item?.pengawasId ? guruMap.get(item.pengawasId) : undefined;
                                                                        const isConflict = item?.pengawasId ? supervisorConflicts.has(`${item.tanggal}_${item.sesiKe}_${item.pengawasId}`) : false;

                                                                        return (
                                                                            <td
                                                                                key={rombel.id}
                                                                                onClick={() => {
                                                                                    if (canWrite) {
                                                                                        setEditingSlot(item || {
                                                                                            jenjangId: selectedJenjangId,
                                                                                            rombelId: rombel.id,
                                                                                            tanggal: dateStr,
                                                                                            sesiKe: sesiKe,
                                                                                            jamMulai: sampleItem?.jamMulai || '07:30',
                                                                                            jamSelesai: sampleItem?.jamSelesai || '09:00',
                                                                                            jenisUjian: selectedJenisUjian,
                                                                                        });
                                                                                        setIsEditModalOpen(true);
                                                                                    }
                                                                                }}
                                                                                className={`p-2.5 border border-gray-200 align-top cursor-pointer transition-all ${
                                                                                    isConflict
                                                                                        ? 'bg-red-50 hover:bg-red-100/80'
                                                                                        : item
                                                                                        ? 'hover:bg-teal-50/60'
                                                                                        : 'hover:bg-gray-100/50'
                                                                                }`}
                                                                            >
                                                                                {item ? (
                                                                                    <div className="space-y-1">
                                                                                        <div className="font-black text-gray-900 text-xs">
                                                                                            {mapel?.nama || <span className="text-gray-400 italic">Tanpa Mapel</span>}
                                                                                        </div>
                                                                                        <div className="flex items-center gap-1 text-[10.5px] text-teal-700 font-semibold">
                                                                                            <i className="bi bi-person-check text-xs"></i>
                                                                                            <span className="line-clamp-1">{pengawas?.nama || 'Tanpa Pengawas'}</span>
                                                                                        </div>
                                                                                        {isConflict && (
                                                                                            <div className="text-[9px] font-bold text-red-600 bg-red-100/80 px-1.5 py-0.5 rounded flex items-center gap-1">
                                                                                                <i className="bi bi-exclamation-triangle-fill"></i>
                                                                                                <span>Bentrok Pengawas</span>
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                ) : (
                                                                                    <div className="text-center py-2 text-gray-300 hover:text-teal-600">
                                                                                        <i className="bi bi-plus-circle"></i>
                                                                                    </div>
                                                                                )}
                                                                            </td>
                                                                        );
                                                                    })}
                                                                </tr>
                                                            );
                                                        });
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* VIEW MODE 2: PER ROMBEL CARD VIEW */}
                    {viewMode === 'per_rombel' && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <label className="text-xs font-bold text-gray-600">Pilih Rombel:</label>
                                <select
                                    value={selectedRombelId}
                                    onChange={e => setSelectedRombelId(Number(e.target.value))}
                                    className="border border-gray-300 rounded-lg p-2 text-xs font-bold bg-white focus:ring-1 focus:ring-teal-500"
                                >
                                    <option value={0}>Semua Rombel</option>
                                    {rombelList.map(r => (
                                        <option key={r.id} value={r.id}>{r.nama}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                {rombelList
                                    .filter(r => selectedRombelId === 0 || r.id === selectedRombelId)
                                    .map(rombel => {
                                        const rombelSlots = filteredJadwal.filter(j => j.rombelId === rombel.id);

                                        return (
                                            <div key={rombel.id} className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
                                                <div className="p-3 bg-teal-50/70 border-b border-teal-100 flex justify-between items-center">
                                                    <div className="font-black text-xs text-teal-900 flex items-center gap-1.5">
                                                        <i className="bi bi-mortarboard-fill text-teal-600"></i>
                                                        <span>{rombel.nama}</span>
                                                    </div>
                                                    <span className="text-[10px] font-bold bg-teal-600 text-white px-2 py-0.5 rounded-full">
                                                        {rombelSlots.length} Mapel
                                                    </span>
                                                </div>

                                                <div className="divide-y divide-gray-100 text-xs max-h-80 overflow-y-auto">
                                                    {rombelSlots.length === 0 ? (
                                                        <div className="p-6 text-center text-gray-400 text-xs italic">
                                                            Belum ada jadwal untuk kelas ini.
                                                        </div>
                                                    ) : (
                                                        rombelSlots.map(slot => {
                                                            const mapel = slot.mapelId ? mapelMap.get(slot.mapelId) : undefined;
                                                            const pengawas = slot.pengawasId ? guruMap.get(slot.pengawasId) : undefined;
                                                            const dateObj = new Date(slot.tanggal);
                                                            const dayName = HARI_NAMES[dateObj.getDay()] || '';

                                                            return (
                                                                <div
                                                                    key={slot.id}
                                                                    onClick={() => {
                                                                        if (canWrite) {
                                                                            setEditingSlot(slot);
                                                                            setIsEditModalOpen(true);
                                                                        }
                                                                    }}
                                                                    className="p-2.5 hover:bg-gray-50 flex items-start justify-between gap-2 cursor-pointer"
                                                                >
                                                                    <div>
                                                                        <div className="font-black text-gray-900">{mapel?.nama || 'Tanpa Mapel'}</div>
                                                                        <div className="text-[10px] text-gray-500 mt-0.5">
                                                                            {dayName}, {slot.tanggal} • Sesi {slot.sesiKe} ({slot.jamMulai} - {slot.jamSelesai})
                                                                        </div>
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <div className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                                                                            {pengawas?.nama || 'Tanpa Pengawas'}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* ======================================================== */}
            {/* MODAL AUTO GENERATOR JADWAL UJIAN */}
            {/* ======================================================== */}
            {isGeneratorOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
                    <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center border-b pb-3 mb-4">
                            <div>
                                <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
                                    <i className="bi bi-magic text-teal-600"></i>
                                    Generator Jadwal Ujian Otomatis
                                </h3>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    Penyusunan jadwal otomatis berbasis ketersediaan pengajar & anti-bentrok.
                                </p>
                            </div>
                            <button
                                onClick={() => setIsGeneratorOpen(false)}
                                className="text-gray-400 hover:text-gray-600 text-lg"
                            >
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>

                        <div className="space-y-4 text-xs">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">Tanggal Mulai Pelaksanaan</label>
                                    <input
                                        type="date"
                                        value={genTanggalMulai}
                                        onChange={e => setGenTanggalMulai(e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg p-2 font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">Durasi Hari Pelaksanaan</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            min={1}
                                            max={14}
                                            value={genJumlahHari}
                                            onChange={e => setGenJumlahHari(Number(e.target.value))}
                                            className="w-full border border-gray-300 rounded-lg p-2 font-bold"
                                        />
                                        <span className="text-gray-500 font-bold">Hari</span>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block font-bold text-gray-700 mb-1">Jumlah Sesi Ujian Per Hari</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {[1, 2, 3].map(cnt => (
                                        <button
                                            key={cnt}
                                            type="button"
                                            onClick={() => setGenSesiCount(cnt)}
                                            className={`py-2 px-3 rounded-lg font-bold border transition-all ${
                                                genSesiCount === cnt
                                                    ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                                                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                                            }`}
                                        >
                                            {cnt} Sesi / Hari
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Sesi Time Config */}
                            <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 space-y-2">
                                <span className="font-bold text-gray-700 block">Atur Jam Sesi:</span>
                                {genSesiTimes.slice(0, genSesiCount).map((s, idx) => (
                                    <div key={s.sesiKe} className="flex items-center gap-2">
                                        <span className="w-16 font-bold text-teal-800">Sesi {s.sesiKe}:</span>
                                        <input
                                            type="time"
                                            value={s.jamMulai}
                                            onChange={e => {
                                                const updated = [...genSesiTimes];
                                                updated[idx].jamMulai = e.target.value;
                                                setGenSesiTimes(updated);
                                            }}
                                            className="border rounded p-1 text-center font-mono font-bold bg-white"
                                        />
                                        <span>s/d</span>
                                        <input
                                            type="time"
                                            value={s.jamSelesai}
                                            onChange={e => {
                                                const updated = [...genSesiTimes];
                                                updated[idx].jamSelesai = e.target.value;
                                                setGenSesiTimes(updated);
                                            }}
                                            className="border rounded p-1 text-center font-mono font-bold bg-white"
                                        />
                                    </div>
                                ))}
                            </div>

                            {/* Intelligent Rules */}
                            <div className="space-y-2.5 pt-2 border-t">
                                <label className="flex items-start gap-2.5 p-2 rounded-lg bg-teal-50/60 border border-teal-200 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={genRespectAvailability}
                                        onChange={e => setGenRespectAvailability(e.target.checked)}
                                        className="mt-0.5 rounded text-teal-600 focus:ring-teal-500"
                                    />
                                    <div>
                                        <div className="font-bold text-teal-900">Perhatikan Jam Kesanggupan Pengajar</div>
                                        <div className="text-[11px] text-teal-700">Hanya menugaskan guru yang memiliki ketersediaan hari masuk pada jadwal ujian.</div>
                                    </div>
                                </label>

                                <label className="flex items-start gap-2.5 p-2 rounded-lg bg-indigo-50/60 border border-indigo-200 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={genCrossSupervisor}
                                        onChange={e => setGenCrossSupervisor(e.target.checked)}
                                        className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <div>
                                        <div className="font-bold text-indigo-900">Terapkan Pengawas Silang (Objektivitas)</div>
                                        <div className="text-[11px] text-indigo-700">Guru pengampu mapel tidak mengawasi rombel yang sedang mengujikan mapelnya sendiri.</div>
                                    </div>
                                </label>
                            </div>

                            <div className="pt-4 border-t flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsGeneratorOpen(false)}
                                    className="px-4 py-2 border rounded-lg text-gray-600 hover:bg-gray-50 font-bold"
                                >
                                    Batal
                                </button>
                                <button
                                    type="button"
                                    onClick={handleRunGenerator}
                                    className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-black shadow-xs flex items-center gap-1.5"
                                >
                                    <i className="bi bi-play-circle-fill"></i>
                                    <span>Mulai Susun Otomatis</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ======================================================== */}
            {/* MODAL EDIT / MANUAL SLOT JADWAL UJIAN */}
            {/* ======================================================== */}
            {isEditModalOpen && editingSlot && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100">
                        <div className="flex justify-between items-center border-b pb-3 mb-4">
                            <h3 className="text-base font-black text-gray-900">
                                {editingSlot.id ? 'Edit Slot Ujian' : 'Tambah Slot Ujian'}
                            </h3>
                            <button
                                onClick={() => setIsEditModalOpen(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>

                        <div className="space-y-3 text-xs">
                            <div>
                                <label className="block font-bold text-gray-600 mb-1">Rombel / Kelas</label>
                                <select
                                    value={editingSlot.rombelId}
                                    onChange={e => setEditingSlot({ ...editingSlot, rombelId: Number(e.target.value) })}
                                    className="w-full border rounded-lg p-2 font-bold"
                                >
                                    {rombelList.map(r => (
                                        <option key={r.id} value={r.id}>{r.nama}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block font-bold text-gray-600 mb-1">Tanggal</label>
                                    <input
                                        type="date"
                                        value={editingSlot.tanggal}
                                        onChange={e => setEditingSlot({ ...editingSlot, tanggal: e.target.value })}
                                        className="w-full border rounded-lg p-2 font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold text-gray-600 mb-1">Sesi Ke</label>
                                    <input
                                        type="number"
                                        min={1}
                                        max={6}
                                        value={editingSlot.sesiKe || 1}
                                        onChange={e => setEditingSlot({ ...editingSlot, sesiKe: Number(e.target.value) })}
                                        className="w-full border rounded-lg p-2 font-bold"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block font-bold text-gray-600 mb-1">Jam Mulai</label>
                                    <input
                                        type="time"
                                        value={editingSlot.jamMulai || '07:30'}
                                        onChange={e => setEditingSlot({ ...editingSlot, jamMulai: e.target.value })}
                                        className="w-full border rounded-lg p-2 font-mono font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold text-gray-600 mb-1">Jam Selesai</label>
                                    <input
                                        type="time"
                                        value={editingSlot.jamSelesai || '09:00'}
                                        onChange={e => setEditingSlot({ ...editingSlot, jamSelesai: e.target.value })}
                                        className="w-full border rounded-lg p-2 font-mono font-bold"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block font-bold text-gray-600 mb-1">Mata Pelajaran</label>
                                <select
                                    value={editingSlot.mapelId || ''}
                                    onChange={e => setEditingSlot({ ...editingSlot, mapelId: Number(e.target.value) || undefined })}
                                    className="w-full border rounded-lg p-2 font-bold"
                                >
                                    <option value="">-- Pilih Mata Pelajaran --</option>
                                    {mapelList.map(m => (
                                        <option key={m.id} value={m.id}>{m.nama}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block font-bold text-gray-600 mb-1">Pengawas Ruang</label>
                                <select
                                    value={editingSlot.pengawasId || ''}
                                    onChange={e => setEditingSlot({ ...editingSlot, pengawasId: Number(e.target.value) || undefined })}
                                    className="w-full border rounded-lg p-2 font-bold"
                                >
                                    <option value="">-- Pilih Pengawas --</option>
                                    {settings.tenagaPengajar.map(t => (
                                        <option key={t.id} value={t.id}>{t.nama}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="pt-4 border-t flex justify-between gap-2">
                                {editingSlot.id ? (
                                    <button
                                        type="button"
                                        onClick={() => handleDeleteSlot(editingSlot.id!)}
                                        className="px-3 py-2 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg font-bold"
                                    >
                                        Hapus
                                    </button>
                                ) : <div />}

                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsEditModalOpen(false)}
                                        className="px-3.5 py-2 border rounded-lg text-gray-600 hover:bg-gray-50 font-bold"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleSaveManualSlot}
                                        className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-black shadow-xs"
                                    >
                                        Simpan
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
