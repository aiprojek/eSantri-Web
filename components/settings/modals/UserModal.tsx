
import React, { useState, useEffect } from 'react';
import { User, UserPermissions, AccessLevel } from '../../../types';
import { useAppContext } from '../../../AppContext';
import { hashString, DEFAULT_STAFF_PERMISSIONS, ADMIN_PERMISSIONS } from '../../../services/authService';

interface UserModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (user: User) => Promise<void>;
    userData: User | null;
}

export const UserModal: React.FC<UserModalProps> = ({ isOpen, onClose, onSave, userData }) => {
    const { showAlert } = useAppContext();
    const [username, setUsername] = useState('');
    const [fullName, setFullName] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<'admin' | 'staff'>('staff');
    const [permissions, setPermissions] = useState<UserPermissions>(DEFAULT_STAFF_PERMISSIONS as UserPermissions);
    
    // Security Recovery
    const [securityQuestion, setSecurityQuestion] = useState('');
    const [securityAnswer, setSecurityAnswer] = useState('');

    useEffect(() => {
        if (isOpen) {
            if (userData) {
                setUsername(userData.username);
                setFullName(userData.fullName);
                setRole(userData.role);
                setPermissions(userData.permissions);
                setPassword(''); // Reset password field for security
                setSecurityQuestion(userData.securityQuestion || '');
                setSecurityAnswer(''); // Reset answer field
            } else {
                setUsername('');
                setFullName('');
                setPassword('');
                setRole('staff');
                setPermissions(DEFAULT_STAFF_PERMISSIONS as UserPermissions);
                setSecurityQuestion('');
                setSecurityAnswer('');
            }
        }
    }, [isOpen, userData]);

    if (!isOpen) return null;

    const handlePermissionChange = (module: keyof UserPermissions, level: AccessLevel) => {
        setPermissions(prev => ({ ...prev, [module]: level }));
    };

    const handleSyncAdminChange = (checked: boolean) => {
        setPermissions(prev => ({ ...prev, syncAdmin: checked }));
    };

    const handleSave = async () => {
        if (!username.trim() || !fullName.trim()) {
            showAlert('Input Tidak Lengkap', 'Username dan Nama Lengkap wajib diisi.');
            return;
        }

        // Validation for New User
        if (!userData) {
            if (!password) {
                showAlert('Input Tidak Lengkap', 'Password wajib diisi untuk user baru.');
                return;
            }
            if (!securityQuestion.trim() || !securityAnswer.trim()) {
                showAlert('Input Tidak Lengkap', 'Pertanyaan dan Jawaban Keamanan wajib diisi untuk fitur lupa password.');
                return;
            }
        }

        // Hashing Logic
        let passwordHash = userData?.passwordHash || '';
        if (password) {
            passwordHash = await hashString(password);
        }

        let securityAnswerHash = userData?.securityAnswerHash || '';
        if (securityAnswer) {
            // Hash answer in lowercase for case-insensitive comparison later
            securityAnswerHash = await hashString(securityAnswer.toLowerCase().trim());
        }

        const newUser: User = {
            id: userData?.id || Date.now(),
            username: username.trim(),
            fullName: fullName.trim(),
            role,
            permissions,
            passwordHash,
            securityQuestion: securityQuestion.trim(),
            securityAnswerHash,
            isDefaultAdmin: userData?.isDefaultAdmin
        };

        await onSave(newUser);
    };

    const modules = [
        { key: 'santri', label: 'Data Santri' },
        { key: 'psb', label: 'PSB Online' },
        { key: 'bukutamu', label: 'Buku Tamu (Security)' }, // NEW
        { key: 'akademik', label: 'Akademik & Rapor' },
        { key: 'absensi', label: 'Absensi' },
        { key: 'tahfizh', label: 'Tahfizh Al-Qur\'an' },
        { key: 'kesehatan', label: 'Kesehatan (Poskestren)' },
        { key: 'bk', label: 'Bimbingan Konseling' },
        { key: 'perpustakaan', label: 'Perpustakaan' },
        { key: 'sarpras', label: 'Sarana Prasarana (Aset)' },
        { key: 'kalender', label: 'Kalender Akademik' },
        { key: 'keuangan', label: 'Keuangan & SPP' },
        { key: 'bukukas', label: 'Buku Kas Umum' },
        { key: 'keasramaan', label: 'Keasramaan' },
        { key: 'surat', label: 'Surat Menyurat' },
        { key: 'laporan', label: 'Laporan & Cetak' },
        { key: 'datamaster', label: 'Data Master (Struktur)' },
        { key: 'auditlog', label: 'Log Aktivitas' },
        { key: 'pengaturan', label: 'Pengaturan Sistem' },
    ];

    const commonQuestions = [
        "Apa nama hewan peliharaan pertama Anda?",
        "Di kota mana ibu Anda lahir?",
        "Apa makanan favorit Anda saat kecil?",
        "Siapa nama guru favorit Anda di SD?",
        "Apa judul film favorit Anda?",
        "Apa nama jalan tempat Anda tinggal saat kecil?"
    ];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[70] flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="p-5 border-b"><h3 className="text-lg font-semibold text-gray-800">{userData ? 'Edit Pengguna' : 'Tambah Pengguna Baru'}</h3></div>
                
                <div className="p-6 overflow-y-auto flex-grow space-y-6">
                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block mb-1 text-sm font-medium text-gray-700">Nama Lengkap</label>
                            <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm" placeholder="cth: Ahmad Staff" />
                        </div>
                        <div>
                            <label className="block mb-1 text-sm font-medium text-gray-700">Username</label>
                            <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm" placeholder="cth: staff_tu" disabled={!!userData} />
                        </div>
                        <div>
                            <label className="block mb-1 text-sm font-medium text-gray-700">Role / Peran</label>
                            <select value={role} onChange={e => setRole(e.target.value as 'admin' | 'staff')} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm" disabled={userData?.isDefaultAdmin}>
                                <option value="staff">Staff Biasa</option>
                                <option value="admin">Administrator</option>
                            </select>
                        </div>
                    </div>

                    {/* Security Section */}
                    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                        <h4 className="font-semibold text-yellow-800 mb-3 text-sm flex items-center gap-2">
                            <i className="bi bi-shield-lock-fill"></i> Keamanan & Pemulihan
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div>
                                <label className="block mb-1 text-sm font-medium text-gray-700">{userData ? 'Ubah Password (Opsional)' : 'Password'}</label>
                                <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-sm" placeholder={userData ? 'Isi jika ingin mengganti' : '***'} />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block mb-1 text-sm font-medium text-gray-700">Pertanyaan Keamanan (Untuk Reset Password)</label>
                                <div className="flex flex-col gap-2">
                                    <select 
                                        onChange={(e) => setSecurityQuestion(e.target.value)} 
                                        value={commonQuestions.includes(securityQuestion) ? securityQuestion : 'custom'}
                                        className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-sm"
                                    >
                                        <option value="custom">-- Tulis Pertanyaan Sendiri --</option>
                                        {commonQuestions.map(q => <option key={q} value={q}>{q}</option>)}
                                    </select>
                                    <input 
                                        type="text" 
                                        value={securityQuestion} 
                                        onChange={e => setSecurityQuestion(e.target.value)} 
                                        className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-sm" 
                                        placeholder="Ketik pertanyaan keamanan Anda di sini..."
                                    />
                                </div>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block mb-1 text-sm font-medium text-gray-700">{userData ? 'Ubah Jawaban Keamanan (Opsional)' : 'Jawaban Keamanan'}</label>
                                <input 
                                    type="text" 
                                    value={securityAnswer} 
                                    onChange={e => setSecurityAnswer(e.target.value)} 
                                    className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-sm" 
                                    placeholder="Jawaban Anda (tidak case-sensitive)" 
                                />
                                <p className="text-xs text-gray-500 mt-1">Jawaban ini digunakan jika user lupa password.</p>
                            </div>
                        </div>
                    </div>

                    {/* Permissions Table (Only for Staff) */}
                    {role === 'staff' && (
                        <div className="border rounded-lg overflow-hidden">
                            <div className="bg-gray-100 px-4 py-2 border-b flex justify-between items-center">
                                <span className="font-semibold text-sm text-gray-700">Hak Akses Modul</span>
                            </div>
                            
                            {/* Delegate Sync Admin */}
                            <div className="p-3 bg-purple-50 border-b flex items-center gap-3">
                                <input 
                                    type="checkbox" 
                                    id="syncAdminCheck"
                                    checked={permissions.syncAdmin || false} 
                                    onChange={(e) => handleSyncAdminChange(e.target.checked)}
                                    className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                                />
                                <div>
                                    <label htmlFor="syncAdminCheck" className="text-sm font-bold text-purple-900 block cursor-pointer">Izinkan Kelola Sinkronisasi (Wakil Admin)</label>
                                    <p className="text-xs text-purple-700">User ini dapat menggabungkan data (Merge) dan mempublikasikan Master Data jika Admin utama berhalangan.</p>
                                </div>
                            </div>

                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="px-4 py-2 w-1/3">Nama Modul</th>
                                        <th className="px-4 py-2 text-center">Akses</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {modules.map((mod) => (
                                        <tr key={mod.key}>
                                            <td className="px-4 py-2 font-medium text-gray-700">{mod.label}</td>
                                            <td className="px-4 py-2">
                                                <div className="flex justify-center gap-2">
                                                    <label className="flex items-center gap-1 cursor-pointer">
                                                        <input 
                                                            type="radio" 
                                                            name={`perm_${mod.key}`} 
                                                            checked={permissions[mod.key as keyof UserPermissions] === 'none'}
                                                            onChange={() => handlePermissionChange(mod.key as keyof UserPermissions, 'none')}
                                                            className="text-red-600 focus:ring-red-500"
                                                        />
                                                        <span className="text-xs text-gray-600">Blokir</span>
                                                    </label>
                                                    <label className="flex items-center gap-1 cursor-pointer">
                                                        <input 
                                                            type="radio" 
                                                            name={`perm_${mod.key}`} 
                                                            checked={permissions[mod.key as keyof UserPermissions] === 'read'}
                                                            onChange={() => handlePermissionChange(mod.key as keyof UserPermissions, 'read')}
                                                            className="text-yellow-600 focus:ring-yellow-500"
                                                        />
                                                        <span className="text-xs text-gray-600">Lihat</span>
                                                    </label>
                                                    <label className="flex items-center gap-1 cursor-pointer">
                                                        <input 
                                                            type="radio" 
                                                            name={`perm_${mod.key}`} 
                                                            checked={permissions[mod.key as keyof UserPermissions] === 'write'}
                                                            onChange={() => handlePermissionChange(mod.key as keyof UserPermissions, 'write')}
                                                            className="text-green-600 focus:ring-green-500"
                                                        />
                                                        <span className="text-xs text-gray-600">Edit</span>
                                                    </label>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {role === 'admin' && (
                        <div className="p-3 bg-blue-50 text-blue-800 rounded text-sm">
                            <i className="bi bi-info-circle-fill mr-2"></i> User dengan role <strong>Administrator</strong> memiliki akses penuh (Read & Write) ke semua modul secara otomatis.
                        </div>
                    )}
                </div>

                <div className="p-4 border-t flex justify-end gap-2 bg-gray-50">
                    <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg text-sm">Batal</button>
                    <button onClick={handleSave} className="px-4 py-2 bg-teal-600 text-white hover:bg-teal-700 rounded-lg text-sm font-medium">Simpan User</button>
                </div>
            </div>
        </div>
    );
};
