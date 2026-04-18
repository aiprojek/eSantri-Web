
import React, { useState, useEffect, useMemo } from 'react';
import { TenagaPengajar, RiwayatJabatan, KetersediaanPengajar, Jenjang, Kelas, Rombel } from '../../../types';
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
                telepon: '',
                email: '',
                riwayatJabatan: [{ id: Date.now(), jabatan: '', tanggalMulai: new Date().toISOString().split('T')[0] }],
                ketersediaanPengajar: [],
                hariMasuk: [], 
                jamMasuk: [],
                availableRombelIds: [],
                availableKelasIds: [],
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

    const handleJamToggle = (jamUrutan: number) => {
        const currentJams = teacher.jamMasuk || [];
        if (currentJams.includes(jamUrutan)) {
            handleTeacherChange('jamMasuk', currentJams.filter(j => j !== jamUrutan));
        } else {
            handleTeacherChange('jamMasuk', [...currentJams, jamUrutan]);
        }
    };

    const handleRombelToggle = (rombelId: number) => {
        const current = teacher.availableRombelIds || [];
        if (current.includes(rombelId)) {
            handleTeacherChange('availableRombelIds', current.filter(id => id !== rombelId));
        } else {
            handleTeacherChange('availableRombelIds', [...current, rombelId]);
        }
    };

    const handleKelasToggle = (kelasId: number) => {
        const current = teacher.availableKelasIds || [];
        if (current.includes(kelasId)) {
            handleTeacherChange('availableKelasIds', current.filter(id => id !== kelasId));
        } else {
            handleTeacherChange('availableKelasIds', [...current, kelasId]);
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

    const handleRiwayatChange = (index: number, field: keyof RiwayatJabatan, value: any) => {
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

    // --- NEW KETERSEDIAAN LOGIC ---
    const addKetersediaan = () => {
        const newKet: KetersediaanPengajar = {
            id: Date.now(),
            jenjangId: 0,
            kelasId: 0,
            rombelId: 0
        };
        handleTeacherChange('ketersediaanPengajar', [...(teacher.ketersediaanPengajar || []), newKet]);
    }

    const updateKetersediaan = (index: number, field: keyof KetersediaanPengajar, value: number) => {
        const updated = [...(teacher.ketersediaanPengajar || [])];
        const item = { ...updated[index], [field]: value };
        
        // Reset children if parent changes
        if (field === 'jenjangId') {
            item.kelasId = 0;
            item.rombelId = 0;
        } else if (field === 'kelasId') {
            item.rombelId = 0;
        }
        
        updated[index] = item;
        handleTeacherChange('ketersediaanPengajar', updated);
    }

    const removeKetersediaan = (index: number) => {
        const updated = (teacher.ketersediaanPengajar || []).filter((_, i) => i !== index);
        handleTeacherChange('ketersediaanPengajar', updated);
    }

    const handleSave = () => {
        if (!teacher.nama?.trim()) {
            showAlert('Input Tidak Lengkap', 'Nama tenaga pendidik tidak boleh kosong.');
            return;
        }
        
        const teacherToSave: TenagaPengajar = {
            id: item?.id || Date.now(),
            nama: teacher.nama || '',
            telepon: teacher.telepon,
            email: teacher.email,
            kodeGuru: teacher.kodeGuru,
            riwayatJabatan: teacher.riwayatJabatan || [],
            ketersediaanPengajar: teacher.ketersediaanPengajar || [],
            hariMasuk: teacher.hariMasuk || [],
            jamMasuk: teacher.jamMasuk || [],
            availableRombelIds: teacher.availableRombelIds || [],
            availableKelasIds: teacher.availableKelasIds || [],
            kompetensiMapelIds: teacher.kompetensiMapelIds || []
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
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div className="md:col-span-2">
                             <label className="block mb-1 text-sm font-medium text-gray-700">Nama Lengkap</label>
                             <input type="text" value={teacher.nama || ''} onChange={(e) => handleTeacherChange('nama', e.target.value)} autoFocus className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 block w-full p-2.5" placeholder="Contoh: Ust. Ahmad, S.Pd.I" />
                         </div>
                         <div>
                             <label className="block mb-1 text-sm font-medium text-gray-700">Kode Guru (Opsional)</label>
                             <input type="text" value={teacher.kodeGuru || ''} onChange={(e) => handleTeacherChange('kodeGuru', e.target.value)} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 block w-full p-2.5" placeholder="Contoh: AH, 01, dll (Untuk Jadwal)" />
                         </div>
                         <div>
                             <label className="block mb-1 text-sm font-medium text-gray-700">No. Telepon/WA</label>
                             <input type="tel" value={teacher.telepon || ''} onChange={(e) => handleTeacherChange('telepon', e.target.value)} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 block w-full p-2.5" placeholder="Contoh: 08123456789" />
                         </div>
                     </div>

                    {/* KETERSEDIAAN PENGAJARAN (SIMPLIFIED) */}
                    <div className="bg-teal-50 p-4 rounded-lg border border-teal-100 shadow-sm">
                        <div className="flex justify-between items-center mb-3">
                            <h4 className="text-sm font-bold text-teal-800 flex items-center gap-2">
                                <i className="bi bi-person-workspace text-teal-600"></i> Ketersediaan Pengajaran (Opsional)
                            </h4>
                            <button 
                                onClick={addKetersediaan}
                                className="text-[10px] bg-teal-600 text-white px-2 py-1 rounded hover:bg-teal-700 transition-colors flex items-center gap-1"
                            >
                                <i className="bi bi-plus-lg"></i> Tambah KBM
                            </button>
                        </div>
                        <p className="text-[10px] text-teal-600 mb-3 italic">Tentukan Marhalah & Rombel yang bisa diajar oleh pengajar ini.</p>
                        
                        <div className="space-y-2">
                            {teacher.ketersediaanPengajar?.map((ket, idx) => {
                                const availableKelas = settings.kelas.filter(k => k.jenjangId === ket.jenjangId);
                                const availableRombel = settings.rombel.filter(r => r.kelasId === ket.kelasId);
                                
                                return (
                                    <div key={ket.id} className="grid grid-cols-12 gap-2 p-2 bg-white rounded border border-teal-200 relative group animate-fade-in">
                                        <div className="col-span-11 grid grid-cols-3 gap-2">
                                            <select 
                                                value={ket.jenjangId} 
                                                onChange={e => updateKetersediaan(idx, 'jenjangId', parseInt(e.target.value))}
                                                className="text-xs bg-gray-50 border border-teal-100 rounded p-1.5"
                                            >
                                                <option value={0}>-- Marhalah --</option>
                                                {settings.jenjang.map(j => <option key={j.id} value={j.id}>{j.nama}</option>)}
                                            </select>
                                            <select 
                                                value={ket.kelasId} 
                                                onChange={e => updateKetersediaan(idx, 'kelasId', parseInt(e.target.value))}
                                                disabled={!ket.jenjangId}
                                                className="text-xs bg-gray-50 border border-teal-100 rounded p-1.5 disabled:opacity-50"
                                            >
                                                <option value={0}>-- Kelas --</option>
                                                {availableKelas.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
                                            </select>
                                            <select 
                                                value={ket.rombelId} 
                                                onChange={e => updateKetersediaan(idx, 'rombelId', parseInt(e.target.value))}
                                                disabled={!ket.kelasId}
                                                className="text-xs bg-gray-50 border border-teal-100 rounded p-1.5 disabled:opacity-50"
                                            >
                                                <option value={0}>-- Rombel/Grup --</option>
                                                {availableRombel.map(r => <option key={r.id} value={r.id}>{r.nama}</option>)}
                                            </select>
                                        </div>
                                        <div className="col-span-1 flex justify-center items-center">
                                            <button 
                                                onClick={() => removeKetersediaan(idx)}
                                                className="text-red-400 hover:text-red-600 transition-colors"
                                            >
                                                <i className="bi bi-x-circle-fill"></i>
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                            
                            {(!teacher.ketersediaanPengajar || teacher.ketersediaanPengajar.length === 0) && (
                                <div className="text-center py-4 border border-dashed border-teal-200 rounded text-xs text-teal-400 bg-white/50">
                                    Belum ada batas ketersediaan. (Dapat mengajar di semua kelas)
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="pt-2 border-t mt-4 lg:grid lg:grid-cols-12 lg:gap-6 space-y-6 lg:space-y-0 text-white">
                        <div className="lg:col-span-12">
                            <div className="flex justify-between items-center mb-3">
                                 <h4 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                     <i className="bi bi-briefcase text-blue-600"></i> Riwayat & Tugas Jabatan
                                 </h4>
                                 <button onClick={addRiwayat} className="text-xs text-blue-600 hover:text-blue-800 font-bold bg-blue-50 px-2 py-1 rounded border border-blue-200 flex items-center gap-1 shadow-sm">
                                     <i className="bi bi-plus-lg"></i> Tambah Jabatan
                                 </button>
                            </div>
                            
                            <div className="space-y-4">
                                {teacher.riwayatJabatan?.map((riwayat, index) => {
                                    const availableRombels = settings.rombel.map(r => {
                                        const kelas = settings.kelas.find(k => k.id === r.kelasId);
                                        const jenjang = settings.jenjang.find(j => j.id === kelas?.jenjangId);
                                        return { ...r, label: `${jenjang?.nama || ''} ${kelas?.nama || ''} - ${r.nama}` };
                                    });

                                    return (
                                        <div key={index} className="p-4 border rounded-lg bg-gray-50 space-y-4 relative group hover:border-blue-300 transition-all border-gray-200">
                                            <button onClick={() => removeRiwayat(index)} className="absolute top-2 right-2 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity bg-white rounded-full p-1 shadow-sm border border-red-100" aria-label="Hapus riwayat jabatan"><i className="bi bi-trash-fill"></i></button>
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-800">
                                                <div>
                                                    <label className="block mb-1 text-xs font-bold text-gray-600 uppercase tracking-wider">Pilih Jabatan</label>
                                                    <select 
                                                        value={riwayat.jabatan === 'Wali Kelas' || riwayat.jabatan === 'Guru Mapel' ? riwayat.jabatan : (riwayat.jabatan ? 'Lainnya' : '')} 
                                                        onChange={e => {
                                                            const val = e.target.value;
                                                            if (val === 'Lainnya') {
                                                                handleRiwayatChange(index, 'jabatan', '');
                                                            } else {
                                                                handleRiwayatChange(index, 'jabatan', val);
                                                            }
                                                        }}
                                                        className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5"
                                                    >
                                                        <option value="">-- Pilih Jabatan --</option>
                                                        <option value="Wali Kelas">Wali Kelas (Homeroom Teacher)</option>
                                                        <option value="Guru Mapel">Guru Mata Pelajaran</option>
                                                        <option value="Lainnya">Lainnya (Ketik Manual)</option>
                                                    </select>
                                                </div>

                                                {(riwayat.jabatan === 'Wali Kelas') && (
                                                    <div>
                                                        <label className="block mb-1 text-xs font-bold text-gray-600 uppercase tracking-wider">Pilih Rombel (Wali Kelas)</label>
                                                        <select 
                                                            value={riwayat.rombelId || ''} 
                                                            onChange={e => handleRiwayatChange(index, 'rombelId', e.target.value ? parseInt(e.target.value) : undefined)}
                                                            className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5"
                                                        >
                                                            <option value="">-- Pilih Rombel --</option>
                                                            {availableRombels.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                                                        </select>
                                                    </div>
                                                )}

                                                {(riwayat.jabatan === '' || (riwayat.jabatan !== 'Wali Kelas' && riwayat.jabatan !== 'Guru Mapel')) && (
                                                    <div>
                                                        <label className="block mb-1 text-xs font-bold text-gray-600 uppercase tracking-wider">Ketik Nama Jabatan</label>
                                                        <input 
                                                            type="text" 
                                                            value={riwayat.jabatan} 
                                                            onChange={e => handleRiwayatChange(index, 'jabatan', e.target.value)} 
                                                            className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5" 
                                                            placeholder="contoh: Mudir Marhalah, Bagian Keamanan, dsb" 
                                                        />
                                                    </div>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-2 gap-3 text-gray-800">
                                                <div>
                                                    <label className="block mb-1 text-xs font-bold text-gray-600 uppercase tracking-wider">Tanggal Mulai</label>
                                                    <input type="date" value={riwayat.tanggalMulai} onChange={e => handleRiwayatChange(index, 'tanggalMulai', e.target.value)} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2" />
                                                </div>
                                                <div>
                                                    <label className="block mb-1 text-xs font-bold text-gray-600 uppercase tracking-wider">Tanggal Selesai</label>
                                                    <input type="date" value={riwayat.tanggalSelesai || ''} onChange={e => handleRiwayatChange(index, 'tanggalSelesai', e.target.value)} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2" placeholder="Masih Aktif" />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                {(!teacher.riwayatJabatan || teacher.riwayatJabatan.length === 0) && (
                                    <p className="text-center text-gray-400 text-xs py-6 border border-dashed rounded-lg bg-gray-50">Belum ada riwayat jabatan.</p>
                                )}
                            </div>
                        </div>
                    </div>

                    <details className="pt-4 border-t group">
                        <summary className="text-sm font-bold text-gray-500 cursor-pointer hover:text-gray-700 flex items-center justify-between">
                            <span>Opsi Lanjutan & Kompetensi Mapel</span>
                            <i className="bi bi-chevron-down transition-transform group-open:rotate-180"></i>
                        </summary>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 animate-fade-in">
                            {/* Hari Availability */}
                            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                                <label className="block mb-2 text-sm font-bold text-blue-800">Hari Masuk</label>
                                <div className="flex flex-wrap gap-2">
                                    {days.map(day => {
                                        const isSelected = (teacher.hariMasuk || []).includes(day.val);
                                        return (
                                            <button
                                                key={day.val}
                                                type="button"
                                                onClick={() => handleDayToggle(day.val)}
                                                className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${isSelected ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
                                            >
                                                {day.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Jam Availability */}
                            <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                                <label className="block mb-2 text-sm font-bold text-purple-800">Jam Masuk (Urutan)</label>
                                <div className="flex flex-wrap gap-2">
                                    {[1,2,3,4,5,6,7,8,9,10].map(jam => {
                                        const isSelected = (teacher.jamMasuk || []).includes(jam);
                                        return (
                                            <button
                                                key={jam}
                                                type="button"
                                                onClick={() => handleJamToggle(jam)}
                                                className={`w-8 h-8 rounded-md text-xs font-medium border transition-colors ${isSelected ? 'bg-purple-600 text-white border-purple-600 shadow-sm' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
                                            >
                                                {jam}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Rombel & Kelas Availability OLD (HIDDEN IN SUMMARY BUT KEPT) */}
                            <div className="hidden">
                                {/* Keeping logic here but hidden from user as they asked for a simplified flow */}
                            </div>

                             {/* Kompetensi Mapel */}
                             <div className="bg-green-50 p-3 rounded-lg border border-green-200 md:col-span-2">
                                <label className="block mb-2 text-sm font-bold text-green-800">Kompetensi Mata Pelajaran</label>
                                <div className="max-h-40 overflow-y-auto pr-1 space-y-3">
                                    {mapelByJenjang.length > 0 ? mapelByJenjang.map(group => (
                                        <div key={group.jenjang.id}>
                                            <h5 className="text-[10px] font-bold text-gray-400 mb-1 uppercase border-b border-green-200 pb-1">{group.jenjang.nama}</h5>
                                            <div className="flex flex-wrap gap-2">
                                                {group.mapel.map(m => {
                                                    const isChecked = (teacher.kompetensiMapelIds || []).includes(m.id);
                                                    return (
                                                        <label key={m.id} className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] cursor-pointer border transition-colors ${isChecked ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-300 hover:border-green-400'}`}>
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
                    </details>
                </div>
                
                <div className="p-4 border-t flex justify-end space-x-2 bg-gray-50 rounded-b-lg shrink-0">
                    <button onClick={onClose} type="button" className="text-gray-500 bg-white hover:bg-gray-100 focus:ring-4 focus:outline-none focus:ring-blue-300 rounded-lg border border-gray-200 text-sm font-medium px-5 py-2.5 hover:text-gray-900 focus:z-10">Batal</button>
                    <button onClick={handleSave} type="button" className="text-white bg-teal-700 hover:bg-teal-800 focus:ring-4 focus:outline-none focus:ring-teal-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center shadow-md">Simpan Data</button>
                </div>
            </div>
        </div>
    )
}
