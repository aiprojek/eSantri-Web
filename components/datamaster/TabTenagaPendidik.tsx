
import React, { useState } from 'react';
import { PondokSettings, TenagaPengajar, RiwayatJabatan } from '../../types';
import { useAppContext } from '../../AppContext';
import { TeacherModal } from '../settings/modals/TeacherModal';
import { BulkMasterEditor } from './modals/BulkMasterEditor';

interface TabTenagaPendidikProps {
    localSettings: PondokSettings;
    handleInputChange: <K extends keyof PondokSettings>(key: K, value: PondokSettings[K]) => void;
    canWrite: boolean;
}

export const TabTenagaPendidik: React.FC<TabTenagaPendidikProps> = ({ localSettings, handleInputChange, canWrite }) => {
    const { showAlert, showConfirmation, showToast } = useAppContext();
    const [teacherModalData, setTeacherModalData] = useState<{
        mode: 'add' | 'edit';
        item?: TenagaPengajar;
    } | null>(null);
    const [isBulkOpen, setIsBulkOpen] = useState(false);
    const [bulkInitialData, setBulkInitialData] = useState<any[] | undefined>(undefined);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [filterCategory, setFilterCategory] = useState<'all' | 'pendidik' | 'kependidikan'>('all');
    const [searchKeyword, setSearchKeyword] = useState('');

    const getTeacherStatus = (teacher: TenagaPengajar) => {
        if (!teacher.riwayatJabatan || teacher.riwayatJabatan.length === 0) {
            return { isActive: false, jabatan: 'N/A', text: 'Tidak ada riwayat jabatan', color: 'gray' };
        }

        const latestRiwayat = [...teacher.riwayatJabatan].sort((a, b) => new Date(b.tanggalMulai).getTime() - new Date(a.tanggalMulai).getTime())[0];
        const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

        if (latestRiwayat.tanggalSelesai) {
            return { isActive: false, jabatan: latestRiwayat.jabatan, text: `Berakhir pada ${formatDate(latestRiwayat.tanggalSelesai)}`, color: 'red' };
        } else {
            return { isActive: true, jabatan: latestRiwayat.jabatan, text: `Aktif sejak ${formatDate(latestRiwayat.tanggalMulai)}`, color: 'teal' };
        }
    };

    const handleSaveTeacher = (teacher: TenagaPengajar) => {
        if (!teacherModalData) return;
        const { mode } = teacherModalData;

        const teacherList = localSettings.tenagaPengajar;
        const rombelList = [...localSettings.rombel];
        let updatedTeachers: TenagaPengajar[];
        
        if (mode === 'add') {
            const newItem = { ...teacher, id: teacherList.length > 0 ? Math.max(...teacherList.map(t => t.id)) + 1 : 1 };
            updatedTeachers = [...teacherList, newItem];
        } else {
            updatedTeachers = teacherList.map(t => t.id === teacher.id ? teacher : t);
        }

        // SYNC LOGIC: From Teacher to Rombel
        // 1. Find all active Wali Kelas roles for the CURRENT teacher being saved
        const activeWaliRombelIds = teacher.riwayatJabatan
            .filter(r => r.jabatan === 'Wali Kelas' && r.rombelId && !r.tanggalSelesai)
            .map(r => r.rombelId as number);

        // 2. Update Romblons: 
        // - If a rombel is in activeWaliRombelIds, set its waliKelasId to this teacher.id
        // - If a rombel currently has this teacher.id as its waliKelasId but IS NOT in activeWaliRombelIds, clear its waliKelasId
        const finalRombels = rombelList.map(r => {
            if (activeWaliRombelIds.includes(r.id)) {
                return { ...r, waliKelasId: teacher.id };
            } else if (r.waliKelasId === teacher.id) {
                return { ...r, waliKelasId: undefined };
            }
            return r;
        });

        // 3. Update both lists in state
        handleInputChange('tenagaPengajar', updatedTeachers);
        handleInputChange('rombel', finalRombels);
        
        setTeacherModalData(null);
        showToast(`Data ${teacher.nama} berhasil disimpan.`, 'success');
    };

    const handleBulkSave = (data: any[]) => {
        const teacherList = [...localSettings.tenagaPengajar];
        const rombelList = [...localSettings.rombel];
        let nextId = teacherList.length > 0 ? Math.max(...teacherList.map(t => t.id)) + 1 : 1;
        
        let rombelsChanged = false;

        data.forEach(item => {
            const isEdit = !!item.id;
            const riwayat: RiwayatJabatan[] = [];
            
            const teacherId = isEdit ? item.id : nextId++;

            const isKependidikan = item.jenisPegawai === 'Kependidikan (Staf)' || item.jenisPegawai === 'kependidikan';
            const jenisPegawaiVal = isKependidikan ? 'kependidikan' : 'pendidik';

            if (item.jabatan) {
                riwayat.push({
                    id: Date.now() + Math.random(),
                    jabatan: item.jabatan,
                    rombelId: item.rombelId,
                    tanggalMulai: item.tanggalMulai || new Date().toISOString().split('T')[0]
                });
            }
            
            // Sync to Rombel if Wali Kelas
            if (item.jabatan === 'Wali Kelas' && item.rombelId) {
                const rombelIdx = rombelList.findIndex(r => r.id === item.rombelId);
                if (rombelIdx !== -1) {
                    rombelsChanged = true;
                    rombelList[rombelIdx] = { ...rombelList[rombelIdx], waliKelasId: teacherId };
                }
            }

            const teacherData: TenagaPengajar = {
                id: teacherId,
                nama: item.nama,
                telepon: item.telepon,
                email: item.email,
                status: 'Aktif',
                jenisPegawai: jenisPegawaiVal,
                kategoriStaf: isKependidikan ? (item.jabatan || 'Tata Usaha (TU)') : undefined,
                riwayatJabatan: isEdit ? riwayat : riwayat
            };

            // If edit, we should merge or replace.
            if (isEdit) {
                const idx = teacherList.findIndex(t => t.id === item.id);
                if (idx !== -1) {
                    teacherList[idx] = { 
                        ...teacherList[idx], 
                        nama: item.nama, 
                        telepon: item.telepon, 
                        email: item.email,
                        jenisPegawai: jenisPegawaiVal,
                        kategoriStaf: isKependidikan ? (item.jabatan || teacherList[idx].kategoriStaf || 'Tata Usaha (TU)') : undefined,
                        riwayatJabatan: riwayat.length > 0 ? riwayat : teacherList[idx].riwayatJabatan
                    };
                }
            } else {
                teacherList.push(teacherData);
            }
        });

        handleInputChange('tenagaPengajar', teacherList);
        if (rombelsChanged) {
            handleInputChange('rombel', rombelList);
        }

        setIsBulkOpen(false);
        setBulkInitialData(undefined);
        setSelectedIds([]);
        showToast(`Operasi massal berhasil diterapkan.`, 'success');
    };

    const handleRemoveTeacher = (id: number) => {
        // ... omitted logic ...
    };

    const handleBulkDelete = () => {
        if (selectedIds.length === 0) return;
        
        // Validation: check if any of selected teachers are Mudir Aam, Mudir Marhalah, or Wali Kelas
        const selectedTeachers = localSettings.tenagaPengajar.filter(t => selectedIds.includes(t.id));
        const mudirAam = selectedTeachers.find(t => t.id === localSettings.mudirAamId);
        const mudirMarhalah = selectedTeachers.find(t => localSettings.jenjang.some(j => j.mudirId === t.id));
        const waliKelas = selectedTeachers.find(t => localSettings.rombel.some(r => r.waliKelasId === t.id));

        if (mudirAam) {
            showAlert('Penghapusan Gagal', `Gagal menghapus secara massal. ${mudirAam.nama} masih bertugas sebagai Mudir Aam.`);
            return;
        }
        if (mudirMarhalah) {
            showAlert('Penghapusan Gagal', `Gagal menghapus secara massal. ${mudirMarhalah.nama} masih bertugas sebagai Mudir Marhalah.`);
            return;
        }
        if (waliKelas) {
            showAlert('Penghapusan Gagal', `Gagal menghapus secara massal. ${waliKelas.nama} masih bertugas sebagai Wali Kelas.`);
            return;
        }

        showConfirmation(
            `Hapus ${selectedIds.length} Pengajar`,
            `Apakah Anda yakin ingin menghapus ${selectedIds.length} data tenaga pendidik yang terpilih secara massal?`,
            () => {
                const updatedTeachers = localSettings.tenagaPengajar.filter(t => !selectedIds.includes(t.id));
                handleInputChange('tenagaPengajar', updatedTeachers);
                setSelectedIds([]);
                showToast(`${selectedIds.length} pengajar berhasil dihapus.`, 'success');
            },
            { confirmText: 'Ya, Hapus Semua', confirmColor: 'red' }
        );
    };

    const handleBulkEdit = () => {
        const selectedTeachers = localSettings.tenagaPengajar.filter(t => selectedIds.includes(t.id));
        const preparedData = selectedTeachers.map(t => {
            const latestRiwayat = [...t.riwayatJabatan].sort((a, b) => new Date(b.tanggalMulai).getTime() - new Date(a.tanggalMulai).getTime())[0];
            return {
                id: t.id,
                nama: t.nama,
                jenisPegawai: t.jenisPegawai === 'kependidikan' ? 'Kependidikan (Staf)' : 'Pendidik (Guru)',
                telepon: t.telepon || '',
                email: t.email || '',
                jabatan: latestRiwayat?.jabatan || (t.kategoriStaf || ''),
                rombelId: latestRiwayat?.rombelId || '',
                tanggalMulai: latestRiwayat?.tanggalMulai || ''
            };
        });
        setBulkInitialData(preparedData);
        setIsBulkOpen(true);
    };

    const filteredTeachers = localSettings.tenagaPengajar.filter(t => {
        // Filter Category
        const isKependidikan = t.jenisPegawai === 'kependidikan' || (
            !t.jenisPegawai && t.riwayatJabatan?.some(r => {
                const j = (r.jabatan || '').toLowerCase();
                return j.includes('satpam') || j.includes('security') || j.includes('kasir') || j.includes('keuangan') || j.includes('tu') || j.includes('tata usaha') || j.includes('bk') || j.includes('konseling') || j.includes('kebersihan') || j.includes('dapur');
            })
        );
        
        if (filterCategory === 'pendidik' && isKependidikan) return false;
        if (filterCategory === 'kependidikan' && !isKependidikan) return false;

        // Filter Search
        if (searchKeyword.trim()) {
            const kw = searchKeyword.toLowerCase();
            const matchName = t.nama.toLowerCase().includes(kw);
            const matchJabatan = t.riwayatJabatan?.some(r => r.jabatan.toLowerCase().includes(kw));
            const matchStaf = t.kategoriStaf?.toLowerCase().includes(kw);
            const matchPhone = t.telepon?.includes(kw);
            return matchName || matchJabatan || matchStaf || matchPhone;
        }

        return true;
    });

    const totalPendidik = localSettings.tenagaPengajar.filter(t => t.jenisPegawai !== 'kependidikan').length;
    const totalKependidikan = localSettings.tenagaPengajar.filter(t => t.jenisPegawai === 'kependidikan').length;

    const toggleSelectAll = () => {
        if (selectedIds.length === filteredTeachers.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredTeachers.map(t => t.id));
        }
    };

    const toggleSelectOne = (id: number) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(i => i !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    return (
        <div className="bg-white p-4 md:p-6 rounded-lg shadow-md mb-6">
            <div className="flex flex-col gap-3 md:flex-row md:justify-between md:items-center mb-4 border-b pb-3">
                <div>
                    <h2 className="text-lg md:text-xl font-bold text-gray-700">Tenaga Pendidik & Kependidikan</h2>
                    <p className="text-xs text-gray-500 mt-0.5">Kelola data guru (asatidz) dan staf tenaga kependidikan (TU, Kasir, Satpam, BK, dll).</p>
                </div>
                {selectedIds.length > 0 && (
                    <div className="grid grid-cols-2 md:flex md:items-center gap-2 md:gap-3 animate-fade-in">
                        <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2 py-1 rounded border border-teal-100">{selectedIds.length} dipilih</span>
                        <button onClick={() => setSelectedIds([])} className="text-xs text-gray-500 hover:text-gray-700 underline text-left md:text-center">Batal</button>
                        <button onClick={handleBulkEdit} className="text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 px-2 py-1 rounded border border-blue-200 font-bold text-left md:text-center"><i className="bi bi-pencil-square mr-1"></i> Edit Massal</button>
                        <button onClick={handleBulkDelete} className="text-xs bg-red-50 text-red-600 hover:bg-red-100 px-2 py-1 rounded border border-red-200 font-bold text-left md:text-center"><i className="bi bi-trash mr-1"></i> Hapus Massal</button>
                    </div>
                )}
            </div>

            {/* Filter Kategori & Pencarian */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg text-xs">
                    <button
                        type="button"
                        onClick={() => setFilterCategory('all')}
                        className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
                            filterCategory === 'all'
                                ? 'bg-white text-gray-800 shadow-xs'
                                : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                        Semua ({localSettings.tenagaPengajar.length})
                    </button>
                    <button
                        type="button"
                        onClick={() => setFilterCategory('pendidik')}
                        className={`px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5 ${
                            filterCategory === 'pendidik'
                                ? 'bg-white text-teal-800 shadow-xs'
                                : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                        <i className="bi bi-mortarboard-fill text-teal-600"></i>
                        Tenaga Pendidik ({totalPendidik})
                    </button>
                    <button
                        type="button"
                        onClick={() => setFilterCategory('kependidikan')}
                        className={`px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5 ${
                            filterCategory === 'kependidikan'
                                ? 'bg-white text-indigo-800 shadow-xs'
                                : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                        <i className="bi bi-person-gear text-indigo-600"></i>
                        Tenaga Kependidikan ({totalKependidikan})
                    </button>
                </div>

                <div className="relative">
                    <i className="bi bi-search absolute left-3 top-2.5 text-gray-400 text-xs"></i>
                    <input
                        type="text"
                        placeholder="Cari nama, jabatan, no telp..."
                        value={searchKeyword}
                        onChange={e => setSearchKeyword(e.target.value)}
                        className="w-full sm:w-64 pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
                    />
                    {searchKeyword && (
                        <button
                            onClick={() => setSearchKeyword('')}
                            className="absolute right-2.5 top-2 text-gray-400 hover:text-gray-600 text-xs"
                        >
                            <i className="bi bi-x-circle-fill"></i>
                        </button>
                    )}
                </div>
            </div>

            <div className="border rounded-lg max-h-[60vh] overflow-y-auto mb-4">
                {filteredTeachers.length > 0 ? (
                    <ul className="divide-y text-sm">
                        <li className="bg-gray-50 p-2 flex items-center border-b sticky top-0 z-10">
                            <input 
                                type="checkbox" 
                                checked={selectedIds.length > 0 && selectedIds.length === filteredTeachers.length} 
                                onChange={toggleSelectAll}
                                className="w-4 h-4 text-teal-600 rounded mr-3 cursor-pointer" 
                            />
                            <span className="text-xs font-bold text-gray-400 uppercase">Pilih Semua ({filteredTeachers.length})</span>
                        </li>
                        {filteredTeachers.map(t => {
                            const status = getTeacherStatus(t);
                            const isSelected = selectedIds.includes(t.id);
                            const isKependidikan = t.jenisPegawai === 'kependidikan';

                            return (
                            <li key={t.id} className={`flex justify-between items-center p-3 hover:bg-gray-50 group transition-colors ${isSelected ? 'bg-teal-50' : ''}`}>
                                <div className="flex items-center gap-3">
                                    <input 
                                        type="checkbox" 
                                        checked={isSelected} 
                                        onChange={() => toggleSelectOne(t.id)}
                                        className="w-4 h-4 text-teal-600 rounded cursor-pointer" 
                                    />
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="font-medium text-gray-900">{t.nama}</p>
                                            {isKependidikan ? (
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
                                                    <i className="bi bi-person-gear"></i> {t.kategoriStaf || 'Staf Kependidikan'}
                                                </span>
                                            ) : (
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200 flex items-center gap-1">
                                                    <i className="bi bi-mortarboard"></i> Guru / Pengajar
                                                </span>
                                            )}
                                            {t.kodeGuru && (
                                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200">
                                                    {t.kodeGuru}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            <span>{status.jabatan}</span>
                                            <span className={`ml-2 font-medium text-${status.color}-600`}>({status.text})</span>
                                            {t.telepon && (
                                                <span className="ml-2 text-gray-400">
                                                    <i className="bi bi-telephone mr-1"></i>{t.telepon}
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                </div>
                                    {canWrite && (
                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                             <button onClick={() => setTeacherModalData({ mode: 'edit', item: t })} className="text-blue-500 hover:text-blue-700 text-xs p-1" aria-label={`Edit data ${t.nama}`}><i className="bi bi-pencil-square"></i></button>
                                             <button onClick={() => handleRemoveTeacher(t.id)} className="text-red-500 hover:text-red-700 text-xs p-1" aria-label={`Hapus data ${t.nama}`}><i className="bi bi-trash"></i></button>
                                    </div>
                                    )}
                            </li>
                            )
                        })}
                    </ul>
                ) : (
                    <div className="py-8 text-center text-gray-400 text-xs">
                        <i className="bi bi-people text-2xl mb-1 block"></i>
                        {searchKeyword ? 'Tidak ada tenaga pendidik/kependidikan yang cocok dengan kata kunci.' : 'Belum ada data tenaga pendidik / kependidikan.'}
                    </div>
                )}
            </div>
            {canWrite && (
                <div className="flex gap-2">
                    <button onClick={() => setTeacherModalData({mode: 'add'})} className="text-sm text-white bg-teal-600 hover:bg-teal-700 px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm"><i className="bi bi-plus-circle"></i> Tambah Manual</button>
                    <button onClick={() => { setBulkInitialData(undefined); setIsBulkOpen(true); }} className="text-sm text-teal-700 bg-teal-50 border border-teal-200 hover:bg-teal-100 px-4 py-2 rounded-lg font-medium flex items-center gap-2"><i className="bi bi-table"></i> Tambah Banyak (Tabel)</button>
                </div>
            )}
            
            {teacherModalData && <TeacherModal isOpen={!!teacherModalData} onClose={() => setTeacherModalData(null)} onSave={handleSaveTeacher} modalData={teacherModalData} />}
            <BulkMasterEditor 
                isOpen={isBulkOpen} 
                onClose={() => setIsBulkOpen(false)} 
                mode="pendidik"
                settings={localSettings}
                onSave={handleBulkSave} 
                initialData={bulkInitialData}
            />
        </div>
    );
};
