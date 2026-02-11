
import React, { useEffect, useState, useCallback } from 'react';
import { AuditLog } from '../types';
import { useAppContext } from '../AppContext';
import { db } from '../db';
import { Pagination } from './common/Pagination';

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
        if (!oldData && newData) return "Data Baru dibuat";
        if (oldData && !newData) return "Data Dihapus";
        
        const changes: string[] = [];
        // Simple shallow comparison for display
        if (typeof newData === 'object' && newData !== null) {
            Object.keys(newData).forEach(key => {
                if (JSON.stringify(newData[key]) !== JSON.stringify(oldData[key])) {
                    // Ignore lengthy fields for clean UI
                    if (key === 'updated_at' || key === 'created_at') return;
                    let valOld = JSON.stringify(oldData[key]);
                    let valNew = JSON.stringify(newData[key]);
                    if (valOld?.length > 20) valOld = valOld.substring(0, 20) + '...';
                    if (valNew?.length > 20) valNew = valNew.substring(0, 20) + '...';
                    changes.push(`${key}: ${valOld} -> ${valNew}`);
                }
            });
        }
        
        if (changes.length === 0) return "Tidak ada perubahan signifikan (mungkin timestamp)";
        return changes.join(', ');
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
        <div>
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Log Aktivitas Sistem</h1>
                <p className="text-sm text-gray-500 mt-1">
                    <span className="text-blue-600 font-semibold"><i className="bi bi-hdd-fill"></i> Mode Lokal (Offline/File-Sync)</span>
                </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex flex-wrap gap-4 mb-6">
                    <input 
                        type="text" 
                        placeholder="Filter Nama Tabel..." 
                        value={filterTable}
                        onChange={e => setFilterTable(e.target.value)}
                        className="bg-gray-50 border border-gray-300 text-sm rounded-lg p-2.5"
                    />
                    <select 
                        value={filterOp} 
                        onChange={e => setFilterOp(e.target.value)} 
                        className="bg-gray-50 border border-gray-300 text-sm rounded-lg p-2.5"
                    >
                        <option value="">Semua Operasi</option>
                        <option value="INSERT">INSERT (Tambah)</option>
                        <option value="UPDATE">UPDATE (Ubah)</option>
                        <option value="DELETE">DELETE (Hapus)</option>
                    </select>
                    <div className="ml-auto flex items-center gap-2">
                        {isLoading && <span className="flex items-center text-sm text-gray-500"><i className="bi bi-arrow-repeat animate-spin mr-2"></i> Memuat...</span>}
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">Total: {totalItems} Log</span>
                    </div>
                </div>

                <div className="overflow-x-auto border rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50 text-gray-500 uppercase font-medium">
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
                                    <td colSpan={5} className="text-center py-8 text-gray-500">Belum ada log aktivitas yang tercatat.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="mt-4">
                    <Pagination 
                        currentPage={currentPage} 
                        totalPages={totalPages} 
                        onPageChange={setCurrentPage} 
                    />
                </div>
            </div>
        </div>
    );
};
