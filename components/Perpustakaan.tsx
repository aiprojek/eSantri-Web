
import React, { useState } from 'react';
import { KatalogBuku } from './perpustakaan/KatalogBuku';
import { Sirkulasi } from './perpustakaan/Sirkulasi';
import { CetakPerpus } from './perpustakaan/CetakPerpus';
import { useLiveQuery } from "dexie-react-hooks";
import { db } from '../db';
import { useAppContext } from '../AppContext';
import { Buku, Sirkulasi as SirkulasiType } from '../types';
import { PageHeader } from './common/PageHeader';
import { HeaderTabs } from './common/HeaderTabs';

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
         const masihDipinjam = sirkulasiList.some(
            (item) => item.status === 'Dipinjam' && item.bukuId === bukuId && item.santriId === santriId
         );
         if (masihDipinjam) {
            showToast('Buku ini masih tercatat dipinjam oleh santri yang sama.', 'error');
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
        if (sirkulasi.status !== 'Dipinjam') {
            showToast('Transaksi ini sudah diproses sebelumnya.', 'info');
            return;
        }
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
            <PageHeader
                eyebrow="Pendidikan"
                title="Perpustakaan Digital"
                description="Kelola katalog buku, sirkulasi peminjaman, dan pencetakan kartu perpustakaan dari panel yang lebih konsisten."
                tabs={
                    <HeaderTabs
                        value={activeTab}
                        onChange={setActiveTab}
                        tabs={[
                            { value: 'katalog', label: 'Katalog Buku', icon: 'bi-book' },
                            { value: 'sirkulasi', label: 'Sirkulasi', icon: 'bi-arrow-left-right' },
                            { value: 'cetak', label: 'Cetak Kartu', icon: 'bi-printer' },
                        ]}
                    />
                }
            />

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
