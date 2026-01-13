
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../AppContext';
import { RaporRecord } from '../../types';
import { db } from '../../db';

export const TabDataNilai: React.FC = () => {
    const { settings, santriList, showConfirmation, showToast, currentUser } = useAppContext();
    const canWrite = currentUser?.role === 'admin' || currentUser?.permissions?.akademik === 'write';

    const [filterTahun, setFilterTahun] = useState<string>('');
    const [filterSemester, setFilterSemester] = useState<'Ganjil' | 'Genap'>('Ganjil');
    const [filterRombel, setFilterRombel] = useState('');
    const [archiveRecords, setArchiveRecords] = useState<RaporRecord[]>([]);
    const [availableYears, setAvailableYears] = useState<string[]>([]);

    useEffect(() => {
        const fetchRecords = async () => {
            const all = await db.raporRecords.toArray();
            
            // Ekstrak Tahun Ajaran Unik dari Database
            const uniqueYears: string[] = Array.from(new Set(all.map(r => r.tahunAjaran))).sort().reverse() as string[];
            setAvailableYears(uniqueYears);

            // Set default filter tahun jika kosong dan ada data
            let currentYearFilter = filterTahun;
            if (!currentYearFilter && uniqueYears.length > 0) {
                currentYearFilter = uniqueYears[0];
                setFilterTahun(uniqueYears[0]);
            } else if (!currentYearFilter) {
                // Fallback default jika DB kosong
                currentYearFilter = '2024/2025'; 
                setFilterTahun('2024/2025');
            }

            let filtered = all.filter(r => r.tahunAjaran === currentYearFilter && r.semester === filterSemester);
            
            if (filterRombel) {
                filtered = filtered.filter(r => r.rombelId === parseInt(filterRombel));
            }
            setArchiveRecords(filtered);
        };
        fetchRecords();
    }, [filterTahun, filterSemester, filterRombel]);

    const handleDeleteRecord = (id: number) => {
        showConfirmation('Hapus Data Rapor?', 'Data nilai santri ini akan dihapus dari arsip.', async () => {
            await db.raporRecords.delete(id);
            
            // Refresh data lokal
            setArchiveRecords(prev => prev.filter(p => p.id !== id));
            
            // Cek ulang tahun ajaran jika data habis (opsional, tapi bagus untuk konsistensi)
            const remaining = await db.raporRecords.toArray();
            const uniqueYears: string[] = Array.from(new Set(remaining.map(r => r.tahunAjaran))).sort().reverse() as string[];
            setAvailableYears(uniqueYears);

            showToast('Data rapor dihapus.', 'success');
        }, { confirmColor: 'red' });
    }

    return (
        <div className="space-y-6">
            <div className="bg-yellow-50 p-4 border-l-4 border-yellow-500 text-yellow-800 rounded-r-lg mb-4 text-sm">
                <i className="bi bi-exclamation-circle-fill mr-2"></i>
                Halaman ini khusus untuk <strong>Manajemen Data Mentah (Arsip)</strong>. Gunakan tab <strong>"5. Cetak Rapor"</strong> untuk mencetak rapor siswa.
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-lg border border-gray-200 flex flex-wrap gap-4 items-end">
                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Tahun Ajaran</label>
                    {availableYears.length > 0 ? (
                        <select value={filterTahun} onChange={e => setFilterTahun(e.target.value)} className="border rounded p-2 text-sm w-32 bg-white">
                            {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    ) : (
                        <input type="text" value={filterTahun} onChange={e => setFilterTahun(e.target.value)} className="border rounded p-2 text-sm w-32" placeholder="2024/2025" />
                    )}
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Semester</label>
                    <select value={filterSemester} onChange={e => setFilterSemester(e.target.value as any)} className="border rounded p-2 text-sm w-32">
                        <option value="Ganjil">Ganjil</option><option value="Genap">Genap</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Rombel</label>
                    <select value={filterRombel} onChange={e => setFilterRombel(e.target.value)} className="border rounded p-2 text-sm w-48">
                        <option value="">Semua Rombel</option>
                        {settings.rombel.map(r => <option key={r.id} value={r.id}>{r.nama}</option>)}
                    </select>
                </div>
                <div className="ml-auto flex items-center">
                    <span className="text-sm text-gray-500 italic mr-2">Total Data: {archiveRecords.length}</span>
                </div>
            </div>

            {/* Data Table */}
            <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-600 border-b">
                        <tr>
                            <th className="p-3 w-10">No</th>
                            <th className="p-3">Nama Santri</th>
                            <th className="p-3">Rombel</th>
                            <th className="p-3 text-center">Waktu Import</th>
                            <th className="p-3 text-center">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {archiveRecords.length > 0 ? (
                            archiveRecords.map((rec, idx) => {
                                const santri = santriList.find(s => s.id === rec.santriId);
                                const rombelName = settings.rombel.find(r => r.id === rec.rombelId)?.nama || '-';
                                return (
                                    <tr key={rec.id} className="hover:bg-gray-50">
                                        <td className="p-3 text-center">{idx + 1}</td>
                                        <td className="p-3 font-medium">{santri ? santri.namaLengkap : `Unknown (ID: ${rec.santriId})`}</td>
                                        <td className="p-3">{rombelName}</td>
                                        <td className="p-3 text-center text-xs text-gray-500">{new Date(rec.tanggalRapor).toLocaleString()}</td>
                                        <td className="p-3 text-center flex justify-center gap-2">
                                            {canWrite && <button onClick={() => handleDeleteRecord(rec.id)} className="text-red-600 hover:bg-red-50 p-1.5 rounded flex items-center gap-1 text-xs font-bold border border-red-200" title="Hapus Data"><i className="bi bi-trash"></i> Hapus</button>}
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr><td colSpan={5} className="p-8 text-center text-gray-400">Belum ada data rapor untuk periode {filterTahun} ({filterSemester}).</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
