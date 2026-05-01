
import React, { useState, useMemo, useEffect } from 'react';
import { useLiveQuery } from "dexie-react-hooks";
import { useForm } from 'react-hook-form';
import { db } from '../db';
import { useAppContext } from '../AppContext';
import { Inventaris } from '../types';
import { formatRupiah, formatDateTime } from '../utils/formatters';
import { generatePdf } from '../utils/pdfGenerator';
import { loadXLSX } from '../utils/lazyClientLibs';
import { exportToHtml, exportToWord, printPreviewExact } from '../utils/exportUtils';
import { SarprasReportTemplate } from './sarpras/SarprasReportTemplate';
import { PageHeader } from './common/PageHeader';
import { SectionCard } from './common/SectionCard';
import { EmptyState } from './common/EmptyState';
import { HeaderTabs } from './common/HeaderTabs';

// --- SUB-COMPONENTS ---

const SarprasDashboard: React.FC<{ assets: Inventaris[] }> = ({ assets }) => {
    const totalAset = assets.length;
    const totalNilai = assets.reduce((sum, item) => sum + (Number(item.hargaPerolehan) || 0), 0);
    const asetBergerak = assets.filter(a => a.jenis === 'Bergerak').length;
    const asetTetap = assets.filter(a => a.jenis === 'Tidak Bergerak').length;
    
    // Condition Stats
    const kondisiStats = {
        Baik: assets.filter(a => a.kondisi === 'Baik').length,
        RusakRingan: assets.filter(a => a.kondisi === 'Rusak Ringan').length,
        RusakBerat: assets.filter(a => a.kondisi === 'Rusak Berat').length,
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <p className="text-gray-500 text-xs uppercase font-bold">Total Nilai Aset</p>
                    <p className="text-2xl font-bold text-teal-700 mt-1">{formatRupiah(totalNilai)}</p>
                    <p className="text-xs text-gray-400 mt-1">{totalAset} Item Terdaftar</p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <p className="text-gray-500 text-xs uppercase font-bold">Aset Bergerak</p>
                    <p className="text-2xl font-bold text-blue-600 mt-1">{asetBergerak}</p>
                    <p className="text-xs text-gray-400 mt-1">Alat Tulis, Elektronik, dll</p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <p className="text-gray-500 text-xs uppercase font-bold">Aset Tetap (Tanah/Bangunan)</p>
                    <p className="text-2xl font-bold text-purple-600 mt-1">{asetTetap}</p>
                    <p className="text-xs text-gray-400 mt-1">Tanah, Gedung, Sumur</p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                     <p className="text-gray-500 text-xs uppercase font-bold">Kondisi Aset</p>
                     <div className="mt-2 space-y-1">
                        <div className="flex justify-between text-xs"><span>Baik</span><span className="font-bold text-green-600">{kondisiStats.Baik}</span></div>
                        <div className="flex justify-between text-xs"><span>Rusak Ringan</span><span className="font-bold text-yellow-600">{kondisiStats.RusakRingan}</span></div>
                        <div className="flex justify-between text-xs"><span>Rusak Berat</span><span className="font-bold text-red-600">{kondisiStats.RusakBerat}</span></div>
                     </div>
                </div>
            </div>
        </div>
    );
};

interface InventarisModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Omit<Inventaris, 'id'>) => Promise<void>;
    onUpdate: (data: Inventaris) => Promise<void>;
    initialData: Inventaris | null;
}

