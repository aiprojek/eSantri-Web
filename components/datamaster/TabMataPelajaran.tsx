import React, { useState, useMemo, useRef, useEffect } from 'react';
import { PondokSettings, MataPelajaran, RumpunMapel, TenagaPengajar } from '../../types';
import { useAppContext } from '../../AppContext';
import { MapelModal } from '../settings/modals/MapelModal';
import { BulkMasterEditor } from './modals/BulkMasterEditor';
import { AssignPengampuModal } from '../akademik/modals/AssignPengampuModal';
import { TeacherAvailabilityModal } from '../akademik/modals/TeacherAvailabilityModal';
import { cloneSingleMapelToJenjang } from '../../utils/mapelAuditUtils';
import { loadXLSX } from '../../utils/lazyClientLibs';

interface TabMataPelajaranProps {
    localSettings: PondokSettings;
    handleInputChange: <K extends keyof PondokSettings>(key: K, value: PondokSettings[K]) => void;
    canWrite: boolean;
    source?: 'datamaster' | 'kurikulum';
    onOpenKurikulum?: () => void;
}

export const TabMataPelajaran: React.FC<TabMataPelajaranProps> = ({
    localSettings,
    handleInputChange,
    canWrite,
    source = 'kurikulum',
    onOpenKurikulum,
}) => {
    const { showConfirmation, showToast } = useAppContext();
    const parseMultiValue = (value?: string) =>
        (value || '')
            .split(/\n|;/)
            .map(v => v.trim())
            .filter(Boolean);

    const [mapelModalData, setMapelModalData] = useState<{
        mode: 'add' | 'edit';
        jenjangId: number;
        item?: MataPelajaran;
    } | null>(null);

    // Single item clone modal state
    const [cloneItemData, setCloneItemData] = useState<{
        item: MataPelajaran;
        targetJenjangId: number;
    } | null>(null);

    // Plotting pengampu modal state
    const [assignModalMapel, setAssignModalMapel] = useState<MataPelajaran | null>(null);
    const [availabilityTeacher, setAvailabilityTeacher] = useState<TenagaPengajar | null>(null);

    const [isBulkOpen, setIsBulkOpen] = useState(false);
    const [bulkInitialData, setBulkInitialData] = useState<any[] | undefined>(undefined);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [filterRumpun, setFilterRumpun] = useState<string>('ALL');
    const [filterPengampu, setFilterPengampu] = useState<'ALL' | 'WITH_TEACHER' | 'NO_TEACHER'>('ALL');
    const [isExporting, setIsExporting] = useState(false);
    const [isActionOpen, setIsActionOpen] = useState(false);
    const actionRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (actionRef.current && !actionRef.current.contains(e.target as Node)) {
                setIsActionOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Jenjang Map
    const jenjangMap = useMemo(
        () => new Map(localSettings.jenjang.map(j => [j.id, j.nama])),
        [localSettings.jenjang]
    );

    // Teacher mapping (exclude tenaga kependidikan)
    const teachersMap = useMemo(() => {
        const map = new Map<number, string[]>();
        const pendidikList = localSettings.tenagaPengajar.filter(t => t.jenisPegawai !== 'kependidikan');
        
        localSettings.mataPelajaran.forEach(m => {
            const names = pendidikList
                .filter(t => t.kompetensiMapelIds && t.kompetensiMapelIds.includes(m.id))
                .map(t => t.nama);
            map.set(m.id, names);
        });
        return map;
    }, [localSettings.mataPelajaran, localSettings.tenagaPengajar]);

    const handleExportExcel = async () => {
        setIsExporting(true);
        try {
            const XLSX = await loadXLSX();
            const exportData = localSettings.mataPelajaran.map((m, idx) => {
                const jName = jenjangMap.get(m.jenjangId) || '-';
                const pengampu = teachersMap.get(m.id)?.join(', ') || 'Belum Ada Pengampu';
                return {
                    'No': idx + 1,
                    'Jenjang': jName,
                    'Kode Mapel': m.kodeMapel || '-',
                    'Nama Mata Pelajaran': m.nama,
                    'Rumpun': m.rumpun,
                    'KKM': m.kkm || 75,
                    'Guru Pengampu': pengampu
                };
            });

            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(exportData);
            XLSX.utils.book_append_sheet(wb, ws, "Mata Pelajaran");
            XLSX.writeFile(wb, `Data_Mata_Pelajaran_${new Date().toISOString().split('T')[0]}.xlsx`);
            showToast('Daftar mata pelajaran berhasil diekspor ke Excel!', 'success');
        } catch (e) {
            console.error('Export error:', e);
            showToast('Gagal mengekspor mata pelajaran.', 'error');
        } finally {
            setIsExporting(false);
        }
    };

    // Cross-jenjang detection set (names present across >1 jenjang)
    const crossJenjangNameSet = useMemo(() => {
        const counts: Record<string, Set<number>> = {};
        localSettings.mataPelajaran.forEach(m => {
            const norm = m.nama.trim().toLowerCase();
            if (!counts[norm]) counts[norm] = new Set();
            counts[norm].add(m.jenjangId);
        });
        const result = new Set<string>();
        Object.entries(counts).forEach(([norm, set]) => {
            if (set.size > 1) result.add(norm);
        });
        return result;
    }, [localSettings.mataPelajaran]);

    const handleBulkDelete = () => {
        if (selectedIds.length === 0) return;
        showConfirmation(
            `Hapus ${selectedIds.length} Mata Pelajaran`,
            `Apakah Anda yakin ingin menghapus ${selectedIds.length} mata pelajaran yang terpilih?`,
            () => {
                const newList = localSettings.mataPelajaran.filter(m => !selectedIds.includes(m.id));
                handleInputChange('mataPelajaran', newList);
                setSelectedIds([]);
                showToast(`${selectedIds.length} mata pelajaran berhasil dihapus.`, 'success');
            },
            { confirmColor: 'red' }
        );
    };

    const handleBulkEditMapel = () => {
        const selected = localSettings.mataPelajaran.filter(m => selectedIds.includes(m.id));
        setBulkInitialData(selected);
        setIsBulkOpen(true);
    };

    const toggleSelectAll = (ids: number[]) => {
        const allSelected = ids.every(id => selectedIds.includes(id));
        if (allSelected) {
            setSelectedIds(prev => prev.filter(id => !ids.includes(id)));
        } else {
            setSelectedIds(prev => Array.from(new Set([...prev, ...ids])));
        }
    };

    const toggleSelectOne = (id: number) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(prev => prev.filter(i => i !== id));
        } else {
            setSelectedIds(prev => [...prev, id]);
        }
    };

    const handleSaveMapel = (mapel: MataPelajaran) => {
        if (!mapelModalData) return;
        const { mode } = mapelModalData;

        const list = localSettings.mataPelajaran;
        if (mode === 'add') {
            const newItem = { ...mapel, id: list.length > 0 ? Math.max(...list.map(m => m.id)) + 1 : 1 };
            handleInputChange('mataPelajaran', [...list, newItem]);
            showToast(`Mata pelajaran "${mapel.nama}" berhasil ditambahkan.`, 'success');
        } else {
            handleInputChange('mataPelajaran', list.map(m => m.id === mapel.id ? mapel : m));
            showToast(`Mata pelajaran "${mapel.nama}" berhasil diperbarui.`, 'success');
        }
        setMapelModalData(null);
    };

    const handleBulkSaveMapel = (data: any[]) => {
        const list = [...localSettings.mataPelajaran];
        let nextId = list.length > 0 ? Math.max(...list.map(m => m.id)) + 1 : 1;

        data.forEach(item => {
            const isEdit = !!item.id;
            const mapelData: MataPelajaran = {
                id: isEdit ? item.id : nextId++,
                nama: item.nama,
                jenjangId: item.jenjangId,
                kkm: item.kkm ? parseInt(item.kkm) : undefined,
                rumpun: item.rumpun,
                kodeMapel: item.kodeMapel,
                alokasiJamDefault: item.alokasiJamDefault ? parseInt(item.alokasiJamDefault) : undefined,
                modul: item.modul,
                linkUnduh: item.linkUnduh,
                linkPembelian: item.linkPembelian,
                modulList: item.modulList?.length ? item.modulList : parseMultiValue(item.modul),
                linkUnduhList: item.linkUnduhList?.length ? item.linkUnduhList : parseMultiValue(item.linkUnduh),
                linkPembelianList: item.linkPembelianList?.length ? item.linkPembelianList : parseMultiValue(item.linkPembelian),
            };

            if (isEdit) {
                const idx = list.findIndex(m => m.id === item.id);
                if (idx !== -1) list[idx] = mapelData;
            } else {
                list.push(mapelData);
            }
        });

        handleInputChange('mataPelajaran', list);
        setIsBulkOpen(false);
        setBulkInitialData(undefined);
        setSelectedIds([]);
        showToast(`Operasi massal mata pelajaran berhasil.`, 'success');
    };

    // Quick single mapel clone execution
    const handleExecuteSingleClone = () => {
        if (!cloneItemData) return;
        const { item, targetJenjangId } = cloneItemData;
        const targetJenjang = jenjangMap.get(targetJenjangId) || 'Jenjang Tujuan';

        const { updatedList } = cloneSingleMapelToJenjang(
            item,
            targetJenjangId,
            localSettings.mataPelajaran
        );

        handleInputChange('mataPelajaran', updatedList);
        setCloneItemData(null);
        showToast(`Mata pelajaran "${item.nama}" berhasil disalin ke ${targetJenjang}.`, 'success');
    };

    // Quick teacher assignment save
    const handleSavePengampu = (mapelId: number, assignedTeacherIds: number[]) => {
        const updatedTeachers = localSettings.tenagaPengajar.map(teacher => {
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

        handleInputChange('tenagaPengajar', updatedTeachers);
        showToast('Penugasan guru pengampu berhasil diperbarui.', 'success');
    };

    const handleSaveTeacherAvailability = (updatedTeacher: TenagaPengajar) => {
        const updated = localSettings.tenagaPengajar.map(t => t.id === updatedTeacher.id ? updatedTeacher : t);
        handleInputChange('tenagaPengajar', updated);
        showToast(`Kesanggupan mengajar ${updatedTeacher.nama} berhasil disimpan.`, 'success');
    };

    return (
        <div className="bg-white p-4 md:p-6 rounded-lg shadow-md mb-6">
            {/* ROLE SEPARATION INFORMATIONAL BANNER (SARAN ARSITEKTUR) */}
            {source === 'datamaster' && (
                <div className="mb-5 bg-gradient-to-r from-teal-50 via-emerald-50 to-cyan-50 border border-teal-200 rounded-xl p-4 shadow-2xs">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                                <i className="bi bi-diagram-3-fill text-sm"></i>
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-teal-950 uppercase tracking-wide">
                                    Pengelolaan Terpusat di Menu Kurikulum
                                </h4>
                                <p className="text-xs text-teal-800 mt-0.5 leading-relaxed">
                                    Daftar ini adalah <strong>inventaris dasar</strong> mata pelajaran. Untuk alokasi jam tatap muka KBM (JP/pekan), modul santri, silabus bab semester, dan <strong>Pemeriksaan &amp; Konsolidasi Mapel</strong>, silakan kelola di menu <strong>Kurikulum &gt; Mata Pelajaran &amp; Silabus</strong>.
                                </p>
                            </div>
                        </div>
                        {onOpenKurikulum && (
                            <button
                                type="button"
                                onClick={onOpenKurikulum}
                                className="px-3.5 py-1.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-lg shadow-2xs flex items-center gap-1.5 shrink-0 transition-colors"
                            >
                                <span>Buka Pusat Kurikulum</span>
                                <i className="bi bi-arrow-right"></i>
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* HEADER CONTROLS */}
            <div className="flex flex-col gap-3 md:flex-row md:justify-between md:items-center mb-4 border-b pb-3">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
                    <div>
                        <h2 className="text-lg md:text-xl font-bold text-gray-800 flex items-center gap-2">
                            <i className="bi bi-book-half text-teal-600"></i>
                            <span>Mata Pelajaran per Jenjang</span>
                        </h2>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Total {localSettings.mataPelajaran.length} mata pelajaran terdaftar dalam struktur kurikulum pondok.
                        </p>
                    </div>

                    {selectedIds.length > 0 && (
                        <div className="grid grid-cols-2 md:flex md:items-center gap-2 md:gap-3 animate-fade-in md:pl-4 md:border-l">
                            <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2 py-1 rounded border border-teal-100">{selectedIds.length} dipilih</span>
                            <button onClick={() => setSelectedIds([])} className="text-xs text-gray-500 hover:text-gray-700 underline text-left md:text-center">Batal</button>
                            <button onClick={handleBulkEditMapel} className="text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 px-2 py-1 rounded border border-blue-200 font-bold text-left md:text-center"><i className="bi bi-pencil-square mr-1"></i> Edit Massal</button>
                            <button onClick={handleBulkDelete} className="text-xs bg-red-50 text-red-600 hover:bg-red-100 px-2 py-1 rounded border border-red-200 font-bold text-left md:text-center"><i className="bi bi-trash mr-1"></i> Hapus Massal</button>
                        </div>
                    )}
                </div>

                <div className="relative" ref={actionRef}>
                    <button
                        type="button"
                        onClick={() => setIsActionOpen(!isActionOpen)}
                        className="text-xs bg-teal-700 hover:bg-teal-800 text-white font-semibold px-3.5 py-2 rounded-lg shadow-xs flex items-center gap-2 transition"
                    >
                        <i className="bi bi-grid-fill"></i>
                        <span>Menu Aksi</span>
                        <i className={`bi bi-chevron-${isActionOpen ? 'up' : 'down'} text-[10px]`}></i>
                    </button>

                    {isActionOpen && (
                        <div className="absolute right-0 mt-1.5 w-52 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-30 animate-fade-in text-xs divide-y divide-gray-100">
                            {canWrite && (
                                <div className="py-1">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsActionOpen(false);
                                            if (localSettings.jenjang.length === 0) {
                                                showToast('Silakan tambahkan jenjang pendidikan terlebih dahulu di tab Struktur.', 'info');
                                                return;
                                            }
                                            setMapelModalData({ mode: 'add', jenjangId: localSettings.jenjang[0].id });
                                        }}
                                        className="w-full text-left px-3.5 py-2 hover:bg-teal-50 flex items-center gap-2.5 text-gray-700 transition"
                                    >
                                        <i className="bi bi-plus-circle-fill text-teal-600 text-sm"></i>
                                        <div>
                                            <span className="font-semibold block text-gray-800">Tambah Manual</span>
                                            <span className="text-[10px] text-gray-400">Input formulir mapel baru</span>
                                        </div>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsActionOpen(false);
                                            setBulkInitialData(undefined);
                                            setIsBulkOpen(true);
                                        }}
                                        className="w-full text-left px-3.5 py-2 hover:bg-teal-50 flex items-center gap-2.5 text-gray-700 transition"
                                    >
                                        <i className="bi bi-table text-indigo-600 text-sm"></i>
                                        <div>
                                            <span className="font-semibold block text-gray-800">Tambah Massal</span>
                                            <span className="text-[10px] text-gray-400">Editor tabel kurikulum</span>
                                        </div>
                                    </button>
                                </div>
                            )}
                            <div className="py-1">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsActionOpen(false);
                                        handleExportExcel();
                                    }}
                                    disabled={isExporting || localSettings.mataPelajaran.length === 0}
                                    className="w-full text-left px-3.5 py-2 hover:bg-emerald-50 flex items-center gap-2.5 text-gray-700 transition disabled:opacity-50"
                                >
                                    <i className="bi bi-file-earmark-excel-fill text-emerald-600 text-sm"></i>
                                    <div>
                                        <span className="font-semibold block text-emerald-800">Ekspor Excel</span>
                                        <span className="text-[10px] text-gray-400">Unduh data mapel (.xlsx)</span>
                                    </div>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* SEARCH & RUMPUN & PENGAMPU FILTER BAR */}
            <div className="flex flex-col sm:flex-row items-center gap-2 mb-4 bg-gray-50 p-2.5 rounded-lg border border-gray-200">
                <div className="relative flex-1 w-full">
                    <i className="bi bi-search absolute left-3 top-2.5 text-gray-400 text-xs"></i>
                    <input
                        type="text"
                        placeholder="Cari mata pelajaran berdasarkan nama atau kode..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                    {searchQuery && (
                        <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            className="absolute right-2.5 top-2 text-gray-400 hover:text-gray-600 text-xs"
                        >
                            <i className="bi bi-x-circle-fill"></i>
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-1.5 w-full sm:w-auto shrink-0 flex-wrap">
                    <div className="flex items-center gap-1">
                        <span className="text-[11px] font-bold text-gray-600 whitespace-nowrap">Rumpun:</span>
                        <select
                            value={filterRumpun}
                            onChange={e => setFilterRumpun(e.target.value)}
                            className="text-xs bg-white border border-gray-300 rounded-lg py-1.5 px-2 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
                        >
                            <option value="ALL">Semua Rumpun</option>
                            <option value="Diniyah">Diniyah / Kitab</option>
                            <option value="Tahfizh">Tahfizh</option>
                            <option value="Bahasa">Bahasa</option>
                            <option value="Umum">Umum / Nasional</option>
                            <option value="Muatan Lokal">Muatan Lokal</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-1">
                        <span className="text-[11px] font-bold text-gray-600 whitespace-nowrap">Pengampu:</span>
                        <select
                            value={filterPengampu}
                            onChange={e => setFilterPengampu(e.target.value as any)}
                            className="text-xs bg-white border border-gray-300 rounded-lg py-1.5 px-2 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
                        >
                            <option value="ALL">Semua</option>
                            <option value="WITH_TEACHER">Sudah Ada Pengampu</option>
                            <option value="NO_TEACHER">Belum Ada Pengampu</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* JENJANG GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {localSettings.jenjang.map(jenjang => {
                    let mapelList = localSettings.mataPelajaran.filter(m => m.jenjangId === jenjang.id);

                    // Filter search & rumpun
                    if (searchQuery.trim()) {
                        const q = searchQuery.toLowerCase().trim();
                        mapelList = mapelList.filter(m =>
                            m.nama.toLowerCase().includes(q) || (m.kodeMapel && m.kodeMapel.toLowerCase().includes(q))
                        );
                    }
                    if (filterRumpun !== 'ALL') {
                        mapelList = mapelList.filter(m => m.rumpun === filterRumpun);
                    }
                    if (filterPengampu === 'WITH_TEACHER') {
                        mapelList = mapelList.filter(m => (teachersMap.get(m.id) || []).length > 0);
                    } else if (filterPengampu === 'NO_TEACHER') {
                        mapelList = mapelList.filter(m => (teachersMap.get(m.id) || []).length === 0);
                    }

                    const mapelIds = mapelList.map(m => m.id);
                    const isAllSelected = mapelIds.length > 0 && mapelIds.every(id => selectedIds.includes(id));

                    return (
                        <div key={jenjang.id} className="p-4 border border-gray-200 rounded-xl bg-gray-50/60 flex flex-col justify-between shadow-2xs">
                            <div>
                                <div className="flex justify-between items-center mb-3">
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center font-black text-xs">
                                            {jenjang.nama.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-gray-800">{jenjang.nama}</h3>
                                            <span className="text-[11px] text-gray-500">{mapelList.length} Mapel</span>
                                        </div>
                                    </div>
                                    {mapelList.length > 0 && (
                                        <label className="flex items-center gap-1.5 text-[11px] text-gray-600 font-medium cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={isAllSelected}
                                                onChange={() => toggleSelectAll(mapelIds)}
                                                className="w-3.5 h-3.5 text-teal-600 rounded"
                                            />
                                            <span>Pilih Semua</span>
                                        </label>
                                    )}
                                </div>

                                <div className="border bg-white rounded-lg max-h-72 overflow-y-auto divide-y">
                                    {mapelList.length > 0 ? (
                                        mapelList.map(mapel => {
                                            const isSelected = selectedIds.includes(mapel.id);
                                            const isCrossJenjang = crossJenjangNameSet.has(mapel.nama.trim().toLowerCase());

                                            return (
                                                <div
                                                    key={mapel.id}
                                                    className={`flex justify-between items-center p-3 hover:bg-gray-50 group transition-colors ${
                                                        isSelected ? 'bg-teal-50/70' : ''
                                                    }`}
                                                >
                                                    <div className="flex items-start gap-2.5">
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={() => toggleSelectOne(mapel.id)}
                                                            className="w-4 h-4 text-teal-600 rounded cursor-pointer mt-0.5"
                                                        />
                                                        <div>
                                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                                {mapel.kodeMapel && (
                                                                    <span className="text-[10px] font-mono font-black bg-gray-100 text-gray-700 px-1.5 py-0.2 rounded border">
                                                                        {mapel.kodeMapel}
                                                                    </span>
                                                                )}
                                                                <p className="text-xs font-bold text-gray-900">{mapel.nama}</p>
                                                                {isCrossJenjang && (
                                                                    <span
                                                                        className="text-[9px] bg-sky-50 text-sky-700 px-1.5 py-0.2 rounded border border-sky-200 font-bold flex items-center gap-1"
                                                                        title="Mata pelajaran ini juga diajarkan di jenjang lain (ID terisolasi mandiri)"
                                                                    >
                                                                        <i className="bi bi-layers-fill text-[9px]"></i>
                                                                        <span>Lintas-Jenjang</span>
                                                                    </span>
                                                                )}
                                                            </div>

                                                            <div className="flex flex-wrap gap-1 mt-1.5">
                                                                {mapel.rumpun ? (
                                                                    <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                                                                        mapel.rumpun === 'Diniyah' ? 'bg-amber-100 text-amber-900 border border-amber-200' :
                                                                        mapel.rumpun === 'Bahasa' ? 'bg-teal-100 text-teal-900 border border-teal-200' :
                                                                        mapel.rumpun === 'Tahfizh' ? 'bg-emerald-100 text-emerald-900 border border-emerald-200' :
                                                                        mapel.rumpun === 'Umum' ? 'bg-blue-100 text-blue-900 border border-blue-200' :
                                                                        'bg-purple-100 text-purple-900 border border-purple-200'
                                                                    }`}>
                                                                        {mapel.rumpun}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-[10px] bg-red-50 text-red-700 px-1.5 py-0.2 rounded border border-red-200 font-semibold">
                                                                        Tanpa Rumpun
                                                                    </span>
                                                                )}

                                                                {mapel.kkm ? (
                                                                    <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded border border-slate-200 font-semibold">
                                                                        KKM: {mapel.kkm}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.2 rounded border border-amber-200 font-semibold">
                                                                        KKM Belum Diisi
                                                                    </span>
                                                                )}

                                                                {mapel.alokasiJamDefault && (
                                                                    <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.2 rounded border border-indigo-100 font-semibold">
                                                                        {mapel.alokasiJamDefault} JP/Pekan
                                                                    </span>
                                                                )}

                                                                {mapel.targetBabSemester && mapel.targetBabSemester.length > 0 && (
                                                                    <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded border border-emerald-100 font-semibold">
                                                                        <i className="bi bi-list-check mr-1"></i>
                                                                        {mapel.targetBabSemester.length} Bab
                                                                    </span>
                                                                )}

                                                                {((mapel.modulList && mapel.modulList.length > 0) || mapel.modul) && (
                                                                    <span
                                                                        className="text-[10px] bg-gray-100 text-gray-700 px-1.5 py-0.2 rounded border border-gray-200 font-medium truncate max-w-[130px]"
                                                                        title={(mapel.modulList && mapel.modulList.length > 0) ? mapel.modulList.join(', ') : mapel.modul}
                                                                    >
                                                                        <i className="bi bi-book mr-1"></i>
                                                                        {(mapel.modulList && mapel.modulList.length > 0) ? mapel.modulList[0] : mapel.modul}
                                                                    </span>
                                                                )}

                                                                {/* Guru Pengampu Chip */}
                                                                {(() => {
                                                                    const assignedTeachers = teachersMap.get(mapel.id) || [];
                                                                    return assignedTeachers.length > 0 ? (
                                                                        <span 
                                                                            onClick={() => canWrite && setAssignModalMapel(mapel)}
                                                                            className={`text-[10px] bg-teal-50 text-teal-800 px-1.5 py-0.2 rounded border border-teal-200 font-semibold flex items-center gap-1 ${canWrite ? 'cursor-pointer hover:bg-teal-100' : ''}`}
                                                                            title={`Pengampu: ${assignedTeachers.join(', ')} (Klik untuk ubah)`}
                                                                        >
                                                                            <i className="bi bi-person-check text-teal-600"></i>
                                                                            <span className="truncate max-w-[120px]">
                                                                                {assignedTeachers.length === 1 ? assignedTeachers[0] : `${assignedTeachers[0]} +${assignedTeachers.length - 1}`}
                                                                            </span>
                                                                        </span>
                                                                    ) : (
                                                                        <span 
                                                                            onClick={() => canWrite && setAssignModalMapel(mapel)}
                                                                            className={`text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.2 rounded border border-amber-200 font-medium flex items-center gap-1 ${canWrite ? 'cursor-pointer hover:bg-amber-100' : ''}`}
                                                                            title="Belum ada guru pengampu. Klik untuk plotting guru."
                                                                        >
                                                                            <i className="bi bi-person-x text-amber-500"></i>
                                                                            <span>Belum ada guru</span>
                                                                        </span>
                                                                    );
                                                                })()}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {canWrite && (
                                                        <div className="flex items-center gap-1.5 opacity-90 group-hover:opacity-100 shrink-0 ml-2">
                                                            {/* Quick Plot Pengampu */}
                                                            <button
                                                                type="button"
                                                                onClick={() => setAssignModalMapel(mapel)}
                                                                className="p-1 rounded text-teal-700 hover:bg-teal-50 hover:text-teal-900 text-xs"
                                                                title={`Plotting Guru Pengampu untuk "${mapel.nama}"`}
                                                            >
                                                                <i className="bi bi-person-check"></i>
                                                            </button>

                                                            {/* Quick clone to other jenjang */}
                                                            {localSettings.jenjang.length > 1 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const otherJenjang = localSettings.jenjang.find(j => j.id !== jenjang.id);
                                                                        setCloneItemData({
                                                                            item: mapel,
                                                                            targetJenjangId: otherJenjang?.id || 0,
                                                                        });
                                                                    }}
                                                                    className="p-1 rounded text-teal-600 hover:bg-teal-50 hover:text-teal-800 text-xs"
                                                                    title={`Salin "${mapel.nama}" ke Jenjang Lain`}
                                                                >
                                                                    <i className="bi bi-copy"></i>
                                                                </button>
                                                            )}

                                                            <button
                                                                type="button"
                                                                onClick={() => setMapelModalData({ mode: 'edit', jenjangId: jenjang.id, item: mapel })}
                                                                className="p-1 rounded text-blue-600 hover:bg-blue-50 hover:text-blue-800 text-xs"
                                                                title={`Edit ${mapel.nama}`}
                                                            >
                                                                <i className="bi bi-pencil-square"></i>
                                                            </button>

                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    showConfirmation(
                                                                        'Hapus Mata Pelajaran',
                                                                        `Yakin ingin menghapus ${mapel.nama}?`,
                                                                        () => handleInputChange('mataPelajaran', localSettings.mataPelajaran.filter(m => m.id !== mapel.id)),
                                                                        { confirmColor: 'red' }
                                                                    )
                                                                }
                                                                className="p-1 rounded text-red-600 hover:bg-red-50 hover:text-red-800 text-xs"
                                                                title={`Hapus ${mapel.nama}`}
                                                            >
                                                                <i className="bi bi-trash"></i>
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <p className="text-xs text-gray-400 p-6 text-center italic">
                                            {searchQuery ? 'Tidak ada mata pelajaran yang cocok dengan filter.' : 'Belum ada mata pelajaran.'}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {canWrite && (
                                <div className="mt-3 pt-2 border-t flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setMapelModalData({ mode: 'add', jenjangId: jenjang.id })}
                                        className="w-full text-xs text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 font-bold py-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                                    >
                                        <i className="bi bi-plus-lg"></i>
                                        <span>Tambah Mapel di {jenjang.nama}</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {localSettings.jenjang.length === 0 && (
                <div className="text-center py-8 bg-yellow-50 rounded-lg border border-yellow-100 text-yellow-800">
                    <i className="bi bi-exclamation-circle text-2xl mb-2 block"></i>
                    <p>Silakan tambah <strong>Jenjang Pendidikan</strong> terlebih dahulu di tab Struktur Pendidikan.</p>
                </div>
            )}

            {/* MODAL EDIT / ADD MAPEL */}
            {mapelModalData && (
                <MapelModal
                    isOpen={!!mapelModalData}
                    onClose={() => setMapelModalData(null)}
                    onSave={handleSaveMapel}
                    modalData={mapelModalData}
                />
            )}

            {/* BULK MASTER EDITOR */}
            <BulkMasterEditor
                isOpen={isBulkOpen}
                onClose={() => setIsBulkOpen(false)}
                mode="mapel"
                settings={localSettings}
                onSave={handleBulkSaveMapel}
                initialData={bulkInitialData}
            />

            {/* MODAL QUICK CLONE SINGLE MAPEL */}
            {cloneItemData && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in">
                    <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-5 space-y-4">
                        <div className="flex justify-between items-center border-b pb-2.5">
                            <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                <i className="bi bi-copy text-teal-600"></i>
                                <span>Salin Mapel ke Jenjang Lain</span>
                            </h4>
                            <button
                                type="button"
                                onClick={() => setCloneItemData(null)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <i className="bi bi-x-lg text-xs"></i>
                            </button>
                        </div>

                        <div className="text-xs space-y-3">
                            <div className="p-2.5 bg-gray-50 border rounded-lg">
                                <span className="text-[11px] text-gray-500 block">Mata Pelajaran Asal:</span>
                                <span className="font-bold text-gray-900 text-sm">{cloneItemData.item.nama}</span>
                                <span className="text-[11px] text-teal-700 block mt-0.5">
                                    Dari: {jenjangMap.get(cloneItemData.item.jenjangId) || 'Jenjang Asal'}
                                </span>
                            </div>

                            <div>
                                <label className="block font-bold text-gray-700 mb-1">Pilih Jenjang Tujuan:</label>
                                <select
                                    value={cloneItemData.targetJenjangId}
                                    onChange={e => setCloneItemData({ ...cloneItemData, targetJenjangId: Number(e.target.value) })}
                                    className="w-full border rounded-lg p-2 font-medium bg-white focus:ring-2 focus:ring-teal-500"
                                >
                                    {localSettings.jenjang
                                        .filter(j => j.id !== cloneItemData.item.jenjangId)
                                        .map(j => (
                                            <option key={j.id} value={j.id}>
                                                {j.nama}
                                            </option>
                                        ))}
                                </select>
                            </div>

                            <p className="text-[11px] text-gray-500 leading-relaxed">
                                Salinan ini akan memiliki ID mandiri khusus untuk jenjang tujuan, mewarisi Rumpun ({cloneItemData.item.rumpun || 'Diniyah'}), KKM ({cloneItemData.item.kkm || 70}), dan Kode ({cloneItemData.item.kodeMapel || '-'}).
                            </p>
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t">
                            <button
                                type="button"
                                onClick={() => setCloneItemData(null)}
                                className="px-3 py-1.5 border rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50"
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={handleExecuteSingleClone}
                                className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold shadow-2xs flex items-center gap-1.5"
                            >
                                <i className="bi bi-check-circle"></i>
                                <span>Salin Sekarang</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL PLOTTING GURU PENGAMPU */}
            {assignModalMapel && (
                <AssignPengampuModal
                    isOpen={!!assignModalMapel}
                    onClose={() => setAssignModalMapel(null)}
                    mapel={assignModalMapel}
                    settings={localSettings}
                    onSavePengampu={handleSavePengampu}
                    onOpenAvailability={(teacher) => setAvailabilityTeacher(teacher)}
                />
            )}

            {/* MODAL KESANGGUPAN HARI & JAM GURU */}
            {availabilityTeacher && (
                <TeacherAvailabilityModal
                    isOpen={!!availabilityTeacher}
                    onClose={() => setAvailabilityTeacher(null)}
                    teacher={availabilityTeacher}
                    settings={localSettings}
                    onSaveTeacher={handleSaveTeacherAvailability}
                />
            )}
        </div>
    );
};
