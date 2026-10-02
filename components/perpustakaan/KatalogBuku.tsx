import React, { useState, useMemo } from 'react';
import { Buku } from '../../types';
import { BulkBukuEditor } from './modals/BulkBukuEditor';
import ConfirmModal from '../ConfirmModal';
import { useAppContext } from '../../AppContext';

interface KatalogBukuProps {
    bukuList: Buku[];
    onAdd: (buku: Omit<Buku, 'id'>) => void;
    onUpdate: (buku: Buku) => void;
    onDelete: (id: number) => void;
    onAdjustStok?: (id: number, delta: number) => void;
    onBulkAdd: (data: Omit<Buku, 'id'>[]) => Promise<void>;
    onOpenPengaturan?: () => void;
    canWrite: boolean;
}

const DEFAULT_CATEGORIES = [
    'Kitab Kuning',
    'Buku Pelajaran',
    'Umum',
    'Referensi',
    'Tafsir & Hadits',
    'Fiqih & Ushul',
    'Bahasa Arab',
    'Kamus & Ensiklopedia',
    'Sejarah Islam (Tarikh)',
    'Akhlak & Tasawuf'
];

export const KatalogBuku: React.FC<KatalogBukuProps> = ({ 
    bukuList, 
    onAdd, 
    onUpdate, 
    onDelete, 
    onAdjustStok,
    onBulkAdd, 
    onOpenPengaturan,
    canWrite 
}) => {
    const { settings, onSaveSettings, showToast } = useAppContext();

    // Filters & Search
    const [searchTerm, setSearchTerm] = useState('');
    const [filterKategori, setFilterKategori] = useState('');
    const [filterRak, setFilterRak] = useState('');
    const [filterStokStatus, setFilterStokStatus] = useState<'all' | 'tersedia' | 'habis'>('all');

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(25);

    // Modals
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isBulkOpen, setIsBulkOpen] = useState(false);
    const [editingBuku, setEditingBuku] = useState<Partial<Buku>>({});
    const [modalError, setModalError] = useState<string | null>(null);
    const [customKategoriMode, setCustomKategoriMode] = useState(false);

    // Delete Confirmation
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; bukuId?: number; bukuTitle?: string }>({
        isOpen: false
    });

    // Dynamic Categories & Shelves from actual data & persistent settings
    const categoryOptions = useMemo(() => {
        const masterList = settings.perpusConfig?.kategoriKoleksi && settings.perpusConfig.kategoriKoleksi.length > 0
            ? settings.perpusConfig.kategoriKoleksi
            : DEFAULT_CATEGORIES;
        const set = new Set<string>(masterList);
        bukuList.forEach(b => {
            if (b.kategori && b.kategori.trim()) {
                set.add(b.kategori.trim());
            }
        });
        return Array.from(set).sort();
    }, [bukuList, settings.perpusConfig?.kategoriKoleksi]);

    const rakOptions = useMemo(() => {
        const set = new Set<string>();
        bukuList.forEach(b => {
            if (b.lokasiRak && b.lokasiRak.trim()) {
                set.add(b.lokasiRak.trim());
            }
        });
        return Array.from(set).sort();
    }, [bukuList]);

    // Filtered Books
    const filteredBuku = useMemo(() => {
        return bukuList.filter(b => {
            const term = searchTerm.toLowerCase().trim();
            const matchSearch = !term || 
                b.judul.toLowerCase().includes(term) || 
                b.kodeBuku.toLowerCase().includes(term) || 
                (b.penulis && b.penulis.toLowerCase().includes(term)) ||
                (b.penerbit && b.penerbit.toLowerCase().includes(term)) ||
                (b.lokasiRak && b.lokasiRak.toLowerCase().includes(term));
            
            const matchKategori = !filterKategori || b.kategori === filterKategori;
            const matchRak = !filterRak || b.lokasiRak === filterRak;
            
            let matchStok = true;
            if (filterStokStatus === 'tersedia') {
                matchStok = (Number(b.stok) || 0) > 0;
            } else if (filterStokStatus === 'habis') {
                matchStok = (Number(b.stok) || 0) <= 0;
            }

            return matchSearch && matchKategori && matchRak && matchStok;
        });
    }, [bukuList, searchTerm, filterKategori, filterRak, filterStokStatus]);

    // Paginated Slices
    const totalPages = Math.max(1, Math.ceil(filteredBuku.length / itemsPerPage));
    const currentSlice = useMemo(() => {
        const validPage = Math.min(currentPage, totalPages);
        const start = (validPage - 1) * itemsPerPage;
        return filteredBuku.slice(start, start + itemsPerPage);
    }, [filteredBuku, currentPage, totalPages, itemsPerPage]);

    // Reset pagination when filter changes
    const handleFilterChange = (setter: (val: any) => void, value: any) => {
        setter(value);
        setCurrentPage(1);
    };

    const handleSave = () => {
        setModalError(null);
        const kode = editingBuku.kodeBuku?.trim();
        const judul = editingBuku.judul?.trim();

        if (!kode || !judul) {
            setModalError('Judul Buku dan Kode Buku wajib diisi.');
            return;
        }

        // Check duplicate code
        const isDuplicate = bukuList.some(
            b => b.id !== editingBuku.id && b.kodeBuku.trim().toLowerCase() === kode.toLowerCase()
        );
        if (isDuplicate) {
            setModalError(`Kode Buku "${kode}" sudah digunakan oleh buku lain. Mohon gunakan kode unik.`);
            return;
        }

        const finalKategori = editingBuku.kategori?.trim() || 'Kitab Kuning';
        const stokVal = Number(editingBuku.stok);
        const bukuData: Buku = {
            id: editingBuku.id as any,
            kodeBuku: kode.toUpperCase(),
            judul: judul,
            kategori: finalKategori,
            penulis: editingBuku.penulis?.trim() || '',
            penerbit: editingBuku.penerbit?.trim() || '',
            tahunTerbit: editingBuku.tahunTerbit ? Number(editingBuku.tahunTerbit) : undefined,
            stok: isNaN(stokVal) ? 0 : Math.max(0, stokVal),
            lokasiRak: editingBuku.lokasiRak?.trim() || ''
        };

        // If user entered a new category, automatically persist it into master categories so it never has to be typed again!
        if (canWrite && finalKategori) {
            const currentList = settings.perpusConfig?.kategoriKoleksi || DEFAULT_CATEGORIES;
            if (!currentList.some(c => c.toLowerCase() === finalKategori.toLowerCase())) {
                const updatedList = [...currentList, finalKategori];
                onSaveSettings({
                    ...settings,
                    perpusConfig: {
                        ...(settings.perpusConfig || { dendaPerHari: 1000, durasiPinjamDefault: 7, maksPinjamBuku: 3 }),
                        kategoriKoleksi: updatedList
                    }
                }).catch(() => {});
            }
        }

        if (editingBuku.id) {
            onUpdate(bukuData);
        } else {
            const { id, ...newBuku } = bukuData;
            onAdd(newBuku);
        }
        setIsModalOpen(false);
    };

    const openModal = (buku?: Buku) => {
        setModalError(null);
        setCustomKategoriMode(false);
        if (buku) {
            setEditingBuku({ ...buku });
            if (buku.kategori && !DEFAULT_CATEGORIES.includes(buku.kategori)) {
                setCustomKategoriMode(true);
            }
        } else {
            setEditingBuku({
                kodeBuku: `BK-${Date.now().toString().slice(-6)}`,
                judul: '',
                kategori: 'Kitab Kuning',
                penulis: '',
                penerbit: '',
                stok: 1,
                lokasiRak: ''
            });
        }
        setIsModalOpen(true);
    };

    const generateNewCode = () => {
        const rand = Math.floor(100000 + Math.random() * 900000);
        setEditingBuku(prev => ({ ...prev, kodeBuku: `BK-${rand}` }));
    };

    const confirmDelete = (buku: Buku) => {
        setDeleteModal({
            isOpen: true,
            bukuId: buku.id,
            bukuTitle: buku.judul
        });
    };

    const handleExecuteDelete = () => {
        if (deleteModal.bukuId) {
            onDelete(deleteModal.bukuId);
        }
        setDeleteModal({ isOpen: false });
    };

    // CSV Export
    const exportToCSV = () => {
        if (filteredBuku.length === 0) {
            showToast('Tidak ada data buku untuk diekspor.', 'info');
            return;
        }

        const headers = ['Kode Buku', 'Judul Buku', 'Kategori', 'Penulis', 'Penerbit', 'Tahun Terbit', 'Stok', 'Lokasi Rak'];
        const rows = filteredBuku.map(b => [
            `"${(b.kodeBuku || '').replace(/"/g, '""')}"`,
            `"${(b.judul || '').replace(/"/g, '""')}"`,
            `"${(b.kategori || '').replace(/"/g, '""')}"`,
            `"${(b.penulis || '').replace(/"/g, '""')}"`,
            `"${(b.penerbit || '').replace(/"/g, '""')}"`,
            b.tahunTerbit || '',
            b.stok ?? 0,
            `"${(b.lokasiRak || '').replace(/"/g, '""')}"`
        ]);

        const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Katalog_Buku_Perpustakaan_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        showToast(`Berhasil mengekspor ${filteredBuku.length} data buku ke CSV.`, 'success');
    };

    return (
        <div className="space-y-4 animate-fade-in">
            {/* Action Bar & Filtering */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    {/* Search */}
                    <div className="relative flex-1">
                        <input 
                            type="text" 
                            placeholder="Cari judul, kode barcode, penulis, penerbit, atau rak..." 
                            value={searchTerm} 
                            onChange={e => handleFilterChange(setSearchTerm, e.target.value)} 
                            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-8 text-sm text-slate-800 placeholder-slate-400 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20" 
                        />
                        <i className="bi bi-search absolute left-3.5 top-3 text-slate-400"></i>
                        {searchTerm && (
                            <button 
                                onClick={() => handleFilterChange(setSearchTerm, '')}
                                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                            >
                                <i className="bi bi-x-circle-fill text-xs"></i>
                            </button>
                        )}
                    </div>

                    {/* Buttons: Export & Add */}
                    <div className="flex flex-wrap items-center gap-2">
                        {onOpenPengaturan && (
                            <button 
                                onClick={onOpenPengaturan} 
                                title="Buka pengaturan denda & master kategori buku"
                                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
                            >
                                <i className="bi bi-tags-fill text-teal-600"></i>
                                <span>Kelola Kategori</span>
                            </button>
                        )}

                        <button 
                            onClick={exportToCSV}
                            title="Unduh data dalam format CSV untuk Excel"
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-sm"
                        >
                            <i className="bi bi-file-earmark-spreadsheet text-emerald-600"></i>
                            <span>Export CSV</span>
                        </button>

                        {canWrite && (
                            <>
                                <button 
                                    onClick={() => setIsBulkOpen(true)} 
                                    className="inline-flex items-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-3.5 py-2.5 text-xs font-bold text-teal-700 hover:bg-teal-100 transition-colors"
                                >
                                    <i className="bi bi-table"></i>
                                    <span>Tambah Massal</span>
                                </button>
                                <button 
                                    onClick={() => openModal()} 
                                    className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-teal-700 transition-colors"
                                >
                                    <i className="bi bi-plus-lg"></i>
                                    <span>Tambah Buku</span>
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Filter Row */}
                <div className="mt-3 grid grid-cols-1 gap-2 pt-3 border-t border-slate-100 sm:grid-cols-3">
                    {/* Category Filter */}
                    <select 
                        value={filterKategori} 
                        onChange={e => handleFilterChange(setFilterKategori, e.target.value)} 
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:border-teal-500 focus:outline-none"
                    >
                        <option value="">Semua Kategori ({categoryOptions.length})</option>
                        {categoryOptions.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>

                    {/* Shelf Filter */}
                    <select 
                        value={filterRak} 
                        onChange={e => handleFilterChange(setFilterRak, e.target.value)} 
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:border-teal-500 focus:outline-none"
                    >
                        <option value="">Semua Lokasi Rak</option>
                        {rakOptions.map(rak => (
                            <option key={rak} value={rak}>Rak: {rak}</option>
                        ))}
                    </select>

                    {/* Stock Status Filter */}
                    <select 
                        value={filterStokStatus} 
                        onChange={e => handleFilterChange(setFilterStokStatus, e.target.value as any)} 
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:border-teal-500 focus:outline-none"
                    >
                        <option value="all">Semua Ketersediaan Stok</option>
                        <option value="tersedia">Stok Tersedia (&gt; 0)</option>
                        <option value="habis">Stok Kosong (0)</option>
                    </select>
                </div>
            </div>

            {/* Results Count & Active Filters Indicator */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                    <span>Ditemukan <strong>{filteredBuku.length}</strong> buku</span>
                    {(searchTerm || filterKategori || filterRak || filterStokStatus !== 'all') && (
                        <button
                            onClick={() => {
                                setSearchTerm('');
                                setFilterKategori('');
                                setFilterRak('');
                                setFilterStokStatus('all');
                                setCurrentPage(1);
                            }}
                            className="inline-flex items-center gap-1 font-semibold text-rose-600 hover:underline"
                        >
                            <i className="bi bi-arrow-counterclockwise"></i> Reset Filter
                        </button>
                    )}
                </div>

                {/* Rows per page */}
                <div className="flex items-center gap-2">
                    <span>Tampilkan:</span>
                    <select 
                        value={itemsPerPage} 
                        onChange={e => {
                            setItemsPerPage(Number(e.target.value));
                            setCurrentPage(1);
                        }}
                        className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700"
                    >
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                    </select>
                </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
                <table className="w-full text-left text-sm">
                    <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        <tr>
                            <th className="px-4 py-3.5">Kode</th>
                            <th className="px-4 py-3.5">Judul Buku & Penulis</th>
                            <th className="px-4 py-3.5">Kategori</th>
                            <th className="px-4 py-3.5">Penerbit & Tahun</th>
                            <th className="px-4 py-3.5 text-center">Stok Rak</th>
                            <th className="px-4 py-3.5 text-center">Lokasi Rak</th>
                            <th className="px-4 py-3.5 text-center">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {currentSlice.map(buku => {
                            const isOutOfStock = (Number(buku.stok) || 0) <= 0;
                            return (
                                <tr key={buku.id} className="hover:bg-slate-50/80 transition-colors">
                                    <td className="px-4 py-3">
                                        <span className="inline-block rounded-md bg-slate-100 px-2 py-1 font-mono text-xs font-semibold text-slate-700">
                                            {buku.kodeBuku}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="font-bold text-slate-800">{buku.judul}</div>
                                        <div className="text-xs text-slate-500">
                                            {buku.penulis ? `Karya: ${buku.penulis}` : <span className="italic text-slate-400">Penulis tidak tercatat</span>}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-medium ${
                                            buku.kategori === 'Kitab Kuning' 
                                                ? 'bg-amber-50 text-amber-800 border border-amber-200/60'
                                                : buku.kategori === 'Buku Pelajaran'
                                                ? 'bg-blue-50 text-blue-800 border border-blue-200/60'
                                                : 'bg-emerald-50 text-emerald-800 border border-emerald-200/60'
                                        }`}>
                                            {buku.kategori || 'Umum'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-slate-600">
                                        <div>{buku.penerbit || '-'}</div>
                                        <div className="text-slate-400">{buku.tahunTerbit ? `Thn. ${buku.tahunTerbit}` : ''}</div>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <div className="inline-flex items-center gap-1.5">
                                            {canWrite && onAdjustStok && (
                                                <button
                                                    onClick={() => onAdjustStok(buku.id, -1)}
                                                    disabled={(Number(buku.stok) || 0) <= 0}
                                                    title="Kurangi 1 eksemplar"
                                                    className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white"
                                                >
                                                    -
                                                </button>
                                            )}
                                            <span className={`min-w-[28px] text-center font-bold ${
                                                isOutOfStock ? 'text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded' : 'text-slate-800'
                                            }`}>
                                                {buku.stok}
                                            </span>
                                            {canWrite && onAdjustStok && (
                                                <button
                                                    onClick={() => onAdjustStok(buku.id, 1)}
                                                    title="Tambah 1 eksemplar"
                                                    className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-100"
                                                >
                                                    +
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        {buku.lokasiRak ? (
                                            <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700">
                                                {buku.lokasiRak}
                                            </span>
                                        ) : (
                                            <span className="text-xs text-slate-300">-</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        {canWrite ? (
                                            <div className="flex items-center justify-center gap-1">
                                                <button 
                                                    onClick={() => openModal(buku)} 
                                                    title="Edit Buku"
                                                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-blue-600 transition-colors"
                                                >
                                                    <i className="bi bi-pencil-square"></i>
                                                </button>
                                                <button 
                                                    onClick={() => confirmDelete(buku)} 
                                                    title="Hapus Buku"
                                                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                                                >
                                                    <i className="bi bi-trash"></i>
                                                </button>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-slate-400">Read only</span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                        {filteredBuku.length === 0 && (
                            <tr>
                                <td colSpan={7} className="p-12 text-center text-slate-400">
                                    <div className="flex flex-col items-center justify-center">
                                        <i className="bi bi-inbox text-3xl mb-2 text-slate-300"></i>
                                        <p className="text-sm font-semibold">Tidak ada data buku yang sesuai filter.</p>
                                        <p className="text-xs text-slate-400 mt-1">Coba ubah kata kunci pencarian atau reset filter.</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Mobile Card View */}
            <div className="space-y-3 md:hidden">
                {currentSlice.map((buku) => {
                    const isOutOfStock = (Number(buku.stok) || 0) <= 0;
                    return (
                        <div key={buku.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="font-bold text-slate-900 leading-snug">{buku.judul}</div>
                                    <div className="mt-1 flex items-center gap-2">
                                        <span className="font-mono text-xs font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                            {buku.kodeBuku}
                                        </span>
                                        {buku.lokasiRak && (
                                            <span className="text-xs text-slate-500">
                                                Rak: <strong>{buku.lokasiRak}</strong>
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <span className="shrink-0 rounded-lg px-2 py-0.5 text-[11px] font-semibold bg-teal-50 text-teal-800 border border-teal-200/50">
                                    {buku.kategori}
                                </span>
                            </div>

                            <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl">
                                <div><span className="text-slate-400">Penulis:</span> {buku.penulis || '-'}</div>
                                <div><span className="text-slate-400">Penerbit:</span> {buku.penerbit || '-'}</div>
                                <div><span className="text-slate-400">Tahun:</span> {buku.tahunTerbit || '-'}</div>
                                <div className="flex items-center gap-1.5">
                                    <span className="text-slate-400">Stok:</span> 
                                    <span className={`font-bold ${isOutOfStock ? 'text-rose-600' : 'text-slate-800'}`}>
                                        {buku.stok}
                                    </span>
                                    {canWrite && onAdjustStok && (
                                        <div className="inline-flex items-center gap-1 ml-auto">
                                            <button 
                                                onClick={() => onAdjustStok(buku.id, -1)}
                                                disabled={isOutOfStock}
                                                className="h-5 w-5 rounded bg-white border border-slate-200 text-xs font-bold leading-none disabled:opacity-40"
                                            >
                                                -
                                            </button>
                                            <button 
                                                onClick={() => onAdjustStok(buku.id, 1)}
                                                className="h-5 w-5 rounded bg-white border border-slate-200 text-xs font-bold leading-none"
                                            >
                                                +
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {canWrite && (
                                <div className="mt-3 flex gap-2">
                                    <button 
                                        onClick={() => openModal(buku)} 
                                        className="flex-1 rounded-xl border border-blue-200 bg-blue-50 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100 transition-colors"
                                    >
                                        <i className="bi bi-pencil-square mr-1"></i> Edit
                                    </button>
                                    <button 
                                        onClick={() => confirmDelete(buku)} 
                                        className="flex-1 rounded-xl border border-rose-200 bg-rose-50 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-colors"
                                    >
                                        <i className="bi bi-trash mr-1"></i> Hapus
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
                {filteredBuku.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
                        Tidak ada buku yang sesuai pencarian.
                    </div>
                )}
            </div>

            {/* Pagination Controls */}
            {filteredBuku.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                    <div className="text-xs text-slate-500">
                        Menampilkan <strong>{Math.min(filteredBuku.length, (currentPage - 1) * itemsPerPage + 1)}</strong> - <strong>{Math.min(filteredBuku.length, currentPage * itemsPerPage)}</strong> dari <strong>{filteredBuku.length}</strong> buku
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                        >
                            <i className="bi bi-chevron-left"></i>
                        </button>

                        {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                            let pNum = i + 1;
                            if (totalPages > 5 && currentPage > 3) {
                                pNum = Math.min(totalPages, currentPage - 2 + i);
                            }
                            return (
                                <button
                                    key={pNum}
                                    onClick={() => setCurrentPage(pNum)}
                                    className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold transition-colors ${
                                        currentPage === pNum 
                                            ? 'bg-teal-600 text-white' 
                                            : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                    }`}
                                >
                                    {pNum}
                                </button>
                            );
                        })}

                        <button
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                        >
                            <i className="bi bi-chevron-right"></i>
                        </button>
                    </div>
                </div>
            )}

            {/* SINGLE BOOK ADD / EDIT MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
                    <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-6 py-4">
                            <div className="flex items-center gap-2">
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
                                    <i className={`bi ${editingBuku.id ? 'bi-pencil-square' : 'bi-plus-circle-fill'} text-lg`}></i>
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800">
                                        {editingBuku.id ? 'Edit Data Buku' : 'Tambah Buku Baru'}
                                    </h3>
                                    <p className="text-xs text-slate-500">
                                        {editingBuku.id ? 'Perbarui informasi dan ketersediaan koleksi' : 'Lengkapi data buku koleksi perpustakaan'}
                                    </p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setIsModalOpen(false)}
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-600"
                            >
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>

                        {/* Error Message */}
                        {modalError && (
                            <div className="mx-6 mt-4 flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800">
                                <i className="bi bi-exclamation-triangle-fill shrink-0 text-rose-500"></i>
                                <span>{modalError}</span>
                            </div>
                        )}

                        {/* Form Body */}
                        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                            {/* Kode Buku & Kategori */}
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="text-xs font-bold text-slate-700">Kode Buku / Barcode <span className="text-rose-500">*</span></label>
                                        <button 
                                            type="button" 
                                            onClick={generateNewCode}
                                            className="text-[11px] font-semibold text-teal-600 hover:underline"
                                        >
                                            Generate Otomatis
                                        </button>
                                    </div>
                                    <input 
                                        type="text" 
                                        value={editingBuku.kodeBuku || ''} 
                                        onChange={e => setEditingBuku({ ...editingBuku, kodeBuku: e.target.value.toUpperCase() })} 
                                        placeholder="Contoh: BK-00123"
                                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm uppercase font-mono text-slate-800 focus:border-teal-500 focus:outline-none" 
                                    />
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="text-xs font-bold text-slate-700">Kategori <span className="text-rose-500">*</span></label>
                                        <button 
                                            type="button" 
                                            onClick={() => setCustomKategoriMode(!customKategoriMode)}
                                            className="text-[11px] font-semibold text-teal-600 hover:underline"
                                        >
                                            {customKategoriMode ? 'Pilih dari List' : '+ Kategori Baru'}
                                        </button>
                                    </div>
                                    {customKategoriMode ? (
                                        <div>
                                            <input
                                                type="text"
                                                value={editingBuku.kategori || ''}
                                                onChange={e => setEditingBuku({ ...editingBuku, kategori: e.target.value })}
                                                placeholder="Ketik nama kategori baru..."
                                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-teal-500 focus:outline-none"
                                            />
                                            <p className="mt-1 text-[11px] text-teal-700 flex items-center gap-1 font-medium">
                                                <i className="bi bi-check-circle-fill text-teal-500"></i>
                                                Otomatis tersimpan permanen ke daftar pilihan kategori.
                                            </p>
                                        </div>
                                    ) : (
                                        <select 
                                            value={editingBuku.kategori || 'Kitab Kuning'} 
                                            onChange={e => setEditingBuku({ ...editingBuku, kategori: e.target.value })} 
                                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-teal-500 focus:outline-none"
                                        >
                                            {categoryOptions.map(cat => (
                                                <option key={cat} value={cat}>{cat}</option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                            </div>

                            {/* Judul Buku */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Judul Buku <span className="text-rose-500">*</span>
                                </label>
                                <input 
                                    type="text" 
                                    value={editingBuku.judul || ''} 
                                    onChange={e => setEditingBuku({ ...editingBuku, judul: e.target.value })} 
                                    placeholder="Masukkan judul buku lengkap..."
                                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-teal-500 focus:outline-none" 
                                />
                            </div>

                            {/* Penulis & Penerbit */}
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Penulis / Pengarang</label>
                                    <input 
                                        type="text" 
                                        value={editingBuku.penulis || ''} 
                                        onChange={e => setEditingBuku({ ...editingBuku, penulis: e.target.value })} 
                                        placeholder="Nama penulis atau mushannif..."
                                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-teal-500 focus:outline-none" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Penerbit</label>
                                    <input 
                                        type="text" 
                                        value={editingBuku.penerbit || ''} 
                                        onChange={e => setEditingBuku({ ...editingBuku, penerbit: e.target.value })} 
                                        placeholder="Nama percetakan/penerbit..."
                                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-teal-500 focus:outline-none" 
                                    />
                                </div>
                            </div>

                            {/* Tahun Terbit, Stok & Lokasi Rak */}
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Tahun Terbit</label>
                                    <input 
                                        type="number" 
                                        value={editingBuku.tahunTerbit || ''} 
                                        onChange={e => setEditingBuku({ ...editingBuku, tahunTerbit: e.target.value ? parseInt(e.target.value) : undefined })} 
                                        placeholder="Contoh: 2023"
                                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-teal-500 focus:outline-none" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Stok Eksemplar</label>
                                    <input 
                                        type="number" 
                                        min={0}
                                        value={editingBuku.stok ?? 1} 
                                        onChange={e => setEditingBuku({ ...editingBuku, stok: parseInt(e.target.value) || 0 })} 
                                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-800 focus:border-teal-500 focus:outline-none" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Lokasi Rak</label>
                                    <input 
                                        type="text" 
                                        value={editingBuku.lokasiRak || ''} 
                                        onChange={e => setEditingBuku({ ...editingBuku, lokasiRak: e.target.value })} 
                                        placeholder="Misal: Rak A-02"
                                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-teal-500 focus:outline-none" 
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/70 px-6 py-4">
                            <button 
                                onClick={() => setIsModalOpen(false)} 
                                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                            >
                                Batal
                            </button>
                            <button 
                                onClick={handleSave} 
                                className="rounded-xl bg-teal-600 px-5 py-2 text-sm font-bold text-white shadow-sm hover:bg-teal-700 transition-colors"
                            >
                                {editingBuku.id ? 'Perbarui Buku' : 'Simpan Buku'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* BULK ADD MODAL */}
            <BulkBukuEditor isOpen={isBulkOpen} onClose={() => setIsBulkOpen(false)} onSave={onBulkAdd} />

            {/* DELETE CONFIRMATION MODAL */}
            <ConfirmModal
                isOpen={deleteModal.isOpen}
                title="Hapus Buku dari Katalog?"
                message={`Apakah Anda yakin ingin menghapus buku "${deleteModal.bukuTitle}"? Buku ini tidak akan muncul lagi di katalog pencarian.`}
                confirmText="Hapus Buku"
                confirmColor="red"
                onConfirm={handleExecuteDelete}
                onCancel={() => setDeleteModal({ isOpen: false })}
            />
        </div>
    );
};
