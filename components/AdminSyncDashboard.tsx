
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../AppContext';
import { SyncFileRecord, ConflictItem } from '../types';
import { db } from '../db';
import { formatBytes } from '../utils/formatters';
import { ConflictResolver } from './sync/ConflictResolver';
import { loadSyncService } from '../utils/lazyCloudServices';
import { PageHeader } from './common/PageHeader';
import { SectionCard } from './common/SectionCard';
import { EmptyState } from './common/EmptyState';

export const AdminSyncDashboard: React.FC = () => {
    const { settings, showToast, showConfirmation, showAlert, currentUser } = useAppContext();
    const [files, setFiles] = useState<SyncFileRecord[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [processingId, setProcessingId] = useState<string | null>(null);

    // Conflict State
    const [conflicts, setConflicts] = useState<ConflictItem[]>([]);
    const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);
    const [currentFileToMerge, setCurrentFileToMerge] = useState<SyncFileRecord | null>(null);

    const config = settings.cloudSyncConfig;

    const fetchFiles = async () => {
        if (!config || config.provider === 'none') return;
        setIsLoading(true);
        try {
            const { listInboxFiles } = await loadSyncService();
            const fileList = await listInboxFiles(config);
            
            // Check against local history to see if already merged
            const historyIds = await db.syncHistory.toCollection().primaryKeys();
            const processedList = fileList.map(f => ({
                ...f,
                status: historyIds.includes(f.id) ? 'merged' : 'pending'
            })) as SyncFileRecord[];

            // Sort: Pending first, then by date descending
            processedList.sort((a, b) => {
                if (a.status === b.status) {
                    return new Date(b.client_modified).getTime() - new Date(a.client_modified).getTime();
                }
                return a.status === 'pending' ? -1 : 1;
            });

            setFiles(processedList);
        } catch (e) {
            // Using toast instead of console.error for user feedback
            showToast(`Gagal memuat daftar file: ${(e as Error).message}`, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchFiles();
    }, []);

    const handleMerge = async (file: SyncFileRecord, resolveConflicts?: ConflictItem[]) => {
        setProcessingId(file.id);
        try {
            const { processInboxFile } = await loadSyncService();
            // If resolveConflicts is provided, we are re-trying with resolved data
            const result = await processInboxFile(config, file, resolveConflicts);
            
            if (result.conflicts && result.conflicts.length > 0) {
                // Trigger Visual Conflict Resolution
                setConflicts(result.conflicts);
                setCurrentFileToMerge(file);
                setIsConflictModalOpen(true);
                return; // Stop here, wait for modal
            }

            // Log history using current user identity
            const mergerIdentity = currentUser?.username || 'Admin (Virtual)';

            await db.syncHistory.add({
                id: file.id,
                fileId: file.id,
                fileName: file.name,
                mergedAt: new Date().toISOString(),
                mergedBy: mergerIdentity,
                recordCount: result.recordCount || 0
            });

            showToast(`Berhasil menggabungkan ${result.recordCount} data.`, 'success');
            
            // Update UI list
            setFiles(prev => prev.map(f => f.id === file.id ? { ...f, status: 'merged' } : f));
            setConflicts([]);
            setIsConflictModalOpen(false);

        } catch (e) {
            showAlert('Gagal Menggabungkan Data', (e as Error).message);
        } finally {
            setProcessingId(null);
        }
    };

    const handleConflictResolved = (resolvedList: ConflictItem[]) => {
        if (currentFileToMerge) {
            handleMerge(currentFileToMerge, resolvedList);
        }
    };

    const handlePublishMaster = async () => {
        showConfirmation(
            'Publikasikan Master Data?',
            'Ini akan menimpa file Master di Cloud dengan data gabungan yang ada di komputer Anda saat ini. Pastikan Anda sudah menggabungkan (Merge) semua update terbaru dari staff.',
            async () => {
                setIsLoading(true);
                try {
                    const { publishMasterData } = await loadSyncService();
                    await publishMasterData(config);
                    showToast('Master Data Berhasil Dipublikasikan!', 'success');
                } catch (e) {
                    showAlert('Gagal Publikasi', (e as Error).message);
                } finally {
                    setIsLoading(false);
                }
            },
            { confirmColor: 'blue', confirmText: 'Ya, Publikasikan' }
        );
    };

    const handleDeleteFile = async (file: SyncFileRecord) => {
         showConfirmation(
            'Hapus File?',
            `File "${file.name}" akan dihapus permanen dari Cloud.`,
            async () => {
                try {
                    const { deleteInboxFile } = await loadSyncService();
                    await deleteInboxFile(config, file.path_lower);
                    setFiles(prev => prev.filter(f => f.id !== file.id));
                    showToast('File dihapus.', 'success');
                } catch(e) {
                    showToast('Gagal menghapus file.', 'error');
                }
            },
            { confirmColor: 'red', confirmText: 'Hapus' }
        );
    }

    const handleDeleteMerged = async () => {
        const mergedFiles = files.filter(f => f.status === 'merged');
        if (mergedFiles.length === 0) {
            showToast('Tidak ada file yang statusnya "Sudah Digabung" untuk dihapus.', 'info');
            return;
        }

        showConfirmation(
            'Bersihkan Inbox?',
            `Anda akan menghapus ${mergedFiles.length} file yang sudah digabungkan dari Cloud. Ini tidak akan menghapus data di database lokal. Lanjutkan?`,
            async () => {
                setIsLoading(true);
                try {
                    const { deleteMultipleInboxFiles } = await loadSyncService();
                    const paths = mergedFiles.map(f => f.path_lower);
                    await deleteMultipleInboxFiles(config, paths);
                    setFiles(prev => prev.filter(f => f.status !== 'merged'));
                    showToast('Inbox berhasil dibersihkan.', 'success');
                } catch (e) {
                    showToast('Gagal membersihkan inbox.', 'error');
                } finally {
                    setIsLoading(false);
                }
            },
            { confirmColor: 'red', confirmText: 'Ya, Bersihkan' }
        );
    }

    if (!config || config.provider === 'none') {
        return (
            <EmptyState icon="bi-cloud-slash" title="Sinkronisasi cloud belum aktif" description="Silakan atur provider sinkronisasi pada menu Pengaturan > Sync Cloud." />
        );
    }

    if (config.provider === 'firebase') {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-teal-50 rounded-xl border border-teal-200 text-center">
                <div className="w-20 h-20 bg-teal-100 rounded-full flex items-center justify-center mb-4">
                    <i className="bi bi-cloud-check-fill text-4xl text-teal-600"></i>
                </div>
                <h2 className="text-xl font-bold text-teal-800 mb-2">Sinkronisasi Real-Time Aktif</h2>
                <p className="text-teal-700 max-w-md">
                    Anda sedang menggunakan <strong>Firebase Realtime</strong>. Data disinkronkan secara otomatis dan instan antar perangkat.
                </p>
                <div className="mt-6 p-4 bg-white rounded-lg border border-teal-100 text-left text-sm text-gray-600 max-w-lg">
                    <p className="font-bold text-teal-800 mb-2"><i className="bi bi-info-circle"></i> Mengapa halaman ini kosong?</p>
                    <p>Halaman "Pusat Sinkronisasi" hanya digunakan untuk metode <strong>Hub & Spoke</strong> (Dropbox/WebDAV) yang memerlukan penggabungan data secara manual.</p>
                    <p className="mt-2">Dengan Firebase, Anda tidak perlu lagi melakukan "Gabung Data" atau "Publikasikan Master". Semua perubahan langsung tersimpan di Cloud dan diterima oleh staff lain saat itu juga.</p>
                </div>
                <button 
                    onClick={() => window.location.hash = '#/settings'} 
                    className="mt-8 text-teal-600 font-medium hover:underline text-sm"
                >
                    Lihat Konfigurasi di Pengaturan Cloud
                </button>
            </div>
        );
    }

    const providerLabel = config.provider === 'webdav' ? 'WebDAV / Nextcloud' : 'Dropbox';
    const providerIcon = config.provider === 'webdav' ? 'bi-hdd-network text-orange-600' : 'bi-dropbox text-blue-600';
    const providerBg = config.provider === 'webdav' ? 'bg-orange-50 border-orange-200 text-orange-800' : 'bg-blue-50 border-blue-200 text-blue-800';

    return (
        <div className="space-y-6">
            <PageHeader
                eyebrow="Sistem"
                title="Pusat Sinkronisasi Cloud"
                description="Kelola data masuk dari staff, gabungkan pembaruan, dan publikasikan master data dari panel sinkronisasi yang lebih rapi."
                actions={<div className="flex gap-2">
                    <button onClick={fetchFiles} className="app-button-secondary px-4 py-2.5 text-sm">
                        <i className="bi bi-arrow-repeat"></i> Segarkan
                    </button>
                    <button onClick={handlePublishMaster} disabled={isLoading} className="app-button-primary px-4 py-2.5 text-sm">
                        {isLoading ? <span className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent"></span> : <i className="bi bi-cloud-arrow-up-fill"></i>}
                        Publikasikan Master
                    </button>
                </div>}
                className={providerBg.includes('orange') ? 'border-orange-200' : 'border-blue-200'}
            />
            <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${providerBg}`}>
                <i className="bi bi-link-45deg"></i> Terhubung ke: <strong>{providerLabel}</strong>
            </div>

            <SectionCard title="Inbox: Update dari Staff" description={`Total file sinkronisasi yang terdeteksi: ${files.length}`} contentClassName="overflow-hidden">
                <div className="flex items-center justify-between border-b border-app-border bg-gray-50 px-6 py-4">
                    <div>
                        <h3 className="font-bold text-app-text">Inbox: Update dari Staff</h3>
                        <span className="text-xs app-text-muted">Total File: {files.length}</span>
                    </div>
                    {files.some(f => f.status === 'merged') && (
                        <button onClick={handleDeleteMerged} disabled={isLoading} className="text-red-600 hover:bg-red-50 px-3 py-1.5 rounded text-xs font-bold border border-red-200 flex items-center gap-1 transition-colors">
                            <i className="bi bi-trash-fill"></i> Bersihkan yang Sudah Digabung
                        </button>
                    )}
                </div>
                <table className="app-table w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-500 border-b border-app-border">
                        <tr>
                            <th className="px-6 py-3 font-medium">Nama File</th>
                            <th className="px-6 py-3 font-medium">Ukuran</th>
                            <th className="px-6 py-3 font-medium">Waktu Upload</th>
                            <th className="px-6 py-3 font-medium text-center">Status</th>
                            <th className="px-6 py-3 font-medium text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {files.map(file => (
                            <tr key={file.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 font-medium text-gray-900 flex items-center gap-2">
                                    <i className="bi bi-file-earmark-code text-blue-500"></i>
                                    <span className="truncate max-w-[200px]" title={file.name}>{file.name}</span>
                                </td>
                                <td className="px-6 py-4 text-gray-500 font-mono text-xs">{formatBytes(file.size)}</td>
                                <td className="px-6 py-4 text-gray-500">
                                    {new Date(file.client_modified).toLocaleString('id-ID')}
                                </td>
                                <td className="px-6 py-4 text-center">
                                    {file.status === 'merged' ? (
                                        <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-bold">Sudah Digabung</span>
                                    ) : (
                                        <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full text-xs font-bold">Baru</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-right space-x-2">
                                    {file.status !== 'merged' && (
                                        <button 
                                            onClick={() => handleMerge(file)} 
                                            disabled={!!processingId}
                                            className="text-white bg-teal-600 hover:bg-teal-700 px-3 py-1.5 rounded text-xs font-bold disabled:bg-gray-300"
                                        >
                                            {processingId === file.id ? '...' : 'Gabung'}
                                        </button>
                                    )}
                                    <button onClick={() => handleDeleteFile(file)} className="text-red-600 hover:bg-red-50 px-2 py-1.5 rounded" title="Hapus File"><i className="bi bi-trash"></i></button>
                                </td>
                            </tr>
                        ))}
                        {files.length === 0 && !isLoading && (
                            <tr><td colSpan={5} className="p-4"><EmptyState icon="bi-cloud-check" title="Inbox sinkron kosong" description="Belum ada file update baru dari staff untuk digabungkan." /></td></tr>
                        )}
                    </tbody>
                </table>
            </SectionCard>
            
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                <p className="font-bold mb-1">Panduan Resolusi Konflik:</p>
                <p className="mb-2">Jika terjadi bentrok data (misal Admin dan Staff mengedit santri yang sama), jendela resolusi akan muncul:</p>
                <ul className="list-disc pl-5 space-y-1">
                    <li><strong>Versi Lokal:</strong> Gunakan data yang ada di komputer Anda sekarang.</li>
                    <li><strong>Versi Staff:</strong> Terpilih otomatis jika data staff lebih baru.</li>
                    <li><strong>Mix & Match:</strong> Anda bisa klik pada masing-masing baris data (misal Nama dari Staff, tapi Alamat dari Lokal) lalu klik "Simpan Hasil Campuran".</li>
                </ul>
            </div>
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800 mt-4">
                <strong>Panduan Admin Pengepul:</strong>
                <ol className="list-decimal pl-5 mt-1 space-y-1">
                    <li>Klik "Segarkan" untuk melihat file kiriman staff.</li>
                    <li>Klik "Gabung" pada file baru. Jika ada data yang konflik (diedit staff tapi di admin juga berubah), jendela <strong>Resolusi Konflik</strong> akan muncul.</li>
                    <li>Setelah semua file digabung, klik "Publikasikan Master" agar seluruh staff bisa mendownload data gabungan terbaru.</li>
                    <li>Gunakan tombol "Bersihkan" untuk menghapus file yang sudah tidak diperlukan dari Cloud agar penyimpanan tidak penuh.</li>
                </ol>
            </div>

            {/* Conflict Resolver Modal */}
            <ConflictResolver 
                isOpen={isConflictModalOpen} 
                conflicts={conflicts} 
                onResolve={handleConflictResolved} 
                onCancel={() => { setIsConflictModalOpen(false); setConflicts([]); }} 
            />
        </div>
    );
};
