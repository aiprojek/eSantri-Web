import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../../AppContext';
import { useSantriContext } from '../../contexts/SantriContext';
import { AbsensiRecord, Santri, SesiAbsensi } from '../../types';
import { SESI_ABSENSI_LIST, AtRiskSantriInfo } from './absensiConstants';
import { AbsensiCardGrid } from './AbsensiCardGrid';
import { AbsensiTableView } from './AbsensiTableView';
import { AbsensiWaModal, AbsentStudentItem } from './AbsensiWaModal';
import { AbsensiBkModal } from './AbsensiBkModal';
import { AbsensiWarningBanner } from './AbsensiWarningBanner';
import { MobileFilterDrawer } from '../common/MobileFilterDrawer';
import { JurnalMengajarModal } from '../akademik/modals/JurnalMengajarModal';

export const AbsensiInput: React.FC = () => {
    const { settings, showToast, currentUser } = useAppContext();
    const { santriList, absensiList, onSaveAbsensi } = useSantriContext();
    const canWrite = currentUser?.role === 'admin' || currentUser?.permissions?.absensi === 'write';

    const [selectedJenjangId, setSelectedJenjangId] = useState<number>(0);
    const [selectedKelasId, setSelectedKelasId] = useState<number>(0);
    const [selectedRombelId, setSelectedRombelId] = useState<number>(0);
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [selectedSesi, setSelectedSesi] = useState<SesiAbsensi>('KBM Pagi');

    const [view, setView] = useState<'selector' | 'input'>('selector');
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
    const [searchFilter, setSearchFilter] = useState<string>('');
    const [isSelectorDrawerOpen, setIsSelectorDrawerOpen] = useState(false);
    
    // State Attendance Data
    const [attendanceMap, setAttendanceMap] = useState<Record<number, AbsensiRecord['status']>>({});
    const [notesMap, setNotesMap] = useState<Record<number, string>>({});
    const [isSaving, setIsSaving] = useState(false);
    
    // Modals
    const [isJurnalModalOpen, setIsJurnalModalOpen] = useState(false);
    const [isWaModalOpen, setIsWaModalOpen] = useState(false);
    const [waInitialSantriId, setWaInitialSantriId] = useState<number | null>(null);
    const [isBkModalOpen, setIsBkModalOpen] = useState(false);
    const [bkTargetSantri, setBkTargetSantri] = useState<Santri | null>(null);
    const [bkTargetReason, setBkTargetReason] = useState<string>('');

    useEffect(() => {
        if (currentUser && currentUser.role === 'staff' && settings.rombel.length === 1) {
            const r = settings.rombel[0];
            setSelectedRombelId(r.id);
            setSelectedKelasId(r.kelasId);
            const k = settings.kelas.find(k => k.id === r.kelasId);
            if (k) setSelectedJenjangId(k.jenjangId);
        }
    }, [currentUser, settings.rombel]);

    const availableKelas = useMemo(() => settings.kelas.filter(k => k.jenjangId === selectedJenjangId), [selectedJenjangId, settings.kelas]);
    const availableRombel = useMemo(() => settings.rombel.filter(r => r.kelasId === selectedKelasId), [selectedKelasId, settings.rombel]);

    const targetSantri = useMemo(() => {
        if (!selectedRombelId) return [];
        return santriList
            .filter(s => s.rombelId === selectedRombelId && s.status === 'Aktif')
            .sort((a,b) => a.namaLengkap.localeCompare(b.namaLengkap));
    }, [selectedRombelId, santriList]);

    const filteredTargetSantri = useMemo(() => {
        if (!searchFilter.trim()) return targetSantri;
        const query = searchFilter.toLowerCase();
        return targetSantri.filter(s => 
            s.namaLengkap.toLowerCase().includes(query) || 
            s.nis.toLowerCase().includes(query)
        );
    }, [targetSantri, searchFilter]);

    const existingRecords = useMemo(() => {
        if (!selectedRombelId || !selectedDate) return [];
        return absensiList.filter(a => {
            const matchSesi = a.sesi ? a.sesi === selectedSesi : selectedSesi === 'KBM Pagi';
            return a.rombelId === selectedRombelId && a.tanggal === selectedDate && matchSesi;
        });
    }, [absensiList, selectedRombelId, selectedDate, selectedSesi]);

    // Calculate At-Risk Students for the current rombel (Early Warning System)
    const atRiskStudents = useMemo<AtRiskSantriInfo[]>(() => {
        if (!selectedRombelId || targetSantri.length === 0) return [];

        const currentMonth = new Date(selectedDate).getMonth() + 1;
        const currentYear = new Date(selectedDate).getFullYear();

        const monthRecords = absensiList.filter(a => {
            const d = new Date(a.tanggal);
            return a.rombelId === selectedRombelId && d.getMonth() + 1 === currentMonth && d.getFullYear() === currentYear;
        });

        const studentStats: Record<number, { H: number; S: number; I: number; A: number; reasons: string[] }> = {};
        targetSantri.forEach(s => {
            studentStats[s.id] = { H: 0, S: 0, I: 0, A: 0, reasons: [] };
        });

        monthRecords.forEach(rec => {
            if (studentStats[rec.santriId]) {
                if (rec.status === 'H') studentStats[rec.santriId].H++;
                else if (rec.status === 'S') studentStats[rec.santriId].S++;
                else if (rec.status === 'I') studentStats[rec.santriId].I++;
                else if (rec.status === 'A') studentStats[rec.santriId].A++;
                
                if (rec.keterangan && rec.status !== 'H') {
                    studentStats[rec.santriId].reasons.push(`${rec.tanggal}: ${rec.status} (${rec.keterangan})`);
                }
            }
        });

        const list: AtRiskSantriInfo[] = [];
        targetSantri.forEach(s => {
            const stat = studentStats[s.id];
            const totalRecorded = stat.H + stat.S + stat.I + stat.A;
            const rate = totalRecorded > 0 ? (stat.H / totalRecorded) * 100 : 100;

            // Trigger early warning if Alpha >= 3 or rate < 80% (when recorded >= 3 days)
            if (stat.A >= 3 || (totalRecorded >= 3 && rate < 80)) {
                list.push({
                    santriId: s.id,
                    namaLengkap: s.namaLengkap,
                    nis: s.nis,
                    alphaCount: stat.A,
                    sakitCount: stat.S,
                    izinCount: stat.I,
                    hadirCount: stat.H,
                    totalDays: totalRecorded,
                    attendanceRate: rate,
                    reasons: stat.reasons
                });
            }
        });

        return list.sort((a, b) => b.alphaCount - a.alphaCount);
    }, [selectedRombelId, targetSantri, absensiList, selectedDate]);

    const invalidNoteCount = useMemo(() => {
        return targetSantri.filter((santri) => {
            const status = attendanceMap[santri.id] ?? 'H';
            const note = notesMap[santri.id]?.trim() || '';
            return status !== 'H' && !note;
        }).length;
    }, [attendanceMap, notesMap, targetSantri]);

    const statusSummary = useMemo(() => {
        const summary = { H: 0, S: 0, I: 0, A: 0 };
        targetSantri.forEach((santri) => {
            const status = attendanceMap[santri.id] ?? 'H';
            summary[status] += 1;
        });
        return summary;
    }, [attendanceMap, targetSantri]);

    // Absent students list for WhatsApp Modal
    const absentStudentItems = useMemo<AbsentStudentItem[]>(() => {
        return targetSantri
            .filter(s => {
                const status = attendanceMap[s.id] ?? 'H';
                return status !== 'H';
            })
            .map(s => ({
                santri: s,
                status: attendanceMap[s.id] as 'S' | 'I' | 'A',
                keterangan: notesMap[s.id] || ''
            }));
    }, [targetSantri, attendanceMap, notesMap]);

    const selectedRombelName = useMemo(() => {
        return settings.rombel.find(r => r.id === selectedRombelId)?.nama || 'Rombel';
    }, [settings.rombel, selectedRombelId]);

    const handleStartInput = () => {
        if (!selectedRombelId) {
            showToast('Pilih rombel terlebih dahulu.', 'error');
            return;
        }
        if (!targetSantri.length) {
            showToast('Tidak ada santri aktif di rombel ini.', 'error');
            return;
        }
        const initialMap: Record<number, AbsensiRecord['status']> = {};
        const initialNotes: Record<number, string> = {};
        
        targetSantri.forEach(s => {
            const existing = existingRecords.find(r => r.santriId === s.id);
            initialMap[s.id] = existing ? existing.status : 'H';
            initialNotes[s.id] = existing?.keterangan || '';
        });
        
        setAttendanceMap(initialMap);
        setNotesMap(initialNotes);
        setView('input');
        setIsSelectorDrawerOpen(false);
    };

    const handleMarkAllPresent = () => {
        const newMap = { ...attendanceMap };
        targetSantri.forEach(s => {
            newMap[s.id] = 'H';
        });
        setAttendanceMap(newMap);
        showToast('Semua santri ditandai Hadir.', 'info');
    };

    const handleStatusChange = (santriId: number, status: AbsensiRecord['status']) => {
        setAttendanceMap(prev => ({ ...prev, [santriId]: status }));
    };

    const handleNoteChange = (santriId: number, note: string) => {
        setNotesMap(prev => ({ ...prev, [santriId]: note }));
    };

    const handleOpenWaSingle = (santriId: number) => {
        setWaInitialSantriId(santriId);
        setIsWaModalOpen(true);
    };

    const handleOpenWaBlast = () => {
        setWaInitialSantriId(null);
        setIsWaModalOpen(true);
    };

    const handleOpenBkModal = (santri: Santri, reason: string) => {
        setBkTargetSantri(santri);
        setBkTargetReason(reason);
        setIsBkModalOpen(true);
    };

    const saveAttendanceRecords = async () => {
        if (!canWrite) {
            showToast('Anda tidak memiliki hak akses untuk menyimpan absensi.', 'error');
            return false;
        }
        if (invalidNoteCount > 0) {
            showToast(`${invalidNoteCount} santri belum memiliki keterangan wajib (status S/I/A).`, 'error');
            return false;
        }
        setIsSaving(true);
        try {
            const recordsToSave: AbsensiRecord[] = targetSantri.map(s => {
                const existing = existingRecords.find(r => r.santriId === s.id);
                return {
                    id: existing ? existing.id : Date.now() + Math.floor(Math.random() * 10000),
                    santriId: s.id,
                    rombelId: selectedRombelId,
                    tanggal: selectedDate,
                    sesi: selectedSesi,
                    status: attendanceMap[s.id] || 'H',
                    keterangan: notesMap[s.id] || '',
                    recordedBy: currentUser?.username || 'Staff',
                    lastModified: Date.now()
                };
            });
            await onSaveAbsensi(recordsToSave);
            return true;
        } catch (error) {
            showToast('Gagal menyimpan absensi.', 'error');
            return false;
        } finally {
            setIsSaving(false);
        }
    };

    const handleSave = async () => {
        const isSaved = await saveAttendanceRecords();
        if (!isSaved) return;
        showToast('Data absensi berhasil disimpan.', 'success');
        setView('selector');
    };

    const handleSaveAndNextDate = async () => {
        const isSaved = await saveAttendanceRecords();
        if (!isSaved) return;
        const currentDate = new Date(selectedDate);
        currentDate.setDate(currentDate.getDate() + 1);
        const nextDateStr = currentDate.toISOString().split('T')[0];
        setSelectedDate(nextDateStr);

        // Load records for next date
        const nextDayRecords = absensiList.filter(a => {
            const matchSesi = a.sesi ? a.sesi === selectedSesi : selectedSesi === 'KBM Pagi';
            return a.rombelId === selectedRombelId && a.tanggal === nextDateStr && matchSesi;
        });

        const nextMap: Record<number, AbsensiRecord['status']> = {};
        const nextNotes: Record<number, string> = {};
        targetSantri.forEach(s => {
            const existing = nextDayRecords.find(r => r.santriId === s.id);
            nextMap[s.id] = existing ? existing.status : 'H';
            nextNotes[s.id] = existing?.keterangan || '';
        });
        setAttendanceMap(nextMap);
        setNotesMap(nextNotes);
        showToast(`Tersimpan. Berpindah ke tanggal ${nextDateStr}`, 'success');
    };

    // --- VIEW 1: SELECTOR ---
    if (view === 'selector') {
        return (
            <div className="space-y-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-2xs">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                        <div>
                            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                <i className="bi bi-calendar2-check text-teal-600"></i>
                                Form Pemilihan Kelas & Tanggal Absensi
                            </h3>
                            <p className="text-xs text-gray-500 mt-1">
                                Tentukan marhalah, kelas, rombel, tanggal, dan sesi kehadiran yang akan dicatat.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                        {/* Jenjang */}
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Marhalah / Jenjang</label>
                            <select
                                value={selectedJenjangId}
                                onChange={(e) => {
                                    setSelectedJenjangId(Number(e.target.value));
                                    setSelectedKelasId(0);
                                    setSelectedRombelId(0);
                                }}
                                className="w-full border border-gray-300 rounded-xl p-2.5 text-xs bg-white focus:ring-2 focus:ring-teal-500 outline-none"
                            >
                                <option value={0}>-- Pilih Marhalah --</option>
                                {settings.jenjang.map(j => <option key={j.id} value={j.id}>{j.nama}</option>)}
                            </select>
                        </div>

                        {/* Kelas */}
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Kelas</label>
                            <select
                                value={selectedKelasId}
                                disabled={!selectedJenjangId}
                                onChange={(e) => {
                                    setSelectedKelasId(Number(e.target.value));
                                    setSelectedRombelId(0);
                                }}
                                className="w-full border border-gray-300 rounded-xl p-2.5 text-xs bg-white focus:ring-2 focus:ring-teal-500 outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                            >
                                <option value={0}>-- Pilih Kelas --</option>
                                {availableKelas.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
                            </select>
                        </div>

                        {/* Rombel */}
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Rombel / Halaqah</label>
                            <select
                                value={selectedRombelId}
                                disabled={!selectedKelasId}
                                onChange={(e) => setSelectedRombelId(Number(e.target.value))}
                                className="w-full border border-gray-300 rounded-xl p-2.5 text-xs bg-white focus:ring-2 focus:ring-teal-500 outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                            >
                                <option value={0}>-- Pilih Rombel --</option>
                                {availableRombel.map(r => <option key={r.id} value={r.id}>{r.nama}</option>)}
                            </select>
                        </div>

                        {/* Sesi Kehadiran */}
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Sesi Presensi</label>
                            <select
                                value={selectedSesi}
                                onChange={(e) => setSelectedSesi(e.target.value as SesiAbsensi)}
                                className="w-full border border-gray-300 rounded-xl p-2.5 text-xs bg-white focus:ring-2 focus:ring-teal-500 outline-none font-medium"
                            >
                                {SESI_ABSENSI_LIST.map(sesi => (
                                    <option key={sesi} value={sesi}>{sesi}</option>
                                ))}
                            </select>
                        </div>

                        {/* Tanggal */}
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Tanggal</label>
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="w-full border border-gray-300 rounded-xl p-2.5 text-xs bg-white focus:ring-2 focus:ring-teal-500 outline-none"
                            />
                        </div>
                    </div>

                    <div className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-gray-100">
                        <div className="text-xs text-gray-500 flex items-center gap-2">
                            <i className="bi bi-people text-teal-600"></i>
                            <span>Santri Aktif Terdeteksi: <strong>{targetSantri.length} santri</strong></span>
                        </div>

                        <button
                            type="button"
                            onClick={handleStartInput}
                            disabled={!selectedRombelId || targetSantri.length === 0}
                            className="w-full sm:w-auto px-6 sm:px-8 py-3 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-md flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap"
                        >
                            <i className="bi bi-pencil-fill"></i>
                            <span className="sm:hidden">Mulai Input Presensi</span>
                            <span className="hidden sm:inline">Mulai Input Absensi {selectedSesi}</span>
                        </button>
                    </div>
                </div>

                {/* Early Warning Banner for the selected rombel */}
                {atRiskStudents.length > 0 && (
                    <AbsensiWarningBanner
                        atRiskStudents={atRiskStudents}
                        santriList={santriList}
                        onOpenBkModal={handleOpenBkModal}
                        onOpenWaModal={handleOpenWaSingle}
                    />
                )}

                {/* Modals */}
                <AbsensiWaModal
                    isOpen={isWaModalOpen}
                    onClose={() => setIsWaModalOpen(false)}
                    absentStudents={absentStudentItems}
                    initialSantriId={waInitialSantriId}
                    tanggal={selectedDate}
                    sesi={selectedSesi}
                    rombelName={selectedRombelName}
                />

                <AbsensiBkModal
                    isOpen={isBkModalOpen}
                    onClose={() => setIsBkModalOpen(false)}
                    santri={bkTargetSantri}
                    alasanRujukan={bkTargetReason}
                />
            </div>
        );
    }

    // --- VIEW 2: ACTIVE INPUT WORKSPACE ---
    return (
        <div className="space-y-4 pb-36 md:pb-28">
            {/* Top Bar Navigation & Info */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4 md:p-5 shadow-2xs space-y-4">
                {/* Header Row */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <button
                            type="button"
                            onClick={() => setView('selector')}
                            className="p-2.5 hover:bg-gray-100 active:bg-gray-200 rounded-xl text-gray-600 transition-colors shrink-0"
                            title="Kembali ke Pemilihan Kelas"
                        >
                            <i className="bi bi-arrow-left text-lg"></i>
                        </button>
                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-base font-bold text-gray-900 truncate">{selectedRombelName}</h3>
                                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                                    {selectedSesi}
                                </span>
                            </div>
                            <p className="text-xs text-gray-500 font-medium mt-0.5">
                                <strong>{new Date(selectedDate).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</strong> &bull; Total {targetSantri.length} Santri
                            </p>
                        </div>
                    </div>

                    {/* Responsive Actions: Tabs & Quick Action Buttons */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
                        {/* View Mode Toggle: Grid vs Spreadsheet Table */}
                        <div className="grid grid-cols-2 gap-1 sm:inline-flex bg-gray-100/90 p-1 rounded-xl text-xs border border-gray-200/60 shadow-2xs">
                            <button
                                type="button"
                                onClick={() => setViewMode('table')}
                                className={`px-3 py-1.5 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all text-xs whitespace-nowrap ${
                                    viewMode === 'table' ? 'bg-white text-teal-700 shadow-xs ring-1 ring-black/5' : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                <i className="bi bi-table"></i>
                                <span>Tabel</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('grid')}
                                className={`px-3 py-1.5 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all text-xs whitespace-nowrap ${
                                    viewMode === 'grid' ? 'bg-white text-teal-700 shadow-xs ring-1 ring-black/5' : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                <i className="bi bi-grid-fill"></i>
                                <span>Kartu Grid</span>
                            </button>
                        </div>

                        {/* Action Buttons Group */}
                        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
                            {/* Quick Mark All Present */}
                            <button
                                type="button"
                                onClick={handleMarkAllPresent}
                                className="px-3 py-2 bg-green-50 hover:bg-green-100 active:bg-green-200 text-green-700 border border-green-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs whitespace-nowrap truncate"
                            >
                                <i className="bi bi-check-all text-base shrink-0"></i>
                                <span className="sm:hidden">Semua Hadir</span>
                                <span className="hidden sm:inline">Set Semua Hadir</span>
                            </button>

                            {/* WA Blast to Absent Students */}
                            {absentStudentItems.length > 0 && (
                                <button
                                    type="button"
                                    onClick={handleOpenWaBlast}
                                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-all whitespace-nowrap truncate"
                                >
                                    <i className="bi bi-whatsapp shrink-0"></i>
                                    <span>Blast WA ({absentStudentItems.length})</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Status Counter Bar - Compact responsive */}
                <div className="grid grid-cols-4 gap-1.5 sm:gap-2 pt-3 border-t border-gray-100 text-xs">
                    <div className="bg-green-50/80 border border-green-200/80 rounded-xl p-2 sm:p-2.5 flex flex-col sm:flex-row items-center sm:justify-between text-center sm:text-left">
                        <span className="font-bold text-green-800 flex items-center gap-1 text-[11px] sm:text-xs">
                            <span className="w-2 h-2 rounded-full bg-green-500 shrink-0"></span>
                            <span className="hidden sm:inline">Hadir (H)</span>
                            <span className="sm:hidden">Hadir</span>
                        </span>
                        <span className="text-xs sm:text-sm font-black text-green-900 mt-0.5 sm:mt-0">{statusSummary.H}</span>
                    </div>
                    <div className="bg-yellow-50/80 border border-yellow-200/80 rounded-xl p-2 sm:p-2.5 flex flex-col sm:flex-row items-center sm:justify-between text-center sm:text-left">
                        <span className="font-bold text-yellow-800 flex items-center gap-1 text-[11px] sm:text-xs">
                            <span className="w-2 h-2 rounded-full bg-yellow-500 shrink-0"></span>
                            <span className="hidden sm:inline">Sakit (S)</span>
                            <span className="sm:hidden">Sakit</span>
                        </span>
                        <span className="text-xs sm:text-sm font-black text-yellow-900 mt-0.5 sm:mt-0">{statusSummary.S}</span>
                    </div>
                    <div className="bg-blue-50/80 border border-blue-200/80 rounded-xl p-2 sm:p-2.5 flex flex-col sm:flex-row items-center sm:justify-between text-center sm:text-left">
                        <span className="font-bold text-blue-800 flex items-center gap-1 text-[11px] sm:text-xs">
                            <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0"></span>
                            <span className="hidden sm:inline">Izin (I)</span>
                            <span className="sm:hidden">Izin</span>
                        </span>
                        <span className="text-xs sm:text-sm font-black text-blue-900 mt-0.5 sm:mt-0">{statusSummary.I}</span>
                    </div>
                    <div className="bg-red-50/80 border border-red-200/80 rounded-xl p-2 sm:p-2.5 flex flex-col sm:flex-row items-center sm:justify-between text-center sm:text-left">
                        <span className="font-bold text-red-800 flex items-center gap-1 text-[11px] sm:text-xs">
                            <span className="w-2 h-2 rounded-full bg-red-500 shrink-0"></span>
                            <span className="hidden sm:inline">Alpha (A)</span>
                            <span className="sm:hidden">Alpha</span>
                        </span>
                        <span className="text-xs sm:text-sm font-black text-red-900 mt-0.5 sm:mt-0">{statusSummary.A}</span>
                    </div>
                </div>
            </div>

            {/* Early Warning Banner */}
            {atRiskStudents.length > 0 && (
                <AbsensiWarningBanner
                    atRiskStudents={atRiskStudents}
                    santriList={santriList}
                    onOpenBkModal={handleOpenBkModal}
                    onOpenWaModal={handleOpenWaSingle}
                />
            )}

            {/* Live Filter / Search within Class */}
            {targetSantri.length > 8 && (
                <div className="relative">
                    <i className="bi bi-search absolute left-3.5 top-3 text-gray-400 text-xs"></i>
                    <input
                        type="text"
                        value={searchFilter}
                        onChange={(e) => setSearchFilter(e.target.value)}
                        placeholder="Cari santri berdasarkan nama atau NIS..."
                        className="w-full pl-9 pr-4 py-2.5 text-xs bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none shadow-2xs"
                    />
                </div>
            )}

            {/* Attendance Input Presentation */}
            {viewMode === 'table' ? (
                <AbsensiTableView
                    targetSantri={filteredTargetSantri}
                    attendanceMap={attendanceMap}
                    notesMap={notesMap}
                    onStatusChange={handleStatusChange}
                    onNoteChange={handleNoteChange}
                    onOpenWaSingle={handleOpenWaSingle}
                    onOpenBkModal={handleOpenBkModal}
                />
            ) : (
                <AbsensiCardGrid
                    targetSantri={filteredTargetSantri}
                    attendanceMap={attendanceMap}
                    notesMap={notesMap}
                    onStatusChange={handleStatusChange}
                    onNoteChange={handleNoteChange}
                    onOpenWaSingle={handleOpenWaSingle}
                    onOpenBkModal={handleOpenBkModal}
                />
            )}

            {/* Bottom Actions Floating Bar */}
            <div className="bg-white/95 backdrop-blur-md border border-gray-200/90 rounded-2xl p-3.5 sm:p-4 shadow-lg sticky bottom-4 z-40">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                    <div className="text-xs text-gray-600 flex items-center gap-2 w-full sm:w-auto">
                        {invalidNoteCount > 0 ? (
                            <span className="text-red-600 font-bold flex items-center gap-1.5 animate-pulse text-xs">
                                <i className="bi bi-exclamation-circle-fill"></i>
                                {invalidNoteCount} santri S/I/A belum diisi keterangan.
                            </span>
                        ) : (
                            <span className="text-green-700 font-medium flex items-center gap-1.5 text-xs">
                                <i className="bi bi-check-circle-fill text-green-600"></i>
                                Siap disimpan ({targetSantri.length} santri)
                            </span>
                        )}
                    </div>

                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto justify-end">
                        <button
                            type="button"
                            onClick={() => setIsJurnalModalOpen(true)}
                            className="flex-1 sm:flex-initial px-3.5 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                            <i className="bi bi-journal-text"></i>
                            <span>Jurnal KBM</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleSaveAndNextDate}
                            disabled={isSaving || !canWrite}
                            className="flex-1 sm:flex-initial px-3.5 py-2.5 bg-white hover:bg-gray-50 text-teal-700 border border-teal-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                        >
                            <i className="bi bi-calendar-plus"></i>
                            <span>Simpan & Lanjut</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={isSaving || !canWrite}
                            className="w-full sm:w-auto px-5 py-2.5 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                        >
                            {isSaving ? (
                                <span className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent"></span>
                            ) : (
                                <i className="bi bi-cloud-upload-fill"></i>
                            )}
                            <span>Simpan Presensi</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <JurnalMengajarModal 
                isOpen={isJurnalModalOpen}
                onClose={() => setIsJurnalModalOpen(false)}
                rombelId={selectedRombelId}
                tanggal={selectedDate}
            />

            <AbsensiWaModal
                isOpen={isWaModalOpen}
                onClose={() => setIsWaModalOpen(false)}
                absentStudents={absentStudentItems}
                initialSantriId={waInitialSantriId}
                tanggal={selectedDate}
                sesi={selectedSesi}
                rombelName={selectedRombelName}
            />

            <AbsensiBkModal
                isOpen={isBkModalOpen}
                onClose={() => setIsBkModalOpen(false)}
                santri={bkTargetSantri}
                alasanRujukan={bkTargetReason}
            />
        </div>
    );
};
