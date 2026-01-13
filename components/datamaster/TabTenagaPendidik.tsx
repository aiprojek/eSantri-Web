
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

        const list = localSettings.tenagaPengajar;
        if (mode === 'add') {
            const newItem = { ...teacher, id: list.length > 0 ? Math.max(...list.map(t => t.id)) + 1 : 1 };
            handleInputChange('tenagaPengajar', [...list, newItem]);
        } else {
            handleInputChange('tenagaPengajar', list.map(t => t.id === teacher.id ? teacher : t));
        }
        setTeacherModalData(null);
    };

    const handleBulkSave = (data: any[]) => {
        const list = localSettings.tenagaPengajar;
        let nextId = list.length > 0 ? Math.max(...list.map(t => t.id)) + 1 : 1;
        
        const newItems: TenagaPengajar[] = data.map(item => {
            const riwayat: RiwayatJabatan[] = [];
            if (item.jabatan) {
                riwayat.push({
                    id: Date.now() + Math.random(),
                    jabatan: item.jabatan,
                    tanggalMulai: item.tanggalMulai || new Date().toISOString().split('T')[0]
                });
            }
            return {
                id: nextId++,
                nama: item.nama,
                riwayatJabatan: riwayat
            };
        });

        handleInputChange('tenagaPengajar', [...list, ...newItems]);
        setIsBulkOpen(false);
        showToast(`${newItems.length} tenaga pendidik berhasil ditambahkan.`, 'success');
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

    return (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <h2 className="text-xl font-bold text-gray-700 mb-4 border-b pb-2">Tenaga Pendidik & Kependidikan</h2>
            <div className="border rounded-lg max-h-[60vh] overflow-y-auto mb-4">
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
                                    {canWrite && (
                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => setTeacherModalData({ mode: 'edit', item: t })} className="text-blue-500 hover:text-blue-700 text-xs" aria-label={`Edit data ${t.nama}`}><i className="bi bi-pencil-square"></i></button>
                                            <button onClick={() => handleRemoveTeacher(t.id)} className="text-red-500 hover:text-red-700 text-xs" aria-label={`Hapus data ${t.nama}`}><i className="bi bi-trash"></i></button>
                                    </div>
                                    )}
                            </li>
                            )
                        })}
                    </ul>
                ) : <p className="text-sm text-gray-400 p-3 text-center">Data kosong.</p>}
            </div>
            {canWrite && (
                <div className="flex gap-2">
                    <button onClick={() => setTeacherModalData({mode: 'add'})} className="text-sm text-white bg-teal-600 hover:bg-teal-700 px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm"><i className="bi bi-plus-circle"></i> Tambah Manual</button>
                    <button onClick={() => setIsBulkOpen(true)} className="text-sm text-teal-700 bg-teal-50 border border-teal-200 hover:bg-teal-100 px-4 py-2 rounded-lg font-medium flex items-center gap-2"><i className="bi bi-table"></i> Tambah Banyak (Tabel)</button>
                </div>
            )}
            
            {teacherModalData && <TeacherModal isOpen={!!teacherModalData} onClose={() => setTeacherModalData(null)} onSave={handleSaveTeacher} modalData={teacherModalData} />}
            <BulkMasterEditor 
                isOpen={isBulkOpen} 
                onClose={() => setIsBulkOpen(false)} 
                mode="pendidik"
                settings={localSettings}
                onSave={handleBulkSave} 
            />
        </div>
    );
};
