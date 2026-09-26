import React, { useState, useEffect } from 'react';
import { Santri, PondokSettings } from '../../types';
import { getSemesterDateRange, syncPresensiFromDb, PresensiSyncResult } from '../../services/raporExcelService';
import { useAppContext } from '../../AppContext';

interface RaporPresensiSyncModalProps {
    isOpen: boolean;
    onClose: () => void;
    santriList: Santri[];
    rombelName: string;
    tahunAjaran: string;
    semester: 'Ganjil' | 'Genap';
    settings?: PondokSettings | null;
    onSyncSuccess: (syncResult: PresensiSyncResult, autoSaveToDb: boolean) => Promise<void>;
}

export const RaporPresensiSyncModal: React.FC<RaporPresensiSyncModalProps> = ({
    isOpen,
    onClose,
    santriList,
    rombelName,
    tahunAjaran,
    semester,
    settings,
    onSyncSuccess
}) => {
    const { showToast } = useAppContext();
    const defaultRange = getSemesterDateRange(tahunAjaran, semester, settings);

    const [startDate, setStartDate] = useState(defaultRange.startDate);
    const [endDate, setEndDate] = useState(defaultRange.endDate);
    const [isScanning, setIsScanning] = useState(false);
    const [isApplying, setIsApplying] = useState(false);
    const [scanResult, setScanResult] = useState<PresensiSyncResult | null>(null);
    const [autoSaveToDb, setAutoSaveToDb] = useState(false);

    useEffect(() => {
        if (isOpen) {
            const range = getSemesterDateRange(tahunAjaran, semester, settings);
            setStartDate(range.startDate);
            setEndDate(range.endDate);
            handleScan(range.startDate, range.endDate);
        }
    }, [isOpen, tahunAjaran, semester]);

    if (!isOpen) return null;

    const handleScan = async (start: string, end: string) => {
        setIsScanning(true);
        try {
            const santriIds = santriList.map(s => s.id);
            const result = await syncPresensiFromDb(santriIds, tahunAjaran, semester, settings, {
                startDate: start,
                endDate: end
            });
            setScanResult(result);
        } catch (err: any) {
            showToast('Gagal memindai log presensi: ' + err.message, 'error');
        } finally {
            setIsScanning(false);
        }
    };

    const handleApply = async () => {
        if (!scanResult) return;
        setIsApplying(true);
        try {
            await onSyncSuccess(scanResult, autoSaveToDb);
            showToast(
                `Presensi berhasil diterapkan untuk ${santriList.length} santri (${scanResult.studentsWithAbsence} santri memiliki catatan absensi).`,
                'success'
            );
            onClose();
        } catch (err: any) {
            showToast('Gagal menerapkan presensi: ' + err.message, 'error');
        } finally {
            setIsApplying(false);
        }
    };

    // List of students with absence > 0
    const studentsWithAbsenceList = santriList
        .filter(s => scanResult?.aggregates[s.id] && scanResult.aggregates[s.id].totalAbsen > 0)
        .map(s => ({
            santri: s,
            agg: scanResult!.aggregates[s.id]
        }));

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="px-6 py-4 bg-gradient-to-r from-teal-700 to-emerald-700 text-white flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-sm">
                            <i className="bi bi-clock-history text-lg text-emerald-200"></i>
                        </div>
                        <div>
                            <h3 className="font-black text-base tracking-tight">Sinkronisasi Presensi Otomatis</h3>
                            <p className="text-xs text-teal-100">
                                {rombelName || 'Rombel'} • Semester {semester} {tahunAjaran}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white"
                        aria-label="Tutup"
                    >
                        <i className="bi bi-x-lg text-sm"></i>
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto space-y-5 flex-1">
                    {/* Period Date Filter */}
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                <i className="bi bi-calendar3 text-teal-600"></i>
                                Rentang Tanggal Semester
                            </span>
                            <span className="text-[11px] text-teal-700 bg-teal-50 px-2 py-0.5 rounded font-bold">
                                {semester} {tahunAjaran}
                            </span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                    Mulai (Dari)
                                </label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={e => {
                                        setStartDate(e.target.value);
                                        handleScan(e.target.value, endDate);
                                    }}
                                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-teal-500"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                    Sampai (Hingga)
                                </label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={e => {
                                        setEndDate(e.target.value);
                                        handleScan(startDate, e.target.value);
                                    }}
                                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-teal-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Stats Summary */}
                    {isScanning ? (
                        <div className="p-6 text-center rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center gap-3">
                            <span className="w-5 h-5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></span>
                            <span className="text-xs font-bold text-slate-600">Memindai database absensi harian...</span>
                        </div>
                    ) : scanResult ? (
                        <div className="space-y-4">
                            <div className="grid grid-cols-3 gap-2.5">
                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                                    <div className="text-[10px] uppercase font-bold text-slate-400">Total Santri</div>
                                    <div className="text-lg font-black text-slate-800">{santriList.length}</div>
                                </div>
                                <div className="p-3 bg-teal-50 rounded-xl border border-teal-200 text-center">
                                    <div className="text-[10px] uppercase font-bold text-teal-600">Log Ditemukan</div>
                                    <div className="text-lg font-black text-teal-700">{scanResult.totalRecordsQueried}</div>
                                </div>
                                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-center">
                                    <div className="text-[10px] uppercase font-bold text-amber-600">Santri Ada Absen</div>
                                    <div className="text-lg font-black text-amber-700">{scanResult.studentsWithAbsence}</div>
                                </div>
                            </div>

                            {/* Details List */}
                            <div className="border border-slate-200 rounded-xl overflow-hidden">
                                <div className="bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 border-b border-slate-200 flex items-center justify-between">
                                    <span>Rincian Ketidakhadiran Terdeteksi:</span>
                                    <span className="text-[11px] font-normal text-slate-500">
                                        {studentsWithAbsenceList.length} santri
                                    </span>
                                </div>
                                <div className="max-h-48 overflow-y-auto divide-y divide-slate-100">
                                    {studentsWithAbsenceList.length === 0 ? (
                                        <div className="p-4 text-center text-xs text-slate-400 italic">
                                            Tidak ada santri yang memiliki catatan Sakit, Izin, atau Alpha pada rentang tanggal ini (semua hadir atau belum ada data).
                                        </div>
                                    ) : (
                                        studentsWithAbsenceList.map(({ santri, agg }) => (
                                            <div key={santri.id} className="p-2.5 px-3.5 flex items-center justify-between text-xs hover:bg-slate-50">
                                                <div>
                                                    <span className="font-bold text-slate-800">{santri.namaLengkap}</span>
                                                    <span className="text-[10px] text-slate-400 font-mono ml-2">{santri.nis}</span>
                                                </div>
                                                <div className="flex items-center gap-2 font-mono text-[11px]">
                                                    <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded" title="Sakit">
                                                        S: <b>{agg.sakit}</b>
                                                    </span>
                                                    <span className="text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded" title="Izin">
                                                        I: <b>{agg.izin}</b>
                                                    </span>
                                                    <span className="text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded" title="Alpha">
                                                        A: <b>{agg.alpha}</b>
                                                    </span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Save to DB checkbox */}
                            <label className="flex items-center gap-2.5 p-3 rounded-xl bg-teal-50/50 border border-teal-100 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={autoSaveToDb}
                                    onChange={e => setAutoSaveToDb(e.target.checked)}
                                    className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500"
                                />
                                <div className="text-xs">
                                    <span className="font-bold text-slate-800">Simpan langsung ke database rapor</span>
                                    <p className="text-slate-500 text-[11px]">
                                        Nilai Sakit, Izin, dan Alpha langsung diperbarui pada catatan rapor santri di database.
                                    </p>
                                </div>
                            </label>
                        </div>
                    ) : null}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isApplying}
                        className="px-4 py-2 bg-white border border-slate-200 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-100 transition-colors"
                    >
                        Batal
                    </button>
                    <button
                        type="button"
                        onClick={handleApply}
                        disabled={!scanResult || isApplying}
                        className="px-5 py-2 bg-teal-600 text-white font-bold text-xs rounded-xl hover:bg-teal-700 shadow-md shadow-teal-600/20 disabled:opacity-40 transition-all flex items-center gap-2"
                    >
                        {isApplying ? (
                            <>
                                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                <span>Menerapkan...</span>
                            </>
                        ) : (
                            <>
                                <i className="bi bi-arrow-repeat text-sm"></i>
                                <span>Terapkan Presensi ke Form</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
