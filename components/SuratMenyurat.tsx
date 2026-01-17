
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAppContext } from '../AppContext';
import { useSantriContext } from '../contexts/SantriContext';
import { SuratTemplate, ArsipSurat, Santri, SuratSignatory, MengetahuiConfig, TempatTanggalConfig, MarginConfig, StampConfig } from '../types';
import { generatePdf, printToPdfNative } from '../utils/pdfGenerator';
import { PrintHeader } from './common/PrintHeader';
import { SimpleEditor } from './common/SimpleEditor';
import { generateLetterDraft } from '../services/aiService';

// --- Helper Functions ---
const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });

// --- Modal Components ---

const TemplateModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (template: SuratTemplate) => void;
    initialData?: SuratTemplate;
}> = ({ isOpen, onClose, onSave, initialData }) => {
    const { showToast } = useAppContext();
    const [nama, setNama] = useState('');
    const [kategori, setKategori] = useState<SuratTemplate['kategori']>('Resmi');
    const [judul, setJudul] = useState('');
    const [konten, setKonten] = useState('');
    const [aiPrompt, setAiPrompt] = useState('');
    const [isGeneratingAi, setIsGeneratingAi] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setNama(initialData.nama);
                setKategori(initialData.kategori);
                setJudul(initialData.judul);
                setKonten(initialData.konten);
            } else {
                setNama('');
                setKategori('Resmi');
                setJudul('');
                setKonten('');
            }
            setAiPrompt('');
        }
    }, [isOpen, initialData]);

    if (!isOpen) return null;

    const handleSave = () => {
        if (!nama || !judul) {
            showToast('Nama dan Judul template wajib diisi', 'error');
            return;
        }
        onSave({
            id: initialData?.id || Date.now(),
            nama,
            kategori,
            judul,
            konten,
            signatories: initialData?.signatories,
            mengetahuiConfig: initialData?.mengetahuiConfig,
            tempatTanggalConfig: initialData?.tempatTanggalConfig,
            marginConfig: initialData?.marginConfig,
            stampConfig: initialData?.stampConfig,
            showJudul: initialData?.showJudul
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
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[90vh] flex flex-col">
                <div className="p-4 border-b flex justify-between items-center">
                    <h3 className="text-lg font-bold">{initialData ? 'Edit Template' : 'Buat Template Baru'}</h3>
                    <button onClick={onClose}><i className="bi bi-x-lg"></i></button>
                </div>
                <div className="p-6 overflow-y-auto flex-grow space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Nama Template</label>
                            <input type="text" value={nama} onChange={e => setNama(e.target.value)} className="w-full border rounded p-2" placeholder="cth: Surat Izin Pulang" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Kategori</label>
                            <select value={kategori} onChange={e => setKategori(e.target.value as any)} className="w-full border rounded p-2">
                                <option value="Resmi">Resmi</option>
                                <option value="Pemberitahuan">Pemberitahuan</option>
                                <option value="Izin">Izin</option>
                                <option value="Lainnya">Lainnya</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Judul Surat (Kop)</label>
                        <input type="text" value={judul} onChange={e => setJudul(e.target.value)} className="w-full border rounded p-2" placeholder="cth: SURAT KETERANGAN" />
                    </div>
                    
                    <div className="bg-purple-50 p-3 rounded border border-purple-200">
                        <label className="block text-xs font-bold text-purple-700 mb-1"><i className="bi bi-magic"></i> AI Magic Draft</label>
                        <div className="flex gap-2">
                            <input type="text" value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} className="flex-grow border rounded p-2 text-sm" placeholder="cth: Buatkan surat undangan pengambilan rapot untuk wali santri..." />
                            <button onClick={handleAiGenerate} disabled={isGeneratingAi} className="bg-purple-600 text-white px-4 py-2 rounded text-sm hover:bg-purple-700 disabled:opacity-50">
                                {isGeneratingAi ? 'Generating...' : 'Buat Draft'}
                            </button>
                        </div>
                    </div>

                    <div className="flex-grow flex flex-col">
                        <label className="block text-sm font-medium mb-1">Isi Surat</label>
                        <div className="flex-grow border rounded">
                             <SimpleEditor value={konten} onChange={setKonten} placeholder="Tulis isi surat di sini..." />
                        </div>
                    </div>
                </div>
                <div className="p-4 border-t flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 border rounded">Batal</button>
                    <button onClick={handleSave} className="px-4 py-2 bg-teal-600 text-white rounded">Simpan</button>
                </div>
            </div>
        </div>
    );
};

const ArsipViewerModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    arsip: ArsipSurat;
}> = ({ isOpen, onClose, arsip }) => {
    if (!isOpen) return null;
    const { settings } = useAppContext();

    const formattedTanggal = arsip.tanggalCetak || new Date(arsip.tanggalBuat).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const tempat = arsip.tempatCetak || settings.alamat.split(',')[1]?.trim() || 'Tempat';

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-[70] flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl h-[90vh] flex flex-col">
                <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                    <div>
                        <h3 className="text-lg font-bold text-gray-800">Arsip: {arsip.nomorSurat}</h3>
                        <p className="text-sm text-gray-500">Tujuan: {arsip.tujuan} | Tgl: {new Date(arsip.tanggalBuat).toLocaleDateString()}</p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => printToPdfNative('arsip-preview', `Arsip_${arsip.nomorSurat}`)} className="bg-gray-700 text-white px-3 py-1.5 rounded text-sm"><i className="bi bi-printer"></i> Cetak</button>
                        <button onClick={onClose} className="text-gray-500 hover:text-gray-700"><i className="bi bi-x-lg text-xl"></i></button>
                    </div>
                </div>
                <div className="flex-grow overflow-auto bg-gray-200 p-8 flex justify-center">
                    <div id="arsip-preview" className="bg-white shadow-lg p-8" style={{ width: '21cm', minHeight: '29.7cm', padding: '2cm' }}>
                         <PrintHeader settings={settings} title="" />
                         
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
}

