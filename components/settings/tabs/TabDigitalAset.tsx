import React, { useState, useMemo } from 'react';
import { DigitalAsset } from '../../../types';
import { db } from '../../../db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useAppContext } from '../../../AppContext';
import { SectionCard } from '../../common/SectionCard';
import { compressImage } from '../../../utils/imageOptimizer';

export const TabDigitalAset: React.FC = () => {
    const { settings, showToast, showConfirmation } = useAppContext();
    const [isUploading, setIsUploading] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingAsset, setEditingAsset] = useState<DigitalAsset | null>(null);
    const [previewingAsset, setPreviewingAsset] = useState<DigitalAsset | null>(null);
    const [activeFilter, setActiveFilter] = useState<'all' | 'ttd' | 'stempel' | 'kop'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

    // Form state
    const [formData, setFormData] = useState({
        type: 'ttd' as 'ttd' | 'stempel' | 'kop',
        namaPemilik: '',
        jabatan: '',
        base64Image: '',
        customNama: ''
    });

    const assets = useLiveQuery(() => db.digitalAssets.toArray(), []) || [];

    // Active teachers from settings
    const activeTeachers = useMemo(() =>
        (settings.tenagaPengajar || []).filter(t => !t.riwayatJabatan.some(r => r.tanggalSelesai)),
        [settings.tenagaPengajar]
    );

    const counts = useMemo(() => ({
        total: assets.length,
        ttd: assets.filter(a => a.type === 'ttd').length,
        stempel: assets.filter(a => a.type === 'stempel').length,
        kop: assets.filter(a => a.type === 'kop').length,
    }), [assets]);

    const filteredAssets = useMemo(() => {
        return assets.filter(a => {
            const matchesFilter = activeFilter === 'all' || a.type === activeFilter;
            const matchesSearch = !searchQuery.trim() || 
                a.namaPemilik.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (a.jabatan && a.jabatan.toLowerCase().includes(searchQuery.toLowerCase()));
            return matchesFilter && matchesSearch;
        });
    }, [assets, activeFilter, searchQuery]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setIsUploading(true);
            try {
                // Resize and compress cleanly
                const compressedBase64 = await compressImage(file, 600, 0.9);
                setFormData(prev => ({ ...prev, base64Image: compressedBase64 }));
                showToast('Gambar berhasil diunggah dan dioptimalkan.', 'info');
            } catch (error) {
                console.error("Gagal kompres gambar:", error);
                showToast("Gagal memproses file gambar. Pastikan format PNG/JPG valid.", 'error');
            } finally {
                setIsUploading(false);
            }
        }
    };

    const handleSave = async () => {
        const finalNama = formData.namaPemilik === '__custom__' ? formData.customNama.trim() : formData.namaPemilik.trim();

        if (!finalNama) {
            showToast('Nama Pemilik atau Nama Instansi wajib diisi!', 'info');
            return;
        }

        if (!formData.base64Image) {
            showToast('File gambar tanda tangan / stempel / kop surat wajib diunggah!', 'info');
            return;
        }

        const asset: DigitalAsset = {
            id: editingAsset?.id || `asset_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            type: formData.type,
            namaPemilik: finalNama,
            jabatan: formData.jabatan.trim(),
            base64Image: formData.base64Image,
            lastModified: Date.now()
        };

        try {
            await db.digitalAssets.put(asset);
            showToast(editingAsset ? 'Aset digital berhasil diperbarui!' : 'Aset digital berhasil ditambahkan!', 'success');
            setShowAddModal(false);
            resetForm();
        } catch (error) {
            console.error('Gagal menyimpan aset digital:', error);
            showToast('Gagal menyimpan aset digital ke database.', 'error');
        }
    };

    const handleDelete = (id: string, name: string) => {
        showConfirmation(
            'Hapus Aset Digital',
            `Apakah Anda yakin ingin menghapus aset digital untuk "${name}"? Dokumen surat atau cetakan yang menggunakan aset ini mungkin akan kehilangan visualnya.`,
            async () => {
                try {
                    await db.digitalAssets.delete(id);
                    showToast('Aset digital berhasil dihapus.', 'success');
                } catch (error) {
                    console.error('Gagal hapus aset:', error);
                    showToast('Gagal menghapus aset digital.', 'error');
                }
            },
            { confirmText: 'Ya, Hapus Aset', confirmColor: 'red' }
        );
    };

    const openEditModal = (asset: DigitalAsset) => {
        setEditingAsset(asset);
        const isFromMaster = activeTeachers.some(t => t.nama === asset.namaPemilik);
        setFormData({
            type: asset.type,
            namaPemilik: isFromMaster ? asset.namaPemilik : '__custom__',
            customNama: isFromMaster ? '' : asset.namaPemilik,
            jabatan: asset.jabatan || '',
            base64Image: asset.base64Image
        });
        setShowAddModal(true);
    };

    const resetForm = () => {
        setFormData({ type: 'ttd', namaPemilik: '', customNama: '', jabatan: '', base64Image: '' });
        setEditingAsset(null);
    };

    const downloadAssetImage = (asset: DigitalAsset) => {
        const link = document.createElement('a');
        link.href = asset.base64Image;
        const cleanName = asset.namaPemilik.replace(/[^a-zA-Z0-9_-]/g, '_');
        link.download = `${asset.type}_${cleanName}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('Gambar berhasil diunduh.', 'success');
    };

    const getTypeBadge = (type: 'ttd' | 'stempel' | 'kop') => {
        switch (type) {
            case 'ttd':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        <i className="bi bi-pen-fill"></i> Tanda Tangan
                    </span>
                );
            case 'stempel':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                        <i className="bi bi-patch-check-fill"></i> Stempel Resmi
                    </span>
                );
            case 'kop':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                        <i className="bi bi-file-earmark-richtext-fill"></i> Kop Surat
                    </span>
                );
        }
    };

    return (
        <div className="space-y-6">
            <SectionCard
                title="Manajemen Aset Digital"
                description="Kelola tanda tangan pejabat pesantren, cap/stempel resmi, dan header kop surat untuk keperluan cetak otomatis dokumen, kwitansi, serta surat menyurat."
                contentClassName="p-5 sm:p-6 space-y-5"
            >
                {/* Stats Summary Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center text-lg shrink-0">
                            <i className="bi bi-images"></i>
                        </div>
                        <div>
                            <div className="text-xs font-medium text-slate-500">Total Aset</div>
                            <div className="text-lg font-bold text-slate-800">{counts.total}</div>
                        </div>
                    </div>
                    <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-3.5 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-lg shrink-0">
                            <i className="bi bi-pen"></i>
                        </div>
                        <div>
                            <div className="text-xs font-medium text-blue-700">Tanda Tangan</div>
                            <div className="text-lg font-bold text-blue-950">{counts.ttd}</div>
                        </div>
                    </div>
                    <div className="rounded-xl border border-rose-100 bg-rose-50/40 p-3.5 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center text-lg shrink-0">
                            <i className="bi bi-patch-check"></i>
                        </div>
                        <div>
                            <div className="text-xs font-medium text-rose-700">Stempel Cap</div>
                            <div className="text-lg font-bold text-rose-950">{counts.stempel}</div>
                        </div>
                    </div>
                    <div className="rounded-xl border border-purple-100 bg-purple-50/40 p-3.5 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center text-lg shrink-0">
                            <i className="bi bi-file-earmark-richtext"></i>
                        </div>
                        <div>
                            <div className="text-xs font-medium text-purple-700">Kop Surat</div>
                            <div className="text-lg font-bold text-purple-950">{counts.kop}</div>
                        </div>
                    </div>
                </div>

                {/* Filter & Action Toolbar */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2">
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200">
                            <button
                                type="button"
                                onClick={() => setActiveFilter('all')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                    activeFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                Semua ({counts.total})
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveFilter('ttd')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                    activeFilter === 'ttd' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                TTD ({counts.ttd})
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveFilter('stempel')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                    activeFilter === 'stempel' ? 'bg-rose-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                Stempel ({counts.stempel})
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveFilter('kop')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                    activeFilter === 'kop' ? 'bg-purple-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                Kop Surat ({counts.kop})
                            </button>
                        </div>

                        {/* Search Input */}
                        <div className="relative min-w-[200px]">
                            <i className="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                            <input
                                type="text"
                                placeholder="Cari nama atau jabatan..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-auto">
                        {/* View Switcher */}
                        <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200">
                            <button
                                type="button"
                                onClick={() => setViewMode('table')}
                                title="Mode Tabel"
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                    viewMode === 'table' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                                }`}
                            >
                                <i className="bi bi-table mr-1"></i> Tabel
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('grid')}
                                title="Mode Kartu / Grid"
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                    viewMode === 'grid' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                                }`}
                            >
                                <i className="bi bi-grid-fill mr-1"></i> Grid
                            </button>
                        </div>

                        <button
                            type="button"
                            onClick={() => { resetForm(); setShowAddModal(true); }}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs transition-colors"
                        >
                            <i className="bi bi-plus-lg"></i>
                            <span>Tambah Aset Digital</span>
                        </button>
                    </div>
                </div>

                {/* Main Content: Table or Grid */}
                {filteredAssets.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 p-12 text-center text-slate-500 bg-slate-50/50">
                        <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center text-2xl">
                            <i className="bi bi-image"></i>
                        </div>
                        <h4 className="font-semibold text-slate-700 text-sm">Belum Ada Aset Digital</h4>
                        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                            {searchQuery ? 'Tidak ada aset yang cocok dengan kata kunci pencarian.' : 'Unggah tanda tangan transparan, stempel lembaga, atau kop surat resmi untuk digunakan otomatis.'}
                        </p>
                        <button
                            type="button"
                            onClick={() => { resetForm(); setShowAddModal(true); }}
                            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 shadow-xs"
                        >
                            <i className="bi bi-plus-circle"></i> Tambah Aset Pertama
                        </button>
                    </div>
                ) : viewMode === 'table' ? (
                    /* Table View */
                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs text-slate-600">
                                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                                    <tr>
                                        <th scope="col" className="px-4 py-3 w-12 text-center">No</th>
                                        <th scope="col" className="px-4 py-3 w-28 text-center">Pratinjau</th>
                                        <th scope="col" className="px-4 py-3">Tipe Aset</th>
                                        <th scope="col" className="px-4 py-3">Nama Pemilik / Dokumen</th>
                                        <th scope="col" className="px-4 py-3">Jabatan Struktural</th>
                                        <th scope="col" className="px-4 py-3 text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredAssets.map((asset, index) => (
                                        <tr key={asset.id} className="hover:bg-slate-50/80 transition-colors">
                                            <td className="px-4 py-3 text-center text-slate-400 font-medium">{index + 1}</td>
                                            <td className="px-4 py-3 text-center">
                                                <div 
                                                    onClick={() => setPreviewingAsset(asset)}
                                                    className="group relative w-20 h-12 mx-auto rounded-lg border border-slate-200 bg-slate-100/70 p-1 flex items-center justify-center cursor-pointer hover:border-teal-400 hover:shadow-xs transition-all overflow-hidden"
                                                    title="Klik untuk melihat resolusi penuh"
                                                >
                                                    <img
                                                        src={asset.base64Image}
                                                        alt={asset.namaPemilik}
                                                        className="max-h-full max-w-full object-contain"
                                                    />
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                                        <i className="bi bi-zoom-in text-xs"></i>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 font-medium">
                                                {getTypeBadge(asset.type)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="font-semibold text-slate-800 text-sm">{asset.namaPemilik}</div>
                                                <div className="text-[11px] text-slate-400">ID: {asset.id.substring(0, 14)}...</div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="text-slate-700 font-medium">{asset.jabatan || '-'}</div>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="inline-flex items-center gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => setPreviewingAsset(asset)}
                                                        title="Lihat Pratinjau Penuh"
                                                        className="p-1.5 text-slate-600 hover:text-teal-700 hover:bg-slate-100 rounded-lg transition-colors"
                                                    >
                                                        <i className="bi bi-eye"></i>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => downloadAssetImage(asset)}
                                                        title="Unduh Gambar"
                                                        className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-slate-100 rounded-lg transition-colors"
                                                    >
                                                        <i className="bi bi-download"></i>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => openEditModal(asset)}
                                                        title="Edit Aset"
                                                        className="p-1.5 text-slate-600 hover:text-amber-700 hover:bg-slate-100 rounded-lg transition-colors"
                                                    >
                                                        <i className="bi bi-pencil"></i>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDelete(asset.id, asset.namaPemilik)}
                                                        title="Hapus Aset"
                                                        className="p-1.5 text-slate-600 hover:text-rose-700 hover:bg-slate-100 rounded-lg transition-colors"
                                                    >
                                                        <i className="bi bi-trash3"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    /* Grid / Card View */
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredAssets.map(asset => (
                            <div key={asset.id} className="rounded-xl border border-slate-200 bg-white p-4 hover:shadow-md transition-shadow flex flex-col justify-between">
                                <div>
                                    <div className="flex justify-between items-start mb-3">
                                        {getTypeBadge(asset.type)}
                                        <div className="flex items-center gap-1">
                                            <button
                                                type="button"
                                                onClick={() => downloadAssetImage(asset)}
                                                title="Unduh Gambar"
                                                className="text-slate-500 hover:text-blue-600 hover:bg-blue-50 p-1.5 rounded-lg transition-colors"
                                            >
                                                <i className="bi bi-download"></i>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => openEditModal(asset)}
                                                title="Edit"
                                                className="text-slate-500 hover:text-amber-600 hover:bg-amber-50 p-1.5 rounded-lg transition-colors"
                                            >
                                                <i className="bi bi-pencil"></i>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDelete(asset.id, asset.namaPemilik)}
                                                title="Hapus"
                                                className="text-slate-500 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition-colors"
                                            >
                                                <i className="bi bi-trash3"></i>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Preview Box */}
                                    <div
                                        onClick={() => setPreviewingAsset(asset)}
                                        className="group relative bg-slate-50 border border-slate-100 rounded-xl p-4 mb-3 flex items-center justify-center min-h-[110px] cursor-pointer hover:border-teal-300 transition-all overflow-hidden"
                                    >
                                        <img
                                            src={asset.base64Image}
                                            alt={asset.namaPemilik}
                                            className="max-h-[90px] max-w-full object-contain"
                                        />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1">
                                            <i className="bi bi-zoom-in"></i> Perbesar
                                        </div>
                                    </div>

                                    <div className="text-center px-1">
                                        <div className="font-bold text-slate-800 text-sm truncate">{asset.namaPemilik}</div>
                                        <div className="text-xs text-slate-500 mt-0.5 truncate">{asset.jabatan || 'Tidak ada jabatan'}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </SectionCard>

            {/* Modal Zoom Preview Gambar Penuh */}
            {previewingAsset && (
                <div className="fixed inset-0 z-[160] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in" onClick={() => setPreviewingAsset(null)}>
                    <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                {getTypeBadge(previewingAsset.type)}
                                <span className="font-bold text-slate-800 text-sm truncate max-w-[200px]">{previewingAsset.namaPemilik}</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setPreviewingAsset(null)}
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                            >
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>
                        <div className="p-6 bg-slate-100/80 flex items-center justify-center min-h-[220px]">
                            <img
                                src={previewingAsset.base64Image}
                                alt={previewingAsset.namaPemilik}
                                className="max-h-[260px] max-w-full object-contain drop-shadow-sm"
                            />
                        </div>
                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                            <div className="text-xs text-slate-500">
                                <div><span className="font-medium text-slate-700">Jabatan:</span> {previewingAsset.jabatan || '-'}</div>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => downloadAssetImage(previewingAsset)}
                                    className="px-3.5 py-1.5 rounded-xl bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 inline-flex items-center gap-1.5"
                                >
                                    <i className="bi bi-download"></i> Unduh File
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPreviewingAsset(null)}
                                    className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50"
                                >
                                    Tutup
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Add / Edit Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200">
                        <div className="flex items-center justify-between border-b border-slate-100 p-4 bg-slate-50/70">
                            <div className="flex items-center gap-2">
                                <span className="p-2 rounded-xl bg-teal-100 text-teal-700">
                                    <i className="bi bi-image-fill"></i>
                                </span>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-800">{editingAsset ? 'Edit Aset Digital' : 'Tambah Aset Digital Baru'}</h3>
                                    <p className="text-[11px] text-slate-500">Format PNG transparan sangat disarankan untuk TTD & Stempel</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => { setShowAddModal(false); resetForm(); }}
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                            >
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>

                        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
                            {/* Tipe Aset */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Tipe Aset Digital</label>
                                <div className="grid grid-cols-3 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, type: 'ttd' }))}
                                        className={`py-2 px-3 rounded-xl border text-xs font-semibold text-center transition-all ${
                                            formData.type === 'ttd' ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-2xs' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                                        }`}
                                    >
                                        <i className="bi bi-pen block text-base mb-0.5"></i>
                                        Tanda Tangan
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, type: 'stempel' }))}
                                        className={`py-2 px-3 rounded-xl border text-xs font-semibold text-center transition-all ${
                                            formData.type === 'stempel' ? 'border-rose-500 bg-rose-50 text-rose-700 shadow-2xs' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                                        }`}
                                    >
                                        <i className="bi bi-patch-check block text-base mb-0.5"></i>
                                        Stempel Cap
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, type: 'kop' }))}
                                        className={`py-2 px-3 rounded-xl border text-xs font-semibold text-center transition-all ${
                                            formData.type === 'kop' ? 'border-purple-500 bg-purple-50 text-purple-700 shadow-2xs' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                                        }`}
                                    >
                                        <i className="bi bi-file-earmark-richtext block text-base mb-0.5"></i>
                                        Kop Surat
                                    </button>
                                </div>
                            </div>

                            {/* Nama Pemilik / Instansi */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    {formData.type === 'kop' ? 'Nama Lembaga / Yayasan' : 'Nama Pemilik / Pejabat Penandatangan'}
                                </label>
                                <select
                                    value={formData.namaPemilik}
                                    onChange={e => {
                                        const val = e.target.value;
                                        if (val === '__custom__') {
                                            setFormData(prev => ({ ...prev, namaPemilik: '__custom__' }));
                                        } else {
                                            const selected = activeTeachers.find(t => t.nama === val);
                                            if (selected) {
                                                const lastJabatan = selected.riwayatJabatan[selected.riwayatJabatan.length - 1];
                                                setFormData(prev => ({
                                                    ...prev,
                                                    namaPemilik: selected.nama,
                                                    customNama: '',
                                                    jabatan: lastJabatan?.jabatan || ''
                                                }));
                                            } else {
                                                setFormData(prev => ({ ...prev, namaPemilik: val }));
                                            }
                                        }
                                    }}
                                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                                >
                                    <option value="">-- Pilih dari Tenaga Pengajar / Staf --</option>
                                    {activeTeachers.map(t => {
                                        const lastJabatan = t.riwayatJabatan[t.riwayatJabatan.length - 1];
                                        return (
                                            <option key={t.id} value={t.nama}>{t.nama} {lastJabatan?.jabatan ? `(${lastJabatan.jabatan})` : ''}</option>
                                        );
                                    })}
                                    <option value="__custom__">-- Input Manual (Instansi / Lembaga / Lainnya) --</option>
                                </select>

                                {formData.namaPemilik === '__custom__' && (
                                    <input
                                        type="text"
                                        placeholder="Ketik nama pemilik / instansi..."
                                        value={formData.customNama}
                                        onChange={e => setFormData(prev => ({ ...prev, customNama: e.target.value }))}
                                        className="w-full mt-2 px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                                    />
                                )}
                            </div>

                            {/* Jabatan */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Jabatan / Keterangan</label>
                                <input
                                    type="text"
                                    value={formData.jabatan}
                                    onChange={e => setFormData(prev => ({ ...prev, jabatan: e.target.value }))}
                                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                                    placeholder="Contoh: Pengasuh Pondok / Kepala Madrasah / Bendahara"
                                />
                            </div>

                            {/* Upload File */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">File Gambar Aset</label>
                                <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 hover:border-teal-400 bg-slate-50/60 rounded-xl p-4 cursor-pointer transition-colors">
                                    <i className="bi bi-cloud-arrow-up text-2xl text-slate-400 mb-1"></i>
                                    <span className="text-xs font-medium text-slate-700">Pilih berkas atau seret ke sini</span>
                                    <span className="text-[11px] text-slate-400 mt-0.5">PNG transparan, JPG, atau WEBP</span>
                                    <input
                                        type="file"
                                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                                        onChange={handleFileUpload}
                                        className="hidden"
                                    />
                                </label>

                                {formData.base64Image && (
                                    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 flex flex-col items-center justify-center">
                                        <div className="text-[11px] font-medium text-slate-500 mb-2">Pratinjau Hasil Kompresi:</div>
                                        <img
                                            src={formData.base64Image}
                                            alt="Preview"
                                            className="max-h-[100px] max-w-full object-contain"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-4 border-t border-slate-100 bg-slate-50/70 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => { setShowAddModal(false); resetForm(); }}
                                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl border border-slate-200 bg-white"
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={handleSave}
                                disabled={isUploading}
                                className="px-5 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-xs disabled:opacity-50 inline-flex items-center gap-1.5"
                            >
                                <i className="bi bi-check-lg"></i>
                                <span>{isUploading ? 'Memproses...' : 'Simpan Aset'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
