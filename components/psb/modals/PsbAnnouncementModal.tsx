import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Pendaftar, PondokSettings, PsbConfig } from '../../../types';
import { calculatePsbAverageScore, getPsbRegistrationNumber } from '../utils/psbUtils';
import { printToPdfNative } from '../../../utils/pdfGenerator';

interface PsbAnnouncementModalProps {
    isOpen: boolean;
    onClose: () => void;
    pendaftarList: Pendaftar[];
    settings: PondokSettings;
    config: PsbConfig;
    onSaveConfig?: (newConfig: PsbConfig) => void;
}

type FilterViewMode = 'semua' | 'diterima' | 'ditolak' | 'cadangan';
type SortOrder = 'ranking' | 'noreg' | 'nama';

export const PsbAnnouncementModal: React.FC<PsbAnnouncementModalProps> = ({
    isOpen,
    onClose,
    pendaftarList,
    settings,
    config,
    onSaveConfig,
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

    // Isolate print styles on document body when modal is mounted
    useEffect(() => {
        if (isOpen) {
            document.body.classList.add('modal-print-open');
            return () => {
                document.body.classList.remove('modal-print-open');
            };
        }
    }, [isOpen]);

    // Admin & Pimpinan Signature State
    const [adminName, setAdminName] = useState(() => {
        return config.namaAdminPsb || localStorage.getItem('psb_signature_admin_name') || '';
    });
    const [adminJabatan, setAdminJabatan] = useState(() => {
        return config.jabatanAdminPsb || localStorage.getItem('psb_signature_admin_jabatan') || 'Ketua Panitia PSB';
    });
    const [pimpinanName, setPimpinanName] = useState(() => {
        return config.namaPimpinanPsb || settings.tenagaPengajar?.find(t => t.id === settings.mudirAamId)?.nama || '';
    });
    const [pimpinanJabatan, setPimpinanJabatan] = useState(() => {
        return config.jabatanPimpinanPsb || 'Pimpinan Pondok Pesantren';
    });
    const [tempatCetak, setTempatCetak] = useState(() => {
        return config.kotaSuratPsb || settings.alamat?.split(',')[0] || 'Posko PSB Pesantren';
    });

    const [showSignatureSettings, setShowSignatureSettings] = useState(false);
    const [zoomLevel, setZoomLevel] = useState<'fit' | '100' | '90' | '80'>('100');
    const [isSavedMessage, setIsSavedMessage] = useState(false);

    // Sync if config changes
    useEffect(() => {
        if (config.namaAdminPsb) setAdminName(config.namaAdminPsb);
        if (config.jabatanAdminPsb) setAdminJabatan(config.jabatanAdminPsb);
        if (config.namaPimpinanPsb) setPimpinanName(config.namaPimpinanPsb);
        if (config.jabatanPimpinanPsb) setPimpinanJabatan(config.jabatanPimpinanPsb);
        if (config.kotaSuratPsb) setTempatCetak(config.kotaSuratPsb);
    }, [config]);

    // Save as default handler
    const handleSaveAsDefault = () => {
        localStorage.setItem('psb_signature_admin_name', adminName);
        localStorage.setItem('psb_signature_admin_jabatan', adminJabatan);
        localStorage.setItem('psb_signature_pimpinan_name', pimpinanName);
        localStorage.setItem('psb_signature_pimpinan_jabatan', pimpinanJabatan);
        localStorage.setItem('psb_signature_tempat_cetak', tempatCetak);

        if (onSaveConfig) {
            onSaveConfig({
                ...config,
                namaAdminPsb: adminName,
                jabatanAdminPsb: adminJabatan,
                namaPimpinanPsb: pimpinanName,
                jabatanPimpinanPsb: pimpinanJabatan,
                kotaSuratPsb: tempatCetak,
            });
        }

        setIsSavedMessage(true);
        setTimeout(() => setIsSavedMessage(false), 3000);
    };

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
        const cleanDocNum = (suratNumber || 'Pengumuman').replace(/[\/\\:*?"<>|]/g, '-');
        const cleanTa = yearLabel.replace(/[\/\\:*?"<>|]/g, '-');
        printToPdfNative(
            'psb-announcement-sheet',
            `Pengumuman_Hasil_PSB_${cleanDocNum}_TA_${cleanTa}`,
            {
                paperSize: 'A4',
                orientation: 'portrait'
            }
        );
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

    const zoomStyle = useMemo(() => {
        switch (zoomLevel) {
            case '80': return { transform: 'scale(0.8)', transformOrigin: 'top center' };
            case '90': return { transform: 'scale(0.9)', transformOrigin: 'top center' };
            case 'fit': return { transform: 'scale(0.85)', transformOrigin: 'top center' };
            default: return {};
        }
    }, [zoomLevel]);

    return createPortal(
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-[90] flex justify-center items-start p-1 sm:p-4 overflow-y-auto print-modal-target">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col max-h-[96vh] overflow-hidden border border-gray-200 print-modal-card">
                
                {/* Modal Header (Screen Only) */}
                <div className="p-3 sm:p-4 border-b flex justify-between items-center bg-teal-800 text-white shrink-0 no-print">
                    <div className="flex items-center gap-2.5 sm:gap-3">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-teal-700/80 border border-teal-500/40 flex items-center justify-center text-teal-200 shrink-0 shadow-inner">
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
                                    viewMode === 'ditolak' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
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

                        {/* Action Buttons & Zoom */}
                        <div className="flex items-center gap-2 ml-auto flex-wrap">
                            {/* Zoom selector */}
                            <div className="hidden sm:inline-flex items-center gap-1 bg-white border border-slate-300 rounded-xl px-2 py-1 text-slate-700">
                                <i className="bi bi-zoom-in text-slate-400 text-xs"></i>
                                <span className="text-[11px] text-slate-500 font-medium">Zoom:</span>
                                <select
                                    value={zoomLevel}
                                    onChange={(e) => setZoomLevel(e.target.value as any)}
                                    className="text-xs font-bold text-slate-700 bg-transparent outline-none cursor-pointer"
                                >
                                    <option value="100">100%</option>
                                    <option value="90">90%</option>
                                    <option value="80">80%</option>
                                    <option value="fit">Muat Layar</option>
                                </select>
                            </div>

                            {/* Button Edit Catatan */}
                            <button
                                type="button"
                                onClick={() => {
                                    setShowEditNotesPanel(!showEditNotesPanel);
                                    if (showSignatureSettings) setShowSignatureSettings(false);
                                }}
                                className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl font-bold flex items-center gap-1.5 transition-all text-[11px] sm:text-xs border shadow-xs ${
                                    showEditNotesPanel
                                        ? 'bg-amber-100 text-amber-900 border-amber-300 ring-1 ring-amber-400'
                                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                                }`}
                                title="Kustomisasi catatan di bawah tabel"
                            >
                                <i className="bi bi-pencil-square text-amber-600"></i>
                                <span>{showEditNotesPanel ? 'Tutup Catatan' : 'Edit Catatan'}</span>
                            </button>

                            {/* Button Pengaturan TTD */}
                            <button
                                type="button"
                                onClick={() => {
                                    setShowSignatureSettings(!showSignatureSettings);
                                    if (showEditNotesPanel) setShowEditNotesPanel(false);
                                }}
                                className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl font-bold flex items-center gap-1.5 transition-all text-[11px] sm:text-xs border shadow-xs ${
                                    showSignatureSettings
                                        ? 'bg-blue-100 text-blue-900 border-blue-300 ring-1 ring-blue-400'
                                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                                }`}
                                title="Atur Nama Admin & Pimpinan pada Tanda Tangan"
                            >
                                <i className="bi bi-pen-fill text-blue-600"></i>
                                <span>{showSignatureSettings ? 'Tutup TTD' : 'Pengaturan TTD'}</span>
                            </button>

                            {/* Button Cetak / PDF */}
                            <button
                                onClick={handlePrint}
                                className="px-3 sm:px-4 py-1.5 sm:py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl font-bold flex items-center gap-1.5 sm:gap-2 transition-all shadow-xs active:scale-95 text-[11px] sm:text-xs"
                                title="Cetak lembar dokumen resmi tanpa UI aplikasi"
                            >
                                <i className="bi bi-printer-fill text-sm"></i>
                                <span>Cetak / Simpan PDF</span>
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

                {/* SIGNATURE CONFIGURATION PANEL (Admin & Pimpinan) */}
                {showSignatureSettings && (
                    <div className="bg-blue-50/95 border-b-2 border-blue-300 p-3 sm:p-4 text-xs shrink-0 max-h-[50vh] overflow-y-auto custom-scrollbar shadow-inner no-print">
                        <div className="flex items-center justify-between border-b border-blue-200 pb-2 mb-3">
                            <div className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs shrink-0 shadow-xs">
                                    <i className="bi bi-pen-fill"></i>
                                </span>
                                <div>
                                    <h4 className="font-bold text-xs sm:text-sm text-blue-950">Pengaturan Tanda Tangan Dokumen Pengumuman</h4>
                                    <p className="text-[10px] sm:text-[11px] text-blue-800">Ketik nama dan jabatan Ketua Panitia / Admin PSB serta Pimpinan yang tercetak di dokumen</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {isSavedMessage && (
                                    <span className="text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded text-[11px] flex items-center gap-1 animate-pulse">
                                        <i className="bi bi-check-circle-fill"></i> Tersimpan sebagai default!
                                    </span>
                                )}
                                <button
                                    type="button"
                                    onClick={handleSaveAsDefault}
                                    className="px-3 py-1 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-bold text-[11px] flex items-center gap-1 shadow-xs transition-colors"
                                    title="Simpan pengaturan nama dan jabatan ini agar otomatis terisi di masa mendatang"
                                >
                                    <i className="bi bi-bookmark-check-fill"></i> Simpan Default
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowSignatureSettings(false)}
                                    className="text-blue-700 hover:bg-blue-200/60 p-1.5 rounded-lg transition-colors"
                                    title="Tutup Panel"
                                >
                                    <i className="bi bi-x-lg text-xs"></i>
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {/* Admin / Ketua Panitia */}
                            <div className="bg-white p-3 rounded-xl border border-blue-200 shadow-2xs space-y-2">
                                <span className="font-bold text-blue-950 text-xs flex items-center gap-1">
                                    <i className="bi bi-person-badge-fill text-blue-600"></i> Sisi Kiri: Ketua Panitia / Admin PSB
                                </span>
                                <div>
                                    <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">Nama Lengkap & Gelar</label>
                                    <input
                                        type="text"
                                        value={adminName}
                                        onChange={(e) => setAdminName(e.target.value)}
                                        placeholder="Contoh: Ust. H. Ahmad Fauzi, M.Pd"
                                        className="w-full bg-slate-50 border border-gray-300 rounded-lg p-1.5 text-xs text-gray-800 focus:bg-white focus:border-blue-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">Jabatan Penandatangan</label>
                                    <input
                                        type="text"
                                        value={adminJabatan}
                                        onChange={(e) => setAdminJabatan(e.target.value)}
                                        placeholder="Ketua Panitia PSB / Admin PSB"
                                        className="w-full bg-slate-50 border border-gray-300 rounded-lg p-1.5 text-xs text-gray-800 focus:bg-white focus:border-blue-500 outline-none"
                                    />
                                </div>
                            </div>

                            {/* Pimpinan / Mudir */}
                            <div className="bg-white p-3 rounded-xl border border-blue-200 shadow-2xs space-y-2">
                                <span className="font-bold text-blue-950 text-xs flex items-center gap-1">
                                    <i className="bi bi-person-check-fill text-blue-600"></i> Sisi Kanan: Pimpinan / Mudir 'Aam
                                </span>
                                <div>
                                    <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">Nama Pimpinan & Gelar</label>
                                    <input
                                        type="text"
                                        value={pimpinanName}
                                        onChange={(e) => setPimpinanName(e.target.value)}
                                        placeholder="Contoh: KH. Abdullah Faqih, Lc"
                                        className="w-full bg-slate-50 border border-gray-300 rounded-lg p-1.5 text-xs text-gray-800 focus:bg-white focus:border-blue-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">Jabatan Pimpinan</label>
                                    <input
                                        type="text"
                                        value={pimpinanJabatan}
                                        onChange={(e) => setPimpinanJabatan(e.target.value)}
                                        placeholder="Pimpinan Pondok Pesantren"
                                        className="w-full bg-slate-50 border border-gray-300 rounded-lg p-1.5 text-xs text-gray-800 focus:bg-white focus:border-blue-500 outline-none"
                                    />
                                </div>
                            </div>

                            {/* Lokasi & Kota */}
                            <div className="bg-white p-3 rounded-xl border border-blue-200 shadow-2xs space-y-2 sm:col-span-2 lg:col-span-1">
                                <span className="font-bold text-blue-950 text-xs flex items-center gap-1">
                                    <i className="bi bi-geo-alt-fill text-blue-600"></i> Lokasi Penetapan Dokumen
                                </span>
                                <div>
                                    <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">Kota / Lokasi Dokumen</label>
                                    <input
                                        type="text"
                                        value={tempatCetak}
                                        onChange={(e) => setTempatCetak(e.target.value)}
                                        placeholder="Contoh: Jombang, Jawa Timur"
                                        className="w-full bg-slate-50 border border-gray-300 rounded-lg p-1.5 text-xs text-gray-800 focus:bg-white focus:border-blue-500 outline-none"
                                    />
                                </div>
                                <p className="text-[10px] text-gray-500 mt-1">
                                    Tanggal penetapan otomatis mengikuti hari ini: <strong>{todayFormatted}</strong>
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Expandable Notes Editor Panel */}
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
                                        className="text-[11px] bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-300 px-2 py-0.5 rounded-lg flex items-center gap-1"
                                    >
                                        <i className="bi bi-plus-lg"></i> Tambah Poin
                                    </button>
                                </div>
                                <div className="space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar pr-1">
                                    {notesDiterima.map((pt, idx) => (
                                        <div key={idx} className="flex items-start gap-1.5">
                                            <span className="text-[11px] font-bold text-teal-800 mt-1">{idx + 1}.</span>
                                            <textarea
                                                rows={2}
                                                value={pt}
                                                onChange={(e) => handleUpdateDiterimaPoint(idx, e.target.value)}
                                                className="w-full text-xs p-1.5 bg-white border border-teal-200 rounded-lg focus:border-teal-500 focus:ring-1 focus:ring-teal-200 outline-none text-slate-800"
                                            />
                                            {notesDiterima.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveDiterimaPoint(idx)}
                                                    className="text-red-500 hover:text-red-700 p-1 rounded mt-0.5"
                                                    title="Hapus baris ini"
                                                >
                                                    <i className="bi bi-trash"></i>
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Catatan Santri Cadangan & Ditolak */}
                            <div className="space-y-3">
                                <div className="bg-white/80 p-3 rounded-xl border border-amber-200 shadow-2xs">
                                    <label className="text-xs font-bold text-amber-900 block mb-1 flex items-center gap-1.5">
                                        <i className="bi bi-clock-history text-amber-600"></i>
                                        Keterangan Status Cadangan
                                    </label>
                                    <textarea
                                        rows={2}
                                        value={notesCadangan}
                                        onChange={(e) => setNotesCadangan(e.target.value)}
                                        className="w-full text-xs p-2 bg-white border border-amber-200 rounded-lg focus:border-amber-500 focus:ring-1 focus:ring-amber-200 outline-none text-slate-800"
                                        placeholder="Catatan untuk santri status cadangan..."
                                    />
                                </div>
                                <div className="bg-white/80 p-3 rounded-xl border border-rose-200 shadow-2xs">
                                    <label className="text-xs font-bold text-rose-900 block mb-1 flex items-center gap-1.5">
                                        <i className="bi bi-x-circle text-rose-600"></i>
                                        Pemberitahuan Status Belum Diterima
                                    </label>
                                    <textarea
                                        rows={2}
                                        value={notesDitolak}
                                        onChange={(e) => setNotesDitolak(e.target.value)}
                                        className="w-full text-xs p-2 bg-white border border-rose-200 rounded-lg focus:border-rose-500 focus:ring-1 focus:ring-rose-200 outline-none text-slate-800"
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
                                className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg focus:border-teal-500 focus:ring-1 focus:ring-teal-200 outline-none text-slate-800"
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
                                className="px-4 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-xl font-bold flex items-center gap-1.5 text-xs shadow-xs transition-colors ml-auto"
                            >
                                <i className="bi bi-check2 text-sm"></i>
                                <span>Selesai &amp; Tutup Editor</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* Printable Document Area */}
                <div className="flex-1 min-h-0 overflow-y-auto p-2 sm:p-6 bg-slate-100 flex justify-center custom-scrollbar print-modal-scroll-wrapper">
                    <div
                        id="psb-announcement-sheet"
                        ref={printAreaRef}
                        style={zoomStyle}
                        className="bg-white p-6 sm:p-10 shadow-lg border border-gray-200 w-full max-w-[210mm] text-gray-900 text-xs sm:text-sm print:border-none print:shadow-none print:p-0 print:m-0 shrink-0 transition-transform origin-top"
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
                            <p className="text-xs font-mono font-medium text-gray-700 mt-0.5">
                                Nomor: {suratNumber || '...........................................'}
                            </p>
                            <p className="text-xs sm:text-sm font-semibold text-gray-800 mt-1">
                                TENTANG HASIL SELEKSI PENERIMAAN SANTRI BARU TAHUN AJARAN {yearLabel}
                            </p>
                        </div>

                        {/* KALIMAT PENGANTAR RESMI */}
                        <div className="text-xs text-justify leading-relaxed text-gray-800 mb-4 space-y-2">
                            <p>
                                <em>Bismillaahirrohmaanirrohiim,</em>
                            </p>
                            <p>
                                Berdasarkan hasil rekapitulasi verifikasi berkas, tes seleksi masuk, observasi baca Al-Qur'an, dan rapat pleno Panitia Penerimaan Santri Baru (PSB) Pondok Pesantren <strong>{settings.namaPonpes || 'Pesantren'}</strong> Tahun Ajaran <strong>{yearLabel}</strong>, dengan ini panitia menetapkan hasil seleksi calon santri baru sebagaimana tercantum pada daftar berikut:
                            </p>
                        </div>

                        {/* TABEL DAFTAR HASIL SELEKSI */}
                        <div className="overflow-x-auto mb-6">
                            <table className="w-full border-collapse border border-gray-400 text-xs">
                                <thead>
                                    <tr className="bg-gray-100 font-bold text-gray-900 text-center">
                                        <th className="border border-gray-400 p-1.5 w-8">No</th>
                                        <th className="border border-gray-400 p-1.5 w-24">No. Registrasi</th>
                                        <th className="border border-gray-400 p-1.5">Nama Calon Santri</th>
                                        <th className="border border-gray-400 p-1.5 w-16">L/P</th>
                                        <th className="border border-gray-400 p-1.5 w-28">Jenjang / Jurusan</th>
                                        <th className="border border-gray-400 p-1.5 w-16">Nilai</th>
                                        <th className="border border-gray-400 p-1.5 w-28">Hasil Seleksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {processedList.map((santri, index) => {
                                        const avgScore = calculatePsbAverageScore(santri.nilaiUjian);
                                        const scoreDisplay = avgScore !== null ? avgScore.toFixed(1) : '-';
                                        
                                        let statusColor = 'text-gray-900';
                                        let bgRow = '';
                                        if (santri.status === 'Diterima') {
                                            statusColor = 'font-bold text-emerald-800';
                                            bgRow = 'hover:bg-emerald-50/50';
                                        } else if (santri.status === 'Cadangan') {
                                            statusColor = 'font-bold text-amber-700';
                                            bgRow = 'hover:bg-amber-50/50';
                                        } else if (santri.status === 'Ditolak') {
                                            statusColor = 'font-bold text-rose-700';
                                            bgRow = 'hover:bg-rose-50/50';
                                        }

                                        return (
                                            <tr key={santri.id || index} className={`border-t border-gray-300 ${bgRow}`}>
                                                <td className="border border-gray-400 p-1.5 text-center font-mono">{index + 1}</td>
                                                <td className="border border-gray-400 p-1.5 font-mono text-center">{getPsbRegistrationNumber(santri)}</td>
                                                <td className="border border-gray-400 p-1.5 font-medium">{santri.namaLengkap}</td>
                                                <td className="border border-gray-400 p-1.5 text-center">{santri.jenisKelamin === 'Laki-laki' ? 'L' : 'P'}</td>
                                                <td className="border border-gray-400 p-1.5 text-center">{getJenjangName(santri.jenjangId)}</td>
                                                <td className="border border-gray-400 p-1.5 text-center font-mono">{scoreDisplay}</td>
                                                <td className={`border border-gray-400 p-1.5 text-center uppercase tracking-wide text-[11px] ${statusColor}`}>
                                                    {santri.status}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {processedList.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="border border-gray-400 p-6 text-center text-gray-500 italic">
                                                Tidak ada calon santri yang sesuai kriteria filter saat ini.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* REKAPITULASI HASIL SINGKAT */}
                        <div className="bg-gray-50 border border-gray-300 rounded-lg p-2.5 mb-6 flex flex-wrap justify-between items-center text-xs break-inside-avoid">
                            <div className="flex items-center gap-2">
                                <i className="bi bi-info-circle text-teal-700"></i>
                                <span>
                                    Total Pendaftar Tersaring: <strong>{processedList.length}</strong> orang
                                </span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-emerald-800 font-bold">Diterima: {acceptedList.length}</span>
                                <span className="text-amber-700 font-bold">Cadangan: {waitingList.length}</span>
                                <span className="text-red-700 font-bold">Tidak Diterima: {rejectedList.length}</span>
                            </div>
                        </div>

                        {/* PETUNJUK & CATATAN PENGUMUMAN */}
                        <div className="space-y-3 mb-6 text-xs break-inside-avoid">
                            {/* Petunjuk Diterima */}
                            {(viewMode === 'semua' || viewMode === 'diterima') && notesDiterima.length > 0 && (
                                <div className="border border-emerald-300 bg-emerald-50/50 p-3 rounded-lg">
                                    <h5 className="font-bold text-emerald-950 mb-1 flex items-center gap-1.5">
                                        <i className="bi bi-check-circle-fill text-emerald-600"></i>
                                        Ketentuan &amp; Tata Cara Santri yang Dinyatakan DITERIMA:
                                    </h5>
                                    <ol className="list-decimal pl-5 space-y-1 text-emerald-900 leading-relaxed text-[11px]">
                                        {notesDiterima.map((pt, i) => (
                                            <li key={i}>{pt}</li>
                                        ))}
                                    </ol>
                                </div>
                            )}

                            {/* Petunjuk Cadangan */}
                            {(viewMode === 'semua' || viewMode === 'cadangan') && notesCadangan && (
                                <div className="border border-amber-300 bg-amber-50/50 p-2.5 rounded-lg text-amber-950">
                                    <h5 className="font-bold mb-0.5 flex items-center gap-1.5">
                                        <i className="bi bi-clock-history text-amber-600"></i>
                                        Ketentuan Status CADANGAN:
                                    </h5>
                                    <p className="leading-relaxed text-[11px] pl-5">{notesCadangan}</p>
                                </div>
                            )}

                            {/* Petunjuk Ditolak */}
                            {(viewMode === 'semua' || viewMode === 'ditolak') && notesDitolak && (
                                <div className="text-gray-600 italic text-[11px] leading-relaxed pt-1">
                                    {notesDitolak}
                                </div>
                            )}

                            {/* Catatan Tambahan Panitia */}
                            {customAdditionalNotes && (
                                <div className="border-t border-dashed border-gray-300 pt-2 text-[11px] text-gray-800">
                                    <strong>Catatan Tambahan Panitia:</strong> {customAdditionalNotes}
                                </div>
                            )}
                        </div>

                        {/* TANDA TANGAN & PENGESAHAN DOKUMEN */}
                        <div className="mt-8 pt-4 border-t border-gray-300 break-inside-avoid">
                            <div className="text-right text-gray-800 mb-4 text-[11px] sm:text-xs">
                                Ditetapkan di: <strong>{tempatCetak || 'Posko PSB Pesantren'}</strong><br />
                                Pada tanggal: {todayFormatted}
                            </div>
                            <div className="grid grid-cols-2 gap-8 text-center text-xs">
                                <div>
                                    <p className="font-semibold text-gray-700 mb-16">
                                        {adminJabatan || 'Ketua Panitia PSB'},
                                    </p>
                                    <p className="font-bold text-gray-900 underline uppercase tracking-wide">
                                        {adminName ? adminName : '( ............................................ )'}
                                    </p>
                                    <p className="text-[10px] text-gray-500 mt-0.5">Admin / Panitia PSB</p>
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-700 mb-16">
                                        Mengetahui,<br />{pimpinanJabatan || 'Pimpinan Pondok Pesantren'}
                                    </p>
                                    <p className="font-bold text-gray-900 underline uppercase tracking-wide">
                                        {pimpinanName ? pimpinanName : '( ............................................ )'}
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
        </div>,
        document.body
    );
};
