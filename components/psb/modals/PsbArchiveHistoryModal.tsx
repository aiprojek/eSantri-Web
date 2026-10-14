import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { PsbArchiveRecord, PondokSettings, PsbConfig } from '../../../types';
import { getPsbArchives, savePsbArchive, deletePsbArchive } from '../utils/psbArchiveService';
import { useAppContext } from '../../../AppContext';

interface PsbArchiveHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    settings: PondokSettings;
    config: PsbConfig;
    onArchivesUpdated?: () => void;
}

export const PsbArchiveHistoryModal: React.FC<PsbArchiveHistoryModalProps> = ({
    isOpen,
    onClose,
    settings,
    config,
    onArchivesUpdated
}) => {
    const { showToast, arsipSuratList = [] } = useAppContext();
    const [archives, setArchives] = useState<PsbArchiveRecord[]>([]);
    const [selectedType, setSelectedType] = useState<'all' | 'pengumuman-sk' | 'laporan-rekapitulasi'>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedArchive, setSelectedArchive] = useState<PsbArchiveRecord | null>(null);
    const [isAddManualOpen, setIsAddManualOpen] = useState(false);

    // Form manual snapshot state
    const curYear = new Date().getFullYear();
    const [manualYear, setManualYear] = useState(`${curYear - 1}/${curYear}`);
    const [manualType, setManualType] = useState<'laporan-rekapitulasi' | 'pengumuman-sk'>('laporan-rekapitulasi');
    const [manualNomorSurat, setManualNomorSurat] = useState(`084/SK-PSB/PST/VII/${curYear - 1}`);
    const [manualTotal, setManualTotal] = useState<number>(140);
    const [manualDiterima, setManualDiterima] = useState<number>(115);
    const [manualCadangan, setManualCadangan] = useState<number>(15);
    const [manualDitolak, setManualDitolak] = useState<number>(10);
    const [manualCatatan, setManualCatatan] = useState('Data arsip manual tahun ajaran sebelumnya.');

    const loadData = () => {
        const data = getPsbArchives();
        setArchives(data);
    };

    useEffect(() => {
        if (isOpen) {
            loadData();
        }
    }, [isOpen]);

    const filteredArchives = useMemo(() => {
        return archives.filter(item => {
            const matchType = selectedType === 'all' || item.type === selectedType;
            const matchSearch = item.tahunAjaran.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (item.nomorSurat && item.nomorSurat.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (item.catatan && item.catatan.toLowerCase().includes(searchTerm.toLowerCase()));
            return matchType && matchSearch;
        });
    }, [archives, selectedType, searchTerm]);

    const handleDelete = (id: string, label: string) => {
        if (window.confirm(`Yakin ingin menghapus arsip ${label}? Tindakan ini tidak dapat dibatalkan.`)) {
            deletePsbArchive(id);
            loadData();
            if (selectedArchive?.id === id) {
                setSelectedArchive(null);
            }
            if (onArchivesUpdated) onArchivesUpdated();
            showToast('Arsip berhasil dihapus.', 'info');
        }
    };

    const handleSaveManualSnapshot = (e: React.FormEvent) => {
        e.preventDefault();
        if (!manualYear.trim()) {
            showToast('Tahun Ajaran wajib diisi.', 'error');
            return;
        }

        const id = `psb-arch-manual-${manualYear.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now().toString().slice(-4)}`;
        const sampleJenjangSummary = settings.jenjang.map((j, idx) => {
            const count = Math.round(manualTotal / (settings.jenjang.length || 1));
            return {
                id: j.id,
                name: j.nama,
                count: count,
                l: Math.round(count * 0.52),
                p: Math.round(count * 0.48)
            };
        });

        const newRecord: PsbArchiveRecord = {
            id,
            type: manualType,
            tahunAjaran: manualYear.trim(),
            nomorSurat: manualNomorSurat.trim() || undefined,
            tanggalArsip: new Date().toISOString().split('T')[0],
            totalPendaftar: Number(manualTotal) || 0,
            diterima: Number(manualDiterima) || 0,
            cadangan: Number(manualCadangan) || 0,
            ditolak: Number(manualDitolak) || 0,
            summaryByJenjang: sampleJenjangSummary,
            catatan: manualCatatan.trim() || 'Arsip data historis manual.',
            adminName: config.namaAdminPsb || 'Panitia PSB',
            pimpinanName: config.namaPimpinanPsb || 'Pimpinan Pondok'
        };

        savePsbArchive(newRecord);
        loadData();
        setIsAddManualOpen(false);
        if (onArchivesUpdated) onArchivesUpdated();
        showToast('Snapshot arsip historis berhasil ditambahkan.', 'success');
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-[90] flex justify-center items-center p-2 sm:p-4 overflow-y-auto">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[92vh] overflow-hidden border border-slate-200 dark:border-slate-800 animate-fadeIn">
                
                {/* Header */}
                <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-900 text-white shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400 shrink-0">
                            <i className="bi bi-archive-fill text-xl"></i>
                        </div>
                        <div>
                            <h3 className="text-base sm:text-lg font-bold leading-tight">Arsip & Dokumen Historis PSB</h3>
                            <p className="text-xs text-slate-400">Rekam surat pengumuman & laporan rekapitulasi untuk tolok ukur perbandingan antar tahun</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setIsAddManualOpen(true)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-all shadow-sm active:scale-95"
                            title="Tambahkan data arsip tahun-tahun lalu secara manual untuk tolok ukur grafik perbandingan"
                        >
                            <i className="bi bi-plus-circle text-xs"></i>
                            <span className="hidden sm:inline">+ Tambah Data Lalu</span>
                            <span className="sm:hidden">+ Data Lalu</span>
                        </button>
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                            title="Tutup Modal"
                        >
                            <i className="bi bi-x-lg text-base"></i>
                        </button>
                    </div>
                </div>

                {/* Sub Toolbar Filter */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700/80 flex flex-wrap items-center justify-between gap-2.5 text-xs shrink-0">
                    <div className="flex items-center gap-1 bg-slate-200/80 dark:bg-slate-700/80 p-1 rounded-xl">
                        <button
                            onClick={() => setSelectedType('all')}
                            className={`px-3 py-1 rounded-lg font-bold transition-all text-xs ${
                                selectedType === 'all'
                                    ? 'bg-white dark:bg-slate-900 text-teal-900 dark:text-teal-400 shadow-xs'
                                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                            }`}
                        >
                            Semua ({archives.length})
                        </button>
                        <button
                            onClick={() => setSelectedType('pengumuman-sk')}
                            className={`px-3 py-1 rounded-lg font-bold transition-all text-xs ${
                                selectedType === 'pengumuman-sk'
                                    ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-xs'
                                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                            }`}
                        >
                            SK Pengumuman ({archives.filter(a => a.type === 'pengumuman-sk').length})
                        </button>
                        <button
                            onClick={() => setSelectedType('laporan-rekapitulasi')}
                            className={`px-3 py-1 rounded-lg font-bold transition-all text-xs ${
                                selectedType === 'laporan-rekapitulasi'
                                    ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs'
                                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                            }`}
                        >
                            Laporan Rekapitulasi ({archives.filter(a => a.type === 'laporan-rekapitulasi').length})
                        </button>
                    </div>

                    <div className="relative w-full sm:w-64">
                        <i className="bi bi-search absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Cari tahun ajaran, no surat..."
                            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-teal-500"
                        />
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar">
                    {filteredArchives.length === 0 ? (
                        <div className="text-center py-12 px-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
                            <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 flex items-center justify-center mx-auto mb-3 text-2xl">
                                <i className="bi bi-folder2-open"></i>
                            </div>
                            <h4 className="text-base font-bold text-slate-800 dark:text-slate-200">Belum Ada Dokumen Arsip</h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
                                Setiap kali Anda mengekspor atau mencetak Pengumuman PSB atau Laporan Rekapitulasi, sistem dapat otomatis menyimpannya ke arsip ini.
                            </p>
                            <button
                                onClick={() => setIsAddManualOpen(true)}
                                className="mt-4 px-4 py-2 bg-teal-600 text-white rounded-xl text-xs font-bold hover:bg-teal-700 transition"
                            >
                                + Masukkan Data Pembanding Lalu
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {filteredArchives.map((item) => {
                                const isPengumuman = item.type === 'pengumuman-sk';
                                const matchSuratAgenda = item.nomorSurat ? arsipSuratList.some(a => a.nomorSurat === item.nomorSurat) : false;

                                return (
                                    <div
                                        key={item.id}
                                        className="bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                                    >
                                        <div>
                                            <div className="flex items-start justify-between gap-2 mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold ${
                                                        isPengumuman
                                                            ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                                                            : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                                    }`}>
                                                        <i className={`bi ${isPengumuman ? 'bi-file-earmark-text' : 'bi-file-earmark-bar-graph'}`}></i>
                                                        <span>{isPengumuman ? 'SK Pengumuman' : 'Laporan Rekap'}</span>
                                                    </span>
                                                    {matchSuratAgenda && (
                                                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg text-[9px] font-bold bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-700" title="Tercatat di Agenda Surat Keluar TU">
                                                            <i className="bi bi-check2-circle"></i>
                                                            <span>Agenda TU</span>
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="text-[11px] font-mono text-slate-400">
                                                    {item.tanggalArsip}
                                                </span>
                                            </div>

                                            <h4 className="text-base font-black text-slate-900 dark:text-white">
                                                Tahun Ajaran {item.tahunAjaran}
                                            </h4>

                                            {item.nomorSurat && (
                                                <p className="text-xs font-mono font-bold text-teal-700 dark:text-teal-400 mt-0.5">
                                                    No: {item.nomorSurat}
                                                </p>
                                            )}

                                            <div className="grid grid-cols-4 gap-1.5 my-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 text-center">
                                                <div>
                                                    <span className="block text-[10px] text-slate-400 font-semibold uppercase">Total</span>
                                                    <span className="text-sm font-black text-slate-800 dark:text-slate-100">{item.totalPendaftar}</span>
                                                </div>
                                                <div>
                                                    <span className="block text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold uppercase">Lolos</span>
                                                    <span className="text-sm font-black text-emerald-700 dark:text-emerald-400">{item.diterima}</span>
                                                </div>
                                                <div>
                                                    <span className="block text-[10px] text-amber-600 dark:text-amber-400 font-semibold uppercase">Cadangan</span>
                                                    <span className="text-sm font-black text-amber-700 dark:text-amber-400">{item.cadangan}</span>
                                                </div>
                                                <div>
                                                    <span className="block text-[10px] text-rose-600 dark:text-rose-400 font-semibold uppercase">Ditolak</span>
                                                    <span className="text-sm font-black text-rose-700 dark:text-rose-400">{item.ditolak}</span>
                                                </div>
                                            </div>

                                            {item.summaryByJenjang && item.summaryByJenjang.length > 0 && (
                                                <div className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                                                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Distribusi Jenjang: </span>
                                                    {item.summaryByJenjang.map(j => `${j.name} (${j.count})`).join(', ')}
                                                </div>
                                            )}

                                            {item.catatan && (
                                                <p className="text-[11px] text-slate-500 dark:text-slate-400 italic bg-amber-50/50 dark:bg-slate-900/30 p-2 rounded-lg border border-amber-100/60 dark:border-slate-800">
                                                    "{item.catatan}"
                                                </p>
                                            )}
                                        </div>

                                        <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 dark:border-slate-700/60 text-xs">
                                            <div className="text-[10px] text-slate-400">
                                                Penandatangan: <span className="font-semibold text-slate-600 dark:text-slate-300">{item.adminName || 'Admin'}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <button
                                                    onClick={() => handleDelete(item.id, `TA ${item.tahunAjaran}`)}
                                                    className="px-2 py-1 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg font-semibold text-[11px] transition"
                                                    title="Hapus Arsip"
                                                >
                                                    <i className="bi bi-trash mr-1"></i>Hapus
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer Modal */}
                <div className="p-3 sm:p-4 bg-slate-100 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center text-xs shrink-0">
                    <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                        Total {archives.length} Dokumen Diarsipkan • Digunakan otomatis pada Grafik Tren Dashboard
                    </span>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-bold rounded-xl transition"
                    >
                        Tutup
                    </button>
                </div>
            </div>

            {/* Sub-modal: Tambah Arsip Historis Manual */}
            {isAddManualOpen && (
                <div className="fixed inset-0 bg-black/60 z-[95] flex items-center justify-center p-3 animate-fadeIn">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md border border-slate-200 dark:border-slate-800 overflow-hidden">
                        <div className="p-4 bg-teal-800 text-white flex justify-between items-center">
                            <h4 className="font-bold text-sm flex items-center gap-2">
                                <i className="bi bi-journal-plus"></i> Tambah Snapshot Data Lalu
                            </h4>
                            <button
                                onClick={() => setIsAddManualOpen(false)}
                                className="text-teal-200 hover:text-white"
                            >
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>
                        <form onSubmit={handleSaveManualSnapshot} className="p-4 space-y-3 text-xs">
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                Masukkan ringkasan pendaftaran santri baru tahun-tahun sebelumnya untuk dijadikan tolok ukur pertumbuhan di Dashboard PSB.
                            </p>
                            <div>
                                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Tahun Ajaran Pembanding *</label>
                                <input
                                    type="text"
                                    value={manualYear}
                                    onChange={e => setManualYear(e.target.value)}
                                    placeholder="Contoh: 2024/2025"
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 outline-none font-bold"
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Jenis Dokumen</label>
                                    <select
                                        value={manualType}
                                        onChange={e => setManualType(e.target.value as any)}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1.5 outline-none"
                                    >
                                        <option value="laporan-rekapitulasi">Laporan Rekapitulasi</option>
                                        <option value="pengumuman-sk">SK Pengumuman</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Nomor Surat SK (Opsional)</label>
                                    <input
                                        type="text"
                                        value={manualNomorSurat}
                                        onChange={e => setManualNomorSurat(e.target.value)}
                                        placeholder="084/SK-PSB/..."
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 outline-none font-mono text-[11px]"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                                <div>
                                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Total</label>
                                    <input
                                        type="number"
                                        value={manualTotal}
                                        onChange={e => setManualTotal(parseInt(e.target.value) || 0)}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1.5 text-center font-bold"
                                        min={0}
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold text-emerald-600 mb-1">Diterima</label>
                                    <input
                                        type="number"
                                        value={manualDiterima}
                                        onChange={e => setManualDiterima(parseInt(e.target.value) || 0)}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 rounded-lg px-2 py-1.5 text-center font-bold text-emerald-700"
                                        min={0}
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold text-amber-600 mb-1">Cadangan</label>
                                    <input
                                        type="number"
                                        value={manualCadangan}
                                        onChange={e => setManualCadangan(parseInt(e.target.value) || 0)}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-amber-300 dark:border-amber-700 rounded-lg px-2 py-1.5 text-center font-bold text-amber-700"
                                        min={0}
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold text-rose-600 mb-1">Ditolak</label>
                                    <input
                                        type="number"
                                        value={manualDitolak}
                                        onChange={e => setManualDitolak(parseInt(e.target.value) || 0)}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-rose-300 dark:border-rose-700 rounded-lg px-2 py-1.5 text-center font-bold text-rose-700"
                                        min={0}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Catatan Tambahan</label>
                                <textarea
                                    value={manualCatatan}
                                    onChange={e => setManualCatatan(e.target.value)}
                                    rows={2}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 outline-none"
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsAddManualOpen(false)}
                                    className="px-3 py-1.5 text-slate-600 dark:text-slate-400 font-semibold hover:bg-slate-100 rounded-lg"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg transition"
                                >
                                    Simpan Snapshot
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>,
        document.body
    );
};
