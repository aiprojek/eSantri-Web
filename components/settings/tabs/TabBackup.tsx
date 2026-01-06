
import React, { useRef } from 'react';
import { PondokSettings, BackupFrequency } from '../../../types';
import { useAppContext } from '../../../AppContext';
import { db } from '../../../db';

interface TabBackupProps {
    localSettings: PondokSettings;
    setLocalSettings: React.Dispatch<React.SetStateAction<PondokSettings>>;
}

export const TabBackup: React.FC<TabBackupProps> = ({ localSettings, setLocalSettings }) => {
    const { downloadBackup, showConfirmation, showToast } = useAppContext();
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

                if (!data.settings || !data.santri) {
                    throw new Error('File cadangan tidak valid atau rusak.');
                }
                
                showConfirmation(
                    'Konfirmasi Pemulihan Data',
                    'PERHATIAN: Tindakan ini akan MENGHAPUS SEMUA DATA saat ini dan menggantinya dengan data dari file cadangan. Apakah Anda yakin ingin melanjutkan?',
                    async () => {
                        try {
                           await (db as any).transaction('rw', db.settings, db.santri, db.tagihan, db.pembayaran, db.saldoSantri, db.transaksiSaldo, db.transaksiKas, db.suratTemplates, db.arsipSurat, db.pendaftar, db.auditLogs, db.users, async () => {
                                await db.settings.clear(); if(data.settings) await db.settings.bulkPut(data.settings);
                                await db.santri.clear(); if(data.santri) await db.santri.bulkPut(data.santri);
                                await db.tagihan.clear(); if(data.tagihan) await db.tagihan.bulkPut(data.tagihan);
                                await db.pembayaran.clear(); if(data.pembayaran) await db.pembayaran.bulkPut(data.pembayaran);
                                await db.saldoSantri.clear(); if(data.saldoSantri) await db.saldoSantri.bulkPut(data.saldoSantri);
                                await db.transaksiSaldo.clear(); if(data.transaksiSaldo) await db.transaksiSaldo.bulkPut(data.transaksiSaldo);
                                await db.transaksiKas.clear(); if(data.transaksiKas) await db.transaksiKas.bulkPut(data.transaksiKas);
                                await db.suratTemplates.clear(); if(data.suratTemplates) await db.suratTemplates.bulkPut(data.suratTemplates);
                                await db.arsipSurat.clear(); if(data.arsipSurat) await db.arsipSurat.bulkPut(data.arsipSurat);
                                await db.pendaftar.clear(); if(data.pendaftar) await db.pendaftar.bulkPut(data.pendaftar);
                                await db.auditLogs.clear(); if(data.auditLogs) await db.auditLogs.bulkPut(data.auditLogs);
                                await db.users.clear(); if(data.users) await db.users.bulkPut(data.users);
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

    return (
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h2 className="text-xl font-bold text-gray-700 mb-4 border-b pb-2">Cadangkan & Pulihkan Data Lokal</h2>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <h3 className="text-lg font-semibold text-gray-800">Cadangkan Data (Manual)</h3>
                    <p className="text-sm text-gray-600 mt-1 mb-4">Simpan salinan semua data santri dan pengaturan ke dalam satu file JSON di komputer Anda.</p>
                    <div className="bg-yellow-50 p-3 rounded-md border border-yellow-200 mb-4">
                        <h4 className="text-sm font-semibold text-yellow-800 mb-2">Pengingat Backup Otomatis</h4>
                        <div className="flex flex-wrap gap-2">
                            {[{ value: 'daily', label: 'Setiap Hari' }, { value: 'weekly', label: 'Setiap Minggu' }, { value: 'never', label: 'Matikan' }].map(opt => (
                                <label key={opt.value} className="flex items-center gap-2 bg-white px-3 py-1.5 rounded border cursor-pointer hover:bg-gray-50"><input type="radio" name="backupFreq" value={opt.value} checked={localSettings.backupConfig?.frequency === opt.value} onChange={() => handleBackupConfigChange(opt.value as any)} className="text-teal-600 focus:ring-teal-500"/><span className="text-sm text-gray-700">{opt.label}</span></label>
                            ))}
                        </div>
                    </div>
                    <button onClick={downloadBackup} className="w-full sm:w-auto text-white bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 flex items-center justify-center gap-2"><i className="bi bi-download"></i><span>Unduh Cadangan Data</span></button>
                </div>
                 <div>
                    <h3 className="text-lg font-semibold text-gray-800">Pulihkan Data (Manual)</h3>
                    <p className="text-sm text-gray-600 mt-1 mb-4">Pulihkan data dari file cadangan JSON. Tindakan ini tidak dapat dibatalkan.</p>
                    <input type="file" accept=".json" onChange={handleRestoreHandler} ref={restoreInputRef} id="restore-input" className="hidden" />
                    <label htmlFor="restore-input" className="w-full sm:w-auto cursor-pointer text-white bg-green-600 hover:bg-green-700 focus:ring-4 focus:ring-green-300 font-medium rounded-lg text-sm px-5 py-2.5 flex items-center justify-center gap-2"><i className="bi bi-upload"></i><span>Pilih File Cadangan</span></label>
                </div>
            </div>
        </div>
    );
};
