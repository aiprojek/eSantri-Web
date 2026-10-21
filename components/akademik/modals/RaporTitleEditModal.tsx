import React, { useState, useEffect } from 'react';
import { RaporTemplate, PondokSettings, RaporSheet } from '../../../types';
import { getTemplateSheets } from '../../../services/raporExcelService';

interface RaporTitleEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    template: RaporTemplate | null | undefined;
    settings: PondokSettings;
    selectedSheetId?: string;
    onSave: (customTitle: string, showJudul: boolean, targetSheet: 'all' | string) => Promise<void>;
    showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const RaporTitleEditModal: React.FC<RaporTitleEditModalProps> = ({
    isOpen,
    onClose,
    template,
    settings,
    selectedSheetId = 'all',
    onSave,
    showToast
}) => {
    const [titleText, setTitleText] = useState('');
    const [showJudul, setShowJudul] = useState(true);
    const [targetSheet, setTargetSheet] = useState<'all' | string>('all');
    const [isSaving, setIsSaving] = useState(false);

    const sheets: RaporSheet[] = template ? getTemplateSheets(template) : [];
    const activeSheet = (selectedSheetId !== 'all' ? sheets.find((s: RaporSheet) => s.id === selectedSheetId) : null) || sheets[0];

    useEffect(() => {
        if (isOpen && template) {
            const currentSheet = (selectedSheetId !== 'all' ? sheets.find((s: RaporSheet) => s.id === selectedSheetId) : null) || sheets[0];
            const initialTitle = currentSheet?.customTitle !== undefined
                ? currentSheet.customTitle
                : (template.customTitle !== undefined
                    ? template.customTitle
                    : (currentSheet?.name || template.name || ''));

            setTitleText(initialTitle);
            setShowJudul(currentSheet?.showJudul !== undefined ? currentSheet.showJudul : (template.showJudul !== false));
            setTargetSheet(selectedSheetId !== 'all' ? selectedSheetId : 'all');
        }
    }, [isOpen, template, selectedSheetId]);

    if (!isOpen || !template) return null;

    const handleInsertTag = (tag: string) => {
        setTitleText(prev => {
            if (!prev) return tag;
            return prev.endsWith('\n') || prev.endsWith(' ') ? prev + tag : prev + ' ' + tag;
        });
    };

    const handleApplyPreset = (presetText: string) => {
        setTitleText(presetText);
        setShowJudul(true);
        showToast('Preset judul diterapkan!', 'info');
    };

    const handleSave = async () => {
        try {
            setIsSaving(true);
            await onSave(titleText, showJudul, targetSheet);
            onClose();
        } catch (err: any) {
            showToast('Gagal menyimpan: ' + (err?.message || 'Terjadi kesalahan'), 'error');
        } finally {
            setIsSaving(false);
        }
    };

    // Live preview parsing tags with dummy data
    const previewLines = titleText
        .replace(/\$SEMESTER/gi, 'Ganjil')
        .replace(/\$TAHUN_AJARAN/gi, '2024/2025')
        .replace(/\$TAHUN_AJAR/gi, '2024/2025')
        .replace(/\$ROMBEL/gi, 'Kelas 1-A')
        .replace(/\$KELAS/gi, '1-A')
        .replace(/\$NAMA_PONPES/gi, settings.namaPonpes || 'PONDOK PESANTREN')
        .replace(/\$TAHUN_HIJRIYAH/gi, '1445-1446 H')
        .split('\n')
        .map(l => l.trim())
        .filter(Boolean);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]">
                {/* Header */}
                <div className="px-5 py-4 bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 text-white flex items-center justify-between shadow-xs">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-lg">
                            <i className="bi bi-card-heading"></i>
                        </div>
                        <div>
                            <h3 className="font-black text-sm sm:text-base leading-tight">
                                Atur Judul Resmi Dokumen Rapor
                            </h3>
                            <p className="text-[11px] text-amber-100 font-medium leading-tight">
                                Mendukung teks 1 sampai 3 baris resmi di bawah Kop Dokumen
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all"
                    >
                        <i className="bi bi-x-lg text-sm"></i>
                    </button>
                </div>

                {/* Body Content */}
                <div className="p-5 overflow-y-auto space-y-4 text-xs text-slate-700 flex-1">
                    {/* Kotak Edukasi / Penjelasan */}
                    <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-3">
                        <i className="bi bi-info-circle-fill text-amber-600 text-base shrink-0 mt-0.5"></i>
                        <div className="space-y-1">
                            <p className="font-bold text-amber-950">
                                Mengapa Judul Rapor Sebaiknya Tidak Diambil Dari Nama Sheet?
                            </p>
                            <p className="text-amber-900 leading-relaxed text-[11px]">
                                Excel membatasi nama sheet maksimal <strong>31 karakter</strong> dan <strong>tidak mengizinkan baris baru (Enter)</strong>.
                                Oleh karena itu, nama sheet di Excel cukup dibuat singkat (misal: <em>Akademik</em>, <em>Tahfidz</em>, <em>Hal 1</em>), sedangkan judul resmi yang dicetak 1-3 baris diatur pada kolom di bawah ini.
                            </p>
                        </div>
                    </div>

                    {/* Toggle Aktif / Nonaktifkan Judul */}
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <div className="space-y-0.5">
                            <label className="font-bold text-slate-800 text-xs flex items-center gap-1.5 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={showJudul}
                                    onChange={e => setShowJudul(e.target.checked)}
                                    className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                                />
                                <span>Tampilkan Judul di Bawah Kop Surat</span>
                            </label>
                            <p className="text-[11px] text-slate-500 pl-5.5">
                                Nonaktifkan jika judul sudah didesain menyatu di dalam sel tabel Excel.
                            </p>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            showJudul ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                        }`}>
                            {showJudul ? 'Aktif' : 'Nonaktif'}
                        </span>
                    </div>

                    {showJudul && (
                        <>
                            {/* Input Textarea Multi-line */}
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <label className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                                        Teks Judul Rapor (Tekan Enter untuk Baris Baru)
                                    </label>
                                    <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                                        Maksimal 3 Baris Ideal
                                    </span>
                                </div>
                                <textarea
                                    rows={4}
                                    value={titleText}
                                    onChange={e => setTitleText(e.target.value)}
                                    placeholder={`Contoh 3 Baris:\nLAPORAN HASIL EVALUASI BELAJAR (RAPOR)\nMADRASAH DINIYAH TAKMILIYAH AWALIYAH\nSEMESTER $SEMESTER TAHUN AJARAN $TAHUN_AJARAN`}
                                    className="w-full border-2 border-amber-300/80 focus:border-amber-500 rounded-xl p-3 text-xs font-mono font-medium text-slate-900 bg-amber-50/20 focus:bg-white outline-none leading-relaxed transition-all"
                                />
                            </div>

                            {/* Preset 1-Klik */}
                            <div className="space-y-1.5">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                    Pilihan Preset Cepat (1-Klik):
                                </span>
                                <div className="flex flex-wrap gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => handleApplyPreset(`LAPORAN HASIL EVALUASI BELAJAR (RAPOR)\n${settings.namaPonpes || 'PONDOK PESANTREN'}\nSEMESTER $SEMESTER TAHUN AJARAN $TAHUN_AJARAN`)}
                                        className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1"
                                    >
                                        <i className="bi bi-magic text-amber-600"></i>
                                        <span>+ 3 Baris Resmi MDTA / Ponpes</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleApplyPreset(`RAPOR HASIL BELAJAR SANTRI\nSEMESTER $SEMESTER TAHUN AJARAN $TAHUN_AJARAN`)}
                                        className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[10px] font-bold transition-all"
                                    >
                                        + 2 Baris Ringkas
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleApplyPreset(`HASIL PENILAIAN AKHIR SEMESTER (PAS)\n${settings.namaPonpes || 'MADRASAH DINIYAH'}\nTAHUN PENDIDIKAN $TAHUN_AJARAN`)}
                                        className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[10px] font-bold transition-all"
                                    >
                                        + Penilaian Akhir (PAS)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleApplyPreset(activeSheet?.name || template.name)}
                                        className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-lg text-[10px] font-medium transition-all"
                                    >
                                        Gunakan Nama Sheet
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setTitleText(''); setShowJudul(false); }}
                                        className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-[10px] font-medium transition-all"
                                    >
                                        Kosongkan
                                    </button>
                                </div>
                            </div>

                            {/* Tag Variabel Otomatis */}
                            <div className="space-y-1.5 p-3 bg-slate-50 rounded-xl border border-slate-200">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                                    Klik Variabel untuk Menyisipkan ke Judul:
                                </span>
                                <div className="flex flex-wrap gap-1.5">
                                    {[
                                        { tag: '$SEMESTER', desc: 'Semester Ganjil/Genap' },
                                        { tag: '$TAHUN_AJARAN', desc: 'Tahun Ajaran' },
                                        { tag: '$ROMBEL', desc: 'Nama Rombel' },
                                        { tag: '$KELAS', desc: 'Tingkat Kelas' },
                                        { tag: '$NAMA_PONPES', desc: 'Nama Pesantren' },
                                        { tag: '$TAHUN_HIJRIYAH', desc: 'Tahun Hijriyah' }
                                    ].map(item => (
                                        <button
                                            key={item.tag}
                                            type="button"
                                            onClick={() => handleInsertTag(item.tag)}
                                            className="px-2 py-0.5 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded text-[10px] font-mono font-bold transition-all"
                                            title={item.desc}
                                        >
                                            + {item.tag}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Live Preview Tampilan Cetak */}
                            <div className="space-y-1.5">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                    Pratinjau Hasil Cetak di Bawah Kop:
                                </span>
                                <div className="p-4 bg-white border border-slate-300 rounded-xl shadow-inner text-center space-y-1">
                                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest border-b border-dashed border-slate-200 pb-2 mb-2">
                                        --- [ AREA KOP SURAT PONPES ] ---
                                    </div>
                                    {previewLines.length > 0 ? (
                                        previewLines.map((line, idx) => (
                                            <div
                                                key={idx}
                                                className={`${
                                                    idx === 0
                                                        ? 'text-sm font-black text-slate-950 tracking-wider'
                                                        : 'text-xs font-bold text-slate-800'
                                                } uppercase leading-tight`}
                                            >
                                                {line}
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-slate-400 italic text-[11px]">
                                            (Belum ada judul. Teks akan diambil dari nama sheet atau kosong jika dinonaktifkan)
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}

                    {/* Cakupan Lembar / Sheet Scope (Jika Multi-Sheet) */}
                    {sheets.length > 1 && (
                        <div className="space-y-1.5 pt-2 border-t border-slate-200">
                            <label className="font-bold text-slate-800 text-xs uppercase tracking-wider block">
                                Terapkan Judul Ke Lembar:
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <label className="flex items-center gap-2 p-2.5 bg-white border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50">
                                    <input
                                        type="radio"
                                        name="targetSheetScope"
                                        value="all"
                                        checked={targetSheet === 'all'}
                                        onChange={() => setTargetSheet('all')}
                                        className="text-amber-600 focus:ring-amber-500"
                                    />
                                    <div>
                                        <div className="font-bold text-xs text-slate-800">Semua Lembar ({sheets.length})</div>
                                        <div className="text-[10px] text-slate-500">Judul sama untuk semua lembar cetak</div>
                                    </div>
                                </label>
                                <label className="flex items-center gap-2 p-2.5 bg-white border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50">
                                    <input
                                        type="radio"
                                        name="targetSheetScope"
                                        value={activeSheet?.id || ''}
                                        checked={targetSheet !== 'all'}
                                        onChange={() => setTargetSheet(activeSheet?.id || 'sheet_0')}
                                        className="text-amber-600 focus:ring-amber-500"
                                    />
                                    <div>
                                        <div className="font-bold text-xs text-slate-800">Hanya Lembar Ini</div>
                                        <div className="text-[10px] text-slate-500">{activeSheet?.name || 'Lembar Aktif'}</div>
                                    </div>
                                </label>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Buttons */}
                <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition-all"
                    >
                        Batal
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
                    >
                        {isSaving ? (
                            <>
                                <span className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full"></span>
                                <span>Menyimpan...</span>
                            </>
                        ) : (
                            <>
                                <i className="bi bi-floppy"></i>
                                <span>Simpan Judul Rapor</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
