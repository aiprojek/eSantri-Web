import React, { useState, useMemo } from 'react';
import { PondokSettings, MataPelajaran, TenagaPengajar, Rombel } from '../../../types';

interface AssignPengampuModalProps {
    isOpen: boolean;
    onClose: () => void;
    mapel: MataPelajaran;
    settings: PondokSettings;
    onSavePengampu: (mapelId: number, assignedTeacherIds: number[]) => void;
    onOpenAvailability?: (teacher: TenagaPengajar) => void;
    targetRombel?: Rombel;
}

export const AssignPengampuModal: React.FC<AssignPengampuModalProps> = ({
    isOpen,
    onClose,
    mapel,
    settings,
    onSavePengampu,
    onOpenAvailability,
    targetRombel,
}) => {
    // Only teachers (tenaga pendidik)
    const teachers = useMemo(() => {
        return settings.tenagaPengajar.filter(t => t.jenisPegawai !== 'kependidikan');
    }, [settings.tenagaPengajar]);

    // Currently assigned teachers for this mapel
    const initialAssignedIds = useMemo(() => {
        return teachers
            .filter(t => t.kompetensiMapelIds && t.kompetensiMapelIds.includes(mapel.id))
            .map(t => t.id);
    }, [teachers, mapel.id]);

    const [selectedTeacherIds, setSelectedTeacherIds] = useState<number[]>(initialAssignedIds);
    const [searchTerm, setSearchTerm] = useState('');

    const dayLabels: Record<number, string> = {
        1: 'Sen', 2: 'Sel', 3: 'Rab', 4: 'Kam', 5: 'Jum', 6: 'Sab', 0: 'Ahd'
    };

    if (!isOpen) return null;

    const jenjangName = settings.jenjang.find(j => j.id === mapel.jenjangId)?.nama || 'Jenjang';

    const toggleTeacher = (teacherId: number) => {
        setSelectedTeacherIds(prev => 
            prev.includes(teacherId) 
                ? prev.filter(id => id !== teacherId) 
                : [...prev, teacherId]
        );
    };

    const handleSelectAll = () => {
        if (selectedTeacherIds.length === filteredTeachers.length) {
            setSelectedTeacherIds([]);
        } else {
            setSelectedTeacherIds(filteredTeachers.map(t => t.id));
        }
    };

    const filteredTeachers = teachers.filter(t => {
        if (!searchTerm.trim()) return true;
        const kw = searchTerm.toLowerCase();
        const matchName = t.nama.toLowerCase().includes(kw);
        const matchJabatan = t.riwayatJabatan?.some(r => r.jabatan.toLowerCase().includes(kw));
        const matchKode = t.kodeGuru?.toLowerCase().includes(kw);
        return matchName || matchJabatan || matchKode;
    });

    const handleSave = () => {
        onSavePengampu(mapel.id, selectedTeacherIds);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden animate-scale-up border border-gray-100">
                {/* Header */}
                <div className="p-5 border-b bg-gradient-to-r from-teal-900 via-teal-800 to-emerald-900 text-white flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs bg-white/20 px-2 py-0.5 rounded font-bold uppercase tracking-wider text-teal-100">
                                {jenjangName}
                            </span>
                            {mapel.kodeMapel && (
                                <span className="text-xs font-mono bg-white/10 px-1.5 py-0.5 rounded text-white">
                                    {mapel.kodeMapel}
                                </span>
                            )}
                        </div>
                        <h3 className="text-lg font-black mt-1">Plotting Guru Pengampu</h3>
                        <p className="text-xs text-teal-100 mt-0.5">
                            Mata Pelajaran: <strong className="text-white underline">{mapel.nama}</strong> ({mapel.rumpun || 'Umum'})
                        </p>
                        {targetRombel && (
                            <div className="mt-1.5 inline-flex items-center gap-1.5 bg-emerald-500/30 border border-emerald-300/40 px-2 py-0.5 rounded text-[11px] text-emerald-100 font-semibold">
                                <i className="bi bi-door-open-fill"></i>
                                <span>Rombel Target: <strong>{targetRombel.nama}</strong></span>
                            </div>
                        )}
                    </div>
                    <button 
                        onClick={onClose} 
                        className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
                    >
                        <i className="bi bi-x-lg text-lg"></i>
                    </button>
                </div>

                {/* Body */}
                <div className="p-5 space-y-4 max-h-[72vh] overflow-y-auto">
                    <div className="bg-teal-50 border border-teal-200 rounded-xl p-3 text-xs text-teal-900 flex items-start gap-2.5">
                        <i className="bi bi-info-circle-fill text-teal-600 text-sm mt-0.5 shrink-0"></i>
                        <div>
                            Centang guru yang ditugaskan mengampu mapel ini. Anda juga dapat langsung mengklik tombol <span className="font-bold text-teal-800">"Atur Jadwal / Jam"</span> untuk menentukan kesanggupan hari & jam mengajar guru tanpa perlu ke Data Master.
                        </div>
                    </div>

                    {/* Search & Counter */}
                    <div className="flex items-center justify-between gap-3">
                        <div className="relative flex-1">
                            <i className="bi bi-search absolute left-3 top-2.5 text-gray-400 text-xs"></i>
                            <input 
                                type="text"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                placeholder="Cari nama guru / ustadz..."
                                className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
                            />
                            {searchTerm && (
                                <button 
                                    onClick={() => setSearchTerm('')}
                                    className="absolute right-2.5 top-2 text-gray-400 hover:text-gray-600 text-xs"
                                >
                                    <i className="bi bi-x-circle-fill"></i>
                                </button>
                            )}
                        </div>
                        <span className="text-xs font-bold text-teal-800 bg-teal-50 px-2.5 py-1.5 rounded-lg border border-teal-200 whitespace-nowrap">
                            {selectedTeacherIds.length} Terpilih
                        </span>
                    </div>

                    {/* Teacher Checklist */}
                    <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100 max-h-80 overflow-y-auto">
                        <div className="bg-gray-50 p-2.5 flex items-center justify-between text-xs sticky top-0 z-10 border-b">
                            <label className="flex items-center gap-2 font-bold text-gray-600 cursor-pointer">
                                <input 
                                    type="checkbox"
                                    checked={filteredTeachers.length > 0 && selectedTeacherIds.length === filteredTeachers.length}
                                    onChange={handleSelectAll}
                                    className="w-4 h-4 text-teal-600 rounded cursor-pointer"
                                />
                                <span>Pilih Semua Guru</span>
                            </label>
                            <span className="text-gray-400 text-[11px]">{filteredTeachers.length} Pendidik Tersedia</span>
                        </div>

                        {filteredTeachers.length > 0 ? (
                            filteredTeachers.map(teacher => {
                                const isSelected = selectedTeacherIds.includes(teacher.id);
                                const latestJabatan = teacher.riwayatJabatan?.[teacher.riwayatJabatan.length - 1]?.jabatan || 'Guru';
                                const otherMapelsCount = (teacher.kompetensiMapelIds || []).filter(id => id !== mapel.id).length;

                                // Summary of teacher's availability
                                const hasDays = teacher.hariMasuk && teacher.hariMasuk.length > 0;
                                const hasJams = teacher.jamMasuk && teacher.jamMasuk.length > 0;
                                const dayStr = hasDays 
                                    ? teacher.hariMasuk!.map(d => dayLabels[d] || d).join(', ')
                                    : 'Semua Hari';
                                const jamStr = hasJams
                                    ? `Jam: ${teacher.jamMasuk!.sort((a,b)=>a-b).join(',')}`
                                    : 'Semua Jam';

                                return (
                                    <div
                                        key={teacher.id}
                                        className={`p-3 transition-colors hover:bg-gray-50 flex items-center justify-between gap-2 ${
                                            isSelected ? 'bg-teal-50/70' : ''
                                        }`}
                                    >
                                        <label
                                            onClick={() => toggleTeacher(teacher.id)}
                                            className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                                        >
                                            <input 
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => {}} // handled by click
                                                className="w-4 h-4 text-teal-600 rounded cursor-pointer shrink-0"
                                            />
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <span className="text-xs font-bold text-gray-900">{teacher.nama}</span>
                                                    {teacher.kodeGuru && (
                                                        <span className="text-[10px] font-mono font-black bg-gray-100 text-gray-700 px-1.5 py-0.2 rounded border border-gray-200">
                                                            {teacher.kodeGuru}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-2 flex-wrap">
                                                    <span>{latestJabatan}</span>
                                                    {otherMapelsCount > 0 && (
                                                        <span className="text-amber-700 bg-amber-50 border border-amber-200 text-[10px] px-1 rounded">
                                                            +{otherMapelsCount} mapel lain
                                                        </span>
                                                    )}
                                                    <span className="text-[10px] text-teal-800 bg-teal-100/70 px-1.5 py-0.2 rounded font-medium flex items-center gap-1" title="Kesanggupan Hari & Jam">
                                                        <i className="bi bi-clock"></i>
                                                        <span>{dayStr} ({jamStr})</span>
                                                    </span>
                                                    {targetRombel && teacher.availableRombelIds && teacher.availableRombelIds.length > 0 && (
                                                        teacher.availableRombelIds.includes(targetRombel.id) ? (
                                                            <span className="text-[10px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded font-semibold flex items-center gap-1" title="Sesuai batasan rombel pengampu">
                                                                <i className="bi bi-check-lg text-emerald-600"></i>
                                                                <span>Bisa di {targetRombel.nama}</span>
                                                            </span>
                                                        ) : (
                                                            <span className="text-[10px] text-rose-800 bg-rose-50 border border-rose-200 px-1.5 py-0.2 rounded font-semibold flex items-center gap-1" title="Guru memiliki pembatasan rombel lain">
                                                                <i className="bi bi-slash-circle text-rose-600"></i>
                                                                <span>Dibatasi untuk {targetRombel.nama}</span>
                                                            </span>
                                                        )
                                                    )}
                                                </div>
                                            </div>
                                        </label>

                                        {/* Action buttons on the right */}
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            {onOpenAvailability && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onOpenAvailability(teacher);
                                                    }}
                                                    className="px-2 py-1 bg-white hover:bg-teal-100 text-teal-800 border border-teal-300 rounded text-[11px] font-semibold flex items-center gap-1 transition-colors"
                                                    title={`Atur kesanggupan hari & jam mengajar ${teacher.nama}`}
                                                >
                                                    <i className="bi bi-calendar-range text-teal-600"></i>
                                                    <span className="hidden sm:inline">Hari & Jam</span>
                                                </button>
                                            )}
                                            {isSelected && (
                                                <span className="text-[11px] font-bold text-teal-700 bg-white border border-teal-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                    <i className="bi bi-check-circle-fill text-teal-600"></i>
                                                    <span className="hidden sm:inline">Pengampu</span>
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="p-8 text-center text-gray-400 text-xs">
                                <i className="bi bi-person-x text-2xl mb-1 block"></i>
                                {searchTerm ? 'Tidak ditemukan guru dengan kata kunci tersebut.' : 'Belum ada data tenaga pendidik.'}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t flex justify-between items-center bg-gray-50 rounded-b-2xl">
                    <span className="text-[11px] text-gray-500">
                        Sinkron ke profil asatidz & generator KBM.
                    </span>
                    <div className="flex gap-2">
                        <button 
                            type="button" 
                            onClick={onClose} 
                            className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                            Batal
                        </button>
                        <button 
                            type="button" 
                            onClick={handleSave} 
                            className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-black shadow-sm flex items-center gap-1.5 transition-colors"
                        >
                            <i className="bi bi-check-circle-fill"></i>
                            <span>Simpan Penugasan</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
