import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../AppContext';
import { MataPelajaran, TenagaPengajar, Jenjang, Rombel, Kelas } from '../../types';
import { AssignPengampuModal } from './modals/AssignPengampuModal';
import { TeacherAvailabilityModal } from './modals/TeacherAvailabilityModal';

export const TabPlottingPengampu: React.FC = () => {
    const { settings, onSaveSettings, currentUser, showToast } = useAppContext();
    const canWrite = currentUser?.role === 'admin' || currentUser?.permissions?.akademik === 'write';

    // View Mode: 'per_mapel' (Katalog Mapel & Guru) vs 'per_rombel' (Matriks Mapel per Rombel / Kelas) vs 'guru_availability' (Daftar Guru & Jadwal Kesanggupan)
    const [viewMode, setViewMode] = useState<'per_mapel' | 'per_rombel' | 'guru_availability'>('per_mapel');

    const [selectedJenjangId, setSelectedJenjangId] = useState<number>(settings.jenjang[0]?.id || 0);
    const [selectedKelasId, setSelectedKelasId] = useState<number>(0);
    const [selectedRombelId, setSelectedRombelId] = useState<number>(0);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'assigned' | 'unassigned'>('all');
    const [filterRumpun, setFilterRumpun] = useState<string>('ALL');

    // Modals
    const [assignModalMapel, setAssignModalMapel] = useState<MataPelajaran | null>(null);
    const [assignModalTargetRombel, setAssignModalTargetRombel] = useState<Rombel | undefined>(undefined);
    const [availabilityTeacher, setAvailabilityTeacher] = useState<TenagaPengajar | null>(null);

    // Day labels
    const dayLabels: Record<number, string> = {
        1: 'Senin', 2: 'Selasa', 3: 'Rabu', 4: 'Kamis', 5: 'Jumat', 6: 'Sabtu', 0: 'Ahad'
    };

    // Only teachers (tenaga pendidik)
    const teachers = useMemo(() => {
        return settings.tenagaPengajar.filter(t => t.jenisPegawai !== 'kependidikan');
    }, [settings.tenagaPengajar]);

    // Rombels and Kelas in current jenjang
    const currentKelasList = useMemo(() => {
        if (selectedJenjangId === 0) return settings.kelas;
        return settings.kelas.filter(k => k.jenjangId === selectedJenjangId);
    }, [settings.kelas, selectedJenjangId]);

    const currentRombelList = useMemo(() => {
        const allowedKelasIds = new Set(currentKelasList.map(k => k.id));
        let list = settings.rombel.filter(r => allowedKelasIds.has(r.kelasId));
        if (selectedKelasId !== 0) {
            list = list.filter(r => r.kelasId === selectedKelasId);
        }
        return list;
    }, [settings.rombel, currentKelasList, selectedKelasId]);

    // Mapel to assigned teachers map
    const mapelTeachersMap = useMemo(() => {
        const map = new Map<number, TenagaPengajar[]>();
        settings.mataPelajaran.forEach(m => {
            const assigned = teachers.filter(t => t.kompetensiMapelIds && t.kompetensiMapelIds.includes(m.id));
            map.set(m.id, assigned);
        });
        return map;
    }, [settings.mataPelajaran, teachers]);

    // Filtered mapel list
    const filteredMapel = useMemo(() => {
        return settings.mataPelajaran.filter(m => {
            // Filter Jenjang
            if (selectedJenjangId !== 0 && m.jenjangId !== selectedJenjangId) return false;

            // Filter Rumpun
            if (filterRumpun !== 'ALL' && (m.rumpun || 'Umum') !== filterRumpun) return false;

            // Filter Assignment Status
            const assignedCount = mapelTeachersMap.get(m.id)?.length || 0;
            if (filterStatus === 'assigned' && assignedCount === 0) return false;
            if (filterStatus === 'unassigned' && assignedCount > 0) return false;

            // Filter Search
            if (searchTerm.trim()) {
                const kw = searchTerm.toLowerCase();
                const matchName = m.nama.toLowerCase().includes(kw);
                const matchKode = m.kodeMapel?.toLowerCase().includes(kw);
                const matchTeachers = mapelTeachersMap.get(m.id)?.some(t => t.nama.toLowerCase().includes(kw));
                return matchName || matchKode || matchTeachers;
            }

            return true;
        });
    }, [settings.mataPelajaran, selectedJenjangId, filterRumpun, filterStatus, searchTerm, mapelTeachersMap]);

    // Statistics
    const currentJenjangMapels = useMemo(() => {
        return settings.mataPelajaran.filter(m => selectedJenjangId === 0 || m.jenjangId === selectedJenjangId);
    }, [settings.mataPelajaran, selectedJenjangId]);

    const totalInJenjang = currentJenjangMapels.length;
    const assignedInJenjang = currentJenjangMapels.filter(m => (mapelTeachersMap.get(m.id)?.length || 0) > 0).length;
    const unassignedInJenjang = totalInJenjang - assignedInJenjang;

    // Handle saving assigned teachers for a mapel
    const handleSavePengampu = (mapelId: number, assignedTeacherIds: number[]) => {
        const updatedTeachers = settings.tenagaPengajar.map(teacher => {
            if (teacher.jenisPegawai === 'kependidikan') return teacher;

            const currentMapels = teacher.kompetensiMapelIds || [];
            const isAssigned = assignedTeacherIds.includes(teacher.id);
            const currentlyHas = currentMapels.includes(mapelId);

            if (isAssigned && !currentlyHas) {
                return {
                    ...teacher,
                    kompetensiMapelIds: [...currentMapels, mapelId]
                };
            } else if (!isAssigned && currentlyHas) {
                return {
                    ...teacher,
                    kompetensiMapelIds: currentMapels.filter(id => id !== mapelId)
                };
            }

            return teacher;
        });

        onSaveSettings({
            ...settings,
            tenagaPengajar: updatedTeachers
        });

        showToast('Plotting pengampu mapel berhasil diperbarui.', 'success');
    };

    // Quick remove single teacher from mapel
    const handleRemoveTeacherFromMapel = (teacherId: number, mapelId: number, e: React.MouseEvent) => {
        e.stopPropagation();
        const updatedTeachers = settings.tenagaPengajar.map(t => {
            if (t.id === teacherId) {
                return {
                    ...t,
                    kompetensiMapelIds: (t.kompetensiMapelIds || []).filter(id => id !== mapelId)
                };
            }
            return t;
        });

        onSaveSettings({
            ...settings,
            tenagaPengajar: updatedTeachers
        });

        showToast('Pengampu berhasil dilepas.', 'info');
    };

    // Save teacher availability (hari, jam, rombel)
    const handleSaveTeacherAvailability = (updatedTeacher: TenagaPengajar) => {
        const updated = settings.tenagaPengajar.map(t => t.id === updatedTeacher.id ? updatedTeacher : t);
        onSaveSettings({
            ...settings,
            tenagaPengajar: updated
        });
        showToast(`Kesanggupan mengajar ${updatedTeacher.nama} berhasil disimpan.`, 'success');
    };

    // Helpers to check if teacher can teach in a rombel
    const getTeachersForMapelAndRombel = (mapelId: number, rombel: Rombel) => {
        const candidateTeachers = mapelTeachersMap.get(mapelId) || [];
        return candidateTeachers.filter(t => {
            const canTeachInRombel = !t.availableRombelIds || t.availableRombelIds.length === 0 || t.availableRombelIds.includes(rombel.id);
            const canTeachInKelas = !t.availableKelasIds || t.availableKelasIds.length === 0 || t.availableKelasIds.includes(rombel.kelasId);
            return canTeachInRombel && canTeachInKelas;
        });
    };

    return (
        <div className="space-y-5">
            {/* Header & Stat Cards */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
                <div>
                    <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <i className="bi bi-person-check-fill text-teal-600"></i>
                        <span>Plotting Pengampu &amp; Kesanggupan Guru</span>
                    </h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                        Pemetaan guru pengampu mapel, matriks per rombel, dan kesanggupan waktu mengajar.
                    </p>
                </div>

                {/* Progress Stat Cards */}
                <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border border-gray-200">
                    <div className="text-center px-2.5 border-r border-gray-200">
                        <div className="text-base font-black text-gray-800">{totalInJenjang}</div>
                        <div className="text-[9px] uppercase font-bold text-gray-500">Total Mapel</div>
                    </div>
                    <div className="text-center px-2.5 border-r border-gray-200">
                        <div className="text-base font-black text-emerald-600">{assignedInJenjang}</div>
                        <div className="text-[9px] uppercase font-bold text-emerald-700">Ada Pengampu</div>
                    </div>
                    <div className="text-center px-2.5">
                        <div className="text-base font-black text-amber-600">{unassignedInJenjang}</div>
                        <div className="text-[9px] uppercase font-bold text-amber-700">Belum Diplot</div>
                    </div>
                </div>
            </div>

            {/* View Mode Switcher: Per Mapel, Per Rombel/Kelas, Kesanggupan Guru */}
            <div className="w-full bg-slate-100/90 p-1 rounded-xl border border-slate-200/80 shadow-2xs">
                <div className="grid grid-cols-3 sm:flex sm:w-fit gap-1 text-xs font-bold">
                    <button
                        type="button"
                        onClick={() => setViewMode('per_mapel')}
                        className={`px-2 sm:px-3.5 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 text-center ${
                            viewMode === 'per_mapel'
                                ? 'bg-teal-700 text-white shadow-2xs'
                                : 'text-gray-700 hover:text-gray-900 hover:bg-white/60'
                        }`}
                    >
                        <i className="bi bi-book text-xs shrink-0"></i>
                        <span className="hidden md:inline">Plotting per Mapel (Umum)</span>
                        <span className="md:hidden">Per Mapel</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setViewMode('per_rombel')}
                        className={`px-2 sm:px-3.5 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 text-center ${
                            viewMode === 'per_rombel'
                                ? 'bg-teal-700 text-white shadow-2xs'
                                : 'text-gray-700 hover:text-gray-900 hover:bg-white/60'
                        }`}
                    >
                        <i className="bi bi-door-open-fill text-xs shrink-0"></i>
                        <span className="hidden md:inline">Matriks Mapel per Kelas</span>
                        <span className="md:hidden">Per Kelas</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setViewMode('guru_availability')}
                        className={`px-2 sm:px-3.5 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 text-center ${
                            viewMode === 'guru_availability'
                                ? 'bg-teal-700 text-white shadow-2xs'
                                : 'text-gray-700 hover:text-gray-900 hover:bg-white/60'
                        }`}
                    >
                        <i className="bi bi-calendar-check-fill text-xs shrink-0"></i>
                        <span className="hidden md:inline">Kesanggupan Guru</span>
                        <span className="md:hidden">Kesanggupan</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black shrink-0 ${
                            viewMode === 'guru_availability' ? 'bg-white/20 text-white' : 'bg-teal-100 text-teal-800'
                        }`}>
                            {teachers.length}
                        </span>
                    </button>
                </div>
            </div>

            {/* Jenjang Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                <button
                    type="button"
                    onClick={() => {
                        setSelectedJenjangId(0);
                        setSelectedKelasId(0);
                        setSelectedRombelId(0);
                    }}
                    className={`px-3.5 py-2 rounded-lg font-bold transition-all shrink-0 ${
                        selectedJenjangId === 0
                            ? 'bg-teal-700 text-white shadow-xs'
                            : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                    }`}
                >
                    Semua Jenjang ({settings.mataPelajaran.length})
                </button>
                {settings.jenjang.map(j => {
                    const count = settings.mataPelajaran.filter(m => m.jenjangId === j.id).length;
                    return (
                        <button
                            key={j.id}
                            type="button"
                            onClick={() => {
                                setSelectedJenjangId(j.id);
                                setSelectedKelasId(0);
                                setSelectedRombelId(0);
                            }}
                            className={`px-3.5 py-2 rounded-lg font-bold transition-all shrink-0 ${
                                selectedJenjangId === j.id
                                    ? 'bg-teal-700 text-white shadow-xs'
                                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                            }`}
                        >
                            {j.nama} ({count})
                        </button>
                    );
                })}
            </div>

            {/* ========================================================================= */}
            {/* VIEW 1: PLOTTING PER MAPEL (UMUM)                                         */}
            {/* ========================================================================= */}
            {viewMode === 'per_mapel' && (
                <>
                    {/* Filter & Search Bar */}
                    <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
                        {/* Status & Rumpun Filters */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
                            <div className="grid grid-cols-3 sm:flex items-center bg-slate-100/90 p-0.5 rounded-lg border border-slate-200/80 gap-0.5 w-full sm:w-auto">
                                <button
                                    type="button"
                                    onClick={() => setFilterStatus('all')}
                                    className={`px-2.5 py-1.5 rounded-md font-bold transition-all text-center ${
                                        filterStatus === 'all' ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-600 hover:text-gray-900'
                                    }`}
                                >
                                    <span className="hidden sm:inline">Semua Status</span>
                                    <span className="sm:hidden">Semua</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFilterStatus('assigned')}
                                    className={`px-2 py-1.5 rounded-md font-bold transition-all flex items-center justify-center gap-1 text-center ${
                                        filterStatus === 'assigned' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-gray-600 hover:text-gray-900'
                                    }`}
                                >
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                                    <span>Terisi ({assignedInJenjang})</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFilterStatus('unassigned')}
                                    className={`px-2 py-1.5 rounded-md font-bold transition-all flex items-center justify-center gap-1 text-center ${
                                        filterStatus === 'unassigned' ? 'bg-white text-amber-800 shadow-2xs' : 'text-gray-600 hover:text-gray-900'
                                    }`}
                                >
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>
                                    <span>Kosong ({unassignedInJenjang})</span>
                                </button>
                            </div>

                            <select
                                value={filterRumpun}
                                onChange={e => setFilterRumpun(e.target.value)}
                                className="border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white font-bold text-gray-700 text-xs w-full sm:w-auto focus:ring-1 focus:ring-teal-500"
                            >
                                <option value="ALL">Semua Rumpun</option>
                                <option value="Diniyah">Diniyah / Kitab</option>
                                <option value="Tahfizh">Tahfizh</option>
                                <option value="Bahasa">Bahasa</option>
                                <option value="Umum">Umum</option>
                                <option value="Muatan Lokal">Mulok</option>
                            </select>
                        </div>

                        {/* Search Input */}
                        <div className="relative w-full sm:w-72">
                            <i className="bi bi-search absolute left-3 top-2 text-gray-400 text-xs"></i>
                            <input
                                type="text"
                                placeholder="Cari mapel, kode, atau guru..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
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
                    </div>

                    {/* Table View */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-gray-50/80 border-b border-gray-200 text-gray-600 uppercase font-black tracking-wider text-[10px]">
                                    <tr>
                                        <th className="py-3 px-4 w-12 text-center">#</th>
                                        <th className="py-3 px-4">Mata Pelajaran</th>
                                        <th className="py-3 px-4 w-28">Jenjang</th>
                                        <th className="py-3 px-4 w-28">Rumpun</th>
                                        <th className="py-3 px-4 w-24 text-center">Alokasi JP</th>
                                        <th className="py-3 px-4">Guru Pengampu Ditugaskan</th>
                                        <th className="py-3 px-4 w-36 text-center">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredMapel.length > 0 ? (
                                        filteredMapel.map((mapel, index) => {
                                            const jenjangName = settings.jenjang.find(j => j.id === mapel.jenjangId)?.nama || 'Jenjang';
                                            const assignedTeachers = mapelTeachersMap.get(mapel.id) || [];
                                            const isAssigned = assignedTeachers.length > 0;

                                            return (
                                                <tr key={mapel.id} className="hover:bg-gray-50/80 transition-colors group">
                                                    <td className="py-3 px-4 text-center text-gray-400 font-mono text-[11px]">
                                                        {index + 1}
                                                    </td>

                                                    <td className="py-3 px-4">
                                                        <div className="flex items-center gap-2">
                                                            {mapel.kodeMapel && (
                                                                <span className="font-mono text-[10px] font-black bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded border border-gray-200">
                                                                    {mapel.kodeMapel}
                                                                </span>
                                                            )}
                                                            <span className="font-bold text-gray-900 text-sm">{mapel.nama}</span>
                                                        </div>
                                                        {mapel.targetBabSemester && mapel.targetBabSemester.length > 0 && (
                                                            <span className="text-[10px] text-gray-400 mt-0.5 block">
                                                                <i className="bi bi-journal-check mr-1"></i>
                                                                {mapel.targetBabSemester.length} target bab semester
                                                            </span>
                                                        )}
                                                    </td>

                                                    <td className="py-3 px-4 font-semibold text-teal-800">
                                                        <span className="bg-teal-50 px-2 py-0.5 rounded border border-teal-100 text-[11px]">
                                                            {jenjangName}
                                                        </span>
                                                    </td>

                                                    <td className="py-3 px-4">
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                                                            mapel.rumpun === 'Diniyah' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                                                            mapel.rumpun === 'Tahfizh' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                                                            mapel.rumpun === 'Bahasa' ? 'bg-teal-50 text-teal-800 border-teal-200' :
                                                            mapel.rumpun === 'Umum' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                                                            'bg-purple-50 text-purple-800 border-purple-200'
                                                        }`}>
                                                            {mapel.rumpun || 'Umum'}
                                                        </span>
                                                    </td>

                                                    <td className="py-3 px-4 text-center">
                                                        <span className="font-black text-gray-800 bg-gray-100 px-2 py-0.5 rounded text-xs">
                                                            {mapel.alokasiJamDefault || mapel.jamPerMinggu || 2} JP
                                                        </span>
                                                    </td>

                                                    <td className="py-3 px-4">
                                                        {isAssigned ? (
                                                            <div className="flex flex-wrap gap-1.5 items-center">
                                                                {assignedTeachers.map(teacher => {
                                                                    const hasDays = teacher.hariMasuk && teacher.hariMasuk.length > 0;
                                                                    const hasJams = teacher.jamMasuk && teacher.jamMasuk.length > 0;
                                                                    return (
                                                                        <span 
                                                                            key={teacher.id}
                                                                            className="inline-flex items-center gap-1.5 bg-white border border-teal-200 text-teal-900 px-2.5 py-1 rounded-lg text-xs font-semibold shadow-2xs group/chip"
                                                                        >
                                                                            <i className="bi bi-person-check-fill text-teal-600"></i>
                                                                            <span>{teacher.nama}</span>
                                                                            {/* Badge availability */}
                                                                            {(hasDays || hasJams) ? (
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => setAvailabilityTeacher(teacher)}
                                                                                    className="text-[9px] bg-teal-100 text-teal-800 px-1 rounded hover:bg-teal-200"
                                                                                    title={`Kesanggupan: ${hasDays ? teacher.hariMasuk!.map(d => dayLabels[d]).join(',') : 'Semua Hari'}. Klik untuk atur.`}
                                                                                >
                                                                                    <i className="bi bi-clock"></i>
                                                                                </button>
                                                                            ) : (
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => setAvailabilityTeacher(teacher)}
                                                                                    className="text-[9px] text-gray-400 hover:text-teal-700"
                                                                                    title="Atur kesanggupan hari/jam"
                                                                                >
                                                                                    <i className="bi bi-gear"></i>
                                                                                </button>
                                                                            )}

                                                                            {canWrite && (
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={(e) => handleRemoveTeacherFromMapel(teacher.id, mapel.id, e)}
                                                                                    className="text-gray-400 hover:text-red-500 ml-0.5 p-0.5 transition-colors"
                                                                                    title={`Lepas ${teacher.nama} dari ${mapel.nama}`}
                                                                                >
                                                                                    <i className="bi bi-x"></i>
                                                                                </button>
                                                                            )}
                                                                        </span>
                                                                    );
                                                                })}
                                                            </div>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1.5 text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg text-xs font-medium">
                                                                <i className="bi bi-exclamation-circle text-amber-600"></i>
                                                                <span>Belum ada pengampu diplot</span>
                                                            </span>
                                                        )}
                                                    </td>

                                                    <td className="py-3 px-4 text-center">
                                                        {canWrite ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => setAssignModalMapel(mapel)}
                                                                className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 w-full transition-colors ${
                                                                    isAssigned
                                                                        ? 'bg-gray-100 hover:bg-teal-50 text-gray-700 hover:text-teal-800 border border-gray-200 hover:border-teal-300'
                                                                        : 'bg-teal-600 hover:bg-teal-700 text-white shadow-xs'
                                                                }`}
                                                            >
                                                                <i className={`bi ${isAssigned ? 'bi-pencil-square' : 'bi-plus-circle'}`}></i>
                                                                <span>{isAssigned ? 'Ubah Pengampu' : 'Plot Pengampu'}</span>
                                                            </button>
                                                        ) : (
                                                            <span className="text-gray-400 text-xs">-</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan={7} className="py-12 text-center text-gray-400">
                                                <i className="bi bi-book text-3xl mb-2 block"></i>
                                                <p className="text-sm font-semibold text-gray-600">Tidak ada mata pelajaran yang sesuai filter.</p>
                                                <p className="text-xs text-gray-400 mt-0.5">Coba ubah kata kunci pencarian atau pilihan jenjang.</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* ========================================================================= */}
            {/* VIEW 2: MATRIKS MAPEL PER KELAS / ROMBEL                                  */}
            {/* ========================================================================= */}
            {viewMode === 'per_rombel' && (
                <div className="space-y-4">
                    {/* Kelas & Rombel Selector */}
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs flex flex-wrap items-center gap-3 text-xs">
                        <div>
                            <label className="block text-[11px] font-bold text-gray-500 mb-1">Pilih Kelas</label>
                            <select
                                value={selectedKelasId}
                                onChange={e => {
                                    setSelectedKelasId(parseInt(e.target.value));
                                    setSelectedRombelId(0);
                                }}
                                className="border border-gray-300 rounded-lg px-3 py-1.5 bg-white font-semibold text-gray-800"
                            >
                                <option value={0}>Semua Kelas</option>
                                {currentKelasList.map(k => (
                                    <option key={k.id} value={k.id}>{k.nama}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold text-gray-500 mb-1">Pilih Rombongan Belajar (Rombel)</label>
                            <select
                                value={selectedRombelId}
                                onChange={e => setSelectedRombelId(parseInt(e.target.value))}
                                className="border border-gray-300 rounded-lg px-3 py-1.5 bg-white font-semibold text-gray-800"
                            >
                                <option value={0}>Semua Rombel ({currentRombelList.length})</option>
                                {currentRombelList.map(r => {
                                    const kelas = settings.kelas.find(k => k.id === r.kelasId);
                                    return (
                                        <option key={r.id} value={r.id}>
                                            {r.nama} {kelas ? `(${kelas.nama})` : ''}
                                        </option>
                                    );
                                })}
                            </select>
                        </div>

                        <div className="ml-auto text-right">
                            <span className="text-[11px] text-gray-500 block">Status Distribusi</span>
                            <span className="text-xs font-bold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200 inline-block mt-0.5">
                                {currentRombelList.length} Rombel Terpetakan
                            </span>
                        </div>
                    </div>

                    {/* Matrix Grid: Rombel x Mapel */}
                    <div className="space-y-4">
                        {(selectedRombelId !== 0 
                            ? currentRombelList.filter(r => r.id === selectedRombelId) 
                            : currentRombelList
                        ).map(rombel => {
                            const kelas = settings.kelas.find(k => k.id === rombel.kelasId);
                            const jenjang = settings.jenjang.find(j => j.id === kelas?.jenjangId);
                            const rombelMapels = settings.mataPelajaran.filter(m => m.jenjangId === jenjang?.id);
                            const waliKelas = teachers.find(t => t.id === rombel.waliKelasId);

                            return (
                                <div key={rombel.id} className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
                                    {/* Rombel Card Header */}
                                    <div className="p-3.5 bg-gray-50 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
                                        <div className="flex items-center gap-2.5">
                                            <span className="w-8 h-8 rounded-lg bg-teal-700 text-white flex items-center justify-center font-black text-xs">
                                                <i className="bi bi-door-open-fill"></i>
                                            </span>
                                            <div>
                                                <h4 className="text-sm font-black text-gray-900 flex items-center gap-2">
                                                    <span>{rombel.nama}</span>
                                                    <span className="text-[11px] font-semibold text-teal-800 bg-teal-50 px-2 py-0.2 rounded border border-teal-200">
                                                        {kelas?.nama || 'Kelas'} - {jenjang?.nama || 'Jenjang'}
                                                    </span>
                                                </h4>
                                                <span className="text-[11px] text-gray-500">
                                                    Wali Kelas: <strong className="text-gray-700">{waliKelas?.nama || 'Belum Ditentukan'}</strong>
                                                </span>
                                            </div>
                                        </div>

                                        <div className="text-xs text-gray-600 flex items-center gap-3">
                                            <span className="bg-white px-2 py-1 rounded border border-gray-200 font-medium">
                                                Total {rombelMapels.length} Mata Pelajaran
                                            </span>
                                        </div>
                                    </div>

                                    {/* Mapel List inside this Rombel */}
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs">
                                            <thead className="bg-gray-100/60 text-gray-600 uppercase font-black tracking-wider text-[10px] border-b">
                                                <tr>
                                                    <th className="py-2.5 px-4 w-12 text-center">#</th>
                                                    <th className="py-2.5 px-4">Mata Pelajaran</th>
                                                    <th className="py-2.5 px-4 w-24">Rumpun</th>
                                                    <th className="py-2.5 px-4 w-20 text-center">Alokasi</th>
                                                    <th className="py-2.5 px-4">Guru Pengampu Ditugaskan (Kandidat Rombel Ini)</th>
                                                    <th className="py-2.5 px-4 w-36 text-center">Plotting Guru</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {rombelMapels.map((mapel, mIdx) => {
                                                    const assignedToMapel = mapelTeachersMap.get(mapel.id) || [];
                                                    const validForRombel = getTeachersForMapelAndRombel(mapel.id, rombel);
                                                    const hasGuru = validForRombel.length > 0;

                                                    return (
                                                        <tr key={mapel.id} className="hover:bg-gray-50 transition-colors">
                                                            <td className="py-2.5 px-4 text-center text-gray-400 font-mono text-[11px]">
                                                                {mIdx + 1}
                                                            </td>
                                                            <td className="py-2.5 px-4">
                                                                <div className="flex items-center gap-1.5">
                                                                    {mapel.kodeMapel && (
                                                                        <span className="font-mono text-[10px] font-black bg-gray-100 px-1 rounded text-gray-700">
                                                                            {mapel.kodeMapel}
                                                                        </span>
                                                                    )}
                                                                    <span className="font-bold text-gray-800">{mapel.nama}</span>
                                                                </div>
                                                            </td>
                                                            <td className="py-2.5 px-4">
                                                                <span className="text-[10px] font-semibold text-gray-600">
                                                                    {mapel.rumpun || 'Umum'}
                                                                </span>
                                                            </td>
                                                            <td className="py-2.5 px-4 text-center">
                                                                <span className="font-bold text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded text-[11px]">
                                                                    {mapel.alokasiJamDefault || mapel.jamPerMinggu || 2} JP
                                                                </span>
                                                            </td>
                                                            <td className="py-2.5 px-4">
                                                                {hasGuru ? (
                                                                    <div className="flex flex-wrap gap-1.5 items-center">
                                                                        {validForRombel.map(teacher => (
                                                                            <span
                                                                                key={teacher.id}
                                                                                className="inline-flex items-center gap-1 bg-teal-50 border border-teal-200 text-teal-900 px-2 py-0.5 rounded text-[11px] font-semibold"
                                                                            >
                                                                                <i className="bi bi-person-check-fill text-teal-600"></i>
                                                                                <span>{teacher.nama}</span>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => setAvailabilityTeacher(teacher)}
                                                                                    className="text-[10px] text-teal-600 hover:text-teal-900 ml-0.5"
                                                                                    title="Atur kesanggupan hari & jam guru"
                                                                                >
                                                                                    <i className="bi bi-clock"></i>
                                                                                </button>
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                ) : assignedToMapel.length > 0 ? (
                                                                    <span className="text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[11px] inline-flex items-center gap-1 font-medium">
                                                                        <i className="bi bi-exclamation-triangle text-amber-600"></i>
                                                                        <span>Mapel memiliki guru ({assignedToMapel.map(t=>t.nama).join(', ')}), namun ada batasan rombel pengajar.</span>
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded text-[11px] inline-flex items-center gap-1 font-medium">
                                                                        <i className="bi bi-x-circle text-red-600"></i>
                                                                        <span>Belum ada pengampu diplot</span>
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="py-2.5 px-4 text-center">
                                                                {canWrite ? (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setAssignModalMapel(mapel);
                                                                            setAssignModalTargetRombel(rombel);
                                                                        }}
                                                                        className="px-2.5 py-1 bg-white hover:bg-teal-50 text-teal-700 hover:text-teal-900 border border-teal-300 rounded text-xs font-bold transition-colors"
                                                                    >
                                                                        Plot Pengampu
                                                                    </button>
                                                                ) : (
                                                                    <span className="text-gray-400">-</span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            );
                        })}

                        {currentRombelList.length === 0 && (
                            <div className="bg-white p-12 text-center text-gray-400 rounded-xl border border-gray-200">
                                <i className="bi bi-door-closed text-3xl mb-2 block"></i>
                                <p className="text-sm font-semibold text-gray-600">Belum ada data rombongan belajar (rombel) di jenjang ini.</p>
                                <p className="text-xs text-gray-400 mt-0.5">Tambahkan rombel pada Data Master Kelas & Rombel terlebih dahulu.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* VIEW 3: KESANGGUPAN HARI & JAM GURU                                       */}
            {/* ========================================================================= */}
            {viewMode === 'guru_availability' && (
                <div className="space-y-4">
                    {/* Search Teacher */}
                    <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
                        <div className="text-gray-600">
                            <strong>Daftar Tenaga Pendidik (Asatidz)</strong> — Atur kesanggupan hari hadir, jam mengajar (jam ke-), dan batasan rombel untuk setiap guru.
                        </div>

                        <div className="relative w-full sm:w-72">
                            <i className="bi bi-search absolute left-3 top-2 text-gray-400 text-xs"></i>
                            <input
                                type="text"
                                placeholder="Cari nama atau kode guru..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
                            />
                        </div>
                    </div>

                    {/* Teacher Table */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 uppercase font-black tracking-wider text-[10px]">
                                    <tr>
                                        <th className="py-3 px-4 w-12 text-center">#</th>
                                        <th className="py-3 px-4">Nama Guru & Kode</th>
                                        <th className="py-3 px-4">Mapel yang Diampu</th>
                                        <th className="py-3 px-4">Kesanggupan Hari</th>
                                        <th className="py-3 px-4">Kesanggupan Jam (Jam Ke)</th>
                                        <th className="py-3 px-4">Batasan Rombel</th>
                                        <th className="py-3 px-4 w-32 text-center">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {teachers
                                        .filter(t => {
                                            if (!searchTerm.trim()) return true;
                                            const kw = searchTerm.toLowerCase();
                                            return t.nama.toLowerCase().includes(kw) || t.kodeGuru?.toLowerCase().includes(kw);
                                        })
                                        .map((teacher, idx) => {
                                            const hasDays = teacher.hariMasuk && teacher.hariMasuk.length > 0;
                                            const hasJams = teacher.jamMasuk && teacher.jamMasuk.length > 0;
                                            const hasRombelLimit = teacher.availableRombelIds && teacher.availableRombelIds.length > 0;

                                            const dayString = hasDays
                                                ? teacher.hariMasuk!.map(d => dayLabels[d] || d).join(', ')
                                                : 'Semua Hari (Bebas)';

                                            const jamString = hasJams
                                                ? `Jam: ${teacher.jamMasuk!.sort((a,b)=>a-b).join(', ')}`
                                                : 'Semua Jam (Bebas)';

                                            const assignedMapels = settings.mataPelajaran.filter(m => 
                                                teacher.kompetensiMapelIds && teacher.kompetensiMapelIds.includes(m.id)
                                            );

                                            return (
                                                <tr key={teacher.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="py-3 px-4 text-center text-gray-400 font-mono text-[11px]">
                                                        {idx + 1}
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <div className="flex items-center gap-2">
                                                            {teacher.kodeGuru && (
                                                                <span className="font-mono text-[10px] font-black bg-teal-50 text-teal-800 border border-teal-200 px-1.5 py-0.5 rounded">
                                                                    {teacher.kodeGuru}
                                                                </span>
                                                            )}
                                                            <span className="font-bold text-gray-900 text-sm">{teacher.nama}</span>
                                                        </div>
                                                        <span className="text-[11px] text-gray-500 block mt-0.5">
                                                            {teacher.riwayatJabatan?.[teacher.riwayatJabatan.length - 1]?.jabatan || 'Tenaga Pendidik'}
                                                        </span>
                                                    </td>

                                                    <td className="py-3 px-4">
                                                        {assignedMapels.length > 0 ? (
                                                            <div className="flex flex-wrap gap-1">
                                                                {assignedMapels.map(m => (
                                                                    <span key={m.id} className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                                                                        {m.nama}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <span className="text-gray-400 italic text-[11px]">Belum ada mapel diampu</span>
                                                        )}
                                                    </td>

                                                    <td className="py-3 px-4">
                                                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                                            hasDays ? 'bg-blue-50 text-blue-800 border border-blue-200' : 'text-gray-600'
                                                        }`}>
                                                            {dayString}
                                                        </span>
                                                    </td>

                                                    <td className="py-3 px-4">
                                                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                                            hasJams ? 'bg-purple-50 text-purple-800 border border-purple-200' : 'text-gray-600'
                                                        }`}>
                                                            {jamString}
                                                        </span>
                                                    </td>

                                                    <td className="py-3 px-4">
                                                        {hasRombelLimit ? (
                                                            <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded text-xs font-semibold">
                                                                {teacher.availableRombelIds!.length} Rombel Khusus
                                                            </span>
                                                        ) : (
                                                            <span className="text-gray-400 text-xs">Semua Rombel</span>
                                                        )}
                                                    </td>

                                                    <td className="py-3 px-4 text-center">
                                                        {canWrite ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => setAvailabilityTeacher(teacher)}
                                                                className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold text-xs shadow-xs flex items-center justify-center gap-1.5 w-full transition-colors"
                                                            >
                                                                <i className="bi bi-clock-history"></i>
                                                                <span>Atur Waktu</span>
                                                            </button>
                                                        ) : (
                                                            <span className="text-gray-400">-</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Assign Pengampu */}
            {assignModalMapel && (
                <AssignPengampuModal
                    isOpen={!!assignModalMapel}
                    onClose={() => {
                        setAssignModalMapel(null);
                        setAssignModalTargetRombel(undefined);
                    }}
                    mapel={assignModalMapel}
                    settings={settings}
                    onSavePengampu={handleSavePengampu}
                    onOpenAvailability={(t) => setAvailabilityTeacher(t)}
                    targetRombel={assignModalTargetRombel}
                />
            )}

            {/* Modal Teacher Availability (Hari & Jam Mengajar) */}
            {availabilityTeacher && (
                <TeacherAvailabilityModal
                    isOpen={!!availabilityTeacher}
                    onClose={() => setAvailabilityTeacher(null)}
                    teacher={availabilityTeacher}
                    settings={settings}
                    onSaveTeacher={handleSaveTeacherAvailability}
                />
            )}
        </div>
    );
};
