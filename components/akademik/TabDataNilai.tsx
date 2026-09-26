import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../../AppContext';
import { useSantriContext } from '../../contexts/SantriContext';
import { RaporRecord, RaporTemplate } from '../../types';
import { db } from '../../db';
import { MobileFilterDrawer } from '../common/MobileFilterDrawer';
import { useAcademicPeriodFilter } from '../../hooks/useAcademicPeriodFilter';
import { formatAcademicYearDisplay } from '../../utils/academicYear';
import { getTemplateSheets, extractTemplateKeys } from '../../services/raporExcelService';

export const TabDataNilai: React.FC = () => {
    const { settings, showConfirmation, showToast, currentUser } = useAppContext();
    const { santriList } = useSantriContext();
    const canWrite = currentUser?.role === 'admin' || currentUser?.permissions?.akademik === 'write';
    const {
        filterTahun,
        setFilterTahun,
        filterSemester,
        setFilterSemester,
        availableYears,
        defaultAcademicYear
    } = useAcademicPeriodFilter(settings);

    const [filterJenjang, setFilterJenjang] = useState<string>('');
    const [targetMode, setTargetMode] = useState<'single' | 'range'>('single');
    const [filterKelas, setFilterKelas] = useState<string>('');
    const [rangeFromKelasId, setRangeFromKelasId] = useState<number>(0);
    const [rangeToKelasId, setRangeToKelasId] = useState<number>(0);
    const [filterRombel, setFilterRombel] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'complete' | 'partial' | 'empty'>('all');
    const [sortBy, setSortBy] = useState<'name_asc' | 'name_desc' | 'nis' | 'completion_desc' | 'completion_asc' | 'date_desc'>('name_asc');
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
    const [selectedSheetId, setSelectedSheetId] = useState<string>('all');
    const [archiveRecords, setArchiveRecords] = useState<RaporRecord[]>([]);
    const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
    
    // Modal review detail
    const [reviewRecord, setReviewRecord] = useState<RaporRecord | null>(null);
    const [modalActiveSheetId, setModalActiveSheetId] = useState<string>('all');

    useEffect(() => {
        const fetchRecords = async () => {
            const currentYearFilter = filterTahun || availableYears[0] || defaultAcademicYear;
            const records = await db.raporRecords
                .where('[tahunAjaran+semester]')
                .equals([currentYearFilter, filterSemester])
                .toArray();
            setArchiveRecords(records);
        };
        fetchRecords();
    }, [filterTahun, filterSemester, defaultAcademicYear, availableYears]);

    // Available classes based on selected Jenjang
    const availableKelas = useMemo(() => {
        if (!filterJenjang) return settings.kelas;
        return settings.kelas.filter(k => k.jenjangId === parseInt(filterJenjang));
    }, [filterJenjang, settings.kelas]);

    // Available rombels based on selected Kelas or Jenjang
    const availableRombel = useMemo(() => {
        if (filterKelas) {
            return settings.rombel.filter(r => r.kelasId === parseInt(filterKelas));
        }
        if (filterJenjang) {
            const validKelasIds = new Set(availableKelas.map(k => k.id));
            return settings.rombel.filter(r => validKelasIds.has(r.kelasId));
        }
        return settings.rombel;
    }, [filterKelas, filterJenjang, availableKelas, settings.rombel]);

    // Sync default range when available classes change
    useEffect(() => {
        if (availableKelas.length > 0) {
            if (!rangeFromKelasId || !availableKelas.some(k => k.id === rangeFromKelasId)) {
                setRangeFromKelasId(availableKelas[0].id);
            }
            if (!rangeToKelasId || !availableKelas.some(k => k.id === rangeToKelasId)) {
                setRangeToKelasId(availableKelas[availableKelas.length - 1].id);
            }
        } else {
            setRangeFromKelasId(0);
            setRangeToKelasId(0);
        }
    }, [availableKelas, rangeFromKelasId, rangeToKelasId]);

    const selectedRangeKelas = useMemo(() => {
        if (targetMode !== 'range' || availableKelas.length === 0) return [];
        const fromIdx = availableKelas.findIndex(k => k.id === rangeFromKelasId);
        const toIdx = availableKelas.findIndex(k => k.id === rangeToKelasId);
        if (fromIdx === -1 || toIdx === -1) return availableKelas;
        const minIdx = Math.min(fromIdx, toIdx);
        const maxIdx = Math.max(fromIdx, toIdx);
        return availableKelas.slice(minIdx, maxIdx + 1);
    }, [targetMode, availableKelas, rangeFromKelasId, rangeToKelasId]);

    // Available templates for selected context
    const availableTemplates = useMemo(() => {
        const templates = settings.raporTemplates || [];
        const jId = filterJenjang ? parseInt(filterJenjang) : null;
        const kId = targetMode === 'single' && filterKelas ? parseInt(filterKelas) : null;
        const rId = targetMode === 'single' && filterRombel ? parseInt(filterRombel) : null;

        return templates.filter(t => {
            if (!t.jenjangId) return true;
            if (jId && t.jenjangId !== jId) return false;

            if (targetMode === 'range') {
                if (t.kelasId && !selectedRangeKelas.some(k => k.id === t.kelasId)) return false;
                if (t.rombelId) return false;
                return true;
            }

            if (t.kelasId && kId && t.kelasId !== kId) return false;
            if (t.rombelId && rId && t.rombelId !== rId) return false;
            return true;
        });
    }, [filterJenjang, targetMode, filterKelas, filterRombel, selectedRangeKelas, settings.raporTemplates]);

    // Auto-select template
    useEffect(() => {
        if (availableTemplates.length > 0) {
            if (!selectedTemplateId || !availableTemplates.find(t => t.id === selectedTemplateId)) {
                setSelectedTemplateId(availableTemplates[0].id);
            }
        } else {
            setSelectedTemplateId('');
        }
    }, [availableTemplates, selectedTemplateId]);

    const activeTemplate = useMemo(() => {
        return (settings.raporTemplates || []).find(t => t.id === selectedTemplateId) || null;
    }, [selectedTemplateId, settings.raporTemplates]);

    // Sheets of the active template
    const templateSheets = useMemo(() => {
        return getTemplateSheets(activeTemplate);
    }, [activeTemplate]);

    // Reset sheet if invalid
    useEffect(() => {
        if (selectedSheetId !== 'all' && !templateSheets.find(s => s.id === selectedSheetId)) {
            setSelectedSheetId('all');
        }
    }, [templateSheets, selectedSheetId]);

    // Extracted keys for the active sheet / all sheets
    const templateKeys = useMemo(() => {
        return extractTemplateKeys(activeTemplate, selectedSheetId);
    }, [activeTemplate, selectedSheetId]);

    const handleDeleteRecord = (id: number) => {
        showConfirmation('Hapus Data Rapor?', 'Data nilai santri ini akan dihapus dari arsip.', async () => {
            await db.raporRecords.delete(id);
            setArchiveRecords(prev => prev.filter(p => p.id !== id));
            showToast('Data rapor berhasil dihapus.', 'success');
        }, { confirmColor: 'red' });
    };

    // Calculate score completion for a record
    const getRecordStats = (rec: RaporRecord) => {
        let customDataObj: Record<string, any> = {};
        if (rec.customData) {
            try {
                customDataObj = JSON.parse(rec.customData);
            } catch {
                customDataObj = {};
            }
        }

        if (templateKeys.length === 0) {
            const filledCount = Object.keys(customDataObj).filter(k => customDataObj[k] !== undefined && customDataObj[k] !== '').length;
            return {
                total: filledCount,
                filled: filledCount,
                percentage: 100,
                customDataObj
            };
        }

        let filled = 0;
        templateKeys.forEach(tk => {
            const val = customDataObj[tk.key];
            if (val !== undefined && val !== null && String(val).trim() !== '') {
                filled++;
            }
        });

        const total = templateKeys.length;
        const percentage = total > 0 ? Math.round((filled / total) * 100) : 0;

        return {
            total,
            filled,
            percentage,
            customDataObj
        };
    };

    // Enrich and filter records
    const processedRecords = useMemo(() => {
        const enriched = archiveRecords.map(rec => {
            const santri = santriList.find(s => s.id === rec.santriId);
            const rombel = settings.rombel.find(r => r.id === rec.rombelId) || (santri?.rombelId ? settings.rombel.find(r => r.id === santri.rombelId) : null);
            const kelas = rombel ? settings.kelas.find(k => k.id === rombel.kelasId) : (santri?.kelasId ? settings.kelas.find(k => k.id === santri.kelasId) : null);
            const jenjang = kelas ? settings.jenjang.find(j => j.id === kelas.jenjangId) : (santri?.jenjangId ? settings.jenjang.find(j => j.id === santri.jenjangId) : null);
            const stats = getRecordStats(rec);

            return {
                rec,
                santri,
                rombel,
                kelas,
                jenjang,
                stats
            };
        });

        let list = enriched;

        // Filter Jenjang
        if (filterJenjang) {
            const jId = parseInt(filterJenjang);
            list = list.filter(item => item.jenjang?.id === jId);
        }

        // Target Filter
        if (targetMode === 'range') {
            if (selectedRangeKelas.length > 0) {
                const rangeIds = new Set(selectedRangeKelas.map(k => k.id));
                list = list.filter(item => item.kelas?.id && rangeIds.has(item.kelas.id));
            }
        } else {
            if (filterKelas) {
                const kId = parseInt(filterKelas);
                list = list.filter(item => item.kelas?.id === kId);
            }
            if (filterRombel) {
                const rId = parseInt(filterRombel);
                list = list.filter(item => item.rombel?.id === rId);
            }
        }

        // Search Query
        if (searchQuery.trim()) {
            const q = searchQuery.trim().toLowerCase();
            list = list.filter(item => {
                const name = (item.santri?.namaLengkap || '').toLowerCase();
                const nis = (item.santri?.nis || '').toLowerCase();
                return name.includes(q) || nis.includes(q);
            });
        }

        // Completion Status Filter
        if (statusFilter === 'complete') {
            list = list.filter(item => item.stats.percentage === 100);
        } else if (statusFilter === 'partial') {
            list = list.filter(item => item.stats.percentage > 0 && item.stats.percentage < 100);
        } else if (statusFilter === 'empty') {
            list = list.filter(item => item.stats.percentage === 0);
        }

        // Sort
        list.sort((a, b) => {
            if (sortBy === 'name_asc') {
                return (a.santri?.namaLengkap || '').localeCompare(b.santri?.namaLengkap || '');
            }
            if (sortBy === 'name_desc') {
                return (b.santri?.namaLengkap || '').localeCompare(a.santri?.namaLengkap || '');
            }
            if (sortBy === 'nis') {
                return (a.santri?.nis || '').localeCompare(b.santri?.nis || '');
            }
            if (sortBy === 'completion_desc') {
                return b.stats.percentage - a.stats.percentage || (a.santri?.namaLengkap || '').localeCompare(b.santri?.namaLengkap || '');
            }
            if (sortBy === 'completion_asc') {
                return a.stats.percentage - b.stats.percentage || (a.santri?.namaLengkap || '').localeCompare(b.santri?.namaLengkap || '');
            }
            if (sortBy === 'date_desc') {
                const dateA = a.rec.tanggalRapor ? new Date(a.rec.tanggalRapor).getTime() : 0;
                const dateB = b.rec.tanggalRapor ? new Date(b.rec.tanggalRapor).getTime() : 0;
                return dateB - dateA;
            }
            return 0;
        });

        return list;
    }, [
        archiveRecords, 
        santriList, 
        settings, 
        templateKeys, 
        filterJenjang, 
        targetMode, 
        selectedRangeKelas, 
        filterKelas, 
        filterRombel, 
        searchQuery, 
        statusFilter, 
        sortBy
    ]);

    // Summary counters based on current Jenjang/Target scope (before search/status filtering)
    const statsSummary = useMemo(() => {
        const scoped = archiveRecords.map(rec => {
            const santri = santriList.find(s => s.id === rec.santriId);
            const rombel = settings.rombel.find(r => r.id === rec.rombelId) || (santri?.rombelId ? settings.rombel.find(r => r.id === santri.rombelId) : null);
            const kelas = rombel ? settings.kelas.find(k => k.id === rombel.kelasId) : (santri?.kelasId ? settings.kelas.find(k => k.id === santri.kelasId) : null);
            const jenjang = kelas ? settings.jenjang.find(j => j.id === kelas.jenjangId) : (santri?.jenjangId ? settings.jenjang.find(j => j.id === santri.jenjangId) : null);
            return { rec, santri, rombel, kelas, jenjang, stats: getRecordStats(rec) };
        }).filter(item => {
            if (filterJenjang && item.jenjang?.id !== parseInt(filterJenjang)) return false;
            if (targetMode === 'range') {
                if (selectedRangeKelas.length > 0) {
                    const rangeIds = new Set(selectedRangeKelas.map(k => k.id));
                    if (!item.kelas?.id || !rangeIds.has(item.kelas.id)) return false;
                }
            } else {
                if (filterKelas && item.kelas?.id !== parseInt(filterKelas)) return false;
                if (filterRombel && item.rombel?.id !== parseInt(filterRombel)) return false;
            }
            return true;
        });

        let total = scoped.length;
        let complete = 0;
        let partial = 0;
        let empty = 0;

        scoped.forEach(item => {
            if (item.stats.percentage === 100) complete++;
            else if (item.stats.percentage === 0) empty++;
            else partial++;
        });

        return { total, complete, partial, empty };
    }, [archiveRecords, santriList, settings, templateKeys, filterJenjang, targetMode, selectedRangeKelas, filterKelas, filterRombel]);

    // Check if any non-default filter is active
    const isFiltered = Boolean(
        filterJenjang || 
        filterKelas || 
        filterRombel || 
        targetMode === 'range' || 
        searchQuery.trim() || 
        statusFilter !== 'all' || 
        sortBy !== 'name_asc'
    );

    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (filterJenjang) count++;
        if (targetMode === 'range') count++;
        else {
            if (filterKelas) count++;
            if (filterRombel) count++;
        }
        if (searchQuery.trim()) count++;
        if (statusFilter !== 'all') count++;
        if (sortBy !== 'name_asc') count++;
        return count;
    }, [filterJenjang, targetMode, filterKelas, filterRombel, searchQuery, statusFilter, sortBy]);

    const handleResetFilters = () => {
        setFilterJenjang('');
        setTargetMode('single');
        setFilterKelas('');
        setFilterRombel('');
        setSearchQuery('');
        setStatusFilter('all');
        setSortBy('name_asc');
    };

    return (
        <div className="space-y-6">
            <div className="bg-amber-50/80 p-4 border-l-4 border-amber-500 text-amber-900 rounded-r-2xl text-sm flex items-start gap-3 shadow-sm">
                <i className="bi bi-info-circle-fill text-lg text-amber-600 mt-0.5 shrink-0"></i>
                <div>
                    <strong className="block font-bold">Review Data & Arsip Rapor</strong>
                    <p className="text-xs text-amber-800/90 mt-0.5">
                        Tinjau kelengkapan nilai, rincian per lembar format rapor, dan arsip data santri sebelum pencetakan rapor.
                    </p>
                </div>
            </div>

            {/* Metric Summary Cards / Quick Status Filters */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <button
                    type="button"
                    onClick={() => setStatusFilter('all')}
                    className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                        statusFilter === 'all'
                            ? 'bg-slate-900 text-white border-slate-900 shadow-md scale-[1.01]'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                >
                    <div className="flex items-center justify-between text-xs font-bold opacity-80">
                        <span>Total Arsip</span>
                        <i className="bi bi-database text-sm"></i>
                    </div>
                    <div className="mt-2 text-2xl font-black">{statsSummary.total}</div>
                    <div className="text-[10px] opacity-70 mt-0.5">Semua data tersimpan</div>
                </button>

                <button
                    type="button"
                    onClick={() => setStatusFilter(statusFilter === 'complete' ? 'all' : 'complete')}
                    className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                        statusFilter === 'complete'
                            ? 'bg-teal-700 text-white border-teal-700 shadow-md scale-[1.01]'
                            : 'bg-white text-teal-800 border-teal-200 hover:border-teal-300 hover:bg-teal-50/50'
                    }`}
                >
                    <div className="flex items-center justify-between text-xs font-bold">
                        <span className={statusFilter === 'complete' ? 'text-teal-100' : 'text-teal-700'}>Lengkap (100%)</span>
                        <i className="bi bi-check-circle-fill text-sm text-teal-500"></i>
                    </div>
                    <div className="mt-2 text-2xl font-black text-teal-600">{statusFilter === 'complete' ? <span className="text-white">{statsSummary.complete}</span> : statsSummary.complete}</div>
                    <div className={`text-[10px] mt-0.5 ${statusFilter === 'complete' ? 'text-teal-200' : 'text-teal-600'}`}>Siap cetak rapor</div>
                </button>

                <button
                    type="button"
                    onClick={() => setStatusFilter(statusFilter === 'partial' ? 'all' : 'partial')}
                    className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                        statusFilter === 'partial'
                            ? 'bg-amber-600 text-white border-amber-600 shadow-md scale-[1.01]'
                            : 'bg-white text-amber-800 border-amber-200 hover:border-amber-300 hover:bg-amber-50/50'
                    }`}
                >
                    <div className="flex items-center justify-between text-xs font-bold">
                        <span className={statusFilter === 'partial' ? 'text-amber-100' : 'text-amber-700'}>Sebagian (1-99%)</span>
                        <i className="bi bi-pie-chart-fill text-sm text-amber-500"></i>
                    </div>
                    <div className="mt-2 text-2xl font-black text-amber-600">{statusFilter === 'partial' ? <span className="text-white">{statsSummary.partial}</span> : statsSummary.partial}</div>
                    <div className={`text-[10px] mt-0.5 ${statusFilter === 'partial' ? 'text-amber-200' : 'text-amber-600'}`}>Belum tuntas terisi</div>
                </button>

                <button
                    type="button"
                    onClick={() => setStatusFilter(statusFilter === 'empty' ? 'all' : 'empty')}
                    className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                        statusFilter === 'empty'
                            ? 'bg-rose-600 text-white border-rose-600 shadow-md scale-[1.01]'
                            : 'bg-white text-rose-800 border-rose-200 hover:border-rose-300 hover:bg-rose-50/50'
                    }`}
                >
                    <div className="flex items-center justify-between text-xs font-bold">
                        <span className={statusFilter === 'empty' ? 'text-rose-100' : 'text-rose-700'}>Kosong (0%)</span>
                        <i className="bi bi-exclamation-circle-fill text-sm text-rose-500"></i>
                    </div>
                    <div className="mt-2 text-2xl font-black text-rose-600">{statusFilter === 'empty' ? <span className="text-white">{statsSummary.empty}</span> : statsSummary.empty}</div>
                    <div className={`text-[10px] mt-0.5 ${statusFilter === 'empty' ? 'text-rose-200' : 'text-rose-600'}`}>Belum ada nilai</div>
                </button>
            </div>

            {/* Filter & Actions Bar */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                {/* Mobile Filter Trigger */}
                <div className="md:hidden flex items-center gap-2">
                    <button 
                        onClick={() => setIsFilterDrawerOpen(true)}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-50 text-teal-700 border border-teal-200 rounded-xl font-bold text-sm shadow-sm active:scale-98 transition-all"
                    >
                        <i className="bi bi-funnel-fill"></i>
                        <span>Filter & Pencarian</span>
                        {activeFilterCount > 0 && (
                            <span className="w-5 h-5 rounded-full bg-teal-600 text-white text-[10px] flex items-center justify-center font-black">
                                {activeFilterCount}
                            </span>
                        )}
                    </button>
                    {isFiltered && (
                        <button
                            type="button"
                            onClick={handleResetFilters}
                            className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
                            title="Reset Semua Filter"
                        >
                            <i className="bi bi-arrow-counterclockwise"></i>
                        </button>
                    )}
                </div>

                {/* Desktop View Filter Bar: Tier 1 (Periode, Jenjang, Template) */}
                <div className="hidden md:grid md:grid-cols-4 gap-4 items-end">
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider pl-1">Tahun Ajaran</label>
                        {availableYears.length > 0 ? (
                            <select value={filterTahun} onChange={e => setFilterTahun(e.target.value)} className="w-full border rounded-xl p-2.5 text-sm font-bold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-500 transition-all">
                                {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        ) : (
                            <select value={filterTahun} onChange={e => setFilterTahun(e.target.value)} className="w-full border rounded-xl p-2.5 text-sm font-bold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-500 transition-all">
                                <option value={defaultAcademicYear}>{defaultAcademicYear}</option>
                            </select>
                        )}
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider pl-1">Semester</label>
                        <select value={filterSemester} onChange={e => setFilterSemester(e.target.value as any)} className="w-full border rounded-xl p-2.5 text-sm font-bold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-500 transition-all">
                            <option value="Ganjil">Ganjil</option>
                            <option value="Genap">Genap</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-indigo-600 uppercase mb-1.5 tracking-wider pl-1">Jenjang (Marhalah)</label>
                        <select 
                            value={filterJenjang} 
                            onChange={e => {
                                setFilterJenjang(e.target.value);
                                setFilterKelas('');
                                setFilterRombel('');
                            }} 
                            className="w-full border border-indigo-200 rounded-xl p-2.5 text-sm font-bold bg-indigo-50/40 focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all"
                        >
                            <option value="">Semua Jenjang</option>
                            {settings.jenjang.map(j => (
                                <option key={j.id} value={j.id}>{j.nama}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-purple-600 uppercase mb-1.5 tracking-wider pl-1">Template Rapor</label>
                        <select 
                            value={selectedTemplateId} 
                            onChange={e => setSelectedTemplateId(e.target.value)}
                            className="w-full border border-purple-200 rounded-xl p-2.5 text-sm font-bold bg-purple-50/50 focus:bg-white focus:ring-2 focus:ring-purple-500 transition-all"
                        >
                            {availableTemplates.length === 0 && <option value="">Tidak ada template</option>}
                            {availableTemplates.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Desktop View Filter Bar: Tier 2 (Target Kelas / Rentang Kelas & Rombel) */}
                <div className="hidden md:block pt-3 border-t border-slate-100">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                            <button
                                type="button"
                                onClick={() => setTargetMode('single')}
                                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1 ${
                                    targetMode === 'single'
                                        ? 'bg-white text-blue-700 shadow-xs border border-slate-200'
                                        : 'text-slate-500 hover:text-slate-800'
                                }`}
                            >
                                <i className="bi bi-ui-checks-grid text-[11px]"></i> Kelas & Rombel
                            </button>
                            <button
                                type="button"
                                onClick={() => setTargetMode('range')}
                                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1 ${
                                    targetMode === 'range'
                                        ? 'bg-white text-indigo-700 shadow-xs border border-slate-200'
                                        : 'text-slate-500 hover:text-slate-800'
                                }`}
                            >
                                <i className="bi bi-arrows-expand text-[11px]"></i> Rentang Kelas
                            </button>
                        </div>

                        {targetMode === 'range' && selectedRangeKelas.length > 0 && (
                            <div className="flex items-center gap-1.5 text-xs text-indigo-700 font-bold bg-indigo-50 px-3 py-1 rounded-xl border border-indigo-100">
                                <i className="bi bi-check2-circle"></i>
                                <span>Mencakup {selectedRangeKelas.length} Tingkat Kelas ({selectedRangeKelas.map(k => k.nama).join(', ')})</span>
                            </div>
                        )}
                    </div>

                    {targetMode === 'single' ? (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider pl-1">Kelas (Tingkat)</label>
                                <select 
                                    value={filterKelas} 
                                    onChange={e => {
                                        setFilterKelas(e.target.value);
                                        setFilterRombel('');
                                    }} 
                                    className="w-full border rounded-xl p-2.5 text-sm font-bold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-500 transition-all"
                                >
                                    <option value="">Semua Kelas</option>
                                    {availableKelas.map(k => (
                                        <option key={k.id} value={k.id}>{k.nama}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-teal-600 uppercase mb-1.5 tracking-wider pl-1">Rombongan Belajar</label>
                                <select 
                                    value={filterRombel} 
                                    onChange={e => setFilterRombel(e.target.value)} 
                                    className="w-full border border-teal-200 rounded-xl p-2.5 text-sm font-bold bg-teal-50/50 focus:bg-white focus:ring-2 focus:ring-teal-500 transition-all"
                                >
                                    <option value="">Semua Rombel</option>
                                    {availableRombel.map(r => (
                                        <option key={r.id} value={r.id}>{r.nama}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-bold text-indigo-700 uppercase mb-1.5 tracking-wider pl-1">Dari Kelas (Mulai)</label>
                                <select 
                                    value={rangeFromKelasId} 
                                    onChange={e => setRangeFromKelasId(Number(e.target.value))} 
                                    disabled={availableKelas.length === 0} 
                                    className="w-full border-2 border-indigo-100 rounded-xl p-2.5 text-sm font-bold bg-white focus:border-indigo-500 transition-all disabled:bg-slate-100"
                                >
                                    {availableKelas.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-indigo-700 uppercase mb-1.5 tracking-wider pl-1">Sampai Kelas (Akhir)</label>
                                <select 
                                    value={rangeToKelasId} 
                                    onChange={e => setRangeToKelasId(Number(e.target.value))} 
                                    disabled={availableKelas.length === 0} 
                                    className="w-full border-2 border-indigo-100 rounded-xl p-2.5 text-sm font-bold bg-white focus:border-indigo-500 transition-all disabled:bg-slate-100"
                                >
                                    {availableKelas.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
                                </select>
                            </div>
                        </div>
                    )}
                </div>

                {/* Tier 3: Real-time Search, Status Tabs & Sorting Bar */}
                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex-1 min-w-[220px] relative">
                        <i className="bi bi-search absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Cari nama santri atau NIS..."
                            className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                <i className="bi bi-x-circle-fill text-xs"></i>
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Status Pills */}
                        <div className="hidden lg:flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                            {(['all', 'complete', 'partial', 'empty'] as const).map(st => {
                                const labels: Record<string, string> = {
                                    all: 'Semua Status',
                                    complete: 'Lengkap',
                                    partial: 'Sebagian',
                                    empty: 'Kosong'
                                };
                                return (
                                    <button
                                        key={st}
                                        type="button"
                                        onClick={() => setStatusFilter(st)}
                                        className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                                            statusFilter === st
                                                ? 'bg-white text-slate-800 shadow-xs'
                                                : 'text-slate-500 hover:text-slate-800'
                                        }`}
                                    >
                                        {labels[st]}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Sort Dropdown */}
                        <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-bold text-slate-400 hidden sm:inline">Urutan:</span>
                            <select
                                value={sortBy}
                                onChange={e => setSortBy(e.target.value as any)}
                                className="border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-bold bg-white text-slate-700 outline-none focus:ring-2 focus:ring-teal-500"
                            >
                                <option value="name_asc">Nama Santri (A-Z)</option>
                                <option value="name_desc">Nama Santri (Z-A)</option>
                                <option value="nis">Nomor Induk (NIS)</option>
                                <option value="completion_desc">Kelengkapan Tertinggi</option>
                                <option value="completion_asc">Kelengkapan Terendah</option>
                                <option value="date_desc">Tanggal Rapor Terbaru</option>
                            </select>
                        </div>

                        {isFiltered && (
                            <button
                                type="button"
                                onClick={handleResetFilters}
                                className="px-3 py-2 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-all border border-rose-200 flex items-center gap-1"
                                title="Kembalikan semua filter ke bawaan"
                            >
                                <i className="bi bi-arrow-counterclockwise"></i>
                                <span className="hidden sm:inline">Reset Filter</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Worksheet / Multi-Sheet Filter Bar */}
                {activeTemplate && templateSheets.length > 1 && (
                    <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-slate-500 flex items-center gap-1 mr-1">
                            <i className="bi bi-collection text-indigo-500"></i> Format Lembar:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                            <button
                                type="button"
                                onClick={() => setSelectedSheetId('all')}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                    selectedSheetId === 'all'
                                        ? 'bg-indigo-600 text-white shadow-sm'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                            >
                                Semua Format ({templateSheets.length})
                            </button>
                            {templateSheets.map((sh, idx) => {
                                const isSelected = selectedSheetId === sh.id;
                                return (
                                    <button
                                        key={sh.id}
                                        type="button"
                                        onClick={() => setSelectedSheetId(sh.id)}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                                            isSelected
                                                ? 'bg-indigo-600 text-white shadow-sm'
                                                : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                                        }`}
                                    >
                                        <i className="bi bi-file-earmark-text text-[11px]"></i>
                                        <span>Lembar {idx + 1}: {sh.name}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Mobile Drawer */}
            <MobileFilterDrawer 
                isOpen={isFilterDrawerOpen} 
                onClose={() => setIsFilterDrawerOpen(false)}
                title="Filter Lengkap Data Nilai"
            >
                <div className="space-y-5">
                    {/* Search */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1 tracking-wider">Cari Santri / NIS</label>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Ketik nama atau NIS..."
                            className="w-full p-3 border border-slate-200 rounded-xl text-sm font-semibold bg-white"
                        />
                    </div>

                    {/* Tahun Ajaran */}
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-2 tracking-wider">Tahun Ajaran</label>
                        <div className="flex flex-wrap gap-2">
                            {availableYears.length > 0 ? availableYears.map(y => (
                                <button 
                                    key={y}
                                    onClick={() => setFilterTahun(y)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${filterTahun === y ? 'bg-teal-600 text-white border-teal-600 shadow-sm' : 'bg-white text-slate-600 border-slate-200'}`}
                                >
                                    {y}
                                </button>
                            )) : (
                                <button
                                    onClick={() => setFilterTahun(defaultAcademicYear)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${filterTahun === defaultAcademicYear ? 'bg-teal-600 text-white border-teal-600 shadow-sm' : 'bg-white text-slate-600 border-slate-200'}`}
                                >
                                    {defaultAcademicYear}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Semester */}
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-2 tracking-wider">Semester</label>
                        <div className="flex gap-2">
                            {(['Ganjil', 'Genap'] as const).map(s => (
                                <button 
                                    key={s}
                                    onClick={() => setFilterSemester(s)}
                                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all border ${filterSemester === s ? 'bg-teal-600 text-white border-teal-600 shadow-sm' : 'bg-white text-slate-600 border-slate-200'}`}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Jenjang */}
                    <div className="bg-indigo-50/60 p-4 rounded-2xl border border-indigo-200">
                        <label className="block text-xs font-bold text-indigo-800 uppercase mb-2 tracking-wider">Jenjang (Marhalah)</label>
                        <select 
                            value={filterJenjang} 
                            onChange={e => {
                                setFilterJenjang(e.target.value);
                                setFilterKelas('');
                                setFilterRombel('');
                            }}
                            className="w-full border border-indigo-300 rounded-xl p-2.5 text-sm font-bold bg-white"
                        >
                            <option value="">Semua Jenjang</option>
                            {settings.jenjang.map(j => (
                                <option key={j.id} value={j.id}>{j.nama}</option>
                            ))}
                        </select>
                    </div>

                    {/* Mode Target */}
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Target Kelas</label>
                            <div className="flex items-center gap-1 bg-slate-200/80 p-0.5 rounded-lg">
                                <button
                                    type="button"
                                    onClick={() => setTargetMode('single')}
                                    className={`px-2.5 py-1 text-[11px] font-bold rounded-md ${targetMode === 'single' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600'}`}
                                >
                                    Tunggal
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setTargetMode('range')}
                                    className={`px-2.5 py-1 text-[11px] font-bold rounded-md ${targetMode === 'range' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600'}`}
                                >
                                    Rentang
                                </button>
                            </div>
                        </div>

                        {targetMode === 'single' ? (
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Kelas</label>
                                    <select 
                                        value={filterKelas} 
                                        onChange={e => {
                                            setFilterKelas(e.target.value);
                                            setFilterRombel('');
                                        }}
                                        className="w-full border border-slate-300 rounded-xl p-2.5 text-sm font-bold bg-white"
                                    >
                                        <option value="">Semua Kelas</option>
                                        {availableKelas.map(k => (
                                            <option key={k.id} value={k.id}>{k.nama}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-teal-700 mb-1">Rombel</label>
                                    <select 
                                        value={filterRombel} 
                                        onChange={e => setFilterRombel(e.target.value)}
                                        className="w-full border border-teal-300 rounded-xl p-2.5 text-sm font-bold bg-white"
                                    >
                                        <option value="">Semua Rombongan Belajar</option>
                                        {availableRombel.map(r => (
                                            <option key={r.id} value={r.id}>{r.nama}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-[11px] font-bold text-indigo-800 mb-1">Dari Kelas</label>
                                    <select 
                                        value={rangeFromKelasId} 
                                        onChange={e => setRangeFromKelasId(Number(e.target.value))}
                                        disabled={availableKelas.length === 0}
                                        className="w-full border border-indigo-200 rounded-xl p-2 text-xs font-bold bg-white"
                                    >
                                        {availableKelas.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-indigo-800 mb-1">Sampai Kelas</label>
                                    <select 
                                        value={rangeToKelasId} 
                                        onChange={e => setRangeToKelasId(Number(e.target.value))}
                                        disabled={availableKelas.length === 0}
                                        className="w-full border border-indigo-200 rounded-xl p-2 text-xs font-bold bg-white"
                                    >
                                        {availableKelas.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
                                    </select>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Status Kelengkapan Nilai */}
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-2 tracking-wider">Status Nilai</label>
                        <div className="grid grid-cols-2 gap-2">
                            {(['all', 'complete', 'partial', 'empty'] as const).map(st => {
                                const labels: Record<string, string> = {
                                    all: 'Semua Status',
                                    complete: 'Lengkap (100%)',
                                    partial: 'Sebagian (<100%)',
                                    empty: 'Kosong (0%)'
                                };
                                return (
                                    <button
                                        key={st}
                                        type="button"
                                        onClick={() => setStatusFilter(st)}
                                        className={`p-2 rounded-xl text-xs font-bold border transition-all text-center ${
                                            statusFilter === st
                                                ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                                                : 'bg-white text-slate-600 border-slate-200'
                                        }`}
                                    >
                                        {labels[st]}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Urutan Data */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 tracking-wider">Urutkan Berdasarkan</label>
                        <select 
                            value={sortBy} 
                            onChange={e => setSortBy(e.target.value as any)}
                            className="w-full border border-slate-300 rounded-xl p-2.5 text-sm font-bold bg-white"
                        >
                            <option value="name_asc">Nama Santri (A-Z)</option>
                            <option value="name_desc">Nama Santri (Z-A)</option>
                            <option value="nis">Nomor Induk (NIS)</option>
                            <option value="completion_desc">Kelengkapan Tertinggi</option>
                            <option value="completion_asc">Kelengkapan Terendah</option>
                            <option value="date_desc">Tanggal Rapor Terbaru</option>
                        </select>
                    </div>

                    {availableTemplates.length > 0 && (
                        <div className="bg-purple-50/60 p-4 rounded-2xl border border-purple-200">
                            <label className="block text-xs font-bold text-purple-700 uppercase mb-2 tracking-wider">Template Rapor</label>
                            <select 
                                value={selectedTemplateId} 
                                onChange={e => setSelectedTemplateId(e.target.value)}
                                className="w-full border border-purple-300 rounded-xl p-2.5 text-sm font-bold bg-white"
                            >
                                {availableTemplates.map(t => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="pt-2 flex gap-2">
                        <button
                            type="button"
                            onClick={handleResetFilters}
                            className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all text-center"
                        >
                            Reset Filter
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsFilterDrawerOpen(false)}
                            className="flex-1 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs transition-all shadow-md text-center"
                        >
                            Terapkan ({processedRecords.length})
                        </button>
                    </div>
                </div>
            </MobileFilterDrawer>

            {/* Data Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex flex-wrap justify-between items-center gap-3">
                    <div className="flex items-center gap-2">
                        <h4 className="text-xs font-black text-slate-600 uppercase tracking-widest">Arsip Data Rapor</h4>
                        <span className="text-[10px] font-bold text-teal-700 bg-teal-100/60 px-2 py-0.5 rounded-md border border-teal-200">
                            {processedRecords.length} Santri Ditampilkan
                        </span>
                        {processedRecords.length !== archiveRecords.length && (
                            <span className="text-[10px] text-slate-400 font-medium">
                                (dari total {archiveRecords.length})
                            </span>
                        )}
                        {selectedSheetId !== 'all' && (
                            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100/60 px-2 py-0.5 rounded-md border border-indigo-200">
                                {templateSheets.find(s => s.id === selectedSheetId)?.name}
                            </span>
                        )}
                    </div>
                    {templateKeys.length > 0 && (
                        <div className="text-xs font-medium text-slate-500">
                            Format Lembar: <strong className="text-slate-800">{templateKeys.length} Kolom Nilai</strong>
                        </div>
                    )}
                </div>

                <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200">
                    <table className="w-full text-sm text-left border-collapse min-w-[750px]">
                        <thead>
                            <tr className="bg-white text-[10px] font-black text-slate-400 uppercase border-b border-slate-100 tracking-wider">
                                <th className="p-4 text-center w-14">No</th>
                                <th className="p-4">Identitas Santri</th>
                                <th className="p-4">Marhalah & Rombel</th>
                                <th className="p-4 text-center">Kelengkapan</th>
                                <th className="p-4 text-center">Tgl Rapor</th>
                                <th className="p-4 text-center w-36">Aksi Review</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {processedRecords.length > 0 ? (
                                processedRecords.map((item, idx) => {
                                    const { rec, santri, rombel, jenjang, stats } = item;
                                    const rombelName = rombel?.nama || '-';
                                    const jenjangName = jenjang?.nama || '';

                                    return (
                                        <tr key={rec.id} className="hover:bg-slate-50/70 transition-colors group">
                                            <td className="p-4 text-center font-mono text-xs text-slate-400">{idx + 1}</td>
                                            <td className="p-4">
                                                <div className="font-bold text-slate-800 leading-snug">{santri ? santri.namaLengkap : 'Santri Tidak Ditemukan'}</div>
                                                <div className="text-[10px] text-slate-400 font-mono font-medium">NIS: {santri?.nis || 'N/A'}</div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex flex-col gap-1 items-start">
                                                    <span className="text-[11px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-lg border border-teal-100">
                                                        {rombelName}
                                                    </span>
                                                    {jenjangName && (
                                                        <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50/60 px-1.5 py-0.2 rounded border border-indigo-100">
                                                            {jenjangName}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-4 text-center">
                                                {stats.total > 0 ? (
                                                    <div className="inline-flex flex-col items-center">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className={`text-xs font-bold ${stats.percentage === 100 ? 'text-teal-600' : stats.percentage > 50 ? 'text-blue-600' : 'text-amber-600'}`}>
                                                                {stats.filled} / {stats.total}
                                                            </span>
                                                            <span className="text-[10px] text-slate-400">({stats.percentage}%)</span>
                                                        </div>
                                                        <div className="w-20 bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1">
                                                            <div 
                                                                className={`h-full rounded-full ${stats.percentage === 100 ? 'bg-teal-500' : stats.percentage > 50 ? 'bg-blue-500' : 'bg-amber-500'}`} 
                                                                style={{ width: `${stats.percentage}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-slate-400 italic">Data Tersimpan</span>
                                                )}
                                            </td>
                                            <td className="p-4 text-center text-xs text-slate-500 font-medium">
                                                {rec.tanggalRapor ? new Date(rec.tanggalRapor).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                                            </td>
                                            <td className="p-4 text-center">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setReviewRecord(rec);
                                                            setModalActiveSheetId(selectedSheetId !== 'all' ? selectedSheetId : (templateSheets[0]?.id || 'all'));
                                                        }}
                                                        className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shadow-sm active:scale-95"
                                                        title="Buka Rincian Nilai"
                                                    >
                                                        <i className="bi bi-eye-fill"></i>
                                                        <span>Detail</span>
                                                    </button>
                                                    {canWrite && (
                                                        <button 
                                                            type="button"
                                                            onClick={() => handleDeleteRecord(rec.id)} 
                                                            className="p-1.5 text-red-500 hover:text-white hover:bg-red-500 rounded-xl transition-all border border-red-100 shadow-sm active:scale-95" 
                                                            title="Hapus Data"
                                                        >
                                                            <i className="bi bi-trash-fill text-sm"></i>
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={6} className="p-16 text-center text-slate-400 italic">
                                        <div className="flex flex-col items-center">
                                            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-3 border border-dashed border-slate-200">
                                                <i className="bi bi-inbox text-2xl text-slate-300"></i>
                                            </div>
                                            <p className="text-sm font-bold text-slate-600">
                                                {isFiltered ? 'Tidak ada data santri yang sesuai dengan kriteria filter' : 'Belum ada arsip rapor pada periode ini'}
                                            </p>
                                            <p className="text-xs mt-0.5 text-slate-400">
                                                Tahun Ajaran {formatAcademicYearDisplay(settings, filterTahun)} ({filterSemester})
                                            </p>
                                            {isFiltered && (
                                                <button
                                                    type="button"
                                                    onClick={handleResetFilters}
                                                    className="mt-4 px-4 py-2 bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                                                >
                                                    <i className="bi bi-arrow-counterclockwise"></i>
                                                    <span>Bersihkan Semua Filter</span>
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL REVIEW DETAIL PER SANTRI */}
            {reviewRecord && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
                        {/* Header Modal */}
                        <div className="p-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-800 text-[10px] font-black rounded-lg uppercase tracking-wider">
                                        Review Detail Nilai
                                    </span>
                                    <span className="text-xs text-slate-400">
                                        {reviewRecord.tahunAjaran} ({reviewRecord.semester})
                                    </span>
                                </div>
                                <h3 className="text-lg font-black text-slate-800 mt-1">
                                    {santriList.find(s => s.id === reviewRecord.santriId)?.namaLengkap || 'Santri'}
                                </h3>
                                <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                                    <span>NIS: <strong>{santriList.find(s => s.id === reviewRecord.santriId)?.nis || '-'}</strong></span>
                                    <span>•</span>
                                    <span>Rombel: <strong>{settings.rombel.find(r => r.id === reviewRecord.rombelId)?.nama || '-'}</strong></span>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setReviewRecord(null)}
                                className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-full transition-colors"
                            >
                                <i className="bi bi-x-lg text-lg"></i>
                            </button>
                        </div>

                        {/* Modal Worksheet Tabs */}
                        {templateSheets.length > 1 && (
                            <div className="bg-white px-6 pt-3 border-b border-slate-200 flex items-center gap-2 overflow-x-auto shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setModalActiveSheetId('all')}
                                    className={`px-3.5 py-2 text-xs font-bold border-b-2 transition-all shrink-0 ${
                                        modalActiveSheetId === 'all'
                                            ? 'border-indigo-600 text-indigo-700'
                                            : 'border-transparent text-slate-500 hover:text-slate-800'
                                    }`}
                                >
                                    Semua Format
                                </button>
                                {templateSheets.map((sh, idx) => (
                                    <button
                                        key={sh.id}
                                        type="button"
                                        onClick={() => setModalActiveSheetId(sh.id)}
                                        className={`px-3.5 py-2 text-xs font-bold border-b-2 transition-all shrink-0 flex items-center gap-1.5 ${
                                            modalActiveSheetId === sh.id
                                                ? 'border-indigo-600 text-indigo-700'
                                                : 'border-transparent text-slate-500 hover:text-slate-800'
                                        }`}
                                    >
                                        <i className="bi bi-file-earmark-text text-[11px]"></i>
                                        <span>Lembar {idx + 1}: {sh.name}</span>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Modal Content */}
                        <div className="p-6 overflow-y-auto space-y-6">
                            {/* Nilai / Custom Data List */}
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                        <i className="bi bi-table text-teal-600"></i> Nilai & Kolom Lembar
                                    </h5>
                                </div>

                                {(() => {
                                    const modalKeys = extractTemplateKeys(activeTemplate, modalActiveSheetId);
                                    let cData: Record<string, any> = {};
                                    try {
                                        if (reviewRecord.customData) cData = JSON.parse(reviewRecord.customData);
                                    } catch {
                                        cData = {};
                                    }

                                    if (modalKeys.length === 0) {
                                        const rawEntries = Object.entries(cData);
                                        if (rawEntries.length === 0) {
                                            return (
                                                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs">
                                                    Belum ada data nilai mentah tersimpan.
                                                </div>
                                            );
                                        }
                                        return (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                {rawEntries.map(([k, v]) => (
                                                    <div key={k} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
                                                        <span className="text-xs font-mono text-slate-600">${k}</span>
                                                        <span className="text-xs font-bold text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200">{String(v)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        );
                                    }

                                    return (
                                        <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                                            <table className="w-full text-xs text-left">
                                                <thead className="bg-slate-50 text-slate-400 uppercase font-black tracking-wider border-b border-slate-200">
                                                    <tr>
                                                        <th className="p-3 w-12 text-center">No</th>
                                                        <th className="p-3">Mata Pelajaran / Variabel</th>
                                                        {modalActiveSheetId === 'all' && <th className="p-3">Lembar Format</th>}
                                                        <th className="p-3">Tipe</th>
                                                        <th className="p-3 text-right">Nilai / Input</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {modalKeys.map((k, kIdx) => {
                                                        const val = cData[k.key];
                                                        const isFilled = val !== undefined && val !== null && String(val).trim() !== '';
                                                        return (
                                                            <tr key={k.key} className="hover:bg-slate-50/50">
                                                                <td className="p-3 text-center text-slate-400 font-mono">{kIdx + 1}</td>
                                                                <td className="p-3">
                                                                    <div className="font-bold text-slate-800">{k.label}</div>
                                                                    <div className="text-[10px] text-slate-400 font-mono">${k.key}</div>
                                                                </td>
                                                                {modalActiveSheetId === 'all' && (
                                                                    <td className="p-3 text-slate-600 text-[11px]">
                                                                        {k.sheetName || '-'}
                                                                    </td>
                                                                )}
                                                                <td className="p-3">
                                                                    <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-600 rounded-md">
                                                                        {k.type}
                                                                    </span>
                                                                </td>
                                                                <td className="p-3 text-right">
                                                                    {isFilled ? (
                                                                        <span className="font-bold font-mono text-xs px-2.5 py-1 bg-teal-50 text-teal-800 border border-teal-200 rounded-lg">
                                                                            {String(val)}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-slate-300 italic text-[11px]">- Kosong -</span>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* Kehadiran & Catatan */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                                    <h5 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                                        <i className="bi bi-clock-history text-indigo-500"></i> Rekap Presensi
                                    </h5>
                                    <div className="grid grid-cols-3 gap-2 text-center pt-1">
                                        <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                                            <div className="text-xs text-slate-400 font-medium">Sakit</div>
                                            <div className="text-lg font-black text-amber-600">{reviewRecord.sakit || 0}</div>
                                        </div>
                                        <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                                            <div className="text-xs text-slate-400 font-medium">Izin</div>
                                            <div className="text-lg font-black text-blue-600">{reviewRecord.izin || 0}</div>
                                        </div>
                                        <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                                            <div className="text-xs text-slate-400 font-medium">Alpha</div>
                                            <div className="text-lg font-black text-rose-600">{reviewRecord.alpha || 0}</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                                    <h5 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                                        <i className="bi bi-chat-left-quote-fill text-teal-600"></i> Catatan Wali Kelas
                                    </h5>
                                    <p className="text-xs text-slate-700 bg-white p-3 rounded-xl border border-slate-200 min-h-[58px] italic">
                                        {reviewRecord.catatanWaliKelas || 'Tidak ada catatan khusus dari wali kelas.'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Footer Modal */}
                        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2 shrink-0">
                            <button
                                type="button"
                                onClick={() => setReviewRecord(null)}
                                className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-100 transition-all shadow-xs"
                            >
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
