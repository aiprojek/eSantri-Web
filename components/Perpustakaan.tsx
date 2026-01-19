
import React, { useState } from 'react';
import { KatalogBuku } from './perpustakaan/KatalogBuku';
import { Sirkulasi } from './perpustakaan/Sirkulasi';
import { CetakPerpus } from './perpustakaan/CetakPerpus';
import { useLiveQuery } from "dexie-react-hooks";
import { db } from '../db';
import { useAppContext } from '../AppContext';
import { Buku, Sirkulasi as SirkulasiType } from '../types';

const Perpustakaan: React.FC = () => {
    const { currentUser, showToast } = useAppContext();
    const [activeTab, setActiveTab] = useState<'katalog' | 'sirkulasi' | 'cetak'>('katalog');

    // Central Data Fetching for Library Module
    const bukuList = useLiveQuery(() => db.buku.filter(b => !b.deleted).toArray(), []) || [];
    const sirkulasiList = useLiveQuery(() => db.sirkulasi.toArray(), []) || [];

    const canWrite = currentUser?.role === 'admin' || currentUser?.permissions?.perpustakaan === 'write';

    // Shared Actions
    const handleAddBuku = async (buku: Omit<Buku, 'id'>) => {
        if (!canWrite) return;
        await db.buku.add({ ...buku, lastModified: Date.now() } as Buku);
        showToast('Buku berhasil ditambahkan', 'success');
    };

    const handleBulkAddBuku = async (data: Omit<Buku, 'id'>[]) => {
        if (!canWrite) return;
        const withTs = data.map(b => ({ ...b, lastModified: Date.now() }));
        await db.buku.bulkAdd(withTs as Buku[]);
        showToast(`${data.length} buku berhasil ditambahkan.`, 'success');
    };

    const handleUpdateBuku = async (buku: Buku) => {
        if (!canWrite) return;
        await db.buku.put({ ...buku, lastModified: Date.now() });
        showToast('Buku berhasil diperbarui', 'success');
    };

    const handleDeleteBuku = async (id: number) => {
         if (!canWrite) return;
         const buku = await db.buku.get(id);
         if(buku) {
             await db.buku.put({ ...buku, deleted: true, lastModified: Date.now() });
             showToast('Buku dihapus', 'success');
         }
    };

    const handlePinjam = async (santriId: number, bukuId: number, durationDays: number) => {
         if (!canWrite) return;
         const buku = bukuList.find(b => b.id === bukuId);
         if (!buku || buku.stok < 1) {
             showToast('Stok buku habis atau tidak ditemukan.', 'error');
             return;
         }

         const today = new Date();
         const dueDate = new Date(today);
         dueDate.setDate(today.getDate() + durationDays);

         await (db as any).transaction('rw', db.sirkulasi, db.buku, async () => {
             // Kurangi stok
             await db.buku.update(bukuId, { stok: buku.stok - 1, lastModified: Date.now() });
             // Catat sirkulasi
             await db.sirkulasi.add({
                 santriId,
                 bukuId,
                 tanggalPinjam: today.toISOString().split('T')[0],
                 tanggalKembaliSeharusnya: dueDate.toISOString().split('T')[0],
                 status: 'Dipinjam',
                 denda: 0,
                 lastModified: Date.now()
             } as SirkulasiType);
         });
         showToast('Peminjaman berhasil dicatat.', 'success');
    };

    const handleKembali = async (sirkulasiId: number, denda: number, catatan: string) => {
        if (!canWrite) return;
        const sirkulasi = sirkulasiList.find(s => s.id === sirkulasiId);
        if (!sirkulasi) return;
        const buku = bukuList.find(b => b.id === sirkulasi.bukuId);

        await (db as any).transaction('rw', db.sirkulasi, db.buku, async () => {
             // Kembalikan stok
             if(buku) await db.buku.update(buku.id, { stok: buku.stok + 1, lastModified: Date.now() });
             // Update sirkulasi
             await db.sirkulasi.update(sirkulasiId, {
                 status: 'Kembali',
                 tanggalDikembalikan: new Date().toISOString().split('T')[0],
                 denda,
                 catatan,
                 lastModified: Date.now()
             });
        });
        showToast('Buku berhasil dikembalikan.', 'success');
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-800">Perpustakaan Digital</h1>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 sticky top-0 z-40">
                <nav className="flex -mb-px">
                    <button onClick={() => setActiveTab('katalog')} className={`flex-1 py-4 text-center border-b-2 font-medium text-sm transition-colors ${activeTab === 'katalog' ? 'border-teal-600 text-teal-600 bg-teal-50' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                        <i className="bi bi-book mr-2"></i> Katalog Buku
                    </button>
                    <button onClick={() => setActiveTab('sirkulasi')} className={`flex-1 py-4 text-center border-b-2 font-medium text-sm transition-colors ${activeTab === 'sirkulasi' ? 'border-teal-600 text-teal-600 bg-teal-50' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                        <i className="bi bi-arrow-left-right mr-2"></i> Sirkulasi
                    </button>
                    <button onClick={() => setActiveTab('cetak')} className={`flex-1 py-4 text-center border-b-2 font-medium text-sm transition-colors ${activeTab === 'cetak' ? 'border-teal-600 text-teal-600 bg-teal-50' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                        <i className="bi bi-printer mr-2"></i> Cetak Kartu
                    </button>
                </nav>
            </div>

            <div className="min-h-[500px]">
                {activeTab === 'katalog' && (
                    <KatalogBuku 
                        bukuList={bukuList} 
                        onAdd={handleAddBuku} 
                        onUpdate={handleUpdateBuku} 
                        onDelete={handleDeleteBuku}
                        onBulkAdd={handleBulkAddBuku}
                        canWrite={canWrite}
                    />
                )}
                {activeTab === 'sirkulasi' && (
                    <Sirkulasi 
                        sirkulasiList={sirkulasiList}
                        bukuList={bukuList}
                        onPinjam={handlePinjam}
                        onKembali={handleKembali}
                        canWrite={canWrite}
                    />
                )}
                {activeTab === 'cetak' && (
                    <CetakPerpus bukuList={bukuList} />
                )}
            </div>
        </div>
    );
};

export default Perpustakaan;
