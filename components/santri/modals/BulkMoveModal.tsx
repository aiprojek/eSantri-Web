import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../../AppContext';

interface BulkMoveModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (jenjangId: number, kelasId: number, rombelId: number) => void;
    selectedCount: number;
}

export const BulkMoveModal: React.FC<BulkMoveModalProps> = ({ isOpen, onClose, onSave, selectedCount }) => {
    const { settings, showAlert } = useAppContext();
    const [newJenjangId, setNewJenjangId] = useState<number>(0);
    const [newKelasId, setNewKelasId] = useState<number>(0);
    const [newRombelId, setNewRombelId] = useState<number>(0);
    
    const availableKelasForMove = useMemo(() => newJenjangId ? settings.kelas.filter(k => k.jenjangId === newJenjangId) : [], [newJenjangId, settings.kelas]);
    const availableRombelForMove = useMemo(() => newKelasId ? settings.rombel.filter(r => r.kelasId === newKelasId) : [], [newKelasId, settings.rombel]);

    if (!isOpen) return null;

    const handleSaveClick = () => {
        if (!newRombelId) {
            showAlert('Input Tidak Lengkap', 'Harap pilih Jenjang, Kelas, dan Rombel tujuan.');
            return;
        }
        onSave(newJenjangId, newKelasId, newRombelId);
    };
    
    return (
       <div className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex justify-center items-center p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
          <div className="p-5 border-b"><h3 className="text-lg font-semibold text-gray-800">Pindahkan Rombel Massal</h3></div>
          <div className="p-5 space-y-4">
            <p className="text-sm text-gray-600">Pilih tujuan baru untuk <strong className="font-semibold">{selectedCount}</strong> santri yang dipilih.</p>
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">Jenjang Tujuan</label>
              <select value={newJenjangId} onChange={e => { setNewJenjangId(Number(e.target.value)); setNewKelasId(0); setNewRombelId(0); }} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5">
                <option value={0}>-- Pilih Jenjang --</option>
                {settings.jenjang.map(j => <option key={j.id} value={j.id}>{j.nama}</option>)}
              </select>
            </div>
             <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">Kelas Tujuan</label>
              <select value={newKelasId} onChange={e => { setNewKelasId(Number(e.target.value)); setNewRombelId(0); }} disabled={!newJenjangId} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5 disabled:bg-gray-200">
                <option value={0}>-- Pilih Kelas --</option>
                {availableKelasForMove.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
              </select>
            </div>
             <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">Rombel Tujuan</label>
              <select value={newRombelId} onChange={e => setNewRombelId(Number(e.target.value))} disabled={!newKelasId} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5 disabled:bg-gray-200">
                <option value={0}>-- Pilih Rombel --</option>
                {availableRombelForMove.map(r => <option key={r.id} value={r.id}>{r.nama}</option>)}
              </select>
            </div>
          </div>
          <div className="p-4 border-t flex justify-end space-x-2">
            <button onClick={onClose} type="button" className="text-gray-500 bg-white hover:bg-gray-100 rounded-lg border border-gray-200 text-sm font-medium px-5 py-2.5">Batal</button>
            <button onClick={handleSaveClick} type="button" className="text-white bg-teal-700 hover:bg-teal-800 font-medium rounded-lg text-sm px-5 py-2.5">Pindahkan</button>
          </div>
        </div>
      </div>
    );
};
