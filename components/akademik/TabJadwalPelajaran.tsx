
import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../../AppContext';
import { useLiveQuery } from "dexie-react-hooks";
import { db } from '../../db';
import { JadwalPelajaran, JamPelajaran, ArsipJadwal, Rombel, TenagaPengajar } from '../../types';
import { JadwalModal } from './modals/JadwalModal';
import { PrintHeader } from '../common/PrintHeader';
import { formatDate } from '../reports/modules/Common';
import { MobileFilterDrawer } from '../common/MobileFilterDrawer';
import { loadJsPdf, loadJsPdfAutoTable, loadXLSX } from '../../utils/lazyClientLibs';
import { formatAcademicYearDisplay, getAcademicYearOptions, getDefaultAcademicYear } from '../../utils/academicYear';
import { printExportFacade } from '../../utils/printExportFacade';
import { groupRombelsForTable, RombelSplitMode, RombelTableGroup } from '../../utils/rombelGrouping';

const PENDING_RESTORE_ROMBEL_KEY = 'esantri_jadwal_pending_restore_rombel_id';

// --- MODAL ARSIP ---
interface ArchiveModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (judul: string, tahun: string, semester: 'Ganjil' | 'Genap') => void;
    jenjangName: string;
    defaultAcademicYear: string;
    availableAcademicYears: string[];
}

