
import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../../AppContext';
import { useSantriContext } from '../../contexts/SantriContext';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { MobileFilterDrawer } from '../common/MobileFilterDrawer';
import { useAcademicPeriodFilter } from '../../hooks/useAcademicPeriodFilter';
import { formatAcademicYearDisplay } from '../../utils/academicYear';
import { extractTemplateKeys } from '../../services/raporExcelService';
import { RaporCloudPullControl } from './RaporWaCloudImportModal';
import { findMapelInMasterPool } from '../../utils/raporFormulaUtils';

export interface TabMonitoringNilaiProps {
    onNavigateToTab?: (
        tab: string,
        rombelIdOrPayload?: number | Record<string, any>,
        period?: { tahunAjaran: string; semester: 'Ganjil' | 'Genap' }
    ) => void;
}

export const TabMonitoringNilai: React.FC<TabMonitoringNilaiProps> = ({ onNavigateToTab }) => {
    const { settings, currentUser } = useAppContext();
    const canWriteAkademik = currentUser?.role === 'admin' || currentUser?.permissions?.akademik === 'write';
    const { santriList } = useSantriContext();
    const {
        filterTahun,
        setFilterTahun,
        filterSemester,
        setFilterSemester,
        availableYears,
        defaultAcademicYear
    } = useAcademicPeriodFilter(settings);
    
    const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
    const [selectedAuditRombel, setSelectedAuditRombel] = useState<any | null>(null);
    const [auditViewTab, setAuditViewTab] = useState<'santri' | 'mapel'>('santri');
    const currentYear = filterTahun || availableYears[0] || defaultAcademicYear;
    const jadwalPelajaranList = useLiveQuery(() => db.jadwalPelajaran.toArray(), []) || [];
    const livePeriodRecords = useLiveQuery(
        async () => {
            if (!currentYear || !filterSemester) return [];
            const raw = await db.raporRecords
                .where('[tahunAjaran+semester]')
                .equals([currentYear, filterSemester])
                .toArray();
            return raw.filter(r => !r.deleted);
        },
        [currentYear, filterSemester]
    );
    const isLoading = livePeriodRecords === undefined;

    useEffect(() => {
        if (selectedAuditRombel) {
            setAuditViewTab('santri');
        }
    }, [selectedAuditRombel?.id]);

    // Calculate Stats reactively whenever livePeriodRecords, settings, or santriList changes
    const stats = useMemo(() => {
        const records = livePeriodRecords || [];
        const recMap = new Map<number, any>();
        records.forEach(r => {
            if (r.deleted) return;
            const prev = recMap.get(r.santriId);
            if (!prev || (r.lastModified || 0) >= (prev.lastModified || 0)) {
                recMap.set(r.santriId, r);
            }
        });

        const templates = settings.raporTemplates || [];

        return settings.rombel.map(rombel => {
            const kelas = settings.kelas.find(k => k.id === rombel.kelasId);
            const jenjang = settings.jenjang.find(j => j.id === kelas?.jenjangId);
            const wali = settings.tenagaPengajar.find(
                t => t.id === rombel.waliKelasId || t.id === rombel.waliKelasUserId
            );

            const matchedTemplate =
                templates.find(t => t.rombelId === rombel.id) ||
                templates.find(t => t.jenjangId === kelas?.jenjangId && t.kelasId === kelas?.id && !t.rombelId) ||
                templates.find(t => t.jenjangId === kelas?.jenjangId && !t.kelasId && !t.rombelId) ||
                templates.find(t => !t.jenjangId) ||
                (templates.length > 0 ? templates[0] : null);

            const templateKeys = matchedTemplate ? extractTemplateKeys(matchedTemplate, 'all') : [];
            const expectedCount = templateKeys.length;

            const santriInRombel = santriList.filter(
                s => !s.deleted && s.rombelId === rombel.id && s.status === 'Aktif'
            );
            const totalSantri = santriInRombel.length;

            let completeCount = 0;
            let partialCount = 0;
            let emptyCount = 0;

            santriInRombel.forEach(s => {
                const rec = recMap.get(s.id);
                if (!rec || !rec.customData) {
                    emptyCount++;
                    return;
                }
                let filled = 0;
                try {
                    const parsed = JSON.parse(rec.customData);
                    if (expectedCount > 0) {
                        filled = templateKeys.filter(
                            tk => parsed[tk.key] !== undefined && parsed[tk.key] !== null && String(parsed[tk.key]).trim() !== ''
                        ).length;
                    } else {
                        filled = Object.keys(parsed).filter(
                            k => parsed[k] !== undefined && parsed[k] !== null && String(parsed[k]).trim() !== ''
                        ).length;
                    }
                } catch {
                    filled = 0;
                }

                if (filled === 0) {
                    emptyCount++;
                } else if (expectedCount > 0 ? filled >= expectedCount : filled >= 3) {
                    completeCount++;
                } else {
                    partialCount++;
                }
            });

            const percent =
                totalSantri > 0
                    ? Math.min(100, Math.round(((completeCount + partialCount * 0.5) / totalSantri) * 100))
                    : 0;

            let status: 'Lengkap' | 'Sebagian' | 'Kosong' = 'Kosong';
            if (totalSantri > 0) {
                if (completeCount === totalSantri) status = 'Lengkap';
                else if (completeCount > 0 || partialCount > 0) status = 'Sebagian';
            }

            const rombelStudentIdSet = new Set(santriInRombel.map(s => s.id));
            const rombelRecords = records.filter(r => r.rombelId === rombel.id || rombelStudentIdSet.has(r.santriId));
            const lastUpdate =
                rombelRecords.length > 0
                    ? new Date(
                          Math.max(
                              ...rombelRecords.map(r =>
                                  new Date(r.lastModified || r.tanggalRapor).getTime()
                              )
                          )
                      )
                    : null;

            return {
                id: rombel.id,
                nama: rombel.nama,
                jenjang: jenjang?.nama,
                kelas: kelas?.nama,
                wali: wali?.nama || 'Belum Ditentukan',
                totalSantri,
                submittedCount: completeCount,
                completeCount,
                partialCount,
                emptyCount,
                expectedCount,
                percent,
                status,
                lastUpdate
            };
        });
    }, [livePeriodRecords, settings, santriList]);

    // Audit specific rombel students (reactive to livePeriodRecords)
    const isAuditLoading = selectedAuditRombel !== null && livePeriodRecords === undefined;
    const auditStudents = useMemo(() => {
        if (!selectedAuditRombel) return [];
        const records = livePeriodRecords || [];
        const recMap = new Map<number, any>();
        records.forEach(r => {
            if (r.deleted) return;
            const prev = recMap.get(r.santriId);
            if (!prev || (r.lastModified || 0) >= (prev.lastModified || 0)) {
                recMap.set(r.santriId, r);
            }
        });

        const rombelObj = settings.rombel.find(r => r.id === selectedAuditRombel.id);
        const kelasObj = settings.kelas.find(k => k.id === rombelObj?.kelasId);
        const templates = settings.raporTemplates || [];
        const matchedTemplate =
            templates.find(t => t.rombelId === selectedAuditRombel.id) ||
            templates.find(t => t.jenjangId === kelasObj?.jenjangId && t.kelasId === kelasObj?.id && !t.rombelId) ||
            templates.find(t => t.jenjangId === kelasObj?.jenjangId && !t.kelasId && !t.rombelId) ||
            templates.find(t => !t.jenjangId) ||
            (templates.length > 0 ? templates[0] : null);
        const templateKeys = matchedTemplate ? extractTemplateKeys(matchedTemplate, 'all') : [];

        return santriList
            .filter(s => !s.deleted && s.rombelId === selectedAuditRombel.id && s.status === 'Aktif')
            .sort((a, b) => a.namaLengkap.localeCompare(b.namaLengkap))
            .map(s => {
                const rec = recMap.get(s.id);
                let filledCount = 0;
                let firstMissingKey: string | undefined = undefined;
                if (rec?.customData) {
                    try {
                        const customData = JSON.parse(rec.customData);
                        if (templateKeys.length > 0) {
                            filledCount = templateKeys.filter(
                                tk => customData[tk.key] !== undefined && customData[tk.key] !== null && String(customData[tk.key]).trim() !== ''
                            ).length;
                            const firstMiss = templateKeys.find(
                                tk => customData[tk.key] === undefined || customData[tk.key] === null || String(customData[tk.key]).trim() === ''
                            );
                            firstMissingKey = firstMiss?.key;
                        } else {
                            filledCount = Object.keys(customData).filter(
                                k => customData[k] !== undefined && customData[k] !== null && String(customData[k]).trim() !== ''
                            ).length;
                        }
                    } catch {}
                } else if (templateKeys.length > 0) {
                    firstMissingKey = templateKeys[0].key;
                }
                return {
                    santri: s,
                    record: rec || null,
                    isSubmitted: !!rec,
                    filledCount,
                    expectedCount: templateKeys.length,
                    firstMissingKey,
                    lastModified: rec?.lastModified || rec?.tanggalRapor || null
                };
            });
    }, [selectedAuditRombel, livePeriodRecords, settings, santriList]);

    // Audit per-mapel & guru pengampu matrix for selected rombel
    const auditSubjects = useMemo(() => {
        if (!selectedAuditRombel) return [];
        const records = livePeriodRecords || [];
        const recMap = new Map<number, Record<string, any>>();
        records.forEach(r => {
            if (r.deleted) return;
            const prev = recMap.get(r.santriId);
            if (!prev || (r.lastModified || 0) >= (prev._lastMod || 0)) {
                try {
                    const parsed = JSON.parse(r.customData || '{}');
                    recMap.set(r.santriId, { ...parsed, _lastMod: r.lastModified || 0 });
                } catch {
                    recMap.set(r.santriId, { _lastMod: r.lastModified || 0 });
                }
            }
        });

        const rombelObj = settings.rombel.find(r => r.id === selectedAuditRombel.id);
        const kelasObj = settings.kelas.find(k => k.id === rombelObj?.kelasId);
        const templates = settings.raporTemplates || [];
        const matchedTemplate =
            templates.find(t => t.rombelId === selectedAuditRombel.id) ||
            templates.find(t => t.jenjangId === kelasObj?.jenjangId && t.kelasId === kelasObj?.id && !t.rombelId) ||
            templates.find(t => t.jenjangId === kelasObj?.jenjangId && !t.kelasId && !t.rombelId) ||
            templates.find(t => !t.jenjangId) ||
            (templates.length > 0 ? templates[0] : null);
        const templateKeys = matchedTemplate ? extractTemplateKeys(matchedTemplate, 'all') : [];
        const activeSantri = santriList.filter(
            s => !s.deleted && s.rombelId === selectedAuditRombel.id && s.status === 'Aktif'
        );
        const totalSantri = activeSantri.length;
        const rombelSchedules = jadwalPelajaranList.filter(
            j => !j.deleted && j.rombelId === selectedAuditRombel.id
        );

        return templateKeys.map(tk => {
            let filledCount = 0;
            let dashCount = 0;
            activeSantri.forEach(s => {
                const cData = recMap.get(s.id);
                const raw = cData?.[tk.key];
                if (raw !== undefined && raw !== null && String(raw).trim() !== '') {
                    filledCount++;
                    if (String(raw).trim() === '-') dashCount++;
                }
            });

            const matchedMapel = findMapelInMasterPool(
                [tk.label, tk.key],
                settings.mataPelajaran || [],
                kelasObj?.jenjangId
            );
            const teacherIds = new Set<number>();
            if (matchedMapel) {
                rombelSchedules
                    .filter(j => j.mapelId === matchedMapel.id && j.guruId)
                    .forEach(j => {
                        if (j.guruId) teacherIds.add(j.guruId);
                    });
            }
            const pengampuNames = Array.from(teacherIds)
                .map(id => settings.tenagaPengajar.find(t => t.id === id)?.nama)
                .filter((n): n is string => Boolean(n));

            const percent = totalSantri > 0 ? Math.round((filledCount / totalSantri) * 100) : 0;
            const status: 'Lengkap' | 'Sebagian' | 'Kosong' =
                totalSantri === 0 || filledCount === 0
                    ? 'Kosong'
                    : filledCount >= totalSantri
                    ? 'Lengkap'
                    : 'Sebagian';

            return {
                key: tk.key,
                label: tk.label,
                sheetName: tk.sheetName,
                pengampuNames,
                filledCount,
                dashCount,
                totalSantri,
                percent,
                status
            };
        });
    }, [selectedAuditRombel, livePeriodRecords, settings, santriList, jadwalPelajaranList]);

    // Summary Totals
    const summary = useMemo(() => {
        const totalRombel = stats.length;
        const lengkap = stats.filter(s => s.status === 'Lengkap').length;
        const kosong = stats.filter(s => s.status === 'Kosong' && s.totalSantri > 0).length;
        const sebagian = stats.filter(s => s.status === 'Sebagian').length;
        return { totalRombel, lengkap, kosong, sebagian };
    }, [stats]);

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header & Filter */}
            <div className="bg-white p-4 sm:p-6 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h2 className="text-xl font-black text-gray-800">Monitoring Pengumpulan</h2>
                        <p className="text-sm text-gray-500 font-medium">
                            Pantau progres pengisian rapor oleh wali kelas &amp; guru mapel, atau bagikan Portal Audit Tanpa Login ke pengurus.
                        </p>
                    </div>

                    {/* Mobile Filter, GAS Pull & Portal Button */}
                    <div className="md:hidden w-full flex flex-wrap gap-2">
                        <button 
                            onClick={() => setIsFilterDrawerOpen(true)}
                            className="flex-1 flex items-center justify-center gap-2 px-3.5 py-2.5 bg-teal-50 text-teal-700 border border-teal-200 rounded-xl font-bold text-xs shadow-sm whitespace-nowrap"
                        >
                            <i className="bi bi-funnel-fill"></i>
                            <span>Filter Periode</span>
                        </button>
                        <RaporCloudPullControl
                            compact
                            defaultTahunAjaran={currentYear}
                            defaultSemester={filterSemester}
                        />
                        {onNavigateToTab && canWriteAkademik && (
                            <button
                                type="button"
                                onClick={() =>
                                    onNavigateToTab('generator', {
                                        generatorMode: 'audit_portal',
                                        tahunAjaran: currentYear,
                                        semester: filterSemester
                                    })
                                }
                                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-xs shadow-sm whitespace-nowrap"
                            >
                                <i className="bi bi-file-earmark-bar-graph-fill text-teal-400"></i>
                                <span>Portal Audit (.html)</span>
                            </button>
                        )}
                    </div>

                    {/* Desktop Filter, GAS Pull & Portal Button */}
                    <div className="hidden md:flex flex-wrap items-end gap-3">
                        <div className="min-w-[140px]">
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5 tracking-widest pl-1">Tahun Ajaran</label>
                            {availableYears.length > 0 ? (
                                <select value={filterTahun} onChange={e => setFilterTahun(e.target.value)} className="w-full border-2 border-gray-100 rounded-xl px-4 py-2 text-sm font-bold bg-gray-50/50 focus:bg-white focus:border-teal-500 transition-all outline-none">
                                    {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                            ) : (
                                <select value={filterTahun} onChange={e => setFilterTahun(e.target.value)} className="w-full border-2 border-gray-100 rounded-xl px-4 py-2 text-sm font-bold bg-gray-50/50 focus:bg-white focus:border-teal-500 transition-all outline-none">
                                    <option value={defaultAcademicYear}>{defaultAcademicYear}</option>
                                </select>
                            )}
                        </div>
                        <div className="min-w-[120px]">
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5 tracking-widest pl-1">Semester</label>
                            <select value={filterSemester} onChange={e => setFilterSemester(e.target.value as any)} className="w-full border-2 border-gray-100 rounded-xl px-4 py-2 text-sm font-bold bg-gray-50/50 focus:bg-white focus:border-teal-500 transition-all outline-none">
                                <option value="Ganjil">Ganjil</option>
                                <option value="Genap">Genap</option>
                            </select>
                        </div>
                        <RaporCloudPullControl
                            defaultTahunAjaran={currentYear}
                            defaultSemester={filterSemester}
                        />
                        {onNavigateToTab && canWriteAkademik && (
                            <button
                                type="button"
                                onClick={() =>
                                    onNavigateToTab('generator', {
                                        generatorMode: 'audit_portal',
                                        tahunAjaran: currentYear,
                                        semester: filterSemester
                                    })
                                }
                                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 shadow-xs"
                                title="Buat file HTML Portal Audit & Rekap Leger Tanpa Login untuk Pengurus / Kepala Madrasah"
                            >
                                <i className="bi bi-file-earmark-bar-graph-fill text-teal-400"></i>
                                <span>Portal Audit Tanpa Login (.html)</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <MobileFilterDrawer 
                isOpen={isFilterDrawerOpen} 
                onClose={() => setIsFilterDrawerOpen(false)}
                title="Filter Monitoring"
            >
                <div className="space-y-6">
                    <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100 space-y-4">
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 tracking-widest ml-1">Pilih Tahun Ajaran</label>
                            {availableYears.length > 0 ? (
                                <select value={filterTahun} onChange={e => setFilterTahun(e.target.value)} className="w-full border-2 border-white rounded-2xl p-4 text-base font-black shadow-sm focus:border-teal-500 outline-none">
                                    {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                            ) : (
                                <select value={filterTahun} onChange={e => setFilterTahun(e.target.value)} className="w-full border-2 border-white rounded-2xl p-4 text-base font-black shadow-sm focus:border-teal-500 outline-none bg-white">
                                    <option value={defaultAcademicYear}>{defaultAcademicYear}</option>
                                </select>
                            )}
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 tracking-widest ml-1">Pilih Semester</label>
                            <select value={filterSemester} onChange={e => setFilterSemester(e.target.value as any)} className="w-full border-2 border-white rounded-2xl p-4 text-base font-black shadow-sm focus:border-teal-500 outline-none">
                                <option value="Ganjil">Ganjil</option>
                                <option value="Genap">Genap</option>
                            </select>
                        </div>
                    </div>

                    <div className="p-6 bg-teal-600 rounded-[2rem] text-center shadow-xl shadow-teal-200">
                        <div className="text-[10px] font-black text-teal-100 uppercase tracking-[0.2em] mb-1">Status Pantauan</div>
                        <div className="text-3xl font-black text-white">{formatAcademicYearDisplay(settings, filterTahun)} - {filterSemester}</div>
                    </div>
                </div>
            </MobileFilterDrawer>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-lg border-l-4 border-blue-500 shadow-sm">
                    <div className="text-xs text-gray-500 font-bold uppercase">Total Rombel</div>
                    <div className="text-2xl font-bold text-gray-800">{summary.totalRombel}</div>
                </div>
                <div className="bg-white p-4 rounded-lg border-l-4 border-green-500 shadow-sm">
                    <div className="text-xs text-gray-500 font-bold uppercase">Data Lengkap</div>
                    <div className="text-2xl font-bold text-green-600">{summary.lengkap}</div>
                </div>
                <div className="bg-white p-4 rounded-lg border-l-4 border-yellow-500 shadow-sm">
                    <div className="text-xs text-gray-500 font-bold uppercase">Proses Input</div>
                    <div className="text-2xl font-bold text-yellow-600">{summary.sebagian}</div>
                </div>
                <div className="bg-white p-4 rounded-lg border-l-4 border-red-500 shadow-sm">
                    <div className="text-xs text-gray-500 font-bold uppercase">Belum Ada Data</div>
                    <div className="text-2xl font-bold text-red-600">{summary.kosong}</div>
                </div>
            </div>

            {/* Main Grid */}
            {isLoading ? (
                <div className="p-8 text-center text-gray-500"><i className="bi bi-arrow-repeat animate-spin text-2xl"></i><p className="mt-2">Memuat data audit...</p></div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {stats.map(rombel => {
                        let statusColor = 'bg-gray-100 border-gray-300';
                        let textColor = 'text-gray-500';
                        let progressBarColor = 'bg-gray-300';
                        let icon = 'bi-dash-circle';

                        if (rombel.status === 'Lengkap') {
                            statusColor = 'bg-green-50 border-green-200';
                            textColor = 'text-green-700';
                            progressBarColor = 'bg-green-500';
                            icon = 'bi-check-circle-fill';
                        } else if (rombel.status === 'Sebagian') {
                            statusColor = 'bg-yellow-50 border-yellow-200';
                            textColor = 'text-yellow-700';
                            progressBarColor = 'bg-yellow-500';
                            icon = 'bi-exclamation-circle-fill';
                        } else if (rombel.status === 'Kosong' && rombel.totalSantri > 0) {
                            statusColor = 'bg-red-50 border-red-200';
                            textColor = 'text-red-700';
                            progressBarColor = 'bg-red-500';
                            icon = 'bi-x-circle-fill';
                        }

                        return (
                            <div key={rombel.id} className={`border rounded-lg p-4 relative overflow-hidden transition-all hover:shadow-md ${statusColor}`}>
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h4 className="font-bold text-gray-800 text-lg">{rombel.nama}</h4>
                                        <p className="text-xs text-gray-600">{rombel.jenjang}</p>
                                    </div>
                                    <div className={`text-xl ${textColor}`}><i className={`bi ${icon}`}></i></div>
                                </div>
                                
                                <div className="mb-3">
                                    <div className="flex justify-between text-xs mb-1 font-medium text-gray-700">
                                        <span>Progres: {rombel.completeCount} / {rombel.totalSantri} Santri Lengkap</span>
                                        <span className="font-bold">{rombel.percent}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                                        <div className={`h-2.5 rounded-full transition-all duration-1000 ${progressBarColor}`} style={{ width: `${rombel.percent}%` }}></div>
                                    </div>
                                    <div className="flex items-center justify-between mt-1.5 text-[10px] font-bold">
                                        <span className="text-emerald-700">{rombel.completeCount} Lengkap</span>
                                        <span className="text-amber-700">{rombel.partialCount} Sebagian</span>
                                        <span className="text-rose-700">{rombel.emptyCount} Belum</span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-3 border-t border-gray-200/50 mt-3">
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center text-gray-500 border text-xs">
                                            <i className="bi bi-person-fill"></i>
                                        </div>
                                        <div>
                                            <p className="text-[9px] text-gray-400 uppercase font-bold">Wali Kelas</p>
                                            <p className="text-xs font-semibold text-gray-800 truncate max-w-[130px]">{rombel.wali}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            onClick={() => setSelectedAuditRombel(rombel)}
                                            className="px-2 py-1 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 text-[11px] font-bold rounded-lg shadow-2xs transition-all"
                                            title="Audit Kelengkapan Santri"
                                        >
                                            <i className="bi bi-list-check mr-1"></i>Audit
                                        </button>
                                        {onNavigateToTab && (
                                            <>
                                                <button
                                                    onClick={() =>
                                                        onNavigateToTab('leger', rombel.id, {
                                                            tahunAjaran: filterTahun || availableYears[0] || defaultAcademicYear,
                                                            semester: filterSemester
                                                        })
                                                    }
                                                    className="px-2 py-1 bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-bold rounded-lg shadow-2xs transition-all"
                                                    title="Buka Leger Nilai"
                                                >
                                                    <i className="bi bi-table mr-1"></i>Leger
                                                </button>
                                                <button
                                                    onClick={() =>
                                                        onNavigateToTab('print', rombel.id, {
                                                            tahunAjaran: filterTahun || availableYears[0] || defaultAcademicYear,
                                                            semester: filterSemester
                                                        })
                                                    }
                                                    className="px-2 py-1 bg-slate-700 hover:bg-slate-800 text-white text-[11px] font-bold rounded-lg shadow-2xs transition-all"
                                                    title="Buka Cetak Rapor Rombel Ini"
                                                >
                                                    <i className="bi bi-printer"></i>
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {rombel.lastUpdate && (
                                    <div className="mt-2 text-[9px] text-gray-400 text-right">
                                        Update: {rombel.lastUpdate.toLocaleDateString()}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
            
            {!isLoading && stats.length === 0 && (
                <div className="p-8 text-center bg-gray-50 border rounded-lg text-gray-500">
                    Belum ada data rombel yang dikonfigurasi. Silakan atur di Data Master.
                </div>
            )}

            {/* Audit Kelengkapan Modal */}
            {selectedAuditRombel && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
                    <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 max-h-[85vh] flex flex-col">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                            <div>
                                <h3 className="text-base font-bold text-slate-900">
                                    Audit Kelengkapan Rapor: {selectedAuditRombel.nama}
                                </h3>
                                <p className="text-xs text-slate-500">
                                    {selectedAuditRombel.jenjang} • Wali Kelas: {selectedAuditRombel.wali} • {filterTahun || defaultAcademicYear} ({filterSemester})
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedAuditRombel(null)}
                                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center"
                            >
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>

                        {/* Mode Switcher: Per Santri vs Per Mapel & Pengampu */}
                        <div className="pt-3 pb-2 border-b border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                            <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200">
                                <button
                                    type="button"
                                    onClick={() => setAuditViewTab('santri')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                        auditViewTab === 'santri'
                                            ? 'bg-white text-teal-800 shadow-2xs'
                                            : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    <i className="bi bi-people-fill"></i>
                                    <span>Per Santri ({auditStudents.length})</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setAuditViewTab('mapel')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                        auditViewTab === 'mapel'
                                            ? 'bg-white text-teal-800 shadow-2xs'
                                            : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    <i className="bi bi-journal-check"></i>
                                    <span>Per Mapel &amp; Pengampu ({auditSubjects.length})</span>
                                </button>
                            </div>
                            {auditViewTab === 'mapel' && (
                                <span className="text-[11px] text-slate-400 font-medium">
                                    Pengampu dipetakan otomatis dari Jadwal Pelajaran
                                </span>
                            )}
                        </div>

                        <div className="py-3 px-1 flex-1 overflow-y-auto">
                            {isAuditLoading ? (
                                <div className="p-12 text-center text-slate-500">
                                    <div className="w-7 h-7 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                                    <p className="mt-2 text-xs font-semibold">Memeriksa data santri...</p>
                                </div>
                            ) : auditViewTab === 'santri' ? (
                                auditStudents.length === 0 ? (
                                    <div className="p-8 text-center text-slate-400 text-xs">
                                        Tidak ada santri aktif di rombel ini.
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50 rounded-lg text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                            <span>Santri ({auditStudents.length})</span>
                                            <span>Status &amp; Aksi</span>
                                        </div>
                                        {auditStudents.map((item, idx) => (
                                            <div
                                                key={item.santri.id}
                                                className="flex items-center justify-between gap-2 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors"
                                            >
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-semibold text-slate-400 w-5 shrink-0">{idx + 1}.</span>
                                                        <span className="text-xs font-bold text-slate-800 truncate">{item.santri.namaLengkap}</span>
                                                    </div>
                                                    <div className="text-[10px] text-slate-400 pl-7 font-mono">
                                                        NIS: {item.santri.nis || '-'}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 shrink-0">
                                                    {item.isSubmitted && item.filledCount > 0 ? (
                                                        item.expectedCount > 0 && item.filledCount < item.expectedCount ? (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                                                <i className="bi bi-exclamation-circle-fill"></i>
                                                                <span>Sebagian ({item.filledCount}/{item.expectedCount})</span>
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                                <i className="bi bi-check-circle-fill"></i>
                                                                <span>Lengkap ({item.expectedCount > 0 ? `${item.filledCount}/${item.expectedCount}` : `${item.filledCount} field`})</span>
                                                            </span>
                                                        )
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                                            <i className="bi bi-x-circle-fill"></i>
                                                            <span>Belum Ada Data</span>
                                                        </span>
                                                    )}
                                                    {onNavigateToTab && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const rId = selectedAuditRombel.id;
                                                                const period = {
                                                                    tahunAjaran: filterTahun || availableYears[0] || defaultAcademicYear,
                                                                    semester: filterSemester
                                                                };
                                                                setSelectedAuditRombel(null);
                                                                onNavigateToTab(
                                                                    'input_wali',
                                                                    {
                                                                        rombelId: rId,
                                                                        santriId: item.santri.id,
                                                                        focusKey: item.firstMissingKey,
                                                                        focusNonce: Date.now()
                                                                    },
                                                                    period
                                                                );
                                                            }}
                                                            title="Lompat langsung ke baris & sel kosong santri ini"
                                                            className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white hover:bg-teal-50 text-teal-700 border border-slate-200 hover:border-teal-300 transition-colors flex items-center gap-1"
                                                        >
                                                            <i className="bi bi-box-arrow-in-right"></i>
                                                            <span>Input</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )
                            ) : auditSubjects.length === 0 ? (
                                <div className="p-8 text-center text-slate-400 text-xs">
                                    Belum ada kolom input ($KEY) pada template rapor untuk rombel ini.
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50 rounded-lg text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                        <span>Kolom Mapel &amp; Guru Pengampu</span>
                                        <span>Progres Rombel</span>
                                    </div>
                                    {auditSubjects.map((subj, idx) => (
                                        <div
                                            key={subj.key}
                                            className="p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                                        >
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-xs font-semibold text-slate-400">{idx + 1}.</span>
                                                    <span className="text-xs font-bold text-slate-800">{subj.label}</span>
                                                    <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                                        ${subj.key}
                                                    </span>
                                                    {subj.sheetName && (
                                                        <span className="text-[9px] font-bold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-100">
                                                            {subj.sheetName}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="mt-1 pl-5 flex items-center gap-1.5 flex-wrap text-[11px]">
                                                    {subj.pengampuNames.length > 0 ? (
                                                        <span className="inline-flex items-center gap-1 text-indigo-700 font-semibold">
                                                            <i className="bi bi-person-workspace text-[10px]"></i>
                                                            <span>{subj.pengampuNames.join(', ')}</span>
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-400">
                                                            Wali Kelas / Umum
                                                        </span>
                                                    )}
                                                    {subj.dashCount > 0 && (
                                                        <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                                            {subj.dashCount} bertanda &quot;-&quot;
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2.5 shrink-0 pl-5 sm:pl-0">
                                                <div className="w-28">
                                                    <div className="flex items-center justify-between text-[10px] font-bold mb-1">
                                                        <span className={
                                                            subj.status === 'Lengkap'
                                                                ? 'text-emerald-700'
                                                                : subj.status === 'Sebagian'
                                                                ? 'text-amber-700'
                                                                : 'text-rose-600'
                                                        }>
                                                            {subj.filledCount}/{subj.totalSantri}
                                                        </span>
                                                        <span className="text-slate-600">{subj.percent}%</span>
                                                    </div>
                                                    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full ${
                                                                subj.status === 'Lengkap'
                                                                    ? 'bg-emerald-500'
                                                                    : subj.status === 'Sebagian'
                                                                    ? 'bg-amber-500'
                                                                    : 'bg-rose-400'
                                                            }`}
                                                            style={{ width: `${subj.percent}%` }}
                                                        />
                                                    </div>
                                                </div>
                                                {onNavigateToTab && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const rId = selectedAuditRombel.id;
                                                            const period = {
                                                                tahunAjaran: filterTahun || availableYears[0] || defaultAcademicYear,
                                                                semester: filterSemester
                                                            };
                                                            setSelectedAuditRombel(null);
                                                            onNavigateToTab(
                                                                'input_wali',
                                                                {
                                                                    rombelId: rId,
                                                                    focusKey: subj.key,
                                                                    focusNonce: Date.now()
                                                                },
                                                                period
                                                            );
                                                        }}
                                                        title={`Buka & fokus ke kolom ${subj.label}`}
                                                        className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white hover:bg-teal-50 text-teal-700 border border-slate-200 hover:border-teal-300 transition-colors flex items-center gap-1"
                                                    >
                                                        <i className="bi bi-pencil-square"></i>
                                                        <span>Isi</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                            <button
                                onClick={() => setSelectedAuditRombel(null)}
                                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                            >
                                Tutup
                            </button>
                            <div className="flex items-center gap-2">
                                {onNavigateToTab && (
                                    <>
                                        <button
                                            onClick={() => {
                                                const rId = selectedAuditRombel.id;
                                                const period = {
                                                    tahunAjaran: filterTahun || availableYears[0] || defaultAcademicYear,
                                                    semester: filterSemester
                                                };
                                                setSelectedAuditRombel(null);
                                                onNavigateToTab('input_wali', rId, period);
                                            }}
                                            className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
                                        >
                                            <i className="bi bi-pencil-square mr-1.5"></i>Input Nilai
                                        </button>
                                        <button
                                            onClick={() => {
                                                const rId = selectedAuditRombel.id;
                                                const period = {
                                                    tahunAjaran: filterTahun || availableYears[0] || defaultAcademicYear,
                                                    semester: filterSemester
                                                };
                                                setSelectedAuditRombel(null);
                                                onNavigateToTab('print', rId, period);
                                            }}
                                            className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
                                        >
                                            <i className="bi bi-printer mr-1.5"></i>Cetak
                                        </button>
                                        <button
                                            onClick={() => {
                                                const rId = selectedAuditRombel.id;
                                                const period = {
                                                    tahunAjaran: filterTahun || availableYears[0] || defaultAcademicYear,
                                                    semester: filterSemester
                                                };
                                                setSelectedAuditRombel(null);
                                                onNavigateToTab('leger', rId, period);
                                            }}
                                            className="px-4 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-xs transition-all"
                                        >
                                            <i className="bi bi-table mr-1.5"></i>Buka Leger Nilai
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
