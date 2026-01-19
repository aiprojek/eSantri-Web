
import React, { useState, useMemo, useEffect } from 'react';
import { useLiveQuery } from "dexie-react-hooks";
import { useForm } from 'react-hook-form';
import { db } from '../db';
import { useAppContext } from '../AppContext';
import { Inventaris } from '../types';
import { formatRupiah, formatDateTime } from '../utils/formatters';
import { printToPdfNative } from '../utils/pdfGenerator';
import { SarprasReportTemplate } from './sarpras/SarprasReportTemplate';

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

    const handlePrint = () => {
        showToast('Menyiapkan dokumen cetak...', 'info');
        printToPdfNative('sarpras-print-area', `Laporan_Sarpras_${new Date().toISOString().slice(0, 10)}`);
    };

    return (
        <div className="min-h-screen flex flex-col pb-20">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Manajemen Aset & Inventaris (Sarpras)</h1>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6 sticky top-0 z-40">
                <nav className="flex -mb-px">
                    <button onClick={() => setActiveTab('dashboard')} className={`flex-1 py-4 text-center border-b-2 font-medium text-sm ${activeTab === 'dashboard' ? 'border-teal-500 text-teal-600 bg-teal-50' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Dashboard</button>
                    <button onClick={() => setActiveTab('bergerak')} className={`flex-1 py-4 text-center border-b-2 font-medium text-sm ${activeTab === 'bergerak' ? 'border-blue-500 text-blue-600 bg-blue-50' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Aset Bergerak</button>
                    <button onClick={() => setActiveTab('tetap')} className={`flex-1 py-4 text-center border-b-2 font-medium text-sm ${activeTab === 'tetap' ? 'border-purple-500 text-purple-600 bg-purple-50' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Tanah & Bangunan</button>
                </nav>
            </div>

            {activeTab === 'dashboard' && <SarprasDashboard assets={assets} />}

            {(activeTab === 'bergerak' || activeTab === 'tetap') && (
                <div className="bg-white p-6 rounded-lg shadow-md animate-fade-in">
                    <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                        <div className="flex gap-4 w-full md:w-auto">
                            <input type="text" placeholder="Cari nama, kode, lokasi..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="border rounded-lg p-2 text-sm flex-grow md:w-64" />
                            <select value={filterKondisi} onChange={e => setFilterKondisi(e.target.value)} className="border rounded-lg p-2 text-sm">
                                <option value="">Semua Kondisi</option>
                                <option value="Baik">Baik</option>
                                <option value="Rusak Ringan">Rusak Ringan</option>
                                <option value="Rusak Berat">Rusak Berat</option>
                            </select>
                        </div>
                        <div className="flex gap-2">
                             <button onClick={handlePrint} className="bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-800 flex items-center gap-2">
                                <i className="bi bi-printer-fill"></i> Cetak Laporan
                            </button>
                            {canWrite && (
                                <button onClick={() => { setEditingAsset(null); setIsModalOpen(true); }} className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-teal-700 flex items-center gap-2">
                                    <i className="bi bi-plus-lg"></i> Tambah Aset
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="overflow-x-auto border rounded-lg">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-600 uppercase border-b">
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
                                {filteredAssets.length === 0 && <tr><td colSpan={8} className="p-8 text-center text-gray-400 italic">Tidak ada data aset.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
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
