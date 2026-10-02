import React, { useState, useMemo } from 'react';
import { Buku, PondokSettings, PerpusConfig } from '../../types';
import { useAppContext } from '../../AppContext';
import { db } from '../../db';
import { formatRupiah } from '../../utils/formatters';
import ConfirmModal from '../ConfirmModal';

interface PengaturanPerpusProps {
    bukuList: Buku[];
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

export const PengaturanPerpus: React.FC<PengaturanPerpusProps> = ({ bukuList, canWrite }) => {
    const { settings, onSaveSettings, showToast } = useAppContext();

    // Current Perpus Config
    const currentConfig: PerpusConfig = useMemo(() => {
        return {
            dendaPerHari: settings.perpusConfig?.dendaPerHari ?? 1000,
            durasiPinjamDefault: settings.perpusConfig?.durasiPinjamDefault ?? 7,
            maksPinjamBuku: settings.perpusConfig?.maksPinjamBuku ?? 3,
            kategoriKoleksi: settings.perpusConfig?.kategoriKoleksi && settings.perpusConfig.kategoriKoleksi.length > 0
                ? settings.perpusConfig.kategoriKoleksi
                : DEFAULT_CATEGORIES
        };
    }, [settings.perpusConfig]);

    // Local form state for rules
    const [dendaPerHari, setDendaPerHari] = useState<number>(currentConfig.dendaPerHari);
    const [durasiPinjamDefault, setDurasiPinjamDefault] = useState<number>(currentConfig.durasiPinjamDefault);
    const [maksPinjamBuku, setMaksPinjamBuku] = useState<number>(currentConfig.maksPinjamBuku ?? 3);
    const [isSavingRules, setIsSavingRules] = useState(false);

    // Category Management State
    const [newCategoryName, setNewCategoryName] = useState('');
    const [categorySearch, setCategorySearch] = useState('');
    
    // Rename Modal State
    const [renameModal, setRenameModal] = useState<{
        isOpen: boolean;
        oldName: string;
        newName: string;
        bookCount: number;
    }>({
        isOpen: false,
        oldName: '',
        newName: '',
        bookCount: 0
    });

    // Delete Modal State
    const [deleteModal, setDeleteModal] = useState<{
        isOpen: boolean;
        categoryName: string;
        bookCount: number;
        targetFallbackCategory: string;
    }>({
        isOpen: false,
        categoryName: '',
        bookCount: 0,
        targetFallbackCategory: 'Umum'
    });

    // Reset Confirmation Modal State
    const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

    // Compute book count per category
    const categoryStats = useMemo(() => {
        const counts: Record<string, number> = {};
        bukuList.forEach(b => {
            const cat = (b.kategori || 'Umum').trim();
            counts[cat] = (counts[cat] || 0) + 1;
        });

        // Unique categories from config + any existing books that might have a legacy category
        const allSet = new Set<string>(currentConfig.kategoriKoleksi || []);
        Object.keys(counts).forEach(c => allSet.add(c));

        return Array.from(allSet).map(name => ({
            name,
            bookCount: counts[name] || 0,
            isDefault: DEFAULT_CATEGORIES.includes(name)
        })).sort((a, b) => a.name.localeCompare(b.name));
    }, [currentConfig.kategoriKoleksi, bukuList]);

    // Filtered categories for display
    const filteredCategories = useMemo(() => {
        const term = categorySearch.toLowerCase().trim();
        if (!term) return categoryStats;
        return categoryStats.filter(c => c.name.toLowerCase().includes(term));
    }, [categoryStats, categorySearch]);

    // Save Loan & Fine Rules
    const handleSaveRules = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canWrite) return;
        setIsSavingRules(true);
        try {
            const newSettings: PondokSettings = {
                ...settings,
                perpusConfig: {
                    ...currentConfig,
                    dendaPerHari: Math.max(0, Number(dendaPerHari) || 0),
                    durasiPinjamDefault: Math.max(1, Number(durasiPinjamDefault) || 7),
                    maksPinjamBuku: Math.max(1, Number(maksPinjamBuku) || 3)
                }
            };
            await onSaveSettings(newSettings);
            showToast('Pengaturan denda dan peminjaman berhasil disimpan.', 'success');
        } catch (error) {
            showToast('Gagal menyimpan aturan perpustakaan.', 'error');
        } finally {
            setIsSavingRules(false);
        }
    };

    // Add New Master Category
    const handleAddCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canWrite) return;
        const trimmed = newCategoryName.trim();
        if (!trimmed) {
            showToast('Mohon masukkan nama kategori.', 'info');
            return;
        }

        const existing = (currentConfig.kategoriKoleksi || []).map(c => c.toLowerCase());
        if (existing.includes(trimmed.toLowerCase())) {
            showToast(`Kategori "${trimmed}" sudah terdaftar.`, 'info');
            return;
        }

        const updatedCategories = [...(currentConfig.kategoriKoleksi || []), trimmed];
        const newSettings: PondokSettings = {
            ...settings,
            perpusConfig: {
                ...currentConfig,
                kategoriKoleksi: updatedCategories
            }
        };

        await onSaveSettings(newSettings);
        setNewCategoryName('');
        showToast(`Kategori "${trimmed}" berhasil ditambahkan dan disimpan permanen.`, 'success');
    };

    // Open Rename Modal
    const handleOpenRename = (categoryName: string, bookCount: number) => {
        setRenameModal({
            isOpen: true,
            oldName: categoryName,
            newName: categoryName,
            bookCount
        });
    };

    // Execute Rename
    const handleExecuteRename = async () => {
        const { oldName, newName, bookCount } = renameModal;
        const trimmedNew = newName.trim();
        if (!trimmedNew || trimmedNew === oldName) {
            setRenameModal({ isOpen: false, oldName: '', newName: '', bookCount: 0 });
            return;
        }

        // Update in settings
        const updatedList = (currentConfig.kategoriKoleksi || []).map(cat => 
            cat.toLowerCase() === oldName.toLowerCase() ? trimmedNew : cat
        );
        if (!updatedList.includes(trimmedNew)) {
            updatedList.push(trimmedNew);
        }

        const newSettings: PondokSettings = {
            ...settings,
            perpusConfig: {
                ...currentConfig,
                kategoriKoleksi: updatedList
            }
        };
        await onSaveSettings(newSettings);

        // If there are books using the old name, batch update them in db.buku
        if (bookCount > 0) {
            const booksToUpdate = bukuList.filter(b => (b.kategori || '').trim().toLowerCase() === oldName.toLowerCase());
            for (const book of booksToUpdate) {
                await db.buku.update(book.id, { kategori: trimmedNew, lastModified: Date.now() });
            }
            showToast(`Kategori diubah menjadi "${trimmedNew}". ${booksToUpdate.length} buku berhasil diperbarui.`, 'success');
        } else {
            showToast(`Kategori "${oldName}" diubah menjadi "${trimmedNew}".`, 'success');
        }

        setRenameModal({ isOpen: false, oldName: '', newName: '', bookCount: 0 });
    };

    // Open Delete Modal
    const handleOpenDelete = (categoryName: string, bookCount: number) => {
        // Choose default fallback category that is different from categoryName
        const otherCats = (currentConfig.kategoriKoleksi || []).filter(c => c.toLowerCase() !== categoryName.toLowerCase());
        const fallback = otherCats.includes('Umum') ? 'Umum' : (otherCats[0] || 'Umum');

        setDeleteModal({
            isOpen: true,
            categoryName,
            bookCount,
            targetFallbackCategory: fallback
        });
    };

    // Execute Delete
    const handleExecuteDelete = async () => {
        const { categoryName, bookCount, targetFallbackCategory } = deleteModal;

        // Remove from master list
        const updatedCategories = (currentConfig.kategoriKoleksi || []).filter(
            c => c.toLowerCase() !== categoryName.toLowerCase()
        );

        const newSettings: PondokSettings = {
            ...settings,
            perpusConfig: {
                ...currentConfig,
                kategoriKoleksi: updatedCategories
            }
        };
        await onSaveSettings(newSettings);

        // Reassign affected books if any
        if (bookCount > 0) {
            const booksToReassign = bukuList.filter(b => (b.kategori || '').trim().toLowerCase() === categoryName.toLowerCase());
            for (const book of booksToReassign) {
                await db.buku.update(book.id, { kategori: targetFallbackCategory, lastModified: Date.now() });
            }
            showToast(`Kategori "${categoryName}" dihapus. ${booksToReassign.length} buku dipindahkan ke "${targetFallbackCategory}".`, 'info');
        } else {
            showToast(`Kategori "${categoryName}" berhasil dihapus.`, 'success');
        }

        setDeleteModal({ isOpen: false, categoryName: '', bookCount: 0, targetFallbackCategory: 'Umum' });
    };

    // Reset to Default Categories
    const handleResetCategories = async () => {
        const newSettings: PondokSettings = {
            ...settings,
            perpusConfig: {
                ...currentConfig,
                kategoriKoleksi: DEFAULT_CATEGORIES
            }
        };
        await onSaveSettings(newSettings);
        setIsResetConfirmOpen(false);
        showToast('Kategori koleksi dikembalikan ke standar perpustakaan.', 'success');
    };

    return (
        <div className="space-y-6">
            {/* Top Info Banner */}
            <div className="rounded-2xl border border-teal-200 bg-gradient-to-r from-teal-50 via-emerald-50 to-teal-50/30 p-5 shadow-sm">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-md">
                            <i className="bi bi-sliders2-vertical text-xl"></i>
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-slate-800">Pengaturan Operasional & Master Kategori Perpustakaan</h2>
                            <p className="text-xs text-slate-600 mt-0.5">
                                Atur tarif denda keterlambatan harian, batas masa pinjam, serta kelola master kategori buku agar tersimpan permanen dan rapi.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 self-stretch sm:self-auto">
                        <span className="inline-flex items-center gap-1.5 rounded-xl bg-white border border-teal-200 px-3 py-1.5 text-xs font-semibold text-teal-800 shadow-xs">
                            <i className="bi bi-shield-check text-teal-600"></i>
                            {canWrite ? 'Mode Admin / Pustakawan' : 'Hanya Lihat (Read-Only)'}
                        </span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* SECTION 1: ATURAN DENDA & PEMINJAMAN */}
                <div className="lg:col-span-5 space-y-6">
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                                <i className="bi bi-cash-coin text-lg"></i>
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800 text-sm">Tarif Denda & Durasi Peminjaman</h3>
                                <p className="text-xs text-slate-500">Berlaku otomatis pada perhitungan sirkulasi buku</p>
                            </div>
                        </div>

                        <form onSubmit={handleSaveRules} className="mt-5 space-y-5">
                            {/* Tarif Denda per Hari */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Nominal Denda Keterlambatan per Hari
                                </label>
                                <div className="relative">
                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm font-bold text-slate-400">
                                        Rp
                                    </div>
                                    <input 
                                        type="number"
                                        min="0"
                                        step="100"
                                        value={dendaPerHari}
                                        disabled={!canWrite}
                                        onChange={e => setDendaPerHari(Number(e.target.value))}
                                        className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm font-semibold text-slate-800 focus:border-amber-500 focus:outline-none disabled:bg-slate-50"
                                    />
                                </div>
                                <p className="mt-1 text-[11px] text-slate-400">
                                    Tarif saat ini: <span className="font-bold text-slate-700">{formatRupiah(dendaPerHari)}</span> / hari / buku.
                                </p>

                                {/* Quick Presets for Denda */}
                                {canWrite && (
                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                        <button
                                            type="button"
                                            onClick={() => setDendaPerHari(0)}
                                            className={`rounded-lg px-2.5 py-1 text-xs font-semibold border transition-all ${
                                                dendaPerHari === 0 
                                                    ? 'bg-amber-100 text-amber-800 border-amber-300' 
                                                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                            }`}
                                        >
                                            Rp 0 (Bebas Denda)
                                        </button>
                                        {[500, 1000, 2000, 5000].map(val => (
                                            <button
                                                key={val}
                                                type="button"
                                                onClick={() => setDendaPerHari(val)}
                                                className={`rounded-lg px-2.5 py-1 text-xs font-semibold border transition-all ${
                                                    dendaPerHari === val 
                                                        ? 'bg-amber-100 text-amber-800 border-amber-300' 
                                                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                                }`}
                                            >
                                                Rp {val.toLocaleString('id-ID')}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Standar Durasi Pinjam */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Durasi Peminjaman Standar (Hari)
                                </label>
                                <div className="relative">
                                    <input 
                                        type="number"
                                        min="1"
                                        max="90"
                                        value={durasiPinjamDefault}
                                        disabled={!canWrite}
                                        onChange={e => setDurasiPinjamDefault(Number(e.target.value))}
                                        className="w-full rounded-xl border border-slate-200 py-2.5 px-3 text-sm font-semibold text-slate-800 focus:border-amber-500 focus:outline-none disabled:bg-slate-50"
                                    />
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-xs font-semibold text-slate-400">
                                        Hari
                                    </div>
                                </div>
                                <p className="mt-1 text-[11px] text-slate-400">
                                    Masa pinjam buku sebelum dinyatakan jatuh tempo (default: 7 hari).
                                </p>

                                {/* Quick Presets for Days */}
                                {canWrite && (
                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                        {[3, 7, 14, 30].map(days => (
                                            <button
                                                key={days}
                                                type="button"
                                                onClick={() => setDurasiPinjamDefault(days)}
                                                className={`rounded-lg px-2.5 py-1 text-xs font-semibold border transition-all ${
                                                    durasiPinjamDefault === days 
                                                        ? 'bg-amber-100 text-amber-800 border-amber-300' 
                                                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                                }`}
                                            >
                                                {days} Hari
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Batas Maksimal Buku per Santri */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Batas Maksimal Buku Dipinjam Bersamaan
                                </label>
                                <div className="relative">
                                    <input 
                                        type="number"
                                        min="1"
                                        max="20"
                                        value={maksPinjamBuku}
                                        disabled={!canWrite}
                                        onChange={e => setMaksPinjamBuku(Number(e.target.value))}
                                        className="w-full rounded-xl border border-slate-200 py-2.5 px-3 text-sm font-semibold text-slate-800 focus:border-amber-500 focus:outline-none disabled:bg-slate-50"
                                    />
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-xs font-semibold text-slate-400">
                                        Buku / Santri
                                    </div>
                                </div>
                                <p className="mt-1 text-[11px] text-slate-400">
                                    Batas rekomendasi jumlah buku aktif per santri.
                                </p>
                            </div>

                            {canWrite && (
                                <button
                                    type="submit"
                                    disabled={isSavingRules}
                                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 py-2.5 px-4 text-xs font-bold text-white shadow-sm hover:bg-amber-700 transition-colors disabled:opacity-50"
                                >
                                    <i className="bi bi-check-circle-fill"></i>
                                    <span>{isSavingRules ? 'Menyimpan Aturan...' : 'Simpan Aturan Peminjaman & Denda'}</span>
                                </button>
                            )}
                        </form>
                    </div>

                    {/* Quick Explanation Card */}
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                        <div className="flex items-start gap-2.5 text-xs text-slate-600">
                            <i className="bi bi-info-circle-fill text-teal-600 text-sm shrink-0 mt-0.5"></i>
                            <div>
                                <span className="font-bold text-slate-800">Petunjuk Operasional Denda:</span>
                                <p className="mt-1">
                                    Keterlambatan dihitung otomatis dari tanggal jatuh tempo hingga tanggal buku dikembalikan. Pada saat pengembalian, petugas tetap memiliki fleksibilitas untuk membebaskan denda santri (Rp 0) jika ada alasan uzur syar'i atau persetujuan pimpinan.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* SECTION 2: MASTER KATEGORI BUKU (KELOLA KATEGORI) */}
                <div className="lg:col-span-7 space-y-6">
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
                                    <i className="bi bi-tags-fill text-lg"></i>
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800 text-sm">Master Kategori Buku</h3>
                                    <p className="text-xs text-slate-500">
                                        Total: <span className="font-bold text-slate-700">{categoryStats.length} kategori terdaftar</span>
                                    </p>
                                </div>
                            </div>

                            {canWrite && (
                                <button
                                    type="button"
                                    onClick={() => setIsResetConfirmOpen(true)}
                                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-colors"
                                >
                                    <i className="bi bi-arrow-counterclockwise"></i>
                                    <span>Reset Standar</span>
                                </button>
                            )}
                        </div>

                        {/* Form Tambah Kategori Baru */}
                        {canWrite && (
                            <form onSubmit={handleAddCategory} className="mt-4 flex gap-2">
                                <div className="relative flex-1">
                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                                        <i className="bi bi-plus-circle text-xs"></i>
                                    </div>
                                    <input 
                                        type="text"
                                        placeholder="Ketik nama kategori baru (cth: Biografi Tokoh, Sains Islam)..."
                                        value={newCategoryName}
                                        onChange={e => setNewCategoryName(e.target.value)}
                                        className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-xs text-slate-800 focus:border-teal-500 focus:outline-none"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-teal-700 transition-colors shrink-0"
                                >
                                    <i className="bi bi-plus-lg"></i>
                                    <span>Tambah Kategori</span>
                                </button>
                            </form>
                        )}

                        {/* Search Category */}
                        <div className="mt-4 flex items-center justify-between gap-3">
                            <div className="relative flex-1">
                                <i className="bi bi-search absolute left-3 top-2.5 text-xs text-slate-400"></i>
                                <input 
                                    type="text"
                                    placeholder="Cari kategori..."
                                    value={categorySearch}
                                    onChange={e => setCategorySearch(e.target.value)}
                                    className="w-full rounded-xl border border-slate-200 py-1.5 pl-8 pr-3 text-xs text-slate-800 focus:border-teal-500 focus:outline-none"
                                />
                            </div>
                        </div>

                        {/* Category List Table */}
                        <div className="mt-4 rounded-xl border border-slate-200 overflow-hidden">
                            <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100">
                                {filteredCategories.length === 0 ? (
                                    <div className="p-8 text-center text-xs text-slate-400">
                                        Tidak ada kategori yang cocok dengan pencarian.
                                    </div>
                                ) : (
                                    filteredCategories.map((cat, idx) => (
                                        <div 
                                            key={cat.name}
                                            className="flex items-center justify-between p-3 hover:bg-slate-50/80 transition-colors"
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <span className="text-[11px] font-mono text-slate-400 w-5 text-right">{idx + 1}.</span>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-slate-800 text-xs truncate">{cat.name}</span>
                                                        {cat.isDefault ? (
                                                            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
                                                                Standar
                                                            </span>
                                                        ) : (
                                                            <span className="rounded-md bg-teal-50 px-1.5 py-0.5 text-[10px] font-semibold text-teal-700 border border-teal-200">
                                                                Kustom
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-[11px] text-slate-500 mt-0.5">
                                                        Digunakan oleh <span className="font-bold text-slate-700">{cat.bookCount} judul buku</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {canWrite && (
                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenRename(cat.name, cat.bookCount)}
                                                        title="Ubah Nama Kategori"
                                                        className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-teal-50 hover:text-teal-700 transition-colors"
                                                    >
                                                        <i className="bi bi-pencil-square text-xs"></i>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenDelete(cat.name, cat.bookCount)}
                                                        title="Hapus Kategori"
                                                        className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                                                    >
                                                        <i className="bi bi-trash text-xs"></i>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Category Persistence Note */}
                        <div className="mt-4 rounded-xl bg-teal-50/60 border border-teal-100 p-3">
                            <p className="text-[11px] text-teal-800 leading-relaxed">
                                <span className="font-bold">Informasi Penyimpanan Kategori:</span> Semua kategori yang ditambahkan di sini maupun yang ditambah saat input buku baru akan tersimpan otomatis dan permanen di sistem. Kategori akan langsung muncul di daftar pilihan (dropdown) katalog buku tanpa perlu ditulis manual berulang kali.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* RENAME CATEGORY MODAL */}
            {renameModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
                    <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">
                        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-4">
                            <div className="flex items-center gap-2">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
                                    <i className="bi bi-pencil-square"></i>
                                </div>
                                <h3 className="font-bold text-slate-800 text-sm">Ubah Nama Kategori</h3>
                            </div>
                            <button
                                onClick={() => setRenameModal({ isOpen: false, oldName: '', newName: '', bookCount: 0 })}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>

                        <div className="p-5 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Nama Kategori Baru</label>
                                <input 
                                    type="text"
                                    value={renameModal.newName}
                                    onChange={e => setRenameModal(prev => ({ ...prev, newName: e.target.value }))}
                                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-teal-500 focus:outline-none"
                                />
                            </div>

                            {renameModal.bookCount > 0 && (
                                <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900">
                                    <i className="bi bi-info-circle-fill text-amber-600 mr-1.5"></i>
                                    Terdapat <span className="font-bold">{renameModal.bookCount} judul buku</span> yang menggunakan kategori ini. Mengubah nama akan otomatis memperbarui semua buku terkait.
                                </div>
                            )}

                            <div className="flex items-center justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setRenameModal({ isOpen: false, oldName: '', newName: '', bookCount: 0 })}
                                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                                >
                                    Batal
                                </button>
                                <button
                                    type="button"
                                    onClick={handleExecuteRename}
                                    className="rounded-xl bg-teal-600 px-4 py-2 text-xs font-bold text-white hover:bg-teal-700"
                                >
                                    Simpan Perubahan
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* DELETE CATEGORY MODAL */}
            {deleteModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
                    <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">
                        <div className="flex items-center justify-between border-b border-slate-100 bg-rose-50 px-5 py-4">
                            <div className="flex items-center gap-2">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-100 text-rose-600">
                                    <i className="bi bi-trash"></i>
                                </div>
                                <h3 className="font-bold text-rose-900 text-sm">Hapus Kategori Koleksi</h3>
                            </div>
                            <button
                                onClick={() => setDeleteModal({ isOpen: false, categoryName: '', bookCount: 0, targetFallbackCategory: 'Umum' })}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>

                        <div className="p-5 space-y-4">
                            <p className="text-xs text-slate-700 leading-relaxed">
                                Apakah Anda yakin ingin menghapus kategori <span className="font-bold text-slate-900">"{deleteModal.categoryName}"</span>?
                            </p>

                            {deleteModal.bookCount > 0 ? (
                                <div className="space-y-3 rounded-xl bg-amber-50 border border-amber-200 p-3.5 text-xs text-amber-900">
                                    <div className="flex items-start gap-2">
                                        <i className="bi bi-exclamation-triangle-fill text-amber-600 shrink-0 mt-0.5"></i>
                                        <div>
                                            <p className="font-bold">
                                                Perhatian: Kategori ini sedang dipakai oleh {deleteModal.bookCount} judul buku!
                                            </p>
                                            <p className="mt-1 text-amber-800 text-[11px]">
                                                Silakan pilih kategori pengganti agar data buku-buku tersebut tetap terorganisir dan tidak kehilangan kategori:
                                            </p>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Pindahkan buku ke kategori:</label>
                                        <select
                                            value={deleteModal.targetFallbackCategory}
                                            onChange={e => setDeleteModal(prev => ({ ...prev, targetFallbackCategory: e.target.value }))}
                                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 bg-white focus:border-amber-500 focus:outline-none"
                                        >
                                            {categoryStats
                                                .filter(c => c.name.toLowerCase() !== deleteModal.categoryName.toLowerCase())
                                                .map(c => (
                                                    <option key={c.name} value={c.name}>{c.name}</option>
                                                ))}
                                        </select>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 p-3 rounded-xl">
                                    <i className="bi bi-check-circle-fill mr-1.5"></i>
                                    Kategori ini saat ini tidak digunakan oleh buku manapun, sehingga aman untuk dihapus langsung.
                                </p>
                            )}

                            <div className="flex items-center justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setDeleteModal({ isOpen: false, categoryName: '', bookCount: 0, targetFallbackCategory: 'Umum' })}
                                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                                >
                                    Batal
                                </button>
                                <button
                                    type="button"
                                    onClick={handleExecuteDelete}
                                    className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 shadow-sm"
                                >
                                    Ya, Hapus Kategori
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* RESET CATEGORY CONFIRMATION */}
            <ConfirmModal 
                isOpen={isResetConfirmOpen}
                title="Reset Kategori ke Standar"
                message="Daftar master kategori akan dikembalikan ke 10 kategori standar perpustakaan. Buku yang sudah ada tidak akan hilang, namun kategori kustom yang tidak ada bukunya akan terhapus dari daftar."
                confirmText="Ya, Reset Standar"
                confirmColor="red"
                onConfirm={handleResetCategories}
                onCancel={() => setIsResetConfirmOpen(false)}
            />
        </div>
    );
};
