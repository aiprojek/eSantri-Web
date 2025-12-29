
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { PondokSettings, NisJenjangConfig, NisSettings, BackupFrequency, SyncProvider } from '../types';
import { db } from '../db';
import { useAppContext } from '../AppContext';
import { performSync } from '../services/syncService';
import { getSupabaseClient } from '../services/supabaseClient';

interface SettingsProps {}

const Settings: React.FC<SettingsProps> = () => {
    const { settings, onSaveSettings, showConfirmation, showToast, downloadBackup } = useAppContext();
    const [localSettings, setLocalSettings] = useState<PondokSettings>(settings);
    
    const restoreInputRef = useRef<HTMLInputElement>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);

     useEffect(() => {
        setLocalSettings(settings);
     }, [settings]);

     // Init NIS config for new jenjang if any
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

    const activeTeachers = useMemo(() => 
        localSettings.tenagaPengajar.filter(t => !t.riwayatJabatan.some(r => r.tanggalSelesai)),
        [localSettings.tenagaPengajar]
    );
    
    const handleInputChange = <K extends keyof PondokSettings>(key: K, value: PondokSettings[K]) => {
        setLocalSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleBackupConfigChange = (frequency: BackupFrequency) => {
        setLocalSettings(prev => ({
            ...prev,
            backupConfig: {
                ...prev.backupConfig,
                frequency
            }
        }));
    };

    // --- Sync Config Handlers ---
    const handleSyncProviderChange = (provider: SyncProvider) => {
        setLocalSettings(prev => ({
            ...prev,
            cloudSyncConfig: { ...prev.cloudSyncConfig, provider }
        }));
    };

    const handleSyncConfigChange = (field: string, value: any) => {
        setLocalSettings(prev => ({
            ...prev,
            cloudSyncConfig: { ...prev.cloudSyncConfig, [field]: value }
        }));
    };

    const handleTestSupabase = async () => {
        const { supabaseUrl, supabaseKey } = localSettings.cloudSyncConfig;
        if (!supabaseUrl || !supabaseKey) {
            showToast('URL dan Key wajib diisi', 'error');
            return;
        }
        
        // Re-init client with new credentials for testing
        const client = getSupabaseClient({ ...localSettings.cloudSyncConfig, provider: 'supabase' });
        if(!client) return;

        try {
            const { error } = await client.from('audit_logs').select('count', { count: 'exact', head: true });
            if (error) throw error;
            showToast('Koneksi ke Supabase BERHASIL!', 'success');
        } catch (e: any) {
            showToast(`Koneksi Gagal: ${e.message}`, 'error');
        }
    };

    const handleManualSync = async (direction: 'up' | 'down') => {
        if (JSON.stringify(localSettings.cloudSyncConfig) !== JSON.stringify(settings.cloudSyncConfig)) {
            showToast('Simpan pengaturan terlebih dahulu sebelum melakukan sinkronisasi.', 'info');
            return;
        }

        const actionText = direction === 'up' ? 'Upload ke Cloud' : 'Download dari Cloud';
        const warningText = direction === 'down' 
            ? 'PERHATIAN: Tindakan ini akan MENGGANTI semua data lokal dengan data dari cloud. Pastikan Anda sudah membackup data lokal jika perlu.' 
            : 'Tindakan ini akan menimpa data backup di cloud dengan data lokal saat ini.';

        showConfirmation(
            `Konfirmasi ${actionText}`,
            warningText,
            async () => {
                setIsSyncing(true);
                try {
                    const timestamp = await performSync(localSettings.cloudSyncConfig, direction);
                    
                    const updatedSettings = {
                        ...localSettings,
                        cloudSyncConfig: { ...localSettings.cloudSyncConfig, lastSync: timestamp }
                    };
                    await onSaveSettings(updatedSettings);
                    
                    if (direction === 'down') {
                        showToast('Sinkronisasi berhasil! Aplikasi akan dimuat ulang.', 'success');
                        setTimeout(() => window.location.reload(), 2000);
                    } else {
                        showToast('Data berhasil diupload ke cloud.', 'success');
                    }
                } catch (error) {
                    console.error("Sync error:", error);
                    showToast(`Gagal sinkronisasi: ${(error as Error).message}`, 'error');
                } finally {
                    setIsSyncing(false);
                }
            },
            { confirmText: `Ya, ${actionText}`, confirmColor: direction === 'down' ? 'red' : 'blue' }
        );
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
    
    const handleSaveSettingsHandler = () => {
        showConfirmation(
            'Simpan Pengaturan',
            'Apakah Anda yakin ingin menyimpan semua perubahan yang dibuat?',
            async () => {
                setIsSaving(true);
                try {
                    if (localSettings.cloudSyncConfig.provider === 'supabase') {
                        getSupabaseClient(localSettings.cloudSyncConfig);
                    }
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

    const handleRestoreHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
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
                           await (db as any).transaction('rw', db.settings, db.santri, async () => {
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
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Pengaturan Sistem</h1>
            
            <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                <h2 className="text-xl font-bold text-gray-700 mb-4 border-b pb-2">Informasi Umum</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* ... (Fields Informasi Umum) ... */}
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
                {/* ... (Existing NIS Settings) ... */}
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
                                        {method === 'custom' && 'Metode Kustom (Format: TM-TH-KODE-NO)'}
                                        {method === 'global' && 'Metode Global (Urut Pondok)'}
                                        {method === 'dob' && 'Metode Tgl. Lahir (YYYYMMDD...)'}
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>

                    {localSettings.nisSettings.generationMethod === 'custom' && (
                        <div className="p-4 bg-gray-50 border rounded-lg space-y-4">
                            <p className="text-sm text-gray-600">Format NIS: <strong>{localSettings.nisSettings.format}</strong> (Ganti bagian di textbox bawah untuk kustomisasi)</p>
                            <div>
                                <label className="block mb-1 text-sm font-medium text-gray-700">Format String</label>
                                <input
                                    type="text"
                                    value={localSettings.nisSettings.format}
                                    onChange={(e) => handleNisSettingChange('format', e.target.value)}
                                    className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5"
                                />
                                <p className="text-xs text-gray-500 mt-1">Placeholder: {'{TM}'}: Tahun Masehi (2 digit), {'{TH}'}: Tahun Hijriah (2 digit), {'{KODE}'}: Kode Jenjang, {'{NO_URUT}'}: Nomor Urut</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block mb-1 text-sm font-medium text-gray-700">Sumber Tahun Masehi</label>
                                    <select
                                        value={localSettings.nisSettings.masehiYearSource}
                                        onChange={(e) => handleNisSettingChange('masehiYearSource', e.target.value as any)}
                                        className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5"
                                    >
                                        <option value="auto">Otomatis (Tahun Masuk)</option>
                                        <option value="manual">Manual (Setiap Tahun Ajaran)</option>
                                    </select>
                                </div>
                                {localSettings.nisSettings.masehiYearSource === 'manual' && (
                                    <div>
                                        <label className="block mb-1 text-sm font-medium text-gray-700">Tahun Masehi Manual</label>
                                        <input
                                            type="number"
                                            value={localSettings.nisSettings.manualMasehiYear}
                                            onChange={(e) => handleNisSettingChange('manualMasehiYear', parseInt(e.target.value))}
                                            className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5"
                                        />
                                    </div>
                                )}
                                <div>
                                    <label className="block mb-1 text-sm font-medium text-gray-700">Sumber Tahun Hijriah</label>
                                    <select
                                        value={localSettings.nisSettings.hijriahYearSource}
                                        onChange={(e) => handleNisSettingChange('hijriahYearSource', e.target.value as any)}
                                        className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5"
                                    >
                                        <option value="auto">Otomatis (Konversi dari Masehi)</option>
                                        <option value="manual">Manual (Setiap Tahun Ajaran)</option>
                                    </select>
                                </div>
                                {localSettings.nisSettings.hijriahYearSource === 'manual' && (
                                    <div>
                                        <label className="block mb-1 text-sm font-medium text-gray-700">Tahun Hijriah Manual</label>
                                        <input
                                            type="number"
                                            value={localSettings.nisSettings.manualHijriahYear}
                                            onChange={(e) => handleNisSettingChange('manualHijriahYear', parseInt(e.target.value))}
                                            className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5"
                                        />
                                    </div>
                                )}
                            </div>
                            <div>
                                <h4 className="font-semibold text-gray-700 mb-2">Konfigurasi Nomor Urut per Jenjang</h4>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left text-gray-500">
                                        <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                                            <tr>
                                                <th className="px-4 py-2">Jenjang</th>
                                                <th className="px-4 py-2">Mulai Dari</th>
                                                <th className="px-4 py-2">Padding (Digit)</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {localSettings.jenjang.map(j => {
                                                const config = localSettings.nisSettings.jenjangConfig.find(c => c.jenjangId === j.id) || { startNumber: 1, padding: 3 };
                                                return (
                                                    <tr key={j.id} className="bg-white border-b">
                                                        <td className="px-4 py-2 font-medium text-gray-900">{j.nama}</td>
                                                        <td className="px-4 py-2">
                                                            <input
                                                                type="number"
                                                                value={config.startNumber}
                                                                onChange={(e) => handleNisJenjangConfigChange(j.id, 'startNumber', e.target.value)}
                                                                className="w-20 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg p-1"
                                                            />
                                                        </td>
                                                        <td className="px-4 py-2">
                                                            <input
                                                                type="number"
                                                                value={config.padding}
                                                                onChange={(e) => handleNisJenjangConfigChange(j.id, 'padding', e.target.value)}
                                                                className="w-20 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg p-1"
                                                            />
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {localSettings.nisSettings.generationMethod === 'global' && (
                        <div className="p-4 bg-gray-50 border rounded-lg space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block mb-1 text-sm font-medium text-gray-700">Prefix Global</label>
                                    <input
                                        type="text"
                                        value={localSettings.nisSettings.globalPrefix}
                                        onChange={(e) => handleNisSettingChange('globalPrefix', e.target.value)}
                                        className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5"
                                        placeholder="Contoh: PP"
                                    />
                                </div>
                                <div className="flex items-center mt-6">
                                    <input
                                        type="checkbox"
                                        id="globalUseYearPrefix"
                                        checked={localSettings.nisSettings.globalUseYearPrefix}
                                        onChange={(e) => handleNisSettingChange('globalUseYearPrefix', e.target.checked)}
                                        className="w-4 h-4 text-teal-600 bg-gray-100 border-gray-300 rounded focus:ring-teal-500"
                                    />
                                    <label htmlFor="globalUseYearPrefix" className="ml-2 text-sm font-medium text-gray-900">Gunakan Tahun Masuk sebagai Prefix</label>
                                </div>
                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id="globalUseJenjangCode"
                                        checked={localSettings.nisSettings.globalUseJenjangCode}
                                        onChange={(e) => handleNisSettingChange('globalUseJenjangCode', e.target.checked)}
                                        className="w-4 h-4 text-teal-600 bg-gray-100 border-gray-300 rounded focus:ring-teal-500"
                                    />
                                    <label htmlFor="globalUseJenjangCode" className="ml-2 text-sm font-medium text-gray-900">Sisipkan Kode Jenjang</label>
                                </div>
                                <div>
                                    <label className="block mb-1 text-sm font-medium text-gray-700">Mulai Dari Angka</label>
                                    <input
                                        type="number"
                                        value={localSettings.nisSettings.globalStartNumber}
                                        onChange={(e) => handleNisSettingChange('globalStartNumber', parseInt(e.target.value))}
                                        className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5"
                                    />
                                </div>
                                <div>
                                    <label className="block mb-1 text-sm font-medium text-gray-700">Padding Digit</label>
                                    <input
                                        type="number"
                                        value={localSettings.nisSettings.globalPadding}
                                        onChange={(e) => handleNisSettingChange('globalPadding', parseInt(e.target.value))}
                                        className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {localSettings.nisSettings.generationMethod === 'dob' && (
                        <div className="p-4 bg-gray-50 border rounded-lg space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block mb-1 text-sm font-medium text-gray-700">Format Tanggal Lahir</label>
                                    <select
                                        value={localSettings.nisSettings.dobFormat}
                                        onChange={(e) => handleNisSettingChange('dobFormat', e.target.value as any)}
                                        className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5"
                                    >
                                        <option value="DDMMYY">DDMMYY (Hari Bulan Tahun-2-digit)</option>
                                        <option value="YYYYMMDD">YYYYMMDD (Tahun-4-digit Bulan Hari)</option>
                                        <option value="YYMMDD">YYMMDD (Tahun-2-digit Bulan Hari)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block mb-1 text-sm font-medium text-gray-700">Pemisah (Separator)</label>
                                    <input
                                        type="text"
                                        value={localSettings.nisSettings.dobSeparator}
                                        onChange={(e) => handleNisSettingChange('dobSeparator', e.target.value)}
                                        className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5"
                                        placeholder="Kosongkan jika tidak ada, atau gunakan . - /"
                                    />
                                </div>
                                <div className="flex items-center mt-6">
                                    <input
                                        type="checkbox"
                                        id="dobUseJenjangCode"
                                        checked={localSettings.nisSettings.dobUseJenjangCode}
                                        onChange={(e) => handleNisSettingChange('dobUseJenjangCode', e.target.checked)}
                                        className="w-4 h-4 text-teal-600 bg-gray-100 border-gray-300 rounded focus:ring-teal-500"
                                    />
                                    <label htmlFor="dobUseJenjangCode" className="ml-2 text-sm font-medium text-gray-900">Sisipkan Kode Jenjang</label>
                                </div>
                                <div>
                                    <label className="block mb-1 text-sm font-medium text-gray-700">Padding Nomor Urut (jika Tgl Lahir sama)</label>
                                    <input
                                        type="number"
                                        value={localSettings.nisSettings.dobPadding}
                                        onChange={(e) => handleNisSettingChange('dobPadding', parseInt(e.target.value))}
                                        className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                <h2 className="text-xl font-bold text-gray-700 mb-4 border-b pb-2">Sinkronisasi & Database (Cloud)</h2>
                <p className="text-sm text-gray-600 mb-4">
                    Hubungkan aplikasi ke Supabase (Realtime) atau Cloud Storage pribadi (Legacy Backup).
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block mb-2 text-sm font-medium text-gray-700">Penyedia Layanan</label>
                        <select 
                            value={localSettings.cloudSyncConfig?.provider || 'none'} 
                            onChange={(e) => handleSyncProviderChange(e.target.value as SyncProvider)}
                            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5"
                        >
                            <option value="none">Tidak Aktif</option>
                            <option value="supabase">Supabase (PostgreSQL)</option>
                            <option value="dropbox">Dropbox (Legacy Backup)</option>
                            <option value="webdav">Nextcloud / WebDAV (Legacy Backup)</option>
                        </select>
                    </div>

                    {localSettings.cloudSyncConfig?.provider !== 'none' && localSettings.cloudSyncConfig?.provider !== 'supabase' && (
                        <div className="flex items-center mt-7">
                            <label className="inline-flex items-center cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={localSettings.cloudSyncConfig?.autoSync || false} 
                                    onChange={(e) => handleSyncConfigChange('autoSync', e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                                <span className="ms-3 text-sm font-medium text-gray-900">
                                    Sinkronisasi Otomatis
                                </span>
                            </label>
                            <div className="ml-2 group relative">
                                <i className="bi bi-question-circle text-gray-400 hover:text-gray-600 cursor-help"></i>
                                <div className="hidden group-hover:block absolute z-10 w-64 p-2 bg-black text-white text-xs rounded shadow-lg -top-2 left-6">
                                    Jika aktif, aplikasi akan otomatis mengunggah data ke cloud setiap kali ada perubahan data (jeda 5 detik). Data cloud akan ditimpa dengan data lokal terbaru.
                                </div>
                            </div>
                        </div>
                    )}

                    {localSettings.cloudSyncConfig?.provider === 'supabase' && (
                        <div className="col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 border p-4 rounded-lg bg-emerald-50">
                            <div className="md:col-span-2 mb-2 p-3 bg-yellow-100 border border-yellow-300 rounded text-xs text-yellow-800">
                                <strong>Catatan Penggunaan:</strong> Jika Anda menggunakan Supabase Free Tier, proyek akan di-pause otomatis jika tidak aktif selama 1 minggu. Anda perlu mengaktifkannya kembali secara manual di dashboard Supabase.
                            </div>
                            <div className="md:col-span-2">
                                <label className="block mb-2 text-sm font-medium text-gray-700">Supabase Project URL</label>
                                <input 
                                    type="text" 
                                    value={localSettings.cloudSyncConfig.supabaseUrl || ''}
                                    onChange={(e) => handleSyncConfigChange('supabaseUrl', e.target.value)}
                                    placeholder="https://xyz.supabase.co"
                                    className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block mb-2 text-sm font-medium text-gray-700">Supabase Anon Key</label>
                                <input 
                                    type="password" 
                                    value={localSettings.cloudSyncConfig.supabaseKey || ''}
                                    onChange={(e) => handleSyncConfigChange('supabaseKey', e.target.value)}
                                    className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5"
                                />
                            </div>
                            <div>
                                <label className="block mb-2 text-sm font-medium text-gray-700">ID Admin / Username</label>
                                <input 
                                    type="text" 
                                    value={localSettings.cloudSyncConfig.adminIdentity || ''}
                                    onChange={(e) => handleSyncConfigChange('adminIdentity', e.target.value)}
                                    placeholder="Contoh: Admin-01"
                                    className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5"
                                />
                                <p className="text-xs text-gray-500 mt-1">Nama ini akan tercatat dalam Audit Log.</p>
                            </div>
                            <div className="md:col-span-2 flex justify-end">
                                <button onClick={handleTestSupabase} className="text-emerald-700 bg-emerald-200 hover:bg-emerald-300 px-4 py-2 rounded text-sm font-medium">
                                    Uji Koneksi
                                </button>
                            </div>
                        </div>
                    )}

                    {localSettings.cloudSyncConfig?.provider === 'dropbox' && (
                        <div>
                            <label className="block mb-2 text-sm font-medium text-gray-700">Dropbox Access Token</label>
                            <input 
                                type="password" 
                                value={localSettings.cloudSyncConfig.dropboxToken || ''}
                                onChange={(e) => handleSyncConfigChange('dropboxToken', e.target.value)}
                                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5"
                            />
                        </div>
                    )}
                    
                    {localSettings.cloudSyncConfig?.provider === 'webdav' && (
                        <div className="col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 border p-4 rounded-lg bg-gray-50">
                            <div className="md:col-span-2">
                                <label className="block mb-2 text-sm font-medium text-gray-700">URL WebDAV</label>
                                <input 
                                    type="text" 
                                    value={localSettings.cloudSyncConfig.webdavUrl || ''}
                                    onChange={(e) => handleSyncConfigChange('webdavUrl', e.target.value)}
                                    placeholder="https://cloud.example.com/remote.php/dav/files/user/"
                                    className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5"
                                />
                            </div>
                            <div>
                                <label className="block mb-2 text-sm font-medium text-gray-700">Username</label>
                                <input 
                                    type="text" 
                                    value={localSettings.cloudSyncConfig.webdavUsername || ''}
                                    onChange={(e) => handleSyncConfigChange('webdavUsername', e.target.value)}
                                    className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5"
                                />
                            </div>
                            <div>
                                <label className="block mb-2 text-sm font-medium text-gray-700">Password</label>
                                <input 
                                    type="password" 
                                    value={localSettings.cloudSyncConfig.webdavPassword || ''}
                                    onChange={(e) => handleSyncConfigChange('webdavPassword', e.target.value)}
                                    className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5"
                                />
                            </div>
                        </div>
                    )}
                </div>
                {localSettings.cloudSyncConfig?.provider !== 'none' && localSettings.cloudSyncConfig?.provider !== 'supabase' && (
                    <div className="mt-6 flex flex-wrap gap-4 items-center border-t pt-4">
                        <div className="text-sm text-gray-600">
                            Terakhir sinkronisasi: <strong>{localSettings.cloudSyncConfig?.lastSync ? new Date(localSettings.cloudSyncConfig.lastSync).toLocaleString('id-ID') : 'Belum pernah'}</strong>
                        </div>
                        <div className="flex gap-2 ml-auto">
                            <button 
                                onClick={() => handleManualSync('up')} 
                                disabled={isSyncing}
                                className="text-white bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-4 py-2 flex items-center gap-2 disabled:bg-blue-300"
                            >
                                {isSyncing ? <span className="animate-spin h-4 w-4 border-2 border-t-transparent rounded-full"></span> : <i className="bi bi-cloud-upload"></i>}
                                Upload ke Cloud
                            </button>
                            <button 
                                onClick={() => handleManualSync('down')} 
                                disabled={isSyncing}
                                className="text-gray-700 bg-gray-200 hover:bg-gray-300 focus:ring-4 focus:ring-gray-100 font-medium rounded-lg text-sm px-4 py-2 flex items-center gap-2 disabled:bg-gray-100"
                            >
                                {isSyncing ? <span className="animate-spin h-4 w-4 border-2 border-t-transparent border-gray-600 rounded-full"></span> : <i className="bi bi-cloud-download"></i>}
                                Download dari Cloud
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                <h2 className="text-xl font-bold text-gray-700 mb-4 border-b pb-2">Cadangkan & Pulihkan Data Lokal</h2>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-800">Cadangkan Data (Manual)</h3>
                        <p className="text-sm text-gray-600 mt-1 mb-4">Simpan salinan semua data santri dan pengaturan ke dalam satu file JSON di komputer Anda.</p>
                        
                        <div className="bg-yellow-50 p-3 rounded-md border border-yellow-200 mb-4">
                            <h4 className="text-sm font-semibold text-yellow-800 mb-2">Pengingat Backup Otomatis</h4>
                            <div className="flex flex-wrap gap-2">
                                {[
                                    { value: 'daily', label: 'Setiap Hari' },
                                    { value: 'weekly', label: 'Setiap Minggu' },
                                    { value: 'never', label: 'Matikan' }
                                ].map(opt => (
                                    <label key={opt.value} className="flex items-center gap-2 bg-white px-3 py-1.5 rounded border cursor-pointer hover:bg-gray-50">
                                        <input 
                                            type="radio" 
                                            name="backupFreq" 
                                            value={opt.value} 
                                            checked={localSettings.backupConfig?.frequency === opt.value} 
                                            onChange={() => handleBackupConfigChange(opt.value as any)}
                                            className="text-teal-600 focus:ring-teal-500"
                                        />
                                        <span className="text-sm text-gray-700">{opt.label}</span>
                                    </label>
                                ))}
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                                Terakhir dicadangkan: {settings.backupConfig?.lastBackup ? new Date(settings.backupConfig.lastBackup).toLocaleString('id-ID') : 'Belum pernah'}
                            </p>
                        </div>

                        <button 
                            onClick={downloadBackup}
                            className="w-full sm:w-auto text-white bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 flex items-center justify-center gap-2">
                            <i className="bi bi-download"></i>
                            <span>Unduh Cadangan Data</span>
                        </button>
                    </div>
                     <div>
                        <h3 className="text-lg font-semibold text-gray-800">Pulihkan Data (Manual)</h3>
                        <p className="text-sm text-gray-600 mt-1 mb-4">Pulihkan data dari file cadangan JSON. Tindakan ini tidak dapat dibatalkan.</p>
                        <input type="file" accept=".json" onChange={handleRestoreHandler} ref={restoreInputRef} id="restore-input" className="hidden" />
                        <label 
                            htmlFor="restore-input"
                            className="w-full sm:w-auto cursor-pointer text-white bg-green-600 hover:bg-green-700 focus:ring-4 focus:ring-green-300 font-medium rounded-lg text-sm px-5 py-2.5 flex items-center justify-center gap-2">
                            <i className="bi bi-upload"></i>
                            <span>Pilih File Cadangan</span>
                        </label>
                    </div>
                </div>
            </div>
            
             <div className="mt-6 flex justify-end">
                <button onClick={handleSaveSettingsHandler} disabled={isSaving} className="text-white bg-teal-700 hover:bg-teal-800 focus:ring-4 focus:ring-teal-300 font-medium rounded-lg text-sm px-8 py-2.5 flex items-center justify-center min-w-[190px] disabled:bg-teal-400 disabled:cursor-not-allowed">
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
        </div>
    );
};

export default Settings;
