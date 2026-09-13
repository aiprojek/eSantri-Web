import React, { useState, useMemo, useRef } from 'react';
import { Pendaftar, PondokSettings, PsbConfig } from '../../../types';
import { calculatePsbAverageScore, getPsbRegistrationNumber } from '../utils/psbUtils';

interface PsbAnnouncementModalProps {
    isOpen: boolean;
    onClose: () => void;
    pendaftarList: Pendaftar[];
    settings: PondokSettings;
    config: PsbConfig;
}

type FilterViewMode = 'semua' | 'diterima' | 'ditolak' | 'cadangan';
type SortOrder = 'ranking' | 'noreg' | 'nama';

export const PsbAnnouncementModal: React.FC<PsbAnnouncementModalProps> = ({
    isOpen,
    onClose,
    pendaftarList,
    settings,
    config,
}) => {
    const printAreaRef = useRef<HTMLDivElement>(null);
    const [viewMode, setViewMode] = useState<FilterViewMode>('semua');
    const [selectedJenjang, setSelectedJenjang] = useState<string>('');
    const [selectedGelombang, setSelectedGelombang] = useState<string>('');
    const [sortOrder, setSortOrder] = useState<SortOrder>('ranking');
    const [suratNumber, setSuratNumber] = useState<string>(() => {
        const year = new Date().getFullYear();
        const code = (settings.namaPonpes || 'PST').replace(/[^a-zA-Z]/g, '').slice(0, 4).toUpperCase();
        return `088/PAN-PSB/${code}/${year}`;
    });

    // Editable Notes States
    const DEFAULT_NOTES_DITERIMA = useMemo(() => [
        'Calon santri yang dinyatakan DITERIMA wajib melakukan Daftar Ulang dan pelunasan administrasi masuk sesuai batas waktu yang ditentukan.',
        'Bagi calon santri yang tidak melakukan konfirmasi atau daftar ulang hingga batas waktu yang ditetapkan, maka hak kelulusan dianggap gugur/mengundurkan diri.',
        'Membawa berkas fisik persyaratan (Ijazah/SKL, Kartu Keluarga, Akta Kelahiran, dan Surat Keterangan Sehat) saat kedatangan ke pesantren.'
    ], []);
    const DEFAULT_NOTES_CADANGAN = 'Calon santri cadangan akan dihubungi oleh panitia secara resmi melalui WhatsApp/Telepon apabila terdapat calon santri diterima yang mengundurkan diri atau tidak melakukan daftar ulang.';
    const DEFAULT_NOTES_DITOLAK = '* Bagi calon santri yang belum diterima pada periode ini, panitia mengucapkan terima kasih sebesar-besarnya atas minat dan partisipasinya, serta mendoakan keberkahan ilmu di lembaga pendidikan pilihan selanjutnya.';

    const [notesDiterima, setNotesDiterima] = useState<string[]>(DEFAULT_NOTES_DITERIMA);
    const [notesCadangan, setNotesCadangan] = useState<string>(DEFAULT_NOTES_CADANGAN);
    const [notesDitolak, setNotesDitolak] = useState<string>(DEFAULT_NOTES_DITOLAK);
    const [customAdditionalNotes, setCustomAdditionalNotes] = useState<string>('');
    const [showEditNotesPanel, setShowEditNotesPanel] = useState<boolean>(false);

    const handleResetNotes = () => {
        setNotesDiterima(DEFAULT_NOTES_DITERIMA);
        setNotesCadangan(DEFAULT_NOTES_CADANGAN);
        setNotesDitolak(DEFAULT_NOTES_DITOLAK);
        setCustomAdditionalNotes('');
    };

    const handleAddDiterimaPoint = () => {
        setNotesDiterima(prev => [...prev, 'Catatan poin baru...']);
    };

    const handleUpdateDiterimaPoint = (idx: number, text: string) => {
        setNotesDiterima(prev => {
            const updated = [...prev];
            updated[idx] = text;
            return updated;
        });
    };

    const handleRemoveDiterimaPoint = (idx: number) => {
        setNotesDiterima(prev => prev.filter((_, i) => i !== idx));
    };

    // Filter and sort candidates
    const processedList = useMemo(() => {
        let list = [...pendaftarList];

        if (selectedJenjang) {
            list = list.filter(p => String(p.jenjangId) === selectedJenjang);
        }

        if (selectedGelombang) {
            list = list.filter(p => (p.gelombang || 'Gelombang 1') === selectedGelombang);
        }

        // Sorting
        list.sort((a, b) => {
            if (sortOrder === 'ranking') {
                const scoreA = calculatePsbAverageScore(a.nilaiUjian) || 0;
                const scoreB = calculatePsbAverageScore(b.nilaiUjian) || 0;
                return scoreB - scoreA;
            } else if (sortOrder === 'noreg') {
                return (a.nomorRegistrasi || '').localeCompare(b.nomorRegistrasi || '');
            } else {
                return a.namaLengkap.localeCompare(b.namaLengkap);
            }
        });

        return list;
    }, [pendaftarList, selectedJenjang, selectedGelombang, sortOrder]);

    const acceptedList = useMemo(() => processedList.filter(p => p.status === 'Diterima'), [processedList]);
    const rejectedList = useMemo(() => processedList.filter(p => p.status === 'Ditolak'), [processedList]);
    const waitingList = useMemo(() => processedList.filter(p => p.status === 'Cadangan'), [processedList]);

    if (!isOpen) return null;

    const handlePrint = () => {
        window.print();
    };

    const getJenjangName = (id: number) => {
        return settings.jenjang.find(j => j.id === id)?.nama || '-';
    };

    const yearLabel = config.tahunAjaranAktif || `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`;
    const todayFormatted = new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    return (
        <div className="fixed inset-0 bg-black/70 z-[90] flex justify-center items-start sm:items-center p-2 sm:p-4 overflow-y-auto print-modal-target">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col max-h-[96vh] h-[95vh] sm:h-auto overflow-hidden my-auto border border-gray-200 print-modal-card">
                
                {/* Modal Header (Screen Only) */}
                <div className="p-3 sm:p-4 border-b flex justify-between items-center bg-teal-800 text-white shrink-0 no-print">
                    <div className="flex items-center gap-2.5 sm:gap-3">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-teal-700/80 border border-teal-500/40 flex items-center justify-center text-teal-200 shrink-0">
                            <i className="bi bi-file-earmark-pdf-fill text-lg sm:text-2xl"></i>
                        </div>
                        <div>
                            <h3 className="text-sm sm:text-lg font-bold leading-tight">Dokumen Pengumuman Kelulusan PSB</h3>
                            <p className="text-[11px] sm:text-xs text-teal-100 hidden xs:block">Format resmi pengumuman hasil seleksi untuk publikasi dan arsip posko</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-teal-200 hover:text-white hover:bg-teal-700 transition-colors shrink-0"
                        title="Tutup Modal"
                    >
                        <i className="bi bi-x-lg text-base sm:text-lg"></i>
                    </button>
                </div>

                {/* Filter & Control Bar (Screen Only) */}
                <div className="p-2.5 sm:p-3 bg-slate-50 border-b border-slate-200 no-print flex flex-col gap-2.5 sm:gap-3 text-xs shrink-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        {/* Tab Mode */}
                        <div className="inline-flex rounded-xl bg-slate-200/90 p-1 border border-slate-300 max-w-full overflow-x-auto custom-scrollbar">
                            <button
                                type="button"
                                onClick={() => setViewMode('semua')}
                                className={`px-2.5 sm:px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap text-[11px] sm:text-xs ${
                                    viewMode === 'semua' ? 'bg-white text-teal-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                Lengkap
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('diterima')}
                                className={`px-2.5 sm:px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap text-[11px] sm:text-xs ${
                                    viewMode === 'diterima' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                Diterima ({acceptedList.length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('ditolak')}
                                className={`px-2.5 sm:px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap text-[11px] sm:text-xs ${
                                    viewMode === 'ditolak' ? 'bg-red-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                Ditolak ({rejectedList.length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('cadangan')}
                                className={`px-2.5 sm:px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap text-[11px] sm:text-xs ${
                                    viewMode === 'cadangan' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                Cadangan ({waitingList.length})
                            </button>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 ml-auto">
                            <button
                                type="button"
                                onClick={() => setShowEditNotesPanel(!showEditNotesPanel)}
                                className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl font-bold flex items-center gap-1.5 transition-all text-[11px] sm:text-xs border shadow-xs ${
                                    showEditNotesPanel
                                        ? 'bg-amber-100 text-amber-900 border-amber-300 ring-1 ring-amber-400'
                                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                                }`}
                                title="Kustomisasi catatan di bawah tabel"
                            >
                                <i className="bi bi-pencil-square text-amber-600"></i>
                                <span>{showEditNotesPanel ? 'Tutup Edit Catatan' : 'Edit Catatan Tabel'}</span>
                            </button>
                            <button
                                onClick={handlePrint}
                                className="px-3 sm:px-4 py-1.5 sm:py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl font-bold flex items-center gap-1.5 sm:gap-2 transition-all shadow-xs active:scale-95 text-[11px] sm:text-xs"
                                title="Cetak langsung ke A4 atau Simpan sebagai PDF"
                            >
                                <i className="bi bi-printer-fill text-sm"></i>
                                <span>Cetak / PDF</span>
                            </button>
                        </div>
                    </div>

                    {/* Secondary Filters */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-1 border-t border-slate-200">
                        <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-0.5">Filter Jenjang</label>
                            <select
                                value={selectedJenjang}
                                onChange={e => setSelectedJenjang(e.target.value)}
                                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs"
                            >
                                <option value="">Semua Jenjang</option>
                                {settings.jenjang.map(j => (
                                    <option key={j.id} value={String(j.id)}>{j.nama}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-0.5">Filter Gelombang</label>
                            <select
                                value={selectedGelombang}
                                onChange={e => setSelectedGelombang(e.target.value)}
                                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs"
                            >
                                <option value="">Semua Gelombang</option>
                                <option value="Gelombang 1">Gelombang 1</option>
                                <option value="Gelombang 2">Gelombang 2</option>
                                <option value="Gelombang 3">Gelombang 3</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-0.5">Urutan Tabel</label>
                            <select
                                value={sortOrder}
                                onChange={e => setSortOrder(e.target.value as SortOrder)}
                                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs"
                            >
                                <option value="ranking">Ranking Nilai Ujian (Tertinggi)</option>
                                <option value="noreg">Nomor Registrasi</option>
                                <option value="nama">Nama Lengkap (A-Z)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-0.5">Nomor Surat Keputusan</label>
                            <input
                                type="text"
                                value={suratNumber}
                                onChange={e => setSuratNumber(e.target.value)}
                                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-mono"
                                placeholder="Nomor Surat..."
                            />
                        </div>
                    </div>
                </div>

                {/* Expandable Notes Editor Panel (Dedicated section, smoothly scrollable without nested overflow traps) */}
                {showEditNotesPanel && (
                    <div className="bg-amber-50/95 border-b-2 border-amber-300 p-3 sm:p-4 text-xs shrink-0 max-h-[52vh] sm:max-h-[58vh] overflow-y-auto custom-scrollbar shadow-inner no-print">
                        <div className="flex items-center justify-between border-b border-amber-200 pb-2 mb-3">
                            <div className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded-lg bg-amber-500 text-white flex items-center justify-center text-xs shrink-0 shadow-xs">
                                    <i className="bi bi-pencil-fill"></i>
                                </span>
                                <div>
                                    <h4 className="font-bold text-xs sm:text-sm text-amber-950">Kustomisasi Catatan Dokumen Pengumuman</h4>
                                    <p className="text-[10px] sm:text-[11px] text-amber-800">Ubah teks petunjuk santri diterima, cadangan, ditolak, dan pengumuman panitia</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={handleResetNotes}
                                    className="text-[11px] text-amber-800 hover:text-amber-950 underline flex items-center gap-1 font-medium"
                                >
                                    <i className="bi bi-arrow-counterclockwise"></i> Reset Standar
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowEditNotesPanel(false)}
                                    className="text-amber-700 hover:bg-amber-200/60 p-1.5 rounded-lg transition-colors"
                                    title="Tutup Panel"
                                >
                                    <i className="bi bi-x-lg text-xs"></i>
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                            {/* Catatan Santri Diterima */}
                            <div className="space-y-2 bg-white/80 p-3 rounded-xl border border-teal-200 shadow-2xs">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-bold text-teal-900 flex items-center gap-1.5">
                                        <i className="bi bi-check-circle-fill text-teal-600"></i>
                                        Petunjuk Santri Diterima (Poin-Poin)
                                    </label>
                                    <button
                                        type="button"
                                        onClick={handleAddDiterimaPoint}
                                        className="text-[11px] bg-teal-600 hover:bg-teal-700 text-white px-2.5 py-1 rounded-lg font-bold shadow-2xs transition-colors"
                                    >
                                        + Tambah Poin
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    {notesDiterima.map((pt, idx) => (
                                        <div key={idx} className="flex items-start gap-2 bg-white p-2 rounded-lg border border-teal-300 shadow-2xs">
                                            <span className="text-teal-800 font-bold mt-1 text-xs shrink-0 w-5">{idx + 1}.</span>
                                            <textarea
                                                rows={2}
                                                value={pt}
                                                onChange={(e) => handleUpdateDiterimaPoint(idx, e.target.value)}
                                                className="w-full text-xs border border-slate-200 rounded-lg p-2 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 resize-y outline-none text-slate-800 bg-white"
                                                placeholder="Tulis petunjuk santri diterima..."
                                            />
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveDiterimaPoint(idx)}
                                                className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-lg shrink-0 transition-colors"
                                                title="Hapus poin ini"
                                            >
                                                <i className="bi bi-trash text-sm"></i>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Catatan Cadangan & Ditolak */}
                            <div className="space-y-3 bg-white/80 p-3 rounded-xl border border-amber-200 shadow-2xs">
                                <div>
                                    <label className="text-xs font-bold text-amber-900 block mb-1 flex items-center gap-1.5">
                                        <i className="bi bi-clock-history text-amber-600"></i>
                                        Catatan Calon Santri Cadangan
                                    </label>
                                    <textarea
                                        rows={3}
                                        value={notesCadangan}
                                        onChange={(e) => setNotesCadangan(e.target.value)}
                                        className="w-full text-xs p-2.5 bg-white border border-amber-300 rounded-lg focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none text-slate-800"
                                        placeholder="Catatan untuk santri cadangan..."
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-800 block mb-1 flex items-center gap-1.5">
                                        <i className="bi bi-x-circle-fill text-red-500"></i>
                                        Catatan Calon Santri Tidak Diterima
                                    </label>
                                    <textarea
                                        rows={3}
                                        value={notesDitolak}
                                        onChange={(e) => setNotesDitolak(e.target.value)}
                                        className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-lg focus:border-slate-500 focus:ring-2 focus:ring-slate-200 outline-none text-slate-800"
                                        placeholder="Catatan untuk santri tidak diterima..."
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Catatan Tambahan Panitia */}
                        <div className="mt-3 bg-white/80 p-3 rounded-xl border border-slate-200 shadow-2xs">
                            <label className="text-xs font-bold text-slate-800 block mb-1 flex items-center gap-1.5">
                                <i className="bi bi-info-circle-fill text-teal-600"></i>
                                Catatan / Keterangan Tambahan Panitia (Opsional - Tampil di bagian bawah)
                            </label>
                            <textarea
                                rows={2}
                                value={customAdditionalNotes}
                                onChange={(e) => setCustomAdditionalNotes(e.target.value)}
                                className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-lg focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none text-slate-800"
                                placeholder="Contoh: Jadwal kedatangan santri ke asrama: 10 Juli 2026. Narahubung Panitia: Ustadz Ahmad (0812-xxxx-xxxx)."
                            />
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 mt-3 border-t border-amber-200 text-xs">
                            <span className="text-[11px] text-amber-800 italic flex items-center gap-1">
                                <i className="bi bi-eye"></i> Perubahan otomatis terpasang pada pratinjau dokumen di bawah.
                            </span>
                            <button
                                type="button"
                                onClick={() => setShowEditNotesPanel(false)}
                                className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-xl font-bold flex items-center gap-1.5 text-xs shadow-xs transition-colors ml-auto"
                            >
                                <i className="bi bi-check2 text-sm"></i>
                                <span>Selesai &amp; Tutup Editor</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* Printable Document Area */}
                <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-8 bg-slate-100 flex justify-center custom-scrollbar">
                    <div
                        ref={printAreaRef}
                        className="bg-white p-6 sm:p-10 shadow-lg border border-gray-200 w-full max-w-[210mm] text-gray-900 text-xs sm:text-sm print:border-none print:shadow-none print:p-0 print:m-0"
                        style={{ minHeight: '297mm' }}
                    >
                        {/* KOP SURAT RESMI */}
                        <div className="border-b-2 border-double border-gray-900 pb-3 mb-4 text-center relative">
                            {(settings.logoPonpesUrl || settings.logoYayasanUrl) && (
                                <img
                                    src={settings.logoPonpesUrl || settings.logoYayasanUrl}
                                    alt="Logo Pondok"
                                    className="w-16 h-16 object-contain absolute left-0 top-0 hidden sm:block print:block"
                                    referrerPolicy="no-referrer"
                                />
                            )}
                            <div className="sm:px-16">
                                <h2 className="font-serif font-black text-lg sm:text-xl uppercase tracking-wide text-gray-900">
                                    {settings.namaPonpes || 'PONDOK PESANTREN'}
                                </h2>
                                <h3 className="font-bold text-xs sm:text-sm uppercase tracking-wider text-teal-800">
                                    PANITIA PENERIMAAN SANTRI BARU (PSB)
                                </h3>
                                <p className="text-[11px] text-gray-600 mt-0.5">
                                    {settings.alamat || 'Alamat Lembaga Pondok Pesantren'}
                                    {settings.telepon ? ` • Telp/WA: ${settings.telepon}` : ''}
                                    {settings.email ? ` • Email: ${settings.email}` : ''}
                                </p>
                            </div>
                        </div>

                        {/* JUDUL PENGUMUMAN RESMI */}
                        <div className="text-center my-4">
                            <h4 className="font-bold text-sm sm:text-base uppercase tracking-tight underline">
                                SURAT KEPUTUSAN PANITIA PSB
                            </h4>
                            <p className="font-mono text-xs font-semibold text-gray-700 mt-0.5">
                                Nomor: {suratNumber}
                            </p>
                            <p className="font-bold text-xs sm:text-sm text-gray-900 uppercase mt-1">
                                TENTANG PENETAPAN HASIL SELEKSI PENERIMAAN SANTRI BARU
                                <br />
                                TAHUN AJARAN {yearLabel}
                            </p>
                        </div>

                        {/* PEMBUKA SURAT */}
                        <div className="text-justify text-[11px] sm:text-xs text-gray-700 leading-relaxed mb-4">
                            <p>
                                <em>Bismillaahirrahmaanirrahiim.</em> Berdasarkan rapat pleno panitia seleksi Penerimaan Santri Baru (PSB) {settings.namaPonpes || 'Pondok Pesantren'} yang meliputi verifikasi kelengkapan berkas administrasi, ujian potensi akademik, tes membaca Al-Qur'an, dan wawancara komprehensif, dengan ini Pimpinan Pondok Pesantren dan Panitia PSB memutuskan nama-nama calon santri di bawah ini:
                            </p>
                        </div>

                        {/* SECTION: SANTRI DITERIMA */}
                        {(viewMode === 'semua' || viewMode === 'diterima') && (
                            <div className="mb-6">
                                <div className="flex items-center justify-between bg-teal-800 text-white px-3 py-1.5 rounded-t-md font-bold text-xs">
                                    <span className="flex items-center gap-1.5 uppercase tracking-wide">
                                        <i className="bi bi-check-circle-fill"></i>
                                        I. Daftar Calon Santri Dinyatakan Diterima (Lulus Seleksi)
                                    </span>
                                    <span className="text-[11px] bg-teal-900/80 px-2 py-0.5 rounded font-mono">
                                        Total: {acceptedList.length} Santri
                                    </span>
                                </div>

                                {acceptedList.length > 0 ? (
                                    <div className="border border-teal-800 border-t-0 rounded-b-md overflow-x-auto">
                                        <table className="w-full text-left border-collapse text-[11px] sm:text-xs">
                                            <thead>
                                                <tr className="bg-teal-50 border-b border-teal-200 text-teal-950 font-bold">
                                                    <th className="p-1.5 text-center w-8 border-r border-teal-200">No</th>
                                                    <th className="p-1.5 w-24 border-r border-teal-200">No. Reg</th>
                                                    <th className="p-1.5 border-r border-teal-200">Nama Lengkap Santri</th>
                                                    <th className="p-1.5 text-center w-10 border-r border-teal-200">L/P</th>
                                                    <th className="p-1.5 border-r border-teal-200">Jenjang</th>
                                                    <th className="p-1.5 border-r border-teal-200">Asal Sekolah</th>
                                                    <th className="p-1.5 text-center w-14 border-r border-teal-200">Nilai</th>
                                                    <th className="p-1.5 text-center w-24">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {acceptedList.map((p, idx) => {
                                                    const regNumber = p.nomorRegistrasi || getPsbRegistrationNumber(p, getJenjangName(p.jenjangId));
                                                    const score = calculatePsbAverageScore(p.nilaiUjian) || '-';
                                                    return (
                                                        <tr key={p.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-teal-50/30'}>
                                                            <td className="p-1.5 text-center border-t border-r border-gray-200 font-semibold">{idx + 1}</td>
                                                            <td className="p-1.5 border-t border-r border-gray-200 font-mono font-bold text-teal-900">{regNumber}</td>
                                                            <td className="p-1.5 border-t border-r border-gray-200 font-bold uppercase">{p.namaLengkap}</td>
                                                            <td className="p-1.5 text-center border-t border-r border-gray-200">{p.jenisKelamin === 'Perempuan' ? 'P' : 'L'}</td>
                                                            <td className="p-1.5 border-t border-r border-gray-200">{getJenjangName(p.jenjangId)}</td>
                                                            <td className="p-1.5 border-t border-r border-gray-200 text-gray-700">{p.asalSekolah || '-'}</td>
                                                            <td className="p-1.5 text-center border-t border-r border-gray-200 font-bold text-teal-900">{score}</td>
                                                            <td className="p-1.5 text-center border-t border-gray-200">
                                                                <span className="font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded text-[10px]">
                                                                    DITERIMA
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="p-4 border border-teal-800 border-t-0 rounded-b-md text-center text-gray-500 italic">
                                        Belum ada data calon santri yang berstatus Diterima pada filter saat ini.
                                    </div>
                                )}

                                {/* Petunjuk Daftar Ulang */}
                                {notesDiterima.length > 0 && (
                                    <div className="mt-2.5 p-2.5 bg-teal-50/70 border border-teal-200 rounded text-[11px] text-gray-700 leading-relaxed group relative">
                                        <div className="flex items-center justify-between mb-0.5">
                                            <strong className="text-teal-900 block font-bold">Petunjuk Penting Bagi Santri Diterima:</strong>
                                            <button
                                                type="button"
                                                onClick={() => setShowEditNotesPanel(true)}
                                                className="no-print opacity-0 group-hover:opacity-100 text-[10px] text-teal-700 bg-white px-1.5 py-0.5 rounded border border-teal-300 hover:bg-teal-50 transition"
                                                title="Edit catatan santri diterima"
                                            >
                                                <i className="bi bi-pencil mr-1"></i>Edit Catatan
                                            </button>
                                        </div>
                                        <ol className="list-decimal pl-4 space-y-0.5">
                                            {notesDiterima.map((pt, i) => (
                                                <li key={i}>{pt}</li>
                                            ))}
                                        </ol>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* SECTION: SANTRI CADANGAN */}
                        {(viewMode === 'semua' || viewMode === 'cadangan') && waitingList.length > 0 && (
                            <div className="mb-6">
                                <div className="flex items-center justify-between bg-amber-700 text-white px-3 py-1.5 rounded-t-md font-bold text-xs">
                                    <span className="flex items-center gap-1.5 uppercase tracking-wide">
                                        <i className="bi bi-clock-history"></i>
                                        II. Daftar Calon Santri Cadangan
                                    </span>
                                    <span className="text-[11px] bg-amber-900/80 px-2 py-0.5 rounded font-mono">
                                        Total: {waitingList.length} Santri
                                    </span>
                                </div>
                                <div className="border border-amber-700 border-t-0 rounded-b-md overflow-x-auto">
                                    <table className="w-full text-left border-collapse text-[11px] sm:text-xs">
                                        <thead>
                                            <tr className="bg-amber-50 border-b border-amber-200 text-amber-950 font-bold">
                                                <th className="p-1.5 text-center w-8 border-r border-amber-200">No</th>
                                                <th className="p-1.5 w-24 border-r border-amber-200">No. Reg</th>
                                                <th className="p-1.5 border-r border-amber-200">Nama Lengkap Santri</th>
                                                <th className="p-1.5 text-center w-10 border-r border-amber-200">L/P</th>
                                                <th className="p-1.5 border-r border-amber-200">Jenjang</th>
                                                <th className="p-1.5 border-r border-amber-200">Asal Sekolah</th>
                                                <th className="p-1.5 text-center w-14 border-r border-amber-200">Nilai</th>
                                                <th className="p-1.5 text-center w-24">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {waitingList.map((p, idx) => {
                                                const regNumber = p.nomorRegistrasi || getPsbRegistrationNumber(p, getJenjangName(p.jenjangId));
                                                const score = calculatePsbAverageScore(p.nilaiUjian) || '-';
                                                return (
                                                    <tr key={p.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-amber-50/30'}>
                                                        <td className="p-1.5 text-center border-t border-r border-gray-200 font-semibold">{idx + 1}</td>
                                                        <td className="p-1.5 border-t border-r border-gray-200 font-mono font-bold text-amber-900">{regNumber}</td>
                                                        <td className="p-1.5 border-t border-r border-gray-200 font-bold uppercase">{p.namaLengkap}</td>
                                                        <td className="p-1.5 text-center border-t border-r border-gray-200">{p.jenisKelamin === 'Perempuan' ? 'P' : 'L'}</td>
                                                        <td className="p-1.5 border-t border-r border-gray-200">{getJenjangName(p.jenjangId)}</td>
                                                        <td className="p-1.5 border-t border-r border-gray-200 text-gray-700">{p.asalSekolah || '-'}</td>
                                                        <td className="p-1.5 text-center border-t border-r border-gray-200 font-bold text-amber-900">{score}</td>
                                                        <td className="p-1.5 text-center border-t border-gray-200">
                                                            <span className="font-bold text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded text-[10px]">
                                                                CADANGAN
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                                {notesCadangan && (
                                    <div className="mt-2 p-2 bg-amber-50/70 border border-amber-200 rounded text-[11px] text-amber-900 italic leading-relaxed group relative flex items-center justify-between">
                                        <span>{notesCadangan}</span>
                                        <button
                                            type="button"
                                            onClick={() => setShowEditNotesPanel(true)}
                                            className="no-print opacity-0 group-hover:opacity-100 text-[10px] text-amber-800 bg-white px-1.5 py-0.5 rounded border border-amber-300 hover:bg-amber-50 transition shrink-0 ml-2"
                                            title="Edit catatan santri cadangan"
                                        >
                                            <i className="bi bi-pencil mr-1"></i>Edit Catatan
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* SECTION: SANTRI TIDAK DITERIMA */}
                        {(viewMode === 'semua' || viewMode === 'ditolak') && (
                            <div className="mb-6">
                                <div className="flex items-center justify-between bg-slate-800 text-white px-3 py-1.5 rounded-t-md font-bold text-xs">
                                    <span className="flex items-center gap-1.5 uppercase tracking-wide">
                                        <i className="bi bi-x-circle-fill text-red-400"></i>
                                        {viewMode === 'semua' ? 'III.' : 'I.'} Daftar Calon Santri Tidak Diterima / Belum Memenuhi Kuota
                                    </span>
                                    <span className="text-[11px] bg-slate-900/80 px-2 py-0.5 rounded font-mono">
                                        Total: {rejectedList.length} Santri
                                    </span>
                                </div>

                                {rejectedList.length > 0 ? (
                                    <div className="border border-slate-800 border-t-0 rounded-b-md overflow-x-auto">
                                        <table className="w-full text-left border-collapse text-[11px] sm:text-xs">
                                            <thead>
                                                <tr className="bg-slate-100 border-b border-slate-300 text-slate-800 font-bold">
                                                    <th className="p-1.5 text-center w-8 border-r border-slate-300">No</th>
                                                    <th className="p-1.5 w-24 border-r border-slate-300">No. Reg</th>
                                                    <th className="p-1.5 border-r border-slate-300">Nama Lengkap Santri</th>
                                                    <th className="p-1.5 text-center w-10 border-r border-slate-300">L/P</th>
                                                    <th className="p-1.5 border-r border-slate-300">Jenjang</th>
                                                    <th className="p-1.5 border-r border-slate-300">Asal Sekolah</th>
                                                    <th className="p-1.5 text-center w-24">Keterangan</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {rejectedList.map((p, idx) => {
                                                    const regNumber = p.nomorRegistrasi || getPsbRegistrationNumber(p, getJenjangName(p.jenjangId));
                                                    return (
                                                        <tr key={p.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                                            <td className="p-1.5 text-center border-t border-r border-gray-200 font-semibold">{idx + 1}</td>
                                                            <td className="p-1.5 border-t border-r border-gray-200 font-mono font-semibold text-slate-700">{regNumber}</td>
                                                            <td className="p-1.5 border-t border-r border-gray-200 font-bold uppercase">{p.namaLengkap}</td>
                                                            <td className="p-1.5 text-center border-t border-r border-gray-200">{p.jenisKelamin === 'Perempuan' ? 'P' : 'L'}</td>
                                                            <td className="p-1.5 border-t border-r border-gray-200">{getJenjangName(p.jenjangId)}</td>
                                                            <td className="p-1.5 border-t border-r border-gray-200 text-gray-700">{p.asalSekolah || '-'}</td>
                                                            <td className="p-1.5 text-center border-t border-gray-200">
                                                                <span className="font-bold text-red-800 bg-red-100 px-1.5 py-0.5 rounded text-[10px]">
                                                                    TIDAK DITERIMA
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="p-4 border border-slate-800 border-t-0 rounded-b-md text-center text-gray-500 italic">
                                        Tidak ada calon santri yang berstatus Tidak Diterima pada filter saat ini.
                                    </div>
                                )}

                                {notesDitolak && (
                                    <div className="mt-2 text-[11px] text-gray-500 italic leading-relaxed group relative flex items-center justify-between">
                                        <p>{notesDitolak}</p>
                                        <button
                                            type="button"
                                            onClick={() => setShowEditNotesPanel(true)}
                                            className="no-print opacity-0 group-hover:opacity-100 text-[10px] text-slate-600 bg-white px-1.5 py-0.5 rounded border border-slate-300 hover:bg-slate-50 transition shrink-0 ml-2"
                                            title="Edit catatan santri tidak diterima"
                                        >
                                            <i className="bi bi-pencil mr-1"></i>Edit Catatan
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Catatan Tambahan Panitia (Jika Diisi) */}
                        {customAdditionalNotes.trim() && (
                            <div className="mb-4 p-2.5 bg-slate-50 border border-slate-200 rounded text-[11px] text-gray-700 leading-relaxed">
                                <strong className="text-slate-900 block font-bold mb-0.5">Keterangan / Informasi Tambahan:</strong>
                                <p className="whitespace-pre-line">{customAdditionalNotes}</p>
                            </div>
                        )}

                        {/* RINGKASAN REKAPITULASI RESMI */}
                        <div className="my-4 p-3 bg-gray-50 border border-gray-200 rounded-lg flex flex-wrap items-center justify-between text-[11px] gap-2">
                            <div>
                                <span className="font-bold text-gray-700">Rekapitulasi Seleksi:</span>
                                <span className="ml-2 text-gray-600">
                                    Total Pendaftar Tersaring: <strong>{processedList.length}</strong> orang
                                </span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-emerald-800 font-bold">Diterima: {acceptedList.length}</span>
                                <span className="text-amber-700 font-bold">Cadangan: {waitingList.length}</span>
                                <span className="text-red-700 font-bold">Tidak Diterima: {rejectedList.length}</span>
                            </div>
                        </div>

                        {/* TANDA TANGAN & PENGESAHAN DOKUMEN */}
                        <div className="mt-8 pt-4 border-t border-gray-300 break-inside-avoid">
                            <div className="text-right text-gray-800 mb-4 text-[11px] sm:text-xs">
                                Ditetapkan di: {settings.alamat?.split(',')[0] || 'Posko PSB Pesantren'}<br />
                                Pada tanggal: {todayFormatted}
                            </div>
                            <div className="grid grid-cols-2 gap-8 text-center text-xs">
                                <div>
                                    <p className="font-semibold text-gray-700 mb-16">
                                        Ketua Panitia PSB,
                                    </p>
                                    <p className="font-bold text-gray-900 underline uppercase">
                                        ( ............................................ )
                                    </p>
                                    <p className="text-[10px] text-gray-500 mt-0.5">NIP / NIY Panitia</p>
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-700 mb-16">
                                        Pimpinan Pondok Pesantren,
                                    </p>
                                    <p className="font-bold text-gray-900 underline uppercase">
                                        {settings.tenagaPengajar?.find(t => t.id === settings.mudirAamId)?.nama || '( ............................................ )'}
                                    </p>
                                    <p className="text-[10px] text-gray-500 mt-0.5">Pengasuh / Mudir 'Aam</p>
                                </div>
                            </div>
                        </div>

                        {/* FOOTER INFORMASI */}
                        <div className="mt-8 pt-2 border-t border-dashed border-gray-300 text-[10px] text-gray-400 flex justify-between">
                            <span>Dokumen Resmi Keputusan Panitia PSB • eSantri Web</span>
                            <span>Halaman Cetak Pengumuman Seleksi</span>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};
