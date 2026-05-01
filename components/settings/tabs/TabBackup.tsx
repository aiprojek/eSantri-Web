
import React, { useRef, useState, useEffect } from 'react';
import { PondokSettings, BackupFrequency } from '../../../types';
import { useAppContext } from '../../../AppContext';
import { db } from '../../../db';
import { formatBytes } from '../../../utils/formatters';
import { SectionCard } from '../../common/SectionCard';
import {
    CURRENT_PERMISSION_VERSION,
    migrateUserPermissions,
    type PermissionMigrationItem,
} from '../../../services/permissionMigrationService';

interface TabBackupProps {
    localSettings: PondokSettings;
    setLocalSettings: React.Dispatch<React.SetStateAction<PondokSettings>>;
}

type BackupPayload = Record<string, unknown>;

const RESTORE_TABLE_CONFIG: Array<{ key: string; label: string; table: any; aliases?: string[] }> = [
    { key: 'settings', label: 'Pengaturan', table: db.settings, aliases: ['config'] },
    { key: 'santri', label: 'Santri', table: db.santri },
    { key: 'tagihan', label: 'Tagihan', table: db.tagihan },
    { key: 'pembayaran', label: 'Pembayaran', table: db.pembayaran },
    { key: 'saldoSantri', label: 'Saldo Santri', table: db.saldoSantri },
    { key: 'transaksiSaldo', label: 'Transaksi Saldo', table: db.transaksiSaldo },
    { key: 'transaksiKas', label: 'Buku Kas', table: db.transaksiKas },
    { key: 'chartOfAccounts', label: 'Chart of Accounts', table: db.chartOfAccounts, aliases: ['coa'] },
    { key: 'suratTemplates', label: 'Template Surat', table: db.suratTemplates },
    { key: 'arsipSurat', label: 'Arsip Surat', table: db.arsipSurat },
    { key: 'pendaftar', label: 'Pendaftar PSB', table: db.pendaftar },
    { key: 'auditLogs', label: 'Audit Log', table: db.auditLogs },
    { key: 'users', label: 'User', table: db.users },
    { key: 'syncHistory', label: 'Riwayat Sync', table: db.syncHistory },
    { key: 'raporRecords', label: 'Rapor', table: db.raporRecords },
    { key: 'absensi', label: 'Absensi', table: db.absensi },
    { key: 'jurnalMengajar', label: 'Jurnal Mengajar', table: db.jurnalMengajar },
    { key: 'tahfizh', label: 'Tahfizh', table: db.tahfizh },
    { key: 'inventaris', label: 'Inventaris', table: db.inventaris },
    { key: 'calendarEvents', label: 'Kalender', table: db.calendarEvents },
    { key: 'buku', label: 'Buku Perpustakaan', table: db.buku },
    { key: 'sirkulasi', label: 'Sirkulasi Perpustakaan', table: db.sirkulasi },
    { key: 'obat', label: 'Data Obat', table: db.obat },
    { key: 'kesehatanRecords', label: 'Kesehatan', table: db.kesehatanRecords },
    { key: 'bkSessions', label: 'BK', table: db.bkSessions },
    { key: 'bukuTamu', label: 'Buku Tamu', table: db.bukuTamu },
    { key: 'jadwalPelajaran', label: 'Jadwal Pelajaran', table: db.jadwalPelajaran },
    { key: 'arsipJadwal', label: 'Arsip Jadwal', table: db.arsipJadwal },
    { key: 'payrollRecords', label: 'Payroll', table: db.payrollRecords },
    { key: 'piketSchedules', label: 'Piket', table: db.piketSchedules },
    { key: 'produkKoperasi', label: 'Produk Koperasi', table: db.produkKoperasi },
    { key: 'transaksiKoperasi', label: 'Transaksi Koperasi', table: db.transaksiKoperasi },
    { key: 'riwayatStok', label: 'Riwayat Stok', table: db.riwayatStok },
    { key: 'keuanganKoperasi', label: 'Keuangan Koperasi', table: db.keuanganKoperasi },
    { key: 'pendingOrders', label: 'Pending Order', table: db.pendingOrders },
    { key: 'diskon', label: 'Diskon', table: db.diskon },
    { key: 'suppliers', label: 'Supplier', table: db.suppliers },
    { key: 'pembayaranHutang', label: 'Pembayaran Hutang', table: db.pembayaranHutang },
    { key: 'warehouses', label: 'Gudang', table: db.warehouses },
    { key: 'stockTransfers', label: 'Transfer Stok', table: db.stockTransfers },
];

const getArrayFromBackup = (payload: BackupPayload, key: string, aliases: string[] = []): unknown[] | null => {
    const candidates = [key, ...aliases];
    for (const candidate of candidates) {
        const value = payload[candidate];
        if (Array.isArray(value)) return value;
    }
    return null;
};

