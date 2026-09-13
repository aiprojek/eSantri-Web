import React, { useState } from 'react';
import { 
    SuratSignatory, 
    MengetahuiConfig, 
    TempatTanggalConfig, 
    MarginConfig, 
    StampConfig, 
    PondokSettings,
    Santri
} from '../../types';
import { SuratSignatoryEditor } from './SuratSignatoryEditor';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';

interface SuratSettingsDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    nomorSurat: string;
    onNomorSuratChange: (val: string) => void;
    onAutoGenerateNomor: () => void;
    judulSurat: string;
    onJudulSuratChange: (val: string) => void;
    showJudul: boolean;
    onShowJudulChange: (val: boolean) => void;
    tempatSurat: string;
    onTempatSuratChange: (val: string) => void;
    tanggalSurat: string;
    onTanggalSuratChange: (val: string) => void;
    tempatTanggalConfig: TempatTanggalConfig;
    onTempatTanggalConfigChange: (val: TempatTanggalConfig) => void;
    usePrePrintedKop: boolean;
    onUsePrePrintedKopChange: (val: boolean) => void;
    kopMarginTop: number;
    onKopMarginTopChange: (val: number) => void;
    marginConfig: MarginConfig;
    onMarginConfigChange: (val: MarginConfig) => void;
    activeSignatories: SuratSignatory[];
    onSignatoriesChange: (val: SuratSignatory[]) => void;
    mengetahui: MengetahuiConfig;
    onMengetahuiChange: (val: MengetahuiConfig) => void;
    stampConfig: StampConfig;
    onStampConfigChange: (val: StampConfig) => void;
    settings: PondokSettings;
    currentSantri?: Santri;
}

