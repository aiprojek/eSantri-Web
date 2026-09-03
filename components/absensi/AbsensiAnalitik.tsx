import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../AppContext';
import { useSantriContext } from '../../contexts/SantriContext';
import { Santri, AbsensiRecord, SesiAbsensi } from '../../types';
import { SESI_ABSENSI_LIST, getStatusBadgeColor, getStatusLabel } from './absensiConstants';
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    PieChart,
    Pie,
    Cell,
    Legend
} from 'recharts';

export const AbsensiAnalitik: React.FC = () => {
    const { settings } = useAppContext();
    const { santriList, absensiList } = useSantriContext();

    const [activeSubTab, setActiveSubTab] = useState<'kalender' | 'komparasi'>('kalender');

    // --- Global Cascading Filter State ---
    const [selectedJenjangId, setSelectedJenjangId] = useState<number>(0);
    const [selectedKelasId, setSelectedKelasId] = useState<number>(0);
    const [selectedRombelId, setSelectedRombelId] = useState<number>(0);
    const [selectedJenisSantri, setSelectedJenisSantri] = useState<string>('all');
    const [selectedSesi, setSelectedSesi] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState<string>('');

    // --- Date & Period State ---
    const now = new Date();
    const [calendarYear, setCalendarYear] = useState<number>(now.getFullYear());
    const [calendarMonth, setCalendarMonth] = useState<number>(now.getMonth()); // 0-indexed
    const [calendarSantriId, setCalendarSantriId] = useState<number>(0);
    const [selectedDayDetail, setSelectedDayDetail] = useState<{ date: string; records: AbsensiRecord[] } | null>(null);

    // --- Cascading Options ---
    const availableKelas = useMemo(() => {
        if (!selectedJenjangId) return settings.kelas;
        return settings.kelas.filter(k => k.jenjangId === selectedJenjangId);
    }, [selectedJenjangId, settings.kelas]);

    const availableRombel = useMemo(() => {
        if (selectedKelasId) {
            return settings.rombel.filter(r => r.kelasId === selectedKelasId);
        }
        if (selectedJenjangId) {
            const kelasIds = new Set(availableKelas.map(k => k.id));
            return settings.rombel.filter(r => kelasIds.has(r.kelasId));
        }
        return settings.rombel;
    }, [selectedKelasId, selectedJenjangId, availableKelas, settings.rombel]);

    // Handle Jenjang Change (Cascading reset)
    const handleJenjangChange = (jenjangId: number) => {
        setSelectedJenjangId(jenjangId);
        setSelectedKelasId(0);
        setSelectedRombelId(0);
        setCalendarSantriId(0);
    };

    // Handle Kelas Change (Cascading reset)
    const handleKelasChange = (kelasId: number) => {
        setSelectedKelasId(kelasId);
        setSelectedRombelId(0);
        setCalendarSantriId(0);
    };

    // Handle Rombel Change
    const handleRombelChange = (rombelId: number) => {
        setSelectedRombelId(rombelId);
        setCalendarSantriId(0);
    };

    // Reset All Filters
    const handleResetFilters = () => {
        setSelectedJenjangId(0);
        setSelectedKelasId(0);
        setSelectedRombelId(0);
        setSelectedJenisSantri('all');
        setSelectedSesi('all');
        setSearchQuery('');
        setCalendarYear(now.getFullYear());
        setCalendarMonth(now.getMonth());
        setCalendarSantriId(0);
    };

    // Filtered Santri List matching the cascading filters & search
    const matchesJenisSantri = (santriJenis?: string, filterVal?: string) => {
        if (!filterVal || filterVal === 'all') return true;
        if (!santriJenis) return false;
        const lower = santriJenis.toLowerCase();
        if (filterVal === 'Mondok' || filterVal === 'Mukim') {
            return lower.includes('mondok') || lower.includes('mukim') || lower.includes('asrama');
        }
        if (filterVal === 'Laju' || filterVal === 'Non-Mukim') {
            return lower.includes('laju') || lower.includes('non') || lower.includes('pulang');
        }
        return santriJenis === filterVal;
    };

    const filteredSantriList = useMemo(() => {
        return santriList.filter(s => {
            if (s.status !== 'Aktif') return false;
            if (selectedJenjangId && s.jenjangId !== selectedJenjangId) return false;
            if (selectedKelasId && s.kelasId !== selectedKelasId) return false;
            if (selectedRombelId && s.rombelId !== selectedRombelId) return false;
            if (!matchesJenisSantri(s.jenisSantri, selectedJenisSantri)) return false;
            if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase();
                const matchName = s.namaLengkap.toLowerCase().includes(query);
                const matchNis = s.nis && s.nis.toLowerCase().includes(query);
                if (!matchName && !matchNis) return false;
            }
            return true;
        }).sort((a, b) => a.namaLengkap.localeCompare(b.namaLengkap));
    }, [santriList, selectedJenjangId, selectedKelasId, selectedRombelId, selectedJenisSantri, searchQuery]);

    // Active Student in Calendar
    const activeStudent: Santri | undefined = useMemo(() => {
        if (calendarSantriId) {
            const found = filteredSantriList.find(s => s.id === calendarSantriId);
            if (found) return found;
            const anyFound = santriList.find(s => s.id === calendarSantriId);
            if (anyFound) return anyFound;
        }
        return filteredSantriList[0];
    }, [calendarSantriId, filteredSantriList, santriList]);

    // Available Sessions
    const sessionList = SESI_ABSENSI_LIST;

    // Active student's records for the chosen month & year & session
    const studentMonthRecords = useMemo(() => {
        if (!activeStudent) return [];
        const monthStr = String(calendarMonth + 1).padStart(2, '0');
        const prefix = `${calendarYear}-${monthStr}`;
        return absensiList.filter(a => {
            if (a.santriId !== activeStudent.id) return false;
            if (!a.tanggal.startsWith(prefix)) return false;
            if (selectedSesi !== 'all') {
                const itemSesi = a.sesi || 'KBM Pagi';
                if (itemSesi !== selectedSesi) return false;
            }
            return true;
        });
    }, [activeStudent, absensiList, calendarMonth, calendarYear, selectedSesi]);

    // Stats for the active student in this month
    const studentMonthStats = useMemo(() => {
        let H = 0, S = 0, I = 0, A = 0;
        studentMonthRecords.forEach(r => {
            if (r.status === 'H') H++;
            else if (r.status === 'S') S++;
            else if (r.status === 'I') I++;
            else if (r.status === 'A') A++;
        });
        const total = H + S + I + A;
        const rate = total > 0 ? (H / total) * 100 : 100;
        return { H, S, I, A, total, rate };
    }, [studentMonthRecords]);

    // Calendar grid generator
    const calendarDays = useMemo(() => {
        const firstDayOfMonth = new Date(calendarYear, calendarMonth, 1);
        const lastDayOfMonth = new Date(calendarYear, calendarMonth + 1, 0);
        const totalDays = lastDayOfMonth.getDate();

        // Day of week for first day (0=Sunday, 1=Monday... align to Monday start: 0=Mon, 6=Sun)
        let startingDay = firstDayOfMonth.getDay() - 1;
        if (startingDay === -1) startingDay = 6;

        const days: {
            dayNumber: number;
            dateStr: string;
            isCurrentMonth: boolean;
            isWeekend: boolean;
            records: AbsensiRecord[];
            primaryStatus?: 'H' | 'S' | 'I' | 'A';
        }[] = [];

        // Padding before start of month
        for (let i = 0; i < startingDay; i++) {
            days.push({
                dayNumber: 0,
                dateStr: '',
                isCurrentMonth: false,
                isWeekend: false,
                records: []
            });
        }

        // Days of current month
        for (let d = 1; d <= totalDays; d++) {
            const mStr = String(calendarMonth + 1).padStart(2, '0');
            const dStr = String(d).padStart(2, '0');
            const dateStr = `${calendarYear}-${mStr}-${dStr}`;
            const dayOfWeek = new Date(calendarYear, calendarMonth, d).getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 5; // Friday or Sunday

            const dayRecords = studentMonthRecords.filter(r => r.tanggal === dateStr);

            // Primary status priority: A > S > I > H
            let primaryStatus: 'H' | 'S' | 'I' | 'A' | undefined = undefined;
            if (dayRecords.some(r => r.status === 'A')) primaryStatus = 'A';
            else if (dayRecords.some(r => r.status === 'S')) primaryStatus = 'S';
            else if (dayRecords.some(r => r.status === 'I')) primaryStatus = 'I';
            else if (dayRecords.some(r => r.status === 'H')) primaryStatus = 'H';

            days.push({
                dayNumber: d,
                dateStr,
                isCurrentMonth: true,
                isWeekend,
                records: dayRecords,
                primaryStatus
            });
        }

        return days;
    }, [calendarYear, calendarMonth, studentMonthRecords]);

    // Month Navigation
    const monthNames = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    const handlePrevMonth = () => {
        if (calendarMonth === 0) {
            setCalendarMonth(11);
            setCalendarYear(prev => prev - 1);
        } else {
            setCalendarMonth(prev => prev - 1);
        }
    };

    const handleNextMonth = () => {
        if (calendarMonth === 11) {
            setCalendarMonth(0);
            setCalendarYear(prev => prev + 1);
        } else {
            setCalendarMonth(prev => prev + 1);
        }
    };

    const handleCurrentMonth = () => {
        setCalendarMonth(now.getMonth());
        setCalendarYear(now.getFullYear());
    };

    // --- State & Calculations for Comparative Analytics (Tab 2) ---
    // Comparative stats respect the selected Jenjang, Kelas, Period, and Sesi
    const comparativeScopeRombel = useMemo(() => {
        let list = settings.rombel;
        if (selectedKelasId) {
            list = list.filter(r => r.kelasId === selectedKelasId);
        } else if (selectedJenjangId) {
            const kelasIds = new Set(availableKelas.map(k => k.id));
            list = list.filter(r => kelasIds.has(r.kelasId));
        }
        if (selectedRombelId) {
            list = list.filter(r => r.id === selectedRombelId);
        }
        return list;
    }, [settings.rombel, selectedKelasId, selectedJenjangId, availableKelas, selectedRombelId]);

    const rombelComparativeStats = useMemo(() => {
        const monthStr = String(calendarMonth + 1).padStart(2, '0');
        const prefix = `${calendarYear}-${monthStr}`;

        return comparativeScopeRombel.map(r => {
            const students = santriList.filter(s => {
                if (s.status !== 'Aktif' || s.rombelId !== r.id) return false;
                if (!matchesJenisSantri(s.jenisSantri, selectedJenisSantri)) return false;
                return true;
            });
            const studentIds = new Set(students.map(s => s.id));
            const records = absensiList.filter(a => {
                if (!studentIds.has(a.santriId)) return false;
                if (!a.tanggal.startsWith(prefix)) return false;
                if (selectedSesi !== 'all') {
                    const itemSesi = a.sesi || 'KBM Pagi';
                    if (itemSesi !== selectedSesi) return false;
                }
                return true;
            });

            let H = 0, S = 0, I = 0, A = 0;
            records.forEach(rec => {
                if (rec.status === 'H') H++;
                else if (rec.status === 'S') S++;
                else if (rec.status === 'I') I++;
                else if (rec.status === 'A') A++;
            });

            const total = H + S + I + A;
            const rate = total > 0 ? (H / total) * 100 : 0;
            const kelas = settings.kelas.find(k => k.id === r.kelasId);
            const jenjang = settings.jenjang.find(j => j.id === kelas?.jenjangId);

            return {
                rombelId: r.id,
                rombelName: r.nama,
                kelasName: kelas?.nama || '',
                jenjangName: jenjang?.nama || '',
                totalStudents: students.length,
                hadir: H,
                sakit: S,
                izin: I,
                alpha: A,
                totalRecords: total,
                attendanceRate: Number(rate.toFixed(1))
            };
        }).filter(item => item.totalStudents > 0);
    }, [comparativeScopeRombel, santriList, selectedJenisSantri, absensiList, calendarMonth, calendarYear, selectedSesi, settings.kelas, settings.jenjang]);

    // Overall filtered scope attendance pie
    const overallAbsencePie = useMemo(() => {
        const monthStr = String(calendarMonth + 1).padStart(2, '0');
        const prefix = `${calendarYear}-${monthStr}`;

        const validStudentIds = new Set(filteredSantriList.map(s => s.id));
        let H = 0, S = 0, I = 0, A = 0;

        absensiList.forEach(rec => {
            if (!validStudentIds.has(rec.santriId)) return false;
            if (!rec.tanggal.startsWith(prefix)) return false;
            if (selectedSesi !== 'all') {
                const itemSesi = rec.sesi || 'KBM Pagi';
                if (itemSesi !== selectedSesi) return false;
            }
            if (rec.status === 'H') H++;
            else if (rec.status === 'S') S++;
            else if (rec.status === 'I') I++;
            else if (rec.status === 'A') A++;
        });

        return [
            { name: 'Hadir', value: H, color: '#10B981' },
            { name: 'Izin', value: I, color: '#3B82F6' },
            { name: 'Sakit', value: S, color: '#F59E0B' },
            { name: 'Alpha', value: A, color: '#EF4444' }
        ];
    }, [filteredSantriList, absensiList, calendarMonth, calendarYear, selectedSesi]);

    // Average attendance rate in scope
    const overallAttendanceRate = useMemo(() => {
        const total = overallAbsencePie.reduce((acc, curr) => acc + curr.value, 0);
        const hadir = overallAbsencePie.find(p => p.name === 'Hadir')?.value || 0;
        return total > 0 ? ((hadir / total) * 100).toFixed(1) : '100.0';
    }, [overallAbsencePie]);

    // Total records in current scope
    const totalRecordsInScope = useMemo(() => {
        return overallAbsencePie.reduce((acc, curr) => acc + curr.value, 0);
    }, [overallAbsencePie]);

    return (
        <div className="space-y-6">
            {/* Header & Sub-Tab Switcher */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
                <div>
                    <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                        <i className="bi bi-calendar2-range-fill text-teal-600"></i>
                        <span>Kalender & Analitik Presensi Santri</span>
                    </h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                        Pemantauan kalender harian individual santri dan grafik analitik komparatif berjenjang.
                    </p>
                </div>

                <div className="flex bg-gray-100 p-1 rounded-xl w-full sm:w-auto">
                    <button
                        type="button"
                        onClick={() => setActiveSubTab('kalender')}
                        className={`flex-1 sm:flex-initial py-2 px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                            activeSubTab === 'kalender'
                                ? 'bg-white text-teal-800 shadow-xs'
                                : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                        <i className="bi bi-calendar3"></i>
                        <span>Kalender Santri</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveSubTab('komparasi')}
                        className={`flex-1 sm:flex-initial py-2 px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                            activeSubTab === 'komparasi'
                                ? 'bg-white text-teal-800 shadow-xs'
                                : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                        <i className="bi bi-bar-chart-line-fill"></i>
                        <span>Grafik & Analitik</span>
                    </button>
                </div>
            </div>

            {/* ========================================================= */}
            {/* CENTRAL CASCADING FILTER PANEL (Jenjang -> Kelas -> Rombel) */}
            {/* ========================================================= */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 shadow-2xs space-y-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3">
                    <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-teal-500"></span>
                        <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                            Filter Berjenjang (Jenjang &rarr; Kelas &rarr; Rombel)
                        </span>
                        <span className="text-[11px] bg-teal-50 text-teal-700 font-semibold px-2 py-0.5 rounded-full border border-teal-200">
                            {filteredSantriList.length} Santri Aktif
                        </span>
                    </div>

                    {(selectedJenjangId > 0 || selectedKelasId > 0 || selectedRombelId > 0 || selectedJenisSantri !== 'all' || selectedSesi !== 'all' || searchQuery.trim()) && (
                        <button
                            type="button"
                            onClick={handleResetFilters}
                            className="text-xs text-red-600 hover:text-red-800 font-semibold flex items-center gap-1 hover:underline transition-all"
                        >
                            <i className="bi bi-x-circle"></i>
                            <span>Reset Filter</span>
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
                    {/* 1. Filter Jenjang */}
                    <div>
                        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                            1. Jenjang
                        </label>
                        <select
                            value={selectedJenjangId}
                            onChange={e => handleJenjangChange(Number(e.target.value))}
                            className="w-full text-xs font-semibold p-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:bg-white outline-none"
                        >
                            <option value={0}>-- Semua Jenjang --</option>
                            {settings.jenjang.map(j => (
                                <option key={j.id} value={j.id}>{j.nama}</option>
                            ))}
                        </select>
                    </div>

                    {/* 2. Filter Kelas (Cascading) */}
                    <div>
                        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                            2. Kelas
                        </label>
                        <select
                            value={selectedKelasId}
                            onChange={e => handleKelasChange(Number(e.target.value))}
                            disabled={availableKelas.length === 0}
                            className="w-full text-xs font-semibold p-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:bg-white outline-none disabled:opacity-50"
                        >
                            <option value={0}>-- Semua Kelas --</option>
                            {availableKelas.map(k => (
                                <option key={k.id} value={k.id}>{k.nama}</option>
                            ))}
                        </select>
                    </div>

                    {/* 3. Filter Rombel (Cascading) */}
                    <div>
                        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                            3. Rombel
                        </label>
                        <select
                            value={selectedRombelId}
                            onChange={e => handleRombelChange(Number(e.target.value))}
                            disabled={availableRombel.length === 0}
                            className="w-full text-xs font-semibold p-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:bg-white outline-none disabled:opacity-50"
                        >
                            <option value={0}>-- Semua Rombel --</option>
                            {availableRombel.map(r => {
                                const k = settings.kelas.find(kl => kl.id === r.kelasId);
                                return (
                                    <option key={r.id} value={r.id}>
                                        {r.nama} {k ? `(${k.nama})` : ''}
                                    </option>
                                );
                            })}
                        </select>
                    </div>

                    {/* 4. Filter Jenis Santri */}
                    <div>
                        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                            Jenis Santri
                        </label>
                        <select
                            value={selectedJenisSantri}
                            onChange={e => setSelectedJenisSantri(e.target.value)}
                            className="w-full text-xs font-semibold p-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:bg-white outline-none"
                        >
                            <option value="all">Semua Kategori</option>
                            <optgroup label="Kategori Utama">
                                <option value="Mondok">Semua Mondok (Berasrama)</option>
                                <option value="Laju">Semua Laju (Pulang-Pergi)</option>
                            </optgroup>
                            <optgroup label="Opsi Spesifik">
                                <option value="Mondok - Baru">Mondok - Baru</option>
                                <option value="Mondok - Pindahan">Mondok - Pindahan</option>
                                <option value="Laju - Baru">Laju - Baru</option>
                                <option value="Laju - Pindahan">Laju - Pindahan</option>
                            </optgroup>
                        </select>
                    </div>

                    {/* 5. Filter Sesi Absensi */}
                    <div>
                        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                            Sesi Presensi
                        </label>
                        <select
                            value={selectedSesi}
                            onChange={e => setSelectedSesi(e.target.value)}
                            className="w-full text-xs font-semibold p-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:bg-white outline-none"
                        >
                            <option value="all">Semua Sesi</option>
                            {sessionList.map((s: string, idx: number) => (
                                <option key={idx} value={s}>{s}</option>
                            ))}
                        </select>
                    </div>

                    {/* 6. Live Search Santri */}
                    <div>
                        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                            Cari Nama / NIS
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Ketik nama / NIS..."
                                className="w-full text-xs p-2.5 pr-7 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:bg-white outline-none"
                            />
                            {searchQuery ? (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2 top-2.5 text-gray-400 hover:text-gray-600 text-xs"
                                >
                                    <i className="bi bi-x-circle-fill"></i>
                                </button>
                            ) : (
                                <i className="bi bi-search absolute right-2.5 top-2.5 text-gray-400 text-xs pointer-events-none"></i>
                            )}
                        </div>
                    </div>
                </div>

                {/* Period Selector (Bulan & Tahun) Bar */}
                <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <label className="text-xs font-bold text-gray-600">Periode:</label>
                        <select
                            value={calendarMonth}
                            onChange={e => setCalendarMonth(Number(e.target.value))}
                            className="text-xs font-bold p-1.5 bg-gray-50 border border-gray-300 rounded-lg text-teal-900"
                        >
                            {monthNames.map((m, i) => (
                                <option key={i} value={i}>{m}</option>
                            ))}
                        </select>
                        <select
                            value={calendarYear}
                            onChange={e => setCalendarYear(Number(e.target.value))}
                            className="text-xs font-bold p-1.5 bg-gray-50 border border-gray-300 rounded-lg text-teal-900"
                        >
                            {[...Array(10)].map((_, idx) => {
                                const y = now.getFullYear() - 4 + idx;
                                return <option key={y} value={y}>{y}</option>;
                            })}
                        </select>
                        <button
                            type="button"
                            onClick={handleCurrentMonth}
                            className="text-[11px] font-semibold px-2 py-1 bg-teal-50 text-teal-700 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors"
                        >
                            Bulan Ini
                        </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            onClick={handlePrevMonth}
                            className="p-1.5 px-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                        >
                            <i className="bi bi-chevron-left"></i>
                            <span>Bulan Lalu</span>
                        </button>
                        <span className="text-xs font-bold px-2 py-1 text-gray-700 bg-gray-50 rounded-lg border border-gray-200">
                            {monthNames[calendarMonth]} {calendarYear}
                        </span>
                        <button
                            type="button"
                            onClick={handleNextMonth}
                            className="p-1.5 px-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                        >
                            <span>Bulan Depan</span>
                            <i className="bi bi-chevron-right"></i>
                        </button>
                    </div>
                </div>
            </div>

            {/* ========================================================= */}
            {/* SUB-TAB 1: KALENDER KEHADIRAN INDIVIDUAL SANTRI */}
            {/* ========================================================= */}
            {activeSubTab === 'kalender' && (
                <div className="space-y-6">
                    {/* Santri Selector Bar */}
                    <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="w-full sm:max-w-md">
                            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                                Pilih Santri untuk Ditampilkan ({filteredSantriList.length} Santri Terfilter)
                            </label>
                            <select
                                value={activeStudent?.id || 0}
                                onChange={e => setCalendarSantriId(Number(e.target.value))}
                                disabled={filteredSantriList.length === 0}
                                className="w-full text-xs font-bold p-2.5 bg-teal-50/50 border border-teal-300 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none text-teal-900 disabled:opacity-50"
                            >
                                {filteredSantriList.length > 0 ? (
                                    filteredSantriList.map(s => {
                                        const r = settings.rombel.find(rb => rb.id === s.rombelId);
                                        return (
                                            <option key={s.id} value={s.id}>
                                                {s.namaLengkap} (NIS: {s.nis || '-'}) {r ? `• ${r.nama}` : ''}
                                            </option>
                                        );
                                    })
                                ) : (
                                    <option value={0}>Tidak ada santri sesuai filter di atas</option>
                                )}
                            </select>
                        </div>

                        {activeStudent && (
                            <div className="flex items-center gap-2 text-xs text-gray-600 bg-gray-50 p-2.5 rounded-xl border border-gray-200">
                                <span className="font-semibold text-gray-500">Santri Terpilih:</span>
                                <strong className="text-gray-900">{activeStudent.namaLengkap}</strong>
                                <span className="text-gray-400">|</span>
                                <span className="text-teal-700 font-medium">
                                    {settings.rombel.find(r => r.id === activeStudent.rombelId)?.nama || 'Tanpa Rombel'}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Student Info & Stats Summary */}
                    {activeStudent ? (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                            {/* Profile & KPI Summary Card (4 cols) */}
                            <div className="lg:col-span-4 space-y-4">
                                <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-2xs space-y-4">
                                    <div className="flex items-center gap-3.5 border-b border-gray-100 pb-4">
                                        <div className="w-14 h-14 rounded-2xl bg-teal-100 text-teal-700 font-black text-xl flex items-center justify-center shrink-0 border border-teal-200">
                                            {activeStudent.fotoUrl ? (
                                                <img src={activeStudent.fotoUrl} alt={activeStudent.namaLengkap} className="w-full h-full object-cover rounded-2xl" />
                                            ) : (
                                                activeStudent.namaLengkap.charAt(0).toUpperCase()
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h3 className="font-bold text-gray-900 text-base truncate">{activeStudent.namaLengkap}</h3>
                                            <p className="text-xs text-gray-500">NIS: {activeStudent.nis || '-'} • {settings.rombel.find(r => r.id === activeStudent.rombelId)?.nama || 'Rombel'}</p>
                                            <div className="flex items-center gap-1.5 mt-1">
                                                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-200">
                                                    Status: Aktif
                                                </span>
                                                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                                                    {activeStudent.jenisSantri || 'Mukim'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Monthly Rate Indicator */}
                                    <div className="p-4 bg-teal-50/70 border border-teal-200 rounded-xl text-center">
                                        <p className="text-xs font-bold text-teal-800 uppercase tracking-wider">
                                            Kehadiran: {monthNames[calendarMonth]} {calendarYear}
                                        </p>
                                        <p className="text-3xl font-black text-teal-900 mt-1">{studentMonthStats.rate.toFixed(1)}%</p>
                                        <div className="w-full bg-teal-200 rounded-full h-2 mt-2.5 overflow-hidden">
                                            <div
                                                className="bg-teal-600 h-2 rounded-full transition-all duration-500"
                                                style={{ width: `${Math.min(100, Math.max(0, studentMonthStats.rate))}%` }}
                                            ></div>
                                        </div>
                                        <p className="text-[10px] text-teal-700 mt-1.5">
                                            {selectedSesi === 'all' ? 'Akumulasi Seluruh Sesi' : `Sesi: ${selectedSesi}`}
                                        </p>
                                    </div>

                                    {/* 4 Counter Grid */}
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div className="bg-green-50/80 border border-green-200 p-3 rounded-xl">
                                            <span className="font-semibold text-green-800 flex items-center gap-1 text-[11px]">
                                                <span className="w-2 h-2 rounded-full bg-green-500"></span> Hadir (H)
                                            </span>
                                            <p className="text-xl font-black text-green-900 mt-1">{studentMonthStats.H} <span className="text-[10px] font-normal text-green-700">Sesi</span></p>
                                        </div>
                                        <div className="bg-yellow-50/80 border border-yellow-200 p-3 rounded-xl">
                                            <span className="font-semibold text-yellow-800 flex items-center gap-1 text-[11px]">
                                                <span className="w-2 h-2 rounded-full bg-yellow-500"></span> Sakit (S)
                                            </span>
                                            <p className="text-xl font-black text-yellow-900 mt-1">{studentMonthStats.S} <span className="text-[10px] font-normal text-yellow-700">Sesi</span></p>
                                        </div>
                                        <div className="bg-blue-50/80 border border-blue-200 p-3 rounded-xl">
                                            <span className="font-semibold text-blue-800 flex items-center gap-1 text-[11px]">
                                                <span className="w-2 h-2 rounded-full bg-blue-500"></span> Izin (I)
                                            </span>
                                            <p className="text-xl font-black text-blue-900 mt-1">{studentMonthStats.I} <span className="text-[10px] font-normal text-blue-700">Sesi</span></p>
                                        </div>
                                        <div className="bg-red-50/80 border border-red-200 p-3 rounded-xl">
                                            <span className="font-semibold text-red-800 flex items-center gap-1 text-[11px]">
                                                <span className="w-2 h-2 rounded-full bg-red-500"></span> Alpha (A)
                                            </span>
                                            <p className="text-xl font-black text-red-900 mt-1">{studentMonthStats.A} <span className="text-[10px] font-normal text-red-700">Sesi</span></p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Monthly Interactive Calendar Grid (8 cols) */}
                            <div className="lg:col-span-8 space-y-4">
                                <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-2xs space-y-4">
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-gray-100 pb-3">
                                        <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                                            <i className="bi bi-calendar-check-fill text-teal-600"></i>
                                            <span>Kalender: {monthNames[calendarMonth]} {calendarYear}</span>
                                        </h4>
                                        {/* Legend */}
                                        <div className="flex items-center gap-3 text-[10px] font-bold">
                                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> H (Hadir)</span>
                                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500"></span> S (Sakit)</span>
                                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> I (Izin)</span>
                                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> A (Alpha)</span>
                                        </div>
                                    </div>

                                    {/* Days Grid Header */}
                                    <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-bold text-gray-500 border-b border-gray-100 pb-2">
                                        <span>Sen</span>
                                        <span>Sel</span>
                                        <span>Rab</span>
                                        <span>Kam</span>
                                        <span className="text-teal-600 font-bold">Jum</span>
                                        <span>Sab</span>
                                        <span className="text-red-500 font-bold">Ahad</span>
                                    </div>

                                    {/* Days Cells */}
                                    <div className="grid grid-cols-7 gap-1.5">
                                        {calendarDays.map((cell, idx) => {
                                            if (!cell.isCurrentMonth) {
                                                return <div key={idx} className="h-16 sm:h-20 bg-gray-50/50 rounded-xl border border-dashed border-gray-100"></div>;
                                            }

                                            let badgeBg = 'bg-gray-100 text-gray-700';
                                            if (cell.primaryStatus === 'H') badgeBg = 'bg-green-500 text-white';
                                            else if (cell.primaryStatus === 'S') badgeBg = 'bg-yellow-500 text-white';
                                            else if (cell.primaryStatus === 'I') badgeBg = 'bg-blue-500 text-white';
                                            else if (cell.primaryStatus === 'A') badgeBg = 'bg-red-500 text-white';

                                            return (
                                                <div
                                                    key={idx}
                                                    onClick={() => cell.records.length > 0 && setSelectedDayDetail({ date: cell.dateStr, records: cell.records })}
                                                    className={`h-16 sm:h-20 p-1.5 rounded-xl border flex flex-col justify-between transition-all ${
                                                        cell.records.length > 0
                                                            ? 'cursor-pointer hover:border-teal-400 hover:shadow-xs bg-white'
                                                            : 'bg-gray-50/70 border-gray-200'
                                                    } ${cell.primaryStatus === 'A' ? 'border-red-300 bg-red-50/30' : 'border-gray-200'}`}
                                                >
                                                    <div className="flex justify-between items-start">
                                                        <span className={`text-xs font-bold ${cell.isWeekend ? 'text-red-500' : 'text-gray-700'}`}>
                                                            {cell.dayNumber}
                                                        </span>
                                                        {cell.primaryStatus && (
                                                            <span className={`w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center shadow-2xs ${badgeBg}`}>
                                                                {cell.primaryStatus}
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="truncate">
                                                        {cell.records.length > 0 ? (
                                                            <p className="text-[9px] text-gray-500 truncate">
                                                                {cell.records.length} sesi {cell.records[0].keterangan ? '• ' + cell.records[0].keterangan : ''}
                                                            </p>
                                                        ) : (
                                                            <p className="text-[9px] text-gray-300">-</p>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-gray-500 space-y-3">
                            <i className="bi bi-people text-4xl text-gray-300"></i>
                            <h3 className="text-base font-bold text-gray-700">Tidak Ada Santri yang Cocok dengan Filter</h3>
                            <p className="text-xs text-gray-400 max-w-sm mx-auto">
                                Silakan sesuaikan pilihan Jenjang, Kelas, Rombel, atau kata kunci pencarian di atas untuk memuat data kalender.
                            </p>
                            <button
                                type="button"
                                onClick={handleResetFilters}
                                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                            >
                                Reset Filter ke Default
                            </button>
                        </div>
                    )}

                    {/* Day Detail Modal */}
                    {selectedDayDetail && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
                            <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
                                <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                                    <div>
                                        <h3 className="font-bold text-gray-900 text-sm">Detail Presensi Harian</h3>
                                        <p className="text-xs text-teal-600 font-semibold">{selectedDayDetail.date} • {activeStudent?.namaLengkap}</p>
                                    </div>
                                    <button
                                        onClick={() => setSelectedDayDetail(null)}
                                        className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600"
                                    >
                                        <i className="bi bi-x-lg"></i>
                                    </button>
                                </div>

                                <div className="space-y-2 max-h-60 overflow-y-auto">
                                    {selectedDayDetail.records.map((rec, i) => (
                                        <div key={i} className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-1">
                                            <div className="flex justify-between items-center">
                                                <span className="font-bold text-gray-800 text-xs">{rec.sesi || 'KBM Pagi'}</span>
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadgeColor(rec.status)}`}>
                                                    {getStatusLabel(rec.status).toUpperCase()}
                                                </span>
                                            </div>
                                            {rec.keterangan && (
                                                <p className="text-xs text-gray-600">{rec.keterangan}</p>
                                            )}
                                            {rec.recordedBy && (
                                                <p className="text-[10px] text-gray-400">Dicatat oleh: {rec.recordedBy}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                <button
                                    onClick={() => setSelectedDayDetail(null)}
                                    className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-colors"
                                >
                                    Tutup
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ========================================================= */}
            {/* SUB-TAB 2: GRAFIK & ANALITIK KOMPARATIF */}
            {/* ========================================================= */}
            {activeSubTab === 'komparasi' && (
                <div className="space-y-6">
                    {/* Top KPI Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs">
                            <span className="text-xs font-bold text-gray-500 uppercase">
                                Rata-rata Kehadiran (Filter Aktif)
                            </span>
                            <p className="text-3xl font-black text-teal-700 mt-2">{overallAttendanceRate}%</p>
                            <p className="text-[11px] text-teal-600 mt-1">
                                Periode {monthNames[calendarMonth]} {calendarYear}
                            </p>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs">
                            <span className="text-xs font-bold text-gray-500 uppercase">Total Log Presensi Terhitung</span>
                            <p className="text-3xl font-black text-gray-900 mt-2">{totalRecordsInScope}</p>
                            <p className="text-[11px] text-gray-500 mt-1">Sesuai cakupan filter yang dipilih</p>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs">
                            <span className="text-xs font-bold text-gray-500 uppercase">Rombel dalam Analitik</span>
                            <p className="text-3xl font-black text-indigo-700 mt-2">{rombelComparativeStats.length}</p>
                            <p className="text-[11px] text-indigo-600 mt-1">Rombel aktif terverifikasi</p>
                        </div>
                    </div>

                    {/* Charts Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* Bar Chart: Rombel Attendance Rate (8 cols) */}
                        <div className="lg:col-span-8 bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                                    <i className="bi bi-bar-chart-fill text-teal-600"></i>
                                    <span>Tingkat Kehadiran Per Rombel (%) - {monthNames[calendarMonth]} {calendarYear}</span>
                                </h3>
                            </div>
                            <div className="h-72 w-full">
                                {rombelComparativeStats.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={rombelComparativeStats} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                            <XAxis dataKey="rombelName" tick={{ fontSize: 11 }} angle={-25} textAnchor="end" />
                                            <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                                            <Tooltip formatter={(val: any) => [`${val}%`, 'Tingkat Kehadiran']} />
                                            <Bar dataKey="attendanceRate" fill="#0D9488" radius={[6, 6, 0, 0]} name="Kehadiran (%)" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-xs text-gray-400">
                                        Tidak ada data rombel untuk ditampilkan pada filter ini.
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Pie Chart: Overall Status Distribution (4 cols) */}
                        <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs space-y-4">
                            <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                                <i className="bi bi-pie-chart-fill text-indigo-600"></i>
                                <span>Distribusi Status Kehadiran</span>
                            </h3>
                            <div className="h-56 w-full flex items-center justify-center">
                                {totalRecordsInScope > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={overallAbsencePie}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={50}
                                                outerRadius={80}
                                                paddingAngle={4}
                                                dataKey="value"
                                            >
                                                {overallAbsencePie.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <p className="text-xs text-gray-400">Belum ada catatan presensi pada periode ini.</p>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                {overallAbsencePie.map(p => (
                                    <div key={p.name} className="flex items-center gap-1.5">
                                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: p.color }}></span>
                                        <span className="text-gray-600 font-semibold">{p.name}:</span>
                                        <span className="font-bold text-gray-900">{p.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Table Leaderboard Rombel */}
                    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-2xs">
                        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-wrap items-center justify-between gap-2">
                            <h3 className="font-bold text-gray-800 text-sm">
                                Rekapitulasi Komparasi Antar Rombel ({rombelComparativeStats.length} Rombel)
                            </h3>
                            <span className="text-xs text-gray-500 font-medium">
                                Periode: {monthNames[calendarMonth]} {calendarYear}
                            </span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 text-gray-600 font-bold border-b border-gray-200">
                                        <th className="p-3">Jenjang / Kelas</th>
                                        <th className="p-3">Rombel</th>
                                        <th className="p-3 text-center">Jumlah Santri</th>
                                        <th className="p-3 text-center">Hadir (H)</th>
                                        <th className="p-3 text-center">Sakit (S)</th>
                                        <th className="p-3 text-center">Izin (I)</th>
                                        <th className="p-3 text-center">Alpha (A)</th>
                                        <th className="p-3 text-center">% Kehadiran</th>
                                        <th className="p-3">Status Disiplin</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {rombelComparativeStats.length > 0 ? (
                                        [...rombelComparativeStats]
                                            .sort((a, b) => b.attendanceRate - a.attendanceRate)
                                            .map(r => (
                                                <tr key={r.rombelId} className="hover:bg-gray-50 transition-colors">
                                                    <td className="p-3 font-semibold text-gray-600">{r.jenjangName} • {r.kelasName}</td>
                                                    <td className="p-3 font-bold text-gray-900">{r.rombelName}</td>
                                                    <td className="p-3 text-center font-semibold">{r.totalStudents} Santri</td>
                                                    <td className="p-3 text-center font-bold text-green-700">{r.hadir}</td>
                                                    <td className="p-3 text-center font-bold text-yellow-700">{r.sakit}</td>
                                                    <td className="p-3 text-center font-bold text-blue-700">{r.izin}</td>
                                                    <td className="p-3 text-center font-bold text-red-700">{r.alpha}</td>
                                                    <td className="p-3 text-center font-black text-teal-800">{r.attendanceRate}%</td>
                                                    <td className="p-3">
                                                        {r.attendanceRate >= 90 ? (
                                                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-200">
                                                                Sangat Baik
                                                            </span>
                                                        ) : r.attendanceRate >= 80 ? (
                                                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                                                Baik
                                                            </span>
                                                        ) : (
                                                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                                                Perlu Perhatian
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                    ) : (
                                        <tr>
                                            <td colSpan={9} className="p-8 text-center text-gray-400 italic">
                                                Tidak ada data rombel yang memenuhi kriteria filter.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
