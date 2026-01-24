
import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../AppContext';
import { useLiveQuery } from "dexie-react-hooks";
import { db } from '../../db';
import { JadwalPelajaran, JamPelajaran, ArsipJadwal, Rombel, TenagaPengajar } from '../../types';
import { JadwalModal } from './modals/JadwalModal';
import { printToPdfNative } from '../../utils/pdfGenerator';
import { PrintHeader } from '../common/PrintHeader';
import { ReportFooter, formatDate } from '../reports/modules/Common';

// --- MODAL ARSIP ---
interface ArchiveModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (judul: string, tahun: string, semester: 'Ganjil' | 'Genap') => void;
    jenjangName: string;
}

const ArchiveModal: React.FC<ArchiveModalProps> = ({ isOpen, onClose, onSave, jenjangName }) => {
    const [judul, setJudul] = useState('');
    const [tahun, setTahun] = useState('2024/2025');
    const [semester, setSemester] = useState<'Ganjil' | 'Genap'>('Ganjil');

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
                            <input type="text" value={tahun} onChange={e => setTahun(e.target.value)} className="w-full border rounded p-2 text-sm" />
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
        
        // Init stats for all teachers
        teachers.forEach(t => {
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

    // Tabs
    const [activeTab, setActiveTab] = useState<'active' | 'archive'>('active');

    // Filters Active View
    const [filterJenjangId, setFilterJenjangId] = useState<number>(settings.jenjang[0]?.id || 0);
    const [filterKelasId, setFilterKelasId] = useState<number>(0);
    const [filterRombelId, setFilterRombelId] = useState<number>(0);

    // Modal State
    const [isJadwalModalOpen, setIsJadwalModalOpen] = useState(false);
    const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
    const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
    const [isTeacherLoadModalOpen, setIsTeacherLoadModalOpen] = useState(false);
    
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

    // Get Jam Config for current Jenjang
    const jamConfig = useMemo(() => {
        const defaults: JamPelajaran[] = Array.from({ length: 8 }, (_, i) => ({
            id: Date.now() + i, urutan: i + 1, jamMulai: '07:00', jamSelesai: '07:45', jenis: 'KBM', jenjangId: filterJenjangId
        }));
        
        if (settings.jamPelajaran) {
            const saved = settings.jamPelajaran.filter(j => j.jenjangId === filterJenjangId);
            if (saved.length > 0) return saved.sort((a,b) => a.urutan - b.urutan);
        }
        return defaults;
    }, [settings.jamPelajaran, filterJenjangId]);

    const days = ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

    // --- Actions Active View ---

    const handleSaveJadwal = async (data: Partial<JadwalPelajaran>) => {
        if (!filterRombelId) return;

        // Check Conflict
        if (data.guruId && data.guruId > 0) {
            const conflict = jadwalList.find(j => 
                j.hari === data.hari && 
                j.jamKe === data.jamKe && 
                j.guruId === data.guruId && 
                j.rombelId !== filterRombelId
            );
            
            if (conflict) {
                const conflictRombel = settings.rombel.find(r => r.id === conflict.rombelId)?.nama;
                if (!confirm(`PERINGATAN: Guru ini sudah mengajar di kelas ${conflictRombel} pada waktu yang sama. Tetap simpan?`)) {
                    return;
                }
            }
        }

        const payload = {
            ...data,
            rombelId: filterRombelId,
            lastModified: Date.now()
        } as JadwalPelajaran;

        if (editingJadwal) {
            await db.jadwalPelajaran.put({ ...payload, id: editingJadwal.id });
            showToast('Jadwal diperbarui', 'success');
        } else {
            const existing = jadwalList.find(j => j.rombelId === filterRombelId && j.hari === data.hari && j.jamKe === data.jamKe);
            if (existing) {
                 await db.jadwalPelajaran.put({ ...payload, id: existing.id });
            } else {
                 await db.jadwalPelajaran.add(payload);
            }
            showToast('Jadwal ditambahkan', 'success');
        }
        setIsJadwalModalOpen(false);
    };

    const handleDeleteJadwal = async (id: number) => {
        await db.jadwalPelajaran.delete(id);
        setIsJadwalModalOpen(false);
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

    const handleAddJam = () => {
        const nextUrutan = jamConfig.length + 1;
        const newJam: JamPelajaran = {
            id: Date.now(),
            urutan: nextUrutan,
            jamMulai: '00:00',
            jamSelesai: '00:00',
            jenis: 'KBM',
            jenjangId: filterJenjangId
        };
        handleSaveJamConfig([...jamConfig, newJam]);
    };

    const handleRemoveJam = (index: number) => {
        const updatedConfig = [...jamConfig];
        updatedConfig.splice(index, 1);
        const reindexed = updatedConfig.map((j, idx) => ({ ...j, urutan: idx + 1 }));
        handleSaveJamConfig(reindexed);
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
        // Ensure kelas filter also updates for consistency if needed, but not strictly required
    };

    const handlePrint = () => {
        const titleSuffix = filterRombelId 
            ? settings.rombel.find(r=>r.id===filterRombelId)?.nama 
            : `GABUNGAN (${targetRombels.length} Kelas)`;
        printToPdfNative('jadwal-print-area', `Jadwal_${titleSuffix}`);
    };
    
    const getGuruLabel = (guruId?: number) => {
        if (!guruId) return '-';
        if (guruId === -1) return 'NIHIL / KOSONG';
        if (guruId === -2) return 'MUSYRIF / TAHFIZH';
        const teacher = settings.tenagaPengajar.find(t => t.id === guruId);
        return teacher ? teacher.nama : '-';
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
                    <button onClick={() => setActiveTab('active')} className={`flex-1 py-3 px-1 text-center border-b-2 font-medium text-sm flex items-center justify-center gap-2 ${activeTab === 'active' ? 'border-teal-500 text-teal-600 bg-teal-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                        <i className="bi bi-pencil-square text-lg"></i> Editor Jadwal Aktif
                    </button>
                    <button onClick={() => setActiveTab('archive')} className={`flex-1 py-3 px-1 text-center border-b-2 font-medium text-sm flex items-center justify-center gap-2 ${activeTab === 'archive' ? 'border-teal-500 text-teal-600 bg-teal-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                        <i className="bi bi-clock-history text-lg"></i> Arsip & Riwayat
                    </button>
                </nav>
            </div>

            {activeTab === 'active' && (
                <>
                    {/* Filter Bar */}
                    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex flex-wrap gap-4 items-end">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Jenjang</label>
                            <select value={filterJenjangId} onChange={e => { setFilterJenjangId(Number(e.target.value)); setFilterKelasId(0); setFilterRombelId(0); }} className="border rounded p-2 text-sm bg-gray-50">
                                {settings.jenjang.map(j => <option key={j.id} value={j.id}>{j.nama}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Kelas</label>
                            <select value={filterKelasId} onChange={e => { setFilterKelasId(Number(e.target.value)); setFilterRombelId(0); }} className="border rounded p-2 text-sm bg-gray-50 disabled:bg-gray-100" disabled={!filterJenjangId}>
                                <option value={0}>-- Semua Kelas --</option>
                                {availableKelas.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Rombel</label>
                            <select value={filterRombelId} onChange={e => setFilterRombelId(Number(e.target.value))} className="border rounded p-2 text-sm bg-gray-50 disabled:bg-gray-100" disabled={!filterJenjangId}>
                                <option value={0}>-- Semua Rombel --</option>
                                {availableRombel.map(r => <option key={r.id} value={r.id}>{r.nama}</option>)}
                            </select>
                        </div>
                        <div className="ml-auto flex gap-2">
                             <button onClick={() => setIsTeacherLoadModalOpen(true)} className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-4 py-2 rounded text-sm font-bold flex items-center gap-2 hover:bg-indigo-100">
                                <i className="bi bi-bar-chart-fill"></i> Rekap Jam
                            </button>
                            {canWrite && (
                                <button onClick={() => setIsArchiveModalOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-bold flex items-center gap-2 hover:bg-blue-700 shadow-sm">
                                    <i className="bi bi-archive-fill"></i> Arsipkan Jadwal
                                </button>
                            )}
                            <button onClick={handlePrint} disabled={targetRombels.length === 0} className="bg-gray-700 text-white px-4 py-2 rounded text-sm font-bold flex items-center gap-2 hover:bg-gray-800 disabled:opacity-50">
                                <i className="bi bi-printer"></i> Cetak {filterRombelId === 0 ? '(Semua)' : ''}
                            </button>
                        </div>
                    </div>

                    {/* Main Content */}
                    {filterRombelId ? (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                            {/* Time Slot Config (Left) */}
                            <div className="lg:col-span-3">
                                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
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
                                                <input type="time" value={jam.jamMulai} onChange={e => { const newConfig = [...jamConfig]; newConfig[idx] = { ...newConfig[idx], jamMulai: e.target.value }; }} className="border rounded p-1 w-16 text-center" disabled={!canWrite} />
                                                <span>-</span>
                                                <input type="time" value={jam.jamSelesai} onChange={e => { const newConfig = [...jamConfig]; newConfig[idx] = { ...newConfig[idx], jamSelesai: e.target.value }; }} className="border rounded p-1 w-16 text-center" disabled={!canWrite} />
                                                {canWrite && (
                                                    <button onClick={() => handleRemoveJam(idx)} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <i className="bi bi-trash"></i>
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    {canWrite && (
                                        <div className="space-y-2 mt-3">
                                            <button onClick={handleAddJam} className="w-full border border-dashed border-teal-300 text-teal-700 p-1.5 rounded text-xs font-bold hover:bg-teal-50 flex items-center justify-center gap-1">
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
                        <div className="space-y-6">
                            {targetRombels.length > 0 ? (
                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                                    {targetRombels.map(rombel => (
                                        <div key={rombel.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                                            <div className="flex justify-between items-center mb-4 pb-2 border-b">
                                                <h3 className="font-bold text-gray-800 flex items-center gap-2"><i className="bi bi-calendar-event text-teal-600"></i> {rombel.nama}</h3>
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
                    />
                    
                    <ArchiveModal 
                        isOpen={isArchiveModalOpen}
                        onClose={() => setIsArchiveModalOpen(false)}
                        onSave={handleArchive}
                        jenjangName={activeJenjang?.nama || 'Unknown'}
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
                                <div key={rombel.id} className="printable-content-wrapper p-8 bg-white page-break-after" style={{ width: '29.7cm', minHeight: '21cm', marginBottom: idx < targetRombels.length-1 ? '2cm' : '0' }}> 
                                    <PrintHeader settings={settings} title={`JADWAL PELAJARAN KELAS ${rombel.nama.toUpperCase()}`} />
                                    <table className="w-full border-collapse border border-black text-center text-xs mt-6">
                                        <thead className="bg-gray-200 uppercase font-bold">
                                            <tr>
                                                <th className="p-2 border border-black w-16">Jam</th>
                                                {days.map(d => <th key={d} className="p-2 border border-black">{d}</th>)}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {jamConfig.map(jam => (
                                                <tr key={jam.id}>
                                                    <td className="p-2 border border-black bg-gray-100 font-bold">
                                                        {jam.urutan}<br/><span className="font-normal text-[10px]">{jam.jamMulai}-{jam.jamSelesai}</span>
                                                    </td>
                                                    {days.map((day, dayIdx) => {
                                                        const item = jadwalList.find(j => j.rombelId === rombel.id && j.hari === dayIdx && j.jamKe === jam.urutan);
                                                        const mapel = item?.mapelId ? settings.mataPelajaran.find(m => m.id === item.mapelId)?.nama : '';
                                                        const guru = getGuruLabel(item?.guruId);

                                                        return (
                                                            <td key={dayIdx} className="p-2 border border-black align-top h-16">
                                                                {item ? (
                                                                    item.keterangan ? (
                                                                        <div className="font-bold italic">{item.keterangan}</div>
                                                                    ) : (
                                                                        <>
                                                                            <div className="font-bold">{mapel}</div>
                                                                            <div className="text-[10px]">{guru}</div>
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
                                    <ReportFooter />
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
                                        <p className="text-xs text-gray-500 mb-4">TA: {a.tahunAjaran} • Diarsipkan: {formatDate(a.tanggalArsip)}</p>
                                        
                                        <div className="flex gap-2">
                                            {canWrite && (
                                                <button onClick={() => handleRestore(a)} className="flex-1 bg-white border border-blue-300 text-blue-700 text-xs py-1.5 rounded hover:bg-blue-50 font-medium">
                                                    <i className="bi bi-arrow-counterclockwise mr-1"></i> Pulihkan ke Editor
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
