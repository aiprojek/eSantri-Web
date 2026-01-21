
import React, { useState } from 'react';
import { useAppContext } from '../AppContext';
import { db } from '../db';
import { hashString } from '../services/authService';
import { updateAccountFromCloud } from '../services/syncService';
import { User } from '../types';

export const LoginScreen: React.FC = () => {
    const { login, showToast, settings } = useAppContext();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    // Forgot Password State
    const [view, setView] = useState<'login' | 'forgot' | 'reset' | 'emergency'>('login');
    const [forgotUsername, setForgotUsername] = useState('');
    const [securityQuestion, setSecurityQuestion] = useState('');
    const [securityAnswer, setSecurityAnswer] = useState('');
    const [recoveryKeyInput, setRecoveryKeyInput] = useState('');
    const [targetUser, setTargetUser] = useState<User | null>(null);
    const [newPassword, setNewPassword] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const user = await db.users.where('username').equals(username).first();
            if (!user) {
                showToast('Username atau password salah.', 'error');
                setIsLoading(false);
                return;
            }

            const hashedInput = await hashString(password);
            if (user.passwordHash === hashedInput) {
                await db.users.update(user.id, { lastLogin: new Date().toISOString() });
                login(user);
            } else {
                showToast('Username atau password salah.', 'error');
            }
        } catch (error) {
            console.error(error);
            showToast('Terjadi kesalahan sistem.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdateFromCloud = async () => {
        if (!settings.cloudSyncConfig || settings.cloudSyncConfig.provider === 'none') {
            showToast('Fitur Cloud belum aktif. Hubungi Admin untuk mengaktifkan.', 'error');
            return;
        }
        if (!confirm('Apakah Anda ingin memperbarui data akun (password) dari Cloud? Ini berguna jika Admin telah mereset password Anda.')) return;
        
        setIsLoading(true);
        try {
            await updateAccountFromCloud(settings.cloudSyncConfig);
            showToast('Data akun berhasil diperbarui! Silakan login dengan password baru.', 'success');
        } catch (e) {
            showToast(`Gagal update akun: ${(e as Error).message}`, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCheckUsername = async () => {
        if (!forgotUsername) return;
        setIsLoading(true);
        try {
            const user = await db.users.where('username').equals(forgotUsername).first();
            if (user && user.securityQuestion) {
                setTargetUser(user);
                setSecurityQuestion(user.securityQuestion);
            } else if (user) {
                showToast('Akun ini belum mengatur pertanyaan keamanan. Hubungi Admin.', 'error');
            } else {
                showToast('Username tidak ditemukan.', 'error');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyAnswer = async () => {
        if (!targetUser || !securityAnswer) return;
        setIsLoading(true);
        try {
            const hashedAnswer = await hashString(securityAnswer.toLowerCase().trim());
            if (targetUser.securityAnswerHash === hashedAnswer) {
                setView('reset');
            } else {
                showToast('Jawaban salah.', 'error');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyEmergencyKey = async () => {
        if (!recoveryKeyInput) return;
        setIsLoading(true);
        try {
            // Find Default Admin
            const admin = await db.users.filter(u => !!u.isDefaultAdmin).first();
            if (!admin) {
                showToast('Akun Admin Utama tidak ditemukan.', 'error');
                return;
            }
            if (!admin.recoveryKeyHash) {
                showToast('Kunci Darurat belum diatur pada sistem ini.', 'error');
                return;
            }

            const hashedInput = await hashString(recoveryKeyInput.toUpperCase().trim());
            if (admin.recoveryKeyHash === hashedInput) {
                setTargetUser(admin);
                setView('reset');
                showToast('Kunci Darurat valid! Silakan reset password Admin.', 'success');
            } else {
                showToast('Kunci Darurat TIDAK VALID.', 'error');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetPassword = async () => {
        if (!targetUser || !newPassword) return;
        setIsLoading(true);
        try {
            const newHash = await hashString(newPassword);
            await db.users.update(targetUser.id, { passwordHash: newHash });
            showToast('Password berhasil diubah. Silakan login.', 'success');
            setView('login');
            setTargetUser(null);
            setForgotUsername('');
            setPassword('');
            setUsername('');
            setRecoveryKeyInput('');
        } catch (e) {
            showToast('Gagal mereset password.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    if (view === 'login') {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden">
                    <div className="bg-teal-700 p-6 text-center">
                        <h1 className="text-2xl font-bold text-white mb-1">eSantri Web</h1>
                        <p className="text-teal-100 text-sm">Silakan login untuk melanjutkan</p>
                    </div>
                    <div className="p-8">
                        <form onSubmit={handleLogin} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                                <input 
                                    type="text" 
                                    value={username} 
                                    onChange={e => setUsername(e.target.value)} 
                                    className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-teal-500 focus:border-teal-500" 
                                    required 
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                                <input 
                                    type="password" 
                                    value={password} 
                                    onChange={e => setPassword(e.target.value)} 
                                    className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-teal-500 focus:border-teal-500" 
                                    required 
                                />
                            </div>
                            <button 
                                type="submit" 
                                disabled={isLoading}
                                className="w-full bg-teal-600 text-white font-bold py-3 rounded-lg hover:bg-teal-700 transition-colors disabled:bg-teal-400 flex justify-center items-center"
                            >
                                {isLoading ? <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span> : 'Masuk'}
                            </button>
                        </form>
                        <div className="mt-6 flex flex-col gap-2 text-center">
                            <button onClick={() => setView('forgot')} className="text-sm text-teal-600 hover:underline">Lupa Password?</button>
                            <button onClick={() => setView('emergency')} className="text-xs text-red-500 hover:text-red-700 font-medium mt-1">Gunakan Kunci Darurat (Admin)</button>
                            <div className="text-xs text-gray-400 mt-2">atau</div>
                            <button onClick={handleUpdateFromCloud} disabled={isLoading} className="text-sm text-blue-600 hover:underline flex items-center justify-center gap-1">
                                <i className="bi bi-cloud-arrow-down-fill"></i> Update Data Akun dari Cloud
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (view === 'forgot') {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-8">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">Pemulihan Akun</h2>
                    {!targetUser ? (
                        <div className="space-y-4">
                            <p className="text-sm text-gray-600">Masukkan username Anda untuk melanjutkan.</p>
                            <input 
                                type="text" 
                                placeholder="Username" 
                                value={forgotUsername} 
                                onChange={e => setForgotUsername(e.target.value)} 
                                className="w-full border border-gray-300 rounded-lg p-2.5"
                            />
                            <button onClick={handleCheckUsername} disabled={isLoading} className="w-full bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700">Lanjut</button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="p-3 bg-blue-50 border border-blue-200 rounded text-blue-800 text-sm">
                                <strong>Pertanyaan Keamanan:</strong><br/>
                                {securityQuestion}
                            </div>
                            <input 
                                type="text" 
                                placeholder="Jawaban Anda" 
                                value={securityAnswer} 
                                onChange={e => setSecurityAnswer(e.target.value)} 
                                className="w-full border border-gray-300 rounded-lg p-2.5"
                            />
                            <button onClick={handleVerifyAnswer} disabled={isLoading} className="w-full bg-green-600 text-white py-2.5 rounded-lg hover:bg-green-700">Verifikasi Jawaban</button>
                            <p className="text-xs text-center text-gray-500 mt-2">Lupa jawaban? Hubungi Admin Inti untuk reset password.</p>
                        </div>
                    )}
                    <button onClick={() => { setView('login'); setTargetUser(null); setForgotUsername(''); }} className="mt-4 w-full text-gray-500 text-sm hover:text-gray-700">Kembali ke Login</button>
                </div>
            </div>
        );
    }

    if (view === 'emergency') {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-8 border-t-4 border-red-600">
                    <h2 className="text-xl font-bold text-red-700 mb-2">Login Darurat</h2>
                    <p className="text-sm text-gray-600 mb-4">
                        Masukkan <strong>Kunci Pemulihan (Recovery Key)</strong> yang dibuat saat aktivasi sistem. Ini akan mereset password Admin Utama.
                    </p>
                    <div className="space-y-4">
                        <input 
                            type="text" 
                            placeholder="ESANTRI-XXXX-XXXX-XXXX" 
                            value={recoveryKeyInput} 
                            onChange={e => setRecoveryKeyInput(e.target.value)} 
                            className="w-full border border-gray-300 rounded-lg p-2.5 font-mono text-center uppercase"
                        />
                        <button onClick={handleVerifyEmergencyKey} disabled={isLoading} className="w-full bg-red-600 text-white py-2.5 rounded-lg hover:bg-red-700 font-bold">
                            {isLoading ? 'Memeriksa...' : 'Verifikasi Kunci'}
                        </button>
                    </div>
                    <button onClick={() => setView('login')} className="mt-4 w-full text-gray-500 text-sm hover:text-gray-700">Batal</button>
                </div>
            </div>
        );
    }

    if (view === 'reset') {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-8">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">Buat Password Baru</h2>
                    <p className="text-sm text-gray-500 mb-4">Untuk akun: <strong>{targetUser?.username}</strong></p>
                    <div className="space-y-4">
                        <input 
                            type="password" 
                            placeholder="Password Baru" 
                            value={newPassword} 
                            onChange={e => setNewPassword(e.target.value)} 
                            className="w-full border border-gray-300 rounded-lg p-2.5"
                        />
                        <button onClick={handleResetPassword} disabled={isLoading} className="w-full bg-teal-600 text-white py-2.5 rounded-lg hover:bg-teal-700">Simpan Password</button>
                    </div>
                </div>
            </div>
        );
    }

    return null;
};
