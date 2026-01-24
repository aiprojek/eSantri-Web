
import React, { useState, useEffect, useMemo } from 'react';
import { JadwalPelajaran, MataPelajaran, TenagaPengajar } from '../../../types';

interface JadwalModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Partial<JadwalPelajaran>) => void;
    onDelete: (id: number) => void;
    slot: { hari: number, jamKe: number } | null;
    initialData: JadwalPelajaran | null;
    days: string[];
    mapelList: MataPelajaran[];
    teacherList: TenagaPengajar[];
}

export const JadwalModal: React.FC<JadwalModalProps> = ({ isOpen, onClose, onSave, onDelete, slot, initialData, days, mapelList, teacherList }) => {
    const [mapelId, setMapelId] = useState<string>('');
    const [guruId, setGuruId] = useState<string>('');
    const [keterangan, setKeterangan] = useState('');
    const [mode, setMode] = useState<'KBM' | 'Khusus'>('KBM');

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setMapelId(initialData.mapelId?.toString() || '');
                setGuruId(initialData.guruId?.toString() || '');
                setKeterangan(initialData.keterangan || '');
                setMode(initialData.keterangan ? 'Khusus' : 'KBM');
            } else {
                setMapelId('');
                setGuruId('');
                setKeterangan('');
                setMode('KBM');
            }
        }
    }, [isOpen, initialData]);

    // Enhanced Grouping Logic: Availability AND Competency
    const groupedTeachers = useMemo(() => {
        if (!slot) return { recommended: [], othersAvailable: [], unavailable: [] };
        
        const mId = parseInt(mapelId);
        
        const recommended: TenagaPengajar[] = [];
        const othersAvailable: TenagaPengajar[] = [];
        const unavailable: TenagaPengajar[] = [];
        
        teacherList.forEach(t => {
            // Check Availability Day
            const isAvailableDay = !t.hariMasuk || t.hariMasuk.length === 0 || t.hariMasuk.includes(slot.hari);
            
            // Check Competency (Only if Mapel is selected)
            const hasCompetency = mId && t.kompetensiMapelIds && t.kompetensiMapelIds.includes(mId);

            if (isAvailableDay) {
                if (hasCompetency) {
                    recommended.push(t);
                } else {
                    othersAvailable.push(t);
                }
            } else {
                unavailable.push(t);
            }
        });
        
        return { recommended, othersAvailable, unavailable };
    }, [teacherList, slot, mapelId]);

    if (!isOpen || !slot) return null;

    const handleSave = () => {
        const data: Partial<JadwalPelajaran> = {
            hari: slot.hari,
            jamKe: slot.jamKe,
        };

        if (mode === 'KBM') {
            if (!mapelId || !guruId) {
                alert('Pilih Mata Pelajaran dan Guru.');
                return;
            }
            data.mapelId = parseInt(mapelId);
            data.guruId = parseInt(guruId);
            data.keterangan = undefined;
        } else {
            if (!keterangan.trim()) {
                alert('Isi keterangan kegiatan.');
                return;
            }
            data.keterangan = keterangan;
            data.mapelId = undefined;
            data.guruId = undefined;
        }

        onSave(data);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[70] flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                <div className="p-5 border-b flex justify-between items-center bg-teal-50 rounded-t-lg">
                    <div>
                        <h3 className="text-lg font-bold text-teal-800">Edit Jadwal</h3>
                        <p className="text-xs text-teal-600">{days[slot.hari]}, Jam Ke-{slot.jamKe}</p>
                    </div>
                    <button onClick={onClose}><i className="bi bi-x-lg"></i></button>
                </div>
                <div className="p-5 space-y-4">
                    {/* Mode Selector */}
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        <button onClick={() => setMode('KBM')} className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${mode === 'KBM' ? 'bg-white shadow text-teal-700' : 'text-gray-500'}`}>Pelajaran (KBM)</button>
                        <button onClick={() => setMode('Khusus')} className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${mode === 'Khusus' ? 'bg-white shadow text-teal-700' : 'text-gray-500'}`}>Khusus (Istirahat/Lainnya)</button>
                    </div>

                    {mode === 'KBM' ? (
                        <>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Mata Pelajaran</label>
                                <select value={mapelId} onChange={e => { setMapelId(e.target.value); setGuruId(''); }} className="w-full border rounded p-2 text-sm bg-white focus:ring-2 focus:ring-teal-500">
                                    <option value="">-- Pilih Mapel --</option>
                                    {mapelList.map(m => <option key={m.id} value={m.id}>{m.nama}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Guru Pengampu</label>
                                <select value={guruId} onChange={e => setGuruId(e.target.value)} disabled={!mapelId} className="w-full border rounded p-2 text-sm bg-white focus:ring-2 focus:ring-teal-500 disabled:bg-gray-100">
                                    <option value="">-- Pilih Guru --</option>
                                    
                                    <option value="-1" className="font-bold text-gray-500">-- NIHIL / KOSONG --</option>
                                    <option value="-2" className="font-bold text-teal-600">-- MUSYRIF / PENGAMPU TAHFIZH --</option>
                                    
                                    {groupedTeachers.recommended.length > 0 && (
                                        <optgroup label="🌟 Rekomendasi (Sesuai Kompetensi)">
                                            {groupedTeachers.recommended.map(t => <option key={t.id} value={t.id}>{t.nama}</option>)}
                                        </optgroup>
                                    )}
                                    
                                    {groupedTeachers.othersAvailable.length > 0 && (
                                        <optgroup label="✅ Tersedia Hari Ini (Mapel Lain)">
                                            {groupedTeachers.othersAvailable.map(t => <option key={t.id} value={t.id}>{t.nama}</option>)}
                                        </optgroup>
                                    )}
                                    
                                    {groupedTeachers.unavailable.length > 0 && (
                                        <optgroup label="⚠️ Tidak Tersedia Hari Ini">
                                            {groupedTeachers.unavailable.map(t => <option key={t.id} value={t.id}>{t.nama}</option>)}
                                        </optgroup>
                                    )}
                                </select>
                                {mapelId && groupedTeachers.recommended.length === 0 && (
                                    <p className="text-[10px] text-yellow-600 mt-1 italic">
                                        <i className="bi bi-info-circle mr-1"></i> Tidak ada guru yang diset kompetensi mapel ini. Silakan atur di Data Master.
                                    </p>
                                )}
                            </div>
                        </>
                    ) : (
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Keterangan Kegiatan</label>
                            <input type="text" value={keterangan} onChange={e => setKeterangan(e.target.value)} className="w-full border rounded p-2 text-sm" placeholder="Contoh: Istirahat, Sholat Dhuha, Upacara" />
                            <div className="flex gap-2 mt-2">
                                <button onClick={() => setKeterangan('Istirahat')} className="px-2 py-1 bg-gray-100 rounded text-xs hover:bg-gray-200">Istirahat</button>
                                <button onClick={() => setKeterangan('Sholat')} className="px-2 py-1 bg-gray-100 rounded text-xs hover:bg-gray-200">Sholat</button>
                                <button onClick={() => setKeterangan('Upacara')} className="px-2 py-1 bg-gray-100 rounded text-xs hover:bg-gray-200">Upacara</button>
                            </div>
                        </div>
                    )}
                </div>
                <div className="p-4 border-t flex justify-end gap-2 bg-gray-50 rounded-b-lg">
                    {initialData && (
                        <button onClick={() => { if(confirm('Hapus jadwal ini?')) onDelete(initialData.id); }} className="px-4 py-2 text-red-600 hover:bg-red-50 rounded text-sm font-bold mr-auto border border-red-200">Hapus</button>
                    )}
                    <button onClick={onClose} className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-200 text-sm">Batal</button>
                    <button onClick={handleSave} className="px-6 py-2 bg-teal-600 text-white rounded text-sm font-bold hover:bg-teal-700 shadow-sm">Simpan</button>
                </div>
            </div>
        </div>
    );
};
