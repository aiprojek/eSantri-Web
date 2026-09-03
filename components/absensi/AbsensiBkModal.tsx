import React, { useState, useEffect } from 'react';
import { Santri, BkSession } from '../../types';
import { db } from '../../db';
import { useAppContext } from '../../AppContext';
import { logActivity } from '../../services/logService';

interface AbsensiBkModalProps {
    isOpen: boolean;
    onClose: () => void;
    santri: Santri | null;
    alasanRujukan?: string;
}

export const AbsensiBkModal: React.FC<AbsensiBkModalProps> = ({
    isOpen,
    onClose,
    santri,
    alasanRujukan
}) => {
    const { currentUser, showToast } = useAppContext();

    const [tanggal, setTanggal] = useState<string>(new Date().toISOString().split('T')[0]);
    const [kategori, setKategori] = useState<BkSession['kategori']>('Belajar');
    const [keluhan, setKeluhan] = useState<string>('');
    const [penanganan, setPenanganan] = useState<string>('Panggilan santri untuk klarifikasi & pembinaan terkait ketidakhadiran.');
    const [privasi, setPrivasi] = useState<BkSession['privasi']>('Biasa');
    const [konselor, setKonselor] = useState<string>(currentUser?.fullName || 'Wali Kelas / Guru');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen && santri) {
            setTanggal(new Date().toISOString().split('T')[0]);
            setKategori('Belajar');
            setKeluhan(alasanRujukan || `Rujukan Absensi: Santri ${santri.namaLengkap} (NIS: ${santri.nis}) mengalami kendala absensi berulang.`);
            setPenanganan('Panggilan santri untuk klarifikasi & pembinaan terkait ketidakhadiran.');
            setPrivasi('Biasa');
            setKonselor(currentUser?.fullName || 'Wali Kelas / Guru');
        }
    }, [isOpen, santri, alasanRujukan, currentUser]);

    if (!isOpen || !santri) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!keluhan.trim()) {
            showToast('Harap isi keluhan / alasan rujukan.', 'error');
            return;
        }

        setIsSaving(true);
        try {
            const newSession: BkSession = {
                id: Date.now(),
                santriId: santri.id,
                tanggal,
                kategori,
                keluhan,
                penanganan,
                status: 'Baru',
                privasi,
                konselor,
                lastModified: Date.now()
            };

            await db.bkSessions.put(newSession);
            await logActivity('INSERT', 'bkSessions', newSession.id, null, newSession);
            showToast(`Berhasil merujuk ${santri.namaLengkap} ke Bimbingan Konseling (BK).`, 'success');
            onClose();
        } catch (error) {
            showToast('Gagal menyimpan sesi rujukan BK.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[75] flex justify-center items-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-indigo-100 animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-6 py-4 bg-gradient-to-r from-indigo-700 to-purple-800 text-white flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl shadow-inner">
                            <i className="bi bi-person-exclamation"></i>
                        </div>
                        <div>
                            <h3 className="text-base font-bold">Rujuk ke Bimbingan Konseling (BK)</h3>
                            <p className="text-xs text-indigo-200">Santri: {santri.namaLengkap} ({santri.nis})</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white"
                    >
                        <i className="bi bi-x-lg text-sm"></i>
                    </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block font-bold text-gray-700 mb-1">Tanggal Rujukan</label>
                            <input
                                type="date"
                                value={tanggal}
                                onChange={(e) => setTanggal(e.target.value)}
                                className="w-full border rounded-xl p-2.5 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-xs"
                                required
                            />
                        </div>
                        <div>
                            <label className="block font-bold text-gray-700 mb-1">Kategori Masalah</label>
                            <select
                                value={kategori}
                                onChange={(e) => setKategori(e.target.value as BkSession['kategori'])}
                                className="w-full border rounded-xl p-2.5 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-xs font-medium"
                            >
                                <option value="Belajar">Akademik / Belajar</option>
                                <option value="Ibadah">Kedisiplinan / Ibadah</option>
                                <option value="Pribadi">Pribadi / Perilaku</option>
                                <option value="Keluarga">Keluarga / Tempat Tinggal</option>
                                <option value="Sosial">Sosial / Teman Sebaya</option>
                                <option value="Lainnya">Lainnya</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block font-bold text-gray-700 mb-1">Alasan Rujukan / Catatan Pelanggaran Absensi</label>
                        <textarea
                            rows={3}
                            value={keluhan}
                            onChange={(e) => setKeluhan(e.target.value)}
                            placeholder="Tuliskan latar belakang masalah ketidakhadiran santri..."
                            className="w-full border rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none text-xs leading-relaxed"
                            required
                        />
                    </div>

                    <div>
                        <label className="block font-bold text-gray-700 mb-1">Rencana Tindak Lanjut / Penanganan</label>
                        <textarea
                            rows={2}
                            value={penanganan}
                            onChange={(e) => setPenanganan(e.target.value)}
                            placeholder="Contoh: Pemanggilan santri dan komunikasi dengan wali..."
                            className="w-full border rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none text-xs leading-relaxed"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block font-bold text-gray-700 mb-1">Tingkat Kerahasiaan</label>
                            <select
                                value={privasi}
                                onChange={(e) => setPrivasi(e.target.value as BkSession['privasi'])}
                                className="w-full border rounded-xl p-2.5 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-xs font-medium"
                            >
                                <option value="Biasa">Biasa (Wali Kelas & Guru)</option>
                                <option value="Rahasia">Rahasia (Hanya Konselor & Mudir)</option>
                                <option value="Sangat Rahasia">Sangat Rahasia</option>
                            </select>
                        </div>
                        <div>
                            <label className="block font-bold text-gray-700 mb-1">Perujuk / Konselor</label>
                            <input
                                type="text"
                                value={konselor}
                                onChange={(e) => setKonselor(e.target.value)}
                                className="w-full border rounded-xl p-2.5 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-xs"
                                required
                            />
                        </div>
                    </div>

                    {/* Footer Buttons */}
                    <div className="pt-3 border-t flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="px-5 py-2.5 bg-indigo-700 hover:bg-indigo-800 text-white font-bold rounded-xl shadow-md flex items-center gap-2 transition-all disabled:opacity-50"
                        >
                            {isSaving ? (
                                <span className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent"></span>
                            ) : (
                                <i className="bi bi-check2-circle"></i>
                            )}
                            Simpan Rujukan ke BK
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
