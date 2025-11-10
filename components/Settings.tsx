import React, { useState, useEffect, useMemo, useRef } from 'react';
import { PondokSettings, Jenjang, Kelas, Rombel, TenagaPengajar, RiwayatJabatan, NisJenjangConfig, NisSettings, MataPelajaran, Santri } from '../types';
import { db } from '../db';
import { useAppContext } from '../AppContext';
import { StructureModal } from './settings/modals/StructureModal';
import { TeacherModal } from './settings/modals/TeacherModal';
import { MapelModal } from './settings/modals/MapelModal';

interface SettingsProps {}

type StructureItem = Jenjang | Kelas | Rombel;

const Settings: React.FC<SettingsProps> = () => {
    const { settings, santriList, onSaveSettings, showConfirmation, showToast, showAlert } = useAppContext();
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
    
    const restoreInputRef = useRef<HTMLInputElement>(null);
    const [isSaving, setIsSaving] = useState(false);

     useEffect(() => {
        // Sync local state when the prop changes
        setLocalSettings(settings);
     }, [settings]);

     useEffect(() => {
        const jenjangIdsInConfig = new Set(localSettings.nisSettings.jenjangConfig.map(jc => jc.jenjangId));
        const newConfigs: NisJenjangConfig[] = [];

        localSettings.jenjang.forEach(j => {
            if (!jenjangIdsInConfig.has(j.id)) {
                newConfigs.push({ jenjangId: j.id, startNumber: 1, padding: 3 });
            }
        });

        if (newConfigs.length > 0) {
            setLocalSettings(prev => ({
                ...prev,
                nisSettings: {
                    ...prev.nisSettings,
                    jenjangConfig: [...prev.nisSettings.jenjangConfig, ...newConfigs]
                }
            }));
        }
    }, [localSettings.jenjang, localSettings.nisSettings.jenjangConfig]);

    const getTeacherStatus = (teacher: TenagaPengajar) => {
        if (!teacher.riwayatJabatan || teacher.riwayatJabatan.length === 0) {
            return { isActive: false, jabatan: 'N/A', text: 'Tidak ada riwayat jabatan', color: 'gray' };
        }

        const latestRiwayat = [...teacher.riwayatJabatan].sort((a, b) => new Date(b.tanggalMulai).getTime() - new Date(a.tanggalMulai).getTime())[0];
        
        const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

        if (latestRiwayat.tanggalSelesai) {
            return {
                isActive: false,
                jabatan: latestRiwayat.jabatan,
                text: `Berakhir pada ${formatDate(latestRiwayat.tanggalSelesai)}`,
                color: 'red'
            };
        } else {
            return {
                isActive: true,
                jabatan: latestRiwayat.jabatan,
                text: `Aktif sejak ${formatDate(latestRiwayat.tanggalMulai)}`,
                color: 'teal'
            };
        }
    };

    const activeTeachers = useMemo(() => 
        localSettings.tenagaPengajar.filter(t => getTeacherStatus(t).isActive),
        [localSettings.tenagaPengajar]
    );
    
    const handleInputChange = <K extends keyof PondokSettings>(key: K, value: PondokSettings[K]) => {
        setLocalSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleNisSettingChange = <K extends keyof NisSettings>(key: K, value: NisSettings[K]) => {
        setLocalSettings(prev => ({
            ...prev,
            nisSettings: {
                ...prev.nisSettings,
                [key]: value,
            },
        }));
    };

    const handleNisJenjangConfigChange = (jenjangId: number, key: 'startNumber' | 'padding', value: string) => {
        const numValue = parseInt(value, 10);
        if (isNaN(numValue)) return;

        setLocalSettings(prev => ({
            ...prev,
            nisSettings: {
                ...prev.nisSettings,
                jenjangConfig: prev.nisSettings.jenjangConfig.map(jc => 
                    jc.jenjangId === jenjangId ? { ...jc, [key]: numValue } : jc
                )
            }
        }));
    };
    
    const handleSaveSettings = () => {
        showConfirmation(
            'Simpan Pengaturan',
            'Apakah Anda yakin ingin menyimpan semua perubahan yang dibuat?',
            async () => {
                setIsSaving(true);
                try {
                    await onSaveSettings(localSettings);
                    showToast('Pengaturan berhasil disimpan!', 'success');
                } catch (error) {
                    console.error("Failed to save settings:", error);
                    showToast('Gagal menyimpan pengaturan.', 'error');
                } finally {
                    setIsSaving(false);
                }
            },
            { confirmText: 'Ya, Simpan', confirmColor: 'green' }
        );
    };

    const handleBackup = async () => {
        try {
            const settingsData = await db.settings.toArray();
            const santriData = await db.santri.toArray();
            
            const backupData = {
                settings: settingsData,
                santri: santriData,
                backupVersion: '1.0',
                createdAt: new Date().toISOString(),
            };

            const jsonString = JSON.stringify(backupData, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = url;
            
            const timestamp = new Date().toISOString().slice(0, 19).replace(/[-T:]/g, '');
            link.download = `eSantri_backup_${timestamp}.json`;

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            URL.revokeObjectURL(url);
            showToast('Backup data berhasil diunduh!', 'success');
        } catch (error) {
            console.error('Failed to create backup:', error);
            showToast('Gagal membuat backup. Lihat konsol untuk detail.', 'error');
        }
    };

    const handleRestore = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const jsonString = e.target?.result as string;
                const backupData = JSON.parse(jsonString);

                if (!backupData.settings || !backupData.santri) {
                    throw new Error('File cadangan tidak valid atau rusak.');
                }
                
                showConfirmation(
                    'Konfirmasi Pemulihan Data',
                    'PERHATIAN: Tindakan ini akan MENGHAPUS SEMUA DATA saat ini dan menggantinya dengan data dari file cadangan. Apakah Anda yakin ingin melanjutkan?',
                    async () => {
                        try {
                           await db.transaction('rw', db.settings, db.santri, async () => {
                                await db.settings.clear();
                                await db.santri.clear();
                                await db.settings.bulkPut(backupData.settings);
                                await db.santri.bulkPut(backupData.santri);
                           });
                           showToast('Data berhasil dipulihkan. Aplikasi akan dimuat ulang.', 'success');
                           setTimeout(() => window.location.reload(), 1500);
                        } catch(dbError) {
                            console.error('Failed to restore data to DB:', dbError);
                            showToast('Gagal memulihkan data. Lihat konsol untuk detail.', 'error');
                        }
                    },
                    { confirmText: 'Ya, Pulihkan Data', confirmColor: 'red' }
                );

            } catch (parseError) {
                console.error('Failed to parse backup file:', parseError);
                showToast('Gagal membaca file cadangan. Pastikan file tersebut adalah file JSON yang valid dari eSantri.', 'error');
            } finally {
                if (restoreInputRef.current) {
                    restoreInputRef.current.value = '';
                }
            }
        };

        reader.readAsText(file);
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

            // Integrity checks before showing confirmation
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

            // Default confirmation for Kelas and Rombel if checks pass
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

    const LogoUploader: React.FC<{
        label: string;
        logoUrl?: string;
        onLogoChange: (url: string) => void;
    }> = ({ label, logoUrl, onLogoChange }) => {
        const fileInputRef = useRef<HTMLInputElement>(null);
    
        const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (file) {
                const reader = new FileReader();
                reader.onloadend = () => {
                    onLogoChange(reader.result as string);
                };
                reader.readAsDataURL(file);
            }
        };
    
        return (
            <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">{label}</label>
                <div className="flex items-center gap-4">
                    <img 
                        src={logoUrl || 'https://placehold.co/100x100/e2e8f0/334155?text=Logo'} 
                        alt={label} 
                        className="w-20 h-20 object-contain rounded-md border bg-gray-100 p-1"
                    />
                    <div className="flex-grow space-y-2">
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">URL Logo</label>
                            <input
                                type="text"
                                placeholder="https://example.com/logo.png"
                                value={logoUrl?.startsWith('data:') ? '' : logoUrl || ''}
                                onChange={(e) => onLogoChange(e.target.value)}
                                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="file"
                                accept="image/*"
                                ref={fileInputRef}
                                onChange={handleFileUpload}
                                className="hidden"
                            />
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="text-sm text-white bg-gray-600 hover:bg-gray-700 font-medium px-4 py-2 rounded-md"
                            >
                                Upload
                            </button>
                            {logoUrl && (
                                 <button
                                    type="button"
                                    onClick={() => onLogoChange('')}
                                    className="text-sm text-red-700 hover:text-red-900 font-medium px-4 py-2 rounded-md bg-red-100"
                                >
                                    Hapus
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };
    
    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Pengaturan Pondok Pesantren</h1>
            
            <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                <h2 className="text-xl font-bold text-gray-700 mb-4 border-b pb-2">Informasi Umum</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block mb-1 text-sm font-medium text-gray-700">Nama Yayasan</label>
                        <input type="text" value={localSettings.namaYayasan} onChange={(e) => handleInputChange('namaYayasan', e.target.value)} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 block w-full p-2.5" />
                    </div>
                     <div>
                        <label className="block mb-1 text-sm font-medium text-gray-700">Nama Ponpes</label>
                        <input type="text" value={localSettings.namaPonpes} onChange={(e) => handleInputChange('namaPonpes', e.target.value)} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 block w-full p-2.5" />
                    </div>
                    <div>
                        <label className="block mb-1 text-sm font-medium text-gray-700">Mudir Aam</label>
                        <select value={localSettings.mudirAamId || ''} onChange={(e) => handleInputChange('mudirAamId', e.target.value ? parseInt(e.target.value) : undefined)} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 block w-full p-2.5">
                             <option value="">-- Pilih Mudir Aam --</option>
                             {activeTeachers.map(t => <option key={t.id} value={t.id}>{t.nama}</option>)}
                        </select>
                    </div>
                     <div>
                        <label className="block mb-1 text-sm font-medium text-gray-700">NSPP</label>
                        <input type="text" value={localSettings.nspp} onChange={(e) => handleInputChange('nspp', e.target.value)} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 block w-full p-2.5" />
                    </div>
                    <div>
                        <label className="block mb-1 text-sm font-medium text-gray-700">NPSN</label>
                        <input type="text" value={localSettings.npsn} onChange={(e) => handleInputChange('npsn', e.target.value)} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 block w-full p-2.5" />
                    </div>
                    <div>
                        <label className="block mb-1 text-sm font-medium text-gray-700">Telepon</label>
                        <input type="tel" value={localSettings.telepon} onChange={(e) => handleInputChange('telepon', e.target.value)} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 block w-full p-2.5" />
                    </div>
                     <div>
                        <label className="block mb-1 text-sm font-medium text-gray-700">Website</label>
                        <input type="url" value={localSettings.website} onChange={(e) => handleInputChange('website', e.target.value)} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 block w-full p-2.5" />
                    </div>
                     <div>
                        <label className="block mb-1 text-sm font-medium text-gray-700">Email</label>
                        <input type="email" value={localSettings.email} onChange={(e) => handleInputChange('email', e.target.value)} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 block w-full p-2.5" />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block mb-1 text-sm font-medium text-gray-700">Alamat</label>
                        <textarea value={localSettings.alamat} onChange={(e) => handleInputChange('alamat', e.target.value)} rows={2} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 block w-full p-2.5"></textarea>
                    </div>
                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t mt-6">
                        <LogoUploader 
                            label="Logo Yayasan"
                            logoUrl={localSettings.logoYayasanUrl}
                            onLogoChange={(url) => handleInputChange('logoYayasanUrl', url)}
                        />
                        <LogoUploader 
                            label="Logo Pondok Pesantren"
                            logoUrl={localSettings.logoPonpesUrl}
                            onLogoChange={(url) => handleInputChange('logoPonpesUrl', url)}
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                <h2 className="text-xl font-bold text-gray-700 mb-4 border-b pb-2">Pengaturan Generator NIS</h2>
                <div className="space-y-6">
                    <div>
                        <label className="block mb-2 text-sm font-medium text-gray-700">Metode Pembuatan NIS</label>
                        <div className="flex flex-wrap gap-4">
                            {(['custom', 'global', 'dob'] as const).map(method => (
                                <div className="flex items-center" key={method}>
                                    <input
                                        type="radio"
                                        id={`method-${method}`}
                                        name="nis-method"
                                        value={method}
                                        checked={localSettings.nisSettings.generationMethod === method}
                                        onChange={(e) => handleNisSettingChange('generationMethod', e.target.value as any)}
                                        className="w-4 h-4 text-teal-600 bg-gray-100 border-gray-300 focus:ring-teal-500"
                                    />
                                    <label htmlFor={`method-${method}`} className="ml-2 text-sm text-gray-800">
                                        {method === 'custom' && 'Metode Kustom'}
                                        {method === 'global' && 'Metode Global'}
                                        {method === 'dob' && 'Metode Tgl. Lahir'}
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>

                    {localSettings.nisSettings.generationMethod === 'custom' && (
                        <div className="p-4 border rounded-lg bg-gray-50/50 space-y-6">
                            <p className="text-sm text-gray-600">Metode ini memungkinkan pembuatan NIS dengan format yang bisa diatur sendiri menggunakan placeholder.</p>
                            <div>
                                <label className="block mb-1 text-sm font-medium text-gray-700">Format Urutan NIS</label>
                                <input type="text" value={localSettings.nisSettings.format} onChange={(e) => handleNisSettingChange('format', e.target.value)} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 block w-full p-2.5" />
                                <p className="text-xs text-gray-500 mt-1">Gunakan placeholder: <code className="bg-gray-200 text-red-600 px-1 rounded">{'{TM}'}</code> (Tahun Masehi), <code className="bg-gray-200 text-red-600 px-1 rounded">{'{TH}'}</code> (Tahun Hijriah), <code className="bg-gray-200 text-red-600 px-1 rounded">{'{KODE}'}</code> (Kode Jenjang), <code className="bg-gray-200 text-red-600 px-1 rounded">{'{NO_URUT}'}</code> (Nomor Urut).</p>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
                                <div>
                                    <label className="block mb-2 text-sm font-medium text-gray-700">Sumber Tahun Masehi ({'{TM}'})</label>
                                    <div className="space-y-2">
                                        <div className="flex items-center">
                                            <input type="radio" id="masehi-auto" name="masehi-source" value="auto" checked={localSettings.nisSettings.masehiYearSource === 'auto'} onChange={(e) => handleNisSettingChange('masehiYearSource', e.target.value as 'auto' | 'manual')} className="w-4 h-4 text-teal-600 bg-gray-100 border-gray-300 focus:ring-teal-500" />
                                            <label htmlFor="masehi-auto" className="ml-2 text-sm text-gray-800">Otomatis (dari tanggal masuk)</label>
                                        </div>
                                        <div>
                                            <div className="flex items-center">
                                                <input type="radio" id="masehi-manual" name="masehi-source" value="manual" checked={localSettings.nisSettings.masehiYearSource === 'manual'} onChange={(e) => handleNisSettingChange('masehiYearSource', e.target.value as 'auto' | 'manual')} className="w-4 h-4 text-teal-600 bg-gray-100 border-gray-300 focus:ring-teal-500" />
                                                <label htmlFor="masehi-manual" className="ml-2 text-sm text-gray-800">Manual</label>
                                            </div>
                                            {localSettings.nisSettings.masehiYearSource === 'manual' && (
                                                <div className="mt-2 ml-6">
                                                    <input type="number" value={localSettings.nisSettings.manualMasehiYear} onChange={(e) => handleNisSettingChange('manualMasehiYear', e.target.value === '' ? 0 : parseInt(e.target.value, 10))} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 block w-full sm:w-48 p-2" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block mb-2 text-sm font-medium text-gray-700">Sumber Tahun Hijriah ({'{TH}'})</label>
                                    <div className="space-y-2">
                                        <div className="flex items-center">
                                            <input type="radio" id="hijriah-auto" name="hijriah-source" value="auto" checked={localSettings.nisSettings.hijriahYearSource === 'auto'} onChange={(e) => handleNisSettingChange('hijriahYearSource', e.target.value as 'auto' | 'manual')} className="w-4 h-4 text-teal-600 bg-gray-100 border-gray-300 focus:ring-teal-500" />
                                            <label htmlFor="hijriah-auto" className="ml-2 text-sm text-gray-800">Otomatis (estimasi)</label>
                                        </div>
                                        <div>
                                            <div className="flex items-center">
                                                <input type="radio" id="hijriah-manual" name="hijriah-source" value="manual" checked={localSettings.nisSettings.hijriahYearSource === 'manual'} onChange={(e) => handleNisSettingChange('hijriahYearSource', e.target.value as 'auto' | 'manual')} className="w-4 h-4 text-teal-600 bg-gray-100 border-gray-300 focus:ring-teal-500" />
                                                <label htmlFor="hijriah-manual" className="ml-2 text-sm text-gray-800">Manual</label>
                                            </div>
                                            {localSettings.nisSettings.hijriahYearSource === 'manual' && (
                                                <div className="mt-2 ml-6">
                                                    <input type="number" value={localSettings.nisSettings.manualHijriahYear} onChange={(e) => handleNisSettingChange('manualHijriahYear', e.target.value === '' ? 0 : parseInt(e.target.value, 10))} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 block w-full sm:w-48 p-2" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-6 pt-4 border-t">
                                <label className="block mb-1 text-sm font-medium text-gray-700">Pengaturan Nomor Urut per Jenjang</label>
                                <div className="border rounded-lg overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-left text-gray-600">
                                            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                                <tr>
                                                    <th className="px-4 py-2 sticky left-0 bg-gray-50 z-10">Jenjang Pendidikan</th>
                                                    <th className="px-4 py-2">Nomor Urut Mulai</th>
                                                    <th className="px-4 py-2">Jumlah Digit No. Urut</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {localSettings.jenjang.map(jenjang => {
                                                    const config = localSettings.nisSettings.jenjangConfig.find(c => c.jenjangId === jenjang.id);
                                                    if (!config) return null;
                                                    return (
                                                        <tr key={jenjang.id} className="bg-white border-b hover:bg-gray-50 group">
                                                            <td className="px-4 py-2 font-medium sticky left-0 bg-white group-hover:bg-gray-50">{jenjang.nama}</td>
                                                            <td className="px-4 py-2">
                                                                <input type="number" value={config.startNumber} onChange={e => handleNisJenjangConfigChange(jenjang.id, 'startNumber', e.target.value)} className="bg-gray-50 border border-gray-300 text-sm rounded-md focus:ring-teal-500 w-24 p-1.5" />
                                                            </td>
                                                            <td className="px-4 py-2">
                                                                <input type="number" value={config.padding} onChange={e => handleNisJenjangConfigChange(jenjang.id, 'padding', e.target.value)} className="bg-gray-50 border border-gray-300 text-sm rounded-md focus:ring-teal-500 w-24 p-1.5" />
                                                            </td>
                                                        </tr>
                                                    )
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {localSettings.nisSettings.generationMethod === 'global' && (
                        <div className="p-4 border rounded-lg bg-gray-50/50 space-y-4">
                             <p className="text-sm text-gray-600">Membuat NIS berurutan secara global untuk semua santri. Contoh: <code className="bg-gray-200 px-1 rounded">20240001</code> atau <code className="bg-gray-200 px-1 rounded">2024SW001</code></p>
                            <div className="flex items-center">
                                <input type="checkbox" id="global-use-year" checked={localSettings.nisSettings.globalUseYearPrefix} onChange={(e) => handleNisSettingChange('globalUseYearPrefix', e.target.checked)} className="w-4 h-4 text-teal-600 bg-gray-100 border-gray-300 rounded focus:ring-teal-500" />
                                <label htmlFor="global-use-year" className="ml-2 text-sm text-gray-800">Sertakan Tahun Masuk sebagai Awalan</label>
                            </div>
                             <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <label className="block mb-1 text-sm font-medium text-gray-700">Awalan Tambahan (Opsional)</label>
                                    <input type="text" value={localSettings.nisSettings.globalPrefix} onChange={(e) => handleNisSettingChange('globalPrefix', e.target.value)} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2" />
                                </div>
                                <div>
                                    <label className="block mb-1 text-sm font-medium text-gray-700">Nomor Urut Mulai</label>
                                    <input type="number" value={localSettings.nisSettings.globalStartNumber} onChange={(e) => handleNisSettingChange('globalStartNumber', parseInt(e.target.value) || 1)} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2" />
                                </div>
                                <div>
                                    <label className="block mb-1 text-sm font-medium text-gray-700">Jumlah Digit No. Urut</label>
                                    <input type="number" value={localSettings.nisSettings.globalPadding} onChange={(e) => handleNisSettingChange('globalPadding', parseInt(e.target.value) || 4)} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2" />
                                </div>
                            </div>
                             <div className="flex items-center pt-4 border-t mt-4">
                                <input type="checkbox" id="global-use-jenjang" checked={localSettings.nisSettings.globalUseJenjangCode} onChange={(e) => handleNisSettingChange('globalUseJenjangCode', e.target.checked)} className="w-4 h-4 text-teal-600 bg-gray-100 border-gray-300 rounded focus:ring-teal-500" />
                                <label htmlFor="global-use-jenjang" className="ml-2 text-sm text-gray-800">Sertakan Kode Jenjang (membuat urutan per jenjang)</label>
                            </div>
                        </div>
                    )}
                    
                    {localSettings.nisSettings.generationMethod === 'dob' && (
                         <div className="p-4 border rounded-lg bg-gray-50/50 space-y-4">
                            <p className="text-sm text-gray-600">Membuat NIS dari tanggal lahir santri dan nomor urut harian. Contoh: <code className="bg-gray-200 px-1 rounded">120318001</code> atau <code className="bg-gray-200 px-1 rounded">120318SW001</code></p>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <label className="block mb-1 text-sm font-medium text-gray-700">Format Tanggal Lahir</label>
                                    <select value={localSettings.nisSettings.dobFormat} onChange={(e) => handleNisSettingChange('dobFormat', e.target.value as any)} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2">
                                        <option value="DDMMYY">DDMMYY (120318)</option>
                                        <option value="YYMMDD">YYMMDD (180312)</option>
                                        <option value="YYYYMMDD">YYYYMMDD (20180312)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block mb-1 text-sm font-medium text-gray-700">Pemisah (Opsional)</label>
                                    <input type="text" value={localSettings.nisSettings.dobSeparator} onChange={(e) => handleNisSettingChange('dobSeparator', e.target.value)} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2" />
                                </div>
                                <div>
                                    <label className="block mb-1 text-sm font-medium text-gray-700">Jumlah Digit No. Urut</label>
                                    <input type="number" value={localSettings.nisSettings.dobPadding} onChange={(e) => handleNisSettingChange('dobPadding', parseInt(e.target.value) || 3)} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2" />
                                </div>
                            </div>
                            <div className="flex items-center pt-4 border-t mt-4">
                                <input type="checkbox" id="dob-use-jenjang" checked={localSettings.nisSettings.dobUseJenjangCode} onChange={(e) => handleNisSettingChange('dobUseJenjangCode', e.target.checked)} className="w-4 h-4 text-teal-600 bg-gray-100 border-gray-300 rounded focus:ring-teal-500" />
                                <label htmlFor="dob-use-jenjang" className="ml-2 text-sm text-gray-800">Sertakan Kode Jenjang (membuat urutan per jenjang)</label>
                            </div>
                        </div>
                    )}
                </div>
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
                <h2 className="text-xl font-bold text-gray-700 mb-4 border-b pb-2">Cadangkan & Pulihkan Data</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-800">Cadangkan Data</h3>
                        <p className="text-sm text-gray-600 mt-1 mb-4">Simpan salinan semua data santri dan pengaturan ke dalam satu file JSON. Simpan file ini di tempat yang aman.</p>
                        <button 
                            onClick={handleBackup}
                            className="w-full sm:w-auto text-white bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 flex items-center justify-center gap-2">
                            <i className="bi bi-download"></i>
                            <span>Unduh Cadangan Data</span>
                        </button>
                    </div>
                     <div>
                        <h3 className="text-lg font-semibold text-gray-800">Pulihkan Data</h3>
                        <p className="text-sm text-gray-600 mt-1 mb-4">Pulihkan data dari file cadangan. Tindakan ini tidak dapat dibatalkan.</p>
                        <input type="file" accept=".json" onChange={handleRestore} ref={restoreInputRef} id="restore-input" className="hidden" />
                        <label 
                            htmlFor="restore-input"
                            className="w-full sm:w-auto cursor-pointer text-white bg-green-600 hover:bg-green-700 focus:ring-4 focus:ring-green-300 font-medium rounded-lg text-sm px-5 py-2.5 flex items-center justify-center gap-2">
                            <i className="bi bi-upload"></i>
                            <span>Pilih File Cadangan</span>
                        </label>
                        <div className="mt-4 p-3 rounded-md bg-red-50 border border-red-200 text-red-800 text-sm">
                            <i className="bi bi-exclamation-triangle-fill mr-2"></i>
                            <strong>PERHATIAN:</strong> Memulihkan data akan menghapus semua data yang ada saat ini.
                        </div>
                    </div>
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

export default Settings;