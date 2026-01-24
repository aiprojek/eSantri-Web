
import React, { useState, useEffect, useMemo } from 'react';
import { TenagaPengajar, RiwayatJabatan } from '../../../types';
import { useAppContext } from '../../../AppContext';

interface TeacherModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (teacher: TenagaPengajar) => void;
    modalData: {
        mode: 'add' | 'edit';
        item?: TenagaPengajar;
    };
}

export const TeacherModal: React.FC<TeacherModalProps> = ({ isOpen, onClose, onSave, modalData }) => {
    const { showAlert, settings } = useAppContext();
    const { mode, item } = modalData;
    const [teacher, setTeacher] = useState<Partial<TenagaPengajar>>({});

    const days = [
        { val: 1, label: 'Senin' },
        { val: 2, label: 'Selasa' },
        { val: 3, label: 'Rabu' },
        { val: 4, label: 'Kamis' },
        { val: 5, label: 'Jumat' },
        { val: 6, label: 'Sabtu' },
        { val: 0, label: 'Ahad' },
    ];

    useEffect(() => {
        if (isOpen) {
            setTeacher(item || {
                nama: '',
                riwayatJabatan: [{ id: Date.now(), jabatan: '', tanggalMulai: new Date().toISOString().split('T')[0] }],
                hariMasuk: [], // Default: undefined (implies all) or empty. Let's start with empty array if new.
                kompetensiMapelIds: []
            });
        }
    }, [isOpen, item]);

    // Group Mapel by Jenjang for Display
    const mapelByJenjang = useMemo(() => {
        return settings.jenjang.map(j => ({
            jenjang: j,
            mapel: settings.mataPelajaran.filter(m => m.jenjangId === j.id)
        })).filter(g => g.mapel.length > 0);
    }, [settings.jenjang, settings.mataPelajaran]);

    if (!isOpen) return null;

    const handleTeacherChange = <K extends keyof TenagaPengajar>(key: K, value: TenagaPengajar[K]) => {
        setTeacher(prev => ({ ...prev, [key]: value }));
    };

    const handleDayToggle = (dayVal: number) => {
        const currentDays = teacher.hariMasuk || [];
        if (currentDays.includes(dayVal)) {
            handleTeacherChange('hariMasuk', currentDays.filter(d => d !== dayVal));
        } else {
            handleTeacherChange('hariMasuk', [...currentDays, dayVal]);
        }
    };

    const handleMapelToggle = (mapelId: number) => {
        const currentMapels = teacher.kompetensiMapelIds || [];
        if (currentMapels.includes(mapelId)) {
            handleTeacherChange('kompetensiMapelIds', currentMapels.filter(id => id !== mapelId));
        } else {
            handleTeacherChange('kompetensiMapelIds', [...currentMapels, mapelId]);
        }
    };

    const handleRiwayatChange = (index: number, field: keyof RiwayatJabatan, value: string) => {
        const updatedRiwayat = [...(teacher.riwayatJabatan || [])];
        updatedRiwayat[index] = { ...updatedRiwayat[index], [field]: value };
        handleTeacherChange('riwayatJabatan', updatedRiwayat);
    }

    const addRiwayat = () => {
        const newRiwayat: RiwayatJabatan = {
            id: Date.now(),
            jabatan: '',
            tanggalMulai: new Date().toISOString().split('T')[0],
        };
        handleTeacherChange('riwayatJabatan', [...(teacher.riwayatJabatan || []), newRiwayat]);
    }

    const removeRiwayat = (index: number) => {
        const updatedRiwayat = (teacher.riwayatJabatan || []).filter((_, i) => i !== index);
        handleTeacherChange('riwayatJabatan', updatedRiwayat);
    }

    const handleSave = () => {
        if (!teacher.nama?.trim()) {
            showAlert('Input Tidak Lengkap', 'Nama tenaga pendidik tidak boleh kosong.');
            return;
        }
        
        const teacherToSave = {
            id: item?.id || Date.now(),
            nama: teacher.nama,
            riwayatJabatan: teacher.riwayatJabatan || [],
            hariMasuk: teacher.hariMasuk,
            kompetensiMapelIds: teacher.kompetensiMapelIds
        };
        onSave(teacherToSave);
    }
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-start p-4 overflow-y-auto">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl my-8 flex flex-col max-h-[90vh]">
                <div className="p-5 border-b flex justify-between items-center bg-gray-50 rounded-t-lg shrink-0">
                    <h3 className="text-lg font-semibold text-gray-800">{mode === 'add' ? 'Tambah' : 'Edit'} Tenaga Pendidik</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Tutup modal"><i className="bi bi-x-lg"></i></button>
                </div>
                
                <div className="p-6 space-y-6 overflow-y-auto flex-grow">
                     <div>
                        <label className="block mb-1 text-sm font-medium text-gray-700">Nama Lengkap</label>
                        <input type="text" value={teacher.nama || ''} onChange={(e) => handleTeacherChange('nama', e.target.value)} autoFocus className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 block w-full p-2.5" placeholder="Contoh: Ust. Ahmad, S.Pd.I" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Hari Availability */}
                        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                            <label className="block mb-2 text-sm font-bold text-blue-800">Hari Ketersediaan Mengajar</label>
                            <p className="text-xs text-blue-600 mb-2">Pilih hari dimana guru ini BISA mengajar. Jika tidak ada yang dipilih, dianggap tersedia setiap hari.</p>
                            <div className="flex flex-wrap gap-2">
                                {days.map(day => {
                                    const isSelected = (teacher.hariMasuk || []).includes(day.val);
                                    return (
                                        <button
                                            key={day.val}
                                            onClick={() => handleDayToggle(day.val)}
                                            className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${isSelected ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
                                        >
                                            {day.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                         {/* Kompetensi Mapel */}
                         <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                            <label className="block mb-2 text-sm font-bold text-green-800">Kompetensi Mata Pelajaran</label>
                            <p className="text-xs text-green-600 mb-2">Mapel apa saja yang dikuasai guru ini? (Untuk saran jadwal).</p>
                            <div className="max-h-40 overflow-y-auto pr-1 custom-scrollbar space-y-3">
                                {mapelByJenjang.length > 0 ? mapelByJenjang.map(group => (
                                    <div key={group.jenjang.id}>
                                        <h5 className="text-xs font-bold text-gray-500 mb-1 uppercase border-b border-green-200 pb-1">{group.jenjang.nama}</h5>
                                        <div className="flex flex-wrap gap-2">
                                            {group.mapel.map(m => {
                                                const isChecked = (teacher.kompetensiMapelIds || []).includes(m.id);
                                                return (
                                                    <label key={m.id} className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs cursor-pointer border transition-colors ${isChecked ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-300 hover:border-green-400'}`}>
                                                        <input 
                                                            type="checkbox" 
                                                            className="hidden" 
                                                            checked={isChecked} 
                                                            onChange={() => handleMapelToggle(m.id)} 
                                                        />
                                                        {isChecked && <i className="bi bi-check"></i>}
                                                        <span>{m.nama}</span>
                                                    </label>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )) : <p className="text-xs text-gray-400 italic">Belum ada mata pelajaran.</p>}
                            </div>
                        </div>
                    </div>

                    <div className="pt-2 border-t mt-4">
                        <div className="flex justify-between items-center mb-2">
                             <h4 className="text-md font-semibold text-gray-700">Riwayat Jabatan</h4>
                             <button onClick={addRiwayat} className="text-xs text-teal-600 hover:text-teal-800 font-bold bg-teal-50 px-2 py-1 rounded border border-teal-200">+ Tambah Jabatan</button>
                        </div>
                        
                        <div className="space-y-3">
                            {teacher.riwayatJabatan?.map((riwayat, index) => (
                                <div key={index} className="p-3 border rounded-lg bg-gray-50 space-y-3 relative group">
                                    <button onClick={() => removeRiwayat(index)} className="absolute top-2 right-2 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity bg-white rounded-full p-1 shadow-sm border border-red-100" aria-label="Hapus riwayat jabatan"><i className="bi bi-trash-fill"></i></button>
                                    <div>
                                        <label className="block mb-1 text-xs font-medium text-gray-600">Jabatan</label>
                                        <input type="text" value={riwayat.jabatan} onChange={e => handleRiwayatChange(index, 'jabatan', e.target.value)} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2" placeholder="cth: Wali Kelas" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block mb-1 text-xs font-medium text-gray-600">Tanggal Mulai</label>
                                            <input type="date" value={riwayat.tanggalMulai} onChange={e => handleRiwayatChange(index, 'tanggalMulai', e.target.value)} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2" />
                                        </div>
                                        <div>
                                            <label className="block mb-1 text-xs font-medium text-gray-600">Tanggal Selesai (Kosongkan jika aktif)</label>
                                            <input type="date" value={riwayat.tanggalSelesai || ''} onChange={e => handleRiwayatChange(index, 'tanggalSelesai', e.target.value)} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {(!teacher.riwayatJabatan || teacher.riwayatJabatan.length === 0) && (
                                <p className="text-center text-gray-400 text-xs py-4 border rounded-lg border-dashed">Belum ada riwayat jabatan.</p>
                            )}
                        </div>
                    </div>
                </div>
                
                <div className="p-4 border-t flex justify-end space-x-2 bg-gray-50 rounded-b-lg shrink-0">
                    <button onClick={onClose} type="button" className="text-gray-500 bg-white hover:bg-gray-100 focus:ring-4 focus:outline-none focus:ring-blue-300 rounded-lg border border-gray-200 text-sm font-medium px-5 py-2.5 hover:text-gray-900 focus:z-10">Batal</button>
                    <button onClick={handleSave} type="button" className="text-white bg-teal-700 hover:bg-teal-800 focus:ring-4 focus:outline-none focus:ring-teal-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center shadow-md">Simpan Data</button>
                </div>
            </div>
        </div>
    )
}