export const SuratSettingsDrawer: React.FC<SuratSettingsDrawerProps> = ({
    isOpen,
    onClose,
    nomorSurat,
    onNomorSuratChange,
    onAutoGenerateNomor,
    judulSurat,
    onJudulSuratChange,
    showJudul,
    onShowJudulChange,
    tempatSurat,
    onTempatSuratChange,
    tanggalSurat,
    onTanggalSuratChange,
    tempatTanggalConfig,
    onTempatTanggalConfigChange,
    usePrePrintedKop,
    onUsePrePrintedKopChange,
    kopMarginTop,
    onKopMarginTopChange,
    marginConfig,
    onMarginConfigChange,
    activeSignatories,
    onSignatoriesChange,
    mengetahui,
    onMengetahuiChange,
    stampConfig,
    onStampConfigChange,
    settings,
    currentSantri
}) => {
    const [activeSection, setActiveSection] = useState<'all' | 'kop' | 'margin' | 'ttd' | 'tanggal'>('all');
    const digitalAssets = useLiveQuery(() => db.digitalAssets.toArray(), []) || [];

    if (!isOpen) return null;

    const parseMarginValue = (value: string, fallback: number) => {
        const parsed = Number.parseFloat(value);
        return Number.isFinite(parsed) ? parsed : fallback;
    };

    const handleAddSignatory = () => {
        if (activeSignatories.length >= 3) return;
        onSignatoriesChange([
            ...activeSignatories,
            { 
                id: `sig-${Date.now()}`, 
                mode: 'auto',
                sourceType: activeSignatories.length === 1 ? 'wali_kelas' : 'guru',
                jabatan: activeSignatories.length === 1 ? 'Wali Kelas' : 'Kepala Madrasah', 
                nama: activeSignatories.length === 1 ? '{WALI_KELAS}' : (settings.tenagaPengajar?.[0]?.nama || 'Nama Pejabat')
            }
        ]);
    };

    const handleRemoveSignatory = (index: number) => {
        if (activeSignatories.length <= 1) return;
        onSignatoriesChange(activeSignatories.filter((_, i) => i !== index));
    };

    return (
        <div className="fixed inset-0 z-[150] overflow-hidden">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-slate-900/30 backdrop-blur-[2px] transition-opacity"
                onClick={onClose}
            />

            {/* Sliding Panel */}
            <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
                <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col h-full border-l border-slate-200">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-app-border bg-slate-50/80 px-6 py-4">
                        <div className="flex items-center gap-2.5">
                            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-100 text-teal-700">
                                <i className="bi bi-sliders text-base"></i>
                            </span>
                            <div>
                                <h3 className="text-base font-bold text-slate-900">Format & Dokumen Surat</h3>
                                <p className="text-[11px] text-slate-500">Margin, penanda tangan, kop fisik, dan tanggal</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="app-button-ghost h-8 w-8 rounded-full p-0 text-slate-400 hover:text-slate-600"
                        >
                            <i className="bi bi-x-lg"></i>
                        </button>
                    </div>

                    {/* Body scrollable content */}
                    <div className="app-scrollbar flex-1 overflow-y-auto p-6 space-y-6">
                        {/* Section 1: Nomor & Judul Surat */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                                    <i className="bi bi-hash text-teal-600"></i> Nomor Surat
                                </label>
                                <button
                                    type="button"
                                    onClick={onAutoGenerateNomor}
                                    className="text-[11px] font-semibold text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 px-2 py-0.5 rounded-lg flex items-center gap-1 border border-teal-200/60"
                                >
                                    <i className="bi bi-magic"></i> Auto No.
                                </button>
                            </div>
                            <input
                                type="text"
                                value={nomorSurat}
                                onChange={e => onNomorSuratChange(e.target.value)}
                                placeholder="cth: 001/SKA/PST/IX/2026"
                                className="app-input w-full p-2.5 text-xs font-mono rounded-xl"
                            />

                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="text-xs font-bold uppercase tracking-wider text-slate-600">Judul / Perihal</label>
                                    <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={showJudul}
                                            onChange={e => onShowJudulChange(e.target.checked)}
                                            className="w-3.5 h-3.5 text-teal-600 rounded"
                                        />
                                        <span className="text-[11px]">Tampilkan Judul</span>
                                    </label>
                                </div>
                                <input
                                    type="text"
                                    value={judulSurat}
                                    onChange={e => onJudulSuratChange(e.target.value)}
                                    placeholder="SURAT KETERANGAN AKTIF BELAJAR"
                                    className="app-input w-full p-2 text-xs font-semibold uppercase rounded-xl"
                                />
                            </div>
                        </div>

                        {/* Section 2: Mode Kertas Kop Fisik (Pre-printed blanko) */}
                        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                                        <i className="bi bi-file-earmark-ruled text-amber-700"></i>
                                        <span>Kertas Kop Blanko Fisik</span>
                                    </div>
                                    <p className="text-[11px] text-amber-700/90 mt-0.5 leading-snug">
                                        Sembunyikan kop digital jika dicetak di atas kertas berkop cetakan resmi.
                                    </p>
                                </div>
                                <label className="relative inline-flex cursor-pointer items-center shrink-0">
                                    <input
                                        type="checkbox"
                                        checked={usePrePrintedKop}
                                        onChange={e => onUsePrePrintedKopChange(e.target.checked)}
                                        className="peer sr-only"
                                    />
                                    <div className="peer h-5 w-9 rounded-full bg-slate-300 after:absolute after:top-[2px] after:left-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-amber-600 peer-checked:after:translate-x-full peer-focus:outline-none"></div>
                                </label>
                            </div>

                            {usePrePrintedKop && (
                                <div className="pt-2.5 border-t border-amber-200/80 flex items-center justify-between text-xs">
                                    <span className="text-[11px] font-medium text-amber-900">Jarak atas kop fisik:</span>
                                    <div className="flex items-center gap-1.5">
                                        <input
                                            type="number"
                                            step="0.5"
                                            min="2"
                                            max="10"
                                            value={kopMarginTop}
                                            onChange={e => onKopMarginTopChange(parseFloat(e.target.value) || 4.0)}
                                            className="app-input w-16 p-1 text-center text-xs rounded-lg font-bold"
                                        />
                                        <span className="text-xs text-amber-800">cm</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Section 3: Tempat & Tanggal Surat */}
                        <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                                    <i className="bi bi-calendar-event text-teal-600"></i> Tempat & Tanggal
                                </h4>
                                <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={tempatTanggalConfig.show}
                                        onChange={e => onTempatTanggalConfigChange({ ...tempatTanggalConfig, show: e.target.checked })}
                                        className="w-3.5 h-3.5 text-teal-600 rounded"
                                    />
                                    <span className="text-[11px]">Tampilkan</span>
                                </label>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-[10px] text-slate-500 font-semibold mb-1">Kota / Tempat</label>
                                    <input
                                        type="text"
                                        value={tempatSurat}
                                        onChange={e => onTempatSuratChange(e.target.value)}
                                        className="app-input w-full p-2 text-xs rounded-xl"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] text-slate-500 font-semibold mb-1">Tanggal Surat</label>
                                    <input
                                        type="date"
                                        value={tanggalSurat}
                                        onChange={e => onTanggalSuratChange(e.target.value)}
                                        className="app-input w-full p-2 text-xs rounded-xl"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60 text-xs">
                                <div>
                                    <label className="block text-[10px] text-slate-500 font-semibold mb-1">Posisi Tanggal</label>
                                    <select
                                        value={tempatTanggalConfig.position}
                                        onChange={e => onTempatTanggalConfigChange({ ...tempatTanggalConfig, position: e.target.value as any })}
                                        className="app-select w-full p-1.5 text-xs rounded-xl"
                                    >
                                        <option value="top-right">Atas Kanan</option>
                                        <option value="bottom-right">Bawah Kanan (Sebelum TTD)</option>
                                        <option value="bottom-left">Bawah Kiri</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] text-slate-500 font-semibold mb-1">Perataan Teks</label>
                                    <select
                                        value={tempatTanggalConfig.align}
                                        onChange={e => onTempatTanggalConfigChange({ ...tempatTanggalConfig, align: e.target.value as any })}
                                        className="app-select w-full p-1.5 text-xs rounded-xl"
                                    >
                                        <option value="right">Rata Kanan</option>
                                        <option value="center">Tengah</option>
                                        <option value="left">Rata Kiri</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Section 4: Margin Kertas (cm) */}
                        <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-1.5">
                                <i className="bi bi-aspect-ratio text-teal-600"></i> Margin Kertas (cm)
                            </h4>
                            <div className="grid grid-cols-4 gap-2 text-center">
                                <div>
                                    <label className="block text-[10px] text-slate-500 mb-1">Atas</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={marginConfig.top}
                                        onChange={e => onMarginConfigChange({ ...marginConfig, top: parseMarginValue(e.target.value, marginConfig.top) })}
                                        className="app-input w-full p-1.5 text-center text-xs rounded-xl font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] text-slate-500 mb-1">Kanan</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={marginConfig.right}
                                        onChange={e => onMarginConfigChange({ ...marginConfig, right: parseMarginValue(e.target.value, marginConfig.right) })}
                                        className="app-input w-full p-1.5 text-center text-xs rounded-xl font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] text-slate-500 mb-1">Bawah</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={marginConfig.bottom}
                                        onChange={e => onMarginConfigChange({ ...marginConfig, bottom: parseMarginValue(e.target.value, marginConfig.bottom) })}
                                        className="app-input w-full p-1.5 text-center text-xs rounded-xl font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] text-slate-500 mb-1">Kiri</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={marginConfig.left}
                                        onChange={e => onMarginConfigChange({ ...marginConfig, left: parseMarginValue(e.target.value, marginConfig.left) })}
                                        className="app-input w-full p-1.5 text-center text-xs rounded-xl font-bold"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Section 5: Penanda Tangan Surat */}
                        <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                                        <i className="bi bi-pen text-teal-600"></i> Penanda Tangan ({activeSignatories.length}/3)
                                    </h4>
                                    <p className="text-[11px] text-slate-500">Opsi otomatis (data staf & pimpinan) atau tulis manual</p>
                                </div>
                                {activeSignatories.length < 3 && (
                                    <button
                                        type="button"
                                        onClick={handleAddSignatory}
                                        className="text-[11px] font-semibold text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 px-2.5 py-1 rounded-lg border border-teal-200/60 flex items-center gap-1 transition-colors"
                                    >
                                        <i className="bi bi-plus-lg"></i> Tambah
                                    </button>
                                )}
                            </div>

                            <div className="space-y-3">
                                {activeSignatories.map((sig, index) => (
                                    <SuratSignatoryEditor
                                        key={sig.id || `sig-${index}`}
                                        signatory={sig}
                                        index={index}
                                        totalSignatories={activeSignatories.length}
                                        settings={settings}
                                        currentSantri={currentSantri}
                                        digitalAssets={digitalAssets}
                                        onChange={updated => {
                                            const copy = [...activeSignatories];
                                            copy[index] = updated;
                                            onSignatoriesChange(copy);
                                        }}
                                        onRemove={() => handleRemoveSignatory(index)}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Section 6: Bagian Mengetahui (Opsional) */}
                        <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                                        <i className="bi bi-person-check text-teal-600"></i> Bagian Mengetahui
                                    </h4>
                                    <p className="text-[11px] text-slate-500">Wali santri / pimpinan pondok</p>
                                </div>
                                <label className="relative inline-flex cursor-pointer items-center shrink-0">
                                    <input
                                        type="checkbox"
                                        checked={mengetahui.show}
                                        onChange={e => onMengetahuiChange({ ...mengetahui, show: e.target.checked })}
                                        className="peer sr-only"
                                    />
                                    <div className="peer h-5 w-9 rounded-full bg-slate-300 after:absolute after:top-[2px] after:left-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-teal-600 peer-checked:after:translate-x-full peer-focus:outline-none"></div>
                                </label>
                            </div>

                            {mengetahui.show && (
                                <div className="space-y-2.5 pt-2 border-t border-slate-200/60">
                                    <div>
                                        <label className="block text-[10px] text-slate-500 font-semibold mb-1">Pilihan Cepat Teks</label>
                                        <div className="flex flex-wrap gap-1 mb-2">
                                            {[
                                                'Mengetahui, Orang Tua / Wali Santri',
                                                'Mengetahui, Pimpinan Pondok Pesantren',
                                                'Mengetahui, Wali Kelas',
                                                'Mengetahui, Musyrif Asrama'
                                            ].map(preset => (
                                                <button
                                                    key={preset}
                                                    type="button"
                                                    onClick={() => onMengetahuiChange({ ...mengetahui, jabatan: preset })}
                                                    className={`text-[10px] px-2 py-0.5 rounded-lg border transition-colors ${
                                                        mengetahui.jabatan === preset
                                                            ? 'bg-teal-50 border-teal-400 text-teal-900 font-bold'
                                                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                                    }`}
                                                >
                                                    {preset.replace('Mengetahui, ', '')}
                                                </button>
                                            ))}
                                        </div>
                                        <input
                                            type="text"
                                            value={mengetahui.jabatan}
                                            onChange={e => onMengetahuiChange({ ...mengetahui, jabatan: e.target.value })}
                                            placeholder="Mengetahui, Orang Tua / Wali Santri"
                                            className="app-input w-full p-2 text-xs rounded-xl"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-slate-500 font-semibold mb-1">Perataan</label>
                                        <select
                                            value={mengetahui.align}
                                            onChange={e => onMengetahuiChange({ ...mengetahui, align: e.target.value as any })}
                                            className="app-select w-full p-2 text-xs rounded-xl"
                                        >
                                            <option value="left">Rata Kiri</option>
                                            <option value="center">Tengah</option>
                                            <option value="right">Rata Kanan</option>
                                        </select>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Section 7: Stempel Lembaga */}
                        <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                                        <i className="bi bi-patch-check text-teal-600"></i> Stempel Digital
                                    </h4>
                                    <p className="text-[11px] text-slate-500">Tampilkan stempel resmi pondok</p>
                                </div>
                                <label className="relative inline-flex cursor-pointer items-center shrink-0">
                                    <input
                                        type="checkbox"
                                        checked={stampConfig.show}
                                        onChange={e => onStampConfigChange({ 
                                            ...stampConfig, 
                                            show: e.target.checked, 
                                            stampUrl: e.target.checked ? (stampConfig.stampUrl || settings.stempelPonpesUrl || settings.logoPonpesUrl) : undefined 
                                        })}
                                        className="peer sr-only"
                                    />
                                    <div className="peer h-5 w-9 rounded-full bg-slate-300 after:absolute after:top-[2px] after:left-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-teal-600 peer-checked:after:translate-x-full peer-focus:outline-none"></div>
                                </label>
                            </div>

                            {stampConfig.show && (
                                <div className="space-y-2 pt-2 border-t border-slate-200/60">
                                    {digitalAssets.some(a => a.type === 'stempel') && (
                                        <div>
                                            <label className="block text-[10px] text-slate-500 font-semibold mb-1">
                                                Pilih Stempel Tersimpan
                                            </label>
                                            <select
                                                value={stampConfig.stampUrl || ''}
                                                onChange={e => onStampConfigChange({ ...stampConfig, stampUrl: e.target.value })}
                                                className="app-select w-full p-2 text-xs rounded-xl"
                                            >
                                                {settings.stempelPonpesUrl && (
                                                    <option value={settings.stempelPonpesUrl}>Stempel Utama (Pengaturan Umum)</option>
                                                )}
                                                {digitalAssets.filter(a => a.type === 'stempel').map(asset => (
                                                    <option key={asset.id} value={asset.base64Image}>
                                                        {asset.namaPemilik || 'Stempel Lembaga'}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="border-t border-app-border bg-slate-50 px-6 py-3.5 flex justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            className="app-button-primary px-5 py-2 text-xs rounded-xl font-semibold shadow-xs"
                        >
                            Terapkan & Tutup
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
