
import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../../AppContext';
import { useSantriContext } from '../../contexts/SantriContext';
import { RaporTemplate, RaporRecord, NilaiMapel, Santri, Rombel } from '../../types';
import { db } from '../../db';
import { MobileFilterDrawer } from '../common/MobileFilterDrawer';
import { getAcademicYearOptions, getDefaultAcademicYear } from '../../utils/academicYear';
import { getRaporRecordsByPeriod, getRaporRecordsByPeriodAndRombel } from '../../services/academicQueries';
import { useAcademicRaporYears } from '../../hooks/useAcademicRaporYears';
import { exportRaporExcelTemplate, PresensiSyncResult, getTemplateSheets, extractTemplateKeys } from '../../services/raporExcelService';
import { RaporExcelImportModal } from './RaporExcelImportModal';
import { RaporPresensiSyncModal } from './RaporPresensiSyncModal';
import { RaporWaCloudImportModal } from './RaporWaCloudImportModal';

export const TabInputNilaiWali: React.FC = () => {
    const { settings, showToast, currentUser, showConfirmation } = useAppContext();
    const { santriList } = useSantriContext();
    const defaultAcademicYear = useMemo(() => getDefaultAcademicYear(settings), [settings]);
    const archiveYears = useAcademicRaporYears();
    const availableAcademicYears = useMemo(() => getAcademicYearOptions(settings, archiveYears), [settings, archiveYears]);

    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
    const [tahunAjaran, setTahunAjaran] = useState<string>(defaultAcademicYear);
    const [semester, setSemester] = useState<'Ganjil' | 'Genap'>('Ganjil');
    
    // Modal states for Excel, Attendance Sync, and WA/Cloud Import
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isWaCloudModalOpen, setIsWaCloudModalOpen] = useState(false);
    const [isPresensiModalOpen, setIsPresensiModalOpen] = useState(false);
    const [isExportingExcel, setIsExportingExcel] = useState(false);
    const [refreshCounter, setRefreshCounter] = useState(0);
    
    // Admin Filters
    const [adminJenjangId, setAdminJenjangId] = useState<number>(0);
    const [adminKelasId, setAdminKelasId] = useState<number>(0);

    // Detect assigned Rombel
    const myRombel = useMemo(() => {
        if (!currentUser) return null;
        if (currentUser.role === 'admin') return null; // Admin uses filters
        return settings.rombel.find(r => r.waliKelasUserId === currentUser.id) || null;
    }, [currentUser, settings.rombel]);

    const [activeRombelId, setActiveRombelId] = useState<number | null>(null);
    const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

    // Derived lists for Admin
    const availableKelas = useMemo(() => adminJenjangId ? settings.kelas.filter(k => k.jenjangId === adminJenjangId) : [], [adminJenjangId, settings.kelas]);
    const availableRombel = useMemo(() => adminKelasId ? settings.rombel.filter(r => r.kelasId === adminKelasId) : [], [adminKelasId, settings.rombel]);

    const filteredTemplates = useMemo(() => {
        const rombel = activeRombelId ? settings.rombel.find(r => r.id === activeRombelId) : null;
        const kelas = rombel ? settings.kelas.find(k => k.id === rombel.kelasId) : (adminKelasId ? settings.kelas.find(k => k.id === adminKelasId) : null);
        const jenjangId = rombel ? (kelas?.jenjangId || null) : adminJenjangId;

        if (!jenjangId) return settings.raporTemplates || [];
        
        return (settings.raporTemplates || []).filter(t => {
            // Global template
            if (!t.jenjangId) return true;
            
            // Jenjang mismatch
            if (t.jenjangId !== jenjangId) return false;
            
            // Kelas lock check
            if (t.kelasId && (!kelas || t.kelasId !== kelas.id)) return false;
            
            // Rombel lock check
            if (t.rombelId && (!rombel || t.rombelId !== rombel.id)) return false;
            
            return true;
        });
    }, [activeRombelId, adminJenjangId, adminKelasId, settings.rombel, settings.kelas, settings.raporTemplates]);

    // Auto-select template if only one matches, or reset if current is invalid
    useEffect(() => {
        if (activeRombelId || adminJenjangId) {
            // If current selection is not in filtered list, reset it
            if (selectedTemplateId && !filteredTemplates.find(t => t.id === selectedTemplateId)) {
                setSelectedTemplateId('');
            }
            
            // If there's exactly one template available for this context, auto-select it
            if (filteredTemplates.length === 1 && selectedTemplateId !== filteredTemplates[0].id) {
                setSelectedTemplateId(filteredTemplates[0].id);
            }
        }
    }, [activeRombelId, adminJenjangId, filteredTemplates, selectedTemplateId]);

    useEffect(() => {
        if (myRombel && !activeRombelId) {
            setActiveRombelId(myRombel.id);
        }
    }, [myRombel]);

    useEffect(() => {
        if (!tahunAjaran.trim()) {
            setTahunAjaran(defaultAcademicYear);
        }
    }, [tahunAjaran, defaultAcademicYear]);

    // Filter students in the active selection
    const studentsInRombel = useMemo(() => {
        let list = santriList.filter(s => s.status === 'Aktif');
        
        if (currentUser?.role === 'admin') {
            if (adminJenjangId) list = list.filter(s => s.jenjangId === adminJenjangId);
            if (adminKelasId) list = list.filter(s => s.kelasId === adminKelasId);
            if (activeRombelId) list = list.filter(s => s.rombelId === activeRombelId);
        } else {
            if (!activeRombelId) return [];
            list = list.filter(s => s.rombelId === activeRombelId);
        }

        return list.sort((a, b) => {
            if (a.rombelId !== b.rombelId) return a.rombelId - b.rombelId;
            return a.namaLengkap.localeCompare(b.namaLengkap);
        });
    }, [activeRombelId, adminJenjangId, adminKelasId, santriList, currentUser]);

    // Get input keys from template
    const template = useMemo(() => {
        return (settings.raporTemplates || []).find(t => t.id === selectedTemplateId);
    }, [selectedTemplateId, settings.raporTemplates]);

    const availableSheets = useMemo(() => {
        return getTemplateSheets(template);
    }, [template]);

    const [activeInputSheetId, setActiveInputSheetId] = useState<string>('all');

    // Reset active sheet when template changes
    useEffect(() => {
        setActiveInputSheetId('all');
    }, [selectedTemplateId]);

    const inputKeys = useMemo(() => {
        if (!template) return [];
        return extractTemplateKeys(template, activeInputSheetId);
    }, [template, activeInputSheetId]);

    // State for grades: { [santriId]: { [key]: value } }
    const [grades, setGrades] = useState<Record<number, Record<string, string>>>({});
    const [existingPeriodRecords, setExistingPeriodRecords] = useState<RaporRecord[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
    const [activeStudentIndex, setActiveStudentIndex] = useState(0);

    // Load existing records if any
    useEffect(() => {
        const loadExisting = async () => {
            if (!tahunAjaran || !semester) return;
            
            let query;
            if (activeRombelId) {
                query = getRaporRecordsByPeriodAndRombel(tahunAjaran, semester, activeRombelId);
            } else if (adminJenjangId) {
                // For "All" cases, we query by year+semester and filter in memory
                query = getRaporRecordsByPeriod(tahunAjaran, semester);
            } else {
                setExistingPeriodRecords([]);
                return;
            }

            let existing = await query;
            
            // Further filter by jenjang/kelas if "All" was selected
            if (!activeRombelId && adminJenjangId) {
                existing = existing.filter(r => r.jenjangId === adminJenjangId);
                if (adminKelasId) {
                    existing = existing.filter(r => r.kelasId === adminKelasId);
                }
            }
            setExistingPeriodRecords(existing);
            
            const newGrades: Record<number, Record<string, string>> = {};
            existing.forEach(rec => {
                try {
                    const data = JSON.parse(rec.customData || '{}');
                    newGrades[rec.santriId] = data;
                } catch (e) {
                    console.error("Failed to parse customData", e);
                }
            });
            setGrades(newGrades);
        };
        loadExisting();
    }, [activeRombelId, adminJenjangId, adminKelasId, tahunAjaran, semester, refreshCounter]);

    const handleInputChange = (santriId: number, key: string, value: string) => {
        setGrades(prev => ({
            ...prev,
            [santriId]: {
                ...(prev[santriId] || {}),
                [key]: value
            }
        }));
    };

    const activeRombelName = useMemo(() => {
        if (activeRombelId) {
            return settings.rombel.find(r => r.id === activeRombelId)?.nama || '';
        }
        if (myRombel) return myRombel.nama;
        return 'Semua Rombel';
    }, [activeRombelId, settings.rombel, myRombel]);

    const saveGradesToDb = async (
        customPresensiAggregates?: Record<number, { sakit: number; izin: number; alpha: number }>,
        incomingGradesMap?: Record<number, Record<string, string>>
    ) => {
        if (!selectedTemplateId) throw new Error('Pilih template terlebih dahulu');
        if (studentsInRombel.length === 0) throw new Error('Tidak ada santri untuk disimpan');

        const existingPeriodRecords = await db.raporRecords
            .where('[tahunAjaran+semester]')
            .equals([tahunAjaran, semester])
            .toArray();

        const existingBySantri = new Map(existingPeriodRecords.map(rec => [rec.santriId, rec]));

        const promises = studentsInRombel.map(async (student) => {
            const baseGrades = grades[student.id] || {};
            const incoming = incomingGradesMap?.[student.id] || {};
            const studentGrades = { ...baseGrades, ...incoming };
            const existing = existingBySantri.get(student.id);

            const findKeyVal = (...kList: string[]): number | undefined => {
                for (const k of kList) {
                    if (studentGrades[k] !== undefined && studentGrades[k] !== '') {
                        const num = Number(studentGrades[k]);
                        if (!isNaN(num)) return num;
                    }
                }
                return undefined;
            };

            const agg = customPresensiAggregates?.[student.id];
            const sakit = agg !== undefined 
                ? agg.sakit 
                : (findKeyVal('SAKIT', 'sakit', 'S', 'ABSENSI_SAKIT') ?? (existing?.sakit || 0));
            const izin = agg !== undefined 
                ? agg.izin 
                : (findKeyVal('IZIN', 'izin', 'I', 'ABSENSI_IZIN') ?? (existing?.izin || 0));
            const alpha = agg !== undefined 
                ? agg.alpha 
                : (findKeyVal('ALPHA', 'alpha', 'ALPA', 'alpa', 'A', 'ABSENSI_ALPHA') ?? (existing?.alpha || 0));

            const findTextVal = (...kList: string[]): string | undefined => {
                for (const k of kList) {
                    if (studentGrades[k] !== undefined && String(studentGrades[k]).trim() !== '') {
                        return String(studentGrades[k]).trim();
                    }
                }
                return undefined;
            };

            const catatanWaliKelas = findTextVal('CATATAN_WALI_KELAS', 'catatanWaliKelas', 'CATATAN_WALI', 'catatan_wali') || existing?.catatanWaliKelas || '';
            const keputusan = findTextVal('KEPUTUSAN', 'keputusan') || existing?.keputusan || '';

            const record: RaporRecord = {
                id: existing?.id || Date.now() + Math.floor(Math.random() * 1000),
                santriId: student.id,
                tahunAjaran,
                semester,
                rombelId: student.rombelId,
                jenjangId: student.jenjangId,
                kelasId: student.kelasId,
                nilai: existing?.nilai || [],
                sakit,
                izin,
                alpha,
                kepribadian: existing?.kepribadian || [],
                ekstrakurikuler: existing?.ekstrakurikuler || [],
                catatanWaliKelas,
                keputusan,
                tanggalRapor: existing?.tanggalRapor || new Date().toISOString(),
                customData: JSON.stringify(studentGrades),
                lastModified: Date.now()
            };

            return db.raporRecords.put(record);
        });

        await Promise.all(promises);
    };

    const handleSave = async () => {
        if (!selectedTemplateId) return showToast('Pilih template terlebih dahulu', 'error');
        if (studentsInRombel.length === 0) return showToast('Tidak ada santri untuk disimpan', 'error');

        setIsSaving(true);
        try {
            await saveGradesToDb();
            showToast('Data nilai berhasil disimpan ke database lokal.', 'success');
        } catch (e) {
            showToast('Gagal menyimpan data: ' + (e as Error).message, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleExportExcel = async () => {
        if (studentsInRombel.length === 0) {
            showToast('Tidak ada santri aktif di rombel ini untuk diunduh.', 'info');
            return;
        }
        try {
            setIsExportingExcel(true);
            const fileName = await exportRaporExcelTemplate({
                template,
                santriList: studentsInRombel,
                rombelName: activeRombelName,
                tahunAjaran,
                semester,
                currentGrades: grades
            });
            showToast(`Template ${fileName} berhasil diunduh.`, 'success');
        } catch (err: any) {
            showToast('Gagal mengunduh template Excel: ' + err.message, 'error');
        } finally {
            setIsExportingExcel(false);
        }
    };

    const handlePresensiSyncSuccess = async (syncResult: PresensiSyncResult, shouldSaveToDb: boolean) => {
        const sakitKey = inputKeys.find(k => ['sakit', 's', 'absensi_sakit'].includes(k.key.toLowerCase()))?.key || 'SAKIT';
        const izinKey = inputKeys.find(k => ['izin', 'i', 'absensi_izin'].includes(k.key.toLowerCase()))?.key || 'IZIN';
        const alphaKey = inputKeys.find(k => ['alpha', 'alpa', 'a', 'absensi_alpha'].includes(k.key.toLowerCase()))?.key || 'ALPHA';

        setGrades(prev => {
            const next = { ...prev };
            studentsInRombel.forEach(student => {
                const agg = syncResult.aggregates[student.id] || { sakit: 0, izin: 0, alpha: 0 };
                next[student.id] = {
                    ...(next[student.id] || {}),
                    [sakitKey]: String(agg.sakit),
                    [izinKey]: String(agg.izin),
                    [alphaKey]: String(agg.alpha),
                };
            });
            return next;
        });

        if (shouldSaveToDb) {
            await saveGradesToDb(syncResult.aggregates);
        }
    };

    const handleExcelImportSuccess = async (importedGrades: Record<number, Record<string, string>>, shouldSaveToDb: boolean) => {
        setGrades(prev => {
            const next = { ...prev };
            Object.entries(importedGrades).forEach(([sIdStr, gradesObj]) => {
                const sId = Number(sIdStr);
                next[sId] = {
                    ...(next[sId] || {}),
                    ...gradesObj
                };
            });
            return next;
        });

        if (shouldSaveToDb) {
            await saveGradesToDb(undefined, importedGrades);
        }
    };

    if (!myRombel && currentUser?.role !== 'admin') {
        return (
            <div className="p-10 text-center bg-gray-50 rounded-xl border-2 border-dashed">
                <i className="bi bi-person-x text-5xl text-gray-300 mb-4 block"></i>
                <h3 className="text-xl font-bold text-gray-700">Akses Terbatas</h3>
                <p className="text-gray-500">Akun Anda belum terdaftar sebagai Wali Kelas di Rombel manapun.</p>
                <p className="text-sm text-gray-400 mt-2">Silakan hubungi Admin untuk pengaturan Wali Kelas.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="bg-white p-4 rounded-xl border shadow-sm flex flex-col gap-4">
                {/* Mobile Filter & Quick Action Trigger */}
                <div className="md:hidden flex items-center gap-2">
                    <button 
                        onClick={() => setIsFilterDrawerOpen(true)}
                        className="flex-grow flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-50 text-teal-700 border border-teal-200 rounded-xl font-bold text-sm shadow-sm"
                    >
                        <i className="bi bi-funnel-fill"></i>
                        <span>Filter & Aksi</span>
                    </button>
                    <button 
                        onClick={() => setIsPresensiModalOpen(true)}
                        disabled={studentsInRombel.length === 0}
                        title="Tarik Presensi"
                        className="w-[42px] h-[42px] flex items-center justify-center bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl disabled:opacity-50"
                    >
                        <i className="bi bi-clock-history text-lg"></i>
                    </button>
                    <button 
                        onClick={() => setIsImportModalOpen(true)}
                        disabled={studentsInRombel.length === 0}
                        title="Import Excel"
                        className="w-[42px] h-[42px] flex items-center justify-center bg-teal-50 text-teal-700 border border-teal-200 rounded-xl disabled:opacity-50"
                    >
                        <i className="bi bi-file-earmark-arrow-up text-lg"></i>
                    </button>
                    <button 
                        onClick={handleSave} 
                        disabled={isSaving || !selectedTemplateId || studentsInRombel.length === 0}
                        title="Simpan Nilai"
                        className="shrink-0 w-[42px] h-[42px] flex items-center justify-center bg-teal-600 text-white rounded-xl shadow-lg shadow-teal-100 disabled:opacity-50"
                    >
                        {isSaving ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : <i className="bi bi-save2-fill text-lg"></i>}
                    </button>
                </div>

                {/* Desktop Filter Row */}
                <div className="hidden md:grid md:grid-cols-4 lg:grid-cols-6 gap-3 items-end">
                    <div className="md:col-span-1">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 tracking-widest pl-1">Tahun Ajaran</label>
                        <select value={tahunAjaran} onChange={e => setTahunAjaran(e.target.value)} className="w-full border rounded-lg p-2 text-xs font-bold bg-gray-50 focus:bg-white focus:ring-2 focus:ring-teal-500 transition-all">
                            {availableAcademicYears.map((year) => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </select>
                    </div>
                    <div className="md:col-span-1">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 tracking-widest pl-1">Semester</label>
                        <select value={semester} onChange={e => setSemester(e.target.value as any)} className="w-full border rounded-lg p-2 text-xs font-bold bg-gray-50 focus:bg-white focus:ring-2 focus:ring-teal-500 transition-all">
                            <option value="Ganjil">Ganjil</option>
                            <option value="Genap">Genap</option>
                        </select>
                    </div>

                    {currentUser?.role === 'admin' ? (
                        <>
                            <div className="md:col-span-1">
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 tracking-widest pl-1">Jenjang</label>
                                <select value={adminJenjangId} onChange={e => {setAdminJenjangId(Number(e.target.value)); setAdminKelasId(0); setActiveRombelId(null)}} className="w-full border rounded-lg p-2 text-xs font-bold bg-gray-50 focus:bg-white focus:ring-2 focus:ring-teal-500 transition-all">
                                    <option value={0}>Pilih Jenjang</option>
                                    {settings.jenjang.map(j => <option key={j.id} value={j.id}>{j.nama}</option>)}
                                </select>
                            </div>
                            <div className="md:col-span-1">
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 tracking-widest pl-1">Kelas</label>
                                <select value={adminKelasId} onChange={e => {setAdminKelasId(Number(e.target.value)); setActiveRombelId(0)}} disabled={!adminJenjangId} className="w-full border rounded-lg p-2 text-xs font-bold disabled:bg-gray-100 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-teal-500 transition-all">
                                    <option value={0}>Semua Kelas</option>
                                    {availableKelas.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
                                </select>
                            </div>
                            <div className="lg:col-span-1">
                                <label className="block text-[10px] font-bold text-teal-600 uppercase mb-1 tracking-widest pl-1">Rombel</label>
                                <select value={activeRombelId || 0} onChange={e => setActiveRombelId(parseInt(e.target.value))} disabled={!adminJenjangId} className="w-full border-2 border-teal-100 rounded-lg p-2 text-xs font-black bg-teal-50/20 disabled:bg-gray-50 focus:bg-white focus:ring-2 focus:ring-teal-500 transition-all">
                                    <option value={0}>Pilih Rombel</option>
                                    {availableRombel.map(r => <option key={r.id} value={r.id}>{r.nama}</option>)}
                                </select>
                            </div>
                        </>
                    ) : (
                        <div className="md:col-span-1">
                            <label className="block text-[10px] font-bold text-teal-600 uppercase mb-1 tracking-widest pl-1">Rombel Anda</label>
                            <div className="bg-teal-50 text-teal-700 px-3 py-2 rounded-lg border border-teal-100 font-bold text-xs text-center truncate">
                                {myRombel?.nama}
                            </div>
                        </div>
                    )}

                    <div className="lg:col-span-1">
                        <label className="block text-[10px] font-bold text-teal-600 uppercase mb-1 tracking-widest pl-1">Template Rapor</label>
                        <select value={selectedTemplateId} onChange={e => setSelectedTemplateId(e.target.value)} className="w-full border-2 border-teal-100 rounded-lg p-2 text-xs font-black bg-teal-50 focus:bg-white focus:ring-2 focus:ring-teal-500 transition-all">
                            <option value="">Pilih Template</option>
                            {filteredTemplates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </div>
                </div>

                {/* Desktop Action Toolbar */}
                <div className="hidden md:flex items-center justify-between pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5">
                            <i className="bi bi-person-badge text-teal-600"></i>
                            <span>{activeRombelName}</span>
                        </span>
                        <span className="px-2.5 py-1 bg-teal-50 border border-teal-200 text-teal-800 rounded-lg text-xs font-bold">
                            {studentsInRombel.length} Santri
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Sinkronisasi Presensi Otomatis */}
                        <button
                            type="button"
                            onClick={() => setIsPresensiModalOpen(true)}
                            disabled={studentsInRombel.length === 0}
                            className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50"
                        >
                            <i className="bi bi-clock-history text-emerald-600"></i>
                            <span>Tarik Presensi</span>
                        </button>

                        {/* Unduh Template Excel */}
                        <button
                            type="button"
                            onClick={handleExportExcel}
                            disabled={isExportingExcel || studentsInRombel.length === 0}
                            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50"
                        >
                            {isExportingExcel ? (
                                <span className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></span>
                            ) : (
                                <i className="bi bi-download text-teal-600"></i>
                            )}
                            <span>Unduh Excel</span>
                        </button>

                        {/* Import File Excel */}
                        <button
                            type="button"
                            onClick={() => setIsImportModalOpen(true)}
                            disabled={studentsInRombel.length === 0}
                            className="px-3.5 py-2 bg-white hover:bg-teal-50 text-teal-800 border border-teal-200 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50"
                            title="Import nilai siswa dari file Excel"
                        >
                            <i className="bi bi-file-earmark-arrow-up text-teal-600"></i>
                            <span>Import Excel</span>
                        </button>

                        {/* Import WA / Cloud */}
                        <button
                            type="button"
                            onClick={() => setIsWaCloudModalOpen(true)}
                            className="px-3.5 py-2 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
                            title="Import nilai via WhatsApp text atau Google Cloud Web App"
                        >
                            <i className="bi bi-whatsapp text-emerald-600"></i>
                            <span>Import WA / Cloud</span>
                        </button>

                        {/* Simpan Nilai */}
                        <button
                            type="button"
                            onClick={handleSave} 
                            disabled={isSaving || !selectedTemplateId || studentsInRombel.length === 0}
                            className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-black shadow-md shadow-teal-600/20 disabled:opacity-50 transition-all flex items-center gap-1.5"
                        >
                            {isSaving ? (
                                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                            ) : (
                                <i className="bi bi-floppy"></i>
                            )}
                            <span>Simpan Nilai</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Filter Drawer */}
            <MobileFilterDrawer 
                isOpen={isFilterDrawerOpen} 
                onClose={() => setIsFilterDrawerOpen(false)}
                title="Pengaturan Input"
            >
                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest pl-1">Tahun Ajaran</label>
                            <select value={tahunAjaran} onChange={e => setTahunAjaran(e.target.value)} className="w-full border-2 border-white rounded-xl p-3 text-sm font-bold shadow-sm focus:border-teal-500 outline-none">
                                {availableAcademicYears.map((year) => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest pl-1">Semester</label>
                            <select value={semester} onChange={e => setSemester(e.target.value as any)} className="w-full border-2 border-white rounded-xl p-3 text-sm font-bold shadow-sm focus:border-teal-500 outline-none">
                                <option value="Ganjil">Ganjil</option>
                                <option value="Genap">Genap</option>
                            </select>
                        </div>
                    </div>

                    {currentUser?.role === 'admin' ? (
                        <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100 space-y-4">
                            <h4 className="text-xs font-black text-teal-700 uppercase tracking-widest flex items-center gap-2"><i className="bi bi-funnel"></i> Filter Rombel</h4>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 tracking-widest ml-1">Pilih Jenjang</label>
                                    <select value={adminJenjangId} onChange={e => {setAdminJenjangId(Number(e.target.value)); setAdminKelasId(0); setActiveRombelId(null)}} className="w-full border-2 border-white rounded-2xl p-4 text-base font-bold shadow-sm focus:border-teal-500 outline-none">
                                        <option value={0}>Pilih Jenjang</option>
                                        {settings.jenjang.map(j => <option key={j.id} value={j.id}>{j.nama}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 tracking-widest ml-1">Pilih Kelas</label>
                                    <select value={adminKelasId} onChange={e => {setAdminKelasId(Number(e.target.value)); setActiveRombelId(0)}} disabled={!adminJenjangId} className="w-full border-2 border-white rounded-2xl p-4 text-base font-bold shadow-sm focus:border-teal-500 outline-none disabled:opacity-50">
                                        <option value={0}>Semua Kelas</option>
                                        {availableKelas.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
                                    </select>
                                </div>
                                <div className="pt-2">
                                    <label className="block text-[10px] font-black text-teal-600 uppercase mb-1.5 tracking-widest ml-1">Pilih Rombongan Belajar</label>
                                    <select value={activeRombelId || 0} onChange={e => setActiveRombelId(parseInt(e.target.value))} disabled={!adminJenjangId} className="w-full border-2 border-teal-100 rounded-2xl p-4 text-base font-black bg-teal-50 shadow-sm focus:border-teal-500 outline-none disabled:opacity-50">
                                        <option value={0}>Pilih Rombel</option>
                                        {availableRombel.map(r => <option key={r.id} value={r.id}>{r.nama}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-teal-50 p-6 rounded-3xl border border-teal-100 text-center">
                            <span className="text-[10px] font-black text-teal-600 uppercase tracking-widest block mb-1">Rombel Pengampu</span>
                            <span className="text-xl font-black text-teal-900">{myRombel?.nama}</span>
                        </div>
                    )}

                    <div className="bg-teal-50/50 p-6 rounded-[2rem] border-2 border-teal-100">
                        <label className="block text-xs font-black text-teal-700 uppercase mb-3 tracking-widest ml-1">Template Rapor</label>
                        <select value={selectedTemplateId} onChange={e => setSelectedTemplateId(e.target.value)} className="w-full border-2 border-white rounded-2xl p-4 text-lg font-black text-teal-900 bg-white shadow-xl shadow-teal-900/5 focus:border-teal-500 outline-none">
                            <option value="">Pilih Template Rapor</option>
                            {filteredTemplates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </div>

                    {/* Mobile Quick Action Buttons */}
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2.5">
                        <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-widest pl-1">Aksi Cepat Data</h4>
                        <div className="grid grid-cols-1 gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsFilterDrawerOpen(false);
                                    setIsPresensiModalOpen(true);
                                }}
                                disabled={studentsInRombel.length === 0}
                                className="w-full py-2.5 px-4 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl font-bold text-xs flex items-center justify-center gap-2"
                            >
                                <i className="bi bi-clock-history text-emerald-600"></i>
                                <span>Tarik Presensi Otomatis</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsFilterDrawerOpen(false);
                                    handleExportExcel();
                                }}
                                disabled={isExportingExcel || studentsInRombel.length === 0}
                                className="w-full py-2.5 px-4 bg-white text-slate-700 border border-slate-200 rounded-xl font-bold text-xs flex items-center justify-center gap-2"
                            >
                                <i className="bi bi-download text-teal-600"></i>
                                <span>Unduh Template Excel</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsFilterDrawerOpen(false);
                                    setIsImportModalOpen(true);
                                }}
                                disabled={studentsInRombel.length === 0}
                                className="w-full py-2.5 px-4 bg-teal-50 text-teal-800 border border-teal-200 rounded-xl font-bold text-xs flex items-center justify-center gap-2"
                            >
                                <i className="bi bi-file-earmark-arrow-up text-teal-600"></i>
                                <span>Import File Excel</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsFilterDrawerOpen(false);
                                    setIsWaCloudModalOpen(true);
                                }}
                                className="w-full py-2.5 px-4 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl font-bold text-xs flex items-center justify-center gap-2"
                            >
                                <i className="bi bi-whatsapp text-emerald-600"></i>
                                <span>Import WA / Cloud</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsFilterDrawerOpen(false);
                                    handleSave();
                                }}
                                disabled={isSaving || !selectedTemplateId || studentsInRombel.length === 0}
                                className="w-full py-2.5 px-4 bg-teal-600 text-white rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-md shadow-teal-600/20"
                            >
                                {isSaving ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span> : <i className="bi bi-floppy"></i>}
                                <span>Simpan Nilai Rombel</span>
                            </button>
                        </div>
                    </div>
                </div>
            </MobileFilterDrawer>

            {!selectedTemplateId ? (
                <div className="p-20 text-center bg-gray-50 rounded-xl border-2 border-dashed">
                    <i className="bi bi-file-earmark-spreadsheet text-5xl text-gray-300 mb-4 block"></i>
                    <p className="text-gray-500">Silakan pilih <strong>Template Rapor</strong> untuk memulai pengisian nilai.</p>
                </div>
            ) : studentsInRombel.length === 0 ? (
                <div className="p-20 text-center bg-gray-50 rounded-xl border-2 border-dashed">
                    <i className="bi bi-people text-5xl text-gray-300 mb-4 block"></i>
                    <p className="text-gray-500">Tidak ada santri aktif di rombel ini.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {/* View Switcher & Counter Header */}
                    <div className="bg-white p-3 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Tampilan Input:</span>
                            <div className="inline-flex rounded-lg bg-gray-100 p-1 border">
                                <button
                                    type="button"
                                    onClick={() => setViewMode('table')}
                                    className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all ${viewMode === 'table' ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                                >
                                    <i className="bi bi-table"></i>
                                    <span>Tabel Leger (Desktop)</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setViewMode('card')}
                                    className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all ${viewMode === 'card' ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                                >
                                    <i className="bi bi-card-text"></i>
                                    <span>Form Kartu (Mobile Friendly)</span>
                                </button>
                            </div>
                        </div>
                        <div className="text-xs font-semibold text-gray-500 flex items-center gap-2">
                            <span className="bg-teal-50 text-teal-700 border border-teal-200 px-2.5 py-1 rounded-full text-xs font-bold">
                                Total: {studentsInRombel.length} Santri
                            </span>
                        </div>
                    </div>

                    {/* TABLE MODE */}
                    {viewMode === 'table' && (
                        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                            {/* Multi-Sheet Tab Navigation for Table Mode */}
                            {availableSheets.length > 1 && (
                                <div className="bg-slate-50 border-b px-4 py-2 flex items-center gap-2 overflow-x-auto select-none no-scrollbar">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
                                        <i className="bi bi-collection"></i> Lembar Input:
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setActiveInputSheetId('all')}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                                            activeInputSheetId === 'all'
                                                ? 'bg-teal-700 text-white shadow-sm'
                                                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                                        }`}
                                    >
                                        <span>Semua Lembar</span>
                                        <span className="text-[10px] opacity-80 bg-black/20 px-1.5 py-0.5 rounded-full">
                                            {extractTemplateKeys(template, 'all').length}
                                        </span>
                                    </button>
                                    {availableSheets.map((sh) => {
                                        const count = extractTemplateKeys(template, sh.id).length;
                                        const isActive = activeInputSheetId === sh.id;
                                        return (
                                            <button
                                                key={sh.id}
                                                type="button"
                                                onClick={() => setActiveInputSheetId(sh.id)}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                                                    isActive
                                                        ? 'bg-teal-700 text-white shadow-sm'
                                                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                                                }`}
                                            >
                                                <i className="bi bi-file-earmark-spreadsheet"></i>
                                                <span>{sh.name}</span>
                                                <span className="text-[10px] opacity-80 bg-black/20 px-1.5 py-0.5 rounded-full">
                                                    {count}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 text-gray-600 border-b">
                                        <tr>
                                            <th className="p-4 w-12 text-center">No</th>
                                            <th className="p-4 min-w-[200px]">Nama Santri</th>
                                            {inputKeys.map(k => (
                                                <th key={k.key} className="p-4 text-center min-w-[100px]">
                                                    {activeInputSheetId === 'all' && k.sheetName && (
                                                        <div className="text-[9px] font-bold text-teal-600 uppercase tracking-tight bg-teal-50 px-1.5 py-0.5 rounded inline-block mb-1 border border-teal-100 truncate max-w-[110px]">
                                                            {k.sheetName}
                                                        </div>
                                                    )}
                                                    <div className="text-[10px] text-gray-400 uppercase mb-0.5 font-mono">${k.key}</div>
                                                    <div className="text-xs font-bold text-gray-700">{k.label}</div>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {studentsInRombel.map((student, idx) => {
                                            const prevStudent = idx > 0 ? studentsInRombel[idx - 1] : null;
                                            const showRombelHeader = !prevStudent || prevStudent.rombelId !== student.rombelId;
                                            const rombelName = settings.rombel.find(r => r.id === student.rombelId)?.nama || 'Tanpa Rombel';

                                            return (
                                                <React.Fragment key={student.id}>
                                                    {showRombelHeader && (
                                                        <tr className="bg-blue-50/50">
                                                            <td colSpan={2 + inputKeys.length} className="p-2 px-4 text-xs font-bold text-blue-700 uppercase tracking-wider">
                                                                📦 Rombel: {rombelName}
                                                            </td>
                                                        </tr>
                                                    )}
                                                    <tr className="hover:bg-gray-50 transition-colors">
                                                        <td className="p-4 text-center text-gray-400">{idx + 1}</td>
                                                        <td className="p-4">
                                                            <div className="font-bold text-gray-800">{student.namaLengkap}</div>
                                                            <div className="text-[10px] text-gray-400 font-mono">{student.nis}</div>
                                                        </td>
                                                        {inputKeys.map(k => (
                                                            <td key={k.key} className="p-2">
                                                                {k.type === 'dropdown' ? (
                                                                    <select 
                                                                        value={grades[student.id]?.[k.key] || ''} 
                                                                        onChange={e => handleInputChange(student.id, k.key, e.target.value)}
                                                                        className="w-full border rounded p-2 text-center focus:ring-2 focus:ring-teal-500 outline-none"
                                                                    >
                                                                        <option value=""></option>
                                                                        {k.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                                    </select>
                                                                ) : (
                                                                    <input 
                                                                        type="text" 
                                                                        value={grades[student.id]?.[k.key] || ''} 
                                                                        onChange={e => handleInputChange(student.id, k.key, e.target.value)}
                                                                        className="w-full border rounded p-2 text-center focus:ring-2 focus:ring-teal-500 outline-none font-mono"
                                                                        placeholder="0"
                                                                    />
                                                                )}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                </React.Fragment>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* CARD / MOBILE STEPPER MODE */}
                    {viewMode === 'card' && (() => {
                        const currentStudent = studentsInRombel[activeStudentIndex] || studentsInRombel[0];
                        const rombelName = settings.rombel.find(r => r.id === currentStudent?.rombelId)?.nama || 'Tanpa Rombel';

                        return (
                            <div className="bg-white rounded-2xl border shadow-md overflow-hidden max-w-2xl mx-auto">
                                {/* Top Student Selector Header */}
                                <div className="bg-gradient-to-r from-teal-700 to-emerald-700 p-4 text-white">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-xs font-bold bg-white/20 px-2.5 py-0.5 rounded-full backdrop-blur-sm">
                                            Santri #{activeStudentIndex + 1} dari {studentsInRombel.length}
                                        </span>
                                        <span className="text-xs font-bold text-teal-100">
                                            📦 {rombelName}
                                        </span>
                                    </div>
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                        <div>
                                            <h3 className="text-lg font-black tracking-tight">{currentStudent?.namaLengkap}</h3>
                                            <p className="text-xs text-teal-100 font-mono">NIS: {currentStudent?.nis || '-'}</p>
                                        </div>
                                        <select 
                                            value={activeStudentIndex} 
                                            onChange={e => setActiveStudentIndex(Number(e.target.value))}
                                            className="bg-white text-gray-900 text-xs font-bold rounded-lg px-3 py-2 border-0 outline-none shadow-sm cursor-pointer"
                                        >
                                            {studentsInRombel.map((s, idx) => (
                                                <option key={s.id} value={idx}>
                                                    {idx + 1}. {s.namaLengkap}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Multi-Sheet Tab Navigation for Card Mode */}
                                {availableSheets.length > 1 && (
                                    <div className="bg-slate-100 border-b px-4 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                                        <button
                                            type="button"
                                            onClick={() => setActiveInputSheetId('all')}
                                            className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all shrink-0 ${
                                                activeInputSheetId === 'all'
                                                    ? 'bg-teal-700 text-white shadow-sm'
                                                    : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                                            }`}
                                        >
                                            Semua ({extractTemplateKeys(template, 'all').length})
                                        </button>
                                        {availableSheets.map(sh => (
                                            <button
                                                key={sh.id}
                                                type="button"
                                                onClick={() => setActiveInputSheetId(sh.id)}
                                                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all shrink-0 ${
                                                    activeInputSheetId === sh.id
                                                        ? 'bg-teal-700 text-white shadow-sm'
                                                        : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                                                }`}
                                            >
                                                {sh.name} ({extractTemplateKeys(template, sh.id).length})
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Form Fields */}
                                <div className="p-5 space-y-3 max-h-[60vh] overflow-y-auto bg-gray-50/50">
                                    {inputKeys.map(k => {
                                        const val = grades[currentStudent?.id]?.[k.key] || '';
                                        return (
                                            <div key={k.key} className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        {activeInputSheetId === 'all' && k.sheetName && (
                                                            <span className="text-[9px] font-bold bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded border border-purple-200">
                                                                {k.sheetName}
                                                            </span>
                                                        )}
                                                        <span className="text-[10px] font-bold bg-teal-50 text-teal-700 px-1.5 py-0.5 rounded border border-teal-200 font-mono">
                                                            ${k.key}
                                                        </span>
                                                        <span className="text-xs font-bold text-gray-800">{k.label}</span>
                                                    </div>
                                                </div>
                                                <div className="w-full sm:w-48">
                                                    {k.type === 'dropdown' ? (
                                                        <select 
                                                            value={val} 
                                                            onChange={e => handleInputChange(currentStudent.id, k.key, e.target.value)}
                                                            className="w-full border-2 border-gray-200 rounded-lg p-2 text-sm font-bold text-gray-800 focus:border-teal-500 outline-none bg-white"
                                                        >
                                                            <option value="">-- Pilih --</option>
                                                            {k.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                        </select>
                                                    ) : (
                                                        <input 
                                                            type="text" 
                                                            value={val} 
                                                            onChange={e => handleInputChange(currentStudent.id, k.key, e.target.value)}
                                                            className="w-full border-2 border-gray-200 rounded-lg p-2 text-sm font-bold text-center font-mono focus:border-teal-500 outline-none bg-white"
                                                            placeholder="0"
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Bottom Stepper Footer */}
                                <div className="p-4 bg-white border-t flex items-center justify-between gap-2">
                                    <button 
                                        type="button"
                                        disabled={activeStudentIndex === 0}
                                        onClick={() => setActiveStudentIndex(prev => Math.max(0, prev - 1))}
                                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-200 disabled:opacity-40 flex items-center gap-1 transition-all"
                                    >
                                        <i className="bi bi-chevron-left"></i> Santri Sebelumnya
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={handleSave}
                                        disabled={isSaving}
                                        className="px-4 py-2 bg-teal-600 text-white rounded-xl text-xs font-bold hover:bg-teal-700 disabled:opacity-50 shadow-sm flex items-center gap-1 transition-all"
                                    >
                                        <i className="bi bi-save2"></i> Simpan
                                    </button>
                                    <button 
                                        type="button"
                                        disabled={activeStudentIndex === studentsInRombel.length - 1}
                                        onClick={() => setActiveStudentIndex(prev => Math.min(studentsInRombel.length - 1, prev + 1))}
                                        className="px-4 py-2 bg-teal-50 text-teal-800 border border-teal-200 rounded-xl text-xs font-bold hover:bg-teal-100 disabled:opacity-40 flex items-center gap-1 transition-all"
                                    >
                                        Santri Berikutnya <i className="bi bi-chevron-right"></i>
                                    </button>
                                </div>
                            </div>
                        );
                    })()}
                </div>
            )}

            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-blue-800 text-xs flex gap-3">
                <i className="bi bi-info-circle-fill text-lg"></i>
                <div>
                    <p className="font-bold mb-1">Informasi Pengisian:</p>
                    <ul className="list-disc pl-4 space-y-1">
                        <li>Nilai yang Anda masukkan di sini akan langsung tersimpan di database aplikasi.</li>
                        <li>Gunakan tombol <strong>Simpan Nilai</strong> di pojok kanan atas untuk memperbarui data.</li>
                        <li>Pastikan <strong>Tahun Ajaran</strong> dan <strong>Semester</strong> sudah sesuai sebelum mulai mengisi.</li>
                        <li>Data ini akan digunakan saat mencetak rapor di tab "Cetak Rapor".</li>
                    </ul>
                </div>
            </div>

            {/* Modal Import Excel Rapor */}
            <RaporExcelImportModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                template={template}
                santriList={studentsInRombel}
                rombelName={activeRombelName}
                tahunAjaran={tahunAjaran}
                semester={semester}
                onImportSuccess={handleExcelImportSuccess}
            />

            {/* Modal Sinkronisasi Presensi Otomatis */}
            <RaporPresensiSyncModal
                isOpen={isPresensiModalOpen}
                onClose={() => setIsPresensiModalOpen(false)}
                santriList={studentsInRombel}
                rombelName={activeRombelName}
                tahunAjaran={tahunAjaran}
                semester={semester}
                settings={settings}
                onSyncSuccess={handlePresensiSyncSuccess}
            />

            {/* Modal Import WA & Cloud Script */}
            <RaporWaCloudImportModal
                isOpen={isWaCloudModalOpen}
                onClose={() => setIsWaCloudModalOpen(false)}
                onSuccess={() => {
                    setRefreshCounter(c => c + 1);
                    showToast('Data rapor berhasil diperbarui.', 'success');
                }}
            />
        </div>
    );
};
