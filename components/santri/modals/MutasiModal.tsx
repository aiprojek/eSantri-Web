import React, { useState } from 'react';
import { RiwayatStatus } from '../../../types';
import { useAppContext } from '../../../AppContext';

interface MutasiModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (keterangan: string, tanggal: string) => void;
    newStatus: RiwayatStatus['status'];
}

export const MutasiModal: React.FC<MutasiModalProps> = ({ isOpen, onClose, onSave, newStatus }) => {
    const { showAlert } = useAppContext();
    if (!isOpen) return null;

    const [keterangan, setKeterangan] = useState('');
    const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);
    
    const handleSave = () => {
        if (!keterangan.trim()) {
            showAlert('Input Tidak Lengkap', 'Keterangan mutasi wajib diisi untuk mencatat riwayat.');
            return;
        }
        onSave(keterangan, tanggal);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[70] flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                <div className="p-5 border-b">
                    <h3 className="text-lg font-semibold text-gray-800">Catat Riwayat Perubahan Status</h3>
                </div>
                <div className="p-5 space-y-4">
                    <p className="text-sm text-gray-600">Status santri diubah menjadi <strong className="font-semibold text-teal-700">{newStatus}</strong>. Harap isi keterangan untuk melengkapi catatan riwayat.</p>
                    <div>
                        <label className="block mb-1 text-sm font-medium text-gray-700">Tanggal Perubahan Status</label>
                        <input type="date" value={tanggal} onChange={e => setTanggal(e.target.value)} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 block w-full p-2.5" />
                    </div>
                    <div>
                        <label className="block mb-1 text-sm font-medium text-gray-700">Keterangan (Wajib)</label>
                        <textarea rows={3} value={keterangan} onChange={e => setKeterangan(e.target.value)} placeholder={`Contoh: Lulus dan melanjutkan studi ke...`} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 block w-full p-2.5" />
                    </div>
                </div>
                <div className="p-4 border-t flex justify-end space-x-2">
                    <button onClick={onClose} type="button" className="text-gray-500 bg-white hover:bg-gray-100 focus:ring-4 focus:outline-none focus:ring-blue-300 rounded-lg border border-gray-200 text-sm font-medium px-5 py-2.5 hover:text-gray-900 focus:z-10">Batal</button>
                    <button onClick={handleSave} type="button" className="text-white bg-teal-700 hover:bg-teal-800 focus:ring-4 focus:outline-none focus:ring-teal-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center">Simpan Catatan</button>
                </div>
            </div>
        </div>
    );
};
