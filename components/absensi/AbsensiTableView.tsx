import React, { useEffect, useRef, useState } from 'react';
import { Santri, AbsensiRecord } from '../../types';
import { getStatusBadgeColor, getStatusLabel } from './absensiConstants';

interface AbsensiTableViewProps {
    targetSantri: Santri[];
    attendanceMap: Record<number, AbsensiRecord['status']>;
    notesMap: Record<number, string>;
    onStatusChange: (santriId: number, status: AbsensiRecord['status']) => void;
    onNoteChange: (santriId: number, note: string) => void;
    onOpenWaSingle: (santriId: number) => void;
    onOpenBkModal: (santri: Santri, reason: string) => void;
}

export const AbsensiTableView: React.FC<AbsensiTableViewProps> = ({
    targetSantri,
    attendanceMap,
    notesMap,
    onStatusChange,
    onNoteChange,
    onOpenWaSingle,
    onOpenBkModal
}) => {
    const [focusedRowIndex, setFocusedRowIndex] = useState<number | null>(0);
    const noteInputRefs = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        noteInputRefs.current = noteInputRefs.current.slice(0, targetSantri.length);
    }, [targetSantri]);

    const handleKeyDown = (e: React.KeyboardEvent, index: number, santri: Santri) => {
        // If typing in input, let normal characters pass unless it's ArrowUp/ArrowDown/Enter
        const isInputTarget = (e.target as HTMLElement).tagName === 'INPUT';

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            const nextIdx = Math.min(targetSantri.length - 1, index + 1);
            setFocusedRowIndex(nextIdx);
            noteInputRefs.current[nextIdx]?.focus();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            const prevIdx = Math.max(0, index - 1);
            setFocusedRowIndex(prevIdx);
            noteInputRefs.current[prevIdx]?.focus();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (index < targetSantri.length - 1) {
                setFocusedRowIndex(index + 1);
                noteInputRefs.current[index + 1]?.focus();
            }
        } else if (!isInputTarget) {
            // Keyboard shortcut for fast toggling when not typing text
            if (e.key === '1' || e.key.toLowerCase() === 'h') {
                onStatusChange(santri.id, 'H');
            } else if (e.key === '2' || e.key.toLowerCase() === 's') {
                onStatusChange(santri.id, 'S');
                noteInputRefs.current[index]?.focus();
            } else if (e.key === '3' || e.key.toLowerCase() === 'i') {
                onStatusChange(santri.id, 'I');
                noteInputRefs.current[index]?.focus();
            } else if (e.key === '4' || e.key.toLowerCase() === 'a') {
                onStatusChange(santri.id, 'A');
                noteInputRefs.current[index]?.focus();
            }
        }
    };

    return (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-2xs">
            {/* Keyboard shortcut hint banner */}
            <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 text-xs text-gray-500 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-700 flex items-center gap-1">
                        <i className="bi bi-keyboard"></i> Navigasi Cepat:
                    </span>
                    <span className="bg-white px-1.5 py-0.5 border rounded text-[10px] font-mono">1/H: Hadir</span>
                    <span className="bg-white px-1.5 py-0.5 border rounded text-[10px] font-mono">2/S: Sakit</span>
                    <span className="bg-white px-1.5 py-0.5 border rounded text-[10px] font-mono">3/I: Izin</span>
                    <span className="bg-white px-1.5 py-0.5 border rounded text-[10px] font-mono">4/A: Alpha</span>
                    <span className="bg-white px-1.5 py-0.5 border rounded text-[10px] font-mono">&uarr;&darr; / Enter: Pindah Baris</span>
                </div>
                <span className="text-[11px] text-teal-700 font-medium">Mode Spreadsheet Kompak</span>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-gray-100/80 text-gray-700 font-bold border-b border-gray-200">
                        <tr>
                            <th className="p-3 text-center w-12">No</th>
                            <th className="p-3 min-w-[200px]">Nama Santri</th>
                            <th className="p-3 w-28 text-center font-mono">NIS</th>
                            <th className="p-3 min-w-[220px] text-center">Status Kehadiran</th>
                            <th className="p-3 min-w-[240px]">Keterangan / Alasan (Wajib jika S/I/A)</th>
                            <th className="p-3 w-36 text-center">Aksi Cepat</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {targetSantri.map((santri, idx) => {
                            const status = attendanceMap[santri.id] ?? 'H';
                            const note = notesMap[santri.id] || '';
                            const isAbsent = status !== 'H';
                            const isFocused = focusedRowIndex === idx;

                            return (
                                <tr 
                                    key={santri.id}
                                    tabIndex={0}
                                    onFocus={() => setFocusedRowIndex(idx)}
                                    onKeyDown={(e) => handleKeyDown(e, idx, santri)}
                                    className={`transition-colors duration-150 ${
                                        isFocused ? 'bg-teal-50/40' :
                                        status === 'H' ? 'hover:bg-gray-50/80' :
                                        status === 'S' ? 'bg-yellow-50/25 hover:bg-yellow-50/50' :
                                        status === 'I' ? 'bg-blue-50/25 hover:bg-blue-50/50' :
                                        'bg-red-50/25 hover:bg-red-50/50'
                                    }`}
                                >
                                    {/* Number */}
                                    <td className="p-3 text-center text-gray-500 font-medium">{idx + 1}</td>

                                    {/* Name & Photo */}
                                    <td className="p-3">
                                        <div className="flex items-center gap-2.5">
                                            {santri.fotoUrl ? (
                                                <img 
                                                    src={santri.fotoUrl} 
                                                    alt={santri.namaLengkap} 
                                                    className="w-7 h-7 rounded-full object-cover border shrink-0" 
                                                />
                                            ) : (
                                                <div className="w-7 h-7 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-[10px] shrink-0 border border-teal-200">
                                                    {santri.namaLengkap.substring(0, 2).toUpperCase()}
                                                </div>
                                            )}
                                            <span className="font-bold text-gray-800 whitespace-nowrap">{santri.namaLengkap}</span>
                                        </div>
                                    </td>

                                    {/* NIS */}
                                    <td className="p-3 text-center font-mono text-gray-500">{santri.nis}</td>

                                    {/* Status Segmented Buttons */}
                                    <td className="p-3">
                                        <div className="flex items-center justify-center gap-1 bg-gray-100 p-1 rounded-xl max-w-[200px] mx-auto">
                                            {(['H', 'S', 'I', 'A'] as const).map(opt => (
                                                <button
                                                    key={opt}
                                                    type="button"
                                                    onClick={() => onStatusChange(santri.id, opt)}
                                                    className={`flex-1 py-1 rounded-lg text-xs font-bold transition-all ${
                                                        status === opt
                                                            ? (opt === 'H' ? 'bg-green-600 text-white shadow-xs' :
                                                               opt === 'S' ? 'bg-yellow-500 text-white shadow-xs' :
                                                               opt === 'I' ? 'bg-blue-600 text-white shadow-xs' :
                                                               'bg-red-600 text-white shadow-xs')
                                                            : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200'
                                                    }`}
                                                >
                                                    {opt}
                                                </button>
                                            ))}
                                        </div>
                                    </td>

                                    {/* Note Input */}
                                    <td className="p-3">
                                        <div className="relative">
                                            <input
                                                ref={(el) => { noteInputRefs.current[idx] = el; }}
                                                type="text"
                                                value={note}
                                                onChange={(e) => onNoteChange(santri.id, e.target.value)}
                                                onFocus={() => setFocusedRowIndex(idx)}
                                                onKeyDown={(e) => handleKeyDown(e, idx, santri)}
                                                placeholder={status === 'S' ? "Sakit apa?" : status === 'I' ? "Izin apa?" : status === 'A' ? "Alasan alpha..." : "Keterangan opsional..."}
                                                className={`w-full border rounded-lg px-2.5 py-1.5 text-xs bg-white focus:outline-none transition-colors ${
                                                    isAbsent && !note 
                                                        ? 'border-red-300 ring-1 ring-red-200 bg-red-50/30' 
                                                        : 'border-gray-200 focus:border-teal-500'
                                                }`}
                                            />
                                            {isAbsent && !note && (
                                                <span className="absolute right-2 top-2 text-[10px] font-bold text-red-500 pointer-events-none animate-pulse">
                                                    Wajib
                                                </span>
                                            )}
                                        </div>
                                    </td>

                                    {/* Quick Actions */}
                                    <td className="p-3 text-center">
                                        <div className="flex items-center justify-center gap-1.5">
                                            {isAbsent ? (
                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={() => onOpenWaSingle(santri.id)}
                                                        title="Kirim Notifikasi WA Wali"
                                                        className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold transition-colors"
                                                    >
                                                        <i className="bi bi-whatsapp"></i>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => onOpenBkModal(santri, `Ketidakhadiran (${getStatusLabel(status)}): ${note || 'Tanpa keterangan'}`)}
                                                        title="Rujuk ke Bimbingan Konseling"
                                                        className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold transition-colors"
                                                    >
                                                        <i className="bi bi-person-exclamation"></i>
                                                    </button>
                                                </>
                                            ) : (
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${getStatusBadgeColor('H')}`}>
                                                    Hadir
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
