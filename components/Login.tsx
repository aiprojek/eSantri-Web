
import React, { useState } from 'react';
import { useAppContext } from '../AppContext';
import { db } from '../db';
import { hashSecret, verifySecret } from '../services/authService';
import { User } from '../types';
import { useFirebase } from '../contexts/FirebaseContext';
import { loadSyncService } from '../utils/lazyCloudServices';
import { isFirebaseClientConfigReady } from '../firebaseApp';

export const LoginScreen: React.FC = () => {
    const { login, showToast, showConfirmation, settings } = useAppContext();
    const { login: fbLogin, isFbLoading } = useFirebase();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    // Forgot Password State
    const [view, setView] = useState<'login' | 'forgot' | 'reset' | 'emergency' | 'setup_security'>('login');
    const [forgotUsername, setForgotUsername] = useState('');
    const [securityQuestion, setSecurityQuestion] = useState('');
    const [securityAnswer, setSecurityAnswer] = useState('');
    const [recoveryKeyInput, setRecoveryKeyInput] = useState('');
    const [targetUser, setTargetUser] = useState<User | null>(null);
    const [newPassword, setNewPassword] = useState('');
    // First-login mandatory security / password setup
    const [pendingLoginUser, setPendingLoginUser] = useState<User | null>(null);
    const [setupQuestion, setSetupQuestion] = useState('');
    const [setupAnswer, setSetupAnswer] = useState('');
    const [setupNewPassword, setSetupNewPassword] = useState('');
    const [setupConfirmPassword, setSetupConfirmPassword] = useState('');

    const handleGoogleLogin = async () => {
        setIsLoading(true);
        try {
            const result = await fbLogin();
            const email = result.user.email;
            
            // Match user by email in local database
            const user = await db.users.where('email').equals(email).filter(u => !u.deleted).first();
            if (user) {
                await db.users.update(user.id, { lastLogin: new Date().toISOString() });
                login(user);
                showToast(`Selamat datang, ${user.fullName || user.username}!`, 'success');
            } else {
                showToast('Email Google Anda tidak terdaftar di sistem eSantri ini. Hubungi Admin.', 'error');
            }
        } catch (error) {
            console.error("Google Login Error:", error);
            showToast('Gagal login dengan Google.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const user = await db.users.where('username').equals(username).filter(u => !u.deleted).first();
            if (!user) {
                showToast('Username atau password salah.', 'error');
                setIsLoading(false);
                return;
            }

            const pwCheck = await verifySecret(password, user.passwordHash);
            if (pwCheck.valid) {
                let effectiveUser = user;
                if (pwCheck.needsRehash) {
                    const upgradedHash = await hashSecret(password);
                    const nowTs = Date.now();
                    await db.users.update(user.id, { passwordHash: upgradedHash, lastModified: nowTs });
                    effectiveUser = { ...user, passwordHash: upgradedHash, lastModified: nowTs };
                }
                const needsPasswordChange = !!effectiveUser.mustChangePassword;
                const needsSecuritySetup = !!effectiveUser.mustSetupSecurity || !effectiveUser.securityQuestion?.trim() || !effectiveUser.securityAnswerHash;
                if (needsPasswordChange || needsSecuritySetup) {
                    setPendingLoginUser(effectiveUser);
                    setSetupQuestion(effectiveUser.securityQuestion || '');
                    setSetupAnswer('');
                    setSetupNewPassword('');
                    setSetupConfirmPassword('');
                    setView('setup_security');
                } else {
                    const lastLogin = new Date().toISOString();
                    await db.users.update(effectiveUser.id, { lastLogin });
                    login({ ...effectiveUser, lastLogin });
                }
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

    const handleUpdateFromCloud = () => {
        if (!settings.cloudSyncConfig || settings.cloudSyncConfig.provider === 'none') {
            showToast('Fitur Cloud belum aktif. Hubungi Admin untuk mengaktifkan.', 'error');
            return;
        }
        showConfirmation(
            'Perbarui Akun dari Cloud?',
            'Apakah Anda ingin memperbarui data akun (password) dari Cloud? Ini berguna jika Admin telah mereset password Anda.',
            async () => {
                setIsLoading(true);
                try {
                    const { updateAccountFromCloud } = await loadSyncService();
                    await updateAccountFromCloud(settings.cloudSyncConfig!);
                    showToast('Data akun berhasil diperbarui! Silakan login dengan password baru.', 'success');
                } catch (e) {
                    showToast(`Gagal update akun: ${(e as Error).message}`, 'error');
                } finally {
                    setIsLoading(false);
                }
            },
            { confirmText: 'Ya, Perbarui', confirmColor: 'blue' }
        );
    };

    const handleCheckUsername = async () => {
        if (!forgotUsername) return;
        setIsLoading(true);
        try {
            const user = await db.users.where('username').equals(forgotUsername).filter(u => !u.deleted).first();
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
            const normalizedAns = securityAnswer.toLowerCase().trim();
            const ansCheck = await verifySecret(normalizedAns, targetUser.securityAnswerHash);
            if (ansCheck.valid) {
                if (ansCheck.needsRehash) {
                    const upgradedAnswerHash = await hashSecret(normalizedAns);
                    const nowTs = Date.now();
                    await db.users.update(targetUser.id, { securityAnswerHash: upgradedAnswerHash, lastModified: nowTs });
                    setTargetUser({ ...targetUser, securityAnswerHash: upgradedAnswerHash, lastModified: nowTs });
                }
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

            const normalizedKey = recoveryKeyInput.toUpperCase().trim();
            const keyCheck = await verifySecret(normalizedKey, admin.recoveryKeyHash);
            if (keyCheck.valid) {
                let effectiveAdmin = admin;
                if (keyCheck.needsRehash) {
                    const upgradedKeyHash = await hashSecret(normalizedKey);
                    const nowTs = Date.now();
                    await db.users.update(admin.id, { recoveryKeyHash: upgradedKeyHash, lastModified: nowTs });
                    effectiveAdmin = { ...admin, recoveryKeyHash: upgradedKeyHash, lastModified: nowTs };
                }
                setTargetUser(effectiveAdmin);
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
            const newHash = await hashSecret(newPassword);
            await db.users.update(targetUser.id, {
                passwordHash: newHash,
                mustChangePassword: false,
                lastModified: Date.now(),
            });
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

    const handleCompleteFirstLoginSetup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!pendingLoginUser) return;

        const needsPasswordChange = !!pendingLoginUser.mustChangePassword;
        const needsSecuritySetup = !!pendingLoginUser.mustSetupSecurity || !pendingLoginUser.securityQuestion?.trim() || !pendingLoginUser.securityAnswerHash;

        if (needsPasswordChange) {
            if (setupNewPassword.length < 6) {
                showToast('Password baru minimal 6 karakter.', 'error');
                return;
            }
            if (setupNewPassword !== setupConfirmPassword) {
                showToast('Konfirmasi password baru tidak cocok.', 'error');
                return;
            }
            const sameAsTemp = await verifySecret(setupNewPassword, pendingLoginUser.passwordHash);
            if (sameAsTemp.valid) {
                showToast('Password baru tidak boleh sama dengan password sementara.', 'error');
                return;
            }
        }

        if (needsSecuritySetup) {
            if (!setupQuestion.trim() || !setupAnswer.trim()) {
                showToast('Pertanyaan dan jawaban keamanan wajib diisi.', 'error');
                return;
            }
        }

        setIsLoading(true);
        try {
            const updates: Partial<User> = {
                lastLogin: new Date().toISOString(),
                lastModified: Date.now(),
            };
            if (needsPasswordChange) {
                updates.passwordHash = await hashSecret(setupNewPassword);
                updates.mustChangePassword = false;
            }
            if (needsSecuritySetup) {
                updates.securityQuestion = setupQuestion.trim();
                updates.securityAnswerHash = await hashSecret(setupAnswer.toLowerCase().trim());
                updates.mustSetupSecurity = false;
            }

            await db.users.update(pendingLoginUser.id, updates);
            const updatedUser: User = { ...pendingLoginUser, ...updates };
            setPendingLoginUser(null);
            setPassword('');
            setView('login');
            login(updatedUser);
            showToast(`Selamat datang, ${updatedUser.fullName || updatedUser.username}!`, 'success');
        } catch (e) {
            showToast('Gagal menyimpan pengaturan keamanan awal.', 'error');
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

                        {settings.cloudSyncConfig?.provider === 'firebase' && isFirebaseClientConfigReady && (
                            <div className="mt-4">
                                <div className="relative flex items-center justify-center mb-4">
                                    <div className="flex-grow border-t border-gray-300"></div>
                                    <span className="flex-shrink mx-4 text-gray-400 text-xs uppercase">Atau</span>
                                    <div className="flex-grow border-t border-gray-300"></div>
                                </div>
                                <button 
                                    onClick={handleGoogleLogin}
                                    disabled={isLoading || isFbLoading}
                                    className="w-full bg-white border border-gray-300 text-gray-700 font-medium py-2.5 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 shadow-sm"
                                >
                                    <i className="bi bi-google text-red-500"></i>
                                    {isFbLoading ? 'Menyiapkan Google Login...' : 'Masuk dengan Google'}
                                </button>
                            </div>
                        )}
                        {settings.cloudSyncConfig?.provider === 'firebase' && !isFirebaseClientConfigReady && (
                            <div className="mt-4 p-3 rounded-lg border border-amber-200 bg-amber-50 text-xs text-amber-800">
                                Google Login belum aktif karena konfigurasi Firebase belum lengkap. Lengkapi di Pengaturan Cloud terlebih dahulu.
                            </div>
                        )}

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
                    
                    {settings.cloudSyncConfig?.provider === 'firebase' && (
                        <div className="mb-4 p-3 bg-teal-50 border border-teal-200 rounded-lg text-xs text-teal-800">
                            <i className="bi bi-info-circle-fill mr-1"></i>
                            <strong>Info Firebase:</strong> Jika Anda menggunakan Login Google, silakan reset password melalui akun Google Anda. Tombol di bawah hanya untuk akun lokal.
                        </div>
                    )}

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

    if (view === 'setup_security' && pendingLoginUser) {
        const needsPasswordChange = !!pendingLoginUser.mustChangePassword;
        const needsSecuritySetup = !!pendingLoginUser.mustSetupSecurity || !pendingLoginUser.securityQuestion?.trim() || !pendingLoginUser.securityAnswerHash;
        const commonQuestions = [
            "Apa nama hewan peliharaan pertama Anda?",
            "Di kota mana ibu Anda lahir?",
            "Apa makanan favorit Anda saat kecil?",
            "Siapa nama guru favorit Anda di SD?",
            "Apa judul film favorit Anda?",
            "Apa nama jalan tempat Anda tinggal saat kecil?"
        ];
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-8 border-t-4 border-teal-600">
                    <h2 className="text-xl font-bold text-gray-800 mb-2">Lengkapi Keamanan Akun</h2>
                    <p className="text-sm text-gray-600 mb-4">
                        Login awal terdeteksi untuk <strong>{pendingLoginUser.username}</strong>. Lengkapi pengaturan berikut sebelum masuk:
                    </p>
                    <form onSubmit={handleCompleteFirstLoginSetup} className="space-y-4">
                        {needsPasswordChange && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Password Baru (Minimal 6 karakter)</label>
                                    <input
                                        type="password"
                                        value={setupNewPassword}
                                        onChange={e => setSetupNewPassword(e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg p-2.5 text-sm"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Konfirmasi Password Baru</label>
                                    <input
                                        type="password"
                                        value={setupConfirmPassword}
                                        onChange={e => setSetupConfirmPassword(e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg p-2.5 text-sm"
                                        required
                                    />
                                </div>
                            </>
                        )}
                        {needsSecuritySetup && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Pertanyaan Keamanan</label>
                                    <select
                                        value={commonQuestions.includes(setupQuestion) ? setupQuestion : 'custom'}
                                        onChange={e => {
                                            if (e.target.value !== 'custom') setSetupQuestion(e.target.value);
                                            else setSetupQuestion('');
                                        }}
                                        className="w-full border border-gray-300 rounded-lg p-2.5 text-sm mb-2 bg-white"
                                    >
                                        <option value="custom">-- Tulis Pertanyaan Sendiri --</option>
                                        {commonQuestions.map(q => <option key={q} value={q}>{q}</option>)}
                                    </select>
                                    <input
                                        type="text"
                                        value={setupQuestion}
                                        onChange={e => setSetupQuestion(e.target.value)}
                                        placeholder="Ketik pertanyaan keamanan pribadi Anda..."
                                        className="w-full border border-gray-300 rounded-lg p-2.5 text-sm"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Jawaban Keamanan</label>
                                    <input
                                        type="text"
                                        value={setupAnswer}
                                        onChange={e => setSetupAnswer(e.target.value)}
                                        placeholder="Jawaban Anda (tidak case-sensitive)"
                                        className="w-full border border-gray-300 rounded-lg p-2.5 text-sm"
                                        required
                                    />
                                </div>
                            </>
                        )}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-teal-600 text-white font-bold py-2.5 rounded-lg hover:bg-teal-700 transition-colors disabled:bg-teal-400"
                        >
                            {isLoading ? 'Menyimpan...' : 'Simpan & Masuk'}
                        </button>
                    </form>
                    <button
                        type="button"
                        onClick={() => { setPendingLoginUser(null); setView('login'); }}
                        className="mt-4 w-full text-gray-500 text-sm hover:text-gray-700"
                    >
                        Batal, Kembali ke Login
                    </button>
                </div>
            </div>
        );
    }

    return null;
};
