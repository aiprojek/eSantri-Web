import React, { useState } from 'react';
import { AtRiskSantriInfo } from './absensiConstants';
import { Santri } from '../../types';

interface AbsensiWarningBannerProps {
    atRiskStudents: AtRiskSantriInfo[];
    santriList: Santri[];
    onOpenBkModal: (santri: Santri, reason: string) => void;
    onOpenWaModal: (santriId: number) => void;
}

export const AbsensiWarningBanner: React.FC<AbsensiWarningBannerProps> = ({
    atRiskStudents,
    santriList,
    onOpenBkModal,
    onOpenWaModal
}) => {
    const [isExpanded, setIsExpanded] = useState(false);

    if (!atRiskStudents || atRiskStudents.length === 0) return null;

    return (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4 shadow-xs transition-all">
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <i className="bi bi-exclamation-triangle-fill text-lg"></i>
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-amber-950">
                                Peringatan Dini Kehadiran ({atRiskStudents.length} Santri Perlu Perhatian)
                            </h4>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-900">
                                Early Warning
                            </span>
                        </div>
                        <p className="text-xs text-amber-800">
                            Terdeteksi santri dengan akumulasi $\ge 3$ Alpha atau tingkat kehadiran di bawah 80%.
                        </p>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shrink-0"
                >
                    <span>{isExpanded ? 'Tutup Rincian' : 'Lihat Santri'}</span>
                    <i className={`bi ${isExpanded ? 'bi-chevron-up' : 'bi-chevron-down'}`}></i>
                </button>
            </div>

            {isExpanded && (
                <div className="mt-4 pt-3 border-t border-amber-200/80 space-y-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {atRiskStudents.map((item) => {
                            const fullSantri = santriList.find(s => s.id === item.santriId);
                            const reasonText = `Akumulasi ketidakhadiran: ${item.alphaCount}x Alpha, ${item.sakitCount}x Sakit, ${item.izinCount}x Izin (Tingkat kehadiran: ${item.attendanceRate.toFixed(0)}%)`;

                            return (
                                <div
                                    key={item.santriId}
                                    className="bg-white/90 border border-amber-200/90 rounded-xl p-3 flex items-center justify-between gap-2 text-xs shadow-2xs"
                                >
                                    <div className="min-w-0">
                                        <div className="font-bold text-gray-900 truncate">
                                            {item.namaLengkap}
                                        </div>
                                        <div className="text-[11px] text-amber-900 font-medium flex items-center gap-2 mt-0.5">
                                            <span className="bg-red-100 text-red-800 px-1.5 py-0.5 rounded font-bold">
                                                {item.alphaCount} Alpha
                                            </span>
                                            <span className="text-gray-500">
                                                Kehadiran: {item.attendanceRate.toFixed(0)}%
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <button
                                            type="button"
                                            title="Kirim Notifikasi WhatsApp ke Wali"
                                            onClick={() => onOpenWaModal(item.santriId)}
                                            className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                                        >
                                            <i className="bi bi-whatsapp"></i>
                                            <span className="hidden sm:inline">WA Wali</span>
                                        </button>
                                        <button
                                            type="button"
                                            title="Rujuk ke Bimbingan Konseling (BK)"
                                            onClick={() => fullSantri && onOpenBkModal(fullSantri, reasonText)}
                                            className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                                        >
                                            <i className="bi bi-person-exclamation"></i>
                                            <span className="hidden sm:inline">Rujuk BK</span>
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};
