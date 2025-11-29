
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAppContext } from '../AppContext';
import { SuratTemplate, ArsipSurat, Santri, SuratSignatory, MengetahuiConfig, TempatTanggalConfig, MarginConfig, StampConfig } from '../types';
import { generatePdf } from '../utils/pdfGenerator';
import { PrintHeader } from './common/PrintHeader';
import { QuillEditor } from './common/QuillEditor';

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

const TemplateModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (t: SuratTemplate) => void;
    templateData: SuratTemplate | null;
}> = ({ isOpen, onClose, onSave, templateData }) => {
    const { showAlert } = useAppContext();
    const [template, setTemplate] = useState<Partial<SuratTemplate>>({
        nama: '',
        judul: '',
        konten: '',
        kategori: 'Resmi',
        marginConfig: { top: 2, right: 2, bottom: 2, left: 2 },
        signatories: [],
        mengetahuiConfig: { show: false, jabatan: '', align: 'center' },
        tempatTanggalConfig: { show: true, position: 'bottom-right', align: 'right' },
        stampConfig: { show: false, placementSignatoryId: '' }
    });

    const fileInputRef = useRef<HTMLInputElement>(null);
    const stampInputRef = useRef<HTMLInputElement>(null);
    const [uploadingSignatureFor, setUploadingSignatureFor] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            if (templateData) {
                setTemplate({
                    ...templateData,
                    marginConfig: templateData.marginConfig || { top: 2, right: 2, bottom: 2, left: 2 },
                    signatories: templateData.signatories || [],
                    mengetahuiConfig: templateData.mengetahuiConfig || { show: false, jabatan: '', align: 'center' },
                    tempatTanggalConfig: templateData.tempatTanggalConfig || { show: true, position: 'bottom-right', align: 'right' },
                    stampConfig: templateData.stampConfig || { show: false, placementSignatoryId: '' }
                });
            } else {
                setTemplate({
                    nama: '',
                    judul: '',
                    konten: '',
                    kategori: 'Resmi',
                    marginConfig: { top: 2, right: 2, bottom: 2, left: 2 },
                    signatories: [{ id: Date.now().toString(), jabatan: '', nama: '' }],
                    mengetahuiConfig: { show: false, jabatan: '', align: 'center' },
                    tempatTanggalConfig: { show: true, position: 'bottom-right', align: 'right' },
                    stampConfig: { show: false, placementSignatoryId: '' }
                });
            }
        }
    }, [isOpen, templateData]);

    const handleSave = () => {
        if (!template.nama?.trim() || !template.judul?.trim()) {
            showAlert('Input Tidak Lengkap', 'Nama Template dan Judul Surat wajib diisi.');
            return;
        }
        onSave(template as SuratTemplate);
    };

    // State updaters using functional updates to prevent stale closures in Quill callback
    const handleAddSignatory = () => {
        setTemplate(prev => ({
            ...prev,
            signatories: [...(prev.signatories || []), { id: Date.now().toString(), jabatan: '', nama: '' }]
        }));
    };

    const handleRemoveSignatory = (id: string) => {
        setTemplate(prev => ({
            ...prev,
            signatories: prev.signatories?.filter(s => s.id !== id)
        }));
    };

    const handleSignatoryChange = (id: string, field: keyof SuratSignatory, value: string) => {
        setTemplate(prev => ({
            ...prev,
            signatories: prev.signatories?.map(s => s.id === id ? { ...s, [field]: value } : s)
        }));
    };

    const triggerSignatureUpload = (signatoryId: string) => {
        setUploadingSignatureFor(signatoryId);
        if (fileInputRef.current) {
            fileInputRef.current.value = ''; // Reset input to allow re-selecting same file
            fileInputRef.current.click();
        }
    };

    const handleSignatureFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && uploadingSignatureFor) {
            try {
                const base64 = await fileToBase64(file);
                setTemplate(prev => ({
                    ...prev,
                    signatories: prev.signatories?.map(s => s.id === uploadingSignatureFor ? { ...s, signatureUrl: base64 } : s)
                }));
            } catch (error) {
                showAlert('Error', 'Gagal memproses gambar tanda tangan.');
            } finally {
                setUploadingSignatureFor(null);
            }
        }
    };

    const triggerStampUpload = () => {
        if (stampInputRef.current) {
            stampInputRef.current.value = '';
            stampInputRef.current.click();
        }
    };

    const handleStampFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const base64 = await fileToBase64(file);
                setTemplate(prev => ({
                    ...prev,
                    stampConfig: { ...prev.stampConfig!, stampUrl: base64 }
                }));
            } catch (error) {
                showAlert('Error', 'Gagal memproses gambar stempel.');
            }
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[90vh] flex flex-col">
                <div className="p-5 border-b flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-800">{templateData ? 'Edit' : 'Buat'} Template Surat</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><i className="bi bi-x-lg"></i></button>
                </div>
                <div className="flex-grow overflow-y-auto p-6 space-y-6">
                    {/* Hidden Inputs for File Uploads */}
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleSignatureFileChange} />
                    <input type="file" ref={stampInputRef} className="hidden" accept="image/*" onChange={handleStampFileChange} />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block mb-1 text-sm font-medium">Nama Template</label>
                            <input type="text" value={template.nama} onChange={e => setTemplate(prev => ({ ...prev, nama: e.target.value }))} className="w-full border p-2 rounded-lg text-sm" placeholder="cth: Surat Izin Pulang" />
                        </div>
                        <div>
                            <label className="block mb-1 text-sm font-medium">Kategori</label>
                            <select value={template.kategori} onChange={e => setTemplate(prev => ({ ...prev, kategori: e.target.value as any }))} className="w-full border p-2 rounded-lg text-sm">
                                <option value="Resmi">Resmi</option>
                                <option value="Panggilan">Panggilan</option>
                                <option value="Pemberitahuan">Pemberitahuan</option>
                                <option value="Pencabutan">Pencabutan</option>
                                <option value="Izin">Izin</option>
                                <option value="Lainnya">Lainnya</option>
                            </select>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block mb-1 text-sm font-medium">Judul Surat (Kop)</label>
                            <input type="text" value={template.judul} onChange={e => setTemplate(prev => ({ ...prev, judul: e.target.value }))} className="w-full border p-2 rounded-lg text-sm font-bold" placeholder="SURAT PEMBERITAHUAN" />
                        </div>
                    </div>

                    <div>
                        <label className="block mb-1 text-sm font-medium">Isi Surat</label>
                        <div className="bg-gray-50 border rounded-lg p-2 mb-2 text-xs text-gray-600">
                            <strong>Placeholder tersedia:</strong> {'{NAMA_SANTRI}'}, {'{NIS}'}, {'{KELAS}'}, {'{ROMBEL}'}, {'{WALI}'}, {'{ALAMAT}'}
                        </div>
                        <QuillEditor value={template.konten || ''} onChange={(c) => setTemplate(prev => ({ ...prev, konten: c }))} />
                    </div>

                    <div className="border-t pt-4">
                        <div className="flex justify-between items-center mb-2">
                            <h4 className="font-semibold text-gray-700">Penanda Tangan</h4>
                            <button onClick={handleAddSignatory} className="text-sm text-teal-600 hover:text-teal-800"><i className="bi bi-plus-circle"></i> Tambah</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {template.signatories?.map((s, index) => (
                                <div key={s.id} className="border p-3 rounded-lg relative bg-gray-50">
                                    <button onClick={() => handleRemoveSignatory(s.id)} className="absolute top-2 right-2 text-red-500 hover:text-red-700"><i className="bi bi-x-circle-fill"></i></button>
                                    <div className="space-y-2">
                                        <input type="text" placeholder="Jabatan (cth: Kepala Sekolah)" value={s.jabatan} onChange={e => handleSignatoryChange(s.id, 'jabatan', e.target.value)} className="w-full border p-1.5 rounded text-sm" />
                                        <input type="text" placeholder="Nama Lengkap" value={s.nama} onChange={e => handleSignatoryChange(s.id, 'nama', e.target.value)} className="w-full border p-1.5 rounded text-sm" />
                                        <input type="text" placeholder="NIP / NIY (Opsional)" value={s.nip || ''} onChange={e => handleSignatoryChange(s.id, 'nip', e.target.value)} className="w-full border p-1.5 rounded text-sm" />
                                        
                                        <div className="flex items-center gap-2 mt-2">
                                            {s.signatureUrl ? (
                                                <div className="relative group">
                                                    <img src={s.signatureUrl} alt="TTD" className="h-12 border bg-white rounded" />
                                                    <button onClick={() => handleSignatoryChange(s.id, 'signatureUrl', '')} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100">x</button>
                                                </div>
                                            ) : (
                                                <button onClick={() => triggerSignatureUpload(s.id)} className="text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded">Upload TTD</button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="border-t pt-4">
                        <div className="flex items-center gap-2 mb-2">
                            <input type="checkbox" checked={template.stampConfig?.show} onChange={e => setTemplate(prev => ({ ...prev, stampConfig: { ...prev.stampConfig!, show: e.target.checked } }))} className="w-4 h-4 text-teal-600" id="showStamp"/>
                            <label htmlFor="showStamp" className="font-semibold text-gray-700">Gunakan Stempel</label>
                        </div>
                        {template.stampConfig?.show && (
                            <div className="pl-6 space-y-2">
                                <div className="flex items-center gap-4">
                                    {template.stampConfig.stampUrl ? (
                                        <div className="relative group">
                                            <img src={template.stampConfig.stampUrl} alt="Stempel" className="h-16 border bg-white rounded" />
                                            <button onClick={() => setTemplate(prev => ({ ...prev, stampConfig: { ...prev.stampConfig!, stampUrl: undefined } }))} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100">x</button>
                                        </div>
                                    ) : (
                                        <button onClick={triggerStampUpload} className="text-sm bg-gray-200 hover:bg-gray-300 px-3 py-1.5 rounded">Upload Gambar Stempel</button>
                                    )}
                                </div>
                                {(template.signatories?.length || 0) > 1 && (
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Letakkan stempel pada:</label>
                                        <select 
                                            value={template.stampConfig.placementSignatoryId || ''} 
                                            onChange={e => setTemplate(prev => ({ ...prev, stampConfig: { ...prev.stampConfig!, placementSignatoryId: e.target.value } }))}
                                            className="border p-1.5 rounded text-sm w-full md:w-1/2"
                                        >
                                            <option value="">-- Pilih Penanda Tangan --</option>
                                            {template.signatories?.map(s => (
                                                <option key={s.id} value={s.id}>{s.jabatan} - {s.nama}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="border-t pt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h4 className="font-semibold text-gray-700 mb-2">Margin Halaman (cm)</h4>
                            <div className="grid grid-cols-2 gap-2">
                                <div><label className="text-xs">Atas</label><input type="number" value={template.marginConfig?.top} onChange={e => setTemplate(prev => ({...prev, marginConfig: {...prev.marginConfig!, top: Number(e.target.value)}}))} className="w-full border p-1 rounded text-sm" /></div>
                                <div><label className="text-xs">Bawah</label><input type="number" value={template.marginConfig?.bottom} onChange={e => setTemplate(prev => ({...prev, marginConfig: {...prev.marginConfig!, bottom: Number(e.target.value)}}))} className="w-full border p-1 rounded text-sm" /></div>
                                <div><label className="text-xs">Kiri</label><input type="number" value={template.marginConfig?.left} onChange={e => setTemplate(prev => ({...prev, marginConfig: {...prev.marginConfig!, left: Number(e.target.value)}}))} className="w-full border p-1 rounded text-sm" /></div>
                                <div><label className="text-xs">Kanan</label><input type="number" value={template.marginConfig?.right} onChange={e => setTemplate(prev => ({...prev, marginConfig: {...prev.marginConfig!, right: Number(e.target.value)}}))} className="w-full border p-1 rounded text-sm" /></div>
                            </div>
                        </div>
                        <div>
                            <h4 className="font-semibold text-gray-700 mb-2">Tempat & Tanggal</h4>
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <input type="checkbox" checked={template.tempatTanggalConfig?.show} onChange={e => setTemplate(prev => ({...prev, tempatTanggalConfig: {...prev.tempatTanggalConfig!, show: e.target.checked}}))} /> <span className="text-sm">Tampilkan</span>
                                </div>
                                {template.tempatTanggalConfig?.show && (
                                    <select value={template.tempatTanggalConfig.position} onChange={e => setTemplate(prev => ({...prev, tempatTanggalConfig: {...prev.tempatTanggalConfig!, position: e.target.value as any}}))} className="w-full border p-1.5 rounded text-sm">
                                        <option value="top-right">Atas Kanan</option>
                                        <option value="bottom-right">Bawah Kanan (Diatas TTD)</option>
                                        <option value="bottom-left">Bawah Kiri</option>
                                    </select>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="p-4 border-t flex justify-end space-x-2">
                    <button onClick={onClose} className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">Batal</button>
                    <button onClick={handleSave} className="px-5 py-2.5 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700">Simpan Template</button>
                </div>
            </div>
        </div>
    );
};

const SuratGenerator: React.FC = () => {
    const { suratTemplates, santriList, onSaveArsipSurat, settings, showToast } = useAppContext();
    
    const [selectedTemplateId, setSelectedTemplateId] = useState<number | ''>('');
    const [generationMode, setGenerationMode] = useState<'single' | 'bulk'>('single');
    const [filterJenjangId, setFilterJenjangId] = useState<string>('');
    const [filterKelasId, setFilterKelasId] = useState<string>('');
    const [filterRombelId, setFilterRombelId] = useState<string>('');
    const [selectedSantriId, setSelectedSantriId] = useState<number | ''>(''); 
    const [nomorSurat, setNomorSurat] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    const template = useMemo(() => suratTemplates.find(t => t.id === Number(selectedTemplateId)), [selectedTemplateId, suratTemplates]);

    const filteredSantri = useMemo(() => {
        if (generationMode === 'single') return santriList;
        return santriList.filter(s => 
            (!filterJenjangId || s.jenjangId === Number(filterJenjangId)) &&
            (!filterKelasId || s.kelasId === Number(filterKelasId)) &&
            (!filterRombelId || s.rombelId === Number(filterRombelId))
        );
    }, [santriList, generationMode, filterJenjangId, filterKelasId, filterRombelId]);

    const previewSantri = useMemo(() => {
        if (generationMode === 'single') {
            return selectedSantriId ? santriList.find(s => s.id === Number(selectedSantriId)) : null;
        }
        return filteredSantri.length > 0 ? filteredSantri[0] : null; // Preview first santri in bulk
    }, [generationMode, selectedSantriId, filteredSantri, santriList]);

    const renderedContent = useMemo(() => {
        if (!template || !previewSantri) return '';
        let content = template.konten;
        const replacements: Record<string, string> = {
            '{NAMA_SANTRI}': previewSantri.namaLengkap,
            '{NIS}': previewSantri.nis,
            '{KELAS}': settings.kelas.find(k => k.id === previewSantri.kelasId)?.nama || '',
            '{ROMBEL}': settings.rombel.find(r => r.id === previewSantri.rombelId)?.nama || '',
            '{WALI}': previewSantri.namaWali || previewSantri.namaAyah || '',
            '{ALAMAT}': previewSantri.alamat.detail || ''
        };
        Object.entries(replacements).forEach(([key, val]) => {
            content = content.replace(new RegExp(key, 'g'), val);
        });
        return content;
    }, [template, previewSantri, settings]);

    const handleSaveArsip = async () => {
        if (!template || !nomorSurat) {
            showToast('Pilih template dan isi nomor surat.', 'error');
            return;
        }

        const targets = generationMode === 'single' 
            ? (previewSantri ? [previewSantri] : []) 
            : filteredSantri;

        if (targets.length === 0) {
            showToast('Tidak ada santri yang dipilih.', 'error');
            return;
        }

        for (const s of targets) {
            let content = template.konten;
            const replacements: Record<string, string> = {
                '{NAMA_SANTRI}': s.namaLengkap,
                '{NIS}': s.nis,
                '{KELAS}': settings.kelas.find(k => k.id === s.kelasId)?.nama || '',
                '{ROMBEL}': settings.rombel.find(r => r.id === s.rombelId)?.nama || '',
                '{WALI}': s.namaWali || s.namaAyah || '',
                '{ALAMAT}': s.alamat.detail || ''
            };
            Object.entries(replacements).forEach(([key, val]) => {
                content = content.replace(new RegExp(key, 'g'), val);
            });

            await onSaveArsipSurat({
                nomorSurat,
                perihal: template.judul,
                tujuan: s.namaLengkap,
                isiSurat: content,
                tanggalBuat: new Date().toISOString(),
                templateId: template.id,
                kategori: template.kategori,
                tempatTanggalConfig: template.tempatTanggalConfig,
                signatoriesSnapshot: template.signatories,
                mengetahuiConfig: template.mengetahuiConfig,
                marginConfig: template.marginConfig,
                stampSnapshot: template.stampConfig
            });
        }
        showToast(`${targets.length} surat berhasil diarsipkan.`, 'success');
        setNomorSurat('');
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 no-print">
            <div className="lg:col-span-1 space-y-6">
                <div className="bg-white p-5 rounded-lg shadow-sm border">
                    <h3 className="font-bold text-gray-700 mb-4">1. Konfigurasi Surat</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Pilih Template</label>
                            <select value={selectedTemplateId} onChange={e => setSelectedTemplateId(e.target.value)} className="w-full border p-2 rounded-lg text-sm">
                                <option value="">-- Pilih --</option>
                                {suratTemplates.map(t => <option key={t.id} value={t.id}>{t.nama}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Nomor Surat</label>
                            <input type="text" value={nomorSurat} onChange={e => setNomorSurat(e.target.value)} className="w-full border p-2 rounded-lg text-sm" placeholder="No. .../..." />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Mode Penerima</label>
                            <div className="flex gap-4">
                                <label className="flex items-center text-sm"><input type="radio" checked={generationMode === 'single'} onChange={() => setGenerationMode('single')} className="mr-2" /> Perorangan</label>
                                <label className="flex items-center text-sm"><input type="radio" checked={generationMode === 'bulk'} onChange={() => setGenerationMode('bulk')} className="mr-2" /> Massal (Filter)</label>
                            </div>
                        </div>
                        
                        {generationMode === 'single' ? (
                            <div>
                                <label className="block text-sm font-medium mb-1">Cari Santri</label>
                                <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Nama / NIS..." className="w-full border p-2 rounded-lg text-sm mb-2" />
                                <select value={selectedSantriId} onChange={e => setSelectedSantriId(e.target.value)} className="w-full border p-2 rounded-lg text-sm">
                                    <option value="">-- Pilih Santri --</option>
                                    {santriList.filter(s => s.namaLengkap.toLowerCase().includes(searchQuery.toLowerCase()) || s.nis.includes(searchQuery)).slice(0, 10).map(s => (
                                        <option key={s.id} value={s.id}>{s.namaLengkap} - {s.nis}</option>
                                    ))}
                                </select>
                            </div>
                        ) : (
                            <div className="space-y-2 p-3 bg-gray-50 rounded text-sm">
                                <select value={filterJenjangId} onChange={e => setFilterJenjangId(e.target.value)} className="w-full border p-1.5 rounded"><option value="">Semua Jenjang</option>{settings.jenjang.map(j => <option key={j.id} value={j.id}>{j.nama}</option>)}</select>
                                <select value={filterKelasId} onChange={e => setFilterKelasId(e.target.value)} className="w-full border p-1.5 rounded"><option value="">Semua Kelas</option>{settings.kelas.filter(k => !filterJenjangId || k.jenjangId === Number(filterJenjangId)).map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}</select>
                                <select value={filterRombelId} onChange={e => setFilterRombelId(e.target.value)} className="w-full border p-1.5 rounded"><option value="">Semua Rombel</option>{settings.rombel.filter(r => !filterKelasId || r.kelasId === Number(filterKelasId)).map(r => <option key={r.id} value={r.id}>{r.nama}</option>)}</select>
                                <p className="text-xs text-gray-500 mt-1">Terpilih: {filteredSantri.length} santri</p>
                            </div>
                        )}
                        
                        <div className="flex gap-2 pt-2">
                            <button onClick={handleSaveArsip} className="flex-1 bg-teal-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-teal-700">Arsipkan</button>
                            <button onClick={handlePrint} className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700"><i className="bi bi-printer"></i> Cetak</button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="lg:col-span-2">
                <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                    <div className="p-3 bg-gray-100 border-b flex justify-between items-center">
                        <h3 className="font-bold text-gray-700">Pratinjau Surat</h3>
                        {generationMode === 'bulk' && <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">Preview data pertama</span>}
                    </div>
                    <div className="bg-gray-200 p-8 overflow-auto max-h-[80vh] flex justify-center" id="surat-preview-container">
                        {template && previewSantri ? (
                            <SuratPreviewContent 
                                template={template} 
                                content={renderedContent} 
                                settings={settings} 
                            />
                        ) : (
                            <div className="bg-white w-[21cm] h-[29.7cm] flex items-center justify-center text-gray-400 italic shadow-lg">
                                Pilih template dan santri untuk melihat pratinjau.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const SuratPreviewContent: React.FC<{ 
    template: SuratTemplate | ArsipSurat, 
    content: string, 
    settings: any 
}> = ({ template, content, settings }) => {
    // Determine signatories and stamp based on source (Template or Archive)
    const signatories = 'signatories' in template ? template.signatories : (template as ArsipSurat).signatoriesSnapshot;
    const stampConfig = 'stampConfig' in template ? template.stampConfig : (template as ArsipSurat).stampSnapshot;
    const margin = template.marginConfig || { top: 2, right: 2, bottom: 2, left: 2 };
    const dateConfig = template.tempatTanggalConfig || { show: true, position: 'bottom-right', align: 'right' };

    const formattedDate = `${settings.alamat.split(',')[1]?.trim() || 'Sumpiuh'}, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`;

    return (
        <div 
            className="bg-white shadow-lg mx-auto relative flex flex-col justify-between"
            style={{
                width: '21cm',
                minHeight: '29.7cm',
                paddingTop: `${margin.top}cm`,
                paddingRight: `${margin.right}cm`,
                paddingBottom: `${margin.bottom}cm`,
                paddingLeft: `${margin.left}cm`,
                boxSizing: 'border-box'
            }}
        >
            <div className="flex-grow">
                <PrintHeader settings={settings} title={('judul' in template ? template.judul : (template as ArsipSurat).perihal)} />
                
                {/* Date Top Right */}
                {dateConfig.show && dateConfig.position === 'top-right' && (
                    <div className={`text-${dateConfig.align} mb-4`}>{formattedDate}</div>
                )}

                <div className="prose max-w-none text-justify text-black text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: content }} />

                {/* Signatories Section */}
                <div className="mt-12 w-full">
                    {/* Date Bottom Right or Left */}
                    {dateConfig.show && dateConfig.position !== 'top-right' && (
                        <div className={`text-${dateConfig.align === 'center' ? 'center' : dateConfig.align} mb-2`}>
                            {formattedDate}
                        </div>
                    )}

                    <div className="flex justify-between items-end px-4 gap-8">
                        {signatories?.slice(0, 3).map((s, idx) => {
                            // Determine if this signatory block gets the stamp
                            const showStamp = stampConfig?.show && (
                                (signatories.length === 1) || // Auto for single
                                (stampConfig.placementSignatoryId === s.id) // Specific placement
                            );

                            return (
                                <div key={idx} className="text-center relative flex-1 min-w-[150px]">
                                    <p className="font-medium mb-16">{s.jabatan}</p>
                                    
                                    {/* Stamp Overlay */}
                                    {showStamp && stampConfig.stampUrl && (
                                        <img 
                                            src={stampConfig.stampUrl} 
                                            alt="Stempel" 
                                            className="absolute left-1/2 -translate-x-1/2 top-8 w-24 opacity-80 pointer-events-none mix-blend-multiply" 
                                        />
                                    )}

                                    {/* Signature Image */}
                                    {s.signatureUrl && (
                                        <img 
                                            src={s.signatureUrl} 
                                            alt="TTD" 
                                            className="absolute left-1/2 -translate-x-1/2 bottom-6 h-16 w-auto mix-blend-multiply" 
                                        />
                                    )}

                                    <p className="font-bold underline relative z-10">{s.nama}</p>
                                    {s.nip && <p className="text-xs">NIP/NIY: {s.nip}</p>}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
            
            {/* Consistent Footer */}
            <div className="text-center text-[8pt] text-gray-500 italic border-t pt-2 w-full mt-auto">
                dibuat dengan aplikasi eSantri Web by AI Projek | aiprojek01.my.id
            </div>
        </div>
    );
};

const ArsipSuratView: React.FC = () => {
    const { arsipSuratList, onDeleteArsipSurat, settings } = useAppContext();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [previewArsip, setPreviewArsip] = useState<ArsipSurat | null>(null);

    const filtered = useMemo(() => {
        return arsipSuratList.filter(a => {
            const matchSearch = a.tujuan.toLowerCase().includes(searchTerm.toLowerCase()) || a.nomorSurat.toLowerCase().includes(searchTerm.toLowerCase());
            const matchCat = !selectedCategory || a.kategori === selectedCategory;
            return matchSearch && matchCat;
        }).sort((a,b) => new Date(b.tanggalBuat).getTime() - new Date(a.tanggalBuat).getTime());
    }, [arsipSuratList, searchTerm, selectedCategory]);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 bg-white rounded-lg shadow border p-4 flex flex-col h-[80vh]">
                <h3 className="font-bold text-gray-700 mb-4">Riwayat Surat</h3>
                <div className="flex gap-2 mb-4">
                    <input type="text" placeholder="Cari..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full border p-2 rounded text-sm"/>
                    <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className="border p-2 rounded text-sm w-1/3">
                        <option value="">Semua</option>
                        <option value="Resmi">Resmi</option>
                        <option value="Panggilan">Panggilan</option>
                        <option value="Pemberitahuan">Pemberitahuan</option>
                        <option value="Pencabutan">Pencabutan</option>
                        <option value="Izin">Izin</option>
                        <option value="Lainnya">Lain</option>
                    </select>
                </div>
                <div className="flex-grow overflow-y-auto space-y-2">
                    {filtered.map(a => (
                        <div key={a.id} onClick={() => setPreviewArsip(a)} className={`p-3 border rounded cursor-pointer hover:bg-teal-50 ${previewArsip?.id === a.id ? 'border-teal-500 bg-teal-50' : ''}`}>
                            <div className="flex justify-between">
                                <span className="font-bold text-gray-800 text-sm">{a.tujuan}</span>
                                <span className="text-xs text-gray-500">{new Date(a.tanggalBuat).toLocaleDateString('id-ID')}</span>
                            </div>
                            <p className="text-xs text-gray-600 truncate">{a.nomorSurat}</p>
                            <div className="flex justify-between items-center mt-1">
                                <span className="text-[10px] bg-gray-200 px-1.5 rounded">{a.kategori || 'Umum'}</span>
                                <button onClick={(e) => {e.stopPropagation(); onDeleteArsipSurat(a.id); if(previewArsip?.id===a.id) setPreviewArsip(null);}} className="text-red-500 hover:text-red-700"><i className="bi bi-trash"></i></button>
                            </div>
                        </div>
                    ))}
                    {filtered.length === 0 && <p className="text-center text-sm text-gray-400 py-4">Tidak ada data.</p>}
                </div>
            </div>
            <div className="lg:col-span-2 bg-gray-100 rounded-lg border p-6 flex justify-center overflow-auto max-h-[80vh]">
                {previewArsip ? (
                    <div id="print-view-arsip">
                        <SuratPreviewContent 
                            template={previewArsip} 
                            content={previewArsip.isiSurat} 
                            settings={settings} 
                        />
                    </div>
                ) : (
                    <div className="flex items-center justify-center text-gray-400 h-full">Pilih surat untuk melihat detail.</div>
                )}
            </div>
        </div>
    );
};

const SuratMenyurat: React.FC = () => {
    const { onSaveSuratTemplate, onDeleteSuratTemplate, showConfirmation, showToast } = useAppContext();
    const [activeTab, setActiveTab] = useState<'templates' | 'create' | 'archive'>('templates');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<SuratTemplate | null>(null);

    const handleSaveTemplate = async (template: SuratTemplate) => {
        const t = { ...template, id: template.id || Date.now() };
        await onSaveSuratTemplate(t);
        setIsModalOpen(false);
        showToast('Template berhasil disimpan', 'success');
    };

    const handleDeleteTemplate = (id: number) => {
        showConfirmation('Hapus Template?', 'Tindakan ini tidak dapat dibatalkan.', async () => {
            await onDeleteSuratTemplate(id);
            showToast('Template dihapus', 'success');
        }, { confirmColor: 'red' });
    };

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Surat Menyurat</h1>
            
            <div className="mb-6 border-b border-gray-200 flex justify-between items-center">
                <nav className="flex -mb-px overflow-x-auto">
                    <button onClick={() => setActiveTab('templates')} className={`py-3 px-5 font-medium text-sm border-b-2 ${activeTab === 'templates' ? 'border-teal-600 text-teal-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Manajemen Template</button>
                    <button onClick={() => setActiveTab('create')} className={`py-3 px-5 font-medium text-sm border-b-2 ${activeTab === 'create' ? 'border-teal-600 text-teal-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Buat Surat</button>
                    <button onClick={() => setActiveTab('archive')} className={`py-3 px-5 font-medium text-sm border-b-2 ${activeTab === 'archive' ? 'border-teal-600 text-teal-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Arsip Surat</button>
                </nav>
                {activeTab === 'templates' && (
                    <button onClick={() => { setEditingTemplate(null); setIsModalOpen(true); }} className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-teal-700 flex items-center gap-2">
                        <i className="bi bi-plus-lg"></i> Template Baru
                    </button>
                )}
            </div>

            {activeTab === 'templates' && <TemplateManager onEdit={(t) => { setEditingTemplate(t); setIsModalOpen(true); }} onDelete={handleDeleteTemplate} />}
            {activeTab === 'create' && <SuratGenerator />}
            {activeTab === 'archive' && <ArsipSuratView />}

            <TemplateModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveTemplate} templateData={editingTemplate} />
        </div>
    );
};

export default SuratMenyurat;