// --- Components for Tabs ---

const TemplateManager: React.FC<{ 
    onEdit: (t: SuratTemplate) => void; 
    onDelete: (id: number) => void;
    canWrite: boolean;
}> = ({ onEdit, onDelete, canWrite }) => {
    const { suratTemplates } = useAppContext();

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {suratTemplates.map(t => (
                    <div key={t.id} className="border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-2">
                            <h4 className="font-bold text-gray-800">{t.nama}</h4>
                            <span className={`text-xs px-2 py-1 rounded-full ${t.kategori === 'Resmi' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>{t.kategori}</span>
                        </div>
                        <p className="text-sm text-gray-500 mb-4 line-clamp-2">{t.judul}</p>
                        <div className="text-xs text-gray-400 mb-3">
                            <i className="bi bi-pen mr-1"></i>{t.signatories?.length || 0} Penanda Tangan
                        </div>
                        {canWrite && (
                            <div className="flex justify-end gap-2">
                                <button onClick={() => onEdit(t)} className="text-blue-600 hover:bg-blue-50 p-2 rounded-full text-sm" title="Edit Template"><i className="bi bi-pencil-square"></i></button>
                                <button onClick={() => onDelete(t.id)} className="text-red-600 hover:bg-red-50 p-2 rounded-full text-sm" title="Hapus Template"><i className="bi bi-trash"></i></button>
                            </div>
                        )}
                    </div>
                ))}
                {suratTemplates.length === 0 && <div className="col-span-full text-center p-8 text-gray-500">Belum ada template surat. Buat baru untuk memulai.</div>}
            </div>
        </div>
    );
};

const SuratGenerator: React.FC<{ canWrite: boolean }> = ({ canWrite }) => {
    const { suratTemplates, onSaveArsipSurat, settings, showToast } = useAppContext();
    const { santriList } = useSantriContext();
    
    const [selectedTemplateId, setSelectedTemplateId] = useState<number | ''>('');
    
    // Mode & Filters
    const [generationMode, setGenerationMode] = useState<'single' | 'bulk'>('single');
    const [filterJenjangId, setFilterJenjangId] = useState<string>('');
    const [filterKelasId, setFilterKelasId] = useState<string>('');
    const [filterRombelId, setFilterRombelId] = useState<string>('');

    // Selection State
    const [selectedSantriId, setSelectedSantriId] = useState<number | ''>(''); // For single mode
    const [bulkSelectedIds, setBulkSelectedIds] = useState<number[]>([]); // For bulk mode

    const [nomorSurat, setNomorSurat] = useState('');
    const [customContent, setCustomContent] = useState('');
    const [previewMode, setPreviewMode] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    // Surat Meta
    const [tempatSurat, setTempatSurat] = useState(settings.alamat.split(',')[1]?.trim() || 'Tempat');
    const [tanggalSurat, setTanggalSurat] = useState(new Date().toISOString().split('T')[0]);

    // Configs
    const [tempatTanggalConfig, setTempatTanggalConfig] = useState<TempatTanggalConfig>({
        show: true,
        position: 'bottom-right', 
        align: 'right'
    });
    
    const [marginConfig, setMarginConfig] = useState<MarginConfig>({ top: 2, right: 2, bottom: 2, left: 2 });
    
    // Dynamic Signatories State
    const [activeSignatories, setActiveSignatories] = useState<SuratSignatory[]>([]);
    
    // Mengetahui Config State
    const [mengetahui, setMengetahui] = useState<MengetahuiConfig>({
        show: false,
        jabatan: 'Mengetahui,',
        align: 'center'
    });

    const [stampConfig, setStampConfig] = useState<StampConfig>({
        show: false,
        stampUrl: undefined,
        placementSignatoryId: undefined,
    });

    // Zoom & Preview State
    const [manualZoom, setManualZoom] = useState(1);
    const [smartZoomScale, setSmartZoomScale] = useState(1);
    const previewContainerRef = useRef<HTMLDivElement>(null);
    const contentWrapperRef = useRef<HTMLDivElement>(null);
    
    // Download Menu State
    const [isDownloadMenuOpen, setIsDownloadMenuOpen] = useState(false);
    const downloadMenuRef = useRef<HTMLDivElement>(null);

    // --- Filter Logic ---
    const availableKelas = useMemo(() => {
        if (!filterJenjangId) return settings.kelas;
        return settings.kelas.filter(k => k.jenjangId === parseInt(filterJenjangId));
    }, [filterJenjangId, settings.kelas]);

    const availableRombel = useMemo(() => {
        if (!filterKelasId) return settings.rombel.filter(r => availableKelas.map(k => k.id).includes(r.kelasId));
        return settings.rombel.filter(r => r.kelasId === parseInt(filterKelasId));
    }, [filterKelasId, settings.rombel, availableKelas]);

    const filteredSantris = useMemo(() => {
        return santriList.filter(s => {
            if (s.status !== 'Aktif') return false;
            if (filterJenjangId && s.jenjangId !== parseInt(filterJenjangId)) return false;
            if (filterKelasId && s.kelasId !== parseInt(filterKelasId)) return false;
            if (filterRombelId && s.rombelId !== parseInt(filterRombelId)) return false;
            return true;
        }).sort((a, b) => a.namaLengkap.localeCompare(b.namaLengkap));
    }, [santriList, filterJenjangId, filterKelasId, filterRombelId]);

    const template = useMemo(() => suratTemplates.find(t => t.id === Number(selectedTemplateId)), [selectedTemplateId, suratTemplates]);

    // Reset selections when mode or filters change
    useEffect(() => {
        setBulkSelectedIds([]);
        setSelectedSantriId('');
    }, [generationMode, filterJenjangId, filterKelasId, filterRombelId]);

    // Handle Select All for Bulk
    const handleBulkToggleAll = () => {
        if (bulkSelectedIds.length === filteredSantris.length) {
            setBulkSelectedIds([]);
        } else {
            setBulkSelectedIds(filteredSantris.map(s => s.id));
        }
    };

    const handleBulkSelectOne = (id: number) => {
        setBulkSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    // Determine target santris for generation
    const targetSantris = useMemo(() => {
        if (generationMode === 'single') {
             const s = santriList.find(s => s.id === Number(selectedSantriId));
             return s ? [s] : [undefined]; // undefined represents "Umum"/No specific santri
        } else {
             return santriList.filter(s => bulkSelectedIds.includes(s.id));
        }
    }, [generationMode, selectedSantriId, bulkSelectedIds, santriList]);


    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (downloadMenuRef.current && !downloadMenuRef.current.contains(event.target as Node)) {
                setIsDownloadMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => { document.removeEventListener("mousedown", handleClickOutside); };
    }, []);

    useEffect(() => {
        if (template) {
            setCustomContent(template.konten);
            // Initialize signatories
            if (template.signatories && template.signatories.length > 0) {
                setActiveSignatories(template.signatories);
            } else {
                setActiveSignatories([{ id: 'default', jabatan: 'Ketua Panitia', nama: '...................................' }]);
            }
            // Initialize Mengetahui
            if (template.mengetahuiConfig) {
                setMengetahui(template.mengetahuiConfig);
            } else {
                setMengetahui({ show: false, jabatan: 'Mengetahui,', align: 'center' });
            }
             // Initialize Tempat Tanggal
             if (template.tempatTanggalConfig) {
                setTempatTanggalConfig(template.tempatTanggalConfig);
            } else {
                setTempatTanggalConfig({ show: true, position: 'bottom-right', align: 'right' });
            }
             // Initialize Margin
             if (template.marginConfig) {
                 setMarginConfig(template.marginConfig);
             } else {
                 setMarginConfig({ top: 2, right: 2, bottom: 2, left: 2 });
             }
             // Initialize Stamp
             if (template.stampConfig) {
                 setStampConfig(template.stampConfig);
             } else {
                 setStampConfig({ show: false, stampUrl: undefined, placementSignatoryId: undefined });
             }
        }
    }, [template]);

    // Smart Zoom Logic
    useEffect(() => {
        const calculateAndSetZoom = () => {
            if (previewContainerRef.current && contentWrapperRef.current) {
                const containerWidth = previewContainerRef.current.clientWidth;
                const contentWidth = contentWrapperRef.current.scrollWidth;
                if (contentWidth > (containerWidth - 48)) {
                    const scale = (containerWidth - 48) / contentWidth;
                    setSmartZoomScale(scale);
                } else {
                    setSmartZoomScale(1);
                }
            }
        };

        if (previewMode && template) {
            const timer = setTimeout(calculateAndSetZoom, 100);
            window.addEventListener('resize', calculateAndSetZoom);
            return () => {
                clearTimeout(timer);
                window.removeEventListener('resize', calculateAndSetZoom);
            };
        } else {
            setSmartZoomScale(1);
            setManualZoom(1);
        }
    }, [previewMode, template]);

    const formattedTanggalSurat = useMemo(() => {
        if(!tanggalSurat) return '';
        return new Date(tanggalSurat).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    }, [tanggalSurat]);

    const getProcessedContent = (santri: Santri | undefined) => {
        if (!template) return '';
        let content = customContent;
        
        // General Placeholders
        content = content.replace(/{TANGGAL}/g, formattedTanggalSurat);
        content = content.replace(/{NOMOR_SURAT}/g, nomorSurat || '...../...../.....');

        if (santri) {
            // Data Pribadi
            content = content.replace(/{NAMA_SANTRI}/g, santri.namaLengkap);
            content = content.replace(/{NIS}/g, santri.nis);
            content = content.replace(/{TEMPAT_LAHIR}/g, santri.tempatLahir || '');
            content = content.replace(/{TANGGAL_LAHIR}/g, santri.tanggalLahir ? new Date(santri.tanggalLahir).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '');
            
            // Legacy TTL support
            content = content.replace(/{TTL}/g, `${santri.tempatLahir}, ${new Date(santri.tanggalLahir).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`);

            // Data Pendidikan
            content = content.replace(/{JENJANG}/g, settings.jenjang.find(j => j.id === santri.jenjangId)?.nama || '');
            content = content.replace(/{KELAS}/g, settings.kelas.find(k => k.id === santri.kelasId)?.nama || '');
            content = content.replace(/{ROMBEL}/g, settings.rombel.find(r => r.id === santri.rombelId)?.nama || '');

            // Data Orang Tua & Wali
            content = content.replace(/{NAMA_AYAH}/g, santri.namaAyah || '');
            content = content.replace(/{NAMA_IBU}/g, santri.namaIbu || '');
            content = content.replace(/{NAMA_WALI}/g, santri.namaWali || '');
            
            // Smart Fallback for Wali/Ortu
            const waliSmart = santri.namaWali || santri.namaAyah || santri.namaIbu || '';
            content = content.replace(/{ORTU_WALI}/g, waliSmart);
            // Legacy Wali support
            content = content.replace(/{WALI}/g, waliSmart);

            // Alamat
            content = content.replace(/{ALAMAT}/g, santri.alamat.detail);
            
            // Full Address Construction
            const fullAddress = [
                santri.alamat.detail,
                santri.alamat.desaKelurahan ? `Desa ${santri.alamat.desaKelurahan}` : '',
                santri.alamat.kecamatan ? `Kec. ${santri.alamat.kecamatan}` : '',
                santri.alamat.kabupatenKota ? `${santri.alamat.kabupatenKota}` : '',
                santri.alamat.provinsi
            ].filter(Boolean).join(', ');
            content = content.replace(/{ALAMAT_LENGKAP}/g, fullAddress);

        } else {
            // Empty Placeholders for General Letters
            const dots = '...................................';
            content = content.replace(/{NAMA_SANTRI}/g, dots);
            content = content.replace(/{NIS}/g, '................');
            content = content.replace(/{TEMPAT_LAHIR}/g, dots);
            content = content.replace(/{TANGGAL_LAHIR}/g, dots);
            content = content.replace(/{TTL}/g, dots);
            content = content.replace(/{JENJANG}/g, dots);
            content = content.replace(/{KELAS}/g, dots);
            content = content.replace(/{ROMBEL}/g, dots);
            content = content.replace(/{NAMA_AYAH}/g, dots);
            content = content.replace(/{NAMA_IBU}/g, dots);
            content = content.replace(/{NAMA_WALI}/g, dots);
            content = content.replace(/{ORTU_WALI}/g, dots);
            content = content.replace(/{WALI}/g, dots);
            content = content.replace(/{ALAMAT}/g, dots);
            content = content.replace(/{ALAMAT_LENGKAP}/g, dots);
        }
        return content;
    };

    const handleSignatoryChange = (index: number, field: keyof SuratSignatory, value: string) => {
        const updated = [...activeSignatories];
        updated[index] = { ...updated[index], [field]: value };
        setActiveSignatories(updated);
    };

    const handleDownloadPdf = async () => {
        if (!contentWrapperRef.current) return;
        const originalTransform = contentWrapperRef.current.style.transform;
        contentWrapperRef.current.style.transform = 'none';
        try {
            await generatePdf('surat-preview-container', { paperSize: 'A4', fileName: `Surat_${nomorSurat.replace(/[\/\\:*?"<>|]/g, '-') || 'Draft'}.pdf` });
            setIsDownloadMenuOpen(false);
        } finally {
            contentWrapperRef.current.style.transform = originalTransform;
        }
    };

    const handleDownloadHtml = () => {
        const previewHtml = contentWrapperRef.current?.innerHTML;
        if (!previewHtml) {
            showToast("Tidak ada konten pratinjau untuk diunduh.", 'error');
            return;
        }

        let allCss = '';
        for (const sheet of Array.from(document.styleSheets)) {
            try {
                if (sheet.cssRules) {
                    for (const rule of Array.from(sheet.cssRules)) {
                        allCss += rule.cssText + '\n';
                    }
                }
            } catch (e) {
                 // Ignore CORS errors for external sheets
            }
        }
    
        const htmlContent = `
          <!DOCTYPE html>
          <html lang="id">
            <head>
              <meta charset="UTF-8">
              <title>Surat - ${template?.judul || 'eSantri'}</title>
              <script src="https://cdn.tailwindcss.com"></script>
              <style>
                 ${allCss}
                 body { background-color: #e5e7eb; padding: 2rem; display: flex; justify-content: center; }
                 .printable-content-wrapper { background: white; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); margin: 0 auto; }
                 .page-break-after { page-break-after: always; margin-bottom: 2rem; }
                 @media print { 
                    body { background-color: white; padding: 0; }
                    .page-break-after { margin-bottom: 0; box-shadow: none; }
                    .printable-content-wrapper { box-shadow: none !important; margin: 0 !important; }
                    .bg-white.shadow-xl { box-shadow: none !important; }
                 }
              </style>
            </head>
            <body>
              ${previewHtml}
            </body>
          </html>
        `;
    
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Surat_${nomorSurat.replace(/[\/\\:*?"<>|]/g, '-') || 'Draft'}.html`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setIsDownloadMenuOpen(false);
    };

    const handlePrintDirect = () => {
        window.print();
    };

    const handleSaveArchive = async () => {
        if (!canWrite) {
            showToast('Anda tidak memiliki akses untuk mengarsipkan surat.', 'error');
            return;
        }
        if (!template) return;
        
        if (generationMode === 'bulk' && targetSantris.length === 0) {
            showToast('Tidak ada santri yang dipilih untuk diarsipkan.', 'error');
            return;
        }

        setIsSaving(true);
        try {
            let savedCount = 0;
            for (const santri of targetSantris) {
                 await onSaveArsipSurat({
                    nomorSurat,
                    perihal: template.judul,
                    tujuan: santri ? santri.namaLengkap : 'Umum',
                    isiSurat: getProcessedContent(santri),
                    tanggalBuat: new Date().toISOString().split('T')[0],
                    templateId: template.id,
                    tempatCetak: tempatSurat,
                    tanggalCetak: formattedTanggalSurat,
                    tempatTanggalConfig: tempatTanggalConfig,
                    signatoriesSnapshot: activeSignatories,
                    mengetahuiSnapshot: mengetahui,
                    marginConfig: marginConfig,
                    stampSnapshot: stampConfig,
                    showJudulSnapshot: template.showJudul // Save toggle title setting
                });
                savedCount++;
            }
           
            showToast(`${savedCount} surat berhasil diarsipkan.`, 'success');
        } catch (e) {
            showToast('Gagal mengarsipkan surat.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-180px)]">
            <style>{`
                /* SimpleEditor Output Styles for Consistency */
                .printable-content-wrapper ul { list-style-type: disc; padding-left: 1.5em; }
                .printable-content-wrapper ol { list-style-type: decimal; padding-left: 1.5em; }
                .printable-content-wrapper b, .printable-content-wrapper strong { font-weight: bold; }
                .printable-content-wrapper i, .printable-content-wrapper em { font-style: italic; }
                .printable-content-wrapper u { text-decoration: underline; }
                
                /* Ensure editor content inherits font size */
                .ql-editor, .ql-editor p, .ql-editor span, .ql-editor li {
                    font-size: 12pt !important;
                    font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji" !important; 
                }
            `}</style>
            <div className="bg-white p-6 rounded-lg shadow-md space-y-4 overflow-y-auto no-print">
                <h3 className="font-bold text-gray-700">1. Konfigurasi Surat</h3>
                <div>
                    <label className="block mb-1 text-sm font-medium text-gray-700">Pilih Template</label>
                    <select value={selectedTemplateId} onChange={e => setSelectedTemplateId(Number(e.target.value))} className="bg-gray-50 border border-gray-300 text-sm rounded-lg w-full p-2.5">
                        <option value="">-- Pilih Template --</option>
                        {suratTemplates.map(t => <option key={t.id} value={t.id}>{t.nama}</option>)}
                    </select>
                </div>
                {template && (
                    <>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block mb-1 text-sm font-medium text-gray-700">Nomor Surat</label>
                                <input type="text" value={nomorSurat} onChange={e => setNomorSurat(e.target.value)} placeholder="No: ..." className="bg-gray-50 border border-gray-300 text-sm rounded-lg w-full p-2.5" />
                            </div>
                            <div>
                                <label className="block mb-1 text-sm font-medium text-gray-700">Mode Surat</label>
                                <select 
                                    value={generationMode} 
                                    onChange={(e) => setGenerationMode(e.target.value as 'single' | 'bulk')} 
                                    className="bg-gray-50 border border-gray-300 text-sm rounded-lg w-full p-2.5"
                                >
                                    <option value="single">Perorangan</option>
                                    <option value="bulk">Mail Merge (Massal)</option>
                                </select>
                            </div>
                        </div>
                        
                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
                            <h4 className="text-xs font-bold text-gray-500 uppercase">Filter Data Santri</h4>
                             <div className="grid grid-cols-2 gap-2">
                                <select value={filterJenjangId} onChange={e => { setFilterJenjangId(e.target.value); setFilterKelasId(''); setFilterRombelId(''); }} className="bg-white border border-gray-300 text-xs rounded-lg w-full p-2">
                                    <option value="">Semua Jenjang</option>
                                    {settings.jenjang.map(j => <option key={j.id} value={j.id}>{j.nama}</option>)}
                                </select>
                                <select value={filterKelasId} onChange={e => { setFilterKelasId(e.target.value); setFilterRombelId(''); }} disabled={!filterJenjangId} className="bg-white border border-gray-300 text-xs rounded-lg w-full p-2 disabled:bg-gray-100">
                                    <option value="">Semua Kelas</option>
                                    {availableKelas.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
                                </select>
                             </div>
                             <select value={filterRombelId} onChange={e => setFilterRombelId(e.target.value)} disabled={!filterKelasId} className="bg-white border border-gray-300 text-xs rounded-lg w-full p-2 disabled:bg-gray-100">
                                <option value="">Semua Rombel</option>
                                {availableRombel.map(r => <option key={r.id} value={r.id}>{r.nama}</option>)}
                            </select>

                            {generationMode === 'single' ? (
                                <div>
                                    <label className="block mb-1 text-sm font-medium text-gray-700">Pilih Santri</label>
                                    <select value={selectedSantriId} onChange={e => setSelectedSantriId(e.target.value ? Number(e.target.value) : '')} className="bg-white border border-gray-300 text-sm rounded-lg w-full p-2.5">
                                        <option value="">(Umum / Tanpa Nama)</option>
                                        {filteredSantris.map(s => <option key={s.id} value={s.id}>{s.namaLengkap}</option>)}
                                    </select>
                                </div>
                            ) : (
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="text-sm font-medium text-gray-700">Pilih Penerima ({bulkSelectedIds.length})</label>
                                        <button onClick={handleBulkToggleAll} className="text-xs text-teal-600 hover:underline font-medium">
                                            {bulkSelectedIds.length === filteredSantris.length ? 'Hapus Semua' : 'Pilih Semua'}
                                        </button>
                                    </div>
                                    <div className="max-h-32 overflow-y-auto border rounded-lg bg-white p-2 space-y-1">
                                        {filteredSantris.length > 0 ? filteredSantris.map(s => (
                                            <div key={s.id} className="flex items-center">
                                                <input id={`bulk-santri-${s.id}`} type="checkbox" checked={bulkSelectedIds.includes(s.id)} onChange={() => handleBulkSelectOne(s.id)} className="w-4 h-4 text-teal-600 rounded border-gray-300 focus:ring-teal-500" />
                                                <label htmlFor={`bulk-santri-${s.id}`} className="ml-2 text-xs text-gray-700 truncate cursor-pointer select-none">{s.namaLengkap}</label>
                                            </div>
                                        )) : <p className="text-xs text-gray-400 text-center py-2">Tidak ada data sesuai filter.</p>}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block mb-1 text-sm font-medium text-gray-700">Tempat Surat</label>
                                <input type="text" value={tempatSurat} onChange={e => setTempatSurat(e.target.value)} className="bg-gray-50 border border-gray-300 text-sm rounded-lg w-full p-2.5" />
                            </div>
                            <div>
                                <label className="block mb-1 text-sm font-medium text-gray-700">Tanggal Surat</label>
                                <input type="date" value={tanggalSurat} onChange={e => setTanggalSurat(e.target.value)} className="bg-gray-50 border border-gray-300 text-sm rounded-lg w-full p-2.5" />
                            </div>
                        </div>

                        <div>
                            <label className="block mb-1 text-sm font-medium text-gray-700">Edit Isi (Jika Perlu)</label>
                            <SimpleEditor value={customContent} onChange={setCustomContent} />
                        </div>

                        <div className="border-t pt-4 mt-2">
                             <h4 className="text-sm font-bold text-gray-700 mb-2">Pengaturan Margin (cm)</h4>
                             <div className="grid grid-cols-4 gap-2">
                                <div><label className="block text-xs text-center mb-1">Atas</label><input type="number" value={marginConfig.top} onChange={e => setMarginConfig({...marginConfig, top: parseFloat(e.target.value)})} step="0.1" className="w-full border p-1 text-sm rounded text-center"/></div>
                                <div><label className="block text-xs text-center mb-1">Kanan</label><input type="number" value={marginConfig.right} onChange={e => setMarginConfig({...marginConfig, right: parseFloat(e.target.value)})} step="0.1" className="w-full border p-1 text-sm rounded text-center"/></div>
                                <div><label className="block text-xs text-center mb-1">Bawah</label><input type="number" value={marginConfig.bottom} onChange={e => setMarginConfig({...marginConfig, bottom: parseFloat(e.target.value)})} step="0.1" className="w-full border p-1 text-sm rounded text-center"/></div>
                                <div><label className="block text-xs text-center mb-1">Kiri</label><input type="number" value={marginConfig.left} onChange={e => setMarginConfig({...marginConfig, left: parseFloat(e.target.value)})} step="0.1" className="w-full border p-1 text-sm rounded text-center"/></div>
                             </div>
                        </div>

                         <div className="border-t pt-4 mt-2">
                            <div className="flex justify-between items-center mb-2">
                                <h4 className="text-sm font-bold text-gray-700">Tempat & Tanggal</h4>
                                <div className="flex items-center">
                                    <input type="checkbox" id="show-tt" checked={tempatTanggalConfig.show} onChange={e => setTempatTanggalConfig({...tempatTanggalConfig, show: e.target.checked})} className="w-4 h-4 text-teal-600 rounded"/>
                                    <label htmlFor="show-tt" className="ml-2 text-xs">Tampilkan</label>
                                </div>
                            </div>
                             {tempatTanggalConfig.show && (
                                <div className="bg-gray-50 p-3 rounded border space-y-2">
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="block text-xs font-medium">Posisi</label>
                                            <select value={tempatTanggalConfig.position} onChange={e => setTempatTanggalConfig({...tempatTanggalConfig, position: e.target.value as any})} className="w-full border p-1 text-sm rounded">
                                                <option value="top-right">Kanan Atas</option>
                                                <option value="bottom-right">Kanan Bawah (Tanda Tangan)</option>
                                                 <option value="bottom-left">Kiri Bawah (Tanda Tangan)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium">Perataan</label>
                                            <select value={tempatTanggalConfig.align} onChange={e => setTempatTanggalConfig({...tempatTanggalConfig, align: e.target.value as any})} className="w-full border p-1 text-sm rounded">
                                                <option value="left">Kiri</option>
                                                <option value="center">Tengah</option>
                                                <option value="right">Kanan</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Mengetahui Section Config */}
                        <div className="border-t pt-4 mt-2">
                            <div className="flex justify-between items-center mb-2">
                                <h4 className="text-sm font-bold text-gray-700">Bagian "Mengetahui"</h4>
                                <div className="flex items-center">
                                    <input type="checkbox" id="show-mengetahui" checked={mengetahui.show} onChange={e => setMengetahui({...mengetahui, show: e.target.checked})} className="w-4 h-4 text-teal-600 rounded"/>
                                    <label htmlFor="show-mengetahui" className="ml-2 text-xs">Tampilkan</label>
                                </div>
                            </div>
                            {mengetahui.show && (
                                <div className="bg-gray-50 p-3 rounded border space-y-2">
                                    <div className="grid grid-cols-2 gap-2">
                                        <div><label className="block text-xs font-medium">Jabatan/Label</label><input type="text" value={mengetahui.jabatan} onChange={e => setMengetahui({...mengetahui, jabatan: e.target.value})} className="w-full border p-1 text-sm rounded" /></div>
                                        <div><label className="block text-xs font-medium">Perataan</label><select value={mengetahui.align} onChange={e => setMengetahui({...mengetahui, align: e.target.value as any})} className="w-full border p-1 text-sm rounded"><option value="left">Kiri</option><option value="center">Tengah</option><option value="right">Kanan</option></select></div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="border-t pt-4 mt-2">
                            <h4 className="text-sm font-bold text-gray-700 mb-2">Penanda Tangan Utama</h4>
                            <div className="space-y-3">
                                {activeSignatories.map((sig, index) => (
                                    <div key={index} className="bg-gray-50 p-2 rounded border">
                                        <input 
                                            type="text" 
                                            value={sig.jabatan} 
                                            onChange={e => handleSignatoryChange(index, 'jabatan', e.target.value)}
                                            className="w-full bg-transparent border-b border-gray-300 text-xs font-medium mb-1 focus:outline-none" 
                                            placeholder="Jabatan (cth: Ketua Panitia)"
                                        />
                                        <input 
                                            type="text" 
                                            value={sig.nama} 
                                            onChange={e => handleSignatoryChange(index, 'nama', e.target.value)}
                                            className="w-full bg-white border border-gray-300 rounded text-sm p-1" 
                                            placeholder="Nama Pejabat"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                            <button onClick={() => setPreviewMode(true)} className={`flex-1 py-2 rounded-lg font-medium transition-colors ${previewMode ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                                <i className="bi bi-eye"></i> Lihat Preview
                            </button>
                        </div>
                    </>
                )}
            </div>

            <div className="lg:col-span-2 bg-gray-200 rounded-lg shadow-inner flex flex-col relative overflow-hidden" ref={previewContainerRef}>
                {previewMode && template ? (
                    <>
                        <div className="absolute top-4 right-4 z-20 flex gap-2 no-print">
                            {canWrite && <button onClick={handleSaveArchive} disabled={isSaving} className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-700 shadow-md flex items-center gap-2">
                                {isSaving ? <span className="animate-spin h-4 w-4 border-b-2 border-white rounded-full"></span> : <i className="bi bi-archive"></i>} Arsip
                            </button>}
                            
                            <button onClick={handlePrintDirect} className="bg-gray-700 text-white px-3 py-2 rounded-lg text-sm hover:bg-gray-800 shadow-md flex items-center gap-2">
                                <i className="bi bi-printer"></i> Cetak
                            </button>

                            {/* Download Dropdown */}
                            <div className="relative" ref={downloadMenuRef}>
                                <button onClick={() => setIsDownloadMenuOpen(!isDownloadMenuOpen)} className="bg-green-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-green-700 shadow-md flex items-center gap-2">
                                    <i className="bi bi-download"></i> Unduh <i className="bi bi-chevron-down text-xs"></i>
                                </button>
                                {isDownloadMenuOpen && (
                                    <div className="absolute right-0 mt-2 w-40 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                                        <div className="py-1">
                                            <button onClick={handleDownloadPdf} className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                                <i className="bi bi-file-pdf text-red-600 mr-2"></i> Format PDF
                                            </button>
                                            <button onClick={handleDownloadHtml} className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                                <i className="bi bi-filetype-html text-green-600 mr-2"></i> Format HTML
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Assign ID 'surat-preview-container' to the scrollable container */}
                        <div className="flex-grow overflow-auto p-8 flex justify-center items-start" id="surat-preview-container">
                            <div 
                                ref={contentWrapperRef}
                                className="printable-content-wrapper origin-top transition-transform duration-200 ease-out"
                                style={{ transform: `scale(${smartZoomScale * manualZoom})` }}
                            >
                                {targetSantris.map((currentSantri, index) => {
                                    const shouldRenderStamp = stampConfig.show && stampConfig.stampUrl;

                                    return (
                                        <div 
                                            key={currentSantri ? currentSantri.id : `common-${index}`} 
                                            className={`bg-white shadow-xl mx-auto flex flex-col h-full justify-between ${index < targetSantris.length - 1 ? 'page-break-after' : ''}`} 
                                            style={{ 
                                                width: '21cm', 
                                                minHeight: '29.7cm', 
                                                paddingTop: `${marginConfig.top}cm`,
                                                paddingRight: `${marginConfig.right}cm`,
                                                paddingBottom: `${marginConfig.bottom}cm`,
                                                paddingLeft: `${marginConfig.left}cm`,
                                                marginBottom: index < targetSantris.length - 1 ? '2rem' : '0',
                                                fontSize: '12pt', // Ensure base font size is 12pt
                                                lineHeight: '1.5'
                                            }}
                                        >
                                            <div>
                                                <PrintHeader settings={settings} title={template.kategori === 'Resmi' ? '' : ''} />
                                                
                                                {/* Top Date */}
                                                {tempatTanggalConfig.show && tempatTanggalConfig.position === 'top-right' && (
                                                    <div className={`mb-4 flex w-full ${tempatTanggalConfig.align === 'center' ? 'justify-center' : tempatTanggalConfig.align === 'right' ? 'justify-end' : 'justify-start'}`}>
                                                        <div className="text-center" style={{ minWidth: '200px' }}>
                                                            <p>{tempatSurat}, {formattedTanggalSurat}</p>
                                                        </div>
                                                    </div>
                                                )}

                                                {template.judul && (template.showJudul !== false) && <h3 className="text-center font-bold text-lg underline mb-4 uppercase">{template.judul}</h3>}
                                                
                                                <div 
                                                    className="font-sans text-black text-justify leading-relaxed flex-grow p-0" 
                                                    style={{ fontSize: '12pt' }} 
                                                    dangerouslySetInnerHTML={{ __html: getProcessedContent(currentSantri) }} 
                                                />
                                                
                                                <div className="mt-8">
                                                    {/* Bottom Date */}
                                                    {tempatTanggalConfig.show && tempatTanggalConfig.position !== 'top-right' && (
                                                         <div className={`mb-4 flex w-full ${
                                                             tempatTanggalConfig.position === 'bottom-left' ? 'justify-start' : 
                                                             tempatTanggalConfig.position === 'bottom-right' ? 'justify-end' : 'justify-end'
                                                         }`}>
                                                            <div className={`text-${tempatTanggalConfig.align}`} style={{ minWidth: '200px' }}>
                                                                <p>{tempatSurat}, {formattedTanggalSurat}</p>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Mengetahui */}
                                                    {mengetahui.show && (
                                                        <div className={`mb-8 flex w-full ${mengetahui.align === 'center' ? 'justify-center' : mengetahui.align === 'right' ? 'justify-end' : 'justify-start'}`}>
                                                            <div className="text-center" style={{ minWidth: '200px' }}>
                                                                <p className="font-medium">{mengetahui.jabatan}</p>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Main Signature Grid */}
                                                    <div className={`grid gap-8 ${
                                                        activeSignatories.length === 1 ? 'grid-cols-1 justify-items-end' : 
                                                        activeSignatories.length === 2 ? 'grid-cols-2' : 
                                                        'grid-cols-3'
                                                    }`}>
                                                        {activeSignatories.map((sig, i) => {
                                                            const renderStampHere = shouldRenderStamp && (activeSignatories.length === 1 || stampConfig.placementSignatoryId === sig.id);
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
                                                                        {sig.nip && <p>NIP. {sig.nip}</p>}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="mt-auto pt-2 border-t border-gray-400 text-center text-[8pt] text-gray-500 italic w-full">
                                                dibuat dengan aplikasi eSantri Web by AI Projek | aiprojek01.my.id
                                            </div>
                                        </div>
                                    );
                                })}
                                {targetSantris.length === 0 && (
                                    <div className="bg-white shadow-xl mx-auto flex flex-col justify-center items-center" style={{ width: '21cm', minHeight: '29.7cm', padding: '2cm' }}>
                                        <p className="text-gray-400">Belum ada santri yang dipilih untuk mode Mail Merge.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Floating Zoom Controls */}
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 no-print">
                            <div className="flex items-center gap-3 bg-gray-900/80 backdrop-blur-sm text-white rounded-full p-2 shadow-lg">
                                <button onClick={() => setManualZoom(z => Math.max(0.5, z - 0.1))} className="w-8 h-8 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors" title="Zoom Out">
                                    <i className="bi bi-dash-lg"></i>
                                </button>
                                <span className="font-mono text-xs w-12 text-center select-none">
                                    {Math.round(smartZoomScale * manualZoom * 100)}%
                                </span>
                                <button onClick={() => setManualZoom(z => Math.min(2, z + 0.1))} className="w-8 h-8 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors" title="Zoom In">
                                    <i className="bi bi-plus-lg"></i>
                                </button>
                                <div className="w-px h-4 bg-gray-600 mx-1"></div>
                                <button onClick={() => setManualZoom(1)} className="text-xs hover:text-teal-300 px-1" title="Reset Zoom">
                                    Reset
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                        <i className="bi bi-file-earmark-text text-6xl mb-4 opacity-50"></i>
                        <p className="text-lg font-medium">Pratinjau Surat</p>
                        <p className="text-sm">Pilih template dan klik "Lihat Preview" untuk menampilkan hasil.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const SuratMenyurat: React.FC = () => {
    const { suratTemplates, arsipSuratList, onSaveSuratTemplate, onDeleteSuratTemplate, onDeleteArsipSurat, currentUser, showConfirmation, showToast } = useAppContext();
    const [activeTab, setActiveTab] = useState<'templates' | 'buat' | 'arsip'>('templates');
    
    // Permission Check
    const canWrite = currentUser?.role === 'admin' || currentUser?.permissions?.surat === 'write';

    // State for Modals
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<SuratTemplate | undefined>(undefined);
    
    const [isArsipModalOpen, setIsArsipModalOpen] = useState(false);
    const [viewingArsip, setViewingArsip] = useState<ArsipSurat | null>(null);

    // Handlers
    const handleSaveTemplate = async (template: SuratTemplate) => {
        if (!canWrite) {
            showToast('Anda tidak memiliki akses untuk menyimpan template.', 'error');
            return;
        }
        await onSaveSuratTemplate(template);
        setIsTemplateModalOpen(false);
        showToast('Template berhasil disimpan', 'success');
    };

    const handleDeleteTemplate = (id: number) => {
        if (!canWrite) {
            showToast('Anda tidak memiliki akses untuk menghapus template.', 'error');
            return;
        }
        showConfirmation('Hapus Template?', 'Template ini akan dihapus permanen.', async () => {
            await onDeleteSuratTemplate(id);
            showToast('Template dihapus', 'success');
        }, { confirmColor: 'red' });
    };

    const handleDeleteArsip = (id: number) => {
        if (!canWrite) {
            showToast('Anda tidak memiliki akses untuk menghapus arsip.', 'error');
            return;
        }
        showConfirmation('Hapus Arsip?', 'Arsip surat ini akan dihapus permanen.', async () => {
            await onDeleteArsipSurat(id);
            showToast('Arsip dihapus', 'success');
        }, { confirmColor: 'red' });
    };

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Surat Menyurat</h1>
            
            <div className="mb-6 border-b border-gray-200">
                <nav className="flex -mb-px overflow-x-auto gap-4">
                    <button onClick={() => setActiveTab('templates')} className={`py-3 px-4 font-medium text-sm border-b-2 ${activeTab === 'templates' ? 'border-teal-600 text-teal-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Manajemen Template</button>
                    <button onClick={() => setActiveTab('buat')} className={`py-3 px-4 font-medium text-sm border-b-2 ${activeTab === 'buat' ? 'border-teal-600 text-teal-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Buat Surat Baru</button>
                    <button onClick={() => setActiveTab('arsip')} className={`py-3 px-4 font-medium text-sm border-b-2 ${activeTab === 'arsip' ? 'border-teal-600 text-teal-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Arsip Surat</button>
                </nav>
            </div>

            {activeTab === 'templates' && (
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-gray-700">Daftar Template Surat</h3>
                        {canWrite && (
                            <button onClick={() => { setEditingTemplate(undefined); setIsTemplateModalOpen(true); }} className="bg-teal-600 text-white px-4 py-2 rounded text-sm hover:bg-teal-700 flex items-center gap-2">
                                <i className="bi bi-plus-lg"></i> Buat Template
                            </button>
                        )}
                    </div>
                    <TemplateManager onEdit={(t) => { setEditingTemplate(t); setIsTemplateModalOpen(true); }} onDelete={handleDeleteTemplate} canWrite={canWrite} />
                </div>
            )}

            {activeTab === 'buat' && <SuratGenerator canWrite={canWrite} />}

            {activeTab === 'arsip' && (
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-gray-700">Arsip Surat Keluar</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="p-3">Tanggal</th>
                                    <th className="p-3">Nomor Surat</th>
                                    <th className="p-3">Perihal</th>
                                    <th className="p-3">Tujuan</th>
                                    <th className="p-3 text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {[...arsipSuratList].sort((a,b) => new Date(b.tanggalBuat).getTime() - new Date(a.tanggalBuat).getTime()).map(arsip => (
                                    <tr key={arsip.id} className="hover:bg-gray-50">
                                        <td className="p-3 whitespace-nowrap">{new Date(arsip.tanggalBuat).toLocaleDateString('id-ID')}</td>
                                        <td className="p-3 font-mono text-xs">{arsip.nomorSurat}</td>
                                        <td className="p-3 font-medium">{arsip.perihal}</td>
                                        <td className="p-3">{arsip.tujuan}</td>
                                        <td className="p-3 text-center flex justify-center gap-2">
                                            <button onClick={() => { setViewingArsip(arsip); setIsArsipModalOpen(true); }} className="text-blue-600 hover:text-blue-800" title="Lihat"><i className="bi bi-eye"></i></button>
                                            {canWrite && <button onClick={() => handleDeleteArsip(arsip.id)} className="text-red-600 hover:text-red-800" title="Hapus"><i className="bi bi-trash"></i></button>}
                                        </td>
                                    </tr>
                                ))}
                                {arsipSuratList.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-gray-500">Belum ada arsip surat.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <TemplateModal 
                isOpen={isTemplateModalOpen} 
                onClose={() => setIsTemplateModalOpen(false)} 
                onSave={handleSaveTemplate} 
                initialData={editingTemplate} 
            />

            {viewingArsip && (
                <ArsipViewerModal 
                    isOpen={isArsipModalOpen} 
                    onClose={() => setIsArsipModalOpen(false)} 
                    arsip={viewingArsip} 
                />
            )}
        </div>
    );
};

export default SuratMenyurat;
