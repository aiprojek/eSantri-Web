import React, { useState } from 'react';
import { useAppContext } from '../../AppContext';
import { Biaya } from '../../types';
import { BiayaModal } from './modals/BiayaModal';
import { formatRupiah } from '../../utils/formatters';

export const PengaturanBiaya: React.FC = () => {
    const { settings, onSaveSettings, showConfirmation } = useAppContext();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingBiaya, setEditingBiaya] = useState<Biaya | null>(null);

    const handleSaveBiaya = async (biaya: Biaya) => {
        let updatedList;
        if (settings.biaya.some(b => b.id === biaya.id)) {
            updatedList = settings.biaya.map(b => b.id === biaya.id ? biaya : b);
        } else {
            updatedList = [...settings.biaya, biaya];
        }
        await onSaveSettings({ ...settings, biaya: updatedList });
        setIsModalOpen(false);
    };

    const handleDeleteBiaya = (id: number) => {
        showConfirmation('Hapus Biaya?', 'Anda yakin ingin menghapus komponen biaya ini?', async () => {
            const updatedList = settings.biaya.filter(b => b.id !== id);
            await onSaveSettings({ ...settings, biaya: updatedList });
        }, { confirmColor: 'red' });
    };
    
    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-700">Manajemen Komponen Biaya</h2>
                <button onClick={() => { setEditingBiaya(null); setIsModalOpen(true); }} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium text-sm flex items-center gap-2"><i className="bi bi-plus-circle"></i> Tambah Biaya</button>
            </div>
            
            <div className="space-y-3 md:hidden">
                {settings.biaya.map(b => (
                    <div key={b.id} className="rounded-2xl border border-slate-200 bg-white p-3">
                        <p className="text-sm font-semibold text-slate-800">{b.nama}</p>
                        <p className="text-xs text-slate-500">{b.jenis}</p>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                            <div className="rounded-lg bg-slate-50 p-2">
                                <p className="text-slate-500">Nominal</p>
                                <p className="font-semibold text-slate-800">{formatRupiah(b.nominal)}</p>
                            </div>
                            <div className="rounded-lg bg-slate-50 p-2">
                                <p className="text-slate-500">Berlaku Untuk</p>
                                <p className="font-semibold text-slate-700">{b.jenjangId ? settings.jenjang.find(j => j.id === b.jenjangId)?.nama : 'Semua Jenjang'}</p>
                            </div>
                        </div>
                        <div className="mt-3 flex gap-2">
                            <button onClick={() => { setEditingBiaya(b); setIsModalOpen(true); }} className="rounded-md bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">Edit</button>
                            <button onClick={() => handleDeleteBiaya(b.id)} className="rounded-md bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700">Hapus</button>
                        </div>
                    </div>
                ))}
            </div>

            <div className="hidden overflow-x-auto rounded-lg border md:block">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">
                        <tr>
                            <th className="px-4 py-2">Nama Biaya</th>
                            <th className="px-4 py-2">Jenis</th>
                            <th className="px-4 py-2 text-right">Nominal</th>
                            <th className="px-4 py-2">Berlaku Untuk</th>
                            <th className="px-4 py-2 text-center">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {settings.biaya.map(b => (
                            <tr key={b.id}>
                                <td className="px-4 py-3 font-semibold">{b.nama}</td>
                                <td className="px-4 py-3">{b.jenis}</td>
                                <td className="px-4 py-3 text-right font-medium">{formatRupiah(b.nominal)}</td>
                                <td className="px-4 py-3">{b.jenjangId ? settings.jenjang.find(j => j.id === b.jenjangId)?.nama : 'Semua Jenjang'}</td>
                                <td className="px-4 py-3 text-center space-x-2">
                                    <button onClick={() => { setEditingBiaya(b); setIsModalOpen(true); }} className="text-blue-600"><i className="bi bi-pencil-square"></i></button>
                                    <button onClick={() => handleDeleteBiaya(b.id)} className="text-red-600"><i className="bi bi-trash-fill"></i></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {isModalOpen && <BiayaModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveBiaya} biayaData={editingBiaya} />}
        </div>
    );
};
