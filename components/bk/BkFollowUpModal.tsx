import React, { useState } from 'react';
import { BkSession, Santri, BkFollowUpLog } from '../../types';
import { useAppContext } from '../../AppContext';
import { db } from '../../db';
import { logActivity } from '../../services/logService';

interface BkFollowUpModalProps {
    isOpen: boolean;
    onClose: () => void;
    session: BkSession;
    santri: Santri;
    onSaved: () => void;
}

export const BkFollowUpModal: React.FC<BkFollowUpModalProps> = ({
    isOpen,
    onClose,
    session,
    santri,
    onSaved,
}) => {
    const { currentUser, showToast } = useAppContext();
    const canWrite = currentUser?.role === 'admin' || currentUser?.permissions?.bk === 'write';

    const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);
    const [catatan, setCatatan] = useState('');
    const [statusSetelahnya, setStatusSetelahnya] = useState<BkSession['status']>(session.status || 'Proses');
    const [tanggalBerikutnya, setTanggalBerikutnya] = useState(session.tanggalBerikutnya || '');
    const [komitmenSantri, setKomitmenSantri] = useState(session.komitmenSantri || '');
    const [isSaving, setIsSaving] = useState(false);

    if (!isOpen) return null;

    const handleAddFollowUp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canWrite) {
            showToast('Anda tidak memiliki hak akses mengubah data BK.', 'error');
            return;
        }

        if (!catatan.trim()) {
            showToast('Harap tulis catatan sesi lanjutan atau perkembangan santri.', 'error');
            return;
        }

        setIsSaving(true);
        try {
            const newLog: BkFollowUpLog = {
                id: `log-${Date.now()}`,
                tanggal,
                catatan: catatan.trim(),
                konselor: currentUser?.fullName || session.konselor || 'Petugas BK',
                statusSetelahnya,
            };

            const updatedLogs = [...(session.followUpLogs || []), newLog];

            const updatedSession: BkSession = {
                ...session,
                status: statusSetelahnya,
                tanggalBerikutnya: tanggalBerikutnya || undefined,
                komitmenSantri: komitmenSantri.trim() || undefined,
                followUpLogs: updatedLogs,
                lastModified: Date.now(),
            };

            await db.bkSessions.put(updatedSession);
            await logActivity('UPDATE', 'bkSessions', session.id, session, updatedSession, currentUser?.username || 'Konselor');
            showToast('Catatan sesi lanjutan berhasil ditambahkan.', 'success');
            setCatatan('');
            onSaved();
            onClose();
        } catch (err) {
            console.error('Failed to update follow-up session', err);
            showToast('Gagal menyimpan catatan lanjutan.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteLog = async (logId: string) => {
        if (!canWrite) return;
        if (!confirm('Hapus catatan sesi lanjutan ini?')) return;

        try {
            const updatedLogs = (session.followUpLogs || []).filter(l => l.id !== logId);
            const updatedSession: BkSession = {
                ...session,
                followUpLogs: updatedLogs,
                lastModified: Date.now(),
            };
            await db.bkSessions.put(updatedSession);
            await logActivity('UPDATE', 'bkSessions', session.id, session, updatedSession, currentUser?.username || 'Konselor');
            showToast('Catatan lanjutan dihapus.', 'success');
            onSaved();
        } catch (err) {
            showToast('Gagal menghapus catatan.', 'error');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[75] flex justify-center items-center p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden my-auto border border-emerald-100">
                {/* Header */}
                <div className="px-6 py-4 bg-gradient-to-r from-emerald-700 via-emerald-800 to-teal-800 text-white flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl shadow-inner">
                            <i className="bi bi-clock-history"></i>
                        </div>
                        <div>
                            <h3 className="text-base font-bold">Timeline Sesi Lanjutan & Pemantauan BK</h3>
                            <p className="text-xs text-emerald-100">
                                {santri.namaLengkap} (NIS: {santri.nis}) &bull; Kasus: <span className="font-semibold text-white">{session.kategori}</span>
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition cursor-pointer"
                    >
                        <i className="bi bi-x-lg text-sm"></i>
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto space-y-6 flex-grow text-xs text-gray-700">
                    {/* Ringkasan Kasus Awal */}
                    <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4 space-y-2">
                        <div className="flex justify-between items-start">
                            <div>
                                <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Sesi Awal (Tercatat: {new Date(session.tanggal).toLocaleDateString('id-ID')})</span>
                                <h4 className="text-sm font-bold text-gray-800 mt-0.5">Keluhan Utama:</h4>
                            </div>
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                Status: {session.status}
                            </span>
                        </div>
                        <p className="text-gray-800 bg-white p-2.5 rounded-lg border border-emerald-100 whitespace-pre-wrap">
                            {session.keluhan}
                        </p>
                        {session.penanganan && (
                            <div>
                                <span className="font-bold text-gray-700">Penanganan Awal:</span>
                                <p className="text-gray-600 italic mt-0.5">{session.penanganan}</p>
                            </div>
                        )}
                        {session.pihakTerlibat && session.pihakTerlibat.length > 0 && (
                            <div className="flex items-center gap-1 flex-wrap pt-1">
                                <span className="font-semibold text-gray-600">Koordinasi:</span>
                                {session.pihakTerlibat.map((p, idx) => (
                                    <span key={idx} className="bg-white text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-medium">
                                        {p}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Timeline Log Catatan Perkembangan */}
                    <div>
                        <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <i className="bi bi-list-check text-emerald-600 text-sm"></i>
                            Riwayat Perkembangan Santri ({session.followUpLogs?.length || 0} Sesi Lanjutan)
                        </h4>

                        {(!session.followUpLogs || session.followUpLogs.length === 0) ? (
                            <div className="text-center py-6 border border-dashed rounded-xl bg-gray-50 text-gray-400">
                                <i className="bi bi-calendar-x text-2xl"></i>
                                <p className="mt-1 text-xs">Belum ada catatan sesi lanjutan. Silakan tambahkan laporan perkembangan di bawah.</p>
                            </div>
                        ) : (
                            <div className="relative pl-6 border-l-2 border-emerald-200 space-y-4">
                                {session.followUpLogs.map((log, index) => (
                                    <div key={log.id} className="relative group">
                                        {/* Dot */}
                                        <div className="absolute -left-[31px] top-1.5 w-3.5 h-3.5 rounded-full bg-emerald-600 border-2 border-white shadow-xs"></div>

                                        <div className="bg-white border border-gray-200 rounded-xl p-3.5 shadow-xs hover:border-emerald-300 transition space-y-1.5">
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-gray-800">
                                                        Sesi Lanjutan #{index + 1} &bull; {new Date(log.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    </span>
                                                    {log.statusSetelahnya && (
                                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                                                            {log.statusSetelahnya}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[11px] text-gray-400">Oleh: {log.konselor}</span>
                                                    {canWrite && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteLog(log.id)}
                                                            className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition p-1 cursor-pointer"
                                                            title="Hapus catatan ini"
                                                        >
                                                            <i className="bi bi-trash"></i>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            <p className="text-gray-700 whitespace-pre-wrap leading-relaxed bg-gray-50/50 p-2 rounded-lg">
                                                {log.catatan}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Form Tambah Sesi Lanjutan */}
                    {canWrite && (
                        <form onSubmit={handleAddFollowUp} className="border-t border-gray-200 pt-4 space-y-4">
                            <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                                <i className="bi bi-plus-circle-fill text-emerald-600"></i>
                                Tambah Catatan Sesi / Perkembangan Baru
                            </h4>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-700 mb-1">Tanggal Sesi</label>
                                    <input
                                        type="date"
                                        value={tanggal}
                                        onChange={e => setTanggal(e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg p-2 text-xs bg-white focus:ring-2 focus:ring-emerald-500 outline-hidden"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-700 mb-1">Perbarui Status Kasus</label>
                                    <select
                                        value={statusSetelahnya}
                                        onChange={e => setStatusSetelahnya(e.target.value as BkSession['status'])}
                                        className="w-full border border-gray-300 rounded-lg p-2 text-xs bg-white focus:ring-2 focus:ring-emerald-500 font-semibold outline-hidden"
                                    >
                                        <option value="Proses">Sedang Diproses (Masih berlanjut)</option>
                                        <option value="Pemantauan">Dalam Pemantauan (Perilaku membaik)</option>
                                        <option value="Selesai">Selesai / Ditutup (Tuntas)</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                                    Catatan Perkembangan & Nasihat Sesi Ini <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    rows={3}
                                    value={catatan}
                                    onChange={e => setCatatan(e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-emerald-500 outline-hidden"
                                    placeholder="Tuliskan perkembangan sikap santri, hasil pembinaan terbaru, evaluasi kesepakatan, atau arahan tambahan..."
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-700 mb-1">
                                        <i className="bi bi-calendar-event mr-1 text-emerald-600"></i>
                                        Jadwal Kontrol Berikutnya (Opsional)
                                    </label>
                                    <input
                                        type="date"
                                        value={tanggalBerikutnya}
                                        onChange={e => setTanggalBerikutnya(e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg p-2 text-xs bg-white focus:ring-2 focus:ring-emerald-500 outline-hidden"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-700 mb-1">
                                        <i className="bi bi-pen mr-1 text-emerald-600"></i>
                                        Pembaruan Komitmen / Janji Santri (Opsional)
                                    </label>
                                    <input
                                        type="text"
                                        value={komitmenSantri}
                                        onChange={e => setKomitmenSantri(e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg p-2 text-xs bg-white focus:ring-2 focus:ring-emerald-500 outline-hidden"
                                        placeholder="Contoh: Berjanji hadir sholat subuh tepat waktu..."
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-2 border border-gray-300 rounded-xl text-gray-600 bg-white hover:bg-gray-100 text-xs font-semibold cursor-pointer"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer transition"
                                >
                                    <i className="bi bi-check-lg"></i>
                                    {isSaving ? 'Menyimpan...' : 'Simpan Sesi Lanjutan'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};
