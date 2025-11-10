import React, { useState } from 'react';
import { Santri } from '../../../types';

interface BulkStatusModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (newStatus: Santri['status'], newStatusDate?: string) => void;
    selectedCount: number;
}

export const BulkStatusModal: React.FC<BulkStatusModalProps> = ({ isOpen, onClose, onSave, selectedCount }) => {
    const [newStatus, setNewStatus] = useState<Santri['status']>('Aktif');
    const [newStatusDate, setNewStatusDate] = useState(new Date().toISOString().split('T')[0]);

    if (!isOpen) return null;

    const handleSaveClick = () => {
        onSave(newStatus, newStatus !== 'Aktif' ? newStatusDate : undefined);
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex justify-center items-center p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
          <div className="p-5 border-b"><h3 className="text-lg font-semibold text-gray-800">Ubah Status Massal</h3></div>
          <div className="p-5 space-y-4">
            <p className="text-sm text-gray-600">Pilih status baru yang akan diterapkan pada <strong className="font-semibold">{selectedCount}</strong> santri yang dipilih.</p>
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">Status Baru</label>
              <select value={newStatus} onChange={e => setNewStatus(e.target.value as Santri['status'])} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5">
                <option value="Aktif">Aktif</option>
                <option value="Hiatus">Hiatus</option>
                <option value="Lulus">Lulus</option>
                <option value="Keluar/Pindah">Keluar/Pindah</option>
              </select>
            </div>
            {newStatus !== 'Aktif' && (
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">Tanggal Status</label>
                <input type="date" value={newStatusDate} onChange={e => setNewStatusDate(e.target.value)} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5" />
              </div>
            )}
          </div>
          <div className="p-4 border-t flex justify-end space-x-2">
            <button onClick={onClose} type="button" className="text-gray-500 bg-white hover:bg-gray-100 rounded-lg border border-gray-200 text-sm font-medium px-5 py-2.5">Batal</button>
            <button onClick={handleSaveClick} type="button" className="text-white bg-teal-700 hover:bg-teal-800 font-medium rounded-lg text-sm px-5 py-2.5">Terapkan</button>
          </div>
        </div>
      </div>
    );
};
