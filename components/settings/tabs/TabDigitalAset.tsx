import React, { useState, useMemo, useEffect, useRef } from 'react';
import { DigitalAsset } from '../../../types';
import { db } from '../../../db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useAppContext } from '../../../AppContext';
import { SectionCard } from '../../common/SectionCard';
import { SignatureDropzone } from '../../common/SignatureDropzone';
import { optimizeSignatureImage } from '../../../utils/imageOptimizer';
import {
    getActiveTenagaPengajar,
    getTeacherPrimaryRoleLabel,
    findStrictTeacherTtdAsset,
    upsertTeacherTtdAsset,
    findJenjangStempelAsset,
    upsertJenjangStempelAsset,
    reconcileDigitalAssetsWithSettings,
    upsertInstitutionDigitalAsset,
} from '../../../utils/digitalAssetUtils';

type AssetFilterType = 'all' | 'ttd' | 'stempel' | 'kop' | 'lainnya';

export const TabDigitalAset: React.FC = () => {
    const { settings, onSaveSettings, showToast, showConfirmation } = useAppContext();
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingAsset, setEditingAsset] = useState<DigitalAsset | null>(null);
    const [previewingAsset, setPreviewingAsset] = useState<DigitalAsset | null>(null);
    const [activeFilter, setActiveFilter] = useState<AssetFilterType>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
    const [isPageDropActive, setIsPageDropActive] = useState(false);
    const pageDragCounter = useRef(0);

    const [formData, setFormData] = useState<{
        type: DigitalAsset['type'];
        selectedOwnerKey: string; // 'guru:<id>' | '__custom__' | ''
        customNama: string;
        jabatan: string;
        base64Image: string;
        setAsPrimaryStempel: boolean;
    }>({
        type: 'ttd',
        selectedOwnerKey: '',
        customNama: '',
        jabatan: '',
        base64Image: '',
        setAsPrimaryStempel: false,
    });

    const assets = useLiveQuery(() => db.digitalAssets.toArray(), []) || [];

    useEffect(() => {
        reconcileDigitalAssetsWithSettings(settings).catch(() => {});
    }, [settings]);

    // Seluruh tenaga pendidik & kependidikan/pengurus aktif (tanpa bug riwayatJabatan masa lalu)
    const activeTeachers = useMemo(
        () => [...getActiveTenagaPengajar(settings)].sort((a, b) => a.nama.localeCompare(b.nama)),
        [settings]
    );

    const counts = useMemo(
        () => ({
            total: assets.length,
            ttd: assets.filter((a) => a.type === 'ttd').length,
            stempel: assets.filter((a) => a.type === 'stempel').length,
            kop: assets.filter((a) => a.type === 'kop').length,
            lainnya: assets.filter((a) => a.type === 'lainnya').length,
        }),
        [assets]
    );

    const filteredAssets = useMemo(() => {
        return assets.filter((a) => {
            const matchesFilter = activeFilter === 'all' || a.type === activeFilter;
            const q = searchQuery.trim().toLowerCase();
            const matchesSearch =
                !q ||
                a.namaPemilik.toLowerCase().includes(q) ||
                (a.jabatan && a.jabatan.toLowerCase().includes(q));
            return matchesFilter && matchesSearch;
        });
    }, [assets, activeFilter, searchQuery]);

    const resetForm = () => {
        setFormData({
            type: 'ttd',
            selectedOwnerKey: '',
            customNama: '',
            jabatan: '',
            base64Image: '',
            setAsPrimaryStempel: false,
        });
        setEditingAsset(null);
    };

    const handleOwnerSelectChange = (val: string) => {
        if (val === '__custom__' || val === '') {
            setFormData((prev) => ({
                ...prev,
                selectedOwnerKey: val,
                customNama: val === '__custom__' ? prev.customNama : '',
            }));
            return;
        }

        if (val === 'ponpes_primary') {
            const primaryExisting = assets.find((a) => a.systemRole === 'stempel_ponpes');
            setFormData((prev) => ({
                ...prev,
                selectedOwnerKey: val,
                customNama: settings.namaPonpes || 'Pondok Pesantren',
                jabatan: 'Stempel Resmi Utama ($STEMPEL_PONPES)',
                setAsPrimaryStempel: true,
                base64Image: prev.base64Image || primaryExisting?.base64Image || settings.stempelPonpesUrl || '',
            }));
            return;
        }

        if (val.startsWith('jenjang:')) {
            const jId = Number(val.slice(8));
            const jenjangObj = (settings.jenjang || []).find((j) => Number(j.id) === jId);
            if (jenjangObj) {
                const existingJ = findJenjangStempelAsset(assets, jenjangObj);
                setFormData((prev) => ({
                    ...prev,
                    selectedOwnerKey: val,
                    customNama: jenjangObj.nama,
                    jabatan: `Stempel Resmi Marhalah ${jenjangObj.kode ? `(${jenjangObj.kode})` : jenjangObj.nama} ($STEMPEL_MARHALAH)`,
                    setAsPrimaryStempel: false,
                    base64Image: prev.base64Image || existingJ?.base64Image || '',
                }));
            }
            return;
        }

        if (val.startsWith('guru:')) {
            const guruId = Number(val.slice(5));
            const teacher = activeTeachers.find((t) => Number(t.id) === guruId);
            if (teacher) {
                const roleLabel = getTeacherPrimaryRoleLabel(teacher, settings);
                const existingTtd = formData.type === 'ttd' ? findStrictTeacherTtdAsset(assets, teacher) : undefined;
                setFormData((prev) => ({
                    ...prev,
                    selectedOwnerKey: val,
                    customNama: '',
                    jabatan: roleLabel,
                    base64Image: prev.base64Image || existingTtd?.base64Image || '',
                }));
            }
        }
    };

    const handleSave = async () => {
        let finalNama = '';
        let linkedGuruId: number | undefined = undefined;
        let linkedJenjangId: number | undefined = undefined;

        if (formData.selectedOwnerKey.startsWith('guru:')) {
            const guruId = Number(formData.selectedOwnerKey.slice(5));
            const selectedTeacher = activeTeachers.find((t) => Number(t.id) === guruId);
            if (selectedTeacher) {
                finalNama = selectedTeacher.nama.trim();
                linkedGuruId = selectedTeacher.id;
            }
        } else if (formData.selectedOwnerKey === 'ponpes_primary') {
            finalNama = settings.namaPonpes || 'Pondok Pesantren';
        } else if (formData.selectedOwnerKey.startsWith('jenjang:')) {
            const jId = Number(formData.selectedOwnerKey.slice(8));
            const jenjangObj = (settings.jenjang || []).find((j) => Number(j.id) === jId);
            if (jenjangObj) {
                finalNama = jenjangObj.nama.trim();
                linkedJenjangId = jenjangObj.id;
            }
        } else if (formData.selectedOwnerKey === '__custom__') {
            finalNama = formData.customNama.trim();
        }

        if (!finalNama) {
            showToast('Pilih pemilik dari Data Master atau ketik nama instansi/pemilik.', 'info');
            return;
        }

        if (!formData.base64Image) {
            showToast('Unggah atau seret gambar aset terlebih dahulu.', 'info');
            return;
        }

        try {
            // Jika TTD untuk guru/pengurus dari Data Master, gunakan upsertTeacherTtdAsset agar bebas duplikat & sinkron penuh
            if (formData.type === 'ttd' && linkedGuruId !== undefined) {
                const teacher = activeTeachers.find((t) => Number(t.id) === linkedGuruId);
                if (teacher) {
                    await upsertTeacherTtdAsset(teacher, formData.base64Image, settings, formData.jabatan.trim());
                    showToast(`TTD ${teacher.nama} tersimpan dan terhubung ke Data Master.`, 'success');
                    setShowAddModal(false);
                    resetForm();
                    return;
                }
            }

            // Jika Stempel untuk Jenjang/Marhalah dari Data Master, gunakan upsertJenjangStempelAsset
            if (formData.type === 'stempel' && linkedJenjangId !== undefined) {
                const jenjangObj = (settings.jenjang || []).find((j) => Number(j.id) === linkedJenjangId);
                if (jenjangObj) {
                    await upsertJenjangStempelAsset(jenjangObj, formData.base64Image, formData.jabatan.trim());
                    showToast(`Stempel Marhalah ${jenjangObj.nama} tersimpan dan terhubung ke Data Master.`, 'success');
                    setShowAddModal(false);
                    resetForm();
                    return;
                }
            }

            // Jika mengedit aset utama lembaga (Logo / Stempel Utama), sinkronkan balik ke PondokSettings
            if (editingAsset?.systemRole && editingAsset.systemRole !== 'kop_utama') {
                await upsertInstitutionDigitalAsset(
                    editingAsset.systemRole,
                    formData.base64Image,
                    settings.namaPonpes,
                    settings.namaYayasan
                );
                const patchKey =
                    editingAsset.systemRole === 'logo_ponpes'
                        ? 'logoPonpesUrl'
                        : editingAsset.systemRole === 'logo_yayasan'
                        ? 'logoYayasanUrl'
                        : 'stempelPonpesUrl';
                await onSaveSettings({ ...settings, [patchKey]: formData.base64Image });
                showToast('Aset utama lembaga diperbarui dan disinkronkan ke Pengaturan Umum.', 'success');
                setShowAddModal(false);
                resetForm();
                return;
            }

            if (formData.type === 'stempel' && formData.setAsPrimaryStempel) {
                await upsertInstitutionDigitalAsset(
                    'stempel_ponpes',
                    formData.base64Image,
                    finalNama || settings.namaPonpes,
                    settings.namaYayasan
                );
                await onSaveSettings({ ...settings, stempelPonpesUrl: formData.base64Image });
                showToast('Stempel disimpan dan ditetapkan sebagai Stempel Resmi Utama Pondok.', 'success');
                setShowAddModal(false);
                resetForm();
                return;
            }

            const asset: DigitalAsset = {
                id: editingAsset?.id || `asset_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                type: formData.type,
                namaPemilik: finalNama,
                jabatan: formData.jabatan.trim(),
                guruId: formData.type === 'ttd' ? linkedGuruId : undefined,
                systemRole: editingAsset?.systemRole,
                base64Image: formData.base64Image,
                lastModified: Date.now(),
            };

            await db.digitalAssets.put(asset);
            showToast(editingAsset ? 'Aset digital berhasil diperbarui.' : 'Aset digital berhasil ditambahkan.', 'success');
            setShowAddModal(false);
            resetForm();
        } catch (error) {
            console.error('Gagal menyimpan aset digital:', error);
            showToast('Gagal menyimpan aset digital ke database.', 'error');
        }
    };

    const handleDelete = (asset: DigitalAsset) => {
        showConfirmation(
            'Hapus Aset Digital',
            `Apakah Anda yakin ingin menghapus aset "${asset.namaPemilik}"? Cetakan Rapor atau Surat yang merujuk aset ini akan otomatis dikosongkan.`,
            async () => {
                try {
                    await db.digitalAssets.delete(asset.id);
                    if (asset.systemRole === 'logo_ponpes') {
                        await onSaveSettings({ ...settings, logoPonpesUrl: '' });
                    } else if (asset.systemRole === 'logo_yayasan') {
                        await onSaveSettings({ ...settings, logoYayasanUrl: '' });
                    } else if (asset.systemRole === 'stempel_ponpes') {
                        await onSaveSettings({ ...settings, stempelPonpesUrl: '' });
                    }
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
        const matchedTeacher =
            asset.guruId !== undefined
                ? activeTeachers.find((t) => Number(t.id) === Number(asset.guruId))
                : activeTeachers.find((t) => t.nama.trim().toLowerCase() === asset.namaPemilik.trim().toLowerCase());

        let ownerKey = '__custom__';
        if (asset.type === 'ttd' && matchedTeacher) {
            ownerKey = `guru:${matchedTeacher.id}`;
        } else if (asset.type === 'stempel') {
            if (asset.systemRole === 'stempel_ponpes') {
                ownerKey = 'ponpes_primary';
            } else if (asset.jenjangId !== undefined && asset.jenjangId !== null) {
                ownerKey = `jenjang:${asset.jenjangId}`;
            }
        }

        setFormData({
            type: asset.type,
            selectedOwnerKey: ownerKey,
            customNama: ownerKey === '__custom__' ? asset.namaPemilik : '',
            jabatan: asset.jabatan || '',
            base64Image: asset.base64Image,
            setAsPrimaryStempel: asset.systemRole === 'stempel_ponpes',
        });
        setShowAddModal(true);
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

    const copyMediaTag = (asset: DigitalAsset) => {
        let tag = `$ASSET_${asset.id}`;
        if (asset.systemRole === 'logo_ponpes') tag = '$LOGO_PONPES';
        else if (asset.systemRole === 'logo_yayasan') tag = '$LOGO_YAYASAN';
        else if (asset.systemRole === 'stempel_ponpes') tag = '$STEMPEL_PONPES';
        else if (asset.type === 'stempel' && asset.jenjangId !== undefined) tag = '$STEMPEL_MARHALAH';
        else if (asset.type === 'kop') tag = '$KOP_SURAT';
        else if (asset.type === 'ttd' && asset.guruId !== undefined) tag = `$TTD_PENGAJAR:${asset.guruId}`;

        navigator.clipboard?.writeText(tag).then(() => {
            showToast(`Kode tag ${tag} disalin ke papan klip.`, 'success');
        }).catch(() => {
            showToast(`Gunakan kode tag: ${tag}`, 'info');
        });
    };

    const handlePageDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
        if (showAddModal) return;
        e.preventDefault();
        pageDragCounter.current += 1;
        if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
            setIsPageDropActive(true);
        }
    };

    const handlePageDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        if (showAddModal) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    };

    const handlePageDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        if (showAddModal) return;
        e.preventDefault();
        pageDragCounter.current = Math.max(0, pageDragCounter.current - 1);
        if (pageDragCounter.current === 0) {
            setIsPageDropActive(false);
        }
    };

    const handlePageDrop = async (e: React.DragEvent<HTMLDivElement>) => {
        if (showAddModal) return;
        e.preventDefault();
        e.stopPropagation();
        pageDragCounter.current = 0;
        setIsPageDropActive(false);

        const file = e.dataTransfer.files?.[0];
        if (!file || !file.type.startsWith('image/')) {
            if (file) showToast('Gunakan berkas gambar (PNG, JPG, WEBP, atau SVG).', 'error');
            return;
        }

        try {
            const optimized = await optimizeSignatureImage(file, { maxWidth: 650, maxHeight: 360 });
            resetForm();
            setFormData((prev) => ({
                ...prev,
                type: activeFilter === 'all' ? 'ttd' : activeFilter,
                base64Image: optimized,
            }));
            setShowAddModal(true);
            showToast('Gambar berhasil dimuat. Pilih pemilik aset lalu klik Simpan.', 'info');
        } catch (err: any) {
            showToast(err?.message || 'Gagal memuat berkas gambar.', 'error');
        }
    };

    const getTypeLabel = (type: DigitalAsset['type']) => {
        switch (type) {
            case 'ttd':
                return <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700"><i className="bi bi-pen-fill"></i> Tanda Tangan</span>;
            case 'stempel':
                return <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700"><i className="bi bi-patch-check-fill"></i> Stempel Resmi</span>;
            case 'kop':
                return <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-700"><i className="bi bi-file-earmark-richtext-fill"></i> Kop Dokumen</span>;
            default:
                return <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700"><i className="bi bi-shield-check"></i> Logo / Identitas</span>;
        }
    };

    return (
        <div
            className="space-y-6 relative"
            onDragEnter={handlePageDragEnter}
            onDragOver={handlePageDragOver}
            onDragLeave={handlePageDragLeave}
            onDrop={handlePageDrop}
        >
            {isPageDropActive && (
                <div className="fixed inset-4 z-[140] rounded-2xl border-2 border-dashed border-teal-500 bg-teal-900/20 backdrop-blur-xs pointer-events-none flex items-center justify-center">
                    <div className="bg-white px-6 py-4 rounded-2xl shadow-xl border border-teal-200 flex items-center gap-3 text-teal-800 font-bold text-sm">
                        <i className="bi bi-cloud-arrow-down-fill text-2xl text-teal-600"></i>
                        <span>Lepaskan berkas gambar di mana saja untuk menambahkan Aset Digital baru</span>
                    </div>
                </div>
            )}

            <SectionCard
                title="Manajemen Aset Digital Terpusat"
                description="Kelola tanda tangan pengurus/pendidik (terintegrasi dua arah dengan Data Master), stempel resmi, logo lembaga, dan kop dokumen. Anda juga dapat menyeret & melepas (drag & drop) gambar langsung ke halaman ini."
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
                            <div className="text-xs font-medium text-purple-700">Kop & Logo</div>
                            <div className="text-lg font-bold text-purple-950">{counts.kop + counts.lainnya}</div>
                        </div>
                    </div>
                </div>

                {/* Filter & Action Toolbar */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2">
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="flex flex-wrap rounded-xl bg-slate-100 p-1 border border-slate-200">
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
                                Kop ({counts.kop})
                            </button>
                            {counts.lainnya > 0 && (
                                <button
                                    type="button"
                                    onClick={() => setActiveFilter('lainnya')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                        activeFilter === 'lainnya' ? 'bg-teal-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    Logo ({counts.lainnya})
                                </button>
                            )}
                        </div>

                        <div className="relative min-w-[200px]">
                            <i className="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                            <input
                                type="text"
                                placeholder="Cari nama atau jabatan..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-auto">
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
                            onClick={() => {
                                resetForm();
                                setShowAddModal(true);
                            }}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs transition-colors"
                        >
                            <i className="bi bi-plus-lg"></i>
                            <span>Tambah Aset Digital</span>
                        </button>
                    </div>
                </div>

                {/* Main Content */}
                {filteredAssets.length === 0 ? (
                    <div className="rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center text-slate-500 bg-slate-50/50">
                        <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center text-2xl">
                            <i className="bi bi-cloud-arrow-up"></i>
                        </div>
                        <h4 className="font-semibold text-slate-700 text-sm">Belum Ada Aset Digital</h4>
                        <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                            {searchQuery
                                ? 'Tidak ada aset yang cocok dengan kata kunci pencarian.'
                                : 'Seret & lepas (drag & drop) gambar langsung ke halaman ini, tambahkan dari Data Master, atau klik tombol di bawah.'}
                        </p>
                        <button
                            type="button"
                            onClick={() => {
                                resetForm();
                                setShowAddModal(true);
                            }}
                            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 shadow-xs"
                        >
                            <i className="bi bi-plus-circle"></i> Tambah Aset Pertama
                        </button>
                    </div>
                ) : viewMode === 'table' ? (
                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs text-slate-600">
                                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                                    <tr>
                                        <th scope="col" className="px-4 py-3 w-12 text-center">No</th>
                                        <th scope="col" className="px-4 py-3 w-28 text-center">Pratinjau</th>
                                        <th scope="col" className="px-4 py-3">Tipe Aset</th>
                                        <th scope="col" className="px-4 py-3">Nama Pemilik / Dokumen</th>
                                        <th scope="col" className="px-4 py-3">Jabatan & Sinkronisasi</th>
                                        <th scope="col" className="px-4 py-3 text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredAssets.map((asset, index) => {
                                        const isLinkedMaster =
                                            (asset.type === 'ttd' && asset.guruId !== undefined) ||
                                            (asset.type === 'stempel' && asset.jenjangId !== undefined);
                                        return (
                                            <tr key={asset.id} className="hover:bg-slate-50/80 transition-colors">
                                                <td className="px-4 py-3 text-center text-slate-400 font-medium">{index + 1}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <div
                                                        onClick={() => setPreviewingAsset(asset)}
                                                        className="group relative w-20 h-12 mx-auto rounded-lg border border-slate-200 bg-[linear-gradient(45deg,#f1f5f9_25%,transparent_25%,transparent_75%,#f1f5f9_75%,#f1f5f9),linear-gradient(45deg,#f1f5f9_25%,transparent_25%,transparent_75%,#f1f5f9_75%,#f1f5f9)] bg-[length:12px_12px] bg-[position:0_0,6px_6px] bg-white p-1 flex items-center justify-center cursor-pointer hover:border-teal-400 hover:shadow-xs transition-all overflow-hidden"
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
                                                <td className="px-4 py-3 font-medium">{getTypeLabel(asset.type)}</td>
                                                <td className="px-4 py-3">
                                                    <div className="font-semibold text-slate-800 text-sm">{asset.namaPemilik}</div>
                                                    <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                                                        {isLinkedMaster ? (
                                                            <span className="text-teal-700 font-medium inline-flex items-center gap-1">
                                                                <i className="bi bi-link-45deg"></i> Terhubung Data Master
                                                            </span>
                                                        ) : asset.systemRole ? (
                                                            <span className="text-indigo-700 font-medium inline-flex items-center gap-1">
                                                                <i className="bi bi-building-check"></i> Aset Utama Lembaga
                                                            </span>
                                                        ) : (
                                                            <span>ID: {asset.id.substring(0, 14)}</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="text-slate-700 font-medium">{asset.jabatan || '-'}</div>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="inline-flex items-center gap-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => copyMediaTag(asset)}
                                                            title="Salin Kode Tag Rapor"
                                                            className="p-1.5 text-slate-600 hover:text-purple-700 hover:bg-slate-100 rounded-lg transition-colors"
                                                        >
                                                            <i className="bi bi-code-slash"></i>
                                                        </button>
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
                                                            title="Edit / Ganti Berkas"
                                                            className="p-1.5 text-slate-600 hover:text-amber-700 hover:bg-slate-100 rounded-lg transition-colors"
                                                        >
                                                            <i className="bi bi-pencil"></i>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDelete(asset)}
                                                            title="Hapus Aset"
                                                            className="p-1.5 text-slate-600 hover:text-rose-700 hover:bg-slate-100 rounded-lg transition-colors"
                                                        >
                                                            <i className="bi bi-trash3"></i>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredAssets.map((asset) => {
                            const isLinkedMaster =
                                (asset.type === 'ttd' && asset.guruId !== undefined) ||
                                (asset.type === 'stempel' && asset.jenjangId !== undefined);
                            return (
                                <div key={asset.id} className="rounded-xl border border-slate-200 bg-white p-4 hover:shadow-md transition-shadow flex flex-col justify-between">
                                    <div>
                                        <div className="flex justify-between items-start mb-3">
                                            {getTypeLabel(asset.type)}
                                            <div className="flex items-center gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => copyMediaTag(asset)}
                                                    title="Salin Kode Tag Rapor"
                                                    className="text-slate-500 hover:text-purple-600 hover:bg-purple-50 p-1.5 rounded-lg transition-colors"
                                                >
                                                    <i className="bi bi-code-slash"></i>
                                                </button>
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
                                                    onClick={() => handleDelete(asset)}
                                                    title="Hapus"
                                                    className="text-slate-500 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition-colors"
                                                >
                                                    <i className="bi bi-trash3"></i>
                                                </button>
                                            </div>
                                        </div>

                                        <div
                                            onClick={() => setPreviewingAsset(asset)}
                                            className="group relative border border-slate-100 rounded-xl p-4 mb-3 flex items-center justify-center min-h-[110px] cursor-pointer hover:border-teal-300 transition-all overflow-hidden bg-[linear-gradient(45deg,#f8fafc_25%,transparent_25%,transparent_75%,#f8fafc_75%,#f8fafc),linear-gradient(45deg,#f8fafc_25%,transparent_25%,transparent_75%,#f8fafc_75%,#f8fafc)] bg-[length:16px_16px] bg-[position:0_0,8px_8px] bg-white"
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
                                            <div className="text-xs text-slate-500 mt-0.5 truncate">{asset.jabatan || '-'}</div>
                                            {isLinkedMaster && (
                                                <div className="text-[11px] text-teal-700 font-medium mt-1">
                                                    <i className="bi bi-link-45deg"></i> Terhubung Data Master
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </SectionCard>

            {/* Modal Zoom Preview */}
            {previewingAsset && (
                <div className="fixed inset-0 z-[160] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in" onClick={() => setPreviewingAsset(null)}>
                    <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200" onClick={(e) => e.stopPropagation()}>
                        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                {getTypeLabel(previewingAsset.type)}
                                <span className="text-slate-300">•</span>
                                <span className="font-bold text-slate-800 text-sm truncate max-w-[220px]">{previewingAsset.namaPemilik}</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setPreviewingAsset(null)}
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                            >
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>
                        <div className="p-6 flex items-center justify-center min-h-[220px] bg-[linear-gradient(45deg,#f1f5f9_25%,transparent_25%,transparent_75%,#f1f5f9_75%,#f1f5f9),linear-gradient(45deg,#f1f5f9_25%,transparent_25%,transparent_75%,#f1f5f9_75%,#f1f5f9)] bg-[length:20px_20px] bg-[position:0_0,10px_10px] bg-white">
                            <img
                                src={previewingAsset.base64Image}
                                alt={previewingAsset.namaPemilik}
                                className="max-h-[260px] max-w-full object-contain drop-shadow-sm"
                            />
                        </div>
                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                            <div className="text-xs text-slate-500">
                                <span className="font-medium text-slate-700">Jabatan / Keterangan:</span> {previewingAsset.jabatan || '-'}
                            </div>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => downloadAssetImage(previewingAsset)}
                                    className="px-3.5 py-1.5 rounded-xl bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 inline-flex items-center gap-1.5"
                                >
                                    <i className="bi bi-download"></i> Unduh
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
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
                        <div className="flex items-center justify-between border-b border-slate-100 p-4 bg-slate-50/70">
                            <div className="flex items-center gap-2.5">
                                <span className="p-2 rounded-xl bg-teal-100 text-teal-700">
                                    <i className="bi bi-image-fill"></i>
                                </span>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-800">
                                        {editingAsset ? 'Edit Aset Digital' : 'Tambah Aset Digital Baru'}
                                    </h3>
                                    <p className="text-[11px] text-slate-500">
                                        Mendukung seret & lepas (drag & drop), tempel (Ctrl+V), dan hapus background putih otomatis
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowAddModal(false);
                                    resetForm();
                                }}
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                            >
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>

                        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Tipe Aset Digital</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {[
                                        { key: 'ttd', label: 'Tanda Tangan', icon: 'bi-pen', activeCls: 'border-blue-500 bg-blue-50 text-blue-700' },
                                        { key: 'stempel', label: 'Stempel Cap', icon: 'bi-patch-check', activeCls: 'border-rose-500 bg-rose-50 text-rose-700' },
                                        { key: 'kop', label: 'Kop Dokumen', icon: 'bi-file-earmark-richtext', activeCls: 'border-purple-500 bg-purple-50 text-purple-700' },
                                        { key: 'lainnya', label: 'Logo / Lain', icon: 'bi-shield-check', activeCls: 'border-teal-500 bg-teal-50 text-teal-700' },
                                    ].map((item) => (
                                        <button
                                            key={item.key}
                                            type="button"
                                            disabled={Boolean(editingAsset?.systemRole)}
                                             onClick={() =>
                                                setFormData((prev) => ({
                                                    ...prev,
                                                    type: item.key as DigitalAsset['type'],
                                                    selectedOwnerKey:
                                                        item.key === 'ttd'
                                                            ? prev.selectedOwnerKey.startsWith('guru:')
                                                                ? prev.selectedOwnerKey
                                                                : ''
                                                            : item.key === 'stempel'
                                                            ? 'ponpes_primary'
                                                            : '__custom__',
                                                    setAsPrimaryStempel: item.key === 'stempel',
                                                    jabatan:
                                                        item.key === 'stempel'
                                                            ? 'Stempel Resmi Utama ($STEMPEL_PONPES)'
                                                            : prev.jabatan,
                                                    customNama:
                                                        item.key !== 'ttd' && !prev.customNama
                                                            ? settings.namaPonpes || ''
                                                            : prev.customNama,
                                                }))
                                            }
                                            className={`py-2 px-2 rounded-xl border text-[11px] font-semibold text-center transition-all disabled:opacity-60 ${
                                                formData.type === item.key ? `${item.activeCls} shadow-2xs` : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                                            }`}
                                        >
                                            <i className={`bi ${item.icon} block text-base mb-0.5`}></i>
                                            {item.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {formData.type === 'ttd' ? (
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        Pilih Pengurus / Pendidik dari Data Master
                                    </label>
                                    <select
                                        value={formData.selectedOwnerKey}
                                        onChange={(e) => handleOwnerSelectChange(e.target.value)}
                                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                                    >
                                        <option value="">-- Pilih Pengurus / Guru / Staf --</option>
                                        {activeTeachers.map((t) => {
                                            const role = getTeacherPrimaryRoleLabel(t, settings);
                                            const hasExisting = Boolean(findStrictTeacherTtdAsset(assets, t));
                                            return (
                                                <option key={t.id} value={`guru:${t.id}`}>
                                                    {t.nama} — {role} {hasExisting ? '(Sudah ada TTD - akan diperbarui)' : ''}
                                                </option>
                                            );
                                        })}
                                        <option value="__custom__">-- Input Nama Manual (Di Luar Data Master) --</option>
                                    </select>

                                    {formData.selectedOwnerKey === '__custom__' && (
                                        <input
                                            type="text"
                                            placeholder="Ketik nama lengkap penandatangan..."
                                            value={formData.customNama}
                                            onChange={(e) => setFormData((prev) => ({ ...prev, customNama: e.target.value }))}
                                            className="w-full mt-2 px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                                        />
                                    )}
                                </div>
                            ) : formData.type === 'stempel' ? (
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        Peruntukan Stempel (Pondok Utama / Marhalah)
                                    </label>
                                    <select
                                        value={formData.selectedOwnerKey || 'ponpes_primary'}
                                        disabled={Boolean(editingAsset?.systemRole)}
                                        onChange={(e) => handleOwnerSelectChange(e.target.value)}
                                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none disabled:opacity-60"
                                    >
                                        <option value="ponpes_primary">
                                            Stempel Resmi Utama Pondok ($STEMPEL_PONPES)
                                        </option>
                                        {(settings.jenjang || []).map((j) => {
                                            const hasJ = Boolean(findJenjangStempelAsset(assets, j));
                                            return (
                                                <option key={j.id} value={`jenjang:${j.id}`}>
                                                    Stempel Marhalah: {j.nama} {j.kode ? `(${j.kode})` : ''}{' '}
                                                    {hasJ ? '(Sudah ada - perbarui)' : ''}
                                                </option>
                                            );
                                        })}
                                        <option value="__custom__">
                                            Stempel Unit / Kepanitiaan Lainnya (Input Manual)
                                        </option>
                                    </select>

                                    {formData.selectedOwnerKey === '__custom__' && (
                                        <input
                                            type="text"
                                            placeholder="Contoh: Panitia Ujian Akhir / Perpustakaan"
                                            value={formData.customNama}
                                            onChange={(e) => setFormData((prev) => ({ ...prev, customNama: e.target.value }))}
                                            className="w-full mt-2 px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none"
                                        />
                                    )}
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        Nama Lembaga / Dokumen Aset
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Contoh: Pondok Pesantren Al-Ikhlas"
                                        value={formData.customNama}
                                        onChange={(e) =>
                                            setFormData((prev) => ({
                                                ...prev,
                                                selectedOwnerKey: '__custom__',
                                                customNama: e.target.value,
                                            }))
                                        }
                                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Jabatan / Keterangan</label>
                                <input
                                    type="text"
                                    value={formData.jabatan}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, jabatan: e.target.value }))}
                                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                                    placeholder="Contoh: Mudir Aam / Wali Kelas / Stempel Resmi Pondok"
                                />
                            </div>

                            {formData.type === 'stempel' &&
                                !editingAsset?.systemRole &&
                                formData.selectedOwnerKey === '__custom__' && (
                                    <label className="flex items-center gap-2 text-xs text-slate-700 bg-rose-50/60 border border-rose-200 rounded-xl p-2.5 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.setAsPrimaryStempel}
                                            onChange={(e) => setFormData((prev) => ({ ...prev, setAsPrimaryStempel: e.target.checked }))}
                                            className="rounded text-rose-600 focus:ring-rose-500"
                                        />
                                        <span>Jadikan juga sebagai <strong>Stempel Resmi Utama Pondok</strong> ($STEMPEL_PONPES)</span>
                                    </label>
                                )}

                            <SignatureDropzone
                                label="Berkas Gambar Aset"
                                value={formData.base64Image || null}
                                onChange={(next) => setFormData((prev) => ({ ...prev, base64Image: next || '' }))}
                                maxWidth={formData.type === 'kop' ? 1400 : 650}
                                maxHeight={formData.type === 'kop' ? 450 : 360}
                                showTransparentTool={formData.type !== 'kop'}
                                helperText="Pilih berkas, seret & lepas (drag & drop) ke kotak ini, atau tempel (Ctrl+V). Gunakan tombol 'Hapus Background Putih' jika gambar difoto di kertas."
                                onError={(msg) => showToast(msg, 'error')}
                            />
                        </div>

                        <div className="p-4 border-t border-slate-100 bg-slate-50/70 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowAddModal(false);
                                    resetForm();
                                }}
                                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl border border-slate-200 bg-white"
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={handleSave}
                                className="px-5 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-xs inline-flex items-center gap-1.5"
                            >
                                <i className="bi bi-check-lg"></i>
                                <span>Simpan Aset</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
