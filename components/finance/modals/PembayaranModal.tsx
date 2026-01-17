
import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../../../AppContext';
import { useFinanceContext } from '../../../contexts/FinanceContext';
import { Santri, Tagihan } from '../../../types';
import { formatRupiah } from '../../../utils/formatters';

interface PembayaranModalProps {
    isOpen: boolean;
    onClose: () => void;
    santri: Santri;
}

export const PembayaranModal: React.FC<PembayaranModalProps> = ({ isOpen, onClose, santri }) => {
    const { showToast, showAlert } = useAppContext();
    const { tagihanList, onAddPembayaran } = useFinanceContext();
    const [selectedTagihanIds, setSelectedTagihanIds] = useState<number[]>([]);
    const [metode, setMetode] = useState<'Tunai' | 'Transfer'>('Tunai');
    const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);
    const [catatan, setCatatan] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const tunggakan = useMemo(() => {
        return tagihanList.filter(t => t.santriId === santri.id && t.status === 'Belum Lunas');
    }, [tagihanList, santri.id]);

    const totalTerpilih = useMemo(() => {
        return tunggakan
            .filter(t => selectedTagihanIds.includes(t.id))
            .reduce((sum, t) => sum + t.nominal, 0);
    }, [tunggakan, selectedTagihanIds]);

    useEffect(() => {
        if (!isOpen) {
            setSelectedTagihanIds([]);
            setCatatan('');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSelectTagihan = (id: number) => {
        setSelectedTagihanIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const handleSave = async () => {
        if (selectedTagihanIds.length === 0 || totalTerpilih === 0) {
            showAlert('Input Tidak Valid', 'Harap pilih minimal satu tagihan untuk dibayar.');
            return;
        }
        setIsSubmitting(true);
        try {
            await onAddPembayaran({
                santriId: santri.id,
                tagihanIds: selectedTagihanIds,
                jumlah: totalTerpilih,
                tanggal,
                metode,
                catatan,
                disetorKeKas: false,
            });
            showToast('Pembayaran berhasil dicatat.', 'success');
            onClose();
        } catch (e) {
            showAlert('Gagal Menyimpan', (e as Error).message);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl" onClick={e => e.stopPropagation()}>
                <div className="p-5 border-b"><h3 className="text-lg font-semibold text-gray-800">Catat Pembayaran - {santri.namaLengkap}</h3></div>
                <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
                    <h4 className="font-semibold">Pilih Tagihan yang Akan Dibayar:</h4>
                    <div className="border rounded-lg max-h-60 overflow-y-auto">
                        {tunggakan.length > 0 ? (
                            <table className="w-full text-sm">
                                {tunggakan.map(t => (
                                    <tr key={t.id} className="border-b last:border-b-0 hover:bg-gray-50">
                                        <td className="p-3 w-8"><input type="checkbox" checked={selectedTagihanIds.includes(t.id)} onChange={() => handleSelectTagihan(t.id)} className="h-4 w-4"/></td>
                                        <td className="p-3">{t.deskripsi}</td>
                                        <td className="p-3 text-right font-medium">{formatRupiah(t.nominal)}</td>
                                    </tr>
                                ))}
                            </table>
                        ) : <p className="text-center p-8 text-gray-500">Tidak ada tunggakan.</p>}
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                        <div><label className="block mb-1 text-sm">Tanggal Bayar</label><input type="date" value={tanggal} onChange={e => setTanggal(e.target.value)} className="w-full bg-gray-50 border p-2.5 rounded-lg"/></div>
                        <div><label className="block mb-1 text-sm">Metode</label><select value={metode} onChange={e => setMetode(e.target.value as any)} className="w-full bg-gray-50 border p-2.5 rounded-lg"><option value="Tunai">Tunai</option><option value="Transfer">Transfer</option></select></div>
                        <div className="md:col-span-2"><label className="block mb-1 text-sm">Catatan (Opsional)</label><input type="text" value={catatan} onChange={e => setCatatan(e.target.value)} className="w-full bg-gray-50 border p-2.5 rounded-lg"/></div>
                    </div>
                </div>
                <div className="p-4 border-t flex justify-between items-center bg-gray-50">
                    <div>
                        <span className="text-sm">Total Terpilih:</span>
                        <p className="font-bold text-lg text-teal-700">{formatRupiah(totalTerpilih)}</p>
                    </div>
                    <div className="space-x-2">
                        <button onClick={onClose} disabled={isSubmitting} className="px-5 py-2.5 text-sm rounded-lg border">Batal</button>
                        <button onClick={handleSave} disabled={isSubmitting || totalTerpilih === 0} className="px-5 py-2.5 text-sm rounded-lg bg-teal-700 text-white disabled:bg-gray-300">{isSubmitting ? 'Menyimpan...' : 'Simpan Pembayaran'}</button>
                    </div>
                </div>
            </div>
        </div>
    );
};
