import React, { useState, useEffect } from 'react';
import { PiketPrintConfig } from '../../../types';

interface PiketSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    config: PiketPrintConfig;
    onSave: (config: PiketPrintConfig) => void;
    defaultKota: string;
    defaultMudir?: string;
}

export const DEFAULT_KETENTUAN_LIST = [
    '1. Muadzin hadir di masjid sekurang-kurangnya 10 menit sebelum waktu adzan tiba.',
    '2. Muadzin langsung mengumandangkan iqomah setelah jeda sholat sunnah qabliyah (3-5 menit).',
    '3. Imam santri bertugas sebagai latihan kepemimpinan ibadah & imam badal apabila Ustadz/Kyai udzur.',
    '4. Petugas yang berhalangan (sakit/izin) wajib melapor ke Pengurus Asrama dan mencari pengganti (badal).'
];

export const PiketSettingsModal: React.FC<PiketSettingsModalProps> = ({
    isOpen,
    onClose,
    config,
    onSave,
    defaultKota,
    defaultMudir = ''
}) => {
    const [tempat, setTempat] = useState(config.tempat || '');
    const [leftTitle, setLeftTitle] = useState(config.leftTitle || 'Pengasuh / Pimpinan Pondok');
    const [leftName, setLeftName] = useState(config.leftName ?? defaultMudir);
    const [rightTitle, setRightTitle] = useState(config.rightTitle || 'Bagian Keasramaan & Ibadah');
    const [rightName, setRightName] = useState(config.rightName || '');
    const [judulKetentuan, setJudulKetentuan] = useState(config.judulKetentuan || 'KETENTUAN PETUGAS SHOLAT FARDHU:');
    const [ketentuanText, setKetentuanText] = useState((config.ketentuanList && config.ketentuanList.length > 0 ? config.ketentuanList : DEFAULT_KETENTUAN_LIST).join('\n'));
    const [showKetentuan, setShowKetentuan] = useState(config.showKetentuan !== false);
    const [showTandaTangan, setShowTandaTangan] = useState(config.showTandaTangan !== false);

    useEffect(() => {
        if (isOpen) {
            setTempat(config.tempat || '');
            setLeftTitle(config.leftTitle || 'Pengasuh / Pimpinan Pondok');
            setLeftName(config.leftName !== undefined ? config.leftName : defaultMudir);
            setRightTitle(config.rightTitle || 'Bagian Keasramaan & Ibadah');
            setRightName(config.rightName || '');
            setJudulKetentuan(config.judulKetentuan || 'KETENTUAN PETUGAS SHOLAT FARDHU:');
            setKetentuanText((config.ketentuanList && config.ketentuanList.length > 0 ? config.ketentuanList : DEFAULT_KETENTUAN_LIST).join('\n'));
            setShowKetentuan(config.showKetentuan !== false);
            setShowTandaTangan(config.showTandaTangan !== false);
        }
    }, [isOpen, config, defaultMudir]);

    if (!isOpen) return null;

    const handleResetDefaults = () => {
        setTempat('');
        setLeftTitle('Pengasuh / Pimpinan Pondok');
        setLeftName(defaultMudir);
        setRightTitle('Bagian Keasramaan & Ibadah');
        setRightName('');
        setJudulKetentuan('KETENTUAN PETUGAS SHOLAT FARDHU:');
        setKetentuanText(DEFAULT_KETENTUAN_LIST.join('\n'));
        setShowKetentuan(true);
        setShowTandaTangan(true);
    };

    const handleSave = () => {
        const lines = ketentuanText
            .split('\n')
            .map(l => l.trim())
            .filter(l => l.length > 0);

        const updated: PiketPrintConfig = {
            tempat: tempat.trim(),
            leftTitle: leftTitle.trim() || 'Pengasuh / Pimpinan Pondok',
            leftName: leftName.trim(),
            rightTitle: rightTitle.trim() || 'Bagian Keasramaan & Ibadah',
            rightName: rightName.trim(),
            judulKetentuan: judulKetentuan.trim() || 'KETENTUAN PETUGAS SHOLAT FARDHU:',
            ketentuanList: lines.length > 0 ? lines : DEFAULT_KETENTUAN_LIST,
            showKetentuan,
            showTandaTangan
        };

        onSave(updated);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl border border-gray-200 overflow-hidden my-6 flex flex-col max-h-[90vh]">
                {/* Modal Header */}
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-teal-50/50">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-xs">
                            <i className="bi bi-sliders2 text-base"></i>
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-gray-800 leading-tight">
                                Pengaturan Cetak & Format Jadwal Piket
                            </h3>
                            <p className="text-xs text-gray-500 mt-0.5">
                                Kustomisasi tempat, pejabat penanda tangan, dan ketentuan sholat.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                        title="Tutup"
                    >
                        <i className="bi bi-x-lg text-sm"></i>
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                    {/* Seksi 1: Tempat Penulisan Surat */}
                    <div className="bg-gray-50/80 p-4 rounded-xl border border-gray-200 space-y-3">
                        <div className="flex items-center gap-2">
                            <i className="bi bi-geo-alt-fill text-teal-600 text-sm"></i>
                            <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wide">
                                Tempat Penulisan Dokumen
                            </h4>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">
                                Kota / Wilayah Surat
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={tempat}
                                    onChange={e => setTempat(e.target.value)}
                                    placeholder={defaultKota}
                                    className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-medium text-gray-800 focus:ring-2 focus:ring-teal-500 outline-none"
                                />
                                {tempat && (
                                    <button
                                        type="button"
                                        onClick={() => setTempat('')}
                                        className="px-2.5 py-2 text-xs font-semibold text-gray-500 hover:text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
                                        title="Kembalikan ke kota default pengaturan pondok"
                                    >
                                        Bawaan ({defaultKota})
                                    </button>
                                )}
                            </div>
                            <p className="text-[11px] text-gray-500 mt-1">
                                Akan dicetak di atas tanggal penulisan surat: <em>&quot;{tempat.trim() || defaultKota}, [Tanggal Cetak]&quot;</em>.
                            </p>
                        </div>
                    </div>

                    {/* Seksi 2: Penanda Tangan Dokumen */}
                    <div className="bg-gray-50/80 p-4 rounded-xl border border-gray-200 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <i className="bi bi-pen-fill text-teal-600 text-sm"></i>
                                <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wide">
                                    Pejabat Penanda Tangan
                                </h4>
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700">
                                <input
                                    type="checkbox"
                                    checked={showTandaTangan}
                                    onChange={e => setShowTandaTangan(e.target.checked)}
                                    className="rounded text-teal-600 focus:ring-teal-500 h-4 w-4"
                                />
                                <span>Cetak Tanda Tangan</span>
                            </label>
                        </div>

                        {showTandaTangan && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1 border-t border-gray-200">
                                {/* Pihak Kiri: Pengasuh */}
                                <div className="space-y-2 bg-white p-3 rounded-lg border border-gray-200">
                                    <div className="text-[11px] font-bold text-teal-800 flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-teal-600"></span>
                                        Pihak Mengetahui (Kiri)
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-semibold text-gray-600 mb-0.5">Jabatan</label>
                                        <input
                                            type="text"
                                            value={leftTitle}
                                            onChange={e => setLeftTitle(e.target.value)}
                                            placeholder="Pengasuh / Pimpinan Pondok"
                                            className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-800 focus:ring-1 focus:ring-teal-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-semibold text-gray-600 mb-0.5">Nama Pejabat</label>
                                        <input
                                            type="text"
                                            value={leftName}
                                            onChange={e => setLeftName(e.target.value)}
                                            placeholder={defaultMudir || 'Nama Pengasuh / Pimpinan'}
                                            className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-800 focus:ring-1 focus:ring-teal-500 outline-none"
                                        />
                                    </div>
                                </div>

                                {/* Pihak Kanan: Bagian Ibadah */}
                                <div className="space-y-2 bg-white p-3 rounded-lg border border-gray-200">
                                    <div className="text-[11px] font-bold text-teal-800 flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-teal-600"></span>
                                        Penanggung Jawab (Kanan)
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-semibold text-gray-600 mb-0.5">Jabatan</label>
                                        <input
                                            type="text"
                                            value={rightTitle}
                                            onChange={e => setRightTitle(e.target.value)}
                                            placeholder="Bagian Keasramaan & Ibadah"
                                            className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-800 focus:ring-1 focus:ring-teal-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-semibold text-gray-600 mb-0.5">Nama Pejabat</label>
                                        <input
                                            type="text"
                                            value={rightName}
                                            onChange={e => setRightName(e.target.value)}
                                            placeholder="Kosongkan untuk titik-titik tanda tangan"
                                            className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-800 focus:ring-1 focus:ring-teal-500 outline-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Seksi 3: Ketentuan Petugas Sholat */}
                    <div className="bg-gray-50/80 p-4 rounded-xl border border-gray-200 space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <i className="bi bi-card-checklist text-teal-600 text-sm"></i>
                                <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wide">
                                    Ketentuan Petugas Sholat
                                </h4>
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700">
                                <input
                                    type="checkbox"
                                    checked={showKetentuan}
                                    onChange={e => setShowKetentuan(e.target.checked)}
                                    className="rounded text-teal-600 focus:ring-teal-500 h-4 w-4"
                                />
                                <span>Cetak Box Ketentuan</span>
                            </label>
                        </div>

                        {showKetentuan && (
                            <div className="space-y-3 pt-1 border-t border-gray-200">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                        Judul Box Ketentuan
                                    </label>
                                    <input
                                        type="text"
                                        value={judulKetentuan}
                                        onChange={e => setJudulKetentuan(e.target.value)}
                                        placeholder="KETENTUAN PETUGAS SHOLAT FARDHU:"
                                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-medium text-gray-800 focus:ring-2 focus:ring-teal-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="block text-xs font-semibold text-gray-700">
                                            Daftar Butir Ketentuan (Satu baris per aturan)
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => setKetentuanText(DEFAULT_KETENTUAN_LIST.join('\n'))}
                                            className="text-[11px] font-semibold text-teal-600 hover:text-teal-800 underline"
                                        >
                                            Reset Ketentuan Standar
                                        </button>
                                    </div>
                                    <textarea
                                        rows={5}
                                        value={ketentuanText}
                                        onChange={e => setKetentuanText(e.target.value)}
                                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-normal text-gray-800 focus:ring-2 focus:ring-teal-500 outline-none font-mono leading-relaxed"
                                        placeholder="Tulis butir-butir ketentuan di sini..."
                                    />
                                    <p className="text-[10.5px] text-gray-500 mt-1">
                                        Setiap baris baru akan otomatis ditampilkan sebagai satu butir tata tertib petugas sholat.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Modal Footer */}
                <div className="px-6 py-3.5 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
                    <button
                        type="button"
                        onClick={handleResetDefaults}
                        className="px-3 py-2 text-xs font-bold text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-xl transition-colors"
                    >
                        Reset ke Bawaan
                    </button>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 rounded-xl transition-colors"
                        >
                            Batal
                        </button>
                        <button
                            type="button"
                            onClick={handleSave}
                            className="px-5 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                        >
                            <i className="bi bi-check-lg"></i>
                            <span>Simpan &amp; Terapkan</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
