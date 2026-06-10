import React, { useState, useMemo } from 'react';
import { DigitalAsset } from '../../../types';
import { db } from '../../../db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useAppContext } from '../../../AppContext';
import { SectionCard } from '../../common/SectionCard';
import { compressImage } from '../../../utils/imageOptimizer';

export const TabDigitalAset: React.FC = () => {
    const { settings } = useAppContext();
    const [isUploading, setIsUploading] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingAsset, setEditingAsset] = useState<DigitalAsset | null>(null);
    const [activeFilter, setActiveFilter] = useState<'all' | 'ttd' | 'stempel' | 'kop'>('all');

    // Form state
    const [formData, setFormData] = useState({
        type: 'ttd' as 'ttd' | 'stempel' | 'kop',
        namaPemilik: '',
        jabatan: '',
        base64Image: ''
    });

    const assets = useLiveQuery(() => db.digitalAssets.toArray(), []) || [];

    // Get active tenaga pengajar from settings
    const activeTeachers = useMemo(() =>
        settings.tenagaPengajar.filter(t => !t.riwayatJabatan.some(r => r.tanggalSelesai)),
        [settings.tenagaPengajar]
    );

    const filteredAssets = assets.filter(a => activeFilter === 'all' || a.type === activeFilter);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setIsUploading(true);
            try {
                const compressedBase64 = await compressImage(file, 300, 0.9);
                setFormData(prev => ({ ...prev, base64Image: compressedBase64 }));
            } catch (error) {
                console.error("Gagal kompres gambar:", error);
                alert("Gagal memproses gambar.");
            } finally {
                setIsUploading(false);
            }
        }
    };

    const handleSave = async () => {
        if (!formData.namaPemilik || !formData.base64Image) {
            alert('Nama Pemilik dan Gambar harus diisi!');
            return;
        }

        const asset: DigitalAsset = {
            id: editingAsset?.id || `asset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: formData.type,
            namaPemilik: formData.namaPemilik,
            jabatan: formData.jabatan,
            base64Image: formData.base64Image,
            lastModified: Date.now()
        };

        try {
            await db.digitalAssets.put(asset);
            setShowAddModal(false);
            setEditingAsset(null);
            setFormData({ type: 'ttd', namaPemilik: '', jabatan: '', base64Image: '' });
        } catch (error) {
            console.error('Gagal menyimpan:', error);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Yakin hapus aset digital ini?')) return;
        try {
            await db.digitalAssets.delete(id);
        } catch (error) {
            console.error('Gagal hapus:', error);
        }
    };

    const openEditModal = (asset: DigitalAsset) => {
        setEditingAsset(asset);
        setFormData({
            type: asset.type,
            namaPemilik: asset.namaPemilik,
            jabatan: asset.jabatan,
            base64Image: asset.base64Image
        });
        setShowAddModal(true);
    };

    const resetForm = () => {
        setFormData({ type: 'ttd', namaPemilik: '', jabatan: '', base64Image: '' });
        setEditingAsset(null);
    };

    const typeLabels = { ttd: 'Tanda Tangan', stempel: 'Stempel', kop: 'Kop Surat' };
    const typeColors = { ttd: 'blue', stempel: 'red', kop: 'purple' };

    return (
        <div className="space-y-6">
            <SectionCard>
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h3 className="text-lg font-bold text-app-text">Aset Digital</h3>
                        <p className="text-sm text-app-textMuted">Tanda Tangan, Stempel, dan Kop Surat untuk Laporan</p>
                    </div>
                    <button
                        onClick={() => { resetForm(); setShowAddModal(true); }}
                        className="app-button-primary"
                    >
                        <i className="bi bi-plus-circle mr-2"></i>Tambah Aset
                    </button>
                </div>

                {/* Filter Tabs */}
                <div className="flex gap-2 mb-4">
                    <button onClick={() => setActiveFilter('all')} className={`px-3 py-1.5 rounded text-sm font-medium ${activeFilter === 'all' ? 'bg-app-primary text-white' : 'app-bg-secondary text-app-textMuted'}`}>Semua</button>
                    <button onClick={() => setActiveFilter('ttd')} className={`px-3 py-1.5 rounded text-sm font-medium ${activeFilter === 'ttd' ? 'bg-blue-600 text-white' : 'app-bg-secondary text-app-textMuted'}`}>Tanda Tangan</button>
                    <button onClick={() => setActiveFilter('stempel')} className={`px-3 py-1.5 rounded text-sm font-medium ${activeFilter === 'stempel' ? 'bg-red-600 text-white' : 'app-bg-secondary text-app-textMuted'}`}>Stempel</button>
                    <button onClick={() => setActiveFilter('kop')} className={`px-3 py-1.5 rounded text-sm font-medium ${activeFilter === 'kop' ? 'bg-purple-600 text-white' : 'app-bg-secondary text-app-textMuted'}`}>Kop Surat</button>
                </div>

                {filteredAssets.length === 0 ? (
                    <div className="text-center py-12 text-app-textMuted">
                        <i className="bi bi-image text-4xl mb-3 block"></i>
                        <p>Belum ada aset digital. Klik "Tambah Aset" untuk menambahkan.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredAssets.map(asset => (
                            <div key={asset.id} className="app-card hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-3">
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium bg-${typeColors[asset.type]}-100 text-${typeColors[asset.type]}-700`}>
                                        {typeLabels[asset.type]}
                                    </span>
                                    <div className="flex gap-1">
                                        <button onClick={() => openEditModal(asset)} className="text-blue-600 hover:bg-blue-50 p-1.5 rounded"><i className="bi bi-pencil"></i></button>
                                        <button onClick={() => handleDelete(asset.id)} className="text-red-600 hover:bg-red-50 p-1.5 rounded"><i className="bi bi-trash"></i></button>
                                    </div>
                                </div>
                                <div className="bg-app-bgSecondary rounded-lg p-4 mb-3 flex items-center justify-center min-h-[100px]">
                                    <img src={asset.base64Image} alt={asset.namaPemilik} className="max-h-[80px] max-w-full object-contain" />
                                </div>
                                <div className="text-center">
                                    <div className="font-semibold text-app-text">{asset.namaPemilik}</div>
                                    <div className="text-xs text-app-textMuted">{asset.jabatan}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </SectionCard>

            {/* Add/Edit Modal */}
            {showAddModal && (
                <div className="app-overlay fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="app-modal w-full max-w-md">
                        <div className="flex items-center justify-between border-b border-app-border p-4">
                            <h3 className="text-lg font-bold text-app-text">{editingAsset ? 'Edit Aset Digital' : 'Tambah Aset Digital'}</h3>
                            <button onClick={() => { setShowAddModal(false); resetForm(); }} className="app-icon-button">
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>
                        <div className="p-4 space-y-4">
                            <div>
                                <label className="app-label">Tipe Aset</label>
                                <select
                                    value={formData.type}
                                    onChange={e => setFormData(prev => ({ ...prev, type: e.target.value as any }))}
                                    className="app-input"
                                >
                                    <option value="ttd">Tanda Tangan</option>
                                    <option value="stempel">Stempel</option>
                                    <option value="kop">Kop Surat</option>
                                </select>
                            </div>
                            <div>
                                <label className="app-label">Nama Pemilik</label>
                                <select
                                    value={formData.namaPemilik}
                                    onChange={e => {
                                        const selected = activeTeachers.find(t => t.nama === e.target.value);
                                        if (selected) {
                                            const lastJabatan = selected.riwayatJabatan[selected.riwayatJabatan.length - 1];
                                            setFormData(prev => ({
                                                ...prev,
                                                namaPemilik: selected.nama,
                                                jabatan: lastJabatan?.jabatan || ''
                                            }));
                                        } else {
                                            setFormData(prev => ({ ...prev, namaPemilik: e.target.value }));
                                        }
                                    }}
                                    className="app-input"
                                >
                                    <option value="">-- Pilih dari Data Master --</option>
                                    {activeTeachers.map(t => {
                                        const lastJabatan = t.riwayatJabatan[t.riwayatJabatan.length - 1];
                                        return (
                                            <option key={t.id} value={t.nama}>{t.nama} ({lastJabatan?.jabatan || 'N/A'})</option>
                                        );
                                    })}
                                    <option value="__custom__">-- Input Manual --</option>
                                </select>
                                {formData.namaPemilik === '__custom__' && (
                                    <input
                                        type="text"
                                        placeholder="Nama Pemilik"
                                        value={formData.namaPemilik}
                                        onChange={e => setFormData(prev => ({ ...prev, namaPemilik: e.target.value }))}
                                        className="app-input mt-2"
                                    />
                                )}
                            </div>
                            <div>
                                <label className="app-label">Jabatan</label>
                                <input
                                    type="text"
                                    value={formData.jabatan}
                                    onChange={e => setFormData(prev => ({ ...prev, jabatan: e.target.value }))}
                                    className="app-input"
                                    placeholder="Contoh: Kepala Pondok"
                                />
                            </div>
                            <div>
                                <label className="app-label">Gambar</label>
                                <input type="file" accept="image/*" onChange={handleFileUpload} className="app-input" />
                                {formData.base64Image && (
                                    <div className="mt-2 bg-app-bgSecondary rounded-lg p-4 flex items-center justify-center">
                                        <img src={formData.base64Image} alt="Preview" className="max-h-[100px] max-w-full object-contain" />
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="p-4 border-t border-app-border flex justify-end gap-2">
                            <button onClick={() => { setShowAddModal(false); resetForm(); }} className="app-button-secondary">Batal</button>
                            <button onClick={handleSave} disabled={isUploading} className="app-button-primary">
                                {isUploading ? 'Memproses...' : 'Simpan'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};