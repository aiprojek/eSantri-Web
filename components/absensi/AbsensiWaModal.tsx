import React, { useState, useMemo } from 'react';
import { Santri } from '../../types';
import { WA_TEMPLATES, formatWAMessage, sendManualWA } from '../../services/waService';
import { useAppContext } from '../../AppContext';

export interface AbsentStudentItem {
    santri: Santri;
    status: 'S' | 'I' | 'A';
    keterangan: string;
}

interface AbsensiWaModalProps {
    isOpen: boolean;
    onClose: () => void;
    absentStudents: AbsentStudentItem[];
    initialSantriId?: number | null;
    tanggal: string;
    sesi: string;
    rombelName: string;
}

export const AbsensiWaModal: React.FC<AbsensiWaModalProps> = ({
    isOpen,
    onClose,
    absentStudents,
    initialSantriId,
    tanggal,
    sesi,
    rombelName
}) => {
    const { showToast } = useAppContext();

    // Mode: 'single' (focused on one student) or 'blast' (all absent students)
    const [mode, setMode] = useState<'single' | 'blast'>(initialSantriId ? 'single' : 'blast');
    const [selectedStudentId, setSelectedStudentId] = useState<number>(
        initialSantriId || (absentStudents[0]?.santri.id ?? 0)
    );

    // Blast selection
    const [selectedBlastIds, setSelectedBlastIds] = useState<number[]>(
        absentStudents.map(item => item.santri.id)
    );
    const [blastIndex, setBlastIndex] = useState<number>(0);

    // Custom message edit
    const [customTemplateText, setCustomTemplateText] = useState<string>('');

    // Phone target priority: 'auto' | 'ayah' | 'ibu' | 'wali'
    const [phoneTarget, setPhoneTarget] = useState<'auto' | 'ayah' | 'ibu' | 'wali'>('auto');

    const activeSingleStudent = useMemo(() => {
        return absentStudents.find(item => item.santri.id === selectedStudentId) || absentStudents[0];
    }, [absentStudents, selectedStudentId]);

    const getSantriPhone = (santri: Santri, target: 'auto' | 'ayah' | 'ibu' | 'wali' = 'auto'): { phone: string; label: string } => {
        if (target === 'ayah' && santri.teleponAyah) return { phone: santri.teleponAyah, label: 'Ayah' };
        if (target === 'ibu' && santri.teleponIbu) return { phone: santri.teleponIbu, label: 'Ibu' };
        if (target === 'wali' && santri.teleponWali) return { phone: santri.teleponWali, label: 'Wali' };

        // Auto fallback
        if (santri.teleponAyah) return { phone: santri.teleponAyah, label: 'Ayah' };
        if (santri.teleponIbu) return { phone: santri.teleponIbu, label: 'Ibu' };
        if (santri.teleponWali) return { phone: santri.teleponWali, label: 'Wali' };
        return { phone: '', label: 'Tidak Ada Nomor' };
    };

    const getFormattedMessage = (item: AbsentStudentItem) => {
        const statusLabel = item.status === 'S' ? 'Sakit' : item.status === 'I' ? 'Izin' : 'Alpha (Tanpa Keterangan)';
        
        let template = customTemplateText;
        if (!template) {
            if (item.status === 'A') template = WA_TEMPLATES.ABSENSI_ALPHA;
            else if (item.status === 'S') template = WA_TEMPLATES.ABSENSI_SAKIT;
            else template = WA_TEMPLATES.ABSENSI_IZIN;
        }

        return formatWAMessage(template, {
            nama_santri: item.santri.namaLengkap,
            status: statusLabel,
            keterangan: item.keterangan || '-',
            tanggal: tanggal,
            sesi: sesi,
            rombel: rombelName,
            ortu: item.santri.namaAyah || item.santri.namaIbu || 'Wali Santri'
        });
    };

    const handleSendSingle = () => {
        if (!activeSingleStudent) return;
        const { phone } = getSantriPhone(activeSingleStudent.santri, phoneTarget);
        if (!phone) {
            showToast(`Nomor WhatsApp wali untuk ${activeSingleStudent.santri.namaLengkap} tidak ditemukan.`, 'error');
            return;
        }
        const message = getFormattedMessage(activeSingleStudent);
        sendManualWA(phone, message);
        showToast(`Membuka WhatsApp untuk ${activeSingleStudent.santri.namaLengkap}...`, 'success');
    };

    const handleSendBlastCurrent = () => {
        const selectedItems = absentStudents.filter(s => selectedBlastIds.includes(s.santri.id));
        if (blastIndex >= selectedItems.length) {
            showToast('Semua pesan absensi telah dikirim!', 'success');
            return;
        }
        const currentItem = selectedItems[blastIndex];
        const { phone } = getSantriPhone(currentItem.santri, phoneTarget);
        if (!phone) {
            showToast(`Nomor WhatsApp untuk ${currentItem.santri.namaLengkap} kosong. Melewati...`, 'error');
            setBlastIndex(prev => prev + 1);
            return;
        }
        const message = getFormattedMessage(currentItem);
        sendManualWA(phone, message);
        setBlastIndex(prev => prev + 1);
    };

    const toggleSelectBlast = (id: number) => {
        setSelectedBlastIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[70] flex justify-center items-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden border border-emerald-100">
                {/* Modal Header */}
                <div className="px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl shadow-inner">
                            <i className="bi bi-whatsapp"></i>
                        </div>
                        <div>
                            <h3 className="text-base font-bold">Kirim Notifikasi WhatsApp Kehadiran</h3>
                            <p className="text-xs text-emerald-100">{rombelName} &bull; {sesi} &bull; {tanggal}</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white"
                    >
                        <i className="bi bi-x-lg text-sm"></i>
                    </button>
                </div>

                {/* Sub Tab: Single vs Blast */}
                <div className="flex border-b bg-gray-50/80 px-6 pt-3 shrink-0 gap-2">
                    <button
                        onClick={() => setMode('single')}
                        className={`pb-2.5 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
                            mode === 'single'
                                ? 'border-emerald-600 text-emerald-700 bg-white rounded-t-lg shadow-2xs'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        <i className="bi bi-person-fill"></i> Kirim Perorangan
                    </button>
                    <button
                        onClick={() => { setMode('blast'); setBlastIndex(0); }}
                        className={`pb-2.5 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
                            mode === 'blast'
                                ? 'border-emerald-600 text-emerald-700 bg-white rounded-t-lg shadow-2xs'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        <i className="bi bi-broadcast"></i> Kirim Massal ({absentStudents.length} Santri Tidak Hadir)
                    </button>
                </div>

                {/* Modal Content */}
                <div className="p-6 overflow-y-auto space-y-4 flex-grow text-gray-700 text-sm">
                    {absentStudents.length === 0 ? (
                        <div className="text-center py-8 text-gray-400">
                            <i className="bi bi-check-circle-fill text-4xl text-green-500 block mb-2"></i>
                            <p className="font-bold text-gray-700">Semua Santri Hadir</p>
                            <p className="text-xs">Tidak ada santri yang berstatus Sakit, Izin, atau Alpha.</p>
                        </div>
                    ) : mode === 'single' ? (
                        /* --- SINGLE MODE --- */
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">
                                    Pilih Santri yang Dituju:
                                </label>
                                <select
                                    value={selectedStudentId}
                                    onChange={(e) => setSelectedStudentId(Number(e.target.value))}
                                    className="w-full border rounded-xl p-2.5 text-sm bg-white font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                                >
                                    {absentStudents.map(item => {
                                        const { phone, label } = getSantriPhone(item.santri, phoneTarget);
                                        return (
                                            <option key={item.santri.id} value={item.santri.id}>
                                                {item.santri.namaLengkap} ({item.status === 'S' ? 'Sakit' : item.status === 'I' ? 'Izin' : 'Alpha'}) - WA: {phone || 'Kosong'} ({label})
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>

                            {activeSingleStudent && (
                                <>
                                    {/* Phone target picker */}
                                    <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-emerald-900">Tujuan Nomor:</span>
                                            <div className="flex items-center gap-1">
                                                {(['auto', 'ayah', 'ibu', 'wali'] as const).map(target => (
                                                    <button
                                                        key={target}
                                                        type="button"
                                                        onClick={() => setPhoneTarget(target)}
                                                        className={`px-2.5 py-1 rounded-md font-bold uppercase text-[10px] transition-colors ${
                                                            phoneTarget === target
                                                                ? 'bg-emerald-600 text-white shadow-xs'
                                                                : 'bg-white text-gray-600 border border-emerald-200 hover:bg-emerald-100'
                                                        }`}
                                                    >
                                                        {target === 'auto' ? 'Otomatis' : target}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="font-mono text-emerald-800 font-bold">
                                            {getSantriPhone(activeSingleStudent.santri, phoneTarget).phone || (
                                                <span className="text-red-500 font-sans">Belum ada nomor</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Preview Message */}
                                    <div>
                                        <div className="flex justify-between items-center mb-1">
                                            <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                                                Pratinjau Pesan:
                                            </label>
                                            <span className="text-[10px] text-gray-400">Siap dikirim via WhatsApp</span>
                                        </div>
                                        <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl font-mono text-xs whitespace-pre-wrap text-gray-800 leading-relaxed max-h-40 overflow-y-auto">
                                            {getFormattedMessage(activeSingleStudent)}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    ) : (
                        /* --- BLAST MODE --- */
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                                    Daftar Santri untuk Dikirim ({selectedBlastIds.length} terpilih):
                                </span>
                                <div className="space-x-2">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedBlastIds(absentStudents.map(s => s.santri.id))}
                                        className="text-xs text-emerald-600 hover:underline font-medium"
                                    >
                                        Pilih Semua
                                    </button>
                                    <span className="text-gray-300">|</span>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedBlastIds([])}
                                        className="text-xs text-gray-500 hover:underline font-medium"
                                    >
                                        Batal Semua
                                    </button>
                                </div>
                            </div>

                            <div className="max-h-52 overflow-y-auto border border-gray-200 rounded-xl divide-y bg-white">
                                {absentStudents.map((item, idx) => {
                                    const { phone, label } = getSantriPhone(item.santri, phoneTarget);
                                    const isChecked = selectedBlastIds.includes(item.santri.id);
                                    const isProcessed = idx < blastIndex;

                                    return (
                                        <label
                                            key={item.santri.id}
                                            className={`p-3 flex items-center justify-between gap-3 text-xs hover:bg-gray-50 cursor-pointer ${
                                                isProcessed ? 'bg-emerald-50/40 text-gray-400' : ''
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={() => toggleSelectBlast(item.santri.id)}
                                                    className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                                                />
                                                <div>
                                                    <div className="font-bold text-gray-800 flex items-center gap-2">
                                                        {item.santri.namaLengkap}
                                                        <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                                            item.status === 'S' ? 'bg-yellow-100 text-yellow-800' :
                                                            item.status === 'I' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
                                                        }`}>
                                                            {item.status === 'S' ? 'Sakit' : item.status === 'I' ? 'Izin' : 'Alpha'}
                                                        </span>
                                                        {item.keterangan && <span className="text-gray-500 text-[11px]">({item.keterangan})</span>}
                                                    </div>
                                                    <div className="text-[11px] text-gray-500">
                                                        {phone ? `No. WA: ${phone} (${label})` : <span className="text-red-500 font-bold">Tidak ada nomor</span>}
                                                    </div>
                                                </div>
                                            </div>
                                            {isProcessed && (
                                                <span className="text-emerald-600 font-bold text-[10px] flex items-center gap-1 bg-emerald-100 px-2 py-0.5 rounded-full">
                                                    <i className="bi bi-check2"></i> Terkirim
                                                </span>
                                            )}
                                        </label>
                                    );
                                })}
                            </div>

                            {/* Progress bar in blast */}
                            {selectedBlastIds.length > 0 && (
                                <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                                    <div className="flex justify-between text-xs font-bold text-emerald-900 mb-1.5">
                                        <span>Progres Pengiriman:</span>
                                        <span>{blastIndex} dari {selectedBlastIds.length} Santri</span>
                                    </div>
                                    <div className="w-full bg-emerald-200 rounded-full h-2 overflow-hidden">
                                        <div 
                                            className="bg-emerald-600 h-2 transition-all duration-300 rounded-full"
                                            style={{ width: `${selectedBlastIds.length ? (blastIndex / selectedBlastIds.length) * 100 : 0}%` }}
                                        ></div>
                                    </div>
                                    <p className="text-[11px] text-emerald-700 mt-2">
                                        *Sistem akan membuka obrolan WhatsApp satu per satu untuk memastikan pengiriman aman dan tidak terblokir.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Modal Footer */}
                <div className="p-4 bg-gray-50 border-t flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-xl transition-colors"
                    >
                        Tutup
                    </button>

                    {absentStudents.length > 0 && (
                        mode === 'single' ? (
                            <button
                                type="button"
                                onClick={handleSendSingle}
                                className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
                            >
                                <i className="bi bi-whatsapp"></i> Buka WhatsApp & Kirim Pesan
                            </button>
                        ) : (
                            <div className="flex gap-2 w-full sm:w-auto">
                                {blastIndex > 0 && blastIndex < selectedBlastIds.length && (
                                    <button
                                        type="button"
                                        onClick={() => setBlastIndex(0)}
                                        className="px-3 py-2.5 text-xs font-bold text-gray-500 hover:bg-gray-200 rounded-xl"
                                    >
                                        Ulang dari Awal
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={handleSendBlastCurrent}
                                    disabled={selectedBlastIds.length === 0 || blastIndex >= selectedBlastIds.length}
                                    className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-md flex items-center justify-center gap-2 transition-all"
                                >
                                    <i className="bi bi-send-fill"></i>
                                    {blastIndex >= selectedBlastIds.length 
                                        ? 'Pengiriman Selesai' 
                                        : `Kirim Pesan ke-${blastIndex + 1} (${selectedBlastIds.length - blastIndex} Tersisa)`}
                                </button>
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    );
};
