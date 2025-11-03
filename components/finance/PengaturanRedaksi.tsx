import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../AppContext';
import { PondokSettings } from '../../types';

export const PengaturanRedaksi: React.FC = () => {
    const { settings, onSaveSettings, showToast } = useAppContext();
    const [redaksi, setRedaksi] = useState({
        suratTagihanPembuka: settings.suratTagihanPembuka,
        suratTagihanPenutup: settings.suratTagihanPenutup,
        suratTagihanCatatan: settings.suratTagihanCatatan || '',
        pesanWaTunggakan: settings.pesanWaTunggakan,
    });
    
    useEffect(() => {
        setRedaksi({
            suratTagihanPembuka: settings.suratTagihanPembuka,
            suratTagihanPenutup: settings.suratTagihanPenutup,
            suratTagihanCatatan: settings.suratTagihanCatatan || '',
            pesanWaTunggakan: settings.pesanWaTunggakan,
        });
    }, [settings]);

    const handleSave = async () => {
        const updatedSettings: PondokSettings = { ...settings, ...redaksi };
        await onSaveSettings(updatedSettings);
        showToast('Pengaturan redaksi berhasil disimpan.', 'success');
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-md space-y-6">
            <div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">Redaksi Surat Tagihan</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block mb-1 text-sm font-medium">Kalimat Pembuka</label>
                        <textarea rows={4} value={redaksi.suratTagihanPembuka} onChange={e => setRedaksi({...redaksi, suratTagihanPembuka: e.target.value})} className="w-full bg-gray-50 border p-2.5 rounded-lg text-sm"></textarea>
                    </div>
                    <div>
                        <label className="block mb-1 text-sm font-medium">Kalimat Penutup</label>
                        <textarea rows={4} value={redaksi.suratTagihanPenutup} onChange={e => setRedaksi({...redaksi, suratTagihanPenutup: e.target.value})} className="w-full bg-gray-50 border p-2.5 rounded-lg text-sm"></textarea>
                    </div>
                     <div>
                        <label className="block mb-1 text-sm font-medium">Catatan Tambahan (Opsional)</label>
                        <textarea rows={3} value={redaksi.suratTagihanCatatan} onChange={e => setRedaksi({...redaksi, suratTagihanCatatan: e.target.value})} className="w-full bg-gray-50 border p-2.5 rounded-lg text-sm"></textarea>
                    </div>
                </div>
            </div>
            <div className="border-t pt-6">
                 <h3 className="text-lg font-bold text-gray-800 mb-2">Template Notifikasi WhatsApp</h3>
                 <p className="text-sm text-gray-600 mb-2">Gunakan placeholder: <code className="bg-gray-200 text-red-600 px-1 rounded">{'{NAMA_SANTRI}'}</code>, <code className="bg-gray-200 text-red-600 px-1 rounded">{'{JUMLAH_TUNGGAKAN}'}</code>, <code className="bg-gray-200 text-red-600 px-1 rounded">{'{NAMA_PONPES}'}</code></p>
                 <textarea rows={5} value={redaksi.pesanWaTunggakan} onChange={e => setRedaksi({...redaksi, pesanWaTunggakan: e.target.value})} className="w-full bg-gray-50 border p-2.5 rounded-lg text-sm"></textarea>
            </div>
             <div className="flex justify-end pt-4">
                <button onClick={handleSave} className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium text-sm">Simpan Perubahan</button>
            </div>
        </div>
    );
};
