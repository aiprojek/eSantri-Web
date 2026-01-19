
import React, { useState, useMemo } from 'react';
import { TenagaPengajar, User, UserPermissions } from '../../../types';
import { hashString, DEFAULT_STAFF_PERMISSIONS, ADMIN_PERMISSIONS } from '../../../services/authService';
import { useAppContext } from '../../../AppContext';

interface BulkUserFromTeacherModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (newUsers: User[]) => Promise<void>;
    teachers: TenagaPengajar[];
    existingUsers: User[];
}

export const BulkUserFromTeacherModal: React.FC<BulkUserFromTeacherModalProps> = ({ 
    isOpen, onClose, onSave, teachers, existingUsers 
}) => {
    const { showToast } = useAppContext();
    const [selectedTeacherIds, setSelectedTeacherIds] = useState<number[]>([]);
    const [defaultPassword, setDefaultPassword] = useState('123456');
    const [isProcessing, setIsProcessing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // State untuk menyimpan konfigurasi per user (Role & Sync Permission)
    // Format: { [teacherId]: { role: 'admin'|'staff', syncAdmin: boolean } }
    const [userConfigs, setUserConfigs] = useState<Record<number, { role: 'admin' | 'staff', syncAdmin: boolean }>>({});

    // Filter guru yang namanya belum ada di tabel user (Pencocokan sederhana)
    // dan sesuai search term
    const availableTeachers = useMemo(() => {
        const existingNames = new Set(existingUsers.map(u => u.fullName.toLowerCase().trim()));
        
        return teachers.filter(t => {
            const name = t.nama.toLowerCase().trim();
            const isNotUser = !existingNames.has(name);
            const matchesSearch = name.includes(searchTerm.toLowerCase());
            return isNotUser && matchesSearch;
        });
    }, [teachers, existingUsers, searchTerm]);

    const handleToggleSelect = (id: number) => {
        setSelectedTeacherIds(prev => 
            prev.includes(id) ? prev.filter(tid => tid !== id) : [...prev, id]
        );
    };

    const handleSelectAll = () => {
        if (selectedTeacherIds.length === availableTeachers.length) {
            setSelectedTeacherIds([]);
        } else {
            setSelectedTeacherIds(availableTeachers.map(t => t.id));
        }
    };

    // Helper untuk update config per user
    const handleConfigChange = (id: number, field: 'role' | 'syncAdmin', value: any) => {
        setUserConfigs(prev => ({
            ...prev,
            [id]: {
                role: field === 'role' ? value : (prev[id]?.role || 'staff'),
                syncAdmin: field === 'syncAdmin' ? value : (prev[id]?.syncAdmin || false)
            }
        }));
        
        // Auto-select baris jika user mengubah konfigurasi
        if (!selectedTeacherIds.includes(id)) {
            setSelectedTeacherIds(prev => [...prev, id]);
        }
    };

    const generateUsername = (fullName: string): string => {
        // Hapus gelar (Dr., S.Pd, dll) dan karakter non-alfabet, ambil 2 kata pertama
        const cleanName = fullName
            .replace(/[,.]/g, '') // Hapus titik koma
            .replace(/(Dr|Ir|Drs|Dra|Lc|MA|MPd|SPd|SE|MM|MSi|MH)\b/gi, '') // Hapus gelar umum (basic regex)
            .trim()
            .toLowerCase();
        
        const parts = cleanName.split(/\s+/);
        let username = parts[0];
        if (parts.length > 1) username += parts[1];
        
        // Hapus karakter aneh sisa
        username = username.replace(/[^a-z0-9]/g, '');

        // Cek duplikasi dengan user yang ada, jika ada tambah angka acak
        let finalUsername = username;
        let counter = 1;
        while (existingUsers.some(u => u.username === finalUsername)) {
            finalUsername = `${username}${counter}`;
            counter++;
        }
        return finalUsername;
    };

    const handleSave = async () => {
        if (selectedTeacherIds.length === 0) {
            showToast('Pilih minimal satu guru.', 'error');
            return;
        }
        if (!defaultPassword.trim()) {
            showToast('Password default wajib diisi.', 'error');
            return;
        }

        setIsProcessing(true);
        try {
            const passwordHash = await hashString(defaultPassword);
            const securityAnswerHash = await hashString('esantri'); // Default answer for generated users

            const newUsers: User[] = selectedTeacherIds.map(tid => {
                const teacher = teachers.find(t => t.id === tid)!;
                const config = userConfigs[tid] || { role: 'staff', syncAdmin: false };
                
                // Tentukan Permissions berdasarkan Role & Config
                let finalPermissions: UserPermissions;
                if (config.role === 'admin') {
                    finalPermissions = ADMIN_PERMISSIONS as UserPermissions;
                } else {
                    finalPermissions = {
                        ...DEFAULT_STAFF_PERMISSIONS,
                        syncAdmin: config.syncAdmin // Override sync permission
                    } as UserPermissions;
                }

                return {
                    id: Date.now() + Math.random(), // Unique ID
                    username: generateUsername(teacher.nama),
                    fullName: teacher.nama,
                    role: config.role,
                    passwordHash: passwordHash,
                    permissions: finalPermissions,
                    securityQuestion: 'Apa nama aplikasi ini? (Default)',
                    securityAnswerHash: securityAnswerHash,
                    isDefaultAdmin: false
                };
            });

            await onSave(newUsers);
            onClose();
        } catch (error) {
            console.error(error);
            showToast('Gagal memproses data.', 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[70] flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[85vh] flex flex-col">
                <div className="p-5 border-b flex justify-between items-center bg-gray-50">
                    <div>
                        <h3 className="text-lg font-bold text-gray-800">Tambah User dari Data Guru</h3>
                        <p className="text-xs text-gray-500">Guru yang sudah jadi user tidak ditampilkan.</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><i className="bi bi-x-lg"></i></button>
                </div>

                <div className="p-5 flex-shrink-0 space-y-4 border-b">
                    <div className="flex gap-4 items-end">
                        <div className="flex-grow">
                            <label className="block text-xs font-bold text-gray-600 mb-1">Password Default untuk Semua</label>
                            <input 
                                type="text" 
                                value={defaultPassword} 
                                onChange={e => setDefaultPassword(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg p-2 text-sm bg-yellow-50 focus:bg-white transition-colors"
                            />
                        </div>
                        <div className="flex-grow">
                            <label className="block text-xs font-bold text-gray-600 mb-1">Cari Nama</label>
                            <input 
                                type="text" 
                                value={searchTerm} 
                                onChange={e => setSearchTerm(e.target.value)}
                                placeholder="Filter nama guru..."
                                className="w-full border border-gray-300 rounded-lg p-2 text-sm"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex-grow overflow-y-auto p-0">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-100 text-gray-600 sticky top-0 z-10">
                            <tr>
                                <th className="p-3 w-10 text-center border-b">
                                    <input 
                                        type="checkbox" 
                                        checked={selectedTeacherIds.length > 0 && selectedTeacherIds.length === availableTeachers.length}
                                        onChange={handleSelectAll}
                                        className="rounded text-teal-600 focus:ring-teal-500"
                                    />
                                </th>
                                <th className="p-3 border-b">Nama Guru</th>
                                <th className="p-3 border-b">Preview Username</th>
                                <th className="p-3 border-b w-32">Role</th>
                                <th className="p-3 border-b w-32 text-center">Izin Sync?</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {availableTeachers.map(t => {
                                const isSelected = selectedTeacherIds.includes(t.id);
                                const currentConfig = userConfigs[t.id] || { role: 'staff', syncAdmin: false };
                                
                                return (
                                    <tr key={t.id} className={`hover:bg-gray-50 ${isSelected ? 'bg-teal-50' : ''}`}>
                                        <td className="p-3 text-center" onClick={() => handleToggleSelect(t.id)}>
                                            <input 
                                                type="checkbox" 
                                                checked={isSelected}
                                                onChange={() => handleToggleSelect(t.id)}
                                                className="rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
                                            />
                                        </td>
                                        <td className="p-3 font-medium text-gray-800" onClick={() => handleToggleSelect(t.id)}>
                                            {t.nama}
                                        </td>
                                        <td className="p-3 text-gray-500 font-mono text-xs" onClick={() => handleToggleSelect(t.id)}>
                                            {generateUsername(t.nama)}
                                        </td>
                                        <td className="p-3">
                                            <select 
                                                value={currentConfig.role}
                                                onChange={(e) => handleConfigChange(t.id, 'role', e.target.value)}
                                                className={`text-xs border rounded p-1.5 w-full ${currentConfig.role === 'admin' ? 'bg-purple-100 text-purple-800 border-purple-300 font-bold' : 'bg-white border-gray-300'}`}
                                            >
                                                <option value="staff">Staff</option>
                                                <option value="admin">Admin</option>
                                            </select>
                                        </td>
                                        <td className="p-3 text-center">
                                            <label className="inline-flex items-center cursor-pointer">
                                                <input 
                                                    type="checkbox" 
                                                    checked={currentConfig.syncAdmin}
                                                    onChange={(e) => handleConfigChange(t.id, 'syncAdmin', e.target.checked)}
                                                    disabled={currentConfig.role === 'admin'} // Admin always has sync
                                                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 disabled:opacity-50"
                                                />
                                            </label>
                                            {currentConfig.role === 'admin' && <span className="text-[10px] text-gray-400 block">(Auto)</span>}
                                        </td>
                                    </tr>
                                );
                            })}
                            {availableTeachers.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-gray-400 italic">
                                        Tidak ada data guru yang tersedia untuk ditambahkan (mungkin semua sudah jadi user).
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="p-4 border-t bg-gray-50 flex justify-between items-center rounded-b-lg">
                    <div className="text-sm text-gray-600">
                        Dipilih: <strong>{selectedTeacherIds.length}</strong> guru
                    </div>
                    <div className="flex gap-2">
                        <button onClick={onClose} className="px-4 py-2 border rounded-lg text-gray-600 hover:bg-gray-200 text-sm">Batal</button>
                        <button 
                            onClick={handleSave} 
                            disabled={isProcessing || selectedTeacherIds.length === 0}
                            className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm font-bold shadow-sm disabled:bg-gray-300 flex items-center gap-2"
                        >
                            {isProcessing ? <span className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent"></span> : <i className="bi bi-person-plus-fill"></i>}
                            Tambahkan User
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
