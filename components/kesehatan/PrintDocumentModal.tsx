import React from 'react';
import { KesehatanRecord, Santri } from '../../types';
import { DocumentType } from './KesehatanPrintTemplates';

interface PrintDocumentModalProps {
    isOpen: boolean;
    onClose: () => void;
    record: KesehatanRecord;
    santri: Santri;
    onPrint: (type: DocumentType) => void;
}

export const PrintDocumentModal: React.FC<PrintDocumentModalProps> = ({
    isOpen,
    onClose,
    record,
    santri,
    onPrint
}) => {
    if (!isOpen) return null;

    const options = [
        {
            type: 'surat-sakit' as DocumentType,
            title: 'Surat Keterangan Sakit',
            desc: 'Format A5 resmi keterangan sakit untuk arsip asrama / dispensasi KBM santri.',
            icon: 'bi-file-earmark-medical',
            badge: 'Standard UKS',
            badgeClass: 'bg-teal-100 text-teal-800'
        },
        {
            type: 'surat-rujukan' as DocumentType,
            title: 'Surat Pengantar Rujukan Faskes',
            desc: 'Surat resmi ke Puskesmas/RSUD mencakup tanda vital, anamnesa, dan terapi awal di pondok.',
            icon: 'bi-hospital',
            badge: 'Rujukan Medis',
            badgeClass: 'bg-rose-100 text-rose-800'
        },
        {
            type: 'surat-pulang' as DocumentType,
            title: 'Surat Rekomendasi Istirahat di Rumah',
            desc: 'Rekomendasi medis izin pulang santri untuk pemulihan intensif di bawah asuhan orang tua.',
            icon: 'bi-house-heart',
            badge: 'Izin Pulang',
            badgeClass: 'bg-purple-100 text-purple-800'
        }
    ];

    return (
        <div className="fixed inset-0 bg-black/60 z-[80] flex justify-center items-center p-4 backdrop-blur-xs">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
                <div className="p-4 bg-gradient-to-r from-teal-600 to-cyan-700 text-white flex justify-between items-center">
                    <div className="flex items-center gap-2.5">
                        <span className="p-2 bg-white/20 rounded-xl">
                            <i className="bi bi-printer-fill text-lg"></i>
                        </span>
                        <div>
                            <h3 className="font-bold text-base leading-tight">Pilih Dokumen Medis</h3>
                            <p className="text-xs text-teal-100">Santri: {santri.namaLengkap}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition">
                        <i className="bi bi-x-lg text-lg"></i>
                    </button>
                </div>

                <div className="p-4 space-y-2.5">
                    <p className="text-xs text-gray-500 mb-2">Pilih template cetak surat resmi yang ingin dicetak atau diunduh sebagai PDF:</p>
                    {options.map((opt) => (
                        <div
                            key={opt.type}
                            onClick={() => {
                                onPrint(opt.type);
                                onClose();
                            }}
                            className="p-3.5 border border-gray-200 rounded-xl hover:border-teal-500 hover:bg-teal-50/50 cursor-pointer transition flex items-start gap-3 group"
                        >
                            <span className="p-2.5 bg-gray-100 group-hover:bg-teal-600 group-hover:text-white text-teal-700 rounded-xl transition shrink-0">
                                <i className={`bi ${opt.icon} text-lg`}></i>
                            </span>
                            <div className="flex-grow min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                    <h4 className="text-sm font-bold text-gray-900 group-hover:text-teal-900 truncate">{opt.title}</h4>
                                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${opt.badgeClass}`}>{opt.badge}</span>
                                </div>
                                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{opt.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="p-3 bg-gray-50 border-t flex justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-200 rounded-xl transition"
                    >
                        Tutup
                    </button>
                </div>
            </div>
        </div>
    );
};
