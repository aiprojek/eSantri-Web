import React, { useState, useMemo } from 'react';
import { KatalogBuku } from './perpustakaan/KatalogBuku';
import { Sirkulasi } from './perpustakaan/Sirkulasi';
import { CetakPerpus } from './perpustakaan/CetakPerpus';
import { PengaturanPerpus } from './perpustakaan/PengaturanPerpus';
import { useLiveQuery } from "dexie-react-hooks";
import { db } from '../db';
import { useAppContext } from '../AppContext';
import { Buku, Sirkulasi as SirkulasiType } from '../types';
import { PageHeader } from './common/PageHeader';
import { HeaderTabs } from './common/HeaderTabs';
import { formatRupiah } from '../utils/formatters';
import { logActivity } from '../services/logService';

const Perpustakaan: React.FC = () => {
    const { currentUser, showToast } = useAppContext();
    const staffName = currentUser?.fullName || currentUser?.username || 'Petugas Perpus';
    const [activeTab, setActiveTab] = useState<'katalog' | 'sirkulasi' | 'cetak' | 'pengaturan'>('katalog');
    const [sirkulasiInitialFilter, setSirkulasiInitialFilter] = useState<'semua' | 'terlambat' | 'aktif'>('semua');

    // Central Data Fetching for Library Module
    const bukuList = useLiveQuery(() => db.buku.filter(b => !b.deleted).toArray(), []) || [];
    const sirkulasiList = useLiveQuery(() => db.sirkulasi.toArray(), []) || [];

    const canWrite = currentUser?.role === 'admin' || currentUser?.permissions?.perpustakaan === 'write';

    // Library Statistics & KPI metrics
    const stats = useMemo(() => {
        const todayStr = new Date().toISOString().split('T')[0];
        const activeLoans = sirkulasiList.filter(s => s.status === 'Dipinjam');
        const overdueLoans = activeLoans.filter(s => s.tanggalKembaliSeharusnya < todayStr);
        
        const totalJudul = bukuList.length;
        const totalStokTersedia = bukuList.reduce((acc, b) => acc + (Number(b.stok) || 0), 0);
        const totalEksemplar = totalStokTersedia + activeLoans.length;
        const totalDenda = sirkulasiList.reduce((acc, s) => acc + (Number(s.denda) || 0), 0);
        const outOfStockCount = bukuList.filter(b => (Number(b.stok) || 0) <= 0).length;

        return {
            totalJudul,
            totalEksemplar,
            totalStokTersedia,
            totalDipinjam: activeLoans.length,
            totalTerlambat: overdueLoans.length,
            totalDenda,
            outOfStockCount
        };
    }, [bukuList, sirkulasiList]);

    // Shared Actions
    const handleAddBuku = async (buku: Omit<Buku, 'id'>) => {
        if (!canWrite) return;
        const newId = await db.buku.add({ ...buku, lastModified: Date.now() } as Buku);
        void logActivity('INSERT', 'buku', String(newId), null, buku, staffName);
        showToast('Buku berhasil ditambahkan ke katalog', 'success');
    };

    const handleBulkAddBuku = async (data: Omit<Buku, 'id'>[]) => {
        if (!canWrite) return;
        const withTs = data.map(b => ({ ...b, lastModified: Date.now() }));
        await db.buku.bulkAdd(withTs as Buku[]);
        void logActivity('INSERT', 'buku', 'bulk', null, { count: data.length }, staffName);
        showToast(`${data.length} buku berhasil ditambahkan massal.`, 'success');
    };

    const handleUpdateBuku = async (buku: Buku) => {
        if (!canWrite) return;
        const oldBuku = await db.buku.get(buku.id);
        await db.buku.put({ ...buku, lastModified: Date.now() });
        void logActivity('UPDATE', 'buku', String(buku.id), oldBuku, buku, staffName);
        showToast('Data buku berhasil diperbarui', 'success');
    };

    const handleAdjustStok = async (bukuId: number, delta: number) => {
        if (!canWrite) return;
        const target = bukuList.find(b => b.id === bukuId);
        if (!target) return;
        const newStok = Math.max(0, (Number(target.stok) || 0) + delta);
        await db.buku.update(bukuId, { stok: newStok, lastModified: Date.now() });
        void logActivity('UPDATE', 'buku', String(bukuId), { stok: target.stok }, { stok: newStok }, staffName);
        showToast(`Stok "${target.judul}" disesuaikan jadi ${newStok}`, 'info');
    };

    const handleDeleteBuku = async (id: number) => {
         if (!canWrite) return;
         const buku = await db.buku.get(id);
         if(buku) {
             await db.buku.put({ ...buku, deleted: true, lastModified: Date.now() });
             void logActivity('DELETE', 'buku', String(id), buku, null, staffName);
             showToast('Buku berhasil dihapus dari katalog', 'success');
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
            showToast('Buku ini masih tercatat sedang dipinjam oleh santri yang sama.', 'error');
            return;
         }

         const today = new Date();
         const dueDate = new Date(today);
         dueDate.setDate(today.getDate() + durationDays);

         await (db as any).transaction('rw', db.sirkulasi, db.buku, async () => {
             // Kurangi stok buku
             await db.buku.update(bukuId, { stok: buku.stok - 1, lastModified: Date.now() });
             // Catat sirkulasi
             const sirkId = await db.sirkulasi.add({
                 santriId,
                 bukuId,
                 tanggalPinjam: today.toISOString().split('T')[0],
                 tanggalKembaliSeharusnya: dueDate.toISOString().split('T')[0],
                 status: 'Dipinjam',
                 denda: 0,
                 lastModified: Date.now()
             } as SirkulasiType);
             void logActivity('INSERT', 'sirkulasi', String(sirkId), null, { santriId, bukuId, dueDate: dueDate.toISOString().split('T')[0] }, staffName);
         });
         showToast('Peminjaman buku berhasil dicatat.', 'success');
    };

    const handleKembali = async (
        sirkulasiId: number, 
        denda: number, 
        statusKembali: 'Kembali' | 'Rusak' | 'Hilang' = 'Kembali', 
        catatan: string = ''
    ) => {
        if (!canWrite) return;
        const sirkulasi = sirkulasiList.find(s => s.id === sirkulasiId);
        if (!sirkulasi) return;
        if (sirkulasi.status !== 'Dipinjam') {
            showToast('Transaksi ini sudah diproses sebelumnya.', 'info');
            return;
        }
        const buku = bukuList.find(b => b.id === sirkulasi.bukuId);

        await (db as any).transaction('rw', db.sirkulasi, db.buku, async () => {
             // Jika status bukan 'Hilang', kembalikan stok buku ke rak
             if (buku && statusKembali !== 'Hilang') {
                 await db.buku.update(buku.id, { stok: (Number(buku.stok) || 0) + 1, lastModified: Date.now() });
             }
             // Update sirkulasi
             await db.sirkulasi.update(sirkulasiId, {
                 status: statusKembali,
                 tanggalDikembalikan: new Date().toISOString().split('T')[0],
                 denda: Math.max(0, denda || 0),
                 catatan: catatan.trim(),
                 lastModified: Date.now()
             });
             void logActivity('UPDATE', 'sirkulasi', String(sirkulasiId), sirkulasi, { status: statusKembali, denda, catatan }, staffName);
        });

        const statusLabel = statusKembali === 'Hilang' ? 'Tercatat Hilang' : statusKembali === 'Rusak' ? 'Kembali (Rusak)' : 'Berhasil Dikembalikan';
        showToast(`Buku ${statusLabel}.`, 'success');
    };

    const handlePerpanjang = async (sirkulasiId: number, additionalDays: number) => {
        if (!canWrite) return;
        const loan = sirkulasiList.find(s => s.id === sirkulasiId);
        if (!loan) return;
        
        const currentDue = new Date(loan.tanggalKembaliSeharusnya);
        currentDue.setDate(currentDue.getDate() + additionalDays);
        const newDueDate = currentDue.toISOString().split('T')[0];

        await db.sirkulasi.update(sirkulasiId, {
            tanggalKembaliSeharusnya: newDueDate,
            catatan: loan.catatan ? `${loan.catatan} (Diperpanjang +${additionalDays} hari)` : `Diperpanjang +${additionalDays} hari`,
            lastModified: Date.now()
        });
        void logActivity('UPDATE', 'sirkulasi', String(sirkulasiId), loan, { newDueDate, additionalDays }, staffName);
        showToast(`Batas pinjam diperpanjang +${additionalDays} hari (sampai ${newDueDate})`, 'success');
    };

    const handleJumpToOverdue = () => {
        setSirkulasiInitialFilter('terlambat');
        setActiveTab('sirkulasi');
    };

    return (
        <div className="space-y-6">
            <PageHeader
                eyebrow="Pendidikan & Literasi"
                title="Perpustakaan Digital"
                description="Pusat pengelolaan katalog koleksi buku, pelacakan sirkulasi peminjaman santri, denda keterlambatan, hingga pencetakan barcode dan kartu perpustakaan."
                tabs={
                    <HeaderTabs
                        value={activeTab}
                        onChange={(val) => {
                            setActiveTab(val as any);
                            if (val !== 'sirkulasi') {
                                setSirkulasiInitialFilter('semua');
                            }
                        }}
                        tabs={[
                            { value: 'katalog', label: 'Katalog Koleksi', icon: 'bi-journal-bookmark-fill' },
                            { value: 'sirkulasi', label: 'Sirkulasi & Peminjaman', icon: 'bi-arrow-left-right' },
                            { value: 'cetak', label: 'Cetak Kartu & Label', icon: 'bi-printer-fill' },
                            { value: 'pengaturan', label: 'Pengaturan & Kategori', icon: 'bi-gear-fill' },
                        ]}
                    />
                }
            />

            {/* KPI Executive Summary Cards */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
                {/* Judul Buku */}
                <div className="rounded-2xl border border-teal-100 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Judul Koleksi</span>
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
                            <i className="bi bi-book text-lg"></i>
                        </div>
                    </div>
                    <div className="mt-2 text-2xl font-black text-slate-800">{stats.totalJudul.toLocaleString('id-ID')}</div>
                    <p className="mt-1 text-xs text-slate-400">Total judul terdaftar</p>
                </div>

                {/* Total Fisik / Stok */}
                <div className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Fisik Buku</span>
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                            <i className="bi bi-bookshelf text-lg"></i>
                        </div>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-black text-slate-800">{stats.totalEksemplar.toLocaleString('id-ID')}</span>
                        <span className="text-xs font-medium text-emerald-600">({stats.totalStokTersedia} di rak)</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                        {stats.outOfStockCount > 0 ? `${stats.outOfStockCount} judul stok kosong` : 'Semua koleksi tersedia'}
                    </p>
                </div>

                {/* Sedang Dipinjam */}
                <div className="rounded-2xl border border-indigo-100 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Sedang Dipinjam</span>
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                            <i className="bi bi-person-lines-fill text-lg"></i>
                        </div>
                    </div>
                    <div className="mt-2 text-2xl font-black text-indigo-700">{stats.totalDipinjam}</div>
                    <p className="mt-1 text-xs text-slate-400">Buku ada di santri</p>
                </div>

                {/* Overdue Alert */}
                <div 
                    onClick={() => stats.totalTerlambat > 0 && handleJumpToOverdue()}
                    className={`rounded-2xl border p-4 shadow-sm transition-all ${
                        stats.totalTerlambat > 0 
                            ? 'border-rose-200 bg-rose-50/60 cursor-pointer hover:bg-rose-50 hover:shadow-md' 
                            : 'border-slate-100 bg-white'
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <span className={`text-xs font-semibold uppercase tracking-wider ${stats.totalTerlambat > 0 ? 'text-rose-700' : 'text-slate-500'}`}>
                            Jatuh Tempo / Lewat
                        </span>
                        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                            stats.totalTerlambat > 0 ? 'bg-rose-100 text-rose-600 animate-pulse' : 'bg-slate-100 text-slate-400'
                        }`}>
                            <i className="bi bi-clock-history text-lg"></i>
                        </div>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className={`text-2xl font-black ${stats.totalTerlambat > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                            {stats.totalTerlambat}
                        </span>
                        {stats.totalTerlambat > 0 && (
                            <span className="rounded-full bg-rose-200 px-2 py-0.5 text-[11px] font-bold text-rose-800">
                                Perlu Ditagih
                            </span>
                        )}
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                        {stats.totalTerlambat > 0 ? 'Klik untuk lihat daftar telat' : 'Semua pinjaman tepat waktu'}
                    </p>
                </div>

                {/* Total Denda */}
                <div className="col-span-2 sm:col-span-2 lg:col-span-4 xl:col-span-1 rounded-2xl border border-amber-100 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Kas Denda Terkumpul</span>
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                            <i className="bi bi-cash-stack text-lg"></i>
                        </div>
                    </div>
                    <div className="mt-2 text-xl font-black text-amber-700 truncate">{formatRupiah(stats.totalDenda)}</div>
                    <p className="mt-1 text-xs text-slate-400">Total denda yang dibukukan</p>
                </div>
            </div>

            {/* Overdue Banner if any */}
            {stats.totalTerlambat > 0 && activeTab !== 'sirkulasi' && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-gradient-to-r from-rose-50 via-rose-100/50 to-orange-50 p-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-500 text-white shadow-sm">
                            <i className="bi bi-exclamation-triangle-fill text-lg"></i>
                        </div>
                        <div>
                            <div className="font-bold text-rose-900">Perhatian: Ada {stats.totalTerlambat} peminjaman buku yang melewati batas waktu!</div>
                            <div className="text-xs text-rose-700 mt-0.5">Segera ingatkan santri atau proses pengembalian serta perhitungan denda keterlambatan.</div>
                        </div>
                    </div>
                    <button
                        onClick={handleJumpToOverdue}
                        className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-rose-700 transition-colors whitespace-nowrap"
                    >
                        <span>Lihat Peminjaman Telat</span>
                        <i className="bi bi-arrow-right"></i>
                    </button>
                </div>
            )}

            <div className="min-h-[500px]">
                {activeTab === 'katalog' && (
                    <KatalogBuku 
                        bukuList={bukuList} 
                        onAdd={handleAddBuku} 
                        onUpdate={handleUpdateBuku} 
                        onDelete={handleDeleteBuku}
                        onAdjustStok={handleAdjustStok}
                        onBulkAdd={handleBulkAddBuku}
                        onOpenPengaturan={() => setActiveTab('pengaturan')}
                        canWrite={canWrite}
                    />
                )}
                {activeTab === 'sirkulasi' && (
                    <Sirkulasi 
                        sirkulasiList={sirkulasiList}
                        bukuList={bukuList}
                        onPinjam={handlePinjam}
                        onKembali={handleKembali}
                        onPerpanjang={handlePerpanjang}
                        initialFilter={sirkulasiInitialFilter}
                        onOpenPengaturan={() => setActiveTab('pengaturan')}
                        canWrite={canWrite}
                    />
                )}
                {activeTab === 'cetak' && (
                    <CetakPerpus bukuList={bukuList} />
                )}
                {activeTab === 'pengaturan' && (
                    <PengaturanPerpus 
                        bukuList={bukuList}
                        canWrite={canWrite}
                    />
                )}
            </div>
        </div>
    );
};

export default Perpustakaan;