const InventarisModal: React.FC<InventarisModalProps> = ({ isOpen, onClose, onSave, onUpdate, initialData }) => {
    const { register, handleSubmit, watch, reset, setValue } = useForm<Inventaris>();
    const watchJenis = watch('jenis', 'Bergerak');

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                reset(initialData);
            } else {
                reset({
                    kode: `INV-${new Date().getFullYear()}-${Math.floor(Math.random()*1000)}`,
                    jenis: 'Bergerak',
                    kondisi: 'Baik',
                    sumber: 'Beli Sendiri',
                    tanggalPerolehan: new Date().toISOString().split('T')[0],
                    jumlah: 1,
                    hargaPerolehan: 0
                });
            }
        }
    }, [isOpen, initialData, reset]);

    const onSubmit = async (data: Inventaris) => {
        if (initialData?.id) {
            await onUpdate({ ...data, id: initialData.id });
        } else {
            await onSave(data);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[70] flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="p-5 border-b flex justify-between items-center bg-gray-50 rounded-t-lg">
                    <h3 className="text-lg font-bold text-gray-800">{initialData ? 'Edit Aset' : 'Tambah Aset Baru'}</h3>
                    <button onClick={onClose}><i className="bi bi-x-lg"></i></button>
                </div>
                <form onSubmit={handleSubmit(onSubmit)} className="flex-grow overflow-y-auto p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Kode Barang</label>
                            <input type="text" {...register('kode', { required: true })} className="w-full border rounded p-2 text-sm bg-gray-50" />
                        </div>
                         <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Jenis Aset</label>
                            <select {...register('jenis')} className="w-full border rounded p-2 text-sm">
                                <option value="Bergerak">Barang Bergerak</option>
                                <option value="Tidak Bergerak">Barang Tidak Bergerak (Tanah/Bangunan)</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Nama Barang / Aset</label>
                        <input type="text" {...register('nama', { required: true })} className="w-full border rounded p-2 text-sm" placeholder={watchJenis === 'Bergerak' ? 'Contoh: Laptop Asus, Meja Belajar' : 'Contoh: Tanah Wakaf H. Fulan, Gedung Asrama A'} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Kategori</label>
                            <input list="kategori-list" {...register('kategori')} className="w-full border rounded p-2 text-sm" placeholder="Ketik atau pilih..." />
                            <datalist id="kategori-list">
                                <option value="Elektronik"/>
                                <option value="Meubeler"/>
                                <option value="Kendaraan"/>
                                <option value="Peralatan Dapur"/>
                                <option value="Tanah"/>
                                <option value="Bangunan"/>
                            </datalist>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Lokasi Penempatan</label>
                            <input type="text" {...register('lokasi')} className="w-full border rounded p-2 text-sm" placeholder="Gedung / Ruangan / Alamat" />
                        </div>
                    </div>

                    {watchJenis === 'Bergerak' ? (
                        <div className="p-3 bg-blue-50 rounded border border-blue-100 grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-blue-800 mb-1">Jumlah</label>
                                <input type="number" {...register('jumlah', { valueAsNumber: true })} className="w-full border rounded p-2 text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-blue-800 mb-1">Satuan</label>
                                <input type="text" {...register('satuan')} className="w-full border rounded p-2 text-sm" placeholder="Unit, Pcs, Set" />
                            </div>
                             <div>
                                <label className="block text-xs font-bold text-blue-800 mb-1">Kondisi</label>
                                <select {...register('kondisi')} className="w-full border rounded p-2 text-sm">
                                    <option value="Baik">Baik</option>
                                    <option value="Rusak Ringan">Rusak Ringan</option>
                                    <option value="Rusak Berat">Rusak Berat</option>
                                    <option value="Afkir">Afkir (Dibuang)</option>
                                </select>
                            </div>
                        </div>
                    ) : (
                        <div className="p-3 bg-green-50 rounded border border-green-100 grid grid-cols-2 gap-4">
                             <div>
                                <label className="block text-xs font-bold text-green-800 mb-1">Luas (m²)</label>
                                <input type="number" {...register('luas', { valueAsNumber: true })} className="w-full border rounded p-2 text-sm" placeholder="Luas area" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-green-800 mb-1">Legalitas / Sertifikat</label>
                                <input type="text" {...register('legalitas')} className="w-full border rounded p-2 text-sm" placeholder="SHM No... / Akta Wakaf" />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-xs font-bold text-green-800 mb-1">Kondisi Fisik</label>
                                <select {...register('kondisi')} className="w-full border rounded p-2 text-sm">
                                    <option value="Baik">Baik / Terawat</option>
                                    <option value="Rusak Ringan">Perlu Renovasi Ringan</option>
                                    <option value="Rusak Berat">Perlu Renovasi Berat</option>
                                </select>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4 border-t pt-4">
                         <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Tanggal Perolehan</label>
                            <input type="date" {...register('tanggalPerolehan')} className="w-full border rounded p-2 text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Sumber Perolehan</label>
                            <select {...register('sumber')} className="w-full border rounded p-2 text-sm">
                                <option value="Beli Sendiri">Beli Sendiri (Kas Pondok)</option>
                                <option value="Wakaf">Wakaf</option>
                                <option value="Hibah/Hadiah">Hibah / Hadiah</option>
                                <option value="Bantuan Pemerintah">Bantuan Pemerintah</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Nilai Aset (Rp)</label>
                            <input type="number" {...register('hargaPerolehan', { valueAsNumber: true })} className="w-full border rounded p-2 text-sm" placeholder="Harga beli / Taksiran nilai" />
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Keterangan Tambahan</label>
                        <textarea {...register('keterangan')} rows={2} className="w-full border rounded p-2 text-sm"></textarea>
                    </div>

                    <div className="flex justify-end pt-4 border-t gap-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg text-gray-600 hover:bg-gray-100">Batal</button>
                        <button type="submit" className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-bold">Simpan</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---

const Sarpras: React.FC = () => {
    const { showToast, showConfirmation, currentUser, settings } = useAppContext();
    const assets = useLiveQuery(() => db.inventaris.filter(i => !i.deleted).toArray(), []) || [];
    const [activeTab, setActiveTab] = useState<'dashboard' | 'bergerak' | 'tetap'>('dashboard');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterKondisi, setFilterKondisi] = useState('');
    const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAsset, setEditingAsset] = useState<Inventaris | null>(null);

    const canWrite = currentUser?.role === 'admin' || currentUser?.permissions?.sarpras === 'write';

    // Filters
    const filteredAssets = useMemo(() => {
        let result = assets;
        if (activeTab === 'bergerak') result = result.filter(a => a.jenis === 'Bergerak');
        if (activeTab === 'tetap') result = result.filter(a => a.jenis === 'Tidak Bergerak');
        
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            result = result.filter(a => a.nama.toLowerCase().includes(lower) || a.kode.toLowerCase().includes(lower) || a.lokasi.toLowerCase().includes(lower));
        }
        if (filterKondisi) {
            result = result.filter(a => a.kondisi === filterKondisi);
        }
        return result;
    }, [assets, activeTab, searchTerm, filterKondisi]);

    const handleSave = async (data: Omit<Inventaris, 'id'>) => {
        if (!canWrite) return;
        const newAsset = { ...data, lastModified: Date.now() };
        await db.inventaris.add(newAsset as Inventaris);
        setIsModalOpen(false);
        showToast('Aset berhasil ditambahkan', 'success');
    };

    const handleUpdate = async (data: Inventaris) => {
        if (!canWrite) return;
        await db.inventaris.put({ ...data, lastModified: Date.now() });
        setIsModalOpen(false);
        showToast('Aset diperbarui', 'success');
    };

    const handleDelete = (id: number) => {
        if (!canWrite) return;
        showConfirmation('Hapus Aset?', 'Data ini akan dihapus permanen.', async () => {
            // Soft delete
            const item = await db.inventaris.get(id);
            if (item) {
                await db.inventaris.put({ ...item, deleted: true, lastModified: Date.now() });
                showToast('Aset dihapus', 'success');
            }
        }, { confirmColor: 'red' });
    };

    const buildSarprasFileName = () => {
        const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const scope = activeTab === 'dashboard' ? 'semua' : activeTab === 'bergerak' ? 'bergerak' : 'tetap';
        return `Laporan_Sarpras_${scope}_${datePart}`;
    };

    const handleExportAction = async (type: 'pdfVisual' | 'print' | 'word' | 'excel' | 'html') => {
        const fileName = buildSarprasFileName();
        setIsExportMenuOpen(false);
        try {
            if (type === 'pdfVisual') {
                await generatePdf('sarpras-print-area', { paperSize: 'A4', fileName: `${fileName}.pdf` });
                return;
            }
            if (type === 'print') {
                await printPreviewExact('sarpras-print-area', fileName);
                return;
            }
            if (type === 'word') {
                exportToWord('sarpras-print-area', fileName);
                return;
            }
            if (type === 'html') {
                exportToHtml('sarpras-print-area', fileName);
                return;
            }
            if (type === 'excel') {
                const XLSX = await loadXLSX();
                const rows = (activeTab === 'dashboard' ? assets : filteredAssets).map((item, idx) => ({
                    No: idx + 1,
                    Kode: item.kode,
                    Nama: item.nama,
                    Jenis: item.jenis,
                    Kategori: item.kategori || '-',
                    Lokasi: item.lokasi || '-',
                    Kondisi: item.kondisi,
                    Jumlah: item.jenis === 'Bergerak' ? item.jumlah : '',
                    Satuan: item.jenis === 'Bergerak' ? (item.satuan || '-') : '',
                    Luas_m2: item.jenis === 'Tidak Bergerak' ? (item.luas || '') : '',
                    Legalitas: item.jenis === 'Tidak Bergerak' ? (item.legalitas || '-') : '',
                    Sumber: item.sumber || '-',
                    Tanggal_Perolehan: item.tanggalPerolehan || '-',
                    Nilai_Aset: Number(item.hargaPerolehan) || 0,
                }));
                const ws = XLSX.utils.json_to_sheet(rows);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, 'Sarpras');
                XLSX.writeFile(wb, `${fileName}.xlsx`);
                return;
            }
        } catch (error) {
            console.error(error);
            showToast('Gagal mengekspor laporan sarpras.', 'error');
        }
    };

    return (
        <div className="flex h-full min-h-0 flex-col space-y-6 pb-20">
            <PageHeader
                eyebrow="Keuangan & Aset"
                title="Manajemen Aset & Inventaris"
                description="Pantau dashboard aset, inventaris bergerak, serta tanah dan bangunan dari panel sarpras yang lebih konsisten."
                tabs={
                    <HeaderTabs
                        value={activeTab}
                        onChange={(v) => setActiveTab(v as 'dashboard' | 'bergerak' | 'tetap')}
                        tabs={[
                            { value: 'dashboard', label: 'Dashboard', icon: 'bi-speedometer2' },
                            { value: 'bergerak', label: 'Aset Bergerak', icon: 'bi-box-seam' },
                            { value: 'tetap', label: 'Tanah & Bangunan', icon: 'bi-building' },
                        ]}
                    />
                }
            />

            {activeTab === 'dashboard' && <SarprasDashboard assets={assets} />}

            {(activeTab === 'bergerak' || activeTab === 'tetap') && (
                <SectionCard className="animate-fade-in" contentClassName="p-4 md:p-6">
                    <div className="mb-6 grid grid-cols-1 gap-2 lg:grid-cols-[2fr_1fr_auto_auto] lg:items-center">
                        <div className="w-full min-w-0">
                            <input type="text" placeholder="Cari nama, kode, lokasi..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="border rounded-lg p-2 text-sm w-full" />
                        </div>
                        <select value={filterKondisi} onChange={e => setFilterKondisi(e.target.value)} className="border rounded-lg p-2 text-sm">
                            <option value="">Semua Kondisi</option>
                            <option value="Baik">Baik</option>
                            <option value="Rusak Ringan">Rusak Ringan</option>
                            <option value="Rusak Berat">Rusak Berat</option>
                        </select>
                        <div className="relative">
                            <button
                                onClick={() => setIsExportMenuOpen(prev => !prev)}
                                className="bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-800 flex items-center justify-center gap-2 w-full lg:w-auto"
                            >
                                <i className="bi bi-printer-fill"></i> Aksi Laporan
                            </button>
                            {isExportMenuOpen && (
                                <div className="absolute right-0 z-20 mt-2 w-44 rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden">
                                    <button onClick={() => handleExportAction('pdfVisual')} className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50">PDF Visual</button>
                                    <button onClick={() => handleExportAction('print')} className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50">Cetak</button>
                                    <button onClick={() => handleExportAction('word')} className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50">Word</button>
                                    <button onClick={() => handleExportAction('excel')} className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50">Excel</button>
                                    <button onClick={() => handleExportAction('html')} className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50">HTML</button>
                                </div>
                            )}
                        </div>
                        {canWrite && (
                            <button onClick={() => { setEditingAsset(null); setIsModalOpen(true); }} className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-teal-700 flex items-center justify-center gap-2">
                                <i className="bi bi-plus-lg"></i> Tambah Aset
                            </button>
                        )}
                        <div className="lg:hidden">
                            <button
                                onClick={() => {
                                    setSearchTerm('');
                                    setFilterKondisi('');
                                }}
                                className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-50"
                            >
                                Reset Filter
                            </button>
                        </div>
                    </div>

                    <div className="hidden md:block app-table-shell overflow-x-auto">
                        <table className="app-table text-sm text-left">
                            <thead className="uppercase border-b border-app-border">
                                <tr>
                                    <th className="px-4 py-3">Kode</th>
                                    <th className="px-4 py-3">Nama Barang</th>
                                    <th className="px-4 py-3">Kategori</th>
                                    <th className="px-4 py-3">Lokasi</th>
                                    {activeTab === 'bergerak' ? <th className="px-4 py-3 text-center">Jml</th> : <th className="px-4 py-3">Legalitas/Luas</th>}
                                    <th className="px-4 py-3">Kondisi</th>
                                    <th className="px-4 py-3 text-right">Nilai Aset</th>
                                    <th className="px-4 py-3 text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {filteredAssets.map(item => (
                                    <tr key={item.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 font-mono text-xs text-gray-500">{item.kode}</td>
                                        <td className="px-4 py-3 font-medium text-gray-900">
                                            {item.nama}
                                            <div className="text-[10px] text-gray-400">{item.sumber} • {item.tanggalPerolehan}</div>
                                        </td>
                                        <td className="px-4 py-3">{item.kategori}</td>
                                        <td className="px-4 py-3 text-gray-600">{item.lokasi}</td>
                                        {activeTab === 'bergerak' ? (
                                            <td className="px-4 py-3 text-center font-bold">{item.jumlah} {item.satuan}</td>
                                        ) : (
                                            <td className="px-4 py-3 text-xs">
                                                <div className="font-bold">{item.luas} m²</div>
                                                <div className="text-gray-500 truncate max-w-[150px]" title={item.legalitas}>{item.legalitas || '-'}</div>
                                            </td>
                                        )}
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${
                                                item.kondisi === 'Baik' ? 'bg-green-100 text-green-700' :
                                                item.kondisi === 'Rusak Ringan' ? 'bg-yellow-100 text-yellow-700' :
                                                'bg-red-100 text-red-700'
                                            }`}>
                                                {item.kondisi}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">{formatRupiah(item.hargaPerolehan)}</td>
                                        <td className="px-4 py-3 text-center flex justify-center gap-2">
                                            {canWrite && (
                                                <>
                                                    <button onClick={() => { setEditingAsset(item); setIsModalOpen(true); }} className="text-blue-600 hover:text-blue-800"><i className="bi bi-pencil-square"></i></button>
                                                    <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-800"><i className="bi bi-trash"></i></button>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {filteredAssets.length === 0 && <tr><td colSpan={8} className="p-4"><EmptyState icon="bi-box-seam" title="Data aset kosong" description="Belum ada data aset yang cocok dengan filter sarpras saat ini." /></td></tr>}
                            </tbody>
                        </table>
                    </div>

                    <div className="md:hidden space-y-3">
                        {filteredAssets.map(item => (
                            <article key={item.id} className="rounded-lg border border-gray-200 bg-white p-3">
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <div className="font-semibold text-sm text-gray-900">{item.nama}</div>
                                        <div className="font-mono text-[10px] text-gray-500">{item.kode}</div>
                                    </div>
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                        item.kondisi === 'Baik' ? 'bg-green-100 text-green-700' :
                                        item.kondisi === 'Rusak Ringan' ? 'bg-yellow-100 text-yellow-700' :
                                        'bg-red-100 text-red-700'
                                    }`}>
                                        {item.kondisi}
                                    </span>
                                </div>
                                <div className="mt-2 text-xs text-gray-600">
                                    <div>{item.kategori} • {item.lokasi || '-'}</div>
                                    <div>{item.sumber} • {item.tanggalPerolehan}</div>
                                    {activeTab === 'bergerak' ? (
                                        <div className="font-semibold mt-1">Jumlah: {item.jumlah} {item.satuan}</div>
                                    ) : (
                                        <div className="font-semibold mt-1">Luas: {item.luas || 0} m² • {item.legalitas || '-'}</div>
                                    )}
                                </div>
                                <div className="mt-2 flex items-center justify-between">
                                    <div className="text-sm font-bold text-gray-800">{formatRupiah(item.hargaPerolehan)}</div>
                                    {canWrite && (
                                        <div className="flex gap-2">
                                            <button onClick={() => { setEditingAsset(item); setIsModalOpen(true); }} className="text-blue-600 hover:text-blue-800 p-1"><i className="bi bi-pencil-square"></i></button>
                                            <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-800 p-1"><i className="bi bi-trash"></i></button>
                                        </div>
                                    )}
                                </div>
                            </article>
                        ))}
                        {filteredAssets.length === 0 && (
                            <div className="p-4">
                                <EmptyState icon="bi-box-seam" title="Data aset kosong" description="Belum ada data aset yang cocok dengan filter sarpras saat ini." />
                            </div>
                        )}
                    </div>
                </SectionCard>
            )}

            <InventarisModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
                onUpdate={handleUpdate}
                initialData={editingAsset}
            />

            {/* Hidden Print Area */}
            <div className="hidden print:block">
                <div id="sarpras-print-area">
                    <SarprasReportTemplate 
                        settings={settings} 
                        assets={activeTab === 'dashboard' ? assets : filteredAssets} 
                        filterTitle={activeTab === 'dashboard' ? 'Semua Aset' : activeTab === 'bergerak' ? 'Aset Bergerak' : 'Aset Tetap'}
                    />
                </div>
            </div>
        </div>
    );
};

export default Sarpras;
