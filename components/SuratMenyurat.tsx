import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useAppContext } from '../AppContext';
import { useSantriContext } from '../contexts/SantriContext';
import { 
    SuratTemplate, 
    ArsipSurat, 
    Santri, 
    SuratSignatory, 
    MengetahuiConfig, 
    TempatTanggalConfig, 
    MarginConfig, 
    StampConfig 
} from '../types';
import { generatePdf, printToPdfNative } from '../utils/pdfGenerator';
import { exportToHtml, exportToWord, printPreviewExact } from '../utils/exportUtils';
import { PrintHeader } from './common/PrintHeader';
import { SimpleEditor } from './common/SimpleEditor';
import { generateLetterDraft } from '../services/aiService';
import { SantriFilterBar } from './common/SantriFilterBar';
import { PageHeader } from './common/PageHeader';
import { SectionCard } from './common/SectionCard';
import { EmptyState } from './common/EmptyState';
import { HeaderTabs } from './common/HeaderTabs';
import { DEFAULT_SURAT_TEMPLATES, generateNextNomorSurat } from '../data/suratPresets';
import { SuratVariableChips } from './surat/SuratVariableChips';
import { SuratWhatsAppModal } from './surat/SuratWhatsAppModal';
import { BukuAgendaPrintModal } from './surat/BukuAgendaPrintModal';
import { SuratSantriSelectorModal } from './surat/SuratSantriSelectorModal';
import { SuratSettingsDrawer } from './surat/SuratSettingsDrawer';
import { SuratVariablePopover } from './surat/SuratVariablePopover';
import { SuratSignatoryEditor } from './surat/SuratSignatoryEditor';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { loadXLSX } from '../utils/lazyClientLibs';

// --- Template Modal with Variable Chips & Format Presets ---

const TemplateModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (template: SuratTemplate) => void;
    initialData?: SuratTemplate;
}> = ({ isOpen, onClose, onSave, initialData }) => {
    const { showToast, settings } = useAppContext();
    const digitalAssets = useLiveQuery(() => db.digitalAssets.toArray(), []) || [];
    const [modalTab, setModalTab] = useState<'konten' | 'format'>('konten');
    
    // Core fields
    const [nama, setNama] = useState('');
    const [kategori, setKategori] = useState<SuratTemplate['kategori']>('Resmi');
    const [kodeSurat, setKodeSurat] = useState('SKA');
    const [judul, setJudul] = useState('');
    const [konten, setKonten] = useState('');
    const [aiPrompt, setAiPrompt] = useState('');
    const [isGeneratingAi, setIsGeneratingAi] = useState(false);

    // Format & Signatories Defaults
    const [usePrePrintedKop, setUsePrePrintedKop] = useState(false);
    const [kopMarginTop, setKopMarginTop] = useState(4.0);
    const [signatories, setSignatories] = useState<SuratSignatory[]>([
        { id: 'sig-1', jabatan: 'Pimpinan Pondok Pesantren', nama: '{PIMPINAN_PONDOK}' }
    ]);
    const [mengetahui, setMengetahui] = useState<MengetahuiConfig>({
        show: false,
        jabatan: 'Mengetahui, Orang Tua / Wali',
        align: 'left'
    });
    const [tempatTanggalConfig, setTempatTanggalConfig] = useState<TempatTanggalConfig>({
        show: true,
        position: 'bottom-right',
        align: 'right'
    });
    const [marginConfig, setMarginConfig] = useState<MarginConfig>({
        top: 2, right: 2, bottom: 2, left: 2
    });

    useEffect(() => {
        if (isOpen) {
            setModalTab('konten');
            if (initialData) {
                setNama(initialData.nama);
                setKategori(initialData.kategori);
                setKodeSurat(initialData.kodeSurat || (initialData.kategori === 'Izin' ? 'SIP' : initialData.kategori === 'Pemberitahuan' ? 'UND' : 'SKA'));
                setJudul(initialData.judul);
                setKonten(initialData.konten);
                setUsePrePrintedKop(Boolean(initialData.usePrePrintedKop));
                setKopMarginTop(initialData.kopMarginTop || 4.0);
                setSignatories(initialData.signatories && initialData.signatories.length > 0 ? initialData.signatories : [
                    { id: 'sig-1', mode: 'auto', sourceType: 'mudir', jabatan: 'Pimpinan Pondok Pesantren', nama: '{PIMPINAN_PONDOK}' }
                ]);
                setMengetahui(initialData.mengetahuiConfig || { show: false, jabatan: 'Mengetahui, Orang Tua / Wali', align: 'left' });
                setTempatTanggalConfig(initialData.tempatTanggalConfig || { show: true, position: 'bottom-right', align: 'right' });
                setMarginConfig(initialData.marginConfig || { top: 2, right: 2, bottom: 2, left: 2 });
            } else {
                setNama('');
                setKategori('Resmi');
                setKodeSurat('SKA');
                setJudul('');
                setKonten('');
                setUsePrePrintedKop(false);
                setKopMarginTop(4.0);
                setSignatories([{ id: 'sig-1', mode: 'auto', sourceType: 'mudir', jabatan: 'Pimpinan Pondok Pesantren', nama: '{PIMPINAN_PONDOK}' }]);
                setMengetahui({ show: false, jabatan: 'Mengetahui, Orang Tua / Wali', align: 'left' });
                setTempatTanggalConfig({ show: true, position: 'bottom-right', align: 'right' });
                setMarginConfig({ top: 2, right: 2, bottom: 2, left: 2 });
            }
            setAiPrompt('');
        }
    }, [isOpen, initialData]);

    if (!isOpen) return null;

    const handleSave = () => {
        if (!nama.trim() || !judul.trim()) {
            showToast('Nama dan Judul template wajib diisi', 'error');
            return;
        }
        onSave({
            id: initialData?.id || Date.now(),
            nama: nama.trim(),
            kategori,
            kodeSurat: kodeSurat.trim().toUpperCase() || 'SRT',
            judul: judul.trim(),
            konten,
            usePrePrintedKop,
            kopMarginTop,
            signatories,
            mengetahuiConfig: mengetahui,
            tempatTanggalConfig,
            marginConfig,
            showJudul: true
        });
    };

    const handleAiGenerate = async () => {
        if (!aiPrompt.trim()) return;
        setIsGeneratingAi(true);
        try {
            const result = await generateLetterDraft(aiPrompt);
            setKonten(result);
            showToast('Draft surat berhasil dibuat dengan AI', 'success');
        } catch (error) {
            showToast('Gagal generate draft: ' + (error as Error).message, 'error');
        } finally {
            setIsGeneratingAi(false);
        }
    };

    const handleInsertVariable = (variableKey: string) => {
        setKonten(prev => `${prev} ${variableKey} `);
        showToast(`Variabel ${variableKey} disisipkan ke draft`, 'info');
    };

    const handleAddSignatory = () => {
        if (signatories.length >= 3) {
            showToast('Maksimal 3 penanda tangan', 'info');
            return;
        }
        setSignatories(prev => [
            ...prev,
            { 
                id: `sig-${Date.now()}`, 
                mode: 'auto',
                sourceType: prev.length === 1 ? 'wali_kelas' : 'guru',
                jabatan: prev.length === 1 ? 'Wali Kelas' : 'Kepala Madrasah', 
                nama: prev.length === 1 ? '{WALI_KELAS}' : (settings.tenagaPengajar?.[0]?.nama || 'Nama Pejabat')
            }
        ]);
    };

    const handleRemoveSignatory = (index: number) => {
        if (signatories.length <= 1) {
            showToast('Minimal harus ada 1 penanda tangan', 'info');
            return;
        }
        setSignatories(prev => prev.filter((_, i) => i !== index));
    };

    const handleSignatoryChange = (index: number, field: keyof SuratSignatory, val: string) => {
        setSignatories(prev => {
            const copy = [...prev];
            copy[index] = { ...copy[index], [field]: val };
            return copy;
        });
    };

    return (
        <div className="app-overlay fixed inset-0 z-[220] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="app-modal flex h-[92vh] w-full max-w-4xl flex-col rounded-[28px] bg-white shadow-2xl overflow-hidden border border-slate-200">
                <div className="flex items-center justify-between border-b border-app-border bg-slate-50 px-6 py-4">
                    <div>
                        <div className="app-label mb-0.5 text-xs text-teal-700 font-semibold uppercase tracking-wider">Template Surat</div>
                        <h3 className="text-lg font-bold text-app-text">{initialData ? 'Edit Template Surat' : 'Buat Template Baru'}</h3>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex rounded-xl bg-slate-200/80 p-1 text-xs">
                            <button
                                type="button"
                                onClick={() => setModalTab('konten')}
                                className={`rounded-lg px-3 py-1 font-medium transition-all ${
                                    modalTab === 'konten' ? 'bg-white text-teal-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                <i className="bi bi-file-text mr-1"></i> Isi & Variabel
                            </button>
                            <button
                                type="button"
                                onClick={() => setModalTab('format')}
                                className={`rounded-lg px-3 py-1 font-medium transition-all ${
                                    modalTab === 'format' ? 'bg-white text-teal-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                <i className="bi bi-sliders mr-1"></i> Format & Tanda Tangan
                            </button>
                        </div>
                        <button onClick={onClose} className="app-button-ghost h-9 w-9 rounded-full p-0 text-slate-500">
                            <i className="bi bi-x-lg"></i>
                        </button>
                    </div>
                </div>

                <div className="app-scrollbar flex-grow space-y-4 overflow-y-auto p-6">
                    {modalTab === 'konten' ? (
                        <>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                <div className="sm:col-span-2">
                                    <label className="mb-1 block text-xs font-medium app-text-secondary">Nama Template</label>
                                    <input
                                        type="text"
                                        value={nama}
                                        onChange={e => setNama(e.target.value)}
                                        className="app-input w-full p-2.5 text-sm rounded-xl"
                                        placeholder="cth: Surat Keterangan Santri Aktif"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-medium app-text-secondary">Kode Kategori</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={kodeSurat}
                                            onChange={e => setKodeSurat(e.target.value.toUpperCase())}
                                            className="app-input w-full p-2.5 text-sm font-mono uppercase rounded-xl"
                                            placeholder="cth: SKA"
                                        />
                                        <select
                                            value={kategori}
                                            onChange={e => {
                                                const val = e.target.value as SuratTemplate['kategori'];
                                                setKategori(val);
                                                if (val === 'Izin') setKodeSurat('SIP');
                                                else if (val === 'Pemberitahuan') setKodeSurat('UND');
                                                else if (val === 'Resmi') setKodeSurat('SKA');
                                            }}
                                            className="app-select w-32 p-2.5 text-xs rounded-xl"
                                        >
                                            <option value="Resmi">Resmi</option>
                                            <option value="Pemberitahuan">Pemberitahuan</option>
                                            <option value="Izin">Izin</option>
                                            <option value="Lainnya">Lainnya</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-medium app-text-secondary">Judul Surat / Perihal Kop</label>
                                <input
                                    type="text"
                                    value={judul}
                                    onChange={e => setJudul(e.target.value)}
                                    className="app-input w-full p-2.5 text-sm uppercase font-semibold rounded-xl"
                                    placeholder="cth: SURAT KETERANGAN AKTIF BELAJAR"
                                />
                            </div>

                            {/* AI Draft Generator */}
                            <div className="app-panel-soft rounded-[20px] border border-teal-200 bg-teal-50/40 p-3.5">
                                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-teal-800 flex items-center gap-1.5">
                                    <i className="bi bi-magic text-teal-600"></i> AI Magic Draft Surat
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={aiPrompt}
                                        onChange={e => setAiPrompt(e.target.value)}
                                        className="app-input flex-grow text-xs rounded-xl"
                                        placeholder="cth: Buatkan draf surat izin cuti santri untuk keperluan keluarga..."
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAiGenerate}
                                        disabled={isGeneratingAi}
                                        className="app-button-primary px-4 py-2 text-xs rounded-xl flex items-center gap-1.5 disabled:opacity-50"
                                    >
                                        {isGeneratingAi ? <span className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full"></span> : <i className="bi bi-stars"></i>}
                                        {isGeneratingAi ? 'Menyusun...' : 'Susun Draf'}
                                    </button>
                                </div>
                            </div>

                            {/* Rich Variable Chips */}
                            <SuratVariableChips onInsertVariable={handleInsertVariable} />

                            <div className="flex flex-col">
                                <label className="mb-1 block text-xs font-medium app-text-secondary">Isi Surat (Editor Teks Resmi)</label>
                                <div className="overflow-hidden rounded-[20px] border border-app-border bg-white">
                                    <SimpleEditor value={konten} onChange={setKonten} placeholder="Tulis isi surat di sini atau klik chip variabel di atas..." />
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="space-y-5 text-sm">
                            {/* Pre-printed Letterhead setting */}
                            <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                                            <i className="bi bi-file-earmark-ruled text-base"></i>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-800 text-sm">Mode Kertas Kop Cetak Fisik (Pre-Printed Blanko)</h4>
                                            <p className="text-xs text-slate-500">
                                                Aktifkan jika surat akan dicetak pada kertas yang sudah memiliki cetakan kop logo emas/resmi dari percetakan.
                                            </p>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex cursor-pointer items-center">
                                        <input
                                            type="checkbox"
                                            checked={usePrePrintedKop}
                                            onChange={e => setUsePrePrintedKop(e.target.checked)}
                                            className="peer sr-only"
                                        />
                                        <div className="peer h-6 w-11 rounded-full bg-slate-300 after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-amber-600 peer-checked:after:translate-x-full peer-focus:outline-none"></div>
                                    </label>
                                </div>

                                {usePrePrintedKop && (
                                    <div className="mt-3 pt-3 border-t border-amber-200/60 flex items-center gap-3">
                                        <label className="text-xs font-medium text-slate-700">Margin Jarak Atas Kop Fisik:</label>
                                        <div className="flex items-center gap-1.5">
                                            <input
                                                type="number"
                                                step="0.5"
                                                min="2"
                                                max="8"
                                                value={kopMarginTop}
                                                onChange={e => setKopMarginTop(parseFloat(e.target.value) || 4.0)}
                                                className="app-input w-20 p-1.5 text-center text-xs rounded-lg"
                                            />
                                            <span className="text-xs text-slate-500">cm</span>
                                        </div>
                                        <span className="text-[11px] text-amber-800 italic">
                                            (Kop digital disembunyikan, teks surat otomatis turun sejauh {kopMarginTop} cm)
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Signatories Default */}
                            <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50/50 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="font-bold text-slate-800 text-sm">Penanda Tangan Bawaan (Default Signatories)</h4>
                                        <p className="text-xs text-slate-500">Tersedia opsi otomatis (ambil dari data staf/pondok) atau tulis manual</p>
                                    </div>
                                    {signatories.length < 3 && (
                                        <button
                                            type="button"
                                            onClick={handleAddSignatory}
                                            className="app-button-secondary px-3 py-1.5 text-xs rounded-xl flex items-center gap-1 font-semibold"
                                        >
                                            <i className="bi bi-plus-lg"></i> Tambah Pejabat
                                        </button>
                                    )}
                                </div>

                                <div className="space-y-3">
                                    {signatories.map((sig, idx) => (
                                        <SuratSignatoryEditor
                                            key={sig.id || `sig-${idx}`}
                                            signatory={sig}
                                            index={idx}
                                            totalSignatories={signatories.length}
                                            settings={settings}
                                            digitalAssets={digitalAssets}
                                            onChange={updated => {
                                                const copy = [...signatories];
                                                copy[idx] = updated;
                                                setSignatories(copy);
                                            }}
                                            onRemove={() => handleRemoveSignatory(idx)}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Bagian Mengetahui */}
                            <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50/50">
                                <div className="flex items-center justify-between mb-2">
                                    <div>
                                        <h4 className="font-bold text-slate-800 text-sm">Bagian "Mengetahui" (Opsional)</h4>
                                        <p className="text-xs text-slate-500">Tampilkan ttd wali santri, kepala asrama, atau ketua yayasan</p>
                                    </div>
                                    <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                                        <input
                                            type="checkbox"
                                            checked={mengetahui.show}
                                            onChange={e => setMengetahui({ ...mengetahui, show: e.target.checked })}
                                            className="w-4 h-4 rounded text-teal-600"
                                        />
                                        <span>Aktifkan</span>
                                    </label>
                                </div>
                                {mengetahui.show && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-200">
                                        <div>
                                            <label className="block text-xs text-slate-500 mb-1">Teks / Jabatan Mengetahui</label>
                                            <input
                                                type="text"
                                                value={mengetahui.jabatan}
                                                onChange={e => setMengetahui({ ...mengetahui, jabatan: e.target.value })}
                                                className="app-input w-full p-2 text-xs rounded-lg"
                                                placeholder="cth: Mengetahui, Orang Tua / Wali"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-slate-500 mb-1">Perataan</label>
                                            <select
                                                value={mengetahui.align}
                                                onChange={e => setMengetahui({ ...mengetahui, align: e.target.value as any })}
                                                className="app-select w-full p-2 text-xs rounded-lg"
                                            >
                                                <option value="left">Kiri</option>
                                                <option value="center">Tengah</option>
                                                <option value="right">Kanan</option>
                                            </select>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Tempat, Tanggal & Margin Bawaan */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50/50">
                                    <h4 className="font-bold text-slate-800 text-sm mb-2">Tempat & Tanggal</h4>
                                    <div className="space-y-2">
                                        <div>
                                            <label className="block text-xs text-slate-500 mb-1">Posisi Tanggal</label>
                                            <select
                                                value={tempatTanggalConfig.position}
                                                onChange={e => setTempatTanggalConfig({ ...tempatTanggalConfig, position: e.target.value as any })}
                                                className="app-select w-full p-2 text-xs rounded-lg"
                                            >
                                                <option value="bottom-right">Kanan Bawah (Di atas tanda tangan)</option>
                                                <option value="top-right">Kanan Atas (Di bawah kop)</option>
                                                <option value="bottom-left">Kiri Bawah</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50/50">
                                    <h4 className="font-bold text-slate-800 text-sm mb-2">Margin Kertas Default (cm)</h4>
                                    <div className="grid grid-cols-4 gap-1.5 text-center">
                                        <div>
                                            <span className="text-[10px] text-slate-400 block mb-0.5">Atas</span>
                                            <input
                                                type="number"
                                                step="0.1"
                                                value={marginConfig.top}
                                                onChange={e => setMarginConfig({ ...marginConfig, top: parseFloat(e.target.value) || 2 })}
                                                className="app-input w-full p-1 text-center text-xs rounded-lg"
                                            />
                                        </div>
                                        <div>
                                            <span className="text-[10px] text-slate-400 block mb-0.5">Kanan</span>
                                            <input
                                                type="number"
                                                step="0.1"
                                                value={marginConfig.right}
                                                onChange={e => setMarginConfig({ ...marginConfig, right: parseFloat(e.target.value) || 2 })}
                                                className="app-input w-full p-1 text-center text-xs rounded-lg"
                                            />
                                        </div>
                                        <div>
                                            <span className="text-[10px] text-slate-400 block mb-0.5">Bawah</span>
                                            <input
                                                type="number"
                                                step="0.1"
                                                value={marginConfig.bottom}
                                                onChange={e => setMarginConfig({ ...marginConfig, bottom: parseFloat(e.target.value) || 2 })}
                                                className="app-input w-full p-1 text-center text-xs rounded-lg"
                                            />
                                        </div>
                                        <div>
                                            <span className="text-[10px] text-slate-400 block mb-0.5">Kiri</span>
                                            <input
                                                type="number"
                                                step="0.1"
                                                value={marginConfig.left}
                                                onChange={e => setMarginConfig({ ...marginConfig, left: parseFloat(e.target.value) || 2 })}
                                                className="app-input w-full p-1 text-center text-xs rounded-lg"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-2 border-t border-app-border bg-slate-50 p-4">
                    <button onClick={onClose} className="app-button-secondary px-5 py-2.5 text-sm rounded-xl">Batal</button>
                    <button onClick={handleSave} className="app-button-primary px-6 py-2.5 text-sm rounded-xl">Simpan Template</button>
                </div>
            </div>
        </div>
    );
};

// --- Arsip Viewer Modal ---

const ArsipViewerModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    arsip: ArsipSurat;
    onOpenWhatsApp?: (arsip: ArsipSurat) => void;
}> = ({ isOpen, onClose, arsip, onOpenWhatsApp }) => {
    if (!isOpen) return null;
    const { settings } = useAppContext();

    const formattedTanggal = arsip.tanggalCetak || new Date(arsip.tanggalBuat).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const tempat = arsip.tempatCetak || settings.alamat.split(',')[1]?.trim() || 'Tempat';
    const isPrePrinted = Boolean(arsip.usePrePrintedKopSnapshot);

    return (
        <div className="app-overlay fixed inset-0 z-[230] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="app-modal flex h-[92vh] w-full max-w-5xl flex-col rounded-[28px] bg-white shadow-2xl overflow-hidden border border-slate-200">
                <div className="flex items-center justify-between border-b border-app-border bg-white/90 px-6 py-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-lg font-bold text-app-text">Arsip: {arsip.nomorSurat}</h3>
                            {isPrePrinted && (
                                <span className="rounded-full bg-amber-100 text-amber-800 text-[10px] font-semibold px-2 py-0.5">
                                    Kertas Kop Fisik
                                </span>
                            )}
                        </div>
                        <p className="text-xs app-text-muted">Tujuan: {arsip.tujuan} | Tanggal Buat: {new Date(arsip.tanggalBuat).toLocaleDateString('id-ID')}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {onOpenWhatsApp && (
                            <button
                                type="button"
                                onClick={() => onOpenWhatsApp(arsip)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-3.5 py-2 text-xs rounded-xl flex items-center gap-1.5 shadow-2xs"
                                title="Kirim Notifikasi WhatsApp ke Wali"
                            >
                                <i className="bi bi-whatsapp"></i> Kirim WA Wali
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => printToPdfNative('arsip-preview', `Arsip_${arsip.nomorSurat.replace(/[\/\\:*?"<>|]/g, '-')}`)}
                            className="app-button-secondary px-3.5 py-2 text-xs rounded-xl flex items-center gap-1.5"
                        >
                            <i className="bi bi-printer"></i> Cetak Dokumen
                        </button>
                        <button onClick={onClose} className="app-button-ghost h-9 w-9 rounded-full p-0 text-slate-500">
                            <i className="bi bi-x-lg"></i>
                        </button>
                    </div>
                </div>

                <div className="flex flex-grow justify-center overflow-auto bg-slate-100 p-8">
                    <div id="arsip-preview" className="bg-white shadow-lg p-8" style={{ width: '21cm', minHeight: '29.7cm', padding: '2cm' }}>
                        {isPrePrinted ? (
                            <div style={{ height: '3.5cm' }} className="flex items-center justify-center border-b border-dashed border-amber-200 text-[11px] text-amber-700 italic no-print mb-4">
                                [ Area Kop Blanko Fisik - Dicetak di atas kertas berkop pesantren ]
                            </div>
                        ) : (
                            <PrintHeader settings={settings} title="" />
                        )}
                         
                        {arsip.tempatTanggalConfig?.show && arsip.tempatTanggalConfig.position === 'top-right' && (
                            <div className={`mb-4 flex w-full justify-${arsip.tempatTanggalConfig.align === 'center' ? 'center' : arsip.tempatTanggalConfig.align === 'right' ? 'end' : 'start'}`}>
                                <p>{tempat}, {formattedTanggal}</p>
                            </div>
                        )}

                        {arsip.perihal && (arsip.showJudulSnapshot !== false) && <h3 className="text-center font-bold text-lg underline mb-4 uppercase">{arsip.perihal}</h3>}

                        <div className="text-justify leading-relaxed font-sans" dangerouslySetInnerHTML={{ __html: arsip.isiSurat }} />

                        <div className="mt-8">
                            {arsip.tempatTanggalConfig?.show && arsip.tempatTanggalConfig.position !== 'top-right' && (
                                <div className={`mb-4 flex w-full justify-${arsip.tempatTanggalConfig.position === 'bottom-left' ? 'start' : 'end'}`}>
                                    <div className={`text-${arsip.tempatTanggalConfig.align}`} style={{ minWidth: '200px' }}>
                                        <p>{tempat}, {formattedTanggal}</p>
                                    </div>
                                </div>
                            )}
                            
                            {arsip.mengetahuiSnapshot?.show && (
                                <div className={`mb-8 flex w-full justify-${arsip.mengetahuiSnapshot.align === 'center' ? 'center' : arsip.mengetahuiSnapshot.align === 'right' ? 'end' : 'start'}`}>
                                    <div className="text-center" style={{ minWidth: '200px' }}>
                                        <p className="font-medium">{arsip.mengetahuiSnapshot.jabatan}</p>
                                    </div>
                                </div>
                            )}

                            {arsip.signatoriesSnapshot && (
                                <div className={`grid gap-8 ${arsip.signatoriesSnapshot.length === 1 ? 'grid-cols-1 justify-items-end' : arsip.signatoriesSnapshot.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                                    {arsip.signatoriesSnapshot.map((sig, i) => (
                                        <div key={i} className="text-center flex flex-col items-center relative" style={{ minWidth: '200px' }}>
                                            <p className="font-medium">{sig.jabatan}</p>
                                            <div className="h-20 my-2"></div>
                                            {arsip.stampSnapshot?.show && arsip.stampSnapshot.stampUrl && (arsip.signatoriesSnapshot!.length === 1 || arsip.stampSnapshot.placementSignatoryId === sig.id) && (
                                                <img src={arsip.stampSnapshot.stampUrl} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 object-contain opacity-75 mix-blend-multiply transform -rotate-12 pointer-events-none" alt="Stempel" />
                                            )}
                                            <p className="font-bold underline">{sig.nama}</p>
                                            {sig.nip && <p>NIP. {sig.nip}</p>}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Template Manager ---

const TemplateManager: React.FC<{ 
    onEdit: (t: SuratTemplate) => void; 
    onDelete: (id: number) => void;
    onLoadPresets: () => void;
    canWrite: boolean;
}> = ({ onEdit, onDelete, onLoadPresets, canWrite }) => {
    const { suratTemplates } = useAppContext();

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {suratTemplates.map(t => (
                    <div key={t.id} className="app-panel rounded-[24px] p-5 transition-all hover:-translate-y-0.5 hover:border-teal-300 shadow-xs flex flex-col justify-between">
                        <div>
                            <div className="flex justify-between items-start mb-2">
                                <h4 className="font-bold text-app-text text-base leading-snug">{t.nama}</h4>
                                <div className="flex flex-col items-end gap-1">
                                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${t.kategori === 'Resmi' ? 'bg-blue-100 text-blue-800' : t.kategori === 'Izin' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'}`}>
                                        {t.kategori}
                                    </span>
                                    {t.kodeSurat && (
                                        <span className="font-mono text-[10px] text-teal-700 bg-teal-50 border border-teal-200 px-1.5 py-0.2 rounded font-bold">
                                            {t.kodeSurat}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <p className="mb-3 line-clamp-2 text-xs app-text-muted font-medium">{t.judul}</p>
                            <div className="flex flex-wrap items-center gap-2 mb-4 text-[11px] text-slate-500">
                                <span><i className="bi bi-pen mr-1 text-slate-400"></i>{t.signatories?.length || 1} Penanda Tangan</span>
                                {t.usePrePrintedKop ? (
                                    <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded text-[10px] font-medium border border-amber-200">
                                        <i className="bi bi-file-earmark-ruled mr-1"></i>Kop Fisik
                                    </span>
                                ) : (
                                    <span className="text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                                        <i className="bi bi-printer mr-1"></i>Kop Digital
                                    </span>
                                )}
                            </div>
                        </div>
                        {canWrite && (
                            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                                <button onClick={() => onEdit(t)} className="app-button-ghost h-9 w-9 rounded-full p-0 text-sm text-blue-600 hover:bg-blue-50" title="Edit Template">
                                    <i className="bi bi-pencil-square"></i>
                                </button>
                                <button onClick={() => onDelete(t.id)} className="app-button-ghost h-9 w-9 rounded-full p-0 text-sm text-red-600 hover:bg-red-50" title="Hapus Template">
                                    <i className="bi bi-trash"></i>
                                </button>
                            </div>
                        )}
                    </div>
                ))}
                {suratTemplates.length === 0 && (
                    <div className="col-span-full">
                        <div className="rounded-[28px] border-2 border-dashed border-teal-200 bg-teal-50/30 p-8 text-center">
                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-100 text-teal-700 text-2xl mb-3 shadow-xs">
                                <i className="bi bi-envelope-paper"></i>
                            </div>
                            <h3 className="text-base font-bold text-slate-800 mb-1">Belum Ada Template Surat</h3>
                            <p className="text-xs text-slate-600 max-w-md mx-auto mb-5 leading-relaxed">
                                Percepat proses administrasi persuratan pesantren dengan memuat 6 template resmi standar (Surat Aktif Belajar, Cuti Santri, Berkelakuan Baik, Undangan Wali, Rekomendasi Beasiswa, Mutasi).
                            </p>
                            {canWrite && (
                                <button
                                    type="button"
                                    onClick={onLoadPresets}
                                    className="app-button-primary px-5 py-2.5 text-sm rounded-xl inline-flex items-center gap-2 shadow-sm"
                                >
                                    <i className="bi bi-collection"></i> Muat 6 Template Standar Pesantren
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- Surat Generator ---

const SuratGenerator: React.FC<{ canWrite: boolean }> = ({ canWrite }) => {
    const { suratTemplates, arsipSuratList, onSaveArsipSurat, settings, showToast } = useAppContext();
    const { santriList } = useSantriContext();
    const digitalAssets = useLiveQuery(() => db.digitalAssets.toArray(), []) || [];
    
    const [selectedTemplateId, setSelectedTemplateId] = useState<number | ''>('');
    
    // Mode & View State
    const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
    const [generationMode, setGenerationMode] = useState<'single' | 'bulk'>('single');
    const [selectedSantriId, setSelectedSantriId] = useState<number | ''>('');
    const [bulkSelectedIds, setBulkSelectedIds] = useState<number[]>([]);
    const [isSantriModalOpen, setIsSantriModalOpen] = useState(false);
    const [isSettingsDrawerOpen, setIsSettingsDrawerOpen] = useState(false);

    // AI Draft
    const [isAiModalOpen, setIsAiModalOpen] = useState(false);
    const [aiPrompt, setAiPrompt] = useState('');
    const [isGeneratingAi, setIsGeneratingAi] = useState(false);

    // Letter Core Data
    const [nomorSurat, setNomorSurat] = useState('');
    const [judulSurat, setJudulSurat] = useState('');
    const [showJudul, setShowJudul] = useState(true);
    const [customContent, setCustomContent] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    
    // Surat Meta & Location
    const [tempatSurat, setTempatSurat] = useState(settings.alamat.split(',')[1]?.trim() || 'Pesantren');
    const [tanggalSurat, setTanggalSurat] = useState(new Date().toISOString().split('T')[0]);

    // Pre-printed kop mode
    const [usePrePrintedKop, setUsePrePrintedKop] = useState(false);
    const [kopMarginTop, setKopMarginTop] = useState(4.0);

    // Layout Configs
    const [tempatTanggalConfig, setTempatTanggalConfig] = useState<TempatTanggalConfig>({
        show: true, position: 'bottom-right', align: 'right'
    });
    const [marginConfig, setMarginConfig] = useState<MarginConfig>({ top: 2, right: 2, bottom: 2, left: 2 });
    const [activeSignatories, setActiveSignatories] = useState<SuratSignatory[]>([]);
    const [mengetahui, setMengetahui] = useState<MengetahuiConfig>({
        show: false, jabatan: 'Mengetahui,', align: 'center'
    });
    const [stampConfig, setStampConfig] = useState<StampConfig>({
        show: false, stampUrl: undefined, placementSignatoryId: undefined,
    });

    // Post-Archive WhatsApp Modal
    const [lastSavedArsip, setLastSavedArsip] = useState<ArsipSurat | null>(null);
    const [isWaModalOpen, setIsWaModalOpen] = useState(false);

    // Auto-record to Agenda / Arsip Surat on print or download
    const [autoArchiveOnIssue, setAutoArchiveOnIssue] = useState<boolean>(() => {
        try {
            const saved = localStorage.getItem('esantri_surat_auto_archive');
            return saved !== null ? JSON.parse(saved) : true;
        } catch {
            return true;
        }
    });

    const toggleAutoArchive = () => {
        const next = !autoArchiveOnIssue;
        setAutoArchiveOnIssue(next);
        try {
            localStorage.setItem('esantri_surat_auto_archive', JSON.stringify(next));
        } catch {
            // ignore
        }
        showToast(next ? 'Pencatatan otomatis ke Agenda Surat saat cetak/unduh aktif.' : 'Pencatatan otomatis ke Agenda dinonaktifkan.', 'info');
    };

    // Bulk preview pagination
    const [currentBulkIndex, setCurrentBulkIndex] = useState(0);
    const [showAllBulkPages, setShowAllBulkPages] = useState(false);

    // Zoom & Container Refs
    const workspaceContainerRef = useRef<HTMLDivElement>(null);
    const contentWrapperRef = useRef<HTMLDivElement>(null);
    const inPaperEditorRef = useRef<HTMLDivElement>(null);
    const isInternalEdit = useRef(false);

    const [zoomMode, setZoomMode] = useState<'fit-width' | 'fit-page' | 'manual' | '100%'>('fit-width');
    const [manualZoom, setManualZoom] = useState(1);
    const [fitWidthScale, setFitWidthScale] = useState(1);
    const [fitPageScale, setFitPageScale] = useState(0.7);
    
    // Download Menu State
    const [isDownloadMenuOpen, setIsDownloadMenuOpen] = useState(false);
    const downloadMenuRef = useRef<HTMLDivElement>(null);

    const template = useMemo(() => suratTemplates.find(t => t.id === Number(selectedTemplateId)), [selectedTemplateId, suratTemplates]);

    const targetSantris = useMemo(() => {
        if (generationMode === 'single') {
             const s = santriList.find(s => s.id === Number(selectedSantriId));
             return s ? [s] : [undefined];
        } else {
             const selected = santriList.filter(s => bulkSelectedIds.includes(s.id));
             return selected.length > 0 ? selected : [undefined];
        }
    }, [generationMode, selectedSantriId, bulkSelectedIds, santriList]);

    // Close download dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (downloadMenuRef.current && !downloadMenuRef.current.contains(event.target as Node)) {
                setIsDownloadMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => { document.removeEventListener("mousedown", handleClickOutside); };
    }, []);

    // Signatory resolver (resolves auto / dynamic roles for specific santri)
    const resolveSignatoryForSantri = useCallback((sig: SuratSignatory, targetSantri?: Santri): SuratSignatory => {
        let resolvedNama = sig.nama || '';
        let resolvedJabatan = sig.jabatan || '';
        let resolvedNip = sig.nip;
        let resolvedSignatureUrl = sig.signatureUrl;

        if (sig.mode === 'auto') {
            if (sig.sourceType === 'mudir') {
                const mudir = settings.tenagaPengajar?.find(t => t.id === settings.mudirAamId);
                resolvedNama = mudir?.nama || settings.namaMudir || resolvedNama || 'Pimpinan Pondok Pesantren';
                resolvedNip = mudir?.nip || resolvedNip;
                if (!resolvedSignatureUrl) {
                    const matchAsset = digitalAssets.find(a => 
                        a.type === 'ttd' && a.namaPemilik.trim().toLowerCase() === resolvedNama.trim().toLowerCase()
                    );
                    if (matchAsset) resolvedSignatureUrl = matchAsset.base64Image;
                }
            } else if (sig.sourceType === 'guru' && sig.sourceId) {
                const guru = settings.tenagaPengajar?.find(t => t.id === Number(sig.sourceId));
                if (guru) {
                    resolvedNama = guru.nama;
                    resolvedNip = guru.nip || resolvedNip;
                    if (!resolvedSignatureUrl) {
                        const matchAsset = digitalAssets.find(a => 
                            a.type === 'ttd' && a.namaPemilik.trim().toLowerCase() === guru.nama.trim().toLowerCase()
                        );
                        if (matchAsset) resolvedSignatureUrl = matchAsset.base64Image;
                    }
                }
            } else if (sig.sourceType === 'wali_kelas') {
                if (targetSantri && targetSantri.rombelId) {
                    const rombel = settings.rombel?.find(r => r.id === targetSantri.rombelId);
                    const wali = rombel?.waliKelasId ? settings.tenagaPengajar?.find(t => t.id === rombel.waliKelasId) : undefined;
                    if (wali) {
                        resolvedNama = wali.nama;
                        resolvedNip = wali.nip;
                        const matchAsset = digitalAssets.find(a => 
                            a.type === 'ttd' && a.namaPemilik.trim().toLowerCase() === wali.nama.trim().toLowerCase()
                        );
                        if (matchAsset) resolvedSignatureUrl = matchAsset.base64Image;
                    } else {
                        resolvedNama = 'Wali Kelas ' + (rombel?.nama || '');
                    }
                } else {
                    resolvedNama = '(Wali Kelas Santri Terkait)';
                }
            } else if (sig.sourceType === 'musyrif') {
                if (targetSantri && targetSantri.kamarId) {
                    const kamar = settings.kamar?.find(k => k.id === targetSantri.kamarId);
                    const musyrif = kamar?.musyrifId ? settings.tenagaPengajar?.find(t => t.id === kamar.musyrifId) : undefined;
                    if (musyrif) {
                        resolvedNama = musyrif.nama;
                        resolvedNip = musyrif.nip;
                        const matchAsset = digitalAssets.find(a => 
                            a.type === 'ttd' && a.namaPemilik.trim().toLowerCase() === musyrif.nama.trim().toLowerCase()
                        );
                        if (matchAsset) resolvedSignatureUrl = matchAsset.base64Image;
                    } else {
                        resolvedNama = 'Musyrif Kamar ' + (kamar?.nama || '');
                    }
                } else {
                    resolvedNama = '(Musyrif Asrama Terkait)';
                }
            } else if (sig.sourceType === 'digital_asset' && sig.sourceId) {
                const asset = digitalAssets.find(a => a.id === String(sig.sourceId));
                if (asset) {
                    resolvedNama = asset.namaPemilik || resolvedNama;
                    resolvedJabatan = asset.jabatan || resolvedJabatan;
                    resolvedSignatureUrl = asset.base64Image || resolvedSignatureUrl;
                }
            }
        }

        // Dynamic tag replacements
        if (resolvedNama.includes('{PIMPINAN_PONDOK}')) {
            const mudir = settings.tenagaPengajar?.find(t => t.id === settings.mudirAamId);
            resolvedNama = resolvedNama.replace(/{PIMPINAN_PONDOK}/g, mudir?.nama || settings.namaMudir || 'Pimpinan Pondok');
        }
        if (resolvedNama.includes('{WALI_KELAS}')) {
            if (targetSantri && targetSantri.rombelId) {
                const rombel = settings.rombel?.find(r => r.id === targetSantri.rombelId);
                const wali = rombel?.waliKelasId ? settings.tenagaPengajar?.find(t => t.id === rombel.waliKelasId) : undefined;
                resolvedNama = resolvedNama.replace(/{WALI_KELAS}/g, wali?.nama || 'Wali Kelas ' + (rombel?.nama || ''));
                if (wali?.nip && !resolvedNip) resolvedNip = wali.nip;
            } else {
                resolvedNama = resolvedNama.replace(/{WALI_KELAS}/g, '(Wali Kelas)');
            }
        }
        if (resolvedNama.includes('{MUSYRIF}')) {
            if (targetSantri && targetSantri.kamarId) {
                const kamar = settings.kamar?.find(k => k.id === targetSantri.kamarId);
                const musyrif = kamar?.musyrifId ? settings.tenagaPengajar?.find(t => t.id === kamar.musyrifId) : undefined;
                resolvedNama = resolvedNama.replace(/{MUSYRIF}/g, musyrif?.nama || 'Musyrif Kamar ' + (kamar?.nama || ''));
                if (musyrif?.nip && !resolvedNip) resolvedNip = musyrif.nip;
            } else {
                resolvedNama = resolvedNama.replace(/{MUSYRIF}/g, '(Musyrif Asrama)');
            }
        }

        return {
            ...sig,
            nama: resolvedNama,
            jabatan: resolvedJabatan,
            nip: resolvedNip,
            signatureUrl: resolvedSignatureUrl
        };
    }, [settings, digitalAssets]);

    // Load template configs
    useEffect(() => {
        if (template) {
            setCustomContent(template.konten);
            setJudulSurat(template.judul || '');
            setShowJudul(template.showJudul !== false);
            setUsePrePrintedKop(Boolean(template.usePrePrintedKop));
            setKopMarginTop(template.kopMarginTop || 4.0);

            const mudir = settings.tenagaPengajar?.find(t => t.id === settings.mudirAamId);
            const pimpinanName = mudir?.nama || settings.namaMudir || 'Pengasuh Pondok';

            if (template.signatories && template.signatories.length > 0) {
                const resolved = template.signatories.map(s => {
                    let sigCopy = {
                        ...s,
                        mode: s.mode || (s.sourceType ? 'auto' : 'manual'),
                        nama: s.nama.replace(/{PIMPINAN_PONDOK}/g, pimpinanName)
                    };
                    if (sigCopy.mode === 'auto' && !sigCopy.signatureUrl) {
                        const matchAsset = digitalAssets.find(a => 
                            a.type === 'ttd' && a.namaPemilik.trim().toLowerCase() === sigCopy.nama.trim().toLowerCase()
                        );
                        if (matchAsset) sigCopy.signatureUrl = matchAsset.base64Image;
                    }
                    return sigCopy;
                });
                setActiveSignatories(resolved);
            } else {
                const matchMudirAsset = digitalAssets.find(a => 
                    a.type === 'ttd' && a.namaPemilik.trim().toLowerCase() === pimpinanName.trim().toLowerCase()
                );
                setActiveSignatories([{ 
                    id: 'default', 
                    mode: 'auto',
                    sourceType: 'mudir',
                    jabatan: 'Pimpinan Pondok Pesantren', 
                    nama: pimpinanName,
                    nip: mudir?.nip || '',
                    signatureUrl: matchMudirAsset?.base64Image
                }]);
            }
            
            setMengetahui(template.mengetahuiConfig || { show: false, jabatan: 'Mengetahui,', align: 'center' });
            setTempatTanggalConfig(template.tempatTanggalConfig || { show: true, position: 'bottom-right', align: 'right' });
            setMarginConfig(template.marginConfig || { top: 2, right: 2, bottom: 2, left: 2 });
            setStampConfig(template.stampConfig || { show: false, stampUrl: undefined, placementSignatoryId: undefined });

            // Auto-generate number if empty
            if (!nomorSurat) {
                const curDate = tanggalSurat ? new Date(tanggalSurat) : new Date();
                const curYear = curDate.getFullYear();
                const curMonth = curDate.getMonth();
                const countThisMonth = arsipSuratList.filter(a => {
                    const d = new Date(a.tanggalBuat);
                    return d.getFullYear() === curYear && d.getMonth() === curMonth;
                }).length;

                const generated = generateNextNomorSurat(
                    template.kodeSurat || (template.kategori === 'Izin' ? 'SIP' : template.kategori === 'Pemberitahuan' ? 'UND' : 'SKA'),
                    settings.namaPonpes || 'PST',
                    countThisMonth,
                    tanggalSurat
                );
                setNomorSurat(generated);
            }

            if (inPaperEditorRef.current) {
                inPaperEditorRef.current.innerHTML = template.konten;
            }
        }
    }, [template, settings.mudirAamId, settings.tenagaPengajar, settings.namaPonpes, arsipSuratList]);

    // Synchronize editor innerHTML on viewMode or external customContent change
    useEffect(() => {
        if (inPaperEditorRef.current && viewMode === 'edit' && !isInternalEdit.current) {
            if (inPaperEditorRef.current.innerHTML !== customContent) {
                inPaperEditorRef.current.innerHTML = customContent;
            }
        }
    }, [customContent, viewMode]);

    // Smart Auto Numbering trigger
    const handleGenerateAutoNumber = () => {
        const kode = template?.kodeSurat || (template?.kategori === 'Izin' ? 'SIP' : template?.kategori === 'Pemberitahuan' ? 'UND' : 'SKA');
        const curDate = tanggalSurat ? new Date(tanggalSurat) : new Date();
        const curYear = curDate.getFullYear();
        const curMonth = curDate.getMonth();
        const countThisMonth = arsipSuratList.filter(a => {
            const d = new Date(a.tanggalBuat);
            return d.getFullYear() === curYear && d.getMonth() === curMonth;
        }).length;

        const generated = generateNextNomorSurat(
            kode,
            settings.namaPonpes || 'PST',
            countThisMonth,
            tanggalSurat
        );
        setNomorSurat(generated);
        showToast(`Nomor surat otomatis: ${generated}`, 'success');
    };

    // Zoom Math & Responsive Scale calculations
    const updateScales = () => {
        if (!workspaceContainerRef.current) return;
        const cWidth = workspaceContainerRef.current.clientWidth;
        const cHeight = workspaceContainerRef.current.clientHeight;
        // A4 Paper at 96 DPI: 21cm = ~794px, 29.7cm = ~1123px
        const availableWidth = cWidth - 48;
        const availableHeight = cHeight - 64;
        if (availableWidth > 0) {
            const fw = Math.min(1.25, Math.max(0.4, Number((availableWidth / 794).toFixed(2))));
            setFitWidthScale(fw);
        }
        if (availableHeight > 0) {
            const fp = Math.min(1.0, Math.max(0.4, Number((availableHeight / 1123).toFixed(2))));
            setFitPageScale(fp);
        }
    };

    useEffect(() => {
        updateScales();
        const handleResize = () => updateScales();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [template, viewMode]);

    const effectiveScale = useMemo(() => {
        if (zoomMode === 'fit-width') return fitWidthScale;
        if (zoomMode === 'fit-page') return fitPageScale;
        if (zoomMode === '100%') return 1.0;
        return manualZoom;
    }, [zoomMode, fitWidthScale, fitPageScale, manualZoom]);

    const handleZoomIn = () => {
        setZoomMode('manual');
        setManualZoom(Number(Math.min(1.5, effectiveScale + 0.1).toFixed(2)));
    };

    const handleZoomOut = () => {
        setZoomMode('manual');
        setManualZoom(Number(Math.max(0.4, effectiveScale - 0.1).toFixed(2)));
    };

    const handleFitWidth = () => {
        updateScales();
        setZoomMode('fit-width');
    };

    const handleFitPage = () => {
        updateScales();
        setZoomMode('fit-page');
    };

    const handleReset100 = () => {
        setZoomMode('100%');
        setManualZoom(1.0);
    };

    const formattedTanggalSurat = useMemo(() => {
        if (!tanggalSurat) return '';
        return new Date(tanggalSurat).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    }, [tanggalSurat]);

    // Full Variable Inserter & Replacer
    const getProcessedContent = (santri: Santri | undefined) => {
        if (!template) return '';
        let content = customContent;
        
        const namaPondok = settings.namaPonpes || 'Pondok Pesantren';
        const alamatPondok = settings.alamat || '';
        const mudir = settings.tenagaPengajar?.find(t => t.id === settings.mudirAamId);
        const pimpinanPondok = mudir?.nama || 'Pimpinan Pondok Pesantren';

        // General / Institute Placeholders
        content = content.replace(/{TANGGAL}/g, formattedTanggalSurat);
        content = content.replace(/{NOMOR_SURAT}/g, nomorSurat || '...../...../.....');
        content = content.replace(/{NAMA_PONDOK}/g, namaPondok);
        content = content.replace(/{ALAMAT_PONDOK}/g, alamatPondok);
        content = content.replace(/{PIMPINAN_PONDOK}/g, pimpinanPondok);

        if (santri) {
            // Data Pribadi
            content = content.replace(/{NAMA_SANTRI}/g, santri.namaLengkap);
            content = content.replace(/{NIS}/g, santri.nis);
            content = content.replace(/{NISN}/g, santri.nisn || '-');
            content = content.replace(/{NIK}/g, santri.nik || '-');
            content = content.replace(/{NO_KK}/g, santri.nik || '-');
            content = content.replace(/{TEMPAT_LAHIR}/g, santri.tempatLahir || '');
            content = content.replace(/{TANGGAL_LAHIR}/g, santri.tanggalLahir ? new Date(santri.tanggalLahir).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '');
            content = content.replace(/{JENIS_KELAMIN}/g, santri.jenisKelamin || '-');
            
            // TTL support
            content = content.replace(/{TTL}/g, `${santri.tempatLahir || '-'}, ${santri.tanggalLahir ? new Date(santri.tanggalLahir).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}`);

            // Data Pendidikan & Asrama
            content = content.replace(/{JENJANG}/g, settings.jenjang.find(j => j.id === santri.jenjangId)?.nama || '');
            content = content.replace(/{KELAS}/g, settings.kelas.find(k => k.id === santri.kelasId)?.nama || '');
            content = content.replace(/{ROMBEL}/g, settings.rombel.find(r => r.id === santri.rombelId)?.nama || '');
            
            const kamarItem = settings.kamar?.find(k => k.id === santri.kamarId);
            const asramaGedung = kamarItem ? settings.gedungAsrama?.find(g => g.id === kamarItem.gedungId)?.nama : '-';
            content = content.replace(/{ASRAMA}/g, asramaGedung || '-');
            content = content.replace(/{KAMAR}/g, kamarItem?.nama || '-');
            content = content.replace(/{ANGKATAN}/g, santri.tanggalMasuk ? String(new Date(santri.tanggalMasuk).getFullYear()) : '-');

            // Data Orang Tua & Wali
            content = content.replace(/{NAMA_AYAH}/g, santri.namaAyah || '');
            content = content.replace(/{NAMA_IBU}/g, santri.namaIbu || '');
            content = content.replace(/{NAMA_WALI}/g, santri.namaWali || '');
            
            const waliSmart = santri.namaWali || santri.namaAyah || santri.namaIbu || '';
            content = content.replace(/{ORTU_WALI}/g, waliSmart);
            content = content.replace(/{WALI}/g, waliSmart);
            
            const santriPhone = santri.telepon || santri.teleponAyah || santri.teleponIbu || santri.teleponWali || '-';
            content = content.replace(/{NO_HP}/g, santriPhone);

            // Alamat
            content = content.replace(/{ALAMAT}/g, santri.alamat.detail);
            
            const fullAddress = [
                santri.alamat.detail,
                santri.alamat.desaKelurahan ? `Desa ${santri.alamat.desaKelurahan}` : '',
                santri.alamat.kecamatan ? `Kec. ${santri.alamat.kecamatan}` : '',
                santri.alamat.kabupatenKota ? `${santri.alamat.kabupatenKota}` : '',
                santri.alamat.provinsi
            ].filter(Boolean).join(', ');
            content = content.replace(/{ALAMAT_LENGKAP}/g, fullAddress);

        } else {
            const dots = '...................................';
            content = content.replace(/{NAMA_SANTRI}/g, dots);
            content = content.replace(/{NIS}/g, '................');
            content = content.replace(/{NISN}/g, '................');
            content = content.replace(/{NIK}/g, '................');
            content = content.replace(/{NO_KK}/g, '................');
            content = content.replace(/{TEMPAT_LAHIR}/g, dots);
            content = content.replace(/{TANGGAL_LAHIR}/g, dots);
            content = content.replace(/{TTL}/g, dots);
            content = content.replace(/{JENIS_KELAMIN}/g, dots);
            content = content.replace(/{JENJANG}/g, dots);
            content = content.replace(/{KELAS}/g, dots);
            content = content.replace(/{ROMBEL}/g, dots);
            content = content.replace(/{ASRAMA}/g, dots);
            content = content.replace(/{KAMAR}/g, dots);
            content = content.replace(/{ANGKATAN}/g, dots);
            content = content.replace(/{NAMA_AYAH}/g, dots);
            content = content.replace(/{NAMA_IBU}/g, dots);
            content = content.replace(/{NAMA_WALI}/g, dots);
            content = content.replace(/{ORTU_WALI}/g, dots);
            content = content.replace(/{WALI}/g, dots);
            content = content.replace(/{NO_HP}/g, dots);
            content = content.replace(/{ALAMAT}/g, dots);
            content = content.replace(/{ALAMAT_LENGKAP}/g, dots);
        }
        return content;
    };

    // Editor formatting helper
    const execCmd = (cmd: string, value: string | undefined = undefined) => {
        document.execCommand(cmd, false, value);
        if (inPaperEditorRef.current) {
            inPaperEditorRef.current.focus();
            isInternalEdit.current = true;
            setCustomContent(inPaperEditorRef.current.innerHTML);
            setTimeout(() => { isInternalEdit.current = false; }, 0);
        }
    };

    const handleEditorInput = () => {
        if (inPaperEditorRef.current) {
            isInternalEdit.current = true;
            setCustomContent(inPaperEditorRef.current.innerHTML);
            setTimeout(() => { isInternalEdit.current = false; }, 0);
        }
    };

    const handleInsertVariable = (tag: string) => {
        if (inPaperEditorRef.current) {
            inPaperEditorRef.current.focus();
            const sel = window.getSelection();
            if (sel && sel.rangeCount > 0) {
                const range = sel.getRangeAt(0);
                range.deleteContents();
                const node = document.createTextNode(` ${tag} `);
                range.insertNode(node);
                range.setStartAfter(node);
                range.setEndAfter(node);
                sel.removeAllRanges();
                sel.addRange(range);
                isInternalEdit.current = true;
                setCustomContent(inPaperEditorRef.current.innerHTML);
                setTimeout(() => { isInternalEdit.current = false; }, 0);
                showToast(`Variabel ${tag} disisipkan`, 'info');
                return;
            }
        }
        setCustomContent(prev => `${prev} ${tag} `);
        showToast(`Variabel ${tag} disisipkan`, 'info');
    };

    const handleAiGenerate = async () => {
        if (!aiPrompt.trim()) return;
        setIsGeneratingAi(true);
        try {
            const result = await generateLetterDraft(aiPrompt);
            setCustomContent(result);
            if (inPaperEditorRef.current) {
                inPaperEditorRef.current.innerHTML = result;
            }
            setIsAiModalOpen(false);
            setAiPrompt('');
            showToast('Naskah surat berhasil disusun dengan AI', 'success');
        } catch (e) {
            showToast('Gagal menyusun naskah: ' + (e as Error).message, 'error');
        } finally {
            setIsGeneratingAi(false);
        }
    };

    // Archive Executor (Supports Manual and Automatic Issue Recording)
    const executeArchive = async (silent: boolean = false): Promise<boolean> => {
        if (!canWrite) {
            if (!silent) showToast('Anda tidak memiliki akses untuk mengarsipkan surat.', 'error');
            return false;
        }
        if (!template) return false;
        
        if (generationMode === 'bulk' && targetSantris.length === 0) {
            if (!silent) showToast('Tidak ada santri yang dipilih untuk diarsipkan.', 'error');
            return false;
        }

        // Avoid duplicate logging if already recorded with same nomor surat
        const isAlreadyArchived = arsipSuratList.some(a => 
            a.nomorSurat === nomorSurat && 
            (generationMode === 'single' ? a.santriId === targetSantris[0]?.id : true)
        );
        if (isAlreadyArchived && silent) {
            return true;
        }

        setIsSaving(true);
        try {
            let savedCount = 0;
            let lastSaved: ArsipSurat | null = null;

            for (const santri of targetSantris) {
                const arsipData = {
                    nomorSurat,
                    perihal: judulSurat || template.judul,
                    tujuan: santri ? santri.namaLengkap : 'Umum',
                    isiSurat: getProcessedContent(santri),
                    tanggalBuat: new Date().toISOString().split('T')[0],
                    templateId: template.id,
                    tempatCetak: tempatSurat,
                    tanggalCetak: formattedTanggalSurat,
                    tempatTanggalConfig: tempatTanggalConfig,
                    signatoriesSnapshot: activeSignatories.map(s => resolveSignatoryForSantri(s, santri)),
                    mengetahuiSnapshot: mengetahui,
                    marginConfig: marginConfig,
                    stampSnapshot: stampConfig,
                    showJudulSnapshot: showJudul,
                    usePrePrintedKopSnapshot: usePrePrintedKop,
                    nomorHpTujuan: santri ? (santri.telepon || santri.teleponAyah || santri.teleponIbu || santri.teleponWali) : undefined,
                    santriId: santri?.id
                };

                await onSaveArsipSurat(arsipData);
                savedCount++;
                if (!lastSaved) {
                    lastSaved = { ...arsipData, id: Date.now() };
                }
            }
           
            if (!silent) {
                showToast(`${savedCount} surat berhasil dicatat ke Agenda / Arsip Surat.`, 'success');
                if (generationMode === 'single' && targetSantris[0] && lastSaved) {
                    setLastSavedArsip(lastSaved);
                    setIsWaModalOpen(true);
                }
            } else {
                showToast(`Surat ${nomorSurat || ''} otomatis tercatat di Agenda Surat.`, 'info');
            }
            return true;
        } catch (e) {
            if (!silent) showToast('Gagal mengarsipkan surat.', 'error');
            return false;
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveArchive = () => {
        executeArchive(false);
    };

    // Download & Print Handlers (Crucial: Reset scale to 'none' during export, restore in finally)
    const handleDownloadPdf = async () => {
        if (!contentWrapperRef.current) return;
        if (autoArchiveOnIssue && canWrite) {
            await executeArchive(true);
        }
        const originalTransform = contentWrapperRef.current.style.transform;
        contentWrapperRef.current.style.transform = 'none';
        try {
            await generatePdf('surat-preview-container', { 
                paperSize: 'A4', 
                fileName: `Surat_${nomorSurat.replace(/[\/\\:*?"<>|]/g, '-') || 'Draft'}.pdf` 
            });
            setIsDownloadMenuOpen(false);
        } finally {
            contentWrapperRef.current.style.transform = originalTransform;
        }
    };

    const handleDownloadHtml = async () => {
        if (!contentWrapperRef.current) {
            showToast("Tidak ada konten pratinjau untuk diunduh.", 'error');
            return;
        }
        if (autoArchiveOnIssue && canWrite) {
            await executeArchive(true);
        }
        const originalTransform = contentWrapperRef.current.style.transform;
        contentWrapperRef.current.style.transform = 'none';
        try {
            exportToHtml('surat-preview-container', `Surat_${nomorSurat.replace(/[\/\\:*?"<>|]/g, '-') || 'Draft'}`);
            setIsDownloadMenuOpen(false);
        } finally {
            contentWrapperRef.current.style.transform = originalTransform;
        }
    };

    const handleDownloadWord = async () => {
        if (!contentWrapperRef.current) {
            showToast("Tidak ada konten pratinjau untuk diunduh.", 'error');
            return;
        }
        if (autoArchiveOnIssue && canWrite) {
            await executeArchive(true);
        }
        const originalTransform = contentWrapperRef.current.style.transform;
        contentWrapperRef.current.style.transform = 'none';
        try {
            exportToWord('surat-preview-container', `Surat_${nomorSurat.replace(/[\/\\:*?"<>|]/g, '-') || 'Draft'}`);
            setIsDownloadMenuOpen(false);
        } finally {
            contentWrapperRef.current.style.transform = originalTransform;
        }
    };

    const handlePrintDirect = async () => {
        if (!contentWrapperRef.current) return;
        if (autoArchiveOnIssue && canWrite) {
            await executeArchive(true);
        }
        const originalTransform = contentWrapperRef.current.style.transform;
        contentWrapperRef.current.style.transform = 'none';
        try {
            await printPreviewExact('surat-preview-container', `Surat_${nomorSurat.replace(/[\/\\:*?"<>|]/g, '-') || 'Draft'}`);
        } finally {
            contentWrapperRef.current.style.transform = originalTransform;
        }
    };

    // Which santris to render on the sheet(s)
    const santrisToRender = useMemo(() => {
        if (viewMode === 'edit') {
            return [targetSantris[0]];
        }
        if (generationMode === 'single') {
            return targetSantris;
        }
        // In Bulk preview mode:
        if (showAllBulkPages) {
            return targetSantris;
        } else {
            return targetSantris[currentBulkIndex] ? [targetSantris[currentBulkIndex]] : [targetSantris[0]];
        }
    }, [viewMode, generationMode, showAllBulkPages, targetSantris, currentBulkIndex]);

    return (
        <div className="flex flex-col h-[calc(100vh-140px)] min-h-[600px] rounded-[24px] bg-slate-200/70 border border-slate-300/80 overflow-hidden shadow-xs relative">
            <style>{`
                .printable-content-wrapper ul { list-style-type: disc; padding-left: 1.5em; }
                .printable-content-wrapper ol { list-style-type: decimal; padding-left: 1.5em; }
                .printable-content-wrapper b, .printable-content-wrapper strong { font-weight: bold; }
                .printable-content-wrapper i, .printable-content-wrapper em { font-style: italic; }
                .printable-content-wrapper u { text-decoration: underline; }
                .in-paper-editor:empty:before {
                    content: attr(data-placeholder);
                    color: #94a3b8;
                    font-style: italic;
                    pointer-events: none;
                }
            `}</style>

            {/* TOP STICKY COMMAND BAR */}
            <div className="no-print sticky top-0 z-30 bg-white border-b border-slate-200/90 shadow-2xs divide-y divide-slate-100">
                {/* Primary Controls Row */}
                <div className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-2.5">
                    {/* Left: Template & Recipient & Auto No. */}
                    <div className="flex flex-wrap items-center gap-2">
                        {/* Template Dropdown */}
                        <div className="flex items-center gap-1.5">
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-50 text-teal-700 text-xs font-bold">
                                <i className="bi bi-file-earmark-ruled"></i>
                            </span>
                            <select
                                value={selectedTemplateId}
                                onChange={e => setSelectedTemplateId(e.target.value ? Number(e.target.value) : '')}
                                className="app-select py-1.5 px-3 text-xs font-semibold rounded-xl max-w-[200px] sm:max-w-[240px] bg-slate-50 border-slate-200 focus:bg-white"
                            >
                                <option value="">-- Pilih Template Surat --</option>
                                {suratTemplates.map(t => (
                                    <option key={t.id} value={t.id}>
                                        {t.nama} {t.kodeSurat ? `(${t.kodeSurat})` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {template && (
                            <>
                                {/* Recipient Selector Button */}
                                <button
                                    type="button"
                                    onClick={() => setIsSantriModalOpen(true)}
                                    className="app-button-secondary py-1.5 px-3 text-xs rounded-xl flex items-center gap-1.5 font-medium shadow-2xs bg-white hover:bg-slate-50"
                                    title="Pilih Santri atau Mode Mail Merge"
                                >
                                    <i className={`bi ${generationMode === 'single' ? 'bi-person' : 'bi-people'} text-teal-600`}></i>
                                    <span className="truncate max-w-[140px] sm:max-w-[180px]">
                                        {generationMode === 'single'
                                            ? (targetSantris[0] ? targetSantris[0].namaLengkap : 'Umum (Tanpa Nama)')
                                            : `Mail Merge (${bulkSelectedIds.length} Santri)`}
                                    </span>
                                    <i className="bi bi-chevron-down text-[10px] text-slate-400"></i>
                                </button>

                                {/* Nomor Surat with Auto-No */}
                                <div className="flex items-center gap-1">
                                    <input
                                        type="text"
                                        value={nomorSurat}
                                        onChange={e => setNomorSurat(e.target.value)}
                                        placeholder="No. Surat..."
                                        className="app-input py-1 px-2.5 text-xs font-mono rounded-xl w-32 sm:w-40"
                                        title="Nomor Surat Resmi"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleGenerateAutoNumber}
                                        className="app-button-secondary py-1.5 px-2 text-xs rounded-xl text-teal-700 hover:text-teal-900 shadow-2xs"
                                        title="Buat Nomor Urut Otomatis"
                                    >
                                        <i className="bi bi-magic"></i>
                                    </button>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Center: Mode Segmented Switch */}
                    {template && (
                        <div className="flex rounded-xl bg-slate-200/80 p-1 text-xs font-semibold shadow-inner">
                            <button
                                type="button"
                                onClick={() => setViewMode('edit')}
                                className={`rounded-lg px-3 py-1 transition-all flex items-center gap-1.5 ${
                                    viewMode === 'edit'
                                        ? 'bg-white text-teal-800 shadow-xs'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                <i className="bi bi-pencil-square text-xs"></i>
                                <span>Edit Naskah</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('preview')}
                                className={`rounded-lg px-3 py-1 transition-all flex items-center gap-1.5 ${
                                    viewMode === 'preview'
                                        ? 'bg-white text-teal-800 shadow-xs'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                <i className="bi bi-eye text-xs"></i>
                                <span>Pratinjau Cetak</span>
                            </button>
                        </div>
                    )}

                    {/* Right: Actions (Format, Archive, Print, Download) */}
                    <div className="flex items-center gap-1.5">
                        {template && (
                            <>
                                <button
                                    type="button"
                                    onClick={() => setIsSettingsDrawerOpen(true)}
                                    className="app-button-secondary py-1.5 px-2.5 text-xs rounded-xl flex items-center gap-1.5 shadow-2xs relative bg-white"
                                    title="Pengaturan Format Dokumen & Penanda Tangan"
                                >
                                    <i className="bi bi-sliders text-slate-600"></i>
                                    <span className="hidden sm:inline font-medium">Format</span>
                                    {usePrePrintedKop && (
                                        <span className="h-2 w-2 rounded-full bg-amber-500 absolute -top-0.5 -right-0.5" title="Kop fisik aktif"></span>
                                    )}
                                </button>

                                <button
                                    type="button"
                                    onClick={toggleAutoArchive}
                                    className={`py-1.5 px-2.5 text-xs rounded-xl flex items-center gap-1.5 font-medium transition-colors border shadow-2xs ${
                                        autoArchiveOnIssue 
                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100' 
                                            : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                                    }`}
                                    title={autoArchiveOnIssue ? 'Agenda Otomatis AKTIF: Setiap surat yang dicetak/diunduh otomatis tersimpan ke Agenda Surat' : 'Agenda Otomatis NONAKTIF: Klik untuk mengaktifkan pencatatan otomatis saat cetak/unduh'}
                                >
                                    <i className={`bi ${autoArchiveOnIssue ? 'bi-journal-check text-emerald-600' : 'bi-journal-x text-slate-400'}`}></i>
                                    <span className="hidden xl:inline">Agenda Otomatis</span>
                                </button>

                                {canWrite && (
                                    <button
                                        type="button"
                                        onClick={handleSaveArchive}
                                        disabled={isSaving}
                                        className="app-button-primary py-1.5 px-3 text-xs rounded-xl flex items-center gap-1.5 shadow-xs font-semibold disabled:opacity-50"
                                        title="Simpan surat ke dalam buku arsip digital"
                                    >
                                        {isSaving ? <span className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full"></span> : <i className="bi bi-archive"></i>}
                                        <span className="hidden md:inline">Arsipkan</span>
                                    </button>
                                )}

                                <button
                                    type="button"
                                    onClick={handlePrintDirect}
                                    className="app-button-secondary py-1.5 px-3 text-xs rounded-xl flex items-center gap-1.5 shadow-2xs font-medium bg-white"
                                    title="Cetak Dokumen Langsung"
                                >
                                    <i className="bi bi-printer"></i>
                                    <span className="hidden md:inline">Cetak</span>
                                </button>

                                {/* Unduh Dropdown */}
                                <div className="relative" ref={downloadMenuRef}>
                                    <button
                                        type="button"
                                        onClick={() => setIsDownloadMenuOpen(!isDownloadMenuOpen)}
                                        className="app-button-secondary py-1.5 px-2.5 text-xs rounded-xl flex items-center gap-1 shadow-2xs bg-white"
                                        title="Unduh File Surat"
                                    >
                                        <i className="bi bi-download"></i>
                                        <i className="bi bi-chevron-down text-[10px]"></i>
                                    </button>
                                    {isDownloadMenuOpen && (
                                        <div className="app-panel absolute right-0 z-50 mt-2 w-48 rounded-2xl shadow-xl border border-slate-200">
                                            <div className="py-1 text-xs">
                                                <button onClick={handleDownloadPdf} className="flex w-full items-center px-4 py-2.5 text-slate-700 hover:bg-slate-50">
                                                    <i className="bi bi-file-pdf text-red-600 mr-2.5 text-sm"></i> Dokumen PDF (.pdf)
                                                </button>
                                                <button onClick={handleDownloadWord} className="flex w-full items-center px-4 py-2.5 text-slate-700 hover:bg-slate-50">
                                                    <i className="bi bi-file-earmark-word text-blue-600 mr-2.5 text-sm"></i> Dokumen Word (.doc)
                                                </button>
                                                <button onClick={handleDownloadHtml} className="flex w-full items-center px-4 py-2.5 text-slate-700 hover:bg-slate-50">
                                                    <i className="bi bi-filetype-html text-emerald-600 mr-2.5 text-sm"></i> Dokumen Web (.html)
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Sub Toolbar Row 2 */}
                {template && (
                    <div className="bg-slate-50/80 px-4 py-1.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                        {viewMode === 'edit' ? (
                            /* Rich Text & Variable Insertion Tools */
                            <div className="flex flex-wrap items-center gap-1">
                                <button
                                    type="button"
                                    onMouseDown={e => { e.preventDefault(); execCmd('bold'); }}
                                    className="p-1.5 text-slate-700 hover:bg-slate-200 rounded-lg transition-colors font-bold"
                                    title="Tebal (Ctrl+B)"
                                >
                                    <i className="bi bi-type-bold"></i>
                                </button>
                                <button
                                    type="button"
                                    onMouseDown={e => { e.preventDefault(); execCmd('italic'); }}
                                    className="p-1.5 text-slate-700 hover:bg-slate-200 rounded-lg transition-colors italic"
                                    title="Miring (Ctrl+I)"
                                >
                                    <i className="bi bi-type-italic"></i>
                                </button>
                                <button
                                    type="button"
                                    onMouseDown={e => { e.preventDefault(); execCmd('underline'); }}
                                    className="p-1.5 text-slate-700 hover:bg-slate-200 rounded-lg transition-colors underline"
                                    title="Garis Bawah (Ctrl+U)"
                                >
                                    <i className="bi bi-type-underline"></i>
                                </button>

                                <div className="w-px h-4 bg-slate-300 mx-1"></div>

                                <button
                                    type="button"
                                    onMouseDown={e => { e.preventDefault(); execCmd('insertUnorderedList'); }}
                                    className="p-1.5 text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
                                    title="Daftar Bullet"
                                >
                                    <i className="bi bi-list-ul"></i>
                                </button>
                                <button
                                    type="button"
                                    onMouseDown={e => { e.preventDefault(); execCmd('insertOrderedList'); }}
                                    className="p-1.5 text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
                                    title="Daftar Angka"
                                >
                                    <i className="bi bi-list-ol"></i>
                                </button>

                                <div className="w-px h-4 bg-slate-300 mx-1"></div>

                                <button
                                    type="button"
                                    onMouseDown={e => { e.preventDefault(); execCmd('justifyLeft'); }}
                                    className="p-1.5 text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
                                    title="Rata Kiri"
                                >
                                    <i className="bi bi-text-left"></i>
                                </button>
                                <button
                                    type="button"
                                    onMouseDown={e => { e.preventDefault(); execCmd('justifyCenter'); }}
                                    className="p-1.5 text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
                                    title="Rata Tengah"
                                >
                                    <i className="bi bi-text-center"></i>
                                </button>
                                <button
                                    type="button"
                                    onMouseDown={e => { e.preventDefault(); execCmd('justifyRight'); }}
                                    className="p-1.5 text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
                                    title="Rata Kanan"
                                >
                                    <i className="bi bi-text-right"></i>
                                </button>
                                <button
                                    type="button"
                                    onMouseDown={e => { e.preventDefault(); execCmd('justifyFull'); }}
                                    className="p-1.5 text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
                                    title="Rata Kanan Kiri (Justify)"
                                >
                                    <i className="bi bi-justify"></i>
                                </button>

                                <div className="w-px h-4 bg-slate-300 mx-1"></div>

                                <button
                                    type="button"
                                    onMouseDown={e => { e.preventDefault(); execCmd('removeFormat'); }}
                                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Hapus Format"
                                >
                                    <i className="bi bi-eraser"></i>
                                </button>

                                <div className="w-px h-4 bg-slate-300 mx-1.5"></div>

                                {/* Variable Chips Popover */}
                                <SuratVariablePopover onInsertVariable={handleInsertVariable} />

                                {/* AI Generator Trigger */}
                                <button
                                    type="button"
                                    onClick={() => setIsAiModalOpen(true)}
                                    className="px-2.5 py-1 rounded-xl text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100/80 border border-teal-200 flex items-center gap-1.5 transition-all"
                                >
                                    <i className="bi bi-magic text-teal-600"></i>
                                    <span>AI Susun Naskah</span>
                                </button>
                            </div>
                        ) : (
                            /* Bulk Page Switcher when in Preview Mode */
                            <div className="flex items-center justify-between w-full">
                                {generationMode === 'bulk' && targetSantris.length > 1 ? (
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-2 py-0.5">
                                            <button
                                                type="button"
                                                onClick={() => setCurrentBulkIndex(i => Math.max(0, i - 1))}
                                                disabled={currentBulkIndex === 0 || showAllBulkPages}
                                                className="p-1 text-slate-600 hover:text-slate-900 disabled:opacity-30"
                                                title="Santri Sebelumnya"
                                            >
                                                <i className="bi bi-chevron-left"></i>
                                            </button>
                                            <span className="font-semibold px-2 text-slate-700">
                                                Santri {currentBulkIndex + 1} dari {targetSantris.length}: {targetSantris[currentBulkIndex]?.namaLengkap}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => setCurrentBulkIndex(i => Math.min(targetSantris.length - 1, i + 1))}
                                                disabled={currentBulkIndex === targetSantris.length - 1 || showAllBulkPages}
                                                className="p-1 text-slate-600 hover:text-slate-900 disabled:opacity-30"
                                                title="Santri Selanjutnya"
                                            >
                                                <i className="bi bi-chevron-right"></i>
                                            </button>
                                        </div>

                                        <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                checked={showAllBulkPages}
                                                onChange={e => setShowAllBulkPages(e.target.checked)}
                                                className="w-3.5 h-3.5 rounded text-teal-600 border-slate-300"
                                            />
                                            <span>Tampilkan Semua {targetSantris.length} Halaman Sekaligus</span>
                                        </label>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 text-slate-500 text-xs">
                                        <i className="bi bi-check2-circle text-teal-600"></i>
                                        <span>Pratinjau naskah dengan data sebenarnya. Dokumen siap dicetak atau diunduh.</span>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="hidden lg:flex items-center gap-2 text-[11px] text-slate-400">
                            <span>Ukuran Kertas: A4 (21 x 29.7 cm)</span>
                            {usePrePrintedKop && <span className="text-amber-700 font-medium">• Kop Fisik (+{kopMarginTop} cm)</span>}
                        </div>
                    </div>
                )}
            </div>

            {/* WORKSPACE DESK MAT / CANVAS CONTAINER */}
            <div 
                ref={workspaceContainerRef}
                className="flex-1 min-h-0 overflow-auto p-4 sm:p-8 flex flex-col items-center relative" 
                id="surat-preview-container"
            >
                {template ? (
                    <>
                        {usePrePrintedKop && (
                            <div className="no-print mb-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-xs text-amber-800 flex items-center gap-2 shadow-2xs max-w-2xl text-center">
                                <i className="bi bi-info-circle-fill text-amber-600"></i>
                                <span>Kertas Kop Blanko Fisik: Kop digital disembunyikan. Teks surat otomatis diturunkan sejauh {kopMarginTop} cm agar pas dengan kertas resmi.</span>
                            </div>
                        )}

                        <div 
                            ref={contentWrapperRef}
                            className="printable-content-wrapper origin-top transition-transform duration-150 ease-out"
                            style={{ transform: `scale(${effectiveScale})` }}
                        >
                            {santrisToRender.map((currentSantri, index) => {
                                const shouldRenderStamp = stampConfig.show && stampConfig.stampUrl;
                                const calculatedTopPadding = usePrePrintedKop ? `${kopMarginTop}cm` : `${marginConfig.top}cm`;

                                return (
                                    <div 
                                        key={currentSantri ? currentSantri.id : `sheet-${index}`} 
                                        className={`bg-white shadow-2xl mx-auto flex flex-col justify-between ${index < santrisToRender.length - 1 ? 'page-break-after' : ''}`} 
                                        style={{ 
                                            width: '21cm', 
                                            minHeight: '29.7cm', 
                                            paddingTop: calculatedTopPadding,
                                            paddingRight: `${marginConfig.right}cm`,
                                            paddingBottom: `${marginConfig.bottom}cm`,
                                            paddingLeft: `${marginConfig.left}cm`,
                                            marginBottom: index < santrisToRender.length - 1 ? '2.5rem' : '0',
                                            fontSize: '12pt',
                                            lineHeight: '1.5'
                                        }}
                                    >
                                        <div>
                                            {/* Digital Kop vs Blanko Kop Fisik */}
                                            {!usePrePrintedKop ? (
                                                <PrintHeader settings={settings} title="" />
                                            ) : (
                                                <div className="h-2 mb-2"></div>
                                            )}
                                            
                                            {/* Top Date */}
                                            {tempatTanggalConfig.show && tempatTanggalConfig.position === 'top-right' && (
                                                <div className={`mb-4 flex w-full ${tempatTanggalConfig.align === 'center' ? 'justify-center' : tempatTanggalConfig.align === 'right' ? 'justify-end' : 'justify-start'}`}>
                                                    <div className="text-center" style={{ minWidth: '200px' }}>
                                                        <p>{tempatSurat}, {formattedTanggalSurat}</p>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Judul & Nomor Surat */}
                                            {judulSurat && showJudul && (
                                                <div className="text-center mb-5">
                                                    <h3 className="font-bold text-base underline uppercase tracking-wide inline-block">{judulSurat}</h3>
                                                    {nomorSurat && <p className="text-xs font-mono mt-0.5">Nomor: {nomorSurat}</p>}
                                                </div>
                                            )}
                                            
                                            {/* Content Area: Direct In-Paper Editing vs Processed Preview */}
                                            {viewMode === 'edit' ? (
                                                <div className="relative group">
                                                    <div
                                                        ref={inPaperEditorRef}
                                                        contentEditable
                                                        suppressContentEditableWarning
                                                        onInput={handleEditorInput}
                                                        className="in-paper-editor font-sans text-black text-justify leading-relaxed p-3 focus:outline-none focus:ring-2 focus:ring-teal-400/50 rounded-xl border border-dashed border-teal-300/60 bg-teal-50/10 hover:bg-teal-50/20 transition-all cursor-text min-h-[350px]"
                                                        style={{ fontSize: '11.5pt' }}
                                                        data-placeholder="Ketik atau edit isi naskah surat langsung di sini..."
                                                    />
                                                    <div className="no-print mt-1.5 flex items-center justify-between text-[11px] text-slate-400 px-1">
                                                        <span>*Ketik teks surat langsung di atas kertas atau sisipkan variabel dari toolbar.</span>
                                                        <button 
                                                            type="button" 
                                                            onClick={() => setViewMode('preview')} 
                                                            className="text-teal-700 hover:underline font-semibold"
                                                        >
                                                            Lihat Pratinjau dengan Data Santri →
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div 
                                                    className="font-sans text-black text-justify leading-relaxed flex-grow p-0" 
                                                    style={{ fontSize: '11.5pt' }} 
                                                    dangerouslySetInnerHTML={{ __html: getProcessedContent(currentSantri) }} 
                                                />
                                            )}
                                            
                                            <div className="mt-8">
                                                {/* Bottom Date */}
                                                {tempatTanggalConfig.show && tempatTanggalConfig.position !== 'top-right' && (
                                                     <div className={`mb-4 flex w-full ${
                                                         tempatTanggalConfig.position === 'bottom-left' ? 'justify-start' : 'justify-end'
                                                     }`}>
                                                        <div className={`text-${tempatTanggalConfig.align}`} style={{ minWidth: '220px' }}>
                                                            <p>{tempatSurat}, {formattedTanggalSurat}</p>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Mengetahui */}
                                                {mengetahui.show && (
                                                    <div className={`mb-8 flex w-full ${mengetahui.align === 'center' ? 'justify-center' : mengetahui.align === 'right' ? 'justify-end' : 'justify-start'}`}>
                                                        <div className="text-center" style={{ minWidth: '220px' }}>
                                                            <p className="font-medium">{mengetahui.jabatan}</p>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Signatories Grid */}
                                                <div className={`grid gap-8 ${
                                                    activeSignatories.length === 1 ? 'grid-cols-1 justify-items-end' : 
                                                    activeSignatories.length === 2 ? 'grid-cols-2' : 
                                                    'grid-cols-3'
                                                }`}>
                                                    {activeSignatories.map((rawSig, i) => {
                                                        const sig = resolveSignatoryForSantri(rawSig, currentSantri);
                                                        const renderStampHere = shouldRenderStamp && (activeSignatories.length === 1 || stampConfig.placementSignatoryId === rawSig.id);
                                                        return (
                                                            <div key={i} className="text-center flex flex-col items-center relative" style={{ minWidth: '200px' }}>
                                                                <div className="flex flex-col items-center w-full">
                                                                    <p className="font-medium">{sig.jabatan}</p>
                                                                    <div className="h-20 w-full flex justify-center items-center my-2">
                                                                        {sig.signatureUrl && (
                                                                            <img src={sig.signatureUrl} alt={`TTD ${sig.nama}`} className="max-h-full max-w-full object-contain mix-blend-darken" />
                                                                        )}
                                                                    </div>
                                                                    {renderStampHere && (
                                                                        <img
                                                                            src={stampConfig.stampUrl}
                                                                            alt="Stempel"
                                                                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 object-contain opacity-75 mix-blend-multiply transform -rotate-12 pointer-events-none"
                                                                        />
                                                                    )}
                                                                    <p className="font-bold underline">{sig.nama}</p>
                                                                    {sig.showNip !== false && sig.nip && <p className="text-xs">NIP. {sig.nip}</p>}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-auto pt-3 border-t border-gray-300 text-center text-[8pt] text-gray-400 italic w-full">
                                            Dibuat secara otomatis melalui Sistem Administrasi Pesantren eSantri Web
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* FLOATING ZOOM PILL CONTROLS (at bottom center of canvas) */}
                        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 no-print">
                            <div className="flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md text-white px-3 py-1.5 rounded-full shadow-2xl border border-slate-700/80 text-xs">
                                <button 
                                    onClick={handleZoomOut} 
                                    className="w-7 h-7 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors" 
                                    title="Perkecil Kanvas (-)"
                                >
                                    <i className="bi bi-dash-lg"></i>
                                </button>
                                <span className="font-mono text-xs w-12 text-center select-none font-bold text-teal-300">
                                    {Math.round(effectiveScale * 100)}%
                                </span>
                                <button 
                                    onClick={handleZoomIn} 
                                    className="w-7 h-7 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors" 
                                    title="Perbesar Kanvas (+)"
                                >
                                    <i className="bi bi-plus-lg"></i>
                                </button>
                                <div className="w-px h-4 bg-slate-700 mx-1"></div>
                                <button 
                                    onClick={handleFitWidth} 
                                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${zoomMode === 'fit-width' ? 'bg-teal-600 text-white font-bold' : 'hover:bg-white/20 text-slate-300'}`}
                                    title="Sesuaikan lebar kertas dengan layar"
                                >
                                    Fit Lebar
                                </button>
                                <button 
                                    onClick={handleFitPage} 
                                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${zoomMode === 'fit-page' ? 'bg-teal-600 text-white font-bold' : 'hover:bg-white/20 text-slate-300'}`}
                                    title="Tampilkan seluruh tinggi kertas A4 di layar"
                                >
                                    Fit Halaman
                                </button>
                                <button 
                                    onClick={handleReset100} 
                                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${zoomMode === '100%' ? 'bg-teal-600 text-white font-bold' : 'hover:bg-white/20 text-slate-300'}`}
                                    title="Ukuran Asli Cetak 100%"
                                >
                                    100%
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    /* Blank Studio Workspace when no template selected */
                    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-2xl mx-auto my-auto">
                        <div className="h-16 w-16 rounded-3xl bg-white text-teal-600 flex items-center justify-center text-3xl mb-4 shadow-sm border border-slate-200">
                            <i className="bi bi-file-earmark-text"></i>
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 mb-1">Mulai Membuat Surat Resmi</h3>
                        <p className="text-xs text-slate-500 mb-6 max-w-md leading-relaxed">
                            Pilih salah satu template surat resmi di bawah ini untuk membuka kanvas naskah langsung di atas kertas A4.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 w-full">
                            {suratTemplates.slice(0, 6).map(t => (
                                <button
                                    key={t.id}
                                    type="button"
                                    onClick={() => setSelectedTemplateId(t.id)}
                                    className="p-3.5 text-left rounded-2xl border border-slate-200 bg-white hover:border-teal-400 hover:bg-teal-50/40 transition-all shadow-2xs group flex flex-col justify-between"
                                >
                                    <div>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="font-bold text-xs text-slate-800 group-hover:text-teal-800 line-clamp-1">{t.nama}</span>
                                        </div>
                                        <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">{t.judul}</p>
                                    </div>
                                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                                        <span className="font-mono text-[10px] text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded font-bold border border-teal-200">{t.kodeSurat || 'SRT'}</span>
                                        <span className="text-[11px] text-teal-600 font-semibold group-hover:translate-x-0.5 transition-transform">Pilih →</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* SANTRI SELECTOR MODAL */}
            {isSantriModalOpen && (
                <SuratSantriSelectorModal
                    isOpen={isSantriModalOpen}
                    onClose={() => setIsSantriModalOpen(false)}
                    generationMode={generationMode}
                    onModeChange={setGenerationMode}
                    selectedSantriId={selectedSantriId}
                    onSelectSingle={setSelectedSantriId}
                    bulkSelectedIds={bulkSelectedIds}
                    onToggleBulkSelectOne={id => setBulkSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])}
                    onToggleBulkSelectAll={filteredIds => {
                        const isAll = filteredIds.every(id => bulkSelectedIds.includes(id));
                        if (isAll) {
                            setBulkSelectedIds(prev => prev.filter(id => !filteredIds.includes(id)));
                        } else {
                            setBulkSelectedIds(prev => Array.from(new Set([...prev, ...filteredIds])));
                        }
                    }}
                    santriList={santriList}
                    settings={settings}
                />
            )}

            {/* FORMAT & DOCUMENT SETTINGS DRAWER */}
            {isSettingsDrawerOpen && (
                <SuratSettingsDrawer
                    isOpen={isSettingsDrawerOpen}
                    onClose={() => setIsSettingsDrawerOpen(false)}
                    nomorSurat={nomorSurat}
                    onNomorSuratChange={setNomorSurat}
                    onAutoGenerateNomor={handleGenerateAutoNumber}
                    judulSurat={judulSurat}
                    onJudulSuratChange={setJudulSurat}
                    showJudul={showJudul}
                    onShowJudulChange={setShowJudul}
                    tempatSurat={tempatSurat}
                    onTempatSuratChange={setTempatSurat}
                    tanggalSurat={tanggalSurat}
                    onTanggalSuratChange={setTanggalSurat}
                    tempatTanggalConfig={tempatTanggalConfig}
                    onTempatTanggalConfigChange={setTempatTanggalConfig}
                    usePrePrintedKop={usePrePrintedKop}
                    onUsePrePrintedKopChange={setUsePrePrintedKop}
                    kopMarginTop={kopMarginTop}
                    onKopMarginTopChange={setKopMarginTop}
                    marginConfig={marginConfig}
                    onMarginConfigChange={setMarginConfig}
                    activeSignatories={activeSignatories}
                    onSignatoriesChange={setActiveSignatories}
                    mengetahui={mengetahui}
                    onMengetahuiChange={setMengetahui}
                    stampConfig={stampConfig}
                    onStampConfigChange={setStampConfig}
                    settings={settings}
                    currentSantri={targetSantris[0]}
                />
            )}

            {/* AI GENERATOR MODAL */}
            {isAiModalOpen && (
                <div className="app-overlay fixed inset-0 z-[220] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
                    <div className="app-modal flex w-full max-w-lg flex-col rounded-[24px] bg-white shadow-2xl overflow-hidden border border-slate-200">
                        <div className="flex items-center justify-between border-b border-app-border bg-slate-50 px-6 py-4">
                            <div className="flex items-center gap-2">
                                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-100 text-teal-700">
                                    <i className="bi bi-magic text-sm"></i>
                                </span>
                                <h3 className="text-base font-bold text-slate-800">AI Susun Naskah Surat</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsAiModalOpen(false)}
                                className="app-button-ghost h-8 w-8 rounded-full p-0 text-slate-400 hover:text-slate-600"
                            >
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>
                        <div className="p-6 space-y-3">
                            <p className="text-xs text-slate-600">
                                Jelaskan maksud atau isi surat yang ingin dibuat. AI akan menyusun draf naskah resmi lengkap dengan tag variabel pesantren.
                            </p>
                            <textarea
                                rows={4}
                                value={aiPrompt}
                                onChange={e => setAiPrompt(e.target.value)}
                                placeholder="cth: Buatkan naskah surat izin cuti santri selama 5 hari karena acara keluarga di kampung halaman..."
                                className="app-input w-full p-3 text-xs rounded-xl"
                            />
                        </div>
                        <div className="flex justify-end gap-2 border-t border-app-border bg-slate-50 px-6 py-3.5">
                            <button
                                type="button"
                                onClick={() => setIsAiModalOpen(false)}
                                className="app-button-secondary px-4 py-2 text-xs rounded-xl"
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={handleAiGenerate}
                                disabled={isGeneratingAi || !aiPrompt.trim()}
                                className="app-button-primary px-5 py-2 text-xs rounded-xl flex items-center gap-1.5 disabled:opacity-50"
                            >
                                {isGeneratingAi ? <span className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full"></span> : <i className="bi bi-stars"></i>}
                                <span>{isGeneratingAi ? 'Menyusun Naskah...' : 'Terapkan ke Kertas'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Post-Archive WhatsApp Modal */}
            {isWaModalOpen && lastSavedArsip && (
                <SuratWhatsAppModal
                    isOpen={isWaModalOpen}
                    onClose={() => setIsWaModalOpen(false)}
                    arsip={lastSavedArsip}
                    santri={targetSantris[0]}
                    settings={settings}
                    onToast={showToast}
                />
            )}
        </div>
    );
};

// --- Main SuratMenyurat Component ---

const SuratMenyurat: React.FC = () => {
    const { 
        suratTemplates, 
        arsipSuratList, 
        onSaveSuratTemplate, 
        onDeleteSuratTemplate, 
        onDeleteArsipSurat, 
        currentUser, 
        showConfirmation, 
        showToast,
        settings
    } = useAppContext();
    const { santriList } = useSantriContext();

    const [activeTab, setActiveTab] = useState<'templates' | 'buat' | 'arsip'>('templates');
    const canWrite = currentUser?.role === 'admin' || currentUser?.permissions?.surat === 'write';

    const suratTabs = [
        { value: 'templates', label: 'Manajemen Template' },
        { value: 'buat', label: 'Buat Surat Baru' },
        { value: 'arsip', label: `Arsip Surat (${arsipSuratList.length})` },
    ] as const;

    // Modals
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<SuratTemplate | undefined>(undefined);
    
    const [isArsipModalOpen, setIsArsipModalOpen] = useState(false);
    const [viewingArsip, setViewingArsip] = useState<ArsipSurat | null>(null);

    const [isAgendaModalOpen, setIsAgendaModalOpen] = useState(false);
    const [isWaModalOpen, setIsWaModalOpen] = useState(false);
    const [waModalArsip, setWaModalArsip] = useState<ArsipSurat | null>(null);

    // Search & Filter State for Arsip
    const [searchArsip, setSearchArsip] = useState('');
    const [filterDateStart, setFilterDateStart] = useState('');
    const [filterDateEnd, setFilterDateEnd] = useState('');

    // Load default templates handler
    const handleLoadDefaultTemplates = async () => {
        if (!canWrite) {
            showToast('Anda tidak memiliki akses untuk menambah template.', 'error');
            return;
        }

        showConfirmation(
            'Muat 6 Template Standar Pesantren?',
            'Sistem akan menambahkan paket template resmi: Surat Keterangan Aktif, Izin Cuti, Berkelakuan Baik, Undangan Wali, Rekomendasi Beasiswa, dan Mutasi.',
            async () => {
                try {
                    let count = 0;
                    for (const preset of DEFAULT_SURAT_TEMPLATES) {
                        // Check if already exists by name
                        const exists = suratTemplates.some(t => t.nama.toLowerCase() === preset.nama.toLowerCase());
                        if (!exists) {
                            await onSaveSuratTemplate(preset as SuratTemplate);
                            count++;
                        }
                    }
                    showToast(`${count} template standar pesantren berhasil ditambahkan!`, 'success');
                } catch {
                    showToast('Gagal memuat template standar', 'error');
                }
            }
        );
    };

    const handleSaveTemplate = async (template: SuratTemplate) => {
        if (!canWrite) {
            showToast('Anda tidak memiliki akses untuk menyimpan template.', 'error');
            return;
        }
        await onSaveSuratTemplate(template);
        setIsTemplateModalOpen(false);
        showToast('Template surat berhasil disimpan', 'success');
    };

    const handleDeleteTemplate = (id: number) => {
        if (!canWrite) {
            showToast('Anda tidak memiliki akses untuk menghapus template.', 'error');
            return;
        }
        showConfirmation('Hapus Template?', 'Template ini akan dihapus permanen.', async () => {
            await onDeleteSuratTemplate(id);
            showToast('Template berhasil dihapus', 'success');
        }, { confirmColor: 'red' });
    };

    const handleDeleteArsip = (id: number) => {
        if (!canWrite) {
            showToast('Anda tidak memiliki akses untuk menghapus arsip.', 'error');
            return;
        }
        showConfirmation('Hapus Arsip Surat?', 'Arsip surat ini akan dihapus permanen dari sistem.', async () => {
            await onDeleteArsipSurat(id);
            showToast('Arsip surat berhasil dihapus', 'success');
        }, { confirmColor: 'red' });
    };

    const handleOpenWhatsApp = (arsip: ArsipSurat) => {
        setWaModalArsip(arsip);
        setIsWaModalOpen(true);
    };

    // Filtered Arsip List
    const filteredArsipList = useMemo(() => {
        return [...arsipSuratList].filter(arsip => {
            if (searchArsip.trim()) {
                const query = searchArsip.toLowerCase();
                const matchNomor = arsip.nomorSurat?.toLowerCase().includes(query);
                const matchPerihal = arsip.perihal?.toLowerCase().includes(query);
                const matchTujuan = arsip.tujuan?.toLowerCase().includes(query);
                if (!matchNomor && !matchPerihal && !matchTujuan) return false;
            }
            if (filterDateStart && arsip.tanggalBuat < filterDateStart) return false;
            if (filterDateEnd && arsip.tanggalBuat > filterDateEnd) return false;
            return true;
        }).sort((a, b) => new Date(b.tanggalBuat).getTime() - new Date(a.tanggalBuat).getTime());
    }, [arsipSuratList, searchArsip, filterDateStart, filterDateEnd]);

    // Export Arsip to Excel directly
    const handleExportExcelArsip = async () => {
        try {
            const XLSX = await loadXLSX();
            const rows = filteredArsipList.map((item, idx) => ({
                'No': idx + 1,
                'Nomor Surat': item.nomorSurat,
                'Tanggal': item.tanggalBuat,
                'Ditujukan Kepada': item.tujuan,
                'Perihal': item.perihal,
                'Penanda Tangan': item.signatoriesSnapshot?.map(s => `${s.jabatan}: ${s.nama}`).join('; ') || '-',
                'Tempat Cetak': item.tempatCetak || '-'
            }));

            const ws = XLSX.utils.json_to_sheet(rows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Agenda Surat Keluar');
            XLSX.writeFile(wb, `Buku_Agenda_Surat_${new Date().toISOString().split('T')[0]}.xlsx`);
            showToast('Buku agenda surat berhasil diekspor ke Excel', 'success');
        } catch {
            showToast('Gagal mengekspor data ke Excel', 'error');
        }
    };

    // Stats calculations
    const curYear = new Date().getFullYear();
    const curMonth = new Date().getMonth();
    const curDateStr = new Date().toISOString().split('T')[0];

    const countThisMonth = useMemo(() => {
        return arsipSuratList.filter(a => {
            const d = new Date(a.tanggalBuat);
            return d.getFullYear() === curYear && d.getMonth() === curMonth;
        }).length;
    }, [arsipSuratList, curYear, curMonth]);

    const countToday = useMemo(() => {
        return arsipSuratList.filter(a => a.tanggalBuat === curDateStr).length;
    }, [arsipSuratList, curDateStr]);

    return (
        <div className="space-y-6">
            <PageHeader
                eyebrow="Tata Usaha & Administrasi"
                title="Surat Menyurat & Buku Agenda"
                description="Kelola template surat resmi, buat surat perorangan atau massal dengan variabel otomatis, dan rekap buku agenda surat keluar."
                tabs={
                    <HeaderTabs
                        tabs={suratTabs as unknown as { value: string; label: string }[]}
                        value={activeTab}
                        onChange={(value) => setActiveTab(value as 'templates' | 'buat' | 'arsip')}
                    />
                }
            />

            {activeTab === 'templates' && (
                <SectionCard
                    title="Daftar Template Surat"
                    description="Template resmi mempermudah administrasi agar format surat selalu terstandar, rapi, dan konsisten."
                    contentClassName="p-6"
                    actions={canWrite ? (
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={handleLoadDefaultTemplates}
                                className="app-button-secondary px-3.5 py-2 text-xs rounded-xl flex items-center gap-1.5"
                                title="Muat paket template resmi pesantren"
                            >
                                <i className="bi bi-collection text-teal-600"></i> Muat Template Standar
                            </button>
                            <button 
                                onClick={() => { setEditingTemplate(undefined); setIsTemplateModalOpen(true); }} 
                                className="app-button-primary px-4 py-2 text-xs rounded-xl flex items-center gap-1.5 shadow-sm"
                            >
                                <i className="bi bi-plus-lg"></i> Buat Template Baru
                            </button>
                        </div>
                    ) : undefined}
                >
                    <TemplateManager 
                        onEdit={(t) => { setEditingTemplate(t); setIsTemplateModalOpen(true); }} 
                        onDelete={handleDeleteTemplate} 
                        onLoadPresets={handleLoadDefaultTemplates}
                        canWrite={canWrite} 
                    />
                </SectionCard>
            )}

            {activeTab === 'buat' && <SuratGenerator canWrite={canWrite} />}

            {activeTab === 'arsip' && (
                <div className="space-y-5">
                    {/* Stats Overview */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="app-panel rounded-2xl p-4 border border-slate-200 shadow-2xs flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-100 text-teal-700 text-xl">
                                <i className="bi bi-archive"></i>
                            </div>
                            <div>
                                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Total Surat Keluar</span>
                                <span className="text-xl font-bold text-slate-800">{arsipSuratList.length}</span>
                                <span className="text-xs text-slate-400 ml-1">arsip</span>
                            </div>
                        </div>

                        <div className="app-panel rounded-2xl p-4 border border-slate-200 shadow-2xs flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-700 text-xl">
                                <i className="bi bi-calendar-check"></i>
                            </div>
                            <div>
                                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Surat Bulan Ini</span>
                                <span className="text-xl font-bold text-slate-800">{countThisMonth}</span>
                                <span className="text-xs text-slate-400 ml-1">surat</span>
                            </div>
                        </div>

                        <div className="app-panel rounded-2xl p-4 border border-slate-200 shadow-2xs flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 text-xl">
                                <i className="bi bi-send-check"></i>
                            </div>
                            <div>
                                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Surat Hari Ini</span>
                                <span className="text-xl font-bold text-slate-800">{countToday}</span>
                                <span className="text-xs text-slate-400 ml-1">surat</span>
                            </div>
                        </div>
                    </div>

                    {/* Filter & Action Bar */}
                    <SectionCard 
                        title="Buku Agenda Surat Keluar" 
                        description="Telusuri riwayat surat, cetak rekapitulasi buku agenda resmi TU, atau kirim notifikasi langsung ke WhatsApp wali santri." 
                        contentClassName="p-5"
                        actions={
                            <div className="flex flex-wrap items-center gap-2">
                                <button
                                    type="button"
                                    onClick={handleExportExcelArsip}
                                    className="app-button-secondary px-3.5 py-2 text-xs rounded-xl flex items-center gap-1.5 text-emerald-700 hover:bg-emerald-50"
                                >
                                    <i className="bi bi-file-earmark-excel text-emerald-600"></i> Ekspor Excel
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsAgendaModalOpen(true)}
                                    className="app-button-primary px-3.5 py-2 text-xs rounded-xl flex items-center gap-1.5 shadow-sm"
                                >
                                    <i className="bi bi-printer"></i> Cetak Rekap Agenda
                                </button>
                            </div>
                        }
                    >
                        {/* Search & Filter Controls */}
                        <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                                    <i className="bi bi-search"></i>
                                </span>
                                <input
                                    type="text"
                                    value={searchArsip}
                                    onChange={e => setSearchArsip(e.target.value)}
                                    placeholder="Cari nomor surat, perihal, santri..."
                                    className="app-input w-full pl-9 pr-3 py-2 text-xs rounded-xl"
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-500 whitespace-nowrap">Dari:</span>
                                <input
                                    type="date"
                                    value={filterDateStart}
                                    onChange={e => setFilterDateStart(e.target.value)}
                                    className="app-input w-full py-1.5 px-2.5 text-xs rounded-xl"
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-500 whitespace-nowrap">Sampai:</span>
                                <input
                                    type="date"
                                    value={filterDateEnd}
                                    onChange={e => setFilterDateEnd(e.target.value)}
                                    className="app-input w-full py-1.5 px-2.5 text-xs rounded-xl"
                                />
                                {(searchArsip || filterDateStart || filterDateEnd) && (
                                    <button
                                        type="button"
                                        onClick={() => { setSearchArsip(''); setFilterDateStart(''); setFilterDateEnd(''); }}
                                        className="app-button-ghost text-xs text-slate-500 hover:text-slate-800 px-2 py-1"
                                        title="Reset Filter"
                                    >
                                        Reset
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Mobile Cards */}
                        <div className="space-y-3 md:hidden">
                            {filteredArsipList.map((arsip) => (
                                <div key={arsip.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
                                    <div className="flex items-center justify-between mb-1 text-xs">
                                        <span className="font-mono text-[11px] text-teal-800 font-semibold bg-teal-50 px-2 py-0.5 rounded">
                                            {arsip.nomorSurat}
                                        </span>
                                        <span className="text-slate-400">
                                            {new Date(arsip.tanggalBuat).toLocaleDateString('id-ID')}
                                        </span>
                                    </div>
                                    <div className="mt-2 text-sm font-semibold text-slate-800">{arsip.perihal}</div>
                                    <div className="mt-1 text-xs text-slate-500 flex items-center gap-1">
                                        <i className="bi bi-person text-slate-400"></i> Tujuan: <b className="text-slate-700">{arsip.tujuan}</b>
                                    </div>
                                    <div className="mt-3 flex items-center justify-end gap-1.5 border-t border-slate-100 pt-2.5">
                                        <button 
                                            onClick={() => handleOpenWhatsApp(arsip)} 
                                            className="app-button-ghost h-8 px-2.5 rounded-lg text-emerald-600 hover:bg-emerald-50 text-xs flex items-center gap-1" 
                                            title="Kirim WA"
                                        >
                                            <i className="bi bi-whatsapp"></i> WA
                                        </button>
                                        <button 
                                            onClick={() => { setViewingArsip(arsip); setIsArsipModalOpen(true); }} 
                                            className="app-button-ghost h-8 px-2.5 rounded-lg text-blue-600 hover:bg-blue-50 text-xs flex items-center gap-1" 
                                            title="Lihat"
                                        >
                                            <i className="bi bi-eye"></i> Lihat
                                        </button>
                                        {canWrite && (
                                            <button 
                                                onClick={() => handleDeleteArsip(arsip.id)} 
                                                className="app-button-ghost h-8 w-8 rounded-full p-0 text-red-600 hover:bg-red-50 text-xs" 
                                                title="Hapus"
                                            >
                                                <i className="bi bi-trash"></i>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {filteredArsipList.length === 0 && (
                                <EmptyState icon="bi-archive" title="Tidak ada arsip surat" description="Tidak ditemukan arsip surat keluar sesuai kriteria pencarian." />
                            )}
                        </div>

                        {/* Desktop Table */}
                        <div className="hidden md:block app-table-shell overflow-x-auto rounded-2xl border border-slate-200">
                            <table className="app-table text-left text-xs">
                                <thead className="border-b border-app-border bg-slate-50 text-slate-700 font-bold">
                                    <tr>
                                        <th className="p-3 w-28">Tanggal</th>
                                        <th className="p-3 w-48">Nomor Surat</th>
                                        <th className="p-3">Perihal / Judul</th>
                                        <th className="p-3 w-52">Ditujukan Kepada</th>
                                        <th className="p-3 text-center w-36">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-app-border">
                                    {filteredArsipList.map(arsip => (
                                        <tr key={arsip.id} className="hover:bg-teal-50/40 transition-colors">
                                            <td className="p-3 whitespace-nowrap text-slate-500">
                                                {new Date(arsip.tanggalBuat).toLocaleDateString('id-ID')}
                                            </td>
                                            <td className="p-3 font-mono text-[11px] font-semibold text-teal-800">
                                                {arsip.nomorSurat}
                                            </td>
                                            <td className="p-3 font-medium text-slate-800">
                                                {arsip.perihal}
                                                {arsip.usePrePrintedKopSnapshot && (
                                                    <span className="ml-2 rounded-full bg-amber-100 text-amber-800 text-[10px] font-semibold px-2 py-0.2">
                                                        Kop Fisik
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-3 text-slate-700 font-medium">
                                                {arsip.tujuan}
                                            </td>
                                            <td className="p-3 text-center">
                                                <div className="flex justify-center items-center gap-1">
                                                    <button 
                                                        onClick={() => handleOpenWhatsApp(arsip)} 
                                                        className="app-button-ghost h-8 w-8 rounded-full p-0 text-emerald-600 hover:bg-emerald-50" 
                                                        title="Kirim Notifikasi WhatsApp"
                                                    >
                                                        <i className="bi bi-whatsapp"></i>
                                                    </button>
                                                    <button 
                                                        onClick={() => { setViewingArsip(arsip); setIsArsipModalOpen(true); }} 
                                                        className="app-button-ghost h-8 w-8 rounded-full p-0 text-blue-600 hover:bg-blue-50" 
                                                        title="Lihat Dokumen"
                                                    >
                                                        <i className="bi bi-eye"></i>
                                                    </button>
                                                    {canWrite && (
                                                        <button 
                                                            onClick={() => handleDeleteArsip(arsip.id)} 
                                                            className="app-button-ghost h-8 w-8 rounded-full p-0 text-red-600 hover:bg-red-50" 
                                                            title="Hapus Arsip"
                                                        >
                                                            <i className="bi bi-trash"></i>
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredArsipList.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="p-6">
                                                <EmptyState icon="bi-archive" title="Tidak ada arsip surat" description="Tidak ditemukan arsip surat keluar sesuai kriteria pencarian." />
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </SectionCard>
                </div>
            )}

            {/* Template Edit / Create Modal */}
            <TemplateModal 
                isOpen={isTemplateModalOpen} 
                onClose={() => setIsTemplateModalOpen(false)} 
                onSave={handleSaveTemplate} 
                initialData={editingTemplate} 
            />

            {/* View Archive Modal */}
            {viewingArsip && (
                <ArsipViewerModal 
                    isOpen={isArsipModalOpen} 
                    onClose={() => setIsArsipModalOpen(false)} 
                    arsip={viewingArsip} 
                    onOpenWhatsApp={handleOpenWhatsApp}
                />
            )}

            {/* Print Buku Agenda Modal */}
            <BukuAgendaPrintModal
                isOpen={isAgendaModalOpen}
                onClose={() => setIsAgendaModalOpen(false)}
                arsipList={filteredArsipList}
                settings={settings}
                filterLabel={filterDateStart || filterDateEnd ? `${filterDateStart || 'Awal'} s/d ${filterDateEnd || 'Sekarang'}` : undefined}
                onToast={showToast}
            />

            {/* WhatsApp Notification Modal */}
            {isWaModalOpen && waModalArsip && (
                <SuratWhatsAppModal
                    isOpen={isWaModalOpen}
                    onClose={() => setIsWaModalOpen(false)}
                    arsip={waModalArsip}
                    santri={santriList.find(s => s.id === waModalArsip.santriId || s.namaLengkap === waModalArsip.tujuan)}
                    settings={settings}
                    onToast={showToast}
                />
            )}
        </div>
    );
};

export default SuratMenyurat;
