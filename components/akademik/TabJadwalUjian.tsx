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

export const DEFAULT_TAHFIZH_EXAM_TOPICS = [
    'Tahfizh Al-Qur\'an (Hifzhil Qur\'an)',
    'Munaqosyah Juz 30 / Juz \'Amma',
    'Tasmi\' Bil Ghaib (Ujian Sekali Duduk)',
    'Tahsin, Tajwid & Makhorijul Huruf',
    'Fashahah & Kelancaran Hafalan',
    'Ghorib & Musykilat Al-Qur\'an',
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
    const [genRumpunFilter, setGenRumpunFilter] = useState<'auto' | 'all' | 'Tahfizh' | 'Diniyah' | 'Umum' | 'custom'>('auto');
    const [genSelectedMapelIds, setGenSelectedMapelIds] = useState<number[]>([]);
    const [genUseCustomTopics, setGenUseCustomTopics] = useState<boolean>(false);
    const [genCustomMateriList, setGenCustomMateriList] = useState<string[]>(DEFAULT_TAHFIZH_EXAM_TOPICS);
    const [newCustomTopicInput, setNewCustomTopicInput] = useState<string>('');

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

    // Exam Type Categorization Helpers
    const isMunaqosyahOrTahfizh = useMemo(() => {
        return /munaq[ao]syah|tahfi[zd]|tasmi/i.test(selectedJenisUjian);
    }, [selectedJenisUjian]);

    const isDiniyahExam = useMemo(() => {
        return /diniyah|salafiyah/i.test(selectedJenisUjian);
    }, [selectedJenisUjian]);

    // Available mapels with helpers by rumpun
    const tahfizhMapels = useMemo(() => {
        return mapelList.filter(m => m.rumpun === 'Tahfizh' || /tahfi[zd]|tahsin|tajwid|munaq[ao]syah|tasmi|qur'?an|tilawah|hif[zd]|juz|ghorib/i.test(m.nama || ''));
    }, [mapelList]);

    const diniyahMapels = useMemo(() => {
        return mapelList.filter(m => m.rumpun === 'Diniyah' || /nahwu|shorof|fiq[ih]|tauhid|aqidah|hadits?|tafsir|tarikh|akhlaq|lughah|ushul|kitab/i.test(m.nama || ''));
    }, [mapelList]);

    const umumMapels = useMemo(() => {
        return mapelList.filter(m => m.rumpun === 'Umum' || (!tahfizhMapels.includes(m) && !diniyahMapels.includes(m)));
    }, [mapelList, tahfizhMapels, diniyahMapels]);

    // Resolved exam topics / subjects based on user generator settings
    const resolvedExamSubjects = useMemo<{ label: string; mapelId?: number }[]>(() => {
        if (genUseCustomTopics && genCustomMateriList.length > 0) {
            return genCustomMateriList.map(topic => {
                const match = mapelList.find(m => m.nama.toLowerCase().trim() === topic.toLowerCase().trim());
                return { label: topic, mapelId: match?.id };
            });
        }

        if (genRumpunFilter === 'custom') {
            const chosen = mapelList.filter(m => genSelectedMapelIds.includes(m.id));
            if (chosen.length > 0) {
                return chosen.map(m => ({ label: m.nama, mapelId: m.id }));
            }
        }

        if (genRumpunFilter === 'Tahfizh' || (genRumpunFilter === 'auto' && isMunaqosyahOrTahfizh)) {
            if (tahfizhMapels.length > 0) {
                return tahfizhMapels.map(m => ({ label: m.nama, mapelId: m.id }));
            }
            // Fallback to default tahfizh exam topics if no tahfizh mapel in master
            return DEFAULT_TAHFIZH_EXAM_TOPICS.map(topic => {
                const match = mapelList.find(m => m.nama.toLowerCase().trim() === topic.toLowerCase().trim());
                return { label: topic, mapelId: match?.id };
            });
        }

        if (genRumpunFilter === 'Diniyah' || (genRumpunFilter === 'auto' && isDiniyahExam)) {
            if (diniyahMapels.length > 0) {
                return diniyahMapels.map(m => ({ label: m.nama, mapelId: m.id }));
            }
            return mapelList.map(m => ({ label: m.nama, mapelId: m.id }));
        }

        if (genRumpunFilter === 'Umum') {
            if (umumMapels.length > 0) {
                return umumMapels.map(m => ({ label: m.nama, mapelId: m.id }));
            }
            return mapelList.map(m => ({ label: m.nama, mapelId: m.id }));
        }

        // Default 'all'
        return mapelList.map(m => ({ label: m.nama, mapelId: m.id }));
    }, [genUseCustomTopics, genCustomMateriList, genRumpunFilter, genSelectedMapelIds, isMunaqosyahOrTahfizh, isDiniyahExam, tahfizhMapels, diniyahMapels, umumMapels, mapelList]);

    // Smart Open Generator Handler
    const handleOpenGenerator = () => {
        const isTahfizh = /munaq[ao]syah|tahfi[zd]|tasmi/i.test(selectedJenisUjian);
        const isDiniyah = /diniyah|salafiyah/i.test(selectedJenisUjian);

        setGenRumpunFilter('auto');
        if (isTahfizh) {
            if (tahfizhMapels.length === 0) {
                setGenUseCustomTopics(true);
                setGenCustomMateriList([...DEFAULT_TAHFIZH_EXAM_TOPICS]);
                setGenJumlahHari(3);
            } else {
                setGenUseCustomTopics(false);
                setGenSelectedMapelIds(tahfizhMapels.map(m => m.id));
                setGenJumlahHari(Math.min(4, Math.max(2, Math.ceil(tahfizhMapels.length / genSesiCount))));
            }
        } else if (isDiniyah) {
            setGenUseCustomTopics(false);
            setGenSelectedMapelIds(diniyahMapels.map(m => m.id));
            setGenJumlahHari(Math.min(6, Math.max(3, Math.ceil(Math.max(diniyahMapels.length, 4) / genSesiCount))));
        } else {
            setGenUseCustomTopics(false);
            setGenSelectedMapelIds(mapelList.map(m => m.id));
            setGenJumlahHari(Math.min(7, Math.max(4, Math.ceil(Math.max(mapelList.length, 6) / genSesiCount))));
        }
        setIsGeneratorOpen(true);
    };

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
            if (j.pengawasId) {
                const key = `${j.tanggal}_${j.sesiKe}_${j.pengawasId}`;
                if (seen.has(key)) {
                    conflictKeys.add(key);
                } else {
                    seen.set(key, j.rombelId);
                }
            }
            if (j.pengawas2Id) {
                const key2 = `${j.tanggal}_${j.sesiKe}_${j.pengawas2Id}`;
                if (seen.has(key2)) {
                    conflictKeys.add(key2);
                } else {
                    seen.set(key2, j.rombelId);
                }
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
        if (resolvedExamSubjects.length === 0) {
            showToast('Tidak ada materi atau mata pelajaran yang dipilih untuk dijadwalkan.', 'error');
            return;
        }

        showConfirmation(
            'Generate Jadwal Ujian Otomatis?',
            `Sistem akan menyusun jadwal untuk ${rombelList.length} kelas di jenjang ini dengan ${resolvedExamSubjects.length} materi/mapel terpilih selama ${genJumlahHari} hari (${genSesiCount} sesi/hari). Pengawas akan diatur berdasarkan jam kesanggupan${genCrossSupervisor ? ' dengan metode pengawas silang' : ''}. Jadwal ujian sebelumnya pada filter ini akan ditimpa. Lanjutkan?`,
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
                    // Distribute selected exam subjects sequentially across sessions
                    const sessionsToUse = genSesiTimes.slice(0, genSesiCount);

                    for (let dIdx = 0; dIdx < examDates.length; dIdx++) {
                        const dayInfo = examDates[dIdx];

                        for (const sesi of sessionsToUse) {
                            const globalSlotIndex = dIdx * genSesiCount + (sesi.sesiKe - 1);
                            const assignedSupervisorsThisSession = new Set<number>();

                            for (const rombel of rombelList) {
                                // Pick an exam subject (wrap around if count < total slots)
                                const subjectObj = resolvedExamSubjects[globalSlotIndex % resolvedExamSubjects.length];
                                const mapelId = subjectObj.mapelId;
                                const keterangan = subjectObj.label;

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
                                    keterangan: keterangan,
                                    pengawasId: chosenSupervisor?.id,
                                    ruangan: rombel.nama,
                                    lastModified: Date.now(),
                                });
                            }
                        }
                    }

                    await db.jadwalUjian.bulkAdd(newItems);
                    setIsGeneratorOpen(false);
                    showToast(`Berhasil men-generate ${newItems.length} slot jadwal ujian (${resolvedExamSubjects.length} materi) dengan pengawas tertata!`, 'success');
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
    // CETAK JADWAL PER ROMBEL / KELAS
    // ==========================================
    const handlePrintPerRombel = (targetRombelId?: number) => {
        const rombelIdToPrint = targetRombelId !== undefined ? targetRombelId : selectedRombelId;
        const targetRombels = rombelIdToPrint === 0
            ? rombelList
            : rombelList.filter(r => r.id === rombelIdToPrint);

        if (targetRombels.length === 0) {
            showToast('Tidak ada rombel yang dipilih untuk dicetak.', 'error');
            return;
        }

        const relevantSlots = filteredJadwal.filter(j => 
            rombelIdToPrint === 0 ? true : j.rombelId === rombelIdToPrint
        );

        if (relevantSlots.length === 0) {
            showToast('Belum ada data jadwal pada rombel yang dipilih.', 'error');
            return;
        }

        const popup = window.open('', '_blank', 'width=1100,height=800');
        if (!popup) {
            showToast('Izinkan pop-up untuk mencetak jadwal rombel.', 'error');
            return;
        }

        const jenjangName = settings.jenjang.find(j => j.id === selectedJenjangId)?.nama || '';

        let contentHtml = '';
        targetRombels.forEach((rombel, rIdx) => {
            const slots = filteredJadwal.filter(j => j.rombelId === rombel.id);
            if (slots.length === 0) return;

            slots.sort((a, b) => {
                if (a.tanggal !== b.tanggal) return a.tanggal.localeCompare(b.tanggal);
                return a.sesiKe - b.sesiKe;
            });

            let tableRowsHtml = '';
            slots.forEach((slot, idx) => {
                const dateObj = new Date(slot.tanggal);
                const dayName = HARI_NAMES[dateObj.getDay()] || '';
                const mapel = slot.mapelId ? mapelMap.get(slot.mapelId) : undefined;
                const p1 = slot.pengawasId ? guruMap.get(slot.pengawasId) : undefined;
                const p2 = slot.pengawas2Id ? guruMap.get(slot.pengawas2Id) : undefined;

                tableRowsHtml += `
                    <tr>
                        <td style="border:1px solid #cbd5e1; padding:7px; text-align:center; font-size:11px;">${idx + 1}</td>
                        <td style="border:1px solid #cbd5e1; padding:7px; font-weight:bold; font-size:11px;">${dayName}, ${slot.tanggal}</td>
                        <td style="border:1px solid #cbd5e1; padding:7px; text-align:center; font-size:11px;">Sesi ${slot.sesiKe}<br><span style="font-size:9.5px; color:#64748b;">${slot.jamMulai} - ${slot.jamSelesai}</span></td>
                        <td style="border:1px solid #cbd5e1; padding:7px; font-weight:bold; font-size:11.5px; color:#0f172a;">${mapel?.nama || 'Tanpa Mapel'}</td>
                        <td style="border:1px solid #cbd5e1; padding:7px; font-size:11px; color:#0f766e; font-weight:600;">${p1?.nama || '-'}</td>
                        <td style="border:1px solid #cbd5e1; padding:7px; font-size:11px; color:#4338ca;">${p2?.nama || '-'}</td>
                        <td style="border:1px solid #cbd5e1; padding:7px; text-align:center; font-size:11px;">${slot.ruangan || rombel.nama}</td>
                    </tr>
                `;
            });

            const isLast = rIdx === targetRombels.length - 1;

            contentHtml += `
                <div style="${!isLast ? 'page-break-after: always; margin-bottom: 30px;' : ''}">
                    <div class="kop">
                        <h1>${settings.namaPonpes || 'PONDOK PESANTREN'}</h1>
                        <p>${settings.alamat || ''} | Telp: ${settings.telepon || '-'}</p>
                    </div>

                    <div class="title-box">
                        <div>
                            <h2>JADWAL ${selectedJenisUjian.toUpperCase()} - KELAS ${rombel.nama.toUpperCase()}</h2>
                            <div style="font-size:10.5px; color:#475569; margin-top:2px;">
                                Jenjang: <strong>${jenjangName}</strong> | Tahun Ajaran: <strong>${selectedTahunAjaran} (${selectedSemester})</strong>
                            </div>
                        </div>
                        <span style="font-size:10px; font-weight:600; color:#0f766e;">
                            Total: ${slots.length} Mata Ujian
                        </span>
                    </div>

                    <table style="width:100%; border-collapse:collapse; margin-bottom:20px;">
                        <thead>
                            <tr>
                                <th style="width:35px;">No</th>
                                <th style="width:130px;">Hari & Tanggal</th>
                                <th style="width:100px;">Sesi & Pukul</th>
                                <th>Mata Pelajaran / Materi Ujian</th>
                                <th style="width:150px;">Pengawas Utama</th>
                                <th style="width:150px;">Pengawas Pendamping</th>
                                <th style="width:80px;">Ruang</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${tableRowsHtml}
                        </tbody>
                    </table>

                    <div class="footer-sign">
                        <div class="sign-box">
                            Mengetahui,<br>
                            <strong>Wali Kelas / Asatidz Pembimbing</strong>
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
                </div>
            `;
        });

        popup.document.write(`
            <!DOCTYPE html>
            <html>
                <head>
                    <title>Jadwal Ujian Per Rombel - ${jenjangName}</title>
                    <style>
                        @page { size: A4 portrait; margin: 12mm; }
                        body { font-family: Arial, sans-serif; color: #0f172a; margin: 0; padding: 10px; }
                        .kop { text-align: center; border-bottom: 2px solid #0f766e; padding-bottom: 8px; margin-bottom: 12px; }
                        .kop h1 { margin: 0; font-size: 16px; font-weight: bold; color: #0f766e; text-transform: uppercase; }
                        .kop p { margin: 2px 0 0; font-size: 10px; color: #475569; }
                        .title-box { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 12px; border-bottom: 1px dashed #cbd5e1; padding-bottom: 6px; }
                        .title-box h2 { margin: 0; font-size: 13px; font-weight: bold; text-transform: uppercase; color: #0f766e; }
                        table { width: 100%; border-collapse: collapse; page-break-inside: auto; }
                        tr { page-break-inside: avoid; }
                        th { background: #0f766e; color: white; border: 1px solid #0f766e; padding: 7px; font-size: 11px; text-transform: uppercase; }
                        .footer-sign { margin-top: 30px; display: flex; justify-content: space-between; page-break-inside: avoid; }
                        .sign-box { width: 220px; text-align: center; font-size: 10.5px; }
                        .sign-space { height: 55px; }
                    </style>
                </head>
                <body>
                    ${contentHtml}
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
                    keterangan: editingSlot.keterangan,
                    pengawasId: editingSlot.pengawasId,
                    pengawas2Id: editingSlot.pengawas2Id,
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

    const handleOpenAddSlot = () => {
        if (!canWrite) return;
        const defaultDate = distinctDates[0] || new Date().toISOString().split('T')[0];
        const defaultRombel = rombelList[0]?.id || 0;
        setEditingSlot({
            jenjangId: selectedJenjangId,
            rombelId: defaultRombel,
            tanggal: defaultDate,
            sesiKe: 1,
            jamMulai: '07:30',
            jamSelesai: '09:00',
            jenisUjian: selectedJenisUjian,
        });
        setIsEditModalOpen(true);
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

                    {/* Toolbar 6 Actions: Clean 2-column Grid on Mobile (3 rows x 2), 3-col on Tablet, Flex on Desktop */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:flex lg:flex-wrap lg:items-center lg:justify-end gap-2 w-full lg:w-auto">
                        {canWrite && (
                            <>
                                <button
                                    type="button"
                                    onClick={handleOpenGenerator}
                                    className="w-full lg:w-auto h-10 px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-black flex items-center justify-center gap-1.5 shadow-xs transition-all active:scale-95 shrink-0 whitespace-nowrap"
                                    title="Buka Auto Generator Jadwal & Pengawas Ujian"
                                >
                                    <i className="bi bi-magic text-sm"></i>
                                    <span className="truncate">Auto Generator</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={handleOpenAddSlot}
                                    className="w-full lg:w-auto h-10 px-3 py-2 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shrink-0 whitespace-nowrap"
                                    title="Tambah Slot Jadwal Manual"
                                >
                                    <i className="bi bi-plus-lg text-sm"></i>
                                    <span className="truncate">Tambah Slot</span>
                                </button>
                            </>
                        )}

                        <button
                            type="button"
                            onClick={handlePrintGlobalTU}
                            disabled={filteredJadwal.length === 0}
                            className="w-full lg:w-auto h-10 px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-xs transition-colors shrink-0 whitespace-nowrap"
                            title="Cetak Rekap Master Pegangan TU"
                        >
                            <i className="bi bi-printer text-sm"></i>
                            <span className="truncate">Cetak Rekap TU</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => handlePrintPerRombel()}
                            disabled={filteredJadwal.length === 0}
                            className="w-full lg:w-auto h-10 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-xs transition-colors shrink-0 whitespace-nowrap"
                            title="Cetak Jadwal Ujian Per Rombel / Kelas"
                        >
                            <i className="bi bi-mortarboard text-sm"></i>
                            <span className="truncate">Cetak Rombel</span>
                        </button>

                        <button
                            type="button"
                            onClick={handleExportExcelGlobalTU}
                            disabled={filteredJadwal.length === 0}
                            className="w-full lg:w-auto h-10 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-xs transition-colors shrink-0 whitespace-nowrap"
                            title="Export Jadwal Ujian ke Excel"
                        >
                            <i className="bi bi-file-earmark-excel text-sm"></i>
                            <span className="truncate">Export Excel</span>
                        </button>

                        {canWrite && (
                            <button
                                type="button"
                                onClick={handleClearAllExamSchedules}
                                disabled={filteredJadwal.length === 0}
                                className="w-full lg:w-auto h-10 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-bold disabled:opacity-40 transition-colors flex items-center justify-center gap-1.5 shrink-0 whitespace-nowrap"
                                title="Kosongkan seluruh jadwal ujian aktif"
                            >
                                <i className="bi bi-trash text-sm"></i>
                                <span className="truncate">Kosongkan</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Filter Controls (Clean 3 columns without cramped format switch) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
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
                        <div className="grid grid-cols-2 gap-2">
                            <select
                                value={selectedSemester}
                                onChange={e => setSelectedSemester(e.target.value as any)}
                                className="w-full border border-gray-300 rounded-lg p-2 text-xs font-bold bg-gray-50"
                            >
                                <option value="Ganjil">Ganjil</option>
                                <option value="Genap">Genap</option>
                            </select>
                            <input
                                type="text"
                                value={selectedTahunAjaran}
                                onChange={e => setSelectedTahunAjaran(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg p-2 text-xs font-bold bg-gray-50 text-center"
                                placeholder="2026/2027"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Metrics & Conflict Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-white border border-gray-200 rounded-xl shadow-2xs">
                    <div className="text-[10px] font-bold text-gray-500 uppercase truncate">Total Rombel</div>
                    <div className="text-xl font-black text-gray-900 mt-0.5">{rombelList.length} <span className="text-xs font-normal text-gray-500">Kelas</span></div>
                </div>
                <div className="p-3 bg-white border border-gray-200 rounded-xl shadow-2xs">
                    <div className="text-[10px] font-bold text-gray-500 uppercase truncate">Hari Pelaksanaan</div>
                    <div className="text-xl font-black text-teal-700 mt-0.5">{distinctDates.length} <span className="text-xs font-normal text-gray-500">Hari</span></div>
                </div>
                <div className="p-3 bg-white border border-gray-200 rounded-xl shadow-2xs">
                    <div className="text-[10px] font-bold text-gray-500 uppercase truncate">Slot Terjadwal</div>
                    <div className="text-xl font-black text-indigo-700 mt-0.5">{filteredJadwal.length} <span className="text-xs font-normal text-gray-500">Ujian</span></div>
                </div>
                <div className={`p-3 border rounded-xl shadow-2xs ${supervisorConflicts.size > 0 ? 'bg-red-50 border-red-200 text-red-900' : 'bg-emerald-50 border-emerald-200 text-emerald-900'}`}>
                    <div className="text-[10px] font-bold uppercase truncate">{supervisorConflicts.size > 0 ? 'Bentrok Pengawas' : 'Integritas Jadwal'}</div>
                    <div className="text-xl font-black mt-0.5 flex items-center gap-1.5">
                        {supervisorConflicts.size > 0 ? (
                            <>
                                <span>{supervisorConflicts.size}</span>
                                <span className="text-xs font-bold text-red-600 whitespace-nowrap">Perlu Koreksi</span>
                            </>
                        ) : (
                            <>
                                <i className="bi bi-check-circle-fill text-emerald-600 text-lg"></i>
                                <span className="text-xs font-bold text-emerald-700 whitespace-nowrap">100% Aman</span>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Primary Tab Navigation: Rekap Global TU vs Per Rombel */}
            <div className="bg-white p-2.5 rounded-xl border border-gray-200 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="w-full sm:w-fit grid grid-cols-2 sm:flex items-center gap-1 bg-slate-100/90 p-1 rounded-lg border border-slate-200/80">
                    <button
                        type="button"
                        onClick={() => setViewMode('global_tu')}
                        className={`flex items-center justify-center gap-1.5 px-3 py-2 sm:px-4 rounded-md text-xs font-black transition-all text-center ${
                            viewMode === 'global_tu'
                                ? 'bg-teal-700 text-white shadow-2xs'
                                : 'text-gray-700 hover:text-gray-900 hover:bg-white/60'
                        }`}
                    >
                        <i className="bi bi-table text-xs shrink-0"></i>
                        <span className="hidden sm:inline">Rekap Global TU</span>
                        <span className="sm:hidden">Global TU</span>
                        <span className={`hidden md:inline text-[10px] px-1.5 py-0.2 rounded-full font-bold ${viewMode === 'global_tu' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'}`}>
                            {distinctDates.length} Hari
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setViewMode('per_rombel')}
                        className={`flex items-center justify-center gap-1.5 px-3 py-2 sm:px-4 rounded-md text-xs font-black transition-all text-center ${
                            viewMode === 'per_rombel'
                                ? 'bg-teal-700 text-white shadow-2xs'
                                : 'text-gray-700 hover:text-gray-900 hover:bg-white/60'
                        }`}
                    >
                        <i className="bi bi-mortarboard-fill text-xs shrink-0"></i>
                        <span className="hidden sm:inline">Jadwal Per Rombel</span>
                        <span className="sm:hidden">Per Rombel</span>
                        <span className={`hidden md:inline text-[10px] px-1.5 py-0.2 rounded-full font-bold ${viewMode === 'per_rombel' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'}`}>
                            {rombelList.length} Rombel
                        </span>
                    </button>
                </div>

                {viewMode === 'per_rombel' ? (
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        <button
                            type="button"
                            onClick={() => handlePrintPerRombel(selectedRombelId)}
                            className="w-full sm:w-auto px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                        >
                            <i className="bi bi-printer"></i>
                            <span>Cetak Jadwal {selectedRombelId === 0 ? 'Semua Kelas' : 'Kelas Ini'}</span>
                        </button>
                    </div>
                ) : (
                    <div className="text-xs text-gray-500 font-medium px-2 hidden lg:block">
                        Mode Master Pegangan Tata Usaha (Seluruh Rombel & Pengawas)
                    </div>
                )}
            </div>

            {/* MAIN CONTENT AREA */}
            {filteredJadwal.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
                    <i className="bi bi-calendar-x text-4xl text-gray-300 mb-2 block"></i>
                    <h4 className="text-base font-bold text-gray-700">Belum Ada Jadwal Ujian Tersusun</h4>
                    <p className="text-xs text-gray-500 max-w-md mx-auto mt-1 mb-4">
                        Gunakan fitur <strong>Auto Generator Ujian</strong> untuk menyusun distribusi mata pelajaran dan pengawas otomatis berdasarkan jam kesanggupan pengajar, atau tambah slot manual.
                    </p>
                    {canWrite && (
                        <div className="flex flex-wrap items-center justify-center gap-2">
                            <button
                                onClick={handleOpenGenerator}
                                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 shadow-xs"
                            >
                                <i className="bi bi-magic"></i>
                                <span>Buka Generator Jadwal Ujian</span>
                            </button>
                            <button
                                onClick={handleOpenAddSlot}
                                className="px-3.5 py-2 bg-white hover:bg-gray-50 text-teal-800 border border-teal-300 rounded-lg text-xs font-bold inline-flex items-center gap-1.5"
                            >
                                <i className="bi bi-plus-lg"></i>
                                <span>Tambah Slot Manual</span>
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                <>
                    {/* VIEW MODE 1: REKAP GLOBAL TU (PISAH TABEL ATAU GABUNG SELURUH KELAS) */}
                    {viewMode === 'global_tu' && (
                        <div className="space-y-4">
                            {/* Opsi Format & Pembagian Tabel Rombel */}
                            <div className="bg-white rounded-xl border border-teal-200 p-3.5 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-bold shrink-0">
                                        <i className="bi bi-layout-split text-base"></i>
                                    </div>
                                    <div>
                                        <div className="text-xs font-black text-gray-900 flex flex-wrap items-center gap-2">
                                            <span>Format Pembagian Kolom Rombel:</span>
                                            {splitMode !== 'all' && (
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 shrink-0">
                                                    {rombelGroups.length} Kelompok Tabel
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-[10.5px] text-gray-500">
                                            Bagi kolom tabel agar tidak berdesakan dan proporsional dicetak/dilihat
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 w-full sm:w-auto justify-start sm:justify-end">
                                    <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg p-1 w-full sm:w-auto">
                                        <span className="text-[10px] font-bold text-gray-500 pl-1 shrink-0">Bagi Kolom:</span>
                                        <select
                                            value={splitMode}
                                            onChange={(e) => {
                                                setSplitMode(e.target.value as RombelSplitMode);
                                                setActiveGroupFilter('all');
                                            }}
                                            className="text-xs font-bold bg-white border border-gray-300 rounded px-2.5 py-1 text-gray-800 focus:ring-1 focus:ring-teal-500 w-full sm:w-auto"
                                        >
                                            <option value="all">Satu Tabel Gabungan (Semua Rombel)</option>
                                            <option value="gender">Pisah Tabel Putra & Putri (Disarankan)</option>
                                            <option value="kelas">Pisah Per Tingkat Kelas</option>
                                            <option value="chunk4">Bagi Maks. 4 Rombel / Tabel</option>
                                            <option value="chunk3">Bagi Maks. 3 Rombel / Tabel (Renggang)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Tab Tabel Rombel Navigation (Dedicated horizontal scrollable tab rail) */}
                            {splitMode !== 'all' && rombelGroups.length > 1 && (
                                <div className="w-full max-w-full overflow-hidden bg-slate-100/90 p-1.5 rounded-xl border border-slate-200/80 shadow-2xs">
                                    <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none max-w-full py-0.5 px-0.5">
                                        <button
                                            type="button"
                                            onClick={() => setActiveGroupFilter('all')}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all shrink-0 whitespace-nowrap ${
                                                activeGroupFilter === 'all'
                                                    ? 'bg-teal-700 text-white shadow-2xs'
                                                    : 'text-gray-700 hover:text-gray-900 hover:bg-white/60'
                                            }`}
                                        >
                                            <i className="bi bi-grid-fill text-xs"></i>
                                            <span>Tampilkan Semua</span>
                                            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${activeGroupFilter === 'all' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'}`}>
                                                {rombelGroups.length} Tabel
                                            </span>
                                        </button>
                                        <div className="h-4 w-px bg-gray-300 shrink-0 mx-0.5"></div>
                                        {rombelGroups.map(g => {
                                            const isActive = activeGroupFilter === g.id;
                                            return (
                                                <button
                                                    key={g.id}
                                                    type="button"
                                                    onClick={() => setActiveGroupFilter(g.id)}
                                                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all shrink-0 whitespace-nowrap ${
                                                        isActive
                                                            ? 'bg-teal-700 text-white shadow-2xs'
                                                            : 'text-gray-700 hover:text-gray-900 hover:bg-white/60'
                                                    }`}
                                                >
                                                    {g.icon && <i className={`bi ${g.icon} text-xs`}></i>}
                                                    <span>{g.title}</span>
                                                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${isActive ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'}`}>
                                                        {g.rombels.length} Kelas
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Multi Table Rendering */}
                            {visibleRombelGroups.map((group, groupIndex) => {
                                const groupRombels = group.rombels;
                                if (groupRombels.length === 0) return null;

                                return (
                                    <div key={group.id} className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
                                        <div className="p-3.5 bg-gray-50 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                            <div className="flex items-center gap-2">
                                                {group.icon && (
                                                    <div className="w-6 h-6 rounded bg-teal-100 text-teal-800 flex items-center justify-center text-xs shrink-0">
                                                        <i className={`bi ${group.icon}`}></i>
                                                    </div>
                                                )}
                                                <div>
                                                    <div className="text-xs font-black text-gray-900 uppercase tracking-wide">
                                                        {group.title}
                                                    </div>
                                                    <div className="text-[11px] text-gray-500">
                                                        Klik sel jadwal untuk mengedit mata pelajaran atau menugaskan pengawas
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <span className="text-[11px] font-bold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200 shrink-0 whitespace-nowrap">
                                                    {groupRombels.length} Rombel
                                                </span>
                                                <span className="text-[10px] text-gray-500 font-bold hidden md:inline truncate max-w-xs">
                                                    ({groupRombels.map(r => r.nama).join(', ')})
                                                </span>
                                                {visibleRombelGroups.length > 1 && (
                                                    <span className="text-[10px] text-gray-400 font-bold shrink-0 whitespace-nowrap">
                                                        Tabel {groupIndex + 1}/{visibleRombelGroups.length}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="overflow-x-auto w-full">
                                            <table className="w-full text-left border-collapse min-w-[720px]">
                                                <thead>
                                                    <tr className="bg-teal-700 text-white text-[11px] font-bold uppercase tracking-wider sticky top-0 z-10 shadow-xs">
                                                        <th className="p-2.5 border border-teal-800 text-center w-36 min-w-[130px] whitespace-nowrap">Hari & Tanggal</th>
                                                        <th className="p-2.5 border border-teal-800 text-center w-32 min-w-[120px] whitespace-nowrap">Sesi & Waktu</th>
                                                        {groupRombels.map(r => (
                                                            <th key={r.id} className="p-2.5 border border-teal-800 text-center min-w-[160px] whitespace-nowrap">
                                                                <div className="font-bold">{r.nama}</div>
                                                                {kelasMap.get(r.kelasId)?.nama && (
                                                                    <div className="text-[9.5px] text-teal-100 font-normal">{kelasMap.get(r.kelasId)?.nama}</div>
                                                                )}
                                                            </th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-200 text-xs">
                                                    {distinctDates.map(dateStr => {
                                                        const dateObj = new Date(dateStr);
                                                        const dayName = HARI_NAMES[dateObj.getDay()] || '';
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
                                                                        const pengawas2 = item?.pengawas2Id ? guruMap.get(item.pengawas2Id) : undefined;
                                                                        const isConflict = (item?.pengawasId && supervisorConflicts.has(`${item.tanggal}_${item.sesiKe}_${item.pengawasId}`)) ||
                                                                                           (item?.pengawas2Id && supervisorConflicts.has(`${item.tanggal}_${item.sesiKe}_${item.pengawas2Id}`));

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
                                                                                    <div className="space-y-1 group">
                                                                                        <div className="flex items-start justify-between gap-1">
                                                                                            <div className="font-black text-gray-900 text-xs leading-tight">
                                                                                                {mapel?.nama || item.keterangan || <span className="text-gray-400 italic font-normal">Tanpa Mapel</span>}
                                                                                            </div>
                                                                                            {canWrite && (
                                                                                                <i className="bi bi-pencil text-[10px] text-gray-300 group-hover:text-teal-600 transition-colors shrink-0"></i>
                                                                                            )}
                                                                                        </div>
                                                                                        {item.keterangan && mapel?.nama && item.keterangan !== mapel.nama && (
                                                                                            <div className="text-[10px] font-semibold text-teal-800 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200/60 leading-tight">
                                                                                                {item.keterangan}
                                                                                            </div>
                                                                                        )}
                                                                                        <div className="space-y-0.5 pt-0.5 text-[10.5px]">
                                                                                            <div className="flex items-center gap-1 text-slate-700 font-medium">
                                                                                                <i className="bi bi-person-check-fill text-teal-600 text-[11px] shrink-0"></i>
                                                                                                <span className="truncate" title={`Pengawas 1: ${pengawas?.nama || 'Belum Ditugaskan'}`}>
                                                                                                    {pengawas?.nama || <span className="text-gray-400 italic">P1: -</span>}
                                                                                                </span>
                                                                                            </div>
                                                                                            {item.pengawas2Id && (
                                                                                                <div className="flex items-center gap-1 text-slate-600 font-medium text-[10px]">
                                                                                                    <i className="bi bi-person-plus-fill text-indigo-500 text-[11px] shrink-0"></i>
                                                                                                    <span className="truncate" title={`Pengawas 2: ${pengawas2?.nama || '-'}`}>
                                                                                                        {pengawas2?.nama || 'P2: -'}
                                                                                                    </span>
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                        {isConflict && (
                                                                                            <div className="text-[9.5px] font-bold text-red-700 bg-red-100 border border-red-200 px-1.5 py-0.5 rounded flex items-center gap-1 mt-1">
                                                                                                <i className="bi bi-exclamation-triangle-fill text-red-600 shrink-0"></i>
                                                                                                <span className="truncate">Bentrok Pengawas</span>
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                ) : (
                                                                                    <div className="text-center py-2.5 text-gray-300 group-hover:text-teal-600 flex flex-col items-center justify-center gap-0.5 transition-colors">
                                                                                        <i className="bi bi-plus-circle text-sm"></i>
                                                                                        <span className="text-[9px] font-bold text-gray-400 group-hover:text-teal-600 opacity-0 group-hover:opacity-100 transition-opacity">Tambah Slot</span>
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

                    {/* VIEW MODE 2: PER ROMBEL (DESKTOP TIMETABLE & MOBILE CARDS) */}
                    {viewMode === 'per_rombel' && (
                        <div className="space-y-4">
                            {/* Interactive Rombel Tab Rail */}
                            <div className="w-full max-w-full overflow-hidden bg-slate-100/90 p-1.5 rounded-xl border border-slate-200/80 shadow-2xs">
                                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none max-w-full py-0.5 px-0.5">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedRombelId(0)}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all shrink-0 whitespace-nowrap ${
                                            selectedRombelId === 0
                                                ? 'bg-teal-700 text-white shadow-2xs'
                                                : 'text-gray-700 hover:text-gray-900 hover:bg-white/60'
                                        }`}
                                    >
                                        <i className="bi bi-grid-fill text-xs"></i>
                                        <span>Semua Rombel</span>
                                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${selectedRombelId === 0 ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'}`}>
                                            {rombelList.length}
                                        </span>
                                    </button>
                                    <div className="h-4 w-px bg-gray-300 shrink-0 mx-0.5"></div>
                                    {rombelList.map(r => {
                                        const count = filteredJadwal.filter(j => j.rombelId === r.id).length;
                                        const isSelected = selectedRombelId === r.id;
                                        return (
                                            <button
                                                key={r.id}
                                                type="button"
                                                onClick={() => setSelectedRombelId(r.id)}
                                                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all shrink-0 whitespace-nowrap ${
                                                    isSelected
                                                        ? 'bg-teal-700 text-white shadow-2xs'
                                                        : 'text-gray-700 hover:text-gray-900 hover:bg-white/60'
                                                }`}
                                            >
                                                <i className="bi bi-mortarboard text-xs"></i>
                                                <span>{r.nama}</span>
                                                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${isSelected ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'}`}>
                                                    {count}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* View Content: Detailed Table if single rombel, Grid Cards if all */}
                            {selectedRombelId !== 0 ? (
                                (() => {
                                    const currentRombel = rombelList.find(r => r.id === selectedRombelId);
                                    const currentSlots = filteredJadwal
                                        .filter(j => j.rombelId === selectedRombelId)
                                        .sort((a, b) => {
                                            if (a.tanggal !== b.tanggal) return a.tanggal.localeCompare(b.tanggal);
                                            return a.sesiKe - b.sesiKe;
                                        });

                                    return (
                                        <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
                                            <div className="p-4 bg-slate-50 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                                <div>
                                                    <div className="text-sm font-black text-gray-900 flex items-center gap-2">
                                                        <i className="bi bi-mortarboard-fill text-teal-600 text-base"></i>
                                                        <span>Jadwal Ujian Kelas: {currentRombel?.nama}</span>
                                                        {currentRombel && kelasMap.get(currentRombel.kelasId)?.nama && (
                                                            <span className="text-xs px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 font-bold">
                                                                {kelasMap.get(currentRombel.kelasId)?.nama}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-xs text-gray-500 mt-0.5">
                                                        Total {currentSlots.length} sesi ujian terjadwal untuk rombel ini
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                                    <button
                                                        type="button"
                                                        onClick={() => handlePrintPerRombel(selectedRombelId)}
                                                        className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
                                                    >
                                                        <i className="bi bi-printer"></i>
                                                        <span>Cetak Jadwal Kelas Ini</span>
                                                    </button>
                                                    {canWrite && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const defaultDate = distinctDates[0] || new Date().toISOString().split('T')[0];
                                                                setEditingSlot({
                                                                    jenjangId: selectedJenjangId,
                                                                    rombelId: selectedRombelId,
                                                                    tanggal: defaultDate,
                                                                    sesiKe: 1,
                                                                    jamMulai: '07:30',
                                                                    jamSelesai: '09:00',
                                                                    jenisUjian: selectedJenisUjian,
                                                                });
                                                                setIsEditModalOpen(true);
                                                            }}
                                                            className="px-3 py-2 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                                                        >
                                                            <i className="bi bi-plus-lg"></i>
                                                            <span>Tambah Slot Kelas</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {currentSlots.length === 0 ? (
                                                <div className="p-12 text-center text-gray-400">
                                                    <i className="bi bi-calendar2-x text-3xl mb-2 block"></i>
                                                    <p className="text-sm font-bold text-gray-600">Belum ada jadwal untuk kelas {currentRombel?.nama}</p>
                                                    <p className="text-xs text-gray-400 mt-1">Gunakan tombol Auto Generator atau klik Tambah Slot Kelas di atas.</p>
                                                </div>
                                            ) : (
                                                <div className="overflow-x-auto w-full">
                                                    <table className="w-full text-left border-collapse min-w-[760px]">
                                                        <thead>
                                                            <tr className="bg-teal-700 text-white text-[11px] font-bold uppercase tracking-wider">
                                                                <th className="p-3 border border-teal-800 text-center w-12">No</th>
                                                                <th className="p-3 border border-teal-800 w-44">Hari & Tanggal</th>
                                                                <th className="p-3 border border-teal-800 text-center w-36">Sesi & Pukul</th>
                                                                <th className="p-3 border border-teal-800">Mata Pelajaran / Materi Ujian</th>
                                                                <th className="p-3 border border-teal-800 w-44">Pengawas Utama</th>
                                                                <th className="p-3 border border-teal-800 w-44">Pengawas Pendamping</th>
                                                                <th className="p-3 border border-teal-800 text-center w-28">Ruangan</th>
                                                                {canWrite && <th className="p-3 border border-teal-800 text-center w-24">Aksi</th>}
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-200 text-xs">
                                                            {currentSlots.map((slot, idx) => {
                                                                const mapel = slot.mapelId ? mapelMap.get(slot.mapelId) : undefined;
                                                                const p1 = slot.pengawasId ? guruMap.get(slot.pengawasId) : undefined;
                                                                const p2 = slot.pengawas2Id ? guruMap.get(slot.pengawas2Id) : undefined;
                                                                const dateObj = new Date(slot.tanggal);
                                                                const dayName = HARI_NAMES[dateObj.getDay()] || '';
                                                                const isConflict = (slot.pengawasId && supervisorConflicts.has(`${slot.tanggal}_${slot.sesiKe}_${slot.pengawasId}`)) ||
                                                                                   (slot.pengawas2Id && supervisorConflicts.has(`${slot.tanggal}_${slot.sesiKe}_${slot.pengawas2Id}`));

                                                                return (
                                                                    <tr
                                                                        key={slot.id}
                                                                        className={`hover:bg-teal-50/50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}
                                                                    >
                                                                        <td className="p-3 border border-gray-200 text-center font-bold text-gray-500">
                                                                            {idx + 1}
                                                                        </td>
                                                                        <td className="p-3 border border-gray-200 font-bold text-gray-900">
                                                                            <span className="text-teal-800">{dayName}</span>, {slot.tanggal}
                                                                        </td>
                                                                        <td className="p-3 border border-gray-200 text-center">
                                                                            <span className="font-bold text-gray-800">Sesi {slot.sesiKe}</span>
                                                                            <div className="text-[10.5px] text-gray-500 font-mono">
                                                                                {slot.jamMulai} - {slot.jamSelesai}
                                                                            </div>
                                                                        </td>
                                                                        <td className="p-3 border border-gray-200 font-black text-gray-900">
                                                                            {mapel?.nama || <span className="text-gray-400 italic">Tanpa Mapel</span>}
                                                                            {slot.keterangan && (
                                                                                <div className="text-[10px] text-gray-500 font-normal mt-0.5">
                                                                                    {slot.keterangan}
                                                                                </div>
                                                                            )}
                                                                        </td>
                                                                        <td className="p-3 border border-gray-200">
                                                                            {p1 ? (
                                                                                <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded border ${
                                                                                    isConflict ? 'bg-red-50 text-red-800 border-red-200' : 'bg-teal-50 text-teal-800 border-teal-200'
                                                                                }`}>
                                                                                    <i className="bi bi-person-fill"></i>
                                                                                    {p1.nama}
                                                                                </span>
                                                                            ) : (
                                                                                <span className="text-amber-600 font-medium italic text-[11px]">-</span>
                                                                            )}
                                                                        </td>
                                                                        <td className="p-3 border border-gray-200">
                                                                            {p2 ? (
                                                                                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded border bg-indigo-50 text-indigo-800 border-indigo-200">
                                                                                    <i className="bi bi-person"></i>
                                                                                    {p2.nama}
                                                                                </span>
                                                                            ) : (
                                                                                <span className="text-gray-400 text-[11px]">-</span>
                                                                            )}
                                                                        </td>
                                                                        <td className="p-3 border border-gray-200 text-center font-mono text-xs text-gray-700">
                                                                            {slot.ruangan || currentRombel?.nama}
                                                                        </td>
                                                                        {canWrite && (
                                                                            <td className="p-3 border border-gray-200 text-center">
                                                                                <div className="flex items-center justify-center gap-1">
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => {
                                                                                            setEditingSlot(slot);
                                                                                            setIsEditModalOpen(true);
                                                                                        }}
                                                                                        className="p-1.5 text-teal-700 hover:bg-teal-50 rounded"
                                                                                        title="Edit Slot"
                                                                                    >
                                                                                        <i className="bi bi-pencil-square"></i>
                                                                                    </button>
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => handleDeleteSlot(slot.id)}
                                                                                        className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                                                                                        title="Hapus Slot"
                                                                                    >
                                                                                        <i className="bi bi-trash"></i>
                                                                                    </button>
                                                                                </div>
                                                                            </td>
                                                                        )}
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {rombelList.map(rombel => {
                                        const rombelSlots = filteredJadwal
                                            .filter(j => j.rombelId === rombel.id)
                                            .sort((a, b) => {
                                                if (a.tanggal !== b.tanggal) return a.tanggal.localeCompare(b.tanggal);
                                                return a.sesiKe - b.sesiKe;
                                            });

                                        return (
                                            <div key={rombel.id} className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden flex flex-col justify-between">
                                                <div>
                                                    <div className="p-3 bg-teal-50/70 border-b border-teal-100 flex justify-between items-center">
                                                        <div className="font-black text-xs text-teal-900 flex items-center gap-1.5">
                                                            <i className="bi bi-mortarboard-fill text-teal-600"></i>
                                                            <span>{rombel.nama}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5">
                                                            <button
                                                                type="button"
                                                                onClick={() => handlePrintPerRombel(rombel.id)}
                                                                disabled={rombelSlots.length === 0}
                                                                className="p-1 text-slate-700 hover:bg-white rounded text-xs disabled:opacity-40"
                                                                title="Cetak Jadwal Kelas Ini"
                                                            >
                                                                <i className="bi bi-printer"></i>
                                                            </button>
                                                            <span className="text-[10px] font-bold bg-teal-600 text-white px-2 py-0.5 rounded-full">
                                                                {rombelSlots.length} Mapel
                                                            </span>
                                                        </div>
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
                                                                        <div className="text-right shrink-0">
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

                                                <div className="p-2.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                                                    <span className="text-[10px] text-gray-500 font-medium">
                                                        {kelasMap.get(rombel.kelasId)?.nama || 'Kelas'}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedRombelId(rombel.id)}
                                                        className="text-xs font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1"
                                                    >
                                                        <span>Buka Tabel Kelas</span>
                                                        <i className="bi bi-chevron-right text-[10px]"></i>
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
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
                            {/* Target Ujian Banner */}
                            <div className="p-3 bg-teal-50/70 border border-teal-200 rounded-xl flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                                <div>
                                    <div className="text-[10px] font-bold text-teal-800 uppercase tracking-wide">Target Ujian Aktif:</div>
                                    <div className="text-sm font-black text-teal-950 flex flex-wrap items-center gap-2 mt-0.5">
                                        <span>{selectedJenisUjian}</span>
                                        {isMunaqosyahOrTahfizh && (
                                            <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-full font-bold">
                                                Khusus Tahfizh / Munaqosyah
                                            </span>
                                        )}
                                        {isDiniyahExam && (
                                            <span className="text-[10px] bg-amber-600 text-white px-2 py-0.5 rounded-full font-bold">
                                                Khusus Diniyah / Salafiyah
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <span className="text-xs font-bold text-teal-800 bg-white px-2.5 py-1 rounded-lg border border-teal-200 shadow-2xs">
                                        Jenjang: {settings.jenjang.find(j => j.id === selectedJenjangId)?.nama || '-'}
                                    </span>
                                </div>
                            </div>

                            {/* Pengaturan Rumpun & Materi */}
                            <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 space-y-2.5">
                                <div className="flex justify-between items-center">
                                    <label className="font-bold text-gray-800 flex items-center gap-1.5">
                                        <i className="bi bi-funnel-fill text-teal-600"></i>
                                        <span>Rumpun & Materi yang Diujikan:</span>
                                    </label>
                                    <span className="text-[11px] font-bold text-teal-700">
                                        {resolvedExamSubjects.length} Materi Terpilih
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setGenRumpunFilter('auto');
                                            setGenUseCustomTopics(false);
                                        }}
                                        className={`px-2.5 py-2 rounded-lg font-bold border text-left transition-all ${
                                            genRumpunFilter === 'auto' && !genUseCustomTopics
                                                ? 'bg-teal-700 text-white border-teal-700 shadow-2xs'
                                                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                                        }`}
                                    >
                                        <div className="text-[11px]">Otomatis (Sesuai Ujian)</div>
                                        <div className="text-[9px] opacity-80 mt-0.5">
                                            {isMunaqosyahOrTahfizh ? 'Filter Mapel Tahfizh' : isDiniyahExam ? 'Filter Mapel Diniyah' : 'Seluruh Mapel'}
                                        </div>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setGenRumpunFilter('Tahfizh');
                                            setGenUseCustomTopics(false);
                                        }}
                                        className={`px-2.5 py-2 rounded-lg font-bold border text-left transition-all ${
                                            genRumpunFilter === 'Tahfizh' && !genUseCustomTopics
                                                ? 'bg-teal-700 text-white border-teal-700 shadow-2xs'
                                                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                                        }`}
                                    >
                                        <div className="text-[11px]">Khusus Tahfizh</div>
                                        <div className="text-[9px] opacity-80 mt-0.5">Qur'an & Munaqosyah</div>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setGenRumpunFilter('Diniyah');
                                            setGenUseCustomTopics(false);
                                        }}
                                        className={`px-2.5 py-2 rounded-lg font-bold border text-left transition-all ${
                                            genRumpunFilter === 'Diniyah' && !genUseCustomTopics
                                                ? 'bg-teal-700 text-white border-teal-700 shadow-2xs'
                                                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                                        }`}
                                    >
                                        <div className="text-[11px]">Khusus Diniyah</div>
                                        <div className="text-[9px] opacity-80 mt-0.5">Kitab & Syari'ah</div>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setGenRumpunFilter('Umum');
                                            setGenUseCustomTopics(false);
                                        }}
                                        className={`px-2.5 py-2 rounded-lg font-bold border text-left transition-all ${
                                            genRumpunFilter === 'Umum' && !genUseCustomTopics
                                                ? 'bg-teal-700 text-white border-teal-700 shadow-2xs'
                                                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                                        }`}
                                    >
                                        <div className="text-[11px]">Khusus Umum</div>
                                        <div className="text-[9px] opacity-80 mt-0.5">Kurikulum Nasional</div>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setGenRumpunFilter('all');
                                            setGenUseCustomTopics(false);
                                        }}
                                        className={`px-2.5 py-2 rounded-lg font-bold border text-left transition-all ${
                                            genRumpunFilter === 'all' && !genUseCustomTopics
                                                ? 'bg-teal-700 text-white border-teal-700 shadow-2xs'
                                                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                                        }`}
                                    >
                                        <div className="text-[11px]">Semua Rumpun</div>
                                        <div className="text-[9px] opacity-80 mt-0.5">Seluruh Mapel Jenjang</div>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setGenRumpunFilter('custom');
                                            setGenUseCustomTopics(false);
                                            if (genSelectedMapelIds.length === 0) {
                                                setGenSelectedMapelIds(mapelList.map(m => m.id));
                                            }
                                        }}
                                        className={`px-2.5 py-2 rounded-lg font-bold border text-left transition-all ${
                                            genRumpunFilter === 'custom' && !genUseCustomTopics
                                                ? 'bg-teal-700 text-white border-teal-700 shadow-2xs'
                                                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                                        }`}
                                    >
                                        <div className="text-[11px]">Pilih Manual</div>
                                        <div className="text-[9px] opacity-80 mt-0.5">Centang Mapel Tertentu</div>
                                    </button>
                                </div>

                                {/* Tahfizh Specific Section: Preset / Paket Materi Munaqosyah */}
                                {(isMunaqosyahOrTahfizh || genRumpunFilter === 'Tahfizh') && (
                                    <div className="mt-2 pt-2 border-t border-gray-200/80 space-y-2">
                                        {tahfizhMapels.length === 0 && !genUseCustomTopics && (
                                            <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200 text-amber-900 flex items-start gap-2">
                                                <i className="bi bi-info-circle-fill text-amber-600 mt-0.5 text-xs"></i>
                                                <div className="text-[11px] leading-relaxed">
                                                    <strong>Info Otomatis:</strong> Belum ada mata pelajaran berumpun <em>'Tahfizh'</em> di Data Master pada jenjang ini. Agar jadwal tidak terisi mapel umum (Matematika/IPA), Anda dapat mengaktifkan <strong>Paket Materi Munaqosyah Standar</strong> di bawah.
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex items-center justify-between">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={genUseCustomTopics}
                                                    onChange={e => setGenUseCustomTopics(e.target.checked)}
                                                    className="rounded text-teal-600 focus:ring-teal-500"
                                                />
                                                <span className="font-bold text-gray-800 text-[11px]">
                                                    Gunakan Paket Materi Munaqosyah & Tahfizh (Bukan Mapel Formal)
                                                </span>
                                            </label>
                                            {genUseCustomTopics && (
                                                <button
                                                    type="button"
                                                    onClick={() => setGenCustomMateriList([...DEFAULT_TAHFIZH_EXAM_TOPICS])}
                                                    className="text-[10px] text-teal-700 hover:underline font-bold"
                                                >
                                                    Reset ke Standar
                                                </button>
                                            )}
                                        </div>

                                        {genUseCustomTopics && (
                                            <div className="p-2.5 bg-white rounded-lg border border-teal-200 space-y-2">
                                                <div className="text-[11px] font-bold text-gray-700">Daftar Materi Ujian yang Akan Digenerate:</div>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {genCustomMateriList.map((topic, tIdx) => (
                                                        <span
                                                            key={tIdx}
                                                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-teal-50 border border-teal-200 text-teal-900 font-bold text-[11px]"
                                                        >
                                                            <span>{topic}</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => setGenCustomMateriList(genCustomMateriList.filter((_, i) => i !== tIdx))}
                                                                className="text-teal-500 hover:text-red-600 font-black ml-1 text-sm leading-none"
                                                                title="Hapus materi ini"
                                                            >
                                                                &times;
                                                            </button>
                                                        </span>
                                                    ))}
                                                </div>

                                                <div className="flex gap-1.5 pt-1">
                                                    <input
                                                        type="text"
                                                        placeholder="Tambah materi tahfizh (misal: Munaqosyah Juz 1-5, Tasmi' 10 Juz)..."
                                                        value={newCustomTopicInput}
                                                        onChange={e => setNewCustomTopicInput(e.target.value)}
                                                        onKeyDown={e => {
                                                            if (e.key === 'Enter') {
                                                                e.preventDefault();
                                                                if (newCustomTopicInput.trim()) {
                                                                    setGenCustomMateriList([...genCustomMateriList, newCustomTopicInput.trim()]);
                                                                    setNewCustomTopicInput('');
                                                                }
                                                            }
                                                        }}
                                                        className="flex-1 border border-gray-300 rounded-lg px-2.5 py-1 text-[11px]"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            if (newCustomTopicInput.trim()) {
                                                                setGenCustomMateriList([...genCustomMateriList, newCustomTopicInput.trim()]);
                                                                setNewCustomTopicInput('');
                                                            }
                                                        }}
                                                        className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold text-[11px]"
                                                    >
                                                        + Tambah
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Custom Checklist Section */}
                                {genRumpunFilter === 'custom' && !genUseCustomTopics && (
                                    <div className="mt-2 pt-2 border-t border-gray-200/80 space-y-2">
                                        <div className="flex justify-between items-center">
                                            <span className="font-bold text-gray-700 text-[11px]">Centang Mapel yang Akan Diujikan:</span>
                                            <div className="flex gap-2 text-[10px]">
                                                <button
                                                    type="button"
                                                    onClick={() => setGenSelectedMapelIds(mapelList.map(m => m.id))}
                                                    className="text-teal-700 font-bold hover:underline"
                                                >
                                                    Pilih Semua ({mapelList.length})
                                                </button>
                                                <span className="text-gray-300">|</span>
                                                <button
                                                    type="button"
                                                    onClick={() => setGenSelectedMapelIds([])}
                                                    className="text-red-600 font-bold hover:underline"
                                                >
                                                    Kosongkan
                                                </button>
                                            </div>
                                        </div>

                                        <div className="max-h-36 overflow-y-auto p-2 bg-white rounded-lg border border-gray-200 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                            {mapelList.map(m => {
                                                const isChecked = genSelectedMapelIds.includes(m.id);
                                                return (
                                                    <label
                                                        key={m.id}
                                                        className={`flex items-center gap-2 p-1.5 rounded cursor-pointer transition-colors ${
                                                            isChecked ? 'bg-teal-50 text-teal-900 font-bold' : 'text-gray-600 hover:bg-gray-50'
                                                        }`}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={isChecked}
                                                            onChange={e => {
                                                                if (e.target.checked) {
                                                                    setGenSelectedMapelIds([...genSelectedMapelIds, m.id]);
                                                                } else {
                                                                    setGenSelectedMapelIds(genSelectedMapelIds.filter(id => id !== m.id));
                                                                }
                                                            }}
                                                            className="rounded text-teal-600 focus:ring-teal-500 text-xs"
                                                        />
                                                        <span className="truncate text-[11px]">{m.nama}</span>
                                                        {m.rumpun && (
                                                            <span className="text-[9px] px-1 py-0.2 bg-gray-100 text-gray-500 rounded ml-auto">
                                                                {m.rumpun}
                                                            </span>
                                                        )}
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Realtime Preview of Resolved Subjects */}
                                <div className="pt-2 border-t border-gray-200 flex items-center justify-between text-[11px]">
                                    <span className="font-bold text-gray-600">Materi Terjadwal:</span>
                                    <div className="flex items-center gap-1.5 overflow-hidden text-right">
                                        <span className="font-black text-teal-800">
                                            {resolvedExamSubjects.length} Item
                                        </span>
                                        <span className="text-gray-500 truncate max-w-[240px]">
                                            ({resolvedExamSubjects.slice(0, 3).map(s => s.label).join(', ')}{resolvedExamSubjects.length > 3 ? '...' : ''})
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                                    <div key={s.sesiKe} className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                                        <span className="w-16 font-bold text-teal-800 shrink-0">Sesi {s.sesiKe}:</span>
                                        <div className="flex items-center gap-1.5 w-full sm:w-auto">
                                            <input
                                                type="time"
                                                value={s.jamMulai}
                                                onChange={e => {
                                                    const updated = [...genSesiTimes];
                                                    updated[idx].jamMulai = e.target.value;
                                                    setGenSesiTimes(updated);
                                                }}
                                                className="border rounded p-1 text-center font-mono font-bold bg-white text-xs flex-1 sm:flex-initial"
                                            />
                                            <span className="text-gray-400 text-xs shrink-0">s/d</span>
                                            <input
                                                type="time"
                                                value={s.jamSelesai}
                                                onChange={e => {
                                                    const updated = [...genSesiTimes];
                                                    updated[idx].jamSelesai = e.target.value;
                                                    setGenSesiTimes(updated);
                                                }}
                                                className="border rounded p-1 text-center font-mono font-bold bg-white text-xs flex-1 sm:flex-initial"
                                            />
                                        </div>
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

                            <div className="pt-4 border-t flex flex-wrap items-center justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsGeneratorOpen(false)}
                                    className="px-4 py-2 border rounded-lg text-gray-600 hover:bg-gray-50 font-bold shrink-0"
                                >
                                    Batal
                                </button>
                                <button
                                    type="button"
                                    onClick={handleRunGenerator}
                                    className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-black shadow-xs flex items-center gap-1.5 shrink-0"
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

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
                                <label className="block font-bold text-gray-600 mb-1">
                                    Mata Pelajaran Formal <span className="font-normal text-gray-400">(Opsional jika ujian materi bebas)</span>
                                </label>
                                <select
                                    value={editingSlot.mapelId || ''}
                                    onChange={e => {
                                        const mId = Number(e.target.value) || undefined;
                                        const chosen = mapelList.find(m => m.id === mId);
                                        setEditingSlot({
                                            ...editingSlot,
                                            mapelId: mId,
                                            keterangan: editingSlot.keterangan || chosen?.nama || ''
                                        });
                                    }}
                                    className="w-full border rounded-lg p-2 font-bold"
                                >
                                    <option value="">-- Tanpa Mapel Formal / Gunakan Materi Bebas --</option>
                                    {mapelList.map(m => (
                                        <option key={m.id} value={m.id}>{m.nama} {m.rumpun ? `(${m.rumpun})` : ''}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block font-bold text-gray-600 mb-1">
                                    Materi / Topik Ujian Khusus
                                    <span className="font-normal text-gray-400 ml-1">(Contoh: Munaqosyah Juz 30, Tasmi' Bil Ghaib)</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="Contoh: Munaqosyah Juz 30, Tasmi' 5 Juz..."
                                    value={editingSlot.keterangan || ''}
                                    onChange={e => setEditingSlot({ ...editingSlot, keterangan: e.target.value })}
                                    className="w-full border rounded-lg p-2 font-bold"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div>
                                    <label className="block font-bold text-gray-600 mb-1">Pengawas 1 (Utama)</label>
                                    <select
                                        value={editingSlot.pengawasId || ''}
                                        onChange={e => setEditingSlot({ ...editingSlot, pengawasId: Number(e.target.value) || undefined })}
                                        className="w-full border rounded-lg p-2 font-bold"
                                    >
                                        <option value="">-- Pilih Pengawas 1 --</option>
                                        {settings.tenagaPengajar.map(t => (
                                            <option key={t.id} value={t.id}>{t.nama}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block font-bold text-gray-600 mb-1">Pengawas 2 (Pendamping / Penguji)</label>
                                    <select
                                        value={editingSlot.pengawas2Id || ''}
                                        onChange={e => setEditingSlot({ ...editingSlot, pengawas2Id: Number(e.target.value) || undefined })}
                                        className="w-full border rounded-lg p-2 font-bold"
                                    >
                                        <option value="">-- Tanpa Pengawas 2 --</option>
                                        {settings.tenagaPengajar.map(t => (
                                            <option key={t.id} value={t.id}>{t.nama}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="pt-4 border-t flex flex-wrap items-center justify-between gap-2">
                                {editingSlot.id ? (
                                    <button
                                        type="button"
                                        onClick={() => handleDeleteSlot(editingSlot.id!)}
                                        className="px-3 py-2 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg font-bold shrink-0"
                                    >
                                        Hapus
                                    </button>
                                ) : <div />}

                                <div className="flex flex-wrap items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsEditModalOpen(false)}
                                        className="px-3.5 py-2 border rounded-lg text-gray-600 hover:bg-gray-50 font-bold shrink-0"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleSaveManualSlot}
                                        className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-black shadow-xs shrink-0"
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