const HealthDashboard: React.FC = () => {
    const [stats, setStats] = useState<{
        dbStatus: 'OK' | 'NOT';
        checkTime: string;
        used: number;
        quota: number;
        counts: Record<string, number>;
    } | null>(null);

    const refreshHealth = async () => {
        try {
            // Check DB Status
            const dbStatus = db.isOpen() ? 'OK' : 'NOT';
            
            // Check Storage Quota
            let used = 0;
            let quota = 10240 * 1024 * 1024; // Default fallback 10GB
            if (navigator.storage && navigator.storage.estimate) {
                const estimate = await navigator.storage.estimate();
                used = estimate.usage || 0;
                quota = estimate.quota || quota;
            }

            // Get Record Counts
            const counts = {
                'Santri': await db.santri.count(),
                'Keuangan (Kas)': await db.transaksiKas.count(),
                'Tagihan': await db.tagihan.count(),
                'Pembayaran': await db.pembayaran.count(),
                'Pendaftar (PSB)': await db.pendaftar.count(),
                'Rapor': await db.raporRecords.count(),
                'Absensi': await db.absensi.count(),
                'Tahfizh': await db.tahfizh.count(),
                'Inventaris': await db.inventaris.count(),
                'Audit Logs': await db.auditLogs.count(),
            };

            setStats({
                dbStatus,
                checkTime: new Date().toLocaleString(),
                used,
                quota,
                counts
            });
        } catch (err) {
            console.error("Failed to fetch health stats", err);
        }
    };

    useEffect(() => {
        refreshHealth();
    }, []);

    if (!stats) return <div className="animate-pulse bg-gray-100 h-40 rounded-lg"></div>;

    return (
        <div className="mb-6 rounded-xl border border-app-border bg-app-subtle p-4">
            <div className="flex justify-between items-center mb-4">
                <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-700">
                    <i className="bi bi-heart-pulse text-red-500"></i> Dashboard Kesehatan Penyimpanan Lokal
                </h3>
                <button onClick={refreshHealth} className="text-xs font-semibold text-blue-600 hover:underline">
                    <i className="bi bi-arrow-clockwise"></i> Refresh
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                        <span className={stats.dbStatus === 'OK' ? 'text-green-600' : 'text-red-600'}>
                            {stats.dbStatus === 'OK' ? '✔' : '✘'} Database: {stats.dbStatus} (IndexedDB Mounted)
                        </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span>🕒 Waktu Cek: {stats.checkTime}</span>
                    </div>
                    <div className="pt-2">
                        <div className="flex justify-between mb-1">
                            <span className="text-xs font-medium text-gray-700 flex items-center gap-1">
                                💾 Storage Browser
                            </span>
                            <span className="text-xs text-gray-500">
                                {formatBytes(stats.used)} / {formatBytes(stats.quota)}
                            </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div 
                                className="bg-blue-600 h-1.5 rounded-full" 
                                style={{ width: `${Math.min((stats.used / stats.quota) * 100, 100)}%` }}
                            ></div>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-3 rounded border border-gray-200">
                    <h4 className="text-xs font-bold text-gray-500 mb-2 border-b pb-1">TOTAL RECORD</h4>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                        {Object.entries(stats.counts).map(([label, count]) => (
                            <div key={label} className="flex justify-between text-[11px]">
                                <span className="text-gray-600">{label}:</span>
                                <span className="font-bold text-gray-800">{count.toLocaleString()}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export const TabBackup: React.FC<TabBackupProps> = ({ localSettings, setLocalSettings }) => {
    const { downloadBackup, showConfirmation, showToast, showAlert } = useAppContext();
    const restoreInputRef = useRef<HTMLInputElement>(null);

    const handleBackupConfigChange = (frequency: BackupFrequency) => {
        setLocalSettings(prev => ({
            ...prev,
            backupConfig: {
                ...prev.backupConfig,
                frequency
            }
        }));
    };

    const handleRestoreHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const jsonString = e.target?.result as string;
                const data = JSON.parse(jsonString);

                if (!data || typeof data !== 'object') {
                    throw new Error('File cadangan tidak valid atau rusak.');
                }

                const payload = data as BackupPayload;
                const restorePlan: Array<(typeof RESTORE_TABLE_CONFIG)[number] & { rows: unknown[] }> = [];
                for (const cfg of RESTORE_TABLE_CONFIG) {
                    const rows = getArrayFromBackup(payload, cfg.key, cfg.aliases);
                    if (rows) {
                        restorePlan.push({ ...cfg, rows });
                    }
                }

                if (restorePlan.length === 0) {
                    throw new Error('Tidak ada tabel backup yang dikenali. Pastikan file berasal dari eSantri.');
                }
                
                showConfirmation(
                    'Konfirmasi Pemulihan Data',
                    'PERHATIAN: Data yang tersedia pada file backup akan menggantikan data saat ini. Lanjutkan pemulihan?',
                    async () => {
                        try {
                            const permissionMigrationItems: PermissionMigrationItem[] = [];
                            const txTables = restorePlan.map((item) => item.table);
                            await (db as any).transaction('rw', ...txTables, async () => {
                                for (const item of restorePlan) {
                                    await item.table.clear();
                                    if (item.rows.length === 0) continue;

                                    if (item.key === 'users') {
                                        const normalizedUsers = (item.rows as any[]).map((rawUser) => {
                                            const result = migrateUserPermissions(rawUser as any);
                                            if (result.changed) {
                                                permissionMigrationItems.push({
                                                    userId: result.user.id,
                                                    username: result.user.username,
                                                    role: result.user.role,
                                                    fromVersion: (rawUser as any)?.permissionVersion ?? 0,
                                                    toVersion: result.user.permissionVersion ?? CURRENT_PERMISSION_VERSION,
                                                    reason: result.reason,
                                                });
                                            }
                                            return result.user;
                                        });
                                        await item.table.bulkPut(normalizedUsers);
                                    } else {
                                        await item.table.bulkPut(item.rows);
                                    }
                                }
                            });

                            const restoredKeys = restorePlan.map((item) => item.key);
                            const restoredLabels = RESTORE_TABLE_CONFIG
                                .filter((cfg) => restoredKeys.includes(cfg.key))
                                .map((cfg) => cfg.label);
                            const skippedLabels = RESTORE_TABLE_CONFIG
                                .filter((cfg) => !restoredKeys.includes(cfg.key))
                                .map((cfg) => cfg.label);

                            showToast(`Restore berhasil untuk ${restorePlan.length} tabel. Aplikasi akan dimuat ulang.`, 'success');
                            const migrationSummary = permissionMigrationItems.length > 0
                                ? `\n\nMigrasi Permission Otomatis (${permissionMigrationItems.length} user, target v${CURRENT_PERMISSION_VERSION}):\n${permissionMigrationItems
                                    .slice(0, 15)
                                    .map((item) => `- ${item.username} (${item.role}): ${item.reason}`)
                                    .join('\n')}${permissionMigrationItems.length > 15 ? '\n- ...dan lainnya' : ''}`
                                : '\n\nMigrasi Permission Otomatis: tidak ada user legacy yang perlu dimigrasi.';

                            showAlert(
                                'Laporan Hasil Restore',
                                `Data diperbarui (${restoredLabels.length}): ${restoredLabels.join(', ') || '-'}\n\nTidak ditemukan di file backup (${skippedLabels.length}): ${skippedLabels.join(', ') || '-'}${migrationSummary}`
                            );
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

    return (
        <SectionCard
            title="Cadangkan & Pulihkan Data Lokal"
            description="Kelola backup manual, jadwal pengingat backup, dan restore data dari file JSON."
            contentClassName="space-y-6 p-6"
        >
            
            <HealthDashboard />

             <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                    <h3 className="text-lg font-semibold text-slate-800">Cadangkan Data (Manual)</h3>
                    <p className="mb-4 mt-1 text-sm text-slate-600">Simpan salinan semua data santri dan pengaturan ke dalam satu file JSON di komputer Anda.</p>
                    <div className="mb-4 rounded-xl border border-yellow-200 bg-yellow-50 p-3">
                        <h4 className="mb-2 text-sm font-semibold text-yellow-800">Pengingat Backup Otomatis</h4>
                        <div className="flex flex-wrap gap-2">
                            {[{ value: 'daily', label: 'Setiap Hari' }, { value: 'weekly', label: 'Setiap Minggu' }, { value: 'never', label: 'Matikan' }].map(opt => (
                                <label key={opt.value} className="flex cursor-pointer items-center gap-2 rounded border bg-white px-3 py-1.5 hover:bg-gray-50">
                                    <input type="radio" name="backupFreq" value={opt.value} checked={localSettings.backupConfig?.frequency === opt.value} onChange={() => handleBackupConfigChange(opt.value as any)} className="text-teal-600 focus:ring-teal-500"/>
                                    <span className="text-sm text-gray-700">{opt.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    <button onClick={downloadBackup} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 sm:w-auto"><i className="bi bi-download"></i><span>Unduh Cadangan Data</span></button>
                </div>
                 <div>
                    <h3 className="text-lg font-semibold text-slate-800">Pulihkan Data (Manual)</h3>
                    <p className="mb-4 mt-1 text-sm text-slate-600">Pulihkan data dari file cadangan JSON. Tindakan ini tidak dapat dibatalkan.</p>
                    <input type="file" accept=".json" onChange={handleRestoreHandler} ref={restoreInputRef} id="restore-input" className="hidden" />
                    <label htmlFor="restore-input" className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-700 sm:w-auto"><i className="bi bi-upload"></i><span>Pilih File Cadangan</span></label>
                </div>
            </div>
        </SectionCard>
    );
};
