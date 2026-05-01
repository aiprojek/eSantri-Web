
import React, { useState, useMemo } from 'react';
import { Buku } from '../../types';
import { BulkBukuEditor } from './modals/BulkBukuEditor';

interface KatalogBukuProps {
    bukuList: Buku[];
    onAdd: (buku: Omit<Buku, 'id'>) => void;
    onUpdate: (buku: Buku) => void;
    onDelete: (id: number) => void;
    onBulkAdd: (data: Omit<Buku, 'id'>[]) => Promise<void>;
    canWrite: boolean;
}

export const KatalogBuku: React.FC<KatalogBukuProps> = ({ bukuList, onAdd, onUpdate, onDelete, onBulkAdd, canWrite }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterKategori, setFilterKategori] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isBulkOpen, setIsBulkOpen] = useState(false);
    const [editingBuku, setEditingBuku] = useState<Partial<Buku>>({});

    const filteredBuku = useMemo(() => {
        return bukuList.filter(b => {
            const matchSearch = b.judul.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                b.kodeBuku.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                b.penulis?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchKategori = !filterKategori || b.kategori === filterKategori;
            return matchSearch && matchKategori;
        });
    }, [bukuList, searchTerm, filterKategori]);

    const handleSave = () => {
        if (!editingBuku.judul || !editingBuku.kodeBuku) {
            alert("Judul dan Kode Buku wajib diisi");
            return;
        }
        
        const bukuData = {
            ...editingBuku,
            stok: Number(editingBuku.stok) || 0,
            tahunTerbit: Number(editingBuku.tahunTerbit) || undefined
        } as Buku;

        if (editingBuku.id) {
            onUpdate(bukuData);
        } else {
            onAdd(bukuData);
        }
        setIsModalOpen(false);
    };

    const openModal = (buku?: Buku) => {
        if (buku) {
            setEditingBuku(buku);
        } else {
            setEditingBuku({
                kodeBuku: `BK-${Date.now().toString().slice(-6)}`,
                judul: '',
                kategori: 'Kitab Kuning',
                stok: 1,
                lokasiRak: ''
            });
        }
        setIsModalOpen(true);
    };

    return (
        <div className="app-panel rounded-panel p-4 sm:p-6 animate-fade-in">
            <div className="mb-6 flex flex-col gap-4">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <input 
                        type="text" 
                        placeholder="Cari judul, kode, penulis..." 
                        value={searchTerm} 
                        onChange={e => setSearchTerm(e.target.value)} 
                        className="w-full rounded-lg border border-gray-300 p-2.5 text-sm" 
                    />
                    <select value={filterKategori} onChange={e => setFilterKategori(e.target.value)} className="w-full rounded-lg border border-gray-300 p-2.5 text-sm">
                        <option value="">Semua Kategori</option>
                        <option value="Kitab Kuning">Kitab Kuning</option>
                        <option value="Buku Pelajaran">Buku Pelajaran</option>
                        <option value="Umum">Umum</option>
                        <option value="Referensi">Referensi</option>
                    </select>
                    <div className="hidden md:flex items-center justify-end text-xs text-gray-500">
                        {filteredBuku.length} buku
                    </div>
                </div>
                {canWrite && (
                    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                         <button onClick={() => setIsBulkOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-lg border border-teal-200 bg-teal-50 px-4 py-2.5 text-sm font-bold text-teal-700 hover:bg-teal-100">
                            <i className="bi bi-table"></i> Tambah Massal
                        </button>
                        <button onClick={() => openModal()} className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-teal-700">
                            <i className="bi bi-plus-lg"></i> Tambah Buku
                        </button>
                    </div>
                )}
            </div>

            <div className="hidden overflow-x-auto rounded-lg border md:block">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-600 uppercase border-b">
                        <tr>
                            <th className="px-4 py-3">Kode</th>
                            <th className="px-4 py-3">Judul Buku</th>
                            <th className="px-4 py-3">Kategori</th>
                            <th className="px-4 py-3">Penulis / Penerbit</th>
                            <th className="px-4 py-3 text-center">Stok</th>
                            <th className="px-4 py-3 text-center">Rak</th>
                            <th className="px-4 py-3 text-center">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {filteredBuku.map(buku => (
                            <tr key={buku.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 font-mono text-xs">{buku.kodeBuku}</td>
                                <td className="px-4 py-3 font-medium text-gray-900">{buku.judul}</td>
                                <td className="px-4 py-3">
                                    <span className={`px-2 py-1 rounded text-xs ${buku.kategori === 'Kitab Kuning' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-50 text-blue-700'}`}>
                                        {buku.kategori}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-gray-600 text-xs">
                                    <div>{buku.penulis || '-'}</div>
                                    <div className="text-gray-400">{buku.penerbit}</div>
                                </td>
                                <td className="px-4 py-3 text-center font-bold">{buku.stok}</td>
                                <td className="px-4 py-3 text-center text-xs bg-gray-50">{buku.lokasiRak || '-'}</td>
                                <td className="px-4 py-3 text-center">
                                    {canWrite && (
                                        <div className="flex justify-center gap-2">
                                            <button onClick={() => openModal(buku)} className="text-blue-600 hover:text-blue-800"><i className="bi bi-pencil-square"></i></button>
                                            <button onClick={() => { if(confirm('Hapus buku ini?')) onDelete(buku.id); }} className="text-red-600 hover:text-red-800"><i className="bi bi-trash"></i></button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {filteredBuku.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-gray-500">Tidak ada buku ditemukan.</td></tr>}
                    </tbody>
                </table>
            </div>
            <div className="space-y-3 md:hidden">
                {filteredBuku.map((buku) => (
                    <div key={buku.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <div className="truncate text-sm font-bold text-gray-900">{buku.judul}</div>
                                <div className="mt-1 text-[11px] font-mono text-gray-500">{buku.kodeBuku}</div>
                            </div>
                            <span className={`shrink-0 rounded px-2 py-1 text-[10px] ${buku.kategori === 'Kitab Kuning' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-50 text-blue-700'}`}>
                                {buku.kategori}
                            </span>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-600">
                            <div>Penulis: {buku.penulis || '-'}</div>
                            <div>Penerbit: {buku.penerbit || '-'}</div>
                            <div>Stok: <span className="font-bold text-gray-800">{buku.stok}</span></div>
                            <div>Rak: {buku.lokasiRak || '-'}</div>
                        </div>
                        {canWrite && (
                            <div className="mt-3 flex gap-2">
                                <button onClick={() => openModal(buku)} className="flex-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700">Edit</button>
                                <button onClick={() => { if(confirm('Hapus buku ini?')) onDelete(buku.id); }} className="flex-1 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">Hapus</button>
                            </div>
                        )}
                    </div>
                ))}
                {filteredBuku.length === 0 && <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">Tidak ada buku ditemukan.</div>}
            </div>

            {/* SINGLE MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex justify-center items-center p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
                        <div className="p-4 border-b font-bold text-gray-800">{editingBuku.id ? 'Edit Buku' : 'Tambah Buku Baru'}</div>
                        <div className="p-4 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Kode Buku</label>
                                    <input type="text" value={editingBuku.kodeBuku} onChange={e => setEditingBuku({...editingBuku, kodeBuku: e.target.value})} className="w-full border rounded p-2 text-sm uppercase" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Kategori</label>
                                    <select value={editingBuku.kategori} onChange={e => setEditingBuku({...editingBuku, kategori: e.target.value as any})} className="w-full border rounded p-2 text-sm">
                                        <option value="Kitab Kuning">Kitab Kuning</option>
                                        <option value="Buku Pelajaran">Buku Pelajaran</option>
                                        <option value="Umum">Umum</option>
                                        <option value="Referensi">Referensi</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">Judul Buku</label>
                                <input type="text" value={editingBuku.judul} onChange={e => setEditingBuku({...editingBuku, judul: e.target.value})} className="w-full border rounded p-2 text-sm" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-xs font-bold text-gray-600 mb-1">Penulis</label><input type="text" value={editingBuku.penulis} onChange={e => setEditingBuku({...editingBuku, penulis: e.target.value})} className="w-full border rounded p-2 text-sm" /></div>
                                <div><label className="block text-xs font-bold text-gray-600 mb-1">Penerbit</label><input type="text" value={editingBuku.penerbit} onChange={e => setEditingBuku({...editingBuku, penerbit: e.target.value})} className="w-full border rounded p-2 text-sm" /></div>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div><label className="block text-xs font-bold text-gray-600 mb-1">Tahun Terbit</label><input type="number" value={editingBuku.tahunTerbit} onChange={e => setEditingBuku({...editingBuku, tahunTerbit: parseInt(e.target.value)})} className="w-full border rounded p-2 text-sm" /></div>
                                <div><label className="block text-xs font-bold text-gray-600 mb-1">Stok</label><input type="number" value={editingBuku.stok} onChange={e => setEditingBuku({...editingBuku, stok: parseInt(e.target.value)})} className="w-full border rounded p-2 text-sm" /></div>
                                <div><label className="block text-xs font-bold text-gray-600 mb-1">Lokasi Rak</label><input type="text" value={editingBuku.lokasiRak} onChange={e => setEditingBuku({...editingBuku, lokasiRak: e.target.value})} className="w-full border rounded p-2 text-sm" /></div>
                            </div>
                        </div>
                        <div className="p-4 border-t flex justify-end gap-2">
                            <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded text-gray-600 text-sm">Batal</button>
                            <button onClick={handleSave} className="px-4 py-2 bg-teal-600 text-white rounded text-sm font-bold">Simpan</button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* BULK MODAL */}
            <BulkBukuEditor isOpen={isBulkOpen} onClose={() => setIsBulkOpen(false)} onSave={onBulkAdd} />
        </div>
    );
};
