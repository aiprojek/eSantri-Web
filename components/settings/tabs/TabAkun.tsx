
import React, { useState, useEffect } from 'react';
import { PondokSettings, User } from '../../../types';
import { useAppContext } from '../../../AppContext';
import { db } from '../../../db';
import { hashString, ADMIN_PERMISSIONS, generateRecoveryKey } from '../../../services/authService';
import { UserModal } from '../modals/UserModal';
import { BulkUserFromTeacherModal } from '../modals/BulkUserFromTeacherModal';

interface TabAkunProps {
    localSettings: PondokSettings;
    handleInputChange: <K extends keyof PondokSettings>(key: K, value: PondokSettings[K]) => void;
}

export const TabAkun: React.FC<TabAkunProps> = ({ localSettings, handleInputChange }) => {
    const { showConfirmation, showToast, showAlert, currentUser } = useAppContext();
    const [users, setUsers] = useState<User[]>([]);
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [recoveryKey, setRecoveryKey] = useState<string | null>(null);
    
    // New State for Bulk Modal
    const [isBulkTeacherModalOpen, setIsBulkTeacherModalOpen] = useState(false);

    useEffect(() => {
        const fetchUsers = async () => {
            const allUsers = await db.users.toArray();
            setUsers(allUsers);
        };
        fetchUsers();
    }, []);

    const handleToggleMultiUser = async (enabled: boolean) => {
        if (enabled && users.length === 0) {
            const generatedKey = generateRecoveryKey();
            const keyHash = await hashString(generatedKey);
            
            const defaultAdmin: User = {
                id: Date.now(),
                username: 'admin',
                passwordHash: await hashString('admin123'),
                fullName: 'Administrator',
                role: 'admin',
                permissions: ADMIN_PERMISSIONS as any,
                securityQuestion: 'Apa nama aplikasi ini?',
                securityAnswerHash: await hashString('esantri'),
                recoveryKeyHash: keyHash,
                isDefaultAdmin: true
            };
            await db.users.add(defaultAdmin);
            setUsers([defaultAdmin]);
            
            setRecoveryKey(generatedKey); // Show key to user
            
            handleInputChange('multiUserMode', enabled);
        } else if (!enabled) {
            await new Promise<void>((resolve, reject) => {
                showConfirmation(
                    'Matikan Mode Multi-User?',
                    'Semua staff akan kehilangan akses login. Aplikasi akan kembali ke mode Admin Tunggal (tanpa login).',
                    () => {
                        handleInputChange('multiUserMode', enabled);
                        resolve();
                    },
                    { confirmText: 'Ya, Matikan', confirmColor: 'red' }
                );
            });
        } else {
            handleInputChange('multiUserMode', enabled);
        }
    };

    const handleSaveUser = async (user: User) => {
        if (user.id && users.some(u => u.id === user.id)) {
            await db.users.put(user);
            setUsers(prev => prev.map(u => u.id === user.id ? user : u));
            showToast('User berhasil diperbarui', 'success');
        } else {
            if (users.some(u => u.username === user.username)) {
                showToast('Username sudah digunakan.', 'error');
                return;
            }
            await db.users.add(user);
            setUsers(prev => [...prev, user]);
            showToast('User baru ditambahkan', 'success');
        }
        setIsUserModalOpen(false);
    };

    const handleBulkSaveUsers = async (newUsers: User[]) => {
        try {
            await db.users.bulkAdd(newUsers);
            setUsers(prev => [...prev, ...newUsers]);
            showToast(`${newUsers.length} user berhasil ditambahkan dari data guru.`, 'success');
        } catch (error) {
            console.error(error);
            showToast('Gagal menyimpan data bulk user.', 'error');
        }
    };

    const handleDeleteUser = (id: number) => {
        const user = users.find(u => u.id === id);
        if (user?.isDefaultAdmin) {
            showToast('User Admin Utama tidak dapat dihapus.', 'error');
            return;
        }
        
        if (currentUser && currentUser.id === id) {
             showToast('Anda tidak dapat menghapus akun sendiri.', 'error');
             return;
        }

        showConfirmation(
            `Hapus User ${user?.username}?`,
            'Tindakan ini tidak dapat dibatalkan.',
            async () => {
                await db.users.delete(id);
                setUsers(prev => prev.filter(u => u.id !== id));
                showToast('User dihapus.', 'success');
            },
            { confirmColor: 'red' }
        );
    };

    const handleGenerateNewKey = () => {
        if (!currentUser?.isDefaultAdmin) {
            showToast('Hanya Admin Utama yang bisa reset Kunci Darurat.', 'error');
            return;
        }
        
        showConfirmation(
            'Buat Kunci Darurat Baru?',
            'Kunci darurat yang lama tidak akan berlaku lagi. Pastikan Anda menyimpan kunci yang baru.',
            async () => {
                const newKey = generateRecoveryKey();
                const newHash = await hashString(newKey);
                
                await db.users.update(currentUser.id, { recoveryKeyHash: newHash });
                setRecoveryKey(newKey);
                showToast('Kunci darurat berhasil diperbarui!', 'success');
            },
            { confirmText: 'Generate Baru', confirmColor: 'blue' }
        );
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-md border border-teal-200">
            <h2 className="text-xl font-bold text-gray-700 mb-4 border-b pb-2 flex items-center gap-2">
                <i className="bi bi-shield-lock-fill text-teal-600"></i> Keamanan & Pengguna
            </h2>
            
            <div className="mb-6">
                <label className="flex items-center gap-3 cursor-pointer">
                    <div className="relative">
                        <input 
                            type="checkbox" 
                            checked={localSettings.multiUserMode} 
                            onChange={(e) => handleToggleMultiUser(e.target.checked)}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                    </div>
                    <span className="text-sm font-medium text-gray-900">Aktifkan Mode Multi-User (Login Wajib)</span>
                </label>
                <p className="text-xs text-gray-500 mt-2 ml-14">
                    Jika diaktifkan, setiap pengguna wajib login dengan username dan password masing-masing.
                </p>
            </div>

            {/* Recovery Key Modal Display */}
            {recoveryKey && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg animate-fade-in-down">
                    <h3 className="text-red-800 font-bold flex items-center gap-2 mb-2">
                        <i className="bi bi-key-fill"></i> KUNCI PEMULIHAN DARURAT
                    </h3>
                    <p className="text-sm text-red-700 mb-3">
                        Simpan kode ini di tempat yang sangat aman (Tulis di kertas/Password Manager). Kode ini adalah <strong>satu-satunya cara</strong> untuk mereset password Admin jika Anda lupa password DAN jawaban keamanan.
                    </p>
                    <div className="bg-white p-3 rounded border border-red-200 font-mono text-center text-lg font-bold tracking-wider text-gray-800 select-all">
                        {recoveryKey}
                    </div>
                    <div className="mt-3 text-center">
                        <button onClick={() => setRecoveryKey(null)} className="text-sm text-red-600 underline hover:text-red-800">Saya sudah menyimpannya, tutup.</button>
                    </div>
                </div>
            )}

            {localSettings.multiUserMode && (
                <>
                    {/* Recovery Key Management for Admin */}
                    {currentUser?.isDefaultAdmin && !recoveryKey && (
                        <div className="mb-6 ml-14">
                            <button onClick={handleGenerateNewKey} className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                                <i className="bi bi-arrow-clockwise"></i> Generate Ulang Kunci Darurat
                            </button>
                        </div>
                    )}

                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div className="flex flex-wrap justify-between items-center mb-3 gap-2">
                            <h3 className="font-bold text-gray-800 text-sm">Daftar Pengguna</h3>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => setIsBulkTeacherModalOpen(true)}
                                    className="text-xs bg-white text-teal-700 border border-teal-600 px-3 py-1.5 rounded hover:bg-teal-50 flex items-center gap-1"
                                >
                                    <i className="bi bi-people-fill"></i> Ambil dari Data Guru
                                </button>
                                <button 
                                    onClick={() => { setEditingUser(null); setIsUserModalOpen(true); }}
                                    className="text-xs bg-teal-600 text-white px-3 py-1.5 rounded hover:bg-teal-700 flex items-center gap-1"
                                >
                                    <i className="bi bi-person-plus-fill"></i> Tambah Manual
                                </button>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
                                    <tr>
                                        <th className="px-3 py-2 rounded-tl-lg">Username</th>
                                        <th className="px-3 py-2">Nama Lengkap</th>
                                        <th className="px-3 py-2">Role</th>
                                        <th className="px-3 py-2 text-center rounded-tr-lg">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {users.map(u => (
                                        <tr key={u.id} className="hover:bg-white">
                                            <td className="px-3 py-2 font-medium">{u.username}</td>
                                            <td className="px-3 py-2">{u.fullName}</td>
                                            <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded text-xs font-bold ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{u.role.toUpperCase()}</span></td>
                                            <td className="px-3 py-2 text-center">
                                                <div className="flex justify-center gap-2">
                                                    <button onClick={() => { setEditingUser(u); setIsUserModalOpen(true); }} className="text-blue-600 hover:text-blue-800" title="Edit"><i className="bi bi-pencil-square"></i></button>
                                                    {!u.isDefaultAdmin && (
                                                        <button onClick={() => handleDeleteUser(u.id)} className="text-red-600 hover:text-red-800" title="Hapus"><i className="bi bi-trash"></i></button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
            <UserModal 
                isOpen={isUserModalOpen} 
                onClose={() => setIsUserModalOpen(false)} 
                onSave={handleSaveUser} 
                userData={editingUser} 
            />
            <BulkUserFromTeacherModal 
                isOpen={isBulkTeacherModalOpen}
                onClose={() => setIsBulkTeacherModalOpen(false)}
                onSave={handleBulkSaveUsers}
                teachers={localSettings.tenagaPengajar}
                existingUsers={users}
            />
        </div>
    );
};
