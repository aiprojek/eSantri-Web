
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAppContext } from '../AppContext';
import { SuratTemplate, ArsipSurat, Santri, SuratSignatory, MengetahuiConfig, TempatTanggalConfig, MarginConfig, StampConfig } from '../types';
import { generatePdf } from '../utils/pdfGenerator';
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


// --- Components for Tabs ---

const TemplateManager: React.FC<{ 
    onEdit: (t: SuratTemplate) => void; 
    onDelete: (id: number) => void;
}> = ({ onEdit, onDelete }) => {
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
                        <div className="flex justify-end gap-2">
                            <button onClick={() => onEdit(t)} className="text-blue-600 hover:bg-blue-50 p-2 rounded-full text-sm" title="Edit Template"><i className="bi bi-pencil-square"></i></button>
                            <button onClick={() => onDelete(t.id)} className="text-red-600 hover:bg-red-50 p-2 rounded-full text-sm" title="Hapus Template"><i className="bi bi-trash"></i></button>
                        </div>
                    </div>
                ))}
                {suratTemplates.length === 0 && <div className="col-span-full text-center p-8 text-gray-500">Belum ada template surat. Buat baru untuk memulai.</div>}
            </div>
        </div>
    );
};

const SuratGenerator: React.FC = () => {
    const { suratTemplates, santriList, onSaveArsipSurat, settings, showToast } = useAppContext();
    
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
                            <button onClick={handleSaveArchive} disabled={isSaving} className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-700 shadow-md flex items-center gap-2">
                                {isSaving ? <span className="animate-spin h-4 w-4 border-b-2 border-white rounded-full"></span> : <i className="bi bi-archive"></i>} Arsip
                            </button>
                            
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

const ArsipViewerModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    arsip: ArsipSurat;
}> = ({ isOpen, onClose, arsip }) => {
    const { settings, suratTemplates, showToast } = useAppContext();
    const [isDownloadMenuOpen, setIsDownloadMenuOpen] = useState(false);
    const downloadMenuRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const template = useMemo(() => suratTemplates.find(t => t.id === arsip.templateId), [arsip.templateId, suratTemplates]);
    
    const signatoriesToRender = arsip.signatoriesSnapshot || template?.signatories || [{ id: 'def', jabatan: 'Panitia', nama: '...................................' }];
    const tempatStr = arsip.tempatCetak || settings.alamat.split(',')[1]?.trim() || 'Tempat';
    const tanggalStr = arsip.tanggalCetak || new Date(arsip.tanggalBuat).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const mengetahuiRender = arsip.mengetahuiSnapshot || (template?.mengetahuiConfig ? template.mengetahuiConfig : { show: false, jabatan: '', align: 'center' });
    const tempatTanggalConfig = arsip.tempatTanggalConfig || (template?.tempatTanggalConfig ? template.tempatTanggalConfig : { show: true, position: 'bottom-right', align: 'right' });
    const marginConfig = arsip.marginConfig || (template?.marginConfig ? template.marginConfig : { top: 2, right: 2, bottom: 2, left: 2 });
    const stampConfig = arsip.stampSnapshot || template?.stampConfig;
    const showJudul = arsip.showJudulSnapshot ?? template?.showJudul ?? true;

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

    if (!isOpen) return null;

    const handleDownloadPdf = async () => {
        if (!wrapperRef.current) return;
        const originalTransform = wrapperRef.current.style.transform;
        wrapperRef.current.style.transform = 'none';
        try {
            await generatePdf('arsip-preview-container', { 
                paperSize: 'A4', 
                fileName: `Arsip_${arsip.nomorSurat.replace(/[\/\\:*?"<>|]/g, '-') || 'Surat'}.pdf` 
            });
            setIsDownloadMenuOpen(false);
        } finally {
            wrapperRef.current.style.transform = originalTransform;
        }
    };

    const handleDownloadHtml = () => {
        const previewHtml = wrapperRef.current?.innerHTML;
        if (!previewHtml) {
            showToast("Tidak ada konten untuk diunduh.", 'error');
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
              <title>Arsip Surat - ${arsip.perihal}</title>
              <script src="https://cdn.tailwindcss.com"></script>
              <style>
                 ${allCss}
                 body { background-color: #e5e7eb; padding: 2rem; display: flex; justify-content: center; }
                 #print-view-arsip { background: white; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); margin: 0 auto; }
                 .printable-content-wrapper * { font-size: 12pt !important; }
                 /* Hide shadow when printing */
                 @media print {
                    body { background-color: white; padding: 0; }
                    #print-view-arsip { box-shadow: none !important; margin: 0 !important; }
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
        link.download = `Arsip_${arsip.nomorSurat.replace(/[\/\\:*?"<>|]/g, '-') || 'Surat'}.html`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setIsDownloadMenuOpen(false);
    };

    const handlePrintDirect = () => {
        window.print();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[70] flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl h-[95vh] flex flex-col">
                <div className="p-4 border-b flex justify-between items-center no-print">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-800">Lihat Arsip Surat</h3>
                        <p className="text-xs text-gray-500">Dibuat pada: {new Date(arsip.tanggalBuat).toLocaleDateString('id-ID')}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><i className="bi bi-x-lg"></i></button>
                </div>
                <div className="flex-grow bg-gray-100 p-6 overflow-auto flex justify-center" ref={contentRef} id="arsip-preview-container">
                    <div ref={wrapperRef} className="printable-content-wrapper flex flex-col origin-top" style={{ transform: 'scale(0.9)' }}>
                        <div id="print-view-arsip" className="bg-white shadow-lg mx-auto flex flex-col h-full justify-between" style={{ 
                             width: '21cm', 
                             minHeight: '29.7cm', 
                             paddingTop: `${marginConfig.top}cm`,
                             paddingRight: `${marginConfig.right}cm`,
                             paddingBottom: `${marginConfig.bottom}cm`,
                             paddingLeft: `${marginConfig.left}cm`,
                             fontSize: '12pt', // Ensure base font size is 12pt
                             lineHeight: '1.5'
                        }}>
                            <div>
                                <PrintHeader settings={settings} title={template?.kategori === 'Resmi' ? '' : ''} />
                                {arsip.perihal && showJudul && <h3 className="text-center font-bold text-lg underline mb-4 uppercase">{arsip.perihal}</h3>}
                                
                                <div 
                                    className="font-sans text-black text-justify leading-relaxed flex-grow p-0" 
                                    style={{ fontSize: '12pt' }} 
                                    dangerouslySetInnerHTML={{ __html: arsip.isiSurat }} 
                                />
                                
                                <div className="mt-8">
                                    {/* Top Date */}
                                    {tempatTanggalConfig.show && tempatTanggalConfig.position === 'top-right' && (
                                        <div className={`mb-4 flex w-full ${tempatTanggalConfig.align === 'center' ? 'justify-center' : tempatTanggalConfig.align === 'right' ? 'justify-end' : 'justify-start'}`}>
                                            <div className="text-center" style={{ minWidth: '200px' }}>
                                                <p>{tempatStr}, {tanggalStr}</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Bottom Date */}
                                    {tempatTanggalConfig.show && tempatTanggalConfig.position !== 'top-right' && (
                                        <div className={`mb-4 flex w-full ${
                                            tempatTanggalConfig.position === 'bottom-left' ? 'justify-start' : 
                                            tempatTanggalConfig.position === 'bottom-right' ? 'justify-end' : 'justify-end'
                                        }`}>
                                            <div className={`text-${tempatTanggalConfig.align}`} style={{ minWidth: '200px' }}>
                                                <p>{tempatStr}, {tanggalStr}</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Mengetahui */}
                                    {mengetahuiRender.show && (
                                        <div className={`mb-8 flex w-full ${mengetahuiRender.align === 'center' ? 'justify-center' : mengetahuiRender.align === 'right' ? 'justify-end' : 'justify-start'}`}>
                                            <div className="text-center" style={{ minWidth: '200px' }}>
                                                <p className="font-medium">{mengetahuiRender.jabatan}</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Grid */}
                                    <div className={`grid gap-8 ${
                                        signatoriesToRender.length === 1 ? 'grid-cols-1 justify-items-end' : 
                                        signatoriesToRender.length === 2 ? 'grid-cols-2' : 
                                        'grid-cols-3'
                                    }`}>
                                        {signatoriesToRender.map((sig, i) => {
                                             const shouldRenderStamp = stampConfig?.show && stampConfig.stampUrl;
                                             const renderStampHere = shouldRenderStamp && (signatoriesToRender.length === 1 || stampConfig.placementSignatoryId === sig.id);
                                             return(
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
                                        )})}
                                    </div>
                                </div>
                            </div>
                            <div className="mt-auto pt-2 border-t border-gray-400 text-center text-[8pt] text-gray-500 italic w-full">
                                dibuat dengan aplikasi eSantri Web by AI Projek | aiprojek01.my.id
                            </div>
                        </div>
                    </div>
                </div>
                <div className="p-4 border-t flex justify-end gap-2 bg-gray-50 no-print">
                    <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100">Tutup</button>
                    
                    <button onClick={handlePrintDirect} className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-800 flex items-center gap-2">
                        <i className="bi bi-printer"></i> Cetak
                    </button>

                    {/* Download Dropdown for Archive */}
                    <div className="relative" ref={downloadMenuRef}>
                        <button onClick={() => setIsDownloadMenuOpen(!isDownloadMenuOpen)} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2">
                            <i className="bi bi-download"></i> Unduh <i className="bi bi-chevron-down text-xs"></i>
                        </button>
                         {isDownloadMenuOpen && (
                            <div className="absolute right-0 bottom-full mb-2 w-40 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
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
            </div>
        </div>
    );
};

// --- Modal for Template ---

const TemplateModal: React.FC<{ 
    isOpen: boolean; 
    onClose: () => void; 
    onSave: (t: SuratTemplate) => void; 
    initialData?: SuratTemplate; 
}> = ({ isOpen, onClose, onSave, initialData }) => {
    const { showToast } = useAppContext();
    const [uploadingSignatureFor, setUploadingSignatureFor] = useState<string | null>(null);
    const signatureInputRef = useRef<HTMLInputElement>(null);
    const stampInputRef = useRef<HTMLInputElement>(null);
    
    // AI State
    const [isAiModalOpen, setIsAiModalOpen] = useState(false);
    const [aiPrompt, setAiPrompt] = useState('');
    const [isAiLoading, setIsAiLoading] = useState(false);

    const [template, setTemplate] = useState<Partial<SuratTemplate>>({ 
        nama: '', 
        judul: '', 
        showJudul: true,
        konten: '', 
        kategori: 'Resmi',
        signatories: [{ id: '1', jabatan: 'Ketua Panitia', nama: '...................................' }],
        mengetahuiConfig: { show: false, jabatan: 'Mengetahui,', align: 'center' },
        tempatTanggalConfig: { show: true, position: 'bottom-right', align: 'right' },
        marginConfig: { top: 2, right: 2, bottom: 2, left: 2 },
        stampConfig: { show: false }
    });
    
    useEffect(() => {
        if (isOpen) {
            const defaultConfig = {
                nama: '', 
                judul: '', 
                showJudul: true,
                konten: '', 
                kategori: 'Resmi' as 'Resmi',
                signatories: [{ id: '1', jabatan: 'Ketua Panitia', nama: '...................................' }],
                mengetahuiConfig: { show: false, jabatan: 'Mengetahui,', align: 'center' as 'center' },
                tempatTanggalConfig: { show: true, position: 'bottom-right' as 'bottom-right', align: 'right' as 'right' },
                marginConfig: { top: 2, right: 2, bottom: 2, left: 2 },
                stampConfig: { show: false }
            };
            setTemplate({
                ...defaultConfig,
                ...initialData,
                showJudul: initialData?.showJudul ?? defaultConfig.showJudul,
                mengetahuiConfig: initialData?.mengetahuiConfig ?? defaultConfig.mengetahuiConfig,
                tempatTanggalConfig: initialData?.tempatTanggalConfig ?? defaultConfig.tempatTanggalConfig,
                marginConfig: initialData?.marginConfig ?? defaultConfig.marginConfig,
                stampConfig: initialData?.stampConfig ?? defaultConfig.stampConfig,
            });
        }
    }, [isOpen]); 

    if (!isOpen) return null;

    const handleImageUpload = async (file: File, target: 'stamp' | { type: 'signature', id: string }) => {
        if (!file.type.startsWith('image/')) return;
        const base64 = await fileToBase64(file);
        if (target === 'stamp') {
            setTemplate(prev => ({ ...prev, stampConfig: { ...prev.stampConfig!, stampUrl: base64 } }));
        } else if (target.type === 'signature') {
            setTemplate(prev => ({
                ...prev,
                signatories: prev.signatories?.map(s => s.id === target.id ? { ...s, signatureUrl: base64 } : s)
            }));
        }
    };

    const insertPlaceholder = (placeholder: string) => {
        setTemplate(prev => ({ ...prev, konten: (prev.konten || '') + placeholder }));
    };

    const handleAddSignatory = () => {
        setTemplate(prev => ({
            ...prev,
            signatories: [...(prev.signatories || []), { id: Date.now().toString(), jabatan: 'Jabatan', nama: '...................................' }]
        }));
    };

    const handleRemoveSignatory = (index: number) => {
        const updated = [...(template.signatories || [])];
        updated.splice(index, 1);
        setTemplate(prev => ({ ...prev, signatories: updated }));
    };

    const handleSignatoryChange = (index: number, field: keyof SuratSignatory, value: string) => {
        const updated = [...(template.signatories || [])];
        updated[index] = { ...updated[index], [field]: value };
        setTemplate(prev => ({ ...prev, signatories: updated }));
    };

    const handleAiGenerate = async () => {
        if (!aiPrompt.trim()) return;
        setIsAiLoading(true);
        try {
            const draft = await generateLetterDraft(aiPrompt);
            setTemplate(prev => ({ ...prev, konten: draft }));
            setIsAiModalOpen(false);
            setAiPrompt('');
            showToast('Draft surat berhasil dibuat oleh AI!', 'success');
        } catch (error) {
            showToast('Gagal membuat draft. Silakan coba lagi.', 'error');
        } finally {
            setIsAiLoading(false);
        }
    };

    const placeholders = [
        { label: 'Nama Santri', val: '{NAMA_SANTRI}' },
        { label: 'NIS', val: '{NIS}' },
        { label: 'Tempat Lahir', val: '{TEMPAT_LAHIR}' },
        { label: 'Tgl Lahir', val: '{TANGGAL_LAHIR}' },
        { label: 'Jenjang', val: '{JENJANG}' },
        { label: 'Kelas', val: '{KELAS}' },
        { label: 'Rombel', val: '{ROMBEL}' },
        { label: 'Nama Ayah', val: '{NAMA_AYAH}' },
        { label: 'Nama Ibu', val: '{NAMA_IBU}' },
        { label: 'Nama Wali', val: '{NAMA_WALI}' },
        { label: 'Ortu/Wali (Otomatis)', val: '{ORTU_WALI}' },
        { label: 'Alamat Singkat', val: '{ALAMAT}' },
        { label: 'Alamat Lengkap', val: '{ALAMAT_LENGKAP}' },
        { label: 'Tanggal Surat', val: '{TANGGAL}' },
        { label: 'Nomor Surat', val: '{NOMOR_SURAT}' },
    ];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[70] flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[90vh] flex flex-col">
                <div className="p-5 border-b flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-800">{initialData ? 'Edit' : 'Buat'} Template Surat</h3>
                    <button onClick={onClose}><i className="bi bi-x-lg"></i></button>
                </div>
                <div className="p-5 flex-grow overflow-auto space-y-6">
                    <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        ref={signatureInputRef} 
                        onChange={e => {
                            if (e.target.files && e.target.files[0] && uploadingSignatureFor) {
                                handleImageUpload(e.target.files[0], { type: 'signature', id: uploadingSignatureFor });
                            }
                            if(e.target) e.target.value = ''; // Reset input to allow re-uploading the same file
                        }}
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-sm font-medium">Nama Template</label><input type="text" value={template.nama} onChange={e => setTemplate({...template, nama: e.target.value})} className="w-full border rounded p-2" placeholder="cth: Surat Izin Pulang"/></div>
                        <div><label className="block text-sm font-medium">Kategori</label><select value={template.kategori} onChange={e => setTemplate({...template, kategori: e.target.value as any})} className="w-full border rounded p-2"><option value="Resmi">Resmi (Ada Kop)</option><option value="Pemberitahuan">Pemberitahuan</option><option value="Izin">Izin</option><option value="Lainnya">Lainnya</option></select></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 items-center">
                        <div className="flex-grow">
                            <label className="block text-sm font-medium">Judul / Perihal Surat</label>
                            <input type="text" value={template.judul} onChange={e => setTemplate({...template, judul: e.target.value})} className="w-full border rounded p-2" placeholder="cth: PERMOHONAN IZIN"/>
                        </div>
                        <div className="flex items-center mt-5">
                            <input type="checkbox" id="show-title" checked={template.showJudul !== false} onChange={e => setTemplate({...template, showJudul: e.target.checked})} className="w-4 h-4 text-teal-600 rounded" />
                            <label htmlFor="show-title" className="ml-2 text-sm text-gray-700">Tampilkan Judul di Surat</label>
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium mb-2">Isi Surat (Klik tombol untuk menyisipkan data santri)</label>
                        <div className="flex gap-2 mb-2 flex-wrap items-center">
                            <button 
                                onClick={() => setIsAiModalOpen(true)}
                                className="text-xs bg-purple-100 text-purple-700 border border-purple-300 px-3 py-1.5 rounded-full hover:bg-purple-200 transition-colors font-semibold flex items-center gap-1"
                                title="Buat draft otomatis dengan AI"
                            >
                                <i className="bi bi-stars"></i> Magic Draft (AI)
                            </button>
                            <div className="w-px h-4 bg-gray-300 mx-1"></div>
                            {placeholders.map(p => (
                                <button key={p.val} onClick={() => insertPlaceholder(p.val)} className="text-xs bg-gray-100 border border-gray-300 px-2 py-1 rounded hover:bg-gray-200 transition-colors" title="Klik untuk menyisipkan">{p.label}</button>
                            ))}
                        </div>
                        <SimpleEditor value={template.konten || ''} onChange={(val) => setTemplate({...template, konten: val})} />
                    </div>

                    <div className="border-t pt-4 mt-2">
                             <h4 className="text-sm font-bold text-gray-700 mb-2">Pengaturan Margin Default (cm)</h4>
                             <div className="grid grid-cols-4 gap-2">
                                <div><label className="block text-xs text-center mb-1">Atas</label><input type="number" value={template.marginConfig?.top} onChange={e => setTemplate({...template, marginConfig: {...template.marginConfig!, top: parseFloat(e.target.value)}})} step="0.1" className="w-full border p-1 text-sm rounded text-center"/></div>
                                <div><label className="block text-xs text-center mb-1">Kanan</label><input type="number" value={template.marginConfig?.right} onChange={e => setTemplate({...template, marginConfig: {...template.marginConfig!, right: parseFloat(e.target.value)}})} step="0.1" className="w-full border p-1 text-sm rounded text-center"/></div>
                                <div><label className="block text-xs text-center mb-1">Bawah</label><input type="number" value={template.marginConfig?.bottom} onChange={e => setTemplate({...template, marginConfig: {...template.marginConfig!, bottom: parseFloat(e.target.value)}})} step="0.1" className="w-full border p-1 text-sm rounded text-center"/></div>
                                <div><label className="block text-xs text-center mb-1">Kiri</label><input type="number" value={template.marginConfig?.left} onChange={e => setTemplate({...template, marginConfig: {...template.marginConfig!, left: parseFloat(e.target.value)}})} step="0.1" className="w-full border p-1 text-sm rounded text-center"/></div>
                             </div>
                        </div>

                     {/* Tempat Tanggal Default Config */}
                     <div className="border-t pt-4 mt-2">
                            <div className="flex justify-between items-center mb-2">
                                <h4 className="text-sm font-bold text-gray-700">Tempat & Tanggal (Default)</h4>
                                <div className="flex items-center">
                                    <input type="checkbox" id="default-show-tt" checked={template.tempatTanggalConfig?.show} onChange={e => setTemplate({...template, tempatTanggalConfig: {...template.tempatTanggalConfig!, show: e.target.checked}})} className="w-4 h-4 text-teal-600 rounded"/>
                                    <label htmlFor="default-show-tt" className="ml-2 text-xs">Aktifkan</label>
                                </div>
                            </div>
                             {template.tempatTanggalConfig?.show && (
                                <div className="bg-gray-50 p-3 rounded border space-y-2">
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="block text-xs font-medium">Posisi</label>
                                            <select value={template.tempatTanggalConfig.position} onChange={e => setTemplate({...template, tempatTanggalConfig: {...template.tempatTanggalConfig!, position: e.target.value as any}})} className="w-full border p-1 text-sm rounded">
                                                <option value="top-right">Kanan Atas</option>
                                                <option value="bottom-right">Kanan Bawah</option>
                                                 <option value="bottom-left">Kiri Bawah</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium">Perataan</label>
                                            <select value={template.tempatTanggalConfig.align} onChange={e => setTemplate({...template, tempatTanggalConfig: {...template.tempatTanggalConfig!, align: e.target.value as any}})} className="w-full border p-1 text-sm rounded">
                                                <option value="left">Kiri</option>
                                                <option value="center">Tengah</option>
                                                <option value="right">Kanan</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>


                    <div className="border-t pt-4 mt-2">
                        <div className="flex justify-between items-center mb-2">
                            <h4 className="text-sm font-bold text-gray-700">Bagian "Mengetahui" (Default)</h4>
                            <div className="flex items-center">
                                <input type="checkbox" id="default-show-mengetahui" checked={template.mengetahuiConfig?.show} onChange={e => setTemplate({...template, mengetahuiConfig: {...template.mengetahuiConfig!, show: e.target.checked}})} className="w-4 h-4 text-teal-600 rounded"/>
                                <label htmlFor="default-show-mengetahui" className="ml-2 text-xs">Aktifkan</label>
                            </div>
                        </div>
                        {template.mengetahuiConfig?.show && (
                            <div className="bg-gray-50 p-3 rounded border space-y-2">
                                <div className="grid grid-cols-2 gap-2">
                                    <div><label className="block text-xs font-medium">Jabatan/Label</label><input type="text" value={template.mengetahuiConfig.jabatan} onChange={e => setTemplate({...template, mengetahuiConfig: {...template.mengetahuiConfig!, jabatan: e.target.value}})} className="w-full border p-1 text-sm rounded" /></div>
                                    <div><label className="block text-xs font-medium">Perataan</label><select value={template.mengetahuiConfig.align} onChange={e => setTemplate({...template, mengetahuiConfig: {...template.mengetahuiConfig!, align: e.target.value as any}})} className="w-full border p-1 text-sm rounded"><option value="left">Kiri</option><option value="center">Tengah</option><option value="right">Kanan</option></select></div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="border-t pt-4 mt-2">
                        <div className="flex justify-between items-center mb-2">
                            <h4 className="font-semibold text-gray-700 text-sm">Pengaturan Penanda Tangan Default</h4>
                            <button onClick={handleAddSignatory} className="text-xs bg-teal-600 text-white px-2 py-1 rounded hover:bg-teal-700">+ Tambah</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {template.signatories?.map((sig, index) => (
                                <div key={sig.id} className="bg-white p-3 rounded border shadow-sm relative">
                                    <button onClick={() => handleRemoveSignatory(index)} className="absolute top-1 right-1 text-red-400 hover:text-red-600"><i className="bi bi-x-circle-fill"></i></button>
                                    <div className="space-y-2">
                                        <input type="text" value={sig.jabatan} onChange={e => handleSignatoryChange(index, 'jabatan', e.target.value)} className="w-full bg-transparent border-b border-gray-300 text-xs font-medium mb-1 focus:outline-none" placeholder="Jabatan" />
                                        <input type="text" value={sig.nama} onChange={e => handleSignatoryChange(index, 'nama', e.target.value)} className="w-full text-xs text-gray-600 border-b border-transparent focus:border-gray-300 focus:outline-none" placeholder="Nama Default" />
                                        <div className="flex items-center gap-2 pt-2 border-t mt-2">
                                            <img src={sig.signatureUrl || "https://placehold.co/100x50/f3f4f6/9ca3af?text=TTD"} alt="Preview TTD" className="w-16 h-8 object-contain bg-gray-100 rounded"/>
                                            <button 
                                                type="button" 
                                                onClick={() => {
                                                    setUploadingSignatureFor(sig.id);
                                                    signatureInputRef.current?.click();
                                                }} 
                                                className="text-xs text-blue-600"
                                            >
                                                Upload
                                            </button>
                                            {sig.signatureUrl && <button type="button" onClick={() => handleSignatoryChange(index, 'signatureUrl', '')} className="text-xs text-red-600">Hapus</button>}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {(!template.signatories || template.signatories.length === 0) && <p className="text-xs text-gray-400 col-span-full text-center py-2">Belum ada penanda tangan.</p>}
                        </div>
                    </div>
                     <div className="border-t pt-4 mt-2">
                        <div className="flex justify-between items-center mb-2">
                            <h4 className="text-sm font-bold text-gray-700">Pengaturan Stempel</h4>
                            <div className="flex items-center">
                                <input type="checkbox" id="show-stamp" checked={template.stampConfig?.show} onChange={e => setTemplate({...template, stampConfig: {...template.stampConfig!, show: e.target.checked}})} className="w-4 h-4 text-teal-600 rounded"/>
                                <label htmlFor="show-stamp" className="ml-2 text-xs">Aktifkan Stempel</label>
                            </div>
                        </div>
                        {template.stampConfig?.show && (
                            <div className="bg-gray-50 p-3 rounded border space-y-4">
                                <div className="flex items-center gap-4">
                                    <img src={template.stampConfig.stampUrl || "https://placehold.co/100x100/f3f4f6/9ca3af?text=Stempel"} alt="Preview Stempel" className="w-20 h-20 object-contain bg-gray-100 rounded-full border"/>
                                    <div>
                                        <input type="file" accept="image/*" className="hidden" ref={stampInputRef} onChange={e => e.target.files && handleImageUpload(e.target.files[0], 'stamp')}/>
                                        <button type="button" onClick={() => stampInputRef.current?.click()} className="text-sm bg-blue-500 text-white px-3 py-1 rounded">Upload Stempel</button>
                                        {template.stampConfig.stampUrl && <button type="button" onClick={() => setTemplate(prev => ({ ...prev, stampConfig: { ...prev.stampConfig!, stampUrl: undefined } }))} className="text-sm text-red-600 ml-2">Hapus</button>}
                                    </div>
                                </div>
                                {template.signatories && template.signatories.length > 1 && (
                                    <div>
                                        <label className="block text-xs font-medium mb-1">Letakkan Stempel di Atas TTD:</label>
                                        <select value={template.stampConfig.placementSignatoryId || ''} onChange={e => setTemplate(prev => ({...prev, stampConfig: {...prev.stampConfig!, placementSignatoryId: e.target.value}}))} className="w-full border p-1 text-sm rounded">
                                            <option value="">-- Pilih Penanda Tangan --</option>
                                            {template.signatories.map(sig => (
                                                <option key={sig.id} value={sig.id}>{sig.jabatan}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                <div className="p-4 border-t flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 border rounded text-gray-600">Batal</button>
                    <button onClick={() => { if(template.nama) onSave(template as SuratTemplate); onClose(); }} className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700">Simpan Template</button>
                </div>
            </div>

            {/* AI Modal Overlay */}
            {isAiModalOpen && (
                <div className="fixed inset-0 bg-black/70 z-[80] flex justify-center items-center p-4">
                    <div className="bg-white w-full max-w-md rounded-xl shadow-2xl p-6 relative">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <i className="bi bi-stars text-purple-600"></i> Magic Draft (AI)
                            </h3>
                            <button onClick={() => setIsAiModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>
                        <p className="text-sm text-gray-600 mb-4">
                            Deskripsikan surat yang ingin Anda buat. AI akan membuatkan draf awal untuk Anda.
                        </p>
                        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 mb-4 text-xs text-yellow-800">
                            <strong>Peringatan Privasi:</strong> Jangan masukkan data sensitif (Nama Asli, NIK, Alamat Lengkap) di sini. Gunakan placeholder nanti.
                        </div>
                        <textarea
                            value={aiPrompt}
                            onChange={(e) => setAiPrompt(e.target.value)}
                            placeholder="Contoh: Buatkan surat pemberitahuan libur Maulid Nabi untuk wali santri, libur mulai tanggal 20 sampai 23..."
                            className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-purple-500 focus:border-purple-500 mb-4 h-32"
                        ></textarea>
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setIsAiModalOpen(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Batal</button>
                            <button 
                                onClick={handleAiGenerate}
                                disabled={!aiPrompt.trim() || isAiLoading}
                                className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-purple-300 flex items-center gap-2"
                            >
                                {isAiLoading ? <span className="animate-spin h-4 w-4 border-b-2 border-white rounded-full"></span> : <i className="bi bi-magic"></i>}
                                Buat Draft
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const ArsipManager: React.FC = () => {
    const { arsipSuratList, onDeleteArsipSurat, showToast } = useAppContext();
    const [viewingArsip, setViewingArsip] = useState<ArsipSurat | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const filteredArsip = useMemo(() => {
        return arsipSuratList.filter(a =>
            a.nomorSurat.toLowerCase().includes(searchTerm.toLowerCase()) ||
            a.perihal.toLowerCase().includes(searchTerm.toLowerCase()) ||
            a.tujuan.toLowerCase().includes(searchTerm.toLowerCase())
        ).sort((a, b) => new Date(b.tanggalBuat).getTime() - new Date(a.tanggalBuat).getTime());
    }, [arsipSuratList, searchTerm]);

    const handleDelete = async (id: number) => {
        if (confirm('Yakin ingin menghapus arsip surat ini?')) {
            await onDeleteArsipSurat(id);
            showToast('Arsip surat berhasil dihapus', 'success');
        }
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-md no-print">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-700 text-lg">Arsip Surat Keluar</h3>
                <div className="w-64">
                    <input
                        type="text"
                        placeholder="Cari..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg p-2 text-sm"
                    />
                </div>
            </div>
            
            <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-sm text-left text-gray-600">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                        <tr>
                            <th className="px-4 py-3">Tanggal</th>
                            <th className="px-4 py-3">Nomor Surat</th>
                            <th className="px-4 py-3">Perihal</th>
                            <th className="px-4 py-3">Tujuan</th>
                            <th className="px-4 py-3 text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredArsip.map((arsip) => (
                            <tr key={arsip.id} className="bg-white border-b hover:bg-gray-50">
                                <td className="px-4 py-3 whitespace-nowrap">{new Date(arsip.tanggalBuat).toLocaleDateString('id-ID')}</td>
                                <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{arsip.nomorSurat}</td>
                                <td className="px-4 py-3">{arsip.perihal}</td>
                                <td className="px-4 py-3">{arsip.tujuan}</td>
                                <td className="px-4 py-3 text-right space-x-2">
                                    <button onClick={() => setViewingArsip(arsip)} className="text-blue-600 hover:text-blue-800" title="Lihat"><i className="bi bi-eye-fill"></i></button>
                                    <button onClick={() => handleDelete(arsip.id)} className="text-red-600 hover:text-red-800" title="Hapus"><i className="bi bi-trash-fill"></i></button>
                                </td>
                            </tr>
                        ))}
                        {filteredArsip.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                                    Tidak ada arsip surat yang ditemukan.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            {viewingArsip && (
                <ArsipViewerModal
                    isOpen={!!viewingArsip}
                    onClose={() => setViewingArsip(null)}
                    arsip={viewingArsip}
                />
            )}
        </div>
    );
};

const SuratMenyurat: React.FC = () => {
    const { onSaveSuratTemplate, onDeleteSuratTemplate, showToast } = useAppContext();
    const [activeTab, setActiveTab] = useState<'create' | 'template' | 'archive'>('create');
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<SuratTemplate | undefined>(undefined);

    const handleSaveTemplate = async (t: SuratTemplate) => {
        await onSaveSuratTemplate(t);
        showToast('Template berhasil disimpan', 'success');
        setIsTemplateModalOpen(false);
    };

    const handleDeleteTemplate = async (id: number) => {
        await onDeleteSuratTemplate(id);
        showToast('Template berhasil dihapus', 'success');
    };

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Surat Menyurat</h1>
            
            <div className="mb-6 border-b border-gray-200">
                <nav className="flex -mb-px overflow-x-auto gap-4">
                    <button onClick={() => setActiveTab('create')} className={`py-3 px-4 font-medium text-sm border-b-2 ${activeTab === 'create' ? 'border-teal-600 text-teal-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><i className="bi bi-pencil-square mr-2"></i>Buat Surat</button>
                    <button onClick={() => setActiveTab('template')} className={`py-3 px-4 font-medium text-sm border-b-2 ${activeTab === 'template' ? 'border-teal-600 text-teal-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><i className="bi bi-file-earmark-text mr-2"></i>Manajemen Template</button>
                    <button onClick={() => setActiveTab('archive')} className={`py-3 px-4 font-medium text-sm border-b-2 ${activeTab === 'archive' ? 'border-teal-600 text-teal-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><i className="bi bi-archive mr-2"></i>Arsip Surat</button>
                </nav>
            </div>

            {activeTab === 'template' && (
                <div>
                    <div className="flex justify-end mb-4">
                        <button onClick={() => { setEditingTemplate(undefined); setIsTemplateModalOpen(true); }} className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-teal-700 flex items-center gap-2"><i className="bi bi-plus-circle"></i> Tambah Template</button>
                    </div>
                    <TemplateManager onEdit={(t) => { setEditingTemplate(t); setIsTemplateModalOpen(true); }} onDelete={handleDeleteTemplate} />
                </div>
            )}

            {activeTab === 'create' && <SuratGenerator />}
            
            {activeTab === 'archive' && <ArsipManager />}

            <TemplateModal isOpen={isTemplateModalOpen} onClose={() => setIsTemplateModalOpen(false)} onSave={handleSaveTemplate} initialData={editingTemplate} />
        </div>
    );
};

export default SuratMenyurat;
