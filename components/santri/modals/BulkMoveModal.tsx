import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../../AppContext';

interface BulkMoveModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (jenjangId: number, kelasId: number, rombelId: number, meta?: { jenis: 'Kenaikan Kelas' | 'Pindah Rombel'; tanggal: string; catatan: string }) => void;
    selectedCount: number;
}

export const BulkMoveModal: React.FC<BulkMoveModalProps> = ({ isOpen, onClose, onSave, selectedCount }) => {
    const { settings, showAlert } = useAppContext();
    const [newJenjangId, setNewJenjangId] = useState<number>(0);
    const [newKelasId, setNewKelasId] = useState<number>(0);
    const [newRombelId, setNewRombelId] = useState<number>(0);
    const [jenisPerpindahan, setJenisPerpindahan] = useState<'Kenaikan Kelas' | 'Pindah Rombel'>('Kenaikan Kelas');
    const [tanggalMove, setTanggalMove] = useState<string>(new Date().toISOString().split('T')[0]);
    const [catatanMove, setCatatanMove] = useState<string>('');
    
    const availableKelasForMove = useMemo(() => newJenjangId ? settings.kelas.filter(k => k.jenjangId === newJenjangId) : [], [newJenjangId, settings.kelas]);
    const availableRombelForMove = useMemo(() => newKelasId ? settings.rombel.filter(r => r.kelasId === newKelasId) : [], [newKelasId, settings.rombel]);

    if (!isOpen) return null;

    const handleSaveClick = () => {
        if (!newRombelId) {
            showAlert('Input Tidak Lengkap', 'Harap pilih Jenjang, Kelas, dan Rombel tujuan.');
            return;
        }
        onSave(newJenjangId, newKelasId, newRombelId, {
            jenis: jenisPerpindahan,
            tanggal: tanggalMove || new Date().toISOString().split('T')[0],
            catatan: catatanMove.trim()
        });
    };
    
    return (
       <div className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex justify-center items-center p-4">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
          <div className="p-5 border-b bg-slate-50">
            <h3 className="text-lg font-bold text-gray-800">Kenaikan Kelas / Pindah Rombel Massal</h3>
            <p className="text-xs text-gray-500 mt-0.5">Riwayat perpindahan akan otomatis tercatat di rekam jejak akademik santri.</p>
          </div>
          <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
            <p className="text-sm text-gray-600">Pilih tujuan baru untuk <strong className="font-semibold text-teal-700">{selectedCount}</strong> santri yang dipilih.</p>
            <div className="grid grid-cols-2 gap-2">
              {(['Kenaikan Kelas', 'Pindah Rombel'] as const).map(j => (
                <button
                  key={j}
                  type="button"
                  onClick={() => setJenisPerpindahan(j)}
                  className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all ${
                    jenisPerpindahan === j
                      ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {j}
                </button>
              ))}
            </div>
            <div>
              <label className="block mb-1 text-xs font-bold text-gray-700">Jenjang Tujuan</label>
              <select value={newJenjangId} onChange={e => { setNewJenjangId(Number(e.target.value)); setNewKelasId(0); setNewRombelId(0); }} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5">
                <option value={0}>-- Pilih Jenjang --</option>
                {settings.jenjang.map(j => <option key={j.id} value={j.id}>{j.nama}</option>)}
              </select>
            </div>
             <div>
              <label className="block mb-1 text-xs font-bold text-gray-700">Kelas Tujuan</label>
              <select value={newKelasId} onChange={e => { setNewKelasId(Number(e.target.value)); setNewRombelId(0); }} disabled={!newJenjangId} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5 disabled:bg-gray-200">
                <option value={0}>-- Pilih Kelas --</option>
                {availableKelasForMove.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
              </select>
            </div>
             <div>
              <label className="block mb-1 text-xs font-bold text-gray-700">Rombel Tujuan</label>
              <select value={newRombelId} onChange={e => setNewRombelId(Number(e.target.value))} disabled={!newKelasId} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5 disabled:bg-gray-200">
                <option value={0}>-- Pilih Rombel --</option>
                {availableRombelForMove.map(r => <option key={r.id} value={r.id}>{r.nama}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block mb-1 text-xs font-bold text-gray-700">Tanggal Efektif</label>
                <input type="date" value={tanggalMove} onChange={e => setTanggalMove(e.target.value)} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2" />
              </div>
              <div>
                <label className="block mb-1 text-xs font-bold text-gray-700">Catatan / TA (Opsional)</label>
                <input type="text" value={catatanMove} onChange={e => setCatatanMove(e.target.value)} placeholder="Mis: TA 2026/2027" className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2" />
              </div>
            </div>
          </div>
          <div className="p-4 border-t bg-slate-50 flex justify-end space-x-2">
            <button onClick={onClose} type="button" className="text-gray-600 bg-white hover:bg-gray-100 rounded-lg border border-gray-200 text-sm font-medium px-4 py-2">Batal</button>
            <button onClick={handleSaveClick} type="button" className="text-white bg-teal-700 hover:bg-teal-800 font-bold rounded-lg text-sm px-5 py-2">Proses {jenisPerpindahan}</button>
          </div>
        </div>
      </div>
    );
};

