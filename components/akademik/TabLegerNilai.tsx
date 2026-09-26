import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAppContext } from '../../AppContext';
import { useSantriContext } from '../../contexts/SantriContext';
import { db } from '../../db';
import { RaporTemplate, RaporRecord } from '../../types';
import { useAcademicPeriodFilter } from '../../hooks/useAcademicPeriodFilter';
import {
    buildRombelLegerData,
    exportLegerToExcel,
    StudentLegerRow
} from '../../services/raporCalculationService';
import { MobileFilterDrawer } from '../common/MobileFilterDrawer';
import { PrintHeader } from '../common/PrintHeader';
import { formatDate } from '../../utils/formatters';

interface TabLegerNilaiProps {
    onNavigateToInputWali?: (rombelId?: number) => void;
}

export const TabLegerNilai: React.FC<TabLegerNilaiProps> = ({ onNavigateToInputWali }) => {
    const { settings, currentUser, showToast } = useAppContext();
    const { santriList } = useSantriContext();

    const isWaliKelas = currentUser?.role === 'wali_kelas';
    const assignedRombel = useMemo(() => {
        if (!isWaliKelas) return null;
        return settings.rombel.find(r => r.waliKelasUserId === currentUser?.id || r.waliKelasId === currentUser?.id);
    }, [isWaliKelas, currentUser, settings.rombel]);

    const {
        filterTahun,
        setFilterTahun,
        filterSemester,
        setFilterSemester,
        availableYears,
        defaultAcademicYear
    } = useAcademicPeriodFilter(settings);

    // Filter selectors
    const [selectedJenjangId, setSelectedJenjangId] = useState<string>('');
    const [selectedKelasId, setSelectedKelasId] = useState<string>('');
    const [selectedRombelId, setSelectedRombelId] = useState<string>(assignedRombel ? String(assignedRombel.id) : '');

    // Data state
    const [template, setTemplate] = useState<RaporTemplate | null>(null);
    const [records, setRecords] = useState<RaporRecord[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isExporting, setIsExporting] = useState<boolean>(false);
    const [activeLegerSheetId, setActiveLegerSheetId] = useState<string>('all');

    // Reset active sheet filter when rombel or template changes
    useEffect(() => {
        setActiveLegerSheetId('all');
    }, [selectedRombelId, template?.id]);

    // View & Display Toggles
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'complete' | 'incomplete' | 'empty'>('all');
    const [sortBy, setSortBy] = useState<'rank' | 'name' | 'nis'>('rank');
    const [showRanking, setShowRanking] = useState<boolean>(true);
    const [showPredikat, setShowPredikat] = useState<boolean>(true);
    const [showPresensi, setShowPresensi] = useState<boolean>(true);

    // Modals
    const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
    const [inspectStudent, setInspectStudent] = useState<StudentLegerRow | null>(null);
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

    const printAreaRef = useRef<HTMLDivElement>(null);

    // Filtered Kelas & Rombel options
    const filteredKelasList = useMemo(() => {
        if (!selectedJenjangId) return settings.kelas;
        return settings.kelas.filter(k => k.jenjangId === parseInt(selectedJenjangId));
    }, [settings.kelas, selectedJenjangId]);

    const filteredRombelList = useMemo(() => {
        let list = settings.rombel;
        if (selectedKelasId) {
            list = list.filter(r => r.kelasId === parseInt(selectedKelasId));
        } else if (selectedJenjangId) {
            const allowedKelasIds = new Set(filteredKelasList.map(k => k.id));
            list = list.filter(r => allowedKelasIds.has(r.kelasId));
        }
        return list;
    }, [settings.rombel, selectedKelasId, selectedJenjangId, filteredKelasList]);

    // Auto-select initial rombel if not set
    useEffect(() => {
        if (assignedRombel) {
            setSelectedRombelId(String(assignedRombel.id));
        } else if (!selectedRombelId && settings.rombel.length > 0) {
            setSelectedRombelId(String(settings.rombel[0].id));
        }
    }, [assignedRombel, selectedRombelId, settings.rombel]);

    // Sync Jenjang & Kelas when Rombel changes
    useEffect(() => {
        if (selectedRombelId) {
            const rombel = settings.rombel.find(r => r.id === parseInt(selectedRombelId));
            if (rombel) {
                setSelectedKelasId(String(rombel.kelasId));
                const kelas = settings.kelas.find(k => k.id === rombel.kelasId);
                if (kelas) {
                    setSelectedJenjangId(String(kelas.jenjangId));
                }
            }
        }
    }, [selectedRombelId, settings.rombel, settings.kelas]);

    // Current selected Rombel object & details
    const currentRombel = useMemo(() => {
        return settings.rombel.find(r => r.id === parseInt(selectedRombelId)) || null;
    }, [settings.rombel, selectedRombelId]);

    const currentWaliName = useMemo(() => {
        if (!currentRombel) return '-';
        const wali = settings.tenagaPengajar.find(t => t.id === currentRombel.waliKelasUserId || t.id === currentRombel.waliKelasId);
        return wali?.nama || 'Belum Ditentukan';
    }, [currentRombel, settings.tenagaPengajar]);

    // Load active students in selected rombel
    const rombelStudents = useMemo(() => {
        if (!selectedRombelId) return [];
        const rId = parseInt(selectedRombelId);
        return santriList
            .filter(s => s.rombelId === rId && s.status === 'Aktif')
            .sort((a, b) => a.namaLengkap.localeCompare(b.namaLengkap));
    }, [selectedRombelId, santriList]);

    // Fetch Template & Records for this Rombel & Period
    useEffect(() => {
        const fetchData = async () => {
            if (!selectedRombelId) return;
            setIsLoading(true);

            try {
                const rId = parseInt(selectedRombelId);
                const rombel = settings.rombel.find(r => r.id === rId);
                const kelas = settings.kelas.find(k => k.id === rombel?.kelasId);

                // 1. Fetch matching template
                let matchedTemplate: RaporTemplate | null = null;
                const templates = (settings.raporTemplates || []) as RaporTemplate[];

                if (kelas?.jenjangId) {
                    matchedTemplate = templates.find((t: RaporTemplate) => t.jenjangId === kelas.jenjangId) || null;
                }
                if (!matchedTemplate && templates.length > 0) {
                    matchedTemplate = templates[0];
                }
                setTemplate(matchedTemplate);

                // 2. Fetch records
                const currentYear = filterTahun || defaultAcademicYear;
                const recs = await db.raporRecords
                    .where('[tahunAjaran+semester]')
                    .equals([currentYear, filterSemester])
                    .toArray();

                const filtered = recs.filter(r => r.rombelId === rId);
                setRecords(filtered);
            } catch (err) {
                console.error('Error fetching leger data:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [selectedRombelId, filterTahun, filterSemester, settings, defaultAcademicYear]);

    // Build consolidated Leger Data with full calculations
    const legerData = useMemo(() => {
        return buildRombelLegerData({
            template,
            santriList: rombelStudents,
            records,
            targetSheetId: activeLegerSheetId
        });
    }, [template, rombelStudents, records, activeLegerSheetId]);

    // Filter & Sort Students for UI display
    const displayedStudents = useMemo(() => {
        let list = [...legerData.students];

        // Search query
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            list = list.filter(s =>
                s.santri.namaLengkap.toLowerCase().includes(q) ||
                s.santri.nis?.toLowerCase().includes(q) ||
                s.santri.nisn?.toLowerCase().includes(q)
            );
        }

        // Status filter
        if (statusFilter === 'complete') {
            list = list.filter(s => s.completenessStatus === 'Lengkap');
        } else if (statusFilter === 'incomplete') {
            list = list.filter(s => s.completenessStatus === 'Sebagian');
        } else if (statusFilter === 'empty') {
            list = list.filter(s => s.completenessStatus === 'Kosong');
        }

        // Sorting
        if (sortBy === 'rank') {
            list.sort((a, b) => {
                if (a.ranking === 0 && b.ranking === 0) return a.santri.namaLengkap.localeCompare(b.santri.namaLengkap);
                if (a.ranking === 0) return 1;
                if (b.ranking === 0) return -1;
                return a.ranking - b.ranking;
            });
        } else if (sortBy === 'name') {
            list.sort((a, b) => a.santri.namaLengkap.localeCompare(b.santri.namaLengkap));
        } else if (sortBy === 'nis') {
            list.sort((a, b) => (a.santri.nis || '').localeCompare(b.santri.nis || ''));
        }

        return list;
    }, [legerData.students, searchQuery, statusFilter, sortBy]);

    // Export to Excel
    const handleExportExcel = async () => {
        if (!currentRombel) return;
        setIsExporting(true);
        try {
            const filename = await exportLegerToExcel({
                rombelData: legerData,
                rombelName: currentRombel.nama,
                tahunAjaran: filterTahun || defaultAcademicYear,
                semester: filterSemester,
                settings,
                waliName: currentWaliName
            });
            showToast(`Leger Nilai berhasil diekspor: ${filename}`, 'success');
        } catch (err) {
            console.error('Export leger error:', err);
            showToast('Gagal mengekspor leger ke Excel', 'error');
        } finally {
            setIsExporting(false);
        }
    };

    // Print Leger
    const handleTriggerPrint = () => {
        window.print();
    };

    return (
        <div className="space-y-6">
            {/* Top Period & Rombel Filter Panel */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                {/* Mobile Filter Button */}
                <div className="md:hidden mb-3">
                    <button
                        onClick={() => setIsFilterDrawerOpen(true)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl font-bold text-sm"
                    >
                        <i className="bi bi-funnel-fill"></i>
                        <span>Filter Rombel & Periode</span>
                    </button>
                </div>

                <div className="hidden md:grid md:grid-cols-5 gap-4 items-end">
                    <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider">
                            Tahun Ajaran
                        </label>
                        <select
                            value={filterTahun}
                            onChange={e => setFilterTahun(e.target.value)}
                            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 transition-all"
                        >
                            {availableYears.map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider">
                            Semester
                        </label>
                        <select
                            value={filterSemester}
                            onChange={e => setFilterSemester(e.target.value as any)}
                            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 transition-all"
                        >
                            <option value="Ganjil">Ganjil (Semester 1)</option>
                            <option value="Genap">Genap (Semester 2)</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider">
                            Jenjang
                        </label>
                        <select
                            value={selectedJenjangId}
                            onChange={e => {
                                setSelectedJenjangId(e.target.value);
                                setSelectedKelasId('');
                            }}
                            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 transition-all"
                        >
                            <option value="">Semua Jenjang</option>
                            {settings.jenjang.map(j => (
                                <option key={j.id} value={j.id}>{j.nama}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider">
                            Tingkat Kelas
                        </label>
                        <select
                            value={selectedKelasId}
                            onChange={e => setSelectedKelasId(e.target.value)}
                            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 transition-all"
                        >
                            <option value="">Semua Kelas</option>
                            {filteredKelasList.map(k => (
                                <option key={k.id} value={k.id}>{k.nama}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold text-emerald-700 uppercase mb-1.5 tracking-wider">
                            Rombongan Belajar
                        </label>
                        <select
                            value={selectedRombelId}
                            onChange={e => setSelectedRombelId(e.target.value)}
                            className="w-full border-2 border-emerald-200 rounded-xl px-3 py-2.5 text-sm font-bold bg-emerald-50 text-emerald-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 transition-all"
                        >
                            {filteredRombelList.map(r => (
                                <option key={r.id} value={r.id}>{r.nama}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Wali Kelas Context Notice */}
                {currentRombel && (
                    <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2 text-slate-600">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg font-bold">
                                <i className="bi bi-people-fill"></i>
                                {currentRombel.nama}
                            </span>
                            <span>•</span>
                            <span>Wali Kelas: <strong className="text-slate-800">{currentWaliName}</strong></span>
                            <span>•</span>
                            <span>Template Rapor: <strong className="text-slate-800">{template ? template.name : 'Standar'}</strong></span>
                        </div>
                        {onNavigateToInputWali && (
                            <button
                                onClick={() => onNavigateToInputWali(currentRombel.id)}
                                className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-900 font-bold hover:underline"
                            >
                                <span>Input / Koreksi Nilai Rombel Ini</span>
                                <i className="bi bi-arrow-right"></i>
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex items-center justify-between">
                    <div>
                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Santri</div>
                        <div className="text-2xl font-black text-slate-900 mt-1">{legerData.totalStudents}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{rombelStudents.length} santri aktif</div>
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl">
                        <i className="bi bi-mortarboard-fill"></i>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex items-center justify-between">
                    <div>
                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Rata-Rata Kelas</div>
                        <div className="text-2xl font-black text-emerald-700 mt-1">
                            {legerData.classAverage > 0 ? legerData.classAverage.toFixed(2) : '-'}
                        </div>
                        <div className="text-xs font-semibold text-emerald-600 mt-0.5">
                            {legerData.classAverage >= 80 ? 'Predikat Jayyid Jiddan (B)' : legerData.classAverage > 0 ? 'Predikat Jayyid (C)' : 'Belum Terhitung'}
                        </div>
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl">
                        <i className="bi bi-graph-up-arrow"></i>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex items-center justify-between">
                    <div>
                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tertinggi / Terendah</div>
                        <div className="text-lg font-black text-slate-800 mt-1">
                            <span className="text-emerald-600">{legerData.classHighest || '-'}</span>
                            <span className="text-slate-300 mx-1.5">/</span>
                            <span className="text-rose-500">{legerData.classLowest || '-'}</span>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">Rentang total nilai</div>
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-xl">
                        <i className="bi bi-trophy-fill"></i>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex items-center justify-between">
                    <div>
                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Kesiapan Rapor</div>
                        <div className="text-2xl font-black text-slate-900 mt-1">
                            {legerData.overallCompletionRate}%
                        </div>
                        <div className="text-xs font-semibold text-emerald-600 mt-0.5">
                            {legerData.completeCount} dari {legerData.totalStudents} siap cetak
                        </div>
                    </div>
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl ${
                        legerData.overallCompletionRate === 100 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                    }`}>
                        <i className={legerData.overallCompletionRate === 100 ? 'bi bi-check-circle-fill' : 'bi bi-clock-history'}></i>
                    </div>
                </div>
            </div>

            {/* Action Bar & Filtering Controls */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left: Search & Filter Dropdown */}
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative min-w-[220px]">
                            <i className="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                            <input
                                type="text"
                                placeholder="Cari santri atau NIS..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 text-xs font-medium border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 transition-all"
                            />
                        </div>

                        <select
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value as any)}
                            className="text-xs font-semibold border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white transition-all"
                        >
                            <option value="all">Semua Status ({legerData.totalStudents})</option>
                            <option value="complete">Siap Cetak ({legerData.completeCount})</option>
                            <option value="incomplete">Belum Lengkap ({legerData.incompleteCount})</option>
                            <option value="empty">Belum Ada Nilai ({legerData.emptyCount})</option>
                        </select>

                        <select
                            value={sortBy}
                            onChange={e => setSortBy(e.target.value as any)}
                            className="text-xs font-semibold border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white transition-all"
                        >
                            <option value="rank">Urutkan: Ranking / Nilai</option>
                            <option value="name">Urutkan: Nama (A - Z)</option>
                            <option value="nis">Urutkan: NIS</option>
                        </select>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            onClick={() => setIsPrintModalOpen(true)}
                            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
                        >
                            <i className="bi bi-printer"></i>
                            <span>Cetak Leger</span>
                        </button>

                        <button
                            onClick={handleExportExcel}
                            disabled={isExporting || legerData.totalStudents === 0}
                            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-98 rounded-xl shadow-xs transition-all disabled:opacity-50"
                        >
                            {isExporting ? (
                                <>
                                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    <span>Mengekspor...</span>
                                </>
                            ) : (
                                <>
                                    <i className="bi bi-file-earmark-excel-fill"></i>
                                    <span>Export Excel (.xlsx)</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Display Toggles */}
                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-4 text-xs font-medium text-slate-600">
                    <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Tampilkan Kolom:</span>
                    
                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={showRanking}
                            onChange={e => setShowRanking(e.target.checked)}
                            className="rounded text-emerald-600 focus:ring-emerald-500"
                        />
                        <span>Peringkat (Ranking)</span>
                    </label>

                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={showPredikat}
                            onChange={e => setShowPredikat(e.target.checked)}
                            className="rounded text-emerald-600 focus:ring-emerald-500"
                        />
                        <span>Predikat Nilai</span>
                    </label>

                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={showPresensi}
                            onChange={e => setShowPresensi(e.target.checked)}
                            className="rounded text-emerald-600 focus:ring-emerald-500"
                        />
                        <span>Presensi & Kehadiran (S/I/A)</span>
                    </label>
                </div>
            </div>

            {/* Main Interactive Leger Matrix Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                {/* Multi-Sheet Worksheet Tab Navigation for Leger */}
                {legerData.availableSheets && legerData.availableSheets.length > 1 && (
                    <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5 flex items-center gap-2 overflow-x-auto select-none no-scrollbar">
                        <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1.5">
                            <i className="bi bi-collection"></i> Format Rapor:
                        </span>
                        <button
                            type="button"
                            onClick={() => setActiveLegerSheetId('all')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                                activeLegerSheetId === 'all'
                                    ? 'bg-emerald-700 text-white shadow-xs'
                                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                            }`}
                        >
                            <i className="bi bi-layers"></i>
                            <span>Semua Format (Gabungan)</span>
                        </button>
                        {legerData.availableSheets.map((sh) => {
                            const isActive = activeLegerSheetId === sh.id;
                            return (
                                <button
                                    key={sh.id}
                                    type="button"
                                    onClick={() => setActiveLegerSheetId(sh.id)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                                        isActive
                                            ? 'bg-emerald-700 text-white shadow-xs'
                                            : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                                    }`}
                                >
                                    <i className="bi bi-file-earmark-spreadsheet"></i>
                                    <span>{sh.name}</span>
                                </button>
                            );
                        })}
                    </div>
                )}

                {isLoading ? (
                    <div className="p-16 text-center">
                        <div className="w-9 h-9 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                        <div className="mt-3 text-sm font-bold text-slate-700">Menghitung Data Leger Nilai...</div>
                        <div className="text-xs text-slate-400 mt-1">Menyelaraskan nilai, ranking, dan kelengkapan</div>
                    </div>
                ) : displayedStudents.length === 0 ? (
                    <div className="p-16 text-center">
                        <i className="bi bi-inboxes text-4xl text-slate-300"></i>
                        <h4 className="mt-3 text-base font-bold text-slate-700">Tidak Ada Data Santri</h4>
                        <p className="mt-1 text-xs text-slate-400 max-w-sm mx-auto">
                            Belum ada santri aktif dalam rombel ini atau tidak ada santri yang sesuai dengan filter pencarian.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto max-h-[600px] relative">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead className="bg-slate-50 text-slate-700 sticky top-0 z-20 border-b border-slate-200">
                                <tr>
                                    <th className="p-3 w-12 text-center font-bold sticky left-0 bg-slate-50 z-30 border-r border-slate-200">
                                        No
                                    </th>
                                    <th className="p-3 w-28 font-bold sticky left-12 bg-slate-50 z-30 border-r border-slate-200">
                                        NIS
                                    </th>
                                    <th className="p-3 min-w-[200px] font-bold sticky left-40 bg-slate-50 z-30 border-r border-slate-200 shadow-[2px_0_4px_rgba(0,0,0,0.03)]">
                                        Nama Santri
                                    </th>

                                    {/* Subject Columns */}
                                    {legerData.gradeKeys.map(k => (
                                        <th key={k.key} className="p-3 min-w-[90px] text-center font-bold border-r border-slate-200">
                                            {activeLegerSheetId === 'all' && k.sheetName && (
                                                <div className="text-[9px] font-bold text-emerald-700 uppercase tracking-tight bg-emerald-50 px-1.5 py-0.5 rounded inline-block mb-1 border border-emerald-100 truncate max-w-[100px]">
                                                    {k.sheetName}
                                                </div>
                                            )}
                                            <div className="truncate max-w-[120px] mx-auto" title={k.label}>
                                                {k.label}
                                            </div>
                                            {legerData.subjectStats[k.key]?.average > 0 && (
                                                <div className="mt-0.5 text-[9px] font-semibold text-slate-400">
                                                    Avg: {legerData.subjectStats[k.key].average}
                                                </div>
                                            )}
                                        </th>
                                    ))}

                                    {/* Summary Calculations */}
                                    <th className="p-3 min-w-[80px] text-center font-black text-slate-900 bg-slate-100/70 border-r border-slate-200">
                                        Total
                                    </th>
                                    <th className="p-3 min-w-[85px] text-center font-black text-emerald-800 bg-emerald-50/50 border-r border-slate-200">
                                        Rata-Rata
                                    </th>
                                    {showPredikat && (
                                        <th className="p-3 min-w-[100px] text-center font-bold border-r border-slate-200">
                                            Predikat
                                        </th>
                                    )}
                                    {showRanking && (
                                        <th className="p-3 min-w-[80px] text-center font-bold border-r border-slate-200">
                                            Ranking
                                        </th>
                                    )}

                                    {/* Presensi */}
                                    {showPresensi && (
                                        <>
                                            <th className="p-2.5 w-12 text-center font-bold text-amber-700 bg-amber-50/30 border-r border-slate-200">
                                                S
                                            </th>
                                            <th className="p-2.5 w-12 text-center font-bold text-blue-700 bg-blue-50/30 border-r border-slate-200">
                                                I
                                            </th>
                                            <th className="p-2.5 w-12 text-center font-bold text-rose-700 bg-rose-50/30 border-r border-slate-200">
                                                A
                                            </th>
                                            <th className="p-2.5 w-14 text-center font-bold border-r border-slate-200">
                                                Total
                                            </th>
                                        </>
                                    )}

                                    <th className="p-3 min-w-[120px] text-center font-bold">
                                        Status Rapor
                                    </th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100">
                                {displayedStudents.map((row, idx) => (
                                    <tr key={row.santri.id} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="p-3 text-center font-semibold text-slate-500 sticky left-0 bg-white border-r border-slate-100 z-10">
                                            {idx + 1}
                                        </td>
                                        <td className="p-3 font-mono text-slate-600 sticky left-12 bg-white border-r border-slate-100 z-10">
                                            {row.santri.nis || '-'}
                                        </td>
                                        <td className="p-3 font-bold text-slate-900 sticky left-40 bg-white border-r border-slate-100 z-10 shadow-[2px_0_4px_rgba(0,0,0,0.03)]">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="truncate">{row.santri.namaLengkap}</span>
                                                {row.santri.jenisKelamin === 'Laki-laki' ? (
                                                    <span className="text-[10px] text-blue-500 font-normal">L</span>
                                                ) : (
                                                    <span className="text-[10px] text-pink-500 font-normal">P</span>
                                                )}
                                            </div>
                                        </td>

                                        {/* Subject Grades */}
                                        {legerData.gradeKeys.map(k => {
                                            const score = row.numericGrades[k.key];
                                            const raw = row.grades[k.key];
                                            const isFilled = score !== undefined || (raw !== undefined && raw !== '');
                                            const isLow = score !== undefined && score < 70;

                                            return (
                                                <td key={k.key} className="p-3 text-center border-r border-slate-100">
                                                    {isFilled ? (
                                                        <span className={`font-semibold ${isLow ? 'text-rose-600 font-bold bg-rose-50 px-1.5 py-0.5 rounded' : 'text-slate-800'}`}>
                                                            {score ?? raw}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-300 font-mono">-</span>
                                                    )}
                                                </td>
                                            );
                                        })}

                                        {/* Total Score */}
                                        <td className="p-3 text-center font-black text-slate-900 bg-slate-50/50 border-r border-slate-100">
                                            {row.totalNilai > 0 ? row.totalNilai : '-'}
                                        </td>

                                        {/* Rata-Rata */}
                                        <td className="p-3 text-center font-black text-emerald-700 bg-emerald-50/30 border-r border-slate-100">
                                            {row.rataRata > 0 ? (
                                                <span className="inline-block px-1.5 py-0.5 bg-emerald-100/70 rounded">
                                                    {row.rataRataFormatted}
                                                </span>
                                            ) : '-'}
                                        </td>

                                        {/* Predikat */}
                                        {showPredikat && (
                                            <td className="p-3 text-center border-r border-slate-100">
                                                {row.rataRata > 0 ? (
                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                                        row.predikat.predikatHuruf === 'A' ? 'bg-emerald-100 text-emerald-800' :
                                                        row.predikat.predikatHuruf === 'B' ? 'bg-teal-100 text-teal-800' :
                                                        row.predikat.predikatHuruf === 'C' ? 'bg-amber-100 text-amber-800' :
                                                        'bg-rose-100 text-rose-800'
                                                    }`}>
                                                        <span>{row.predikat.predikat}</span>
                                                        <span className="opacity-70 font-mono">({row.predikat.predikatHuruf})</span>
                                                    </span>
                                                ) : '-'}
                                            </td>
                                        )}

                                        {/* Ranking */}
                                        {showRanking && (
                                            <td className="p-3 text-center font-bold border-r border-slate-100">
                                                {row.ranking > 0 ? (
                                                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-black ${
                                                        row.ranking === 1 ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                                                        row.ranking === 2 ? 'bg-slate-200 text-slate-800 border border-slate-300' :
                                                        row.ranking === 3 ? 'bg-orange-100 text-orange-800 border border-orange-300' :
                                                        'text-slate-600'
                                                    }`}>
                                                        {row.ranking === 1 ? '🥇' : row.ranking === 2 ? '🥈' : row.ranking === 3 ? '🥉' : row.ranking}
                                                    </span>
                                                ) : '-'}
                                            </td>
                                        )}

                                        {/* Presensi */}
                                        {showPresensi && (
                                            <>
                                                <td className="p-2.5 text-center text-slate-700 border-r border-slate-100">
                                                    {row.sakit}
                                                </td>
                                                <td className="p-2.5 text-center text-slate-700 border-r border-slate-100">
                                                    {row.izin}
                                                </td>
                                                <td className="p-2.5 text-center text-slate-700 border-r border-slate-100">
                                                    {row.alpha > 0 ? (
                                                        <span className="font-bold text-rose-600">{row.alpha}</span>
                                                    ) : row.alpha}
                                                </td>
                                                <td className="p-2.5 text-center font-bold text-slate-800 border-r border-slate-100">
                                                    {row.totalAbsen}
                                                </td>
                                            </>
                                        )}

                                        {/* Completeness Badge */}
                                        <td className="p-3 text-center">
                                            {row.completenessStatus === 'Lengkap' ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                    <i className="bi bi-check-circle-fill"></i>
                                                    <span>Siap Cetak</span>
                                                </span>
                                            ) : row.completenessStatus === 'Sebagian' ? (
                                                <button
                                                    onClick={() => setInspectStudent(row)}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors"
                                                >
                                                    <i className="bi bi-exclamation-triangle-fill"></i>
                                                    <span>{row.missingKeys.length} Kurang</span>
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => setInspectStudent(row)}
                                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
                                                >
                                                    <span>Kosong</span>
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>

                            {/* Statistical Footer Summary */}
                            <tfoot className="bg-slate-100 text-slate-800 font-bold border-t-2 border-slate-300">
                                <tr>
                                    <td colSpan={3} className="p-3 text-right uppercase tracking-wider text-[11px] sticky left-0 bg-slate-100 z-10 border-r border-slate-200">
                                        Rata-Rata Kelas
                                    </td>
                                    {legerData.gradeKeys.map(k => (
                                        <td key={k.key} className="p-3 text-center border-r border-slate-200">
                                            {legerData.subjectStats[k.key]?.average > 0
                                                ? legerData.subjectStats[k.key].average
                                                : '-'}
                                        </td>
                                    ))}
                                    <td className="p-3 text-center border-r border-slate-200 text-slate-500">-</td>
                                    <td className="p-3 text-center text-emerald-800 font-black border-r border-slate-200">
                                        {legerData.classAverage > 0 ? legerData.classAverage.toFixed(2) : '-'}
                                    </td>
                                    {showPredikat && <td className="p-3 text-center border-r border-slate-200">-</td>}
                                    {showRanking && <td className="p-3 text-center border-r border-slate-200">-</td>}
                                    {showPresensi && <td colSpan={4} className="p-3 text-center border-r border-slate-200">-</td>}
                                    <td className="p-3 text-center text-[10px] text-slate-500">
                                        {legerData.overallCompletionRate}% Lengkap
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
            </div>

            {/* Inspect Student Missing Fields Modal */}
            {inspectStudent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                            <div>
                                <h3 className="text-base font-bold text-slate-900">{inspectStudent.santri.namaLengkap}</h3>
                                <p className="text-xs text-slate-500">NIS: {inspectStudent.santri.nis || '-'}</p>
                            </div>
                            <button
                                onClick={() => setInspectStudent(null)}
                                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center"
                            >
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>

                        <div className="my-4 space-y-3">
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-500">Status Kelengkapan:</span>
                                <span className={`font-bold ${
                                    inspectStudent.completenessStatus === 'Lengkap' ? 'text-emerald-600' :
                                    inspectStudent.completenessStatus === 'Sebagian' ? 'text-amber-600' : 'text-slate-500'
                                }`}>
                                    {inspectStudent.filledCount} dari {inspectStudent.totalKeys} field terisi ({inspectStudent.percentComplete}%)
                                </span>
                            </div>

                            {inspectStudent.missingKeys.length > 0 ? (
                                <div>
                                    <label className="block text-[11px] font-bold text-rose-600 uppercase mb-2 tracking-wider">
                                        Kolom yang Masih Kosong ({inspectStudent.missingKeys.length}):
                                    </label>
                                    <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                                        {inspectStudent.missingKeys.map((k, idx) => (
                                            <div key={idx} className="flex items-center gap-2 p-2 bg-rose-50/60 text-rose-800 rounded-lg text-xs font-medium border border-rose-100">
                                                <i className="bi bi-x-circle-fill text-rose-500"></i>
                                                <span>{k}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-semibold text-center">
                                    <i className="bi bi-check-circle-fill mr-1.5"></i>
                                    Semua nilai dan catatan sudah terisi lengkap.
                                </div>
                            )}
                        </div>

                        <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                            <button
                                onClick={() => setInspectStudent(null)}
                                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                            >
                                Tutup
                            </button>
                            {onNavigateToInputWali && currentRombel && (
                                <button
                                    onClick={() => {
                                        setInspectStudent(null);
                                        onNavigateToInputWali(currentRombel.id);
                                    }}
                                    className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs"
                                >
                                    Input Nilai Sekarang
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Print Modal / Landscape Preview */}
            {isPrintModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
                    <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200">
                        {/* Header */}
                        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <i className="bi bi-printer text-emerald-600 text-lg"></i>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900">Cetak Leger Nilai Hasil Belajar</h3>
                                    <p className="text-xs text-slate-500">
                                        {currentRombel?.nama} • {filterTahun || defaultAcademicYear} • Semester {filterSemester}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleTriggerPrint}
                                    className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 shadow-xs flex items-center gap-1.5"
                                >
                                    <i className="bi bi-printer-fill"></i>
                                    <span>Print Sekarang</span>
                                </button>
                                <button
                                    onClick={() => setIsPrintModalOpen(false)}
                                    className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center"
                                >
                                    <i className="bi bi-x-lg"></i>
                                </button>
                            </div>
                        </div>

                        {/* Printable Content Scroll Area */}
                        <div className="p-6 overflow-y-auto flex-1 bg-slate-100">
                            <div
                                ref={printAreaRef}
                                className="bg-white p-8 shadow-sm rounded-lg mx-auto text-black font-sans text-xs print-landscape max-w-[1100px]"
                            >
                                {(() => {
                                    const activeSheetObj = legerData.availableSheets?.find(s => s.id === legerData.activeSheetId);
                                    return (
                                        <>
                                            <PrintHeader
                                                settings={settings}
                                                title={`LEGER NILAI HASIL BELAJAR SANTRI${activeSheetObj ? ` - ${activeSheetObj.name.toUpperCase()}` : ''}`}
                                            />

                                            <div className="grid grid-cols-2 gap-4 my-4 pb-2 border-b border-slate-300 text-xs font-medium">
                                                <div>
                                                    <p>Rombongan Belajar : <strong>{currentRombel?.nama}</strong></p>
                                                    <p>Wali Kelas : <strong>{currentWaliName}</strong></p>
                                                    {activeSheetObj && (
                                                        <p>Format / Lembar : <strong>{activeSheetObj.name}</strong></p>
                                                    )}
                                                </div>
                                                <div className="text-right">
                                                    <p>Tahun Ajaran : <strong>{filterTahun || defaultAcademicYear}</strong></p>
                                                    <p>Semester : <strong>{filterSemester}</strong></p>
                                                </div>
                                            </div>
                                        </>
                                    );
                                })()}

                                <table className="w-full border-collapse border border-black text-[10px]">
                                    <thead>
                                        <tr className="bg-gray-100 text-black">
                                            <th className="border border-black p-1.5 w-7 text-center">No</th>
                                            <th className="border border-black p-1.5 w-16 text-center">NIS</th>
                                            <th className="border border-black p-1.5 text-left min-w-[140px]">Nama Santri</th>
                                            {legerData.gradeKeys.map(k => (
                                                <th key={k.key} className="border border-black p-1 text-center font-semibold">
                                                    {k.label}
                                                </th>
                                            ))}
                                            <th className="border border-black p-1 text-center font-bold">Total</th>
                                            <th className="border border-black p-1 text-center font-bold">Rata</th>
                                            <th className="border border-black p-1 text-center font-bold">Pred</th>
                                            <th className="border border-black p-1 text-center font-bold">Rank</th>
                                            <th className="border border-black p-1 w-6 text-center">S</th>
                                            <th className="border border-black p-1 w-6 text-center">I</th>
                                            <th className="border border-black p-1 w-6 text-center">A</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {legerData.students.map((row, idx) => (
                                            <tr key={row.santri.id}>
                                                <td className="border border-black p-1 text-center">{idx + 1}</td>
                                                <td className="border border-black p-1 text-center font-mono">{row.santri.nis || '-'}</td>
                                                <td className="border border-black p-1 font-semibold">{row.santri.namaLengkap}</td>
                                                {legerData.gradeKeys.map(k => (
                                                    <td key={k.key} className="border border-black p-1 text-center">
                                                        {row.numericGrades[k.key] ?? (row.grades[k.key] || '-')}
                                                    </td>
                                                ))}
                                                <td className="border border-black p-1 text-center font-bold">{row.totalNilai || '-'}</td>
                                                <td className="border border-black p-1 text-center font-bold">{row.rataRataFormatted}</td>
                                                <td className="border border-black p-1 text-center">{row.rataRata > 0 ? row.predikat.predikatHuruf : '-'}</td>
                                                <td className="border border-black p-1 text-center font-bold">{row.ranking || '-'}</td>
                                                <td className="border border-black p-1 text-center">{row.sakit}</td>
                                                <td className="border border-black p-1 text-center">{row.izin}</td>
                                                <td className="border border-black p-1 text-center">{row.alpha}</td>
                                            </tr>
                                        ))}
                                        <tr className="bg-gray-100 font-bold">
                                            <td colSpan={3} className="border border-black p-1.5 text-right uppercase">Rata-Rata Kelas</td>
                                            {legerData.gradeKeys.map(k => (
                                                <td key={k.key} className="border border-black p-1 text-center">
                                                    {legerData.subjectStats[k.key]?.average || '-'}
                                                </td>
                                            ))}
                                            <td className="border border-black p-1 text-center">-</td>
                                            <td className="border border-black p-1 text-center font-black">{legerData.classAverage > 0 ? legerData.classAverage.toFixed(2) : '-'}</td>
                                            <td colSpan={5} className="border border-black p-1 text-center">-</td>
                                        </tr>
                                    </tbody>
                                </table>

                                {/* Signatures */}
                                <div className="grid grid-cols-2 gap-8 mt-8 text-xs font-medium">
                                    <div className="text-center">
                                        <p>Mengetahui,</p>
                                        <p className="font-bold">Kepala Madrasah / Mudir</p>
                                        <div className="h-16"></div>
                                        <p className="font-bold underline">({settings?.namaMudir || '..................................'})</p>
                                    </div>
                                    <div className="text-center">
                                        <p>{settings?.tempatRaporDefault || 'Pesantren'}, {formatDate(new Date())}</p>
                                        <p className="font-bold">Wali Kelas {currentRombel?.nama}</p>
                                        <div className="h-16"></div>
                                        <p className="font-bold underline">({currentWaliName})</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Mobile Filter Drawer */}
            <MobileFilterDrawer
                isOpen={isFilterDrawerOpen}
                onClose={() => setIsFilterDrawerOpen(false)}
                title="Filter Rombel & Periode"
                onReset={() => {
                    setSelectedJenjangId('');
                    setSelectedKelasId('');
                }}
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tahun Ajaran</label>
                        <select
                            value={filterTahun}
                            onChange={e => setFilterTahun(e.target.value)}
                            className="w-full border border-slate-200 rounded-xl p-2.5 text-sm font-semibold"
                        >
                            {availableYears.map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Semester</label>
                        <select
                            value={filterSemester}
                            onChange={e => setFilterSemester(e.target.value as any)}
                            className="w-full border border-slate-200 rounded-xl p-2.5 text-sm font-semibold"
                        >
                            <option value="Ganjil">Ganjil</option>
                            <option value="Genap">Genap</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Jenjang</label>
                        <select
                            value={selectedJenjangId}
                            onChange={e => {
                                setSelectedJenjangId(e.target.value);
                                setSelectedKelasId('');
                            }}
                            className="w-full border border-slate-200 rounded-xl p-2.5 text-sm font-semibold"
                        >
                            <option value="">Semua Jenjang</option>
                            {settings.jenjang.map(j => (
                                <option key={j.id} value={j.id}>{j.nama}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Kelas</label>
                        <select
                            value={selectedKelasId}
                            onChange={e => setSelectedKelasId(e.target.value)}
                            className="w-full border border-slate-200 rounded-xl p-2.5 text-sm font-semibold"
                        >
                            <option value="">Semua Kelas</option>
                            {filteredKelasList.map(k => (
                                <option key={k.id} value={k.id}>{k.nama}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-emerald-700 uppercase mb-1">Rombel</label>
                        <select
                            value={selectedRombelId}
                            onChange={e => setSelectedRombelId(e.target.value)}
                            className="w-full border-2 border-emerald-300 rounded-xl p-2.5 text-sm font-bold bg-emerald-50 text-emerald-900"
                        >
                            {filteredRombelList.map(r => (
                                <option key={r.id} value={r.id}>{r.nama}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </MobileFilterDrawer>
        </div>
    );
};
