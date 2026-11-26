import React, { useEffect, useRef, useState } from 'react';
import { useAppContext } from '../../AppContext';
import {
    E2EE_CHANGED_EVENT,
    E2EE_MIN_PASSWORD_LENGTH,
    ensureDeviceVaultHydrated,
    needsDeviceUnlock,
    parseEmergencyKeyFileBundle,
    recoverWithRecoveryKey,
    unlockWithPassword,
} from '../../services/e2eeService';

export const E2eeUnlockBanner: React.FC = () => {
    const { settings, onUpdateSettings, showToast } = useAppContext();
    const [tick, setTick] = useState(0);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [mode, setMode] = useState<'unlock' | 'recover'>('unlock');
    const [password, setPassword] = useState('');
    const [recoveryKey, setRecoveryKey] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [importedBundle, setImportedBundle] = useState<typeof settings.e2eeConfig>(undefined);
    const [busy, setBusy] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        ensureDeviceVaultHydrated().catch(() => {});
        const handler = () => setTick((t) => t + 1);
        window.addEventListener(E2EE_CHANGED_EVENT, handler);
        return () => window.removeEventListener(E2EE_CHANGED_EVENT, handler);
    }, []);

    const isLocked = React.useMemo(() => {
        void tick;
        return needsDeviceUnlock(settings);
    }, [settings, tick]);

    const config = settings.e2eeConfig;
    if (!isLocked || !config?.enabled) return null;

    const handleUnlock = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        try {
            const { migratedConfig } = await unlockWithPassword(config, password);
            if (migratedConfig) {
                await onUpdateSettings({ ...settings, e2eeConfig: migratedConfig });
            }
            setPassword('');
            setIsModalOpen(false);
            showToast(
                migratedConfig
                    ? 'Perangkat terbuka & KDF diperkuat ke PBKDF2 600.000 iterasi.'
                    : 'Perangkat terbuka! Data E2EE cloud kini dapat disinkronkan.',
                'success'
            );
        } catch (err: any) {
            showToast(err?.message || 'Master Password E2EE salah.', 'error');
        } finally {
            setBusy(false);
        }
    };

    const handleRecover = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword.length < E2EE_MIN_PASSWORD_LENGTH) {
            showToast(`Password baru minimal ${E2EE_MIN_PASSWORD_LENGTH} karakter.`, 'error');
            return;
        }
        setBusy(true);
        try {
            const targetCfg = importedBundle || config;
            const updated = await recoverWithRecoveryKey(targetCfg, recoveryKey, newPassword);
            await onUpdateSettings({ ...settings, e2eeConfig: updated });
            setRecoveryKey('');
            setNewPassword('');
            setImportedBundle(undefined);
            setMode('unlock');
            setIsModalOpen(false);
            showToast('Master Password E2EE dipulihkan dan perangkat terbuka.', 'success');
        } catch (err: any) {
            showToast(err?.message || 'Recovery Key tidak valid.', 'error');
        } finally {
            setBusy(false);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            const { recoveryKey: parsedKey, bundledConfig } = parseEmergencyKeyFileBundle(String(reader.result || ''));
            if (bundledConfig) {
                setImportedBundle(bundledConfig);
            }
            if (parsedKey) {
                setRecoveryKey(parsedKey);
                showToast(
                    bundledConfig
                        ? `Recovery Key & Key Bundle (${bundledConfig.keyId}) terbaca dari file.`
                        : 'Recovery Key terbaca dari file.',
                    'success'
                );
            } else {
                showToast('File tidak berisi Recovery Key ESNTR yang valid.', 'error');
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    return (
        <>
            <div className="mb-4 rounded-2xl border border-amber-300 bg-gradient-to-r from-amber-50 via-amber-50 to-orange-50 px-4 py-3 shadow-xs no-print">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white">
                            <i className="bi bi-shield-lock-fill text-base"></i>
                        </div>
                        <div>
                            <div className="text-xs sm:text-sm font-bold text-amber-950">
                                Enkripsi E2EE Aktif — Perangkat Ini Masih Terkunci
                            </div>
                            <p className="text-xs text-amber-800 mt-0.5">
                                Masukkan Master Password E2EE sekali saja di perangkat ini agar Multi-Admin Sync, tarik Rapor Cloud, dan PSB terenkripsi dapat dibuka.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => setIsModalOpen(true)}
                        className="shrink-0 inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 px-4 py-2 text-xs font-bold text-white shadow-xs transition-colors"
                    >
                        <i className="bi bi-key-fill"></i>
                        Buka Kunci E2EE
                    </button>
                </div>
            </div>

            {isModalOpen && (
                <div
                    className="app-overlay fixed inset-0 z-[120] flex items-center justify-center p-4 no-print"
                    onClick={() => setIsModalOpen(false)}
                >
                    <div
                        className="app-modal w-full max-w-md rounded-panel overflow-hidden animate-fade-in-down"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between border-b border-app-border bg-slate-900 px-5 py-4 text-white">
                            <div className="flex items-center gap-2.5">
                                <i className="bi bi-shield-lock-fill text-teal-400 text-lg"></i>
                                <h3 className="text-base font-bold">
                                    {mode === 'unlock' ? 'Buka Kunci Perangkat E2EE' : 'Pulihkan dengan Recovery Key'}
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
                            >
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>

                        {mode === 'unlock' ? (
                            <form onSubmit={handleUnlock} className="p-5 space-y-4">
                                <p className="text-xs text-slate-600 leading-relaxed">
                                    Setelah dibuka, perangkat ini akan diingat (Remember Device) sehingga Anda tidak perlu mengetik ulang setiap hari.
                                </p>
                                {config.passwordHint && (
                                    <div className="rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-700">
                                        <strong>Hint Password:</strong> {config.passwordHint}
                                    </div>
                                )}
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                        Master Password E2EE
                                    </label>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Masukkan Master Password..."
                                        required
                                        autoFocus
                                        className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-teal-500 focus:outline-none"
                                    />
                                </div>
                                <div className="flex items-center justify-between pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setMode('recover')}
                                        className="text-xs font-semibold text-amber-700 hover:underline"
                                    >
                                        Lupa Password?
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={busy}
                                        className="rounded-xl bg-teal-600 hover:bg-teal-700 px-5 py-2.5 text-xs font-bold text-white"
                                    >
                                        {busy ? 'Memproses (PBKDF2 600rb)...' : 'Buka Kunci'}
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <form onSubmit={handleRecover} className="p-5 space-y-4">
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="text-xs font-semibold text-slate-700">
                                            Recovery Key
                                        </label>
                                        <div>
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                accept=".txt"
                                                onChange={handleFileUpload}
                                                className="hidden"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => fileInputRef.current?.click()}
                                                className="text-xs font-semibold text-teal-700 hover:underline"
                                            >
                                                Unggah File .txt
                                            </button>
                                        </div>
                                    </div>
                                    <input
                                        type="text"
                                        value={recoveryKey}
                                        onChange={(e) => setRecoveryKey(e.target.value)}
                                        placeholder="ESNTR-XXXX-XXXX-XXXX-XXXX-XXXX"
                                        required
                                        className="w-full rounded-xl border border-slate-300 px-3.5 py-2 font-mono text-sm uppercase"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        Master Password Baru
                                    </label>
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="Minimal 12 karakter kuat"
                                        required
                                        minLength={E2EE_MIN_PASSWORD_LENGTH}
                                        className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                                    />
                                </div>
                                <div className="flex items-center justify-between pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setMode('unlock')}
                                        className="text-xs font-semibold text-slate-600 hover:underline"
                                    >
                                        Kembali
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={busy}
                                        className="rounded-xl bg-teal-600 hover:bg-teal-700 px-5 py-2.5 text-xs font-bold text-white"
                                    >
                                        {busy ? 'Memulihkan...' : 'Reset & Buka Kunci'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </>
    );
};
