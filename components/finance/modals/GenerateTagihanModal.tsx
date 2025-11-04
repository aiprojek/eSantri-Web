
import React, { useState } from 'react';
import { useAppContext } from '../../../AppContext';

interface GenerateTagihanModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const GenerateTagihanModal: React.FC<GenerateTagihanModalProps> = ({ isOpen, onClose }) => {
    const { onGenerateTagihanBulanan, onGenerateTagihanAwal, showAlert, showToast } = useAppContext();
    const [isLoading, setIsLoading] = useState(false);
    const [bulan, setBulan] = useState(new Date().getMonth() + 1);
    const [tahun, setTahun] = useState(new Date().getFullYear());

    if (!isOpen) return null;

    const months = [
        { value: 1, name: "Januari" }, { value: 2, name: "Februari" }, { value: 3, name: "Maret" },
        { value: 4, name: "April" }, { value: 5, name: "Mei" }, { value: 6, name: "Juni" },
        { value: 7, name: "Juli" }, { value: 8, name: "Agustus" }, { value: 9, name: "September" },
        { value: 10, name: "Oktober" }, { value: 11, name: "November" }, { value: 12, name: "Desember" }
    ];

    const handleGenerateBulanan = async () => {
        setIsLoading(true);
        try {
            const { generated, skipped } = await onGenerateTagihanBulanan(tahun, bulan);
            showToast(`Berhasil: ${generated} tagihan dibuat, ${skipped} dilewati karena sudah ada.`, 'success');
            onClose();
        } catch (e) {
            showAlert('Error', (e as Error).message);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleGenerateAwal = async () => {
        setIsLoading(true);
        try {
            const { generated, skipped } = await onGenerateTagihanAwal();
            showToast(`Berhasil: ${generated} tagihan dibuat, ${skipped} dilewati karena sudah ada.`, 'success');
            onClose();
        } catch (e) {
            showAlert('Error', (e as Error).message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <div className="p-5 border-b"><h3 className="text-lg font-semibold text-gray-800">Generate Tagihan Otomatis</h3></div>
                <div className="p-5 space-y-6">
                    <div>
                        <h4 className="font-semibold text-gray-800">1. Generate Tagihan Bulanan (SPP, dll)</h4>
                        <p className="text-sm text-gray-600 mb-2">Membuat tagihan untuk semua biaya berjenis 'Bulanan' bagi santri aktif.</p>
                        <div className="flex flex-wrap items-center gap-2">
                            <select value={bulan} onChange={e => setBulan(Number(e.target.value))} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg p-2.5">
                                {months.map(m => <option key={m.value} value={m.value}>{m.name}</option>)}
                            </select>
                            <input type="number" value={tahun} onChange={e => setTahun(Number(e.target.value))} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg p-2.5 w-28"/>
                            <button onClick={handleGenerateBulanan} disabled={isLoading} className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm disabled:bg-gray-300">Generate</button>
                        </div>
                    </div>
                    <div className="border-t pt-6">
                        <h4 className="font-semibold text-gray-800">2. Generate Tagihan Awal (Uang Pangkal, dll)</h4>
                        <p className="text-sm text-gray-600 mb-2">Membuat tagihan untuk semua biaya berjenis 'Sekali Bayar' atau 'Cicilan' bagi santri aktif yang belum memilikinya.</p>
                        <button onClick={handleGenerateAwal} disabled={isLoading} className="px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm disabled:bg-gray-300">Generate Tagihan Awal</button>
                    </div>
                </div>
                <div className="p-4 border-t flex justify-end"><button onClick={onClose} className="text-gray-500 bg-white hover:bg-gray-100 rounded-lg border border-gray-200 text-sm font-medium px-5 py-2.5">Tutup</button></div>
            </div>
        </div>
    );
};