const ArchiveModal: React.FC<ArchiveModalProps> = ({ isOpen, onClose, onSave, jenjangName, defaultAcademicYear, availableAcademicYears }) => {
    const [judul, setJudul] = useState('');
    const [tahun, setTahun] = useState(defaultAcademicYear);
    const [semester, setSemester] = useState<'Ganjil' | 'Genap'>('Ganjil');

    useEffect(() => {
        if (isOpen) {
            setTahun(defaultAcademicYear);
        }
    }, [isOpen, defaultAcademicYear]);

    if(!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[70] flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                <div className="p-5 border-b"><h3 className="text-lg font-bold text-gray-800">Arsipkan Jadwal ({jenjangName})</h3></div>
                <div className="p-5 space-y-4">
                    <p className="text-sm text-gray-600 bg-yellow-50 p-2 rounded border border-yellow-200">
                        Jadwal yang aktif saat ini untuk jenjang <strong>{jenjangName}</strong> akan disimpan sebagai arsip/snapshot.
                    </p>
                    <div>
                        <label className="block mb-1 text-sm font-medium">Judul Arsip</label>
                        <input type="text" value={judul} onChange={e => setJudul(e.target.value)} className="w-full border rounded p-2 text-sm" placeholder="Contoh: Jadwal Awal Tahun" autoFocus />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block mb-1 text-sm font-medium">Tahun Ajaran</label>
                            <select value={tahun} onChange={e => setTahun(e.target.value)} className="w-full border rounded p-2 text-sm">
                                {availableAcademicYears.map((year) => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                        </div>
                         <div>
                            <label className="block mb-1 text-sm font-medium">Semester</label>
                            <select value={semester} onChange={e => setSemester(e.target.value as any)} className="w-full border rounded p-2 text-sm">
                                <option value="Ganjil">Ganjil</option>
                                <option value="Genap">Genap</option>
                            </select>
                        </div>
                    </div>
                </div>
                <div className="p-4 border-t flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 border rounded text-gray-600 text-sm">Batal</button>
                    <button onClick={() => onSave(judul, tahun, semester)} disabled={!judul} className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-bold hover:bg-blue-700 disabled:bg-gray-300">Simpan Arsip</button>
                </div>
            </div>
        </div>
    )
}

// --- MODAL COPY SCHEDULE ---
interface CopyScheduleModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCopy: (fromRombelId: number, toRombelId: number) => void;
    rombels: Rombel[];
    currentRombelId: number;
}

const CopyScheduleModal: React.FC<CopyScheduleModalProps> = ({ isOpen, onClose, onCopy, rombels, currentRombelId }) => {
    const [sourceRombelId, setSourceRombelId] = useState<number>(0);
    
    if (!isOpen) return null;
    
    const targetRombel = rombels.find(r => r.id === currentRombelId);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[70] flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                <div className="p-5 border-b"><h3 className="text-lg font-bold text-gray-800">Salin Jadwal</h3></div>
                <div className="p-5 space-y-4">
                    <div className="bg-blue-50 border border-blue-200 text-blue-800 p-3 rounded text-sm">
                        <i className="bi bi-info-circle mr-2"></i>
                        Anda akan menyalin seluruh jadwal ke kelas <strong>{targetRombel?.nama}</strong>. Jadwal yang sudah ada di kelas target akan <strong>dihapus/ditimpa</strong>.
                    </div>
                    <div>
                        <label className="block mb-1 text-sm font-medium">Salin Dari Kelas (Sumber):</label>
                        <select 
                            value={sourceRombelId} 
                            onChange={e => setSourceRombelId(Number(e.target.value))} 
                            className="w-full border rounded p-2 text-sm"
                        >
                            <option value={0}>-- Pilih Kelas Sumber --</option>
                            {rombels.filter(r => r.id !== currentRombelId).map(r => (
                                <option key={r.id} value={r.id}>{r.nama}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="p-4 border-t flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 border rounded text-gray-600 text-sm">Batal</button>
                    <button onClick={() => onCopy(sourceRombelId, currentRombelId)} disabled={!sourceRombelId} className="px-4 py-2 bg-teal-600 text-white rounded text-sm font-bold hover:bg-teal-700 disabled:bg-gray-300">Salin & Timpa</button>
                </div>
            </div>
        </div>
    );
};

// --- MODAL TEACHER LOAD (REKAP JAM) ---
interface TeacherLoadModalProps {
    isOpen: boolean;
    onClose: () => void;
    teachers: TenagaPengajar[];
    jadwalList: JadwalPelajaran[];
    rombels: Rombel[];
}

const TeacherLoadModal: React.FC<TeacherLoadModalProps> = ({ isOpen, onClose, teachers, jadwalList, rombels }) => {
    if (!isOpen) return null;

    const teacherStats = useMemo(() => {
        const stats = new Map<number, { name: string, totalHours: number, rombels: Set<string> }>();
        
        // Init stats for all teachers (exclude kependidikan)
        teachers.filter(t => t.jenisPegawai !== 'kependidikan').forEach(t => {
            stats.set(t.id, { name: t.nama, totalHours: 0, rombels: new Set() });
        });

        // Calculate load
        jadwalList.forEach(j => {
            if (j.guruId && j.guruId > 0 && stats.has(j.guruId)) {
                const entry = stats.get(j.guruId)!;
                entry.totalHours += 1;
                const rName = rombels.find(r => r.id === j.rombelId)?.nama;
                if(rName) entry.rombels.add(rName);
            }
        });

        return Array.from(stats.values())
            .filter(s => s.totalHours > 0)
            .sort((a,b) => b.totalHours - a.totalHours);
    }, [teachers, jadwalList, rombels]);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[70] flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl flex flex-col max-h-[80vh]">
                <div className="p-5 border-b flex justify-between items-center">
                    <h3 className="text-lg font-bold text-gray-800">Rekap Beban Mengajar (Jam Tatap Muka)</h3>
                    <button onClick={onClose}><i className="bi bi-x-lg text-gray-500"></i></button>
                </div>
                <div className="p-0 overflow-y-auto flex-grow">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-100 text-gray-600 sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="p-3">Nama Guru</th>
                                <th className="p-3 text-center">Total Jam (JTM)</th>
                                <th className="p-3">Mengajar di Kelas</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {teacherStats.map((s, idx) => (
                                <tr key={idx} className="hover:bg-gray-50">
                                    <td className="p-3 font-medium">{s.name}</td>
                                    <td className="p-3 text-center">
                                        <span className="bg-teal-100 text-teal-800 px-2 py-1 rounded font-bold">{s.totalHours}</span>
                                    </td>
                                    <td className="p-3 text-xs text-gray-500">
                                        {Array.from(s.rombels).join(', ')}
                                    </td>
                                </tr>
                            ))}
                            {teacherStats.length === 0 && (
                                <tr><td colSpan={3} className="p-8 text-center text-gray-500">Belum ada jadwal yang diatur.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="p-4 border-t bg-gray-50 text-right">
                    <button onClick={onClose} className="px-4 py-2 bg-white border rounded text-gray-700 text-sm hover:bg-gray-100">Tutup</button>
                </div>
            </div>
        </div>
    );
};

export const TabJadwalPelajaran: React.FC = () => {
    const { settings, onSaveSettings, showToast, showConfirmation, currentUser } = useAppContext();
    const canWrite = currentUser?.role === 'admin' || currentUser?.permissions?.akademik === 'write';
    const defaultAcademicYear = useMemo(() => getDefaultAcademicYear(settings), [settings]);
    const availableAcademicYears = useMemo(() => getAcademicYearOptions(settings), [settings]);

    // Tabs
    const [activeTab, setActiveTab] = useState<'active' | 'archive'>('active');

    const [filterJenjangId, setFilterJenjangId] = useState<number>(settings.jenjang[0]?.id || 0);
    const [filterKelasId, setFilterKelasId] = useState<number>(0);
    const [filterRombelId, setFilterRombelId] = useState<number>(0);

    // Local state for Jam Pelajaran editing to fix "reset to 0" bug
    const [localJamConfig, setLocalJamConfig] = useState<JamPelajaran[]>([]);
    
    // Sync localJamConfig when jenjang changes or settings update
    useEffect(() => {
        const defaults: JamPelajaran[] = Array.from({ length: 8 }, (_, i) => ({
            id: Date.now() + i, urutan: i + 1, jamMulai: '07:00', jamSelesai: '07:45', jenis: 'KBM', jenjangId: filterJenjangId
        }));
        
        let config = defaults;
        if (settings.jamPelajaran) {
            const saved = settings.jamPelajaran.filter(j => j.jenjangId === filterJenjangId);
            if (saved.length > 0) config = saved.sort((a,b) => a.urutan - b.urutan);
        }
        setLocalJamConfig(config);
    }, [filterJenjangId, settings.jamPelajaran]);

    // Modal State
    const [isJadwalModalOpen, setIsJadwalModalOpen] = useState(false);
    const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
    const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
    const [isTeacherLoadModalOpen, setIsTeacherLoadModalOpen] = useState(false);
    const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
    const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [viewLayout, setViewLayout] = useState<'cards' | 'global_tu'>('cards');
    
    const [selectedSlot, setSelectedSlot] = useState<{ hari: number, jamKe: number } | null>(null);
    const [editingJadwal, setEditingJadwal] = useState<JadwalPelajaran | null>(null);

    // Live Data
    const jadwalList = useLiveQuery(() => db.jadwalPelajaran.toArray(), []) || [];
    const arsipList = useLiveQuery(() => db.arsipJadwal.toArray(), []) || [];

    // Helper Data & Filtering Logic
    const availableKelas = useMemo(() => settings.kelas.filter(k => k.jenjangId === filterJenjangId), [filterJenjangId, settings.kelas]);
    
    const availableRombel = useMemo(() => {
        if (filterKelasId > 0) {
            return settings.rombel.filter(r => r.kelasId === filterKelasId);
        }
        const kelasIdsInJenjang = settings.kelas.filter(k => k.jenjangId === filterJenjangId).map(k => k.id);
        return settings.rombel.filter(r => kelasIdsInJenjang.includes(r.kelasId));
    }, [filterKelasId, filterJenjangId, settings.rombel, settings.kelas]);

    const activeJenjang = useMemo(() => settings.jenjang.find(j => j.id === filterJenjangId), [filterJenjangId, settings.jenjang]);

    // Pulihkan mode edit rombel sekali pakai setelah update jam (jika komponen sempat reset state)
    useEffect(() => {
        if (filterRombelId > 0) return;
        const raw = sessionStorage.getItem(PENDING_RESTORE_ROMBEL_KEY);
        if (!raw) return;
        const pendingId = Number(raw);
        if (!pendingId) {
            sessionStorage.removeItem(PENDING_RESTORE_ROMBEL_KEY);
            return;
        }
        const isStillAvailable = settings.rombel.some(r => r.id === pendingId);
        if (isStillAvailable) {
            setFilterRombelId(pendingId);
        }
        sessionStorage.removeItem(PENDING_RESTORE_ROMBEL_KEY);
    }, [filterRombelId, settings.rombel]);
    
    // Determine which Rombels are targeted for Display/Print
    const targetRombels = useMemo(() => {
        if (filterRombelId > 0) {
            return settings.rombel.filter(r => r.id === filterRombelId);
        } else if (filterKelasId > 0) {
            return settings.rombel.filter(r => r.kelasId === filterKelasId);
        } else if (filterJenjangId > 0) {
             const kelasIdsInJenjang = settings.kelas.filter(k => k.jenjangId === filterJenjangId).map(k => k.id);
             return settings.rombel.filter(r => kelasIdsInJenjang.includes(r.kelasId));
        }
        return [];
    }, [filterJenjangId, filterKelasId, filterRombelId, settings.rombel, settings.kelas]);

    // Opsi Pemisahan Tabel Rombel Rekap Global TU (agar tidak sesak)
    const [splitMode, setSplitMode] = useState<RombelSplitMode>('gender');
    const [activeGroupFilter, setActiveGroupFilter] = useState<string>('all');
    const allSantri = useLiveQuery(() => db.santri.toArray(), []) || [];

    const rombelGroups = useMemo<RombelTableGroup[]>(() => {
        return groupRombelsForTable(targetRombels, splitMode, settings.kelas, allSantri);
    }, [targetRombels, splitMode, settings.kelas, allSantri]);

    const visibleRombelGroups = useMemo<RombelTableGroup[]>(() => {
        if (activeGroupFilter === 'all') return rombelGroups;
        const matched = rombelGroups.filter(g => g.id === activeGroupFilter);
        return matched.length > 0 ? matched : rombelGroups;
    }, [rombelGroups, activeGroupFilter]);

    const toSlug = (value: string) =>
        value
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');

    const getTimestampSlug = () => {
        const now = new Date();
        const yyyy = String(now.getFullYear());
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const hh = String(now.getHours()).padStart(2, '0');
        const mi = String(now.getMinutes()).padStart(2, '0');
        const ss = String(now.getSeconds()).padStart(2, '0');
        return `${yyyy}${mm}${dd}-${hh}${mi}${ss}`;
    };

    const jenjangLabel = settings.jenjang.find((j) => j.id === filterJenjangId)?.nama || 'semua-marhalah';
    const kelasLabel = filterKelasId
        ? (settings.kelas.find((k) => k.id === filterKelasId)?.nama || 'kelas')
        : 'semua-kelas';
    const rombelLabel = filterRombelId
        ? (settings.rombel.find((r) => r.id === filterRombelId)?.nama || 'rombel')
        : 'semua-rombel';
    const exportFileName = `${getTimestampSlug()}-jadwal-mapel-${toSlug(jenjangLabel)}-${toSlug(kelasLabel)}-${toSlug(rombelLabel)}`;

    // Use localJamConfig for display and editing
    const jamConfig = localJamConfig;

    const days = ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

    // --- Actions Active View ---

    const persistJadwalSlot = async (data: Partial<JadwalPelajaran>) => {
        const payload = {
            ...data,
            rombelId: filterRombelId,
            lastModified: Date.now()
        } as JadwalPelajaran;

        let savedId = editingJadwal?.id;
        if (editingJadwal) {
            await db.jadwalPelajaran.put({ ...payload, id: editingJadwal.id });
            showToast('Jadwal diperbarui', 'success');
        } else {
            const existing = jadwalList.find(j => j.rombelId === filterRombelId && j.hari === data.hari && j.jamKe === data.jamKe);
            if (existing) {
                await db.jadwalPelajaran.put({ ...payload, id: existing.id });
                savedId = existing.id;
            } else {
                savedId = Number(await db.jadwalPelajaran.add(payload));
            }
            showToast('Jadwal ditambahkan', 'success');
        }

        if (savedId) {
            setEditingJadwal({ ...payload, id: savedId });
        }
    };

    const handleSaveJadwal = async (data: Partial<JadwalPelajaran>) => {
        if (!filterRombelId) return;

        // Check Teacher Availability & Restrictions
        if (data.guruId && data.guruId > 0) {
            const teacher = settings.tenagaPengajar.find(t => t.id === data.guruId);
            const rombel = settings.rombel.find(r => r.id === filterRombelId);
            
            // Check Conflict with other classes at the same slot
            const conflict = jadwalList.find(j => 
                j.hari === data.hari && 
                j.jamKe === data.jamKe && 
                j.guruId === data.guruId && 
                j.rombelId !== filterRombelId
            );
            
            if (conflict) {
                const conflictRombel = settings.rombel.find(r => r.id === conflict.rombelId)?.nama;
                showConfirmation(
                    'Konflik Jadwal Guru',
                    `Ustadz/Guru ${teacher?.nama || ''} sudah terjadwal mengajar di kelas ${conflictRombel} pada waktu yang sama. Tetap simpan?`,
                    async () => {
                        await persistJadwalSlot(data);
                    },
                    { confirmText: 'Tetap Simpan', confirmColor: 'yellow' }
                );
                return;
            }

            // Check Availability Day/Hour/Rombel
            if (teacher) {
                const isDayOk = !teacher.hariMasuk || teacher.hariMasuk.length === 0 || (data.hari !== undefined && teacher.hariMasuk.includes(data.hari));
                const isHourOk = !teacher.jamMasuk || teacher.jamMasuk.length === 0 || (data.jamKe !== undefined && teacher.jamMasuk.includes(data.jamKe));
                const isRombelOk = !teacher.availableRombelIds || teacher.availableRombelIds.length === 0 || teacher.availableRombelIds.includes(filterRombelId);

                if (!isDayOk || !isHourOk || !isRombelOk) {
                    const warnings: string[] = [];
                    if (!isDayOk) warnings.push('hari ini bukan hari masuknya');
                    if (!isHourOk) warnings.push(`jam ke-${data.jamKe} di luar jam kesanggupan`);
                    if (!isRombelOk) warnings.push(`guru memiliki batasan rombel khusus`);

                    showConfirmation(
                        'Peringatan Kesanggupan Guru',
                        `Ustadz/Guru ${teacher.nama} memiliki batasan jadwal (${warnings.join(', ')}). Tetap jadwalkan?`,
                        async () => {
                            await persistJadwalSlot(data);
                        },
                        { confirmText: 'Tetap Jadwalkan', confirmColor: 'yellow' }
                    );
                    return;
                }
            }
        }

        await persistJadwalSlot(data);
    };

    const handleDeleteJadwal = async (id: number) => {
        await db.jadwalPelajaran.delete(id);
        setEditingJadwal(null);
        showToast('Jadwal dihapus', 'success');
    };
    
    // NEW: Copy Schedule Action
    const handleCopySchedule = async (fromId: number, toId: number) => {
        if (!canWrite) return;
        try {
            // 1. Get Source Schedule
            const sourceSchedule = jadwalList.filter(j => j.rombelId === fromId);
            if (sourceSchedule.length === 0) {
                showToast('Kelas sumber tidak memiliki jadwal.', 'error');
                return;
            }

            // 2. Delete existing Target Schedule
            const targetScheduleIds = jadwalList.filter(j => j.rombelId === toId).map(j => j.id);
            await db.jadwalPelajaran.bulkDelete(targetScheduleIds);

            // 3. Create New Schedule
            const newSchedule = sourceSchedule.map(s => ({
                ...s,
                id: Date.now() + Math.random(), // New ID
                rombelId: toId, // New Rombel
                lastModified: Date.now()
            }));

            await db.jadwalPelajaran.bulkAdd(newSchedule as JadwalPelajaran[]);
            
            setIsCopyModalOpen(false);
            showToast('Jadwal berhasil disalin!', 'success');
        } catch (error) {
            showToast('Gagal menyalin jadwal.', 'error');
            console.error(error);
        }
    };

    const handleSaveJamConfig = async (newConfig: JamPelajaran[]) => {
        const otherJenjangConfigs = (settings.jamPelajaran || []).filter(j => j.jenjangId !== filterJenjangId);
        const updated = [...otherJenjangConfigs, ...newConfig];
        await onSaveSettings({ ...settings, jamPelajaran: updated });
        showToast('Pengaturan jam pelajaran disimpan', 'success');
    };

    const handleAutoGenerate = async () => {
        if (!filterJenjangId) return;
        
        showConfirmation(
            'Generate Jadwal Otomatis?',
            'Sistem akan mencoba menyusun jadwal berdasarkan kesanggupan pengajar, kompetensi mapel, dan ketersediaan waktu. Jadwal yang sudah ada di jenjang ini akan DITIMPA. Lanjutkan?',
            async () => {
                try {
                    // 1. Get all Rombels in this Jenjang
                    const rombelIdsInJenjang = settings.rombel.filter(r => 
                        settings.kelas.find(k => k.id === r.kelasId)?.jenjangId === filterJenjangId
                    ).map(r => r.id);

                    // 2. Clear existing schedules for these rombels
                    const existingIds = jadwalList.filter(j => rombelIdsInJenjang.includes(j.rombelId)).map(j => j.id);
                    await db.jadwalPelajaran.bulkDelete(existingIds);

                    const newJadwal: JadwalPelajaran[] = [];
                    // Only include teachers (tenaga pendidik), exclude non-teaching staff (kependidikan)
                    const teachers = settings.tenagaPengajar.filter(t => t.jenisPegawai !== 'kependidikan');
                    const mapels = settings.mataPelajaran.filter(m => m.jenjangId === filterJenjangId);
                    
                    // Trackers to respect curriculum allocations (jamPerMinggu) and load balancing
                    const rombelMapelCount: Record<string, number> = {}; // key: `${rombelId}_${mapelId}`
                    const rombelDayMapelCount: Record<string, number> = {}; // key: `${rombelId}_${dayIdx}_${mapelId}`
                    const teacherScheduledHours: Record<number, number> = {}; // key: teacherId

                    // Curriculum-Aware Scheduling Loop
                    // For each Rombel, for each Day, for each Jam
                    for (const rombelId of rombelIdsInJenjang) {
                        const rombel = settings.rombel.find(r => r.id === rombelId);
                        const kelas = settings.kelas.find(k => k.id === rombel?.kelasId);
                        
                        for (let dayIdx = 1; dayIdx <= 6; dayIdx++) { // Senin - Sabtu
                            for (const jam of jamConfig) {
                                if (jam.jenis !== 'KBM') continue;

                                // Gather all possible teacher-mapel candidate pairs
                                interface CandidatePair {
                                    teacher: typeof teachers[0];
                                    mapel: typeof mapels[0];
                                    remainingQuota: number;
                                    todayCount: number;
                                    teacherLoad: number;
                                }

                                const candidates: CandidatePair[] = [];

                                for (const t of teachers) {
                                    // Day check
                                    if (t.hariMasuk && t.hariMasuk.length > 0 && !t.hariMasuk.includes(dayIdx)) continue;
                                    // Jam check
                                    if (t.jamMasuk && t.jamMasuk.length > 0 && !t.jamMasuk.includes(jam.urutan)) continue;
                                    // Rombel/Kelas check
                                    const canTeachInRombel = !t.availableRombelIds || t.availableRombelIds.length === 0 || t.availableRombelIds.includes(rombelId);
                                    const canTeachInKelas = !t.availableKelasIds || t.availableKelasIds.length === 0 || (kelas && t.availableKelasIds.includes(kelas.id));
                                    if (!canTeachInRombel || !canTeachInKelas) continue;

                                    // Conflict check (teacher already assigned elsewhere at this time)
                                    const isBusy = newJadwal.some(j => j.hari === dayIdx && j.jamKe === jam.urutan && j.guruId === t.id);
                                    if (isBusy) continue;

                                    // Find all competent mapels for this jenjang
                                    const competentMapels = mapels.filter(m => t.kompetensiMapelIds?.includes(m.id));
                                    for (const m of competentMapels) {
                                        const allocated = rombelMapelCount[`${rombelId}_${m.id}`] || 0;
                                        const targetQuota = (m.alokasiJamDefault && m.alokasiJamDefault > 0) 
                                            ? m.alokasiJamDefault 
                                            : ((m.jamPerMinggu && m.jamPerMinggu > 0) ? m.jamPerMinggu : 2);
                                        const remainingQuota = targetQuota - allocated;
                                        const todayCount = rombelDayMapelCount[`${rombelId}_${dayIdx}_${m.id}`] || 0;
                                        const teacherLoad = teacherScheduledHours[t.id] || 0;

                                        candidates.push({
                                            teacher: t,
                                            mapel: m,
                                            remainingQuota,
                                            todayCount,
                                            teacherLoad
                                        });
                                    }
                                }

                                if (candidates.length === 0) continue;

                                // Filter candidates that still have curriculum quota left & not over-taught today
                                const quotaCandidates = candidates.filter(c => c.remainingQuota > 0 && c.todayCount < 2);
                                const candidatePool = quotaCandidates.length > 0 
                                    ? quotaCandidates 
                                    : (candidates.filter(c => c.remainingQuota > 0).length > 0 ? candidates.filter(c => c.remainingQuota > 0) : candidates);

                                // Sort: prioritize highest remaining quota (fulfill curriculum first), then lowest teacher load
                                candidatePool.sort((a, b) => {
                                    if (b.remainingQuota !== a.remainingQuota) {
                                        return b.remainingQuota - a.remainingQuota;
                                    }
                                    if (a.todayCount !== b.todayCount) {
                                        return a.todayCount - b.todayCount;
                                    }
                                    return a.teacherLoad - b.teacherLoad;
                                });

                                const selected = candidatePool[0];
                                if (selected) {
                                    newJadwal.push({
                                        id: Date.now() + Math.random(),
                                        rombelId,
                                        hari: dayIdx,
                                        jamKe: jam.urutan,
                                        mapelId: selected.mapel.id,
                                        guruId: selected.teacher.id,
                                        lastModified: Date.now()
                                    });

                                    // Update tracking counters
                                    rombelMapelCount[`${rombelId}_${selected.mapel.id}`] = (rombelMapelCount[`${rombelId}_${selected.mapel.id}`] || 0) + 1;
                                    rombelDayMapelCount[`${rombelId}_${dayIdx}_${selected.mapel.id}`] = (rombelDayMapelCount[`${rombelId}_${dayIdx}_${selected.mapel.id}`] || 0) + 1;
                                    teacherScheduledHours[selected.teacher.id] = (teacherScheduledHours[selected.teacher.id] || 0) + 1;
                                }
                            }
                        }
                    }

                    if (newJadwal.length > 0) {
                        await db.jadwalPelajaran.bulkAdd(newJadwal);
                        showToast(`Berhasil generate ${newJadwal.length} slot jadwal otomatis!`, 'success');
                    } else {
                        showToast('Tidak dapat menemukan kecocokan guru untuk jadwal.', 'info');
                    }
                } catch (error) {
                    console.error(error);
                    showToast('Gagal generate jadwal otomatis.', 'error');
                }
            },
            { confirmText: 'Ya, Generate', confirmColor: 'blue' }
        );
    };

    const handleAddJam = async () => {
        if (filterRombelId > 0) {
            sessionStorage.setItem(PENDING_RESTORE_ROMBEL_KEY, String(filterRombelId));
        }
        const nextUrutan = jamConfig.length + 1;
        const newJam: JamPelajaran = {
            id: Date.now(),
            urutan: nextUrutan,
            jamMulai: '00:00',
            jamSelesai: '00:00',
            jenis: 'KBM',
            jenjangId: filterJenjangId
        };
        await handleSaveJamConfig([...jamConfig, newJam]);
        setFilterRombelId((prev) => prev);
    };

    const handleRemoveJam = async (index: number) => {
        if (filterRombelId > 0) {
            sessionStorage.setItem(PENDING_RESTORE_ROMBEL_KEY, String(filterRombelId));
        }
        const updatedConfig = [...jamConfig];
        updatedConfig.splice(index, 1);
        const reindexed = updatedConfig.map((j, idx) => ({ ...j, urutan: idx + 1 }));
        await handleSaveJamConfig(reindexed);
        setFilterRombelId((prev) => prev);
    };

    const handleCellClick = (dayIdx: number, jamUrutan: number) => {
        if (!canWrite || !filterRombelId) return;
        const existing = jadwalList.find(j => j.rombelId === filterRombelId && j.hari === dayIdx && j.jamKe === jamUrutan);
        setSelectedSlot({ hari: dayIdx, jamKe: jamUrutan });
        setEditingJadwal(existing || null);
        setIsJadwalModalOpen(true);
    };
    
    // Quick nav from preview to edit
    const handleEditRombel = (rombelId: number) => {
        setFilterRombelId(rombelId);
        setTimeout(() => {
            const panel = document.getElementById('jam-config-panel');
            panel?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 120);
    };

    const handlePrint = async () => {
        if (targetRombels.length === 0) {
            showToast('Pilih setidaknya satu kelas untuk dicetak.', 'error');
            return;
        }
        const [{ jsPDF }, autoTableModule] = await Promise.all([
            loadJsPdf(),
            loadJsPdfAutoTable()
        ]);
        const autoTable = autoTableModule.default;
        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4'
        });

        targetRombels.forEach((rombel, index) => {
            if (index > 0) doc.addPage();

            // Header standar: Nama Pondok -> Alamat -> Garis -> Judul -> Info tambahan
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text(settings.namaPonpes, 148.5, 14, { align: 'center' });

            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.text(`${settings.alamat || ''}`, 148.5, 19, { align: 'center' });

            doc.setDrawColor(80, 80, 80);
            doc.setLineWidth(0.3);
            doc.line(10, 22, 287, 22);

            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text(getJadwalSheetTitle(rombel.id), 148.5, 27, { align: 'center' });

            const meta = getRombelMeta(rombel.id);
            const infoLine = `Tahun Ajaran: ${formatAcademicYearDisplay(settings, defaultAcademicYear)}  |  Jenjang: ${meta.jenjang}  |  Kelas: ${meta.kelas}  |  Rombel: ${meta.rombel}`;
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.text(infoLine, 148.5, 31.5, { align: 'center' });

            // Table Data
            const head = [['Jam', ...days]];
            const body = jamConfig.map(jam => {
                const row = [
                    `${jam.urutan}\n(${jam.jamMulai}-${jam.jamSelesai})`
                ];
                days.forEach((day, dayIdx) => {
                    const item = jadwalList.find(j => j.rombelId === rombel.id && j.hari === dayIdx && j.jamKe === jam.urutan);
                    if (item) {
                        if (item.keterangan) {
                            row.push(item.keterangan);
                        } else {
                            const mapel = settings.mataPelajaran.find(m => m.id === item.mapelId)?.nama || '';
                            let guruStr = '-';
                            if (item.guruId) {
                                if (item.guruId === -1) guruStr = 'NIHIL / KOSONG';
                                else if (item.guruId === -2) guruStr = 'MUSYRIF / TAHFIZH';
                                else {
                                    const teacher = settings.tenagaPengajar.find(t => t.id === item.guruId);
                                    guruStr = teacher ? (teacher.kodeGuru || teacher.nama) : '-';
                                }
                            }
                            row.push(`${mapel}\n${guruStr}`);
                        }
                    } else {
                        row.push('');
                    }
                });
                return row;
            });

            autoTable(doc, {
                head: head,
                body: body,
                startY: 34,
                theme: 'grid',
                styles: {
                    fontSize: 8,
                    cellPadding: 2,
                    halign: 'center',
                    valign: 'middle',
                    lineWidth: 0.1,
                    lineColor: [80, 80, 80]
                },
                headStyles: {
                    fillColor: [45, 150, 140], // Teal color
                    textColor: [255, 255, 255],
                    fontStyle: 'bold',
                    fontSize: 9
                },
                columnStyles: {
                    0: { fontStyle: 'bold', fillColor: [245, 245, 245], cellWidth: 20 }
                },
                alternateRowStyles: {
                    fillColor: [250, 250, 250]
                },
                margin: {
                    left: 10,
                    right: 10,
                    bottom: 12
                }
            });

            // Footer
            const pageHeight = doc.internal.pageSize.getHeight();
            doc.setDrawColor(170, 170, 170);
            doc.setLineWidth(0.15);
            doc.line(14, pageHeight - 9, 283, pageHeight - 9);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'italic');
            doc.text(`Dicetak pada: ${new Date().toLocaleString('id-ID')}`, 14, pageHeight - 5);
            doc.text(`dibuat dengan eSantri Web by AI Projek | aiprojek01.my.id`, 283, pageHeight - 5, { align: 'right' });
        });

        doc.save(`${exportFileName}.pdf`);
        showToast('PDF Berhasil dibuat', 'success');
    };

    const openPreviewPrintWindow = () => {
        const source = document.getElementById('jadwal-print-area');
        if (!source) {
            showToast('Preview jadwal tidak ditemukan.', 'error');
            return;
        }

        const printWindow = window.open('', '_blank', 'width=1400,height=900');
        if (!printWindow) {
            showToast('Popup diblokir browser. Izinkan popup untuk fitur cetak.', 'error');
            return;
        }

        const sheetsHtml = Array.from(source.querySelectorAll('.jadwal-sheet'))
            .map((sheet) => (sheet as HTMLElement).outerHTML)
            .join('\n');

        if (!sheetsHtml.trim()) {
            showToast('Konten cetak jadwal kosong.', 'error');
            printWindow.close();
            return;
        }

        printWindow.document.write(`
            <html>
                <head>
                    <title>Preview Cetak Jadwal</title>
                    <style>
                        @page { size: A4 landscape; margin: 8mm; }
                        * { box-sizing: border-box; }
                        html, body { margin: 0; padding: 0; background: #fff; color: #111827; font-family: Arial, Helvetica, sans-serif; }
                        body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
                        .jadwal-print-root { padding: 0; margin: 0; }
                        .jadwal-sheet {
                            width: 100% !important;
                            min-height: calc(210mm - 16mm) !important;
                            margin: 0 0 8mm 0 !important;
                            padding: 0 !important;
                            background: #fff !important;
                            display: flex !important;
                            flex-direction: column !important;
                            page-break-after: always;
                            break-after: page;
                        }
                        .jadwal-sheet:last-child {
                            page-break-after: auto;
                            break-after: auto;
                        }
                        .jadwal-header-block {
                            break-inside: avoid-page;
                            page-break-inside: avoid;
                        }
                        .jadwal-header-block > div { margin-bottom: 3mm; }
                        .jadwal-header-block .flex { display: flex !important; justify-content: space-between !important; align-items: center !important; }
                        .jadwal-header-block .justify-center { justify-content: center !important; }
                        .jadwal-header-block .items-center { align-items: center !important; }
                        .jadwal-header-block .w-14 { width: 56px !important; min-width: 56px !important; height: 56px !important; }
                        .jadwal-header-block .h-14 { height: 56px !important; }
                        .jadwal-header-block .w-20 { width: 80px !important; min-width: 80px !important; height: 80px !important; }
                        .jadwal-header-block .h-20 { height: 80px !important; }
                        .jadwal-header-block .px-4 { padding-left: 12px !important; padding-right: 12px !important; }
                        .jadwal-header-block .text-center { text-align: center !important; }
                        .jadwal-header-block h2 { margin: 0; font-size: 30px; line-height: 1.15; font-weight: 700; text-align: center; }
                        .jadwal-header-block p { margin: 2px 0; text-align: center; }
                        .jadwal-header-block .text-xs { font-size: 12px !important; }
                        .jadwal-header-block .text-sm { font-size: 13px !important; }
                        .jadwal-header-block .text-base { font-size: 16px !important; }
                        .jadwal-header-block .text-lg { font-size: 18px !important; }
                        .jadwal-header-block .text-xl { font-size: 22px !important; }
                        .jadwal-header-block .font-bold { font-weight: 700 !important; }
                        .jadwal-header-block .font-semibold { font-weight: 600 !important; }
                        .jadwal-header-block img { max-width: 100%; max-height: 100%; object-fit: contain; display: block; }
                        .jadwal-header-block hr { border: 0; border-top: 2px solid #111827; margin: 5mm 0 4mm 0; }
                        .jadwal-header-block .print-header-subtitle { text-align: center !important; text-transform: uppercase; letter-spacing: 0.2px; }
                        .jadwal-table-block {
                            flex: 1 1 auto;
                            break-inside: avoid-page;
                            page-break-inside: avoid;
                            margin-top: 2mm;
                        }
                        .report-signature-footer {
                            display: flex !important;
                            justify-content: space-between !important;
                            align-items: center !important;
                            position: static !important;
                            margin-top: auto !important;
                            padding-top: 2mm !important;
                            border-top: 1px solid rgba(100, 116, 139, 0.55) !important;
                            font-size: 9px !important;
                            font-style: italic !important;
                            color: rgba(71, 85, 105, 0.78) !important;
                            break-inside: avoid-page;
                            page-break-inside: avoid;
                        }
                        table {
                            width: 100% !important;
                            border-collapse: collapse !important;
                            table-layout: fixed !important;
                            font-size: 9px !important;
                        }
                        th, td {
                            border: 1px solid #111827 !important;
                            vertical-align: top !important;
                            word-break: break-word;
                            white-space: normal;
                        }
                        th {
                            background: #e5e7eb !important;
                            text-align: center !important;
                            font-weight: 700 !important;
                        }
                        .page-break-after { page-break-after: always !important; break-after: page !important; }
                    </style>
                </head>
                <body>
                    <div class="jadwal-print-root">
                        ${sheetsHtml}
                    </div>
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
        }, 350);
    };

    const handlePrintGlobalTU = () => {
        const printWindow = window.open('', '_blank', 'width=1200,height=850');
        if (!printWindow) {
            showToast('Izinkan pop-up untuk mencetak rekap jadwal TU.', 'error');
            return;
        }

        const groupsToPrint = visibleRombelGroups.length > 0 ? visibleRombelGroups : [{
            id: 'all',
            key: 'all',
            title: 'Seluruh Rombel',
            badge: `${targetRombels.length} Kelas`,
            badgeColor: 'bg-teal-100 text-teal-900 border-teal-200',
            icon: 'bi-grid-fill',
            rombels: targetRombels,
        }];

        const activeDays = [0, 1, 2, 3, 4, 5, 6];

        let tablesHtml = '';
        groupsToPrint.forEach((group, gIdx) => {
            const groupRombels = group.rombels;
            if (groupRombels.length === 0) return;

            const theadRombels = groupRombels.map(r => `<th style="border:1px solid #0f766e; padding:6px; background:#0d9488; color:white; min-width:110px;">${r.nama}</th>`).join('');

            let tbodyRows = '';
            activeDays.forEach(dayIdx => {
                const dayName = days[dayIdx];
                jamConfig.forEach((jam, jIdx) => {
                    const cells = groupRombels.map(rombel => {
                        const j = jadwalList.find(item => item.rombelId === rombel.id && item.hari === dayIdx && item.jamKe === jam.urutan);
                        if (!j) return `<td style="border:1px solid #cbd5e1; padding:5px; text-align:center; color:#94a3b8; font-size:9.5px;">-</td>`;
                        const mapel = j.mapelId ? (settings.mataPelajaran.find(m => m.id === j.mapelId)?.nama || 'Tanpa Mapel') : 'Tanpa Mapel';
                        const guru = getGuruLabel(j.guruId);
                        return `
                            <td style="border:1px solid #cbd5e1; padding:5px; font-size:9.5px; background:#ffffff;">
                                <div style="font-weight:bold; color:#0f172a;">${mapel}</div>
                                <div style="color:#0d9488; font-size:9px; margin-top:1px;">${guru}</div>
                                ${j.ruangan ? `<div style="color:#64748b; font-size:8.5px;">R: ${j.ruangan}</div>` : ''}
                            </td>
                        `;
                    }).join('');

                    tbodyRows += `
                        <tr>
                            ${jIdx === 0 ? `
                                <td rowspan="${jamConfig.length}" style="border:1px solid #334155; padding:6px; font-weight:bold; background:#f1f5f9; text-align:center; font-size:11px; width:90px;">
                                    ${dayName}
                                </td>
                            ` : ''}
                            <td style="border:1px solid #cbd5e1; padding:5px; text-align:center; font-weight:600; background:#f8fafc; font-size:9.5px; width:95px;">
                                Jam ${jam.urutan}<br><span style="font-size:8.5px; color:#64748b; font-weight:normal;">${jam.jamMulai}-${jam.jamSelesai}</span>
                            </td>
                            ${cells}
                        </tr>
                    `;
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
                    <table style="width:100%; border-collapse:collapse; font-size:9.5px; margin-bottom:15px;">
                        <thead>
                            <tr>
                                <th style="border:1px solid #0f766e; background:#0d9488; color:white; width:90px;">Hari</th>
                                <th style="border:1px solid #0f766e; background:#0d9488; color:white; width:95px;">Jam & Waktu</th>
                                ${theadRombels}
                            </tr>
                        </thead>
                        <tbody>
                            ${tbodyRows}
                        </tbody>
                    </table>
                </div>
            `;
        });

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
                <head>
                    <title>Rekapitulasi Jadwal Global TU - ${jenjangLabel}</title>
                    <style>
                        @page { size: A4 landscape; margin: 8mm; }
                        body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 10px; color: #1e293b; }
                        .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #0d9488; padding-bottom: 6px; margin-bottom: 12px; }
                        .title { font-size: 14px; font-weight: bold; color: #0f172a; text-transform: uppercase; }
                        .sub { font-size: 11px; color: #475569; margin-top: 2px; }
                        table { width: 100%; border-collapse: collapse; font-size: 9.5px; }
                        tr { page-break-inside: avoid; }
                        th { padding: 6px; text-transform: uppercase; font-size: 10px; }
                        .footer { margin-top: 15px; font-size: 9px; color: #64748b; display: flex; justify-content: space-between; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div>
                            <div class="title">${settings.namaPonpes || 'PONDOK PESANTREN'} - REKAPITULASI JADWAL PELAJARAN GLOBAL (PEGANGAN TU)</div>
                            <div class="sub">MARHALAH / JENJANG: <strong>${jenjangLabel.toUpperCase()}</strong> | TAHUN AJARAN: <strong>${defaultAcademicYear}</strong></div>
                        </div>
                        <div style="font-size:10px; font-weight:600; color:#0d9488;">
                            Dokumen Resmi Jadwal KBM (Format Pisah Tabel Rombel)
                        </div>
                    </div>

                    ${tablesHtml}

                    <div class="footer">
                        <span>Dicetak otomatis oleh eSantri Web App | Rekap Global TU (${groupsToPrint.length} Kelompok Tabel)</span>
                        <span>Tanggal cetak: ${new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}</span>
                    </div>
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
        }, 350);
    };

    const handleExportExcelGlobalTU = async () => {
        if (isExporting) return;
        setIsExporting(true);
        try {
            const XLSX = await loadXLSX();
            const wb = XLSX.utils.book_new();

            const groupsToExport = visibleRombelGroups.length > 0 ? visibleRombelGroups : [{
                id: 'all',
                key: 'all',
                title: 'Seluruh Rombel',
                badge: `${targetRombels.length} Kelas`,
                badgeColor: '',
                icon: '',
                rombels: targetRombels,
            }];

            const activeDays = [0, 1, 2, 3, 4, 5, 6];

            groupsToExport.forEach((group, gIdx) => {
                const groupRombels = group.rombels;
                if (groupRombels.length === 0) return;

                const wsData: any[][] = [];
                wsData.push([`REKAPITULASI JADWAL PELAJARAN GLOBAL (PEGANGAN TU) - ${settings.namaPonpes || 'PESANTREN'}`]);
                wsData.push([`Marhalah: ${jenjangLabel} | Kelompok: ${group.title} (${groupRombels.map(r => r.nama).join(', ')})`]);
                wsData.push([]);

                // Header row
                const headerRow = ['Hari', 'Jam & Waktu', ...groupRombels.map(r => r.nama)];
                wsData.push(headerRow);

                activeDays.forEach(dayIdx => {
                    const dayName = days[dayIdx];
                    jamConfig.forEach(jam => {
                        const row: string[] = [dayName, `${jam.urutan} (${jam.jamMulai} - ${jam.jamSelesai})`];
                        groupRombels.forEach(rombel => {
                            const j = jadwalList.find(item => item.rombelId === rombel.id && item.hari === dayIdx && item.jamKe === jam.urutan);
                            if (!j) {
                                row.push('-');
                            } else {
                                const mapel = j.mapelId ? (settings.mataPelajaran.find(m => m.id === j.mapelId)?.nama || 'Tanpa Mapel') : 'Tanpa Mapel';
                                const guru = getGuruLabel(j.guruId);
                                row.push(`${mapel} (${guru})`);
                            }
                        });
                        wsData.push(row);
                    });
                });

                wsData.push([]);
                wsData.push(['dibuat dengan eSantri Web']);

                const ws = XLSX.utils.aoa_to_sheet(wsData);
                // Clean sheet name
                let sheetName = groupsToExport.length === 1 
                    ? 'Rekap_Global_TU' 
                    : `TU_${group.title.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').substring(0, 25)}`;
                if (sheetName.length > 31) sheetName = sheetName.substring(0, 31);

                XLSX.utils.book_append_sheet(wb, ws, sheetName);
            });

            XLSX.writeFile(wb, `${exportFileName}-rekap-global-tu.xlsx`);
            showToast('Rekap Global TU berhasil diekspor ke Excel', 'success');
        } catch (e) {
            showToast('Gagal mengekspor rekap global TU ke Excel', 'error');
        } finally {
            setIsExporting(false);
        }
    };

    const runExportAction = async (mode: 'pdfVisual' | 'pdfImage' | 'print' | 'excel' | 'word' | 'html' | 'globalTuExcel' | 'globalTuPrint') => {
        if (isExporting) return;
        if (targetRombels.length === 0) {
            showToast('Pilih setidaknya satu kelas untuk dicetak.', 'error');
            return;
        }

        setIsExportMenuOpen(false);
        setIsExporting(true);

        try {
            if (mode === 'globalTuExcel') {
                await handleExportExcelGlobalTU();
                return;
            }
            if (mode === 'globalTuPrint') {
                handlePrintGlobalTU();
                return;
            }
            if (mode === 'pdfVisual') {
                await handlePrint();
                return;
            }
            if (mode === 'pdfImage') {
                await printExportFacade.downloadPdfImage({ elementId: 'jadwal-print-area', fileName: exportFileName, paperSize: 'A4', target: 'jadwal' });
                showToast('PDF Gambar berhasil diunduh.', 'success');
                return;
            }
            if (mode === 'print') {
                openPreviewPrintWindow();
                return;
            }
            if (mode === 'excel') {
                await printExportFacade.downloadExcelVisual({ elementId: 'jadwal-print-area', fileName: exportFileName, paperSize: 'A4', target: 'jadwal' });
                showToast('Excel berhasil diunduh.', 'success');
                return;
            }
            if (mode === 'word') {
                printExportFacade.downloadWord({ elementId: 'jadwal-print-area', fileName: exportFileName, paperSize: 'A4', target: 'jadwal' });
                showToast('Word berhasil diunduh.', 'success');
                return;
            }
            if (mode === 'html') {
                printExportFacade.downloadHtml({ elementId: 'jadwal-print-area', fileName: exportFileName, paperSize: 'A4', target: 'jadwal' });
                showToast('HTML berhasil diunduh.', 'success');
            }
        } catch {
            showToast('Proses export gagal. Coba lagi.', 'error');
        } finally {
            setIsExporting(false);
        }
    };
    
    const getGuruLabel = (guruId?: number) => {
        if (!guruId) return '-';
        if (guruId === -1) return 'NIHIL / KOSONG';
        if (guruId === -2) return 'MUSYRIF / TAHFIZH';
        const teacher = settings.tenagaPengajar.find(t => t.id === guruId);
        if (!teacher) return '-';
        return teacher.kodeGuru ? `${teacher.kodeGuru} - ${teacher.nama}` : teacher.nama;
    };

    const getJadwalSheetTitle = (rombelId: number): string => {
        const rombel = settings.rombel.find((r) => r.id === rombelId);
        if (!rombel) return 'JADWAL PELAJARAN KELAS';

        const kelas = settings.kelas.find((k) => k.id === rombel.kelasId);
        const jenjang = kelas ? settings.jenjang.find((j) => j.id === kelas.jenjangId) : undefined;

        const parts = [
            jenjang?.nama ? `JENJANG ${jenjang.nama.toUpperCase()}` : '',
            kelas?.nama ? `KELAS ${kelas.nama.toUpperCase()}` : '',
            `ROMBEL ${rombel.nama.toUpperCase()}`,
        ].filter(Boolean);

        return `JADWAL PELAJARAN ${parts.join(' | ')}`;
    };

    const getRombelMeta = (rombelId: number): { jenjang: string; kelas: string; rombel: string } => {
        const rombel = settings.rombel.find((r) => r.id === rombelId);
        if (!rombel) return { jenjang: '-', kelas: '-', rombel: '-' };
        const kelas = settings.kelas.find((k) => k.id === rombel.kelasId);
        const jenjang = kelas ? settings.jenjang.find((j) => j.id === kelas.jenjangId) : undefined;
        return {
            jenjang: jenjang?.nama || '-',
            kelas: kelas?.nama || '-',
            rombel: rombel.nama || '-',
        };
    };

    // --- Archive Actions ---
    const handleArchive = async (judul: string, tahun: string, semester: 'Ganjil' | 'Genap') => {
        if (!filterJenjangId) return;
        const rombelIdsInJenjang = settings.rombel.filter(r => settings.kelas.find(k => k.id === r.kelasId)?.jenjangId === filterJenjangId).map(r => r.id);
        const schedulesToArchive = jadwalList.filter(j => rombelIdsInJenjang.includes(j.rombelId));
        if (schedulesToArchive.length === 0) {
            showToast('Tidak ada jadwal aktif di jenjang ini untuk diarsipkan.', 'error');
            return;
        }
        const newArchive: ArsipJadwal = {
            id: Date.now(),
            judul,
            tahunAjaran: tahun,
            semester,
            jenjangId: filterJenjangId,
            tanggalArsip: new Date().toISOString(),
            dataJSON: JSON.stringify(schedulesToArchive),
            lastModified: Date.now()
        };
        await db.arsipJadwal.add(newArchive);
        setIsArchiveModalOpen(false);
        showToast(`Berhasil mengarsipkan ${schedulesToArchive.length} item jadwal.`, 'success');
    };

    const handleRestore = (archive: ArsipJadwal) => {
        if (!canWrite) return;
        showConfirmation(
            'Pulihkan Arsip & Edit?',
            `PERINGATAN: Tindakan ini akan MENGHAPUS SEMUA jadwal aktif saat ini untuk jenjang yang sama dan menggantinya dengan data dari arsip "${archive.judul}". Lanjutkan?`,
            async () => {
                try {
                    const restoredData: JadwalPelajaran[] = JSON.parse(archive.dataJSON);
                    const rombelIdsInJenjang = settings.rombel.filter(r => settings.kelas.find(k => k.id === r.kelasId)?.jenjangId === archive.jenjangId).map(r => r.id);
                    const itemsToDelete = jadwalList.filter(j => rombelIdsInJenjang.includes(j.rombelId)).map(j => j.id);
                    await db.jadwalPelajaran.bulkDelete(itemsToDelete);
                    const itemsToInsert = restoredData.map(item => ({ ...item, id: Date.now() + Math.random(), lastModified: Date.now() }));
                    await db.jadwalPelajaran.bulkAdd(itemsToInsert as JadwalPelajaran[]);
                    showToast('Jadwal berhasil dipulihkan ke editor aktif.', 'success');
                    setActiveTab('active');
                    setFilterJenjangId(archive.jenjangId);
                } catch (e) {
                    showToast('Gagal memulihkan arsip.', 'error');
                }
            },
            { confirmText: 'Ya, Timpa & Edit', confirmColor: 'red' }
        );
    };

    const handleDeleteArchive = (id: number) => {
        if (!canWrite) return;
        showConfirmation('Hapus Arsip?', 'Arsip ini akan dihapus permanen.', async () => {
            await db.arsipJadwal.delete(id);
            showToast('Arsip dihapus.', 'success');
        }, { confirmColor: 'red' });
    }

    return (
        <div className="space-y-6 animate-fade-in">
             <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4 sticky top-0 z-40 shrink-0">
                <nav className="flex -mb-px">
                    <button onClick={() => setActiveTab('active')} className={`flex-1 py-3 px-1 text-center border-b-2 font-medium text-xs md:text-sm flex items-center justify-center gap-1 md:gap-2 ${activeTab === 'active' ? 'border-teal-500 text-teal-600 bg-teal-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                        <i className="bi bi-pencil-square text-base md:text-lg"></i> 
                        <span className="hidden xs:inline">Editor Jadwal Aktif</span>
                        <span className="xs:hidden">Editor</span>
                    </button>
                    <button onClick={() => setActiveTab('archive')} className={`flex-1 py-3 px-1 text-center border-b-2 font-medium text-xs md:text-sm flex items-center justify-center gap-1 md:gap-2 ${activeTab === 'archive' ? 'border-teal-500 text-teal-600 bg-teal-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                        <i className="bi bi-clock-history text-base md:text-lg"></i> 
                        <span className="hidden xs:inline">Arsip & Riwayat</span>
                        <span className="xs:hidden">Arsip</span>
                    </button>
                </nav>
            </div>

            {activeTab === 'active' && (
                <>
                    {/* Filter & Actions Bar */}
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-4">
                        {/* Mobile Actions Overlay */}
                        <div className="flex md:hidden items-center gap-2 mb-2">
                            <button 
                                onClick={() => setIsFilterDrawerOpen(true)}
                                className="flex-grow flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-50 text-teal-700 border border-teal-200 rounded-xl font-bold text-sm shadow-sm"
                            >
                                <i className="bi bi-funnel-fill"></i>
                                <span>Filter</span>
                            </button>
                            <div className="relative shrink-0">
                                <button onClick={() => setIsExportMenuOpen(v => !v)} disabled={targetRombels.length === 0 || isExporting} className="w-[44px] h-[44px] flex items-center justify-center bg-gray-900 text-white rounded-xl disabled:opacity-50 shadow-lg">
                                    <i className={`bi ${isExporting ? 'bi-arrow-repeat animate-spin' : 'bi-printer'} text-xl`}></i>
                                </button>
                                {isExportMenuOpen && (
                                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden divide-y divide-gray-100">
                                        <div className="p-1">
                                            <button disabled={isExporting} onClick={() => runExportAction('globalTuExcel')} className="w-full text-left px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50 rounded-lg flex items-center gap-2 disabled:opacity-50">
                                                <i className="bi bi-file-earmark-excel-fill text-emerald-600"></i> Rekap Global TU (Excel)
                                            </button>
                                            <button disabled={isExporting} onClick={() => runExportAction('globalTuPrint')} className="w-full text-left px-3 py-2 text-xs font-bold text-teal-800 hover:bg-teal-50 rounded-lg flex items-center gap-2 disabled:opacity-50">
                                                <i className="bi bi-printer-fill text-teal-600"></i> Rekap Global TU (Cetak)
                                            </button>
                                        </div>
                                        <div className="p-1">
                                            <button disabled={isExporting} onClick={() => runExportAction('pdfVisual')} className="w-full text-left px-3 py-2 text-xs hover:bg-red-50 rounded-lg disabled:opacity-50">PDF Tabel (Per Rombel)</button>
                                            <button disabled={isExporting} onClick={() => runExportAction('pdfImage')} className="w-full text-left px-3 py-2 text-xs hover:bg-orange-50 rounded-lg disabled:opacity-50">PDF Gambar</button>
                                            <button disabled={isExporting} onClick={() => runExportAction('print')} className="w-full text-left px-3 py-2 text-xs hover:bg-sky-50 rounded-lg disabled:opacity-50">Preview & Cetak Standar</button>
                                            <button disabled={isExporting} onClick={() => runExportAction('excel')} className="w-full text-left px-3 py-2 text-xs hover:bg-green-50 rounded-lg disabled:opacity-50">Excel Biasa</button>
                                            <button disabled={isExporting} onClick={() => runExportAction('word')} className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 rounded-lg disabled:opacity-50">Word</button>
                                            <button disabled={isExporting} onClick={() => runExportAction('html')} className="w-full text-left px-3 py-2 text-xs hover:bg-indigo-50 rounded-lg disabled:opacity-50">HTML</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Desktop Filter View */}
                        <div className="hidden md:grid md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5 tracking-widest">Jenjang Pendidikan</label>
                                <select value={filterJenjangId} onChange={e => { setFilterJenjangId(Number(e.target.value)); setFilterKelasId(0); setFilterRombelId(0); }} className="w-full border rounded-lg p-2.5 text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-teal-500 font-bold transition-all">
                                    {settings.jenjang.map(j => <option key={j.id} value={j.id}>{j.nama}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5 tracking-widest">Angkatan / Kelas</label>
                                <select value={filterKelasId} onChange={e => { setFilterKelasId(Number(e.target.value)); setFilterRombelId(0); }} className="w-full border rounded-lg p-2.5 text-sm bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 focus:bg-white focus:ring-2 focus:ring-teal-500 font-bold transition-all" disabled={!filterJenjangId}>
                                    <option value={0}>Semua Kelas</option>
                                    {availableKelas.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5 tracking-widest">Rombongan Belajar</label>
                                <select value={filterRombelId} onChange={e => setFilterRombelId(Number(e.target.value))} className="w-full border rounded-lg p-2.5 text-sm bg-teal-50/50 border-teal-100 disabled:bg-gray-50 focus:bg-white focus:ring-2 focus:ring-teal-500 font-bold transition-all" disabled={!filterJenjangId}>
                                    <option value={0}>Semua Rombel</option>
                                    {availableRombel.map(r => <option key={r.id} value={r.id}>{r.nama}</option>)}
                                </select>
                            </div>
                        </div>
                        
                        <div className="hidden md:grid md:grid-cols-4 gap-2.5 border-t border-gray-100 pt-4">
                             <button onClick={() => setIsTeacherLoadModalOpen(true)} className="w-full justify-center bg-indigo-50 text-indigo-700 border border-indigo-200 px-4 py-2.5 rounded-xl text-sm font-black flex items-center gap-2 hover:bg-indigo-100 transition-colors">
                                <i className="bi bi-bar-chart-fill"></i> 
                                <span className="md:inline">Rekap Jam</span>
                            </button>
                            {canWrite && (
                                <>
                                    <button onClick={handleAutoGenerate} className="w-full justify-center bg-teal-600 text-white px-4 py-2.5 rounded-xl text-sm font-black flex items-center gap-2 hover:bg-teal-700 shadow-md transition-all active:scale-95">
                                        <i className="bi bi-magic"></i>
                                        <span>Auto</span>
                                    </button>
                                    <button onClick={() => setIsArchiveModalOpen(true)} className="w-full justify-center bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-black flex items-center gap-2 hover:bg-blue-700 shadow-md transition-all active:scale-95">
                                        <i className="bi bi-archive-fill"></i>
                                        <span>Arsip</span>
                                    </button>
                                </>
                            )}
                            <div className={`relative ${canWrite ? '' : 'md:col-span-3'}`}>
                                <button onClick={() => setIsExportMenuOpen(v => !v)} disabled={targetRombels.length === 0 || isExporting} className="w-full justify-center bg-gray-900 text-white px-4 py-2.5 rounded-xl text-sm font-black items-center gap-2 hover:bg-black disabled:opacity-50 transition-all flex">
                                    <i className={`bi ${isExporting ? 'bi-arrow-repeat animate-spin' : 'bi-printer'}`}></i>
                                    <span>{isExporting ? 'Memproses...' : 'Aksi Cetak Mapel'}</span>
                                    <i className={`bi ${isExportMenuOpen ? 'bi-chevron-up' : 'bi-chevron-down'} text-xs`}></i>
                                </button>
                                {isExportMenuOpen && (
                                    <div className="absolute right-0 mt-2 w-60 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden divide-y divide-gray-100">
                                        <div className="p-1">
                                            <button disabled={isExporting} onClick={() => runExportAction('globalTuExcel')} className="w-full text-left px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50 rounded-lg flex items-center gap-2 disabled:opacity-50">
                                                <i className="bi bi-file-earmark-excel-fill text-emerald-600"></i> Rekap Global TU (Excel)
                                            </button>
                                            <button disabled={isExporting} onClick={() => runExportAction('globalTuPrint')} className="w-full text-left px-3 py-2 text-xs font-bold text-teal-800 hover:bg-teal-50 rounded-lg flex items-center gap-2 disabled:opacity-50">
                                                <i className="bi bi-printer-fill text-teal-600"></i> Rekap Global TU (Cetak)
                                            </button>
                                        </div>
                                        <div className="p-1">
                                            <button disabled={isExporting} onClick={() => runExportAction('pdfVisual')} className="w-full text-left px-3 py-2 text-xs hover:bg-red-50 rounded-lg disabled:opacity-50">PDF Tabel (Per Rombel)</button>
                                            <button disabled={isExporting} onClick={() => runExportAction('pdfImage')} className="w-full text-left px-3 py-2 text-xs hover:bg-orange-50 rounded-lg disabled:opacity-50">PDF Gambar</button>
                                            <button disabled={isExporting} onClick={() => runExportAction('print')} className="w-full text-left px-3 py-2 text-xs hover:bg-sky-50 rounded-lg disabled:opacity-50">Preview & Cetak Standar</button>
                                            <button disabled={isExporting} onClick={() => runExportAction('excel')} className="w-full text-left px-3 py-2 text-xs hover:bg-green-50 rounded-lg disabled:opacity-50">Excel Biasa</button>
                                            <button disabled={isExporting} onClick={() => runExportAction('word')} className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 rounded-lg disabled:opacity-50">Word</button>
                                            <button disabled={isExporting} onClick={() => runExportAction('html')} className="w-full text-left px-3 py-2 text-xs hover:bg-indigo-50 rounded-lg disabled:opacity-50">HTML</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Mobile Filter Drawer */}
                    <MobileFilterDrawer 
                        isOpen={isFilterDrawerOpen} 
                        onClose={() => setIsFilterDrawerOpen(false)}
                        title="Filter Jadwal"
                    >
                        <div className="space-y-6">
                            <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                                <label className="block text-xs font-black text-gray-400 uppercase mb-3 tracking-widest">Pilih Jenjang</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {settings.jenjang.map(j => (
                                        <button 
                                            key={j.id} 
                                            onClick={() => { setFilterJenjangId(j.id); setFilterKelasId(0); setFilterRombelId(0); }}
                                            className={`py-3 px-4 rounded-2xl text-sm font-bold transition-all border ${filterJenjangId === j.id ? 'bg-teal-600 text-white border-teal-600 shadow-lg' : 'bg-white text-gray-600 border-gray-200'}`}
                                        >
                                            {j.nama}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase mb-2 tracking-widest ml-1">Pilih Kelas</label>
                                    <select 
                                        value={filterKelasId} 
                                        onChange={e => { setFilterKelasId(Number(e.target.value)); setFilterRombelId(0); }} 
                                        className="w-full border-2 border-gray-100 rounded-2xl p-4 text-base font-bold bg-white focus:border-teal-500 outline-none transition-all disabled:opacity-50"
                                        disabled={!filterJenjangId}
                                    >
                                        <option value={0}>Semua Kelas</option>
                                        {availableKelas.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase mb-2 tracking-widest ml-1">Pilih Rombongan Belajar</label>
                                    <select 
                                        value={filterRombelId} 
                                        onChange={e => setFilterRombelId(Number(e.target.value))} 
                                        className="w-full border-2 border-gray-100 rounded-2xl p-4 text-base font-bold bg-white focus:border-teal-500 outline-none transition-all disabled:opacity-50"
                                        disabled={!filterJenjangId}
                                    >
                                        <option value={0}>Semua Rombongan Belajar</option>
                                        {availableRombel.map(r => <option key={r.id} value={r.id}>{r.nama}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Mobile specific Actions */}
                            {canWrite && (
                                <div className="space-y-3">
                                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Tindakan Editor</h4>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button 
                                            onClick={() => { handleAutoGenerate(); setIsFilterDrawerOpen(false); }} 
                                            className="bg-teal-50 text-teal-700 border border-teal-100 p-4 rounded-2xl flex flex-col items-center justify-center gap-2 shadow-sm"
                                        >
                                            <i className="bi bi-magic text-2xl"></i>
                                            <span className="text-xs font-black">Auto Build</span>
                                        </button>
                                        <button 
                                            onClick={() => { setIsArchiveModalOpen(true); setIsFilterDrawerOpen(false); }} 
                                            className="bg-blue-50 text-blue-700 border border-blue-100 p-4 rounded-2xl flex flex-col items-center justify-center gap-2 shadow-sm"
                                        >
                                            <i className="bi bi-archive text-2xl"></i>
                                            <span className="text-xs font-black">Arsipkan</span>
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="p-6 bg-gray-900 rounded-[2rem] text-center">
                                <div className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-1">Status Editor</div>
                                <div className="text-xl font-black text-white">{activeJenjang?.nama || 'Pilih Jenjang'}</div>
                            </div>
                        </div>
                    </MobileFilterDrawer>

                    {/* Main Content */}
                    {filterRombelId ? (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                            {/* Time Slot Config (Left) */}
                            <div className="lg:col-span-3">
                                <div id="jam-config-panel" className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="font-bold text-gray-700 text-sm">Pengaturan Jam</h3>
                                        {canWrite && <button onClick={() => {
                                            handleSaveJamConfig(jamConfig);
                                        }} className="text-xs text-teal-600 font-bold hover:underline">Simpan</button>}
                                    </div>
                                    <div className="space-y-2 text-xs">
                                        {jamConfig.map((jam, idx) => (
                                            <div key={jam.id} className="flex gap-2 items-center group">
                                                <div className="w-6 font-bold text-center">{jam.urutan}</div>
                                                <input type="time" value={jam.jamMulai} onChange={e => { const newConfig = [...jamConfig]; newConfig[idx] = { ...newConfig[idx], jamMulai: e.target.value }; setLocalJamConfig(newConfig); }} className="border rounded p-1 w-16 text-center" disabled={!canWrite} />
                                                <span>-</span>
                                                <input type="time" value={jam.jamSelesai} onChange={e => { const newConfig = [...jamConfig]; newConfig[idx] = { ...newConfig[idx], jamSelesai: e.target.value }; setLocalJamConfig(newConfig); }} className="border rounded p-1 w-16 text-center" disabled={!canWrite} />
                                                {canWrite && (
                                                    <button type="button" onClick={() => handleRemoveJam(idx)} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <i className="bi bi-trash"></i>
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    {canWrite && (
                                        <div className="space-y-2 mt-3">
                                            <button type="button" onClick={handleAddJam} className="w-full border border-dashed border-teal-300 text-teal-700 p-1.5 rounded text-xs font-bold hover:bg-teal-50 flex items-center justify-center gap-1">
                                                <i className="bi bi-plus-circle"></i> Tambah Jam
                                            </button>
                                             <button onClick={() => setIsCopyModalOpen(true)} className="w-full bg-blue-50 text-blue-700 border border-blue-200 p-1.5 rounded text-xs font-bold hover:bg-blue-100 flex items-center justify-center gap-1">
                                                <i className="bi bi-copy"></i> Salin Jadwal Dari...
                                            </button>
                                        </div>
                                    )}
                                    <p className="text-[10px] text-gray-500 mt-2 italic">Edit jam lalu klik Simpan. Jam ini berlaku untuk semua kelas di jenjang {activeJenjang?.nama}.</p>
                                </div>
                            </div>

                            {/* Schedule Grid (Right) */}
                            <div className="lg:col-span-9 bg-white p-4 rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
                                <table className="w-full text-sm border-collapse">
                                    <thead>
                                        <tr>
                                            <th className="p-2 border bg-gray-100 w-16">Jam</th>
                                            {days.map((day, i) => (
                                                <th key={day} className={`p-2 border bg-gray-100 ${i === 5 ? 'text-red-600' : ''}`}>{day}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {jamConfig.map(jam => (
                                            <tr key={jam.id}>
                                                <td className="p-2 border text-center bg-gray-50 font-medium">
                                                    <div className="text-lg">{jam.urutan}</div>
                                                    <div className="text-[10px] text-gray-500">{jam.jamMulai}</div>
                                                </td>
                                                {days.map((day, dayIdx) => {
                                                    const item = jadwalList.find(j => j.rombelId === filterRombelId && j.hari === dayIdx && j.jamKe === jam.urutan);
                                                    const mapel = item?.mapelId ? settings.mataPelajaran.find(m => m.id === item.mapelId) : null;
                                                    const guruLabel = getGuruLabel(item?.guruId);

                                                    return (
                                                        <td 
                                                            key={dayIdx} 
                                                            onClick={() => handleCellClick(dayIdx, jam.urutan)}
                                                            className={`p-1 border h-20 w-32 align-top transition-colors ${canWrite ? 'cursor-pointer hover:bg-teal-50' : ''}`}
                                                        >
                                                            {item ? (
                                                                <div className={`h-full w-full p-1.5 rounded text-xs flex flex-col justify-between ${item.keterangan ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-50 text-blue-900 border border-blue-100'}`}>
                                                                    {item.keterangan ? (
                                                                        <div className="font-bold text-center my-auto">{item.keterangan}</div>
                                                                    ) : (
                                                                        <>
                                                                            <div className="font-bold line-clamp-2 leading-tight">{mapel?.nama || 'Unknown'}</div>
                                                                            <div className={`text-[10px] truncate mt-1 ${item.guruId && item.guruId < 0 ? 'font-bold text-red-500' : 'text-gray-600'}`}>
                                                                                {guruLabel}
                                                                            </div>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                canWrite && <div className="h-full w-full flex items-center justify-center opacity-0 hover:opacity-50">
                                                                    <i className="bi bi-plus-lg text-gray-400"></i>
                                                                </div>
                                                            )}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {targetRombels.length > 0 && (
                                <div className="space-y-3 bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs">
                                    <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
                                        {/* Tampilan Switcher */}
                                        <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl text-xs font-bold w-full sm:w-auto">
                                            <button
                                                type="button"
                                                onClick={() => setViewLayout('cards')}
                                                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                                                    viewLayout === 'cards' ? 'bg-white text-teal-800 shadow-2xs' : 'text-gray-600 hover:text-gray-900'
                                                }`}
                                            >
                                                <i className="bi bi-grid-fill"></i>
                                                <span>Kartu Per Rombel</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setViewLayout('global_tu')}
                                                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                                                    viewLayout === 'global_tu' ? 'bg-white text-teal-800 shadow-2xs' : 'text-gray-600 hover:text-gray-900'
                                                }`}
                                            >
                                                <i className="bi bi-table"></i>
                                                <span>Rekap Global TU</span>
                                            </button>
                                        </div>

                                        {/* Split Option Selector (Khusus Rekap Global TU) */}
                                        {viewLayout === 'global_tu' && targetRombels.length > 1 && (
                                            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs">
                                                <span className="font-bold text-slate-700 flex items-center gap-1.5">
                                                    <i className="bi bi-layout-split text-teal-600"></i>
                                                    <span>Pisah Tabel:</span>
                                                </span>
                                                <select
                                                    value={splitMode}
                                                    onChange={(e) => {
                                                        setSplitMode(e.target.value as RombelSplitMode);
                                                        setActiveGroupFilter('all');
                                                    }}
                                                    className="font-bold bg-white border border-gray-300 rounded-md px-2 py-1 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-hidden text-xs shadow-2xs"
                                                >
                                                    <option value="gender">Pisah Putra & Putri (Banin / Banat)</option>
                                                    <option value="kelas">Pisah Per Tingkat Kelas</option>
                                                    <option value="chunk3">Bagi Maks 3 Rombel / Tabel</option>
                                                    <option value="chunk4">Bagi Maks 4 Rombel / Tabel</option>
                                                    <option value="all">Satu Tabel Penuh (Gabung Semua)</option>
                                                </select>
                                            </div>
                                        )}

                                        {/* Action Buttons: Cetak & Export Excel */}
                                        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                                            <button
                                                type="button"
                                                onClick={handlePrintGlobalTU}
                                                className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-50 flex items-center gap-1.5 shadow-2xs"
                                                title="Cetak format A4 Landscape rapi per kelompok tabel"
                                            >
                                                <i className="bi bi-printer"></i>
                                                <span>Cetak Rekap TU</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleExportExcelGlobalTU}
                                                disabled={isExporting}
                                                className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
                                                title="Export ke Excel dengan lembar kerja (worksheet) per kelompok"
                                            >
                                                <i className="bi bi-file-earmark-excel"></i>
                                                <span>Export Excel TU</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Filter Kelompok Tab (hanya muncul saat split aktif dan ada lebih dari 1 kelompok) */}
                                    {viewLayout === 'global_tu' && splitMode !== 'all' && rombelGroups.length > 1 && (
                                        <div className="pt-2 border-t border-gray-200/80 flex items-center gap-2 flex-wrap">
                                            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mr-1">
                                                Tampilan Tabel:
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => setActiveGroupFilter('all')}
                                                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                                    activeGroupFilter === 'all'
                                                        ? 'bg-teal-700 text-white shadow-2xs'
                                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                }`}
                                            >
                                                <i className="bi bi-layers-fill"></i>
                                                <span>Semua Kelompok ({rombelGroups.length} Tabel Bersusun)</span>
                                            </button>
                                            {rombelGroups.map(group => (
                                                <button
                                                    key={group.id}
                                                    type="button"
                                                    onClick={() => setActiveGroupFilter(group.id)}
                                                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                                        activeGroupFilter === group.id
                                                            ? 'bg-teal-700 text-white shadow-2xs'
                                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                    }`}
                                                >
                                                    <i className={`bi ${group.icon}`}></i>
                                                    <span>{group.title}</span>
                                                    <span className="text-[10px] px-1.5 py-0.2 bg-black/10 rounded-full font-mono">
                                                        {group.rombels.length}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {targetRombels.length > 0 ? (
                                viewLayout === 'global_tu' ? (
                                    <div className="space-y-6">
                                        {visibleRombelGroups.map((group, groupIdx) => (
                                            <div key={group.id} className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
                                                {/* Header Tabel Kelompok */}
                                                <div className="p-3 bg-gradient-to-r from-teal-50 via-slate-50 to-white border-b border-teal-100 flex flex-col sm:flex-row justify-between sm:items-center gap-2 text-xs">
                                                    <div className="font-bold text-teal-950 flex items-center gap-2">
                                                        <span className="w-7 h-7 rounded-lg bg-teal-600 text-white flex items-center justify-center shadow-2xs">
                                                            <i className={`bi ${group.icon}`}></i>
                                                        </span>
                                                        <div>
                                                            <div className="font-black text-slate-900 text-sm flex items-center gap-2">
                                                                <span>{group.title}</span>
                                                                {rombelGroups.length > 1 && (
                                                                    <span className="text-[10px] text-gray-500 font-normal">
                                                                        (Tabel {groupIdx + 1} dari {visibleRombelGroups.length})
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="text-[11px] text-gray-500 font-normal">
                                                                {group.subtitle || `${group.rombels.length} Rombel Terdaftar`}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${group.badgeColor}`}>
                                                            {group.badge}
                                                        </span>
                                                        <span className="text-[11px] text-gray-400 hidden md:inline">
                                                            Klik sel untuk edit jadwal
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Matriks Tabel Rombel */}
                                                <div className="overflow-x-auto">
                                                    <table className="w-full border-collapse text-left text-xs min-w-[700px]">
                                                        <thead>
                                                            <tr className="bg-slate-100 border-b border-gray-300 text-slate-800 font-bold">
                                                                <th className="p-3 w-28 text-center border-r border-gray-300">Hari</th>
                                                                <th className="p-3 w-36 text-center border-r border-gray-300">Jam & Waktu</th>
                                                                {group.rombels.map(r => (
                                                                    <th key={r.id} className="p-3 text-center border-r border-gray-300 min-w-[150px] bg-slate-50/80">
                                                                        <div className="text-teal-900 font-bold">{r.nama}</div>
                                                                        <div className="text-[10px] text-gray-500 font-normal">{getRombelMeta(r.id).kelas}</div>
                                                                    </th>
                                                                ))}
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-200">
                                                            {[0, 1, 2, 3, 4, 5, 6].map(dayIdx => {
                                                                const dayName = days[dayIdx];
                                                                return jamConfig.map((jam, jIdx) => (
                                                                    <tr key={`${dayIdx}_${jam.urutan}`} className="hover:bg-teal-50/20">
                                                                        {jIdx === 0 && (
                                                                            <td
                                                                                rowSpan={jamConfig.length}
                                                                                className="p-3 text-center font-black text-teal-950 bg-teal-50/60 border-r border-gray-300 align-middle text-sm"
                                                                            >
                                                                                <div className="flex flex-col items-center justify-center">
                                                                                    <span>{dayName}</span>
                                                                                    <span className="text-[10px] font-normal text-teal-700 mt-0.5">{jamConfig.length} Jam</span>
                                                                                </div>
                                                                            </td>
                                                                        )}
                                                                        <td className="p-2.5 text-center font-bold text-gray-700 bg-gray-50/60 border-r border-gray-200">
                                                                            <div className="text-xs">Jam {jam.urutan}</div>
                                                                            <div className="text-[10px] text-gray-500 font-mono mt-0.5">{jam.jamMulai} - {jam.jamSelesai}</div>
                                                                        </td>
                                                                        {group.rombels.map(rombel => {
                                                                            const j = jadwalList.find(item => item.rombelId === rombel.id && item.hari === dayIdx && item.jamKe === jam.urutan);
                                                                            if (!j) {
                                                                                return (
                                                                                    <td
                                                                                        key={rombel.id}
                                                                                        onClick={() => {
                                                                                            if (canWrite) {
                                                                                                setFilterRombelId(rombel.id);
                                                                                                handleCellClick(dayIdx, jam.urutan);
                                                                                            }
                                                                                        }}
                                                                                        className="p-3 text-center text-gray-300 border-r border-gray-100 font-mono text-[11px] hover:bg-teal-50 cursor-pointer"
                                                                                        title="Klik untuk mengisi jadwal"
                                                                                    >
                                                                                        -
                                                                                    </td>
                                                                                );
                                                                            }
                                                                            const mapel = j.mapelId ? settings.mataPelajaran.find(m => m.id === j.mapelId)?.nama : 'Tanpa Mapel';
                                                                            const guru = getGuruLabel(j.guruId);
                                                                            return (
                                                                                <td
                                                                                    key={rombel.id}
                                                                                    onClick={() => {
                                                                                        if (canWrite) {
                                                                                            setFilterRombelId(rombel.id);
                                                                                            handleCellClick(dayIdx, jam.urutan);
                                                                                        }
                                                                                    }}
                                                                                    className="p-2.5 border-r border-gray-200 bg-white hover:bg-teal-50 transition-colors cursor-pointer"
                                                                                    title="Klik untuk mengubah jadwal"
                                                                                >
                                                                                    <div className="font-bold text-gray-900 leading-tight">{mapel}</div>
                                                                                    <div className="text-[11px] text-teal-700 font-medium mt-0.5 flex items-center gap-1">
                                                                                        <i className="bi bi-person"></i>
                                                                                        <span>{guru}</span>
                                                                                    </div>
                                                                                    {j.ruangan && (
                                                                                        <div className="text-[10px] text-gray-400 mt-0.5">R: {j.ruangan}</div>
                                                                                    )}
                                                                                </td>
                                                                            );
                                                                        })}
                                                                    </tr>
                                                                ));
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                                        {targetRombels.map(rombel => (
                                            <div key={rombel.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                                                <div className="flex justify-between items-center mb-4 pb-2 border-b">
                                                    <div>
                                                        <h3 className="font-bold text-gray-800 flex items-center gap-2"><i className="bi bi-calendar-event text-teal-600"></i> {rombel.nama}</h3>
                                                        <p className="text-[11px] text-gray-500 mt-0.5">
                                                            Jenjang: {getRombelMeta(rombel.id).jenjang} | Kelas: {getRombelMeta(rombel.id).kelas}
                                                        </p>
                                                    </div>
                                                    {canWrite && (
                                                        <button onClick={() => handleEditRombel(rombel.id)} className="text-xs bg-teal-50 text-teal-700 px-3 py-1.5 rounded hover:bg-teal-100 font-medium border border-teal-200 flex items-center gap-1 transition-colors">
                                                            <i className="bi bi-pencil-square"></i> Edit Jadwal
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-xs border-collapse">
                                                        <thead className="bg-gray-50 text-gray-600">
                                                            <tr>
                                                                <th className="p-1 border w-8">Jam</th>
                                                                {days.map((d, i) => <th key={d} className={`p-1 border ${i===5?'text-red-500':''}`}>{d.substring(0,3)}</th>)}
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {jamConfig.map(jam => (
                                                                <tr key={jam.id}>
                                                                    <td className="p-1 border text-center font-bold bg-gray-50">{jam.urutan}</td>
                                                                    {days.map((day, dayIdx) => {
                                                                        const item = jadwalList.find(j => j.rombelId === rombel.id && j.hari === dayIdx && j.jamKe === jam.urutan);
                                                                        const mapel = item?.mapelId ? settings.mataPelajaran.find(m => m.id === item.mapelId)?.nama : '';
                                                                        return (
                                                                            <td key={dayIdx} className="p-1 border h-8 align-middle text-center relative hover:bg-gray-50 cursor-pointer" onClick={() => { if(canWrite) { setFilterRombelId(rombel.id); handleCellClick(dayIdx, jam.urutan); } }}>
                                                                                {item ? (
                                                                                    item.keterangan ? <span className="text-yellow-700 font-medium text-[9px]">{item.keterangan}</span> : <span className="font-medium text-gray-800 line-clamp-1 text-[9px]" title={mapel}>{mapel}</span>
                                                                                ) : ''}
                                                                            </td>
                                                                        )
                                                                    })}
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )
                            ) : (
                                <div className="text-center py-20 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                                    <i className="bi bi-calendar-range text-4xl text-gray-300 mb-2 block"></i>
                                    <p className="text-gray-500">Pilih Jenjang atau Kelas untuk melihat jadwal.</p>
                                </div>
                            )}
                        </div>
                    )}
                    
                    <JadwalModal 
                        isOpen={isJadwalModalOpen} 
                        onClose={() => setIsJadwalModalOpen(false)} 
                        onSave={handleSaveJadwal} 
                        onDelete={handleDeleteJadwal}
                        slot={selectedSlot}
                        initialData={editingJadwal}
                        days={days}
                        mapelList={settings.mataPelajaran.filter(m => m.jenjangId === filterJenjangId)}
                        teacherList={settings.tenagaPengajar}
                        currentRombelId={filterRombelId}
                    />
                    
                    <ArchiveModal 
                        isOpen={isArchiveModalOpen}
                        onClose={() => setIsArchiveModalOpen(false)}
                        onSave={handleArchive}
                        jenjangName={activeJenjang?.nama || 'Unknown'}
                        defaultAcademicYear={defaultAcademicYear}
                        availableAcademicYears={availableAcademicYears}
                    />

                    {isCopyModalOpen && (
                        <CopyScheduleModal 
                            isOpen={isCopyModalOpen}
                            onClose={() => setIsCopyModalOpen(false)}
                            onCopy={handleCopySchedule}
                            rombels={availableRombel}
                            currentRombelId={filterRombelId}
                        />
                    )}

                    {isTeacherLoadModalOpen && (
                        <TeacherLoadModal 
                            isOpen={isTeacherLoadModalOpen}
                            onClose={() => setIsTeacherLoadModalOpen(false)}
                            teachers={settings.tenagaPengajar}
                            jadwalList={jadwalList}
                            rombels={settings.rombel}
                        />
                    )}

                    {/* Hidden Print Area */}
                    <div className="hidden print:block">
                        <div id="jadwal-print-area">
                            {targetRombels.map((rombel, idx) => (
                                <div key={rombel.id} className={`printable-content-wrapper jadwal-sheet print-landscape bg-white relative ${idx < targetRombels.length - 1 ? 'page-break-after' : ''}`} style={{ width: '29.7cm', minHeight: '21cm' }}> 
                                    <div className="jadwal-header-block">
                                        <PrintHeader settings={settings} compact title={getJadwalSheetTitle(rombel.id)} />
                                    </div>
                                    <div className="jadwal-table-block">
                                    <table className="w-full border-collapse border border-black text-center text-[9px] mt-1">
                                        <thead className="bg-gray-200 uppercase font-bold">
                                            <tr>
                                                <th className="p-1 border border-black w-14">Jam</th>
                                                {days.map(d => <th key={d} className="p-1 border border-black">{d}</th>)}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {jamConfig.map(jam => (
                                                <tr key={jam.id}>
                                                    <td className="p-0.5 border border-black bg-gray-100 font-bold leading-tight">
                                                        {jam.urutan}<br/><span className="font-normal text-[9px]">{jam.jamMulai}-{jam.jamSelesai}</span>
                                                    </td>
                                                    {days.map((day, dayIdx) => {
                                                        const item = jadwalList.find(j => j.rombelId === rombel.id && j.hari === dayIdx && j.jamKe === jam.urutan);
                                                        const mapel = item?.mapelId ? settings.mataPelajaran.find(m => m.id === item.mapelId)?.nama : '';
                                                        const guru = getGuruLabel(item?.guruId);

                                                        return (
                                                            <td key={dayIdx} className="p-0.5 border border-black align-top h-10 leading-tight">
                                                                {item ? (
                                                                    item.keterangan ? (
                                                                        <div className="font-bold italic">{item.keterangan}</div>
                                                                    ) : (
                                                                        <>
                                                                            <div className="font-bold text-[9px]">{mapel}</div>
                                                                            <div className="text-[8px]">{guru}</div>
                                                                        </>
                                                                    )
                                                                ) : ''}
                                                            </td>
                                                        )
                                                    })}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    </div>
                                    <div
                                        className="report-signature-footer print-meta border-t border-gray-400 text-[8pt] text-gray-500 italic w-full flex items-center justify-between px-8"
                                        style={{ marginTop: '0.2cm', paddingTop: '0.15cm', paddingBottom: '0.05cm', background: 'white' }}
                                    >
                                        <span>Dicetak pada: {new Date().toLocaleString('id-ID')}</span>
                                        <span>dibuat dengan eSantri Web by AI Projek | aiprojek01.my.id</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}

            {activeTab === 'archive' && (
                <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                    <h3 className="font-bold text-gray-800 text-lg mb-4">Arsip & Riwayat Jadwal</h3>
                    
                    {arsipList.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {arsipList.map(a => {
                                const jenjangName = settings.jenjang.find(j => j.id === a.jenjangId)?.nama || 'Unknown Jenjang';
                                return (
                                    <div key={a.id} className="border p-4 rounded-lg bg-gray-50 hover:shadow-md transition-shadow relative group">
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="font-bold text-teal-800">{a.judul}</h4>
                                            <span className={`text-xs px-2 py-1 rounded border ${a.semester === 'Ganjil' ? 'bg-yellow-100 border-yellow-300 text-yellow-800' : 'bg-green-100 border-green-300 text-green-800'}`}>{a.semester}</span>
                                        </div>
                                        <p className="text-sm font-medium text-gray-700">{jenjangName}</p>
                                        <p className="text-xs text-gray-500 mb-4">TA: {formatAcademicYearDisplay(settings, a.tahunAjaran)} • Diarsipkan: {formatDate(a.tanggalArsip)}</p>
                                        
                                        <div className="flex gap-2">
                                            {canWrite && (
                                                <button onClick={() => handleRestore(a)} className="flex-1 bg-white border border-blue-300 text-blue-700 text-xs py-1.5 rounded hover:bg-blue-50 font-medium">
                                                    <i className="bi bi-arrow-counterclockwise mr-1"></i> Pulihkan ke Editor
                                                </button>
                                            )}
                                            {canWrite && (
                                                <button onClick={() => handleRestore(a)} className="flex-1 bg-blue-600 text-white text-xs py-1.5 rounded hover:bg-blue-700 font-medium">
                                                    <i className="bi bi-pencil-square mr-1"></i> Edit Ulang
                                                </button>
                                            )}
                                        </div>
                                        {canWrite && <button onClick={() => handleDeleteArchive(a.id)} className="absolute top-2 right-2 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"><i className="bi bi-trash-fill"></i></button>}
                                    </div>
                                )
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-gray-400">
                            <i className="bi bi-archive text-4xl mb-2 block opacity-50"></i>
                            <p>Belum ada arsip jadwal.</p>
                            <p className="text-xs mt-1">Gunakan tombol "Arsipkan Jadwal" di tab Editor untuk menyimpan snapshot.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
