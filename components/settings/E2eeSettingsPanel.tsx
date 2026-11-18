import React, { useEffect, useRef, useState } from 'react';
import { E2eeConfig, E2eeModuleToggles, PondokSettings } from '../../types';
import { db } from '../../db';
import { useAppContext } from '../../AppContext';
import {
    buildEmergencyKeyFileText,
    changeMasterPassword,
    DEFAULT_E2EE_MODULES,
    E2EE_CHANGED_EVENT,
    type E2eeDeviceVaultMode,
    getDeviceVaultMode,
    getVaultEntryByKeyId,
    isDeviceUnlockedForConfig,
    isWebCryptoAvailable,
    lockDeviceVault,
    parseEmergencyKeyFileBundle,
    recoverWithRecoveryKey,
    regenerateRecoveryKey,
    setDeviceVaultMode,
    setupE2eeConfig,
    unlockWithPassword,
} from '../../services/e2eeService';
import { syncPortalData } from '../../services/portalGasService';

const getPasswordStrength = (pw: string): { label: string; score: number; color: string } => {
    if (!pw) return { label: '', score: 0, color: 'bg-slate-200' };
    let score = 0;
    if (pw.length >= 8) score++;
    if (pw.length >= 12) score++;
    if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
    if (/\d/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    if (score <= 2 || pw.length < 8) return { label: 'Lemah (min. 8 karakter)', score: 1, color: 'bg-rose-500' };
    if (score === 3) return { label: 'Sedang (disarankan 12+ karakter)', score: 2, color: 'bg-amber-500' };
    return { label: 'Kuat', score: 3, color: 'bg-emerald-500' };
};

interface E2eeSettingsPanelProps {
    localSettings: PondokSettings;
    handleInputChange: <K extends keyof PondokSettings>(key: K, value: PondokSettings[K]) => void;
}

const MODULE_META: Array<{
    key: keyof E2eeModuleToggles;
    title: string;
    subtitle: string;
    icon: string;
}> = [
    {
        key: 'sync',
        title: 'Multi-Admin Cloud Sync',
        subtitle: 'Enkripsi penuh database pada Dropbox, WebDAV, dan Firebase Realtime Sync.',
        icon: 'bi-arrow-repeat',
    },
    {
        key: 'rapor',
        title: 'Rapor Digital & Cloud Staging',
        subtitle: 'Enkripsi nilai & identitas pada Form Nilai Guru HTML, Push Leger, dan Pull GAS/D1/R2/Supabase.',
        icon: 'bi-journal-check',
    },
    {
        key: 'psb',
        title: 'PSB Online (Khusus Biodata Teks)',
        subtitle: 'Enkripsi data teks & biodata pendaftar. Lampiran file (Foto/KK/Ijazah) tetap diunggah normal agar dapat dipratinjau.',
        icon: 'bi-person-vcard',
    },
    {
        key: 'portal',
        title: 'Portal Wali Santri (Zero-Knowledge)',
        subtitle: 'Data santri dienkripsi per individu memakai kombinasi NIS + Tanggal Lahir. Wali tetap login seperti biasa.',
        icon: 'bi-shield-check',
    },
];

export const E2eeSettingsPanel: React.FC<E2eeSettingsPanelProps> = ({
    localSettings,
    handleInputChange,
}) => {
    const { onUpdateSettings, showToast, showConfirmation } = useAppContext();
    const config = localSettings.e2eeConfig;
    const cryptoSupported = isWebCryptoAvailable();

    const [vaultTick, setVaultTick] = useState(0);
    const [vaultMode, setVaultModeState] = useState<E2eeDeviceVaultMode>(() => getDeviceVaultMode());
    const [busy, setBusy] = useState(false);

    // Setup state
    const [setupPassword, setSetupPassword] = useState('');
    const [setupConfirm, setSetupConfirm] = useState('');
    const [setupHint, setSetupHint] = useState('');
    const [setupModules, setSetupModules] = useState<E2eeModuleToggles>(DEFAULT_E2EE_MODULES);

    // Unlock / Recovery state
    const [unlockPassword, setUnlockPassword] = useState('');
    const [showRecoveryForm, setShowRecoveryForm] = useState(false);
    const [recoveryInput, setRecoveryInput] = useState('');
    const [recoveryNewPw, setRecoveryNewPw] = useState('');
    const [recoveryNewPwConfirm, setRecoveryNewPwConfirm] = useState('');
    const [recoveryHint, setRecoveryHint] = useState('');
    const [importedBundleConfig, setImportedBundleConfig] = useState<E2eeConfig | null>(null);
    const [showRestoreFromFileCase1, setShowRestoreFromFileCase1] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const restoreFileCase1Ref = useRef<HTMLInputElement>(null);

    // Change Password state
    const [showChangePw, setShowChangePw] = useState(false);
    const [oldPw, setOldPw] = useState('');
    const [newPw, setNewPw] = useState('');
    const [newPwConfirm, setNewPwConfirm] = useState('');
    const [newHint, setNewHint] = useState('');

    // Newly generated recovery key modal/banner
    const [displayedRecoveryKey, setDisplayedRecoveryKey] = useState<string | null>(null);
    const [hasSavedRecoveryKey, setHasSavedRecoveryKey] = useState(false);

    // Portal re-sync prompt after E2EE state/module changes
    const [portalNeedsResync, setPortalNeedsResync] = useState(false);
    const [syncingPortalNow, setSyncingPortalNow] = useState(false);

    useEffect(() => {
        const handler = () => {
            setVaultTick((v) => v + 1);
            setVaultModeState(getDeviceVaultMode());
        };
        window.addEventListener(E2EE_CHANGED_EVENT, handler);
        return () => window.removeEventListener(E2EE_CHANGED_EVENT, handler);
    }, []);

    const handleChangeVaultMode = (nextMode: E2eeDeviceVaultMode) => {
        setDeviceVaultMode(nextMode);
        setVaultModeState(nextMode);
        showToast(
            nextMode === 'session'
                ? 'Mode Komputer Bersama aktif: kunci E2EE otomatis dihapus saat tab/browser ditutup.'
                : 'Mode Remember Device aktif: kunci E2EE tetap tersimpan di perangkat ini.',
            'info'
        );
    };

    const isUnlocked = React.useMemo(() => {
        void vaultTick;
        return isDeviceUnlockedForConfig(config);
    }, [config, vaultTick]);

    const vaultEntry = React.useMemo(() => {
        void vaultTick;
        return config?.enabled ? getVaultEntryByKeyId(config.keyId) : null;
    }, [config, vaultTick]);

    const persistE2eeConfig = async (nextConfig: E2eeConfig | undefined) => {
        handleInputChange('e2eeConfig', nextConfig);
        await onUpdateSettings({
            ...localSettings,
            e2eeConfig: nextConfig,
        });
    };

    const handleDownloadEmergencyFile = (keyToDownload: string, cfg: E2eeConfig) => {
        const text = buildEmergencyKeyFileText(localSettings.namaPonpes || 'eSantri Web', cfg, keyToDownload);
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `kunci-darurat-e2ee-${cfg.keyId}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setHasSavedRecoveryKey(true);
        showToast('File Kunci Darurat (.txt) berhasil diunduh.', 'success');
    };

    const handleCopyRecoveryKey = async (keyText: string) => {
        try {
            await navigator.clipboard.writeText(keyText);
            setHasSavedRecoveryKey(true);
            showToast('Recovery Key disalin ke clipboard.', 'success');
        } catch {
            showToast('Gagal menyalin otomatis. Silakan blok & salin manual.', 'error');
        }
    };

    const handleSetupE2ee = async (e: React.FormEvent) => {
        e.preventDefault();
        if (setupPassword.length < 8) {
            showToast('Master Password minimal 8 karakter.', 'error');
            return;
        }
        if (setupPassword !== setupConfirm) {
            showToast('Konfirmasi Master Password tidak cocok.', 'error');
            return;
        }
        setBusy(true);
        try {
            const { config: nextConfig, recoveryKey } = await setupE2eeConfig(
                setupPassword,
                setupModules,
                setupHint
            );
            await persistE2eeConfig(nextConfig);
            setDisplayedRecoveryKey(recoveryKey);
            setHasSavedRecoveryKey(false);
            setSetupPassword('');
            setSetupConfirm('');
            setSetupHint('');
            if (localSettings.portalConfig?.enabled && setupModules.portal) {
                setPortalNeedsResync(true);
            }
            showToast('E2EE berhasil diaktifkan dan perangkat ini telah dibuka kuncinya.', 'success');
        } catch (err: any) {
            showToast(err?.message || 'Gagal mengaktifkan E2EE.', 'error');
        } finally {
            setBusy(false);
        }
    };

    const handleUnlockDevice = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!config) return;
        setBusy(true);
        try {
            await unlockWithPassword(config, unlockPassword);
            setUnlockPassword('');
            showToast('Kunci E2EE berhasil dibuka pada perangkat ini.', 'success');
        } catch (err: any) {
            showToast(err?.message || 'Master Password salah.', 'error');
        } finally {
            setBusy(false);
        }
    };

    const handleRecoverPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        const targetConfig = importedBundleConfig || config;
        if (!targetConfig) {
            showToast('Unggah File Kunci Darurat (.txt) yang berisi Key Bundle terlebih dahulu.', 'error');
            return;
        }
        if (recoveryNewPw.length < 8) {
            showToast('Password baru minimal 8 karakter.', 'error');
            return;
        }
        if (recoveryNewPw !== recoveryNewPwConfirm) {
            showToast('Konfirmasi password baru tidak cocok.', 'error');
            return;
        }
        setBusy(true);
        try {
            const updated = await recoverWithRecoveryKey(
                targetConfig,
                recoveryInput,
                recoveryNewPw,
                recoveryHint || targetConfig.passwordHint
            );
            await persistE2eeConfig(updated);
            setRecoveryInput('');
            setRecoveryNewPw('');
            setRecoveryNewPwConfirm('');
            setRecoveryHint('');
            setImportedBundleConfig(null);
            setShowRecoveryForm(false);
            setShowRestoreFromFileCase1(false);
            showToast('Master Password & Kunci E2EE berhasil dipulihkan, perangkat telah terbuka!', 'success');
        } catch (err: any) {
            showToast(err?.message || 'Recovery Key tidak valid.', 'error');
        } finally {
            setBusy(false);
        }
    };

    const handleEmergencyFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            const content = String(reader.result || '');
            const { recoveryKey, bundledConfig } = parseEmergencyKeyFileBundle(content);
            if (bundledConfig) {
                setImportedBundleConfig(bundledConfig);
            }
            if (recoveryKey) {
                setRecoveryInput(recoveryKey);
                showToast(
                    bundledConfig
                        ? `Recovery Key & Key Bundle (${bundledConfig.keyId}) berhasil dibaca dari file.`
                        : 'Recovery Key berhasil dibaca dari file.',
                    'success'
                );
            } else {
                showToast('File tidak berisi Recovery Key ESNTR yang valid.', 'error');
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    const handleToggleModule = async (modKey: keyof E2eeModuleToggles) => {
        if (!config) return;
        const updated: E2eeConfig = {
            ...config,
            modules: {
                ...config.modules,
                [modKey]: !config.modules[modKey],
            },
            updatedAt: new Date().toISOString(),
        };
        try {
            await persistE2eeConfig(updated);
            if (modKey === 'portal' && localSettings.portalConfig?.enabled) {
                setPortalNeedsResync(true);
            }
            showToast(
                `Enkripsi modul ${modKey.toUpperCase()} ${updated.modules[modKey] ? 'diaktifkan' : 'dimatikan'}.`,
                'success'
            );
        } catch (err: any) {
            showToast(err?.message || 'Gagal menyimpan pengaturan modul E2EE.', 'error');
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!config) return;
        if (newPw.length < 8) {
            showToast('Password baru minimal 8 karakter.', 'error');
            return;
        }
        if (newPw !== newPwConfirm) {
            showToast('Konfirmasi password baru tidak cocok.', 'error');
            return;
        }
        setBusy(true);
        try {
            const updated = await changeMasterPassword(config, oldPw, newPw, newHint);
            await persistE2eeConfig(updated);
            setOldPw('');
            setNewPw('');
            setNewPwConfirm('');
            setNewHint('');
            setShowChangePw(false);
            showToast('Master Password E2EE berhasil diubah. Data cloud tetap terbaca tanpa re-enkripsi.', 'success');
        } catch (err: any) {
            showToast(err?.message || 'Gagal mengubah Master Password.', 'error');
        } finally {
            setBusy(false);
        }
    };

    const handleRegenerateRecovery = () => {
        if (!config) return;
        showConfirmation(
            'Buat Ulang Recovery Key?',
            'Recovery Key dan File Kunci Darurat yang lama tidak akan berlaku lagi. Pastikan Anda segera menyimpan atau mengunduh file yang baru.',
            async () => {
                setBusy(true);
                try {
                    const { config: updated, recoveryKey } = await regenerateRecoveryKey(config);
                    await persistE2eeConfig(updated);
                    setDisplayedRecoveryKey(recoveryKey);
                    setHasSavedRecoveryKey(false);
                    showToast('Recovery Key baru berhasil dibuat.', 'success');
                } catch (err: any) {
                    showToast(err?.message || 'Gagal membuat ulang Recovery Key.', 'error');
                } finally {
                    setBusy(false);
                }
            },
            { confirmText: 'Buat Ulang Kunci', confirmColor: 'blue' }
        );
    };

    const handleDisableE2ee = () => {
        if (!config) return;
        showConfirmation(
            'Nonaktifkan Enkripsi E2EE?',
            'Sinkronisasi & pengiriman data baru ke cloud tidak akan dienkripsi lagi. Data lama yang sudah terenkripsi di cloud tidak akan bisa dibaca jika perangkat ini dikunci atau kuncinya dihapus. Anda tetap bisa menyimpannya atau mengaktifkan kembali nanti.',
            async () => {
                const nowIso = new Date().toISOString();
                await persistE2eeConfig({
                    ...config,
                    enabled: false,
                    disabledAt: nowIso,
                    updatedAt: nowIso,
                });
                if (localSettings.portalConfig?.enabled) {
                    setPortalNeedsResync(true);
                }
                showToast('Enkripsi End-to-End (E2EE) dinonaktifkan.', 'info');
            },
            { confirmText: 'Ya, Nonaktifkan E2EE', confirmColor: 'red' }
        );
    };

    const handleReactivateExisting = async () => {
        if (!config) return;
        const nowIso = new Date().toISOString();
        await persistE2eeConfig({
            ...config,
            enabled: true,
            disabledAt: undefined,
            updatedAt: nowIso,
        });
        if (localSettings.portalConfig?.enabled && config.modules?.portal) {
            setPortalNeedsResync(true);
        }
        showToast('Konfigurasi E2EE sebelumnya diaktifkan kembali.', 'success');
    };

    const handleSyncPortalNow = async () => {
        setSyncingPortalNow(true);
        try {
            const latestRows = await db.settings.toArray();
            const freshSettings = latestRows[0] ? { ...localSettings, ...latestRows[0] } : localSettings;
            const res = await syncPortalData(freshSettings);
            setPortalNeedsResync(false);
            showToast(`Portal Wali berhasil disinkronkan (${res.santriCount} santri).`, 'success');
        } catch (err: any) {
            showToast(err?.message || 'Gagal menyinkronkan Portal Wali. Buka menu Portal Wali untuk cek konfigurasi.', 'error');
        } finally {
            setSyncingPortalNow(false);
        }
    };

    const handleResetConfigCompletely = () => {
        showConfirmation(
            'Hapus Total Kunci E2EE?',
            'PERINGATAN KERAS: Menghapus konfigurasi kunci akan membuat seluruh data cloud, cadangan terenkripsi, serta salinan Form HTML Guru (Rapor) dan Formulir PSB yang terlanjur beredar TIDAK DAPAT DIDEKRIPSI lagi secara permanen—kecuali Anda masih menyimpan file "kunci-darurat-e2ee-*.txt". Pastikan tidak ada kiriman terenkripsi tertunda sebelum melanjutkan!',
            async () => {
                if (config?.keyId) lockDeviceVault(config.keyId);
                await persistE2eeConfig(undefined);
                setDisplayedRecoveryKey(null);
                showToast('Konfigurasi E2EE dihapus dari pengaturan lokal.', 'info');
            },
            { confirmText: 'Hapus Total Kunci', confirmColor: 'red' }
        );
    };

    return (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            <div className="border-b border-slate-200 bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 px-6 py-5 text-white">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3.5">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-500/20 border border-teal-400/30 text-teal-300">
                            <i className="bi bi-shield-lock-fill text-xl"></i>
                        </div>
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-base font-bold tracking-tight">
                                    Keamanan Enkripsi End-to-End (E2EE)
                                </h3>
                                {config?.enabled ? (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-200 border border-emerald-400/30">
                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                                        Aktif (Zero-Knowledge)
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-700/80 px-2.5 py-0.5 text-[11px] font-semibold text-slate-300 border border-slate-600">
                                        Nonaktif
                                    </span>
                                )}
                            </div>
                            <p className="mt-1 text-xs text-slate-300 leading-relaxed max-w-2xl">
                                Lindungi data pondok dengan 1 Master Password terpusat. Data dienkripsi di browser sebelum dikirim ke cloud (Dropbox, WebDAV, Firebase, GAS, Cloudflare, Supabase) sehingga pemilik layanan cloud tidak dapat membacanya.
                            </p>
                        </div>
                    </div>
                    {config?.enabled && (
                        <div className="shrink-0">
                            {isUnlocked ? (
                                <button
                                    type="button"
                                    onClick={() => {
                                        lockDeviceVault(config.keyId);
                                        showToast('Kunci E2EE pada perangkat ini dikunci.', 'info');
                                    }}
                                    className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 px-3.5 py-2 text-xs font-semibold text-white transition-colors"
                                >
                                    <i className="bi bi-lock-fill text-amber-300"></i>
                                    Kunci Perangkat Ini
                                </button>
                            ) : (
                                <span className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500/20 border border-amber-400/40 px-3 py-1.5 text-xs font-semibold text-amber-200">
                                    <i className="bi bi-exclamation-triangle-fill"></i>
                                    Perangkat Terkunci
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="p-6 space-y-6">
                {!cryptoSupported && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800">
                        <strong>Peringatan Browser:</strong> Web Crypto API tidak tersedia. Pastikan aplikasi dibuka melalui <strong>HTTPS</strong> atau <strong>localhost</strong> agar fitur E2EE dapat bekerja.
                    </div>
                )}

                {portalNeedsResync && localSettings.portalConfig?.enabled && (
                    <div className="rounded-xl border border-teal-300 bg-teal-50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-teal-950">
                        <div className="flex items-start gap-2.5">
                            <i className="bi bi-arrow-repeat text-teal-700 text-base shrink-0 mt-0.5"></i>
                            <div className="leading-relaxed">
                                <strong>Portal Wali Perlu Sinkronisasi Ulang:</strong> Pengaturan E2EE Portal telah berubah. Sinkronkan data Portal Wali sekarang agar data di cloud menyesuaikan status E2EE terbaru.
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={handleSyncPortalNow}
                            disabled={syncingPortalNow}
                            className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 px-3.5 py-2 text-xs font-bold text-white"
                        >
                            <i className="bi bi-cloud-upload-fill"></i>
                            {syncingPortalNow ? 'Menyinkronkan...' : 'Sinkronkan Portal Sekarang'}
                        </button>
                    </div>
                )}

                {/* RECOVERY KEY MODAL/ALERT BOX */}
                {displayedRecoveryKey && config && (
                    <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-5 space-y-4 shadow-sm">
                        <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white">
                                <i className="bi bi-key-fill text-lg"></i>
                            </div>
                            <div className="flex-1">
                                <h4 className="text-sm font-bold text-amber-950">
                                    SIMPAN RECOVERY KEY & FILE KUNCI DARURAT SEKARANG
                                </h4>
                                <p className="mt-1 text-xs text-amber-900 leading-relaxed">
                                    Jika suatu saat Anda lupa Master Password E2EE, kode di bawah ini adalah <strong>satu-satunya cara</strong> untuk memulihkan akses tanpa kehilangan data cloud. Simpan di tempat aman (offline/Password Manager).
                                </p>
                            </div>
                        </div>

                        <div className="select-all rounded-xl border border-amber-300 bg-white p-3.5 text-center font-mono text-base sm:text-lg font-bold tracking-wider text-slate-900">
                            {displayedRecoveryKey}
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex flex-wrap items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => handleDownloadEmergencyFile(displayedRecoveryKey, config)}
                                    className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 px-4 py-2 text-xs font-semibold text-white shadow-xs transition-colors"
                                >
                                    <i className="bi bi-download"></i>
                                    Unduh File Kunci Darurat (.txt)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleCopyRecoveryKey(displayedRecoveryKey)}
                                    className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-white hover:bg-amber-100/70 px-3.5 py-2 text-xs font-semibold text-amber-900 transition-colors"
                                >
                                    <i className="bi bi-clipboard"></i>
                                    Salin Kode
                                </button>
                            </div>

                            <label className="flex items-center gap-2 text-xs font-medium text-amber-950 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={hasSavedRecoveryKey}
                                    onChange={(e) => setHasSavedRecoveryKey(e.target.checked)}
                                    className="h-4 w-4 rounded border-amber-400 text-amber-600 focus:ring-amber-500"
                                />
                                Saya sudah menyimpan kode/file ini
                            </label>
                        </div>

                        {hasSavedRecoveryKey && (
                            <div className="flex justify-end">
                                <button
                                    type="button"
                                    onClick={() => setDisplayedRecoveryKey(null)}
                                    className="text-xs font-semibold text-amber-800 underline hover:text-amber-950"
                                >
                                    Tutup Pemberitahuan Ini
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* CASE 1: NOT CONFIGURED OR DISABLED */}
                {(!config || !config.enabled) && (
                    <div className="space-y-6">
                        {config && !config.enabled && (
                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                    <div className="text-xs font-bold text-slate-800">
                                        Kunci E2EE Tersimpan (Status: Nonaktif) — Key ID: <span className="font-mono">{config.keyId}</span>
                                    </div>
                                    <p className="text-xs text-slate-600 mt-0.5">
                                        Anda pernah membuat kunci E2EE sebelumnya. Anda dapat mengaktifkan kembali kunci yang sama agar data lama di cloud tetap terbaca.
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <button
                                        type="button"
                                        onClick={handleReactivateExisting}
                                        className="rounded-xl bg-teal-600 hover:bg-teal-700 px-3.5 py-2 text-xs font-semibold text-white"
                                    >
                                        Aktifkan Kunci Lama
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleResetConfigCompletely}
                                        className="rounded-xl border border-rose-200 bg-white hover:bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600"
                                    >
                                        Hapus Kunci
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* PULIHKAN DARI FILE KUNCI DARURAT (.TXT) SAAT KONFIGURASI HILANG / PERANGKAT BARU */}
                        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div>
                                    <div className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                                        <i className="bi bi-file-earmark-lock2-fill text-amber-600"></i>
                                        Pulihkan Kunci E2EE Lama dari File Kunci Darurat (.txt)
                                    </div>
                                    <p className="text-[11px] text-amber-900 mt-0.5">
                                        Jika sebelumnya Anda pernah mengunduh <code>kunci-darurat-e2ee-*.txt</code> (versi self-contained), unggah di sini untuk memulihkan akses ke data cloud lama.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowRestoreFromFileCase1((v) => !v)}
                                    className="shrink-0 rounded-xl border border-amber-300 bg-white hover:bg-amber-100/70 px-3.5 py-2 text-xs font-semibold text-amber-900 transition-colors"
                                >
                                    {showRestoreFromFileCase1 ? 'Tutup Form Pemulihan' : 'Pulihkan dari File .txt'}
                                </button>
                            </div>

                            {showRestoreFromFileCase1 && (
                                <form onSubmit={handleRecoverPassword} className="pt-3 border-t border-amber-200 space-y-3">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <input
                                            ref={restoreFileCase1Ref}
                                            type="file"
                                            accept=".txt"
                                            onChange={handleEmergencyFileUpload}
                                            className="hidden"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => restoreFileCase1Ref.current?.click()}
                                            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 px-3.5 py-2 text-xs font-bold text-white"
                                        >
                                            <i className="bi bi-upload"></i>
                                            Pilih File Kunci Darurat (.txt)
                                        </button>
                                        {importedBundleConfig && (
                                            <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg">
                                                Key Bundle siap: <span className="font-mono">{importedBundleConfig.keyId}</span>
                                            </span>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                                            Recovery Key (otomatis terisi dari file)
                                        </label>
                                        <input
                                            type="text"
                                            value={recoveryInput}
                                            onChange={(e) => setRecoveryInput(e.target.value)}
                                            placeholder="ESNTR-XXXX-XXXX-XXXX-XXXX-XXXX"
                                            required
                                            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 font-mono text-sm uppercase"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                                    Master Password Baru
                                                </label>
                                                <input
                                                    type="password"
                                                    value={recoveryNewPw}
                                                    onChange={(e) => setRecoveryNewPw(e.target.value)}
                                                    placeholder="Minimal 8 karakter kuat"
                                                    required
                                                    minLength={8}
                                                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                                    Konfirmasi Password Baru
                                                </label>
                                                <input
                                                    type="password"
                                                    value={recoveryNewPwConfirm}
                                                    onChange={(e) => setRecoveryNewPwConfirm(e.target.value)}
                                                    placeholder="Ulangi password baru"
                                                    required
                                                    minLength={8}
                                                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm"
                                                />
                                            </div>
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={busy || !cryptoSupported}
                                            className="rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 px-5 py-2.5 text-xs font-bold text-white"
                                        >
                                            {busy ? 'Memulihkan Kunci...' : 'Pulihkan Kunci E2EE & Buka Perangkat'}
                                        </button>
                                    </form>
                                )}
                            </div>

                            <form onSubmit={handleSetupE2ee} className="space-y-5">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                            Buat Master Password E2EE <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="password"
                                            value={setupPassword}
                                            onChange={(e) => setSetupPassword(e.target.value)}
                                            placeholder="Minimal 8 karakter kuat..."
                                            required
                                            minLength={8}
                                            className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                                        />
                                        {setupPassword && (() => {
                                            const st = getPasswordStrength(setupPassword);
                                            return (
                                                <div className="mt-1.5 flex items-center gap-2">
                                                    <div className="flex-1 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                                                        <div
                                                            className={`h-full transition-all ${st.color}`}
                                                            style={{ width: `${(st.score / 3) * 100}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-[11px] font-semibold text-slate-600">{st.label}</span>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                            Konfirmasi Master Password <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="password"
                                            value={setupConfirm}
                                            onChange={(e) => setSetupConfirm(e.target.value)}
                                            placeholder="Ulangi Master Password..."
                                            required
                                            minLength={8}
                                            className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                                        />
                                    </div>
                                </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                    Petunjuk / Hint Password (Opsional)
                                </label>
                                <input
                                    type="text"
                                    value={setupHint}
                                    onChange={(e) => setSetupHint(e.target.value)}
                                    placeholder="Misal: Kombinasi tahun berdiri pondok + kata sandi bendahara"
                                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                                />
                                <p className="mt-1 text-[11px] text-slate-500">
                                    Jangan tulis password asli pada kolom hint. Hint ini boleh terbaca untuk membantu admin mengingat password.
                                </p>
                            </div>

                            <div className="space-y-2.5">
                                <div className="text-xs font-bold uppercase tracking-wider text-slate-600">
                                    Pilih Modul Cloud yang Dienkripsi E2EE
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {MODULE_META.map((mod) => (
                                        <label
                                            key={mod.key}
                                            className={`flex items-start gap-3 rounded-xl border p-3.5 cursor-pointer transition-colors ${
                                                setupModules[mod.key]
                                                    ? 'border-teal-500 bg-teal-50/50'
                                                    : 'border-slate-200 bg-white hover:bg-slate-50'
                                            }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={setupModules[mod.key]}
                                                onChange={(e) =>
                                                    setSetupModules((prev) => ({ ...prev, [mod.key]: e.target.checked }))
                                                }
                                                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                                            />
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                                                    <i className={`bi ${mod.icon} text-teal-600`}></i>
                                                    {mod.title}
                                                </div>
                                                <p className="mt-0.5 text-[11px] text-slate-600 leading-relaxed">
                                                    {mod.subtitle}
                                                </p>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl bg-slate-50 border border-slate-200 p-4">
                                <div className="text-xs text-slate-600">
                                    <i className="bi bi-laptop mr-1.5 text-teal-600"></i>
                                    <strong>Mode Remember Device Aktif:</strong> Admin cukup memasukkan password 1x di tiap perangkat tepercaya.
                                </div>
                                <button
                                    type="submit"
                                    disabled={busy || !cryptoSupported}
                                    className="shrink-0 inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 px-5 py-2.5 text-xs font-bold text-white shadow-xs transition-colors"
                                >
                                    <i className="bi bi-shield-lock-fill"></i>
                                    {busy ? 'Menyiapkan Kunci Kriptografi...' : 'Aktifkan E2EE Sekarang'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* CASE 2: ENABLED BUT LOCKED ON THIS DEVICE */}
                {config?.enabled && !isUnlocked && (
                    <div className="space-y-5">
                        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-900">
                            <div className="font-bold flex items-center gap-2 text-sm">
                                <i className="bi bi-lock-fill text-amber-600"></i>
                                Perangkat Ini Belum Dibuka Kuncinya
                            </div>
                            <p className="mt-1 leading-relaxed">
                                Pengaturan E2EE aktif dengan Key ID <span className="font-mono font-semibold">{config.keyId}</span>. Masukkan Master Password untuk membuka enkripsi di browser ini agar data cloud & tarikan formulir bisa didekripsi.
                            </p>
                            {config.passwordHint && (
                                <p className="mt-1.5 text-amber-800">
                                    <strong>Hint:</strong> {config.passwordHint}
                                </p>
                            )}
                        </div>

                        {!showRecoveryForm ? (
                            <form onSubmit={handleUnlockDevice} className="space-y-4 max-w-md">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                        Master Password E2EE
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            type="password"
                                            value={unlockPassword}
                                            onChange={(e) => setUnlockPassword(e.target.value)}
                                            placeholder="Masukkan Master Password..."
                                            required
                                            className="flex-1 rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                                        />
                                        <button
                                            type="submit"
                                            disabled={busy || !cryptoSupported}
                                            className="rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 px-5 py-2.5 text-xs font-bold text-white"
                                        >
                                            {busy ? 'Membuka...' : 'Buka Kunci'}
                                        </button>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 text-xs">
                                    <button
                                        type="button"
                                        onClick={() => setShowRecoveryForm(true)}
                                        className="font-semibold text-amber-700 hover:text-amber-900 underline"
                                    >
                                        Lupa Password? Pulihkan dengan Recovery Key / File .txt
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <form onSubmit={handleRecoverPassword} className="rounded-xl border border-slate-200 bg-slate-50 p-5 space-y-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-bold text-slate-900">
                                        Pemulihan Master Password (via Recovery Key)
                                    </h4>
                                    <button
                                        type="button"
                                        onClick={() => setShowRecoveryForm(false)}
                                        className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                                    >
                                        Kembali ke Login Password
                                    </button>
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <label className="text-xs font-semibold text-slate-700">
                                            Masukkan Recovery Key
                                        </label>
                                        <div>
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                accept=".txt"
                                                onChange={handleEmergencyFileUpload}
                                                className="hidden"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => fileInputRef.current?.click()}
                                                className="text-xs font-semibold text-teal-700 hover:underline inline-flex items-center gap-1"
                                            >
                                                <i className="bi bi-file-earmark-arrow-up"></i>
                                                Unggah File Kunci (.txt)
                                            </button>
                                        </div>
                                    </div>
                                    <input
                                        type="text"
                                        value={recoveryInput}
                                        onChange={(e) => setRecoveryInput(e.target.value)}
                                        placeholder="ESNTR-XXXX-XXXX-XXXX-XXXX-XXXX"
                                        required
                                        className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 font-mono text-sm uppercase focus:border-teal-500 focus:outline-none"
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                                            Master Password Baru
                                        </label>
                                        <input
                                            type="password"
                                            value={recoveryNewPw}
                                            onChange={(e) => setRecoveryNewPw(e.target.value)}
                                            placeholder="Minimal 8 karakter kuat"
                                            required
                                            minLength={8}
                                            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                                            Konfirmasi Password Baru
                                        </label>
                                        <input
                                            type="password"
                                            value={recoveryNewPwConfirm}
                                            onChange={(e) => setRecoveryNewPwConfirm(e.target.value)}
                                            placeholder="Ulangi password baru"
                                            required
                                            minLength={8}
                                            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        Hint Password Baru (Opsional)
                                    </label>
                                    <input
                                        type="text"
                                        value={recoveryHint}
                                        onChange={(e) => setRecoveryHint(e.target.value)}
                                        placeholder="Biarkan kosong jika tidak berubah"
                                        className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={busy}
                                    className="rounded-xl bg-teal-600 hover:bg-teal-700 px-5 py-2.5 text-xs font-bold text-white"
                                >
                                    {busy ? 'Memulihkan...' : 'Reset Master Password & Buka Kunci'}
                                </button>
                            </form>
                        )}
                    </div>
                )}

                {/* CASE 3: ENABLED & UNLOCKED ON THIS DEVICE */}
                {config?.enabled && isUnlocked && (
                    <div className="space-y-6">
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="flex items-start gap-3">
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                                        <i className="bi bi-unlock-fill text-base"></i>
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold text-emerald-950">
                                            Perangkat Terbuka ({vaultMode === 'session' ? 'Mode Komputer Bersama / Sesi Ini Saja' : 'Remember Device Aktif'})
                                        </div>
                                        <div className="text-[11px] text-emerald-800 mt-0.5">
                                            Key ID: <span className="font-mono font-semibold">{config.keyId}</span>
                                            {vaultEntry?.unlockedAt && (
                                                <> · Dibuka sejak {new Date(vaultEntry.unlockedAt).toLocaleString('id-ID')}</>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <span className="text-[11px] font-medium text-emerald-800 bg-white/80 border border-emerald-200 rounded-lg px-2.5 py-1 self-start sm:self-center">
                                    {vaultMode === 'session' ? 'Otomatis terkunci saat browser/tab ditutup' : 'Kunci tersimpan aman di browser ini'}
                                </span>
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-emerald-200/70">
                                <span className="text-[11px] text-emerald-900 font-medium">
                                    Mode Penyimpanan Kunci di Browser Ini:
                                </span>
                                <div className="inline-flex rounded-lg border border-emerald-300 bg-white p-0.5 text-[11px] font-semibold">
                                    <button
                                        type="button"
                                        onClick={() => handleChangeVaultMode('remember')}
                                        className={`px-2.5 py-1 rounded-md transition-colors ${vaultMode === 'remember' ? 'bg-teal-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                                    >
                                        Ingat Perangkat (Praktis)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleChangeVaultMode('session')}
                                        className={`px-2.5 py-1 rounded-md transition-colors ${vaultMode === 'session' ? 'bg-amber-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                                    >
                                        Komputer Bersama (Hapus Saat Tutup)
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* 4 MODULE TOGGLES */}
                        <div className="space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                                    Cakupan Modul Terenkripsi E2EE
                                </h4>
                                <span className="text-[11px] text-slate-500">
                                    Catatan: Setelah mengubah Rapor/PSB/Portal, generate ulang form HTML atau lakukan sync agar pengaturan berlaku.
                                </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {MODULE_META.map((mod) => {
                                    const active = Boolean(config.modules?.[mod.key]);
                                    return (
                                        <div
                                            key={mod.key}
                                            className={`flex items-start justify-between gap-3 rounded-xl border p-4 transition-colors ${
                                                active ? 'border-teal-300 bg-teal-50/30' : 'border-slate-200 bg-slate-50/40'
                                            }`}
                                        >
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                                                    <i className={`bi ${mod.icon} ${active ? 'text-teal-600' : 'text-slate-400'}`}></i>
                                                    {mod.title}
                                                </div>
                                                <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                                                    {mod.subtitle}
                                                </p>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                                                <input
                                                    type="checkbox"
                                                    checked={active}
                                                    onChange={() => handleToggleModule(mod.key)}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                                            </label>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* ACTION BAR: CHANGE PASSWORD, REGENERATE RECOVERY, DISABLE */}
                        <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowChangePw((v) => !v);
                                    setNewHint(config.passwordHint || '');
                                }}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700"
                            >
                                <i className="bi bi-key"></i>
                                Ubah Master Password
                            </button>
                            <button
                                type="button"
                                onClick={handleRegenerateRecovery}
                                disabled={busy}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 px-3.5 py-2 text-xs font-semibold text-amber-900"
                            >
                                <i className="bi bi-file-earmark-lock2"></i>
                                Buat Ulang Recovery Key (.txt)
                            </button>
                            <button
                                type="button"
                                onClick={handleDisableE2ee}
                                className="ml-auto inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 px-3.5 py-2 text-xs font-semibold text-rose-700"
                            >
                                <i className="bi bi-shield-slash"></i>
                                Nonaktifkan E2EE
                            </button>
                        </div>

                        {showChangePw && (
                            <form onSubmit={handleChangePassword} className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                                        Ubah Master Password E2EE
                                    </h5>
                                    <button
                                        type="button"
                                        onClick={() => setShowChangePw(false)}
                                        className="text-xs text-slate-500 hover:text-slate-800"
                                    >
                                        Tutup
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <input
                                        type="password"
                                        value={oldPw}
                                        onChange={(e) => setOldPw(e.target.value)}
                                        placeholder="Password Saat Ini"
                                        required
                                        className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs"
                                    />
                                    <input
                                        type="password"
                                        value={newPw}
                                        onChange={(e) => setNewPw(e.target.value)}
                                        placeholder="Password Baru (min. 8)"
                                        required
                                        minLength={8}
                                        className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs"
                                    />
                                    <input
                                        type="password"
                                        value={newPwConfirm}
                                        onChange={(e) => setNewPwConfirm(e.target.value)}
                                        placeholder="Konfirmasi Password Baru"
                                        required
                                        minLength={8}
                                        className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs"
                                    />
                                </div>
                                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                                    <input
                                        type="text"
                                        value={newHint}
                                        onChange={(e) => setNewHint(e.target.value)}
                                        placeholder="Hint password baru (opsional)"
                                        className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs"
                                    />
                                    <button
                                        type="submit"
                                        disabled={busy}
                                        className="rounded-xl bg-teal-600 hover:bg-teal-700 px-4 py-2 text-xs font-bold text-white"
                                    >
                                        {busy ? 'Menyimpan...' : 'Simpan Password Baru'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
