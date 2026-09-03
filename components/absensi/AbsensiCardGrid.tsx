import React from 'react';
import { Santri, AbsensiRecord } from '../../types';
import { getStatusBadgeColor, getStatusLabel } from './absensiConstants';

interface AbsensiCardGridProps {
    targetSantri: Santri[];
    attendanceMap: Record<number, AbsensiRecord['status']>;
    notesMap: Record<number, string>;
    onStatusChange: (santriId: number, status: AbsensiRecord['status']) => void;
    onNoteChange: (santriId: number, note: string) => void;
    onOpenWaSingle: (santriId: number) => void;
    onOpenBkModal: (santri: Santri, reason: string) => void;
}

export const AbsensiCardGrid: React.FC<AbsensiCardGridProps> = ({
    targetSantri,
    attendanceMap,
    notesMap,
    onStatusChange,
    onNoteChange,
    onOpenWaSingle,
    onOpenBkModal
}) => {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {targetSantri.map((santri) => {
                const status = attendanceMap[santri.id] ?? 'H';
                const note = notesMap[santri.id] || '';
                const isAbsent = status !== 'H';

                return (
                    <div 
                        key={santri.id} 
                        className={`bg-white rounded-2xl border transition-all duration-200 p-4 flex flex-col justify-between shadow-2xs hover:shadow-md ${
                            status === 'H' ? 'border-gray-200' :
                            status === 'S' ? 'border-yellow-300 ring-2 ring-yellow-100 bg-yellow-50/20' :
                            status === 'I' ? 'border-blue-300 ring-2 ring-blue-100 bg-blue-50/20' :
                            'border-red-300 ring-2 ring-red-100 bg-red-50/20'
                        }`}
                    >
                        {/* Card Header */}
                        <div>
                            <div className="flex items-start justify-between gap-2 mb-3">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="relative shrink-0">
                                        {santri.fotoUrl ? (
                                            <img
                                                src={santri.fotoUrl}
                                                alt={santri.namaLengkap}
                                                className="w-10 h-10 rounded-full object-cover border border-gray-200"
                                            />
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-xs border border-teal-200">
                                                {santri.namaLengkap.substring(0, 2).toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="font-bold text-sm text-gray-900 truncate leading-tight">
                                            {santri.namaLengkap}
                                        </h4>
                                        <p className="text-[11px] text-gray-400 font-mono">NIS: {santri.nis}</p>
                                    </div>
                                </div>
                                <div className={`px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase tracking-wider ${getStatusBadgeColor(status)}`}>
                                    {getStatusLabel(status)}
                                </div>
                            </div>
                        </div>

                        {/* Status Buttons & Actions */}
                        <div className="mt-3 space-y-2.5">
                            <div className="grid grid-cols-4 gap-1 p-1 bg-gray-100/80 rounded-xl">
                                {(['H', 'S', 'I', 'A'] as const).map(opt => (
                                    <button 
                                        key={opt} 
                                        type="button"
                                        onClick={() => onStatusChange(santri.id, opt)} 
                                        className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                                            status === opt 
                                                ? (opt === 'H' ? 'bg-green-600 text-white shadow-xs' :
                                                   opt === 'S' ? 'bg-yellow-500 text-white shadow-xs' :
                                                   opt === 'I' ? 'bg-blue-600 text-white shadow-xs' :
                                                   'bg-red-600 text-white shadow-xs') 
                                                : 'text-gray-500 hover:text-gray-800 hover:bg-gray-200/60'
                                        }`}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>

                            {/* Note Input */}
                            <div className="relative">
                                <input 
                                    type="text" 
                                    placeholder={status === 'S' ? "Sakit apa?" : status === 'I' ? "Izin kenapa?" : status === 'A' ? "Alasan alpha / tanpa kabar..." : "Keterangan opsional..."}
                                    value={note}
                                    onChange={(e) => onNoteChange(santri.id, e.target.value)}
                                    className={`w-full text-xs rounded-lg px-2.5 py-1.5 border bg-white focus:outline-none transition-colors ${
                                        isAbsent && !note 
                                            ? 'border-red-300 ring-1 ring-red-200 bg-red-50/40 text-red-900 placeholder-red-400' 
                                            : 'border-gray-200 focus:border-teal-500'
                                    }`}
                                />
                                {isAbsent && !note && (
                                    <div className="absolute right-2 top-2 text-red-500 text-[10px] font-bold pointer-events-none animate-pulse">
                                        Wajib isi
                                    </div>
                                )}
                            </div>

                            {/* Quick Action Buttons for Absent Students */}
                            {isAbsent && (
                                <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
                                    <button
                                        type="button"
                                        onClick={() => onOpenWaSingle(santri.id)}
                                        className="flex-1 py-1 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-colors"
                                    >
                                        <i className="bi bi-whatsapp"></i>
                                        <span>WA Wali</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onOpenBkModal(santri, `Ketidakhadiran (${getStatusLabel(status)}): ${note || 'Tanpa keterangan'}`)}
                                        className="py-1 px-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-colors"
                                        title="Rujuk ke BK"
                                    >
                                        <i className="bi bi-person-exclamation"></i>
                                        <span className="hidden sm:inline">Rujuk BK</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
