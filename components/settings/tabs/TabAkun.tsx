
import React, { useState, useEffect } from 'react';
import { PondokSettings, User } from '../../../types';
import { useAppContext } from '../../../AppContext';
import { db } from '../../../db';
import { hashString, ADMIN_PERMISSIONS, generateRecoveryKey } from '../../../services/authService';
import { CURRENT_PERMISSION_VERSION, normalizeUserPermissions } from '../../../services/permissionMigrationService';
import { UserModal } from '../modals/UserModal';
import { BulkUserFromTeacherModal } from '../modals/BulkUserFromTeacherModal';
import { SectionCard } from '../../common/SectionCard';

interface TabAkunProps {
    localSettings: PondokSettings;
    handleInputChange: <K extends keyof PondokSettings>(key: K, value: PondokSettings[K]) => void;
}

export const TabAkun: React.FC<TabAkunProps> = ({ localSettings, handleInputChange }) => {
    const { showConfirmation, showToast, currentUser } = useAppContext();
    const [users, setUsers] = useState<User[]>([]);
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [recoveryKey, setRecoveryKey] = useState<string | null>(null);
    
    // New State for Bulk Modal
    const [isBulkTeacherModalOpen, setIsBulkTeacherModalOpen] = useState(false);

    const legacyUsers = users.filter((u) => (u.permissionVersion ?? 0) < CURRENT_PERMISSION_VERSION);

    useEffect(() => {
        const fetchUsers = async () => {
            const allUsers = await db.users.toArray();
            setUsers(allUsers);
        };
        fetchUsers();
    }, []);

    const handleToggleMultiUser = async (enabled: boolean) => {
        if (enabled) {
            const allUsers = await db.users.toArray();
            setUsers(allUsers);
            if (allUsers.length > 0) {
                handleInputChange('multiUserMode', true);
                return;
            }

            const generatedKey = generateRecoveryKey();
            const keyHash = await hashString(generatedKey);
            
            const defaultAdmin: User = {
                id: Date.now(),
                username: 'admin',
                passwordHash: await hashString('admin123'),
                fullName: 'Administrator',
                role: 'admin',
                permissions: normalizeUserPermissions({
                    id: -1,
                    username: 'admin',
                    passwordHash: '',
                    fullName: 'Administrator',
                    role: 'admin',
                    permissions: ADMIN_PERMISSIONS as any,
                    isDefaultAdmin: true,
                } as User),
                securityQuestion: 'Apa nama aplikasi ini?',
                securityAnswerHash: await hashString('esantri'),
                recoveryKeyHash: keyHash,
                isDefaultAdmin: true,
                permissionVersion: CURRENT_PERMISSION_VERSION,
                lastModified: Date.now(),
            };
            await db.users.add(defaultAdmin);
            setUsers([defaultAdmin]);
            
            setRecoveryKey(generatedKey); // Show key to user
            
            handleInputChange('multiUserMode', true);
            return;
        }

        showConfirmation(
            'Matikan Mode Multi-User?',
            'Semua staff akan kehilangan akses login. Aplikasi akan kembali ke mode Admin Tunggal (tanpa login).',
            () => {
                handleInputChange('multiUserMode', false);
            },
            { confirmText: 'Ya, Matikan', confirmColor: 'red' }
        );
    };

    const handleSaveUser = async (user: User) => {
        const normalizedUser: User = {
            ...user,
            permissions: normalizeUserPermissions(user),
            permissionVersion: CURRENT_PERMISSION_VERSION,
            lastModified: Date.now(),
        };

        if (user.id && users.some(u => u.id === user.id)) {
            await db.users.put(normalizedUser);
            setUsers(prev => prev.map(u => u.id === user.id ? normalizedUser : u));
            showToast('User berhasil diperbarui', 'success');
        } else {
            if (users.some(u => u.username === normalizedUser.username)) {
                showToast('Username sudah digunakan.', 'error');
                return;
            }
            await db.users.add(normalizedUser);
            setUsers(prev => [...prev, normalizedUser]);
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
        <SectionCard
            title="Keamanan & Pengguna"
            description="Aktifkan multi-user, kelola akun, serta amankan recovery key untuk pemulihan akses admin."
            contentClassName="space-y-6 p-6"
        >
            
            <div>
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
                    <span className="text-sm font-semibold text-slate-900">Aktifkan Mode Multi-User (Login Wajib)</span>
                </label>
                <p className="mt-2 ml-14 text-xs text-slate-500">
                    Jika diaktifkan, setiap pengguna wajib login dengan username dan password masing-masing.
                </p>
            </div>

            {/* Recovery Key Modal Display */}
            {recoveryKey && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 animate-fade-in-down">
                    <h3 className="text-red-800 font-bold flex items-center gap-2 mb-2">
                        <i className="bi bi-key-fill"></i> KUNCI PEMULIHAN DARURAT
                    </h3>
                    <p className="text-sm text-red-700 mb-3">
                        Simpan kode ini di tempat yang sangat aman (Tulis di kertas/Password Manager). Kode ini adalah <strong>satu-satunya cara</strong> untuk mereset password Admin jika Anda lupa password DAN jawaban keamanan.
                    </p>
                    <div className="select-all rounded border border-red-200 bg-white p-3 text-center font-mono text-lg font-bold tracking-wider text-gray-800">
                        {recoveryKey}
                    </div>
                    <div className="mt-3 text-center">
                        <button onClick={() => setRecoveryKey(null)} className="text-sm text-red-600 underline hover:text-red-800">Saya sudah menyimpannya, tutup.</button>
                    </div>
                </div>
            )}

            {localSettings.multiUserMode && (
                <>
                    {legacyUsers.length > 0 && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                            <div className="font-semibold">Audit Permission Legacy</div>
                            <div className="mt-1">
                                Ditemukan {legacyUsers.length} user dengan permission versi lama (target: v{CURRENT_PERMISSION_VERSION}).
                                Jalankan restore terbaru atau simpan ulang user agar otomatis termigrasi.
                            </div>
                        </div>
                    )}

                    {/* Recovery Key Management for Admin */}
                    {currentUser?.isDefaultAdmin && !recoveryKey && (
                        <div className="ml-14">
                            <button onClick={handleGenerateNewKey} className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline">
                                <i className="bi bi-arrow-clockwise"></i> Generate Ulang Kunci Darurat
                            </button>
                        </div>
                    )}

                    <div className="rounded-xl border border-app-border bg-app-subtle p-4">
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                            <h3 className="text-sm font-bold text-app-text">Daftar Pengguna</h3>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => setIsBulkTeacherModalOpen(true)}
                                    className="inline-flex items-center gap-1 rounded-lg border border-teal-600 bg-white px-3 py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-50"
                                >
                                    <i className="bi bi-people-fill"></i> Ambil dari Data Guru
                                </button>
                                <button 
                                    onClick={() => { setEditingUser(null); setIsUserModalOpen(true); }}
                                    className="inline-flex items-center gap-1 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700"
                                >
                                    <i className="bi bi-person-plus-fill"></i> Tambah Manual
                                </button>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-100 text-xs uppercase text-slate-600">
                                    <tr>
                                        <th className="px-3 py-2 rounded-tl-lg">Username</th>
                                        <th className="px-3 py-2">Nama Lengkap</th>
                                        <th className="px-3 py-2">Role</th>
                                        <th className="px-3 py-2 text-center rounded-tr-lg">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    {users.map(u => (
                                        <tr key={u.id} className="hover:bg-white/70">
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
        </SectionCard>
    );
};
