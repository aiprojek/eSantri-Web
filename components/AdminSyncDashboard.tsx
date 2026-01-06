
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../AppContext';
import { listInboxFiles, processInboxFile, publishMasterData, getValidDropboxToken } from '../services/syncService';
import { SyncFileRecord } from '../types';
import { db } from '../db';
import { formatBytes } from '../utils/formatters';

export const AdminSyncDashboard: React.FC = () => {
    const { settings, showToast, showConfirmation, showAlert, currentUser } = useAppContext();
    const [files, setFiles] = useState<SyncFileRecord[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [processingId, setProcessingId] = useState<string | null>(null);

    const config = settings.cloudSyncConfig;

    const fetchFiles = async () => {
        if (config.provider !== 'dropbox') return;
        setIsLoading(true);
        try {
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

    const handleMerge = async (file: SyncFileRecord) => {
        setProcessingId(file.id);
        try {
            const result = await processInboxFile(config, file);
            
            // Log history using current user identity
            const mergerIdentity = currentUser?.username || 'Admin (Virtual)';

            await db.syncHistory.add({
                id: file.id,
                fileId: file.id,
                fileName: file.name,
                mergedAt: new Date().toISOString(),
                mergedBy: mergerIdentity,
                recordCount: result.recordCount
            });

            showToast(`Berhasil menggabungkan ${result.recordCount} data.`, 'success');
            
            // Update UI list
            setFiles(prev => prev.map(f => f.id === file.id ? { ...f, status: 'merged' } : f));

        } catch (e) {
            showAlert('Gagal Menggabungkan Data', (e as Error).message);
        } finally {
            setProcessingId(null);
        }
    };

    const handlePublishMaster = async () => {
        showConfirmation(
            'Publikasikan Master Data?',
            'Ini akan menimpa file Master di Cloud dengan data gabungan yang ada di komputer Anda saat ini. Pastikan Anda sudah menggabungkan (Merge) semua update terbaru dari staff.',
            async () => {
                setIsLoading(true);
                try {
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
                    const token = await getValidDropboxToken(config);
                    await fetch('https://api.dropboxapi.com/2/files/delete_v2', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ path: file.path_lower })
                    });
                    setFiles(prev => prev.filter(f => f.id !== file.id));
                    showToast('File dihapus.', 'success');
                } catch(e) {
                    showToast('Gagal menghapus file.', 'error');
                }
            },
            { confirmColor: 'red', confirmText: 'Hapus' }
        );
    }

    if (config.provider !== 'dropbox') {
        return (
            <div className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-lg border border-gray-200">
                <i className="bi bi-cloud-slash text-4xl text-gray-400 mb-2"></i>
                <p className="text-gray-500">Fitur ini hanya tersedia untuk metode sinkronisasi Dropbox.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-800">Pusat Sinkronisasi (Pengepul)</h1>
                <div className="flex gap-2">
                    <button onClick={fetchFiles} className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 text-sm">
                        <i className="bi bi-arrow-repeat"></i> Segarkan
                    </button>
                    <button onClick={handlePublishMaster} disabled={isLoading} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-bold shadow-sm flex items-center gap-2">
                        {isLoading ? <span className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent"></span> : <i className="bi bi-cloud-arrow-up-fill"></i>}
                        Publikasikan Master
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b bg-gray-50 flex justify-between items-center">
                    <h3 className="font-bold text-gray-700">Inbox: Update dari Staff</h3>
                    <span className="text-xs text-gray-500">Total File: {files.length}</span>
                </div>
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-500 border-b">
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
                                    {file.name}
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
                            <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400">Tidak ada file update baru dari staff.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
            
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                <strong>Panduan Admin Pengepul:</strong>
                <ol className="list-decimal pl-5 mt-1 space-y-1">
                    <li>Klik "Segarkan" untuk melihat file kiriman staff.</li>
                    <li>Klik "Gabung" pada file baru untuk memasukkan data staff ke database Admin (Merge Cerdas: Data baru ditambah, Data lama diperbarui jika timestamp lebih baru).</li>
                    <li>Setelah semua file digabung, klik "Publikasikan Master" agar seluruh staff bisa mendownload data gabungan terbaru.</li>
                </ol>
            </div>
        </div>
    );
};
