
import React, { useState, useRef } from 'react';
import { Santri, TahfizhRecord } from '../../types';
import { useAppContext } from '../../AppContext';
import { useSantriContext } from '../../contexts/SantriContext';
import { TahfizhReportTemplate } from './TahfizhReportTemplate';
import { printToPdfNative } from '../../utils/pdfGenerator';

interface TahfizhDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    santri: Santri;
    records: TahfizhRecord[];
}

export const TahfizhDetailModal: React.FC<TahfizhDetailModalProps> = ({ isOpen, onClose, santri, records }) => {
    const { showConfirmation, showToast, currentUser, settings } = useAppContext();
    const { onDeleteTahfizh } = useSantriContext();
    const [showPrintConfig, setShowPrintConfig] = useState(false);
    
    // Default: Current Month
    const date = new Date();
    const [startDate, setStartDate] = useState(new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0]);

    if (!isOpen) return null;

    const canDelete = currentUser?.role === 'admin' || currentUser?.permissions?.tahfizh === 'write';

    // Sort records: Newest first for UI
    const sortedRecords = [...records].sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime() || b.id - a.id);

    const handleDelete = (id: number) => {
        showConfirmation(
            'Hapus Catatan?',
            'Data setoran ini akan dihapus permanen.',
            async () => {
                try {
                    await onDeleteTahfizh(id);
                    showToast('Data berhasil dihapus.', 'success');
                } catch (e) {
                    showToast('Gagal menghapus data.', 'error');
                }
            },
            { confirmColor: 'red' }
        );
    };

    const getTypeColor = (tipe: TahfizhRecord['tipe']) => {
        switch (tipe) {
            case 'Ziyadah': return 'bg-green-100 text-green-700 border-green-200';
            case 'Murojaah': return 'bg-blue-100 text-blue-700 border-blue-200';
            case "Tasmi'": return 'bg-purple-100 text-purple-700 border-purple-200';
            default: return 'bg-gray-100 text-gray-700';
        }
    };
    
    const handlePrint = () => {
        printToPdfNative('tahfizh-report-preview', `Laporan_Tahfizh_${santri.namaLengkap.replace(/\s+/g, '_')}`);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[70] flex justify-center items-end sm:items-center p-0 sm:p-4">
            <div className="bg-white rounded-t-xl sm:rounded-xl shadow-xl w-full max-w-lg h-[90vh] sm:h-[85vh] flex flex-col animate-slide-up sm:animate-none relative">
                {/* Header */}
                <div className="p-4 border-b flex justify-between items-center bg-teal-50 rounded-t-xl shrink-0">
                    <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-teal-700 font-bold border border-teal-100 shadow-sm">
                            {santri.namaLengkap.charAt(0)}
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-800 leading-tight">{santri.namaLengkap}</h3>
                            <p className="text-xs text-gray-500">NIS: {santri.nis} | Total Setoran: {records.length}</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setShowPrintConfig(!showPrintConfig)} className={`p-2 rounded-full transition-colors ${showPrintConfig ? 'bg-teal-200 text-teal-800' : 'bg-white text-gray-500 hover:bg-gray-100'}`} title="Cetak Laporan">
                            <i className="bi bi-printer-fill"></i>
                        </button>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 bg-white rounded-full p-2"><i className="bi bi-x-lg"></i></button>
                    </div>
                </div>

                {/* Print Configuration Panel */}
                {showPrintConfig && (
                    <div className="p-4 bg-gray-50 border-b animate-fade-in-down shrink-0">
                        <h4 className="text-sm font-bold text-gray-700 mb-2">Cetak Laporan Berkala</h4>
                        <div className="grid grid-cols-2 gap-3 mb-3">
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Dari Tanggal</label>
                                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full text-sm border rounded p-1.5"/>
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Sampai Tanggal</label>
                                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full text-sm border rounded p-1.5"/>
                            </div>
                        </div>
                        <button onClick={handlePrint} className="w-full bg-teal-600 text-white py-2 rounded-lg text-sm font-bold hover:bg-teal-700 flex items-center justify-center gap-2">
                            <i className="bi bi-file-earmark-pdf-fill"></i> Download PDF Laporan
                        </button>
                    </div>
                )}

                {/* Timeline Body */}
                <div className="flex-grow overflow-y-auto p-4 bg-gray-50">
                    {sortedRecords.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                            <i className="bi bi-journal-x text-4xl mb-2 opacity-50"></i>
                            <p className="text-sm">Belum ada riwayat setoran.</p>
                        </div>
                    ) : (
                        <div className="relative border-l-2 border-gray-200 ml-3 space-y-6 pl-6 py-2">
                            {sortedRecords.map((rec) => (
                                <div key={rec.id} className="relative group">
                                    {/* Dot */}
                                    <div className={`absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2 border-white shadow-sm ${
                                        rec.tipe === 'Ziyadah' ? 'bg-green-500' : rec.tipe === 'Murojaah' ? 'bg-blue-500' : 'bg-purple-500'
                                    }`}></div>
                                    
                                    {/* Card */}
                                    <div className="bg-white p-3 rounded-lg border shadow-sm hover:shadow-md transition-shadow">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex gap-2">
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getTypeColor(rec.tipe)}`}>
                                                    {rec.tipe}
                                                </span>
                                                <span className="text-xs text-gray-500 flex items-center">
                                                    <i className="bi bi-calendar-event mr-1"></i>
                                                    {new Date(rec.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                </span>
                                            </div>
                                            {canDelete && (
                                                <button onClick={() => handleDelete(rec.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                                                    <i className="bi bi-trash"></i>
                                                </button>
                                            )}
                                        </div>
                                        
                                        <div className="mb-2">
                                            <p className="font-bold text-gray-800 text-sm">
                                                Juz {rec.juz}, QS. {rec.surah}
                                            </p>
                                            <p className="text-sm text-gray-600">
                                                Ayat {rec.ayatAwal} - {rec.ayatAkhir}
                                            </p>
                                        </div>

                                        <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                                            <div className="flex items-center gap-1">
                                                <i className="bi bi-bookmark-star-fill text-yellow-400 text-xs"></i>
                                                <span className="text-xs font-medium text-gray-700">{rec.predikat}</span>
                                            </div>
                                            {rec.catatan && (
                                                <div className="text-xs text-gray-500 italic max-w-[60%] truncate" title={rec.catatan}>
                                                    "{rec.catatan}"
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t bg-white shrink-0">
                    <button onClick={onClose} className="w-full py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors">
                        Tutup
                    </button>
                </div>

                {/* Hidden Print Area */}
                <div className="hidden print:block">
                    <div id="tahfizh-report-preview">
                         <TahfizhReportTemplate 
                            santri={santri} 
                            records={records} 
                            settings={settings} 
                            startDate={startDate} 
                            endDate={endDate} 
                         />
                    </div>
                </div>
            </div>
        </div>
    );
};
