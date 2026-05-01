
import React, { useEffect, useState, useCallback } from 'react';
import { AuditLog } from '../types';
import { useAppContext } from '../AppContext';
import { db } from '../db';
import { Pagination } from './common/Pagination';
import { PageHeader } from './common/PageHeader';
import { SectionCard } from './common/SectionCard';
import { EmptyState } from './common/EmptyState';

export const AuditLogView: React.FC = () => {
    const { settings } = useAppContext();
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    // Filters & Pagination State
    const [filterTable, setFilterTable] = useState('');
    const [filterOp, setFilterOp] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const itemsPerPage = 20;

    const fetchLogs = useCallback(async () => {
        setIsLoading(true);
        try {
            let collection = db.auditLogs.orderBy('created_at').reverse();

            // Apply Filters at DB Level (Dexie)
            if (filterTable || filterOp) {
                collection = collection.filter(log => {
                    const tableMatch = !filterTable || log.table_name.toLowerCase().includes(filterTable.toLowerCase());
                    const opMatch = !filterOp || log.operation === filterOp;
                    return tableMatch && opMatch;
                });
            }

            // 1. Get Total Count (for Pagination UI)
            const count = await collection.count();
            setTotalItems(count);

            // 2. Get Data Slice (Offset & Limit)
            const offset = (currentPage - 1) * itemsPerPage;
            const data = await collection.offset(offset).limit(itemsPerPage).toArray();
            
            setLogs(data);
            setError(null);
        } catch (err: any) {
            console.error("Error fetching logs:", err);
            setError(err.message || "Gagal mengambil data log.");
        } finally {
            setIsLoading(false);
        }
    }, [currentPage, filterTable, filterOp, settings.cloudSyncConfig]);

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [filterTable, filterOp]);

    // Fetch data when dependencies change
    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    const totalPages = Math.ceil(totalItems / itemsPerPage);

    const getOpColor = (op: string) => {
        switch(op) {
            case 'INSERT': return 'bg-green-100 text-green-800';
            case 'UPDATE': return 'bg-blue-100 text-blue-800';
            case 'DELETE': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const formatDiff = (oldData: any, newData: any) => {
        if (!oldData && newData) return <span className="text-green-600 font-bold">Data Baru dibuat</span>;
        if (oldData && !newData) return <span className="text-red-600 font-bold">Data Dihapus</span>;
        
        const changes: JSX.Element[] = [];
        const allKeys = new Set([...Object.keys(oldData || {}), ...Object.keys(newData || {})]);
        
        allKeys.forEach(key => {
            if (['lastModified', 'updatedAt', 'createdAt', 'updated_at', 'created_at'].includes(key)) return;
            
            const valOld = oldData?.[key];
            const valNew = newData?.[key];
            
            if (JSON.stringify(valOld) !== JSON.stringify(valNew)) {
                let displayOld = JSON.stringify(valOld);
                let displayNew = JSON.stringify(valNew);
                
                if (displayOld?.length > 40) displayOld = displayOld.substring(0, 40) + '...';
                if (displayNew?.length > 40) displayNew = displayNew.substring(0, 40) + '...';

                changes.push(
                    <div key={key} className="flex flex-wrap items-center gap-1 border-b border-gray-50 py-1 last:border-0">
                        <span className="font-bold text-[10px] text-gray-400 uppercase w-16">{key}:</span>
                        <div className="flex items-center gap-1">
                            <span className="bg-red-50 text-red-700 px-1 rounded line-through decoration-red-300">{displayOld === 'undefined' ? '-' : displayOld}</span>
                            <i className="bi bi-arrow-right text-gray-300"></i>
                            <span className="bg-green-50 text-green-700 px-1 rounded font-bold">{displayNew === 'undefined' ? '-' : displayNew}</span>
                        </div>
                    </div>
                );
            }
        });
        
        if (changes.length === 0) return <span className="text-gray-400 italic">Tidak ada perubahan field (mungkin metadata)</span>;
        return <div className="space-y-0.5">{changes}</div>;
    };

    if (error) {
        return (
            <div className="p-6 bg-red-50 border border-red-200 rounded-lg text-center">
                <i className="bi bi-exclamation-triangle text-4xl text-red-500 mb-2 block"></i>
                <h3 className="text-lg font-bold text-red-700">Terjadi Kesalahan</h3>
                <p className="text-gray-600">{error}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <PageHeader
                eyebrow="Sistem"
                title="Log Aktivitas Sistem"
                description="Telusuri jejak perubahan data dan aktivitas sistem untuk audit internal pesantren."
                actions={
                    settings.cloudSyncConfig?.provider === 'firebase' ? (
                        <span className="app-chip">
                            <i className="bi bi-cloud-check-fill"></i>
                            Mode Firebase Realtime
                        </span>
                    ) : (
                        <span className="app-chip">
                            <i className="bi bi-hdd-fill"></i>
                            Mode Lokal / File-Sync
                        </span>
                    )
                }
            />
            
            <SectionCard title="Riwayat Perubahan Data" description="Filter log berdasarkan tabel dan jenis operasi untuk menelusuri perubahan sistem." contentClassName="p-6">
                <div className="mb-6 grid grid-cols-1 gap-2 md:grid-cols-[1.4fr_1fr_auto_auto] md:items-center">
                    <input
                        type="text"
                        placeholder="Filter Nama Tabel..."
                        value={filterTable}
                        onChange={e => setFilterTable(e.target.value)}
                        className="app-input p-2.5 text-sm"
                    />
                    <select
                        value={filterOp}
                        onChange={e => setFilterOp(e.target.value)}
                        className="app-select p-2.5 text-sm"
                    >
                        <option value="">Semua Operasi</option>
                        <option value="INSERT">INSERT (Tambah)</option>
                        <option value="UPDATE">UPDATE (Ubah)</option>
                        <option value="DELETE">DELETE (Hapus)</option>
                    </select>
                    <button
                        onClick={() => {
                            setFilterTable('');
                            setFilterOp('');
                        }}
                        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                    >
                        Reset
                    </button>
                    <div className="flex items-center justify-between gap-2 md:justify-end">
                        {isLoading && <span className="flex items-center text-sm text-gray-500"><i className="bi bi-arrow-repeat animate-spin mr-2"></i> Memuat...</span>}
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">Total: {totalItems} Log</span>
                    </div>
                </div>

                <div className="hidden md:block app-table-shell overflow-x-auto">
                    <table className="min-w-full divide-y divide-app-border text-sm">
                        <thead className="uppercase font-medium">
                            <tr>
                                <th className="px-4 py-3 text-left">Waktu</th>
                                <th className="px-4 py-3 text-left">Admin</th>
                                <th className="px-4 py-3 text-left">Tabel</th>
                                <th className="px-4 py-3 text-center">Aksi</th>
                                <th className="px-4 py-3 text-left">Detail Perubahan</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {logs.map(log => (
                                <tr key={log.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                                        {new Date(log.created_at).toLocaleString('id-ID')}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-700">
                                        {log.username || log.changed_by?.substring(0, 8) || 'System'}
                                    </td>
                                    <td className="px-4 py-3 font-mono text-xs text-gray-600">
                                        {log.table_name} <span className="text-gray-400">#{log.record_id}</span>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${getOpColor(log.operation)}`}>
                                            {log.operation}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-gray-600 font-mono break-all max-w-md">
                                        {log.operation === 'UPDATE' 
                                            ? formatDiff(log.old_data, log.new_data)
                                            : (log.operation === 'INSERT' ? 'Data baru ditambahkan' : 'Data dihapus')
                                        }
                                    </td>
                                </tr>
                            ))}
                            {logs.length === 0 && !isLoading && (
                                <tr>
                                    <td colSpan={5} className="p-4"><EmptyState icon="bi-activity" title="Belum ada log aktivitas" description="Log perubahan sistem akan tampil di sini setelah aktivitas mulai tercatat." /></td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="md:hidden space-y-3">
                    {logs.map(log => (
                        <article key={log.id} className="rounded-lg border border-gray-200 bg-white p-3">
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <div className="text-xs text-gray-500">{new Date(log.created_at).toLocaleString('id-ID')}</div>
                                    <div className="text-sm font-semibold text-gray-800">{log.table_name} <span className="text-[11px] text-gray-500">#{log.record_id}</span></div>
                                </div>
                                <span className={`px-2 py-1 rounded text-[11px] font-bold ${getOpColor(log.operation)}`}>
                                    {log.operation}
                                </span>
                            </div>
                            <div className="mt-2 text-xs text-gray-600">Admin: <span className="font-medium text-gray-700">{log.username || log.changed_by?.substring(0, 8) || 'System'}</span></div>
                            <div className="mt-2 text-xs text-gray-600 font-mono break-all">
                                {log.operation === 'UPDATE'
                                    ? formatDiff(log.old_data, log.new_data)
                                    : (log.operation === 'INSERT' ? 'Data baru ditambahkan' : 'Data dihapus')
                                }
                            </div>
                        </article>
                    ))}
                    {logs.length === 0 && !isLoading && (
                        <div className="p-4">
                            <EmptyState icon="bi-activity" title="Belum ada log aktivitas" description="Log perubahan sistem akan tampil di sini setelah aktivitas mulai tercatat." />
                        </div>
                    )}
                </div>

                <div className="mt-4">
                    <Pagination 
                        currentPage={currentPage} 
                        totalPages={totalPages} 
                        onPageChange={setCurrentPage} 
                    />
                </div>
            </SectionCard>
        </div>
    );
};
