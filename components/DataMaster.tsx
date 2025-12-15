
import React, { useState, useEffect, useMemo } from 'react';
import { PondokSettings, Jenjang, Kelas, Rombel, TenagaPengajar, MataPelajaran } from '../types';
import { useAppContext } from '../AppContext';
import { StructureModal } from './settings/modals/StructureModal';
import { TeacherModal } from './settings/modals/TeacherModal';
import { MapelModal } from './settings/modals/MapelModal';

type StructureItem = Jenjang | Kelas | Rombel;

const DataMaster: React.FC = () => {
    const { settings, santriList, onSaveSettings, showConfirmation, showAlert, showToast } = useAppContext();
    const [localSettings, setLocalSettings] = useState<PondokSettings>(settings);
    
    const [structureModalData, setStructureModalData] = useState<{
        mode: 'add' | 'edit';
        listName: 'jenjang' | 'kelas' | 'rombel';
        item?: StructureItem;
    } | null>(null);

    const [teacherModalData, setTeacherModalData] = useState<{
        mode: 'add' | 'edit';
        item?: TenagaPengajar;
    } | null>(null);

    const [mapelModalData, setMapelModalData] = useState<{
        mode: 'add' | 'edit';
        jenjangId: number;
        item?: MataPelajaran;
    } | null>(null);
    
    const [isSaving, setIsSaving] = useState(false);

     useEffect(() => {
        setLocalSettings(settings);
     }, [settings]);

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

    const activeTeachers = useMemo(() => 
        localSettings.tenagaPengajar.filter(t => getTeacherStatus(t).isActive),
        [localSettings.tenagaPengajar]
    );
    
    const handleInputChange = <K extends keyof PondokSettings>(key: K, value: PondokSettings[K]) => {
        setLocalSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleSaveSettings = () => {
        showConfirmation(
            'Simpan Data Akademik',
            'Apakah Anda yakin ingin menyimpan perubahan data akademik ini?',
            async () => {
                setIsSaving(true);
                try {
                    await onSaveSettings(localSettings);
                    showToast('Data Akademik berhasil disimpan!', 'success');
                } catch (error) {
                    console.error("Failed to save settings:", error);
                    showToast('Gagal menyimpan data.', 'error');
                } finally {
                    setIsSaving(false);
                }
            },
            { confirmText: 'Ya, Simpan', confirmColor: 'green' }
        );
    };

    const handleRemoveTeacher = (id: number) => {
        const teacher = localSettings.tenagaPengajar.find(t => t.id === id);
        if (!teacher) return;

        const isMudirAam = localSettings.mudirAamId === id;
        const assignedJenjang = localSettings.jenjang.find(j => j.mudirId === id);
        const assignedRombel = localSettings.rombel.find(r => r.waliKelasId === id);

        if (isMudirAam) {
            showAlert('Penghapusan Gagal', `Tidak dapat menghapus ${teacher.nama} karena masih ditugaskan sebagai Mudir Aam.`);
            return;
        }
        if (assignedJenjang) {
            showAlert('Penghapusan Gagal', `Tidak dapat menghapus ${teacher.nama} karena masih ditugaskan sebagai Mudir Marhalah untuk jenjang ${assignedJenjang.nama}.`);
            return;
        }
        if (assignedRombel) {
            showAlert('Penghapusan Gagal', `Tidak dapat menghapus ${teacher.nama} karena masih ditugaskan sebagai Wali Kelas untuk rombel ${assignedRombel.nama}.`);
            return;
        }

        showConfirmation(
            `Hapus ${teacher.nama}`,
            'Apakah Anda yakin ingin menghapus data tenaga pendidik ini?',
            () => handleInputChange('tenagaPengajar', localSettings.tenagaPengajar.filter(t => t.id !== id)),
            { confirmText: 'Ya, Hapus', confirmColor: 'red' }
        );
    };

    const handleSaveStructureItem = (item: StructureItem) => {
        if (!structureModalData) return;
        const { listName, mode } = structureModalData;
        
        const list = localSettings[listName];
        if (mode === 'add') {
             const newItem = { ...item, id: list.length > 0 ? Math.max(...list.map(i => i.id)) + 1 : 1 };
             handleInputChange(listName, [...list, newItem] as any);
        } else {
             handleInputChange(listName, list.map(i => i.id === item.id ? item : i) as any);
        }
        setStructureModalData(null);
    };

    const handleSaveTeacher = (teacher: TenagaPengajar) => {
        if (!teacherModalData) return;
        const { mode } = teacherModalData;

        const list = localSettings.tenagaPengajar;
        if (mode === 'add') {
            const newItem = { ...teacher, id: list.length > 0 ? Math.max(...list.map(t => t.id)) + 1 : 1 };
            handleInputChange('tenagaPengajar', [...list, newItem]);
        } else {
            handleInputChange('tenagaPengajar', list.map(t => t.id === teacher.id ? teacher : t));
        }
        setTeacherModalData(null);
    };

    const handleSaveMapel = (mapel: MataPelajaran) => {
        if (!mapelModalData) return;
        const { mode } = mapelModalData;

        const list = localSettings.mataPelajaran;
        if (mode === 'add') {
            const newItem = { ...mapel, id: list.length > 0 ? Math.max(...list.map(m => m.id)) + 1 : 1 };
            handleInputChange('mataPelajaran', [...list, newItem]);
        } else {
            handleInputChange('mataPelajaran', list.map(m => m.id === mapel.id ? mapel : m));
        }
        setMapelModalData(null);
    };
    
    const renderListManager = (
        listName: 'jenjang' | 'kelas' | 'rombel',
        itemName: string,
        parentList?: 'jenjang' | 'kelas'
    ) => {
        const list = localSettings[listName];
        
        const handleRemoveItem = (id: number) => {
            const itemToDelete = list.find(item => item.id === id);
            if (!itemToDelete) return;

            // Integrity checks
            if (listName === 'jenjang') {
                const santriInJenjang = santriList.filter(s => s.jenjangId === id);
                if (santriInJenjang.length > 0) {
                    showAlert('Penghapusan Dicegah', `Tidak dapat menghapus jenjang "${itemToDelete.nama}" karena masih terdaftar ${santriInJenjang.length} santri di dalamnya.`);
                    return;
                }
                showConfirmation(`Hapus ${itemName}`,`Apakah Anda yakin ingin menghapus ${itemName} "${itemToDelete.nama}"? Semua data kelas, rombel, dan mata pelajaran yang terkait akan ikut terhapus.`,
                    () => {
                        const kelasIdsToDelete = localSettings.kelas.filter(k => k.jenjangId === id).map(k => k.id);
                        handleInputChange('jenjang', localSettings.jenjang.filter(item => item.id !== id));
                        handleInputChange('kelas', localSettings.kelas.filter(item => item.jenjangId !== id));
                        handleInputChange('rombel', localSettings.rombel.filter(item => !kelasIdsToDelete.includes(item.kelasId)));
                        handleInputChange('mataPelajaran', localSettings.mataPelajaran.filter(item => item.jenjangId !== id));
                    },
                    { confirmText: 'Ya, Hapus', confirmColor: 'red' }
                );
                return;
            }

            if (listName === 'kelas') {
                const santriInKelas = santriList.filter(s => s.kelasId === id);
                if (santriInKelas.length > 0) {
                    showAlert('Penghapusan Dicegah', `Tidak dapat menghapus kelas "${itemToDelete.nama}" karena masih terdaftar ${santriInKelas.length} santri di dalamnya.`);
                    return;
                }
                if (localSettings.rombel.some(r => r.kelasId === id)) {
                    showAlert('Penghapusan Dicegah', `Tidak dapat menghapus kelas "${itemToDelete.nama}" karena masih digunakan oleh data rombel.`);
                    return;
                }
            }
            
            if (listName === 'rombel') {
                 const santriInRombel = santriList.filter(s => s.rombelId === id);
                 if (santriInRombel.length > 0) {
                     showAlert('Penghapusan Dicegah', `Tidak dapat menghapus rombel "${itemToDelete.nama}" karena masih terdaftar ${santriInRombel.length} santri di dalamnya.`);
                     return;
                 }
            }

            showConfirmation(`Hapus ${itemName}`,`Apakah Anda yakin ingin menghapus ${itemName} "${itemToDelete.nama}"?`,
                () => handleInputChange(listName, list.filter(item => item.id !== id) as any),
                { confirmText: 'Ya, Hapus', confirmColor: 'red' }
            );
        };

        const getAssignmentName = (item: StructureItem) => {
            let teacherId: number | undefined;
            if (listName === 'jenjang') teacherId = (item as Jenjang).mudirId;
            if (listName === 'rombel') teacherId = (item as Rombel).waliKelasId;
            if (!teacherId) return null;

            const teacher = localSettings.tenagaPengajar.find(t => t.id === teacherId);
            return teacher ? teacher.nama : 'Pengajar tidak ditemukan';
        };

        return (
            <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-700 mb-2 capitalize">{itemName}</h3>
                <div className="border rounded-lg max-h-60 overflow-y-auto">
                    {list.length > 0 ? (
                        <ul className="divide-y">
                            {list.map(item => (
                                <li key={item.id} className="flex justify-between items-center p-2 hover:bg-gray-50 group">
                                    <div className="text-sm">
                                        <p className="font-medium">{item.nama} {(item as Jenjang).kode && <span className="font-normal text-gray-500">({(item as Jenjang).kode})</span>}</p>
                                        <div className="text-xs text-gray-500 space-x-2">
                                            {parentList && <span>Induk: {localSettings[parentList].find(p => p.id === (item as any)[`${parentList}Id`])?.nama || 'N/A'}</span>}
                                            {getAssignmentName(item) && <span className="text-blue-600">{getAssignmentName(item)}</span>}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                         <button onClick={() => setStructureModalData({ mode: 'edit', listName, item })} className="text-blue-500 hover:text-blue-700 text-xs" aria-label={`Edit ${itemName} ${item.nama}`}><i className="bi bi-pencil-square"></i></button>
                                         <button onClick={() => handleRemoveItem(item.id)} className="text-red-500 hover:text-red-700 text-xs" aria-label={`Hapus ${itemName} ${item.nama}`}><i className="bi bi-trash"></i></button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : <p className="text-sm text-gray-400 p-3 text-center">Data kosong.</p>}
                </div>
                <button onClick={() => setStructureModalData({ mode: 'add', listName })} className="mt-2 text-sm text-teal-600 hover:text-teal-800 font-medium">+ Tambah {itemName}</button>
            </div>
        )
    };

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Data Akademik (Data Master)</h1>
            
            <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                <h2 className="text-xl font-bold text-gray-700 mb-4 border-b pb-2">Tenaga Pendidik & Kependidikan</h2>
                <div className="border rounded-lg max-h-72 overflow-y-auto mb-2">
                    {localSettings.tenagaPengajar.length > 0 ? (
                        <ul className="divide-y">
                            {localSettings.tenagaPengajar.map(t => {
                                const status = getTeacherStatus(t);
                                return (
                                <li key={t.id} className="flex justify-between items-center p-3 hover:bg-gray-50 group">
                                    <div>
                                        <p className="font-medium text-sm">{t.nama}</p>
                                        <p className="text-xs text-gray-600">{status.jabatan} 
                                            <span className={`ml-2 font-semibold text-${status.color}-600`}>({status.text})</span>
                                        </p>
                                    </div>
                                     <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                         <button onClick={() => setTeacherModalData({ mode: 'edit', item: t })} className="text-blue-500 hover:text-blue-700 text-xs" aria-label={`Edit data ${t.nama}`}><i className="bi bi-pencil-square"></i></button>
                                         <button onClick={() => handleRemoveTeacher(t.id)} className="text-red-500 hover:text-red-700 text-xs" aria-label={`Hapus data ${t.nama}`}><i className="bi bi-trash"></i></button>
                                    </div>
                                </li>
                                )
                            })}
                        </ul>
                    ) : <p className="text-sm text-gray-400 p-3 text-center">Data kosong.</p>}
                </div>
                <button onClick={() => setTeacherModalData({mode: 'add'})} className="text-sm text-teal-600 hover:text-teal-800 font-medium">+ Tambah Tenaga Pendidik</button>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                <h2 className="text-xl font-bold text-gray-700 mb-4 border-b pb-2">Struktur Pendidikan</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {renderListManager('jenjang', 'Jenjang Pendidikan')}
                    {renderListManager('kelas', 'Kelas', 'jenjang')}
                    {renderListManager('rombel', 'Rombel (Rombongan Belajar) Tersedia', 'kelas')}
                </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                <h2 className="text-xl font-bold text-gray-700 mb-4 border-b pb-2">Mata Pelajaran per Jenjang</h2>
                <div className="space-y-6">
                    {localSettings.jenjang.map(jenjang => {
                        const mapelList = localSettings.mataPelajaran.filter(m => m.jenjangId === jenjang.id);
                        return (
                        <div key={jenjang.id}>
                            <h3 className="text-md font-semibold text-gray-800 mb-2">{jenjang.nama}</h3>
                            <div className="border rounded-lg max-h-60 overflow-y-auto">
                                {mapelList.length > 0 ? (
                                    <ul className="divide-y">
                                        {mapelList.map(mapel => (
                                            <li key={mapel.id} className="flex justify-between items-center p-2 hover:bg-gray-50 group">
                                                <p className="text-sm">{mapel.nama}</p>
                                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => setMapelModalData({ mode: 'edit', jenjangId: jenjang.id, item: mapel })} className="text-blue-500 hover:text-blue-700 text-xs" aria-label={`Edit mata pelajaran ${mapel.nama}`}><i className="bi bi-pencil-square"></i></button>
                                                    <button onClick={() => showConfirmation('Hapus Mata Pelajaran', `Yakin ingin menghapus ${mapel.nama}?`, () => handleInputChange('mataPelajaran', localSettings.mataPelajaran.filter(m => m.id !== mapel.id)), {confirmColor:'red'})} className="text-red-500 hover:text-red-700 text-xs" aria-label={`Hapus mata pelajaran ${mapel.nama}`}><i className="bi bi-trash"></i></button>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                ) : <p className="text-sm text-gray-400 p-3 text-center">Belum ada mata pelajaran.</p>}
                            </div>
                             <button onClick={() => setMapelModalData({ mode: 'add', jenjangId: jenjang.id })} className="mt-2 text-sm text-teal-600 hover:text-teal-800 font-medium">+ Tambah Mata Pelajaran</button>
                        </div>
                        )
                    })}
                     {localSettings.jenjang.length === 0 && <p className="text-center text-gray-500 py-4">Silakan tambah Jenjang Pendidikan terlebih dahulu di bagian Struktur Pendidikan.</p>}
                </div>
            </div>

             <div className="mt-6 flex justify-end">
                <button onClick={handleSaveSettings} disabled={isSaving} className="text-white bg-teal-700 hover:bg-teal-800 focus:ring-4 focus:ring-teal-300 font-medium rounded-lg text-sm px-8 py-2.5 flex items-center justify-center min-w-[190px] disabled:bg-teal-400 disabled:cursor-not-allowed">
                    {isSaving ? (
                        <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>Menyimpan Perubahan...</span>
                        </>
                    ) : (
                        'Simpan Perubahan'
                    )}
                </button>
            </div>
            {structureModalData && <StructureModal isOpen={!!structureModalData} onClose={() => setStructureModalData(null)} onSave={handleSaveStructureItem} modalData={structureModalData} activeTeachers={activeTeachers} />}
            {teacherModalData && <TeacherModal isOpen={!!teacherModalData} onClose={() => setTeacherModalData(null)} onSave={handleSaveTeacher} modalData={teacherModalData} />}
            {mapelModalData && <MapelModal isOpen={!!mapelModalData} onClose={() => setMapelModalData(null)} onSave={handleSaveMapel} modalData={mapelModalData} />}
        </div>
    );
};

export default DataMaster;
