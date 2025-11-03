import React, { useState, useEffect } from 'react';
import { Biaya } from '../../../types';
import { useAppContext } from '../../../AppContext';

interface BiayaModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (biaya: Biaya) => void;
    biayaData: Biaya | null;
}

export const BiayaModal: React.FC<BiayaModalProps> = ({ isOpen, onClose, onSave, biayaData }) => {
    const { settings, showAlert } = useAppContext();
    const [biaya, setBiaya] = useState<Partial<Biaya>>(biayaData || {
        nama: '', jenis: 'Bulanan', nominal: 0, jenjangId: undefined, tahunMasuk: undefined
    });

    useEffect(() => {
        setBiaya(biayaData || { nama: '', jenis: 'Bulanan', nominal: 0, jenjangId: undefined, tahunMasuk: undefined });
    }, [biayaData]);

    if (!isOpen) return null;

    const handleSave = () => {
        if (!biaya.nama?.trim() || (biaya.nominal || 0) <= 0) {
            showAlert('Input Tidak Lengkap', 'Nama dan nominal biaya wajib diisi.');
            return;
        }
        if (biaya.jenis === 'Cicilan' && ((biaya.jumlahCicilan || 0) <= 0 || (biaya.nominalCicilan || 0) <= 0)) {
            showAlert('Input Tidak Lengkap', 'Jumlah dan nominal cicilan wajib diisi untuk biaya jenis cicilan.');
            return;
        }
        const id = biayaData?.id || Date.now();
        onSave({ ...biaya, id } as Biaya);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <div className="p-5 border-b"><h3 className="text-lg font-semibold text-gray-800">{biayaData ? 'Edit' : 'Tambah'} Komponen Biaya</h3></div>
                <div className="p-5 space-y-4">
                    <div><label className="block mb-1 text-sm">Nama Biaya</label><input type="text" value={biaya.nama} onChange={e => setBiaya(b => ({...b, nama: e.target.value}))} className="w-full bg-gray-50 border p-2.5 rounded-lg"/></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block mb-1 text-sm">Jenis</label><select value={biaya.jenis} onChange={e => setBiaya(b => ({...b, jenis: e.target.value as any}))} className="w-full bg-gray-50 border p-2.5 rounded-lg"><option value="Bulanan">Bulanan</option><option value="Sekali Bayar">Sekali Bayar</option><option value="Cicilan">Cicilan</option></select></div>
                        <div><label className="block mb-1 text-sm">Nominal (Total)</label><input type="number" value={biaya.nominal} onChange={e => setBiaya(b => ({...b, nominal: parseInt(e.target.value) || 0}))} className="w-full bg-gray-50 border p-2.5 rounded-lg"/></div>
                    </div>
                    {biaya.jenis === 'Cicilan' && (
                         <div className="grid grid-cols-2 gap-4 p-3 bg-gray-100 rounded-md">
                            <div><label className="block mb-1 text-sm">Jumlah Cicilan</label><input type="number" value={biaya.jumlahCicilan || ''} onChange={e => setBiaya(b => ({...b, jumlahCicilan: parseInt(e.target.value) || undefined}))} className="w-full bg-white border p-2.5 rounded-lg"/></div>
                            <div><label className="block mb-1 text-sm">Nominal per Cicilan</label><input type="number" value={biaya.nominalCicilan || ''} onChange={e => setBiaya(b => ({...b, nominalCicilan: parseInt(e.target.value) || undefined}))} className="w-full bg-white border p-2.5 rounded-lg"/></div>
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block mb-1 text-sm">Berlaku untuk Jenjang</label><select value={biaya.jenjangId || ''} onChange={e => setBiaya(b => ({...b, jenjangId: e.target.value ? parseInt(e.target.value) : undefined}))} className="w-full bg-gray-50 border p-2.5 rounded-lg"><option value="">Semua Jenjang</option>{settings.jenjang.map(j => <option key={j.id} value={j.id}>{j.nama}</option>)}</select></div>
                        <div><label className="block mb-1 text-sm">Tahun Masuk (Opsional)</label><input type="number" value={biaya.tahunMasuk || ''} onChange={e => setBiaya(b => ({...b, tahunMasuk: e.target.value ? parseInt(e.target.value) : undefined}))} className="w-full bg-gray-50 border p-2.5 rounded-lg" placeholder="cth: 2025"/></div>
                    </div>
                </div>
                <div className="p-4 border-t flex justify-end space-x-2"><button onClick={onClose} className="px-5 py-2.5 text-sm rounded-lg border">Batal</button><button onClick={handleSave} className="px-5 py-2.5 text-sm rounded-lg bg-teal-700 text-white">Simpan</button></div>
            </div>
        </div>
    );
};
